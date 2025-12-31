/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { IframeUtils } from './iframe.js';
import * as platform from '../common/platform.js';
export class StandardMouseEvent {
    constructor(targetWindow, e) {
        this.timestamp = Date.now();
        this.browserEvent = e;
        this.leftButton = e.button === 0;
        this.middleButton = e.button === 1;
        this.rightButton = e.button === 2;
        this.buttons = e.buttons;
        this.target = e.target;
        this.detail = e.detail || 1;
        if (e.type === 'dblclick') {
            this.detail = 2;
        }
        this.ctrlKey = e.ctrlKey;
        this.shiftKey = e.shiftKey;
        this.altKey = e.altKey;
        this.metaKey = e.metaKey;
        if (typeof e.pageX === 'number') {
            this.posx = e.pageX;
            this.posy = e.pageY;
        }
        else {
            // Probably hit by MSGestureEvent
            this.posx =
                e.clientX +
                    this.target.ownerDocument.body.scrollLeft +
                    this.target.ownerDocument.documentElement.scrollLeft;
            this.posy =
                e.clientY +
                    this.target.ownerDocument.body.scrollTop +
                    this.target.ownerDocument.documentElement.scrollTop;
        }
        // Find the position of the iframe this code is executing in relative to the iframe where the event was captured.
        const iframeOffsets = IframeUtils.getPositionOfChildWindowRelativeToAncestorWindow(targetWindow, e.view);
        this.posx -= iframeOffsets.left;
        this.posy -= iframeOffsets.top;
    }
    preventDefault() {
        this.browserEvent.preventDefault();
    }
    stopPropagation() {
        this.browserEvent.stopPropagation();
    }
}
export class DragMouseEvent extends StandardMouseEvent {
    constructor(targetWindow, e) {
        super(targetWindow, e);
        this.dataTransfer = e.dataTransfer;
    }
}
export class StandardWheelEvent {
    constructor(e, deltaX = 0, deltaY = 0) {
        this.browserEvent = e || null;
        this.target = e ? e.target || e.targetNode || e.srcElement : null;
        this.deltaY = deltaY;
        this.deltaX = deltaX;
        let shouldFactorDPR = false;
        if (browser.isChrome) {
            // Chrome version >= 123 contains the fix to factor devicePixelRatio into the wheel event.
            // See https://chromium.googlesource.com/chromium/src.git/+/be51b448441ff0c9d1f17e0f25c4bf1ab3f11f61
            const chromeVersionMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
            const chromeMajorVersion = chromeVersionMatch ? parseInt(chromeVersionMatch[1]) : 123;
            shouldFactorDPR = chromeMajorVersion <= 122;
        }
        if (e) {
            // Old (deprecated) wheel events
            const e1 = e;
            const e2 = e;
            const devicePixelRatio = e.view?.devicePixelRatio || 1;
            // vertical delta scroll
            if (typeof e1.wheelDeltaY !== 'undefined') {
                if (shouldFactorDPR) {
                    // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                    this.deltaY = e1.wheelDeltaY / (120 * devicePixelRatio);
                }
                else {
                    this.deltaY = e1.wheelDeltaY / 120;
                }
            }
            else if (typeof e2.VERTICAL_AXIS !== 'undefined' && e2.axis === e2.VERTICAL_AXIS) {
                this.deltaY = -e2.detail / 3;
            }
            else if (e.type === 'wheel') {
                // Modern wheel event
                // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
                const ev = e;
                if (ev.deltaMode === ev.DOM_DELTA_LINE) {
                    // the deltas are expressed in lines
                    if (browser.isFirefox && !platform.isMacintosh) {
                        this.deltaY = -e.deltaY / 3;
                    }
                    else {
                        this.deltaY = -e.deltaY;
                    }
                }
                else {
                    this.deltaY = -e.deltaY / 40;
                }
            }
            // horizontal delta scroll
            if (typeof e1.wheelDeltaX !== 'undefined') {
                if (browser.isSafari && platform.isWindows) {
                    this.deltaX = -(e1.wheelDeltaX / 120);
                }
                else if (shouldFactorDPR) {
                    // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                    this.deltaX = e1.wheelDeltaX / (120 * devicePixelRatio);
                }
                else {
                    this.deltaX = e1.wheelDeltaX / 120;
                }
            }
            else if (typeof e2.HORIZONTAL_AXIS !== 'undefined' && e2.axis === e2.HORIZONTAL_AXIS) {
                this.deltaX = -e.detail / 3;
            }
            else if (e.type === 'wheel') {
                // Modern wheel event
                // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent
                const ev = e;
                if (ev.deltaMode === ev.DOM_DELTA_LINE) {
                    // the deltas are expressed in lines
                    if (browser.isFirefox && !platform.isMacintosh) {
                        this.deltaX = -e.deltaX / 3;
                    }
                    else {
                        this.deltaX = -e.deltaX;
                    }
                }
                else {
                    this.deltaX = -e.deltaX / 40;
                }
            }
            // Assume a vertical scroll if nothing else worked
            if (this.deltaY === 0 && this.deltaX === 0 && e.wheelDelta) {
                if (shouldFactorDPR) {
                    // Refs https://github.com/microsoft/vscode/issues/146403#issuecomment-1854538928
                    this.deltaY = e.wheelDelta / (120 * devicePixelRatio);
                }
                else {
                    this.deltaY = e.wheelDelta / 120;
                }
            }
        }
    }
    preventDefault() {
        this.browserEvent?.preventDefault();
    }
    stopPropagation() {
        this.browserEvent?.stopPropagation();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW91c2VFdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9tb3VzZUV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDekMsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQTtBQXNCakQsTUFBTSxPQUFPLGtCQUFrQjtJQWlCOUIsWUFBWSxZQUFvQixFQUFFLENBQWE7UUFDOUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUE7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQTtRQUNoQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUE7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBRXhCLElBQUksQ0FBQyxNQUFNLEdBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFFbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQTtRQUMzQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDaEIsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtRQUN4QixJQUFJLENB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