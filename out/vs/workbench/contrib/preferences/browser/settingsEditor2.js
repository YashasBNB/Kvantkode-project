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
var SettingsEditor2_1;
import * as DOM from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Action } from '../../../../base/common/actions.js';
import { Delayer, raceTimeout } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { fromNow } from '../../../../base/common/date.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import './media/settingsEditor2.css';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { asCssVariable, badgeBackground, badgeForeground, contrastBorder, editorForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IUserDataSyncEnablementService, IUserDataSyncService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { SuggestEnabledInput } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { SettingsTargetsWidget } from './preferencesWidgets.js';
import { getCommonlyUsedData, tocData } from './settingsLayout.js';
import { AbstractSettingRenderer, resolveConfiguredUntrustedSettings, createTocTreeForExtensionSettings, resolveSettingsTree, SettingsTree, SettingTreeRenderers, } from './settingsTree.js';
import { parseQuery, SearchResultModel, SettingsTreeGroupElement, SettingsTreeModel, SettingsTreeSettingElement, } from './settingsTreeModels.js';
import { createTOCIterator, TOCTree, TOCTreeModel } from './tocTree.js';
import { CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_ROW_FOCUS, CONTEXT_SETTINGS_SEARCH_FOCUS, CONTEXT_TOC_ROW_FOCUS, ENABLE_LANGUAGE_FILTER, EXTENSION_FETCH_TIMEOUT_MS, EXTENSION_SETTING_TAG, FEATURE_SETTING_TAG, ID_SETTING_TAG, IPreferencesSearchService, LANGUAGE_SETTING_TAG, MODIFIED_SETTING_TAG, POLICY_SETTING_TAG, REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG, SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS, WORKSPACE_TRUST_SETTING_TAG, getExperimentalExtensionToggleData, } from '../common/preferences.js';
import { settingsHeaderBorder, settingsSashBorder, settingsTextInputBorder, } from '../common/settingsEditorColorRegistry.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IPreferencesService, SettingMatchType, SettingValueType, validateSettingsEditorOptions, } from '../../../services/preferences/common/preferences.js';
import { Settings2EditorModel, nullRange, } from '../../../services/preferences/common/preferencesModels.js';
import { IUserDataSyncWorkbenchService } from '../../../services/userDataSync/common/userDataSync.js';
import { preferencesClearInputIcon, preferencesFilterIcon } from './preferencesIcons.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { APPLICATION_SCOPES, IWorkbenchConfigurationService, } from '../../../services/configuration/common/configuration.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { Color } from '../../../../base/common/color.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { SettingsSearchFilterDropdownMenuActionViewItem } from './settingsSearchMenu.js';
import { IExtensionGalleryService, IExtensionManagementService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Extensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
export var SettingsFocusContext;
(function (SettingsFocusContext) {
    SettingsFocusContext[SettingsFocusContext["Search"] = 0] = "Search";
    SettingsFocusContext[SettingsFocusContext["TableOfContents"] = 1] = "TableOfContents";
    SettingsFocusContext[SettingsFocusContext["SettingTree"] = 2] = "SettingTree";
    SettingsFocusContext[SettingsFocusContext["SettingControl"] = 3] = "SettingControl";
})(SettingsFocusContext || (SettingsFocusContext = {}));
export function createGroupIterator(group) {
    return Iterable.map(group.children, (g) => {
        return {
            element: g,
            children: g instanceof SettingsTreeGroupElement ? createGroupIterator(g) : undefined,
        };
    });
}
const $ = DOM.$;
const searchBoxLabel = localize('SearchSettings.AriaLabel', 'Search settings');
const SEARCH_TOC_BEHAVIOR_KEY = 'workbench.settings.settingsSearchTocBehavior';
const SETTINGS_EDITOR_STATE_KEY = 'settingsEditorState';
let SettingsEditor2 = class SettingsEditor2 extends EditorPane {
    static { SettingsEditor2_1 = this; }
    static { this.ID = 'workbench.editor.settings2'; }
    static { this.NUM_INSTANCES = 0; }
    static { this.SEARCH_DEBOUNCE = 200; }
    static { this.SETTING_UPDATE_FAST_DEBOUNCE = 200; }
    static { this.SETTING_UPDATE_SLOW_DEBOUNCE = 1000; }
    static { this.CONFIG_SCHEMA_UPDATE_DELAYER = 500; }
    static { this.TOC_MIN_WIDTH = 100; }
    static { this.TOC_RESET_WIDTH = 200; }
    static { this.EDITOR_MIN_WIDTH = 500; }
    // Below NARROW_TOTAL_WIDTH, we only render the editor rather than the ToC.
    static { this.NARROW_TOTAL_WIDTH = this.TOC_RESET_WIDTH + this.EDITOR_MIN_WIDTH; }
    static { this.SUGGESTIONS = [
        `@${MODIFIED_SETTING_TAG}`,
        '@tag:notebookLayout',
        '@tag:notebookOutputLayout',
        `@tag:${REQUIRE_TRUSTED_WORKSPACE_SETTING_TAG}`,
        `@tag:${WORKSPACE_TRUST_SETTING_TAG}`,
        '@tag:sync',
        '@tag:usesOnlineServices',
        '@tag:telemetry',
        '@tag:accessibility',
        '@tag:preview',
        '@tag:experimental',
        `@${ID_SETTING_TAG}`,
        `@${EXTENSION_SETTING_TAG}`,
        `@${FEATURE_SETTING_TAG}scm`,
        `@${FEATURE_SETTING_TAG}explorer`,
        `@${FEATURE_SETTING_TAG}search`,
        `@${FEATURE_SETTING_TAG}debug`,
        `@${FEATURE_SETTING_TAG}extensions`,
        `@${FEATURE_SETTING_TAG}terminal`,
        `@${FEATURE_SETTING_TAG}task`,
        `@${FEATURE_SETTING_TAG}problems`,
        `@${FEATURE_SETTING_TAG}output`,
        `@${FEATURE_SETTING_TAG}comments`,
        `@${FEATURE_SETTING_TAG}remote`,
        `@${FEATURE_SETTING_TAG}timeline`,
        `@${FEATURE_SETTING_TAG}notebook`,
        `@${POLICY_SETTING_TAG}`,
    ]; }
    static shouldSettingUpdateFast(type) {
        if (Array.isArray(type)) {
            // nullable integer/number or complex
            return false;
        }
        return (type === SettingValueType.Enum ||
            type === SettingValueType.Array ||
            type === SettingValueType.BooleanObject ||
            type === SettingValueType.Object ||
            type === SettingValueType.Complex ||
            type === SettingValueType.Boolean ||
            type === SettingValueType.Exclude ||
            type === SettingValueType.Include);
    }
    constructor(group, telemetryService, configurationService, textResourceConfigurationService, themeService, preferencesService, instantiationService, preferencesSearchService, logService, contextKeyService, storageService, editorGroupService, userDataSyncWorkbenchService, userDataSyncEnablementService, workspaceTrustManagementService, extensionService, languageService, extensionManagementService, productService, extensionGalleryService, editorProgressService, userDataProfileService) {
        super(SettingsEditor2_1.ID, group, telemetryService, themeService, storageService);
        this.configurationService = configurationService;
        this.preferencesService = preferencesService;
        this.instantiationService = instantiationService;
        this.preferencesSearchService = preferencesSearchService;
        this.logService = logService;
        this.storageService = storageService;
        this.editorGroupService = editorGroupService;
        this.userDataSyncWorkbenchService = userDataSyncWorkbenchService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.extensionService = extensionService;
        this.languageService = languageService;
        this.extensionManagementService = extensionManagementService;
        this.productService = productService;
        this.extensionGalleryService = extensionGalleryService;
        this.editorProgressService = editorProgressService;
        this.settingsTreeModel = this._register(new MutableDisposable());
        this.searchInProgress = null;
        this.pendingSettingUpdate = null;
        this._searchResultModel = this._register(new MutableDisposable());
        this.searchResultLabel = null;
        this.lastSyncedLabel = null;
        this.settingsOrderByTocIndex = null;
        this._currentFocusContext = 0 /* SettingsFocusContext.Search */;
        /** Don't spam warnings */
        this.hasWarnedMissingSettings = false;
        this.tocTreeDisposed = false;
        this.tocFocusedElement = null;
        this.treeFocusedElement = null;
        this.settingsTreeScrollTop = 0;
        this.installedExtensionIds = [];
        this.dismissedExtensionSettings = [];
        this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY = 'settingsEditor2.dismissedExtensionSettings';
        this.DISMISSED_EXTENSION_SETTINGS_DELIMITER = '\t';
        this.searchDelayer = new Delayer(300);
        this.viewState = { settingsTarget: 3 /* ConfigurationTarget.USER_LOCAL */ };
        this.settingFastUpdateDelayer = new Delayer(SettingsEditor2_1.SETTING_UPDATE_FAST_DEBOUNCE);
        this.settingSlowUpdateDelayer = new Delayer(SettingsEditor2_1.SETTING_UPDATE_SLOW_DEBOUNCE);
        this.searchInputDelayer = new Delayer(SettingsEditor2_1.SEARCH_DEBOUNCE);
        this.updatedConfigSchemaDelayer = new Delayer(SettingsEditor2_1.CONFIG_SCHEMA_UPDATE_DELAYER);
        this.inSettingsEditorContextKey = CONTEXT_SETTINGS_EDITOR.bindTo(contextKeyService);
        this.searchFocusContextKey = CONTEXT_SETTINGS_SEARCH_FOCUS.bindTo(contextKeyService);
        this.tocRowFocused = CONTEXT_TOC_ROW_FOCUS.bindTo(contextKeyService);
        this.settingRowFocused = CONTEXT_SETTINGS_ROW_FOCUS.bindTo(contextKeyService);
        this.scheduledRefreshes = new Map();
        this.editorMemento = this.getEditorMemento(editorGroupService, textResourceConfigurationService, SETTINGS_EDITOR_STATE_KEY);
        this.dismissedExtensionSettings = this.storageService
            .get(this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY, 0 /* StorageScope.PROFILE */, '')
            .split(this.DISMISSED_EXTENSION_SETTINGS_DELIMITER);
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.source !== 7 /* ConfigurationTarget.DEFAULT */) {
                this.onConfigUpdate(e.affectedKeys);
            }
        }));
        this._register(userDataProfileService.onDidChangeCurrentProfile((e) => {
            e.join(this.whenCurrentProfileChanged());
        }));
        this._register(workspaceTrustManagementService.onDidChangeTrust(() => {
            this.searchResultModel?.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
            if (this.settingsTreeModel.value) {
                this.settingsTreeModel.value.updateWorkspaceTrust(workspaceTrustManagementService.isWorkspaceTrusted());
                this.renderTree();
            }
        }));
        this._register(configurationService.onDidChangeRestrictedSettings((e) => {
            if (e.default.length && this.currentSettingsModel) {
                this.updateElementsByKey(new Set(e.default));
            }
        }));
        this._register(extensionManagementService.onDidInstallExtensions(() => {
            this.refreshInstalledExtensionsList();
        }));
        this._register(extensionManagementService.onDidUninstallExtension(() => {
            this.refreshInstalledExtensionsList();
        }));
        this.modelDisposables = this._register(new DisposableStore());
        if (ENABLE_LANGUAGE_FILTER &&
            !SettingsEditor2_1.SUGGESTIONS.includes(`@${LANGUAGE_SETTING_TAG}`)) {
            SettingsEditor2_1.SUGGESTIONS.push(`@${LANGUAGE_SETTING_TAG}`);
        }
        this.inputChangeListener = this._register(new MutableDisposable());
    }
    async whenCurrentProfileChanged() {
        this.updatedConfigSchemaDelayer.trigger(() => {
            this.dismissedExtensionSettings = this.storageService
                .get(this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY, 0 /* StorageScope.PROFILE */, '')
                .split(this.DISMISSED_EXTENSION_SETTINGS_DELIMITER);
            this.onConfigUpdate(undefined, true);
        });
    }
    get minimumWidth() {
        return SettingsEditor2_1.EDITOR_MIN_WIDTH;
    }
    get maximumWidth() {
        return Number.POSITIVE_INFINITY;
    }
    get minimumHeight() {
        return 180;
    }
    // these setters need to exist because this extends from EditorPane
    set minimumWidth(value) {
        /*noop*/
    }
    set maximumWidth(value) {
        /*noop*/
    }
    get currentSettingsModel() {
        return this.searchResultModel || this.settingsTreeModel.value;
    }
    get searchResultModel() {
        return this._searchResultModel.value ?? null;
    }
    set searchResultModel(value) {
        this._searchResultModel.value = value ?? undefined;
        this.rootElement.classList.toggle('search-mode', !!this._searchResultModel.value);
    }
    get focusedSettingDOMElement() {
        const focused = this.settingsTree.getFocus()[0];
        if (!(focused instanceof SettingsTreeSettingElement)) {
            return;
        }
        return this.settingRenderers.getDOMElementsForSettingKey(this.settingsTree.getHTMLElement(), focused.setting.key)[0];
    }
    get currentFocusContext() {
        return this._currentFocusContext;
    }
    createEditor(parent) {
        parent.setAttribute('tabindex', '-1');
        this.rootElement = DOM.append(parent, $('.settings-editor', { tabindex: '-1' }));
        this.createHeader(this.rootElement);
        this.createBody(this.rootElement);
        this.addCtrlAInterceptor(this.rootElement);
        this.updateStyles();
        this._register(registerNavigableContainer({
            name: 'settingsEditor2',
            focusNotifiers: [this],
            focusNextWidget: () => {
                if (this.searchWidget.inputWidget.hasWidgetFocus()) {
                    this.focusTOC();
                }
            },
            focusPreviousWidget: () => {
                if (!this.searchWidget.inputWidget.hasWidgetFocus()) {
                    this.focusSearch();
                }
            },
        }));
    }
    async setInput(input, options, context, token) {
        this.inSettingsEditorContextKey.set(true);
        await super.setInput(input, options, context, token);
        if (!this.input) {
            return;
        }
        const model = await this.input.resolve();
        if (token.isCancellationRequested || !(model instanceof Settings2EditorModel)) {
            return;
        }
        this.modelDisposables.clear();
        this.modelDisposables.add(model.onDidChangeGroups(() => {
            this.updatedConfigSchemaDelayer.trigger(() => {
                this.onConfigUpdate(undefined, false, true);
            });
        }));
        this.defaultSettingsEditorModel = model;
        options = options || validateSettingsEditorOptions({});
        if (!this.viewState.settingsTarget || !this.settingsTargetsWidget.settingsTarget) {
            const optionsHasViewStateTarget = options.viewState && options.viewState.settingsTarget;
            if (!options.target && !optionsHasViewStateTarget) {
                options.target = 3 /* ConfigurationTarget.USER_LOCAL */;
            }
        }
        this._setOptions(options);
        // Don't block setInput on render (which can trigger an async search)
        this.onConfigUpdate(undefined, true).then(() => {
            // This event runs when the editor closes.
            this.inputChangeListener.value = input.onWillDispose(() => {
                this.searchWidget.setValue('');
            });
            // Init TOC selection
            this.updateTreeScrollSync();
        });
        await this.refreshInstalledExtensionsList();
    }
    async refreshInstalledExtensionsList() {
        const installedExtensions = await this.extensionManagementService.getInstalled();
        this.installedExtensionIds = installedExtensions
            .filter((ext) => ext.manifest.contributes?.configuration)
            .map((ext) => ext.identifier.id);
    }
    restoreCachedState() {
        const cachedState = this.input && this.editorMemento.loadEditorState(this.group, this.input);
        if (cachedState && typeof cachedState.target === 'object') {
            cachedState.target = URI.revive(cachedState.target);
        }
        if (cachedState) {
            const settingsTarget = cachedState.target;
            this.settingsTargetsWidget.settingsTarget = settingsTarget;
            this.viewState.settingsTarget = settingsTarget;
            if (!this.searchWidget.getValue()) {
                this.searchWidget.setValue(cachedState.searchQuery);
            }
        }
        if (this.input) {
            this.editorMemento.clearEditorState(this.input, this.group);
        }
        return cachedState ?? null;
    }
    getViewState() {
        return this.viewState;
    }
    setOptions(options) {
        super.setOptions(options);
        if (options) {
            this._setOptions(options);
        }
    }
    _setOptions(options) {
        if (options.focusSearch && !platform.isIOS) {
            // isIOS - #122044
            this.focusSearch();
        }
        const recoveredViewState = options.viewState
            ? options.viewState
            : undefined;
        const query = recoveredViewState?.query ?? options.query;
        if (query !== undefined) {
            this.searchWidget.setValue(query);
            this.viewState.query = query;
        }
        const target = options.folderUri ??
            recoveredViewState?.settingsTarget ??
            options.target;
        if (target) {
            this.settingsTargetsWidget.updateTarget(target);
        }
    }
    clearInput() {
        this.inSettingsEditorContextKey.set(false);
        super.clearInput();
    }
    layout(dimension) {
        this.dimension = dimension;
        if (!this.isVisible()) {
            return;
        }
        this.layoutSplitView(dimension);
        const innerWidth = Math.min(this.headerContainer.clientWidth, dimension.width) - 24 * 2; // 24px padding on left and right;
        // minus padding inside inputbox, countElement width, controls width, extra padding before countElement
        const monacoWidth = innerWidth - 10 - this.countElement.clientWidth - this.controlsElement.clientWidth - 12;
        this.searchWidget.layout(new DOM.Dimension(monacoWidth, 20));
        this.rootElement.classList.toggle('narrow-width', dimension.width < SettingsEditor2_1.NARROW_TOTAL_WIDTH);
    }
    focus() {
        super.focus();
        if (this._currentFocusContext === 0 /* SettingsFocusContext.Search */) {
            if (!platform.isIOS) {
                // #122044
                this.focusSearch();
            }
        }
        else if (this._currentFocusContext === 3 /* SettingsFocusContext.SettingControl */) {
            const element = this.focusedSettingDOMElement;
            if (element) {
                const control = element.querySelector(AbstractSettingRenderer.CONTROL_SELECTOR);
                if (control) {
                    ;
                    control.focus();
                    return;
                }
            }
        }
        else if (this._currentFocusContext === 2 /* SettingsFocusContext.SettingTree */) {
            this.settingsTree.domFocus();
        }
        else if (this._currentFocusContext === 1 /* SettingsFocusContext.TableOfContents */) {
            this.tocTree.domFocus();
        }
    }
    setEditorVisible(visible) {
        super.setEditorVisible(visible);
        if (!visible) {
            // Wait for editor to be removed from DOM #106303
            setTimeout(() => {
                this.searchWidget.onHide();
                this.settingRenderers.cancelSuggesters();
            }, 0);
        }
    }
    focusSettings(focusSettingInput = false) {
        const focused = this.settingsTree.getFocus();
        if (!focused.length) {
            this.settingsTree.focusFirst();
        }
        this.settingsTree.domFocus();
        if (focusSettingInput) {
            const controlInFocusedRow = this.settingsTree
                .getHTMLElement()
                .querySelector(`.focused ${AbstractSettingRenderer.CONTROL_SELECTOR}`);
            if (controlInFocusedRow) {
                ;
                controlInFocusedRow.focus();
            }
        }
    }
    focusTOC() {
        this.tocTree.domFocus();
    }
    showContextMenu() {
        const focused = this.settingsTree.getFocus()[0];
        const rowElement = this.focusedSettingDOMElement;
        if (rowElement && focused instanceof SettingsTreeSettingElement) {
            this.settingRenderers.showContextMenu(focused, rowElement);
        }
    }
    focusSearch(filter, selectAll = true) {
        if (filter && this.searchWidget) {
            this.searchWidget.setValue(filter);
        }
        // Do not select all if the user is already searching.
        this.searchWidget.focus(selectAll && !this.searchInputDelayer.isTriggered);
    }
    clearSearchResults() {
        this.searchWidget.setValue('');
        this.focusSearch();
    }
    clearSearchFilters() {
        const query = this.searchWidget.getValue();
        const splitQuery = query.split(' ').filter((word) => {
            return (word.length &&
                !SettingsEditor2_1.SUGGESTIONS.some((suggestion) => word.startsWith(suggestion)));
        });
        this.searchWidget.setValue(splitQuery.join(' '));
    }
    updateInputAriaLabel() {
        let label = searchBoxLabel;
        if (this.searchResultLabel) {
            label += `. ${this.searchResultLabel}`;
        }
        if (this.lastSyncedLabel) {
            label += `. ${this.lastSyncedLabel}`;
        }
        this.searchWidget.updateAriaLabel(label);
    }
    /**
     * Render the header of the Settings editor, which includes the content above the splitview.
     */
    createHeader(parent) {
        this.headerContainer = DOM.append(parent, $('.settings-header'));
        const searchContainer = DOM.append(this.headerContainer, $('.search-container'));
        const clearInputAction = this._register(new Action(SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, localize('clearInput', 'Clear Settings Search Input'), ThemeIcon.asClassName(preferencesClearInputIcon), false, async () => this.clearSearchResults()));
        const filterAction = this._register(new Action(SETTINGS_EDITOR_COMMAND_SUGGEST_FILTERS, localize('filterInput', 'Filter Settings'), ThemeIcon.asClassName(preferencesFilterIcon)));
        this.searchWidget = this._register(this.instantiationService.createInstance(SuggestEnabledInput, `${SettingsEditor2_1.ID}.searchbox`, searchContainer, {
            triggerCharacters: ['@', ':'],
            provideResults: (query) => {
                // Based on testing, the trigger character is always at the end of the query.
                // for the ':' trigger, only return suggestions if there was a '@' before it in the same word.
                const queryParts = query.split(/\s/g);
                if (queryParts[queryParts.length - 1].startsWith(`@${LANGUAGE_SETTING_TAG}`)) {
                    const sortedLanguages = this.languageService
                        .getRegisteredLanguageIds()
                        .map((languageId) => {
                        return `@${LANGUAGE_SETTING_TAG}${languageId} `;
                    })
                        .sort();
                    return sortedLanguages.filter((langFilter) => !query.includes(langFilter));
                }
                else if (queryParts[queryParts.length - 1].startsWith(`@${EXTENSION_SETTING_TAG}`)) {
                    const installedExtensionsTags = this.installedExtensionIds
                        .map((extensionId) => {
                        return `@${EXTENSION_SETTING_TAG}${extensionId} `;
                    })
                        .sort();
                    return installedExtensionsTags.filter((extFilter) => !query.includes(extFilter));
                }
                else if (queryParts[queryParts.length - 1].startsWith('@')) {
                    return SettingsEditor2_1.SUGGESTIONS.filter((tag) => !query.includes(tag)).map((tag) => tag.endsWith(':') ? tag : tag + ' ');
                }
                return [];
            },
        }, searchBoxLabel, 'settingseditor:searchinput' + SettingsEditor2_1.NUM_INSTANCES++, {
            placeholderText: searchBoxLabel,
            focusContextKey: this.searchFocusContextKey,
            styleOverrides: {
                inputBorder: settingsTextInputBorder,
            },
            // TODO: Aria-live
        }));
        this._register(this.searchWidget.onDidFocus(() => {
            this._currentFocusContext = 0 /* SettingsFocusContext.Search */;
        }));
        this.countElement = DOM.append(searchContainer, DOM.$('.settings-count-widget.monaco-count-badge.long'));
        this.countElement.style.backgroundColor = asCssVariable(badgeBackground);
        this.countElement.style.color = asCssVariable(badgeForeground);
        this.countElement.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        this._register(this.searchWidget.onInputDidChange(() => {
            const searchVal = this.searchWidget.getValue();
            clearInputAction.enabled = !!searchVal;
            this.searchInputDelayer.trigger(() => this.onSearchInputChanged());
        }));
        const headerControlsContainer = DOM.append(this.headerContainer, $('.settings-header-controls'));
        headerControlsContainer.style.borderColor = asCssVariable(settingsHeaderBorder);
        const targetWidgetContainer = DOM.append(headerControlsContainer, $('.settings-target-container'));
        this.settingsTargetsWidget = this._register(this.instantiationService.createInstance(SettingsTargetsWidget, targetWidgetContainer, {
            enableRemoteSettings: true,
        }));
        this.settingsTargetsWidget.settingsTarget = 3 /* ConfigurationTarget.USER_LOCAL */;
        this._register(this.settingsTargetsWidget.onDidTargetChange((target) => this.onDidSettingsTargetChange(target)));
        this._register(DOM.addDisposableListener(targetWidgetContainer, DOM.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.keyCode === 18 /* KeyCode.DownArrow */) {
                this.focusSettings();
            }
        }));
        if (this.userDataSyncWorkbenchService.enabled &&
            this.userDataSyncEnablementService.canToggleEnablement()) {
            const syncControls = this._register(this.instantiationService.createInstance(SyncControls, this.window, headerControlsContainer));
            this._register(syncControls.onDidChangeLastSyncedLabel((lastSyncedLabel) => {
                this.lastSyncedLabel = lastSyncedLabel;
                this.updateInputAriaLabel();
            }));
        }
        this.controlsElement = DOM.append(searchContainer, DOM.$('.settings-clear-widget'));
        const actionBar = this._register(new ActionBar(this.controlsElement, {
            actionViewItemProvider: (action, options) => {
                if (action.id === filterAction.id) {
                    return this.instantiationService.createInstance(SettingsSearchFilterDropdownMenuActionViewItem, action, options, this.actionRunner, this.searchWidget);
                }
                return undefined;
            },
        }));
        actionBar.push([clearInputAction, filterAction], { label: false, icon: true });
    }
    onDidSettingsTargetChange(target) {
        this.viewState.settingsTarget = target;
        // TODO Instead of rebuilding the whole model, refresh and uncache the inspected setting value
        this.onConfigUpdate(undefined, true);
    }
    onDidDismissExtensionSetting(extensionId) {
        if (!this.dismissedExtensionSettings.includes(extensionId)) {
            this.dismissedExtensionSettings.push(extensionId);
        }
        this.storageService.store(this.DISMISSED_EXTENSION_SETTINGS_STORAGE_KEY, this.dismissedExtensionSettings.join(this.DISMISSED_EXTENSION_SETTINGS_DELIMITER), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.onConfigUpdate(undefined, true);
    }
    onDidClickSetting(evt, recursed) {
        const targetElement = this.currentSettingsModel?.getElementsByName(evt.targetKey)?.[0];
        let revealFailed = false;
        if (targetElement) {
            let sourceTop = 0.5;
            try {
                const _sourceTop = this.settingsTree.getRelativeTop(evt.source);
                if (_sourceTop !== null) {
                    sourceTop = _sourceTop;
                }
            }
            catch {
                // e.g. clicked a searched element, now the search has been cleared
            }
            // If we search for something and focus on a category, the settings tree
            // only renders settings in that category.
            // If the target display category is different than the source's, unfocus the category
            // so that we can render all found settings again.
            // Then, the reveal call will correctly find the target setting.
            if (this.viewState.filterToCategory &&
                evt.source.displayCategory !== targetElement.displayCategory) {
                this.tocTree.setFocus([]);
            }
            try {
                this.settingsTree.reveal(targetElement, sourceTop);
            }
            catch (_) {
                // The listwidget couldn't find the setting to reveal,
                // even though it's in the model, meaning there might be a filter
                // preventing it from showing up.
                revealFailed = true;
            }
            if (!revealFailed) {
                // We need to shift focus from the setting that contains the link to the setting that's
                // linked. Clicking on the link sets focus on the setting that contains the link,
                // which is why we need the setTimeout.
                setTimeout(() => {
                    this.settingsTree.setFocus([targetElement]);
                }, 50);
                const domElements = this.settingRenderers.getDOMElementsForSettingKey(this.settingsTree.getHTMLElement(), evt.targetKey);
                if (domElements && domElements[0]) {
                    const control = domElements[0].querySelector(AbstractSettingRenderer.CONTROL_SELECTOR);
                    if (control) {
                        ;
                        control.focus();
                    }
                }
            }
        }
        if (!recursed && (!targetElement || revealFailed)) {
            // We'll call this event handler again after clearing the search query,
            // so that more settings show up in the list.
            const p = this.triggerSearch('');
            p.then(() => {
                this.searchWidget.setValue('');
                this.onDidClickSetting(evt, true);
            });
        }
    }
    switchToSettingsFile() {
        const query = parseQuery(this.searchWidget.getValue()).query;
        return this.openSettingsFile({ query });
    }
    async openSettingsFile(options) {
        const currentSettingsTarget = this.settingsTargetsWidget.settingsTarget;
        const openOptions = {
            jsonEditor: true,
            groupId: this.group.id,
            ...options,
        };
        if (currentSettingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            if (options?.revealSetting) {
                const configurationProperties = Registry.as(Extensions.Configuration).getConfigurationProperties();
                const configurationScope = configurationProperties[options?.revealSetting.key]?.scope;
                if (configurationScope && APPLICATION_SCOPES.includes(configurationScope)) {
                    return this.preferencesService.openApplicationSettings(openOptions);
                }
            }
            return this.preferencesService.openUserSettings(openOptions);
        }
        else if (currentSettingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            return this.preferencesService.openRemoteSettings(openOptions);
        }
        else if (currentSettingsTarget === 5 /* ConfigurationTarget.WORKSPACE */) {
            return this.preferencesService.openWorkspaceSettings(openOptions);
        }
        else if (URI.isUri(currentSettingsTarget)) {
            return this.preferencesService.openFolderSettings({
                folderUri: currentSettingsTarget,
                ...openOptions,
            });
        }
        return undefined;
    }
    createBody(parent) {
        this.bodyContainer = DOM.append(parent, $('.settings-body'));
        this.noResultsMessage = DOM.append(this.bodyContainer, $('.no-results-message'));
        this.noResultsMessage.innerText = localize('noResults', 'No Settings Found');
        this.clearFilterLinkContainer = $('span.clear-search-filters');
        this.clearFilterLinkContainer.textContent = ' - ';
        const clearFilterLink = DOM.append(this.clearFilterLinkContainer, $('a.pointer.prominent', { tabindex: 0 }, localize('clearSearchFilters', 'Clear Filters')));
        this._register(DOM.addDisposableListener(clearFilterLink, DOM.EventType.CLICK, (e) => {
            DOM.EventHelper.stop(e, false);
            this.clearSearchFilters();
        }));
        DOM.append(this.noResultsMessage, this.clearFilterLinkContainer);
        this.noResultsMessage.style.color = asCssVariable(editorForeground);
        this.tocTreeContainer = $('.settings-toc-container');
        this.settingsTreeContainer = $('.settings-tree-container');
        this.createTOC(this.tocTreeContainer);
        this.createSettingsTree(this.settingsTreeContainer);
        this.splitView = this._register(new SplitView(this.bodyContainer, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true,
        }));
        const startingWidth = this.storageService.getNumber('settingsEditor2.splitViewWidth', 0 /* StorageScope.PROFILE */, SettingsEditor2_1.TOC_RESET_WIDTH);
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.tocTreeContainer,
            minimumSize: SettingsEditor2_1.TOC_MIN_WIDTH,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                this.tocTreeContainer.style.width = `${width}px`;
                this.tocTree.layout(height, width);
            },
        }, startingWidth, undefined, true);
        this.splitView.addView({
            onDidChange: Event.None,
            element: this.settingsTreeContainer,
            minimumSize: SettingsEditor2_1.EDITOR_MIN_WIDTH,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                this.settingsTreeContainer.style.width = `${width}px`;
                this.settingsTree.layout(height, width);
            },
        }, Sizing.Distribute, undefined, true);
        this._register(this.splitView.onDidSashReset(() => {
            const totalSize = this.splitView.getViewSize(0) + this.splitView.getViewSize(1);
            this.splitView.resizeView(0, SettingsEditor2_1.TOC_RESET_WIDTH);
            this.splitView.resizeView(1, totalSize - SettingsEditor2_1.TOC_RESET_WIDTH);
        }));
        this._register(this.splitView.onDidSashChange(() => {
            const width = this.splitView.getViewSize(0);
            this.storageService.store('settingsEditor2.splitViewWidth', width, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }));
        const borderColor = this.theme.getColor(settingsSashBorder);
        this.splitView.style({ separatorBorder: borderColor });
    }
    addCtrlAInterceptor(container) {
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.KEY_DOWN, (e) => {
            if (e.keyCode === 31 /* KeyCode.KeyA */ &&
                (platform.isMacintosh ? e.metaKey : e.ctrlKey) &&
                !DOM.isEditableElement(e.target)) {
                // Avoid browser ctrl+a
                e.browserEvent.stopPropagation();
                e.browserEvent.preventDefault();
            }
        }));
    }
    createTOC(container) {
        this.tocTreeModel = this.instantiationService.createInstance(TOCTreeModel, this.viewState);
        this.tocTree = this._register(this.instantiationService.createInstance(TOCTree, DOM.append(container, $('.settings-toc-wrapper', {
            role: 'navigation',
            'aria-label': localize('settings', 'Settings'),
        })), this.viewState));
        this.tocTreeDisposed = false;
        this._register(this.tocTree.onDidFocus(() => {
            this._currentFocusContext = 1 /* SettingsFocusContext.TableOfContents */;
        }));
        this._register(this.tocTree.onDidChangeFocus((e) => {
            const element = e.elements?.[0] ?? null;
            if (this.tocFocusedElement === element) {
                return;
            }
            this.tocFocusedElement = element;
            this.tocTree.setSelection(element ? [element] : []);
            if (this.searchResultModel) {
                if (this.viewState.filterToCategory !== element) {
                    this.viewState.filterToCategory = element ?? undefined;
                    // Force render in this case, because
                    // onDidClickSetting relies on the updated view.
                    this.renderTree(undefined, true);
                    this.settingsTree.scrollTop = 0;
                }
            }
            else if (element &&
                (!e.browserEvent || !e.browserEvent.fromScroll)) {
                this.settingsTree.reveal(element, 0);
                this.settingsTree.setFocus([element]);
            }
        }));
        this._register(this.tocTree.onDidFocus(() => {
            this.tocRowFocused.set(true);
        }));
        this._register(this.tocTree.onDidBlur(() => {
            this.tocRowFocused.set(false);
        }));
        this._register(this.tocTree.onDidDispose(() => {
            this.tocTreeDisposed = true;
        }));
    }
    applyFilter(filter) {
        if (this.searchWidget && !this.searchWidget.getValue().includes(filter)) {
            // Prepend the filter to the query.
            const newQuery = `${filter} ${this.searchWidget.getValue().trimStart()}`;
            this.focusSearch(newQuery, false);
        }
    }
    removeLanguageFilters() {
        if (this.searchWidget && this.searchWidget.getValue().includes(`@${LANGUAGE_SETTING_TAG}`)) {
            const query = this.searchWidget.getValue().split(' ');
            const newQuery = query
                .filter((word) => !word.startsWith(`@${LANGUAGE_SETTING_TAG}`))
                .join(' ');
            this.focusSearch(newQuery, false);
        }
    }
    createSettingsTree(container) {
        this.settingRenderers = this._register(this.instantiationService.createInstance(SettingTreeRenderers));
        this._register(this.settingRenderers.onDidChangeSetting((e) => this.onDidChangeSetting(e.key, e.value, e.type, e.manualReset, e.scope)));
        this._register(this.settingRenderers.onDidDismissExtensionSetting((e) => this.onDidDismissExtensionSetting(e)));
        this._register(this.settingRenderers.onDidOpenSettings((settingKey) => {
            this.openSettingsFile({ revealSetting: { key: settingKey, edit: true } });
        }));
        this._register(this.settingRenderers.onDidClickSettingLink((settingName) => this.onDidClickSetting(settingName)));
        this._register(this.settingRenderers.onDidFocusSetting((element) => {
            this.settingsTree.setFocus([element]);
            this._currentFocusContext = 3 /* SettingsFocusContext.SettingControl */;
            this.settingRowFocused.set(false);
        }));
        this._register(this.settingRenderers.onDidChangeSettingHeight((params) => {
            const { element, height } = params;
            try {
                this.settingsTree.updateElementHeight(element, height);
            }
            catch (e) {
                // the element was not found
            }
        }));
        this._register(this.settingRenderers.onApplyFilter((filter) => this.applyFilter(filter)));
        this._register(this.settingRenderers.onDidClickOverrideElement((element) => {
            this.removeLanguageFilters();
            if (element.language) {
                this.applyFilter(`@${LANGUAGE_SETTING_TAG}${element.language}`);
            }
            if (element.scope === 'workspace') {
                this.settingsTargetsWidget.updateTarget(5 /* ConfigurationTarget.WORKSPACE */);
            }
            else if (element.scope === 'user') {
                this.settingsTargetsWidget.updateTarget(3 /* ConfigurationTarget.USER_LOCAL */);
            }
            else if (element.scope === 'remote') {
                this.settingsTargetsWidget.updateTarget(4 /* ConfigurationTarget.USER_REMOTE */);
            }
            this.applyFilter(`@${ID_SETTING_TAG}${element.settingKey}`);
        }));
        this.settingsTree = this._register(this.instantiationService.createInstance(SettingsTree, container, this.viewState, this.settingRenderers.allRenderers));
        this._register(this.settingsTree.onDidScroll(() => {
            if (this.settingsTree.scrollTop === this.settingsTreeScrollTop) {
                return;
            }
            this.settingsTreeScrollTop = this.settingsTree.scrollTop;
            // setTimeout because calling setChildren on the settingsTree can trigger onDidScroll, so it fires when
            // setChildren has called on the settings tree but not the toc tree yet, so their rendered elements are out of sync
            setTimeout(() => {
                this.updateTreeScrollSync();
            }, 0);
        }));
        this._register(this.settingsTree.onDidFocus(() => {
            const classList = container.ownerDocument.activeElement?.classList;
            if (classList &&
                classList.contains('monaco-list') &&
                classList.contains('settings-editor-tree')) {
                this._currentFocusContext = 2 /* SettingsFocusContext.SettingTree */;
                this.settingRowFocused.set(true);
                this.treeFocusedElement ??= this.settingsTree.firstVisibleElement ?? null;
                if (this.treeFocusedElement) {
                    this.treeFocusedElement.tabbable = true;
                }
            }
        }));
        this._register(this.settingsTree.onDidBlur(() => {
            this.settingRowFocused.set(false);
            // Clear out the focused element, otherwise it could be
            // out of date during the next onDidFocus event.
            this.treeFocusedElement = null;
        }));
        // There is no different select state in the settings tree
        this._register(this.settingsTree.onDidChangeFocus((e) => {
            const element = e.elements[0];
            if (this.treeFocusedElement === element) {
                return;
            }
            if (this.treeFocusedElement) {
                this.treeFocusedElement.tabbable = false;
            }
            this.treeFocusedElement = element;
            if (this.treeFocusedElement) {
                this.treeFocusedElement.tabbable = true;
            }
            this.settingsTree.setSelection(element ? [element] : []);
        }));
    }
    onDidChangeSetting(key, value, type, manualReset, scope) {
        const parsedQuery = parseQuery(this.searchWidget.getValue());
        const languageFilter = parsedQuery.languageFilter;
        if (manualReset || (this.pendingSettingUpdate && this.pendingSettingUpdate.key !== key)) {
            this.updateChangedSetting(key, value, manualReset, languageFilter, scope);
        }
        this.pendingSettingUpdate = { key, value, languageFilter };
        if (SettingsEditor2_1.shouldSettingUpdateFast(type)) {
            this.settingFastUpdateDelayer.trigger(() => this.updateChangedSetting(key, value, manualReset, languageFilter, scope));
        }
        else {
            this.settingSlowUpdateDelayer.trigger(() => this.updateChangedSetting(key, value, manualReset, languageFilter, scope));
        }
    }
    updateTreeScrollSync() {
        this.settingRenderers.cancelSuggesters();
        if (this.searchResultModel) {
            return;
        }
        if (!this.tocTreeModel) {
            return;
        }
        const elementToSync = this.settingsTree.firstVisibleElement;
        const element = elementToSync instanceof SettingsTreeSettingElement
            ? elementToSync.parent
            : elementToSync instanceof SettingsTreeGroupElement
                ? elementToSync
                : null;
        // It's possible for this to be called when the TOC and settings tree are out of sync - e.g. when the settings tree has deferred a refresh because
        // it is focused. So, bail if element doesn't exist in the TOC.
        let nodeExists = true;
        try {
            this.tocTree.getNode(element);
        }
        catch (e) {
            nodeExists = false;
        }
        if (!nodeExists) {
            return;
        }
        if (element && this.tocTree.getSelection()[0] !== element) {
            const ancestors = this.getAncestors(element);
            ancestors.forEach((e) => this.tocTree.expand(e));
            this.tocTree.reveal(element);
            const elementTop = this.tocTree.getRelativeTop(element);
            if (typeof elementTop !== 'number') {
                return;
            }
            this.tocTree.collapseAll();
            ancestors.forEach((e) => this.tocTree.expand(e));
            if (elementTop < 0 || elementTop > 1) {
                this.tocTree.reveal(element);
            }
            else {
                this.tocTree.reveal(element, elementTop);
            }
            this.tocTree.expand(element);
            this.tocTree.setSelection([element]);
            const fakeKeyboardEvent = new KeyboardEvent('keydown');
            fakeKeyboardEvent.fromScroll = true;
            this.tocTree.setFocus([element], fakeKeyboardEvent);
        }
    }
    getAncestors(element) {
        const ancestors = [];
        while (element.parent) {
            if (element.parent.id !== 'root') {
                ancestors.push(element.parent);
            }
            element = element.parent;
        }
        return ancestors.reverse();
    }
    updateChangedSetting(key, value, manualReset, languageFilter, scope) {
        // ConfigurationService displays the error if this fails.
        // Force a render afterwards because onDidConfigurationUpdate doesn't fire if the update doesn't result in an effective setting value change.
        const settingsTarget = this.settingsTargetsWidget.settingsTarget;
        const resource = URI.isUri(settingsTarget) ? settingsTarget : undefined;
        const configurationTarget = ((resource ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ : settingsTarget)) ?? 3 /* ConfigurationTarget.USER_LOCAL */;
        const overrides = {
            resource,
            overrideIdentifiers: languageFilter ? [languageFilter] : undefined,
        };
        const configurationTargetIsWorkspace = configurationTarget === 5 /* ConfigurationTarget.WORKSPACE */ ||
            configurationTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        const userPassedInManualReset = configurationTargetIsWorkspace || !!languageFilter;
        const isManualReset = userPassedInManualReset ? manualReset : value === undefined;
        // If the user is changing the value back to the default, and we're not targeting a workspace scope, do a 'reset' instead
        const inspected = this.configurationService.inspect(key, overrides);
        if (!userPassedInManualReset && inspected.defaultValue === value) {
            value = undefined;
        }
        return this.configurationService
            .updateValue(key, value, overrides, configurationTarget, { handleDirtyFile: 'save' })
            .then(() => {
            const query = this.searchWidget.getValue();
            if (query.includes(`@${MODIFIED_SETTING_TAG}`)) {
                // The user might have reset a setting.
                this.refreshTOCTree();
            }
            this.renderTree(key, isManualReset);
            this.pendingSettingUpdate = null;
            const reportModifiedProps = {
                key,
                query,
                searchResults: this.searchResultModel?.getUniqueResults() ?? null,
                rawResults: this.searchResultModel?.getRawResults() ?? null,
                showConfiguredOnly: !!this.viewState.tagFilters && this.viewState.tagFilters.has(MODIFIED_SETTING_TAG),
                isReset: typeof value === 'undefined',
                settingsTarget: this.settingsTargetsWidget.settingsTarget,
            };
            return this.reportModifiedSetting(reportModifiedProps);
        });
    }
    reportModifiedSetting(props) {
        let groupId = undefined;
        let nlpIndex = undefined;
        let displayIndex = undefined;
        if (props.searchResults) {
            displayIndex = props.searchResults.filterMatches.findIndex((m) => m.setting.key === props.key);
            if (this.searchResultModel) {
                const rawResults = this.searchResultModel.getRawResults();
                if (rawResults[0 /* SearchResultIdx.Local */] && displayIndex >= 0) {
                    const settingInLocalResults = rawResults[0 /* SearchResultIdx.Local */].filterMatches.some((m) => m.setting.key === props.key);
                    groupId = settingInLocalResults ? 'local' : 'remote';
                }
                if (rawResults[1 /* SearchResultIdx.Remote */]) {
                    const _nlpIndex = rawResults[1 /* SearchResultIdx.Remote */].filterMatches.findIndex((m) => m.setting.key === props.key);
                    nlpIndex = _nlpIndex >= 0 ? _nlpIndex : undefined;
                }
            }
        }
        const reportedTarget = props.settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */
            ? 'user'
            : props.settingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */
                ? 'user_remote'
                : props.settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */
                    ? 'workspace'
                    : 'folder';
        const data = {
            key: props.key,
            groupId,
            nlpIndex,
            displayIndex,
            showConfiguredOnly: props.showConfiguredOnly,
            isReset: props.isReset,
            target: reportedTarget,
        };
        this.telemetryService.publicLog2('settingsEditor.settingModified', data);
    }
    scheduleRefresh(element, key = '') {
        if (key && this.scheduledRefreshes.has(key)) {
            return;
        }
        if (!key) {
            dispose(this.scheduledRefreshes.values());
            this.scheduledRefreshes.clear();
        }
        const store = new DisposableStore();
        const scheduledRefreshTracker = DOM.trackFocus(element);
        store.add(scheduledRefreshTracker);
        store.add(scheduledRefreshTracker.onDidBlur(() => {
            this.scheduledRefreshes.get(key)?.dispose();
            this.scheduledRefreshes.delete(key);
            this.onConfigUpdate(new Set([key]));
        }));
        this.scheduledRefreshes.set(key, store);
    }
    createSettingsOrderByTocIndex(resolvedSettingsRoot) {
        const index = new Map();
        function indexSettings(resolvedSettingsRoot, counter = 0) {
            if (resolvedSettingsRoot.settings) {
                for (const setting of resolvedSettingsRoot.settings) {
                    if (!index.has(setting.key)) {
                        index.set(setting.key, counter++);
                    }
                }
            }
            if (resolvedSettingsRoot.children) {
                for (const child of resolvedSettingsRoot.children) {
                    counter = indexSettings(child, counter);
                }
            }
            return counter;
        }
        indexSettings(resolvedSettingsRoot);
        return index;
    }
    refreshModels(resolvedSettingsRoot) {
        // Both calls to refreshModels require a valid settingsTreeModel.
        this.settingsTreeModel.value.update(resolvedSettingsRoot);
        this.tocTreeModel.settingsTreeRoot = this.settingsTreeModel.value.root;
        this.settingsOrderByTocIndex = this.createSettingsOrderByTocIndex(resolvedSettingsRoot);
    }
    async onConfigUpdate(keys, forceRefresh = false, schemaChange = false) {
        if (keys && this.settingsTreeModel) {
            return this.updateElementsByKey(keys);
        }
        if (!this.defaultSettingsEditorModel) {
            return;
        }
        const groups = this.defaultSettingsEditorModel.settingsGroups.slice(1); // Without commonlyUsed
        const coreSettings = groups.filter((g) => !g.extensionInfo);
        const settingsResult = resolveSettingsTree(tocData, coreSettings, this.logService);
        const resolvedSettingsRoot = settingsResult.tree;
        // Warn for settings not included in layout
        if (settingsResult.leftoverSettings.size && !this.hasWarnedMissingSettings) {
            const settingKeyList = [];
            settingsResult.leftoverSettings.forEach((s) => {
                settingKeyList.push(s.key);
            });
            this.logService.warn(`SettingsEditor2: Settings not included in settingsLayout.ts: ${settingKeyList.join(', ')}`);
            this.hasWarnedMissingSettings = true;
        }
        const additionalGroups = [];
        let setAdditionalGroups = false;
        const toggleData = await getExperimentalExtensionToggleData(this.extensionGalleryService, this.productService);
        if (toggleData && groups.filter((g) => g.extensionInfo).length) {
            for (const key in toggleData.settingsEditorRecommendedExtensions) {
                const extension = toggleData.recommendedExtensionsGalleryInfo[key];
                if (!extension) {
                    continue;
                }
                const extensionId = extension.identifier.id;
                // prevent race between extension update handler and this (onConfigUpdate) handler
                await this.refreshInstalledExtensionsList();
                const extensionInstalled = this.installedExtensionIds.includes(extensionId);
                // Drill down to see whether the group and setting already exist
                // and need to be removed.
                const matchingGroupIndex = groups.findIndex((g) => g.extensionInfo &&
                    g.extensionInfo.id.toLowerCase() === extensionId.toLowerCase() &&
                    g.sections.length === 1 &&
                    g.sections[0].settings.length === 1 &&
                    g.sections[0].settings[0].displayExtensionId);
                if (extensionInstalled || this.dismissedExtensionSettings.includes(extensionId)) {
                    if (matchingGroupIndex !== -1) {
                        groups.splice(matchingGroupIndex, 1);
                        setAdditionalGroups = true;
                    }
                    continue;
                }
                if (matchingGroupIndex !== -1) {
                    continue;
                }
                // Create the entry. extensionInstalled is false in this case.
                let manifest = null;
                try {
                    manifest =
                        (await raceTimeout(this.extensionGalleryService.getManifest(extension, CancellationToken.None), EXTENSION_FETCH_TIMEOUT_MS)) ?? null;
                }
                catch (e) {
                    // Likely a networking issue.
                    // Skip adding a button for this extension to the Settings editor.
                    continue;
                }
                if (manifest === null) {
                    continue;
                }
                const contributesConfiguration = manifest?.contributes?.configuration;
                let groupTitle;
                if (!Array.isArray(contributesConfiguration)) {
                    groupTitle = contributesConfiguration?.title;
                }
                else if (contributesConfiguration.length === 1) {
                    groupTitle = contributesConfiguration[0].title;
                }
                const recommendationInfo = toggleData.settingsEditorRecommendedExtensions[key];
                const extensionName = extension.displayName ?? extension.name ?? extensionId;
                const settingKey = `${key}.manageExtension`;
                const setting = {
                    range: nullRange,
                    key: settingKey,
                    keyRange: nullRange,
                    value: null,
                    valueRange: nullRange,
                    description: [
                        recommendationInfo.onSettingsEditorOpen?.descriptionOverride ?? extension.description,
                    ],
                    descriptionIsMarkdown: false,
                    descriptionRanges: [],
                    scope: 4 /* ConfigurationScope.WINDOW */,
                    type: 'null',
                    displayExtensionId: extensionId,
                    extensionGroupTitle: groupTitle ?? extensionName,
                    categoryLabel: 'Extensions',
                    title: extensionName,
                };
                const additionalGroup = {
                    sections: [
                        {
                            settings: [setting],
                        },
                    ],
                    id: extensionId,
                    title: setting.extensionGroupTitle,
                    titleRange: nullRange,
                    range: nullRange,
                    extensionInfo: {
                        id: extensionId,
                        displayName: extension.displayName,
                    },
                };
                groups.push(additionalGroup);
                additionalGroups.push(additionalGroup);
                setAdditionalGroups = true;
            }
        }
        resolvedSettingsRoot.children.push(await createTocTreeForExtensionSettings(this.extensionService, groups.filter((g) => g.extensionInfo)));
        const commonlyUsedDataToUse = getCommonlyUsedData(toggleData);
        const commonlyUsed = resolveSettingsTree(commonlyUsedDataToUse, groups, this.logService);
        resolvedSettingsRoot.children.unshift(commonlyUsed.tree);
        if (toggleData && setAdditionalGroups) {
            // Add the additional groups to the model to help with searching.
            this.defaultSettingsEditorModel.setAdditionalGroups(additionalGroups);
        }
        if (!this.workspaceTrustManagementService.isWorkspaceTrusted() &&
            (this.viewState.settingsTarget instanceof URI ||
                this.viewState.settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */)) {
            const configuredUntrustedWorkspaceSettings = resolveConfiguredUntrustedSettings(groups, this.viewState.settingsTarget, this.viewState.languageFilter, this.configurationService);
            if (configuredUntrustedWorkspaceSettings.length) {
                resolvedSettingsRoot.children.unshift({
                    id: 'workspaceTrust',
                    label: localize('settings require trust', 'Workspace Trust'),
                    settings: configuredUntrustedWorkspaceSettings,
                });
            }
        }
        this.searchResultModel?.updateChildren();
        if (this.settingsTreeModel.value) {
            this.refreshModels(resolvedSettingsRoot);
            if (schemaChange && this.searchResultModel) {
                // If an extension's settings were just loaded and a search is active, retrigger the search so it shows up
                return await this.onSearchInputChanged();
            }
            this.refreshTOCTree();
            this.renderTree(undefined, forceRefresh);
        }
        else {
            this.settingsTreeModel.value = this.instantiationService.createInstance(SettingsTreeModel, this.viewState, this.workspaceTrustManagementService.isWorkspaceTrusted());
            this.refreshModels(resolvedSettingsRoot);
            // Don't restore the cached state if we already have a query value from calling _setOptions().
            const cachedState = !this.viewState.query ? this.restoreCachedState() : undefined;
            if (cachedState?.searchQuery || this.searchWidget.getValue()) {
                await this.onSearchInputChanged();
            }
            else {
                this.refreshTOCTree();
                this.refreshTree();
                this.tocTree.collapseAll();
            }
        }
    }
    updateElementsByKey(keys) {
        if (keys.size) {
            if (this.searchResultModel) {
                keys.forEach((key) => this.searchResultModel.updateElementsByName(key));
            }
            if (this.settingsTreeModel.value) {
                keys.forEach((key) => this.settingsTreeModel.value.updateElementsByName(key));
            }
            keys.forEach((key) => this.renderTree(key));
        }
        else {
            this.renderTree();
        }
    }
    getActiveControlInSettingsTree() {
        const element = this.settingsTree.getHTMLElement();
        const activeElement = element.ownerDocument.activeElement;
        return activeElement && DOM.isAncestorOfActiveElement(element)
            ? activeElement
            : null;
    }
    renderTree(key, force = false) {
        if (!force && key && this.scheduledRefreshes.has(key)) {
            this.updateModifiedLabelForKey(key);
            return;
        }
        // If the context view is focused, delay rendering settings
        if (this.contextViewFocused()) {
            const element = this.window.document.querySelector('.context-view');
            if (element) {
                this.scheduleRefresh(element, key);
            }
            return;
        }
        // If a setting control is currently focused, schedule a refresh for later
        const activeElement = this.getActiveControlInSettingsTree();
        const focusedSetting = activeElement && this.settingRenderers.getSettingDOMElementForDOMElement(activeElement);
        if (focusedSetting && !force) {
            // If a single setting is being refreshed, it's ok to refresh now if that is not the focused setting
            if (key) {
                const focusedKey = focusedSetting.getAttribute(AbstractSettingRenderer.SETTING_KEY_ATTR);
                if (focusedKey === key &&
                    // update `list`s live, as they have a separate "submit edit" step built in before this
                    focusedSetting.parentElement &&
                    !focusedSetting.parentElement.classList.contains('setting-item-list')) {
                    this.updateModifiedLabelForKey(key);
                    this.scheduleRefresh(focusedSetting, key);
                    return;
                }
            }
            else {
                this.scheduleRefresh(focusedSetting);
                return;
            }
        }
        this.renderResultCountMessages();
        if (key) {
            const elements = this.currentSettingsModel?.getElementsByName(key);
            if (elements?.length) {
                if (elements.length >= 2) {
                    console.warn('More than one setting with key ' + key + ' found');
                }
                this.refreshSingleElement(elements[0]);
            }
            else {
                // Refresh requested for a key that we don't know about
                return;
            }
        }
        else {
            this.refreshTree();
        }
        return;
    }
    contextViewFocused() {
        return !!DOM.findParentWithClass(this.rootElement.ownerDocument.activeElement, 'context-view');
    }
    refreshSingleElement(element) {
        if (this.isVisible()) {
            if (!element.setting.deprecationMessage || element.isConfigured) {
                this.settingsTree.rerender(element);
            }
        }
    }
    refreshTree() {
        if (this.isVisible() && this.currentSettingsModel) {
            this.settingsTree.setChildren(null, createGroupIterator(this.currentSettingsModel.root));
        }
    }
    refreshTOCTree() {
        if (this.isVisible()) {
            this.tocTreeModel.update();
            this.tocTree.setChildren(null, createTOCIterator(this.tocTreeModel, this.tocTree));
        }
    }
    updateModifiedLabelForKey(key) {
        if (!this.currentSettingsModel) {
            return;
        }
        const dataElements = this.currentSettingsModel.getElementsByName(key);
        const isModified = dataElements && dataElements[0] && dataElements[0].isConfigured; // all elements are either configured or not
        const elements = this.settingRenderers.getDOMElementsForSettingKey(this.settingsTree.getHTMLElement(), key);
        if (elements && elements[0]) {
            elements[0].classList.toggle('is-configured', !!isModified);
        }
    }
    async onSearchInputChanged() {
        if (!this.currentSettingsModel) {
            // Initializing search widget value
            return;
        }
        const query = this.searchWidget.getValue().trim();
        this.viewState.query = query;
        await this.triggerSearch(query.replace(/\u203A/g, ' '));
    }
    parseSettingFromJSON(query) {
        const match = query.match(/"([a-zA-Z.]+)": /);
        return match && match[1];
    }
    /**
     * Toggles the visibility of the Settings editor table of contents during a search
     * depending on the behavior.
     */
    toggleTocBySearchBehaviorType() {
        const tocBehavior = this.configurationService.getValue(SEARCH_TOC_BEHAVIOR_KEY);
        const hideToc = tocBehavior === 'hide';
        if (hideToc) {
            this.splitView.setViewVisible(0, false);
            this.splitView.style({
                separatorBorder: Color.transparent,
            });
        }
        else {
            this.layoutSplitView(this.dimension);
        }
    }
    async triggerSearch(query) {
        const progressRunner = this.editorProgressService.show(true, 800);
        this.viewState.tagFilters = new Set();
        this.viewState.extensionFilters = new Set();
        this.viewState.featureFilters = new Set();
        this.viewState.idFilters = new Set();
        this.viewState.languageFilter = undefined;
        if (query) {
            const parsedQuery = parseQuery(query);
            query = parsedQuery.query;
            parsedQuery.tags.forEach((tag) => this.viewState.tagFilters.add(tag));
            parsedQuery.extensionFilters.forEach((extensionId) => this.viewState.extensionFilters.add(extensionId));
            parsedQuery.featureFilters.forEach((feature) => this.viewState.featureFilters.add(feature));
            parsedQuery.idFilters.forEach((id) => this.viewState.idFilters.add(id));
            this.viewState.languageFilter = parsedQuery.languageFilter;
        }
        this.settingsTargetsWidget.updateLanguageFilterIndicators(this.viewState.languageFilter);
        if (query && query !== '@') {
            query = this.parseSettingFromJSON(query) || query;
            await this.triggerFilterPreferences(query);
            this.toggleTocBySearchBehaviorType();
        }
        else {
            if (this.viewState.tagFilters.size ||
                this.viewState.extensionFilters.size ||
                this.viewState.featureFilters.size ||
                this.viewState.idFilters.size ||
                this.viewState.languageFilter) {
                this.searchResultModel = this.createFilterModel();
            }
            else {
                this.searchResultModel = null;
            }
            this.searchDelayer.cancel();
            if (this.searchInProgress) {
                this.searchInProgress.dispose(true);
                this.searchInProgress = null;
            }
            this.tocTree.setFocus([]);
            this.viewState.filterToCategory = undefined;
            this.tocTreeModel.currentSearchModel = this.searchResultModel;
            if (this.searchResultModel) {
                // Added a filter model
                this.tocTree.setSelection([]);
                this.tocTree.expandAll();
                this.refreshTOCTree();
                this.renderResultCountMessages();
                this.refreshTree();
                this.toggleTocBySearchBehaviorType();
            }
            else if (!this.tocTreeDisposed) {
                // Leaving search mode
                this.tocTree.collapseAll();
                this.refreshTOCTree();
                this.renderResultCountMessages();
                this.refreshTree();
                this.layoutSplitView(this.dimension);
            }
        }
        progressRunner.done();
    }
    /**
     * Return a fake SearchResultModel which can hold a flat list of all settings, to be filtered (@modified etc)
     */
    createFilterModel() {
        const filterModel = this.instantiationService.createInstance(SearchResultModel, this.viewState, this.settingsOrderByTocIndex, this.workspaceTrustManagementService.isWorkspaceTrusted());
        const fullResult = {
            filterMatches: [],
            exactMatch: false,
        };
        for (const g of this.defaultSettingsEditorModel.settingsGroups.slice(1)) {
            for (const sect of g.sections) {
                for (const setting of sect.settings) {
                    fullResult.filterMatches.push({
                        setting,
                        matches: [],
                        matchType: SettingMatchType.None,
                        keyMatchScore: 0,
                        score: 0,
                    });
                }
            }
        }
        filterModel.setResult(0, fullResult);
        return filterModel;
    }
    async triggerFilterPreferences(query) {
        if (this.searchInProgress) {
            this.searchInProgress.dispose(true);
            this.searchInProgress = null;
        }
        // Trigger the local search. If it didn't find an exact match, trigger the remote search.
        const searchInProgress = (this.searchInProgress = new CancellationTokenSource());
        return this.searchDelayer.trigger(async () => {
            if (searchInProgress.token.isCancellationRequested) {
                return;
            }
            const localResults = await this.localFilterPreferences(query, searchInProgress.token);
            if (localResults &&
                !localResults.exactMatch &&
                !searchInProgress.token.isCancellationRequested) {
                await this.remoteSearchPreferences(query, searchInProgress.token);
            }
            // Update UI only after all the search results are in
            // ref https://github.com/microsoft/vscode/issues/224946
            this.onDidFinishSearch();
        });
    }
    onDidFinishSearch() {
        this.tocTreeModel.currentSearchModel = this.searchResultModel;
        this.tocTreeModel.update();
        this.tocTree.setFocus([]);
        this.viewState.filterToCategory = undefined;
        this.tocTree.expandAll();
        this.settingsTree.scrollTop = 0;
        this.refreshTOCTree();
        this.renderTree(undefined, true);
    }
    localFilterPreferences(query, token) {
        const localSearchProvider = this.preferencesSearchService.getLocalSearchProvider(query);
        return this.searchWithProvider(0 /* SearchResultIdx.Local */, localSearchProvider, token);
    }
    remoteSearchPreferences(query, token) {
        const remoteSearchProvider = this.preferencesSearchService.getRemoteSearchProvider(query);
        if (!remoteSearchProvider) {
            return Promise.resolve(null);
        }
        return this.searchWithProvider(1 /* SearchResultIdx.Remote */, remoteSearchProvider, token);
    }
    async searchWithProvider(type, searchProvider, token) {
        const result = await this._searchPreferencesModel(this.defaultSettingsEditorModel, searchProvider, token);
        if (token.isCancellationRequested) {
            // Handle cancellation like this because cancellation is lost inside the search provider due to async/await
            return null;
        }
        this.searchResultModel ??= this.instantiationService.createInstance(SearchResultModel, this.viewState, this.settingsOrderByTocIndex, this.workspaceTrustManagementService.isWorkspaceTrusted());
        this.searchResultModel.setResult(type, result);
        return result;
    }
    renderResultCountMessages() {
        if (!this.currentSettingsModel) {
            return;
        }
        this.clearFilterLinkContainer.style.display =
            this.viewState.tagFilters && this.viewState.tagFilters.size > 0 ? 'initial' : 'none';
        if (!this.searchResultModel) {
            if (this.countElement.style.display !== 'none') {
                this.searchResultLabel = null;
                this.updateInputAriaLabel();
                this.countElement.style.display = 'none';
                this.countElement.innerText = '';
                this.layout(this.dimension);
            }
            this.rootElement.classList.remove('no-results');
            this.splitView.el.style.visibility = 'visible';
            return;
        }
        else {
            const count = this.searchResultModel.getUniqueResultsCount();
            let resultString;
            switch (count) {
                case 0:
                    resultString = localize('noResults', 'No Settings Found');
                    break;
                case 1:
                    resultString = localize('oneResult', '1 Setting Found');
                    break;
                default:
                    resultString = localize('moreThanOneResult', '{0} Settings Found', count);
            }
            this.searchResultLabel = resultString;
            this.updateInputAriaLabel();
            this.countElement.innerText = resultString;
            aria.status(resultString);
            if (this.countElement.style.display !== 'block') {
                this.countElement.style.display = 'block';
                this.layout(this.dimension);
            }
            this.rootElement.classList.toggle('no-results', count === 0);
            this.splitView.el.style.visibility = count === 0 ? 'hidden' : 'visible';
        }
    }
    async _searchPreferencesModel(model, provider, token) {
        try {
            return await provider.searchModel(model, token);
        }
        catch (err) {
            if (isCancellationError(err)) {
                return Promise.reject(err);
            }
            else {
                return null;
            }
        }
    }
    layoutSplitView(dimension) {
        if (!this.isVisible()) {
            return;
        }
        const listHeight = dimension.height - (72 + 11 + 14); /* header height + editor padding */
        this.splitView.el.style.height = `${listHeight}px`;
        // We call layout first so the splitView has an idea of how much
        // space it has, otherwise setViewVisible results in the first panel
        // showing up at the minimum size whenever the Settings editor
        // opens for the first time.
        this.splitView.layout(this.bodyContainer.clientWidth, listHeight);
        const tocBehavior = this.configurationService.getValue(SEARCH_TOC_BEHAVIOR_KEY);
        const hideTocForSearch = tocBehavior === 'hide' && this.searchResultModel;
        if (!hideTocForSearch) {
            const firstViewWasVisible = this.splitView.isViewVisible(0);
            const firstViewVisible = this.bodyContainer.clientWidth >= SettingsEditor2_1.NARROW_TOTAL_WIDTH;
            this.splitView.setViewVisible(0, firstViewVisible);
            // If the first view is again visible, and we have enough space, immediately set the
            // editor to use the reset width rather than the cached min width
            if (!firstViewWasVisible &&
                firstViewVisible &&
                this.bodyContainer.clientWidth >=
                    SettingsEditor2_1.EDITOR_MIN_WIDTH + SettingsEditor2_1.TOC_RESET_WIDTH) {
                this.splitView.resizeView(0, SettingsEditor2_1.TOC_RESET_WIDTH);
            }
            this.splitView.style({
                separatorBorder: firstViewVisible
                    ? this.theme.getColor(settingsSashBorder)
                    : Color.transparent,
            });
        }
    }
    saveState() {
        if (this.isVisible()) {
            const searchQuery = this.searchWidget.getValue().trim();
            const target = this.settingsTargetsWidget.settingsTarget;
            if (this.input) {
                this.editorMemento.saveEditorState(this.group, this.input, { searchQuery, target });
            }
        }
        else if (this.input) {
            this.editorMemento.clearEditorState(this.input, this.group);
        }
        super.saveState();
    }
};
SettingsEditor2 = SettingsEditor2_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IWorkbenchConfigurationService),
    __param(3, ITextResourceConfigurationService),
    __param(4, IThemeService),
    __param(5, IPreferencesService),
    __param(6, IInstantiationService),
    __param(7, IPreferencesSearchService),
    __param(8, ILogService),
    __param(9, IContextKeyService),
    __param(10, IStorageService),
    __param(11, IEditorGroupsService),
    __param(12, IUserDataSyncWorkbenchService),
    __param(13, IUserDataSyncEnablementService),
    __param(14, IWorkspaceTrustManagementService),
    __param(15, IExtensionService),
    __param(16, ILanguageService),
    __param(17, IExtensionManagementService),
    __param(18, IProductService),
    __param(19, IExtensionGalleryService),
    __param(20, IEditorProgressService),
    __param(21, IUserDataProfileService)
], SettingsEditor2);
export { SettingsEditor2 };
let SyncControls = class SyncControls extends Disposable {
    constructor(window, container, commandService, userDataSyncService, userDataSyncEnablementService, telemetryService) {
        super();
        this.commandService = commandService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this._onDidChangeLastSyncedLabel = this._register(new Emitter());
        this.onDidChangeLastSyncedLabel = this._onDidChangeLastSyncedLabel.event;
        const headerRightControlsContainer = DOM.append(container, $('.settings-right-controls'));
        const turnOnSyncButtonContainer = DOM.append(headerRightControlsContainer, $('.turn-on-sync'));
        this.turnOnSyncButton = this._register(new Button(turnOnSyncButtonContainer, { title: true, ...defaultButtonStyles }));
        this.lastSyncedLabel = DOM.append(headerRightControlsContainer, $('.last-synced-label'));
        DOM.hide(this.lastSyncedLabel);
        this.turnOnSyncButton.enabled = true;
        this.turnOnSyncButton.label = localize('turnOnSyncButton', 'Backup and Sync Settings');
        DOM.hide(this.turnOnSyncButton.element);
        this._register(this.turnOnSyncButton.onDidClick(async () => {
            await this.commandService.executeCommand('workbench.userDataSync.actions.turnOn');
        }));
        this.updateLastSyncedTime();
        this._register(this.userDataSyncService.onDidChangeLastSyncTime(() => {
            this.updateLastSyncedTime();
        }));
        const updateLastSyncedTimer = this._register(new DOM.WindowIntervalTimer());
        updateLastSyncedTimer.cancelAndSet(() => this.updateLastSyncedTime(), 60 * 1000, window);
        this.update();
        this._register(this.userDataSyncService.onDidChangeStatus(() => {
            this.update();
        }));
        this._register(this.userDataSyncEnablementService.onDidChangeEnablement(() => {
            this.update();
        }));
    }
    updateLastSyncedTime() {
        const last = this.userDataSyncService.lastSyncTime;
        let label;
        if (typeof last === 'number') {
            const d = fromNow(last, true, undefined, true);
            label = localize('lastSyncedLabel', 'Last synced: {0}', d);
        }
        else {
            label = '';
        }
        this.lastSyncedLabel.textContent = label;
        this._onDidChangeLastSyncedLabel.fire(label);
    }
    update() {
        if (this.userDataSyncService.status === "uninitialized" /* SyncStatus.Uninitialized */) {
            return;
        }
        if (this.userDataSyncEnablementService.isEnabled() ||
            this.userDataSyncService.status !== "idle" /* SyncStatus.Idle */) {
            DOM.show(this.lastSyncedLabel);
            DOM.hide(this.turnOnSyncButton.element);
        }
        else {
            DOM.hide(this.lastSyncedLabel);
            DOM.show(this.turnOnSyncButton.element);
        }
    }
};
SyncControls = __decorate([
    __param(2, ICommandService),
    __param(3, IUserDataSyncService),
    __param(4, IUserDataSyncEnablementService),
    __param(5, ITelemetryService)
], SyncControls);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NFZGl0b3IyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc0VkaXRvcjIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLElBQUksTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEVBRVAsaUJBQWlCLEdBQ2pCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBS2xGLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixhQUFhLEVBQ2IsZUFBZSxFQUNmLGVBQWUsRUFDZixjQUFjLEVBQ2QsZ0JBQWdCLEdBQ2hCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sOEJBQThCLEVBQzlCLG9CQUFvQixHQUVwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUN6RyxPQUFPLEVBQWtCLHFCQUFxQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDL0UsT0FBTyxFQUFhLG1CQUFtQixFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzdFLE9BQU8sRUFDTix1QkFBdUIsRUFHdkIsa0NBQWtDLEVBQ2xDLGlDQUFpQyxFQUNqQyxtQkFBbUIsRUFDbkIsWUFBWSxFQUNaLG9CQUFvQixHQUNwQixNQUFNLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFFTixVQUFVLEVBRVYsaUJBQWlCLEVBR2pCLHdCQUF3QixFQUN4QixpQkFBaUIsRUFDakIsMEJBQTBCLEdBQzFCLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDdkUsT0FBTyxFQUNOLHVCQUF1QixFQUN2QiwwQkFBMEIsRUFDMUIsNkJBQTZCLEVBQzdCLHFCQUFxQixFQUNyQixzQkFBc0IsRUFDdEIsMEJBQTBCLEVBQzFCLHFCQUFxQixFQUNyQixtQkFBbUIsRUFDbkIsY0FBYyxFQUNkLHlCQUF5QixFQUV6QixvQkFBb0IsRUFDcEIsb0JBQW9CLEVBQ3BCLGtCQUFrQixFQUNsQixxQ0FBcUMsRUFDckMsNENBQTRDLEVBQzVDLHVDQUF1QyxFQUN2QywyQkFBMkIsRUFDM0Isa0NBQWtDLEdBQ2xDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixrQkFBa0IsRUFDbEIsdUJBQXVCLEdBQ3ZCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFFTixtQkFBbUIsRUFNbkIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQiw2QkFBNkIsR0FDN0IsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFNBQVMsR0FDVCxNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzFHLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsOEJBQThCLEdBQzlCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFlLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLDhDQUE4QyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDeEYsT0FBTyxFQUNOLHdCQUF3QixFQUN4QiwyQkFBMkIsR0FFM0IsTUFBTSx3RUFBd0UsQ0FBQTtBQUUvRSxPQUFPLEVBRU4sVUFBVSxHQUVWLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUd6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUVyRyxNQUFNLENBQU4sSUFBa0Isb0JBS2pCO0FBTEQsV0FBa0Isb0JBQW9CO0lBQ3JDLG1FQUFNLENBQUE7SUFDTixxRkFBZSxDQUFBO0lBQ2YsNkVBQVcsQ0FBQTtJQUNYLG1GQUFjLENBQUE7QUFDZixDQUFDLEVBTGlCLG9CQUFvQixLQUFwQixvQkFBb0IsUUFLckM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLEtBQStCO0lBRS9CLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDekMsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDO1lBQ1YsUUFBUSxFQUFFLENBQUMsWUFBWSx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDcEYsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFNZixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsMEJBQTBCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtBQUM5RSxNQUFNLHVCQUF1QixHQUFHLDhDQUE4QyxDQUFBO0FBRTlFLE1BQU0seUJBQXlCLEdBQUcscUJBQXFCLENBQUE7QUFDaEQsSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZ0IsU0FBUSxVQUFVOzthQUM5QixPQUFFLEdBQVcsNEJBQTRCLEFBQXZDLENBQXVDO2FBQzFDLGtCQUFhLEdBQVcsQ0FBQyxBQUFaLENBQVk7YUFDekIsb0JBQWUsR0FBVyxHQUFHLEFBQWQsQ0FBYzthQUM3QixpQ0FBNEIsR0FBVyxHQUFHLEFBQWQsQ0FBYzthQUMxQyxpQ0FBNEIsR0FBVyxJQUFJLEFBQWYsQ0FBZTthQUMzQyxpQ0FBNEIsR0FBRyxHQUFHLEFBQU4sQ0FBTTthQUNsQyxrQkFBYSxHQUFXLEdBQUcsQUFBZCxDQUFjO2FBQzNCLG9CQUFlLEdBQVcsR0FBRyxBQUFkLENBQWM7YUFDN0IscUJBQWdCLEdBQVcsR0FBRyxBQUFkLENBQWM7SUFDN0MsMkVBQTJFO2FBQzVELHVCQUFrQixHQUFXLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixBQUF2RCxDQUF1RDthQUV6RSxnQkFBVyxHQUFhO1FBQ3RDLElBQUksb0JBQW9CLEVBQUU7UUFDMUIscUJBQXFCO1FBQ3JCLDJCQUEyQjtRQUMzQixRQUFRLHFDQUFxQyxFQUFFO1FBQy9DLFFBQVEsMkJBQTJCLEVBQUU7UUFDckMsV0FBVztRQUNYLHlCQUF5QjtRQUN6QixnQkFBZ0I7UUFDaEIsb0JBQW9CO1FBQ3BCLGNBQWM7UUFDZCxtQkFBbUI7UUFDbkIsSUFBSSxjQUFjLEVBQUU7UUFDcEIsSUFBSSxxQkFBcUIsRUFBRTtRQUMzQixJQUFJLG1CQUFtQixLQUFLO1FBQzVCLElBQUksbUJBQW1CLFVBQVU7UUFDakMsSUFBSSxtQkFBbUIsUUFBUTtRQUMvQixJQUFJLG1CQUFtQixPQUFPO1FBQzlCLElBQUksbUJBQW1CLFlBQVk7UUFDbkMsSUFBSSxtQkFBbUIsVUFBVTtRQUNqQyxJQUFJLG1CQUFtQixNQUFNO1FBQzdCLElBQUksbUJBQW1CLFVBQVU7UUFDakMsSUFBSSxtQkFBbUIsUUFBUTtRQUMvQixJQUFJLG1CQUFtQixVQUFVO1FBQ2pDLElBQUksbUJBQW1CLFFBQVE7UUFDL0IsSUFBSSxtQkFBbUIsVUFBVTtRQUNqQyxJQUFJLG1CQUFtQixVQUFVO1FBQ2pDLElBQUksa0JBQWtCLEVBQUU7S0FDeEIsQUE1QnlCLENBNEJ6QjtJQUVPLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxJQUEyQztRQUNqRixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6QixxQ0FBcUM7WUFDckMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsT0FBTyxDQUNOLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxJQUFJO1lBQzlCLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxLQUFLO1lBQy9CLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxhQUFhO1lBQ3ZDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxNQUFNO1lBQ2hDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPO1lBQ2pDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPO1lBQ2pDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPO1lBQ2pDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQyxPQUFPLENBQ2pDLENBQUE7SUFDRixDQUFDO0lBNEVELFlBQ0MsS0FBbUIsRUFDQSxnQkFBbUMsRUFFdEQsb0JBQXFFLEVBRXJFLGdDQUFtRSxFQUNwRCxZQUEyQixFQUNyQixrQkFBd0QsRUFDdEQsb0JBQTRELEVBQ3hELHdCQUFvRSxFQUNsRixVQUF3QyxFQUNqQyxpQkFBcUMsRUFDeEMsY0FBZ0QsRUFDM0Msa0JBQWtELEVBRXhFLDRCQUE0RSxFQUU1RSw2QkFBOEUsRUFFOUUsK0JBQWtGLEVBQy9ELGdCQUFvRCxFQUNyRCxlQUFrRCxFQUVwRSwwQkFBd0UsRUFDdkQsY0FBZ0QsRUFDdkMsdUJBQWtFLEVBQ3BFLHFCQUE4RCxFQUM3RCxzQkFBK0M7UUFFeEUsS0FBSyxDQUFDLGlCQUFlLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUE7UUExQi9ELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBZ0M7UUFJL0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3ZDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFDakUsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUVuQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDakMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUV2RCxpQ0FBNEIsR0FBNUIsNEJBQTRCLENBQStCO1FBRTNELGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFFN0Qsb0NBQStCLEdBQS9CLCtCQUErQixDQUFrQztRQUM5QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3BDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUVuRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ3RDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN0Qiw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ25ELDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBd0I7UUFuRnRFLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBcUIsQ0FBQyxDQUFBO1FBUXZGLHFCQUFnQixHQUFtQyxJQUFJLENBQUE7UUFPdkQseUJBQW9CLEdBSWpCLElBQUksQ0FBQTtRQUdFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBcUIsQ0FBQyxDQUFBO1FBQ3hGLHNCQUFpQixHQUFrQixJQUFJLENBQUE7UUFDdkMsb0JBQWUsR0FBa0IsSUFBSSxDQUFBO1FBQ3JDLDRCQUF1QixHQUErQixJQUFJLENBQUE7UUFRMUQseUJBQW9CLHVDQUFvRDtRQUVoRiwwQkFBMEI7UUFDbEIsNkJBQXdCLEdBQUcsS0FBSyxDQUFBO1FBQ2hDLG9CQUFlLEdBQUcsS0FBSyxDQUFBO1FBS3ZCLHNCQUFpQixHQUFvQyxJQUFJLENBQUE7UUFDekQsdUJBQWtCLEdBQStCLElBQUksQ0FBQTtRQUNyRCwwQkFBcUIsR0FBRyxDQUFDLENBQUE7UUFHekIsMEJBQXFCLEdBQWEsRUFBRSxDQUFBO1FBQ3BDLCtCQUEwQixHQUFhLEVBQUUsQ0FBQTtRQUVoQyw2Q0FBd0MsR0FDeEQsNENBQTRDLENBQUE7UUFDNUIsMkNBQXNDLEdBQUcsSUFBSSxDQUFBO1FBbUM3RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxjQUFjLHdDQUFnQyxFQUFFLENBQUE7UUFFbkUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksT0FBTyxDQUFPLGlCQUFlLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUMvRixJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxPQUFPLENBQU8saUJBQWUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBRS9GLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLE9BQU8sQ0FBTyxpQkFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzVFLElBQUksQ0FBQywwQkFBMEIsR0FBRyxJQUFJLE9BQU8sQ0FDNUMsaUJBQWUsQ0FBQyw0QkFBNEIsQ0FDNUMsQ0FBQTtRQUVELElBQUksQ0FBQywwQkFBMEIsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMscUJBQXFCLEdBQUcsNkJBQTZCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDcEYsSUFBSSxDQUFDLGFBQWEsR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsMEJBQTBCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFN0UsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUEyQixDQUFBO1FBRTVELElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUN6QyxrQkFBa0IsRUFDbEIsZ0NBQWdDLEVBQ2hDLHlCQUF5QixDQUN6QixDQUFBO1FBRUQsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxjQUFjO2FBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLGdDQUF3QixFQUFFLENBQUM7YUFDNUUsS0FBSyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFBO1FBRXBELElBQUksQ0FBQyxTQUFTLENBQ2Isb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxNQUFNLHdDQUFnQyxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3BDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYiwrQkFBK0IsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDckQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLG9CQUFvQixDQUMzQywrQkFBK0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUNwRCxDQUFBO1lBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQ2hELCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQ3BELENBQUE7Z0JBQ0QsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ2xCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixvQkFBb0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3hELElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsMEJBQTBCLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFO1lBQ3RELElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLDBCQUEwQixDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUN2RCxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtRQUN0QyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRTdELElBQ0Msc0JBQXNCO1lBQ3RCLENBQUMsaUJBQWUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksb0JBQW9CLEVBQUUsQ0FBQyxFQUNoRSxDQUFDO1lBQ0YsaUJBQWUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFDRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDO0lBRU8sS0FBSyxDQUFDLHlCQUF5QjtRQUN0QyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUM1QyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLGNBQWM7aUJBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLGdDQUF3QixFQUFFLENBQUM7aUJBQzVFLEtBQUssQ0FBQyxJQUFJLENBQUMsc0NBQXNDLENBQUMsQ0FBQTtZQUNwRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxpQkFBZSxDQUFDLGdCQUFnQixDQUFBO0lBQ3hDLENBQUM7SUFDRCxJQUFhLFlBQVk7UUFDeEIsT0FBTyxNQUFNLENBQUMsaUJBQWlCLENBQUE7SUFDaEMsQ0FBQztJQUNELElBQWEsYUFBYTtRQUN6QixPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFRCxtRUFBbUU7SUFDbkUsSUFBYSxZQUFZLENBQUMsS0FBYTtRQUN0QyxRQUFRO0lBQ1QsQ0FBQztJQUNELElBQWEsWUFBWSxDQUFDLEtBQWE7UUFDdEMsUUFBUTtJQUNULENBQUM7SUFFRCxJQUFZLG9CQUFvQjtRQUMvQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO0lBQzlELENBQUM7SUFFRCxJQUFZLGlCQUFpQjtRQUM1QixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFBO0lBQzdDLENBQUM7SUFFRCxJQUFZLGlCQUFpQixDQUFDLEtBQStCO1FBQzVELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLFNBQVMsQ0FBQTtRQUVsRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUVELElBQVksd0JBQXdCO1FBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLENBQUMsT0FBTyxZQUFZLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztZQUN0RCxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLDJCQUEyQixDQUN2RCxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxFQUNsQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNMLENBQUM7SUFFRCxJQUFJLG1CQUFtQjtRQUN0QixPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0lBRVMsWUFBWSxDQUFDLE1BQW1CO1FBQ3pDLE1BQU0sQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVoRixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUVuQixJQUFJLENBQUMsU0FBUyxDQUNiLDBCQUEwQixDQUFDO1lBQzFCLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDO1lBQ3RCLGVBQWUsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztZQUNELG1CQUFtQixFQUFFLEdBQUcsRUFBRTtnQkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7b0JBQ3JELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtnQkFDbkIsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFUSxLQUFLLENBQUMsUUFBUSxDQUN0QixLQUEyQixFQUMzQixPQUEyQyxFQUMzQyxPQUEyQixFQUMzQixLQUF3QjtRQUV4QixJQUFJLENBQUMsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3hDLElBQUksS0FBSyxDQUFDLHVCQUF1QixJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQy9FLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ3hCLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQzVDLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1QyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsS0FBSyxDQUFBO1FBRXZDLE9BQU8sR0FBRyxPQUFPLElBQUksNkJBQTZCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2xGLE1BQU0seUJBQXlCLEdBQzlCLE9BQU8sQ0FBQyxTQUFTLElBQUssT0FBTyxDQUFDLFNBQXNDLENBQUMsY0FBYyxDQUFBO1lBQ3BGLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDbkQsT0FBTyxDQUFDLE1BQU0seUNBQWlDLENBQUE7WUFDaEQsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXpCLHFFQUFxRTtRQUNyRSxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQzlDLDBDQUEwQztZQUMxQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO2dCQUN6RCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMvQixDQUFDLENBQUMsQ0FBQTtZQUVGLHFCQUFxQjtZQUNyQixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUM1QixDQUFDLENBQUMsQ0FBQTtRQUVGLE1BQU0sSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUE7SUFDNUMsQ0FBQztJQUVPLEtBQUssQ0FBQyw4QkFBOEI7UUFDM0MsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNoRixJQUFJLENBQUMscUJBQXFCLEdBQUcsbUJBQW1CO2FBQzlDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDO2FBQ3hELEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNsQyxDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUYsSUFBSSxXQUFXLElBQUksT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzNELFdBQVcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUVELElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQTtZQUN6QyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQTtZQUMxRCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUE7WUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsT0FBTyxXQUFXLElBQUksSUFBSSxDQUFBO0lBQzNCLENBQUM7SUFFUSxZQUFZO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRVEsVUFBVSxDQUFDLE9BQTJDO1FBQzlELEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFekIsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsT0FBK0I7UUFDbEQsSUFBSSxPQUFPLENBQUMsV0FBVyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzVDLGtCQUFrQjtZQUNsQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDbkIsQ0FBQztRQUVELE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLFNBQVM7WUFDM0MsQ0FBQyxDQUFFLE9BQU8sQ0FBQyxTQUFzQztZQUNqRCxDQUFDLENBQUMsU0FBUyxDQUFBO1FBRVosTUFBTSxLQUFLLEdBQXVCLGtCQUFrQixFQUFFLEtBQUssSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFBO1FBQzVFLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUM3QixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQ1gsT0FBTyxDQUFDLFNBQVM7WUFDakIsa0JBQWtCLEVBQUUsY0FBYztZQUNOLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDM0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEQsQ0FBQztJQUNGLENBQUM7SUFFUSxVQUFVO1FBQ2xCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDMUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFRCxNQUFNLENBQUMsU0FBd0I7UUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7UUFFMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUvQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFBLENBQUMsa0NBQWtDO1FBQzFILHVHQUF1RztRQUN2RyxNQUFNLFdBQVcsR0FDaEIsVUFBVSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUE7UUFDeEYsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVELElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDaEMsY0FBYyxFQUNkLFNBQVMsQ0FBQyxLQUFLLEdBQUcsaUJBQWUsQ0FBQyxrQkFBa0IsQ0FDcEQsQ0FBQTtJQUNGLENBQUM7SUFFUSxLQUFLO1FBQ2IsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRWIsSUFBSSxJQUFJLENBQUMsb0JBQW9CLHdDQUFnQyxFQUFFLENBQUM7WUFDL0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckIsVUFBVTtnQkFDVixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDbkIsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsZ0RBQXdDLEVBQUUsQ0FBQztZQUM5RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUE7WUFDN0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQy9FLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsQ0FBQztvQkFBYyxPQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQy9CLE9BQU07Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsb0JBQW9CLDZDQUFxQyxFQUFFLENBQUM7WUFDM0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM3QixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsb0JBQW9CLGlEQUF5QyxFQUFFLENBQUM7WUFDL0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVrQixnQkFBZ0IsQ0FBQyxPQUFnQjtRQUNuRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFL0IsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsaURBQWlEO1lBQ2pELFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDekMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ04sQ0FBQztJQUNGLENBQUM7SUFFRCxhQUFhLENBQUMsaUJBQWlCLEdBQUcsS0FBSztRQUN0QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUMvQixDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUU1QixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsWUFBWTtpQkFDM0MsY0FBYyxFQUFFO2lCQUNoQixhQUFhLENBQUMsWUFBWSx1QkFBdUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUE7WUFDdkUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixDQUFDO2dCQUFjLG1CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzVDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFRCxlQUFlO1FBQ2QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUE7UUFDaEQsSUFBSSxVQUFVLElBQUksT0FBTyxZQUFZLDBCQUEwQixFQUFFLENBQUM7WUFDakUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDM0QsQ0FBQztJQUNGLENBQUM7SUFFRCxXQUFXLENBQUMsTUFBZSxFQUFFLFNBQVMsR0FBRyxJQUFJO1FBQzVDLElBQUksTUFBTSxJQUFJLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNuQixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUE7UUFFMUMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNuRCxPQUFPLENBQ04sSUFBSSxDQUFDLE1BQU07Z0JBQ1gsQ0FBQyxpQkFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDOUUsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFBO1FBQzFCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsS0FBSyxJQUFJLEtBQUssSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLEtBQUssSUFBSSxLQUFLLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUNyQyxDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssWUFBWSxDQUFDLE1BQW1CO1FBQ3ZDLElBQUksQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQTtRQUVoRSxNQUFNLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQTtRQUVoRixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3RDLElBQUksTUFBTSxDQUNULDRDQUE0QyxFQUM1QyxRQUFRLENBQUMsWUFBWSxFQUFFLDZCQUE2QixDQUFDLEVBQ3JELFNBQVMsQ0FBQyxXQUFXLENBQUMseUJBQXlCLENBQUMsRUFDaEQsS0FBSyxFQUNMLEtBQUssSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQ3JDLENBQ0QsQ0FBQTtRQUNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2xDLElBQUksTUFBTSxDQUNULHVDQUF1QyxFQUN2QyxRQUFRLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLEVBQzFDLFNBQVMsQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsQ0FDNUMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNqQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxtQkFBbUIsRUFDbkIsR0FBRyxpQkFBZSxDQUFDLEVBQUUsWUFBWSxFQUNqQyxlQUFlLEVBQ2Y7WUFDQyxpQkFBaUIsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDN0IsY0FBYyxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUU7Z0JBQ2pDLDZFQUE2RTtnQkFDN0UsOEZBQThGO2dCQUM5RixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNyQyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLENBQUMsRUFBRSxDQUFDO29CQUM5RSxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZTt5QkFDMUMsd0JBQXdCLEVBQUU7eUJBQzFCLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO3dCQUNuQixPQUFPLElBQUksb0JBQW9CLEdBQUcsVUFBVSxHQUFHLENBQUE7b0JBQ2hELENBQUMsQ0FBQzt5QkFDRCxJQUFJLEVBQUUsQ0FBQTtvQkFDUixPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO2dCQUMzRSxDQUFDO3FCQUFNLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxFQUFFLENBQUM7b0JBQ3RGLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQjt5QkFDeEQsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7d0JBQ3BCLE9BQU8sSUFBSSxxQkFBcUIsR0FBRyxXQUFXLEdBQUcsQ0FBQTtvQkFDbEQsQ0FBQyxDQUFDO3lCQUNELElBQUksRUFBRSxDQUFBO29CQUNSLE9BQU8sdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtnQkFDakYsQ0FBQztxQkFBTSxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM5RCxPQUFPLGlCQUFlLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDcEYsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUNuQyxDQUFBO2dCQUNGLENBQUM7Z0JBQ0QsT0FBTyxFQUFFLENBQUE7WUFDVixDQUFDO1NBQ0QsRUFDRCxjQUFjLEVBQ2QsNEJBQTRCLEdBQUcsaUJBQWUsQ0FBQyxhQUFhLEVBQUUsRUFDOUQ7WUFDQyxlQUFlLEVBQUUsY0FBYztZQUMvQixlQUFlLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtZQUMzQyxjQUFjLEVBQUU7Z0JBQ2YsV0FBVyxFQUFFLHVCQUF1QjthQUNwQztZQUNELGtCQUFrQjtTQUNsQixDQUNELENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2pDLElBQUksQ0FBQyxvQkFBb0Isc0NBQThCLENBQUE7UUFDeEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FDN0IsZUFBZSxFQUNmLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0RBQWdELENBQUMsQ0FDdkQsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUM5RCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsYUFBYSxhQUFhLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQTtRQUU3RSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDOUMsZ0JBQWdCLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDdEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1FBQ2hHLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFL0UsTUFBTSxxQkFBcUIsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUN2Qyx1QkFBdUIsRUFDdkIsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQy9CLENBQUE7UUFDRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRTtZQUN0RixvQkFBb0IsRUFBRSxJQUFJO1NBQzFCLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMseUNBQWlDLENBQUE7UUFDMUUsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUN2RCxJQUFJLENBQUMseUJBQXlCLENBQUMsTUFBTSxDQUFDLENBQ3RDLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMxQyxJQUFJLEtBQUssQ0FBQyxPQUFPLCtCQUFzQixFQUFFLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQ0MsSUFBSSxDQUFDLDRCQUE0QixDQUFDLE9BQU87WUFDekMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLG1CQUFtQixFQUFFLEVBQ3ZELENBQUM7WUFDRixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUN2QyxZQUFZLEVBQ1osSUFBSSxDQUFDLE1BQU0sRUFDWCx1QkFBdUIsQ0FDdkIsQ0FDRCxDQUFBO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxlQUFlLEVBQUUsRUFBRTtnQkFDM0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7Z0JBQ3RDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1lBQzVCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUVuRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ25DLHNCQUFzQixFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUMzQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNuQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzlDLDhDQUE4QyxFQUM5QyxNQUFNLEVBQ04sT0FBTyxFQUNQLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBQyxZQUFZLENBQ2pCLENBQUE7Z0JBQ0YsQ0FBQztnQkFDRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUE7UUFFRCxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxNQUFzQjtRQUN2RCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUE7UUFFdEMsOEZBQThGO1FBQzlGLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFTyw0QkFBNEIsQ0FBQyxXQUFtQjtRQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNELElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUN4QixJQUFJLENBQUMsd0NBQXdDLEVBQzdDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLDJEQUdqRixDQUFBO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEdBQTJCLEVBQUUsUUFBa0I7UUFDeEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUN4QixJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQTtZQUNuQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUMvRCxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDekIsU0FBUyxHQUFHLFVBQVUsQ0FBQTtnQkFDdkIsQ0FBQztZQUNGLENBQUM7WUFBQyxNQUFNLENBQUM7Z0JBQ1IsbUVBQW1FO1lBQ3BFLENBQUM7WUFFRCx3RUFBd0U7WUFDeEUsMENBQTBDO1lBQzFDLHNGQUFzRjtZQUN0RixrREFBa0Q7WUFDbEQsZ0VBQWdFO1lBQ2hFLElBQ0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0I7Z0JBQy9CLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxLQUFLLGFBQWEsQ0FBQyxlQUFlLEVBQzNELENBQUM7Z0JBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDMUIsQ0FBQztZQUNELElBQUksQ0FBQztnQkFDSixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbkQsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osc0RBQXNEO2dCQUN0RCxpRUFBaUU7Z0JBQ2pFLGlDQUFpQztnQkFDakMsWUFBWSxHQUFHLElBQUksQ0FBQTtZQUNwQixDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuQix1RkFBdUY7Z0JBQ3ZGLGlGQUFpRjtnQkFDakYsdUNBQXVDO2dCQUN2QyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUNmLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtnQkFDNUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO2dCQUVOLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FDcEUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFDbEMsR0FBRyxDQUFDLFNBQVMsQ0FDYixDQUFBO2dCQUNELElBQUksV0FBVyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNuQyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLGdCQUFnQixDQUFDLENBQUE7b0JBQ3RGLElBQUksT0FBTyxFQUFFLENBQUM7d0JBQ2IsQ0FBQzt3QkFBYyxPQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBQ2hDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsYUFBYSxJQUFJLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDbkQsdUVBQXVFO1lBQ3ZFLDZDQUE2QztZQUM3QyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNYLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUM5QixJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xDLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRCxvQkFBb0I7UUFDbkIsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUE7UUFDNUQsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCLENBQzdCLE9BQWdDO1FBRWhDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FBQTtRQUV2RSxNQUFNLFdBQVcsR0FBeUI7WUFDekMsVUFBVSxFQUFFLElBQUk7WUFDaEIsT0FBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN0QixHQUFHLE9BQU87U0FDVixDQUFBO1FBQ0QsSUFBSSxxQkFBcUIsMkNBQW1DLEVBQUUsQ0FBQztZQUM5RCxJQUFJLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUMxQyxVQUFVLENBQUMsYUFBYSxDQUN4QixDQUFDLDBCQUEwQixFQUFFLENBQUE7Z0JBQzlCLE1BQU0sa0JBQWtCLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUE7Z0JBQ3JGLElBQUksa0JBQWtCLElBQUksa0JBQWtCLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztvQkFDM0UsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3BFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0QsQ0FBQzthQUFNLElBQUkscUJBQXFCLDRDQUFvQyxFQUFFLENBQUM7WUFDdEUsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDL0QsQ0FBQzthQUFNLElBQUkscUJBQXFCLDBDQUFrQyxFQUFFLENBQUM7WUFDcEUsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDbEUsQ0FBQzthQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUM7Z0JBQ2pELFNBQVMsRUFBRSxxQkFBcUI7Z0JBQ2hDLEdBQUcsV0FBVzthQUNkLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQW1CO1FBQ3JDLElBQUksQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUU1RCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFFaEYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFFNUUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBRTlELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ2pELE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQ2pDLElBQUksQ0FBQyx3QkFBd0IsRUFDN0IsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUMxRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixHQUFHLENBQUMscUJBQXFCLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBYSxFQUFFLEVBQUU7WUFDakYsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQzFCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUVoRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUVuRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO1FBRTFELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDckMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBRW5ELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUIsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUNqQyxXQUFXLGdDQUF3QjtZQUNuQyxrQkFBa0IsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQ2xELGdDQUFnQyxnQ0FFaEMsaUJBQWUsQ0FBQyxlQUFlLENBQy9CLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FDckI7WUFDQyxXQUFXLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDdkIsT0FBTyxFQUFFLElBQUksQ0FBQyxnQkFBZ0I7WUFDOUIsV0FBVyxFQUFFLGlCQUFlLENBQUMsYUFBYTtZQUMxQyxXQUFXLEVBQUUsTUFBTSxDQUFDLGlCQUFpQjtZQUNyQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUM1QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLEtBQUssSUFBSSxDQUFBO2dCQUNoRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkMsQ0FBQztTQUNELEVBQ0QsYUFBYSxFQUNiLFNBQVMsRUFDVCxJQUFJLENBQ0osQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUNyQjtZQUNDLFdBQVcsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUN2QixPQUFPLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtZQUNuQyxXQUFXLEVBQUUsaUJBQWUsQ0FBQyxnQkFBZ0I7WUFDN0MsV0FBVyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7WUFDckMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQTtnQkFDckQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3hDLENBQUM7U0FDRCxFQUNELE1BQU0sQ0FBQyxVQUFVLEVBQ2pCLFNBQVMsRUFDVCxJQUFJLENBQ0osQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFO1lBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQy9FLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxpQkFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzdELElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxTQUFTLEdBQUcsaUJBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUMxRSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUU7WUFDbkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLGdDQUFnQyxFQUNoQyxLQUFLLDJEQUdMLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUUsQ0FBQTtRQUM1RCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxTQUFzQjtRQUNqRCxJQUFJLENBQUMsU0FBUyxDQUNiLEdBQUcsQ0FBQyw2QkFBNkIsQ0FDaEMsU0FBUyxFQUNULEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUN0QixDQUFDLENBQXdCLEVBQUUsRUFBRTtZQUM1QixJQUNDLENBQUMsQ0FBQyxPQUFPLDBCQUFpQjtnQkFDMUIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUM5QyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQy9CLENBQUM7Z0JBQ0YsdUJBQXVCO2dCQUN2QixDQUFDLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFBO2dCQUNoQyxDQUFDLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLFNBQVMsQ0FBQyxTQUFzQjtRQUN2QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUUxRixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ3ZDLE9BQU8sRUFDUCxHQUFHLENBQUMsTUFBTSxDQUNULFNBQVMsRUFDVCxDQUFDLENBQUMsdUJBQXVCLEVBQUU7WUFDMUIsSUFBSSxFQUFFLFlBQVk7WUFDbEIsWUFBWSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO1NBQzlDLENBQUMsQ0FDRixFQUNELElBQUksQ0FBQyxTQUFTLENBQ2QsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUE7UUFFNUIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDNUIsSUFBSSxDQUFDLG9CQUFvQiwrQ0FBdUMsQ0FBQTtRQUNqRSxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbkMsTUFBTSxPQUFPLEdBQW9DLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUE7WUFDeEUsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ3hDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQTtZQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ25ELElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsS0FBSyxPQUFPLEVBQUUsQ0FBQztvQkFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLElBQUksU0FBUyxDQUFBO29CQUN0RCxxQ0FBcUM7b0JBQ3JDLGdEQUFnRDtvQkFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztZQUNGLENBQUM7aUJBQU0sSUFDTixPQUFPO2dCQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxJQUFJLENBQXlCLENBQUMsQ0FBQyxZQUFhLENBQUMsVUFBVSxDQUFDLEVBQ3ZFLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNwQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDM0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQzlCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1FBQzVCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sV0FBVyxDQUFDLE1BQWM7UUFDakMsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN6RSxtQ0FBbUM7WUFDbkMsTUFBTSxRQUFRLEdBQUcsR0FBRyxNQUFNLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFBO1lBQ3hFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLENBQUM7SUFDRixDQUFDO0lBRU8scUJBQXFCO1FBQzVCLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLG9CQUFvQixFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzVGLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3JELE1BQU0sUUFBUSxHQUFHLEtBQUs7aUJBQ3BCLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO2lCQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDWCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFNBQXNCO1FBQ2hELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQzlELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQzlDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FDdkUsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN4RCxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQ3BDLENBQ0QsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDdEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFFLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQzNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUMsQ0FDbkMsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7WUFDckMsSUFBSSxDQUFDLG9CQUFvQiw4Q0FBc0MsQ0FBQTtZQUMvRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2xDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE1BQTBCLEVBQUUsRUFBRTtZQUM3RSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQTtZQUNsQyxJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdkQsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osNEJBQTRCO1lBQzdCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLE9BQW1DLEVBQUUsRUFBRTtZQUN2RixJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM1QixJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ2hFLENBQUM7WUFFRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEtBQUssV0FBVyxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLHVDQUErQixDQUFBO1lBQ3ZFLENBQUM7aUJBQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUNyQyxJQUFJLENBQUMscUJBQXFCLENBQUMsWUFBWSx3Q0FBZ0MsQ0FBQTtZQUN4RSxDQUFDO2lCQUFNLElBQUksT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVkseUNBQWlDLENBQUE7WUFDekUsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdkMsWUFBWSxFQUNaLFNBQVMsRUFDVCxJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQ2xDLENBQ0QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ2xDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLEtBQUssSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQ2hFLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFBO1lBRXhELHVHQUF1RztZQUN2RyxtSEFBbUg7WUFDbkgsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDZixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUM1QixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDakMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFBO1lBQ2xFLElBQ0MsU0FBUztnQkFDVCxTQUFTLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztnQkFDakMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxFQUN6QyxDQUFDO2dCQUNGLElBQUksQ0FBQyxvQkFBb0IsMkNBQW1DLENBQUE7Z0JBQzVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2hDLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixJQUFJLElBQUksQ0FBQTtnQkFDekUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ3hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ2hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDakMsdURBQXVEO1lBQ3ZELGdEQUFnRDtZQUNoRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1FBQy9CLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCwwREFBMEQ7UUFDMUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDeEMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3QixJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDekMsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtZQUN6QyxDQUFDO1lBRUQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLE9BQU8sQ0FBQTtZQUVqQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtZQUN4QyxDQUFDO1lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN6RCxDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLGtCQUFrQixDQUN6QixHQUFXLEVBQ1gsS0FBVSxFQUNWLElBQTJDLEVBQzNDLFdBQW9CLEVBQ3BCLEtBQXFDO1FBRXJDLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDNUQsTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQTtRQUNqRCxJQUFJLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekYsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxRSxDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQTtRQUMxRCxJQUFJLGlCQUFlLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUMxQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUN6RSxDQUFBO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUMxQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUN6RSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDeEMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM1QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFBO1FBQzNELE1BQU0sT0FBTyxHQUNaLGFBQWEsWUFBWSwwQkFBMEI7WUFDbEQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNO1lBQ3RCLENBQUMsQ0FBQyxhQUFhLFlBQVksd0JBQXdCO2dCQUNsRCxDQUFDLENBQUMsYUFBYTtnQkFDZixDQUFDLENBQUMsSUFBSSxDQUFBO1FBRVQsa0pBQWtKO1FBQ2xKLCtEQUErRDtRQUMvRCxJQUFJLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDckIsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixVQUFVLEdBQUcsS0FBSyxDQUFBO1FBQ25CLENBQUM7UUFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDNUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFMUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkQsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEMsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO1lBRTFCLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUEyQixDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFFLElBQUksVUFBVSxHQUFHLENBQUMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQzdCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDekMsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRTVCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUVwQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUNyRDtZQUF3QixpQkFBa0IsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFBO1lBQzdELElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxPQUE0QjtRQUNoRCxNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUE7UUFFM0IsT0FBTyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDbEMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDL0IsQ0FBQztZQUVELE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO1FBQ3pCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRU8sb0JBQW9CLENBQzNCLEdBQVcsRUFDWCxLQUFVLEVBQ1YsV0FBb0IsRUFDcEIsY0FBa0MsRUFDbEMsS0FBcUM7UUFFckMseURBQXlEO1FBQ3pELDZJQUE2STtRQUM3SSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFBO1FBQ2hFLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ3ZFLE1BQU0sbUJBQW1CLEdBQ0ksQ0FDM0IsQ0FBQyxRQUFRLENBQUMsQ0FBQyw4Q0FBc0MsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUNsRSwwQ0FBa0MsQ0FBQTtRQUNwQyxNQUFNLFNBQVMsR0FBa0M7WUFDaEQsUUFBUTtZQUNSLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNsRSxDQUFBO1FBRUQsTUFBTSw4QkFBOEIsR0FDbkMsbUJBQW1CLDBDQUFrQztZQUNyRCxtQkFBbUIsaURBQXlDLENBQUE7UUFFN0QsTUFBTSx1QkFBdUIsR0FBRyw4QkFBOEIsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFBO1FBQ2xGLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUE7UUFFakYseUhBQXlIO1FBQ3pILE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxTQUFTLENBQUMsWUFBWSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ2xFLEtBQUssR0FBRyxTQUFTLENBQUE7UUFDbEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLG9CQUFvQjthQUM5QixXQUFXLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsbUJBQW1CLEVBQUUsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLENBQUM7YUFDcEYsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNWLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDMUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hELHVDQUF1QztnQkFDdkMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ3RCLENBQUM7WUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNuQyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFBO1lBRWhDLE1BQU0sbUJBQW1CLEdBQUc7Z0JBQzNCLEdBQUc7Z0JBQ0gsS0FBSztnQkFDTCxhQUFhLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLElBQUksSUFBSTtnQkFDakUsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsSUFBSSxJQUFJO2dCQUMzRCxrQkFBa0IsRUFDakIsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQztnQkFDbkYsT0FBTyxFQUFFLE9BQU8sS0FBSyxLQUFLLFdBQVc7Z0JBQ3JDLGNBQWMsRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBZ0M7YUFDM0UsQ0FBQTtZQUNELE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDdkQsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0lBRU8scUJBQXFCLENBQUMsS0FRN0I7UUFrREEsSUFBSSxPQUFPLEdBQXVCLFNBQVMsQ0FBQTtRQUMzQyxJQUFJLFFBQVEsR0FBdUIsU0FBUyxDQUFBO1FBQzVDLElBQUksWUFBWSxHQUF1QixTQUFTLENBQUE7UUFDaEQsSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDekIsWUFBWSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRTlGLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQzVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtnQkFDekQsSUFBSSxVQUFVLCtCQUF1QixJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDNUQsTUFBTSxxQkFBcUIsR0FBRyxVQUFVLCtCQUF1QixDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQ2pGLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxLQUFLLENBQUMsR0FBRyxDQUNsQyxDQUFBO29CQUNELE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUE7Z0JBQ3JELENBQUM7Z0JBQ0QsSUFBSSxVQUFVLGdDQUF3QixFQUFFLENBQUM7b0JBQ3hDLE1BQU0sU0FBUyxHQUFHLFVBQVUsZ0NBQXdCLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FDM0UsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLEtBQUssQ0FBQyxHQUFHLENBQ2xDLENBQUE7b0JBQ0QsUUFBUSxHQUFHLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO2dCQUNsRCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FDbkIsS0FBSyxDQUFDLGNBQWMsMkNBQW1DO1lBQ3RELENBQUMsQ0FBQyxNQUFNO1lBQ1IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLDRDQUFvQztnQkFDekQsQ0FBQyxDQUFDLGFBQWE7Z0JBQ2YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLDBDQUFrQztvQkFDdkQsQ0FBQyxDQUFDLFdBQVc7b0JBQ2IsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUVkLE1BQU0sSUFBSSxHQUFHO1lBQ1osR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2QsT0FBTztZQUNQLFFBQVE7WUFDUixZQUFZO1lBQ1osa0JBQWtCLEVBQUUsS0FBSyxDQUFDLGtCQUFrQjtZQUM1QyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsTUFBTSxFQUFFLGNBQWM7U0FDdEIsQ0FBQTtRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBRzlCLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTyxlQUFlLENBQUMsT0FBb0IsRUFBRSxHQUFHLEdBQUcsRUFBRTtRQUNyRCxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7WUFDekMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2hDLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ25DLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2RCxLQUFLLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDbEMsS0FBSyxDQUFDLEdBQUcsQ0FDUix1QkFBdUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ3RDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDM0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU8sNkJBQTZCLENBQ3BDLG9CQUF5QztRQUV6QyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUN2QyxTQUFTLGFBQWEsQ0FBQyxvQkFBeUMsRUFBRSxPQUFPLEdBQUcsQ0FBQztZQUM1RSxJQUFJLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxLQUFLLE1BQU0sT0FBTyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNyRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDN0IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUE7b0JBQ2xDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNuRCxPQUFPLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUM7UUFDRCxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUNuQyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFTyxhQUFhLENBQUMsb0JBQXlDO1FBQzlELGlFQUFpRTtRQUNqRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBTSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzFELElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQU0sQ0FBQyxJQUFJLENBQUE7UUFDdkUsSUFBSSxDQUFDLHVCQUF1QixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3hGLENBQUM7SUFFTyxLQUFLLENBQUMsY0FBYyxDQUMzQixJQUEwQixFQUMxQixZQUFZLEdBQUcsS0FBSyxFQUNwQixZQUFZLEdBQUcsS0FBSztRQUVwQixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyx1QkFBdUI7UUFFOUYsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0QsTUFBTSxjQUFjLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEYsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFBO1FBRWhELDJDQUEyQztRQUMzQyxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUM1RSxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUE7WUFDbkMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUM3QyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMzQixDQUFDLENBQUMsQ0FBQTtZQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQixnRUFBZ0UsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUMzRixDQUFBO1lBQ0QsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQTtRQUNyQyxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FBcUIsRUFBRSxDQUFBO1FBQzdDLElBQUksbUJBQW1CLEdBQUcsS0FBSyxDQUFBO1FBQy9CLE1BQU0sVUFBVSxHQUFHLE1BQU0sa0NBQWtDLENBQzFELElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLGNBQWMsQ0FDbkIsQ0FBQTtRQUNELElBQUksVUFBVSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoRSxLQUFLLE1BQU0sR0FBRyxJQUFJLFVBQVUsQ0FBQyxtQ0FBbUMsRUFBRSxDQUFDO2dCQUNsRSxNQUFNLFNBQVMsR0FBc0IsVUFBVSxDQUFDLGdDQUFnQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNyRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2hCLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQTtnQkFDM0Msa0ZBQWtGO2dCQUNsRixNQUFNLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFBO2dCQUMzQyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBRTNFLGdFQUFnRTtnQkFDaEUsMEJBQTBCO2dCQUMxQixNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQzFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsYUFBYTtvQkFDZixDQUFDLENBQUMsYUFBYyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsS0FBSyxXQUFXLENBQUMsV0FBVyxFQUFFO29CQUMvRCxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDO29CQUN2QixDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQztvQkFDbkMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQzdDLENBQUE7Z0JBQ0QsSUFBSSxrQkFBa0IsSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ2pGLElBQUksa0JBQWtCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDL0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTt3QkFDcEMsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO29CQUMzQixDQUFDO29CQUNELFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLGtCQUFrQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQy9CLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCw4REFBOEQ7Z0JBQzlELElBQUksUUFBUSxHQUE4QixJQUFJLENBQUE7Z0JBQzlDLElBQUksQ0FBQztvQkFDSixRQUFRO3dCQUNQLENBQUMsTUFBTSxXQUFXLENBQ2pCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUMzRSwwQkFBMEIsQ0FDMUIsQ0FBQyxJQUFJLElBQUksQ0FBQTtnQkFDWixDQUFDO2dCQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ1osNkJBQTZCO29CQUM3QixrRUFBa0U7b0JBQ2xFLFNBQVE7Z0JBQ1QsQ0FBQztnQkFFRCxJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDdkIsU0FBUTtnQkFDVCxDQUFDO2dCQUVELE1BQU0sd0JBQXdCLEdBQUcsUUFBUSxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUE7Z0JBRXJFLElBQUksVUFBOEIsQ0FBQTtnQkFDbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO29CQUM5QyxVQUFVLEdBQUcsd0JBQXdCLEVBQUUsS0FBSyxDQUFBO2dCQUM3QyxDQUFDO3FCQUFNLElBQUksd0JBQXdCLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNsRCxVQUFVLEdBQUcsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO2dCQUMvQyxDQUFDO2dCQUVELE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLG1DQUFtQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUM5RSxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFBO2dCQUM1RSxNQUFNLFVBQVUsR0FBRyxHQUFHLEdBQUcsa0JBQWtCLENBQUE7Z0JBQzNDLE1BQU0sT0FBTyxHQUFhO29CQUN6QixLQUFLLEVBQUUsU0FBUztvQkFDaEIsR0FBRyxFQUFFLFVBQVU7b0JBQ2YsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLEtBQUssRUFBRSxJQUFJO29CQUNYLFVBQVUsRUFBRSxTQUFTO29CQUNyQixXQUFXLEVBQUU7d0JBQ1osa0JBQWtCLENBQUMsb0JBQW9CLEVBQUUsbUJBQW1CLElBQUksU0FBUyxDQUFDLFdBQVc7cUJBQ3JGO29CQUNELHFCQUFxQixFQUFFLEtBQUs7b0JBQzVCLGlCQUFpQixFQUFFLEVBQUU7b0JBQ3JCLEtBQUssbUNBQTJCO29CQUNoQyxJQUFJLEVBQUUsTUFBTTtvQkFDWixrQkFBa0IsRUFBRSxXQUFXO29CQUMvQixtQkFBbUIsRUFBRSxVQUFVLElBQUksYUFBYTtvQkFDaEQsYUFBYSxFQUFFLFlBQVk7b0JBQzNCLEtBQUssRUFBRSxhQUFhO2lCQUNwQixDQUFBO2dCQUNELE1BQU0sZUFBZSxHQUFtQjtvQkFDdkMsUUFBUSxFQUFFO3dCQUNUOzRCQUNDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQzt5QkFDbkI7cUJBQ0Q7b0JBQ0QsRUFBRSxFQUFFLFdBQVc7b0JBQ2YsS0FBSyxFQUFFLE9BQU8sQ0FBQyxtQkFBb0I7b0JBQ25DLFVBQVUsRUFBRSxTQUFTO29CQUNyQixLQUFLLEVBQUUsU0FBUztvQkFDaEIsYUFBYSxFQUFFO3dCQUNkLEVBQUUsRUFBRSxXQUFXO3dCQUNmLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVztxQkFDbEM7aUJBQ0QsQ0FBQTtnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUM1QixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ3RDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztRQUVELG9CQUFvQixDQUFDLFFBQVMsQ0FBQyxJQUFJLENBQ2xDLE1BQU0saUNBQWlDLENBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUNyQyxDQUNELENBQUE7UUFFRCxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdELE1BQU0sWUFBWSxHQUFHLG1CQUFtQixDQUFDLHFCQUFxQixFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDeEYsb0JBQW9CLENBQUMsUUFBUyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFekQsSUFBSSxVQUFVLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN2QyxpRUFBaUU7WUFDakUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEUsQ0FBQztRQUVELElBQ0MsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsa0JBQWtCLEVBQUU7WUFDMUQsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsWUFBWSxHQUFHO2dCQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsMENBQWtDLENBQUMsRUFDaEUsQ0FBQztZQUNGLE1BQU0sb0NBQW9DLEdBQUcsa0NBQWtDLENBQzlFLE1BQU0sRUFDTixJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQzdCLElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsQ0FBQTtZQUNELElBQUksb0NBQW9DLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pELG9CQUFvQixDQUFDLFFBQVMsQ0FBQyxPQUFPLENBQUM7b0JBQ3RDLEVBQUUsRUFBRSxnQkFBZ0I7b0JBQ3BCLEtBQUssRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsaUJBQWlCLENBQUM7b0JBQzVELFFBQVEsRUFBRSxvQ0FBb0M7aUJBQzlDLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxDQUFBO1FBRXhDLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUV4QyxJQUFJLFlBQVksSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDNUMsMEdBQTBHO2dCQUMxRyxPQUFPLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7WUFDekMsQ0FBQztZQUVELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQTtZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUN6QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDdEUsaUJBQWlCLEVBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQ2QsSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQ3pELENBQUE7WUFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFFeEMsOEZBQThGO1lBQzlGLE1BQU0sV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDakYsSUFBSSxXQUFXLEVBQUUsV0FBVyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDOUQsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtZQUNsQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO2dCQUNyQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7WUFDM0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CLENBQUMsSUFBeUI7UUFDcEQsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWtCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN6RSxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMvRSxDQUFDO1lBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBRU8sOEJBQThCO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDbEQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUE7UUFDekQsT0FBTyxhQUFhLElBQUksR0FBRyxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQztZQUM3RCxDQUFDLENBQWMsYUFBYTtZQUM1QixDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ1IsQ0FBQztJQUVPLFVBQVUsQ0FBQyxHQUFZLEVBQUUsS0FBSyxHQUFHLEtBQUs7UUFDN0MsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZELElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuQyxPQUFNO1FBQ1AsQ0FBQztRQUVELDJEQUEyRDtRQUMzRCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUM7WUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ25FLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ2xELENBQUM7WUFDRCxPQUFNO1FBQ1AsQ0FBQztRQUVELDBFQUEwRTtRQUMxRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQTtRQUMzRCxNQUFNLGNBQWMsR0FDbkIsYUFBYSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQ0FBaUMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN4RixJQUFJLGNBQWMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlCLG9HQUFvRztZQUNwRyxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUNULE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxZQUFZLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDeEYsSUFDQyxVQUFVLEtBQUssR0FBRztvQkFDbEIsdUZBQXVGO29CQUN2RixjQUFjLENBQUMsYUFBYTtvQkFDNUIsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsRUFDcEUsQ0FBQztvQkFDRixJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ25DLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFBO29CQUN6QyxPQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQTtnQkFDcEMsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFFaEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRSxJQUFJLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMxQixPQUFPLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxHQUFHLEdBQUcsR0FBRyxRQUFRLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztnQkFDRCxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLHVEQUF1RDtnQkFDdkQsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNuQixDQUFDO1FBRUQsT0FBTTtJQUNQLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQ3pELGNBQWMsQ0FDZCxDQUFBO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLE9BQW1DO1FBQy9ELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXO1FBQ2xCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ25ELElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWM7UUFDckIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ25GLENBQUM7SUFDRixDQUFDO0lBRU8seUJBQXlCLENBQUMsR0FBVztRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDaEMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDckUsTUFBTSxVQUFVLEdBQUcsWUFBWSxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBLENBQUMsNENBQTRDO1FBQy9ILE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FDakUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsRUFDbEMsR0FBRyxDQUNILENBQUE7UUFDRCxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM3QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzVELENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQjtRQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDaEMsbUNBQW1DO1lBQ25DLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNqRCxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDNUIsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVPLG9CQUFvQixDQUFDLEtBQWE7UUFDekMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzdDLE9BQU8sS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssNkJBQTZCO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ3JELHVCQUF1QixDQUN2QixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsV0FBVyxLQUFLLE1BQU0sQ0FBQTtRQUN0QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO2dCQUNwQixlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVc7YUFDbEMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBYTtRQUN4QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNqRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUNuRCxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQ2pELElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO1FBQ3pDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLFdBQVcsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUE7WUFDekIsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3RFLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFpQixDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FDakQsQ0FBQTtZQUNELFdBQVcsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUM1RixXQUFXLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsV0FBVyxDQUFDLGNBQWMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsSUFBSSxDQUFDLHFCQUFxQixDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFeEYsSUFBSSxLQUFLLElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQzVCLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFBO1lBQ2pELE1BQU0sSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1FBQ3JDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFDQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJO2dCQUM5QixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLElBQUk7Z0JBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUk7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUk7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUM1QixDQUFDO2dCQUNGLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUNsRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtZQUM5QixDQUFDO1lBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUMzQixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNuQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO1lBQzdCLENBQUM7WUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtZQUMzQyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtZQUU3RCxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM1Qix1QkFBdUI7Z0JBQ3ZCLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFBO2dCQUN4QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ3JCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO2dCQUNoQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ2xCLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxDQUFBO1lBQ3JDLENBQUM7aUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDbEMsc0JBQXNCO2dCQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO2dCQUMxQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ3JCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO2dCQUNoQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQ2xCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDO1FBQ0QsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNLLGlCQUFpQjtRQUN4QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMzRCxpQkFBaUIsRUFDakIsSUFBSSxDQUFDLFNBQVMsRUFDZCxJQUFJLENBQUMsdUJBQXVCLEVBQzVCLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUN6RCxDQUFBO1FBRUQsTUFBTSxVQUFVLEdBQWtCO1lBQ2pDLGFBQWEsRUFBRSxFQUFFO1lBQ2pCLFVBQVUsRUFBRSxLQUFLO1NBQ2pCLENBQUE7UUFDRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDekUsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQy9CLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNyQyxVQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQzt3QkFDN0IsT0FBTzt3QkFDUCxPQUFPLEVBQUUsRUFBRTt3QkFDWCxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsSUFBSTt3QkFDaEMsYUFBYSxFQUFFLENBQUM7d0JBQ2hCLEtBQUssRUFBRSxDQUFDO3FCQUNSLENBQUMsQ0FBQTtnQkFDSCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNwQyxPQUFPLFdBQVcsQ0FBQTtJQUNuQixDQUFDO0lBRU8sS0FBSyxDQUFDLHdCQUF3QixDQUFDLEtBQWE7UUFDbkQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ25DLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7UUFDN0IsQ0FBQztRQUVELHlGQUF5RjtRQUN6RixNQUFNLGdCQUFnQixHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDNUMsSUFBSSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDcEQsT0FBTTtZQUNQLENBQUM7WUFDRCxNQUFNLFlBQVksR0FBRyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckYsSUFDQyxZQUFZO2dCQUNaLENBQUMsWUFBWSxDQUFDLFVBQVU7Z0JBQ3hCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUM5QyxDQUFDO2dCQUNGLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1lBRUQscURBQXFEO1lBQ3JELHdEQUF3RDtZQUN4RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN6QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUE7UUFDN0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUMxQixJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN6QixJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQTtRQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUMvQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDckIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVPLHNCQUFzQixDQUM3QixLQUFhLEVBQ2IsS0FBd0I7UUFFeEIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkYsT0FBTyxJQUFJLENBQUMsa0JBQWtCLGdDQUF3QixtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNsRixDQUFDO0lBRU8sdUJBQXVCLENBQzlCLEtBQWEsRUFDYixLQUF3QjtRQUV4QixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6RixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGtCQUFrQixpQ0FBeUIsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0IsQ0FDL0IsSUFBcUIsRUFDckIsY0FBK0IsRUFDL0IsS0FBd0I7UUFFeEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQ2hELElBQUksQ0FBQywwQkFBMEIsRUFDL0IsY0FBYyxFQUNkLEtBQUssQ0FDTCxDQUFBO1FBQ0QsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQywyR0FBMkc7WUFDM0csT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixLQUFLLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2xFLGlCQUFpQixFQUNqQixJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksQ0FBQyx1QkFBdUIsRUFDNUIsSUFBSSxDQUFDLCtCQUErQixDQUFDLGtCQUFrQixFQUFFLENBQ3pELENBQUE7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5QyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2hDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxPQUFPO1lBQzFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBRXJGLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtnQkFDN0IsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7Z0JBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7Z0JBQ3hDLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtnQkFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUVELElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtZQUM5QyxPQUFNO1FBQ1AsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUM1RCxJQUFJLFlBQW9CLENBQUE7WUFDeEIsUUFBUSxLQUFLLEVBQUUsQ0FBQztnQkFDZixLQUFLLENBQUM7b0JBQ0wsWUFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtvQkFDekQsTUFBSztnQkFDTixLQUFLLENBQUM7b0JBQ0wsWUFBWSxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtvQkFDdkQsTUFBSztnQkFDTjtvQkFDQyxZQUFZLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixFQUFFLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzNFLENBQUM7WUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsWUFBWSxDQUFBO1lBQ3JDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1lBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQTtZQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBRXpCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO2dCQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUM1QixDQUFDO1lBQ0QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDNUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUN4RSxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyx1QkFBdUIsQ0FDcEMsS0FBMkIsRUFDM0IsUUFBeUIsRUFDekIsS0FBd0I7UUFFeEIsSUFBSSxDQUFDO1lBQ0osT0FBTyxNQUFNLFFBQVEsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5QixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDM0IsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQXdCO1FBQy9DLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBLENBQUMsb0NBQW9DO1FBRXpGLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxVQUFVLElBQUksQ0FBQTtRQUVsRCxnRUFBZ0U7UUFDaEUsb0VBQW9FO1FBQ3BFLDhEQUE4RDtRQUM5RCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFakUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDckQsdUJBQXVCLENBQ3ZCLENBQUE7UUFDRCxNQUFNLGdCQUFnQixHQUFHLFdBQVcsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQ3pFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsSUFBSSxpQkFBZSxDQUFDLGtCQUFrQixDQUFBO1lBRTdGLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQ2xELG9GQUFvRjtZQUNwRixpRUFBaUU7WUFDakUsSUFDQyxDQUFDLG1CQUFtQjtnQkFDcEIsZ0JBQWdCO2dCQUNoQixJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVc7b0JBQzdCLGlCQUFlLENBQUMsZ0JBQWdCLEdBQUcsaUJBQWUsQ0FBQyxlQUFlLEVBQ2xFLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLGlCQUFlLENBQUMsZUFBZSxDQUFDLENBQUE7WUFDOUQsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO2dCQUNwQixlQUFlLEVBQUUsZ0JBQWdCO29CQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUU7b0JBQzFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVzthQUNwQixDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVrQixTQUFTO1FBQzNCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7WUFDdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN2RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBZ0MsQ0FBQTtZQUMxRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7WUFDcEYsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzVELENBQUM7UUFFRCxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUE7SUFDbEIsQ0FBQzs7QUFqcEVXLGVBQWU7SUF3SXpCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSw4QkFBOEIsQ0FBQTtJQUU5QixXQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFlBQUEsZUFBZSxDQUFBO0lBQ2YsWUFBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLDZCQUE2QixDQUFBO0lBRTdCLFlBQUEsOEJBQThCLENBQUE7SUFFOUIsWUFBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxZQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFlBQUEsZ0JBQWdCLENBQUE7SUFDaEIsWUFBQSwyQkFBMkIsQ0FBQTtJQUUzQixZQUFBLGVBQWUsQ0FBQTtJQUNmLFlBQUEsd0JBQXdCLENBQUE7SUFDeEIsWUFBQSxzQkFBc0IsQ0FBQTtJQUN0QixZQUFBLHVCQUF1QixDQUFBO0dBbEtiLGVBQWUsQ0FrcEUzQjs7QUFFRCxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsVUFBVTtJQU9wQyxZQUNDLE1BQWtCLEVBQ2xCLFNBQXNCLEVBQ0wsY0FBZ0QsRUFDM0MsbUJBQTBELEVBRWhGLDZCQUE4RSxFQUMzRCxnQkFBbUM7UUFFdEQsS0FBSyxFQUFFLENBQUE7UUFOMkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQzFCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFFL0Qsa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztRQVQ5RCxnQ0FBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtRQUNwRSwrQkFBMEIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFBO1FBYWxGLE1BQU0sNEJBQTRCLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQTtRQUN6RixNQUFNLHlCQUF5QixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDOUYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JDLElBQUksTUFBTSxDQUFDLHlCQUF5QixFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLG1CQUFtQixFQUFFLENBQUMsQ0FDOUUsQ0FBQTtRQUNELElBQUksQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyw0QkFBNEIsRUFBRSxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3hGLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRTlCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDdEYsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFdkMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzNDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtRQUNsRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsbUJBQW1CLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3JELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzVCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFBO1FBQzNFLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRXhGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRTtZQUMvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsNkJBQTZCLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFO1lBQzdELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUE7UUFDbEQsSUFBSSxLQUFhLENBQUE7UUFDakIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM5QixNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRCxDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssR0FBRyxFQUFFLENBQUE7UUFDWCxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFBO1FBQ3hDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVPLE1BQU07UUFDYixJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLG1EQUE2QixFQUFFLENBQUM7WUFDbEUsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUNDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUU7WUFDOUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0saUNBQW9CLEVBQ2xELENBQUM7WUFDRixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QyxDQUFDO2FBQU0sQ0FBQztZQUNQLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQzlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFGSyxZQUFZO0lBVWYsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsOEJBQThCLENBQUE7SUFFOUIsV0FBQSxpQkFBaUIsQ0FBQTtHQWRkLFlBQVksQ0EwRmpCIn0=