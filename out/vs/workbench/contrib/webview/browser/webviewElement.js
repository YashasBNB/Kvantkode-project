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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VsZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvd2Vidmlld0VsZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFHckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBMEIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQy9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sZUFBZSxFQUNmLHVCQUF1QixFQUN2Qiw0QkFBNEIsR0FDNUIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVqRixPQUFPLEVBQ04sNkJBQTZCLEdBTzdCLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBdUIsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQWUvRSxJQUFVLFlBQVksQ0FzQnJCO0FBdEJELFdBQVUsWUFBWTtJQUNyQixJQUFrQixJQUdqQjtJQUhELFdBQWtCLElBQUk7UUFDckIsK0NBQVksQ0FBQTtRQUNaLGlDQUFLLENBQUE7SUFDTixDQUFDLEVBSGlCLElBQUksR0FBSixpQkFBSSxLQUFKLGlCQUFJLFFBR3JCO0lBRUQsTUFBYSxZQUFZO1FBR3hCLFlBQ1EsZUFLTDtZQUxLLG9CQUFlLEdBQWYsZUFBZSxDQUtwQjtZQVJNLFNBQUksNkJBQW9CO1FBUzlCLENBQUM7S0FDSjtJQVhZLHlCQUFZLGVBV3hCLENBQUE7SUFFWSxrQkFBSyxHQUFHLEVBQUUsSUFBSSxvQkFBWSxFQUFXLENBQUE7QUFHbkQsQ0FBQyxFQXRCUyxZQUFZLEtBQVosWUFBWSxRQXNCckI7QUFPRCxNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQTtBQUU3QixJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFlLFNBQVEsVUFBVTtJQWM3QyxJQUFZLE1BQU07UUFDakIsT0FBTyxPQUFPLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQzlGLENBQUM7SUFLRCxJQUFjLFFBQVE7UUFDckIsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUtELElBQWMsT0FBTztRQUNwQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUdELElBQVcsU0FBUztRQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELDhEQUE4RDtRQUM5RCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDL0YsK0RBQStEO1lBQy9ELG9EQUFvRDtZQUNwRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUE4QkQsWUFDQyxRQUF5QixFQUNOLHdCQUFrRCxFQUM5QyxvQkFBMkMsRUFDN0Msa0JBQXVDLEVBQ3RDLG1CQUF5QyxFQUUvRCxtQkFBa0UsRUFDcEQsWUFBMkMsRUFDNUMsV0FBeUMsRUFFdEQsK0JBQWlGLEVBQ2pFLGNBQStDLEVBQ3hDLG9CQUEyQyxFQUMzQyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFkWSw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBS3BELHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBOEI7UUFDbkMsaUJBQVksR0FBWixZQUFZLENBQWM7UUFDM0IsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFFckMsb0NBQStCLEdBQS9CLCtCQUErQixDQUFpQztRQUNoRCxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFFdkIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQTNGbEUsT0FBRSxHQUFHLFlBQVksRUFBRSxDQUFBO1FBWTlCLGNBQVMsR0FBdUIsU0FBUyxDQUFBO1FBWWhDLGtDQUE2QixHQUFHLENBQUMsQ0FBQSxDQUFDLDBEQUEwRDtRQXlCckcsV0FBTSxHQUF1QixJQUFJLFlBQVksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUE7UUFNckQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtRQU1uRSxrQkFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhELHFCQUFnQixHQUFvQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUN2RSxvQkFBZSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFHL0MscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXFELENBQUE7UUFHaEYsNEJBQXVCLEdBQUcsSUFBSSxDQUFBO1FBRXRDLGNBQVMsR0FBRyxLQUFLLENBQUE7UUFnUVIsa0JBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF1QixDQUFDLENBQUE7UUFDbkUsaUJBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtRQUV0QyxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFBO1FBQ3hELG1CQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7UUFFMUMsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNuRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBRXBDLGVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUErQixDQUFDLENBQUE7UUFDeEUsY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBRWhDLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDN0MsSUFBSSxPQUFPLEVBQTBDLENBQ3JELENBQUE7UUFDZSxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBRXBDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBb0IsQ0FBQyxDQUFBO1FBQzlELGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtRQUVsQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFzQixDQUFDLENBQUE7UUFDdEUscUJBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtRQUU5QyxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQ2xELGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtRQUVsQyxlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDakQsY0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFBO1FBRWhDLGtCQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZ0MsQ0FBQyxDQUFBO1FBQzVFLGlCQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUFFdEMsa0JBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNwRCxpQkFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBME8vQywrQkFBMEIsR0FBRyxLQUFLLENBQUE7UUF1U3ZCLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7UUFDMUQsa0JBQWEsR0FBbUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUE7UUFFdEQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN2RCxrQkFBYSxHQUFnQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtRQS94QnJFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUE7UUFDakQsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUE7UUFFeEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBO1FBQ2hDLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQTtRQUVuQyxJQUFJLENBQUMsUUFBUSxHQUFHO1lBQ2YsSUFBSSxFQUFFLEVBQUU7WUFDUixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxjQUFjO1lBQ2hDLEtBQUssRUFBRSxTQUFTO1NBQ2hCLENBQUE7UUFFRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDeEMsSUFBSSx5QkFBeUIsQ0FDNUIsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQzlCLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxFQUFFLEVBQzdDLElBQUksQ0FBQyxjQUFjLENBQ25CLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUU5RSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtZQUM1QixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN4QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO1lBQ3JDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtZQUM5QyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLEVBQUU7WUFDL0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFDOUMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNwQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtZQUNsQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtZQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7WUFDbkMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUM1QixtQkFBbUIsQ0FBQyxLQUFLLENBQ3hCLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSw0QkFBNEIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQ3RFLENBQUE7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNoRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQy9CLDZFQUE2RTtZQUM3RSw4RUFBOEU7WUFDOUUsc0ZBQXNGO1lBQ3RGLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM5QixPQUFNO1lBQ1AsQ0FBQztZQUNELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUN2RCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUM7Z0JBQy9ELEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUMvQixDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQzthQUN6QyxDQUFDLENBQUE7WUFDRixrQkFBa0IsQ0FBQyxlQUFlLENBQUM7Z0JBQ2xDLE1BQU0sRUFBRSxNQUFNLENBQUMsY0FBYztnQkFDN0IsaUJBQWlCLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUU7Z0JBQzlDLGlCQUFpQjtnQkFDakIsaUJBQWlCLEVBQUUsR0FBeUIsRUFBRSxDQUFDLENBQUM7b0JBQy9DLEdBQUcsSUFBSSxDQUFDLE9BQU87b0JBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7aUJBQzlCLENBQUM7Z0JBQ0YsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7b0JBQ2pCLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPO29CQUM5QixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTztpQkFDOUIsQ0FBQzthQUNGLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUMxRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDeEMsSUFBSSxDQUFDO2dCQUNKLDhDQUE4QztnQkFDOUMsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDbEQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztvQkFDcEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO29CQUNwQixTQUFTLEVBQUUsU0FBUztvQkFDcEIsSUFBSSxFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSx1QkFBdUI7b0JBQzdELEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLO2lCQUNsRSxDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDcEQsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRTtvQkFDL0IsRUFBRSxFQUFFLEtBQUssQ0FBQyxFQUFFO29CQUNaLE1BQU0sRUFBRSxHQUFHO29CQUNYLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtpQkFDaEIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNuQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQ3RGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxnQ0FBZ0MsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFGLElBQUksQ0FBQyxTQUFTLENBQ2Isa0JBQWtCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLENBQzVDLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDMUQsQ0FDRCxDQUFBO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBUywyQkFBMkIsQ0FBQyxDQUFBO1FBRTdGLElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQywyQkFBMkIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtnQkFDckYsSUFBSSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUNqRSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1lBQzFCLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDekIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN2QyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQzVELENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUVyQixJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsU0FBUyxDQUFBO1FBRXpCLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUyxDQUFBO1FBRTdCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLDJDQUFtQyxFQUFFLENBQUM7WUFDekQsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNuRCxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3ZCLENBQUM7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7UUFDakMsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFekIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV0QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVELG9CQUFvQixDQUFDLGlCQUFxQztRQUN6RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsaUJBQWlCLENBQUE7SUFDNUMsQ0FBQztJQXFDTSxXQUFXLENBQUMsT0FBWSxFQUFFLFFBQXdCO1FBQ3hELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRU8sS0FBSyxDQUFDLEtBQUssQ0FDbEIsT0FBVSxFQUNWLElBQXlCLEVBQ3pCLGlCQUFpQyxFQUFFO1FBRW5DLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLDJDQUFtQyxFQUFFLENBQUM7WUFDekQsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxvQkFBb0IsRUFBVyxDQUFBO1lBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBQzFGLE9BQU8sT0FBTyxDQUFBO1FBQ2YsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN6RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxPQUF1QixFQUFFLGVBQXNDO1FBQ3JGLHdDQUF3QztRQUN4QyxtRUFBbUU7UUFDbkUsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoRCxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUE7UUFDdEIsT0FBTyxDQUFDLFNBQVMsR0FBRyxXQUFXLE9BQU8sQ0FBQyxhQUFhLElBQUksRUFBRSxFQUFFLENBQUE7UUFDNUQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQ2xCLGVBQWUsRUFDZixtQkFBbUIsRUFDbkIsYUFBYSxFQUNiLG9CQUFvQixFQUNwQixpQkFBaUIsQ0FDakIsQ0FBQTtRQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDeEQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLFVBQVUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBQ0QsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXBELE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUM3QixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUE7UUFDNUIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBRTdCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQixDQUFDLENBQUE7UUFFRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxZQUFZLENBQ25CLG9CQUE0QixFQUM1QixTQUFrRCxFQUNsRCxPQUF1QixFQUN2QixZQUF3QjtRQUV4Qiw2RUFBNkU7UUFDN0UsTUFBTSxNQUFNLEdBQThCO1lBQ3pDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNYLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQztZQUNyRCxXQUFXLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN0QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsZ0NBQWdDLEVBQUUsNEJBQTRCO1lBQzlELFlBQVksRUFBRSxZQUFZLENBQUMsTUFBTTtTQUNqQyxDQUFBO1FBRUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDeEMsTUFBTSxDQUFDLG9CQUFvQixHQUFHLE1BQU0sQ0FBQTtRQUNyQyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDOUMsTUFBTSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFBO1FBQ2xFLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyQixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUE7UUFDakMsQ0FBQztRQUVELEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUV0QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUUxRCxzRUFBc0U7UUFDdEUsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBO1FBRS9ELElBQUksQ0FBQyxPQUFRLENBQUMsWUFBWSxDQUN6QixLQUFLLEVBQ0wsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsSUFBSSxRQUFRLElBQUksV0FBVyxFQUFFLENBQ2pGLENBQUE7SUFDRixDQUFDO0lBRU0sT0FBTyxDQUFDLE9BQW9CLEVBQUUsWUFBd0I7UUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFDLGNBQWMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUMxRixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsRUFBRSxDQUFDLENBQ3pDLENBQUE7UUFDRCxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLENBQUMsb0JBQW9CLEVBQUUsRUFBRTtZQUMvRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNyRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFMUMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUM3QixPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQzFELENBQUM7UUFFRCxLQUFLLE1BQU0sU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3RGLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQzlDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1lBQ3JDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQzVDLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO2dCQUNwRCxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtZQUNyQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQSxDQUFDLG9EQUFvRDtRQUV6RSxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sdUJBQXVCLENBQUMsWUFBd0I7UUFDdkQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEMscUJBQXFCLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQWUsRUFBRSxFQUFFO1lBQ2xFLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEtBQUssSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNoRSxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztnQkFDekUsT0FBTyxDQUFDLEdBQUcsQ0FDVixpRUFBaUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FDekcsQ0FBQTtnQkFDRCxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssZUFBZSxFQUFFLENBQUM7Z0JBQ3hDLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUN2QixPQUFNO2dCQUNQLENBQUM7Z0JBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO2dCQUU1RCxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDMUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQTt3QkFDeEQsT0FBTTtvQkFDUCxDQUFDO29CQUNELFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN4RCxDQUFDLENBQUE7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUVwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSwyQ0FBbUMsRUFBRSxDQUFDO29CQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUNsRSxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FDMUMsQ0FBQTtnQkFDRixDQUFDO2dCQUNELElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQTtnQkFFaEMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDhCQUE4QjtRQUNyQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFBO1FBQzFDLENBQUM7SUFDRixDQUFDO0lBRU8sNkJBQTZCO1FBQ3BDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxvQkFBNEI7UUFDNUQsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsdUJBQXVCLENBQUE7UUFDaEYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDOUIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0RUFBNEUsQ0FBQyxDQUFBO1FBQzlGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLG9CQUFvQixDQUFDLENBQUE7UUFDbEYsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUMzQyxPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxvQkFBNEI7UUFDekQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLE9BQU8sR0FBRyxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUN4RCxDQUFDO0lBRU8sYUFBYSxDQUFDLE9BQWUsRUFBRSxJQUFVLEVBQUUsZUFBK0IsRUFBRTtRQUNuRixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNwRSxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxFQUFFLENBQ1QsT0FBVSxFQUNWLE9BQStEO1FBRS9ELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsUUFBUSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7WUFDcEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUVELFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckIsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUdPLGdCQUFnQjtRQUN2QixJQUFJLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQTtRQUV0QyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDeEIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDckQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMzQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTSxNQUFNO1FBQ1osSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbEMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDeEIsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sT0FBTyxDQUFDLElBQVk7UUFDMUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVNLFFBQVEsQ0FBQyxLQUFhO1FBQzVCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQVcsY0FBYyxDQUFDLE9BQThCO1FBQ3ZELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsSUFBSSxDQUFDLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQTtRQUUxRSxJQUFJLDZCQUE2QixDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbkUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLENBQUMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFBO1lBQzlFLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxJQUFXLGtCQUFrQixDQUFDLFNBQXlCO1FBQ3RELElBQUksQ0FBQyxRQUFRLEdBQUc7WUFDZixHQUFHLElBQUksQ0FBQyxRQUFRO1lBQ2hCLE9BQU8sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxFQUFFO1NBQ3BFLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBVyxLQUFLLENBQUMsS0FBeUI7UUFDekMsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsSUFBVyxxQkFBcUIsQ0FBQyxLQUFhO1FBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVPLGVBQWUsQ0FBQyxVQUEwQjtRQUNqRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksQ0FBQyxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFFbEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUE7UUFFMUIsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQTtRQUN6RCxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtZQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJO1lBQzVCLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUs7WUFDMUIsT0FBTyxFQUFFO2dCQUNSLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUI7Z0JBQ3hFLFlBQVksRUFBRSxZQUFZO2dCQUMxQixVQUFVLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLFlBQVksRUFBRSxzRUFBc0U7YUFDcEk7WUFDRCxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO1lBQzFCLFNBQVMsRUFBRSx1QkFBdUI7WUFDbEMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQjtTQUM1QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVMsS0FBSztRQUNkLElBQUksRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FDL0MsSUFBSSxDQUFDLHdCQUF3QixDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDcEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDekMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUNqRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUV6RSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRVMsaUJBQWlCLENBQUMsU0FBa0I7UUFDN0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUE7UUFDekIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3ZCLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLElBQXlCLEVBQUUsS0FBZTtRQUNoRSxxREFBcUQ7UUFDckQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUQsNEJBQTRCO1FBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMscUJBQXFCLEVBQUUsUUFBUSxFQUFFO1lBQ3RELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTztTQUN2QixDQUFDLENBQUE7UUFDRixrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sZUFBZSxDQUFDLElBQVksRUFBRSxLQUF1QjtRQUM1RCxpREFBaUQ7UUFDakQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDcEQsNEJBQTRCO1FBQzVCLE1BQU0sQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxFQUFFO1lBQ2xELEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTztTQUN2QixDQUFDLENBQUE7UUFDRixrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLDBHQUEwRztRQUMxRyxnRUFBZ0U7UUFDaEUsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxnQkFBZ0I7UUFDZixJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQTtJQUNyQyxDQUFDO0lBRU0sU0FBUztRQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFTSxLQUFLO1FBQ1gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBRU0sR0FBRztRQUNULElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVNLElBQUk7UUFDVixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3pCLENBQUM7SUFFTSxJQUFJO1FBQ1YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRU8sV0FBVyxDQUFDLE9BQWU7UUFDbEMsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQVUsRUFBRSxHQUFRLEVBQUUsV0FBK0I7UUFDL0UsSUFBSSxDQUFDO1lBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxpQkFBaUIsQ0FDckMsR0FBRyxFQUNIO2dCQUNDLFdBQVc7Z0JBQ1gsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGtCQUFrQixJQUFJLEVBQUU7YUFDckQsRUFDRCxJQUFJLENBQUMsWUFBWSxFQUNqQixJQUFJLENBQUMsV0FBVyxFQUNoQixJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUM5QixDQUFBO1lBRUQsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3JCLEtBQUssdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7b0JBQ3ZELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FDaEIsbUJBQW1CLEVBQ25CO3dCQUNDLEVBQUU7d0JBQ0YsTUFBTSxFQUFFLEdBQUc7d0JBQ1gsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO3dCQUNkLElBQUksRUFBRSxNQUFNLENBQUMsUUFBUTt3QkFDckIsSUFBSSxFQUFFLE1BQU07d0JBQ1osSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO3dCQUNqQixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7cUJBQ25CLEVBQ0QsQ0FBQyxNQUFNLENBQUMsQ0FDUixDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsS0FBSyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDL0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFO3dCQUN0QyxFQUFFO3dCQUNGLE1BQU0sRUFBRSxHQUFHLEVBQUUsZUFBZTt3QkFDNUIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO3dCQUNkLElBQUksRUFBRSxNQUFNLENBQUMsUUFBUTt3QkFDckIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO3FCQUNuQixDQUFDLENBQUE7Z0JBQ0gsQ0FBQztnQkFDRCxLQUFLLHVCQUF1QixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUNoRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUU7d0JBQ3RDLEVBQUU7d0JBQ0YsTUFBTSxFQUFFLEdBQUcsRUFBRSxlQUFlO3dCQUM1QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7cUJBQ2QsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNSLE9BQU87UUFDUixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFO1lBQ3RDLEVBQUU7WUFDRixNQUFNLEVBQUUsR0FBRztZQUNYLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtTQUNkLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUyxLQUFLLENBQUMsY0FBYyxDQUFDLE1BQThCO1FBQzVELE1BQU0sUUFBUSxHQUFHLE1BQU0sY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdDLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUE7SUFDOUIsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBVSxFQUFFLE1BQWM7UUFDdEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQTtRQUMxRCxNQUFNLGdCQUFnQixHQUFHLFNBQVM7WUFDakMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLCtCQUErQixDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztZQUN4RSxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osTUFBTSxRQUFRLEdBQUcsZ0JBQWdCO1lBQ2hDLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQztZQUNoRixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFO1lBQ3ZDLEVBQUU7WUFDRixNQUFNO1lBQ04sUUFBUSxFQUFFLFFBQVE7U0FDbEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEtBQUs7UUFDWCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFZiw2RUFBNkU7UUFDN0UsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzdCLENBQUM7SUFFTyxRQUFRO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFBO1FBQ3BDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixPQUFPO1FBQ1IsQ0FBQztRQUVELGtFQUFrRTtRQUNsRSw0RUFBNEU7UUFDNUUsRUFBRTtRQUNGLGtCQUFrQjtRQUNsQiwwQ0FBMEM7UUFDMUMsRUFBRTtRQUNGLDRFQUE0RTtRQUM1RSx1Q0FBdUM7UUFDdkMsRUFBRTtRQUNGLHlGQUF5RjtRQUN6RiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFDQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxhQUFhO2dCQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEtBQUssSUFBSSxDQUFDLE9BQU87Z0JBQ25ELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxPQUFPLEtBQUssTUFBTSxFQUNyRCxDQUFDO2dCQUNGLE9BQU07WUFDUCxDQUFDO1lBRUQsbUVBQW1FO1lBQ25FLGdFQUFnRTtZQUNoRSxzRUFBc0U7WUFDdEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFBO1lBRW5DLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQVFEOzs7Ozs7T0FNRztJQUNJLElBQUksQ0FBQyxLQUFhLEVBQUUsUUFBaUI7UUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVNLFVBQVUsQ0FBQyxLQUFhO1FBQzlCLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0IsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVNLFFBQVEsQ0FBQyxhQUF1QjtRQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVNLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSTtRQUM5QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRU0sUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJO1FBQzlCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVNLGFBQWEsQ0FBQyxRQUFpQjtRQUNyQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7Q0FDRCxDQUFBO0FBMTZCWSxjQUFjO0lBaUZ4QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLCtCQUErQixDQUFBO0lBRS9CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLHFCQUFxQixDQUFBO0dBNUZYLGNBQWMsQ0EwNkIxQiJ9