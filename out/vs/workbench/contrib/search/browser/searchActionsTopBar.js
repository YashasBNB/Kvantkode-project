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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1RvcEJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNUb3BCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBRU4sNEJBQTRCLEdBQzVCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEVBQ3JCLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixjQUFjLEdBQ2QsTUFBTSxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEtBQUssU0FBUyxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hFLE9BQU8sRUFDTixpQkFBaUIsRUFHakIsdUJBQXVCLEVBQ3ZCLDZCQUE2QixFQUM3QixvQ0FBb0MsRUFDcEMsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixxQkFBcUIsR0FD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