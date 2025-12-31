/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getSelectionKeyboardEvent, } from '../../../../platform/list/browser/listService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { searchRemoveIcon, searchReplaceIcon } from './searchIcons.js';
import * as Constants from '../common/constants.js';
import { IReplaceService } from './replace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { category, getElementsToOperateOn, getSearchView, shouldRefocus, } from './searchActionsBase.js';
import { equals } from '../../../../base/common/arrays.js';
import { arrayContainsElementOrParent, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeMatch, isSearchResult, isTextSearchHeading, } from './searchTreeModel/searchTreeCommon.js';
import { MatchInNotebook } from './notebookSearch/notebookSearchModel.js';
import { AITextSearchHeadingImpl } from './AISearch/aiSearchModel.js';
//#endregion
//#region Actions
registerAction2(class RemoveAction extends Action2 {
    constructor() {
        super({
            id: "search.action.remove" /* Constants.SearchCommandIds.RemoveActionId */,
            title: nls.localize2('RemoveAction.label', 'Dismiss'),
            category,
            icon: searchRemoveIcon,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.FileMatchOrMatchFocusKey),
                primary: 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                },
            },
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'search',
                    order: 2,
                },
                {
                    id: MenuId.SearchActionMenu,
                    group: 'inline',
                    when: ContextKeyExpr.or(Constants.SearchContext.FileFocusKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.FolderFocusKey),
                    order: 2,
                },
            ],
        });
    }
    async run(accessor, context) {
        const viewsService = accessor.get(IViewsService);
        const configurationService = accessor.get(IConfigurationService);
        const searchView = getSearchView(viewsService);
        if (!searchView) {
            return;
        }
        let element = context?.element;
        let viewer = context?.viewer;
        if (!viewer) {
            viewer = searchView.getControl();
        }
        if (!element) {
            element = viewer.getFocus()[0] ?? undefined;
        }
        const elementsToRemove = getElementsToOperateOn(viewer, element, configurationService.getValue('search'));
        let focusElement = viewer.getFocus()[0] ?? undefined;
        if (elementsToRemove.length === 0) {
            return;
        }
        if (!focusElement || isSearchResult(focusElement)) {
            focusElement = element;
        }
        let nextFocusElement;
        const shouldRefocusMatch = shouldRefocus(elementsToRemove, focusElement);
        if (focusElement && shouldRefocusMatch) {
            nextFocusElement = await getElementToFocusAfterRemoved(viewer, focusElement, elementsToRemove);
        }
        const searchResult = searchView.searchResult;
        if (searchResult) {
            searchResult.batchRemove(elementsToRemove);
        }
        await searchView.queueRefreshTree(); // wait for refreshTree to finish
        if (focusElement && shouldRefocusMatch) {
            if (!nextFocusElement) {
                nextFocusElement = await getLastNodeFromSameType(viewer, focusElement);
            }
            if (nextFocusElement && !arrayContainsElementOrParent(nextFocusElement, elementsToRemove)) {
                viewer.reveal(nextFocusElement);
                viewer.setFocus([nextFocusElement], getSelectionKeyboardEvent());
                viewer.setSelection([nextFocusElement], getSelectionKeyboardEvent());
            }
        }
        else if (!equals(viewer.getFocus(), viewer.getSelection())) {
            viewer.setSelection(viewer.getFocus());
        }
        viewer.domFocus();
        return;
    }
});
registerAction2(class ReplaceAction extends Action2 {
    constructor() {
        super({
            id: "search.action.replace" /* Constants.SearchCommandIds.ReplaceActionId */,
            title: nls.localize2('match.replace.label', 'Replace'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.IsEditableItemKey),
                primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
            },
            icon: searchReplaceIcon,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'search',
                    order: 1,
                },
                {
                    id: MenuId.SearchActionMenu,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.MatchFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'inline',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, context) {
        return performReplace(accessor, context);
    }
});
registerAction2(class ReplaceAllAction extends Action2 {
    constructor() {
        super({
            id: "search.action.replaceAllInFile" /* Constants.SearchCommandIds.ReplaceAllInFileActionId */,
            title: nls.localize2('file.replaceAll.label', 'Replace All'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FileFocusKey, Constants.SearchContext.IsEditableItemKey),
                primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */],
            },
            icon: searchReplaceIcon,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FileFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'search',
                    order: 1,
                },
                {
                    id: MenuId.SearchActionMenu,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FileFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'inline',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, context) {
        return performReplace(accessor, context);
    }
});
registerAction2(class ReplaceAllInFolderAction extends Action2 {
    constructor() {
        super({
            id: "search.action.replaceAllInFolder" /* Constants.SearchCommandIds.ReplaceAllInFolderActionId */,
            title: nls.localize2('file.replaceAll.label', 'Replace All'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FolderFocusKey, Constants.SearchContext.IsEditableItemKey),
                primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 22 /* KeyCode.Digit1 */,
                secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */],
            },
            icon: searchReplaceIcon,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FolderFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'search',
                    order: 1,
                },
                {
                    id: MenuId.SearchActionMenu,
                    when: ContextKeyExpr.and(Constants.SearchContext.ReplaceActiveKey, Constants.SearchContext.FolderFocusKey, Constants.SearchContext.IsEditableItemKey),
                    group: 'inline',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, context) {
        return performReplace(accessor, context);
    }
});
//#endregion
//#region Helpers
async function performReplace(accessor, context) {
    const configurationService = accessor.get(IConfigurationService);
    const viewsService = accessor.get(IViewsService);
    const viewlet = getSearchView(viewsService);
    const viewer = context?.viewer ?? viewlet?.getControl();
    if (!viewer) {
        return;
    }
    const element = context?.element ?? viewer.getFocus()[0];
    // since multiple elements can be selected, we need to check the type of the FolderMatch/FileMatch/Match before we perform the replace.
    const elementsToReplace = getElementsToOperateOn(viewer, element ?? undefined, configurationService.getValue('search'));
    let focusElement = viewer.getFocus()[0];
    if (!focusElement ||
        (focusElement && !arrayContainsElementOrParent(focusElement, elementsToReplace)) ||
        isSearchResult(focusElement)) {
        focusElement = element;
    }
    if (elementsToReplace.length === 0) {
        return;
    }
    let nextFocusElement;
    if (focusElement) {
        nextFocusElement = await getElementToFocusAfterRemoved(viewer, focusElement, elementsToReplace);
    }
    const searchResult = viewlet?.searchResult;
    if (searchResult) {
        await searchResult.batchReplace(elementsToReplace);
    }
    await viewlet?.queueRefreshTree(); // wait for refreshTree to finish
    if (focusElement) {
        if (!nextFocusElement) {
            nextFocusElement = await getLastNodeFromSameType(viewer, focusElement);
        }
        if (nextFocusElement) {
            viewer.reveal(nextFocusElement);
            viewer.setFocus([nextFocusElement], getSelectionKeyboardEvent());
            viewer.setSelection([nextFocusElement], getSelectionKeyboardEvent());
            if (isSearchTreeMatch(nextFocusElement)) {
                const useReplacePreview = configurationService.getValue().search.useReplacePreview;
                if (!useReplacePreview ||
                    hasToOpenFile(accessor, nextFocusElement) ||
                    nextFocusElement instanceof MatchInNotebook) {
                    viewlet?.open(nextFocusElement, true);
                }
                else {
                    accessor.get(IReplaceService).openReplacePreview(nextFocusElement, true);
                }
            }
            else if (isSearchTreeFileMatch(nextFocusElement)) {
                viewlet?.open(nextFocusElement, true);
            }
        }
    }
    viewer.domFocus();
}
function hasToOpenFile(accessor, currBottomElem) {
    if (!isSearchTreeMatch(currBottomElem)) {
        return false;
    }
    const activeEditor = accessor.get(IEditorService).activeEditor;
    const file = activeEditor?.resource;
    if (file) {
        return accessor.get(IUriIdentityService).extUri.isEqual(file, currBottomElem.parent().resource);
    }
    return false;
}
function compareLevels(elem1, elem2) {
    if (isSearchTreeMatch(elem1)) {
        if (isSearchTreeMatch(elem2)) {
            return 0;
        }
        else {
            return -1;
        }
    }
    else if (isSearchTreeFileMatch(elem1)) {
        if (isSearchTreeMatch(elem2)) {
            return 1;
        }
        else if (isSearchTreeFileMatch(elem2)) {
            return 0;
        }
        else {
            return -1;
        }
    }
    else if (isSearchTreeFolderMatch(elem1)) {
        if (isTextSearchHeading(elem2)) {
            return -1;
        }
        else if (isSearchTreeFolderMatch(elem2)) {
            return 0;
        }
        else {
            return 1;
        }
    }
    else {
        if (isTextSearchHeading(elem2)) {
            return 0;
        }
        else {
            return 1;
        }
    }
}
/**
 * Returns element to focus after removing the given element
 */
export async function getElementToFocusAfterRemoved(viewer, element, elementsToRemove) {
    const navigator = viewer.navigate(element);
    if (isSearchTreeFolderMatch(element)) {
        while (!!navigator.next() &&
            (!isSearchTreeFolderMatch(navigator.current()) ||
                arrayContainsElementOrParent(navigator.current(), elementsToRemove))) { }
    }
    else if (isSearchTreeFileMatch(element)) {
        while (!!navigator.next() &&
            (!isSearchTreeFileMatch(navigator.current()) ||
                arrayContainsElementOrParent(navigator.current(), elementsToRemove))) {
            // Never expand AI search results by default
            if (navigator.current() instanceof AITextSearchHeadingImpl) {
                return navigator.current();
            }
            await viewer.expand(navigator.current());
        }
    }
    else {
        while (navigator.next() &&
            (!isSearchTreeMatch(navigator.current()) ||
                arrayContainsElementOrParent(navigator.current(), elementsToRemove))) {
            // Never expand AI search results by default
            if (navigator.current() instanceof AITextSearchHeadingImpl) {
                return navigator.current();
            }
            await viewer.expand(navigator.current());
        }
    }
    return navigator.current();
}
/***
 * Finds the last element in the tree with the same type as `element`
 */
export async function getLastNodeFromSameType(viewer, element) {
    let lastElem = viewer.lastVisibleElement ?? null;
    while (lastElem) {
        const compareVal = compareLevels(element, lastElem);
        if (compareVal === -1) {
            const expanded = await viewer.expand(lastElem);
            if (!expanded) {
                return lastElem;
            }
            lastElem = viewer.lastVisibleElement;
        }
        else if (compareVal === 1) {
            const potentialLastElem = viewer.getParentElement(lastElem);
            if (isSearchResult(potentialLastElem)) {
                break;
            }
            else {
                lastElem = potentialLastElem;
            }
        }
        else {
            return lastElem;
        }
    }
    return undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1JlbW92ZVJlcGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zUmVtb3ZlUmVwbGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFDTix5QkFBeUIsR0FFekIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFdEUsT0FBTyxLQUFLLFNBQVMsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUtqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHakcsT0FBTyxFQUNOLFFBQVEsRUFDUixzQkFBc0IsRUFDdEIsYUFBYSxFQUNiLGFBQWEsR0FDYixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sNEJBQTRCLEVBRzVCLHFCQUFxQixFQUNyQix1QkFBdUIs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