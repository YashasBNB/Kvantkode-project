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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLDREQUE0RDs7Ozs7Ozs7Ozs7QUFFNUQsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDaEcsT0FBTyxFQUFXLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFFTiw0QkFBNEIsR0FDNUIsTUFBTSxp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