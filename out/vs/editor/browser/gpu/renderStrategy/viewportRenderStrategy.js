/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { createContentSegmenter } from '../contentSegmenter.js';
import { GPULifecycle } from '../gpuDisposable.js';
import { quadVertices } from '../gpuUtils.js';
import { ViewGpuContext } from '../viewGpuContext.js';
import { BaseRenderStrategy } from './baseRenderStrategy.js';
import { fullFileRenderStrategyWgsl } from './fullFileRenderStrategy.wgsl.js';
var Constants;
(function (Constants) {
    Constants[Constants["IndicesPerCell"] = 6] = "IndicesPerCell";
    Constants[Constants["CellBindBufferCapacityIncrement"] = 32] = "CellBindBufferCapacityIncrement";
    Constants[Constants["CellBindBufferInitialCapacity"] = 63] = "CellBindBufferInitialCapacity";
})(Constants || (Constants = {}));
var CellBufferInfo;
(function (CellBufferInfo) {
    CellBufferInfo[CellBufferInfo["FloatsPerEntry"] = 6] = "FloatsPerEntry";
    CellBufferInfo[CellBufferInfo["BytesPerEntry"] = 24] = "BytesPerEntry";
    CellBufferInfo[CellBufferInfo["Offset_X"] = 0] = "Offset_X";
    CellBufferInfo[CellBufferInfo["Offset_Y"] = 1] = "Offset_Y";
    CellBufferInfo[CellBufferInfo["Offset_Unused1"] = 2] = "Offset_Unused1";
    CellBufferInfo[CellBufferInfo["Offset_Unused2"] = 3] = "Offset_Unused2";
    CellBufferInfo[CellBufferInfo["GlyphIndex"] = 4] = "GlyphIndex";
    CellBufferInfo[CellBufferInfo["TextureIndex"] = 5] = "TextureIndex";
})(CellBufferInfo || (CellBufferInfo = {}));
/**
 * A render strategy that uploads the content of the entire viewport every frame.
 */
export class ViewportRenderStrategy extends BaseRenderStrategy {
    /**
     * The hard cap for line columns that can be rendered by the GPU renderer.
     */
    static { this.maxSupportedColumns = 2000; }
    get bindGroupEntries() {
        return [
            { binding: 1 /* BindingId.Cells */, resource: { buffer: this._cellBindBuffer } },
            { binding: 6 /* BindingId.ScrollOffset */, resource: { buffer: this._scrollOffsetBindBuffer } },
        ];
    }
    constructor(context, viewGpuContext, device, glyphRasterizer) {
        super(context, viewGpuContext, device, glyphRasterizer);
        this.type = 'viewport';
        this.wgsl = fullFileRenderStrategyWgsl;
        this._cellBindBufferLineCapacity = 63 /* Constants.CellBindBufferInitialCapacity */;
        this._activeDoubleBufferIndex = 0;
        this._visibleObjectCount = 0;
        this._scrollInitialized = false;
        this._onDidChangeBindGroupEntries = this._register(new Emitter());
        this.onDidChangeBindGroupEntries = this._onDidChangeBindGroupEntries.event;
        this._rebuildCellBuffer(this._cellBindBufferLineCapacity);
        const scrollOffsetBufferSize = 2;
        this._scrollOffsetBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco scroll offset buffer',
            size: scrollOffsetBufferSize * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })).object;
        this._scrollOffsetValueBuffer = new Float32Array(scrollOffsetBufferSize);
    }
    _rebuildCellBuffer(lineCount) {
        this._cellBindBuffer?.destroy();
        // Increase in chunks so resizing a window by hand doesn't keep allocating and throwing away
        const lineCountWithIncrement = (Math.floor(lineCount / 32 /* Constants.CellBindBufferCapacityIncrement */) + 1) *
            32 /* Constants.CellBindBufferCapacityIncrement */;
        const bufferSize = lineCountWithIncrement *
            ViewportRenderStrategy.maxSupportedColumns *
            6 /* Constants.IndicesPerCell */ *
            Float32Array.BYTES_PER_ELEMENT;
        this._cellBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco full file cell buffer',
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._cellValueBuffers = [new ArrayBuffer(bufferSize), new ArrayBuffer(bufferSize)];
        this._cellBindBufferLineCapacity = lineCountWithIncrement;
        this._onDidChangeBindGroupEntries.fire();
    }
    // #region Event handlers
    // The primary job of these handlers is to:
    // 1. Invalidate the up to date line cache, which will cause the line to be re-rendered when
    //    it's _within the viewport_.
    // 2. Pass relevant events on to the render function so it can force certain line ranges to be
    //    re-rendered even if they're not in the viewport. For example when a view zone is added,
    //    there are lines that used to be visible but are no longer, so those ranges must be
    //    cleared and uploaded to the GPU.
    onConfigurationChanged(e) {
        return true;
    }
    onDecorationsChanged(e) {
        return true;
    }
    onTokensChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onLinesChanged(e) {
        return true;
    }
    onScrollChanged(e) {
        const dpr = getActiveWindow().devicePixelRatio;
        this._scrollOffsetValueBuffer[0] =
            (e?.scrollLeft ?? this._context.viewLayout.getCurrentScrollLeft()) * dpr;
        this._scrollOffsetValueBuffer[1] =
            (e?.scrollTop ?? this._context.viewLayout.getCurrentScrollTop()) * dpr;
        this._device.queue.writeBuffer(this._scrollOffsetBindBuffer, 0, this._scrollOffsetValueBuffer);
        return true;
    }
    onThemeChanged(e) {
        return true;
    }
    onLineMappingChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // #endregion
    reset() {
        for (const bufferIndex of [0, 1]) {
            // Zero out buffer and upload to GPU to prevent stale rows from rendering
            const buffer = new Float32Array(this._cellValueBuffers[bufferIndex]);
            buffer.fill(0, 0, buffer.length);
            this._device.queue.writeBuffer(this._cellBindBuffer, 0, buffer.buffer, 0, buffer.byteLength);
        }
    }
    update(viewportData, viewLineOptions) {
        // IMPORTANT: This is a hot function. Variables are pre-allocated and shared within the
        // loop. This is done so we don't need to trust the JIT compiler to do this optimization to
        // avoid potential additional blocking time in garbage collector which is a common cause of
        // dropped frames.
        let chars = '';
        let segment;
        let charWidth = 0;
        let y = 0;
        let x = 0;
        let absoluteOffsetX = 0;
        let absoluteOffsetY = 0;
        let tabXOffset = 0;
        let glyph;
        let cellIndex = 0;
        let tokenStartIndex = 0;
        let tokenEndIndex = 0;
        let tokenMetadata = 0;
        let decorationStyleSetBold;
        let decorationStyleSetColor;
        let decorationStyleSetOpacity;
        let lineData;
        let decoration;
        let fillStartIndex = 0;
        let fillEndIndex = 0;
        let tokens;
        const dpr = getActiveWindow().devicePixelRatio;
        let contentSegmenter;
        if (!this._scrollInitialized) {
            this.onScrollChanged();
            this._scrollInitialized = true;
        }
        // Zero out cell buffer or rebuild if needed
        if (this._cellBindBufferLineCapacity <
            viewportData.endLineNumber - viewportData.startLineNumber + 1) {
            this._rebuildCellBuffer(viewportData.endLineNumber - viewportData.startLineNumber + 1);
        }
        const cellBuffer = new Float32Array(this._cellValueBuffers[this._activeDoubleBufferIndex]);
        cellBuffer.fill(0);
        const lineIndexCount = ViewportRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
        for (y = viewportData.startLineNumber; y <= viewportData.endLineNumber; y++) {
            // Only attempt to render lines that the GPU renderer can handle
            if (!this._viewGpuContext.canRender(viewLineOptions, viewportData, y)) {
                continue;
            }
            lineData = viewportData.getViewLineRenderingData(y);
            tabXOffset = 0;
            contentSegmenter = createContentSegmenter(lineData, viewLineOptions);
            charWidth = viewLineOptions.spaceWidth * dpr;
            absoluteOffsetX = 0;
            tokens = lineData.tokens;
            tokenStartIndex = lineData.minColumn - 1;
            tokenEndIndex = 0;
            for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
                tokenEndIndex = tokens.getEndOffset(tokenIndex);
                if (tokenEndIndex <= tokenStartIndex) {
                    // The faux indent part of the line should have no token type
                    continue;
                }
                tokenMetadata = tokens.getMetadata(tokenIndex);
                for (x = tokenStartIndex; x < tokenEndIndex; x++) {
                    // Only render lines that do not exceed maximum columns
                    if (x > ViewportRenderStrategy.maxSupportedColumns) {
                        break;
                    }
                    segment = contentSegmenter.getSegmentAtIndex(x);
                    if (segment === undefined) {
                        continue;
                    }
                    chars = segment;
                    if (!(lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations)) {
                        charWidth = this.glyphRasterizer.getTextMetrics(chars).width;
                    }
                    decorationStyleSetColor = undefined;
                    decorationStyleSetBold = undefined;
                    decorationStyleSetOpacity = undefined;
                    // Apply supported inline decoration styles to the cell metadata
                    for (decoration of lineData.inlineDecorations) {
                        // This is Range.strictContainsPosition except it works at the cell level,
                        // it's also inlined to avoid overhead.
                        if (y < decoration.range.startLineNumber ||
                            y > decoration.range.endLineNumber ||
                            (y === decoration.range.startLineNumber && x < decoration.range.startColumn - 1) ||
                            (y === decoration.range.endLineNumber && x >= decoration.range.endColumn - 1)) {
                            continue;
                        }
                        const rules = ViewGpuContext.decorationCssRuleExtractor.getStyleRules(this._viewGpuContext.canvas.domNode, decoration.inlineClassName);
                        for (const rule of rules) {
                            for (const r of rule.style) {
                                const value = rule.styleMap.get(r)?.toString() ?? '';
                                switch (r) {
                                    case 'color': {
                                        // TODO: This parsing and error handling should move into canRender so fallback
                                        //       to DOM works
                                        const parsedColor = Color.Format.CSS.parse(value);
                                        if (!parsedColor) {
                                            throw new BugIndicatingError('Invalid color format ' + value);
                                        }
                                        decorationStyleSetColor = parsedColor.toNumber32Bit();
                                        break;
                                    }
                                    case 'font-weight': {
                                        const parsedValue = parseCssFontWeight(value);
                                        if (parsedValue >= 400) {
                                            decorationStyleSetBold = true;
                                            // TODO: Set bold (https://github.com/microsoft/vscode/issues/237584)
                                        }
                                        else {
                                            decorationStyleSetBold = false;
                                            // TODO: Set normal (https://github.com/microsoft/vscode/issues/237584)
                                        }
                                        break;
                                    }
                                    case 'opacity': {
                                        const parsedValue = parseCssOpacity(value);
                                        decorationStyleSetOpacity = parsedValue;
                                        break;
                                    }
                                    default:
                                        throw new BugIndicatingError('Unexpected inline decoration style');
                                }
                            }
                        }
                    }
                    if (chars === ' ' || chars === '\t') {
                        // Zero out glyph to ensure it doesn't get rendered
                        cellIndex =
                            ((y - 1) * ViewportRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
                        cellBuffer.fill(0, cellIndex, cellIndex + 6 /* CellBufferInfo.FloatsPerEntry */);
                        // Adjust xOffset for tab stops
                        if (chars === '\t') {
                            // Find the pixel offset between the current position and the next tab stop
                            const offsetBefore = x + tabXOffset;
                            tabXOffset = CursorColumns.nextRenderTabStop(x + tabXOffset, lineData.tabSize);
                            absoluteOffsetX += charWidth * (tabXOffset - offsetBefore);
                            // Convert back to offset excluding x and the current character
                            tabXOffset -= x + 1;
                        }
                        else {
                            absoluteOffsetX += charWidth;
                        }
                        continue;
                    }
                    const decorationStyleSetId = ViewGpuContext.decorationStyleCache.getOrCreateEntry(decorationStyleSetColor, decorationStyleSetBold, decorationStyleSetOpacity);
                    glyph = this._viewGpuContext.atlas.getGlyph(this.glyphRasterizer, chars, tokenMetadata, decorationStyleSetId, absoluteOffsetX);
                    absoluteOffsetY = Math.round(
                    // Top of layout box (includes line height)
                    viewportData.relativeVerticalOffset[y - viewportData.startLineNumber] * dpr +
                        // Delta from top of layout box (includes line height) to top of the inline box (no line height)
                        Math.floor((viewportData.lineHeight * dpr -
                            (glyph.fontBoundingBoxAscent + glyph.fontBoundingBoxDescent)) /
                            2) +
                        // Delta from top of inline box (no line height) to top of glyph origin. If the glyph was drawn
                        // with a top baseline for example, this ends up drawing the glyph correctly using the alphabetical
                        // baseline.
                        glyph.fontBoundingBoxAscent);
                    cellIndex =
                        ((y - viewportData.startLineNumber) * ViewportRenderStrategy.maxSupportedColumns + x) *
                            6 /* Constants.IndicesPerCell */;
                    cellBuffer[cellIndex + 0 /* CellBufferInfo.Offset_X */] = Math.floor(absoluteOffsetX);
                    cellBuffer[cellIndex + 1 /* CellBufferInfo.Offset_Y */] = absoluteOffsetY;
                    cellBuffer[cellIndex + 4 /* CellBufferInfo.GlyphIndex */] = glyph.glyphIndex;
                    cellBuffer[cellIndex + 5 /* CellBufferInfo.TextureIndex */] = glyph.pageIndex;
                    // Adjust the x pixel offset for the next character
                    absoluteOffsetX += charWidth;
                }
                tokenStartIndex = tokenEndIndex;
            }
            // Clear to end of line
            fillStartIndex =
                ((y - viewportData.startLineNumber) * ViewportRenderStrategy.maxSupportedColumns +
                    tokenEndIndex) *
                    6 /* Constants.IndicesPerCell */;
            fillEndIndex =
                (y - viewportData.startLineNumber) *
                    ViewportRenderStrategy.maxSupportedColumns *
                    6 /* Constants.IndicesPerCell */;
            cellBuffer.fill(0, fillStartIndex, fillEndIndex);
        }
        const visibleObjectCount = (viewportData.endLineNumber - viewportData.startLineNumber + 1) * lineIndexCount;
        // This render strategy always uploads the whole viewport
        this._device.queue.writeBuffer(this._cellBindBuffer, 0, cellBuffer.buffer, 0, (viewportData.endLineNumber - viewportData.startLineNumber) *
            lineIndexCount *
            Float32Array.BYTES_PER_ELEMENT);
        this._activeDoubleBufferIndex = this._activeDoubleBufferIndex ? 0 : 1;
        this._visibleObjectCount = visibleObjectCount;
        return visibleObjectCount;
    }
    draw(pass, viewportData) {
        if (this._visibleObjectCount <= 0) {
            throw new BugIndicatingError('Attempt to draw 0 objects');
        }
        pass.draw(quadVertices.length / 2, this._visibleObjectCount);
    }
}
function parseCssFontWeight(value) {
    switch (value) {
        case 'lighter':
        case 'normal':
            return 400;
        case 'bolder':
        case 'bold':
            return 700;
    }
    return parseInt(value);
}
function parseCssOpacity(value) {
    if (value.endsWith('%')) {
        return parseFloat(value.substring(0, value.length - 1)) / 100;
    }
    if (value.match(/^\d+(?:\.\d*)/)) {
        return parseFloat(value);
    }
    return 1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3BvcnRSZW5kZXJTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9yZW5kZXJTdHJhdGVneS92aWV3cG9ydFJlbmRlclN0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQW1CckUsT0FBTyxFQUFFLHNCQUFzQixFQUEwQixNQUFNLHdCQUF3QixDQUFBO0FBRXZGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTdFLElBQVcsU0FJVjtBQUpELFdBQVcsU0FBUztJQUNuQiw2REFBa0IsQ0FBQTtJQUNsQixnR0FBb0MsQ0FBQTtJQUNwQyw0RkFBa0MsQ0FBQTtBQUNuQyxDQUFDLEVBSlUsU0FBUyxLQUFULFNBQVMsUUFJbkI7QUFFRCxJQUFXLGNBU1Y7QUFURCxXQUFXLGNBQWM7SUFDeEIsdUVBQWtCLENBQUE7SUFDbEIsc0VBQWlELENBQUE7SUFDakQs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