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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25lQ3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9vbmVDdXJzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLFdBQVcsRUFHWCxpQkFBaUIsR0FDakIsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUdoRDs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFNO0lBT2xCLFlBQVksT0FBc0I7UUFDakMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQTtRQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUUzQixJQUFJLENBQUMsU0FBUyxDQUNiLE9BQU8sRUFDUCxJQUFJLGlCQUFpQixDQUNwQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMscUNBRXJCLENBQUMsRUFDRCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsQ0FDRCxFQUNELElBQUksaUJBQWlCLENBQ3BCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxxQ0FFckIsQ0FBQyxFQUNELElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsQ0FBQyxDQUNELENBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTSxPQUFPLENBQUMsT0FBc0I7UUFDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxD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