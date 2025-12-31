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
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { Emitter } from '../../base/common/event.js';
import { IMenuService, SubmenuItemAction, } from '../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../platform/contextkey/common/contextkey.js';
import { getActionBarActions } from '../../platform/actions/browser/menuEntryActionViewItem.js';
class MenuActions extends Disposable {
    get primaryActions() {
        return this._primaryActions;
    }
    get secondaryActions() {
        return this._secondaryActions;
    }
    constructor(menuId, options, menuService, contextKeyService) {
        super();
        this.options = options;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._primaryActions = [];
        this._secondaryActions = [];
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.disposables = this._register(new DisposableStore());
        this.menu = this._register(menuService.createMenu(menuId, contextKeyService));
        this._register(this.menu.onDidChange(() => this.updateActions()));
        this.updateActions();
    }
    updateActions() {
        this.disposables.clear();
        const newActions = getActionBarActions(this.menu.getActions(this.options));
        this._primaryActions = newActions.primary;
        this._secondaryActions = newActions.secondary;
        this.disposables.add(this.updateSubmenus([...this._primaryActions, ...this._secondaryActions], {}));
        this._onDidChange.fire();
    }
    updateSubmenus(actions, submenus) {
        const disposables = new DisposableStore();
        for (const action of actions) {
            if (action instanceof SubmenuItemAction && !submenus[action.item.submenu.id]) {
                const menu = (submenus[action.item.submenu.id] = disposables.add(this.menuService.createMenu(action.item.submenu, this.contextKeyService)));
                disposables.add(menu.onDidChange(() => this.updateActions()));
                disposables.add(this.updateSubmenus(action.actions, submenus));
            }
        }
        return disposables;
    }
}
let CompositeMenuActions = class CompositeMenuActions extends Disposable {
    constructor(menuId, contextMenuId, options, contextKeyService, menuService) {
        super();
        this.menuId = menuId;
        this.contextMenuId = contextMenuId;
        this.options = options;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.menuActions = this._register(new MenuActions(menuId, this.options, menuService, contextKeyService));
        this._register(this.menuActions.onDidChange(() => this._onDidChange.fire()));
    }
    getPrimaryActions() {
        return this.menuActions.primaryActions;
    }
    getSecondaryActions() {
        return this.menuActions.secondaryActions;
    }
    getContextMenuActions() {
        if (this.contextMenuId) {
            const menu = this.menuService.getMenuActions(this.contextMenuId, this.contextKeyService, this.options);
            return getActionBarActions(menu).secondary;
        }
        return [];
    }
};
CompositeMenuActions = __decorate([
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], CompositeMenuActions);
export { CompositeMenuActions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL2FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxFQUVOLFlBQVksRUFFWixpQkFBaUIsR0FFakIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUUvRixNQUFNLFdBQVksU0FBUSxVQUFVO0lBSW5DLElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUdELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO0lBQzlCLENBQUM7SUFPRCxZQUNDLE1BQWMsRUFDRyxPQUF1QyxFQUN2QyxXQUF5QixFQUN6QixpQkFBcUM7UUFFdEQsS0FBSyxFQUFFLENBQUE7UUFKVSxZQUFPLEdBQVAsT0FBTyxDQUFnQztRQUN2QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUN6QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBbkIvQyxvQkFBZSxHQUFjLEVBQUUsQ0FBQTtRQUsvQixzQkFBaUIsR0FBYyxFQUFFLENBQUE7UUFLeEIsaUJBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUMxRCxnQkFBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFBO1FBRTdC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