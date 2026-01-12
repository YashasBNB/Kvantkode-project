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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yRGVsZXRlT3BlcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yRGVsZXRlT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUs5RCxPQUFPLEVBRU4sbUJBQW1CLEVBR25CLE9BQU8sR0FDUCxNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBSXhDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU5QyxNQUFNLE9BQU8sZ0JBQWdCO0lBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQ3hCLHFCQUF3QyxFQUN4QyxNQUEyQixFQUMzQixLQUF5QixFQUN6QixVQUF1QjtRQUV2QixNQUFNLFFBQVEsR0FBMkIsRUFBRSxDQUFBO1FBQzNDLElBQUksNEJBQTRCLEdBQUcscUJBQXFCLDRDQUFvQyxDQUFBO1FBQzVGLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFL0IsSUFBSSxlQUFlLEdBQVUsU0FBUyxDQUFBO1lBRXRDLElBQUksZUFBZSxDQUFDLE9BQU8s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