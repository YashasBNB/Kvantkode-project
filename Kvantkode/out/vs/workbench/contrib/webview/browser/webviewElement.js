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
import { isFirefox } from '../../../../base/browser/browser.js';
import { addDisposableListener, EventType, getWindowById } from '../../../../base/browser/dom.js';
import { parentOriginHash } from '../../../../base/browser/iframe.js';
import { promiseWithResolvers, ThrottledDelayer } from '../../../../base/common/async.js';
import { streamToBuffer } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { COI } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { ITunnelService } from '../../../../platform/tunnel/common/tunnel.js';
import { WebviewPortMappingManager } from '../../../../platform/webview/common/webviewPortMapping.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { decodeAuthority, webviewGenericCspSource, webviewRootResourceAuthority, } from '../common/webview.js';
import { loadLocalResource, WebviewResourceResponse } from './resourceLoading.js';
import { areWebviewContentOptionsEqual, } from './webview.js';
import { WebviewFindWidget } from './webviewFindWidget.js';
var WebviewState;
(function (WebviewState) {
    let Type;
    (function (Type) {
        Type[Type["Initializing"] = 0] = "Initializing";
        Type[Type["Ready"] = 1] = "Ready";
    })(Type = WebviewState.Type || (WebviewState.Type = {}));
    class Initializing {
        constructor(pendingMessages) {
            this.pendingMessages = pendingMessages;
            this.type = 0 /* Type.Initializing */;
        }
    }
    WebviewState.Initializing = Initializing;
    WebviewState.Ready = { type: 1 /* Type.Ready */ };
})(WebviewState || (WebviewState = {}));
const webviewIdContext = 'webviewId';
let WebviewElement = class WebviewElement extends Disposable {
    get window() {
        return typeof this._windowId === 'number' ? getWindowById(this._windowId)?.window : undefined;
    }
    get platform() {
        return 'browser';
    }
    get element() {
        return this._element;
    }
    get isFocused() {
        if (!this._focused) {
            return false;
        }
        // code window is only available after the webview is mounted.
        if (!this.window) {
            return false;
        }
        if (this.window.document.activeElement && this.window.document.activeElement !== this.element) {
            // looks like https://github.com/microsoft/vscode/issues/132641
            // where the focus is actually not in the `<iframe>`
            return false;
        }
        return true;
    }
    constructor(initInfo, webviewThemeDataProvider, configurationService, contextMenuService, notificationService, _environmentService, _fileService, _logService, _remoteAuthorityResolverService, _tunnelService, instantiationService, _accessibilityService) {
        super();
        this.webviewThemeDataProvider = webviewThemeDataProvider;
        this._environmentService = _environmentService;
        this._fileService = _fileService;
        this._logService = _logService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._tunnelService = _tunnelService;
        this._accessibilityService = _accessibilityService;
        this.id = generateUuid();
        this._windowId = undefined;
        this._expectedServiceWorkerVersion = 4; // Keep this in sync with the version in service-worker.js
        this._state = new WebviewState.Initializing([]);
        this._resourceLoadingCts = this._register(new CancellationTokenSource());
        this._focusDelayer = this._register(new ThrottledDelayer(50));
        this._onDidHtmlChange = this._register(new Emitter());
        this.onDidHtmlChange = this._onDidHtmlChange.event;
        this._messageHandlers = new Map();
        this.checkImeCompletionState = true;
        this._disposed = false;
        this._onMissingCsp = this._register(new Emitter());
        this.onMissingCsp = this._onMissingCsp.event;
        this._onDidClickLink = this._register(new Emitter());
        this.onDidClickLink = this._onDidClickLink.event;
        this._onDidReload = this._register(new Emitter());
        this.onDidReload = this._onDidReload.event;
        this._onMessage = this._register(new Emitter());
        this.onMessage = this._onMessage.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidWheel = this._register(new Emitter());
        this.onDidWheel = this._onDidWheel.event;
        this._onDidUpdateState = this._register(new Emitter());
        this.onDidUpdateState = this._onDidUpdateState.event;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onFatalError = this._register(new Emitter());
        this.onFatalError = this._onFatalError.event;
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._hasAlertedAboutMissingCsp = false;
        this._hasFindResult = this._register(new Emitter());
        this.hasFindResult = this._hasFindResult.event;
        this._onDidStopFind = this._register(new Emitter());
        this.onDidStopFind = this._onDidStopFind.event;
        this.providedViewType = initInfo.providedViewType;
        this.origin = initInfo.origin ?? this.id;
        this._options = initInfo.options;
        this.extension = initInfo.extension;
        this._content = {
            html: '',
            title: initInfo.title,
            options: initInfo.contentOptions,
            state: undefined,
        };
        this._portMappingManager = this._register(new WebviewPortMappingManager(() => this.extension?.location, () => this._content.options.portMapping || [], this._tunnelService));
        this._element = this._createElement(initInfo.options, initInfo.contentOptions);
        this._register(this.on('no-csp-found', () => {
            this.handleNoCspFound();
        }));
        this._register(this.on('did-click-link', ({ uri }) => {
            this._onDidClickLink.fire(uri);
        }));
        this._register(this.on('onmessage', ({ message, transfer }) => {
            this._onMessage.fire({ message, transfer });
        }));
        this._register(this.on('did-scroll', ({ scrollYPercentage }) => {
            this._onDidScroll.fire({ scrollYPercentage });
        }));
        this._register(this.on('do-reload', () => {
            this.reload();
        }));
        this._register(this.on('do-update-state', (state) => {
            this.state = state;
            this._onDidUpdateState.fire(state);
        }));
        this._register(this.on('did-focus', () => {
            this.handleFocusChange(true);
        }));
        this._register(this.on('did-blur', () => {
            this.handleFocusChange(false);
        }));
        this._register(this.on('did-scroll-wheel', (event) => {
            this._onDidWheel.fire(event);
        }));
        this._register(this.on('did-find', ({ didFind }) => {
            this._hasFindResult.fire(didFind);
        }));
        this._register(this.on('fatal-error', (e) => {
            notificationService.error(localize('fatalErrorMessage', 'Error loading webview: {0}', e.message));
            this._onFatalError.fire({ message: e.message });
        }));
        this._register(this.on('did-keydown', (data) => {
            // Electron: workaround for https://github.com/electron/electron/issues/14258
            // We have to detect keyboard events in the <webview> and dispatch them to our
            // keybinding service because these events do not bubble to the parent window anymore.
            this.handleKeyEvent('keydown', data);
        }));
        this._register(this.on('did-keyup', (data) => {
            this.handleKeyEvent('keyup', data);
        }));
        this._register(this.on('did-context-menu', (data) => {
            if (!this.element) {
                return;
            }
            if (!this._contextKeyService) {
                return;
            }
            const elementBox = this.element.getBoundingClientRect();
            const contextKeyService = this._contextKeyService.createOverlay([
                ...Object.entries(data.context),
                [webviewIdContext, this.providedViewType],
            ]);
            contextMenuService.showContextMenu({
                menuId: MenuId.WebviewContext,
                menuActionOptions: { shouldForwardArgs: true },
                contextKeyService,
                getActionsContext: () => ({
                    ...data.context,
                    webview: this.providedViewType,
                }),
                getAnchor: () => ({
                    x: elementBox.x + data.clientX,
                    y: elementBox.y + data.clientY,
                }),
            });
            this._send('set-context-menu-visible', { visible: true });
        }));
        this._register(this.on('load-resource', async (entry) => {
            try {
                // Restore the authority we previously encoded
                const authority = decodeAuthority(entry.authority);
                const uri = URI.from({
                    scheme: entry.scheme,
                    authority: authority,
                    path: decodeURIComponent(entry.path), // This gets re-encoded
                    query: entry.query ? decodeURIComponent(entry.query) : entry.query,
                });
                this.loadResource(entry.id, uri, entry.ifNoneMatch);
            }
            catch (e) {
                this._send('did-load-resource', {
                    id: entry.id,
                    status: 404,
                    path: entry.path,
                });
            }
        }));
        this._register(this.on('load-localhost', (entry) => {
            this.localLocalhost(entry.id, entry.origin);
        }));
        this._register(Event.runAndSubscribe(webviewThemeDataProvider.onThemeDataChanged, () => this.style()));
        this._register(_accessibilityService.onDidChangeReducedMotion(() => this.style()));
        this._register(_accessibilityService.onDidChangeScreenReaderOptimized(() => this.style()));
        this._register(contextMenuService.onDidHideContextMenu(() => this._send('set-context-menu-visible', { visible: false })));
        this._confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('window.confirmBeforeClose')) {
                this._confirmBeforeClose = configurationService.getValue('window.confirmBeforeClose');
                this._send('set-confirm-before-close', this._confirmBeforeClose);
            }
        }));
        this._register(this.on('drag-start', () => {
            this._startBlockingIframeDragEvents();
        }));
        this._register(this.on('drag', (event) => {
            this.handleDragEvent('drag', event);
        }));
        if (initInfo.options.enableFindWidget) {
            this._webviewFindWidget = this._register(instantiationService.createInstance(WebviewFindWidget, this));
        }
    }
    dispose() {
        this._disposed = true;
        this.element?.remove();
        this._element = undefined;
        this._messagePort = undefined;
        if (this._state.type === 0 /* WebviewState.Type.Initializing */) {
            for (const message of this._state.pendingMessages) {
                message.resolve(false);
            }
            this._state.pendingMessages = [];
        }
        this._onDidDispose.fire();
        this._resourceLoadingCts.dispose(true);
        super.dispose();
    }
    setContextKeyService(contextKeyService) {
        this._contextKeyService = contextKeyService;
    }
    postMessage(message, transfer) {
        return this._send('message', { message, transfer });
    }
    async _send(channel, data, _createElement = []) {
        if (this._state.type === 0 /* WebviewState.Type.Initializing */) {
            const { promise, resolve } = promiseWithResolvers();
            this._state.pendingMessages.push({ channel, data, transferable: _createElement, resolve });
            return promise;
        }
        else {
            return this.doPostMessage(channel, data, _createElement);
        }
    }
    _createElement(options, _contentOptions) {
        // Do not start loading the webview yet.
        // Wait the end of the ctor when all listeners have been hooked up.
        const element = document.createElement('iframe');
        element.name = this.id;
        element.className = `webview ${options.customClasses || ''}`;
        element.sandbox.add('allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-pointer-lock', 'allow-downloads');
        const allowRules = ['cross-origin-isolated', 'autoplay'];
        if (!isFirefox) {
            allowRules.push('clipboard-read', 'clipboard-write');
        }
        element.setAttribute('allow', allowRules.join('; '));
        element.style.border = 'none';
        element.style.width = '100%';
        element.style.height = '100%';
        element.focus = () => {
            this._doFocus();
        };
        return element;
    }
    _initElement(encodedWebviewOrigin, extension, options, targetWindow) {
        // The extensionId and purpose in the URL are used for filtering in js-debug:
        const params = {
            id: this.id,
            origin: this.origin,
            swVersion: String(this._expectedServiceWorkerVersion),
            extensionId: extension?.id.value ?? '',
            platform: this.platform,
            'vscode-resource-base-authority': webviewRootResourceAuthority,
            parentOrigin: targetWindow.origin,
        };
        if (this._options.disableServiceWorker) {
            params.disableServiceWorker = 'true';
        }
        if (this._environmentService.remoteAuthority) {
            params.remoteAuthority = this._environmentService.remoteAuthority;
        }
        if (options.purpose) {
            params.purpose = options.purpose;
        }
        COI.addSearchParam(params, true, true);
        const queryString = new URLSearchParams(params).toString();
        // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1754872
        const fileName = isFirefox ? 'index-no-csp.html' : 'index.html';
        this.element.setAttribute('src', `${this.webviewContentEndpoint(encodedWebviewOrigin)}/${fileName}?${queryString}`);
    }
    mountTo(element, targetWindow) {
        if (!this.element) {
            return;
        }
        this._windowId = targetWindow.vscodeWindowId;
        this._encodedWebviewOriginPromise = parentOriginHash(targetWindow.origin, this.origin).then((id) => (this._encodedWebviewOrigin = id));
        this._encodedWebviewOriginPromise.then((encodedWebviewOrigin) => {
            if (!this._disposed) {
                this._initElement(encodedWebviewOrigin, this.extension, this._options, targetWindow);
            }
        });
        this._registerMessageHandler(targetWindow);
        if (this._webviewFindWidget) {
            element.appendChild(this._webviewFindWidget.getDomNode());
        }
        for (const eventName of [EventType.MOUSE_DOWN, EventType.MOUSE_MOVE, EventType.DROP]) {
            this._register(addDisposableListener(element, eventName, () => {
                this._stopBlockingIframeDragEvents();
            }));
        }
        for (const node of [element, targetWindow]) {
            this._register(addDisposableListener(node, EventType.DRAG_END, () => {
                this._stopBlockingIframeDragEvents();
            }));
        }
        element.id = this.id; // This is used by aria-flow for accessibility order
        element.appendChild(this.element);
    }
    _registerMessageHandler(targetWindow) {
        const subscription = this._register(addDisposableListener(targetWindow, 'message', (e) => {
            if (!this._encodedWebviewOrigin || e?.data?.target !== this.id) {
                return;
            }
            if (e.origin !== this._webviewContentOrigin(this._encodedWebviewOrigin)) {
                console.log(`Skipped renderer receiving message due to mismatched origins: ${e.origin} ${this._webviewContentOrigin}`);
                return;
            }
            if (e.data.channel === 'webview-ready') {
                if (this._messagePort) {
                    return;
                }
                this._logService.debug(`Webview(${this.id}): webview ready`);
                this._messagePort = e.ports[0];
                this._messagePort.onmessage = (e) => {
                    const handlers = this._messageHandlers.get(e.data.channel);
                    if (!handlers) {
                        console.log(`No handlers found for '${e.data.channel}'`);
                        return;
                    }
                    handlers?.forEach((handler) => handler(e.data.data, e));
                };
                this.element?.classList.add('ready');
                if (this._state.type === 0 /* WebviewState.Type.Initializing */) {
                    this._state.pendingMessages.forEach(({ channel, data, resolve }) => resolve(this.doPostMessage(channel, data)));
                }
                this._state = WebviewState.Ready;
                subscription.dispose();
            }
        }));
    }
    _startBlockingIframeDragEvents() {
        if (this.element) {
            this.element.style.pointerEvents = 'none';
        }
    }
    _stopBlockingIframeDragEvents() {
        if (this.element) {
            this.element.style.pointerEvents = 'auto';
        }
    }
    webviewContentEndpoint(encodedWebviewOrigin) {
        const webviewExternalEndpoint = this._environmentService.webviewExternalEndpoint;
        if (!webviewExternalEndpoint) {
            throw new Error(`'webviewExternalEndpoint' has not been configured. Webviews will not work!`);
        }
        const endpoint = webviewExternalEndpoint.replace('{{uuid}}', encodedWebviewOrigin);
        if (endpoint[endpoint.length - 1] === '/') {
            return endpoint.slice(0, endpoint.length - 1);
        }
        return endpoint;
    }
    _webviewContentOrigin(encodedWebviewOrigin) {
        const uri = URI.parse(this.webviewContentEndpoint(encodedWebviewOrigin));
        return uri.scheme + '://' + uri.authority.toLowerCase();
    }
    doPostMessage(channel, data, transferable = []) {
        if (this.element && this._messagePort) {
            this._messagePort.postMessage({ channel, args: data }, transferable);
            return true;
        }
        return false;
    }
    on(channel, handler) {
        let handlers = this._messageHandlers.get(channel);
        if (!handlers) {
            handlers = new Set();
            this._messageHandlers.set(channel, handlers);
        }
        handlers.add(handler);
        return toDisposable(() => {
            this._messageHandlers.get(channel)?.delete(handler);
        });
    }
    handleNoCspFound() {
        if (this._hasAlertedAboutMissingCsp) {
            return;
        }
        this._hasAlertedAboutMissingCsp = true;
        if (this.extension?.id) {
            if (this._environmentService.isExtensionDevelopment) {
                this._onMissingCsp.fire(this.extension.id);
            }
        }
    }
    reload() {
        this.doUpdateContent(this._content);
        const subscription = this._register(this.on('did-load', () => {
            this._onDidReload.fire();
            subscription.dispose();
        }));
    }
    setHtml(html) {
        this.doUpdateContent({ ...this._content, html });
        this._onDidHtmlChange.fire(html);
    }
    setTitle(title) {
        this._content = { ...this._content, title };
        this._send('set-title', title);
    }
    set contentOptions(options) {
        this._logService.debug(`Webview(${this.id}): will update content options`);
        if (areWebviewContentOptionsEqual(options, this._content.options)) {
            this._logService.debug(`Webview(${this.id}): skipping content options update`);
            return;
        }
        this.doUpdateContent({ ...this._content, options });
    }
    set localResourcesRoot(resources) {
        this._content = {
            ...this._content,
            options: { ...this._content.options, localResourceRoots: resources },
        };
    }
    set state(state) {
        this._content = { ...this._content, state };
    }
    set initialScrollProgress(value) {
        this._send('initial-scroll-position', value);
    }
    doUpdateContent(newContent) {
        this._logService.debug(`Webview(${this.id}): will update content`);
        this._content = newContent;
        const allowScripts = !!this._content.options.allowScripts;
        this._send('content', {
            contents: this._content.html,
            title: this._content.title,
            options: {
                allowMultipleAPIAcquire: !!this._content.options.allowMultipleAPIAcquire,
                allowScripts: allowScripts,
                allowForms: this._content.options.allowForms ?? allowScripts, // For back compat, we allow forms by default when scripts are enabled
            },
            state: this._content.state,
            cspSource: webviewGenericCspSource,
            confirmBeforeClose: this._confirmBeforeClose,
        });
    }
    style() {
        let { styles, activeTheme, themeLabel, themeId } = this.webviewThemeDataProvider.getWebviewThemeData();
        if (this._options.transformCssVariables) {
            styles = this._options.transformCssVariables(styles);
        }
        const reduceMotion = this._accessibilityService.isMotionReduced();
        const screenReader = this._accessibilityService.isScreenReaderOptimized();
        this._send('styles', { styles, activeTheme, themeId, themeLabel, reduceMotion, screenReader });
    }
    handleFocusChange(isFocused) {
        this._focused = isFocused;
        if (isFocused) {
            this._onDidFocus.fire();
        }
        else {
            this._onDidBlur.fire();
        }
    }
    handleKeyEvent(type, event) {
        // Create a fake KeyboardEvent from the data provided
        const emulatedKeyboardEvent = new KeyboardEvent(type, event);
        // Force override the target
        Object.defineProperty(emulatedKeyboardEvent, 'target', {
            get: () => this.element,
        });
        // And re-dispatch
        this.window?.dispatchEvent(emulatedKeyboardEvent);
    }
    handleDragEvent(type, event) {
        // Create a fake DragEvent from the data provided
        const emulatedDragEvent = new DragEvent(type, event);
        // Force override the target
        Object.defineProperty(emulatedDragEvent, 'target', {
            get: () => this.element,
        });
        // And re-dispatch
        this.window?.dispatchEvent(emulatedDragEvent);
    }
    windowDidDragStart() {
        // Webview break drag and dropping around the main window (no events are generated when you are over them)
        // Work around this by disabling pointer events during the drag.
        // https://github.com/electron/electron/issues/18226
        this._startBlockingIframeDragEvents();
    }
    windowDidDragEnd() {
        this._stopBlockingIframeDragEvents();
    }
    selectAll() {
        this.execCommand('selectAll');
    }
    copy() {
        this.execCommand('copy');
    }
    paste() {
        this.execCommand('paste');
    }
    cut() {
        this.execCommand('cut');
    }
    undo() {
        this.execCommand('undo');
    }
    redo() {
        this.execCommand('redo');
    }
    execCommand(command) {
        if (this.element) {
            this._send('execCommand', command);
        }
    }
    async loadResource(id, uri, ifNoneMatch) {
        try {
            const result = await loadLocalResource(uri, {
                ifNoneMatch,
                roots: this._content.options.localResourceRoots || [],
            }, this._fileService, this._logService, this._resourceLoadingCts.token);
            switch (result.type) {
                case WebviewResourceResponse.Type.Success: {
                    const buffer = await this.streamToBuffer(result.stream);
                    return this._send('did-load-resource', {
                        id,
                        status: 200,
                        path: uri.path,
                        mime: result.mimeType,
                        data: buffer,
                        etag: result.etag,
                        mtime: result.mtime,
                    }, [buffer]);
                }
                case WebviewResourceResponse.Type.NotModified: {
                    return this._send('did-load-resource', {
                        id,
                        status: 304, // not modified
                        path: uri.path,
                        mime: result.mimeType,
                        mtime: result.mtime,
                    });
                }
                case WebviewResourceResponse.Type.AccessDenied: {
                    return this._send('did-load-resource', {
                        id,
                        status: 401, // unauthorized
                        path: uri.path,
                    });
                }
            }
        }
        catch {
            // noop
        }
        return this._send('did-load-resource', {
            id,
            status: 404,
            path: uri.path,
        });
    }
    async streamToBuffer(stream) {
        const vsBuffer = await streamToBuffer(stream);
        return vsBuffer.buffer.buffer;
    }
    async localLocalhost(id, origin) {
        const authority = this._environmentService.remoteAuthority;
        const resolveAuthority = authority
            ? await this._remoteAuthorityResolverService.resolveAuthority(authority)
            : undefined;
        const redirect = resolveAuthority
            ? await this._portMappingManager.getRedirect(resolveAuthority.authority, origin)
            : undefined;
        return this._send('did-load-localhost', {
            id,
            origin,
            location: redirect,
        });
    }
    focus() {
        this._doFocus();
        // Handle focus change programmatically (do not rely on event from <webview>)
        this.handleFocusChange(true);
    }
    _doFocus() {
        if (!this.element) {
            return;
        }
        try {
            this.element.contentWindow?.focus();
        }
        catch {
            // noop
        }
        // Workaround for https://github.com/microsoft/vscode/issues/75209
        // Focusing the inner webview is async so for a sequence of actions such as:
        //
        // 1. Open webview
        // 1. Show quick pick from command palette
        //
        // We end up focusing the webview after showing the quick pick, which causes
        // the quick pick to instantly dismiss.
        //
        // Workaround this by debouncing the focus and making sure we are not focused on an input
        // when we try to re-focus.
        this._focusDelayer.trigger(async () => {
            if (!this.isFocused || !this.element) {
                return;
            }
            if (this.window?.document.activeElement &&
                this.window.document.activeElement !== this.element &&
                this.window.document.activeElement?.tagName !== 'BODY') {
                return;
            }
            // It is possible for the webview to be contained in another window
            // that does not have focus. As such, also focus the body of the
            // webview's window to ensure it is properly receiving keyboard focus.
            this.window?.document.body?.focus();
            this._send('focus', undefined);
        });
    }
    /**
     * Webviews expose a stateful find API.
     * Successive calls to find will move forward or backward through onFindResults
     * depending on the supplied options.
     *
     * @param value The string to search for. Empty strings are ignored.
     */
    find(value, previous) {
        if (!this.element) {
            return;
        }
        this._send('find', { value, previous });
    }
    updateFind(value) {
        if (!value || !this.element) {
            return;
        }
        this._send('find', { value });
    }
    stopFind(keepSelection) {
        if (!this.element) {
            return;
        }
        this._send('find-stop', { clearSelection: !keepSelection });
        this._onDidStopFind.fire();
    }
    showFind(animated = true) {
        this._webviewFindWidget?.reveal(undefined, animated);
    }
    hideFind(animated = true) {
        this._webviewFindWidget?.hide(animated);
    }
    runFindAction(previous) {
        this._webviewFindWidget?.find(previous);
    }
};
WebviewElement = __decorate([
    __param(2, IConfigurationService),
    __param(3, IContextMenuService),
    __param(4, INotificationService),
    __param(5, IWorkbenchEnvironmentService),
    __param(6, IFileService),
    __param(7, ILogService),
    __param(8, IRemoteAuthorityResolverService),
    __param(9, ITunnelService),
    __param(10, IInstantiationService),
    __param(11, IAccessibilityService)
], WebviewElement);
export { WebviewElement };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlYnZpZXcvYnJvd3Nlci93ZWJ2aWV3RWxlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUdyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUEwQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZFLE9BQU8sRUFB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