/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function merge(local, remote, base) {
    const localAdded = {};
    const localUpdated = {};
    const localRemoved = new Set();
    if (!remote) {
        return {
            local: { added: localAdded, updated: localUpdated, removed: [...localRemoved.values()] },
            remote: { added: local, updated: {}, removed: [] },
            conflicts: [],
        };
    }
    const localToRemote = compare(local, remote);
    if (localToRemote.added.size === 0 &&
        localToRemote.removed.size === 0 &&
        localToRemote.updated.size === 0) {
        // No changes found between local and remote.
        return {
            local: { added: localAdded, updated: localUpdated, removed: [...localRemoved.values()] },
            remote: { added: {}, updated: {}, removed: [] },
            conflicts: [],
        };
    }
    const baseToLocal = compare(base, local);
    const baseToRemote = compare(base, remote);
    const remoteAdded = {};
    const remoteUpdated = {};
    const remoteRemoved = new Set();
    const conflicts = new Set();
    // Removed prompts in Local
    for (const key of baseToLocal.removed.values()) {
        // Conflict - Got updated in remote.
        if (baseToRemote.updated.has(key)) {
            // Add to local
            localAdded[key] = remote[key];
        }
        // Remove it in remote
        else {
            remoteRemoved.add(key);
        }
    }
    // Removed prompts in Remote
    for (const key of baseToRemote.removed.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Conflict - Got updated in local
        if (baseToLocal.updated.has(key)) {
            conflicts.add(key);
        }
        // Also remove in Local
        else {
            localRemoved.add(key);
        }
    }
    // Updated prompts in Local
    for (const key of baseToLocal.updated.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got updated in remote
        if (baseToRemote.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else {
            remoteUpdated[key] = local[key];
        }
    }
    // Updated prompts in Remote
    for (const key of baseToRemote.updated.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got updated in local
        if (baseToLocal.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else if (local[key] !== undefined) {
            localUpdated[key] = remote[key];
        }
    }
    // Added prompts in Local
    for (const key of baseToLocal.added.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got added in remote
        if (baseToRemote.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else {
            remoteAdded[key] = local[key];
        }
    }
    // Added prompts in remote
    for (const key of baseToRemote.added.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got added in local
        if (baseToLocal.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                conflicts.add(key);
            }
        }
        else {
            localAdded[key] = remote[key];
        }
    }
    return {
        local: { added: localAdded, removed: [...localRemoved.values()], updated: localUpdated },
        remote: { added: remoteAdded, removed: [...remoteRemoved.values()], updated: remoteUpdated },
        conflicts: [...conflicts.values()],
    };
}
function compare(from, to) {
    const fromKeys = from ? Object.keys(from) : [];
    const toKeys = to ? Object.keys(to) : [];
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
        const fromPrompt = from[key];
        const toPrompt = to[key];
        if (fromPrompt !== toPrompt) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
export function areSame(a, b) {
    const { added, removed, updated } = compare(a, b);
    return added.size === 0 && removed.size === 0 && updated.size === 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c01lcmdlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9wcm9tcHRzU3luYy9wcm9tcHRzTWVyZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFrQmhHLE1BQU0sVUFBVSxLQUFLLENBQ3BCLEtBQWdDLEVBQ2hDLE1BQXdDLEVBQ3hDLElBQXNDO0lBRXRDLE1BQU0sVUFBVSxHQUE4QixFQUFFLENBQUE7SUFDaEQsTUFBTSxZQUFZLEdBQThCLEVBQUUsQ0FBQTtJQUNsRCxNQUFNLFlBQVksR0FBZ0IsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUVuRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPO1lBQ04sS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUU7WUFDeEYsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUU7WUFDbEQsU0FBUyxFQUFFLEVBQUU7U0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDNUMsSUFDQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDO1FBQzlCLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUM7UUFDaEMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUMvQixDQUFDO1FBQ0YsNkNBQTZDO1FBQzdDLE9BQU87WUFDTixLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsVUFBVSxF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