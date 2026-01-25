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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9wYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUlOLHFCQUFxQixFQUNyQixXQUFXLEVBQ1gsV0FBVyxFQUNYLFdBQVcsR0FDWCxNQUFNLFVBQVUsQ0FBQTtBQUNqQixPQUFPLEVBQUUsd0JBQXdCLEVBQWdCLE1BQU0sK0JBQStCLENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUc1Qzs7R0FFRztBQUNILE1BQU0sVUFBVSxhQUFhLENBQzVCLFNBQW9CLEVBQ3BCLEtBQXFCLEVBQ3JCLE9BQTRCLEVBQzVCLG9CQUE2QjtJQUU3QixNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQzFFLE9BQU8sTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFBO0FBQzlCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sTUFBTTtJQU1YOztPQUVHO0lBQ0gsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsZUFBZSxD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