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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY29tbWFuZEd1aWRlLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NvbW1hbmRHdWlkZS9icm93c2VyL3Rlcm1pbmFsLmNvbW1hbmRHdWlkZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFPMUQsT0FBTyxFQUNOLDRCQUE0QixHQUc1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixpQ0FBaUMsR0FHakMsTUFBTSxnREFBZ0QsQ0FBQTtBQUV2RCxpQ0FBaUM7QUFFakMsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVOzthQUN4QyxPQUFFLEdBQUcsdUJBQXVCLEFBQTFCLENBQTBCO0lBRTVDLE1BQU0sQ0FBQyxHQUFHLENBQ1QsUUFBdUQ7UUFFdkQsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUM5QixrQ0FBZ0MsQ0FBQyxF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