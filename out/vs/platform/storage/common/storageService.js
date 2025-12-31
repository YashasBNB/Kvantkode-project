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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL2NvbW1vbi9zdG9yYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFZLE9BQU8sRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBR2pGLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsNEJBQTRCLEVBRTVCLG1CQUFtQixHQUNuQixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLDRCQUE0QixFQUM1Qiw4QkFBOEIsR0FDOUIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0saURBQWlELENBQUE7QUFHeEQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLHNCQUFzQjtJQVkvRCxZQUNDLGdCQUFxRCxFQUNyRCxlQUF1RixFQUN0RSxhQUE2QixFQUM3QixrQkFBdUM7UUFFeEQsS0FBSyxFQUFFLENBQUE7UUFIVSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQVh4Qyw4QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUlqRSxnQ0FBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQVdu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