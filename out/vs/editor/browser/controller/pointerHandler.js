/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BrowserFeatures } from '../../../base/browser/canIUse.js';
import * as dom from '../../../base/browser/dom.js';
import { EventType, Gesture } from '../../../base/browser/touch.js';
import { mainWindow } from '../../../base/browser/window.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import { MouseHandler } from './mouseHandler.js';
import { EditorMouseEvent, EditorPointerEventFactory } from '../editorDom.js';
import { TextAreaSyntethicEvents } from './editContext/textArea/textAreaEditContextInput.js';
/**
 * Currently only tested on iOS 13/ iPadOS.
 */
export class PointerEventHandler extends MouseHandler {
    constructor(context, viewController, viewHelper) {
        super(context, viewController, viewHelper);
        this._register(Gesture.addTarget(this.viewHelper.linesContentDomNode));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Tap, (e) => this.onTap(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Change, (e) => this.onChange(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Contextmenu, (e) => this._onContextMenu(new EditorMouseEvent(e, false, this.viewHelper.viewDomNode), false)));
        this._lastPointerType = 'mouse';
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, 'pointerdown', (e) => {
            const pointerType = e.pointerType;
            if (pointerType === 'mouse') {
                this._lastPointerType = 'mouse';
                return;
            }
            else if (pointerType === 'touch') {
                this._lastPointerType = 'touch';
            }
            else {
                this._lastPointerType = 'pen';
            }
        }));
        // PonterEvents
        const pointerEvents = new EditorPointerEventFactory(this.viewHelper.viewDomNode);
        this._register(pointerEvents.onPointerMove(this.viewHelper.viewDomNode, (e) => this._onMouseMove(e)));
        this._register(pointerEvents.onPointerUp(this.viewHelper.viewDomNode, (e) => this._onMouseUp(e)));
        this._register(pointerEvents.onPointerLeave(this.viewHelper.viewDomNode, (e) => this._onMouseLeave(e)));
        this._register(pointerEvents.onPointerDown(this.viewHelper.viewDomNode, (e, pointerId) => this._onMouseDown(e, pointerId)));
    }
    onTap(event) {
        if (!event.initialTarget ||
            !this.viewHelper.linesContentDomNode.contains(event.initialTarget)) {
            return;
        }
        event.preventDefault();
        this.viewHelper.focusTextArea();
        this._dispatchGesture(event, /*inSelectionMode*/ false);
    }
    onChange(event) {
        if (this._lastPointerType === 'touch') {
            this._context.viewModel.viewLayout.deltaScrollNow(-event.translationX, -event.translationY);
        }
        if (this._lastPointerType === 'pen') {
            this._dispatchGesture(event, /*inSelectionMode*/ true);
        }
    }
    _dispatchGesture(event, inSelectionMode) {
        const target = this._createMouseTarget(new EditorMouseEvent(event, false, this.viewHelper.viewDomNode), false);
        if (target.position) {
            this.viewController.dispatchMouse({
                position: target.position,
                mouseColumn: target.position.column,
                startedOnLineNumbers: false,
                revealType: 1 /* NavigationCommandRevealType.Minimal */,
                mouseDownCount: event.tapCount,
                inSelectionMode,
                altKey: false,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                leftButton: false,
                middleButton: false,
                onInjectedText: target.type === 6 /* MouseTargetType.CONTENT_TEXT */ && target.detail.injectedText !== null,
            });
        }
    }
    _onMouseDown(e, pointerId) {
        if (e.browserEvent.pointerType === 'touch') {
            return;
        }
        super._onMouseDown(e, pointerId);
    }
}
class TouchHandler extends MouseHandler {
    constructor(context, viewController, viewHelper) {
        super(context, viewController, viewHelper);
        this._register(Gesture.addTarget(this.viewHelper.linesContentDomNode));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Tap, (e) => this.onTap(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Change, (e) => this.onChange(e)));
        this._register(dom.addDisposableListener(this.viewHelper.linesContentDomNode, EventType.Contextmenu, (e) => this._onContextMenu(new EditorMouseEvent(e, false, this.viewHelper.viewDomNode), false)));
    }
    onTap(event) {
        event.preventDefault();
        this.viewHelper.focusTextArea();
        const target = this._createMouseTarget(new EditorMouseEvent(event, false, this.viewHelper.viewDomNode), false);
        if (target.position) {
            // Send the tap event also to the <textarea> (for input purposes)
            const event = document.createEvent('CustomEvent');
            event.initEvent(TextAreaSyntethicEvents.Tap, false, true);
            this.viewHelper.dispatchTextAreaEvent(event);
            this.viewController.moveTo(target.position, 1 /* NavigationCommandRevealType.Minimal */);
        }
    }
    onChange(e) {
        this._context.viewModel.viewLayout.deltaScrollNow(-e.translationX, -e.translationY);
    }
}
export class PointerHandler extends Disposable {
    constructor(context, viewController, viewHelper) {
        super();
        const isPhone = platform.isIOS || (platform.isAndroid && platform.isMobile);
        if (isPhone && BrowserFeatures.pointerEvents) {
            this.handler = this._register(new PointerEventHandler(context, viewController, viewHelper));
        }
        else if (mainWindow.TouchEvent) {
            this.handler = this._register(new TouchHandler(context, viewController, viewHelper));
        }
        else {
            this.handler = this._register(new MouseHandler(context, viewController, viewHelper));
        }
    }
    getTargetAtClientPoint(clientX, clientY) {
        return this.handler.getTargetAtClientPoint(clientX, clientY);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9pbnRlckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbnRyb2xsZXIvcG9pbnRlckhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQWdCLE1BQU0sZ0NBQWdDLENBQUE7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBeUIsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFHdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHN0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFNUY7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsWUFBWTtJQUVwRCxZQUNDLE9BQW9CLEVBQ3BCLGNBQThCLEVBQzlCLFVBQWlDO1FBRWpDLEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBRTFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFD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