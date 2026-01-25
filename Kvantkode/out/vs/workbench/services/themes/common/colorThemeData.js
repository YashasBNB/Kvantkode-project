/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../base/common/path.js';
import * as Json from '../../../../base/common/json.js';
import { Color } from '../../../../base/common/color.js';
import { ExtensionData, THEME_SCOPE_CLOSE_PAREN, THEME_SCOPE_OPEN_PAREN, themeScopeRegex, THEME_SCOPE_WILDCARD, } from './workbenchThemeService.js';
import { convertSettings } from './themeCompatibility.js';
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import * as resources from '../../../../base/common/resources.js';
import { Extensions as ColorRegistryExtensions, editorBackground, editorForeground, DEFAULT_COLOR_CONFIG_VALUE, } from '../../../../platform/theme/common/colorRegistry.js';
import { getThemeTypeSelector, } from '../../../../platform/theme/common/themeService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { parse as parsePList } from './plistParser.js';
import { TokenStyle, SemanticTokenRule, getTokenClassificationRegistry, parseClassifierString, } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
import { createMatchers } from './textMateScopeMatcher.js';
import { ColorScheme, ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
import { toStandardTokenType } from '../../../../editor/common/languages/supports/tokenization.js';
const colorRegistry = Registry.as(ColorRegistryExtensions.ColorContribution);
const tokenClassificationRegistry = getTokenClassificationRegistry();
const tokenGroupToScopesMap = {
    comments: ['comment', 'punctuation.definition.comment'],
    strings: ['string', 'meta.embedded.assembly'],
    keywords: ['keyword - keyword.operator', 'keyword.control', 'storage', 'storage.type'],
    numbers: ['constant.numeric'],
    types: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
    functions: ['entity.name.function', 'support.function'],
    variables: ['variable', 'entity.name.variable'],
};
export class ColorThemeData {
    static { this.STORAGE_KEY = 'colorThemeData'; }
    constructor(id, label, settingsId) {
        this.themeTokenColors = [];
        this.customTokenColors = [];
        this.colorMap = {};
        this.customColorMap = {};
        this.semanticTokenRules = [];
        this.customSemanticTokenRules = [];
        this.textMateThemingRules = undefined; // created on demand
        this.tokenColorIndex = undefined; // created on demand
        this.id = id;
        this.label = label;
        this.settingsId = settingsId;
        this.isLoaded = false;
    }
    get semanticHighlighting() {
        if (this.customSemanticHighlighting !== undefined) {
            return this.customSemanticHighlighting;
        }
        if (this.customSemanticHighlightingDeprecated !== undefined) {
            return this.customSemanticHighlightingDeprecated;
        }
        return !!this.themeSemanticHighlighting;
    }
    get tokenColors() {
        if (!this.textMateThemingRules) {
            const result = [];
            // the default rule (scope empty) is always the first rule. Ignore all other default rules.
            const foreground = this.getColor(editorForeground) || this.getDefault(editorForeground);
            const background = this.getColor(editorBackground) || this.getDefault(editorBackground);
            result.push({
                settings: {
                    foreground: normalizeColor(foreground),
                    background: normalizeColor(background),
                },
            });
            let hasDefaultTokens = false;
            function addRule(rule) {
                if (rule.scope && rule.settings) {
                    if (rule.scope === 'token.info-token') {
                        hasDefaultTokens = true;
                    }
                    result.push({
                        scope: rule.scope,
                        settings: {
                            foreground: normalizeColor(rule.settings.foreground),
                            background: normalizeColor(rule.settings.background),
                            fontStyle: rule.settings.fontStyle,
                        },
                    });
                }
            }
            this.themeTokenColors.forEach(addRule);
            // Add the custom colors after the theme colors
            // so that they will override them
            this.customTokenColors.forEach(addRule);
            if (!hasDefaultTokens) {
                defaultThemeColors[this.type].forEach(addRule);
            }
            this.textMateThemingRules = result;
        }
        return this.textMateThemingRules;
    }
    getColor(colorId, useDefault) {
        const customColor = this.customColorMap[colorId];
        if (customColor instanceof Color) {
            return customColor;
        }
        if (customColor === undefined) {
            /* !== DEFAULT_COLOR_CONFIG_VALUE */
            const color = this.colorMap[colorId];
            if (color !== undefined) {
                return color;
            }
        }
        if (useDefault !== false) {
            return this.getDefault(colorId);
        }
        return undefined;
    }
    getTokenStyle(type, modifiers, language, useDefault = true, definitions = {}) {
        const result = {
            foreground: undefined,
            bold: undefined,
            underline: undefined,
            strikethrough: undefined,
            italic: undefined,
        };
        const score = {
            foreground: -1,
            bold: -1,
            underline: -1,
            strikethrough: -1,
            italic: -1,
        };
        function _processStyle(matchScore, style, definition) {
            if (style.foreground && score.foreground <= matchScore) {
                score.foreground = matchScore;
                result.foreground = style.foreground;
                definitions.foreground = definition;
            }
            for (const p of ['bold', 'underline', 'strikethrough', 'italic']) {
                const property = p;
                const info = style[property];
                if (info !== undefined) {
                    if (score[property] <= matchScore) {
                        score[property] = matchScore;
                        result[property] = info;
                        definitions[property] = definition;
                    }
                }
            }
        }
        function _processSemanticTokenRule(rule) {
            const matchScore = rule.selector.match(type, modifiers, language);
            if (matchScore >= 0) {
                _processStyle(matchScore, rule.style, rule);
            }
        }
        this.semanticTokenRules.forEach(_processSemanticTokenRule);
        this.customSemanticTokenRules.forEach(_processSemanticTokenRule);
        let hasUndefinedStyleProperty = false;
        for (const k in score) {
            const key = k;
            if (score[key] === -1) {
                hasUndefinedStyleProperty = true;
            }
            else {
                score[key] = Number.MAX_VALUE; // set it to the max, so it won't be replaced by a default
            }
        }
        if (hasUndefinedStyleProperty) {
            for (const rule of tokenClassificationRegistry.getTokenStylingDefaultRules()) {
                const matchScore = rule.selector.match(type, modifiers, language);
                if (matchScore >= 0) {
                    let style;
                    if (rule.defaults.scopesToProbe) {
                        style = this.resolveScopes(rule.defaults.scopesToProbe);
                        if (style) {
                            _processStyle(matchScore, style, rule.defaults.scopesToProbe);
                        }
                    }
                    if (!style && useDefault !== false) {
                        const tokenStyleValue = rule.defaults[this.type];
                        style = this.resolveTokenStyleValue(tokenStyleValue);
                        if (style) {
                            _processStyle(matchScore, style, tokenStyleValue);
                        }
                    }
                }
            }
        }
        return TokenStyle.fromData(result);
    }
    /**
     * @param tokenStyleValue Resolve a tokenStyleValue in the context of a theme
     */
    resolveTokenStyleValue(tokenStyleValue) {
        if (tokenStyleValue === undefined) {
            return undefined;
        }
        else if (typeof tokenStyleValue === 'string') {
            const { type, modifiers, language } = parseClassifierString(tokenStyleValue, '');
            return this.getTokenStyle(type, modifiers, language);
        }
        else if (typeof tokenStyleValue === 'object') {
            return tokenStyleValue;
        }
        return undefined;
    }
    getTokenColorIndex() {
        // collect all colors that tokens can have
        if (!this.tokenColorIndex) {
            const index = new TokenColorIndex();
            this.tokenColors.forEach((rule) => {
                index.add(rule.settings.foreground);
                index.add(rule.settings.background);
            });
            this.semanticTokenRules.forEach((r) => index.add(r.style.foreground));
            tokenClassificationRegistry.getTokenStylingDefaultRules().forEach((r) => {
                const defaultColor = r.defaults[this.type];
                if (defaultColor && typeof defaultColor === 'object') {
                    index.add(defaultColor.foreground);
                }
            });
            this.customSemanticTokenRules.forEach((r) => index.add(r.style.foreground));
            this.tokenColorIndex = index;
        }
        return this.tokenColorIndex;
    }
    get tokenColorMap() {
        return this.getTokenColorIndex().asArray();
    }
    getTokenStyleMetadata(typeWithLanguage, modifiers, defaultLanguage, useDefault = true, definitions = {}) {
        const { type, language } = parseClassifierString(typeWithLanguage, defaultLanguage);
        const style = this.getTokenStyle(type, modifiers, language, useDefault, definitions);
        if (!style) {
            return undefined;
        }
        return {
            foreground: this.getTokenColorIndex().get(style.foreground),
            bold: style.bold,
            underline: style.underline,
            strikethrough: style.strikethrough,
            italic: style.italic,
        };
    }
    getTokenStylingRuleScope(rule) {
        if (this.customSemanticTokenRules.indexOf(rule) !== -1) {
            return 'setting';
        }
        if (this.semanticTokenRules.indexOf(rule) !== -1) {
            return 'theme';
        }
        return undefined;
    }
    getDefault(colorId) {
        return colorRegistry.resolveDefaultColor(colorId, this);
    }
    resolveScopes(scopes, definitions) {
        if (!this.themeTokenScopeMatchers) {
            this.themeTokenScopeMatchers = this.themeTokenColors.map(getScopeMatcher);
        }
        if (!this.customTokenScopeMatchers) {
            this.customTokenScopeMatchers = this.customTokenColors.map(getScopeMatcher);
        }
        for (const scope of scopes) {
            let foreground = undefined;
            let fontStyle = undefined;
            let foregroundScore = -1;
            let fontStyleScore = -1;
            let fontStyleThemingRule = undefined;
            let foregroundThemingRule = undefined;
            function findTokenStyleForScopeInScopes(scopeMatchers, themingRules) {
                for (let i = 0; i < scopeMatchers.length; i++) {
                    const score = scopeMatchers[i](scope);
                    if (score >= 0) {
                        const themingRule = themingRules[i];
                        const settings = themingRules[i].settings;
                        if (score >= foregroundScore && settings.foreground) {
                            foreground = settings.foreground;
                            foregroundScore = score;
                            foregroundThemingRule = themingRule;
                        }
                        if (score >= fontStyleScore && types.isString(settings.fontStyle)) {
                            fontStyle = settings.fontStyle;
                            fontStyleScore = score;
                            fontStyleThemingRule = themingRule;
                        }
                    }
                }
            }
            findTokenStyleForScopeInScopes(this.themeTokenScopeMatchers, this.themeTokenColors);
            findTokenStyleForScopeInScopes(this.customTokenScopeMatchers, this.customTokenColors);
            if (foreground !== undefined || fontStyle !== undefined) {
                if (definitions) {
                    definitions.foreground = foregroundThemingRule;
                    definitions.bold =
                        definitions.italic =
                            definitions.underline =
                                definitions.strikethrough =
                                    fontStyleThemingRule;
                    definitions.scope = scope;
                }
                return TokenStyle.fromSettings(foreground, fontStyle);
            }
        }
        return undefined;
    }
    defines(colorId) {
        const customColor = this.customColorMap[colorId];
        if (customColor instanceof Color) {
            return true;
        }
        return (customColor === undefined /* !== DEFAULT_COLOR_CONFIG_VALUE */ &&
            this.colorMap.hasOwnProperty(colorId));
    }
    setCustomizations(settings) {
        this.setCustomColors(settings.colorCustomizations);
        this.setCustomTokenColors(settings.tokenColorCustomizations);
        this.setCustomSemanticTokenColors(settings.semanticTokenColorCustomizations);
    }
    setCustomColors(colors) {
        this.customColorMap = {};
        this.overwriteCustomColors(colors);
        const themeSpecificColors = this.getThemeSpecificColors(colors);
        if (types.isObject(themeSpecificColors)) {
            this.overwriteCustomColors(themeSpecificColors);
        }
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
        this.customTokenScopeMatchers = undefined;
    }
    overwriteCustomColors(colors) {
        for (const id in colors) {
            const colorVal = colors[id];
            if (colorVal === DEFAULT_COLOR_CONFIG_VALUE) {
                this.customColorMap[id] = DEFAULT_COLOR_CONFIG_VALUE;
            }
            else if (typeof colorVal === 'string') {
                this.customColorMap[id] = Color.fromHex(colorVal);
            }
        }
    }
    setCustomTokenColors(customTokenColors) {
        this.customTokenColors = [];
        this.customSemanticHighlightingDeprecated = undefined;
        // first add the non-theme specific settings
        this.addCustomTokenColors(customTokenColors);
        // append theme specific settings. Last rules will win.
        const themeSpecificTokenColors = this.getThemeSpecificColors(customTokenColors);
        if (types.isObject(themeSpecificTokenColors)) {
            this.addCustomTokenColors(themeSpecificTokenColors);
        }
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
        this.customTokenScopeMatchers = undefined;
    }
    setCustomSemanticTokenColors(semanticTokenColors) {
        this.customSemanticTokenRules = [];
        this.customSemanticHighlighting = undefined;
        if (semanticTokenColors) {
            this.customSemanticHighlighting = semanticTokenColors.enabled;
            if (semanticTokenColors.rules) {
                this.readSemanticTokenRules(semanticTokenColors.rules);
            }
            const themeSpecificColors = this.getThemeSpecificColors(semanticTokenColors);
            if (types.isObject(themeSpecificColors)) {
                if (themeSpecificColors.enabled !== undefined) {
                    this.customSemanticHighlighting = themeSpecificColors.enabled;
                }
                if (themeSpecificColors.rules) {
                    this.readSemanticTokenRules(themeSpecificColors.rules);
                }
            }
        }
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
    }
    isThemeScope(key) {
        return (key.charAt(0) === THEME_SCOPE_OPEN_PAREN &&
            key.charAt(key.length - 1) === THEME_SCOPE_CLOSE_PAREN);
    }
    isThemeScopeMatch(themeId) {
        const themeIdFirstChar = themeId.charAt(0);
        const themeIdLastChar = themeId.charAt(themeId.length - 1);
        const themeIdPrefix = themeId.slice(0, -1);
        const themeIdInfix = themeId.slice(1, -1);
        const themeIdSuffix = themeId.slice(1);
        return (themeId === this.settingsId ||
            (this.settingsId.includes(themeIdInfix) &&
                themeIdFirstChar === THEME_SCOPE_WILDCARD &&
                themeIdLastChar === THEME_SCOPE_WILDCARD) ||
            (this.settingsId.startsWith(themeIdPrefix) && themeIdLastChar === THEME_SCOPE_WILDCARD) ||
            (this.settingsId.endsWith(themeIdSuffix) && themeIdFirstChar === THEME_SCOPE_WILDCARD));
    }
    getThemeSpecificColors(colors) {
        let themeSpecificColors;
        for (const key in colors) {
            const scopedColors = colors[key];
            if (this.isThemeScope(key) &&
                scopedColors instanceof Object &&
                !Array.isArray(scopedColors)) {
                const themeScopeList = key.match(themeScopeRegex) || [];
                for (const themeScope of themeScopeList) {
                    const themeId = themeScope.substring(1, themeScope.length - 1);
                    if (this.isThemeScopeMatch(themeId)) {
                        if (!themeSpecificColors) {
                            themeSpecificColors = {};
                        }
                        const scopedThemeSpecificColors = scopedColors;
                        for (const subkey in scopedThemeSpecificColors) {
                            const originalColors = themeSpecificColors[subkey];
                            const overrideColors = scopedThemeSpecificColors[subkey];
                            if (Array.isArray(originalColors) && Array.isArray(overrideColors)) {
                                themeSpecificColors[subkey] = originalColors.concat(overrideColors);
                            }
                            else if (overrideColors) {
                                themeSpecificColors[subkey] = overrideColors;
                            }
                        }
                    }
                }
            }
        }
        return themeSpecificColors;
    }
    readSemanticTokenRules(tokenStylingRuleSection) {
        for (const key in tokenStylingRuleSection) {
            if (!this.isThemeScope(key)) {
                // still do this test until experimental settings are gone
                try {
                    const rule = readSemanticTokenRule(key, tokenStylingRuleSection[key]);
                    if (rule) {
                        this.customSemanticTokenRules.push(rule);
                    }
                }
                catch (e) {
                    // invalid selector, ignore
                }
            }
        }
    }
    addCustomTokenColors(customTokenColors) {
        // Put the general customizations such as comments, strings, etc. first so that
        // they can be overridden by specific customizations like "string.interpolated"
        for (const tokenGroup in tokenGroupToScopesMap) {
            const group = tokenGroup; // TS doesn't type 'tokenGroup' properly
            const value = customTokenColors[group];
            if (value) {
                const settings = typeof value === 'string' ? { foreground: value } : value;
                const scopes = tokenGroupToScopesMap[group];
                for (const scope of scopes) {
                    this.customTokenColors.push({ scope, settings });
                }
            }
        }
        // specific customizations
        if (Array.isArray(customTokenColors.textMateRules)) {
            for (const rule of customTokenColors.textMateRules) {
                if (rule.scope && rule.settings) {
                    this.customTokenColors.push(rule);
                }
            }
        }
        if (customTokenColors.semanticHighlighting !== undefined) {
            this.customSemanticHighlightingDeprecated = customTokenColors.semanticHighlighting;
        }
    }
    ensureLoaded(extensionResourceLoaderService) {
        return !this.isLoaded ? this.load(extensionResourceLoaderService) : Promise.resolve(undefined);
    }
    reload(extensionResourceLoaderService) {
        return this.load(extensionResourceLoaderService);
    }
    load(extensionResourceLoaderService) {
        if (!this.location) {
            return Promise.resolve(undefined);
        }
        this.themeTokenColors = [];
        this.clearCaches();
        const result = {
            colors: {},
            textMateRules: [],
            semanticTokenRules: [],
            semanticHighlighting: false,
        };
        return _loadColorTheme(extensionResourceLoaderService, this.location, result).then((_) => {
            this.isLoaded = true;
            this.semanticTokenRules = result.semanticTokenRules;
            this.colorMap = result.colors;
            this.themeTokenColors = result.textMateRules;
            this.themeSemanticHighlighting = result.semanticHighlighting;
        });
    }
    clearCaches() {
        this.tokenColorIndex = undefined;
        this.textMateThemingRules = undefined;
        this.themeTokenScopeMatchers = undefined;
        this.customTokenScopeMatchers = undefined;
    }
    toStorage(storageService) {
        const colorMapData = {};
        for (const key in this.colorMap) {
            colorMapData[key] = Color.Format.CSS.formatHexA(this.colorMap[key], true);
        }
        // no need to persist custom colors, they will be taken from the settings
        const value = JSON.stringify({
            id: this.id,
            label: this.label,
            settingsId: this.settingsId,
            themeTokenColors: this.themeTokenColors.map((tc) => ({
                settings: tc.settings,
                scope: tc.scope,
            })), // don't persist names
            semanticTokenRules: this.semanticTokenRules.map(SemanticTokenRule.toJSONObject),
            extensionData: ExtensionData.toJSONObject(this.extensionData),
            themeSemanticHighlighting: this.themeSemanticHighlighting,
            colorMap: colorMapData,
            watch: this.watch,
        });
        // roam persisted color theme colors. Don't enable for icons as they contain references to fonts and images.
        storageService.store(ColorThemeData.STORAGE_KEY, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    get themeTypeSelector() {
        return this.classNames[0];
    }
    get classNames() {
        return this.id.split(' ');
    }
    get type() {
        switch (this.themeTypeSelector) {
            case ThemeTypeSelector.VS:
                return ColorScheme.LIGHT;
            case ThemeTypeSelector.HC_BLACK:
                return ColorScheme.HIGH_CONTRAST_DARK;
            case ThemeTypeSelector.HC_LIGHT:
                return ColorScheme.HIGH_CONTRAST_LIGHT;
            default:
                return ColorScheme.DARK;
        }
    }
    // constructors
    static createUnloadedThemeForThemeType(themeType, colorMap) {
        return ColorThemeData.createUnloadedTheme(getThemeTypeSelector(themeType), colorMap);
    }
    static createUnloadedTheme(id, colorMap) {
        const themeData = new ColorThemeData(id, '', '__' + id);
        themeData.isLoaded = false;
        themeData.themeTokenColors = [];
        themeData.watch = false;
        if (colorMap) {
            for (const id in colorMap) {
                themeData.colorMap[id] = Color.fromHex(colorMap[id]);
            }
        }
        return themeData;
    }
    static createLoadedEmptyTheme(id, settingsId) {
        const themeData = new ColorThemeData(id, '', settingsId);
        themeData.isLoaded = true;
        themeData.themeTokenColors = [];
        themeData.watch = false;
        return themeData;
    }
    static fromStorageData(storageService) {
        const input = storageService.get(ColorThemeData.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        if (!input) {
            return undefined;
        }
        try {
            const data = JSON.parse(input);
            const theme = new ColorThemeData('', '', '');
            for (const key in data) {
                switch (key) {
                    case 'colorMap': {
                        const colorMapData = data[key];
                        for (const id in colorMapData) {
                            theme.colorMap[id] = Color.fromHex(colorMapData[id]);
                        }
                        break;
                    }
                    case 'themeTokenColors':
                    case 'id':
                    case 'label':
                    case 'settingsId':
                    case 'watch':
                    case 'themeSemanticHighlighting':
                        ;
                        theme[key] = data[key];
                        break;
                    case 'semanticTokenRules': {
                        const rulesData = data[key];
                        if (Array.isArray(rulesData)) {
                            for (const d of rulesData) {
                                const rule = SemanticTokenRule.fromJSONObject(tokenClassificationRegistry, d);
                                if (rule) {
                                    theme.semanticTokenRules.push(rule);
                                }
                            }
                        }
                        break;
                    }
                    case 'location':
                        // ignore, no longer restore
                        break;
                    case 'extensionData':
                        theme.extensionData = ExtensionData.fromJSONObject(data.extensionData);
                        break;
                }
            }
            if (!theme.id || !theme.settingsId) {
                return undefined;
            }
            return theme;
        }
        catch (e) {
            return undefined;
        }
    }
    static fromExtensionTheme(theme, colorThemeLocation, extensionData) {
        const baseTheme = theme['uiTheme'] || 'vs-dark';
        const themeSelector = toCSSSelector(extensionData.extensionId, theme.path);
        const id = `${baseTheme} ${themeSelector}`;
        const label = theme.label || basename(theme.path);
        const settingsId = theme.id || label;
        const themeData = new ColorThemeData(id, label, settingsId);
        themeData.description = theme.description;
        themeData.watch = theme._watch === true;
        themeData.location = colorThemeLocation;
        themeData.extensionData = extensionData;
        themeData.isLoaded = false;
        return themeData;
    }
}
function toCSSSelector(extensionId, path) {
    if (path.startsWith('./')) {
        path = path.substr(2);
    }
    let str = `${extensionId}-${path}`;
    //remove all characters that are not allowed in css
    str = str.replace(/[^_a-zA-Z0-9-]/g, '-');
    if (str.charAt(0).match(/[0-9-]/)) {
        str = '_' + str;
    }
    return str;
}
async function _loadColorTheme(extensionResourceLoaderService, themeLocation, result) {
    if (resources.extname(themeLocation) === '.json') {
        const content = await extensionResourceLoaderService.readExtensionResource(themeLocation);
        const errors = [];
        const contentValue = Json.parse(content, errors);
        if (errors.length > 0) {
            return Promise.reject(new Error(nls.localize('error.cannotparsejson', 'Problems parsing JSON theme file: {0}', errors.map((e) => getParseErrorMessage(e.error)).join(', '))));
        }
        else if (Json.getNodeType(contentValue) !== 'object') {
            return Promise.reject(new Error(nls.localize('error.invalidformat', 'Invalid format for JSON theme file: Object expected.')));
        }
        if (contentValue.include) {
            await _loadColorTheme(extensionResourceLoaderService, resources.joinPath(resources.dirname(themeLocation), contentValue.include), result);
        }
        if (Array.isArray(contentValue.settings)) {
            convertSettings(contentValue.settings, result);
            return null;
        }
        result.semanticHighlighting = result.semanticHighlighting || contentValue.semanticHighlighting;
        const colors = contentValue.colors;
        if (colors) {
            if (typeof colors !== 'object') {
                return Promise.reject(new Error(nls.localize({
                    key: 'error.invalidformat.colors',
                    comment: [
                        '{0} will be replaced by a path. Values in quotes should not be translated.',
                    ],
                }, "Problem parsing color theme file: {0}. Property 'colors' is not of type 'object'.", themeLocation.toString())));
            }
            // new JSON color themes format
            for (const colorId in colors) {
                const colorVal = colors[colorId];
                if (colorVal === DEFAULT_COLOR_CONFIG_VALUE) {
                    // ignore colors that are set to to default
                    delete result.colors[colorId];
                }
                else if (typeof colorVal === 'string') {
                    result.colors[colorId] = Color.fromHex(colors[colorId]);
                }
            }
        }
        const tokenColors = contentValue.tokenColors;
        if (tokenColors) {
            if (Array.isArray(tokenColors)) {
                result.textMateRules.push(...tokenColors);
            }
            else if (typeof tokenColors === 'string') {
                await _loadSyntaxTokens(extensionResourceLoaderService, resources.joinPath(resources.dirname(themeLocation), tokenColors), result);
            }
            else {
                return Promise.reject(new Error(nls.localize({
                    key: 'error.invalidformat.tokenColors',
                    comment: [
                        '{0} will be replaced by a path. Values in quotes should not be translated.',
                    ],
                }, "Problem parsing color theme file: {0}. Property 'tokenColors' should be either an array specifying colors or a path to a TextMate theme file", themeLocation.toString())));
            }
        }
        const semanticTokenColors = contentValue.semanticTokenColors;
        if (semanticTokenColors && typeof semanticTokenColors === 'object') {
            for (const key in semanticTokenColors) {
                try {
                    const rule = readSemanticTokenRule(key, semanticTokenColors[key]);
                    if (rule) {
                        result.semanticTokenRules.push(rule);
                    }
                }
                catch (e) {
                    return Promise.reject(new Error(nls.localize({
                        key: 'error.invalidformat.semanticTokenColors',
                        comment: [
                            '{0} will be replaced by a path. Values in quotes should not be translated.',
                        ],
                    }, "Problem parsing color theme file: {0}. Property 'semanticTokenColors' contains a invalid selector", themeLocation.toString())));
                }
            }
        }
    }
    else {
        return _loadSyntaxTokens(extensionResourceLoaderService, themeLocation, result);
    }
}
function _loadSyntaxTokens(extensionResourceLoaderService, themeLocation, result) {
    return extensionResourceLoaderService.readExtensionResource(themeLocation).then((content) => {
        try {
            const contentValue = parsePList(content);
            const settings = contentValue.settings;
            if (!Array.isArray(settings)) {
                return Promise.reject(new Error(nls.localize('error.plist.invalidformat', "Problem parsing tmTheme file: {0}. 'settings' is not array.")));
            }
            convertSettings(settings, result);
            return Promise.resolve(null);
        }
        catch (e) {
            return Promise.reject(new Error(nls.localize('error.cannotparse', 'Problems parsing tmTheme file: {0}', e.message)));
        }
    }, (error) => {
        return Promise.reject(new Error(nls.localize('error.cannotload', 'Problems loading tmTheme file {0}: {1}', themeLocation.toString(), error.message)));
    });
}
const defaultThemeColors = {
    light: [
        { scope: 'token.info-token', settings: { foreground: '#316bcd' } },
        { scope: 'token.warn-token', settings: { foreground: '#cd9731' } },
        { scope: 'token.error-token', settings: { foreground: '#cd3131' } },
        { scope: 'token.debug-token', settings: { foreground: '#800080' } },
    ],
    dark: [
        { scope: 'token.info-token', settings: { foreground: '#6796e6' } },
        { scope: 'token.warn-token', settings: { foreground: '#cd9731' } },
        { scope: 'token.error-token', settings: { foreground: '#f44747' } },
        { scope: 'token.debug-token', settings: { foreground: '#b267e6' } },
    ],
    hcLight: [
        { scope: 'token.info-token', settings: { foreground: '#316bcd' } },
        { scope: 'token.warn-token', settings: { foreground: '#cd9731' } },
        { scope: 'token.error-token', settings: { foreground: '#cd3131' } },
        { scope: 'token.debug-token', settings: { foreground: '#800080' } },
    ],
    hcDark: [
        { scope: 'token.info-token', settings: { foreground: '#6796e6' } },
        { scope: 'token.warn-token', settings: { foreground: '#008000' } },
        { scope: 'token.error-token', settings: { foreground: '#FF0000' } },
        { scope: 'token.debug-token', settings: { foreground: '#b267e6' } },
    ],
};
const noMatch = (_scope) => -1;
function nameMatcher(identifiers, scopes) {
    if (scopes.length < identifiers.length) {
        return -1;
    }
    let score = undefined;
    const every = identifiers.every((identifier) => {
        for (let i = scopes.length - 1; i >= 0; i--) {
            if (scopesAreMatching(scopes[i], identifier)) {
                score = (i + 1) * 0x10000 + identifier.length;
                return true;
            }
        }
        return false;
    });
    return every && score !== undefined ? score : -1;
}
function scopesAreMatching(thisScopeName, scopeName) {
    if (!thisScopeName) {
        return false;
    }
    if (thisScopeName === scopeName) {
        return true;
    }
    const len = scopeName.length;
    return (thisScopeName.length > len &&
        thisScopeName.substr(0, len) === scopeName &&
        thisScopeName[len] === '.');
}
function getScopeMatcher(rule) {
    const ruleScope = rule.scope;
    if (!ruleScope || !rule.settings) {
        return noMatch;
    }
    const matchers = [];
    if (Array.isArray(ruleScope)) {
        for (const rs of ruleScope) {
            createMatchers(rs, nameMatcher, matchers);
        }
    }
    else {
        createMatchers(ruleScope, nameMatcher, matchers);
    }
    if (matchers.length === 0) {
        return noMatch;
    }
    return (scope) => {
        let max = matchers[0].matcher(scope);
        for (let i = 1; i < matchers.length; i++) {
            max = Math.max(max, matchers[i].matcher(scope));
        }
        return max;
    };
}
function readSemanticTokenRule(selectorString, settings) {
    const selector = tokenClassificationRegistry.parseTokenSelector(selectorString);
    let style;
    if (typeof settings === 'string') {
        style = TokenStyle.fromSettings(settings, undefined);
    }
    else if (isSemanticTokenColorizationSetting(settings)) {
        style = TokenStyle.fromSettings(settings.foreground, settings.fontStyle, settings.bold, settings.underline, settings.strikethrough, settings.italic);
    }
    if (style) {
        return { selector, style };
    }
    return undefined;
}
function isSemanticTokenColorizationSetting(style) {
    return (style &&
        (types.isString(style.foreground) ||
            types.isString(style.fontStyle) ||
            types.isBoolean(style.italic) ||
            types.isBoolean(style.underline) ||
            types.isBoolean(style.strikethrough) ||
            types.isBoolean(style.bold)));
}
export function findMetadata(colorThemeData, captureNames, languageId, bracket) {
    let metadata = 0;
    metadata |= languageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */;
    const definitions = {};
    const tokenStyle = colorThemeData.resolveScopes([captureNames], definitions);
    if (captureNames.length > 0) {
        const standardToken = toStandardTokenType(captureNames[captureNames.length - 1]);
        metadata |= standardToken << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */;
    }
    const fontStyle = definitions.foreground?.settings.fontStyle || definitions.bold?.settings.fontStyle;
    if (fontStyle?.includes('italic')) {
        metadata |= 1 /* FontStyle.Italic */ | 2048 /* MetadataConsts.ITALIC_MASK */;
    }
    if (fontStyle?.includes('bold')) {
        metadata |= 2 /* FontStyle.Bold */ | 4096 /* MetadataConsts.BOLD_MASK */;
    }
    if (fontStyle?.includes('underline')) {
        metadata |= 4 /* FontStyle.Underline */ | 8192 /* MetadataConsts.UNDERLINE_MASK */;
    }
    if (fontStyle?.includes('strikethrough')) {
        metadata |= 8 /* FontStyle.Strikethrough */ | 16384 /* MetadataConsts.STRIKETHROUGH_MASK */;
    }
    const foreground = tokenStyle?.foreground;
    const tokenStyleForeground = foreground !== undefined
        ? colorThemeData.getTokenColorIndex().get(foreground)
        : 1 /* ColorId.DefaultForeground */;
    metadata |= tokenStyleForeground << 15 /* MetadataConsts.FOREGROUND_OFFSET */;
    if (bracket) {
        metadata |= 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
    }
    return metadata;
}
class TokenColorIndex {
    constructor() {
        this._lastColorId = 0;
        this._id2color = [];
        this._color2id = Object.create(null);
    }
    add(color) {
        color = normalizeColor(color);
        if (color === undefined) {
            return 0;
        }
        let value = this._color2id[color];
        if (value) {
            return value;
        }
        value = ++this._lastColorId;
        this._color2id[color] = value;
        this._id2color[value] = color;
        return value;
    }
    get(color) {
        color = normalizeColor(color);
        if (color === undefined) {
            return 0;
        }
        const value = this._color2id[color];
        if (value) {
            return value;
        }
        console.log(`Color ${color} not in index.`);
        return 0;
    }
    asArray() {
        return this._id2color.slice(0);
    }
}
function normalizeColor(color) {
    if (!color) {
        return undefined;
    }
    if (typeof color !== 'string') {
        color = Color.Format.CSS.formatHexA(color, true);
    }
    const len = color.length;
    if (color.charCodeAt(0) !== 35 /* CharCode.Hash */ || (len !== 4 && len !== 5 && len !== 7 && len !== 9)) {
        return undefined;
    }
    const result = [35 /* CharCode.Hash */];
    for (let i = 1; i < len; i++) {
        const upper = hexUpper(color.charCodeAt(i));
        if (!upper) {
            return undefined;
        }
        result.push(upper);
        if (len === 4 || len === 5) {
            result.push(upper);
        }
    }
    if (result.length === 9 && result[7] === 70 /* CharCode.F */ && result[8] === 70 /* CharCode.F */) {
        result.length = 7;
    }
    return String.fromCharCode(...result);
}
function hexUpper(charCode) {
    if ((charCode >= 48 /* CharCode.Digit0 */ && charCode <= 57 /* CharCode.Digit9 */) ||
        (charCode >= 65 /* CharCode.A */ && charCode <= 70 /* CharCode.F */)) {
        return charCode;
    }
    else if (charCode >= 97 /* CharCode.a */ && charCode <= 102 /* CharCode.f */) {
        return charCode - 97 /* CharCode.a */ + 65 /* CharCode.A */;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JUaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvY29tbW9uL2NvbG9yVGhlbWVEYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sYUFBYSxFQVliLHVCQUF1QixFQUN2QixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLG9CQUFvQixHQUNwQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN6RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxJQUFJLHVCQUF1QixFQUdyQyxnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLDBCQUEwQixHQUMxQixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFbkYsT0FBTyxFQUFFLEtBQUssSUFBSSxVQUFVLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGlCQUFpQixF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Q0FDRCxDQUNELENBQUE7SUFDRixDQUFDLENBQ0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLGtCQUFrQixHQUFvRDtJQUMzRSxLQUFLLEVBQUU7UUFDTixFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbEUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNuRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7S0FDbkU7SUFDRCxJQUFJLEVBQUU7UUFDTCxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbEUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNuRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7S0FDbkU7SUFDRCxPQUFPLEVBQUU7UUFDUixFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbEUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxFQUFF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