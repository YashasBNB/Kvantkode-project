/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class RestrictedRenderingContext {
    constructor(viewLayout, viewportData) {
        this._restrictedRenderingContextBrand = undefined;
        this._viewLayout = viewLayout;
        this.viewportData = viewportData;
        this.scrollWidth = this._viewLayout.getScrollWidth();
        this.scrollHeight = this._viewLayout.getScrollHeight();
        this.visibleRange = this.viewportData.visibleRange;
        this.bigNumbersDelta = this.viewportData.bigNumbersDelta;
        const vInfo = this._viewLayout.getCurrentViewport();
        this.scrollTop = vInfo.top;
        this.scrollLeft = vInfo.left;
        this.viewportWidth = vInfo.width;
        this.viewportHeight = vInfo.height;
    }
    getScrolledTopFromAbsoluteTop(absoluteTop) {
        return absoluteTop - this.scrollTop;
    }
    getVerticalOffsetForLineNumber(lineNumber, includeViewZones) {
        return this._viewLayout.getVerticalOffsetForLineNumber(lineNumber, includeViewZones);
    }
    getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones) {
        return this._viewLayout.getVerticalOffsetAfterLineNumber(lineNumber, includeViewZones);
    }
    getDecorationsInViewport() {
        return this.viewportData.getDecorationsInViewport();
    }
}
export class RenderingContext extends RestrictedRenderingContext {
    constructor(viewLayout, viewportData, viewLines, viewLinesGpu) {
        super(viewLayout, viewportData);
        this._renderingContextBrand = undefined;
        this._viewLines = viewLines;
        this._viewLinesGpu = viewLinesGpu;
    }
    linesVisibleRangesForRange(range, includeNewLines) {
        const domRanges = this._viewLines.linesVisibleRangesForRange(range, includeNewLines);
        if (!this._viewLinesGpu) {
            return domRanges ?? null;
        }
        const gpuRanges = this._viewLinesGpu.linesVisibleRangesForRange(range, includeNewLines);
        if (!domRanges) {
            return gpuRanges;
        }
        if (!gpuRanges) {
            return domRanges;
        }
        return domRanges.concat(gpuRanges).sort((a, b) => a.lineNumber - b.lineNumber);
    }
    visibleRangeForPosition(position) {
        return (this._viewLines.visibleRangeForPosition(position) ??
            this._viewLinesGpu?.visibleRangeForPosition(position) ??
            null);
    }
}
export class LineVisibleRanges {
    /**
     * Returns the element with the smallest `lineNumber`.
     */
    static firstLine(ranges) {
        if (!ranges) {
            return null;
        }
        let result = null;
        for (const range of ranges) {
            if (!result || range.lineNumber < result.lineNumber) {
                result = range;
            }
        }
        return result;
    }
    /**
     * Returns the element with the largest `lineNumber`.
     */
    static lastLine(ranges) {
        if (!ranges) {
            return null;
        }
        let result = null;
        for (const range of ranges) {
            if (!result || range.lineNumber > result.lineNumber) {
                result = range;
            }
        }
        return result;
    }
    constructor(outsideRenderedLine, lineNumber, ranges, 
    /**
     * Indicates if the requested range does not end in this line, but continues on the next line.
     */
    continuesOnNextLine) {
        this.outsideRenderedLine = outsideRenderedLine;
        this.lineNumber = lineNumber;
        this.ranges = ranges;
        this.continuesOnNextLine = continuesOnNextLine;
    }
}
export class HorizontalRange {
    static from(ranges) {
        const result = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            const range = ranges[i];
            result[i] = new HorizontalRange(range.left, range.width);
        }
        return result;
    }
    constructor(left, width) {
        this._horizontalRangeBrand = undefined;
        this.left = Math.round(left);
        this.width = Math.round(width);
    }
    toString() {
        return `[${this.left},${this.width}]`;
    }
}
export class FloatHorizontalRange {
    constructor(left, width) {
        this._floatHorizontalRangeBrand = undefined;
        this.left = left;
        this.width = width;
    }
    toString() {
        return `[${this.left},${this.width}]`;
    }
    static compare(a, b) {
        return a.left - b.left;
    }
}
export class HorizontalPosition {
    constructor(outsideRenderedLine, left) {
        this.outsideRenderedLine = outsideRenderedLine;
        this.originalLeft = left;
        this.left = Math.round(this.originalLeft);
    }
}
export class VisibleRanges {
    constructor(outsideRenderedLine, ranges) {
        this.outsideRenderedLine = outsideRenderedLine;
        this.ranges = ranges;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyaW5nQ29udGV4dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXcvcmVuZGVyaW5nQ29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVloRyxNQUFNLE9BQWdCLDBCQUEwQjtJQW1CL0MsWUFBWSxVQUF1QixFQUFFLFlBQTBCO1FBbEIvRCxxQ0FBZ0MsR0FBUyxTQUFTLENBQUE7UUFtQmpELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBQzdCLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFBO1FBRWhDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUNwRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFdEQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQTtRQUNsRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFBO1FBRXhELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUE7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtRQUNoQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7SUFDbkMsQ0FBQztJQUVNLDZCQUE2QixDQUFDLFdBQW1CO1FBQ3ZELE9BQU8sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENB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