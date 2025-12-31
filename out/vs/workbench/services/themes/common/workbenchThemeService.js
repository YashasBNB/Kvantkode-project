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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vd29ya2JlbmNoVGhlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR25HLE9BQU8sRUFFTixhQUFhLEdBR2IsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBSXRFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLHNCQUFzQixDQUMzRCxhQUFhLENBQ2IsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQTtBQUN6QyxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxHQUFHLENBQUE7QUFDMUMsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFBO0FBRXZDLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUE7QUFFM0MsTUFBTSxDQUFOLElBQVksYUFnQlg7QUFoQkQsV0FBWSxhQUFhO0lBQ3hCLHFEQUFvQyxDQUFBO0lBQ3BDLHdEQUF1QyxDQUFBO0lBQ3ZDLGtFQUFpRCxDQUFBO0lBQ2pELHVFQUFzRCxDQUFBO0lBQ3RELCtFQUE4RCxDQUFBO0lBQzlELGdHQUErRSxDQUFBO0lBRS9FLDJFQUEwRCxDQUFBO0lBQzFELDZFQUE0RCxDQUFBO0lBQzVELHNGQUFxRSxDQUFBLENBQUMsdUNBQXVDO0lBQzdHLDRGQUEyRSxDQUFBO0lBQzNFLHFFQUFvRCxDQUFBO0lBQ3BELDREQUEyQyxDQUFBO0lBRTNDLCtEQUE4QyxDQUFBO0FBQy9DLENBQUMsRUFoQlcsYUFB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