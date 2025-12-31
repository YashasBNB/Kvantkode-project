/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh, isNative, isWeb } from '../../../base/common/platform.js';
export const WindowMinimumSize = {
    WIDTH: 400,
    WIDTH_WITH_VERTICAL_PANEL: 600,
    HEIGHT: 270,
};
export function isOpenedAuxiliaryWindow(candidate) {
    return typeof candidate.parentId === 'number';
}
export function isWorkspaceToOpen(uriToOpen) {
    return !!uriToOpen.workspaceUri;
}
export function isFolderToOpen(uriToOpen) {
    return !!uriToOpen.folderUri;
}
export function isFileToOpen(uriToOpen) {
    return !!uriToOpen.fileUri;
}
export function getMenuBarVisibility(configurationService) {
    const nativeTitleBarEnabled = hasNativeTitlebar(configurationService);
    const menuBarVisibility = configurationService.getValue('window.menuBarVisibility');
    if (menuBarVisibility === 'default' ||
        (nativeTitleBarEnabled && menuBarVisibility === 'compact') ||
        (isMacintosh && isNative)) {
        return 'classic';
    }
    else {
        return menuBarVisibility;
    }
}
export var TitleBarSetting;
(function (TitleBarSetting) {
    TitleBarSetting["TITLE_BAR_STYLE"] = "window.titleBarStyle";
    TitleBarSetting["CUSTOM_TITLE_BAR_VISIBILITY"] = "window.customTitleBarVisibility";
})(TitleBarSetting || (TitleBarSetting = {}));
export var TitlebarStyle;
(function (TitlebarStyle) {
    TitlebarStyle["NATIVE"] = "native";
    TitlebarStyle["CUSTOM"] = "custom";
})(TitlebarStyle || (TitlebarStyle = {}));
export var WindowControlsStyle;
(function (WindowControlsStyle) {
    WindowControlsStyle["NATIVE"] = "native";
    WindowControlsStyle["CUSTOM"] = "custom";
    WindowControlsStyle["HIDDEN"] = "hidden";
})(WindowControlsStyle || (WindowControlsStyle = {}));
export var CustomTitleBarVisibility;
(function (CustomTitleBarVisibility) {
    CustomTitleBarVisibility["AUTO"] = "auto";
    CustomTitleBarVisibility["WINDOWED"] = "windowed";
    CustomTitleBarVisibility["NEVER"] = "never";
})(CustomTitleBarVisibility || (CustomTitleBarVisibility = {}));
export function hasCustomTitlebar(configurationService, titleBarStyle) {
    // Returns if it possible to have a custom title bar in the curren session
    // Does not imply that the title bar is visible
    return true;
}
export function hasNativeTitlebar(configurationService, titleBarStyle) {
    if (!titleBarStyle) {
        titleBarStyle = getTitleBarStyle(configurationService);
    }
    return titleBarStyle === "native" /* TitlebarStyle.NATIVE */;
}
export function getTitleBarStyle(configurationService) {
    if (isWeb) {
        return "custom" /* TitlebarStyle.CUSTOM */;
    }
    const configuration = configurationService.getValue('window');
    if (configuration) {
        const useNativeTabs = isMacintosh && configuration.nativeTabs === true;
        if (useNativeTabs) {
            return "native" /* TitlebarStyle.NATIVE */; // native tabs on sierra do not work with custom title style
        }
        const useSimpleFullScreen = isMacintosh && configuration.nativeFullScreen === false;
        if (useSimpleFullScreen) {
            return "native" /* TitlebarStyle.NATIVE */; // simple fullscreen does not work well with custom title style (https://github.com/microsoft/vscode/issues/63291)
        }
        const style = configuration.titleBarStyle;
        if (style === "native" /* TitlebarStyle.NATIVE */ || style === "custom" /* TitlebarStyle.CUSTOM */) {
            return style;
        }
    }
    return "custom" /* TitlebarStyle.CUSTOM */; // default to custom on all OS
}
export function getWindowControlsStyle(configurationService) {
    if (isWeb || isMacintosh || getTitleBarStyle(configurationService) === "native" /* TitlebarStyle.NATIVE */) {
        return "native" /* WindowControlsStyle.NATIVE */; // only supported on Windows/Linux desktop with custom titlebar
    }
    const configuration = configurationService.getValue('window');
    const style = configuration?.controlsStyle;
    if (style === "custom" /* WindowControlsStyle.CUSTOM */ || style === "hidden" /* WindowControlsStyle.HIDDEN */) {
        return style;
    }
    return "native" /* WindowControlsStyle.NATIVE */; // default to native on all OS
}
export const DEFAULT_CUSTOM_TITLEBAR_HEIGHT = 35; // includes space for command center
export function useWindowControlsOverlay(configurationService) {
    if (isWeb) {
        return false; // only supported on desktop instances
    }
    if (hasNativeTitlebar(configurationService)) {
        return false; // only supported when title bar is custom
    }
    if (!isMacintosh) {
        const setting = getWindowControlsStyle(configurationService);
        if (setting === "custom" /* WindowControlsStyle.CUSTOM */ || setting === "hidden" /* WindowControlsStyle.HIDDEN */) {
            return false; // explicitly disabled by choice
        }
    }
    return true; // default
}
export function useNativeFullScreen(configurationService) {
    const windowConfig = configurationService.getValue('window');
    if (!windowConfig || typeof windowConfig.nativeFullScreen !== 'boolean') {
        return true; // default
    }
    if (windowConfig.nativeTabs) {
        return true; // https://github.com/electron/electron/issues/16142
    }
    return windowConfig.nativeFullScreen !== false;
}
/**
 * According to Electron docs: `scale := 1.2 ^ level`.
 * https://github.com/electron/electron/blob/master/docs/api/web-contents.md#contentssetzoomlevellevel
 */
export function zoomLevelToZoomFactor(zoomLevel = 0) {
    return Math.pow(1.2, zoomLevel);
}
export const DEFAULT_WINDOW_SIZE = { width: 1200, height: 800 };
export const DEFAULT_AUX_WINDOW_SIZE = { width: 1024, height: 768 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2luZG93L2NvbW1vbi93aW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFpQi9FLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHO0lBQ2hDLEtBQUssRUFBRSxHQUFHO0lBQ1YseUJBQXlCLEVBQUUsR0FBRztJQUM5QixNQUFNLEVBQUUsR0FBRztDQUNYLENBQUE7QUFtRUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxTQUFxRDtJQUVyRCxPQUFPLE9BQVEsU0FBb0MsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFBO0FBQzFFLENBQUM7QUFzQkQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLFNBQTBCO0lBQzNELE9BQU8sQ0FBQyxDQUFFLFNBQThCLENBQUMsWUFBWSxDQUFBO0FBQ3RELENBQUM7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLFNBQTBCO0lBQ3hELE9BQU8sQ0FBQyxDQUFFLFNBQTJCLENBQUMsU0FBUyxDQUFBO0FBQ2hELENBQUM7QUFFRCxNQUFNLFVBQVUsWUFBWSxDQUFDLFNBQTBCO0lBQ3RELE9BQU8sQ0FBQyxDQUFFLFNBQXlCLENBQUMsT0FBTyxDQUFBO0FBQzVDLENBQUM7QUFJRCxNQUFNLFVBQVUsb0JBQW9CLENBQ25DLG9CQUEyQztJQUUzQyxNQUFNLHFCQUFxQixHQUFHLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDckUsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQ3RELDBCQUEwQixDQUMxQixDQUFBO0lBRUQsSUFDQyxpQkFBaUIsS0FBSyxTQUFTO1FBQy9CLENBQUMscUJBQXFCLElBQUks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