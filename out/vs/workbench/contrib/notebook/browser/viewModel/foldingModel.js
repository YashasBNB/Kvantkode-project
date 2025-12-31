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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvZm9sZGluZ01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDdEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBR3BFLE9BQU8sRUFFTixjQUFjLEdBQ2QsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sY0FBYyxHQUNkLE1BQU0sc0VBQXNFLENBQUE7QUFFN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxtQkFBbUIsRUFBYyxNQUFNLCtCQUErQixDQUFBO0FBSy9FLE1BQU0saUJBQWlCLEdBQXlCO0lBQy9DLEtBQUssRUFBRSxJQUFJO0lBQ1gsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7Q0FDaEIsQ0FBQTtBQUVELE1BQU0sT0FBTyxZQUFZO0lBSXhCLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBT0Q7UUFaUSxlQUFVLEdBQThCLElBQUksQ0FBQTtRQUNuQyxvQkFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFNdkMsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUN4RCw4QkFBeUIsR0FBZ0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQUUvRSwrQkFBMEIs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