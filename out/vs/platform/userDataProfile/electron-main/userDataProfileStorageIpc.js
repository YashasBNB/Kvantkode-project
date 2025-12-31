/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { loadKeyTargets, TARGET_KEY } from '../../storage/common/storage.js';
export class ProfileStorageChangesListenerChannel extends Disposable {
    constructor(storageMainService, userDataProfilesService, logService) {
        super();
        this.storageMainService = storageMainService;
        this.userDataProfilesService = userDataProfilesService;
        this.logService = logService;
        const disposable = this._register(new MutableDisposable());
        this._onDidChange = this._register(new Emitter({
            // Start listening to profile storage changes only when someone is listening
            onWillAddFirstListener: () => (disposable.value = this.registerStorageChangeListeners()),
            // Stop listening to profile storage changes when no one is listening
            onDidRemoveLastListener: () => (disposable.value = undefined),
        }));
    }
    registerStorageChangeListeners() {
        this.logService.debug('ProfileStorageChangesListenerChannel#registerStorageChangeListeners');
        const disposables = new DisposableStore();
        disposables.add(Event.debounce(this.storageMainService.applicationStorage.onDidChangeStorage, (keys, e) => {
            if (keys) {
                keys.push(e.key);
            }
            else {
                keys = [e.key];
            }
            return keys;
        }, 100)((keys) => this.onDidChangeApplicationStorage(keys)));
        disposables.add(Event.debounce(this.storageMainService.onDidChangeProfileStorage, (changes, e) => {
            if (!changes) {
                changes = new Map();
            }
            let profileChanges = changes.get(e.profile.id);
            if (!profileChanges) {
                changes.set(e.profile.id, (profileChanges = { profile: e.profile, keys: [], storage: e.storage }));
            }
            profileChanges.keys.push(e.key);
            return changes;
        }, 100)((keys) => this.onDidChangeProfileStorage(keys)));
        return disposables;
    }
    onDidChangeApplicationStorage(keys) {
        const targetChangedProfiles = keys.includes(TARGET_KEY)
            ? [this.userDataProfilesService.defaultProfile]
            : [];
        const profileStorageValueChanges = [];
        keys = keys.filter((key) => key !== TARGET_KEY);
        if (keys.length) {
            const keyTargets = loadKeyTargets(this.storageMainService.applicationStorage.storage);
            profileStorageValueChanges.push({
                profile: this.userDataProfilesService.defaultProfile,
                changes: keys.map((key) => ({ key, scope: 0 /* StorageScope.PROFILE */, target: keyTargets[key] })),
            });
        }
        this.triggerEvents(targetChangedProfiles, profileStorageValueChanges);
    }
    onDidChangeProfileStorage(changes) {
        const targetChangedProfiles = [];
        const profileStorageValueChanges = new Map();
        for (const [profileId, profileChanges] of changes.entries()) {
            if (profileChanges.keys.includes(TARGET_KEY)) {
                targetChangedProfiles.push(profileChanges.profile);
            }
            const keys = profileChanges.keys.filter((key) => key !== TARGET_KEY);
            if (keys.length) {
                const keyTargets = loadKeyTargets(profileChanges.storage.storage);
                profileStorageValueChanges.set(profileId, {
                    profile: profileChanges.profile,
                    changes: keys.map((key) => ({
                        key,
                        scope: 0 /* StorageScope.PROFILE */,
                        target: keyTargets[key],
                    })),
                });
            }
        }
        this.triggerEvents(targetChangedProfiles, [...profileStorageValueChanges.values()]);
    }
    triggerEvents(targetChanges, valueChanges) {
        if (targetChanges.length || valueChanges.length) {
            this._onDidChange.fire({ valueChanges, targetChanges });
        }
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onDidChange':
                return this._onDidChange.event;
        }
        throw new Error(`[ProfileStorageChangesListenerChannel] Event not found: ${event}`);
    }
    async call(_, command) {
        throw new Error(`Call not found: ${command}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU3RvcmFnZUlwYy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhUHJvZmlsZS9lbGVjdHJvbi1tYWluL3VzZXJEYXRhUHJvZmlsZVN0b3JhZ2VJcGMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQU8xQyxPQUFPLEVBQUUsY0FBYyxFQUFnQixVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQU0xRixNQUFNLE9BQU8sb0NBQXFDLFNBQVEsVUFBVTtJQUduRSxZQUNrQixrQkFBdUMsRUFDdkMsdUJBQWlELEVBQ2pELFVBQXVCO1FBRXhDLEtBQUssRUFBRSxDQUFBO1FBSlUsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUN2Qyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ2pELGVBQVUsR0FBVixVQUFVLENBQWE7UUFHeEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFlLENBQUMsQ0FBQTtRQUN2RSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pDLElBQUksT0FBTyxDQUF5QjtZQUNuQyw0RUFBNEU7WUFDNUUsc0JBQXNCLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQ3hGLHFFQUFxRTtZQUNyRSx1QkFBdUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO1NBQzdELENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDhCQUE4QjtRQUNyQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsUUFBUSxDQUNiLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsRUFDN0QsQ0FBQyxJQUEwQixFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2pDLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDakIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsRUFDRCxHQUFHLENBQ0gsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQ3JELENBQUE7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyxRQUFRLENBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixFQUNqRCxDQUNDLE9BRVksRUFDWixDQUFDLEVBQ0EsRUFBRTtZQUNILElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBR2QsQ0FBQTtZQUNKLENBQUM7WUFDRCxJQUFJLGNBQWMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDOUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixPQUFPLENBQUMsR0FBRyxDQUNWLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUNaLENBQUMsY0FBYyxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQ3ZFLENBQUE7WUFDRixDQUFDO1lBQ0QsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQy9CLE9BQU8sT0FBTyxDQUFBO1FBQ2YsQ0FBQyxFQUNELEdBQUcsQ0FDSCxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDakQsQ0FBQTtRQUNELE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFTyw2QkFBNkIsQ0FBQyxJQUFjO1FBQ25ELE1BQU0scUJBQXFCLEdBQXVCLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQzFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUM7WUFDL0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtRQUNMLE1BQU0sMEJBQTBCLEdBQWtDLEVBQUUsQ0FBQTtRQUNwRSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxLQUFLLFVBQVUsQ0FBQyxDQUFBO1FBQy9DLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDckYsMEJBQTBCLENBQUMsSUFBSSxDQUFDO2dCQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWM7Z0JBQ3BELE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssOEJBQXNCLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDM0YsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRU8seUJBQXlCLENBQ2hDLE9BQTBGO1FBRTFGLE1BQU0scUJBQXFCLEdBQXVCLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLDBCQUEwQixHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFBO1FBQ2pGLEtBQUssTUFBTSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUM3RCxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDbkQsQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssVUFBVSxDQUFDLENBQUE7WUFDcEUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNqRSwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFO29CQUN6QyxPQUFPLEVBQUUsY0FBYyxDQUFDLE9BQU87b0JBQy9CLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUMzQixHQUFHO3dCQUNILEtBQUssOEJBQXNCO3dCQUMzQixNQUFNLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQztxQkFDdkIsQ0FBQyxDQUFDO2lCQUNILENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLEdBQUcsMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BGLENBQUM7SUFFTyxhQUFhLENBQ3BCLGFBQWlDLEVBQ2pDLFlBQTJDO1FBRTNDLElBQUksYUFBYSxDQUFDLE1BQU0sSUFBSSxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQTtRQUN4RCxDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxDQUFVLEVBQUUsS0FBYSxFQUFFLEdBQW9DO1FBQ3JFLFFBQVEsS0FBSyxFQUFFLENBQUM7WUFDZixLQUFLLGFBQWE7Z0JBQ2pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUFDaEMsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELEtBQUssRUFBRSxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBVSxFQUFFLE9BQWU7UUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0NBQ0QifQ==