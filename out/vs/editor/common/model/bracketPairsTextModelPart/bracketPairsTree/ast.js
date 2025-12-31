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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvYXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUc5RCxPQUFPLEVBQVUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFHMUQsTUFBTSxDQUFOLElBQWtCLFdBTWpCO0FBTkQsV0FBa0IsV0FBVztJQUM1Qiw2Q0FBUSxDQUFBO0lBQ1IsbURBQVcsQ0FBQTtJQUNYLDZDQUFRLENBQUE7SUFDUixxRkFBNEIsQ0FBQTtJQUM1Qiw2Q0FBUSxDQUFBO0FBQ1QsQ0FBQyxFQU5pQixXQUFXLEtBQVgsV0FBVyxRQU01QjtBQVNEOztHQUVHO0FBQ0gsTUFBZSxXQUFXO0lBNEJ6Qjs7T0FFRztJQUNILElBQVcsTUFBTTtRQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELFlBQW1CLE1BQWM7UUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7SUFDdEIsQ0FBQztDQWtCRDtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLFdBQVc7SUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsY0FBOEIsRUFDOUIsS0FBcUIsRUFDckIsY0FBcUM7UUFFckMsSUFBSSxNQUFNLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQTtRQUNsQyxJQUFJ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