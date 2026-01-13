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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc01haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9wcm9jZXNzL2VsZWN0cm9uLW1haW4vcHJvY2Vzc01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sYUFBYSxFQUViLGNBQWMsRUFHZCxNQUFNLEdBQ04sTUFBTSxVQUFVLENBQUE7QUFDakIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQix1QkFBdUIsR0FHdkIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQU0zRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0s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