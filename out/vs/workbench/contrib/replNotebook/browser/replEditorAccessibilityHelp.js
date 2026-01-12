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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZXBsTm90ZWJvb2svYnJvd3Nlci9yZXBsRWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBR04seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFFckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUNOLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FDMUIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVyRCxNQUFNLE9BQU8sZ0NBQWdDO0lBQTdDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxtQkFBbUIsQ0FBQTtRQUMxQixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLFNBQUksd0NBQThDO0lBTzVELENBQUM7SUFOQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsT0FBTyw0QkFBNEIsQ0FDbEMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUNoQyw2QkFBNkIsRUFBRSxDQUMvQixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsU0FBUyw2QkFBNkI7SUFDckMsT0FBTztRQUNOLFFBQVEsQ0FDUCwwQkFBMEIsRUFDMUIsdUZBQXVGLENBQ3ZGO1FBQ0QsUUFBUSxDQUNQLG9CQUFvQixFQUNwQix1RUFBdUUsRUFDdkUsMkJBQTJCLENBQzNCO1FBQ0QsUUFBUSxDQUNQLGdDQUFnQyxFQUNoQyx3SUFBd0ksQ0FDeEk7UUFDRCxRQUFRLENBQ1AsMEJBQTBCLEVBQzFCLDJJQUEySSxDQUMzSTtRQUNELFFBQVEsQ0FDUCwrQkFBK0IsRUFDL0IsbUdBQW1HLEVBQ25HLHlDQUF5QyxDQUN6QztRQUNELFFBQVEsQ0FDUCxtQ0FBbUMsRUFDbkMscUpBQXFKLEVBQ3JKLDJDQUEyQyxDQUMzQztRQUNELFFBQVEsQ0FDUCwyQkFBMkIsRUFDM0IsNkVBQTZFLEVBQzdFLCtCQUErQixDQUMvQjtLQUNELENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sT0FBTyxrQ0FBa0M7SUFBL0M7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFBO1FBQ2QsU0FBSSxHQUFHLHFCQUFxQixDQUFBO1FBQzVCLFNBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDNUUsU0FBSSx3Q0FBOEM7SUFPNUQsQ0FBQztJQU5BLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxPQUFPLDRCQUE0QixDQUNsQyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQ2hDLCtCQUErQixFQUFFLENBQ2pDLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxTQUFTLCtCQUErQjtJQUN2QyxPQUFPO1FBQ04sUUFBUSxDQUNQLDRCQUE0QixFQUM1QixvSkFBb0osQ0FDcEo7UUFDRCxRQUFRLENBQ1AsNEJBQTRCLEVBQzVCLDZGQUE2RixFQUM3RixpQ0FBaUMsQ0FDakM7UUFDRCxRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLGlKQUFpSixFQUNqSixxQ0FBcUMsQ0FDckM7UUFDRCxRQUFRLENBQ1AsOEJBQThCLEVBQzlCLHFIQUFxSCxFQUNySCwyQ0FBMkMsQ0FDM0M7UUFDRCxRQUFRLENBQ1AsMEJBQTBCLEVBQzFCLHNHQUFzRyxFQUN0RywwQ0FBMEMsQ0FDMUM7UUFDRCxRQUFRLENBQ1Asc0NBQXNDLEVBQ3RDLDBFQUEwRSxFQUMxRSwrQkFBK0IsQ0FDL0I7UUFDRCxRQUFRLENBQ1AsK0JBQStCLEVBQy9CLG1HQUFtRyxFQUNuRyx5Q0FBeUMsQ0FDekM7S0FDRCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNiLENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLGFBQWlDLEVBQUUsUUFBZ0I7SUFDeEYsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixFQUFFLElBQUksYUFBYSxDQUFDLG9CQUFvQixFQUFFLENBQUE7SUFFaEcsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25CLE9BQU07SUFDUCxDQUFDO0lBRUQsT0FBTyxJQUFJLHlCQUF5Qix5REFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFDZCxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLHdGQUUxQixDQUFBO0FBQ0YsQ0FBQyJ9