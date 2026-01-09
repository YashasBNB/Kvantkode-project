/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { WorkbenchListFocusContextKey, } from '../../../../platform/list/browser/listService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { searchClearIcon, searchCollapseAllIcon, searchExpandAllIcon, searchRefreshIcon, searchShowAsList, searchShowAsTree, searchStopIcon, } from './searchIcons.js';
import * as Constants from '../common/constants.js';
import { ISearchHistoryService } from '../common/searchHistoryService.js';
import { VIEW_ID } from '../../../services/search/common/search.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SearchStateKey, SearchUIState } from '../common/search.js';
import { category, getSearchView } from './searchActionsBase.js';
import { isSearchTreeMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchNoRoot, isSearchTreeFolderMatchWorkspaceRoot, isSearchResult, isTextSearchHeading, isSearchTreeFileMatch, } from './searchTreeModel/searchTreeCommon.js';
//#region Actions
registerAction2(class ClearSearchHistoryCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.clearHistory" /* Constants.SearchCommandIds.ClearSearchHistoryCommandId */,
            title: nls.localize2('clearSearchHistoryLabel', 'Clear Search History'),
            category,
            f1: true,
        });
    }
    async run(accessor) {
        clearHistoryCommand(accessor);
    }
});
registerAction2(class CancelSearchAction extends Action2 {
    constructor() {
        super({
            id: "search.action.cancel" /* Constants.SearchCommandIds.CancelSearchActionId */,
            title: nls.localize2('CancelSearchAction.label', 'Cancel Search'),
            icon: searchStopIcon,
            category,
            f1: true,
            precondition: SearchStateKey.isEqualTo(SearchUIState.Idle).negate(),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, WorkbenchListFocusContextKey),
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), SearchStateKey.isEqualTo(SearchUIState.SlowSearch)),
                },
            ],
        });
    }
    run(accessor) {
        return cancelSearch(accessor);
    }
});
registerAction2(class RefreshAction extends Action2 {
    constructor() {
        super({
            id: "search.action.refreshSearchResults" /* Constants.SearchCommandIds.RefreshSearchResultsActionId */,
            title: nls.localize2('RefreshAction.label', 'Refresh'),
            icon: searchRefreshIcon,
            precondition: Constants.SearchContext.ViewHasSearchPatternKey,
            category,
            f1: true,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), SearchStateKey.isEqualTo(SearchUIState.SlowSearch).negate()),
                },
            ],
        });
    }
    run(accessor, ...args) {
        return refreshSearch(accessor);
    }
});
registerAction2(class CollapseDeepestExpandedLevelAction extends Action2 {
    constructor() {
        super({
            id: "search.action.collapseSearchResults" /* Constants.SearchCommandIds.CollapseSearchResultsActionId */,
            title: nls.localize2('CollapseDeepestExpandedLevelAction.label', 'Collapse All'),
            category,
            icon: searchCollapseAllIcon,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSomeCollapsibleKey),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), ContextKeyExpr.or(Constants.SearchContext.HasSearchResults.negate(), Constants.SearchContext.ViewHasSomeCollapsibleKey)),
                },
            ],
        });
    }
    run(accessor, ...args) {
        return collapseDeepestExpandedLevel(accessor);
    }
});
registerAction2(class ExpandAllAction extends Action2 {
    constructor() {
        super({
            id: "search.action.expandSearchResults" /* Constants.SearchCommandIds.ExpandSearchResultsActionId */,
            title: nls.localize2('ExpandAllAction.label', 'Expand All'),
            category,
            icon: searchExpandAllIcon,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSomeCollapsibleKey.toNegated()),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSomeCollapsibleKey.toNegated()),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        return expandAll(accessor);
    }
});
registerAction2(class ClearSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.clearSearchResults" /* Constants.SearchCommandIds.ClearSearchResultsActionId */,
            title: nls.localize2('ClearSearchResultsAction.label', 'Clear Search Results'),
            category,
            icon: searchClearIcon,
            f1: true,
            precondition: ContextKeyExpr.or(Constants.SearchContext.HasSearchResults, Constants.SearchContext.ViewHasSearchPatternKey, Constants.SearchContext.ViewHasReplacePatternKey, Constants.SearchContext.ViewHasFilePatternKey),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 1,
                    when: ContextKeyExpr.equals('view', VIEW_ID),
                },
            ],
        });
    }
    run(accessor, ...args) {
        return clearSearchResults(accessor);
    }
});
registerAction2(class ViewAsTreeAction extends Action2 {
    constructor() {
        super({
            id: "search.action.viewAsTree" /* Constants.SearchCommandIds.ViewAsTreeActionId */,
            title: nls.localize2('ViewAsTreeAction.label', 'View as Tree'),
            category,
            icon: searchShowAsList,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.InTreeViewKey.toNegated()),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), Constants.SearchContext.InTreeViewKey.toNegated()),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            await searchView.setTreeView(true);
        }
    }
});
registerAction2(class ViewAsListAction extends Action2 {
    constructor() {
        super({
            id: "search.action.viewAsList" /* Constants.SearchCommandIds.ViewAsListActionId */,
            title: nls.localize2('ViewAsListAction.label', 'View as List'),
            category,
            icon: searchShowAsTree,
            f1: true,
            precondition: ContextKeyExpr.and(Constants.SearchContext.HasSearchResults, Constants.SearchContext.InTreeViewKey),
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', VIEW_ID), Constants.SearchContext.InTreeViewKey),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            await searchView.setTreeView(false);
        }
    }
});
registerAction2(class SearchWithAIAction extends Action2 {
    constructor() {
        super({
            id: "search.action.searchWithAI" /* Constants.SearchCommandIds.SearchWithAIActionId */,
            title: nls.localize2('SearchWithAIAction.label', 'Search with AI'),
            category,
            f1: true,
            precondition: Constants.SearchContext.hasAIResultProvider,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.hasAIResultProvider, Constants.SearchContext.SearchViewFocusedKey),
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
            },
        });
    }
    async run(accessor, ...args) {
        const searchView = getSearchView(accessor.get(IViewsService));
        if (searchView) {
            const viewer = searchView.getControl();
            searchView.model.searchResult.aiTextSearchResult.hidden = false;
            searchView.model.cancelAISearch(true);
            searchView.model.clearAiSearchResults();
            await searchView.queueRefreshTree();
            await forcedExpandRecursively(viewer, searchView.model.searchResult.aiTextSearchResult);
        }
    }
});
//#endregion
//#region Helpers
const clearHistoryCommand = (accessor) => {
    const searchHistoryService = accessor.get(ISearchHistoryService);
    searchHistoryService.clearHistory();
};
async function expandAll(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const viewer = searchView.getControl();
        if (searchView.shouldShowAIResults()) {
            if (searchView.model.hasAIResults) {
                await forcedExpandRecursively(viewer, undefined);
            }
            else {
                await forcedExpandRecursively(viewer, searchView.model.searchResult.plainTextSearchResult);
            }
        }
        else {
            await forcedExpandRecursively(viewer, undefined);
        }
    }
}
/**
 * Recursively expand all nodes in the search results tree that are a child of `element`
 * If `element` is not provided, it is the root node.
 */
export async function forcedExpandRecursively(viewer, element) {
    if (element) {
        if (!viewer.hasNode(element)) {
            return;
        }
        await viewer.expand(element, true);
    }
    const children = viewer.getNode(element)?.children;
    if (children) {
        for (const child of children) {
            if (isSearchResult(child.element)) {
                throw Error('SearchResult should not be a child of a RenderableMatch');
            }
            forcedExpandRecursively(viewer, child.element);
        }
    }
}
function clearSearchResults(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    searchView?.clearSearchResults();
}
function cancelSearch(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    searchView?.cancelSearch();
}
function refreshSearch(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    searchView?.triggerQueryChange({
        preserveFocus: false,
        shouldUpdateAISearch: !searchView.model.searchResult.aiTextSearchResult.hidden,
    });
}
function collapseDeepestExpandedLevel(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const viewer = searchView.getControl();
        /**
         * one level to collapse so collapse everything. If FolderMatch, check if there are visible grandchildren,
         * i.e. if Matches are returned by the navigator, and if so, collapse to them, otherwise collapse all levels.
         */
        const navigator = viewer.navigate();
        let node = navigator.first();
        let canCollapseFileMatchLevel = false;
        let canCollapseFirstLevel = false;
        do {
            node = navigator.next();
        } while (isTextSearchHeading(node));
        // go to the first non-TextSearchResult node
        if (isSearchTreeFolderMatchWorkspaceRoot(node) || searchView.isTreeLayoutViewVisible) {
            while ((node = navigator.next())) {
                if (isTextSearchHeading(node)) {
                    continue;
                }
                if (isSearchTreeMatch(node)) {
                    canCollapseFileMatchLevel = true;
                    break;
                }
                if (searchView.isTreeLayoutViewVisible && !canCollapseFirstLevel) {
                    let nodeToTest = node;
                    if (isSearchTreeFolderMatch(node)) {
                        const compressionStartNode = viewer.getCompressedTreeNode(node)?.elements[0].element;
                        // Match elements should never be compressed, so `!(compressionStartNode instanceof Match)` should always be true here. Same with `!(compressionStartNode instanceof TextSearchResult)`
                        nodeToTest =
                            compressionStartNode &&
                                !isSearchTreeMatch(compressionStartNode) &&
                                !isTextSearchHeading(compressionStartNode) &&
                                !isSearchResult(compressionStartNode)
                                ? compressionStartNode
                                : node;
                    }
                    const immediateParent = nodeToTest.parent();
                    if (!(isTextSearchHeading(immediateParent) ||
                        isSearchTreeFolderMatchWorkspaceRoot(immediateParent) ||
                        isSearchTreeFolderMatchNoRoot(immediateParent) ||
                        isSearchResult(immediateParent))) {
                        canCollapseFirstLevel = true;
                    }
                }
            }
        }
        if (canCollapseFileMatchLevel) {
            node = navigator.first();
            do {
                if (isSearchTreeFileMatch(node)) {
                    viewer.collapse(node);
                }
            } while ((node = navigator.next()));
        }
        else if (canCollapseFirstLevel) {
            node = navigator.first();
            if (node) {
                do {
                    let nodeToTest = node;
                    if (isSearchTreeFolderMatch(node)) {
                        const compressionStartNode = viewer.getCompressedTreeNode(node)?.elements[0].element;
                        // Match elements should never be compressed, so !(compressionStartNode instanceof Match) should always be true here
                        nodeToTest =
                            compressionStartNode &&
                                !isSearchTreeMatch(compressionStartNode) &&
                                !isSearchResult(compressionStartNode)
                                ? compressionStartNode
                                : node;
                    }
                    const immediateParent = nodeToTest.parent();
                    if (isSearchTreeFolderMatchWorkspaceRoot(immediateParent) ||
                        isSearchTreeFolderMatchNoRoot(immediateParent)) {
                        if (viewer.hasNode(node)) {
                            viewer.collapse(node, true);
                        }
                        else {
                            viewer.collapseAll();
                        }
                    }
                } while ((node = navigator.next()));
            }
        }
        else if (isTextSearchHeading(navigator.first())) {
            // if AI results are visible, just collapse everything under the TextSearchResult.
            node = navigator.first();
            do {
                if (!node) {
                    break;
                }
                if (isTextSearchHeading(viewer.getParentElement(node))) {
                    viewer.collapse(node);
                }
            } while ((node = navigator.next()));
        }
        else {
            viewer.collapseAll();
        }
        const firstFocusParent = viewer.getFocus()[0]?.parent();
        if (firstFocusParent &&
            (isSearchTreeFolderMatch(firstFocusParent) || isSearchTreeFileMatch(firstFocusParent)) &&
            viewer.hasNode(firstFocusParent) &&
            viewer.isCollapsed(firstFocusParent)) {
            viewer.domFocus();
            viewer.focusFirst();
            viewer.setSelection(viewer.getFocus());
        }
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1RvcEJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoQWN0aW9uc1RvcEJhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE9BQU8sRUFFTiw0QkFBNEIsR0FDNUIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLGNBQWMsR0FDZCxNQUFNLGtCQUFrQixDQUFBO0FBQ3pCLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0JBQXdCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDaEUsT0FBTyxFQUNOLGlCQUFpQixFQUdqQix1QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLG9DQUFvQyxFQUNwQyxjQUFjLEVBQ2Qs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