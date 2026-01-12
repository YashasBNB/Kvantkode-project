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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVmb3JlRWRpdFBvc2l0aW9uTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9iZWZvcmVFZGl0UG9zaXRpb25NYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzlDLE9BQU8sRUFFTixTQUFTLEVBQ1QscUJBQXFCLEVBQ3JCLG1CQUFtQixFQUNuQixjQUFjLEVBQ2QsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixRQUFRLEdBQ1IsTUFBTSxhQUFhLENBQUE7QUFJcEIsTUFBTSxPQUFPLFlBQVk7SUFDakIsTUFBTSxDQUFDLHVCQUF1QixDQUFDLE9BQThCO1FBQ25FLG9DQUFvQztRQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPO2FBQ25CLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ1YsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakMsT0FBTyxJQUFJLFlBQVksQ0FDdEIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFDMUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQ3hDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ3RCLENBQUE7UUFDRixDQUFDLENBQUM7YUFDRCxPQUFPLEVBQUUsQ0FBQTtRQUNYLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELFlBQ2lCLFdBQW1CLEVBQ25CLFNBQWlCLEVBQ2pCLFNBQWlCO1FBRmpCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FB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