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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tc2FuZGJveC9wYXJ0cy90aXRsZWJhci9tZW51YmFyQ29udHJvbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUNOLFlBQVksRUFDWixpQkFBaUIsRUFDakIsY0FBYyxHQUNkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUVOLGNBQWMsR0FDZCxNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQVNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBE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