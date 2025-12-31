/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { Emitter } from '../../../../base/common/event.js';
import { Range } from '../../../common/core/range.js';
import { countEOL } from '../../../common/core/eolCounter.js';
export class HiddenRangeModel {
    get onDidChange() {
        return this._updateEventEmitter.event;
    }
    get hiddenRanges() {
        return this._hiddenRanges;
    }
    constructor(model) {
        this._updateEventEmitter = new Emitter();
        this._hasLineChanges = false;
        this._foldingModel = model;
        this._foldingModelListener = model.onDidChange((_) => this.updateHiddenRanges());
        this._hiddenRanges = [];
        if (model.regions.length) {
            this.updateHiddenRanges();
        }
    }
    notifyChangeModelContent(e) {
        if (this._hiddenRanges.length && !this._hasLineChanges) {
            this._hasLineChanges = e.changes.some((change) => {
                return (change.range.endLineNumber !== change.range.startLineNumber ||
                    countEOL(change.text)[0] !== 0);
            });
        }
    }
    updateHiddenRanges() {
        let updateHiddenAreas = false;
        const newHiddenAreas = [];
        let i = 0; // index into hidden
        let k = 0;
        let lastCollapsedStart = Number.MAX_VALUE;
        let lastCollapsedEnd = -1;
        const ranges = this._foldingModel.regions;
        for (; i < ranges.length; i++) {
            if (!ranges.isCollapsed(i)) {
                continue;
            }
            const startLineNumber = ranges.getStartLineNumber(i) + 1; // the first line is not hidden
            const endLineNumber = ranges.getEndLineNumber(i);
            if (lastCollapsedStart <= startLineNumber && endLineNumber <= lastCollapsedEnd) {
                // ignore ranges contained in collapsed regions
                continue;
            }
            if (!updateHiddenAreas &&
                k < this._hiddenRanges.length &&
                this._hiddenRanges[k].startLineNumber === startLineNumber &&
                this._hiddenRanges[k].endLineNumber === endLineNumber) {
                // reuse the old ranges
                newHiddenAreas.push(this._hiddenRanges[k]);
                k++;
            }
            else {
                updateHiddenAreas = true;
                newHiddenAreas.push(new Range(startLineNumber, 1, endLineNumber, 1));
            }
            lastCollapsedStart = startLineNumber;
            lastCollapsedEnd = endLineNumber;
        }
        if (this._hasLineChanges || updateHiddenAreas || k < this._hiddenRanges.length) {
            this.applyHiddenRanges(newHiddenAreas);
        }
    }
    applyHiddenRanges(newHiddenAreas) {
        this._hiddenRanges = newHiddenAreas;
        this._hasLineChanges = false;
        this._updateEventEmitter.fire(newHiddenAreas);
    }
    hasRanges() {
        return this._hiddenRanges.length > 0;
    }
    isHidden(line) {
        return findRange(this._hiddenRanges, line) !== null;
    }
    adjustSelections(selections) {
        let hasChanges = false;
        const editorModel = this._foldingModel.textModel;
        let lastRange = null;
        const adjustLine = (line) => {
            if (!lastRange || !isInside(line, lastRange)) {
                lastRange = findRange(this._hiddenRanges, line);
            }
            if (lastRange) {
                return lastRange.startLineNumber - 1;
            }
            return null;
        };
        for (let i = 0, len = selections.length; i < len; i++) {
            let selection = selections[i];
            const adjustedStartLine = adjustLine(selection.startLineNumber);
            if (adjustedStartLine) {
                selection = selection.setStartPosition(adjustedStartLine, editorModel.getLineMaxColumn(adjustedStartLine));
                hasChanges = true;
            }
            const adjustedEndLine = adjustLine(selection.endLineNumber);
            if (adjustedEndLine) {
                selection = selection.setEndPosition(adjustedEndLine, editorModel.getLineMaxColumn(adjustedEndLine));
                hasChanges = true;
            }
            selections[i] = selection;
        }
        return hasChanges;
    }
    dispose() {
        if (this.hiddenRanges.length > 0) {
            this._hiddenRanges = [];
            this._updateEventEmitter.fire(this._hiddenRanges);
        }
        if (this._foldingModelListener) {
            this._foldingModelListener.dispose();
            this._foldingModelListener = null;
        }
    }
}
function isInside(line, range) {
    return line >= range.startLineNumber && line <= range.endLineNumber;
}
function findRange(ranges, line) {
    const i = findFirstIdxMonotonousOrArrLen(ranges, (r) => line < r.startLineNumber) - 1;
    if (i >= 0 && ranges[i].endLineNumber >= line) {
        return ranges[i];
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZGVuUmFuZ2VNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9oaWRkZW5SYW5nZU1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXRGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRzdELE1BQU0sT0FBTyxnQkFBZ0I7SUFPNUIsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtJQUN0QyxDQUFDO0lBQ0QsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsWUFBbUIsS0FBbUI7UUFWckIsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQTtRQUN0RCxvQkFBZSxHQUFZLEtBQUssQ0FBQTtRQVV2QyxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQTtRQUMxQixJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQTtRQUNoRixJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQTtRQUN2QixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFTSx3QkFB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