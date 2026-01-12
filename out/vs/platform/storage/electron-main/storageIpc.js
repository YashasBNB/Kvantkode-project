/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { reviveIdentifier } from '../../workspace/common/workspace.js';
export class StorageDatabaseChannel extends Disposable {
    static { this.STORAGE_CHANGE_DEBOUNCE_TIME = 100; }
    constructor(logService, storageMainService) {
        super();
        this.logService = logService;
        this.storageMainService = storageMainService;
        this.onDidChangeApplicationStorageEmitter = this._register(new Emitter());
        this.mapProfileToOnDidChangeProfileStorageEmitter = new Map();
        this.registerStorageChangeListeners(storageMainService.applicationStorage, this.onDidChangeApplicationStorageEmitter);
    }
    //#region Storage Change Events
    registerStorageChangeListeners(storage, emitter) {
        // Listen for changes in provided storage to send to listeners
        // that are listening. Use a debouncer to reduce IPC traffic.
        this._register(Event.debounce(storage.onDidChangeStorage, (prev, cur) => {
            if (!prev) {
                prev = [cur];
            }
            else {
                prev.push(cur);
            }
            return prev;
        }, StorageDatabaseChannel.STORAGE_CHANGE_DEBOUNCE_TIME)((events) => {
            if (events.length) {
                emitter.fire(this.serializeStorageChangeEvents(events, storage));
            }
        }));
    }
    serializeStorageChangeEvents(events, storage) {
        const changed = new Map();
        const deleted = new Set();
        events.forEach((event) => {
            const existing = storage.get(event.key);
            if (typeof existing === 'string') {
                changed.set(event.key, existing);
            }
            else {
                deleted.add(event.key);
            }
        });
        return {
            changed: Array.from(changed.entries()),
            deleted: Array.from(deleted.values()),
        };
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onDidChangeStorage': {
                const profile = arg.profile ? revive(arg.profile) : undefined;
                // Without profile: application scope
                if (!profile) {
                    return this.onDidChangeApplicationStorageEmitter.event;
                }
                // With profile: profile scope for the profile
                let profileStorageChangeEmitter = this.mapProfileToOnDidChangeProfileStorageEmitter.get(profile.id);
                if (!profileStorageChangeEmitter) {
                    profileStorageChangeEmitter = this._register(new Emitter());
                    this.registerStorageChangeListeners(this.storageMainService.profileStorage(profile), profileStorageChangeEmitter);
                    this.mapProfileToOnDidChangeProfileStorageEmitter.set(profile.id, profileStorageChangeEmitter);
                }
                return profileStorageChangeEmitter.event;
            }
        }
        throw new Error(`Event not found: ${event}`);
    }
    //#endregion
    async call(_, command, arg) {
        const profile = arg.profile ? revive(arg.profile) : undefined;
        const workspace = reviveIdentifier(arg.workspace);
        // Get storage to be ready
        const storage = await this.withStorageInitialized(profile, workspace);
        // handle call
        switch (command) {
            case 'getItems': {
                return Array.from(storage.items.entries());
            }
            case 'updateItems': {
                const items = arg;
                if (items.insert) {
                    for (const [key, value] of items.insert) {
                        storage.set(key, value);
                    }
                }
                items.delete?.forEach((key) => storage.delete(key));
                break;
            }
            case 'optimize': {
                return storage.optimize();
            }
            case 'isUsed': {
                const path = arg.payload;
                if (typeof path === 'string') {
                    return this.storageMainService.isUsed(path);
                }
            }
            default:
                throw new Error(`Call not found: ${command}`);
        }
    }
    async withStorageInitialized(profile, workspace) {
        let storage;
        if (workspace) {
            storage = this.storageMainService.workspaceStorage(workspace);
        }
        else if (profile) {
            storage = this.storageMainService.profileStorage(profile);
        }
        else {
            storage = this.storageMainService.applicationStorage;
        }
        try {
            await storage.init();
        }
        catch (error) {
            this.logService.error(`StorageIPC#init: Unable to init ${workspace ? 'workspace' : profile ? 'profile' : 'application'} storage due to ${error}`);
        }
        return storage;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RvcmFnZS9lbGVjdHJvbi1tYWluL3N0b3JhZ2VJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBYTVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBMkIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRixNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTthQUM3QixpQ0FBNEIsR0FBRyxHQUFHLEFBQU4sQ0FBTTtJQVcxRCxZQUNrQixVQUF1QixFQUN2QixrQkFBdUM7UUFFeEQsS0FBSyxFQUFFLENBQUE7UUFIVSxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ3ZCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFYeEMseUNBQW9DLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDckUsSUFBSSxPQUFPLEVBQWlDLENBQzVDLENBQUE7UUFFZ0IsaURBQTRDLEdBQUcsSUFBSSxHQUFHLEVBR3BFLENBQUE7UUFRRixJQUFJLENBQUMsOEJBQThCLENBQ2xDLGtCQUFrQixDQUFDLGtCQUFrQixFQUNyQyxJQUFJLENBQUMsb0NBQW9DLENBQ3pDLENBQUE7SUFDRixDQUFDO0lBRUQsK0JBQStCO0lBRXZCLDhCQUE4QixDQUNyQyxPQUFxQixFQUNyQixPQUErQztRQUUvQyw4REFBOEQ7UUFDOUQsNkRBQTZEO1FBRTdELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLFFBQVEsQ0FDYixPQUFPLENBQUMsa0JBQWtCLEVBQzFC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