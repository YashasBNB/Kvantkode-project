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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvZWxlY3Ryb24tbWFpbi90aGVtZU1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sUUFBUSxNQUFNLFVBQVUsQ0FBQTtBQUMvQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBR3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXRELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV4RixnREFBZ0Q7QUFDaEQsa0RBQWtEO0FBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsU0FBUyxDQUFBO0FBQ2xDLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQTtBQUNqQyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQTtBQUNyQyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQTtBQUVyQyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQTtBQUNqQyxNQUFNLG9CQUFvQixH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