/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { BracketInfo, BracketPairWithMinIndentationInfo, } from '../../../textModelBracketPairs.js';
import { TextEditInfo } from './beforeEditPositionMapper.js';
import { LanguageAgnosticBracketTokens } from './brackets.js';
import { lengthAdd, lengthGreaterThanEqual, lengthLessThan, lengthLessThanEqual, lengthsToRange, lengthZero, positionToLength, toLength, } from './length.js';
import { parseDocument } from './parser.js';
import { DenseKeyProvider } from './smallImmutableSet.js';
import { FastTokenizer, TextBufferTokenizer } from './tokenizer.js';
import { CallbackIterable } from '../../../../../base/common/arrays.js';
import { combineTextEditInfos } from './combineTextEditInfos.js';
export class BracketPairsTree extends Disposable {
    didLanguageChange(languageId) {
        return this.brackets.didLanguageChange(languageId);
    }
    constructor(textModel, getLanguageConfiguration) {
        super();
        this.textModel = textModel;
        this.getLanguageConfiguration = getLanguageConfiguration;
        this.didChangeEmitter = new Emitter();
        this.denseKeyProvider = new DenseKeyProvider();
        this.brackets = new LanguageAgnosticBracketTokens(this.denseKeyProvider, this.getLanguageConfiguration);
        this.onDidChange = this.didChangeEmitter.event;
        this.queuedTextEditsForInitialAstWithoutTokens = [];
        this.queuedTextEdits = [];
        if (!textModel.tokenization.hasTokens) {
            const brackets = this.brackets.getSingleLanguageBracketTokens(this.textModel.getLanguageId());
            const tokenizer = new FastTokenizer(this.textModel.getValue(), brackets);
            this.initialAstWithoutTokens = parseDocument(tokenizer, [], undefined, true);
            this.astWithTokens = this.initialAstWithoutTokens;
        }
        else if (textModel.tokenization.backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) {
            // Skip the initial ast, as there is no flickering.
            // Directly create the tree with token information.
            this.initialAstWithoutTokens = undefined;
            this.astWithTokens = this.parseDocumentFromTextBuffer([], undefined, false);
        }
        else {
            // We missed some token changes already, so we cannot use the fast tokenizer + delta increments
            this.initialAstWithoutTokens = this.parseDocumentFromTextBuffer([], undefined, true);
            this.astWithTokens = this.initialAstWithoutTokens;
        }
    }
    //#region TextModel events
    handleDidChangeBackgroundTokenizationState() {
        if (this.textModel.tokenization.backgroundTokenizationState ===
            2 /* BackgroundTokenizationState.Completed */) {
            const wasUndefined = this.initialAstWithoutTokens === undefined;
            // Clear the initial tree as we can use the tree with token information now.
            this.initialAstWithoutTokens = undefined;
            if (!wasUndefined) {
                this.didChangeEmitter.fire();
            }
        }
    }
    handleDidChangeTokens({ ranges }) {
        const edits = ranges.map((r) => new TextEditInfo(toLength(r.fromLineNumber - 1, 0), toLength(r.toLineNumber, 0), toLength(r.toLineNumber - r.fromLineNumber + 1, 0)));
        this.handleEdits(edits, true);
        if (!this.initialAstWithoutTokens) {
            this.didChangeEmitter.fire();
        }
    }
    handleContentChanged(change) {
        const edits = TextEditInfo.fromModelContentChanges(change.changes);
        this.handleEdits(edits, false);
    }
    handleEdits(edits, tokenChange) {
        // Lazily queue the edits and only apply them when the tree is accessed.
        const result = combineTextEditInfos(this.queuedTextEdits, edits);
        this.queuedTextEdits = result;
        if (this.initialAstWithoutTokens && !tokenChange) {
            this.queuedTextEditsForInitialAstWithoutTokens = combineTextEditInfos(this.queuedTextEditsForInitialAstWithoutTokens, edits);
        }
    }
    //#endregion
    flushQueue() {
        if (this.queuedTextEdits.length > 0) {
            this.astWithTokens = this.parseDocumentFromTextBuffer(this.queuedTextEdits, this.astWithTokens, false);
            this.queuedTextEdits = [];
        }
        if (this.queuedTextEditsForInitialAstWithoutTokens.length > 0) {
            if (this.initialAstWithoutTokens) {
                this.initialAstWithoutTokens = this.parseDocumentFromTextBuffer(this.queuedTextEditsForInitialAstWithoutTokens, this.initialAstWithoutTokens, false);
            }
            this.queuedTextEditsForInitialAstWithoutTokens = [];
        }
    }
    /**
     * @pure (only if isPure = true)
     */
    parseDocumentFromTextBuffer(edits, previousAst, immutable) {
        // Is much faster if `isPure = false`.
        const isPure = false;
        const previousAstClone = isPure ? previousAst?.deepClone() : previousAst;
        const tokenizer = new TextBufferTokenizer(this.textModel, this.brackets);
        const result = parseDocument(tokenizer, edits, previousAstClone, immutable);
        return result;
    }
    getBracketsInRange(range, onlyColorizedBrackets) {
        this.flushQueue();
        const startOffset = toLength(range.startLineNumber - 1, range.startColumn - 1);
        const endOffset = toLength(range.endLineNumber - 1, range.endColumn - 1);
        return new CallbackIterable((cb) => {
            const node = this.initialAstWithoutTokens || this.astWithTokens;
            collectBrackets(node, lengthZero, node.length, startOffset, endOffset, cb, 0, 0, new Map(), onlyColorizedBrackets);
        });
    }
    getBracketPairsInRange(range, includeMinIndentation) {
        this.flushQueue();
        const startLength = positionToLength(range.getStartPosition());
        const endLength = positionToLength(range.getEndPosition());
        return new CallbackIterable((cb) => {
            const node = this.initialAstWithoutTokens || this.astWithTokens;
            const context = new CollectBracketPairsContext(cb, includeMinIndentation, this.textModel);
            collectBracketPairs(node, lengthZero, node.length, startLength, endLength, context, 0, new Map());
        });
    }
    getFirstBracketAfter(position) {
        this.flushQueue();
        const node = this.initialAstWithoutTokens || this.astWithTokens;
        return getFirstBracketAfter(node, lengthZero, node.length, positionToLength(position));
    }
    getFirstBracketBefore(position) {
        this.flushQueue();
        const node = this.initialAstWithoutTokens || this.astWithTokens;
        return getFirstBracketBefore(node, lengthZero, node.length, positionToLength(position));
    }
}
function getFirstBracketBefore(node, nodeOffsetStart, nodeOffsetEnd, position) {
    if (node.kind === 4 /* AstNodeKind.List */ || node.kind === 2 /* AstNodeKind.Pair */) {
        const lengths = [];
        for (const child of node.children) {
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            lengths.push({ nodeOffsetStart, nodeOffsetEnd });
            nodeOffsetStart = nodeOffsetEnd;
        }
        for (let i = lengths.length - 1; i >= 0; i--) {
            const { nodeOffsetStart, nodeOffsetEnd } = lengths[i];
            if (lengthLessThan(nodeOffsetStart, position)) {
                const result = getFirstBracketBefore(node.children[i], nodeOffsetStart, nodeOffsetEnd, position);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }
    else if (node.kind === 3 /* AstNodeKind.UnexpectedClosingBracket */) {
        return null;
    }
    else if (node.kind === 1 /* AstNodeKind.Bracket */) {
        const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
        return {
            bracketInfo: node.bracketInfo,
            range,
        };
    }
    return null;
}
function getFirstBracketAfter(node, nodeOffsetStart, nodeOffsetEnd, position) {
    if (node.kind === 4 /* AstNodeKind.List */ || node.kind === 2 /* AstNodeKind.Pair */) {
        for (const child of node.children) {
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThan(position, nodeOffsetEnd)) {
                const result = getFirstBracketAfter(child, nodeOffsetStart, nodeOffsetEnd, position);
                if (result) {
                    return result;
                }
            }
            nodeOffsetStart = nodeOffsetEnd;
        }
        return null;
    }
    else if (node.kind === 3 /* AstNodeKind.UnexpectedClosingBracket */) {
        return null;
    }
    else if (node.kind === 1 /* AstNodeKind.Bracket */) {
        const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
        return {
            bracketInfo: node.bracketInfo,
            range,
        };
    }
    return null;
}
function collectBrackets(node, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, push, level, nestingLevelOfEqualBracketType, levelPerBracketType, onlyColorizedBrackets, parentPairIsIncomplete = false) {
    if (level > 200) {
        return true;
    }
    whileLoop: while (true) {
        switch (node.kind) {
            case 4 /* AstNodeKind.List */: {
                const childCount = node.childrenLength;
                for (let i = 0; i < childCount; i++) {
                    const child = node.getChild(i);
                    if (!child) {
                        continue;
                    }
                    nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
                    if (lengthLessThanEqual(nodeOffsetStart, endOffset) &&
                        lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                        const childEndsAfterEnd = lengthGreaterThanEqual(nodeOffsetEnd, endOffset);
                        if (childEndsAfterEnd) {
                            // No child after this child in the requested window, don't recurse
                            node = child;
                            continue whileLoop;
                        }
                        const shouldContinue = collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, push, level, 0, levelPerBracketType, onlyColorizedBrackets);
                        if (!shouldContinue) {
                            return false;
                        }
                    }
                    nodeOffsetStart = nodeOffsetEnd;
                }
                return true;
            }
            case 2 /* AstNodeKind.Pair */: {
                const colorize = !onlyColorizedBrackets ||
                    !node.closingBracket ||
                    node.closingBracket.bracketInfo.closesColorized(node.openingBracket.bracketInfo);
                let levelPerBracket = 0;
                if (levelPerBracketType) {
                    let existing = levelPerBracketType.get(node.openingBracket.text);
                    if (existing === undefined) {
                        existing = 0;
                    }
                    levelPerBracket = existing;
                    if (colorize) {
                        existing++;
                        levelPerBracketType.set(node.openingBracket.text, existing);
                    }
                }
                const childCount = node.childrenLength;
                for (let i = 0; i < childCount; i++) {
                    const child = node.getChild(i);
                    if (!child) {
                        continue;
                    }
                    nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
                    if (lengthLessThanEqual(nodeOffsetStart, endOffset) &&
                        lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                        const childEndsAfterEnd = lengthGreaterThanEqual(nodeOffsetEnd, endOffset);
                        if (childEndsAfterEnd && child.kind !== 1 /* AstNodeKind.Bracket */) {
                            // No child after this child in the requested window, don't recurse
                            // Don't do this for brackets because of unclosed/unopened brackets
                            node = child;
                            if (colorize) {
                                level++;
                                nestingLevelOfEqualBracketType = levelPerBracket + 1;
                            }
                            else {
                                nestingLevelOfEqualBracketType = levelPerBracket;
                            }
                            continue whileLoop;
                        }
                        if (colorize || child.kind !== 1 /* AstNodeKind.Bracket */ || !node.closingBracket) {
                            const shouldContinue = collectBrackets(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, push, colorize ? level + 1 : level, colorize ? levelPerBracket + 1 : levelPerBracket, levelPerBracketType, onlyColorizedBrackets, !node.closingBracket);
                            if (!shouldContinue) {
                                return false;
                            }
                        }
                    }
                    nodeOffsetStart = nodeOffsetEnd;
                }
                levelPerBracketType?.set(node.openingBracket.text, levelPerBracket);
                return true;
            }
            case 3 /* AstNodeKind.UnexpectedClosingBracket */: {
                const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
                return push(new BracketInfo(range, level - 1, 0, true));
            }
            case 1 /* AstNodeKind.Bracket */: {
                const range = lengthsToRange(nodeOffsetStart, nodeOffsetEnd);
                return push(new BracketInfo(range, level - 1, nestingLevelOfEqualBracketType - 1, parentPairIsIncomplete));
            }
            case 0 /* AstNodeKind.Text */:
                return true;
        }
    }
}
class CollectBracketPairsContext {
    constructor(push, includeMinIndentation, textModel) {
        this.push = push;
        this.includeMinIndentation = includeMinIndentation;
        this.textModel = textModel;
    }
}
function collectBracketPairs(node, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, context, level, levelPerBracketType) {
    if (level > 200) {
        return true;
    }
    let shouldContinue = true;
    if (node.kind === 2 /* AstNodeKind.Pair */) {
        let levelPerBracket = 0;
        if (levelPerBracketType) {
            let existing = levelPerBracketType.get(node.openingBracket.text);
            if (existing === undefined) {
                existing = 0;
            }
            levelPerBracket = existing;
            existing++;
            levelPerBracketType.set(node.openingBracket.text, existing);
        }
        const openingBracketEnd = lengthAdd(nodeOffsetStart, node.openingBracket.length);
        let minIndentation = -1;
        if (context.includeMinIndentation) {
            minIndentation = node.computeMinIndentation(nodeOffsetStart, context.textModel);
        }
        shouldContinue = context.push(new BracketPairWithMinIndentationInfo(lengthsToRange(nodeOffsetStart, nodeOffsetEnd), lengthsToRange(nodeOffsetStart, openingBracketEnd), node.closingBracket
            ? lengthsToRange(lengthAdd(openingBracketEnd, node.child?.length || lengthZero), nodeOffsetEnd)
            : undefined, level, levelPerBracket, node, minIndentation));
        nodeOffsetStart = openingBracketEnd;
        if (shouldContinue && node.child) {
            const child = node.child;
            nodeOffsetEnd = lengthAdd(nodeOffsetStart, child.length);
            if (lengthLessThanEqual(nodeOffsetStart, endOffset) &&
                lengthGreaterThanEqual(nodeOffsetEnd, startOffset)) {
                shouldContinue = collectBracketPairs(child, nodeOffsetStart, nodeOffsetEnd, startOffset, endOffset, context, level + 1, levelPerBracketType);
                if (!shouldContinue) {
                    return false;
                }
            }
        }
        levelPerBracketType?.set(node.openingBracket.text, levelPerBracket);
    }
    else {
        let curOffset = nodeOffsetStart;
        for (const child of node.children) {
            const childOffset = curOffset;
            curOffset = lengthAdd(curOffset, child.length);
            if (lengthLessThanEqual(childOffset, endOffset) &&
                lengthLessThanEqual(startOffset, curOffset)) {
                shouldContinue = collectBracketPairs(child, childOffset, curOffset, startOffset, endOffset, context, level, levelPerBracketType);
                if (!shouldContinue) {
                    return false;
                }
            }
        }
    }
    return shouldContinue;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvYnJhY2tldFBhaXJzVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3BFLE9BQU8sRUFDTixXQUFXLEVBQ1gsaUNBQWlDLEdBRWpDLE1BQU0sbUNBQW1DLENBQUE7QUFLMUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzVELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sU0FBUyxFQUNULHNCQUFzQixFQUN0QixjQUFjLEVBQ2QsbUJBQW1CLEVBQ25CLGNBQWMsRUFDZCxVQUFVLEVBQ1YsZ0JBQWdCLEVBQ2hCLFFBQVEsR0FDUixNQUFNLGFBQWEsQ0FBQTtBQUNwQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQzNDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUduRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU1oRSxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsVUFBVTtJQXFCeEMsaUJBQWlCLENBQUMsVUFBa0I7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