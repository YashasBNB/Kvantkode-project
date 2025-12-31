/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalAccessibilitySettingId;
(function (TerminalAccessibilitySettingId) {
    TerminalAccessibilitySettingId["AccessibleViewPreserveCursorPosition"] = "terminal.integrated.accessibleViewPreserveCursorPosition";
    TerminalAccessibilitySettingId["AccessibleViewFocusOnCommandExecution"] = "terminal.integrated.accessibleViewFocusOnCommandExecution";
})(TerminalAccessibilitySettingId || (TerminalAccessibilitySettingId = {}));
export const terminalAccessibilityConfiguration = {
    ["terminal.integrated.accessibleViewPreserveCursorPosition" /* TerminalAccessibilitySettingId.AccessibleViewPreserveCursorPosition */]: {
        markdownDescription: localize('terminal.integrated.accessibleViewPreserveCursorPosition', "Preserve the cursor position on reopen of the terminal's accessible view rather than setting it to the bottom of the buffer."),
        type: 'boolean',
        default: false,
    },
    ["terminal.integrated.accessibleViewFocusOnCommandExecution" /* TerminalAccessibilitySettingId.AccessibleViewFocusOnCommandExecution */]: {
        markdownDescription: localize('terminal.integrated.accessibleViewFocusOnCommandExecution', 'Focus the terminal accessible view when a command is executed.'),
        type: 'boolean',
        default: false,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBY2Nlc3NpYmlsaXR5Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hY2Nlc3NpYmlsaXR5L2NvbW1vbi90ZXJtaW5hbEFjY2Vzc2liaWxpdHlDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdoRCxNQUFNLENBQU4sSUFBa0IsOEJBR2pCO0FBSEQsV0FBa0IsOEJBQThCO0lBQy9DLG1JQUFpRyxDQUFBO0lBQ2pHLHFJQUFtRyxDQUFBO0FBQ3BHLENBQUMsRUFIaUIsOEJBQThCLEtBQTlCLDhCQUE4QixRQUcvQztBQU9ELE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFvRDtJQUNsRyxzSUFBcUUsRUFBRTtRQUN0RSxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDBEQUEwRCxFQUMxRCw4SEFBOEgsQ0FDOUg7UUFDRCxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxLQUFLO0tBQ2Q7SUFDRCx3SUFBc0UsRUFBRTtRQUN2RSxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLDJEQUEyRCxFQUMzRCxnRUFBZ0UsQ0FDaEU7UUFDRCxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxLQUFLO0tBQ2Q7Q0FDRCxDQUFBIn0=