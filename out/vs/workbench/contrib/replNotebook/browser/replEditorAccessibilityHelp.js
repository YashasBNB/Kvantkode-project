import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED, } from '../../notebook/common/notebookContextKeys.js';
export class ReplEditorInputAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'REPL Editor Input';
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate());
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return getAccessibilityHelpProvider(accessor.get(ICodeEditorService), getAccessibilityInputHelpText());
    }
}
function getAccessibilityInputHelpText() {
    return [
        localize('replEditor.inputOverview', 'You are in a REPL Editor Input box which will accept code to be executed in the REPL.'),
        localize('replEditor.execute', 'The Execute command{0} will evaluate the expression in the input box.', '<keybinding:repl.execute>'),
        localize('replEditor.configReadExecution', 'The setting `accessibility.replEditor.readLastExecutionOutput` controls if output will be automatically read when execution completes.'),
        localize('replEditor.autoFocusRepl', 'The setting `accessibility.replEditor.autoFocusReplExecution` controls if focus will automatically move to the REPL after executing code.'),
        localize('replEditor.focusLastItemAdded', 'The Focus Last executed command{0} will move focus to the last executed item in the REPL history.', '<keybinding:repl.focusLastItemExecuted>'),
        localize('replEditor.inputAccessibilityView', 'When you run the Open Accessbility View command{0} from this input box, the output from the last execution will be shown in the accessibility view.', '<keybinding:editor.action.accessibleView>'),
        localize('replEditor.focusReplInput', 'The Focus Input Editor command{0} will bring the focus back to this editor.', '<keybinding:repl.input.focus>'),
    ].join('\n');
}
export class ReplEditorHistoryAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'REPL Editor History';
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED);
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return getAccessibilityHelpProvider(accessor.get(ICodeEditorService), getAccessibilityHistoryHelpText());
    }
}
function getAccessibilityHistoryHelpText() {
    return [
        localize('replEditor.historyOverview', 'You are in a REPL History which is a list of cells that have been executed in the REPL. Each cell has an input, an output, and the cell container.'),
        localize('replEditor.focusCellEditor', 'The Edit Cell command{0} will move focus to the read-only editor for the input of the cell.', '<keybinding:notebook.cell.edit>'),
        localize('replEditor.cellNavigation', 'The Quit Edit command{0} will move focus to the cell container, where the up and down arrows will also move focus between cells in the history.', '<keybinding:notebook.cell.quitEdit>'),
        localize('replEditor.accessibilityView', "Run the Open Accessbility View command{0} while navigating the history for an accessible view of the item's output.", '<keybinding:editor.action.accessibleView>'),
        localize('replEditor.focusInOutput', 'The Focus Output command{0} will set focus on the output when focused on a previously executed item.', '<keybinding:notebook.cell.focusInOutput>'),
        localize('replEditor.focusReplInputFromHistory', 'The Focus Input Editor command{0} will move focus to the REPL input box.', '<keybinding:repl.input.focus>'),
        localize('replEditor.focusLastItemAdded', 'The Focus Last executed command{0} will move focus to the last executed item in the REPL history.', '<keybinding:repl.focusLastItemExecuted>'),
    ].join('\n');
}
function getAccessibilityHelpProvider(editorService, helpText) {
    const activeEditor = editorService.getActiveCodeEditor() || editorService.getFocusedCodeEditor();
    if (!activeEditor) {
        return;
    }
    return new AccessibleContentProvider("replEditor" /* AccessibleViewProviderId.ReplEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => activeEditor.focus(), "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcmVwbE5vdGVib29rL2Jyb3dzZXIvcmVwbEVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUdOLHlCQUF5QixHQUN6QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsMEJBQTBCLEdBQzFCLE1BQU0sOENBQThDLENBQUE7QUFFckQsTUFBTSxPQUFPLGdDQUFnQztJQUE3QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsbUJBQW1CLENBQUE7UUFDMUIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUNyRixTQUFJLHdDQUE4QztJQU81RCxDQUFDO0lBTkEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE9BQU8sNEJBQTRCLENBQ2xDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFDaEMsNkJBQTZCLEVBQUUsQ0FDL0IsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELFNBQVMsNkJBQTZCO0lBQ3JDLE9BQU87UUFDTixRQUFRLENBQ1AsMEJBQTBCLEVBQzFCLHVGQUF1RixDQUN2RjtRQUNELFFBQVEsQ0FDUCxvQkFBb0IsRUFDcEIsdUVBQXVFLEVBQ3ZFLDJCQUEyQixDQUMzQjtRQUNELFFBQVEsQ0FDUCxnQ0FBZ0MsRUFDaEMsd0lBQXdJLENBQ3hJO1FBQ0QsUUFBUSxDQUNQLDBCQUEwQixFQUMxQiwySUFBMkksQ0FDM0k7UUFDRCxRQUFRLENBQ1AsK0JBQStCLEVBQy9CLG1HQUFtRyxFQUNuRyx5Q0FBeUMsQ0FDekM7UUFDRCxRQUFRLENBQ1AsbUNBQW1DLEVBQ25DLHFKQUFxSixFQUNySiwyQ0FBMkMsQ0FDM0M7UUFDRCxRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLDZFQUE2RSxFQUM3RSwrQkFBK0IsQ0FDL0I7S0FDRCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNiLENBQUM7QUFFRCxNQUFNLE9BQU8sa0NBQWtDO0lBQS9DO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxxQkFBcUIsQ0FBQTtRQUM1QixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFBO1FBQzVFLFNBQUksd0NBQThDO0lBTzVELENBQUM7SUFOQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsT0FBTyw0QkFBNEIsQ0FDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNoQywrQkFBK0IsRUFBRSxDQUNqQyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsU0FBUywrQkFBK0I7SUFDdkMsT0FBTztRQUNOLFFBQVEsQ0FDUCw0QkFBNEIsRUFDNUIsb0pBQW9KLENBQ3BKO1FBQ0QsUUFBUSxDQUNQLDRCQUE0QixFQUM1Qiw2RkFBNkYsRUFDN0YsaUNBQWlDLENBQ2pDO1FBQ0QsUUFBUSxDQUNQLDJCQUEyQixFQUMzQixpSkFBaUosRUFDakoscUNBQXFDLENBQ3JDO1FBQ0QsUUFBUSxDQUNQLDhCQUE4QixFQUM5QixxSEFBcUgsRUFDckgsMkNBQTJDLENBQzNDO1FBQ0QsUUFBUSxDQUNQLDBCQUEwQixFQUMxQixzR0FBc0csRUFDdEcsMENBQTBDLENBQzFDO1FBQ0QsUUFBUSxDQUNQLHNDQUFzQyxFQUN0QywwRUFBMEUsRUFDMUUsK0JBQStCLENBQy9CO1FBQ0QsUUFBUSxDQUNQLCtCQUErQixFQUMvQixtR0FBbUcsRUFDbkcseUNBQXlDLENBQ3pDO0tBQ0QsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDYixDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FBQyxhQUFpQyxFQUFFLFFBQWdCO0lBQ3hGLE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBRWhHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuQixPQUFNO0lBQ1AsQ0FBQztJQUVELE9BQU8sSUFBSSx5QkFBeUIseURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQ2QsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSx3RkFFMUIsQ0FBQTtBQUNGLENBQUMifQ==