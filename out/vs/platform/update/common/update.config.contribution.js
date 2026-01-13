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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLmNvbmZpZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VwZGF0ZS9jb21tb24vdXBkYXRlLmNvbmZpZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7QUFDRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxFQUFFLEVBQUUsUUFBUTtJQUNaLEtBQUssRUFBRSxFQUFFO0lBQ1QsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxRQUFRLENBQUM7SUFDckQsSUFBSSxFQUFFLFFBQVE7SUFDZCxVQUFVLEVBQUU7UUFDWCxhQUFhLEVBQUU7WUFDZCxJQUFJLEVBQUUsUUFBUTtZQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFNBQVMsQ0FBQztZQUM1QyxPQUFPLEVBQUUsU0FBUztZQUNsQixLQUFLLHdDQUFnQztZQUNyQyxXQUFXLEVBQUUsUUFBUSxDQUNwQixZQUFZLEVBQ1osNElBQTRJLENBQzVJO1lBQ0QsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7WUFDNUIsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUM7Z0JBQ3BDLFFBQVEsQ0FDUCxRQUFRLEVBQ1IsMEdBQTBHLENBQzFHO2dCQUNELFFBQVEsQ0FDUCxPQUFPLEVBQ1AsZ0ZBQWdGLENBQ2hGO2dCQUNELFFBQVEsQ0FDUCxTQUFTLEVBQ1QsNkZBQTZGLENBQzdGO2FBQ0Q7WUFDRCxNQUFNLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLGNBQWMsRUFBRSxNQUFNO2FBQ3RCO1NBQ0Q7UUFDRCxnQkFBZ0IsRUFBRTtZQUNqQixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLEtBQUssd0NBQWdDO1lBQ3JDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLFlBQVksRUFDWiw0SUFBNEksQ0FDNUk7WUFDRCxrQkFBa0IsRUFBRSxRQUFRLENBQzNCLFlBQVksRUFDWix1REFBdUQsRUFDdkQsYUFBYSxDQUNiO1NBQ0Q7UUFDRCx1Q0FBdUMsRUFBRTtZQUN4QyxJQUFJLEVBQUUsU0FBUztZQUNmLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyx3Q0FBZ0M7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FDZCxxQ0FBcUMsRUFDckMsc0NBQXNDLENBQ3RDO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsZ0NBQWdDLEVBQ2hDLG1GQUFtRixDQUNuRjtZQUNELFFBQVEsRUFBRSxTQUFTLElBQUksQ0FBQyxLQUFLO1NBQzdCO1FBQ0QseUJBQXlCLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssd0NBQWdDO1lBQ3JDLFdBQVcsRUFBRSxRQUFRLENBQ3BCLGtCQUFrQixFQUNsQixvR0FBb0csQ0FDcEc7WUFDRCxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztTQUM1QjtLQUNEO0NBQ0QsQ0FBQyxDQUFBIn0=