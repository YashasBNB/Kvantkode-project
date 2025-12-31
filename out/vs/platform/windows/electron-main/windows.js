/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import electron from 'electron';
import { Color } from '../../../base/common/color.js';
import { join } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows, } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { WindowMinimumSize, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, zoomLevelToZoomFactor, } from '../../window/common/window.js';
import { defaultWindowState, } from '../../window/electron-main/window.js';
export const IWindowsMainService = createDecorator('windowsMainService');
export var OpenContext;
(function (OpenContext) {
    // opening when running from the command line
    OpenContext[OpenContext["CLI"] = 0] = "CLI";
    // macOS only: opening from the dock (also when opening files to a running instance from desktop)
    OpenContext[OpenContext["DOCK"] = 1] = "DOCK";
    // opening from the main application window
    OpenContext[OpenContext["MENU"] = 2] = "MENU";
    // opening from a file or folder dialog
    OpenContext[OpenContext["DIALOG"] = 3] = "DIALOG";
    // opening from the OS's UI
    OpenContext[OpenContext["DESKTOP"] = 4] = "DESKTOP";
    // opening through the API
    OpenContext[OpenContext["API"] = 5] = "API";
    // opening from a protocol link
    OpenContext[OpenContext["LINK"] = 6] = "LINK";
})(OpenContext || (OpenContext = {}));
export function defaultBrowserWindowOptions(accessor, windowState, overrides, webPreferences) {
    const themeMainService = accessor.get(IThemeMainService);
    const productService = accessor.get(IProductService);
    const configurationService = accessor.get(IConfigurationService);
    const environmentMainService = accessor.get(IEnvironmentMainService);
    const windowSettings = configurationService.getValue('window');
    const options = {
        backgroundColor: themeMainService.getBackgroundColor(),
        minWidth: WindowMinimumSize.WIDTH,
        minHeight: WindowMinimumSize.HEIGHT,
        title: productService.nameLong,
        show: windowState.mode !== 0 /* WindowMode.Maximized */ && windowState.mode !== 3 /* WindowMode.Fullscreen */, // reduce flicker by showing later
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            ...webPreferences,
            enableWebSQL: false,
            spellcheck: false,
            zoomFactor: zoomLevelToZoomFactor(windowState.zoomLevel ?? windowSettings?.zoomLevel),
            autoplayPolicy: 'user-gesture-required',
            // Enable experimental css highlight api https://chromestatus.com/feature/5436441440026624
            // Refs https://github.com/microsoft/vscode/issues/140098
            enableBlinkFeatures: 'HighlightAPI',
            sandbox: true,
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            enableDeprecatedPaste: true,
        },
        experimentalDarkMode: true,
    };
    if (isLinux) {
        // Dev override: use user's KvantKode logo if present
        const userLogo = '/Users/yashasnaidu/Kvantcode/PHOTO-2025-10-24-22-22-34.jpg';
        options.icon = userLogo;
    }
    else if (isWindows && !environmentMainService.isBuilt) {
        // Dev override for Windows out-of-sources
        const userLogo = 'C:/Users/yashas/Kvantcode/PHOTO-2025-10-24-22-22-34.jpg';
        options.icon = userLogo;
    }
    else if (isLinux) {
        options.icon = join(environmentMainService.appRoot, 'resources/linux/code.png'); // always on Linux
    }
    else if (isWindows && !environmentMainService.isBuilt) {
        options.icon = join(environmentMainService.appRoot, 'resources/win32/code_150x150.png'); // only when running out of sources on Windows
    }
    if (isMacintosh) {
        options.acceptFirstMouse = true; // enabled by default
        if (windowSettings?.clickThroughInactive === false) {
            options.acceptFirstMouse = false;
        }
    }
    if (overrides?.disableFullscreen) {
        options.fullscreen = false;
    }
    else if (isMacintosh && !useNativeFullScreen(configurationService)) {
        options.fullscreenable = false; // enables simple fullscreen mode
    }
    const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
    if (useNativeTabs) {
        options.tabbingIdentifier = productService.nameShort; // this opts in to sierra tabs
    }
    const hideNativeTitleBar = !hasNativeTitlebar(configurationService, overrides?.forceNativeTitlebar ? "native" /* TitlebarStyle.NATIVE */ : undefined);
    if (hideNativeTitleBar) {
        options.titleBarStyle = 'hidden';
        if (!isMacintosh) {
            options.frame = false;
        }
        if (useWindowControlsOverlay(configurationService)) {
            if (isMacintosh) {
                options.titleBarOverlay = true;
            }
            else {
                // This logic will not perfectly guess the right colors
                // to use on initialization, but prefer to keep things
                // simple as it is temporary and not noticeable
                const titleBarColor = themeMainService.getWindowSplash(undefined)?.colorInfo.titleBarBackground ??
                    themeMainService.getBackgroundColor();
                const symbolColor = Color.fromHex(titleBarColor).isDarker() ? '#FFFFFF' : '#000000';
                options.titleBarOverlay = {
                    height: 29, // the smallest size of the title bar on windows accounting for the border on windows 11
                    color: titleBarColor,
                    symbolColor,
                };
            }
        }
    }
    return options;
}
export function getLastFocused(windows) {
    let lastFocusedWindow = undefined;
    let maxLastFocusTime = Number.MIN_VALUE;
    for (const window of windows) {
        if (window.lastFocusTime > maxLastFocusTime) {
            maxLastFocusTime = window.lastFocusTime;
            lastFocusedWindow = window;
        }
    }
    return lastFocusedWindow;
}
export var WindowStateValidator;
(function (WindowStateValidator) {
    function validateWindowState(logService, state, displays = electron.screen.getAllDisplays()) {
        logService.trace(`window#validateWindowState: validating window state on ${displays.length} display(s)`, state);
        if (typeof state.x !== 'number' ||
            typeof state.y !== 'number' ||
            typeof state.width !== 'number' ||
            typeof state.height !== 'number') {
            logService.trace('window#validateWindowState: unexpected type of state values');
            return undefined;
        }
        if (state.width <= 0 || state.height <= 0) {
            logService.trace('window#validateWindowState: unexpected negative values');
            return undefined;
        }
        // Single Monitor: be strict about x/y positioning
        // macOS & Linux: these OS seem to be pretty good in ensuring that a window is never outside of it's bounds.
        // Windows: it is possible to have a window with a size that makes it fall out of the window. our strategy
        //          is to try as much as possible to keep the window in the monitor bounds. we are not as strict as
        //          macOS and Linux and allow the window to exceed the monitor bounds as long as the window is still
        //          some pixels (128) visible on the screen for the user to drag it back.
        if (displays.length === 1) {
            const displayWorkingArea = getWorkingArea(displays[0]);
            logService.trace('window#validateWindowState: single monitor working area', displayWorkingArea);
            if (displayWorkingArea) {
                function ensureStateInDisplayWorkingArea() {
                    if (!state ||
                        typeof state.x !== 'number' ||
                        typeof state.y !== 'number' ||
                        !displayWorkingArea) {
                        return;
                    }
                    if (state.x < displayWorkingArea.x) {
                        // prevent window from falling out of the screen to the left
                        state.x = displayWorkingArea.x;
                    }
                    if (state.y < displayWorkingArea.y) {
                        // prevent window from falling out of the screen to the top
                        state.y = displayWorkingArea.y;
                    }
                }
                // ensure state is not outside display working area (top, left)
                ensureStateInDisplayWorkingArea();
                if (state.width > displayWorkingArea.width) {
                    // prevent window from exceeding display bounds width
                    state.width = displayWorkingArea.width;
                }
                if (state.height > displayWorkingArea.height) {
                    // prevent window from exceeding display bounds height
                    state.height = displayWorkingArea.height;
                }
                if (state.x > displayWorkingArea.x + displayWorkingArea.width - 128) {
                    // prevent window from falling out of the screen to the right with
                    // 128px margin by positioning the window to the far right edge of
                    // the screen
                    state.x = displayWorkingArea.x + displayWorkingArea.width - state.width;
                }
                if (state.y > displayWorkingArea.y + displayWorkingArea.height - 128) {
                    // prevent window from falling out of the screen to the bottom with
                    // 128px margin by positioning the window to the far bottom edge of
                    // the screen
                    state.y = displayWorkingArea.y + displayWorkingArea.height - state.height;
                }
                // again ensure state is not outside display working area
                // (it may have changed from the previous validation step)
                ensureStateInDisplayWorkingArea();
            }
            return state;
        }
        // Multi Montior (fullscreen): try to find the previously used display
        if (state.display && state.mode === 3 /* WindowMode.Fullscreen */) {
            const display = displays.find((d) => d.id === state.display);
            if (display &&
                typeof display.bounds?.x === 'number' &&
                typeof display.bounds?.y === 'number') {
                logService.trace('window#validateWindowState: restoring fullscreen to previous display');
                const defaults = defaultWindowState(3 /* WindowMode.Fullscreen */); // make sure we have good values when the user restores the window
                defaults.x = display.bounds.x; // carefull to use displays x/y position so that the window ends up on the correct monitor
                defaults.y = display.bounds.y;
                return defaults;
            }
        }
        // Multi Monitor (non-fullscreen): ensure window is within display bounds
        let display;
        let displayWorkingArea;
        try {
            display = electron.screen.getDisplayMatching({
                x: state.x,
                y: state.y,
                width: state.width,
                height: state.height,
            });
            displayWorkingArea = getWorkingArea(display);
            logService.trace('window#validateWindowState: multi-monitor working area', displayWorkingArea);
        }
        catch (error) {
            // Electron has weird conditions under which it throws errors
            // e.g. https://github.com/microsoft/vscode/issues/100334 when
            // large numbers are passed in
            logService.error('window#validateWindowState: error finding display for window state', error);
        }
        if (display && // we have a display matching the desired bounds
            displayWorkingArea && // we have valid working area bounds
            state.x + state.width > displayWorkingArea.x && // prevent window from falling out of the screen to the left
            state.y + state.height > displayWorkingArea.y && // prevent window from falling out of the screen to the top
            state.x < displayWorkingArea.x + displayWorkingArea.width && // prevent window from falling out of the screen to the right
            state.y < displayWorkingArea.y + displayWorkingArea.height // prevent window from falling out of the screen to the bottom
        ) {
            return state;
        }
        logService.trace('window#validateWindowState: state is outside of the multi-monitor working area');
        return undefined;
    }
    WindowStateValidator.validateWindowState = validateWindowState;
    function getWorkingArea(display) {
        // Prefer the working area of the display to account for taskbars on the
        // desktop being positioned somewhere (https://github.com/microsoft/vscode/issues/50830).
        //
        // Linux X11 sessions sometimes report wrong display bounds, so we validate
        // the reported sizes are positive.
        if (display.workArea.width > 0 && display.workArea.height > 0) {
            return display.workArea;
        }
        if (display.bounds.width > 0 && display.bounds.height > 0) {
            return display.bounds;
        }
        return undefined;
    }
})(WindowStateValidator || (WindowStateValidator = {}));
/**
 * We have some components like `NativeWebContentExtractorService` that create offscreen windows
 * to extract content from web pages. These windows are not visible to the user and are not
 * considered part of the main application window. This function filters out those offscreen
 * windows from the list of all windows.
 * @returns An array of all BrowserWindow instances that are not offscreen.
 */
export function getAllWindowsExcludingOffscreen() {
    return electron.BrowserWindow.getAllWindows().filter((win) => !win.webContents.isOffscreen());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvZWxlY3Ryb24tbWFpbi93aW5kb3dzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFFTixPQUFPLEVBQ1AsV0FBVyxFQUNYLFNBQVMsR0FDVCxNQUFNLGtDQUFrQyxDQUFBO0FBR3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRW5GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBb0IsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2pGLE9BQU8sRUFLTixpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQix3QkFBd0IsRUFDeEIscUJBQXFCLEdBQ3JCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUlOLGtCQUFrQixHQUNsQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQTtBQWtEN0YsTUFBTSxDQUFOLElBQWtCLFdBcUJqQjtBQXJCRCxXQUFrQixXQUFXO0lBQzVCLDZDQUE2QztJQUM3QywyQ0FBRyxDQUFBO0lBRUgsaUdBQWlHO0lBQ2pHLDZDQUFJLENB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