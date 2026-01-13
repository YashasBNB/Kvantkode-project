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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVnYWN5TGluZXNEaWZmQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9sZWdhY3lMaW5lc0RpZmZDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQTBCLE9BQU8sRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hHLE9BQU8sRUFBaUQsU0FBUyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakcsT0FBTyxFQUFFLFlBQVksRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzFFLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFaEQsTUFBTSxpQ0FBaUMsR0FBRyxDQUFDLENBQUE7QUFFM0MsTUFBTSxPQUFPLHVCQUF1QjtJQUNuQyxXQUFXLENBQ1YsYUFBdUIsRUFDdkIsYUFBdUIsRUFDdkIsT0FBa0M7UUFFbEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsYUFBYSxFQUFFLGFBQWEsRUFBRTtZQUNuRSxrQkFBa0IsRUFBRSxPQUFPLENBQUMsb0JBQW9CO1lBQ2hELDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0I7WUFDeEQsd0JBQXdCLEVBQUUsSUFBSTtZQUM5QixvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLDRCQUE0QixFQUFFLElBQUk7U0FDbEMsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLFdB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