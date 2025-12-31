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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRDb25maWcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXlib2FyZExheW91dC9jb21tb24va2V5Ym9hcmRDb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUV0QyxPQUFPLEVBQUUsRUFBRSxFQUFtQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFFTixVQUFVLElBQUksZ0JBQWdCLEdBRzlCLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE1BQU0sQ0FBTixJQUFrQixjQUdqQjtBQUhELFdBQWtCLGNBQWM7SUFDL0IsbURBQUksQ0FBQTtJQUNKLHlEQUFPLENBQUE7QUFDUixDQUFDLEVBSGlCLGNBQWMsS0FBZCxjQUFjLFFBRy9CO0FBT0QsTUFBTSxVQUFVLGtCQUFrQixDQUFDLG9CQUEyQztJQUM3RSxNQUFNLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBRTVDLFVBQVUsQ0FBQyxDQUFBO0lBQ2IsTUFBTSxRQUFRLEdBQUcsUUFBUSxFQUFFLFFBQVEsS0FBSyxTQUFTLENBQUMsQ0FBQyxnQ0FBd0IsQ0FBQyw0QkFBb0IsQ0FBQTtJQUNoRyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtJQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLENBQUE7QUFDdkMsQ0FBQztBQUVELE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7QUFDakcsTUFBTSxxQkFBcUIsR0FBdUI7SUFDakQsRUFBRSxFQUFFLFVBQVU7SUFDZCxLQUFLLEVBQUUsRUFBRTtJQUNULElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsVUFBVSxDQUFDO0lBQzdELFVBQVUsRUFBRTtRQUNYLG1CQUFtQixFQUFFO1lBQ3BCLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQztZQUN6QixPQUFPLEVBQUUsTUFBTTtZQUNmLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ2hDLFVBQVUsRUFDVixpR0FBaUcsQ0FDakc7WUFDRCxRQUFRLEVBQUUsRUFBRSxzQ0FBOEIsSUFBSSxFQUFFLGtDQUEwQjtTQUMxRTtRQUNELDRCQUE0QixFQUFFO1lBQzdCLEtBQUssd0NBQWdDO1lBQ3JDLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLEtBQUs7WUFDZCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyxtQkFBbUIsRUFDbkIsb0VBQW9FLENBQ3BFO1lBQ0QsUUFBUSxFQUFFLEVBQUUsb0NBQTRCO1NBQ3hDO0tBQ0Q7Q0FDRCxDQUFBO0FBRUQscUJBQXFCLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsQ0FBQSJ9