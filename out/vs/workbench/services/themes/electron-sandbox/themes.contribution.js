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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9lbGVjdHJvbi1zYW5kYm94L3RoZW1lcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUVyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sc0NBQXNDLEVBQ3RDLG1CQUFtQixHQUNuQixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQ3hDLHVCQUF1QixDQUFDLGFBQWEsQ0FDckMsQ0FBQTtBQUNELHFCQUFxQixDQUFDLHFCQUFxQixDQUFDO0lBQzNDLFVBQVUsRUFBRTtRQUNYLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLEVBQUU7WUFDbkMsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUM7WUFDMUMsZ0JBQWdCLEVBQUU7Z0JBQ2pCLFFBQVEsQ0FDUCxpQ0FBaUMsRUFDakMsK0NBQStDLENBQy9DO2dCQUNELFFBQVEsQ0FDUCw4QkFBOEIsRUFDOUIsdUZBQXVGLENBQ3ZGO2dCQUNELFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxpQ0FBaUMsQ0FBQztnQkFDNUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGdDQUFnQyxDQUFDO2FBQzFFO1lBQ0QsbUJBQW1CLEVBQUUsUUFBUSxDQUM1QjtnQkFDQyxHQUFHLEVBQUUseUJBQXlCO2dCQUM5QixPQUFPLEVBQUUsQ0FBQyxrREFBa0QsQ0FBQzthQUM3RCxFQUNELG1VQUFtVSxFQUNuVSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQzlDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUN0RDtZQUNELE9BQU8sRUFBRSxTQUFTO1lBQ2xCLFFBQVEsRUFBRSxDQUFDLE9BQU87WUFDbEIsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLENBQUMsc0NBQXNDLENBQUM7U0FDOUM7S0FDRDtDQUNELENBQUMsQ0FBQSJ9