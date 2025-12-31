/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ThemeSettings } from '../common/workbenchThemeService.js';
import { COLOR_THEME_CONFIGURATION_SETTINGS_TAG, formatSettingAsLink, } from '../common/themeConfiguration.js';
import { isLinux } from '../../../../base/common/platform.js';
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    properties: {
        [ThemeSettings.SYSTEM_COLOR_THEME]: {
            type: 'string',
            enum: ['default', 'auto', 'light', 'dark'],
            enumDescriptions: [
                localize('window.systemColorTheme.default', 'Native widget colors match the system colors.'),
                localize('window.systemColorTheme.auto', 'Use light native widget colors for light color themes and dark for dark color themes.'),
                localize('window.systemColorTheme.light', 'Use light native widget colors.'),
                localize('window.systemColorTheme.dark', 'Use dark native widget colors.'),
            ],
            markdownDescription: localize({
                key: 'window.systemColorTheme',
                comment: ['{0} and {1} will become links to other settings.'],
            }, 'Set the color mode for native UI elements such as native dialogs, menus and title bar. Even if your OS is configured in light color mode, you can select a dark system color theme for the window. You can also configure to automatically adjust based on the {0} setting.\n\nNote: This setting is ignored when {1} is enabled.', formatSettingAsLink(ThemeSettings.COLOR_THEME), formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
            default: 'default',
            included: !isLinux,
            scope: 1 /* ConfigurationScope.APPLICATION */,
            tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
        },
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvZWxlY3Ryb24tc2FuZGJveC90aGVtZXMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEUsT0FBTyxFQUNOLHNDQUFzQyxFQUN0QyxtQkFBbUIsR0FDbkIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7QUFDRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQztJQUMzQyxVQUFVLEVBQUU7UUFDWCxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO1lBQ25DLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO1lBQzFDLGdCQUFnQixFQUFFO2dCQUNqQixRQUFRLENBQ1AsaUNBQWlDLEVBQ2pDLCtDQUErQyxDQUMvQztnQkFDRCxRQUFRLENBQ1AsOEJBQThCLEVBQzlCLHVGQUF1RixDQUN2RjtnQkFDRCxRQUFRLENBQUMsK0JBQStCLEVBQUUsaUNBQWlDLENBQUM7Z0JBQzVFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxnQ0FBZ0MsQ0FBQzthQUMxRTtZQUNELG1CQUFtQixFQUFFLFFBQVEsQ0FDNUI7Z0JBQ0MsR0FBRyxFQUFFLHlCQUF5QjtnQkFDOUIsT0FBTyxFQUFFLENBQUMsa0RBQWtELENBQUM7YUFDN0QsRUFDRCxtVUFBbVUsRUFDblUsbUJBQW1CLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxFQUM5QyxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FDdEQ7WUFDRCxPQUFPLEVBQUUsU0FBUztZQUNsQixRQUFRLEVBQUUsQ0FBQyxPQUFPO1lBQ2xCLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxDQUFDLHNDQUFzQyxDQUFDO1NBQzlDO0tBQ0Q7Q0FDRCxDQUFDLENBQUEifQ==