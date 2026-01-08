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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9rZXliaW5kaW5nc01lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFcEQsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFdEUsT0FBTyxLQUFLLFdBQVcsTUFBTSxjQUFjLENBQUE7QUFrQjNDLFNBQVMsZ0JBQWdCLENBQUMsT0FBZTtJQUN4QyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7QUFDNUIsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsS0FBSyxDQUMxQixZQUFvQixFQUNwQixhQUFxQixFQUNyQixXQUEwQixFQUMxQixpQkFBb0MsRUFDcEMsdUJBQWlEO0lBRWpELE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzVDLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzlDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtJQUUvRCxNQUFNLFlBQVksR0FBYSxDQUFDLEdBQUcsS0FBSyxFQUFFLEdBQUcsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQ3hFLENBQUMsVUFBVSxFQUFFLEVB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