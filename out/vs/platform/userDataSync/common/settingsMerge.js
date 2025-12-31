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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NNZXJnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy9jb21tb24vc2V0dGluZ3NNZXJnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFlLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRixPQUFPLEVBQTJCLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3ZGLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFFMUQsT0FBTyxLQUFLLFdBQVcsTUFBTSxjQUFjLENBQUE7QUFDM0MsT0FBTyxFQUFFLDRCQUE0QixFQUFvQixNQUFNLG1CQUFtQixDQUFBO0FBU2xGLE1BQU0sVUFBVSxrQkFBa0IsQ0FDakMsc0JBQWdDLEVBQ2hDLG9CQUEyQyxFQUMzQyxlQUF3QjtJQUV4QixJQUFJLEtBQUssR0FBMEIsRUFBRSxDQUFBO0lBQ3JDLElBQUksZUFBZSxFQUFFLENBQUM7UUFDckIsS0FBSyxHQUFHLDZCQUE2QixDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7U0FBTSxDQUFDO1FBQ1AsS0FBSyxHQUFHLDRCQUE0QixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFhLEVBQUUsRUFDekIsT0FBTyxHQUFhLENBQUMsR0FBRyw0QkFBNEIsRUFBRSxDQUFDLENBQUE7SUFDeEQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDMUIsS0FBSyxNQUFN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