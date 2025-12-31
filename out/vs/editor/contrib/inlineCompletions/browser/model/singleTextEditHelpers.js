/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commonPrefixLength } from '../../../../../base/common/strings.js';
import { Range } from '../../../../common/core/range.js';
import { TextLength } from '../../../../common/core/textLength.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
export function singleTextRemoveCommonPrefix(edit, model, validModelRange) {
    const modelRange = validModelRange ? edit.range.intersectRanges(validModelRange) : edit.range;
    if (!modelRange) {
        return edit;
    }
    const normalizedText = edit.text.replaceAll('\r\n', '\n');
    const valueToReplace = model.getValueInRange(modelRange, 1 /* EndOfLinePreference.LF */);
    const commonPrefixLen = commonPrefixLength(valueToReplace, normalizedText);
    const start = TextLength.ofText(valueToReplace.substring(0, commonPrefixLen)).addToPosition(edit.range.getStartPosition());
    const text = normalizedText.substring(commonPrefixLen);
    const range = Range.fromPositions(start, edit.range.getEndPosition());
    return new SingleTextEdit(range, text);
}
export function singleTextEditAugments(edit, base) {
    // The augmented completion must replace the base range, but can replace even more
    return edit.text.startsWith(base.text) && rangeExtends(edit.range, base.range);
}
function rangeExtends(extendingRange, rangeToExtend) {
    return (rangeToExtend.getStartPosition().equals(extendingRange.getStartPosition()) &&
        rangeToExtend.getEndPosition().isBeforeOrEqual(extendingRange.getEndPosition()));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2luZ2xlVGV4dEVkaXRIZWxwZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9tb2RlbC9zaW5nbGVUZXh0RWRpdEhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHcEUsTUFBTSxVQUFVLDRCQUE0QixDQUMzQyxJQUFvQixFQUNwQixLQUFpQixFQUNqQixlQUF1QjtJQUV2QixNQUFNLFVBQVUsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQzdGLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDekQsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxVQUFVLGlDQUF5QixDQUFBO0lBQ2hGLE1BQU0sZUFBZSxHQUFHLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUMxRSxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUMxRixJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQzdCLENBQUE7SUFDRCxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ3RELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtJQUNyRSxPQUFPLElBQUksY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUN2QyxDQUFDO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLElBQW9CLEVBQUUsSUFBb0I7SUFDaEYsa0ZBQWtGO0lBQ2xGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUMvRSxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsY0FBcUIsRUFBRSxhQUFvQjtJQUNoRSxPQUFPLENBQ04sYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQzFFLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQy9FLENBQUE7QUFDRixDQUFDIn0=