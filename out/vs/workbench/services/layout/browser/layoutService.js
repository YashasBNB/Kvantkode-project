/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { isMacintosh, isNative, isWeb } from '../../../../base/common/platform.js';
import { isAuxiliaryWindow } from '../../../../base/browser/window.js';
import { getMenuBarVisibility, hasCustomTitlebar, hasNativeTitlebar, } from '../../../../platform/window/common/window.js';
import { isFullscreen, isWCOEnabled } from '../../../../base/browser/browser.js';
export const IWorkbenchLayoutService = refineServiceDecorator(ILayoutService);
export var Parts;
(function (Parts) {
    Parts["TITLEBAR_PART"] = "workbench.parts.titlebar";
    Parts["BANNER_PART"] = "workbench.parts.banner";
    Parts["ACTIVITYBAR_PART"] = "workbench.parts.activitybar";
    Parts["SIDEBAR_PART"] = "workbench.parts.sidebar";
    Parts["PANEL_PART"] = "workbench.parts.panel";
    Parts["AUXILIARYBAR_PART"] = "workbench.parts.auxiliarybar";
    Parts["EDITOR_PART"] = "workbench.parts.editor";
    Parts["STATUSBAR_PART"] = "workbench.parts.statusbar";
})(Parts || (Parts = {}));
export var ZenModeSettings;
(function (ZenModeSettings) {
    ZenModeSettings["SHOW_TABS"] = "zenMode.showTabs";
    ZenModeSettings["HIDE_LINENUMBERS"] = "zenMode.hideLineNumbers";
    ZenModeSettings["HIDE_STATUSBAR"] = "zenMode.hideStatusBar";
    ZenModeSettings["HIDE_ACTIVITYBAR"] = "zenMode.hideActivityBar";
    ZenModeSettings["CENTER_LAYOUT"] = "zenMode.centerLayout";
    ZenModeSettings["FULLSCREEN"] = "zenMode.fullScreen";
    ZenModeSettings["RESTORE"] = "zenMode.restore";
    ZenModeSettings["SILENT_NOTIFICATIONS"] = "zenMode.silentNotifications";
})(ZenModeSettings || (ZenModeSettings = {}));
export var LayoutSettings;
(function (LayoutSettings) {
    LayoutSettings["ACTIVITY_BAR_LOCATION"] = "workbench.activityBar.location";
    LayoutSettings["EDITOR_TABS_MODE"] = "workbench.editor.showTabs";
    LayoutSettings["EDITOR_ACTIONS_LOCATION"] = "workbench.editor.editorActionsLocation";
    LayoutSettings["COMMAND_CENTER"] = "window.commandCenter";
    LayoutSettings["LAYOUT_ACTIONS"] = "workbench.layoutControl.enabled";
})(LayoutSettings || (LayoutSettings = {}));
export var ActivityBarPosition;
(function (ActivityBarPosition) {
    ActivityBarPosition["DEFAULT"] = "default";
    ActivityBarPosition["TOP"] = "top";
    ActivityBarPosition["BOTTOM"] = "bottom";
    ActivityBarPosition["HIDDEN"] = "hidden";
})(ActivityBarPosition || (ActivityBarPosition = {}));
export var EditorTabsMode;
(function (EditorTabsMode) {
    EditorTabsMode["MULTIPLE"] = "multiple";
    EditorTabsMode["SINGLE"] = "single";
    EditorTabsMode["NONE"] = "none";
})(EditorTabsMode || (EditorTabsMode = {}));
export var EditorActionsLocation;
(function (EditorActionsLocation) {
    EditorActionsLocation["DEFAULT"] = "default";
    EditorActionsLocation["TITLEBAR"] = "titleBar";
    EditorActionsLocation["HIDDEN"] = "hidden";
})(EditorActionsLocation || (EditorActionsLocation = {}));
export var Position;
(function (Position) {
    Position[Position["LEFT"] = 0] = "LEFT";
    Position[Position["RIGHT"] = 1] = "RIGHT";
    Position[Position["BOTTOM"] = 2] = "BOTTOM";
    Position[Position["TOP"] = 3] = "TOP";
})(Position || (Position = {}));
export function isHorizontal(position) {
    return position === 2 /* Position.BOTTOM */ || position === 3 /* Position.TOP */;
}
export var PanelOpensMaximizedOptions;
(function (PanelOpensMaximizedOptions) {
    PanelOpensMaximizedOptions[PanelOpensMaximizedOptions["ALWAYS"] = 0] = "ALWAYS";
    PanelOpensMaximizedOptions[PanelOpensMaximizedOptions["NEVER"] = 1] = "NEVER";
    PanelOpensMaximizedOptions[PanelOpensMaximizedOptions["REMEMBER_LAST"] = 2] = "REMEMBER_LAST";
})(PanelOpensMaximizedOptions || (PanelOpensMaximizedOptions = {}));
export function positionToString(position) {
    switch (position) {
        case 0 /* Position.LEFT */:
            return 'left';
        case 1 /* Position.RIGHT */:
            return 'right';
        case 2 /* Position.BOTTOM */:
            return 'bottom';
        case 3 /* Position.TOP */:
            return 'top';
        default:
            return 'bottom';
    }
}
const positionsByString = {
    [positionToString(0 /* Position.LEFT */)]: 0 /* Position.LEFT */,
    [positionToString(1 /* Position.RIGHT */)]: 1 /* Position.RIGHT */,
    [positionToString(2 /* Position.BOTTOM */)]: 2 /* Position.BOTTOM */,
    [positionToString(3 /* Position.TOP */)]: 3 /* Position.TOP */,
};
export function positionFromString(str) {
    return positionsByString[str];
}
function panelOpensMaximizedSettingToString(setting) {
    switch (setting) {
        case 0 /* PanelOpensMaximizedOptions.ALWAYS */:
            return 'always';
        case 1 /* PanelOpensMaximizedOptions.NEVER */:
            return 'never';
        case 2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */:
            return 'preserve';
        default:
            return 'preserve';
    }
}
const panelOpensMaximizedByString = {
    [panelOpensMaximizedSettingToString(0 /* PanelOpensMaximizedOptions.ALWAYS */)]: 0 /* PanelOpensMaximizedOptions.ALWAYS */,
    [panelOpensMaximizedSettingToString(1 /* PanelOpensMaximizedOptions.NEVER */)]: 1 /* PanelOpensMaximizedOptions.NEVER */,
    [panelOpensMaximizedSettingToString(2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */)]: 2 /* PanelOpensMaximizedOptions.REMEMBER_LAST */,
};
export function panelOpensMaximizedFromString(str) {
    return panelOpensMaximizedByString[str];
}
export function isMultiWindowPart(part) {
    return part === "workbench.parts.editor" /* Parts.EDITOR_PART */ || part === "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */ || part === "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */;
}
export function shouldShowCustomTitleBar(configurationService, window, menuBarToggled) {
    if (!hasCustomTitlebar(configurationService)) {
        return false;
    }
    const inFullscreen = isFullscreen(window);
    const nativeTitleBarEnabled = hasNativeTitlebar(configurationService);
    if (!isWeb) {
        const showCustomTitleBar = configurationService.getValue("window.customTitleBarVisibility" /* TitleBarSetting.CUSTOM_TITLE_BAR_VISIBILITY */);
        if ((showCustomTitleBar === "never" /* CustomTitleBarVisibility.NEVER */ && nativeTitleBarEnabled) ||
            (showCustomTitleBar === "windowed" /* CustomTitleBarVisibility.WINDOWED */ && inFullscreen)) {
            return false;
        }
    }
    if (!isTitleBarEmpty(configurationService)) {
        return true;
    }
    // Hide custom title bar when native title bar enabled and custom title bar is empty
    if (nativeTitleBarEnabled) {
        return false;
    }
    // macOS desktop does not need a title bar when full screen
    if (isMacintosh && isNative) {
        return !inFullscreen;
    }
    // non-fullscreen native must show the title bar
    if (isNative && !inFullscreen) {
        return true;
    }
    // if WCO is visible, we have to show the title bar
    if (isWCOEnabled() && !inFullscreen) {
        return true;
    }
    // remaining behavior is based on menubar visibility
    const menuBarVisibility = !isAuxiliaryWindow(window)
        ? getMenuBarVisibility(configurationService)
        : 'hidden';
    switch (menuBarVisibility) {
        case 'classic':
            return !inFullscreen || !!menuBarToggled;
        case 'compact':
        case 'hidden':
            return false;
        case 'toggle':
            return !!menuBarToggled;
        case 'visible':
            return true;
        default:
            return isWeb ? false : !inFullscreen || !!menuBarToggled;
    }
}
function isTitleBarEmpty(configurationService) {
    // with the command center enabled, we should always show
    if (configurationService.getValue("window.commandCenter" /* LayoutSettings.COMMAND_CENTER */)) {
        return false;
    }
    // with the activity bar on top, we should always show
    const activityBarPosition = configurationService.getValue("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */);
    if (activityBarPosition === "top" /* ActivityBarPosition.TOP */ ||
        activityBarPosition === "bottom" /* ActivityBarPosition.BOTTOM */) {
        return false;
    }
    // with the editor actions on top, we should always show
    const editorActionsLocation = configurationService.getValue("workbench.editor.editorActionsLocation" /* LayoutSettings.EDITOR_ACTIONS_LOCATION */);
    const editorTabsMode = configurationService.getValue("workbench.editor.showTabs" /* LayoutSettings.EDITOR_TABS_MODE */);
    if (editorActionsLocation === "titleBar" /* EditorActionsLocation.TITLEBAR */ ||
        (editorActionsLocation === "default" /* EditorActionsLocation.DEFAULT */ &&
            editorTabsMode === "none" /* EditorTabsMode.NONE */)) {
        return false;
    }
    // with the layout actions on top, we should always show
    if (configurationService.getValue("workbench.layoutControl.enabled" /* LayoutSettings.LAYOUT_ACTIONS */)) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYXlvdXQvYnJvd3Nlci9sYXlvdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRW5HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUlyRixPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBR04sb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixpQkFBaUIsR0FDakIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBSWhGLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLHNCQUFzQixDQUczRCxjQUFjLENBQUMsQ0FBQTtBQUVqQixNQUFNLENBQU4sSUFBa0IsS0FTakI7QUFURCxXQUFrQixLQUFLO0lBQ3RCLG1EQUEwQyxDQUFBO0lBQzFDLCtDQUFzQyxDQUFBO0lBQ3RDLHlEQUFnRCxDQUFBO0lBQ2hELGlEQUF3QyxDQUFBO0lBQ3hDLDZDQUFvQyxDQUFBO0lBQ3BDLDJEQUFrRCxDQUFBO0lBQ2xELCtDQUFzQyxDQUFBO0lBQ3RDLHFEQUE0QyxDQUFBO0FBQzdDLENBQUMsRUFUaUIsS0FBSyxLQUFMLEtBQUssUUFTdEI7QUFFRCxNQUFNLENBQU4sSUFBa0IsZUFTakI7QUFURCxXQUFrQixlQUFlO0lBQ2hDLGlEQUE4QixDQUFBO0lBQzlCLCtEQUE0QyxDQUFBO0lBQzVDLDJE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