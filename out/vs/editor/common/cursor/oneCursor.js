/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CursorState, SingleCursorState, } from '../cursorCommon.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
/**
 * Represents a single cursor.
 */
export class Cursor {
    constructor(context) {
        this._selTrackedRange = null;
        this._trackSelection = true;
        this._setState(context, new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(1, 1), 0), new SingleCursorState(new Range(1, 1, 1, 1), 0 /* SelectionStartKind.Simple */, 0, new Position(1, 1), 0));
    }
    dispose(context) {
        this._removeTrackedRange(context);
    }
    startTrackingSelection(context) {
        this._trackSelection = true;
        this._updateTrackedRange(context);
    }
    stopTrackingSelection(context) {
        this._trackSelection = false;
        this._removeTrackedRange(context);
    }
    _updateTrackedRange(context) {
        if (!this._trackSelection) {
            // don't track the selection
            return;
        }
        this._selTrackedRange = context.model._setTrackedRange(this._selTrackedRange, this.modelState.selection, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */);
    }
    _removeTrackedRange(context) {
        this._selTrackedRange = context.model._setTrackedRange(this._selTrackedRange, null, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */);
    }
    asCursorState() {
        return new CursorState(this.modelState, this.viewState);
    }
    readSelectionFromMarkers(context) {
        const range = context.model._getTrackedRange(this._selTrackedRange);
        if (this.modelState.selection.isEmpty() && !range.isEmpty()) {
            // Avoid selecting text when recovering from markers
            return Selection.fromRange(range.collapseToEnd(), this.modelState.selection.getDirection());
        }
        return Selection.fromRange(range, this.modelState.selection.getDirection());
    }
    ensureValidState(context) {
        this._setState(context, this.modelState, this.viewState);
    }
    setState(context, modelState, viewState) {
        this._setState(context, modelState, viewState);
    }
    static _validatePositionWithCache(viewModel, position, cacheInput, cacheOutput) {
        if (position.equals(cacheInput)) {
            return cacheOutput;
        }
        return viewModel.normalizePosition(position, 2 /* PositionAffinity.None */);
    }
    static _validateViewState(viewModel, viewState) {
        const position = viewState.position;
        const sStartPosition = viewState.selectionStart.getStartPosition();
        const sEndPosition = viewState.selectionStart.getEndPosition();
        const validPosition = viewModel.normalizePosition(position, 2 /* PositionAffinity.None */);
        const validSStartPosition = this._validatePositionWithCache(viewModel, sStartPosition, position, validPosition);
        const validSEndPosition = this._validatePositionWithCache(viewModel, sEndPosition, sStartPosition, validSStartPosition);
        if (position.equals(validPosition) &&
            sStartPosition.equals(validSStartPosition) &&
            sEndPosition.equals(validSEndPosition)) {
            // fast path: the state is valid
            return viewState;
        }
        return new SingleCursorState(Range.fromPositions(validSStartPosition, validSEndPosition), viewState.selectionStartKind, viewState.selectionStartLeftoverVisibleColumns +
            sStartPosition.column -
            validSStartPosition.column, validPosition, viewState.leftoverVisibleColumns + position.column - validPosition.column);
    }
    _setState(context, modelState, viewState) {
        if (viewState) {
            viewState = Cursor._validateViewState(context.viewModel, viewState);
        }
        if (!modelState) {
            if (!viewState) {
                return;
            }
            // We only have the view state => compute the model state
            const selectionStart = context.model.validateRange(context.coordinatesConverter.convertViewRangeToModelRange(viewState.selectionStart));
            const position = context.model.validatePosition(context.coordinatesConverter.convertViewPositionToModelPosition(viewState.position));
            modelState = new SingleCursorState(selectionStart, viewState.selectionStartKind, viewState.selectionStartLeftoverVisibleColumns, position, viewState.leftoverVisibleColumns);
        }
        else {
            // Validate new model state
            const selectionStart = context.model.validateRange(modelState.selectionStart);
            const selectionStartLeftoverVisibleColumns = modelState.selectionStart.equalsRange(selectionStart)
                ? modelState.selectionStartLeftoverVisibleColumns
                : 0;
            const position = context.model.validatePosition(modelState.position);
            const leftoverVisibleColumns = modelState.position.equals(position)
                ? modelState.leftoverVisibleColumns
                : 0;
            modelState = new SingleCursorState(selectionStart, modelState.selectionStartKind, selectionStartLeftoverVisibleColumns, position, leftoverVisibleColumns);
        }
        if (!viewState) {
            // We only have the model state => compute the view state
            const viewSelectionStart1 = context.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelState.selectionStart.startLineNumber, modelState.selectionStart.startColumn));
            const viewSelectionStart2 = context.coordinatesConverter.convertModelPositionToViewPosition(new Position(modelState.selectionStart.endLineNumber, modelState.selectionStart.endColumn));
            const viewSelectionStart = new Range(viewSelectionStart1.lineNumber, viewSelectionStart1.column, viewSelectionStart2.lineNumber, viewSelectionStart2.column);
            const viewPosition = context.coordinatesConverter.convertModelPositionToViewPosition(modelState.position);
            viewState = new SingleCursorState(viewSelectionStart, modelState.selectionStartKind, modelState.selectionStartLeftoverVisibleColumns, viewPosition, modelState.leftoverVisibleColumns);
        }
        else {
            // Validate new view state
            const viewSelectionStart = context.coordinatesConverter.validateViewRange(viewState.selectionStart, modelState.selectionStart);
            const viewPosition = context.coordinatesConverter.validateViewPosition(viewState.position, modelState.position);
            viewState = new SingleCursorState(viewSelectionStart, modelState.selectionStartKind, modelState.selectionStartLeftoverVisibleColumns, viewPosition, modelState.leftoverVisibleColumns);
        }
        this.modelState = modelState;
        this.viewState = viewState;
        this._updateTrackedRange(context);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25lQ3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3Ivb25lQ3Vyc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixXQUFXLEVBR1gsaUJBQWlCLEdBQ2pCLE1BQU0sb0JBQW9CLENBQUE7QUFFM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFHaEQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sTUFBTTtJQU9sQixZQUFZLE9BQXNCO1FBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFFM0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLEVBQ1AsSUFBSSxpQkFBaUIsQ0FDcEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHFDQUVyQixDQUFDLEVBQ0QsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixDQUFDLENBQ0QsRUFDRCxJQUFJLGlCQUFpQixDQUNwQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMscUNBRXJCLENBQUMsRUFDRCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRU0sT0FBTyxDQUFDLE9BQXNCO1FBQ3BDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJ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