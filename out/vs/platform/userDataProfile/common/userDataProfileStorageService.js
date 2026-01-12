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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9jb21tb24vdXNlckRhdGFQcm9maWxlU3RvcmFnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQThCLE9BQU8sRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGVBQWUsRUFJZiw0QkFBNEIsR0FDNUIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFHOUQsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyw0QkFBNEIsR0FDNUIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQThDLGFBQWEsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBaUJoRyxNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxlQUFlLENBQzVELGdDQUFnQyxDQUNoQyxDQUFBO0FBb0NNLElBQWUscUNBQXFDLEdBQXBELE1BQWUscUNBQ3JCLFNBQVEsVUFBVTtJQVNsQixZQUNDLGVBQXdCLEVBQ1ksY0FBK0I7UUFFbkUsS0FBSyxFQUFFLENBQUE7UUFGNkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBR25FLElBQUksZUFBZSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFB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