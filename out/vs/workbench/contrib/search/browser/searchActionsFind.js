/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { dirname } from '../../../../base/common/resources.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IListService, } from '../../../../platform/list/browser/listService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import * as Constants from '../common/constants.js';
import * as SearchEditorConstants from '../../searchEditor/browser/constants.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { resolveResourcesForSearchIncludes } from '../../../services/search/common/queryBuilder.js';
import { getMultiSelectedResources, IExplorerService } from '../../files/browser/files.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ExplorerFolderContext, ExplorerRootContext, FilesExplorerFocusCondition, VIEWLET_ID as VIEWLET_ID_FILES, } from '../../files/common/files.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { category, getElementsToOperateOn, getSearchView, openSearchView, } from './searchActionsBase.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { Schemas } from '../../../../base/common/network.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { forcedExpandRecursively } from './searchActionsTopBar.js';
import { isSearchTreeFileMatch, isSearchTreeMatch, } from './searchTreeModel/searchTreeCommon.js';
//#endregion
registerAction2(class RestrictSearchToFolderAction extends Action2 {
    constructor() {
        super({
            id: "search.action.restrictSearchToFolder" /* Constants.SearchCommandIds.RestrictSearchToFolderId */,
            title: nls.localize2('restrictResultsToFolder', 'Restrict Search to Folder'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(Constants.SearchContext.SearchViewVisibleKey, Constants.SearchContext.ResourceFolderFocusKey),
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
            },
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'search',
                    order: 3,
                    when: ContextKeyExpr.and(Constants.SearchContext.ResourceFolderFocusKey),
                },
            ],
        });
    }
    async run(accessor, folderMatch) {
        await searchWithFolderCommand(accessor, false, true, undefined, folderMatch);
    }
});
registerAction2(class ExpandSelectedTreeCommandAction extends Action2 {
    constructor() {
        super({
            id: "search.action.expandRecursively" /* Constants.SearchCommandIds.ExpandRecursivelyCommandId */,
            title: nls.localize('search.expandRecursively', 'Expand Recursively'),
            category,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.FolderFocusKey, Constants.SearchContext.HasSearchResults),
                    group: 'search',
                    order: 4,
                },
            ],
        });
    }
    async run(accessor) {
        return expandSelectSubtree(accessor);
    }
});
registerAction2(class ExcludeFolderFromSearchAction extends Action2 {
    constructor() {
        super({
            id: "search.action.excludeFromSearch" /* Constants.SearchCommandIds.ExcludeFolderFromSearchId */,
            title: nls.localize2('excludeFolderFromSearch', 'Exclude Folder from Search'),
            category,
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'search',
                    order: 4,
                    when: ContextKeyExpr.and(Constants.SearchContext.ResourceFolderFocusKey),
                },
            ],
        });
    }
    async run(accessor, folderMatch) {
        await searchWithFolderCommand(accessor, false, false, undefined, folderMatch);
    }
});
registerAction2(class RevealInSideBarForSearchResultsAction extends Action2 {
    constructor() {
        super({
            id: "search.action.revealInSideBar" /* Constants.SearchCommandIds.RevealInSideBarForSearchResults */,
            title: nls.localize2('revealInSideBar', 'Reveal in Explorer View'),
            category,
            menu: [
                {
                    id: MenuId.SearchContext,
                    when: ContextKeyExpr.and(Constants.SearchContext.FileFocusKey, Constants.SearchContext.HasSearchResults),
                    group: 'search_3',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, args) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const explorerService = accessor.get(IExplorerService);
        const contextService = accessor.get(IWorkspaceContextService);
        const searchView = getSearchView(accessor.get(IViewsService));
        if (!searchView) {
            return;
        }
        let fileMatch;
        if (isSearchTreeFileMatch(args)) {
            fileMatch = args;
        }
        else {
            args = searchView.getControl().getFocus()[0];
            return;
        }
        paneCompositeService
            .openPaneComposite(VIEWLET_ID_FILES, 0 /* ViewContainerLocation.Sidebar */, false)
            .then((viewlet) => {
            if (!viewlet) {
                return;
            }
            const explorerViewContainer = viewlet.getViewPaneContainer();
            const uri = fileMatch.resource;
            if (uri && contextService.isInsideWorkspace(uri)) {
                const explorerView = explorerViewContainer.getExplorerView();
                explorerView.setExpanded(true);
                explorerService.select(uri, true).then(() => explorerView.focus(), onUnexpectedError);
            }
        });
    }
});
// Find in Files by default is the same as View: Show Search, but can be configured to open a search editor instead with the `search.mode` binding
registerAction2(class FindInFilesAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.findInFiles" /* Constants.SearchCommandIds.FindInFilesActionId */,
            title: {
                ...nls.localize2('findInFiles', 'Find in Files'),
                mnemonicTitle: nls.localize({ key: 'miFindInFiles', comment: ['&& denotes a mnemonic'] }, 'Find &&in Files'),
            },
            metadata: {
                description: nls.localize('findInFiles.description', 'Open a workspace search'),
                args: [
                    {
                        name: nls.localize('findInFiles.args', 'A set of options for the search'),
                        schema: {
                            type: 'object',
                            properties: {
                                query: { type: 'string' },
                                replace: { type: 'string' },
                                preserveCase: { type: 'boolean' },
                                triggerSearch: { type: 'boolean' },
                                filesToInclude: { type: 'string' },
                                filesToExclude: { type: 'string' },
                                isRegex: { type: 'boolean' },
                                isCaseSensitive: { type: 'boolean' },
                                matchWholeWord: { type: 'boolean' },
                                useExcludeSettingsAndIgnoreFiles: { type: 'boolean' },
                                onlyOpenEditors: { type: 'boolean' },
                                showIncludesExcludes: { type: 'boolean' },
                            },
                        },
                    },
                ],
            },
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            },
            menu: [
                {
                    id: MenuId.MenubarEditMenu,
                    group: '4_find_global',
                    order: 1,
                },
            ],
            f1: true,
        });
    }
    async run(accessor, args = {}) {
        findInFilesCommand(accessor, args);
    }
});
registerAction2(class FindInFolderAction extends Action2 {
    // from explorer
    constructor() {
        super({
            id: "filesExplorer.findInFolder" /* Constants.SearchCommandIds.FindInFolderId */,
            title: nls.localize2('findInFolder', 'Find in Folder...'),
            category,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext),
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
            },
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    group: '4_search',
                    order: 10,
                    when: ContextKeyExpr.and(ExplorerFolderContext),
                },
            ],
        });
    }
    async run(accessor, resource) {
        await searchWithFolderCommand(accessor, true, true, resource);
    }
});
registerAction2(class FindInWorkspaceAction extends Action2 {
    // from explorer
    constructor() {
        super({
            id: "filesExplorer.findInWorkspace" /* Constants.SearchCommandIds.FindInWorkspaceId */,
            title: nls.localize2('findInWorkspace', 'Find in Workspace...'),
            category,
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    group: '4_search',
                    order: 10,
                    when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext.toNegated()),
                },
            ],
        });
    }
    async run(accessor) {
        const searchConfig = accessor
            .get(IConfigurationService)
            .getValue().search;
        const mode = searchConfig.mode;
        if (mode === 'view') {
            const searchView = await openSearchView(accessor.get(IViewsService), true);
            searchView?.searchInFolders();
        }
        else {
            return accessor
                .get(ICommandService)
                .executeCommand(SearchEditorConstants.OpenEditorCommandId, {
                location: mode === 'newEditor' ? 'new' : 'reuse',
                filesToInclude: '',
            });
        }
    }
});
//#region Helpers
async function expandSelectSubtree(accessor) {
    const viewsService = accessor.get(IViewsService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        const viewer = searchView.getControl();
        const selected = viewer.getFocus()[0];
        await forcedExpandRecursively(viewer, selected);
    }
}
async function searchWithFolderCommand(accessor, isFromExplorer, isIncludes, resource, folderMatch) {
    const fileService = accessor.get(IFileService);
    const viewsService = accessor.get(IViewsService);
    const contextService = accessor.get(IWorkspaceContextService);
    const commandService = accessor.get(ICommandService);
    const searchConfig = accessor.get(IConfigurationService).getValue().search;
    const mode = searchConfig.mode;
    let resources;
    if (isFromExplorer) {
        resources = getMultiSelectedResources(resource, accessor.get(IListService), accessor.get(IEditorService), accessor.get(IEditorGroupsService), accessor.get(IExplorerService));
    }
    else {
        const searchView = getSearchView(viewsService);
        if (!searchView) {
            return;
        }
        resources = getMultiSelectedSearchResources(searchView.getControl(), folderMatch, searchConfig);
    }
    const resolvedResources = fileService
        .resolveAll(resources.map((resource) => ({ resource })))
        .then((results) => {
        const folders = [];
        results.forEach((result) => {
            if (result.success && result.stat) {
                folders.push(result.stat.isDirectory ? result.stat.resource : dirname(result.stat.resource));
            }
        });
        return resolveResourcesForSearchIncludes(folders, contextService);
    });
    if (mode === 'view') {
        const searchView = await openSearchView(viewsService, true);
        if (resources && resources.length && searchView) {
            if (isIncludes) {
                searchView.searchInFolders(await resolvedResources);
            }
            else {
                searchView.searchOutsideOfFolders(await resolvedResources);
            }
        }
        return undefined;
    }
    else {
        if (isIncludes) {
            return commandService.executeCommand(SearchEditorConstants.OpenEditorCommandId, {
                filesToInclude: (await resolvedResources).join(', '),
                showIncludesExcludes: true,
                location: mode === 'newEditor' ? 'new' : 'reuse',
            });
        }
        else {
            return commandService.executeCommand(SearchEditorConstants.OpenEditorCommandId, {
                filesToExclude: (await resolvedResources).join(', '),
                showIncludesExcludes: true,
                location: mode === 'newEditor' ? 'new' : 'reuse',
            });
        }
    }
}
function getMultiSelectedSearchResources(viewer, currElement, sortConfig) {
    return getElementsToOperateOn(viewer, currElement, sortConfig)
        .map((renderableMatch) => isSearchTreeMatch(renderableMatch) ? null : renderableMatch.resource)
        .filter((renderableMatch) => renderableMatch !== null);
}
export async function findInFilesCommand(accessor, _args = {}) {
    const searchConfig = accessor.get(IConfigurationService).getValue().search;
    const viewsService = accessor.get(IViewsService);
    const commandService = accessor.get(ICommandService);
    const args = {};
    if (Object.keys(_args).length !== 0) {
        // resolve variables in the same way as in
        // https://github.com/microsoft/vscode/blob/8b76efe9d317d50cb5b57a7658e09ce6ebffaf36/src/vs/workbench/contrib/searchEditor/browser/searchEditorActions.ts#L152-L158
        const configurationResolverService = accessor.get(IConfigurationResolverService);
        const historyService = accessor.get(IHistoryService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot();
        const filteredActiveWorkspaceRootUri = activeWorkspaceRootUri?.scheme === Schemas.file ||
            activeWorkspaceRootUri?.scheme === Schemas.vscodeRemote
            ? activeWorkspaceRootUri
            : undefined;
        const lastActiveWorkspaceRoot = filteredActiveWorkspaceRootUri
            ? (workspaceContextService.getWorkspaceFolder(filteredActiveWorkspaceRootUri) ?? undefined)
            : undefined;
        for (const entry of Object.entries(_args)) {
            const name = entry[0];
            const value = entry[1];
            if (value !== undefined) {
                ;
                args[name] =
                    typeof value === 'string'
                        ? await configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, value)
                        : value;
            }
        }
    }
    const mode = searchConfig.mode;
    if (mode === 'view') {
        openSearchView(viewsService, false).then((openedView) => {
            if (openedView) {
                const searchAndReplaceWidget = openedView.searchAndReplaceWidget;
                searchAndReplaceWidget.toggleReplace(typeof args.replace === 'string');
                let updatedText = false;
                if (typeof args.query !== 'string') {
                    updatedText = openedView.updateTextFromFindWidgetOrSelection({
                        allowUnselectedWord: typeof args.replace !== 'string',
                    });
                }
                openedView.setSearchParameters(args);
                if (typeof args.showIncludesExcludes === 'boolean') {
                    openedView.toggleQueryDetails(false, args.showIncludesExcludes);
                }
                openedView.searchAndReplaceWidget.focus(undefined, updatedText, updatedText);
            }
        });
    }
    else {
        const convertArgs = (args) => ({
            location: mode === 'newEditor' ? 'new' : 'reuse',
            query: args.query,
            filesToInclude: args.filesToInclude,
            filesToExclude: args.filesToExclude,
            matchWholeWord: args.matchWholeWord,
            isCaseSensitive: args.isCaseSensitive,
            isRegexp: args.isRegex,
            useExcludeSettingsAndIgnoreFiles: args.useExcludeSettingsAndIgnoreFiles,
            onlyOpenEditors: args.onlyOpenEditors,
            showIncludesExcludes: !!(args.filesToExclude ||
                args.filesToExclude ||
                !args.useExcludeSettingsAndIgnoreFiles),
        });
        commandService.executeCommand(SearchEditorConstants.OpenEditorCommandId, convertArgs(args));
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc0ZpbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hBY3Rpb25zRmluZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUNOLFlBQVksR0FFWixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEtBQUssU0FBUyxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sS0FBSyxxQkFBcUIsTUFBTSx5Q0FBeUMsQ0FBQTtBQU9oRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHakcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsbUJBQW1CLEVBQ25CLDJCQUEyQixFQUMzQixVQUFV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