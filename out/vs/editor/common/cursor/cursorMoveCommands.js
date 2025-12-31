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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yTW92ZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxLQUFLLE1BQU0sK0JBQStCLENBQUE7QUFDdEQsT0FBTyxFQUNOLFdBQVcsRUFJWCxpQkFBaUIsR0FDakIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzFELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFJeEMsTUFBTSxPQUFPLGtCQUFrQjtJQUN2QixNQUFNLENBQUMsYUFBYSxDQUMxQixTQUFxQixFQUNyQixPQUFzQixFQUN0QixjQUF1QjtRQUV2QixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1FBQ3ZDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDcEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFFLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLE1BQU0sQ0FB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