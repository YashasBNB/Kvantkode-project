/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* eslint-disable local/code-no-dangerous-type-assertions */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var KeybindingsEditor_1, ActionsColumnRenderer_1, CommandColumnRenderer_1, SourceColumnRenderer_1, WhenColumnRenderer_1;
import './media/keybindingsEditor.css';
import { localize } from '../../../../nls.js';
import { Delayer } from '../../../../base/common/async.js';
import * as DOM from '../../../../base/browser/dom.js';
import { isIOS, OS } from '../../../../base/common/platform.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { ToggleActionViewItem } from '../../../../base/browser/ui/toggle/toggle.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { KEYBINDING_ENTRY_TEMPLATE_ID, } from '../../../services/preferences/browser/keybindingsEditorModel.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService, } from '../../../../platform/keybinding/common/keybinding.js';
import { DefineKeybindingWidget, KeybindingsSearchWidget } from './keybindingWidgets.js';
import { CONTEXT_KEYBINDING_FOCUS, CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR, KEYBINDINGS_EDITOR_COMMAND_ADD, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE, CONTEXT_WHEN_FOCUS, } from '../common/preferences.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IKeybindingEditingService } from '../../../services/keybinding/common/keybindingEditing.js';
import { IThemeService, registerThemingParticipant, } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { badgeBackground, contrastBorder, badgeForeground, listActiveSelectionForeground, listInactiveSelectionForeground, listHoverForeground, listFocusForeground, editorBackground, foreground, listActiveSelectionBackground, listInactiveSelectionBackground, listFocusBackground, listHoverBackground, registerColor, tableOddRowsBackgroundColor, asCssVariable, } from '../../../../platform/theme/common/colorRegistry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { WorkbenchTable } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MenuRegistry, MenuId, isIMenuItem } from '../../../../platform/actions/common/actions.js';
import { WORKBENCH_BACKGROUND } from '../../../common/theme.js';
import { keybindingsRecordKeysIcon, keybindingsSortIcon, keybindingsAddIcon, preferencesClearInputIcon, keybindingsEditIcon, } from './preferencesIcons.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { defaultKeybindingLabelStyles, defaultToggleStyles, getInputBoxStyle, } from '../../../../platform/theme/browser/defaultStyles.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { isString } from '../../../../base/common/types.js';
import { SuggestEnabledInput } from '../../codeEditor/browser/suggestEnabledInput/suggestEnabledInput.js';
import { settingsTextInputBorder } from '../common/settingsEditorColorRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerNavigableContainer } from '../../../browser/actions/widgetNavigationCommands.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
const $ = DOM.$;
let KeybindingsEditor = class KeybindingsEditor extends EditorPane {
    static { KeybindingsEditor_1 = this; }
    static { this.ID = 'workbench.editor.keybindings'; }
    constructor(group, telemetryService, themeService, keybindingsService, contextMenuService, keybindingEditingService, contextKeyService, notificationService, clipboardService, instantiationService, editorService, storageService, configurationService, accessibilityService) {
        super(KeybindingsEditor_1.ID, group, telemetryService, themeService, storageService);
        this.keybindingsService = keybindingsService;
        this.contextMenuService = contextMenuService;
        this.keybindingEditingService = keybindingEditingService;
        this.contextKeyService = contextKeyService;
        this.notificationService = notificationService;
        this.clipboardService = clipboardService;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.accessibilityService = accessibilityService;
        this._onDefineWhenExpression = this._register(new Emitter());
        this.onDefineWhenExpression = this._onDefineWhenExpression.event;
        this._onRejectWhenExpression = this._register(new Emitter());
        this.onRejectWhenExpression = this._onRejectWhenExpression.event;
        this._onAcceptWhenExpression = this._register(new Emitter());
        this.onAcceptWhenExpression = this._onAcceptWhenExpression.event;
        this._onLayout = this._register(new Emitter());
        this.onLayout = this._onLayout.event;
        this.keybindingsEditorModel = null;
        this.unAssignedKeybindingItemToRevealAndFocus = null;
        this.tableEntries = [];
        this.dimension = null;
        this.latestEmptyFilters = [];
        this.delayedFiltering = new Delayer(300);
        this._register(keybindingsService.onDidUpdateKeybindings(() => this.render(!!this.keybindingFocusContextKey.get())));
        this.keybindingsEditorContextKey = CONTEXT_KEYBINDINGS_EDITOR.bindTo(this.contextKeyService);
        this.searchFocusContextKey = CONTEXT_KEYBINDINGS_SEARCH_FOCUS.bindTo(this.contextKeyService);
        this.keybindingFocusContextKey = CONTEXT_KEYBINDING_FOCUS.bindTo(this.contextKeyService);
        this.searchHistoryDelayer = new Delayer(500);
        this.recordKeysAction = new Action(KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, localize('recordKeysLabel', 'Record Keys'), ThemeIcon.asClassName(keybindingsRecordKeysIcon));
        this.recordKeysAction.checked = false;
        this.sortByPrecedenceAction = new Action(KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, localize('sortByPrecedeneLabel', 'Sort by Precedence (Highest first)'), ThemeIcon.asClassName(keybindingsSortIcon));
        this.sortByPrecedenceAction.checked = false;
        this.overflowWidgetsDomNode = $('.keybindings-overflow-widgets-container.monaco-editor');
    }
    create(parent) {
        super.create(parent);
        this._register(registerNavigableContainer({
            name: 'keybindingsEditor',
            focusNotifiers: [this],
            focusNextWidget: () => {
                if (this.searchWidget.hasFocus()) {
                    this.focusKeybindings();
                }
            },
            focusPreviousWidget: () => {
                if (!this.searchWidget.hasFocus()) {
                    this.focusSearch();
                }
            },
        }));
    }
    createEditor(parent) {
        const keybindingsEditorElement = DOM.append(parent, $('div', { class: 'keybindings-editor' }));
        this.createAriaLabelElement(keybindingsEditorElement);
        this.createOverlayContainer(keybindingsEditorElement);
        this.createHeader(keybindingsEditorElement);
        this.createBody(keybindingsEditorElement);
    }
    setInput(input, options, context, token) {
        this.keybindingsEditorContextKey.set(true);
        return super
            .setInput(input, options, context, token)
            .then(() => this.render(!!(options && options.preserveFocus)));
    }
    clearInput() {
        super.clearInput();
        this.keybindingsEditorContextKey.reset();
        this.keybindingFocusContextKey.reset();
    }
    layout(dimension) {
        this.dimension = dimension;
        this.layoutSearchWidget(dimension);
        this.overlayContainer.style.width = dimension.width + 'px';
        this.overlayContainer.style.height = dimension.height + 'px';
        this.defineKeybindingWidget.layout(this.dimension);
        this.layoutKeybindingsTable();
        this._onLayout.fire();
    }
    focus() {
        super.focus();
        const activeKeybindingEntry = this.activeKeybindingEntry;
        if (activeKeybindingEntry) {
            this.selectEntry(activeKeybindingEntry);
        }
        else if (!isIOS) {
            this.searchWidget.focus();
        }
    }
    get activeKeybindingEntry() {
        const focusedElement = this.keybindingsTable.getFocusedElements()[0];
        return focusedElement && focusedElement.templateId === KEYBINDING_ENTRY_TEMPLATE_ID
            ? focusedElement
            : null;
    }
    async defineKeybinding(keybindingEntry, add) {
        this.selectEntry(keybindingEntry);
        this.showOverlayContainer();
        try {
            const key = await this.defineKeybindingWidget.define();
            if (key) {
                await this.updateKeybinding(keybindingEntry, key, keybindingEntry.keybindingItem.when, add);
            }
        }
        catch (error) {
            this.onKeybindingEditingError(error);
        }
        finally {
            this.hideOverlayContainer();
            this.selectEntry(keybindingEntry);
        }
    }
    defineWhenExpression(keybindingEntry) {
        if (keybindingEntry.keybindingItem.keybinding) {
            this.selectEntry(keybindingEntry);
            this._onDefineWhenExpression.fire(keybindingEntry);
        }
    }
    rejectWhenExpression(keybindingEntry) {
        this._onRejectWhenExpression.fire(keybindingEntry);
    }
    acceptWhenExpression(keybindingEntry) {
        this._onAcceptWhenExpression.fire(keybindingEntry);
    }
    async updateKeybinding(keybindingEntry, key, when, add) {
        const currentKey = keybindingEntry.keybindingItem.keybinding
            ? keybindingEntry.keybindingItem.keybinding.getUserSettingsLabel()
            : '';
        if (currentKey !== key || keybindingEntry.keybindingItem.when !== when) {
            if (add) {
                await this.keybindingEditingService.addKeybinding(keybindingEntry.keybindingItem.keybindingItem, key, when || undefined);
            }
            else {
                await this.keybindingEditingService.editKeybinding(keybindingEntry.keybindingItem.keybindingItem, key, when || undefined);
            }
            if (!keybindingEntry.keybindingItem.keybinding) {
                // reveal only if keybinding was added to unassinged. Because the entry will be placed in different position after rendering
                this.unAssignedKeybindingItemToRevealAndFocus = keybindingEntry;
            }
        }
    }
    async removeKeybinding(keybindingEntry) {
        this.selectEntry(keybindingEntry);
        if (keybindingEntry.keybindingItem.keybinding) {
            // This should be a pre-condition
            try {
                await this.keybindingEditingService.removeKeybinding(keybindingEntry.keybindingItem.keybindingItem);
                this.focus();
            }
            catch (error) {
                this.onKeybindingEditingError(error);
                this.selectEntry(keybindingEntry);
            }
        }
    }
    async resetKeybinding(keybindingEntry) {
        this.selectEntry(keybindingEntry);
        try {
            await this.keybindingEditingService.resetKeybinding(keybindingEntry.keybindingItem.keybindingItem);
            if (!keybindingEntry.keybindingItem.keybinding) {
                // reveal only if keybinding was added to unassinged. Because the entry will be placed in different position after rendering
                this.unAssignedKeybindingItemToRevealAndFocus = keybindingEntry;
            }
            this.selectEntry(keybindingEntry);
        }
        catch (error) {
            this.onKeybindingEditingError(error);
            this.selectEntry(keybindingEntry);
        }
    }
    async copyKeybinding(keybinding) {
        this.selectEntry(keybinding);
        const userFriendlyKeybinding = {
            key: keybinding.keybindingItem.keybinding
                ? keybinding.keybindingItem.keybinding.getUserSettingsLabel() || ''
                : '',
            command: keybinding.keybindingItem.command,
        };
        if (keybinding.keybindingItem.when) {
            userFriendlyKeybinding.when = keybinding.keybindingItem.when;
        }
        await this.clipboardService.writeText(JSON.stringify(userFriendlyKeybinding, null, '  '));
    }
    async copyKeybindingCommand(keybinding) {
        this.selectEntry(keybinding);
        await this.clipboardService.writeText(keybinding.keybindingItem.command);
    }
    async copyKeybindingCommandTitle(keybinding) {
        this.selectEntry(keybinding);
        await this.clipboardService.writeText(keybinding.keybindingItem.commandLabel);
    }
    focusSearch() {
        this.searchWidget.focus();
    }
    search(filter) {
        this.focusSearch();
        this.searchWidget.setValue(filter);
        this.selectEntry(0);
    }
    clearSearchResults() {
        this.searchWidget.clear();
    }
    showSimilarKeybindings(keybindingEntry) {
        const value = `"${keybindingEntry.keybindingItem.keybinding.getAriaLabel()}"`;
        if (value !== this.searchWidget.getValue()) {
            this.searchWidget.setValue(value);
        }
    }
    createAriaLabelElement(parent) {
        this.ariaLabelElement = DOM.append(parent, DOM.$(''));
        this.ariaLabelElement.setAttribute('id', 'keybindings-editor-aria-label-element');
        this.ariaLabelElement.setAttribute('aria-live', 'assertive');
    }
    createOverlayContainer(parent) {
        this.overlayContainer = DOM.append(parent, $('.overlay-container'));
        this.overlayContainer.style.position = 'absolute';
        this.overlayContainer.style.zIndex = '40'; // has to greater than sash z-index which is 35
        this.defineKeybindingWidget = this._register(this.instantiationService.createInstance(DefineKeybindingWidget, this.overlayContainer));
        this._register(this.defineKeybindingWidget.onDidChange((keybindingStr) => this.defineKeybindingWidget.printExisting(this.keybindingsEditorModel.fetch(`"${keybindingStr}"`).length)));
        this._register(this.defineKeybindingWidget.onShowExistingKeybidings((keybindingStr) => this.searchWidget.setValue(`"${keybindingStr}"`)));
        this.hideOverlayContainer();
    }
    showOverlayContainer() {
        this.overlayContainer.style.display = 'block';
    }
    hideOverlayContainer() {
        this.overlayContainer.style.display = 'none';
    }
    createHeader(parent) {
        this.headerContainer = DOM.append(parent, $('.keybindings-header'));
        const fullTextSearchPlaceholder = localize('SearchKeybindings.FullTextSearchPlaceholder', 'Type to search in keybindings');
        const keybindingsSearchPlaceholder = localize('SearchKeybindings.KeybindingsSearchPlaceholder', 'Recording Keys. Press Escape to exit');
        const clearInputAction = new Action(KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, localize('clearInput', 'Clear Keybindings Search Input'), ThemeIcon.asClassName(preferencesClearInputIcon), false, async () => this.clearSearchResults());
        const searchContainer = DOM.append(this.headerContainer, $('.search-container'));
        this.searchWidget = this._register(this.instantiationService.createInstance(KeybindingsSearchWidget, searchContainer, {
            ariaLabel: fullTextSearchPlaceholder,
            placeholder: fullTextSearchPlaceholder,
            focusKey: this.searchFocusContextKey,
            ariaLabelledBy: 'keybindings-editor-aria-label-element',
            recordEnter: true,
            quoteRecordedKeys: true,
            history: new Set(this.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)['searchHistory'] ?? []),
            inputBoxStyles: getInputBoxStyle({
                inputBorder: settingsTextInputBorder,
            }),
        }));
        this._register(this.searchWidget.onDidChange((searchValue) => {
            clearInputAction.enabled = !!searchValue;
            this.delayedFiltering.trigger(() => this.filterKeybindings());
            this.updateSearchOptions();
        }));
        this._register(this.searchWidget.onEscape(() => (this.recordKeysAction.checked = false)));
        this.actionsContainer = DOM.append(searchContainer, DOM.$('.keybindings-search-actions-container'));
        const recordingBadge = this.createRecordingBadge(this.actionsContainer);
        this._register(this.sortByPrecedenceAction.onDidChange((e) => {
            if (e.checked !== undefined) {
                this.renderKeybindingsEntries(false);
            }
            this.updateSearchOptions();
        }));
        this._register(this.recordKeysAction.onDidChange((e) => {
            if (e.checked !== undefined) {
                recordingBadge.classList.toggle('disabled', !e.checked);
                if (e.checked) {
                    this.searchWidget.inputBox.setPlaceHolder(keybindingsSearchPlaceholder);
                    this.searchWidget.inputBox.setAriaLabel(keybindingsSearchPlaceholder);
                    this.searchWidget.startRecordingKeys();
                    this.searchWidget.focus();
                }
                else {
                    this.searchWidget.inputBox.setPlaceHolder(fullTextSearchPlaceholder);
                    this.searchWidget.inputBox.setAriaLabel(fullTextSearchPlaceholder);
                    this.searchWidget.stopRecordingKeys();
                    this.searchWidget.focus();
                }
                this.updateSearchOptions();
            }
        }));
        const actions = [this.recordKeysAction, this.sortByPrecedenceAction, clearInputAction];
        const toolBar = this._register(new ToolBar(this.actionsContainer, this.contextMenuService, {
            actionViewItemProvider: (action, options) => {
                if (action.id === this.sortByPrecedenceAction.id ||
                    action.id === this.recordKeysAction.id) {
                    return new ToggleActionViewItem(null, action, {
                        ...options,
                        keybinding: this.keybindingsService.lookupKeybinding(action.id)?.getLabel(),
                        toggleStyles: defaultToggleStyles,
                    });
                }
                return undefined;
            },
            getKeyBinding: (action) => this.keybindingsService.lookupKeybinding(action.id),
        }));
        toolBar.setActions(actions);
        this._register(this.keybindingsService.onDidUpdateKeybindings(() => toolBar.setActions(actions)));
    }
    updateSearchOptions() {
        const keybindingsEditorInput = this.input;
        if (keybindingsEditorInput) {
            keybindingsEditorInput.searchOptions = {
                searchValue: this.searchWidget.getValue(),
                recordKeybindings: !!this.recordKeysAction.checked,
                sortByPrecedence: !!this.sortByPrecedenceAction.checked,
            };
        }
    }
    createRecordingBadge(container) {
        const recordingBadge = DOM.append(container, DOM.$('.recording-badge.monaco-count-badge.long.disabled'));
        recordingBadge.textContent = localize('recording', 'Recording Keys');
        recordingBadge.style.backgroundColor = asCssVariable(badgeBackground);
        recordingBadge.style.color = asCssVariable(badgeForeground);
        recordingBadge.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        return recordingBadge;
    }
    layoutSearchWidget(dimension) {
        this.searchWidget.layout(dimension);
        this.headerContainer.classList.toggle('small', dimension.width < 400);
        this.searchWidget.inputBox.inputElement.style.paddingRight = `${DOM.getTotalWidth(this.actionsContainer) + 12}px`;
    }
    createBody(parent) {
        const bodyContainer = DOM.append(parent, $('.keybindings-body'));
        this.createTable(bodyContainer);
    }
    createTable(parent) {
        this.keybindingsTableContainer = DOM.append(parent, $('.keybindings-table-container'));
        this.keybindingsTable = this._register(this.instantiationService.createInstance(WorkbenchTable, 'KeybindingsEditor', this.keybindingsTableContainer, new Delegate(), [
            {
                label: '',
                tooltip: '',
                weight: 0,
                minimumWidth: 40,
                maximumWidth: 40,
                templateId: ActionsColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('command', 'Command'),
                tooltip: '',
                weight: 0.3,
                templateId: CommandColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('keybinding', 'Keybinding'),
                tooltip: '',
                weight: 0.2,
                templateId: KeybindingColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('when', 'When'),
                tooltip: '',
                weight: 0.35,
                templateId: WhenColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
            {
                label: localize('source', 'Source'),
                tooltip: '',
                weight: 0.15,
                templateId: SourceColumnRenderer.TEMPLATE_ID,
                project(row) {
                    return row;
                },
            },
        ], [
            this.instantiationService.createInstance(ActionsColumnRenderer, this),
            this.instantiationService.createInstance(CommandColumnRenderer),
            this.instantiationService.createInstance(KeybindingColumnRenderer),
            this.instantiationService.createInstance(WhenColumnRenderer, this),
            this.instantiationService.createInstance(SourceColumnRenderer),
        ], {
            identityProvider: { getId: (e) => e.id },
            horizontalScrolling: false,
            accessibilityProvider: new AccessibilityProvider(this.configurationService),
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (e) => e.keybindingItem.commandLabel || e.keybindingItem.command,
            },
            overrideStyles: {
                listBackground: editorBackground,
            },
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            openOnSingleClick: false,
            transformOptimization: false, // disable transform optimization as it causes the editor overflow widgets to be mispositioned
        }));
        this._register(this.keybindingsTable.onContextMenu((e) => this.onContextMenu(e)));
        this._register(this.keybindingsTable.onDidChangeFocus((e) => this.onFocusChange()));
        this._register(this.keybindingsTable.onDidFocus(() => {
            this.keybindingsTable.getHTMLElement().classList.add('focused');
            this.onFocusChange();
        }));
        this._register(this.keybindingsTable.onDidBlur(() => {
            this.keybindingsTable.getHTMLElement().classList.remove('focused');
            this.keybindingFocusContextKey.reset();
        }));
        this._register(this.keybindingsTable.onDidOpen((e) => {
            // stop double click action on the input #148493
            if (e.browserEvent?.defaultPrevented) {
                return;
            }
            const activeKeybindingEntry = this.activeKeybindingEntry;
            if (activeKeybindingEntry) {
                this.defineKeybinding(activeKeybindingEntry, false);
            }
        }));
        DOM.append(this.keybindingsTableContainer, this.overflowWidgetsDomNode);
    }
    async render(preserveFocus) {
        if (this.input) {
            const input = this.input;
            this.keybindingsEditorModel = await input.resolve();
            await this.keybindingsEditorModel.resolve(this.getActionsLabels());
            this.renderKeybindingsEntries(false, preserveFocus);
            if (input.searchOptions) {
                this.recordKeysAction.checked = input.searchOptions.recordKeybindings;
                this.sortByPrecedenceAction.checked = input.searchOptions.sortByPrecedence;
                this.searchWidget.setValue(input.searchOptions.searchValue);
            }
            else {
                this.updateSearchOptions();
            }
        }
    }
    getActionsLabels() {
        const actionsLabels = new Map();
        for (const editorAction of EditorExtensionsRegistry.getEditorActions()) {
            actionsLabels.set(editorAction.id, editorAction.label);
        }
        for (const menuItem of MenuRegistry.getMenuItems(MenuId.CommandPalette)) {
            if (isIMenuItem(menuItem)) {
                const title = typeof menuItem.command.title === 'string'
                    ? menuItem.command.title
                    : menuItem.command.title.value;
                const category = menuItem.command.category
                    ? typeof menuItem.command.category === 'string'
                        ? menuItem.command.category
                        : menuItem.command.category.value
                    : undefined;
                actionsLabels.set(menuItem.command.id, category ? `${category}: ${title}` : title);
            }
        }
        return actionsLabels;
    }
    filterKeybindings() {
        this.renderKeybindingsEntries(this.searchWidget.hasFocus());
        this.searchHistoryDelayer.trigger(() => {
            this.searchWidget.inputBox.addToHistory();
            this.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)['searchHistory'] =
                this.searchWidget.inputBox.getHistory();
            this.saveState();
        });
    }
    clearKeyboardShortcutSearchHistory() {
        this.searchWidget.inputBox.clearHistory();
        this.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)['searchHistory'] =
            this.searchWidget.inputBox.getHistory();
        this.saveState();
    }
    renderKeybindingsEntries(reset, preserveFocus) {
        if (this.keybindingsEditorModel) {
            const filter = this.searchWidget.getValue();
            const keybindingsEntries = this.keybindingsEditorModel.fetch(filter, this.sortByPrecedenceAction.checked);
            this.accessibilityService.alert(localize('foundResults', '{0} results', keybindingsEntries.length));
            this.ariaLabelElement.setAttribute('aria-label', this.getAriaLabel(keybindingsEntries));
            if (keybindingsEntries.length === 0) {
                this.latestEmptyFilters.push(filter);
            }
            const currentSelectedIndex = this.keybindingsTable.getSelection()[0];
            this.tableEntries = keybindingsEntries;
            this.keybindingsTable.splice(0, this.keybindingsTable.length, this.tableEntries);
            this.layoutKeybindingsTable();
            if (reset) {
                this.keybindingsTable.setSelection([]);
                this.keybindingsTable.setFocus([]);
            }
            else {
                if (this.unAssignedKeybindingItemToRevealAndFocus) {
                    const index = this.getNewIndexOfUnassignedKeybinding(this.unAssignedKeybindingItemToRevealAndFocus);
                    if (index !== -1) {
                        this.keybindingsTable.reveal(index, 0.2);
                        this.selectEntry(index);
                    }
                    this.unAssignedKeybindingItemToRevealAndFocus = null;
                }
                else if (currentSelectedIndex !== -1 && currentSelectedIndex < this.tableEntries.length) {
                    this.selectEntry(currentSelectedIndex, preserveFocus);
                }
                else if (this.editorService.activeEditorPane === this && !preserveFocus) {
                    this.focus();
                }
            }
        }
    }
    getAriaLabel(keybindingsEntries) {
        if (this.sortByPrecedenceAction.checked) {
            return localize('show sorted keybindings', 'Showing {0} Keybindings in precedence order', keybindingsEntries.length);
        }
        else {
            return localize('show keybindings', 'Showing {0} Keybindings in alphabetical order', keybindingsEntries.length);
        }
    }
    layoutKeybindingsTable() {
        if (!this.dimension) {
            return;
        }
        const tableHeight = this.dimension.height -
            (DOM.getDomNodePagePosition(this.headerContainer).height + 12); /*padding*/
        this.keybindingsTableContainer.style.height = `${tableHeight}px`;
        this.keybindingsTable.layout(tableHeight);
    }
    getIndexOf(listEntry) {
        const index = this.tableEntries.indexOf(listEntry);
        if (index === -1) {
            for (let i = 0; i < this.tableEntries.length; i++) {
                if (this.tableEntries[i].id === listEntry.id) {
                    return i;
                }
            }
        }
        return index;
    }
    getNewIndexOfUnassignedKeybinding(unassignedKeybinding) {
        for (let index = 0; index < this.tableEntries.length; index++) {
            const entry = this.tableEntries[index];
            if (entry.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
                const keybindingItemEntry = entry;
                if (keybindingItemEntry.keybindingItem.command === unassignedKeybinding.keybindingItem.command) {
                    return index;
                }
            }
        }
        return -1;
    }
    selectEntry(keybindingItemEntry, focus = true) {
        const index = typeof keybindingItemEntry === 'number'
            ? keybindingItemEntry
            : this.getIndexOf(keybindingItemEntry);
        if (index !== -1 && index < this.keybindingsTable.length) {
            if (focus) {
                this.keybindingsTable.domFocus();
                this.keybindingsTable.setFocus([index]);
            }
            this.keybindingsTable.setSelection([index]);
        }
    }
    focusKeybindings() {
        this.keybindingsTable.domFocus();
        const currentFocusIndices = this.keybindingsTable.getFocus();
        this.keybindingsTable.setFocus([currentFocusIndices.length ? currentFocusIndices[0] : 0]);
    }
    selectKeybinding(keybindingItemEntry) {
        this.selectEntry(keybindingItemEntry);
    }
    recordSearchKeys() {
        this.recordKeysAction.checked = true;
    }
    toggleSortByPrecedence() {
        this.sortByPrecedenceAction.checked = !this.sortByPrecedenceAction.checked;
    }
    onContextMenu(e) {
        if (!e.element) {
            return;
        }
        if (e.element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
            const keybindingItemEntry = e.element;
            this.selectEntry(keybindingItemEntry);
            this.contextMenuService.showContextMenu({
                getAnchor: () => e.anchor,
                getActions: () => [
                    this.createCopyAction(keybindingItemEntry),
                    this.createCopyCommandAction(keybindingItemEntry),
                    this.createCopyCommandTitleAction(keybindingItemEntry),
                    new Separator(),
                    ...(keybindingItemEntry.keybindingItem.keybinding
                        ? [
                            this.createDefineKeybindingAction(keybindingItemEntry),
                            this.createAddKeybindingAction(keybindingItemEntry),
                        ]
                        : [this.createDefineKeybindingAction(keybindingItemEntry)]),
                    new Separator(),
                    this.createRemoveAction(keybindingItemEntry),
                    this.createResetAction(keybindingItemEntry),
                    new Separator(),
                    this.createDefineWhenExpressionAction(keybindingItemEntry),
                    new Separator(),
                    this.createShowConflictsAction(keybindingItemEntry),
                ],
            });
        }
    }
    onFocusChange() {
        this.keybindingFocusContextKey.reset();
        const element = this.keybindingsTable.getFocusedElements()[0];
        if (!element) {
            return;
        }
        if (element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
            this.keybindingFocusContextKey.set(true);
        }
    }
    createDefineKeybindingAction(keybindingItemEntry) {
        return {
            label: keybindingItemEntry.keybindingItem.keybinding
                ? localize('changeLabel', 'Change Keybinding...')
                : localize('addLabel', 'Add Keybinding...'),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
            run: () => this.defineKeybinding(keybindingItemEntry, false),
        };
    }
    createAddKeybindingAction(keybindingItemEntry) {
        return {
            label: localize('addLabel', 'Add Keybinding...'),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_ADD,
            run: () => this.defineKeybinding(keybindingItemEntry, true),
        };
    }
    createDefineWhenExpressionAction(keybindingItemEntry) {
        return {
            label: localize('editWhen', 'Change When Expression'),
            enabled: !!keybindingItemEntry.keybindingItem.keybinding,
            id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
            run: () => this.defineWhenExpression(keybindingItemEntry),
        };
    }
    createRemoveAction(keybindingItem) {
        return {
            label: localize('removeLabel', 'Remove Keybinding'),
            enabled: !!keybindingItem.keybindingItem.keybinding,
            id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
            run: () => this.removeKeybinding(keybindingItem),
        };
    }
    createResetAction(keybindingItem) {
        return {
            label: localize('resetLabel', 'Reset Keybinding'),
            enabled: !keybindingItem.keybindingItem.keybindingItem.isDefault,
            id: KEYBINDINGS_EDITOR_COMMAND_RESET,
            run: () => this.resetKeybinding(keybindingItem),
        };
    }
    createShowConflictsAction(keybindingItem) {
        return {
            label: localize('showSameKeybindings', 'Show Same Keybindings'),
            enabled: !!keybindingItem.keybindingItem.keybinding,
            id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
            run: () => this.showSimilarKeybindings(keybindingItem),
        };
    }
    createCopyAction(keybindingItem) {
        return {
            label: localize('copyLabel', 'Copy'),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_COPY,
            run: () => this.copyKeybinding(keybindingItem),
        };
    }
    createCopyCommandAction(keybinding) {
        return {
            label: localize('copyCommandLabel', 'Copy Command ID'),
            enabled: true,
            id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
            run: () => this.copyKeybindingCommand(keybinding),
        };
    }
    createCopyCommandTitleAction(keybinding) {
        return {
            label: localize('copyCommandTitleLabel', 'Copy Command Title'),
            enabled: !!keybinding.keybindingItem.commandLabel,
            id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND_TITLE,
            run: () => this.copyKeybindingCommandTitle(keybinding),
        };
    }
    onKeybindingEditingError(error) {
        this.notificationService.error(typeof error === 'string'
            ? error
            : localize('error', "Error '{0}' while editing the keybinding. Please open 'keybindings.json' file and check for errors.", `${error}`));
    }
};
KeybindingsEditor = KeybindingsEditor_1 = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IKeybindingService),
    __param(4, IContextMenuService),
    __param(5, IKeybindingEditingService),
    __param(6, IContextKeyService),
    __param(7, INotificationService),
    __param(8, IClipboardService),
    __param(9, IInstantiationService),
    __param(10, IEditorService),
    __param(11, IStorageService),
    __param(12, IConfigurationService),
    __param(13, IAccessibilityService)
], KeybindingsEditor);
export { KeybindingsEditor };
class Delegate {
    constructor() {
        this.headerRowHeight = 30;
    }
    getHeight(element) {
        if (element.templateId === KEYBINDING_ENTRY_TEMPLATE_ID) {
            const commandIdMatched = element.keybindingItem.commandLabel &&
                element.commandIdMatches;
            const commandDefaultLabelMatched = !!element
                .commandDefaultLabelMatches;
            const extensionIdMatched = !!element.extensionIdMatches;
            if (commandIdMatched && commandDefaultLabelMatched) {
                return 60;
            }
            if (extensionIdMatched || commandIdMatched || commandDefaultLabelMatched) {
                return 40;
            }
        }
        return 24;
    }
}
let ActionsColumnRenderer = class ActionsColumnRenderer {
    static { ActionsColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'actions'; }
    constructor(keybindingsEditor, keybindingsService) {
        this.keybindingsEditor = keybindingsEditor;
        this.keybindingsService = keybindingsService;
        this.templateId = ActionsColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.actions'));
        const actionBar = new ActionBar(element);
        return { actionBar };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        templateData.actionBar.clear();
        const actions = [];
        if (keybindingItemEntry.keybindingItem.keybinding) {
            actions.push(this.createEditAction(keybindingItemEntry));
        }
        else {
            actions.push(this.createAddAction(keybindingItemEntry));
        }
        templateData.actionBar.push(actions, { icon: true });
    }
    createEditAction(keybindingItemEntry) {
        const keybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
        return {
            class: ThemeIcon.asClassName(keybindingsEditIcon),
            enabled: true,
            id: 'editKeybinding',
            tooltip: keybinding
                ? localize('editKeybindingLabelWithKey', 'Change Keybinding {0}', `(${keybinding.getLabel()})`)
                : localize('editKeybindingLabel', 'Change Keybinding'),
            run: () => this.keybindingsEditor.defineKeybinding(keybindingItemEntry, false),
        };
    }
    createAddAction(keybindingItemEntry) {
        const keybinding = this.keybindingsService.lookupKeybinding(KEYBINDINGS_EDITOR_COMMAND_DEFINE);
        return {
            class: ThemeIcon.asClassName(keybindingsAddIcon),
            enabled: true,
            id: 'addKeybinding',
            tooltip: keybinding
                ? localize('addKeybindingLabelWithKey', 'Add Keybinding {0}', `(${keybinding.getLabel()})`)
                : localize('addKeybindingLabel', 'Add Keybinding'),
            run: () => this.keybindingsEditor.defineKeybinding(keybindingItemEntry, false),
        };
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
};
ActionsColumnRenderer = ActionsColumnRenderer_1 = __decorate([
    __param(1, IKeybindingService)
], ActionsColumnRenderer);
let CommandColumnRenderer = class CommandColumnRenderer {
    static { CommandColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'commands'; }
    constructor(_hoverService) {
        this._hoverService = _hoverService;
        this.templateId = CommandColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const commandColumn = DOM.append(container, $('.command'));
        const commandColumnHover = this._hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), commandColumn, '');
        const commandLabelContainer = DOM.append(commandColumn, $('.command-label'));
        const commandLabel = new HighlightedLabel(commandLabelContainer);
        const commandDefaultLabelContainer = DOM.append(commandColumn, $('.command-default-label'));
        const commandDefaultLabel = new HighlightedLabel(commandDefaultLabelContainer);
        const commandIdLabelContainer = DOM.append(commandColumn, $('.command-id.code'));
        const commandIdLabel = new HighlightedLabel(commandIdLabelContainer);
        return {
            commandColumn,
            commandColumnHover,
            commandLabelContainer,
            commandLabel,
            commandDefaultLabelContainer,
            commandDefaultLabel,
            commandIdLabelContainer,
            commandIdLabel,
        };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        const keybindingItem = keybindingItemEntry.keybindingItem;
        const commandIdMatched = !!(keybindingItem.commandLabel && keybindingItemEntry.commandIdMatches);
        const commandDefaultLabelMatched = !!keybindingItemEntry.commandDefaultLabelMatches;
        templateData.commandColumn.classList.toggle('vertical-align-column', commandIdMatched || commandDefaultLabelMatched);
        const title = keybindingItem.commandLabel
            ? localize('title', '{0} ({1})', keybindingItem.commandLabel, keybindingItem.command)
            : keybindingItem.command;
        templateData.commandColumn.setAttribute('aria-label', title);
        templateData.commandColumnHover.update(title);
        if (keybindingItem.commandLabel) {
            templateData.commandLabelContainer.classList.remove('hide');
            templateData.commandLabel.set(keybindingItem.commandLabel, keybindingItemEntry.commandLabelMatches);
        }
        else {
            templateData.commandLabelContainer.classList.add('hide');
            templateData.commandLabel.set(undefined);
        }
        if (keybindingItemEntry.commandDefaultLabelMatches) {
            templateData.commandDefaultLabelContainer.classList.remove('hide');
            templateData.commandDefaultLabel.set(keybindingItem.commandDefaultLabel, keybindingItemEntry.commandDefaultLabelMatches);
        }
        else {
            templateData.commandDefaultLabelContainer.classList.add('hide');
            templateData.commandDefaultLabel.set(undefined);
        }
        if (keybindingItemEntry.commandIdMatches || !keybindingItem.commandLabel) {
            templateData.commandIdLabelContainer.classList.remove('hide');
            templateData.commandIdLabel.set(keybindingItem.command, keybindingItemEntry.commandIdMatches);
        }
        else {
            templateData.commandIdLabelContainer.classList.add('hide');
            templateData.commandIdLabel.set(undefined);
        }
    }
    disposeTemplate(templateData) {
        templateData.commandColumnHover.dispose();
        templateData.commandDefaultLabel.dispose();
        templateData.commandIdLabel.dispose();
        templateData.commandLabel.dispose();
    }
};
CommandColumnRenderer = CommandColumnRenderer_1 = __decorate([
    __param(0, IHoverService)
], CommandColumnRenderer);
class KeybindingColumnRenderer {
    static { this.TEMPLATE_ID = 'keybindings'; }
    constructor() {
        this.templateId = KeybindingColumnRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.keybinding'));
        const keybindingLabel = new KeybindingLabel(DOM.append(element, $('div.keybinding-label')), OS, defaultKeybindingLabelStyles);
        return { keybindingLabel };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        if (keybindingItemEntry.keybindingItem.keybinding) {
            templateData.keybindingLabel.set(keybindingItemEntry.keybindingItem.keybinding, keybindingItemEntry.keybindingMatches);
        }
        else {
            templateData.keybindingLabel.set(undefined, undefined);
        }
    }
    disposeTemplate(templateData) {
        templateData.keybindingLabel.dispose();
    }
}
function onClick(element, callback) {
    const disposables = new DisposableStore();
    disposables.add(DOM.addDisposableListener(element, DOM.EventType.CLICK, DOM.finalHandler(callback)));
    disposables.add(DOM.addDisposableListener(element, DOM.EventType.KEY_UP, (e) => {
        const keyboardEvent = new StandardKeyboardEvent(e);
        if (keyboardEvent.equals(10 /* KeyCode.Space */) || keyboardEvent.equals(3 /* KeyCode.Enter */)) {
            e.preventDefault();
            e.stopPropagation();
            callback();
        }
    }));
    return disposables;
}
let SourceColumnRenderer = class SourceColumnRenderer {
    static { SourceColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'source'; }
    constructor(extensionsWorkbenchService, hoverService) {
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.hoverService = hoverService;
        this.templateId = SourceColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const sourceColumn = DOM.append(container, $('.source'));
        const sourceColumnHover = this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), sourceColumn, '');
        const sourceLabel = new HighlightedLabel(DOM.append(sourceColumn, $('.source-label')));
        const extensionContainer = DOM.append(sourceColumn, $('.extension-container'));
        const extensionLabel = DOM.append(extensionContainer, $('a.extension-label', { tabindex: 0 }));
        const extensionId = new HighlightedLabel(DOM.append(extensionContainer, $('.extension-id-container.code')));
        return {
            sourceColumn,
            sourceColumnHover,
            sourceLabel,
            extensionLabel,
            extensionContainer,
            extensionId,
            disposables: new DisposableStore(),
        };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        templateData.disposables.clear();
        if (isString(keybindingItemEntry.keybindingItem.source)) {
            templateData.extensionContainer.classList.add('hide');
            templateData.sourceLabel.element.classList.remove('hide');
            templateData.sourceColumnHover.update('');
            templateData.sourceLabel.set(keybindingItemEntry.keybindingItem.source || '-', keybindingItemEntry.sourceMatches);
        }
        else {
            templateData.extensionContainer.classList.remove('hide');
            templateData.sourceLabel.element.classList.add('hide');
            const extension = keybindingItemEntry.keybindingItem.source;
            const extensionLabel = extension.displayName ?? extension.identifier.value;
            templateData.sourceColumnHover.update(localize('extension label', 'Extension ({0})', extensionLabel));
            templateData.extensionLabel.textContent = extensionLabel;
            templateData.disposables.add(onClick(templateData.extensionLabel, () => {
                this.extensionsWorkbenchService.open(extension.identifier.value);
            }));
            if (keybindingItemEntry.extensionIdMatches) {
                templateData.extensionId.element.classList.remove('hide');
                templateData.extensionId.set(extension.identifier.value, keybindingItemEntry.extensionIdMatches);
            }
            else {
                templateData.extensionId.element.classList.add('hide');
                templateData.extensionId.set(undefined);
            }
        }
    }
    disposeTemplate(templateData) {
        templateData.sourceColumnHover.dispose();
        templateData.disposables.dispose();
        templateData.sourceLabel.dispose();
        templateData.extensionId.dispose();
    }
};
SourceColumnRenderer = SourceColumnRenderer_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IHoverService)
], SourceColumnRenderer);
let WhenInputWidget = class WhenInputWidget extends Disposable {
    constructor(parent, keybindingsEditor, instantiationService, contextKeyService) {
        super();
        this._onDidAccept = this._register(new Emitter());
        this.onDidAccept = this._onDidAccept.event;
        this._onDidReject = this._register(new Emitter());
        this.onDidReject = this._onDidReject.event;
        const focusContextKey = CONTEXT_WHEN_FOCUS.bindTo(contextKeyService);
        this.input = this._register(instantiationService.createInstance(SuggestEnabledInput, 'keyboardshortcutseditor#wheninput', parent, {
            provideResults: () => {
                const result = [];
                for (const contextKey of RawContextKey.all()) {
                    result.push({
                        label: contextKey.key,
                        documentation: contextKey.description,
                        detail: contextKey.type,
                        kind: 14 /* CompletionItemKind.Constant */,
                    });
                }
                return result;
            },
            triggerCharacters: ['!', ' '],
            wordDefinition: /[a-zA-Z.]+/,
            alwaysShowSuggestions: true,
        }, '', `keyboardshortcutseditor#wheninput`, { focusContextKey, overflowWidgetsDomNode: keybindingsEditor.overflowWidgetsDomNode }));
        this._register(DOM.addDisposableListener(this.input.element, DOM.EventType.DBLCLICK, (e) => DOM.EventHelper.stop(e)));
        this._register(toDisposable(() => focusContextKey.reset()));
        this._register(keybindingsEditor.onAcceptWhenExpression(() => this._onDidAccept.fire(this.input.getValue())));
        this._register(Event.any(keybindingsEditor.onRejectWhenExpression, this.input.onDidBlur)(() => this._onDidReject.fire()));
    }
    layout(dimension) {
        this.input.layout(dimension);
    }
    show(value) {
        this.input.setValue(value);
        this.input.focus(true);
    }
};
WhenInputWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], WhenInputWidget);
let WhenColumnRenderer = class WhenColumnRenderer {
    static { WhenColumnRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'when'; }
    constructor(keybindingsEditor, hoverService, instantiationService) {
        this.keybindingsEditor = keybindingsEditor;
        this.hoverService = hoverService;
        this.instantiationService = instantiationService;
        this.templateId = WhenColumnRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = DOM.append(container, $('.when'));
        const whenLabelContainer = DOM.append(element, $('div.when-label'));
        const whenLabel = new HighlightedLabel(whenLabelContainer);
        const whenInputContainer = DOM.append(element, $('div.when-input-container'));
        return {
            element,
            whenLabelContainer,
            whenLabel,
            whenInputContainer,
            disposables: new DisposableStore(),
        };
    }
    renderElement(keybindingItemEntry, index, templateData, height) {
        templateData.disposables.clear();
        const whenInputDisposables = templateData.disposables.add(new DisposableStore());
        templateData.disposables.add(this.keybindingsEditor.onDefineWhenExpression((e) => {
            if (keybindingItemEntry === e) {
                templateData.element.classList.add('input-mode');
                const inputWidget = whenInputDisposables.add(this.instantiationService.createInstance(WhenInputWidget, templateData.whenInputContainer, this.keybindingsEditor));
                inputWidget.layout(new DOM.Dimension(templateData.element.parentElement.clientWidth, 18));
                inputWidget.show(keybindingItemEntry.keybindingItem.when || '');
                const hideInputWidget = () => {
                    whenInputDisposables.clear();
                    templateData.element.classList.remove('input-mode');
                    templateData.element.parentElement.style.paddingLeft = '10px';
                    DOM.clearNode(templateData.whenInputContainer);
                };
                whenInputDisposables.add(inputWidget.onDidAccept((value) => {
                    hideInputWidget();
                    this.keybindingsEditor.updateKeybinding(keybindingItemEntry, keybindingItemEntry.keybindingItem.keybinding
                        ? keybindingItemEntry.keybindingItem.keybinding.getUserSettingsLabel() || ''
                        : '', value);
                    this.keybindingsEditor.selectKeybinding(keybindingItemEntry);
                }));
                whenInputDisposables.add(inputWidget.onDidReject(() => {
                    hideInputWidget();
                    this.keybindingsEditor.selectKeybinding(keybindingItemEntry);
                }));
                templateData.element.parentElement.style.paddingLeft = '0px';
            }
        }));
        templateData.whenLabelContainer.classList.toggle('code', !!keybindingItemEntry.keybindingItem.when);
        templateData.whenLabelContainer.classList.toggle('empty', !keybindingItemEntry.keybindingItem.when);
        if (keybindingItemEntry.keybindingItem.when) {
            templateData.whenLabel.set(keybindingItemEntry.keybindingItem.when, keybindingItemEntry.whenMatches, keybindingItemEntry.keybindingItem.when);
            templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.element, keybindingItemEntry.keybindingItem.when));
        }
        else {
            templateData.whenLabel.set('-');
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
        templateData.whenLabel.dispose();
    }
};
WhenColumnRenderer = WhenColumnRenderer_1 = __decorate([
    __param(1, IHoverService),
    __param(2, IInstantiationService)
], WhenColumnRenderer);
class AccessibilityProvider {
    constructor(configurationService) {
        this.configurationService = configurationService;
    }
    getWidgetAriaLabel() {
        return localize('keybindingsLabel', 'Keybindings');
    }
    getAriaLabel({ keybindingItem }) {
        const ariaLabel = [
            keybindingItem.commandLabel ? keybindingItem.commandLabel : keybindingItem.command,
            keybindingItem.keybinding?.getAriaLabel() ||
                localize('noKeybinding', 'No keybinding assigned'),
            keybindingItem.when ? keybindingItem.when : localize('noWhen', 'No when context'),
            isString(keybindingItem.source)
                ? keybindingItem.source
                : (keybindingItem.source.description ?? keybindingItem.source.identifier.value),
        ];
        if (this.configurationService.getValue("accessibility.verbosity.keybindingsEditor" /* AccessibilityVerbositySettingId.KeybindingsEditor */)) {
            const kbEditorAriaLabel = localize('keyboard shortcuts aria label', 'use space or enter to change the keybinding.');
            ariaLabel.push(kbEditorAriaLabel);
        }
        return ariaLabel.join(', ');
    }
}
registerColor('keybindingTable.headerBackground', tableOddRowsBackgroundColor, 'Background color for the keyboard shortcuts table header.');
registerColor('keybindingTable.rowsBackground', tableOddRowsBackgroundColor, 'Background color for the keyboard shortcuts table alternating rows.');
registerThemingParticipant((theme, collector) => {
    const foregroundColor = theme.getColor(foreground);
    if (foregroundColor) {
        const whenForegroundColor = foregroundColor
            .transparent(0.8)
            .makeOpaque(WORKBENCH_BACKGROUND(theme));
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listActiveSelectionForegroundColor = theme.getColor(listActiveSelectionForeground);
    const listActiveSelectionBackgroundColor = theme.getColor(listActiveSelectionBackground);
    if (listActiveSelectionForegroundColor && listActiveSelectionBackgroundColor) {
        const whenForegroundColor = listActiveSelectionForegroundColor
            .transparent(0.8)
            .makeOpaque(listActiveSelectionBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table.focused .monaco-list-row.selected .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listInactiveSelectionForegroundColor = theme.getColor(listInactiveSelectionForeground);
    const listInactiveSelectionBackgroundColor = theme.getColor(listInactiveSelectionBackground);
    if (listInactiveSelectionForegroundColor && listInactiveSelectionBackgroundColor) {
        const whenForegroundColor = listInactiveSelectionForegroundColor
            .transparent(0.8)
            .makeOpaque(listInactiveSelectionBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table .monaco-list-row.selected .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listFocusForegroundColor = theme.getColor(listFocusForeground);
    const listFocusBackgroundColor = theme.getColor(listFocusBackground);
    if (listFocusForegroundColor && listFocusBackgroundColor) {
        const whenForegroundColor = listFocusForegroundColor
            .transparent(0.8)
            .makeOpaque(listFocusBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table.focused .monaco-list-row.focused .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
    const listHoverForegroundColor = theme.getColor(listHoverForeground);
    const listHoverBackgroundColor = theme.getColor(listHoverBackground);
    if (listHoverForegroundColor && listHoverBackgroundColor) {
        const whenForegroundColor = listHoverForegroundColor
            .transparent(0.8)
            .makeOpaque(listHoverBackgroundColor);
        collector.addRule(`.keybindings-editor > .keybindings-body > .keybindings-table-container .monaco-table.focused .monaco-list-row:hover:not(.focused):not(.selected) .monaco-table-tr .monaco-table-td .code { color: ${whenForegroundColor}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ByZWZlcmVuY2VzL2Jyb3dzZXIva2V5YmluZGluZ3NFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsNERBQTREOzs7Ozs7Ozs7OztBQUU1RCxPQUFPLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNoRyxPQUFPLEVBQVcsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUVOLDRCQUE0QixHQUM1QixN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