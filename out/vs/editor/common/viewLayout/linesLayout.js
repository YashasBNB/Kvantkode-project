/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
class PendingChanges {
    constructor() {
        this._hasPending = false;
        this._inserts = [];
        this._changes = [];
        this._removes = [];
    }
    insert(x) {
        this._hasPending = true;
        this._inserts.push(x);
    }
    change(x) {
        this._hasPending = true;
        this._changes.push(x);
    }
    remove(x) {
        this._hasPending = true;
        this._removes.push(x);
    }
    mustCommit() {
        return this._hasPending;
    }
    commit(linesLayout) {
        if (!this._hasPending) {
            return;
        }
        const inserts = this._inserts;
        const changes = this._changes;
        const removes = this._removes;
        this._hasPending = false;
        this._inserts = [];
        this._changes = [];
        this._removes = [];
        linesLayout._commitPendingChanges(inserts, changes, removes);
    }
}
export class EditorWhitespace {
    constructor(id, afterLineNumber, ordinal, height, minWidth) {
        this.id = id;
        this.afterLineNumber = afterLineNumber;
        this.ordinal = ordinal;
        this.height = height;
        this.minWidth = minWidth;
        this.prefixSum = 0;
    }
}
/**
 * Layouting of objects that take vertical space (by having a height) and push down other objects.
 *
 * These objects are basically either text (lines) or spaces between those lines (whitespaces).
 * This provides commodity operations for working with lines that contain whitespace that pushes lines lower (vertically).
 */
export class LinesLayout {
    static { this.INSTANCE_COUNT = 0; }
    constructor(lineCount, lineHeight, paddingTop, paddingBottom) {
        this._instanceId = strings.singleLetterHash(++LinesLayout.INSTANCE_COUNT);
        this._pendingChanges = new PendingChanges();
        this._lastWhitespaceId = 0;
        this._arr = [];
        this._prefixSumValidIndex = -1;
        this._minWidth = -1; /* marker for not being computed */
        this._lineCount = lineCount;
        this._lineHeight = lineHeight;
        this._paddingTop = paddingTop;
        this._paddingBottom = paddingBottom;
    }
    /**
     * Find the insertion index for a new value inside a sorted array of values.
     * If the value is already present in the sorted array, the insertion index will be after the already existing value.
     */
    static findInsertionIndex(arr, afterLineNumber, ordinal) {
        let low = 0;
        let high = arr.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (afterLineNumber === arr[mid].afterLineNumber) {
                if (ordinal < arr[mid].ordinal) {
                    high = mid;
                }
                else {
                    low = mid + 1;
                }
            }
            else if (afterLineNumber < arr[mid].afterLineNumber) {
                high = mid;
            }
            else {
                low = mid + 1;
            }
        }
        return low;
    }
    /**
     * Change the height of a line in pixels.
     */
    setLineHeight(lineHeight) {
        this._checkPendingChanges();
        this._lineHeight = lineHeight;
    }
    /**
     * Changes the padding used to calculate vertical offsets.
     */
    setPadding(paddingTop, paddingBottom) {
        this._paddingTop = paddingTop;
        this._paddingBottom = paddingBottom;
    }
    /**
     * Set the number of lines.
     *
     * @param lineCount New number of lines.
     */
    onFlushed(lineCount) {
        this._checkPendingChanges();
        this._lineCount = lineCount;
    }
    changeWhitespace(callback) {
        let hadAChange = false;
        try {
            const accessor = {
                insertWhitespace: (afterLineNumber, ordinal, heightInPx, minWidth) => {
                    hadAChange = true;
                    afterLineNumber = afterLineNumber | 0;
                    ordinal = ordinal | 0;
                    heightInPx = heightInPx | 0;
                    minWidth = minWidth | 0;
                    const id = this._instanceId + ++this._lastWhitespaceId;
                    this._pendingChanges.insert(new EditorWhitespace(id, afterLineNumber, ordinal, heightInPx, minWidth));
                    return id;
                },
                changeOneWhitespace: (id, newAfterLineNumber, newHeight) => {
                    hadAChange = true;
                    newAfterLineNumber = newAfterLineNumber | 0;
                    newHeight = newHeight | 0;
                    this._pendingChanges.change({ id, newAfterLineNumber, newHeight });
                },
                removeWhitespace: (id) => {
                    hadAChange = true;
                    this._pendingChanges.remove({ id });
                },
            };
            callback(accessor);
        }
        finally {
            this._pendingChanges.commit(this);
        }
        return hadAChange;
    }
    _commitPendingChanges(inserts, changes, removes) {
        if (inserts.length > 0 || removes.length > 0) {
            this._minWidth = -1; /* marker for not being computed */
        }
        if (inserts.length + changes.length + removes.length <= 1) {
            // when only one thing happened, handle it "delicately"
            for (const insert of inserts) {
                this._insertWhitespace(insert);
            }
            for (const change of changes) {
                this._changeOneWhitespace(change.id, change.newAfterLineNumber, change.newHeight);
            }
            for (const remove of removes) {
                const index = this._findWhitespaceIndex(remove.id);
                if (index === -1) {
                    continue;
                }
                this._removeWhitespace(index);
            }
            return;
        }
        // simply rebuild the entire datastructure
        const toRemove = new Set();
        for (const remove of removes) {
            toRemove.add(remove.id);
        }
        const toChange = new Map();
        for (const change of changes) {
            toChange.set(change.id, change);
        }
        const applyRemoveAndChange = (whitespaces) => {
            const result = [];
            for (const whitespace of whitespaces) {
                if (toRemove.has(whitespace.id)) {
                    continue;
                }
                if (toChange.has(whitespace.id)) {
                    const change = toChange.get(whitespace.id);
                    whitespace.afterLineNumber = change.newAfterLineNumber;
                    whitespace.height = change.newHeight;
                }
                result.push(whitespace);
            }
            return result;
        };
        const result = applyRemoveAndChange(this._arr).concat(applyRemoveAndChange(inserts));
        result.sort((a, b) => {
            if (a.afterLineNumber === b.afterLineNumber) {
                return a.ordinal - b.ordinal;
            }
            return a.afterLineNumber - b.afterLineNumber;
        });
        this._arr = result;
        this._prefixSumValidIndex = -1;
    }
    _checkPendingChanges() {
        if (this._pendingChanges.mustCommit()) {
            this._pendingChanges.commit(this);
        }
    }
    _insertWhitespace(whitespace) {
        const insertIndex = LinesLayout.findInsertionIndex(this._arr, whitespace.afterLineNumber, whitespace.ordinal);
        this._arr.splice(insertIndex, 0, whitespace);
        this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, insertIndex - 1);
    }
    _findWhitespaceIndex(id) {
        const arr = this._arr;
        for (let i = 0, len = arr.length; i < len; i++) {
            if (arr[i].id === id) {
                return i;
            }
        }
        return -1;
    }
    _changeOneWhitespace(id, newAfterLineNumber, newHeight) {
        const index = this._findWhitespaceIndex(id);
        if (index === -1) {
            return;
        }
        if (this._arr[index].height !== newHeight) {
            this._arr[index].height = newHeight;
            this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, index - 1);
        }
        if (this._arr[index].afterLineNumber !== newAfterLineNumber) {
            // `afterLineNumber` changed for this whitespace
            // Record old whitespace
            const whitespace = this._arr[index];
            // Since changing `afterLineNumber` can trigger a reordering, we're gonna remove this whitespace
            this._removeWhitespace(index);
            whitespace.afterLineNumber = newAfterLineNumber;
            // And add it again
            this._insertWhitespace(whitespace);
        }
    }
    _removeWhitespace(removeIndex) {
        this._arr.splice(removeIndex, 1);
        this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, removeIndex - 1);
    }
    /**
     * Notify the layouter that lines have been deleted (a continuous zone of lines).
     *
     * @param fromLineNumber The line number at which the deletion started, inclusive
     * @param toLineNumber The line number at which the deletion ended, inclusive
     */
    onLinesDeleted(fromLineNumber, toLineNumber) {
        this._checkPendingChanges();
        fromLineNumber = fromLineNumber | 0;
        toLineNumber = toLineNumber | 0;
        this._lineCount -= toLineNumber - fromLineNumber + 1;
        for (let i = 0, len = this._arr.length; i < len; i++) {
            const afterLineNumber = this._arr[i].afterLineNumber;
            if (fromLineNumber <= afterLineNumber && afterLineNumber <= toLineNumber) {
                // The line this whitespace was after has been deleted
                //  => move whitespace to before first deleted line
                this._arr[i].afterLineNumber = fromLineNumber - 1;
            }
            else if (afterLineNumber > toLineNumber) {
                // The line this whitespace was after has been moved up
                //  => move whitespace up
                this._arr[i].afterLineNumber -= toLineNumber - fromLineNumber + 1;
            }
        }
    }
    /**
     * Notify the layouter that lines have been inserted (a continuous zone of lines).
     *
     * @param fromLineNumber The line number at which the insertion started, inclusive
     * @param toLineNumber The line number at which the insertion ended, inclusive.
     */
    onLinesInserted(fromLineNumber, toLineNumber) {
        this._checkPendingChanges();
        fromLineNumber = fromLineNumber | 0;
        toLineNumber = toLineNumber | 0;
        this._lineCount += toLineNumber - fromLineNumber + 1;
        for (let i = 0, len = this._arr.length; i < len; i++) {
            const afterLineNumber = this._arr[i].afterLineNumber;
            if (fromLineNumber <= afterLineNumber) {
                this._arr[i].afterLineNumber += toLineNumber - fromLineNumber + 1;
            }
        }
    }
    /**
     * Get the sum of all the whitespaces.
     */
    getWhitespacesTotalHeight() {
        this._checkPendingChanges();
        if (this._arr.length === 0) {
            return 0;
        }
        return this.getWhitespacesAccumulatedHeight(this._arr.length - 1);
    }
    /**
     * Return the sum of the heights of the whitespaces at [0..index].
     * This includes the whitespace at `index`.
     *
     * @param index The index of the whitespace.
     * @return The sum of the heights of all whitespaces before the one at `index`, including the one at `index`.
     */
    getWhitespacesAccumulatedHeight(index) {
        this._checkPendingChanges();
        index = index | 0;
        let startIndex = Math.max(0, this._prefixSumValidIndex + 1);
        if (startIndex === 0) {
            this._arr[0].prefixSum = this._arr[0].height;
            startIndex++;
        }
        for (let i = startIndex; i <= index; i++) {
            this._arr[i].prefixSum = this._arr[i - 1].prefixSum + this._arr[i].height;
        }
        this._prefixSumValidIndex = Math.max(this._prefixSumValidIndex, index);
        return this._arr[index].prefixSum;
    }
    /**
     * Get the sum of heights for all objects.
     *
     * @return The sum of heights for all objects.
     */
    getLinesTotalHeight() {
        this._checkPendingChanges();
        const linesHeight = this._lineHeight * this._lineCount;
        const whitespacesHeight = this.getWhitespacesTotalHeight();
        return linesHeight + whitespacesHeight + this._paddingTop + this._paddingBottom;
    }
    /**
     * Returns the accumulated height of whitespaces before the given line number.
     *
     * @param lineNumber The line number
     */
    getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        const lastWhitespaceBeforeLineNumber = this._findLastWhitespaceBeforeLineNumber(lineNumber);
        if (lastWhitespaceBeforeLineNumber === -1) {
            return 0;
        }
        return this.getWhitespacesAccumulatedHeight(lastWhitespaceBeforeLineNumber);
    }
    _findLastWhitespaceBeforeLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        // Find the whitespace before line number
        const arr = this._arr;
        let low = 0;
        let high = arr.length - 1;
        while (low <= high) {
            const delta = (high - low) | 0;
            const halfDelta = (delta / 2) | 0;
            const mid = (low + halfDelta) | 0;
            if (arr[mid].afterLineNumber < lineNumber) {
                if (mid + 1 >= arr.length || arr[mid + 1].afterLineNumber >= lineNumber) {
                    return mid;
                }
                else {
                    low = (mid + 1) | 0;
                }
            }
            else {
                high = (mid - 1) | 0;
            }
        }
        return -1;
    }
    _findFirstWhitespaceAfterLineNumber(lineNumber) {
        lineNumber = lineNumber | 0;
        const lastWhitespaceBeforeLineNumber = this._findLastWhitespaceBeforeLineNumber(lineNumber);
        const firstWhitespaceAfterLineNumber = lastWhitespaceBeforeLineNumber + 1;
        if (firstWhitespaceAfterLineNumber < this._arr.length) {
            return firstWhitespaceAfterLineNumber;
        }
        return -1;
    }
    /**
     * Find the index of the first whitespace which has `afterLineNumber` >= `lineNumber`.
     * @return The index of the first whitespace with `afterLineNumber` >= `lineNumber` or -1 if no whitespace is found.
     */
    getFirstWhitespaceIndexAfterLineNumber(lineNumber) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        return this._findFirstWhitespaceAfterLineNumber(lineNumber);
    }
    /**
     * Get the vertical offset (the sum of heights for all objects above) a certain line number.
     *
     * @param lineNumber The line number
     * @return The sum of heights for all objects above `lineNumber`.
     */
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones = false) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        let previousLinesHeight;
        if (lineNumber > 1) {
            previousLinesHeight = this._lineHeight * (lineNumber - 1);
        }
        else {
            previousLinesHeight = 0;
        }
        const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber - (includeViewZones ? 1 : 0));
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    /**
     * Get the vertical offset (the sum of heights for all objects above) a certain line number.
     *
     * @param lineNumber The line number
     * @return The sum of heights for all objects above `lineNumber`.
     */
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones = false) {
        this._checkPendingChanges();
        lineNumber = lineNumber | 0;
        const previousLinesHeight = this._lineHeight * lineNumber;
        const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumber(lineNumber + (includeViewZones ? 1 : 0));
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    /**
     * Returns if there is any whitespace in the document.
     */
    hasWhitespace() {
        this._checkPendingChanges();
        return this.getWhitespacesCount() > 0;
    }
    /**
     * The maximum min width for all whitespaces.
     */
    getWhitespaceMinWidth() {
        this._checkPendingChanges();
        if (this._minWidth === -1) {
            let minWidth = 0;
            for (let i = 0, len = this._arr.length; i < len; i++) {
                minWidth = Math.max(minWidth, this._arr[i].minWidth);
            }
            this._minWidth = minWidth;
        }
        return this._minWidth;
    }
    /**
     * Check if `verticalOffset` is below all lines.
     */
    isAfterLines(verticalOffset) {
        this._checkPendingChanges();
        const totalHeight = this.getLinesTotalHeight();
        return verticalOffset > totalHeight;
    }
    isInTopPadding(verticalOffset) {
        if (this._paddingTop === 0) {
            return false;
        }
        this._checkPendingChanges();
        return verticalOffset < this._paddingTop;
    }
    isInBottomPadding(verticalOffset) {
        if (this._paddingBottom === 0) {
            return false;
        }
        this._checkPendingChanges();
        const totalHeight = this.getLinesTotalHeight();
        return verticalOffset >= totalHeight - this._paddingBottom;
    }
    /**
     * Find the first line number that is at or after vertical offset `verticalOffset`.
     * i.e. if getVerticalOffsetForLine(line) is x and getVerticalOffsetForLine(line + 1) is y, then
     * getLineNumberAtOrAfterVerticalOffset(i) = line, x <= i < y.
     *
     * @param verticalOffset The vertical offset to search at.
     * @return The line number at or after vertical offset `verticalOffset`.
     */
    getLineNumberAtOrAfterVerticalOffset(verticalOffset) {
        this._checkPendingChanges();
        verticalOffset = verticalOffset | 0;
        if (verticalOffset < 0) {
            return 1;
        }
        const linesCount = this._lineCount | 0;
        const lineHeight = this._lineHeight;
        let minLineNumber = 1;
        let maxLineNumber = linesCount;
        while (minLineNumber < maxLineNumber) {
            const midLineNumber = ((minLineNumber + maxLineNumber) / 2) | 0;
            const midLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(midLineNumber) | 0;
            if (verticalOffset >= midLineNumberVerticalOffset + lineHeight) {
                // vertical offset is after mid line number
                minLineNumber = midLineNumber + 1;
            }
            else if (verticalOffset >= midLineNumberVerticalOffset) {
                // Hit
                return midLineNumber;
            }
            else {
                // vertical offset is before mid line number, but mid line number could still be what we're searching for
                maxLineNumber = midLineNumber;
            }
        }
        if (minLineNumber > linesCount) {
            return linesCount;
        }
        return minLineNumber;
    }
    /**
     * Get all the lines and their relative vertical offsets that are positioned between `verticalOffset1` and `verticalOffset2`.
     *
     * @param verticalOffset1 The beginning of the viewport.
     * @param verticalOffset2 The end of the viewport.
     * @return A structure describing the lines positioned between `verticalOffset1` and `verticalOffset2`.
     */
    getLinesViewportData(verticalOffset1, verticalOffset2) {
        this._checkPendingChanges();
        verticalOffset1 = verticalOffset1 | 0;
        verticalOffset2 = verticalOffset2 | 0;
        const lineHeight = this._lineHeight;
        // Find first line number
        // We don't live in a perfect world, so the line number might start before or after verticalOffset1
        const startLineNumber = this.getLineNumberAtOrAfterVerticalOffset(verticalOffset1) | 0;
        const startLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(startLineNumber) | 0;
        let endLineNumber = this._lineCount | 0;
        // Also keep track of what whitespace we've got
        let whitespaceIndex = this.getFirstWhitespaceIndexAfterLineNumber(startLineNumber) | 0;
        const whitespaceCount = this.getWhitespacesCount() | 0;
        let currentWhitespaceHeight;
        let currentWhitespaceAfterLineNumber;
        if (whitespaceIndex === -1) {
            whitespaceIndex = whitespaceCount;
            currentWhitespaceAfterLineNumber = endLineNumber + 1;
            currentWhitespaceHeight = 0;
        }
        else {
            currentWhitespaceAfterLineNumber =
                this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex) | 0;
            currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
        }
        let currentVerticalOffset = startLineNumberVerticalOffset;
        let currentLineRelativeOffset = currentVerticalOffset;
        // IE (all versions) cannot handle units above about 1,533,908 px, so every 500k pixels bring numbers down
        const STEP_SIZE = 500000;
        let bigNumbersDelta = 0;
        if (startLineNumberVerticalOffset >= STEP_SIZE) {
            // Compute a delta that guarantees that lines are positioned at `lineHeight` increments
            bigNumbersDelta = Math.floor(startLineNumberVerticalOffset / STEP_SIZE) * STEP_SIZE;
            bigNumbersDelta = Math.floor(bigNumbersDelta / lineHeight) * lineHeight;
            currentLineRelativeOffset -= bigNumbersDelta;
        }
        const linesOffsets = [];
        const verticalCenter = verticalOffset1 + (verticalOffset2 - verticalOffset1) / 2;
        let centeredLineNumber = -1;
        // Figure out how far the lines go
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            if (centeredLineNumber === -1) {
                const currentLineTop = currentVerticalOffset;
                const currentLineBottom = currentVerticalOffset + lineHeight;
                if ((currentLineTop <= verticalCenter && verticalCenter < currentLineBottom) ||
                    currentLineTop > verticalCenter) {
                    centeredLineNumber = lineNumber;
                }
            }
            // Count current line height in the vertical offsets
            currentVerticalOffset += lineHeight;
            linesOffsets[lineNumber - startLineNumber] = currentLineRelativeOffset;
            // Next line starts immediately after this one
            currentLineRelativeOffset += lineHeight;
            while (currentWhitespaceAfterLineNumber === lineNumber) {
                // Push down next line with the height of the current whitespace
                currentLineRelativeOffset += currentWhitespaceHeight;
                // Count current whitespace in the vertical offsets
                currentVerticalOffset += currentWhitespaceHeight;
                whitespaceIndex++;
                if (whitespaceIndex >= whitespaceCount) {
                    currentWhitespaceAfterLineNumber = endLineNumber + 1;
                }
                else {
                    currentWhitespaceAfterLineNumber =
                        this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex) | 0;
                    currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
                }
            }
            if (currentVerticalOffset >= verticalOffset2) {
                // We have covered the entire viewport area, time to stop
                endLineNumber = lineNumber;
                break;
            }
        }
        if (centeredLineNumber === -1) {
            centeredLineNumber = endLineNumber;
        }
        const endLineNumberVerticalOffset = this.getVerticalOffsetForLineNumber(endLineNumber) | 0;
        let completelyVisibleStartLineNumber = startLineNumber;
        let completelyVisibleEndLineNumber = endLineNumber;
        if (completelyVisibleStartLineNumber < completelyVisibleEndLineNumber) {
            if (startLineNumberVerticalOffset < verticalOffset1) {
                completelyVisibleStartLineNumber++;
            }
        }
        if (completelyVisibleStartLineNumber < completelyVisibleEndLineNumber) {
            if (endLineNumberVerticalOffset + lineHeight > verticalOffset2) {
                completelyVisibleEndLineNumber--;
            }
        }
        return {
            bigNumbersDelta: bigNumbersDelta,
            startLineNumber: startLineNumber,
            endLineNumber: endLineNumber,
            relativeVerticalOffset: linesOffsets,
            centeredLineNumber: centeredLineNumber,
            completelyVisibleStartLineNumber: completelyVisibleStartLineNumber,
            completelyVisibleEndLineNumber: completelyVisibleEndLineNumber,
            lineHeight: this._lineHeight,
        };
    }
    getVerticalOffsetForWhitespaceIndex(whitespaceIndex) {
        this._checkPendingChanges();
        whitespaceIndex = whitespaceIndex | 0;
        const afterLineNumber = this.getAfterLineNumberForWhitespaceIndex(whitespaceIndex);
        let previousLinesHeight;
        if (afterLineNumber >= 1) {
            previousLinesHeight = this._lineHeight * afterLineNumber;
        }
        else {
            previousLinesHeight = 0;
        }
        let previousWhitespacesHeight;
        if (whitespaceIndex > 0) {
            previousWhitespacesHeight = this.getWhitespacesAccumulatedHeight(whitespaceIndex - 1);
        }
        else {
            previousWhitespacesHeight = 0;
        }
        return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
    }
    getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset) {
        this._checkPendingChanges();
        verticalOffset = verticalOffset | 0;
        let minWhitespaceIndex = 0;
        let maxWhitespaceIndex = this.getWhitespacesCount() - 1;
        if (maxWhitespaceIndex < 0) {
            return -1;
        }
        // Special case: nothing to be found
        const maxWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(maxWhitespaceIndex);
        const maxWhitespaceHeight = this.getHeightForWhitespaceIndex(maxWhitespaceIndex);
        if (verticalOffset >= maxWhitespaceVerticalOffset + maxWhitespaceHeight) {
            return -1;
        }
        while (minWhitespaceIndex < maxWhitespaceIndex) {
            const midWhitespaceIndex = Math.floor((minWhitespaceIndex + maxWhitespaceIndex) / 2);
            const midWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(midWhitespaceIndex);
            const midWhitespaceHeight = this.getHeightForWhitespaceIndex(midWhitespaceIndex);
            if (verticalOffset >= midWhitespaceVerticalOffset + midWhitespaceHeight) {
                // vertical offset is after whitespace
                minWhitespaceIndex = midWhitespaceIndex + 1;
            }
            else if (verticalOffset >= midWhitespaceVerticalOffset) {
                // Hit
                return midWhitespaceIndex;
            }
            else {
                // vertical offset is before whitespace, but midWhitespaceIndex might still be what we're searching for
                maxWhitespaceIndex = midWhitespaceIndex;
            }
        }
        return minWhitespaceIndex;
    }
    /**
     * Get exactly the whitespace that is layouted at `verticalOffset`.
     *
     * @param verticalOffset The vertical offset.
     * @return Precisely the whitespace that is layouted at `verticaloffset` or null.
     */
    getWhitespaceAtVerticalOffset(verticalOffset) {
        this._checkPendingChanges();
        verticalOffset = verticalOffset | 0;
        const candidateIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset);
        if (candidateIndex < 0) {
            return null;
        }
        if (candidateIndex >= this.getWhitespacesCount()) {
            return null;
        }
        const candidateTop = this.getVerticalOffsetForWhitespaceIndex(candidateIndex);
        if (candidateTop > verticalOffset) {
            return null;
        }
        const candidateHeight = this.getHeightForWhitespaceIndex(candidateIndex);
        const candidateId = this.getIdForWhitespaceIndex(candidateIndex);
        const candidateAfterLineNumber = this.getAfterLineNumberForWhitespaceIndex(candidateIndex);
        return {
            id: candidateId,
            afterLineNumber: candidateAfterLineNumber,
            verticalOffset: candidateTop,
            height: candidateHeight,
        };
    }
    /**
     * Get a list of whitespaces that are positioned between `verticalOffset1` and `verticalOffset2`.
     *
     * @param verticalOffset1 The beginning of the viewport.
     * @param verticalOffset2 The end of the viewport.
     * @return An array with all the whitespaces in the viewport. If no whitespace is in viewport, the array is empty.
     */
    getWhitespaceViewportData(verticalOffset1, verticalOffset2) {
        this._checkPendingChanges();
        verticalOffset1 = verticalOffset1 | 0;
        verticalOffset2 = verticalOffset2 | 0;
        const startIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset1);
        const endIndex = this.getWhitespacesCount() - 1;
        if (startIndex < 0) {
            return [];
        }
        const result = [];
        for (let i = startIndex; i <= endIndex; i++) {
            const top = this.getVerticalOffsetForWhitespaceIndex(i);
            const height = this.getHeightForWhitespaceIndex(i);
            if (top >= verticalOffset2) {
                break;
            }
            result.push({
                id: this.getIdForWhitespaceIndex(i),
                afterLineNumber: this.getAfterLineNumberForWhitespaceIndex(i),
                verticalOffset: top,
                height: height,
            });
        }
        return result;
    }
    /**
     * Get all whitespaces.
     */
    getWhitespaces() {
        this._checkPendingChanges();
        return this._arr.slice(0);
    }
    /**
     * The number of whitespaces.
     */
    getWhitespacesCount() {
        this._checkPendingChanges();
        return this._arr.length;
    }
    /**
     * Get the `id` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `id` of whitespace at `index`.
     */
    getIdForWhitespaceIndex(index) {
        this._checkPendingChanges();
        index = index | 0;
        return this._arr[index].id;
    }
    /**
     * Get the `afterLineNumber` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `afterLineNumber` of whitespace at `index`.
     */
    getAfterLineNumberForWhitespaceIndex(index) {
        this._checkPendingChanges();
        index = index | 0;
        return this._arr[index].afterLineNumber;
    }
    /**
     * Get the `height` for whitespace at index `index`.
     *
     * @param index The index of the whitespace.
     * @return `height` of whitespace at `index`.
     */
    getHeightForWhitespaceIndex(index) {
        this._checkPendingChanges();
        index = index | 0;
        return this._arr[index].height;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdMYXlvdXQvbGluZXNMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFRaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQVcxRCxNQUFNLGNBQWM7SUFNbkI7UUFDQyxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQTtRQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRU0sTUFBTSxDQUFDLENBQW1CO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFFTSxNQUFNLENBQUMsQ0FBaUI7UUFDOUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxDQUFpQjtRQUM5QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQTtRQUN2QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN0QixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxXQUF3QjtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FB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