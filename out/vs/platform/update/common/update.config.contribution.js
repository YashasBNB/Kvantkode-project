/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWeb, isWindows } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { Extensions as ConfigurationExtensions, } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'update',
    order: 15,
    title: localize('updateConfigurationTitle', 'Update'),
    type: 'object',
    properties: {
        'update.mode': {
            type: 'string',
            enum: ['none', 'manual', 'start', 'default'],
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('updateMode', 'Configure whether you receive automatic updates. Requires a restart after change. The updates are fetched from a Microsoft online service.'),
            tags: ['usesOnlineServices'],
            enumDescriptions: [
                localize('none', 'Disable updates.'),
                localize('manual', 'Disable automatic background update checks. Updates will be available if you manually check for updates.'),
                localize('start', 'Check for updates only on startup. Disable automatic background update checks.'),
                localize('default', 'Enable automatic update checks. Code will check for updates automatically and periodically.'),
            ],
            policy: {
                name: 'UpdateMode',
                minimumVersion: '1.67',
            },
        },
        'update.channel': {
            type: 'string',
            default: 'default',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('updateMode', 'Configure whether you receive automatic updates. Requires a restart after change. The updates are fetched from a Microsoft online service.'),
            deprecationMessage: localize('deprecated', "This setting is deprecated, please use '{0}' instead.", 'update.mode'),
        },
        'update.enableWindowsBackgroundUpdates': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            title: localize('enableWindowsBackgroundUpdatesTitle', 'Enable Background Updates on Windows'),
            description: localize('enableWindowsBackgroundUpdates', 'Enable to download and install new VS Code versions in the background on Windows.'),
            included: isWindows && !isWeb,
        },
        'update.showReleaseNotes': {
            type: 'boolean',
            default: true,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            description: localize('showReleaseNotes', 'Show Release Notes after an update. The Release Notes are fetched from a Microsoft online service.'),
            tags: ['usesOnlineServices'],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbmZpZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91cGRhdGUvY29tbW9uL3VwZGF0ZS5jb25maWcuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFBO0FBQ0QscUJBQXFCLENBQUMscUJBQXFCLENBQUM7SUFDM0MsRUFBRSxFQUFFLFFBQVE7SUFDWixLQUFLLEVBQUUsRUFBRTtJQUNULEtBQUssRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDO0lBQ3JELElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsYUFBYSxFQUFFO1lBQ2QsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxTQUFTLENBQUM7WUFDNUMsT0FBTyxFQUFFLFNBQVM7WUFDbEIsS0FBSyx3Q0FBZ0M7WUFDckMsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsWUFBWSxFQUNaLDRJQUE0SSxDQUM1STtZQUNELElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDO1lBQzVCLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDO2dCQUNwQyxRQUFRLENBQ1AsUUFBUSxFQUNSLDBHQUEwRyxDQUMxRztnQkFDRCxRQUFRLENBQ1AsT0FBTyxFQUNQLGdGQUFnRixDQUNoRjtnQkFDRCxRQUFRLENBQ1AsU0FBUyxFQUNULDZGQUE2RixDQUM3RjthQUNEO1lBQ0QsTUFBTSxFQUFFO2dCQUNQLElBQUksRUFBRSxZQUFZO2dCQUNsQixjQUFjLEVBQUUsTUFBTTthQUN0QjtTQUNEO1FBQ0QsZ0JBQWdCLEVBQUU7WUFDakIsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsU0FBUztZQUNsQixLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixZQUFZLEVBQ1osNElBQTRJLENBQzVJO1lBQ0Qsa0JBQWtCLEVBQUUsUUFBUSxDQUMzQixZQUFZLEVBQ1osdURBQXVELEVBQ3ZELGFBQWEsQ0FDYjtTQUNEO1FBQ0QsdUNBQXVDLEVBQUU7WUFDeEMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLEtBQUssRUFBRSxRQUFRLENBQ2QscUNBQXFDLEVBQ3JDLHNDQUFzQyxDQUN0QztZQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLGdDQUFnQyxFQUNoQyxtRkFBbUYsQ0FDbkY7WUFDRCxRQUFRLEVBQUUsU0FBUyxJQUFJLENBQUMsS0FBSztTQUM3QjtRQUNELHlCQUF5QixFQUFFO1lBQzFCLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixrQkFBa0IsRUFDbEIsb0dBQW9HLENBQ3BHO1lBQ0QsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7U0FDNUI7S0FDRDtDQUNELENBQUMsQ0FBQSJ9