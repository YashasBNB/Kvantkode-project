/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../editor/common/core/range.js';
import { CodeActionController } from '../../../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { CodeActionKind, CodeActionTriggerSource, } from '../../../../../../editor/contrib/codeAction/common/types.js';
import { localize, localize2 } from '../../../../../../nls.js';
import { registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { NotebookCellAction, findTargetCellEditor, } from '../../controller/coreActions.js';
import { CodeCellViewModel } from '../../viewModel/codeCellViewModel.js';
import { NOTEBOOK_CELL_EDITOR_FOCUSED, NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, } from '../../../common/notebookContextKeys.js';
import { InlineChatController } from '../../../../inlineChat/browser/inlineChatController.js';
import { showChatView } from '../../../../chat/browser/chat.js';
import { IViewsService } from '../../../../../services/views/common/viewsService.js';
export const OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID = 'notebook.cell.openFailureActions';
export const FIX_CELL_ERROR_COMMAND_ID = 'notebook.cell.chat.fixError';
export const EXPLAIN_CELL_ERROR_COMMAND_ID = 'notebook.cell.chat.explainError';
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: OPEN_CELL_FAILURE_ACTIONS_COMMAND_ID,
            title: localize2('notebookActions.cellFailureActions', 'Show Cell Failure Actions'),
            precondition: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
            f1: true,
            keybinding: {
                when: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 89 /* KeyCode.Period */,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell instanceof CodeCellViewModel) {
            const error = context.cell.executionErrorDiagnostic.get();
            if (error?.location) {
                const location = Range.lift({
                    startLineNumber: error.location.startLineNumber + 1,
                    startColumn: error.location.startColumn + 1,
                    endLineNumber: error.location.endLineNumber + 1,
                    endColumn: error.location.endColumn + 1,
                });
                context.notebookEditor.setCellEditorSelection(context.cell, Range.lift(location));
                const editor = findTargetCellEditor(context, context.cell);
                if (editor) {
                    const controller = CodeActionController.get(editor);
                    controller?.manualTriggerAtCurrentPosition(localize('cellCommands.quickFix.noneMessage', 'No code actions available'), CodeActionTriggerSource.Default, { include: CodeActionKind.QuickFix });
                }
            }
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: FIX_CELL_ERROR_COMMAND_ID,
            title: localize2('notebookActions.chatFixCellError', 'Fix Cell Error'),
            precondition: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell instanceof CodeCellViewModel) {
            const error = context.cell.executionErrorDiagnostic.get();
            if (error?.location) {
                const location = Range.lift({
                    startLineNumber: error.location.startLineNumber + 1,
                    startColumn: error.location.startColumn + 1,
                    endLineNumber: error.location.endLineNumber + 1,
                    endColumn: error.location.endColumn + 1,
                });
                context.notebookEditor.setCellEditorSelection(context.cell, Range.lift(location));
                const editor = findTargetCellEditor(context, context.cell);
                if (editor) {
                    const controller = InlineChatController.get(editor);
                    const message = error.name ? `${error.name}: ${error.message}` : error.message;
                    if (controller) {
                        await controller.run({
                            message: '/fix ' + message,
                            initialRange: location,
                            autoSend: true,
                        });
                    }
                }
            }
        }
    }
});
registerAction2(class extends NotebookCellAction {
    constructor() {
        super({
            id: EXPLAIN_CELL_ERROR_COMMAND_ID,
            title: localize2('notebookActions.chatExplainCellError', 'Explain Cell Error'),
            precondition: ContextKeyExpr.and(NOTEBOOK_CELL_FOCUSED, NOTEBOOK_CELL_HAS_ERROR_DIAGNOSTICS, NOTEBOOK_CELL_EDITOR_FOCUSED.toNegated()),
            f1: true,
        });
    }
    async runWithContext(accessor, context) {
        if (context.cell instanceof CodeCellViewModel) {
            const error = context.cell.executionErrorDiagnostic.get();
            if (error?.message) {
                const viewsService = accessor.get(IViewsService);
                const chatWidget = await showChatView(viewsService);
                const message = error.name ? `${error.name}: ${error.message}` : error.message;
                // TODO: can we add special prompt instructions? e.g. use "%pip install"
                chatWidget?.acceptInput('@workspace /explain ' + message);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2NlbGxEaWFnbm9zdGljcy9jZWxsRGlhZ25vc3RpY3NBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUNsSCxPQUFPLEVBQ04sY0FBYyxFQUNkLHVCQUF1QixHQUN2QixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUUzRixPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLG9CQUFvQixHQUNwQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIscUJBQXFCLEVBQ3JCLG1DQUFtQyxHQUNuQyxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEYsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsa0NBQWtD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