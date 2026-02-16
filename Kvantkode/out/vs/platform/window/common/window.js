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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93aW5kb3cvY29tbW9uL3dpbmRvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWlCL0UsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUc7SUFDaEMsS0FBSyxFQUFFLEdBQUc7SUFDVix5QkFBeUIsRUFBRSxHQUFHO0lBQzlCLE1BQU0sRUFBRSxHQUFHO0NBQ1gsQ0FBQTtBQW1FRCxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLFNBQXFEO0lBRXJELE9BQU8sT0FBUSxTQUFvQyxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUE7QUFDMUUsQ0FBQztBQXNCRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsU0FBMEI7SUFDM0QsT0FBTyxDQUFDLENBQUUsU0FBOEIsQ0FBQyxZQUFZLENBQUE7QUFDdEQsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsU0FBMEI7SUFDeEQsT0FBTyxDQUFDLENBQUUsU0FBMkIsQ0FBQyxTQUFTLENBQUE7QUFDaEQsQ0FBQztBQUVELE1BQU0sVUFBVSxZQUFZLENBQUMsU0FBMEI7SUFDdEQsT0FBTyxDQUFDLENBQUUsU0FBeUIsQ0FBQyxPQUFPLENBQUE7QUFDNUMsQ0FBQztBQUlELE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsb0JBQTJDO0lBRTNDLE1BQU0scUJBQXFCLEdBQUcsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUNyRSxNQUFNLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FDdEQsMEJBQTBCLENBQzFCLENBQUE7SUFFRCxJQUNDLGlCQUFpQixLQUFLLFNBQVM7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