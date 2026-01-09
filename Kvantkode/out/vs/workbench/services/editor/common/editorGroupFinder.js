/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { isEditorInputWithOptions, isEditorInput, } from '../../../common/editor.js';
import { preferredSideBySideGroupDirection, IEditorGroupsService, } from './editorGroupsService.js';
import { AUX_WINDOW_GROUP, SIDE_GROUP, } from './editorService.js';
export function findGroup(accessor, editor, preferredGroup) {
    const editorGroupService = accessor.get(IEditorGroupsService);
    const configurationService = accessor.get(IConfigurationService);
    const group = doFindGroup(editor, preferredGroup, editorGroupService, configurationService);
    if (group instanceof Promise) {
        return group.then((group) => handleGroupActivation(group, editor, preferredGroup, editorGroupService));
    }
    return handleGroupActivation(group, editor, preferredGroup, editorGroupService);
}
function handleGroupActivation(group, editor, preferredGroup, editorGroupService) {
    // Resolve editor activation strategy
    let activation = undefined;
    if (editorGroupService.activeGroup !== group && // only if target group is not already active
        editor.options &&
        !editor.options.inactive && // never for inactive editors
        editor.options.preserveFocus && // only if preserveFocus
        typeof editor.options.activation !== 'number' && // only if activation is not already defined (either true or false)
        preferredGroup !== SIDE_GROUP // never for the SIDE_GROUP
    ) {
        // If the resolved group is not the active one, we typically
        // want the group to become active. There are a few cases
        // where we stay away from encorcing this, e.g. if the caller
        // is already providing `activation`.
        //
        // Specifically for historic reasons we do not activate a
        // group is it is opened as `SIDE_GROUP` with `preserveFocus:true`.
        // repeated Alt-clicking of files in the explorer always open
        // into the same side group and not cause a group to be created each time.
        activation = EditorActivation.ACTIVATE;
    }
    return [group, activation];
}
function doFindGroup(input, preferredGroup, editorGroupService, configurationService) {
    let group;
    const editor = isEditorInputWithOptions(input) ? input.editor : input;
    const options = input.options;
    // Group: Instance of Group
    if (preferredGroup && typeof preferredGroup !== 'number') {
        group = preferredGroup;
    }
    // Group: Specific Group
    else if (typeof preferredGroup === 'number' && preferredGroup >= 0) {
        group = editorGroupService.getGroup(preferredGroup);
    }
    // Group: Side by Side
    else if (preferredGroup === SIDE_GROUP) {
        const direction = preferredSideBySideGroupDirection(configurationService);
        let candidateGroup = editorGroupService.findGroup({ direction });
        if (!candidateGroup || isGroupLockedForEditor(candidateGroup, editor)) {
            // Create new group either when the candidate group
            // is locked or was not found in the direction
            candidateGroup = editorGroupService.addGroup(editorGroupService.activeGroup, direction);
        }
        group = candidateGroup;
    }
    // Group: Aux Window
    else if (preferredGroup === AUX_WINDOW_GROUP) {
        group = editorGroupService.createAuxiliaryEditorPart().then((group) => group.activeGroup);
    }
    // Group: Unspecified without a specific index to open
    else if (!options || typeof options.index !== 'number') {
        const groupsByLastActive = editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        // Respect option to reveal an editor if it is already visible in any group
        if (options?.revealIfVisible) {
            for (const lastActiveGroup of groupsByLastActive) {
                if (isActive(lastActiveGroup, editor)) {
                    group = lastActiveGroup;
                    break;
                }
            }
        }
        // Respect option to reveal an editor if it is open (not necessarily visible)
        // Still prefer to reveal an editor in a group where the editor is active though.
        // We also try to reveal an editor if it has the `Singleton` capability which
        // indicates that the same editor cannot be opened across groups.
        if (!group) {
            if (options?.revealIfOpened ||
                configurationService.getValue('workbench.editor.revealIfOpen') ||
                (isEditorInput(editor) && editor.hasCapability(8 /* EditorInputCapabilities.Singleton */))) {
                let groupWithInputActive = undefined;
                let groupWithInputOpened = undefined;
                for (const group of groupsByLastActive) {
                    if (isOpened(group, editor)) {
                        if (!groupWithInputOpened) {
                            groupWithInputOpened = group;
                        }
                        if (!groupWithInputActive && group.isActive(editor)) {
                            groupWithInputActive = group;
                        }
                    }
                    if (groupWithInputOpened && groupWithInputActive) {
                        break; // we found all groups we wanted
                    }
                }
                // Prefer a target group where the input is visible
                group = groupWithInputActive || groupWithInputOpened;
            }
        }
    }
    // Fallback to active group if target not valid but avoid
    // locked editor groups unless editor is already opened there
    if (!group) {
        let candidateGroup = editorGroupService.activeGroup;
        // Locked group: find the next non-locked group
        // going up the neigbours of the group or create
        // a new group otherwise
        if (isGroupLockedForEditor(candidateGroup, editor)) {
            for (const group of editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                if (isGroupLockedForEditor(group, editor)) {
                    continue;
                }
                candidateGroup = group;
                break;
            }
            if (isGroupLockedForEditor(candidateGroup, editor)) {
                // Group is still locked, so we have to create a new
                // group to the side of the candidate group
                group = editorGroupService.addGroup(candidateGroup, preferredSideBySideGroupDirection(configurationService));
            }
            else {
                group = candidateGroup;
            }
        }
        // Non-locked group: take as is
        else {
            group = candidateGroup;
        }
    }
    return group;
}
function isGroupLockedForEditor(group, editor) {
    if (!group.isLocked) {
        // only relevant for locked editor groups
        return false;
    }
    if (isOpened(group, editor)) {
        // special case: the locked group contains
        // the provided editor. in that case we do not want
        // to open the editor in any different group.
        return false;
    }
    // group is locked for this editor
    return true;
}
function isActive(group, editor) {
    if (!group.activeEditor) {
        return false;
    }
    return group.activeEditor.matches(editor);
}
function isOpened(group, editor) {
    for (const typedEditor of group.editors) {
        if (typedEditor.matches(editor)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBGaW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvY29tbW9uL2VkaXRvckdyb3VwRmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRS9FLE9BQU8sRUFFTix3QkFBd0IsRUFFeEIsYUFBYSxHQUViLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUdOLGlDQUFpQyxFQUNqQyxvQkFBb0IsR0FDcEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sZ0JBQWdCLEVBR2hCLFVBQVUsR0FDVixNQUFNLG9CQUFvQixDQUFBO0FBNEMzQixNQUFNLFVBQVUsU0FBUyxDQUN4QixRQUEwQixFQUMxQixNQUFvRCxFQUNwRCxjQUEwQztJQUkxQyxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUM3RCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUVoRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQzNGLElBQUksS0FBSyxZQUFZLE9BQU8sRUFBRSxDQUFDO1FBQzlCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQzNCLHFCQUFxQixDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixDQUFD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