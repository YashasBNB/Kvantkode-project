/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { renderMarkdownAsPlaintext } from '../../../../../base/browser/markdownRenderer.js';
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { marked } from '../../../../../base/common/marked/marked.js';
import { FoldingRegions, } from '../../../../../editor/contrib/folding/browser/foldingRanges.js';
import { sanitizeRanges, } from '../../../../../editor/contrib/folding/browser/syntaxRangeProvider.js';
import { CellKind } from '../../common/notebookCommon.js';
import { cellRangesToIndexes } from '../../common/notebookRange.js';
const foldingRangeLimit = {
    limit: 5000,
    update: () => { },
};
export class FoldingModel {
    get regions() {
        return this._regions;
    }
    constructor() {
        this._viewModel = null;
        this._viewModelStore = new DisposableStore();
        this._onDidFoldingRegionChanges = new Emitter();
        this.onDidFoldingRegionChanged = this._onDidFoldingRegionChanges.event;
        this._foldingRangeDecorationIds = [];
        this._regions = new FoldingRegions(new Uint32Array(0), new Uint32Array(0));
    }
    dispose() {
        this._onDidFoldingRegionChanges.dispose();
        this._viewModelStore.dispose();
    }
    detachViewModel() {
        this._viewModelStore.clear();
        this._viewModel = null;
    }
    attachViewModel(model) {
        this._viewModel = model;
        this._viewModelStore.add(this._viewModel.onDidChangeViewCells(() => {
            this.recompute();
        }));
        this._viewModelStore.add(this._viewModel.onDidChangeSelection(() => {
            if (!this._viewModel) {
                return;
            }
            const indexes = cellRangesToIndexes(this._viewModel.getSelections());
            let changed = false;
            indexes.forEach((index) => {
                let regionIndex = this.regions.findRange(index + 1);
                while (regionIndex !== -1) {
                    if (this._regions.isCollapsed(regionIndex) &&
                        index > this._regions.getStartLineNumber(regionIndex) - 1) {
                        this._regions.setCollapsed(regionIndex, false);
                        changed = true;
                    }
                    regionIndex = this._regions.getParentIndex(regionIndex);
                }
            });
            if (changed) {
                this._onDidFoldingRegionChanges.fire();
            }
        }));
        this.recompute();
    }
    getRegionAtLine(lineNumber) {
        if (this._regions) {
            const index = this._regions.findRange(lineNumber);
            if (index >= 0) {
                return this._regions.toRegion(index);
            }
        }
        return null;
    }
    getRegionsInside(region, filter) {
        const result = [];
        const index = region ? region.regionIndex + 1 : 0;
        const endLineNumber = region ? region.endLineNumber : Number.MAX_VALUE;
        if (filter && filter.length === 2) {
            const levelStack = [];
            for (let i = index, len = this._regions.length; i < len; i++) {
                const current = this._regions.toRegion(i);
                if (this._regions.getStartLineNumber(i) < endLineNumber) {
                    while (levelStack.length > 0 && !current.containedBy(levelStack[levelStack.length - 1])) {
                        levelStack.pop();
                    }
                    levelStack.push(current);
                    if (filter(current, levelStack.length)) {
                        result.push(current);
                    }
                }
                else {
                    break;
                }
            }
        }
        else {
            for (let i = index, len = this._regions.length; i < len; i++) {
                const current = this._regions.toRegion(i);
                if (this._regions.getStartLineNumber(i) < endLineNumber) {
                    if (!filter || filter(current)) {
                        result.push(current);
                    }
                }
                else {
                    break;
                }
            }
        }
        return result;
    }
    getAllRegionsAtLine(lineNumber, filter) {
        const result = [];
        if (this._regions) {
            let index = this._regions.findRange(lineNumber);
            let level = 1;
            while (index >= 0) {
                const current = this._regions.toRegion(index);
                if (!filter || filter(current, level)) {
                    result.push(current);
                }
                level++;
                index = current.parentIndex;
            }
        }
        return result;
    }
    setCollapsed(index, newState) {
        this._regions.setCollapsed(index, newState);
    }
    recompute() {
        if (!this._viewModel) {
            return;
        }
        const viewModel = this._viewModel;
        const cells = viewModel.viewCells;
        const stack = [];
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.cellKind !== CellKind.Markup || cell.language !== 'markdown') {
                continue;
            }
            const minDepth = Math.min(7, ...Array.from(getMarkdownHeadersInCell(cell.getText()), (header) => header.depth));
            if (minDepth < 7) {
                // header 1 to 6
                stack.push({ index: i, level: minDepth, endIndex: 0 });
            }
        }
        // calculate folding ranges
        const rawFoldingRanges = stack
            .map((entry, startIndex) => {
            let end = undefined;
            for (let i = startIndex + 1; i < stack.length; ++i) {
                if (stack[i].level <= entry.level) {
                    end = stack[i].index - 1;
                    break;
                }
            }
            const endIndex = end !== undefined ? end : cells.length - 1;
            // one based
            return {
                start: entry.index + 1,
                end: endIndex + 1,
                rank: 1,
            };
        })
            .filter((range) => range.start !== range.end);
        const newRegions = sanitizeRanges(rawFoldingRanges, foldingRangeLimit);
        // restore collased state
        let i = 0;
        const nextCollapsed = () => {
            while (i < this._regions.length) {
                const isCollapsed = this._regions.isCollapsed(i);
                i++;
                if (isCollapsed) {
                    return i - 1;
                }
            }
            return -1;
        };
        let k = 0;
        let collapsedIndex = nextCollapsed();
        while (collapsedIndex !== -1 && k < newRegions.length) {
            // get the latest range
            const decRange = viewModel.getTrackedRange(this._foldingRangeDecorationIds[collapsedIndex]);
            if (decRange) {
                const collasedStartIndex = decRange.start;
                while (k < newRegions.length) {
                    const startIndex = newRegions.getStartLineNumber(k) - 1;
                    if (collasedStartIndex >= startIndex) {
                        newRegions.setCollapsed(k, collasedStartIndex === startIndex);
                        k++;
                    }
                    else {
                        break;
                    }
                }
            }
            collapsedIndex = nextCollapsed();
        }
        while (k < newRegions.length) {
            newRegions.setCollapsed(k, false);
            k++;
        }
        const cellRanges = [];
        for (let i = 0; i < newRegions.length; i++) {
            const region = newRegions.toRegion(i);
            cellRanges.push({ start: region.startLineNumber - 1, end: region.endLineNumber - 1 });
        }
        // remove old tracked ranges and add new ones
        // TODO@rebornix, implement delta
        this._foldingRangeDecorationIds.forEach((id) => viewModel.setTrackedRange(id, null, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */));
        this._foldingRangeDecorationIds = cellRanges
            .map((region) => viewModel.setTrackedRange(null, region, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */))
            .filter((str) => str !== null);
        this._regions = newRegions;
        this._onDidFoldingRegionChanges.fire();
    }
    getMemento() {
        const collapsedRanges = [];
        let i = 0;
        while (i < this._regions.length) {
            const isCollapsed = this._regions.isCollapsed(i);
            if (isCollapsed) {
                const region = this._regions.toRegion(i);
                collapsedRanges.push({ start: region.startLineNumber - 1, end: region.endLineNumber - 1 });
            }
            i++;
        }
        return collapsedRanges;
    }
    applyMemento(state) {
        if (!this._viewModel) {
            return false;
        }
        let i = 0;
        let k = 0;
        while (k < state.length && i < this._regions.length) {
            // get the latest range
            const decRange = this._viewModel.getTrackedRange(this._foldingRangeDecorationIds[i]);
            if (decRange) {
                const collasedStartIndex = state[k].start;
                while (i < this._regions.length) {
                    const startIndex = this._regions.getStartLineNumber(i) - 1;
                    if (collasedStartIndex >= startIndex) {
                        this._regions.setCollapsed(i, collasedStartIndex === startIndex);
                        i++;
                    }
                    else {
                        break;
                    }
                }
            }
            k++;
        }
        while (i < this._regions.length) {
            this._regions.setCollapsed(i, false);
            i++;
        }
        return true;
    }
}
export function updateFoldingStateAtIndex(foldingModel, index, collapsed) {
    const range = foldingModel.regions.findRange(index + 1);
    foldingModel.setCollapsed(range, collapsed);
}
export function* getMarkdownHeadersInCell(cellContent) {
    for (const token of marked.lexer(cellContent, { gfm: true })) {
        if (token.type === 'heading') {
            yield {
                depth: token.depth,
                text: renderMarkdownAsPlaintext({ value: token.raw }).trim(),
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9mb2xkaW5nTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDM0YsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHcEUsT0FBTyxFQUVOLGNBQWMsR0FDZCxNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFFTixjQUFjLEdBQ2QsTUFBTSxzRUFBc0UsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUFjLE1BQU0sK0JBQStCLENBQUE7QUFLL0UsTUFBTSxpQkFBaUIsR0FBeUI7SUFDL0MsS0FBSyxFQUFFLElBQUk7SUFDWCxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztDQUNoQixDQUFBO0FBRUQsTUFBTSxPQUFPLFlBQVk7SUFJeEIsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFPRDtRQVpRLGVBQVUsR0FBOEIsSUFBSSxDQUFBO1FBQ25DLG9CQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU12QywrQkFBMEIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQ3hELDhCQUF5QixHQUFnQixJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBRS9FLCtC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