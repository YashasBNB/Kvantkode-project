/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultTerminalAccessibilityCommandsToSkipShell, } from '../terminalContrib/accessibility/common/terminal.accessibility.js';
import { terminalAccessibilityConfiguration } from '../terminalContrib/accessibility/common/terminalAccessibilityConfiguration.js';
import { terminalAutoRepliesConfiguration } from '../terminalContrib/autoReplies/common/terminalAutoRepliesConfiguration.js';
import { terminalInitialHintConfiguration } from '../terminalContrib/chat/common/terminalInitialHintConfiguration.js';
import { terminalCommandGuideConfiguration } from '../terminalContrib/commandGuide/common/terminalCommandGuideConfiguration.js';
import { defaultTerminalFindCommandToSkipShell } from '../terminalContrib/find/common/terminal.find.js';
import { defaultTerminalHistoryCommandsToSkipShell, terminalHistoryConfiguration, } from '../terminalContrib/history/common/terminal.history.js';
import { terminalStickyScrollConfiguration, } from '../terminalContrib/stickyScroll/common/terminalStickyScrollConfiguration.js';
import { defaultTerminalSuggestCommandsToSkipShell } from '../terminalContrib/suggest/common/terminal.suggest.js';
import { terminalSuggestConfiguration, } from '../terminalContrib/suggest/common/terminalSuggestConfiguration.js';
import { terminalTypeAheadConfiguration } from '../terminalContrib/typeAhead/common/terminalTypeAheadConfiguration.js';
import { terminalZoomConfiguration } from '../terminalContrib/zoom/common/terminal.zoom.js';
// HACK: Export some commands from `terminalContrib/` that are depended upon elsewhere. These are
// soft layer breakers between `terminal/` and `terminalContrib/` but there are difficulties in
// removing the dependency. These are explicitly defined here to avoid an eslint line override.
export var TerminalContribCommandId;
(function (TerminalContribCommandId) {
    TerminalContribCommandId["A11yFocusAccessibleBuffer"] = "workbench.action.terminal.focusAccessibleBuffer";
    TerminalContribCommandId["DeveloperRestartPtyHost"] = "workbench.action.terminal.restartPtyHost";
})(TerminalContribCommandId || (TerminalContribCommandId = {}));
// HACK: Export some settings from `terminalContrib/` that are depended upon elsewhere. These are
// soft layer breakers between `terminal/` and `terminalContrib/` but there are difficulties in
// removing the dependency. These are explicitly defined here to avoid an eslint line override.
export var TerminalContribSettingId;
(function (TerminalContribSettingId) {
    TerminalContribSettingId["SuggestEnabled"] = "terminal.integrated.suggest.enabled";
    TerminalContribSettingId["StickyScrollEnabled"] = "terminal.integrated.stickyScroll.enabled";
})(TerminalContribSettingId || (TerminalContribSettingId = {}));
// Export configuration schemes from terminalContrib - this is an exception to the eslint rule since
// they need to be declared at part of the rest of the terminal configuration
export const terminalContribConfiguration = {
    ...terminalAccessibilityConfiguration,
    ...terminalAutoRepliesConfiguration,
    ...terminalInitialHintConfiguration,
    ...terminalCommandGuideConfiguration,
    ...terminalHistoryConfiguration,
    ...terminalStickyScrollConfiguration,
    ...terminalSuggestConfiguration,
    ...terminalTypeAheadConfiguration,
    ...terminalZoomConfiguration,
};
// Export commands to skip shell from terminalContrib - this is an exception to the eslint rule
// since they need to be included in the terminal module
export const defaultTerminalContribCommandsToSkipShell = [
    ...defaultTerminalAccessibilityCommandsToSkipShell,
    ...defaultTerminalFindCommandToSkipShell,
    ...defaultTerminalHistoryCommandsToSkipShell,
    ...defaultTerminalSuggestCommandsToSkipShell,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250cmliRXhwb3J0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlcm1pbmFsQ29udHJpYkV4cG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUVOLCtDQUErQyxHQUMvQyxNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ2xJLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBQzVILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBRS9ILE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3ZHLE9BQU8sRUFDTix5Q0FBeUMsRUFDekMsNEJBQTRCLEdBQzVCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUVOLGlDQUFpQyxHQUNqQyxNQUFNLDZFQUE2RSxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx5Q0FBeUMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ2pILE9BQU8sRUFFTiw0QkFBNEIsR0FDNUIsTUFBTSxtRUFBbUUsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQTtBQUN0SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUUzRixpR0FBaUc7QUFDakcsK0ZBQStGO0FBQy9GLCtGQUErRjtBQUMvRixNQUFNLENBQU4sSUFBa0Isd0JBR2pCO0FBSEQsV0FBa0Isd0JBQXdCO0lBQ3pDLHlHQUFnRixDQUFBO0lBQ2hGLGdHQUFtRSxDQUFBO0FBQ3BFLENBQUMsRUFIaUIsd0JBQXdCLEtBQXhCLHdCQUF3QixRQUd6QztBQUVELGlHQUFpRztBQUNqRywrRkFBK0Y7QUFDL0YsK0ZBQStGO0FBQy9GLE1BQU0sQ0FBTixJQUFrQix3QkFHakI7QUFIRCxXQUFrQix3QkFBd0I7SUFDekMsa0ZBQWlELENBQUE7SUFDakQsNEZBQTJELENBQUE7QUFDNUQsQ0FBQyxFQUhpQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBR3pDO0FBRUQsb0dBQW9HO0FBQ3BHLDZFQUE2RTtBQUM3RSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBcUM7SUFDN0UsR0FBRyxrQ0FBa0M7SUFDckMsR0FBRyxnQ0FBZ0M7SUFDbkMsR0FBRyxnQ0FBZ0M7SUFDbkMsR0FBRyxpQ0FBaUM7SUFDcEMsR0FBRyw0QkFBNEI7SUFDL0IsR0FBRyxpQ0FBaUM7SUFDcEMsR0FBRyw0QkFBNEI7SUFDL0IsR0FBRyw4QkFBOEI7SUFDakMsR0FBRyx5QkFBeUI7Q0FDNUIsQ0FBQTtBQUVELCtGQUErRjtBQUMvRix3REFBd0Q7QUFDeEQsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQUc7SUFDeEQsR0FBRywrQ0FBK0M7SUFDbEQsR0FBRyxxQ0FBcUM7SUFDeEMsR0FBRyx5Q0FBeUM7SUFDNUMsR0FBRyx5Q0FBeUM7Q0FDNUMsQ0FBQSJ9