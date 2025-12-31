/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as objects from '../../../base/common/objects.js';
import { SYNC_SERVICE_URL_TYPE } from './userDataSync.js';
export function merge(localStorage, remoteStorage, baseStorage, storageKeys, logService) {
    if (!remoteStorage) {
        return {
            remote: {
                added: Object.keys(localStorage),
                removed: [],
                updated: [],
                all: Object.keys(localStorage).length > 0 ? localStorage : null,
            },
            local: { added: {}, removed: [], updated: {} },
        };
    }
    const localToRemote = compare(localStorage, remoteStorage);
    if (localToRemote.added.size === 0 &&
        localToRemote.removed.size === 0 &&
        localToRemote.updated.size === 0) {
        // No changes found between local and remote.
        return {
            remote: { added: [], removed: [], updated: [], all: null },
            local: { added: {}, removed: [], updated: {} },
        };
    }
    const baseToRemote = baseStorage
        ? compare(baseStorage, remoteStorage)
        : {
            added: Object.keys(remoteStorage).reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    const baseToLocal = baseStorage
        ? compare(baseStorage, localStorage)
        : {
            added: Object.keys(localStorage).reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    const local = { added: {}, removed: [], updated: {} };
    const remote = objects.deepClone(remoteStorage);
    const isFirstTimeSync = !baseStorage;
    // Added in local
    for (const key of baseToLocal.added.values()) {
        // If syncing for first time remote value gets precedence always,
        // except for sync service type key - local value takes precedence for this key
        if (key !== SYNC_SERVICE_URL_TYPE && isFirstTimeSync && baseToRemote.added.has(key)) {
            continue;
        }
        remote[key] = localStorage[key];
    }
    // Updated in local
    for (const key of baseToLocal.updated.values()) {
        remote[key] = localStorage[key];
    }
    // Removed in local
    for (const key of baseToLocal.removed.values()) {
        // Do not remove from remote if key is not registered.
        if (storageKeys.unregistered.includes(key)) {
            continue;
        }
        delete remote[key];
    }
    // Added in remote
    for (const key of baseToRemote.added.values()) {
        const remoteValue = remoteStorage[key];
        if (storageKeys.machine.includes(key)) {
            logService.info(`GlobalState: Skipped adding ${key} in local storage because it is declared as machine scoped.`);
            continue;
        }
        // Skip if the value is also added in local from the time it is last synced
        if (baseStorage && baseToLocal.added.has(key)) {
            continue;
        }
        const localValue = localStorage[key];
        if (localValue && localValue.value === remoteValue.value) {
            continue;
        }
        // Local sync service type value takes precedence if syncing for first time
        if (key === SYNC_SERVICE_URL_TYPE && isFirstTimeSync && baseToLocal.added.has(key)) {
            continue;
        }
        if (localValue) {
            local.updated[key] = remoteValue;
        }
        else {
            local.added[key] = remoteValue;
        }
    }
    // Updated in Remote
    for (const key of baseToRemote.updated.values()) {
        const remoteValue = remoteStorage[key];
        if (storageKeys.machine.includes(key)) {
            logService.info(`GlobalState: Skipped updating ${key} in local storage because it is declared as machine scoped.`);
            continue;
        }
        // Skip if the value is also updated or removed in local
        if (baseToLocal.updated.has(key) || baseToLocal.removed.has(key)) {
            continue;
        }
        const localValue = localStorage[key];
        if (localValue && localValue.value === remoteValue.value) {
            continue;
        }
        local.updated[key] = remoteValue;
    }
    // Removed in remote
    for (const key of baseToRemote.removed.values()) {
        if (storageKeys.machine.includes(key)) {
            logService.trace(`GlobalState: Skipped removing ${key} in local storage because it is declared as machine scoped.`);
            continue;
        }
        // Skip if the value is also updated or removed in local
        if (baseToLocal.updated.has(key) || baseToLocal.removed.has(key)) {
            continue;
        }
        local.removed.push(key);
    }
    const result = compare(remoteStorage, remote);
    return {
        local,
        remote: {
            added: [...result.added],
            updated: [...result.updated],
            removed: [...result.removed],
            all: result.added.size === 0 && result.removed.size === 0 && result.updated.size === 0
                ? null
                : remote,
        },
    };
}
function compare(from, to) {
    const fromKeys = Object.keys(from);
    const toKeys = Object.keys(to);
    const added = toKeys
        .filter((key) => !fromKeys.includes(key))
        .reduce((r, key) => {
        r.add(key);
        return r;
    }, new Set());
    const removed = fromKeys
        .filter((key) => !toKeys.includes(key))
        .reduce((r, key) => {
        r.add(key);
        return r;
    }, new Set());
    const updated = new Set();
    for (const key of fromKeys) {
        if (removed.has(key)) {
            continue;
        }
        const value1 = from[key];
        const value2 = to[key];
        if (!objects.equals(value1, value2)) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vZ2xvYmFsU3RhdGVNZXJnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELE9BQU8sRUFBaUIscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQWdCeEUsTUFBTSxVQUFVLEtBQUssQ0FDcEIsWUFBOEMsRUFDOUMsYUFBc0QsRUFDdEQsV0FBb0QsRUFDcEQsV0FBb0YsRUFDcEYsVUFBdUI7SUFFdkIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE9BQU87WUFDTixNQUFNLEVBQUU7Z0JBQ1AsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUNoQyxPQUFPLEVBQUUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsRUFBRTtnQkFDWCxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUk7YUFDL0Q7WUFDRCxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtTQUM5QyxDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDMUQsSUFDQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDO1FBQzlCLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDaEMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJ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