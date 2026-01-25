/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getReplView } from './repl.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize } from '../../../../nls.js';
export class ReplAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'replHelp';
        this.when = ContextKeyExpr.equals('focusedView', 'workbench.panel.repl.view');
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const viewsService = accessor.get(IViewsService);
        const replView = getReplView(viewsService);
        if (!replView) {
            return undefined;
        }
        return new ReplAccessibilityHelpProvider(replView);
    }
}
class ReplAccessibilityHelpProvider extends Disposable {
    constructor(_replView) {
        super();
        this._replView = _replView;
        this.id = "replHelp" /* AccessibleViewProviderId.ReplHelp */;
        this.verbositySettingKey = "accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._treeHadFocus = false;
        this._treeHadFocus = !!_replView.getFocusedElement();
    }
    onClose() {
        if (this._treeHadFocus) {
            return this._replView.focusTree();
        }
        this._replView.getReplInput().focus();
    }
    provideContent() {
        return [
            localize('repl.help', 'The debug console is a Read-Eval-Print-Loop that allows you to evaluate expressions and run commands and can be focused with{0}.', '<keybinding:workbench.panel.repl.view.focus>'),
            localize('repl.output', 'The debug console output can be navigated to from the input field with the Focus Previous Widget command{0}.', '<keybinding:widgetNavigation.focusPrevious>'),
            localize('repl.input', 'The debug console input can be navigated to from the output with the Focus Next Widget command{0}.', '<keybinding:widgetNavigation.focusNext>'),
            localize('repl.history', 'The debug console output history can be navigated with the up and down arrow keys.'),
            localize('repl.accessibleView', 'The Open Accessible View command{0} will allow character by character navigation of the console output.', '<keybinding:editor.action.accessibleView>'),
            localize('repl.showRunAndDebug', 'The Show Run and Debug view command{0} will open the Run and Debug view and provides more information about debugging.', '<keybinding:workbench.view.debug>'),
            localize('repl.clear', 'The Debug: Clear Console command{0} will clear the console output.', '<keybinding:workbench.debug.panel.action.clearReplAction>'),
            localize('repl.lazyVariables', 'The setting `debug.expandLazyVariables` controls whether variables are evaluated automatically. This is enabled by default when using a screen reader.'),
        ].join('\n');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL3JlcGxBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQVEsTUFBTSxXQUFXLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxNQUFNLE9BQU8scUJBQXFCO0lBQWxDO1FBQ0MsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxVQUFVLENBQUE7UUFDakIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLDJCQUEyQixDQUFDLENBQUE7UUFDeEUsU0FBSSx3Q0FBOEM7SUFTbkQsQ0FBQztJQVJBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBQ0QsT0FBTyxJQUFJLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ25ELENBQUM7Q0FDRDtBQUVELE1BQU0sNkJBQThCLFNBQVEsVUFBVTtJQUtyRCxZQUE2QixTQUFlO1FBQzNDLEtBQUssRUFBRSxDQUFBO1FBRHFCLGNBQVMsR0FBVCxTQUFTLENBQU07UUFKNUIsT0FBRSxzREFBb0M7UUFDdEMsd0JBQW1CLCtFQUF3QztRQUMzRCxZQUFPLEdBQUcsRUFBRSxJQUFJLHNDQUF5QixFQUFFLENBQUE7UUFDbkQsa0JBQWEsR0FBRyxLQUFLLENBQUE7UUFHNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDckQsQ0FBQztJQUVNLE9BQU87UUFDYixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDbEMsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQUVNLGNBQWM7UUFDcEIsT0FBTztZQUNOLFFBQVEsQ0FDUCxXQUFXLEVBQ1gsa0lBQWtJLEVBQ2xJLDhDQUE4QyxDQUM5QztZQUNELFFBQVEsQ0FDUCxhQUFhLEVBQ2IsOEdBQThHLEVBQzlHLDZDQUE2QyxDQUM3QztZQUNELFFBQVEsQ0FDUCxZQUFZLEVBQ1osb0dBQW9HLEVBQ3BHLHlDQUF5QyxDQUN6QztZQUNELFFBQVEsQ0FDUCxjQUFjLEVBQ2Qsb0ZBQW9GLENBQ3BGO1lBQ0QsUUFBUSxDQUNQLHFCQUFxQixFQUNyQix5R0FBeUcsRUFDekcsMkNBQTJDLENBQzNDO1lBQ0QsUUFBUSxDQUNQLHNCQUFzQixFQUN0Qix3SEFBd0gsRUFDeEgsbUNBQW1DLENBQ25DO1lBQ0QsUUFBUSxDQUNQLFlBQVksRUFDWixvRUFBb0UsRUFDcEUsMkRBQTJELENBQzNEO1lBQ0QsUUFBUSxDQUNQLG9CQUFvQixFQUNwQix3SkFBd0osQ0FDeEo7U0FDRCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNiLENBQUM7Q0FDRCJ9