/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { createContentSegmenter } from '../contentSegmenter.js';
import { fullFileRenderStrategyWgsl } from './fullFileRenderStrategy.wgsl.js';
import { GPULifecycle } from '../gpuDisposable.js';
import { quadVertices } from '../gpuUtils.js';
import { ViewGpuContext } from '../viewGpuContext.js';
import { BaseRenderStrategy } from './baseRenderStrategy.js';
var Constants;
(function (Constants) {
    Constants[Constants["IndicesPerCell"] = 6] = "IndicesPerCell";
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
 * A render strategy that tracks a large buffer, uploading only dirty lines as they change and
 * leveraging heavy caching. This is the most performant strategy but has limitations around long
 * lines and too many lines.
 */
export class FullFileRenderStrategy extends BaseRenderStrategy {
    /**
     * The hard cap for line count that can be rendered by the GPU renderer.
     */
    static { this.maxSupportedLines = 3000; }
    /**
     * The hard cap for line columns that can be rendered by the GPU renderer.
     */
    static { this.maxSupportedColumns = 200; }
    get bindGroupEntries() {
        return [
            { binding: 1 /* BindingId.Cells */, resource: { buffer: this._cellBindBuffer } },
            { binding: 6 /* BindingId.ScrollOffset */, resource: { buffer: this._scrollOffsetBindBuffer } },
        ];
    }
    constructor(context, viewGpuContext, device, glyphRasterizer) {
        super(context, viewGpuContext, device, glyphRasterizer);
        this.type = 'fullfile';
        this.wgsl = fullFileRenderStrategyWgsl;
        this._activeDoubleBufferIndex = 0;
        this._upToDateLines = [new Set(), new Set()];
        this._visibleObjectCount = 0;
        this._finalRenderedLine = 0;
        this._scrollInitialized = false;
        this._queuedBufferUpdates = [[], []];
        const bufferSize = FullFileRenderStrategy.maxSupportedLines *
            FullFileRenderStrategy.maxSupportedColumns *
            6 /* Constants.IndicesPerCell */ *
            Float32Array.BYTES_PER_ELEMENT;
        this._cellBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco full file cell buffer',
            size: bufferSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._cellValueBuffers = [new ArrayBuffer(bufferSize), new ArrayBuffer(bufferSize)];
        const scrollOffsetBufferSize = 2;
        this._scrollOffsetBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco scroll offset buffer',
            size: scrollOffsetBufferSize * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })).object;
        this._scrollOffsetValueBuffer = new Float32Array(scrollOffsetBufferSize);
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
        this._invalidateAllLines();
        this._queueBufferUpdate(e);
        return true;
    }
    onDecorationsChanged(e) {
        this._invalidateAllLines();
        return true;
    }
    onTokensChanged(e) {
        // TODO: This currently fires for the entire viewport whenever scrolling stops
        //       https://github.com/microsoft/vscode/issues/233942
        for (const range of e.ranges) {
            this._invalidateLineRange(range.fromLineNumber, range.toLineNumber);
        }
        return true;
    }
    onLinesDeleted(e) {
        // TODO: This currently invalidates everything after the deleted line, it could shift the
        //       line data up to retain some up to date lines
        // TODO: This does not invalidate lines that are no longer in the file
        this._invalidateLinesFrom(e.fromLineNumber);
        this._queueBufferUpdate(e);
        return true;
    }
    onLinesInserted(e) {
        // TODO: This currently invalidates everything after the deleted line, it could shift the
        //       line data up to retain some up to date lines
        this._invalidateLinesFrom(e.fromLineNumber);
        return true;
    }
    onLinesChanged(e) {
        this._invalidateLineRange(e.fromLineNumber, e.fromLineNumber + e.count);
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
        this._invalidateAllLines();
        return true;
    }
    onLineMappingChanged(e) {
        this._invalidateAllLines();
        this._queueBufferUpdate(e);
        return true;
    }
    onZonesChanged(e) {
        this._invalidateAllLines();
        this._queueBufferUpdate(e);
        return true;
    }
    // #endregion
    _invalidateAllLines() {
        this._upToDateLines[0].clear();
        this._upToDateLines[1].clear();
    }
    _invalidateLinesFrom(lineNumber) {
        for (const i of [0, 1]) {
            const upToDateLines = this._upToDateLines[i];
            for (const upToDateLine of upToDateLines) {
                if (upToDateLine >= lineNumber) {
                    upToDateLines.delete(upToDateLine);
                }
            }
        }
    }
    _invalidateLineRange(fromLineNumber, toLineNumber) {
        for (let i = fromLineNumber; i <= toLineNumber; i++) {
            this._upToDateLines[0].delete(i);
            this._upToDateLines[1].delete(i);
        }
    }
    reset() {
        this._invalidateAllLines();
        for (const bufferIndex of [0, 1]) {
            // Zero out buffer and upload to GPU to prevent stale rows from rendering
            const buffer = new Float32Array(this._cellValueBuffers[bufferIndex]);
            buffer.fill(0, 0, buffer.length);
            this._device.queue.writeBuffer(this._cellBindBuffer, 0, buffer.buffer, 0, buffer.byteLength);
        }
        this._finalRenderedLine = 0;
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
        // Update cell data
        const cellBuffer = new Float32Array(this._cellValueBuffers[this._activeDoubleBufferIndex]);
        const lineIndexCount = FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
        const upToDateLines = this._upToDateLines[this._activeDoubleBufferIndex];
        let dirtyLineStart = 3000;
        let dirtyLineEnd = 0;
        // Handle any queued buffer updates
        const queuedBufferUpdates = this._queuedBufferUpdates[this._activeDoubleBufferIndex];
        while (queuedBufferUpdates.length) {
            const e = queuedBufferUpdates.shift();
            switch (e.type) {
                // TODO: Refine these cases so we're not throwing away everything
                case 2 /* ViewEventType.ViewConfigurationChanged */:
                case 8 /* ViewEventType.ViewLineMappingChanged */:
                case 17 /* ViewEventType.ViewZonesChanged */: {
                    cellBuffer.fill(0);
                    dirtyLineStart = 1;
                    dirtyLineEnd = Math.max(dirtyLineEnd, this._finalRenderedLine);
                    this._finalRenderedLine = 0;
                    break;
                }
                case 10 /* ViewEventType.ViewLinesDeleted */: {
                    // Shift content below deleted line up
                    const deletedLineContentStartIndex = (e.fromLineNumber - 1) *
                        FullFileRenderStrategy.maxSupportedColumns *
                        6 /* Constants.IndicesPerCell */;
                    const deletedLineContentEndIndex = e.toLineNumber * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
                    const nullContentStartIndex = (this._finalRenderedLine - (e.toLineNumber - e.fromLineNumber + 1)) *
                        FullFileRenderStrategy.maxSupportedColumns *
                        6 /* Constants.IndicesPerCell */;
                    cellBuffer.set(cellBuffer.subarray(deletedLineContentEndIndex), deletedLineContentStartIndex);
                    // Zero out content on lines that are no longer valid
                    cellBuffer.fill(0, nullContentStartIndex);
                    // Update dirty lines and final rendered line
                    dirtyLineStart = Math.min(dirtyLineStart, e.fromLineNumber);
                    dirtyLineEnd = Math.max(dirtyLineEnd, this._finalRenderedLine);
                    this._finalRenderedLine -= e.toLineNumber - e.fromLineNumber + 1;
                    break;
                }
            }
        }
        for (y = viewportData.startLineNumber; y <= viewportData.endLineNumber; y++) {
            // Only attempt to render lines that the GPU renderer can handle
            if (!this._viewGpuContext.canRender(viewLineOptions, viewportData, y)) {
                fillStartIndex =
                    (y - 1) * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
                fillEndIndex = y * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
                cellBuffer.fill(0, fillStartIndex, fillEndIndex);
                dirtyLineStart = Math.min(dirtyLineStart, y);
                dirtyLineEnd = Math.max(dirtyLineEnd, y);
                continue;
            }
            // Skip updating the line if it's already up to date
            if (upToDateLines.has(y)) {
                continue;
            }
            dirtyLineStart = Math.min(dirtyLineStart, y);
            dirtyLineEnd = Math.max(dirtyLineEnd, y);
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
                    if (x > FullFileRenderStrategy.maxSupportedColumns) {
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
                            ((y - 1) * FullFileRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
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
                        ((y - 1) * FullFileRenderStrategy.maxSupportedColumns + x) * 6 /* Constants.IndicesPerCell */;
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
                ((y - 1) * FullFileRenderStrategy.maxSupportedColumns + tokenEndIndex) *
                    6 /* Constants.IndicesPerCell */;
            fillEndIndex = y * FullFileRenderStrategy.maxSupportedColumns * 6 /* Constants.IndicesPerCell */;
            cellBuffer.fill(0, fillStartIndex, fillEndIndex);
            upToDateLines.add(y);
        }
        const visibleObjectCount = (viewportData.endLineNumber - viewportData.startLineNumber + 1) * lineIndexCount;
        // Only write when there is changed data
        dirtyLineStart = Math.min(dirtyLineStart, FullFileRenderStrategy.maxSupportedLines);
        dirtyLineEnd = Math.min(dirtyLineEnd, FullFileRenderStrategy.maxSupportedLines);
        if (dirtyLineStart <= dirtyLineEnd) {
            // Write buffer and swap it out to unblock writes
            this._device.queue.writeBuffer(this._cellBindBuffer, (dirtyLineStart - 1) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT, cellBuffer.buffer, (dirtyLineStart - 1) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT, (dirtyLineEnd - dirtyLineStart + 1) * lineIndexCount * Float32Array.BYTES_PER_ELEMENT);
        }
        this._finalRenderedLine = Math.max(this._finalRenderedLine, dirtyLineEnd);
        this._activeDoubleBufferIndex = this._activeDoubleBufferIndex ? 0 : 1;
        this._visibleObjectCount = visibleObjectCount;
        return visibleObjectCount;
    }
    draw(pass, viewportData) {
        if (this._visibleObjectCount <= 0) {
            throw new BugIndicatingError('Attempt to draw 0 objects');
        }
        pass.draw(quadVertices.length / 2, this._visibleObjectCount, undefined, (viewportData.startLineNumber - 1) * FullFileRenderStrategy.maxSupportedColumns);
    }
    /**
     * Queue updates that need to happen on the active buffer, not just the cache. This will be
     * deferred to when the actual cell buffer is changed since the active buffer could be locked by
     * the GPU which would block the main thread.
     */
    _queueBufferUpdate(e) {
        this._queuedBufferUpdates[0].push(e);
        this._queuedBufferUpdates[1].push(e);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVsbEZpbGVSZW5kZXJTdHJhdGVneS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9yZW5kZXJTdHJhdGVneS9mdWxsRmlsZVJlbmRlclN0cmF0ZWd5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBb0JyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQTBCLE1BQU0sd0JBQXdCLENBQUE7QUFDdkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFNUQsSUFBVyxTQUVWO0FBRkQsV0FBVyxTQUFTO0lBQ25CLDZEQUFrQixDQUFBO0FBQ25CLENBQUMsRUFGVSxTQUFTLEtBQVQsU0FBUyxRQUVuQjtBQUVELElBQVcsY0FTVjtBQVRELFdBQVcsY0FBYztJQUN4Qix1RUFBa0IsQ0FBQTtJQUNsQixzRUFBaUQsQ0FBQTtJQUNqRCwyREFBWSxDQUFBO0lBQ1osMkRBQVksQ0FBQTtJQUNaLHVFQUFrQixDQUFBO0lBQ2xCLHVFQUFrQixDQUFBO0lBQ2xCLCtEQUFjLENBQUE7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