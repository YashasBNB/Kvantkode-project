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
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkbenchThemeService, ExtensionData, ThemeSettings, ThemeSettingDefaults, COLOR_THEME_DARK_INITIAL_COLORS, COLOR_THEME_LIGHT_INITIAL_COLORS, } from '../common/workbenchThemeService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as errors from '../../../../base/common/errors.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { ColorThemeData } from '../common/colorThemeData.js';
import { Extensions as ThemingExtensions, } from '../../../../platform/theme/common/themeService.js';
import { Emitter } from '../../../../base/common/event.js';
import { registerFileIconThemeSchemas } from '../common/fileIconThemeSchema.js';
import { dispose, Disposable } from '../../../../base/common/lifecycle.js';
import { FileIconThemeData, FileIconThemeLoader } from './fileIconThemeData.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { IBrowserWorkbenchEnvironmentService } from '../../environment/browser/environmentService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import * as resources from '../../../../base/common/resources.js';
import { registerColorThemeSchemas } from '../common/colorThemeSchema.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { getRemoteAuthority } from '../../../../platform/remote/common/remoteHosts.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { ThemeRegistry, registerColorThemeExtensionPoint, registerFileIconThemeExtensionPoint, registerProductIconThemeExtensionPoint, } from '../common/themeExtensionPoints.js';
import { updateColorThemeConfigurationSchemas, updateFileIconThemeConfigurationSchemas, ThemeConfiguration, updateProductIconThemeConfigurationSchemas, } from '../common/themeConfiguration.js';
import { ProductIconThemeData, DEFAULT_PRODUCT_ICON_THEME_ID } from './productIconThemeData.js';
import { registerProductIconThemeSchemas } from '../common/productIconThemeSchema.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ColorScheme, ThemeTypeSelector } from '../../../../platform/theme/common/theme.js';
import { IHostColorSchemeService } from '../common/hostColorSchemeService.js';
import { RunOnceScheduler, Sequencer } from '../../../../base/common/async.js';
import { IUserDataInitializationService } from '../../userData/browser/userDataInit.js';
import { getIconsStyleSheet } from '../../../../platform/theme/browser/iconsStyleSheet.js';
import { asCssVariableName, getColorRegistry, } from '../../../../platform/theme/common/colorRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { mainWindow } from '../../../../base/browser/window.js';
// implementation
const defaultThemeExtensionId = 'vscode-theme-defaults';
const DEFAULT_FILE_ICON_THEME_ID = 'vscode.vscode-theme-seti-vs-seti';
const fileIconsEnabledClass = 'file-icons-enabled';
const colorThemeRulesClassName = 'contributedColorTheme';
const fileIconThemeRulesClassName = 'contributedFileIconTheme';
const productIconThemeRulesClassName = 'contributedProductIconTheme';
const themingRegistry = Registry.as(ThemingExtensions.ThemingContribution);
function validateThemeId(theme) {
    // migrations
    switch (theme) {
        case ThemeTypeSelector.VS:
            return `vs ${defaultThemeExtensionId}-themes-light_vs-json`;
        case ThemeTypeSelector.VS_DARK:
            return `vs-dark ${defaultThemeExtensionId}-themes-dark_vs-json`;
        case ThemeTypeSelector.HC_BLACK:
            return `hc-black ${defaultThemeExtensionId}-themes-hc_black-json`;
        case ThemeTypeSelector.HC_LIGHT:
            return `hc-light ${defaultThemeExtensionId}-themes-hc_light-json`;
    }
    return theme;
}
const colorThemesExtPoint = registerColorThemeExtensionPoint();
const fileIconThemesExtPoint = registerFileIconThemeExtensionPoint();
const productIconThemesExtPoint = registerProductIconThemeExtensionPoint();
let WorkbenchThemeService = class WorkbenchThemeService extends Disposable {
    constructor(extensionService, storageService, configurationService, telemetryService, environmentService, fileService, extensionResourceLoaderService, layoutService, logService, hostColorService, userDataInitializationService, languageService) {
        super();
        this.storageService = storageService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
        this.hostColorService = hostColorService;
        this.userDataInitializationService = userDataInitializationService;
        this.languageService = languageService;
        this.themeExtensionsActivated = new Map();
        this.container = layoutService.mainContainer;
        this.settings = new ThemeConfiguration(configurationService, hostColorService);
        this.colorThemeRegistry = this._register(new ThemeRegistry(colorThemesExtPoint, ColorThemeData.fromExtensionTheme));
        this.colorThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentColorTheme.bind(this)));
        this.onColorThemeChange = new Emitter({ leakWarningThreshold: 400 });
        this.currentColorTheme = ColorThemeData.createUnloadedTheme('');
        this.colorThemeSequencer = new Sequencer();
        this.fileIconThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentFileIconTheme.bind(this)));
        this.fileIconThemeRegistry = this._register(new ThemeRegistry(fileIconThemesExtPoint, FileIconThemeData.fromExtensionTheme, true, FileIconThemeData.noIconTheme));
        this.fileIconThemeLoader = new FileIconThemeLoader(extensionResourceLoaderService, languageService);
        this.onFileIconThemeChange = new Emitter({ leakWarningThreshold: 400 });
        this.currentFileIconTheme = FileIconThemeData.createUnloadedTheme('');
        this.fileIconThemeSequencer = new Sequencer();
        this.productIconThemeWatcher = this._register(new ThemeFileWatcher(fileService, environmentService, this.reloadCurrentProductIconTheme.bind(this)));
        this.productIconThemeRegistry = this._register(new ThemeRegistry(productIconThemesExtPoint, ProductIconThemeData.fromExtensionTheme, true, ProductIconThemeData.defaultTheme));
        this.onProductIconThemeChange = new Emitter();
        this.currentProductIconTheme = ProductIconThemeData.createUnloadedTheme('');
        this.productIconThemeSequencer = new Sequencer();
        this._register(this.onDidColorThemeChange((theme) => getColorRegistry().notifyThemeUpdate(theme)));
        // In order to avoid paint flashing for tokens, because
        // themes are loaded asynchronously, we need to initialize
        // a color theme document with good defaults until the theme is loaded
        let themeData = ColorThemeData.fromStorageData(this.storageService);
        const colorThemeSetting = this.settings.colorTheme;
        if (themeData && colorThemeSetting !== themeData.settingsId) {
            themeData = undefined;
        }
        const defaultColorMap = colorThemeSetting === ThemeSettingDefaults.COLOR_THEME_LIGHT
            ? COLOR_THEME_LIGHT_INITIAL_COLORS
            : colorThemeSetting === ThemeSettingDefaults.COLOR_THEME_DARK
                ? COLOR_THEME_DARK_INITIAL_COLORS
                : undefined;
        if (!themeData) {
            const initialColorTheme = environmentService.options?.initialColorTheme;
            if (initialColorTheme) {
                themeData = ColorThemeData.createUnloadedThemeForThemeType(initialColorTheme.themeType, initialColorTheme.colors ?? defaultColorMap);
            }
        }
        if (!themeData) {
            const colorScheme = this.settings.getPreferredColorScheme() ?? (isWeb ? ColorScheme.LIGHT : ColorScheme.DARK);
            themeData = ColorThemeData.createUnloadedThemeForThemeType(colorScheme, defaultColorMap);
        }
        themeData.setCustomizations(this.settings);
        this.applyTheme(themeData, undefined, true);
        const fileIconData = FileIconThemeData.fromStorageData(this.storageService);
        if (fileIconData) {
            this.applyAndSetFileIconTheme(fileIconData, true);
        }
        const productIconData = ProductIconThemeData.fromStorageData(this.storageService);
        if (productIconData) {
            this.applyAndSetProductIconTheme(productIconData, true);
        }
        extensionService.whenInstalledExtensionsRegistered().then((_) => {
            this.installConfigurationListener();
            this.installPreferredSchemeListener();
            this.installRegistryListeners();
            this.initialize().catch(errors.onUnexpectedError);
        });
        const codiconStyleSheet = createStyleSheet();
        codiconStyleSheet.id = 'codiconStyles';
        const iconsStyleSheet = this._register(getIconsStyleSheet(this));
        function updateAll() {
            codiconStyleSheet.textContent = iconsStyleSheet.getCSS();
        }
        const delayer = this._register(new RunOnceScheduler(updateAll, 0));
        this._register(iconsStyleSheet.onDidChange(() => delayer.schedule()));
        delayer.schedule();
    }
    initialize() {
        const extDevLocs = this.environmentService.extensionDevelopmentLocationURI;
        const extDevLoc = extDevLocs && extDevLocs.length === 1 ? extDevLocs[0] : undefined; // in dev mode, switch to a theme provided by the extension under dev.
        const initializeColorTheme = async () => {
            const devThemes = this.colorThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                const matchedColorTheme = devThemes.find((theme) => theme.type === this.currentColorTheme.type);
                return this.setColorTheme(matchedColorTheme ? matchedColorTheme.id : devThemes[0].id, undefined);
            }
            let theme = this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, undefined);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                // try to get the theme again, now with a fallback to the default themes
                const fallbackTheme = this.currentColorTheme.type === ColorScheme.LIGHT
                    ? ThemeSettingDefaults.COLOR_THEME_LIGHT
                    : ThemeSettingDefaults.COLOR_THEME_DARK;
                theme = this.colorThemeRegistry.findThemeBySettingsId(this.settings.colorTheme, fallbackTheme);
            }
            return this.setColorTheme(theme && theme.id, undefined);
        };
        const initializeFileIconTheme = async () => {
            const devThemes = this.fileIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                return this.setFileIconTheme(devThemes[0].id, 8 /* ConfigurationTarget.MEMORY */);
            }
            let theme = this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                theme = this.fileIconThemeRegistry.findThemeBySettingsId(this.settings.fileIconTheme);
            }
            return this.setFileIconTheme(theme ? theme.id : DEFAULT_FILE_ICON_THEME_ID, undefined);
        };
        const initializeProductIconTheme = async () => {
            const devThemes = this.productIconThemeRegistry.findThemeByExtensionLocation(extDevLoc);
            if (devThemes.length) {
                return this.setProductIconTheme(devThemes[0].id, 8 /* ConfigurationTarget.MEMORY */);
            }
            let theme = this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
            if (!theme) {
                // If the current theme is not available, first make sure setting sync is complete
                await this.userDataInitializationService.whenInitializationFinished();
                theme = this.productIconThemeRegistry.findThemeBySettingsId(this.settings.productIconTheme);
            }
            return this.setProductIconTheme(theme ? theme.id : DEFAULT_PRODUCT_ICON_THEME_ID, undefined);
        };
        return Promise.all([
            initializeColorTheme(),
            initializeFileIconTheme(),
            initializeProductIconTheme(),
        ]);
    }
    installConfigurationListener() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ThemeSettings.COLOR_THEME) ||
                e.affectsConfiguration(ThemeSettings.PREFERRED_DARK_THEME) ||
                e.affectsConfiguration(ThemeSettings.PREFERRED_LIGHT_THEME) ||
                e.affectsConfiguration(ThemeSettings.PREFERRED_HC_DARK_THEME) ||
                e.affectsConfiguration(ThemeSettings.PREFERRED_HC_LIGHT_THEME) ||
                e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME) ||
                e.affectsConfiguration(ThemeSettings.DETECT_HC) ||
                e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME)) {
                this.restoreColorTheme();
            }
            if (e.affectsConfiguration(ThemeSettings.FILE_ICON_THEME)) {
                this.restoreFileIconTheme();
            }
            if (e.affectsConfiguration(ThemeSettings.PRODUCT_ICON_THEME)) {
                this.restoreProductIconTheme();
            }
            if (this.currentColorTheme) {
                let hasColorChanges = false;
                if (e.affectsConfiguration(ThemeSettings.COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomColors(this.settings.colorCustomizations);
                    hasColorChanges = true;
                }
                if (e.affectsConfiguration(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomTokenColors(this.settings.tokenColorCustomizations);
                    hasColorChanges = true;
                }
                if (e.affectsConfiguration(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS)) {
                    this.currentColorTheme.setCustomSemanticTokenColors(this.settings.semanticTokenColorCustomizations);
                    hasColorChanges = true;
                }
                if (hasColorChanges) {
                    this.updateDynamicCSSRules(this.currentColorTheme);
                    this.onColorThemeChange.fire(this.currentColorTheme);
                }
            }
        }));
    }
    installRegistryListeners() {
        let prevColorId = undefined;
        // update settings schema setting for theme specific settings
        this._register(this.colorThemeRegistry.onDidChange(async (event) => {
            updateColorThemeConfigurationSchemas(event.themes);
            if (await this.restoreColorTheme()) {
                // checks if theme from settings exists and is set
                // restore theme
                if (this.currentColorTheme.settingsId === ThemeSettingDefaults.COLOR_THEME_DARK &&
                    !types.isUndefined(prevColorId) &&
                    (await this.colorThemeRegistry.findThemeById(prevColorId))) {
                    await this.setColorTheme(prevColorId, 'auto');
                    prevColorId = undefined;
                }
                else if (event.added.some((t) => t.settingsId === this.currentColorTheme.settingsId)) {
                    await this.reloadCurrentColorTheme();
                }
            }
            else if (event.removed.some((t) => t.settingsId === this.currentColorTheme.settingsId)) {
                // current theme is no longer available
                prevColorId = this.currentColorTheme.id;
                const defaultTheme = this.colorThemeRegistry.findThemeBySettingsId(ThemeSettingDefaults.COLOR_THEME_DARK);
                await this.setColorTheme(defaultTheme, 'auto');
            }
        }));
        let prevFileIconId = undefined;
        this._register(this._register(this.fileIconThemeRegistry.onDidChange(async (event) => {
            updateFileIconThemeConfigurationSchemas(event.themes);
            if (await this.restoreFileIconTheme()) {
                // checks if theme from settings exists and is set
                // restore theme
                if (this.currentFileIconTheme.id === DEFAULT_FILE_ICON_THEME_ID &&
                    !types.isUndefined(prevFileIconId) &&
                    this.fileIconThemeRegistry.findThemeById(prevFileIconId)) {
                    await this.setFileIconTheme(prevFileIconId, 'auto');
                    prevFileIconId = undefined;
                }
                else if (event.added.some((t) => t.settingsId === this.currentFileIconTheme.settingsId)) {
                    await this.reloadCurrentFileIconTheme();
                }
            }
            else if (event.removed.some((t) => t.settingsId === this.currentFileIconTheme.settingsId)) {
                // current theme is no longer available
                prevFileIconId = this.currentFileIconTheme.id;
                await this.setFileIconTheme(DEFAULT_FILE_ICON_THEME_ID, 'auto');
            }
        })));
        let prevProductIconId = undefined;
        this._register(this.productIconThemeRegistry.onDidChange(async (event) => {
            updateProductIconThemeConfigurationSchemas(event.themes);
            if (await this.restoreProductIconTheme()) {
                // checks if theme from settings exists and is set
                // restore theme
                if (this.currentProductIconTheme.id === DEFAULT_PRODUCT_ICON_THEME_ID &&
                    !types.isUndefined(prevProductIconId) &&
                    this.productIconThemeRegistry.findThemeById(prevProductIconId)) {
                    await this.setProductIconTheme(prevProductIconId, 'auto');
                    prevProductIconId = undefined;
                }
                else if (event.added.some((t) => t.settingsId === this.currentProductIconTheme.settingsId)) {
                    await this.reloadCurrentProductIconTheme();
                }
            }
            else if (event.removed.some((t) => t.settingsId === this.currentProductIconTheme.settingsId)) {
                // current theme is no longer available
                prevProductIconId = this.currentProductIconTheme.id;
                await this.setProductIconTheme(DEFAULT_PRODUCT_ICON_THEME_ID, 'auto');
            }
        }));
        this._register(this.languageService.onDidChange(() => this.reloadCurrentFileIconTheme()));
        return Promise.all([
            this.getColorThemes(),
            this.getFileIconThemes(),
            this.getProductIconThemes(),
        ]).then(([ct, fit, pit]) => {
            updateColorThemeConfigurationSchemas(ct);
            updateFileIconThemeConfigurationSchemas(fit);
            updateProductIconThemeConfigurationSchemas(pit);
        });
    }
    // preferred scheme handling
    installPreferredSchemeListener() {
        this._register(this.hostColorService.onDidChangeColorScheme(() => {
            if (this.settings.isDetectingColorScheme()) {
                this.restoreColorTheme();
            }
        }));
    }
    getColorTheme() {
        return this.currentColorTheme;
    }
    async getColorThemes() {
        return this.colorThemeRegistry.getThemes();
    }
    getPreferredColorScheme() {
        return this.settings.getPreferredColorScheme();
    }
    async getMarketplaceColorThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.colorThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    get onDidColorThemeChange() {
        return this.onColorThemeChange.event;
    }
    setColorTheme(themeIdOrTheme, settingsTarget) {
        return this.colorThemeSequencer.queue(async () => {
            return this.internalSetColorTheme(themeIdOrTheme, settingsTarget);
        });
    }
    async internalSetColorTheme(themeIdOrTheme, settingsTarget) {
        if (!themeIdOrTheme) {
            return null;
        }
        const themeId = types.isString(themeIdOrTheme)
            ? validateThemeId(themeIdOrTheme)
            : themeIdOrTheme.id;
        if (this.currentColorTheme.isLoaded && themeId === this.currentColorTheme.id) {
            if (settingsTarget !== 'preview') {
                this.currentColorTheme.toStorage(this.storageService);
            }
            return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
        }
        let themeData = this.colorThemeRegistry.findThemeById(themeId);
        if (!themeData) {
            if (themeIdOrTheme instanceof ColorThemeData) {
                themeData = themeIdOrTheme;
            }
            else {
                return null;
            }
        }
        try {
            await themeData.ensureLoaded(this.extensionResourceLoaderService);
            themeData.setCustomizations(this.settings);
            return this.applyTheme(themeData, settingsTarget);
        }
        catch (error) {
            throw new Error(nls.localize('error.cannotloadtheme', 'Unable to load {0}: {1}', themeData.location?.toString(), error.message));
        }
    }
    reloadCurrentColorTheme() {
        return this.colorThemeSequencer.queue(async () => {
            try {
                const theme = this.colorThemeRegistry.findThemeBySettingsId(this.currentColorTheme.settingsId) ||
                    this.currentColorTheme;
                await theme.reload(this.extensionResourceLoaderService);
                theme.setCustomizations(this.settings);
                await this.applyTheme(theme, undefined, false);
            }
            catch (error) {
                this.logService.info('Unable to reload {0}: {1}', this.currentColorTheme.location?.toString());
            }
        });
    }
    async restoreColorTheme() {
        return this.colorThemeSequencer.queue(async () => {
            const settingId = this.settings.colorTheme;
            const theme = this.colorThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentColorTheme.settingsId) {
                    await this.internalSetColorTheme(theme.id, undefined);
                }
                else if (theme !== this.currentColorTheme) {
                    await theme.ensureLoaded(this.extensionResourceLoaderService);
                    theme.setCustomizations(this.settings);
                    await this.applyTheme(theme, undefined, true);
                }
                return true;
            }
            return false;
        });
    }
    updateDynamicCSSRules(themeData) {
        const cssRules = new Set();
        const ruleCollector = {
            addRule: (rule) => {
                if (!cssRules.has(rule)) {
                    cssRules.add(rule);
                }
            },
        };
        ruleCollector.addRule(`.monaco-workbench { forced-color-adjust: none; }`);
        themingRegistry
            .getThemingParticipants()
            .forEach((p) => p(themeData, ruleCollector, this.environmentService));
        const colorVariables = [];
        for (const item of getColorRegistry().getColors()) {
            const color = themeData.getColor(item.id, true);
            if (color) {
                colorVariables.push(`${asCssVariableName(item.id)}: ${color.toString()};`);
            }
        }
        ruleCollector.addRule(`.monaco-workbench { ${colorVariables.join('\n')} }`);
        _applyRules([...cssRules].join('\n'), colorThemeRulesClassName);
    }
    applyTheme(newTheme, settingsTarget, silent = false) {
        this.updateDynamicCSSRules(newTheme);
        if (this.currentColorTheme.id) {
            this.container.classList.remove(...this.currentColorTheme.classNames);
        }
        else {
            this.container.classList.remove(ThemeTypeSelector.VS, ThemeTypeSelector.VS_DARK, ThemeTypeSelector.HC_BLACK, ThemeTypeSelector.HC_LIGHT);
        }
        this.container.classList.add(...newTheme.classNames);
        this.currentColorTheme.clearCaches();
        this.currentColorTheme = newTheme;
        if (!this.colorThemingParticipantChangeListener) {
            this.colorThemingParticipantChangeListener = themingRegistry.onThemingParticipantAdded((_) => this.updateDynamicCSSRules(this.currentColorTheme));
        }
        this.colorThemeWatcher.update(newTheme);
        this.sendTelemetry(newTheme.id, newTheme.extensionData, 'color');
        if (silent) {
            return Promise.resolve(null);
        }
        this.onColorThemeChange.fire(this.currentColorTheme);
        // remember theme data for a quick restore
        if (newTheme.isLoaded && settingsTarget !== 'preview') {
            newTheme.toStorage(this.storageService);
        }
        return this.settings.setColorTheme(this.currentColorTheme, settingsTarget);
    }
    sendTelemetry(themeId, themeData, themeType) {
        if (themeData) {
            const key = themeType + themeData.extensionId;
            if (!this.themeExtensionsActivated.get(key)) {
                this.telemetryService.publicLog2('activatePlugin', {
                    id: themeData.extensionId,
                    name: themeData.extensionName,
                    isBuiltin: themeData.extensionIsBuiltin,
                    publisherDisplayName: themeData.extensionPublisher,
                    themeId: themeId,
                });
                this.themeExtensionsActivated.set(key, true);
            }
        }
    }
    async getFileIconThemes() {
        return this.fileIconThemeRegistry.getThemes();
    }
    getFileIconTheme() {
        return this.currentFileIconTheme;
    }
    get onDidFileIconThemeChange() {
        return this.onFileIconThemeChange.event;
    }
    async setFileIconTheme(iconThemeOrId, settingsTarget) {
        return this.fileIconThemeSequencer.queue(async () => {
            return this.internalSetFileIconTheme(iconThemeOrId, settingsTarget);
        });
    }
    async internalSetFileIconTheme(iconThemeOrId, settingsTarget) {
        if (iconThemeOrId === undefined) {
            iconThemeOrId = '';
        }
        const themeId = types.isString(iconThemeOrId) ? iconThemeOrId : iconThemeOrId.id;
        if (themeId !== this.currentFileIconTheme.id || !this.currentFileIconTheme.isLoaded) {
            let newThemeData = this.fileIconThemeRegistry.findThemeById(themeId);
            if (!newThemeData && iconThemeOrId instanceof FileIconThemeData) {
                newThemeData = iconThemeOrId;
            }
            if (!newThemeData) {
                newThemeData = FileIconThemeData.noIconTheme;
            }
            await newThemeData.ensureLoaded(this.fileIconThemeLoader);
            this.applyAndSetFileIconTheme(newThemeData); // updates this.currentFileIconTheme
        }
        const themeData = this.currentFileIconTheme;
        // remember theme data for a quick restore
        if (themeData.isLoaded &&
            settingsTarget !== 'preview' &&
            (!themeData.location || !getRemoteAuthority(themeData.location))) {
            themeData.toStorage(this.storageService);
        }
        await this.settings.setFileIconTheme(this.currentFileIconTheme, settingsTarget);
        return themeData;
    }
    async getMarketplaceFileIconThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.fileIconThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    async reloadCurrentFileIconTheme() {
        return this.fileIconThemeSequencer.queue(async () => {
            await this.currentFileIconTheme.reload(this.fileIconThemeLoader);
            this.applyAndSetFileIconTheme(this.currentFileIconTheme);
        });
    }
    async restoreFileIconTheme() {
        return this.fileIconThemeSequencer.queue(async () => {
            const settingId = this.settings.fileIconTheme;
            const theme = this.fileIconThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentFileIconTheme.settingsId) {
                    await this.internalSetFileIconTheme(theme.id, undefined);
                }
                else if (theme !== this.currentFileIconTheme) {
                    await theme.ensureLoaded(this.fileIconThemeLoader);
                    this.applyAndSetFileIconTheme(theme, true);
                }
                return true;
            }
            return false;
        });
    }
    applyAndSetFileIconTheme(iconThemeData, silent = false) {
        this.currentFileIconTheme = iconThemeData;
        _applyRules(iconThemeData.styleSheetContent, fileIconThemeRulesClassName);
        if (iconThemeData.id) {
            this.container.classList.add(fileIconsEnabledClass);
        }
        else {
            this.container.classList.remove(fileIconsEnabledClass);
        }
        this.fileIconThemeWatcher.update(iconThemeData);
        if (iconThemeData.id) {
            this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'fileIcon');
        }
        if (!silent) {
            this.onFileIconThemeChange.fire(this.currentFileIconTheme);
        }
    }
    async getProductIconThemes() {
        return this.productIconThemeRegistry.getThemes();
    }
    getProductIconTheme() {
        return this.currentProductIconTheme;
    }
    get onDidProductIconThemeChange() {
        return this.onProductIconThemeChange.event;
    }
    async setProductIconTheme(iconThemeOrId, settingsTarget) {
        return this.productIconThemeSequencer.queue(async () => {
            return this.internalSetProductIconTheme(iconThemeOrId, settingsTarget);
        });
    }
    async internalSetProductIconTheme(iconThemeOrId, settingsTarget) {
        if (iconThemeOrId === undefined) {
            iconThemeOrId = '';
        }
        const themeId = types.isString(iconThemeOrId) ? iconThemeOrId : iconThemeOrId.id;
        if (themeId !== this.currentProductIconTheme.id || !this.currentProductIconTheme.isLoaded) {
            let newThemeData = this.productIconThemeRegistry.findThemeById(themeId);
            if (!newThemeData && iconThemeOrId instanceof ProductIconThemeData) {
                newThemeData = iconThemeOrId;
            }
            if (!newThemeData) {
                newThemeData = ProductIconThemeData.defaultTheme;
            }
            await newThemeData.ensureLoaded(this.extensionResourceLoaderService, this.logService);
            this.applyAndSetProductIconTheme(newThemeData); // updates this.currentProductIconTheme
        }
        const themeData = this.currentProductIconTheme;
        // remember theme data for a quick restore
        if (themeData.isLoaded &&
            settingsTarget !== 'preview' &&
            (!themeData.location || !getRemoteAuthority(themeData.location))) {
            themeData.toStorage(this.storageService);
        }
        await this.settings.setProductIconTheme(this.currentProductIconTheme, settingsTarget);
        return themeData;
    }
    async getMarketplaceProductIconThemes(publisher, name, version) {
        const extensionLocation = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({ publisher, name, version }, 'extension');
        if (extensionLocation) {
            try {
                const manifestContent = await this.extensionResourceLoaderService.readExtensionResource(resources.joinPath(extensionLocation, 'package.json'));
                return this.productIconThemeRegistry.getMarketplaceThemes(JSON.parse(manifestContent), extensionLocation, ExtensionData.fromName(publisher, name));
            }
            catch (e) {
                this.logService.error('Problem loading themes from marketplace', e);
            }
        }
        return [];
    }
    async reloadCurrentProductIconTheme() {
        return this.productIconThemeSequencer.queue(async () => {
            await this.currentProductIconTheme.reload(this.extensionResourceLoaderService, this.logService);
            this.applyAndSetProductIconTheme(this.currentProductIconTheme);
        });
    }
    async restoreProductIconTheme() {
        return this.productIconThemeSequencer.queue(async () => {
            const settingId = this.settings.productIconTheme;
            const theme = this.productIconThemeRegistry.findThemeBySettingsId(settingId);
            if (theme) {
                if (settingId !== this.currentProductIconTheme.settingsId) {
                    await this.internalSetProductIconTheme(theme.id, undefined);
                }
                else if (theme !== this.currentProductIconTheme) {
                    await theme.ensureLoaded(this.extensionResourceLoaderService, this.logService);
                    this.applyAndSetProductIconTheme(theme, true);
                }
                return true;
            }
            return false;
        });
    }
    applyAndSetProductIconTheme(iconThemeData, silent = false) {
        this.currentProductIconTheme = iconThemeData;
        _applyRules(iconThemeData.styleSheetContent, productIconThemeRulesClassName);
        this.productIconThemeWatcher.update(iconThemeData);
        if (iconThemeData.id) {
            this.sendTelemetry(iconThemeData.id, iconThemeData.extensionData, 'productIcon');
        }
        if (!silent) {
            this.onProductIconThemeChange.fire(this.currentProductIconTheme);
        }
    }
};
WorkbenchThemeService = __decorate([
    __param(0, IExtensionService),
    __param(1, IStorageService),
    __param(2, IConfigurationService),
    __param(3, ITelemetryService),
    __param(4, IBrowserWorkbenchEnvironmentService),
    __param(5, IFileService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IWorkbenchLayoutService),
    __param(8, ILogService),
    __param(9, IHostColorSchemeService),
    __param(10, IUserDataInitializationService),
    __param(11, ILanguageService)
], WorkbenchThemeService);
export { WorkbenchThemeService };
class ThemeFileWatcher {
    constructor(fileService, environmentService, onUpdate) {
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.onUpdate = onUpdate;
    }
    update(theme) {
        if (!resources.isEqual(theme.location, this.watchedLocation)) {
            this.dispose();
            if (theme.location && (theme.watch || this.environmentService.isExtensionDevelopment)) {
                this.watchedLocation = theme.location;
                this.watcherDisposable = this.fileService.watch(theme.location);
                this.fileService.onDidFilesChange((e) => {
                    if (this.watchedLocation && e.contains(this.watchedLocation, 0 /* FileChangeType.UPDATED */)) {
                        this.onUpdate();
                    }
                });
            }
        }
    }
    dispose() {
        this.watcherDisposable = dispose(this.watcherDisposable);
        this.fileChangeListener = dispose(this.fileChangeListener);
        this.watchedLocation = undefined;
    }
}
function _applyRules(styleSheetContent, rulesClassName) {
    const themeStyles = mainWindow.document.head.getElementsByClassName(rulesClassName);
    if (themeStyles.length === 0) {
        const elStyle = createStyleSheet();
        elStyle.className = rulesClassName;
        elStyle.textContent = styleSheetContent;
    }
    else {
        ;
        themeStyles[0].textContent = styleSheetContent;
    }
}
registerColorThemeSchemas();
registerFileIconThemeSchemas();
registerProductIconThemeSchemas();
// The WorkbenchThemeService should stay eager as the constructor restores the
// last used colors / icons from storage. This needs to happen as quickly as possible
// for a flicker-free startup experience.
registerSingleton(IWorkbenchThemeService, WorkbenchThemeService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoVGhlbWVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9icm93c2VyL3dvcmtiZW5jaFRoZW1lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUNOLHNCQUFzQixFQUd0QixhQUFhLEVBQ2IsYUFBYSxFQUdiLG9CQUFvQixFQUNwQiwrQkFBK0IsRUFDL0IsZ0NBQWdDLEdBQ2hDLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUVOLFVBQVUsSUFBSSxpQkFBaUIsR0FFL0IsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0UsT0FBTyxFQUFlLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxz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