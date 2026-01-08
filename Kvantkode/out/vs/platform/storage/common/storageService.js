/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises } from '../../../base/common/async.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { joinPath } from '../../../base/common/resources.js';
import { Storage } from '../../../base/parts/storage/common/storage.js';
import { AbstractStorageService, isProfileUsingDefaultStorage, WillSaveStateReason, } from './storage.js';
import { ApplicationStorageDatabaseClient, ProfileStorageDatabaseClient, WorkspaceStorageDatabaseClient, } from './storageIpc.js';
import { isUserDataProfile, } from '../../userDataProfile/common/userDataProfile.js';
export class RemoteStorageService extends AbstractStorageService {
    constructor(initialWorkspace, initialProfiles, remoteService, environmentService) {
        super();
        this.remoteService = remoteService;
        this.environmentService = environmentService;
        this.profileStorageDisposables = this._register(new DisposableStore());
        this.workspaceStorageDisposables = this._register(new DisposableStore());
        this.applicationStorageProfile = initialProfiles.defaultProfile;
        this.applicationStorage = this.createApplicationStorage();
        this.profileStorageProfile = initialProfiles.currentProfile;
        this.profileStorage = this.createProfileStorage(this.profileStorageProfile);
        this.workspaceStorageId = initialWorkspace?.id;
        this.workspaceStorage = this.createWorkspaceStorage(initialWorkspace);
    }
    createApplicationStorage() {
        const storageDataBaseClient = this._register(new ApplicationStorageDatabaseClient(this.remoteService.getChannel('storage')));
        const applicationStorage = this._register(new Storage(storageDataBaseClient));
        this._register(applicationStorage.onDidChangeStorage((e) => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
        return applicationStorage;
    }
    createProfileStorage(profile) {
        // First clear any previously associated disposables
        this.profileStorageDisposables.clear();
        // Remember profile associated to profile storage
        this.profileStorageProfile = profile;
        let profileStorage;
        if (isProfileUsingDefaultStorage(profile)) {
            // If we are using default profile storage, the profile storage is
            // actually the same as application storage. As such we
            // avoid creating the storage library a second time on
            // the same DB.
            profileStorage = this.applicationStorage;
        }
        else {
            const storageDataBaseClient = this.profileStorageDisposables.add(new ProfileStorageDatabaseClient(this.remoteService.getChannel('storage'), profile));
            profileStorage = this.profileStorageDisposables.add(new Storage(storageDataBaseClient));
        }
        this.profileStorageDisposables.add(profileStorage.onDidChangeStorage((e) => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        return profileStorage;
    }
    createWorkspaceStorage(workspace) {
        // First clear any previously associated disposables
        this.workspaceStorageDisposables.clear();
        // Remember workspace ID for logging later
        this.workspaceStorageId = workspace?.id;
        let workspaceStorage = undefined;
        if (workspace) {
            const storageDataBaseClient = this.workspaceStorageDisposables.add(new WorkspaceStorageDatabaseClient(this.remoteService.getChannel('storage'), workspace));
            workspaceStorage = this.workspaceStorageDisposables.add(new Storage(storageDataBaseClient));
            this.workspaceStorageDisposables.add(workspaceStorage.onDidChangeStorage((e) => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        }
        return workspaceStorage;
    }
    async doInitialize() {
        // Init all storage locations
        await Promises.settled([
            this.applicationStorage.init(),
            this.profileStorage.init(),
            this.workspaceStorage?.init() ?? Promise.resolve(),
        ]);
    }
    getStorage(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorage;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorage;
            default:
                return this.workspaceStorage;
        }
    }
    getLogDetails(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorageProfile.globalStorageHome.with({ scheme: Schemas.file })
                    .fsPath;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorageProfile?.globalStorageHome.with({ scheme: Schemas.file }).fsPath;
            default:
                return this.workspaceStorageId
                    ? `${joinPath(this.environmentService.workspaceStorageHome, this.workspaceStorageId, 'state.vscdb').with({ scheme: Schemas.file }).fsPath}`
                    : undefined;
        }
    }
    async close() {
        // Stop periodic scheduler and idle runner as we now collect state normally
        this.stopFlushWhenIdle();
        // Signal as event so that clients can still store data
        this.emitWillSaveState(WillSaveStateReason.SHUTDOWN);
        // Do it
        await Promises.settled([
            this.applicationStorage.close(),
            this.profileStorage.close(),
            this.workspaceStorage?.close() ?? Promise.resolve(),
        ]);
    }
    async switchToProfile(toProfile) {
        if (!this.canSwitchProfile(this.profileStorageProfile, toProfile)) {
            return;
        }
        const oldProfileStorage = this.profileStorage;
        const oldItems = oldProfileStorage.items;
        // Close old profile storage but only if this is
        // different from application storage!
        if (oldProfileStorage !== this.applicationStorage) {
            await oldProfileStorage.close();
        }
        // Create new profile storage & init
        this.profileStorage = this.createProfileStorage(toProfile);
        await this.profileStorage.init();
        // Handle data switch and eventing
        this.switchData(oldItems, this.profileStorage, 0 /* StorageScope.PROFILE */);
    }
    async switchToWorkspace(toWorkspace, preserveData) {
        const oldWorkspaceStorage = this.workspaceStorage;
        const oldItems = oldWorkspaceStorage?.items ?? new Map();
        // Close old workspace storage
        await oldWorkspaceStorage?.close();
        // Create new workspace storage & init
        this.workspaceStorage = this.createWorkspaceStorage(toWorkspace);
        await this.workspaceStorage.init();
        // Handle data switch and eventing
        this.switchData(oldItems, this.workspaceStorage, 1 /* StorageScope.WORKSPACE */);
    }
    hasScope(scope) {
        if (isUserDataProfile(scope)) {
            return this.profileStorageProfile.id === scope.id;
        }
        return this.workspaceStorageId === scope.id;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvY29tbW9uL3N0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQVksT0FBTyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFHakYsT0FBTyxFQUNOLHNCQUFzQixFQUN0Qiw0QkFBNEIsRUFFNUIsbUJBQW1CLEdBQ25CLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsNEJBQTRCLEVBQzVCLDhCQUE4QixHQUM5QixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSxpREFBaUQsQ0FBQTtBQUd4RCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsc0JBQXNCO0lBWS9ELFlBQ0MsZ0JBQXFELEVBQ3JELGVBQXVGLEVBQ3RFLGFBQTZCLEVBQzdCLGtCQUF1QztRQUV4RCxLQUFLLEVBQUUsQ0FBQTtRQUhVLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM3Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBWHhDLDhCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBSWpFLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFB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