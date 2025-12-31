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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2RpZmYvZGlmZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUd2QyxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLFlBQW9CLE1BQWM7UUFBZCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBQUcsQ0FBQztJQUV0QyxXQUFXO1FBQ1YsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUMxQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ25ELFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFDRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxNQUFlO0lBQzdFLE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQ2hDLElBQUksa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQ2hDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQTtBQUM5QixDQUFDO0FBMENELEVBQUU7QUFDRixnRUFBZ0U7QUFDaEUsRUFBRTtBQUVGLE1BQU0sS0FBSztJQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBa0IsRUFBRSxPQUFlO1FBQ3ZELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3pCLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU87SUFDWjs7Ozs7Ozs7Ozs7Ozs7T0FjRztJQUNJLE1BQU0sQ0FBQyxJQUFJLENBQ2pCLFdBQWtCLEVBQ2xCLFdBQW1CLEVBQ25CLGdCQUF1QixFQUN2QixnQkFBd0IsRUFDeEIsTUFBYztRQUVkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNqQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7SUFDRixDQUFDO0lBQ00sTUFBTSxDQUFDLEtBQUssQ0FDbEIsV0FBdUIsRUFDdkIsV0FBbUIsRUFDbkIsZ0JBQTRCLEVBQzVCLGdCQUF3QixFQUN4QixNQUFjO1FBRWQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pDLGdCQUFnQixDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdEUsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELCtFQUErRTtBQUMvRSxhQUFhO0FBQ2IsRUFBRTtBQUNGLDZEQUE2RDtBQUM3RCx3RUFBd0U7QUFDeEUsRUFBRTtBQUNGLHFFQUFxRTtBQUNyRSwrRUFBK0U7QUFFL0UsOERBQThEO0FBQzlELG9GQUFvRjtBQUNwRiw0Q0FBNEM7QUFDNUMsSUFBVyxjQUVWO0FBRkQsV0FBVyxjQUFjO0lBQ3hCLHdGQUE0QixDQUFBO0FBQzdCLENBQUMsRUFGVSxjQUFjLEtBQWQsY0FBYyxRQUV4QjtBQUVEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLGdCQUFnQjtJQU9yQjs7T0FFRztJQUNIO1FBQ0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDbkIsSUFBSSxDQUFDLGVBQWUsb0RBQW1DLENBQUE7UUFDdkQsSUFBSSxDQUFDLGVBQWUsb0RBQW1DLENBQUE7UUFDdkQsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUE7UUFDeEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUE7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYztRQUNwQixvREFBb0Q7UUFDcEQsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFELGlDQUFpQztZQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDbEIsSUFBSSxVQUFVLENBQ2IsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLGVBQWUsQ0FDcEIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUN4QixJQUFJLENBQUMsZUFBZSxvREFBbUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsZUFBZSxvREFBbUMsQ0FBQTtJQUN4RCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ksa0JBQWtCLENBQUMsYUFBcUIsRUFBRSxhQUFxQjtRQUNyRSxnRUFBZ0U7UUFDaEUsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDcEUsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFcEUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSSxrQkFBa0IsQ0FBQyxhQUFxQixFQUFFLGFBQXFCO1FBQ3JFLGdFQUFnRTtRQUNoRSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUVwRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksVUFBVTtRQUNoQixJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUQsZ0NBQWdDO1lBQ2hDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNJLGlCQUFpQjtRQUN2QixJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUQsZ0NBQWdDO1lBQ2hDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN0QixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztDQUNEO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLE9BQU87SUFjbkI7O09BRUc7SUFDSCxZQUNDLGdCQUEyQixFQUMzQixnQkFBMkIsRUFDM0IsOEJBQW1FLElBQUk7UUFFdkUsSUFBSSxDQUFDLDJCQUEyQixHQUFHLDJCQUEyQixDQUFBO1FBRTlELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQTtRQUN6QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUE7UUFFekMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLEdBQ3pFLE9BQU8sQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLENBQUMsR0FDekUsT0FBTyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXZDLElBQUksQ0FBQyxXQUFXLEdBQUcsa0JBQWtCLElBQUksa0JBQWtCLENBQUE7UUFDM0QsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHNCQUFzQixDQUFBO1FBQ3JELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQTtRQUNyRCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsc0JBQXNCLENBQUE7UUFDckQsSUFBSSxDQUFDLHVCQUF1QixHQUFHLHNCQUFzQixDQUFBO1FBRXJELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFxQztRQUNsRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQTtJQUNwRCxDQUFDO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFtQjtRQUM5QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUE7UUFFdkMsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsQ0FBQztZQUNELE9BQU8sQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFFRCxJQUFJLFFBQVEsWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3QixDQUFDO1FBRUQsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsYUFBcUIsRUFBRSxRQUFnQjtRQUMvRCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLENBQUMsS0FBSyxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM1RixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXO1lBQ3RCLENBQUMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsYUFBYSxDQUFDLEtBQUssSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQztZQUN4RixDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ1IsQ0FBQztJQUVPLHNCQUFzQixDQUFDLGFBQXFCLEVBQUUsUUFBZ0I7UUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNyRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDbkYsT0FBTyxlQUFlLEtBQUssZUFBZSxDQUFBO0lBQzNDLENBQUM7SUFFTyxNQUFNLENBQUMsaUJBQWlCLENBQUMsUUFBbUIsRUFBRSxLQUFhO1FBQ2xFLElBQUksT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDckQsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDeEMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLHdCQUF3QixDQUFDLE1BQWMsRUFBRSxNQUFjO1FBQzlELElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ25GLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFdBQVc7WUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDO1lBQy9FLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDUixDQUFDO0lBRU8sd0JBQXdCLENBQUMsTUFBYyxFQUFFLE1BQWM7UUFDOUQsSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbkYsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsV0FBVztZQUN0QixDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUM7WUFDL0UsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUNSLENBQUM7SUFFTSxXQUFXLENBQUMsTUFBZTtRQUNqQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQ3ZCLENBQUMsRUFDRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDdkMsQ0FBQyxFQUNELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN2QyxNQUFNLENBQ04sQ0FBQTtJQUNGLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssWUFBWSxDQUNuQixhQUFxQixFQUNyQixXQUFtQixFQUNuQixhQUFxQixFQUNyQixXQUFtQixFQUNuQixNQUFlO1FBRWYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1QixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQ3RDLGFBQWEsRUFDYixXQUFXLEVBQ1gsYUFBYSxFQUNiLFdBQVcsRUFDWCxZQUFZLENBQ1osQ0FBQTtRQUVELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWiw2REFBNkQ7WUFDN0Qsc0VBQXNFO1lBQ3RFLDhCQUE4QjtZQUM5QixPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QyxDQUFDO1FBRUQsT0FBTztZQUNOLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzFCLE9BQU8sRUFBRSxPQUFPO1NBQ2hCLENBQUE7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLG9CQUFvQixDQUMzQixhQUFxQixFQUNyQixXQUFtQixFQUNuQixhQUFxQixFQUNyQixXQUFtQixFQUNuQixZQUF1QjtRQUV2QixZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFBO1FBRXZCLG9DQUFvQztRQUNwQyxPQUNDLGFBQWEsSUFBSSxXQUFXO1lBQzVCLGFBQWEsSUFBSSxXQUFXO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLEVBQ2xELENBQUM7WUFDRixhQUFhLEVBQUUsQ0FBQTtZQUNmLGFBQWEsRUFBRSxDQUFBO1FBQ2hCLENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsT0FDQyxXQUFXLElBQUksYUFBYTtZQUM1QixXQUFXLElBQUksYUFBYTtZQUM1QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxFQUM5QyxDQUFDO1lBQ0YsV0FBVyxFQUFFLENBQUE7WUFDYixXQUFXLEVBQUUsQ0FBQTtRQUNkLENBQUM7UUFFRCwwR0FBMEc7UUFDMUcsSUFBSSxhQUFhLEdBQUcsV0FBVyxJQUFJLGFBQWEsR0FBRyxXQUFXLEVBQUUsQ0FBQztZQUNoRSxJQUFJLE9BQXFCLENBQUE7WUFFekIsSUFBSSxhQUFhLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQ1gsYUFBYSxLQUFLLFdBQVcsR0FBRyxDQUFDLEVBQ2pDLHdEQUF3RCxDQUN4RCxDQUFBO2dCQUVELGlCQUFpQjtnQkFDakIsT0FBTyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsV0FBVyxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzdGLENBQUM7aUJBQU0sSUFBSSxhQUFhLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ3pDLEtBQUssQ0FBQyxNQUFNLENBQ1gsYUFBYSxLQUFLLFdBQVcsR0FBRyxDQUFDLEVBQ2pDLHdEQUF3RCxDQUN4RCxDQUFBO2dCQUVELGdCQUFnQjtnQkFDaEIsT0FBTyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQUMsYUFBYSxFQUFFLFdBQVcsR0FBRyxhQUFhLEdBQUcsQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzdGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxLQUFLLENBQUMsTUFBTSxDQUNYLGFBQWEsS0FBSyxXQUFXLEdBQUcsQ0FBQyxFQUNqQyx3REFBd0QsQ0FDeEQsQ0FBQTtnQkFDRCxLQUFLLENBQUMsTUFBTSxDQUNYLGFBQWEsS0FBSyxXQUFXLEdBQUcsQ0FBQyxFQUNqQyx3REFBd0QsQ0FDeEQsQ0FBQTtnQkFFRCx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sR0FBRyxFQUFFLENBQUE7WUFDYixDQUFDO1lBRUQsT0FBTyxPQUFPLENBQUE7UUFDZixDQUFDO1FBRUQscUVBQXFFO1FBQ3JFLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQ3hDLGFBQWEsRUFDYixXQUFXLEVBQ1gsYUFBYSxFQUNiLFdBQVcsRUFDWCxjQUFjLEVBQ2QsY0FBYyxFQUNkLFlBQVksQ0FDWixDQUFBO1FBRUQsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyQyxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNyQiwrRUFBK0U7WUFDL0Usb0NBQW9DO1lBQ3BDLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQzthQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM3QiwwRUFBMEU7WUFDMUUsNkVBQTZFO1lBQzdFLGlGQUFpRjtZQUNqRix3RkFBd0Y7WUFFeEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUM1QyxhQUFhLEVBQ2IsV0FBVyxFQUNYLGFBQWEsRUFDYixXQUFXLEVBQ1gsWUFBWSxDQUNaLENBQUE7WUFDRCxJQUFJLFlBQVksR0FBaUIsRUFBRSxDQUFBO1lBRW5DLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FDdkMsV0FBVyxHQUFHLENBQUMsRUFDZixXQUFXLEVBQ1gsV0FBVyxHQUFHLENBQUMsRUFDZixXQUFXLEVBQ1gsWUFBWSxDQUNaLENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsNEZBQTRGO2dCQUM1RixzREFBc0Q7Z0JBQ3RELFlBQVksR0FBRztvQkFDZCxJQUFJLFVBQVUsQ0FDYixXQUFXLEdBQUcsQ0FBQyxFQUNmLFdBQVcsR0FBRyxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQ25DLFdBQVcsR0FBRyxDQUFDLEVBQ2YsV0FBVyxHQUFHLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FDbkM7aUJBQ0QsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxPQUFPO1lBQ04sSUFBSSxVQUFVLENBQ2IsYUFBYSxFQUNiLFdBQVcsR0FBRyxhQUFhLEdBQUcsQ0FBQyxFQUMvQixhQUFhLEVBQ2IsV0FBVyxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQy9CO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTyxTQUFTLENBQ2hCLG1CQUEyQixFQUMzQixvQkFBNEIsRUFDNUIsa0JBQTBCLEVBQzFCLHFCQUE2QixFQUM3QixtQkFBMkIsRUFDM0Isb0JBQTRCLEVBQzVCLGtCQUEwQixFQUMxQixxQkFBNkIsRUFDN0IsYUFBeUIsRUFDekIsYUFBeUIsRUFDekIsYUFBcUIsRUFDckIsV0FBbUIsRUFDbkIsY0FBd0IsRUFDeEIsYUFBcUIsRUFDckIsV0FBbUIsRUFDbkIsY0FBd0IsRUFDeEIsV0FBb0IsRUFDcEIsWUFBdUI7UUFFdkIsSUFBSSxjQUFjLEdBQXdCLElBQUksQ0FBQTtRQUM5QyxJQUFJLGNBQWMsR0FBd0IsSUFBSSxDQUFBO1FBRTlDLDZEQUE2RDtRQUM3RCxJQUFJLFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7UUFDekMsSUFBSSxXQUFXLEdBQUcsb0JBQW9CLENBQUE7UUFDdEMsSUFBSSxXQUFXLEdBQUcsa0JBQWtCLENBQUE7UUFDcEMsSUFBSSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLHFCQUFxQixDQUFBO1FBQ3BGLElBQUksaUJBQWlCLHFEQUFtQyxDQUFBO1FBQ3hELElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBRW5ELEdBQUcsQ0FBQztZQUNILDJEQUEyRDtZQUMzRCxNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQTtZQUV2RCxnQ0FBZ0M7WUFDaEMsSUFDQyxRQUFRLEtBQUssV0FBVztnQkFDeEIsQ0FBQyxRQUFRLEdBQUcsV0FBVyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUNwRixDQUFDO2dCQUNGLDJDQUEyQztnQkFDM0MsYUFBYSxHQUFHLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzNDLGFBQWEsR0FBRyxhQUFhLEdBQUcsZ0JBQWdCLEdBQUcscUJBQXFCLENBQUE7Z0JBQ3hFLElBQUksYUFBYSxHQUFHLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtnQkFDOUIsQ0FBQztnQkFDRCxpQkFBaUIsR0FBRyxhQUFhLENBQUE7Z0JBQ2pDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNqRSxnQkFBZ0IsR0FBRyxRQUFRLEdBQUcsQ0FBQyxHQUFHLG1CQUFtQixDQUFBLENBQUMsOEJBQThCO1lBQ3JGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCw4Q0FBOEM7Z0JBQzlDLGFBQWEsR0FBRyxhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDL0MsYUFBYSxHQUFHLGFBQWEsR0FBRyxnQkFBZ0IsR0FBRyxxQkFBcUIsQ0FBQTtnQkFDeEUsSUFBSSxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztvQkFDdkMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFBO2dCQUM5QixDQUFDO2dCQUNELGlCQUFpQixHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUE7Z0JBQ3JDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNqRSxnQkFBZ0IsR0FBRyxRQUFRLEdBQUcsQ0FBQyxHQUFHLG1CQUFtQixDQUFBLENBQUMsOEJBQThCO1lBQ3JGLENBQUM7WUFFRCxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDbkQsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsa0NBQWtDO2dCQUN6RSxXQUFXLEdBQUcsQ0FBQyxDQUFBO2dCQUNmLFdBQVcsR0FBRyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxRQUFRLEVBQUUsWUFBWSxJQUFJLENBQUMsQ0FBQyxFQUFDO1FBRTlCLCtEQUErRDtRQUMvRCxnRUFBZ0U7UUFDaEUsY0FBYyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRWpELElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckIsd0RBQXdEO1lBQ3hELDBGQUEwRjtZQUUxRixJQUFJLGtCQUFrQixHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDOUMsSUFBSSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRTlDLElBQUksY0FBYyxLQUFLLElBQUksSUFBSSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUNuRSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7Z0JBQ3JGLGtCQUFrQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtZQUN0RixDQUFDO1lBRUQsY0FBYyxHQUFHO2dCQUNoQixJQUFJLFVBQVUsQ0FDYixrQkFBa0IsRUFDbEIsV0FBVyxHQUFHLGtCQUFrQixHQUFHLENBQUMsRUFDcEMsa0JBQWtCLEVBQ2xCLFdBQVcsR0FBRyxrQkFBa0IsR0FBRyxDQUFDLENBQ3BDO2FBQ0QsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsMERBQTBEO1lBQzFELFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7WUFDckMsV0FBVyxHQUFHLG9CQUFvQixDQUFBO1lBQ2xDLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQTtZQUNoQyxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLHFCQUFxQixDQUFBO1lBQ2hGLGlCQUFpQixvREFBbUMsQ0FBQTtZQUNwRCxZQUFZLEdBQUcsV0FBVztnQkFDekIsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBRW5DLEdBQUcsQ0FBQztnQkFDSCwyREFBMkQ7Z0JBQzNELE1BQU0sUUFBUSxHQUFHLGdCQUFnQixHQUFHLG1CQUFtQixDQUFBO2dCQUV2RCxnQ0FBZ0M7Z0JBQ2hDLElBQ0MsUUFBUSxLQUFLLFdBQVc7b0JBQ3hCLENBQUMsUUFBUSxHQUFHLFdBQVcsSUFBSSxhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDckYsQ0FBQztvQkFDRiwrQ0FBK0M7b0JBQy9DLGFBQWEsR0FBRyxhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDL0MsYUFBYSxHQUFHLGFBQWEsR0FBRyxnQkFBZ0IsR0FBRyxxQkFBcUIsQ0FBQTtvQkFDeEUsSUFBSSxhQUFhLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDdkMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFBO29CQUM5QixDQUFDO29CQUNELGlCQUFpQixHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUE7b0JBQ3JDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDckUsZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxtQkFBbUIsQ0FBQSxDQUFDLDhCQUE4QjtnQkFDckYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLDhDQUE4QztvQkFDOUMsYUFBYSxHQUFHLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7b0JBQzNDLGFBQWEsR0FBRyxhQUFhLEdBQUcsZ0JBQWdCLEdBQUcscUJBQXFCLENBQUE7b0JBQ3hFLElBQUksYUFBYSxHQUFHLGlCQUFpQixFQUFFLENBQUM7d0JBQ3ZDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtvQkFDOUIsQ0FBQztvQkFDRCxpQkFBaUIsR0FBRyxhQUFhLENBQUE7b0JBQ2pDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDckUsZ0JBQWdCLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxtQkFBbUIsQ0FBQSxDQUFDLDhCQUE4QjtnQkFDckYsQ0FBQztnQkFFRCxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDdkIsYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtvQkFDbkQsbUJBQW1CLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsa0NBQWtDO29CQUN6RSxXQUFXLEdBQUcsQ0FBQyxDQUFBO29CQUNmLFdBQVcsR0FBRyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztZQUNGLENBQUMsUUFBUSxFQUFFLFlBQVksSUFBSSxDQUFDLENBQUMsRUFBQztZQUU5QixpRUFBaUU7WUFDakUseURBQXlEO1lBQ3pELGNBQWMsR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDM0MsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0sscUJBQXFCLENBQzVCLGFBQXFCLEVBQ3JCLFdBQW1CLEVBQ25CLGFBQXFCLEVBQ3JCLFdBQW1CLEVBQ25CLGNBQXdCLEVBQ3hCLGNBQXdCLEVBQ3hCLFlBQXVCO1FBRXZCLElBQUksYUFBYSxHQUFHLENBQUMsRUFDcEIsYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUNsQixJQUFJLG9CQUFvQixHQUFHLENBQUMsRUFDM0Isa0JBQWtCLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksb0JBQW9CLEdBQUcsQ0FBQyxFQUMzQixrQkFBa0IsR0FBRyxDQUFDLENBQUE7UUFFdkIsb0VBQW9FO1FBQ3BFLG9EQUFvRDtRQUNwRCxhQUFhLEVBQUUsQ0FBQTtRQUNmLGFBQWEsRUFBRSxDQUFBO1FBRWYsNERBQTREO1FBQzVELCtEQUErRDtRQUMvRCxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFckIsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtRQUUxQiwyRUFBMkU7UUFDM0UsNkVBQTZFO1FBQzdFLDBEQUEwRDtRQUMxRCxtR0FBbUc7UUFDbkcsTUFBTSxjQUFjLEdBQUcsV0FBVyxHQUFHLGFBQWEsR0FBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQTtRQUNsRixNQUFNLFlBQVksR0FBRyxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLElBQUksVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sYUFBYSxHQUFHLElBQUksVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ2xELG9IQUFvSDtRQUNwSCxnSEFBZ0g7UUFDaEgsTUFBTSxtQkFBbUIsR0FBRyxXQUFXLEdBQUcsYUFBYSxDQUFBO1FBQ3ZELE1BQU0sbUJBQW1CLEdBQUcsV0FBVyxHQUFHLGFBQWEsQ0FBQTtRQUN2RCwrR0FBK0c7UUFDL0csdURBQXVEO1FBQ3ZELCtHQUErRztRQUMvRyx1REFBdUQ7UUFDdkQsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQzNELE1BQU0scUJBQXFCLEdBQUcsV0FBVyxHQUFHLFdBQVcsQ0FBQTtRQUV2RCxpSEFBaUg7UUFDakgsdUZBQXVGO1FBQ3ZGLGlHQUFpRztRQUNqRyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQTtRQUN2RCxNQUFNLFdBQVcsR0FBRyxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVuQyw4RUFBOEU7UUFDOUUsMkRBQTJEO1FBQzNELGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLGFBQWEsQ0FBQTtRQUNsRCxhQUFhLENBQUMsbUJBQW1CLENBQUMsR0FBRyxXQUFXLENBQUE7UUFFaEQsZ0dBQWdHO1FBQ2hHLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUE7UUFFdkIsc0JBQXNCO1FBQ3RCLHlGQUF5RjtRQUN6Rix3RUFBd0U7UUFDeEUseUZBQXlGO1FBQ3pGLGtIQUFrSDtRQUNsSCw4RkFBOEY7UUFDOUYsK0RBQStEO1FBQy9ELEtBQUssSUFBSSxjQUFjLEdBQUcsQ0FBQyxFQUFFLGNBQWMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxjQUFjLEVBQUUsRUFBRSxDQUFDO1lBQ3pGLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO1lBQzdCLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFBO1lBRTdCLDZDQUE2QztZQUM3QyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQzVDLG1CQUFtQixHQUFHLGNBQWMsRUFDcEMsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixZQUFZLENBQ1osQ0FBQTtZQUNELGtCQUFrQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FDMUMsbUJBQW1CLEdBQUcsY0FBYyxFQUNwQyxjQUFjLEVBQ2QsbUJBQW1CLEVBQ25CLFlBQVksQ0FDWixDQUFBO1lBQ0QsS0FBSyxJQUFJLFFBQVEsR0FBRyxvQkFBb0IsRUFBRSxRQUFRLElBQUksa0JBQWtCLEVBQUUsUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN6Rix3RUFBd0U7Z0JBQ3hFLDhFQUE4RTtnQkFDOUUsc0VBQXNFO2dCQUN0RSxJQUNDLFFBQVEsS0FBSyxvQkFBb0I7b0JBQ2pDLENBQUMsUUFBUSxHQUFHLGtCQUFrQjt3QkFDN0IsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQzFELENBQUM7b0JBQ0YsYUFBYSxHQUFHLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzVDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxhQUFhLEdBQUcsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2hELENBQUM7Z0JBQ0QsYUFBYSxHQUFHLGFBQWEsR0FBRyxDQUFDLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLHFCQUFxQixDQUFBO2dCQUV4Riw0RUFBNEU7Z0JBQzVFLE1BQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFBO2dCQUV2Qyx3RkFBd0Y7Z0JBQ3hGLHFDQUFxQztnQkFDckMsT0FDQyxhQUFhLEdBQUcsV0FBVztvQkFDM0IsYUFBYSxHQUFHLFdBQVc7b0JBQzNCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsRUFDMUQsQ0FBQztvQkFDRixhQUFhLEVBQUUsQ0FBQTtvQkFDZixhQUFhLEVBQUUsQ0FBQTtnQkFDaEIsQ0FBQztnQkFDRCxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsYUFBYSxDQUFBO2dCQUV2QyxJQUFJLGFBQWEsR0FBRyxhQUFhLEdBQUcscUJBQXFCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztvQkFDbkYscUJBQXFCLEdBQUcsYUFBYSxDQUFBO29CQUNyQyxxQkFBcUIsR0FBRyxhQUFhLENBQUE7Z0JBQ3RDLENBQUM7Z0JBRUQsK0VBQStFO2dCQUMvRSxrRkFBa0Y7Z0JBQ2xGLHlGQUF5RjtnQkFDekYsMEJBQTBCO2dCQUMxQixJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLG1CQUFtQixDQUFDLElBQUksY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNwRixJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzt3QkFDOUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQTt3QkFDakMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQTt3QkFFakMsSUFDQyxpQkFBaUIsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDOzRCQUM1QyxrREFBdUMsQ0FBQzs0QkFDeEMsY0FBYyxJQUFJLGtEQUF1QyxDQUFDLEVBQ3pELENBQUM7NEJBQ0YsOERBQThEOzRCQUM5RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixxQkFBcUIsRUFDckIsYUFBYSxFQUNiLGFBQWEsRUFDYixhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxXQUFXLEVBQ1gsWUFBWSxDQUNaLENBQUE7d0JBQ0YsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLDJFQUEyRTs0QkFDM0Usa0NBQWtDOzRCQUNsQyxPQUFPLElBQUksQ0FBQTt3QkFDWixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCx1RkFBdUY7WUFDdkYsTUFBTSxvQkFBb0IsR0FDekIsQ0FBQyxxQkFBcUI7Z0JBQ3JCLGFBQWE7Z0JBQ2IsQ0FBQyxxQkFBcUIsR0FBRyxhQUFhLENBQUM7Z0JBQ3ZDLGNBQWMsQ0FBQztnQkFDaEIsQ0FBQyxDQUFBO1lBRUYsSUFDQyxJQUFJLENBQUMsMkJBQTJCLEtBQUssSUFBSTtnQkFDekMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsRUFDN0UsQ0FBQztnQkFDRiwyRUFBMkU7Z0JBQzNFLFlBQVksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7Z0JBRXRCLDZEQUE2RDtnQkFDN0QsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLHFCQUFxQixDQUFBO2dCQUN6QyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcscUJBQXFCLENBQUE7Z0JBRXpDLElBQ0Msb0JBQW9CLEdBQUcsQ0FBQztvQkFDeEIsa0RBQXVDLENBQUM7b0JBQ3hDLGNBQWMsSUFBSSxrREFBdUMsQ0FBQyxFQUN6RCxDQUFDO29CQUNGLDBEQUEwRDtvQkFDMUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUNwQixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLGFBQWEsRUFDYixhQUFhLEVBQ2IsYUFBYSxFQUNiLFdBQVcsRUFDWCxjQUFjLEVBQ2QsYUFBYSxFQUNiLFdBQVcsRUFDWCxjQUFjLEVBQ2QsV0FBVyxFQUNYLFlBQVksQ0FDWixDQUFBO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxxREFBcUQ7b0JBRXJELGtHQUFrRztvQkFDbEcsaUdBQWlHO29CQUNqRyxhQUFhLEVBQUUsQ0FBQTtvQkFDZixhQUFhLEVBQUUsQ0FBQTtvQkFFZixPQUFPO3dCQUNOLElBQUksVUFBVSxDQUNiLGFBQWEsRUFDYixXQUFXLEdBQUcsYUFBYSxHQUFHLENBQUMsRUFDL0IsYUFBYSxFQUNiLFdBQVcsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUMvQjtxQkFDRCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsNkNBQTZDO1lBQzdDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FDNUMsbUJBQW1CLEdBQUcsY0FBYyxFQUNwQyxjQUFjLEVBQ2QsbUJBQW1CLEVBQ25CLFlBQVksQ0FDWixDQUFBO1lBQ0Qsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUMxQyxtQkFBbUIsR0FBRyxjQUFjLEVBQ3BDLGNBQWMsRUFDZCxtQkFBbUIsRUFDbkIsWUFBWSxDQUNaLENBQUE7WUFDRCxLQUFLLElBQUksUUFBUSxHQUFHLG9CQUFvQixFQUFFLFFBQVEsSUFBSSxrQkFBa0IsRUFBRSxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3pGLHdFQUF3RTtnQkFDeEUsOEVBQThFO2dCQUM5RSxrRUFBa0U7Z0JBQ2xFLElBQ0MsUUFBUSxLQUFLLG9CQUFvQjtvQkFDakMsQ0FBQyxRQUFRLEdBQUcsa0JBQWtCO3dCQUM3QixhQUFhLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFDM0QsQ0FBQztvQkFDRixhQUFhLEdBQUcsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ2hELENBQUM7cUJBQU0sQ0FBQztvQkFDUCxhQUFhLEdBQUcsYUFBYSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQztnQkFDRCxhQUFhLEdBQUcsYUFBYSxHQUFHLENBQUMsUUFBUSxHQUFHLG1CQUFtQixDQUFDLEdBQUcscUJBQXFCLENBQUE7Z0JBRXhGLGtFQUFrRTtnQkFDbEUsTUFBTSxpQkFBaUIsR0FBRyxhQUFhLENBQUE7Z0JBRXZDLHdGQUF3RjtnQkFDeEYscUNBQXFDO2dCQUNyQyxPQUNDLGFBQWEsR0FBRyxhQUFhO29CQUM3QixhQUFhLEdBQUcsYUFBYTtvQkFDN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsRUFDbEQsQ0FBQztvQkFDRixhQUFhLEVBQUUsQ0FBQTtvQkFDZixhQUFhLEVBQUUsQ0FBQTtnQkFDaEIsQ0FBQztnQkFDRCxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsYUFBYSxDQUFBO2dCQUV2QyxpRkFBaUY7Z0JBQ2pGLGdGQUFnRjtnQkFDaEYsMEJBQTBCO2dCQUMxQixJQUFJLFdBQVcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO29CQUMvRSxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzt3QkFDOUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQTt3QkFDakMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQWEsQ0FBQTt3QkFFakMsSUFDQyxpQkFBaUIsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDOzRCQUM1QyxrREFBdUMsQ0FBQzs0QkFDeEMsY0FBYyxJQUFJLGtEQUF1QyxDQUFDLEVBQ3pELENBQUM7NEJBQ0YsOERBQThEOzRCQUM5RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQ3BCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixxQkFBcUIsRUFDckIsYUFBYSxFQUNiLGFBQWEsRUFDYixhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxXQUFXLEVBQ1gsWUFBWSxDQUNaLENBQUE7d0JBQ0YsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLDJFQUEyRTs0QkFDM0Usa0NBQWtDOzRCQUNsQyxPQUFPLElBQUksQ0FBQTt3QkFDWixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCw0REFBNEQ7WUFDNUQsSUFBSSxjQUFjLG1EQUF3QyxFQUFFLENBQUM7Z0JBQzVELGdFQUFnRTtnQkFDaEUsdUNBQXVDO2dCQUN2QyxJQUFJLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxrQkFBa0IsR0FBRyxvQkFBb0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDeEUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLG1CQUFtQixHQUFHLG9CQUFvQixHQUFHLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxDQUFDLEtBQUssQ0FDWixhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLElBQUksRUFDSixDQUFDLEVBQ0Qsa0JBQWtCLEdBQUcsb0JBQW9CLEdBQUcsQ0FBQyxDQUM3QyxDQUFBO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBRWhDLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxrQkFBa0IsR0FBRyxvQkFBb0IsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDcEUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLG1CQUFtQixHQUFHLG9CQUFvQixHQUFHLENBQUMsQ0FBQTtnQkFDeEQsT0FBTyxDQUFDLEtBQUssQ0FDWixhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLElBQUksRUFDSixDQUFDLEVBQ0Qsa0JBQWtCLEdBQUcsb0JBQW9CLEdBQUcsQ0FBQyxDQUM3QyxDQUFBO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUM7UUFFRCxzR0FBc0c7UUFDdEcsaUNBQWlDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FDcEIsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsa0JBQWtCLEVBQ2xCLHFCQUFxQixFQUNyQixhQUFhLEVBQ2IsYUFBYSxFQUNiLGFBQWEsRUFDYixXQUFXLEVBQ1gsY0FBYyxFQUNkLGFBQWEsRUFDYixXQUFXLEVBQ1gsY0FBYyxFQUNkLFdBQVcsRUFDWCxZQUFZLENBQ1osQ0FBQTtJQUNGLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ssZUFBZSxDQUFDLE9BQXFCO1FBQzVDLG1DQUFtQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QixNQUFNLFlBQVksR0FDakIsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQTtZQUM1RixNQUFNLFlBQVksR0FDakIsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQTtZQUM1RixNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQTtZQUMvQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQTtZQUUvQyxPQUNDLE1BQU0sQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsR0FBRyxZQUFZO2dCQUMzRCxNQUFNLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEdBQUcsWUFBWTtnQkFDM0QsQ0FBQyxDQUFDLGFBQWE7b0JBQ2QsSUFBSSxDQUFDLHdCQUF3QixDQUM1QixNQUFNLENBQUMsYUFBYSxFQUNwQixNQUFNLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQzVDLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLGFBQWE7b0JBQ2QsSUFBSSxDQUFDLHdCQUF3QixDQUM1QixNQUFNLENBQUMsYUFBYSxFQUNwQixNQUFNLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQzVDLENBQUMsRUFDRixDQUFDO2dCQUNGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUNuRCxNQUFNLENBQUMsYUFBYSxFQUNwQixNQUFNLENBQUMsYUFBYSxDQUNwQixDQUFBO2dCQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FDakQsTUFBTSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxFQUM1QyxNQUFNLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQzVDLENBQUE7Z0JBQ0QsSUFBSSxjQUFjLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO29CQUN6Qyw2RkFBNkY7b0JBQzdGLE1BQUs7Z0JBQ04sQ0FBQztnQkFDRCxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7Z0JBQ3RCLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQTZCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDeEQsSUFDQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUN0QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxFQUMvRCxDQUFDO2dCQUNGLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFFLENBQUE7Z0JBQ2hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDeEIsQ0FBQyxFQUFFLENBQUE7Z0JBQ0gsU0FBUTtZQUNULENBQUM7UUFDRixDQUFDO1FBRUQsb0VBQW9FO1FBQ3BFLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV6QixJQUFJLFlBQVksR0FBRyxDQUFDLENBQUE7WUFDcEIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFBO1lBQ3BCLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNYLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pDLFlBQVksR0FBRyxVQUFVLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUE7Z0JBQ25FLFlBQVksR0FBRyxVQUFVLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUE7WUFDcEUsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFBO1lBRS9DLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtZQUNqQixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUNsQyxNQUFNLENBQUMsYUFBYSxFQUNwQixNQUFNLENBQUMsY0FBYyxFQUNyQixNQUFNLENBQUMsYUFBYSxFQUNwQixNQUFNLENBQUMsY0FBYyxDQUNyQixDQUFBO1lBRUQsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7Z0JBQ2xELE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFBO2dCQUVsRCxJQUFJLGFBQWEsR0FBRyxZQUFZLElBQUksYUFBYSxHQUFHLFlBQVksRUFBRSxDQUFDO29CQUNsRSxNQUFLO2dCQUNOLENBQUM7Z0JBRUQsSUFDQyxhQUFhO29CQUNiLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGFBQWEsRUFBRSxhQUFhLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUNuRixDQUFDO29CQUNGLE1BQUs7Z0JBQ04sQ0FBQztnQkFFRCxJQUNDLGFBQWE7b0JBQ2IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsYUFBYSxFQUFFLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQ25GLENBQUM7b0JBQ0YsTUFBSztnQkFDTixDQUFDO2dCQUVELE1BQU0sc0JBQXNCLEdBQzNCLGFBQWEsS0FBSyxZQUFZLElBQUksYUFBYSxLQUFLLFlBQVksQ0FBQTtnQkFDakUsTUFBTSxLQUFLLEdBQ1YsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxjQUFjLENBQ2xCLGFBQWEsRUFDYixNQUFNLENBQUMsY0FBYyxFQUNyQixhQUFhLEVBQ2IsTUFBTSxDQUFDLGNBQWMsQ0FDckIsQ0FBQTtnQkFFRixJQUFJLEtBQUssR0FBRyxTQUFTLEVBQUUsQ0FBQztvQkFDdkIsU0FBUyxHQUFHLEtBQUssQ0FBQTtvQkFDakIsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFDbEIsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQTtZQUNqQyxNQUFNLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQTtZQUVqQyxNQUFNLGVBQWUsR0FBNkIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN4RCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUMvRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUUsQ0FBQTtnQkFDcEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3BCLENBQUMsRUFBRSxDQUFBO2dCQUNILFNBQVE7WUFDVCxDQUFDO1FBQ0YsQ0FBQztRQUVELHFEQUFxRDtRQUNyRCxzREFBc0Q7UUFDdEQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNwRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO2dCQUM5QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzFCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFBO2dCQUM1RixNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFBO2dCQUM1QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUE7Z0JBQ25FLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxHQUFHLGNBQWMsQ0FBQTtnQkFDdEQsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQTtnQkFDNUMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFBO2dCQUNuRSxNQUFNLGdCQUFnQixHQUFHLFlBQVksR0FBRyxjQUFjLENBQUE7Z0JBQ3RELGtEQUFrRDtnQkFDbEQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixHQUFHLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFLEVBQUUsQ0FBQztvQkFDekUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUMzQyxjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsYUFBYSxDQUNiLENBQUE7b0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDUCxNQUFNLENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ2xELElBQ0Msa0JBQWtCLEtBQUssT0FBTyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsY0FBYzs0QkFDckUsa0JBQWtCLEtBQUssT0FBTyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsY0FBYyxFQUNwRSxDQUFDOzRCQUNGLHFEQUFxRDs0QkFDckQsT0FBTyxDQUFDLGNBQWMsR0FBRyxrQkFBa0IsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFBOzRCQUNuRSxPQUFPLENBQUMsY0FBYyxHQUFHLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUE7NEJBQ25FLE9BQU8sQ0FBQyxhQUFhLEdBQUcsa0JBQWtCLEdBQUcsYUFBYSxDQUFBOzRCQUMxRCxPQUFPLENBQUMsYUFBYSxHQUFHLGtCQUFrQixHQUFHLGFBQWEsQ0FBQTs0QkFDMUQsT0FBTyxDQUFDLGNBQWMsR0FBRyxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQTs0QkFDN0QsT0FBTyxDQUFDLGNBQWMsR0FBRyxZQUFZLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQTt3QkFDOUQsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVPLDZCQUE2QixDQUNwQyxhQUFxQixFQUNyQixjQUFzQixFQUN0QixhQUFxQixFQUNyQixjQUFzQixFQUN0QixhQUFxQjtRQUVyQixJQUFJLGNBQWMsR0FBRyxhQUFhLElBQUksY0FBYyxHQUFHLGFBQWEsRUFBRSxDQUFDO1lBQ3RFLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFHLGFBQWEsR0FBRyxjQUFjLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUN0RSxNQUFNLFdBQVcsR0FBRyxhQUFhLEdBQUcsY0FBYyxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDdEUsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsYUFBYSxFQUFFLENBQUMsR0FBRyxXQUFXLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsRCxLQUFLLElBQUksQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNoRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUNwQyxTQUFTLEdBQUcsS0FBSyxDQUFBO29CQUNqQixpQkFBaUIsR0FBRyxDQUFDLENBQUE7b0JBQ3JCLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtnQkFDdEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVPLHdCQUF3QixDQUMvQixhQUFxQixFQUNyQixhQUFxQixFQUNyQixNQUFjO1FBRWQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxHQUFHLENBQUMsRUFBRSxhQUFhLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbEUsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDO1lBQ0QsS0FBSyxJQUFJLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQ2hFLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxLQUFhO1FBQ3hDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRU8seUJBQXlCLENBQUMsYUFBcUIsRUFBRSxjQUFzQjtRQUM5RSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDNUYsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxjQUFjLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsYUFBYSxHQUFHLGNBQWMsQ0FBQTtZQUNsRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxLQUFhO1FBQ3hDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxXQUFXLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0lBRU8seUJBQXlCLENBQUMsYUFBcUIsRUFBRSxjQUFzQjtRQUM5RSxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDNUYsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxjQUFjLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEIsTUFBTSxXQUFXLEdBQUcsYUFBYSxHQUFHLGNBQWMsQ0FBQTtZQUNsRCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hGLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxjQUFjLENBQ3JCLGFBQXFCLEVBQ3JCLGNBQXNCLEVBQ3RCLGFBQXFCLEVBQ3JCLGNBQXNCO1FBRXRCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNGLE9BQU8sYUFBYSxHQUFHLGFBQWEsQ0FBQTtJQUNyQyxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0ssa0JBQWtCLENBQUMsSUFBa0IsRUFBRSxLQUFtQjtRQUNqRSxNQUFNLGVBQWUsR0FBaUIsRUFBRSxDQUFBO1FBRXhDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtRQUN2QyxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ2xGLHNFQUFzRTtZQUN0RSxvRUFBb0U7WUFDcEUscUVBQXFFO1lBQ3JFLHdCQUF3QjtZQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBYSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDcEUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFFN0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sTUFBTSxHQUFHLElBQUksS0FBSyxDQUFhLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM3QyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXpELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ssY0FBYyxDQUNyQixJQUFnQixFQUNoQixLQUFpQixFQUNqQixlQUF5QztRQUV6QyxLQUFLLENBQUMsTUFBTSxDQUNYLElBQUksQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLGFBQWEsRUFDekMsdURBQXVELENBQ3ZELENBQUE7UUFDRCxLQUFLLENBQUMsTUFBTSxDQUNYLElBQUksQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLGFBQWEsRUFDekMsdURBQXVELENBQ3ZELENBQUE7UUFFRCxJQUNDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsSUFBSSxLQUFLLENBQUMsYUFBYTtZQUMvRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLGFBQWEsRUFDOUQsQ0FBQztZQUNGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUE7WUFDeEMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtZQUN4QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO1lBQ3hDLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUE7WUFFeEMsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLElBQUksS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyRSxjQUFjLEdBQUcsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUE7WUFDakYsQ0FBQztZQUNELElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDckUsY0FBYyxHQUFHLEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFBO1lBQ2pGLENBQUM7WUFFRCxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxVQUFVLENBQ2xDLGFBQWEsRUFDYixjQUFjLEVBQ2QsYUFBYSxFQUNiLGNBQWMsQ0FDZCxDQUFBO1lBQ0QsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO2FBQU0sQ0FBQztZQUNQLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUE7WUFDekIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0ssaUJBQWlCLENBQ3hCLFFBQWdCLEVBQ2hCLGNBQXNCLEVBQ3RCLGlCQUF5QixFQUN6QixZQUFvQjtRQUVwQixJQUFJLFFBQVEsSUFBSSxDQUFDLElBQUksUUFBUSxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzlDLGdDQUFnQztZQUNoQyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBRUQsdUVBQXVFO1FBQ3ZFLHVFQUF1RTtRQUN2RSxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQTtRQUN4QyxNQUFNLGNBQWMsR0FBRyxZQUFZLEdBQUcsaUJBQWlCLEdBQUcsQ0FBQyxDQUFBO1FBQzNELE1BQU0sUUFBUSxHQUFHLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRXpDLElBQUksUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xCLE1BQU0sY0FBYyxHQUFHLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLE9BQU8sUUFBUSxLQUFLLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0MsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLGNBQWMsR0FBRyxjQUFjLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQyxPQUFPLFFBQVEsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDekUsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUV6RDs7Ozs7R0FLRztBQUNILE1BQU0seUNBQXlDLEdBQUcsQ0FDakQsV0FBbUIsRUFDbkIsWUFBb0IsRUFDWCxFQUFFO0lBQ1gsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO0lBQzVDLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtJQUM5QyxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUNoRCxJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQTtJQUN2QixJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUE7SUFDdEIsSUFBSSxRQUFRLEdBQUcsaUJBQWlCLENBQUE7SUFDaEMsSUFBSSxLQUFLLEdBQUcsaUJBQWlCLENBQUE7SUFFN0Isc0RBQXNEO0lBQ3RELE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUNoQix3QkFBd0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQTtJQUN0RSxDQUFDO0lBRUQseUNBQXlDO0lBQ3pDLEtBQUssS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUNyRCxJQUFJLFlBQVksR0FBRyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSxjQUFjLEdBQUcsWUFBWSxHQUFHLGNBQWMsQ0FBQTtRQUNwRCxZQUFZLElBQUksQ0FBQyxDQUFDLFlBQVksR0FBRyxjQUFjLENBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxjQUFjLENBQUE7UUFDbkYsY0FBYyxJQUFJLENBQUMsQ0FBQyxZQUFZLEdBQUcsY0FBYyxDQUFDLENBQUE7UUFDbEQsY0FBYyxJQUFJLFlBQVksQ0FBQTtRQUM5QixJQUFJLGNBQWMsR0FBRyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxRQUFRLEVBQUUsQ0FBQTtRQUNYLENBQUM7UUFDRCxJQUFJLGNBQWMsR0FBRyxXQUFXLEVBQUUsQ0FBQztZQUNsQyxRQUFRLEVBQUUsQ0FBQTtRQUNYLENBQUM7UUFDRCxjQUFjLEdBQUcsQ0FBQyxjQUFjLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzFDLGNBQWMsR0FBRyxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxDQUFBO1FBQzNFLGNBQWMsSUFBSSxjQUFjLENBQUE7SUFDakMsQ0FBQztJQUVELGlDQUFpQztJQUNqQyxLQUFLLEdBQUcsaUJBQWlCLENBQUE7SUFDekIsT0FBTyxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ2hCLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVELE9BQU8sUUFBUSxDQUFBO0FBQ2hCLENBQUMsQ0FBQTtBQUVEOzs7OztHQUtHO0FBQ0gsU0FBUyx3Q0FBd0MsQ0FDaEQsV0FBbUIsRUFDbkIsWUFBb0I7SUFFcEIsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFBO0lBQzVDLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQTtJQUM5QyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtJQUM3QixNQUFNLGdCQUFnQixHQUFHLEVBQUUsQ0FBQTtJQUMzQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEVBQUUsQ0FBQyxDQUFBO0lBQ3hELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsRUFBRSxDQUFDLENBQUE7SUFFdkQsZ0RBQWdEO0lBQ2hELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6QyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMxQixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVELElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtJQUNyQixPQUFPLGFBQWEsR0FBRyxZQUFZLEdBQUcsQ0FBQyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7UUFDMUQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLE1BQU0sS0FBSyxHQUFHLGFBQWEsR0FBRyxFQUFFLENBQUE7UUFDaEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxLQUFLLENBQUE7UUFFL0QsdURBQXVEO1FBQ3ZELEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsR0FBRyxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3Qyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzVDLE1BQU0sWUFBWSxHQUFHLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN4RSxNQUFNLFdBQVcsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoRSxNQUFNLFFBQVEsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzRCxNQUFNLGNBQWMsR0FBRyxZQUFZLEdBQUcsY0FBYyxDQUFBO1lBQ3BELE1BQU0sd0JBQXdCLEdBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxHQUFHLGNBQWMsQ0FBQztnQkFDbEYsWUFBWTtnQkFDWixRQUFRLENBQUE7WUFDVCxJQUFJLHdCQUF3QixHQUFHLGNBQWMsR0FBRyxDQUFDLENBQUMsd0JBQXdCLEdBQUcsY0FBYyxDQUFDLENBQUE7WUFDNUYsSUFBSSx3QkFBd0IsR0FBRyxjQUFjLEdBQUcsd0JBQXdCLENBQUE7WUFDeEUsSUFBSSxDQUFDLHdCQUF3QixLQUFLLEVBQUUsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDO2dCQUNyRCxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzNDLENBQUM7WUFDRCxJQUFJLENBQUMsd0JBQXdCLEtBQUssRUFBRSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUM7Z0JBQ2xELGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDekMsQ0FBQztZQUNELHdCQUF3QixHQUFHLENBQUMsd0JBQXdCLElBQUksQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFBO1lBQ3hFLHdCQUF3QixHQUFHLENBQUMsd0JBQXdCLElBQUksQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFBO1lBQ3JFLGNBQWMsR0FBRyx3QkFBd0IsR0FBRyxDQUFDLENBQUMsY0FBYyxHQUFHLHdCQUF3QixDQUFDLENBQUE7WUFDeEYsY0FBYyxHQUFHLHdCQUF3QixHQUFHLGNBQWMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsaUNBQWlDO1FBQ2pDLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsR0FBRyxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3Qyx3QkFBd0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ3ZCLE1BQU0sS0FBSyxHQUFHLGFBQWEsR0FBRyxFQUFFLENBQUE7SUFDaEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsa0JBQWtCLEdBQUcsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFBO0lBRXZFLHVEQUF1RDtJQUN2RCxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsY0FBYyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0Msd0JBQXdCLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVELElBQUksUUFBUSxHQUFHLGtCQUFrQixDQUFBO0lBRWpDLHdDQUF3QztJQUN4QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM1QyxNQUFNLFlBQVksR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDM0QsTUFBTSxjQUFjLEdBQUcsWUFBWSxHQUFHLGNBQWMsQ0FBQTtRQUNwRCxNQUFNLHdCQUF3QixHQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxjQUFjLENBQUMsR0FBRyxjQUFjLENBQUM7WUFDbEYsWUFBWTtZQUNaLFFBQVEsQ0FBQTtRQUNULElBQUksd0JBQXdCLEdBQUcsY0FBYyxHQUFHLENBQUMsQ0FBQyx3QkFBd0IsR0FBRyxjQUFjLENBQUMsQ0FBQTtRQUM1RixJQUFJLHdCQUF3QixHQUFHLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQTtRQUN4RSxRQUFRLElBQUksQ0FBQyx3QkFBd0IsS0FBSyxDQUFDLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZFLFFBQVEsSUFBSSxDQUFDLHdCQUF3QixLQUFLLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkUsSUFBSSxDQUFDLHdCQUF3QixLQUFLLEVBQUUsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDO1lBQ3JELGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0MsQ0FBQztRQUNELElBQUksQ0FBQyx3QkFBd0IsS0FBSyxFQUFFLENBQUMsR0FBRyxRQUFRLEVBQUUsQ0FBQztZQUNsRCxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFDRCx3QkFBd0IsR0FBRyxDQUFDLHdCQUF3QixJQUFJLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQTtRQUN4RSx3QkFBd0IsR0FBRyxDQUFDLHdCQUF3QixJQUFJLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQTtRQUNyRSxjQUFjLEdBQUcsd0JBQXdCLEdBQUcsQ0FBQyxDQUFDLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQyxDQUFBO1FBQ3hGLGNBQWMsR0FBRyx3QkFBd0IsR0FBRyxjQUFjLENBQUE7SUFDM0QsQ0FBQztJQUVELGlDQUFpQztJQUNqQyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEdBQUcsY0FBYyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0Msd0JBQXdCLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUE7QUFDaEIsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLDBCQUEwQixDQUFDLFdBQW1CLEVBQUUsWUFBb0I7SUFDbkYsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUM5QyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUE7UUFDekIsWUFBWSxHQUFHLFdBQVcsQ0FBQTtRQUMxQixXQUFXLEdBQUcsSUFBSSxDQUFBO0lBQ25CLENBQUM7SUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTyxXQUFXLENBQUMsTUFBTSxDQUFBO0lBQzFCLENBQUM7SUFDRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLElBQUksRUFBRSxFQUFFLENBQUM7UUFDOUIsT0FBTyx5Q0FBeUMsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUNELE9BQU8sd0NBQXdDLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFBO0FBQzNFLENBQUMifQ==