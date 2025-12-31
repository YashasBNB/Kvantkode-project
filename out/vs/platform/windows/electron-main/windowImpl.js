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
import electron from 'electron';
import { DeferredPromise, RunOnceScheduler, timeout, Delayer } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { getMarks, mark } from '../../../base/common/performance.js';
import { isBigSurOrNewer, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { release } from 'os';
import { IBackupMainService } from '../../backup/electron-main/backup.js';
import { IConfigurationService, } from '../../configuration/common/configuration.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { isLaunchedFromCli } from '../../environment/node/argvHelper.js';
import { IFileService } from '../../files/common/files.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { resolveMarketplaceHeaders } from '../../externalServices/common/marketplace.js';
import { IApplicationStorageMainService, IStorageMainService, } from '../../storage/electron-main/storageMainService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { getMenuBarVisibility, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, DEFAULT_CUSTOM_TITLEBAR_HEIGHT, } from '../../window/common/window.js';
import { defaultBrowserWindowOptions, getAllWindowsExcludingOffscreen, IWindowsMainService, WindowStateValidator, } from './windows.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, toWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { defaultWindowState, } from '../../window/electron-main/window.js';
import { IPolicyService } from '../../policy/common/policy.js';
import { IStateService } from '../../state/node/state.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { ILoggerMainService } from '../../log/electron-main/loggerService.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { errorHandler } from '../../../base/common/errors.js';
var ReadyState;
(function (ReadyState) {
    /**
     * This window has not loaded anything yet
     * and this is the initial state of every
     * window.
     */
    ReadyState[ReadyState["NONE"] = 0] = "NONE";
    /**
     * This window is navigating, either for the
     * first time or subsequent times.
     */
    ReadyState[ReadyState["NAVIGATING"] = 1] = "NAVIGATING";
    /**
     * This window has finished loading and is ready
     * to forward IPC requests to the web contents.
     */
    ReadyState[ReadyState["READY"] = 2] = "READY";
})(ReadyState || (ReadyState = {}));
export class BaseWindow extends Disposable {
    get lastFocusTime() {
        return this._lastFocusTime;
    }
    get win() {
        return this._win;
    }
    setWin(win, options) {
        this._win = win;
        // Window Events
        this._register(Event.fromNodeEventEmitter(win, 'maximize')(() => this._onDidMaximize.fire()));
        this._register(Event.fromNodeEventEmitter(win, 'unmaximize')(() => this._onDidUnmaximize.fire()));
        this._register(Event.fromNodeEventEmitter(win, 'closed')(() => {
            this._onDidClose.fire();
            this.dispose();
        }));
        this._register(Event.fromNodeEventEmitter(win, 'focus')(() => {
            this._lastFocusTime = Date.now();
        }));
        this._register(Event.fromNodeEventEmitter(this._win, 'enter-full-screen')(() => this._onDidEnterFullScreen.fire()));
        this._register(Event.fromNodeEventEmitter(this._win, 'leave-full-screen')(() => this._onDidLeaveFullScreen.fire()));
        // Sheet Offsets
        const useCustomTitleStyle = !hasNativeTitlebar(this.configurationService, options?.titleBarStyle === 'hidden' ? "custom" /* TitlebarStyle.CUSTOM */ : undefined /* unknown */);
        if (isMacintosh && useCustomTitleStyle) {
            win.setSheetOffset(isBigSurOrNewer(release()) ? 28 : 22); // offset dialogs by the height of the custom title bar if we have any
        }
        // Update the window controls immediately based on cached or default values
        if (useCustomTitleStyle && useWindowControlsOverlay(this.configurationService)) {
            const cachedWindowControlHeight = this.stateService.getItem(BaseWindow.windowControlHeightStateStorageKey);
            if (cachedWindowControlHeight) {
                this.updateWindowControls({ height: cachedWindowControlHeight });
            }
            else {
                this.updateWindowControls({ height: DEFAULT_CUSTOM_TITLEBAR_HEIGHT });
            }
        }
        // Windows Custom System Context Menu
        // See https://github.com/electron/electron/issues/24893
        //
        // The purpose of this is to allow for the context menu in the Windows Title Bar
        //
        // Currently, all mouse events in the title bar are captured by the OS
        // thus we need to capture them here with a window hook specific to Windows
        // and then forward them to the correct window.
        if (isWindows && useCustomTitleStyle) {
            const WM_INITMENU = 0x0116; // https://docs.microsoft.com/en-us/windows/win32/menurc/wm-initmenu
            // This sets up a listener for the window hook. This is a Windows-only API provided by electron.
            win.hookWindowMessage(WM_INITMENU, () => {
                const [x, y] = win.getPosition();
                const cursorPos = electron.screen.getCursorScreenPoint();
                const cx = cursorPos.x - x;
                const cy = cursorPos.y - y;
                // In some cases, show the default system context menu
                // 1) The mouse position is not within the title bar
                // 2) The mouse position is within the title bar, but over the app icon
                // We do not know the exact title bar height but we make an estimate based on window height
                const shouldTriggerDefaultSystemContextMenu = () => {
                    // Use the custom context menu when over the title bar, but not over the app icon
                    // The app icon is estimated to be 30px wide
                    // The title bar is estimated to be the max of 35px and 15% of the window height
                    if (cx > 30 && cy >= 0 && cy <= Math.max(win.getBounds().height * 0.15, 35)) {
                        return false;
                    }
                    return true;
                };
                if (!shouldTriggerDefaultSystemContextMenu()) {
                    // This is necessary to make sure the native system context menu does not show up.
                    win.setEnabled(false);
                    win.setEnabled(true);
                    this._onDidTriggerSystemContextMenu.fire({ x: cx, y: cy });
                }
                return 0;
            });
        }
        // Open devtools if instructed from command line args
        if (this.environmentMainService.args['open-devtools'] === true) {
            win.webContents.openDevTools();
        }
        // macOS: Window Fullscreen Transitions
        if (isMacintosh) {
            this._register(this.onDidEnterFullScreen(() => {
                this.joinNativeFullScreenTransition?.complete(true);
            }));
            this._register(this.onDidLeaveFullScreen(() => {
                this.joinNativeFullScreenTransition?.complete(true);
            }));
        }
    }
    constructor(configurationService, stateService, environmentMainService, logService) {
        super();
        this.configurationService = configurationService;
        this.stateService = stateService;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        //#region Events
        this._onDidClose = this._register(new Emitter());
        this.onDidClose = this._onDidClose.event;
        this._onDidMaximize = this._register(new Emitter());
        this.onDidMaximize = this._onDidMaximize.event;
        this._onDidUnmaximize = this._register(new Emitter());
        this.onDidUnmaximize = this._onDidUnmaximize.event;
        this._onDidTriggerSystemContextMenu = this._register(new Emitter());
        this.onDidTriggerSystemContextMenu = this._onDidTriggerSystemContextMenu.event;
        this._onDidEnterFullScreen = this._register(new Emitter());
        this.onDidEnterFullScreen = this._onDidEnterFullScreen.event;
        this._onDidLeaveFullScreen = this._register(new Emitter());
        this.onDidLeaveFullScreen = this._onDidLeaveFullScreen.event;
        this._lastFocusTime = Date.now(); // window is shown on creation so take current time
        this._win = null;
        //#endregion
        //#region Fullscreen
        this.transientIsNativeFullScreen = undefined;
        this.joinNativeFullScreenTransition = undefined;
    }
    applyState(state, hasMultipleDisplays = electron.screen.getAllDisplays().length > 0) {
        // TODO@electron (Electron 4 regression): when running on multiple displays where the target display
        // to open the window has a larger resolution than the primary display, the window will not size
        // correctly unless we set the bounds again (https://github.com/microsoft/vscode/issues/74872)
        //
        // Extended to cover Windows as well as Mac (https://github.com/microsoft/vscode/issues/146499)
        //
        // However, when running with native tabs with multiple windows we cannot use this workaround
        // because there is a potential that the new window will be added as native tab instead of being
        // a window on its own. In that case calling setBounds() would cause https://github.com/microsoft/vscode/issues/75830
        const windowSettings = this.configurationService.getValue('window');
        const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
        if ((isMacintosh || isWindows) &&
            hasMultipleDisplays &&
            (!useNativeTabs || getAllWindowsExcludingOffscreen().length === 1)) {
            if ([state.width, state.height, state.x, state.y].every((value) => typeof value === 'number')) {
                this._win?.setBounds({
                    width: state.width,
                    height: state.height,
                    x: state.x,
                    y: state.y,
                });
            }
        }
        if (state.mode === 0 /* WindowMode.Maximized */ || state.mode === 3 /* WindowMode.Fullscreen */) {
            // this call may or may not show the window, depends
            // on the platform: currently on Windows and Linux will
            // show the window as active. To be on the safe side,
            // we show the window at the end of this block.
            this._win?.maximize();
            if (state.mode === 3 /* WindowMode.Fullscreen */) {
                this.setFullScreen(true, true);
            }
            // to reduce flicker from the default window size
            // to maximize or fullscreen, we only show after
            this._win?.show();
        }
    }
    setRepresentedFilename(filename) {
        if (isMacintosh) {
            this.win?.setRepresentedFilename(filename);
        }
        else {
            this.representedFilename = filename;
        }
    }
    getRepresentedFilename() {
        if (isMacintosh) {
            return this.win?.getRepresentedFilename();
        }
        return this.representedFilename;
    }
    setDocumentEdited(edited) {
        if (isMacintosh) {
            this.win?.setDocumentEdited(edited);
        }
        this.documentEdited = edited;
    }
    isDocumentEdited() {
        if (isMacintosh) {
            return Boolean(this.win?.isDocumentEdited());
        }
        return !!this.documentEdited;
    }
    focus(options) {
        if (isMacintosh && options?.force) {
            electron.app.focus({ steal: true });
        }
        const win = this.win;
        if (!win) {
            return;
        }
        if (win.isMinimized()) {
            win.restore();
        }
        win.focus();
    }
    //#region Window Control Overlays
    static { this.windowControlHeightStateStorageKey = 'windowControlHeight'; }
    updateWindowControls(options) {
        const win = this.win;
        if (!win) {
            return;
        }
        // Cache the height for speeds lookups on startup
        if (options.height) {
            this.stateService.setItem(CodeWindow.windowControlHeightStateStorageKey, options.height);
        }
        // Windows/Linux: update window controls via setTitleBarOverlay()
        if (!isMacintosh && useWindowControlsOverlay(this.configurationService)) {
            win.setTitleBarOverlay({
                color: options.backgroundColor?.trim() === '' ? undefined : options.backgroundColor,
                symbolColor: options.foregroundColor?.trim() === '' ? undefined : options.foregroundColor,
                height: options.height ? options.height - 1 : undefined, // account for window border
            });
        }
        // macOS: update window controls via setWindowButtonPosition()
        else if (isMacintosh && options.height !== undefined) {
            // The traffic lights have a height of 12px. There's an invisible margin
            // of 2px at the top and bottom, and 1px on the left and right. Therefore,
            // the height for centering is 12px + 2 * 2px = 16px. When the position
            // is set, the horizontal margin is offset to ensure the distance between
            // the traffic lights and the window frame is equal in both directions.
            const offset = Math.floor((options.height - 16) / 2);
            if (!offset) {
                win.setWindowButtonPosition(null);
            }
            else {
                win.setWindowButtonPosition({ x: offset + 1, y: offset });
            }
        }
    }
    toggleFullScreen() {
        this.setFullScreen(!this.isFullScreen, false);
    }
    setFullScreen(fullscreen, fromRestore) {
        // Set fullscreen state
        if (useNativeFullScreen(this.configurationService)) {
            this.setNativeFullScreen(fullscreen, fromRestore);
        }
        else {
            this.setSimpleFullScreen(fullscreen);
        }
    }
    get isFullScreen() {
        if (isMacintosh && typeof this.transientIsNativeFullScreen === 'boolean') {
            return this.transientIsNativeFullScreen;
        }
        const win = this.win;
        const isFullScreen = win?.isFullScreen();
        const isSimpleFullScreen = win?.isSimpleFullScreen();
        return Boolean(isFullScreen || isSimpleFullScreen);
    }
    setNativeFullScreen(fullscreen, fromRestore) {
        const win = this.win;
        if (win?.isSimpleFullScreen()) {
            win?.setSimpleFullScreen(false);
        }
        this.doSetNativeFullScreen(fullscreen, fromRestore);
    }
    doSetNativeFullScreen(fullscreen, fromRestore) {
        if (isMacintosh) {
            // macOS: Electron windows report `false` for `isFullScreen()` for as long
            // as the fullscreen transition animation takes place. As such, we need to
            // listen to the transition events and carry around an intermediate state
            // for knowing if we are in fullscreen or not
            // Refs: https://github.com/electron/electron/issues/35360
            this.transientIsNativeFullScreen = fullscreen;
            const joinNativeFullScreenTransition = (this.joinNativeFullScreenTransition =
                new DeferredPromise());
            (async () => {
                const transitioned = await Promise.race([
                    joinNativeFullScreenTransition.p,
                    timeout(10000).then(() => false),
                ]);
                if (this.joinNativeFullScreenTransition !== joinNativeFullScreenTransition) {
                    return; // another transition was requested later
                }
                this.transientIsNativeFullScreen = undefined;
                this.joinNativeFullScreenTransition = undefined;
                // There is one interesting gotcha on macOS: when you are opening a new
                // window from a fullscreen window, that new window will immediately
                // open fullscreen and emit the `enter-full-screen` event even before we
                // reach this method. In that case, we actually will timeout after 10s
                // for detecting the transition and as such it is important that we only
                // signal to leave fullscreen if the window reports as not being in fullscreen.
                if (!transitioned && fullscreen && fromRestore && this.win && !this.win.isFullScreen()) {
                    // We have seen requests for fullscreen failing eventually after some
                    // time, for example when an OS update was performed and windows restore.
                    // In those cases a user would find a window that is not in fullscreen
                    // but also does not show any custom titlebar (and thus window controls)
                    // because we think the window is in fullscreen.
                    //
                    // As a workaround in that case we emit a warning and leave fullscreen
                    // so that at least the window controls are back.
                    this.logService.warn('window: native macOS fullscreen transition did not happen within 10s from restoring');
                    this._onDidLeaveFullScreen.fire();
                }
            })();
        }
        const win = this.win;
        win?.setFullScreen(fullscreen);
    }
    setSimpleFullScreen(fullscreen) {
        const win = this.win;
        if (win?.isFullScreen()) {
            this.doSetNativeFullScreen(false, false);
        }
        win?.setSimpleFullScreen(fullscreen);
        win?.webContents.focus(); // workaround issue where focus is not going into window
    }
    dispose() {
        super.dispose();
        this._win = null; // Important to dereference the window object to allow for GC
    }
}
let CodeWindow = class CodeWindow extends BaseWindow {
    get id() {
        return this._id;
    }
    get backupPath() {
        return this._config?.backupPath;
    }
    get openedWorkspace() {
        return this._config?.workspace;
    }
    get profile() {
        if (!this.config) {
            return undefined;
        }
        const profile = this.userDataProfilesService.profiles.find((profile) => profile.id === this.config?.profiles.profile.id);
        if (this.isExtensionDevelopmentHost && profile) {
            return profile;
        }
        return (this.userDataProfilesService.getProfileForWorkspace(this.config.workspace ??
            toWorkspaceIdentifier(this.backupPath, this.isExtensionDevelopmentHost)) ?? this.userDataProfilesService.defaultProfile);
    }
    get remoteAuthority() {
        return this._config?.remoteAuthority;
    }
    get config() {
        return this._config;
    }
    get isExtensionDevelopmentHost() {
        return !!this._config?.extensionDevelopmentPath;
    }
    get isExtensionTestHost() {
        return !!this._config?.extensionTestsPath;
    }
    get isExtensionDevelopmentTestFromCli() {
        return this.isExtensionDevelopmentHost && this.isExtensionTestHost && !this._config?.debugId;
    }
    constructor(config, logService, loggerMainService, environmentMainService, policyService, userDataProfilesService, fileService, applicationStorageMainService, storageMainService, configurationService, themeMainService, workspacesManagementMainService, backupMainService, telemetryService, dialogMainService, lifecycleMainService, productService, protocolMainService, windowsMainService, stateService, instantiationService) {
        super(configurationService, stateService, environmentMainService, logService);
        this.loggerMainService = loggerMainService;
        this.policyService = policyService;
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.storageMainService = storageMainService;
        this.themeMainService = themeMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.backupMainService = backupMainService;
        this.telemetryService = telemetryService;
        this.dialogMainService = dialogMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.productService = productService;
        this.windowsMainService = windowsMainService;
        //#region Events
        this._onWillLoad = this._register(new Emitter());
        this.onWillLoad = this._onWillLoad.event;
        this._onDidSignalReady = this._register(new Emitter());
        this.onDidSignalReady = this._onDidSignalReady.event;
        this._onDidDestroy = this._register(new Emitter());
        this.onDidDestroy = this._onDidDestroy.event;
        this.whenReadyCallbacks = [];
        this.touchBarGroups = [];
        this.currentHttpProxy = undefined;
        this.currentNoProxy = undefined;
        this.customZoomLevel = undefined;
        this.wasLoaded = false;
        this.readyState = 0 /* ReadyState.NONE */;
        //#region create browser window
        {
            this.configObjectUrl = this._register(protocolMainService.createIPCObjectUrl());
            // Load window state
            const [state, hasMultipleDisplays] = this.restoreWindowState(config.state);
            this.windowState = state;
            this.logService.trace('window#ctor: using window state', state);
            const options = instantiationService.invokeFunction(defaultBrowserWindowOptions, this.windowState, undefined, {
                preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-sandbox/preload.js').fsPath,
                additionalArguments: [
                    `--vscode-window-config=${this.configObjectUrl.resource.toString()}`,
                ],
                v8CacheOptions: this.environmentMainService.useCodeCache ? 'bypassHeatCheck' : 'none',
            });
            // Create the browser window
            mark('code/willCreateCodeBrowserWindow');
            this._win = new electron.BrowserWindow(options);
            mark('code/didCreateCodeBrowserWindow');
            this._id = this._win.id;
            this.setWin(this._win, options);
            // Apply some state after window creation
            this.applyState(this.windowState, hasMultipleDisplays);
            this._lastFocusTime = Date.now(); // since we show directly, we need to set the last focus time too
        }
        //#endregion
        //#region JS Callstack Collector
        let sampleInterval = parseInt(this.environmentMainService.args['unresponsive-sample-interval'] || '1000');
        let samplePeriod = parseInt(this.environmentMainService.args['unresponsive-sample-period'] || '15000');
        if (sampleInterval <= 0 || samplePeriod <= 0 || sampleInterval > samplePeriod) {
            this.logService.warn(`Invalid unresponsive sample interval (${sampleInterval}ms) or period (${samplePeriod}ms), using defaults.`);
            sampleInterval = 1000;
            samplePeriod = 15000;
        }
        this.jsCallStackMap = new Map();
        this.jsCallStackEffectiveSampleCount = Math.round(sampleInterval / samplePeriod);
        this.jsCallStackCollector = this._register(new Delayer(sampleInterval));
        this.jsCallStackCollectorStopScheduler = this._register(new RunOnceScheduler(() => {
            this.stopCollectingJScallStacks(); // Stop collecting after 15s max
        }, samplePeriod));
        //#endregion
        // respect configured menu bar visibility
        this.onConfigurationUpdated();
        // macOS: touch bar support
        this.createTouchBar();
        // Eventing
        this.registerListeners();
    }
    setReady() {
        this.logService.trace(`window#load: window reported ready (id: ${this._id})`);
        this.readyState = 2 /* ReadyState.READY */;
        // inform all waiting promises that we are ready now
        while (this.whenReadyCallbacks.length) {
            this.whenReadyCallbacks.pop()(this);
        }
        // Events
        this._onDidSignalReady.fire();
    }
    ready() {
        return new Promise((resolve) => {
            if (this.isReady) {
                return resolve(this);
            }
            // otherwise keep and call later when we are ready
            this.whenReadyCallbacks.push(resolve);
        });
    }
    get isReady() {
        return this.readyState === 2 /* ReadyState.READY */;
    }
    get whenClosedOrLoaded() {
        return new Promise((resolve) => {
            function handle() {
                closeListener.dispose();
                loadListener.dispose();
                resolve();
            }
            const closeListener = this.onDidClose(() => handle());
            const loadListener = this.onWillLoad(() => handle());
        });
    }
    registerListeners() {
        // Window error conditions to handle
        this._register(Event.fromNodeEventEmitter(this._win, 'unresponsive')(() => this.onWindowError(1 /* WindowError.UNRESPONSIVE */)));
        this._register(Event.fromNodeEventEmitter(this._win, 'responsive')(() => this.onWindowError(4 /* WindowError.RESPONSIVE */)));
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'render-process-gone', (event, details) => details)((details) => this.onWindowError(2 /* WindowError.PROCESS_GONE */, { ...details })));
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'did-fail-load', (event, exitCode, reason) => ({ exitCode, reason }))(({ exitCode, reason }) => this.onWindowError(3 /* WindowError.LOAD */, { reason, exitCode })));
        // Prevent windows/iframes from blocking the unload
        // through DOM events. We have our own logic for
        // unloading a window that should not be confused
        // with the DOM way.
        // (https://github.com/microsoft/vscode/issues/122736)
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'will-prevent-unload')((event) => event.preventDefault()));
        // Remember that we loaded
        this._register(Event.fromNodeEventEmitter(this._win.webContents, 'did-finish-load')(() => {
            // Associate properties from the load request if provided
            if (this.pendingLoadConfig) {
                this._config = this.pendingLoadConfig;
                this.pendingLoadConfig = undefined;
            }
        }));
        // Window (Un)Maximize
        this._register(this.onDidMaximize(() => {
            if (this._config) {
                this._config.maximized = true;
            }
        }));
        this._register(this.onDidUnmaximize(() => {
            if (this._config) {
                this._config.maximized = false;
            }
        }));
        // Window Fullscreen
        this._register(this.onDidEnterFullScreen(() => {
            this.sendWhenReady('vscode:enterFullScreen', CancellationToken.None);
        }));
        this._register(this.onDidLeaveFullScreen(() => {
            this.sendWhenReady('vscode:leaveFullScreen', CancellationToken.None);
        }));
        // Handle configuration changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
        // Handle Workspace events
        this._register(this.workspacesManagementMainService.onDidDeleteUntitledWorkspace((e) => this.onDidDeleteUntitledWorkspace(e)));
        // Inject headers when requests are incoming
        const urls = ['https://marketplace.visualstudio.com/*', 'https://*.vsassets.io/*'];
        this._win.webContents.session.webRequest.onBeforeSendHeaders({ urls }, async (details, cb) => {
            const headers = await this.getMarketplaceHeaders();
            cb({ cancel: false, requestHeaders: Object.assign(details.requestHeaders, headers) });
        });
    }
    getMarketplaceHeaders() {
        if (!this.marketplaceHeadersPromise) {
            this.marketplaceHeadersPromise = resolveMarketplaceHeaders(this.productService.version, this.productService, this.environmentMainService, this.configurationService, this.fileService, this.applicationStorageMainService, this.telemetryService);
        }
        return this.marketplaceHeadersPromise;
    }
    async onWindowError(type, details) {
        switch (type) {
            case 2 /* WindowError.PROCESS_GONE */:
                this.logService.error(`CodeWindow: renderer process gone (reason: ${details?.reason || '<unknown>'}, code: ${details?.exitCode || '<unknown>'})`);
                break;
            case 1 /* WindowError.UNRESPONSIVE */:
                this.logService.error('CodeWindow: detected unresponsive');
                break;
            case 4 /* WindowError.RESPONSIVE */:
                this.logService.error('CodeWindow: recovered from unresponsive');
                break;
            case 3 /* WindowError.LOAD */:
                this.logService.error(`CodeWindow: failed to load (reason: ${details?.reason || '<unknown>'}, code: ${details?.exitCode || '<unknown>'})`);
                break;
        }
        this.telemetryService.publicLog2('windowerror', {
            type,
            reason: details?.reason,
            code: details?.exitCode,
        });
        // Inform User if non-recoverable
        switch (type) {
            case 1 /* WindowError.UNRESPONSIVE */:
            case 2 /* WindowError.PROCESS_GONE */:
                // If we run extension tests from CLI, we want to signal
                // back this state to the test runner by exiting with a
                // non-zero exit code.
                if (this.isExtensionDevelopmentTestFromCli) {
                    this.lifecycleMainService.kill(1);
                    return;
                }
                // If we run smoke tests, want to proceed with an orderly
                // shutdown as much as possible by destroying the window
                // and then calling the normal `quit` routine.
                if (this.environmentMainService.args['enable-smoke-test-driver']) {
                    await this.destroyWindow(false, false);
                    this.lifecycleMainService.quit(); // still allow for an orderly shutdown
                    return;
                }
                // Unresponsive
                if (type === 1 /* WindowError.UNRESPONSIVE */) {
                    if (this.isExtensionDevelopmentHost ||
                        this.isExtensionTestHost ||
                        (this._win && this._win.webContents && this._win.webContents.isDevToolsOpened())) {
                        // TODO@electron Workaround for https://github.com/microsoft/vscode/issues/56994
                        // In certain cases the window can report unresponsiveness because a breakpoint was hit
                        // and the process is stopped executing. The most typical cases are:
                        // - devtools are opened and debugging happens
                        // - window is an extensions development host that is being debugged
                        // - window is an extension test development host that is being debugged
                        return;
                    }
                    // Interrupt V8 and collect JavaScript stack
                    this.jsCallStackCollector.trigger(() => this.startCollectingJScallStacks());
                    // Stack collection will stop under any of the following conditions:
                    // - The window becomes responsive again
                    // - The window is destroyed i-e reopen or closed
                    // - sampling period is complete, default is 15s
                    this.jsCallStackCollectorStopScheduler.schedule();
                    // Show Dialog
                    const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
                        type: 'warning',
                        buttons: [
                            localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, '&&Reopen'),
                            localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, '&&Close'),
                            localize({ key: 'wait', comment: ['&& denotes a mnemonic'] }, '&&Keep Waiting'),
                        ],
                        message: localize('appStalled', 'The window is not responding'),
                        detail: localize('appStalledDetail', 'You can reopen or close the window or keep waiting.'),
                        checkboxLabel: this._config?.workspace
                            ? localize('doNotRestoreEditors', "Don't restore editors")
                            : undefined,
                    }, this._win);
                    // Handle choice
                    if (response !== 2 /* keep waiting */) {
                        const reopen = response === 0;
                        this.stopCollectingJScallStacks();
                        await this.destroyWindow(reopen, checkboxChecked);
                    }
                }
                // Process gone
                else if (type === 2 /* WindowError.PROCESS_GONE */) {
                    let message;
                    if (!details) {
                        message = localize('appGone', 'The window terminated unexpectedly');
                    }
                    else {
                        message = localize('appGoneDetails', "The window terminated unexpectedly (reason: '{0}', code: '{1}')", details.reason, details.exitCode ?? '<unknown>');
                    }
                    // Show Dialog
                    const { response, checkboxChecked } = await this.dialogMainService.showMessageBox({
                        type: 'warning',
                        buttons: [
                            this._config?.workspace
                                ? localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, '&&Reopen')
                                : localize({ key: 'newWindow', comment: ['&& denotes a mnemonic'] }, '&&New Window'),
                            localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, '&&Close'),
                        ],
                        message,
                        detail: this._config?.workspace
                            ? localize('appGoneDetailWorkspace', 'We are sorry for the inconvenience. You can reopen the window to continue where you left off.')
                            : localize('appGoneDetailEmptyWindow', 'We are sorry for the inconvenience. You can open a new empty window to start again.'),
                        checkboxLabel: this._config?.workspace
                            ? localize('doNotRestoreEditors', "Don't restore editors")
                            : undefined,
                    }, this._win);
                    // Handle choice
                    const reopen = response === 0;
                    await this.destroyWindow(reopen, checkboxChecked);
                }
                break;
            case 4 /* WindowError.RESPONSIVE */:
                this.stopCollectingJScallStacks();
                break;
        }
    }
    async destroyWindow(reopen, skipRestoreEditors) {
        const workspace = this._config?.workspace;
        // check to discard editor state first
        if (skipRestoreEditors && workspace) {
            try {
                const workspaceStorage = this.storageMainService.workspaceStorage(workspace);
                await workspaceStorage.init();
                workspaceStorage.delete('memento/workbench.parts.editor');
                await workspaceStorage.close();
            }
            catch (error) {
                this.logService.error(error);
            }
        }
        // 'close' event will not be fired on destroy(), so signal crash via explicit event
        this._onDidDestroy.fire();
        try {
            // ask the windows service to open a new fresh window if specified
            if (reopen && this._config) {
                // We have to reconstruct a openable from the current workspace
                let uriToOpen = undefined;
                let forceEmpty = undefined;
                if (isSingleFolderWorkspaceIdentifier(workspace)) {
                    uriToOpen = { folderUri: workspace.uri };
                }
                else if (isWorkspaceIdentifier(workspace)) {
                    uriToOpen = { workspaceUri: workspace.configPath };
                }
                else {
                    forceEmpty = true;
                }
                // Delegate to windows service
                const window = (await this.windowsMainService.open({
                    context: 5 /* OpenContext.API */,
                    userEnv: this._config.userEnv,
                    cli: {
                        ...this.environmentMainService.args,
                        _: [], // we pass in the workspace to open explicitly via `urisToOpen`
                    },
                    urisToOpen: uriToOpen ? [uriToOpen] : undefined,
                    forceEmpty,
                    forceNewWindow: true,
                    remoteAuthority: this.remoteAuthority,
                })).at(0);
                window?.focus();
            }
        }
        finally {
            // make sure to destroy the window as its renderer process is gone. do this
            // after the code for reopening the window, to prevent the entire application
            // from quitting when the last window closes as a result.
            this._win?.destroy();
        }
    }
    onDidDeleteUntitledWorkspace(workspace) {
        // Make sure to update our workspace config if we detect that it
        // was deleted
        if (this._config?.workspace?.id === workspace.id) {
            this._config.workspace = undefined;
        }
    }
    onConfigurationUpdated(e) {
        // Menubar
        if (!e || e.affectsConfiguration('window.menuBarVisibility')) {
            const newMenuBarVisibility = this.getMenuBarVisibility();
            if (newMenuBarVisibility !== this.currentMenuBarVisibility) {
                this.currentMenuBarVisibility = newMenuBarVisibility;
                this.setMenuBarVisibility(newMenuBarVisibility);
            }
        }
        // Proxy
        if (!e || e.affectsConfiguration('http.proxy') || e.affectsConfiguration('http.noProxy')) {
            const inspect = this.configurationService.inspect('http.proxy');
            let newHttpProxy = (inspect.userLocalValue || '').trim() ||
                (process.env['https_proxy'] ||
                    process.env['HTTPS_PROXY'] ||
                    process.env['http_proxy'] ||
                    process.env['HTTP_PROXY'] ||
                    '').trim() || // Not standardized.
                undefined;
            if (newHttpProxy?.indexOf('@') !== -1) {
                const uri = URI.parse(newHttpProxy);
                const i = uri.authority.indexOf('@');
                if (i !== -1) {
                    newHttpProxy = uri.with({ authority: uri.authority.substring(i + 1) }).toString();
                }
            }
            if (newHttpProxy?.endsWith('/')) {
                newHttpProxy = newHttpProxy.substr(0, newHttpProxy.length - 1);
            }
            const newNoProxy = (this.configurationService.getValue('http.noProxy') || [])
                .map((item) => item.trim())
                .join(',') ||
                (process.env['no_proxy'] || process.env['NO_PROXY'] || '').trim() ||
                undefined; // Not standardized.
            if ((newHttpProxy || '').indexOf('@') === -1 &&
                (newHttpProxy !== this.currentHttpProxy || newNoProxy !== this.currentNoProxy)) {
                this.currentHttpProxy = newHttpProxy;
                this.currentNoProxy = newNoProxy;
                const proxyRules = newHttpProxy || '';
                const proxyBypassRules = newNoProxy ? `${newNoProxy},<local>` : '<local>';
                this.logService.trace(`Setting proxy to '${proxyRules}', bypassing '${proxyBypassRules}'`);
                this._win.webContents.session.setProxy({ proxyRules, proxyBypassRules, pacScript: '' });
                electron.app.setProxy({ proxyRules, proxyBypassRules, pacScript: '' });
            }
        }
    }
    addTabbedWindow(window) {
        if (isMacintosh && window.win) {
            this._win.addTabbedWindow(window.win);
        }
    }
    load(configuration, options = Object.create(null)) {
        this.logService.trace(`window#load: attempt to load window (id: ${this._id})`);
        // Clear Document Edited if needed
        if (this.isDocumentEdited()) {
            if (!options.isReload || !this.backupMainService.isHotExitEnabled()) {
                this.setDocumentEdited(false);
            }
        }
        // Clear Title and Filename if needed
        if (!options.isReload) {
            if (this.getRepresentedFilename()) {
                this.setRepresentedFilename('');
            }
            this._win.setTitle(this.productService.nameLong);
        }
        // Update configuration values based on our window context
        // and set it into the config object URL for usage.
        this.updateConfiguration(configuration, options);
        // If this is the first time the window is loaded, we associate the paths
        // directly with the window because we assume the loading will just work
        if (this.readyState === 0 /* ReadyState.NONE */) {
            this._config = configuration;
        }
        // Otherwise, the window is currently showing a folder and if there is an
        // unload handler preventing the load, we cannot just associate the paths
        // because the loading might be vetoed. Instead we associate it later when
        // the window load event has fired.
        else {
            this.pendingLoadConfig = configuration;
        }
        // Indicate we are navigting now
        this.readyState = 1 /* ReadyState.NAVIGATING */;
        // Load URL
        this._win.loadURL(FileAccess.asBrowserUri(`vs/code/electron-sandbox/workbench/workbench${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true));
        // Remember that we did load
        const wasLoaded = this.wasLoaded;
        this.wasLoaded = true;
        // Make window visible if it did not open in N seconds because this indicates an error
        // Only do this when running out of sources and not when running tests
        if (!this.environmentMainService.isBuilt &&
            !this.environmentMainService.extensionTestsLocationURI) {
            this._register(new RunOnceScheduler(() => {
                if (this._win && !this._win.isVisible() && !this._win.isMinimized()) {
                    this._win.show();
                    this.focus({ force: true });
                    this._win.webContents.openDevTools();
                }
            }, 10000)).schedule();
        }
        // Event
        this._onWillLoad.fire({
            workspace: configuration.workspace,
            reason: options.isReload
                ? 3 /* LoadReason.RELOAD */
                : wasLoaded
                    ? 2 /* LoadReason.LOAD */
                    : 1 /* LoadReason.INITIAL */,
        });
    }
    updateConfiguration(configuration, options) {
        // If this window was loaded before from the command line
        // (as indicated by VSCODE_CLI environment), make sure to
        // preserve that user environment in subsequent loads,
        // unless the new configuration context was also a CLI
        // (for https://github.com/microsoft/vscode/issues/108571)
        // Also, preserve the environment if we're loading from an
        // extension development host that had its environment set
        // (for https://github.com/microsoft/vscode/issues/123508)
        const currentUserEnv = (this._config ?? this.pendingLoadConfig)?.userEnv;
        if (currentUserEnv) {
            const shouldPreserveLaunchCliEnvironment = isLaunchedFromCli(currentUserEnv) && !isLaunchedFromCli(configuration.userEnv);
            const shouldPreserveDebugEnvironmnet = this.isExtensionDevelopmentHost;
            if (shouldPreserveLaunchCliEnvironment || shouldPreserveDebugEnvironmnet) {
                configuration.userEnv = { ...currentUserEnv, ...configuration.userEnv }; // still allow to override certain environment as passed in
            }
        }
        // If named pipe was instantiated for the crashpad_handler process, reuse the same
        // pipe for new app instances connecting to the original app instance.
        // Ref: https://github.com/microsoft/vscode/issues/115874
        if (process.env['CHROME_CRASHPAD_PIPE_NAME']) {
            Object.assign(configuration.userEnv, {
                CHROME_CRASHPAD_PIPE_NAME: process.env['CHROME_CRASHPAD_PIPE_NAME'],
            });
        }
        // Add disable-extensions to the config, but do not preserve it on currentConfig or
        // pendingLoadConfig so that it is applied only on this load
        if (options.disableExtensions !== undefined) {
            configuration['disable-extensions'] = options.disableExtensions;
        }
        // Update window related properties
        try {
            configuration.handle = VSBuffer.wrap(this._win.getNativeWindowHandle());
        }
        catch (error) {
            this.logService.error(`Error getting native window handle: ${error}`);
        }
        configuration.fullscreen = this.isFullScreen;
        configuration.maximized = this._win.isMaximized();
        configuration.partsSplash = this.themeMainService.getWindowSplash(configuration.workspace);
        configuration.zoomLevel = this.getZoomLevel();
        configuration.isCustomZoomLevel = typeof this.customZoomLevel === 'number';
        if (configuration.isCustomZoomLevel && configuration.partsSplash) {
            configuration.partsSplash.zoomLevel = configuration.zoomLevel;
        }
        // Update with latest perf marks
        mark('code/willOpenNewWindow');
        configuration.perfMarks = getMarks();
        // Update in config object URL for usage in renderer
        this.configObjectUrl.update(configuration);
    }
    async reload(cli) {
        // Copy our current config for reuse
        const configuration = Object.assign({}, this._config);
        // Validate workspace
        configuration.workspace = await this.validateWorkspaceBeforeReload(configuration);
        // Delete some properties we do not want during reload
        delete configuration.filesToOpenOrCreate;
        delete configuration.filesToDiff;
        delete configuration.filesToMerge;
        delete configuration.filesToWait;
        // Some configuration things get inherited if the window is being reloaded and we are
        // in extension development mode. These options are all development related.
        if (this.isExtensionDevelopmentHost && cli) {
            configuration.verbose = cli.verbose;
            configuration.debugId = cli.debugId;
            configuration.extensionEnvironment = cli.extensionEnvironment;
            configuration['inspect-extensions'] = cli['inspect-extensions'];
            configuration['inspect-brk-extensions'] = cli['inspect-brk-extensions'];
            configuration['extensions-dir'] = cli['extensions-dir'];
        }
        configuration.accessibilitySupport = electron.app.isAccessibilitySupportEnabled();
        configuration.isInitialStartup = false; // since this is a reload
        configuration.policiesData = this.policyService.serialize(); // set policies data again
        configuration.continueOn = this.environmentMainService.continueOn;
        configuration.profiles = {
            all: this.userDataProfilesService.profiles,
            profile: this.profile || this.userDataProfilesService.defaultProfile,
            home: this.userDataProfilesService.profilesHome,
        };
        configuration.logLevel = this.loggerMainService.getLogLevel();
        configuration.loggers = this.loggerMainService.getGlobalLoggers();
        // Load config
        this.load(configuration, { isReload: true, disableExtensions: cli?.['disable-extensions'] });
    }
    async validateWorkspaceBeforeReload(configuration) {
        // Multi folder
        if (isWorkspaceIdentifier(configuration.workspace)) {
            const configPath = configuration.workspace.configPath;
            if (configPath.scheme === Schemas.file) {
                const workspaceExists = await this.fileService.exists(configPath);
                if (!workspaceExists) {
                    return undefined;
                }
            }
        }
        // Single folder
        else if (isSingleFolderWorkspaceIdentifier(configuration.workspace)) {
            const uri = configuration.workspace.uri;
            if (uri.scheme === Schemas.file) {
                const folderExists = await this.fileService.exists(uri);
                if (!folderExists) {
                    return undefined;
                }
            }
        }
        // Workspace is valid
        return configuration.workspace;
    }
    serializeWindowState() {
        if (!this._win) {
            return defaultWindowState();
        }
        // fullscreen gets special treatment
        if (this.isFullScreen) {
            let display;
            try {
                display = electron.screen.getDisplayMatching(this.getBounds());
            }
            catch (error) {
                // Electron has weird conditions under which it throws errors
                // e.g. https://github.com/microsoft/vscode/issues/100334 when
                // large numbers are passed in
            }
            const defaultState = defaultWindowState();
            return {
                mode: 3 /* WindowMode.Fullscreen */,
                display: display ? display.id : undefined,
                // Still carry over window dimensions from previous sessions
                // if we can compute it in fullscreen state.
                // does not seem possible in all cases on Linux for example
                // (https://github.com/microsoft/vscode/issues/58218) so we
                // fallback to the defaults in that case.
                width: this.windowState.width || defaultState.width,
                height: this.windowState.height || defaultState.height,
                x: this.windowState.x || 0,
                y: this.windowState.y || 0,
                zoomLevel: this.customZoomLevel,
            };
        }
        const state = Object.create(null);
        let mode;
        // get window mode
        if (!isMacintosh && this._win.isMaximized()) {
            mode = 0 /* WindowMode.Maximized */;
        }
        else {
            mode = 1 /* WindowMode.Normal */;
        }
        // we don't want to save minimized state, only maximized or normal
        if (mode === 0 /* WindowMode.Maximized */) {
            state.mode = 0 /* WindowMode.Maximized */;
        }
        else {
            state.mode = 1 /* WindowMode.Normal */;
        }
        // only consider non-minimized window states
        if (mode === 1 /* WindowMode.Normal */ || mode === 0 /* WindowMode.Maximized */) {
            let bounds;
            if (mode === 1 /* WindowMode.Normal */) {
                bounds = this.getBounds();
            }
            else {
                bounds = this._win.getNormalBounds(); // make sure to persist the normal bounds when maximized to be able to restore them
            }
            state.x = bounds.x;
            state.y = bounds.y;
            state.width = bounds.width;
            state.height = bounds.height;
        }
        state.zoomLevel = this.customZoomLevel;
        return state;
    }
    restoreWindowState(state) {
        mark('code/willRestoreCodeWindowState');
        let hasMultipleDisplays = false;
        if (state) {
            // Window zoom
            this.customZoomLevel = state.zoomLevel;
            // Window dimensions
            try {
                const displays = electron.screen.getAllDisplays();
                hasMultipleDisplays = displays.length > 1;
                state = WindowStateValidator.validateWindowState(this.logService, state, displays);
            }
            catch (err) {
                this.logService.warn(`Unexpected error validating window state: ${err}\n${err.stack}`); // somehow display API can be picky about the state to validate
            }
        }
        mark('code/didRestoreCodeWindowState');
        return [state || defaultWindowState(), hasMultipleDisplays];
    }
    getBounds() {
        const [x, y] = this._win.getPosition();
        const [width, height] = this._win.getSize();
        return { x, y, width, height };
    }
    setFullScreen(fullscreen, fromRestore) {
        super.setFullScreen(fullscreen, fromRestore);
        // Events
        this.sendWhenReady(fullscreen ? 'vscode:enterFullScreen' : 'vscode:leaveFullScreen', CancellationToken.None);
        // Respect configured menu bar visibility or default to toggle if not set
        if (this.currentMenuBarVisibility) {
            this.setMenuBarVisibility(this.currentMenuBarVisibility, false);
        }
    }
    getMenuBarVisibility() {
        let menuBarVisibility = getMenuBarVisibility(this.configurationService);
        if (['visible', 'toggle', 'hidden'].indexOf(menuBarVisibility) < 0) {
            menuBarVisibility = 'classic';
        }
        return menuBarVisibility;
    }
    setMenuBarVisibility(visibility, notify = true) {
        if (isMacintosh) {
            return; // ignore for macOS platform
        }
        if (visibility === 'toggle') {
            if (notify) {
                this.send('vscode:showInfoMessage', localize('hiddenMenuBar', 'You can still access the menu bar by pressing the Alt-key.'));
            }
        }
        if (visibility === 'hidden') {
            // for some weird reason that I have no explanation for, the menu bar is not hiding when calling
            // this without timeout (see https://github.com/microsoft/vscode/issues/19777). there seems to be
            // a timing issue with us opening the first window and the menu bar getting created. somehow the
            // fact that we want to hide the menu without being able to bring it back via Alt key makes Electron
            // still show the menu. Unable to reproduce from a simple Hello World application though...
            setTimeout(() => {
                this.doSetMenuBarVisibility(visibility);
            });
        }
        else {
            this.doSetMenuBarVisibility(visibility);
        }
    }
    doSetMenuBarVisibility(visibility) {
        const isFullscreen = this.isFullScreen;
        switch (visibility) {
            case 'classic':
                this._win.setMenuBarVisibility(!isFullscreen);
                this._win.autoHideMenuBar = isFullscreen;
                break;
            case 'visible':
                this._win.setMenuBarVisibility(true);
                this._win.autoHideMenuBar = false;
                break;
            case 'toggle':
                this._win.setMenuBarVisibility(false);
                this._win.autoHideMenuBar = true;
                break;
            case 'hidden':
                this._win.setMenuBarVisibility(false);
                this._win.autoHideMenuBar = false;
                break;
        }
    }
    notifyZoomLevel(zoomLevel) {
        this.customZoomLevel = zoomLevel;
    }
    getZoomLevel() {
        if (typeof this.customZoomLevel === 'number') {
            return this.customZoomLevel;
        }
        const windowSettings = this.configurationService.getValue('window');
        return windowSettings?.zoomLevel;
    }
    close() {
        this._win?.close();
    }
    sendWhenReady(channel, token, ...args) {
        if (this.isReady) {
            this.send(channel, ...args);
        }
        else {
            this.ready().then(() => {
                if (!token.isCancellationRequested) {
                    this.send(channel, ...args);
                }
            });
        }
    }
    send(channel, ...args) {
        if (this._win) {
            if (this._win.isDestroyed() || this._win.webContents.isDestroyed()) {
                this.logService.warn(`Sending IPC message to channel '${channel}' for window that is destroyed`);
                return;
            }
            try {
                this._win.webContents.send(channel, ...args);
            }
            catch (error) {
                this.logService.warn(`Error sending IPC message to channel '${channel}' of window ${this._id}: ${toErrorMessage(error)}`);
            }
        }
    }
    updateTouchBar(groups) {
        if (!isMacintosh) {
            return; // only supported on macOS
        }
        // Update segments for all groups. Setting the segments property
        // of the group directly prevents ugly flickering from happening
        this.touchBarGroups.forEach((touchBarGroup, index) => {
            const commands = groups[index];
            touchBarGroup.segments = this.createTouchBarGroupSegments(commands);
        });
    }
    createTouchBar() {
        if (!isMacintosh) {
            return; // only supported on macOS
        }
        // To avoid flickering, we try to reuse the touch bar group
        // as much as possible by creating a large number of groups
        // for reusing later.
        for (let i = 0; i < 10; i++) {
            const groupTouchBar = this.createTouchBarGroup();
            this.touchBarGroups.push(groupTouchBar);
        }
        this._win.setTouchBar(new electron.TouchBar({ items: this.touchBarGroups }));
    }
    createTouchBarGroup(items = []) {
        // Group Segments
        const segments = this.createTouchBarGroupSegments(items);
        // Group Control
        const control = new electron.TouchBar.TouchBarSegmentedControl({
            segments,
            mode: 'buttons',
            segmentStyle: 'automatic',
            change: (selectedIndex) => {
                this.sendWhenReady('vscode:runAction', CancellationToken.None, {
                    id: control.segments[selectedIndex].id,
                    from: 'touchbar',
                });
            },
        });
        return control;
    }
    createTouchBarGroupSegments(items = []) {
        const segments = items.map((item) => {
            let icon;
            if (item.icon &&
                !ThemeIcon.isThemeIcon(item.icon) &&
                item.icon?.dark?.scheme === Schemas.file) {
                icon = electron.nativeImage.createFromPath(URI.revive(item.icon.dark).fsPath);
                if (icon.isEmpty()) {
                    icon = undefined;
                }
            }
            let title;
            if (typeof item.title === 'string') {
                title = item.title;
            }
            else {
                title = item.title.value;
            }
            return {
                id: item.id,
                label: !icon ? title : undefined,
                icon,
            };
        });
        return segments;
    }
    async startCollectingJScallStacks() {
        if (!this.jsCallStackCollector.isTriggered()) {
            const stack = await this._win.webContents.mainFrame.collectJavaScriptCallStack();
            // Increment the count for this stack trace
            if (stack) {
                const count = this.jsCallStackMap.get(stack) || 0;
                this.jsCallStackMap.set(stack, count + 1);
            }
            this.jsCallStackCollector.trigger(() => this.startCollectingJScallStacks());
        }
    }
    stopCollectingJScallStacks() {
        this.jsCallStackCollectorStopScheduler.cancel();
        this.jsCallStackCollector.cancel();
        if (this.jsCallStackMap.size) {
            let logMessage = `CodeWindow unresponsive samples:\n`;
            let samples = 0;
            const sortedEntries = Array.from(this.jsCallStackMap.entries()).sort((a, b) => b[1] - a[1]);
            for (const [stack, count] of sortedEntries) {
                samples += count;
                // If the stack appears more than 20 percent of the time, log it
                // to the error telemetry as UnresponsiveSampleError.
                if (Math.round((count * 100) / this.jsCallStackEffectiveSampleCount) > 20) {
                    const fakeError = new UnresponsiveError(stack, this.id, this.win?.webContents.getOSProcessId());
                    errorHandler.onUnexpectedError(fakeError);
                }
                logMessage += `<${count}> ${stack}\n`;
            }
            logMessage += `Total Samples: ${samples}\n`;
            logMessage +=
                'For full overview of the unresponsive period, capture cpu profile via https://aka.ms/vscode-tracing-cpu-profile';
            this.logService.error(logMessage);
        }
        this.jsCallStackMap.clear();
    }
    matches(webContents) {
        return this._win?.webContents.id === webContents.id;
    }
    dispose() {
        super.dispose();
        // Deregister the loggers for this window
        this.loggerMainService.deregisterLoggers(this.id);
    }
};
CodeWindow = __decorate([
    __param(1, ILogService),
    __param(2, ILoggerMainService),
    __param(3, IEnvironmentMainService),
    __param(4, IPolicyService),
    __param(5, IUserDataProfilesMainService),
    __param(6, IFileService),
    __param(7, IApplicationStorageMainService),
    __param(8, IStorageMainService),
    __param(9, IConfigurationService),
    __param(10, IThemeMainService),
    __param(11, IWorkspacesManagementMainService),
    __param(12, IBackupMainService),
    __param(13, ITelemetryService),
    __param(14, IDialogMainService),
    __param(15, ILifecycleMainService),
    __param(16, IProductService),
    __param(17, IProtocolMainService),
    __param(18, IWindowsMainService),
    __param(19, IStateService),
    __param(20, IInstantiationService)
], CodeWindow);
export { CodeWindow };
class UnresponsiveError extends Error {
    constructor(sample, windowId, pid = 0) {
        // Since the stacks are available via the sample
        // we can avoid collecting them when constructing the error.
        const stackTraceLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = 0;
        super(`UnresponsiveSampleError: from window with ID ${windowId} belonging to process with pid ${pid}`);
        Error.stackTraceLimit = stackTraceLimit;
        this.name = 'UnresponsiveSampleError';
        this.stack = sample;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93SW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvZWxlY3Ryb24tbWFpbi93aW5kb3dJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBNkMsTUFBTSxVQUFVLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFFNUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekUsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxr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