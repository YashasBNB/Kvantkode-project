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
import { equals } from '../../../../base/common/arrays.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/scm.css';
import { localize } from '../../../../nls.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ISCMService, } from '../common/scm.js';
function actionEquals(a, b) {
    return a.id === b.id;
}
let SCMTitleMenu = class SCMTitleMenu {
    get actions() {
        return this._actions;
    }
    get secondaryActions() {
        return this._secondaryActions;
    }
    constructor(menuService, contextKeyService) {
        this._actions = [];
        this._secondaryActions = [];
        this._onDidChangeTitle = new Emitter();
        this.onDidChangeTitle = this._onDidChangeTitle.event;
        this.disposables = new DisposableStore();
        this.menu = menuService.createMenu(MenuId.SCMTitle, contextKeyService);
        this.disposables.add(this.menu);
        this.menu.onDidChange(this.updateTitleActions, this, this.disposables);
        this.updateTitleActions();
    }
    updateTitleActions() {
        const { primary, secondary } = getActionBarActions(this.menu.getActions({ shouldForwardArgs: true }));
        if (equals(primary, this._actions, actionEquals) &&
            equals(secondary, this._secondaryActions, actionEquals)) {
            return;
        }
        this._actions = primary;
        this._secondaryActions = secondary;
        this._onDidChangeTitle.fire();
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMTitleMenu = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService)
], SCMTitleMenu);
export { SCMTitleMenu };
class SCMMenusItem {
    get resourceFolderMenu() {
        if (!this._resourceFolderMenu) {
            this._resourceFolderMenu = this.menuService.createMenu(MenuId.SCMResourceFolderContext, this.contextKeyService);
        }
        return this._resourceFolderMenu;
    }
    constructor(contextKeyService, menuService) {
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
    }
    getResourceGroupMenu(resourceGroup) {
        if (typeof resourceGroup.contextValue === 'undefined') {
            if (!this.genericResourceGroupMenu) {
                this.genericResourceGroupMenu = this.menuService.createMenu(MenuId.SCMResourceGroupContext, this.contextKeyService);
            }
            return this.genericResourceGroupMenu;
        }
        if (!this.contextualResourceGroupMenus) {
            this.contextualResourceGroupMenus = new Map();
        }
        let item = this.contextualResourceGroupMenus.get(resourceGroup.contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([
                ['scmResourceGroupState', resourceGroup.contextValue],
            ]);
            const menu = this.menuService.createMenu(MenuId.SCMResourceGroupContext, contextKeyService);
            item = {
                menu,
                dispose() {
                    menu.dispose();
                },
            };
            this.contextualResourceGroupMenus.set(resourceGroup.contextValue, item);
        }
        return item.menu;
    }
    getResourceMenu(resource) {
        if (typeof resource.contextValue === 'undefined') {
            if (!this.genericResourceMenu) {
                this.genericResourceMenu = this.menuService.createMenu(MenuId.SCMResourceContext, this.contextKeyService);
            }
            return this.genericResourceMenu;
        }
        if (!this.contextualResourceMenus) {
            this.contextualResourceMenus = new Map();
        }
        let item = this.contextualResourceMenus.get(resource.contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([
                ['scmResourceState', resource.contextValue],
            ]);
            const menu = this.menuService.createMenu(MenuId.SCMResourceContext, contextKeyService);
            item = {
                menu,
                dispose() {
                    menu.dispose();
                },
            };
            this.contextualResourceMenus.set(resource.contextValue, item);
        }
        return item.menu;
    }
    dispose() {
        this.genericResourceGroupMenu?.dispose();
        this.genericResourceMenu?.dispose();
        this._resourceFolderMenu?.dispose();
        if (this.contextualResourceGroupMenus) {
            dispose(this.contextualResourceGroupMenus.values());
            this.contextualResourceGroupMenus.clear();
            this.contextualResourceGroupMenus = undefined;
        }
        if (this.contextualResourceMenus) {
            dispose(this.contextualResourceMenus.values());
            this.contextualResourceMenus.clear();
            this.contextualResourceMenus = undefined;
        }
    }
}
let SCMRepositoryMenus = class SCMRepositoryMenus {
    get repositoryContextMenu() {
        if (!this._repositoryContextMenu) {
            this._repositoryContextMenu = this.menuService.createMenu(MenuId.SCMSourceControl, this.contextKeyService);
            this.disposables.add(this._repositoryContextMenu);
        }
        return this._repositoryContextMenu;
    }
    constructor(provider, contextKeyService, instantiationService, menuService) {
        this.provider = provider;
        this.menuService = menuService;
        this.resourceGroupMenusItems = new Map();
        this.disposables = new DisposableStore();
        this.contextKeyService = contextKeyService.createOverlay([
            ['scmProvider', provider.contextValue],
            ['scmProviderRootUri', provider.rootUri?.toString()],
            ['scmProviderHasRootUri', !!provider.rootUri],
        ]);
        const serviceCollection = new ServiceCollection([IContextKeyService, this.contextKeyService]);
        instantiationService = instantiationService.createChild(serviceCollection, this.disposables);
        this.titleMenu = instantiationService.createInstance(SCMTitleMenu);
        this.disposables.add(this.titleMenu);
        this.repositoryMenu = menuService.createMenu(MenuId.SCMSourceControlInline, this.contextKeyService);
        this.disposables.add(this.repositoryMenu);
        provider.onDidChangeResourceGroups(this.onDidChangeResourceGroups, this, this.disposables);
        this.onDidChangeResourceGroups();
    }
    getResourceGroupMenu(group) {
        return this.getOrCreateResourceGroupMenusItem(group).getResourceGroupMenu(group);
    }
    getResourceMenu(resource) {
        return this.getOrCreateResourceGroupMenusItem(resource.resourceGroup).getResourceMenu(resource);
    }
    getResourceFolderMenu(group) {
        return this.getOrCreateResourceGroupMenusItem(group).resourceFolderMenu;
    }
    getOrCreateResourceGroupMenusItem(group) {
        let result = this.resourceGroupMenusItems.get(group);
        if (!result) {
            const contextKeyService = this.contextKeyService.createOverlay([
                ['scmResourceGroup', group.id],
                ['multiDiffEditorEnableViewChanges', group.multiDiffEditorEnableViewChanges],
            ]);
            result = new SCMMenusItem(contextKeyService, this.menuService);
            this.resourceGroupMenusItems.set(group, result);
        }
        return result;
    }
    onDidChangeResourceGroups() {
        for (const resourceGroup of this.resourceGroupMenusItems.keys()) {
            if (!this.provider.groups.includes(resourceGroup)) {
                this.resourceGroupMenusItems.get(resourceGroup)?.dispose();
                this.resourceGroupMenusItems.delete(resourceGroup);
            }
        }
    }
    dispose() {
        this.disposables.dispose();
        this.resourceGroupMenusItems.forEach((item) => item.dispose());
    }
};
SCMRepositoryMenus = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService),
    __param(3, IMenuService)
], SCMRepositoryMenus);
export { SCMRepositoryMenus };
let SCMMenus = class SCMMenus {
    constructor(scmService, instantiationService) {
        this.instantiationService = instantiationService;
        this.disposables = new DisposableStore();
        this.repositoryMenuDisposables = new DisposableStore();
        this.menus = new Map();
        this.titleMenu = instantiationService.createInstance(SCMTitleMenu);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        // Duplicate the `SCMTitle` menu items to the `SCMSourceControlInline` menu. We do this
        // so that menu items can be independently hidden/shown in the "Source Control" and the
        // "Source Control Repositories" views.
        this.disposables.add(Event.runAndSubscribe(MenuRegistry.onDidChangeMenu, (e) => {
            if (e && !e.has(MenuId.SCMTitle)) {
                return;
            }
            this.repositoryMenuDisposables.clear();
            for (const menuItem of MenuRegistry.getMenuItems(MenuId.SCMTitle)) {
                this.repositoryMenuDisposables.add(MenuRegistry.appendMenuItem(MenuId.SCMSourceControlInline, menuItem));
            }
        }));
    }
    onDidRemoveRepository(repository) {
        const menus = this.menus.get(repository.provider);
        menus?.dispose();
        this.menus.delete(repository.provider);
    }
    getRepositoryMenus(provider) {
        let result = this.menus.get(provider);
        if (!result) {
            const menus = this.instantiationService.createInstance(SCMRepositoryMenus, provider);
            const dispose = () => {
                menus.dispose();
                this.menus.delete(provider);
            };
            result = { menus, dispose };
            this.menus.set(provider, result);
        }
        return result.menus;
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMMenus = __decorate([
    __param(0, ISCMService),
    __param(1, IInstantiationService)
], SCMMenus);
export { SCMMenus };
MenuRegistry.appendMenuItem(MenuId.SCMResourceContext, {
    title: localize('miShare', 'Share'),
    submenu: MenuId.SCMResourceContextShare,
    group: '45_share',
    order: 3,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9tZW51cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3JHLE9BQU8sRUFFTixZQUFZLEVBQ1osTUFBTSxFQUNOLFlBQVksR0FDWixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFPTixXQUFXLEdBQ1gsTUFBTSxrQkFBa0IsQ0FBQTtBQUV6QixTQUFTLFlBQVksQ0FBQyxDQUFVLEVBQUUsQ0FBVTtJQUMzQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQTtBQUNyQixDQUFDO0FBRU0sSUFBTSxZQUFZLEdBQWxCLE1BQU0sWUFBWTtJQUV4QixJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUdELElBQUksZ0JBQWdCO1FB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