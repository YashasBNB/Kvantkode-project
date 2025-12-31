/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { FoldingRegions, } from './foldingRanges.js';
import { hash } from '../../../../base/common/hash.js';
export class FoldingModel {
    get regions() {
        return this._regions;
    }
    get textModel() {
        return this._textModel;
    }
    get decorationProvider() {
        return this._decorationProvider;
    }
    constructor(textModel, decorationProvider) {
        this._updateEventEmitter = new Emitter();
        this.onDidChange = this._updateEventEmitter.event;
        this._textModel = textModel;
        this._decorationProvider = decorationProvider;
        this._regions = new FoldingRegions(new Uint32Array(0), new Uint32Array(0));
        this._editorDecorationIds = [];
    }
    toggleCollapseState(toggledRegions) {
        if (!toggledRegions.length) {
            return;
        }
        toggledRegions = toggledRegions.sort((r1, r2) => r1.regionIndex - r2.regionIndex);
        const processed = {};
        this._decorationProvider.changeDecorations((accessor) => {
            let k = 0; // index from [0 ... this.regions.length]
            let dirtyRegionEndLine = -1; // end of the range where decorations need to be updated
            let lastHiddenLine = -1; // the end of the last hidden lines
            const updateDecorationsUntil = (index) => {
                while (k < index) {
                    const endLineNumber = this._regions.getEndLineNumber(k);
                    const isCollapsed = this._regions.isCollapsed(k);
                    if (endLineNumber <= dirtyRegionEndLine) {
                        const isManual = this.regions.getSource(k) !== 0 /* FoldSource.provider */;
                        accessor.changeDecorationOptions(this._editorDecorationIds[k], this._decorationProvider.getDecorationOption(isCollapsed, endLineNumber <= lastHiddenLine, isManual));
                    }
                    if (isCollapsed && endLineNumber > lastHiddenLine) {
                        lastHiddenLine = endLineNumber;
                    }
                    k++;
                }
            };
            for (const region of toggledRegions) {
                const index = region.regionIndex;
                const editorDecorationId = this._editorDecorationIds[index];
                if (editorDecorationId && !processed[editorDecorationId]) {
                    processed[editorDecorationId] = true;
                    updateDecorationsUntil(index); // update all decorations up to current index using the old dirtyRegionEndLine
                    const newCollapseState = !this._regions.isCollapsed(index);
                    this._regions.setCollapsed(index, newCollapseState);
                    dirtyRegionEndLine = Math.max(dirtyRegionEndLine, this._regions.getEndLineNumber(index));
                }
            }
            updateDecorationsUntil(this._regions.length);
        });
        this._updateEventEmitter.fire({ model: this, collapseStateChanged: toggledRegions });
    }
    removeManualRanges(ranges) {
        const newFoldingRanges = new Array();
        const intersects = (foldRange) => {
            for (const range of ranges) {
                if (!(range.startLineNumber > foldRange.endLineNumber ||
                    foldRange.startLineNumber > range.endLineNumber)) {
                    return true;
                }
            }
            return false;
        };
        for (let i = 0; i < this._regions.length; i++) {
            const foldRange = this._regions.toFoldRange(i);
            if (foldRange.source === 0 /* FoldSource.provider */ || !intersects(foldRange)) {
                newFoldingRanges.push(foldRange);
            }
        }
        this.updatePost(FoldingRegions.fromFoldRanges(newFoldingRanges));
    }
    update(newRegions, selection) {
        const foldedOrManualRanges = this._currentFoldedOrManualRanges(selection);
        const newRanges = FoldingRegions.sanitizeAndMerge(newRegions, foldedOrManualRanges, this._textModel.getLineCount(), selection);
        this.updatePost(FoldingRegions.fromFoldRanges(newRanges));
    }
    updatePost(newRegions) {
        const newEditorDecorations = [];
        let lastHiddenLine = -1;
        for (let index = 0, limit = newRegions.length; index < limit; index++) {
            const startLineNumber = newRegions.getStartLineNumber(index);
            const endLineNumber = newRegions.getEndLineNumber(index);
            const isCollapsed = newRegions.isCollapsed(index);
            const isManual = newRegions.getSource(index) !== 0 /* FoldSource.provider */;
            const decorationRange = {
                startLineNumber: startLineNumber,
                startColumn: this._textModel.getLineMaxColumn(startLineNumber),
                endLineNumber: endLineNumber,
                endColumn: this._textModel.getLineMaxColumn(endLineNumber) + 1,
            };
            newEditorDecorations.push({
                range: decorationRange,
                options: this._decorationProvider.getDecorationOption(isCollapsed, endLineNumber <= lastHiddenLine, isManual),
            });
            if (isCollapsed && endLineNumber > lastHiddenLine) {
                lastHiddenLine = endLineNumber;
            }
        }
        this._decorationProvider.changeDecorations((accessor) => (this._editorDecorationIds = accessor.deltaDecorations(this._editorDecorationIds, newEditorDecorations)));
        this._regions = newRegions;
        this._updateEventEmitter.fire({ model: this });
    }
    _currentFoldedOrManualRanges(selection) {
        const foldedRanges = [];
        for (let i = 0, limit = this._regions.length; i < limit; i++) {
            let isCollapsed = this.regions.isCollapsed(i);
            const source = this.regions.getSource(i);
            if (isCollapsed || source !== 0 /* FoldSource.provider */) {
                const foldRange = this._regions.toFoldRange(i);
                const decRange = this._textModel.getDecorationRange(this._editorDecorationIds[i]);
                if (decRange) {
                    if (isCollapsed &&
                        selection?.startsInside(decRange.startLineNumber + 1, decRange.endLineNumber)) {
                        isCollapsed = false; // uncollapse is the range is blocked
                    }
                    foldedRanges.push({
                        startLineNumber: decRange.startLineNumber,
                        endLineNumber: decRange.endLineNumber,
                        type: foldRange.type,
                        isCollapsed,
                        source,
                    });
                }
            }
        }
        return foldedRanges;
    }
    /**
     * Collapse state memento, for persistence only
     */
    getMemento() {
        const foldedOrManualRanges = this._currentFoldedOrManualRanges();
        const result = [];
        const maxLineNumber = this._textModel.getLineCount();
        for (let i = 0, limit = foldedOrManualRanges.length; i < limit; i++) {
            const range = foldedOrManualRanges[i];
            if (range.startLineNumber >= range.endLineNumber ||
                range.startLineNumber < 1 ||
                range.endLineNumber > maxLineNumber) {
                continue;
            }
            const checksum = this._getLinesChecksum(range.startLineNumber + 1, range.endLineNumber);
            result.push({
                startLineNumber: range.startLineNumber,
                endLineNumber: range.endLineNumber,
                isCollapsed: range.isCollapsed,
                source: range.source,
                checksum: checksum,
            });
        }
        return result.length > 0 ? result : undefined;
    }
    /**
     * Apply persisted state, for persistence only
     */
    applyMemento(state) {
        if (!Array.isArray(state)) {
            return;
        }
        const rangesToRestore = [];
        const maxLineNumber = this._textModel.getLineCount();
        for (const range of state) {
            if (range.startLineNumber >= range.endLineNumber ||
                range.startLineNumber < 1 ||
                range.endLineNumber > maxLineNumber) {
                continue;
            }
            const checksum = this._getLinesChecksum(range.startLineNumber + 1, range.endLineNumber);
            if (!range.checksum || checksum === range.checksum) {
                rangesToRestore.push({
                    startLineNumber: range.startLineNumber,
                    endLineNumber: range.endLineNumber,
                    type: undefined,
                    isCollapsed: range.isCollapsed ?? true,
                    source: range.source ?? 0 /* FoldSource.provider */,
                });
            }
        }
        const newRanges = FoldingRegions.sanitizeAndMerge(this._regions, rangesToRestore, maxLineNumber);
        this.updatePost(FoldingRegions.fromFoldRanges(newRanges));
    }
    _getLinesChecksum(lineNumber1, lineNumber2) {
        const h = hash(this._textModel.getLineContent(lineNumber1) + this._textModel.getLineContent(lineNumber2));
        return h % 1000000; // 6 digits is plenty
    }
    dispose() {
        this._decorationProvider.removeDecorations(this._editorDecorationIds);
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
}
/**
 * Collapse or expand the regions at the given locations
 * @param levels The number of levels. Use 1 to only impact the regions at the location, use Number.MAX_VALUE for all levels.
 * @param lineNumbers the location of the regions to collapse or expand, or if not set, all regions in the model.
 */
export function toggleCollapseState(foldingModel, levels, lineNumbers) {
    const toToggle = [];
    for (const lineNumber of lineNumbers) {
        const region = foldingModel.getRegionAtLine(lineNumber);
        if (region) {
            const doCollapse = !region.isCollapsed;
            toToggle.push(region);
            if (levels > 1) {
                const regionsInside = foldingModel.getRegionsInside(region, (r, level) => r.isCollapsed !== doCollapse && level < levels);
                toToggle.push(...regionsInside);
            }
        }
    }
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Collapse or expand the regions at the given locations including all children.
 * @param doCollapse Whether to collapse or expand
 * @param levels The number of levels. Use 1 to only impact the regions at the location, use Number.MAX_VALUE for all levels.
 * @param lineNumbers the location of the regions to collapse or expand, or if not set, all regions in the model.
 */
export function setCollapseStateLevelsDown(foldingModel, doCollapse, levels = Number.MAX_VALUE, lineNumbers) {
    const toToggle = [];
    if (lineNumbers && lineNumbers.length > 0) {
        for (const lineNumber of lineNumbers) {
            const region = foldingModel.getRegionAtLine(lineNumber);
            if (region) {
                if (region.isCollapsed !== doCollapse) {
                    toToggle.push(region);
                }
                if (levels > 1) {
                    const regionsInside = foldingModel.getRegionsInside(region, (r, level) => r.isCollapsed !== doCollapse && level < levels);
                    toToggle.push(...regionsInside);
                }
            }
        }
    }
    else {
        const regionsInside = foldingModel.getRegionsInside(null, (r, level) => r.isCollapsed !== doCollapse && level < levels);
        toToggle.push(...regionsInside);
    }
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Collapse or expand the regions at the given locations including all parents.
 * @param doCollapse Whether to collapse or expand
 * @param levels The number of levels. Use 1 to only impact the regions at the location, use Number.MAX_VALUE for all levels.
 * @param lineNumbers the location of the regions to collapse or expand.
 */
export function setCollapseStateLevelsUp(foldingModel, doCollapse, levels, lineNumbers) {
    const toToggle = [];
    for (const lineNumber of lineNumbers) {
        const regions = foldingModel.getAllRegionsAtLine(lineNumber, (region, level) => region.isCollapsed !== doCollapse && level <= levels);
        toToggle.push(...regions);
    }
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Collapse or expand a region at the given locations. If the inner most region is already collapsed/expanded, uses the first parent instead.
 * @param doCollapse Whether to collapse or expand
 * @param lineNumbers the location of the regions to collapse or expand.
 */
export function setCollapseStateUp(foldingModel, doCollapse, lineNumbers) {
    const toToggle = [];
    for (const lineNumber of lineNumbers) {
        const regions = foldingModel.getAllRegionsAtLine(lineNumber, (region) => region.isCollapsed !== doCollapse);
        if (regions.length > 0) {
            toToggle.push(regions[0]);
        }
    }
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Folds or unfolds all regions that have a given level, except if they contain one of the blocked lines.
 * @param foldLevel level. Level == 1 is the top level
 * @param doCollapse Whether to collapse or expand
 */
export function setCollapseStateAtLevel(foldingModel, foldLevel, doCollapse, blockedLineNumbers) {
    const filter = (region, level) => level === foldLevel &&
        region.isCollapsed !== doCollapse &&
        !blockedLineNumbers.some((line) => region.containsLine(line));
    const toToggle = foldingModel.getRegionsInside(null, filter);
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Folds or unfolds all regions, except if they contain or are contained by a region of one of the blocked lines.
 * @param doCollapse Whether to collapse or expand
 * @param blockedLineNumbers the location of regions to not collapse or expand
 */
export function setCollapseStateForRest(foldingModel, doCollapse, blockedLineNumbers) {
    const filteredRegions = [];
    for (const lineNumber of blockedLineNumbers) {
        const regions = foldingModel.getAllRegionsAtLine(lineNumber, undefined);
        if (regions.length > 0) {
            filteredRegions.push(regions[0]);
        }
    }
    const filter = (region) => filteredRegions.every((filteredRegion) => !filteredRegion.containedBy(region) && !region.containedBy(filteredRegion)) && region.isCollapsed !== doCollapse;
    const toToggle = foldingModel.getRegionsInside(null, filter);
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Folds all regions for which the lines start with a given regex
 * @param foldingModel the folding model
 */
export function setCollapseStateForMatchingLines(foldingModel, regExp, doCollapse) {
    const editorModel = foldingModel.textModel;
    const regions = foldingModel.regions;
    const toToggle = [];
    for (let i = regions.length - 1; i >= 0; i--) {
        if (doCollapse !== regions.isCollapsed(i)) {
            const startLineNumber = regions.getStartLineNumber(i);
            if (regExp.test(editorModel.getLineContent(startLineNumber))) {
                toToggle.push(regions.toRegion(i));
            }
        }
    }
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Folds all regions of the given type
 * @param foldingModel the folding model
 */
export function setCollapseStateForType(foldingModel, type, doCollapse) {
    const regions = foldingModel.regions;
    const toToggle = [];
    for (let i = regions.length - 1; i >= 0; i--) {
        if (doCollapse !== regions.isCollapsed(i) && type === regions.getType(i)) {
            toToggle.push(regions.toRegion(i));
        }
    }
    foldingModel.toggleCollapseState(toToggle);
}
/**
 * Get line to go to for parent fold of current line
 * @param lineNumber the current line number
 * @param foldingModel the folding model
 *
 * @return Parent fold start line
 */
export function getParentFoldLine(lineNumber, foldingModel) {
    let startLineNumber = null;
    const foldingRegion = foldingModel.getRegionAtLine(lineNumber);
    if (foldingRegion !== null) {
        startLineNumber = foldingRegion.startLineNumber;
        // If current line is not the start of the current fold, go to top line of current fold. If not, go to parent fold
        if (lineNumber === startLineNumber) {
            const parentFoldingIdx = foldingRegion.parentIndex;
            if (parentFoldingIdx !== -1) {
                startLineNumber = foldingModel.regions.getStartLineNumber(parentFoldingIdx);
            }
            else {
                startLineNumber = null;
            }
        }
    }
    return startLineNumber;
}
/**
 * Get line to go to for previous fold at the same level of current line
 * @param lineNumber the current line number
 * @param foldingModel the folding model
 *
 * @return Previous fold start line
 */
export function getPreviousFoldLine(lineNumber, foldingModel) {
    let foldingRegion = foldingModel.getRegionAtLine(lineNumber);
    // If on the folding range start line, go to previous sibling.
    if (foldingRegion !== null && foldingRegion.startLineNumber === lineNumber) {
        // If current line is not the start of the current fold, go to top line of current fold. If not, go to previous fold.
        if (lineNumber !== foldingRegion.startLineNumber) {
            return foldingRegion.startLineNumber;
        }
        else {
            // Find min line number to stay within parent.
            const expectedParentIndex = foldingRegion.parentIndex;
            let minLineNumber = 0;
            if (expectedParentIndex !== -1) {
                minLineNumber = foldingModel.regions.getStartLineNumber(foldingRegion.parentIndex);
            }
            // Find fold at same level.
            while (foldingRegion !== null) {
                if (foldingRegion.regionIndex > 0) {
                    foldingRegion = foldingModel.regions.toRegion(foldingRegion.regionIndex - 1);
                    // Keep at same level.
                    if (foldingRegion.startLineNumber <= minLineNumber) {
                        return null;
                    }
                    else if (foldingRegion.parentIndex === expectedParentIndex) {
                        return foldingRegion.startLineNumber;
                    }
                }
                else {
                    return null;
                }
            }
        }
    }
    else {
        // Go to last fold that's before the current line.
        if (foldingModel.regions.length > 0) {
            foldingRegion = foldingModel.regions.toRegion(foldingModel.regions.length - 1);
            while (foldingRegion !== null) {
                // Found fold before current line.
                if (foldingRegion.startLineNumber < lineNumber) {
                    return foldingRegion.startLineNumber;
                }
                if (foldingRegion.regionIndex > 0) {
                    foldingRegion = foldingModel.regions.toRegion(foldingRegion.regionIndex - 1);
                }
                else {
                    foldingRegion = null;
                }
            }
        }
    }
    return null;
}
/**
 * Get line to go to next fold at the same level of current line
 * @param lineNumber the current line number
 * @param foldingModel the folding model
 *
 * @return Next fold start line
 */
export function getNextFoldLine(lineNumber, foldingModel) {
    let foldingRegion = foldingModel.getRegionAtLine(lineNumber);
    // If on the folding range start line, go to next sibling.
    if (foldingRegion !== null && foldingRegion.startLineNumber === lineNumber) {
        // Find max line number to stay within parent.
        const expectedParentIndex = foldingRegion.parentIndex;
        let maxLineNumber = 0;
        if (expectedParentIndex !== -1) {
            maxLineNumber = foldingModel.regions.getEndLineNumber(foldingRegion.parentIndex);
        }
        else if (foldingModel.regions.length === 0) {
            return null;
        }
        else {
            maxLineNumber = foldingModel.regions.getEndLineNumber(foldingModel.regions.length - 1);
        }
        // Find fold at same level.
        while (foldingRegion !== null) {
            if (foldingRegion.regionIndex < foldingModel.regions.length) {
                foldingRegion = foldingModel.regions.toRegion(foldingRegion.regionIndex + 1);
                // Keep at same level.
                if (foldingRegion.startLineNumber >= maxLineNumber) {
                    return null;
                }
                else if (foldingRegion.parentIndex === expectedParentIndex) {
                    return foldingRegion.startLineNumber;
                }
            }
            else {
                return null;
            }
        }
    }
    else {
        // Go to first fold that's after the current line.
        if (foldingModel.regions.length > 0) {
            foldingRegion = foldingModel.regions.toRegion(0);
            while (foldingRegion !== null) {
                // Found fold after current line.
                if (foldingRegion.startLineNumber > lineNumber) {
                    return foldingRegion.startLineNumber;
                }
                if (foldingRegion.regionIndex < foldingModel.regions.length) {
                    foldingRegion = foldingModel.regions.toRegion(foldingRegion.regionIndex + 1);
                }
                else {
                    foldingRegion = null;
                }
            }
        }
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9sZGluZy9icm93c2VyL2ZvbGRpbmdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFPakUsT0FBTyxFQUVOLGNBQWMsR0FJZCxNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQTBCdEQsTUFBTSxPQUFPLFlBQVk7SUFVeEIsSUFBVyxPQUFPO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBQ0QsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBQ0QsSUFBVyxrQkFBa0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBQVksU0FBcUIsRUFBRSxrQkFBdUM7UUFiekQsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQTJCLENBQUE7UUFDN0QsZ0JBQVcsR0FBbUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQWEzRixJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtRQUMzQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUE7UUFDN0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzFFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUVNLG1CQUFtQixDQUFDLGNBQStCO1FBQ3pELElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUIsT0FBTTtRQUNQLENBQUM7UUFDRCxjQUFjLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBRWpGLE1BQU0sU0FBUyxHQUEyQyxFQUFFLENBQUE7UUFDNUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDdkQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMseUNBQXlDO1lBQ25ELElBQUksa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQyx3REFBd0Q7WUFDcEYsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQyxtQ0FBbUM7WUFDM0QsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEtBQWEsRUFBRSxFQUFFO2dCQUNoRCxPQUFPLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQztvQkFDbEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDdkQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2hELElBQUksYUFBYSxJQUFJLGtCQUFrQixFQUFFLENBQUM7d0JBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxnQ0FBd0IsQ0FBQTt3QkFDbEUsUUFBUSxDQUFDLHVCQUF1QixDQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLEVBQzVCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxtQkFBbUIsQ0FDM0MsV0FBVyxFQUNYLGFBQWEsSUFBSSxjQUFjLEVBQy9CLFFBQVEsQ0FDUixDQUNELENBQUE7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLFdBQVcsSUFBSSxhQUFhLEdBQUcsY0FBYyxFQUFFLENBQUM7d0JBQ25ELGNBQWMsR0FBRyxhQUFhLENBQUE7b0JBQy9CLENBQUM7b0JBQ0QsQ0FBQyxFQUFFLENBQUE7Z0JBQ0osQ0FBQztZQUNGLENBQUMsQ0FBQTtZQUNELEtBQUssTUFBTSxNQUFNLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUE7Z0JBQ2hDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLGtCQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztvQkFDMUQsU0FBUyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsSUFBSSxDQUFBO29CQUVwQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLDhFQUE4RTtvQkFFNUcsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUMxRCxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtvQkFFbkQsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7Z0JBQ3pGLENBQUM7WUFDRixDQUFDO1lBQ0Qsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLG9CQUFvQixFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUE7SUFDckYsQ0FBQztJQUVNLGtCQUFrQixDQUFDLE1BQW9CO1FBQzdDLE1BQU0sZ0JBQWdCLEdBQWdCLElBQUksS0FBSyxFQUFFLENBQUE7UUFDakQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxTQUFvQixFQUFFLEVBQUU7WUFDM0MsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsSUFDQyxDQUFDLENBQ0EsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUMsYUFBYTtvQkFDL0MsU0FBUyxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUMvQyxFQUNBLENBQUM7b0JBQ0YsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQTtRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLElBQUksU0FBUyxDQUFDLE1BQU0sZ0NBQXdCLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDeEUsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRU0sTUFBTSxDQUFDLFVBQTBCLEVBQUUsU0FBeUI7UUFDbEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekUsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUNoRCxVQUFVLEVBQ1Ysb0JBQW9CLEVBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQzlCLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVNLFVBQVUsQ0FBQyxVQUEwQjtRQUMzQyxNQUFNLG9CQUFvQixHQUE0QixFQUFFLENBQUE7UUFDeEQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkIsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3ZFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM1RCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDeEQsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNqRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxnQ0FBd0IsQ0FBQTtZQUNwRSxNQUFNLGVBQWUsR0FBRztnQkFDdkIsZUFBZSxFQUFFLGVBQWU7Z0JBQ2hDLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztnQkFDOUQsYUFBYSxFQUFFLGFBQWE7Z0JBQzVCLFNBQVMsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUM7YUFDOUQsQ0FBQTtZQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQztnQkFDekIsS0FBSyxFQUFFLGVBQWU7Z0JBQ3RCLE9BQU8sRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsbUJBQW1CLENBQ3BELFdBQVcsRUFDWCxhQUFhLElBQUksY0FBYyxFQUMvQixRQUFRLENBQ1I7YUFDRCxDQUFDLENBQUE7WUFDRixJQUFJLFdBQVcsSUFBSSxhQUFhLEdBQUcsY0FBYyxFQUFFLENBQUM7Z0JBQ25ELGNBQWMsR0FBRyxhQUFhLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLENBQ3pDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDWixDQUFDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQ3JELElBQUksQ0FBQyxvQkFBb0IsRUFDekIsb0JBQW9CLENBQ3BCLENBQUMsQ0FDSCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7UUFDMUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxTQUF5QjtRQUM3RCxNQUFNLFlBQVksR0FBZ0IsRUFBRSxDQUFBO1FBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDOUQsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0MsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEMsSUFBSSxXQUFXLElBQUksTUFBTSxnQ0FBd0IsRUFBRSxDQUFDO2dCQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakYsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxJQUNDLFdBQVc7d0JBQ1gsU0FBUyxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQzVFLENBQUM7d0JBQ0YsV0FBVyxHQUFHLEtBQUssQ0FBQSxDQUFDLHFDQUFxQztvQkFDMUQsQ0FBQztvQkFDRCxZQUFZLENBQUMsSUFBSSxDQUFDO3dCQUNqQixlQUFlLEVBQUUsUUFBUSxDQUFDLGVBQWU7d0JBQ3pDLGFBQWEsRUFBRSxRQUFRLENBQUMsYUFBYTt3QkFDckMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxJQUFJO3dCQUNwQixXQUFXO3dCQUNYLE1BQU07cUJBQ04sQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNJLFVBQVU7UUFDaEIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQTtRQUNoRSxNQUFNLE1BQU0sR0FBbUIsRUFBRSxDQUFBO1FBQ2pDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDcEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDckUsTUFBTSxLQUFLLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckMsSUFDQyxLQUFLLENBQUMsZUFBZSxJQUFJLEtBQUssQ0FBQyxhQUFhO2dCQUM1QyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUM7Z0JBQ3pCLEtBQUssQ0FBQyxhQUFhLEdBQUcsYUFBYSxFQUNsQyxDQUFDO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUN2RixNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNYLGVBQWUsRUFBRSxLQUFLLENBQUMsZUFBZTtnQkFDdEMsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhO2dCQUNsQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7Z0JBQzlCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtnQkFDcEIsUUFBUSxFQUFFLFFBQVE7YUFDbEIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzlDLENBQUM7SUFFRDs7T0FFRztJQUNJLFlBQVksQ0FBQyxLQUFzQjtRQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQWdCLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ3BELEtBQUssTUFBTSxLQUFLLElBQUksS0FBSyxFQUFFLENBQUM7WUFDM0IsSUFDQyxLQUFLLENBQUMsZUFBZSxJQUFJLEtBQUssQ0FBQyxhQUFhO2dCQUM1QyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUM7Z0JBQ3pCLEtBQUssQ0FBQyxhQUFhLEdBQUcsYUFBYSxFQUNsQyxDQUFDO2dCQUNGLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUN2RixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNwRCxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNwQixlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWU7b0JBQ3RDLGFBQWEsRUFBRSxLQUFLLENBQUMsYUFBYTtvQkFDbEMsSUFBSSxFQUFFLFNBQVM7b0JBQ2YsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksSUFBSTtvQkFDdEMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLCtCQUF1QjtpQkFDM0MsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDaEcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVPLGlCQUFpQixDQUFDLFdBQW1CLEVBQUUsV0FBbUI7UUFDakUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUNiLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUN6RixDQUFBO1FBQ0QsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFBLENBQUMscUJBQXFCO0lBQ3pDLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7SUFFRCxtQkFBbUIsQ0FDbEIsVUFBa0IsRUFDbEIsTUFBcUQ7UUFFckQsTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUMvQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7WUFDYixPQUFPLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQzdDLElBQUksQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN2QyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNyQixDQUFDO2dCQUNELEtBQUssRUFBRSxDQUFBO2dCQUNQLEtBQUssR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFBO1lBQzVCLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRUQsZUFBZSxDQUFDLFVBQWtCO1FBQ2pDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2pELElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsZ0JBQWdCLENBQ2YsTUFBNEIsRUFDNUIsTUFBNkM7UUFFN0MsTUFBTSxNQUFNLEdBQW9CLEVBQUUsQ0FBQTtRQUNsQyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFBO1FBRXRFLElBQUksTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbkMsTUFBTSxVQUFVLEdBQW9CLEVBQUUsQ0FBQTtZQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5RCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDekMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDO29CQUN6RCxPQUFPLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ3pGLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtvQkFDakIsQ0FBQztvQkFDRCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUN4QixJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7d0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ3JCLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzlELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN6QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUM7b0JBQ3pELElBQUksQ0FBQyxNQUFNLElBQUssTUFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUNsRCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUNyQixDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFLO2dCQUNOLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztDQUNEO0FBS0Q7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsWUFBMEIsRUFDMUIsTUFBYyxFQUNkLFdBQXFCO0lBRXJCLE1BQU0sUUFBUSxHQUFvQixFQUFFLENBQUE7SUFDcEMsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3ZELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUE7WUFDdEMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNyQixJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDaEIsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUNsRCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLFVBQVUsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUNwRSxDQUFBO2dCQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxZQUFZLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxZQUEwQixFQUMxQixVQUFtQixFQUNuQixNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFDekIsV0FBc0I7SUFFdEIsTUFBTSxRQUFRLEdBQW9CLEVBQUUsQ0FBQTtJQUNwQyxJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzNDLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7WUFDdEMsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN2RCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDdkMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDdEIsQ0FBQztnQkFDRCxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUNsRCxNQUFNLEVBQ04sQ0FBQyxDQUFDLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxLQUFLLFVBQVUsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUNwRSxDQUFBO29CQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLENBQ2xELElBQUksRUFDSixDQUFDLENBQUMsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssVUFBVSxJQUFJLEtBQUssR0FBRyxNQUFNLENBQ3BFLENBQUE7UUFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUNELFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUMzQyxDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsd0JBQXdCLENBQ3ZDLFlBQTBCLEVBQzFCLFVBQW1CLEVBQ25CLE1BQWMsRUFDZCxXQUFxQjtJQUVyQixNQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFBO0lBQ3BDLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUMvQyxVQUFVLEVBQ1YsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxLQUFLLFVBQVUsSUFBSSxLQUFLLElBQUksTUFBTSxDQUN2RSxDQUFBO1FBQ0QsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFBO0lBQzFCLENBQUM7SUFDRCxZQUFZLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQ2pDLFlBQTBCLEVBQzFCLFVBQW1CLEVBQ25CLFdBQXFCO0lBRXJCLE1BQU0sUUFBUSxHQUFvQixFQUFFLENBQUE7SUFDcEMsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUN0QyxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQy9DLFVBQVUsRUFDVixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsS0FBSyxVQUFVLENBQzdDLENBQUE7UUFDRCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEIsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUNELFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUMzQyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsWUFBMEIsRUFDMUIsU0FBaUIsRUFDakIsVUFBbUIsRUFDbkIsa0JBQTRCO0lBRTVCLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBcUIsRUFBRSxLQUFhLEVBQUUsRUFBRSxDQUN2RCxLQUFLLEtBQUssU0FBUztRQUNuQixNQUFNLENBQUMsV0FBVyxLQUFLLFVBQVU7UUFDakMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUM5RCxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzVELFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUMzQyxDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsWUFBMEIsRUFDMUIsVUFBbUIsRUFDbkIsa0JBQTRCO0lBRTVCLE1BQU0sZUFBZSxHQUFvQixFQUFFLENBQUE7SUFDM0MsS0FBSyxNQUFNLFVBQVUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1FBQzdDLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdkUsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakMsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQXFCLEVBQUUsRUFBRSxDQUN4QyxlQUFlLENBQUMsS0FBSyxDQUNwQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQ2xCLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQzNFLElBQUksTUFBTSxDQUFDLFdBQVcsS0FBSyxVQUFVLENBQUE7SUFDdkMsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUM1RCxZQUFZLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsWUFBMEIsRUFDMUIsTUFBYyxFQUNkLFVBQW1CO0lBRW5CLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUE7SUFDMUMsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQTtJQUNwQyxNQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFBO0lBQ3BDLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzlDLElBQUksVUFBVSxLQUFLLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5RCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxZQUFZLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsWUFBMEIsRUFDMUIsSUFBWSxFQUNaLFVBQW1CO0lBRW5CLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUE7SUFDcEMsTUFBTSxRQUFRLEdBQW9CLEVBQUUsQ0FBQTtJQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM5QyxJQUFJLFVBQVUsS0FBSyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFDRCxZQUFZLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDM0MsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxVQUFrQixFQUFFLFlBQTBCO0lBQy9FLElBQUksZUFBZSxHQUFrQixJQUFJLENBQUE7SUFDekMsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM5RCxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUM1QixlQUFlLEdBQUcsYUFBYSxDQUFDLGVBQWUsQ0FBQTtRQUMvQyxrSEFBa0g7UUFDbEgsSUFBSSxVQUFVLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDcEMsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFBO1lBQ2xELElBQUksZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsZUFBZSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUM1RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsZUFBZSxHQUFHLElBQUksQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLGVBQWUsQ0FBQTtBQUN2QixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUFDLFVBQWtCLEVBQUUsWUFBMEI7SUFDakYsSUFBSSxhQUFhLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM1RCw4REFBOEQ7SUFDOUQsSUFBSSxhQUFhLEtBQUssSUFBSSxJQUFJLGFBQWEsQ0FBQyxlQUFlLEtBQUssVUFBVSxFQUFFLENBQUM7UUFDNUUscUhBQXFIO1FBQ3JILElBQUksVUFBVSxLQUFLLGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNsRCxPQUFPLGFBQWEsQ0FBQyxlQUFlLENBQUE7UUFDckMsQ0FBQzthQUFNLENBQUM7WUFDUCw4Q0FBOEM7WUFDOUMsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFBO1lBQ3JELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtZQUNyQixJQUFJLG1CQUFtQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNuRixDQUFDO1lBRUQsMkJBQTJCO1lBQzNCLE9BQU8sYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMvQixJQUFJLGFBQWEsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ25DLGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO29CQUU1RSxzQkFBc0I7b0JBQ3RCLElBQUksYUFBYSxDQUFDLGVBQWUsSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDcEQsT0FBTyxJQUFJLENBQUE7b0JBQ1osQ0FBQzt5QkFBTSxJQUFJLGFBQWEsQ0FBQyxXQUFXLEtBQUssbUJBQW1CLEVBQUUsQ0FBQzt3QkFDOUQsT0FBTyxhQUFhLENBQUMsZUFBZSxDQUFBO29CQUNyQyxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLGtEQUFrRDtRQUNsRCxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUM5RSxPQUFPLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDL0Isa0NBQWtDO2dCQUNsQyxJQUFJLGFBQWEsQ0FBQyxlQUFlLEdBQUcsVUFBVSxFQUFFLENBQUM7b0JBQ2hELE9BQU8sYUFBYSxDQUFDLGVBQWUsQ0FBQTtnQkFDckMsQ0FBQztnQkFDRCxJQUFJLGFBQWEsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ25DLGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUM3RSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxHQUFHLElBQUksQ0FBQTtnQkFDckIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsVUFBa0IsRUFBRSxZQUEwQjtJQUM3RSxJQUFJLGFBQWEsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzVELDBEQUEwRDtJQUMxRCxJQUFJLGFBQWEsS0FBSyxJQUFJLElBQUksYUFBYSxDQUFDLGVBQWUsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUM1RSw4Q0FBOEM7UUFDOUMsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFBO1FBQ3JELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUNyQixJQUFJLG1CQUFtQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDaEMsYUFBYSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7YUFBTSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQzthQUFNLENBQUM7WUFDUCxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN2RixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLE9BQU8sYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO1lBQy9CLElBQUksYUFBYSxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUM3RCxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFFNUUsc0JBQXNCO2dCQUN0QixJQUFJLGFBQWEsQ0FBQyxlQUFlLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ3BELE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7cUJBQU0sSUFBSSxhQUFhLENBQUMsV0FBVyxLQUFLLG1CQUFtQixFQUFFLENBQUM7b0JBQzlELE9BQU8sYUFBYSxDQUFDLGVBQWUsQ0FBQTtnQkFDckMsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxrREFBa0Q7UUFDbEQsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEQsT0FBTyxhQUFhLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQy9CLGlDQUFpQztnQkFDakMsSUFBSSxhQUFhLENBQUMsZUFBZSxHQUFHLFVBQVUsRUFBRSxDQUFDO29CQUNoRCxPQUFPLGFBQWEsQ0FBQyxlQUFlLENBQUE7Z0JBQ3JDLENBQUM7Z0JBQ0QsSUFBSSxhQUFhLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQzdELGFBQWEsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUM3RSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxHQUFHLElBQUksQ0FBQTtnQkFDckIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9