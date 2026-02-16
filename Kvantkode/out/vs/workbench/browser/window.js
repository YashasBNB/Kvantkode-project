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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkUsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixXQUFXLEVBQ1gsU0FBUyxFQUNULGVBQWUsRUFDZixTQUFTLEVBQ1QsYUFBYSxFQUNiLFVBQVUsRUFDVixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDeEQsT0FBTyxFQUVOLGdCQUFnQixFQUNoQixpQkFBaUIsRUFDakIsZ0JBQWdCLEdBR2hCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbEUsT0FBTyxRQUFRLE1BQU0sK0JBQStCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUE7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