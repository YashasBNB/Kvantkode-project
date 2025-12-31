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
import * as dom from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { Action } from '../../../../base/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { switchTerminalActionViewItemSeparator, switchTerminalShowTabsTitle, } from './terminalActions.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { ITerminalConfigurationService, ITerminalGroupService, ITerminalService, } from './terminal.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { ITerminalProfileResolverService, ITerminalProfileService, } from '../common/terminal.js';
import { TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { ActionViewItem, SelectActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { asCssVariable, selectBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { TerminalTabbedView } from './terminalTabbedView.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { getColorForSeverity } from './terminalStatusList.js';
import { getFlatContextMenuActions, MenuEntryActionViewItem, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { DisposableMap, DisposableStore, dispose, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { getColorClass, getUriClasses } from './terminalIcon.js';
import { getTerminalActionBarArgs } from './terminalMenus.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { getInstanceHoverInfo } from './terminalTooltip.js';
import { defaultSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { Event } from '../../../../base/common/event.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { InstanceContext, TerminalContextActionRunner } from './terminalContextMenu.js';
import { MicrotaskDelay } from '../../../../base/common/symbols.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let TerminalViewPane = class TerminalViewPane extends ViewPane {
    get terminalTabbedView() {
        return this._terminalTabbedView;
    }
    constructor(options, keybindingService, _contextKeyService, viewDescriptorService, _configurationService, _contextMenuService, _instantiationService, _terminalService, _terminalConfigurationService, _terminalGroupService, themeService, hoverService, _notificationService, _keybindingService, openerService, _menuService, _terminalProfileService, _terminalProfileResolverService, _themeService, _accessibilityService) {
        super(options, keybindingService, _contextMenuService, _configurationService, _contextKeyService, viewDescriptorService, _instantiationService, openerService, themeService, hoverService);
        this._contextKeyService = _contextKeyService;
        this._configurationService = _configurationService;
        this._contextMenuService = _contextMenuService;
        this._instantiationService = _instantiationService;
        this._terminalService = _terminalService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalGroupService = _terminalGroupService;
        this._notificationService = _notificationService;
        this._keybindingService = _keybindingService;
        this._menuService = _menuService;
        this._terminalProfileService = _terminalProfileService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._themeService = _themeService;
        this._accessibilityService = _accessibilityService;
        this._isInitialized = false;
        /**
         * Tracks an active promise of terminal creation requested by this component. This helps prevent
         * double creation for example when toggling a terminal's visibility and focusing it.
         */
        this._isTerminalBeingCreated = false;
        this._newDropdown = this._register(new MutableDisposable());
        this._disposableStore = this._register(new DisposableStore());
        this._actionDisposables = this._register(new DisposableMap());
        this._register(this._terminalService.onDidRegisterProcessSupport(() => {
            this._onDidChangeViewWelcomeState.fire();
        }));
        this._register(this._terminalService.onDidChangeInstances(() => {
            // If the first terminal is opened, hide the welcome view
            // and if the last one is closed, show it again
            if (this._hasWelcomeScreen() && this._terminalGroupService.instances.length <= 1) {
                this._onDidChangeViewWelcomeState.fire();
            }
            if (!this._parentDomElement) {
                return;
            }
            // If we do not have the tab view yet, create it now.
            if (!this._terminalTabbedView) {
                this._createTabsView();
            }
            // If we just opened our first terminal, layout
            if (this._terminalGroupService.instances.length === 1) {
                this.layoutBody(this._parentDomElement.offsetHeight, this._parentDomElement.offsetWidth);
            }
        }));
        this._dropdownMenu = this._register(this._menuService.createMenu(MenuId.TerminalNewDropdownContext, this._contextKeyService));
        this._singleTabMenu = this._register(this._menuService.createMenu(MenuId.TerminalTabContext, this._contextKeyService));
        this._register(this._terminalProfileService.onDidChangeAvailableProfiles((profiles) => this._updateTabActionBar(profiles)));
        this._viewShowing = TerminalContextKeys.viewShowing.bindTo(this._contextKeyService);
        this._register(this.onDidChangeBodyVisibility((e) => {
            if (e) {
                this._terminalTabbedView?.rerenderTabs();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (this._parentDomElement &&
                (e.affectsConfiguration("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */) ||
                    e.affectsConfiguration("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */))) {
                this._updateForShellIntegration(this._parentDomElement);
            }
        }));
        const shellIntegrationDisposable = this._register(new MutableDisposable());
        shellIntegrationDisposable.value = this._terminalService.onAnyInstanceAddedCapabilityType((c) => {
            if (c === 2 /* TerminalCapability.CommandDetection */ && this._gutterDecorationsEnabled()) {
                this._parentDomElement?.classList.add('shell-integration');
                shellIntegrationDisposable.clear();
            }
        });
    }
    _updateForShellIntegration(container) {
        container.classList.toggle('shell-integration', this._gutterDecorationsEnabled());
    }
    _gutterDecorationsEnabled() {
        const decorationsEnabled = this._configurationService.getValue("terminal.integrated.shellIntegration.decorationsEnabled" /* TerminalSettingId.ShellIntegrationDecorationsEnabled */);
        return ((decorationsEnabled === 'both' || decorationsEnabled === 'gutter') &&
            this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */));
    }
    _initializeTerminal(checkRestoredTerminals) {
        if (this.isBodyVisible() &&
            this._terminalService.isProcessSupportRegistered &&
            this._terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
            const wasInitialized = this._isInitialized;
            this._isInitialized = true;
            let hideOnStartup = 'never';
            if (!wasInitialized) {
                hideOnStartup = this._configurationService.getValue("terminal.integrated.hideOnStartup" /* TerminalSettingId.HideOnStartup */);
                if (hideOnStartup === 'always') {
                    this._terminalGroupService.hidePanel();
                }
            }
            let shouldCreate = this._terminalGroupService.groups.length === 0;
            // When triggered just after reconnection, also check there are no groups that could be
            // getting restored currently
            if (checkRestoredTerminals) {
                shouldCreate &&= this._terminalService.restoredGroupCount === 0;
            }
            if (!shouldCreate) {
                return;
            }
            if (!wasInitialized) {
                switch (hideOnStartup) {
                    case 'never':
                        this._isTerminalBeingCreated = true;
                        this._terminalService
                            .createTerminal({ location: TerminalLocation.Panel })
                            .finally(() => (this._isTerminalBeingCreated = false));
                        break;
                    case 'whenEmpty':
                        if (this._terminalService.restoredGroupCount === 0) {
                            this._terminalGroupService.hidePanel();
                        }
                        break;
                }
                return;
            }
            if (!this._isTerminalBeingCreated) {
                this._isTerminalBeingCreated = true;
                this._terminalService
                    .createTerminal({ location: TerminalLocation.Panel })
                    .finally(() => (this._isTerminalBeingCreated = false));
            }
        }
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    renderBody(container) {
        super.renderBody(container);
        if (!this._parentDomElement) {
            this._updateForShellIntegration(container);
        }
        this._parentDomElement = container;
        this._parentDomElement.classList.add('integrated-terminal');
        domStylesheetsJs.createStyleSheet(this._parentDomElement);
        this._instantiationService.createInstance(TerminalThemeIconStyle, this._parentDomElement);
        if (!this.shouldShowWelcome()) {
            this._createTabsView();
        }
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */) ||
                e.affectsConfiguration('editor.fontFamily')) {
                if (!this._terminalConfigurationService.configFontIsMonospace()) {
                    const choices = [
                        {
                            label: nls.localize('terminal.useMonospace', "Use 'monospace'"),
                            run: () => this.configurationService.updateValue("terminal.integrated.fontFamily" /* TerminalSettingId.FontFamily */, 'monospace'),
                        },
                    ];
                    this._notificationService.prompt(Severity.Warning, nls.localize('terminal.monospaceOnly', 'The terminal only supports monospace fonts. Be sure to restart VS Code if this is a newly installed font.'), choices);
                }
            }
        }));
        this._register(this.onDidChangeBodyVisibility(async (visible) => {
            this._viewShowing.set(visible);
            if (visible) {
                if (this._hasWelcomeScreen()) {
                    this._onDidChangeViewWelcomeState.fire();
                }
                this._initializeTerminal(false);
                // we don't know here whether or not it should be focused, so
                // defer focusing the panel to the focus() call
                // to prevent overriding preserveFocus for extensions
                this._terminalGroupService.showPanel(false);
            }
            else {
                for (const instance of this._terminalGroupService.instances) {
                    instance.resetFocusContextKey();
                }
            }
            this._terminalGroupService.updateVisibility();
        }));
        this._register(this._terminalService.onDidChangeConnectionState(() => this._initializeTerminal(true)));
        this.layoutBody(this._parentDomElement.offsetHeight, this._parentDomElement.offsetWidth);
    }
    _createTabsView() {
        if (!this._parentDomElement) {
            return;
        }
        this._terminalTabbedView = this._register(this.instantiationService.createInstance(TerminalTabbedView, this._parentDomElement));
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._terminalTabbedView?.layout(width, height);
    }
    createActionViewItem(action, options) {
        switch (action.id) {
            case "workbench.action.terminal.split" /* TerminalCommandId.Split */: {
                // Split needs to be special cased to force splitting within the panel, not the editor
                const that = this;
                const store = new DisposableStore();
                const panelOnlySplitAction = store.add(new (class extends Action {
                    constructor() {
                        super(action.id, action.label, action.class, action.enabled);
                        this.checked = action.checked;
                        this.tooltip = action.tooltip;
                    }
                    async run() {
                        const instance = that._terminalGroupService.activeInstance;
                        if (instance) {
                            const newInstance = await that._terminalService.createTerminal({
                                location: { parentTerminal: instance },
                            });
                            return newInstance?.focusWhenReady();
                        }
                        return;
                    }
                })());
                const item = store.add(new ActionViewItem(action, panelOnlySplitAction, {
                    ...options,
                    icon: true,
                    label: false,
                    keybinding: this._getKeybindingLabel(action),
                }));
                this._actionDisposables.set(action.id, store);
                return item;
            }
            case "workbench.action.terminal.switchTerminal" /* TerminalCommandId.SwitchTerminal */: {
                const item = this._instantiationService.createInstance(SwitchTerminalActionViewItem, action);
                this._actionDisposables.set(action.id, item);
                return item;
            }
            case "workbench.action.terminal.focus" /* TerminalCommandId.Focus */: {
                if (action instanceof MenuItemAction) {
                    const actions = getFlatContextMenuActions(this._singleTabMenu.getActions({ shouldForwardArgs: true }));
                    const item = this._instantiationService.createInstance(SingleTerminalTabActionViewItem, action, actions);
                    this._actionDisposables.set(action.id, item);
                    return item;
                }
                break;
            }
            case "workbench.action.terminal.new" /* TerminalCommandId.New */: {
                if (action instanceof MenuItemAction) {
                    const actions = getTerminalActionBarArgs(TerminalLocation.Panel, this._terminalProfileService.availableProfiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
                    this._newDropdown.value = new DropdownWithPrimaryActionViewItem(action, actions.dropdownAction, actions.dropdownMenuActions, actions.className, { hoverDelegate: options.hoverDelegate }, this._contextMenuService, this._keybindingService, this._notificationService, this._contextKeyService, this._themeService, this._accessibilityService);
                    this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
                    return this._newDropdown.value;
                }
            }
        }
        return super.createActionViewItem(action, options);
    }
    _getDefaultProfileName() {
        let defaultProfileName;
        try {
            defaultProfileName = this._terminalProfileService.getDefaultProfileName();
        }
        catch (e) {
            defaultProfileName = this._terminalProfileResolverService.defaultProfileName;
        }
        return defaultProfileName;
    }
    _getKeybindingLabel(action) {
        return this._keybindingService.lookupKeybinding(action.id)?.getLabel() ?? undefined;
    }
    _updateTabActionBar(profiles) {
        const actions = getTerminalActionBarArgs(TerminalLocation.Panel, profiles, this._getDefaultProfileName(), this._terminalProfileService.contributedProfiles, this._terminalService, this._dropdownMenu, this._disposableStore);
        this._newDropdown.value?.update(actions.dropdownAction, actions.dropdownMenuActions);
    }
    focus() {
        super.focus();
        if (this._terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
            if (this._terminalGroupService.instances.length === 0 && !this._isTerminalBeingCreated) {
                this._isTerminalBeingCreated = true;
                this._terminalService
                    .createTerminal({ location: TerminalLocation.Panel })
                    .finally(() => (this._isTerminalBeingCreated = false));
            }
            this._terminalGroupService.showPanel(true);
            return;
        }
        // If the terminal is waiting to reconnect to remote terminals, then there is no TerminalInstance yet that can
        // be focused. So wait for connection to finish, then focus.
        const previousActiveElement = this.element.ownerDocument.activeElement;
        if (previousActiveElement) {
            // TODO: Improve lifecycle management this event should be disposed after first fire
            this._register(this._terminalService.onDidChangeConnectionState(() => {
                // Only focus the terminal if the activeElement has not changed since focus() was called
                // TODO: Hack
                if (previousActiveElement && dom.isActiveElement(previousActiveElement)) {
                    this._terminalGroupService.showPanel(true);
                }
            }));
        }
    }
    _hasWelcomeScreen() {
        return !this._terminalService.isProcessSupportRegistered;
    }
    shouldShowWelcome() {
        return this._hasWelcomeScreen() && this._terminalService.instances.length === 0;
    }
};
TerminalViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextKeyService),
    __param(3, IViewDescriptorService),
    __param(4, IConfigurationService),
    __param(5, IContextMenuService),
    __param(6, IInstantiationService),
    __param(7, ITerminalService),
    __param(8, ITerminalConfigurationService),
    __param(9, ITerminalGroupService),
    __param(10, IThemeService),
    __param(11, IHoverService),
    __param(12, INotificationService),
    __param(13, IKeybindingService),
    __param(14, IOpenerService),
    __param(15, IMenuService),
    __param(16, ITerminalProfileService),
    __param(17, ITerminalProfileResolverService),
    __param(18, IThemeService),
    __param(19, IAccessibilityService)
], TerminalViewPane);
export { TerminalViewPane };
let SwitchTerminalActionViewItem = class SwitchTerminalActionViewItem extends SelectActionViewItem {
    constructor(action, _terminalService, _terminalGroupService, contextViewService, terminalProfileService) {
        super(null, action, getTerminalSelectOpenItems(_terminalService, _terminalGroupService), _terminalGroupService.activeGroupIndex, contextViewService, defaultSelectBoxStyles, { ariaLabel: nls.localize('terminals', 'Open Terminals.'), optionsAsChildren: true });
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._register(_terminalService.onDidChangeInstances(() => this._updateItems(), this));
        this._register(_terminalService.onDidChangeActiveGroup(() => this._updateItems(), this));
        this._register(_terminalService.onDidChangeActiveInstance(() => this._updateItems(), this));
        this._register(_terminalService.onAnyInstanceTitleChange(() => this._updateItems(), this));
        this._register(_terminalGroupService.onDidChangeGroups(() => this._updateItems(), this));
        this._register(_terminalService.onDidChangeConnectionState(() => this._updateItems(), this));
        this._register(terminalProfileService.onDidChangeAvailableProfiles(() => this._updateItems(), this));
        this._register(_terminalService.onAnyInstancePrimaryStatusChange(() => this._updateItems(), this));
    }
    render(container) {
        super.render(container);
        container.classList.add('switch-terminal');
        container.style.borderColor = asCssVariable(selectBorder);
    }
    _updateItems() {
        const options = getTerminalSelectOpenItems(this._terminalService, this._terminalGroupService);
        this.setOptions(options, this._terminalGroupService.activeGroupIndex);
    }
};
SwitchTerminalActionViewItem = __decorate([
    __param(1, ITerminalService),
    __param(2, ITerminalGroupService),
    __param(3, IContextViewService),
    __param(4, ITerminalProfileService)
], SwitchTerminalActionViewItem);
function getTerminalSelectOpenItems(terminalService, terminalGroupService) {
    let items;
    if (terminalService.connectionState === 1 /* TerminalConnectionState.Connected */) {
        items = terminalGroupService.getGroupLabels().map((label) => {
            return { text: label };
        });
    }
    else {
        items = [{ text: nls.localize('terminalConnectingLabel', 'Starting...') }];
    }
    items.push({ text: switchTerminalActionViewItemSeparator, isDisabled: true });
    items.push({ text: switchTerminalShowTabsTitle });
    return items;
}
let SingleTerminalTabActionViewItem = class SingleTerminalTabActionViewItem extends MenuEntryActionViewItem {
    constructor(action, _actions, keybindingService, notificationService, contextKeyService, themeService, _terminalService, _terminaConfigurationService, _terminalGroupService, contextMenuService, _commandService, _instantiationService, _accessibilityService) {
        super(action, {
            draggable: true,
            hoverDelegate: _instantiationService.createInstance(SingleTabHoverDelegate),
        }, keybindingService, notificationService, contextKeyService, themeService, contextMenuService, _accessibilityService);
        this._actions = _actions;
        this._terminalService = _terminalService;
        this._terminaConfigurationService = _terminaConfigurationService;
        this._terminalGroupService = _terminalGroupService;
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._elementDisposables = [];
        // Register listeners to update the tab
        this._register(Event.debounce(Event.any(this._terminalService.onAnyInstancePrimaryStatusChange, this._terminalGroupService.onDidChangeActiveInstance, Event.map(this._terminalService.onAnyInstanceIconChange, (e) => e.instance), this._terminalService.onAnyInstanceTitleChange, this._terminalService.onDidChangeInstanceCapability), (last, e) => {
            if (!last) {
                last = new Set();
            }
            if (e) {
                last.add(e);
            }
            return last;
        }, MicrotaskDelay)((merged) => {
            for (const e of merged) {
                this.updateLabel(e);
            }
        }));
        // Clean up on dispose
        this._register(toDisposable(() => dispose(this._elementDisposables)));
    }
    async onClick(event) {
        this._terminalGroupService.lastAccessedMenu = 'inline-tab';
        if (event.altKey && this._menuItemAction.alt) {
            this._commandService.executeCommand(this._menuItemAction.alt.id, {
                location: TerminalLocation.Panel,
            });
        }
        else {
            this._openContextMenu();
        }
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    updateLabel(e) {
        // Only update if it's the active instance
        if (e && e !== this._terminalGroupService.activeInstance) {
            return;
        }
        if (this._elementDisposables.length === 0 && this.element && this.label) {
            // Right click opens context menu
            this._elementDisposables.push(dom.addDisposableListener(this.element, dom.EventType.CONTEXT_MENU, (e) => {
                if (e.button === 2) {
                    this._openContextMenu();
                    e.preventDefault();
                }
            }));
            // Middle click kills
            this._elementDisposables.push(dom.addDisposableListener(this.element, dom.EventType.AUXCLICK, (e) => {
                if (e.button === 1) {
                    const instance = this._terminalGroupService.activeInstance;
                    if (instance) {
                        this._terminalService.safeDisposeTerminal(instance);
                    }
                    e.preventDefault();
                }
            }));
            // Drag and drop
            this._elementDisposables.push(dom.addDisposableListener(this.element, dom.EventType.DRAG_START, (e) => {
                const instance = this._terminalGroupService.activeInstance;
                if (e.dataTransfer && instance) {
                    e.dataTransfer.setData("Terminals" /* TerminalDataTransfers.Terminals */, JSON.stringify([instance.resource.toString()]));
                }
            }));
        }
        if (this.label) {
            const label = this.label;
            const instance = this._terminalGroupService.activeInstance;
            if (!instance) {
                dom.reset(label, '');
                return;
            }
            label.classList.add('single-terminal-tab');
            let colorStyle = '';
            const primaryStatus = instance.statusList.primary;
            if (primaryStatus) {
                const colorKey = getColorForSeverity(primaryStatus.severity);
                this._themeService.getColorTheme();
                const foundColor = this._themeService.getColorTheme().getColor(colorKey);
                if (foundColor) {
                    colorStyle = foundColor.toString();
                }
            }
            label.style.color = colorStyle;
            dom.reset(label, ...renderLabelWithIcons(this._instantiationService.invokeFunction(getSingleTabLabel, instance, this._terminaConfigurationService.config.tabs.separator, ThemeIcon.isThemeIcon(this._commandAction.item.icon)
                ? this._commandAction.item.icon
                : undefined)));
            if (this._altCommand) {
                label.classList.remove(this._altCommand);
                this._altCommand = undefined;
            }
            if (this._color) {
                label.classList.remove(this._color);
                this._color = undefined;
            }
            if (this._class) {
                label.classList.remove(this._class);
                label.classList.remove('terminal-uri-icon');
                this._class = undefined;
            }
            const colorClass = getColorClass(instance);
            if (colorClass) {
                this._color = colorClass;
                label.classList.add(colorClass);
            }
            const uriClasses = getUriClasses(instance, this._themeService.getColorTheme().type);
            if (uriClasses) {
                this._class = uriClasses?.[0];
                label.classList.add(...uriClasses);
            }
            if (this._commandAction.item.icon) {
                this._altCommand = `alt-command`;
                label.classList.add(this._altCommand);
            }
            this.updateTooltip();
        }
    }
    _openContextMenu() {
        const actionRunner = new TerminalContextActionRunner();
        this._contextMenuService.showContextMenu({
            actionRunner,
            getAnchor: () => this.element,
            getActions: () => this._actions,
            // The context is always the active instance in the terminal view
            getActionsContext: () => {
                const instance = this._terminalGroupService.activeInstance;
                return instance ? [new InstanceContext(instance)] : [];
            },
            onHide: () => actionRunner.dispose(),
        });
    }
};
SingleTerminalTabActionViewItem = __decorate([
    __param(2, IKeybindingService),
    __param(3, INotificationService),
    __param(4, IContextKeyService),
    __param(5, IThemeService),
    __param(6, ITerminalService),
    __param(7, ITerminalConfigurationService),
    __param(8, ITerminalGroupService),
    __param(9, IContextMenuService),
    __param(10, ICommandService),
    __param(11, IInstantiationService),
    __param(12, IAccessibilityService)
], SingleTerminalTabActionViewItem);
function getSingleTabLabel(accessor, instance, separator, icon) {
    // Don't even show the icon if there is no title as the icon would shift around when the title
    // is added
    if (!instance || !instance.title) {
        return '';
    }
    const iconId = ThemeIcon.isThemeIcon(instance.icon)
        ? instance.icon.id
        : accessor.get(ITerminalProfileResolverService).getDefaultIcon().id;
    const label = `$(${icon?.id || iconId}) ${getSingleTabTitle(instance, separator)}`;
    const primaryStatus = instance.statusList.primary;
    if (!primaryStatus?.icon) {
        return label;
    }
    return `${label} $(${primaryStatus.icon.id})`;
}
function getSingleTabTitle(instance, separator) {
    if (!instance) {
        return '';
    }
    return !instance.description
        ? instance.title
        : `${instance.title} ${separator} ${instance.description}`;
}
let TerminalThemeIconStyle = class TerminalThemeIconStyle extends Themable {
    constructor(container, _themeService, _terminalService, _terminalGroupService) {
        super(_themeService);
        this._themeService = _themeService;
        this._terminalService = _terminalService;
        this._terminalGroupService = _terminalGroupService;
        this._registerListeners();
        this._styleElement = domStylesheetsJs.createStyleSheet(container);
        this._register(toDisposable(() => this._styleElement.remove()));
        this.updateStyles();
    }
    _registerListeners() {
        this._register(this._terminalService.onAnyInstanceIconChange(() => this.updateStyles()));
        this._register(this._terminalService.onDidChangeInstances(() => this.updateStyles()));
        this._register(this._terminalGroupService.onDidChangeGroups(() => this.updateStyles()));
    }
    updateStyles() {
        super.updateStyles();
        const colorTheme = this._themeService.getColorTheme();
        // TODO: add a rule collector to avoid duplication
        let css = '';
        // Add icons
        for (const instance of this._terminalService.instances) {
            const icon = instance.icon;
            if (!icon) {
                continue;
            }
            let uri = undefined;
            if (icon instanceof URI) {
                uri = icon;
            }
            else if (icon instanceof Object && 'light' in icon && 'dark' in icon) {
                uri = colorTheme.type === ColorScheme.LIGHT ? icon.light : icon.dark;
            }
            const iconClasses = getUriClasses(instance, colorTheme.type);
            if (uri instanceof URI && iconClasses && iconClasses.length > 1) {
                css +=
                    `.monaco-workbench .${iconClasses[0]} .monaco-highlighted-label .codicon, .monaco-action-bar .terminal-uri-icon.single-terminal-tab.action-label:not(.alt-command) .codicon` +
                        `{background-image: ${cssJs.asCSSUrl(uri)};}`;
            }
        }
        // Add colors
        for (const instance of this._terminalService.instances) {
            const colorClass = getColorClass(instance);
            if (!colorClass || !instance.color) {
                continue;
            }
            const color = colorTheme.getColor(instance.color);
            if (color) {
                // exclude status icons (file-icon) and inline action icons (trashcan, horizontalSplit, rerunTask)
                css +=
                    `.monaco-workbench .${colorClass} .codicon:first-child:not(.codicon-split-horizontal):not(.codicon-trashcan):not(.file-icon):not(.codicon-rerun-task)` +
                        `{ color: ${color} !important; }`;
            }
        }
        this._styleElement.textContent = css;
    }
};
TerminalThemeIconStyle = __decorate([
    __param(1, IThemeService),
    __param(2, ITerminalService),
    __param(3, ITerminalGroupService)
], TerminalThemeIconStyle);
let SingleTabHoverDelegate = class SingleTabHoverDelegate {
    constructor(_configurationService, _hoverService, _storageService, _terminalGroupService) {
        this._configurationService = _configurationService;
        this._hoverService = _hoverService;
        this._storageService = _storageService;
        this._terminalGroupService = _terminalGroupService;
        this._lastHoverHideTime = 0;
        this.placement = 'element';
    }
    get delay() {
        return Date.now() - this._lastHoverHideTime < 200
            ? 0 // show instantly when a hover was recently shown
            : this._configurationService.getValue('workbench.hover.delay');
    }
    showHover(options, focus) {
        const instance = this._terminalGroupService.activeInstance;
        if (!instance) {
            return;
        }
        const hoverInfo = getInstanceHoverInfo(instance, this._storageService);
        return this._hoverService.showInstantHover({
            ...options,
            content: hoverInfo.content,
            actions: hoverInfo.actions,
        }, focus);
    }
    onDidHideHover() {
        this._lastHoverHideTime = Date.now();
    }
};
SingleTabHoverDelegate = __decorate([
    __param(0, IConfigurationService),
    __param(1, IHoverService),
    __param(2, IStorageService),
    __param(3, ITerminalGroupService)
], SingleTabHoverDelegate);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEtBQUssS0FBSyxNQUFNLHNDQUFzQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixHQUNuQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTixxQ0FBcUMsRUFDckMsMkJBQTJCLEdBQzNCLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUNOLG9CQUFvQixFQUVwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sNkJBQTZCLEVBQzdCLHFCQUFxQixFQUVyQixnQkFBZ0IsR0FHaEIsTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUFFLFFBQVEsRUFBb0IsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUs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