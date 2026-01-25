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
import './media/menubarControl.css';
import { localize, localize2 } from '../../../../nls.js';
import { IMenuService, MenuId, SubmenuItemAction, registerAction2, Action2, MenuItemAction, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { getMenuBarVisibility, hasNativeTitlebar, } from '../../../../platform/window/common/window.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Action, SubmenuAction, Separator, ActionRunner, toAction, } from '../../../../base/common/actions.js';
import { addDisposableListener, Dimension, EventType } from '../../../../base/browser/dom.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { isMacintosh, isWeb, isIOS, isNative } from '../../../../base/common/platform.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { isRecentFolder, isRecentWorkspace, IWorkspacesService, } from '../../../../platform/workspaces/common/workspaces.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { MenuBar } from '../../../../base/browser/ui/menu/menubar.js';
import { HorizontalDirection, VerticalDirection, } from '../../../../base/browser/ui/menu/menu.js';
import { mnemonicMenuLabel, unmnemonicLabel } from '../../../../base/common/labels.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { isFullscreen, onDidChangeFullscreen } from '../../../../base/browser/browser.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import { IsMacNativeContext, IsWebContext, } from '../../../../platform/contextkey/common/contextkeys.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { OpenRecentAction } from '../../actions/windowActions.js';
import { isICommandActionToggleInfo } from '../../../../platform/action/common/action.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { defaultMenuStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { mainWindow } from '../../../../base/browser/window.js';
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarFileMenu,
    title: {
        value: 'File',
        original: 'File',
        mnemonicTitle: localize({ key: 'mFile', comment: ['&& denotes a mnemonic'] }, '&&File'),
    },
    order: 1,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarEditMenu,
    title: {
        value: 'Edit',
        original: 'Edit',
        mnemonicTitle: localize({ key: 'mEdit', comment: ['&& denotes a mnemonic'] }, '&&Edit'),
    },
    order: 2,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarSelectionMenu,
    title: {
        value: 'Selection',
        original: 'Selection',
        mnemonicTitle: localize({ key: 'mSelection', comment: ['&& denotes a mnemonic'] }, '&&Selection'),
    },
    order: 3,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarViewMenu,
    title: {
        value: 'View',
        original: 'View',
        mnemonicTitle: localize({ key: 'mView', comment: ['&& denotes a mnemonic'] }, '&&View'),
    },
    order: 4,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarGoMenu,
    title: {
        value: 'Go',
        original: 'Go',
        mnemonicTitle: localize({ key: 'mGoto', comment: ['&& denotes a mnemonic'] }, '&&Go'),
    },
    order: 5,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarTerminalMenu,
    title: {
        value: 'Terminal',
        original: 'Terminal',
        mnemonicTitle: localize({ key: 'mTerminal', comment: ['&& denotes a mnemonic'] }, '&&Terminal'),
    },
    order: 7,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarHelpMenu,
    title: {
        value: 'Help',
        original: 'Help',
        mnemonicTitle: localize({ key: 'mHelp', comment: ['&& denotes a mnemonic'] }, '&&Help'),
    },
    order: 8,
});
MenuRegistry.appendMenuItem(MenuId.MenubarMainMenu, {
    submenu: MenuId.MenubarPreferencesMenu,
    title: {
        value: 'Preferences',
        original: 'Preferences',
        mnemonicTitle: localize({ key: 'mPreferences', comment: ['&& denotes a mnemonic'] }, 'Preferences'),
    },
    when: IsMacNativeContext,
    order: 9,
});
export class MenubarControl extends Disposable {
    static { this.MAX_MENU_RECENT_ENTRIES = 10; }
    constructor(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, hostService, commandService) {
        super();
        this.menuService = menuService;
        this.workspacesService = workspacesService;
        this.contextKeyService = contextKeyService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.labelService = labelService;
        this.updateService = updateService;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.preferencesService = preferencesService;
        this.environmentService = environmentService;
        this.accessibilityService = accessibilityService;
        this.hostService = hostService;
        this.commandService = commandService;
        this.keys = [
            'window.menuBarVisibility',
            'window.enableMenuBarMnemonics',
            'window.customMenuBarAltFocus',
            'workbench.sideBar.location',
            'window.nativeTabs',
        ];
        this.menus = {};
        this.topLevelTitles = {};
        this.recentlyOpened = { files: [], workspaces: [] };
        this.mainMenu = this._register(this.menuService.createMenu(MenuId.MenubarMainMenu, this.contextKeyService));
        this.mainMenuDisposables = this._register(new DisposableStore());
        this.setupMainMenu();
        this.menuUpdater = this._register(new RunOnceScheduler(() => this.doUpdateMenubar(false), 200));
        this.notifyUserOfCustomMenubarAccessibility();
    }
    registerListeners() {
        // Listen for window focus changes
        this._register(this.hostService.onDidChangeFocus((e) => this.onDidChangeWindowFocus(e)));
        // Update when config changes
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
        // Listen to update service
        this._register(this.updateService.onStateChange(() => this.onUpdateStateChange()));
        // Listen for changes in recently opened menu
        this._register(this.workspacesService.onDidChangeRecentlyOpened(() => {
            this.onDidChangeRecentlyOpened();
        }));
        // Listen to keybindings change
        this._register(this.keybindingService.onDidUpdateKeybindings(() => this.updateMenubar()));
        // Update recent menu items on formatter registration
        this._register(this.labelService.onDidChangeFormatters(() => {
            this.onDidChangeRecentlyOpened();
        }));
        // Listen for changes on the main menu
        this._register(this.mainMenu.onDidChange(() => {
            this.setupMainMenu();
            this.doUpdateMenubar(true);
        }));
    }
    setupMainMenu() {
        this.mainMenuDisposables.clear();
        this.menus = {};
        this.topLevelTitles = {};
        const [, mainMenuActions] = this.mainMenu.getActions()[0];
        for (const mainMenuAction of mainMenuActions) {
            if (mainMenuAction instanceof SubmenuItemAction &&
                typeof mainMenuAction.item.title !== 'string') {
                this.menus[mainMenuAction.item.title.original] = this.mainMenuDisposables.add(this.menuService.createMenu(mainMenuAction.item.submenu, this.contextKeyService, {
                    emitEventsForSubmenuChanges: true,
                }));
                this.topLevelTitles[mainMenuAction.item.title.original] =
                    mainMenuAction.item.title.mnemonicTitle ?? mainMenuAction.item.title.value;
            }
        }
    }
    updateMenubar() {
        this.menuUpdater.schedule();
    }
    calculateActionLabel(action) {
        const label = action.label;
        switch (action.id) {
            default:
                break;
        }
        return label;
    }
    onUpdateStateChange() {
        this.updateMenubar();
    }
    onUpdateKeybindings() {
        this.updateMenubar();
    }
    getOpenRecentActions() {
        if (!this.recentlyOpened) {
            return [];
        }
        const { workspaces, files } = this.recentlyOpened;
        const result = [];
        if (workspaces.length > 0) {
            for (let i = 0; i < MenubarControl.MAX_MENU_RECENT_ENTRIES && i < workspaces.length; i++) {
                result.push(this.createOpenRecentMenuAction(workspaces[i]));
            }
            result.push(new Separator());
        }
        if (files.length > 0) {
            for (let i = 0; i < MenubarControl.MAX_MENU_RECENT_ENTRIES && i < files.length; i++) {
                result.push(this.createOpenRecentMenuAction(files[i]));
            }
            result.push(new Separator());
        }
        return result;
    }
    onDidChangeWindowFocus(hasFocus) {
        // When we regain focus, update the recent menu items
        if (hasFocus) {
            this.onDidChangeRecentlyOpened();
        }
    }
    onConfigurationUpdated(event) {
        if (this.keys.some((key) => event.affectsConfiguration(key))) {
            this.updateMenubar();
        }
        if (event.affectsConfiguration('editor.accessibilitySupport')) {
            this.notifyUserOfCustomMenubarAccessibility();
        }
        // Since we try not update when hidden, we should
        // try to update the recently opened list on visibility changes
        if (event.affectsConfiguration('window.menuBarVisibility')) {
            this.onDidChangeRecentlyOpened();
        }
    }
    get menubarHidden() {
        return isMacintosh && isNative
            ? false
            : getMenuBarVisibility(this.configurationService) === 'hidden';
    }
    onDidChangeRecentlyOpened() {
        // Do not update recently opened when the menubar is hidden #108712
        if (!this.menubarHidden) {
            this.workspacesService.getRecentlyOpened().then((recentlyOpened) => {
                this.recentlyOpened = recentlyOpened;
                this.updateMenubar();
            });
        }
    }
    createOpenRecentMenuAction(recent) {
        let label;
        let uri;
        let commandId;
        let openable;
        const remoteAuthority = recent.remoteAuthority;
        if (isRecentFolder(recent)) {
            uri = recent.folderUri;
            label = recent.label || this.labelService.getWorkspaceLabel(uri, { verbose: 2 /* Verbosity.LONG */ });
            commandId = 'openRecentFolder';
            openable = { folderUri: uri };
        }
        else if (isRecentWorkspace(recent)) {
            uri = recent.workspace.configPath;
            label =
                recent.label ||
                    this.labelService.getWorkspaceLabel(recent.workspace, { verbose: 2 /* Verbosity.LONG */ });
            commandId = 'openRecentWorkspace';
            openable = { workspaceUri: uri };
        }
        else {
            uri = recent.fileUri;
            label = recent.label || this.labelService.getUriLabel(uri, { appendWorkspaceSuffix: true });
            commandId = 'openRecentFile';
            openable = { fileUri: uri };
        }
        const ret = toAction({
            id: commandId,
            label: unmnemonicLabel(label),
            run: (browserEvent) => {
                const openInNewWindow = browserEvent &&
                    ((!isMacintosh && (browserEvent.ctrlKey || browserEvent.shiftKey)) ||
                        (isMacintosh && (browserEvent.metaKey || browserEvent.altKey)));
                return this.hostService.openWindow([openable], {
                    forceNewWindow: !!openInNewWindow,
                    remoteAuthority: remoteAuthority || null, // local window if remoteAuthority is not set or can not be deducted from the openable
                });
            },
        });
        return Object.assign(ret, { uri, remoteAuthority });
    }
    notifyUserOfCustomMenubarAccessibility() {
        if (isWeb || isMacintosh) {
            return;
        }
        const hasBeenNotified = this.storageService.getBoolean('menubar/accessibleMenubarNotified', -1 /* StorageScope.APPLICATION */, false);
        const usingCustomMenubar = !hasNativeTitlebar(this.configurationService);
        if (hasBeenNotified ||
            usingCustomMenubar ||
            !this.accessibilityService.isScreenReaderOptimized()) {
            return;
        }
        const message = localize('menubar.customTitlebarAccessibilityNotification', 'Accessibility support is enabled for you. For the most accessible experience, we recommend the custom title bar style.');
        this.notificationService.prompt(Severity.Info, message, [
            {
                label: localize('goToSetting', 'Open Settings'),
                run: () => {
                    return this.preferencesService.openUserSettings({
                        query: "window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */,
                    });
                },
            },
        ]);
        this.storageService.store('menubar/accessibleMenubarNotified', true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
}
// This is a bit complex due to the issue https://github.com/microsoft/vscode/issues/205836
let focusMenuBarEmitter = undefined;
function enableFocusMenuBarAction() {
    if (!focusMenuBarEmitter) {
        focusMenuBarEmitter = new Emitter();
        registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: `workbench.actions.menubar.focus`,
                    title: localize2('focusMenu', 'Focus Application Menu'),
                    keybinding: {
                        primary: 512 /* KeyMod.Alt */ | 68 /* KeyCode.F10 */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: IsWebContext,
                    },
                    f1: true,
                });
            }
            async run() {
                focusMenuBarEmitter?.fire();
            }
        });
    }
    return focusMenuBarEmitter;
}
let CustomMenubarControl = class CustomMenubarControl extends MenubarControl {
    constructor(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, telemetryService, hostService, commandService) {
        super(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, hostService, commandService);
        this.telemetryService = telemetryService;
        this.alwaysOnMnemonics = false;
        this.focusInsideMenubar = false;
        this.pendingFirstTimeUpdate = false;
        this.visible = true;
        this.webNavigationMenu = this._register(this.menuService.createMenu(MenuId.MenubarHomeMenu, this.contextKeyService));
        this.reinstallDisposables = this._register(new DisposableStore());
        this.updateActionsDisposables = this._register(new DisposableStore());
        this._onVisibilityChange = this._register(new Emitter());
        this._onFocusStateChange = this._register(new Emitter());
        this.actionRunner = this._register(new ActionRunner());
        this.actionRunner.onDidRun((e) => {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: e.action.id, from: 'menu' });
        });
        this.workspacesService.getRecentlyOpened().then((recentlyOpened) => {
            this.recentlyOpened = recentlyOpened;
        });
        this.registerListeners();
    }
    doUpdateMenubar(firstTime) {
        if (!this.focusInsideMenubar) {
            this.setupCustomMenubar(firstTime);
        }
        if (firstTime) {
            this.pendingFirstTimeUpdate = true;
        }
    }
    getUpdateAction() {
        const state = this.updateService.state;
        switch (state.type) {
            case "idle" /* StateType.Idle */:
                return new Action('update.check', localize({ key: 'checkForUpdates', comment: ['&& denotes a mnemonic'] }, 'Check for &&Updates...'), undefined, true, () => this.updateService.checkForUpdates(true));
            case "checking for updates" /* StateType.CheckingForUpdates */:
                return new Action('update.checking', localize('checkingForUpdates', 'Checking for Updates...'), undefined, false);
            case "available for download" /* StateType.AvailableForDownload */:
                return new Action('update.downloadNow', localize({ key: 'download now', comment: ['&& denotes a mnemonic'] }, 'D&&ownload Update'), undefined, true, () => this.updateService.downloadUpdate());
            case "downloading" /* StateType.Downloading */:
                return new Action('update.downloading', localize('DownloadingUpdate', 'Downloading Update...'), undefined, false);
            case "downloaded" /* StateType.Downloaded */:
                return isMacintosh
                    ? null
                    : new Action('update.install', localize({ key: 'installUpdate...', comment: ['&& denotes a mnemonic'] }, 'Install &&Update...'), undefined, true, () => this.updateService.applyUpdate());
            case "updating" /* StateType.Updating */:
                return new Action('update.updating', localize('installingUpdate', 'Installing Update...'), undefined, false);
            case "ready" /* StateType.Ready */:
                return new Action('update.restart', localize({ key: 'restartToUpdate', comment: ['&& denotes a mnemonic'] }, 'Restart to &&Update'), undefined, true, () => this.updateService.quitAndInstall());
            default:
                return null;
        }
    }
    get currentMenubarVisibility() {
        return getMenuBarVisibility(this.configurationService);
    }
    get currentDisableMenuBarAltFocus() {
        const settingValue = this.configurationService.getValue('window.customMenuBarAltFocus');
        let disableMenuBarAltBehavior = false;
        if (typeof settingValue === 'boolean') {
            disableMenuBarAltBehavior = !settingValue;
        }
        return disableMenuBarAltBehavior;
    }
    insertActionsBefore(nextAction, target) {
        switch (nextAction.id) {
            case OpenRecentAction.ID:
                target.push(...this.getOpenRecentActions());
                break;
            case 'workbench.action.showAboutDialog':
                if (!isMacintosh && !isWeb) {
                    const updateAction = this.getUpdateAction();
                    if (updateAction) {
                        updateAction.label = mnemonicMenuLabel(updateAction.label);
                        target.push(updateAction);
                        target.push(new Separator());
                    }
                }
                break;
            default:
                break;
        }
    }
    get currentEnableMenuBarMnemonics() {
        let enableMenuBarMnemonics = this.configurationService.getValue('window.enableMenuBarMnemonics');
        if (typeof enableMenuBarMnemonics !== 'boolean') {
            enableMenuBarMnemonics = true;
        }
        return enableMenuBarMnemonics && (!isWeb || isFullscreen(mainWindow));
    }
    get currentCompactMenuMode() {
        if (this.currentMenubarVisibility !== 'compact') {
            return undefined;
        }
        // Menu bar lives in activity bar and should flow based on its location
        const currentSidebarLocation = this.configurationService.getValue('workbench.sideBar.location');
        const horizontalDirection = currentSidebarLocation === 'right' ? HorizontalDirection.Left : HorizontalDirection.Right;
        const activityBarLocation = this.configurationService.getValue('workbench.activityBar.location');
        const verticalDirection = activityBarLocation === "bottom" /* ActivityBarPosition.BOTTOM */
            ? VerticalDirection.Above
            : VerticalDirection.Below;
        return { horizontal: horizontalDirection, vertical: verticalDirection };
    }
    onDidVisibilityChange(visible) {
        this.visible = visible;
        this.onDidChangeRecentlyOpened();
        this._onVisibilityChange.fire(visible);
    }
    toActionsArray(menu) {
        return getFlatContextMenuActions(menu.getActions({ shouldForwardArgs: true }));
    }
    setupCustomMenubar(firstTime) {
        // If there is no container, we cannot setup the menubar
        if (!this.container) {
            return;
        }
        if (firstTime) {
            // Reset and create new menubar
            if (this.menubar) {
                this.reinstallDisposables.clear();
            }
            this.menubar = this.reinstallDisposables.add(new MenuBar(this.container, this.getMenuBarOptions(), defaultMenuStyles));
            this.accessibilityService.alwaysUnderlineAccessKeys().then((val) => {
                this.alwaysOnMnemonics = val;
                this.menubar?.update(this.getMenuBarOptions());
            });
            this.reinstallDisposables.add(this.menubar.onFocusStateChange((focused) => {
                this._onFocusStateChange.fire(focused);
                // When the menubar loses focus, update it to clear any pending updates
                if (!focused) {
                    if (this.pendingFirstTimeUpdate) {
                        this.setupCustomMenubar(true);
                        this.pendingFirstTimeUpdate = false;
                    }
                    else {
                        this.updateMenubar();
                    }
                    this.focusInsideMenubar = false;
                }
            }));
            this.reinstallDisposables.add(this.menubar.onVisibilityChange((e) => this.onDidVisibilityChange(e)));
            // Before we focus the menubar, stop updates to it so that focus-related context keys will work
            this.reinstallDisposables.add(addDisposableListener(this.container, EventType.FOCUS_IN, () => {
                this.focusInsideMenubar = true;
            }));
            this.reinstallDisposables.add(addDisposableListener(this.container, EventType.FOCUS_OUT, () => {
                this.focusInsideMenubar = false;
            }));
            // Fire visibility change for the first install if menu is shown
            if (this.menubar.isVisible) {
                this.onDidVisibilityChange(true);
            }
        }
        else {
            this.menubar?.update(this.getMenuBarOptions());
        }
        // Update the menu actions
        const updateActions = (menuActions, target, topLevelTitle, store) => {
            target.splice(0);
            for (const menuItem of menuActions) {
                this.insertActionsBefore(menuItem, target);
                if (menuItem instanceof Separator) {
                    target.push(menuItem);
                }
                else if (menuItem instanceof SubmenuItemAction || menuItem instanceof MenuItemAction) {
                    // use mnemonicTitle whenever possible
                    let title = typeof menuItem.item.title === 'string'
                        ? menuItem.item.title
                        : (menuItem.item.title.mnemonicTitle ?? menuItem.item.title.value);
                    if (menuItem instanceof SubmenuItemAction) {
                        const submenuActions = [];
                        updateActions(menuItem.actions, submenuActions, topLevelTitle, store);
                        if (submenuActions.length > 0) {
                            target.push(new SubmenuAction(menuItem.id, mnemonicMenuLabel(title), submenuActions));
                        }
                    }
                    else {
                        if (isICommandActionToggleInfo(menuItem.item.toggled)) {
                            title = menuItem.item.toggled.mnemonicTitle ?? menuItem.item.toggled.title ?? title;
                        }
                        const newAction = store.add(new Action(menuItem.id, mnemonicMenuLabel(title), menuItem.class, menuItem.enabled, () => this.commandService.executeCommand(menuItem.id)));
                        newAction.tooltip = menuItem.tooltip;
                        newAction.checked = menuItem.checked;
                        target.push(newAction);
                    }
                }
            }
            // Append web navigation menu items to the file menu when not compact
            if (topLevelTitle === 'File' && this.currentCompactMenuMode === undefined) {
                const webActions = this.getWebNavigationActions();
                if (webActions.length) {
                    target.push(...webActions);
                }
            }
        };
        for (const title of Object.keys(this.topLevelTitles)) {
            const menu = this.menus[title];
            if (firstTime && menu) {
                const menuChangedDisposable = this.reinstallDisposables.add(new DisposableStore());
                this.reinstallDisposables.add(menu.onDidChange(() => {
                    if (!this.focusInsideMenubar) {
                        const actions = [];
                        menuChangedDisposable.clear();
                        updateActions(this.toActionsArray(menu), actions, title, menuChangedDisposable);
                        this.menubar?.updateMenu({
                            actions,
                            label: mnemonicMenuLabel(this.topLevelTitles[title]),
                        });
                    }
                }));
                // For the file menu, we need to update if the web nav menu updates as well
                if (menu === this.menus.File) {
                    const webMenuChangedDisposable = this.reinstallDisposables.add(new DisposableStore());
                    this.reinstallDisposables.add(this.webNavigationMenu.onDidChange(() => {
                        if (!this.focusInsideMenubar) {
                            const actions = [];
                            webMenuChangedDisposable.clear();
                            updateActions(this.toActionsArray(menu), actions, title, webMenuChangedDisposable);
                            this.menubar?.updateMenu({
                                actions,
                                label: mnemonicMenuLabel(this.topLevelTitles[title]),
                            });
                        }
                    }));
                }
            }
            const actions = [];
            if (menu) {
                this.updateActionsDisposables.clear();
                updateActions(this.toActionsArray(menu), actions, title, this.updateActionsDisposables);
            }
            if (this.menubar) {
                if (!firstTime) {
                    this.menubar.updateMenu({ actions, label: mnemonicMenuLabel(this.topLevelTitles[title]) });
                }
                else {
                    this.menubar.push({ actions, label: mnemonicMenuLabel(this.topLevelTitles[title]) });
                }
            }
        }
    }
    getWebNavigationActions() {
        if (!isWeb) {
            return []; // only for web
        }
        const webNavigationActions = [];
        for (const groups of this.webNavigationMenu.getActions()) {
            const [, actions] = groups;
            for (const action of actions) {
                if (action instanceof MenuItemAction) {
                    const title = typeof action.item.title === 'string'
                        ? action.item.title
                        : (action.item.title.mnemonicTitle ?? action.item.title.value);
                    webNavigationActions.push(new Action(action.id, mnemonicMenuLabel(title), action.class, action.enabled, async (event) => {
                        this.commandService.executeCommand(action.id, event);
                    }));
                }
            }
            webNavigationActions.push(new Separator());
        }
        if (webNavigationActions.length) {
            webNavigationActions.pop();
        }
        return webNavigationActions;
    }
    getMenuBarOptions() {
        return {
            enableMnemonics: this.currentEnableMenuBarMnemonics,
            disableAltFocus: this.currentDisableMenuBarAltFocus,
            visibility: this.currentMenubarVisibility,
            actionRunner: this.actionRunner,
            getKeybinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            alwaysOnMnemonics: this.alwaysOnMnemonics,
            compactMode: this.currentCompactMenuMode,
            getCompactMenuActions: () => {
                if (!isWeb) {
                    return []; // only for web
                }
                return this.getWebNavigationActions();
            },
        };
    }
    onDidChangeWindowFocus(hasFocus) {
        if (!this.visible) {
            return;
        }
        super.onDidChangeWindowFocus(hasFocus);
        if (this.container) {
            if (hasFocus) {
                this.container.classList.remove('inactive');
            }
            else {
                this.container.classList.add('inactive');
                this.menubar?.blur();
            }
        }
    }
    onUpdateStateChange() {
        if (!this.visible) {
            return;
        }
        super.onUpdateStateChange();
    }
    onDidChangeRecentlyOpened() {
        if (!this.visible) {
            return;
        }
        super.onDidChangeRecentlyOpened();
    }
    onUpdateKeybindings() {
        if (!this.visible) {
            return;
        }
        super.onUpdateKeybindings();
    }
    registerListeners() {
        super.registerListeners();
        this._register(addDisposableListener(mainWindow, EventType.RESIZE, () => {
            if (this.menubar && !(isIOS && BrowserFeatures.pointerEvents)) {
                this.menubar.blur();
            }
        }));
        // Mnemonics require fullscreen in web
        if (isWeb) {
            this._register(onDidChangeFullscreen((windowId) => {
                if (windowId === mainWindow.vscodeWindowId) {
                    this.updateMenubar();
                }
            }));
            this._register(this.webNavigationMenu.onDidChange(() => this.updateMenubar()));
            this._register(enableFocusMenuBarAction().event(() => this.menubar?.toggleFocus()));
        }
    }
    get onVisibilityChange() {
        return this._onVisibilityChange.event;
    }
    get onFocusStateChange() {
        return this._onFocusStateChange.event;
    }
    getMenubarItemsDimensions() {
        if (this.menubar) {
            return new Dimension(this.menubar.getWidth(), this.menubar.getHeight());
        }
        return new Dimension(0, 0);
    }
    create(parent) {
        this.container = parent;
        // Build the menubar
        if (this.container) {
            this.doUpdateMenubar(true);
        }
        return this.container;
    }
    layout(dimension) {
        this.menubar?.update(this.getMenuBarOptions());
    }
    toggleFocus() {
        this.menubar?.toggleFocus();
    }
};
CustomMenubarControl = __decorate([
    __param(0, IMenuService),
    __param(1, IWorkspacesService),
    __param(2, IContextKeyService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, ILabelService),
    __param(6, IUpdateService),
    __param(7, IStorageService),
    __param(8, INotificationService),
    __param(9, IPreferencesService),
    __param(10, IWorkbenchEnvironmentService),
    __param(11, IAccessibilityService),
    __param(12, ITelemetryService),
    __param(13, IHostService),
    __param(14, ICommandService)
], CustomMenubarControl);
export { CustomMenubarControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3RpdGxlYmFyL21lbnViYXJDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFFTixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLE9BQU8sRUFDUCxjQUFjLEVBQ2QsWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUdOLG9CQUFvQixFQUNwQixpQkFBaUIsR0FFakIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBRU4sTUFBTSxFQUNOLGFBQWEsRUFDYixTQUFTLEVBRVQsWUFBWSxFQUdaLFFBQVEsR0FDUixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBRU4sY0FBYyxFQUVkLGlCQUFpQixFQUNqQixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsYUFBYSxFQUFhLE1BQU0sNENBQTRDLENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBYSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxPQUFPLEVBQW1CLE1BQU0sNkNBQTZDLENBQUE7QUFDdEYsT0FBTyxFQUNOLG1CQUFtQixFQUVuQixpQkFBaUIsR0FDakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFHckUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixZQUFZLEdBQ1osTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDekYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBSy9ELFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtJQUNuRCxPQUFPLEVBQUUsTUFBTSxDQUFDLGVBQWU7SUFDL0IsS0FBSyxFQUFFO1FBQ04sS0FBSyxFQUFFLE1BQU07UUFDYixRQUFRLEVBQUUsTUFBTTtRQUNoQixhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDO0tBQ3ZGO0lBQ0QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUU7SUFDbkQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxlQUFlO0lBQy9CLEtBQUssRUFBRTtRQUNOLEtBQUssRUFBRSxNQUFNO1FBQ2IsUUFBUSxFQUFFLE1BQU07UUFDaEIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQztLQUN2RjtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsb0JBQW9CO0lBQ3BDLEtBQUssRUFBRTtRQUNOLEtBQUssRUFBRSxXQUFXO1FBQ2xCLFFBQVEsRUFBRSxXQUFXO1FBQ3JCLGFBQWEsRUFBRSxRQUFRLENBQ3RCLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQ3pELGFBQWEsQ0FDYjtLQUNEO0lBQ0QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUU7SUFDbkQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxlQUFlO0lBQy9CLEtBQUssRUFBRTtRQUNOLEtBQUssRUFBRSxNQUFNO1FBQ2IsUUFBUSxFQUFFLE1BQU07UUFDaEIsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQztLQUN2RjtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsYUFBYTtJQUM3QixLQUFLLEVBQUU7UUFDTixLQUFLLEVBQUUsSUFBSTtRQUNYLFFBQVEsRUFBRSxJQUFJO1FBQ2QsYUFBYSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQztLQUNyRjtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBRUYsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsbUJBQW1CO0lBQ25DLEtBQUssRUFBRTtRQUNOLEtBQUssRUFBRSxVQUFVO1FBQ2pCLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUM7S0FDL0Y7SUFDRCxLQUFLLEVBQUUsQ0FBQztDQUNSLENBQUMsQ0FBQTtBQUVGLFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRTtJQUNuRCxPQUFPLEVBQUUsTUFBTSxDQUFDLGVBQWU7SUFDL0IsS0FBSyxFQUFFO1FBQ04sS0FBSyxFQUFFLE1BQU07UUFDYixRQUFRLEVBQUUsTUFBTTtRQUNoQixhQUFhLEVBQUUsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDO0tBQ3ZGO0lBQ0QsS0FBSyxFQUFFLENBQUM7Q0FDUixDQUFDLENBQUE7QUFFRixZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUU7SUFDbkQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxzQkFBc0I7SUFDdEMsS0FBSyxFQUFFO1FBQ04sS0FBSyxFQUFFLGFBQWE7UUFDcEIsUUFBUSxFQUFFLGFBQWE7UUFDdkIsYUFBYSxFQUFFLFFBQVEsQ0FDdEIsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFDM0QsYUFBYSxDQUNiO0tBQ0Q7SUFDRCxJQUFJLEVBQUUsa0JBQWtCO0lBQ3hCLEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxPQUFnQixjQUFlLFNBQVEsVUFBVTthQXNCNUIsNEJBQXVCLEdBQUcsRUFBRSxBQUFMLENBQUs7SUFFdEQsWUFDb0IsV0FBeUIsRUFDekIsaUJBQXFDLEVBQ3JDLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDckMsb0JBQTJDLEVBQzNDLFlBQTJCLEVBQzNCLGFBQTZCLEVBQzdCLGNBQStCLEVBQy9CLG1CQUF5QyxFQUN6QyxrQkFBdUMsRUFDdkMsa0JBQWdELEVBQ2hELG9CQUEyQyxFQUMzQyxXQUF5QixFQUN6QixjQUErQjtRQUVsRCxLQUFLLEVBQUUsQ0FBQTtRQWZZLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0Isa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzdCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUMvQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ3pDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDdkMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE4QjtRQUNoRCx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQXJDekMsU0FBSSxHQUFHO1lBQ2hCLDBCQUEwQjtZQUMxQiwrQkFBK0I7WUFDL0IsOEJBQThCO1lBQzlCLDRCQUE0QjtZQUM1QixtQkFBbUI7U0FDbkIsQ0FBQTtRQUdTLFVBQUssR0FFWCxFQUFFLENBQUE7UUFFSSxtQkFBYyxHQUErQixFQUFFLENBQUE7UUFJL0MsbUJBQWMsR0FBb0IsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQTtRQXdCeEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM3QixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUMzRSxDQUFBO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBRWhFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUVwQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFL0YsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLENBQUE7SUFDOUMsQ0FBQztJQUlTLGlCQUFpQjtRQUMxQixrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXhGLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ3pGLENBQUE7UUFFRCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFbEYsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHlCQUF5QixDQUFDLEdBQUcsRUFBRTtZQUNyRCxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQTtRQUNqQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekYscURBQXFEO1FBQ3JELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDNUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDakMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHNDQUFzQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTtZQUM5QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDcEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVTLGFBQWE7UUFDdEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUE7UUFFeEIsTUFBTSxDQUFDLEVBQUUsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxLQUFLLE1BQU0sY0FBYyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzlDLElBQ0MsY0FBYyxZQUFZLGlCQUFpQjtnQkFDM0MsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQzVDLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUM1RSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUU7b0JBQ2hGLDJCQUEyQixFQUFFLElBQUk7aUJBQ2pDLENBQUMsQ0FDRixDQUFBO2dCQUNELElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDO29CQUN0RCxjQUFjLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFBO1lBQzVFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVTLGFBQWE7UUFDdEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRVMsb0JBQW9CLENBQUMsTUFBcUM7UUFDbkUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQTtRQUMxQixRQUFRLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuQjtnQkFDQyxNQUFLO1FBQ1AsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVTLG1CQUFtQjtRQUM1QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVTLG1CQUFtQjtRQUM1QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7SUFDckIsQ0FBQztJQUVTLG9CQUFvQjtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtRQUVqRCxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFFakIsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxjQUFjLENBQUMsdUJBQXVCLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDMUYsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3JGLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkQsQ0FBQztZQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQzdCLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFUyxzQkFBc0IsQ0FBQyxRQUFpQjtRQUNqRCxxREFBcUQ7UUFDckQsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsS0FBZ0M7UUFDOUQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5RCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDckIsQ0FBQztRQUVELElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLDZCQUE2QixDQUFDLEVBQUUsQ0FBQztZQUMvRCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsaURBQWlEO1FBQ2pELCtEQUErRDtRQUMvRCxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDakMsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLGFBQWE7UUFDeEIsT0FBTyxXQUFXLElBQUksUUFBUTtZQUM3QixDQUFDLENBQUMsS0FBSztZQUNQLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxRQUFRLENBQUE7SUFDaEUsQ0FBQztJQUVTLHlCQUF5QjtRQUNsQyxtRUFBbUU7UUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDbEUsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUE7Z0JBQ3BDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNyQixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQUMsTUFBZTtRQUNqRCxJQUFJLEtBQWEsQ0FBQTtRQUNqQixJQUFJLEdBQVEsQ0FBQTtRQUNaLElBQUksU0FBaUIsQ0FBQTtRQUNyQixJQUFJLFFBQXlCLENBQUE7UUFDN0IsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQTtRQUU5QyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzVCLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO1lBQ3RCLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyx3QkFBZ0IsRUFBRSxDQUFDLENBQUE7WUFDN0YsU0FBUyxHQUFHLGtCQUFrQixDQUFBO1lBQzlCLFFBQVEsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQTtRQUM5QixDQUFDO2FBQU0sSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3RDLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQTtZQUNqQyxLQUFLO2dCQUNKLE1BQU0sQ0FBQyxLQUFLO29CQUNaLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sd0JBQWdCLEVBQUUsQ0FBQyxDQUFBO1lBQ25GLFNBQVMsR0FBRyxxQkFBcUIsQ0FBQTtZQUNqQyxRQUFRLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDakMsQ0FBQzthQUFNLENBQUM7WUFDUCxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQTtZQUNwQixLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzNGLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQTtZQUM1QixRQUFRLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQztZQUNwQixFQUFFLEVBQUUsU0FBUztZQUNiLEtBQUssRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDO1lBQzdCLEdBQUcsRUFBRSxDQUFDLFlBQTJCLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxlQUFlLEdBQ3BCLFlBQVk7b0JBQ1osQ0FBQyxDQUFDLENBQUMsV0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQ2pFLENBQUMsV0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUVqRSxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQzlDLGNBQWMsRUFBRSxDQUFDLENBQUMsZUFBZTtvQkFDakMsZUFBZSxFQUFFLGVBQWUsSUFBSSxJQUFJLEVBQUUsc0ZBQXNGO2lCQUNoSSxDQUFDLENBQUE7WUFDSCxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFTyxzQ0FBc0M7UUFDN0MsSUFBSSxLQUFLLElBQUksV0FBVyxFQUFFLENBQUM7WUFDMUIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FDckQsbUNBQW1DLHFDQUVuQyxLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUV4RSxJQUNDLGVBQWU7WUFDZixrQkFBa0I7WUFDbEIsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUUsRUFDbkQsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUN2QixpREFBaUQsRUFDakQsd0hBQXdILENBQ3hILENBQUE7UUFDRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQ3ZEO2dCQUNDLEtBQUssRUFBRSxRQUFRLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQztnQkFDL0MsR0FBRyxFQUFFLEdBQUcsRUFBRTtvQkFDVCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQzt3QkFDL0MsS0FBSyw4REFBaUM7cUJBQ3RDLENBQUMsQ0FBQTtnQkFDSCxDQUFDO2FBQ0Q7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FDeEIsbUNBQW1DLEVBQ25DLElBQUksZ0VBR0osQ0FBQTtJQUNGLENBQUM7O0FBR0YsMkZBQTJGO0FBQzNGLElBQUksbUJBQW1CLEdBQThCLFNBQVMsQ0FBQTtBQUM5RCxTQUFTLHdCQUF3QjtJQUNoQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMxQixtQkFBbUIsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBRXpDLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztZQUNwQjtnQkFDQyxLQUFLLENBQUM7b0JBQ0wsRUFBRSxFQUFFLGlDQUFpQztvQkFDckMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsd0JBQXdCLENBQUM7b0JBQ3ZELFVBQVUsRUFBRTt3QkFDWCxPQUFPLEVBQUUsMkNBQXdCO3dCQUNqQyxNQUFNLDZDQUFtQzt3QkFDekMsSUFBSSxFQUFFLFlBQVk7cUJBQ2xCO29CQUNELEVBQUUsRUFBRSxJQUFJO2lCQUNSLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxLQUFLLENBQUMsR0FBRztnQkFDUixtQkFBbUIsRUFBRSxJQUFJLEVBQUUsQ0FBQTtZQUM1QixDQUFDO1NBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU8sbUJBQW1CLENBQUE7QUFDM0IsQ0FBQztBQUVNLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsY0FBYztJQWV2RCxZQUNlLFdBQXlCLEVBQ25CLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDckMsaUJBQXFDLEVBQ2xDLG9CQUEyQyxFQUNuRCxZQUEyQixFQUMxQixhQUE2QixFQUM1QixjQUErQixFQUMxQixtQkFBeUMsRUFDMUMsa0JBQXVDLEVBQzlCLGtCQUFnRCxFQUN2RCxvQkFBMkMsRUFDL0MsZ0JBQW9ELEVBQ3pELFdBQXlCLEVBQ3RCLGNBQStCO1FBRWhELEtBQUssQ0FDSixXQUFXLEVBQ1gsaUJBQWlCLEVBQ2pCLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIsb0JBQW9CLEVBQ3BCLFlBQVksRUFDWixhQUFhLEVBQ2IsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsa0JBQWtCLEVBQ2xCLG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsY0FBYyxDQUNkLENBQUE7UUFuQm1DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUF6QmhFLHNCQUFpQixHQUFZLEtBQUssQ0FBQTtRQUNsQyx1QkFBa0IsR0FBWSxLQUFLLENBQUE7UUFDbkMsMkJBQXNCLEdBQVksS0FBSyxDQUFBO1FBQ3ZDLFlBQU8sR0FBWSxJQUFJLENBQUE7UUFFZCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsRCxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUMzRSxDQUFBO1FBd09nQix5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUM1RCw2QkFBd0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQTtRQWxNaEYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO1FBQ2pFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUVqRSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIseUJBQXlCLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDaEUsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtZQUNsRSxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQTtRQUNyQyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFUyxlQUFlLENBQUMsU0FBa0I7UUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuQyxDQUFDO1FBRUQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBRXRDLFFBQVEsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BCO2dCQUNDLE9BQU8sSUFBSSxNQUFNLENBQ2hCLGNBQWMsRUFDZCxRQUFRLENBQ1AsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUMsRUFBRSxFQUM5RCx3QkFBd0IsQ0FDeEIsRUFDRCxTQUFTLEVBQ1QsSUFBSSxFQUNKLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUM5QyxDQUFBO1lBRUY7Z0JBQ0MsT0FBTyxJQUFJLE1BQU0sQ0FDaEIsaUJBQWlCLEVBQ2pCLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsQ0FBQyxFQUN6RCxTQUFTLEVBQ1QsS0FBSyxDQUNMLENBQUE7WUFFRjtnQkFDQyxPQUFPLElBQUksTUFBTSxDQUNoQixvQkFBb0IsRUFDcEIsUUFBUSxDQUNQLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzNELG1CQUFtQixDQUNuQixFQUNELFNBQVMsRUFDVCxJQUFJLEVBQ0osR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FDekMsQ0FBQTtZQUVGO2dCQUNDLE9BQU8sSUFBSSxNQUFNLENBQ2hCLG9CQUFvQixFQUNwQixRQUFRLENBQUMsbUJBQW1CLEVBQUUsdUJBQXVCLENBQUMsRUFDdEQsU0FBUyxFQUNULEtBQUssQ0FDTCxDQUFBO1lBRUY7Z0JBQ0MsT0FBTyxXQUFXO29CQUNqQixDQUFDLENBQUMsSUFBSTtvQkFDTixDQUFDLENBQUMsSUFBSSxNQUFNLENBQ1YsZ0JBQWdCLEVBQ2hCLFFBQVEsQ0FDUCxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQy9ELHFCQUFxQixDQUNyQixFQUNELFNBQVMsRUFDVCxJQUFJLEVBQ0osR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLEVBQUUsQ0FDdEMsQ0FBQTtZQUVKO2dCQUNDLE9BQU8sSUFBSSxNQUFNLENBQ2hCLGlCQUFpQixFQUNqQixRQUFRLENBQUMsa0JBQWtCLEVBQUUsc0JBQXNCLENBQUMsRUFDcEQsU0FBUyxFQUNULEtBQUssQ0FDTCxDQUFBO1lBRUY7Z0JBQ0MsT0FBTyxJQUFJLE1BQU0sQ0FDaEIsZ0JBQWdCLEVBQ2hCLFFBQVEsQ0FDUCxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQzlELHFCQUFxQixDQUNyQixFQUNELFNBQVMsRUFDVCxJQUFJLEVBQ0osR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FDekMsQ0FBQTtZQUVGO2dCQUNDLE9BQU8sSUFBSSxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLHdCQUF3QjtRQUNuQyxPQUFPLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRCxJQUFZLDZCQUE2QjtRQUN4QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLDhCQUE4QixDQUFDLENBQUE7UUFFaEcsSUFBSSx5QkFBeUIsR0FBRyxLQUFLLENBQUE7UUFDckMsSUFBSSxPQUFPLFlBQVksS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN2Qyx5QkFBeUIsR0FBRyxDQUFDLFlBQVksQ0FBQTtRQUMxQyxDQUFDO1FBRUQsT0FBTyx5QkFBeUIsQ0FBQTtJQUNqQyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsVUFBbUIsRUFBRSxNQUFpQjtRQUNqRSxRQUFRLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2QixLQUFLLGdCQUFnQixDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO2dCQUMzQyxNQUFLO1lBRU4sS0FBSyxrQ0FBa0M7Z0JBQ3RDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO29CQUMzQyxJQUFJLFlBQVksRUFBRSxDQUFDO3dCQUNsQixZQUFZLENBQUMsS0FBSyxHQUFHLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQTt3QkFDMUQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTt3QkFDekIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDLENBQUE7b0JBQzdCLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxNQUFLO1lBRU47Z0JBQ0MsTUFBSztRQUNQLENBQUM7SUFDRixDQUFDO0lBRUQsSUFBWSw2QkFBNkI7UUFDeEMsSUFBSSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUM5RCwrQkFBK0IsQ0FDL0IsQ0FBQTtRQUNELElBQUksT0FBTyxzQkFBc0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNqRCxzQkFBc0IsR0FBRyxJQUFJLENBQUE7UUFDOUIsQ0FBQztRQUVELE9BQU8sc0JBQXNCLElBQUksQ0FBQyxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRUQsSUFBWSxzQkFBc0I7UUFDakMsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakQsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELHVFQUF1RTtRQUN2RSxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ2hFLDRCQUE0QixDQUM1QixDQUFBO1FBQ0QsTUFBTSxtQkFBbUIsR0FDeEIsc0JBQXNCLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUUxRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQzdELGdDQUFnQyxDQUNoQyxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FDdEIsbUJBQW1CLDhDQUErQjtZQUNqRCxDQUFDLENBQUMsaUJBQWlCLENBQUMsS0FBSztZQUN6QixDQUFDLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBRTNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLENBQUE7SUFDeEUsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE9BQWdCO1FBQzdDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBQ3RCLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1FBQ2hDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLGNBQWMsQ0FBQyxJQUFXO1FBQ2pDLE9BQU8seUJBQXlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBSU8sa0JBQWtCLENBQUMsU0FBa0I7UUFDNUMsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsK0JBQStCO1lBQy9CLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDbEMsQ0FBQztZQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FDM0MsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxDQUN4RSxDQUFBO1lBRUQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHlCQUF5QixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ2xFLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUE7Z0JBQzVCLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7WUFDL0MsQ0FBQyxDQUFDLENBQUE7WUFFRixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzNDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7Z0JBRXRDLHVFQUF1RTtnQkFDdkUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNkLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTt3QkFDN0IsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQTtvQkFDcEMsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtvQkFDckIsQ0FBQztvQkFFRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNyRSxDQUFBO1lBRUQsK0ZBQStGO1lBQy9GLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7WUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQy9ELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUE7WUFDaEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELGdFQUFnRTtZQUNoRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxhQUFhLEdBQUcsQ0FDckIsV0FBK0IsRUFDL0IsTUFBaUIsRUFDakIsYUFBcUIsRUFDckIsS0FBc0IsRUFDckIsRUFBRTtZQUNILE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFaEIsS0FBSyxNQUFNLFFBQVEsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFFMUMsSUFBSSxRQUFRLFlBQVksU0FBUyxFQUFFLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ3RCLENBQUM7cUJBQU0sSUFBSSxRQUFRLFlBQVksaUJBQWlCLElBQUksUUFBUSxZQUFZLGNBQWMsRUFBRSxDQUFDO29CQUN4RixzQ0FBc0M7b0JBQ3RDLElBQUksS0FBSyxHQUNSLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUTt3QkFDdEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSzt3QkFDckIsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUVwRSxJQUFJLFFBQVEsWUFBWSxpQkFBaUIsRUFBRSxDQUFDO3dCQUMzQyxNQUFNLGNBQWMsR0FBb0IsRUFBRSxDQUFBO3dCQUMxQyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFBO3dCQUVyRSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFBO3dCQUN0RixDQUFDO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxJQUFJLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzs0QkFDdkQsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFBO3dCQUNwRixDQUFDO3dCQUVELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzFCLElBQUksTUFBTSxDQUNULFFBQVEsQ0FBQyxFQUFFLEVBQ1gsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQ3hCLFFBQVEsQ0FBQyxLQUFLLEVBQ2QsUUFBUSxDQUFDLE9BQU8sRUFDaEIsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUNyRCxDQUNELENBQUE7d0JBQ0QsU0FBUyxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFBO3dCQUNwQyxTQUFTLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUE7d0JBQ3BDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ3ZCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxxRUFBcUU7WUFDckUsSUFBSSxhQUFhLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxzQkFBc0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDM0UsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUE7Z0JBQ2pELElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUE7Z0JBQzNCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDOUIsSUFBSSxTQUFTLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7Z0JBQ2xGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO29CQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7d0JBQzlCLE1BQU0sT0FBTyxHQUFjLEVBQUUsQ0FBQTt3QkFDN0IscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUE7d0JBQzdCLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUscUJBQXFCLENBQUMsQ0FBQTt3QkFDL0UsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUM7NEJBQ3hCLE9BQU87NEJBQ1AsS0FBSyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7eUJBQ3BELENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7Z0JBRUQsMkVBQTJFO2dCQUMzRSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUM5QixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO29CQUNyRixJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRTt3QkFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDOzRCQUM5QixNQUFNLE9BQU8sR0FBYyxFQUFFLENBQUE7NEJBQzdCLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFBOzRCQUNoQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixDQUFDLENBQUE7NEJBQ2xGLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDO2dDQUN4QixPQUFPO2dDQUNQLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDOzZCQUNwRCxDQUFDLENBQUE7d0JBQ0gsQ0FBQztvQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQWMsRUFBRSxDQUFBO1lBQzdCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUNyQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDM0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCO1FBQzlCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sRUFBRSxDQUFBLENBQUMsZUFBZTtRQUMxQixDQUFDO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUE7UUFDL0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUMxRCxNQUFNLENBQUMsRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUE7WUFDMUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxNQUFNLFlBQVksY0FBYyxFQUFFLENBQUM7b0JBQ3RDLE1BQU0sS0FBSyxHQUNWLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUTt3QkFDcEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSzt3QkFDbkIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUNoRSxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLElBQUksTUFBTSxDQUNULE1BQU0sQ0FBQyxFQUFFLEVBQ1QsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQ3hCLE1BQU0sQ0FBQyxLQUFLLEVBQ1osTUFBTSxDQUFDLE9BQU8sRUFDZCxLQUFLLEVBQUUsS0FBVyxFQUFFLEVBQUU7d0JBQ3JCLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3JELENBQUMsQ0FDRCxDQUNELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLENBQUM7UUFFRCxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzNCLENBQUM7UUFFRCxPQUFPLG9CQUFvQixDQUFBO0lBQzVCLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsT0FBTztZQUNOLGVBQWUsRUFBRSxJQUFJLENBQUMsNkJBQTZCO1lBQ25ELGVBQWUsRUFBRSxJQUFJLENBQUMsNkJBQTZCO1lBQ25ELFVBQVUsRUFBRSxJQUFJLENBQUMsd0JBQXdCO1lBQ3pDLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWTtZQUMvQixhQUFhLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzdFLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUI7WUFDekMsV0FBVyxFQUFFLElBQUksQ0FBQyxzQkFBc0I7WUFDeEMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO2dCQUMzQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osT0FBTyxFQUFFLENBQUEsQ0FBQyxlQUFlO2dCQUMxQixDQUFDO2dCQUVELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUE7WUFDdEMsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDO0lBRWtCLHNCQUFzQixDQUFDLFFBQWlCO1FBQzFELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFFRCxLQUFLLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFdEMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDNUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDeEMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFa0IsbUJBQW1CO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFFRCxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBRWtCLHlCQUF5QjtRQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE9BQU07UUFDUCxDQUFDO1FBRUQsS0FBSyxDQUFDLHlCQUF5QixFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVrQixtQkFBbUI7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFNO1FBQ1AsQ0FBQztRQUVELEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFa0IsaUJBQWlCO1FBQ25DLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRXpCLElBQUksQ0FBQyxTQUFTLENBQ2IscUJBQXFCLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3hELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsS0FBSyxJQUFJLGVBQWUsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsc0NBQXNDO1FBQ3RDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7Z0JBQ2xDLElBQUksUUFBUSxLQUFLLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDNUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzlFLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEYsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7SUFDdEMsQ0FBQztJQUVELElBQUksa0JBQWtCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtJQUN0QyxDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2xCLE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFDeEUsQ0FBQztRQUVELE9BQU8sSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBbUI7UUFDekIsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUE7UUFFdkIsb0JBQW9CO1FBQ3BCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQW9CO1FBQzFCLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUVELFdBQVc7UUFDVixJQUFJLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRCxDQUFBO0FBaGtCWSxvQkFBb0I7SUFnQjlCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsWUFBQSw0QkFBNEIsQ0FBQTtJQUM1QixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxZQUFZLENBQUE7SUFDWixZQUFBLGVBQWUsQ0FBQTtHQTlCTCxvQkFBb0IsQ0Fna0JoQyJ9