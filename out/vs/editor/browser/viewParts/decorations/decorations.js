/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './decorations.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { HorizontalRange } from '../../view/renderingContext.js';
import { Range } from '../../../common/core/range.js';
export class DecorationsOverlay extends DynamicViewOverlay {
    constructor(context) {
        super();
        this._context = context;
        const options = this._context.configuration.options;
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        this._renderResult = null;
        this._context.addEventHandler(this);
    }
    dispose() {
        this._context.removeEventHandler(this);
        this._renderResult = null;
        super.dispose();
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        return true;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return e.scrollTopChanged || e.scrollWidthChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    prepareRender(ctx) {
        const _decorations = ctx.getDecorationsInViewport();
        // Keep only decorations with `className`
        let decorations = [];
        let decorationsLen = 0;
        for (let i = 0, len = _decorations.length; i < len; i++) {
            const d = _decorations[i];
            if (d.options.className) {
                decorations[decorationsLen++] = d;
            }
        }
        // Sort decorations for consistent render output
        decorations = decorations.sort((a, b) => {
            if (a.options.zIndex < b.options.zIndex) {
                return -1;
            }
            if (a.options.zIndex > b.options.zIndex) {
                return 1;
            }
            const aClassName = a.options.className;
            const bClassName = b.options.className;
            if (aClassName < bClassName) {
                return -1;
            }
            if (aClassName > bClassName) {
                return 1;
            }
            return Range.compareRangesUsingStarts(a.range, b.range);
        });
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        const output = [];
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            output[lineIndex] = '';
        }
        // Render first whole line decorations and then regular decorations
        this._renderWholeLineDecorations(ctx, decorations, output);
        this._renderNormalDecorations(ctx, decorations, output);
        this._renderResult = output;
    }
    _renderWholeLineDecorations(ctx, decorations, output) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        for (let i = 0, lenI = decorations.length; i < lenI; i++) {
            const d = decorations[i];
            if (!d.options.isWholeLine) {
                continue;
            }
            const decorationOutput = '<div class="cdr ' + d.options.className + '" style="left:0;width:100%;"></div>';
            const startLineNumber = Math.max(d.range.startLineNumber, visibleStartLineNumber);
            const endLineNumber = Math.min(d.range.endLineNumber, visibleEndLineNumber);
            for (let j = startLineNumber; j <= endLineNumber; j++) {
                const lineIndex = j - visibleStartLineNumber;
                output[lineIndex] += decorationOutput;
            }
        }
    }
    _renderNormalDecorations(ctx, decorations, output) {
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        let prevClassName = null;
        let prevShowIfCollapsed = false;
        let prevRange = null;
        let prevShouldFillLineOnLineBreak = false;
        for (let i = 0, lenI = decorations.length; i < lenI; i++) {
            const d = decorations[i];
            if (d.options.isWholeLine) {
                continue;
            }
            const className = d.options.className;
            const showIfCollapsed = Boolean(d.options.showIfCollapsed);
            let range = d.range;
            if (showIfCollapsed &&
                range.endColumn === 1 &&
                range.endLineNumber !== range.startLineNumber) {
                range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber - 1, this._context.viewModel.getLineMaxColumn(range.endLineNumber - 1));
            }
            if (prevClassName === className &&
                prevShowIfCollapsed === showIfCollapsed &&
                Range.areIntersectingOrTouching(prevRange, range)) {
                // merge into previous decoration
                prevRange = Range.plusRange(prevRange, range);
                continue;
            }
            // flush previous decoration
            if (prevClassName !== null) {
                this._renderNormalDecoration(ctx, prevRange, prevClassName, prevShouldFillLineOnLineBreak, prevShowIfCollapsed, visibleStartLineNumber, output);
            }
            prevClassName = className;
            prevShowIfCollapsed = showIfCollapsed;
            prevRange = range;
            prevShouldFillLineOnLineBreak = d.options.shouldFillLineOnLineBreak ?? false;
        }
        if (prevClassName !== null) {
            this._renderNormalDecoration(ctx, prevRange, prevClassName, prevShouldFillLineOnLineBreak, prevShowIfCollapsed, visibleStartLineNumber, output);
        }
    }
    _renderNormalDecoration(ctx, range, className, shouldFillLineOnLineBreak, showIfCollapsed, visibleStartLineNumber, output) {
        const linesVisibleRanges = ctx.linesVisibleRangesForRange(range, 
        /*TODO@Alex*/ className === 'findMatch');
        if (!linesVisibleRanges) {
            return;
        }
        for (let j = 0, lenJ = linesVisibleRanges.length; j < lenJ; j++) {
            const lineVisibleRanges = linesVisibleRanges[j];
            if (lineVisibleRanges.outsideRenderedLine) {
                continue;
            }
            const lineIndex = lineVisibleRanges.lineNumber - visibleStartLineNumber;
            if (showIfCollapsed && lineVisibleRanges.ranges.length === 1) {
                const singleVisibleRange = lineVisibleRanges.ranges[0];
                if (singleVisibleRange.width < this._typicalHalfwidthCharacterWidth) {
                    // collapsed/very small range case => make the decoration visible by expanding its width
                    // expand its size on both sides (both to the left and to the right, keeping it centered)
                    const center = Math.round(singleVisibleRange.left + singleVisibleRange.width / 2);
                    const left = Math.max(0, Math.round(center - this._typicalHalfwidthCharacterWidth / 2));
                    lineVisibleRanges.ranges[0] = new HorizontalRange(left, this._typicalHalfwidthCharacterWidth);
                }
            }
            for (let k = 0, lenK = lineVisibleRanges.ranges.length; k < lenK; k++) {
                const expandToLeft = shouldFillLineOnLineBreak && lineVisibleRanges.continuesOnNextLine && lenK === 1;
                const visibleRange = lineVisibleRanges.ranges[k];
                const decorationOutput = '<div class="cdr ' +
                    className +
                    '" style="left:' +
                    String(visibleRange.left) +
                    'px;width:' +
                    (expandToLeft ? '100%;' : String(visibleRange.width) + 'px;') +
                    '"></div>';
                output[lineIndex] += decorationOutput;
            }
        }
    }
    render(startLineNumber, lineNumber) {
        if (!this._renderResult) {
            return '';
        }
        const lineIndex = lineNumber - startLineNumber;
        if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
            return '';
        }
        return this._renderResult[lineIndex];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvZGVjb3JhdGlvbnMvZGVjb3JhdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxtQkFBbUIsQ0FBQTtBQUMxQixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFvQixNQUFNLGdDQUFnQyxDQUFBO0FBRWxGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUtyRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsa0JBQWtCO0lBS3pELFlBQVksT0FBb0I7UUFDL0IsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQTtRQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsSUFBSSxDQUFDLCtCQUErQixHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUVqRCxDQUFDLDhCQUE4QixDQUFBO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBRXpCLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCwyQkFBMkI7SUFFWCxzQkFBc0IsQ0FBQyxDQUEyQztRQUNqRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMs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