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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBGaW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JHcm91cEZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUUvRSxPQUFPLEVBRU4sd0JBQXdCLEVBRXhCLGFBQWEsR0FFYixNQUFNLDJCQUEyQixDQUFBO0FBRWxDLE9BQU8sRUFHTixpQ0FBaUMsRUFDakMsb0JBQW9CLEdBQ3BCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLGdCQUFnQixFQUdoQixVQUFVLEdBQ1YsTUFBTSxvQkFBb0IsQ0FBQTtBQTRDM0IsTUFBTSxVQUFVLFNBQVMsQ0FDeEIsUUFBMEIsRUFDMUIsTUFBb0QsRUFDcEQsY0FBMEM7SUFJMUMsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDN0QsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7SUFFaEUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUMzRixJQUFJLEtBQUssWUFBWSxPQUFPLEVBQUUsQ0FBQztRQUM5QixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUMzQixxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUN4RSxDQUFBO0lBQ0YsQ0FBQztJ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