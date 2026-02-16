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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbWFuZHNDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yQ29tbWFuZHNDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUVOLHVCQUF1QixFQUV2QixrQkFBa0IsR0FDbEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUVsQyxPQUFPLEVBR04sYUFBYSxHQUNiLE1BQU0sd0RBQXdELENBQUE7QUFXL0QsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxXQUFzQixFQUN0QixhQUE2QixFQUM3QixtQkFBeUMsRUFDekMsV0FBeUI7SUFFekIsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQ3hDLFdBQVcsRUFDWCxhQUFhLEVBQ2IsbUJBQW1CLEVBQ25CLFdBQVcsQ0FDWCxDQUFBO0lBQ0QsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtJQUM5RixNQUFNLGVBQWUsR0FBbUMsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxDQUFBO0lBRTdGLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFLENBQUM7UUFDNUMsTUFBTSxjQUFjLEdBQUcsNEJBQTRCLENBQUMsYUFBYSxFQUFFLG1CQUFtQixDQUFD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