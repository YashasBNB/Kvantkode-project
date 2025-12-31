/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/stickyScroll.css';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalStickyScrollContribution } from './terminalStickyScrollContribution.js';
// #region Terminal Contributions
registerTerminalContribution(TerminalStickyScrollContribution.ID, TerminalStickyScrollContribution);
// #endregion
// #region Actions
var TerminalStickyScrollCommandId;
(function (TerminalStickyScrollCommandId) {
    TerminalStickyScrollCommandId["ToggleStickyScroll"] = "workbench.action.terminal.toggleStickyScroll";
})(TerminalStickyScrollCommandId || (TerminalStickyScrollCommandId = {}));
registerTerminalAction({
    id: "workbench.action.terminal.toggleStickyScroll" /* TerminalStickyScrollCommandId.ToggleStickyScroll */,
    title: localize2('workbench.action.terminal.toggleStickyScroll', 'Toggle Sticky Scroll'),
    toggled: {
        condition: ContextKeyExpr.equals(`config.${"terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */}`, true),
        title: localize('stickyScroll', 'Sticky Scroll'),
        mnemonicTitle: localize({ key: 'miStickyScroll', comment: ['&& denotes a mnemonic'] }, '&&Sticky Scroll'),
    },
    run: (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        const newValue = !configurationService.getValue("terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */);
        return configurationService.updateValue("terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */, newValue);
    },
    menu: [{ id: MenuId.TerminalStickyScrollContext }],
});
// #endregion
// #region Colors
import './terminalStickyScrollColorRegistry.js';
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc3RpY2t5U2Nyb2xsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci90ZXJtaW5hbC5zdGlja3lTY3JvbGwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBR3hGLGlDQUFpQztBQUVqQyw0QkFBNEIsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLEVBQUUsZ0NBQWdDLENBQUMsQ0FBQTtBQUVuRyxhQUFhO0FBRWIsa0JBQWtCO0FBRWxCLElBQVcsNkJBRVY7QUFGRCxXQUFXLDZCQUE2QjtJQUN2QyxvR0FBbUUsQ0FBQTtBQUNwRSxDQUFDLEVBRlUsNkJBQTZCLEtBQTdCLDZCQUE2QixRQUV2QztBQUVELHNCQUFzQixDQUFDO0lBQ3RCLEVBQUUsdUdBQWtEO0lBQ3BELEtBQUssRUFBRSxTQUFTLENBQUMsOENBQThDLEVBQUUsc0JBQXNCLENBQUM7SUFDeEYsT0FBTyxFQUFFO1FBQ1IsU0FBUyxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxzRkFBcUMsRUFBRSxFQUFFLElBQUksQ0FBQztRQUN6RixLQUFLLEVBQUUsUUFBUSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7UUFDaEQsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUM3RCxpQkFBaUIsQ0FDakI7S0FDRDtJQUNELEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUNwQixNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUNoRSxNQUFNLFFBQVEsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsd0ZBQXVDLENBQUE7UUFDdEYsT0FBTyxvQkFBb0IsQ0FBQyxXQUFXLHlGQUF3QyxRQUFRLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBQ0QsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLDJCQUEyQixFQUFFLENBQUM7Q0FDbEQsQ0FBQyxDQUFBO0FBRUYsYUFBYTtBQUViLGlCQUFpQjtBQUVqQixPQUFPLHdDQUF3QyxDQUFBO0FBRS9DLGFBQWEifQ==