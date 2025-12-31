import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED } from '../common/notebookContextKeys.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class NotebookAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'notebook';
        this.when = ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, IS_COMPOSITE_NOTEBOOK.negate());
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const activeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor() ||
            accessor.get(ICodeEditorService).getFocusedCodeEditor() ||
            accessor.get(IEditorService).activeEditorPane;
        if (!activeEditor) {
            return;
        }
        return getAccessibilityHelpProvider(accessor, activeEditor);
    }
}
function getAccessibilityHelpText() {
    return [
        localize('notebook.overview', 'The notebook view is a collection of code and markdown cells. Code cells can be executed and will produce output directly below the cell.'),
        localize('notebook.cell.edit', 'The Edit Cell command{0} will focus on the cell input.', '<keybinding:notebook.cell.edit>'),
        localize('notebook.cell.quitEdit', 'The Quit Edit command{0} will set focus on the cell container. The default (Escape) key may need to be pressed twice first exit the virtual cursor if active.', '<keybinding:notebook.cell.quitEdit>'),
        localize('notebook.cell.focusInOutput', "The Focus Output command{0} will set focus in the cell's output.", '<keybinding:notebook.cell.focusInOutput>'),
        localize('notebook.focusNextEditor', "The Focus Next Cell Editor command{0} will set focus in the next cell's editor.", '<keybinding:notebook.focusNextEditor>'),
        localize('notebook.focusPreviousEditor', "The Focus Previous Cell Editor command{0} will set focus in the previous cell's editor.", '<keybinding:notebook.focusPreviousEditor>'),
        localize('notebook.cellNavigation', 'The up and down arrows will also move focus between cells while focused on the outer cell container.'),
        localize('notebook.cell.executeAndFocusContainer', 'The Execute Cell command{0} executes the cell that currently has focus.', '<keybinding:notebook.cell.executeAndFocusContainer>'),
        localize('notebook.cell.insertCodeCellBelowAndFocusContainer', 'The Insert Cell Above{0} and Below{1} commands will create new empty code cells.', '<keybinding:notebook.cell.insertCodeCellAbove>', '<keybinding:notebook.cell.insertCodeCellBelow>'),
        localize('notebook.changeCellType', 'The Change Cell to Code/Markdown commands are used to switch between cell types.'),
    ].join('\n');
}
function getAccessibilityHelpProvider(accessor, editor) {
    const helpText = getAccessibilityHelpText();
    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => editor.focus(), "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUdOLHlCQUF5QixHQUN6QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsTUFBTSxPQUFPLHlCQUF5QjtJQUF0QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsVUFBVSxDQUFBO1FBQ2pCLFNBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDbEYsU0FBSSx3Q0FBOEM7SUFZNUQsQ0FBQztJQVhBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLFlBQVksR0FDakIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG1CQUFtQixFQUFFO1lBQ3RELFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxvQkFBb0IsRUFBRTtZQUN2RCxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQixDQUFBO1FBRTlDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUNELE9BQU8sNEJBQTRCLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFBO0lBQzVELENBQUM7Q0FDRDtBQUVELFNBQVMsd0JBQXdCO0lBQ2hDLE9BQU87UUFDTixRQUFRLENBQ1AsbUJBQW1CLEVBQ25CLDJJQUEySSxDQUMzSTtRQUNELFFBQVEsQ0FDUCxvQkFBb0IsRUFDcEIsd0RBQXdELEVBQ3hELGlDQUFpQyxDQUNqQztRQUNELFFBQVEsQ0FDUCx3QkFBd0IsRUFDeEIsK0pBQStKLEVBQy9KLHFDQUFxQyxDQUNyQztRQUNELFFBQVEsQ0FDUCw2QkFBNkIsRUFDN0Isa0VBQWtFLEVBQ2xFLDBDQUEwQyxDQUMxQztRQUNELFFBQVEsQ0FDUCwwQkFBMEIsRUFDMUIsaUZBQWlGLEVBQ2pGLHVDQUF1QyxDQUN2QztRQUNELFFBQVEsQ0FDUCw4QkFBOEIsRUFDOUIseUZBQXlGLEVBQ3pGLDJDQUEyQyxDQUMzQztRQUNELFFBQVEsQ0FDUCx5QkFBeUIsRUFDekIsc0dBQXNHLENBQ3RHO1FBQ0QsUUFBUSxDQUNQLHdDQUF3QyxFQUN4Qyx5RUFBeUUsRUFDekUscURBQXFELENBQ3JEO1FBQ0QsUUFBUSxDQUNQLG9EQUFvRCxFQUNwRCxrRkFBa0YsRUFDbEYsZ0RBQWdELEVBQ2hELGdEQUFnRCxDQUNoRDtRQUNELFFBQVEsQ0FDUCx5QkFBeUIsRUFDekIsa0ZBQWtGLENBQ2xGO0tBQ0QsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDYixDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FDcEMsUUFBMEIsRUFDMUIsTUFBd0M7SUFFeEMsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLEVBQUUsQ0FBQTtJQUMzQyxPQUFPLElBQUkseUJBQXlCLHFEQUVuQyxFQUFFLElBQUksc0NBQXlCLEVBQUUsRUFDakMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUNkLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsb0ZBRXBCLENBQUE7QUFDRixDQUFDIn0=