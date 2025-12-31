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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJzVHJlZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvYnJhY2tldFBhaXJzVGV4dE1vZGVsUGFydC9icmFja2V0UGFpcnNUcmVlL2JyYWNrZXRQYWlyc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdwRSxPQUFPLEVBQ04sV0FBVyxFQUNYLGlDQUFpQyxHQUVqQyxNQUFNLG1DQUFtQyxDQUFBO0FBSzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDN0QsT0FBTyxFQUVOLFNBQVMsRUFDVCxzQkFBc0IsRUFDdEIsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixjQUFjLEVBQ2QsVUFBVSxFQUNWLGdCQUFnQixFQUNoQixRQUFRLEdBQ1IsTUFBTSxhQUFhLENBQUE7QUFDcEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFHbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFNaEUsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7SUFxQnhDLGlCQUFpQixDQUFDLFVBQWtCO1FBQzFDLE9BQU8sSUFBSSxDQUFDLFFB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