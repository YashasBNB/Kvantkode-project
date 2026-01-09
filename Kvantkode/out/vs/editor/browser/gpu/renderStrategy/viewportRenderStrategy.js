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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3BvcnRSZW5kZXJTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvZ3B1L3JlbmRlclN0cmF0ZWd5L3ZpZXdwb3J0UmVuZGVyU3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBbUJyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQTBCLE1BQU0sd0JBQXdCLENBQUE7QUFFdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFN0UsSUFBVyxTQUlWO0FBSkQsV0FBVyxTQUFTO0lBQ25CLDZEQUFrQixDQUFBO0lBQ2xCLGdHQUFvQyxDQUFBO0lBQ3BDLDRGQUFrQyxDQUFBO0FBQ25DLENBQUMsRUFKVSxTQUFTLEtBQVQsU0FBUyxRQUluQjtBQUVELElBQVcsY0FTVjtBQVRELFdBQVcsY0FBYztJQUN4Qix1RUFBa0IsQ0FBQTtJQUNsQixzRUFBaUQsQ0FBQTtJQUNqRCwyREFBWSxDQUFBO0lBQ1osMkRBQVksQ0FBQTtJQUNaLHVFQUFrQixDQUFBO0lBQ2xCLHVFQUFrQixDQUFBO0lBQ2xCLCtEQUFjLENBQUE7SUFDZCxtRUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBVFUsY0FBYyxLQUFkLGNBQWMsUUFTeEI7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxrQkFBa0I7SUFDN0Q7O09BRUc7YUFDYSx3QkFBbUIsR0FBRyxJQUFJLEFBQVAsQ0FBTztJQXFCMUMsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTztZQUNOLEVBQUUsT0FBTyx5QkFBaUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxFQUFFO1lBQ3hFLEVBQUUsT0FBTyxnQ0FBd0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEVBQUU7U0FDdkYsQ0FBQTtJQUNGLENBQUM7SUFLRCxZQUNDLE9BQW9CLEVBQ3BCLGNBQThCLEVBQzlCLE1BQWlCLEVBQ2pCLGVBQTJDO1FBRTNDLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQTtRQW5DL0MsU0FBSSxHQUFHLFVBQVUsQ0FBQTtRQUNqQixTQUFJLEdBQVcsMEJBQTBCLENBQUE7UUFFMUMsZ0NBQTJCLG9EQUEwQztRQVFyRSw2QkFBd0IsR0FBVSxDQUFDLENBQUE7UUFFbkMsd0JBQW1CLEdBQVcsQ0FBQyxDQUFBO1FBSS9CLHVCQUFrQixHQUFZLEtBQUssQ0FBQTtRQVMxQixpQ0FBNEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMxRSxnQ0FBMkIsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFBO1FBVTdFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUV6RCxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3ZDLEtBQUssRUFBRSw2QkFBNkI7WUFDcEMsSUFBSSxFQUFFLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxpQkFBaUI7WUFDN0QsS0FBSyxFQUFFLGNBQWMsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDLFFBQVE7U0FDdkQsQ0FBQyxDQUNGLENBQUMsTUFBTSxDQUFBO1FBQ1IsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDekUsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFNBQWlCO1FBQzNDLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUE7UUFFL0IsNEZBQTRGO1FBQzVGLE1BQU0sc0JBQXNCLEdBQzNCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLHFEQUE0QyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzhEQUM5QixDQUFBO1FBRTFDLE1BQU0sVUFBVSxHQUNmLHNCQUFzQjtZQUN0QixzQkFBc0IsQ0FBQyxtQkFBbUI7NENBQ2xCO1lBQ3hCLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQTtRQUMvQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3BDLFlBQVksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUN2QyxLQUFLLEVBQUUsOEJBQThCO1lBQ3JDLElBQUksRUFBRSxVQUFVO1lBQ2hCLEtBQUssRUFBRSxjQUFjLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQyxRQUFRO1NBQ3ZELENBQUMsQ0FDRixDQUFDLE1BQU0sQ0FBQTtRQUNSLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLDJCQUEyQixHQUFHLHNCQUFzQixDQUFBO1FBRXpELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUN6QyxDQUFDO0lBRUQseUJBQXlCO0lBRXpCLDJDQUEyQztJQUMzQyw0RkFBNEY7SUFDNUYsaUNBQWlDO0lBQ2pDLDhGQUE4RjtJQUM5Riw2RkFBNkY7SUFDN0Ysd0ZBQXdGO0lBQ3hGLHNDQUFzQztJQUV0QixzQkFBc0IsQ0FBQyxDQUFnQztRQUN0RSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxvQkFBb0IsQ0FBQyxDQUE4QjtRQUNsRSxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxlQUFlLENBQUMsQ0FBeUI7UUFDeEQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRWUsY0FBYyxDQUFDLENBQXdCO1FBQ3RELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVlLGVBQWUsQ0FBQyxDQUF5QjtRQUN4RCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxjQUFjLENBQUMsQ0FBd0I7UUFDdEQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRWUsZUFBZSxDQUFDLENBQTBCO1FBQ3pELE1BQU0sR0FBRyxHQUFHLGVBQWUsRUFBRSxDQUFDLGdCQUFnQixDQUFBO1FBQzlDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7WUFDL0IsQ0FBQyxDQUFDLEVBQUUsVUFBVSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLG9CQUFvQixFQUFFLENBQUMsR0FBRyxHQUFHLENBQUE7UUFDekUsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztZQUMvQixDQUFDLENBQUMsRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUN2RSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUM5RixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxjQUFjLENBQUMsQ0FBd0I7UUFDdEQsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRWUsb0JBQW9CLENBQUMsQ0FBOEI7UUFDbEUsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRWUsY0FBYyxDQUFDLENBQXdCO1FBQ3RELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELGFBQWE7SUFFYixLQUFLO1FBQ0osS0FBSyxNQUFNLFdBQVcsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xDLHlFQUF5RTtZQUN6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtZQUNwRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsWUFBMEIsRUFBRSxlQUFnQztRQUNsRSx1RkFBdUY7UUFDdkYsMkZBQTJGO1FBQzNGLDJGQUEyRjtRQUMzRixrQkFBa0I7UUFFbEIsSUFBSSxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBQ2QsSUFBSSxPQUEyQixDQUFBO1FBQy9CLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDVCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDVCxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7UUFDdkIsSUFBSSxlQUFlLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTtRQUNsQixJQUFJLEtBQXVDLENBQUE7UUFDM0MsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBRWpCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUN2QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDckIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBRXJCLElBQUksc0JBQTJDLENBQUE7UUFDL0MsSUFBSSx1QkFBMkMsQ0FBQTtRQUMvQyxJQUFJLHlCQUE2QyxDQUFBO1FBRWpELElBQUksUUFBK0IsQ0FBQTtRQUNuQyxJQUFJLFVBQTRCLENBQUE7UUFDaEMsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQTtRQUVwQixJQUFJLE1BQXVCLENBQUE7UUFFM0IsTUFBTSxHQUFHLEdBQUcsZUFBZSxFQUFFLENBQUMsZ0JBQWdCLENBQUE7UUFDOUMsSUFBSSxnQkFBbUMsQ0FBQTtRQUV2QyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ3RCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7UUFDL0IsQ0FBQztRQUVELDRDQUE0QztRQUM1QyxJQUNDLElBQUksQ0FBQywyQkFBMkI7WUFDaEMsWUFBWSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUMsZUFBZSxHQUFHLENBQUMsRUFDNUQsQ0FBQztZQUNGLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkYsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBQzFGLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEIsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLG1DQUEyQixDQUFBO1FBRTVGLEtBQUssQ0FBQyxHQUFHLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxJQUFJLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3RSxnRUFBZ0U7WUFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdkUsU0FBUTtZQUNULENBQUM7WUFFRCxRQUFRLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ25ELFVBQVUsR0FBRyxDQUFDLENBQUE7WUFFZCxnQkFBZ0IsR0FBRyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDcEUsU0FBUyxHQUFHLGVBQWUsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFBO1lBQzVDLGVBQWUsR0FBRyxDQUFDLENBQUE7WUFFbkIsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7WUFDeEIsZUFBZSxHQUFHLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFBO1lBQ3hDLGFBQWEsR0FBRyxDQUFDLENBQUE7WUFDakIsS0FDQyxJQUFJLFVBQVUsR0FBRyxDQUFDLEVBQUUsU0FBUyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFDakQsVUFBVSxHQUFHLFNBQVMsRUFDdEIsVUFBVSxFQUFFLEVBQ1gsQ0FBQztnQkFDRixhQUFhLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDL0MsSUFBSSxhQUFhLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ3RDLDZEQUE2RDtvQkFDN0QsU0FBUTtnQkFDVCxDQUFDO2dCQUVELGFBQWEsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUU5QyxLQUFLLENBQUMsR0FBRyxlQUFlLEVBQUUsQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNsRCx1REFBdUQ7b0JBQ3ZELElBQUksQ0FBQyxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLENBQUM7d0JBQ3BELE1BQUs7b0JBQ04sQ0FBQztvQkFDRCxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQy9DLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO3dCQUMzQixTQUFRO29CQUNULENBQUM7b0JBQ0QsS0FBSyxHQUFHLE9BQU8sQ0FBQTtvQkFFZixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLENBQUM7d0JBQzNFLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUE7b0JBQzdELENBQUM7b0JBRUQsdUJBQXVCLEdBQUcsU0FBUyxDQUFBO29CQUNuQyxzQkFBc0IsR0FBRyxTQUFTLENBQUE7b0JBQ2xDLHlCQUF5QixHQUFHLFNBQVMsQ0FBQTtvQkFFckMsZ0VBQWdFO29CQUNoRSxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDL0MsMEVBQTBFO3dCQUMxRSx1Q0FBdUM7d0JBQ3ZDLElBQ0MsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsZUFBZTs0QkFDcEMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsYUFBYTs0QkFDbEMsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLEtBQUssQ0FBQyxlQUFlLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQzs0QkFDaEYsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxFQUM1RSxDQUFDOzRCQUNGLFNBQVE7d0JBQ1QsQ0FBQzt3QkFFRCxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUNwRSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQ25DLFVBQVUsQ0FBQyxlQUFlLENBQzFCLENBQUE7d0JBQ0QsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDMUIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0NBQzVCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQTtnQ0FDcEQsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQ0FDWCxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0NBQ2QsK0VBQStFO3dDQUMvRSxxQkFBcUI7d0NBQ3JCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTt3Q0FDakQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDOzRDQUNsQixNQUFNLElBQUksa0JBQWtCLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLENBQUE7d0NBQzlELENBQUM7d0NBQ0QsdUJBQXVCLEdBQUcsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFBO3dDQUNyRCxNQUFLO29DQUNOLENBQUM7b0NBQ0QsS0FBSyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dDQUNwQixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTt3Q0FDN0MsSUFBSSxXQUFXLElBQUksR0FBRyxFQUFFLENBQUM7NENBQ3hCLHNCQUFzQixHQUFHLElBQUksQ0FBQTs0Q0FDN0IscUVBQXFFO3dDQUN0RSxDQUFDOzZDQUFNLENBQUM7NENBQ1Asc0JBQXNCLEdBQUcsS0FBSyxDQUFBOzRDQUM5Qix1RUFBdUU7d0NBQ3hFLENBQUM7d0NBQ0QsTUFBSztvQ0FDTixDQUFDO29DQUNELEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQzt3Q0FDaEIsTUFBTSxXQUFXLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO3dDQUMxQyx5QkFBeUIsR0FBRyxXQUFXLENBQUE7d0NBQ3ZDLE1BQUs7b0NBQ04sQ0FBQztvQ0FDRDt3Q0FDQyxNQUFNLElBQUksa0JBQWtCLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtnQ0FDcEUsQ0FBQzs0QkFDRixDQUFDO3dCQUNGLENBQUM7b0JBQ0YsQ0FBQztvQkFFRCxJQUFJLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO3dCQUNyQyxtREFBbUQ7d0JBQ25ELFNBQVM7NEJBQ1IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsbUNBQTJCLENBQUE7d0JBQ3RGLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLHdDQUFnQyxDQUFDLENBQUE7d0JBQ3hFLCtCQUErQjt3QkFDL0IsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7NEJBQ3BCLDJFQUEyRTs0QkFDM0UsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQTs0QkFDbkMsVUFBVSxHQUFHLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsVUFBVSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTs0QkFDOUUsZUFBZSxJQUFJLFNBQVMsR0FBRyxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUMsQ0FBQTs0QkFDMUQsK0RBQStEOzRCQUMvRCxVQUFVLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFDcEIsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLGVBQWUsSUFBSSxTQUFTLENBQUE7d0JBQzdCLENBQUM7d0JBQ0QsU0FBUTtvQkFDVCxDQUFDO29CQUVELE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUNoRix1QkFBdUIsRUFDdkIsc0JBQXNCLEVBQ3RCLHlCQUF5QixDQUN6QixDQUFBO29CQUNELEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQzFDLElBQUksQ0FBQyxlQUFlLEVBQ3BCLEtBQUssRUFDTCxhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLGVBQWUsQ0FDZixDQUFBO29CQUVELGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSztvQkFDM0IsMkNBQTJDO29CQUMzQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsR0FBRyxHQUFHO3dCQUMxRSxnR0FBZ0c7d0JBQ2hHLElBQUksQ0FBQyxLQUFLLENBQ1QsQ0FBQyxZQUFZLENBQUMsVUFBVSxHQUFHLEdBQUc7NEJBQzdCLENBQUMsS0FBSyxDQUFDLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDOzRCQUM3RCxDQUFDLENBQ0Y7d0JBQ0QsK0ZBQStGO3dCQUMvRixtR0FBbUc7d0JBQ25HLFlBQVk7d0JBQ1osS0FBSyxDQUFDLHFCQUFxQixDQUM1QixDQUFBO29CQUVELFNBQVM7d0JBQ1IsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDOzREQUM3RCxDQUFBO29CQUN6QixVQUFVLENBQUMsU0FBUyxrQ0FBMEIsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7b0JBQzdFLFVBQVUsQ0FBQyxTQUFTLGtDQUEwQixDQUFDLEdBQUcsZUFBZSxDQUFBO29CQUNqRSxVQUFVLENBQUMsU0FBUyxvQ0FBNEIsQ0FBQyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUE7b0JBQ3BFLFVBQVUsQ0FBQyxTQUFTLHNDQUE4QixDQUFDLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQTtvQkFFckUsbURBQW1EO29CQUNuRCxlQUFlLElBQUksU0FBUyxDQUFBO2dCQUM3QixDQUFDO2dCQUVELGVBQWUsR0FBRyxhQUFhLENBQUE7WUFDaEMsQ0FBQztZQUVELHVCQUF1QjtZQUN2QixjQUFjO2dCQUNiLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxHQUFHLHNCQUFzQixDQUFDLG1CQUFtQjtvQkFDL0UsYUFBYSxDQUFDO29EQUNTLENBQUE7WUFDekIsWUFBWTtnQkFDWCxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsZUFBZSxDQUFDO29CQUNsQyxzQkFBc0IsQ0FBQyxtQkFBbUI7b0RBQ2xCLENBQUE7WUFDekIsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUN2QixDQUFDLFlBQVksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUE7UUFFakYseURBQXlEO1FBQ3pELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FDN0IsSUFBSSxDQUFDLGVBQWUsRUFDcEIsQ0FBQyxFQUNELFVBQVUsQ0FBQyxNQUFNLEVBQ2pCLENBQUMsRUFDRCxDQUFDLFlBQVksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQztZQUMxRCxjQUFjO1lBQ2QsWUFBWSxDQUFDLGlCQUFpQixDQUMvQixDQUFBO1FBRUQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFckUsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFBO1FBRTdDLE9BQU8sa0JBQWtCLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQUksQ0FBQyxJQUEwQixFQUFFLFlBQTBCO1FBQzFELElBQUksSUFBSSxDQUFDLG1CQUFtQixJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQzdELENBQUM7O0FBR0YsU0FBUyxrQkFBa0IsQ0FBQyxLQUFhO0lBQ3hDLFFBQVEsS0FBSyxFQUFFLENBQUM7UUFDZixLQUFLLFNBQVMsQ0FBQztRQUNmLEtBQUssUUFBUTtZQUNaLE9BQU8sR0FBRyxDQUFBO1FBQ1gsS0FBSyxRQUFRLENBQUM7UUFDZCxLQUFLLE1BQU07WUFDVixPQUFPLEdBQUcsQ0FBQTtJQUNaLENBQUM7SUFDRCxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN2QixDQUFDO0FBRUQsU0FBUyxlQUFlLENBQUMsS0FBYTtJQUNyQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFBO0lBQzlELENBQUM7SUFDRCxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztRQUNsQyxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBQ0QsT0FBTyxDQUFDLENBQUE7QUFDVCxDQUFDIn0=