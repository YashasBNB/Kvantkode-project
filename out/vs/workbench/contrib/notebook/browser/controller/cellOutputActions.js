/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { NOTEBOOK_ACTIONS_CATEGORY } from './coreActions.js';
import { NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS, NOTEBOOK_CELL_HAS_OUTPUTS, } from '../../common/notebookContextKeys.js';
import * as icons from '../notebookIcons.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { copyCellOutput } from '../viewModel/cellOutputTextHelper.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane, } from '../notebookBrowser.js';
import { CellKind, CellUri } from '../../common/notebookCommon.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
export const COPY_OUTPUT_COMMAND_ID = 'notebook.cellOutput.copy';
registerAction2(class ShowAllOutputsAction extends Action2 {
    constructor() {
        super({
            id: 'notebook.cellOuput.showEmptyOutputs',
            title: localize('notebookActions.showAllOutput', 'Show empty outputs'),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_HAS_OUTPUTS, NOTEBOOK_CELL_HAS_HIDDEN_OUTPUTS),
            },
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
        });
    }
    run(accessor, context) {
        const cell = context.cell;
        if (cell && cell.cellKind === CellKind.Code) {
            for (let i = 1; i < cell.outputsViewModels.length; i++) {
                if (!cell.outputsViewModels[i].visible.get()) {
                    cell.outputsViewModels[i].setVisible(true, true);
                    cell.updateOutputHeight(i, 1, 'command');
                }
            }
        }
    }
});
registerAction2(class CopyCellOutputAction extends Action2 {
    constructor() {
        super({
            id: COPY_OUTPUT_COMMAND_ID,
            title: localize('notebookActions.copyOutput', 'Copy Cell Output'),
            menu: {
                id: MenuId.NotebookOutputToolbar,
                when: NOTEBOOK_CELL_HAS_OUTPUTS,
            },
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
        });
    }
    getNoteboookEditor(editorService, outputContext) {
        if (outputContext && 'notebookEditor' in outputContext) {
            return outputContext.notebookEditor;
        }
        return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    async run(accessor, outputContext) {
        const notebookEditor = this.getNoteboookEditor(accessor.get(IEditorService), outputContext);
        if (!notebookEditor) {
            return;
        }
        let outputViewModel;
        if (outputContext &&
            'outputId' in outputContext &&
            typeof outputContext.outputId === 'string') {
            outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
        }
        else if (outputContext && 'outputViewModel' in outputContext) {
            outputViewModel = outputContext.outputViewModel;
        }
        if (!outputViewModel) {
            // not able to find the output from the provided context, use the active cell
            const activeCell = notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (activeCell.focusedOutputId !== undefined) {
                outputViewModel = activeCell.outputsViewModels.find((output) => {
                    return output.model.outputId === activeCell.focusedOutputId;
                });
            }
            else {
                outputViewModel = activeCell.outputsViewModels.find((output) => output.pickedMimeType?.isTrusted);
            }
        }
        if (!outputViewModel) {
            return;
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        if (mimeType?.startsWith('image/')) {
            const focusOptions = {
                skipReveal: true,
                outputId: outputViewModel.model.outputId,
                altOutputId: outputViewModel.model.alternativeOutputId,
            };
            await notebookEditor.focusNotebookCell(outputViewModel.cellViewModel, 'output', focusOptions);
            notebookEditor.copyOutputImage(outputViewModel);
        }
        else {
            const clipboardService = accessor.get(IClipboardService);
            const logService = accessor.get(ILogService);
            copyCellOutput(mimeType, outputViewModel, clipboardService, logService);
        }
    }
});
export function getOutputViewModelFromId(outputId, notebookEditor) {
    const notebookViewModel = notebookEditor.getViewModel();
    if (notebookViewModel) {
        const codeCells = notebookViewModel.viewCells.filter((cell) => cell.cellKind === CellKind.Code);
        for (const cell of codeCells) {
            const output = cell.outputsViewModels.find((output) => output.model.outputId === outputId || output.model.alternativeOutputId === outputId);
            if (output) {
                return output;
            }
        }
    }
    return undefined;
}
export const OPEN_OUTPUT_COMMAND_ID = 'notebook.cellOutput.openInTextEditor';
registerAction2(class OpenCellOutputInEditorAction extends Action2 {
    constructor() {
        super({
            id: OPEN_OUTPUT_COMMAND_ID,
            title: localize('notebookActions.openOutputInEditor', 'Open Cell Output in Text Editor'),
            f1: false,
            category: NOTEBOOK_ACTIONS_CATEGORY,
            icon: icons.copyIcon,
        });
    }
    getNoteboookEditor(editorService, outputContext) {
        if (outputContext && 'notebookEditor' in outputContext) {
            return outputContext.notebookEditor;
        }
        return getNotebookEditorFromEditorPane(editorService.activeEditorPane);
    }
    async run(accessor, outputContext) {
        const notebookEditor = this.getNoteboookEditor(accessor.get(IEditorService), outputContext);
        const notebookModelService = accessor.get(INotebookEditorModelResolverService);
        if (!notebookEditor) {
            return;
        }
        let outputViewModel;
        if (outputContext &&
            'outputId' in outputContext &&
            typeof outputContext.outputId === 'string') {
            outputViewModel = getOutputViewModelFromId(outputContext.outputId, notebookEditor);
        }
        else if (outputContext && 'outputViewModel' in outputContext) {
            outputViewModel = outputContext.outputViewModel;
        }
        const openerService = accessor.get(IOpenerService);
        if (outputViewModel?.model.outputId && notebookEditor.textModel?.uri) {
            // reserve notebook document reference since the active notebook editor might not be pinned so it can be replaced by the output editor
            const ref = await notebookModelService.resolve(notebookEditor.textModel.uri);
            await openerService.open(CellUri.generateCellOutputUriWithId(notebookEditor.textModel.uri, outputViewModel.model.outputId));
            ref.dispose();
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbE91dHB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyb2xsZXIvY2VsbE91dHB1dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNoRixPQUFPLEVBQWdDLHlCQUF5QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDMUYsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyx5QkFBeUIsR0FDekIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEtBQUssS0FBSyxNQUFNLHFCQUFxQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFJTiwrQkFBK0IsR0FDL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV4RyxNQUFNLENBQUMsTUFBTSxz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