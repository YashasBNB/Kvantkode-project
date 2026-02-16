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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2xvYmFsU3RhdGVNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9nbG9iYWxTdGF0ZU1lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsT0FBTyxFQUFpQixxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBZ0J4RSxNQUFNLFVBQVUsS0FBSyxDQUNwQixZQUE4QyxFQUM5QyxhQUFzRCxFQUN0RCxXQUFvRCxFQUNwRCxXQUFvRixFQUNwRixVQUF1QjtJQUV2QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEIsT0FBTztZQUNOLE1BQU0sRUFBRTtnQkFDUCxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2hDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxFQUFFO2dCQUNYLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSTthQUMvRDtZQUNELEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFO1NBQzlDLENBQUE7SUFDRixDQUFDO0lBRUQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUMxRCxJQUNDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDOUIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQztRQUNoQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQy9CLENBQUM7UUFDRiw2Q0FBNkM7UUFDN0MsT0FBTztZQUNOLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7WUFDMUQsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7U0FDOUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLFlBQVksR0FBRyxXQUFXO1FBQy9CLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQztRQUNyQyxDQUFDLENBQUM7WUFDQSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2pELENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ1IsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUNyQixPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQVU7WUFDMUIsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFVO1NBQzFCLENBQUE7SUFDSCxNQUFNLFdBQVcsR0FBRyxXQUFXO1FBQzlCLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQztRQUNwQyxDQUFDLENBQUM7WUFDQSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2hELENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ1IsT0FBTyxDQUFDLENBQUE7WUFDVCxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUNyQixPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQVU7WUFDMUIsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFVO1NBQzFCLENBQUE7SUFFSCxNQUFNLEtBQUssR0FJUCxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFDM0MsTUFBTSxNQUFNLEdBQXFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7SUFFakYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxXQUFXLENBQUE7SUFFcEMsaUJBQWlCO0lBQ2pCLEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQzlDLGlFQUFpRTtRQUNqRSwrRUFBK0U7UUFDL0UsSUFBSSxHQUFHLEtBQUsscUJBQXFCLElBQUksZUFBZSxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDckYsU0FBUTtRQUNULENBQUM7UUFFRCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxtQkFBbUI7SUFDbkIsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDaEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ2hELHNEQUFzRDtRQUN0RCxJQUFJLFdBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUMsU0FBUTtRQUNULENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNuQixDQUFDO0lBRUQsa0JBQWtCO0lBQ2xCLEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQy9DLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkMsVUFBVSxDQUFDLElBQUksQ0FDZCwrQkFBK0IsR0FBRyw2REFBNkQsQ0FDL0YsQ0FBQTtZQUNELFNBQVE7UUFDVCxDQUFDO1FBQ0QsMkVBQTJFO1FBQzNFLElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDL0MsU0FBUTtRQUNULENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEMsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDMUQsU0FBUTtRQUNULENBQUM7UUFFRCwyRUFBMkU7UUFDM0UsSUFBSSxHQUFHLEtBQUsscUJBQXFCLElBQUksZUFBZSxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEYsU0FBUTtRQUNULENBQUM7UUFFRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFBO1FBQ2pDLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUM7SUFFRCxvQkFBb0I7SUFDcEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDakQsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxVQUFVLENBQUMsSUFBSSxDQUNkLGlDQUFpQyxHQUFHLDZEQUE2RCxDQUNqRyxDQUFBO1lBQ0QsU0FBUTtRQUNULENBQUM7UUFDRCx3REFBd0Q7UUFDeEQsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2xFLFNBQVE7UUFDVCxDQUFDO1FBQ0QsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzFELFNBQVE7UUFDVCxDQUFDO1FBQ0QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLENBQUE7SUFDakMsQ0FBQztJQUVELG9CQUFvQjtJQUNwQixLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUNqRCxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkMsVUFBVSxDQUFDLEtBQUssQ0FDZixpQ0FBaUMsR0FBRyw2REFBNkQsQ0FDakcsQ0FBQTtZQUNELFNBQVE7UUFDVCxDQUFDO1FBQ0Qsd0RBQXdEO1FBQ3hELElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxTQUFRO1FBQ1QsQ0FBQztRQUNELEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzdDLE9BQU87UUFDTixLQUFLO1FBQ0wsTUFBTSxFQUFFO1lBQ1AsS0FBSyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUM1QixPQUFPLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDNUIsR0FBRyxFQUNGLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQztnQkFDaEYsQ0FBQyxDQUFDLElBQUk7Z0JBQ04sQ0FBQyxDQUFDLE1BQU07U0FDVjtLQUNELENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxPQUFPLENBQ2YsSUFBNEIsRUFDNUIsRUFBMEI7SUFFMUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNsQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzlCLE1BQU0sS0FBSyxHQUFHLE1BQU07U0FDbEIsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2xCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDVixPQUFPLENBQUMsQ0FBQTtJQUNULENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBVSxDQUFDLENBQUE7SUFDdEIsTUFBTSxPQUFPLEdBQUcsUUFBUTtTQUN0QixNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDbEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNWLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQTtJQUN0QixNQUFNLE9BQU8sR0FBZ0IsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUU5QyxLQUFLLE1BQU0sR0FBRyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQzVCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RCLFNBQVE7UUFDVCxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUE7QUFDbkMsQ0FBQyJ9