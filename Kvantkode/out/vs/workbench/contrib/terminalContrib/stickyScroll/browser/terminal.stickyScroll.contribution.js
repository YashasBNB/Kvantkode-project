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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuc3RpY2t5U2Nyb2xsLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N0aWNreVNjcm9sbC9icm93c2VyL3Rlcm1pbmFsLnN0aWNreVNjcm9sbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDOUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHeEYsaUNBQWlDO0FBRWpDLDRCQUE0QixDQUFDLGdDQUFnQyxDQUFDLEVBQUUsRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFBO0FBRW5HLGFBQWE7QUFFYixrQkFBa0I7QUFFbEIsSUFBVyw2QkFFVjtBQUZELFdBQVcsNkJBQTZCO0lBQ3ZDLG9HQUFtRSxDQUFBO0FBQ3BFLENBQUMsRUFGVSw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBRXZDO0FBRUQsc0JBQXNCLENBQUM7SUFDdEIsRUFBRSx1R0FBa0Q7SUFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyw4Q0FBOEMsRUFBRSxzQkFBc0IsQ0FBQztJQUN4RixPQUFPLEVBQUU7UUFDUixTQUFTLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxVQUFVLHNGQUFxQyxFQUFFLEVBQUUsSUFBSSxDQUFDO1FBQ3pGLEtBQUssRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQztRQUNoRCxhQUFhLEVBQUUsUUFBUSxDQUN0QixFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzdELGlCQUFpQixDQUNqQjtLQUNEO0lBQ0QsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFO1FBQ3BCLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sUUFBUSxHQUFHLENBQUMsb0JBQW9CLENBQUMsUUFBUSx3RkFBdUMsQ0FBQTtRQUN0RixPQUFPLG9CQUFvQixDQUFDLFdBQVcseUZBQXdDLFFBQVEsQ0FBQyxDQUFBO0lBQ3pGLENBQUM7SUFDRCxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztDQUNsRCxDQUFDLENBQUE7QUFFRixhQUFhO0FBRWIsaUJBQWlCO0FBRWpCLE9BQU8sd0NBQXdDLENBQUE7QUFFL0MsYUFBYSJ9