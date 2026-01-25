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
import { app } from 'electron';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { getAllWindowsExcludingOffscreen, IWindowsMainService, } from '../../windows/electron-main/windows.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
import { IWorkspacesManagementMainService } from '../../workspaces/electron-main/workspacesManagementMainService.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { ILogService } from '../../log/common/log.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
export const ID = 'diagnosticsMainService';
export const IDiagnosticsMainService = createDecorator(ID);
let DiagnosticsMainService = class DiagnosticsMainService {
    constructor(windowsMainService, workspacesManagementMainService, logService) {
        this.windowsMainService = windowsMainService;
        this.workspacesManagementMainService = workspacesManagementMainService;
        this.logService = logService;
    }
    async getRemoteDiagnostics(options) {
        const windows = this.windowsMainService.getWindows();
        const diagnostics = await Promise.all(windows.map(async (window) => {
            const remoteAuthority = window.remoteAuthority;
            if (!remoteAuthority) {
                return undefined;
            }
            const replyChannel = `vscode:getDiagnosticInfoResponse${window.id}`;
            const args = {
                includeProcesses: options.includeProcesses,
                folders: options.includeWorkspaceMetadata
                    ? await this.getFolderURIs(window)
                    : undefined,
            };
            return new Promise((resolve) => {
                window.sendWhenReady('vscode:getDiagnosticInfo', CancellationToken.None, {
                    replyChannel,
                    args,
                });
                validatedIpcMain.once(replyChannel, (_, data) => {
                    // No data is returned if getting the connection fails.
                    if (!data) {
                        resolve({
                            hostName: remoteAuthority,
                            errorMessage: `Unable to resolve connection to '${remoteAuthority}'.`,
                        });
                    }
                    resolve(data);
                });
                setTimeout(() => {
                    resolve({
                        hostName: remoteAuthority,
                        errorMessage: `Connection to '${remoteAuthority}' could not be established`,
                    });
                }, 5000);
            });
        }));
        return diagnostics.filter((x) => !!x);
    }
    async getMainDiagnostics() {
        this.logService.trace('Received request for main process info from other instance.');
        const windows = [];
        for (const window of getAllWindowsExcludingOffscreen()) {
            const codeWindow = this.windowsMainService.getWindowById(window.id);
            if (codeWindow) {
                windows.push(await this.codeWindowToInfo(codeWindow));
            }
            else {
                windows.push(this.browserWindowToInfo(window));
            }
        }
        const pidToNames = [];
        for (const { pid, name } of UtilityProcess.getAll()) {
            pidToNames.push({ pid, name });
        }
        return {
            mainPID: process.pid,
            mainArguments: process.argv.slice(1),
            windows,
            pidToNames,
            screenReader: !!app.accessibilitySupportEnabled,
            gpuFeatureStatus: app.getGPUFeatureStatus(),
        };
    }
    async codeWindowToInfo(window) {
        const folderURIs = await this.getFolderURIs(window);
        const win = assertIsDefined(window.win);
        return this.browserWindowToInfo(win, folderURIs, window.remoteAuthority);
    }
    browserWindowToInfo(window, folderURIs = [], remoteAuthority) {
        return {
            id: window.id,
            pid: window.webContents.getOSProcessId(),
            title: window.getTitle(),
            folderURIs,
            remoteAuthority,
        };
    }
    async getFolderURIs(window) {
        const folderURIs = [];
        const workspace = window.openedWorkspace;
        if (isSingleFolderWorkspaceIdentifier(workspace)) {
            folderURIs.push(workspace.uri);
        }
        else if (isWorkspaceIdentifier(workspace)) {
            const resolvedWorkspace = await this.workspacesManagementMainService.resolveLocalWorkspace(workspace.configPath); // workspace folders can only be shown for local (resolved) workspaces
            if (resolvedWorkspace) {
                const rootFolders = resolvedWorkspace.folders;
                rootFolders.forEach((root) => {
                    folderURIs.push(root.uri);
                });
            }
        }
        return folderURIs;
    }
};
DiagnosticsMainService = __decorate([
    __param(0, IWindowsMainService),
    __param(1, IWorkspacesManagementMainService),
    __param(2, ILogService)
], DiagnosticsMainService);
export { DiagnosticsMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhZ25vc3RpY3MvZWxlY3Ryb24tbWFpbi9kaWFnbm9zdGljc01haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQW9DLE1BQU0sVUFBVSxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBV3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLG1CQUFtQixHQUNuQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMscUJBQXFCLEdBQ3JCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLHdCQUF3QixDQUFBO0FBQzFDLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLGVBQWUsQ0FBMEIsRUFBRSxDQUFDLENBQUE7QUFlNUUsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7SUFHbEMsWUFDdUMsa0JBQXVDLEVBRTVELCtCQUFpRSxFQUNwRCxVQUF1QjtRQUhmLHVCQUFrQixH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