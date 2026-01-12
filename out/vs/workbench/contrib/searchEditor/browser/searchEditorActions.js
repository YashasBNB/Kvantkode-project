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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRWRpdG9yQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoRWRpdG9yL2Jyb3dzZXIvc2VhcmNoRWRpdG9yQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFNUQsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBR3pFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3RGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzdGLE9BQU8sRUFDTixZQUFZLEVBQ1osY0FBYyxFQUNkLFVBQVUsR0FDVixNQUFNLGtEQUFrRCxDQUFB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