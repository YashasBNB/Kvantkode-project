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
import { Separator } from '../../../../base/common/actions.js';
import { IMenuService, SubmenuItemAction, MenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkspacesService } from '../../../../platform/workspaces/common/workspaces.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { MenubarControl, } from '../../../browser/parts/titlebar/menubarControl.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IMenubarService } from '../../../../platform/menubar/electron-sandbox/menubar.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { OpenRecentAction } from '../../../browser/actions/windowActions.js';
import { isICommandActionToggleInfo } from '../../../../platform/action/common/action.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
let NativeMenubarControl = class NativeMenubarControl extends MenubarControl {
    constructor(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, menubarService, hostService, nativeHostService, commandService) {
        super(menuService, workspacesService, contextKeyService, keybindingService, configurationService, labelService, updateService, storageService, notificationService, preferencesService, environmentService, accessibilityService, hostService, commandService);
        this.menubarService = menubarService;
        this.nativeHostService = nativeHostService;
        (async () => {
            this.recentlyOpened = await this.workspacesService.getRecentlyOpened();
            this.doUpdateMenubar();
        })();
        this.registerListeners();
    }
    setupMainMenu() {
        super.setupMainMenu();
        for (const topLevelMenuName of Object.keys(this.topLevelTitles)) {
            const menu = this.menus[topLevelMenuName];
            if (menu) {
                this.mainMenuDisposables.add(menu.onDidChange(() => this.updateMenubar()));
            }
        }
    }
    doUpdateMenubar() {
        // Since the native menubar is shared between windows (main process)
        // only allow the focused window to update the menubar
        if (!this.hostService.hasFocus) {
            return;
        }
        // Send menus to main process to be rendered by Electron
        const menubarData = { menus: {}, keybindings: {} };
        if (this.getMenubarMenus(menubarData)) {
            this.menubarService.updateMenubar(this.nativeHostService.windowId, menubarData);
        }
    }
    getMenubarMenus(menubarData) {
        if (!menubarData) {
            return false;
        }
        menubarData.keybindings = this.getAdditionalKeybindings();
        for (const topLevelMenuName of Object.keys(this.topLevelTitles)) {
            const menu = this.menus[topLevelMenuName];
            if (menu) {
                const menubarMenu = { items: [] };
                const menuActions = getFlatContextMenuActions(menu.getActions({ shouldForwardArgs: true }));
                this.populateMenuItems(menuActions, menubarMenu, menubarData.keybindings);
                if (menubarMenu.items.length === 0) {
                    return false; // Menus are incomplete
                }
                menubarData.menus[topLevelMenuName] = menubarMenu;
            }
        }
        return true;
    }
    populateMenuItems(menuActions, menuToPopulate, keybindings) {
        for (const menuItem of menuActions) {
            if (menuItem instanceof Separator) {
                menuToPopulate.items.push({ id: 'vscode.menubar.separator' });
            }
            else if (menuItem instanceof MenuItemAction || menuItem instanceof SubmenuItemAction) {
                // use mnemonicTitle whenever possible
                const title = typeof menuItem.item.title === 'string'
                    ? menuItem.item.title
                    : (menuItem.item.title.mnemonicTitle ?? menuItem.item.title.value);
                if (menuItem instanceof SubmenuItemAction) {
                    const submenu = { items: [] };
                    this.populateMenuItems(menuItem.actions, submenu, keybindings);
                    if (submenu.items.length > 0) {
                        const menubarSubmenuItem = {
                            id: menuItem.id,
                            label: title,
                            submenu,
                        };
                        menuToPopulate.items.push(menubarSubmenuItem);
                    }
                }
                else {
                    if (menuItem.id === OpenRecentAction.ID) {
                        const actions = this.getOpenRecentActions().map(this.transformOpenRecentAction);
                        menuToPopulate.items.push(...actions);
                    }
                    const menubarMenuItem = {
                        id: menuItem.id,
                        label: title,
                    };
                    if (isICommandActionToggleInfo(menuItem.item.toggled)) {
                        menubarMenuItem.label =
                            menuItem.item.toggled.mnemonicTitle ?? menuItem.item.toggled.title ?? title;
                    }
                    if (menuItem.checked) {
                        menubarMenuItem.checked = true;
                    }
                    if (!menuItem.enabled) {
                        menubarMenuItem.enabled = false;
                    }
                    keybindings[menuItem.id] = this.getMenubarKeybinding(menuItem.id);
                    menuToPopulate.items.push(menubarMenuItem);
                }
            }
        }
    }
    transformOpenRecentAction(action) {
        if (action instanceof Separator) {
            return { id: 'vscode.menubar.separator' };
        }
        return {
            id: action.id,
            uri: action.uri,
            remoteAuthority: action.remoteAuthority,
            enabled: action.enabled,
            label: action.label,
        };
    }
    getAdditionalKeybindings() {
        const keybindings = {};
        if (isMacintosh) {
            const keybinding = this.getMenubarKeybinding('workbench.action.quit');
            if (keybinding) {
                keybindings['workbench.action.quit'] = keybinding;
            }
        }
        return keybindings;
    }
    getMenubarKeybinding(id) {
        const binding = this.keybindingService.lookupKeybinding(id);
        if (!binding) {
            return undefined;
        }
        // first try to resolve a native accelerator
        const electronAccelerator = binding.getElectronAccelerator();
        if (electronAccelerator) {
            return {
                label: electronAccelerator,
                userSettingsLabel: binding.getUserSettingsLabel() ?? undefined,
            };
        }
        // we need this fallback to support keybindings that cannot show in electron menus (e.g. chords)
        const acceleratorLabel = binding.getLabel();
        if (acceleratorLabel) {
            return {
                label: acceleratorLabel,
                isNative: false,
                userSettingsLabel: binding.getUserSettingsLabel() ?? undefined,
            };
        }
        return undefined;
    }
};
NativeMenubarControl = __decorate([
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
    __param(10, INativeWorkbenchEnvironmentService),
    __param(11, IAccessibilityService),
    __param(12, IMenubarService),
    __param(13, IHostService),
    __param(14, INativeHostService),
    __param(15, ICommandService)
], NativeMenubarControl);
export { NativeMenubarControl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L3BhcnRzL3RpdGxlYmFyL21lbnViYXJDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBVyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sWUFBWSxFQUNaLGlCQUFpQixFQUNqQixjQUFjLEdBQ2QsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBRU4sY0FBYyxHQUNkLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBU2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSww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