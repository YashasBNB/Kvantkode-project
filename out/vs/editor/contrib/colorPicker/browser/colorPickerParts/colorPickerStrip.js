/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import '../colorPicker.css';
import * as dom from '../../../../../base/browser/dom.js';
import { GlobalPointerMoveMonitor } from '../../../../../base/browser/globalPointerMoveMonitor.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
const $ = dom.$;
export class Strip extends Disposable {
    constructor(container, model, type) {
        super();
        this.model = model;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onColorFlushed = new Emitter();
        this.onColorFlushed = this._onColorFlushed.event;
        if (type === "standalone" /* ColorPickerWidgetType.Standalone */) {
            this.domNode = dom.append(container, $('.standalone-strip'));
            this.overlay = dom.append(this.domNode, $('.standalone-overlay'));
        }
        else {
            this.domNode = dom.append(container, $('.strip'));
            this.overlay = dom.append(this.domNode, $('.overlay'));
        }
        this.slider = dom.append(this.domNode, $('.slider'));
        this.slider.style.top = `0px`;
        this._register(dom.addDisposableListener(this.domNode, dom.EventType.POINTER_DOWN, (e) => this.onPointerDown(e)));
        this._register(model.onDidChangeColor(this.onDidChangeColor, this));
        this.layout();
    }
    layout() {
        this.height = this.domNode.offsetHeight - this.slider.offsetHeight;
        const value = this.getValue(this.model.color);
        this.updateSliderPosition(value);
    }
    onDidChangeColor(color) {
        const value = this.getValue(color);
        this.updateSliderPosition(value);
    }
    onPointerDown(e) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const monitor = this._register(new GlobalPointerMoveMonitor());
        const origin = dom.getDomNodePagePosition(this.domNode);
        this.domNode.classList.add('grabbing');
        if (e.target !== this.slider) {
            this.onDidChangeTop(e.offsetY);
        }
        monitor.startMonitoring(e.target, e.pointerId, e.buttons, (event) => this.onDidChangeTop(event.pageY - origin.top), () => null);
        const pointerUpListener = dom.addDisposableListener(e.target.ownerDocument, dom.EventType.POINTER_UP, () => {
            this._onColorFlushed.fire();
            pointerUpListener.dispose();
            monitor.stopMonitoring(true);
            this.domNode.classList.remove('grabbing');
        }, true);
    }
    onDidChangeTop(top) {
        const value = Math.max(0, Math.min(1, 1 - top / this.height));
        this.updateSliderPosition(value);
        this._onDidChange.fire(value);
    }
    updateSliderPosition(value) {
        this.slider.style.top = `${(1 - value) * this.height}px`;
    }
}
export class OpacityStrip extends Strip {
    constructor(container, model, type) {
        super(container, model, type);
        this.domNode.classList.add('opacity-strip');
        this.onDidChangeColor(this.model.color);
    }
    onDidChangeColor(color) {
        super.onDidChangeColor(color);
        const { r, g, b } = color.rgba;
        const opaque = new Color(new RGBA(r, g, b, 1));
        const transparent = new Color(new RGBA(r, g, b, 0));
        this.overlay.style.background = `linear-gradient(to bottom, ${opaque} 0%, ${transparent} 100%)`;
    }
    getValue(color) {
        return color.hsva.a;
    }
}
export class HueStrip extends Strip {
    constructor(container, model, type) {
        super(container, model, type);
        this.domNode.classList.add('hue-strip');
    }
    getValue(color) {
        return 1 - color.hsva.h / 360;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJTdHJpcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3JQaWNrZXJQYXJ0cy9jb2xvclBpY2tlclN0cmlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFJcEUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVmLE1BQU0sT0FBZ0IsS0FBTSxTQUFRLFVBQVU7SUFZN0MsWUFDQyxTQUFzQixFQUNaLEtBQXVCLEVBQ2pDLElBQTJCO1FBRTNCLEtBQUssRUFBRSxDQUFBO1FBSEcsVUFBSyxHQUFMLEtBQUssQ0FBa0I7UUFSakIsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBVSxDQUFBO1FBQzVDLGdCQUFXLEdBQWtCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBRTVDLG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUM3QyxtQkFBYyxHQUFnQixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQTtRQVFoRSxJQUFJLElBQUksd0RBQXFDLEVBQUUsQ0FBQztZQUMvQyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FB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