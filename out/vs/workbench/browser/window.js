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
var BaseWindow_1;
import { isSafari, setFullscreen } from '../../base/browser/browser.js';
import { addDisposableListener, EventHelper, EventType, getActiveWindow, getWindow, getWindowById, getWindows, getWindowsCount, windowOpenNoOpener, windowOpenPopup, windowOpenWithSuccess, } from '../../base/browser/dom.js';
import { DomEmitter } from '../../base/browser/event.js';
import { requestHidDevice, requestSerialPort, requestUsbDevice, } from '../../base/browser/deviceAccess.js';
import { timeout } from '../../base/common/async.js';
import { Event } from '../../base/common/event.js';
import { Disposable, dispose, toDisposable } from '../../base/common/lifecycle.js';
import { matchesScheme, Schemas } from '../../base/common/network.js';
import { isIOS, isMacintosh } from '../../base/common/platform.js';
import Severity from '../../base/common/severity.js';
import { URI } from '../../base/common/uri.js';
import { localize } from '../../nls.js';
import { CommandsRegistry } from '../../platform/commands/common/commands.js';
import { IDialogService } from '../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../platform/label/common/label.js';
import { IOpenerService } from '../../platform/opener/common/opener.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IBrowserWorkbenchEnvironmentService } from '../services/environment/browser/environmentService.js';
import { IWorkbenchLayoutService } from '../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../services/lifecycle/common/lifecycle.js';
import { IHostService } from '../services/host/browser/host.js';
import { registerWindowDriver } from '../services/driver/browser/driver.js';
import { isAuxiliaryWindow, mainWindow } from '../../base/browser/window.js';
import { createSingleCallFunction } from '../../base/common/functional.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../services/environment/common/environmentService.js';
let BaseWindow = class BaseWindow extends Disposable {
    static { BaseWindow_1 = this; }
    static { this.TIMEOUT_HANDLES = Number.MIN_SAFE_INTEGER; } // try to not compete with the IDs of native `setTimeout`
    static { this.TIMEOUT_DISPOSABLES = new Map(); }
    constructor(targetWindow, dom = { getWindowsCount, getWindows } /* for testing */, hostService, environmentService) {
        super();
        this.hostService = hostService;
        this.environmentService = environmentService;
        this.enableWindowFocusOnElementFocus(targetWindow);
        this.enableMultiWindowAwareTimeout(targetWindow, dom);
        this.registerFullScreenListeners(targetWindow.vscodeWindowId);
    }
    //#region focus handling in multi-window applications
    enableWindowFocusOnElementFocus(targetWindow) {
        const originalFocus = targetWindow.HTMLElement.prototype.focus;
        const that = this;
        targetWindow.HTMLElement.prototype.focus = function (options) {
            // Ensure the window the element belongs to is focused
            // in scenarios where auxiliary windows are present
            that.onElementFocus(getWindow(this));
            // Pass to original focus() method
            originalFocus.apply(this, [options]);
        };
    }
    onElementFocus(targetWindow) {
        const activeWindow = getActiveWindow();
        if (activeWindow !== targetWindow && activeWindow.document.hasFocus()) {
            // Call original focus()
            targetWindow.focus();
            // In Electron, `window.focus()` fails to bring the window
            // to the front if multiple windows exist in the same process
            // group (floating windows). As such, we ask the host service
            // to focus the window which can take care of bringin the
            // window to the front.
            //
            // To minimise disruption by bringing windows to the front
            // by accident, we only do this if the window is not already
            // focused and the active window is not the target window
            // but has focus. This is an indication that multiple windows
            // are opened in the same process group while the target window
            // is not focused.
            if (!this.environmentService.extensionTestsLocationURI && !targetWindow.document.hasFocus()) {
                this.hostService.focus(targetWindow);
            }
        }
    }
    //#endregion
    //#region timeout handling in multi-window applications
    enableMultiWindowAwareTimeout(targetWindow, dom = { getWindowsCount, getWindows }) {
        // Override `setTimeout` and `clearTimeout` on the provided window to make
        // sure timeouts are dispatched to all opened windows. Some browsers may decide
        // to throttle timeouts in minimized windows, so with this we can ensure the
        // timeout is scheduled without being throttled (unless all windows are minimized).
        const originalSetTimeout = targetWindow.setTimeout;
        Object.defineProperty(targetWindow, 'vscodeOriginalSetTimeout', {
            get: () => originalSetTimeout,
        });
        const originalClearTimeout = targetWindow.clearTimeout;
        Object.defineProperty(targetWindow, 'vscodeOriginalClearTimeout', {
            get: () => originalClearTimeout,
        });
        targetWindow.setTimeout = function (handler, timeout = 0, ...args) {
            if (dom.getWindowsCount() === 1 ||
                typeof handler === 'string' ||
                timeout === 0 /* immediates are never throttled */) {
                return originalSetTimeout.apply(this, [handler, timeout, ...args]);
            }
            const timeoutDisposables = new Set();
            const timeoutHandle = BaseWindow_1.TIMEOUT_HANDLES++;
            BaseWindow_1.TIMEOUT_DISPOSABLES.set(timeoutHandle, timeoutDisposables);
            const handlerFn = createSingleCallFunction(handler, () => {
                dispose(timeoutDisposables);
                BaseWindow_1.TIMEOUT_DISPOSABLES.delete(timeoutHandle);
            });
            for (const { window, disposables } of dom.getWindows()) {
                if (isAuxiliaryWindow(window) && window.document.visibilityState === 'hidden') {
                    continue; // skip over hidden windows (but never over main window)
                }
                // we track didClear in case the browser does not properly clear the timeout
                // this can happen for timeouts on unfocused windows
                let didClear = false;
                const handle = window.vscodeOriginalSetTimeout.apply(this, [
                    (...args) => {
                        if (didClear) {
                            return;
                        }
                        handlerFn(...args);
                    },
                    timeout,
                    ...args,
                ]);
                const timeoutDisposable = toDisposable(() => {
                    didClear = true;
                    window.vscodeOriginalClearTimeout(handle);
                    timeoutDisposables.delete(timeoutDisposable);
                });
                disposables.add(timeoutDisposable);
                timeoutDisposables.add(timeoutDisposable);
            }
            return timeoutHandle;
        };
        targetWindow.clearTimeout = function (timeoutHandle) {
            const timeoutDisposables = typeof timeoutHandle === 'number'
                ? BaseWindow_1.TIMEOUT_DISPOSABLES.get(timeoutHandle)
                : undefined;
            if (timeoutDisposables) {
                dispose(timeoutDisposables);
                BaseWindow_1.TIMEOUT_DISPOSABLES.delete(timeoutHandle);
            }
            else {
                originalClearTimeout.apply(this, [timeoutHandle]);
            }
        };
    }
    //#endregion
    registerFullScreenListeners(targetWindowId) {
        this._register(this.hostService.onDidChangeFullScreen(({ windowId, fullscreen }) => {
            if (windowId === targetWindowId) {
                const targetWindow = getWindowById(targetWindowId);
                if (targetWindow) {
                    setFullscreen(fullscreen, targetWindow.window);
                }
            }
        }));
    }
    //#region Confirm on Shutdown
    static async confirmOnShutdown(accessor, reason) {
        const dialogService = accessor.get(IDialogService);
        const configurationService = accessor.get(IConfigurationService);
        const message = reason === 2 /* ShutdownReason.QUIT */
            ? isMacintosh
                ? localize('quitMessageMac', 'Are you sure you want to quit?')
                : localize('quitMessage', 'Are you sure you want to exit?')
            : localize('closeWindowMessage', 'Are you sure you want to close the window?');
        const primaryButton = reason === 2 /* ShutdownReason.QUIT */
            ? isMacintosh
                ? localize({ key: 'quitButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Quit')
                : localize({ key: 'exitButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Exit')
            : localize({ key: 'closeWindowButtonLabel', comment: ['&& denotes a mnemonic'] }, '&&Close Window');
        const res = await dialogService.confirm({
            message,
            primaryButton,
            checkbox: {
                label: localize('doNotAskAgain', 'Do not ask me again'),
            },
        });
        // Update setting if checkbox checked
        if (res.confirmed && res.checkboxChecked) {
            await configurationService.updateValue('window.confirmBeforeClose', 'never');
        }
        return res.confirmed;
    }
};
BaseWindow = BaseWindow_1 = __decorate([
    __param(2, IHostService),
    __param(3, IWorkbenchEnvironmentService)
], BaseWindow);
export { BaseWindow };
let BrowserWindow = class BrowserWindow extends BaseWindow {
    constructor(openerService, lifecycleService, dialogService, labelService, productService, browserEnvironmentService, layoutService, instantiationService, hostService) {
        super(mainWindow, undefined, hostService, browserEnvironmentService);
        this.openerService = openerService;
        this.lifecycleService = lifecycleService;
        this.dialogService = dialogService;
        this.labelService = labelService;
        this.productService = productService;
        this.browserEnvironmentService = browserEnvironmentService;
        this.layoutService = layoutService;
        this.instantiationService = instantiationService;
        this.registerListeners();
        this.create();
    }
    registerListeners() {
        // Lifecycle
        this._register(this.lifecycleService.onWillShutdown(() => this.onWillShutdown()));
        // Layout
        const viewport = isIOS && mainWindow.visualViewport
            ? mainWindow.visualViewport /** Visual viewport */
            : mainWindow; /** Layout viewport */
        this._register(addDisposableListener(viewport, EventType.RESIZE, () => {
            this.layoutService.layout();
            // Sometimes the keyboard appearing scrolls the whole workbench out of view, as a workaround scroll back into view #121206
            if (isIOS) {
                mainWindow.scrollTo(0, 0);
            }
        }));
        // Prevent the back/forward gestures in macOS
        this._register(addDisposableListener(this.layoutService.mainContainer, EventType.WHEEL, (e) => e.preventDefault(), { passive: false }));
        // Prevent native context menus in web
        this._register(addDisposableListener(this.layoutService.mainContainer, EventType.CONTEXT_MENU, (e) => EventHelper.stop(e, true)));
        // Prevent default navigation on drop
        this._register(addDisposableListener(this.layoutService.mainContainer, EventType.DROP, (e) => EventHelper.stop(e, true)));
    }
    onWillShutdown() {
        // Try to detect some user interaction with the workbench
        // when shutdown has happened to not show the dialog e.g.
        // when navigation takes a longer time.
        Event.toPromise(Event.any(Event.once(new DomEmitter(mainWindow.document.body, EventType.KEY_DOWN, true).event), Event.once(new DomEmitter(mainWindow.document.body, EventType.MOUSE_DOWN, true).event))).then(async () => {
            // Delay the dialog in case the user interacted
            // with the page before it transitioned away
            await timeout(3000);
            // This should normally not happen, but if for some reason
            // the workbench was shutdown while the page is still there,
            // inform the user that only a reload can bring back a working
            // state.
            await this.dialogService.prompt({
                type: Severity.Error,
                message: localize('shutdownError', 'An unexpected error occurred that requires a reload of this page.'),
                detail: localize('shutdownErrorDetail', 'The workbench was unexpectedly disposed while running.'),
                buttons: [
                    {
                        label: localize({ key: 'reload', comment: ['&& denotes a mnemonic'] }, '&&Reload'),
                        run: () => mainWindow.location.reload(), // do not use any services at this point since they are likely not functional at this point
                    },
                ],
            });
        });
    }
    create() {
        // Handle open calls
        this.setupOpenHandlers();
        // Label formatting
        this.registerLabelFormatters();
        // Commands
        this.registerCommands();
        // Smoke Test Driver
        this.setupDriver();
    }
    setupDriver() {
        if (this.environmentService.enableSmokeTestDriver) {
            registerWindowDriver(this.instantiationService);
        }
    }
    setupOpenHandlers() {
        // We need to ignore the `beforeunload` event while
        // we handle external links to open specifically for
        // the case of application protocols that e.g. invoke
        // vscode itself. We do not want to open these links
        // in a new window because that would leave a blank
        // window to the user, but using `window.location.href`
        // will trigger the `beforeunload`.
        this.openerService.setDefaultExternalOpener({
            openExternal: async (href) => {
                let isAllowedOpener = false;
                if (this.browserEnvironmentService.options?.openerAllowedExternalUrlPrefixes) {
                    for (const trustedPopupPrefix of this.browserEnvironmentService.options
                        .openerAllowedExternalUrlPrefixes) {
                        if (href.startsWith(trustedPopupPrefix)) {
                            isAllowedOpener = true;
                            break;
                        }
                    }
                }
                // HTTP(s): open in new window and deal with potential popup blockers
                if (matchesScheme(href, Schemas.http) || matchesScheme(href, Schemas.https)) {
                    if (isSafari) {
                        const opened = windowOpenWithSuccess(href, !isAllowedOpener);
                        if (!opened) {
                            await this.dialogService.prompt({
                                type: Severity.Warning,
                                message: localize('unableToOpenExternal', "The browser interrupted the opening of a new tab or window. Press 'Open' to open it anyway."),
                                detail: href,
                                buttons: [
                                    {
                                        label: localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Open'),
                                        run: () => (isAllowedOpener ? windowOpenPopup(href) : windowOpenNoOpener(href)),
                                    },
                                    {
                                        label: localize({ key: 'learnMore', comment: ['&& denotes a mnemonic'] }, '&&Learn More'),
                                        run: () => this.openerService.open(URI.parse('https://aka.ms/allow-vscode-popup')),
                                    },
                                ],
                                cancelButton: true,
                            });
                        }
                    }
                    else {
                        isAllowedOpener ? windowOpenPopup(href) : windowOpenNoOpener(href);
                    }
                }
                // Anything else: set location to trigger protocol handler in the browser
                // but make sure to signal this as an expected unload and disable unload
                // handling explicitly to prevent the workbench from going down.
                else {
                    const invokeProtocolHandler = () => {
                        this.lifecycleService.withExpectedShutdown({ disableShutdownHandling: true }, () => (mainWindow.location.href = href));
                    };
                    invokeProtocolHandler();
                    const showProtocolUrlOpenedDialog = async () => {
                        const { downloadUrl } = this.productService;
                        let detail;
                        const buttons = [
                            {
                                label: localize({ key: 'openExternalDialogButtonRetry.v2', comment: ['&& denotes a mnemonic'] }, '&&Try Again'),
                                run: () => invokeProtocolHandler(),
                            },
                        ];
                        if (downloadUrl !== undefined) {
                            detail = localize('openExternalDialogDetail.v2', 'We launched {0} on your computer.\n\nIf {1} did not launch, try again or install it below.', this.productService.nameLong, this.productService.nameLong);
                            buttons.push({
                                label: localize({ key: 'openExternalDialogButtonInstall.v3', comment: ['&& denotes a mnemonic'] }, '&&Install'),
                                run: async () => {
                                    await this.openerService.open(URI.parse(downloadUrl));
                                    // Re-show the dialog so that the user can come back after installing and try again
                                    showProtocolUrlOpenedDialog();
                                },
                            });
                        }
                        else {
                            detail = localize('openExternalDialogDetailNoInstall', 'We launched {0} on your computer.\n\nIf {1} did not launch, try again below.', this.productService.nameLong, this.productService.nameLong);
                        }
                        // While this dialog shows, closing the tab will not display a confirmation dialog
                        // to avoid showing the user two dialogs at once
                        await this.hostService.withExpectedShutdown(() => this.dialogService.prompt({
                            type: Severity.Info,
                            message: localize('openExternalDialogTitle', 'All done. You can close this tab now.'),
                            detail,
                            buttons,
                            cancelButton: true,
                        }));
                    };
                    // We cannot know whether the protocol handler succeeded.
                    // Display guidance in case it did not, e.g. the app is not installed locally.
                    if (matchesScheme(href, this.productService.urlProtocol)) {
                        await showProtocolUrlOpenedDialog();
                    }
                }
                return true;
            },
        });
    }
    registerLabelFormatters() {
        this._register(this.labelService.registerFormatter({
            scheme: Schemas.vscodeUserData,
            priority: true,
            formatting: {
                label: '(Settings) ${path}',
                separator: '/',
            },
        }));
    }
    registerCommands() {
        // Allow extensions to request USB devices in Web
        CommandsRegistry.registerCommand('workbench.experimental.requestUsbDevice', async (_accessor, options) => {
            return requestUsbDevice(options);
        });
        // Allow extensions to request Serial devices in Web
        CommandsRegistry.registerCommand('workbench.experimental.requestSerialPort', async (_accessor, options) => {
            return requestSerialPort(options);
        });
        // Allow extensions to request HID devices in Web
        CommandsRegistry.registerCommand('workbench.experimental.requestHidDevice', async (_accessor, options) => {
            return requestHidDevice(options);
        });
    }
};
BrowserWindow = __decorate([
    __param(0, IOpenerService),
    __param(1, ILifecycleService),
    __param(2, IDialogService),
    __param(3, ILabelService),
    __param(4, IProductService),
    __param(5, IBrowserWorkbenchEnvironmentService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IInstantiationService),
    __param(8, IHostService)
], BrowserWindow);
export { BrowserWindow };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvd2luZG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsV0FBVyxFQUNYLFNBQVMsRUFDVCxlQUFlLEVBQ2YsU0FBUyxFQUNULGFBQWEsRUFDYixVQUFVLEVBQ1YsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3hELE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLGdCQUFnQixHQUdoQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBZSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2xFLE9BQU8sUUFBUSxNQUFNLCtCQUErQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxnQkFBZ0Is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