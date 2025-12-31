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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9uc1RleHRRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3NlYXJjaEFjdGlvbnNUZXh0UXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUd6QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHNUQsZUFBZSxDQUNkLE1BQU0sMkJBQTRCLFNBQVEsT0FBTztJQUNoRDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsNkZBQW9EO1lBQ3RELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLGNBQWMsQ0FBQztZQUN2RCxRQUFRO1lBQ1IsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUcsQ0FDakIsUUFBMEIsRUFDMUIsS0FBa0M7UUFFbEMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNoRCxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLCtCQUErQixHQUFHLFVBQVUsRUFBRTtZQUNoRixhQUFhLEVBQUUsQ0FBQyxDQUFDLFVBQVU7U0FDM0IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELFNBQVMsYUFBYSxDQUFDLFFBQTBCO0lBQ2hELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDbEQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7SUFFaEUsTUFBTSxZQUFZLEdBQVksYUFBYSxDQUFDLHVCQUFrQyxDQUFBO0lBQzlFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUM7UUFDbEMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsMERBQTBEO0lBQzFELE1BQU0sNkJBQTZCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUNsRSwyQ0FBMkMsQ0FDM0MsQ0FBQTtJQUNELElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sMEJBQTBCLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFBO0FBQ3ZELENBQUMifQ==