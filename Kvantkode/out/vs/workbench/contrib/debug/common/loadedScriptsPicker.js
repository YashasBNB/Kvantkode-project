/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IDebugService } from './debug.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { dirname } from '../../../../base/common/resources.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
/**
 * This function takes a regular quickpick and makes one for loaded scripts that has persistent headers
 * e.g. when some picks are filtered out, the ones that are visible still have its header.
 */
export async function showLoadedScriptMenu(accessor) {
    const quickInputService = accessor.get(IQuickInputService);
    const debugService = accessor.get(IDebugService);
    const editorService = accessor.get(IEditorService);
    const sessions = debugService.getModel().getSessions(false);
    const modelService = accessor.get(IModelService);
    const languageService = accessor.get(ILanguageService);
    const labelService = accessor.get(ILabelService);
    const localDisposableStore = new DisposableStore();
    const quickPick = quickInputService.createQuickPick({ useSeparators: true });
    localDisposableStore.add(quickPick);
    quickPick.matchOnLabel =
        quickPick.matchOnDescription =
            quickPick.matchOnDetail =
                quickPick.sortByLabel =
                    false;
    quickPick.placeholder = nls.localize('moveFocusedView.selectView', 'Search loaded scripts by name');
    quickPick.items = await _getPicks(quickPick.value, sessions, editorService, modelService, languageService, labelService);
    localDisposableStore.add(quickPick.onDidChangeValue(async () => {
        quickPick.items = await _getPicks(quickPick.value, sessions, editorService, modelService, languageService, labelService);
    }));
    localDisposableStore.add(quickPick.onDidAccept(() => {
        const selectedItem = quickPick.selectedItems[0];
        selectedItem.accept();
        quickPick.hide();
        localDisposableStore.dispose();
    }));
    quickPick.show();
}
async function _getPicksFromSession(session, filter, editorService, modelService, languageService, labelService) {
    const items = [];
    items.push({ type: 'separator', label: session.name });
    const sources = await session.getLoadedSources();
    sources.forEach((element) => {
        const pick = _createPick(element, filter, editorService, modelService, languageService, labelService);
        if (pick) {
            items.push(pick);
        }
    });
    return items;
}
async function _getPicks(filter, sessions, editorService, modelService, languageService, labelService) {
    const loadedScriptPicks = [];
    const picks = await Promise.all(sessions.map((session) => _getPicksFromSession(session, filter, editorService, modelService, languageService, labelService)));
    for (const row of picks) {
        for (const elem of row) {
            loadedScriptPicks.push(elem);
        }
    }
    return loadedScriptPicks;
}
function _createPick(source, filter, editorService, modelService, languageService, labelService) {
    const label = labelService.getUriBasenameLabel(source.uri);
    const desc = labelService.getUriLabel(dirname(source.uri));
    // manually filter so that headers don't get filtered out
    const labelHighlights = matchesFuzzy(filter, label, true);
    const descHighlights = matchesFuzzy(filter, desc, true);
    if (labelHighlights || descHighlights) {
        return {
            label,
            description: desc === '.' ? undefined : desc,
            highlights: { label: labelHighlights ?? undefined, description: descHighlights ?? undefined },
            iconClasses: getIconClasses(modelService, languageService, source.uri),
            accept: () => {
                if (source.available) {
                    source.openInEditor(editorService, {
                        startLineNumber: 0,
                        startColumn: 0,
                        endLineNumber: 0,
                        endColumn: 0,
                    });
                }
            },
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVkU2NyaXB0c1BpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2xvYWRlZFNjcmlwdHNQaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFakUsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQWlCLE1BQU0sWUFBWSxDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBTTFFOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsb0JBQW9CLENBQUMsUUFBMEI7SUFDcEUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDMUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNoRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxD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