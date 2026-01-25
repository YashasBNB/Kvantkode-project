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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV0RSxPQUFPLEVBRU4sZUFBZSxFQUVmLE9BQU8sRUFDUCxXQUFXLEdBRVgsTUFBTSx1Q0FBdUMsQ0FBQTtBQU05QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQWtCLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNFLE1BQU0sS0FBSyxHQUF1QixFQUFFLENBQUE7QUFDcEMsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNpQixXQUFtQixFQUNuQixrQkFBMEI7UUFEMUIsZ0JBQVcsR0FBWCxXQUFXLENBQVE7UUFDbkIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBRTFDLElBQUksV0FBVyxHQUFHLGtCQUFrQixFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLGtCQUFrQixDQUMzQixlQUFlLFdBQVcsdUNBQXVDLGtCQUFrQixFQUFFLENBQ3JGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FB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