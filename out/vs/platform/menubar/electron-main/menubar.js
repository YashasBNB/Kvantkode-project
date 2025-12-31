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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21lbnViYXIvZWxlY3Ryb24tbWFpbi9tZW51YmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sR0FBRyxFQUNILGFBQWEsRUFHYixJQUFJLEVBQ0osUUFBUSxHQUdSLE1BQU0sVUFBVSxDQUFBO0FBS2pCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUE7QUFDdEMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JELE9BQU8sRUFLTix1QkFBdUIsRUFDdkIsNkJBQTZCLEVBQzdCLDBCQUEwQixFQUMxQix3QkFBd0IsR0FFeEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RixP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