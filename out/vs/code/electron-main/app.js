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
var CodeApplication_1;
import { app, protocol, session, systemPreferences } from 'electron';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { validatedIpcMain } from '../../base/parts/ipc/electron-main/ipcMain.js';
import { hostname, release } from 'os';
import { VSBuffer } from '../../base/common/buffer.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { Event } from '../../base/common/event.js';
import { parse } from '../../base/common/jsonc.js';
import { getPathLabel } from '../../base/common/labels.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { Schemas, VSCODE_AUTHORITY } from '../../base/common/network.js';
import { join, posix } from '../../base/common/path.js';
import { isLinux, isLinuxSnap, isMacintosh, isWindows, OS, } from '../../base/common/platform.js';
import { assertType } from '../../base/common/types.js';
import { URI } from '../../base/common/uri.js';
import { generateUuid } from '../../base/common/uuid.js';
import { registerContextMenuListener } from '../../base/parts/contextmenu/electron-main/contextmenu.js';
import { getDelayedChannel, ProxyChannel, StaticRouter } from '../../base/parts/ipc/common/ipc.js';
import { Server as ElectronIPCServer } from '../../base/parts/ipc/electron-main/ipc.electron.js';
import { Client as MessagePortClient } from '../../base/parts/ipc/electron-main/ipc.mp.js';
import { IProxyAuthService, ProxyAuthService } from '../../platform/native/electron-main/auth.js';
import { localize } from '../../nls.js';
import { IBackupMainService } from '../../platform/backup/electron-main/backup.js';
import { BackupMainService } from '../../platform/backup/electron-main/backupMainService.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ElectronExtensionHostDebugBroadcastChannel } from '../../platform/debug/electron-main/extensionHostDebugIpc.js';
import { IDiagnosticsService } from '../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsMainService, IDiagnosticsMainService, } from '../../platform/diagnostics/electron-main/diagnosticsMainService.js';
import { DialogMainService, IDialogMainService, } from '../../platform/dialogs/electron-main/dialogMainService.js';
import { IEncryptionMainService } from '../../platform/encryption/common/encryptionService.js';
import { EncryptionMainService } from '../../platform/encryption/electron-main/encryptionMainService.js';
import { IEnvironmentMainService } from '../../platform/environment/electron-main/environmentMainService.js';
import { isLaunchedFromCli } from '../../platform/environment/node/argvHelper.js';
import { getResolvedShellEnv } from '../../platform/shell/node/shellEnv.js';
import { IExtensionHostStarter, ipcExtensionHostStarterChannelName, } from '../../platform/extensions/common/extensionHostStarter.js';
import { ExtensionHostStarter } from '../../platform/extensions/electron-main/extensionHostStarter.js';
import { IExternalTerminalMainService } from '../../platform/externalTerminal/electron-main/externalTerminal.js';
import { LinuxExternalTerminalService, MacExternalTerminalService, WindowsExternalTerminalService, } from '../../platform/externalTerminal/node/externalTerminalService.js';
import { LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../platform/files/common/diskFileSystemProviderClient.js';
import { IFileService } from '../../platform/files/common/files.js';
import { DiskFileSystemProviderChannel } from '../../platform/files/electron-main/diskFileSystemProviderServer.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { IInstantiationService, } from '../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { IProcessMainService } from '../../platform/process/common/process.js';
import { ProcessMainService } from '../../platform/process/electron-main/processMainService.js';
import { IKeyboardLayoutMainService, KeyboardLayoutMainService, } from '../../platform/keyboardLayout/electron-main/keyboardLayoutMainService.js';
import { ILaunchMainService, LaunchMainService, } from '../../platform/launch/electron-main/launchMainService.js';
import { ILifecycleMainService, } from '../../platform/lifecycle/electron-main/lifecycleMainService.js';
import { ILoggerService, ILogService } from '../../platform/log/common/log.js';
import { IMenubarMainService, MenubarMainService, } from '../../platform/menubar/electron-main/menubarMainService.js';
import { INativeHostMainService, NativeHostMainService, } from '../../platform/native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { getRemoteAuthority } from '../../platform/remote/common/remoteHosts.js';
import { SharedProcess } from '../../platform/sharedProcess/electron-main/sharedProcess.js';
import { ISignService } from '../../platform/sign/common/sign.js';
import { IStateService } from '../../platform/state/node/state.js';
import { StorageDatabaseChannel } from '../../platform/storage/electron-main/storageIpc.js';
import { ApplicationStorageMainService, IApplicationStorageMainService, IStorageMainService, StorageMainService, } from '../../platform/storage/electron-main/storageMainService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderClient } from '../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryService, } from '../../platform/telemetry/common/telemetryService.js';
import { getPiiPathsFromEnvironment, getTelemetryLevel, isInternalTelemetry, NullTelemetryService, supportsTelemetry, } from '../../platform/telemetry/common/telemetryUtils.js';
import { IUpdateService } from '../../platform/update/common/update.js';
import { UpdateChannel } from '../../platform/update/common/updateIpc.js';
import { DarwinUpdateService } from '../../platform/update/electron-main/updateService.darwin.js';
import { LinuxUpdateService } from '../../platform/update/electron-main/updateService.linux.js';
import { SnapUpdateService } from '../../platform/update/electron-main/updateService.snap.js';
import { Win32UpdateService } from '../../platform/update/electron-main/updateService.win32.js';
import { IURLService } from '../../platform/url/common/url.js';
import { URLHandlerChannelClient, URLHandlerRouter } from '../../platform/url/common/urlIpc.js';
import { NativeURLService } from '../../platform/url/common/urlService.js';
import { ElectronURLListener } from '../../platform/url/electron-main/electronUrlListener.js';
import { IWebviewManagerService } from '../../platform/webview/common/webviewManagerService.js';
import { WebviewMainService } from '../../platform/webview/electron-main/webviewMainService.js';
import { isFolderToOpen, isWorkspaceToOpen, } from '../../platform/window/common/window.js';
import { getAllWindowsExcludingOffscreen, IWindowsMainService, } from '../../platform/windows/electron-main/windows.js';
import { WindowsMainService } from '../../platform/windows/electron-main/windowsMainService.js';
import { ActiveWindowManager } from '../../platform/windows/node/windowTracker.js';
import { hasWorkspaceFileExtension } from '../../platform/workspace/common/workspace.js';
import { IWorkspacesService } from '../../platform/workspaces/common/workspaces.js';
import { IWorkspacesHistoryMainService, WorkspacesHistoryMainService, } from '../../platform/workspaces/electron-main/workspacesHistoryMainService.js';
import { WorkspacesMainService } from '../../platform/workspaces/electron-main/workspacesMainService.js';
import { IWorkspacesManagementMainService, WorkspacesManagementMainService, } from '../../platform/workspaces/electron-main/workspacesManagementMainService.js';
import { IPolicyService } from '../../platform/policy/common/policy.js';
import { PolicyChannel } from '../../platform/policy/common/policyIpc.js';
import { IUserDataProfilesMainService } from '../../platform/userDataProfile/electron-main/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../platform/extensionManagement/node/extensionsScannerService.js';
import { UserDataProfilesHandler } from '../../platform/userDataProfile/electron-main/userDataProfilesHandler.js';
import { ProfileStorageChangesListenerChannel } from '../../platform/userDataProfile/electron-main/userDataProfileStorageIpc.js';
import { Promises, RunOnceScheduler, runWhenGlobalIdle } from '../../base/common/async.js';
import { resolveMachineId, resolveSqmId, resolvedevDeviceId, validatedevDeviceId, } from '../../platform/telemetry/electron-main/telemetryUtils.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LoggerChannel } from '../../platform/log/electron-main/logIpc.js';
import { ILoggerMainService } from '../../platform/log/electron-main/loggerService.js';
import { IUtilityProcessWorkerMainService, UtilityProcessWorkerMainService, } from '../../platform/utilityProcess/electron-main/utilityProcessWorkerMainService.js';
import { ipcUtilityProcessWorkerChannelName } from '../../platform/utilityProcess/common/utilityProcessWorkerService.js';
import { ILocalPtyService, TerminalIpcChannels, } from '../../platform/terminal/common/terminal.js';
import { ElectronPtyHostStarter } from '../../platform/terminal/electron-main/electronPtyHostStarter.js';
import { PtyHostService } from '../../platform/terminal/node/ptyHostService.js';
import { NODE_REMOTE_RESOURCE_CHANNEL_NAME, NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, NodeRemoteResourceRouter, } from '../../platform/remote/common/electronRemoteResources.js';
import { Lazy } from '../../base/common/lazy.js';
import { IAuxiliaryWindowsMainService } from '../../platform/auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { AuxiliaryWindowsMainService } from '../../platform/auxiliaryWindow/electron-main/auxiliaryWindowsMainService.js';
import { normalizeNFC } from '../../base/common/normalization.js';
import { ICSSDevelopmentService, CSSDevelopmentService, } from '../../platform/cssDev/node/cssDevService.js';
import { INativeMcpDiscoveryHelperService, NativeMcpDiscoveryHelperChannelName, } from '../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { NativeMcpDiscoveryHelperService } from '../../platform/mcp/node/nativeMcpDiscoveryHelperService.js';
import { IWebContentExtractorService } from '../../platform/webContentExtractor/common/webContentExtractor.js';
import { NativeWebContentExtractorService } from '../../platform/webContentExtractor/electron-main/webContentExtractorService.js';
import ErrorTelemetry from '../../platform/telemetry/electron-main/errorTelemetry.js';
// in theory this is not allowed
// ignore the eslint errors below
import { IMetricsService } from '../../workbench/contrib/void/common/metricsService.js';
import { IVoidUpdateService } from '../../workbench/contrib/void/common/voidUpdateService.js';
import { MetricsMainService } from '../../workbench/contrib/void/electron-main/metricsMainService.js';
import { VoidMainUpdateService } from '../../workbench/contrib/void/electron-main/voidUpdateMainService.js';
import { LLMMessageChannel } from '../../workbench/contrib/void/electron-main/sendLLMMessageChannel.js';
import { VoidSCMService } from '../../workbench/contrib/void/electron-main/voidSCMMainService.js';
import { IVoidSCMService } from '../../workbench/contrib/void/common/voidSCMTypes.js';
import { MCPChannel } from '../../workbench/contrib/void/electron-main/mcpChannel.js';
/**
 * The main VS Code application. There will only ever be one instance,
 * even if the user starts many instances (e.g. from the command line).
 */
let CodeApplication = class CodeApplication extends Disposable {
    static { CodeApplication_1 = this; }
    static { this.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY = {
        [Schemas.file]: 'security.promptForLocalFileProtocolHandling',
        [Schemas.vscodeRemote]: 'security.promptForRemoteFileProtocolHandling',
    }; }
    constructor(mainProcessNodeIpcServer, userEnv, mainInstantiationService, logService, loggerService, environmentMainService, lifecycleMainService, configurationService, stateService, fileService, productService, userDataProfilesMainService) {
        super();
        this.mainProcessNodeIpcServer = mainProcessNodeIpcServer;
        this.userEnv = userEnv;
        this.mainInstantiationService = mainInstantiationService;
        this.logService = logService;
        this.loggerService = loggerService;
        this.environmentMainService = environmentMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.configurationService = configurationService;
        this.stateService = stateService;
        this.fileService = fileService;
        this.productService = productService;
        this.userDataProfilesMainService = userDataProfilesMainService;
        this.configureSession();
        this.registerListeners();
    }
    configureSession() {
        //#region Security related measures (https://electronjs.org/docs/tutorial/security)
        //
        // !!! DO NOT CHANGE without consulting the documentation !!!
        //
        const isUrlFromWindow = (requestingUrl) => requestingUrl?.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}`);
        const isUrlFromWebview = (requestingUrl) => requestingUrl?.startsWith(`${Schemas.vscodeWebview}://`);
        const allowedPermissionsInWebview = new Set([
            'clipboard-read',
            'clipboard-sanitized-write',
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            'deprecated-sync-clipboard-read',
        ]);
        const allowedPermissionsInCore = new Set([
            'media',
            'local-fonts',
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            'deprecated-sync-clipboard-read',
        ]);
        session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
            if (isUrlFromWebview(details.requestingUrl)) {
                return callback(allowedPermissionsInWebview.has(permission));
            }
            if (isUrlFromWindow(details.requestingUrl)) {
                return callback(allowedPermissionsInCore.has(permission));
            }
            return callback(false);
        });
        session.defaultSession.setPermissionCheckHandler((_webContents, permission, _origin, details) => {
            if (isUrlFromWebview(details.requestingUrl)) {
                return allowedPermissionsInWebview.has(permission);
            }
            if (isUrlFromWindow(details.requestingUrl)) {
                return allowedPermissionsInCore.has(permission);
            }
            return false;
        });
        //#endregion
        //#region Request filtering
        // Block all SVG requests from unsupported origins
        const supportedSvgSchemes = new Set([
            Schemas.file,
            Schemas.vscodeFileResource,
            Schemas.vscodeRemoteResource,
            Schemas.vscodeManagedRemoteResource,
            'devtools',
        ]);
        // But allow them if they are made from inside an webview
        const isSafeFrame = (requestFrame) => {
            for (let frame = requestFrame; frame; frame = frame.parent) {
                if (frame.url.startsWith(`${Schemas.vscodeWebview}://`)) {
                    return true;
                }
            }
            return false;
        };
        const isSvgRequestFromSafeContext = (details) => {
            return details.resourceType === 'xhr' || isSafeFrame(details.frame);
        };
        const isAllowedVsCodeFileRequest = (details) => {
            const frame = details.frame;
            if (!frame || !this.windowsMainService) {
                return false;
            }
            // Check to see if the request comes from one of the main windows (or shared process) and not from embedded content
            const windows = getAllWindowsExcludingOffscreen();
            for (const window of windows) {
                if (frame.processId === window.webContents.mainFrame.processId) {
                    return true;
                }
            }
            return false;
        };
        const isAllowedWebviewRequest = (uri, details) => {
            if (uri.path !== '/index.html') {
                return true; // Only restrict top level page of webviews: index.html
            }
            const frame = details.frame;
            if (!frame || !this.windowsMainService) {
                return false;
            }
            // Check to see if the request comes from one of the main editor windows.
            for (const window of this.windowsMainService.getWindows()) {
                if (window.win) {
                    if (frame.processId === window.win.webContents.mainFrame.processId) {
                        return true;
                    }
                }
            }
            return false;
        };
        session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
            const uri = URI.parse(details.url);
            if (uri.scheme === Schemas.vscodeWebview) {
                if (!isAllowedWebviewRequest(uri, details)) {
                    this.logService.error('Blocked vscode-webview request', details.url);
                    return callback({ cancel: true });
                }
            }
            if (uri.scheme === Schemas.vscodeFileResource) {
                if (!isAllowedVsCodeFileRequest(details)) {
                    this.logService.error('Blocked vscode-file request', details.url);
                    return callback({ cancel: true });
                }
            }
            // Block most svgs
            if (uri.path.endsWith('.svg')) {
                const isSafeResourceUrl = supportedSvgSchemes.has(uri.scheme);
                if (!isSafeResourceUrl) {
                    return callback({ cancel: !isSvgRequestFromSafeContext(details) });
                }
            }
            return callback({ cancel: false });
        });
        // Configure SVG header content type properly
        // https://github.com/microsoft/vscode/issues/97564
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            const responseHeaders = details.responseHeaders;
            const contentTypes = responseHeaders['content-type'] || responseHeaders['Content-Type'];
            if (contentTypes && Array.isArray(contentTypes)) {
                const uri = URI.parse(details.url);
                if (uri.path.endsWith('.svg')) {
                    if (supportedSvgSchemes.has(uri.scheme)) {
                        responseHeaders['Content-Type'] = ['image/svg+xml'];
                        return callback({ cancel: false, responseHeaders });
                    }
                }
                // remote extension schemes have the following format
                // http://127.0.0.1:<port>/vscode-remote-resource?path=
                if (!uri.path.endsWith(Schemas.vscodeRemoteResource) &&
                    contentTypes.some((contentType) => contentType.toLowerCase().includes('image/svg'))) {
                    return callback({ cancel: !isSvgRequestFromSafeContext(details) });
                }
            }
            return callback({ cancel: false });
        });
        //#endregion
        //#region Allow CORS for the PRSS CDN
        // https://github.com/microsoft/vscode-remote-release/issues/9246
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            if (details.url.startsWith('https://vscode.download.prss.microsoft.com/')) {
                const responseHeaders = details.responseHeaders ?? Object.create(null);
                if (responseHeaders['Access-Control-Allow-Origin'] === undefined) {
                    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
                    return callback({ cancel: false, responseHeaders });
                }
            }
            return callback({ cancel: false });
        });
        const defaultSession = session.defaultSession;
        if (typeof defaultSession.setCodeCachePath === 'function' &&
            this.environmentMainService.codeCachePath) {
            // Make sure to partition Chrome's code cache folder
            // in the same way as our code cache path to help
            // invalidate caches that we know are invalid
            // (https://github.com/microsoft/vscode/issues/120655)
            defaultSession.setCodeCachePath(join(this.environmentMainService.codeCachePath, 'chrome'));
        }
        //#endregion
        //#region UNC Host Allowlist (Windows)
        if (isWindows) {
            if (this.configurationService.getValue('security.restrictUNCAccess') === false) {
                disableUNCAccessRestrictions();
            }
            else {
                addUNCHostToAllowlist(this.configurationService.getValue('security.allowedUNCHosts'));
            }
        }
        //#endregion
    }
    registerListeners() {
        // Dispose on shutdown
        Event.once(this.lifecycleMainService.onWillShutdown)(() => this.dispose());
        // Contextmenu via IPC support
        registerContextMenuListener();
        // Accessibility change event
        app.on('accessibility-support-changed', (event, accessibilitySupportEnabled) => {
            this.windowsMainService?.sendToAll('vscode:accessibilitySupportChanged', accessibilitySupportEnabled);
        });
        // macOS dock activate
        app.on('activate', async (event, hasVisibleWindows) => {
            this.logService.trace('app#activate');
            // Mac only event: open new window when we get activated
            if (!hasVisibleWindows) {
                await this.windowsMainService?.openEmptyWindow({ context: 1 /* OpenContext.DOCK */ });
            }
        });
        //#region Security related measures (https://electronjs.org/docs/tutorial/security)
        //
        // !!! DO NOT CHANGE without consulting the documentation !!!
        //
        app.on('web-contents-created', (event, contents) => {
            // Auxiliary Window: delegate to `AuxiliaryWindow` class
            if (contents?.opener?.url.startsWith(`${Schemas.vscodeFileResource}://${VSCODE_AUTHORITY}/`)) {
                this.logService.trace('[aux window]  app.on("web-contents-created"): Registering auxiliary window');
                this.auxiliaryWindowsMainService?.registerWindow(contents);
            }
            // Block any in-page navigation
            contents.on('will-navigate', (event) => {
                this.logService.error('webContents#will-navigate: Prevented webcontent navigation');
                event.preventDefault();
            });
            // All Windows: only allow about:blank auxiliary windows to open
            // For all other URLs, delegate to the OS.
            contents.setWindowOpenHandler((details) => {
                // about:blank windows can open as window witho our default options
                if (details.url === 'about:blank') {
                    this.logService.trace('[aux window] webContents#setWindowOpenHandler: Allowing auxiliary window to open on about:blank');
                    return {
                        action: 'allow',
                        overrideBrowserWindowOptions: this.auxiliaryWindowsMainService?.createWindow(details),
                    };
                }
                // Any other URL: delegate to OS
                else {
                    this.logService.trace(`webContents#setWindowOpenHandler: Prevented opening window with URL ${details.url}}`);
                    this.nativeHostMainService?.openExternal(undefined, details.url);
                    return { action: 'deny' };
                }
            });
        });
        //#endregion
        let macOpenFileURIs = [];
        let runningTimeout = undefined;
        app.on('open-file', (event, path) => {
            path = normalizeNFC(path); // macOS only: normalize paths to NFC form
            this.logService.trace('app#open-file: ', path);
            event.preventDefault();
            // Keep in array because more might come!
            macOpenFileURIs.push(hasWorkspaceFileExtension(path)
                ? { workspaceUri: URI.file(path) }
                : { fileUri: URI.file(path) });
            // Clear previous handler if any
            if (runningTimeout !== undefined) {
                clearTimeout(runningTimeout);
                runningTimeout = undefined;
            }
            // Handle paths delayed in case more are coming!
            runningTimeout = setTimeout(async () => {
                await this.windowsMainService?.open({
                    context: 1 /* OpenContext.DOCK */ /* can also be opening from finder while app is running */,
                    cli: this.environmentMainService.args,
                    urisToOpen: macOpenFileURIs,
                    gotoLineMode: false,
                    preferNewWindow: true /* dropping on the dock or opening from finder prefers to open in a new window */,
                });
                macOpenFileURIs = [];
                runningTimeout = undefined;
            }, 100);
        });
        app.on('new-window-for-tab', async () => {
            await this.windowsMainService?.openEmptyWindow({ context: 4 /* OpenContext.DESKTOP */ }); //macOS native tab "+" button
        });
        //#region Bootstrap IPC Handlers
        validatedIpcMain.handle('vscode:fetchShellEnv', (event) => {
            // Prefer to use the args and env from the target window
            // when resolving the shell env. It is possible that
            // a first window was opened from the UI but a second
            // from the CLI and that has implications for whether to
            // resolve the shell environment or not.
            //
            // Window can be undefined for e.g. the shared process
            // that is not part of our windows registry!
            const window = this.windowsMainService?.getWindowByWebContents(event.sender); // Note: this can be `undefined` for the shared process
            let args;
            let env;
            if (window?.config) {
                args = window.config;
                env = { ...process.env, ...window.config.userEnv };
            }
            else {
                args = this.environmentMainService.args;
                env = process.env;
            }
            // Resolve shell env
            return this.resolveShellEnvironment(args, env, false);
        });
        validatedIpcMain.on('vscode:toggleDevTools', (event) => event.sender.toggleDevTools());
        validatedIpcMain.on('vscode:openDevTools', (event) => event.sender.openDevTools());
        validatedIpcMain.on('vscode:reloadWindow', (event) => event.sender.reload());
        validatedIpcMain.handle('vscode:notifyZoomLevel', async (event, zoomLevel) => {
            const window = this.windowsMainService?.getWindowByWebContents(event.sender);
            if (window) {
                window.notifyZoomLevel(zoomLevel);
            }
        });
        //#endregion
    }
    async startup() {
        this.logService.debug('Starting VS Code');
        this.logService.debug(`from: ${this.environmentMainService.appRoot}`);
        this.logService.debug('args:', this.environmentMainService.args);
        // Make sure we associate the program with the app user model id
        // This will help Windows to associate the running program with
        // any shortcut that is pinned to the taskbar and prevent showing
        // two icons in the taskbar for the same app.
        const win32AppUserModelId = this.productService.win32AppUserModelId;
        if (isWindows && win32AppUserModelId) {
            app.setAppUserModelId(win32AppUserModelId);
        }
        // Fix native tabs on macOS 10.13
        // macOS enables a compatibility patch for any bundle ID beginning with
        // "com.microsoft.", which breaks native tabs for VS Code when using this
        // identifier (from the official build).
        // Explicitly opt out of the patch here before creating any windows.
        // See: https://github.com/microsoft/vscode/issues/35361#issuecomment-399794085
        try {
            if (isMacintosh &&
                this.configurationService.getValue('window.nativeTabs') === true &&
                !systemPreferences.getUserDefault('NSUseImprovedLayoutPass', 'boolean')) {
                systemPreferences.setUserDefault('NSUseImprovedLayoutPass', 'boolean', true);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        // Main process server (electron IPC based)
        const mainProcessElectronServer = new ElectronIPCServer();
        Event.once(this.lifecycleMainService.onWillShutdown)((e) => {
            if (e.reason === 2 /* ShutdownReason.KILL */) {
                // When we go down abnormally, make sure to free up
                // any IPC we accept from other windows to reduce
                // the chance of doing work after we go down. Kill
                // is special in that it does not orderly shutdown
                // windows.
                mainProcessElectronServer.dispose();
            }
        });
        // Resolve unique machine ID
        this.logService.trace('Resolving machine identifier...');
        const [machineId, sqmId, devDeviceId] = await Promise.all([
            resolveMachineId(this.stateService, this.logService),
            resolveSqmId(this.stateService, this.logService),
            resolvedevDeviceId(this.stateService, this.logService),
        ]);
        this.logService.trace(`Resolved machine identifier: ${machineId}`);
        // Shared process
        const { sharedProcessReady, sharedProcessClient } = this.setupSharedProcess(machineId, sqmId, devDeviceId);
        // Services
        const appInstantiationService = await this.initServices(machineId, sqmId, devDeviceId, sharedProcessReady);
        // Error telemetry
        appInstantiationService.invokeFunction((accessor) => this._register(new ErrorTelemetry(accessor.get(ILogService), accessor.get(ITelemetryService))));
        // Auth Handler
        appInstantiationService.invokeFunction((accessor) => accessor.get(IProxyAuthService));
        // Transient profiles handler
        this._register(appInstantiationService.createInstance(UserDataProfilesHandler));
        // Init Channels
        appInstantiationService.invokeFunction((accessor) => this.initChannels(accessor, mainProcessElectronServer, sharedProcessClient));
        // Setup Protocol URL Handlers
        const initialProtocolUrls = await appInstantiationService.invokeFunction((accessor) => this.setupProtocolUrlHandlers(accessor, mainProcessElectronServer));
        // Setup vscode-remote-resource protocol handler
        this.setupManagedRemoteResourceUrlHandler(mainProcessElectronServer);
        // Signal phase: ready - before opening first window
        this.lifecycleMainService.phase = 2 /* LifecycleMainPhase.Ready */;
        // Open Windows
        await appInstantiationService.invokeFunction((accessor) => this.openFirstWindow(accessor, initialProtocolUrls));
        // Signal phase: after window open
        this.lifecycleMainService.phase = 3 /* LifecycleMainPhase.AfterWindowOpen */;
        // Post Open Windows Tasks
        this.afterWindowOpen();
        // Set lifecycle phase to `Eventually` after a short delay and when idle (min 2.5sec, max 5sec)
        const eventuallyPhaseScheduler = this._register(new RunOnceScheduler(() => {
            this._register(runWhenGlobalIdle(() => {
                // Signal phase: eventually
                this.lifecycleMainService.phase = 4 /* LifecycleMainPhase.Eventually */;
                // Eventually Post Open Window Tasks
                this.eventuallyAfterWindowOpen();
            }, 2500));
        }, 2500));
        eventuallyPhaseScheduler.schedule();
    }
    async setupProtocolUrlHandlers(accessor, mainProcessElectronServer) {
        const windowsMainService = (this.windowsMainService = accessor.get(IWindowsMainService));
        const urlService = accessor.get(IURLService);
        const nativeHostMainService = (this.nativeHostMainService =
            accessor.get(INativeHostMainService));
        const dialogMainService = accessor.get(IDialogMainService);
        // Install URL handlers that deal with protocl URLs either
        // from this process by opening windows and/or by forwarding
        // the URLs into a window process to be handled there.
        const app = this;
        urlService.registerHandler({
            async handleURL(uri, options) {
                return app.handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options);
            },
        });
        const activeWindowManager = this._register(new ActiveWindowManager({
            onDidOpenMainWindow: nativeHostMainService.onDidOpenMainWindow,
            onDidFocusMainWindow: nativeHostMainService.onDidFocusMainWindow,
            getActiveWindowId: () => nativeHostMainService.getActiveWindowId(-1),
        }));
        const activeWindowRouter = new StaticRouter((ctx) => activeWindowManager.getActiveClientId().then((id) => ctx === id));
        const urlHandlerRouter = new URLHandlerRouter(activeWindowRouter, this.logService);
        const urlHandlerChannel = mainProcessElectronServer.getChannel('urlHandler', urlHandlerRouter);
        urlService.registerHandler(new URLHandlerChannelClient(urlHandlerChannel));
        const initialProtocolUrls = await this.resolveInitialProtocolUrls(windowsMainService, dialogMainService);
        this._register(new ElectronURLListener(initialProtocolUrls?.urls, urlService, windowsMainService, this.environmentMainService, this.productService, this.logService));
        return initialProtocolUrls;
    }
    setupManagedRemoteResourceUrlHandler(mainProcessElectronServer) {
        const notFound = () => ({ statusCode: 404, data: 'Not found' });
        const remoteResourceChannel = new Lazy(() => mainProcessElectronServer.getChannel(NODE_REMOTE_RESOURCE_CHANNEL_NAME, new NodeRemoteResourceRouter()));
        protocol.registerBufferProtocol(Schemas.vscodeManagedRemoteResource, (request, callback) => {
            const url = URI.parse(request.url);
            if (!url.authority.startsWith('window:')) {
                return callback(notFound());
            }
            remoteResourceChannel.value
                .call(NODE_REMOTE_RESOURCE_IPC_METHOD_NAME, [url])
                .then((r) => callback({ ...r, data: Buffer.from(r.body, 'base64') }), (err) => {
                this.logService.warn('error dispatching remote resource call', err);
                callback({ statusCode: 500, data: String(err) });
            });
        });
    }
    async resolveInitialProtocolUrls(windowsMainService, dialogMainService) {
        /**
         * Protocol URL handling on startup is complex, refer to
         * {@link IInitialProtocolUrls} for an explainer.
         */
        // Windows/Linux: protocol handler invokes CLI with --open-url
        const protocolUrlsFromCommandLine = this.environmentMainService.args['open-url']
            ? this.environmentMainService.args._urls || []
            : [];
        if (protocolUrlsFromCommandLine.length > 0) {
            this.logService.trace('app#resolveInitialProtocolUrls() protocol urls from command line:', protocolUrlsFromCommandLine);
        }
        // macOS: open-url events that were received before the app is ready
        const protocolUrlsFromEvent = (global.getOpenUrls() || []);
        if (protocolUrlsFromEvent.length > 0) {
            this.logService.trace(`app#resolveInitialProtocolUrls() protocol urls from macOS 'open-url' event:`, protocolUrlsFromEvent);
        }
        if (protocolUrlsFromCommandLine.length + protocolUrlsFromEvent.length === 0) {
            return undefined;
        }
        const protocolUrls = [...protocolUrlsFromCommandLine, ...protocolUrlsFromEvent].map((url) => {
            try {
                return { uri: URI.parse(url), originalUrl: url };
            }
            catch {
                this.logService.trace('app#resolveInitialProtocolUrls() protocol url failed to parse:', url);
                return undefined;
            }
        });
        const openables = [];
        const urls = [];
        for (const protocolUrl of protocolUrls) {
            if (!protocolUrl) {
                continue; // invalid
            }
            const windowOpenable = this.getWindowOpenableFromProtocolUrl(protocolUrl.uri);
            if (windowOpenable) {
                if (await this.shouldBlockOpenable(windowOpenable, windowsMainService, dialogMainService)) {
                    this.logService.trace('app#resolveInitialProtocolUrls() protocol url was blocked:', protocolUrl.uri.toString(true));
                    continue; // blocked
                }
                else {
                    this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be handled as window to open:', protocolUrl.uri.toString(true), windowOpenable);
                    openables.push(windowOpenable); // handled as window to open
                }
            }
            else {
                this.logService.trace('app#resolveInitialProtocolUrls() protocol url will be passed to active window for handling:', protocolUrl.uri.toString(true));
                urls.push(protocolUrl); // handled within active window
            }
        }
        return { urls, openables };
    }
    async shouldBlockOpenable(openable, windowsMainService, dialogMainService) {
        let openableUri;
        let message;
        if (isWorkspaceToOpen(openable)) {
            openableUri = openable.workspaceUri;
            message = localize('confirmOpenMessageWorkspace', "An external application wants to open '{0}' in {1}. Do you want to open this workspace file?", openableUri.scheme === Schemas.file
                ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService })
                : openableUri.toString(true), this.productService.nameShort);
        }
        else if (isFolderToOpen(openable)) {
            openableUri = openable.folderUri;
            message = localize('confirmOpenMessageFolder', "An external application wants to open '{0}' in {1}. Do you want to open this folder?", openableUri.scheme === Schemas.file
                ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService })
                : openableUri.toString(true), this.productService.nameShort);
        }
        else {
            openableUri = openable.fileUri;
            message = localize('confirmOpenMessageFileOrFolder', "An external application wants to open '{0}' in {1}. Do you want to open this file or folder?", openableUri.scheme === Schemas.file
                ? getPathLabel(openableUri, { os: OS, tildify: this.environmentMainService })
                : openableUri.toString(true), this.productService.nameShort);
        }
        if (openableUri.scheme !== Schemas.file && openableUri.scheme !== Schemas.vscodeRemote) {
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            //
            // NOTE: we currently only ask for confirmation for `file` and `vscode-remote`
            // authorities here. There is an additional confirmation for `extension.id`
            // authorities from within the window.
            //
            // IF YOU ARE PLANNING ON ADDING ANOTHER AUTHORITY HERE, MAKE SURE TO ALSO
            // ADD IT TO THE CONFIRMATION CODE BELOW OR INSIDE THE WINDOW!
            //
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            return false;
        }
        const askForConfirmation = this.configurationService.getValue(CodeApplication_1.SECURITY_PROTOCOL_HANDLING_CONFIRMATION_SETTING_KEY[openableUri.scheme]);
        if (askForConfirmation === false) {
            return false; // not blocked via settings
        }
        const { response, checkboxChecked } = await dialogMainService.showMessageBox({
            type: 'warning',
            buttons: [
                localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, '&&Yes'),
                localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, '&&No'),
            ],
            message,
            detail: localize('confirmOpenDetail', "If you did not initiate this request, it may represent an attempted attack on your system. Unless you took an explicit action to initiate this request, you should press 'No'"),
            checkboxLabel: openableUri.scheme === Schemas.file
                ? localize('doNotAskAgainLocal', 'Allow opening local paths without asking')
                : localize('doNotAskAgainRemote', 'Allow opening remote paths without asking'),
            cancelId: 1,
        });
        if (response !== 0) {
            return true; // blocked by user choice
        }
        if (checkboxChecked) {
            // Due to https://github.com/microsoft/vscode/issues/195436, we can only
            // update settings from within a window. But we do not know if a window
            // is about to open or can already handle the request, so we have to send
            // to any current window and any newly opening window.
            const request = {
                channel: 'vscode:disablePromptForProtocolHandling',
                args: openableUri.scheme === Schemas.file ? 'local' : 'remote',
            };
            windowsMainService.sendToFocused(request.channel, request.args);
            windowsMainService.sendToOpeningWindow(request.channel, request.args);
        }
        return false; // not blocked by user choice
    }
    getWindowOpenableFromProtocolUrl(uri) {
        if (!uri.path) {
            return undefined;
        }
        // File path
        if (uri.authority === Schemas.file) {
            const fileUri = URI.file(uri.fsPath);
            if (hasWorkspaceFileExtension(fileUri)) {
                return { workspaceUri: fileUri };
            }
            return { fileUri };
        }
        // Remote path
        else if (uri.authority === Schemas.vscodeRemote) {
            // Example conversion:
            // From: vscode://vscode-remote/wsl+ubuntu/mnt/c/GitDevelopment/monaco
            //   To: vscode-remote://wsl+ubuntu/mnt/c/GitDevelopment/monaco
            const secondSlash = uri.path.indexOf(posix.sep, 1 /* skip over the leading slash */);
            let authority;
            let path;
            if (secondSlash !== -1) {
                authority = uri.path.substring(1, secondSlash);
                path = uri.path.substring(secondSlash);
            }
            else {
                authority = uri.path.substring(1);
                path = '/';
            }
            let query = uri.query;
            const params = new URLSearchParams(uri.query);
            if (params.get('windowId') === '_blank') {
                // Make sure to unset any `windowId=_blank` here
                // https://github.com/microsoft/vscode/issues/191902
                params.delete('windowId');
                query = params.toString();
            }
            const remoteUri = URI.from({
                scheme: Schemas.vscodeRemote,
                authority,
                path,
                query,
                fragment: uri.fragment,
            });
            if (hasWorkspaceFileExtension(path)) {
                return { workspaceUri: remoteUri };
            }
            if (/:[\d]+$/.test(path)) {
                // path with :line:column syntax
                return { fileUri: remoteUri };
            }
            return { folderUri: remoteUri };
        }
        return undefined;
    }
    async handleProtocolUrl(windowsMainService, dialogMainService, urlService, uri, options) {
        this.logService.trace('app#handleProtocolUrl():', uri.toString(true), options);
        // Support 'workspace' URLs (https://github.com/microsoft/vscode/issues/124263)
        if (uri.scheme === this.productService.urlProtocol && uri.path === 'workspace') {
            uri = uri.with({
                authority: 'file',
                path: URI.parse(uri.query).path,
                query: '',
            });
        }
        let shouldOpenInNewWindow = false;
        // We should handle the URI in a new window if the URL contains `windowId=_blank`
        const params = new URLSearchParams(uri.query);
        if (params.get('windowId') === '_blank') {
            this.logService.trace(`app#handleProtocolUrl() found 'windowId=_blank' as parameter, setting shouldOpenInNewWindow=true:`, uri.toString(true));
            params.delete('windowId');
            uri = uri.with({ query: params.toString() });
            shouldOpenInNewWindow = true;
        }
        // or if no window is open (macOS only)
        else if (isMacintosh && windowsMainService.getWindowCount() === 0) {
            this.logService.trace(`app#handleProtocolUrl() running on macOS with no window open, setting shouldOpenInNewWindow=true:`, uri.toString(true));
            shouldOpenInNewWindow = true;
        }
        // Pass along whether the application is being opened via a Continue On flow
        const continueOn = params.get('continueOn');
        if (continueOn !== null) {
            this.logService.trace(`app#handleProtocolUrl() found 'continueOn' as parameter:`, uri.toString(true));
            params.delete('continueOn');
            uri = uri.with({ query: params.toString() });
            this.environmentMainService.continueOn = continueOn ?? undefined;
        }
        // Check if the protocol URL is a window openable to open...
        const windowOpenableFromProtocolUrl = this.getWindowOpenableFromProtocolUrl(uri);
        if (windowOpenableFromProtocolUrl) {
            if (await this.shouldBlockOpenable(windowOpenableFromProtocolUrl, windowsMainService, dialogMainService)) {
                this.logService.trace('app#handleProtocolUrl() protocol url was blocked:', uri.toString(true));
                return true; // If openable should be blocked, behave as if it's handled
            }
            else {
                this.logService.trace('app#handleProtocolUrl() opening protocol url as window:', windowOpenableFromProtocolUrl, uri.toString(true));
                const window = (await windowsMainService.open({
                    context: 6 /* OpenContext.LINK */,
                    cli: { ...this.environmentMainService.args },
                    urisToOpen: [windowOpenableFromProtocolUrl],
                    forceNewWindow: shouldOpenInNewWindow,
                    gotoLineMode: true,
                    // remoteAuthority: will be determined based on windowOpenableFromProtocolUrl
                })).at(0);
                window?.focus(); // this should help ensuring that the right window gets focus when multiple are opened
                return true;
            }
        }
        // ...or if we should open in a new window and then handle it within that window
        if (shouldOpenInNewWindow) {
            this.logService.trace('app#handleProtocolUrl() opening empty window and passing in protocol url:', uri.toString(true));
            const window = (await windowsMainService.open({
                context: 6 /* OpenContext.LINK */,
                cli: { ...this.environmentMainService.args },
                forceNewWindow: true,
                forceEmpty: true,
                gotoLineMode: true,
                remoteAuthority: getRemoteAuthority(uri),
            })).at(0);
            await window?.ready();
            return urlService.open(uri, options);
        }
        this.logService.trace('app#handleProtocolUrl(): not handled', uri.toString(true), options);
        return false;
    }
    setupSharedProcess(machineId, sqmId, devDeviceId) {
        const sharedProcess = this._register(this.mainInstantiationService.createInstance(SharedProcess, machineId, sqmId, devDeviceId));
        this._register(sharedProcess.onDidCrash(() => this.windowsMainService?.sendToFocused('vscode:reportSharedProcessCrash')));
        const sharedProcessClient = (async () => {
            this.logService.trace('Main->SharedProcess#connect');
            const port = await sharedProcess.connect();
            this.logService.trace('Main->SharedProcess#connect: connection established');
            return new MessagePortClient(port, 'main');
        })();
        const sharedProcessReady = (async () => {
            await sharedProcess.whenReady();
            return sharedProcessClient;
        })();
        return { sharedProcessReady, sharedProcessClient };
    }
    async initServices(machineId, sqmId, devDeviceId, sharedProcessReady) {
        const services = new ServiceCollection();
        // Update
        switch (process.platform) {
            case 'win32':
                services.set(IUpdateService, new SyncDescriptor(Win32UpdateService));
                break;
            case 'linux':
                if (isLinuxSnap) {
                    services.set(IUpdateService, new SyncDescriptor(SnapUpdateService, [
                        process.env['SNAP'],
                        process.env['SNAP_REVISION'],
                    ]));
                }
                else {
                    services.set(IUpdateService, new SyncDescriptor(LinuxUpdateService));
                }
                break;
            case 'darwin':
                services.set(IUpdateService, new SyncDescriptor(DarwinUpdateService));
                break;
        }
        // Windows
        services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, sqmId, devDeviceId, this.userEnv], false));
        services.set(IAuxiliaryWindowsMainService, new SyncDescriptor(AuxiliaryWindowsMainService, undefined, false));
        // Dialogs
        const dialogMainService = new DialogMainService(this.logService, this.productService);
        services.set(IDialogMainService, dialogMainService);
        // Launch
        services.set(ILaunchMainService, new SyncDescriptor(LaunchMainService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsMainService, new SyncDescriptor(DiagnosticsMainService, undefined, false /* proxied to other processes */));
        services.set(IDiagnosticsService, ProxyChannel.toService(getDelayedChannel(sharedProcessReady.then((client) => client.getChannel('diagnostics')))));
        // Process
        services.set(IProcessMainService, new SyncDescriptor(ProcessMainService, [this.userEnv]));
        // Encryption
        services.set(IEncryptionMainService, new SyncDescriptor(EncryptionMainService));
        // Keyboard Layout
        services.set(IKeyboardLayoutMainService, new SyncDescriptor(KeyboardLayoutMainService));
        // Native Host
        services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService, undefined, false /* proxied to other processes */));
        // Web Contents Extractor
        services.set(IWebContentExtractorService, new SyncDescriptor(NativeWebContentExtractorService, undefined, false /* proxied to other processes */));
        // Webview Manager
        services.set(IWebviewManagerService, new SyncDescriptor(WebviewMainService));
        // Menubar
        services.set(IMenubarMainService, new SyncDescriptor(MenubarMainService));
        // Extension Host Starter
        services.set(IExtensionHostStarter, new SyncDescriptor(ExtensionHostStarter));
        // Storage
        services.set(IStorageMainService, new SyncDescriptor(StorageMainService));
        services.set(IApplicationStorageMainService, new SyncDescriptor(ApplicationStorageMainService));
        // Terminal
        const ptyHostStarter = new ElectronPtyHostStarter({
            graceTime: 60000 /* LocalReconnectConstants.GraceTime */,
            shortGraceTime: 6000 /* LocalReconnectConstants.ShortGraceTime */,
            scrollback: this.configurationService.getValue("terminal.integrated.persistentSessionScrollback" /* TerminalSettingId.PersistentSessionScrollback */) ?? 100,
        }, this.configurationService, this.environmentMainService, this.lifecycleMainService, this.logService);
        const ptyHostService = new PtyHostService(ptyHostStarter, this.configurationService, this.logService, this.loggerService);
        services.set(ILocalPtyService, ptyHostService);
        // External terminal
        if (isWindows) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(WindowsExternalTerminalService));
        }
        else if (isMacintosh) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(MacExternalTerminalService));
        }
        else if (isLinux) {
            services.set(IExternalTerminalMainService, new SyncDescriptor(LinuxExternalTerminalService));
        }
        // Backups
        const backupMainService = new BackupMainService(this.environmentMainService, this.configurationService, this.logService, this.stateService);
        services.set(IBackupMainService, backupMainService);
        // Workspaces
        const workspacesManagementMainService = new WorkspacesManagementMainService(this.environmentMainService, this.logService, this.userDataProfilesMainService, backupMainService, dialogMainService);
        services.set(IWorkspacesManagementMainService, workspacesManagementMainService);
        services.set(IWorkspacesService, new SyncDescriptor(WorkspacesMainService, undefined, false /* proxied to other processes */));
        services.set(IWorkspacesHistoryMainService, new SyncDescriptor(WorkspacesHistoryMainService, undefined, false));
        // URL handling
        services.set(IURLService, new SyncDescriptor(NativeURLService, undefined, false /* proxied to other processes */));
        // Telemetry
        if (supportsTelemetry(this.productService, this.environmentMainService)) {
            const isInternal = isInternalTelemetry(this.productService, this.configurationService);
            const channel = getDelayedChannel(sharedProcessReady.then((client) => client.getChannel('telemetryAppender')));
            const appender = new TelemetryAppenderClient(channel);
            const commonProperties = resolveCommonProperties(release(), hostname(), process.arch, this.productService.commit, this.productService.version, machineId, sqmId, devDeviceId, isInternal);
            const piiPaths = getPiiPathsFromEnvironment(this.environmentMainService);
            const config = {
                appenders: [appender],
                commonProperties,
                piiPaths,
                sendErrorTelemetry: true,
            };
            services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
        }
        else {
            services.set(ITelemetryService, NullTelemetryService);
        }
        // Void main process services (required for services with a channel for comm between browser and electron-main (node))
        services.set(IMetricsService, new SyncDescriptor(MetricsMainService, undefined, false));
        services.set(IVoidUpdateService, new SyncDescriptor(VoidMainUpdateService, undefined, false));
        services.set(IVoidSCMService, new SyncDescriptor(VoidSCMService, undefined, false));
        // Default Extensions Profile Init
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        // Utility Process Worker
        services.set(IUtilityProcessWorkerMainService, new SyncDescriptor(UtilityProcessWorkerMainService, undefined, true));
        // Proxy Auth
        services.set(IProxyAuthService, new SyncDescriptor(ProxyAuthService));
        // MCP
        services.set(INativeMcpDiscoveryHelperService, new SyncDescriptor(NativeMcpDiscoveryHelperService));
        // Dev Only: CSS service (for ESM)
        services.set(ICSSDevelopmentService, new SyncDescriptor(CSSDevelopmentService, undefined, true));
        // Init services that require it
        await Promises.settled([
            backupMainService.initialize(),
            workspacesManagementMainService.initialize(),
        ]);
        return this.mainInstantiationService.createChild(services);
    }
    initChannels(accessor, mainProcessElectronServer, sharedProcessClient) {
        // Channels registered to node.js are exposed to second instances
        // launching because that is the only way the second instance
        // can talk to the first instance. Electron IPC does not work
        // across apps until `requestSingleInstance` APIs are adopted.
        const disposables = this._register(new DisposableStore());
        const launchChannel = ProxyChannel.fromService(accessor.get(ILaunchMainService), disposables, {
            disableMarshalling: true,
        });
        this.mainProcessNodeIpcServer.registerChannel('launch', launchChannel);
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsMainService), disposables, { disableMarshalling: true });
        this.mainProcessNodeIpcServer.registerChannel('diagnostics', diagnosticsChannel);
        // Policies (main & shared process)
        const policyChannel = disposables.add(new PolicyChannel(accessor.get(IPolicyService)));
        mainProcessElectronServer.registerChannel('policy', policyChannel);
        sharedProcessClient.then((client) => client.registerChannel('policy', policyChannel));
        // Local Files
        const diskFileSystemProvider = this.fileService.getProvider(Schemas.file);
        assertType(diskFileSystemProvider instanceof DiskFileSystemProvider);
        const fileSystemProviderChannel = disposables.add(new DiskFileSystemProviderChannel(diskFileSystemProvider, this.logService, this.environmentMainService));
        mainProcessElectronServer.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel);
        sharedProcessClient.then((client) => client.registerChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME, fileSystemProviderChannel));
        // User Data Profiles
        const userDataProfilesService = ProxyChannel.fromService(accessor.get(IUserDataProfilesMainService), disposables);
        mainProcessElectronServer.registerChannel('userDataProfiles', userDataProfilesService);
        sharedProcessClient.then((client) => client.registerChannel('userDataProfiles', userDataProfilesService));
        // Update
        const updateChannel = new UpdateChannel(accessor.get(IUpdateService));
        mainProcessElectronServer.registerChannel('update', updateChannel);
        // Process
        const processChannel = ProxyChannel.fromService(accessor.get(IProcessMainService), disposables);
        mainProcessElectronServer.registerChannel('process', processChannel);
        // Encryption
        const encryptionChannel = ProxyChannel.fromService(accessor.get(IEncryptionMainService), disposables);
        mainProcessElectronServer.registerChannel('encryption', encryptionChannel);
        // Signing
        const signChannel = ProxyChannel.fromService(accessor.get(ISignService), disposables);
        mainProcessElectronServer.registerChannel('sign', signChannel);
        // Keyboard Layout
        const keyboardLayoutChannel = ProxyChannel.fromService(accessor.get(IKeyboardLayoutMainService), disposables);
        mainProcessElectronServer.registerChannel('keyboardLayout', keyboardLayoutChannel);
        // Native host (main & shared process)
        this.nativeHostMainService = accessor.get(INativeHostMainService);
        const nativeHostChannel = ProxyChannel.fromService(this.nativeHostMainService, disposables);
        mainProcessElectronServer.registerChannel('nativeHost', nativeHostChannel);
        sharedProcessClient.then((client) => client.registerChannel('nativeHost', nativeHostChannel));
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(IWebContentExtractorService), disposables);
        mainProcessElectronServer.registerChannel('webContentExtractor', webContentExtractorChannel);
        // Workspaces
        const workspacesChannel = ProxyChannel.fromService(accessor.get(IWorkspacesService), disposables);
        mainProcessElectronServer.registerChannel('workspaces', workspacesChannel);
        // Menubar
        const menubarChannel = ProxyChannel.fromService(accessor.get(IMenubarMainService), disposables);
        mainProcessElectronServer.registerChannel('menubar', menubarChannel);
        // URL handling
        const urlChannel = ProxyChannel.fromService(accessor.get(IURLService), disposables);
        mainProcessElectronServer.registerChannel('url', urlChannel);
        // Webview Manager
        const webviewChannel = ProxyChannel.fromService(accessor.get(IWebviewManagerService), disposables);
        mainProcessElectronServer.registerChannel('webview', webviewChannel);
        // Storage (main & shared process)
        const storageChannel = disposables.add(new StorageDatabaseChannel(this.logService, accessor.get(IStorageMainService)));
        mainProcessElectronServer.registerChannel('storage', storageChannel);
        sharedProcessClient.then((client) => client.registerChannel('storage', storageChannel));
        // Profile Storage Changes Listener (shared process)
        const profileStorageListener = disposables.add(new ProfileStorageChangesListenerChannel(accessor.get(IStorageMainService), accessor.get(IUserDataProfilesMainService), this.logService));
        sharedProcessClient.then((client) => client.registerChannel('profileStorageListener', profileStorageListener));
        // Terminal
        const ptyHostChannel = ProxyChannel.fromService(accessor.get(ILocalPtyService), disposables);
        mainProcessElectronServer.registerChannel(TerminalIpcChannels.LocalPty, ptyHostChannel);
        // External Terminal
        const externalTerminalChannel = ProxyChannel.fromService(accessor.get(IExternalTerminalMainService), disposables);
        mainProcessElectronServer.registerChannel('externalTerminal', externalTerminalChannel);
        // MCP
        const mcpDiscoveryChannel = ProxyChannel.fromService(accessor.get(INativeMcpDiscoveryHelperService), disposables);
        mainProcessElectronServer.registerChannel(NativeMcpDiscoveryHelperChannelName, mcpDiscoveryChannel);
        // Logger
        const loggerChannel = new LoggerChannel(accessor.get(ILoggerMainService));
        mainProcessElectronServer.registerChannel('logger', loggerChannel);
        sharedProcessClient.then((client) => client.registerChannel('logger', loggerChannel));
        // Void - use loggerChannel as reference
        const metricsChannel = ProxyChannel.fromService(accessor.get(IMetricsService), disposables);
        mainProcessElectronServer.registerChannel('void-channel-metrics', metricsChannel);
        const voidUpdatesChannel = ProxyChannel.fromService(accessor.get(IVoidUpdateService), disposables);
        mainProcessElectronServer.registerChannel('void-channel-update', voidUpdatesChannel);
        const sendLLMMessageChannel = new LLMMessageChannel(accessor.get(IMetricsService));
        mainProcessElectronServer.registerChannel('void-channel-llmMessage', sendLLMMessageChannel);
        // Void added this
        const voidSCMChannel = ProxyChannel.fromService(accessor.get(IVoidSCMService), disposables);
        mainProcessElectronServer.registerChannel('void-channel-scm', voidSCMChannel);
        // Void added this
        const mcpChannel = new MCPChannel();
        mainProcessElectronServer.registerChannel('void-channel-mcp', mcpChannel);
        // Extension Host Debug Broadcasting
        const electronExtensionHostDebugBroadcastChannel = new ElectronExtensionHostDebugBroadcastChannel(accessor.get(IWindowsMainService));
        mainProcessElectronServer.registerChannel('extensionhostdebugservice', electronExtensionHostDebugBroadcastChannel);
        // Extension Host Starter
        const extensionHostStarterChannel = ProxyChannel.fromService(accessor.get(IExtensionHostStarter), disposables);
        mainProcessElectronServer.registerChannel(ipcExtensionHostStarterChannelName, extensionHostStarterChannel);
        // Utility Process Worker
        const utilityProcessWorkerChannel = ProxyChannel.fromService(accessor.get(IUtilityProcessWorkerMainService), disposables);
        mainProcessElectronServer.registerChannel(ipcUtilityProcessWorkerChannelName, utilityProcessWorkerChannel);
    }
    async openFirstWindow(accessor, initialProtocolUrls) {
        const windowsMainService = (this.windowsMainService = accessor.get(IWindowsMainService));
        this.auxiliaryWindowsMainService = accessor.get(IAuxiliaryWindowsMainService);
        const context = isLaunchedFromCli(process.env) ? 0 /* OpenContext.CLI */ : 4 /* OpenContext.DESKTOP */;
        const args = this.environmentMainService.args;
        // First check for windows from protocol links to open
        if (initialProtocolUrls) {
            // Openables can open as windows directly
            if (initialProtocolUrls.openables.length > 0) {
                return windowsMainService.open({
                    context,
                    cli: args,
                    urisToOpen: initialProtocolUrls.openables,
                    gotoLineMode: true,
                    initialStartup: true,
                    // remoteAuthority: will be determined based on openables
                });
            }
            // Protocol links with `windowId=_blank` on startup
            // should be handled in a special way:
            // We take the first one of these and open an empty
            // window for it. This ensures we are not restoring
            // all windows of the previous session.
            // If there are any more URLs like these, they will
            // be handled from the URL listeners installed later.
            if (initialProtocolUrls.urls.length > 0) {
                for (const protocolUrl of initialProtocolUrls.urls) {
                    const params = new URLSearchParams(protocolUrl.uri.query);
                    if (params.get('windowId') === '_blank') {
                        // It is important here that we remove `windowId=_blank` from
                        // this URL because here we open an empty window for it.
                        params.delete('windowId');
                        protocolUrl.originalUrl = protocolUrl.uri.toString(true);
                        protocolUrl.uri = protocolUrl.uri.with({ query: params.toString() });
                        return windowsMainService.open({
                            context,
                            cli: args,
                            forceNewWindow: true,
                            forceEmpty: true,
                            gotoLineMode: true,
                            initialStartup: true,
                            // remoteAuthority: will be determined based on openables
                        });
                    }
                }
            }
        }
        const macOpenFiles = global.macOpenFiles;
        const hasCliArgs = args._.length;
        const hasFolderURIs = !!args['folder-uri'];
        const hasFileURIs = !!args['file-uri'];
        const noRecentEntry = args['skip-add-to-recently-opened'] === true;
        const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;
        const remoteAuthority = args.remote || undefined;
        const forceProfile = args.profile;
        const forceTempProfile = args['profile-temp'];
        // Started without file/folder arguments
        if (!hasCliArgs && !hasFolderURIs && !hasFileURIs) {
            // Force new window
            if (args['new-window'] || forceProfile || forceTempProfile) {
                return windowsMainService.open({
                    context,
                    cli: args,
                    forceNewWindow: true,
                    forceEmpty: true,
                    noRecentEntry,
                    waitMarkerFileURI,
                    initialStartup: true,
                    remoteAuthority,
                    forceProfile,
                    forceTempProfile,
                });
            }
            // mac: open-file event received on startup
            if (macOpenFiles.length) {
                return windowsMainService.open({
                    context: 1 /* OpenContext.DOCK */,
                    cli: args,
                    urisToOpen: macOpenFiles.map((path) => {
                        path = normalizeNFC(path); // macOS only: normalize paths to NFC form
                        return hasWorkspaceFileExtension(path)
                            ? { workspaceUri: URI.file(path) }
                            : { fileUri: URI.file(path) };
                    }),
                    noRecentEntry,
                    waitMarkerFileURI,
                    initialStartup: true,
                    // remoteAuthority: will be determined based on macOpenFiles
                });
            }
        }
        // default: read paths from cli
        return windowsMainService.open({
            context,
            cli: args,
            forceNewWindow: args['new-window'],
            diffMode: args.diff,
            mergeMode: args.merge,
            noRecentEntry,
            waitMarkerFileURI,
            gotoLineMode: args.goto,
            initialStartup: true,
            remoteAuthority,
            forceProfile,
            forceTempProfile,
        });
    }
    afterWindowOpen() {
        // Windows: mutex
        this.installMutex();
        // Remote Authorities
        protocol.registerHttpProtocol(Schemas.vscodeRemoteResource, (request, callback) => {
            callback({
                url: request.url.replace(/^vscode-remote-resource:/, 'http:'),
                method: request.method,
            });
        });
        // Start to fetch shell environment (if needed) after window has opened
        // Since this operation can take a long time, we want to warm it up while
        // the window is opening.
        // We also show an error to the user in case this fails.
        this.resolveShellEnvironment(this.environmentMainService.args, process.env, true);
        // Crash reporter
        this.updateCrashReporterEnablement();
        // macOS: rosetta translation warning
        if (isMacintosh && app.runningUnderARM64Translation) {
            this.windowsMainService?.sendToFocused('vscode:showTranslatedBuildWarning');
        }
    }
    async installMutex() {
        const win32MutexName = this.productService.win32MutexName;
        if (isWindows && win32MutexName) {
            try {
                const WindowsMutex = await import('@vscode/windows-mutex');
                const mutex = new WindowsMutex.Mutex(win32MutexName);
                Event.once(this.lifecycleMainService.onWillShutdown)(() => mutex.release());
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async resolveShellEnvironment(args, env, notifyOnError) {
        try {
            return await getResolvedShellEnv(this.configurationService, this.logService, args, env);
        }
        catch (error) {
            const errorMessage = toErrorMessage(error);
            if (notifyOnError) {
                this.windowsMainService?.sendToFocused('vscode:showResolveShellEnvError', errorMessage);
            }
            else {
                this.logService.error(errorMessage);
            }
        }
        return {};
    }
    async updateCrashReporterEnablement() {
        // If enable-crash-reporter argv is undefined then this is a fresh start,
        // based on `telemetry.enableCrashreporter` settings, generate a UUID which
        // will be used as crash reporter id and also update the json file.
        try {
            const argvContent = await this.fileService.readFile(this.environmentMainService.argvResource);
            const argvString = argvContent.value.toString();
            const argvJSON = parse(argvString);
            const telemetryLevel = getTelemetryLevel(this.configurationService);
            const enableCrashReporter = telemetryLevel >= 1 /* TelemetryLevel.CRASH */;
            // Initial startup
            if (argvJSON['enable-crash-reporter'] === undefined) {
                const additionalArgvContent = [
                    '',
                    '	// Allows to disable crash reporting.',
                    '	// Should restart the app if the value is changed.',
                    `	"enable-crash-reporter": ${enableCrashReporter},`,
                    '',
                    '	// Unique id used for correlating crash reports sent from this instance.',
                    '	// Do not edit this value.',
                    `	"crash-reporter-id": "${generateUuid()}"`,
                    '}',
                ];
                const newArgvString = argvString
                    .substring(0, argvString.length - 2)
                    .concat(',\n', additionalArgvContent.join('\n'));
                await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
            }
            // Subsequent startup: update crash reporter value if changed
            else {
                const newArgvString = argvString.replace(/"enable-crash-reporter": .*,/, `"enable-crash-reporter": ${enableCrashReporter},`);
                if (newArgvString !== argvString) {
                    await this.fileService.writeFile(this.environmentMainService.argvResource, VSBuffer.fromString(newArgvString));
                }
            }
        }
        catch (error) {
            this.logService.error(error);
            // Inform the user via notification
            this.windowsMainService?.sendToFocused('vscode:showArgvParseWarning');
        }
    }
    eventuallyAfterWindowOpen() {
        // Validate Device ID is up to date (delay this as it has shown significant perf impact)
        // Refs: https://github.com/microsoft/vscode/issues/234064
        validatedevDeviceId(this.stateService, this.logService);
    }
};
CodeApplication = CodeApplication_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService),
    __param(4, ILoggerService),
    __param(5, IEnvironmentMainService),
    __param(6, ILifecycleMainService),
    __param(7, IConfigurationService),
    __param(8, IStateService),
    __param(9, IFileService),
    __param(10, IProductService),
    __param(11, IUserDataProfilesMainService)
], CodeApplication);
export { CodeApplication };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi1tYWluL2FwcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFXLGlCQUFpQixFQUFnQixNQUFNLFVBQVUsQ0FBQTtBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdkQsT0FBTyxFQUVOLE9BQU8sRUFDUCxXQUFXLEVBQ1gsV0FBVyxFQUNYLFNBQVMsRUFDVCxFQUFFLEdBQ0YsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDakcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHVCQUF1QixHQUN2QixNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsa0JBQWtCLEdBQ2xCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFFeEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDNUcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDM0UsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixrQ0FBa0MsR0FDbEMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNoSCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDBCQUEwQixFQUMxQiw4QkFBOEIsR0FDOUIsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDbEgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHlCQUF5QixHQUN6QixNQUFNLDBFQUEwRSxDQUFBO0FBQ2pGLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsaUJBQWlCLEdBQ2pCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUNOLHFCQUFxQixHQUdyQixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixrQkFBa0IsR0FDbEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHFCQUFxQixHQUNyQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDhCQUE4QixFQUM5QixtQkFBbUIsRUFDbkIsa0JBQWtCLEdBQ2xCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLDhDQUE4QyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixnQkFBZ0IsR0FDaEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLGlCQUFpQixHQUNqQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDakcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFtQixXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMvRixPQUFPLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixHQUVqQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsbUJBQW1CLEdBRW5CLE1BQU0saURBQWlELENBQUE7QUFFeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qiw0QkFBNEIsR0FDNUIsTUFBTSx5RUFBeUUsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLCtCQUErQixHQUMvQixNQUFNLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDekUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDOUcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sOEVBQThFLENBQUE7QUFDL0gsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDakgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDOUcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDakgsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDaEksT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzFGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLGtCQUFrQixFQUNsQixtQkFBbUIsR0FDbkIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUM1SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFdEYsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQywrQkFBK0IsR0FDL0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN4SCxPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLG1CQUFtQixHQUVuQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLG9DQUFvQyxFQUVwQyx3QkFBd0IsR0FDeEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDaEQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDL0csT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDekgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIscUJBQXFCLEdBQ3JCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxtQ0FBbUMsR0FDbkMsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUNqSSxPQUFPLGNBQWMsTUFBTSwwREFBMEQsQ0FBQTtBQUVyRixnQ0FBZ0M7QUFDaEMsaUNBQWlDO0FBQ2pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNyRjs7O0dBR0c7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFVBQVU7O2FBQ3RCLHdEQUFtRCxHQUFHO1FBQzdFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLDZDQUFzRDtRQUN0RSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSw4Q0FBdUQ7S0FDL0UsQUFIMEUsQ0FHMUU7SUFNRCxZQUNrQix3QkFBdUMsRUFDdkMsT0FBNEIsRUFDTCx3QkFBK0MsRUFDekQsVUFBdUIsRUFDcEIsYUFBNkIsRUFDcEIsc0JBQStDLEVBQ2pELG9CQUEyQyxFQUMzQyxvQkFBMkMsRUFDbkQsWUFBMkIsRUFDNUIsV0FBeUIsRUFDdEIsY0FBK0IsRUFFaEQsMkJBQXlEO1FBRTFFLEtBQUssRUFBRSxDQUFBO1FBZFUsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUFlO1FBQ3ZDLFlBQU8sR0FBUCxPQUFPLENBQXFCO1FBQ0wsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUF1QjtRQUN6RCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3BCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNwQiwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQ2pELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUM1QixnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN0QixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFFaEQsZ0NBQTJCLEdBQTNCLDJCQUEyQixDQUE4QjtRQUkxRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUN2QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLG1GQUFtRjtRQUNuRixFQUFFO1FBQ0YsNkRBQTZEO1FBQzdELEVBQUU7UUFFRixNQUFNLGVBQWUsR0FBRyxDQUFDLGFBQWtDLEVBQUUsRUFBRSxDQUM5RCxhQUFhLEVBQUUsVUFBVSxDQUFDLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixNQUFNLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUNqRixNQUFNLGdCQUFnQixHQUFHLENBQUMsYUFBaUMsRUFBRSxFQUFFLENBQzlELGFBQWEsRUFBRSxVQUFVLENBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxLQUFLLENBQUMsQ0FBQTtRQUV6RCxNQUFNLDJCQUEyQixHQUFHLElBQUksR0FBRyxDQUFDO1lBQzNDLGdCQUFnQjtZQUNoQiwyQkFBMkI7WUFDM0IsaUVBQWlFO1lBQ2pFLG9EQUFvRDtZQUNwRCxnQ0FBZ0M7U0FDaEMsQ0FBQyxDQUFBO1FBRUYsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztZQUN4QyxPQUFPO1lBQ1AsYUFBYTtZQUNiLGlFQUFpRTtZQUNqRSxvREFBb0Q7WUFDcEQsZ0NBQWdDO1NBQ2hDLENBQUMsQ0FBQTtRQUVGLE9BQU8sQ0FBQyxjQUFjLENBQUMsMkJBQTJCLENBQ2pELENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0MsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsT0FBTyxRQUFRLENBQUMsMkJBQTJCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7WUFDN0QsQ0FBQztZQUNELElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUM1QyxPQUFPLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkIsQ0FBQyxDQUNELENBQUE7UUFFRCxPQUFPLENBQUMsY0FBYyxDQUFDLHlCQUF5QixDQUMvQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQzlDLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7Z0JBQzdDLE9BQU8sMkJBQTJCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ25ELENBQUM7WUFDRCxJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDaEQsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUNELENBQUE7UUFFRCxZQUFZO1FBRVosMkJBQTJCO1FBRTNCLGtEQUFrRDtRQUNsRCxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxJQUFJO1lBQ1osT0FBTyxDQUFDLGtCQUFrQjtZQUMxQixPQUFPLENBQUMsb0JBQW9CO1lBQzVCLE9BQU8sQ0FBQywyQkFBMkI7WUFDbkMsVUFBVTtTQUNWLENBQUMsQ0FBQTtRQUVGLHlEQUF5RDtRQUN6RCxNQUFNLFdBQVcsR0FBRyxDQUFDLFlBQTZDLEVBQVcsRUFBRTtZQUM5RSxLQUFLLElBQUksS0FBSyxHQUFvQyxZQUFZLEVBQUUsS0FBSyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzdGLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxPQUFPLENBQUMsYUFBYSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN6RCxPQUFPLElBQUksQ0FBQTtnQkFDWixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQyxDQUFBO1FBRUQsTUFBTSwyQkFBMkIsR0FBRyxDQUNuQyxPQUE0RixFQUNsRixFQUFFO1lBQ1osT0FBTyxPQUFPLENBQUMsWUFBWSxLQUFLLEtBQUssSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BFLENBQUMsQ0FBQTtRQUVELE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxPQUFnRCxFQUFFLEVBQUU7WUFDdkYsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtZQUMzQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3hDLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELG1IQUFtSDtZQUNuSCxNQUFNLE9BQU8sR0FBRywrQkFBK0IsRUFBRSxDQUFBO1lBQ2pELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQzlCLElBQUksS0FBSyxDQUFDLFNBQVMsS0FBSyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDaEUsT0FBTyxJQUFJLENBQUE7Z0JBQ1osQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUMsQ0FBQTtRQUVELE1BQU0sdUJBQXVCLEdBQUcsQ0FDL0IsR0FBUSxFQUNSLE9BQWdELEVBQ3RDLEVBQUU7WUFDWixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sSUFBSSxDQUFBLENBQUMsdURBQXVEO1lBQ3BFLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFBO1lBQzNCLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQseUVBQXlFO1lBQ3pFLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQzNELElBQUksTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDO29CQUNoQixJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssTUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUNwRSxPQUFPLElBQUksQ0FBQTtvQkFDWixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDLENBQUE7UUFFRCxPQUFPLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDdkUsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEMsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUM1QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3BFLE9BQU8sUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUMvQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDMUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUNqRSxPQUFPLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUNsQyxDQUFDO1lBQ0YsQ0FBQztZQUVELGtCQUFrQjtZQUNsQixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDN0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3hCLE9BQU8sUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNuRSxDQUFDO1lBQ0YsQ0FBQztZQUVELE9BQU8sUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDbkMsQ0FBQyxDQUFDLENBQUE7UUFFRiw2Q0FBNkM7UUFDN0MsbURBQW1EO1FBQ25ELE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3pFLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxlQUFvRCxDQUFBO1lBQ3BGLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxjQUFjLENBQUMsSUFBSSxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUE7WUFFdkYsSUFBSSxZQUFZLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDbEMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUMvQixJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQzt3QkFDekMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7d0JBRW5ELE9BQU8sUUFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFBO29CQUNwRCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQscURBQXFEO2dCQUNyRCx1REFBdUQ7Z0JBQ3ZELElBQ0MsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7b0JBQ2hELFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsRUFDbEYsQ0FBQztvQkFDRixPQUFPLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDbkUsQ0FBQztZQUNGLENBQUM7WUFFRCxPQUFPLFFBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ25DLENBQUMsQ0FBQyxDQUFBO1FBRUYsWUFBWTtRQUVaLHFDQUFxQztRQUVyQyxpRUFBaUU7UUFDakUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDekUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw2Q0FBNkMsQ0FBQyxFQUFFLENBQUM7Z0JBQzNFLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFFdEUsSUFBSSxlQUFlLENBQUMsNkJBQTZCLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDbEUsZUFBZSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDdEQsT0FBTyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUE7Z0JBQ3BELENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxRQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNuQyxDQUFDLENBQUMsQ0FBQTtRQWNGLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxjQUE0RCxDQUFBO1FBQzNGLElBQ0MsT0FBTyxjQUFjLENBQUMsZ0JBQWdCLEtBQUssVUFBVTtZQUNyRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsYUFBYSxFQUN4QyxDQUFDO1lBQ0Ysb0RBQW9EO1lBQ3BELGlEQUFpRDtZQUNqRCw2Q0FBNkM7WUFDN0Msc0RBQXNEO1lBQ3RELGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQzNGLENBQUM7UUFFRCxZQUFZO1FBRVosc0NBQXNDO1FBRXRDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztnQkFDaEYsNEJBQTRCLEVBQUUsQ0FBQTtZQUMvQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AscUJBQXFCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUE7WUFDdEYsQ0FBQztRQUNGLENBQUM7UUFFRCxZQUFZO0lBQ2IsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixzQkFBc0I7UUFDdEIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFFMUUsOEJBQThCO1FBQzlCLDJCQUEyQixFQUFFLENBQUE7UUFFN0IsNkJBQTZCO1FBQzdCLEdBQUcsQ0FBQyxFQUFFLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsRUFBRTtZQUM5RSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxDQUNqQyxvQ0FBb0MsRUFDcEMsMkJBQTJCLENBQzNCLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLHNCQUFzQjtRQUN0QixHQUFHLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLEVBQUU7WUFDckQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7WUFFckMsd0RBQXdEO1lBQ3hELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUN4QixNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsRUFBRSxPQUFPLDBCQUFrQixFQUFFLENBQUMsQ0FBQTtZQUM5RSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixtRkFBbUY7UUFDbkYsRUFBRTtRQUNGLDZEQUE2RDtRQUM3RCxFQUFFO1FBQ0YsR0FBRyxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNsRCx3REFBd0Q7WUFDeEQsSUFDQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxFQUN2RixDQUFDO2dCQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQiw0RUFBNEUsQ0FDNUUsQ0FBQTtnQkFFRCxJQUFJLENBQUMsMkJBQTJCLEVBQUUsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzNELENBQUM7WUFFRCwrQkFBK0I7WUFDL0IsUUFBUSxDQUFDLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsNERBQTRELENBQUMsQ0FBQTtnQkFFbkYsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ3ZCLENBQUMsQ0FBQyxDQUFBO1lBRUYsZ0VBQWdFO1lBQ2hFLDBDQUEwQztZQUMxQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDekMsbUVBQW1FO2dCQUNuRSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEtBQUssYUFBYSxFQUFFLENBQUM7b0JBQ25DLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixpR0FBaUcsQ0FDakcsQ0FBQTtvQkFFRCxPQUFPO3dCQUNOLE1BQU0sRUFBRSxPQUFPO3dCQUNmLDRCQUE0QixFQUFFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxZQUFZLENBQUMsT0FBTyxDQUFDO3FCQUNyRixDQUFBO2dCQUNGLENBQUM7Z0JBRUQsZ0NBQWdDO3FCQUMzQixDQUFDO29CQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQix1RUFBdUUsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUNyRixDQUFBO29CQUVELElBQUksQ0FBQyxxQkFBcUIsRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFFaEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQTtnQkFDMUIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixZQUFZO1FBRVosSUFBSSxlQUFlLEdBQXNCLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLGNBQWMsR0FBK0IsU0FBUyxDQUFBO1FBQzFELEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ25DLElBQUksR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQywwQ0FBMEM7WUFFcEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBRXRCLHlDQUF5QztZQUN6QyxlQUFlLENBQUMsSUFBSSxDQUNuQix5QkFBeUIsQ0FBQyxJQUFJLENBQUM7Z0JBQzlCLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUM5QixDQUFBO1lBRUQsZ0NBQWdDO1lBQ2hDLElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNsQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUE7Z0JBQzVCLGNBQWMsR0FBRyxTQUFTLENBQUE7WUFDM0IsQ0FBQztZQUVELGdEQUFnRDtZQUNoRCxjQUFjLEdBQUcsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUN0QyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUM7b0JBQ25DLE9BQU8sMEJBQWtCLENBQUMsMERBQTBEO29CQUNwRixHQUFHLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUk7b0JBQ3JDLFVBQVUsRUFBRSxlQUFlO29CQUMzQixZQUFZLEVBQUUsS0FBSztvQkFDbkIsZUFBZSxFQUFFLElBQUksQ0FBQyxpRkFBaUY7aUJBQ3ZHLENBQUMsQ0FBQTtnQkFFRixlQUFlLEdBQUcsRUFBRSxDQUFBO2dCQUNwQixjQUFjLEdBQUcsU0FBUyxDQUFBO1lBQzNCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNSLENBQUMsQ0FBQyxDQUFBO1FBRUYsR0FBRyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN2QyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxlQUFlLENBQUMsRUFBRSxPQUFPLDZCQUFxQixFQUFFLENBQUMsQ0FBQSxDQUFDLDZCQUE2QjtRQUMvRyxDQUFDLENBQUMsQ0FBQTtRQUVGLGdDQUFnQztRQUVoQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN6RCx3REFBd0Q7WUFDeEQsb0RBQW9EO1lBQ3BELHFEQUFxRDtZQUNyRCx3REFBd0Q7WUFDeEQsd0NBQXdDO1lBQ3hDLEVBQUU7WUFDRixzREFBc0Q7WUFDdEQsNENBQTRDO1lBQzVDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUEsQ0FBQyx1REFBdUQ7WUFDcEksSUFBSSxJQUFzQixDQUFBO1lBQzFCLElBQUksR0FBd0IsQ0FBQTtZQUM1QixJQUFJLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUE7Z0JBQ3BCLEdBQUcsR0FBRyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFBO2dCQUN2QyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQTtZQUNsQixDQUFDO1lBRUQsb0JBQW9CO1lBQ3BCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUFDLENBQUE7UUFFRixnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQTtRQUN0RixnQkFBZ0IsQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUVsRixnQkFBZ0IsQ0FBQyxFQUFFLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUU1RSxnQkFBZ0IsQ0FBQyxNQUFNLENBQ3RCLHdCQUF3QixFQUN4QixLQUFLLEVBQUUsS0FBSyxFQUFFLFNBQTZCLEVBQUUsRUFBRTtZQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsc0JBQXNCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzVFLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQyxDQUNELENBQUE7UUFFRCxZQUFZO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPO1FBQ1osSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFaEUsZ0VBQWdFO1FBQ2hFLCtEQUErRDtRQUMvRCxpRUFBaUU7UUFDakUsNkNBQTZDO1FBQzdDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQTtRQUNuRSxJQUFJLFNBQVMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3RDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxpQ0FBaUM7UUFDakMsdUVBQXVFO1FBQ3ZFLHlFQUF5RTtRQUN6RSx3Q0FBd0M7UUFDeEMsb0VBQW9FO1FBQ3BFLCtFQUErRTtRQUMvRSxJQUFJLENBQUM7WUFDSixJQUNDLFdBQVc7Z0JBQ1gsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLElBQUk7Z0JBQ2hFLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLFNBQVMsQ0FBQyxFQUN0RSxDQUFDO2dCQUNGLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxTQUFTLEVBQUUsSUFBVyxDQUFDLENBQUE7WUFDcEYsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCwyQ0FBMkM7UUFDM0MsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7UUFDekQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRCxJQUFJLENBQUMsQ0FBQyxNQUFNLGdDQUF3QixFQUFFLENBQUM7Z0JBQ3RDLG1EQUFtRDtnQkFDbkQsaURBQWlEO2dCQUNqRCxrREFBa0Q7Z0JBQ2xELGtEQUFrRDtnQkFDbEQsV0FBVztnQkFDWCx5QkFBeUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDekQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ3BELFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDaEQsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDO1NBQ3RELENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBRWxFLGlCQUFpQjtRQUNqQixNQUFNLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQzFFLFNBQVMsRUFDVCxLQUFLLEVBQ0wsV0FBVyxDQUNYLENBQUE7UUFFRCxXQUFXO1FBQ1gsTUFBTSx1QkFBdUIsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQ3RELFNBQVMsRUFDVCxLQUFLLEVBQ0wsV0FBVyxFQUNYLGtCQUFrQixDQUNsQixDQUFBO1FBRUQsa0JBQWtCO1FBQ2xCLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ25ELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FDOUUsQ0FDRCxDQUFBO1FBRUQsZUFBZTtRQUNmLHVCQUF1QixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFFckYsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtRQUUvRSxnQkFBZ0I7UUFDaEIsdUJBQXVCLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDbkQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUseUJBQXlCLEVBQUUsbUJBQW1CLENBQUMsQ0FDM0UsQ0FBQTtRQUVELDhCQUE4QjtRQUM5QixNQUFNLG1CQUFtQixHQUFHLE1BQU0sdUJBQXVCLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDckYsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxDQUNsRSxDQUFBO1FBRUQsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBRXBFLG9EQUFvRDtRQUNwRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxtQ0FBMkIsQ0FBQTtRQUUxRCxlQUFlO1FBQ2YsTUFBTSx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN6RCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxtQkFBbUIsQ0FBQyxDQUNuRCxDQUFBO1FBRUQsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLDZDQUFxQyxDQUFBO1FBRXBFLDBCQUEwQjtRQUMxQixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFdEIsK0ZBQStGO1FBQy9GLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDekIsSUFBSSxDQUFDLFNBQVMsQ0FDYixpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQ3RCLDJCQUEyQjtnQkFDM0IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssd0NBQWdDLENBQUE7Z0JBRS9ELG9DQUFvQztnQkFDcEMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7WUFDakMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUNSLENBQUE7UUFDRixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQ1IsQ0FBQTtRQUNELHdCQUF3QixDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCLENBQ3JDLFFBQTBCLEVBQzFCLHlCQUE0QztRQUU1QyxNQUFNLGtCQUFrQixHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDNUMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUI7WUFDeEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsMERBQTBEO1FBQzFELDREQUE0RDtRQUM1RCxzREFBc0Q7UUFFdEQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFBO1FBQ2hCLFVBQVUsQ0FBQyxlQUFlLENBQUM7WUFDMUIsS0FBSyxDQUFDLFNBQVMsQ0FBQyxHQUFRLEVBQUUsT0FBeUI7Z0JBQ2xELE9BQU8sR0FBRyxDQUFDLGlCQUFpQixDQUMzQixrQkFBa0IsRUFDbEIsaUJBQWlCLEVBQ2pCLFVBQVUsRUFDVixHQUFHLEVBQ0gsT0FBTyxDQUNQLENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN6QyxJQUFJLG1CQUFtQixDQUFDO1lBQ3ZCLG1CQUFtQixFQUFFLHFCQUFxQixDQUFDLG1CQUFtQjtZQUM5RCxvQkFBb0IsRUFBRSxxQkFBcUIsQ0FBQyxvQkFBb0I7WUFDaEUsaUJBQWlCLEVBQUUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDcEUsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDbkQsbUJBQW1CLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FDaEUsQ0FBQTtRQUNELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEYsTUFBTSxpQkFBaUIsR0FBRyx5QkFBeUIsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDOUYsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQTtRQUUxRSxNQUFNLG1CQUFtQixHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUNoRSxrQkFBa0IsRUFDbEIsaUJBQWlCLENBQ2pCLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksbUJBQW1CLENBQ3RCLG1CQUFtQixFQUFFLElBQUksRUFDekIsVUFBVSxFQUNWLGtCQUFrQixFQUNsQixJQUFJLENBQUMsc0JBQXNCLEVBQzNCLElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FDRCxDQUFBO1FBRUQsT0FBTyxtQkFBbUIsQ0FBQTtJQUMzQixDQUFDO0lBRU8sb0NBQW9DLENBQUMseUJBQTRDO1FBQ3hGLE1BQU0sUUFBUSxHQUFHLEdBQThCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUMxRixNQUFNLHFCQUFxQixHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUMzQyx5QkFBeUIsQ0FBQyxVQUFVLENBQ25DLGlDQUFpQyxFQUNqQyxJQUFJLHdCQUF3QixFQUFFLENBQzlCLENBQ0QsQ0FBQTtRQUVELFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDMUYsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDbEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQzFDLE9BQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUVELHFCQUFxQixDQUFDLEtBQUs7aUJBQ3pCLElBQUksQ0FBNkIsb0NBQW9DLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDN0UsSUFBSSxDQUNKLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFDOUQsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDbkUsUUFBUSxDQUFDLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNqRCxDQUFDLENBQ0QsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLEtBQUssQ0FBQywwQkFBMEIsQ0FDdkMsa0JBQXVDLEVBQ3ZDLGlCQUFxQztRQUVyQzs7O1dBR0c7UUFFSCw4REFBOEQ7UUFDOUQsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztZQUMvRSxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUM5QyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ0wsSUFBSSwyQkFBMkIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLG1FQUFtRSxFQUNuRSwyQkFBMkIsQ0FDM0IsQ0FBQTtRQUNGLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsTUFBTSxxQkFBcUIsR0FBRyxDQUFPLE1BQU8sQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQWEsQ0FBQTtRQUM3RSxJQUFJLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsNkVBQTZFLEVBQzdFLHFCQUFxQixDQUNyQixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksMkJBQTJCLENBQUMsTUFBTSxHQUFHLHFCQUFxQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3RSxPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLDJCQUEyQixFQUFFLEdBQUcscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMzRixJQUFJLENBQUM7Z0JBQ0osT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQTtZQUNqRCxDQUFDO1lBQUMsTUFBTSxDQUFDO2dCQUNSLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO2dCQUU1RixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixNQUFNLFNBQVMsR0FBc0IsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sSUFBSSxHQUFtQixFQUFFLENBQUE7UUFDL0IsS0FBSyxNQUFNLFdBQVcsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2xCLFNBQVEsQ0FBQyxVQUFVO1lBQ3BCLENBQUM7WUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdFLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3BCLElBQUksTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztvQkFDM0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLDREQUE0RCxFQUM1RCxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDOUIsQ0FBQTtvQkFFRCxTQUFRLENBQUMsVUFBVTtnQkFDcEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixrRkFBa0YsRUFDbEYsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQzlCLGNBQWMsQ0FDZCxDQUFBO29CQUVELFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUEsQ0FBQyw0QkFBNEI7Z0JBQzVELENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLDZGQUE2RixFQUM3RixXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDOUIsQ0FBQTtnQkFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBLENBQUMsK0JBQStCO1lBQ3ZELENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUNoQyxRQUF5QixFQUN6QixrQkFBdUMsRUFDdkMsaUJBQXFDO1FBRXJDLElBQUksV0FBZ0IsQ0FBQTtRQUNwQixJQUFJLE9BQWUsQ0FBQTtRQUNuQixJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUE7WUFDbkMsT0FBTyxHQUFHLFFBQVEsQ0FDakIsNkJBQTZCLEVBQzdCLDhGQUE4RixFQUM5RixXQUFXLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO2dCQUNsQyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUM3RSxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQzdCLENBQUE7UUFDRixDQUFDO2FBQU0sSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQTtZQUNoQyxPQUFPLEdBQUcsUUFBUSxDQUNqQiwwQkFBMEIsRUFDMUIsc0ZBQXNGLEVBQ3RGLFdBQVcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUk7Z0JBQ2xDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQzdFLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUM3QixJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FDN0IsQ0FBQTtRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsV0FBVyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUE7WUFDOUIsT0FBTyxHQUFHLFFBQVEsQ0FDakIsZ0NBQWdDLEVBQ2hDLDhGQUE4RixFQUM5RixXQUFXLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO2dCQUNsQyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUM3RSxDQUFDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFDN0IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQzdCLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEYsK0VBQStFO1lBQy9FLEVBQUU7WUFDRiw4RUFBOEU7WUFDOUUsMkVBQTJFO1lBQzNFLHNDQUFzQztZQUN0QyxFQUFFO1lBQ0YsMEVBQTBFO1lBQzFFLDhEQUE4RDtZQUM5RCxFQUFFO1lBQ0YsK0VBQStFO1lBRS9FLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDNUQsaUJBQWUsQ0FBQyxtREFBbUQsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQ3ZGLENBQUE7UUFDRCxJQUFJLGtCQUFrQixLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2xDLE9BQU8sS0FBSyxDQUFBLENBQUMsMkJBQTJCO1FBQ3pDLENBQUM7UUFFRCxNQUFNLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0saUJBQWlCLENBQUMsY0FBYyxDQUFDO1lBQzVFLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFO2dCQUNSLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQztnQkFDdEUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDO2FBQ3ZFO1lBQ0QsT0FBTztZQUNQLE1BQU0sRUFBRSxRQUFRLENBQ2YsbUJBQW1CLEVBQ25CLCtLQUErSyxDQUMvSztZQUNELGFBQWEsRUFDWixXQUFXLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJO2dCQUNsQyxDQUFDLENBQUMsUUFBUSxDQUFDLG9CQUFvQixFQUFFLDBDQUEwQyxDQUFDO2dCQUM1RSxDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDJDQUEyQyxDQUFDO1lBQ2hGLFFBQVEsRUFBRSxDQUFDO1NBQ1gsQ0FBQyxDQUFBO1FBRUYsSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEIsT0FBTyxJQUFJLENBQUEsQ0FBQyx5QkFBeUI7UUFDdEMsQ0FBQztRQUVELElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsd0VBQXdFO1lBQ3hFLHVFQUF1RTtZQUN2RSx5RUFBeUU7WUFDekUsc0RBQXNEO1lBQ3RELE1BQU0sT0FBTyxHQUFHO2dCQUNmLE9BQU8sRUFBRSx5Q0FBeUM7Z0JBQ2xELElBQUksRUFBRSxXQUFXLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUTthQUM5RCxDQUFBO1lBQ0Qsa0JBQWtCLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9ELGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RFLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQSxDQUFDLDZCQUE2QjtJQUMzQyxDQUFDO0lBRU8sZ0NBQWdDLENBQUMsR0FBUTtRQUNoRCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELFlBQVk7UUFDWixJQUFJLEdBQUcsQ0FBQyxTQUFTLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXBDLElBQUkseUJBQXlCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUNqQyxDQUFDO1lBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQ25CLENBQUM7UUFFRCxjQUFjO2FBQ1QsSUFBSSxHQUFHLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqRCxzQkFBc0I7WUFDdEIsc0VBQXNFO1lBQ3RFLCtEQUErRDtZQUUvRCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO1lBQ3BGLElBQUksU0FBaUIsQ0FBQTtZQUNyQixJQUFJLElBQVksQ0FBQTtZQUNoQixJQUFJLFdBQVcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4QixTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDdkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDakMsSUFBSSxHQUFHLEdBQUcsQ0FBQTtZQUNYLENBQUM7WUFFRCxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFBO1lBQ3JCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3pDLGdEQUFnRDtnQkFDaEQsb0RBQW9EO2dCQUNwRCxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUN6QixLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQzFCLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUMxQixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0JBQzVCLFNBQVM7Z0JBQ1QsSUFBSTtnQkFDSixLQUFLO2dCQUNMLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUTthQUN0QixDQUFDLENBQUE7WUFFRixJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLENBQUE7WUFDbkMsQ0FBQztZQUVELElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUMxQixnQ0FBZ0M7Z0JBQ2hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUE7WUFDOUIsQ0FBQztZQUVELE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUE7UUFDaEMsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQzlCLGtCQUF1QyxFQUN2QyxpQkFBcUMsRUFDckMsVUFBdUIsRUFDdkIsR0FBUSxFQUNSLE9BQXlCO1FBRXpCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFOUUsK0VBQStFO1FBQy9FLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ2hGLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNkLFNBQVMsRUFBRSxNQUFNO2dCQUNqQixJQUFJLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTtnQkFDL0IsS0FBSyxFQUFFLEVBQUU7YUFDVCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxxQkFBcUIsR0FBRyxLQUFLLENBQUE7UUFFakMsaUZBQWlGO1FBQ2pGLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDekMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLG1HQUFtRyxFQUNuRyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUNsQixDQUFBO1lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN6QixHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRTVDLHFCQUFxQixHQUFHLElBQUksQ0FBQTtRQUM3QixDQUFDO1FBRUQsdUNBQXVDO2FBQ2xDLElBQUksV0FBVyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25FLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixtR0FBbUcsRUFDbkcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FDbEIsQ0FBQTtZQUVELHFCQUFxQixHQUFHLElBQUksQ0FBQTtRQUM3QixDQUFDO1FBRUQsNEVBQTRFO1FBQzVFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDM0MsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLDBEQUEwRCxFQUMxRCxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUNsQixDQUFBO1lBRUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUMzQixHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRTVDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEdBQUcsVUFBVSxJQUFJLFNBQVMsQ0FBQTtRQUNqRSxDQUFDO1FBRUQsNERBQTREO1FBQzVELE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hGLElBQUksNkJBQTZCLEVBQUUsQ0FBQztZQUNuQyxJQUNDLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUM3Qiw2QkFBNkIsRUFDN0Isa0JBQWtCLEVBQ2xCLGlCQUFpQixDQUNqQixFQUNBLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLG1EQUFtRCxFQUNuRCxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUNsQixDQUFBO2dCQUVELE9BQU8sSUFBSSxDQUFBLENBQUMsMkRBQTJEO1lBQ3hFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIseURBQXlELEVBQ3pELDZCQUE2QixFQUM3QixHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUNsQixDQUFBO2dCQUVELE1BQU0sTUFBTSxHQUFHLENBQ2QsTUFBTSxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQzdCLE9BQU8sMEJBQWtCO29CQUN6QixHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUU7b0JBQzVDLFVBQVUsRUFBRSxDQUFDLDZCQUE2QixDQUFDO29CQUMzQyxjQUFjLEVBQUUscUJBQXFCO29CQUNyQyxZQUFZLEVBQUUsSUFBSTtvQkFDbEIsNkVBQTZFO2lCQUM3RSxDQUFDLENBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRVAsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFBLENBQUMsc0ZBQXNGO2dCQUV0RyxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBRUQsZ0ZBQWdGO1FBQ2hGLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDcEIsMkVBQTJFLEVBQzNFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQ2xCLENBQUE7WUFFRCxNQUFNLE1BQU0sR0FBRyxDQUNkLE1BQU0sa0JBQWtCLENBQUMsSUFBSSxDQUFDO2dCQUM3QixPQUFPLDBCQUFrQjtnQkFDekIsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFO2dCQUM1QyxjQUFjLEVBQUUsSUFBSTtnQkFDcEIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFlBQVksRUFBRSxJQUFJO2dCQUNsQixlQUFlLEVBQUUsa0JBQWtCLENBQUMsR0FBRyxDQUFDO2FBQ3hDLENBQUMsQ0FDRixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVQLE1BQU0sTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFBO1lBRXJCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFMUYsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRU8sa0JBQWtCLENBQ3pCLFNBQWlCLEVBQ2pCLEtBQWEsRUFDYixXQUFtQjtRQUtuQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNuQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUMxRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUM3QixJQUFJLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLGlDQUFpQyxDQUFDLENBQ3pFLENBQ0QsQ0FBQTtRQUVELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUN2QyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1lBRXBELE1BQU0sSUFBSSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBRTFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUE7WUFFNUUsT0FBTyxJQUFJLGlCQUFpQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMzQyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBRUosTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3RDLE1BQU0sYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBRS9CLE9BQU8sbUJBQW1CLENBQUE7UUFDM0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUVKLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUN6QixTQUFpQixFQUNqQixLQUFhLEVBQ2IsV0FBbUIsRUFDbkIsa0JBQThDO1FBRTlDLE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUV4QyxTQUFTO1FBQ1QsUUFBUSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDMUIsS0FBSyxPQUFPO2dCQUNYLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtnQkFDcEUsTUFBSztZQUVOLEtBQUssT0FBTztnQkFDWCxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixRQUFRLENBQUMsR0FBRyxDQUNYLGNBQWMsRUFDZCxJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRTt3QkFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7d0JBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO3FCQUM1QixDQUFDLENBQ0YsQ0FBQTtnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO2dCQUNyRSxDQUFDO2dCQUNELE1BQUs7WUFFTixLQUFLLFFBQVE7Z0JBQ1osUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFBO2dCQUNyRSxNQUFLO1FBQ1AsQ0FBQztRQUVELFVBQVU7UUFDVixRQUFRLENBQUMsR0FBRyxDQUNYLG1CQUFtQixFQUNuQixJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FDNUYsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gsNEJBQTRCLEVBQzVCLElBQUksY0FBYyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FDakUsQ0FBQTtRQUVELFVBQVU7UUFDVixNQUFNLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDckYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRW5ELFNBQVM7UUFDVCxRQUFRLENBQUMsR0FBRyxDQUNYLGtCQUFrQixFQUNsQixJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQ3hGLENBQUE7UUFFRCxjQUFjO1FBQ2QsUUFBUSxDQUFDLEdBQUcsQ0FDWCx1QkFBdUIsRUFDdkIsSUFBSSxjQUFjLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUM3RixDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FDWCxtQkFBbUIsRUFDbkIsWUFBWSxDQUFDLFNBQVMsQ0FDckIsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FDeEYsQ0FDRCxDQUFBO1FBRUQsVUFBVTtRQUNWLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXpGLGFBQWE7UUFDYixRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUUvRSxrQkFBa0I7UUFDbEIsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUE7UUFFdkYsY0FBYztRQUNkLFFBQVEsQ0FBQyxHQUFHLENBQ1gsc0JBQXNCLEVBQ3RCLElBQUksY0FBYyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FDNUYsQ0FBQTtRQUVELHlCQUF5QjtRQUN6QixRQUFRLENBQUMsR0FBRyxDQUNYLDJCQUEyQixFQUMzQixJQUFJLGNBQWMsQ0FDakIsZ0NBQWdDLEVBQ2hDLFNBQVMsRUFDVCxLQUFLLENBQUMsZ0NBQWdDLENBQ3RDLENBQ0QsQ0FBQTtRQUVELGtCQUFrQjtRQUNsQixRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLElBQUksY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUU1RSxVQUFVO1FBQ1YsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFFekUseUJBQXlCO1FBQ3pCLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBRTdFLFVBQVU7UUFDVixRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLElBQUksY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUN6RSxRQUFRLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLElBQUksY0FBYyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQTtRQUUvRixXQUFXO1FBQ1gsTUFBTSxjQUFjLEdBQUcsSUFBSSxzQkFBc0IsQ0FDaEQ7WUFDQyxTQUFTLCtDQUFtQztZQUM1QyxjQUFjLG1EQUF3QztZQUN0RCxVQUFVLEVBQ1QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsdUdBRWpDLElBQUksR0FBRztTQUNULEVBQ0QsSUFBSSxDQUFDLG9CQUFvQixFQUN6QixJQUFJLENBQUMsc0JBQXNCLEVBQzNCLElBQUksQ0FBQyxvQkFBb0IsRUFDekIsSUFBSSxDQUFDLFVBQVUsQ0FDZixDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQ3hDLGNBQWMsRUFDZCxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLGFBQWEsQ0FDbEIsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFOUMsb0JBQW9CO1FBQ3BCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksY0FBYyxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQTtRQUMvRixDQUFDO2FBQU0sSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN4QixRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksY0FBYyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQTtRQUMzRixDQUFDO2FBQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNwQixRQUFRLENBQUMsR0FBRyxDQUFDLDRCQUE0QixFQUFFLElBQUksY0FBYyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQTtRQUM3RixDQUFDO1FBRUQsVUFBVTtRQUNWLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUMsSUFBSSxDQUFDLHNCQUFzQixFQUMzQixJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLFlBQVksQ0FDakIsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUVuRCxhQUFhO1FBQ2IsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLCtCQUErQixDQUMxRSxJQUFJLENBQUMsc0JBQXNCLEVBQzNCLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLDJCQUEyQixFQUNoQyxpQkFBaUIsRUFDakIsaUJBQWlCLENBQ2pCLENBQUE7UUFDRCxRQUFRLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxFQUFFLCtCQUErQixDQUFDLENBQUE7UUFDL0UsUUFBUSxDQUFDLEdBQUcsQ0FDWCxrQkFBa0IsRUFDbEIsSUFBSSxjQUFjLENBQUMscUJBQXFCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUM1RixDQUFBO1FBQ0QsUUFBUSxDQUFDLEdBQUcsQ0FDWCw2QkFBNkIsRUFDN0IsSUFBSSxjQUFjLENBQUMsNEJBQTRCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUNsRSxDQUFBO1FBRUQsZUFBZTtRQUNmLFFBQVEsQ0FBQyxHQUFHLENBQ1gsV0FBVyxFQUNYLElBQUksY0FBYyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FDdkYsQ0FBQTtRQUVELFlBQVk7UUFDWixJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztZQUN6RSxNQUFNLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQ3RGLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUNoQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUMzRSxDQUFBO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNyRCxNQUFNLGdCQUFnQixHQUFHLHVCQUF1QixDQUMvQyxPQUFPLEVBQUUsRUFDVCxRQUFRLEVBQUUsRUFDVixPQUFPLENBQUMsSUFBSSxFQUNaLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFDM0IsU0FBUyxFQUNULEtBQUssRUFDTCxXQUFXLEVBQ1gsVUFBVSxDQUNWLENBQUE7WUFDRCxNQUFNLFFBQVEsR0FBRywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUN4RSxNQUFNLE1BQU0sR0FBNEI7Z0JBQ3ZDLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDckIsZ0JBQWdCO2dCQUNoQixRQUFRO2dCQUNSLGtCQUFrQixFQUFFLElBQUk7YUFDeEIsQ0FBQTtZQUVELFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7YUFBTSxDQUFDO1lBQ1AsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3RELENBQUM7UUFFRCxzSEFBc0g7UUFDdEgsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxjQUFjLENBQUMsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDdkYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUM3RixRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxJQUFJLGNBQWMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFFbkYsa0NBQWtDO1FBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQ1gsZ0NBQWdDLEVBQ2hDLElBQUksY0FBYyxDQUFDLCtCQUErQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDcEUsQ0FBQTtRQUNELFFBQVEsQ0FBQyxHQUFHLENBQ1gseUJBQXlCLEVBQ3pCLElBQUksY0FBYyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FDN0QsQ0FBQTtRQUVELHlCQUF5QjtRQUN6QixRQUFRLENBQUMsR0FBRyxDQUNYLGdDQUFnQyxFQUNoQyxJQUFJLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQ3BFLENBQUE7UUFFRCxhQUFhO1FBQ2IsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUE7UUFFckUsTUFBTTtRQUNOLFFBQVEsQ0FBQyxHQUFHLENBQ1gsZ0NBQWdDLEVBQ2hDLElBQUksY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQ25ELENBQUE7UUFFRCxrQ0FBa0M7UUFDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVoRyxnQ0FBZ0M7UUFDaEMsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ3RCLGlCQUFpQixDQUFDLFVBQVUsRUFBRTtZQUM5QiwrQkFBK0IsQ0FBQyxVQUFVLEVBQUU7U0FDNUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFTyxZQUFZLENBQ25CLFFBQTBCLEVBQzFCLHlCQUE0QyxFQUM1QyxtQkFBK0M7UUFFL0MsaUVBQWlFO1FBQ2pFLDZEQUE2RDtRQUM3RCw2REFBNkQ7UUFDN0QsOERBQThEO1FBRTlELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRXpELE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLFdBQVcsRUFBRTtZQUM3RixrQkFBa0IsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDbEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxFQUNyQyxXQUFXLEVBQ1gsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsQ0FDNUIsQ0FBQTtRQUNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFaEYsbUNBQW1DO1FBQ25DLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEYseUJBQXlCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNsRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFFckYsY0FBYztRQUNkLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pFLFVBQVUsQ0FBQyxzQkFBc0IsWUFBWSxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0seUJBQXlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDaEQsSUFBSSw2QkFBNkIsQ0FDaEMsc0JBQXNCLEVBQ3RCLElBQUksQ0FBQyxVQUFVLEVBQ2YsSUFBSSxDQUFDLHNCQUFzQixDQUMzQixDQUNELENBQUE7UUFDRCx5QkFBeUIsQ0FBQyxlQUFlLENBQ3hDLDhCQUE4QixFQUM5Qix5QkFBeUIsQ0FDekIsQ0FBQTtRQUNELG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ25DLE1BQU0sQ0FBQyxlQUFlLENBQUMsOEJBQThCLEVBQUUseUJBQXlCLENBQUMsQ0FDakYsQ0FBQTtRQUVELHFCQUFxQjtRQUNyQixNQUFNLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQ3ZELFFBQVEsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsRUFDMUMsV0FBVyxDQUNYLENBQUE7UUFDRCx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN0RixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNuQyxNQUFNLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLHVCQUF1QixDQUFDLENBQ25FLENBQUE7UUFFRCxTQUFTO1FBQ1QsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFFbEUsVUFBVTtRQUNWLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9GLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFcEUsYUFBYTtRQUNiLE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDakQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUNwQyxXQUFXLENBQ1gsQ0FBQTtRQUNELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUUxRSxVQUFVO1FBQ1YsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3JGLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFOUQsa0JBQWtCO1FBQ2xCLE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDckQsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUN4QyxXQUFXLENBQ1gsQ0FBQTtRQUNELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBRWxGLHNDQUFzQztRQUN0QyxJQUFJLENBQUMscUJBQXFCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ2pFLE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDM0YseUJBQXlCLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQzFFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBRTdGLHdCQUF3QjtRQUN4QixNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQzFELFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsRUFDekMsV0FBVyxDQUNYLENBQUE7UUFDRCx5QkFBeUIsQ0FBQyxlQUFlLENBQUMscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUU1RixhQUFhO1FBQ2IsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUNqRCxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQ2hDLFdBQVcsQ0FDWCxDQUFBO1FBQ0QseUJBQXlCLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRTFFLFVBQVU7UUFDVixNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMvRix5QkFBeUIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXBFLGVBQWU7UUFDZixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbkYseUJBQXlCLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUU1RCxrQkFBa0I7UUFDbEIsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FDOUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxFQUNwQyxXQUFXLENBQ1gsQ0FBQTtRQUNELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFcEUsa0NBQWtDO1FBQ2xDLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3JDLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FDOUUsQ0FBQTtRQUNELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDcEUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBRXZGLG9EQUFvRDtRQUNwRCxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzdDLElBQUksb0NBQW9DLENBQ3ZDLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFDakMsUUFBUSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxFQUMxQyxJQUFJLENBQUMsVUFBVSxDQUNmLENBQ0QsQ0FBQTtRQUNELG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ25DLE1BQU0sQ0FBQyxlQUFlLENBQUMsd0JBQXdCLEVBQUUsc0JBQXNCLENBQUMsQ0FDeEUsQ0FBQTtRQUVELFdBQVc7UUFDWCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM1Rix5QkFBeUIsQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXZGLG9CQUFvQjtRQUNwQixNQUFNLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQ3ZELFFBQVEsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsRUFDMUMsV0FBVyxDQUNYLENBQUE7UUFDRCx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUV0RixNQUFNO1FBQ04sTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUNuRCxRQUFRLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLEVBQzlDLFdBQVcsQ0FDWCxDQUFBO1FBQ0QseUJBQXlCLENBQUMsZUFBZSxDQUN4QyxtQ0FBbUMsRUFDbkMsbUJBQW1CLENBQ25CLENBQUE7UUFFRCxTQUFTO1FBQ1QsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFDekUseUJBQXlCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUNsRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFFckYsd0NBQXdDO1FBQ3hDLE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUMzRix5QkFBeUIsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFakYsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUNsRCxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQ2hDLFdBQVcsQ0FDWCxDQUFBO1FBQ0QseUJBQXlCLENBQUMsZUFBZSxDQUFDLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFcEYsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUNsRix5QkFBeUIsQ0FBQyxlQUFlLENBQUMseUJBQXlCLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtRQUUzRixrQkFBa0I7UUFDbEIsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzNGLHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUU3RSxrQkFBa0I7UUFDbEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQTtRQUNuQyx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFekUsb0NBQW9DO1FBQ3BDLE1BQU0sMENBQTBDLEdBQy9DLElBQUksMENBQTBDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7UUFDbEYseUJBQXlCLENBQUMsZUFBZSxDQUN4QywyQkFBMkIsRUFDM0IsMENBQTBDLENBQzFDLENBQUE7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSwyQkFBMkIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUMzRCxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLEVBQ25DLFdBQVcsQ0FDWCxDQUFBO1FBQ0QseUJBQXlCLENBQUMsZUFBZSxDQUN4QyxrQ0FBa0MsRUFDbEMsMkJBQTJCLENBQzNCLENBQUE7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSwyQkFBMkIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUMzRCxRQUFRLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxDQUFDLEVBQzlDLFdBQVcsQ0FDWCxDQUFBO1FBQ0QseUJBQXlCLENBQUMsZUFBZSxDQUN4QyxrQ0FBa0MsRUFDbEMsMkJBQTJCLENBQzNCLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGVBQWUsQ0FDNUIsUUFBMEIsRUFDMUIsbUJBQXFEO1FBRXJELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUE7UUFDeEYsSUFBSSxDQUFDLDJCQUEyQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUU3RSxNQUFNLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyx5QkFBaUIsQ0FBQyw0QkFBb0IsQ0FBQTtRQUN0RixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFBO1FBRTdDLHNEQUFzRDtRQUN0RCxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDekIseUNBQXlDO1lBQ3pDLElBQUksbUJBQW1CLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQzlCLE9BQU87b0JBQ1AsR0FBRyxFQUFFLElBQUk7b0JBQ1QsVUFBVSxFQUFFLG1CQUFtQixDQUFDLFNBQVM7b0JBQ3pDLFlBQVksRUFBRSxJQUFJO29CQUNsQixjQUFjLEVBQUUsSUFBSTtvQkFDcEIseURBQXlEO2lCQUN6RCxDQUFDLENBQUE7WUFDSCxDQUFDO1lBRUQsbURBQW1EO1lBQ25ELHNDQUFzQztZQUN0QyxtREFBbUQ7WUFDbkQsbURBQW1EO1lBQ25ELHVDQUF1QztZQUN2QyxtREFBbUQ7WUFDbkQscURBQXFEO1lBRXJELElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsS0FBSyxNQUFNLFdBQVcsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDcEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFlLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDekQsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO3dCQUN6Qyw2REFBNkQ7d0JBQzdELHdEQUF3RDt3QkFFeEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTt3QkFDekIsV0FBVyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDeEQsV0FBVyxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO3dCQUVwRSxPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQzs0QkFDOUIsT0FBTzs0QkFDUCxHQUFHLEVBQUUsSUFBSTs0QkFDVCxjQUFjLEVBQUUsSUFBSTs0QkFDcEIsVUFBVSxFQUFFLElBQUk7NEJBQ2hCLFlBQVksRUFBRSxJQUFJOzRCQUNsQixjQUFjLEVBQUUsSUFBSTs0QkFDcEIseURBQXlEO3lCQUN6RCxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBbUIsTUFBTyxDQUFDLFlBQVksQ0FBQTtRQUN6RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtRQUNoQyxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFDLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEtBQUssSUFBSSxDQUFBO1FBQ2xFLE1BQU0saUJBQWlCLEdBQ3RCLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFDckYsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUE7UUFDaEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUNqQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUU3Qyx3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ25ELG1CQUFtQjtZQUNuQixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxZQUFZLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDNUQsT0FBTyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQzlCLE9BQU87b0JBQ1AsR0FBRyxFQUFFLElBQUk7b0JBQ1QsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLFVBQVUsRUFBRSxJQUFJO29CQUNoQixhQUFhO29CQUNiLGlCQUFpQjtvQkFDakIsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLGVBQWU7b0JBQ2YsWUFBWTtvQkFDWixnQkFBZ0I7aUJBQ2hCLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCwyQ0FBMkM7WUFDM0MsSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDO29CQUM5QixPQUFPLDBCQUFrQjtvQkFDekIsR0FBRyxFQUFFLElBQUk7b0JBQ1QsVUFBVSxFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTt3QkFDckMsSUFBSSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQSxDQUFDLDBDQUEwQzt3QkFFcEUsT0FBTyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7NEJBQ3JDLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFOzRCQUNsQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFBO29CQUMvQixDQUFDLENBQUM7b0JBQ0YsYUFBYTtvQkFDYixpQkFBaUI7b0JBQ2pCLGNBQWMsRUFBRSxJQUFJO29CQUNwQiw0REFBNEQ7aUJBQzVELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE9BQU8sa0JBQWtCLENBQUMsSUFBSSxDQUFDO1lBQzlCLE9BQU87WUFDUCxHQUFHLEVBQUUsSUFBSTtZQUNULGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ2xDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNuQixTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUs7WUFDckIsYUFBYTtZQUNiLGlCQUFpQjtZQUNqQixZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDdkIsY0FBYyxFQUFFLElBQUk7WUFDcEIsZUFBZTtZQUNmLFlBQVk7WUFDWixnQkFBZ0I7U0FDaEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLGVBQWU7UUFDdEIsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUVuQixxQkFBcUI7UUFDckIsUUFBUSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNqRixRQUFRLENBQUM7Z0JBQ1IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLDBCQUEwQixFQUFFLE9BQU8sQ0FBQztnQkFDN0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO2FBQ3RCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUYsdUVBQXVFO1FBQ3ZFLHlFQUF5RTtRQUN6RSx5QkFBeUI7UUFDekIsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFakYsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1FBRXBDLHFDQUFxQztRQUNyQyxJQUFJLFdBQVcsSUFBSSxHQUFHLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLG1DQUFtQyxDQUFDLENBQUE7UUFDNUUsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWTtRQUN6QixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQTtRQUN6RCxJQUFJLFNBQVMsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxZQUFZLEdBQUcsTUFBTSxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDMUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO2dCQUNwRCxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUM1RSxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLHVCQUF1QixDQUNwQyxJQUFzQixFQUN0QixHQUF3QixFQUN4QixhQUFzQjtRQUV0QixJQUFJLENBQUM7WUFDSixPQUFPLE1BQU0sbUJBQW1CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMxQyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLGlDQUFpQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3hGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUVPLEtBQUssQ0FBQyw2QkFBNkI7UUFDMUMseUVBQXlFO1FBQ3pFLDJFQUEyRTtRQUMzRSxtRUFBbUU7UUFFbkUsSUFBSSxDQUFDO1lBQ0osTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDN0YsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMvQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQXdDLFVBQVUsQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sY0FBYyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQ25FLE1BQU0sbUJBQW1CLEdBQUcsY0FBYyxnQ0FBd0IsQ0FBQTtZQUVsRSxrQkFBa0I7WUFDbEIsSUFBSSxRQUFRLENBQUMsdUJBQXVCLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxxQkFBcUIsR0FBRztvQkFDN0IsRUFBRTtvQkFDRix3Q0FBd0M7b0JBQ3hDLHFEQUFxRDtvQkFDckQsNkJBQTZCLG1CQUFtQixHQUFHO29CQUNuRCxFQUFFO29CQUNGLDJFQUEyRTtvQkFDM0UsNkJBQTZCO29CQUM3QiwwQkFBMEIsWUFBWSxFQUFFLEdBQUc7b0JBQzNDLEdBQUc7aUJBQ0gsQ0FBQTtnQkFDRCxNQUFNLGFBQWEsR0FBRyxVQUFVO3FCQUM5QixTQUFTLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3FCQUNuQyxNQUFNLENBQUMsS0FBSyxFQUFFLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUVqRCxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUMvQixJQUFJLENBQUMsc0JBQXNCLENBQUMsWUFBWSxFQUN4QyxRQUFRLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUNsQyxDQUFBO1lBQ0YsQ0FBQztZQUVELDZEQUE2RDtpQkFDeEQsQ0FBQztnQkFDTCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUN2Qyw4QkFBOEIsRUFDOUIsNEJBQTRCLG1CQUFtQixHQUFHLENBQ2xELENBQUE7Z0JBQ0QsSUFBSSxhQUFhLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ2xDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQy9CLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxZQUFZLEVBQ3hDLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQ2xDLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUU1QixtQ0FBbUM7WUFDbkMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQ3RFLENBQUM7SUFDRixDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLHdGQUF3RjtRQUN4RiwwREFBMEQ7UUFDMUQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDeEQsQ0FBQzs7QUEvc0RXLGVBQWU7SUFhekIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSw0QkFBNEIsQ0FBQTtHQXRCbEIsZUFBZSxDQWd0RDNCIn0=