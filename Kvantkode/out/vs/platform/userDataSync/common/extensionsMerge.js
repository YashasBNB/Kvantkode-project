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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL2V4dGVuc2lvbnNNZXJnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBa0IvRCxNQUFNLFVBQVUsS0FBSyxDQUNwQixlQUFzQyxFQUN0QyxnQkFBK0MsRUFDL0Msa0JBQWlELEVBQ2pELGlCQUFtQyxFQUNuQyxpQkFBMkIsRUFDM0IseUJBQXdEO0lBRXhELE1BQU0sS0FBSyxHQUFxQixFQUFFLENBQUE7SUFDbEMsTUFBTSxPQUFPLEdBQTJCLEVBQUUsQ0FBQTtJQUMxQyxNQUFNLE9BQU8sR0FBcUIsRUFBRSxDQUFBO0lBRXBDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FDeEQsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEtBQUssVUFBVSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNqRixDQUFBO1FBQ0QsT0FBTztZQUNOLEtBQUssRUFBRTtnQkFDTixLQUFLO2dCQUNMLE9BQU87Z0JBQ1AsT0FBTzthQUNQO1lBQ0QsTUFBTSxFQUNMLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDaEIsQ0FBQyxDQUFDO29CQUNBLEtBQUssRUFB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