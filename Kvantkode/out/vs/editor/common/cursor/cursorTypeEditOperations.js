/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import * as strings from '../../../base/common/strings.js';
import { ReplaceCommand, ReplaceCommandWithOffsetCursorState, ReplaceCommandWithoutChangingPosition, ReplaceCommandThatPreservesSelection, ReplaceOvertypeCommand, ReplaceOvertypeCommandOnCompositionEnd, } from '../commands/replaceCommand.js';
import { ShiftCommand } from '../commands/shiftCommand.js';
import { SurroundSelectionCommand } from '../commands/surroundSelectionCommand.js';
import { EditOperationResult, isQuote, } from '../cursorCommon.js';
import { getMapForWordSeparators } from '../core/wordCharacterClassifier.js';
import { Range } from '../core/range.js';
import { Position } from '../core/position.js';
import { IndentAction, } from '../languages/languageConfiguration.js';
import { getIndentationAtPosition } from '../languages/languageConfigurationRegistry.js';
import { createScopedLineTokens } from '../languages/supports.js';
import { getIndentActionForType, getIndentForEnter, getInheritIndentForLine, } from '../languages/autoIndent.js';
import { getEnterAction } from '../languages/enterAction.js';
export class AutoIndentOperation {
    static getEdits(config, model, selections, ch, isDoingComposition) {
        if (!isDoingComposition && this._isAutoIndentType(config, model, selections)) {
            const indentationForSelections = [];
            for (const selection of selections) {
                const indentation = this._findActualIndentationForSelection(config, model, selection, ch);
                if (indentation === null) {
                    // Auto indentation failed
                    return;
                }
                indentationForSelections.push({ selection, indentation });
            }
            const autoClosingPairClose = AutoClosingOpenCharTypeOperation.getAutoClosingPairClose(config, model, selections, ch, false);
            return this._getIndentationAndAutoClosingPairEdits(config, model, indentationForSelections, ch, autoClosingPairClose);
        }
        return;
    }
    static _isAutoIndentType(config, model, selections) {
        if (config.autoIndent < 4 /* EditorAutoIndentStrategy.Full */) {
            return false;
        }
        for (let i = 0, len = selections.length; i < len; i++) {
            if (!model.tokenization.isCheapToTokenize(selections[i].getEndPosition().lineNumber)) {
                return false;
            }
        }
        return true;
    }
    static _findActualIndentationForSelection(config, model, selection, ch) {
        const actualIndentation = getIndentActionForType(config, model, selection, ch, {
            shiftIndent: (indentation) => {
                return shiftIndent(config, indentation);
            },
            unshiftIndent: (indentation) => {
                return unshiftIndent(config, indentation);
            },
        }, config.languageConfigurationService);
        if (actualIndentation === null) {
            return null;
        }
        const currentIndentation = getIndentationAtPosition(model, selection.startLineNumber, selection.startColumn);
        if (actualIndentation === config.normalizeIndentation(currentIndentation)) {
            return null;
        }
        return actualIndentation;
    }
    static _getIndentationAndAutoClosingPairEdits(config, model, indentationForSelections, ch, autoClosingPairClose) {
        const commands = indentationForSelections.map(({ selection, indentation }) => {
            if (autoClosingPairClose !== null) {
                // Apply both auto closing pair edits and auto indentation edits
                const indentationEdit = this._getEditFromIndentationAndSelection(config, model, indentation, selection, ch, false);
                return new TypeWithIndentationAndAutoClosingCommand(indentationEdit, selection, ch, autoClosingPairClose);
            }
            else {
                // Apply only auto indentation edits
                const indentationEdit = this._getEditFromIndentationAndSelection(config, model, indentation, selection, ch, true);
                return typeCommand(indentationEdit.range, indentationEdit.text, false);
            }
        });
        const editOptions = { shouldPushStackElementBefore: true, shouldPushStackElementAfter: false };
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, editOptions);
    }
    static _getEditFromIndentationAndSelection(config, model, indentation, selection, ch, includeChInEdit = true) {
        const startLineNumber = selection.startLineNumber;
        const firstNonWhitespaceColumn = model.getLineFirstNonWhitespaceColumn(startLineNumber);
        let text = config.normalizeIndentation(indentation);
        if (firstNonWhitespaceColumn !== 0) {
            const startLine = model.getLineContent(startLineNumber);
            text += startLine.substring(firstNonWhitespaceColumn - 1, selection.startColumn - 1);
        }
        text += includeChInEdit ? ch : '';
        const range = new Range(startLineNumber, 1, selection.endLineNumber, selection.endColumn);
        return { range, text };
    }
}
export class AutoClosingOvertypeOperation {
    static getEdits(prevEditOperationType, config, model, selections, autoClosedCharacters, ch) {
        if (isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch)) {
            return this._runAutoClosingOvertype(prevEditOperationType, selections, ch);
        }
        return;
    }
    static _runAutoClosingOvertype(prevEditOperationType, selections, ch) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            const typeSelection = new Range(position.lineNumber, position.column, position.lineNumber, position.column + 1);
            commands[i] = new ReplaceCommand(typeSelection, ch);
        }
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, 4 /* EditOperationType.TypingOther */),
            shouldPushStackElementAfter: false,
        });
    }
}
export class AutoClosingOvertypeWithInterceptorsOperation {
    static getEdits(config, model, selections, autoClosedCharacters, ch) {
        if (isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch)) {
            // Unfortunately, the close character is at this point "doubled", so we need to delete it...
            const commands = selections.map((s) => new ReplaceCommand(new Range(s.positionLineNumber, s.positionColumn, s.positionLineNumber, s.positionColumn + 1), '', false));
            return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
                shouldPushStackElementBefore: true,
                shouldPushStackElementAfter: false,
            });
        }
        return;
    }
}
export class AutoClosingOpenCharTypeOperation {
    static getEdits(config, model, selections, ch, chIsAlreadyTyped, isDoingComposition) {
        if (!isDoingComposition) {
            const autoClosingPairClose = this.getAutoClosingPairClose(config, model, selections, ch, chIsAlreadyTyped);
            if (autoClosingPairClose !== null) {
                return this._runAutoClosingOpenCharType(selections, ch, chIsAlreadyTyped, autoClosingPairClose);
            }
        }
        return;
    }
    static _runAutoClosingOpenCharType(selections, ch, chIsAlreadyTyped, autoClosingPairClose) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            commands[i] = new TypeWithAutoClosingCommand(selection, ch, !chIsAlreadyTyped, autoClosingPairClose);
        }
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: false,
        });
    }
    static getAutoClosingPairClose(config, model, selections, ch, chIsAlreadyTyped) {
        for (const selection of selections) {
            if (!selection.isEmpty()) {
                return null;
            }
        }
        // This method is called both when typing (regularly) and when composition ends
        // This means that we need to work with a text buffer where sometimes `ch` is not
        // there (it is being typed right now) or with a text buffer where `ch` has already been typed
        //
        // In order to avoid adding checks for `chIsAlreadyTyped` in all places, we will work
        // with two conceptual positions, the position before `ch` and the position after `ch`
        //
        const positions = selections.map((s) => {
            const position = s.getPosition();
            if (chIsAlreadyTyped) {
                return {
                    lineNumber: position.lineNumber,
                    beforeColumn: position.column - ch.length,
                    afterColumn: position.column,
                };
            }
            else {
                return {
                    lineNumber: position.lineNumber,
                    beforeColumn: position.column,
                    afterColumn: position.column,
                };
            }
        });
        // Find the longest auto-closing open pair in case of multiple ending in `ch`
        // e.g. when having [f","] and [","], it picks [f","] if the character before is f
        const pair = this._findAutoClosingPairOpen(config, model, positions.map((p) => new Position(p.lineNumber, p.beforeColumn)), ch);
        if (!pair) {
            return null;
        }
        let autoCloseConfig;
        let shouldAutoCloseBefore;
        const chIsQuote = isQuote(ch);
        if (chIsQuote) {
            autoCloseConfig = config.autoClosingQuotes;
            shouldAutoCloseBefore = config.shouldAutoCloseBefore.quote;
        }
        else {
            const pairIsForComments = config.blockCommentStartToken
                ? pair.open.includes(config.blockCommentStartToken)
                : false;
            if (pairIsForComments) {
                autoCloseConfig = config.autoClosingComments;
                shouldAutoCloseBefore = config.shouldAutoCloseBefore.comment;
            }
            else {
                autoCloseConfig = config.autoClosingBrackets;
                shouldAutoCloseBefore = config.shouldAutoCloseBefore.bracket;
            }
        }
        if (autoCloseConfig === 'never') {
            return null;
        }
        // Sometimes, it is possible to have two auto-closing pairs that have a containment relationship
        // e.g. when having [(,)] and [(*,*)]
        // - when typing (, the resulting state is (|)
        // - when typing *, the desired resulting state is (*|*), not (*|*))
        const containedPair = this._findContainedAutoClosingPair(config, pair);
        const containedPairClose = containedPair ? containedPair.close : '';
        let isContainedPairPresent = true;
        for (const position of positions) {
            const { lineNumber, beforeColumn, afterColumn } = position;
            const lineText = model.getLineContent(lineNumber);
            const lineBefore = lineText.substring(0, beforeColumn - 1);
            const lineAfter = lineText.substring(afterColumn - 1);
            if (!lineAfter.startsWith(containedPairClose)) {
                isContainedPairPresent = false;
            }
            // Only consider auto closing the pair if an allowed character follows or if another autoclosed pair closing brace follows
            if (lineAfter.length > 0) {
                const characterAfter = lineAfter.charAt(0);
                const isBeforeCloseBrace = this._isBeforeClosingBrace(config, lineAfter);
                if (!isBeforeCloseBrace && !shouldAutoCloseBefore(characterAfter)) {
                    return null;
                }
            }
            // Do not auto-close ' or " after a word character
            if (pair.open.length === 1 && (ch === "'" || ch === '"') && autoCloseConfig !== 'always') {
                const wordSeparators = getMapForWordSeparators(config.wordSeparators, []);
                if (lineBefore.length > 0) {
                    const characterBefore = lineBefore.charCodeAt(lineBefore.length - 1);
                    if (wordSeparators.get(characterBefore) === 0 /* WordCharacterClass.Regular */) {
                        return null;
                    }
                }
            }
            if (!model.tokenization.isCheapToTokenize(lineNumber)) {
                // Do not force tokenization
                return null;
            }
            model.tokenization.forceTokenization(lineNumber);
            const lineTokens = model.tokenization.getLineTokens(lineNumber);
            const scopedLineTokens = createScopedLineTokens(lineTokens, beforeColumn - 1);
            if (!pair.shouldAutoClose(scopedLineTokens, beforeColumn - scopedLineTokens.firstCharOffset)) {
                return null;
            }
            // Typing for example a quote could either start a new string, in which case auto-closing is desirable
            // or it could end a previously started string, in which case auto-closing is not desirable
            //
            // In certain cases, it is really not possible to look at the previous token to determine
            // what would happen. That's why we do something really unusual, we pretend to type a different
            // character and ask the tokenizer what the outcome of doing that is: after typing a neutral
            // character, are we in a string (i.e. the quote would most likely end a string) or not?
            //
            const neutralCharacter = pair.findNeutralCharacter();
            if (neutralCharacter) {
                const tokenType = model.tokenization.getTokenTypeIfInsertingCharacter(lineNumber, beforeColumn, neutralCharacter);
                if (!pair.isOK(tokenType)) {
                    return null;
                }
            }
        }
        if (isContainedPairPresent) {
            return pair.close.substring(0, pair.close.length - containedPairClose.length);
        }
        else {
            return pair.close;
        }
    }
    /**
     * Find another auto-closing pair that is contained by the one passed in.
     *
     * e.g. when having [(,)] and [(*,*)] as auto-closing pairs
     * this method will find [(,)] as a containment pair for [(*,*)]
     */
    static _findContainedAutoClosingPair(config, pair) {
        if (pair.open.length <= 1) {
            return null;
        }
        const lastChar = pair.close.charAt(pair.close.length - 1);
        // get candidates with the same last character as close
        const candidates = config.autoClosingPairs.autoClosingPairsCloseByEnd.get(lastChar) || [];
        let result = null;
        for (const candidate of candidates) {
            if (candidate.open !== pair.open &&
                pair.open.includes(candidate.open) &&
                pair.close.endsWith(candidate.close)) {
                if (!result || candidate.open.length > result.open.length) {
                    result = candidate;
                }
            }
        }
        return result;
    }
    /**
     * Determine if typing `ch` at all `positions` in the `model` results in an
     * auto closing open sequence being typed.
     *
     * Auto closing open sequences can consist of multiple characters, which
     * can lead to ambiguities. In such a case, the longest auto-closing open
     * sequence is returned.
     */
    static _findAutoClosingPairOpen(config, model, positions, ch) {
        const candidates = config.autoClosingPairs.autoClosingPairsOpenByEnd.get(ch);
        if (!candidates) {
            return null;
        }
        // Determine which auto-closing pair it is
        let result = null;
        for (const candidate of candidates) {
            if (result === null || candidate.open.length > result.open.length) {
                let candidateIsMatch = true;
                for (const position of positions) {
                    const relevantText = model.getValueInRange(new Range(position.lineNumber, position.column - candidate.open.length + 1, position.lineNumber, position.column));
                    if (relevantText + ch !== candidate.open) {
                        candidateIsMatch = false;
                        break;
                    }
                }
                if (candidateIsMatch) {
                    result = candidate;
                }
            }
        }
        return result;
    }
    static _isBeforeClosingBrace(config, lineAfter) {
        // If the start of lineAfter can be interpretted as both a starting or ending brace, default to returning false
        const nextChar = lineAfter.charAt(0);
        const potentialStartingBraces = config.autoClosingPairs.autoClosingPairsOpenByStart.get(nextChar) || [];
        const potentialClosingBraces = config.autoClosingPairs.autoClosingPairsCloseByStart.get(nextChar) || [];
        const isBeforeStartingBrace = potentialStartingBraces.some((x) => lineAfter.startsWith(x.open));
        const isBeforeClosingBrace = potentialClosingBraces.some((x) => lineAfter.startsWith(x.close));
        return !isBeforeStartingBrace && isBeforeClosingBrace;
    }
}
export class CompositionEndOvertypeOperation {
    static getEdits(config, compositions) {
        const isOvertypeMode = config.inputMode === 'overtype';
        if (!isOvertypeMode) {
            return null;
        }
        const commands = compositions.map((composition) => new ReplaceOvertypeCommandOnCompositionEnd(composition.insertedTextRange));
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: false,
        });
    }
}
export class SurroundSelectionOperation {
    static getEdits(config, model, selections, ch, isDoingComposition) {
        if (!isDoingComposition && this._isSurroundSelectionType(config, model, selections, ch)) {
            return this._runSurroundSelectionType(config, selections, ch);
        }
        return;
    }
    static _runSurroundSelectionType(config, selections, ch) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const closeCharacter = config.surroundingPairs[ch];
            commands[i] = new SurroundSelectionCommand(selection, ch, closeCharacter);
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true,
        });
    }
    static _isSurroundSelectionType(config, model, selections, ch) {
        if (!shouldSurroundChar(config, ch) || !config.surroundingPairs.hasOwnProperty(ch)) {
            return false;
        }
        const isTypingAQuoteCharacter = isQuote(ch);
        for (const selection of selections) {
            if (selection.isEmpty()) {
                return false;
            }
            let selectionContainsOnlyWhitespace = true;
            for (let lineNumber = selection.startLineNumber; lineNumber <= selection.endLineNumber; lineNumber++) {
                const lineText = model.getLineContent(lineNumber);
                const startIndex = lineNumber === selection.startLineNumber ? selection.startColumn - 1 : 0;
                const endIndex = lineNumber === selection.endLineNumber ? selection.endColumn - 1 : lineText.length;
                const selectedText = lineText.substring(startIndex, endIndex);
                if (/[^ \t]/.test(selectedText)) {
                    // this selected text contains something other than whitespace
                    selectionContainsOnlyWhitespace = false;
                    break;
                }
            }
            if (selectionContainsOnlyWhitespace) {
                return false;
            }
            if (isTypingAQuoteCharacter &&
                selection.startLineNumber === selection.endLineNumber &&
                selection.startColumn + 1 === selection.endColumn) {
                const selectionText = model.getValueInRange(selection);
                if (isQuote(selectionText)) {
                    // Typing a quote character on top of another quote character
                    // => disable surround selection type
                    return false;
                }
            }
        }
        return true;
    }
}
export class InterceptorElectricCharOperation {
    static getEdits(prevEditOperationType, config, model, selections, ch, isDoingComposition) {
        // Electric characters make sense only when dealing with a single cursor,
        // as multiple cursors typing brackets for example would interfer with bracket matching
        if (!isDoingComposition && this._isTypeInterceptorElectricChar(config, model, selections)) {
            const r = this._typeInterceptorElectricChar(prevEditOperationType, config, model, selections[0], ch);
            if (r) {
                return r;
            }
        }
        return;
    }
    static _isTypeInterceptorElectricChar(config, model, selections) {
        if (selections.length === 1 &&
            model.tokenization.isCheapToTokenize(selections[0].getEndPosition().lineNumber)) {
            return true;
        }
        return false;
    }
    static _typeInterceptorElectricChar(prevEditOperationType, config, model, selection, ch) {
        if (!config.electricChars.hasOwnProperty(ch) || !selection.isEmpty()) {
            return null;
        }
        const position = selection.getPosition();
        model.tokenization.forceTokenization(position.lineNumber);
        const lineTokens = model.tokenization.getLineTokens(position.lineNumber);
        let electricAction;
        try {
            electricAction = config.onElectricCharacter(ch, lineTokens, position.column);
        }
        catch (e) {
            onUnexpectedError(e);
            return null;
        }
        if (!electricAction) {
            return null;
        }
        if (electricAction.matchOpenBracket) {
            const endColumn = (lineTokens.getLineContent() + ch).lastIndexOf(electricAction.matchOpenBracket) + 1;
            const match = model.bracketPairs.findMatchingBracketUp(electricAction.matchOpenBracket, {
                lineNumber: position.lineNumber,
                column: endColumn,
            }, 500 /* give at most 500ms to compute */);
            if (match) {
                if (match.startLineNumber === position.lineNumber) {
                    // matched something on the same line => no change in indentation
                    return null;
                }
                const matchLine = model.getLineContent(match.startLineNumber);
                const matchLineIndentation = strings.getLeadingWhitespace(matchLine);
                const newIndentation = config.normalizeIndentation(matchLineIndentation);
                const lineText = model.getLineContent(position.lineNumber);
                const lineFirstNonBlankColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumber) || position.column;
                const prefix = lineText.substring(lineFirstNonBlankColumn - 1, position.column - 1);
                const typeText = newIndentation + prefix + ch;
                const typeSelection = new Range(position.lineNumber, 1, position.lineNumber, position.column);
                const command = new ReplaceCommand(typeSelection, typeText);
                return new EditOperationResult(getTypingOperation(typeText, prevEditOperationType), [command], {
                    shouldPushStackElementBefore: false,
                    shouldPushStackElementAfter: true,
                });
            }
        }
        return null;
    }
}
export class SimpleCharacterTypeOperation {
    static getEdits(config, prevEditOperationType, selections, ch, isDoingComposition) {
        // A simple character type
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const ChosenReplaceCommand = config.inputMode === 'overtype' && !isDoingComposition
                ? ReplaceOvertypeCommand
                : ReplaceCommand;
            commands[i] = new ChosenReplaceCommand(selections[i], ch);
        }
        const opType = getTypingOperation(ch, prevEditOperationType);
        return new EditOperationResult(opType, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, opType),
            shouldPushStackElementAfter: false,
        });
    }
}
export class EnterOperation {
    static getEdits(config, model, selections, ch, isDoingComposition) {
        if (!isDoingComposition && ch === '\n') {
            const commands = [];
            for (let i = 0, len = selections.length; i < len; i++) {
                commands[i] = this._enter(config, model, false, selections[i]);
            }
            return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
                shouldPushStackElementBefore: true,
                shouldPushStackElementAfter: false,
            });
        }
        return;
    }
    static _enter(config, model, keepPosition, range) {
        if (config.autoIndent === 0 /* EditorAutoIndentStrategy.None */) {
            return typeCommand(range, '\n', keepPosition);
        }
        if (!model.tokenization.isCheapToTokenize(range.getStartPosition().lineNumber) ||
            config.autoIndent === 1 /* EditorAutoIndentStrategy.Keep */) {
            const lineText = model.getLineContent(range.startLineNumber);
            const indentation = strings.getLeadingWhitespace(lineText).substring(0, range.startColumn - 1);
            return typeCommand(range, '\n' + config.normalizeIndentation(indentation), keepPosition);
        }
        const r = getEnterAction(config.autoIndent, model, range, config.languageConfigurationService);
        if (r) {
            if (r.indentAction === IndentAction.None) {
                // Nothing special
                return typeCommand(range, '\n' + config.normalizeIndentation(r.indentation + r.appendText), keepPosition);
            }
            else if (r.indentAction === IndentAction.Indent) {
                // Indent once
                return typeCommand(range, '\n' + config.normalizeIndentation(r.indentation + r.appendText), keepPosition);
            }
            else if (r.indentAction === IndentAction.IndentOutdent) {
                // Ultra special
                const normalIndent = config.normalizeIndentation(r.indentation);
                const increasedIndent = config.normalizeIndentation(r.indentation + r.appendText);
                const typeText = '\n' + increasedIndent + '\n' + normalIndent;
                if (keepPosition) {
                    return new ReplaceCommandWithoutChangingPosition(range, typeText, true);
                }
                else {
                    return new ReplaceCommandWithOffsetCursorState(range, typeText, -1, increasedIndent.length - normalIndent.length, true);
                }
            }
            else if (r.indentAction === IndentAction.Outdent) {
                const actualIndentation = unshiftIndent(config, r.indentation);
                return typeCommand(range, '\n' + config.normalizeIndentation(actualIndentation + r.appendText), keepPosition);
            }
        }
        const lineText = model.getLineContent(range.startLineNumber);
        const indentation = strings.getLeadingWhitespace(lineText).substring(0, range.startColumn - 1);
        if (config.autoIndent >= 4 /* EditorAutoIndentStrategy.Full */) {
            const ir = getIndentForEnter(config.autoIndent, model, range, {
                unshiftIndent: (indent) => {
                    return unshiftIndent(config, indent);
                },
                shiftIndent: (indent) => {
                    return shiftIndent(config, indent);
                },
                normalizeIndentation: (indent) => {
                    return config.normalizeIndentation(indent);
                },
            }, config.languageConfigurationService);
            if (ir) {
                let oldEndViewColumn = config.visibleColumnFromColumn(model, range.getEndPosition());
                const oldEndColumn = range.endColumn;
                const newLineContent = model.getLineContent(range.endLineNumber);
                const firstNonWhitespace = strings.firstNonWhitespaceIndex(newLineContent);
                if (firstNonWhitespace >= 0) {
                    range = range.setEndPosition(range.endLineNumber, Math.max(range.endColumn, firstNonWhitespace + 1));
                }
                else {
                    range = range.setEndPosition(range.endLineNumber, model.getLineMaxColumn(range.endLineNumber));
                }
                if (keepPosition) {
                    return new ReplaceCommandWithoutChangingPosition(range, '\n' + config.normalizeIndentation(ir.afterEnter), true);
                }
                else {
                    let offset = 0;
                    if (oldEndColumn <= firstNonWhitespace + 1) {
                        if (!config.insertSpaces) {
                            oldEndViewColumn = Math.ceil(oldEndViewColumn / config.indentSize);
                        }
                        offset = Math.min(oldEndViewColumn + 1 - config.normalizeIndentation(ir.afterEnter).length - 1, 0);
                    }
                    return new ReplaceCommandWithOffsetCursorState(range, '\n' + config.normalizeIndentation(ir.afterEnter), 0, offset, true);
                }
            }
        }
        return typeCommand(range, '\n' + config.normalizeIndentation(indentation), keepPosition);
    }
    static lineInsertBefore(config, model, selections) {
        if (model === null || selections === null) {
            return [];
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            let lineNumber = selections[i].positionLineNumber;
            if (lineNumber === 1) {
                commands[i] = new ReplaceCommandWithoutChangingPosition(new Range(1, 1, 1, 1), '\n');
            }
            else {
                lineNumber--;
                const column = model.getLineMaxColumn(lineNumber);
                commands[i] = this._enter(config, model, false, new Range(lineNumber, column, lineNumber, column));
            }
        }
        return commands;
    }
    static lineInsertAfter(config, model, selections) {
        if (model === null || selections === null) {
            return [];
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const lineNumber = selections[i].positionLineNumber;
            const column = model.getLineMaxColumn(lineNumber);
            commands[i] = this._enter(config, model, false, new Range(lineNumber, column, lineNumber, column));
        }
        return commands;
    }
    static lineBreakInsert(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = this._enter(config, model, true, selections[i]);
        }
        return commands;
    }
}
export class PasteOperation {
    static getEdits(config, model, selections, text, pasteOnNewLine, multicursorText) {
        const distributedPaste = this._distributePasteToCursors(config, selections, text, pasteOnNewLine, multicursorText);
        if (distributedPaste) {
            selections = selections.sort(Range.compareRangesUsingStarts);
            return this._distributedPaste(config, model, selections, distributedPaste);
        }
        else {
            return this._simplePaste(config, model, selections, text, pasteOnNewLine);
        }
    }
    static _distributePasteToCursors(config, selections, text, pasteOnNewLine, multicursorText) {
        if (pasteOnNewLine) {
            return null;
        }
        if (selections.length === 1) {
            return null;
        }
        if (multicursorText && multicursorText.length === selections.length) {
            return multicursorText;
        }
        if (config.multiCursorPaste === 'spread') {
            // Try to spread the pasted text in case the line count matches the cursor count
            // Remove trailing \n if present
            if (text.charCodeAt(text.length - 1) === 10 /* CharCode.LineFeed */) {
                text = text.substring(0, text.length - 1);
            }
            // Remove trailing \r if present
            if (text.charCodeAt(text.length - 1) === 13 /* CharCode.CarriageReturn */) {
                text = text.substring(0, text.length - 1);
            }
            const lines = strings.splitLines(text);
            if (lines.length === selections.length) {
                return lines;
            }
        }
        return null;
    }
    static _distributedPaste(config, model, selections, text) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const shouldOvertypeOnPaste = config.overtypeOnPaste && config.inputMode === 'overtype';
            const ChosenReplaceCommand = shouldOvertypeOnPaste ? ReplaceOvertypeCommand : ReplaceCommand;
            commands[i] = new ChosenReplaceCommand(selections[i], text[i]);
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true,
        });
    }
    static _simplePaste(config, model, selections, text, pasteOnNewLine) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            if (pasteOnNewLine && !selection.isEmpty()) {
                pasteOnNewLine = false;
            }
            if (pasteOnNewLine && text.indexOf('\n') !== text.length - 1) {
                pasteOnNewLine = false;
            }
            if (pasteOnNewLine) {
                // Paste entire line at the beginning of line
                const typeSelection = new Range(position.lineNumber, 1, position.lineNumber, 1);
                commands[i] = new ReplaceCommandThatPreservesSelection(typeSelection, text, selection, true);
            }
            else {
                const shouldOvertypeOnPaste = config.overtypeOnPaste && config.inputMode === 'overtype';
                const ChosenReplaceCommand = shouldOvertypeOnPaste ? ReplaceOvertypeCommand : ReplaceCommand;
                commands[i] = new ChosenReplaceCommand(selection, text);
            }
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true,
        });
    }
}
export class CompositionOperation {
    static getEdits(prevEditOperationType, config, model, selections, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        const commands = selections.map((selection) => this._compositionType(model, selection, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta));
        return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, 4 /* EditOperationType.TypingOther */),
            shouldPushStackElementAfter: false,
        });
    }
    static _compositionType(model, selection, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!selection.isEmpty()) {
            // looks like https://github.com/microsoft/vscode/issues/2773
            // where a cursor operation occurred before a canceled composition
            // => ignore composition
            return null;
        }
        const pos = selection.getPosition();
        const startColumn = Math.max(1, pos.column - replacePrevCharCnt);
        const endColumn = Math.min(model.getLineMaxColumn(pos.lineNumber), pos.column + replaceNextCharCnt);
        const range = new Range(pos.lineNumber, startColumn, pos.lineNumber, endColumn);
        return new ReplaceCommandWithOffsetCursorState(range, text, 0, positionDelta);
    }
}
export class TypeWithoutInterceptorsOperation {
    static getEdits(prevEditOperationType, selections, str) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new ReplaceCommand(selections[i], str);
        }
        const opType = getTypingOperation(str, prevEditOperationType);
        return new EditOperationResult(opType, commands, {
            shouldPushStackElementBefore: shouldPushStackElementBetween(prevEditOperationType, opType),
            shouldPushStackElementAfter: false,
        });
    }
}
export class TabOperation {
    static getCommands(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (selection.isEmpty()) {
                const lineText = model.getLineContent(selection.startLineNumber);
                if (/^\s*$/.test(lineText) &&
                    model.tokenization.isCheapToTokenize(selection.startLineNumber)) {
                    let goodIndent = this._goodIndentForLine(config, model, selection.startLineNumber);
                    goodIndent = goodIndent || '\t';
                    const possibleTypeText = config.normalizeIndentation(goodIndent);
                    if (!lineText.startsWith(possibleTypeText)) {
                        commands[i] = new ReplaceCommand(new Range(selection.startLineNumber, 1, selection.startLineNumber, lineText.length + 1), possibleTypeText, true);
                        continue;
                    }
                }
                commands[i] = this._replaceJumpToNextIndent(config, model, selection, true);
            }
            else {
                if (selection.startLineNumber === selection.endLineNumber) {
                    const lineMaxColumn = model.getLineMaxColumn(selection.startLineNumber);
                    if (selection.startColumn !== 1 || selection.endColumn !== lineMaxColumn) {
                        // This is a single line selection that is not the entire line
                        commands[i] = this._replaceJumpToNextIndent(config, model, selection, false);
                        continue;
                    }
                }
                commands[i] = new ShiftCommand(selection, {
                    isUnshift: false,
                    tabSize: config.tabSize,
                    indentSize: config.indentSize,
                    insertSpaces: config.insertSpaces,
                    useTabStops: config.useTabStops,
                    autoIndent: config.autoIndent,
                }, config.languageConfigurationService);
            }
        }
        return commands;
    }
    static _goodIndentForLine(config, model, lineNumber) {
        let action = null;
        let indentation = '';
        const expectedIndentAction = getInheritIndentForLine(config.autoIndent, model, lineNumber, false, config.languageConfigurationService);
        if (expectedIndentAction) {
            action = expectedIndentAction.action;
            indentation = expectedIndentAction.indentation;
        }
        else if (lineNumber > 1) {
            let lastLineNumber;
            for (lastLineNumber = lineNumber - 1; lastLineNumber >= 1; lastLineNumber--) {
                const lineText = model.getLineContent(lastLineNumber);
                const nonWhitespaceIdx = strings.lastNonWhitespaceIndex(lineText);
                if (nonWhitespaceIdx >= 0) {
                    break;
                }
            }
            if (lastLineNumber < 1) {
                // No previous line with content found
                return null;
            }
            const maxColumn = model.getLineMaxColumn(lastLineNumber);
            const expectedEnterAction = getEnterAction(config.autoIndent, model, new Range(lastLineNumber, maxColumn, lastLineNumber, maxColumn), config.languageConfigurationService);
            if (expectedEnterAction) {
                indentation = expectedEnterAction.indentation + expectedEnterAction.appendText;
            }
        }
        if (action) {
            if (action === IndentAction.Indent) {
                indentation = shiftIndent(config, indentation);
            }
            if (action === IndentAction.Outdent) {
                indentation = unshiftIndent(config, indentation);
            }
            indentation = config.normalizeIndentation(indentation);
        }
        if (!indentation) {
            return null;
        }
        return indentation;
    }
    static _replaceJumpToNextIndent(config, model, selection, insertsAutoWhitespace) {
        let typeText = '';
        const position = selection.getStartPosition();
        if (config.insertSpaces) {
            const visibleColumnFromColumn = config.visibleColumnFromColumn(model, position);
            const indentSize = config.indentSize;
            const spacesCnt = indentSize - (visibleColumnFromColumn % indentSize);
            for (let i = 0; i < spacesCnt; i++) {
                typeText += ' ';
            }
        }
        else {
            typeText = '\t';
        }
        return new ReplaceCommand(selection, typeText, insertsAutoWhitespace);
    }
}
export class BaseTypeWithAutoClosingCommand extends ReplaceCommandWithOffsetCursorState {
    constructor(selection, text, lineNumberDeltaOffset, columnDeltaOffset, openCharacter, closeCharacter) {
        super(selection, text, lineNumberDeltaOffset, columnDeltaOffset);
        this._openCharacter = openCharacter;
        this._closeCharacter = closeCharacter;
        this.closeCharacterRange = null;
        this.enclosingRange = null;
    }
    _computeCursorStateWithRange(model, range, helper) {
        this.closeCharacterRange = new Range(range.startLineNumber, range.endColumn - this._closeCharacter.length, range.endLineNumber, range.endColumn);
        this.enclosingRange = new Range(range.startLineNumber, range.endColumn - this._openCharacter.length - this._closeCharacter.length, range.endLineNumber, range.endColumn);
        return super.computeCursorState(model, helper);
    }
}
class TypeWithAutoClosingCommand extends BaseTypeWithAutoClosingCommand {
    constructor(selection, openCharacter, insertOpenCharacter, closeCharacter) {
        const text = (insertOpenCharacter ? openCharacter : '') + closeCharacter;
        const lineNumberDeltaOffset = 0;
        const columnDeltaOffset = -closeCharacter.length;
        super(selection, text, lineNumberDeltaOffset, columnDeltaOffset, openCharacter, closeCharacter);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        const range = inverseEditOperations[0].range;
        return this._computeCursorStateWithRange(model, range, helper);
    }
}
class TypeWithIndentationAndAutoClosingCommand extends BaseTypeWithAutoClosingCommand {
    constructor(autoIndentationEdit, selection, openCharacter, closeCharacter) {
        const text = openCharacter + closeCharacter;
        const lineNumberDeltaOffset = 0;
        const columnDeltaOffset = openCharacter.length;
        super(selection, text, lineNumberDeltaOffset, columnDeltaOffset, openCharacter, closeCharacter);
        this._autoIndentationEdit = autoIndentationEdit;
        this._autoClosingEdit = { range: selection, text };
    }
    getEditOperations(model, builder) {
        builder.addTrackedEditOperation(this._autoIndentationEdit.range, this._autoIndentationEdit.text);
        builder.addTrackedEditOperation(this._autoClosingEdit.range, this._autoClosingEdit.text);
    }
    computeCursorState(model, helper) {
        const inverseEditOperations = helper.getInverseEditOperations();
        if (inverseEditOperations.length !== 2) {
            throw new Error('There should be two inverse edit operations!');
        }
        const range1 = inverseEditOperations[0].range;
        const range2 = inverseEditOperations[1].range;
        const range = range1.plusRange(range2);
        return this._computeCursorStateWithRange(model, range, helper);
    }
}
function getTypingOperation(typedText, previousTypingOperation) {
    if (typedText === ' ') {
        return previousTypingOperation === 5 /* EditOperationType.TypingFirstSpace */ ||
            previousTypingOperation === 6 /* EditOperationType.TypingConsecutiveSpace */
            ? 6 /* EditOperationType.TypingConsecutiveSpace */
            : 5 /* EditOperationType.TypingFirstSpace */;
    }
    return 4 /* EditOperationType.TypingOther */;
}
function shouldPushStackElementBetween(previousTypingOperation, typingOperation) {
    if (isTypingOperation(previousTypingOperation) && !isTypingOperation(typingOperation)) {
        // Always set an undo stop before non-type operations
        return true;
    }
    if (previousTypingOperation === 5 /* EditOperationType.TypingFirstSpace */) {
        // `abc |d`: No undo stop
        // `abc  |d`: Undo stop
        return false;
    }
    // Insert undo stop between different operation types
    return normalizeOperationType(previousTypingOperation) !== normalizeOperationType(typingOperation);
}
function normalizeOperationType(type) {
    return type === 6 /* EditOperationType.TypingConsecutiveSpace */ ||
        type === 5 /* EditOperationType.TypingFirstSpace */
        ? 'space'
        : type;
}
function isTypingOperation(type) {
    return (type === 4 /* EditOperationType.TypingOther */ ||
        type === 5 /* EditOperationType.TypingFirstSpace */ ||
        type === 6 /* EditOperationType.TypingConsecutiveSpace */);
}
function isAutoClosingOvertype(config, model, selections, autoClosedCharacters, ch) {
    if (config.autoClosingOvertype === 'never') {
        return false;
    }
    if (!config.autoClosingPairs.autoClosingPairsCloseSingleChar.has(ch)) {
        return false;
    }
    for (let i = 0, len = selections.length; i < len; i++) {
        const selection = selections[i];
        if (!selection.isEmpty()) {
            return false;
        }
        const position = selection.getPosition();
        const lineText = model.getLineContent(position.lineNumber);
        const afterCharacter = lineText.charAt(position.column - 1);
        if (afterCharacter !== ch) {
            return false;
        }
        // Do not over-type quotes after a backslash
        const chIsQuote = isQuote(ch);
        const beforeCharacter = position.column > 2 ? lineText.charCodeAt(position.column - 2) : 0 /* CharCode.Null */;
        if (beforeCharacter === 92 /* CharCode.Backslash */ && chIsQuote) {
            return false;
        }
        // Must over-type a closing character typed by the editor
        if (config.autoClosingOvertype === 'auto') {
            let found = false;
            for (let j = 0, lenJ = autoClosedCharacters.length; j < lenJ; j++) {
                const autoClosedCharacter = autoClosedCharacters[j];
                if (position.lineNumber === autoClosedCharacter.startLineNumber &&
                    position.column === autoClosedCharacter.startColumn) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
    }
    return true;
}
function typeCommand(range, text, keepPosition) {
    if (keepPosition) {
        return new ReplaceCommandWithoutChangingPosition(range, text, true);
    }
    else {
        return new ReplaceCommand(range, text, true);
    }
}
export function shiftIndent(config, indentation, count) {
    count = count || 1;
    return ShiftCommand.shiftIndent(indentation, indentation.length + count, config.tabSize, config.indentSize, config.insertSpaces);
}
export function unshiftIndent(config, indentation, count) {
    count = count || 1;
    return ShiftCommand.unshiftIndent(indentation, indentation.length + count, config.tabSize, config.indentSize, config.insertSpaces);
}
export function shouldSurroundChar(config, ch) {
    if (isQuote(ch)) {
        return config.autoSurround === 'quotes' || config.autoSurround === 'languageDefined';
    }
    else {
        // Character is a bracket
        return config.autoSurround === 'brackets' || config.autoSurround === 'languageDefined';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVHlwZUVkaXRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JUeXBlRWRpdE9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sY0FBYyxFQUNkLG1DQUFtQyxFQUNuQyxxQ0FBcUMsRUFDckMsb0NBQW9DLEVBQ3BDLHNCQUFzQixFQUN0QixzQ0FBc0MsR0FDdEMsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEYsT0FBTyxFQUVOLG1CQUFtQixFQUduQixPQUFPLEdBQ1AsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQXNCLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXhDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUc5QyxPQUFPLEVBRU4sWUFBWSxHQUVaLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFHeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakUsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixpQkFBaUIsRUFDakIsdUJBQXVCLEdBQ3ZCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRzVELE1BQU0sT0FBTyxtQkFBbUI7SUFDeEIsTUFBTSxDQUFDLFFBQVEsQ0FDckIsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsRUFBVSxFQUNWLGtCQUEyQjtRQUUzQixJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM5RSxNQUFNLHdCQUF3QixHQUFvRCxFQUFFLENBQUE7WUFDcEYsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUN6RixJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDMUIsMEJBQTBCO29CQUMxQixPQUFNO2dCQUNQLENBQUM7Z0JBQ0Qsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUE7WUFDMUQsQ0FBQztZQUNELE1BQU0sb0JBQW9CLEdBQUcsZ0NBQWdDLENBQUMsdUJBQXVCLENBQ3BGLE1BQU0sRUFDTixLQUFLLEVBQ0wsVUFBVSxFQUNWLEVBQUUsRUFDRixLQUFLLENBQ0wsQ0FBQTtZQUNELE9BQU8sSUFBSSxDQUFDLHNDQUFzQyxDQUNqRCxNQUFNLEVBQ04sS0FBSyxFQUNMLHdCQUF3QixFQUN4QixFQUFFLEVBQ0Ysb0JBQW9CLENBQ3BCLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTTtJQUNQLENBQUM7SUFFTyxNQUFNLENBQUMsaUJBQWlCLENBQy9CLE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFVBQXVCO1FBRXZCLElBQUksTUFBTSxDQUFDLFVBQVUsd0NBQWdDLEVBQUUsQ0FBQztZQUN2RCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RGLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxNQUFNLENBQUMsa0NBQWtDLENBQ2hELE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFNBQW9CLEVBQ3BCLEVBQVU7UUFFVixNQUFNLGlCQUFpQixHQUFHLHNCQUFzQixDQUMvQyxNQUFNLEVBQ04sS0FBSyxFQUNMLFNBQVMsRUFDVCxFQUFFLEVBQ0Y7WUFDQyxXQUFXLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDNUIsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFDRCxhQUFhLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDOUIsT0FBTyxhQUFhLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQzFDLENBQUM7U0FDRCxFQUNELE1BQU0sQ0FBQyw0QkFBNEIsQ0FDbkMsQ0FBQTtRQUVELElBQUksaUJBQWlCLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDaEMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyx3QkFBd0IsQ0FDbEQsS0FBSyxFQUNMLFNBQVMsQ0FBQyxlQUFlLEVBQ3pCLFNBQVMsQ0FBQyxXQUFXLENBQ3JCLENBQUE7UUFDRCxJQUFJLGlCQUFpQixLQUFLLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDM0UsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQTtJQUN6QixDQUFDO0lBRU8sTUFBTSxDQUFDLHNDQUFzQyxDQUNwRCxNQUEyQixFQUMzQixLQUFpQixFQUNqQix3QkFBeUUsRUFDekUsRUFBVSxFQUNWLG9CQUFtQztRQUVuQyxNQUFNLFFBQVEsR0FBZSx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFO1lBQ3hGLElBQUksb0JBQW9CLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ25DLGdFQUFnRTtnQkFDaEUsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLG1DQUFtQyxDQUMvRCxNQUFNLEVBQ04sS0FBSyxFQUNMLFdBQVcsRUFDWCxTQUFTLEVBQ1QsRUFBRSxFQUNGLEtBQUssQ0FDTCxDQUFBO2dCQUNELE9BQU8sSUFBSSx3Q0FBd0MsQ0FDbEQsZUFBZSxFQUNmLFNBQVMsRUFDVCxFQUFFLEVBQ0Ysb0JBQW9CLENBQ3BCLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asb0NBQW9DO2dCQUNwQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsbUNBQW1DLENBQy9ELE1BQU0sRUFDTixLQUFLLEVBQ0wsV0FBVyxFQUNYLFNBQVMsRUFDVCxFQUFFLEVBQ0YsSUFBSSxDQUNKLENBQUE7Z0JBQ0QsT0FBTyxXQUFXLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sV0FBVyxHQUFHLEVBQUUsNEJBQTRCLEVBQUUsSUFBSSxFQUFFLDJCQUEyQixFQUFFLEtBQUssRUFBRSxDQUFBO1FBQzlGLE9BQU8sSUFBSSxtQkFBbUIsd0NBQWdDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRU8sTUFBTSxDQUFDLG1DQUFtQyxDQUNqRCxNQUEyQixFQUMzQixLQUFpQixFQUNqQixXQUFtQixFQUNuQixTQUFvQixFQUNwQixFQUFVLEVBQ1Ysa0JBQTJCLElBQUk7UUFFL0IsTUFBTSxlQUFlLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQTtRQUNqRCxNQUFNLHdCQUF3QixHQUFHLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUN2RixJQUFJLElBQUksR0FBVyxNQUFNLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDM0QsSUFBSSx3QkFBd0IsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3ZELElBQUksSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLHdCQUF3QixHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7UUFDRCxJQUFJLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDRCQUE0QjtJQUNqQyxNQUFNLENBQUMsUUFBUSxDQUNyQixxQkFBd0MsRUFDeEMsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsb0JBQTZCLEVBQzdCLEVBQVU7UUFFVixJQUFJLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDaEYsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMscUJBQXFCLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzNFLENBQUM7UUFDRCxPQUFNO0lBQ1AsQ0FBQztJQUVPLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDckMscUJBQXdDLEVBQ3hDLFVBQXVCLEVBQ3ZCLEVBQVU7UUFFVixNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMvQixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDeEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxLQUFLLENBQzlCLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQ25CLENBQUE7WUFDRCxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxjQUFjLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3BELENBQUM7UUFDRCxPQUFPLElBQUksbUJBQW1CLHdDQUFnQyxRQUFRLEVBQUU7WUFDdkUsNEJBQTRCLEVBQUUsNkJBQTZCLENBQzFELHFCQUFxQix3Q0FFckI7WUFDRCwyQkFBMkIsRUFBRSxLQUFLO1NBQ2xDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw0Q0FBNEM7SUFDakQsTUFBTSxDQUFDLFFBQVEsQ0FDckIsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsb0JBQTZCLEVBQzdCLEVBQVU7UUFFVixJQUFJLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDaEYsNEZBQTRGO1lBQzVGLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQzlCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxJQUFJLGNBQWMsQ0FDakIsSUFBSSxLQUFLLENBQ1IsQ0FBQyxDQUFDLGtCQUFrQixFQUNwQixDQUFDLENBQUMsY0FBYyxFQUNoQixDQUFDLENBQUMsa0JBQWtCLEVBQ3BCLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUNwQixFQUNELEVBQUUsRUFDRixLQUFLLENBQ0wsQ0FDRixDQUFBO1lBQ0QsT0FBTyxJQUFJLG1CQUFtQix3Q0FBZ0MsUUFBUSxFQUFFO2dCQUN2RSw0QkFBNEIsRUFBRSxJQUFJO2dCQUNsQywyQkFBMkIsRUFBRSxLQUFLO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFDRCxPQUFNO0lBQ1AsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdDQUFnQztJQUNyQyxNQUFNLENBQUMsUUFBUSxDQUNyQixNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixFQUFVLEVBQ1YsZ0JBQXlCLEVBQ3pCLGtCQUEyQjtRQUUzQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUN6QixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FDeEQsTUFBTSxFQUNOLEtBQUssRUFDTCxVQUFVLEVBQ1YsRUFBRSxFQUNGLGdCQUFnQixDQUNoQixDQUFBO1lBQ0QsSUFBSSxvQkFBb0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxJQUFJLENBQUMsMkJBQTJCLENBQ3RDLFVBQVUsRUFDVixFQUFFLEVBQ0YsZ0JBQWdCLEVBQ2hCLG9CQUFvQixDQUNwQixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFNO0lBQ1AsQ0FBQztJQUVPLE1BQU0sQ0FBQywyQkFBMkIsQ0FDekMsVUFBdUIsRUFDdkIsRUFBVSxFQUNWLGdCQUF5QixFQUN6QixvQkFBNEI7UUFFNUIsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0IsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksMEJBQTBCLENBQzNDLFNBQVMsRUFDVCxFQUFFLEVBQ0YsQ0FBQyxnQkFBZ0IsRUFDakIsb0JBQW9CLENBQ3BCLENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLG1CQUFtQix3Q0FBZ0MsUUFBUSxFQUFFO1lBQ3ZFLDRCQUE0QixFQUFFLElBQUk7WUFDbEMsMkJBQTJCLEVBQUUsS0FBSztTQUNsQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLHVCQUF1QixDQUNwQyxNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixFQUFVLEVBQ1YsZ0JBQXlCO1FBRXpCLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO2dCQUMxQixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsK0VBQStFO1FBQy9FLGlGQUFpRjtRQUNqRiw4RkFBOEY7UUFDOUYsRUFBRTtRQUNGLHFGQUFxRjtRQUNyRixzRkFBc0Y7UUFDdEYsRUFBRTtRQUNGLE1BQU0sU0FBUyxHQUNkLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNwQixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDaEMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixPQUFPO29CQUNOLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTtvQkFDL0IsWUFBWSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLE1BQU07b0JBQ3pDLFdBQVcsRUFBRSxRQUFRLENBQUMsTUFBTTtpQkFDNUIsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPO29CQUNOLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTtvQkFDL0IsWUFBWSxFQUFFLFFBQVEsQ0FBQyxNQUFNO29CQUM3QixXQUFXLEVBQUUsUUFBUSxDQUFDLE1BQU07aUJBQzVCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCw2RUFBNkU7UUFDN0Usa0ZBQWtGO1FBQ2xGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FDekMsTUFBTSxFQUNOLEtBQUssRUFDTCxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUNoRSxFQUFFLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQUksZUFBMEMsQ0FBQTtRQUM5QyxJQUFJLHFCQUE4QyxDQUFBO1FBRWxELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM3QixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsZUFBZSxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQTtZQUMxQyxxQkFBcUIsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFBO1FBQzNELENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsc0JBQXNCO2dCQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDO2dCQUNuRCxDQUFDLENBQUMsS0FBSyxDQUFBO1lBQ1IsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN2QixlQUFlLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFBO2dCQUM1QyxxQkFBcUIsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFBO1lBQzdELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxlQUFlLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFBO2dCQUM1QyxxQkFBcUIsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFBO1lBQzdELENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxlQUFlLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsZ0dBQWdHO1FBQ2hHLHFDQUFxQztRQUNyQyw4Q0FBOEM7UUFDOUMsb0VBQW9FO1FBQ3BFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEUsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNuRSxJQUFJLHNCQUFzQixHQUFHLElBQUksQ0FBQTtRQUVqQyxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxHQUFHLFFBQVEsQ0FBQTtZQUMxRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2pELE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUVyRCxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7Z0JBQy9DLHNCQUFzQixHQUFHLEtBQUssQ0FBQTtZQUMvQixDQUFDO1lBQ0QsMEhBQTBIO1lBQzFILElBQUksU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDMUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUN4RSxJQUFJLENBQUMsa0JBQWtCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO29CQUNuRSxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztZQUNELGtEQUFrRDtZQUNsRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxHQUFHLElBQUksRUFBRSxLQUFLLEdBQUcsQ0FBQyxJQUFJLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDMUYsTUFBTSxjQUFjLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQTtnQkFDekUsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMzQixNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7b0JBQ3BFLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsdUNBQStCLEVBQUUsQ0FBQzt3QkFDeEUsT0FBTyxJQUFJLENBQUE7b0JBQ1osQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELDRCQUE0QjtnQkFDNUIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNoRCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUMvRCxNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDN0UsSUFDQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUN2RixDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELHNHQUFzRztZQUN0RywyRkFBMkY7WUFDM0YsRUFBRTtZQUNGLHlGQUF5RjtZQUN6RiwrRkFBK0Y7WUFDL0YsNEZBQTRGO1lBQzVGLHdGQUF3RjtZQUN4RixFQUFFO1lBQ0YsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUNwRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0NBQWdDLENBQ3BFLFVBQVUsRUFDVixZQUFZLEVBQ1osZ0JBQWdCLENBQ2hCLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDM0IsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO1lBQzVCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzlFLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxNQUFNLENBQUMsNkJBQTZCLENBQzNDLE1BQTJCLEVBQzNCLElBQXdDO1FBRXhDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekQsdURBQXVEO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3pGLElBQUksTUFBTSxHQUE4QyxJQUFJLENBQUE7UUFDNUQsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxJQUNDLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUk7Z0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFDbkMsQ0FBQztnQkFDRixJQUFJLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzNELE1BQU0sR0FBRyxTQUFTLENBQUE7Z0JBQ25CLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSyxNQUFNLENBQUMsd0JBQXdCLENBQ3RDLE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFNBQXFCLEVBQ3JCLEVBQVU7UUFFVixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNqQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCwwQ0FBMEM7UUFDMUMsSUFBSSxNQUFNLEdBQThDLElBQUksQ0FBQTtRQUM1RCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNuRSxJQUFJLGdCQUFnQixHQUFHLElBQUksQ0FBQTtnQkFDM0IsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDbEMsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FDekMsSUFBSSxLQUFLLENBQ1IsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQzNDLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLENBQ2YsQ0FDRCxDQUFBO29CQUNELElBQUksWUFBWSxHQUFHLEVBQUUsS0FBSyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQzFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQTt3QkFDeEIsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO29CQUN0QixNQUFNLEdBQUcsU0FBUyxDQUFBO2dCQUNuQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxNQUFNLENBQUMscUJBQXFCLENBQUMsTUFBMkIsRUFBRSxTQUFpQjtRQUNsRiwrR0FBK0c7UUFDL0csTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLHVCQUF1QixHQUM1QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN4RSxNQUFNLHNCQUFzQixHQUMzQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUV6RSxNQUFNLHFCQUFxQixHQUFHLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMvRixNQUFNLG9CQUFvQixHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUU5RixPQUFPLENBQUMscUJBQXFCLElBQUksb0JBQW9CLENBQUE7SUFDdEQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLCtCQUErQjtJQUNwQyxNQUFNLENBQUMsUUFBUSxDQUNyQixNQUEyQixFQUMzQixZQUFrQztRQUVsQyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsU0FBUyxLQUFLLFVBQVUsQ0FBQTtRQUN0RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FDaEMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksc0NBQXNDLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQzFGLENBQUE7UUFDRCxPQUFPLElBQUksbUJBQW1CLHdDQUFnQyxRQUFRLEVBQUU7WUFDdkUsNEJBQTRCLEVBQUUsSUFBSTtZQUNsQywyQkFBMkIsRUFBRSxLQUFLO1NBQ2xDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFDL0IsTUFBTSxDQUFDLFFBQVEsQ0FDckIsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsRUFBVSxFQUNWLGtCQUEyQjtRQUUzQixJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDekYsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsT0FBTTtJQUNQLENBQUM7SUFFTyxNQUFNLENBQUMseUJBQXlCLENBQ3ZDLE1BQTJCLEVBQzNCLFVBQXVCLEVBQ3ZCLEVBQVU7UUFFVixNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMvQixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDbEQsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksd0JBQXdCLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMxRSxDQUFDO1FBQ0QsT0FBTyxJQUFJLG1CQUFtQixrQ0FBMEIsUUFBUSxFQUFFO1lBQ2pFLDRCQUE0QixFQUFFLElBQUk7WUFDbEMsMkJBQTJCLEVBQUUsSUFBSTtTQUNqQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sTUFBTSxDQUFDLHdCQUF3QixDQUN0QyxNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixFQUFVO1FBRVYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNwRixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELElBQUksK0JBQStCLEdBQUcsSUFBSSxDQUFBO1lBQzFDLEtBQ0MsSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLGVBQWUsRUFDMUMsVUFBVSxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQ3JDLFVBQVUsRUFBRSxFQUNYLENBQUM7Z0JBQ0YsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDakQsTUFBTSxVQUFVLEdBQUcsVUFBVSxLQUFLLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzNGLE1BQU0sUUFBUSxHQUNiLFVBQVUsS0FBSyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQTtnQkFDbkYsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQzdELElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO29CQUNqQyw4REFBOEQ7b0JBQzlELCtCQUErQixHQUFHLEtBQUssQ0FBQTtvQkFDdkMsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksK0JBQStCLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsSUFDQyx1QkFBdUI7Z0JBQ3ZCLFNBQVMsQ0FBQyxlQUFlLEtBQUssU0FBUyxDQUFDLGFBQWE7Z0JBQ3JELFNBQVMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxTQUFTLEVBQ2hELENBQUM7Z0JBQ0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDNUIsNkRBQTZEO29CQUM3RCxxQ0FBcUM7b0JBQ3JDLE9BQU8sS0FBSyxDQUFBO2dCQUNiLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdDQUFnQztJQUNyQyxNQUFNLENBQUMsUUFBUSxDQUNyQixxQkFBd0MsRUFDeEMsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsRUFBVSxFQUNWLGtCQUEyQjtRQUUzQix5RUFBeUU7UUFDekUsdUZBQXVGO1FBQ3ZGLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsOEJBQThCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzNGLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FDMUMscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixLQUFLLEVBQ0wsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUNiLEVBQUUsQ0FDRixDQUFBO1lBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDUCxPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTTtJQUNQLENBQUM7SUFFTyxNQUFNLENBQUMsOEJBQThCLENBQzVDLE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFVBQXVCO1FBRXZCLElBQ0MsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQ3ZCLEtBQUssQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUM5RSxDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sTUFBTSxDQUFDLDRCQUE0QixDQUMxQyxxQkFBd0MsRUFDeEMsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsU0FBb0IsRUFDcEIsRUFBVTtRQUVWLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ3RFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN4QyxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN6RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDeEUsSUFBSSxjQUFzQyxDQUFBO1FBQzFDLElBQUksQ0FBQztZQUNKLGNBQWMsR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0UsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNyQyxNQUFNLFNBQVMsR0FDZCxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BGLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQ3JELGNBQWMsQ0FBQyxnQkFBZ0IsRUFDL0I7Z0JBQ0MsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUMvQixNQUFNLEVBQUUsU0FBUzthQUNqQixFQUNELEdBQUcsQ0FBQyxtQ0FBbUMsQ0FDdkMsQ0FBQTtZQUNELElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxLQUFLLENBQUMsZUFBZSxLQUFLLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDbkQsaUVBQWlFO29CQUNqRSxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUNELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUM3RCxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDcEUsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUE7Z0JBQ3hFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUMxRCxNQUFNLHVCQUF1QixHQUM1QixLQUFLLENBQUMsK0JBQStCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUE7Z0JBQzlFLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ25GLE1BQU0sUUFBUSxHQUFHLGNBQWMsR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFBO2dCQUM3QyxNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FDOUIsUUFBUSxDQUFDLFVBQVUsRUFDbkIsQ0FBQyxFQUNELFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLENBQ2YsQ0FBQTtnQkFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQzNELE9BQU8sSUFBSSxtQkFBbUIsQ0FDN0Isa0JBQWtCLENBQUMsUUFBUSxFQUFFLHFCQUFxQixDQUFDLEVBQ25ELENBQUMsT0FBTyxDQUFDLEVBQ1Q7b0JBQ0MsNEJBQTRCLEVBQUUsS0FBSztvQkFDbkMsMkJBQTJCLEVBQUUsSUFBSTtpQkFDakMsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyw0QkFBNEI7SUFDakMsTUFBTSxDQUFDLFFBQVEsQ0FDckIsTUFBMkIsRUFDM0IscUJBQXdDLEVBQ3hDLFVBQXVCLEVBQ3ZCLEVBQVUsRUFDVixrQkFBMkI7UUFFM0IsMEJBQTBCO1FBQzFCLE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQTtRQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsTUFBTSxvQkFBb0IsR0FDekIsTUFBTSxDQUFDLFNBQVMsS0FBSyxVQUFVLElBQUksQ0FBQyxrQkFBa0I7Z0JBQ3JELENBQUMsQ0FBQyxzQkFBc0I7Z0JBQ3hCLENBQUMsQ0FBQyxjQUFjLENBQUE7WUFDbEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtRQUM1RCxPQUFPLElBQUksbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRTtZQUNoRCw0QkFBNEIsRUFBRSw2QkFBNkIsQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUM7WUFDMUYsMkJBQTJCLEVBQUUsS0FBSztTQUNsQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sY0FBYztJQUNuQixNQUFNLENBQUMsUUFBUSxDQUNyQixNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixFQUFVLEVBQ1Ysa0JBQTJCO1FBRTNCLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDeEMsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1lBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkQsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0QsQ0FBQztZQUNELE9BQU8sSUFBSSxtQkFBbUIsd0NBQWdDLFFBQVEsRUFBRTtnQkFDdkUsNEJBQTRCLEVBQUUsSUFBSTtnQkFDbEMsMkJBQTJCLEVBQUUsS0FBSzthQUNsQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsT0FBTTtJQUNQLENBQUM7SUFFTyxNQUFNLENBQUMsTUFBTSxDQUNwQixNQUEyQixFQUMzQixLQUFpQixFQUNqQixZQUFxQixFQUNyQixLQUFZO1FBRVosSUFBSSxNQUFNLENBQUMsVUFBVSwwQ0FBa0MsRUFBRSxDQUFDO1lBQ3pELE9BQU8sV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELElBQ0MsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFVBQVUsQ0FBQztZQUMxRSxNQUFNLENBQUMsVUFBVSwwQ0FBa0MsRUFDbEQsQ0FBQztZQUNGLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzVELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDOUYsT0FBTyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQUksR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDekYsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLDRCQUE0QixDQUFDLENBQUE7UUFDOUYsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNQLElBQUksQ0FBQyxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzFDLGtCQUFrQjtnQkFDbEIsT0FBTyxXQUFXLENBQ2pCLEtBQUssRUFDTCxJQUFJLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUNoRSxZQUFZLENBQ1osQ0FBQTtZQUNGLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsWUFBWSxLQUFLLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkQsY0FBYztnQkFDZCxPQUFPLFdBQVcsQ0FDakIsS0FBSyxFQUNMLElBQUksR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQ2hFLFlBQVksQ0FDWixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxZQUFZLEtBQUssWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUMxRCxnQkFBZ0I7Z0JBQ2hCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQy9ELE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDakYsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLGVBQWUsR0FBRyxJQUFJLEdBQUcsWUFBWSxDQUFBO2dCQUM3RCxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixPQUFPLElBQUkscUNBQXFDLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDeEUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sSUFBSSxtQ0FBbUMsQ0FDN0MsS0FBSyxFQUNMLFFBQVEsRUFDUixDQUFDLENBQUMsRUFDRixlQUFlLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQzVDLElBQUksQ0FDSixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLFlBQVksS0FBSyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3BELE1BQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQzlELE9BQU8sV0FBVyxDQUNqQixLQUFLLEVBQ0wsSUFBSSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQ3BFLFlBQVksQ0FDWixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTlGLElBQUksTUFBTSxDQUFDLFVBQVUseUNBQWlDLEVBQUUsQ0FBQztZQUN4RCxNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FDM0IsTUFBTSxDQUFDLFVBQVUsRUFDakIsS0FBSyxFQUNMLEtBQUssRUFDTDtnQkFDQyxhQUFhLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDekIsT0FBTyxhQUFhLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO2dCQUNELFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUN2QixPQUFPLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ25DLENBQUM7Z0JBQ0Qsb0JBQW9CLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDaEMsT0FBTyxNQUFNLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzNDLENBQUM7YUFDRCxFQUNELE1BQU0sQ0FBQyw0QkFBNEIsQ0FDbkMsQ0FBQTtZQUVELElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsdUJBQXVCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFBO2dCQUNwRixNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFBO2dCQUNwQyxNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDaEUsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQzFFLElBQUksa0JBQWtCLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzdCLEtBQUssR0FBRyxLQUFLLENBQUMsY0FBYyxDQUMzQixLQUFLLENBQUMsYUFBYSxFQUNuQixJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQ2pELENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEtBQUssR0FBRyxLQUFLLENBQUMsY0FBYyxDQUMzQixLQUFLLENBQUMsYUFBYSxFQUNuQixLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUMzQyxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxJQUFJLHFDQUFxQyxDQUMvQyxLQUFLLEVBQ0wsSUFBSSxHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQ2pELElBQUksQ0FDSixDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7b0JBQ2QsSUFBSSxZQUFZLElBQUksa0JBQWtCLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7NEJBQzFCLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO3dCQUNuRSxDQUFDO3dCQUNELE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUNoQixnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUM1RSxDQUFDLENBQ0QsQ0FBQTtvQkFDRixDQUFDO29CQUNELE9BQU8sSUFBSSxtQ0FBbUMsQ0FDN0MsS0FBSyxFQUNMLElBQUksR0FBRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUNqRCxDQUFDLEVBQ0QsTUFBTSxFQUNOLElBQUksQ0FDSixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFJLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQ3pGLENBQUM7SUFFTSxNQUFNLENBQUMsZ0JBQWdCLENBQzdCLE1BQTJCLEVBQzNCLEtBQXdCLEVBQ3hCLFVBQThCO1FBRTlCLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxJQUFJLFVBQVUsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUE7WUFDakQsSUFBSSxVQUFVLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLHFDQUFxQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3JGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxVQUFVLEVBQUUsQ0FBQTtnQkFDWixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBRWpELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUN4QixNQUFNLEVBQ04sS0FBSyxFQUNMLEtBQUssRUFDTCxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FDakQsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxlQUFlLENBQzVCLE1BQTJCLEVBQzNCLEtBQXdCLEVBQ3hCLFVBQThCO1FBRTlCLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDM0MsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLFVBQVUsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUE7WUFDbkQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2pELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUN4QixNQUFNLEVBQ04sS0FBSyxFQUNMLEtBQUssRUFDTCxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FDakQsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRU0sTUFBTSxDQUFDLGVBQWUsQ0FDNUIsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUI7UUFFdkIsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFDbkIsTUFBTSxDQUFDLFFBQVEsQ0FDckIsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsVUFBdUIsRUFDdkIsSUFBWSxFQUNaLGNBQXVCLEVBQ3ZCLGVBQXlCO1FBRXpCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUN0RCxNQUFNLEVBQ04sVUFBVSxFQUNWLElBQUksRUFDSixjQUFjLEVBQ2QsZUFBZSxDQUNmLENBQUE7UUFDRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsVUFBVSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7WUFDNUQsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUMzRSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDMUUsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMseUJBQXlCLENBQ3ZDLE1BQTJCLEVBQzNCLFVBQXVCLEVBQ3ZCLElBQVksRUFDWixjQUF1QixFQUN2QixlQUF5QjtRQUV6QixJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLGVBQWUsSUFBSSxlQUFlLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyRSxPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsZ0JBQWdCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUMsZ0ZBQWdGO1lBQ2hGLGdDQUFnQztZQUNoQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsK0JBQXNCLEVBQUUsQ0FBQztnQkFDNUQsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUMsQ0FBQztZQUNELGdDQUFnQztZQUNoQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMscUNBQTRCLEVBQUUsQ0FBQztnQkFDbEUsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUMsQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdEMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDL0IsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsVUFBdUIsRUFDdkIsSUFBYztRQUVkLE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQTtRQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFBO1lBQ3ZGLE1BQU0sb0JBQW9CLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUE7WUFDNUYsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFDRCxPQUFPLElBQUksbUJBQW1CLGtDQUEwQixRQUFRLEVBQUU7WUFDakUsNEJBQTRCLEVBQUUsSUFBSTtZQUNsQywyQkFBMkIsRUFBRSxJQUFJO1NBQ2pDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxNQUFNLENBQUMsWUFBWSxDQUMxQixNQUEyQixFQUMzQixLQUF5QixFQUN6QixVQUF1QixFQUN2QixJQUFZLEVBQ1osY0FBdUI7UUFFdkIsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0IsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBQ3hDLElBQUksY0FBYyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQzVDLGNBQWMsR0FBRyxLQUFLLENBQUE7WUFDdkIsQ0FBQztZQUNELElBQUksY0FBYyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUQsY0FBYyxHQUFHLEtBQUssQ0FBQTtZQUN2QixDQUFDO1lBQ0QsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsNkNBQTZDO2dCQUM3QyxNQUFNLGFBQWEsR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUMvRSxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxvQ0FBb0MsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxTQUFTLEtBQUssVUFBVSxDQUFBO2dCQUN2RixNQUFNLG9CQUFvQixHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFBO2dCQUM1RixRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDeEQsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLElBQUksbUJBQW1CLGtDQUEwQixRQUFRLEVBQUU7WUFDakUsNEJBQTRCLEVBQUUsSUFBSTtZQUNsQywyQkFBMkIsRUFBRSxJQUFJO1NBQ2pDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxvQkFBb0I7SUFDekIsTUFBTSxDQUFDLFFBQVEsQ0FDckIscUJBQXdDLEVBQ3hDLE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFVBQXVCLEVBQ3ZCLElBQVksRUFDWixrQkFBMEIsRUFDMUIsa0JBQTBCLEVBQzFCLGFBQXFCO1FBRXJCLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUM3QyxJQUFJLENBQUMsZ0JBQWdCLENBQ3BCLEtBQUssRUFDTCxTQUFTLEVBQ1QsSUFBSSxFQUNKLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsYUFBYSxDQUNiLENBQ0QsQ0FBQTtRQUNELE9BQU8sSUFBSSxtQkFBbUIsd0NBQWdDLFFBQVEsRUFBRTtZQUN2RSw0QkFBNEIsRUFBRSw2QkFBNkIsQ0FDMUQscUJBQXFCLHdDQUVyQjtZQUNELDJCQUEyQixFQUFFLEtBQUs7U0FDbEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDOUIsS0FBaUIsRUFDakIsU0FBb0IsRUFDcEIsSUFBWSxFQUNaLGtCQUEwQixFQUMxQixrQkFBMEIsRUFDMUIsYUFBcUI7UUFFckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzFCLDZEQUE2RDtZQUM3RCxrRUFBa0U7WUFDbEUsd0JBQXdCO1lBQ3hCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLGtCQUFrQixDQUFDLENBQUE7UUFDaEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDekIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFDdEMsR0FBRyxDQUFDLE1BQU0sR0FBRyxrQkFBa0IsQ0FDL0IsQ0FBQTtRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0UsT0FBTyxJQUFJLG1DQUFtQyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO0lBQzlFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQ0FBZ0M7SUFDckMsTUFBTSxDQUFDLFFBQVEsQ0FDckIscUJBQXdDLEVBQ3hDLFVBQXVCLEVBQ3ZCLEdBQVc7UUFFWCxNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzdELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFO1lBQ2hELDRCQUE0QixFQUFFLDZCQUE2QixDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQztZQUMxRiwyQkFBMkIsRUFBRSxLQUFLO1NBQ2xDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxZQUFZO0lBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQ3hCLE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFVBQXVCO1FBRXZCLE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQTtRQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9CLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNoRSxJQUNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO29CQUN0QixLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsRUFDOUQsQ0FBQztvQkFDRixJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUE7b0JBQ2xGLFVBQVUsR0FBRyxVQUFVLElBQUksSUFBSSxDQUFBO29CQUMvQixNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtvQkFDaEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO3dCQUM1QyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxjQUFjLENBQy9CLElBQUksS0FBSyxDQUNSLFNBQVMsQ0FBQyxlQUFlLEVBQ3pCLENBQUMsRUFDRCxTQUFTLENBQUMsZUFBZSxFQUN6QixRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDbkIsRUFDRCxnQkFBZ0IsRUFDaEIsSUFBSSxDQUNKLENBQUE7d0JBQ0QsU0FBUTtvQkFDVCxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxTQUFTLENBQUMsZUFBZSxLQUFLLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDM0QsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtvQkFDdkUsSUFBSSxTQUFTLENBQUMsV0FBVyxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLGFBQWEsRUFBRSxDQUFDO3dCQUMxRSw4REFBOEQ7d0JBQzlELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7d0JBQzVFLFNBQVE7b0JBQ1QsQ0FBQztnQkFDRixDQUFDO2dCQUNELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FDN0IsU0FBUyxFQUNUO29CQUNDLFNBQVMsRUFBRSxLQUFLO29CQUNoQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87b0JBQ3ZCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtvQkFDN0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZO29CQUNqQyxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7b0JBQy9CLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtpQkFDN0IsRUFDRCxNQUFNLENBQUMsNEJBQTRCLENBQ25DLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxNQUFNLENBQUMsa0JBQWtCLENBQ2hDLE1BQTJCLEVBQzNCLEtBQWlCLEVBQ2pCLFVBQWtCO1FBRWxCLElBQUksTUFBTSxHQUFzQyxJQUFJLENBQUE7UUFDcEQsSUFBSSxXQUFXLEdBQVcsRUFBRSxDQUFBO1FBQzVCLE1BQU0sb0JBQW9CLEdBQUcsdUJBQXVCLENBQ25ELE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLEtBQUssRUFDTCxVQUFVLEVBQ1YsS0FBSyxFQUNMLE1BQU0sQ0FBQyw0QkFBNEIsQ0FDbkMsQ0FBQTtRQUNELElBQUksb0JBQW9CLEVBQUUsQ0FBQztZQUMxQixNQUFNLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxDQUFBO1lBQ3BDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxXQUFXLENBQUE7UUFDL0MsQ0FBQzthQUFNLElBQUksVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksY0FBc0IsQ0FBQTtZQUMxQixLQUFLLGNBQWMsR0FBRyxVQUFVLEdBQUcsQ0FBQyxFQUFFLGNBQWMsSUFBSSxDQUFDLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQztnQkFDN0UsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDckQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2pFLElBQUksZ0JBQWdCLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzNCLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLGNBQWMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsc0NBQXNDO2dCQUN0QyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFDRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxjQUFjLENBQ3pDLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLEtBQUssRUFDTCxJQUFJLEtBQUssQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxTQUFTLENBQUMsRUFDL0QsTUFBTSxDQUFDLDRCQUE0QixDQUNuQyxDQUFBO1lBQ0QsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixXQUFXLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxHQUFHLG1CQUFtQixDQUFDLFVBQVUsQ0FBQTtZQUMvRSxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLE1BQU0sS0FBSyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BDLFdBQVcsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFDRCxJQUFJLE1BQU0sS0FBSyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3JDLFdBQVcsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ2pELENBQUM7WUFDRCxXQUFXLEdBQUcsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZELENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLE1BQU0sQ0FBQyx3QkFBd0IsQ0FDdEMsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsU0FBb0IsRUFDcEIscUJBQThCO1FBRTlCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUM3QyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN6QixNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDL0UsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQTtZQUNwQyxNQUFNLFNBQVMsR0FBRyxVQUFVLEdBQUcsQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLENBQUMsQ0FBQTtZQUNyRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BDLFFBQVEsSUFBSSxHQUFHLENBQUE7WUFDaEIsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxHQUFHLElBQUksQ0FBQTtRQUNoQixDQUFDO1FBQ0QsT0FBTyxJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixDQUFDLENBQUE7SUFDdEUsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDhCQUErQixTQUFRLG1DQUFtQztJQU10RixZQUNDLFNBQW9CLEVBQ3BCLElBQVksRUFDWixxQkFBNkIsRUFDN0IsaUJBQXlCLEVBQ3pCLGFBQXFCLEVBQ3JCLGNBQXNCO1FBRXRCLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDaEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUE7UUFDbkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUE7UUFDckMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtRQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQTtJQUMzQixDQUFDO0lBRVMsNEJBQTRCLENBQ3JDLEtBQWlCLEVBQ2pCLEtBQVksRUFDWixNQUFnQztRQUVoQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxLQUFLLENBQ25DLEtBQUssQ0FBQyxlQUFlLEVBQ3JCLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQzdDLEtBQUssQ0FBQyxhQUFhLEVBQ25CLEtBQUssQ0FBQyxTQUFTLENBQ2YsQ0FBQTtRQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxLQUFLLENBQzlCLEtBQUssQ0FBQyxlQUFlLEVBQ3JCLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQzFFLEtBQUssQ0FBQyxhQUFhLEVBQ25CLEtBQUssQ0FBQyxTQUFTLENBQ2YsQ0FBQTtRQUNELE9BQU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLDBCQUEyQixTQUFRLDhCQUE4QjtJQUN0RSxZQUNDLFNBQW9CLEVBQ3BCLGFBQXFCLEVBQ3JCLG1CQUE0QixFQUM1QixjQUFzQjtRQUV0QixNQUFNLElBQUksR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGNBQWMsQ0FBQTtRQUN4RSxNQUFNLHFCQUFxQixHQUFHLENBQUMsQ0FBQTtRQUMvQixNQUFNLGlCQUFpQixHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQTtRQUNoRCxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDaEcsQ0FBQztJQUVlLGtCQUFrQixDQUNqQyxLQUFpQixFQUNqQixNQUFnQztRQUVoQyxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBQy9ELE1BQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUM1QyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDRDtBQUVELE1BQU0sd0NBQXlDLFNBQVEsOEJBQThCO0lBSXBGLFlBQ0MsbUJBQW1ELEVBQ25ELFNBQW9CLEVBQ3BCLGFBQXFCLEVBQ3JCLGNBQXNCO1FBRXRCLE1BQU0sSUFBSSxHQUFHLGFBQWEsR0FBRyxjQUFjLENBQUE7UUFDM0MsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUE7UUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFBO1FBQzlDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUMvRixJQUFJLENBQUMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUE7UUFDL0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQTtJQUNuRCxDQUFDO0lBRWUsaUJBQWlCLENBQUMsS0FBaUIsRUFBRSxPQUE4QjtRQUNsRixPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pGLENBQUM7SUFFZSxrQkFBa0IsQ0FDakMsS0FBaUIsRUFDakIsTUFBZ0M7UUFFaEMsTUFBTSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsd0JBQXdCLEVBQUUsQ0FBQTtRQUMvRCxJQUFJLHFCQUFxQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDN0MsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0QyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQy9ELENBQUM7Q0FDRDtBQUVELFNBQVMsa0JBQWtCLENBQzFCLFNBQWlCLEVBQ2pCLHVCQUEwQztJQUUxQyxJQUFJLFNBQVMsS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUN2QixPQUFPLHVCQUF1QiwrQ0FBdUM7WUFDcEUsdUJBQXVCLHFEQUE2QztZQUNwRSxDQUFDO1lBQ0QsQ0FBQywyQ0FBbUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsNkNBQW9DO0FBQ3JDLENBQUM7QUFFRCxTQUFTLDZCQUE2QixDQUNyQyx1QkFBMEMsRUFDMUMsZUFBa0M7SUFFbEMsSUFBSSxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUN2RixxREFBcUQ7UUFDckQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsSUFBSSx1QkFBdUIsK0NBQXVDLEVBQUUsQ0FBQztRQUNwRSx5QkFBeUI7UUFDekIsdUJBQXVCO1FBQ3ZCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELHFEQUFxRDtJQUNyRCxPQUFPLHNCQUFzQixDQUFDLHVCQUF1QixDQUFDLEtBQUssc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQUE7QUFDbkcsQ0FBQztBQUVELFNBQVMsc0JBQXNCLENBQUMsSUFBdUI7SUFDdEQsT0FBTyxJQUFJLHFEQUE2QztRQUN2RCxJQUFJLCtDQUF1QztRQUMzQyxDQUFDLENBQUMsT0FBTztRQUNULENBQUMsQ0FBQyxJQUFJLENBQUE7QUFDUixDQUFDO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUF1QjtJQUNqRCxPQUFPLENBQ04sSUFBSSwwQ0FBa0M7UUFDdEMsSUFBSSwrQ0FBdUM7UUFDM0MsSUFBSSxxREFBNkMsQ0FDakQsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUM3QixNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixvQkFBNkIsRUFDN0IsRUFBVTtJQUVWLElBQUksTUFBTSxDQUFDLG1CQUFtQixLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQzVDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7UUFDdEUsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDMUIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzFELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMzRCxJQUFJLGNBQWMsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCw0Q0FBNEM7UUFDNUMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sZUFBZSxHQUNwQixRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQWMsQ0FBQTtRQUMvRSxJQUFJLGVBQWUsZ0NBQXVCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDekQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QseURBQXlEO1FBQ3pELElBQUksTUFBTSxDQUFDLG1CQUFtQixLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzNDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQTtZQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbkUsTUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDbkQsSUFDQyxRQUFRLENBQUMsVUFBVSxLQUFLLG1CQUFtQixDQUFDLGVBQWU7b0JBQzNELFFBQVEsQ0FBQyxNQUFNLEtBQUssbUJBQW1CLENBQUMsV0FBVyxFQUNsRCxDQUFDO29CQUNGLEtBQUssR0FBRyxJQUFJLENBQUE7b0JBQ1osTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLEtBQVksRUFBRSxJQUFZLEVBQUUsWUFBcUI7SUFDckUsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixPQUFPLElBQUkscUNBQXFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNwRSxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sSUFBSSxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxXQUFXLENBQzFCLE1BQTJCLEVBQzNCLFdBQW1CLEVBQ25CLEtBQWM7SUFFZCxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQTtJQUNsQixPQUFPLFlBQVksQ0FBQyxXQUFXLENBQzlCLFdBQVcsRUFDWCxXQUFXLENBQUMsTUFBTSxHQUFHLEtBQUssRUFDMUIsTUFBTSxDQUFDLE9BQU8sRUFDZCxNQUFNLENBQUMsVUFBVSxFQUNqQixNQUFNLENBQUMsWUFBWSxDQUNuQixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxhQUFhLENBQzVCLE1BQTJCLEVBQzNCLFdBQW1CLEVBQ25CLEtBQWM7SUFFZCxLQUFLLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQTtJQUNsQixPQUFPLFlBQVksQ0FBQyxhQUFhLENBQ2hDLFdBQVcsRUFDWCxXQUFXLENBQUMsTUFBTSxHQUFHLEtBQUssRUFDMUIsTUFBTSxDQUFDLE9BQU8sRUFDZCxNQUFNLENBQUMsVUFBVSxFQUNqQixNQUFNLENBQUMsWUFBWSxDQUNuQixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxNQUEyQixFQUFFLEVBQVU7SUFDekUsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNqQixPQUFPLE1BQU0sQ0FBQyxZQUFZLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssaUJBQWlCLENBQUE7SUFDckYsQ0FBQztTQUFNLENBQUM7UUFDUCx5QkFBeUI7UUFDekIsT0FBTyxNQUFNLENBQUMsWUFBWSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsWUFBWSxLQUFLLGlCQUFpQixDQUFBO0lBQ3ZGLENBQUM7QUFDRixDQUFDIn0=