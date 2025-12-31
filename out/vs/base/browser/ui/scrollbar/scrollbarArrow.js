/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { GlobalPointerMoveMonitor } from '../../globalPointerMoveMonitor.js';
import { Widget } from '../widget.js';
import { TimeoutTimer } from '../../../common/async.js';
import { ThemeIcon } from '../../../common/themables.js';
import * as dom from '../../dom.js';
/**
 * The arrow image size.
 */
export const ARROW_IMG_SIZE = 11;
export class ScrollbarArrow extends Widget {
    constructor(opts) {
        super();
        this._onActivate = opts.onActivate;
        this.bgDomNode = document.createElement('div');
        this.bgDomNode.className = 'arrow-background';
        this.bgDomNode.style.position = 'absolute';
        this.bgDomNode.style.width = opts.bgWidth + 'px';
        this.bgDomNode.style.height = opts.bgHeight + 'px';
        if (typeof opts.top !== 'undefined') {
            this.bgDomNode.style.top = '0px';
        }
        if (typeof opts.left !== 'undefined') {
            this.bgDomNode.style.left = '0px';
        }
        if (typeof opts.bottom !== 'undefined') {
            this.bgDomNode.style.bottom = '0px';
        }
        if (typeof opts.right !== 'undefined') {
            this.bgDomNode.style.right = '0px';
        }
        this.domNode = document.createElement('div');
        this.domNode.className = opts.className;
        this.domNode.classList.add(...ThemeIcon.asClassNameArray(opts.icon));
        this.domNode.style.position = 'absolute';
        this.domNode.style.width = ARROW_IMG_SIZE + 'px';
        this.domNode.style.height = ARROW_IMG_SIZE + 'px';
        if (typeof opts.top !== 'undefined') {
            this.domNode.style.top = opts.top + 'px';
        }
        if (typeof opts.left !== 'undefined') {
            this.domNode.style.left = opts.left + 'px';
        }
        if (typeof opts.bottom !== 'undefined') {
            this.domNode.style.bottom = opts.bottom + 'px';
        }
        if (typeof opts.right !== 'undefined') {
            this.domNode.style.right = opts.right + 'px';
        }
        this._pointerMoveMonitor = this._register(new GlobalPointerMoveMonitor());
        this._register(dom.addStandardDisposableListener(this.bgDomNode, dom.EventType.POINTER_DOWN, (e) => this._arrowPointerDown(e)));
        this._register(dom.addStandardDisposableListener(this.domNode, dom.EventType.POINTER_DOWN, (e) => this._arrowPointerDown(e)));
        this._pointerdownRepeatTimer = this._register(new dom.WindowIntervalTimer());
        this._pointerdownScheduleRepeatTimer = this._register(new TimeoutTimer());
    }
    _arrowPointerDown(e) {
        if (!e.target || !(e.target instanceof Element)) {
            return;
        }
        const scheduleRepeater = () => {
            this._pointerdownRepeatTimer.cancelAndSet(() => this._onActivate(), 1000 / 24, dom.getWindow(e));
        };
        this._onActivate();
        this._pointerdownRepeatTimer.cancel();
        this._pointerdownScheduleRepeatTimer.cancelAndSet(scheduleRepeater, 200);
        this._pointerMoveMonitor.startMonitoring(e.target, e.pointerId, e.buttons, (pointerMoveData) => {
            /* Intentional empty */
        }, () => {
            this._pointerdownRepeatTimer.cancel();
            this._pointerdownScheduleRepeatTimer.cancel();
        });
        e.preventDefault();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsYmFyQXJyb3cuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2Nyb2xsYmFyL3Njcm9sbGJhckFycm93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDckMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RCxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUVuQzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUE7QUFnQmhDLE1BQU0sT0FBTyxjQUFlLFNBQVEsTUFBTTtJQVF6QyxZQUFZLElBQTJCO1FBQ3RDLEtBQUssRUFBRSxDQUFBO1FBQ1AsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFBO1FBRWxDLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQTtRQUM3QyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFBO1FBQzFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtRQUNoRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFDbEQsSUFB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