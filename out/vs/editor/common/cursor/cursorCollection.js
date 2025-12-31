/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy } from '../../../base/common/arrays.js';
import { findLastMax, findFirstMin } from '../../../base/common/arraysFind.js';
import { CursorState } from '../cursorCommon.js';
import { Cursor } from './oneCursor.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
export class CursorCollection {
    constructor(context) {
        this.context = context;
        this.cursors = [new Cursor(context)];
        this.lastAddedCursorIndex = 0;
    }
    dispose() {
        for (const cursor of this.cursors) {
            cursor.dispose(this.context);
        }
    }
    startTrackingSelections() {
        for (const cursor of this.cursors) {
            cursor.startTrackingSelection(this.context);
        }
    }
    stopTrackingSelections() {
        for (const cursor of this.cursors) {
            cursor.stopTrackingSelection(this.context);
        }
    }
    updateContext(context) {
        this.context = context;
    }
    ensureValidState() {
        for (const cursor of this.cursors) {
            cursor.ensureValidState(this.context);
        }
    }
    readSelectionFromMarkers() {
        return this.cursors.map((c) => c.readSelectionFromMarkers(this.context));
    }
    getAll() {
        return this.cursors.map((c) => c.asCursorState());
    }
    getViewPositions() {
        return this.cursors.map((c) => c.viewState.position);
    }
    getTopMostViewPosition() {
        return findFirstMin(this.cursors, compareBy((c) => c.viewState.position, Position.compare)).viewState.position;
    }
    getBottomMostViewPosition() {
        return findLastMax(this.cursors, compareBy((c) => c.viewState.position, Position.compare)).viewState.position;
    }
    getSelections() {
        return this.cursors.map((c) => c.modelState.selection);
    }
    getViewSelections() {
        return this.cursors.map((c) => c.viewState.selection);
    }
    setSelections(selections) {
        this.setStates(CursorState.fromModelSelections(selections));
    }
    getPrimaryCursor() {
        return this.cursors[0].asCursorState();
    }
    setStates(states) {
        if (states === null) {
            return;
        }
        this.cursors[0].setState(this.context, states[0].modelState, states[0].viewState);
        this._setSecondaryStates(states.slice(1));
    }
    /**
     * Creates or disposes secondary cursors as necessary to match the number of `secondarySelections`.
     */
    _setSecondaryStates(secondaryStates) {
        const secondaryCursorsLength = this.cursors.length - 1;
        const secondaryStatesLength = secondaryStates.length;
        if (secondaryCursorsLength < secondaryStatesLength) {
            const createCnt = secondaryStatesLength - secondaryCursorsLength;
            for (let i = 0; i < createCnt; i++) {
                this._addSecondaryCursor();
            }
        }
        else if (secondaryCursorsLength > secondaryStatesLength) {
            const removeCnt = secondaryCursorsLength - secondaryStatesLength;
            for (let i = 0; i < removeCnt; i++) {
                this._removeSecondaryCursor(this.cursors.length - 2);
            }
        }
        for (let i = 0; i < secondaryStatesLength; i++) {
            this.cursors[i + 1].setState(this.context, secondaryStates[i].modelState, secondaryStates[i].viewState);
        }
    }
    killSecondaryCursors() {
        this._setSecondaryStates([]);
    }
    _addSecondaryCursor() {
        this.cursors.push(new Cursor(this.context));
        this.lastAddedCursorIndex = this.cursors.length - 1;
    }
    getLastAddedCursorIndex() {
        if (this.cursors.length === 1 || this.lastAddedCursorIndex === 0) {
            return 0;
        }
        return this.lastAddedCursorIndex;
    }
    _removeSecondaryCursor(removeIndex) {
        if (this.lastAddedCursorIndex >= removeIndex + 1) {
            this.lastAddedCursorIndex--;
        }
        this.cursors[removeIndex + 1].dispose(this.context);
        this.cursors.splice(removeIndex + 1, 1);
    }
    normalize() {
        if (this.cursors.length === 1) {
            return;
        }
        const cursors = this.cursors.slice(0);
        const sortedCursors = [];
        for (let i = 0, len = cursors.length; i < len; i++) {
            sortedCursors.push({
                index: i,
                selection: cursors[i].modelState.selection,
            });
        }
        sortedCursors.sort(compareBy((s) => s.selection, Range.compareRangesUsingStarts));
        for (let sortedCursorIndex = 0; sortedCursorIndex < sortedCursors.length - 1; sortedCursorIndex++) {
            const current = sortedCursors[sortedCursorIndex];
            const next = sortedCursors[sortedCursorIndex + 1];
            const currentSelection = current.selection;
            const nextSelection = next.selection;
            if (!this.context.cursorConfig.multiCursorMergeOverlapping) {
                continue;
            }
            let shouldMergeCursors;
            if (nextSelection.isEmpty() || currentSelection.isEmpty()) {
                // Merge touching cursors if one of them is collapsed
                shouldMergeCursors = nextSelection
                    .getStartPosition()
                    .isBeforeOrEqual(currentSelection.getEndPosition());
            }
            else {
                // Merge only overlapping cursors (i.e. allow touching ranges)
                shouldMergeCursors = nextSelection
                    .getStartPosition()
                    .isBefore(currentSelection.getEndPosition());
            }
            if (shouldMergeCursors) {
                const winnerSortedCursorIndex = current.index < next.index ? sortedCursorIndex : sortedCursorIndex + 1;
                const looserSortedCursorIndex = current.index < next.index ? sortedCursorIndex + 1 : sortedCursorIndex;
                const looserIndex = sortedCursors[looserSortedCursorIndex].index;
                const winnerIndex = sortedCursors[winnerSortedCursorIndex].index;
                const looserSelection = sortedCursors[looserSortedCursorIndex].selection;
                const winnerSelection = sortedCursors[winnerSortedCursorIndex].selection;
                if (!looserSelection.equalsSelection(winnerSelection)) {
                    const resultingRange = looserSelection.plusRange(winnerSelection);
                    const looserSelectionIsLTR = looserSelection.selectionStartLineNumber === looserSelection.startLineNumber &&
                        looserSelection.selectionStartColumn === looserSelection.startColumn;
                    const winnerSelectionIsLTR = winnerSelection.selectionStartLineNumber === winnerSelection.startLineNumber &&
                        winnerSelection.selectionStartColumn === winnerSelection.startColumn;
                    // Give more importance to the last added cursor (think Ctrl-dragging + hitting another cursor)
                    let resultingSelectionIsLTR;
                    if (looserIndex === this.lastAddedCursorIndex) {
                        resultingSelectionIsLTR = looserSelectionIsLTR;
                        this.lastAddedCursorIndex = winnerIndex;
                    }
                    else {
                        // Winner takes it all
                        resultingSelectionIsLTR = winnerSelectionIsLTR;
                    }
                    let resultingSelection;
                    if (resultingSelectionIsLTR) {
                        resultingSelection = new Selection(resultingRange.startLineNumber, resultingRange.startColumn, resultingRange.endLineNumber, resultingRange.endColumn);
                    }
                    else {
                        resultingSelection = new Selection(resultingRange.endLineNumber, resultingRange.endColumn, resultingRange.startLineNumber, resultingRange.startColumn);
                    }
                    sortedCursors[winnerSortedCursorIndex].selection = resultingSelection;
                    const resultingState = CursorState.fromModelSelection(resultingSelection);
                    cursors[winnerIndex].setState(this.context, resultingState.modelState, resultingState.viewState);
                }
                for (const sortedCursor of sortedCursors) {
                    if (sortedCursor.index > looserIndex) {
                        sortedCursor.index--;
                    }
                }
                cursors.splice(looserIndex, 1);
                sortedCursors.splice(looserSortedCursorIndex, 1);
                this._removeSecondaryCursor(looserIndex - 1);
                sortedCursorIndex--;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvckNvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBc0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN4QyxPQUFPLEVBQWMsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFNUQsTUFBTSxPQUFPLGdCQUFnQjtJQWE1QixZQUFZLE9BQXNCO1FBQ2pDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3RCLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVNLE9BQU87UUFDYixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM3QixDQUFDO0lBQ0YsQ0FBQztJQUVNLHVCQUF1QjtRQUM3QixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNu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