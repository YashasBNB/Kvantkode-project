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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGVkU2NyaXB0c1BpY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9sb2FkZWRTY3JpcHRzUGlja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE9BQU8sRUFDTixrQkFBa0IsR0FHbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFpQixNQUFNLFlBQVksQ0FBQTtBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQU0xRTs7O0dBR0c7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLG9CQUFvQixDQUFDLFFBQTBCO0lBQ3BFLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzFELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7SUFDaEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxj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