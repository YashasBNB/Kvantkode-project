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
import { Disposable, DisposableMap, MutableDisposable, isDisposable, toDisposable, } from '../../../base/common/lifecycle.js';
import { Storage } from '../../../base/parts/storage/common/storage.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { AbstractStorageService, IStorageService, isProfileUsingDefaultStorage, } from '../../storage/common/storage.js';
import { Emitter } from '../../../base/common/event.js';
import { ApplicationStorageDatabaseClient, ProfileStorageDatabaseClient, } from '../../storage/common/storageIpc.js';
import { reviveProfile } from './userDataProfile.js';
export const IUserDataProfileStorageService = createDecorator('IUserDataProfileStorageService');
let AbstractUserDataProfileStorageService = class AbstractUserDataProfileStorageService extends Disposable {
    constructor(persistStorages, storageService) {
        super();
        this.storageService = storageService;
        if (persistStorages) {
            this.storageServicesMap = this._register(new DisposableMap());
        }
    }
    async readStorageData(profile) {
        return this.withProfileScopedStorageService(profile, async (storageService) => this.getItems(storageService));
    }
    async updateStorageData(profile, data, target) {
        return this.withProfileScopedStorageService(profile, async (storageService) => this.writeItems(storageService, data, target));
    }
    async withProfileScopedStorageService(profile, fn) {
        if (this.storageService.hasScope(profile)) {
            return fn(this.storageService);
        }
        let storageService = this.storageServicesMap?.get(profile.id);
        if (!storageService) {
            storageService = new StorageService(this.createStorageDatabase(profile));
            this.storageServicesMap?.set(profile.id, storageService);
            try {
                await storageService.initialize();
            }
            catch (error) {
                if (this.storageServicesMap?.has(profile.id)) {
                    this.storageServicesMap.deleteAndDispose(profile.id);
                }
                else {
                    storageService.dispose();
                }
                throw error;
            }
        }
        try {
            const result = await fn(storageService);
            await storageService.flush();
            return result;
        }
        finally {
            if (!this.storageServicesMap?.has(profile.id)) {
                storageService.dispose();
            }
        }
    }
    getItems(storageService) {
        const result = new Map();
        const populate = (target) => {
            for (const key of storageService.keys(0 /* StorageScope.PROFILE */, target)) {
                result.set(key, { value: storageService.get(key, 0 /* StorageScope.PROFILE */), target });
            }
        };
        populate(0 /* StorageTarget.USER */);
        populate(1 /* StorageTarget.MACHINE */);
        return result;
    }
    writeItems(storageService, items, target) {
        storageService.storeAll(Array.from(items.entries()).map(([key, value]) => ({
            key,
            value,
            scope: 0 /* StorageScope.PROFILE */,
            target,
        })), true);
    }
};
AbstractUserDataProfileStorageService = __decorate([
    __param(1, IStorageService)
], AbstractUserDataProfileStorageService);
export { AbstractUserDataProfileStorageService };
export class RemoteUserDataProfileStorageService extends AbstractUserDataProfileStorageService {
    constructor(persistStorages, remoteService, userDataProfilesService, storageService, logService) {
        super(persistStorages, storageService);
        this.remoteService = remoteService;
        const channel = remoteService.getChannel('profileStorageListener');
        const disposable = this._register(new MutableDisposable());
        this._onDidChange = this._register(new Emitter({
            // Start listening to profile storage changes only when someone is listening
            onWillAddFirstListener: () => {
                disposable.value = channel.listen('onDidChange')((e) => {
                    logService.trace('profile storage changes', e);
                    this._onDidChange.fire({
                        targetChanges: e.targetChanges.map((profile) => reviveProfile(profile, userDataProfilesService.profilesHome.scheme)),
                        valueChanges: e.valueChanges.map((e) => ({
                            ...e,
                            profile: reviveProfile(e.profile, userDataProfilesService.profilesHome.scheme),
                        })),
                    });
                });
            },
            // Stop listening to profile storage changes when no one is listening
            onDidRemoveLastListener: () => (disposable.value = undefined),
        }));
        this.onDidChange = this._onDidChange.event;
    }
    async createStorageDatabase(profile) {
        const storageChannel = this.remoteService.getChannel('storage');
        return isProfileUsingDefaultStorage(profile)
            ? new ApplicationStorageDatabaseClient(storageChannel)
            : new ProfileStorageDatabaseClient(storageChannel, profile);
    }
}
class StorageService extends AbstractStorageService {
    constructor(profileStorageDatabase) {
        super({ flushInterval: 100 });
        this.profileStorageDatabase = profileStorageDatabase;
    }
    async doInitialize() {
        const profileStorageDatabase = await this.profileStorageDatabase;
        const profileStorage = new Storage(profileStorageDatabase);
        this._register(profileStorage.onDidChangeStorage((e) => {
            this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e);
        }));
        this._register(toDisposable(() => {
            profileStorage.close();
            profileStorage.dispose();
            if (isDisposable(profileStorageDatabase)) {
                profileStorageDatabase.dispose();
            }
        }));
        this.profileStorage = profileStorage;
        return this.profileStorage.init();
    }
    getStorage(scope) {
        return scope === 0 /* StorageScope.PROFILE */ ? this.profileStorage : undefined;
    }
    getLogDetails() {
        return undefined;
    }
    async switchToProfile() { }
    async switchToWorkspace() { }
    hasScope() {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvY29tbW9uL3VzZXJEYXRhUHJvZmlsZVN0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGlCQUFpQixFQUNqQixZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUE4QixPQUFPLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixlQUFlLEVBSWYsNEJBQTRCLEdBQzVCLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRzlELE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsNEJBQTRCLEdBQzVCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUE4QyxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQWlCaEcsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUM1RCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQW9DTSxJQUFlLHFDQUFxQyxHQUFwRCxNQUFlLHFDQUNyQixTQUFRLFVBQVU7SUFTbEIsWUFDQyxlQUF3QixFQUNZLGNBQStCO1FBRW5FLEtBQUssRUFBRSxDQUFBO1FBRjZCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUduRSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFB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