/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { AccessibilityHelpNLS } from '../../../../editor/common/standaloneStrings.js';
import { FocusedViewContext, SidebarFocusContext } from '../../../common/contextkeys.js';
import { BREAKPOINTS_VIEW_ID, CALLSTACK_VIEW_ID, LOADED_SCRIPTS_VIEW_ID, VARIABLES_VIEW_ID, WATCH_VIEW_ID, } from '../common/debug.js';
export class RunAndDebugAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'runAndDebugHelp';
        this.when = ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('activeViewlet', 'workbench.view.debug'), SidebarFocusContext), ContextKeyExpr.equals(FocusedViewContext.key, VARIABLES_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, WATCH_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, CALLSTACK_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, LOADED_SCRIPTS_VIEW_ID), ContextKeyExpr.equals(FocusedViewContext.key, BREAKPOINTS_VIEW_ID));
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return new RunAndDebugAccessibilityHelpProvider(accessor.get(ICommandService), accessor.get(IViewsService));
    }
}
let RunAndDebugAccessibilityHelpProvider = class RunAndDebugAccessibilityHelpProvider extends Disposable {
    constructor(_commandService, _viewsService) {
        super();
        this._commandService = _commandService;
        this._viewsService = _viewsService;
        this.id = "runAndDebug" /* AccessibleViewProviderId.RunAndDebug */;
        this.verbositySettingKey = "accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._focusedView = this._viewsService.getFocusedViewName();
    }
    onClose() {
        switch (this._focusedView) {
            case 'Watch':
                this._commandService.executeCommand('workbench.debug.action.focusWatchView');
                break;
            case 'Variables':
                this._commandService.executeCommand('workbench.debug.action.focusVariablesView');
                break;
            case 'Call Stack':
                this._commandService.executeCommand('workbench.debug.action.focusCallStackView');
                break;
            case 'Breakpoints':
                this._commandService.executeCommand('workbench.debug.action.focusBreakpointsView');
                break;
            default:
                this._commandService.executeCommand('workbench.view.debug');
        }
    }
    provideContent() {
        return [
            localize('debug.showRunAndDebug', 'The Show Run and Debug view command{0} will open the current view.', '<keybinding:workbench.view.debug>'),
            localize('debug.startDebugging', 'The Debug: Start Debugging command{0} will start a debug session.', '<keybinding:workbench.action.debug.start>'),
            localize('debug.help', 'Access debug output and evaluate expressions in the debug console, which can be focused with{0}.', '<keybinding:workbench.panel.repl.view.focus>'),
            AccessibilityHelpNLS.setBreakpoint,
            AccessibilityHelpNLS.addToWatch,
            localize('onceDebugging', 'Once debugging, the following commands will be available:'),
            localize('debug.restartDebugging', '- Debug: Restart Debugging command{0} will restart the current debug session.', '<keybinding:workbench.action.debug.restart>'),
            localize('debug.stopDebugging', '- Debug: Stop Debugging command{0} will stop the current debugging session.', '<keybinding:workbench.action.debug.stop>'),
            localize('debug.continue', '- Debug: Continue command{0} will continue execution until the next breakpoint.', '<keybinding:workbench.action.debug.continue>'),
            localize('debug.stepInto', '- Debug: Step Into command{0} will step into the next function call.', '<keybinding:workbench.action.debug.stepInto>'),
            localize('debug.stepOver', '- Debug: Step Over command{0} will step over the current function call.', '<keybinding:workbench.action.debug.stepOver>'),
            localize('debug.stepOut', '- Debug: Step Out command{0} will step out of the current function call.', '<keybinding:workbench.action.debug.stepOut>'),
            localize('debug.views', 'The debug viewlet is comprised of several views that can be focused with the following commands or navigated to via tab then arrow keys:'),
            localize('debug.focusBreakpoints', '- Debug: Focus Breakpoints View command{0} will focus the breakpoints view.', '<keybinding:workbench.debug.action.focusBreakpointsView>'),
            localize('debug.focusCallStack', '- Debug: Focus Call Stack View command{0} will focus the call stack view.', '<keybinding:workbench.debug.action.focusCallStackView>'),
            localize('debug.focusVariables', '- Debug: Focus Variables View command{0} will focus the variables view.', '<keybinding:workbench.debug.action.focusVariablesView>'),
            localize('debug.focusWatch', '- Debug: Focus Watch View command{0} will focus the watch view.', '<keybinding:workbench.debug.action.focusWatchView>'),
            localize('debug.watchSetting', 'The setting {0} controls whether watch variable changes are announced.', 'accessibility.debugWatchVariableAnnouncements'),
        ].join('\n');
    }
};
RunAndDebugAccessibilityHelpProvider = __decorate([
    __param(0, ICommandService),
    __param(1, IViewsService)
], RunAndDebugAccessibilityHelpProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuQW5kRGVidWdBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvcnVuQW5kRGVidWdBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQVNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3hGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsaUJBQWlCLEVBQ2pCLHNCQUFzQixFQUN0QixpQkFBaUIsRUFDakIsYUFBYSxHQUNiLE1BQU0sb0JBQW9CLENBQUE7QUFFM0IsTUFBTSxPQUFPLDRCQUE0QjtJQUF6QztRQUNDLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsaUJBQWlCLENBQUE7UUFDeEIsU0FBSSxHQUFHLGNBQWMsQ0FBQyxFQUFFLENBQ3ZCLGNBQWMsQ0FBQyxHQUFHLENBQ2pCLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLHNCQUFzQixDQUFDLEVBQzlELG1CQUFtQixDQUNuQixFQUNELGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFF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