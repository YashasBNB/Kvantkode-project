/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { splitLines } from '../../../../../base/common/strings.js';
import { Position } from '../../../core/position.js';
import { Range } from '../../../core/range.js';
import { TextLength } from '../../../core/textLength.js';
/**
 * The end must be greater than or equal to the start.
 */
export function lengthDiff(startLineCount, startColumnCount, endLineCount, endColumnCount) {
    return startLineCount !== endLineCount
        ? toLength(endLineCount - startLineCount, endColumnCount)
        : toLength(0, endColumnCount - startColumnCount);
}
export const lengthZero = 0;
export function lengthIsZero(length) {
    return length === 0;
}
/*
 * We have 52 bits available in a JS number.
 * We use the upper 26 bits to store the line and the lower 26 bits to store the column.
 */
///*
const factor = 2 ** 26;
/*/
const factor = 1000000;
// */
export function toLength(lineCount, columnCount) {
    // llllllllllllllllllllllllllcccccccccccccccccccccccccc (52 bits)
    //       line count (26 bits)    column count (26 bits)
    // If there is no overflow (all values/sums below 2^26 = 67108864),
    // we have `toLength(lns1, cols1) + toLength(lns2, cols2) = toLength(lns1 + lns2, cols1 + cols2)`.
    return (lineCount * factor + columnCount);
}
export function lengthToObj(length) {
    const l = length;
    const lineCount = Math.floor(l / factor);
    const columnCount = l - lineCount * factor;
    return new TextLength(lineCount, columnCount);
}
export function lengthGetLineCount(length) {
    return Math.floor(length / factor);
}
/**
 * Returns the amount of columns of the given length, assuming that it does not span any line.
 */
export function lengthGetColumnCountIfZeroLineCount(length) {
    return length;
}
export function lengthAdd(l1, l2) {
    let r = l1 + l2;
    if (l2 >= factor) {
        r = r - (l1 % factor);
    }
    return r;
}
export function sumLengths(items, lengthFn) {
    return items.reduce((a, b) => lengthAdd(a, lengthFn(b)), lengthZero);
}
export function lengthEquals(length1, length2) {
    return length1 === length2;
}
/**
 * Returns a non negative length `result` such that `lengthAdd(length1, result) = length2`, or zero if such length does not exist.
 */
export function lengthDiffNonNegative(length1, length2) {
    const l1 = length1;
    const l2 = length2;
    const diff = l2 - l1;
    if (diff <= 0) {
        // line-count of length1 is higher than line-count of length2
        // or they are equal and column-count of length1 is higher than column-count of length2
        return lengthZero;
    }
    const lineCount1 = Math.floor(l1 / factor);
    const lineCount2 = Math.floor(l2 / factor);
    const colCount2 = l2 - lineCount2 * factor;
    if (lineCount1 === lineCount2) {
        const colCount1 = l1 - lineCount1 * factor;
        return toLength(0, colCount2 - colCount1);
    }
    else {
        return toLength(lineCount2 - lineCount1, colCount2);
    }
}
export function lengthLessThan(length1, length2) {
    // First, compare line counts, then column counts.
    return length1 < length2;
}
export function lengthLessThanEqual(length1, length2) {
    return length1 <= length2;
}
export function lengthGreaterThanEqual(length1, length2) {
    return length1 >= length2;
}
export function lengthToPosition(length) {
    const l = length;
    const lineCount = Math.floor(l / factor);
    const colCount = l - lineCount * factor;
    return new Position(lineCount + 1, colCount + 1);
}
export function positionToLength(position) {
    return toLength(position.lineNumber - 1, position.column - 1);
}
export function lengthsToRange(lengthStart, lengthEnd) {
    const l = lengthStart;
    const lineCount = Math.floor(l / factor);
    const colCount = l - lineCount * factor;
    const l2 = lengthEnd;
    const lineCount2 = Math.floor(l2 / factor);
    const colCount2 = l2 - lineCount2 * factor;
    return new Range(lineCount + 1, colCount + 1, lineCount2 + 1, colCount2 + 1);
}
export function lengthOfRange(range) {
    if (range.startLineNumber === range.endLineNumber) {
        return new TextLength(0, range.endColumn - range.startColumn);
    }
    else {
        return new TextLength(range.endLineNumber - range.startLineNumber, range.endColumn - 1);
    }
}
export function lengthCompare(length1, length2) {
    const l1 = length1;
    const l2 = length2;
    return l1 - l2;
}
export function lengthOfString(str) {
    const lines = splitLines(str);
    return toLength(lines.length - 1, lines[lines.length - 1].length);
}
export function lengthOfStringObj(str) {
    const lines = splitLines(str);
    return new TextLength(lines.length - 1, lines[lines.length - 1].length);
}
/**
 * Computes a numeric hash of the given length.
 */
export function lengthHash(length) {
    return length;
}
export function lengthMax(length1, length2) {
    return length1 > length2 ? length1 : length2;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVuZ3RoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9sZW5ndGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXhEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FDekIsY0FBc0IsRUFDdEIsZ0JBQXdCLEVBQ3hCLFlBQW9CLEVBQ3BCLGNBQXNCO0lBRXRCLE9BQU8sY0FBYyxLQUFLLFlBQVk7UUFDckMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEdBQUcsY0FBYyxFQUFFLGNBQWMsQ0FBQztRQUN6RCxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQTtBQUNsRCxDQUFDO0FBUUQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLENBQWtCLENBQUE7QUFFNUMsTUFBTSxVQUFVLFlBQVksQ0FBQyxNQUFjO0lBQzFDLE9BQVEsTUFBd0IsS0FBSyxDQUFDLENBQUE7QUFDdkMsQ0FBQztBQUVEOzs7R0FHRztBQUNILElBQUk7QUFDSixNQUFNLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFBO0FBQ3RCOztLQUVLO0FBRUwsTUFBTSxVQUFVLFFBQVEsQ0FBQyxTQUFpQixFQUFFLFdBQW1CO0lBQzlELGlFQUFpRTtJQUNq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