/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { BugIndicatingError } from '../../../../base/common/errors.js';
import { autorun, runOnChange } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextureAtlasPage } from '../../gpu/atlas/textureAtlasPage.js';
import { GPULifecycle } from '../../gpu/gpuDisposable.js';
import { quadVertices } from '../../gpu/gpuUtils.js';
import { ViewGpuContext } from '../../gpu/viewGpuContext.js';
import { FloatHorizontalRange, HorizontalPosition, HorizontalRange, LineVisibleRanges, VisibleRanges, } from '../../view/renderingContext.js';
import { ViewPart } from '../../view/viewPart.js';
import { ViewLineOptions } from '../viewLines/viewLineOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { TextureAtlas } from '../../gpu/atlas/textureAtlas.js';
import { createContentSegmenter } from '../../gpu/contentSegmenter.js';
import { ViewportRenderStrategy } from '../../gpu/renderStrategy/viewportRenderStrategy.js';
import { FullFileRenderStrategy } from '../../gpu/renderStrategy/fullFileRenderStrategy.js';
import { MutableDisposable } from '../../../../base/common/lifecycle.js';
import { GlyphRasterizer } from '../../gpu/raster/glyphRasterizer.js';
var GlyphStorageBufferInfo;
(function (GlyphStorageBufferInfo) {
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["FloatsPerEntry"] = 6] = "FloatsPerEntry";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["BytesPerEntry"] = 24] = "BytesPerEntry";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_TexturePosition"] = 0] = "Offset_TexturePosition";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_TextureSize"] = 2] = "Offset_TextureSize";
    GlyphStorageBufferInfo[GlyphStorageBufferInfo["Offset_OriginPosition"] = 4] = "Offset_OriginPosition";
})(GlyphStorageBufferInfo || (GlyphStorageBufferInfo = {}));
/**
 * The GPU implementation of the ViewLines part.
 */
let ViewLinesGpu = class ViewLinesGpu extends ViewPart {
    constructor(context, _viewGpuContext, _instantiationService, _logService) {
        super(context);
        this._viewGpuContext = _viewGpuContext;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._atlasGpuTextureVersions = [];
        this._initialized = false;
        this._glyphRasterizer = this._register(new MutableDisposable());
        this._renderStrategy = this._register(new MutableDisposable());
        this.canvas = this._viewGpuContext.canvas.domNode;
        // Re-render the following frame after canvas device pixel dimensions change, provided a
        // new render does not occur.
        this._register(autorun((reader) => {
            this._viewGpuContext.canvasDevicePixelDimensions.read(reader);
            const lastViewportData = this._lastViewportData;
            if (lastViewportData) {
                setTimeout(() => {
                    if (lastViewportData === this._lastViewportData) {
                        this.renderText(lastViewportData);
                    }
                });
            }
        }));
        this.initWebgpu();
    }
    async initWebgpu() {
        // #region General
        this._device = ViewGpuContext.deviceSync || (await ViewGpuContext.device);
        if (this._store.isDisposed) {
            return;
        }
        const atlas = ViewGpuContext.atlas;
        // Rerender when the texture atlas deletes glyphs
        this._register(atlas.onDidDeleteGlyphs(() => {
            this._atlasGpuTextureVersions.length = 0;
            this._atlasGpuTextureVersions[0] = 0;
            this._atlasGpuTextureVersions[1] = 0;
            this._renderStrategy.value.reset();
        }));
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._viewGpuContext.ctx.configure({
            device: this._device,
            format: presentationFormat,
            alphaMode: 'premultiplied',
        });
        this._renderPassColorAttachment = {
            view: null, // Will be filled at render time
            loadOp: 'load',
            storeOp: 'store',
        };
        this._renderPassDescriptor = {
            label: 'Monaco render pass',
            colorAttachments: [this._renderPassColorAttachment],
        };
        // #endregion General
        // #region Uniforms
        let layoutInfoUniformBuffer;
        {
            let Info;
            (function (Info) {
                Info[Info["FloatsPerEntry"] = 6] = "FloatsPerEntry";
                Info[Info["BytesPerEntry"] = 24] = "BytesPerEntry";
                Info[Info["Offset_CanvasWidth____"] = 0] = "Offset_CanvasWidth____";
                Info[Info["Offset_CanvasHeight___"] = 1] = "Offset_CanvasHeight___";
                Info[Info["Offset_ViewportOffsetX"] = 2] = "Offset_ViewportOffsetX";
                Info[Info["Offset_ViewportOffsetY"] = 3] = "Offset_ViewportOffsetY";
                Info[Info["Offset_ViewportWidth__"] = 4] = "Offset_ViewportWidth__";
                Info[Info["Offset_ViewportHeight_"] = 5] = "Offset_ViewportHeight_";
            })(Info || (Info = {}));
            const bufferValues = new Float32Array(6 /* Info.FloatsPerEntry */);
            const updateBufferValues = (canvasDevicePixelWidth = this.canvas.width, canvasDevicePixelHeight = this.canvas.height) => {
                bufferValues[0 /* Info.Offset_CanvasWidth____ */] = canvasDevicePixelWidth;
                bufferValues[1 /* Info.Offset_CanvasHeight___ */] = canvasDevicePixelHeight;
                bufferValues[2 /* Info.Offset_ViewportOffsetX */] = Math.ceil(this._context.configuration.options.get(151 /* EditorOption.layoutInfo */).contentLeft *
                    getActiveWindow().devicePixelRatio);
                bufferValues[3 /* Info.Offset_ViewportOffsetY */] = 0;
                bufferValues[4 /* Info.Offset_ViewportWidth__ */] =
                    bufferValues[0 /* Info.Offset_CanvasWidth____ */] - bufferValues[2 /* Info.Offset_ViewportOffsetX */];
                bufferValues[5 /* Info.Offset_ViewportHeight_ */] =
                    bufferValues[1 /* Info.Offset_CanvasHeight___ */] - bufferValues[3 /* Info.Offset_ViewportOffsetY */];
                return bufferValues;
            };
            layoutInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco uniform buffer',
                size: 24 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => updateBufferValues())).object;
            this._register(runOnChange(this._viewGpuContext.canvasDevicePixelDimensions, ({ width, height }) => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues(width, height));
            }));
            this._register(runOnChange(this._viewGpuContext.contentLeft, () => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues());
            }));
        }
        let atlasInfoUniformBuffer;
        {
            let Info;
            (function (Info) {
                Info[Info["FloatsPerEntry"] = 2] = "FloatsPerEntry";
                Info[Info["BytesPerEntry"] = 8] = "BytesPerEntry";
                Info[Info["Offset_Width_"] = 0] = "Offset_Width_";
                Info[Info["Offset_Height"] = 1] = "Offset_Height";
            })(Info || (Info = {}));
            atlasInfoUniformBuffer = this._register(GPULifecycle.createBuffer(this._device, {
                label: 'Monaco atlas info uniform buffer',
                size: 8 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => {
                const values = new Float32Array(2 /* Info.FloatsPerEntry */);
                values[0 /* Info.Offset_Width_ */] = atlas.pageSize;
                values[1 /* Info.Offset_Height */] = atlas.pageSize;
                return values;
            })).object;
        }
        // #endregion Uniforms
        // #region Storage buffers
        const fontFamily = this._context.configuration.options.get(51 /* EditorOption.fontFamily */);
        const fontSize = this._context.configuration.options.get(54 /* EditorOption.fontSize */);
        this._glyphRasterizer.value = this._register(new GlyphRasterizer(fontSize, fontFamily, this._viewGpuContext.devicePixelRatio.get()));
        this._register(runOnChange(this._viewGpuContext.devicePixelRatio, () => {
            this._refreshGlyphRasterizer();
        }));
        this._renderStrategy.value = this._instantiationService.createInstance(FullFileRenderStrategy, this._context, this._viewGpuContext, this._device, this._glyphRasterizer);
        // this._renderStrategy.value = this._instantiationService.createInstance(ViewportRenderStrategy, this._context, this._viewGpuContext, this._device);
        this._glyphStorageBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco glyph storage buffer',
            size: TextureAtlas.maximumPageCount *
                (TextureAtlasPage.maximumGlyphCount * 24 /* GlyphStorageBufferInfo.BytesPerEntry */),
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })).object;
        this._atlasGpuTextureVersions[0] = 0;
        this._atlasGpuTextureVersions[1] = 0;
        this._atlasGpuTexture = this._register(GPULifecycle.createTexture(this._device, {
            label: 'Monaco atlas texture',
            format: 'rgba8unorm',
            size: {
                width: atlas.pageSize,
                height: atlas.pageSize,
                depthOrArrayLayers: TextureAtlas.maximumPageCount,
            },
            dimension: '2d',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        })).object;
        this._updateAtlasStorageBufferAndTexture();
        // #endregion Storage buffers
        // #region Vertex buffer
        this._vertexBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco vertex buffer',
            size: quadVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }, quadVertices)).object;
        // #endregion Vertex buffer
        // #region Shader module
        const module = this._device.createShaderModule({
            label: 'Monaco shader module',
            code: this._renderStrategy.value.wgsl,
        });
        // #endregion Shader module
        // #region Pipeline
        this._pipeline = this._device.createRenderPipeline({
            label: 'Monaco render pipeline',
            layout: 'auto',
            vertex: {
                module,
                buffers: [
                    {
                        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // 2 floats, 4 bytes each
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x2' }, // position
                        ],
                    },
                ],
            },
            fragment: {
                module,
                targets: [
                    {
                        format: presentationFormat,
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                            },
                            alpha: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                            },
                        },
                    },
                ],
            },
        });
        // #endregion Pipeline
        // #region Bind group
        this._rebuildBindGroup = () => {
            this._bindGroup = this._device.createBindGroup({
                label: 'Monaco bind group',
                layout: this._pipeline.getBindGroupLayout(0),
                entries: [
                    // TODO: Pass in generically as array?
                    { binding: 0 /* BindingId.GlyphInfo */, resource: { buffer: this._glyphStorageBuffer } },
                    {
                        binding: 2 /* BindingId.TextureSampler */,
                        resource: this._device.createSampler({
                            label: 'Monaco atlas sampler',
                            magFilter: 'nearest',
                            minFilter: 'nearest',
                        }),
                    },
                    { binding: 3 /* BindingId.Texture */, resource: this._atlasGpuTexture.createView() },
                    { binding: 4 /* BindingId.LayoutInfoUniform */, resource: { buffer: layoutInfoUniformBuffer } },
                    {
                        binding: 5 /* BindingId.AtlasDimensionsUniform */,
                        resource: { buffer: atlasInfoUniformBuffer },
                    },
                    ...this._renderStrategy.value.bindGroupEntries,
                ],
            });
        };
        this._rebuildBindGroup();
        // endregion Bind group
        this._initialized = true;
        // Render the initial viewport immediately after initialization
        if (this._initViewportData) {
            // HACK: Rendering multiple times in the same frame like this isn't ideal, but there
            //       isn't an easy way to merge viewport data
            for (const viewportData of this._initViewportData) {
                this.renderText(viewportData);
            }
            this._initViewportData = undefined;
        }
    }
    _refreshRenderStrategy(viewportData) {
        if (this._renderStrategy.value?.type === 'viewport') {
            return;
        }
        if (viewportData.endLineNumber < FullFileRenderStrategy.maxSupportedLines &&
            this._viewportMaxColumn(viewportData) < FullFileRenderStrategy.maxSupportedColumns) {
            return;
        }
        this._logService.trace(`File is larger than ${FullFileRenderStrategy.maxSupportedLines} lines or ${FullFileRenderStrategy.maxSupportedColumns} columns, switching to viewport render strategy`);
        const viewportRenderStrategy = this._instantiationService.createInstance(ViewportRenderStrategy, this._context, this._viewGpuContext, this._device, this._glyphRasterizer);
        this._renderStrategy.value = viewportRenderStrategy;
        this._register(viewportRenderStrategy.onDidChangeBindGroupEntries(() => this._rebuildBindGroup?.()));
        this._rebuildBindGroup?.();
    }
    _viewportMaxColumn(viewportData) {
        let maxColumn = 0;
        let lineData;
        for (let i = viewportData.startLineNumber; i <= viewportData.endLineNumber; i++) {
            lineData = viewportData.getViewLineRenderingData(i);
            maxColumn = Math.max(maxColumn, lineData.maxColumn);
        }
        return maxColumn;
    }
    _updateAtlasStorageBufferAndTexture() {
        for (const [layerIndex, page] of ViewGpuContext.atlas.pages.entries()) {
            if (layerIndex >= TextureAtlas.maximumPageCount) {
                console.log(`Attempt to upload atlas page [${layerIndex}], only ${TextureAtlas.maximumPageCount} are supported currently`);
                continue;
            }
            // Skip the update if it's already the latest version
            if (page.version === this._atlasGpuTextureVersions[layerIndex]) {
                continue;
            }
            this._logService.trace('Updating atlas page[', layerIndex, '] from version ', this._atlasGpuTextureVersions[layerIndex], ' to version ', page.version);
            const entryCount = 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount;
            const values = new Float32Array(entryCount);
            let entryOffset = 0;
            for (const glyph of page.glyphs) {
                values[entryOffset + 0 /* GlyphStorageBufferInfo.Offset_TexturePosition */] = glyph.x;
                values[entryOffset + 0 /* GlyphStorageBufferInfo.Offset_TexturePosition */ + 1] = glyph.y;
                values[entryOffset + 2 /* GlyphStorageBufferInfo.Offset_TextureSize */] = glyph.w;
                values[entryOffset + 2 /* GlyphStorageBufferInfo.Offset_TextureSize */ + 1] = glyph.h;
                values[entryOffset + 4 /* GlyphStorageBufferInfo.Offset_OriginPosition */] = glyph.originOffsetX;
                values[entryOffset + 4 /* GlyphStorageBufferInfo.Offset_OriginPosition */ + 1] = glyph.originOffsetY;
                entryOffset += 6 /* GlyphStorageBufferInfo.FloatsPerEntry */;
            }
            if (entryOffset / 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ >
                TextureAtlasPage.maximumGlyphCount) {
                throw new Error(`Attempting to write more glyphs (${entryOffset / 6 /* GlyphStorageBufferInfo.FloatsPerEntry */}) than the GPUBuffer can hold (${TextureAtlasPage.maximumGlyphCount})`);
            }
            this._device.queue.writeBuffer(this._glyphStorageBuffer, layerIndex *
                6 /* GlyphStorageBufferInfo.FloatsPerEntry */ *
                TextureAtlasPage.maximumGlyphCount *
                Float32Array.BYTES_PER_ELEMENT, values, 0, 6 /* GlyphStorageBufferInfo.FloatsPerEntry */ * TextureAtlasPage.maximumGlyphCount);
            if (page.usedArea.right - page.usedArea.left > 0 &&
                page.usedArea.bottom - page.usedArea.top > 0) {
                this._device.queue.copyExternalImageToTexture({ source: page.source }, {
                    texture: this._atlasGpuTexture,
                    origin: {
                        x: page.usedArea.left,
                        y: page.usedArea.top,
                        z: layerIndex,
                    },
                }, {
                    width: page.usedArea.right - page.usedArea.left + 1,
                    height: page.usedArea.bottom - page.usedArea.top + 1,
                });
            }
            this._atlasGpuTextureVersions[layerIndex] = page.version;
        }
    }
    prepareRender(ctx) {
        throw new BugIndicatingError('Should not be called');
    }
    render(ctx) {
        throw new BugIndicatingError('Should not be called');
    }
    // #region Event handlers
    // Since ViewLinesGpu currently coordinates rendering to the canvas, it must listen to all
    // changed events that any GPU part listens to. This is because any drawing to the canvas will
    // clear it for that frame, so all parts must be rendered every time.
    //
    // Additionally, since this is intrinsically linked to ViewLines, it must also listen to events
    // from that side. Luckily rendering is cheap, it's only when uploaded data changes does it
    // start to cost.
    onConfigurationChanged(e) {
        this._refreshGlyphRasterizer();
        return true;
    }
    onCursorStateChanged(e) {
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
    onLineMappingChanged(e) {
        return true;
    }
    onRevealRangeRequest(e) {
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onThemeChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // #endregion
    _refreshGlyphRasterizer() {
        const glyphRasterizer = this._glyphRasterizer.value;
        if (!glyphRasterizer) {
            return;
        }
        const fontFamily = this._context.configuration.options.get(51 /* EditorOption.fontFamily */);
        const fontSize = this._context.configuration.options.get(54 /* EditorOption.fontSize */);
        const devicePixelRatio = this._viewGpuContext.devicePixelRatio.get();
        if (glyphRasterizer.fontFamily !== fontFamily ||
            glyphRasterizer.fontSize !== fontSize ||
            glyphRasterizer.devicePixelRatio !== devicePixelRatio) {
            this._glyphRasterizer.value = new GlyphRasterizer(fontSize, fontFamily, devicePixelRatio);
        }
    }
    renderText(viewportData) {
        if (this._initialized) {
            this._refreshRenderStrategy(viewportData);
            return this._renderText(viewportData);
        }
        else {
            this._initViewportData = this._initViewportData ?? [];
            this._initViewportData.push(viewportData);
        }
    }
    _renderText(viewportData) {
        this._viewGpuContext.rectangleRenderer.draw(viewportData);
        const options = new ViewLineOptions(this._context.configuration, this._context.theme.type);
        this._renderStrategy.value.update(viewportData, options);
        this._updateAtlasStorageBufferAndTexture();
        const encoder = this._device.createCommandEncoder({ label: 'Monaco command encoder' });
        this._renderPassColorAttachment.view = this._viewGpuContext.ctx
            .getCurrentTexture()
            .createView({ label: 'Monaco canvas texture view' });
        const pass = encoder.beginRenderPass(this._renderPassDescriptor);
        pass.setPipeline(this._pipeline);
        pass.setVertexBuffer(0, this._vertexBuffer);
        // Only draw the content area
        const contentLeft = Math.ceil(this._viewGpuContext.contentLeft.get() * this._viewGpuContext.devicePixelRatio.get());
        pass.setScissorRect(contentLeft, 0, this.canvas.width - contentLeft, this.canvas.height);
        pass.setBindGroup(0, this._bindGroup);
        this._renderStrategy.value.draw(pass, viewportData);
        pass.end();
        const commandBuffer = encoder.finish();
        this._device.queue.submit([commandBuffer]);
        this._lastViewportData = viewportData;
        this._lastViewLineOptions = options;
    }
    linesVisibleRangesForRange(_range, includeNewLines) {
        if (!this._lastViewportData) {
            return null;
        }
        const originalEndLineNumber = _range.endLineNumber;
        const range = Range.intersectRanges(_range, this._lastViewportData.visibleRange);
        if (!range) {
            return null;
        }
        const rendStartLineNumber = this._lastViewportData.startLineNumber;
        const rendEndLineNumber = this._lastViewportData.endLineNumber;
        const viewportData = this._lastViewportData;
        const viewLineOptions = this._lastViewLineOptions;
        if (!viewportData || !viewLineOptions) {
            return null;
        }
        const visibleRanges = [];
        let nextLineModelLineNumber = 0;
        if (includeNewLines) {
            nextLineModelLineNumber =
                this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(range.startLineNumber, 1)).lineNumber;
        }
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
            if (lineNumber < rendStartLineNumber || lineNumber > rendEndLineNumber) {
                continue;
            }
            const startColumn = lineNumber === range.startLineNumber ? range.startColumn : 1;
            const continuesInNextLine = lineNumber !== range.endLineNumber;
            const endColumn = continuesInNextLine
                ? this._context.viewModel.getLineMaxColumn(lineNumber)
                : range.endColumn;
            const visibleRangesForLine = this._visibleRangesForLineRange(lineNumber, startColumn, endColumn);
            if (!visibleRangesForLine) {
                continue;
            }
            if (includeNewLines && lineNumber < originalEndLineNumber) {
                const currentLineModelLineNumber = nextLineModelLineNumber;
                nextLineModelLineNumber =
                    this._context.viewModel.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumber + 1, 1)).lineNumber;
                if (currentLineModelLineNumber !== nextLineModelLineNumber) {
                    visibleRangesForLine.ranges[visibleRangesForLine.ranges.length - 1].width +=
                        viewLineOptions.spaceWidth;
                }
            }
            visibleRanges.push(new LineVisibleRanges(visibleRangesForLine.outsideRenderedLine, lineNumber, HorizontalRange.from(visibleRangesForLine.ranges), continuesInNextLine));
        }
        if (visibleRanges.length === 0) {
            return null;
        }
        return visibleRanges;
    }
    _visibleRangesForLineRange(lineNumber, startColumn, endColumn) {
        if (this.shouldRender()) {
            // Cannot read from the DOM because it is dirty
            // i.e. the model & the dom are out of sync, so I'd be reading something stale
            return null;
        }
        const viewportData = this._lastViewportData;
        const viewLineOptions = this._lastViewLineOptions;
        if (!viewportData ||
            !viewLineOptions ||
            lineNumber < viewportData.startLineNumber ||
            lineNumber > viewportData.endLineNumber) {
            return null;
        }
        // Resolve tab widths for this line
        const lineData = viewportData.getViewLineRenderingData(lineNumber);
        const content = lineData.content;
        let contentSegmenter;
        if (!(lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations)) {
            contentSegmenter = createContentSegmenter(lineData, viewLineOptions);
        }
        let chars = '';
        let resolvedStartColumn = 0;
        let resolvedStartCssPixelOffset = 0;
        for (let x = 0; x < startColumn - 1; x++) {
            if (lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations) {
                chars = content.charAt(x);
            }
            else {
                chars = contentSegmenter.getSegmentAtIndex(x);
                if (chars === undefined) {
                    continue;
                }
                resolvedStartCssPixelOffset +=
                    this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width /
                        getActiveWindow().devicePixelRatio -
                        viewLineOptions.spaceWidth;
            }
            if (chars === '\t') {
                resolvedStartColumn = CursorColumns.nextRenderTabStop(resolvedStartColumn, lineData.tabSize);
            }
            else {
                resolvedStartColumn++;
            }
        }
        let resolvedEndColumn = resolvedStartColumn;
        let resolvedEndCssPixelOffset = 0;
        for (let x = startColumn - 1; x < endColumn - 1; x++) {
            if (lineData.isBasicASCII && viewLineOptions.useMonospaceOptimizations) {
                chars = content.charAt(x);
            }
            else {
                chars = contentSegmenter.getSegmentAtIndex(x);
                if (chars === undefined) {
                    continue;
                }
                resolvedEndCssPixelOffset +=
                    this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width /
                        getActiveWindow().devicePixelRatio -
                        viewLineOptions.spaceWidth;
            }
            if (chars === '\t') {
                resolvedEndColumn = CursorColumns.nextRenderTabStop(resolvedEndColumn, lineData.tabSize);
            }
            else {
                resolvedEndColumn++;
            }
        }
        // Visible horizontal range in _scaled_ pixels
        const result = new VisibleRanges(false, [
            new FloatHorizontalRange(resolvedStartColumn * viewLineOptions.spaceWidth + resolvedStartCssPixelOffset, (resolvedEndColumn - resolvedStartColumn) * viewLineOptions.spaceWidth +
                resolvedEndCssPixelOffset),
        ]);
        return result;
    }
    visibleRangeForPosition(position) {
        const visibleRanges = this._visibleRangesForLineRange(position.lineNumber, position.column, position.column);
        if (!visibleRanges) {
            return null;
        }
        return new HorizontalPosition(visibleRanges.outsideRenderedLine, visibleRanges.ranges[0].left);
    }
    getLineWidth(lineNumber) {
        if (!this._lastViewportData || !this._lastViewLineOptions) {
            return undefined;
        }
        if (!this._viewGpuContext.canRender(this._lastViewLineOptions, this._lastViewportData, lineNumber)) {
            return undefined;
        }
        const lineData = this._lastViewportData.getViewLineRenderingData(lineNumber);
        const lineRange = this._visibleRangesForLineRange(lineNumber, 1, lineData.maxColumn);
        const lastRange = lineRange?.ranges.at(-1);
        if (lastRange) {
            return lastRange.width;
        }
        return undefined;
    }
    getPositionAtCoordinate(lineNumber, mouseContentHorizontalOffset) {
        if (!this._lastViewportData || !this._lastViewLineOptions) {
            return undefined;
        }
        if (!this._viewGpuContext.canRender(this._lastViewLineOptions, this._lastViewportData, lineNumber)) {
            return undefined;
        }
        const lineData = this._lastViewportData.getViewLineRenderingData(lineNumber);
        const content = lineData.content;
        const dpr = getActiveWindow().devicePixelRatio;
        const mouseContentHorizontalOffsetDevicePixels = mouseContentHorizontalOffset * dpr;
        const spaceWidthDevicePixels = this._lastViewLineOptions.spaceWidth * dpr;
        const contentSegmenter = createContentSegmenter(lineData, this._lastViewLineOptions);
        let widthSoFar = 0;
        let charWidth = 0;
        let tabXOffset = 0;
        let column = 0;
        for (let x = 0; x < content.length; x++) {
            const chars = contentSegmenter.getSegmentAtIndex(x);
            // Part of an earlier segment
            if (chars === undefined) {
                column++;
                continue;
            }
            // Get the width of the character
            if (chars === '\t') {
                // Find the pixel offset between the current position and the next tab stop
                const offsetBefore = x + tabXOffset;
                tabXOffset = CursorColumns.nextRenderTabStop(x + tabXOffset, lineData.tabSize);
                charWidth = spaceWidthDevicePixels * (tabXOffset - offsetBefore);
                // Convert back to offset excluding x and the current character
                tabXOffset -= x + 1;
            }
            else if (lineData.isBasicASCII && this._lastViewLineOptions.useMonospaceOptimizations) {
                charWidth = spaceWidthDevicePixels;
            }
            else {
                charWidth = this._renderStrategy.value.glyphRasterizer.getTextMetrics(chars).width;
            }
            if (mouseContentHorizontalOffsetDevicePixels < widthSoFar + charWidth / 2) {
                break;
            }
            widthSoFar += charWidth;
            column++;
        }
        return new Position(lineNumber, column + 1);
    }
};
ViewLinesGpu = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], ViewLinesGpu);
export { ViewLinesGpu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0xpbmVzR3B1LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdMaW5lc0dwdS92aWV3TGluZXNHcHUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIsZUFBZSxFQUVmLGlCQUFpQixFQUdqQixhQUFhLEdBQ2IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxh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