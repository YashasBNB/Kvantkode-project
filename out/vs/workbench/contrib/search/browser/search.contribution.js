/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as platform from '../../../../base/common/platform.js';
import { AbstractGotoLineQuickAccessProvider } from '../../../../editor/contrib/quickAccess/browser/gotoLineQuickAccess.js';
import * as nls from '../../../../nls.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Extensions as QuickAccessExtensions, } from '../../../../platform/quickinput/common/quickAccess.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { defaultQuickAccessContextKeyValue } from '../../../browser/quickaccess.js';
import { Extensions as ViewExtensions, } from '../../../common/views.js';
import { GotoSymbolQuickAccessProvider } from '../../codeEditor/browser/quickaccess/gotoSymbolQuickAccess.js';
import { AnythingQuickAccessProvider } from './anythingQuickAccess.js';
import { registerContributions as replaceContributions } from './replaceContributions.js';
import { registerContributions as notebookSearchContributions } from './notebookSearch/notebookSearchContributions.js';
import { searchViewIcon } from './searchIcons.js';
import { SearchView } from './searchView.js';
import { registerContributions as searchWidgetContributions } from './searchWidget.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { ISearchHistoryService, SearchHistoryService } from '../common/searchHistoryService.js';
import { SearchViewModelWorkbenchService } from './searchTreeModel/searchModel.js';
import { ISearchViewModelWorkbenchService } from './searchTreeModel/searchViewModelWorkbenchService.js';
import { SEARCH_EXCLUDE_CONFIG, VIEWLET_ID, VIEW_ID, DEFAULT_MAX_SEARCH_RESULTS, } from '../../../services/search/common/search.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { getWorkspaceSymbols } from '../common/search.js';
import './searchActionsCopy.js';
import './searchActionsFind.js';
import './searchActionsNav.js';
import './searchActionsRemoveReplace.js';
import './searchActionsSymbol.js';
import './searchActionsTopBar.js';
import './searchActionsTextQuickAccess.js';
import { TEXT_SEARCH_QUICK_ACCESS_PREFIX, TextSearchQuickAccess, } from './quickTextSearch/textSearchQuickAccess.js';
import { Extensions } from '../../../common/configuration.js';
registerSingleton(ISearchViewModelWorkbenchService, SearchViewModelWorkbenchService, 1 /* InstantiationType.Delayed */);
registerSingleton(ISearchHistoryService, SearchHistoryService, 1 /* InstantiationType.Delayed */);
replaceContributions();
notebookSearchContributions();
searchWidgetContributions();
const SEARCH_MODE_CONFIG = 'search.mode';
const viewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: VIEWLET_ID,
    title: nls.localize2('search', 'Search'),
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
        VIEWLET_ID,
        { mergeViewWithContainerWhenSingleView: true },
    ]),
    hideIfEmpty: true,
    icon: searchViewIcon,
    order: 1,
}, 0 /* ViewContainerLocation.Sidebar */, { doNotRegisterOpenCommand: true });
const viewDescriptor = {
    id: VIEW_ID,
    containerIcon: searchViewIcon,
    name: nls.localize2('search', 'Search'),
    ctorDescriptor: new SyncDescriptor(SearchView),
    canToggleVisibility: false,
    canMoveView: true,
    openCommandActionDescriptor: {
        id: viewContainer.id,
        mnemonicTitle: nls.localize({ key: 'miViewSearch', comment: ['&& denotes a mnemonic'] }, '&&Search'),
        keybindings: {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            // Yes, this is weird. See #116188, #115556, #115511, and now #124146, for examples of what can go wrong here.
            when: ContextKeyExpr.regex('neverMatch', /doesNotMatch/),
        },
        order: 1,
    },
};
// Register search default location to sidebar
Registry.as(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);
// Register Quick Access Handler
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
quickAccessRegistry.registerQuickAccessProvider({
    ctor: AnythingQuickAccessProvider,
    prefix: AnythingQuickAccessProvider.PREFIX,
    placeholder: nls.localize('anythingQuickAccessPlaceholder', 'Search files by name (append {0} to go to line or {1} to go to symbol)', AbstractGotoLineQuickAccessProvider.PREFIX, GotoSymbolQuickAccessProvider.PREFIX),
    contextKey: defaultQuickAccessContextKeyValue,
    helpEntries: [
        {
            description: nls.localize('anythingQuickAccess', 'Go to File'),
            commandId: 'workbench.action.quickOpen',
            commandCenterOrder: 10,
        },
    ],
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: SymbolsQuickAccessProvider,
    prefix: SymbolsQuickAccessProvider.PREFIX,
    placeholder: nls.localize('symbolsQuickAccessPlaceholder', 'Type the name of a symbol to open.'),
    contextKey: 'inWorkspaceSymbolsPicker',
    helpEntries: [
        {
            description: nls.localize('symbolsQuickAccess', 'Go to Symbol in Workspace'),
            commandId: "workbench.action.showAllSymbols" /* Constants.SearchCommandIds.ShowAllSymbolsActionId */,
        },
    ],
});
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TextSearchQuickAccess,
    prefix: TEXT_SEARCH_QUICK_ACCESS_PREFIX,
    contextKey: 'inTextSearchPicker',
    placeholder: nls.localize('textSearchPickerPlaceholder', 'Search for text in your workspace files.'),
    helpEntries: [
        {
            description: nls.localize('textSearchPickerHelp', 'Search for Text'),
            commandId: "workbench.action.quickTextSearch" /* Constants.SearchCommandIds.QuickTextSearchActionId */,
            commandCenterOrder: 25,
        },
    ],
});
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'search',
    order: 13,
    title: nls.localize('searchConfigurationTitle', 'Search'),
    type: 'object',
    properties: {
        [SEARCH_EXCLUDE_CONFIG]: {
            type: 'object',
            markdownDescription: nls.localize('exclude', 'Configure [glob patterns](https://code.visualstudio.com/docs/editor/codebasics#_advanced-search-options) for excluding files and folders in fulltext searches and file search in quick open. To exclude files from the recently opened list in quick open, patterns must be absolute (for example `**/node_modules/**`). Inherits all glob patterns from the `#files.exclude#` setting.'),
            default: { '**/node_modules': true, '**/bower_components': true, '**/*.code-search': true },
            additionalProperties: {
                anyOf: [
                    {
                        type: 'boolean',
                        description: nls.localize('exclude.boolean', 'The glob pattern to match file paths against. Set to true or false to enable or disable the pattern.'),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                markdownDescription: nls.localize({ key: 'exclude.when', comment: ['\\$(basename) should not be translated'] }, 'Additional check on the siblings of a matching file. Use \\$(basename) as variable for the matching file name.'),
                            },
                        },
                    },
                ],
            },
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        [SEARCH_MODE_CONFIG]: {
            type: 'string',
            enum: ['view', 'reuseEditor', 'newEditor'],
            default: 'view',
            markdownDescription: nls.localize('search.mode', 'Controls where new `Search: Find in Files` and `Find in Folder` operations occur: either in the search view, or in a search editor.'),
            enumDescriptions: [
                nls.localize('search.mode.view', 'Search in the search view, either in the panel or side bars.'),
                nls.localize('search.mode.reuseEditor', 'Search in an existing search editor if present, otherwise in a new search editor.'),
                nls.localize('search.mode.newEditor', 'Search in a new search editor.'),
            ],
        },
        'search.useRipgrep': {
            type: 'boolean',
            description: nls.localize('useRipgrep', 'This setting is deprecated and now falls back on "search.usePCRE2".'),
            deprecationMessage: nls.localize('useRipgrepDeprecated', 'Deprecated. Consider "search.usePCRE2" for advanced regex feature support.'),
            default: true,
        },
        'search.maintainFileSearchCache': {
            type: 'boolean',
            deprecationMessage: nls.localize('maintainFileSearchCacheDeprecated', 'The search cache is kept in the extension host which never shuts down, so this setting is no longer needed.'),
            description: nls.localize('search.maintainFileSearchCache', 'When enabled, the searchService process will be kept alive instead of being shut down after an hour of inactivity. This will keep the file search cache in memory.'),
            default: false,
        },
        'search.useIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize('useIgnoreFiles', 'Controls whether to use `.gitignore` and `.ignore` files when searching for files.'),
            default: true,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        'search.useGlobalIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize('useGlobalIgnoreFiles', 'Controls whether to use your global gitignore file (for example, from `$HOME/.config/git/ignore`) when searching for files. Requires {0} to be enabled.', '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        'search.useParentIgnoreFiles': {
            type: 'boolean',
            markdownDescription: nls.localize('useParentIgnoreFiles', 'Controls whether to use `.gitignore` and `.ignore` files in parent directories when searching for files. Requires {0} to be enabled.', '`#search.useIgnoreFiles#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */,
        },
        'search.quickOpen.includeSymbols': {
            type: 'boolean',
            description: nls.localize('search.quickOpen.includeSymbols', 'Whether to include results from a global symbol search in the file results for Quick Open.'),
            default: false,
        },
        'search.ripgrep.maxThreads': {
            type: 'number',
            description: nls.localize('search.ripgrep.maxThreads', 'Number of threads to use for searching. When set to 0, the engine automatically determines this value.'),
            default: 0,
        },
        'search.quickOpen.includeHistory': {
            type: 'boolean',
            description: nls.localize('search.quickOpen.includeHistory', 'Whether to include results from recently opened files in the file results for Quick Open.'),
            default: true,
        },
        'search.quickOpen.history.filterSortOrder': {
            type: 'string',
            enum: ['default', 'recency'],
            default: 'default',
            enumDescriptions: [
                nls.localize('filterSortOrder.default', 'History entries are sorted by relevance based on the filter value used. More relevant entries appear first.'),
                nls.localize('filterSortOrder.recency', 'History entries are sorted by recency. More recently opened entries appear first.'),
            ],
            description: nls.localize('filterSortOrder', 'Controls sorting order of editor history in quick open when filtering.'),
        },
        'search.followSymlinks': {
            type: 'boolean',
            description: nls.localize('search.followSymlinks', 'Controls whether to follow symlinks while searching.'),
            default: true,
        },
        'search.smartCase': {
            type: 'boolean',
            description: nls.localize('search.smartCase', 'Search case-insensitively if the pattern is all lowercase, otherwise, search case-sensitively.'),
            default: false,
        },
        'search.globalFindClipboard': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.globalFindClipboard', 'Controls whether the search view should read or modify the shared find clipboard on macOS.'),
            included: platform.isMacintosh,
        },
        'search.location': {
            type: 'string',
            enum: ['sidebar', 'panel'],
            default: 'sidebar',
            description: nls.localize('search.location', 'Controls whether the search will be shown as a view in the sidebar or as a panel in the panel area for more horizontal space.'),
            deprecationMessage: nls.localize('search.location.deprecationMessage', 'This setting is deprecated. You can drag the search icon to a new location instead.'),
        },
        'search.maxResults': {
            type: ['number', 'null'],
            default: DEFAULT_MAX_SEARCH_RESULTS,
            markdownDescription: nls.localize('search.maxResults', 'Controls the maximum number of search results, this can be set to `null` (empty) to return unlimited results.'),
        },
        'search.collapseResults': {
            type: 'string',
            enum: ['auto', 'alwaysCollapse', 'alwaysExpand'],
            enumDescriptions: [
                nls.localize('search.collapseResults.auto', 'Files with less than 10 results are expanded. Others are collapsed.'),
                '',
                '',
            ],
            default: 'alwaysExpand',
            description: nls.localize('search.collapseAllResults', 'Controls whether the search results will be collapsed or expanded.'),
        },
        'search.useReplacePreview': {
            type: 'boolean',
            default: true,
            description: nls.localize('search.useReplacePreview', 'Controls whether to open Replace Preview when selecting or replacing a match.'),
        },
        'search.showLineNumbers': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.showLineNumbers', 'Controls whether to show line numbers for search results.'),
        },
        'search.usePCRE2': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.usePCRE2', 'Whether to use the PCRE2 regex engine in text search. This enables using some advanced regex features like lookahead and backreferences. However, not all PCRE2 features are supported - only features that are also supported by JavaScript.'),
            deprecationMessage: nls.localize('usePCRE2Deprecated', 'Deprecated. PCRE2 will be used automatically when using regex features that are only supported by PCRE2.'),
        },
        'search.actionsPosition': {
            type: 'string',
            enum: ['auto', 'right'],
            enumDescriptions: [
                nls.localize('search.actionsPositionAuto', 'Position the actionbar to the right when the search view is narrow, and immediately after the content when the search view is wide.'),
                nls.localize('search.actionsPositionRight', 'Always position the actionbar to the right.'),
            ],
            default: 'right',
            description: nls.localize('search.actionsPosition', 'Controls the positioning of the actionbar on rows in the search view.'),
        },
        'search.searchOnType': {
            type: 'boolean',
            default: true,
            description: nls.localize('search.searchOnType', 'Search all files as you type.'),
        },
        'search.seedWithNearestWord': {
            type: 'boolean',
            default: false,
            description: nls.localize('search.seedWithNearestWord', 'Enable seeding search from the word nearest the cursor when the active editor has no selection.'),
        },
        'search.seedOnFocus': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('search.seedOnFocus', "Update the search query to the editor's selected text when focusing the search view. This happens either on click or when triggering the `workbench.views.search.focus` command."),
        },
        'search.searchOnTypeDebouncePeriod': {
            type: 'number',
            default: 300,
            markdownDescription: nls.localize('search.searchOnTypeDebouncePeriod', 'When {0} is enabled, controls the timeout in milliseconds between a character being typed and the search starting. Has no effect when {0} is disabled.', '`#search.searchOnType#`'),
        },
        'search.searchEditor.doubleClickBehaviour': {
            type: 'string',
            enum: ['selectWord', 'goToLocation', 'openLocationToSide'],
            default: 'goToLocation',
            enumDescriptions: [
                nls.localize('search.searchEditor.doubleClickBehaviour.selectWord', 'Double-clicking selects the word under the cursor.'),
                nls.localize('search.searchEditor.doubleClickBehaviour.goToLocation', 'Double-clicking opens the result in the active editor group.'),
                nls.localize('search.searchEditor.doubleClickBehaviour.openLocationToSide', 'Double-clicking opens the result in the editor group to the side, creating one if it does not yet exist.'),
            ],
            markdownDescription: nls.localize('search.searchEditor.doubleClickBehaviour', 'Configure effect of double-clicking a result in a search editor.'),
        },
        'search.searchEditor.singleClickBehaviour': {
            type: 'string',
            enum: ['default', 'peekDefinition'],
            default: 'default',
            enumDescriptions: [
                nls.localize('search.searchEditor.singleClickBehaviour.default', 'Single-clicking does nothing.'),
                nls.localize('search.searchEditor.singleClickBehaviour.peekDefinition', 'Single-clicking opens a Peek Definition window.'),
            ],
            markdownDescription: nls.localize('search.searchEditor.singleClickBehaviour', 'Configure effect of single-clicking a result in a search editor.'),
        },
        'search.searchEditor.reusePriorSearchConfiguration': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize({
                key: 'search.searchEditor.reusePriorSearchConfiguration',
                comment: [
                    '"Search Editor" is a type of editor that can display search results. "includes, excludes, and flags" refers to the "files to include" and "files to exclude" input boxes, and the flags that control whether a query is case-sensitive or a regex.',
                ],
            }, 'When enabled, new Search Editors will reuse the includes, excludes, and flags of the previously opened Search Editor.'),
        },
        'search.searchEditor.defaultNumberOfContextLines': {
            type: ['number', 'null'],
            default: 1,
            markdownDescription: nls.localize('search.searchEditor.defaultNumberOfContextLines', "The default number of surrounding context lines to use when creating new Search Editors. If using `#search.searchEditor.reusePriorSearchConfiguration#`, this can be set to `null` (empty) to use the prior Search Editor's configuration."),
        },
        'search.searchEditor.focusResultsOnSearch': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('search.searchEditor.focusResultsOnSearch', 'When a search is triggered, focus the Search Editor results instead of the Search Editor input.'),
        },
        'search.sortOrder': {
            type: 'string',
            enum: [
                "default" /* SearchSortOrder.Default */,
                "fileNames" /* SearchSortOrder.FileNames */,
                "type" /* SearchSortOrder.Type */,
                "modified" /* SearchSortOrder.Modified */,
                "countDescending" /* SearchSortOrder.CountDescending */,
                "countAscending" /* SearchSortOrder.CountAscending */,
            ],
            default: "default" /* SearchSortOrder.Default */,
            enumDescriptions: [
                nls.localize('searchSortOrder.default', 'Results are sorted by folder and file names, in alphabetical order.'),
                nls.localize('searchSortOrder.filesOnly', 'Results are sorted by file names ignoring folder order, in alphabetical order.'),
                nls.localize('searchSortOrder.type', 'Results are sorted by file extensions, in alphabetical order.'),
                nls.localize('searchSortOrder.modified', 'Results are sorted by file last modified date, in descending order.'),
                nls.localize('searchSortOrder.countDescending', 'Results are sorted by count per file, in descending order.'),
                nls.localize('searchSortOrder.countAscending', 'Results are sorted by count per file, in ascending order.'),
            ],
            description: nls.localize('search.sortOrder', 'Controls sorting order of search results.'),
        },
        'search.decorations.colors': {
            type: 'boolean',
            description: nls.localize('search.decorations.colors', 'Controls whether search file decorations should use colors.'),
            default: true,
        },
        'search.decorations.badges': {
            type: 'boolean',
            description: nls.localize('search.decorations.badges', 'Controls whether search file decorations should use badges.'),
            default: true,
        },
        'search.defaultViewMode': {
            type: 'string',
            enum: ["tree" /* ViewMode.Tree */, "list" /* ViewMode.List */],
            default: "list" /* ViewMode.List */,
            enumDescriptions: [
                nls.localize('scm.defaultViewMode.tree', 'Shows search results as a tree.'),
                nls.localize('scm.defaultViewMode.list', 'Shows search results as a list.'),
            ],
            description: nls.localize('search.defaultViewMode', 'Controls the default search result view mode.'),
        },
        'search.quickAccess.preserveInput': {
            type: 'boolean',
            description: nls.localize('search.quickAccess.preserveInput', 'Controls whether the last typed input to Quick Search should be restored when opening it the next time.'),
            default: false,
        },
        'search.experimental.closedNotebookRichContentResults': {
            type: 'boolean',
            description: nls.localize('search.experimental.closedNotebookResults', 'Show notebook editor rich content results for closed notebooks. Please refresh your search results after changing this setting.'),
            default: false,
        },
    },
});
CommandsRegistry.registerCommand('_executeWorkspaceSymbolProvider', async function (accessor, ...args) {
    const [query] = args;
    assertType(typeof query === 'string');
    const result = await getWorkspaceSymbols(query);
    return result.map((item) => item.symbol);
});
// todo: @andreamah get rid of this after a few iterations
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'search.experimental.quickAccess.preserveInput',
        migrateFn: (value, _accessor) => [
            ['search.quickAccess.preserveInput', { value }],
            ['search.experimental.quickAccess.preserveInput', { value: undefined }],
        ],
    },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUMzSCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLFVBQVUsSUFBSSxxQkFBcUIsR0FFbkMsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkYsT0FBTyxFQUNOLFVBQVUsSUFBSSxjQUFjLEdBSzVCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDN0csT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixJQUFJLG9CQUFvQixFQUFFLE1B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