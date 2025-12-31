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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvZWxlY3Ryb24tbWFpbi9zdG9yYWdlSXBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQWE1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQTJCLE1BQU0scUNBQXFDLENBQUE7QUFFL0YsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFVBQVU7YUFDN0IsaUNBQTRCLEdBQUcsR0FBRyxBQUFOLENBQU07SUFXMUQsWUFDa0IsVUFBdUIsRUFDdkIsa0JBQXVDO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBSFUsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN2Qix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBWHhDLHlDQUFvQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JFLElBQUksT0FBTyxFQUFpQyxDQUM1QyxDQUFBO1FBRWdCLGlEQUE0QyxHQUFHLElBQUksR0FBRyxFQUdwRSxDQUFBO1FBUUYsSUFBSSxDQUFDLDhCQUE4QixDQUNsQyxrQkFBa0IsQ0FBQyxrQkFBa0IsRUFDckMsSUFBSSxDQUFDLG9DQUFvQyxDQUN6QyxDQUFBO0lBQ0YsQ0FBQztJQUVELCtCQUErQjtJQUV2Qiw4QkFBOEIsQ0FDckMsT0FBcUIsRUFDckIsT0FBK0M7UUFFL0MsOERBQThEO1FBQzlELDZEQUE2RDtRQUU3RCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxRQUFRLENBQ2IsT0FBTyxDQUFDLGtCQUFrQixFQUMxQixDQUFD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