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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjdGFuZ2xlUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9ncHUvcmVjdGFuZ2xlUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQWMsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUdqRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUluRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDakQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLFlBQVksRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sNEJBQTRCLEdBRzVCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUE4QixxQkFBcUIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBYS9GLE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxnQkFBZ0I7SUFrQ3RELFlBQ2tCLFFBQXFCLEVBQ3JCLFlBQWlDLEVBQ2pDLGlCQUFzQyxFQUN0QyxPQUEwQixFQUMxQixJQUFzQixFQUN2QyxNQUEwQjtRQUUxQixLQUFLLEVBQUUsQ0FBQTtRQVBVLGFBQVEsR0FBUixRQUFRLENBQWE7UUFDckIsaUJBQVksR0FBWixZQUFZLENBQXFCO1FBQ2pDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBcUI7UUFDdEMsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7UUFDMUIsU0FBSSxHQUFKLElBQUksQ0FBa0I7UUEvQnZCLHFCQUFnQixHQUE2QyxJQUFJLENBQUMsU0FBUyxDQUMzRixJQUFJLGlCQUFpQixFQUFFLENBQ3ZC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