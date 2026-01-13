/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
export var SettingValueType;
(function (SettingValueType) {
    SettingValueType["Null"] = "null";
    SettingValueType["Enum"] = "enum";
    SettingValueType["String"] = "string";
    SettingValueType["MultilineString"] = "multiline-string";
    SettingValueType["Integer"] = "integer";
    SettingValueType["Number"] = "number";
    SettingValueType["Boolean"] = "boolean";
    SettingValueType["Array"] = "array";
    SettingValueType["Exclude"] = "exclude";
    SettingValueType["Include"] = "include";
    SettingValueType["Complex"] = "complex";
    SettingValueType["NullableInteger"] = "nullable-integer";
    SettingValueType["NullableNumber"] = "nullable-number";
    SettingValueType["Object"] = "object";
    SettingValueType["BooleanObject"] = "boolean-object";
    SettingValueType["LanguageTag"] = "language-tag";
    SettingValueType["ExtensionToggle"] = "extension-toggle";
    SettingValueType["ComplexObject"] = "complex-object";
})(SettingValueType || (SettingValueType = {}));
/**
 * The ways a setting could match a query,
 * sorted in increasing order of relevance.
 */
export var SettingMatchType;
(function (SettingMatchType) {
    SettingMatchType[SettingMatchType["None"] = 0] = "None";
    SettingMatchType[SettingMatchType["LanguageTagSettingMatch"] = 1] = "LanguageTagSettingMatch";
    SettingMatchType[SettingMatchType["RemoteMatch"] = 2] = "RemoteMatch";
    SettingMatchType[SettingMatchType["NonContiguousQueryInSettingId"] = 4] = "NonContiguousQueryInSettingId";
    SettingMatchType[SettingMatchType["DescriptionOrValueMatch"] = 8] = "DescriptionOrValueMatch";
    SettingMatchType[SettingMatchType["NonContiguousWordsInSettingsLabel"] = 16] = "NonContiguousWordsInSettingsLabel";
    SettingMatchType[SettingMatchType["ContiguousWordsInSettingsLabel"] = 32] = "ContiguousWordsInSettingsLabel";
    SettingMatchType[SettingMatchType["ContiguousQueryInSettingId"] = 64] = "ContiguousQueryInSettingId";
    SettingMatchType[SettingMatchType["AllWordsInSettingsLabel"] = 128] = "AllWordsInSettingsLabel";
    SettingMatchType[SettingMatchType["ExactMatch"] = 256] = "ExactMatch";
})(SettingMatchType || (SettingMatchType = {}));
export const SettingKeyMatchTypes = SettingMatchType.AllWordsInSettingsLabel |
    SettingMatchType.ContiguousWordsInSettingsLabel |
    SettingMatchType.NonContiguousWordsInSettingsLabel |
    SettingMatchType.NonContiguousQueryInSettingId |
    SettingMatchType.ContiguousQueryInSettingId;
export function validateSettingsEditorOptions(options) {
    return {
        // Inherit provided options
        ...options,
        // Enforce some options for settings specifically
        override: DEFAULT_EDITOR_ASSOCIATION.id,
        pinned: true,
    };
}
export const IPreferencesService = createDecorator('preferencesService');
export const DEFINE_KEYBINDING_EDITOR_CONTRIB_ID = 'editor.contrib.defineKeybinding';
export const FOLDER_SETTINGS_PATH = '.vscode/settings.json';
export const DEFAULT_SETTINGS_EDITOR_SETTING = 'workbench.settings.openDefaultSettings';
export const USE_SPLIT_JSON_SETTING = 'workbench.settings.useSplitJSON';
export const SETTINGS_AUTHORITY = 'settings';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFtQmhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsMEJBQTBCLEVBQWUsTUFBTSwyQkFBMkIsQ0FBQTtBQUluRixNQUFNLENBQU4sSUFBWSxnQkFtQlg7QUFuQkQsV0FBWSxnQkFBZ0I7SUFDM0IsaUNBQWEsQ0FBQTtJQUNiLGlDQUFhLENBQUE7SUFDYixxQ0FBaUIsQ0FBQTtJQUNqQix3REFBb0MsQ0FBQTtJQUNwQyx1Q0FBbUIsQ0FBQTtJQUNuQixxQ0FBaUIsQ0FBQTtJQUNqQix1Q0FBbUIsQ0FBQTtJQUNuQixtQ0FBZSxDQUFBO0lBQ2YsdUNBQW1CLENBQUE7SUFDbkIsdUNBQW1CLENBQUE7SUFDbkIsdUNBQW1CLENBQUE7SUFDbkIsd0RBQW9DLENBQUE7SUFDcEMsc0RBQWtDLENBQUE7SUFDbEMscUNBQWlCLENBQUE7SUFDakIsb0RBQWdDLENBQUE7SUFDaEMsZ0RBQTRCLENBQUE7SUFDNUIsd0RBQW9DLENBQUE7SUFDcEMsb0RBQWdDLENBQUE7QUFDakMsQ0FBQyxFQW5CVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBbUIzQjtBQXlGRDs7O0dBR0c7QUFDSCxNQUFNLENBQU4sSUFBWSxnQkFXWDtBQVhELFdBQVksZ0JBQWdCO0lBQzNCLHVEQUFRLENBQUE7SUFDUiw2RkFBZ0MsQ0FBQTtJQUNoQyxxRUFBb0IsQ0FBQTtJQUNwQix5R0FBc0MsQ0FBQTtJQUN0Qyw2RkFBZ0MsQ0FBQTtJQUNoQyxrSEFBMEMsQ0FBQTtJQUMxQyw0R0FBdUMsQ0FBQTtJQUN2QyxvR0FBbUMsQ0FBQTtJQUNuQywrRkFBZ0MsQ0FBQTtJQUNoQyxxRUFBbUIsQ0FBQTtBQUNwQixDQUFDLEVBWFcsZ0JBQWdCLEtBQWhCLGdCQUFnQixRQVczQjtBQUNELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUNoQyxnQkFBZ0IsQ0FBQyx1QkFBdUI7SUFDeEMsZ0JBQWdCLENBQUMsOEJBQThCO0lBQy9DLGdCQUFnQixDQUFDLGlDQUFpQztJQUNsRCxnQkFBZ0IsQ0FBQyw2QkFBNkI7SUFDOUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUE7QUFxRjVDLE1BQU0sVUFBVSw2QkFBNkIsQ0FDNUMsT0FBK0I7SUFFL0IsT0FBTztRQUNOLDJCQUEyQjtRQUMzQixHQUFHLE9BQU87UUFFVixpREFBaUQ7UUFDakQsUUFBUSxFQUFFLDBCQUEwQixDQUFDLEVBQUU7UUFDdkMsTUFBTSxFQUFFLElBQUk7S0FDWixDQUFBO0FBQ0YsQ0FBQztBQVlELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQTtBQTBHN0YsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQUcsaUNBQWlDLENBQUE7QUFLcEYsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsdUJBQXVCLENBQUE7QUFDM0QsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsd0NBQXdDLENBQUE7QUFDdkYsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsaUNBQWlDLENBQUE7QUFFdkUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFBIn0=