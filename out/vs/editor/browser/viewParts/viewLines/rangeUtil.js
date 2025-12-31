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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZ2VVdGlsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdMaW5lcy9yYW5nZVV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHckUsTUFBTSxPQUFPLFNBQVM7SUFRYixNQUFNLENBQUMsWUFBWTtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVPLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBWSxFQUFFLE9BQW9CO1FBQzdELHlFQUF5RTtRQUN6RSxxRUFBcUU7UUFDckUsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFTyxNQUFNLENBQUMsZ0JBQWdCLENBQzlCLFlBQWtCLEVBQ2xCLFdBQW1CLEVBQ25CLFVBQWdCLEVBQ2hCLFNBQWlCLEVBQ2pCLE9BQW9CO1FBRXBCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUM7WUFDSixLQUFLLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUN6QyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUVuQyxPQUFPLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUM5QixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLG1CQUFtQjtZQUNuQixPQUFPLElBQUks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