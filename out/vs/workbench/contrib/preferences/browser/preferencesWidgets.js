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
import * as DOM from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { BaseActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Action } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ContextScopedHistoryInputBox } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { asCssVariable, badgeBackground, badgeForeground, contrastBorder, } from '../../../../platform/theme/common/colorRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isWorkspaceFolder, IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { settingsEditIcon, settingsScopeDropDownIcon } from './preferencesIcons.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let FolderSettingsActionViewItem = class FolderSettingsActionViewItem extends BaseActionViewItem {
    constructor(action, contextService, contextMenuService, hoverService) {
        super(null, action);
        this.contextService = contextService;
        this.contextMenuService = contextMenuService;
        this.hoverService = hoverService;
        this._folderSettingCounts = new Map();
        const workspace = this.contextService.getWorkspace();
        this._folder = workspace.folders.length === 1 ? workspace.folders[0] : null;
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.onWorkspaceFoldersChanged()));
    }
    get folder() {
        return this._folder;
    }
    set folder(folder) {
        this._folder = folder;
        this.update();
    }
    setCount(settingsTarget, count) {
        const workspaceFolder = this.contextService.getWorkspaceFolder(settingsTarget);
        if (!workspaceFolder) {
            throw new Error('unknown folder');
        }
        const folder = workspaceFolder.uri;
        this._folderSettingCounts.set(folder.toString(), count);
        this.update();
    }
    render(container) {
        this.element = container;
        this.container = container;
        this.labelElement = DOM.$('.action-title');
        this.detailsElement = DOM.$('.action-details');
        this.dropDownElement = DOM.$('.dropdown-icon.hide' + ThemeIcon.asCSSSelector(settingsScopeDropDownIcon));
        this.anchorElement = DOM.$('a.action-label.folder-settings', {
            role: 'button',
            'aria-haspopup': 'true',
            tabindex: '0',
        }, this.labelElement, this.detailsElement, this.dropDownElement);
        this.anchorElementHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.anchorElement, ''));
        this._register(DOM.addDisposableListener(this.anchorElement, DOM.EventType.MOUSE_DOWN, (e) => DOM.EventHelper.stop(e)));
        this._register(DOM.addDisposableListener(this.anchorElement, DOM.EventType.CLICK, (e) => this.onClick(e)));
        this._register(DOM.addDisposableListener(this.container, DOM.EventType.KEY_UP, (e) => this.onKeyUp(e)));
        DOM.append(this.container, this.anchorElement);
        this.update();
    }
    onKeyUp(event) {
        const keyboardEvent = new StandardKeyboardEvent(event);
        switch (keyboardEvent.keyCode) {
            case 3 /* KeyCode.Enter */:
            case 10 /* KeyCode.Space */:
                this.onClick(event);
                return;
        }
    }
    onClick(event) {
        DOM.EventHelper.stop(event, true);
        if (!this.folder || this._action.checked) {
            this.showMenu();
        }
        else {
            this._action.run(this._folder);
        }
    }
    updateEnabled() {
        this.update();
    }
    updateChecked() {
        this.update();
    }
    onWorkspaceFoldersChanged() {
        const oldFolder = this._folder;
        const workspace = this.contextService.getWorkspace();
        if (oldFolder) {
            this._folder =
                workspace.folders.filter((folder) => isEqual(folder.uri, oldFolder.uri))[0] ||
                    workspace.folders[0];
        }
        this._folder = this._folder
            ? this._folder
            : workspace.folders.length === 1
                ? workspace.folders[0]
                : null;
        this.update();
        if (this._action.checked) {
            this._action.run(this._folder);
        }
    }
    update() {
        let total = 0;
        this._folderSettingCounts.forEach((n) => (total += n));
        const workspace = this.contextService.getWorkspace();
        if (this._folder) {
            this.labelElement.textContent = this._folder.name;
            this.anchorElementHover.update(this._folder.name);
            const detailsText = this.labelWithCount(this._action.label, total);
            this.detailsElement.textContent = detailsText;
            this.dropDownElement.classList.toggle('hide', workspace.folders.length === 1 || !this._action.checked);
        }
        else {
            const labelText = this.labelWithCount(this._action.label, total);
            this.labelElement.textContent = labelText;
            this.detailsElement.textContent = '';
            this.anchorElementHover.update(this._action.label);
            this.dropDownElement.classList.remove('hide');
        }
        this.anchorElement.classList.toggle('checked', this._action.checked);
        this.container.classList.toggle('disabled', !this._action.enabled);
    }
    showMenu() {
        this.contextMenuService.showContextMenu({
            getAnchor: () => this.container,
            getActions: () => this.getDropdownMenuActions(),
            getActionViewItem: () => undefined,
            onHide: () => {
                this.anchorElement.blur();
            },
        });
    }
    getDropdownMenuActions() {
        const actions = [];
        const workspaceFolders = this.contextService.getWorkspace().folders;
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ &&
            workspaceFolders.length > 0) {
            actions.push(...workspaceFolders.map((folder, index) => {
                const folderCount = this._folderSettingCounts.get(folder.uri.toString());
                return {
                    id: 'folderSettingsTarget' + index,
                    label: this.labelWithCount(folder.name, folderCount),
                    tooltip: this.labelWithCount(folder.name, folderCount),
                    checked: !!this.folder && isEqual(this.folder.uri, folder.uri),
                    enabled: true,
                    class: undefined,
                    run: () => this._action.run(folder),
                };
            }));
        }
        return actions;
    }
    labelWithCount(label, count) {
        // Append the count if it's >0 and not undefined
        if (count) {
            label += ` (${count})`;
        }
        return label;
    }
};
FolderSettingsActionViewItem = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IContextMenuService),
    __param(3, IHoverService)
], FolderSettingsActionViewItem);
export { FolderSettingsActionViewItem };
let SettingsTargetsWidget = class SettingsTargetsWidget extends Widget {
    constructor(parent, options, contextService, instantiationService, environmentService, labelService, languageService) {
        super();
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.environmentService = environmentService;
        this.labelService = labelService;
        this.languageService = languageService;
        this._settingsTarget = null;
        this._onDidTargetChange = this._register(new Emitter());
        this.onDidTargetChange = this._onDidTargetChange.event;
        this.options = options ?? {};
        this.create(parent);
        this._register(this.contextService.onDidChangeWorkbenchState(() => this.onWorkbenchStateChanged()));
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.update()));
    }
    resetLabels() {
        const remoteAuthority = this.environmentService.remoteAuthority;
        const hostLabel = remoteAuthority && this.labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority);
        this.userLocalSettings.label = localize('userSettings', 'User');
        this.userRemoteSettings.label =
            localize('userSettingsRemote', 'Remote') + (hostLabel ? ` [${hostLabel}]` : '');
        this.workspaceSettings.label = localize('workspaceSettings', 'Workspace');
        this.folderSettingsAction.label = localize('folderSettings', 'Folder');
    }
    create(parent) {
        const settingsTabsWidget = DOM.append(parent, DOM.$('.settings-tabs-widget'));
        this.settingsSwitcherBar = this._register(new ActionBar(settingsTabsWidget, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            focusOnlyEnabledItems: true,
            ariaLabel: localize('settingsSwitcherBarAriaLabel', 'Settings Switcher'),
            ariaRole: 'tablist',
            actionViewItemProvider: (action, options) => action.id === 'folderSettings' ? this.folderSettings : undefined,
        }));
        this.userLocalSettings = new Action('userSettings', '', '.settings-tab', true, () => this.updateTarget(3 /* ConfigurationTarget.USER_LOCAL */));
        this.userLocalSettings.tooltip = localize('userSettings', 'User');
        this.userRemoteSettings = new Action('userSettingsRemote', '', '.settings-tab', true, () => this.updateTarget(4 /* ConfigurationTarget.USER_REMOTE */));
        const remoteAuthority = this.environmentService.remoteAuthority;
        const hostLabel = remoteAuthority && this.labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority);
        this.userRemoteSettings.tooltip =
            localize('userSettingsRemote', 'Remote') + (hostLabel ? ` [${hostLabel}]` : '');
        this.workspaceSettings = new Action('workspaceSettings', '', '.settings-tab', false, () => this.updateTarget(5 /* ConfigurationTarget.WORKSPACE */));
        this.folderSettingsAction = new Action('folderSettings', '', '.settings-tab', false, async (folder) => {
            this.updateTarget(isWorkspaceFolder(folder) ? folder.uri : 3 /* ConfigurationTarget.USER_LOCAL */);
        });
        this.folderSettings = this.instantiationService.createInstance(FolderSettingsActionViewItem, this.folderSettingsAction);
        this.resetLabels();
        this.update();
        this.settingsSwitcherBar.push([
            this.userLocalSettings,
            this.userRemoteSettings,
            this.workspaceSettings,
            this.folderSettingsAction,
        ]);
    }
    get settingsTarget() {
        return this._settingsTarget;
    }
    set settingsTarget(settingsTarget) {
        this._settingsTarget = settingsTarget;
        this.userLocalSettings.checked = 3 /* ConfigurationTarget.USER_LOCAL */ === this.settingsTarget;
        this.userRemoteSettings.checked = 4 /* ConfigurationTarget.USER_REMOTE */ === this.settingsTarget;
        this.workspaceSettings.checked = 5 /* ConfigurationTarget.WORKSPACE */ === this.settingsTarget;
        if (this.settingsTarget instanceof URI) {
            this.folderSettings.action.checked = true;
            this.folderSettings.folder = this.contextService.getWorkspaceFolder(this.settingsTarget);
        }
        else {
            this.folderSettings.action.checked = false;
        }
    }
    setResultCount(settingsTarget, count) {
        if (settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */) {
            let label = localize('workspaceSettings', 'Workspace');
            if (count) {
                label += ` (${count})`;
            }
            this.workspaceSettings.label = label;
        }
        else if (settingsTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            let label = localize('userSettings', 'User');
            if (count) {
                label += ` (${count})`;
            }
            this.userLocalSettings.label = label;
        }
        else if (settingsTarget instanceof URI) {
            this.folderSettings.setCount(settingsTarget, count);
        }
    }
    updateLanguageFilterIndicators(filter) {
        this.resetLabels();
        if (filter) {
            const languageToUse = this.languageService.getLanguageName(filter);
            if (languageToUse) {
                const languageSuffix = ` [${languageToUse}]`;
                this.userLocalSettings.label += languageSuffix;
                this.userRemoteSettings.label += languageSuffix;
                this.workspaceSettings.label += languageSuffix;
                this.folderSettingsAction.label += languageSuffix;
            }
        }
    }
    onWorkbenchStateChanged() {
        this.folderSettings.folder = null;
        this.update();
        if (this.settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */ &&
            this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            this.updateTarget(3 /* ConfigurationTarget.USER_LOCAL */);
        }
    }
    updateTarget(settingsTarget) {
        const isSameTarget = this.settingsTarget === settingsTarget ||
            (settingsTarget instanceof URI &&
                this.settingsTarget instanceof URI &&
                isEqual(this.settingsTarget, settingsTarget));
        if (!isSameTarget) {
            this.settingsTarget = settingsTarget;
            this._onDidTargetChange.fire(this.settingsTarget);
        }
        return Promise.resolve(undefined);
    }
    async update() {
        this.settingsSwitcherBar.domNode.classList.toggle('empty-workbench', this.contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */);
        this.userRemoteSettings.enabled = !!(this.options.enableRemoteSettings && this.environmentService.remoteAuthority);
        this.workspaceSettings.enabled =
            this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
        this.folderSettings.action.enabled =
            this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */ &&
                this.contextService.getWorkspace().folders.length > 0;
        this.workspaceSettings.tooltip = localize('workspaceSettings', 'Workspace');
    }
};
SettingsTargetsWidget = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, ILabelService),
    __param(6, ILanguageService)
], SettingsTargetsWidget);
export { SettingsTargetsWidget };
let SearchWidget = class SearchWidget extends Widget {
    constructor(parent, options, contextViewService, instantiationService, contextKeyService, keybindingService) {
        super();
        this.options = options;
        this.contextViewService = contextViewService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onFocus = this._register(new Emitter());
        this.onFocus = this._onFocus.event;
        this.create(parent);
    }
    create(parent) {
        this.domNode = DOM.append(parent, DOM.$('div.settings-header-widget'));
        this.createSearchContainer(DOM.append(this.domNode, DOM.$('div.settings-search-container')));
        this.controlsDiv = DOM.append(this.domNode, DOM.$('div.settings-search-controls'));
        if (this.options.showResultCount) {
            this.countElement = DOM.append(this.controlsDiv, DOM.$('.settings-count-widget'));
            this.countElement.style.backgroundColor = asCssVariable(badgeBackground);
            this.countElement.style.color = asCssVariable(badgeForeground);
            this.countElement.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        }
        this.inputBox.inputElement.setAttribute('aria-live', this.options.ariaLive || 'off');
        if (this.options.ariaLabelledBy) {
            this.inputBox.inputElement.setAttribute('aria-labelledBy', this.options.ariaLabelledBy);
        }
        const focusTracker = this._register(DOM.trackFocus(this.inputBox.inputElement));
        this._register(focusTracker.onDidFocus(() => this._onFocus.fire()));
        const focusKey = this.options.focusKey;
        if (focusKey) {
            this._register(focusTracker.onDidFocus(() => focusKey.set(true)));
            this._register(focusTracker.onDidBlur(() => focusKey.set(false)));
        }
    }
    createSearchContainer(searchContainer) {
        this.searchContainer = searchContainer;
        const searchInput = DOM.append(this.searchContainer, DOM.$('div.settings-search-input'));
        this.inputBox = this._register(this.createInputBox(searchInput));
        this._register(this.inputBox.onDidChange((value) => this._onDidChange.fire(value)));
    }
    createInputBox(parent) {
        const showHistoryHint = () => showHistoryKeybindingHint(this.keybindingService);
        return new ContextScopedHistoryInputBox(parent, this.contextViewService, { ...this.options, showHistoryHint }, this.contextKeyService);
    }
    showMessage(message) {
        // Avoid setting the aria-label unnecessarily, the screenreader will read the count every time it's set, since it's aria-live:assertive. #50968
        if (this.countElement && message !== this.countElement.textContent) {
            this.countElement.textContent = message;
            this.inputBox.inputElement.setAttribute('aria-label', message);
            this.inputBox.inputElement.style.paddingRight = this.getControlsWidth() + 'px';
        }
    }
    layout(dimension) {
        if (dimension.width < 400) {
            this.countElement?.classList.add('hide');
            this.inputBox.inputElement.style.paddingRight = '0px';
        }
        else {
            this.countElement?.classList.remove('hide');
            this.inputBox.inputElement.style.paddingRight = this.getControlsWidth() + 'px';
        }
    }
    getControlsWidth() {
        const countWidth = this.countElement ? DOM.getTotalWidth(this.countElement) : 0;
        return countWidth + 20;
    }
    focus() {
        this.inputBox.focus();
        if (this.getValue()) {
            this.inputBox.select();
        }
    }
    hasFocus() {
        return this.inputBox.hasFocus();
    }
    clear() {
        this.inputBox.value = '';
    }
    getValue() {
        return this.inputBox.value;
    }
    setValue(value) {
        return (this.inputBox.value = value);
    }
    dispose() {
        this.options.focusKey?.set(false);
        super.dispose();
    }
};
SearchWidget = __decorate([
    __param(2, IContextViewService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IKeybindingService)
], SearchWidget);
export { SearchWidget };
export class EditPreferenceWidget extends Disposable {
    constructor(editor) {
        super();
        this.editor = editor;
        this._line = -1;
        this._preferences = [];
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._editPreferenceDecoration = this.editor.createDecorationsCollection();
        this._register(this.editor.onMouseDown((e) => {
            if (e.target.type !== 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
                e.target.detail.isAfterLines ||
                !this.isVisible()) {
                return;
            }
            this._onClick.fire(e);
        }));
    }
    get preferences() {
        return this._preferences;
    }
    getLine() {
        return this._line;
    }
    show(line, hoverMessage, preferences) {
        this._preferences = preferences;
        const newDecoration = [];
        this._line = line;
        newDecoration.push({
            options: {
                description: 'edit-preference-widget-decoration',
                glyphMarginClassName: ThemeIcon.asClassName(settingsEditIcon),
                glyphMarginHoverMessage: new MarkdownString().appendText(hoverMessage),
                stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            },
            range: {
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: line,
                endColumn: 1,
            },
        });
        this._editPreferenceDecoration.set(newDecoration);
    }
    hide() {
        this._editPreferenceDecoration.clear();
    }
    isVisible() {
        return this._editPreferenceDecoration.length > 0;
    }
    dispose() {
        this.hide();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9wcmVmZXJlbmNlc1dpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFzQixNQUFNLG9EQUFvRCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSwwREFBMEQsQ0FBQTtBQUtqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBT3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUNqSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUUvRyxPQUFPLEVBRU4sa0JBQWtC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