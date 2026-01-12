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
var WebviewEditor_1;
import * as DOM from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { WebviewWindowDragMonitor } from '../../webview/browser/webviewWindowDragMonitor.js';
import { WebviewInput } from './webviewEditorInput.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
/**
 * Tracks the id of the actively focused webview.
 */
export const CONTEXT_ACTIVE_WEBVIEW_PANEL_ID = new RawContextKey('activeWebviewPanelId', '', {
    type: 'string',
    description: nls.localize('context.activeWebviewId', 'The viewType of the currently active webview panel.'),
});
let WebviewEditor = class WebviewEditor extends EditorPane {
    static { WebviewEditor_1 = this; }
    static { this.ID = 'WebviewEditor'; }
    get onDidFocus() {
        return this._onDidFocusWebview.event;
    }
    constructor(group, telemetryService, themeService, storageService, _editorGroupsService, _editorService, _workbenchLayoutService, _hostService, _contextKeyService) {
        super(WebviewEditor_1.ID, group, telemetryService, themeService, storageService);
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._workbenchLayoutService = _workbenchLayoutService;
        this._hostService = _hostService;
        this._contextKeyService = _contextKeyService;
        this._visible = false;
        this._isDisposed = false;
        this._webviewVisibleDisposables = this._register(new DisposableStore());
        this._onFocusWindowHandler = this._register(new MutableDisposable());
        this._onDidFocusWebview = this._register(new Emitter());
        this._scopedContextKeyService = this._register(new MutableDisposable());
        const part = _editorGroupsService.getPart(group);
        this._register(Event.any(part.onDidScroll, part.onDidAddGroup, part.onDidRemoveGroup, part.onDidMoveGroup)(() => {
            if (this.webview && this._visible) {
                this.synchronizeWebviewContainerDimensions(this.webview);
            }
        }));
    }
    get webview() {
        return this.input instanceof WebviewInput ? this.input.webview : undefined;
    }
    get scopedContextKeyService() {
        return this._scopedContextKeyService.value;
    }
    createEditor(parent) {
        const element = document.createElement('div');
        this._element = element;
        this._element.id = `webview-editor-element-${generateUuid()}`;
        parent.appendChild(element);
        this._scopedContextKeyService.value = this._register(this._contextKeyService.createScoped(element));
    }
    dispose() {
        this._isDisposed = true;
        this._element?.remove();
        this._element = undefined;
        super.dispose();
    }
    layout(dimension) {
        this._dimension = dimension;
        if (this.webview && this._visible) {
            this.synchronizeWebviewContainerDimensions(this.webview, dimension);
        }
    }
    focus() {
        super.focus();
        if (!this._onFocusWindowHandler.value && !isWeb) {
            // Make sure we restore focus when switching back to a VS Code window
            this._onFocusWindowHandler.value = this._hostService.onDidChangeFocus((focused) => {
                if (focused &&
                    this._editorService.activeEditorPane === this &&
                    this._workbenchLayoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */)) {
                    this.focus();
                }
            });
        }
        this.webview?.focus();
    }
    setEditorVisible(visible) {
        this._visible = visible;
        if (this.input instanceof WebviewInput && this.webview) {
            if (visible) {
                this.claimWebview(this.input);
            }
            else {
                this.webview.release(this);
            }
        }
        super.setEditorVisible(visible);
    }
    clearInput() {
        if (this.webview) {
            this.webview.release(this);
            this._webviewVisibleDisposables.clear();
        }
        super.clearInput();
    }
    async setInput(input, options, context, token) {
        if (this.input && input.matches(this.input)) {
            return;
        }
        const alreadyOwnsWebview = input instanceof WebviewInput && input.webview === this.webview;
        if (this.webview && !alreadyOwnsWebview) {
            this.webview.release(this);
        }
        await super.setInput(input, options, context, token);
        await input.resolve();
        if (token.isCancellationRequested || this._isDisposed) {
            return;
        }
        if (input instanceof WebviewInput) {
            input.updateGroup(this.group.id);
            if (!alreadyOwnsWebview) {
                this.claimWebview(input);
            }
            if (this._dimension) {
                this.layout(this._dimension);
            }
        }
    }
    claimWebview(input) {
        input.claim(this, this.window, this.scopedContextKeyService);
        if (this._element) {
            this._element.setAttribute('aria-flowto', input.webview.container.id);
            DOM.setParentFlowTo(input.webview.container, this._element);
        }
        this._webviewVisibleDisposables.clear();
        // Webviews are not part of the normal editor dom, so we have to register our own drag and drop handler on them.
        this._webviewVisibleDisposables.add(this._editorGroupsService.createEditorDropTarget(input.webview.container, {
            containsGroup: (group) => this.group.id === group.id,
        }));
        this._webviewVisibleDisposables.add(new WebviewWindowDragMonitor(this.window, () => this.webview));
        this.synchronizeWebviewContainerDimensions(input.webview);
        this._webviewVisibleDisposables.add(this.trackFocus(input.webview));
    }
    synchronizeWebviewContainerDimensions(webview, dimension) {
        if (!this._element?.isConnected) {
            return;
        }
        const rootContainer = this._workbenchLayoutService.getContainer(this.window, "workbench.parts.editor" /* Parts.EDITOR_PART */);
        webview.layoutWebviewOverElement(this._element.parentElement, dimension, rootContainer);
    }
    trackFocus(webview) {
        const store = new DisposableStore();
        // Track focus in webview content
        const webviewContentFocusTracker = DOM.trackFocus(webview.container);
        store.add(webviewContentFocusTracker);
        store.add(webviewContentFocusTracker.onDidFocus(() => this._onDidFocusWebview.fire()));
        // Track focus in webview element
        store.add(webview.onDidFocus(() => this._onDidFocusWebview.fire()));
        return store;
    }
};
WebviewEditor = WebviewEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IStorageService),
    __param(4, IEditorGroupsService),
    __param(5, IEditorService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IHostService),
    __param(8, IContextKeyService)
], WebviewEditor);
export { WebviewEditor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1BhbmVsL2Jyb3dzZXIvd2Vidmlld0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixlQUFlLEVBRWYsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsYUFBYSxHQUNiLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFJeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3RELE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENB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