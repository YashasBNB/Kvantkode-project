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
import * as fs from 'fs';
import { exec } from 'child_process';
import { app, BrowserWindow, clipboard, Menu, powerMonitor, screen, shell, webContents, } from 'electron';
import { arch, cpus, freemem, loadavg, platform, release, totalmem, type } from 'os';
import { promisify } from 'util';
import { memoize } from '../../../base/common/decorators.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { matchesSomeScheme, Schemas } from '../../../base/common/network.js';
import { dirname, join, posix, resolve, win32 } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { realpath } from '../../../base/node/extpath.js';
import { virtualMachineHint } from '../../../base/node/id.js';
import { Promises, SymlinkSupport } from '../../../base/node/pfs.js';
import { findFreePort } from '../../../base/node/ports.js';
import { localize } from '../../../nls.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
import { defaultBrowserWindowOptions, IWindowsMainService, } from '../../windows/electron-main/windows.js';
import { isWorkspaceIdentifier, toWorkspaceIdentifier } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { hasWSLFeatureInstalled } from '../../remote/node/wsl.js';
import { WindowProfiler } from '../../profiling/electron-main/windowProfiling.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { CancellationError } from '../../../base/common/errors.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IProxyAuthService } from './auth.js';
import { IRequestService } from '../../request/common/request.js';
import { randomPath } from '../../../base/common/extpath.js';
export const INativeHostMainService = createDecorator('nativeHostMainService');
let NativeHostMainService = class NativeHostMainService extends Disposable {
    constructor(windowsMainService, auxiliaryWindowsMainService, dialogMainService, lifecycleMainService, environmentMainService, logService, productService, themeMainService, workspacesManagementMainService, configurationService, requestService, proxyAuthService, instantiationService) {
        super();
        this.windowsMainService = windowsMainService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.dialogMainService = dialogMainService;
        this.lifecycleMainService = lifecycleMainService;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.productService = productService;
        this.themeMainService = themeMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.configurationService = configurationService;
        this.requestService = requestService;
        this.proxyAuthService = proxyAuthService;
        this.instantiationService = instantiationService;
        this._onDidChangePassword = this._register(new Emitter());
        this.onDidChangePassword = this._onDidChangePassword.event;
        // Events
        {
            this.onDidOpenMainWindow = Event.map(this.windowsMainService.onDidOpenWindow, (window) => window.id);
            this.onDidTriggerWindowSystemContextMenu = Event.any(Event.map(this.windowsMainService.onDidTriggerSystemContextMenu, ({ window, x, y }) => ({
                windowId: window.id,
                x,
                y,
            })), Event.map(this.auxiliaryWindowsMainService.onDidTriggerSystemContextMenu, ({ window, x, y }) => ({ windowId: window.id, x, y })));
            this.onDidMaximizeWindow = Event.any(Event.map(this.windowsMainService.onDidMaximizeWindow, (window) => window.id), Event.map(this.auxiliaryWindowsMainService.onDidMaximizeWindow, (window) => window.id));
            this.onDidUnmaximizeWindow = Event.any(Event.map(this.windowsMainService.onDidUnmaximizeWindow, (window) => window.id), Event.map(this.auxiliaryWindowsMainService.onDidUnmaximizeWindow, (window) => window.id));
            this.onDidChangeWindowFullScreen = Event.any(Event.map(this.windowsMainService.onDidChangeFullScreen, (e) => ({
                windowId: e.window.id,
                fullscreen: e.fullscreen,
            })), Event.map(this.auxiliaryWindowsMainService.onDidChangeFullScreen, (e) => ({
                windowId: e.window.id,
                fullscreen: e.fullscreen,
            })));
            this.onDidBlurMainWindow = Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-blur', (event, window) => window.id), (windowId) => !!this.windowsMainService.getWindowById(windowId));
            this.onDidFocusMainWindow = Event.any(Event.map(Event.filter(Event.map(this.windowsMainService.onDidChangeWindowsCount, () => this.windowsMainService.getLastActiveWindow()), (window) => !!window), (window) => window.id), Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-focus', (event, window) => window.id), (windowId) => !!this.windowsMainService.getWindowById(windowId)));
            this.onDidBlurMainOrAuxiliaryWindow = Event.any(this.onDidBlurMainWindow, Event.map(Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-blur', (event, window) => this.auxiliaryWindowsMainService.getWindowByWebContents(window.webContents)), (window) => !!window), (window) => window.id));
            this.onDidFocusMainOrAuxiliaryWindow = Event.any(this.onDidFocusMainWindow, Event.map(Event.filter(Event.fromNodeEventEmitter(app, 'browser-window-focus', (event, window) => this.auxiliaryWindowsMainService.getWindowByWebContents(window.webContents)), (window) => !!window), (window) => window.id));
            this.onDidResumeOS = Event.fromNodeEventEmitter(powerMonitor, 'resume');
            this.onDidChangeColorScheme = this.themeMainService.onDidChangeColorScheme;
            this.onDidChangeDisplay = Event.debounce(Event.any(Event.filter(Event.fromNodeEventEmitter(screen, 'display-metrics-changed', (event, display, changedMetrics) => changedMetrics), (changedMetrics) => {
                // Electron will emit 'display-metrics-changed' events even when actually
                // going fullscreen, because the dock hides. However, we do not want to
                // react on this event as there is no change in display bounds.
                return !(Array.isArray(changedMetrics) &&
                    changedMetrics.length === 1 &&
                    changedMetrics[0] === 'workArea');
            }), Event.fromNodeEventEmitter(screen, 'display-added'), Event.fromNodeEventEmitter(screen, 'display-removed')), () => { }, 100);
        }
    }
    //#region Properties
    get windowId() {
        throw new Error('Not implemented in electron-main');
    }
    async getWindows(windowId, options) {
        const mainWindows = this.windowsMainService.getWindows().map((window) => ({
            id: window.id,
            workspace: window.openedWorkspace ??
                toWorkspaceIdentifier(window.backupPath, window.isExtensionDevelopmentHost),
            title: window.win?.getTitle() ?? '',
            filename: window.getRepresentedFilename(),
            dirty: window.isDocumentEdited(),
        }));
        const auxiliaryWindows = [];
        if (options.includeAuxiliaryWindows) {
            auxiliaryWindows.push(...this.auxiliaryWindowsMainService.getWindows().map((window) => ({
                id: window.id,
                parentId: window.parentId,
                title: window.win?.getTitle() ?? '',
                filename: window.getRepresentedFilename(),
            })));
        }
        return [...mainWindows, ...auxiliaryWindows];
    }
    async getWindowCount(windowId) {
        return this.windowsMainService.getWindowCount();
    }
    async getActiveWindowId(windowId) {
        const activeWindow = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (activeWindow) {
            return activeWindow.id;
        }
        return undefined;
    }
    async getActiveWindowPosition() {
        const activeWindow = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (activeWindow) {
            return activeWindow.getBounds();
        }
        return undefined;
    }
    async getNativeWindowHandle(fallbackWindowId, windowId) {
        const window = this.windowById(windowId, fallbackWindowId);
        if (window?.win) {
            return VSBuffer.wrap(window.win.getNativeWindowHandle());
        }
        return undefined;
    }
    openWindow(windowId, arg1, arg2) {
        if (Array.isArray(arg1)) {
            return this.doOpenWindow(windowId, arg1, arg2);
        }
        return this.doOpenEmptyWindow(windowId, arg1);
    }
    async doOpenWindow(windowId, toOpen, options = Object.create(null)) {
        if (toOpen.length > 0) {
            await this.windowsMainService.open({
                context: 5 /* OpenContext.API */,
                contextWindowId: windowId,
                urisToOpen: toOpen,
                cli: this.environmentMainService.args,
                forceNewWindow: options.forceNewWindow,
                forceReuseWindow: options.forceReuseWindow,
                preferNewWindow: options.preferNewWindow,
                diffMode: options.diffMode,
                mergeMode: options.mergeMode,
                addMode: options.addMode,
                removeMode: options.removeMode,
                gotoLineMode: options.gotoLineMode,
                noRecentEntry: options.noRecentEntry,
                waitMarkerFileURI: options.waitMarkerFileURI,
                remoteAuthority: options.remoteAuthority || undefined,
                forceProfile: options.forceProfile,
                forceTempProfile: options.forceTempProfile,
            });
        }
    }
    async doOpenEmptyWindow(windowId, options) {
        await this.windowsMainService.openEmptyWindow({
            context: 5 /* OpenContext.API */,
            contextWindowId: windowId,
        }, options);
    }
    async isFullScreen(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.isFullScreen ?? false;
    }
    async toggleFullScreen(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.toggleFullScreen();
    }
    async getCursorScreenPoint(windowId) {
        const point = screen.getCursorScreenPoint();
        const display = screen.getDisplayNearestPoint(point);
        return { point, display: display.bounds };
    }
    async isMaximized(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.isMaximized() ?? false;
    }
    async maximizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.maximize();
    }
    async unmaximizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.unmaximize();
    }
    async minimizeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.minimize();
    }
    async moveWindowTop(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.moveTop();
    }
    async positionWindow(windowId, position, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        if (window?.win) {
            if (window.win.isFullScreen()) {
                const fullscreenLeftFuture = Event.toPromise(Event.once(Event.fromNodeEventEmitter(window.win, 'leave-full-screen')));
                window.win.setFullScreen(false);
                await fullscreenLeftFuture;
            }
            window.win.setBounds(position);
        }
    }
    async updateWindowControls(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.updateWindowControls(options);
    }
    async focusWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.focus({ force: options?.force ?? false });
    }
    async setMinimumSize(windowId, width, height) {
        const window = this.codeWindowById(windowId);
        if (window?.win) {
            const [windowWidth, windowHeight] = window.win.getSize();
            const [minWindowWidth, minWindowHeight] = window.win.getMinimumSize();
            const [newMinWindowWidth, newMinWindowHeight] = [
                width ?? minWindowWidth,
                height ?? minWindowHeight,
            ];
            const [newWindowWidth, newWindowHeight] = [
                Math.max(windowWidth, newMinWindowWidth),
                Math.max(windowHeight, newMinWindowHeight),
            ];
            if (minWindowWidth !== newMinWindowWidth || minWindowHeight !== newMinWindowHeight) {
                window.win.setMinimumSize(newMinWindowWidth, newMinWindowHeight);
            }
            if (windowWidth !== newWindowWidth || windowHeight !== newWindowHeight) {
                window.win.setSize(newWindowWidth, newWindowHeight);
            }
        }
    }
    async saveWindowSplash(windowId, splash) {
        const window = this.codeWindowById(windowId);
        this.themeMainService.saveWindowSplash(windowId, window?.openedWorkspace, splash);
    }
    //#endregion
    //#region macOS Shell Command
    async installShellCommand(windowId) {
        const { source, target } = await this.getShellCommandLink();
        // Only install unless already existing
        try {
            const { symbolicLink } = await SymlinkSupport.stat(source);
            if (symbolicLink && !symbolicLink.dangling) {
                const linkTargetRealPath = await realpath(source);
                if (target === linkTargetRealPath) {
                    return;
                }
            }
            // Different source, delete it first
            await fs.promises.unlink(source);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error; // throw on any error but file not found
            }
        }
        try {
            await fs.promises.symlink(target, source);
        }
        catch (error) {
            if (error.code !== 'EACCES' && error.code !== 'ENOENT') {
                throw error;
            }
            const { response } = await this.showMessageBox(windowId, {
                type: 'info',
                message: localize('warnEscalation', "{0} will now prompt with 'osascript' for Administrator privileges to install the shell command.", this.productService.nameShort),
                buttons: [
                    localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                    localize('cancel', 'Cancel'),
                ],
            });
            if (response === 1 /* Cancel */) {
                throw new CancellationError();
            }
            try {
                const command = `osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'${target}\' \'${source}\'\\" with administrator privileges"`;
                await promisify(exec)(command);
            }
            catch (error) {
                throw new Error(localize('cantCreateBinFolder', "Unable to install the shell command '{0}'.", source));
            }
        }
    }
    async uninstallShellCommand(windowId) {
        const { source } = await this.getShellCommandLink();
        try {
            await fs.promises.unlink(source);
        }
        catch (error) {
            switch (error.code) {
                case 'EACCES': {
                    const { response } = await this.showMessageBox(windowId, {
                        type: 'info',
                        message: localize('warnEscalationUninstall', "{0} will now prompt with 'osascript' for Administrator privileges to uninstall the shell command.", this.productService.nameShort),
                        buttons: [
                            localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                            localize('cancel', 'Cancel'),
                        ],
                    });
                    if (response === 1 /* Cancel */) {
                        throw new CancellationError();
                    }
                    try {
                        const command = `osascript -e "do shell script \\"rm \'${source}\'\\" with administrator privileges"`;
                        await promisify(exec)(command);
                    }
                    catch (error) {
                        throw new Error(localize('cantUninstall', "Unable to uninstall the shell command '{0}'.", source));
                    }
                    break;
                }
                case 'ENOENT':
                    break; // ignore file not found
                default:
                    throw error;
            }
        }
    }
    async getShellCommandLink() {
        const target = resolve(this.environmentMainService.appRoot, 'bin', 'code');
        const source = `/usr/local/bin/${this.productService.applicationName}`;
        // Ensure source exists
        const sourceExists = await Promises.exists(target);
        if (!sourceExists) {
            throw new Error(localize('sourceMissing', "Unable to find shell script in '{0}'", target));
        }
        return { source, target };
    }
    //#endregion
    //#region Dialog
    async showMessageBox(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showMessageBox(options, window?.win ?? undefined);
    }
    async showSaveDialog(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showSaveDialog(options, window?.win ?? undefined);
    }
    async showOpenDialog(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return this.dialogMainService.showOpenDialog(options, window?.win ?? undefined);
    }
    async pickFileFolderAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFileFolder(options);
        if (paths) {
            await this.doOpenPicked(await Promise.all(paths.map(async (path) => (await SymlinkSupport.existsDirectory(path))
                ? { folderUri: URI.file(path) }
                : { fileUri: URI.file(path) })), options, windowId);
        }
    }
    async pickFolderAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFolder(options);
        if (paths) {
            await this.doOpenPicked(paths.map((path) => ({ folderUri: URI.file(path) })), options, windowId);
        }
    }
    async pickFileAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickFile(options);
        if (paths) {
            await this.doOpenPicked(paths.map((path) => ({ fileUri: URI.file(path) })), options, windowId);
        }
    }
    async pickWorkspaceAndOpen(windowId, options) {
        const paths = await this.dialogMainService.pickWorkspace(options);
        if (paths) {
            await this.doOpenPicked(paths.map((path) => ({ workspaceUri: URI.file(path) })), options, windowId);
        }
    }
    async doOpenPicked(openable, options, windowId) {
        await this.windowsMainService.open({
            context: 3 /* OpenContext.DIALOG */,
            contextWindowId: windowId,
            cli: this.environmentMainService.args,
            urisToOpen: openable,
            forceNewWindow: options.forceNewWindow,
            /* remoteAuthority will be determined based on openable */
        });
    }
    //#endregion
    //#region OS
    async showItemInFolder(windowId, path) {
        shell.showItemInFolder(path);
    }
    async setRepresentedFilename(windowId, path, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.setRepresentedFilename(path);
    }
    async setDocumentEdited(windowId, edited, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.setDocumentEdited(edited);
    }
    async openExternal(windowId, url, defaultApplication) {
        this.environmentMainService.unsetSnapExportedVariables();
        try {
            if (matchesSomeScheme(url, Schemas.http, Schemas.https)) {
                this.openExternalBrowser(url, defaultApplication);
            }
            else {
                shell.openExternal(url);
            }
        }
        finally {
            this.environmentMainService.restoreSnapExportedVariables();
        }
        return true;
    }
    async openExternalBrowser(url, defaultApplication) {
        const configuredBrowser = defaultApplication ?? this.configurationService.getValue('workbench.externalBrowser');
        if (!configuredBrowser) {
            return shell.openExternal(url);
        }
        if (configuredBrowser.includes(posix.sep) || configuredBrowser.includes(win32.sep)) {
            const browserPathExists = await Promises.exists(configuredBrowser);
            if (!browserPathExists) {
                this.logService.error(`Configured external browser path does not exist: ${configuredBrowser}`);
                return shell.openExternal(url);
            }
        }
        try {
            const { default: open } = await import('open');
            const res = await open(url, {
                app: {
                    // Use `open.apps` helper to allow cross-platform browser
                    // aliases to be looked up properly. Fallback to the
                    // configured value if not found.
                    name: Object.hasOwn(open.apps, configuredBrowser)
                        ? open.apps[configuredBrowser]
                        : configuredBrowser,
                },
            });
            if (!isWindows) {
                // On Linux/macOS, listen to stderr and treat that as failure
                // for opening the browser to fallback to the default.
                // On Windows, unfortunately PowerShell seems to always write
                // to stderr so we cannot use it there
                // (see also https://github.com/microsoft/vscode/issues/230636)
                res.stderr?.once('data', (data) => {
                    this.logService.error(`Error openening external URL '${url}' using browser '${configuredBrowser}': ${data.toString()}`);
                    return shell.openExternal(url);
                });
            }
        }
        catch (error) {
            this.logService.error(`Unable to open external URL '${url}' using browser '${configuredBrowser}' due to ${error}.`);
            return shell.openExternal(url);
        }
    }
    moveItemToTrash(windowId, fullPath) {
        return shell.trashItem(fullPath);
    }
    async isAdmin() {
        let isAdmin;
        if (isWindows) {
            isAdmin = (await import('native-is-elevated')).default();
        }
        else {
            isAdmin = process.getuid?.() === 0;
        }
        return isAdmin;
    }
    async writeElevated(windowId, source, target, options) {
        const sudoPrompt = await import('@vscode/sudo-prompt');
        const argsFile = randomPath(this.environmentMainService.userDataPath, 'code-elevated');
        await Promises.writeFile(argsFile, JSON.stringify({ source: source.fsPath, target: target.fsPath }));
        try {
            await new Promise((resolve, reject) => {
                const sudoCommand = [`"${this.cliPath}"`];
                if (options?.unlock) {
                    sudoCommand.push('--file-chmod');
                }
                sudoCommand.push('--file-write', `"${argsFile}"`);
                const promptOptions = {
                    name: this.productService.nameLong.replace('-', ''),
                    icns: isMacintosh && this.environmentMainService.isBuilt
                        ? join(dirname(this.environmentMainService.appRoot), `${this.productService.nameShort}.icns`)
                        : undefined,
                };
                this.logService.trace(`[sudo-prompt] running command: ${sudoCommand.join(' ')}`);
                sudoPrompt.exec(sudoCommand.join(' '), promptOptions, (error, stdout, stderr) => {
                    if (stdout) {
                        this.logService.trace(`[sudo-prompt] received stdout: ${stdout}`);
                    }
                    if (stderr) {
                        this.logService.error(`[sudo-prompt] received stderr: ${stderr}`);
                    }
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(undefined);
                    }
                });
            });
        }
        finally {
            await fs.promises.unlink(argsFile);
        }
    }
    async isRunningUnderARM64Translation() {
        if (isLinux || isWindows) {
            return false;
        }
        return app.runningUnderARM64Translation;
    }
    get cliPath() {
        // Windows
        if (isWindows) {
            if (this.environmentMainService.isBuilt) {
                return join(dirname(process.execPath), 'bin', `${this.productService.applicationName}.cmd`);
            }
            return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.bat');
        }
        // Linux
        if (isLinux) {
            if (this.environmentMainService.isBuilt) {
                return join(dirname(process.execPath), 'bin', `${this.productService.applicationName}`);
            }
            return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.sh');
        }
        // macOS
        if (this.environmentMainService.isBuilt) {
            return join(this.environmentMainService.appRoot, 'bin', 'code');
        }
        return join(this.environmentMainService.appRoot, 'scripts', 'code-cli.sh');
    }
    async getOSStatistics() {
        return {
            totalmem: totalmem(),
            freemem: freemem(),
            loadavg: loadavg(),
        };
    }
    async getOSProperties() {
        return {
            arch: arch(),
            platform: platform(),
            release: release(),
            type: type(),
            cpus: cpus(),
        };
    }
    async getOSVirtualMachineHint() {
        return virtualMachineHint.value();
    }
    async getOSColorScheme() {
        return this.themeMainService.getColorScheme();
    }
    // WSL
    async hasWSLFeatureInstalled() {
        return isWindows && hasWSLFeatureInstalled();
    }
    //#endregion
    //#region Screenshots
    async getScreenshot(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        const captured = await window?.win?.webContents.capturePage();
        return captured?.toJPEG(95);
    }
    //#endregion
    //#region Process
    async getProcessId(windowId) {
        const window = this.windowById(undefined, windowId);
        return window?.win?.webContents.getOSProcessId();
    }
    async killProcess(windowId, pid, code) {
        process.kill(pid, code);
    }
    //#endregion
    //#region Clipboard
    async readClipboardText(windowId, type) {
        return clipboard.readText(type);
    }
    async readImage() {
        return clipboard.readImage().toPNG();
    }
    async writeClipboardText(windowId, text, type) {
        return clipboard.writeText(text, type);
    }
    async readClipboardFindText(windowId) {
        return clipboard.readFindText();
    }
    async writeClipboardFindText(windowId, text) {
        return clipboard.writeFindText(text);
    }
    async writeClipboardBuffer(windowId, format, buffer, type) {
        return clipboard.writeBuffer(format, Buffer.from(buffer.buffer), type);
    }
    async readClipboardBuffer(windowId, format) {
        return VSBuffer.wrap(clipboard.readBuffer(format));
    }
    async hasClipboard(windowId, format, type) {
        return clipboard.has(format, type);
    }
    //#endregion
    //#region macOS Touchbar
    async newWindowTab() {
        await this.windowsMainService.open({
            context: 5 /* OpenContext.API */,
            cli: this.environmentMainService.args,
            forceNewTabbedWindow: true,
            forceEmpty: true,
            remoteAuthority: this.environmentMainService.args.remote || undefined,
        });
    }
    async showPreviousWindowTab() {
        Menu.sendActionToFirstResponder('selectPreviousTab:');
    }
    async showNextWindowTab() {
        Menu.sendActionToFirstResponder('selectNextTab:');
    }
    async moveWindowTabToNewWindow() {
        Menu.sendActionToFirstResponder('moveTabToNewWindow:');
    }
    async mergeAllWindowTabs() {
        Menu.sendActionToFirstResponder('mergeAllWindows:');
    }
    async toggleWindowTabsBar() {
        Menu.sendActionToFirstResponder('toggleTabBar:');
    }
    async updateTouchBar(windowId, items) {
        const window = this.codeWindowById(windowId);
        window?.updateTouchBar(items);
    }
    //#endregion
    //#region Lifecycle
    async notifyReady(windowId) {
        const window = this.codeWindowById(windowId);
        window?.setReady();
    }
    async relaunch(windowId, options) {
        return this.lifecycleMainService.relaunch(options);
    }
    async reload(windowId, options) {
        const window = this.codeWindowById(windowId);
        if (window) {
            // Special case: support `transient` workspaces by preventing
            // the reload and rather go back to an empty window. Transient
            // workspaces should never restore, even when the user wants
            // to reload.
            // For: https://github.com/microsoft/vscode/issues/119695
            if (isWorkspaceIdentifier(window.openedWorkspace)) {
                const configPath = window.openedWorkspace.configPath;
                if (configPath.scheme === Schemas.file) {
                    const workspace = await this.workspacesManagementMainService.resolveLocalWorkspace(configPath);
                    if (workspace?.transient) {
                        return this.openWindow(window.id, { forceReuseWindow: true });
                    }
                }
            }
            // Proceed normally to reload the window
            return this.lifecycleMainService.reload(window, options?.disableExtensions !== undefined
                ? { _: [], 'disable-extensions': options.disableExtensions }
                : undefined);
        }
    }
    async closeWindow(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        return window?.win?.close();
    }
    async quit(windowId) {
        // If the user selected to exit from an extension development host window, do not quit, but just
        // close the window unless this is the last window that is opened.
        const window = this.windowsMainService.getLastActiveWindow();
        if (window?.isExtensionDevelopmentHost &&
            this.windowsMainService.getWindowCount() > 1 &&
            window.win) {
            window.win.close();
        }
        // Otherwise: normal quit
        else {
            this.lifecycleMainService.quit();
        }
    }
    async exit(windowId, code) {
        await this.lifecycleMainService.kill(code);
    }
    //#endregion
    //#region Connectivity
    async resolveProxy(windowId, url) {
        const window = this.codeWindowById(windowId);
        const session = window?.win?.webContents?.session;
        return session?.resolveProxy(url);
    }
    async lookupAuthorization(_windowId, authInfo) {
        return this.proxyAuthService.lookupAuthorization(authInfo);
    }
    async lookupKerberosAuthorization(_windowId, url) {
        return this.requestService.lookupKerberosAuthorization(url);
    }
    async loadCertificates(_windowId) {
        return this.requestService.loadCertificates();
    }
    findFreePort(windowId, startPort, giveUpAfter, timeout, stride = 1) {
        return findFreePort(startPort, giveUpAfter, timeout, stride);
    }
    async openDevTools(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.webContents.openDevTools(options?.mode ? { mode: options.mode, activate: options.activate } : undefined);
    }
    async toggleDevTools(windowId, options) {
        const window = this.windowById(options?.targetWindowId, windowId);
        window?.win?.webContents.toggleDevTools();
    }
    async openGPUInfoWindow(windowId) {
        const parentWindow = this.codeWindowById(windowId);
        if (!parentWindow) {
            return;
        }
        if (typeof this.gpuInfoWindowId !== 'number') {
            const options = this.instantiationService.invokeFunction(defaultBrowserWindowOptions, defaultWindowState(), { forceNativeTitlebar: true });
            options.backgroundColor = undefined;
            const gpuInfoWindow = new BrowserWindow(options);
            gpuInfoWindow.setMenuBarVisibility(false);
            gpuInfoWindow.loadURL('chrome://gpu');
            gpuInfoWindow.once('ready-to-show', () => gpuInfoWindow.show());
            gpuInfoWindow.once('close', () => (this.gpuInfoWindowId = undefined));
            parentWindow.win?.on('close', () => {
                if (this.gpuInfoWindowId) {
                    BrowserWindow.fromId(this.gpuInfoWindowId)?.close();
                    this.gpuInfoWindowId = undefined;
                }
            });
            this.gpuInfoWindowId = gpuInfoWindow.id;
        }
        if (typeof this.gpuInfoWindowId === 'number') {
            const window = BrowserWindow.fromId(this.gpuInfoWindowId);
            if (window?.isMinimized()) {
                window?.restore();
            }
            window?.focus();
        }
    }
    //#endregion
    // #region Performance
    async profileRenderer(windowId, session, duration) {
        const window = this.codeWindowById(windowId);
        if (!window || !window.win) {
            throw new Error();
        }
        const profiler = new WindowProfiler(window.win, session, this.logService);
        const result = await profiler.inspect(duration);
        return result;
    }
    // #endregion
    //#region Registry (windows)
    async windowsGetStringRegKey(windowId, hive, path, name) {
        if (!isWindows) {
            return undefined;
        }
        const Registry = await import('@vscode/windows-registry');
        try {
            return Registry.GetStringRegKey(hive, path, name);
        }
        catch {
            return undefined;
        }
    }
    //#endregion
    windowById(windowId, fallbackCodeWindowId) {
        return (this.codeWindowById(windowId) ??
            this.auxiliaryWindowById(windowId) ??
            this.codeWindowById(fallbackCodeWindowId));
    }
    codeWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        return this.windowsMainService.getWindowById(windowId);
    }
    auxiliaryWindowById(windowId) {
        if (typeof windowId !== 'number') {
            return undefined;
        }
        const contents = webContents.fromId(windowId);
        if (!contents) {
            return undefined;
        }
        return this.auxiliaryWindowsMainService.getWindowByWebContents(contents);
    }
};
__decorate([
    memoize
], NativeHostMainService.prototype, "cliPath", null);
NativeHostMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IAuxiliaryWindowsMainService),
    __param(2, IDialogMainService),
    __param(3, ILifecycleMainService),
    __param(4, IEnvironmentMainService),
    __param(5, ILogService),
    __param(6, IProductService),
    __param(7, IThemeMainService),
    __param(8, IWorkspacesManagementMainService),
    __param(9, IConfigurationService),
    __param(10, IRequestService),
    __param(11, IProxyAuthService),
    __param(12, IInstantiationService)
], NativeHostMainService);
export { NativeHostMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdE1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbmF0aXZlL2VsZWN0cm9uLW1haW4vbmF0aXZlSG9zdE1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDcEMsT0FBTyxFQUNOLEdBQUcsRUFDSCxhQUFhLEVBQ2IsU0FBUyxFQUVULElBQUksRUFNSixZQUFZLEVBR1osTUFBTSxFQUNOLEtBQUssRUFDTCxXQUFXLEdBQ1gsTUFBTSxVQUFVLENBQUE7QUFDakIsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLE1BQU0sQ0FBQTtBQUNoQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtD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