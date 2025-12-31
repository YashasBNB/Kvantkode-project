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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3JGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV2RSxNQUFNLE9BQU8sc0JBQXNCO0lBQW5DO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxVQUFVLENBQUE7UUFDakIsU0FBSSx3Q0FBMEI7UUFDOUIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUtoRyxDQUFDO0lBSkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsT0FBTywyQkFBMkIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsYUFBNkI7SUFDeEUsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFBO0lBQ2pELE1BQU0sY0FBYyxHQUFHLCtCQUErQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2xFLE1BQU0saUJBQWlCLEdBQUcsY0FBYyxFQUFFLFlBQVksRUFBRSxDQUFBO0lBQ3hELE1BQU0sVUFBVSxHQUFHLGlCQUFpQixFQUFFLGFBQWEsRUFBRSxDQUFBO0lBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUE7SUFFNUQsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQ3BFLE9BQU07SUFDUCxDQUFDO0lBRUQsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNqRSxNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUVuRSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDcEIsT0FBTTtJQUNQLENBQUM7SUFFRCxPQUFPLElBQUkseUJBQXlCLHFEQUVuQyxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFDakMsR0FBRyxFQUFFO1FBQ0osT0FBTyxhQUFhLENBQUE7SUFDckIsQ0FBQyxFQUNELEdBQUcsRUFBRTtRQUNKLGNBQWMsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3ZCLENBQUMsb0ZBRUQsQ0FBQTtBQUNGLENBQUMifQ==