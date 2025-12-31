/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isReplEditorControl } from '../../replNotebook/browser/replEditor.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED } from '../common/notebookContextKeys.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
/**
 * The REPL input is already accessible, so we can show a view for the most recent execution output.
 */
export class ReplEditorAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'replEditorInput';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate());
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        return getAccessibleOutputProvider(editorService);
    }
}
export function getAccessibleOutputProvider(editorService) {
    const editorControl = editorService.activeEditorPane?.getControl();
    if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
        const notebookEditor = editorControl.notebookEditor;
        const viewModel = notebookEditor?.getViewModel();
        if (notebookEditor && viewModel) {
            // last cell of the viewmodel is the last cell history
            const lastCellIndex = viewModel.length - 1;
            if (lastCellIndex >= 0) {
                const cell = viewModel.viewCells[lastCellIndex];
                const outputContent = getAllOutputsText(viewModel.notebookDocument, cell);
                if (outputContent) {
                    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "view" /* AccessibleViewType.View */ }, () => {
                        return outputContent;
                    }, () => {
                        editorControl.activeCodeEditor?.focus();
                    }, "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */);
                }
            }
        }
    }
    return;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvckFjY2Vzc2libGVWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9yZXBsRWRpdG9yQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUVOLHlCQUF5QixHQUV6QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdkU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxpQkFBaUIsQ0FBQTtRQUN4QixTQUFJLHdDQUEwQjtRQUM5QixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBSy9GLENBQUM7SUFKQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUNsRCxPQUFPLDJCQUEyQixDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQ2xELENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxhQUE2QjtJQUN4RSxNQUFNLGFBQWEsR0FBRyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxFQUFFLENBQUE7SUFFbEUsSUFBSSxhQUFhLElBQUksbUJBQW1CLENBQUMsYUFBYSxDQUFDLElBQUksYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3pGLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyxjQUFjLENBQUE7UUFDbkQsTUFBTSxTQUFTLEdBQUcsY0FBYyxFQUFFLFlBQVksRUFBRSxDQUFBO1FBQ2hELElBQUksY0FBYyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLHNEQUFzRDtZQUN0RCxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUMxQyxJQUFJLGFBQWEsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDL0MsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUV6RSxJQUFJLGFBQWEsRUFBRSxDQUFDO29CQUNuQixPQUFPLElBQUkseUJBQXlCLHFEQUVuQyxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFDakMsR0FBRyxFQUFFO3dCQUNKLE9BQU8sYUFBYSxDQUFBO29CQUNyQixDQUFDLEVBQ0QsR0FBRyxFQUFFO3dCQUNKLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQTtvQkFDeEMsQ0FBQyx3RkFFRCxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFNO0FBQ1AsQ0FBQyJ9