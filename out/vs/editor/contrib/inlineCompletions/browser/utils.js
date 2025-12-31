/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Permutation, compareBy } from '../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { observableValue, autorun, transaction, } from '../../../../base/common/observable.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Position } from '../../../common/core/position.js';
import { PositionOffsetTransformer } from '../../../common/core/positionToOffset.js';
import { Range } from '../../../common/core/range.js';
import { TextEdit } from '../../../common/core/textEdit.js';
const array = [];
export function getReadonlyEmptyArray() {
    return array;
}
export class ColumnRange {
    constructor(startColumn, endColumnExclusive) {
        this.startColumn = startColumn;
        this.endColumnExclusive = endColumnExclusive;
        if (startColumn > endColumnExclusive) {
            throw new BugIndicatingError(`startColumn ${startColumn} cannot be after endColumnExclusive ${endColumnExclusive}`);
        }
    }
    toRange(lineNumber) {
        return new Range(lineNumber, this.startColumn, lineNumber, this.endColumnExclusive);
    }
    equals(other) {
        return (this.startColumn === other.startColumn && this.endColumnExclusive === other.endColumnExclusive);
    }
}
export function addPositions(pos1, pos2) {
    return new Position(pos1.lineNumber + pos2.lineNumber - 1, pos2.lineNumber === 1 ? pos1.column + pos2.column - 1 : pos2.column);
}
export function subtractPositions(pos1, pos2) {
    return new Position(pos1.lineNumber - pos2.lineNumber + 1, pos1.lineNumber - pos2.lineNumber === 0 ? pos1.column - pos2.column + 1 : pos1.column);
}
export function substringPos(text, pos) {
    const transformer = new PositionOffsetTransformer(text);
    const offset = transformer.getOffset(pos);
    return text.substring(offset);
}
export function getEndPositionsAfterApplying(edits) {
    const newRanges = getModifiedRangesAfterApplying(edits);
    return newRanges.map((range) => range.getEndPosition());
}
export function getModifiedRangesAfterApplying(edits) {
    const sortPerm = Permutation.createSortPermutation(edits, compareBy((e) => e.range, Range.compareRangesUsingStarts));
    const edit = new TextEdit(sortPerm.apply(edits));
    const sortedNewRanges = edit.getNewRanges();
    return sortPerm.inverse().apply(sortedNewRanges);
}
export function convertItemsToStableObservables(items, store) {
    const result = observableValue('result', []);
    const innerObservables = [];
    store.add(autorun((reader) => {
        const itemsValue = items.read(reader);
        transaction((tx) => {
            if (itemsValue.length !== innerObservables.length) {
                innerObservables.length = itemsValue.length;
                for (let i = 0; i < innerObservables.length; i++) {
                    if (!innerObservables[i]) {
                        innerObservables[i] = observableValue('item', itemsValue[i]);
                    }
                }
                result.set([...innerObservables], tx);
            }
            innerObservables.forEach((o, i) => o.set(itemsValue[i], tx));
        });
    }));
    return result;
}
export class ObservableContextKeyService {
    constructor(_contextKeyService) {
        this._contextKeyService = _contextKeyService;
    }
    bind(key, obs) {
        return bindContextKey(key, this._contextKeyService, obs instanceof Function ? obs : (reader) => obs.read(reader));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdEUsT0FBTyxFQUVOLGVBQWUsRUFFZixPQUFPLEVBQ1AsV0FBVyxHQUVYLE1BQU0sdUNBQXVDLENBQUE7QUFNOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFrQixRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRSxNQUFNLEtBQUssR0FBdUIsRUFBRSxDQUFBO0FBQ3BDLE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsT0FBTyxLQUFLLENBQUE7QUFDYixDQUFDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFDdkIsWUFDaUIsV0FBbUIsRUFDbkIsa0JBQTBCO1FBRDFCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBUTtRQUUxQyxJQUFJLFdBQVcsR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxrQkFBa0IsQ0FDM0IsZUFBZSxXQUFXLHVDQUF1QyxrQkFBa0IsRUFBRSxDQUNyRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsVUFBa0I7UUFDekIsT0FBTyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUFrQjtRQUN4QixPQUFPLENBQ04sSUFBSSxDQUFDLFdBQVcsS0FBSyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxLQUFLLENBQUMsa0JBQWtCLENBQzlGLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLElBQWMsRUFBRSxJQUFjO0lBQzFELE9BQU8sSUFBSSxRQUFRLENBQ2xCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQ3JDLElBQUksQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUNuRSxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxJQUFjLEVBQUUsSUFBYztJQUMvRCxPQUFPLElBQUksUUFBUSxDQUNsQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUNyQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUNyRixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsSUFBWSxFQUFFLEdBQWE7SUFDdkQsTUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2RCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUM5QixDQUFDO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUFDLEtBQWdDO0lBQzVFLE1BQU0sU0FBUyxHQUFHLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZELE9BQU8sU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7QUFDeEQsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxLQUFnQztJQUM5RSxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMscUJBQXFCLENBQ2pELEtBQUssRUFDTCxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQ3pELENBQUE7SUFDRCxNQUFNLElBQUksR0FBRyxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDaEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQzNDLE9BQU8sUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtBQUNqRCxDQUFDO0FBRUQsTUFBTSxVQUFVLCtCQUErQixDQUM5QyxLQUFnQyxFQUNoQyxLQUFzQjtJQUV0QixNQUFNLE1BQU0sR0FBRyxlQUFlLENBQW1CLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM5RCxNQUFNLGdCQUFnQixHQUE2QixFQUFFLENBQUE7SUFFckQsS0FBSyxDQUFDLEdBQUcsQ0FDUixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUNsQixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXJDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ2xCLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkQsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUE7Z0JBQzNDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDbEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQzFCLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxHQUFHLGVBQWUsQ0FBSSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ2hFLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3RDLENBQUM7WUFDRCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELE1BQU0sT0FBTywyQkFBMkI7SUFDdkMsWUFBNkIsa0JBQXNDO1FBQXRDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7SUFBRyxDQUFDO0lBSXZFLElBQUksQ0FDSCxHQUFxQixFQUNyQixHQUE4QztRQUU5QyxPQUFPLGNBQWMsQ0FDcEIsR0FBRyxFQUNILElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsR0FBRyxZQUFZLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FDNUQsQ0FBQTtJQUNGLENBQUM7Q0FDRCJ9