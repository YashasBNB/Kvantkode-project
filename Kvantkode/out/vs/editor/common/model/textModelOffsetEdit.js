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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsT2Zmc2V0RWRpdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90ZXh0TW9kZWxPZmZzZXRFZGl0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDeEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUtwRCxNQUFNLE9BQWdCLFdBQVc7SUFDaEM7UUFDQyxxQkFBcUI7SUFDdEIsQ0FBQztJQUVELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDdEIsVUFBc0IsRUFDdEIsR0FBZTtRQUVmLE1BQU0sS0FBSyxHQUFxQyxFQUFFLENBQUE7UUFDbEQsS0FBSyxNQUFNLFVBQVUsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDM0MsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FDaEMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxFQUNoRCxHQUFHLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQ2pGLENBQUE7WUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxNQUFNLENBQUMsa0JBQWtCLENBQUMsY0FBOEM7UUFDdkUsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FDbEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLElBQUksZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDekYsQ0FBQTtRQUNELFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQixNQUFNLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN0QyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxNQUFNLENBQUMsb0JBQW9CLENBQzFCLFFBQW9CLEVBQ3BCLFFBQW9CLEVBQ3BCLE9BQTRDO1FBRTVDLE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUE7UUFDcEMsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLElBQUksRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUV6RCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO2dCQUMxRSxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtnQkFDeEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUV2RCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDckQsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzdCLENBQUM7Q0FDRCJ9