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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9pbnRlckhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL3BvaW50ZXJIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFnQixNQUFNLGdDQUFnQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEVBQXlCLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBR3ZFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRzdFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRTVGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLFlBQVk7SUFFcEQsWUFDQyxPQUFvQixFQUNwQixjQUE4QixFQUM5QixVQUFpQztRQUVqQyxLQUFLLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUUxQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxtQkFB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