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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZURhdGFDbGVhbmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9jb250cmliL3N0b3JhZ2VEYXRhQ2xlYW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSw0Q0FBNEMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2pILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVyRCxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFrQyxTQUFRLFVBQVU7SUFDaEUsWUFDNkMsa0JBQTZDLEVBQzNELFVBQXVCLEVBQ2hCLGlCQUFxQyxFQUNwQyxrQkFBdUM7UUFFN0UsS0FBSyxFQUFFLENBQUE7UUFMcUMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUEyQjtRQUMzRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2hCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDcEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUk3RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUN6QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQzdCLENBQUE7UUFDRCxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjO1FBQzNCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQixnR0FBZ0csQ0FDaEcsQ0FBQTtRQUVELElBQUksQ0FBQztZQUNKLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztnQkFDOUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2FBQ3BCLENBQUMsQ0FBQyxNQUFNLENBQUE7WUFDVCxNQUFNLHVCQUF1QixHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzVFLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtZQUV0RixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hCLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsc0JBQXNCLEVBQUUsRUFBRTtnQkFDNUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtnQkFFL0UsSUFBSSxzQkFBc0IsQ0FBQyxNQUFNLEtBQUssNkJBQTZCLEVBQUUsQ0FBQztvQkFDckUsT0FBTSxDQUFDLDJFQUEyRTtnQkFDbkYsQ0FBQztnQkFFRCxJQUFJLHNCQUFzQixLQUFLLDRDQUE0QyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNoRixPQUFNLENBQUMsb0VBQW9FO2dCQUM1RSxDQUFDO2dCQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQztvQkFDdkQsdUJBQXVCLEVBQUUsS0FBSztpQkFDOUIsQ0FBQyxDQUFBO2dCQUNGLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLEtBQUssc0JBQXNCLENBQUMsRUFBRSxDQUFDO29CQUMvRSxPQUFNLENBQUMsK0RBQStEO2dCQUN2RSxDQUFDO2dCQUVELE1BQU0sYUFBYSxHQUFHLE1BQU0sYUFBYSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO2dCQUN0RSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixPQUFNLENBQUMsOERBQThEO2dCQUN0RSxDQUFDO2dCQUVELElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQix3REFBd0Qsc0JBQXNCLCtDQUErQyxDQUM3SCxDQUFBO2dCQUVELE1BQU0sUUFBUSxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQ3hDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFoRVksaUNBQWlDO0lBRTNDLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUJBQW1CLENBQUE7R0FMVCxpQ0FBaUMsQ0FnRTdDIn0=