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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVHlwZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvclR5cGVPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RixPQUFPLEVBRU4sbUJBQW1CLEVBR25CLE9BQU8sR0FDUCxNQUFNLG9CQUFvQixDQUFBO0FBTTNCLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsNEJBQTRCLEVBQzVCLDRDQUE0QyxFQUM1QyxtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLCtCQUErQixFQUMvQixjQUFjLEVBQ2QsZ0NBQWdDLEVBQ2hDLGNBQWMsRUFDZCxXQUFXLEVBQ1gsa0JBQWtCLEVBQ2xCLDRCQUE0QixFQUM1QiwwQkFBMEIsRUFDMUIsWUFBWSxFQUNaLGdDQUFnQyxFQUNoQyxhQUFhLEdBQ2IsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxNQUFNLE9BQU8sY0FBYztJQUNuQixNQUFNLENBQUMsTUFBTSxDQUNuQixNQUEyQixFQUMzQixLQUFnQyxFQUNoQyxVQUE4QjtRQUU5QixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksVUFBVSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzNDLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQTtRQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksWUFBWSxDQUM3QixVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQ2I7Z0JBQ0MsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdkIsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO2dCQUM3QixZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7Z0JBQ2pDLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztnQkFDL0IsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO2FBQzdCLEVBQ0QsTUFBTSxDQUFDLDRCQUE0QixDQUNuQyxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsT0FBTyxDQUNwQixNQUEyQixFQUMzQixLQUF5QixFQUN6QixVQUF1QjtRQUV2QixNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7UUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLFlBQVksQ0FDN0IsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUNiO2dCQUNDLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdkIsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO2dCQUM3QixZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7Z0JBQ2pDLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztnQkFDL0IsVUFBVSxFQUFFLE1BQU0sQ0FBQyxVQUFVO2FBQzdCLEVBQ0QsTUFBTSxDQUFDLDRCQUE0QixDQUNuQyxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTSxNQUFNLENBQUMsV0FBVyxDQUN4QixNQUEyQixFQUMzQixXQUFtQixFQUNuQixLQUFjO1FBRWQsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRU0sTUFBTSxDQUFDLGFBQWEsQ0FDMUIsTUFBMkIsRUFDM0IsV0FBbUIsRUFDbkIsS0FBYztRQUVkLE9BQU8sYUFBYSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFLLENBQ2xCLE1BQTJCLEVBQzNCLEtBQXlCLEVBQ3pCLFVBQXVCLEVBQ3ZCLElBQVksRUFDWixjQUF1QixFQUN2QixlQUF5QjtRQUV6QixPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0lBRU0sTUFBTSxDQUFDLEdBQUcsQ0FDaEIsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUI7UUFFdkIsT0FBTyxZQUFZLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxlQUFlLENBQzVCLHFCQUF3QyxFQUN4QyxNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixJQUFZLEVBQ1osa0JBQTBCLEVBQzFCLGtCQUEwQixFQUMxQixhQUFxQjtRQUVyQixPQUFPLG9CQUFvQixDQUFDLFFBQVEsQ0FDbkMscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixLQUFLLEVBQ0wsVUFBVSxFQUNWLElBQUksRUFDSixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLGFBQWEsQ0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLDhCQUE4QixDQUMzQyxxQkFBd0MsRUFDeEMsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsWUFBeUMsRUFDekMsVUFBdUIsRUFDdkIsb0JBQTZCO1FBRTdCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQiw0Q0FBNEM7WUFDNUMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsSUFBSSxZQUFZLEdBQWtCLElBQUksQ0FBQTtRQUN0QyxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3hDLElBQUksWUFBWSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMzQixZQUFZLEdBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQTtZQUN4QyxDQUFDO2lCQUFNLElBQUksWUFBWSxLQUFLLFdBQVcsQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdEQsNkNBQTZDO2dCQUM3QyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hELDBFQUEwRTtZQUMxRSxPQUFPLCtCQUErQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUVELE1BQU0sRUFBRSxHQUFHLFlBQVksQ0FBQTtRQUV2QixJQUFJLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDdkIsS0FBSyxNQUFNLFdBQVcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUN4QyxJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMxQyxXQUFXLEdBQUcsSUFBSSxDQUFBO2dCQUNsQixNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLHFEQUFxRDtZQUVyRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUNwRixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxNQUFNLHVCQUF1QixHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUUzQyxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUN4QyxJQUNDLFdBQVcsQ0FBQyxxQkFBcUIsS0FBSyxDQUFDO29CQUN2QyxXQUFXLENBQUMsbUJBQW1CLEtBQUssV0FBVyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQ2pFLENBQUM7b0JBQ0YsNEZBQTRGO29CQUM1RixPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUNELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDOUMsbUNBQW1DO29CQUNuQyxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUNELElBQUksdUJBQXVCLElBQUksT0FBTyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNqRSwyQkFBMkI7b0JBQzNCLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQWUsRUFBRSxDQUFBO1lBQ2hDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztvQkFDMUIsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztnQkFDRCxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFBO1lBQ3hDLENBQUM7WUFFRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM5QyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUE7WUFDL0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN0RCxRQUFRLENBQUMsSUFBSSxDQUNaLElBQUksbUNBQW1DLENBQ3RDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFDWixZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUMzQixNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQzNCLENBQ0QsQ0FBQTtZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksbUJBQW1CLHdDQUFnQyxRQUFRLEVBQUU7Z0JBQ3ZFLDRCQUE0QixFQUFFLElBQUk7Z0JBQ2xDLDJCQUEyQixFQUFFLEtBQUs7YUFDbEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sd0JBQXdCLEdBQUcsNENBQTRDLENBQUMsUUFBUSxDQUNyRixNQUFNLEVBQ04sS0FBSyxFQUNMLFVBQVUsRUFDVixvQkFBb0IsRUFDcEIsRUFBRSxDQUNGLENBQUE7UUFDRCxJQUFJLHdCQUF3QixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sd0JBQXdCLENBQUE7UUFDaEMsQ0FBQztRQUVELE1BQU0sd0JBQXdCLEdBQUcsZ0NBQWdDLENBQUMsUUFBUSxDQUN6RSxNQUFNLEVBQ04sS0FBSyxFQUNMLFVBQVUsRUFDVixFQUFFLEVBQ0YsSUFBSSxFQUNKLEtBQUssQ0FDTCxDQUFBO1FBQ0QsSUFBSSx3QkFBd0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxPQUFPLHdCQUF3QixDQUFBO1FBQ2hDLENBQUM7UUFFRCxPQUFPLCtCQUErQixDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDdEUsQ0FBQztJQUVNLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDakMsa0JBQTJCLEVBQzNCLHFCQUF3QyxFQUN4QyxNQUEyQixFQUMzQixLQUFpQixFQUNqQixVQUF1QixFQUN2QixvQkFBNkIsRUFDN0IsRUFBVTtRQUVWLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDN0YsSUFBSSxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDOUIsT0FBTyxVQUFVLENBQUE7UUFDbEIsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLG1CQUFtQixDQUFDLFFBQVEsQ0FDbkQsTUFBTSxFQUNOLEtBQUssRUFDTCxVQUFVLEVBQ1YsRUFBRSxFQUNGLGtCQUFrQixDQUNsQixDQUFBO1FBQ0QsSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTyxlQUFlLENBQUE7UUFDdkIsQ0FBQztRQUVELE1BQU0sd0JBQXdCLEdBQUcsNEJBQTRCLENBQUMsUUFBUSxDQUNyRSxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLEtBQUssRUFDTCxVQUFVLEVBQ1Ysb0JBQW9CLEVBQ3BCLEVBQUUsQ0FDRixDQUFBO1FBQ0QsSUFBSSx3QkFBd0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxPQUFPLHdCQUF3QixDQUFBO1FBQ2hDLENBQUM7UUFFRCxNQUFNLHdCQUF3QixHQUFHLGdDQUFnQyxDQUFDLFFBQVEsQ0FDekUsTUFBTSxFQUNOLEtBQUssRUFDTCxVQUFVLEVBQ1YsRUFBRSxFQUNGLEtBQUssRUFDTCxrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELElBQUksd0JBQXdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDNUMsT0FBTyx3QkFBd0IsQ0FBQTtRQUNoQyxDQUFDO1FBRUQsTUFBTSxzQkFBc0IsR0FBRywwQkFBMEIsQ0FBQyxRQUFRLENBQ2pFLE1BQU0sRUFDTixLQUFLLEVBQ0wsVUFBVSxFQUNWLEVBQUUsRUFDRixrQkFBa0IsQ0FDbEIsQ0FBQTtRQUNELElBQUksc0JBQXNCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDMUMsT0FBTyxzQkFBc0IsQ0FBQTtRQUM5QixDQUFDO1FBRUQsTUFBTSxnQ0FBZ0MsR0FBRyxnQ0FBZ0MsQ0FBQyxRQUFRLENBQ2pGLHFCQUFxQixFQUNyQixNQUFNLEVBQ04sS0FBSyxFQUNMLFVBQVUsRUFDVixFQUFFLEVBQ0Ysa0JBQWtCLENBQ2xCLENBQUE7UUFDRCxJQUFJLGdDQUFnQyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BELE9BQU8sZ0NBQWdDLENBQUE7UUFDeEMsQ0FBQztRQUVELE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUMzQyxNQUFNLEVBQ04scUJBQXFCLEVBQ3JCLFVBQVUsRUFDVixFQUFFLEVBQ0Ysa0JBQWtCLENBQ2xCLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLHVCQUF1QixDQUNwQyxxQkFBd0MsRUFDeEMsTUFBMkIsRUFDM0IsS0FBaUIsRUFDakIsVUFBdUIsRUFDdkIsR0FBVztRQUVYLE9BQU8sZ0NBQWdDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN6RixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLFlBQ2lCLFdBQW1CLEVBQ25CLHFCQUE2QixFQUM3QixtQkFBMkIsRUFDM0IsWUFBb0IsRUFDcEIsc0JBQThCLEVBQzlCLG9CQUE0QixFQUM1QixpQkFBd0I7UUFOeEIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFRO1FBQzdCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUTtRQUMzQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtRQUNwQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQVE7UUFDOUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFRO1FBQzVCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBTztJQUN0QyxDQUFDO0NBQ0oifQ==