/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { OS } from '../../../base/common/platform.js';
import { Extensions as ConfigExtensions, } from '../../configuration/common/configurationRegistry.js';
import { Registry } from '../../registry/common/platform.js';
export var DispatchConfig;
(function (DispatchConfig) {
    DispatchConfig[DispatchConfig["Code"] = 0] = "Code";
    DispatchConfig[DispatchConfig["KeyCode"] = 1] = "KeyCode";
})(DispatchConfig || (DispatchConfig = {}));
export function readKeyboardConfig(configurationService) {
    const keyboard = configurationService.getValue('keyboard');
    const dispatch = keyboard?.dispatch === 'keyCode' ? 1 /* DispatchConfig.KeyCode */ : 0 /* DispatchConfig.Code */;
    const mapAltGrToCtrlAlt = Boolean(keyboard?.mapAltGrToCtrlAlt);
    return { dispatch, mapAltGrToCtrlAlt };
}
const configurationRegistry = Registry.as(ConfigExtensions.Configuration);
const keyboardConfiguration = {
    id: 'keyboard',
    order: 15,
    type: 'object',
    title: nls.localize('keyboardConfigurationTitle', 'Keyboard'),
    properties: {
        'keyboard.dispatch': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'string',
            enum: ['code', 'keyCode'],
            default: 'code',
            markdownDescription: nls.localize('dispatch', 'Controls the dispatching logic for key presses to use either `code` (recommended) or `keyCode`.'),
            included: OS === 2 /* OperatingSystem.Macintosh */ || OS === 3 /* OperatingSystem.Linux */,
        },
        'keyboard.mapAltGrToCtrlAlt': {
            scope: 1 /* ConfigurationScope.APPLICATION */,
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('mapAltGrToCtrlAlt', 'Controls if the AltGraph+ modifier should be treated as Ctrl+Alt+.'),
            included: OS === 1 /* OperatingSystem.Windows */,
        },
    },
};
configurationRegistry.registerConfiguration(keyboardConfiguration);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRDb25maWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJvYXJkTGF5b3V0L2NvbW1vbi9rZXlib2FyZENvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBRXRDLE9BQU8sRUFBRSxFQUFFLEVBQW1CLE1BQU0sa0NBQWtDLENBQUE7QUFDdEUsT0FBTyxFQUVOLFVBQVUsSUFBSSxnQkFBZ0IsR0FHOUIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsTUFBTSxDQUFOLElBQWtCLGNBR2pCO0FBSEQsV0FBa0IsY0FBYztJQUMvQixtREFBSSxDQUFBO0lBQ0oseURBQU8sQ0FBQTtBQUNSLENBQUMsRUFIaUIsY0FBYyxLQUFkLGNBQWMsUUFHL0I7QUFPRCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsb0JBQTJDO0lBQzdFLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FFNUMsVUFBVSxDQUFDLENBQUE7SUFDYixNQUFNLFFBQVEsR0FBRyxRQUFRLEVBQUUsUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDLGdDQUF3QixDQUFDLDRCQUFvQixDQUFBO0lBQ2hHLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0lBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQTtBQUN2QyxDQUFDO0FBRUQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtBQUNqRyxNQUFNLHFCQUFxQixHQUF1QjtJQUNqRCxFQUFFLEVBQUUsVUFBVTtJQUNkLEtBQUssRUFBRSxFQUFFO0lBQ1QsSUFBSSxFQUFFLFFBQVE7SUFDZCxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxVQUFVLENBQUM7SUFDN0QsVUFBVSxFQUFFO1FBQ1gsbUJBQW1CLEVBQUU7WUFDcEIsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLFFBQVE7WUFDZCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxNQUFNO1lBQ2YsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDaEMsVUFBVSxFQUNWLGlHQUFpRyxDQUNqRztZQUNELFFBQVEsRUFBRSxFQUFFLHNDQUE4QixJQUFJLEVBQUUsa0NBQTBCO1NBQzFFO1FBQ0QsNEJBQTRCLEVBQUU7WUFDN0IsS0FBSyx3Q0FBZ0M7WUFDckMsSUFBSSxFQUFFLFNBQVM7WUFDZixPQUFPLEVBQUUsS0FBSztZQUNkLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLG1CQUFtQixFQUNuQixvRUFBb0UsQ0FDcEU7WUFDRCxRQUFRLEVBQUUsRUFBRSxvQ0FBNEI7U0FDeEM7S0FDRDtDQUNELENBQUE7QUFFRCxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBIn0=