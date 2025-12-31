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
var ProcessMainService_1;
import { BrowserWindow, contentTracing, screen, } from 'electron';
import { randomPath } from '../../../base/common/extpath.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { FileAccess } from '../../../base/common/network.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { listProcesses } from '../../../base/node/ps.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { getNLSLanguage, getNLSMessages, localize } from '../../../nls.js';
import { IDiagnosticsService, isRemoteDiagnosticError, } from '../../diagnostics/common/diagnostics.js';
import { IDiagnosticsMainService } from '../../diagnostics/electron-main/diagnosticsMainService.js';
import { IDialogMainService } from '../../dialogs/electron-main/dialogMainService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ICSSDevelopmentService } from '../../cssDev/node/cssDevService.js';
import { ILogService } from '../../log/common/log.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import product from '../../product/common/product.js';
import { IProductService } from '../../product/common/productService.js';
import { IProtocolMainService } from '../../protocol/electron-main/protocol.js';
import { IStateService } from '../../state/node/state.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { zoomLevelToZoomFactor } from '../../window/common/window.js';
const processExplorerWindowState = 'issue.processExplorerWindowState';
let ProcessMainService = class ProcessMainService {
    static { ProcessMainService_1 = this; }
    static { this.DEFAULT_BACKGROUND_COLOR = '#1E1E1E'; }
    constructor(userEnv, environmentMainService, logService, diagnosticsService, diagnosticsMainService, dialogMainService, nativeHostMainService, protocolMainService, productService, stateService, cssDevelopmentService) {
        this.userEnv = userEnv;
        this.environmentMainService = environmentMainService;
        this.logService = logService;
        this.diagnosticsService = diagnosticsService;
        this.diagnosticsMainService = diagnosticsMainService;
        this.dialogMainService = dialogMainService;
        this.nativeHostMainService = nativeHostMainService;
        this.protocolMainService = protocolMainService;
        this.productService = productService;
        this.stateService = stateService;
        this.cssDevelopmentService = cssDevelopmentService;
        this.processExplorerWindow = null;
        this.processExplorerParentWindow = null;
        this.registerListeners();
    }
    //#region Register Listeners
    registerListeners() {
        validatedIpcMain.on('vscode:listProcesses', async (event) => {
            const processes = [];
            try {
                processes.push({
                    name: localize('local', 'Local'),
                    rootProcess: await listProcesses(process.pid),
                });
                const remoteDiagnostics = await this.diagnosticsMainService.getRemoteDiagnostics({
                    includeProcesses: true,
                });
                remoteDiagnostics.forEach((data) => {
                    if (isRemoteDiagnosticError(data)) {
                        processes.push({
                            name: data.hostName,
                            rootProcess: data,
                        });
                    }
                    else {
                        if (data.processes) {
                            processes.push({
                                name: data.hostName,
                                rootProcess: data.processes,
                            });
                        }
                    }
                });
            }
            catch (e) {
                this.logService.error(`Listing processes failed: ${e}`);
            }
            this.safeSend(event, 'vscode:listProcessesResponse', processes);
        });
        validatedIpcMain.on('vscode:workbenchCommand', (_, commandInfo) => {
            const { id, from, args } = commandInfo;
            let parentWindow;
            switch (from) {
                case 'processExplorer':
                    parentWindow = this.processExplorerParentWindow;
                    break;
                default:
                    // The issue reporter does not use this anymore.
                    throw new Error(`Unexpected command source: ${from}`);
            }
            parentWindow?.webContents.send('vscode:runAction', { id, from, args });
        });
        validatedIpcMain.on('vscode:closeProcessExplorer', (event) => {
            this.processExplorerWindow?.close();
        });
        validatedIpcMain.on('vscode:pidToNameRequest', async (event) => {
            const mainProcessInfo = await this.diagnosticsMainService.getMainDiagnostics();
            const pidToNames = [];
            for (const window of mainProcessInfo.windows) {
                pidToNames.push([window.pid, `window [${window.id}] (${window.title})`]);
            }
            for (const { pid, name } of UtilityProcess.getAll()) {
                pidToNames.push([pid, name]);
            }
            this.safeSend(event, 'vscode:pidToNameResponse', pidToNames);
        });
    }
    async openProcessExplorer(data) {
        if (!this.processExplorerWindow) {
            this.processExplorerParentWindow = BrowserWindow.getFocusedWindow();
            if (this.processExplorerParentWindow) {
                const processExplorerDisposables = new DisposableStore();
                const processExplorerWindowConfigUrl = processExplorerDisposables.add(this.protocolMainService.createIPCObjectUrl());
                const savedPosition = this.stateService.getItem(processExplorerWindowState, undefined);
                const position = isStrictWindowState(savedPosition)
                    ? savedPosition
                    : this.getWindowPosition(this.processExplorerParentWindow, 800, 500);
                this.processExplorerWindow = this.createBrowserWindow(position, processExplorerWindowConfigUrl, {
                    backgroundColor: data.styles.backgroundColor,
                    title: localize('processExplorer', 'Process Explorer'),
                    zoomLevel: data.zoomLevel,
                    alwaysOnTop: true,
                }, 'process-explorer');
                // Store into config object URL
                processExplorerWindowConfigUrl.update({
                    appRoot: this.environmentMainService.appRoot,
                    windowId: this.processExplorerWindow.id,
                    userEnv: this.userEnv,
                    data,
                    product,
                    nls: {
                        messages: getNLSMessages(),
                        language: getNLSLanguage(),
                    },
                    cssModules: this.cssDevelopmentService.isEnabled
                        ? await this.cssDevelopmentService.getCssModules()
                        : undefined,
                });
                this.processExplorerWindow.loadURL(FileAccess.asBrowserUri(`vs/code/electron-sandbox/processExplorer/processExplorer${this.environmentMainService.isBuilt ? '' : '-dev'}.html`).toString(true));
                this.processExplorerWindow.on('close', () => {
                    this.processExplorerWindow = null;
                    processExplorerDisposables.dispose();
                });
                this.processExplorerParentWindow.on('close', () => {
                    if (this.processExplorerWindow) {
                        this.processExplorerWindow.close();
                        this.processExplorerWindow = null;
                        processExplorerDisposables.dispose();
                    }
                });
                const storeState = () => {
                    if (!this.processExplorerWindow) {
                        return;
                    }
                    const size = this.processExplorerWindow.getSize();
                    const position = this.processExplorerWindow.getPosition();
                    if (!size || !position) {
                        return;
                    }
                    const state = {
                        width: size[0],
                        height: size[1],
                        x: position[0],
                        y: position[1],
                    };
                    this.stateService.setItem(processExplorerWindowState, state);
                };
                this.processExplorerWindow.on('moved', storeState);
                this.processExplorerWindow.on('resized', storeState);
            }
        }
        if (this.processExplorerWindow) {
            this.focusWindow(this.processExplorerWindow);
        }
    }
    focusWindow(window) {
        if (window.isMinimized()) {
            window.restore();
        }
        window.focus();
    }
    getWindowPosition(parentWindow, defaultWidth, defaultHeight) {
        // We want the new window to open on the same display that the parent is in
        let displayToUse;
        const displays = screen.getAllDisplays();
        // Single Display
        if (displays.length === 1) {
            displayToUse = displays[0];
        }
        // Multi Display
        else {
            // on mac there is 1 menu per window so we need to use the monitor where the cursor currently is
            if (isMacintosh) {
                const cursorPoint = screen.getCursorScreenPoint();
                displayToUse = screen.getDisplayNearestPoint(cursorPoint);
            }
            // if we have a last active window, use that display for the new window
            if (!displayToUse && parentWindow) {
                displayToUse = screen.getDisplayMatching(parentWindow.getBounds());
            }
            // fallback to primary display or first display
            if (!displayToUse) {
                displayToUse = screen.getPrimaryDisplay() || displays[0];
            }
        }
        const displayBounds = displayToUse.bounds;
        const state = {
            width: defaultWidth,
            height: defaultHeight,
            x: displayBounds.x + displayBounds.width / 2 - defaultWidth / 2,
            y: displayBounds.y + displayBounds.height / 2 - defaultHeight / 2,
        };
        if (displayBounds.width > 0 &&
            displayBounds.height > 0 /* Linux X11 sessions sometimes report wrong display bounds */) {
            if (state.x < displayBounds.x) {
                state.x = displayBounds.x; // prevent window from falling out of the screen to the left
            }
            if (state.y < displayBounds.y) {
                state.y = displayBounds.y; // prevent window from falling out of the screen to the top
            }
            if (state.x > displayBounds.x + displayBounds.width) {
                state.x = displayBounds.x; // prevent window from falling out of the screen to the right
            }
            if (state.y > displayBounds.y + displayBounds.height) {
                state.y = displayBounds.y; // prevent window from falling out of the screen to the bottom
            }
            if (state.width > displayBounds.width) {
                state.width = displayBounds.width; // prevent window from exceeding display bounds width
            }
            if (state.height > displayBounds.height) {
                state.height = displayBounds.height; // prevent window from exceeding display bounds height
            }
        }
        return state;
    }
    async stopTracing() {
        if (!this.environmentMainService.args.trace) {
            return; // requires tracing to be on
        }
        const path = await contentTracing.stopRecording(`${randomPath(this.environmentMainService.userHome.fsPath, this.productService.applicationName)}.trace.txt`);
        // Inform user to report an issue
        await this.dialogMainService.showMessageBox({
            type: 'info',
            message: localize('trace.message', 'Successfully created the trace file'),
            detail: localize('trace.detail', 'Please create an issue and manually attach the following file:\n{0}', path),
            buttons: [localize({ key: 'trace.ok', comment: ['&& denotes a mnemonic'] }, '&&OK')],
        }, BrowserWindow.getFocusedWindow() ?? undefined);
        // Show item in explorer
        this.nativeHostMainService.showItemInFolder(undefined, path);
    }
    async getSystemStatus() {
        const [info, remoteData] = await Promise.all([
            this.diagnosticsMainService.getMainDiagnostics(),
            this.diagnosticsMainService.getRemoteDiagnostics({
                includeProcesses: false,
                includeWorkspaceMetadata: false,
            }),
        ]);
        return this.diagnosticsService.getDiagnostics(info, remoteData);
    }
    async $getSystemInfo() {
        const [info, remoteData] = await Promise.all([
            this.diagnosticsMainService.getMainDiagnostics(),
            this.diagnosticsMainService.getRemoteDiagnostics({
                includeProcesses: false,
                includeWorkspaceMetadata: false,
            }),
        ]);
        const msg = await this.diagnosticsService.getSystemInfo(info, remoteData);
        return msg;
    }
    async $getPerformanceInfo() {
        try {
            const [info, remoteData] = await Promise.all([
                this.diagnosticsMainService.getMainDiagnostics(),
                this.diagnosticsMainService.getRemoteDiagnostics({
                    includeProcesses: true,
                    includeWorkspaceMetadata: true,
                }),
            ]);
            return await this.diagnosticsService.getPerformanceInfo(info, remoteData);
        }
        catch (error) {
            this.logService.warn('issueService#getPerformanceInfo ', error.message);
            throw error;
        }
    }
    createBrowserWindow(position, ipcObjectUrl, options, windowKind) {
        const browserWindowOptions = {
            fullscreen: false,
            skipTaskbar: false,
            resizable: true,
            width: position.width,
            height: position.height,
            minWidth: 300,
            minHeight: 200,
            x: position.x,
            y: position.y,
            title: options.title,
            backgroundColor: options.backgroundColor || ProcessMainService_1.DEFAULT_BACKGROUND_COLOR,
            webPreferences: {
                preload: FileAccess.asFileUri('vs/base/parts/sandbox/electron-sandbox/preload.js').fsPath,
                additionalArguments: [`--vscode-window-config=${ipcObjectUrl.resource.toString()}`],
                v8CacheOptions: this.environmentMainService.useCodeCache ? 'bypassHeatCheck' : 'none',
                enableWebSQL: false,
                spellcheck: false,
                zoomFactor: zoomLevelToZoomFactor(options.zoomLevel),
                sandbox: true,
            },
            alwaysOnTop: options.alwaysOnTop,
            experimentalDarkMode: true,
        };
        const window = new BrowserWindow(browserWindowOptions);
        window.setMenuBarVisibility(false);
        return window;
    }
    safeSend(event, channel, ...args) {
        if (!event.sender.isDestroyed()) {
            event.sender.send(channel, ...args);
        }
    }
    async closeProcessExplorer() {
        this.processExplorerWindow?.close();
    }
};
ProcessMainService = ProcessMainService_1 = __decorate([
    __param(1, IEnvironmentMainService),
    __param(2, ILogService),
    __param(3, IDiagnosticsService),
    __param(4, IDiagnosticsMainService),
    __param(5, IDialogMainService),
    __param(6, INativeHostMainService),
    __param(7, IProtocolMainService),
    __param(8, IProductService),
    __param(9, IStateService),
    __param(10, ICSSDevelopmentService)
], ProcessMainService);
export { ProcessMainService };
function isStrictWindowState(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    return 'x' in obj && 'y' in obj && 'width' in obj && 'height' in obj;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcHJvY2Vzcy9lbGVjdHJvbi1tYWluL3Byb2Nlc3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGFBQWEsRUFFYixjQUFjLEVBR2QsTUFBTSxHQUNOLE1BQU0sVUFBVSxDQUFBO0FBQ2pCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBdUIsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsdUJBQXVCLEdBR3ZCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFNM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8s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