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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1JlbW92ZVJlcGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNSZW1vdmVSZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUNOLHlCQUF5QixHQUV6QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV0RSxPQUFPLEtBQUssU0FBUyxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBS2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdqRyxPQUFPLEVBQ04sUUFBUSxFQUNSLHNCQUFzQixFQUN0QixhQUFhLEVBQ2IsYUFBYSxHQUNiLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFDTiw0QkFBNEIsRUFH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