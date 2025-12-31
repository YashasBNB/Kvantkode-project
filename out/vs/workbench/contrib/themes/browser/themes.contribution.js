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
import { localize, localize2 } from '../../../../nls.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { MenuRegistry, MenuId, Action2, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchThemeService, ThemeSettings, } from '../../../services/themes/common/workbenchThemeService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IExtensionGalleryService, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Extensions as ColorRegistryExtensions, } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Color } from '../../../../base/common/color.js';
import { ColorScheme, isHighContrast } from '../../../../platform/theme/common/theme.js';
import { colorThemeSchemaId } from '../../../services/themes/common/colorThemeSchema.js';
import { isCancellationError, onUnexpectedError } from '../../../../base/common/errors.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { DEFAULT_PRODUCT_ICON_THEME_ID, ProductIconThemeData, } from '../../../services/themes/browser/productIconThemeData.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Emitter } from '../../../../base/common/event.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { FileIconThemeData } from '../../../services/themes/browser/fileIconThemeData.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export const manageExtensionIcon = registerIcon('theme-selection-manage-extension', Codicon.gear, localize('manageExtensionIcon', "Icon for the 'Manage' action in the theme selection quick pick."));
var ConfigureItem;
(function (ConfigureItem) {
    ConfigureItem["BROWSE_GALLERY"] = "marketplace";
    ConfigureItem["EXTENSIONS_VIEW"] = "extensions";
    ConfigureItem["CUSTOM_TOP_ENTRY"] = "customTopEntry";
})(ConfigureItem || (ConfigureItem = {}));
let MarketplaceThemesPicker = class MarketplaceThemesPicker {
    constructor(getMarketplaceColorThemes, marketplaceQuery, extensionGalleryService, extensionManagementService, quickInputService, logService, progressService, extensionsWorkbenchService, dialogService) {
        this.getMarketplaceColorThemes = getMarketplaceColorThemes;
        this.marketplaceQuery = marketplaceQuery;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionManagementService = extensionManagementService;
        this.quickInputService = quickInputService;
        this.logService = logService;
        this.progressService = progressService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.dialogService = dialogService;
        this._marketplaceExtensions = new Set();
        this._marketplaceThemes = [];
        this._searchOngoing = false;
        this._searchError = undefined;
        this._onDidChange = new Emitter();
        this._queryDelayer = new ThrottledDelayer(200);
        this._installedExtensions = extensionManagementService.getInstalled().then((installed) => {
            const result = new Set();
            for (const ext of installed) {
                result.add(ext.identifier.id);
            }
            return result;
        });
    }
    get themes() {
        return this._marketplaceThemes;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    trigger(value) {
        if (this._tokenSource) {
            this._tokenSource.cancel();
            this._tokenSource = undefined;
        }
        this._queryDelayer.trigger(() => {
            this._tokenSource = new CancellationTokenSource();
            return this.doSearch(value, this._tokenSource.token);
        });
    }
    async doSearch(value, token) {
        this._searchOngoing = true;
        this._onDidChange.fire();
        try {
            const installedExtensions = await this._installedExtensions;
            const options = { text: `${this.marketplaceQuery} ${value}`, pageSize: 20 };
            const pager = await this.extensionGalleryService.query(options, token);
            for (let i = 0; i < pager.total && i < 1; i++) {
                // loading multiple pages is turned of for now to avoid flickering
                if (token.isCancellationRequested) {
                    break;
                }
                const nThemes = this._marketplaceThemes.length;
                const gallery = i === 0 ? pager.firstPage : await pager.getPage(i, token);
                const promises = [];
                const promisesGalleries = [];
                for (let i = 0; i < gallery.length; i++) {
                    if (token.isCancellationRequested) {
                        break;
                    }
                    const ext = gallery[i];
                    if (!installedExtensions.has(ext.identifier.id) &&
                        !this._marketplaceExtensions.has(ext.identifier.id)) {
                        this._marketplaceExtensions.add(ext.identifier.id);
                        promises.push(this.getMarketplaceColorThemes(ext.publisher, ext.name, ext.version));
                        promisesGalleries.push(ext);
                    }
                }
                const allThemes = await Promise.all(promises);
                for (let i = 0; i < allThemes.length; i++) {
                    const ext = promisesGalleries[i];
                    for (const theme of allThemes[i]) {
                        this._marketplaceThemes.push({
                            id: theme.id,
                            theme: theme,
                            label: theme.label,
                            description: `${ext.displayName} · ${ext.publisherDisplayName}`,
                            galleryExtension: ext,
                            buttons: [configureButton],
                        });
                    }
                }
                if (nThemes !== this._marketplaceThemes.length) {
                    this._marketplaceThemes.sort((t1, t2) => t1.label.localeCompare(t2.label));
                    this._onDidChange.fire();
                }
            }
        }
        catch (e) {
            if (!isCancellationError(e)) {
                this.logService.error(`Error while searching for themes:`, e);
                this._searchError = 'message' in e ? e.message : String(e);
            }
        }
        finally {
            this._searchOngoing = false;
            this._onDidChange.fire();
        }
    }
    openQuickPick(value, currentTheme, selectTheme) {
        let result = undefined;
        const disposables = new DisposableStore();
        return new Promise((s, _) => {
            const quickpick = disposables.add(this.quickInputService.createQuickPick());
            quickpick.items = [];
            quickpick.sortByLabel = false;
            quickpick.matchOnDescription = true;
            quickpick.buttons = [this.quickInputService.backButton];
            quickpick.title = 'Marketplace Themes';
            quickpick.placeholder = localize('themes.selectMarketplaceTheme', 'Type to Search More. Select to Install. Up/Down Keys to Preview');
            quickpick.canSelectMany = false;
            disposables.add(quickpick.onDidChangeValue(() => this.trigger(quickpick.value)));
            disposables.add(quickpick.onDidAccept(async (_) => {
                const themeItem = quickpick.selectedItems[0];
                if (themeItem?.galleryExtension) {
                    result = 'selected';
                    quickpick.hide();
                    const success = await this.installExtension(themeItem.galleryExtension);
                    if (success) {
                        selectTheme(themeItem.theme, true);
                    }
                    else {
                        selectTheme(currentTheme, true);
                    }
                }
            }));
            disposables.add(quickpick.onDidTriggerItemButton((e) => {
                if (isItem(e.item)) {
                    const extensionId = e.item.theme?.extensionData?.extensionId;
                    if (extensionId) {
                        this.extensionsWorkbenchService.openSearch(`@id:${extensionId}`);
                    }
                    else {
                        this.extensionsWorkbenchService.openSearch(`${this.marketplaceQuery} ${quickpick.value}`);
                    }
                }
            }));
            disposables.add(quickpick.onDidChangeActive((themes) => {
                if (result === undefined) {
                    selectTheme(themes[0]?.theme, false);
                }
            }));
            disposables.add(quickpick.onDidHide(() => {
                if (result === undefined) {
                    selectTheme(currentTheme, true);
                    result = 'cancelled';
                }
                s(result);
            }));
            disposables.add(quickpick.onDidTriggerButton((e) => {
                if (e === this.quickInputService.backButton) {
                    result = 'back';
                    quickpick.hide();
                }
            }));
            disposables.add(this.onDidChange(() => {
                let items = this.themes;
                if (this._searchOngoing) {
                    items = items.concat({
                        label: '$(loading~spin) Searching for themes...',
                        id: undefined,
                        alwaysShow: true,
                    });
                }
                else if (items.length === 0 && this._searchError) {
                    items = [
                        {
                            label: `$(error) ${localize('search.error', 'Error while searching for themes: {0}', this._searchError)}`,
                            id: undefined,
                            alwaysShow: true,
                        },
                    ];
                }
                const activeItemId = quickpick.activeItems[0]?.id;
                const newActiveItem = activeItemId
                    ? items.find((i) => isItem(i) && i.id === activeItemId)
                    : undefined;
                quickpick.items = items;
                if (newActiveItem) {
                    quickpick.activeItems = [newActiveItem];
                }
            }));
            this.trigger(value);
            quickpick.show();
        }).finally(() => {
            disposables.dispose();
        });
    }
    async installExtension(galleryExtension) {
        this.extensionsWorkbenchService.openSearch(`@id:${galleryExtension.identifier.id}`);
        const result = await this.dialogService.confirm({
            message: localize('installExtension.confirm', "This will install extension '{0}' published by '{1}'. Do you want to continue?", galleryExtension.displayName, galleryExtension.publisherDisplayName),
            primaryButton: localize('installExtension.button.ok', 'OK'),
        });
        if (!result.confirmed) {
            return false;
        }
        try {
            await this.progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: localize('installing extensions', 'Installing Extension {0}...', galleryExtension.displayName),
            }, async () => {
                await this.extensionManagementService.installFromGallery(galleryExtension, {
                    // Setting this to false is how you get the extension to be synced with Settings Sync (if enabled).
                    isMachineScoped: false,
                });
            });
            return true;
        }
        catch (e) {
            this.logService.error(`Problem installing extension ${galleryExtension.identifier.id}`, e);
            return false;
        }
    }
    dispose() {
        if (this._tokenSource) {
            this._tokenSource.cancel();
            this._tokenSource = undefined;
        }
        this._queryDelayer.dispose();
        this._marketplaceExtensions.clear();
        this._marketplaceThemes.length = 0;
    }
};
MarketplaceThemesPicker = __decorate([
    __param(2, IExtensionGalleryService),
    __param(3, IExtensionManagementService),
    __param(4, IQuickInputService),
    __param(5, ILogService),
    __param(6, IProgressService),
    __param(7, IExtensionsWorkbenchService),
    __param(8, IDialogService)
], MarketplaceThemesPicker);
let InstalledThemesPicker = class InstalledThemesPicker {
    constructor(options, setTheme, getMarketplaceColorThemes, quickInputService, extensionGalleryService, extensionsWorkbenchService, extensionResourceLoaderService, instantiationService) {
        this.options = options;
        this.setTheme = setTheme;
        this.getMarketplaceColorThemes = getMarketplaceColorThemes;
        this.quickInputService = quickInputService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.instantiationService = instantiationService;
    }
    async openQuickPick(picks, currentTheme) {
        let marketplaceThemePicker;
        if (this.extensionGalleryService.isEnabled()) {
            if ((await this.extensionResourceLoaderService.supportsExtensionGalleryResources()) &&
                this.options.browseMessage) {
                marketplaceThemePicker = this.instantiationService.createInstance(MarketplaceThemesPicker, this.getMarketplaceColorThemes.bind(this), this.options.marketplaceTag);
                picks = [
                    configurationEntry(this.options.browseMessage, ConfigureItem.BROWSE_GALLERY),
                    ...picks,
                ];
            }
            else {
                picks = [
                    ...picks,
                    { type: 'separator' },
                    configurationEntry(this.options.installMessage, ConfigureItem.EXTENSIONS_VIEW),
                ];
            }
        }
        let selectThemeTimeout;
        const selectTheme = (theme, applyTheme) => {
            if (selectThemeTimeout) {
                clearTimeout(selectThemeTimeout);
            }
            selectThemeTimeout = mainWindow.setTimeout(() => {
                selectThemeTimeout = undefined;
                const newTheme = (theme ?? currentTheme);
                this.setTheme(newTheme, applyTheme ? 'auto' : 'preview').then(undefined, (err) => {
                    onUnexpectedError(err);
                    this.setTheme(currentTheme, undefined);
                });
            }, applyTheme ? 0 : 200);
        };
        const pickInstalledThemes = (activeItemId) => {
            const disposables = new DisposableStore();
            return new Promise((s, _) => {
                let isCompleted = false;
                const autoFocusIndex = picks.findIndex((p) => isItem(p) && p.id === activeItemId);
                const quickpick = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
                quickpick.items = picks;
                quickpick.title = this.options.title;
                quickpick.description = this.options.description;
                quickpick.placeholder = this.options.placeholderMessage;
                quickpick.activeItems = [picks[autoFocusIndex]];
                quickpick.canSelectMany = false;
                quickpick.toggles = this.options.toggles;
                quickpick.toggles?.forEach((toggle) => {
                    disposables.add(toggle.onChange(() => this.options.onToggle?.(toggle, quickpick)));
                });
                quickpick.matchOnDescription = true;
                disposables.add(quickpick.onDidAccept(async (_) => {
                    isCompleted = true;
                    const theme = quickpick.selectedItems[0];
                    if (!theme || theme.configureItem) {
                        // 'pick in marketplace' entry
                        if (!theme || theme.configureItem === ConfigureItem.EXTENSIONS_VIEW) {
                            this.extensionsWorkbenchService.openSearch(`${this.options.marketplaceTag} ${quickpick.value}`);
                        }
                        else if (theme.configureItem === ConfigureItem.BROWSE_GALLERY) {
                            if (marketplaceThemePicker) {
                                const res = await marketplaceThemePicker.openQuickPick(quickpick.value, currentTheme, selectTheme);
                                if (res === 'back') {
                                    await pickInstalledThemes(undefined);
                                }
                            }
                        }
                    }
                    else {
                        selectTheme(theme.theme, true);
                    }
                    quickpick.hide();
                    s();
                }));
                disposables.add(quickpick.onDidChangeActive((themes) => selectTheme(themes[0]?.theme, false)));
                disposables.add(quickpick.onDidHide(() => {
                    if (!isCompleted) {
                        selectTheme(currentTheme, true);
                        s();
                    }
                    quickpick.dispose();
                }));
                disposables.add(quickpick.onDidTriggerItemButton((e) => {
                    if (isItem(e.item)) {
                        const extensionId = e.item.theme?.extensionData?.extensionId;
                        if (extensionId) {
                            this.extensionsWorkbenchService.openSearch(`@id:${extensionId}`);
                        }
                        else {
                            this.extensionsWorkbenchService.openSearch(`${this.options.marketplaceTag} ${quickpick.value}`);
                        }
                    }
                }));
                quickpick.show();
            }).finally(() => {
                disposables.dispose();
            });
        };
        await pickInstalledThemes(currentTheme.id);
        marketplaceThemePicker?.dispose();
    }
};
InstalledThemesPicker = __decorate([
    __param(3, IQuickInputService),
    __param(4, IExtensionGalleryService),
    __param(5, IExtensionsWorkbenchService),
    __param(6, IExtensionResourceLoaderService),
    __param(7, IInstantiationService)
], InstalledThemesPicker);
const SelectColorThemeCommandId = 'workbench.action.selectTheme';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectColorThemeCommandId,
            title: localize2('selectTheme.label', 'Color Theme'),
            category: Categories.Preferences,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 50 /* KeyCode.KeyT */),
            },
        });
    }
    getTitle(colorScheme) {
        switch (colorScheme) {
            case ColorScheme.DARK:
                return localize('themes.selectTheme.darkScheme', 'Select Color Theme for System Dark Mode');
            case ColorScheme.LIGHT:
                return localize('themes.selectTheme.lightScheme', 'Select Color Theme for System Light Mode');
            case ColorScheme.HIGH_CONTRAST_DARK:
                return localize('themes.selectTheme.darkHC', 'Select Color Theme for High Contrast Dark Mode');
            case ColorScheme.HIGH_CONTRAST_LIGHT:
                return localize('themes.selectTheme.lightHC', 'Select Color Theme for High Contrast Light Mode');
            default:
                return localize('themes.selectTheme.default', 'Select Color Theme (detect system color mode disabled)');
        }
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const preferencesService = accessor.get(IPreferencesService);
        const preferredColorScheme = themeService.getPreferredColorScheme();
        let modeConfigureToggle;
        if (preferredColorScheme) {
            modeConfigureToggle = new Toggle({
                title: localize('themes.configure.switchingEnabled', 'Detect system color mode enabled. Click to configure.'),
                icon: Codicon.colorMode,
                isChecked: false,
                ...defaultToggleStyles,
            });
        }
        else {
            modeConfigureToggle = new Toggle({
                title: localize('themes.configure.switchingDisabled', 'Detect system color mode disabled. Click to configure.'),
                icon: Codicon.colorMode,
                isChecked: false,
                ...defaultToggleStyles,
            });
        }
        const options = {
            installMessage: localize('installColorThemes', 'Install Additional Color Themes...'),
            browseMessage: '$(plus) ' + localize('browseColorThemes', 'Browse Additional Color Themes...'),
            placeholderMessage: this.getTitle(preferredColorScheme),
            marketplaceTag: 'category:themes',
            toggles: [modeConfigureToggle],
            onToggle: async (toggle, picker) => {
                picker.hide();
                await preferencesService.openSettings({ query: ThemeSettings.DETECT_COLOR_SCHEME });
            },
        };
        const setTheme = (theme, settingsTarget) => themeService.setColorTheme(theme, settingsTarget);
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceColorThemes(publisher, name, version);
        const instantiationService = accessor.get(IInstantiationService);
        const picker = instantiationService.createInstance(InstalledThemesPicker, options, setTheme, getMarketplaceColorThemes);
        const themes = await themeService.getColorThemes();
        const currentTheme = themeService.getColorTheme();
        const lightEntries = toEntries(themes.filter((t) => t.type === ColorScheme.LIGHT), localize('themes.category.light', 'light themes'));
        const darkEntries = toEntries(themes.filter((t) => t.type === ColorScheme.DARK), localize('themes.category.dark', 'dark themes'));
        const hcEntries = toEntries(themes.filter((t) => isHighContrast(t.type)), localize('themes.category.hc', 'high contrast themes'));
        let picks;
        switch (preferredColorScheme) {
            case ColorScheme.DARK:
                picks = [...darkEntries, ...lightEntries, ...hcEntries];
                break;
            case ColorScheme.HIGH_CONTRAST_DARK:
            case ColorScheme.HIGH_CONTRAST_LIGHT:
                picks = [...hcEntries, ...lightEntries, ...darkEntries];
                break;
            case ColorScheme.LIGHT:
            default:
                picks = [...lightEntries, ...darkEntries, ...hcEntries];
                break;
        }
        await picker.openQuickPick(picks, currentTheme);
    }
});
const SelectFileIconThemeCommandId = 'workbench.action.selectIconTheme';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectFileIconThemeCommandId,
            title: localize2('selectIconTheme.label', 'File Icon Theme'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const options = {
            installMessage: localize('installIconThemes', 'Install Additional File Icon Themes...'),
            placeholderMessage: localize('themes.selectIconTheme', 'Select File Icon Theme (Up/Down Keys to Preview)'),
            marketplaceTag: 'tag:icon-theme',
        };
        const setTheme = (theme, settingsTarget) => themeService.setFileIconTheme(theme, settingsTarget);
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceFileIconThemes(publisher, name, version);
        const instantiationService = accessor.get(IInstantiationService);
        const picker = instantiationService.createInstance(InstalledThemesPicker, options, setTheme, getMarketplaceColorThemes);
        const picks = [
            { type: 'separator', label: localize('fileIconThemeCategory', 'file icon themes') },
            {
                id: '',
                theme: FileIconThemeData.noIconTheme,
                label: localize('noIconThemeLabel', 'None'),
                description: localize('noIconThemeDesc', 'Disable File Icons'),
            },
            ...toEntries(await themeService.getFileIconThemes()),
        ];
        await picker.openQuickPick(picks, themeService.getFileIconTheme());
    }
});
const SelectProductIconThemeCommandId = 'workbench.action.selectProductIconTheme';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: SelectProductIconThemeCommandId,
            title: localize2('selectProductIconTheme.label', 'Product Icon Theme'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const options = {
            installMessage: localize('installProductIconThemes', 'Install Additional Product Icon Themes...'),
            browseMessage: '$(plus) ' +
                localize('browseProductIconThemes', 'Browse Additional Product Icon Themes...'),
            placeholderMessage: localize('themes.selectProductIconTheme', 'Select Product Icon Theme (Up/Down Keys to Preview)'),
            marketplaceTag: 'tag:product-icon-theme',
        };
        const setTheme = (theme, settingsTarget) => themeService.setProductIconTheme(theme, settingsTarget);
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceProductIconThemes(publisher, name, version);
        const instantiationService = accessor.get(IInstantiationService);
        const picker = instantiationService.createInstance(InstalledThemesPicker, options, setTheme, getMarketplaceColorThemes);
        const picks = [
            { type: 'separator', label: localize('productIconThemeCategory', 'product icon themes') },
            {
                id: DEFAULT_PRODUCT_ICON_THEME_ID,
                theme: ProductIconThemeData.defaultTheme,
                label: localize('defaultProductIconThemeLabel', 'Default'),
            },
            ...toEntries(await themeService.getProductIconThemes()),
        ];
        await picker.openQuickPick(picks, themeService.getProductIconTheme());
    }
});
CommandsRegistry.registerCommand('workbench.action.previewColorTheme', async function (accessor, extension, themeSettingsId) {
    const themeService = accessor.get(IWorkbenchThemeService);
    let themes = findBuiltInThemes(await themeService.getColorThemes(), extension);
    if (themes.length === 0) {
        themes = await themeService.getMarketplaceColorThemes(extension.publisher, extension.name, extension.version);
    }
    for (const theme of themes) {
        if (!themeSettingsId || theme.settingsId === themeSettingsId) {
            await themeService.setColorTheme(theme, 'preview');
            return theme.settingsId;
        }
    }
    return undefined;
});
function findBuiltInThemes(themes, extension) {
    return themes.filter(({ extensionData }) => extensionData &&
        extensionData.extensionIsBuiltin &&
        equalsIgnoreCase(extensionData.extensionPublisher, extension.publisher) &&
        equalsIgnoreCase(extensionData.extensionName, extension.name));
}
function configurationEntry(label, configureItem) {
    return {
        id: undefined,
        label: label,
        alwaysShow: true,
        buttons: [configureButton],
        configureItem: configureItem,
    };
}
function isItem(i) {
    return i['type'] !== 'separator';
}
function toEntry(theme) {
    const settingId = theme.settingsId ?? undefined;
    const item = {
        id: theme.id,
        theme: theme,
        label: theme.label,
        description: theme.description || (theme.label === settingId ? undefined : settingId),
    };
    if (theme.extensionData) {
        item.buttons = [configureButton];
    }
    return item;
}
function toEntries(themes, label) {
    const sorter = (t1, t2) => t1.label.localeCompare(t2.label);
    const entries = themes.map(toEntry).sort(sorter);
    if (entries.length > 0 && label) {
        entries.unshift({ type: 'separator', label });
    }
    return entries;
}
const configureButton = {
    iconClass: ThemeIcon.asClassName(manageExtensionIcon),
    tooltip: localize('manage extension', 'Manage Extension'),
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.generateColorTheme',
            title: localize2('generateColorTheme.label', 'Generate Color Theme From Current Settings'),
            category: Categories.Developer,
            f1: true,
        });
    }
    run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const theme = themeService.getColorTheme();
        const colors = Registry.as(ColorRegistryExtensions.ColorContribution).getColors();
        const colorIds = colors
            .filter((c) => !c.deprecationMessage)
            .map((c) => c.id)
            .sort();
        const resultingColors = {};
        const inherited = [];
        for (const colorId of colorIds) {
            const color = theme.getColor(colorId, false);
            if (color) {
                resultingColors[colorId] = Color.Format.CSS.formatHexA(color, true);
            }
            else {
                inherited.push(colorId);
            }
        }
        const nullDefaults = [];
        for (const id of inherited) {
            const color = theme.getColor(id);
            if (color) {
                resultingColors['__' + id] = Color.Format.CSS.formatHexA(color, true);
            }
            else {
                nullDefaults.push(id);
            }
        }
        for (const id of nullDefaults) {
            resultingColors['__' + id] = null;
        }
        let contents = JSON.stringify({
            $schema: colorThemeSchemaId,
            type: theme.type,
            colors: resultingColors,
            tokenColors: theme.tokenColors.filter((t) => !!t.scope),
        }, null, '\t');
        contents = contents.replace(/\"__/g, '//"');
        const editorService = accessor.get(IEditorService);
        return editorService.openEditor({
            resource: undefined,
            contents,
            languageId: 'jsonc',
            options: { pinned: true },
        });
    }
});
const toggleLightDarkThemesCommandId = 'workbench.action.toggleLightDarkThemes';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: toggleLightDarkThemesCommandId,
            title: localize2('toggleLightDarkThemes.label', 'Toggle between Light/Dark Themes'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const themeService = accessor.get(IWorkbenchThemeService);
        const configurationService = accessor.get(IConfigurationService);
        const notificationService = accessor.get(INotificationService);
        const preferencesService = accessor.get(IPreferencesService);
        if (configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            const message = localize({ key: 'cannotToggle', comment: ['{0} is a setting name'] }, 'Cannot toggle between light and dark themes when `{0}` is enabled in settings.', ThemeSettings.DETECT_COLOR_SCHEME);
            notificationService.prompt(Severity.Info, message, [
                {
                    label: localize('goToSetting', 'Open Settings'),
                    run: () => {
                        return preferencesService.openUserSettings({
                            query: ThemeSettings.DETECT_COLOR_SCHEME,
                        });
                    },
                },
            ]);
            return;
        }
        const currentTheme = themeService.getColorTheme();
        let newSettingsId = ThemeSettings.PREFERRED_DARK_THEME;
        switch (currentTheme.type) {
            case ColorScheme.LIGHT:
                newSettingsId = ThemeSettings.PREFERRED_DARK_THEME;
                break;
            case ColorScheme.DARK:
                newSettingsId = ThemeSettings.PREFERRED_LIGHT_THEME;
                break;
            case ColorScheme.HIGH_CONTRAST_LIGHT:
                newSettingsId = ThemeSettings.PREFERRED_HC_DARK_THEME;
                break;
            case ColorScheme.HIGH_CONTRAST_DARK:
                newSettingsId = ThemeSettings.PREFERRED_HC_LIGHT_THEME;
                break;
        }
        const themeSettingId = configurationService.getValue(newSettingsId);
        if (themeSettingId && typeof themeSettingId === 'string') {
            const theme = (await themeService.getColorThemes()).find((t) => t.settingsId === themeSettingId);
            if (theme) {
                themeService.setColorTheme(theme.id, 'auto');
            }
        }
    }
});
const browseColorThemesInMarketplaceCommandId = 'workbench.action.browseColorThemesInMarketplace';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: browseColorThemesInMarketplaceCommandId,
            title: localize2('browseColorThemeInMarketPlace.label', 'Browse Color Themes in Marketplace'),
            category: Categories.Preferences,
            f1: true,
        });
    }
    async run(accessor) {
        const marketplaceTag = 'category:themes';
        const themeService = accessor.get(IWorkbenchThemeService);
        const extensionGalleryService = accessor.get(IExtensionGalleryService);
        const extensionResourceLoaderService = accessor.get(IExtensionResourceLoaderService);
        const instantiationService = accessor.get(IInstantiationService);
        if (!extensionGalleryService.isEnabled() ||
            !(await extensionResourceLoaderService.supportsExtensionGalleryResources())) {
            return;
        }
        const currentTheme = themeService.getColorTheme();
        const getMarketplaceColorThemes = (publisher, name, version) => themeService.getMarketplaceColorThemes(publisher, name, version);
        let selectThemeTimeout;
        const selectTheme = (theme, applyTheme) => {
            if (selectThemeTimeout) {
                clearTimeout(selectThemeTimeout);
            }
            selectThemeTimeout = mainWindow.setTimeout(() => {
                selectThemeTimeout = undefined;
                const newTheme = (theme ?? currentTheme);
                themeService
                    .setColorTheme(newTheme, applyTheme ? 'auto' : 'preview')
                    .then(undefined, (err) => {
                    onUnexpectedError(err);
                    themeService.setColorTheme(currentTheme, undefined);
                });
            }, applyTheme ? 0 : 200);
        };
        const marketplaceThemePicker = instantiationService.createInstance(MarketplaceThemesPicker, getMarketplaceColorThemes, marketplaceTag);
        await marketplaceThemePicker
            .openQuickPick('', themeService.getColorTheme(), selectTheme)
            .then(undefined, onUnexpectedError);
    }
});
const ThemesSubMenu = new MenuId('ThemesSubMenu');
MenuRegistry.appendMenuItem(MenuId.GlobalActivity, {
    title: localize('themes', 'Themes'),
    submenu: ThemesSubMenu,
    group: '2_configuration',
    order: 7,
});
MenuRegistry.appendMenuItem(MenuId.MenubarPreferencesMenu, {
    title: localize({ key: 'miSelectTheme', comment: ['&& denotes a mnemonic'] }, '&&Themes'),
    submenu: ThemesSubMenu,
    group: '2_configuration',
    order: 7,
});
MenuRegistry.appendMenuItem(ThemesSubMenu, {
    command: {
        id: SelectColorThemeCommandId,
        title: localize('selectTheme.label', 'Color Theme'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(ThemesSubMenu, {
    command: {
        id: SelectFileIconThemeCommandId,
        title: localize('themes.selectIconTheme.label', 'File Icon Theme'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(ThemesSubMenu, {
    command: {
        id: SelectProductIconThemeCommandId,
        title: localize('themes.selectProductIconTheme.label', 'Product Icon Theme'),
    },
    order: 3,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3RoZW1lcy9icm93c2VyL3RoZW1lcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQVUsUUFBUSxFQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDL0UsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBQ04sT0FBTyxFQUNQLGVBQWUsR0FFZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUNOLHNCQUFzQixFQU10QixhQUFhLEdBQ2IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDJCQUEyQixHQUUzQixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxrQkFB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