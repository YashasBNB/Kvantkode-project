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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuQW5kRGVidWdBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9ydW5BbmREZWJ1Z0FjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBU2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsc0JBQXNCLEVBQ3RCLGlCQUFpQixFQUNqQixhQUFhLEdBQ2IsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzQixNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBQ0MsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxpQkFBaUIsQ0FBQTtRQUN4QixTQUFJLEdBQUcsY0FBYyxDQUFDLEVBQUUsQ0FDdkIsY0FBYyxDQUFDLEdBQUcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLENBQUMsRUFDOUQsbUJBQW1CLENBQ25CLEVBQ0QsY0FBYyxDQUFDLE1BQU0sQ0FB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