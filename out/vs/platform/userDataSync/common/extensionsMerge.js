/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepClone, equals } from '../../../base/common/objects.js';
import * as semver from '../../../base/common/semver/semver.js';
import { assertIsDefined } from '../../../base/common/types.js';
export function merge(localExtensions, remoteExtensions, lastSyncExtensions, skippedExtensions, ignoredExtensions, lastSyncBuiltinExtensions) {
    const added = [];
    const removed = [];
    const updated = [];
    if (!remoteExtensions) {
        const remote = localExtensions.filter(({ identifier }) => ignoredExtensions.every((id) => id.toLowerCase() !== identifier.id.toLowerCase()));
        return {
            local: {
                added,
                removed,
                updated,
            },
            remote: remote.length > 0
                ? {
                    added: remote,
                    updated: [],
                    removed: [],
                    all: remote,
                }
                : null,
        };
    }
    localExtensions = localExtensions.map(massageIncomingExtension);
    remoteExtensions = remoteExtensions.map(massageIncomingExtension);
    lastSyncExtensions = lastSyncExtensions ? lastSyncExtensions.map(massageIncomingExtension) : null;
    const uuids = new Map();
    const addUUID = (identifier) => {
        if (identifier.uuid) {
            uuids.set(identifier.id.toLowerCase(), identifier.uuid);
        }
    };
    localExtensions.forEach(({ identifier }) => addUUID(identifier));
    remoteExtensions.forEach(({ identifier }) => addUUID(identifier));
    lastSyncExtensions?.forEach(({ identifier }) => addUUID(identifier));
    skippedExtensions?.forEach(({ identifier }) => addUUID(identifier));
    lastSyncBuiltinExtensions?.forEach((identifier) => addUUID(identifier));
    const getKey = (extension) => {
        const uuid = extension.identifier.uuid || uuids.get(extension.identifier.id.toLowerCase());
        return uuid ? `uuid:${uuid}` : `id:${extension.identifier.id.toLowerCase()}`;
    };
    const addExtensionToMap = (map, extension) => {
        map.set(getKey(extension), extension);
        return map;
    };
    const localExtensionsMap = localExtensions.reduce(addExtensionToMap, new Map());
    const remoteExtensionsMap = remoteExtensions.reduce(addExtensionToMap, new Map());
    const newRemoteExtensionsMap = remoteExtensions.reduce((map, extension) => addExtensionToMap(map, deepClone(extension)), new Map());
    const lastSyncExtensionsMap = lastSyncExtensions
        ? lastSyncExtensions.reduce(addExtensionToMap, new Map())
        : null;
    const skippedExtensionsMap = skippedExtensions.reduce(addExtensionToMap, new Map());
    const ignoredExtensionsSet = ignoredExtensions.reduce((set, id) => {
        const uuid = uuids.get(id.toLowerCase());
        return set.add(uuid ? `uuid:${uuid}` : `id:${id.toLowerCase()}`);
    }, new Set());
    const lastSyncBuiltinExtensionsSet = lastSyncBuiltinExtensions
        ? lastSyncBuiltinExtensions.reduce((set, { id, uuid }) => {
            uuid = uuid ?? uuids.get(id.toLowerCase());
            return set.add(uuid ? `uuid:${uuid}` : `id:${id.toLowerCase()}`);
        }, new Set())
        : null;
    const localToRemote = compare(localExtensionsMap, remoteExtensionsMap, ignoredExtensionsSet, false);
    if (localToRemote.added.size > 0 ||
        localToRemote.removed.size > 0 ||
        localToRemote.updated.size > 0) {
        const baseToLocal = compare(lastSyncExtensionsMap, localExtensionsMap, ignoredExtensionsSet, false);
        const baseToRemote = compare(lastSyncExtensionsMap, remoteExtensionsMap, ignoredExtensionsSet, true);
        const merge = (key, localExtension, remoteExtension, preferred) => {
            let pinned, version, preRelease;
            if (localExtension.installed) {
                pinned = preferred.pinned;
                preRelease = preferred.preRelease;
                if (pinned) {
                    version = preferred.version;
                }
            }
            else {
                pinned = remoteExtension.pinned;
                preRelease = remoteExtension.preRelease;
                if (pinned) {
                    version = remoteExtension.version;
                }
            }
            if (pinned === undefined /* from older client*/) {
                pinned = localExtension.pinned;
                if (pinned) {
                    version = localExtension.version;
                }
            }
            if (preRelease === undefined /* from older client*/) {
                preRelease = localExtension.preRelease;
            }
            return {
                ...preferred,
                installed: localExtension.installed || remoteExtension.installed,
                pinned,
                preRelease,
                version: version ??
                    (remoteExtension.version &&
                        (!localExtension.installed || semver.gt(remoteExtension.version, localExtension.version))
                        ? remoteExtension.version
                        : localExtension.version),
                state: mergeExtensionState(localExtension, remoteExtension, lastSyncExtensionsMap?.get(key)),
            };
        };
        // Remotely removed extension => exist in base and does not in remote
        for (const key of baseToRemote.removed.values()) {
            const localExtension = localExtensionsMap.get(key);
            if (!localExtension) {
                continue;
            }
            const baseExtension = assertIsDefined(lastSyncExtensionsMap?.get(key));
            const wasAnInstalledExtensionDuringLastSync = lastSyncBuiltinExtensionsSet &&
                !lastSyncBuiltinExtensionsSet.has(key) &&
                baseExtension.installed;
            if (localExtension.installed &&
                wasAnInstalledExtensionDuringLastSync /* It is an installed extension now and during last sync */) {
                // Installed extension is removed from remote. Remove it from local.
                removed.push(localExtension.identifier);
            }
            else {
                // Add to remote: It is a builtin extenision or got installed after last sync
                newRemoteExtensionsMap.set(key, localExtension);
            }
        }
        // Remotely added extension => does not exist in base and exist in remote
        for (const key of baseToRemote.added.values()) {
            const remoteExtension = assertIsDefined(remoteExtensionsMap.get(key));
            const localExtension = localExtensionsMap.get(key);
            // Also exist in local
            if (localExtension) {
                // Is different from local to remote
                if (localToRemote.updated.has(key)) {
                    const mergedExtension = merge(key, localExtension, remoteExtension, remoteExtension);
                    // Update locally only when the extension has changes in properties other than installed poperty
                    if (!areSame(localExtension, remoteExtension, false, false)) {
                        updated.push(massageOutgoingExtension(mergedExtension, key));
                    }
                    newRemoteExtensionsMap.set(key, mergedExtension);
                }
            }
            else {
                // Add only if the extension is an installed extension
                if (remoteExtension.installed) {
                    added.push(massageOutgoingExtension(remoteExtension, key));
                }
            }
        }
        // Remotely updated extension => exist in base and remote
        for (const key of baseToRemote.updated.values()) {
            const remoteExtension = assertIsDefined(remoteExtensionsMap.get(key));
            const baseExtension = assertIsDefined(lastSyncExtensionsMap?.get(key));
            const localExtension = localExtensionsMap.get(key);
            // Also exist in local
            if (localExtension) {
                const wasAnInstalledExtensionDuringLastSync = lastSyncBuiltinExtensionsSet &&
                    !lastSyncBuiltinExtensionsSet.has(key) &&
                    baseExtension.installed;
                if (wasAnInstalledExtensionDuringLastSync &&
                    localExtension.installed &&
                    !remoteExtension.installed) {
                    // Remove it locally if it is installed locally and not remotely
                    removed.push(localExtension.identifier);
                }
                else {
                    // Update in local always
                    const mergedExtension = merge(key, localExtension, remoteExtension, remoteExtension);
                    updated.push(massageOutgoingExtension(mergedExtension, key));
                    newRemoteExtensionsMap.set(key, mergedExtension);
                }
            }
            // Add it locally if does not exist locally and installed remotely
            else if (remoteExtension.installed) {
                added.push(massageOutgoingExtension(remoteExtension, key));
            }
        }
        // Locally added extension => does not exist in base and exist in local
        for (const key of baseToLocal.added.values()) {
            // If added in remote (already handled)
            if (baseToRemote.added.has(key)) {
                continue;
            }
            newRemoteExtensionsMap.set(key, assertIsDefined(localExtensionsMap.get(key)));
        }
        // Locally updated extension => exist in base and local
        for (const key of baseToLocal.updated.values()) {
            // If removed in remote (already handled)
            if (baseToRemote.removed.has(key)) {
                continue;
            }
            // If updated in remote (already handled)
            if (baseToRemote.updated.has(key)) {
                continue;
            }
            const localExtension = assertIsDefined(localExtensionsMap.get(key));
            const remoteExtension = assertIsDefined(remoteExtensionsMap.get(key));
            // Update remotely
            newRemoteExtensionsMap.set(key, merge(key, localExtension, remoteExtension, localExtension));
        }
        // Locally removed extensions => exist in base and does not exist in local
        for (const key of baseToLocal.removed.values()) {
            // If updated in remote (already handled)
            if (baseToRemote.updated.has(key)) {
                continue;
            }
            // If removed in remote (already handled)
            if (baseToRemote.removed.has(key)) {
                continue;
            }
            // Skipped
            if (skippedExtensionsMap.has(key)) {
                continue;
            }
            // Skip if it is a builtin extension
            if (!assertIsDefined(remoteExtensionsMap.get(key)).installed) {
                continue;
            }
            // Skip if last sync builtin extensions set is not available
            if (!lastSyncBuiltinExtensionsSet) {
                continue;
            }
            // Skip if it was a builtin extension during last sync
            if (lastSyncBuiltinExtensionsSet.has(key) ||
                !assertIsDefined(lastSyncExtensionsMap?.get(key)).installed) {
                continue;
            }
            newRemoteExtensionsMap.delete(key);
        }
    }
    const remote = [];
    const remoteChanges = compare(remoteExtensionsMap, newRemoteExtensionsMap, new Set(), true);
    const hasRemoteChanges = remoteChanges.added.size > 0 || remoteChanges.updated.size > 0 || remoteChanges.removed.size > 0;
    if (hasRemoteChanges) {
        newRemoteExtensionsMap.forEach((value, key) => remote.push(massageOutgoingExtension(value, key)));
    }
    return {
        local: { added, removed, updated },
        remote: hasRemoteChanges
            ? {
                added: [...remoteChanges.added].map((id) => newRemoteExtensionsMap.get(id)),
                updated: [...remoteChanges.updated].map((id) => newRemoteExtensionsMap.get(id)),
                removed: [...remoteChanges.removed].map((id) => remoteExtensionsMap.get(id)),
                all: remote,
            }
            : null,
    };
}
function compare(from, to, ignoredExtensions, checkVersionProperty) {
    const fromKeys = from ? [...from.keys()].filter((key) => !ignoredExtensions.has(key)) : [];
    const toKeys = [...to.keys()].filter((key) => !ignoredExtensions.has(key));
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
        const fromExtension = from.get(key);
        const toExtension = to.get(key);
        if (!toExtension || !areSame(fromExtension, toExtension, checkVersionProperty, true)) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
function areSame(fromExtension, toExtension, checkVersionProperty, checkInstalledProperty) {
    if (fromExtension.disabled !== toExtension.disabled) {
        /* extension enablement changed */
        return false;
    }
    if (!!fromExtension.isApplicationScoped !== !!toExtension.isApplicationScoped) {
        /* extension application scope has changed */
        return false;
    }
    if (checkInstalledProperty && fromExtension.installed !== toExtension.installed) {
        /* extension installed property changed */
        return false;
    }
    if (fromExtension.installed && toExtension.installed) {
        if (fromExtension.preRelease !== toExtension.preRelease) {
            /* installed extension's pre-release version changed */
            return false;
        }
        if (fromExtension.pinned !== toExtension.pinned) {
            /* installed extension's pinning changed */
            return false;
        }
        if (toExtension.pinned && fromExtension.version !== toExtension.version) {
            /* installed extension's pinned version changed */
            return false;
        }
    }
    if (!isSameExtensionState(fromExtension.state, toExtension.state)) {
        /* extension state changed */
        return false;
    }
    if (checkVersionProperty && fromExtension.version !== toExtension.version) {
        /* extension version changed */
        return false;
    }
    return true;
}
function mergeExtensionState(localExtension, remoteExtension, lastSyncExtension) {
    const localState = localExtension.state;
    const remoteState = remoteExtension.state;
    const baseState = lastSyncExtension?.state;
    // If remote extension has no version, use local state
    if (!remoteExtension.version) {
        return localState;
    }
    // If local state exists and local extension is latest then use local state
    if (localState && semver.gt(localExtension.version, remoteExtension.version)) {
        return localState;
    }
    // If remote state exists and remote extension is latest, use remote state
    if (remoteState && semver.gt(remoteExtension.version, localExtension.version)) {
        return remoteState;
    }
    /* Remote and local are on same version */
    // If local state is not yet set, use remote state
    if (!localState) {
        return remoteState;
    }
    // If remote state is not yet set, use local state
    if (!remoteState) {
        return localState;
    }
    const mergedState = deepClone(localState);
    const baseToRemote = baseState
        ? compareExtensionState(baseState, remoteState)
        : {
            added: Object.keys(remoteState).reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    const baseToLocal = baseState
        ? compareExtensionState(baseState, localState)
        : {
            added: Object.keys(localState).reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    // Added/Updated in remote
    for (const key of [...baseToRemote.added.values(), ...baseToRemote.updated.values()]) {
        mergedState[key] = remoteState[key];
    }
    // Removed in remote
    for (const key of baseToRemote.removed.values()) {
        // Not updated in local
        if (!baseToLocal.updated.has(key)) {
            delete mergedState[key];
        }
    }
    return mergedState;
}
function compareExtensionState(from, to) {
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
        if (!equals(value1, value2)) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
function isSameExtensionState(a = {}, b = {}) {
    const { added, removed, updated } = compareExtensionState(a, b);
    return added.size === 0 && removed.size === 0 && updated.size === 0;
}
// massage incoming extension - add optional properties
function massageIncomingExtension(extension) {
    return { ...extension, ...{ disabled: !!extension.disabled, installed: !!extension.installed } };
}
// massage outgoing extension - remove optional properties
function massageOutgoingExtension(extension, key) {
    const massagedExtension = {
        ...extension,
        identifier: {
            id: extension.identifier.id,
            uuid: key.startsWith('uuid:') ? key.substring('uuid:'.length) : undefined,
        },
        /* set following always so that to differentiate with older clients */
        preRelease: !!extension.preRelease,
        pinned: !!extension.pinned,
    };
    if (!extension.disabled) {
        delete massagedExtension.disabled;
    }
    if (!extension.installed) {
        delete massagedExtension.installed;
    }
    if (!extension.state) {
        delete massagedExtension.state;
    }
    if (!extension.isApplicationScoped) {
        delete massagedExtension.isApplicationScoped;
    }
    return massagedExtension;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9leHRlbnNpb25zTWVyZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRSxPQUFPLEtBQUssTUFBTSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQWtCL0QsTUFBTSxVQUFVLEtBQUssQ0FDcEIsZUFBc0MsRUFDdEMsZ0JBQStDLEVBQy9DLGtCQUFpRCxFQUNqRCxpQkFBbUMsRUFDbkMsaUJBQTJCLEVBQzNCLHlCQUF3RDtJQUV4RCxNQUFNLEtBQUssR0FBcUIsRUFBRSxDQUFBO0lBQ2xDLE1BQU0sT0FBTyxHQUEyQixFQUFFLENBQUE7SUFDMUMsTUFBTSxPQUFPLEdBQXFCLEVBQUUsQ0FBQTtJQUVwQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUN2QixNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQ3hELGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDakYsQ0FBQTtRQUNELE9BQU87WUFDTixLQUFLLEVBQUU7Z0JBQ04sS0FBSztnQkFDTCxPQUFPO2dCQUNQLE9BQU87YUFDUDtZQUNELE1BQU0sRUFDTCxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ2hCLENBQUMsQ0FBQztvQkFDQSxLQUFLLEVBQUUsTUFBTTtvQkFDYixPQUFPLEVBQUUsRUFBRTtvQkFDWCxPQUFPLEVBQUUsRUFBRTtvQkFDWCxHQUFHLEVBQUUsTUFBTTtpQkFDWDtnQkFDRixDQUFDLENBQUMsSUFBSTtTQUNSLENBQUE7SUFDRixDQUFDO0lBRUQsZUFBZSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQTBCLENBQUE7SUFDeEYsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDakUsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFFakcsTUFBTSxLQUFLLEdBQXdCLElBQUksR0FBRyxFQUFrQixDQUFBO0lBQzVELE1BQU0sT0FBTyxHQUFHLENBQUMsVUFBZ0MsRUFBRSxFQUFFO1FBQ3BELElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JCLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEQsQ0FBQztJQUNGLENBQUMsQ0FBQTtJQUNELGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNoRSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNqRSxrQkFBa0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNwRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNuRSx5QkFBeUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO0lBRXZFLE1BQU0sTUFBTSxHQUFHLENBQUMsU0FBeUIsRUFBVSxFQUFFO1FBQ3BELE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUMxRixPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFBO0lBQzdFLENBQUMsQ0FBQTtJQUNELE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxHQUFnQyxFQUFFLFNBQXlCLEVBQUUsRUFBRTtRQUN6RixHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyQyxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUMsQ0FBQTtJQUNELE1BQU0sa0JBQWtCLEdBQWdDLGVBQWUsQ0FBQyxNQUFNLENBQzdFLGlCQUFpQixFQUNqQixJQUFJLEdBQUcsRUFBMEIsQ0FDakMsQ0FBQTtJQUNELE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUNsRCxpQkFBaUIsRUFDakIsSUFBSSxHQUFHLEVBQTBCLENBQ2pDLENBQUE7SUFDRCxNQUFNLHNCQUFzQixHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FDckQsQ0FBQyxHQUFnQyxFQUFFLFNBQXlCLEVBQUUsRUFBRSxDQUMvRCxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQzdDLElBQUksR0FBRyxFQUEwQixDQUNqQyxDQUFBO0lBQ0QsTUFBTSxxQkFBcUIsR0FBRyxrQkFBa0I7UUFDL0MsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBMEIsQ0FBQztRQUNqRixDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ1AsTUFBTSxvQkFBb0IsR0FBRyxpQkFBaUIsQ0FBQyxNQUFNLENBQ3BELGlCQUFpQixFQUNqQixJQUFJLEdBQUcsRUFBMEIsQ0FDakMsQ0FBQTtJQUNELE1BQU0sb0JBQW9CLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDeEMsT0FBTyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ2pFLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBVSxDQUFDLENBQUE7SUFDckIsTUFBTSw0QkFBNEIsR0FBRyx5QkFBeUI7UUFDN0QsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFO1lBQ3ZELElBQUksR0FBRyxJQUFJLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtZQUMxQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakUsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUM7UUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUVQLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FDNUIsa0JBQWtCLEVBQ2xCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsS0FBSyxDQUNMLENBQUE7SUFDRCxJQUNDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDNUIsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUM5QixhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQzdCLENBQUM7UUFDRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQzFCLHFCQUFxQixFQUNyQixrQkFBa0IsRUFDbEIsb0JBQW9CLEVBQ3BCLEtBQUssQ0FDTCxDQUFBO1FBQ0QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUMzQixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixJQUFJLENBQ0osQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLENBQ2IsR0FBVyxFQUNYLGNBQThCLEVBQzlCLGVBQStCLEVBQy9CLFNBQXlCLEVBQ1IsRUFBRTtZQUNuQixJQUFJLE1BQTJCLEVBQUUsT0FBMkIsRUFBRSxVQUErQixDQUFBO1lBQzdGLElBQUksY0FBYyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM5QixNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQTtnQkFDekIsVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUE7Z0JBQ2pDLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osT0FBTyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUE7Z0JBQzVCLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUE7Z0JBQy9CLFVBQVUsR0FBRyxlQUFlLENBQUMsVUFBVSxDQUFBO2dCQUN2QyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLE9BQU8sR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFBO2dCQUNsQyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksTUFBTSxLQUFLLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQTtnQkFDOUIsSUFBSSxNQUFNLEVBQUUsQ0FBQztvQkFDWixPQUFPLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQTtnQkFDakMsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLFVBQVUsS0FBSyxTQUFTLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDckQsVUFBVSxHQUFHLGNBQWMsQ0FBQyxVQUFVLENBQUE7WUFDdkMsQ0FBQztZQUNELE9BQU87Z0JBQ04sR0FBRyxTQUFTO2dCQUNaLFNBQVMsRUFBRSxjQUFjLENBQUMsU0FBUyxJQUFJLGVBQWUsQ0FBQyxTQUFTO2dCQUNoRSxNQUFNO2dCQUNOLFVBQVU7Z0JBQ1YsT0FBTyxFQUNOLE9BQU87b0JBQ1AsQ0FBQyxlQUFlLENBQUMsT0FBTzt3QkFDeEIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDeEYsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxPQUFPO3dCQUN6QixDQUFDLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQztnQkFDM0IsS0FBSyxFQUFFLG1CQUFtQixDQUN6QixjQUFjLEVBQ2QsZUFBZSxFQUNmLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FDL0I7YUFDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFBO1FBRUQscUVBQXFFO1FBQ3JFLEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3JCLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLE1BQU0scUNBQXFDLEdBQzFDLDRCQUE0QjtnQkFDNUIsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2dCQUN0QyxhQUFhLENBQUMsU0FBUyxDQUFBO1lBQ3hCLElBQ0MsY0FBYyxDQUFDLFNBQVM7Z0JBQ3hCLHFDQUFxQyxDQUFDLDJEQUEyRCxFQUNoRyxDQUFDO2dCQUNGLG9FQUFvRTtnQkFDcEUsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDeEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLDZFQUE2RTtnQkFDN0Usc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1FBQ0YsQ0FBQztRQUVELHlFQUF5RTtRQUN6RSxLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUMvQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDckUsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRWxELHNCQUFzQjtZQUN0QixJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUNwQixvQ0FBb0M7Z0JBQ3BDLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDcEMsTUFBTSxlQUFlLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFBO29CQUNwRixnR0FBZ0c7b0JBQ2hHLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0QsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDN0QsQ0FBQztvQkFDRCxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxDQUFBO2dCQUNqRCxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHNEQUFzRDtnQkFDdEQsSUFBSSxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQzNELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELHlEQUF5RDtRQUN6RCxLQUFLLE1BQU0sR0FBRyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNqRCxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDckUsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUVsRCxzQkFBc0I7WUFDdEIsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxxQ0FBcUMsR0FDMUMsNEJBQTRCO29CQUM1QixDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0JBQ3RDLGFBQWEsQ0FBQyxTQUFTLENBQUE7Z0JBQ3hCLElBQ0MscUNBQXFDO29CQUNyQyxjQUFjLENBQUMsU0FBUztvQkFDeEIsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUN6QixDQUFDO29CQUNGLGdFQUFnRTtvQkFDaEUsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3hDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCx5QkFBeUI7b0JBQ3pCLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQTtvQkFDcEYsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtvQkFDNUQsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFDakQsQ0FBQztZQUNGLENBQUM7WUFDRCxrRUFBa0U7aUJBQzdELElBQUksZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNwQyxLQUFLLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzNELENBQUM7UUFDRixDQUFDO1FBRUQsdUVBQXVFO1FBQ3ZFLEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzlDLHVDQUF1QztZQUN2QyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLFNBQVE7WUFDVCxDQUFDO1lBQ0Qsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxlQUFlLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RSxDQUFDO1FBRUQsdURBQXVEO1FBQ3ZELEtBQUssTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ2hELHlDQUF5QztZQUN6QyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLFNBQVE7WUFDVCxDQUFDO1lBQ0QseUNBQXlDO1lBQ3pDLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsU0FBUTtZQUNULENBQUM7WUFDRCxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbkUsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3JFLGtCQUFrQjtZQUNsQixzQkFBc0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDaEQseUNBQXlDO1lBQ3pDLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsU0FBUTtZQUNULENBQUM7WUFDRCx5Q0FBeUM7WUFDekMsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxTQUFRO1lBQ1QsQ0FBQztZQUNELFVBQVU7WUFDVixJQUFJLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxTQUFRO1lBQ1QsQ0FBQztZQUNELG9DQUFvQztZQUNwQyxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM5RCxTQUFRO1lBQ1QsQ0FBQztZQUNELDREQUE0RDtZQUM1RCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztnQkFDbkMsU0FBUTtZQUNULENBQUM7WUFDRCxzREFBc0Q7WUFDdEQsSUFDQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2dCQUNyQyxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQzFELENBQUM7Z0JBQ0YsU0FBUTtZQUNULENBQUM7WUFDRCxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFBO0lBQ25DLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FDNUIsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixJQUFJLEdBQUcsRUFBVSxFQUNqQixJQUFJLENBQ0osQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQ3JCLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFBO0lBQ2pHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUN0QixzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FDN0MsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FDakQsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPO1FBQ04sS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUU7UUFDbEMsTUFBTSxFQUFFLGdCQUFnQjtZQUN2QixDQUFDLENBQUM7Z0JBQ0EsS0FBSyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUM7Z0JBQzVFLE9BQU8sRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBRSxDQUFDO2dCQUNoRixPQUFPLEVBQUUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUUsQ0FBQztnQkFDN0UsR0FBRyxFQUFFLE1BQU07YUFDWDtZQUNGLENBQUMsQ0FBQyxJQUFJO0tBQ1AsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FDZixJQUF3QyxFQUN4QyxFQUErQixFQUMvQixpQkFBOEIsRUFDOUIsb0JBQTZCO0lBRTdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0lBQzFGLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUUsTUFBTSxLQUFLLEdBQUcsTUFBTTtTQUNsQixNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDbEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNWLE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUMsQ0FBQTtJQUN0QixNQUFNLE9BQU8sR0FBRyxRQUFRO1NBQ3RCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3RDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNsQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFBO0lBQ3RCLE1BQU0sT0FBTyxHQUFnQixJQUFJLEdBQUcsRUFBVSxDQUFBO0lBRTlDLEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUM7UUFDNUIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsU0FBUTtRQUNULENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxJQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFBO1FBQ3JDLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDL0IsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqQixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFBO0FBQ25DLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FDZixhQUE2QixFQUM3QixXQUEyQixFQUMzQixvQkFBNkIsRUFDN0Isc0JBQStCO0lBRS9CLElBQUksYUFBYSxDQUFDLFFBQVEsS0FBSyxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckQsa0NBQWtDO1FBQ2xDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsS0FBSyxDQUFDLENBQUMsV0FBVyxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDL0UsNkNBQTZDO1FBQzdDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksc0JBQXNCLElBQUksYUFBYSxDQUFDLFNBQVMsS0FBSyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDakYsMENBQTBDO1FBQzFDLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksYUFBYSxDQUFDLFNBQVMsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDdEQsSUFBSSxhQUFhLENBQUMsVUFBVSxLQUFLLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN6RCx1REFBdUQ7WUFDdkQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqRCwyQ0FBMkM7WUFDM0MsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxJQUFJLGFBQWEsQ0FBQyxPQUFPLEtBQUssV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pFLGtEQUFrRDtZQUNsRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDbkUsNkJBQTZCO1FBQzdCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksb0JBQW9CLElBQUksYUFBYSxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0UsK0JBQStCO1FBQy9CLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQzNCLGNBQThCLEVBQzlCLGVBQStCLEVBQy9CLGlCQUE2QztJQUU3QyxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFBO0lBQ3ZDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUE7SUFDekMsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLEVBQUUsS0FBSyxDQUFBO0lBRTFDLHNEQUFzRDtJQUN0RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzlCLE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFFRCwyRUFBMkU7SUFDM0UsSUFBSSxVQUFVLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzlFLE9BQU8sVUFBVSxDQUFBO0lBQ2xCLENBQUM7SUFDRCwwRUFBMEU7SUFDMUUsSUFBSSxXQUFXLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQy9FLE9BQU8sV0FBVyxDQUFBO0lBQ25CLENBQUM7SUFFRCwwQ0FBMEM7SUFFMUMsa0RBQWtEO0lBQ2xELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLFdBQVcsQ0FBQTtJQUNuQixDQUFDO0lBQ0Qsa0RBQWtEO0lBQ2xELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNsQixPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRUQsTUFBTSxXQUFXLEdBQTJCLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqRSxNQUFNLFlBQVksR0FBRyxTQUFTO1FBQzdCLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDO1FBQy9DLENBQUMsQ0FBQztZQUNBLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDL0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDUixPQUFPLENBQUMsQ0FBQTtZQUNULENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBVSxDQUFDO1lBQ3JCLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBVTtZQUMxQixPQUFPLEVBQUUsSUFBSSxHQUFHLEVBQVU7U0FDMUIsQ0FBQTtJQUNILE1BQU0sV0FBVyxHQUFHLFNBQVM7UUFDNUIsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUM7UUFDOUMsQ0FBQyxDQUFDO1lBQ0EsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUM5QyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNSLE9BQU8sQ0FBQyxDQUFBO1lBQ1QsQ0FBQyxFQUFFLElBQUksR0FBRyxFQUFVLENBQUM7WUFDckIsT0FBTyxFQUFFLElBQUksR0FBRyxFQUFVO1lBQzFCLE9BQU8sRUFBRSxJQUFJLEdBQUcsRUFBVTtTQUMxQixDQUFBO0lBQ0gsMEJBQTBCO0lBQzFCLEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUN0RixXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFDRCxvQkFBb0I7SUFDcEIsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDakQsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxXQUFXLENBQUE7QUFDbkIsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQzdCLElBQTRCLEVBQzVCLEVBQTBCO0lBRTFCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUM5QixNQUFNLEtBQUssR0FBRyxNQUFNO1NBQ2xCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNsQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDLEVBQUUsSUFBSSxHQUFHLEVBQVUsQ0FBQyxDQUFBO0lBQ3RCLE1BQU0sT0FBTyxHQUFHLFFBQVE7U0FDdEIsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2xCLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDVixPQUFPLENBQUMsQ0FBQTtJQUNULENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBVSxDQUFDLENBQUE7SUFDdEIsTUFBTSxPQUFPLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUE7SUFFOUMsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUM1QixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QixTQUFRO1FBQ1QsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN4QixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUE7QUFDbkMsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQzVCLElBQTRCLEVBQUUsRUFDOUIsSUFBNEIsRUFBRTtJQUU5QixNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDL0QsT0FBTyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQTtBQUNwRSxDQUFDO0FBRUQsdURBQXVEO0FBQ3ZELFNBQVMsd0JBQXdCLENBQUMsU0FBeUI7SUFDMUQsT0FBTyxFQUFFLEdBQUcsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQTtBQUNqRyxDQUFDO0FBRUQsMERBQTBEO0FBQzFELFNBQVMsd0JBQXdCLENBQUMsU0FBeUIsRUFBRSxHQUFXO0lBQ3ZFLE1BQU0saUJBQWlCLEdBQW1CO1FBQ3pDLEdBQUcsU0FBUztRQUNaLFVBQVUsRUFBRTtZQUNYLEVBQUUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsSUFBSSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ3pFO1FBQ0Qsc0VBQXNFO1FBQ3RFLFVBQVUsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVU7UUFDbEMsTUFBTSxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTTtLQUMxQixDQUFBO0lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN6QixPQUFPLGlCQUFpQixDQUFDLFFBQVEsQ0FBQTtJQUNsQyxDQUFDO0lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUMxQixPQUFPLGlCQUFpQixDQUFDLFNBQVMsQ0FBQTtJQUNuQyxDQUFDO0lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQTtJQUMvQixDQUFDO0lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8saUJBQWlCLENBQUMsbUJBQW1CLENBQUE7SUFDN0MsQ0FBQztJQUNELE9BQU8saUJBQWlCLENBQUE7QUFDekIsQ0FBQyJ9