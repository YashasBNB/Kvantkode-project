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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yZXBsQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFRLE1BQU0sV0FBVyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsTUFBTSxPQUFPLHFCQUFxQjtJQUFsQztRQUNDLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsVUFBVSxDQUFBO1FBQ2pCLFNBQUksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBO1FBQ3hFLFNBQUksd0NBQThDO0lBU25ELENBQUM7SUFSQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNoRCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDMUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLDZCQUE4QixTQUFRLFVBQVU7SUFLckQsWUFBNkIsU0FBZTtRQUMzQyxLQUFLLEVBQUUsQ0FBQTtRQURxQixjQUFTLEdBQVQsU0FBUyxDQUFNO1FBSjVCLE9BQUUsc0RBQW9DO1FBQ3RDLHdCQUFtQiwrRUFBd0M7UUFDM0QsWUFBTyxHQUFHLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxDQUFBO1FBQ25ELGtCQUFhLEdBQUcsS0FBSyxDQUFBO1FBRzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3JELENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ2xDLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3RDLENBQUM7SUFFTSxjQUFjO1FBQ3BCLE9BQU87WUFDTixRQUFRLENBQ1AsV0FBVyxFQUNYLGtJQUFrSSxFQUNsSSw4Q0FBOEMsQ0FDOUM7WUFDRCxRQUFRLENBQ1AsYUFBYSxFQUNiLDhHQUE4RyxFQUM5Ryw2Q0FBNkMsQ0FDN0M7WUFDRCxRQUFRLENBQ1AsWUFBWSxFQUNaLG9HQUFvRyxFQUNwRyx5Q0FBeUMsQ0FDekM7WUFDRCxRQUFRLENBQ1AsY0FBYyxFQUNkLG9GQUFvRixDQUNwRjtZQUNELFFBQVEsQ0FDUCxxQkFBcUIsRUFDckIseUdBQXlHLEVBQ3pHLDJDQUEyQyxDQUMzQztZQUNELFFBQVEsQ0FDUCxzQkFBc0IsRUFDdEIsd0hBQXdILEVBQ3hILG1DQUFtQyxDQUNuQztZQUNELFFBQVEsQ0FDUCxZQUFZLEVBQ1osb0VBQW9FLEVBQ3BFLDJEQUEyRCxDQUMzRDtZQUNELFFBQVEsQ0FDUCxvQkFBb0IsRUFDcEIsd0pBQXdKLENBQ3hKO1NBQ0QsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDYixDQUFDO0NBQ0QifQ==