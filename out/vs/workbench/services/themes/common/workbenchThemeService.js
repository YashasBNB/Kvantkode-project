/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService, } from '../../../../platform/theme/common/themeService.js';
import { isBoolean, isString } from '../../../../base/common/types.js';
export const IWorkbenchThemeService = refineServiceDecorator(IThemeService);
export const THEME_SCOPE_OPEN_PAREN = '[';
export const THEME_SCOPE_CLOSE_PAREN = ']';
export const THEME_SCOPE_WILDCARD = '*';
export const themeScopeRegex = /\[(.+?)\]/g;
export var ThemeSettings;
(function (ThemeSettings) {
    ThemeSettings["COLOR_THEME"] = "workbench.colorTheme";
    ThemeSettings["FILE_ICON_THEME"] = "workbench.iconTheme";
    ThemeSettings["PRODUCT_ICON_THEME"] = "workbench.productIconTheme";
    ThemeSettings["COLOR_CUSTOMIZATIONS"] = "workbench.colorCustomizations";
    ThemeSettings["TOKEN_COLOR_CUSTOMIZATIONS"] = "editor.tokenColorCustomizations";
    ThemeSettings["SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS"] = "editor.semanticTokenColorCustomizations";
    ThemeSettings["PREFERRED_DARK_THEME"] = "workbench.preferredDarkColorTheme";
    ThemeSettings["PREFERRED_LIGHT_THEME"] = "workbench.preferredLightColorTheme";
    ThemeSettings["PREFERRED_HC_DARK_THEME"] = "workbench.preferredHighContrastColorTheme"; /* id kept for compatibility reasons */
    ThemeSettings["PREFERRED_HC_LIGHT_THEME"] = "workbench.preferredHighContrastLightColorTheme";
    ThemeSettings["DETECT_COLOR_SCHEME"] = "window.autoDetectColorScheme";
    ThemeSettings["DETECT_HC"] = "window.autoDetectHighContrast";
    ThemeSettings["SYSTEM_COLOR_THEME"] = "window.systemColorTheme";
})(ThemeSettings || (ThemeSettings = {}));
export var ThemeSettingDefaults;
(function (ThemeSettingDefaults) {
    ThemeSettingDefaults["COLOR_THEME_DARK"] = "Default Dark+";
    ThemeSettingDefaults["COLOR_THEME_LIGHT"] = "Default Light Modern";
    ThemeSettingDefaults["COLOR_THEME_HC_DARK"] = "Default High Contrast";
    ThemeSettingDefaults["COLOR_THEME_HC_LIGHT"] = "Default High Contrast Light";
    ThemeSettingDefaults["COLOR_THEME_DARK_OLD"] = "Default Dark Modern";
    ThemeSettingDefaults["COLOR_THEME_LIGHT_OLD"] = "Default Light+";
    ThemeSettingDefaults["FILE_ICON_THEME"] = "vs-seti";
    ThemeSettingDefaults["PRODUCT_ICON_THEME"] = "Default";
})(ThemeSettingDefaults || (ThemeSettingDefaults = {}));
export const COLOR_THEME_DARK_INITIAL_COLORS = {
    // Void changed this to match dark+
    'activityBar.activeBorder': '#ffffff',
    'activityBar.background': '#333333',
    'activityBar.border': '#454545',
    'activityBar.foreground': '#ffffff',
    'activityBar.inactiveForeground': '#ffffff66',
    'editorGroup.border': '#444444',
    'editorGroupHeader.tabsBackground': '#252526',
    'editorGroupHeader.tabsBorder': '#252526',
    'statusBar.background': '#007ACC',
    'statusBar.border': '#454545',
    'statusBar.foreground': '#ffffff',
    'statusBar.noFolderBackground': '#68217A',
    'tab.activeBackground': '#2D2D2D',
    'tab.activeBorder': '#ffffff',
    'tab.activeBorderTop': '#007ACC',
    'tab.activeForeground': '#ffffff',
    'tab.border': '#252526',
    'textLink.foreground': '#3794ff',
    'titleBar.activeBackground': '#3C3C3C',
    'titleBar.activeForeground': '#CCCCCC',
    'titleBar.border': '#454545',
    'titleBar.inactiveBackground': '#2C2C2C',
    'titleBar.inactiveForeground': '#999999',
    'welcomePage.tileBackground': '#252526',
};
export const COLOR_THEME_LIGHT_INITIAL_COLORS = {
    'activityBar.activeBorder': '#005FB8',
    'activityBar.background': '#f8f8f8',
    'activityBar.border': '#e5e5e5',
    'activityBar.foreground': '#1f1f1f',
    'activityBar.inactiveForeground': '#616161',
    'editorGroup.border': '#e5e5e5',
    'editorGroupHeader.tabsBackground': '#f8f8f8',
    'editorGroupHeader.tabsBorder': '#e5e5e5',
    'statusBar.background': '#f8f8f8',
    'statusBar.border': '#e5e5e5',
    'statusBar.foreground': '#3b3b3b',
    'statusBar.noFolderBackground': '#f8f8f8',
    'tab.activeBackground': '#ffffff',
    'tab.activeBorder': '#f8f8f8',
    'tab.activeBorderTop': '#005fb8',
    'tab.activeForeground': '#3b3b3b',
    'tab.border': '#e5e5e5',
    'textLink.foreground': '#005fb8',
    'titleBar.activeBackground': '#f8f8f8',
    'titleBar.activeForeground': '#1e1e1e',
    'titleBar.border': '#E5E5E5',
    'titleBar.inactiveBackground': '#f8f8f8',
    'titleBar.inactiveForeground': '#8b949e',
    'welcomePage.tileBackground': '#f3f3f3',
};
export var ExtensionData;
(function (ExtensionData) {
    function toJSONObject(d) {
        return (d && {
            _extensionId: d.extensionId,
            _extensionIsBuiltin: d.extensionIsBuiltin,
            _extensionName: d.extensionName,
            _extensionPublisher: d.extensionPublisher,
        });
    }
    ExtensionData.toJSONObject = toJSONObject;
    function fromJSONObject(o) {
        if (o &&
            isString(o._extensionId) &&
            isBoolean(o._extensionIsBuiltin) &&
            isString(o._extensionName) &&
            isString(o._extensionPublisher)) {
            return {
                extensionId: o._extensionId,
                extensionIsBuiltin: o._extensionIsBuiltin,
                extensionName: o._extensionName,
                extensionPublisher: o._extensionPublisher,
            };
        }
        return undefined;
    }
    ExtensionData.fromJSONObject = fromJSONObject;
    function fromName(publisher, name, isBuiltin = false) {
        return {
            extensionPublisher: publisher,
            extensionId: `${publisher}.${name}`,
            extensionName: name,
            extensionIsBuiltin: isBuiltin,
        };
    }
    ExtensionData.fromName = fromName;
})(ExtensionData || (ExtensionData = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi93b3JrYmVuY2hUaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbkcsT0FBTyxFQUVOLGFBQWEsR0FHYixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFJdEUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsc0JBQXNCLENBQzNELGFBQWEsQ0FDYixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsR0FBRyxDQUFBO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQTtBQUMxQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxHQUFHLENBQUE7QUFFdkMsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQTtBQUUzQyxNQUFNLENBQU4sSUFBWSxhQWdCWDtBQWhCRCxXQUFZLGFBQWE7SUFDeEIscURBQW9DLENBQUE7SUFDcEMsd0RBQXVDLENBQUE7SUFDdkMsa0VBQWlELENBQUE7SUFDakQsdUVBQXNELENBQUE7SUFDdEQsK0VBQThELENBQUE7SUFDOUQsZ0dBQStFLENBQUE7SUFFL0UsMkVBQTBELENBQUE7SUFDMUQsNkVBQTRELENBQUE7SUFDNUQsc0ZBQXFFLENBQUEsQ0FBQyx1Q0FBdUM7SUFDN0csNEZBQTJFLENBQUE7SUFDM0UscUVBQW9ELENBQUE7SUFDcEQsNERBQTJDLENBQUE7SUFFM0MsK0RBQThDLENBQUE7QUFDL0MsQ0FBQyxFQWhC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