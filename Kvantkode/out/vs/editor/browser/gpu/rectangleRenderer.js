/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveWindow } from '../../../base/browser/dom.js';
import { Event } from '../../../base/common/event.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { ViewEventHandler } from '../../common/viewEventHandler.js';
import { GPULifecycle } from './gpuDisposable.js';
import { observeDevicePixelDimensions, quadVertices } from './gpuUtils.js';
import { createObjectCollectionBuffer, } from './objectCollectionBuffer.js';
import { rectangleRendererWgsl } from './rectangleRenderer.wgsl.js';
export class RectangleRenderer extends ViewEventHandler {
    constructor(_context, _contentLeft, _devicePixelRatio, _canvas, _ctx, device) {
        super();
        this._context = _context;
        this._contentLeft = _contentLeft;
        this._devicePixelRatio = _devicePixelRatio;
        this._canvas = _canvas;
        this._ctx = _ctx;
        this._shapeBindBuffer = this._register(new MutableDisposable());
        this._initialized = false;
        this._shapeCollection = this._register(createObjectCollectionBuffer([
            { name: 'x' },
            { name: 'y' },
            { name: 'width' },
            { name: 'height' },
            { name: 'red' },
            { name: 'green' },
            { name: 'blue' },
            { name: 'alpha' },
        ], 32));
        this._context.addEventHandler(this);
        this._initWebgpu(device);
    }
    async _initWebgpu(device) {
        // #region General
        this._device = await device;
        if (this._store.isDisposed) {
            return;
        }
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this._ctx.configure({
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
            label: 'Monaco rectangle renderer render pass',
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
            const updateBufferValues = (canvasDevicePixelWidth = this._canvas.width, canvasDevicePixelHeight = this._canvas.height) => {
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
                label: 'Monaco rectangle renderer uniform buffer',
                size: 24 /* Info.BytesPerEntry */,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            }, () => updateBufferValues())).object;
            this._register(observeDevicePixelDimensions(this._canvas, getActiveWindow(), (w, h) => {
                this._device.queue.writeBuffer(layoutInfoUniformBuffer, 0, updateBufferValues(w, h));
            }));
        }
        const scrollOffsetBufferSize = 2;
        this._scrollOffsetBindBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco rectangle renderer scroll offset buffer',
            size: scrollOffsetBufferSize * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })).object;
        this._scrollOffsetValueBuffer = new Float32Array(scrollOffsetBufferSize);
        // #endregion Uniforms
        // #region Storage buffers
        const createShapeBindBuffer = () => {
            return GPULifecycle.createBuffer(this._device, {
                label: 'Monaco rectangle renderer shape buffer',
                size: this._shapeCollection.buffer.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
        };
        this._shapeBindBuffer.value = createShapeBindBuffer();
        this._register(Event.runAndSubscribe(this._shapeCollection.onDidChangeBuffer, () => {
            this._shapeBindBuffer.value = createShapeBindBuffer();
            if (this._pipeline) {
                this._updateBindGroup(this._pipeline, layoutInfoUniformBuffer);
            }
        }));
        // #endregion Storage buffers
        // #region Vertex buffer
        this._vertexBuffer = this._register(GPULifecycle.createBuffer(this._device, {
            label: 'Monaco rectangle renderer vertex buffer',
            size: quadVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        }, quadVertices)).object;
        // #endregion Vertex buffer
        // #region Shader module
        const module = this._device.createShaderModule({
            label: 'Monaco rectangle renderer shader module',
            code: rectangleRendererWgsl,
        });
        // #endregion Shader module
        // #region Pipeline
        this._pipeline = this._device.createRenderPipeline({
            label: 'Monaco rectangle renderer render pipeline',
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
        this._updateBindGroup(this._pipeline, layoutInfoUniformBuffer);
        // endregion Bind group
        this._initialized = true;
    }
    _updateBindGroup(pipeline, layoutInfoUniformBuffer) {
        this._bindGroup = this._device.createBindGroup({
            label: 'Monaco rectangle renderer bind group',
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0 /* RectangleRendererBindingId.Shapes */,
                    resource: { buffer: this._shapeBindBuffer.value.object },
                },
                {
                    binding: 1 /* RectangleRendererBindingId.LayoutInfoUniform */,
                    resource: { buffer: layoutInfoUniformBuffer },
                },
                {
                    binding: 2 /* RectangleRendererBindingId.ScrollOffset */,
                    resource: { buffer: this._scrollOffsetBindBuffer },
                },
            ],
        });
    }
    register(x, y, width, height, red, green, blue, alpha) {
        return this._shapeCollection.createEntry({ x, y, width, height, red, green, blue, alpha });
    }
    // #region Event handlers
    onScrollChanged(e) {
        if (this._device) {
            const dpr = getActiveWindow().devicePixelRatio;
            this._scrollOffsetValueBuffer[0] = this._context.viewLayout.getCurrentScrollLeft() * dpr;
            this._scrollOffsetValueBuffer[1] = this._context.viewLayout.getCurrentScrollTop() * dpr;
            this._device.queue.writeBuffer(this._scrollOffsetBindBuffer, 0, this._scrollOffsetValueBuffer);
        }
        return true;
    }
    // #endregion
    _update() {
        if (!this._device) {
            return;
        }
        const shapes = this._shapeCollection;
        if (shapes.dirtyTracker.isDirty) {
            this._device.queue.writeBuffer(this._shapeBindBuffer.value.object, 0, shapes.buffer, shapes.dirtyTracker.dataOffset, shapes.dirtyTracker.dirtySize * shapes.view.BYTES_PER_ELEMENT);
            shapes.dirtyTracker.clear();
        }
    }
    draw(viewportData) {
        if (!this._initialized) {
            return;
        }
        this._update();
        const encoder = this._device.createCommandEncoder({
            label: 'Monaco rectangle renderer command encoder',
        });
        this._renderPassColorAttachment.view = this._ctx.getCurrentTexture().createView();
        const pass = encoder.beginRenderPass(this._renderPassDescriptor);
        pass.setPipeline(this._pipeline);
        pass.setVertexBuffer(0, this._vertexBuffer);
        pass.setBindGroup(0, this._bindGroup);
        // Only draw the content area
        const contentLeft = Math.ceil(this._contentLeft.get() * this._devicePixelRatio.get());
        pass.setScissorRect(contentLeft, 0, this._canvas.width - contentLeft, this._canvas.height);
        pass.draw(quadVertices.length / 2, this._shapeCollection.entryCount);
        pass.end();
        const commandBuffer = encoder.finish();
        this._device.queue.submit([commandBuffer]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjdGFuZ2xlUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9yZWN0YW5nbGVSZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBYyxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR2pGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSW5FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsWUFBWSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQzFFLE9BQU8sRUFDTiw0QkFBNEIsR0FHNUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQThCLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFhL0YsTUFBTSxPQUFPLGlCQUFrQixTQUFRLGdCQUFnQjtJQWtDdEQsWUFDa0IsUUFBcUIsRUFDckIsWUFBaUMsRUFDakMsaUJBQXNDLEVBQ3RDLE9BQTBCLEVBQzFCLElBQXNCLEVBQ3ZDLE1BQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFBO1FBUFUsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBcUI7UUFDakMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFxQjtRQUN0QyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtRQUMxQixTQUFJLEdBQUosSUFBSSxDQUFrQjtRQS9CdkIscUJBQWdCLEdBQTZDLElBQUksQ0FBQyxTQUFTLENBQzNG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