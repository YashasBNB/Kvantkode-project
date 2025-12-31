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
var MessageController_1;
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Event } from '../../../../base/common/event.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import './messageController.css';
import { EditorCommand, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { Range } from '../../../common/core/range.js';
import { openLinkFromMarkdown } from '../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import * as dom from '../../../../base/browser/dom.js';
let MessageController = class MessageController {
    static { MessageController_1 = this; }
    static { this.ID = 'editor.contrib.messageController'; }
    static { this.MESSAGE_VISIBLE = new RawContextKey('messageVisible', false, nls.localize('messageVisible', 'Whether the editor is currently showing an inline message')); }
    static get(editor) {
        return editor.getContribution(MessageController_1.ID);
    }
    constructor(editor, contextKeyService, _openerService) {
        this._openerService = _openerService;
        this._messageWidget = new MutableDisposable();
        this._messageListeners = new DisposableStore();
        this._mouseOverMessage = false;
        this._editor = editor;
        this._visible = MessageController_1.MESSAGE_VISIBLE.bindTo(contextKeyService);
    }
    dispose() {
        this._message?.dispose();
        this._messageListeners.dispose();
        this._messageWidget.dispose();
        this._visible.reset();
    }
    isVisible() {
        return this._visible.get();
    }
    showMessage(message, position) {
        alert(isMarkdownString(message) ? message.value : message);
        this._visible.set(true);
        this._messageWidget.clear();
        this._messageListeners.clear();
        this._message = isMarkdownString(message)
            ? renderMarkdown(message, {
                actionHandler: {
                    callback: (url) => {
                        this.closeMessage();
                        openLinkFromMarkdown(this._openerService, url, isMarkdownString(message) ? message.isTrusted : undefined);
                    },
                    disposables: this._messageListeners,
                },
            })
            : undefined;
        this._messageWidget.value = new MessageWidget(this._editor, position, typeof message === 'string' ? message : this._message.element);
        // close on blur (debounced to allow to tab into the message), cursor, model change, dispose
        this._messageListeners.add(Event.debounce(this._editor.onDidBlurEditorText, (last, event) => event, 0)(() => {
            if (this._mouseOverMessage) {
                return; // override when mouse over message
            }
            if (this._messageWidget.value &&
                dom.isAncestor(dom.getActiveElement(), this._messageWidget.value.getDomNode())) {
                return; // override when focus is inside the message
            }
            this.closeMessage();
        }));
        this._messageListeners.add(this._editor.onDidChangeCursorPosition(() => this.closeMessage()));
        this._messageListeners.add(this._editor.onDidDispose(() => this.closeMessage()));
        this._messageListeners.add(this._editor.onDidChangeModel(() => this.closeMessage()));
        this._messageListeners.add(dom.addDisposableListener(this._messageWidget.value.getDomNode(), dom.EventType.MOUSE_ENTER, () => (this._mouseOverMessage = true), true));
        this._messageListeners.add(dom.addDisposableListener(this._messageWidget.value.getDomNode(), dom.EventType.MOUSE_LEAVE, () => (this._mouseOverMessage = false), true));
        // close on mouse move
        let bounds;
        this._messageListeners.add(this._editor.onMouseMove((e) => {
            // outside the text area
            if (!e.target.position) {
                return;
            }
            if (!bounds) {
                // define bounding box around position and first mouse occurance
                bounds = new Range(position.lineNumber - 3, 1, e.target.position.lineNumber + 3, 1);
            }
            else if (!bounds.containsPosition(e.target.position)) {
                // check if position is still in bounds
                this.closeMessage();
            }
        }));
    }
    closeMessage() {
        this._visible.reset();
        this._messageListeners.clear();
        if (this._messageWidget.value) {
            this._messageListeners.add(MessageWidget.fadeOut(this._messageWidget.value));
        }
    }
};
MessageController = MessageController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IOpenerService)
], MessageController);
export { MessageController };
const MessageCommand = EditorCommand.bindToContribution(MessageController.get);
registerEditorCommand(new MessageCommand({
    id: 'leaveEditorMessage',
    precondition: MessageController.MESSAGE_VISIBLE,
    handler: (c) => c.closeMessage(),
    kbOpts: {
        weight: 100 /* KeybindingWeight.EditorContrib */ + 30,
        primary: 9 /* KeyCode.Escape */,
    },
}));
class MessageWidget {
    static fadeOut(messageWidget) {
        const dispose = () => {
            messageWidget.dispose();
            clearTimeout(handle);
            messageWidget.getDomNode().removeEventListener('animationend', dispose);
        };
        const handle = setTimeout(dispose, 110);
        messageWidget.getDomNode().addEventListener('animationend', dispose);
        messageWidget.getDomNode().classList.add('fadeOut');
        return { dispose };
    }
    constructor(editor, { lineNumber, column }, text) {
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this._editor = editor;
        this._editor.revealLinesInCenterIfOutsideViewport(lineNumber, lineNumber, 0 /* ScrollType.Smooth */);
        this._position = { lineNumber, column };
        this._domNode = document.createElement('div');
        this._domNode.classList.add('monaco-editor-overlaymessage');
        this._domNode.style.marginLeft = '-6px';
        const anchorTop = document.createElement('div');
        anchorTop.classList.add('anchor', 'top');
        this._domNode.appendChild(anchorTop);
        const message = document.createElement('div');
        if (typeof text === 'string') {
            message.classList.add('message');
            message.textContent = text;
        }
        else {
            text.classList.add('message');
            message.appendChild(text);
        }
        this._domNode.appendChild(message);
        const anchorBottom = document.createElement('div');
        anchorBottom.classList.add('anchor', 'below');
        this._domNode.appendChild(anchorBottom);
        this._editor.addContentWidget(this);
        this._domNode.classList.add('fadeIn');
    }
    dispose() {
        this._editor.removeContentWidget(this);
    }
    getId() {
        return 'messageoverlay';
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            position: this._position,
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */],
            positionAffinity: 1 /* PositionAffinity.Right */,
        };
    }
    afterRender(position) {
        this._domNode.classList.toggle('below', position === 2 /* ContentWidgetPositionPreference.BELOW */);
    }
}
registerEditorContribution(MessageController.ID, MessageController, 4 /* EditorContributionInstantiation.Lazy */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVzc2FnZUNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9tZXNzYWdlL2Jyb3dzZXIvbWVzc2FnZUNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBbUIsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUxRixPQUFPLEVBQ04sZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8seUJBQXlCLENBQUE7QUFPaEMsT0FBTyxFQUNOLGFBQWEsRUFFYixxQkFBcUIsRUFDckIsMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR3JELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQzNHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUUvQyxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFpQjs7YUFDTixPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXFDO2FBRTlDLG9CQUFlLEdBQUcsSUFBSSxh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