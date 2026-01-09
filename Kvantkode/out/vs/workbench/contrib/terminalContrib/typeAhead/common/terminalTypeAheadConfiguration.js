/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export const DEFAULT_LOCAL_ECHO_EXCLUDE = ['vim', 'vi', 'nano', 'tmux'];
export var TerminalTypeAheadSettingId;
(function (TerminalTypeAheadSettingId) {
    TerminalTypeAheadSettingId["LocalEchoLatencyThreshold"] = "terminal.integrated.localEchoLatencyThreshold";
    TerminalTypeAheadSettingId["LocalEchoEnabled"] = "terminal.integrated.localEchoEnabled";
    TerminalTypeAheadSettingId["LocalEchoExcludePrograms"] = "terminal.integrated.localEchoExcludePrograms";
    TerminalTypeAheadSettingId["LocalEchoStyle"] = "terminal.integrated.localEchoStyle";
})(TerminalTypeAheadSettingId || (TerminalTypeAheadSettingId = {}));
export const terminalTypeAheadConfiguration = {
    ["terminal.integrated.localEchoLatencyThreshold" /* TerminalTypeAheadSettingId.LocalEchoLatencyThreshold */]: {
        description: localize('terminal.integrated.localEchoLatencyThreshold', "Length of network delay, in milliseconds, where local edits will be echoed on the terminal without waiting for server acknowledgement. If '0', local echo will always be on, and if '-1' it will be disabled."),
        type: 'integer',
        minimum: -1,
        default: 30,
        tags: ['preview'],
    },
    ["terminal.integrated.localEchoEnabled" /* TerminalTypeAheadSettingId.LocalEchoEnabled */]: {
        markdownDescription: localize('terminal.integrated.localEchoEnabled', 'When local echo should be enabled. This will override {0}', '`#terminal.integrated.localEchoLatencyThreshold#`'),
        type: 'string',
        enum: ['on', 'off', 'auto'],
        enumDescriptions: [
            localize('terminal.integrated.localEchoEnabled.on', 'Always enabled'),
            localize('terminal.integrated.localEchoEnabled.off', 'Always disabled'),
            localize('terminal.integrated.localEchoEnabled.auto', 'Enabled only for remote workspaces'),
        ],
        default: 'off',
        tags: ['preview'],
    },
    ["terminal.integrated.localEchoExcludePrograms" /* TerminalTypeAheadSettingId.LocalEchoExcludePrograms */]: {
        description: localize('terminal.integrated.localEchoExcludePrograms', 'Local echo will be disabled when any of these program names are found in the terminal title.'),
        type: 'array',
        items: {
            type: 'string',
            uniqueItems: true,
        },
        default: DEFAULT_LOCAL_ECHO_EXCLUDE,
        tags: ['preview'],
    },
    ["terminal.integrated.localEchoStyle" /* TerminalTypeAheadSettingId.LocalEchoStyle */]: {
        description: localize('terminal.integrated.localEchoStyle', 'Terminal style of locally echoed text; either a font style or an RGB color.'),
        default: 'dim',
        anyOf: [
            {
                enum: ['bold', 'dim', 'italic', 'underlined', 'inverted', '#ff0000'],
            },
            {
                type: 'string',
                format: 'color-hex',
            },
        ],
        tags: ['preview'],
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUeXBlQWhlYWRDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvdHlwZUFoZWFkL2NvbW1vbi90ZXJtaW5hbFR5cGVBaGVhZENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBR2hELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUEwQixDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0FBRTlGLE1BQU0sQ0FBTixJQUFrQiwwQkFLakI7QUFMRCxXQUFrQiwwQkFBMEI7SUFDM0MseUdBQTJFLENBQUE7SUFDM0UsdUZBQXlELENBQUE7SUFDekQsdUdBQXlFLENBQUE7SUFDekUsbUZBQXFELENBQUE7QUFDdEQsQ0FBQyxFQUxpQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBSzNDO0FBU0QsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQW9EO0lBQzlGLDRHQUFzRCxFQUFFO1FBQ3ZELFdBQVcsRUFBRSxRQUFRLENBQ3BCLCtDQUErQyxFQUMvQywrTUFBK00sQ0FDL007UUFDRCxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDWCxPQUFPLEVBQUUsRUFBRTtRQUNYLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtJQUNELDBGQUE2QyxFQUFFO1FBQzlDLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsc0NBQXNDLEVBQ3RDLDJEQUEyRCxFQUMzRCxtREFBbUQsQ0FDbkQ7UUFDRCxJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDO1FBQzNCLGdCQUFnQixFQUFFO1lBQ2pCLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxnQkFBZ0IsQ0FBQztZQUNyRSxRQUFRLENBQUMsMENBQTBDLEVBQUUsaUJBQWlCLENBQUM7WUFDdkUsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLG9DQUFvQyxDQUFDO1NBQzNGO1FBQ0QsT0FBTyxFQUFFLEtBQUs7UUFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCwwR0FBcUQsRUFBRTtRQUN0RCxXQUFXLEVBQUUsUUFBUSxDQUNwQiw4Q0FBOEMsRUFDOUMsOEZBQThGLENBQzlGO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixJQUFJLEVBQUUsUUFBUTtZQUNkLFdBQVcsRUFBRSxJQUFJO1NBQ2pCO1FBQ0QsT0FBTyxFQUFFLDBCQUEwQjtRQUNuQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCxzRkFBMkMsRUFBRTtRQUM1QyxXQUFXLEVBQUUsUUFBUSxDQUNwQixvQ0FBb0MsRUFDcEMsNkVBQTZFLENBQzdFO1FBQ0QsT0FBTyxFQUFFLEtBQUs7UUFDZCxLQUFLLEVBQUU7WUFDTjtnQkFDQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQzthQUNwRTtZQUNEO2dCQUNDLElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxXQUFXO2FBQ25CO1NBQ0Q7UUFDRCxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7Q0FDRCxDQUFBIn0=