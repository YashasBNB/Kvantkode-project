/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { DetailedLineRangeMapping } from './mapping.js';
import { LineRangeEdit } from './editing.js';
import { LineRange } from './lineRange.js';
import { ReentrancyBarrier } from '../../../../../base/common/controlFlow.js';
import { autorun, observableSignal, observableValue, transaction, } from '../../../../../base/common/observable.js';
export class TextModelDiffs extends Disposable {
    get isApplyingChange() {
        return this._barrier.isOccupied;
    }
    constructor(baseTextModel, textModel, diffComputer) {
        super();
        this.baseTextModel = baseTextModel;
        this.textModel = textModel;
        this.diffComputer = diffComputer;
        this._recomputeCount = 0;
        this._state = observableValue(this, 1 /* TextModelDiffState.initializing */);
        this._diffs = observableValue(this, []);
        this._barrier = new ReentrancyBarrier();
        this._isDisposed = false;
        this._isInitializing = true;
        const recomputeSignal = observableSignal('recompute');
        this._register(autorun((reader) => {
            /** @description Update diff state */
            recomputeSignal.read(reader);
            this._recompute(reader);
        }));
        this._register(baseTextModel.onDidChangeContent(this._barrier.makeExclusiveOrSkip(() => {
            recomputeSignal.trigger(undefined);
        })));
        this._register(textModel.onDidChangeContent(this._barrier.makeExclusiveOrSkip(() => {
            recomputeSignal.trigger(undefined);
        })));
        this._register(toDisposable(() => {
            this._isDisposed = true;
        }));
    }
    get state() {
        return this._state;
    }
    /**
     * Diffs from base to input.
     */
    get diffs() {
        return this._diffs;
    }
    _recompute(reader) {
        this._recomputeCount++;
        const currentRecomputeIdx = this._recomputeCount;
        if (this._state.get() === 1 /* TextModelDiffState.initializing */) {
            this._isInitializing = true;
        }
        transaction((tx) => {
            /** @description Starting Diff Computation. */
            this._state.set(this._isInitializing ? 1 /* TextModelDiffState.initializing */ : 3 /* TextModelDiffState.updating */, tx, 0 /* TextModelDiffChangeReason.other */);
        });
        const result = this.diffComputer.computeDiff(this.baseTextModel, this.textModel, reader);
        result.then((result) => {
            if (this._isDisposed) {
                return;
            }
            if (currentRecomputeIdx !== this._recomputeCount) {
                // There is a newer recompute call
                return;
            }
            transaction((tx) => {
                /** @description Completed Diff Computation */
                if (result.diffs) {
                    this._state.set(2 /* TextModelDiffState.upToDate */, tx, 1 /* TextModelDiffChangeReason.textChange */);
                    this._diffs.set(result.diffs, tx, 1 /* TextModelDiffChangeReason.textChange */);
                }
                else {
                    this._state.set(4 /* TextModelDiffState.error */, tx, 1 /* TextModelDiffChangeReason.textChange */);
                }
                this._isInitializing = false;
            });
        });
    }
    ensureUpToDate() {
        if (this.state.get() !== 2 /* TextModelDiffState.upToDate */) {
            throw new BugIndicatingError('Cannot remove diffs when the model is not up to date');
        }
    }
    removeDiffs(diffToRemoves, transaction, group) {
        this.ensureUpToDate();
        diffToRemoves.sort(compareBy((d) => d.inputRange.startLineNumber, numberComparator));
        diffToRemoves.reverse();
        let diffs = this._diffs.get();
        for (const diffToRemove of diffToRemoves) {
            // TODO improve performance
            const len = diffs.length;
            diffs = diffs.filter((d) => d !== diffToRemove);
            if (len === diffs.length) {
                throw new BugIndicatingError();
            }
            this._barrier.runExclusivelyOrThrow(() => {
                const edits = diffToRemove.getReverseLineEdit().toEdits(this.textModel.getLineCount());
                this.textModel.pushEditOperations(null, edits, () => null, group);
            });
            diffs = diffs.map((d) => d.outputRange.isAfter(diffToRemove.outputRange)
                ? d.addOutputLineDelta(diffToRemove.inputRange.lineCount - diffToRemove.outputRange.lineCount)
                : d);
        }
        this._diffs.set(diffs, transaction, 0 /* TextModelDiffChangeReason.other */);
    }
    /**
     * Edit must be conflict free.
     */
    applyEditRelativeToOriginal(edit, transaction, group) {
        this.ensureUpToDate();
        const editMapping = new DetailedLineRangeMapping(edit.range, this.baseTextModel, new LineRange(edit.range.startLineNumber, edit.newLines.length), this.textModel);
        let firstAfter = false;
        let delta = 0;
        const newDiffs = new Array();
        for (const diff of this.diffs.get()) {
            if (diff.inputRange.touches(edit.range)) {
                throw new BugIndicatingError('Edit must be conflict free.');
            }
            else if (diff.inputRange.isAfter(edit.range)) {
                if (!firstAfter) {
                    firstAfter = true;
                    newDiffs.push(editMapping.addOutputLineDelta(delta));
                }
                newDiffs.push(diff.addOutputLineDelta(edit.newLines.length - edit.range.lineCount));
            }
            else {
                newDiffs.push(diff);
            }
            if (!firstAfter) {
                delta += diff.outputRange.lineCount - diff.inputRange.lineCount;
            }
        }
        if (!firstAfter) {
            firstAfter = true;
            newDiffs.push(editMapping.addOutputLineDelta(delta));
        }
        this._barrier.runExclusivelyOrThrow(() => {
            const edits = new LineRangeEdit(edit.range.delta(delta), edit.newLines).toEdits(this.textModel.getLineCount());
            this.textModel.pushEditOperations(null, edits, () => null, group);
        });
        this._diffs.set(newDiffs, transaction, 0 /* TextModelDiffChangeReason.other */);
    }
    findTouchingDiffs(baseRange) {
        return this.diffs.get().filter((d) => d.inputRange.touches(baseRange));
    }
    getResultLine(lineNumber, reader) {
        let offset = 0;
        const diffs = reader ? this.diffs.read(reader) : this.diffs.get();
        for (const diff of diffs) {
            if (diff.inputRange.contains(lineNumber) ||
                diff.inputRange.endLineNumberExclusive === lineNumber) {
                return diff;
            }
            else if (diff.inputRange.endLineNumberExclusive < lineNumber) {
                offset = diff.resultingDeltaFromOriginalToModified;
            }
            else {
                break;
            }
        }
        return lineNumber + offset;
    }
    getResultLineRange(baseRange, reader) {
        let start = this.getResultLine(baseRange.startLineNumber, reader);
        if (typeof start !== 'number') {
            start = start.outputRange.startLineNumber;
        }
        let endExclusive = this.getResultLine(baseRange.endLineNumberExclusive, reader);
        if (typeof endExclusive !== 'number') {
            endExclusive = endExclusive.outputRange.endLineNumberExclusive;
        }
        return LineRange.fromLineNumbers(start, endExclusive);
    }
}
export var TextModelDiffChangeReason;
(function (TextModelDiffChangeReason) {
    TextModelDiffChangeReason[TextModelDiffChangeReason["other"] = 0] = "other";
    TextModelDiffChangeReason[TextModelDiffChangeReason["textChange"] = 1] = "textChange";
})(TextModelDiffChangeReason || (TextModelDiffChangeReason = {}));
export var TextModelDiffState;
(function (TextModelDiffState) {
    TextModelDiffState[TextModelDiffState["initializing"] = 1] = "initializing";
    TextModelDiffState[TextModelDiffState["upToDate"] = 2] = "upToDate";
    TextModelDiffState[TextModelDiffState["updating"] = 3] = "updating";
    TextModelDiffState[TextModelDiffState["error"] = 4] = "error";
})(TextModelDiffState || (TextModelDiffState = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRGlmZnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL3RleHRNb2RlbERpZmZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWxGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUU3RSxPQUFPLEVBQ04sT0FBTyxFQUlQLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsV0FBVyxHQUNYLE1BQU0sMENBQTBDLENBQUE7QUFHakQsTUFBTSxPQUFPLGNBQWUsU0FBUSxVQUFVO0lBYzdDLElBQVcsZ0JBQWdCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBQ2tCLGFBQXlCLEVBQ3pCLFNBQXFCLEVBQ3JCLFlBQWdDO1FBRWpELEtBQUssRUFBRSxDQUFBO1FBSlUsa0JBQWEsR0FBYixhQUFhLENBQVk7UUFDekIsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBb0I7UUFwQjFDLG9CQUFlLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsV0FBTSxH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