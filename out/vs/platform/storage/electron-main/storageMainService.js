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
import { URI } from '../../../base/common/uri.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { AbstractStorageService, isProfileUsingDefaultStorage, } from '../common/storage.js';
import { ApplicationStorageMain, ProfileStorageMain, InMemoryStorageMain, WorkspaceStorageMain, } from './storageMain.js';
import { IUserDataProfilesService, } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesMainService } from '../../userDataProfile/electron-main/userDataProfile.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { Schemas } from '../../../base/common/network.js';
//#region Storage Main Service (intent: make application, profile and workspace storage accessible to windows from main process)
export const IStorageMainService = createDecorator('storageMainService');
let StorageMainService = class StorageMainService extends Disposable {
    constructor(logService, environmentService, userDataProfilesService, lifecycleMainService, fileService, uriIdentityService) {
        super();
        this.logService = logService;
        this.environmentService = environmentService;
        this.userDataProfilesService = userDataProfilesService;
        this.lifecycleMainService = lifecycleMainService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.shutdownReason = undefined;
        this._onDidChangeProfileStorage = this._register(new Emitter());
        this.onDidChangeProfileStorage = this._onDidChangeProfileStorage.event;
        //#endregion
        //#region Profile Storage
        this.mapProfileToStorage = new Map();
        //#endregion
        //#region Workspace Storage
        this.mapWorkspaceToStorage = new Map();
        this.applicationStorage = this._register(this.createApplicationStorage());
        this.registerListeners();
    }
    getStorageOptions() {
        return {
            useInMemoryStorage: !!this.environmentService.extensionTestsLocationURI, // no storage during extension tests!
        };
    }
    registerListeners() {
        // Application Storage: Warmup when any window opens
        ;
        (async () => {
            await this.lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */);
            this.applicationStorage.init();
        })();
        this._register(this.lifecycleMainService.onWillLoadWindow((e) => {
            // Profile Storage: Warmup when related window with profile loads
            if (e.window.profile) {
                this.profileStorage(e.window.profile).init();
            }
            // Workspace Storage: Warmup when related window with workspace loads
            if (e.workspace) {
                this.workspaceStorage(e.workspace).init();
            }
        }));
        // All Storage: Close when shutting down
        this._register(this.lifecycleMainService.onWillShutdown((e) => {
            this.logService.trace('storageMainService#onWillShutdown()');
            // Remember shutdown reason
            this.shutdownReason = e.reason;
            // Application Storage
            e.join('applicationStorage', this.applicationStorage.close());
            // Profile Storage(s)
            for (const [, profileStorage] of this.mapProfileToStorage) {
                e.join('profileStorage', profileStorage.close());
            }
            // Workspace Storage(s)
            for (const [, workspaceStorage] of this.mapWorkspaceToStorage) {
                e.join('workspaceStorage', workspaceStorage.close());
            }
        }));
        // Prepare storage location as needed
        this._register(this.userDataProfilesService.onWillCreateProfile((e) => {
            e.join((async () => {
                if (!(await this.fileService.exists(e.profile.globalStorageHome))) {
                    await this.fileService.createFolder(e.profile.globalStorageHome);
                }
            })());
        }));
        // Close the storage of the profile that is being removed
        this._register(this.userDataProfilesService.onWillRemoveProfile((e) => {
            const storage = this.mapProfileToStorage.get(e.profile.id);
            if (storage) {
                e.join(storage.close());
            }
        }));
    }
    createApplicationStorage() {
        this.logService.trace(`StorageMainService: creating application storage`);
        const applicationStorage = new ApplicationStorageMain(this.getStorageOptions(), this.userDataProfilesService, this.logService, this.fileService);
        this._register(Event.once(applicationStorage.onDidCloseStorage)(() => {
            this.logService.trace(`StorageMainService: closed application storage`);
        }));
        return applicationStorage;
    }
    profileStorage(profile) {
        if (isProfileUsingDefaultStorage(profile)) {
            return this.applicationStorage; // for profiles using default storage, use application storage
        }
        let profileStorage = this.mapProfileToStorage.get(profile.id);
        if (!profileStorage) {
            this.logService.trace(`StorageMainService: creating profile storage (${profile.name})`);
            profileStorage = this._register(this.createProfileStorage(profile));
            this.mapProfileToStorage.set(profile.id, profileStorage);
            const listener = this._register(profileStorage.onDidChangeStorage((e) => this._onDidChangeProfileStorage.fire({
                ...e,
                storage: profileStorage,
                profile,
            })));
            this._register(Event.once(profileStorage.onDidCloseStorage)(() => {
                this.logService.trace(`StorageMainService: closed profile storage (${profile.name})`);
                this.mapProfileToStorage.delete(profile.id);
                listener.dispose();
            }));
        }
        return profileStorage;
    }
    createProfileStorage(profile) {
        if (this.shutdownReason === 2 /* ShutdownReason.KILL */) {
            // Workaround for native crashes that we see when
            // SQLite DBs are being created even after shutdown
            // https://github.com/microsoft/vscode/issues/143186
            return new InMemoryStorageMain(this.logService, this.fileService);
        }
        return new ProfileStorageMain(profile, this.getStorageOptions(), this.logService, this.fileService);
    }
    workspaceStorage(workspace) {
        let workspaceStorage = this.mapWorkspaceToStorage.get(workspace.id);
        if (!workspaceStorage) {
            this.logService.trace(`StorageMainService: creating workspace storage (${workspace.id})`);
            workspaceStorage = this._register(this.createWorkspaceStorage(workspace));
            this.mapWorkspaceToStorage.set(workspace.id, workspaceStorage);
            this._register(Event.once(workspaceStorage.onDidCloseStorage)(() => {
                this.logService.trace(`StorageMainService: closed workspace storage (${workspace.id})`);
                this.mapWorkspaceToStorage.delete(workspace.id);
            }));
        }
        return workspaceStorage;
    }
    createWorkspaceStorage(workspace) {
        if (this.shutdownReason === 2 /* ShutdownReason.KILL */) {
            // Workaround for native crashes that we see when
            // SQLite DBs are being created even after shutdown
            // https://github.com/microsoft/vscode/issues/143186
            return new InMemoryStorageMain(this.logService, this.fileService);
        }
        return new WorkspaceStorageMain(workspace, this.getStorageOptions(), this.logService, this.environmentService, this.fileService);
    }
    //#endregion
    isUsed(path) {
        const pathUri = URI.file(path);
        for (const storage of [
            this.applicationStorage,
            ...this.mapProfileToStorage.values(),
            ...this.mapWorkspaceToStorage.values(),
        ]) {
            if (!storage.path) {
                continue;
            }
            if (this.uriIdentityService.extUri.isEqualOrParent(URI.file(storage.path), pathUri)) {
                return true;
            }
        }
        return false;
    }
};
StorageMainService = __decorate([
    __param(0, ILogService),
    __param(1, IEnvironmentService),
    __param(2, IUserDataProfilesMainService),
    __param(3, ILifecycleMainService),
    __param(4, IFileService),
    __param(5, IUriIdentityService)
], StorageMainService);
export { StorageMainService };
//#endregion
//#region Application Main Storage Service (intent: use application storage from main process)
export const IApplicationStorageMainService = createDecorator('applicationStorageMainService');
let ApplicationStorageMainService = class ApplicationStorageMainService extends AbstractStorageService {
    constructor(userDataProfilesService, storageMainService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.storageMainService = storageMainService;
        this.whenReady = this.storageMainService.applicationStorage.whenInit;
    }
    doInitialize() {
        // application storage is being initialized as part
        // of the first window opening, so we do not trigger
        // it here but can join it
        return this.storageMainService.applicationStorage.whenInit;
    }
    getStorage(scope) {
        if (scope === -1 /* StorageScope.APPLICATION */) {
            return this.storageMainService.applicationStorage.storage;
        }
        return undefined; // any other scope is unsupported from main process
    }
    getLogDetails(scope) {
        if (scope === -1 /* StorageScope.APPLICATION */) {
            return this.userDataProfilesService.defaultProfile.globalStorageHome.with({
                scheme: Schemas.file,
            }).fsPath;
        }
        return undefined; // any other scope is unsupported from main process
    }
    shouldFlushWhenIdle() {
        return false; // not needed here, will be triggered from any window that is opened
    }
    switch() {
        throw new Error('Migrating storage is unsupported from main process');
    }
    switchToProfile() {
        throw new Error('Switching storage profile is unsupported from main process');
    }
    switchToWorkspace() {
        throw new Error('Switching storage workspace is unsupported from main process');
    }
    hasScope() {
        throw new Error('Main process is never profile or workspace scoped');
    }
};
ApplicationStorageMainService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IStorageMainService)
], ApplicationStorageMainService);
export { ApplicationStorageMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RvcmFnZS9lbGVjdHJvbi1tYWluL3N0b3JhZ2VNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04scUJBQXFCLEdBR3JCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsNEJBQTRCLEdBSTVCLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixrQkFBa0IsRUFDbEIsbUJBQW1CLEVBR25CLG9CQUFvQixHQUVwQixNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENB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