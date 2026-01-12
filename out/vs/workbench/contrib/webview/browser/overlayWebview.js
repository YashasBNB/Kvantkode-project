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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcmxheVdlYnZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci9vdmVybGF5V2Vidmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQWEsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUVOLGtCQUFrQixHQUVsQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzNGLE9BQU8sRUFJTixlQUFlLEVBQ2YsOENBQThDLEVBQzlDLDhDQUE4QyxHQU05QyxNQUFNLGNBQWMsQ0FBQTtBQUVyQjs7R0FFRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxVQUFVO0lBc0I3QyxJQUFZLE1BQU07UUFDakIsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDbEQsQ0FBQztJQWVELFlBQ0MsUUFBeUIsRUFDQSxjQUF3RCxFQUNoRSxlQUFpRCxFQUM5QyxzQkFBMkQ7UUFFL0UsS0FBSyxFQUFFLENBQUE7UUFKbUMsbUJBQWMsR0FBZCxjQUFjLENBQXlCO1FBQy9DLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUM3Qiwy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QUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvRSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNuRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUV4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUE7QUFDcEMsQ0FBQyJ9