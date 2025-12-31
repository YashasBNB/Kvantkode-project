/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { CursorColumns } from '../core/cursorColumns.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { AtomicTabMoveOperations } from './cursorAtomicMoveOperations.js';
import { SingleCursorState, } from '../cursorCommon.js';
export class CursorPosition {
    constructor(lineNumber, column, leftoverVisibleColumns) {
        this._cursorPositionBrand = undefined;
        this.lineNumber = lineNumber;
        this.column = column;
        this.leftoverVisibleColumns = leftoverVisibleColumns;
    }
}
export class MoveOperations {
    static leftPosition(model, position) {
        if (position.column > model.getLineMinColumn(position.lineNumber)) {
            return position.delta(undefined, -strings.prevCharLength(model.getLineContent(position.lineNumber), position.column - 1));
        }
        else if (position.lineNumber > 1) {
            const newLineNumber = position.lineNumber - 1;
            return new Position(newLineNumber, model.getLineMaxColumn(newLineNumber));
        }
        else {
            return position;
        }
    }
    static leftPositionAtomicSoftTabs(model, position, tabSize) {
        if (position.column <= model.getLineIndentColumn(position.lineNumber)) {
            const minColumn = model.getLineMinColumn(position.lineNumber);
            const lineContent = model.getLineContent(position.lineNumber);
            const newPosition = AtomicTabMoveOperations.atomicPosition(lineContent, position.column - 1, tabSize, 0 /* Direction.Left */);
            if (newPosition !== -1 && newPosition + 1 >= minColumn) {
                return new Position(position.lineNumber, newPosition + 1);
            }
        }
        return this.leftPosition(model, position);
    }
    static left(config, model, position) {
        const pos = config.stickyTabStops
            ? MoveOperations.leftPositionAtomicSoftTabs(model, position, config.tabSize)
            : MoveOperations.leftPosition(model, position);
        return new CursorPosition(pos.lineNumber, pos.column, 0);
    }
    /**
     * @param noOfColumns Must be either `1`
     * or `Math.round(viewModel.getLineContent(viewLineNumber).length / 2)` (for half lines).
     */
    static moveLeft(config, model, cursor, inSelectionMode, noOfColumns) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If the user has a selection and does not want to extend it,
            // put the cursor at the beginning of the selection.
            lineNumber = cursor.selection.startLineNumber;
            column = cursor.selection.startColumn;
        }
        else {
            // This has no effect if noOfColumns === 1.
            // It is ok to do so in the half-line scenario.
            const pos = cursor.position.delta(undefined, -(noOfColumns - 1));
            // We clip the position before normalization, as normalization is not defined
            // for possibly negative columns.
            const normalizedPos = model.normalizePosition(MoveOperations.clipPositionColumn(pos, model), 0 /* PositionAffinity.Left */);
            const p = MoveOperations.left(config, model, normalizedPos);
            lineNumber = p.lineNumber;
            column = p.column;
        }
        return cursor.move(inSelectionMode, lineNumber, column, 0);
    }
    /**
     * Adjusts the column so that it is within min/max of the line.
     */
    static clipPositionColumn(position, model) {
        return new Position(position.lineNumber, MoveOperations.clipRange(position.column, model.getLineMinColumn(position.lineNumber), model.getLineMaxColumn(position.lineNumber)));
    }
    static clipRange(value, min, max) {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }
    static rightPosition(model, lineNumber, column) {
        if (column < model.getLineMaxColumn(lineNumber)) {
            column = column + strings.nextCharLength(model.getLineContent(lineNumber), column - 1);
        }
        else if (lineNumber < model.getLineCount()) {
            lineNumber = lineNumber + 1;
            column = model.getLineMinColumn(lineNumber);
        }
        return new Position(lineNumber, column);
    }
    static rightPositionAtomicSoftTabs(model, lineNumber, column, tabSize, indentSize) {
        if (column < model.getLineIndentColumn(lineNumber)) {
            const lineContent = model.getLineContent(lineNumber);
            const newPosition = AtomicTabMoveOperations.atomicPosition(lineContent, column - 1, tabSize, 1 /* Direction.Right */);
            if (newPosition !== -1) {
                return new Position(lineNumber, newPosition + 1);
            }
        }
        return this.rightPosition(model, lineNumber, column);
    }
    static right(config, model, position) {
        const pos = config.stickyTabStops
            ? MoveOperations.rightPositionAtomicSoftTabs(model, position.lineNumber, position.column, config.tabSize, config.indentSize)
            : MoveOperations.rightPosition(model, position.lineNumber, position.column);
        return new CursorPosition(pos.lineNumber, pos.column, 0);
    }
    static moveRight(config, model, cursor, inSelectionMode, noOfColumns) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If we are in selection mode, move right without selection cancels selection and puts cursor at the end of the selection
            lineNumber = cursor.selection.endLineNumber;
            column = cursor.selection.endColumn;
        }
        else {
            const pos = cursor.position.delta(undefined, noOfColumns - 1);
            const normalizedPos = model.normalizePosition(MoveOperations.clipPositionColumn(pos, model), 1 /* PositionAffinity.Right */);
            const r = MoveOperations.right(config, model, normalizedPos);
            lineNumber = r.lineNumber;
            column = r.column;
        }
        return cursor.move(inSelectionMode, lineNumber, column, 0);
    }
    static vertical(config, model, lineNumber, column, leftoverVisibleColumns, newLineNumber, allowMoveOnEdgeLine, normalizationAffinity) {
        const currentVisibleColumn = CursorColumns.visibleColumnFromColumn(model.getLineContent(lineNumber), column, config.tabSize) + leftoverVisibleColumns;
        const lineCount = model.getLineCount();
        const wasOnFirstPosition = lineNumber === 1 && column === 1;
        const wasOnLastPosition = lineNumber === lineCount && column === model.getLineMaxColumn(lineNumber);
        const wasAtEdgePosition = newLineNumber < lineNumber ? wasOnFirstPosition : wasOnLastPosition;
        lineNumber = newLineNumber;
        if (lineNumber < 1) {
            lineNumber = 1;
            if (allowMoveOnEdgeLine) {
                column = model.getLineMinColumn(lineNumber);
            }
            else {
                column = Math.min(model.getLineMaxColumn(lineNumber), column);
            }
        }
        else if (lineNumber > lineCount) {
            lineNumber = lineCount;
            if (allowMoveOnEdgeLine) {
                column = model.getLineMaxColumn(lineNumber);
            }
            else {
                column = Math.min(model.getLineMaxColumn(lineNumber), column);
            }
        }
        else {
            column = config.columnFromVisibleColumn(model, lineNumber, currentVisibleColumn);
        }
        if (wasAtEdgePosition) {
            leftoverVisibleColumns = 0;
        }
        else {
            leftoverVisibleColumns =
                currentVisibleColumn -
                    CursorColumns.visibleColumnFromColumn(model.getLineContent(lineNumber), column, config.tabSize);
        }
        if (normalizationAffinity !== undefined) {
            const position = new Position(lineNumber, column);
            const newPosition = model.normalizePosition(position, normalizationAffinity);
            leftoverVisibleColumns = leftoverVisibleColumns + (column - newPosition.column);
            lineNumber = newPosition.lineNumber;
            column = newPosition.column;
        }
        return new CursorPosition(lineNumber, column, leftoverVisibleColumns);
    }
    static down(config, model, lineNumber, column, leftoverVisibleColumns, count, allowMoveOnLastLine) {
        return this.vertical(config, model, lineNumber, column, leftoverVisibleColumns, lineNumber + count, allowMoveOnLastLine, 4 /* PositionAffinity.RightOfInjectedText */);
    }
    static moveDown(config, model, cursor, inSelectionMode, linesCount) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If we are in selection mode, move down acts relative to the end of selection
            lineNumber = cursor.selection.endLineNumber;
            column = cursor.selection.endColumn;
        }
        else {
            lineNumber = cursor.position.lineNumber;
            column = cursor.position.column;
        }
        let i = 0;
        let r;
        do {
            r = MoveOperations.down(config, model, lineNumber + i, column, cursor.leftoverVisibleColumns, linesCount, true);
            const np = model.normalizePosition(new Position(r.lineNumber, r.column), 2 /* PositionAffinity.None */);
            if (np.lineNumber > lineNumber) {
                break;
            }
        } while (i++ < 10 && lineNumber + i < model.getLineCount());
        return cursor.move(inSelectionMode, r.lineNumber, r.column, r.leftoverVisibleColumns);
    }
    static translateDown(config, model, cursor) {
        const selection = cursor.selection;
        const selectionStart = MoveOperations.down(config, model, selection.selectionStartLineNumber, selection.selectionStartColumn, cursor.selectionStartLeftoverVisibleColumns, 1, false);
        const position = MoveOperations.down(config, model, selection.positionLineNumber, selection.positionColumn, cursor.leftoverVisibleColumns, 1, false);
        return new SingleCursorState(new Range(selectionStart.lineNumber, selectionStart.column, selectionStart.lineNumber, selectionStart.column), 0 /* SelectionStartKind.Simple */, selectionStart.leftoverVisibleColumns, new Position(position.lineNumber, position.column), position.leftoverVisibleColumns);
    }
    static up(config, model, lineNumber, column, leftoverVisibleColumns, count, allowMoveOnFirstLine) {
        return this.vertical(config, model, lineNumber, column, leftoverVisibleColumns, lineNumber - count, allowMoveOnFirstLine, 3 /* PositionAffinity.LeftOfInjectedText */);
    }
    static moveUp(config, model, cursor, inSelectionMode, linesCount) {
        let lineNumber, column;
        if (cursor.hasSelection() && !inSelectionMode) {
            // If we are in selection mode, move up acts relative to the beginning of selection
            lineNumber = cursor.selection.startLineNumber;
            column = cursor.selection.startColumn;
        }
        else {
            lineNumber = cursor.position.lineNumber;
            column = cursor.position.column;
        }
        const r = MoveOperations.up(config, model, lineNumber, column, cursor.leftoverVisibleColumns, linesCount, true);
        return cursor.move(inSelectionMode, r.lineNumber, r.column, r.leftoverVisibleColumns);
    }
    static translateUp(config, model, cursor) {
        const selection = cursor.selection;
        const selectionStart = MoveOperations.up(config, model, selection.selectionStartLineNumber, selection.selectionStartColumn, cursor.selectionStartLeftoverVisibleColumns, 1, false);
        const position = MoveOperations.up(config, model, selection.positionLineNumber, selection.positionColumn, cursor.leftoverVisibleColumns, 1, false);
        return new SingleCursorState(new Range(selectionStart.lineNumber, selectionStart.column, selectionStart.lineNumber, selectionStart.column), 0 /* SelectionStartKind.Simple */, selectionStart.leftoverVisibleColumns, new Position(position.lineNumber, position.column), position.leftoverVisibleColumns);
    }
    static _isBlankLine(model, lineNumber) {
        if (model.getLineFirstNonWhitespaceColumn(lineNumber) === 0) {
            // empty or contains only whitespace
            return true;
        }
        return false;
    }
    static moveToPrevBlankLine(config, model, cursor, inSelectionMode) {
        let lineNumber = cursor.position.lineNumber;
        // If our current line is blank, move to the previous non-blank line
        while (lineNumber > 1 && this._isBlankLine(model, lineNumber)) {
            lineNumber--;
        }
        // Find the previous blank line
        while (lineNumber > 1 && !this._isBlankLine(model, lineNumber)) {
            lineNumber--;
        }
        return cursor.move(inSelectionMode, lineNumber, model.getLineMinColumn(lineNumber), 0);
    }
    static moveToNextBlankLine(config, model, cursor, inSelectionMode) {
        const lineCount = model.getLineCount();
        let lineNumber = cursor.position.lineNumber;
        // If our current line is blank, move to the next non-blank line
        while (lineNumber < lineCount && this._isBlankLine(model, lineNumber)) {
            lineNumber++;
        }
        // Find the next blank line
        while (lineNumber < lineCount && !this._isBlankLine(model, lineNumber)) {
            lineNumber++;
        }
        return cursor.move(inSelectionMode, lineNumber, model.getLineMinColumn(lineNumber), 0);
    }
    static moveToBeginningOfLine(config, model, cursor, inSelectionMode) {
        const lineNumber = cursor.position.lineNumber;
        const minColumn = model.getLineMinColumn(lineNumber);
        const firstNonBlankColumn = model.getLineFirstNonWhitespaceColumn(lineNumber) || minColumn;
        let column;
        const relevantColumnNumber = cursor.position.column;
        if (relevantColumnNumber === firstNonBlankColumn) {
            column = minColumn;
        }
        else {
            column = firstNonBlankColumn;
        }
        return cursor.move(inSelectionMode, lineNumber, column, 0);
    }
    static moveToEndOfLine(config, model, cursor, inSelectionMode, sticky) {
        const lineNumber = cursor.position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        return cursor.move(inSelectionMode, lineNumber, maxColumn, sticky ? 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */ - maxColumn : 0);
    }
    static moveToBeginningOfBuffer(config, model, cursor, inSelectionMode) {
        return cursor.move(inSelectionMode, 1, 1, 0);
    }
    static moveToEndOfBuffer(config, model, cursor, inSelectionMode) {
        const lastLineNumber = model.getLineCount();
        const lastColumn = model.getLineMaxColumn(lastLineNumber);
        return cursor.move(inSelectionMode, lastLineNumber, lastColumn, 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JNb3ZlT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSx1QkFBdUIsRUFBYSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BGLE9BQU8sRUFJTixpQkFBaUIsR0FDakIsTUFBTSxvQkFBb0IsQ0FBQTtBQUczQixNQUFNLE9BQU8sY0FBYztJQU8xQixZQUFZLFVBQWtCLEVBQUUsTUFBYyxFQUFFLHNCQUE4QjtRQU45RSx5QkFBb0IsR0FBUyxTQUFTLENBQUE7UUFPckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7UUFDcEIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLHNCQUFzQixDQUFBO0lBQ3JELENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxjQUFjO0lBQ25CLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBeUIsRUFBRSxRQUFrQjtRQUN2RSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ25FLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FDcEIsU0FBUyxFQUNULENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENB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