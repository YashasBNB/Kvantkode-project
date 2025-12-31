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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { join } from '../../../../base/common/path.js';
import { Promises } from '../../../../base/node/pfs.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { StorageClient } from '../../../../platform/storage/common/storageIpc.js';
import { EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE } from '../../../../platform/workspace/common/workspace.js';
import { NON_EMPTY_WORKSPACE_ID_LENGTH } from '../../../../platform/workspaces/node/workspaces.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { Schemas } from '../../../../base/common/network.js';
let UnusedWorkspaceStorageDataCleaner = class UnusedWorkspaceStorageDataCleaner extends Disposable {
    constructor(environmentService, logService, nativeHostService, mainProcessService) {
        super();
        this.environmentService = environmentService;
        this.logService = logService;
        this.nativeHostService = nativeHostService;
        this.mainProcessService = mainProcessService;
        const scheduler = this._register(new RunOnceScheduler(() => {
            this.cleanUpStorage();
        }, 30 * 1000 /* after 30s */));
        scheduler.schedule();
    }
    async cleanUpStorage() {
        this.logService.trace('[storage cleanup]: Starting to clean up workspace storage folders for unused empty workspaces.');
        try {
            const workspaceStorageHome = this.environmentService.workspaceStorageHome.with({
                scheme: Schemas.file,
            }).fsPath;
            const workspaceStorageFolders = await Promises.readdir(workspaceStorageHome);
            const storageClient = new StorageClient(this.mainProcessService.getChannel('storage'));
            await Promise.all(workspaceStorageFolders.map(async (workspaceStorageFolder) => {
                const workspaceStoragePath = join(workspaceStorageHome, workspaceStorageFolder);
                if (workspaceStorageFolder.length === NON_EMPTY_WORKSPACE_ID_LENGTH) {
                    return; // keep workspace storage for folders/workspaces that can be accessed still
                }
                if (workspaceStorageFolder === EXTENSION_DEVELOPMENT_EMPTY_WINDOW_WORKSPACE.id) {
                    return; // keep workspace storage for empty extension development workspaces
                }
                const windows = await this.nativeHostService.getWindows({
                    includeAuxiliaryWindows: false,
                });
                if (windows.some((window) => window.workspace?.id === workspaceStorageFolder)) {
                    return; // keep workspace storage for empty workspaces opened as window
                }
                const isStorageUsed = await storageClient.isUsed(workspaceStoragePath);
                if (isStorageUsed) {
                    return; // keep workspace storage for empty workspaces that are in use
                }
                this.logService.trace(`[storage cleanup]: Deleting workspace storage folder ${workspaceStorageFolder} as it seems to be an unused empty workspace.`);
                await Promises.rm(workspaceStoragePath);
            }));
        }
        catch (error) {
            onUnexpectedError(error);
        }
    }
};
UnusedWorkspaceStorageDataCleaner = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ILogService),
    __param(2, INativeHostService),
    __param(3, IMainProcessService)
], UnusedWorkspaceStorageDataCleaner);
export { UnusedWorkspaceStorageDataCleaner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZURhdGFDbGVhbmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9lbGVjdHJvbi11dGlsaXR5L3NoYXJlZFByb2Nlc3MvY29udHJpYi9zdG9yYWdlRGF0YUNsZWFuZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsNENBQTRDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckQsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBa0MsU0FBUSxVQUFVO0lBQ2hFLFlBQzZDLGtCQUE2QyxFQUMzRCxVQUF1QixFQUNoQixpQkFBcUMsRUFD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