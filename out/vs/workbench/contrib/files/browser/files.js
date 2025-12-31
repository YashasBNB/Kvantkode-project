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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy9icm93c2VyL2ZpbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBMkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdCQUFnQixHQUVoQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUdqRixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sNERBQTRELENBQUE7QUFHbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBc0NqRSxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLGlCQUFpQixDQUFDLENBQUE7QUF1QnBGLFNBQVMsUUFBUSxDQUFDLFdBQXlCO0lBQzFDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxlQUFlLENBQUE7SUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFBO0lBQ3RDLElBQUksT0FBTyxJQUFJLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3pDLElBQUksS0FBYyxDQUFBO1FBQ2xCLElBQUksSUFBSSxZ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