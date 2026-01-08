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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQzNILE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sVUFBVSxJQUFJLHFCQUFxQixHQUVuQyxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sVUFBVSxJQUFJLGNBQWMsR0FLNUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLElBQUksb0JBQW9CLEVB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