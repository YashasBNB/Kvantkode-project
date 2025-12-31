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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { parse, stringify } from '../../../../base/common/marshalling.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { AbstractSynchroniser, } from '../../../../platform/userDataSync/common/abstractSynchronizer.js';
import { IEditSessionsStorageService } from './editSessions.js';
import { IWorkspaceIdentityService } from '../../../services/workspaces/common/workspaceIdentityService.js';
class NullBackupStoreService {
    async writeResource() {
        return;
    }
    async getAllResourceRefs() {
        return [];
    }
    async resolveResourceContent() {
        return null;
    }
}
class NullEnablementService {
    constructor() {
        this._onDidChangeEnablement = new Emitter();
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._onDidChangeResourceEnablement = new Emitter();
        this.onDidChangeResourceEnablement = this._onDidChangeResourceEnablement.event;
    }
    isEnabled() {
        return true;
    }
    canToggleEnablement() {
        return true;
    }
    setEnablement(_enabled) { }
    isResourceEnabled(_resource) {
        return true;
    }
    isResourceEnablementConfigured(_resource) {
        return false;
    }
    setResourceEnablement(_resource, _enabled) { }
    getResourceSyncStateVersion(_resource) {
        return undefined;
    }
}
let WorkspaceStateSynchroniser = class WorkspaceStateSynchroniser extends AbstractSynchroniser {
    constructor(profile, collection, userDataSyncStoreService, logService, fileService, environmentService, telemetryService, configurationService, storageService, uriIdentityService, workspaceIdentityService, editSessionsStorageService) {
        const userDataSyncLocalStoreService = new NullBackupStoreService();
        const userDataSyncEnablementService = new NullEnablementService();
        super({ syncResource: "workspaceState" /* SyncResource.WorkspaceState */, profile }, collection, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncLocalStoreService, userDataSyncEnablementService, telemetryService, logService, configurationService, uriIdentityService);
        this.workspaceIdentityService = workspaceIdentityService;
        this.editSessionsStorageService = editSessionsStorageService;
        this.version = 1;
    }
    async sync() {
        const cancellationTokenSource = new CancellationTokenSource();
        const folders = await this.workspaceIdentityService.getWorkspaceStateFolders(cancellationTokenSource.token);
        if (!folders.length) {
            return null;
        }
        // Ensure we have latest state by sending out onWillSaveState event
        await this.storageService.flush();
        const keys = this.storageService.keys(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        if (!keys.length) {
            return null;
        }
        const contributedData = {};
        keys.forEach((key) => {
            const data = this.storageService.get(key, 1 /* StorageScope.WORKSPACE */);
            if (data) {
                contributedData[key] = data;
            }
        });
        const content = { folders, storage: contributedData, version: this.version };
        await this.editSessionsStorageService.write('workspaceState', stringify(content));
        return null;
    }
    async apply() {
        const payload = this.editSessionsStorageService.lastReadResources.get('editSessions')?.content;
        const workspaceStateId = payload
            ? JSON.parse(payload).workspaceStateId
            : undefined;
        const resource = await this.editSessionsStorageService.read('workspaceState', workspaceStateId);
        if (!resource) {
            return null;
        }
        const remoteWorkspaceState = parse(resource.content);
        if (!remoteWorkspaceState) {
            this.logService.info('Skipping initializing workspace state because remote workspace state does not exist.');
            return null;
        }
        // Evaluate whether storage is applicable for current workspace
        const cancellationTokenSource = new CancellationTokenSource();
        const replaceUris = await this.workspaceIdentityService.matches(remoteWorkspaceState.folders, cancellationTokenSource.token);
        if (!replaceUris) {
            this.logService.info('Skipping initializing workspace state because remote workspace state does not match current workspace.');
            return null;
        }
        const storage = {};
        for (const key of Object.keys(remoteWorkspaceState.storage)) {
            storage[key] = remoteWorkspaceState.storage[key];
        }
        if (Object.keys(storage).length) {
            // Initialize storage with remote storage
            const storageEntries = [];
            for (const key of Object.keys(storage)) {
                // Deserialize the stored state
                try {
                    const value = parse(storage[key]);
                    // Run URI conversion on the stored state
                    replaceUris(value);
                    storageEntries.push({
                        key,
                        value,
                        scope: 1 /* StorageScope.WORKSPACE */,
                        target: 0 /* StorageTarget.USER */,
                    });
                }
                catch {
                    storageEntries.push({
                        key,
                        value: storage[key],
                        scope: 1 /* StorageScope.WORKSPACE */,
                        target: 0 /* StorageTarget.USER */,
                    });
                }
            }
            this.storageService.storeAll(storageEntries, true);
        }
        this.editSessionsStorageService.delete('workspaceState', resource.ref);
        return null;
    }
    // TODO@joyceerhl implement AbstractSynchronizer in full
    applyResult(remoteUserData, lastSyncUserData, result, force) {
        throw new Error('Method not implemented.');
    }
    async generateSyncPreview(remoteUserData, lastSyncUserData, isRemoteDataFromCurrentMachine, userDataSyncConfiguration, token) {
        return [];
    }
    getMergeResult(resourcePreview, token) {
        throw new Error('Method not implemented.');
    }
    getAcceptResult(resourcePreview, resource, content, token) {
        throw new Error('Method not implemented.');
    }
    async hasRemoteChanged(lastSyncUserData) {
        return true;
    }
    async hasLocalData() {
        return false;
    }
    async resolveContent(uri) {
        return null;
    }
};
WorkspaceStateSynchroniser = __decorate([
    __param(4, IFileService),
    __param(5, IEnvironmentService),
    __param(6, ITelemetryService),
    __param(7, IConfigurationService),
    __param(8, IStorageService),
    __param(9, IUriIdentityService),
    __param(10, IWorkspaceIdentityService),
    __param(11, IEditSessionsStorageService)
], WorkspaceStateSynchroniser);
export { WorkspaceStateSynchroniser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFNlc3Npb25zL2NvbW1vbi93b3Jrc3BhY2VTdGF0ZVN5bmMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBRU4sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFNUYsT0FBTyxFQUNOLG9CQUFvQixHQUtwQixNQUFNLGtFQUFrRSxDQUFBO0FBY3pFLE9BQU8sRUFBZSwyQkFBMkIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzVFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRTNHLE1BQU0sc0JBQXNCO0lBRTNCLEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE9BQU07SUFDUCxDQUFDO0lBQ0QsS0FBSyxDQUFDLGtCQUFrQjtRQUN2QixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxLQUFLLENBQUMs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