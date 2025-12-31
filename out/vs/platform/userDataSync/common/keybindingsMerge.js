/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals } from '../../../base/common/arrays.js';
import { parse } from '../../../base/common/json.js';
import * as objects from '../../../base/common/objects.js';
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import * as contentUtil from './content.js';
function parseKeybindings(content) {
    return parse(content) || [];
}
export async function merge(localContent, remoteContent, baseContent, formattingOptions, userDataSyncUtilService) {
    const local = parseKeybindings(localContent);
    const remote = parseKeybindings(remoteContent);
    const base = baseContent ? parseKeybindings(baseContent) : null;
    const userbindings = [...local, ...remote, ...(base || [])].map((keybinding) => keybinding.key);
    const normalizedKeys = await userDataSyncUtilService.resolveUserBindings(userbindings);
    const keybindingsMergeResult = computeMergeResultByKeybinding(local, remote, base, normalizedKeys);
    if (!keybindingsMergeResult.hasLocalForwarded && !keybindingsMergeResult.hasRemoteForwarded) {
        // No changes found between local and remote.
        return { mergeContent: localContent, hasChanges: false, hasConflicts: false };
    }
    if (!keybindingsMergeResult.hasLocalForwarded && keybindingsMergeResult.hasRemoteForwarded) {
        return { mergeContent: remoteContent, hasChanges: true, hasConflicts: false };
    }
    if (keybindingsMergeResult.hasLocalForwarded && !keybindingsMergeResult.hasRemoteForwarded) {
        // Local has moved forward and remote has not. Return local.
        return { mergeContent: localContent, hasChanges: true, hasConflicts: false };
    }
    // Both local and remote has moved forward.
    const localByCommand = byCommand(local);
    const remoteByCommand = byCommand(remote);
    const baseByCommand = base ? byCommand(base) : null;
    const localToRemoteByCommand = compareByCommand(localByCommand, remoteByCommand, normalizedKeys);
    const baseToLocalByCommand = baseByCommand
        ? compareByCommand(baseByCommand, localByCommand, normalizedKeys)
        : {
            added: [...localByCommand.keys()].reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    const baseToRemoteByCommand = baseByCommand
        ? compareByCommand(baseByCommand, remoteByCommand, normalizedKeys)
        : {
            added: [...remoteByCommand.keys()].reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    const commandsMergeResult = computeMergeResult(localToRemoteByCommand, baseToLocalByCommand, baseToRemoteByCommand);
    let mergeContent = localContent;
    // Removed commands in Remote
    for (const command of commandsMergeResult.removed.values()) {
        if (commandsMergeResult.conflicts.has(command)) {
            continue;
        }
        mergeContent = removeKeybindings(mergeContent, command, formattingOptions);
    }
    // Added commands in remote
    for (const command of commandsMergeResult.added.values()) {
        if (commandsMergeResult.conflicts.has(command)) {
            continue;
        }
        const keybindings = remoteByCommand.get(command);
        // Ignore negated commands
        if (keybindings.some((keybinding) => keybinding.command !== `-${command}` &&
            keybindingsMergeResult.conflicts.has(normalizedKeys[keybinding.key]))) {
            commandsMergeResult.conflicts.add(command);
            continue;
        }
        mergeContent = addKeybindings(mergeContent, keybindings, formattingOptions);
    }
    // Updated commands in Remote
    for (const command of commandsMergeResult.updated.values()) {
        if (commandsMergeResult.conflicts.has(command)) {
            continue;
        }
        const keybindings = remoteByCommand.get(command);
        // Ignore negated commands
        if (keybindings.some((keybinding) => keybinding.command !== `-${command}` &&
            keybindingsMergeResult.conflicts.has(normalizedKeys[keybinding.key]))) {
            commandsMergeResult.conflicts.add(command);
            continue;
        }
        mergeContent = updateKeybindings(mergeContent, command, keybindings, formattingOptions);
    }
    return { mergeContent, hasChanges: true, hasConflicts: commandsMergeResult.conflicts.size > 0 };
}
function computeMergeResult(localToRemote, baseToLocal, baseToRemote) {
    const added = new Set();
    const removed = new Set();
    const updated = new Set();
    const conflicts = new Set();
    // Removed keys in Local
    for (const key of baseToLocal.removed.values()) {
        // Got updated in remote
        if (baseToRemote.updated.has(key)) {
            conflicts.add(key);
        }
    }
    // Removed keys in Remote
    for (const key of baseToRemote.removed.values()) {
        if (conflicts.has(key)) {
            continue;
        }
        // Got updated in local
        if (baseToLocal.updated.has(key)) {
            conflicts.add(key);
        }
        else {
            // remove the key
            removed.add(key);
        }
    }
    // Added keys in Local
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
    }
    // Added keys in remote
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
            added.add(key);
        }
    }
    // Updated keys in Local
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
    }
    // Updated keys in Remote
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
        else {
            // updated key
            updated.add(key);
        }
    }
    return { added, removed, updated, conflicts };
}
function computeMergeResultByKeybinding(local, remote, base, normalizedKeys) {
    const empty = new Set();
    const localByKeybinding = byKeybinding(local, normalizedKeys);
    const remoteByKeybinding = byKeybinding(remote, normalizedKeys);
    const baseByKeybinding = base ? byKeybinding(base, normalizedKeys) : null;
    const localToRemoteByKeybinding = compareByKeybinding(localByKeybinding, remoteByKeybinding);
    if (localToRemoteByKeybinding.added.size === 0 &&
        localToRemoteByKeybinding.removed.size === 0 &&
        localToRemoteByKeybinding.updated.size === 0) {
        return {
            hasLocalForwarded: false,
            hasRemoteForwarded: false,
            added: empty,
            removed: empty,
            updated: empty,
            conflicts: empty,
        };
    }
    const baseToLocalByKeybinding = baseByKeybinding
        ? compareByKeybinding(baseByKeybinding, localByKeybinding)
        : {
            added: [...localByKeybinding.keys()].reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    if (baseToLocalByKeybinding.added.size === 0 &&
        baseToLocalByKeybinding.removed.size === 0 &&
        baseToLocalByKeybinding.updated.size === 0) {
        // Remote has moved forward and local has not.
        return {
            hasLocalForwarded: false,
            hasRemoteForwarded: true,
            added: empty,
            removed: empty,
            updated: empty,
            conflicts: empty,
        };
    }
    const baseToRemoteByKeybinding = baseByKeybinding
        ? compareByKeybinding(baseByKeybinding, remoteByKeybinding)
        : {
            added: [...remoteByKeybinding.keys()].reduce((r, k) => {
                r.add(k);
                return r;
            }, new Set()),
            removed: new Set(),
            updated: new Set(),
        };
    if (baseToRemoteByKeybinding.added.size === 0 &&
        baseToRemoteByKeybinding.removed.size === 0 &&
        baseToRemoteByKeybinding.updated.size === 0) {
        return {
            hasLocalForwarded: true,
            hasRemoteForwarded: false,
            added: empty,
            removed: empty,
            updated: empty,
            conflicts: empty,
        };
    }
    const { added, removed, updated, conflicts } = computeMergeResult(localToRemoteByKeybinding, baseToLocalByKeybinding, baseToRemoteByKeybinding);
    return { hasLocalForwarded: true, hasRemoteForwarded: true, added, removed, updated, conflicts };
}
function byKeybinding(keybindings, keys) {
    const map = new Map();
    for (const keybinding of keybindings) {
        const key = keys[keybinding.key];
        let value = map.get(key);
        if (!value) {
            value = [];
            map.set(key, value);
        }
        value.push(keybinding);
    }
    return map;
}
function byCommand(keybindings) {
    const map = new Map();
    for (const keybinding of keybindings) {
        const command = keybinding.command[0] === '-' ? keybinding.command.substring(1) : keybinding.command;
        let value = map.get(command);
        if (!value) {
            value = [];
            map.set(command, value);
        }
        value.push(keybinding);
    }
    return map;
}
function compareByKeybinding(from, to) {
    const fromKeys = [...from.keys()];
    const toKeys = [...to.keys()];
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
        const value1 = from
            .get(key)
            .map((keybinding) => ({ ...keybinding, ...{ key } }));
        const value2 = to
            .get(key)
            .map((keybinding) => ({ ...keybinding, ...{ key } }));
        if (!equals(value1, value2, (a, b) => isSameKeybinding(a, b))) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
function compareByCommand(from, to, normalizedKeys) {
    const fromKeys = [...from.keys()];
    const toKeys = [...to.keys()];
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
        const value1 = from
            .get(key)
            .map((keybinding) => ({ ...keybinding, ...{ key: normalizedKeys[keybinding.key] } }));
        const value2 = to
            .get(key)
            .map((keybinding) => ({ ...keybinding, ...{ key: normalizedKeys[keybinding.key] } }));
        if (!areSameKeybindingsWithSameCommand(value1, value2)) {
            updated.add(key);
        }
    }
    return { added, removed, updated };
}
function areSameKeybindingsWithSameCommand(value1, value2) {
    // Compare entries adding keybindings
    if (!equals(value1.filter(({ command }) => command[0] !== '-'), value2.filter(({ command }) => command[0] !== '-'), (a, b) => isSameKeybinding(a, b))) {
        return false;
    }
    // Compare entries removing keybindings
    if (!equals(value1.filter(({ command }) => command[0] === '-'), value2.filter(({ command }) => command[0] === '-'), (a, b) => isSameKeybinding(a, b))) {
        return false;
    }
    return true;
}
function isSameKeybinding(a, b) {
    if (a.command !== b.command) {
        return false;
    }
    if (a.key !== b.key) {
        return false;
    }
    const whenA = ContextKeyExpr.deserialize(a.when);
    const whenB = ContextKeyExpr.deserialize(b.when);
    if ((whenA && !whenB) || (!whenA && whenB)) {
        return false;
    }
    if (whenA && whenB && !whenA.equals(whenB)) {
        return false;
    }
    if (!objects.equals(a.args, b.args)) {
        return false;
    }
    return true;
}
function addKeybindings(content, keybindings, formattingOptions) {
    for (const keybinding of keybindings) {
        content = contentUtil.edit(content, [-1], keybinding, formattingOptions);
    }
    return content;
}
function removeKeybindings(content, command, formattingOptions) {
    const keybindings = parseKeybindings(content);
    for (let index = keybindings.length - 1; index >= 0; index--) {
        if (keybindings[index].command === command || keybindings[index].command === `-${command}`) {
            content = contentUtil.edit(content, [index], undefined, formattingOptions);
        }
    }
    return content;
}
function updateKeybindings(content, command, keybindings, formattingOptions) {
    const allKeybindings = parseKeybindings(content);
    const location = allKeybindings.findIndex((keybinding) => keybinding.command === command || keybinding.command === `-${command}`);
    // Remove all entries with this command
    for (let index = allKeybindings.length - 1; index >= 0; index--) {
        if (allKeybindings[index].command === command ||
            allKeybindings[index].command === `-${command}`) {
            content = contentUtil.edit(content, [index], undefined, formattingOptions);
        }
    }
    // add all entries at the same location where the entry with this command was located.
    for (let index = keybindings.length - 1; index >= 0; index--) {
        content = contentUtil.edit(content, [location], keybindings[index], formattingOptions);
    }
    return content;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24va2V5YmluZGluZ3NNZXJnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFdkQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXBELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXRFLE9BQU8sS0FBSyxXQUFXLE1BQU0sY0FBYyxDQUFBO0FBa0IzQyxTQUFTLGdCQUFnQixDQUFDLE9BQWU7SUFDeEMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO0FBQzVCLENBQUM7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLEtBQUssQ0FDMUIsWUFBb0IsRUFDcEIsYUFBcUIsRUFDckIsV0FBMEIsRUFDMUIsaUJBQW9DLEVBQ3BDLHVCQUFpRDtJQUVqRCxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUM1QyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUM5QyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFFL0QsTUFBTSxZQUFZLEdBQWEsQ0FBQyxHQUFHLEtBQUssRUFBRSxHQUFHLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUN4RSxDQUFDLFVBQVUsRUFBRSxFQUFFLENB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