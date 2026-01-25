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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvZm9sZGluZ01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQU9qRSxPQUFPLEVBRU4sY0FBYyxHQUlkLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBMEJ0RCxNQUFNLE9BQU8sWUFBWTtJQVV4QixJQUFXLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ3JCLENBQUM7SUFDRCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxJQUFXLGtCQUFrQjtRQUM1QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsWUFBWSxTQUFxQixFQUFFLGtCQUF1QztRQWJ6RCx3QkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBMkIsQ0FBQTtRQUM3RCxnQkFBVyxHQUFtQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBYTNGLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzNCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxrQkFBa0IsQ0FBQTtRQUM3QyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRU0sbUJBQW1CLENBQUMsY0FB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