/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getActiveElement } from '../../../../base/browser/dom.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { URI } from '../../../../base/common/uri.js';
import { isEditorCommandsContext, isEditorIdentifier, } from '../../../common/editor.js';
import { isEditorGroup, } from '../../../services/editor/common/editorGroupsService.js';
export function resolveCommandsContext(commandArgs, editorService, editorGroupsService, listService) {
    const commandContext = getCommandsContext(commandArgs, editorService, editorGroupsService, listService);
    const preserveFocus = commandContext.length ? commandContext[0].preserveFocus || false : false;
    const resolvedContext = { groupedEditors: [], preserveFocus };
    for (const editorContext of commandContext) {
        const groupAndEditor = getEditorAndGroupFromContext(editorContext, editorGroupsService);
        if (!groupAndEditor) {
            continue;
        }
        const { group, editor } = groupAndEditor;
        // Find group context if already added
        let groupContext = undefined;
        for (const targetGroupContext of resolvedContext.groupedEditors) {
            if (targetGroupContext.group.id === group.id) {
                groupContext = targetGroupContext;
                break;
            }
        }
        // Otherwise add new group context
        if (!groupContext) {
            groupContext = { group, editors: [] };
            resolvedContext.groupedEditors.push(groupContext);
        }
        // Add editor to group context
        if (editor) {
            groupContext.editors.push(editor);
        }
    }
    return resolvedContext;
}
function getCommandsContext(commandArgs, editorService, editorGroupsService, listService) {
    // Figure out if command is executed from a list
    const list = listService.lastFocusedList;
    let isListAction = list instanceof List && list.getHTMLElement() === getActiveElement();
    // Get editor context for which the command was triggered
    let editorContext = getEditorContextFromCommandArgs(commandArgs, isListAction, editorService, editorGroupsService, listService);
    // If the editor context can not be determind use the active editor
    if (!editorContext) {
        const activeGroup = editorGroupsService.activeGroup;
        const activeEditor = activeGroup.activeEditor;
        editorContext = {
            groupId: activeGroup.id,
            editorIndex: activeEditor ? activeGroup.getIndexOfEditor(activeEditor) : undefined,
        };
        isListAction = false;
    }
    const multiEditorContext = getMultiSelectContext(editorContext, isListAction, editorService, editorGroupsService, listService);
    // Make sure the command context is the first one in the list
    return moveCurrentEditorContextToFront(editorContext, multiEditorContext);
}
function moveCurrentEditorContextToFront(editorContext, multiEditorContext) {
    if (multiEditorContext.length <= 1) {
        return multiEditorContext;
    }
    const editorContextIndex = multiEditorContext.findIndex((context) => context.groupId === editorContext.groupId &&
        context.editorIndex === editorContext.editorIndex);
    if (editorContextIndex !== -1) {
        multiEditorContext.splice(editorContextIndex, 1);
        multiEditorContext.unshift(editorContext);
    }
    else if (editorContext.editorIndex === undefined) {
        multiEditorContext.unshift(editorContext);
    }
    else {
        throw new Error('Editor context not found in multi editor context');
    }
    return multiEditorContext;
}
function getEditorContextFromCommandArgs(commandArgs, isListAction, editorService, editorGroupsService, listService) {
    // We only know how to extraxt the command context from URI and IEditorCommandsContext arguments
    const filteredArgs = commandArgs.filter((arg) => isEditorCommandsContext(arg) || URI.isUri(arg));
    // If the command arguments contain an editor context, use it
    for (const arg of filteredArgs) {
        if (isEditorCommandsContext(arg)) {
            return arg;
        }
    }
    // Otherwise, try to find the editor group by the URI of the resource
    for (const uri of filteredArgs) {
        const editorIdentifiers = editorService.findEditors(uri);
        if (editorIdentifiers.length) {
            const editorIdentifier = editorIdentifiers[0];
            const group = editorGroupsService.getGroup(editorIdentifier.groupId);
            return {
                groupId: editorIdentifier.groupId,
                editorIndex: group?.getIndexOfEditor(editorIdentifier.editor),
            };
        }
    }
    // If there is no context in the arguments, try to find the context from the focused list
    // if the action was executed from a list
    if (isListAction) {
        const list = listService.lastFocusedList;
        for (const focusedElement of list.getFocusedElements()) {
            if (isGroupOrEditor(focusedElement)) {
                return groupOrEditorToEditorContext(focusedElement, undefined, editorGroupsService);
            }
        }
    }
    return undefined;
}
function getMultiSelectContext(editorContext, isListAction, editorService, editorGroupsService, listService) {
    // If the action was executed from a list, return all selected editors
    if (isListAction) {
        const list = listService.lastFocusedList;
        const selection = list.getSelectedElements().filter(isGroupOrEditor);
        if (selection.length > 1) {
            return selection.map((e) => groupOrEditorToEditorContext(e, editorContext.preserveFocus, editorGroupsService));
        }
        if (selection.length === 0) {
            // TODO@benibenj workaround for https://github.com/microsoft/vscode/issues/224050
            // Explainer: the `isListAction` flag can be a false positive in certain cases because
            // it will be `true` if the active element is a `List` even if it is part of the editor
            // area. The workaround here is to fallback to `isListAction: false` if the list is not
            // having any editor or group selected.
            return getMultiSelectContext(editorContext, false, editorService, editorGroupsService, listService);
        }
    }
    // Check editors selected in the group (tabs)
    else {
        const group = editorGroupsService.getGroup(editorContext.groupId);
        const editor = editorContext.editorIndex !== undefined
            ? group?.getEditorByIndex(editorContext.editorIndex)
            : group?.activeEditor;
        // If the editor is selected, return all selected editors otherwise only use the editors context
        if (group && editor && group.isSelected(editor)) {
            return group.selectedEditors.map((editor) => groupOrEditorToEditorContext({ editor, groupId: group.id }, editorContext.preserveFocus, editorGroupsService));
        }
    }
    // Otherwise go with passed in context
    return [editorContext];
}
function groupOrEditorToEditorContext(element, preserveFocus, editorGroupsService) {
    if (isEditorGroup(element)) {
        return { groupId: element.id, editorIndex: undefined, preserveFocus };
    }
    const group = editorGroupsService.getGroup(element.groupId);
    return {
        groupId: element.groupId,
        editorIndex: group ? group.getIndexOfEditor(element.editor) : -1,
        preserveFocus,
    };
}
function isGroupOrEditor(element) {
    return isEditorGroup(element) || isEditorIdentifier(element);
}
function getEditorAndGroupFromContext(commandContext, editorGroupsService) {
    const group = editorGroupsService.getGroup(commandContext.groupId);
    if (!group) {
        return undefined;
    }
    if (commandContext.editorIndex === undefined) {
        return { group, editor: undefined };
    }
    const editor = group.getEditorByIndex(commandContext.editorIndex);
    return { group, editor };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHNDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvckNvbW1hbmRzQ29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFFTix1QkFBdUIsRUFFdkIsa0JBQWtCLEdBQ2xCLE1BQU0sMkJBQTJCLENBQUE7QUFFbEMsT0FBTyxFQUdOLGFBQWEsR0FDYixNQUFNLHdEQUF3RCxDQUFBO0FBVy9ELE1BQU0sVUFBVSxzQkFBc0IsQ0FDckMsV0FBc0IsRUFDdEIsYUFBNkIsRUFDN0IsbUJBQXlDLEVBQ3pDLFdBQXlCO0lBRXpCLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUN4QyxXQUFXLEVBQ1gsYUFBYSxFQUNiLG1CQUFtQixFQUNuQixXQUFXLENBQ1gsQ0FBQTtJQUNELE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7SUFDOUYsTUFBTSxlQUFlLEdBQW1DLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQTtJQUU3RixLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQzVDLE1BQU0sY0FBYyxHQUFHLDRCQUE0QixDQUFDLGFBQWEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3ZGLElBQUksQ0FBQyxj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