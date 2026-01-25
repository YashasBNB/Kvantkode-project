/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FloatHorizontalRange } from '../../view/renderingContext.js';
export class RangeUtil {
    static _createRange() {
        if (!this._handyReadyRange) {
            this._handyReadyRange = document.createRange();
        }
        return this._handyReadyRange;
    }
    static _detachRange(range, endNode) {
        // Move range out of the span node, IE doesn't like having many ranges in
        // the same spot and will act badly for lines containing dashes ('-')
        range.selectNodeContents(endNode);
    }
    static _readClientRects(startElement, startOffset, endElement, endOffset, endNode) {
        const range = this._createRange();
        try {
            range.setStart(startElement, startOffset);
            range.setEnd(endElement, endOffset);
            return range.getClientRects();
        }
        catch (e) {
            // This is life ...
            return null;
        }
        finally {
            this._detachRange(range, endNode);
        }
    }
    static _mergeAdjacentRanges(ranges) {
        if (ranges.length === 1) {
            // There is nothing to merge
            return ranges;
        }
        ranges.sort(FloatHorizontalRange.compare);
        const result = [];
        let resultLen = 0;
        let prev = ranges[0];
        for (let i = 1, len = ranges.length; i < len; i++) {
            const range = ranges[i];
            if (prev.left + prev.width + 0.9 /* account for browser's rounding errors*/ >= range.left) {
                prev.width = Math.max(prev.width, range.left + range.width - prev.left);
            }
            else {
                result[resultLen++] = prev;
                prev = range;
            }
        }
        result[resultLen++] = prev;
        return result;
    }
    static _createHorizontalRangesFromClientRects(clientRects, clientRectDeltaLeft, clientRectScale) {
        if (!clientRects || clientRects.length === 0) {
            return null;
        }
        // We go through FloatHorizontalRange because it has been observed in bi-di text
        // that the clientRects are not coming in sorted from the browser
        const result = [];
        for (let i = 0, len = clientRects.length; i < len; i++) {
            const clientRect = clientRects[i];
            result[i] = new FloatHorizontalRange(Math.max(0, (clientRect.left - clientRectDeltaLeft) / clientRectScale), clientRect.width / clientRectScale);
        }
        return this._mergeAdjacentRanges(result);
    }
    static readHorizontalRanges(domNode, startChildIndex, startOffset, endChildIndex, endOffset, context) {
        // Panic check
        const min = 0;
        const max = domNode.children.length - 1;
        if (min > max) {
            return null;
        }
        startChildIndex = Math.min(max, Math.max(min, startChildIndex));
        endChildIndex = Math.min(max, Math.max(min, endChildIndex));
        if (startChildIndex === endChildIndex &&
            startOffset === endOffset &&
            startOffset === 0 &&
            !domNode.children[startChildIndex].firstChild) {
            // We must find the position at the beginning of a <span>
            // To cover cases of empty <span>s, avoid using a range and use the <span>'s bounding box
            const clientRects = domNode.children[startChildIndex].getClientRects();
            context.markDidDomLayout();
            return this._createHorizontalRangesFromClientRects(clientRects, context.clientRectDeltaLeft, context.clientRectScale);
        }
        // If crossing over to a span only to select offset 0, then use the previous span's maximum offset
        // Chrome is buggy and doesn't handle 0 offsets well sometimes.
        if (startChildIndex !== endChildIndex) {
            if (endChildIndex > 0 && endOffset === 0) {
                endChildIndex--;
                endOffset = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            }
        }
        let startElement = domNode.children[startChildIndex].firstChild;
        let endElement = domNode.children[endChildIndex].firstChild;
        if (!startElement || !endElement) {
            // When having an empty <span> (without any text content), try to move to the previous <span>
            if (!startElement && startOffset === 0 && startChildIndex > 0) {
                startElement = domNode.children[startChildIndex - 1].firstChild;
                startOffset = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            }
            if (!endElement && endOffset === 0 && endChildIndex > 0) {
                endElement = domNode.children[endChildIndex - 1].firstChild;
                endOffset = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
            }
        }
        if (!startElement || !endElement) {
            return null;
        }
        startOffset = Math.min(startElement.textContent.length, Math.max(0, startOffset));
        endOffset = Math.min(endElement.textContent.length, Math.max(0, endOffset));
        const clientRects = this._readClientRects(startElement, startOffset, endElement, endOffset, context.endNode);
        context.markDidDomLayout();
        return this._createHorizontalRangesFromClientRects(clientRects, context.clientRectDeltaLeft, context.clientRectScale);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VVdGlsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvdmlld0xpbmVzL3JhbmdlVXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdyRSxNQUFNLE9BQU8sU0FBUztJQVFiLE1BQU0sQ0FBQyxZQUFZO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQy9DLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRU8sTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFZLEVBQUUsT0FBb0I7UUFDN0QseUVBQXlFO1FBQ3pFLHFFQUFxRTtRQUNyRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDOUIsWUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsVUFBZ0IsRUFDaEIsU0FBaUIsRUFDakIsT0FBb0I7UUFFcEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ2pDLElBQUksQ0FBQztZQUNKLEtBQUssQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBRW5DLE9BQU8sS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQzlCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osbUJBQW1CO1lBQ25CLE9BQU8s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