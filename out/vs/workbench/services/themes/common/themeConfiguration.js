/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { textmateColorsSchemaId, textmateColorGroupSchemaId } from './colorThemeSchema.js';
import { workbenchColorsSchemaId } from '../../../../platform/theme/common/colorRegistry.js';
import { tokenStylingSchemaId } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
import { ThemeSettings, ThemeSettingDefaults, } from './workbenchThemeService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
// Configuration: Themes
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const colorThemeSettingEnum = [];
const colorThemeSettingEnumItemLabels = [];
const colorThemeSettingEnumDescriptions = [];
export function formatSettingAsLink(str) {
    return `\`#${str}#\``;
}
export const COLOR_THEME_CONFIGURATION_SETTINGS_TAG = 'colorThemeConfiguration';
const colorThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'colorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme used in the workbench when {0} is not enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: isWeb ? ThemeSettingDefaults.COLOR_THEME_LIGHT : ThemeSettingDefaults.COLOR_THEME_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', 'Theme is unknown or not installed.'),
};
const preferredDarkThemeSettingSchema = {
    type: 'string', //
    markdownDescription: nls.localize({ key: 'preferredDarkColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when system color mode is dark and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: ThemeSettingDefaults.COLOR_THEME_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', 'Theme is unknown or not installed.'),
};
const preferredLightThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'preferredLightColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when system color mode is light and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: ThemeSettingDefaults.COLOR_THEME_LIGHT,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', 'Theme is unknown or not installed.'),
};
const preferredHCDarkThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'preferredHCDarkColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when in high contrast dark mode and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_HC)),
    default: ThemeSettingDefaults.COLOR_THEME_HC_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', 'Theme is unknown or not installed.'),
};
const preferredHCLightThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize({ key: 'preferredHCLightColorTheme', comment: ['{0} will become a link to another setting.'] }, 'Specifies the color theme when in high contrast light mode and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_HC)),
    default: ThemeSettingDefaults.COLOR_THEME_HC_LIGHT,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize('colorThemeError', 'Theme is unknown or not installed.'),
};
const detectColorSchemeSettingSchema = {
    type: 'boolean',
    markdownDescription: nls.localize({ key: 'detectColorScheme', comment: ['{0} and {1} will become links to other settings.'] }, 'If enabled, will automatically select a color theme based on the system color mode. If the system color mode is dark, {0} is used, else {1}.', formatSettingAsLink(ThemeSettings.PREFERRED_DARK_THEME), formatSettingAsLink(ThemeSettings.PREFERRED_LIGHT_THEME)),
    default: false,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
};
const colorCustomizationsSchema = {
    type: 'object',
    description: nls.localize('workbenchColors', 'Overrides colors from the currently selected color theme.'),
    allOf: [{ $ref: workbenchColorsSchemaId }],
    default: {},
    defaultSnippets: [
        {
            body: {},
        },
    ],
};
const fileIconThemeSettingSchema = {
    type: ['string', 'null'],
    default: ThemeSettingDefaults.FILE_ICON_THEME,
    description: nls.localize('iconTheme', "Specifies the file icon theme used in the workbench or 'null' to not show any file icons."),
    enum: [null],
    enumItemLabels: [nls.localize('noIconThemeLabel', 'None')],
    enumDescriptions: [nls.localize('noIconThemeDesc', 'No file icons')],
    errorMessage: nls.localize('iconThemeError', 'File icon theme is unknown or not installed.'),
};
const productIconThemeSettingSchema = {
    type: ['string', 'null'],
    default: ThemeSettingDefaults.PRODUCT_ICON_THEME,
    description: nls.localize('productIconTheme', 'Specifies the product icon theme used.'),
    enum: [ThemeSettingDefaults.PRODUCT_ICON_THEME],
    enumItemLabels: [nls.localize('defaultProductIconThemeLabel', 'Default')],
    enumDescriptions: [nls.localize('defaultProductIconThemeDesc', 'Default')],
    errorMessage: nls.localize('productIconThemeError', 'Product icon theme is unknown or not installed.'),
};
const detectHCSchemeSettingSchema = {
    type: 'boolean',
    default: true,
    markdownDescription: nls.localize({
        key: 'autoDetectHighContrast',
        comment: ['{0} and {1} will become links to other settings.'],
    }, 'If enabled, will automatically change to high contrast theme if the OS is using a high contrast theme. The high contrast theme to use is specified by {0} and {1}.', formatSettingAsLink(ThemeSettings.PREFERRED_HC_DARK_THEME), formatSettingAsLink(ThemeSettings.PREFERRED_HC_LIGHT_THEME)),
    scope: 1 /* ConfigurationScope.APPLICATION */,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
};
const themeSettingsConfiguration = {
    id: 'workbench',
    order: 7.1,
    type: 'object',
    properties: {
        [ThemeSettings.COLOR_THEME]: colorThemeSettingSchema,
        [ThemeSettings.PREFERRED_DARK_THEME]: preferredDarkThemeSettingSchema,
        [ThemeSettings.PREFERRED_LIGHT_THEME]: preferredLightThemeSettingSchema,
        [ThemeSettings.PREFERRED_HC_DARK_THEME]: preferredHCDarkThemeSettingSchema,
        [ThemeSettings.PREFERRED_HC_LIGHT_THEME]: preferredHCLightThemeSettingSchema,
        [ThemeSettings.FILE_ICON_THEME]: fileIconThemeSettingSchema,
        [ThemeSettings.COLOR_CUSTOMIZATIONS]: colorCustomizationsSchema,
        [ThemeSettings.PRODUCT_ICON_THEME]: productIconThemeSettingSchema,
    },
};
configurationRegistry.registerConfiguration(themeSettingsConfiguration);
const themeSettingsWindowConfiguration = {
    id: 'window',
    order: 8.1,
    type: 'object',
    properties: {
        [ThemeSettings.DETECT_HC]: detectHCSchemeSettingSchema,
        [ThemeSettings.DETECT_COLOR_SCHEME]: detectColorSchemeSettingSchema,
    },
};
configurationRegistry.registerConfiguration(themeSettingsWindowConfiguration);
function tokenGroupSettings(description) {
    return {
        description,
        $ref: textmateColorGroupSchemaId,
    };
}
const themeSpecificSettingKey = '^\\[[^\\]]*(\\]\\s*\\[[^\\]]*)*\\]$';
const tokenColorSchema = {
    type: 'object',
    properties: {
        comments: tokenGroupSettings(nls.localize('editorColors.comments', 'Sets the colors and styles for comments')),
        strings: tokenGroupSettings(nls.localize('editorColors.strings', 'Sets the colors and styles for strings literals.')),
        keywords: tokenGroupSettings(nls.localize('editorColors.keywords', 'Sets the colors and styles for keywords.')),
        numbers: tokenGroupSettings(nls.localize('editorColors.numbers', 'Sets the colors and styles for number literals.')),
        types: tokenGroupSettings(nls.localize('editorColors.types', 'Sets the colors and styles for type declarations and references.')),
        functions: tokenGroupSettings(nls.localize('editorColors.functions', 'Sets the colors and styles for functions declarations and references.')),
        variables: tokenGroupSettings(nls.localize('editorColors.variables', 'Sets the colors and styles for variables declarations and references.')),
        textMateRules: {
            description: nls.localize('editorColors.textMateRules', 'Sets colors and styles using textmate theming rules (advanced).'),
            $ref: textmateColorsSchemaId,
        },
        semanticHighlighting: {
            description: nls.localize('editorColors.semanticHighlighting', 'Whether semantic highlighting should be enabled for this theme.'),
            deprecationMessage: nls.localize('editorColors.semanticHighlighting.deprecationMessage', 'Use `enabled` in `editor.semanticTokenColorCustomizations` setting instead.'),
            markdownDeprecationMessage: nls.localize({
                key: 'editorColors.semanticHighlighting.deprecationMessageMarkdown',
                comment: ['{0} will become a link to another setting.'],
            }, 'Use `enabled` in {0} setting instead.', formatSettingAsLink('editor.semanticTokenColorCustomizations')),
            type: 'boolean',
        },
    },
    additionalProperties: false,
};
const tokenColorCustomizationSchema = {
    description: nls.localize('editorColors', 'Overrides editor syntax colors and font style from the currently selected color theme.'),
    default: {},
    allOf: [{ ...tokenColorSchema, patternProperties: { '^\\[': {} } }],
};
const semanticTokenColorSchema = {
    type: 'object',
    properties: {
        enabled: {
            type: 'boolean',
            description: nls.localize('editorColors.semanticHighlighting.enabled', 'Whether semantic highlighting is enabled or disabled for this theme'),
            suggestSortText: '0_enabled',
        },
        rules: {
            $ref: tokenStylingSchemaId,
            description: nls.localize('editorColors.semanticHighlighting.rules', 'Semantic token styling rules for this theme.'),
            suggestSortText: '0_rules',
        },
    },
    additionalProperties: false,
};
const semanticTokenColorCustomizationSchema = {
    description: nls.localize('semanticTokenColors', 'Overrides editor semantic token color and styles from the currently selected color theme.'),
    default: {},
    allOf: [{ ...semanticTokenColorSchema, patternProperties: { '^\\[': {} } }],
};
const tokenColorCustomizationConfiguration = {
    id: 'editor',
    order: 7.2,
    type: 'object',
    properties: {
        [ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS]: tokenColorCustomizationSchema,
        [ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS]: semanticTokenColorCustomizationSchema,
    },
};
configurationRegistry.registerConfiguration(tokenColorCustomizationConfiguration);
export function updateColorThemeConfigurationSchemas(themes) {
    // updates enum for the 'workbench.colorTheme` setting
    themes.sort((a, b) => a.label.localeCompare(b.label));
    colorThemeSettingEnum.splice(0, colorThemeSettingEnum.length, ...themes.map((t) => t.settingsId));
    colorThemeSettingEnumDescriptions.splice(0, colorThemeSettingEnumDescriptions.length, ...themes.map((t) => t.description || ''));
    colorThemeSettingEnumItemLabels.splice(0, colorThemeSettingEnumItemLabels.length, ...themes.map((t) => t.label || ''));
    const themeSpecificWorkbenchColors = { properties: {} };
    const themeSpecificTokenColors = { properties: {} };
    const themeSpecificSemanticTokenColors = { properties: {} };
    const workbenchColors = { $ref: workbenchColorsSchemaId, additionalProperties: false };
    const tokenColors = { properties: tokenColorSchema.properties, additionalProperties: false };
    for (const t of themes) {
        // add theme specific color customization ("[Abyss]":{ ... })
        const themeId = `[${t.settingsId}]`;
        themeSpecificWorkbenchColors.properties[themeId] = workbenchColors;
        themeSpecificTokenColors.properties[themeId] = tokenColors;
        themeSpecificSemanticTokenColors.properties[themeId] = semanticTokenColorSchema;
    }
    themeSpecificWorkbenchColors.patternProperties = { [themeSpecificSettingKey]: workbenchColors };
    themeSpecificTokenColors.patternProperties = { [themeSpecificSettingKey]: tokenColors };
    themeSpecificSemanticTokenColors.patternProperties = {
        [themeSpecificSettingKey]: semanticTokenColorSchema,
    };
    colorCustomizationsSchema.allOf[1] = themeSpecificWorkbenchColors;
    tokenColorCustomizationSchema.allOf[1] = themeSpecificTokenColors;
    semanticTokenColorCustomizationSchema.allOf[1] = themeSpecificSemanticTokenColors;
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration, tokenColorCustomizationConfiguration);
}
export function updateFileIconThemeConfigurationSchemas(themes) {
    fileIconThemeSettingSchema.enum.splice(1, Number.MAX_VALUE, ...themes.map((t) => t.settingsId));
    fileIconThemeSettingSchema.enumItemLabels.splice(1, Number.MAX_VALUE, ...themes.map((t) => t.label));
    fileIconThemeSettingSchema.enumDescriptions.splice(1, Number.MAX_VALUE, ...themes.map((t) => t.description || ''));
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration);
}
export function updateProductIconThemeConfigurationSchemas(themes) {
    productIconThemeSettingSchema.enum.splice(1, Number.MAX_VALUE, ...themes.map((t) => t.settingsId));
    productIconThemeSettingSchema.enumItemLabels.splice(1, Number.MAX_VALUE, ...themes.map((t) => t.label));
    productIconThemeSettingSchema.enumDescriptions.splice(1, Number.MAX_VALUE, ...themes.map((t) => t.description || ''));
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration);
}
const colorSchemeToPreferred = {
    [ColorScheme.DARK]: ThemeSettings.PREFERRED_DARK_THEME,
    [ColorScheme.LIGHT]: ThemeSettings.PREFERRED_LIGHT_THEME,
    [ColorScheme.HIGH_CONTRAST_DARK]: ThemeSettings.PREFERRED_HC_DARK_THEME,
    [ColorScheme.HIGH_CONTRAST_LIGHT]: ThemeSettings.PREFERRED_HC_LIGHT_THEME,
};
export class ThemeConfiguration {
    constructor(configurationService, hostColorService) {
        this.configurationService = configurationService;
        this.hostColorService = hostColorService;
    }
    get colorTheme() {
        return this.configurationService.getValue(this.getColorThemeSettingId());
    }
    get fileIconTheme() {
        return this.configurationService.getValue(ThemeSettings.FILE_ICON_THEME);
    }
    get productIconTheme() {
        return this.configurationService.getValue(ThemeSettings.PRODUCT_ICON_THEME);
    }
    get colorCustomizations() {
        return (this.configurationService.getValue(ThemeSettings.COLOR_CUSTOMIZATIONS) || {});
    }
    get tokenColorCustomizations() {
        return (this.configurationService.getValue(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS) || {});
    }
    get semanticTokenColorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS);
    }
    getPreferredColorScheme() {
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) &&
            this.hostColorService.highContrast) {
            return this.hostColorService.dark
                ? ColorScheme.HIGH_CONTRAST_DARK
                : ColorScheme.HIGH_CONTRAST_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return this.hostColorService.dark ? ColorScheme.DARK : ColorScheme.LIGHT;
        }
        return undefined;
    }
    isDetectingColorScheme() {
        return this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME);
    }
    getColorThemeSettingId() {
        const preferredScheme = this.getPreferredColorScheme();
        return preferredScheme ? colorSchemeToPreferred[preferredScheme] : ThemeSettings.COLOR_THEME;
    }
    async setColorTheme(theme, settingsTarget) {
        await this.writeConfiguration(this.getColorThemeSettingId(), theme.settingsId, settingsTarget);
        return theme;
    }
    async setFileIconTheme(theme, settingsTarget) {
        await this.writeConfiguration(ThemeSettings.FILE_ICON_THEME, theme.settingsId, settingsTarget);
        return theme;
    }
    async setProductIconTheme(theme, settingsTarget) {
        await this.writeConfiguration(ThemeSettings.PRODUCT_ICON_THEME, theme.settingsId, settingsTarget);
        return theme;
    }
    isDefaultColorTheme() {
        const settings = this.configurationService.inspect(this.getColorThemeSettingId());
        return settings && settings.default?.value === settings.value;
    }
    findAutoConfigurationTarget(key) {
        const settings = this.configurationService.inspect(key);
        if (!types.isUndefined(settings.workspaceFolderValue)) {
            return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
        else if (!types.isUndefined(settings.workspaceValue)) {
            return 5 /* ConfigurationTarget.WORKSPACE */;
        }
        else if (!types.isUndefined(settings.userRemote)) {
            return 4 /* ConfigurationTarget.USER_REMOTE */;
        }
        return 2 /* ConfigurationTarget.USER */;
    }
    async writeConfiguration(key, value, settingsTarget) {
        if (settingsTarget === undefined || settingsTarget === 'preview') {
            return;
        }
        const settings = this.configurationService.inspect(key);
        if (settingsTarget === 'auto') {
            return this.configurationService.updateValue(key, value);
        }
        if (settingsTarget === 2 /* ConfigurationTarget.USER */) {
            if (value === settings.userValue) {
                return Promise.resolve(undefined); // nothing to do
            }
            else if (value === settings.defaultValue) {
                if (types.isUndefined(settings.userValue)) {
                    return Promise.resolve(undefined); // nothing to do
                }
                value = undefined; // remove configuration from user settings
            }
        }
        else if (settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */ ||
            settingsTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ ||
            settingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            if (value === settings.value) {
                return Promise.resolve(undefined); // nothing to do
            }
        }
        return this.configurationService.updateValue(key, value, settingsTarget);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9jb21tb24vdGhlbWVDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FJckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUczRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN2RyxPQUFPLEVBQ04sYUFBYSxFQVFiLG9CQUFvQixHQUNwQixNQUFNLDRCQUE0QixDQUFBO0FBS25DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHeEUsd0JBQXdCO0FBQ3hCLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFBO0FBRUQsTUFBTSxxQkFBcUIsR0FBYSxFQUFFLENBQUE7QUFDMUMsTUFBTSwrQkFBK0IsR0FBYSxFQUFFLENBQUE7QUFDcEQsTUFBTSxpQ0FBaUMsR0FBYSxFQUFFLENBQUE7QUFFdEQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLEdBQVc7SUFDOUMs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