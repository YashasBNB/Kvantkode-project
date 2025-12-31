/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LcsDiff } from '../../../base/common/diff/diff.js';
import { LinesDiff } from './linesDiffComputer.js';
import { RangeMapping, DetailedLineRangeMapping } from './rangeMapping.js';
import * as strings from '../../../base/common/strings.js';
import { Range } from '../core/range.js';
import { assertFn, checkAdjacentItems } from '../../../base/common/assert.js';
import { LineRange } from '../core/lineRange.js';
const MINIMUM_MATCHING_CHARACTER_LENGTH = 3;
export class LegacyLinesDiffComputer {
    computeDiff(originalLines, modifiedLines, options) {
        const diffComputer = new DiffComputer(originalLines, modifiedLines, {
            maxComputationTime: options.maxComputationTimeMs,
            shouldIgnoreTrimWhitespace: options.ignoreTrimWhitespace,
            shouldComputeCharChanges: true,
            shouldMakePrettyDiff: true,
            shouldPostProcessCharChanges: true,
        });
        const result = diffComputer.computeDiff();
        const changes = [];
        let lastChange = null;
        for (const c of result.changes) {
            let originalRange;
            if (c.originalEndLineNumber === 0) {
                // Insertion
                originalRange = new LineRange(c.originalStartLineNumber + 1, c.originalStartLineNumber + 1);
            }
            else {
                originalRange = new LineRange(c.originalStartLineNumber, c.originalEndLineNumber + 1);
            }
            let modifiedRange;
            if (c.modifiedEndLineNumber === 0) {
                // Deletion
                modifiedRange = new LineRange(c.modifiedStartLineNumber + 1, c.modifiedStartLineNumber + 1);
            }
            else {
                modifiedRange = new LineRange(c.modifiedStartLineNumber, c.modifiedEndLineNumber + 1);
            }
            let change = new DetailedLineRangeMapping(originalRange, modifiedRange, c.charChanges?.map((c) => new RangeMapping(new Range(c.originalStartLineNumber, c.originalStartColumn, c.originalEndLineNumber, c.originalEndColumn), new Range(c.modifiedStartLineNumber, c.modifiedStartColumn, c.modifiedEndLineNumber, c.modifiedEndColumn))));
            if (lastChange) {
                if (lastChange.modified.endLineNumberExclusive === change.modified.startLineNumber ||
                    lastChange.original.endLineNumberExclusive === change.original.startLineNumber) {
                    // join touching diffs. Probably moving diffs up/down in the algorithm causes touching diffs.
                    change = new DetailedLineRangeMapping(lastChange.original.join(change.original), lastChange.modified.join(change.modified), lastChange.innerChanges && change.innerChanges
                        ? lastChange.innerChanges.concat(change.innerChanges)
                        : undefined);
                    changes.pop();
                }
            }
            changes.push(change);
            lastChange = change;
        }
        assertFn(() => {
            return checkAdjacentItems(changes, (m1, m2) => m2.original.startLineNumber - m1.original.endLineNumberExclusive ===
                m2.modified.startLineNumber - m1.modified.endLineNumberExclusive &&
                // There has to be an unchanged line in between (otherwise both diffs should have been joined)
                m1.original.endLineNumberExclusive < m2.original.startLineNumber &&
                m1.modified.endLineNumberExclusive < m2.modified.startLineNumber);
        });
        return new LinesDiff(changes, [], result.quitEarly);
    }
}
function computeDiff(originalSequence, modifiedSequence, continueProcessingPredicate, pretty) {
    const diffAlgo = new LcsDiff(originalSequence, modifiedSequence, continueProcessingPredicate);
    return diffAlgo.ComputeDiff(pretty);
}
class LineSequence {
    constructor(lines) {
        const startColumns = [];
        const endColumns = [];
        for (let i = 0, length = lines.length; i < length; i++) {
            startColumns[i] = getFirstNonBlankColumn(lines[i], 1);
            endColumns[i] = getLastNonBlankColumn(lines[i], 1);
        }
        this.lines = lines;
        this._startColumns = startColumns;
        this._endColumns = endColumns;
    }
    getElements() {
        const elements = [];
        for (let i = 0, len = this.lines.length; i < len; i++) {
            elements[i] = this.lines[i].substring(this._startColumns[i] - 1, this._endColumns[i] - 1);
        }
        return elements;
    }
    getStrictElement(index) {
        return this.lines[index];
    }
    getStartLineNumber(i) {
        return i + 1;
    }
    getEndLineNumber(i) {
        return i + 1;
    }
    createCharSequence(shouldIgnoreTrimWhitespace, startIndex, endIndex) {
        const charCodes = [];
        const lineNumbers = [];
        const columns = [];
        let len = 0;
        for (let index = startIndex; index <= endIndex; index++) {
            const lineContent = this.lines[index];
            const startColumn = shouldIgnoreTrimWhitespace ? this._startColumns[index] : 1;
            const endColumn = shouldIgnoreTrimWhitespace
                ? this._endColumns[index]
                : lineContent.length + 1;
            for (let col = startColumn; col < endColumn; col++) {
                charCodes[len] = lineContent.charCodeAt(col - 1);
                lineNumbers[len] = index + 1;
                columns[len] = col;
                len++;
            }
            if (!shouldIgnoreTrimWhitespace && index < endIndex) {
                // Add \n if trim whitespace is not ignored
                charCodes[len] = 10 /* CharCode.LineFeed */;
                lineNumbers[len] = index + 1;
                columns[len] = lineContent.length + 1;
                len++;
            }
        }
        return new CharSequence(charCodes, lineNumbers, columns);
    }
}
class CharSequence {
    constructor(charCodes, lineNumbers, columns) {
        this._charCodes = charCodes;
        this._lineNumbers = lineNumbers;
        this._columns = columns;
    }
    toString() {
        return ('[' +
            this._charCodes
                .map((s, idx) => (s === 10 /* CharCode.LineFeed */ ? '\\n' : String.fromCharCode(s)) +
                `-(${this._lineNumbers[idx]},${this._columns[idx]})`)
                .join(', ') +
            ']');
    }
    _assertIndex(index, arr) {
        if (index < 0 || index >= arr.length) {
            throw new Error(`Illegal index`);
        }
    }
    getElements() {
        return this._charCodes;
    }
    getStartLineNumber(i) {
        if (i > 0 && i === this._lineNumbers.length) {
            // the start line number of the element after the last element
            // is the end line number of the last element
            return this.getEndLineNumber(i - 1);
        }
        this._assertIndex(i, this._lineNumbers);
        return this._lineNumbers[i];
    }
    getEndLineNumber(i) {
        if (i === -1) {
            // the end line number of the element before the first element
            // is the start line number of the first element
            return this.getStartLineNumber(i + 1);
        }
        this._assertIndex(i, this._lineNumbers);
        if (this._charCodes[i] === 10 /* CharCode.LineFeed */) {
            return this._lineNumbers[i] + 1;
        }
        return this._lineNumbers[i];
    }
    getStartColumn(i) {
        if (i > 0 && i === this._columns.length) {
            // the start column of the element after the last element
            // is the end column of the last element
            return this.getEndColumn(i - 1);
        }
        this._assertIndex(i, this._columns);
        return this._columns[i];
    }
    getEndColumn(i) {
        if (i === -1) {
            // the end column of the element before the first element
            // is the start column of the first element
            return this.getStartColumn(i + 1);
        }
        this._assertIndex(i, this._columns);
        if (this._charCodes[i] === 10 /* CharCode.LineFeed */) {
            return 1;
        }
        return this._columns[i] + 1;
    }
}
class CharChange {
    constructor(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn) {
        this.originalStartLineNumber = originalStartLineNumber;
        this.originalStartColumn = originalStartColumn;
        this.originalEndLineNumber = originalEndLineNumber;
        this.originalEndColumn = originalEndColumn;
        this.modifiedStartLineNumber = modifiedStartLineNumber;
        this.modifiedStartColumn = modifiedStartColumn;
        this.modifiedEndLineNumber = modifiedEndLineNumber;
        this.modifiedEndColumn = modifiedEndColumn;
    }
    static createFromDiffChange(diffChange, originalCharSequence, modifiedCharSequence) {
        const originalStartLineNumber = originalCharSequence.getStartLineNumber(diffChange.originalStart);
        const originalStartColumn = originalCharSequence.getStartColumn(diffChange.originalStart);
        const originalEndLineNumber = originalCharSequence.getEndLineNumber(diffChange.originalStart + diffChange.originalLength - 1);
        const originalEndColumn = originalCharSequence.getEndColumn(diffChange.originalStart + diffChange.originalLength - 1);
        const modifiedStartLineNumber = modifiedCharSequence.getStartLineNumber(diffChange.modifiedStart);
        const modifiedStartColumn = modifiedCharSequence.getStartColumn(diffChange.modifiedStart);
        const modifiedEndLineNumber = modifiedCharSequence.getEndLineNumber(diffChange.modifiedStart + diffChange.modifiedLength - 1);
        const modifiedEndColumn = modifiedCharSequence.getEndColumn(diffChange.modifiedStart + diffChange.modifiedLength - 1);
        return new CharChange(originalStartLineNumber, originalStartColumn, originalEndLineNumber, originalEndColumn, modifiedStartLineNumber, modifiedStartColumn, modifiedEndLineNumber, modifiedEndColumn);
    }
}
function postProcessCharChanges(rawChanges) {
    if (rawChanges.length <= 1) {
        return rawChanges;
    }
    const result = [rawChanges[0]];
    let prevChange = result[0];
    for (let i = 1, len = rawChanges.length; i < len; i++) {
        const currChange = rawChanges[i];
        const originalMatchingLength = currChange.originalStart - (prevChange.originalStart + prevChange.originalLength);
        const modifiedMatchingLength = currChange.modifiedStart - (prevChange.modifiedStart + prevChange.modifiedLength);
        // Both of the above should be equal, but the continueProcessingPredicate may prevent this from being true
        const matchingLength = Math.min(originalMatchingLength, modifiedMatchingLength);
        if (matchingLength < MINIMUM_MATCHING_CHARACTER_LENGTH) {
            // Merge the current change into the previous one
            prevChange.originalLength =
                currChange.originalStart + currChange.originalLength - prevChange.originalStart;
            prevChange.modifiedLength =
                currChange.modifiedStart + currChange.modifiedLength - prevChange.modifiedStart;
        }
        else {
            // Add the current change
            result.push(currChange);
            prevChange = currChange;
        }
    }
    return result;
}
class LineChange {
    constructor(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges) {
        this.originalStartLineNumber = originalStartLineNumber;
        this.originalEndLineNumber = originalEndLineNumber;
        this.modifiedStartLineNumber = modifiedStartLineNumber;
        this.modifiedEndLineNumber = modifiedEndLineNumber;
        this.charChanges = charChanges;
    }
    static createFromDiffResult(shouldIgnoreTrimWhitespace, diffChange, originalLineSequence, modifiedLineSequence, continueCharDiff, shouldComputeCharChanges, shouldPostProcessCharChanges) {
        let originalStartLineNumber;
        let originalEndLineNumber;
        let modifiedStartLineNumber;
        let modifiedEndLineNumber;
        let charChanges = undefined;
        if (diffChange.originalLength === 0) {
            originalStartLineNumber =
                originalLineSequence.getStartLineNumber(diffChange.originalStart) - 1;
            originalEndLineNumber = 0;
        }
        else {
            originalStartLineNumber = originalLineSequence.getStartLineNumber(diffChange.originalStart);
            originalEndLineNumber = originalLineSequence.getEndLineNumber(diffChange.originalStart + diffChange.originalLength - 1);
        }
        if (diffChange.modifiedLength === 0) {
            modifiedStartLineNumber =
                modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart) - 1;
            modifiedEndLineNumber = 0;
        }
        else {
            modifiedStartLineNumber = modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart);
            modifiedEndLineNumber = modifiedLineSequence.getEndLineNumber(diffChange.modifiedStart + diffChange.modifiedLength - 1);
        }
        if (shouldComputeCharChanges &&
            diffChange.originalLength > 0 &&
            diffChange.originalLength < 20 &&
            diffChange.modifiedLength > 0 &&
            diffChange.modifiedLength < 20 &&
            continueCharDiff()) {
            // Compute character changes for diff chunks of at most 20 lines...
            const originalCharSequence = originalLineSequence.createCharSequence(shouldIgnoreTrimWhitespace, diffChange.originalStart, diffChange.originalStart + diffChange.originalLength - 1);
            const modifiedCharSequence = modifiedLineSequence.createCharSequence(shouldIgnoreTrimWhitespace, diffChange.modifiedStart, diffChange.modifiedStart + diffChange.modifiedLength - 1);
            if (originalCharSequence.getElements().length > 0 &&
                modifiedCharSequence.getElements().length > 0) {
                let rawChanges = computeDiff(originalCharSequence, modifiedCharSequence, continueCharDiff, true).changes;
                if (shouldPostProcessCharChanges) {
                    rawChanges = postProcessCharChanges(rawChanges);
                }
                charChanges = [];
                for (let i = 0, length = rawChanges.length; i < length; i++) {
                    charChanges.push(CharChange.createFromDiffChange(rawChanges[i], originalCharSequence, modifiedCharSequence));
                }
            }
        }
        return new LineChange(originalStartLineNumber, originalEndLineNumber, modifiedStartLineNumber, modifiedEndLineNumber, charChanges);
    }
}
export class DiffComputer {
    constructor(originalLines, modifiedLines, opts) {
        this.shouldComputeCharChanges = opts.shouldComputeCharChanges;
        this.shouldPostProcessCharChanges = opts.shouldPostProcessCharChanges;
        this.shouldIgnoreTrimWhitespace = opts.shouldIgnoreTrimWhitespace;
        this.shouldMakePrettyDiff = opts.shouldMakePrettyDiff;
        this.originalLines = originalLines;
        this.modifiedLines = modifiedLines;
        this.original = new LineSequence(originalLines);
        this.modified = new LineSequence(modifiedLines);
        this.continueLineDiff = createContinueProcessingPredicate(opts.maxComputationTime);
        this.continueCharDiff = createContinueProcessingPredicate(opts.maxComputationTime === 0 ? 0 : Math.min(opts.maxComputationTime, 5000)); // never run after 5s for character changes...
    }
    computeDiff() {
        if (this.original.lines.length === 1 && this.original.lines[0].length === 0) {
            // empty original => fast path
            if (this.modified.lines.length === 1 && this.modified.lines[0].length === 0) {
                return {
                    quitEarly: false,
                    changes: [],
                };
            }
            return {
                quitEarly: false,
                changes: [
                    {
                        originalStartLineNumber: 1,
                        originalEndLineNumber: 1,
                        modifiedStartLineNumber: 1,
                        modifiedEndLineNumber: this.modified.lines.length,
                        charChanges: undefined,
                    },
                ],
            };
        }
        if (this.modified.lines.length === 1 && this.modified.lines[0].length === 0) {
            // empty modified => fast path
            return {
                quitEarly: false,
                changes: [
                    {
                        originalStartLineNumber: 1,
                        originalEndLineNumber: this.original.lines.length,
                        modifiedStartLineNumber: 1,
                        modifiedEndLineNumber: 1,
                        charChanges: undefined,
                    },
                ],
            };
        }
        const diffResult = computeDiff(this.original, this.modified, this.continueLineDiff, this.shouldMakePrettyDiff);
        const rawChanges = diffResult.changes;
        const quitEarly = diffResult.quitEarly;
        // The diff is always computed with ignoring trim whitespace
        // This ensures we get the prettiest diff
        if (this.shouldIgnoreTrimWhitespace) {
            const lineChanges = [];
            for (let i = 0, length = rawChanges.length; i < length; i++) {
                lineChanges.push(LineChange.createFromDiffResult(this.shouldIgnoreTrimWhitespace, rawChanges[i], this.original, this.modified, this.continueCharDiff, this.shouldComputeCharChanges, this.shouldPostProcessCharChanges));
            }
            return {
                quitEarly: quitEarly,
                changes: lineChanges,
            };
        }
        // Need to post-process and introduce changes where the trim whitespace is different
        // Note that we are looping starting at -1 to also cover the lines before the first change
        const result = [];
        let originalLineIndex = 0;
        let modifiedLineIndex = 0;
        for (let i = -1 /* !!!! */, len = rawChanges.length; i < len; i++) {
            const nextChange = i + 1 < len ? rawChanges[i + 1] : null;
            const originalStop = nextChange ? nextChange.originalStart : this.originalLines.length;
            const modifiedStop = nextChange ? nextChange.modifiedStart : this.modifiedLines.length;
            while (originalLineIndex < originalStop && modifiedLineIndex < modifiedStop) {
                const originalLine = this.originalLines[originalLineIndex];
                const modifiedLine = this.modifiedLines[modifiedLineIndex];
                if (originalLine !== modifiedLine) {
                    // These lines differ only in trim whitespace
                    // Check the leading whitespace
                    {
                        let originalStartColumn = getFirstNonBlankColumn(originalLine, 1);
                        let modifiedStartColumn = getFirstNonBlankColumn(modifiedLine, 1);
                        while (originalStartColumn > 1 && modifiedStartColumn > 1) {
                            const originalChar = originalLine.charCodeAt(originalStartColumn - 2);
                            const modifiedChar = modifiedLine.charCodeAt(modifiedStartColumn - 2);
                            if (originalChar !== modifiedChar) {
                                break;
                            }
                            originalStartColumn--;
                            modifiedStartColumn--;
                        }
                        if (originalStartColumn > 1 || modifiedStartColumn > 1) {
                            this._pushTrimWhitespaceCharChange(result, originalLineIndex + 1, 1, originalStartColumn, modifiedLineIndex + 1, 1, modifiedStartColumn);
                        }
                    }
                    // Check the trailing whitespace
                    {
                        let originalEndColumn = getLastNonBlankColumn(originalLine, 1);
                        let modifiedEndColumn = getLastNonBlankColumn(modifiedLine, 1);
                        const originalMaxColumn = originalLine.length + 1;
                        const modifiedMaxColumn = modifiedLine.length + 1;
                        while (originalEndColumn < originalMaxColumn && modifiedEndColumn < modifiedMaxColumn) {
                            const originalChar = originalLine.charCodeAt(originalEndColumn - 1);
                            const modifiedChar = originalLine.charCodeAt(modifiedEndColumn - 1);
                            if (originalChar !== modifiedChar) {
                                break;
                            }
                            originalEndColumn++;
                            modifiedEndColumn++;
                        }
                        if (originalEndColumn < originalMaxColumn || modifiedEndColumn < modifiedMaxColumn) {
                            this._pushTrimWhitespaceCharChange(result, originalLineIndex + 1, originalEndColumn, originalMaxColumn, modifiedLineIndex + 1, modifiedEndColumn, modifiedMaxColumn);
                        }
                    }
                }
                originalLineIndex++;
                modifiedLineIndex++;
            }
            if (nextChange) {
                // Emit the actual change
                result.push(LineChange.createFromDiffResult(this.shouldIgnoreTrimWhitespace, nextChange, this.original, this.modified, this.continueCharDiff, this.shouldComputeCharChanges, this.shouldPostProcessCharChanges));
                originalLineIndex += nextChange.originalLength;
                modifiedLineIndex += nextChange.modifiedLength;
            }
        }
        return {
            quitEarly: quitEarly,
            changes: result,
        };
    }
    _pushTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn) {
        if (this._mergeTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn)) {
            // Merged into previous
            return;
        }
        let charChanges = undefined;
        if (this.shouldComputeCharChanges) {
            charChanges = [
                new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn),
            ];
        }
        result.push(new LineChange(originalLineNumber, originalLineNumber, modifiedLineNumber, modifiedLineNumber, charChanges));
    }
    _mergeTrimWhitespaceCharChange(result, originalLineNumber, originalStartColumn, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedEndColumn) {
        const len = result.length;
        if (len === 0) {
            return false;
        }
        const prevChange = result[len - 1];
        if (prevChange.originalEndLineNumber === 0 || prevChange.modifiedEndLineNumber === 0) {
            // Don't merge with inserts/deletes
            return false;
        }
        if (prevChange.originalEndLineNumber === originalLineNumber &&
            prevChange.modifiedEndLineNumber === modifiedLineNumber) {
            if (this.shouldComputeCharChanges && prevChange.charChanges) {
                prevChange.charChanges.push(new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn));
            }
            return true;
        }
        if (prevChange.originalEndLineNumber + 1 === originalLineNumber &&
            prevChange.modifiedEndLineNumber + 1 === modifiedLineNumber) {
            prevChange.originalEndLineNumber = originalLineNumber;
            prevChange.modifiedEndLineNumber = modifiedLineNumber;
            if (this.shouldComputeCharChanges && prevChange.charChanges) {
                prevChange.charChanges.push(new CharChange(originalLineNumber, originalStartColumn, originalLineNumber, originalEndColumn, modifiedLineNumber, modifiedStartColumn, modifiedLineNumber, modifiedEndColumn));
            }
            return true;
        }
        return false;
    }
}
function getFirstNonBlankColumn(txt, defaultValue) {
    const r = strings.firstNonWhitespaceIndex(txt);
    if (r === -1) {
        return defaultValue;
    }
    return r + 1;
}
function getLastNonBlankColumn(txt, defaultValue) {
    const r = strings.lastNonWhitespaceIndex(txt);
    if (r === -1) {
        return defaultValue;
    }
    return r + 2;
}
function createContinueProcessingPredicate(maximumRuntime) {
    if (maximumRuntime === 0) {
        return () => true;
    }
    const startTime = Date.now();
    return () => {
        return Date.now() - startTime < maximumRuntime;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVnYWN5TGluZXNEaWZmQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2RpZmYvbGVnYWN5TGluZXNEaWZmQ29tcHV0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUEwQixPQUFPLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRyxPQUFPLEVBQWlELFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUMxRSxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRWhELE1BQU0saUNBQWlDLEdBQUcsQ0FBQyxDQUFBO0FBRTNDLE1BQU0sT0FBTyx1QkFBdUI7SUFDbkMsV0FBVyxDQUNWLGFBQXVCLEVBQ3ZCLGFBQXVCLEVBQ3ZCLE9BQWtDO1FBRWxDLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUU7WUFDbkUsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLG9CQUFvQjtZQUNoRCwwQkFBMEIsRUFBRSxPQUFPLENBQUMsb0JBQW9CO1lBQ3hELHdCQUF3QixFQUFFLElBQUk7WUFDOUIsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQiw0QkFBNEIsRUFBRSxJQUFJO1NBQ2xDLENBQUMsQ0FBQTtRQUNGLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN6QyxNQUFN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