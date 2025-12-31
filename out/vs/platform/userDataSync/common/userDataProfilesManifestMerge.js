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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlc01hbmlmZXN0TWVyZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhUHJvZmlsZXNNYW5pZmVzdE1lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQTZCeEQsTUFBTSxVQUFVLEtBQUssQ0FDcEIsS0FBeUIsRUFDekIsTUFBcUMsRUFDckMsUUFBdUMsRUFDdkMsT0FBaUI7SUFFakIsTUFBTSxXQUFXLEdBSWIsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO0lBQzNDLElBQUksWUFBWSxHQUlMLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQTtJQUVsRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsWUFBWSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDM0IsQ0FBQzthQUFNLENBQUM7WUFDUCxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUM7UUFDRCxPQUFPO1lBQ04sS0FBSyxFQUFFLFdBQVc7WUFDbEIsTUFBTSxFQUFFLFlBQVk7U0FDcEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxNQUFNLGFBQWEsR0FBRyxP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