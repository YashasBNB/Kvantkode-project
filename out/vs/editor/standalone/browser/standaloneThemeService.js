/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../base/browser/domStylesheets.js';
import { addMatchMediaChangeListener } from '../../../base/browser/browser.js';
import { Color } from '../../../base/common/color.js';
import { Emitter } from '../../../base/common/event.js';
import { TokenizationRegistry } from '../../common/languages.js';
import { TokenMetadata } from '../../common/encodedTokenAttributes.js';
import { TokenTheme, generateTokensCSSForColorMap, } from '../../common/languages/supports/tokenization.js';
import { hc_black, hc_light, vs, vs_dark } from '../common/themes.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { asCssVariableName, Extensions, } from '../../../platform/theme/common/colorRegistry.js';
import { Extensions as ThemingExtensions, } from '../../../platform/theme/common/themeService.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ColorScheme, isDark, isHighContrast } from '../../../platform/theme/common/theme.js';
import { getIconsStyleSheet, UnthemedProductIconTheme, } from '../../../platform/theme/browser/iconsStyleSheet.js';
import { mainWindow } from '../../../base/browser/window.js';
export const VS_LIGHT_THEME_NAME = 'vs';
export const VS_DARK_THEME_NAME = 'vs-dark';
export const HC_BLACK_THEME_NAME = 'hc-black';
export const HC_LIGHT_THEME_NAME = 'hc-light';
const colorRegistry = Registry.as(Extensions.ColorContribution);
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
class StandaloneTheme {
    constructor(name, standaloneThemeData) {
        this.semanticHighlighting = false;
        this.themeData = standaloneThemeData;
        const base = standaloneThemeData.base;
        if (name.length > 0) {
            if (isBuiltinTheme(name)) {
                this.id = name;
            }
            else {
                this.id = base + ' ' + name;
            }
            this.themeName = name;
        }
        else {
            this.id = base;
            this.themeName = base;
        }
        this.colors = null;
        this.defaultColors = Object.create(null);
        this._tokenTheme = null;
    }
    get label() {
        return this.themeName;
    }
    get base() {
        return this.themeData.base;
    }
    notifyBaseUpdated() {
        if (this.themeData.inherit) {
            this.colors = null;
            this._tokenTheme = null;
        }
    }
    getColors() {
        if (!this.colors) {
            const colors = new Map();
            for (const id in this.themeData.colors) {
                colors.set(id, Color.fromHex(this.themeData.colors[id]));
            }
            if (this.themeData.inherit) {
                const baseData = getBuiltinRules(this.themeData.base);
                for (const id in baseData.colors) {
                    if (!colors.has(id)) {
                        colors.set(id, Color.fromHex(baseData.colors[id]));
                    }
                }
            }
            this.colors = colors;
        }
        return this.colors;
    }
    getColor(colorId, useDefault) {
        const color = this.getColors().get(colorId);
        if (color) {
            return color;
        }
        if (useDefault !== false) {
            return this.getDefault(colorId);
        }
        return undefined;
    }
    getDefault(colorId) {
        let color = this.defaultColors[colorId];
        if (color) {
            return color;
        }
        color = colorRegistry.resolveDefaultColor(colorId, this);
        this.defaultColors[colorId] = color;
        return color;
    }
    defines(colorId) {
        return this.getColors().has(colorId);
    }
    get type() {
        switch (this.base) {
            case VS_LIGHT_THEME_NAME:
                return ColorScheme.LIGHT;
            case HC_BLACK_THEME_NAME:
                return ColorScheme.HIGH_CONTRAST_DARK;
            case HC_LIGHT_THEME_NAME:
                return ColorScheme.HIGH_CONTRAST_LIGHT;
            default:
                return ColorScheme.DARK;
        }
    }
    get tokenTheme() {
        if (!this._tokenTheme) {
            let rules = [];
            let encodedTokensColors = [];
            if (this.themeData.inherit) {
                const baseData = getBuiltinRules(this.themeData.base);
                rules = baseData.rules;
                if (baseData.encodedTokensColors) {
                    encodedTokensColors = baseData.encodedTokensColors;
                }
            }
            // Pick up default colors from `editor.foreground` and `editor.background` if available
            const editorForeground = this.themeData.colors['editor.foreground'];
            const editorBackground = this.themeData.colors['editor.background'];
            if (editorForeground || editorBackground) {
                const rule = { token: '' };
                if (editorForeground) {
                    rule.foreground = editorForeground;
                }
                if (editorBackground) {
                    rule.background = editorBackground;
                }
                rules.push(rule);
            }
            rules = rules.concat(this.themeData.rules);
            if (this.themeData.encodedTokensColors) {
                encodedTokensColors = this.themeData.encodedTokensColors;
            }
            this._tokenTheme = TokenTheme.createFromRawTokenTheme(rules, encodedTokensColors);
        }
        return this._tokenTheme;
    }
    getTokenStyleMetadata(type, modifiers, modelLanguage) {
        // use theme rules match
        const style = this.tokenTheme._match([type].concat(modifiers).join('.'));
        const metadata = style.metadata;
        const foreground = TokenMetadata.getForeground(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        return {
            foreground: foreground,
            italic: Boolean(fontStyle & 1 /* FontStyle.Italic */),
            bold: Boolean(fontStyle & 2 /* FontStyle.Bold */),
            underline: Boolean(fontStyle & 4 /* FontStyle.Underline */),
            strikethrough: Boolean(fontStyle & 8 /* FontStyle.Strikethrough */),
        };
    }
    get tokenColorMap() {
        return [];
    }
}
function isBuiltinTheme(themeName) {
    return (themeName === VS_LIGHT_THEME_NAME ||
        themeName === VS_DARK_THEME_NAME ||
        themeName === HC_BLACK_THEME_NAME ||
        themeName === HC_LIGHT_THEME_NAME);
}
function getBuiltinRules(builtinTheme) {
    switch (builtinTheme) {
        case VS_LIGHT_THEME_NAME:
            return vs;
        case VS_DARK_THEME_NAME:
            return vs_dark;
        case HC_BLACK_THEME_NAME:
            return hc_black;
        case HC_LIGHT_THEME_NAME:
            return hc_light;
    }
}
function newBuiltInTheme(builtinTheme) {
    const themeData = getBuiltinRules(builtinTheme);
    return new StandaloneTheme(builtinTheme, themeData);
}
export class StandaloneThemeService extends Disposable {
    constructor() {
        super();
        this._onColorThemeChange = this._register(new Emitter());
        this.onDidColorThemeChange = this._onColorThemeChange.event;
        this._onFileIconThemeChange = this._register(new Emitter());
        this.onDidFileIconThemeChange = this._onFileIconThemeChange.event;
        this._onProductIconThemeChange = this._register(new Emitter());
        this.onDidProductIconThemeChange = this._onProductIconThemeChange.event;
        this._environment = Object.create(null);
        this._builtInProductIconTheme = new UnthemedProductIconTheme();
        this._autoDetectHighContrast = true;
        this._knownThemes = new Map();
        this._knownThemes.set(VS_LIGHT_THEME_NAME, newBuiltInTheme(VS_LIGHT_THEME_NAME));
        this._knownThemes.set(VS_DARK_THEME_NAME, newBuiltInTheme(VS_DARK_THEME_NAME));
        this._knownThemes.set(HC_BLACK_THEME_NAME, newBuiltInTheme(HC_BLACK_THEME_NAME));
        this._knownThemes.set(HC_LIGHT_THEME_NAME, newBuiltInTheme(HC_LIGHT_THEME_NAME));
        const iconsStyleSheet = this._register(getIconsStyleSheet(this));
        this._codiconCSS = iconsStyleSheet.getCSS();
        this._themeCSS = '';
        this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
        this._globalStyleElement = null;
        this._styleElements = [];
        this._colorMapOverride = null;
        this.setTheme(VS_LIGHT_THEME_NAME);
        this._onOSSchemeChanged();
        this._register(iconsStyleSheet.onDidChange(() => {
            this._codiconCSS = iconsStyleSheet.getCSS();
            this._updateCSS();
        }));
        addMatchMediaChangeListener(mainWindow, '(forced-colors: active)', () => {
            this._onOSSchemeChanged();
        });
    }
    registerEditorContainer(domNode) {
        if (dom.isInShadowDOM(domNode)) {
            return this._registerShadowDomContainer(domNode);
        }
        return this._registerRegularEditorContainer();
    }
    _registerRegularEditorContainer() {
        if (!this._globalStyleElement) {
            this._globalStyleElement = domStylesheetsJs.createStyleSheet(undefined, (style) => {
                style.className = 'monaco-colors';
                style.textContent = this._allCSS;
            });
            this._styleElements.push(this._globalStyleElement);
        }
        return Disposable.None;
    }
    _registerShadowDomContainer(domNode) {
        const styleElement = domStylesheetsJs.createStyleSheet(domNode, (style) => {
            style.className = 'monaco-colors';
            style.textContent = this._allCSS;
        });
        this._styleElements.push(styleElement);
        return {
            dispose: () => {
                for (let i = 0; i < this._styleElements.length; i++) {
                    if (this._styleElements[i] === styleElement) {
                        this._styleElements.splice(i, 1);
                        return;
                    }
                }
            },
        };
    }
    defineTheme(themeName, themeData) {
        if (!/^[a-z0-9\-]+$/i.test(themeName)) {
            throw new Error('Illegal theme name!');
        }
        if (!isBuiltinTheme(themeData.base) && !isBuiltinTheme(themeName)) {
            throw new Error('Illegal theme base!');
        }
        // set or replace theme
        this._knownThemes.set(themeName, new StandaloneTheme(themeName, themeData));
        if (isBuiltinTheme(themeName)) {
            this._knownThemes.forEach((theme) => {
                if (theme.base === themeName) {
                    theme.notifyBaseUpdated();
                }
            });
        }
        if (this._theme.themeName === themeName) {
            this.setTheme(themeName); // refresh theme
        }
    }
    getColorTheme() {
        return this._theme;
    }
    setColorMapOverride(colorMapOverride) {
        this._colorMapOverride = colorMapOverride;
        this._updateThemeOrColorMap();
    }
    setTheme(themeName) {
        let theme;
        if (this._knownThemes.has(themeName)) {
            theme = this._knownThemes.get(themeName);
        }
        else {
            theme = this._knownThemes.get(VS_LIGHT_THEME_NAME);
        }
        this._updateActualTheme(theme);
    }
    _updateActualTheme(desiredTheme) {
        if (!desiredTheme || this._theme === desiredTheme) {
            // Nothing to do
            return;
        }
        this._theme = desiredTheme;
        this._updateThemeOrColorMap();
    }
    _onOSSchemeChanged() {
        if (this._autoDetectHighContrast) {
            const wantsHighContrast = mainWindow.matchMedia(`(forced-colors: active)`).matches;
            if (wantsHighContrast !== isHighContrast(this._theme.type)) {
                // switch to high contrast or non-high contrast but stick to dark or light
                let newThemeName;
                if (isDark(this._theme.type)) {
                    newThemeName = wantsHighContrast ? HC_BLACK_THEME_NAME : VS_DARK_THEME_NAME;
                }
                else {
                    newThemeName = wantsHighContrast ? HC_LIGHT_THEME_NAME : VS_LIGHT_THEME_NAME;
                }
                this._updateActualTheme(this._knownThemes.get(newThemeName));
            }
        }
    }
    setAutoDetectHighContrast(autoDetectHighContrast) {
        this._autoDetectHighContrast = autoDetectHighContrast;
        this._onOSSchemeChanged();
    }
    _updateThemeOrColorMap() {
        const cssRules = [];
        const hasRule = {};
        const ruleCollector = {
            addRule: (rule) => {
                if (!hasRule[rule]) {
                    cssRules.push(rule);
                    hasRule[rule] = true;
                }
            },
        };
        themingRegistry
            .getThemingParticipants()
            .forEach((p) => p(this._theme, ruleCollector, this._environment));
        const colorVariables = [];
        for (const item of colorRegistry.getColors()) {
            const color = this._theme.getColor(item.id, true);
            if (color) {
                colorVariables.push(`${asCssVariableName(item.id)}: ${color.toString()};`);
            }
        }
        ruleCollector.addRule(`.monaco-editor, .monaco-diff-editor, .monaco-component { ${colorVariables.join('\n')} }`);
        const colorMap = this._colorMapOverride || this._theme.tokenTheme.getColorMap();
        ruleCollector.addRule(generateTokensCSSForColorMap(colorMap));
        this._themeCSS = cssRules.join('\n');
        this._updateCSS();
        TokenizationRegistry.setColorMap(colorMap);
        this._onColorThemeChange.fire(this._theme);
    }
    _updateCSS() {
        this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
        this._styleElements.forEach((styleElement) => (styleElement.textContent = this._allCSS));
    }
    getFileIconTheme() {
        return {
            hasFileIcons: false,
            hasFolderIcons: false,
            hidesExplorerArrows: false,
        };
    }
    getProductIconTheme() {
        return this._builtInProductIconTheme;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZVRoZW1lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2hFLE9BQU8sRUFBYSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNqRixPQUFPLEVBRU4sVUFBVSxFQUNWLDRCQUE0QixHQUM1QixNQUFNLGlEQUFpRCxDQUFBO0FBT3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUNOLGlCQUFpQixFQUVqQixVQUFVLEdBRVYsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sVUFBVSxJQUFJLGlCQUFpQixHQU0vQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBZSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FB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