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
import { localize } from '../../../../nls.js';
import { asCssVariable, asCssVariableName, registerColor, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { IDebugService } from '../common/debug.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { STATUS_BAR_FOREGROUND, STATUS_BAR_BORDER, COMMAND_CENTER_BACKGROUND, } from '../../../common/theme.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
// colors for theming
export const STATUS_BAR_DEBUGGING_BACKGROUND = registerColor('statusBar.debuggingBackground', {
    dark: '#CC6633',
    light: '#CC6633',
    hcDark: '#BA592C',
    hcLight: '#B5200D',
}, localize('statusBarDebuggingBackground', 'Status bar background color when a program is being debugged. The status bar is shown in the bottom of the window'));
export const STATUS_BAR_DEBUGGING_FOREGROUND = registerColor('statusBar.debuggingForeground', {
    dark: STATUS_BAR_FOREGROUND,
    light: STATUS_BAR_FOREGROUND,
    hcDark: STATUS_BAR_FOREGROUND,
    hcLight: '#FFFFFF',
}, localize('statusBarDebuggingForeground', 'Status bar foreground color when a program is being debugged. The status bar is shown in the bottom of the window'));
export const STATUS_BAR_DEBUGGING_BORDER = registerColor('statusBar.debuggingBorder', STATUS_BAR_BORDER, localize('statusBarDebuggingBorder', 'Status bar border color separating to the sidebar and editor when a program is being debugged. The status bar is shown in the bottom of the window'));
export const COMMAND_CENTER_DEBUGGING_BACKGROUND = registerColor('commandCenter.debuggingBackground', transparent(STATUS_BAR_DEBUGGING_BACKGROUND, 0.258), localize('commandCenter-activeBackground', 'Command center background color when a program is being debugged'), true);
let StatusBarColorProvider = class StatusBarColorProvider {
    set enabled(enabled) {
        if (enabled === !!this.disposable) {
            return;
        }
        if (enabled) {
            this.disposable = this.statusbarService.overrideStyle({
                priority: 10,
                foreground: STATUS_BAR_DEBUGGING_FOREGROUND,
                background: STATUS_BAR_DEBUGGING_BACKGROUND,
                border: STATUS_BAR_DEBUGGING_BORDER,
            });
        }
        else {
            this.disposable.dispose();
            this.disposable = undefined;
        }
    }
    constructor(debugService, contextService, statusbarService, layoutService, configurationService) {
        this.debugService = debugService;
        this.contextService = contextService;
        this.statusbarService = statusbarService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.disposables = new DisposableStore();
        this.debugService.onDidChangeState(this.update, this, this.disposables);
        this.contextService.onDidChangeWorkbenchState(this.update, this, this.disposables);
        this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.enableStatusBarColor') ||
                e.affectsConfiguration('debug.toolBarLocation')) {
                this.update();
            }
        }, undefined, this.disposables);
        this.update();
    }
    update() {
        const debugConfig = this.configurationService.getValue('debug');
        const isInDebugMode = isStatusbarInDebugMode(this.debugService.state, this.debugService.getModel().getSessions());
        if (!debugConfig.enableStatusBarColor) {
            this.enabled = false;
        }
        else {
            this.enabled = isInDebugMode;
        }
        const isInCommandCenter = debugConfig.toolBarLocation === 'commandCenter';
        this.layoutService.mainContainer.style.setProperty(asCssVariableName(COMMAND_CENTER_BACKGROUND), isInCommandCenter && isInDebugMode ? asCssVariable(COMMAND_CENTER_DEBUGGING_BACKGROUND) : '');
    }
    dispose() {
        this.disposable?.dispose();
        this.disposables.dispose();
    }
};
StatusBarColorProvider = __decorate([
    __param(0, IDebugService),
    __param(1, IWorkspaceContextService),
    __param(2, IStatusbarService),
    __param(3, ILayoutService),
    __param(4, IConfigurationService)
], StatusBarColorProvider);
export { StatusBarColorProvider };
export function isStatusbarInDebugMode(state, sessions) {
    if (state === 0 /* State.Inactive */ ||
        state === 1 /* State.Initializing */ ||
        sessions.every((s) => s.suppressDebugStatusbar || s.configuration?.noDebug)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyQ29sb3JQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvc3RhdHVzYmFyQ29sb3JQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUNOLGFBQWEsRUFDYixpQkFBaUIsRUFDakIsYUFBYSxFQUNiLFdBQVcsR0FDWCxNQUFNLG9EQUFvRCxDQUFBO0FBRTNELE9BQU8sRUFBRSxhQUFhLEVBQTZDLE1BQU0sb0JBQW9CLENBQUE7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIseUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVyRixxQkFBcUI7QUFFckIsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUMzRCwrQkFBK0IsRUFDL0I7SUFDQyxJQUFJLEVBQUUsU0FBUztJQUNmLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsUUFBUSxDQUNQLDhCQUE4QixFQUM5QixtSEFBbUgsQ0FDbkgsQ0FDRCxDQUFBO0FBRUQs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