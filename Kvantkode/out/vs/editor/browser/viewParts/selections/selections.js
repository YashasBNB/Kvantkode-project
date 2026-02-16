/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './selections.css';
import { DynamicViewOverlay } from '../../view/dynamicViewOverlay.js';
import { editorSelectionForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
var CornerStyle;
(function (CornerStyle) {
    CornerStyle[CornerStyle["EXTERN"] = 0] = "EXTERN";
    CornerStyle[CornerStyle["INTERN"] = 1] = "INTERN";
    CornerStyle[CornerStyle["FLAT"] = 2] = "FLAT";
})(CornerStyle || (CornerStyle = {}));
class HorizontalRangeWithStyle {
    constructor(other) {
        this.left = other.left;
        this.width = other.width;
        this.startStyle = null;
        this.endStyle = null;
    }
}
class LineVisibleRangesWithStyle {
    constructor(lineNumber, ranges) {
        this.lineNumber = lineNumber;
        this.ranges = ranges;
    }
}
function toStyledRange(item) {
    return new HorizontalRangeWithStyle(item);
}
function toStyled(item) {
    return new LineVisibleRangesWithStyle(item.lineNumber, item.ranges.map(toStyledRange));
}
/**
 * This view part displays selected text to the user. Every line has its own selection overlay.
 */
export class SelectionsOverlay extends DynamicViewOverlay {
    static { this.SELECTION_CLASS_NAME = 'selected-text'; }
    static { this.SELECTION_TOP_LEFT = 'top-left-radius'; }
    static { this.SELECTION_BOTTOM_LEFT = 'bottom-left-radius'; }
    static { this.SELECTION_TOP_RIGHT = 'top-right-radius'; }
    static { this.SELECTION_BOTTOM_RIGHT = 'bottom-right-radius'; }
    static { this.EDITOR_BACKGROUND_CLASS_NAME = 'monaco-editor-background'; }
    static { this.ROUNDED_PIECE_WIDTH = 10; }
    constructor(context) {
        super();
        this._previousFrameVisibleRangesWithStyle = [];
        this._context = context;
        const options = this._context.configuration.options;
        this._roundedSelection = options.get(106 /* EditorOption.roundedSelection */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        this._selections = [];
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
        this._roundedSelection = options.get(106 /* EditorOption.roundedSelection */);
        this._typicalHalfwidthCharacterWidth = options.get(52 /* EditorOption.fontInfo */).typicalHalfwidthCharacterWidth;
        return true;
    }
    onCursorStateChanged(e) {
        this._selections = e.selections.slice(0);
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true; //e.inlineDecorationsChanged;
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
        return e.scrollTopChanged;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    _visibleRangesHaveGaps(linesVisibleRanges) {
        for (let i = 0, len = linesVisibleRanges.length; i < len; i++) {
            const lineVisibleRanges = linesVisibleRanges[i];
            if (lineVisibleRanges.ranges.length > 1) {
                // There are two ranges on the same line
                return true;
            }
        }
        return false;
    }
    _enrichVisibleRangesWithStyle(viewport, linesVisibleRanges, previousFrame) {
        const epsilon = this._typicalHalfwidthCharacterWidth / 4;
        let previousFrameTop = null;
        let previousFrameBottom = null;
        if (previousFrame && previousFrame.length > 0 && linesVisibleRanges.length > 0) {
            const topLineNumber = linesVisibleRanges[0].lineNumber;
            if (topLineNumber === viewport.startLineNumber) {
                for (let i = 0; !previousFrameTop && i < previousFrame.length; i++) {
                    if (previousFrame[i].lineNumber === topLineNumber) {
                        previousFrameTop = previousFrame[i].ranges[0];
                    }
                }
            }
            const bottomLineNumber = linesVisibleRanges[linesVisibleRanges.length - 1].lineNumber;
            if (bottomLineNumber === viewport.endLineNumber) {
                for (let i = previousFrame.length - 1; !previousFrameBottom && i >= 0; i--) {
                    if (previousFrame[i].lineNumber === bottomLineNumber) {
                        previousFrameBottom = previousFrame[i].ranges[0];
                    }
                }
            }
            if (previousFrameTop && !previousFrameTop.startStyle) {
                previousFrameTop = null;
            }
            if (previousFrameBottom && !previousFrameBottom.startStyle) {
                previousFrameBottom = null;
            }
        }
        for (let i = 0, len = linesVisibleRanges.length; i < len; i++) {
            // We know for a fact that there is precisely one range on each line
            const curLineRange = linesVisibleRanges[i].ranges[0];
            const curLeft = curLineRange.left;
            const curRight = curLineRange.left + curLineRange.width;
            const startStyle = {
                top: 0 /* CornerStyle.EXTERN */,
                bottom: 0 /* CornerStyle.EXTERN */,
            };
            const endStyle = {
                top: 0 /* CornerStyle.EXTERN */,
                bottom: 0 /* CornerStyle.EXTERN */,
            };
            if (i > 0) {
                // Look above
                const prevLeft = linesVisibleRanges[i - 1].ranges[0].left;
                const prevRight = linesVisibleRanges[i - 1].ranges[0].left + linesVisibleRanges[i - 1].ranges[0].width;
                if (abs(curLeft - prevLeft) < epsilon) {
                    startStyle.top = 2 /* CornerStyle.FLAT */;
                }
                else if (curLeft > prevLeft) {
                    startStyle.top = 1 /* CornerStyle.INTERN */;
                }
                if (abs(curRight - prevRight) < epsilon) {
                    endStyle.top = 2 /* CornerStyle.FLAT */;
                }
                else if (prevLeft < curRight && curRight < prevRight) {
                    endStyle.top = 1 /* CornerStyle.INTERN */;
                }
            }
            else if (previousFrameTop) {
                // Accept some hiccups near the viewport edges to save on repaints
                startStyle.top = previousFrameTop.startStyle.top;
                endStyle.top = previousFrameTop.endStyle.top;
            }
            if (i + 1 < len) {
                // Look below
                const nextLeft = linesVisibleRanges[i + 1].ranges[0].left;
                const nextRight = linesVisibleRanges[i + 1].ranges[0].left + linesVisibleRanges[i + 1].ranges[0].width;
                if (abs(curLeft - nextLeft) < epsilon) {
                    startStyle.bottom = 2 /* CornerStyle.FLAT */;
                }
                else if (nextLeft < curLeft && curLeft < nextRight) {
                    startStyle.bottom = 1 /* CornerStyle.INTERN */;
                }
                if (abs(curRight - nextRight) < epsilon) {
                    endStyle.bottom = 2 /* CornerStyle.FLAT */;
                }
                else if (curRight < nextRight) {
                    endStyle.bottom = 1 /* CornerStyle.INTERN */;
                }
            }
            else if (previousFrameBottom) {
                // Accept some hiccups near the viewport edges to save on repaints
                startStyle.bottom = previousFrameBottom.startStyle.bottom;
                endStyle.bottom = previousFrameBottom.endStyle.bottom;
            }
            curLineRange.startStyle = startStyle;
            curLineRange.endStyle = endStyle;
        }
    }
    _getVisibleRangesWithStyle(selection, ctx, previousFrame) {
        const _linesVisibleRanges = ctx.linesVisibleRangesForRange(selection, true) || [];
        const linesVisibleRanges = _linesVisibleRanges.map(toStyled);
        const visibleRangesHaveGaps = this._visibleRangesHaveGaps(linesVisibleRanges);
        if (!visibleRangesHaveGaps && this._roundedSelection) {
            this._enrichVisibleRangesWithStyle(ctx.visibleRange, linesVisibleRanges, previousFrame);
        }
        // The visible ranges are sorted TOP-BOTTOM and LEFT-RIGHT
        return linesVisibleRanges;
    }
    _createSelectionPiece(top, bottom, className, left, width) {
        return ('<div class="cslr ' +
            className +
            '" style="' +
            'top:' +
            top.toString() +
            'px;' +
            'bottom:' +
            bottom.toString() +
            'px;' +
            'left:' +
            left.toString() +
            'px;' +
            'width:' +
            width.toString() +
            'px;' +
            '"></div>');
    }
    _actualRenderOneSelection(output2, visibleStartLineNumber, hasMultipleSelections, visibleRanges) {
        if (visibleRanges.length === 0) {
            return;
        }
        const visibleRangesHaveStyle = !!visibleRanges[0].ranges[0].startStyle;
        const firstLineNumber = visibleRanges[0].lineNumber;
        const lastLineNumber = visibleRanges[visibleRanges.length - 1].lineNumber;
        for (let i = 0, len = visibleRanges.length; i < len; i++) {
            const lineVisibleRanges = visibleRanges[i];
            const lineNumber = lineVisibleRanges.lineNumber;
            const lineIndex = lineNumber - visibleStartLineNumber;
            const top = hasMultipleSelections ? (lineNumber === firstLineNumber ? 1 : 0) : 0;
            const bottom = hasMultipleSelections
                ? lineNumber !== firstLineNumber && lineNumber === lastLineNumber
                    ? 1
                    : 0
                : 0;
            let innerCornerOutput = '';
            let restOfSelectionOutput = '';
            for (let j = 0, lenJ = lineVisibleRanges.ranges.length; j < lenJ; j++) {
                const visibleRange = lineVisibleRanges.ranges[j];
                if (visibleRangesHaveStyle) {
                    const startStyle = visibleRange.startStyle;
                    const endStyle = visibleRange.endStyle;
                    if (startStyle.top === 1 /* CornerStyle.INTERN */ || startStyle.bottom === 1 /* CornerStyle.INTERN */) {
                        // Reverse rounded corner to the left
                        // First comes the selection (blue layer)
                        innerCornerOutput += this._createSelectionPiece(top, bottom, SelectionsOverlay.SELECTION_CLASS_NAME, visibleRange.left - SelectionsOverlay.ROUNDED_PIECE_WIDTH, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                        // Second comes the background (white layer) with inverse border radius
                        let className = SelectionsOverlay.EDITOR_BACKGROUND_CLASS_NAME;
                        if (startStyle.top === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_TOP_RIGHT;
                        }
                        if (startStyle.bottom === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_RIGHT;
                        }
                        innerCornerOutput += this._createSelectionPiece(top, bottom, className, visibleRange.left - SelectionsOverlay.ROUNDED_PIECE_WIDTH, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                    }
                    if (endStyle.top === 1 /* CornerStyle.INTERN */ || endStyle.bottom === 1 /* CornerStyle.INTERN */) {
                        // Reverse rounded corner to the right
                        // First comes the selection (blue layer)
                        innerCornerOutput += this._createSelectionPiece(top, bottom, SelectionsOverlay.SELECTION_CLASS_NAME, visibleRange.left + visibleRange.width, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                        // Second comes the background (white layer) with inverse border radius
                        let className = SelectionsOverlay.EDITOR_BACKGROUND_CLASS_NAME;
                        if (endStyle.top === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_TOP_LEFT;
                        }
                        if (endStyle.bottom === 1 /* CornerStyle.INTERN */) {
                            className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_LEFT;
                        }
                        innerCornerOutput += this._createSelectionPiece(top, bottom, className, visibleRange.left + visibleRange.width, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
                    }
                }
                let className = SelectionsOverlay.SELECTION_CLASS_NAME;
                if (visibleRangesHaveStyle) {
                    const startStyle = visibleRange.startStyle;
                    const endStyle = visibleRange.endStyle;
                    if (startStyle.top === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_TOP_LEFT;
                    }
                    if (startStyle.bottom === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_LEFT;
                    }
                    if (endStyle.top === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_TOP_RIGHT;
                    }
                    if (endStyle.bottom === 0 /* CornerStyle.EXTERN */) {
                        className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_RIGHT;
                    }
                }
                restOfSelectionOutput += this._createSelectionPiece(top, bottom, className, visibleRange.left, visibleRange.width);
            }
            output2[lineIndex][0] += innerCornerOutput;
            output2[lineIndex][1] += restOfSelectionOutput;
        }
    }
    prepareRender(ctx) {
        // Build HTML for inner corners separate from HTML for the rest of selections,
        // as the inner corner HTML can interfere with that of other selections.
        // In final render, make sure to place the inner corner HTML before the rest of selection HTML. See issue #77777.
        const output = [];
        const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
        const visibleEndLineNumber = ctx.visibleRange.endLineNumber;
        for (let lineNumber = visibleStartLineNumber; lineNumber <= visibleEndLineNumber; lineNumber++) {
            const lineIndex = lineNumber - visibleStartLineNumber;
            output[lineIndex] = ['', ''];
        }
        const thisFrameVisibleRangesWithStyle = [];
        for (let i = 0, len = this._selections.length; i < len; i++) {
            const selection = this._selections[i];
            if (selection.isEmpty()) {
                thisFrameVisibleRangesWithStyle[i] = null;
                continue;
            }
            const visibleRangesWithStyle = this._getVisibleRangesWithStyle(selection, ctx, this._previousFrameVisibleRangesWithStyle[i]);
            thisFrameVisibleRangesWithStyle[i] = visibleRangesWithStyle;
            this._actualRenderOneSelection(output, visibleStartLineNumber, this._selections.length > 1, visibleRangesWithStyle);
        }
        this._previousFrameVisibleRangesWithStyle = thisFrameVisibleRangesWithStyle;
        this._renderResult = output.map(([internalCorners, restOfSelection]) => internalCorners + restOfSelection);
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
registerThemingParticipant((theme, collector) => {
    const editorSelectionForegroundColor = theme.getColor(editorSelectionForeground);
    if (editorSelectionForegroundColor && !editorSelectionForegroundColor.isTransparent()) {
        collector.addRule(`.monaco-editor .view-line span.inline-selected-text { color: ${editorSelectionForegroundColor}; }`);
    }
});
function abs(n) {
    return n < 0 ? -n : n;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3NlbGVjdGlvbnMvc2VsZWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBU3JFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRzlGLElBQVcsV0FJVjtBQUpELFdBQVcsV0FBVztJQUNyQixpREFBTSxDQUFBO0lBQ04saURBQU0sQ0FBQTtJQUNOLDZDQUFJLENBQUE7QUFDTCxDQUFDLEVBSlUsV0FBVyxLQUFYLFdBQVcsUUFJckI7QUFPRCxNQUFNLHdCQUF3QjtJQU03QixZQUFZLEtBQXNCO1FBQ2pDLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUN0QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUE7UUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7SUFDckIsQ0FBQztDQUNEO0FBRUQsTUFBTSwwQkFBMEI7SUFJL0IsWUFBWSxVQUFrQixFQUFFLE1BQWtDO1FBQ2pFLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO0lBQ3JCLENBQUM7Q0FDRDtBQUVELFNBQVMsYUFBYSxDQUFDLElBQXFCO0lBQzNDLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUMxQyxDQUFDO0FBRUQsU0FBUyxRQUFRLENBQUMsSUFBdUI7SUFDeEMsT0FBTyxJQUFJLDBCQUEwQixDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtBQUN2RixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsa0JBQWtCO2FBQ2hDLHlCQUFvQixHQUFHLGVBQWUsQUFBbEIsQ0FBa0I7YUFDdEMsdUJBQWtCLEdBQUcsaUJBQWlCLEFBQXBCLENBQW9CO2FBQ3RDLDBCQUFxQixHQUFHLG9CQUFvQixBQUF2QixDQUF1QjthQUM1Qyx3QkFBbUIsR0FBRyxrQkFBa0IsQUFBckIsQ0FBcUI7YUFDeEMsMkJBQXNCLEdBQUcscUJBQXFCLEFBQXhCLENBQXdCO2FBQzlDLGlDQUE0QixHQUFHLDBCQUEwQixBQUE3QixDQUE2QjthQUV6RCx3QkFBbUIsR0FBRyxFQUFFLEFBQUwsQ0FBSztJQVFoRCxZQUFZLE9BQW9CO1FBQy9CLEtBQUssRUFBRSxDQUFBO1FBc1ZBLHlDQUFvQyxHQUE0QyxFQUFFLENBQUE7UUFyVnpGLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFBO1FBQ3ZCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQTtRQUNuRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcseUNBQStCLENBQUE7UUFDbkUsSUFBSSxDQUFDLCtCQUErQixHQUFHLE9BQU8sQ0FBQyxHQUFHLGdDQUVqRCxDQUFDLDhCQUE4QixDQUFBO1FBQ2hDLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUE7UUFDekIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFRCwyQkFBMkI7SUFFWCxzQkFBc0IsQ0FBQyxDQUEyQztRQUNqRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUE7UUFDbkQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLHlDQUErQixDQUFBO1FBQ25FLElBQUksQ0FBQywrQkFBK0IsR0FBRyxPQUFPLENBQUMsR0FBRyxnQ0FFakQsQ0FBQyw4QkFBOEIsQ0FBQTtRQUNoQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxvQkFBb0IsQ0FBQyxDQUF5QztRQUM3RSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLG9CQUFvQixDQUFDLENBQXlDO1FBQzdFLCtEQUErRDtRQUMvRCxPQUFPLElBQUksQ0FBQSxDQUFDLDZCQUE2QjtJQUMxQyxDQUFDO0lBQ2UsU0FBUyxDQUFDLENBQThCO1FBQ3ZELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDZSxjQUFjLENBQUMsQ0FBbUM7UUFDakUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ2UsZUFBZSxDQUFDLENBQW9DO1FBQ25FLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNlLGVBQWUsQ0FBQyxDQUFvQztRQUNuRSxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQTtJQUMxQixDQUFDO0lBQ2UsY0FBYyxDQUFDLENBQW1DO1FBQ2pFLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELHlCQUF5QjtJQUVqQixzQkFBc0IsQ0FBQyxrQkFBZ0Q7UUFDOUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUvQyxJQUFJLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLHdDQUF3QztnQkFDeEMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLDZCQUE2QixDQUNwQyxRQUFlLEVBQ2Ysa0JBQWdELEVBQ2hELGFBQWtEO1FBRWxELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQywrQkFBK0IsR0FBRyxDQUFDLENBQUE7UUFDeEQsSUFBSSxnQkFBZ0IsR0FBb0MsSUFBSSxDQUFBO1FBQzVELElBQUksbUJBQW1CLEdBQW9DLElBQUksQ0FBQTtRQUUvRCxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEYsTUFBTSxhQUFhLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1lBQ3RELElBQUksYUFBYSxLQUFLLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNwRSxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEtBQUssYUFBYSxFQUFFLENBQUM7d0JBQ25ELGdCQUFnQixHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQzlDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUE7WUFDckYsSUFBSSxnQkFBZ0IsS0FBSyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ2pELEtBQUssSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzVFLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUN0RCxtQkFBbUIsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNqRCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUN0RCxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7WUFDeEIsQ0FBQztZQUNELElBQUksbUJBQW1CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDNUQsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0Qsb0VBQW9FO1lBQ3BFLE1BQU0sWUFBWSxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwRCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFBO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQTtZQUV2RCxNQUFNLFVBQVUsR0FBRztnQkFDbEIsR0FBRyw0QkFBb0I7Z0JBQ3ZCLE1BQU0sNEJBQW9CO2FBQzFCLENBQUE7WUFFRCxNQUFNLFFBQVEsR0FBRztnQkFDaEIsR0FBRyw0QkFBb0I7Z0JBQ3ZCLE1BQU0sNEJBQW9CO2FBQzFCLENBQUE7WUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDWCxhQUFhO2dCQUNiLE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFBO2dCQUN6RCxNQUFNLFNBQVMsR0FDZCxrQkFBa0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtnQkFFckYsSUFBSSxHQUFHLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDO29CQUN2QyxVQUFVLENBQUMsR0FBRywyQkFBbUIsQ0FBQTtnQkFDbEMsQ0FBQztxQkFBTSxJQUFJLE9BQU8sR0FBRyxRQUFRLEVBQUUsQ0FBQztvQkFDL0IsVUFBVSxDQUFDLEdBQUcsNkJBQXFCLENBQUE7Z0JBQ3BDLENBQUM7Z0JBRUQsSUFBSSxHQUFHLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQyxHQUFHLE9BQU8sRUFBRSxDQUFDO29CQUN6QyxRQUFRLENBQUMsR0FBRywyQkFBbUIsQ0FBQTtnQkFDaEMsQ0FBQztxQkFBTSxJQUFJLFFBQVEsR0FBRyxRQUFRLElBQUksUUFBUSxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUN4RCxRQUFRLENBQUMsR0FBRyw2QkFBcUIsQ0FBQTtnQkFDbEMsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUM3QixrRUFBa0U7Z0JBQ2xFLFVBQVUsQ0FBQyxHQUFHLEdBQUcsZ0JBQWdCLENBQUMsVUFBVyxDQUFDLEdBQUcsQ0FBQTtnQkFDakQsUUFBUSxDQUFDLEdBQUcsR0FBRyxnQkFBZ0IsQ0FBQyxRQUFTLENBQUMsR0FBRyxDQUFBO1lBQzlDLENBQUM7WUFFRCxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLGFBQWE7Z0JBQ2IsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7Z0JBQ3pELE1BQU0sU0FBUyxHQUNkLGtCQUFrQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLGtCQUFrQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO2dCQUVyRixJQUFJLEdBQUcsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUM7b0JBQ3ZDLFVBQVUsQ0FBQyxNQUFNLDJCQUFtQixDQUFBO2dCQUNyQyxDQUFDO3FCQUFNLElBQUksUUFBUSxHQUFHLE9BQU8sSUFBSSxPQUFPLEdBQUcsU0FBUyxFQUFFLENBQUM7b0JBQ3RELFVBQVUsQ0FBQyxNQUFNLDZCQUFxQixDQUFBO2dCQUN2QyxDQUFDO2dCQUVELElBQUksR0FBRyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxPQUFPLEVBQUUsQ0FBQztvQkFDekMsUUFBUSxDQUFDLE1BQU0sMkJBQW1CLENBQUE7Z0JBQ25DLENBQUM7cUJBQU0sSUFBSSxRQUFRLEdBQUcsU0FBUyxFQUFFLENBQUM7b0JBQ2pDLFFBQVEsQ0FBQyxNQUFNLDZCQUFxQixDQUFBO2dCQUNyQyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2hDLGtFQUFrRTtnQkFDbEUsVUFBVSxDQUFDLE1BQU0sR0FBRyxtQkFBbUIsQ0FBQyxVQUFXLENBQUMsTUFBTSxDQUFBO2dCQUMxRCxRQUFRLENBQUMsTUFBTSxHQUFHLG1CQUFtQixDQUFDLFFBQVMsQ0FBQyxNQUFNLENBQUE7WUFDdkQsQ0FBQztZQUVELFlBQVksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1lBQ3BDLFlBQVksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQ2pDLFNBQWdCLEVBQ2hCLEdBQXFCLEVBQ3JCLGFBQWtEO1FBRWxELE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDakYsTUFBTSxrQkFBa0IsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDNUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUU3RSxJQUFJLENBQUMscUJBQXFCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDeEYsQ0FBQztRQUVELDBEQUEwRDtRQUMxRCxPQUFPLGtCQUFrQixDQUFBO0lBQzFCLENBQUM7SUFFTyxxQkFBcUIsQ0FDNUIsR0FBVyxFQUNYLE1BQWMsRUFDZCxTQUFpQixFQUNqQixJQUFZLEVBQ1osS0FBYTtRQUViLE9BQU8sQ0FDTixtQkFBbUI7WUFDbkIsU0FBUztZQUNULFdBQVc7WUFDWCxNQUFNO1lBQ04sR0FBRyxDQUFDLFFBQVEsRUFBRTtZQUNkLEtBQUs7WUFDTCxTQUFTO1lBQ1QsTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUNqQixLQUFLO1lBQ0wsT0FBTztZQUNQLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixLQUFLO1lBQ0wsUUFBUTtZQUNSLEtBQUssQ0FBQyxRQUFRLEVBQUU7WUFDaEIsS0FBSztZQUNMLFVBQVUsQ0FDVixDQUFBO0lBQ0YsQ0FBQztJQUVPLHlCQUF5QixDQUNoQyxPQUEyQixFQUMzQixzQkFBOEIsRUFDOUIscUJBQThCLEVBQzlCLGFBQTJDO1FBRTNDLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBRXRFLE1BQU0sZUFBZSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUE7UUFDbkQsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFBO1FBRXpFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUMxRCxNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxQyxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLENBQUE7WUFDL0MsTUFBTSxTQUFTLEdBQUcsVUFBVSxHQUFHLHNCQUFzQixDQUFBO1lBRXJELE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoRixNQUFNLE1BQU0sR0FBRyxxQkFBcUI7Z0JBQ25DLENBQUMsQ0FBQyxVQUFVLEtBQUssZUFBZSxJQUFJLFVBQVUsS0FBSyxjQUFjO29CQUNoRSxDQUFDLENBQUMsQ0FBQztvQkFDSCxDQUFDLENBQUMsQ0FBQztnQkFDSixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRUosSUFBSSxpQkFBaUIsR0FBRyxFQUFFLENBQUE7WUFDMUIsSUFBSSxxQkFBcUIsR0FBRyxFQUFFLENBQUE7WUFFOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN2RSxNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRWhELElBQUksc0JBQXNCLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFVBQVcsQ0FBQTtvQkFDM0MsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLFFBQVMsQ0FBQTtvQkFDdkMsSUFBSSxVQUFVLENBQUMsR0FBRywrQkFBdUIsSUFBSSxVQUFVLENBQUMsTUFBTSwrQkFBdUIsRUFBRSxDQUFDO3dCQUN2RixxQ0FBcUM7d0JBRXJDLHlDQUF5Qzt3QkFDekMsaUJBQWlCLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUM5QyxHQUFHLEVBQ0gsTUFBTSxFQUNOLGlCQUFpQixDQUFDLG9CQUFvQixFQUN0QyxZQUFZLENBQUMsSUFBSSxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixFQUN6RCxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FDckMsQ0FBQTt3QkFFRCx1RUFBdUU7d0JBQ3ZFLElBQUksU0FBUyxHQUFHLGlCQUFpQixDQUFDLDRCQUE0QixDQUFBO3dCQUM5RCxJQUFJLFVBQVUsQ0FBQyxHQUFHLCtCQUF1QixFQUFFLENBQUM7NEJBQzNDLFNBQVMsSUFBSSxHQUFHLEdBQUcsaUJBQWlCLENBQUMsbUJBQW1CLENBQUE7d0JBQ3pELENBQUM7d0JBQ0QsSUFBSSxVQUFVLENBQUMsTUFBTSwrQkFBdUIsRUFBRSxDQUFDOzRCQUM5QyxTQUFTLElBQUksR0FBRyxHQUFHLGlCQUFpQixDQUFDLHNCQUFzQixDQUFBO3dCQUM1RCxDQUFDO3dCQUNELGlCQUFpQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FDOUMsR0FBRyxFQUNILE1BQU0sRUFDTixTQUFTLEVBQ1QsWUFBWSxDQUFDLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFDekQsaUJBQWlCLENBQUMsbUJBQW1CLENBQ3JDLENBQUE7b0JBQ0YsQ0FBQztvQkFDRCxJQUFJLFFBQVEsQ0FBQyxHQUFHLCtCQUF1QixJQUFJLFFBQVEsQ0FBQyxNQUFNLCtCQUF1QixFQUFFLENBQUM7d0JBQ25GLHNDQUFzQzt3QkFFdEMseUNBQXlDO3dCQUN6QyxpQkFBaUIsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQzlDLEdBQUcsRUFDSCxNQUFNLEVBQ04saUJBQWlCLENBQUMsb0JBQW9CLEVBQ3RDLFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFDdEMsaUJBQWlCLENBQUMsbUJBQW1CLENBQ3JDLENBQUE7d0JBRUQsdUVBQXVFO3dCQUN2RSxJQUFJLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyw0QkFBNEIsQ0FBQTt3QkFDOUQsSUFBSSxRQUFRLENBQUMsR0FBRywrQkFBdUIsRUFBRSxDQUFDOzRCQUN6QyxTQUFTLElBQUksR0FBRyxHQUFHLGlCQUFpQixDQUFDLGtCQUFrQixDQUFBO3dCQUN4RCxDQUFDO3dCQUNELElBQUksUUFBUSxDQUFDLE1BQU0sK0JBQXVCLEVBQUUsQ0FBQzs0QkFDNUMsU0FBUyxJQUFJLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxxQkFBcUIsQ0FBQTt3QkFDM0QsQ0FBQzt3QkFDRCxpQkFBaUIsSUFBSSxJQUFJLENBQUMscUJBQXFCLENBQzlDLEdBQUcsRUFDSCxNQUFNLEVBQ04sU0FBUyxFQUNULFlBQVksQ0FBQyxJQUFJLEdBQUcsWUFBWSxDQUFDLEtBQUssRUFDdEMsaUJBQWlCLENBQUMsbUJBQW1CLENBQ3JDLENBQUE7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELElBQUksU0FBUyxHQUFHLGlCQUFpQixDQUFDLG9CQUFvQixDQUFBO2dCQUN0RCxJQUFJLHNCQUFzQixFQUFFLENBQUM7b0JBQzVCLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxVQUFXLENBQUE7b0JBQzNDLE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQyxRQUFTLENBQUE7b0JBQ3ZDLElBQUksVUFBVSxDQUFDLEdBQUcsK0JBQXVCLEVBQUUsQ0FBQzt3QkFDM0MsU0FBUyxJQUFJLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQTtvQkFDeEQsQ0FBQztvQkFDRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLCtCQUF1QixFQUFFLENBQUM7d0JBQzlDLFNBQVMsSUFBSSxHQUFHLEdBQUcsaUJBQWlCLENBQUMscUJBQXFCLENBQUE7b0JBQzNELENBQUM7b0JBQ0QsSUFBSSxRQUFRLENBQUMsR0FBRywrQkFBdUIsRUFBRSxDQUFDO3dCQUN6QyxTQUFTLElBQUksR0FBRyxHQUFHLGlCQUFpQixDQUFDLG1CQUFtQixDQUFBO29CQUN6RCxDQUFDO29CQUNELElBQUksUUFBUSxDQUFDLE1BQU0sK0JBQXVCLEVBQUUsQ0FBQzt3QkFDNUMsU0FBUyxJQUFJLEdBQUcsR0FBRyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQTtvQkFDNUQsQ0FBQztnQkFDRixDQUFDO2dCQUNELHFCQUFxQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FDbEQsR0FBRyxFQUNILE1BQU0sRUFDTixTQUFTLEVBQ1QsWUFBWSxDQUFDLElBQUksRUFDakIsWUFBWSxDQUFDLEtBQUssQ0FDbEIsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksaUJBQWlCLENBQUE7WUFDMUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLHFCQUFxQixDQUFBO1FBQy9DLENBQUM7SUFDRixDQUFDO0lBR00sYUFBYSxDQUFDLEdBQXFCO1FBQ3pDLDhFQUE4RTtRQUM5RSx3RUFBd0U7UUFDeEUsaUhBQWlIO1FBQ2pILE1BQU0sTUFBTSxHQUF1QixFQUFFLENBQUE7UUFDckMsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQTtRQUMvRCxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFBO1FBQzNELEtBQ0MsSUFBSSxVQUFVLEdBQUcsc0JBQXNCLEVBQ3ZDLFVBQVUsSUFBSSxvQkFBb0IsRUFDbEMsVUFBVSxFQUFFLEVBQ1gsQ0FBQztZQUNGLE1BQU0sU0FBUyxHQUFHLFVBQVUsR0FBRyxzQkFBc0IsQ0FBQTtZQUNyRCxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE1BQU0sK0JBQStCLEdBQTRDLEVBQUUsQ0FBQTtRQUNuRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDekIsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFBO2dCQUN6QyxTQUFRO1lBQ1QsQ0FBQztZQUVELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUM3RCxTQUFTLEVBQ1QsR0FBRyxFQUNILElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUMsQ0FDNUMsQ0FBQTtZQUNELCtCQUErQixDQUFDLENBQUMsQ0FBQyxHQUFHLHNCQUFzQixDQUFBO1lBQzNELElBQUksQ0FBQyx5QkFBeUIsQ0FDN0IsTUFBTSxFQUNOLHNCQUFzQixFQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQzNCLHNCQUFzQixDQUN0QixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxvQ0FBb0MsR0FBRywrQkFBK0IsQ0FBQTtRQUMzRSxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQzlCLENBQUMsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLEVBQUUsRUFBRSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQ3pFLENBQUE7SUFDRixDQUFDO0lBRU0sTUFBTSxDQUFDLGVBQXVCLEVBQUUsVUFBa0I7UUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLEdBQUcsZUFBZSxDQUFBO1FBQzlDLElBQUksU0FBUyxHQUFHLENBQUMsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3RCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDckMsQ0FBQzs7QUFHRiwwQkFBMEIsQ0FBQyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtJQUMvQyxNQUFNLDhCQUE4QixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUNoRixJQUFJLDhCQUE4QixJQUFJLENBQUMsOEJBQThCLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQztRQUN2RixTQUFTLENBQUMsT0FBTyxDQUNoQixnRUFBZ0UsOEJBQThCLEtBQUssQ0FDbkcsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQTtBQUVGLFNBQVMsR0FBRyxDQUFDLENBQVM7SUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3RCLENBQUMifQ==