/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { extname, isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ToggleCaseSensitiveKeybinding, ToggleRegexKeybinding, ToggleWholeWordKeybinding, } from '../../../../editor/contrib/find/browser/findModel.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { EditorExtensions, DEFAULT_EDITOR_ASSOCIATION, } from '../../../common/editor.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getSearchView } from '../../search/browser/searchActionsBase.js';
import { searchNewEditorIcon, searchRefreshIcon } from '../../search/browser/searchIcons.js';
import * as SearchConstants from '../../search/common/constants.js';
import * as SearchEditorConstants from './constants.js';
import { SearchEditor } from './searchEditor.js';
import { createEditorFromSearchResult, modifySearchEditorContextLinesCommand, openNewSearchEditor, openSearchEditor, selectAllSearchEditorMatchesCommand, toggleSearchEditorCaseSensitiveCommand, toggleSearchEditorContextLinesCommand, toggleSearchEditorRegexCommand, toggleSearchEditorWholeWordCommand, } from './searchEditorActions.js';
import { getOrMakeSearchEditorInput, SearchEditorInput, SEARCH_EDITOR_EXT, } from './searchEditorInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { VIEW_ID } from '../../../services/search/common/search.js';
import { RegisteredEditorPriority, IEditorResolverService, } from '../../../services/editor/common/editorResolverService.js';
import { IWorkingCopyEditorService, } from '../../../services/workingCopy/common/workingCopyEditorService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getActiveElement } from '../../../../base/browser/dom.js';
const OpenInEditorCommandId = 'search.action.openInEditor';
const OpenNewEditorToSideCommandId = 'search.action.openNewEditorToSide';
const FocusQueryEditorWidgetCommandId = 'search.action.focusQueryEditorWidget';
const FocusQueryEditorFilesToIncludeCommandId = 'search.action.focusFilesToInclude';
const FocusQueryEditorFilesToExcludeCommandId = 'search.action.focusFilesToExclude';
const ToggleSearchEditorCaseSensitiveCommandId = 'toggleSearchEditorCaseSensitive';
const ToggleSearchEditorWholeWordCommandId = 'toggleSearchEditorWholeWord';
const ToggleSearchEditorRegexCommandId = 'toggleSearchEditorRegex';
const IncreaseSearchEditorContextLinesCommandId = 'increaseSearchEditorContextLines';
const DecreaseSearchEditorContextLinesCommandId = 'decreaseSearchEditorContextLines';
const RerunSearchEditorSearchCommandId = 'rerunSearchEditorSearch';
const CleanSearchEditorStateCommandId = 'cleanSearchEditorState';
const SelectAllSearchEditorMatchesCommandId = 'selectAllSearchEditorMatches';
//#region Editor Descriptior
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(SearchEditor, SearchEditor.ID, localize('searchEditor', 'Search Editor')), [new SyncDescriptor(SearchEditorInput)]);
//#endregion
//#region Startup Contribution
let SearchEditorContribution = class SearchEditorContribution {
    static { this.ID = 'workbench.contrib.searchEditor'; }
    constructor(editorResolverService, instantiationService) {
        editorResolverService.registerEditor('*' + SEARCH_EDITOR_EXT, {
            id: SearchEditorInput.ID,
            label: localize('promptOpenWith.searchEditor.displayName', 'Search Editor'),
            detail: DEFAULT_EDITOR_ASSOCIATION.providerDisplayName,
            priority: RegisteredEditorPriority.default,
        }, {
            singlePerResource: true,
            canSupportResource: (resource) => extname(resource) === SEARCH_EDITOR_EXT,
        }, {
            createEditorInput: ({ resource }) => {
                return {
                    editor: instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
                        from: 'existingFile',
                        fileUri: resource,
                    }),
                };
            },
        });
    }
};
SearchEditorContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService)
], SearchEditorContribution);
registerWorkbenchContribution2(SearchEditorContribution.ID, SearchEditorContribution, 1 /* WorkbenchPhase.BlockStartup */);
class SearchEditorInputSerializer {
    canSerialize(input) {
        return !!input.tryReadConfigSync();
    }
    serialize(input) {
        if (!this.canSerialize(input)) {
            return undefined;
        }
        if (input.isDisposed()) {
            return JSON.stringify({
                modelUri: undefined,
                dirty: false,
                config: input.tryReadConfigSync(),
                name: input.getName(),
                matchRanges: [],
                backingUri: input.backingUri?.toString(),
            });
        }
        let modelUri = undefined;
        if (input.modelUri.path || (input.modelUri.fragment && input.isDirty())) {
            modelUri = input.modelUri.toString();
        }
        const config = input.tryReadConfigSync();
        const dirty = input.isDirty();
        const matchRanges = dirty ? input.getMatchRanges() : [];
        const backingUri = input.backingUri;
        return JSON.stringify({
            modelUri,
            dirty,
            config,
            name: input.getName(),
            matchRanges,
            backingUri: backingUri?.toString(),
        });
    }
    deserialize(instantiationService, serializedEditorInput) {
        const { modelUri, dirty, config, matchRanges, backingUri } = JSON.parse(serializedEditorInput);
        if (config && config.query !== undefined) {
            if (modelUri) {
                const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
                    from: 'model',
                    modelUri: URI.parse(modelUri),
                    config,
                    backupOf: backingUri ? URI.parse(backingUri) : undefined,
                });
                input.setDirty(dirty);
                input.setMatchRanges(matchRanges);
                return input;
            }
            else {
                if (backingUri) {
                    return instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
                        from: 'existingFile',
                        fileUri: URI.parse(backingUri),
                    });
                }
                else {
                    return instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
                        from: 'rawData',
                        resultsContents: '',
                        config,
                    });
                }
            }
        }
        return undefined;
    }
}
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(SearchEditorInput.ID, SearchEditorInputSerializer);
//#endregion
//#region Commands
CommandsRegistry.registerCommand(CleanSearchEditorStateCommandId, (accessor) => {
    const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
    if (activeEditorPane instanceof SearchEditor) {
        activeEditorPane.cleanState();
    }
});
//#endregion
//#region Actions
const category = localize2('search', 'Search Editor');
const translateLegacyConfig = (legacyConfig = {}) => {
    const config = {};
    const overrides = {
        includes: 'filesToInclude',
        excludes: 'filesToExclude',
        wholeWord: 'matchWholeWord',
        caseSensitive: 'isCaseSensitive',
        regexp: 'isRegexp',
        useIgnores: 'useExcludeSettingsAndIgnoreFiles',
    };
    Object.entries(legacyConfig).forEach(([key, value]) => {
        ;
        config[overrides[key] ?? key] = value;
    });
    return config;
};
const openArgMetadata = {
    description: 'Open a new search editor. Arguments passed can include variables like ${relativeFileDirname}.',
    args: [
        {
            name: 'Open new Search Editor args',
            schema: {
                properties: {
                    query: { type: 'string' },
                    filesToInclude: { type: 'string' },
                    filesToExclude: { type: 'string' },
                    contextLines: { type: 'number' },
                    matchWholeWord: { type: 'boolean' },
                    isCaseSensitive: { type: 'boolean' },
                    isRegexp: { type: 'boolean' },
                    useExcludeSettingsAndIgnoreFiles: { type: 'boolean' },
                    showIncludesExcludes: { type: 'boolean' },
                    triggerSearch: { type: 'boolean' },
                    focusResults: { type: 'boolean' },
                    onlyOpenEditors: { type: 'boolean' },
                },
            },
        },
    ],
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'search.searchEditor.action.deleteFileResults',
            title: localize2('searchEditor.deleteResultBlock', 'Delete File Results'),
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */,
            },
            precondition: SearchEditorConstants.InSearchEditor,
            category,
            f1: true,
        });
    }
    async run(accessor) {
        const contextService = accessor.get(IContextKeyService).getContext(getActiveElement());
        if (contextService.getValue(SearchEditorConstants.InSearchEditor.serialize())) {
            ;
            accessor.get(IEditorService).activeEditorPane.deleteResultBlock();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SearchEditorConstants.OpenNewEditorCommandId,
            title: localize2('search.openNewSearchEditor', 'New Search Editor'),
            category,
            f1: true,
            metadata: openArgMetadata,
        });
    }
    async run(accessor, args) {
        await accessor
            .get(IInstantiationService)
            .invokeFunction(openNewSearchEditor, translateLegacyConfig({ location: 'new', ...args }));
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SearchEditorConstants.OpenEditorCommandId,
            title: localize2('search.openSearchEditor', 'Open Search Editor'),
            category,
            f1: true,
            metadata: openArgMetadata,
        });
    }
    async run(accessor, args) {
        await accessor
            .get(IInstantiationService)
            .invokeFunction(openNewSearchEditor, translateLegacyConfig({ location: 'reuse', ...args }));
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: OpenNewEditorToSideCommandId,
            title: localize2('search.openNewEditorToSide', 'Open New Search Editor to the Side'),
            category,
            f1: true,
            metadata: openArgMetadata,
        });
    }
    async run(accessor, args) {
        await accessor
            .get(IInstantiationService)
            .invokeFunction(openNewSearchEditor, translateLegacyConfig(args), true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: OpenInEditorCommandId,
            title: localize2('search.openResultsInEditor', 'Open Results in Editor'),
            category,
            f1: true,
            keybinding: {
                primary: 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(SearchConstants.SearchContext.HasSearchResults, SearchConstants.SearchContext.SearchViewFocusedKey),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                },
            },
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const instantiationService = accessor.get(IInstantiationService);
        const searchView = getSearchView(viewsService);
        if (searchView) {
            await instantiationService.invokeFunction(createEditorFromSearchResult, searchView.searchResult, searchView.searchIncludePattern.getValue(), searchView.searchExcludePattern.getValue(), searchView.searchIncludePattern.onlySearchInOpenEditors());
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: RerunSearchEditorSearchCommandId,
            title: localize2('search.rerunSearchInEditor', 'Search Again'),
            category,
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 48 /* KeyCode.KeyR */,
                when: SearchEditorConstants.InSearchEditor,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
            icon: searchRefreshIcon,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    group: 'navigation',
                    when: ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID),
                },
                {
                    id: MenuId.CommandPalette,
                    when: ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID),
                },
            ],
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const input = editorService.activeEditor;
        if (input instanceof SearchEditorInput) {
            ;
            editorService.activeEditorPane.triggerSearch({ resetCursor: false });
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: FocusQueryEditorWidgetCommandId,
            title: localize2('search.action.focusQueryEditorWidget', 'Focus Search Editor Input'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: {
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const input = editorService.activeEditor;
        if (input instanceof SearchEditorInput) {
            ;
            editorService.activeEditorPane.focusSearchInput();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: FocusQueryEditorFilesToIncludeCommandId,
            title: localize2('search.action.focusFilesToInclude', 'Focus Search Editor Files to Include'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const input = editorService.activeEditor;
        if (input instanceof SearchEditorInput) {
            ;
            editorService.activeEditorPane.focusFilesToIncludeInput();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: FocusQueryEditorFilesToExcludeCommandId,
            title: localize2('search.action.focusFilesToExclude', 'Focus Search Editor Files to Exclude'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const input = editorService.activeEditor;
        if (input instanceof SearchEditorInput) {
            ;
            editorService.activeEditorPane.focusFilesToExcludeInput();
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: ToggleSearchEditorCaseSensitiveCommandId,
            title: localize2('searchEditor.action.toggleSearchEditorCaseSensitive', 'Toggle Match Case'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: SearchConstants.SearchContext.SearchInputBoxFocusedKey,
            }, ToggleCaseSensitiveKeybinding),
        });
    }
    run(accessor) {
        toggleSearchEditorCaseSensitiveCommand(accessor);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: ToggleSearchEditorWholeWordCommandId,
            title: localize2('searchEditor.action.toggleSearchEditorWholeWord', 'Toggle Match Whole Word'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: SearchConstants.SearchContext.SearchInputBoxFocusedKey,
            }, ToggleWholeWordKeybinding),
        });
    }
    run(accessor) {
        toggleSearchEditorWholeWordCommand(accessor);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: ToggleSearchEditorRegexCommandId,
            title: localize2('searchEditor.action.toggleSearchEditorRegex', 'Toggle Use Regular Expression'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: Object.assign({
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: SearchConstants.SearchContext.SearchInputBoxFocusedKey,
            }, ToggleRegexKeybinding),
        });
    }
    run(accessor) {
        toggleSearchEditorRegexCommand(accessor);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SearchEditorConstants.ToggleSearchEditorContextLinesCommandId,
            title: localize2('searchEditor.action.toggleSearchEditorContextLines', 'Toggle Context Lines'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 42 /* KeyCode.KeyL */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 42 /* KeyCode.KeyL */ },
            },
        });
    }
    run(accessor) {
        toggleSearchEditorContextLinesCommand(accessor);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: IncreaseSearchEditorContextLinesCommandId,
            title: localize2('searchEditor.action.increaseSearchEditorContextLines', 'Increase Context Lines'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 86 /* KeyCode.Equal */,
            },
        });
    }
    run(accessor) {
        modifySearchEditorContextLinesCommand(accessor, true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: DecreaseSearchEditorContextLinesCommandId,
            title: localize2('searchEditor.action.decreaseSearchEditorContextLines', 'Decrease Context Lines'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 512 /* KeyMod.Alt */ | 88 /* KeyCode.Minus */,
            },
        });
    }
    run(accessor) {
        modifySearchEditorContextLinesCommand(accessor, false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectAllSearchEditorMatchesCommandId,
            title: localize2('searchEditor.action.selectAllSearchEditorMatches', 'Select All Matches'),
            category,
            f1: true,
            precondition: SearchEditorConstants.InSearchEditor,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 42 /* KeyCode.KeyL */,
            },
        });
    }
    run(accessor) {
        selectAllSearchEditorMatchesCommand(accessor);
    }
});
registerAction2(class OpenSearchEditorAction extends Action2 {
    constructor() {
        super({
            id: 'search.action.openNewEditorFromView',
            title: localize('search.openNewEditor', 'Open New Search Editor'),
            category,
            icon: searchNewEditorIcon,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.equals('view', VIEW_ID),
                },
            ],
        });
    }
    run(accessor, ...args) {
        return openSearchEditor(accessor);
    }
});
//#endregion
//#region Search Editor Working Copy Editor Handler
let SearchEditorWorkingCopyEditorHandler = class SearchEditorWorkingCopyEditorHandler extends Disposable {
    static { this.ID = 'workbench.contrib.searchEditorWorkingCopyEditorHandler'; }
    constructor(instantiationService, workingCopyEditorService) {
        super();
        this.instantiationService = instantiationService;
        this._register(workingCopyEditorService.registerHandler(this));
    }
    handles(workingCopy) {
        return workingCopy.resource.scheme === SearchEditorConstants.SearchEditorScheme;
    }
    isOpen(workingCopy, editor) {
        if (!this.handles(workingCopy)) {
            return false;
        }
        return editor instanceof SearchEditorInput && isEqual(workingCopy.resource, editor.modelUri);
    }
    createEditor(workingCopy) {
        const input = this.instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
            from: 'model',
            modelUri: workingCopy.resource,
        });
        input.setDirty(true);
        return input;
    }
};
SearchEditorWorkingCopyEditorHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkingCopyEditorService)
], SearchEditorWorkingCopyEditorHandler);
registerWorkbenchContribution2(SearchEditorWorkingCopyEditorHandler.ID, SearchEditorWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaEVkaXRvci9icm93c2VyL3NlYXJjaEVkaXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHcEQsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixxQkFBcUIsRUFDckIseUJBQXlCLEdBQ3pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUF1QixNQUFNLDRCQUE0QixDQUFBO0FBQ3RGLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBR04sZ0JBQWdCLEVBQ2hCLDBCQUEwQixHQUMxQixNQUFNLDJC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