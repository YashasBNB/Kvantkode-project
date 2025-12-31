/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import electron from 'electron';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IStateService } from '../../state/node/state.js';
import { ThemeTypeSelector } from '../common/theme.js';
import { coalesce } from '../../../base/common/arrays.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
// These default colors match our default themes
// editor background color ("Dark Modern", etc...)
const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1F1F1F';
const DEFAULT_BG_HC_BLACK = '#000000';
const DEFAULT_BG_HC_LIGHT = '#FFFFFF';
const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBackground';
const THEME_WINDOW_SPLASH_KEY = 'windowSplash';
const THEME_WINDOW_SPLASH_WORKSPACE_OVERRIDE_KEY = 'windowSplashWorkspaceOverride';
var ThemeSettings;
(function (ThemeSettings) {
    ThemeSettings.DETECT_COLOR_SCHEME = 'window.autoDetectColorScheme';
    ThemeSettings.DETECT_HC = 'window.autoDetectHighContrast';
    ThemeSettings.SYSTEM_COLOR_THEME = 'window.systemColorTheme';
})(ThemeSettings || (ThemeSettings = {}));
export const IThemeMainService = createDecorator('themeMainService');
let ThemeMainService = class ThemeMainService extends Disposable {
    constructor(stateService, configurationService) {
        super();
        this.stateService = stateService;
        this.configurationService = configurationService;
        this._onDidChangeColorScheme = this._register(new Emitter());
        this.onDidChangeColorScheme = this._onDidChangeColorScheme.event;
        // System Theme
        if (!isLinux) {
            this._register(this.configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME) ||
                    e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME)) {
                    this.updateSystemColorTheme();
                }
            }));
        }
        this.updateSystemColorTheme();
        // Color Scheme changes
        this._register(Event.fromNodeEventEmitter(electron.nativeTheme, 'updated')(() => this._onDidChangeColorScheme.fire(this.getColorScheme())));
    }
    updateSystemColorTheme() {
        if (isLinux || this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            // only with `system` we can detect the system color scheme
            electron.nativeTheme.themeSource = 'system';
        }
        else {
            switch (this.configurationService.getValue(ThemeSettings.SYSTEM_COLOR_THEME)) {
                case 'dark':
                    electron.nativeTheme.themeSource = 'dark';
                    break;
                case 'light':
                    electron.nativeTheme.themeSource = 'light';
                    break;
                case 'auto':
                    switch (this.getPreferredBaseTheme() ?? this.getStoredBaseTheme()) {
                        case ThemeTypeSelector.VS:
                            electron.nativeTheme.themeSource = 'light';
                            break;
                        case ThemeTypeSelector.VS_DARK:
                            electron.nativeTheme.themeSource = 'dark';
                            break;
                        default:
                            electron.nativeTheme.themeSource = 'system';
                    }
                    break;
                default:
                    electron.nativeTheme.themeSource = 'system';
                    break;
            }
        }
    }
    getColorScheme() {
        if (isWindows) {
            // high contrast is reflected by the shouldUseInvertedColorScheme property
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                // shouldUseInvertedColorScheme is dark, !shouldUseInvertedColorScheme is light
                return { dark: electron.nativeTheme.shouldUseInvertedColorScheme, highContrast: true };
            }
        }
        else if (isMacintosh) {
            // high contrast is set if one of shouldUseInvertedColorScheme or shouldUseHighContrastColors is set, reflecting the 'Invert colours' and `Increase contrast` settings in MacOS
            if (electron.nativeTheme.shouldUseInvertedColorScheme ||
                electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: electron.nativeTheme.shouldUseDarkColors, highContrast: true };
            }
        }
        else if (isLinux) {
            // ubuntu gnome seems to have 3 states, light dark and high contrast
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: true, highContrast: true };
            }
        }
        return {
            dark: electron.nativeTheme.shouldUseDarkColors,
            highContrast: false,
        };
    }
    getPreferredBaseTheme() {
        const colorScheme = this.getColorScheme();
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) && colorScheme.highContrast) {
            return colorScheme.dark ? ThemeTypeSelector.HC_BLACK : ThemeTypeSelector.HC_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return colorScheme.dark ? ThemeTypeSelector.VS_DARK : ThemeTypeSelector.VS;
        }
        return undefined;
    }
    getBackgroundColor() {
        const preferred = this.getPreferredBaseTheme();
        const stored = this.getStoredBaseTheme();
        // If the stored theme has the same base as the preferred, we can return the stored background
        if (preferred === undefined || preferred === stored) {
            const storedBackground = this.stateService.getItem(THEME_BG_STORAGE_KEY, null);
            if (storedBackground) {
                return storedBackground;
            }
        }
        // Otherwise we return the default background for the preferred base theme. If there's no preferred, use the stored one.
        switch (preferred ?? stored) {
            case ThemeTypeSelector.VS:
                return DEFAULT_BG_LIGHT;
            case ThemeTypeSelector.HC_BLACK:
                return DEFAULT_BG_HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT:
                return DEFAULT_BG_HC_LIGHT;
            default:
                return DEFAULT_BG_DARK;
        }
    }
    getStoredBaseTheme() {
        const baseTheme = this.stateService
            .getItem(THEME_STORAGE_KEY, ThemeTypeSelector.VS_DARK)
            .split(' ')[0];
        switch (baseTheme) {
            case ThemeTypeSelector.VS:
                return ThemeTypeSelector.VS;
            case ThemeTypeSelector.HC_BLACK:
                return ThemeTypeSelector.HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT:
                return ThemeTypeSelector.HC_LIGHT;
            default:
                return ThemeTypeSelector.VS_DARK;
        }
    }
    saveWindowSplash(windowId, workspace, splash) {
        // Update override as needed
        const splashOverride = this.updateWindowSplashOverride(workspace, splash);
        // Update in storage
        this.stateService.setItems(coalesce([
            { key: THEME_STORAGE_KEY, data: splash.baseTheme },
            { key: THEME_BG_STORAGE_KEY, data: splash.colorInfo.background },
            { key: THEME_WINDOW_SPLASH_KEY, data: splash },
            splashOverride
                ? { key: THEME_WINDOW_SPLASH_WORKSPACE_OVERRIDE_KEY, data: splashOverride }
                : undefined,
        ]));
        // Update in opened windows
        if (typeof windowId === 'number') {
            this.updateBackgroundColor(windowId, splash);
        }
        // Update system theme
        this.updateSystemColorTheme();
    }
    updateWindowSplashOverride(workspace, splash) {
        let splashOverride = undefined;
        let changed = false;
        if (workspace) {
            splashOverride = { ...this.getWindowSplashOverride() }; // make a copy for modifications
            const [auxiliarySideBarWidth, workspaceIds] = splashOverride.layoutInfo.auxiliarySideBarWidth;
            if (splash.layoutInfo?.auxiliarySideBarWidth) {
                if (auxiliarySideBarWidth !== splash.layoutInfo.auxiliarySideBarWidth) {
                    splashOverride.layoutInfo.auxiliarySideBarWidth[0] =
                        splash.layoutInfo.auxiliarySideBarWidth;
                    changed = true;
                }
                if (!workspaceIds.includes(workspace.id)) {
                    workspaceIds.push(workspace.id);
                    changed = true;
                }
            }
            else {
                const index = workspaceIds.indexOf(workspace.id);
                if (index > -1) {
                    workspaceIds.splice(index, 1);
                    changed = true;
                }
            }
        }
        return changed ? splashOverride : undefined;
    }
    updateBackgroundColor(windowId, splash) {
        for (const window of getAllWindowsExcludingOffscreen()) {
            if (window.id === windowId) {
                window.setBackgroundColor(splash.colorInfo.background);
                break;
            }
        }
    }
    getWindowSplash(workspace) {
        const partSplash = this.stateService.getItem(THEME_WINDOW_SPLASH_KEY);
        if (!partSplash?.layoutInfo) {
            return partSplash; // return early: overrides currently only apply to layout info
        }
        // Apply workspace specific overrides
        let auxiliarySideBarWidthOverride;
        if (workspace) {
            const [auxiliarySideBarWidth, workspaceIds] = this.getWindowSplashOverride().layoutInfo.auxiliarySideBarWidth;
            if (workspaceIds.includes(workspace.id)) {
                auxiliarySideBarWidthOverride = auxiliarySideBarWidth;
            }
        }
        return {
            ...partSplash,
            layoutInfo: {
                ...partSplash.layoutInfo,
                // Only apply an auxiliary bar width when we have a workspace specific
                // override. Auxiliary bar is not visible by default unless explicitly
                // opened in a workspace.
                auxiliarySideBarWidth: typeof auxiliarySideBarWidthOverride === 'number' ? auxiliarySideBarWidthOverride : 0,
            },
        };
    }
    getWindowSplashOverride() {
        return this.stateService.getItem(THEME_WINDOW_SPLASH_WORKSPACE_OVERRIDE_KEY, { layoutInfo: { auxiliarySideBarWidth: [0, []] } });
    }
};
ThemeMainService = __decorate([
    __param(0, IStateService),
    __param(1, IConfigurationService)
], ThemeMainService);
export { ThemeMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RoZW1lL2VsZWN0cm9uLW1haW4vdGhlbWVNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUd6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFeEYsZ0RBQWdEO0FBQ2hELGtEQUFrRDtBQUNsRCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtBQUNsQyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUE7QUFDakMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUE7QUFDckMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUE7QUFFckMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUE7QUFDakMsTUFBTSxvQkFBb0IsR0FBRyxpQkFBaUIsQ0FBQTtBQUU5QyxN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