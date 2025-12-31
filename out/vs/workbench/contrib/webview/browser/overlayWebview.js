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
import { getWindowById } from '../../../../base/browser/dom.js';
import { FastDomNode } from '../../../../base/browser/fastDomNode.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IWebviewService, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED, KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE, } from './webview.js';
/**
 * Webview that is absolutely positioned over another element and that can creates and destroys an underlying webview as needed.
 */
let OverlayWebview = class OverlayWebview extends Disposable {
    get window() {
        return getWindowById(this._windowId, true).window;
    }
    constructor(initInfo, _layoutService, _webviewService, _baseContextKeyService) {
        super();
        this._layoutService = _layoutService;
        this._webviewService = _webviewService;
        this._baseContextKeyService = _baseContextKeyService;
        this._isFirstLoad = true;
        this._firstLoadPendingMessages = new Set();
        this._webview = this._register(new MutableDisposable());
        this._webviewEvents = this._register(new DisposableStore());
        this._html = '';
        this._initialScrollProgress = 0;
        this._state = undefined;
        this._owner = undefined;
        this._windowId = undefined;
        this._scopedContextKeyService = this._register(new MutableDisposable());
        this._shouldShowFindWidgetOnRestore = false;
        this._isDisposed = false;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidClickLink = this._register(new Emitter());
        this.onDidClickLink = this._onDidClickLink.event;
        this._onDidReload = this._register(new Emitter());
        this.onDidReload = this._onDidReload.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidUpdateState = this._register(new Emitter());
        this.onDidUpdateState = this._onDidUpdateState.event;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onMissingCsp = this._register(new Emitter());
        this.onMissingCsp = this._onMissingCsp.event;
        this._onDidWheel = this._register(new Emitter());
        this.onDidWheel = this._onDidWheel.event;
        this._onFatalError = this._register(new Emitter());
        this.onFatalError = this._onFatalError.event;
        this.providedViewType = initInfo.providedViewType;
        this.origin = initInfo.origin ?? generateUuid();
        this._title = initInfo.title;
        this._extension = initInfo.extension;
        this._options = initInfo.options;
        this._contentOptions = initInfo.contentOptions;
    }
    get isFocused() {
        return !!this._webview.value?.isFocused;
    }
    dispose() {
        this._isDisposed = true;
        this._container?.domNode.remove();
        this._container = undefined;
        for (const msg of this._firstLoadPendingMessages) {
            msg.resolve(false);
        }
        this._firstLoadPendingMessages.clear();
        this._onDidDispose.fire();
        super.dispose();
    }
    get container() {
        if (this._isDisposed) {
            throw new Error(`OverlayWebview has been disposed`);
        }
        if (!this._container) {
            const node = document.createElement('div');
            node.style.position = 'absolute';
            node.style.overflow = 'hidden';
            this._container = new FastDomNode(node);
            this._container.setVisibility('hidden');
            // Webviews cannot be reparented in the dom as it will destroy their contents.
            // Mount them to a high level node to avoid this.
            this._layoutService.getContainer(this.window).appendChild(node);
        }
        return this._container.domNode;
    }
    claim(owner, targetWindow, scopedContextKeyService) {
        if (this._isDisposed) {
            return;
        }
        const oldOwner = this._owner;
        if (this._windowId !== targetWindow.vscodeWindowId) {
            // moving to a new window
            this.release(oldOwner);
            // since we are moving to a new window, we need to dispose the webview and recreate
            this._webview.clear();
            this._webviewEvents.clear();
            this._container?.domNode.remove();
            this._container = undefined;
        }
        this._owner = owner;
        this._windowId = targetWindow.vscodeWindowId;
        this._show(targetWindow);
        if (oldOwner !== owner) {
            const contextKeyService = scopedContextKeyService || this._baseContextKeyService;
            // Explicitly clear before creating the new context.
            // Otherwise we create the new context while the old one is still around
            this._scopedContextKeyService.clear();
            this._scopedContextKeyService.value = contextKeyService.createScoped(this.container);
            const wasFindVisible = this._findWidgetVisible?.get();
            this._findWidgetVisible?.reset();
            this._findWidgetVisible =
                KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_VISIBLE.bindTo(contextKeyService);
            this._findWidgetVisible.set(!!wasFindVisible);
            this._findWidgetEnabled?.reset();
            this._findWidgetEnabled =
                KEYBINDING_CONTEXT_WEBVIEW_FIND_WIDGET_ENABLED.bindTo(contextKeyService);
            this._findWidgetEnabled.set(!!this.options.enableFindWidget);
            this._webview.value?.setContextKeyService(this._scopedContextKeyService.value);
        }
    }
    release(owner) {
        if (this._owner !== owner) {
            return;
        }
        this._scopedContextKeyService.clear();
        this._owner = undefined;
        if (this._container) {
            this._container.setVisibility('hidden');
        }
        if (this._options.retainContextWhenHidden) {
            // https://github.com/microsoft/vscode/issues/157424
            // We need to record the current state when retaining context so we can try to showFind() when showing webview again
            this._shouldShowFindWidgetOnRestore = !!this._findWidgetVisible?.get();
            this.hideFind(false);
        }
        else {
            this._webview.clear();
            this._webviewEvents.clear();
        }
    }
    layoutWebviewOverElement(element, dimension, clippingContainer) {
        if (!this._container || !this._container.domNode.parentElement) {
            return;
        }
        const whenContainerStylesLoaded = this._layoutService.whenContainerStylesLoaded(this.window);
        if (whenContainerStylesLoaded) {
            // In floating windows, we need to ensure that the
            // container is ready for us to compute certain
            // layout related properties.
            whenContainerStylesLoaded.then(() => this.doLayoutWebviewOverElement(element, dimension, clippingContainer));
        }
        else {
            this.doLayoutWebviewOverElement(element, dimension, clippingContainer);
        }
    }
    doLayoutWebviewOverElement(element, dimension, clippingContainer) {
        if (!this._container || !this._container.domNode.parentElement) {
            return;
        }
        const frameRect = element.getBoundingClientRect();
        const containerRect = this._container.domNode.parentElement.getBoundingClientRect();
        const parentBorderTop = (containerRect.height - this._container.domNode.parentElement.clientHeight) / 2.0;
        const parentBorderLeft = (containerRect.width - this._container.domNode.parentElement.clientWidth) / 2.0;
        this._container.setTop(frameRect.top - containerRect.top - parentBorderTop);
        this._container.setLeft(frameRect.left - containerRect.left - parentBorderLeft);
        this._container.setWidth(dimension ? dimension.width : frameRect.width);
        this._container.setHeight(dimension ? dimension.height : frameRect.height);
        if (clippingContainer) {
            const { top, left, right, bottom } = computeClippingRect(frameRect, clippingContainer);
            this._container.domNode.style.clipPath = `polygon(${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px)`;
        }
    }
    _show(targetWindow) {
        if (this._isDisposed) {
            throw new Error('OverlayWebview is disposed');
        }
        if (!this._webview.value) {
            const webview = this._webviewService.createWebviewElement({
                providedViewType: this.providedViewType,
                origin: this.origin,
                title: this._title,
                options: this._options,
                contentOptions: this._contentOptions,
                extension: this.extension,
            });
            this._webview.value = webview;
            webview.state = this._state;
            if (this._scopedContextKeyService.value) {
                this._webview.value.setContextKeyService(this._scopedContextKeyService.value);
            }
            if (this._html) {
                webview.setHtml(this._html);
            }
            if (this._options.tryRestoreScrollPosition) {
                webview.initialScrollProgress = this._initialScrollProgress;
            }
            this._findWidgetEnabled?.set(!!this.options.enableFindWidget);
            webview.mountTo(this.container, targetWindow);
            // Forward events from inner webview to outer listeners
            this._webviewEvents.clear();
            this._webviewEvents.add(webview.onDidFocus(() => {
                this._onDidFocus.fire();
            }));
            this._webviewEvents.add(webview.onDidBlur(() => {
                this._onDidBlur.fire();
            }));
            this._webviewEvents.add(webview.onDidClickLink((x) => {
                this._onDidClickLink.fire(x);
            }));
            this._webviewEvents.add(webview.onMessage((x) => {
                this._onMessage.fire(x);
            }));
            this._webviewEvents.add(webview.onMissingCsp((x) => {
                this._onMissingCsp.fire(x);
            }));
            this._webviewEvents.add(webview.onDidWheel((x) => {
                this._onDidWheel.fire(x);
            }));
            this._webviewEvents.add(webview.onDidReload(() => {
                this._onDidReload.fire();
            }));
            this._webviewEvents.add(webview.onFatalError((x) => {
                this._onFatalError.fire(x);
            }));
            this._webviewEvents.add(webview.onDidScroll((x) => {
                this._initialScrollProgress = x.scrollYPercentage;
                this._onDidScroll.fire(x);
            }));
            this._webviewEvents.add(webview.onDidUpdateState((state) => {
                this._state = state;
                this._onDidUpdateState.fire(state);
            }));
            if (this._isFirstLoad) {
                this._firstLoadPendingMessages.forEach(async (msg) => {
                    msg.resolve(await webview.postMessage(msg.message, msg.transfer));
                });
            }
            this._isFirstLoad = false;
            this._firstLoadPendingMessages.clear();
        }
        // https://github.com/microsoft/vscode/issues/157424
        if (this.options.retainContextWhenHidden && this._shouldShowFindWidgetOnRestore) {
            this.showFind(false);
            // Reset
            this._shouldShowFindWidgetOnRestore = false;
        }
        this._container?.setVisibility('visible');
    }
    setHtml(html) {
        this._html = html;
        this._withWebview((webview) => webview.setHtml(html));
    }
    setTitle(title) {
        this._title = title;
        this._withWebview((webview) => webview.setTitle(title));
    }
    get initialScrollProgress() {
        return this._initialScrollProgress;
    }
    set initialScrollProgress(value) {
        this._initialScrollProgress = value;
        this._withWebview((webview) => (webview.initialScrollProgress = value));
    }
    get state() {
        return this._state;
    }
    set state(value) {
        this._state = value;
        this._withWebview((webview) => (webview.state = value));
    }
    get extension() {
        return this._extension;
    }
    set extension(value) {
        this._extension = value;
        this._withWebview((webview) => (webview.extension = value));
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = { customClasses: this._options.customClasses, ...value };
    }
    get contentOptions() {
        return this._contentOptions;
    }
    set contentOptions(value) {
        this._contentOptions = value;
        this._withWebview((webview) => (webview.contentOptions = value));
    }
    set localResourcesRoot(resources) {
        this._withWebview((webview) => (webview.localResourcesRoot = resources));
    }
    async postMessage(message, transfer) {
        if (this._webview.value) {
            return this._webview.value.postMessage(message, transfer);
        }
        if (this._isFirstLoad) {
            let resolve;
            const p = new Promise((r) => (resolve = r));
            this._firstLoadPendingMessages.add({ message, transfer, resolve: resolve });
            return p;
        }
        return false;
    }
    focus() {
        this._webview.value?.focus();
    }
    reload() {
        this._webview.value?.reload();
    }
    selectAll() {
        this._webview.value?.selectAll();
    }
    copy() {
        this._webview.value?.copy();
    }
    paste() {
        this._webview.value?.paste();
    }
    cut() {
        this._webview.value?.cut();
    }
    undo() {
        this._webview.value?.undo();
    }
    redo() {
        this._webview.value?.redo();
    }
    showFind(animated = true) {
        if (this._webview.value) {
            this._webview.value.showFind(animated);
            this._findWidgetVisible?.set(true);
        }
    }
    hideFind(animated = true) {
        this._findWidgetVisible?.reset();
        this._webview.value?.hideFind(animated);
    }
    runFindAction(previous) {
        this._webview.value?.runFindAction(previous);
    }
    _withWebview(f) {
        if (this._webview.value) {
            f(this._webview.value);
        }
    }
    windowDidDragStart() {
        this._webview.value?.windowDidDragStart();
    }
    windowDidDragEnd() {
        this._webview.value?.windowDidDragEnd();
    }
    setContextKeyService(contextKeyService) {
        this._webview.value?.setContextKeyService(contextKeyService);
    }
};
OverlayWebview = __decorate([
    __param(1, IWorkbenchLayoutService),
    __param(2, IWebviewService),
    __param(3, IContextKeyService)
], OverlayWebview);
export { OverlayWebview };
function computeClippingRect(frameRect, clipper) {
    const rootRect = clipper.getBoundingClientRect();
    const top = Math.max(rootRect.top - frameRect.top, 0);
    const right = Math.max(frameRect.width - (frameRect.right - rootRect.right), 0);
    const bottom = Math.max(frameRect.height - (frameRect.bottom - rootRect.bottom), 0);
    const left = Math.max(rootRect.left - frameRect.left, 0);
    return { top, right, bottom, left };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheVdlYnZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvb3ZlcmxheVdlYnZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFhLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFFTixrQkFBa0IsR0FFbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBSU4sZUFBZSxFQUNmLDhDQUE4QyxFQUM5Qyw4Q0FBOEMsR0FNOUMsTUFBTSxjQUFjLENBQUE7QUFFckI7O0dBRUc7QUFDSSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQXNCN0MsSUFBWSxNQUFNO1FBQ2pCLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFBO0lBQ2xELENBQUM7SUFlRCxZQUNDLFFBQXlCLEVBQ0EsY0FBd0QsRUFDaEUsZUFBaUQsRUFDOUMsc0JBQTJEO1FBRS9FLEtBQUssRUFBRSxDQUFBO1FBSm1DLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUMvQyxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDN0IsMkJBQXNC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QUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDckQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDL0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkYsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFBO0FBQ3BDLENBQUMifQ==