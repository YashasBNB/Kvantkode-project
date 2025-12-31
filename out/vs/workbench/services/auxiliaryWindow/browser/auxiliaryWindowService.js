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
var BrowserAuxiliaryWindowService_1;
import { getZoomLevel } from '../../../../base/browser/browser.js';
import { $, Dimension, EventHelper, EventType, ModifierKeyEmitter, addDisposableListener, copyAttributes, createLinkElement, createMetaElement, getActiveWindow, getClientArea, getWindowId, isHTMLElement, position, registerWindow, sharedMutationObserver, trackAttributes, } from '../../../../base/browser/dom.js';
import { cloneGlobalStylesheets, isGlobalStylesheet, } from '../../../../base/browser/domStylesheets.js';
import { ensureCodeWindow, mainWindow } from '../../../../base/browser/window.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Barrier } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { mark } from '../../../../base/common/performance.js';
import { isFirefox, isWeb } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DEFAULT_AUX_WINDOW_SIZE, WindowMinimumSize, } from '../../../../platform/window/common/window.js';
import { BaseWindow } from '../../../browser/window.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IHostService } from '../../host/browser/host.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
export const IAuxiliaryWindowService = createDecorator('auxiliaryWindowService');
export var AuxiliaryWindowMode;
(function (AuxiliaryWindowMode) {
    AuxiliaryWindowMode[AuxiliaryWindowMode["Maximized"] = 0] = "Maximized";
    AuxiliaryWindowMode[AuxiliaryWindowMode["Normal"] = 1] = "Normal";
    AuxiliaryWindowMode[AuxiliaryWindowMode["Fullscreen"] = 2] = "Fullscreen";
})(AuxiliaryWindowMode || (AuxiliaryWindowMode = {}));
const DEFAULT_AUX_WINDOW_DIMENSIONS = new Dimension(DEFAULT_AUX_WINDOW_SIZE.width, DEFAULT_AUX_WINDOW_SIZE.height);
let AuxiliaryWindow = class AuxiliaryWindow extends BaseWindow {
    constructor(window, container, stylesHaveLoaded, configurationService, hostService, environmentService) {
        super(window, undefined, hostService, environmentService);
        this.window = window;
        this.container = container;
        this.configurationService = configurationService;
        this._onWillLayout = this._register(new Emitter());
        this.onWillLayout = this._onWillLayout.event;
        this._onDidLayout = this._register(new Emitter());
        this.onDidLayout = this._onDidLayout.event;
        this._onBeforeUnload = this._register(new Emitter());
        this.onBeforeUnload = this._onBeforeUnload.event;
        this._onUnload = this._register(new Emitter());
        this.onUnload = this._onUnload.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.whenStylesHaveLoaded = stylesHaveLoaded.wait().then(() => undefined);
        this.registerListeners();
    }
    registerListeners() {
        this._register(addDisposableListener(this.window, EventType.BEFORE_UNLOAD, (e) => this.handleBeforeUnload(e)));
        this._register(addDisposableListener(this.window, EventType.UNLOAD, () => this.handleUnload()));
        this._register(addDisposableListener(this.window, 'unhandledrejection', (e) => {
            onUnexpectedError(e.reason);
            e.preventDefault();
        }));
        this._register(addDisposableListener(this.window, EventType.RESIZE, () => this.layout()));
        this._register(addDisposableListener(this.container, EventType.SCROLL, () => (this.container.scrollTop = 0))); // Prevent container from scrolling (#55456)
        if (isWeb) {
            this._register(addDisposableListener(this.container, EventType.DROP, (e) => EventHelper.stop(e, true))); // Prevent default navigation on drop
            this._register(addDisposableListener(this.container, EventType.WHEEL, (e) => e.preventDefault(), {
                passive: false,
            })); // Prevent the back/forward gestures in macOS
            this._register(addDisposableListener(this.container, EventType.CONTEXT_MENU, (e) => EventHelper.stop(e, true))); // Prevent native context menus in web
        }
        else {
            this._register(addDisposableListener(this.window.document.body, EventType.DRAG_OVER, (e) => EventHelper.stop(e))); // Prevent drag feedback on <body>
            this._register(addDisposableListener(this.window.document.body, EventType.DROP, (e) => EventHelper.stop(e))); // Prevent default navigation on drop
        }
    }
    handleBeforeUnload(e) {
        // Check for veto from a listening component
        let veto;
        this._onBeforeUnload.fire({
            veto(reason) {
                if (reason) {
                    veto = reason;
                }
            },
        });
        if (veto) {
            this.handleVetoBeforeClose(e, veto);
            return;
        }
        // Check for confirm before close setting
        const confirmBeforeCloseSetting = this.configurationService.getValue('window.confirmBeforeClose');
        const confirmBeforeClose = confirmBeforeCloseSetting === 'always' ||
            (confirmBeforeCloseSetting === 'keyboardOnly' &&
                ModifierKeyEmitter.getInstance().isModifierPressed);
        if (confirmBeforeClose) {
            this.confirmBeforeClose(e);
        }
    }
    handleVetoBeforeClose(e, reason) {
        this.preventUnload(e);
    }
    preventUnload(e) {
        e.preventDefault();
        e.returnValue = localize('lifecycleVeto', "Changes that you made may not be saved. Please check press 'Cancel' and try again.");
    }
    confirmBeforeClose(e) {
        this.preventUnload(e);
    }
    handleUnload() {
        // Event
        this._onUnload.fire();
    }
    layout() {
        // Split layout up into two events so that downstream components
        // have a chance to participate in the beginning or end of the
        // layout phase.
        // This helps to build the auxiliary window in another component
        // in the `onWillLayout` phase and then let other compoments
        // react when the overall layout has finished in `onDidLayout`.
        const dimension = getClientArea(this.window.document.body, DEFAULT_AUX_WINDOW_DIMENSIONS, this.container);
        this._onWillLayout.fire(dimension);
        this._onDidLayout.fire(dimension);
    }
    createState() {
        return {
            bounds: {
                x: this.window.screenX,
                y: this.window.screenY,
                width: this.window.outerWidth,
                height: this.window.outerHeight,
            },
            zoomLevel: getZoomLevel(this.window),
        };
    }
    dispose() {
        if (this._store.isDisposed) {
            return;
        }
        this._onWillDispose.fire();
        super.dispose();
    }
};
AuxiliaryWindow = __decorate([
    __param(3, IConfigurationService),
    __param(4, IHostService),
    __param(5, IWorkbenchEnvironmentService)
], AuxiliaryWindow);
export { AuxiliaryWindow };
let BrowserAuxiliaryWindowService = class BrowserAuxiliaryWindowService extends Disposable {
    static { BrowserAuxiliaryWindowService_1 = this; }
    static { this.DEFAULT_SIZE = DEFAULT_AUX_WINDOW_SIZE; }
    static { this.WINDOW_IDS = getWindowId(mainWindow) + 1; } // start from the main window ID + 1
    constructor(layoutService, dialogService, configurationService, telemetryService, hostService, environmentService) {
        super();
        this.layoutService = layoutService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.hostService = hostService;
        this.environmentService = environmentService;
        this._onDidOpenAuxiliaryWindow = this._register(new Emitter());
        this.onDidOpenAuxiliaryWindow = this._onDidOpenAuxiliaryWindow.event;
        this.windows = new Map();
    }
    async open(options) {
        mark('code/auxiliaryWindow/willOpen');
        const targetWindow = await this.openWindow(options);
        if (!targetWindow) {
            throw new Error(localize('unableToOpenWindowError', 'Unable to open a new window.'));
        }
        // Add a `vscodeWindowId` property to identify auxiliary windows
        const resolvedWindowId = await this.resolveWindowId(targetWindow);
        ensureCodeWindow(targetWindow, resolvedWindowId);
        const containerDisposables = new DisposableStore();
        const { container, stylesLoaded } = this.createContainer(targetWindow, containerDisposables, options);
        const auxiliaryWindow = this.createAuxiliaryWindow(targetWindow, container, stylesLoaded);
        const registryDisposables = new DisposableStore();
        this.windows.set(targetWindow.vscodeWindowId, auxiliaryWindow);
        registryDisposables.add(toDisposable(() => this.windows.delete(targetWindow.vscodeWindowId)));
        const eventDisposables = new DisposableStore();
        Event.once(auxiliaryWindow.onWillDispose)(() => {
            targetWindow.close();
            containerDisposables.dispose();
            registryDisposables.dispose();
            eventDisposables.dispose();
        });
        registryDisposables.add(registerWindow(targetWindow));
        this._onDidOpenAuxiliaryWindow.fire({ window: auxiliaryWindow, disposables: eventDisposables });
        mark('code/auxiliaryWindow/didOpen');
        this.telemetryService.publicLog2('auxiliaryWindowOpen', { bounds: !!options?.bounds });
        return auxiliaryWindow;
    }
    createAuxiliaryWindow(targetWindow, container, stylesLoaded) {
        return new AuxiliaryWindow(targetWindow, container, stylesLoaded, this.configurationService, this.hostService, this.environmentService);
    }
    async openWindow(options) {
        const activeWindow = getActiveWindow();
        const activeWindowBounds = {
            x: activeWindow.screenX,
            y: activeWindow.screenY,
            width: activeWindow.outerWidth,
            height: activeWindow.outerHeight,
        };
        const width = Math.max(options?.bounds?.width ?? BrowserAuxiliaryWindowService_1.DEFAULT_SIZE.width, WindowMinimumSize.WIDTH);
        const height = Math.max(options?.bounds?.height ?? BrowserAuxiliaryWindowService_1.DEFAULT_SIZE.height, WindowMinimumSize.HEIGHT);
        let newWindowBounds = {
            x: options?.bounds?.x ??
                Math.max(activeWindowBounds.x + activeWindowBounds.width / 2 - width / 2, 0),
            y: options?.bounds?.y ??
                Math.max(activeWindowBounds.y + activeWindowBounds.height / 2 - height / 2, 0),
            width,
            height,
        };
        if (!options?.bounds &&
            newWindowBounds.x === activeWindowBounds.x &&
            newWindowBounds.y === activeWindowBounds.y) {
            // Offset the new window a bit so that it does not overlap
            // with the active window, unless bounds are provided
            newWindowBounds = {
                ...newWindowBounds,
                x: newWindowBounds.x + 30,
                y: newWindowBounds.y + 30,
            };
        }
        const features = coalesce([
            'popup=yes',
            `left=${newWindowBounds.x}`,
            `top=${newWindowBounds.y}`,
            `width=${newWindowBounds.width}`,
            `height=${newWindowBounds.height}`,
            // non-standard properties
            options?.nativeTitlebar ? 'window-native-titlebar=yes' : undefined,
            options?.disableFullscreen ? 'window-disable-fullscreen=yes' : undefined,
            options?.mode === AuxiliaryWindowMode.Maximized ? 'window-maximized=yes' : undefined,
            options?.mode === AuxiliaryWindowMode.Fullscreen ? 'window-fullscreen=yes' : undefined,
        ]);
        const auxiliaryWindow = mainWindow.open(isFirefox
            ? '' /* FF immediately fires an unload event if using about:blank */
            : 'about:blank', undefined, features.join(','));
        if (!auxiliaryWindow && isWeb) {
            return (await this.dialogService.prompt({
                type: Severity.Warning,
                message: localize('unableToOpenWindow', "The browser interrupted the opening of a new window. Press 'Retry' to try again."),
                detail: localize('unableToOpenWindowDetail', 'To avoid this problem in the future, please ensure to allow popups for this website.'),
                buttons: [
                    {
                        label: localize({ key: 'retry', comment: ['&& denotes a mnemonic'] }, '&&Retry'),
                        run: () => this.openWindow(options),
                    },
                ],
                cancelButton: true,
            })).result;
        }
        return auxiliaryWindow?.window;
    }
    async resolveWindowId(auxiliaryWindow) {
        return BrowserAuxiliaryWindowService_1.WINDOW_IDS++;
    }
    createContainer(auxiliaryWindow, disposables, options) {
        auxiliaryWindow.document.createElement = function () {
            // Disallow `createElement` because it would create
            // HTML Elements in the "wrong" context and break
            // code that does "instanceof HTMLElement" etc.
            throw new Error('Not allowed to create elements in child window JavaScript context. Always use the main window so that "xyz instanceof HTMLElement" continues to work.');
        };
        this.applyMeta(auxiliaryWindow);
        const { stylesLoaded } = this.applyCSS(auxiliaryWindow, disposables);
        const container = this.applyHTML(auxiliaryWindow, disposables);
        return { stylesLoaded, container };
    }
    applyMeta(auxiliaryWindow) {
        for (const metaTag of [
            'meta[charset="utf-8"]',
            'meta[http-equiv="Content-Security-Policy"]',
            'meta[name="viewport"]',
            'meta[name="theme-color"]',
        ]) {
            const metaElement = mainWindow.document.querySelector(metaTag);
            if (metaElement) {
                const clonedMetaElement = createMetaElement(auxiliaryWindow.document.head);
                copyAttributes(metaElement, clonedMetaElement);
                if (metaTag === 'meta[http-equiv="Content-Security-Policy"]') {
                    const content = clonedMetaElement.getAttribute('content');
                    if (content) {
                        clonedMetaElement.setAttribute('content', content.replace(/(script-src[^\;]*)/, `script-src 'none'`));
                    }
                }
            }
        }
        const originalIconLinkTag = mainWindow.document.querySelector('link[rel="icon"]');
        if (originalIconLinkTag) {
            const icon = createLinkElement(auxiliaryWindow.document.head);
            copyAttributes(originalIconLinkTag, icon);
        }
    }
    applyCSS(auxiliaryWindow, disposables) {
        mark('code/auxiliaryWindow/willApplyCSS');
        const mapOriginalToClone = new Map();
        const stylesLoaded = new Barrier();
        stylesLoaded.wait().then(() => mark('code/auxiliaryWindow/didLoadCSSStyles'));
        const pendingLinksDisposables = disposables.add(new DisposableStore());
        let pendingLinksToSettle = 0;
        function onLinkSettled() {
            if (--pendingLinksToSettle === 0) {
                pendingLinksDisposables.dispose();
                stylesLoaded.open();
            }
        }
        function cloneNode(originalNode) {
            if (isGlobalStylesheet(originalNode)) {
                return; // global stylesheets are handled by `cloneGlobalStylesheets` below
            }
            const clonedNode = auxiliaryWindow.document.head.appendChild(originalNode.cloneNode(true));
            if (originalNode.tagName.toLowerCase() === 'link') {
                pendingLinksToSettle++;
                pendingLinksDisposables.add(addDisposableListener(clonedNode, 'load', onLinkSettled));
                pendingLinksDisposables.add(addDisposableListener(clonedNode, 'error', onLinkSettled));
            }
            mapOriginalToClone.set(originalNode, clonedNode);
        }
        // Clone all style elements and stylesheet links from the window to the child window
        // and keep track of <link> elements to settle to signal that styles have loaded
        // Increment pending links right from the beginning to ensure we only settle when
        // all style related nodes have been cloned.
        pendingLinksToSettle++;
        try {
            for (const originalNode of mainWindow.document.head.querySelectorAll('link[rel="stylesheet"], style')) {
                cloneNode(originalNode);
            }
        }
        finally {
            onLinkSettled();
        }
        // Global stylesheets in <head> are cloned in a special way because the mutation
        // observer is not firing for changes done via `style.sheet` API. Only text changes
        // can be observed.
        disposables.add(cloneGlobalStylesheets(auxiliaryWindow));
        // Listen to new stylesheets as they are being added or removed in the main window
        // and apply to child window (including changes to existing stylesheets elements)
        disposables.add(sharedMutationObserver.observe(mainWindow.document.head, disposables, {
            childList: true,
            subtree: true,
        })((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type !== 'childList' || // only interested in added/removed nodes
                    mutation.target.nodeName.toLowerCase() === 'title' || // skip over title changes that happen frequently
                    mutation.target.nodeName.toLowerCase() === 'script' || // block <script> changes that are unsupported anyway
                    mutation.target.nodeName.toLowerCase() === 'meta' // do not observe <meta> elements for now
                ) {
                    continue;
                }
                for (const node of mutation.addedNodes) {
                    // <style>/<link> element was added
                    if (isHTMLElement(node) &&
                        (node.tagName.toLowerCase() === 'style' || node.tagName.toLowerCase() === 'link')) {
                        cloneNode(node);
                    }
                    // text-node was changed, try to apply to our clones
                    else if (node.nodeType === Node.TEXT_NODE && node.parentNode) {
                        const clonedNode = mapOriginalToClone.get(node.parentNode);
                        if (clonedNode) {
                            clonedNode.textContent = node.textContent;
                        }
                    }
                }
                for (const node of mutation.removedNodes) {
                    const clonedNode = mapOriginalToClone.get(node);
                    if (clonedNode) {
                        clonedNode.parentNode?.removeChild(clonedNode);
                        mapOriginalToClone.delete(node);
                    }
                }
            }
        }));
        mark('code/auxiliaryWindow/didApplyCSS');
        return { stylesLoaded };
    }
    applyHTML(auxiliaryWindow, disposables) {
        mark('code/auxiliaryWindow/willApplyHTML');
        // Create workbench container and apply classes
        const container = $('div', { role: 'application' });
        position(container, 0, 0, 0, 0, 'relative');
        container.style.display = 'flex';
        container.style.height = '100%';
        container.style.flexDirection = 'column';
        auxiliaryWindow.document.body.append(container);
        // Track attributes
        disposables.add(trackAttributes(mainWindow.document.documentElement, auxiliaryWindow.document.documentElement));
        disposables.add(trackAttributes(mainWindow.document.body, auxiliaryWindow.document.body));
        disposables.add(trackAttributes(this.layoutService.mainContainer, container, ['class'])); // only class attribute
        mark('code/auxiliaryWindow/didApplyHTML');
        return container;
    }
    getWindow(windowId) {
        return this.windows.get(windowId);
    }
};
BrowserAuxiliaryWindowService = BrowserAuxiliaryWindowService_1 = __decorate([
    __param(0, IWorkbenchLayoutService),
    __param(1, IDialogService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, IHostService),
    __param(5, IWorkbenchEnvironmentService)
], BrowserAuxiliaryWindowService);
export { BrowserAuxiliaryWindowService };
registerSingleton(IAuxiliaryWindowService, BrowserAuxiliaryWindowService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV4aWxpYXJ5V2luZG93U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hdXhpbGlhcnlXaW5kb3cvYnJvd3Nlci9hdXhpbGlhcnlXaW5kb3dTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxFQUNOLENBQUMsRUFDRCxTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFDVCxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixhQUFhLEVBQ2IsV0FBVyxFQUNYLGFBQWEsRUFDYixRQUFRLEVBQ1IsY0FBYyxFQUNkLHNCQUFzQixFQUN0QixlQUFlLEdBQ2YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGtCQUFrQixHQUNsQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBYyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3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