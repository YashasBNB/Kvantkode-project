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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JUaGVtZURhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi9jb2xvclRoZW1lRGF0YS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLGFBQWEsRUFZYix1QkFBdUIsRUFDdkIsc0JBQXNCLEVBQ3RCLGVBQWUsRUFDZixvQkFBb0IsR0FDcEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDekQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsSUFBSSx1QkFBdUIsRUFHckMsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQiwwQkFBMEIsR0FDMUIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRW5GLE9BQU8sRUFBRSxLQUFLLElBQUksVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdEQsT0FBTyxFQUNOLFVBQVUsRUFDVixpQkFBaUIsRUFFakIs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Q0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxrQkFBa0IsR0FBb0Q7SUFDM0UsS0FBSyxFQUFFO1FBQ04sRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNsRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbkUsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO0tBQ25FO0lBQ0QsSUFBSSxFQUFFO1FBQ0wsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNsRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDbkUsRUFBRSxLQUFLLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO0tBQ25FO0lBQ0QsT0FBTyxFQUFFO1FBQ1IsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxFQUFFO1FBQ2xFLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsRUFBRTtRQUNsRSxFQUFFLEtBQUssRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsRUFBRSxVQUFV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