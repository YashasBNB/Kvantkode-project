/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { getWindow, scheduleAtNextAnimationFrame } from '../../../base/browser/dom.js';
export class ElementSizeObserver extends Disposable {
    constructor(referenceDomElement, dimension) {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._referenceDomElement = referenceDomElement;
        this._width = -1;
        this._height = -1;
        this._resizeObserver = null;
        this.measureReferenceDomElement(false, dimension);
    }
    dispose() {
        this.stopObserving();
        super.dispose();
    }
    getWidth() {
        return this._width;
    }
    getHeight() {
        return this._height;
    }
    startObserving() {
        if (!this._resizeObserver && this._referenceDomElement) {
            // We want to react to the resize observer only once per animation frame
            // The first time the resize observer fires, we will react to it immediately.
            // Otherwise we will postpone to the next animation frame.
            // We'll use `observeContentRect` to store the content rect we received.
            let observedDimenstion = null;
            const observeNow = () => {
                if (observedDimenstion) {
                    this.observe({ width: observedDimenstion.width, height: observedDimenstion.height });
                }
                else {
                    this.observe();
                }
            };
            let shouldObserve = false;
            let alreadyObservedThisAnimationFrame = false;
            const update = () => {
                if (shouldObserve && !alreadyObservedThisAnimationFrame) {
                    try {
                        shouldObserve = false;
                        alreadyObservedThisAnimationFrame = true;
                        observeNow();
                    }
                    finally {
                        scheduleAtNextAnimationFrame(getWindow(this._referenceDomElement), () => {
                            alreadyObservedThisAnimationFrame = false;
                            update();
                        });
                    }
                }
            };
            this._resizeObserver = new ResizeObserver((entries) => {
                if (entries && entries[0] && entries[0].contentRect) {
                    observedDimenstion = {
                        width: entries[0].contentRect.width,
                        height: entries[0].contentRect.height,
                    };
                }
                else {
                    observedDimenstion = null;
                }
                shouldObserve = true;
                update();
            });
            this._resizeObserver.observe(this._referenceDomElement);
        }
    }
    stopObserving() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }
    observe(dimension) {
        this.measureReferenceDomElement(true, dimension);
    }
    measureReferenceDomElement(emitEvent, dimension) {
        let observedWidth = 0;
        let observedHeight = 0;
        if (dimension) {
            observedWidth = dimension.width;
            observedHeight = dimension.height;
        }
        else if (this._referenceDomElement) {
            observedWidth = this._referenceDomElement.clientWidth;
            observedHeight = this._referenceDomElement.clientHeight;
        }
        observedWidth = Math.max(5, observedWidth);
        observedHeight = Math.max(5, observedHeight);
        if (this._width !== observedWidth || this._height !== observedHeight) {
            this._width = observedWidth;
            this._height = observedHeight;
            if (emitEvent) {
                this._onDidChange.fire();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlbWVudFNpemVPYnNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbmZpZy9lbGVtZW50U2l6ZU9ic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRGLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxVQUFVO0lBU2xELFlBQVksbUJBQXVDLEVBQUUsU0FBaUM7UUFDckYsS0FBSyxFQUFFLENBQUE7UUFUQSxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzFDLGdCQUFXLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBU2pFLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQTtRQUMvQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hCLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDakIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFDM0IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDcEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFTSxT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