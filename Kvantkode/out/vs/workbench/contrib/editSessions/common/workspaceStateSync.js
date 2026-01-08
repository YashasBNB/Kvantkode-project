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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlU3RhdGVTeW5jLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0U2Vzc2lvbnMvY29tbW9uL3dvcmtzcGFjZVN0YXRlU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU1RixPQUFPLEVBQ04sb0JBQW9CLEdBS3BCLE1BQU0sa0VBQWtFLENBQUE7QUFjekUsT0FBTyxFQUFlLDJCQUEyQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDNUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFFM0csTUFBTSxzQkFBc0I7SUFFM0IsS0FBSyxDQUFDLGFBQWE7UUFDbEIsT0FBTTtJQUNQLENBQUM7SUFDRCxLQUFLLENBQUMsa0JBQWtCO1FBQ3ZCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELEtBQUss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