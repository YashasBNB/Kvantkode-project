/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ShiftCommand } from '../commands/shiftCommand.js';
import { CompositionSurroundSelectionCommand } from '../commands/surroundSelectionCommand.js';
import { EditOperationResult, isQuote, } from '../cursorCommon.js';
import { AutoClosingOpenCharTypeOperation, AutoClosingOvertypeOperation, AutoClosingOvertypeWithInterceptorsOperation, AutoIndentOperation, CompositionOperation, CompositionEndOvertypeOperation, EnterOperation, InterceptorElectricCharOperation, PasteOperation, shiftIndent, shouldSurroundChar, SimpleCharacterTypeOperation, SurroundSelectionOperation, TabOperation, TypeWithoutInterceptorsOperation, unshiftIndent, } from './cursorTypeEditOperations.js';
export class TypeOperations {
    static indent(config, model, selections) {
        if (model === null || selections === null) {
            return [];
        }
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new ShiftCommand(selections[i], {
                isUnshift: false,
                tabSize: config.tabSize,
                indentSize: config.indentSize,
                insertSpaces: config.insertSpaces,
                useTabStops: config.useTabStops,
                autoIndent: config.autoIndent,
            }, config.languageConfigurationService);
        }
        return commands;
    }
    static outdent(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            commands[i] = new ShiftCommand(selections[i], {
                isUnshift: true,
                tabSize: config.tabSize,
                indentSize: config.indentSize,
                insertSpaces: config.insertSpaces,
                useTabStops: config.useTabStops,
                autoIndent: config.autoIndent,
            }, config.languageConfigurationService);
        }
        return commands;
    }
    static shiftIndent(config, indentation, count) {
        return shiftIndent(config, indentation, count);
    }
    static unshiftIndent(config, indentation, count) {
        return unshiftIndent(config, indentation, count);
    }
    static paste(config, model, selections, text, pasteOnNewLine, multicursorText) {
        return PasteOperation.getEdits(config, model, selections, text, pasteOnNewLine, multicursorText);
    }
    static tab(config, model, selections) {
        return TabOperation.getCommands(config, model, selections);
    }
    static compositionType(prevEditOperationType, config, model, selections, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        return CompositionOperation.getEdits(prevEditOperationType, config, model, selections, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
    }
    /**
     * This is very similar with typing, but the character is already in the text buffer!
     */
    static compositionEndWithInterceptors(prevEditOperationType, config, model, compositions, selections, autoClosedCharacters) {
        if (!compositions) {
            // could not deduce what the composition did
            return null;
        }
        let insertedText = null;
        for (const composition of compositions) {
            if (insertedText === null) {
                insertedText = composition.insertedText;
            }
            else if (insertedText !== composition.insertedText) {
                // not all selections agree on what was typed
                return null;
            }
        }
        if (!insertedText || insertedText.length !== 1) {
            // we're only interested in the case where a single character was inserted
            return CompositionEndOvertypeOperation.getEdits(config, compositions);
        }
        const ch = insertedText;
        let hasDeletion = false;
        for (const composition of compositions) {
            if (composition.deletedText.length !== 0) {
                hasDeletion = true;
                break;
            }
        }
        if (hasDeletion) {
            // Check if this could have been a surround selection
            if (!shouldSurroundChar(config, ch) || !config.surroundingPairs.hasOwnProperty(ch)) {
                return null;
            }
            const isTypingAQuoteCharacter = isQuote(ch);
            for (const composition of compositions) {
                if (composition.deletedSelectionStart !== 0 ||
                    composition.deletedSelectionEnd !== composition.deletedText.length) {
                    // more text was deleted than was selected, so this could not have been a surround selection
                    return null;
                }
                if (/^[ \t]+$/.test(composition.deletedText)) {
                    // deleted text was only whitespace
                    return null;
                }
                if (isTypingAQuoteCharacter && isQuote(composition.deletedText)) {
                    // deleted text was a quote
                    return null;
                }
            }
            const positions = [];
            for (const selection of selections) {
                if (!selection.isEmpty()) {
                    return null;
                }
                positions.push(selection.getPosition());
            }
            if (positions.length !== compositions.length) {
                return null;
            }
            const commands = [];
            for (let i = 0, len = positions.length; i < len; i++) {
                commands.push(new CompositionSurroundSelectionCommand(positions[i], compositions[i].deletedText, config.surroundingPairs[ch]));
            }
            return new EditOperationResult(4 /* EditOperationType.TypingOther */, commands, {
                shouldPushStackElementBefore: true,
                shouldPushStackElementAfter: false,
            });
        }
        const autoClosingOvertypeEdits = AutoClosingOvertypeWithInterceptorsOperation.getEdits(config, model, selections, autoClosedCharacters, ch);
        if (autoClosingOvertypeEdits !== undefined) {
            return autoClosingOvertypeEdits;
        }
        const autoClosingOpenCharEdits = AutoClosingOpenCharTypeOperation.getEdits(config, model, selections, ch, true, false);
        if (autoClosingOpenCharEdits !== undefined) {
            return autoClosingOpenCharEdits;
        }
        return CompositionEndOvertypeOperation.getEdits(config, compositions);
    }
    static typeWithInterceptors(isDoingComposition, prevEditOperationType, config, model, selections, autoClosedCharacters, ch) {
        const enterEdits = EnterOperation.getEdits(config, model, selections, ch, isDoingComposition);
        if (enterEdits !== undefined) {
            return enterEdits;
        }
        const autoIndentEdits = AutoIndentOperation.getEdits(config, model, selections, ch, isDoingComposition);
        if (autoIndentEdits !== undefined) {
            return autoIndentEdits;
        }
        const autoClosingOverTypeEdits = AutoClosingOvertypeOperation.getEdits(prevEditOperationType, config, model, selections, autoClosedCharacters, ch);
        if (autoClosingOverTypeEdits !== undefined) {
            return autoClosingOverTypeEdits;
        }
        const autoClosingOpenCharEdits = AutoClosingOpenCharTypeOperation.getEdits(config, model, selections, ch, false, isDoingComposition);
        if (autoClosingOpenCharEdits !== undefined) {
            return autoClosingOpenCharEdits;
        }
        const surroundSelectionEdits = SurroundSelectionOperation.getEdits(config, model, selections, ch, isDoingComposition);
        if (surroundSelectionEdits !== undefined) {
            return surroundSelectionEdits;
        }
        const interceptorElectricCharOperation = InterceptorElectricCharOperation.getEdits(prevEditOperationType, config, model, selections, ch, isDoingComposition);
        if (interceptorElectricCharOperation !== undefined) {
            return interceptorElectricCharOperation;
        }
        return SimpleCharacterTypeOperation.getEdits(config, prevEditOperationType, selections, ch, isDoingComposition);
    }
    static typeWithoutInterceptors(prevEditOperationType, config, model, selections, str) {
        return TypeWithoutInterceptorsOperation.getEdits(prevEditOperationType, selections, str);
    }
}
export class CompositionOutcome {
    constructor(deletedText, deletedSelectionStart, deletedSelectionEnd, insertedText, insertedSelectionStart, insertedSelectionEnd, insertedTextRange) {
        this.deletedText = deletedText;
        this.deletedSelectionStart = deletedSelectionStart;
        this.deletedSelectionEnd = deletedSelectionEnd;
        this.insertedText = insertedText;
        this.insertedSelectionStart = insertedSelectionStart;
        this.insertedSelectionEnd = insertedSelectionEnd;
        this.insertedTextRange = insertedTextRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVHlwZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JUeXBlT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0YsT0FBTyxFQUVOLG1CQUFtQixFQUduQixPQUFPLEdBQ1AsTUFBTSxvQkFBb0IsQ0FBQTtBQU0zQixPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLDRCQUE0QixFQUM1Qiw0Q0FBNEMsRUFDNUMsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQiwrQkFBK0IsRUFDL0IsY0FBYyxFQUNkLGdDQUFnQyxFQUNoQyxjQUFjLEVBQ2QsV0FBVyxFQUNYLGtCQUFrQixFQUNsQiw0QkFBNEIsRUFDNUIsMEJBQTBCLEVBQzFCLFlBQVksRUFDWixnQ0FBZ0MsRUFDaEMsYUFBYSxHQUNiLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsTUFBTSxPQUFPLGNBQWM7SUFDbkIsTUFBTSxDQUFDLE1BQU0sQ0FDbkIsTUFBMkIsRUFDM0IsS0FBZ0MsRUFDaEMsVUFBOEI7UUFFOUIsSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxDQUFDLENB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