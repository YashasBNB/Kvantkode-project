/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeybindingsRegistry, } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { BrowserTerminalProfileResolverService } from './terminalProfileResolverService.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
registerSingleton(ITerminalProfileResolverService, BrowserTerminalProfileResolverService, 1 /* InstantiationType.Delayed */);
// Register standard external terminal keybinding as integrated terminal when in web as the
// external terminal is not available
KeybindingsRegistry.registerKeybindingRule({
    id: "workbench.action.terminal.new" /* TerminalCommandId.New */,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: TerminalContextKeys.notFocus,
    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 33 /* KeyCode.KeyC */,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwud2ViLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWwud2ViLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBRU4sbUJBQW1CLEdBQ25CLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLCtCQUErQixFQUFxQixNQUFNLHVCQUF1QixDQUFBO0FBQzFGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVyRSxpQkFBaUIsQ0FDaEIsK0JBQStCLEVBQy9CLHFDQUFxQyxvQ0FFckMsQ0FBQTtBQUVELDJGQUEyRjtBQUMzRixxQ0FBcUM7QUFDckMsbUJBQW1CLENBQUMsc0JBQXNCLENBQUM7SUFDMUMsRUFBRSw2REFBdUI7SUFDekIsTUFBTSw2Q0FBbUM7SUFDekMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLFFBQVE7SUFDbEMsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZTtDQUNyRCxDQUFDLENBQUEifQ==