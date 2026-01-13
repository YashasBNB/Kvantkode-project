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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGhlbWVzL2NvbW1vbi90aGVtZUNvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUlyQyxNQUFNLG9FQUFvRSxDQUFBO0FBRzNFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3ZHLE9BQU8sRUFDTixhQUFhLEVBUWIsb0JBQW9CLEdBQ3BCLE1BQU0sNEJBQTRCLENBQUE7QUFLbkMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUd4RSx3QkFBd0I7QUFDeEIsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JDLENBQUE7QUFFRCxNQUFNLHFCQUFxQixHQUFhLEVBQUUsQ0FBQTtBQUMxQyxNQUFNLCtCQUErQixHQUFhLEVBQUUsQ0FBQTtBQUNwRCxNQUFNLGlDQUFpQyxHQUFhLEVBQUUsQ0FBQTtBQUV0RCxNQUFNLFVBQVUs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