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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNXaWRnZXRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wcmVmZXJlbmNlcy9icm93c2VyL3ByZWZlcmVuY2VzV2lkZ2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQXNCLE1BQU0sb0RBQW9ELENBQUE7QUFDbEcsT0FBTyxFQUNOLGtCQUFrQixHQUVsQixNQUFNLDBEQUEwRCxDQUFBO0FBS2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFPcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ2pILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBRS9HLE9BQU8sRUFFTixr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