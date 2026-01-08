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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9kZWNvcmF0aW9ucy9kZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQW9CLE1BQU0sZ0NBQWdDLENBQUE7QUFFbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBS3JELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxrQkFBa0I7SUFLekQsWUFBWSxPQUFvQjtRQUMvQixLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxJQUFJLENBQUMsK0JBQStCLEdBQUcsT0FBTyxDQUFDLEdBQUcsZ0NBRWpELENBQUMsOEJBQThCLENBQUE7UUFDaEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFFekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUN6QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVELDJCQUEyQjtJQUVYLHNCQUFzQixDQUFDLENBQTJDO1FBQ2pGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxJQUFJLENBQUMsK0JBQStCLEdBQUcsT0FBTyxDQUFDLEdBQUcsZ0NBRWpELENBQUMsOEJBQThCLENBQUE7UUFDaEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ2Usb0JBQW9CLENBQUMsQ0FBeUM7UUFDN0UsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ2UsU0FBUyxDQUFDLENBQThCO1FBQ3ZELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxjQUFjLENBQUMsQ0FBbUM7UUFDakUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ2UsZUFBZSxDQUFDLENBQW9DO1FBQ25FLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLGVBQWUsQ0FBQyxDQUFvQztRQUNuRSxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsa0JBQWtCLENBQUE7SUFDbEQsQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCx5QkFBeUI7SUFFbEIsYUFBYSxDQUFDLEdBQXFCO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1FBRW5ELHlDQUF5QztRQUN6QyxJQUFJLFdBQVcsR0FBMEIsRUFBRSxDQUFBO1FBQzNDLElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQTtRQUN0QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekQsTUFBTSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDekIsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFPLEVBQUUsQ0FBQztnQkFDM0MsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUNWLENBQUM7WUFDRCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTyxFQUFFLENBQUM7Z0JBQzNDLE9BQU8sQ0FBQyxDQUFBO1lBQ1QsQ0FBQztZQUNELE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBVSxDQUFBO1lBQ3ZDLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBVSxDQUFBO1lBRXZDLElBQUksVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUM3QixPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQ1YsQ0FBQztZQUNELElBQUksVUFBVSxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUM3QixPQUFPLENBQUMsQ0FBQTtZQUNULENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN4RCxDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUE7UUFDL0QsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQTtRQUMzRCxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsS0FDQyxJQUFJLFVBQVUsR0FBRyxzQkFBc0IsRUFDdkMsVUFBVSxJQUFJLG9CQUFvQixFQUNsQyxVQUFVLEVBQUUsRUFDWCxDQUFDO1lBQ0YsTUFBTSxTQUFTLEdBQUcsVUFBVSxHQUFHLHNCQUFzQixDQUFBO1lBQ3JELE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDdkIsQ0FBQztRQUVELG1FQUFtRTtRQUNuRSxJQUFJLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQTtJQUM1QixDQUFDO0lBRU8sMkJBQTJCLENBQ2xDLEdBQXFCLEVBQ3JCLFdBQWtDLEVBQ2xDLE1BQWdCO1FBRWhCLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUE7UUFDL0QsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQTtRQUUzRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUQsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXhCLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUM1QixTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLEdBQ3JCLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLHFDQUFxQyxDQUFBO1lBRWpGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtZQUNqRixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUE7WUFDM0UsS0FBSyxJQUFJLENBQUMsR0FBRyxlQUFlLEVBQUUsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN2RCxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsc0JBQXNCLENBQUE7Z0JBQzVDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0IsQ0FDL0IsR0FBcUIsRUFDckIsV0FBa0MsRUFDbEMsTUFBZ0I7UUFFaEIsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQTtRQUUvRCxJQUFJLGFBQWEsR0FBa0IsSUFBSSxDQUFBO1FBQ3ZDLElBQUksbUJBQW1CLEdBQVksS0FBSyxDQUFBO1FBQ3hDLElBQUksU0FBUyxHQUFpQixJQUFJLENBQUE7UUFDbEMsSUFBSSw2QkFBNkIsR0FBWSxLQUFLLENBQUE7UUFFbEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFELE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV4QixJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzNCLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFVLENBQUE7WUFDdEMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUE7WUFFMUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUNuQixJQUNDLGVBQWU7Z0JBQ2YsS0FBSyxDQUFDLFNBQVMsS0FBSyxDQUFDO2dCQUNyQixLQUFLLENBQUMsYUFBYSxLQUFLLEtBQUssQ0FBQyxlQUFlLEVBQzVDLENBQUM7Z0JBQ0YsS0FBSyxHQUFHLElBQUksS0FBSyxDQUNoQixLQUFLLENBQUMsZUFBZSxFQUNyQixLQUFLLENBQUMsV0FBVyxFQUNqQixLQUFLLENBQUMsYUFBYSxHQUFHLENBQUMsRUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FDakUsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUNDLGFBQWEsS0FBSyxTQUFTO2dCQUMzQixtQkFBbUIsS0FBSyxlQUFlO2dCQUN2QyxLQUFLLENBQUMseUJBQXlCLENBQUMsU0FBVSxFQUFFLEtBQUssQ0FBQyxFQUNqRCxDQUFDO2dCQUNGLGlDQUFpQztnQkFDakMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUM5QyxTQUFRO1lBQ1QsQ0FBQztZQUVELDRCQUE0QjtZQUM1QixJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLHVCQUF1QixDQUMzQixHQUFHLEVBQ0gsU0FBVSxFQUNWLGFBQWEsRUFDYiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixNQUFNLENBQ04sQ0FBQTtZQUNGLENBQUM7WUFFRCxhQUFhLEdBQUcsU0FBUyxDQUFBO1lBQ3pCLG1CQUFtQixHQUFHLGVBQWUsQ0FBQTtZQUNyQyxTQUFTLEdBQUcsS0FBSyxDQUFBO1lBQ2pCLDZCQUE2QixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMseUJBQXlCLElBQUksS0FBSyxDQUFBO1FBQzdFLENBQUM7UUFFRCxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsdUJBQXVCLENBQzNCLEdBQUcsRUFDSCxTQUFVLEVBQ1YsYUFBYSxFQUNiLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsc0JBQXNCLEVBQ3RCLE1BQU0sQ0FDTixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FDOUIsR0FBcUIsRUFDckIsS0FBWSxFQUNaLFNBQWlCLEVBQ2pCLHlCQUFrQyxFQUNsQyxlQUF3QixFQUN4QixzQkFBOEIsRUFDOUIsTUFBZ0I7UUFFaEIsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsMEJBQTBCLENBQ3hELEtBQUs7UUFDTCxhQUFhLENBQUMsU0FBUyxLQUFLLFdBQVcsQ0FDdkMsQ0FBQTtRQUNELElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3pCLE9BQU07UUFDUCxDQUFDO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakUsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMvQyxJQUFJLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzNDLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxHQUFHLHNCQUFzQixDQUFBO1lBRXZFLElBQUksZUFBZSxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzlELE1BQU0sa0JBQWtCLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN0RCxJQUFJLGtCQUFrQixDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQztvQkFDckUsd0ZBQXdGO29CQUN4Rix5RkFBeUY7b0JBQ3pGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxHQUFHLGtCQUFrQixDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDakYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLCtCQUErQixHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ3ZGLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLGVBQWUsQ0FDaEQsSUFBSSxFQUNKLElBQUksQ0FBQywrQkFBK0IsQ0FDcEMsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkUsTUFBTSxZQUFZLEdBQ2pCLHlCQUF5QixJQUFJLGlCQUFpQixDQUFDLG1CQUFtQixJQUFJLElBQUksS0FBSyxDQUFDLENBQUE7Z0JBQ2pGLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxnQkFBZ0IsR0FDckIsa0JBQWtCO29CQUNsQixTQUFTO29CQUNULGdCQUFnQjtvQkFDaEIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7b0JBQ3pCLFdBQVc7b0JBQ1gsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUM7b0JBQzdELFVBQVUsQ0FBQTtnQkFDWCxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGVBQXVCLEVBQUUsVUFBa0I7UUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLEdBQUcsZUFBZSxDQUFBO1FBQzlDLElBQUksU0FBUyxHQUFHLENBQUMsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3RCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDckMsQ0FBQztDQUNEIn0=