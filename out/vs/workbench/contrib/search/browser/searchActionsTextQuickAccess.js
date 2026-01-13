/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { category } from './searchActionsBase.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TEXT_SEARCH_QUICK_ACCESS_PREFIX } from './quickTextSearch/textSearchQuickAccess.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { getSelectionTextFromEditor } from './searchView.js';
registerAction2(class TextSearchQuickAccessAction extends Action2 {
    constructor() {
        super({
            id: "workbench.action.quickTextSearch" /* Constants.SearchCommandIds.QuickTextSearchActionId */,
            title: nls.localize2('quickTextSearch', 'Quick Search'),
            category,
            f1: true,
        });
    }
    async run(accessor, match) {
        const quickInputService = accessor.get(IQuickInputService);
        const searchText = getSearchText(accessor) ?? '';
        quickInputService.quickAccess.show(TEXT_SEARCH_QUICK_ACCESS_PREFIX + searchText, {
            preserveValue: !!searchText,
        });
    }
});
function getSearchText(accessor) {
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const activeEditor = editorService.activeTextEditorControl;
    if (!activeEditor) {
        return null;
    }
    if (!activeEditor.hasTextFocus()) {
        return null;
    }
    // only happen if it would also happen for the search view
    const seedSearchStringFromSelection = configurationService.getValue('editor.find.seedSearchStringFromSelection');
    if (!seedSearchStringFromSelection) {
        return null;
    }
    return getSelectionTextFromEditor(false, activeEditor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1RleHRRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoQWN0aW9uc1RleHRRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUc1RCxlQUFlLENBQ2QsTUFBTSwyQkFBNEIsU0FBUSxPQUFPO0lBQ2hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSw2RkFBb0Q7WUFDdEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDO1lBQ3ZELFFBQVE7WUFDUixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRyxDQUNqQixRQUEwQixFQUMxQixLQUFrQztRQUVsQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hELGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEdBQUcsVUFBVSxFQUFFO1lBQ2hGLGFBQWEsRUFBRSxDQUFDLENBQUMsVUFBVTtTQUMzQixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsU0FBUyxhQUFhLENBQUMsUUFBMEI7SUFDaEQsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNsRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtJQUVoRSxNQUFNLFlBQVksR0FBWSxhQUFhLENBQUMsdUJBQWtDLENBQUE7SUFDOUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQztRQUNsQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCwwREFBMEQ7SUFDMUQsTUFBTSw2QkFBNkIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQ2xFLDJDQUEyQyxDQUMzQyxDQUFBO0lBQ0QsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsT0FBTywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFDdkQsQ0FBQyJ9