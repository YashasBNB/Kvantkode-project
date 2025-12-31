/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { OffsetRange } from '../../../core/offsetRange.js';
import { DiffAlgorithmResult, InfiniteTimeout, SequenceDiff, } from './diffAlgorithm.js';
/**
 * An O(ND) diff algorithm that has a quadratic space worst-case complexity.
 */
export class MyersDiffAlgorithm {
    compute(seq1, seq2, timeout = InfiniteTimeout.instance) {
        // These are common special cases.
        // The early return improves performance dramatically.
        if (seq1.length === 0 || seq2.length === 0) {
            return DiffAlgorithmResult.trivial(seq1, seq2);
        }
        const seqX = seq1; // Text on the x axis
        const seqY = seq2; // Text on the y axis
        function getXAfterSnake(x, y) {
            while (x < seqX.length && y < seqY.length && seqX.getElement(x) === seqY.getElement(y)) {
                x++;
                y++;
            }
            return x;
        }
        let d = 0;
        // V[k]: X value of longest d-line that ends in diagonal k.
        // d-line: path from (0,0) to (x,y) that uses exactly d non-diagonals.
        // diagonal k: Set of points (x,y) with x-y = k.
        // k=1 -> (1,0),(2,1)
        const V = new FastInt32Array();
        V.set(0, getXAfterSnake(0, 0));
        const paths = new FastArrayNegativeIndices();
        paths.set(0, V.get(0) === 0 ? null : new SnakePath(null, 0, 0, V.get(0)));
        let k = 0;
        loop: while (true) {
            d++;
            if (!timeout.isValid()) {
                return DiffAlgorithmResult.trivialTimedOut(seqX, seqY);
            }
            // The paper has `for (k = -d; k <= d; k += 2)`, but we can ignore diagonals that cannot influence the result.
            const lowerBound = -Math.min(d, seqY.length + (d % 2));
            const upperBound = Math.min(d, seqX.length + (d % 2));
            for (k = lowerBound; k <= upperBound; k += 2) {
                let step = 0;
                // We can use the X values of (d-1)-lines to compute X value of the longest d-lines.
                const maxXofDLineTop = k === upperBound ? -1 : V.get(k + 1); // We take a vertical non-diagonal (add a symbol in seqX)
                const maxXofDLineLeft = k === lowerBound ? -1 : V.get(k - 1) + 1; // We take a horizontal non-diagonal (+1 x) (delete a symbol in seqX)
                step++;
                const x = Math.min(Math.max(maxXofDLineTop, maxXofDLineLeft), seqX.length);
                const y = x - k;
                step++;
                if (x > seqX.length || y > seqY.length) {
                    // This diagonal is irrelevant for the result.
                    // TODO: Don't pay the cost for this in the next iteration.
                    continue;
                }
                const newMaxX = getXAfterSnake(x, y);
                V.set(k, newMaxX);
                const lastPath = x === maxXofDLineTop ? paths.get(k + 1) : paths.get(k - 1);
                paths.set(k, newMaxX !== x ? new SnakePath(lastPath, x, y, newMaxX - x) : lastPath);
                if (V.get(k) === seqX.length && V.get(k) - k === seqY.length) {
                    break loop;
                }
            }
        }
        let path = paths.get(k);
        const result = [];
        let lastAligningPosS1 = seqX.length;
        let lastAligningPosS2 = seqY.length;
        while (true) {
            const endX = path ? path.x + path.length : 0;
            const endY = path ? path.y + path.length : 0;
            if (endX !== lastAligningPosS1 || endY !== lastAligningPosS2) {
                result.push(new SequenceDiff(new OffsetRange(endX, lastAligningPosS1), new OffsetRange(endY, lastAligningPosS2)));
            }
            if (!path) {
                break;
            }
            lastAligningPosS1 = path.x;
            lastAligningPosS2 = path.y;
            path = path.prev;
        }
        result.reverse();
        return new DiffAlgorithmResult(result, false);
    }
}
class SnakePath {
    constructor(prev, x, y, length) {
        this.prev = prev;
        this.x = x;
        this.y = y;
        this.length = length;
    }
}
/**
 * An array that supports fast negative indices.
 */
class FastInt32Array {
    constructor() {
        this.positiveArr = new Int32Array(10);
        this.negativeArr = new Int32Array(10);
    }
    get(idx) {
        if (idx < 0) {
            idx = -idx - 1;
            return this.negativeArr[idx];
        }
        else {
            return this.positiveArr[idx];
        }
    }
    set(idx, value) {
        if (idx < 0) {
            idx = -idx - 1;
            if (idx >= this.negativeArr.length) {
                const arr = this.negativeArr;
                this.negativeArr = new Int32Array(arr.length * 2);
                this.negativeArr.set(arr);
            }
            this.negativeArr[idx] = value;
        }
        else {
            if (idx >= this.positiveArr.length) {
                const arr = this.positiveArr;
                this.positiveArr = new Int32Array(arr.length * 2);
                this.positiveArr.set(arr);
            }
            this.positiveArr[idx] = value;
        }
    }
}
/**
 * An array that supports fast negative indices.
 */
class FastArrayNegativeIndices {
    constructor() {
        this.positiveArr = [];
        this.negativeArr = [];
    }
    get(idx) {
        if (idx < 0) {
            idx = -idx - 1;
            return this.negativeArr[idx];
        }
        else {
            return this.positiveArr[idx];
        }
    }
    set(idx, value) {
        if (idx < 0) {
            idx = -idx - 1;
            this.negativeArr[idx] = value;
        }
        else {
            this.positiveArr[idx] = value;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXllcnNEaWZmQWxnb3JpdGhtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9kaWZmL2RlZmF1bHRMaW5lc0RpZmZDb21wdXRlci9hbGdvcml0aG1zL215ZXJzRGlmZkFsZ29yaXRobS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUQsT0FBTyxFQUNOLG1CQUFtQixFQUluQixlQUFlLEVBQ2YsWUFBWSxHQUNaLE1BQU0sb0JBQW9CLENBQUE7QUFFM0I7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLE9BQU8sQ0FDTixJQUFlLEVBQ2YsSUFBZSxFQUNmLFVBQW9CLGVBQWUsQ0FBQyxRQUFRO1FBRTVDLGtDQUFrQztRQUNsQyxzREFBc0Q7UUFDdEQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sbUJBQW1CLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBLENBQUMscUJBQXFCO1FBQ3ZDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQSxDQUFDLHFCQUFxQjtRQUV2QyxTQUFTLGNBQWMsQ0FBQyxDQUFTLEVBQUUsQ0FBUztZQUMzQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4RixDQUFDLEVBQUUsQ0FBQTtnQkFD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