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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERpYWdub3N0aWNzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9jZWxsRGlhZ25vc3RpY3MvY2VsbERpYWdub3N0aWNzQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkVBQTZFLENBQUE7QUFDbEgsT0FBTyxFQUNOLGNBQWMsRUFDZCx1QkFBdUIsR0FDdkIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFM0YsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixvQkFBb0IsR0FDcEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHFCQUFxQixFQUNyQixtQ0FBbUMsR0FDbkMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLGtDQUFrQyxDQUFBO0FBQ3RGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLDZCQUE2QixDQUFBO0FBQ3RFLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLGlDQUFpQyxDQUFBO0FBRTlFLGVBQWUsQ0FDZCxLQUFNLFNBQVEsa0JBQWtCO0lBQy9CO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLG9DQUFvQztZQUN4QyxLQUFLLEVBQUUsU0FBUyxDQUFDLG9DQUFvQyxFQUFFLDJCQUEyQixDQUFDO1lBQ25GLFlBQVksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUMvQixxQkFBcUIsRUFDckIsbUNBQW1DLEVBQ25DLDRCQUE0QixDQUFDLFNBQVMsRUFBRSxDQUN4QztZQUNELEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRSxjQUFjLENBQUMsR0FBRyxDQUN2QixxQkFBcUIsRUFDckIsbUNBQW1DLEVBQ25DLDRCQUE0QixDQUFDLFNBQVMsRUFBRSxDQUN4QztnQkFDRCxPQUFPLEVBQUUsbURBQStCO2dCQUN4QyxNQUFNLDZDQUFtQzthQUN6QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUNuQixRQUEwQixFQUMxQixPQUFtQztRQUVuQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLFlBQVksaUJBQWlCLEVBQUUsQ0FBQztZQUMvQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ3pELElBQUksS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUNyQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO29CQUMzQixlQUFlLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsQ0FBQztvQkFDbkQsV0FBVyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLENBQUM7b0JBQzNDLGFBQWEsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsR0FBRyxDQUFDO29CQUMvQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQztpQkFDdkMsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7Z0JBQ2pGLE1BQU0sTUFBTSxHQUFHLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzFELElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1osTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUNuRCxVQUFVLEVBQUUsOEJBQThCLENBQ3pDLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSwyQkFBMkIsQ0FBQyxFQUMxRSx1QkFBdUIsQ0FBQyxPQUFPLEVBQy9CLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FDcEMsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxrQkFBa0I7SUFDL0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUseUJBQXlCO1lBQzdCLEtBQUssRUFBRSxTQUFTLENBQUMsa0NBQWtDLEVBQUUsZ0JBQWdCLENBQUM7WUFDdEUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLHFCQUFxQixFQUNyQixtQ0FBbUMsRUFDbkMsNEJBQTRCLENBQUMsU0FBUyxFQUFFLENBQ3hDO1lBQ0QsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsUUFBMEIsRUFDMUIsT0FBbUM7UUFFbkMsSUFBSSxPQUFPLENBQUMsSUFBSSxZQUFZLGlCQUFpQixFQUFFLENBQUM7WUFDL0MsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUN6RCxJQUFJLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztnQkFDckIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDM0IsZUFBZSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLENBQUM7b0JBQ25ELFdBQVcsRUFBRSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUFDO29CQUMzQyxhQUFhLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEdBQUcsQ0FBQztvQkFDL0MsU0FBUyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLENBQUM7aUJBQ3ZDLENBQUMsQ0FBQTtnQkFDRixPQUFPLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO2dCQUNqRixNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxRCxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNaLE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFDbkQsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQTtvQkFDOUUsSUFBSSxVQUFVLEVBQUUsQ0FBQzt3QkFDaEIsTUFBTSxVQUFVLENBQUMsR0FBRyxDQUFDOzRCQUNwQixPQUFPLEVBQUUsT0FBTyxHQUFHLE9BQU87NEJBQzFCLFlBQVksRUFBRSxRQUFROzRCQUN0QixRQUFRLEVBQUUsSUFBSTt5QkFDZCxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxrQkFBa0I7SUFDL0I7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNkJBQTZCO1lBQ2pDLEtBQUssRUFBRSxTQUFTLENBQUMsc0NBQXNDLEVBQUUsb0JBQW9CLENBQUM7WUFDOUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQy9CLHFCQUFxQixFQUNyQixtQ0FBbUMsRUFDbkMsNEJBQTRCLENBQUMsU0FBUyxFQUFFLENBQ3hDO1lBQ0QsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWMsQ0FDbkIsUUFBMEIsRUFDMUIsT0FBbUM7UUFFbkMsSUFBSSxPQUFPLENBQUMsSUFBSSxZQUFZLGlCQUFpQixFQUFFLENBQUM7WUFDL0MsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtZQUN6RCxJQUFJLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDaEQsTUFBTSxVQUFVLEdBQUcsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ25ELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUE7Z0JBQzlFLHdFQUF3RTtnQkFDeEUsVUFBVSxFQUFFLFdBQVcsQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUEifQ==