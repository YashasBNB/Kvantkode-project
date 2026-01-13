/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as types from '../../../base/common/types.js';
import { CursorState, SingleCursorState, } from '../cursorCommon.js';
import { MoveOperations } from './cursorMoveOperations.js';
import { WordOperations } from './cursorWordOperations.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
export class CursorMoveCommands {
    static addCursorDown(viewModel, cursors, useLogicalLine) {
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
            if (useLogicalLine) {
                result[resultLen++] = CursorState.fromModelState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel.model, cursor.modelState));
            }
            else {
                result[resultLen++] = CursorState.fromViewState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel, cursor.viewState));
            }
        }
        return result;
    }
    static addCursorUp(viewModel, cursors, useLogicalLine) {
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
            if (useLogicalLine) {
                result[resultLen++] = CursorState.fromModelState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel.model, cursor.modelState));
            }
            else {
                result[resultLen++] = CursorState.fromViewState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel, cursor.viewState));
            }
        }
        return result;
    }
    static moveToBeginningOfLine(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = this._moveToLineStart(viewModel, cursor, inSelectionMode);
        }
        return result;
    }
    static _moveToLineStart(viewModel, cursor, inSelectionMode) {
        const currentViewStateColumn = cursor.viewState.position.column;
        const currentModelStateColumn = cursor.modelState.position.column;
        const isFirstLineOfWrappedLine = currentViewStateColumn === currentModelStateColumn;
        const currentViewStatelineNumber = cursor.viewState.position.lineNumber;
        const firstNonBlankColumn = viewModel.getLineFirstNonWhitespaceColumn(currentViewStatelineNumber);
        const isBeginningOfViewLine = currentViewStateColumn === firstNonBlankColumn;
        if (!isFirstLineOfWrappedLine && !isBeginningOfViewLine) {
            return this._moveToLineStartByView(viewModel, cursor, inSelectionMode);
        }
        else {
            return this._moveToLineStartByModel(viewModel, cursor, inSelectionMode);
        }
    }
    static _moveToLineStartByView(viewModel, cursor, inSelectionMode) {
        return CursorState.fromViewState(MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode));
    }
    static _moveToLineStartByModel(viewModel, cursor, inSelectionMode) {
        return CursorState.fromModelState(MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
    }
    static moveToEndOfLine(viewModel, cursors, inSelectionMode, sticky) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = this._moveToLineEnd(viewModel, cursor, inSelectionMode, sticky);
        }
        return result;
    }
    static _moveToLineEnd(viewModel, cursor, inSelectionMode, sticky) {
        const viewStatePosition = cursor.viewState.position;
        const viewModelMaxColumn = viewModel.getLineMaxColumn(viewStatePosition.lineNumber);
        const isEndOfViewLine = viewStatePosition.column === viewModelMaxColumn;
        const modelStatePosition = cursor.modelState.position;
        const modelMaxColumn = viewModel.model.getLineMaxColumn(modelStatePosition.lineNumber);
        const isEndLineOfWrappedLine = viewModelMaxColumn - viewStatePosition.column === modelMaxColumn - modelStatePosition.column;
        if (isEndOfViewLine || isEndLineOfWrappedLine) {
            return this._moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky);
        }
        else {
            return this._moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky);
        }
    }
    static _moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky) {
        return CursorState.fromViewState(MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, sticky));
    }
    static _moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky) {
        return CursorState.fromModelState(MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, sticky));
    }
    static expandLineSelection(viewModel, cursors) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const startLineNumber = cursor.modelState.selection.startLineNumber;
            const lineCount = viewModel.model.getLineCount();
            let endLineNumber = cursor.modelState.selection.endLineNumber;
            let endColumn;
            if (endLineNumber === lineCount) {
                endColumn = viewModel.model.getLineMaxColumn(lineCount);
            }
            else {
                endLineNumber++;
                endColumn = 1;
            }
            result[i] = CursorState.fromModelState(new SingleCursorState(new Range(startLineNumber, 1, startLineNumber, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(endLineNumber, endColumn), 0));
        }
        return result;
    }
    static moveToBeginningOfBuffer(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveToBeginningOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
        }
        return result;
    }
    static moveToEndOfBuffer(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveToEndOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
        }
        return result;
    }
    static selectAll(viewModel, cursor) {
        const lineCount = viewModel.model.getLineCount();
        const maxColumn = viewModel.model.getLineMaxColumn(lineCount);
        return CursorState.fromModelState(new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(lineCount, maxColumn), 0));
    }
    static line(viewModel, cursor, inSelectionMode, _position, _viewPosition) {
        const position = viewModel.model.validatePosition(_position);
        const viewPosition = _viewPosition
            ? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumber, _viewPosition.column), position)
            : viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
        if (!inSelectionMode) {
            // Entering line selection for the first time
            const lineCount = viewModel.model.getLineCount();
            let selectToLineNumber = position.lineNumber + 1;
            let selectToColumn = 1;
            if (selectToLineNumber > lineCount) {
                selectToLineNumber = lineCount;
                selectToColumn = viewModel.model.getLineMaxColumn(selectToLineNumber);
            }
            return CursorState.fromModelState(new SingleCursorState(new Range(position.lineNumber, 1, selectToLineNumber, selectToColumn), 2 /* SelectionStartKind.Line */, 0, new Position(selectToLineNumber, selectToColumn), 0));
        }
        // Continuing line selection
        const enteringLineNumber = cursor.modelState.selectionStart.getStartPosition().lineNumber;
        if (position.lineNumber < enteringLineNumber) {
            return CursorState.fromViewState(cursor.viewState.move(true, viewPosition.lineNumber, 1, 0));
        }
        else if (position.lineNumber > enteringLineNumber) {
            const lineCount = viewModel.getLineCount();
            let selectToViewLineNumber = viewPosition.lineNumber + 1;
            let selectToViewColumn = 1;
            if (selectToViewLineNumber > lineCount) {
                selectToViewLineNumber = lineCount;
                selectToViewColumn = viewModel.getLineMaxColumn(selectToViewLineNumber);
            }
            return CursorState.fromViewState(cursor.viewState.move(true, selectToViewLineNumber, selectToViewColumn, 0));
        }
        else {
            const endPositionOfSelectionStart = cursor.modelState.selectionStart.getEndPosition();
            return CursorState.fromModelState(cursor.modelState.move(true, endPositionOfSelectionStart.lineNumber, endPositionOfSelectionStart.column, 0));
        }
    }
    static word(viewModel, cursor, inSelectionMode, _position) {
        const position = viewModel.model.validatePosition(_position);
        return CursorState.fromModelState(WordOperations.word(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, position));
    }
    static cancelSelection(viewModel, cursor) {
        if (!cursor.modelState.hasSelection()) {
            return new CursorState(cursor.modelState, cursor.viewState);
        }
        const lineNumber = cursor.viewState.position.lineNumber;
        const column = cursor.viewState.position.column;
        return CursorState.fromViewState(new SingleCursorState(new Range(lineNumber, column, lineNumber, column), 0 /* SelectionStartKind.Simple */, 0, new Position(lineNumber, column), 0));
    }
    static moveTo(viewModel, cursor, inSelectionMode, _position, _viewPosition) {
        if (inSelectionMode) {
            if (cursor.modelState.selectionStartKind === 1 /* SelectionStartKind.Word */) {
                return this.word(viewModel, cursor, inSelectionMode, _position);
            }
            if (cursor.modelState.selectionStartKind === 2 /* SelectionStartKind.Line */) {
                return this.line(viewModel, cursor, inSelectionMode, _position, _viewPosition);
            }
        }
        const position = viewModel.model.validatePosition(_position);
        const viewPosition = _viewPosition
            ? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumber, _viewPosition.column), position)
            : viewModel.coordinatesConverter.convertModelPositionToViewPosition(position);
        return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, viewPosition.lineNumber, viewPosition.column, 0));
    }
    static simpleMove(viewModel, cursors, direction, inSelectionMode, value, unit) {
        switch (direction) {
            case 0 /* CursorMove.Direction.Left */: {
                if (unit === 4 /* CursorMove.Unit.HalfLine */) {
                    // Move left by half the current line length
                    return this._moveHalfLineLeft(viewModel, cursors, inSelectionMode);
                }
                else {
                    // Move left by `moveParams.value` columns
                    return this._moveLeft(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 1 /* CursorMove.Direction.Right */: {
                if (unit === 4 /* CursorMove.Unit.HalfLine */) {
                    // Move right by half the current line length
                    return this._moveHalfLineRight(viewModel, cursors, inSelectionMode);
                }
                else {
                    // Move right by `moveParams.value` columns
                    return this._moveRight(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 2 /* CursorMove.Direction.Up */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    // Move up by view lines
                    return this._moveUpByViewLines(viewModel, cursors, inSelectionMode, value);
                }
                else {
                    // Move up by model lines
                    return this._moveUpByModelLines(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 3 /* CursorMove.Direction.Down */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    // Move down by view lines
                    return this._moveDownByViewLines(viewModel, cursors, inSelectionMode, value);
                }
                else {
                    // Move down by model lines
                    return this._moveDownByModelLines(viewModel, cursors, inSelectionMode, value);
                }
            }
            case 4 /* CursorMove.Direction.PrevBlankLine */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    return cursors.map((cursor) => CursorState.fromViewState(MoveOperations.moveToPrevBlankLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)));
                }
                else {
                    return cursors.map((cursor) => CursorState.fromModelState(MoveOperations.moveToPrevBlankLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)));
                }
            }
            case 5 /* CursorMove.Direction.NextBlankLine */: {
                if (unit === 2 /* CursorMove.Unit.WrappedLine */) {
                    return cursors.map((cursor) => CursorState.fromViewState(MoveOperations.moveToNextBlankLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)));
                }
                else {
                    return cursors.map((cursor) => CursorState.fromModelState(MoveOperations.moveToNextBlankLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)));
                }
            }
            case 6 /* CursorMove.Direction.WrappedLineStart */: {
                // Move to the beginning of the current view line
                return this._moveToViewMinColumn(viewModel, cursors, inSelectionMode);
            }
            case 7 /* CursorMove.Direction.WrappedLineFirstNonWhitespaceCharacter */: {
                // Move to the first non-whitespace column of the current view line
                return this._moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
            }
            case 8 /* CursorMove.Direction.WrappedLineColumnCenter */: {
                // Move to the "center" of the current view line
                return this._moveToViewCenterColumn(viewModel, cursors, inSelectionMode);
            }
            case 9 /* CursorMove.Direction.WrappedLineEnd */: {
                // Move to the end of the current view line
                return this._moveToViewMaxColumn(viewModel, cursors, inSelectionMode);
            }
            case 10 /* CursorMove.Direction.WrappedLineLastNonWhitespaceCharacter */: {
                // Move to the last non-whitespace column of the current view line
                return this._moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
            }
            default:
                return null;
        }
    }
    static viewportMove(viewModel, cursors, direction, inSelectionMode, value) {
        const visibleViewRange = viewModel.getCompletelyVisibleViewRange();
        const visibleModelRange = viewModel.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
        switch (direction) {
            case 11 /* CursorMove.Direction.ViewPortTop */: {
                // Move to the nth line start in the viewport (from the top)
                const modelLineNumber = this._firstLineNumberInRange(viewModel.model, visibleModelRange, value);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [
                    this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn),
                ];
            }
            case 13 /* CursorMove.Direction.ViewPortBottom */: {
                // Move to the nth line start in the viewport (from the bottom)
                const modelLineNumber = this._lastLineNumberInRange(viewModel.model, visibleModelRange, value);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [
                    this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn),
                ];
            }
            case 12 /* CursorMove.Direction.ViewPortCenter */: {
                // Move to the line start in the viewport center
                const modelLineNumber = Math.round((visibleModelRange.startLineNumber + visibleModelRange.endLineNumber) / 2);
                const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumber);
                return [
                    this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumber, modelColumn),
                ];
            }
            case 14 /* CursorMove.Direction.ViewPortIfOutside */: {
                // Move to a position inside the viewport
                const result = [];
                for (let i = 0, len = cursors.length; i < len; i++) {
                    const cursor = cursors[i];
                    result[i] = this.findPositionInViewportIfOutside(viewModel, cursor, visibleViewRange, inSelectionMode);
                }
                return result;
            }
            default:
                return null;
        }
    }
    static findPositionInViewportIfOutside(viewModel, cursor, visibleViewRange, inSelectionMode) {
        const viewLineNumber = cursor.viewState.position.lineNumber;
        if (visibleViewRange.startLineNumber <= viewLineNumber &&
            viewLineNumber <= visibleViewRange.endLineNumber - 1) {
            // Nothing to do, cursor is in viewport
            return new CursorState(cursor.modelState, cursor.viewState);
        }
        else {
            let newViewLineNumber;
            if (viewLineNumber > visibleViewRange.endLineNumber - 1) {
                newViewLineNumber = visibleViewRange.endLineNumber - 1;
            }
            else if (viewLineNumber < visibleViewRange.startLineNumber) {
                newViewLineNumber = visibleViewRange.startLineNumber;
            }
            else {
                newViewLineNumber = viewLineNumber;
            }
            const position = MoveOperations.vertical(viewModel.cursorConfig, viewModel, viewLineNumber, cursor.viewState.position.column, cursor.viewState.leftoverVisibleColumns, newViewLineNumber, false);
            return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, position.lineNumber, position.column, position.leftoverVisibleColumns));
        }
    }
    /**
     * Find the nth line start included in the range (from the start).
     */
    static _firstLineNumberInRange(model, range, count) {
        let startLineNumber = range.startLineNumber;
        if (range.startColumn !== model.getLineMinColumn(startLineNumber)) {
            // Move on to the second line if the first line start is not included in the range
            startLineNumber++;
        }
        return Math.min(range.endLineNumber, startLineNumber + count - 1);
    }
    /**
     * Find the nth line start included in the range (from the end).
     */
    static _lastLineNumberInRange(model, range, count) {
        let startLineNumber = range.startLineNumber;
        if (range.startColumn !== model.getLineMinColumn(startLineNumber)) {
            // Move on to the second line if the first line start is not included in the range
            startLineNumber++;
        }
        return Math.max(startLineNumber, range.endLineNumber - count + 1);
    }
    static _moveLeft(viewModel, cursors, inSelectionMode, noOfColumns) {
        return cursors.map((cursor) => CursorState.fromViewState(MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns)));
    }
    static _moveHalfLineLeft(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const halfLine = Math.round(viewModel.getLineLength(viewLineNumber) / 2);
            result[i] = CursorState.fromViewState(MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
        }
        return result;
    }
    static _moveRight(viewModel, cursors, inSelectionMode, noOfColumns) {
        return cursors.map((cursor) => CursorState.fromViewState(MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns)));
    }
    static _moveHalfLineRight(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const halfLine = Math.round(viewModel.getLineLength(viewLineNumber) / 2);
            result[i] = CursorState.fromViewState(MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
        }
        return result;
    }
    static _moveDownByViewLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromViewState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveDownByModelLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveUpByViewLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromViewState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveUpByModelLines(viewModel, cursors, inSelectionMode, linesCount) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            result[i] = CursorState.fromModelState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
        }
        return result;
    }
    static _moveToViewPosition(viewModel, cursor, inSelectionMode, toViewLineNumber, toViewColumn) {
        return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, toViewLineNumber, toViewColumn, 0));
    }
    static _moveToModelPosition(viewModel, cursor, inSelectionMode, toModelLineNumber, toModelColumn) {
        return CursorState.fromModelState(cursor.modelState.move(inSelectionMode, toModelLineNumber, toModelColumn, 0));
    }
    static _moveToViewMinColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineMinColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineFirstNonWhitespaceColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewCenterColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = Math.round((viewModel.getLineMaxColumn(viewLineNumber) + viewModel.getLineMinColumn(viewLineNumber)) /
                2);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewMaxColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineMaxColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
    static _moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode) {
        const result = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            const cursor = cursors[i];
            const viewLineNumber = cursor.viewState.position.lineNumber;
            const viewColumn = viewModel.getLineLastNonWhitespaceColumn(viewLineNumber);
            result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumber, viewColumn);
        }
        return result;
    }
}
export var CursorMove;
(function (CursorMove) {
    const isCursorMoveArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const cursorMoveArg = arg;
        if (!types.isString(cursorMoveArg.to)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.select) && !types.isBoolean(cursorMoveArg.select)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.by) && !types.isString(cursorMoveArg.by)) {
            return false;
        }
        if (!types.isUndefined(cursorMoveArg.value) && !types.isNumber(cursorMoveArg.value)) {
            return false;
        }
        return true;
    };
    CursorMove.metadata = {
        description: 'Move cursor to a logical position in the view',
        args: [
            {
                name: 'Cursor move argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'to': A mandatory logical position value providing where to move the cursor.
						\`\`\`
						'left', 'right', 'up', 'down', 'prevBlankLine', 'nextBlankLine',
						'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter'
						'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter'
						'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside'
						\`\`\`
					* 'by': Unit to move. Default is computed based on 'to' value.
						\`\`\`
						'line', 'wrappedLine', 'character', 'halfLine'
						\`\`\`
					* 'value': Number of units to move. Default is '1'.
					* 'select': If 'true' makes the selection. Default is 'false'.
				`,
                constraint: isCursorMoveArgs,
                schema: {
                    type: 'object',
                    required: ['to'],
                    properties: {
                        to: {
                            type: 'string',
                            enum: [
                                'left',
                                'right',
                                'up',
                                'down',
                                'prevBlankLine',
                                'nextBlankLine',
                                'wrappedLineStart',
                                'wrappedLineEnd',
                                'wrappedLineColumnCenter',
                                'wrappedLineFirstNonWhitespaceCharacter',
                                'wrappedLineLastNonWhitespaceCharacter',
                                'viewPortTop',
                                'viewPortCenter',
                                'viewPortBottom',
                                'viewPortIfOutside',
                            ],
                        },
                        by: {
                            type: 'string',
                            enum: ['line', 'wrappedLine', 'character', 'halfLine'],
                        },
                        value: {
                            type: 'number',
                            default: 1,
                        },
                        select: {
                            type: 'boolean',
                            default: false,
                        },
                    },
                },
            },
        ],
    };
    /**
     * Positions in the view for cursor move command.
     */
    CursorMove.RawDirection = {
        Left: 'left',
        Right: 'right',
        Up: 'up',
        Down: 'down',
        PrevBlankLine: 'prevBlankLine',
        NextBlankLine: 'nextBlankLine',
        WrappedLineStart: 'wrappedLineStart',
        WrappedLineFirstNonWhitespaceCharacter: 'wrappedLineFirstNonWhitespaceCharacter',
        WrappedLineColumnCenter: 'wrappedLineColumnCenter',
        WrappedLineEnd: 'wrappedLineEnd',
        WrappedLineLastNonWhitespaceCharacter: 'wrappedLineLastNonWhitespaceCharacter',
        ViewPortTop: 'viewPortTop',
        ViewPortCenter: 'viewPortCenter',
        ViewPortBottom: 'viewPortBottom',
        ViewPortIfOutside: 'viewPortIfOutside',
    };
    /**
     * Units for Cursor move 'by' argument
     */
    CursorMove.RawUnit = {
        Line: 'line',
        WrappedLine: 'wrappedLine',
        Character: 'character',
        HalfLine: 'halfLine',
    };
    function parse(args) {
        if (!args.to) {
            // illegal arguments
            return null;
        }
        let direction;
        switch (args.to) {
            case CursorMove.RawDirection.Left:
                direction = 0 /* Direction.Left */;
                break;
            case CursorMove.RawDirection.Right:
                direction = 1 /* Direction.Right */;
                break;
            case CursorMove.RawDirection.Up:
                direction = 2 /* Direction.Up */;
                break;
            case CursorMove.RawDirection.Down:
                direction = 3 /* Direction.Down */;
                break;
            case CursorMove.RawDirection.PrevBlankLine:
                direction = 4 /* Direction.PrevBlankLine */;
                break;
            case CursorMove.RawDirection.NextBlankLine:
                direction = 5 /* Direction.NextBlankLine */;
                break;
            case CursorMove.RawDirection.WrappedLineStart:
                direction = 6 /* Direction.WrappedLineStart */;
                break;
            case CursorMove.RawDirection.WrappedLineFirstNonWhitespaceCharacter:
                direction = 7 /* Direction.WrappedLineFirstNonWhitespaceCharacter */;
                break;
            case CursorMove.RawDirection.WrappedLineColumnCenter:
                direction = 8 /* Direction.WrappedLineColumnCenter */;
                break;
            case CursorMove.RawDirection.WrappedLineEnd:
                direction = 9 /* Direction.WrappedLineEnd */;
                break;
            case CursorMove.RawDirection.WrappedLineLastNonWhitespaceCharacter:
                direction = 10 /* Direction.WrappedLineLastNonWhitespaceCharacter */;
                break;
            case CursorMove.RawDirection.ViewPortTop:
                direction = 11 /* Direction.ViewPortTop */;
                break;
            case CursorMove.RawDirection.ViewPortBottom:
                direction = 13 /* Direction.ViewPortBottom */;
                break;
            case CursorMove.RawDirection.ViewPortCenter:
                direction = 12 /* Direction.ViewPortCenter */;
                break;
            case CursorMove.RawDirection.ViewPortIfOutside:
                direction = 14 /* Direction.ViewPortIfOutside */;
                break;
            default:
                // illegal arguments
                return null;
        }
        let unit = 0 /* Unit.None */;
        switch (args.by) {
            case CursorMove.RawUnit.Line:
                unit = 1 /* Unit.Line */;
                break;
            case CursorMove.RawUnit.WrappedLine:
                unit = 2 /* Unit.WrappedLine */;
                break;
            case CursorMove.RawUnit.Character:
                unit = 3 /* Unit.Character */;
                break;
            case CursorMove.RawUnit.HalfLine:
                unit = 4 /* Unit.HalfLine */;
                break;
        }
        return {
            direction: direction,
            unit: unit,
            select: !!args.select,
            value: args.value || 1,
        };
    }
    CursorMove.parse = parse;
    let Direction;
    (function (Direction) {
        Direction[Direction["Left"] = 0] = "Left";
        Direction[Direction["Right"] = 1] = "Right";
        Direction[Direction["Up"] = 2] = "Up";
        Direction[Direction["Down"] = 3] = "Down";
        Direction[Direction["PrevBlankLine"] = 4] = "PrevBlankLine";
        Direction[Direction["NextBlankLine"] = 5] = "NextBlankLine";
        Direction[Direction["WrappedLineStart"] = 6] = "WrappedLineStart";
        Direction[Direction["WrappedLineFirstNonWhitespaceCharacter"] = 7] = "WrappedLineFirstNonWhitespaceCharacter";
        Direction[Direction["WrappedLineColumnCenter"] = 8] = "WrappedLineColumnCenter";
        Direction[Direction["WrappedLineEnd"] = 9] = "WrappedLineEnd";
        Direction[Direction["WrappedLineLastNonWhitespaceCharacter"] = 10] = "WrappedLineLastNonWhitespaceCharacter";
        Direction[Direction["ViewPortTop"] = 11] = "ViewPortTop";
        Direction[Direction["ViewPortCenter"] = 12] = "ViewPortCenter";
        Direction[Direction["ViewPortBottom"] = 13] = "ViewPortBottom";
        Direction[Direction["ViewPortIfOutside"] = 14] = "ViewPortIfOutside";
    })(Direction = CursorMove.Direction || (CursorMove.Direction = {}));
    let Unit;
    (function (Unit) {
        Unit[Unit["None"] = 0] = "None";
        Unit[Unit["Line"] = 1] = "Line";
        Unit[Unit["WrappedLine"] = 2] = "WrappedLine";
        Unit[Unit["Character"] = 3] = "Character";
        Unit[Unit["HalfLine"] = 4] = "HalfLine";
    })(Unit = CursorMove.Unit || (CursorMove.Unit = {}));
})(CursorMove || (CursorMove = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JNb3ZlQ29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sV0FBVyxFQUlYLGlCQUFpQixHQUNqQixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDMUQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUl4QyxNQUFNLE9BQU8sa0JBQWtCO0lBQ3ZCLE1BQU0sQ0FBQyxhQUFhLENBQzFCLFNBQXFCLEVBQ3JCLE9BQXNCLEVBQ3RCLGNBQXVCO1FBRXZCLE1BQU0sTUFBTSxHQUF5QixFQUFFLENBQUE7UUFDdkMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDMUUsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FDL0MsY0FBYyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUN4RixDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQzlDLGNBQWMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUNqRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTSxNQUFNLENBQUMsV0FBVyxDQUN4QixTQUFxQixFQUNyQixPQUFzQixFQUN0QixjQUF1QjtRQUV2QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFFLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQy9DLGNBQWMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FDdEYsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUM5QyxjQUFjLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FDL0UsQ0FBQTtZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sTUFBTSxDQUFDLHFCQUFxQixDQUNsQyxTQUFxQixFQUNyQixPQUFzQixFQUN0QixlQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQzlCLFNBQXFCLEVBQ3JCLE1BQW1CLEVBQ25CLGVBQXdCO1FBRXhCLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQy9ELE1BQU0sdUJBQXVCLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBQ2pFLE1BQU0sd0JBQXdCLEdBQUcsc0JBQXNCLEtBQUssdUJBQXVCLENBQUE7UUFFbkYsTUFBTSwwQkFBMEIsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDdkUsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUMsK0JBQStCLENBQ3BFLDBCQUEwQixDQUMxQixDQUFBO1FBQ0QsTUFBTSxxQkFBcUIsR0FBRyxzQkFBc0IsS0FBSyxtQkFBbUIsQ0FBQTtRQUU1RSxJQUFJLENBQUMsd0JBQXdCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3pELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDdkUsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3hFLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLHNCQUFzQixDQUNwQyxTQUFxQixFQUNyQixNQUFtQixFQUNuQixlQUF3QjtRQUV4QixPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQy9CLGNBQWMsQ0FBQyxxQkFBcUIsQ0FDbkMsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxFQUNULE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLGVBQWUsQ0FDZixDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLHVCQUF1QixDQUNyQyxTQUFxQixFQUNyQixNQUFtQixFQUNuQixlQUF3QjtRQUV4QixPQUFPLFdBQVcsQ0FBQyxjQUFjLENBQ2hDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FDbkMsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxDQUFDLEtBQUssRUFDZixNQUFNLENBQUMsVUFBVSxFQUNqQixlQUFlLENBQ2YsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxlQUFlLENBQzVCLFNBQXFCLEVBQ3JCLE9BQXNCLEVBQ3RCLGVBQXdCLEVBQ3hCLE1BQWU7UUFFZixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUUsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxjQUFjLENBQzVCLFNBQXFCLEVBQ3JCLE1BQW1CLEVBQ25CLGVBQXdCLEVBQ3hCLE1BQWU7UUFFZixNQUFNLGlCQUFpQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFBO1FBQ25ELE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxrQkFBa0IsQ0FBQTtRQUV2RSxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFBO1FBQ3JELE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEYsTUFBTSxzQkFBc0IsR0FDM0Isa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxLQUFLLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUE7UUFFN0YsSUFBSSxlQUFlLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUMvQyxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RSxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzdFLENBQUM7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLG9CQUFvQixDQUNsQyxTQUFxQixFQUNyQixNQUFtQixFQUNuQixlQUF3QixFQUN4QixNQUFlO1FBRWYsT0FBTyxXQUFXLENBQUMsYUFBYSxDQUMvQixjQUFjLENBQUMsZUFBZSxDQUM3QixTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsZUFBZSxFQUNmLE1BQU0sQ0FDTixDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLHFCQUFxQixDQUNuQyxTQUFxQixFQUNyQixNQUFtQixFQUNuQixlQUF3QixFQUN4QixNQUFlO1FBRWYsT0FBTyxXQUFXLENBQUMsY0FBYyxDQUNoQyxjQUFjLENBQUMsZUFBZSxDQUM3QixTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLENBQUMsS0FBSyxFQUNmLE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLGVBQWUsRUFDZixNQUFNLENBQ04sQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxtQkFBbUIsQ0FDaEMsU0FBcUIsRUFDckIsT0FBc0I7UUFFdEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXpCLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQTtZQUNuRSxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFBO1lBRWhELElBQUksYUFBYSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQTtZQUM3RCxJQUFJLFNBQWlCLENBQUE7WUFDckIsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2pDLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLEVBQUUsQ0FBQTtnQkFDZixTQUFTLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsQ0FBQztZQUVELE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUNyQyxJQUFJLGlCQUFpQixDQUNwQixJQUFJLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMscUNBRWpELENBQUMsRUFDRCxJQUFJLFFBQVEsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLEVBQ3RDLENBQUMsQ0FDRCxDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU0sTUFBTSxDQUFDLHVCQUF1QixDQUNwQyxTQUFxQixFQUNyQixPQUFzQixFQUN0QixlQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQ3JDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FDckMsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxDQUFDLEtBQUssRUFDZixNQUFNLENBQUMsVUFBVSxFQUNqQixlQUFlLENBQ2YsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxpQkFBaUIsQ0FDOUIsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUNyQyxjQUFjLENBQUMsaUJBQWlCLENBQy9CLFNBQVMsQ0FBQyxZQUFZLEVBQ3RCLFNBQVMsQ0FBQyxLQUFLLEVBQ2YsTUFBTSxDQUFDLFVBQVUsRUFDakIsZUFBZSxDQUNmLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTSxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQXFCLEVBQUUsTUFBbUI7UUFDakUsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNoRCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRTdELE9BQU8sV0FBVyxDQUFDLGNBQWMsQ0FDaEMsSUFBSSxpQkFBaUIsQ0FDcEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHFDQUVyQixDQUFDLEVBQ0QsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUNsQyxDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxJQUFJLENBQ2pCLFNBQXFCLEVBQ3JCLE1BQW1CLEVBQ25CLGVBQXdCLEVBQ3hCLFNBQW9CLEVBQ3BCLGFBQW9DO1FBRXBDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUQsTUFBTSxZQUFZLEdBQUcsYUFBYTtZQUNqQyxDQUFDLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixDQUNuRCxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFDNUQsUUFBUSxDQUNSO1lBQ0YsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU5RSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsNkNBQTZDO1lBQzdDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUE7WUFFaEQsSUFBSSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQTtZQUNoRCxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUE7WUFDdEIsSUFBSSxrQkFBa0IsR0FBRyxTQUFTLEVBQUUsQ0FBQztnQkFDcEMsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO2dCQUM5QixjQUFjLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3RFLENBQUM7WUFFRCxPQUFPLFdBQVcsQ0FBQyxjQUFjLENBQ2hDLElBQUksaUJBQWlCLENBQ3BCLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxtQ0FFckUsQ0FBQyxFQUNELElBQUksUUFBUSxDQUFDLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxFQUNoRCxDQUFDLENBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxDQUFBO1FBRXpGLElBQUksUUFBUSxDQUFDLFVBQVUsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlDLE9BQU8sV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM3RixDQUFDO2FBQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxHQUFHLGtCQUFrQixFQUFFLENBQUM7WUFDckQsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1lBRTFDLElBQUksc0JBQXNCLEdBQUcsWUFBWSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUE7WUFDeEQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUE7WUFDMUIsSUFBSSxzQkFBc0IsR0FBRyxTQUFTLEVBQUUsQ0FBQztnQkFDeEMsc0JBQXNCLEdBQUcsU0FBUyxDQUFBO2dCQUNsQyxrQkFBa0IsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUN4RSxDQUFDO1lBRUQsT0FBTyxXQUFXLENBQUMsYUFBYSxDQUMvQixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQzFFLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sMkJBQTJCLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUE7WUFDckYsT0FBTyxXQUFXLENBQUMsY0FBYyxDQUNoQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FDckIsSUFBSSxFQUNKLDJCQUEyQixDQUFDLFVBQVUsRUFDdEMsMkJBQTJCLENBQUMsTUFBTSxFQUNsQyxDQUFDLENBQ0QsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsSUFBSSxDQUNqQixTQUFxQixFQUNyQixNQUFtQixFQUNuQixlQUF3QixFQUN4QixTQUFvQjtRQUVwQixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVELE9BQU8sV0FBVyxDQUFDLGNBQWMsQ0FDaEMsY0FBYyxDQUFDLElBQUksQ0FDbEIsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxDQUFDLEtBQUssRUFDZixNQUFNLENBQUMsVUFBVSxFQUNqQixlQUFlLEVBQ2YsUUFBUSxDQUNSLENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTSxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQXFCLEVBQUUsTUFBbUI7UUFDdkUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztZQUN2QyxPQUFPLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDdkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO1FBRS9DLE9BQU8sV0FBVyxDQUFDLGFBQWEsQ0FDL0IsSUFBSSxpQkFBaUIsQ0FDcEIsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDLHFDQUVqRCxDQUFDLEVBQ0QsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUNoQyxDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxNQUFNLENBQ25CLFNBQXFCLEVBQ3JCLE1BQW1CLEVBQ25CLGVBQXdCLEVBQ3hCLFNBQW9CLEVBQ3BCLGFBQW9DO1FBRXBDLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLGtCQUFrQixvQ0FBNEIsRUFBRSxDQUFDO2dCQUN0RSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDaEUsQ0FBQztZQUNELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0Isb0NBQTRCLEVBQUUsQ0FBQztnQkFDdEUsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUMvRSxDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDNUQsTUFBTSxZQUFZLEdBQUcsYUFBYTtZQUNqQyxDQUFDLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixDQUNuRCxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFDNUQsUUFBUSxDQUNSO1lBQ0YsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5RSxPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQy9CLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQ3ZGLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFVBQVUsQ0FDdkIsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsU0FBeUMsRUFDekMsZUFBd0IsRUFDeEIsS0FBYSxFQUNiLElBQXFCO1FBRXJCLFFBQVEsU0FBUyxFQUFFLENBQUM7WUFDbkIsc0NBQThCLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLElBQUkscUNBQTZCLEVBQUUsQ0FBQztvQkFDdkMsNENBQTRDO29CQUM1QyxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsMENBQTBDO29CQUMxQyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ2xFLENBQUM7WUFDRixDQUFDO1lBQ0QsdUNBQStCLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLElBQUkscUNBQTZCLEVBQUUsQ0FBQztvQkFDdkMsNkNBQTZDO29CQUM3QyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUNwRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsMkNBQTJDO29CQUMzQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ25FLENBQUM7WUFDRixDQUFDO1lBQ0Qsb0NBQTRCLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLElBQUksd0NBQWdDLEVBQUUsQ0FBQztvQkFDMUMsd0JBQXdCO29CQUN4QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDM0UsQ0FBQztxQkFBTSxDQUFDO29CQUNQLHlCQUF5QjtvQkFDekIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQzVFLENBQUM7WUFDRixDQUFDO1lBQ0Qsc0NBQThCLENBQUMsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLElBQUksd0NBQWdDLEVBQUUsQ0FBQztvQkFDMUMsMEJBQTBCO29CQUMxQixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDN0UsQ0FBQztxQkFBTSxDQUFDO29CQUNQLDJCQUEyQjtvQkFDM0IsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQzlFLENBQUM7WUFDRixDQUFDO1lBQ0QsK0NBQXVDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLElBQUksd0NBQWdDLEVBQUUsQ0FBQztvQkFDMUMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDN0IsV0FBVyxDQUFDLGFBQWEsQ0FDeEIsY0FBYyxDQUFDLG1CQUFtQixDQUNqQyxTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsZUFBZSxDQUNmLENBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUM3QixXQUFXLENBQUMsY0FBYyxDQUN6QixjQUFjLENBQUMsbUJBQW1CLENBQ2pDLFNBQVMsQ0FBQyxZQUFZLEVBQ3RCLFNBQVMsQ0FBQyxLQUFLLEVBQ2YsTUFBTSxDQUFDLFVBQVUsRUFDakIsZUFBZSxDQUNmLENBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsK0NBQXVDLENBQUMsQ0FBQyxDQUFDO2dCQUN6QyxJQUFJLElBQUksd0NBQWdDLEVBQUUsQ0FBQztvQkFDMUMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDN0IsV0FBVyxDQUFDLGFBQWEsQ0FDeEIsY0FBYyxDQUFDLG1CQUFtQixDQUNqQyxTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsZUFBZSxDQUNmLENBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUM3QixXQUFXLENBQUMsY0FBYyxDQUN6QixjQUFjLENBQUMsbUJBQW1CLENBQ2pDLFNBQVMsQ0FBQyxZQUFZLEVBQ3RCLFNBQVMsQ0FBQyxLQUFLLEVBQ2YsTUFBTSxDQUFDLFVBQVUsRUFDakIsZUFBZSxDQUNmLENBQ0QsQ0FDRCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0Qsa0RBQTBDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxpREFBaUQ7Z0JBQ2pELE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDdEUsQ0FBQztZQUNELHdFQUFnRSxDQUFDLENBQUMsQ0FBQztnQkFDbEUsbUVBQW1FO2dCQUNuRSxPQUFPLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQ3JGLENBQUM7WUFDRCx5REFBaUQsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELGdEQUFnRDtnQkFDaEQsT0FBTyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUN6RSxDQUFDO1lBQ0QsZ0RBQXdDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQywyQ0FBMkM7Z0JBQzNDLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDdEUsQ0FBQztZQUNELHdFQUErRCxDQUFDLENBQUMsQ0FBQztnQkFDakUsa0VBQWtFO2dCQUNsRSxPQUFPLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBQ3BGLENBQUM7WUFDRDtnQkFDQyxPQUFPLElBQUksQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLFlBQVksQ0FDekIsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsU0FBdUMsRUFDdkMsZUFBd0IsRUFDeEIsS0FBYTtRQUViLE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFDLDZCQUE2QixFQUFFLENBQUE7UUFDbEUsTUFBTSxpQkFBaUIsR0FDdEIsU0FBUyxDQUFDLG9CQUFvQixDQUFDLDRCQUE0QixDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDOUUsUUFBUSxTQUFTLEVBQUUsQ0FBQztZQUNuQiw4Q0FBcUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZDLDREQUE0RDtnQkFDNUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUNuRCxTQUFTLENBQUMsS0FBSyxFQUNmLGlCQUFpQixFQUNqQixLQUFLLENBQ0wsQ0FBQTtnQkFDRCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNwRixPQUFPO29CQUNOLElBQUksQ0FBQyxvQkFBb0IsQ0FDeEIsU0FBUyxFQUNULE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDVixlQUFlLEVBQ2YsZUFBZSxFQUNmLFdBQVcsQ0FDWDtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUNELGlEQUF3QyxDQUFDLENBQUMsQ0FBQztnQkFDMUMsK0RBQStEO2dCQUMvRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQ2xELFNBQVMsQ0FBQyxLQUFLLEVBQ2YsaUJBQWlCLEVBQ2pCLEtBQUssQ0FDTCxDQUFBO2dCQUNELE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ3BGLE9BQU87b0JBQ04sSUFBSSxDQUFDLG9CQUFvQixDQUN4QixTQUFTLEVBQ1QsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUNWLGVBQWUsRUFDZixlQUFlLEVBQ2YsV0FBVyxDQUNYO2lCQUNELENBQUE7WUFDRixDQUFDO1lBQ0QsaURBQXdDLENBQUMsQ0FBQyxDQUFDO2dCQUMxQyxnREFBZ0Q7Z0JBQ2hELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQ2pDLENBQUMsaUJBQWlCLENBQUMsZUFBZSxHQUFHLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FDekUsQ0FBQTtnQkFDRCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUNwRixPQUFPO29CQUNOLElBQUksQ0FBQyxvQkFBb0IsQ0FDeEIsU0FBUyxFQUNULE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFDVixlQUFlLEVBQ2YsZUFBZSxFQUNmLFdBQVcsQ0FDWDtpQkFDRCxDQUFBO1lBQ0YsQ0FBQztZQUNELG9EQUEyQyxDQUFDLENBQUMsQ0FBQztnQkFDN0MseUNBQXlDO2dCQUN6QyxNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO2dCQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3BELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQywrQkFBK0IsQ0FDL0MsU0FBUyxFQUNULE1BQU0sRUFDTixnQkFBZ0IsRUFDaEIsZUFBZSxDQUNmLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRDtnQkFDQyxPQUFPLElBQUksQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLCtCQUErQixDQUM1QyxTQUFxQixFQUNyQixNQUFtQixFQUNuQixnQkFBdUIsRUFDdkIsZUFBd0I7UUFFeEIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFBO1FBRTNELElBQ0MsZ0JBQWdCLENBQUMsZUFBZSxJQUFJLGNBQWM7WUFDbEQsY0FBYyxJQUFJLGdCQUFnQixDQUFDLGFBQWEsR0FBRyxDQUFDLEVBQ25ELENBQUM7WUFDRix1Q0FBdUM7WUFDdkMsT0FBTyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM1RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksaUJBQXlCLENBQUE7WUFDN0IsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN6RCxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7aUJBQU0sSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQzlELGlCQUFpQixHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQTtZQUNyRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsaUJBQWlCLEdBQUcsY0FBYyxDQUFBO1lBQ25DLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUN2QyxTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsY0FBYyxFQUNkLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFDaEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsRUFDdkMsaUJBQWlCLEVBQ2pCLEtBQUssQ0FDTCxDQUFBO1lBQ0QsT0FBTyxXQUFXLENBQUMsYUFBYSxDQUMvQixNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDcEIsZUFBZSxFQUNmLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsUUFBUSxDQUFDLHNCQUFzQixDQUMvQixDQUNELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTSxDQUFDLHVCQUF1QixDQUNyQyxLQUF5QixFQUN6QixLQUFZLEVBQ1osS0FBYTtRQUViLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUE7UUFDM0MsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ25FLGtGQUFrRjtZQUNsRixlQUFlLEVBQUUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsZUFBZSxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNsRSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsc0JBQXNCLENBQ3BDLEtBQXlCLEVBQ3pCLEtBQVksRUFDWixLQUFhO1FBRWIsSUFBSSxlQUFlLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQTtRQUMzQyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssS0FBSyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDbkUsa0ZBQWtGO1lBQ2xGLGVBQWUsRUFBRSxDQUFBO1FBQ2xCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFTyxNQUFNLENBQUMsU0FBUyxDQUN2QixTQUFxQixFQUNyQixPQUFzQixFQUN0QixlQUF3QixFQUN4QixXQUFtQjtRQUVuQixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUM3QixXQUFXLENBQUMsYUFBYSxDQUN4QixjQUFjLENBQUMsUUFBUSxDQUN0QixTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsZUFBZSxFQUNmLFdBQVcsQ0FDWCxDQUNELENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxNQUFNLENBQUMsaUJBQWlCLENBQy9CLFNBQXFCLEVBQ3JCLE9BQXNCLEVBQ3RCLGVBQXdCO1FBRXhCLE1BQU0sTUFBTSxHQUF5QixFQUFFLENBQUE7UUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7WUFDM0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3hFLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUNwQyxjQUFjLENBQUMsUUFBUSxDQUN0QixTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsZUFBZSxFQUNmLFFBQVEsQ0FDUixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sTUFBTSxDQUFDLFVBQVUsQ0FDeEIsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0IsRUFDeEIsV0FBbUI7UUFFbkIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FDN0IsV0FBVyxDQUFDLGFBQWEsQ0FDeEIsY0FBYyxDQUFDLFNBQVMsQ0FDdkIsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxFQUNULE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLGVBQWUsRUFDZixXQUFXLENBQ1gsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUNoQyxTQUFxQixFQUNyQixPQUFzQixFQUN0QixlQUF3QjtRQUV4QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFBO1lBQzNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FDcEMsY0FBYyxDQUFDLFNBQVMsQ0FDdkIsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxFQUNULE1BQU0sQ0FBQyxTQUFTLEVBQ2hCLGVBQWUsRUFDZixRQUFRLENBQ1IsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDbEMsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0IsRUFDeEIsVUFBa0I7UUFFbEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsYUFBYSxDQUNwQyxjQUFjLENBQUMsUUFBUSxDQUN0QixTQUFTLENBQUMsWUFBWSxFQUN0QixTQUFTLEVBQ1QsTUFBTSxDQUFDLFNBQVMsRUFDaEIsZUFBZSxFQUNmLFVBQVUsQ0FDVixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sTUFBTSxDQUFDLHFCQUFxQixDQUNuQyxTQUFxQixFQUNyQixPQUFzQixFQUN0QixlQUF3QixFQUN4QixVQUFrQjtRQUVsQixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxjQUFjLENBQ3JDLGNBQWMsQ0FBQyxRQUFRLENBQ3RCLFNBQVMsQ0FBQyxZQUFZLEVBQ3RCLFNBQVMsQ0FBQyxLQUFLLEVBQ2YsTUFBTSxDQUFDLFVBQVUsRUFDakIsZUFBZSxFQUNmLFVBQVUsQ0FDVixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sTUFBTSxDQUFDLGtCQUFrQixDQUNoQyxTQUFxQixFQUNyQixPQUFzQixFQUN0QixlQUF3QixFQUN4QixVQUFrQjtRQUVsQixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQ3BDLGNBQWMsQ0FBQyxNQUFNLENBQ3BCLFNBQVMsQ0FBQyxZQUFZLEVBQ3RCLFNBQVMsRUFDVCxNQUFNLENBQUMsU0FBUyxFQUNoQixlQUFlLEVBQ2YsVUFBVSxDQUNWLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxNQUFNLENBQUMsbUJBQW1CLENBQ2pDLFNBQXFCLEVBQ3JCLE9BQXNCLEVBQ3RCLGVBQXdCLEVBQ3hCLFVBQWtCO1FBRWxCLE1BQU0sTUFBTSxHQUF5QixFQUFFLENBQUE7UUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FDckMsY0FBYyxDQUFDLE1BQU0sQ0FDcEIsU0FBUyxDQUFDLFlBQVksRUFDdEIsU0FBUyxDQUFDLEtBQUssRUFDZixNQUFNLENBQUMsVUFBVSxFQUNqQixlQUFlLEVBQ2YsVUFBVSxDQUNWLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxNQUFNLENBQUMsbUJBQW1CLENBQ2pDLFNBQXFCLEVBQ3JCLE1BQW1CLEVBQ25CLGVBQXdCLEVBQ3hCLGdCQUF3QixFQUN4QixZQUFvQjtRQUVwQixPQUFPLFdBQVcsQ0FBQyxhQUFhLENBQy9CLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQ3pFLENBQUE7SUFDRixDQUFDO0lBRU8sTUFBTSxDQUFDLG9CQUFvQixDQUNsQyxTQUFxQixFQUNyQixNQUFtQixFQUNuQixlQUF3QixFQUN4QixpQkFBeUIsRUFDekIsYUFBcUI7UUFFckIsT0FBTyxXQUFXLENBQUMsY0FBYyxDQUNoQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUM1RSxDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDbEMsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtZQUMzRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbkMsU0FBUyxFQUNULE1BQU0sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FDakQsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtZQUMzRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsK0JBQStCLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDNUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbkMsU0FBUyxFQUNULE1BQU0sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyx1QkFBdUIsQ0FDckMsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtZQUMzRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUM1QixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQ3hGLENBQUMsQ0FDRixDQUFBO1lBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbkMsU0FBUyxFQUNULE1BQU0sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDbEMsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtZQUMzRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbkMsU0FBUyxFQUNULE1BQU0sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxrQ0FBa0MsQ0FDaEQsU0FBcUIsRUFDckIsT0FBc0IsRUFDdEIsZUFBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQXlCLEVBQUUsQ0FBQTtRQUN2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtZQUMzRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsOEJBQThCLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDM0UsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FDbkMsU0FBUyxFQUNULE1BQU0sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEO0FBRUQsTUFBTSxLQUFXLFVBQVUsQ0FzUjFCO0FBdFJELFdBQWlCLFVBQVU7SUFDMUIsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLEdBQVE7UUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBaUIsR0FBRyxDQUFBO1FBRXZDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDeEYsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvRSxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JGLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQyxDQUFBO0lBRVksbUJBQVEsR0FBcUI7UUFDekMsV0FBVyxFQUFFLCtDQUErQztRQUM1RCxJQUFJLEVBQUU7WUFDTDtnQkFDQyxJQUFJLEVBQUUsNkJBQTZCO2dCQUNuQyxXQUFXLEVBQUU7Ozs7Ozs7Ozs7Ozs7O0tBY1o7Z0JBQ0QsVUFBVSxFQUFFLGdCQUFnQjtnQkFDNUIsTUFBTSxFQUFFO29CQUNQLElBQUksRUFBRSxRQUFRO29CQUNkLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQztvQkFDaEIsVUFBVSxFQUFFO3dCQUNYLEVBQUUsRUFBRTs0QkFDSCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUU7Z0NBQ0wsTUFBTTtnQ0FDTixPQUFPO2dDQUNQLElBQUk7Z0NBQ0osTUFBTTtnQ0FDTixlQUFlO2dDQUNmLGVBQWU7Z0NBQ2Ysa0JBQWtCO2dDQUNsQixnQkFBZ0I7Z0NBQ2hCLHlCQUF5QjtnQ0FDekIsd0NBQXdDO2dDQUN4Qyx1Q0FBdUM7Z0NBQ3ZDLGFBQWE7Z0NBQ2IsZ0JBQWdCO2dDQUNoQixnQkFBZ0I7Z0NBQ2hCLG1CQUFtQjs2QkFDbkI7eUJBQ0Q7d0JBQ0QsRUFBRSxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQzt5QkFDdEQ7d0JBQ0QsS0FBSyxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLE9BQU8sRUFBRSxDQUFDO3lCQUNWO3dCQUNELE1BQU0sRUFBRTs0QkFDUCxJQUFJLEVBQUUsU0FBUzs0QkFDZixPQUFPLEVBQUUsS0FBSzt5QkFDZDtxQkFDRDtpQkFDRDthQUNEO1NBQ0Q7S0FDRCxDQUFBO0lBRUQ7O09BRUc7SUFDVSx1QkFBWSxHQUFHO1FBQzNCLElBQUksRUFBRSxNQUFNO1FBQ1osS0FBSyxFQUFFLE9BQU87UUFDZCxFQUFFLEVBQUUsSUFBSTtRQUNSLElBQUksRUFBRSxNQUFNO1FBRVosYUFBYSxFQUFFLGVBQWU7UUFDOUIsYUFBYSxFQUFFLGVBQWU7UUFFOUIsZ0JBQWdCLEVBQUUsa0JBQWtCO1FBQ3BDLHNDQUFzQyxFQUFFLHdDQUF3QztRQUNoRix1QkFBdUIsRUFBRSx5QkFBeUI7UUFDbEQsY0FBYyxFQUFFLGdCQUFnQjtRQUNoQyxxQ0FBcUMsRUFBRSx1Q0FBdUM7UUFFOUUsV0FBVyxFQUFFLGFBQWE7UUFDMUIsY0FBYyxFQUFFLGdCQUFnQjtRQUNoQyxjQUFjLEVBQUUsZ0JBQWdCO1FBRWhDLGlCQUFpQixFQUFFLG1CQUFtQjtLQUN0QyxDQUFBO0lBRUQ7O09BRUc7SUFDVSxrQkFBTyxHQUFHO1FBQ3RCLElBQUksRUFBRSxNQUFNO1FBQ1osV0FBVyxFQUFFLGFBQWE7UUFDMUIsU0FBUyxFQUFFLFdBQVc7UUFDdEIsUUFBUSxFQUFFLFVBQVU7S0FDcEIsQ0FBQTtJQVlELFNBQWdCLEtBQUssQ0FBQyxJQUEyQjtRQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2Qsb0JBQW9CO1lBQ3BCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELElBQUksU0FBb0IsQ0FBQTtRQUN4QixRQUFRLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQixLQUFLLFdBQUEsWUFBWSxDQUFDLElBQUk7Z0JBQ3JCLFNBQVMseUJBQWlCLENBQUE7Z0JBQzFCLE1BQUs7WUFDTixLQUFLLFdBQUEsWUFBWSxDQUFDLEtBQUs7Z0JBQ3RCLFNBQVMsMEJBQWtCLENBQUE7Z0JBQzNCLE1BQUs7WUFDTixLQUFLLFdBQUEsWUFBWSxDQUFDLEVBQUU7Z0JBQ25CLFNBQVMsdUJBQWUsQ0FBQTtnQkFDeEIsTUFBSztZQUNOLEtBQUssV0FBQSxZQUFZLENBQUMsSUFBSTtnQkFDckIsU0FBUyx5QkFBaUIsQ0FBQTtnQkFDMUIsTUFBSztZQUNOLEtBQUssV0FBQSxZQUFZLENBQUMsYUFBYTtnQkFDOUIsU0FBUyxrQ0FBMEIsQ0FBQTtnQkFDbkMsTUFBSztZQUNOLEtBQUssV0FBQSxZQUFZLENBQUMsYUFBYTtnQkFDOUIsU0FBUyxrQ0FBMEIsQ0FBQTtnQkFDbkMsTUFBSztZQUNOLEtBQUssV0FBQSxZQUFZLENBQUMsZ0JBQWdCO2dCQUNqQyxTQUFTLHFDQUE2QixDQUFBO2dCQUN0QyxNQUFLO1lBQ04sS0FBSyxXQUFBLFlBQVksQ0FBQyxzQ0FBc0M7Z0JBQ3ZELFNBQVMsMkRBQW1ELENBQUE7Z0JBQzVELE1BQUs7WUFDTixLQUFLLFdBQUEsWUFBWSxDQUFDLHVCQUF1QjtnQkFDeEMsU0FBUyw0Q0FBb0MsQ0FBQTtnQkFDN0MsTUFBSztZQUNOLEtBQUssV0FBQSxZQUFZLENBQUMsY0FBYztnQkFDL0IsU0FBUyxtQ0FBMkIsQ0FBQTtnQkFDcEMsTUFBSztZQUNOLEtBQUssV0FBQSxZQUFZLENBQUMscUNBQXFDO2dCQUN0RCxTQUFTLDJEQUFrRCxDQUFBO2dCQUMzRCxNQUFLO1lBQ04sS0FBSyxXQUFBLFlBQVksQ0FBQyxXQUFXO2dCQUM1QixTQUFTLGlDQUF3QixDQUFBO2dCQUNqQyxNQUFLO1lBQ04sS0FBSyxXQUFBLFlBQVksQ0FBQyxjQUFjO2dCQUMvQixTQUFTLG9DQUEyQixDQUFBO2dCQUNwQyxNQUFLO1lBQ04sS0FBSyxXQUFBLFlBQVksQ0FBQyxjQUFjO2dCQUMvQixTQUFTLG9DQUEyQixDQUFBO2dCQUNwQyxNQUFLO1lBQ04sS0FBSyxXQUFBLFlBQVksQ0FBQyxpQkFBaUI7Z0JBQ2xDLFNBQVMsdUNBQThCLENBQUE7Z0JBQ3ZDLE1BQUs7WUFDTjtnQkFDQyxvQkFBb0I7Z0JBQ3BCLE9BQU8sSUFBSSxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxvQkFBWSxDQUFBO1FBQ3BCLFFBQVEsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pCLEtBQUssV0FBQSxPQUFPLENBQUMsSUFBSTtnQkFDaEIsSUFBSSxvQkFBWSxDQUFBO2dCQUNoQixNQUFLO1lBQ04sS0FBSyxXQUFBLE9BQU8sQ0FBQyxXQUFXO2dCQUN2QixJQUFJLDJCQUFtQixDQUFBO2dCQUN2QixNQUFLO1lBQ04sS0FBSyxXQUFBLE9BQU8sQ0FBQyxTQUFTO2dCQUNyQixJQUFJLHlCQUFpQixDQUFBO2dCQUNyQixNQUFLO1lBQ04sS0FBSyxXQUFBLE9BQU8sQ0FBQyxRQUFRO2dCQUNwQixJQUFJLHdCQUFnQixDQUFBO2dCQUNwQixNQUFLO1FBQ1AsQ0FBQztRQUVELE9BQU87WUFDTixTQUFTLEVBQUUsU0FBUztZQUNwQixJQUFJLEVBQUUsSUFBSTtZQUNWLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU07WUFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQztTQUN0QixDQUFBO0lBQ0YsQ0FBQztJQWhGZSxnQkFBSyxRQWdGcEIsQ0FBQTtJQWdCRCxJQUFrQixTQW1CakI7SUFuQkQsV0FBa0IsU0FBUztRQUMxQix5Q0FBSSxDQUFBO1FBQ0osMkNBQUssQ0FBQTtRQUNMLHFDQUFFLENBQUE7UUFDRix5Q0FBSSxDQUFBO1FBQ0osMkRBQWEsQ0FBQTtRQUNiLDJEQUFhLENBQUE7UUFFYixpRUFBZ0IsQ0FBQTtRQUNoQiw2R0FBc0MsQ0FBQTtRQUN0QywrRUFBdUIsQ0FBQTtRQUN2Qiw2REFBYyxDQUFBO1FBQ2QsNEdBQXFDLENBQUE7UUFFckMsd0RBQVcsQ0FBQTtRQUNYLDhEQUFjLENBQUE7UUFDZCw4REFBYyxDQUFBO1FBRWQsb0VBQWlCLENBQUE7SUFDbEIsQ0FBQyxFQW5CaUIsU0FBUyxHQUFULG9CQUFTLEtBQVQsb0JBQVMsUUFtQjFCO0lBcUJELElBQWtCLElBTWpCO0lBTkQsV0FBa0IsSUFBSTtRQUNyQiwrQkFBSSxDQUFBO1FBQ0osK0JBQUksQ0FBQTtRQUNKLDZDQUFXLENBQUE7UUFDWCx5Q0FBUyxDQUFBO1FBQ1QsdUNBQVEsQ0FBQTtJQUNULENBQUMsRUFOaUIsSUFBSSxHQUFKLGVBQUksS0FBSixlQUFJLFFBTXJCO0FBQ0YsQ0FBQyxFQXRSZ0IsVUFBVSxLQUFWLFVBQVUsUUFzUjFCIn0=