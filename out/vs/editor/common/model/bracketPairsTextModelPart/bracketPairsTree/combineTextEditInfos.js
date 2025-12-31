/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ArrayQueue } from '../../../../../base/common/arrays.js';
import { TextEditInfo } from './beforeEditPositionMapper.js';
import { lengthAdd, lengthDiffNonNegative, lengthEquals, lengthIsZero, lengthToObj, lengthZero, sumLengths, } from './length.js';
export function combineTextEditInfos(textEditInfoFirst, textEditInfoSecond) {
    if (textEditInfoFirst.length === 0) {
        return textEditInfoSecond;
    }
    if (textEditInfoSecond.length === 0) {
        return textEditInfoFirst;
    }
    // s0: State before any edits
    const s0ToS1Map = new ArrayQueue(toLengthMapping(textEditInfoFirst));
    // s1: State after first edit, but before second edit
    const s1ToS2Map = toLengthMapping(textEditInfoSecond);
    s1ToS2Map.push({ modified: false, lengthBefore: undefined, lengthAfter: undefined }); // Copy everything from old to new
    // s2: State after both edits
    let curItem = s0ToS1Map.dequeue();
    /**
     * @param s1Length Use undefined for length "infinity"
     */
    function nextS0ToS1MapWithS1LengthOf(s1Length) {
        if (s1Length === undefined) {
            const arr = s0ToS1Map.takeWhile((v) => true) || [];
            if (curItem) {
                arr.unshift(curItem);
            }
            return arr;
        }
        const result = [];
        while (curItem && !lengthIsZero(s1Length)) {
            const [item, remainingItem] = curItem.splitAt(s1Length);
            result.push(item);
            s1Length = lengthDiffNonNegative(item.lengthAfter, s1Length);
            curItem = remainingItem ?? s0ToS1Map.dequeue();
        }
        if (!lengthIsZero(s1Length)) {
            result.push(new LengthMapping(false, s1Length, s1Length));
        }
        return result;
    }
    const result = [];
    function pushEdit(startOffset, endOffset, newLength) {
        if (result.length > 0 && lengthEquals(result[result.length - 1].endOffset, startOffset)) {
            const lastResult = result[result.length - 1];
            result[result.length - 1] = new TextEditInfo(lastResult.startOffset, endOffset, lengthAdd(lastResult.newLength, newLength));
        }
        else {
            result.push({ startOffset, endOffset, newLength });
        }
    }
    let s0offset = lengthZero;
    for (const s1ToS2 of s1ToS2Map) {
        const s0ToS1Map = nextS0ToS1MapWithS1LengthOf(s1ToS2.lengthBefore);
        if (s1ToS2.modified) {
            const s0Length = sumLengths(s0ToS1Map, (s) => s.lengthBefore);
            const s0EndOffset = lengthAdd(s0offset, s0Length);
            pushEdit(s0offset, s0EndOffset, s1ToS2.lengthAfter);
            s0offset = s0EndOffset;
        }
        else {
            for (const s1 of s0ToS1Map) {
                const s0startOffset = s0offset;
                s0offset = lengthAdd(s0offset, s1.lengthBefore);
                if (s1.modified) {
                    pushEdit(s0startOffset, s0offset, s1.lengthAfter);
                }
            }
        }
    }
    return result;
}
class LengthMapping {
    constructor(
    /**
     * If false, length before and length after equal.
     */
    modified, lengthBefore, lengthAfter) {
        this.modified = modified;
        this.lengthBefore = lengthBefore;
        this.lengthAfter = lengthAfter;
    }
    splitAt(lengthAfter) {
        const remainingLengthAfter = lengthDiffNonNegative(lengthAfter, this.lengthAfter);
        if (lengthEquals(remainingLengthAfter, lengthZero)) {
            return [this, undefined];
        }
        else if (this.modified) {
            return [
                new LengthMapping(this.modified, this.lengthBefore, lengthAfter),
                new LengthMapping(this.modified, lengthZero, remainingLengthAfter),
            ];
        }
        else {
            return [
                new LengthMapping(this.modified, lengthAfter, lengthAfter),
                new LengthMapping(this.modified, remainingLengthAfter, remainingLengthAfter),
            ];
        }
    }
    toString() {
        return `${this.modified ? 'M' : 'U'}:${lengthToObj(this.lengthBefore)} -> ${lengthToObj(this.lengthAfter)}`;
    }
}
function toLengthMapping(textEditInfos) {
    const result = [];
    let lastOffset = lengthZero;
    for (const textEditInfo of textEditInfos) {
        const spaceLength = lengthDiffNonNegative(lastOffset, textEditInfo.startOffset);
        if (!lengthIsZero(spaceLength)) {
            result.push(new LengthMapping(false, spaceLength, spaceLength));
        }
        const lengthBefore = lengthDiffNonNegative(textEditInfo.startOffset, textEditInfo.endOffset);
        result.push(new LengthMapping(true, lengthBefore, textEditInfo.newLength));
        lastOffset = textEditInfo.endOffset;
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tYmluZVRleHRFZGl0SW5mb3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL2JyYWNrZXRQYWlyc1RleHRNb2RlbFBhcnQvYnJhY2tldFBhaXJzVHJlZS9jb21iaW5lVGV4dEVkaXRJbmZvcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzVELE9BQU8sRUFFTixTQUFTLEVBQ1QscUJBQXFCLEVBQ3JCLFlBQVksRUFDWixZQUFZLEVBQ1osV0FBVyxFQUNYLFVBQVUsRUFDVixVQUFVLEdBQ1YsTUFBTSxhQUFhLENBQUE7QUFFcEIsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxpQkFBaUMsRUFDakMsa0JBQWtDO0lBRWxDLElBQUksaUJBQWlCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sa0JBQWtCLENBQUE7SUFDMUIsQ0FBQztJQUNELElBQUksa0JBQWtCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3JDLE9BQU8saUJBQWlCLENBQUE7SUFDekIsQ0FBQztJQUVELDZCQUE2QjtJQUM3QixNQUFNLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLHFEQUFxRDtJQUNyRCxNQUFNLFNBQVMsR0FBRyxlQUFlLENBQUMsa0JBQWtCLENBR2pELENBQUE7SUFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBLENBQUMsa0NB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