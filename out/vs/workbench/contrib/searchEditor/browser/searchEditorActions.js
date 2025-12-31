/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import './media/searchEditor.css';
import { isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { getSearchView } from '../../search/browser/searchActionsBase.js';
import { getOrMakeSearchEditorInput, SearchEditorInput } from './searchEditorInput.js';
import { serializeSearchResultForEditor } from './searchEditorSerialization.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
export const toggleSearchEditorCaseSensitiveCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        ;
        editorService.activeEditorPane.toggleCaseSensitive();
    }
};
export const toggleSearchEditorWholeWordCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        ;
        editorService.activeEditorPane.toggleWholeWords();
    }
};
export const toggleSearchEditorRegexCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        ;
        editorService.activeEditorPane.toggleRegex();
    }
};
export const toggleSearchEditorContextLinesCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        ;
        editorService.activeEditorPane.toggleContextLines();
    }
};
export const modifySearchEditorContextLinesCommand = (accessor, increase) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        ;
        editorService.activeEditorPane.modifyContextLines(increase);
    }
};
export const selectAllSearchEditorMatchesCommand = (accessor) => {
    const editorService = accessor.get(IEditorService);
    const input = editorService.activeEditor;
    if (input instanceof SearchEditorInput) {
        ;
        editorService.activeEditorPane.focusAllResults();
    }
};
export async function openSearchEditor(accessor) {
    const viewsService = accessor.get(IViewsService);
    const instantiationService = accessor.get(IInstantiationService);
    const searchView = getSearchView(viewsService);
    if (searchView) {
        await instantiationService.invokeFunction(openNewSearchEditor, {
            filesToInclude: searchView.searchIncludePattern.getValue(),
            onlyOpenEditors: searchView.searchIncludePattern.onlySearchInOpenEditors(),
            filesToExclude: searchView.searchExcludePattern.getValue(),
            isRegexp: searchView.searchAndReplaceWidget.searchInput?.getRegex(),
            isCaseSensitive: searchView.searchAndReplaceWidget.searchInput?.getCaseSensitive(),
            matchWholeWord: searchView.searchAndReplaceWidget.searchInput?.getWholeWords(),
            useExcludeSettingsAndIgnoreFiles: searchView.searchExcludePattern.useExcludesAndIgnoreFiles(),
            showIncludesExcludes: !!(searchView.searchIncludePattern.getValue() ||
                searchView.searchExcludePattern.getValue() ||
                !searchView.searchExcludePattern.useExcludesAndIgnoreFiles()),
        });
    }
    else {
        await instantiationService.invokeFunction(openNewSearchEditor);
    }
}
export const openNewSearchEditor = async (accessor, _args = {}, toSide = false) => {
    const editorService = accessor.get(IEditorService);
    const editorGroupsService = accessor.get(IEditorGroupsService);
    const telemetryService = accessor.get(ITelemetryService);
    const instantiationService = accessor.get(IInstantiationService);
    const configurationService = accessor.get(IConfigurationService);
    const configurationResolverService = accessor.get(IConfigurationResolverService);
    const workspaceContextService = accessor.get(IWorkspaceContextService);
    const historyService = accessor.get(IHistoryService);
    const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.file);
    const lastActiveWorkspaceRoot = activeWorkspaceRootUri
        ? (workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
        : undefined;
    const activeEditorControl = editorService.activeTextEditorControl;
    let activeModel;
    let selected = '';
    if (activeEditorControl) {
        if (isDiffEditor(activeEditorControl)) {
            if (activeEditorControl.getOriginalEditor().hasTextFocus()) {
                activeModel = activeEditorControl.getOriginalEditor();
            }
            else {
                activeModel = activeEditorControl.getModifiedEditor();
            }
        }
        else {
            activeModel = activeEditorControl;
        }
        const selection = activeModel?.getSelection();
        selected = (selection && activeModel?.getModel()?.getValueInRange(selection)) ?? '';
        if (selection?.isEmpty() &&
            configurationService.getValue('search').seedWithNearestWord) {
            const wordAtPosition = activeModel.getModel()?.getWordAtPosition(selection.getStartPosition());
            if (wordAtPosition) {
                selected = wordAtPosition.word;
            }
        }
    }
    else {
        if (editorService.activeEditor instanceof SearchEditorInput) {
            const active = editorService.activeEditorPane;
            selected = active.getSelected();
        }
    }
    telemetryService.publicLog2('searchEditor/openNewSearchEditor');
    const seedSearchStringFromSelection = _args.location === 'new' ||
        configurationService.getValue('editor').find.seedSearchStringFromSelection;
    const args = { query: seedSearchStringFromSelection ? selected : undefined };
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
    const existing = editorService
        .getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)
        .find((id) => id.editor.typeId === SearchEditorInput.ID);
    let editor;
    if (existing && args.location === 'reuse') {
        const group = editorGroupsService.getGroup(existing.groupId);
        if (!group) {
            throw new Error('Invalid group id for search editor');
        }
        const input = existing.editor;
        editor = (await group.openEditor(input));
        if (selected) {
            editor.setQuery(selected);
        }
        else {
            editor.selectQuery();
        }
        editor.setSearchConfig(args);
    }
    else {
        const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
            config: args,
            resultsContents: '',
            from: 'rawData',
        });
        // TODO @roblourens make this use the editor resolver service if possible
        editor = (await editorService.openEditor(input, { pinned: true }, toSide ? SIDE_GROUP : ACTIVE_GROUP));
    }
    const searchOnType = configurationService.getValue('search').searchOnType;
    if (args.triggerSearch === true || (args.triggerSearch !== false && searchOnType && args.query)) {
        editor.triggerSearch({ focusResults: args.focusResults });
    }
    if (!args.focusResults) {
        editor.focusSearchInput();
    }
};
export const createEditorFromSearchResult = async (accessor, searchResult, rawIncludePattern, rawExcludePattern, onlySearchInOpenEditors) => {
    if (!searchResult.query) {
        console.error('Expected searchResult.query to be defined. Got', searchResult);
        return;
    }
    const editorService = accessor.get(IEditorService);
    const telemetryService = accessor.get(ITelemetryService);
    const instantiationService = accessor.get(IInstantiationService);
    const labelService = accessor.get(ILabelService);
    const configurationService = accessor.get(IConfigurationService);
    const sortOrder = configurationService.getValue('search').sortOrder;
    telemetryService.publicLog2('searchEditor/createEditorFromSearchResult');
    const labelFormatter = (uri) => labelService.getUriLabel(uri, { relative: true });
    const { text, matchRanges, config } = serializeSearchResultForEditor(searchResult, rawIncludePattern, rawExcludePattern, 0, labelFormatter, sortOrder);
    config.onlyOpenEditors = onlySearchInOpenEditors;
    const contextLines = configurationService.getValue('search').searchEditor
        .defaultNumberOfContextLines;
    if (searchResult.isDirty || contextLines === 0 || contextLines === null) {
        const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
            resultsContents: text,
            config,
            from: 'rawData',
        });
        await editorService.openEditor(input, { pinned: true });
        input.setMatchRanges(matchRanges);
    }
    else {
        const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, {
            from: 'rawData',
            resultsContents: '',
            config: { ...config, contextLines },
        });
        const editor = (await editorService.openEditor(input, { pinned: true }));
        editor.triggerSearch();
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaEVkaXRvci9icm93c2VyL3NlYXJjaEVkaXRvckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUd6RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN0RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sWUFBWSxFQUNaLGNBQWMsRUFDZCxVQUFVLEdBQ1YsTUFBTSxrREFBa0QsQ0FBQTtBQUN6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