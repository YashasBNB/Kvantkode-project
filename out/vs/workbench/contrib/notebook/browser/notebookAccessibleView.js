/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { getNotebookEditorFromEditorPane } from './notebookBrowser.js';
import { NOTEBOOK_CELL_LIST_FOCUSED } from '../common/notebookContextKeys.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { InputFocusedContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
export class NotebookAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'notebook';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated());
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        return getAccessibleOutputProvider(editorService);
    }
}
export function getAccessibleOutputProvider(editorService) {
    const activePane = editorService.activeEditorPane;
    const notebookEditor = getNotebookEditorFromEditorPane(activePane);
    const notebookViewModel = notebookEditor?.getViewModel();
    const selections = notebookViewModel?.getSelections();
    const notebookDocument = notebookViewModel?.notebookDocument;
    if (!selections || !notebookDocument || !notebookEditor?.textModel) {
        return;
    }
    const viewCell = notebookViewModel.viewCells[selections[0].start];
    const outputContent = getAllOutputsText(notebookDocument, viewCell);
    if (!outputContent) {
        return;
    }
    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "view" /* AccessibleViewType.View */ }, () => {
        return outputContent;
    }, () => {
        notebookEditor?.setFocus(selections[0]);
        notebookEditor.focus();
    }, "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0FjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFHTix5QkFBeUIsR0FDekIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHckYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDdEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXZFLE1BQU0sT0FBTyxzQkFBc0I7SUFBbkM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsU0FBSSxHQUFHLFVBQVUsQ0FBQTtRQUNqQixTQUFJLHdDQUEwQjtRQUM5QixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBS2hHLENBQUM7SUFKQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxPQUFPLDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2xELENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxhQUE2QjtJQUN4RSxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUE7SUFDakQsTUFBTSxjQUFjLEdBQUcsK0JBQStCLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbEUsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLEVBQUUsWUFBWSxFQUFFLENBQUE7SUFDeEQsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLENBQUE7SUFDckQsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQTtJQUU1RCxJQUFJLENBQUMsVUFBVSxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLENBQUM7UUFDcEUsT0FBTTtJQUNQLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2pFLE1BQU0sYUFBYSxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBRW5FLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNwQixPQUFNO0lBQ1AsQ0FBQztJQUVELE9BQU8sSUFBSSx5QkFBeUIscURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUU7UUFDSixPQUFPLGFBQWEsQ0FBQTtJQUNyQixDQUFDLEVBQ0QsR0FBRyxFQUFFO1FBQ0osY0FBYyxFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdkIsQ0FBQyxvRkFFRCxDQUFBO0FBQ0YsQ0FBQyJ9