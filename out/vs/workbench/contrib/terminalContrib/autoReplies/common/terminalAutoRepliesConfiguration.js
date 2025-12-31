/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalAutoRepliesSettingId;
(function (TerminalAutoRepliesSettingId) {
    TerminalAutoRepliesSettingId["AutoReplies"] = "terminal.integrated.autoReplies";
})(TerminalAutoRepliesSettingId || (TerminalAutoRepliesSettingId = {}));
export const terminalAutoRepliesConfiguration = {
    ["terminal.integrated.autoReplies" /* TerminalAutoRepliesSettingId.AutoReplies */]: {
        markdownDescription: localize('terminal.integrated.autoReplies', "A set of messages that, when encountered in the terminal, will be automatically responded to. Provided the message is specific enough, this can help automate away common responses.\n\nRemarks:\n\n- Use {0} to automatically respond to the terminate batch job prompt on Windows.\n- The message includes escape sequences so the reply might not happen with styled text.\n- Each reply can only happen once every second.\n- Use {1} in the reply to mean the enter key.\n- To unset a default key, set the value to null.\n- Restart VS Code if new don't apply.", '`"Terminate batch job (Y/N)": "Y\\r"`', '`"\\r"`'),
        type: 'object',
        additionalProperties: {
            oneOf: [
                {
                    type: 'string',
                    description: localize('terminal.integrated.autoReplies.reply', 'The reply to send to the process.'),
                },
                { type: 'null' },
            ],
        },
        default: {},
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxBdXRvUmVwbGllc0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYXV0b1JlcGxpZXMvY29tbW9uL3Rlcm1pbmFsQXV0b1JlcGxpZXNDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdoRCxNQUFNLENBQU4sSUFBa0IsNEJBRWpCO0FBRkQsV0FBa0IsNEJBQTRCO0lBQzdDLCtFQUErQyxDQUFBO0FBQ2hELENBQUMsRUFGaUIsNEJBQTRCLEtBQTVCLDRCQUE0QixRQUU3QztBQU1ELE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFvRDtJQUNoRyxrRkFBMEMsRUFBRTtRQUMzQyxtQkFBbUIsRUFBRSxRQUFRLENBQzVCLGlDQUFpQyxFQUNqQyx3aUJBQXdpQixFQUN4aUIsdUNBQXVDLEVBQ3ZDLFNBQVMsQ0FDVDtRQUNELElBQUksRUFBRSxRQUFRO1FBQ2Qsb0JBQW9CLEVBQUU7WUFDckIsS0FBSyxFQUFFO2dCQUNOO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHVDQUF1QyxFQUN2QyxtQ0FBbUMsQ0FDbkM7aUJBQ0Q7Z0JBQ0QsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO2FBQ2hCO1NBQ0Q7UUFDRCxPQUFPLEVBQUUsRUFBRTtLQUNYO0NBQ0QsQ0FBQSJ9