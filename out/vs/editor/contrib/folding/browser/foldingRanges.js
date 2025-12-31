/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var FoldSource;
(function (FoldSource) {
    FoldSource[FoldSource["provider"] = 0] = "provider";
    FoldSource[FoldSource["userDefined"] = 1] = "userDefined";
    FoldSource[FoldSource["recovered"] = 2] = "recovered";
})(FoldSource || (FoldSource = {}));
export const foldSourceAbbr = {
    [0 /* FoldSource.provider */]: ' ',
    [1 /* FoldSource.userDefined */]: 'u',
    [2 /* FoldSource.recovered */]: 'r',
};
export const MAX_FOLDING_REGIONS = 0xffff;
export const MAX_LINE_NUMBER = 0xffffff;
const MASK_INDENT = 0xff000000;
class BitField {
    constructor(size) {
        const numWords = Math.ceil(size / 32);
        this._states = new Uint32Array(numWords);
    }
    get(index) {
        const arrayIndex = (index / 32) | 0;
        const bit = index % 32;
        return (this._states[arrayIndex] & (1 << bit)) !== 0;
    }
    set(index, newState) {
        const arrayIndex = (index / 32) | 0;
        const bit = index % 32;
        const value = this._states[arrayIndex];
        if (newState) {
            this._states[arrayIndex] = value | (1 << bit);
        }
        else {
            this._states[arrayIndex] = value & ~(1 << bit);
        }
    }
}
export class FoldingRegions {
    constructor(startIndexes, endIndexes, types) {
        if (startIndexes.length !== endIndexes.length || startIndexes.length > MAX_FOLDING_REGIONS) {
            throw new Error('invalid startIndexes or endIndexes size');
        }
        this._startIndexes = startIndexes;
        this._endIndexes = endIndexes;
        this._collapseStates = new BitField(startIndexes.length);
        this._userDefinedStates = new BitField(startIndexes.length);
        this._recoveredStates = new BitField(startIndexes.length);
        this._types = types;
        this._parentsComputed = false;
    }
    ensureParentIndices() {
        if (!this._parentsComputed) {
            this._parentsComputed = true;
            const parentIndexes = [];
            const isInsideLast = (startLineNumber, endLineNumber) => {
                const index = parentIndexes[parentIndexes.length - 1];
                return (this.getStartLineNumber(index) <= startLineNumber &&
                    this.getEndLineNumber(index) >= endLineNumber);
            };
            for (let i = 0, len = this._startIndexes.length; i < len; i++) {
                const startLineNumber = this._startIndexes[i];
                const endLineNumber = this._endIndexes[i];
                if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
                    throw new Error('startLineNumber or endLineNumber must not exceed ' + MAX_LINE_NUMBER);
                }
                while (parentIndexes.length > 0 && !isInsideLast(startLineNumber, endLineNumber)) {
                    parentIndexes.pop();
                }
                const parentIndex = parentIndexes.length > 0 ? parentIndexes[parentIndexes.length - 1] : -1;
                parentIndexes.push(i);
                this._startIndexes[i] = startLineNumber + ((parentIndex & 0xff) << 24);
                this._endIndexes[i] = endLineNumber + ((parentIndex & 0xff00) << 16);
            }
        }
    }
    get length() {
        return this._startIndexes.length;
    }
    getStartLineNumber(index) {
        return this._startIndexes[index] & MAX_LINE_NUMBER;
    }
    getEndLineNumber(index) {
        return this._endIndexes[index] & MAX_LINE_NUMBER;
    }
    getType(index) {
        return this._types ? this._types[index] : undefined;
    }
    hasTypes() {
        return !!this._types;
    }
    isCollapsed(index) {
        return this._collapseStates.get(index);
    }
    setCollapsed(index, newState) {
        this._collapseStates.set(index, newState);
    }
    isUserDefined(index) {
        return this._userDefinedStates.get(index);
    }
    setUserDefined(index, newState) {
        return this._userDefinedStates.set(index, newState);
    }
    isRecovered(index) {
        return this._recoveredStates.get(index);
    }
    setRecovered(index, newState) {
        return this._recoveredStates.set(index, newState);
    }
    getSource(index) {
        if (this.isUserDefined(index)) {
            return 1 /* FoldSource.userDefined */;
        }
        else if (this.isRecovered(index)) {
            return 2 /* FoldSource.recovered */;
        }
        return 0 /* FoldSource.provider */;
    }
    setSource(index, source) {
        if (source === 1 /* FoldSource.userDefined */) {
            this.setUserDefined(index, true);
            this.setRecovered(index, false);
        }
        else if (source === 2 /* FoldSource.recovered */) {
            this.setUserDefined(index, false);
            this.setRecovered(index, true);
        }
        else {
            this.setUserDefined(index, false);
            this.setRecovered(index, false);
        }
    }
    setCollapsedAllOfType(type, newState) {
        let hasChanged = false;
        if (this._types) {
            for (let i = 0; i < this._types.length; i++) {
                if (this._types[i] === type) {
                    this.setCollapsed(i, newState);
                    hasChanged = true;
                }
            }
        }
        return hasChanged;
    }
    toRegion(index) {
        return new FoldingRegion(this, index);
    }
    getParentIndex(index) {
        this.ensureParentIndices();
        const parent = ((this._startIndexes[index] & MASK_INDENT) >>> 24) +
            ((this._endIndexes[index] & MASK_INDENT) >>> 16);
        if (parent === MAX_FOLDING_REGIONS) {
            return -1;
        }
        return parent;
    }
    contains(index, line) {
        return this.getStartLineNumber(index) <= line && this.getEndLineNumber(index) >= line;
    }
    findIndex(line) {
        let low = 0, high = this._startIndexes.length;
        if (high === 0) {
            return -1; // no children
        }
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (line < this.getStartLineNumber(mid)) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low - 1;
    }
    findRange(line) {
        let index = this.findIndex(line);
        if (index >= 0) {
            const endLineNumber = this.getEndLineNumber(index);
            if (endLineNumber >= line) {
                return index;
            }
            index = this.getParentIndex(index);
            while (index !== -1) {
                if (this.contains(index, line)) {
                    return index;
                }
                index = this.getParentIndex(index);
            }
        }
        return -1;
    }
    toString() {
        const res = [];
        for (let i = 0; i < this.length; i++) {
            res[i] =
                `[${foldSourceAbbr[this.getSource(i)]}${this.isCollapsed(i) ? '+' : '-'}] ${this.getStartLineNumber(i)}/${this.getEndLineNumber(i)}`;
        }
        return res.join(', ');
    }
    toFoldRange(index) {
        return {
            startLineNumber: this._startIndexes[index] & MAX_LINE_NUMBER,
            endLineNumber: this._endIndexes[index] & MAX_LINE_NUMBER,
            type: this._types ? this._types[index] : undefined,
            isCollapsed: this.isCollapsed(index),
            source: this.getSource(index),
        };
    }
    static fromFoldRanges(ranges) {
        const rangesLength = ranges.length;
        const startIndexes = new Uint32Array(rangesLength);
        const endIndexes = new Uint32Array(rangesLength);
        let types = [];
        let gotTypes = false;
        for (let i = 0; i < rangesLength; i++) {
            const range = ranges[i];
            startIndexes[i] = range.startLineNumber;
            endIndexes[i] = range.endLineNumber;
            types.push(range.type);
            if (range.type) {
                gotTypes = true;
            }
        }
        if (!gotTypes) {
            types = undefined;
        }
        const regions = new FoldingRegions(startIndexes, endIndexes, types);
        for (let i = 0; i < rangesLength; i++) {
            if (ranges[i].isCollapsed) {
                regions.setCollapsed(i, true);
            }
            regions.setSource(i, ranges[i].source);
        }
        return regions;
    }
    /**
     * Two inputs, each a FoldingRegions or a FoldRange[], are merged.
     * Each input must be pre-sorted on startLineNumber.
     * The first list is assumed to always include all regions currently defined by range providers.
     * The second list only contains the previously collapsed and all manual ranges.
     * If the line position matches, the range of the new range is taken, and the range is no longer manual
     * When an entry in one list overlaps an entry in the other, the second list's entry "wins" and
     * overlapping entries in the first list are discarded.
     * Invalid entries are discarded. An entry is invalid if:
     * 		the start and end line numbers aren't a valid range of line numbers,
     * 		it is out of sequence or has the same start line as a preceding entry,
     * 		it overlaps a preceding entry and is not fully contained by that entry.
     */
    static sanitizeAndMerge(rangesA, rangesB, maxLineNumber, selection) {
        maxLineNumber = maxLineNumber ?? Number.MAX_VALUE;
        const getIndexedFunction = (r, limit) => {
            return Array.isArray(r)
                ? (i) => {
                    return i < limit ? r[i] : undefined;
                }
                : (i) => {
                    return i < limit ? r.toFoldRange(i) : undefined;
                };
        };
        const getA = getIndexedFunction(rangesA, rangesA.length);
        const getB = getIndexedFunction(rangesB, rangesB.length);
        let indexA = 0;
        let indexB = 0;
        let nextA = getA(0);
        let nextB = getB(0);
        const stackedRanges = [];
        let topStackedRange;
        let prevLineNumber = 0;
        const resultRanges = [];
        while (nextA || nextB) {
            let useRange = undefined;
            if (nextB && (!nextA || nextA.startLineNumber >= nextB.startLineNumber)) {
                if (nextA && nextA.startLineNumber === nextB.startLineNumber) {
                    if (nextB.source === 1 /* FoldSource.userDefined */) {
                        // a user defined range (possibly unfolded)
                        useRange = nextB;
                    }
                    else {
                        // a previously folded range or a (possibly unfolded) recovered range
                        useRange = nextA;
                        // stays collapsed if the range still has the same number of lines or the selection is not in the range or after it
                        useRange.isCollapsed =
                            nextB.isCollapsed &&
                                (nextA.endLineNumber === nextB.endLineNumber ||
                                    !selection?.startsInside(nextA.startLineNumber + 1, nextA.endLineNumber + 1));
                        useRange.source = 0 /* FoldSource.provider */;
                    }
                    nextA = getA(++indexA); // not necessary, just for speed
                }
                else {
                    useRange = nextB;
                    if (nextB.isCollapsed && nextB.source === 0 /* FoldSource.provider */) {
                        // a previously collapsed range
                        useRange.source = 2 /* FoldSource.recovered */;
                    }
                }
                nextB = getB(++indexB);
            }
            else {
                // nextA is next. The user folded B set takes precedence and we sometimes need to look
                // ahead in it to check for an upcoming conflict.
                let scanIndex = indexB;
                let prescanB = nextB;
                while (true) {
                    if (!prescanB || prescanB.startLineNumber > nextA.endLineNumber) {
                        useRange = nextA;
                        break; // no conflict, use this nextA
                    }
                    if (prescanB.source === 1 /* FoldSource.userDefined */ &&
                        prescanB.endLineNumber > nextA.endLineNumber) {
                        // we found a user folded range, it wins
                        break; // without setting nextResult, so this nextA gets skipped
                    }
                    prescanB = getB(++scanIndex);
                }
                nextA = getA(++indexA);
            }
            if (useRange) {
                while (topStackedRange && topStackedRange.endLineNumber < useRange.startLineNumber) {
                    topStackedRange = stackedRanges.pop();
                }
                if (useRange.endLineNumber > useRange.startLineNumber &&
                    useRange.startLineNumber > prevLineNumber &&
                    useRange.endLineNumber <= maxLineNumber &&
                    (!topStackedRange || topStackedRange.endLineNumber >= useRange.endLineNumber)) {
                    resultRanges.push(useRange);
                    prevLineNumber = useRange.startLineNumber;
                    if (topStackedRange) {
                        stackedRanges.push(topStackedRange);
                    }
                    topStackedRange = useRange;
                }
            }
        }
        return resultRanges;
    }
}
export class FoldingRegion {
    constructor(ranges, index) {
        this.ranges = ranges;
        this.index = index;
    }
    get startLineNumber() {
        return this.ranges.getStartLineNumber(this.index);
    }
    get endLineNumber() {
        return this.ranges.getEndLineNumber(this.index);
    }
    get regionIndex() {
        return this.index;
    }
    get parentIndex() {
        return this.ranges.getParentIndex(this.index);
    }
    get isCollapsed() {
        return this.ranges.isCollapsed(this.index);
    }
    containedBy(range) {
        return (range.startLineNumber <= this.startLineNumber && range.endLineNumber >= this.endLineNumber);
    }
    containsLine(lineNumber) {
        return this.startLineNumber <= lineNumber && lineNumber <= this.endLineNumber;
    }
    hidesLine(lineNumber) {
        return this.startLineNumber < lineNumber && lineNumber <= this.endLineNumber;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZ1Jhbmdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9mb2xkaW5nUmFuZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE1BQU0sQ0FBTixJQUFrQixVQUlqQjtBQUpELFdBQWtCLFVBQVU7SUFDM0IsbURBQVksQ0FBQTtJQUNaLHlEQUFlLENBQUE7SUFDZixxREFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUppQixVQUFVLEtBQVYsVUFBVSxRQUkzQjtBQUVELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRztJQUM3Qiw2QkFBcUIsRUFBRSxHQUFHO0lBQzFCLGdDQUF3QixFQUFFLEdBQUc7SUFDN0IsOEJBQXNCLEVBQUUsR0FBRztDQUMzQixDQUFBO0FBVUQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsTUFBTSxDQUFBO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUE7QUFFdkMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFBO0FBRTlCLE1BQU0sUUFBUTtJQUViLFlBQVksSUFBWTtRQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTSxHQUFHLENBQUMsS0FBYTtRQUN2QixNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkMsTUFBTSxHQUFHLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQTtRQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENB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