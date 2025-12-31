/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { ReplaceCommand } from '../commands/replaceCommand.js';
import { EditOperationResult, isQuote, } from '../cursorCommon.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { MoveOperations } from './cursorMoveOperations.js';
import { Range } from '../core/range.js';
import { Position } from '../core/position.js';
export class DeleteOperations {
    static deleteRight(prevEditOperationType, config, model, selections) {
        const commands = [];
        let shouldPushStackElementBefore = prevEditOperationType !== 3 /* EditOperationType.DeletingRight */;
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            let deleteSelection = selection;
            if (deleteSelection.isEmpty()) {
                const position = selection.getPosition();
                const rightOfPosition = MoveOperations.right(config, model, position);
                deleteSelection = new Range(rightOfPosition.lineNumber, rightOfPosition.column, position.lineNumber, position.column);
            }
            if (deleteSelection.isEmpty()) {
                // Probably at end of file => ignore
                commands[i] = null;
                continue;
            }
            if (deleteSelection.startLineNumber !== deleteSelection.endLineNumber) {
                shouldPushStackElementBefore = true;
            }
            commands[i] = new ReplaceCommand(deleteSelection, '');
        }
        return [shouldPushStackElementBefore, commands];
    }
    static isAutoClosingPairDelete(autoClosingDelete, autoClosingBrackets, autoClosingQuotes, autoClosingPairsOpen, model, selections, autoClosedCharacters) {
        if (autoClosingBrackets === 'never' && autoClosingQuotes === 'never') {
            return false;
        }
        if (autoClosingDelete === 'never') {
            return false;
        }
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            const position = selection.getPosition();
            if (!selection.isEmpty()) {
                return false;
            }
            const lineText = model.getLineContent(position.lineNumber);
            if (position.column < 2 || position.column >= lineText.length + 1) {
                return false;
            }
            const character = lineText.charAt(position.column - 2);
            const autoClosingPairCandidates = autoClosingPairsOpen.get(character);
            if (!autoClosingPairCandidates) {
                return false;
            }
            if (isQuote(character)) {
                if (autoClosingQuotes === 'never') {
                    return false;
                }
            }
            else {
                if (autoClosingBrackets === 'never') {
                    return false;
                }
            }
            const afterCharacter = lineText.charAt(position.column - 1);
            let foundAutoClosingPair = false;
            for (const autoClosingPairCandidate of autoClosingPairCandidates) {
                if (autoClosingPairCandidate.open === character &&
                    autoClosingPairCandidate.close === afterCharacter) {
                    foundAutoClosingPair = true;
                }
            }
            if (!foundAutoClosingPair) {
                return false;
            }
            // Must delete the pair only if it was automatically inserted by the editor
            if (autoClosingDelete === 'auto') {
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
    static _runAutoClosingPairDelete(config, model, selections) {
        const commands = [];
        for (let i = 0, len = selections.length; i < len; i++) {
            const position = selections[i].getPosition();
            const deleteSelection = new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
            commands[i] = new ReplaceCommand(deleteSelection, '');
        }
        return [true, commands];
    }
    static deleteLeft(prevEditOperationType, config, model, selections, autoClosedCharacters) {
        if (this.isAutoClosingPairDelete(config.autoClosingDelete, config.autoClosingBrackets, config.autoClosingQuotes, config.autoClosingPairs.autoClosingPairsOpenByEnd, model, selections, autoClosedCharacters)) {
            return this._runAutoClosingPairDelete(config, model, selections);
        }
        const commands = [];
        let shouldPushStackElementBefore = prevEditOperationType !== 2 /* EditOperationType.DeletingLeft */;
        for (let i = 0, len = selections.length; i < len; i++) {
            const deleteRange = DeleteOperations.getDeleteRange(selections[i], model, config);
            // Ignore empty delete ranges, as they have no effect
            // They happen if the cursor is at the beginning of the file.
            if (deleteRange.isEmpty()) {
                commands[i] = null;
                continue;
            }
            if (deleteRange.startLineNumber !== deleteRange.endLineNumber) {
                shouldPushStackElementBefore = true;
            }
            commands[i] = new ReplaceCommand(deleteRange, '');
        }
        return [shouldPushStackElementBefore, commands];
    }
    static getDeleteRange(selection, model, config) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = selection.getPosition();
        // Unintend when using tab stops and cursor is within indentation
        if (config.useTabStops && position.column > 1) {
            const lineContent = model.getLineContent(position.lineNumber);
            const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
            const lastIndentationColumn = firstNonWhitespaceIndex === -1
                ? /* entire string is whitespace */ lineContent.length + 1
                : firstNonWhitespaceIndex + 1;
            if (position.column <= lastIndentationColumn) {
                const fromVisibleColumn = config.visibleColumnFromColumn(model, position);
                const toVisibleColumn = CursorColumns.prevIndentTabStop(fromVisibleColumn, config.indentSize);
                const toColumn = config.columnFromVisibleColumn(model, position.lineNumber, toVisibleColumn);
                return new Range(position.lineNumber, toColumn, position.lineNumber, position.column);
            }
        }
        return Range.fromPositions(DeleteOperations.getPositionAfterDeleteLeft(position, model), position);
    }
    static getPositionAfterDeleteLeft(position, model) {
        if (position.column > 1) {
            // Convert 1-based columns to 0-based offsets and back.
            const idx = strings.getLeftDeleteOffset(position.column - 1, model.getLineContent(position.lineNumber));
            return position.with(undefined, idx + 1);
        }
        else if (position.lineNumber > 1) {
            const newLine = position.lineNumber - 1;
            return new Position(newLine, model.getLineMaxColumn(newLine));
        }
        else {
            return position;
        }
    }
    static cut(config, model, selections) {
        const commands = [];
        let lastCutRange = null;
        selections.sort((a, b) => Position.compare(a.getStartPosition(), b.getEndPosition()));
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            if (selection.isEmpty()) {
                if (config.emptySelectionClipboard) {
                    // This is a full line cut
                    const position = selection.getPosition();
                    let startLineNumber, startColumn, endLineNumber, endColumn;
                    if (position.lineNumber < model.getLineCount()) {
                        // Cutting a line in the middle of the model
                        startLineNumber = position.lineNumber;
                        startColumn = 1;
                        endLineNumber = position.lineNumber + 1;
                        endColumn = 1;
                    }
                    else if (position.lineNumber > 1 &&
                        lastCutRange?.endLineNumber !== position.lineNumber) {
                        // Cutting the last line & there are more than 1 lines in the model & a previous cut operation does not touch the current cut operation
                        startLineNumber = position.lineNumber - 1;
                        startColumn = model.getLineMaxColumn(position.lineNumber - 1);
                        endLineNumber = position.lineNumber;
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                    else {
                        // Cutting the single line that the model contains
                        startLineNumber = position.lineNumber;
                        startColumn = 1;
                        endLineNumber = position.lineNumber;
                        endColumn = model.getLineMaxColumn(position.lineNumber);
                    }
                    const deleteSelection = new Range(startLineNumber, startColumn, endLineNumber, endColumn);
                    lastCutRange = deleteSelection;
                    if (!deleteSelection.isEmpty()) {
                        commands[i] = new ReplaceCommand(deleteSelection, '');
                    }
                    else {
                        commands[i] = null;
                    }
                }
                else {
                    // Cannot cut empty selection
                    commands[i] = null;
                }
            }
            else {
                commands[i] = new ReplaceCommand(selection, '');
            }
        }
        return new EditOperationResult(0 /* EditOperationType.Other */, commands, {
            shouldPushStackElementBefore: true,
            shouldPushStackElementAfter: true,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRGVsZXRlT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvckRlbGV0ZU9wZXJhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFLOUQsT0FBTyxFQUVOLG1CQUFtQixFQUduQixPQUFPLEdBQ1AsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUl4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFOUMsTUFBTSxPQUFPLGdCQUFnQjtJQUNyQixNQUFNLENBQUMsV0FBVyxDQUN4QixxQkFBd0MsRUFDeEMsTUFBMkIsRUFDM0IsS0FBeUIsRUFDekIsVUFBdUI7UUFFdkIsTUFBTSxRQUFRLEdBQTJCLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLDRCQUE0QixHQUFHLHFCQUFxQiw0Q0FBb0MsQ0FBQTtRQUM1RixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRS9CLElBQUksZUFBZSxHQUFVLFNBQVMsQ0FBQTtZQUV0QyxJQUFJLGVBQWUsQ0FBQyxPQUFPLEVBQUUs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