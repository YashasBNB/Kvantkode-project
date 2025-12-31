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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RpYWdub3N0aWNzL2VsZWN0cm9uLW1haW4vZGlhZ25vc3RpY3NNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFvQyxNQUFNLFVBQVUsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVd4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUNOLCtCQUErQixFQUMvQixtQkFBbUIsR0FDbkIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLHFCQUFxQixHQUNyQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3BILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXJGLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQTtBQUMxQyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENBQTBCLEVBQUUsQ0FBQyxDQUFBO0FBZTVFLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBR2xDLFlBQ3VDLGtCQUF1QyxFQUU1RCwrQkFBaUUsRUFDcEQsVUFBdUI7UUFIZix1QkFBa0IsR0FBbEIs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