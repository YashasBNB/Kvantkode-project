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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGF5b3V0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xheW91dC9icm93c2VyL2xheW91dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBSXJGLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFHTixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLGlCQUFpQixHQUNqQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFJaEYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsc0JBQXNCLENBRzNELGNBQWMsQ0FBQyxDQUFBO0FBRWpCLE1BQU0sQ0FBTixJQUFrQixLQVNqQjtBQVRELFdBQWtCLEtBQUs7SUFDdEIsbURBQTBDLENBQUE7SUFDMUMsK0NBQXNDLENBQUE7SUFDdEMseURBQWdELENBQUE7SUFDaEQsaURBQXdDLENBQUE7SUFDeEMsNkNBQW9DLENBQUE7SUFDcEMsMkRBQWtELENBQUE7SUFDbEQsK0NBQXNDLENBQUE7SUFDdEMscURBQTRDLENBQUE7QUFDN0MsQ0FBQyxFQVRpQixLQUFLLEtBQUwsS0FBSyxRQVN0QjtBQUVELE1BQU0sQ0FBTixJQUFrQixlQVNqQjtBQVRELFdBQWtCLGVBQWU7SUFDaEMsaURBQThCLENBQUE7SUFDOUIsK0RBQTRDLENBQUE7SUFD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