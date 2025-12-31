/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../../../core/offsetRange.js';
import { SequenceDiff, InfiniteTimeout, DiffAlgorithmResult, } from './diffAlgorithm.js';
import { Array2D } from '../utils.js';
/**
 * A O(MN) diffing algorithm that supports a score function.
 * The algorithm can be improved by processing the 2d array diagonally.
 */
export class DynamicProgrammingDiffing {
    compute(sequence1, sequence2, timeout = InfiniteTimeout.instance, equalityScore) {
        if (sequence1.length === 0 || sequence2.length === 0) {
            return DiffAlgorithmResult.trivial(sequence1, sequence2);
        }
        /**
         * lcsLengths.get(i, j): Length of the longest common subsequence of sequence1.substring(0, i + 1) and sequence2.substring(0, j + 1).
         */
        const lcsLengths = new Array2D(sequence1.length, sequence2.length);
        const directions = new Array2D(sequence1.length, sequence2.length);
        const lengths = new Array2D(sequence1.length, sequence2.length);
        // ==== Initializing lcsLengths ====
        for (let s1 = 0; s1 < sequence1.length; s1++) {
            for (let s2 = 0; s2 < sequence2.length; s2++) {
                if (!timeout.isValid()) {
                    return DiffAlgorithmResult.trivialTimedOut(sequence1, sequence2);
                }
                const horizontalLen = s1 === 0 ? 0 : lcsLengths.get(s1 - 1, s2);
                const verticalLen = s2 === 0 ? 0 : lcsLengths.get(s1, s2 - 1);
                let extendedSeqScore;
                if (sequence1.getElement(s1) === sequence2.getElement(s2)) {
                    if (s1 === 0 || s2 === 0) {
                        extendedSeqScore = 0;
                    }
                    else {
                        extendedSeqScore = lcsLengths.get(s1 - 1, s2 - 1);
                    }
                    if (s1 > 0 && s2 > 0 && directions.get(s1 - 1, s2 - 1) === 3) {
                        // Prefer consecutive diagonals
                        extendedSeqScore += lengths.get(s1 - 1, s2 - 1);
                    }
                    extendedSeqScore += equalityScore ? equalityScore(s1, s2) : 1;
                }
                else {
                    extendedSeqScore = -1;
                }
                const newValue = Math.max(horizontalLen, verticalLen, extendedSeqScore);
                if (newValue === extendedSeqScore) {
                    // Prefer diagonals
                    const prevLen = s1 > 0 && s2 > 0 ? lengths.get(s1 - 1, s2 - 1) : 0;
                    lengths.set(s1, s2, prevLen + 1);
                    directions.set(s1, s2, 3);
                }
                else if (newValue === horizontalLen) {
                    lengths.set(s1, s2, 0);
                    directions.set(s1, s2, 1);
                }
                else if (newValue === verticalLen) {
                    lengths.set(s1, s2, 0);
                    directions.set(s1, s2, 2);
                }
                lcsLengths.set(s1, s2, newValue);
            }
        }
        // ==== Backtracking ====
        const result = [];
        let lastAligningPosS1 = sequence1.length;
        let lastAligningPosS2 = sequence2.length;
        function reportDecreasingAligningPositions(s1, s2) {
            if (s1 + 1 !== lastAligningPosS1 || s2 + 1 !== lastAligningPosS2) {
                result.push(new SequenceDiff(new OffsetRange(s1 + 1, lastAligningPosS1), new OffsetRange(s2 + 1, lastAligningPosS2)));
            }
            lastAligningPosS1 = s1;
            lastAligningPosS2 = s2;
        }
        let s1 = sequence1.length - 1;
        let s2 = sequence2.length - 1;
        while (s1 >= 0 && s2 >= 0) {
            if (directions.get(s1, s2) === 3) {
                reportDecreasingAligningPositions(s1, s2);
                s1--;
                s2--;
            }
            else {
                if (directions.get(s1, s2) === 1) {
                    s1--;
                }
                else {
                    s2--;
                }
            }
        }
        reportDecreasingAligningPositions(-1, -1);
        result.reverse();
        return new DiffAlgorithmResult(result, false);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pY1Byb2dyYW1taW5nRGlmZmluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vZGlmZi9kZWZhdWx0TGluZXNEaWZmQ29tcHV0ZXIvYWxnb3JpdGhtcy9keW5hbWljUHJvZ3JhbW1pbmdEaWZmaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMxRCxPQUFPLEVBRU4sWUFBWSxFQUdaLGVBQWUsRUFDZixtQkFBbUIsR0FDbkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXJDOzs7R0FHRztBQUNILE1BQU0sT0FBTyx5QkFBeUI7SUFDckMsT0FBTyxDQUNOLFNBQW9CLEVBQ3BCLFNBQW9CLEVBQ3BCLFVBQW9CLGVBQWUsQ0FBQyxRQUFRLEVBQzVDLGFBQTREO1FBRTVELElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxPQUFPLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVEOztXQUVHO1FBQ0gsTUFBTSxVQUFVLEdBQUcsSUFBSSxPQUFPLENBQVMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxPQUFPLENBQVMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQVMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFD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