/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { OpenEditor } from '../common/files.js';
import { EditorResourceAccessor, SideBySideEditor, } from '../../../common/editor.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { ExplorerItem } from '../common/explorerModel.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { AsyncDataTree } from '../../../../base/browser/ui/tree/asyncDataTree.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { isActiveElement } from '../../../../base/browser/dom.js';
export const IExplorerService = createDecorator('explorerService');
function getFocus(listService) {
    const list = listService.lastFocusedList;
    const element = list?.getHTMLElement();
    if (element && isActiveElement(element)) {
        let focus;
        if (list instanceof List) {
            const focused = list.getFocusedElements();
            if (focused.length) {
                focus = focused[0];
            }
        }
        else if (list instanceof AsyncDataTree) {
            const focused = list.getFocus();
            if (focused.length) {
                focus = focused[0];
            }
        }
        return focus;
    }
    return undefined;
}
// Commands can get executed from a command palette, from a context menu or from some list using a keybinding
// To cover all these cases we need to properly compute the resource on which the command is being executed
export function getResourceForCommand(commandArg, editorService, listService) {
    if (URI.isUri(commandArg)) {
        return commandArg;
    }
    const focus = getFocus(listService);
    if (focus instanceof ExplorerItem) {
        return focus.resource;
    }
    else if (focus instanceof OpenEditor) {
        return focus.getResource();
    }
    return EditorResourceAccessor.getOriginalUri(editorService.activeEditor, {
        supportSideBySide: SideBySideEditor.PRIMARY,
    });
}
export function getMultiSelectedResources(commandArg, listService, editorSerice, editorGroupService, explorerService) {
    const list = listService.lastFocusedList;
    const element = list?.getHTMLElement();
    if (element && isActiveElement(element)) {
        // Explorer
        if (list instanceof AsyncDataTree &&
            list.getFocus().every((item) => item instanceof ExplorerItem)) {
            // Explorer
            const context = explorerService.getContext(true, true);
            if (context.length) {
                return context.map((c) => c.resource);
            }
        }
        // Open editors view
        if (list instanceof List) {
            const selection = coalesce(list
                .getSelectedElements()
                .filter((s) => s instanceof OpenEditor)
                .map((oe) => oe.getResource()));
            const focusedElements = list.getFocusedElements();
            const focus = focusedElements.length ? focusedElements[0] : undefined;
            let mainUriStr = undefined;
            if (URI.isUri(commandArg)) {
                mainUriStr = commandArg.toString();
            }
            else if (focus instanceof OpenEditor) {
                const focusedResource = focus.getResource();
                mainUriStr = focusedResource ? focusedResource.toString() : undefined;
            }
            // We only respect the selection if it contains the main element.
            const mainIndex = selection.findIndex((s) => s.toString() === mainUriStr);
            if (mainIndex !== -1) {
                // Move the main resource to the front of the selection.
                const mainResource = selection[mainIndex];
                selection.splice(mainIndex, 1);
                selection.unshift(mainResource);
                return selection;
            }
        }
    }
    // Check for tabs multiselect
    const activeGroup = editorGroupService.activeGroup;
    const selection = activeGroup.selectedEditors;
    if (selection.length > 1 && URI.isUri(commandArg)) {
        // If the resource is part of the tabs selection, return all selected tabs/resources.
        // It's possible that multiple tabs are selected but the action was applied to a resource that is not part of the selection.
        const mainEditorSelectionIndex = selection.findIndex((e) => e.matches({ resource: commandArg }));
        if (mainEditorSelectionIndex !== -1) {
            const mainEditor = selection[mainEditorSelectionIndex];
            selection.splice(mainEditorSelectionIndex, 1);
            selection.unshift(mainEditor);
            return selection
                .map((editor) => EditorResourceAccessor.getOriginalUri(editor))
                .filter((uri) => !!uri);
        }
    }
    const result = getResourceForCommand(commandArg, editorSerice, listService);
    return !!result ? [result] : [];
}
export function getOpenEditorsViewMultiSelection(accessor) {
    const list = accessor.get(IListService).lastFocusedList;
    const element = list?.getHTMLElement();
    if (element && isActiveElement(element)) {
        // Open editors view
        if (list instanceof List) {
            const selection = coalesce(list.getSelectedElements().filter((s) => s instanceof OpenEditor));
            const focusedElements = list.getFocusedElements();
            const focus = focusedElements.length ? focusedElements[0] : undefined;
            let mainEditor = undefined;
            if (focus instanceof OpenEditor) {
                mainEditor = focus;
            }
            // We only respect the selection if it contains the main element.
            if (selection.some((s) => s === mainEditor)) {
                return selection;
            }
            return mainEditor ? [mainEditor] : undefined;
        }
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvZmlsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUEyQixNQUFNLG9CQUFvQixDQUFBO0FBQ3hFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsZ0JBQWdCLEdBRWhCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR2pGLE9BQU8sRUFDTixlQUFlLEdBRWYsTUFBTSw0REFBNEQsQ0FBQTtBQUduRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFzQ2pFLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIsaUJBQWlCLENBQUMsQ0FBQTtBQXVCcEYsU0FBUyxRQUFRLENBQUMsV0FBeUI7SUFDMUMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQTtJQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEVBQUUsY0FBYyxFQUFFLENBQUE7SUFDdEMsSUFBSSxPQUFPLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDekMsSUFBSSxLQUFjLENBQUE7UUFDbEIsSUFBSSxJ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