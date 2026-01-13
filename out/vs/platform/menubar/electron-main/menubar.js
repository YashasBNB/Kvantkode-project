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
var Menubar_1;
import { app, BrowserWindow, Menu, MenuItem, } from 'electron';
import { RunOnceScheduler } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { mnemonicMenuLabel } from '../../../base/common/labels.js';
import { isMacintosh, language } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { IAuxiliaryWindowsMainService } from '../../auxiliaryWindow/electron-main/auxiliaryWindows.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { isMenubarMenuItemAction, isMenubarMenuItemRecentAction, isMenubarMenuItemSeparator, isMenubarMenuItemSubmenu, } from '../common/menubar.js';
import { INativeHostMainService } from '../../native/electron-main/nativeHostMainService.js';
import { IProductService } from '../../product/common/productService.js';
import { IStateService } from '../../state/node/state.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUpdateService } from '../../update/common/update.js';
import { hasNativeTitlebar, } from '../../window/common/window.js';
import { IWindowsMainService, } from '../../windows/electron-main/windows.js';
import { IWorkspacesHistoryMainService } from '../../workspaces/electron-main/workspacesHistoryMainService.js';
import { Disposable } from '../../../base/common/lifecycle.js';
const telemetryFrom = 'menu';
let Menubar = class Menubar extends Disposable {
    static { Menubar_1 = this; }
    static { this.lastKnownMenubarStorageKey = 'lastKnownMenubarData'; }
    constructor(updateService, configurationService, windowsMainService, environmentMainService, telemetryService, workspacesHistoryMainService, stateService, lifecycleMainService, logService, nativeHostMainService, productService, auxiliaryWindowsMainService) {
        super();
        this.updateService = updateService;
        this.configurationService = configurationService;
        this.windowsMainService = windowsMainService;
        this.environmentMainService = environmentMainService;
        this.telemetryService = telemetryService;
        this.workspacesHistoryMainService = workspacesHistoryMainService;
        this.stateService = stateService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.nativeHostMainService = nativeHostMainService;
        this.productService = productService;
        this.auxiliaryWindowsMainService = auxiliaryWindowsMainService;
        this.fallbackMenuHandlers = Object.create(null);
        this.menuUpdater = new RunOnceScheduler(() => this.doUpdateMenu(), 0);
        this.menuGC = new RunOnceScheduler(() => {
            this.oldMenus = [];
        }, 10000);
        this.menubarMenus = Object.create(null);
        this.keybindings = Object.create(null);
        if (isMacintosh || hasNativeTitlebar(configurationService)) {
            this.restoreCachedMenubarData();
        }
        this.addFallbackHandlers();
        this.closedLastWindow = false;
        this.noActiveMainWindow = false;
        this.oldMenus = [];
        this.install();
        this.registerListeners();
    }
    restoreCachedMenubarData() {
        const menubarData = this.stateService.getItem(Menubar_1.lastKnownMenubarStorageKey);
        if (menubarData) {
            if (menubarData.menus) {
                this.menubarMenus = menubarData.menus;
            }
            if (menubarData.keybindings) {
                this.keybindings = menubarData.keybindings;
            }
        }
    }
    addFallbackHandlers() {
        // File Menu Items
        this.fallbackMenuHandlers['workbench.action.files.newUntitledFile'] = (menuItem, win, event) => {
            if (!this.runActionInRenderer({
                type: 'commandId',
                commandId: 'workbench.action.files.newUntitledFile',
            })) {
                // this is one of the few supported actions when aux window has focus
                this.windowsMainService.openEmptyWindow({
                    context: 2 /* OpenContext.MENU */,
                    contextWindowId: win?.id,
                });
            }
        };
        this.fallbackMenuHandlers['workbench.action.newWindow'] = (menuItem, win, event) => this.windowsMainService.openEmptyWindow({
            context: 2 /* OpenContext.MENU */,
            contextWindowId: win?.id,
        });
        this.fallbackMenuHandlers['workbench.action.files.openFileFolder'] = (menuItem, win, event) => this.nativeHostMainService.pickFileFolderAndOpen(undefined, {
            forceNewWindow: this.isOptionClick(event),
            telemetryExtraData: { from: telemetryFrom },
        });
        this.fallbackMenuHandlers['workbench.action.files.openFolder'] = (menuItem, win, event) => this.nativeHostMainService.pickFolderAndOpen(undefined, {
            forceNewWindow: this.isOptionClick(event),
            telemetryExtraData: { from: telemetryFrom },
        });
        this.fallbackMenuHandlers['workbench.action.openWorkspace'] = (menuItem, win, event) => this.nativeHostMainService.pickWorkspaceAndOpen(undefined, {
            forceNewWindow: this.isOptionClick(event),
            telemetryExtraData: { from: telemetryFrom },
        });
        // Recent Menu Items
        this.fallbackMenuHandlers['workbench.action.clearRecentFiles'] = () => this.workspacesHistoryMainService.clearRecentlyOpened({
            confirm: true /* ask for confirmation */,
        });
        // Help Menu Items
        const youTubeUrl = this.productService.youTubeUrl;
        if (youTubeUrl) {
            this.fallbackMenuHandlers['workbench.action.openYouTubeUrl'] = () => this.openUrl(youTubeUrl, 'openYouTubeUrl');
        }
        const requestFeatureUrl = this.productService.requestFeatureUrl;
        if (requestFeatureUrl) {
            this.fallbackMenuHandlers['workbench.action.openRequestFeatureUrl'] = () => this.openUrl(requestFeatureUrl, 'openUserVoiceUrl');
        }
        const reportIssueUrl = this.productService.reportIssueUrl;
        if (reportIssueUrl) {
            this.fallbackMenuHandlers['workbench.action.openIssueReporter'] = () => this.openUrl(reportIssueUrl, 'openReportIssues');
        }
        const licenseUrl = this.productService.licenseUrl;
        if (licenseUrl) {
            this.fallbackMenuHandlers['workbench.action.openLicenseUrl'] = () => {
                if (language) {
                    const queryArgChar = licenseUrl.indexOf('?') > 0 ? '&' : '?';
                    this.openUrl(`${licenseUrl}${queryArgChar}lang=${language}`, 'openLicenseUrl');
                }
                else {
                    this.openUrl(licenseUrl, 'openLicenseUrl');
                }
            };
        }
        const privacyStatementUrl = this.productService.privacyStatementUrl;
        if (privacyStatementUrl && licenseUrl) {
            this.fallbackMenuHandlers['workbench.action.openPrivacyStatementUrl'] = () => {
                this.openUrl(privacyStatementUrl, 'openPrivacyStatement');
            };
        }
    }
    registerListeners() {
        // Keep flag when app quits
        this._register(this.lifecycleMainService.onWillShutdown(() => (this.willShutdown = true)));
        // Listen to some events from window service to update menu
        this._register(this.windowsMainService.onDidChangeWindowsCount((e) => this.onDidChangeWindowsCount(e)));
        this._register(this.nativeHostMainService.onDidBlurMainWindow(() => this.onDidChangeWindowFocus()));
        this._register(this.nativeHostMainService.onDidFocusMainWindow(() => this.onDidChangeWindowFocus()));
    }
    get currentEnableMenuBarMnemonics() {
        const enableMenuBarMnemonics = this.configurationService.getValue('window.enableMenuBarMnemonics');
        if (typeof enableMenuBarMnemonics !== 'boolean') {
            return true;
        }
        return enableMenuBarMnemonics;
    }
    get currentEnableNativeTabs() {
        if (!isMacintosh) {
            return false;
        }
        const enableNativeTabs = this.configurationService.getValue('window.nativeTabs');
        if (typeof enableNativeTabs !== 'boolean') {
            return false;
        }
        return enableNativeTabs;
    }
    updateMenu(menubarData, windowId) {
        this.menubarMenus = menubarData.menus;
        this.keybindings = menubarData.keybindings;
        // Save off new menu and keybindings
        this.stateService.setItem(Menubar_1.lastKnownMenubarStorageKey, menubarData);
        this.scheduleUpdateMenu();
    }
    scheduleUpdateMenu() {
        this.menuUpdater.schedule(); // buffer multiple attempts to update the menu
    }
    doUpdateMenu() {
        // Due to limitations in Electron, it is not possible to update menu items dynamically. The suggested
        // workaround from Electron is to set the application menu again.
        // See also https://github.com/electron/electron/issues/846
        //
        // Run delayed to prevent updating menu while it is open
        if (!this.willShutdown) {
            setTimeout(() => {
                if (!this.willShutdown) {
                    this.install();
                }
            }, 10 /* delay this because there is an issue with updating a menu when it is open */);
        }
    }
    onDidChangeWindowsCount(e) {
        if (!isMacintosh) {
            return;
        }
        // Update menu if window count goes from N > 0 or 0 > N to update menu item enablement
        if ((e.oldCount === 0 && e.newCount > 0) || (e.oldCount > 0 && e.newCount === 0)) {
            this.closedLastWindow = e.newCount === 0;
            this.scheduleUpdateMenu();
        }
    }
    onDidChangeWindowFocus() {
        if (!isMacintosh) {
            return;
        }
        const focusedWindow = BrowserWindow.getFocusedWindow();
        this.noActiveMainWindow =
            !focusedWindow ||
                !!this.auxiliaryWindowsMainService.getWindowByWebContents(focusedWindow.webContents);
        this.scheduleUpdateMenu();
    }
    install() {
        // Store old menu in our array to avoid GC to collect the menu and crash. See #55347
        // TODO@sbatten Remove this when fixed upstream by Electron
        const oldMenu = Menu.getApplicationMenu();
        if (oldMenu) {
            this.oldMenus.push(oldMenu);
        }
        // If we don't have a menu yet, set it to null to avoid the electron menu.
        // This should only happen on the first launch ever
        if (Object.keys(this.menubarMenus).length === 0) {
            this.doSetApplicationMenu(isMacintosh ? new Menu() : null);
            return;
        }
        // Menus
        const menubar = new Menu();
        // Mac: Application
        let macApplicationMenuItem;
        if (isMacintosh) {
            const applicationMenu = new Menu();
            macApplicationMenuItem = new MenuItem({
                label: this.productService.nameShort,
                submenu: applicationMenu,
            });
            this.setMacApplicationMenu(applicationMenu);
            menubar.append(macApplicationMenuItem);
        }
        // Mac: Dock
        if (isMacintosh && !this.appMenuInstalled) {
            this.appMenuInstalled = true;
            const dockMenu = new Menu();
            dockMenu.append(new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'miNewWindow', comment: ['&& denotes a mnemonic'] }, 'New &&Window')),
                click: () => this.windowsMainService.openEmptyWindow({ context: 1 /* OpenContext.DOCK */ }),
            }));
            app.dock.setMenu(dockMenu);
        }
        // File
        if (this.shouldDrawMenu('File')) {
            const fileMenu = new Menu();
            const fileMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mFile', comment: ['&& denotes a mnemonic'] }, '&&File')),
                submenu: fileMenu,
            });
            this.setMenuById(fileMenu, 'File');
            menubar.append(fileMenuItem);
        }
        // Edit
        if (this.shouldDrawMenu('Edit')) {
            const editMenu = new Menu();
            const editMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mEdit', comment: ['&& denotes a mnemonic'] }, '&&Edit')),
                submenu: editMenu,
            });
            this.setMenuById(editMenu, 'Edit');
            menubar.append(editMenuItem);
        }
        // Selection
        if (this.shouldDrawMenu('Selection')) {
            const selectionMenu = new Menu();
            const selectionMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mSelection', comment: ['&& denotes a mnemonic'] }, '&&Selection')),
                submenu: selectionMenu,
            });
            this.setMenuById(selectionMenu, 'Selection');
            menubar.append(selectionMenuItem);
        }
        // View
        if (this.shouldDrawMenu('View')) {
            const viewMenu = new Menu();
            const viewMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mView', comment: ['&& denotes a mnemonic'] }, '&&View')),
                submenu: viewMenu,
            });
            this.setMenuById(viewMenu, 'View');
            menubar.append(viewMenuItem);
        }
        // Go
        if (this.shouldDrawMenu('Go')) {
            const gotoMenu = new Menu();
            const gotoMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mGoto', comment: ['&& denotes a mnemonic'] }, '&&Go')),
                submenu: gotoMenu,
            });
            this.setMenuById(gotoMenu, 'Go');
            menubar.append(gotoMenuItem);
        }
        // Debug
        if (this.shouldDrawMenu('Run')) {
            const debugMenu = new Menu();
            const debugMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mRun', comment: ['&& denotes a mnemonic'] }, '&&Run')),
                submenu: debugMenu,
            });
            this.setMenuById(debugMenu, 'Run');
            menubar.append(debugMenuItem);
        }
        // Terminal
        if (this.shouldDrawMenu('Terminal')) {
            const terminalMenu = new Menu();
            const terminalMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mTerminal', comment: ['&& denotes a mnemonic'] }, '&&Terminal')),
                submenu: terminalMenu,
            });
            this.setMenuById(terminalMenu, 'Terminal');
            menubar.append(terminalMenuItem);
        }
        // Mac: Window
        let macWindowMenuItem;
        if (this.shouldDrawMenu('Window')) {
            const windowMenu = new Menu();
            macWindowMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize('mWindow', 'Window')),
                submenu: windowMenu,
                role: 'window',
            });
            this.setMacWindowMenu(windowMenu);
        }
        if (macWindowMenuItem) {
            menubar.append(macWindowMenuItem);
        }
        // Help
        if (this.shouldDrawMenu('Help')) {
            const helpMenu = new Menu();
            const helpMenuItem = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'mHelp', comment: ['&& denotes a mnemonic'] }, '&&Help')),
                submenu: helpMenu,
                role: 'help',
            });
            this.setMenuById(helpMenu, 'Help');
            menubar.append(helpMenuItem);
        }
        if (menubar.items && menubar.items.length > 0) {
            this.doSetApplicationMenu(menubar);
        }
        else {
            this.doSetApplicationMenu(null);
        }
        // Dispose of older menus after some time
        this.menuGC.schedule();
    }
    doSetApplicationMenu(menu) {
        // Setting the application menu sets it to all opened windows,
        // but we currently do not support a menu in auxiliary windows,
        // so we need to unset it there.
        //
        // This is a bit ugly but `setApplicationMenu()` has some nice
        // behaviour we want:
        // - on macOS it is required because menus are application set
        // - we use `getApplicationMenu()` to access the current state
        // - new windows immediately get the same menu when opening
        //   reducing overall flicker for these
        Menu.setApplicationMenu(menu);
        if (menu) {
            for (const window of this.auxiliaryWindowsMainService.getWindows()) {
                window.win?.setMenu(null);
            }
        }
    }
    setMacApplicationMenu(macApplicationMenu) {
        const about = this.createMenuItem(nls.localize('mAbout', 'About {0}', this.productService.nameLong), 'workbench.action.showAboutDialog');
        const checkForUpdates = this.getUpdateMenuItems();
        let preferences;
        if (this.shouldDrawMenu('Preferences')) {
            const preferencesMenu = new Menu();
            this.setMenuById(preferencesMenu, 'Preferences');
            preferences = new MenuItem({
                label: this.mnemonicLabel(nls.localize({ key: 'miPreferences', comment: ['&& denotes a mnemonic'] }, '&&Preferences')),
                submenu: preferencesMenu,
            });
        }
        const servicesMenu = new Menu();
        const services = new MenuItem({
            label: nls.localize('mServices', 'Services'),
            role: 'services',
            submenu: servicesMenu,
        });
        const hide = new MenuItem({
            label: nls.localize('mHide', 'Hide {0}', this.productService.nameLong),
            role: 'hide',
            accelerator: 'Command+H',
        });
        const hideOthers = new MenuItem({
            label: nls.localize('mHideOthers', 'Hide Others'),
            role: 'hideOthers',
            accelerator: 'Command+Alt+H',
        });
        const showAll = new MenuItem({ label: nls.localize('mShowAll', 'Show All'), role: 'unhide' });
        const quit = new MenuItem(this.likeAction('workbench.action.quit', {
            label: nls.localize('miQuit', 'Quit {0}', this.productService.nameLong),
            click: async (item, window, event) => {
                const lastActiveWindow = this.windowsMainService.getLastActiveWindow();
                if (this.windowsMainService.getWindowCount() === 0 || // allow to quit when no more windows are open
                    !!BrowserWindow.getFocusedWindow() || // allow to quit when window has focus (fix for https://github.com/microsoft/vscode/issues/39191)
                    lastActiveWindow?.win?.isMinimized() // allow to quit when window has no focus but is minimized (https://github.com/microsoft/vscode/issues/63000)
                ) {
                    const confirmed = await this.confirmBeforeQuit(event);
                    if (confirmed) {
                        this.nativeHostMainService.quit(undefined);
                    }
                }
            },
        }));
        const actions = [about];
        actions.push(...checkForUpdates);
        if (preferences) {
            actions.push(...[__separator__(), preferences]);
        }
        actions.push(...[
            __separator__(),
            services,
            __separator__(),
            hide,
            hideOthers,
            showAll,
            __separator__(),
            quit,
        ]);
        actions.forEach((i) => macApplicationMenu.append(i));
    }
    async confirmBeforeQuit(event) {
        if (this.windowsMainService.getWindowCount() === 0) {
            return true; // never confirm when no windows are opened
        }
        const confirmBeforeClose = this.configurationService.getValue('window.confirmBeforeClose');
        if (confirmBeforeClose === 'always' ||
            (confirmBeforeClose === 'keyboardOnly' && this.isKeyboardEvent(event))) {
            const { response } = await this.nativeHostMainService.showMessageBox(this.windowsMainService.getFocusedWindow()?.id, {
                type: 'question',
                buttons: [
                    nls.localize({ key: 'quit', comment: ['&& denotes a mnemonic'] }, '&&Quit'),
                    nls.localize('cancel', 'Cancel'),
                ],
                message: nls.localize('quitMessage', 'Are you sure you want to quit?'),
            });
            return response === 0;
        }
        return true;
    }
    shouldDrawMenu(menuId) {
        // We need to draw an empty menu to override the electron default
        if (!isMacintosh && !hasNativeTitlebar(this.configurationService)) {
            return false;
        }
        switch (menuId) {
            case 'File':
            case 'Help':
                if (isMacintosh) {
                    return ((this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) ||
                        (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow) ||
                        (!!this.menubarMenus && !!this.menubarMenus[menuId]));
                }
            case 'Window':
                if (isMacintosh) {
                    return ((this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) ||
                        (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow) ||
                        !!this.menubarMenus);
                }
            default:
                return (this.windowsMainService.getWindowCount() > 0 &&
                    !!this.menubarMenus &&
                    !!this.menubarMenus[menuId]);
        }
    }
    setMenu(menu, items) {
        items.forEach((item) => {
            if (isMenubarMenuItemSeparator(item)) {
                menu.append(__separator__());
            }
            else if (isMenubarMenuItemSubmenu(item)) {
                const submenu = new Menu();
                const submenuItem = new MenuItem({ label: this.mnemonicLabel(item.label), submenu });
                this.setMenu(submenu, item.submenu.items);
                menu.append(submenuItem);
            }
            else if (isMenubarMenuItemRecentAction(item)) {
                menu.append(this.createOpenRecentMenuItem(item));
            }
            else if (isMenubarMenuItemAction(item)) {
                if (item.id === 'workbench.action.showAboutDialog') {
                    this.insertCheckForUpdatesItems(menu);
                }
                if (isMacintosh) {
                    if ((this.windowsMainService.getWindowCount() === 0 && this.closedLastWindow) ||
                        (this.windowsMainService.getWindowCount() > 0 && this.noActiveMainWindow)) {
                        // In the fallback scenario, we are either disabled or using a fallback handler
                        if (this.fallbackMenuHandlers[item.id]) {
                            menu.append(new MenuItem(this.likeAction(item.id, {
                                label: this.mnemonicLabel(item.label),
                                click: this.fallbackMenuHandlers[item.id],
                            })));
                        }
                        else {
                            menu.append(this.createMenuItem(item.label, item.id, false, item.checked));
                        }
                    }
                    else {
                        menu.append(this.createMenuItem(item.label, item.id, item.enabled === false ? false : true, !!item.checked));
                    }
                }
                else {
                    menu.append(this.createMenuItem(item.label, item.id, item.enabled === false ? false : true, !!item.checked));
                }
            }
        });
    }
    setMenuById(menu, menuId) {
        if (this.menubarMenus && this.menubarMenus[menuId]) {
            this.setMenu(menu, this.menubarMenus[menuId].items);
        }
    }
    insertCheckForUpdatesItems(menu) {
        const updateItems = this.getUpdateMenuItems();
        if (updateItems.length) {
            updateItems.forEach((i) => menu.append(i));
            menu.append(__separator__());
        }
    }
    createOpenRecentMenuItem(item) {
        const revivedUri = URI.revive(item.uri);
        const commandId = item.id;
        const openable = commandId === 'openRecentFile'
            ? { fileUri: revivedUri }
            : commandId === 'openRecentWorkspace'
                ? { workspaceUri: revivedUri }
                : { folderUri: revivedUri };
        return new MenuItem(this.likeAction(commandId, {
            label: item.label,
            click: async (menuItem, win, event) => {
                const openInNewWindow = this.isOptionClick(event);
                const success = (await this.windowsMainService.open({
                    context: 2 /* OpenContext.MENU */,
                    cli: this.environmentMainService.args,
                    urisToOpen: [openable],
                    forceNewWindow: openInNewWindow,
                    gotoLineMode: false,
                    remoteAuthority: item.remoteAuthority,
                })).length > 0;
                if (!success) {
                    await this.workspacesHistoryMainService.removeRecentlyOpened([revivedUri]);
                }
            },
        }, false));
    }
    isOptionClick(event) {
        return !!(event &&
            ((!isMacintosh && (event.ctrlKey || event.shiftKey)) ||
                (isMacintosh && (event.metaKey || event.altKey))));
    }
    isKeyboardEvent(event) {
        return !!(event.triggeredByAccelerator ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey);
    }
    createRoleMenuItem(label, commandId, role) {
        const options = {
            label: this.mnemonicLabel(label),
            role,
            enabled: true,
        };
        return new MenuItem(this.withKeybinding(commandId, options));
    }
    setMacWindowMenu(macWindowMenu) {
        const minimize = new MenuItem({
            label: nls.localize('mMinimize', 'Minimize'),
            role: 'minimize',
            accelerator: 'Command+M',
            enabled: this.windowsMainService.getWindowCount() > 0,
        });
        const zoom = new MenuItem({
            label: nls.localize('mZoom', 'Zoom'),
            role: 'zoom',
            enabled: this.windowsMainService.getWindowCount() > 0,
        });
        const bringAllToFront = new MenuItem({
            label: nls.localize('mBringToFront', 'Bring All to Front'),
            role: 'front',
            enabled: this.windowsMainService.getWindowCount() > 0,
        });
        const switchWindow = this.createMenuItem(nls.localize({ key: 'miSwitchWindow', comment: ['&& denotes a mnemonic'] }, 'Switch &&Window...'), 'workbench.action.switchWindow');
        const nativeTabMenuItems = [];
        if (this.currentEnableNativeTabs) {
            nativeTabMenuItems.push(__separator__());
            nativeTabMenuItems.push(this.createMenuItem(nls.localize('mNewTab', 'New Tab'), 'workbench.action.newWindowTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mShowPreviousTab', 'Show Previous Tab'), 'workbench.action.showPreviousWindowTab', 'selectPreviousTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mShowNextTab', 'Show Next Tab'), 'workbench.action.showNextWindowTab', 'selectNextTab'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mMoveTabToNewWindow', 'Move Tab to New Window'), 'workbench.action.moveWindowTabToNewWindow', 'moveTabToNewWindow'));
            nativeTabMenuItems.push(this.createRoleMenuItem(nls.localize('mMergeAllWindows', 'Merge All Windows'), 'workbench.action.mergeAllWindowTabs', 'mergeAllWindows'));
        }
        ;
        [
            minimize,
            zoom,
            __separator__(),
            switchWindow,
            ...nativeTabMenuItems,
            __separator__(),
            bringAllToFront,
        ].forEach((item) => macWindowMenu.append(item));
    }
    getUpdateMenuItems() {
        const state = this.updateService.state;
        switch (state.type) {
            case "idle" /* StateType.Idle */:
                return [
                    new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miCheckForUpdates', 'Check for &&Updates...')),
                        click: () => setTimeout(() => {
                            this.reportMenuActionTelemetry('CheckForUpdate');
                            this.updateService.checkForUpdates(true);
                        }, 0),
                    }),
                ];
            case "checking for updates" /* StateType.CheckingForUpdates */:
                return [
                    new MenuItem({
                        label: nls.localize('miCheckingForUpdates', 'Checking for Updates...'),
                        enabled: false,
                    }),
                ];
            case "available for download" /* StateType.AvailableForDownload */:
                return [
                    new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miDownloadUpdate', 'D&&ownload Available Update')),
                        click: () => {
                            this.updateService.downloadUpdate();
                        },
                    }),
                ];
            case "downloading" /* StateType.Downloading */:
                return [
                    new MenuItem({
                        label: nls.localize('miDownloadingUpdate', 'Downloading Update...'),
                        enabled: false,
                    }),
                ];
            case "downloaded" /* StateType.Downloaded */:
                return isMacintosh
                    ? []
                    : [
                        new MenuItem({
                            label: this.mnemonicLabel(nls.localize('miInstallUpdate', 'Install &&Update...')),
                            click: () => {
                                this.reportMenuActionTelemetry('InstallUpdate');
                                this.updateService.applyUpdate();
                            },
                        }),
                    ];
            case "updating" /* StateType.Updating */:
                return [
                    new MenuItem({
                        label: nls.localize('miInstallingUpdate', 'Installing Update...'),
                        enabled: false,
                    }),
                ];
            case "ready" /* StateType.Ready */:
                return [
                    new MenuItem({
                        label: this.mnemonicLabel(nls.localize('miRestartToUpdate', 'Restart to &&Update')),
                        click: () => {
                            this.reportMenuActionTelemetry('RestartToUpdate');
                            this.updateService.quitAndInstall();
                        },
                    }),
                ];
            default:
                return [];
        }
    }
    createMenuItem(arg1, arg2, arg3, arg4) {
        const label = this.mnemonicLabel(arg1);
        const click = typeof arg2 === 'function'
            ? arg2
            : (menuItem, win, event) => {
                const userSettingsLabel = menuItem ? menuItem.userSettingsLabel : null;
                let commandId = arg2;
                if (Array.isArray(arg2)) {
                    commandId = this.isOptionClick(event) ? arg2[1] : arg2[0]; // support alternative action if we got multiple action Ids and the option key was pressed while invoking
                }
                if (userSettingsLabel && event.triggeredByAccelerator) {
                    this.runActionInRenderer({ type: 'keybinding', userSettingsLabel });
                }
                else {
                    this.runActionInRenderer({ type: 'commandId', commandId });
                }
            };
        const enabled = typeof arg3 === 'boolean' ? arg3 : this.windowsMainService.getWindowCount() > 0;
        const checked = typeof arg4 === 'boolean' ? arg4 : false;
        const options = {
            label,
            click,
            enabled,
        };
        if (checked) {
            options.type = 'checkbox';
            options.checked = checked;
        }
        let commandId;
        if (typeof arg2 === 'string') {
            commandId = arg2;
        }
        else if (Array.isArray(arg2)) {
            commandId = arg2[0];
        }
        if (isMacintosh) {
            // Add role for special case menu items
            if (commandId === 'editor.action.clipboardCutAction') {
                options.role = 'cut';
            }
            else if (commandId === 'editor.action.clipboardCopyAction') {
                options.role = 'copy';
            }
            else if (commandId === 'editor.action.clipboardPasteAction') {
                options.role = 'paste';
            }
            // Add context aware click handlers for special case menu items
            if (commandId === 'undo') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: (devTools) => devTools.undo(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('undo:'),
                });
            }
            else if (commandId === 'redo') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: (devTools) => devTools.redo(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('redo:'),
                });
            }
            else if (commandId === 'editor.action.selectAll') {
                options.click = this.makeContextAwareClickHandler(click, {
                    inDevTools: (devTools) => devTools.selectAll(),
                    inNoWindow: () => Menu.sendActionToFirstResponder('selectAll:'),
                });
            }
        }
        return new MenuItem(this.withKeybinding(commandId, options));
    }
    makeContextAwareClickHandler(click, contextSpecificHandlers) {
        return (menuItem, win, event) => {
            // No Active Window
            const activeWindow = BrowserWindow.getFocusedWindow();
            if (!activeWindow) {
                return contextSpecificHandlers.inNoWindow();
            }
            // DevTools focused
            if (activeWindow.webContents.isDevToolsFocused() &&
                activeWindow.webContents.devToolsWebContents) {
                return contextSpecificHandlers.inDevTools(activeWindow.webContents.devToolsWebContents);
            }
            // Finally execute command in Window
            click(menuItem, win || activeWindow, event);
        };
    }
    runActionInRenderer(invocation) {
        // We want to support auxililary windows that may have focus by
        // returning their parent windows as target to support running
        // actions via the main window.
        let activeBrowserWindow = BrowserWindow.getFocusedWindow();
        if (activeBrowserWindow) {
            const auxiliaryWindowCandidate = this.auxiliaryWindowsMainService.getWindowByWebContents(activeBrowserWindow.webContents);
            if (auxiliaryWindowCandidate) {
                activeBrowserWindow =
                    this.windowsMainService.getWindowById(auxiliaryWindowCandidate.parentId)?.win ?? null;
            }
        }
        // We make sure to not run actions when the window has no focus, this helps
        // for https://github.com/microsoft/vscode/issues/25907 and specifically for
        // https://github.com/microsoft/vscode/issues/11928
        // Still allow to run when the last active window is minimized though for
        // https://github.com/microsoft/vscode/issues/63000
        if (!activeBrowserWindow) {
            const lastActiveWindow = this.windowsMainService.getLastActiveWindow();
            if (lastActiveWindow?.win?.isMinimized()) {
                activeBrowserWindow = lastActiveWindow.win;
            }
        }
        const activeWindow = activeBrowserWindow
            ? this.windowsMainService.getWindowById(activeBrowserWindow.id)
            : undefined;
        if (activeWindow) {
            this.logService.trace('menubar#runActionInRenderer', invocation);
            if (isMacintosh && !this.environmentMainService.isBuilt && !activeWindow.isReady) {
                if ((invocation.type === 'commandId' &&
                    invocation.commandId === 'workbench.action.toggleDevTools') ||
                    (invocation.type !== 'commandId' && invocation.userSettingsLabel === 'alt+cmd+i')) {
                    // prevent this action from running twice on macOS (https://github.com/microsoft/vscode/issues/62719)
                    // we already register a keybinding in bootstrap-window.js for opening developer tools in case something
                    // goes wrong and that keybinding is only removed when the application has loaded (= window ready).
                    return false;
                }
            }
            if (invocation.type === 'commandId') {
                const runActionPayload = {
                    id: invocation.commandId,
                    from: 'menu',
                };
                activeWindow.sendWhenReady('vscode:runAction', CancellationToken.None, runActionPayload);
            }
            else {
                const runKeybindingPayload = {
                    userSettingsLabel: invocation.userSettingsLabel,
                };
                activeWindow.sendWhenReady('vscode:runKeybinding', CancellationToken.None, runKeybindingPayload);
            }
            return true;
        }
        else {
            this.logService.trace('menubar#runActionInRenderer: no active window found', invocation);
            return false;
        }
    }
    withKeybinding(commandId, options) {
        const binding = typeof commandId === 'string' ? this.keybindings[commandId] : undefined;
        // Apply binding if there is one
        if (binding?.label) {
            // if the binding is native, we can just apply it
            if (binding.isNative !== false) {
                options.accelerator = binding.label;
                options.userSettingsLabel = binding.userSettingsLabel;
            }
            // the keybinding is not native so we cannot show it as part of the accelerator of
            // the menu item. we fallback to a different strategy so that we always display it
            else if (typeof options.label === 'string') {
                const bindingIndex = options.label.indexOf('[');
                if (bindingIndex >= 0) {
                    options.label = `${options.label.substr(0, bindingIndex)} [${binding.label}]`;
                }
                else {
                    options.label = `${options.label} [${binding.label}]`;
                }
            }
        }
        // Unset bindings if there is none
        else {
            options.accelerator = undefined;
        }
        return options;
    }
    likeAction(commandId, options, setAccelerator = !options.accelerator) {
        if (setAccelerator) {
            options = this.withKeybinding(commandId, options);
        }
        const originalClick = options.click;
        options.click = (item, window, event) => {
            this.reportMenuActionTelemetry(commandId);
            originalClick?.(item, window, event);
        };
        return options;
    }
    openUrl(url, id) {
        this.nativeHostMainService.openExternal(undefined, url);
        this.reportMenuActionTelemetry(id);
    }
    reportMenuActionTelemetry(id) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id, from: telemetryFrom });
    }
    mnemonicLabel(label) {
        return mnemonicMenuLabel(label, !this.currentEnableMenuBarMnemonics);
    }
};
Menubar = Menubar_1 = __decorate([
    __param(0, IUpdateService),
    __param(1, IConfigurationService),
    __param(2, IWindowsMainService),
    __param(3, IEnvironmentMainService),
    __param(4, ITelemetryService),
    __param(5, IWorkspacesHistoryMainService),
    __param(6, IStateService),
    __param(7, ILifecycleMainService),
    __param(8, ILogService),
    __param(9, INativeHostMainService),
    __param(10, IProductService),
    __param(11, IAuxiliaryWindowsMainService)
], Menubar);
export { Menubar };
function __separator__() {
    return new MenuItem({ type: 'separator' });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWVudWJhci9lbGVjdHJvbi1tYWluL21lbnViYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixHQUFHLEVBQ0gsYUFBYSxFQUdiLElBQUksRUFDSixRQUFRLEdBR1IsTUFBTSxVQUFVLENBQUE7QUFLakIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN0RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDckQsT0FBTyxFQUtOLHVCQUF1QixFQUN2Qiw2QkFBNkIsRUFDN0IsMEJBQTBCLEVBQzFCLHdCQUF3QixHQUV4QixNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxN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