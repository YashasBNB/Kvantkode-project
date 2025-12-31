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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy90aXRsZWJhci9tZW51YmFyQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUNOLFlBQVksRUFDWixNQUFNLEVBRU4saUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixPQUFPLEVBQ1AsY0FBYyxFQUNkLFlBQVksR0FDWixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFHTixvQkFBb0IsRUFDcEIsaUJBQWlCLEdBRWpCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUVOLE1BQU0sRUFDTixhQUFhLEVBQ2IsU0FBUyxFQUVULFlBQVksRUFHWixRQUFRLEdBQ1IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NB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