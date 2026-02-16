/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../base/common/objects.js';
export function merge(local, remote, lastSync, ignored) {
    const localResult = { added: [], removed: [], updated: [] };
    let remoteResult = { added: [], removed: [], updated: [] };
    if (!remote) {
        const added = local.filter(({ id }) => !ignored.includes(id));
        if (added.length) {
            remoteResult.added = added;
        }
        else {
            remoteResult = null;
        }
        return {
            local: localResult,
            remote: remoteResult,
        };
    }
    const localToRemote = compare(local, remote, ignored);
    if (localToRemote.added.length > 0 ||
        localToRemote.removed.length > 0 ||
        localToRemote.updated.length > 0) {
        const baseToLocal = compare(lastSync, local, ignored);
        const baseToRemote = compare(lastSync, remote, ignored);
        // Remotely removed profiles
        for (const id of baseToRemote.removed) {
            const e = local.find((profile) => profile.id === id);
            if (e) {
                localResult.removed.push(e);
            }
        }
        // Remotely added profiles
        for (const id of baseToRemote.added) {
            const remoteProfile = remote.find((profile) => profile.id === id);
            // Got added in local
            if (baseToLocal.added.includes(id)) {
                // Is different from local to remote
                if (localToRemote.updated.includes(id)) {
                    // Remote wins always
                    localResult.updated.push(remoteProfile);
                }
            }
            else {
                localResult.added.push(remoteProfile);
            }
        }
        // Remotely updated profiles
        for (const id of baseToRemote.updated) {
            // Remote wins always
            localResult.updated.push(remote.find((profile) => profile.id === id));
        }
        // Locally added profiles
        for (const id of baseToLocal.added) {
            // Not there in remote
            if (!baseToRemote.added.includes(id)) {
                remoteResult.added.push(local.find((profile) => profile.id === id));
            }
        }
        // Locally updated profiles
        for (const id of baseToLocal.updated) {
            // If removed in remote
            if (baseToRemote.removed.includes(id)) {
                continue;
            }
            // If not updated in remote
            if (!baseToRemote.updated.includes(id)) {
                remoteResult.updated.push(local.find((profile) => profile.id === id));
            }
        }
        // Locally removed profiles
        for (const id of baseToLocal.removed) {
            const removedProfile = remote.find((profile) => profile.id === id);
            if (removedProfile) {
                remoteResult.removed.push(removedProfile);
            }
        }
    }
    if (remoteResult.added.length === 0 &&
        remoteResult.removed.length === 0 &&
        remoteResult.updated.length === 0) {
        remoteResult = null;
    }
    return { local: localResult, remote: remoteResult };
}
function compare(from, to, ignoredProfiles) {
    from = from ? from.filter(({ id }) => !ignoredProfiles.includes(id)) : [];
    to = to.filter(({ id }) => !ignoredProfiles.includes(id));
    const fromKeys = from.map(({ id }) => id);
    const toKeys = to.map(({ id }) => id);
    const added = toKeys.filter((key) => !fromKeys.includes(key));
    const removed = fromKeys.filter((key) => !toKeys.includes(key));
    const updated = [];
    for (const { id, name, icon, useDefaultFlags } of from) {
        if (removed.includes(id)) {
            continue;
        }
        const toProfile = to.find((p) => p.id === id);
        if (!toProfile ||
            toProfile.name !== name ||
            toProfile.icon !== icon ||
            !equals(toProfile.useDefaultFlags, useDefaultFlags)) {
            updated.push(id);
        }
    }
    return { added, removed, updated };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0TWVyZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vdXNlckRhdGFQcm9maWxlc01hbmlmZXN0TWVyZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBNkJ4RCxNQUFNLFVBQVUsS0FBSyxDQUNwQixLQUF5QixFQUN6QixNQUFxQyxFQUNyQyxRQUF1QyxFQUN2QyxPQUFpQjtJQUVqQixNQUFNLFdBQVcsR0FJYixFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFDM0MsSUFBSSxZQUFZLEdBSUwsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO0lBRWxELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDcEIsQ0FBQztRQUNELE9BQU87WUFDTixLQUFLLEVBQUUsV0FBVztZQUNsQixNQUFNLEVBQUUsWUFBWTtTQUNwQixDQUFBO0lBQ0YsQ0FB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