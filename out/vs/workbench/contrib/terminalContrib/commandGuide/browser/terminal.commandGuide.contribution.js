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
var TerminalCommandGuideContribution_1;
import { addDisposableListener } from '../../../../../base/browser/dom.js';
import { combinedDisposable, Disposable, MutableDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { listInactiveSelectionBackground } from '../../../../../platform/theme/common/colorRegistry.js';
import { registerColor, transparent } from '../../../../../platform/theme/common/colorUtils.js';
import { PANEL_BORDER } from '../../../../common/theme.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { terminalCommandGuideConfigSection, } from '../common/terminalCommandGuideConfiguration.js';
// #region Terminal Contributions
let TerminalCommandGuideContribution = class TerminalCommandGuideContribution extends Disposable {
    static { TerminalCommandGuideContribution_1 = this; }
    static { this.ID = 'terminal.commandGuide'; }
    static get(instance) {
        return instance.getContribution(TerminalCommandGuideContribution_1.ID);
    }
    constructor(_ctx, _configurationService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._activeCommandGuide = this._register(new MutableDisposable());
    }
    xtermOpen(xterm) {
        this._xterm = xterm;
        this._refreshActivatedState();
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.shellIntegration.showCommandGuide" /* TerminalCommandGuideSettingId.ShowCommandGuide */)) {
                this._refreshActivatedState();
            }
        }));
    }
    _refreshActivatedState() {
        const xterm = this._xterm;
        if (!xterm) {
            return;
        }
        const showCommandGuide = this._configurationService.getValue(terminalCommandGuideConfigSection).showCommandGuide;
        if (!!this._activeCommandGuide.value === showCommandGuide) {
            return;
        }
        if (!showCommandGuide) {
            this._activeCommandGuide.clear();
        }
        else {
            const screenElement = xterm.raw.element.querySelector('.xterm-screen');
            const viewportElement = xterm.raw.element.querySelector('.xterm-viewport');
            this._activeCommandGuide.value = combinedDisposable(addDisposableListener(screenElement, 'mousemove', (e) => this._tryShowHighlight(screenElement, xterm, e)), addDisposableListener(viewportElement, 'mousemove', (e) => this._tryShowHighlight(screenElement, xterm, e)), addDisposableListener(xterm.raw.element, 'mouseleave', () => xterm.markTracker.showCommandGuide(undefined)), xterm.raw.onData(() => xterm.markTracker.showCommandGuide(undefined)), toDisposable(() => xterm.markTracker.showCommandGuide(undefined)));
        }
    }
    _tryShowHighlight(element, xterm, e) {
        const rect = element.getBoundingClientRect();
        if (!rect) {
            return;
        }
        const mouseCursorY = Math.floor((e.clientY - rect.top) / (rect.height / xterm.raw.rows));
        const command = this._ctx.instance.capabilities
            .get(2 /* TerminalCapability.CommandDetection */)
            ?.getCommandForLine(xterm.raw.buffer.active.viewportY + mouseCursorY);
        if (command && 'getOutput' in command) {
            xterm.markTracker.showCommandGuide(command);
        }
        else {
            xterm.markTracker.showCommandGuide(undefined);
        }
    }
};
TerminalCommandGuideContribution = TerminalCommandGuideContribution_1 = __decorate([
    __param(1, IConfigurationService)
], TerminalCommandGuideContribution);
registerTerminalContribution(TerminalCommandGuideContribution.ID, TerminalCommandGuideContribution, false);
export const TERMINAL_COMMAND_GUIDE_COLOR = registerColor('terminalCommandGuide.foreground', {
    dark: transparent(listInactiveSelectionBackground, 1),
    light: transparent(listInactiveSelectionBackground, 1),
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER,
}, localize('terminalCommandGuide.foreground', 'The foreground color of the terminal command guide that appears to the left of a command and its output on hover.'));
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29tbWFuZEd1aWRlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jb21tYW5kR3VpZGUvYnJvd3Nlci90ZXJtaW5hbC5jb21tYW5kR3VpZGUuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFVBQVUsRUFDVixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBTzFELE9BQU8sRUFDTiw0QkFBNEIsR0FHNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04saUNBQWlDLEdBR2pDLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsaUNBQWlDO0FBRWpDLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsVUFBVTs7YUFDeEMsT0FBRSxHQUFHLHVCQUF1QixBQUExQixDQUEwQjtJQUU1QyxNQUFNLENBQUMsR0FBRyxDQUNULFFBQXVEO1FBRXZELE9BQU8sUUFBUSxDQUFDLGVBQWUsQ0FDOUIsa0NBQWdDLENBQUMsRUFBRSxD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