/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
import { OffsetEdit, SingleOffsetEdit } from '../core/offsetEdit.js';
import { OffsetRange } from '../core/offsetRange.js';
export class OffsetEdits {
    constructor() {
        // static utils only!
    }
    static asEditOperations(offsetEdit, doc) {
        const edits = [];
        for (const singleEdit of offsetEdit.edits) {
            const range = Range.fromPositions(doc.getPositionAt(singleEdit.replaceRange.start), doc.getPositionAt(singleEdit.replaceRange.start + singleEdit.replaceRange.length));
            edits.push(EditOperation.replace(range, singleEdit.newText));
        }
        return edits;
    }
    static fromContentChanges(contentChanges) {
        const editsArr = contentChanges.map((c) => new SingleOffsetEdit(OffsetRange.ofStartAndLength(c.rangeOffset, c.rangeLength), c.text));
        editsArr.reverse();
        const edits = new OffsetEdit(editsArr);
        return edits;
    }
    static fromLineRangeMapping(original, modified, changes) {
        const edits = [];
        for (const c of changes) {
            for (const i of c.innerChanges ?? []) {
                const newText = modified.getValueInRange(i.modifiedRange);
                const startOrig = original.getOffsetAt(i.originalRange.getStartPosition());
                const endExOrig = original.getOffsetAt(i.originalRange.getEndPosition());
                const origRange = new OffsetRange(startOrig, endExOrig);
                edits.push(new SingleOffsetEdit(origRange, newText));
            }
        }
        return new OffsetEdit(edits);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsT2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvdGV4dE1vZGVsT2Zmc2V0RWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3hDLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFLcEQsTUFBTSxPQUFnQixXQUFXO0lBQ2hDO1FBQ0MscUJBQXFCO0lBQ3RCLENBQUM7SUFFRCxNQUFNLENBQUMsZ0JBQWdCLENBQ3RCLFVBQXNCLEVBQ3RCLEdBQWU7UUFFZixNQUFNLEtBQUssR0FBcUMsRUFBRSxDQUFBO1FBQ2xELEtBQUssTUFBTSxVQUFVLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQ2hDLEdBQUcsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFDaEQsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUNqRixDQUFBO1lBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUM3RCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsTUFBTSxDQUFDLGtCQUFrQixDQUFDLGNBQThDO1FBQ3ZFLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQ2xDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxJQUFJLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ3pGLENBQUE7UUFDRCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEMsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsTUFBTSxDQUFDLG9CQUFvQixDQUMxQixRQUFvQixFQUNwQixRQUFvQixFQUNwQixPQUE0QztRQUU1QyxNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFBO1FBQ3BDLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7WUFDekIsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsWUFBWSxJQUFJLEVBQUUsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFFekQsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtnQkFDMUUsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7Z0JBQ3hFLE1BQU0sU0FBUyxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtnQkFFdkQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ3JELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QixDQUFDO0NBQ0QifQ==