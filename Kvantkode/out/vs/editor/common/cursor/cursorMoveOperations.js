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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZU9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvck1vdmVPcGVyYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDeEMsT0FBTyxFQUFFLHVCQUF1QixFQUFhLE1BQU0saUNBQWlDLENBQUE7QUFDcEYsT0FBTyxFQUlOLGlCQUFpQixHQUNqQixNQUFNLG9CQUFvQixDQUFBO0FBRzNCLE1BQU0sT0FBTyxjQUFjO0lBTzFCLFlBQVksVUFBa0IsRUFBRSxNQUFjLEVBQUUsc0JBQThCO1FBTjlFLHlCQUFvQixHQUFTLFNBQVMsQ0FBQTtRQU9yQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsc0JBQXNCLEdBQUcsc0JBQXNCLENBQUE7SUFDckQsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGNBQWM7SUFDbkIsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUF5QixFQUFFLFFBQWtCO1FBQ3ZFLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDbkUsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUNwQixTQUFTLEVBQ1QsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEtB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