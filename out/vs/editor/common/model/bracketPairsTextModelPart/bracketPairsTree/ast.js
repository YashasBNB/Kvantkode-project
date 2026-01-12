/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { CursorColumns } from '../../../core/cursorColumns.js';
import { lengthAdd, lengthGetLineCount, lengthToObj, lengthZero } from './length.js';
import { SmallImmutableSet } from './smallImmutableSet.js';
export var AstNodeKind;
(function (AstNodeKind) {
    AstNodeKind[AstNodeKind["Text"] = 0] = "Text";
    AstNodeKind[AstNodeKind["Bracket"] = 1] = "Bracket";
    AstNodeKind[AstNodeKind["Pair"] = 2] = "Pair";
    AstNodeKind[AstNodeKind["UnexpectedClosingBracket"] = 3] = "UnexpectedClosingBracket";
    AstNodeKind[AstNodeKind["List"] = 4] = "List";
})(AstNodeKind || (AstNodeKind = {}));
/**
 * The base implementation for all AST nodes.
 */
class BaseAstNode {
    /**
     * The length of the entire node, which should equal the sum of lengths of all children.
     */
    get length() {
        return this._length;
    }
    constructor(length) {
        this._length = length;
    }
}
/**
 * Represents a bracket pair including its child (e.g. `{ ... }`).
 * Might be unclosed.
 * Immutable, if all children are immutable.
 */
export class PairAstNode extends BaseAstNode {
    static create(openingBracket, child, closingBracket) {
        let length = openingBracket.length;
        if (child) {
            length = lengthAdd(length, child.length);
        }
        if (closingBracket) {
            length = lengthAdd(length, closingBracket.length);
        }
        return new PairAstNode(length, openingBracket, child, closingBracket, child ? child.missingOpeningBracketIds : SmallImmutableSet.getEmpty());
    }
    get kind() {
        return 2 /* AstNodeKind.Pair */;
    }
    get listHeight() {
        return 0;
    }
    get childrenLength() {
        return 3;
    }
    getChild(idx) {
        switch (idx) {
            case 0:
                return this.openingBracket;
            case 1:
                return this.child;
            case 2:
                return this.closingBracket;
        }
        throw new Error('Invalid child index');
    }
    /**
     * Avoid using this property, it allocates an array!
     */
    get children() {
        const result = [];
        result.push(this.openingBracket);
        if (this.child) {
            result.push(this.child);
        }
        if (this.closingBracket) {
            result.push(this.closingBracket);
        }
        return result;
    }
    constructor(length, openingBracket, child, closingBracket, missingOpeningBracketIds) {
        super(length);
        this.openingBracket = openingBracket;
        this.child = child;
        this.closingBracket = closingBracket;
        this.missingOpeningBracketIds = missingOpeningBracketIds;
    }
    canBeReused(openBracketIds) {
        if (this.closingBracket === null) {
            // Unclosed pair ast nodes only
            // end at the end of the document
            // or when a parent node is closed.
            // This could be improved:
            // Only return false if some next token is neither "undefined" nor a bracket that closes a parent.
            return false;
        }
        if (openBracketIds.intersects(this.missingOpeningBracketIds)) {
            return false;
        }
        return true;
    }
    flattenLists() {
        return PairAstNode.create(this.openingBracket.flattenLists(), this.child && this.child.flattenLists(), this.closingBracket && this.closingBracket.flattenLists());
    }
    deepClone() {
        return new PairAstNode(this.length, this.openingBracket.deepClone(), this.child && this.child.deepClone(), this.closingBracket && this.closingBracket.deepClone(), this.missingOpeningBracketIds);
    }
    computeMinIndentation(offset, textModel) {
        return this.child
            ? this.child.computeMinIndentation(lengthAdd(offset, this.openingBracket.length), textModel)
            : Number.MAX_SAFE_INTEGER;
    }
}
export class ListAstNode extends BaseAstNode {
    /**
     * This method uses more memory-efficient list nodes that can only store 2 or 3 children.
     */
    static create23(item1, item2, item3, immutable = false) {
        let length = item1.length;
        let missingBracketIds = item1.missingOpeningBracketIds;
        if (item1.listHeight !== item2.listHeight) {
            throw new Error('Invalid list heights');
        }
        length = lengthAdd(length, item2.length);
        missingBracketIds = missingBracketIds.merge(item2.missingOpeningBracketIds);
        if (item3) {
            if (item1.listHeight !== item3.listHeight) {
                throw new Error('Invalid list heights');
            }
            length = lengthAdd(length, item3.length);
            missingBracketIds = missingBracketIds.merge(item3.missingOpeningBracketIds);
        }
        return immutable
            ? new Immutable23ListAstNode(length, item1.listHeight + 1, item1, item2, item3, missingBracketIds)
            : new TwoThreeListAstNode(length, item1.listHeight + 1, item1, item2, item3, missingBracketIds);
    }
    static create(items, immutable = false) {
        if (items.length === 0) {
            return this.getEmpty();
        }
        else {
            let length = items[0].length;
            let unopenedBrackets = items[0].missingOpeningBracketIds;
            for (let i = 1; i < items.length; i++) {
                length = lengthAdd(length, items[i].length);
                unopenedBrackets = unopenedBrackets.merge(items[i].missingOpeningBracketIds);
            }
            return immutable
                ? new ImmutableArrayListAstNode(length, items[0].listHeight + 1, items, unopenedBrackets)
                : new ArrayListAstNode(length, items[0].listHeight + 1, items, unopenedBrackets);
        }
    }
    static getEmpty() {
        return new ImmutableArrayListAstNode(lengthZero, 0, [], SmallImmutableSet.getEmpty());
    }
    get kind() {
        return 4 /* AstNodeKind.List */;
    }
    get missingOpeningBracketIds() {
        return this._missingOpeningBracketIds;
    }
    /**
     * Use ListAstNode.create.
     */
    constructor(length, listHeight, _missingOpeningBracketIds) {
        super(length);
        this.listHeight = listHeight;
        this._missingOpeningBracketIds = _missingOpeningBracketIds;
        this.cachedMinIndentation = -1;
    }
    throwIfImmutable() {
        // NOOP
    }
    makeLastElementMutable() {
        this.throwIfImmutable();
        const childCount = this.childrenLength;
        if (childCount === 0) {
            return undefined;
        }
        const lastChild = this.getChild(childCount - 1);
        const mutable = lastChild.kind === 4 /* AstNodeKind.List */ ? lastChild.toMutable() : lastChild;
        if (lastChild !== mutable) {
            this.setChild(childCount - 1, mutable);
        }
        return mutable;
    }
    makeFirstElementMutable() {
        this.throwIfImmutable();
        const childCount = this.childrenLength;
        if (childCount === 0) {
            return undefined;
        }
        const firstChild = this.getChild(0);
        const mutable = firstChild.kind === 4 /* AstNodeKind.List */ ? firstChild.toMutable() : firstChild;
        if (firstChild !== mutable) {
            this.setChild(0, mutable);
        }
        return mutable;
    }
    canBeReused(openBracketIds) {
        if (openBracketIds.intersects(this.missingOpeningBracketIds)) {
            return false;
        }
        if (this.childrenLength === 0) {
            // Don't reuse empty lists.
            return false;
        }
        let lastChild = this;
        while (lastChild.kind === 4 /* AstNodeKind.List */) {
            const lastLength = lastChild.childrenLength;
            if (lastLength === 0) {
                // Empty lists should never be contained in other lists.
                throw new BugIndicatingError();
            }
            lastChild = lastChild.getChild(lastLength - 1);
        }
        return lastChild.canBeReused(openBracketIds);
    }
    handleChildrenChanged() {
        this.throwIfImmutable();
        const count = this.childrenLength;
        let length = this.getChild(0).length;
        let unopenedBrackets = this.getChild(0).missingOpeningBracketIds;
        for (let i = 1; i < count; i++) {
            const child = this.getChild(i);
            length = lengthAdd(length, child.length);
            unopenedBrackets = unopenedBrackets.merge(child.missingOpeningBracketIds);
        }
        this._length = length;
        this._missingOpeningBracketIds = unopenedBrackets;
        this.cachedMinIndentation = -1;
    }
    flattenLists() {
        const items = [];
        for (const c of this.children) {
            const normalized = c.flattenLists();
            if (normalized.kind === 4 /* AstNodeKind.List */) {
                items.push(...normalized.children);
            }
            else {
                items.push(normalized);
            }
        }
        return ListAstNode.create(items);
    }
    computeMinIndentation(offset, textModel) {
        if (this.cachedMinIndentation !== -1) {
            return this.cachedMinIndentation;
        }
        let minIndentation = Number.MAX_SAFE_INTEGER;
        let childOffset = offset;
        for (let i = 0; i < this.childrenLength; i++) {
            const child = this.getChild(i);
            if (child) {
                minIndentation = Math.min(minIndentation, child.computeMinIndentation(childOffset, textModel));
                childOffset = lengthAdd(childOffset, child.length);
            }
        }
        this.cachedMinIndentation = minIndentation;
        return minIndentation;
    }
}
class TwoThreeListAstNode extends ListAstNode {
    get childrenLength() {
        return this._item3 !== null ? 3 : 2;
    }
    getChild(idx) {
        switch (idx) {
            case 0:
                return this._item1;
            case 1:
                return this._item2;
            case 2:
                return this._item3;
        }
        throw new Error('Invalid child index');
    }
    setChild(idx, node) {
        switch (idx) {
            case 0:
                this._item1 = node;
                return;
            case 1:
                this._item2 = node;
                return;
            case 2:
                this._item3 = node;
                return;
        }
        throw new Error('Invalid child index');
    }
    get children() {
        return this._item3 ? [this._item1, this._item2, this._item3] : [this._item1, this._item2];
    }
    get item1() {
        return this._item1;
    }
    get item2() {
        return this._item2;
    }
    get item3() {
        return this._item3;
    }
    constructor(length, listHeight, _item1, _item2, _item3, missingOpeningBracketIds) {
        super(length, listHeight, missingOpeningBracketIds);
        this._item1 = _item1;
        this._item2 = _item2;
        this._item3 = _item3;
    }
    deepClone() {
        return new TwoThreeListAstNode(this.length, this.listHeight, this._item1.deepClone(), this._item2.deepClone(), this._item3 ? this._item3.deepClone() : null, this.missingOpeningBracketIds);
    }
    appendChildOfSameHeight(node) {
        if (this._item3) {
            throw new Error('Cannot append to a full (2,3) tree node');
        }
        this.throwIfImmutable();
        this._item3 = node;
        this.handleChildrenChanged();
    }
    unappendChild() {
        if (!this._item3) {
            throw new Error('Cannot remove from a non-full (2,3) tree node');
        }
        this.throwIfImmutable();
        const result = this._item3;
        this._item3 = null;
        this.handleChildrenChanged();
        return result;
    }
    prependChildOfSameHeight(node) {
        if (this._item3) {
            throw new Error('Cannot prepend to a full (2,3) tree node');
        }
        this.throwIfImmutable();
        this._item3 = this._item2;
        this._item2 = this._item1;
        this._item1 = node;
        this.handleChildrenChanged();
    }
    unprependChild() {
        if (!this._item3) {
            throw new Error('Cannot remove from a non-full (2,3) tree node');
        }
        this.throwIfImmutable();
        const result = this._item1;
        this._item1 = this._item2;
        this._item2 = this._item3;
        this._item3 = null;
        this.handleChildrenChanged();
        return result;
    }
    toMutable() {
        return this;
    }
}
/**
 * Immutable, if all children are immutable.
 */
class Immutable23ListAstNode extends TwoThreeListAstNode {
    toMutable() {
        return new TwoThreeListAstNode(this.length, this.listHeight, this.item1, this.item2, this.item3, this.missingOpeningBracketIds);
    }
    throwIfImmutable() {
        throw new Error('this instance is immutable');
    }
}
/**
 * For debugging.
 */
class ArrayListAstNode extends ListAstNode {
    get childrenLength() {
        return this._children.length;
    }
    getChild(idx) {
        return this._children[idx];
    }
    setChild(idx, child) {
        this._children[idx] = child;
    }
    get children() {
        return this._children;
    }
    constructor(length, listHeight, _children, missingOpeningBracketIds) {
        super(length, listHeight, missingOpeningBracketIds);
        this._children = _children;
    }
    deepClone() {
        const children = new Array(this._children.length);
        for (let i = 0; i < this._children.length; i++) {
            children[i] = this._children[i].deepClone();
        }
        return new ArrayListAstNode(this.length, this.listHeight, children, this.missingOpeningBracketIds);
    }
    appendChildOfSameHeight(node) {
        this.throwIfImmutable();
        this._children.push(node);
        this.handleChildrenChanged();
    }
    unappendChild() {
        this.throwIfImmutable();
        const item = this._children.pop();
        this.handleChildrenChanged();
        return item;
    }
    prependChildOfSameHeight(node) {
        this.throwIfImmutable();
        this._children.unshift(node);
        this.handleChildrenChanged();
    }
    unprependChild() {
        this.throwIfImmutable();
        const item = this._children.shift();
        this.handleChildrenChanged();
        return item;
    }
    toMutable() {
        return this;
    }
}
/**
 * Immutable, if all children are immutable.
 */
class ImmutableArrayListAstNode extends ArrayListAstNode {
    toMutable() {
        return new ArrayListAstNode(this.length, this.listHeight, [...this.children], this.missingOpeningBracketIds);
    }
    throwIfImmutable() {
        throw new Error('this instance is immutable');
    }
}
const emptyArray = [];
class ImmutableLeafAstNode extends BaseAstNode {
    get listHeight() {
        return 0;
    }
    get childrenLength() {
        return 0;
    }
    getChild(idx) {
        return null;
    }
    get children() {
        return emptyArray;
    }
    flattenLists() {
        return this;
    }
    deepClone() {
        return this;
    }
}
export class TextAstNode extends ImmutableLeafAstNode {
    get kind() {
        return 0 /* AstNodeKind.Text */;
    }
    get missingOpeningBracketIds() {
        return SmallImmutableSet.getEmpty();
    }
    canBeReused(_openedBracketIds) {
        return true;
    }
    computeMinIndentation(offset, textModel) {
        const start = lengthToObj(offset);
        // Text ast nodes don't have partial indentation (ensured by the tokenizer).
        // Thus, if this text node does not start at column 0, the first line cannot have any indentation at all.
        const startLineNumber = (start.columnCount === 0 ? start.lineCount : start.lineCount + 1) + 1;
        const endLineNumber = lengthGetLineCount(lengthAdd(offset, this.length)) + 1;
        let result = Number.MAX_SAFE_INTEGER;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const firstNonWsColumn = textModel.getLineFirstNonWhitespaceColumn(lineNumber);
            const lineContent = textModel.getLineContent(lineNumber);
            if (firstNonWsColumn === 0) {
                continue;
            }
            const visibleColumn = CursorColumns.visibleColumnFromColumn(lineContent, firstNonWsColumn, textModel.getOptions().tabSize);
            result = Math.min(result, visibleColumn);
        }
        return result;
    }
}
export class BracketAstNode extends ImmutableLeafAstNode {
    static create(length, bracketInfo, bracketIds) {
        const node = new BracketAstNode(length, bracketInfo, bracketIds);
        return node;
    }
    get kind() {
        return 1 /* AstNodeKind.Bracket */;
    }
    get missingOpeningBracketIds() {
        return SmallImmutableSet.getEmpty();
    }
    constructor(length, bracketInfo, 
    /**
     * In case of a opening bracket, this is the id of the opening bracket.
     * In case of a closing bracket, this contains the ids of all opening brackets it can close.
     */
    bracketIds) {
        super(length);
        this.bracketInfo = bracketInfo;
        this.bracketIds = bracketIds;
    }
    get text() {
        return this.bracketInfo.bracketText;
    }
    get languageId() {
        return this.bracketInfo.languageId;
    }
    canBeReused(_openedBracketIds) {
        // These nodes could be reused,
        // but not in a general way.
        // Their parent may be reused.
        return false;
    }
    computeMinIndentation(offset, textModel) {
        return Number.MAX_SAFE_INTEGER;
    }
}
export class InvalidBracketAstNode extends ImmutableLeafAstNode {
    get kind() {
        return 3 /* AstNodeKind.UnexpectedClosingBracket */;
    }
    constructor(closingBrackets, length) {
        super(length);
        this.missingOpeningBracketIds = closingBrackets;
    }
    canBeReused(openedBracketIds) {
        return !openedBracketIds.intersects(this.missingOpeningBracketIds);
    }
    computeMinIndentation(offset, textModel) {
        return Number.MAX_SAFE_INTEGER;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9hc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRzlELE9BQU8sRUFBVSxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUcxRCxNQUFNLENBQU4sSUFBa0IsV0FNakI7QUFORCxXQUFrQixXQUFXO0lBQzVCLDZDQUFRLENBQUE7SUFDUixtREFBVyxDQUFBO0lBQ1gsNkNBQVEsQ0FBQTtJQUNSLHFGQUE0QixDQUFBO0lBQzVCLDZDQUFRLENBQUE7QUFDVCxDQUFDLEVBTmlCLFdBQVcsS0FBWCxXQUFXLFFBTTVCO0FBU0Q7O0dBRUc7QUFDSCxNQUFlLFdBQVc7SUE0QnpCOztPQUVHO0lBQ0gsSUFBVyxNQUFNO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRUQsWUFBbUIsTUFBYztRQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN0QixDQUFDO0NBa0JEO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsV0FBVztJQUNwQyxNQUFNLENBQUMsTUFBTSxDQUNuQixjQUE4QixFQUM5QixLQUFxQixFQUNyQixjQUFxQztRQUVyQyxJQUFJLE1BQU0sR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFBO1FBQ2xD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