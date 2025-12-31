/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../core/range.js';
import { lengthAdd, lengthDiffNonNegative, lengthLessThanEqual, lengthOfString, lengthToObj, positionToLength, toLength, } from './length.js';
export class TextEditInfo {
    static fromModelContentChanges(changes) {
        // Must be sorted in ascending order
        const edits = changes
            .map((c) => {
            const range = Range.lift(c.range);
            return new TextEditInfo(positionToLength(range.getStartPosition()), positionToLength(range.getEndPosition()), lengthOfString(c.text));
        })
            .reverse();
        return edits;
    }
    constructor(startOffset, endOffset, newLength) {
        this.startOffset = startOffset;
        this.endOffset = endOffset;
        this.newLength = newLength;
    }
    toString() {
        return `[${lengthToObj(this.startOffset)}...${lengthToObj(this.endOffset)}) -> ${lengthToObj(this.newLength)}`;
    }
}
export class BeforeEditPositionMapper {
    /**
     * @param edits Must be sorted by offset in ascending order.
     */
    constructor(edits) {
        this.nextEditIdx = 0;
        this.deltaOldToNewLineCount = 0;
        this.deltaOldToNewColumnCount = 0;
        this.deltaLineIdxInOld = -1;
        this.edits = edits.map((edit) => TextEditInfoCache.from(edit));
    }
    /**
     * @param offset Must be equal to or greater than the last offset this method has been called with.
     */
    getOffsetBeforeChange(offset) {
        this.adjustNextEdit(offset);
        return this.translateCurToOld(offset);
    }
    /**
     * @param offset Must be equal to or greater than the last offset this method has been called with.
     * Returns null if there is no edit anymore.
     */
    getDistanceToNextChange(offset) {
        this.adjustNextEdit(offset);
        const nextEdit = this.edits[this.nextEditIdx];
        const nextChangeOffset = nextEdit ? this.translateOldToCur(nextEdit.offsetObj) : null;
        if (nextChangeOffset === null) {
            return null;
        }
        return lengthDiffNonNegative(offset, nextChangeOffset);
    }
    translateOldToCur(oldOffsetObj) {
        if (oldOffsetObj.lineCount === this.deltaLineIdxInOld) {
            return toLength(oldOffsetObj.lineCount + this.deltaOldToNewLineCount, oldOffsetObj.columnCount + this.deltaOldToNewColumnCount);
        }
        else {
            return toLength(oldOffsetObj.lineCount + this.deltaOldToNewLineCount, oldOffsetObj.columnCount);
        }
    }
    translateCurToOld(newOffset) {
        const offsetObj = lengthToObj(newOffset);
        if (offsetObj.lineCount - this.deltaOldToNewLineCount === this.deltaLineIdxInOld) {
            return toLength(offsetObj.lineCount - this.deltaOldToNewLineCount, offsetObj.columnCount - this.deltaOldToNewColumnCount);
        }
        else {
            return toLength(offsetObj.lineCount - this.deltaOldToNewLineCount, offsetObj.columnCount);
        }
    }
    adjustNextEdit(offset) {
        while (this.nextEditIdx < this.edits.length) {
            const nextEdit = this.edits[this.nextEditIdx];
            // After applying the edit, what is its end offset (considering all previous edits)?
            const nextEditEndOffsetInCur = this.translateOldToCur(nextEdit.endOffsetAfterObj);
            if (lengthLessThanEqual(nextEditEndOffsetInCur, offset)) {
                // We are after the edit, skip it
                this.nextEditIdx++;
                const nextEditEndOffsetInCurObj = lengthToObj(nextEditEndOffsetInCur);
                // Before applying the edit, what is its end offset (considering all previous edits)?
                const nextEditEndOffsetBeforeInCurObj = lengthToObj(this.translateOldToCur(nextEdit.endOffsetBeforeObj));
                const lineDelta = nextEditEndOffsetInCurObj.lineCount - nextEditEndOffsetBeforeInCurObj.lineCount;
                this.deltaOldToNewLineCount += lineDelta;
                const previousColumnDelta = this.deltaLineIdxInOld === nextEdit.endOffsetBeforeObj.lineCount
                    ? this.deltaOldToNewColumnCount
                    : 0;
                const columnDelta = nextEditEndOffsetInCurObj.columnCount - nextEditEndOffsetBeforeInCurObj.columnCount;
                this.deltaOldToNewColumnCount = previousColumnDelta + columnDelta;
                this.deltaLineIdxInOld = nextEdit.endOffsetBeforeObj.lineCount;
            }
            else {
                // We are in or before the edit.
                break;
            }
        }
    }
}
class TextEditInfoCache {
    static from(edit) {
        return new TextEditInfoCache(edit.startOffset, edit.endOffset, edit.newLength);
    }
    constructor(startOffset, endOffset, textLength) {
        this.endOffsetBeforeObj = lengthToObj(endOffset);
        this.endOffsetAfterObj = lengthToObj(lengthAdd(startOffset, textLength));
        this.offsetObj = lengthToObj(startOffset);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC9icmFja2V0UGFpcnNUZXh0TW9kZWxQYXJ0L2JyYWNrZXRQYWlyc1RyZWUvYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5QyxPQUFPLEVBRU4sU0FBUyxFQUNULHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsY0FBYyxFQUNkLFdBQVcsRUFDWCxnQkFBZ0IsRUFDaEIsUUFBUSxHQUNSLE1BQU0sYUFBYSxDQUFBO0FBSXBCLE1BQU0sT0FBTyxZQUFZO0lBQ2pCLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxPQUE4QjtRQUNuRSxvQ0FBb0M7UUFDcEMsTUFBTSxLQUFLLEdBQUcsT0FBTzthQUNuQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNWLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pDLE9BQU8sSUFBSSxZQUFZLENBQ3RCLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEVBQzFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUN4QyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUN0QixDQUFBO1FBQ0YsQ0FBQyxDQUFDO2FBQ0QsT0FBTyxFQUFFLENBQUE7UUFDWCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxZQUNpQixXQUFtQixFQUNuQixTQUFpQixFQUNqQixTQUFpQjtRQUZqQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixj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