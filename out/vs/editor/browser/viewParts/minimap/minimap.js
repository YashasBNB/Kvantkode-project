/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './minimap.css';
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { GlobalPointerMoveMonitor } from '../../../../base/browser/globalPointerMoveMonitor.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import { RenderedLinesCollection } from '../../view/viewLayer.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
import { MINIMAP_GUTTER_WIDTH, EditorLayoutInfoComputer, } from '../../../common/config/editorOptions.js';
import { Range } from '../../../common/core/range.js';
import { RGBA8 } from '../../../common/core/rgba.js';
import { MinimapTokensColorTracker } from '../../../common/viewModel/minimapTokensColorTracker.js';
import { ViewModelDecoration } from '../../../common/viewModel.js';
import { minimapSelection, minimapBackground, minimapForegroundOpacity, editorForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { Selection } from '../../../common/core/selection.js';
import { EventType, Gesture } from '../../../../base/browser/touch.js';
import { MinimapCharRendererFactory } from './minimapCharRendererFactory.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { LRUCache } from '../../../../base/common/map.js';
import { DEFAULT_FONT_FAMILY } from '../../../../base/browser/fonts.js';
/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const POINTER_DRAG_RESET_DISTANCE = 140;
const GUTTER_DECORATION_WIDTH = 2;
class MinimapOptions {
    constructor(configuration, theme, tokensColorTracker) {
        const options = configuration.options;
        const pixelRatio = options.get(149 /* EditorOption.pixelRatio */);
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const minimapLayout = layoutInfo.minimap;
        const fontInfo = options.get(52 /* EditorOption.fontInfo */);
        const minimapOpts = options.get(74 /* EditorOption.minimap */);
        this.renderMinimap = minimapLayout.renderMinimap;
        this.size = minimapOpts.size;
        this.minimapHeightIsEditorHeight = minimapLayout.minimapHeightIsEditorHeight;
        this.scrollBeyondLastLine = options.get(110 /* EditorOption.scrollBeyondLastLine */);
        this.paddingTop = options.get(88 /* EditorOption.padding */).top;
        this.paddingBottom = options.get(88 /* EditorOption.padding */).bottom;
        this.showSlider = minimapOpts.showSlider;
        this.autohide = minimapOpts.autohide;
        this.pixelRatio = pixelRatio;
        this.typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.minimapLeft = minimapLayout.minimapLeft;
        this.minimapWidth = minimapLayout.minimapWidth;
        this.minimapHeight = layoutInfo.height;
        this.canvasInnerWidth = minimapLayout.minimapCanvasInnerWidth;
        this.canvasInnerHeight = minimapLayout.minimapCanvasInnerHeight;
        this.canvasOuterWidth = minimapLayout.minimapCanvasOuterWidth;
        this.canvasOuterHeight = minimapLayout.minimapCanvasOuterHeight;
        this.isSampling = minimapLayout.minimapIsSampling;
        this.editorHeight = layoutInfo.height;
        this.fontScale = minimapLayout.minimapScale;
        this.minimapLineHeight = minimapLayout.minimapLineHeight;
        this.minimapCharWidth = 1 /* Constants.BASE_CHAR_WIDTH */ * this.fontScale;
        this.sectionHeaderFontFamily = DEFAULT_FONT_FAMILY;
        this.sectionHeaderFontSize = minimapOpts.sectionHeaderFontSize * pixelRatio;
        this.sectionHeaderLetterSpacing = minimapOpts.sectionHeaderLetterSpacing; // intentionally not multiplying by pixelRatio
        this.sectionHeaderFontColor = MinimapOptions._getSectionHeaderColor(theme, tokensColorTracker.getColor(1 /* ColorId.DefaultForeground */));
        this.charRenderer = createSingleCallFunction(() => MinimapCharRendererFactory.create(this.fontScale, fontInfo.fontFamily));
        this.defaultBackgroundColor = tokensColorTracker.getColor(2 /* ColorId.DefaultBackground */);
        this.backgroundColor = MinimapOptions._getMinimapBackground(theme, this.defaultBackgroundColor);
        this.foregroundAlpha = MinimapOptions._getMinimapForegroundOpacity(theme);
    }
    static _getMinimapBackground(theme, defaultBackgroundColor) {
        const themeColor = theme.getColor(minimapBackground);
        if (themeColor) {
            return new RGBA8(themeColor.rgba.r, themeColor.rgba.g, themeColor.rgba.b, Math.round(255 * themeColor.rgba.a));
        }
        return defaultBackgroundColor;
    }
    static _getMinimapForegroundOpacity(theme) {
        const themeColor = theme.getColor(minimapForegroundOpacity);
        if (themeColor) {
            return RGBA8._clamp(Math.round(255 * themeColor.rgba.a));
        }
        return 255;
    }
    static _getSectionHeaderColor(theme, defaultForegroundColor) {
        const themeColor = theme.getColor(editorForeground);
        if (themeColor) {
            return new RGBA8(themeColor.rgba.r, themeColor.rgba.g, themeColor.rgba.b, Math.round(255 * themeColor.rgba.a));
        }
        return defaultForegroundColor;
    }
    equals(other) {
        return (this.renderMinimap === other.renderMinimap &&
            this.size === other.size &&
            this.minimapHeightIsEditorHeight === other.minimapHeightIsEditorHeight &&
            this.scrollBeyondLastLine === other.scrollBeyondLastLine &&
            this.paddingTop === other.paddingTop &&
            this.paddingBottom === other.paddingBottom &&
            this.showSlider === other.showSlider &&
            this.autohide === other.autohide &&
            this.pixelRatio === other.pixelRatio &&
            this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth &&
            this.lineHeight === other.lineHeight &&
            this.minimapLeft === other.minimapLeft &&
            this.minimapWidth === other.minimapWidth &&
            this.minimapHeight === other.minimapHeight &&
            this.canvasInnerWidth === other.canvasInnerWidth &&
            this.canvasInnerHeight === other.canvasInnerHeight &&
            this.canvasOuterWidth === other.canvasOuterWidth &&
            this.canvasOuterHeight === other.canvasOuterHeight &&
            this.isSampling === other.isSampling &&
            this.editorHeight === other.editorHeight &&
            this.fontScale === other.fontScale &&
            this.minimapLineHeight === other.minimapLineHeight &&
            this.minimapCharWidth === other.minimapCharWidth &&
            this.sectionHeaderFontSize === other.sectionHeaderFontSize &&
            this.sectionHeaderLetterSpacing === other.sectionHeaderLetterSpacing &&
            this.defaultBackgroundColor &&
            this.defaultBackgroundColor.equals(other.defaultBackgroundColor) &&
            this.backgroundColor &&
            this.backgroundColor.equals(other.backgroundColor) &&
            this.foregroundAlpha === other.foregroundAlpha);
    }
}
class MinimapLayout {
    constructor(
    /**
     * The given editor scrollTop (input).
     */
    scrollTop, 
    /**
     * The given editor scrollHeight (input).
     */
    scrollHeight, sliderNeeded, _computedSliderRatio, 
    /**
     * slider dom node top (in CSS px)
     */
    sliderTop, 
    /**
     * slider dom node height (in CSS px)
     */
    sliderHeight, 
    /**
     * empty lines to reserve at the top of the minimap.
     */
    topPaddingLineCount, 
    /**
     * minimap render start line number.
     */
    startLineNumber, 
    /**
     * minimap render end line number.
     */
    endLineNumber) {
        this.scrollTop = scrollTop;
        this.scrollHeight = scrollHeight;
        this.sliderNeeded = sliderNeeded;
        this._computedSliderRatio = _computedSliderRatio;
        this.sliderTop = sliderTop;
        this.sliderHeight = sliderHeight;
        this.topPaddingLineCount = topPaddingLineCount;
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
    }
    /**
     * Compute a desired `scrollPosition` such that the slider moves by `delta`.
     */
    getDesiredScrollTopFromDelta(delta) {
        return Math.round(this.scrollTop + delta / this._computedSliderRatio);
    }
    getDesiredScrollTopFromTouchLocation(pageY) {
        return Math.round((pageY - this.sliderHeight / 2) / this._computedSliderRatio);
    }
    /**
     * Intersect a line range with `this.startLineNumber` and `this.endLineNumber`.
     */
    intersectWithViewport(range) {
        const startLineNumber = Math.max(this.startLineNumber, range.startLineNumber);
        const endLineNumber = Math.min(this.endLineNumber, range.endLineNumber);
        if (startLineNumber > endLineNumber) {
            // entirely outside minimap's viewport
            return null;
        }
        return [startLineNumber, endLineNumber];
    }
    /**
     * Get the inner minimap y coordinate for a line number.
     */
    getYForLineNumber(lineNumber, minimapLineHeight) {
        return +(lineNumber - this.startLineNumber + this.topPaddingLineCount) * minimapLineHeight;
    }
    static create(options, viewportStartLineNumber, viewportEndLineNumber, viewportStartLineNumberVerticalOffset, viewportHeight, viewportContainsWhitespaceGaps, lineCount, realLineCount, scrollTop, scrollHeight, previousLayout) {
        const pixelRatio = options.pixelRatio;
        const minimapLineHeight = options.minimapLineHeight;
        const minimapLinesFitting = Math.floor(options.canvasInnerHeight / minimapLineHeight);
        const lineHeight = options.lineHeight;
        if (options.minimapHeightIsEditorHeight) {
            let logicalScrollHeight = realLineCount * options.lineHeight + options.paddingTop + options.paddingBottom;
            if (options.scrollBeyondLastLine) {
                logicalScrollHeight += Math.max(0, viewportHeight - options.lineHeight - options.paddingBottom);
            }
            const sliderHeight = Math.max(1, Math.floor((viewportHeight * viewportHeight) / logicalScrollHeight));
            const maxMinimapSliderTop = Math.max(0, options.minimapHeight - sliderHeight);
            // The slider can move from 0 to `maxMinimapSliderTop`
            // in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
            const computedSliderRatio = maxMinimapSliderTop / (scrollHeight - viewportHeight);
            const sliderTop = scrollTop * computedSliderRatio;
            const sliderNeeded = maxMinimapSliderTop > 0;
            const maxLinesFitting = Math.floor(options.canvasInnerHeight / options.minimapLineHeight);
            const topPaddingLineCount = Math.floor(options.paddingTop / options.lineHeight);
            return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, topPaddingLineCount, 1, Math.min(lineCount, maxLinesFitting));
        }
        // The visible line count in a viewport can change due to a number of reasons:
        //  a) with the same viewport width, different scroll positions can result in partial lines being visible:
        //    e.g. for a line height of 20, and a viewport height of 600
        //          * scrollTop = 0  => visible lines are [1, 30]
        //          * scrollTop = 10 => visible lines are [1, 31] (with lines 1 and 31 partially visible)
        //          * scrollTop = 20 => visible lines are [2, 31]
        //  b) whitespace gaps might make their way in the viewport (which results in a decrease in the visible line count)
        //  c) we could be in the scroll beyond last line case (which also results in a decrease in the visible line count, down to possibly only one line being visible)
        // We must first establish a desirable slider height.
        let sliderHeight;
        if (viewportContainsWhitespaceGaps && viewportEndLineNumber !== lineCount) {
            // case b) from above: there are whitespace gaps in the viewport.
            // In this case, the height of the slider directly reflects the visible line count.
            const viewportLineCount = viewportEndLineNumber - viewportStartLineNumber + 1;
            sliderHeight = Math.floor((viewportLineCount * minimapLineHeight) / pixelRatio);
        }
        else {
            // The slider has a stable height
            const expectedViewportLineCount = viewportHeight / lineHeight;
            sliderHeight = Math.floor((expectedViewportLineCount * minimapLineHeight) / pixelRatio);
        }
        const extraLinesAtTheTop = Math.floor(options.paddingTop / lineHeight);
        let extraLinesAtTheBottom = Math.floor(options.paddingBottom / lineHeight);
        if (options.scrollBeyondLastLine) {
            const expectedViewportLineCount = viewportHeight / lineHeight;
            extraLinesAtTheBottom = Math.max(extraLinesAtTheBottom, expectedViewportLineCount - 1);
        }
        let maxMinimapSliderTop;
        if (extraLinesAtTheBottom > 0) {
            const expectedViewportLineCount = viewportHeight / lineHeight;
            // The minimap slider, when dragged all the way down, will contain the last line at its top
            maxMinimapSliderTop =
                ((extraLinesAtTheTop + lineCount + extraLinesAtTheBottom - expectedViewportLineCount - 1) *
                    minimapLineHeight) /
                    pixelRatio;
        }
        else {
            // The minimap slider, when dragged all the way down, will contain the last line at its bottom
            maxMinimapSliderTop = Math.max(0, ((extraLinesAtTheTop + lineCount) * minimapLineHeight) / pixelRatio - sliderHeight);
        }
        maxMinimapSliderTop = Math.min(options.minimapHeight - sliderHeight, maxMinimapSliderTop);
        // The slider can move from 0 to `maxMinimapSliderTop`
        // in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
        const computedSliderRatio = maxMinimapSliderTop / (scrollHeight - viewportHeight);
        const sliderTop = scrollTop * computedSliderRatio;
        if (minimapLinesFitting >= extraLinesAtTheTop + lineCount + extraLinesAtTheBottom) {
            // All lines fit in the minimap
            const sliderNeeded = maxMinimapSliderTop > 0;
            return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, extraLinesAtTheTop, 1, lineCount);
        }
        else {
            let consideringStartLineNumber;
            if (viewportStartLineNumber > 1) {
                consideringStartLineNumber = viewportStartLineNumber + extraLinesAtTheTop;
            }
            else {
                consideringStartLineNumber = Math.max(1, scrollTop / lineHeight);
            }
            let topPaddingLineCount;
            let startLineNumber = Math.max(1, Math.floor(consideringStartLineNumber - (sliderTop * pixelRatio) / minimapLineHeight));
            if (startLineNumber < extraLinesAtTheTop) {
                topPaddingLineCount = extraLinesAtTheTop - startLineNumber + 1;
                startLineNumber = 1;
            }
            else {
                topPaddingLineCount = 0;
                startLineNumber = Math.max(1, startLineNumber - extraLinesAtTheTop);
            }
            // Avoid flickering caused by a partial viewport start line
            // by being consistent w.r.t. the previous layout decision
            if (previousLayout && previousLayout.scrollHeight === scrollHeight) {
                if (previousLayout.scrollTop > scrollTop) {
                    // Scrolling up => never increase `startLineNumber`
                    startLineNumber = Math.min(startLineNumber, previousLayout.startLineNumber);
                    topPaddingLineCount = Math.max(topPaddingLineCount, previousLayout.topPaddingLineCount);
                }
                if (previousLayout.scrollTop < scrollTop) {
                    // Scrolling down => never decrease `startLineNumber`
                    startLineNumber = Math.max(startLineNumber, previousLayout.startLineNumber);
                    topPaddingLineCount = Math.min(topPaddingLineCount, previousLayout.topPaddingLineCount);
                }
            }
            const endLineNumber = Math.min(lineCount, startLineNumber - topPaddingLineCount + minimapLinesFitting - 1);
            const partialLine = (scrollTop - viewportStartLineNumberVerticalOffset) / lineHeight;
            let sliderTopAligned;
            if (scrollTop >= options.paddingTop) {
                sliderTopAligned =
                    ((viewportStartLineNumber - startLineNumber + topPaddingLineCount + partialLine) *
                        minimapLineHeight) /
                        pixelRatio;
            }
            else {
                sliderTopAligned =
                    ((scrollTop / options.paddingTop) *
                        (topPaddingLineCount + partialLine) *
                        minimapLineHeight) /
                        pixelRatio;
            }
            return new MinimapLayout(scrollTop, scrollHeight, true, computedSliderRatio, sliderTopAligned, sliderHeight, topPaddingLineCount, startLineNumber, endLineNumber);
        }
    }
}
class MinimapLine {
    static { this.INVALID = new MinimapLine(-1); }
    constructor(dy) {
        this.dy = dy;
    }
    onContentChanged() {
        this.dy = -1;
    }
    onTokensChanged() {
        this.dy = -1;
    }
}
class RenderData {
    constructor(renderedLayout, imageData, lines) {
        this.renderedLayout = renderedLayout;
        this._imageData = imageData;
        this._renderedLines = new RenderedLinesCollection({
            createLine: () => MinimapLine.INVALID,
        });
        this._renderedLines._set(renderedLayout.startLineNumber, lines);
    }
    /**
     * Check if the current RenderData matches accurately the new desired layout and no painting is needed.
     */
    linesEquals(layout) {
        if (!this.scrollEquals(layout)) {
            return false;
        }
        const tmp = this._renderedLines._get();
        const lines = tmp.lines;
        for (let i = 0, len = lines.length; i < len; i++) {
            if (lines[i].dy === -1) {
                // This line is invalid
                return false;
            }
        }
        return true;
    }
    /**
     * Check if the current RenderData matches the new layout's scroll position
     */
    scrollEquals(layout) {
        return (this.renderedLayout.startLineNumber === layout.startLineNumber &&
            this.renderedLayout.endLineNumber === layout.endLineNumber);
    }
    _get() {
        const tmp = this._renderedLines._get();
        return {
            imageData: this._imageData,
            rendLineNumberStart: tmp.rendLineNumberStart,
            lines: tmp.lines,
        };
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        return this._renderedLines.onLinesChanged(changeFromLineNumber, changeCount);
    }
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        this._renderedLines.onLinesDeleted(deleteFromLineNumber, deleteToLineNumber);
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        this._renderedLines.onLinesInserted(insertFromLineNumber, insertToLineNumber);
    }
    onTokensChanged(ranges) {
        return this._renderedLines.onTokensChanged(ranges);
    }
}
/**
 * Some sort of double buffering.
 *
 * Keeps two buffers around that will be rotated for painting.
 * Always gives a buffer that is filled with the background color.
 */
class MinimapBuffers {
    constructor(ctx, WIDTH, HEIGHT, background) {
        this._backgroundFillData = MinimapBuffers._createBackgroundFillData(WIDTH, HEIGHT, background);
        this._buffers = [ctx.createImageData(WIDTH, HEIGHT), ctx.createImageData(WIDTH, HEIGHT)];
        this._lastUsedBuffer = 0;
    }
    getBuffer() {
        // rotate buffers
        this._lastUsedBuffer = 1 - this._lastUsedBuffer;
        const result = this._buffers[this._lastUsedBuffer];
        // fill with background color
        result.data.set(this._backgroundFillData);
        return result;
    }
    static _createBackgroundFillData(WIDTH, HEIGHT, background) {
        const backgroundR = background.r;
        const backgroundG = background.g;
        const backgroundB = background.b;
        const backgroundA = background.a;
        const result = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
        let offset = 0;
        for (let i = 0; i < HEIGHT; i++) {
            for (let j = 0; j < WIDTH; j++) {
                result[offset] = backgroundR;
                result[offset + 1] = backgroundG;
                result[offset + 2] = backgroundB;
                result[offset + 3] = backgroundA;
                offset += 4;
            }
        }
        return result;
    }
}
class MinimapSamplingState {
    static compute(options, viewLineCount, oldSamplingState) {
        if (options.renderMinimap === 0 /* RenderMinimap.None */ || !options.isSampling) {
            return [null, []];
        }
        // ratio is intentionally not part of the layout to avoid the layout changing all the time
        // so we need to recompute it again...
        const { minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
            viewLineCount: viewLineCount,
            scrollBeyondLastLine: options.scrollBeyondLastLine,
            paddingTop: options.paddingTop,
            paddingBottom: options.paddingBottom,
            height: options.editorHeight,
            lineHeight: options.lineHeight,
            pixelRatio: options.pixelRatio,
        });
        const ratio = viewLineCount / minimapLineCount;
        const halfRatio = ratio / 2;
        if (!oldSamplingState || oldSamplingState.minimapLines.length === 0) {
            const result = [];
            result[0] = 1;
            if (minimapLineCount > 1) {
                for (let i = 0, lastIndex = minimapLineCount - 1; i < lastIndex; i++) {
                    result[i] = Math.round(i * ratio + halfRatio);
                }
                result[minimapLineCount - 1] = viewLineCount;
            }
            return [new MinimapSamplingState(ratio, result), []];
        }
        const oldMinimapLines = oldSamplingState.minimapLines;
        const oldLength = oldMinimapLines.length;
        const result = [];
        let oldIndex = 0;
        let oldDeltaLineCount = 0;
        let minViewLineNumber = 1;
        const MAX_EVENT_COUNT = 10; // generate at most 10 events, if there are more than 10 changes, just flush all previous data
        let events = [];
        let lastEvent = null;
        for (let i = 0; i < minimapLineCount; i++) {
            const fromViewLineNumber = Math.max(minViewLineNumber, Math.round(i * ratio));
            const toViewLineNumber = Math.max(fromViewLineNumber, Math.round((i + 1) * ratio));
            while (oldIndex < oldLength && oldMinimapLines[oldIndex] < fromViewLineNumber) {
                if (events.length < MAX_EVENT_COUNT) {
                    const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                    if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
                        lastEvent.deleteToLineNumber++;
                    }
                    else {
                        lastEvent = {
                            type: 'deleted',
                            _oldIndex: oldIndex,
                            deleteFromLineNumber: oldMinimapLineNumber,
                            deleteToLineNumber: oldMinimapLineNumber,
                        };
                        events.push(lastEvent);
                    }
                    oldDeltaLineCount--;
                }
                oldIndex++;
            }
            let selectedViewLineNumber;
            if (oldIndex < oldLength && oldMinimapLines[oldIndex] <= toViewLineNumber) {
                // reuse the old sampled line
                selectedViewLineNumber = oldMinimapLines[oldIndex];
                oldIndex++;
            }
            else {
                if (i === 0) {
                    selectedViewLineNumber = 1;
                }
                else if (i + 1 === minimapLineCount) {
                    selectedViewLineNumber = viewLineCount;
                }
                else {
                    selectedViewLineNumber = Math.round(i * ratio + halfRatio);
                }
                if (events.length < MAX_EVENT_COUNT) {
                    const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                    if (lastEvent && lastEvent.type === 'inserted' && lastEvent._i === i - 1) {
                        lastEvent.insertToLineNumber++;
                    }
                    else {
                        lastEvent = {
                            type: 'inserted',
                            _i: i,
                            insertFromLineNumber: oldMinimapLineNumber,
                            insertToLineNumber: oldMinimapLineNumber,
                        };
                        events.push(lastEvent);
                    }
                    oldDeltaLineCount++;
                }
            }
            result[i] = selectedViewLineNumber;
            minViewLineNumber = selectedViewLineNumber;
        }
        if (events.length < MAX_EVENT_COUNT) {
            while (oldIndex < oldLength) {
                const oldMinimapLineNumber = oldIndex + 1 + oldDeltaLineCount;
                if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
                    lastEvent.deleteToLineNumber++;
                }
                else {
                    lastEvent = {
                        type: 'deleted',
                        _oldIndex: oldIndex,
                        deleteFromLineNumber: oldMinimapLineNumber,
                        deleteToLineNumber: oldMinimapLineNumber,
                    };
                    events.push(lastEvent);
                }
                oldDeltaLineCount--;
                oldIndex++;
            }
        }
        else {
            // too many events, just give up
            events = [{ type: 'flush' }];
        }
        return [new MinimapSamplingState(ratio, result), events];
    }
    constructor(samplingRatio, minimapLines) {
        this.samplingRatio = samplingRatio;
        this.minimapLines = minimapLines;
    }
    modelLineToMinimapLine(lineNumber) {
        return Math.min(this.minimapLines.length, Math.max(1, Math.round(lineNumber / this.samplingRatio)));
    }
    /**
     * Will return null if the model line ranges are not intersecting with a sampled model line.
     */
    modelLineRangeToMinimapLineRange(fromLineNumber, toLineNumber) {
        let fromLineIndex = this.modelLineToMinimapLine(fromLineNumber) - 1;
        while (fromLineIndex > 0 && this.minimapLines[fromLineIndex - 1] >= fromLineNumber) {
            fromLineIndex--;
        }
        let toLineIndex = this.modelLineToMinimapLine(toLineNumber) - 1;
        while (toLineIndex + 1 < this.minimapLines.length &&
            this.minimapLines[toLineIndex + 1] <= toLineNumber) {
            toLineIndex++;
        }
        if (fromLineIndex === toLineIndex) {
            const sampledLineNumber = this.minimapLines[fromLineIndex];
            if (sampledLineNumber < fromLineNumber || sampledLineNumber > toLineNumber) {
                // This line is not part of the sampled lines ==> nothing to do
                return null;
            }
        }
        return [fromLineIndex + 1, toLineIndex + 1];
    }
    /**
     * Will always return a range, even if it is not intersecting with a sampled model line.
     */
    decorationLineRangeToMinimapLineRange(startLineNumber, endLineNumber) {
        let minimapLineStart = this.modelLineToMinimapLine(startLineNumber);
        let minimapLineEnd = this.modelLineToMinimapLine(endLineNumber);
        if (startLineNumber !== endLineNumber && minimapLineEnd === minimapLineStart) {
            if (minimapLineEnd === this.minimapLines.length) {
                if (minimapLineStart > 1) {
                    minimapLineStart--;
                }
            }
            else {
                minimapLineEnd++;
            }
        }
        return [minimapLineStart, minimapLineEnd];
    }
    onLinesDeleted(e) {
        // have the mapping be sticky
        const deletedLineCount = e.toLineNumber - e.fromLineNumber + 1;
        let changeStartIndex = this.minimapLines.length;
        let changeEndIndex = 0;
        for (let i = this.minimapLines.length - 1; i >= 0; i--) {
            if (this.minimapLines[i] < e.fromLineNumber) {
                break;
            }
            if (this.minimapLines[i] <= e.toLineNumber) {
                // this line got deleted => move to previous available
                this.minimapLines[i] = Math.max(1, e.fromLineNumber - 1);
                changeStartIndex = Math.min(changeStartIndex, i);
                changeEndIndex = Math.max(changeEndIndex, i);
            }
            else {
                this.minimapLines[i] -= deletedLineCount;
            }
        }
        return [changeStartIndex, changeEndIndex];
    }
    onLinesInserted(e) {
        // have the mapping be sticky
        const insertedLineCount = e.toLineNumber - e.fromLineNumber + 1;
        for (let i = this.minimapLines.length - 1; i >= 0; i--) {
            if (this.minimapLines[i] < e.fromLineNumber) {
                break;
            }
            this.minimapLines[i] += insertedLineCount;
        }
    }
}
/**
 * The minimap appears beside the editor scroll bar and visualizes a zoomed out
 * view of the file.
 */
export class Minimap extends ViewPart {
    constructor(context) {
        super(context);
        this._sectionHeaderCache = new LRUCache(10, 1.5);
        this.tokensColorTracker = MinimapTokensColorTracker.getInstance();
        this._selections = [];
        this._minimapSelections = null;
        this.options = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
        const [samplingState] = MinimapSamplingState.compute(this.options, this._context.viewModel.getLineCount(), null);
        this._samplingState = samplingState;
        this._shouldCheckSampling = false;
        this._actual = new InnerMinimap(context.theme, this);
    }
    dispose() {
        this._actual.dispose();
        super.dispose();
    }
    getDomNode() {
        return this._actual.getDomNode();
    }
    _onOptionsMaybeChanged() {
        const opts = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
        if (this.options.equals(opts)) {
            return false;
        }
        this.options = opts;
        this._recreateLineSampling();
        this._actual.onDidChangeOptions();
        return true;
    }
    // ---- begin view event handlers
    onConfigurationChanged(e) {
        return this._onOptionsMaybeChanged();
    }
    onCursorStateChanged(e) {
        this._selections = e.selections;
        this._minimapSelections = null;
        return this._actual.onSelectionChanged();
    }
    onDecorationsChanged(e) {
        if (e.affectsMinimap) {
            return this._actual.onDecorationsChanged();
        }
        return false;
    }
    onFlushed(e) {
        if (this._samplingState) {
            this._shouldCheckSampling = true;
        }
        return this._actual.onFlushed();
    }
    onLinesChanged(e) {
        if (this._samplingState) {
            const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(e.fromLineNumber, e.fromLineNumber + e.count - 1);
            if (minimapLineRange) {
                return this._actual.onLinesChanged(minimapLineRange[0], minimapLineRange[1] - minimapLineRange[0] + 1);
            }
            else {
                return false;
            }
        }
        else {
            return this._actual.onLinesChanged(e.fromLineNumber, e.count);
        }
    }
    onLinesDeleted(e) {
        if (this._samplingState) {
            const [changeStartIndex, changeEndIndex] = this._samplingState.onLinesDeleted(e);
            if (changeStartIndex <= changeEndIndex) {
                this._actual.onLinesChanged(changeStartIndex + 1, changeEndIndex - changeStartIndex + 1);
            }
            this._shouldCheckSampling = true;
            return true;
        }
        else {
            return this._actual.onLinesDeleted(e.fromLineNumber, e.toLineNumber);
        }
    }
    onLinesInserted(e) {
        if (this._samplingState) {
            this._samplingState.onLinesInserted(e);
            this._shouldCheckSampling = true;
            return true;
        }
        else {
            return this._actual.onLinesInserted(e.fromLineNumber, e.toLineNumber);
        }
    }
    onScrollChanged(e) {
        return this._actual.onScrollChanged();
    }
    onThemeChanged(e) {
        this._actual.onThemeChanged();
        this._onOptionsMaybeChanged();
        return true;
    }
    onTokensChanged(e) {
        if (this._samplingState) {
            const ranges = [];
            for (const range of e.ranges) {
                const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(range.fromLineNumber, range.toLineNumber);
                if (minimapLineRange) {
                    ranges.push({ fromLineNumber: minimapLineRange[0], toLineNumber: minimapLineRange[1] });
                }
            }
            if (ranges.length) {
                return this._actual.onTokensChanged(ranges);
            }
            else {
                return false;
            }
        }
        else {
            return this._actual.onTokensChanged(e.ranges);
        }
    }
    onTokensColorsChanged(e) {
        this._onOptionsMaybeChanged();
        return this._actual.onTokensColorsChanged();
    }
    onZonesChanged(e) {
        return this._actual.onZonesChanged();
    }
    // --- end event handlers
    prepareRender(ctx) {
        if (this._shouldCheckSampling) {
            this._shouldCheckSampling = false;
            this._recreateLineSampling();
        }
    }
    render(ctx) {
        let viewportStartLineNumber = ctx.visibleRange.startLineNumber;
        let viewportEndLineNumber = ctx.visibleRange.endLineNumber;
        if (this._samplingState) {
            viewportStartLineNumber = this._samplingState.modelLineToMinimapLine(viewportStartLineNumber);
            viewportEndLineNumber = this._samplingState.modelLineToMinimapLine(viewportEndLineNumber);
        }
        const minimapCtx = {
            viewportContainsWhitespaceGaps: ctx.viewportData.whitespaceViewportData.length > 0,
            scrollWidth: ctx.scrollWidth,
            scrollHeight: ctx.scrollHeight,
            viewportStartLineNumber: viewportStartLineNumber,
            viewportEndLineNumber: viewportEndLineNumber,
            viewportStartLineNumberVerticalOffset: ctx.getVerticalOffsetForLineNumber(viewportStartLineNumber),
            scrollTop: ctx.scrollTop,
            scrollLeft: ctx.scrollLeft,
            viewportWidth: ctx.viewportWidth,
            viewportHeight: ctx.viewportHeight,
        };
        this._actual.render(minimapCtx);
    }
    //#region IMinimapModel
    _recreateLineSampling() {
        this._minimapSelections = null;
        const wasSampling = Boolean(this._samplingState);
        const [samplingState, events] = MinimapSamplingState.compute(this.options, this._context.viewModel.getLineCount(), this._samplingState);
        this._samplingState = samplingState;
        if (wasSampling && this._samplingState) {
            // was sampling, is sampling
            for (const event of events) {
                switch (event.type) {
                    case 'deleted':
                        this._actual.onLinesDeleted(event.deleteFromLineNumber, event.deleteToLineNumber);
                        break;
                    case 'inserted':
                        this._actual.onLinesInserted(event.insertFromLineNumber, event.insertToLineNumber);
                        break;
                    case 'flush':
                        this._actual.onFlushed();
                        break;
                }
            }
        }
    }
    getLineCount() {
        if (this._samplingState) {
            return this._samplingState.minimapLines.length;
        }
        return this._context.viewModel.getLineCount();
    }
    getRealLineCount() {
        return this._context.viewModel.getLineCount();
    }
    getLineContent(lineNumber) {
        if (this._samplingState) {
            return this._context.viewModel.getLineContent(this._samplingState.minimapLines[lineNumber - 1]);
        }
        return this._context.viewModel.getLineContent(lineNumber);
    }
    getLineMaxColumn(lineNumber) {
        if (this._samplingState) {
            return this._context.viewModel.getLineMaxColumn(this._samplingState.minimapLines[lineNumber - 1]);
        }
        return this._context.viewModel.getLineMaxColumn(lineNumber);
    }
    getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed) {
        if (this._samplingState) {
            const result = [];
            for (let lineIndex = 0, lineCount = endLineNumber - startLineNumber + 1; lineIndex < lineCount; lineIndex++) {
                if (needed[lineIndex]) {
                    result[lineIndex] = this._context.viewModel.getViewLineData(this._samplingState.minimapLines[startLineNumber + lineIndex - 1]);
                }
                else {
                    result[lineIndex] = null;
                }
            }
            return result;
        }
        return this._context.viewModel.getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed).data;
    }
    getSelections() {
        if (this._minimapSelections === null) {
            if (this._samplingState) {
                this._minimapSelections = [];
                for (const selection of this._selections) {
                    const [minimapLineStart, minimapLineEnd] = this._samplingState.decorationLineRangeToMinimapLineRange(selection.startLineNumber, selection.endLineNumber);
                    this._minimapSelections.push(new Selection(minimapLineStart, selection.startColumn, minimapLineEnd, selection.endColumn));
                }
            }
            else {
                this._minimapSelections = this._selections;
            }
        }
        return this._minimapSelections;
    }
    getMinimapDecorationsInViewport(startLineNumber, endLineNumber) {
        return this._getMinimapDecorationsInViewport(startLineNumber, endLineNumber).filter((decoration) => !decoration.options.minimap?.sectionHeaderStyle);
    }
    getSectionHeaderDecorationsInViewport(startLineNumber, endLineNumber) {
        const headerHeightInMinimapLines = this.options.sectionHeaderFontSize / this.options.minimapLineHeight;
        startLineNumber = Math.floor(Math.max(1, startLineNumber - headerHeightInMinimapLines));
        return this._getMinimapDecorationsInViewport(startLineNumber, endLineNumber).filter((decoration) => !!decoration.options.minimap?.sectionHeaderStyle);
    }
    _getMinimapDecorationsInViewport(startLineNumber, endLineNumber) {
        let visibleRange;
        if (this._samplingState) {
            const modelStartLineNumber = this._samplingState.minimapLines[startLineNumber - 1];
            const modelEndLineNumber = this._samplingState.minimapLines[endLineNumber - 1];
            visibleRange = new Range(modelStartLineNumber, 1, modelEndLineNumber, this._context.viewModel.getLineMaxColumn(modelEndLineNumber));
        }
        else {
            visibleRange = new Range(startLineNumber, 1, endLineNumber, this._context.viewModel.getLineMaxColumn(endLineNumber));
        }
        const decorations = this._context.viewModel.getMinimapDecorationsInRange(visibleRange);
        if (this._samplingState) {
            const result = [];
            for (const decoration of decorations) {
                if (!decoration.options.minimap) {
                    continue;
                }
                const range = decoration.range;
                const minimapStartLineNumber = this._samplingState.modelLineToMinimapLine(range.startLineNumber);
                const minimapEndLineNumber = this._samplingState.modelLineToMinimapLine(range.endLineNumber);
                result.push(new ViewModelDecoration(new Range(minimapStartLineNumber, range.startColumn, minimapEndLineNumber, range.endColumn), decoration.options));
            }
            return result;
        }
        return decorations;
    }
    getSectionHeaderText(decoration, fitWidth) {
        const headerText = decoration.options.minimap?.sectionHeaderText;
        if (!headerText) {
            return null;
        }
        const cachedText = this._sectionHeaderCache.get(headerText);
        if (cachedText) {
            return cachedText;
        }
        const fittedText = fitWidth(headerText);
        this._sectionHeaderCache.set(headerText, fittedText);
        return fittedText;
    }
    getOptions() {
        return this._context.viewModel.model.getOptions();
    }
    revealLineNumber(lineNumber) {
        if (this._samplingState) {
            lineNumber = this._samplingState.minimapLines[lineNumber - 1];
        }
        this._context.viewModel.revealRange('mouse', false, new Range(lineNumber, 1, lineNumber, 1), 1 /* viewEvents.VerticalRevealType.Center */, 0 /* ScrollType.Smooth */);
    }
    setScrollTop(scrollTop) {
        this._context.viewModel.viewLayout.setScrollPosition({
            scrollTop: scrollTop,
        }, 1 /* ScrollType.Immediate */);
    }
}
class InnerMinimap extends Disposable {
    constructor(theme, model) {
        super();
        this._renderDecorations = false;
        this._gestureInProgress = false;
        this._theme = theme;
        this._model = model;
        this._lastRenderData = null;
        this._buffers = null;
        this._selectionColor = this._theme.getColor(minimapSelection);
        this._domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this._domNode, 9 /* PartFingerprint.Minimap */);
        this._domNode.setClassName(this._getMinimapDomNodeClassName());
        this._domNode.setPosition('absolute');
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._shadow = createFastDomNode(document.createElement('div'));
        this._shadow.setClassName('minimap-shadow-hidden');
        this._domNode.appendChild(this._shadow);
        this._canvas = createFastDomNode(document.createElement('canvas'));
        this._canvas.setPosition('absolute');
        this._canvas.setLeft(0);
        this._domNode.appendChild(this._canvas);
        this._decorationsCanvas = createFastDomNode(document.createElement('canvas'));
        this._decorationsCanvas.setPosition('absolute');
        this._decorationsCanvas.setClassName('minimap-decorations-layer');
        this._decorationsCanvas.setLeft(0);
        this._domNode.appendChild(this._decorationsCanvas);
        this._slider = createFastDomNode(document.createElement('div'));
        this._slider.setPosition('absolute');
        this._slider.setClassName('minimap-slider');
        this._slider.setLayerHinting(true);
        this._slider.setContain('strict');
        this._domNode.appendChild(this._slider);
        this._sliderHorizontal = createFastDomNode(document.createElement('div'));
        this._sliderHorizontal.setPosition('absolute');
        this._sliderHorizontal.setClassName('minimap-slider-horizontal');
        this._slider.appendChild(this._sliderHorizontal);
        this._applyLayout();
        this._pointerDownListener = dom.addStandardDisposableListener(this._domNode.domNode, dom.EventType.POINTER_DOWN, (e) => {
            e.preventDefault();
            const renderMinimap = this._model.options.renderMinimap;
            if (renderMinimap === 0 /* RenderMinimap.None */) {
                return;
            }
            if (!this._lastRenderData) {
                return;
            }
            if (this._model.options.size !== 'proportional') {
                if (e.button === 0 && this._lastRenderData) {
                    // pretend the click occurred in the center of the slider
                    const position = dom.getDomNodePagePosition(this._slider.domNode);
                    const initialPosY = position.top + position.height / 2;
                    this._startSliderDragging(e, initialPosY, this._lastRenderData.renderedLayout);
                }
                return;
            }
            const minimapLineHeight = this._model.options.minimapLineHeight;
            const internalOffsetY = (this._model.options.canvasInnerHeight / this._model.options.canvasOuterHeight) *
                e.offsetY;
            const lineIndex = Math.floor(internalOffsetY / minimapLineHeight);
            let lineNumber = lineIndex +
                this._lastRenderData.renderedLayout.startLineNumber -
                this._lastRenderData.renderedLayout.topPaddingLineCount;
            lineNumber = Math.min(lineNumber, this._model.getLineCount());
            this._model.revealLineNumber(lineNumber);
        });
        this._sliderPointerMoveMonitor = new GlobalPointerMoveMonitor();
        this._sliderPointerDownListener = dom.addStandardDisposableListener(this._slider.domNode, dom.EventType.POINTER_DOWN, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.button === 0 && this._lastRenderData) {
                this._startSliderDragging(e, e.pageY, this._lastRenderData.renderedLayout);
            }
        });
        this._gestureDisposable = Gesture.addTarget(this._domNode.domNode);
        this._sliderTouchStartListener = dom.addDisposableListener(this._domNode.domNode, EventType.Start, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._lastRenderData) {
                this._slider.toggleClassName('active', true);
                this._gestureInProgress = true;
                this.scrollDueToTouchEvent(e);
            }
        }, { passive: false });
        this._sliderTouchMoveListener = dom.addDisposableListener(this._domNode.domNode, EventType.Change, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this._lastRenderData && this._gestureInProgress) {
                this.scrollDueToTouchEvent(e);
            }
        }, { passive: false });
        this._sliderTouchEndListener = dom.addStandardDisposableListener(this._domNode.domNode, EventType.End, (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._gestureInProgress = false;
            this._slider.toggleClassName('active', false);
        });
    }
    _startSliderDragging(e, initialPosY, initialSliderState) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const initialPosX = e.pageX;
        this._slider.toggleClassName('active', true);
        const handlePointerMove = (posy, posx) => {
            const minimapPosition = dom.getDomNodePagePosition(this._domNode.domNode);
            const pointerOrthogonalDelta = Math.min(Math.abs(posx - initialPosX), Math.abs(posx - minimapPosition.left), Math.abs(posx - minimapPosition.left - minimapPosition.width));
            if (platform.isWindows && pointerOrthogonalDelta > POINTER_DRAG_RESET_DISTANCE) {
                // The pointer has wondered away from the scrollbar => reset dragging
                this._model.setScrollTop(initialSliderState.scrollTop);
                return;
            }
            const pointerDelta = posy - initialPosY;
            this._model.setScrollTop(initialSliderState.getDesiredScrollTopFromDelta(pointerDelta));
        };
        if (e.pageY !== initialPosY) {
            handlePointerMove(e.pageY, initialPosX);
        }
        this._sliderPointerMoveMonitor.startMonitoring(e.target, e.pointerId, e.buttons, (pointerMoveData) => handlePointerMove(pointerMoveData.pageY, pointerMoveData.pageX), () => {
            this._slider.toggleClassName('active', false);
        });
    }
    scrollDueToTouchEvent(touch) {
        const startY = this._domNode.domNode.getBoundingClientRect().top;
        const scrollTop = this._lastRenderData.renderedLayout.getDesiredScrollTopFromTouchLocation(touch.pageY - startY);
        this._model.setScrollTop(scrollTop);
    }
    dispose() {
        this._pointerDownListener.dispose();
        this._sliderPointerMoveMonitor.dispose();
        this._sliderPointerDownListener.dispose();
        this._gestureDisposable.dispose();
        this._sliderTouchStartListener.dispose();
        this._sliderTouchMoveListener.dispose();
        this._sliderTouchEndListener.dispose();
        super.dispose();
    }
    _getMinimapDomNodeClassName() {
        const class_ = ['minimap'];
        if (this._model.options.showSlider === 'always') {
            class_.push('slider-always');
        }
        else {
            class_.push('slider-mouseover');
        }
        if (this._model.options.autohide) {
            class_.push('autohide');
        }
        return class_.join(' ');
    }
    getDomNode() {
        return this._domNode;
    }
    _applyLayout() {
        this._domNode.setLeft(this._model.options.minimapLeft);
        this._domNode.setWidth(this._model.options.minimapWidth);
        this._domNode.setHeight(this._model.options.minimapHeight);
        this._shadow.setHeight(this._model.options.minimapHeight);
        this._canvas.setWidth(this._model.options.canvasOuterWidth);
        this._canvas.setHeight(this._model.options.canvasOuterHeight);
        this._canvas.domNode.width = this._model.options.canvasInnerWidth;
        this._canvas.domNode.height = this._model.options.canvasInnerHeight;
        this._decorationsCanvas.setWidth(this._model.options.canvasOuterWidth);
        this._decorationsCanvas.setHeight(this._model.options.canvasOuterHeight);
        this._decorationsCanvas.domNode.width = this._model.options.canvasInnerWidth;
        this._decorationsCanvas.domNode.height = this._model.options.canvasInnerHeight;
        this._slider.setWidth(this._model.options.minimapWidth);
    }
    _getBuffer() {
        if (!this._buffers) {
            if (this._model.options.canvasInnerWidth > 0 && this._model.options.canvasInnerHeight > 0) {
                this._buffers = new MinimapBuffers(this._canvas.domNode.getContext('2d'), this._model.options.canvasInnerWidth, this._model.options.canvasInnerHeight, this._model.options.backgroundColor);
            }
        }
        return this._buffers ? this._buffers.getBuffer() : null;
    }
    // ---- begin view event handlers
    onDidChangeOptions() {
        this._lastRenderData = null;
        this._buffers = null;
        this._applyLayout();
        this._domNode.setClassName(this._getMinimapDomNodeClassName());
    }
    onSelectionChanged() {
        this._renderDecorations = true;
        return true;
    }
    onDecorationsChanged() {
        this._renderDecorations = true;
        return true;
    }
    onFlushed() {
        this._lastRenderData = null;
        return true;
    }
    onLinesChanged(changeFromLineNumber, changeCount) {
        if (this._lastRenderData) {
            return this._lastRenderData.onLinesChanged(changeFromLineNumber, changeCount);
        }
        return false;
    }
    onLinesDeleted(deleteFromLineNumber, deleteToLineNumber) {
        this._lastRenderData?.onLinesDeleted(deleteFromLineNumber, deleteToLineNumber);
        return true;
    }
    onLinesInserted(insertFromLineNumber, insertToLineNumber) {
        this._lastRenderData?.onLinesInserted(insertFromLineNumber, insertToLineNumber);
        return true;
    }
    onScrollChanged() {
        this._renderDecorations = true;
        return true;
    }
    onThemeChanged() {
        this._selectionColor = this._theme.getColor(minimapSelection);
        this._renderDecorations = true;
        return true;
    }
    onTokensChanged(ranges) {
        if (this._lastRenderData) {
            return this._lastRenderData.onTokensChanged(ranges);
        }
        return false;
    }
    onTokensColorsChanged() {
        this._lastRenderData = null;
        this._buffers = null;
        return true;
    }
    onZonesChanged() {
        this._lastRenderData = null;
        return true;
    }
    // --- end event handlers
    render(renderingCtx) {
        const renderMinimap = this._model.options.renderMinimap;
        if (renderMinimap === 0 /* RenderMinimap.None */) {
            this._shadow.setClassName('minimap-shadow-hidden');
            this._sliderHorizontal.setWidth(0);
            this._sliderHorizontal.setHeight(0);
            return;
        }
        if (renderingCtx.scrollLeft + renderingCtx.viewportWidth >= renderingCtx.scrollWidth) {
            this._shadow.setClassName('minimap-shadow-hidden');
        }
        else {
            this._shadow.setClassName('minimap-shadow-visible');
        }
        const layout = MinimapLayout.create(this._model.options, renderingCtx.viewportStartLineNumber, renderingCtx.viewportEndLineNumber, renderingCtx.viewportStartLineNumberVerticalOffset, renderingCtx.viewportHeight, renderingCtx.viewportContainsWhitespaceGaps, this._model.getLineCount(), this._model.getRealLineCount(), renderingCtx.scrollTop, renderingCtx.scrollHeight, this._lastRenderData ? this._lastRenderData.renderedLayout : null);
        this._slider.setDisplay(layout.sliderNeeded ? 'block' : 'none');
        this._slider.setTop(layout.sliderTop);
        this._slider.setHeight(layout.sliderHeight);
        // Compute horizontal slider coordinates
        this._sliderHorizontal.setLeft(0);
        this._sliderHorizontal.setWidth(this._model.options.minimapWidth);
        this._sliderHorizontal.setTop(0);
        this._sliderHorizontal.setHeight(layout.sliderHeight);
        this.renderDecorations(layout);
        this._lastRenderData = this.renderLines(layout);
    }
    renderDecorations(layout) {
        if (this._renderDecorations) {
            this._renderDecorations = false;
            const selections = this._model.getSelections();
            selections.sort(Range.compareRangesUsingStarts);
            const decorations = this._model.getMinimapDecorationsInViewport(layout.startLineNumber, layout.endLineNumber);
            decorations.sort((a, b) => (a.options.zIndex || 0) - (b.options.zIndex || 0));
            const { canvasInnerWidth, canvasInnerHeight } = this._model.options;
            const minimapLineHeight = this._model.options.minimapLineHeight;
            const minimapCharWidth = this._model.options.minimapCharWidth;
            const tabSize = this._model.getOptions().tabSize;
            const canvasContext = this._decorationsCanvas.domNode.getContext('2d');
            canvasContext.clearRect(0, 0, canvasInnerWidth, canvasInnerHeight);
            // We first need to render line highlights and then render decorations on top of those.
            // But we need to pick a single color for each line, and use that as a line highlight.
            // This needs to be the color of the decoration with the highest `zIndex`, but priority
            // is given to the selection.
            const highlightedLines = new ContiguousLineMap(layout.startLineNumber, layout.endLineNumber, false);
            this._renderSelectionLineHighlights(canvasContext, selections, highlightedLines, layout, minimapLineHeight);
            this._renderDecorationsLineHighlights(canvasContext, decorations, highlightedLines, layout, minimapLineHeight);
            const lineOffsetMap = new ContiguousLineMap(layout.startLineNumber, layout.endLineNumber, null);
            this._renderSelectionsHighlights(canvasContext, selections, lineOffsetMap, layout, minimapLineHeight, tabSize, minimapCharWidth, canvasInnerWidth);
            this._renderDecorationsHighlights(canvasContext, decorations, lineOffsetMap, layout, minimapLineHeight, tabSize, minimapCharWidth, canvasInnerWidth);
            this._renderSectionHeaders(layout);
        }
    }
    _renderSelectionLineHighlights(canvasContext, selections, highlightedLines, layout, minimapLineHeight) {
        if (!this._selectionColor || this._selectionColor.isTransparent()) {
            return;
        }
        canvasContext.fillStyle = this._selectionColor.transparent(0.5).toString();
        let y1 = 0;
        let y2 = 0;
        for (const selection of selections) {
            const intersection = layout.intersectWithViewport(selection);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                highlightedLines.set(line, true);
            }
            const yy1 = layout.getYForLineNumber(startLineNumber, minimapLineHeight);
            const yy2 = layout.getYForLineNumber(endLineNumber, minimapLineHeight);
            if (y2 >= yy1) {
                // merge into previous
                y2 = yy2;
            }
            else {
                if (y2 > y1) {
                    // flush
                    canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y1, canvasContext.canvas.width, y2 - y1);
                }
                y1 = yy1;
                y2 = yy2;
            }
        }
        if (y2 > y1) {
            // flush
            canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y1, canvasContext.canvas.width, y2 - y1);
        }
    }
    _renderDecorationsLineHighlights(canvasContext, decorations, highlightedLines, layout, minimapLineHeight) {
        const highlightColors = new Map();
        // Loop backwards to hit first decorations with higher `zIndex`
        for (let i = decorations.length - 1; i >= 0; i--) {
            const decoration = decorations[i];
            const minimapOptions = (decoration.options.minimap);
            if (!minimapOptions || minimapOptions.position !== 1 /* MinimapPosition.Inline */) {
                continue;
            }
            const intersection = layout.intersectWithViewport(decoration.range);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            const decorationColor = minimapOptions.getColor(this._theme.value);
            if (!decorationColor || decorationColor.isTransparent()) {
                continue;
            }
            let highlightColor = highlightColors.get(decorationColor.toString());
            if (!highlightColor) {
                highlightColor = decorationColor.transparent(0.5).toString();
                highlightColors.set(decorationColor.toString(), highlightColor);
            }
            canvasContext.fillStyle = highlightColor;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                if (highlightedLines.has(line)) {
                    continue;
                }
                highlightedLines.set(line, true);
                const y = layout.getYForLineNumber(startLineNumber, minimapLineHeight);
                canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y, canvasContext.canvas.width, minimapLineHeight);
            }
        }
    }
    _renderSelectionsHighlights(canvasContext, selections, lineOffsetMap, layout, lineHeight, tabSize, characterWidth, canvasInnerWidth) {
        if (!this._selectionColor || this._selectionColor.isTransparent()) {
            return;
        }
        for (const selection of selections) {
            const intersection = layout.intersectWithViewport(selection);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                this.renderDecorationOnLine(canvasContext, lineOffsetMap, selection, this._selectionColor, layout, line, lineHeight, lineHeight, tabSize, characterWidth, canvasInnerWidth);
            }
        }
    }
    _renderDecorationsHighlights(canvasContext, decorations, lineOffsetMap, layout, minimapLineHeight, tabSize, characterWidth, canvasInnerWidth) {
        // Loop forwards to hit first decorations with lower `zIndex`
        for (const decoration of decorations) {
            const minimapOptions = (decoration.options.minimap);
            if (!minimapOptions) {
                continue;
            }
            const intersection = layout.intersectWithViewport(decoration.range);
            if (!intersection) {
                // entirely outside minimap's viewport
                continue;
            }
            const [startLineNumber, endLineNumber] = intersection;
            const decorationColor = minimapOptions.getColor(this._theme.value);
            if (!decorationColor || decorationColor.isTransparent()) {
                continue;
            }
            for (let line = startLineNumber; line <= endLineNumber; line++) {
                switch (minimapOptions.position) {
                    case 1 /* MinimapPosition.Inline */:
                        this.renderDecorationOnLine(canvasContext, lineOffsetMap, decoration.range, decorationColor, layout, line, minimapLineHeight, minimapLineHeight, tabSize, characterWidth, canvasInnerWidth);
                        continue;
                    case 2 /* MinimapPosition.Gutter */: {
                        const y = layout.getYForLineNumber(line, minimapLineHeight);
                        const x = 2;
                        this.renderDecoration(canvasContext, decorationColor, x, y, GUTTER_DECORATION_WIDTH, minimapLineHeight);
                        continue;
                    }
                }
            }
        }
    }
    renderDecorationOnLine(canvasContext, lineOffsetMap, decorationRange, decorationColor, layout, lineNumber, height, minimapLineHeight, tabSize, charWidth, canvasInnerWidth) {
        const y = layout.getYForLineNumber(lineNumber, minimapLineHeight);
        // Skip rendering the line if it's vertically outside our viewport
        if (y + height < 0 || y > this._model.options.canvasInnerHeight) {
            return;
        }
        const { startLineNumber, endLineNumber } = decorationRange;
        const startColumn = startLineNumber === lineNumber ? decorationRange.startColumn : 1;
        const endColumn = endLineNumber === lineNumber
            ? decorationRange.endColumn
            : this._model.getLineMaxColumn(lineNumber);
        const x1 = this.getXOffsetForPosition(lineOffsetMap, lineNumber, startColumn, tabSize, charWidth, canvasInnerWidth);
        const x2 = this.getXOffsetForPosition(lineOffsetMap, lineNumber, endColumn, tabSize, charWidth, canvasInnerWidth);
        this.renderDecoration(canvasContext, decorationColor, x1, y, x2 - x1, height);
    }
    getXOffsetForPosition(lineOffsetMap, lineNumber, column, tabSize, charWidth, canvasInnerWidth) {
        if (column === 1) {
            return MINIMAP_GUTTER_WIDTH;
        }
        const minimumXOffset = (column - 1) * charWidth;
        if (minimumXOffset >= canvasInnerWidth) {
            // there is no need to look at actual characters,
            // as this column is certainly after the minimap width
            return canvasInnerWidth;
        }
        // Cache line offset data so that it is only read once per line
        let lineIndexToXOffset = lineOffsetMap.get(lineNumber);
        if (!lineIndexToXOffset) {
            const lineData = this._model.getLineContent(lineNumber);
            lineIndexToXOffset = [MINIMAP_GUTTER_WIDTH];
            let prevx = MINIMAP_GUTTER_WIDTH;
            for (let i = 1; i < lineData.length + 1; i++) {
                const charCode = lineData.charCodeAt(i - 1);
                const dx = charCode === 9 /* CharCode.Tab */
                    ? tabSize * charWidth
                    : strings.isFullWidthCharacter(charCode)
                        ? 2 * charWidth
                        : charWidth;
                const x = prevx + dx;
                if (x >= canvasInnerWidth) {
                    // no need to keep on going, as we've hit the canvas width
                    lineIndexToXOffset[i] = canvasInnerWidth;
                    break;
                }
                lineIndexToXOffset[i] = x;
                prevx = x;
            }
            lineOffsetMap.set(lineNumber, lineIndexToXOffset);
        }
        if (column - 1 < lineIndexToXOffset.length) {
            return lineIndexToXOffset[column - 1];
        }
        // goes over the canvas width
        return canvasInnerWidth;
    }
    renderDecoration(canvasContext, decorationColor, x, y, width, height) {
        canvasContext.fillStyle = (decorationColor && decorationColor.toString()) || '';
        canvasContext.fillRect(x, y, width, height);
    }
    _renderSectionHeaders(layout) {
        const minimapLineHeight = this._model.options.minimapLineHeight;
        const sectionHeaderFontSize = this._model.options.sectionHeaderFontSize;
        const sectionHeaderLetterSpacing = this._model.options.sectionHeaderLetterSpacing;
        const backgroundFillHeight = sectionHeaderFontSize * 1.5;
        const { canvasInnerWidth } = this._model.options;
        const backgroundColor = this._model.options.backgroundColor;
        const backgroundFill = `rgb(${backgroundColor.r} ${backgroundColor.g} ${backgroundColor.b} / .7)`;
        const foregroundColor = this._model.options.sectionHeaderFontColor;
        const foregroundFill = `rgb(${foregroundColor.r} ${foregroundColor.g} ${foregroundColor.b})`;
        const separatorStroke = foregroundFill;
        const canvasContext = this._decorationsCanvas.domNode.getContext('2d');
        canvasContext.letterSpacing = sectionHeaderLetterSpacing + 'px';
        canvasContext.font =
            '500 ' + sectionHeaderFontSize + 'px ' + this._model.options.sectionHeaderFontFamily;
        canvasContext.strokeStyle = separatorStroke;
        canvasContext.lineWidth = 0.2;
        const decorations = this._model.getSectionHeaderDecorationsInViewport(layout.startLineNumber, layout.endLineNumber);
        decorations.sort((a, b) => a.range.startLineNumber - b.range.startLineNumber);
        const fitWidth = InnerMinimap._fitSectionHeader.bind(null, canvasContext, canvasInnerWidth - MINIMAP_GUTTER_WIDTH);
        for (const decoration of decorations) {
            const y = layout.getYForLineNumber(decoration.range.startLineNumber, minimapLineHeight) +
                sectionHeaderFontSize;
            const backgroundFillY = y - sectionHeaderFontSize;
            const separatorY = backgroundFillY + 2;
            const headerText = this._model.getSectionHeaderText(decoration, fitWidth);
            InnerMinimap._renderSectionLabel(canvasContext, headerText, decoration.options.minimap?.sectionHeaderStyle === 2 /* MinimapSectionHeaderStyle.Underlined */, backgroundFill, foregroundFill, canvasInnerWidth, backgroundFillY, backgroundFillHeight, y, separatorY);
        }
    }
    static _fitSectionHeader(target, maxWidth, headerText) {
        if (!headerText) {
            return headerText;
        }
        const ellipsis = '…';
        const width = target.measureText(headerText).width;
        const ellipsisWidth = target.measureText(ellipsis).width;
        if (width <= maxWidth || width <= ellipsisWidth) {
            return headerText;
        }
        const len = headerText.length;
        const averageCharWidth = width / headerText.length;
        const maxCharCount = Math.floor((maxWidth - ellipsisWidth) / averageCharWidth) - 1;
        // Find a halfway point that isn't after whitespace
        let halfCharCount = Math.ceil(maxCharCount / 2);
        while (halfCharCount > 0 && /\s/.test(headerText[halfCharCount - 1])) {
            --halfCharCount;
        }
        // Split with ellipsis
        return (headerText.substring(0, halfCharCount) +
            ellipsis +
            headerText.substring(len - (maxCharCount - halfCharCount)));
    }
    static _renderSectionLabel(target, headerText, hasSeparatorLine, backgroundFill, foregroundFill, minimapWidth, backgroundFillY, backgroundFillHeight, textY, separatorY) {
        if (headerText) {
            target.fillStyle = backgroundFill;
            target.fillRect(0, backgroundFillY, minimapWidth, backgroundFillHeight);
            target.fillStyle = foregroundFill;
            target.fillText(headerText, MINIMAP_GUTTER_WIDTH, textY);
        }
        if (hasSeparatorLine) {
            target.beginPath();
            target.moveTo(0, separatorY);
            target.lineTo(minimapWidth, separatorY);
            target.closePath();
            target.stroke();
        }
    }
    renderLines(layout) {
        const startLineNumber = layout.startLineNumber;
        const endLineNumber = layout.endLineNumber;
        const minimapLineHeight = this._model.options.minimapLineHeight;
        // Check if nothing changed w.r.t. lines from last frame
        if (this._lastRenderData && this._lastRenderData.linesEquals(layout)) {
            const _lastData = this._lastRenderData._get();
            // Nice!! Nothing changed from last frame
            return new RenderData(layout, _lastData.imageData, _lastData.lines);
        }
        // Oh well!! We need to repaint some lines...
        const imageData = this._getBuffer();
        if (!imageData) {
            // 0 width or 0 height canvas, nothing to do
            return null;
        }
        // Render untouched lines by using last rendered data.
        const [_dirtyY1, _dirtyY2, needed] = InnerMinimap._renderUntouchedLines(imageData, layout.topPaddingLineCount, startLineNumber, endLineNumber, minimapLineHeight, this._lastRenderData);
        // Fetch rendering info from view model for rest of lines that need rendering.
        const lineInfo = this._model.getMinimapLinesRenderingData(startLineNumber, endLineNumber, needed);
        const tabSize = this._model.getOptions().tabSize;
        const defaultBackground = this._model.options.defaultBackgroundColor;
        const background = this._model.options.backgroundColor;
        const foregroundAlpha = this._model.options.foregroundAlpha;
        const tokensColorTracker = this._model.tokensColorTracker;
        const useLighterFont = tokensColorTracker.backgroundIsLight();
        const renderMinimap = this._model.options.renderMinimap;
        const charRenderer = this._model.options.charRenderer();
        const fontScale = this._model.options.fontScale;
        const minimapCharWidth = this._model.options.minimapCharWidth;
        const baseCharHeight = renderMinimap === 1 /* RenderMinimap.Text */
            ? 2 /* Constants.BASE_CHAR_HEIGHT */
            : 2 /* Constants.BASE_CHAR_HEIGHT */ + 1;
        const renderMinimapLineHeight = baseCharHeight * fontScale;
        const innerLinePadding = minimapLineHeight > renderMinimapLineHeight
            ? Math.floor((minimapLineHeight - renderMinimapLineHeight) / 2)
            : 0;
        // Render the rest of lines
        const backgroundA = background.a / 255;
        const renderBackground = new RGBA8(Math.round((background.r - defaultBackground.r) * backgroundA + defaultBackground.r), Math.round((background.g - defaultBackground.g) * backgroundA + defaultBackground.g), Math.round((background.b - defaultBackground.b) * backgroundA + defaultBackground.b), 255);
        let dy = layout.topPaddingLineCount * minimapLineHeight;
        const renderedLines = [];
        for (let lineIndex = 0, lineCount = endLineNumber - startLineNumber + 1; lineIndex < lineCount; lineIndex++) {
            if (needed[lineIndex]) {
                InnerMinimap._renderLine(imageData, renderBackground, background.a, useLighterFont, renderMinimap, minimapCharWidth, tokensColorTracker, foregroundAlpha, charRenderer, dy, innerLinePadding, tabSize, lineInfo[lineIndex], fontScale, minimapLineHeight);
            }
            renderedLines[lineIndex] = new MinimapLine(dy);
            dy += minimapLineHeight;
        }
        const dirtyY1 = _dirtyY1 === -1 ? 0 : _dirtyY1;
        const dirtyY2 = _dirtyY2 === -1 ? imageData.height : _dirtyY2;
        const dirtyHeight = dirtyY2 - dirtyY1;
        // Finally, paint to the canvas
        const ctx = this._canvas.domNode.getContext('2d');
        ctx.putImageData(imageData, 0, 0, 0, dirtyY1, imageData.width, dirtyHeight);
        // Save rendered data for reuse on next frame if possible
        return new RenderData(layout, imageData, renderedLines);
    }
    static _renderUntouchedLines(target, topPaddingLineCount, startLineNumber, endLineNumber, minimapLineHeight, lastRenderData) {
        const needed = [];
        if (!lastRenderData) {
            for (let i = 0, len = endLineNumber - startLineNumber + 1; i < len; i++) {
                needed[i] = true;
            }
            return [-1, -1, needed];
        }
        const _lastData = lastRenderData._get();
        const lastTargetData = _lastData.imageData.data;
        const lastStartLineNumber = _lastData.rendLineNumberStart;
        const lastLines = _lastData.lines;
        const lastLinesLength = lastLines.length;
        const WIDTH = target.width;
        const targetData = target.data;
        const maxDestPixel = (endLineNumber - startLineNumber + 1) * minimapLineHeight * WIDTH * 4;
        let dirtyPixel1 = -1; // the pixel offset up to which all the data is equal to the prev frame
        let dirtyPixel2 = -1; // the pixel offset after which all the data is equal to the prev frame
        let copySourceStart = -1;
        let copySourceEnd = -1;
        let copyDestStart = -1;
        let copyDestEnd = -1;
        let dest_dy = topPaddingLineCount * minimapLineHeight;
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const lineIndex = lineNumber - startLineNumber;
            const lastLineIndex = lineNumber - lastStartLineNumber;
            const source_dy = lastLineIndex >= 0 && lastLineIndex < lastLinesLength ? lastLines[lastLineIndex].dy : -1;
            if (source_dy === -1) {
                needed[lineIndex] = true;
                dest_dy += minimapLineHeight;
                continue;
            }
            const sourceStart = source_dy * WIDTH * 4;
            const sourceEnd = (source_dy + minimapLineHeight) * WIDTH * 4;
            const destStart = dest_dy * WIDTH * 4;
            const destEnd = (dest_dy + minimapLineHeight) * WIDTH * 4;
            if (copySourceEnd === sourceStart && copyDestEnd === destStart) {
                // contiguous zone => extend copy request
                copySourceEnd = sourceEnd;
                copyDestEnd = destEnd;
            }
            else {
                if (copySourceStart !== -1) {
                    // flush existing copy request
                    targetData.set(lastTargetData.subarray(copySourceStart, copySourceEnd), copyDestStart);
                    if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
                        dirtyPixel1 = copySourceEnd;
                    }
                    if (dirtyPixel2 === -1 &&
                        copySourceEnd === maxDestPixel &&
                        copySourceStart === copyDestStart) {
                        dirtyPixel2 = copySourceStart;
                    }
                }
                copySourceStart = sourceStart;
                copySourceEnd = sourceEnd;
                copyDestStart = destStart;
                copyDestEnd = destEnd;
            }
            needed[lineIndex] = false;
            dest_dy += minimapLineHeight;
        }
        if (copySourceStart !== -1) {
            // flush existing copy request
            targetData.set(lastTargetData.subarray(copySourceStart, copySourceEnd), copyDestStart);
            if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
                dirtyPixel1 = copySourceEnd;
            }
            if (dirtyPixel2 === -1 &&
                copySourceEnd === maxDestPixel &&
                copySourceStart === copyDestStart) {
                dirtyPixel2 = copySourceStart;
            }
        }
        const dirtyY1 = dirtyPixel1 === -1 ? -1 : dirtyPixel1 / (WIDTH * 4);
        const dirtyY2 = dirtyPixel2 === -1 ? -1 : dirtyPixel2 / (WIDTH * 4);
        return [dirtyY1, dirtyY2, needed];
    }
    static _renderLine(target, backgroundColor, backgroundAlpha, useLighterFont, renderMinimap, charWidth, colorTracker, foregroundAlpha, minimapCharRenderer, dy, innerLinePadding, tabSize, lineData, fontScale, minimapLineHeight) {
        const content = lineData.content;
        const tokens = lineData.tokens;
        const maxDx = target.width - charWidth;
        const force1pxHeight = minimapLineHeight === 1;
        let dx = MINIMAP_GUTTER_WIDTH;
        let charIndex = 0;
        let tabsCharDelta = 0;
        for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
            const tokenEndIndex = tokens.getEndOffset(tokenIndex);
            const tokenColorId = tokens.getForeground(tokenIndex);
            const tokenColor = colorTracker.getColor(tokenColorId);
            for (; charIndex < tokenEndIndex; charIndex++) {
                if (dx > maxDx) {
                    // hit edge of minimap
                    return;
                }
                const charCode = content.charCodeAt(charIndex);
                if (charCode === 9 /* CharCode.Tab */) {
                    const insertSpacesCount = tabSize - ((charIndex + tabsCharDelta) % tabSize);
                    tabsCharDelta += insertSpacesCount - 1;
                    // No need to render anything since tab is invisible
                    dx += insertSpacesCount * charWidth;
                }
                else if (charCode === 32 /* CharCode.Space */) {
                    // No need to render anything since space is invisible
                    dx += charWidth;
                }
                else {
                    // Render twice for a full width character
                    const count = strings.isFullWidthCharacter(charCode) ? 2 : 1;
                    for (let i = 0; i < count; i++) {
                        if (renderMinimap === 2 /* RenderMinimap.Blocks */) {
                            minimapCharRenderer.blockRenderChar(target, dx, dy + innerLinePadding, tokenColor, foregroundAlpha, backgroundColor, backgroundAlpha, force1pxHeight);
                        }
                        else {
                            // RenderMinimap.Text
                            minimapCharRenderer.renderChar(target, dx, dy + innerLinePadding, charCode, tokenColor, foregroundAlpha, backgroundColor, backgroundAlpha, fontScale, useLighterFont, force1pxHeight);
                        }
                        dx += charWidth;
                        if (dx > maxDx) {
                            // hit edge of minimap
                            return;
                        }
                    }
                }
            }
        }
    }
}
class ContiguousLineMap {
    constructor(startLineNumber, endLineNumber, defaultValue) {
        this._startLineNumber = startLineNumber;
        this._endLineNumber = endLineNumber;
        this._defaultValue = defaultValue;
        this._values = [];
        for (let i = 0, count = this._endLineNumber - this._startLineNumber + 1; i < count; i++) {
            this._values[i] = defaultValue;
        }
    }
    has(lineNumber) {
        return this.get(lineNumber) !== this._defaultValue;
    }
    set(lineNumber, value) {
        if (lineNumber < this._startLineNumber || lineNumber > this._endLineNumber) {
            return;
        }
        this._values[lineNumber - this._startLineNumber] = value;
    }
    get(lineNumber) {
        if (lineNumber < this._startLineNumber || lineNumber > this._endLineNumber) {
            return this._defaultValue;
        }
        return this._values[lineNumber - this._startLineNumber];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9taW5pbWFwL21pbmltYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxlQUFlLENBQUE7QUFDdEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUUvRixPQUFPLEVBQWUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBUyx1QkFBdUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3hFLE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDcEYsT0FBTyxFQUdOLG9CQUFvQixFQUNwQix3QkFBd0IsR0FDeEIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBTXBELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBS2xHLE9BQU8sRUFBZ0IsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNoRixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGlCQUFpQixFQUNqQix3QkFBd0IsRUFDeEIsZ0JBQWdCLEdBQ2hCLE1BQU0sb0RBQW9ELENBQUE7QUFFM0QsT0FBTyxFQUFFLFNB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