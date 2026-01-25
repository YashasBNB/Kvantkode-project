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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0FjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVyRixNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxVQUFVLENBQUE7UUFDakIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNsRixTQUFJLHdDQUE4QztJQVk1RCxDQUFDO0lBWEEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE1BQU0sWUFBWSxHQUNqQixRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUMsbUJBQW1CLEVBQUU7WUFDdEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixFQUFFO1lBQ3ZELFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsZ0JBQWdCLENBQUE7UUFFOUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDNUQsQ0FBQztDQUNEO0FBRUQsU0FBUyx3QkFBd0I7SUFDaEMsT0FBTztRQUNOLFFBQVEsQ0FDUCxtQkFBbUIsRUFDbkIsMklBQTJJLENBQzNJO1FBQ0QsUUFBUSxDQUNQLG9CQUFvQixFQUNwQix3REFBd0QsRUFDeEQsaUNBQWlDLENBQ2pDO1FBQ0QsUUFBUSxDQUNQLHdCQUF3QixFQUN4QiwrSkFBK0osRUFDL0oscUNBQXFDLENBQ3JDO1FBQ0QsUUFBUSxDQUNQLDZCQUE2QixFQUM3QixrRUFBa0UsRUFDbEUsMENBQTBDLENBQzFDO1FBQ0QsUUFBUSxDQUNQLDBCQUEwQixFQUMxQixpRkFBaUYsRUFDakYsdUNBQXVDLENBQ3ZDO1FBQ0QsUUFBUSxDQUNQLDhCQUE4QixFQUM5Qix5RkFBeUYsRUFDekYsMkNBQTJDLENBQzNDO1FBQ0QsUUFBUSxDQUNQLHlCQUF5QixFQUN6QixzR0FBc0csQ0FDdEc7UUFDRCxRQUFRLENBQ1Asd0NBQXdDLEVBQ3hDLHlFQUF5RSxFQUN6RSxxREFBcUQsQ0FDckQ7UUFDRCxRQUFRLENBQ1Asb0RBQW9ELEVBQ3BELGtGQUFrRixFQUNsRixnREFBZ0QsRUFDaEQsZ0RBQWdELENBQ2hEO1FBQ0QsUUFBUSxDQUNQLHlCQUF5QixFQUN6QixrRkFBa0YsQ0FDbEY7S0FDRCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNiLENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUNwQyxRQUEwQixFQUMxQixNQUF3QztJQUV4QyxNQUFNLFFBQVEsR0FBRyx3QkFBd0IsRUFBRSxDQUFBO0lBQzNDLE9BQU8sSUFBSSx5QkFBeUIscURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQ2QsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxvRkFFcEIsQ0FBQTtBQUNGLENBQUMifQ==