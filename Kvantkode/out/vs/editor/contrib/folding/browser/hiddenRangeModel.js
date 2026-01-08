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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZGVuUmFuZ2VNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9sZGluZy9icm93c2VyL2hpZGRlblJhbmdlTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFdEYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUc3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFHN0QsTUFBTSxPQUFPLGdCQUFnQjtJQU81QixJQUFXLFdBQVc7UUFDckIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO0lBQ3RDLENBQUM7SUFDRCxJQUFXLFlBQVk7UUFDdEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFRCxZQUFtQixLQUFtQjtRQVZyQix3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFBO1FBQ3RELG9CQUFlLEdBQVksS0FBSyxDQUFBO1FBVXZDLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO1FBQzFCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVN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