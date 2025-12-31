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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVHlwZUVkaXRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yVHlwZUVkaXRPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUNOLGNBQWMsRUFDZCxtQ0FBbUMsRUFDbkMscUNBQXFDLEVBQ3JDLG9DQUFvQyxFQUNwQyxzQkFBc0IsRUFDdEIsc0NBQXNDLEdBQ3RDLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixtQkFBbUIsRUFHbkIsT0FBTyxHQUNQLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFzQix1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFHOUMsT0FBTyxFQUVOLFlBQVksR0FFWixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBR3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2pFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsaUJBQWlCLEVBQ2pCLHVCQUF1QixHQUN2QixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFB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