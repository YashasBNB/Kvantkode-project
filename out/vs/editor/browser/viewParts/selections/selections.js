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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9zZWxlY3Rpb25zL3NlbGVjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQVNyRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUc5RixJQUFXLFdBSVY7QUFKRCxXQUFXLFdBQVc7SUFDckIsaURBQU0sQ0FBQTtJQUNOLGlEQUFNLENBQUE7SUFDTiw2Q0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQUpVLFdBQVcsS0FBWCxXQUFXLFFBSXJCO0FBT0QsTUFBTSx3QkFBd0I7SUFNN0IsWUFBWSxLQUFzQjtRQUNqQyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO0lBQ3JCLENBQUM7Q0FDRDtBQUVELE1BQU0sMEJBQTBCO0lBSS9CLFlBQVksVUFBa0IsRUFBRSxNQUFrQztRQUNqRSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQTtRQUM1QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtJQUNyQixDQUFDO0NBQ0Q7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFxQjtJQUMzQyxPQUFPLElBQUksd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDMUMsQ0FB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