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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoRWRpdG9yL2Jyb3dzZXIvc2VhcmNoRWRpdG9yLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUdwRCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLHFCQUFxQixFQUNyQix5QkFBeUIsR0FDekIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFDTixjQUFjLEVBQ2Qsa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsb0JBQW9CLEVBQXVCLE1BQU0sNEJBQTRCLENBQUE7QUFDdEYsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFHTixnQkFBZ0IsRUFDaEIsMEJBQTBCLEdBQzFCLE1B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