/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DiffChange } from './diffChange.js';
import { stringHash } from '../hash.js';
export class StringDiffSequence {
    constructor(source) {
        this.source = source;
    }
    getElements() {
        const source = this.source;
        const characters = new Int32Array(source.length);
        for (let i = 0, len = source.length; i < len; i++) {
            characters[i] = source.charCodeAt(i);
        }
        return characters;
    }
}
export function stringDiff(original, modified, pretty) {
    return new LcsDiff(new StringDiffSequence(original), new StringDiffSequence(modified)).ComputeDiff(pretty).changes;
}
//
// The code below has been ported from a C# implementation in VS
//
class Debug {
    static Assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
}
class MyArray {
    /**
     * Copies a range of elements from an Array starting at the specified source index and pastes
     * them to another Array starting at the specified destination index. The length and the indexes
     * are specified as 64-bit integers.
     * sourceArray:
     *		The Array that contains the data to copy.
     * sourceIndex:
     *		A 64-bit integer that represents the index in the sourceArray at which copying begins.
     * destinationArray:
     *		The Array that receives the data.
     * destinationIndex:
     *		A 64-bit integer that represents the index in the destinationArray at which storing begins.
     * length:
     *		A 64-bit integer that represents the number of elements to copy.
     */
    static Copy(sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
        for (let i = 0; i < length; i++) {
            destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
        }
    }
    static Copy2(sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
        for (let i = 0; i < length; i++) {
            destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
        }
    }
}
//*****************************************************************************
// LcsDiff.cs
//
// An implementation of the difference algorithm described in
// "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
//
// Copyright (C) 2008 Microsoft Corporation @minifier_do_not_preserve
//*****************************************************************************
// Our total memory usage for storing history is (worst-case):
// 2 * [(MaxDifferencesHistory + 1) * (MaxDifferencesHistory + 1) - 1] * sizeof(int)
// 2 * [1448*1448 - 1] * 4 = 16773624 = 16MB
var LocalConstants;
(function (LocalConstants) {
    LocalConstants[LocalConstants["MaxDifferencesHistory"] = 1447] = "MaxDifferencesHistory";
})(LocalConstants || (LocalConstants = {}));
/**
 * A utility class which helps to create the set of DiffChanges from
 * a difference operation. This class accepts original DiffElements and
 * modified DiffElements that are involved in a particular change. The
 * MarkNextChange() method can be called to mark the separation between
 * distinct changes. At the end, the Changes property can be called to retrieve
 * the constructed changes.
 */
class DiffChangeHelper {
    /**
     * Constructs a new DiffChangeHelper for the given DiffSequences.
     */
    constructor() {
        this.m_changes = [];
        this.m_originalStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.m_modifiedStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.m_originalCount = 0;
        this.m_modifiedCount = 0;
    }
    /**
     * Marks the beginning of the next change in the set of differences.
     */
    MarkNextChange() {
        // Only add to the list if there is something to add
        if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
            // Add the new change to our list
            this.m_changes.push(new DiffChange(this.m_originalStart, this.m_originalCount, this.m_modifiedStart, this.m_modifiedCount));
        }
        // Reset for the next change
        this.m_originalCount = 0;
        this.m_modifiedCount = 0;
        this.m_originalStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
        this.m_modifiedStart = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
    }
    /**
     * Adds the original element at the given position to the elements
     * affected by the current change. The modified index gives context
     * to the change position with respect to the original sequence.
     * @param originalIndex The index of the original element to add.
     * @param modifiedIndex The index of the modified element that provides corresponding position in the modified sequence.
     */
    AddOriginalElement(originalIndex, modifiedIndex) {
        // The 'true' start index is the smallest of the ones we've seen
        this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
        this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
        this.m_originalCount++;
    }
    /**
     * Adds the modified element at the given position to the elements
     * affected by the current change. The original index gives context
     * to the change position with respect to the modified sequence.
     * @param originalIndex The index of the original element that provides corresponding position in the original sequence.
     * @param modifiedIndex The index of the modified element to add.
     */
    AddModifiedElement(originalIndex, modifiedIndex) {
        // The 'true' start index is the smallest of the ones we've seen
        this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
        this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
        this.m_modifiedCount++;
    }
    /**
     * Retrieves all of the changes marked by the class.
     */
    getChanges() {
        if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
            // Finish up on whatever is left
            this.MarkNextChange();
        }
        return this.m_changes;
    }
    /**
     * Retrieves all of the changes marked by the class in the reverse order
     */
    getReverseChanges() {
        if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
            // Finish up on whatever is left
            this.MarkNextChange();
        }
        this.m_changes.reverse();
        return this.m_changes;
    }
}
/**
 * An implementation of the difference algorithm described in
 * "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
 */
export class LcsDiff {
    /**
     * Constructs the DiffFinder
     */
    constructor(originalSequence, modifiedSequence, continueProcessingPredicate = null) {
        this.ContinueProcessingPredicate = continueProcessingPredicate;
        this._originalSequence = originalSequence;
        this._modifiedSequence = modifiedSequence;
        const [originalStringElements, originalElementsOrHash, originalHasStrings] = LcsDiff._getElements(originalSequence);
        const [modifiedStringElements, modifiedElementsOrHash, modifiedHasStrings] = LcsDiff._getElements(modifiedSequence);
        this._hasStrings = originalHasStrings && modifiedHasStrings;
        this._originalStringElements = originalStringElements;
        this._originalElementsOrHash = originalElementsOrHash;
        this._modifiedStringElements = modifiedStringElements;
        this._modifiedElementsOrHash = modifiedElementsOrHash;
        this.m_forwardHistory = [];
        this.m_reverseHistory = [];
    }
    static _isStringArray(arr) {
        return arr.length > 0 && typeof arr[0] === 'string';
    }
    static _getElements(sequence) {
        const elements = sequence.getElements();
        if (LcsDiff._isStringArray(elements)) {
            const hashes = new Int32Array(elements.length);
            for (let i = 0, len = elements.length; i < len; i++) {
                hashes[i] = stringHash(elements[i], 0);
            }
            return [elements, hashes, true];
        }
        if (elements instanceof Int32Array) {
            return [[], elements, false];
        }
        return [[], new Int32Array(elements), false];
    }
    ElementsAreEqual(originalIndex, newIndex) {
        if (this._originalElementsOrHash[originalIndex] !== this._modifiedElementsOrHash[newIndex]) {
            return false;
        }
        return this._hasStrings
            ? this._originalStringElements[originalIndex] === this._modifiedStringElements[newIndex]
            : true;
    }
    ElementsAreStrictEqual(originalIndex, newIndex) {
        if (!this.ElementsAreEqual(originalIndex, newIndex)) {
            return false;
        }
        const originalElement = LcsDiff._getStrictElement(this._originalSequence, originalIndex);
        const modifiedElement = LcsDiff._getStrictElement(this._modifiedSequence, newIndex);
        return originalElement === modifiedElement;
    }
    static _getStrictElement(sequence, index) {
        if (typeof sequence.getStrictElement === 'function') {
            return sequence.getStrictElement(index);
        }
        return null;
    }
    OriginalElementsAreEqual(index1, index2) {
        if (this._originalElementsOrHash[index1] !== this._originalElementsOrHash[index2]) {
            return false;
        }
        return this._hasStrings
            ? this._originalStringElements[index1] === this._originalStringElements[index2]
            : true;
    }
    ModifiedElementsAreEqual(index1, index2) {
        if (this._modifiedElementsOrHash[index1] !== this._modifiedElementsOrHash[index2]) {
            return false;
        }
        return this._hasStrings
            ? this._modifiedStringElements[index1] === this._modifiedStringElements[index2]
            : true;
    }
    ComputeDiff(pretty) {
        return this._ComputeDiff(0, this._originalElementsOrHash.length - 1, 0, this._modifiedElementsOrHash.length - 1, pretty);
    }
    /**
     * Computes the differences between the original and modified input
     * sequences on the bounded range.
     * @returns An array of the differences between the two input sequences.
     */
    _ComputeDiff(originalStart, originalEnd, modifiedStart, modifiedEnd, pretty) {
        const quitEarlyArr = [false];
        let changes = this.ComputeDiffRecursive(originalStart, originalEnd, modifiedStart, modifiedEnd, quitEarlyArr);
        if (pretty) {
            // We have to clean up the computed diff to be more intuitive
            // but it turns out this cannot be done correctly until the entire set
            // of diffs have been computed
            changes = this.PrettifyChanges(changes);
        }
        return {
            quitEarly: quitEarlyArr[0],
            changes: changes,
        };
    }
    /**
     * Private helper method which computes the differences on the bounded range
     * recursively.
     * @returns An array of the differences between the two input sequences.
     */
    ComputeDiffRecursive(originalStart, originalEnd, modifiedStart, modifiedEnd, quitEarlyArr) {
        quitEarlyArr[0] = false;
        // Find the start of the differences
        while (originalStart <= originalEnd &&
            modifiedStart <= modifiedEnd &&
            this.ElementsAreEqual(originalStart, modifiedStart)) {
            originalStart++;
            modifiedStart++;
        }
        // Find the end of the differences
        while (originalEnd >= originalStart &&
            modifiedEnd >= modifiedStart &&
            this.ElementsAreEqual(originalEnd, modifiedEnd)) {
            originalEnd--;
            modifiedEnd--;
        }
        // In the special case where we either have all insertions or all deletions or the sequences are identical
        if (originalStart > originalEnd || modifiedStart > modifiedEnd) {
            let changes;
            if (modifiedStart <= modifiedEnd) {
                Debug.Assert(originalStart === originalEnd + 1, 'originalStart should only be one more than originalEnd');
                // All insertions
                changes = [new DiffChange(originalStart, 0, modifiedStart, modifiedEnd - modifiedStart + 1)];
            }
            else if (originalStart <= originalEnd) {
                Debug.Assert(modifiedStart === modifiedEnd + 1, 'modifiedStart should only be one more than modifiedEnd');
                // All deletions
                changes = [new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, 0)];
            }
            else {
                Debug.Assert(originalStart === originalEnd + 1, 'originalStart should only be one more than originalEnd');
                Debug.Assert(modifiedStart === modifiedEnd + 1, 'modifiedStart should only be one more than modifiedEnd');
                // Identical sequences - No differences
                changes = [];
            }
            return changes;
        }
        // This problem can be solved using the Divide-And-Conquer technique.
        const midOriginalArr = [0];
        const midModifiedArr = [0];
        const result = this.ComputeRecursionPoint(originalStart, originalEnd, modifiedStart, modifiedEnd, midOriginalArr, midModifiedArr, quitEarlyArr);
        const midOriginal = midOriginalArr[0];
        const midModified = midModifiedArr[0];
        if (result !== null) {
            // Result is not-null when there was enough memory to compute the changes while
            // searching for the recursion point
            return result;
        }
        else if (!quitEarlyArr[0]) {
            // We can break the problem down recursively by finding the changes in the
            // First Half:   (originalStart, modifiedStart) to (midOriginal, midModified)
            // Second Half:  (midOriginal + 1, minModified + 1) to (originalEnd, modifiedEnd)
            // NOTE: ComputeDiff() is inclusive, therefore the second range starts on the next point
            const leftChanges = this.ComputeDiffRecursive(originalStart, midOriginal, modifiedStart, midModified, quitEarlyArr);
            let rightChanges = [];
            if (!quitEarlyArr[0]) {
                rightChanges = this.ComputeDiffRecursive(midOriginal + 1, originalEnd, midModified + 1, modifiedEnd, quitEarlyArr);
            }
            else {
                // We didn't have time to finish the first half, so we don't have time to compute this half.
                // Consider the entire rest of the sequence different.
                rightChanges = [
                    new DiffChange(midOriginal + 1, originalEnd - (midOriginal + 1) + 1, midModified + 1, modifiedEnd - (midModified + 1) + 1),
                ];
            }
            return this.ConcatenateChanges(leftChanges, rightChanges);
        }
        // If we hit here, we quit early, and so can't return anything meaningful
        return [
            new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, modifiedEnd - modifiedStart + 1),
        ];
    }
    WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr) {
        let forwardChanges = null;
        let reverseChanges = null;
        // First, walk backward through the forward diagonals history
        let changeHelper = new DiffChangeHelper();
        let diagonalMin = diagonalForwardStart;
        let diagonalMax = diagonalForwardEnd;
        let diagonalRelative = midOriginalArr[0] - midModifiedArr[0] - diagonalForwardOffset;
        let lastOriginalIndex = -1073741824 /* Constants.MIN_SAFE_SMALL_INTEGER */;
        let historyIndex = this.m_forwardHistory.length - 1;
        do {
            // Get the diagonal index from the relative diagonal number
            const diagonal = diagonalRelative + diagonalForwardBase;
            // Figure out where we came from
            if (diagonal === diagonalMin ||
                (diagonal < diagonalMax && forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])) {
                // Vertical line (the element is an insert)
                originalIndex = forwardPoints[diagonal + 1];
                modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
                if (originalIndex < lastOriginalIndex) {
                    changeHelper.MarkNextChange();
                }
                lastOriginalIndex = originalIndex;
                changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex);
                diagonalRelative = diagonal + 1 - diagonalForwardBase; //Setup for the next iteration
            }
            else {
                // Horizontal line (the element is a deletion)
                originalIndex = forwardPoints[diagonal - 1] + 1;
                modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
                if (originalIndex < lastOriginalIndex) {
                    changeHelper.MarkNextChange();
                }
                lastOriginalIndex = originalIndex - 1;
                changeHelper.AddOriginalElement(originalIndex, modifiedIndex + 1);
                diagonalRelative = diagonal - 1 - diagonalForwardBase; //Setup for the next iteration
            }
            if (historyIndex >= 0) {
                forwardPoints = this.m_forwardHistory[historyIndex];
                diagonalForwardBase = forwardPoints[0]; //We stored this in the first spot
                diagonalMin = 1;
                diagonalMax = forwardPoints.length - 1;
            }
        } while (--historyIndex >= -1);
        // Ironically, we get the forward changes as the reverse of the
        // order we added them since we technically added them backwards
        forwardChanges = changeHelper.getReverseChanges();
        if (quitEarlyArr[0]) {
            // TODO: Calculate a partial from the reverse diagonals.
            //       For now, just assume everything after the midOriginal/midModified point is a diff
            let originalStartPoint = midOriginalArr[0] + 1;
            let modifiedStartPoint = midModifiedArr[0] + 1;
            if (forwardChanges !== null && forwardChanges.length > 0) {
                const lastForwardChange = forwardChanges[forwardChanges.length - 1];
                originalStartPoint = Math.max(originalStartPoint, lastForwardChange.getOriginalEnd());
                modifiedStartPoint = Math.max(modifiedStartPoint, lastForwardChange.getModifiedEnd());
            }
            reverseChanges = [
                new DiffChange(originalStartPoint, originalEnd - originalStartPoint + 1, modifiedStartPoint, modifiedEnd - modifiedStartPoint + 1),
            ];
        }
        else {
            // Now walk backward through the reverse diagonals history
            changeHelper = new DiffChangeHelper();
            diagonalMin = diagonalReverseStart;
            diagonalMax = diagonalReverseEnd;
            diagonalRelative = midOriginalArr[0] - midModifiedArr[0] - diagonalReverseOffset;
            lastOriginalIndex = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            historyIndex = deltaIsEven
                ? this.m_reverseHistory.length - 1
                : this.m_reverseHistory.length - 2;
            do {
                // Get the diagonal index from the relative diagonal number
                const diagonal = diagonalRelative + diagonalReverseBase;
                // Figure out where we came from
                if (diagonal === diagonalMin ||
                    (diagonal < diagonalMax && reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])) {
                    // Horizontal line (the element is a deletion))
                    originalIndex = reversePoints[diagonal + 1] - 1;
                    modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
                    if (originalIndex > lastOriginalIndex) {
                        changeHelper.MarkNextChange();
                    }
                    lastOriginalIndex = originalIndex + 1;
                    changeHelper.AddOriginalElement(originalIndex + 1, modifiedIndex + 1);
                    diagonalRelative = diagonal + 1 - diagonalReverseBase; //Setup for the next iteration
                }
                else {
                    // Vertical line (the element is an insertion)
                    originalIndex = reversePoints[diagonal - 1];
                    modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
                    if (originalIndex > lastOriginalIndex) {
                        changeHelper.MarkNextChange();
                    }
                    lastOriginalIndex = originalIndex;
                    changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex + 1);
                    diagonalRelative = diagonal - 1 - diagonalReverseBase; //Setup for the next iteration
                }
                if (historyIndex >= 0) {
                    reversePoints = this.m_reverseHistory[historyIndex];
                    diagonalReverseBase = reversePoints[0]; //We stored this in the first spot
                    diagonalMin = 1;
                    diagonalMax = reversePoints.length - 1;
                }
            } while (--historyIndex >= -1);
            // There are cases where the reverse history will find diffs that
            // are correct, but not intuitive, so we need shift them.
            reverseChanges = changeHelper.getChanges();
        }
        return this.ConcatenateChanges(forwardChanges, reverseChanges);
    }
    /**
     * Given the range to compute the diff on, this method finds the point:
     * (midOriginal, midModified)
     * that exists in the middle of the LCS of the two sequences and
     * is the point at which the LCS problem may be broken down recursively.
     * This method will try to keep the LCS trace in memory. If the LCS recursion
     * point is calculated and the full trace is available in memory, then this method
     * will return the change list.
     * @param originalStart The start bound of the original sequence range
     * @param originalEnd The end bound of the original sequence range
     * @param modifiedStart The start bound of the modified sequence range
     * @param modifiedEnd The end bound of the modified sequence range
     * @param midOriginal The middle point of the original sequence range
     * @param midModified The middle point of the modified sequence range
     * @returns The diff changes, if available, otherwise null
     */
    ComputeRecursionPoint(originalStart, originalEnd, modifiedStart, modifiedEnd, midOriginalArr, midModifiedArr, quitEarlyArr) {
        let originalIndex = 0, modifiedIndex = 0;
        let diagonalForwardStart = 0, diagonalForwardEnd = 0;
        let diagonalReverseStart = 0, diagonalReverseEnd = 0;
        // To traverse the edit graph and produce the proper LCS, our actual
        // start position is just outside the given boundary
        originalStart--;
        modifiedStart--;
        // We set these up to make the compiler happy, but they will
        // be replaced before we return with the actual recursion point
        midOriginalArr[0] = 0;
        midModifiedArr[0] = 0;
        // Clear out the history
        this.m_forwardHistory = [];
        this.m_reverseHistory = [];
        // Each cell in the two arrays corresponds to a diagonal in the edit graph.
        // The integer value in the cell represents the originalIndex of the furthest
        // reaching point found so far that ends in that diagonal.
        // The modifiedIndex can be computed mathematically from the originalIndex and the diagonal number.
        const maxDifferences = originalEnd - originalStart + (modifiedEnd - modifiedStart);
        const numDiagonals = maxDifferences + 1;
        const forwardPoints = new Int32Array(numDiagonals);
        const reversePoints = new Int32Array(numDiagonals);
        // diagonalForwardBase: Index into forwardPoints of the diagonal which passes through (originalStart, modifiedStart)
        // diagonalReverseBase: Index into reversePoints of the diagonal which passes through (originalEnd, modifiedEnd)
        const diagonalForwardBase = modifiedEnd - modifiedStart;
        const diagonalReverseBase = originalEnd - originalStart;
        // diagonalForwardOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
        //    diagonal number (relative to diagonalForwardBase)
        // diagonalReverseOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
        //    diagonal number (relative to diagonalReverseBase)
        const diagonalForwardOffset = originalStart - modifiedStart;
        const diagonalReverseOffset = originalEnd - modifiedEnd;
        // delta: The difference between the end diagonal and the start diagonal. This is used to relate diagonal numbers
        //   relative to the start diagonal with diagonal numbers relative to the end diagonal.
        // The Even/Oddn-ness of this delta is important for determining when we should check for overlap
        const delta = diagonalReverseBase - diagonalForwardBase;
        const deltaIsEven = delta % 2 === 0;
        // Here we set up the start and end points as the furthest points found so far
        // in both the forward and reverse directions, respectively
        forwardPoints[diagonalForwardBase] = originalStart;
        reversePoints[diagonalReverseBase] = originalEnd;
        // Remember if we quit early, and thus need to do a best-effort result instead of a real result.
        quitEarlyArr[0] = false;
        // A couple of points:
        // --With this method, we iterate on the number of differences between the two sequences.
        //   The more differences there actually are, the longer this will take.
        // --Also, as the number of differences increases, we have to search on diagonals further
        //   away from the reference diagonal (which is diagonalForwardBase for forward, diagonalReverseBase for reverse).
        // --We extend on even diagonals (relative to the reference diagonal) only when numDifferences
        //   is even and odd diagonals only when numDifferences is odd.
        for (let numDifferences = 1; numDifferences <= maxDifferences / 2 + 1; numDifferences++) {
            let furthestOriginalIndex = 0;
            let furthestModifiedIndex = 0;
            // Run the algorithm in the forward direction
            diagonalForwardStart = this.ClipDiagonalBound(diagonalForwardBase - numDifferences, numDifferences, diagonalForwardBase, numDiagonals);
            diagonalForwardEnd = this.ClipDiagonalBound(diagonalForwardBase + numDifferences, numDifferences, diagonalForwardBase, numDiagonals);
            for (let diagonal = diagonalForwardStart; diagonal <= diagonalForwardEnd; diagonal += 2) {
                // STEP 1: We extend the furthest reaching point in the present diagonal
                // by looking at the diagonals above and below and picking the one whose point
                // is further away from the start point (originalStart, modifiedStart)
                if (diagonal === diagonalForwardStart ||
                    (diagonal < diagonalForwardEnd &&
                        forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])) {
                    originalIndex = forwardPoints[diagonal + 1];
                }
                else {
                    originalIndex = forwardPoints[diagonal - 1] + 1;
                }
                modifiedIndex = originalIndex - (diagonal - diagonalForwardBase) - diagonalForwardOffset;
                // Save the current originalIndex so we can test for false overlap in step 3
                const tempOriginalIndex = originalIndex;
                // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
                // so long as the elements are equal.
                while (originalIndex < originalEnd &&
                    modifiedIndex < modifiedEnd &&
                    this.ElementsAreEqual(originalIndex + 1, modifiedIndex + 1)) {
                    originalIndex++;
                    modifiedIndex++;
                }
                forwardPoints[diagonal] = originalIndex;
                if (originalIndex + modifiedIndex > furthestOriginalIndex + furthestModifiedIndex) {
                    furthestOriginalIndex = originalIndex;
                    furthestModifiedIndex = modifiedIndex;
                }
                // STEP 3: If delta is odd (overlap first happens on forward when delta is odd)
                // and diagonal is in the range of reverse diagonals computed for numDifferences-1
                // (the previous iteration; we haven't computed reverse diagonals for numDifferences yet)
                // then check for overlap.
                if (!deltaIsEven && Math.abs(diagonal - diagonalReverseBase) <= numDifferences - 1) {
                    if (originalIndex >= reversePoints[diagonal]) {
                        midOriginalArr[0] = originalIndex;
                        midModifiedArr[0] = modifiedIndex;
                        if (tempOriginalIndex <= reversePoints[diagonal] &&
                            1447 /* LocalConstants.MaxDifferencesHistory */ > 0 &&
                            numDifferences <= 1447 /* LocalConstants.MaxDifferencesHistory */ + 1) {
                            // BINGO! We overlapped, and we have the full trace in memory!
                            return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                        }
                        else {
                            // Either false overlap, or we didn't have enough memory for the full trace
                            // Just return the recursion point
                            return null;
                        }
                    }
                }
            }
            // Check to see if we should be quitting early, before moving on to the next iteration.
            const matchLengthOfLongest = (furthestOriginalIndex -
                originalStart +
                (furthestModifiedIndex - modifiedStart) -
                numDifferences) /
                2;
            if (this.ContinueProcessingPredicate !== null &&
                !this.ContinueProcessingPredicate(furthestOriginalIndex, matchLengthOfLongest)) {
                // We can't finish, so skip ahead to generating a result from what we have.
                quitEarlyArr[0] = true;
                // Use the furthest distance we got in the forward direction.
                midOriginalArr[0] = furthestOriginalIndex;
                midModifiedArr[0] = furthestModifiedIndex;
                if (matchLengthOfLongest > 0 &&
                    1447 /* LocalConstants.MaxDifferencesHistory */ > 0 &&
                    numDifferences <= 1447 /* LocalConstants.MaxDifferencesHistory */ + 1) {
                    // Enough of the history is in memory to walk it backwards
                    return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                }
                else {
                    // We didn't actually remember enough of the history.
                    //Since we are quitting the diff early, we need to shift back the originalStart and modified start
                    //back into the boundary limits since we decremented their value above beyond the boundary limit.
                    originalStart++;
                    modifiedStart++;
                    return [
                        new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, modifiedEnd - modifiedStart + 1),
                    ];
                }
            }
            // Run the algorithm in the reverse direction
            diagonalReverseStart = this.ClipDiagonalBound(diagonalReverseBase - numDifferences, numDifferences, diagonalReverseBase, numDiagonals);
            diagonalReverseEnd = this.ClipDiagonalBound(diagonalReverseBase + numDifferences, numDifferences, diagonalReverseBase, numDiagonals);
            for (let diagonal = diagonalReverseStart; diagonal <= diagonalReverseEnd; diagonal += 2) {
                // STEP 1: We extend the furthest reaching point in the present diagonal
                // by looking at the diagonals above and below and picking the one whose point
                // is further away from the start point (originalEnd, modifiedEnd)
                if (diagonal === diagonalReverseStart ||
                    (diagonal < diagonalReverseEnd &&
                        reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])) {
                    originalIndex = reversePoints[diagonal + 1] - 1;
                }
                else {
                    originalIndex = reversePoints[diagonal - 1];
                }
                modifiedIndex = originalIndex - (diagonal - diagonalReverseBase) - diagonalReverseOffset;
                // Save the current originalIndex so we can test for false overlap
                const tempOriginalIndex = originalIndex;
                // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
                // as long as the elements are equal.
                while (originalIndex > originalStart &&
                    modifiedIndex > modifiedStart &&
                    this.ElementsAreEqual(originalIndex, modifiedIndex)) {
                    originalIndex--;
                    modifiedIndex--;
                }
                reversePoints[diagonal] = originalIndex;
                // STEP 4: If delta is even (overlap first happens on reverse when delta is even)
                // and diagonal is in the range of forward diagonals computed for numDifferences
                // then check for overlap.
                if (deltaIsEven && Math.abs(diagonal - diagonalForwardBase) <= numDifferences) {
                    if (originalIndex <= forwardPoints[diagonal]) {
                        midOriginalArr[0] = originalIndex;
                        midModifiedArr[0] = modifiedIndex;
                        if (tempOriginalIndex >= forwardPoints[diagonal] &&
                            1447 /* LocalConstants.MaxDifferencesHistory */ > 0 &&
                            numDifferences <= 1447 /* LocalConstants.MaxDifferencesHistory */ + 1) {
                            // BINGO! We overlapped, and we have the full trace in memory!
                            return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
                        }
                        else {
                            // Either false overlap, or we didn't have enough memory for the full trace
                            // Just return the recursion point
                            return null;
                        }
                    }
                }
            }
            // Save current vectors to history before the next iteration
            if (numDifferences <= 1447 /* LocalConstants.MaxDifferencesHistory */) {
                // We are allocating space for one extra int, which we fill with
                // the index of the diagonal base index
                let temp = new Int32Array(diagonalForwardEnd - diagonalForwardStart + 2);
                temp[0] = diagonalForwardBase - diagonalForwardStart + 1;
                MyArray.Copy2(forwardPoints, diagonalForwardStart, temp, 1, diagonalForwardEnd - diagonalForwardStart + 1);
                this.m_forwardHistory.push(temp);
                temp = new Int32Array(diagonalReverseEnd - diagonalReverseStart + 2);
                temp[0] = diagonalReverseBase - diagonalReverseStart + 1;
                MyArray.Copy2(reversePoints, diagonalReverseStart, temp, 1, diagonalReverseEnd - diagonalReverseStart + 1);
                this.m_reverseHistory.push(temp);
            }
        }
        // If we got here, then we have the full trace in history. We just have to convert it to a change list
        // NOTE: This part is a bit messy
        return this.WALKTRACE(diagonalForwardBase, diagonalForwardStart, diagonalForwardEnd, diagonalForwardOffset, diagonalReverseBase, diagonalReverseStart, diagonalReverseEnd, diagonalReverseOffset, forwardPoints, reversePoints, originalIndex, originalEnd, midOriginalArr, modifiedIndex, modifiedEnd, midModifiedArr, deltaIsEven, quitEarlyArr);
    }
    /**
     * Shifts the given changes to provide a more intuitive diff.
     * While the first element in a diff matches the first element after the diff,
     * we shift the diff down.
     *
     * @param changes The list of changes to shift
     * @returns The shifted changes
     */
    PrettifyChanges(changes) {
        // Shift all the changes down first
        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            const originalStop = i < changes.length - 1 ? changes[i + 1].originalStart : this._originalElementsOrHash.length;
            const modifiedStop = i < changes.length - 1 ? changes[i + 1].modifiedStart : this._modifiedElementsOrHash.length;
            const checkOriginal = change.originalLength > 0;
            const checkModified = change.modifiedLength > 0;
            while (change.originalStart + change.originalLength < originalStop &&
                change.modifiedStart + change.modifiedLength < modifiedStop &&
                (!checkOriginal ||
                    this.OriginalElementsAreEqual(change.originalStart, change.originalStart + change.originalLength)) &&
                (!checkModified ||
                    this.ModifiedElementsAreEqual(change.modifiedStart, change.modifiedStart + change.modifiedLength))) {
                const startStrictEqual = this.ElementsAreStrictEqual(change.originalStart, change.modifiedStart);
                const endStrictEqual = this.ElementsAreStrictEqual(change.originalStart + change.originalLength, change.modifiedStart + change.modifiedLength);
                if (endStrictEqual && !startStrictEqual) {
                    // moving the change down would create an equal change, but the elements are not strict equal
                    break;
                }
                change.originalStart++;
                change.modifiedStart++;
            }
            const mergedChangeArr = [null];
            if (i < changes.length - 1 &&
                this.ChangesOverlap(changes[i], changes[i + 1], mergedChangeArr)) {
                changes[i] = mergedChangeArr[0];
                changes.splice(i + 1, 1);
                i--;
                continue;
            }
        }
        // Shift changes back up until we hit empty or whitespace-only lines
        for (let i = changes.length - 1; i >= 0; i--) {
            const change = changes[i];
            let originalStop = 0;
            let modifiedStop = 0;
            if (i > 0) {
                const prevChange = changes[i - 1];
                originalStop = prevChange.originalStart + prevChange.originalLength;
                modifiedStop = prevChange.modifiedStart + prevChange.modifiedLength;
            }
            const checkOriginal = change.originalLength > 0;
            const checkModified = change.modifiedLength > 0;
            let bestDelta = 0;
            let bestScore = this._boundaryScore(change.originalStart, change.originalLength, change.modifiedStart, change.modifiedLength);
            for (let delta = 1;; delta++) {
                const originalStart = change.originalStart - delta;
                const modifiedStart = change.modifiedStart - delta;
                if (originalStart < originalStop || modifiedStart < modifiedStop) {
                    break;
                }
                if (checkOriginal &&
                    !this.OriginalElementsAreEqual(originalStart, originalStart + change.originalLength)) {
                    break;
                }
                if (checkModified &&
                    !this.ModifiedElementsAreEqual(modifiedStart, modifiedStart + change.modifiedLength)) {
                    break;
                }
                const touchingPreviousChange = originalStart === originalStop && modifiedStart === modifiedStop;
                const score = (touchingPreviousChange ? 5 : 0) +
                    this._boundaryScore(originalStart, change.originalLength, modifiedStart, change.modifiedLength);
                if (score > bestScore) {
                    bestScore = score;
                    bestDelta = delta;
                }
            }
            change.originalStart -= bestDelta;
            change.modifiedStart -= bestDelta;
            const mergedChangeArr = [null];
            if (i > 0 && this.ChangesOverlap(changes[i - 1], changes[i], mergedChangeArr)) {
                changes[i - 1] = mergedChangeArr[0];
                changes.splice(i, 1);
                i++;
                continue;
            }
        }
        // There could be multiple longest common substrings.
        // Give preference to the ones containing longer lines
        if (this._hasStrings) {
            for (let i = 1, len = changes.length; i < len; i++) {
                const aChange = changes[i - 1];
                const bChange = changes[i];
                const matchedLength = bChange.originalStart - aChange.originalStart - aChange.originalLength;
                const aOriginalStart = aChange.originalStart;
                const bOriginalEnd = bChange.originalStart + bChange.originalLength;
                const abOriginalLength = bOriginalEnd - aOriginalStart;
                const aModifiedStart = aChange.modifiedStart;
                const bModifiedEnd = bChange.modifiedStart + bChange.modifiedLength;
                const abModifiedLength = bModifiedEnd - aModifiedStart;
                // Avoid wasting a lot of time with these searches
                if (matchedLength < 5 && abOriginalLength < 20 && abModifiedLength < 20) {
                    const t = this._findBetterContiguousSequence(aOriginalStart, abOriginalLength, aModifiedStart, abModifiedLength, matchedLength);
                    if (t) {
                        const [originalMatchStart, modifiedMatchStart] = t;
                        if (originalMatchStart !== aChange.originalStart + aChange.originalLength ||
                            modifiedMatchStart !== aChange.modifiedStart + aChange.modifiedLength) {
                            // switch to another sequence that has a better score
                            aChange.originalLength = originalMatchStart - aChange.originalStart;
                            aChange.modifiedLength = modifiedMatchStart - aChange.modifiedStart;
                            bChange.originalStart = originalMatchStart + matchedLength;
                            bChange.modifiedStart = modifiedMatchStart + matchedLength;
                            bChange.originalLength = bOriginalEnd - bChange.originalStart;
                            bChange.modifiedLength = bModifiedEnd - bChange.modifiedStart;
                        }
                    }
                }
            }
        }
        return changes;
    }
    _findBetterContiguousSequence(originalStart, originalLength, modifiedStart, modifiedLength, desiredLength) {
        if (originalLength < desiredLength || modifiedLength < desiredLength) {
            return null;
        }
        const originalMax = originalStart + originalLength - desiredLength + 1;
        const modifiedMax = modifiedStart + modifiedLength - desiredLength + 1;
        let bestScore = 0;
        let bestOriginalStart = 0;
        let bestModifiedStart = 0;
        for (let i = originalStart; i < originalMax; i++) {
            for (let j = modifiedStart; j < modifiedMax; j++) {
                const score = this._contiguousSequenceScore(i, j, desiredLength);
                if (score > 0 && score > bestScore) {
                    bestScore = score;
                    bestOriginalStart = i;
                    bestModifiedStart = j;
                }
            }
        }
        if (bestScore > 0) {
            return [bestOriginalStart, bestModifiedStart];
        }
        return null;
    }
    _contiguousSequenceScore(originalStart, modifiedStart, length) {
        let score = 0;
        for (let l = 0; l < length; l++) {
            if (!this.ElementsAreEqual(originalStart + l, modifiedStart + l)) {
                return 0;
            }
            score += this._originalStringElements[originalStart + l].length;
        }
        return score;
    }
    _OriginalIsBoundary(index) {
        if (index <= 0 || index >= this._originalElementsOrHash.length - 1) {
            return true;
        }
        return this._hasStrings && /^\s*$/.test(this._originalStringElements[index]);
    }
    _OriginalRegionIsBoundary(originalStart, originalLength) {
        if (this._OriginalIsBoundary(originalStart) || this._OriginalIsBoundary(originalStart - 1)) {
            return true;
        }
        if (originalLength > 0) {
            const originalEnd = originalStart + originalLength;
            if (this._OriginalIsBoundary(originalEnd - 1) || this._OriginalIsBoundary(originalEnd)) {
                return true;
            }
        }
        return false;
    }
    _ModifiedIsBoundary(index) {
        if (index <= 0 || index >= this._modifiedElementsOrHash.length - 1) {
            return true;
        }
        return this._hasStrings && /^\s*$/.test(this._modifiedStringElements[index]);
    }
    _ModifiedRegionIsBoundary(modifiedStart, modifiedLength) {
        if (this._ModifiedIsBoundary(modifiedStart) || this._ModifiedIsBoundary(modifiedStart - 1)) {
            return true;
        }
        if (modifiedLength > 0) {
            const modifiedEnd = modifiedStart + modifiedLength;
            if (this._ModifiedIsBoundary(modifiedEnd - 1) || this._ModifiedIsBoundary(modifiedEnd)) {
                return true;
            }
        }
        return false;
    }
    _boundaryScore(originalStart, originalLength, modifiedStart, modifiedLength) {
        const originalScore = this._OriginalRegionIsBoundary(originalStart, originalLength) ? 1 : 0;
        const modifiedScore = this._ModifiedRegionIsBoundary(modifiedStart, modifiedLength) ? 1 : 0;
        return originalScore + modifiedScore;
    }
    /**
     * Concatenates the two input DiffChange lists and returns the resulting
     * list.
     * @param The left changes
     * @param The right changes
     * @returns The concatenated list
     */
    ConcatenateChanges(left, right) {
        const mergedChangeArr = [];
        if (left.length === 0 || right.length === 0) {
            return right.length > 0 ? right : left;
        }
        else if (this.ChangesOverlap(left[left.length - 1], right[0], mergedChangeArr)) {
            // Since we break the problem down recursively, it is possible that we
            // might recurse in the middle of a change thereby splitting it into
            // two changes. Here in the combining stage, we detect and fuse those
            // changes back together
            const result = new Array(left.length + right.length - 1);
            MyArray.Copy(left, 0, result, 0, left.length - 1);
            result[left.length - 1] = mergedChangeArr[0];
            MyArray.Copy(right, 1, result, left.length, right.length - 1);
            return result;
        }
        else {
            const result = new Array(left.length + right.length);
            MyArray.Copy(left, 0, result, 0, left.length);
            MyArray.Copy(right, 0, result, left.length, right.length);
            return result;
        }
    }
    /**
     * Returns true if the two changes overlap and can be merged into a single
     * change
     * @param left The left change
     * @param right The right change
     * @param mergedChange The merged change if the two overlap, null otherwise
     * @returns True if the two changes overlap
     */
    ChangesOverlap(left, right, mergedChangeArr) {
        Debug.Assert(left.originalStart <= right.originalStart, 'Left change is not less than or equal to right change');
        Debug.Assert(left.modifiedStart <= right.modifiedStart, 'Left change is not less than or equal to right change');
        if (left.originalStart + left.originalLength >= right.originalStart ||
            left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
            const originalStart = left.originalStart;
            let originalLength = left.originalLength;
            const modifiedStart = left.modifiedStart;
            let modifiedLength = left.modifiedLength;
            if (left.originalStart + left.originalLength >= right.originalStart) {
                originalLength = right.originalStart + right.originalLength - left.originalStart;
            }
            if (left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
                modifiedLength = right.modifiedStart + right.modifiedLength - left.modifiedStart;
            }
            mergedChangeArr[0] = new DiffChange(originalStart, originalLength, modifiedStart, modifiedLength);
            return true;
        }
        else {
            mergedChangeArr[0] = null;
            return false;
        }
    }
    /**
     * Helper method used to clip a diagonal index to the range of valid
     * diagonals. This also decides whether or not the diagonal index,
     * if it exceeds the boundary, should be clipped to the boundary or clipped
     * one inside the boundary depending on the Even/Odd status of the boundary
     * and numDifferences.
     * @param diagonal The index of the diagonal to clip.
     * @param numDifferences The current number of differences being iterated upon.
     * @param diagonalBaseIndex The base reference diagonal.
     * @param numDiagonals The total number of diagonals.
     * @returns The clipped diagonal index.
     */
    ClipDiagonalBound(diagonal, numDifferences, diagonalBaseIndex, numDiagonals) {
        if (diagonal >= 0 && diagonal < numDiagonals) {
            // Nothing to clip, its in range
            return diagonal;
        }
        // diagonalsBelow: The number of diagonals below the reference diagonal
        // diagonalsAbove: The number of diagonals above the reference diagonal
        const diagonalsBelow = diagonalBaseIndex;
        const diagonalsAbove = numDiagonals - diagonalBaseIndex - 1;
        const diffEven = numDifferences % 2 === 0;
        if (diagonal < 0) {
            const lowerBoundEven = diagonalsBelow % 2 === 0;
            return diffEven === lowerBoundEven ? 0 : 1;
        }
        else {
            const upperBoundEven = diagonalsAbove % 2 === 0;
            return diffEven === upperBoundEven ? numDiagonals - 1 : numDiagonals - 2;
        }
    }
}
/**
 * Precomputed equality array for character codes.
 */
const precomputedEqualityArray = new Uint32Array(0x10000);
/**
 * Computes the Levenshtein distance for strings of length <= 32.
 * @param firstString - The first string.
 * @param secondString - The second string.
 * @returns The Levenshtein distance.
 */
const computeLevenshteinDistanceForShortStrings = (firstString, secondString) => {
    const firstStringLength = firstString.length;
    const secondStringLength = secondString.length;
    const lastBitMask = 1 << (firstStringLength - 1);
    let positiveVector = -1;
    let negativeVector = 0;
    let distance = firstStringLength;
    let index = firstStringLength;
    // Initialize precomputedEqualityArray for firstString
    while (index--) {
        precomputedEqualityArray[firstString.charCodeAt(index)] |= 1 << index;
    }
    // Process each character of secondString
    for (index = 0; index < secondStringLength; index++) {
        let equalityMask = precomputedEqualityArray[secondString.charCodeAt(index)];
        const combinedVector = equalityMask | negativeVector;
        equalityMask |= ((equalityMask & positiveVector) + positiveVector) ^ positiveVector;
        negativeVector |= ~(equalityMask | positiveVector);
        positiveVector &= equalityMask;
        if (negativeVector & lastBitMask) {
            distance++;
        }
        if (positiveVector & lastBitMask) {
            distance--;
        }
        negativeVector = (negativeVector << 1) | 1;
        positiveVector = (positiveVector << 1) | ~(combinedVector | negativeVector);
        negativeVector &= combinedVector;
    }
    // Reset precomputedEqualityArray
    index = firstStringLength;
    while (index--) {
        precomputedEqualityArray[firstString.charCodeAt(index)] = 0;
    }
    return distance;
};
/**
 * Computes the Levenshtein distance for strings of length > 32.
 * @param firstString - The first string.
 * @param secondString - The second string.
 * @returns The Levenshtein distance.
 */
function computeLevenshteinDistanceForLongStrings(firstString, secondString) {
    const firstStringLength = firstString.length;
    const secondStringLength = secondString.length;
    const horizontalBitArray = [];
    const verticalBitArray = [];
    const horizontalSize = Math.ceil(firstStringLength / 32);
    const verticalSize = Math.ceil(secondStringLength / 32);
    // Initialize horizontal and vertical bit arrays
    for (let i = 0; i < horizontalSize; i++) {
        horizontalBitArray[i] = -1;
        verticalBitArray[i] = 0;
    }
    let verticalIndex = 0;
    for (; verticalIndex < verticalSize - 1; verticalIndex++) {
        let negativeVector = 0;
        let positiveVector = -1;
        const start = verticalIndex * 32;
        const verticalLength = Math.min(32, secondStringLength) + start;
        // Initialize precomputedEqualityArray for secondString
        for (let k = start; k < verticalLength; k++) {
            precomputedEqualityArray[secondString.charCodeAt(k)] |= 1 << k;
        }
        // Process each character of firstString
        for (let i = 0; i < firstStringLength; i++) {
            const equalityMask = precomputedEqualityArray[firstString.charCodeAt(i)];
            const previousBit = (horizontalBitArray[(i / 32) | 0] >>> i) & 1;
            const matchBit = (verticalBitArray[(i / 32) | 0] >>> i) & 1;
            const combinedVector = equalityMask | negativeVector;
            const combinedHorizontalVector = ((((equalityMask | matchBit) & positiveVector) + positiveVector) ^ positiveVector) |
                equalityMask |
                matchBit;
            let positiveHorizontalVector = negativeVector | ~(combinedHorizontalVector | positiveVector);
            let negativeHorizontalVector = positiveVector & combinedHorizontalVector;
            if ((positiveHorizontalVector >>> 31) ^ previousBit) {
                horizontalBitArray[(i / 32) | 0] ^= 1 << i;
            }
            if ((negativeHorizontalVector >>> 31) ^ matchBit) {
                verticalBitArray[(i / 32) | 0] ^= 1 << i;
            }
            positiveHorizontalVector = (positiveHorizontalVector << 1) | previousBit;
            negativeHorizontalVector = (negativeHorizontalVector << 1) | matchBit;
            positiveVector = negativeHorizontalVector | ~(combinedVector | positiveHorizontalVector);
            negativeVector = positiveHorizontalVector & combinedVector;
        }
        // Reset precomputedEqualityArray
        for (let k = start; k < verticalLength; k++) {
            precomputedEqualityArray[secondString.charCodeAt(k)] = 0;
        }
    }
    let negativeVector = 0;
    let positiveVector = -1;
    const start = verticalIndex * 32;
    const verticalLength = Math.min(32, secondStringLength - start) + start;
    // Initialize precomputedEqualityArray for secondString
    for (let k = start; k < verticalLength; k++) {
        precomputedEqualityArray[secondString.charCodeAt(k)] |= 1 << k;
    }
    let distance = secondStringLength;
    // Process each character of firstString
    for (let i = 0; i < firstStringLength; i++) {
        const equalityMask = precomputedEqualityArray[firstString.charCodeAt(i)];
        const previousBit = (horizontalBitArray[(i / 32) | 0] >>> i) & 1;
        const matchBit = (verticalBitArray[(i / 32) | 0] >>> i) & 1;
        const combinedVector = equalityMask | negativeVector;
        const combinedHorizontalVector = ((((equalityMask | matchBit) & positiveVector) + positiveVector) ^ positiveVector) |
            equalityMask |
            matchBit;
        let positiveHorizontalVector = negativeVector | ~(combinedHorizontalVector | positiveVector);
        let negativeHorizontalVector = positiveVector & combinedHorizontalVector;
        distance += (positiveHorizontalVector >>> (secondStringLength - 1)) & 1;
        distance -= (negativeHorizontalVector >>> (secondStringLength - 1)) & 1;
        if ((positiveHorizontalVector >>> 31) ^ previousBit) {
            horizontalBitArray[(i / 32) | 0] ^= 1 << i;
        }
        if ((negativeHorizontalVector >>> 31) ^ matchBit) {
            verticalBitArray[(i / 32) | 0] ^= 1 << i;
        }
        positiveHorizontalVector = (positiveHorizontalVector << 1) | previousBit;
        negativeHorizontalVector = (negativeHorizontalVector << 1) | matchBit;
        positiveVector = negativeHorizontalVector | ~(combinedVector | positiveHorizontalVector);
        negativeVector = positiveHorizontalVector & combinedVector;
    }
    // Reset precomputedEqualityArray
    for (let k = start; k < verticalLength; k++) {
        precomputedEqualityArray[secondString.charCodeAt(k)] = 0;
    }
    return distance;
}
/**
 * Computes the Levenshtein distance between two strings.
 * @param firstString - The first string.
 * @param secondString - The second string.
 * @returns The Levenshtein distance.
 */
export function computeLevenshteinDistance(firstString, secondString) {
    if (firstString.length < secondString.length) {
        const temp = secondString;
        secondString = firstString;
        firstString = temp;
    }
    if (secondString.length === 0) {
        return firstString.length;
    }
    if (firstString.length <= 32) {
        return computeLevenshteinDistanceForShortStrings(firstString, secondString);
    }
    return computeLevenshteinDistanceForLongStrings(firstString, secondString);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vZGlmZi9kaWZmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBR3ZDLE1BQU0sT0FBTyxrQkFBa0I7SUFDOUIsWUFBb0IsTUFBYztRQUFkLFdBQU0sR0FBTixNQUFNLENBQVE7SUFBRyxDQUFDO0lBRXRDLFdBQVc7UUFDVixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkQsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLE1BQWU7SUFDN0UsT0FBTyxJQUFJLE9BQU8sQ0FDakIsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFDaEMsSUFBSSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FDaEMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFBO0FBQzlCLENBQUM7QUEwQ0QsRUFBRTtBQUNGLGdFQUFn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