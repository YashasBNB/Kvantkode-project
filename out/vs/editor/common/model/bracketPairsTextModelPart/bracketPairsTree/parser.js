/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InvalidBracketAstNode, ListAstNode, PairAstNode, TextAstNode, } from './ast.js';
import { BeforeEditPositionMapper } from './beforeEditPositionMapper.js';
import { SmallImmutableSet } from './smallImmutableSet.js';
import { lengthIsZero, lengthLessThan } from './length.js';
import { concat23Trees, concat23TreesOfSameHeight } from './concat23Trees.js';
import { NodeReader } from './nodeReader.js';
/**
 * Non incrementally built ASTs are immutable.
 */
export function parseDocument(tokenizer, edits, oldNode, createImmutableLists) {
    const parser = new Parser(tokenizer, edits, oldNode, createImmutableLists);
    return parser.parseDocument();
}
/**
 * Non incrementally built ASTs are immutable.
 */
class Parser {
    /**
     * Reports how many nodes were constructed in the last parse operation.
     */
    get nodesConstructed() {
        return this._itemsConstructed;
    }
    /**
     * Reports how many nodes were reused in the last parse operation.
     */
    get nodesReused() {
        return this._itemsFromCache;
    }
    constructor(tokenizer, edits, oldNode, createImmutableLists) {
        this.tokenizer = tokenizer;
        this.createImmutableLists = createImmutableLists;
        this._itemsConstructed = 0;
        this._itemsFromCache = 0;
        if (oldNode && createImmutableLists) {
            throw new Error('Not supported');
        }
        this.oldNodeReader = oldNode ? new NodeReader(oldNode) : undefined;
        this.positionMapper = new BeforeEditPositionMapper(edits);
    }
    parseDocument() {
        this._itemsConstructed = 0;
        this._itemsFromCache = 0;
        let result = this.parseList(SmallImmutableSet.getEmpty(), 0);
        if (!result) {
            result = ListAstNode.getEmpty();
        }
        return result;
    }
    parseList(openedBracketIds, level) {
        const items = [];
        while (true) {
            let child = this.tryReadChildFromCache(openedBracketIds);
            if (!child) {
                const token = this.tokenizer.peek();
                if (!token ||
                    (token.kind === 2 /* TokenKind.ClosingBracket */ && token.bracketIds.intersects(openedBracketIds))) {
                    break;
                }
                child = this.parseChild(openedBracketIds, level + 1);
            }
            if (child.kind === 4 /* AstNodeKind.List */ && child.childrenLength === 0) {
                continue;
            }
            items.push(child);
        }
        // When there is no oldNodeReader, all items are created from scratch and must have the same height.
        const result = this.oldNodeReader
            ? concat23Trees(items)
            : concat23TreesOfSameHeight(items, this.createImmutableLists);
        return result;
    }
    tryReadChildFromCache(openedBracketIds) {
        if (this.oldNodeReader) {
            const maxCacheableLength = this.positionMapper.getDistanceToNextChange(this.tokenizer.offset);
            if (maxCacheableLength === null || !lengthIsZero(maxCacheableLength)) {
                const cachedNode = this.oldNodeReader.readLongestNodeAt(this.positionMapper.getOffsetBeforeChange(this.tokenizer.offset), (curNode) => {
                    // The edit could extend the ending token, thus we cannot re-use nodes that touch the edit.
                    // If there is no edit anymore, we can re-use the node in any case.
                    if (maxCacheableLength !== null &&
                        !lengthLessThan(curNode.length, maxCacheableLength)) {
                        // Either the node contains edited text or touches edited text.
                        // In the latter case, brackets might have been extended (`end` -> `ending`), so even touching nodes cannot be reused.
                        return false;
                    }
                    const canBeReused = curNode.canBeReused(openedBracketIds);
                    return canBeReused;
                });
                if (cachedNode) {
                    this._itemsFromCache++;
                    this.tokenizer.skip(cachedNode.length);
                    return cachedNode;
                }
            }
        }
        return undefined;
    }
    parseChild(openedBracketIds, level) {
        this._itemsConstructed++;
        const token = this.tokenizer.read();
        switch (token.kind) {
            case 2 /* TokenKind.ClosingBracket */:
                return new InvalidBracketAstNode(token.bracketIds, token.length);
            case 0 /* TokenKind.Text */:
                return token.astNode;
            case 1 /* TokenKind.OpeningBracket */: {
                if (level > 300) {
                    // To prevent stack overflows
                    return new TextAstNode(token.length);
                }
                const set = openedBracketIds.merge(token.bracketIds);
                const child = this.parseList(set, level + 1);
                const nextToken = this.tokenizer.peek();
                if (nextToken &&
                    nextToken.kind === 2 /* TokenKind.ClosingBracket */ &&
                    (nextToken.bracketId === token.bracketId ||
                        nextToken.bracketIds.intersects(token.bracketIds))) {
                    this.tokenizer.read();
                    return PairAstNode.create(token.astNode, child, nextToken.astNode);
                }
                else {
                    return PairAstNode.create(token.astNode, child, null);
                }
            }
            default:
                throw new Error('unexpected');
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFJTixxQkFBcUIsRUFDckIsV0FBVyxFQUNYLFdBQVcsRUFDWCxXQUFXLEdBQ1gsTUFBTSxVQUFVLENBQUE7QUFDakIsT0FBTyxFQUFFLHdCQUF3QixFQUFnQixNQUFNLCtCQUErQixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHNUM7O0dBRUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUM1QixTQUFvQixFQUNwQixLQUFxQixFQUNyQixPQUE0QixFQUM1QixvQkFBNkI7SUFFN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUMxRSxPQUFPLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtBQUM5QixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE1BQU07SUFNWDs7T0FFRztJQUNILElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJ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