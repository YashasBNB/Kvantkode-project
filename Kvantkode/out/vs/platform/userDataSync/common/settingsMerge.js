/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../base/common/arrays.js';
import { parse, visit } from '../../../base/common/json.js';
import { applyEdits, setProperty, withFormatting } from '../../../base/common/jsonEdit.js';
import { getEOL } from '../../../base/common/jsonFormatter.js';
import * as objects from '../../../base/common/objects.js';
import * as contentUtil from './content.js';
import { getDisallowedIgnoredSettings } from './userDataSync.js';
export function getIgnoredSettings(defaultIgnoredSettings, configurationService, settingsContent) {
    let value = [];
    if (settingsContent) {
        value = getIgnoredSettingsFromContent(settingsContent);
    }
    else {
        value = getIgnoredSettingsFromConfig(configurationService);
    }
    const added = [], removed = [...getDisallowedIgnoredSettings()];
    if (Array.isArray(value)) {
        for (const key of value) {
            if (key.startsWith('-')) {
                removed.push(key.substring(1));
            }
            else {
                added.push(key);
            }
        }
    }
    return distinct([...defaultIgnoredSettings, ...added].filter((setting) => !removed.includes(setting)));
}
function getIgnoredSettingsFromConfig(configurationService) {
    let userValue = configurationService.inspect('settingsSync.ignoredSettings').userValue;
    if (userValue !== undefined) {
        return userValue;
    }
    userValue = configurationService.inspect('sync.ignoredSettings').userValue;
    if (userValue !== undefined) {
        return userValue;
    }
    return configurationService.getValue('settingsSync.ignoredSettings') || [];
}
function getIgnoredSettingsFromContent(settingsContent) {
    const parsed = parse(settingsContent);
    return parsed
        ? parsed['settingsSync.ignoredSettings'] || parsed['sync.ignoredSettings'] || []
        : [];
}
export function removeComments(content, formattingOptions) {
    const source = parse(content) || {};
    let result = '{}';
    for (const key of Object.keys(source)) {
        const edits = setProperty(result, [key], source[key], formattingOptions);
        result = applyEdits(result, edits);
    }
    return result;
}
export function updateIgnoredSettings(targetContent, sourceContent, ignoredSettings, formattingOptions) {
    if (ignoredSettings.length) {
        const sourceTree = parseSettings(sourceContent);
        const source = parse(sourceContent) || {};
        const target = parse(targetContent);
        if (!target) {
            return targetContent;
        }
        const settingsToAdd = [];
        for (const key of ignoredSettings) {
            const sourceValue = source[key];
            const targetValue = target[key];
            // Remove in target
            if (sourceValue === undefined) {
                targetContent = contentUtil.edit(targetContent, [key], undefined, formattingOptions);
            }
            // Update in target
            else if (targetValue !== undefined) {
                targetContent = contentUtil.edit(targetContent, [key], sourceValue, formattingOptions);
            }
            else {
                settingsToAdd.push(findSettingNode(key, sourceTree));
            }
        }
        settingsToAdd.sort((a, b) => a.startOffset - b.startOffset);
        settingsToAdd.forEach((s) => (targetContent = addSetting(s.setting.key, sourceContent, targetContent, formattingOptions)));
    }
    return targetContent;
}
export function merge(originalLocalContent, originalRemoteContent, baseContent, ignoredSettings, resolvedConflicts, formattingOptions) {
    const localContentWithoutIgnoredSettings = updateIgnoredSettings(originalLocalContent, originalRemoteContent, ignoredSettings, formattingOptions);
    const localForwarded = baseContent !== localContentWithoutIgnoredSettings;
    const remoteForwarded = baseContent !== originalRemoteContent;
    /* no changes */
    if (!localForwarded && !remoteForwarded) {
        return { conflictsSettings: [], localContent: null, remoteContent: null, hasConflicts: false };
    }
    /* local has changed and remote has not */
    if (localForwarded && !remoteForwarded) {
        return {
            conflictsSettings: [],
            localContent: null,
            remoteContent: localContentWithoutIgnoredSettings,
            hasConflicts: false,
        };
    }
    /* remote has changed and local has not */
    if (remoteForwarded && !localForwarded) {
        return {
            conflictsSettings: [],
            localContent: updateIgnoredSettings(originalRemoteContent, originalLocalContent, ignoredSettings, formattingOptions),
            remoteContent: null,
            hasConflicts: false,
        };
    }
    /* local is empty and not synced before */
    if (baseContent === null && isEmpty(originalLocalContent)) {
        const localContent = areSame(originalLocalContent, originalRemoteContent, ignoredSettings)
            ? null
            : updateIgnoredSettings(originalRemoteContent, originalLocalContent, ignoredSettings, formattingOptions);
        return { conflictsSettings: [], localContent, remoteContent: null, hasConflicts: false };
    }
    /* remote and local has changed */
    let localContent = originalLocalContent;
    let remoteContent = originalRemoteContent;
    const local = parse(originalLocalContent);
    const remote = parse(originalRemoteContent);
    const base = baseContent ? parse(baseContent) : null;
    const ignored = ignoredSettings.reduce((set, key) => {
        set.add(key);
        return set;
    }, new Set());
    const localToRemote = compare(local, remote, ignored);
    const baseToLocal = compare(base, local, ignored);
    const baseToRemote = compare(base, remote, ignored);
    const conflicts = new Map();
    const handledConflicts = new Set();
    const handleConflict = (conflictKey) => {
        handledConflicts.add(conflictKey);
        const resolvedConflict = resolvedConflicts.filter(({ key }) => key === conflictKey)[0];
        if (resolvedConflict) {
            localContent = contentUtil.edit(localContent, [conflictKey], resolvedConflict.value, formattingOptions);
            remoteContent = contentUtil.edit(remoteContent, [conflictKey], resolvedConflict.value, formattingOptions);
        }
        else {
            conflicts.set(conflictKey, {
                key: conflictKey,
                localValue: local[conflictKey],
                remoteValue: remote[conflictKey],
            });
        }
    };
    // Removed settings in Local
    for (const key of baseToLocal.removed.values()) {
        // Conflict - Got updated in remote.
        if (baseToRemote.updated.has(key)) {
            handleConflict(key);
        }
        // Also remove in remote
        else {
            remoteContent = contentUtil.edit(remoteContent, [key], undefined, formattingOptions);
        }
    }
    // Removed settings in Remote
    for (const key of baseToRemote.removed.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Conflict - Got updated in local
        if (baseToLocal.updated.has(key)) {
            handleConflict(key);
        }
        // Also remove in locals
        else {
            localContent = contentUtil.edit(localContent, [key], undefined, formattingOptions);
        }
    }
    // Updated settings in Local
    for (const key of baseToLocal.updated.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got updated in remote
        if (baseToRemote.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            remoteContent = contentUtil.edit(remoteContent, [key], local[key], formattingOptions);
        }
    }
    // Updated settings in Remote
    for (const key of baseToRemote.updated.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got updated in local
        if (baseToLocal.updated.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            localContent = contentUtil.edit(localContent, [key], remote[key], formattingOptions);
        }
    }
    // Added settings in Local
    for (const key of baseToLocal.added.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got added in remote
        if (baseToRemote.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            remoteContent = addSetting(key, localContent, remoteContent, formattingOptions);
        }
    }
    // Added settings in remote
    for (const key of baseToRemote.added.values()) {
        if (handledConflicts.has(key)) {
            continue;
        }
        // Got added in local
        if (baseToLocal.added.has(key)) {
            // Has different value
            if (localToRemote.updated.has(key)) {
                handleConflict(key);
            }
        }
        else {
            localContent = addSetting(key, remoteContent, localContent, formattingOptions);
        }
    }
    const hasConflicts = conflicts.size > 0 || !areSame(localContent, remoteContent, ignoredSettings);
    const hasLocalChanged = hasConflicts || !areSame(localContent, originalLocalContent, []);
    const hasRemoteChanged = hasConflicts || !areSame(remoteContent, originalRemoteContent, []);
    return {
        localContent: hasLocalChanged ? localContent : null,
        remoteContent: hasRemoteChanged ? remoteContent : null,
        conflictsSettings: [...conflicts.values()],
        hasConflicts,
    };
}
function areSame(localContent, remoteContent, ignoredSettings) {
    if (localContent === remoteContent) {
        return true;
    }
    const local = parse(localContent);
    const remote = parse(remoteContent);
    const ignored = ignoredSettings.reduce((set, key) => {
        set.add(key);
        return set;
    }, new Set());
    const localTree = parseSettings(localContent).filter((node) => !(node.setting && ignored.has(node.setting.key)));
    const remoteTree = parseSettings(remoteContent).filter((node) => !(node.setting && ignored.has(node.setting.key)));
    if (localTree.length !== remoteTree.length) {
        return false;
    }
    for (let index = 0; index < localTree.length; index++) {
        const localNode = localTree[index];
        const remoteNode = remoteTree[index];
        if (localNode.setting && remoteNode.setting) {
            if (localNode.setting.key !== remoteNode.setting.key) {
                return false;
            }
            if (!objects.equals(local[localNode.setting.key], remote[localNode.setting.key])) {
                return false;
            }
        }
        else if (!localNode.setting && !remoteNode.setting) {
            if (localNode.value !== remoteNode.value) {
                return false;
            }
        }
        else {
            return false;
        }
    }
    return true;
}
export function isEmpty(content) {
    if (content) {
        const nodes = parseSettings(content);
        return nodes.length === 0;
    }
    return true;
}
function compare(from, to, ignored) {
    const fromKeys = from ? Object.keys(from).filter((key) => !ignored.has(key)) : [];
    const toKeys = Object.keys(to).filter((key) => !ignored.has(key));
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
    if (from) {
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
    }
    return { added, removed, updated };
}
export function addSetting(key, sourceContent, targetContent, formattingOptions) {
    const source = parse(sourceContent);
    const sourceTree = parseSettings(sourceContent);
    const targetTree = parseSettings(targetContent);
    const insertLocation = getInsertLocation(key, sourceTree, targetTree);
    return insertAtLocation(targetContent, key, source[key], insertLocation, targetTree, formattingOptions);
}
function getInsertLocation(key, sourceTree, targetTree) {
    const sourceNodeIndex = sourceTree.findIndex((node) => node.setting?.key === key);
    const sourcePreviousNode = sourceTree[sourceNodeIndex - 1];
    if (sourcePreviousNode) {
        /*
            Previous node in source is a setting.
            Find the same setting in the target.
            Insert it after that setting
        */
        if (sourcePreviousNode.setting) {
            const targetPreviousSetting = findSettingNode(sourcePreviousNode.setting.key, targetTree);
            if (targetPreviousSetting) {
                /* Insert after target's previous setting */
                return { index: targetTree.indexOf(targetPreviousSetting), insertAfter: true };
            }
        }
        else {
            /* Previous node in source is a comment */
            const sourcePreviousSettingNode = findPreviousSettingNode(sourceNodeIndex, sourceTree);
            /*
                Source has a setting defined before the setting to be added.
                Find the same previous setting in the target.
                If found, insert before its next setting so that comments are retrieved.
                Otherwise, insert at the end.
            */
            if (sourcePreviousSettingNode) {
                const targetPreviousSetting = findSettingNode(sourcePreviousSettingNode.setting.key, targetTree);
                if (targetPreviousSetting) {
                    const targetNextSetting = findNextSettingNode(targetTree.indexOf(targetPreviousSetting), targetTree);
                    const sourceCommentNodes = findNodesBetween(sourceTree, sourcePreviousSettingNode, sourceTree[sourceNodeIndex]);
                    if (targetNextSetting) {
                        const targetCommentNodes = findNodesBetween(targetTree, targetPreviousSetting, targetNextSetting);
                        const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes, targetCommentNodes);
                        if (targetCommentNode) {
                            return {
                                index: targetTree.indexOf(targetCommentNode),
                                insertAfter: true,
                            }; /* Insert after comment */
                        }
                        else {
                            return {
                                index: targetTree.indexOf(targetNextSetting),
                                insertAfter: false,
                            }; /* Insert before target next setting */
                        }
                    }
                    else {
                        const targetCommentNodes = findNodesBetween(targetTree, targetPreviousSetting, targetTree[targetTree.length - 1]);
                        const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes, targetCommentNodes);
                        if (targetCommentNode) {
                            return {
                                index: targetTree.indexOf(targetCommentNode),
                                insertAfter: true,
                            }; /* Insert after comment */
                        }
                        else {
                            return { index: targetTree.length - 1, insertAfter: true }; /* Insert at the end */
                        }
                    }
                }
            }
        }
        const sourceNextNode = sourceTree[sourceNodeIndex + 1];
        if (sourceNextNode) {
            /*
                Next node in source is a setting.
                Find the same setting in the target.
                Insert it before that setting
            */
            if (sourceNextNode.setting) {
                const targetNextSetting = findSettingNode(sourceNextNode.setting.key, targetTree);
                if (targetNextSetting) {
                    /* Insert before target's next setting */
                    return { index: targetTree.indexOf(targetNextSetting), insertAfter: false };
                }
            }
            else {
                /* Next node in source is a comment */
                const sourceNextSettingNode = findNextSettingNode(sourceNodeIndex, sourceTree);
                /*
                    Source has a setting defined after the setting to be added.
                    Find the same next setting in the target.
                    If found, insert after its previous setting so that comments are retrieved.
                    Otherwise, insert at the beginning.
                */
                if (sourceNextSettingNode) {
                    const targetNextSetting = findSettingNode(sourceNextSettingNode.setting.key, targetTree);
                    if (targetNextSetting) {
                        const targetPreviousSetting = findPreviousSettingNode(targetTree.indexOf(targetNextSetting), targetTree);
                        const sourceCommentNodes = findNodesBetween(sourceTree, sourceTree[sourceNodeIndex], sourceNextSettingNode);
                        if (targetPreviousSetting) {
                            const targetCommentNodes = findNodesBetween(targetTree, targetPreviousSetting, targetNextSetting);
                            const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes.reverse(), targetCommentNodes.reverse());
                            if (targetCommentNode) {
                                return {
                                    index: targetTree.indexOf(targetCommentNode),
                                    insertAfter: false,
                                }; /* Insert before comment */
                            }
                            else {
                                return {
                                    index: targetTree.indexOf(targetPreviousSetting),
                                    insertAfter: true,
                                }; /* Insert after target previous setting */
                            }
                        }
                        else {
                            const targetCommentNodes = findNodesBetween(targetTree, targetTree[0], targetNextSetting);
                            const targetCommentNode = findLastMatchingTargetCommentNode(sourceCommentNodes.reverse(), targetCommentNodes.reverse());
                            if (targetCommentNode) {
                                return {
                                    index: targetTree.indexOf(targetCommentNode),
                                    insertAfter: false,
                                }; /* Insert before comment */
                            }
                            else {
                                return { index: 0, insertAfter: false }; /* Insert at the beginning */
                            }
                        }
                    }
                }
            }
        }
    }
    /* Insert at the end */
    return { index: targetTree.length - 1, insertAfter: true };
}
function insertAtLocation(content, key, value, location, tree, formattingOptions) {
    let edits;
    /* Insert at the end */
    if (location.index === -1) {
        edits = setProperty(content, [key], value, formattingOptions);
    }
    else {
        edits = getEditToInsertAtLocation(content, key, value, location, tree, formattingOptions).map((edit) => withFormatting(content, edit, formattingOptions)[0]);
    }
    return applyEdits(content, edits);
}
function getEditToInsertAtLocation(content, key, value, location, tree, formattingOptions) {
    const newProperty = `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
    const eol = getEOL(formattingOptions, content);
    const node = tree[location.index];
    if (location.insertAfter) {
        const edits = [];
        /* Insert after a setting */
        if (node.setting) {
            edits.push({ offset: node.endOffset, length: 0, content: ',' + newProperty });
        }
        else {
            /* Insert after a comment */
            const nextSettingNode = findNextSettingNode(location.index, tree);
            const previousSettingNode = findPreviousSettingNode(location.index, tree);
            const previousSettingCommaOffset = previousSettingNode?.setting?.commaOffset;
            /* If there is a previous setting and it does not has comma then add it */
            if (previousSettingNode && previousSettingCommaOffset === undefined) {
                edits.push({ offset: previousSettingNode.endOffset, length: 0, content: ',' });
            }
            const isPreviouisSettingIncludesComment = previousSettingCommaOffset !== undefined && previousSettingCommaOffset > node.endOffset;
            edits.push({
                offset: isPreviouisSettingIncludesComment ? previousSettingCommaOffset + 1 : node.endOffset,
                length: 0,
                content: nextSettingNode ? eol + newProperty + ',' : eol + newProperty,
            });
        }
        return edits;
    }
    else {
        /* Insert before a setting */
        if (node.setting) {
            return [{ offset: node.startOffset, length: 0, content: newProperty + ',' }];
        }
        /* Insert before a comment */
        const content = (tree[location.index - 1] && !tree[location.index - 1].setting /* previous node is comment */
            ? eol
            : '') +
            newProperty +
            (findNextSettingNode(location.index, tree) ? ',' : '') +
            eol;
        return [{ offset: node.startOffset, length: 0, content }];
    }
}
function findSettingNode(key, tree) {
    return tree.filter((node) => node.setting?.key === key)[0];
}
function findPreviousSettingNode(index, tree) {
    for (let i = index - 1; i >= 0; i--) {
        if (tree[i].setting) {
            return tree[i];
        }
    }
    return undefined;
}
function findNextSettingNode(index, tree) {
    for (let i = index + 1; i < tree.length; i++) {
        if (tree[i].setting) {
            return tree[i];
        }
    }
    return undefined;
}
function findNodesBetween(nodes, from, till) {
    const fromIndex = nodes.indexOf(from);
    const tillIndex = nodes.indexOf(till);
    return nodes.filter((node, index) => fromIndex < index && index < tillIndex);
}
function findLastMatchingTargetCommentNode(sourceComments, targetComments) {
    if (sourceComments.length && targetComments.length) {
        let index = 0;
        for (; index < targetComments.length && index < sourceComments.length; index++) {
            if (sourceComments[index].value !== targetComments[index].value) {
                return targetComments[index - 1];
            }
        }
        return targetComments[index - 1];
    }
    return undefined;
}
function parseSettings(content) {
    const nodes = [];
    let hierarchyLevel = -1;
    let startOffset;
    let key;
    const visitor = {
        onObjectBegin: (offset) => {
            hierarchyLevel++;
        },
        onObjectProperty: (name, offset, length) => {
            if (hierarchyLevel === 0) {
                // this is setting key
                startOffset = offset;
                key = name;
            }
        },
        onObjectEnd: (offset, length) => {
            hierarchyLevel--;
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset,
                    endOffset: offset + length,
                    value: content.substring(startOffset, offset + length),
                    setting: {
                        key,
                        commaOffset: undefined,
                    },
                });
            }
        },
        onArrayBegin: (offset, length) => {
            hierarchyLevel++;
        },
        onArrayEnd: (offset, length) => {
            hierarchyLevel--;
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset,
                    endOffset: offset + length,
                    value: content.substring(startOffset, offset + length),
                    setting: {
                        key,
                        commaOffset: undefined,
                    },
                });
            }
        },
        onLiteralValue: (value, offset, length) => {
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset,
                    endOffset: offset + length,
                    value: content.substring(startOffset, offset + length),
                    setting: {
                        key,
                        commaOffset: undefined,
                    },
                });
            }
        },
        onSeparator: (sep, offset, length) => {
            if (hierarchyLevel === 0) {
                if (sep === ',') {
                    let index = nodes.length - 1;
                    for (; index >= 0; index--) {
                        if (nodes[index].setting) {
                            break;
                        }
                    }
                    const node = nodes[index];
                    if (node) {
                        nodes.splice(index, 1, {
                            startOffset: node.startOffset,
                            endOffset: node.endOffset,
                            value: node.value,
                            setting: {
                                key: node.setting.key,
                                commaOffset: offset,
                            },
                        });
                    }
                }
            }
        },
        onComment: (offset, length) => {
            if (hierarchyLevel === 0) {
                nodes.push({
                    startOffset: offset,
                    endOffset: offset + length,
                    value: content.substring(offset, offset + length),
                });
            }
        },
    };
    visit(content, visitor);
    return nodes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi9zZXR0aW5nc01lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQWUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFGLE9BQU8sRUFBMkIsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkYsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEtBQUssV0FBVyxNQUFNLGNBQWMsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsNEJBQTRCLEVBQW9CLE1BQU0sbUJBQW1CLENBQUE7QUFTbEYsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxzQkFBZ0MsRUFDaEMsb0JBQTJDLEVBQzNDLGVBQXdCO0lBRXhCLElBQUksS0FBSyxHQUEwQixFQUFFLENBQUE7SUFDckMsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNyQixLQUFLLEdBQUcsNkJBQTZCLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDdkQsQ0FBQztTQUFNLENBQUM7UUFDUCxLQUFLLEdBQUcsNEJBQTRCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBQ0QsTUFBTSxLQUFLLEdBQWEsRUFBRSxFQUN6QixPQUFPLEdBQWEsQ0FBQyxHQUFHLDRCQUE0QixFQUFFLENBQUMsQ0FBQTtJQUN4RCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMxQixLQUFL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