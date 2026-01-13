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
var PersistedMenuHideState_1, MenuInfo_1;
import { RunOnceScheduler } from '../../../base/common/async.js';
import { DebounceEmitter, Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isIMenuItem, isISubmenuItem, MenuItemAction, MenuRegistry, SubmenuItemAction, } from './actions.js';
import { ICommandService } from '../../commands/common/commands.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { Separator, toAction } from '../../../base/common/actions.js';
import { IStorageService } from '../../storage/common/storage.js';
import { removeFastWithoutKeepingOrder } from '../../../base/common/arrays.js';
import { localize } from '../../../nls.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
let MenuService = class MenuService {
    constructor(_commandService, _keybindingService, storageService) {
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._hiddenStates = new PersistedMenuHideState(storageService);
    }
    createMenu(id, contextKeyService, options) {
        return new MenuImpl(id, this._hiddenStates, { emitEventsForSubmenuChanges: false, eventDebounceDelay: 50, ...options }, this._commandService, this._keybindingService, contextKeyService);
    }
    getMenuActions(id, contextKeyService, options) {
        const menu = new MenuImpl(id, this._hiddenStates, { emitEventsForSubmenuChanges: false, eventDebounceDelay: 50, ...options }, this._commandService, this._keybindingService, contextKeyService);
        const actions = menu.getActions(options);
        menu.dispose();
        return actions;
    }
    getMenuContexts(id) {
        const menuInfo = new MenuInfoSnapshot(id, false);
        return new Set([
            ...menuInfo.structureContextKeys,
            ...menuInfo.preconditionContextKeys,
            ...menuInfo.toggledContextKeys,
        ]);
    }
    resetHiddenStates(ids) {
        this._hiddenStates.reset(ids);
    }
};
MenuService = __decorate([
    __param(0, ICommandService),
    __param(1, IKeybindingService),
    __param(2, IStorageService)
], MenuService);
export { MenuService };
let PersistedMenuHideState = class PersistedMenuHideState {
    static { PersistedMenuHideState_1 = this; }
    static { this._key = 'menu.hiddenCommands'; }
    constructor(_storageService) {
        this._storageService = _storageService;
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._ignoreChangeEvent = false;
        this._hiddenByDefaultCache = new Map();
        try {
            const raw = _storageService.get(PersistedMenuHideState_1._key, 0 /* StorageScope.PROFILE */, '{}');
            this._data = JSON.parse(raw);
        }
        catch (err) {
            this._data = Object.create(null);
        }
        this._disposables.add(_storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, PersistedMenuHideState_1._key, this._disposables)(() => {
            if (!this._ignoreChangeEvent) {
                try {
                    const raw = _storageService.get(PersistedMenuHideState_1._key, 0 /* StorageScope.PROFILE */, '{}');
                    this._data = JSON.parse(raw);
                }
                catch (err) {
                    console.log('FAILED to read storage after UPDATE', err);
                }
            }
            this._onDidChange.fire();
        }));
    }
    dispose() {
        this._onDidChange.dispose();
        this._disposables.dispose();
    }
    _isHiddenByDefault(menu, commandId) {
        return this._hiddenByDefaultCache.get(`${menu.id}/${commandId}`) ?? false;
    }
    setDefaultState(menu, commandId, hidden) {
        this._hiddenByDefaultCache.set(`${menu.id}/${commandId}`, hidden);
    }
    isHidden(menu, commandId) {
        const hiddenByDefault = this._isHiddenByDefault(menu, commandId);
        const state = this._data[menu.id]?.includes(commandId) ?? false;
        return hiddenByDefault ? !state : state;
    }
    updateHidden(menu, commandId, hidden) {
        const hiddenByDefault = this._isHiddenByDefault(menu, commandId);
        if (hiddenByDefault) {
            hidden = !hidden;
        }
        const entries = this._data[menu.id];
        if (!hidden) {
            // remove and cleanup
            if (entries) {
                const idx = entries.indexOf(commandId);
                if (idx >= 0) {
                    removeFastWithoutKeepingOrder(entries, idx);
                }
                if (entries.length === 0) {
                    delete this._data[menu.id];
                }
            }
        }
        else {
            // add unless already added
            if (!entries) {
                this._data[menu.id] = [commandId];
            }
            else {
                const idx = entries.indexOf(commandId);
                if (idx < 0) {
                    entries.push(commandId);
                }
            }
        }
        this._persist();
    }
    reset(menus) {
        if (menus === undefined) {
            // reset all
            this._data = Object.create(null);
            this._persist();
        }
        else {
            // reset only for a specific menu
            for (const { id } of menus) {
                if (this._data[id]) {
                    delete this._data[id];
                }
            }
            this._persist();
        }
    }
    _persist() {
        try {
            this._ignoreChangeEvent = true;
            const raw = JSON.stringify(this._data);
            this._storageService.store(PersistedMenuHideState_1._key, raw, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        finally {
            this._ignoreChangeEvent = false;
        }
    }
};
PersistedMenuHideState = PersistedMenuHideState_1 = __decorate([
    __param(0, IStorageService)
], PersistedMenuHideState);
class MenuInfoSnapshot {
    constructor(_id, _collectContextKeysForSubmenus) {
        this._id = _id;
        this._collectContextKeysForSubmenus = _collectContextKeysForSubmenus;
        this._menuGroups = [];
        this._allMenuIds = new Set();
        this._structureContextKeys = new Set();
        this._preconditionContextKeys = new Set();
        this._toggledContextKeys = new Set();
        this.refresh();
    }
    get allMenuIds() {
        return this._allMenuIds;
    }
    get structureContextKeys() {
        return this._structureContextKeys;
    }
    get preconditionContextKeys() {
        return this._preconditionContextKeys;
    }
    get toggledContextKeys() {
        return this._toggledContextKeys;
    }
    refresh() {
        // reset
        this._menuGroups.length = 0;
        this._allMenuIds.clear();
        this._structureContextKeys.clear();
        this._preconditionContextKeys.clear();
        this._toggledContextKeys.clear();
        const menuItems = this._sort(MenuRegistry.getMenuItems(this._id));
        let group;
        for (const item of menuItems) {
            // group by groupId
            const groupName = item.group || '';
            if (!group || group[0] !== groupName) {
                group = [groupName, []];
                this._menuGroups.push(group);
            }
            group[1].push(item);
            // keep keys and submenu ids for eventing
            this._collectContextKeysAndSubmenuIds(item);
        }
        this._allMenuIds.add(this._id);
    }
    _sort(menuItems) {
        // no sorting needed in snapshot
        return menuItems;
    }
    _collectContextKeysAndSubmenuIds(item) {
        MenuInfoSnapshot._fillInKbExprKeys(item.when, this._structureContextKeys);
        if (isIMenuItem(item)) {
            // keep precondition keys for event if applicable
            if (item.command.precondition) {
                MenuInfoSnapshot._fillInKbExprKeys(item.command.precondition, this._preconditionContextKeys);
            }
            // keep toggled keys for event if applicable
            if (item.command.toggled) {
                const toggledExpression = item.command.toggled.condition ||
                    item.command.toggled;
                MenuInfoSnapshot._fillInKbExprKeys(toggledExpression, this._toggledContextKeys);
            }
        }
        else if (this._collectContextKeysForSubmenus) {
            // recursively collect context keys from submenus so that this
            // menu fires events when context key changes affect submenus
            MenuRegistry.getMenuItems(item.submenu).forEach(this._collectContextKeysAndSubmenuIds, this);
            this._allMenuIds.add(item.submenu);
        }
    }
    static _fillInKbExprKeys(exp, set) {
        if (exp) {
            for (const key of exp.keys()) {
                set.add(key);
            }
        }
    }
}
let MenuInfo = MenuInfo_1 = class MenuInfo extends MenuInfoSnapshot {
    constructor(_id, _hiddenStates, _collectContextKeysForSubmenus, _commandService, _keybindingService, _contextKeyService) {
        super(_id, _collectContextKeysForSubmenus);
        this._hiddenStates = _hiddenStates;
        this._commandService = _commandService;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this.refresh();
    }
    createActionGroups(options) {
        const result = [];
        for (const group of this._menuGroups) {
            const [id, items] = group;
            let activeActions;
            for (const item of items) {
                if (this._contextKeyService.contextMatchesRules(item.when)) {
                    const isMenuItem = isIMenuItem(item);
                    if (isMenuItem) {
                        this._hiddenStates.setDefaultState(this._id, item.command.id, !!item.isHiddenByDefault);
                    }
                    const menuHide = createMenuHide(this._id, isMenuItem ? item.command : item, this._hiddenStates);
                    if (isMenuItem) {
                        // MenuItemAction
                        const menuKeybinding = createConfigureKeybindingAction(this._commandService, this._keybindingService, item.command.id, item.when);
                        (activeActions ??= []).push(new MenuItemAction(item.command, item.alt, options, menuHide, menuKeybinding, this._contextKeyService, this._commandService));
                    }
                    else {
                        // SubmenuItemAction
                        const groups = new MenuInfo_1(item.submenu, this._hiddenStates, this._collectContextKeysForSubmenus, this._commandService, this._keybindingService, this._contextKeyService).createActionGroups(options);
                        const submenuActions = Separator.join(...groups.map((g) => g[1]));
                        if (submenuActions.length > 0) {
                            ;
                            (activeActions ??= []).push(new SubmenuItemAction(item, menuHide, submenuActions));
                        }
                    }
                }
            }
            if (activeActions && activeActions.length > 0) {
                result.push([id, activeActions]);
            }
        }
        return result;
    }
    _sort(menuItems) {
        return menuItems.sort(MenuInfo_1._compareMenuItems);
    }
    static _compareMenuItems(a, b) {
        const aGroup = a.group;
        const bGroup = b.group;
        if (aGroup !== bGroup) {
            // Falsy groups come last
            if (!aGroup) {
                return 1;
            }
            else if (!bGroup) {
                return -1;
            }
            // 'navigation' group comes first
            if (aGroup === 'navigation') {
                return -1;
            }
            else if (bGroup === 'navigation') {
                return 1;
            }
            // lexical sort for groups
            const value = aGroup.localeCompare(bGroup);
            if (value !== 0) {
                return value;
            }
        }
        // sort on priority - default is 0
        const aPrio = a.order || 0;
        const bPrio = b.order || 0;
        if (aPrio < bPrio) {
            return -1;
        }
        else if (aPrio > bPrio) {
            return 1;
        }
        // sort on titles
        return MenuInfo_1._compareTitles(isIMenuItem(a) ? a.command.title : a.title, isIMenuItem(b) ? b.command.title : b.title);
    }
    static _compareTitles(a, b) {
        const aStr = typeof a === 'string' ? a : a.original;
        const bStr = typeof b === 'string' ? b : b.original;
        return aStr.localeCompare(bStr);
    }
};
MenuInfo = MenuInfo_1 = __decorate([
    __param(3, ICommandService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], MenuInfo);
let MenuImpl = class MenuImpl {
    constructor(id, hiddenStates, options, commandService, keybindingService, contextKeyService) {
        this._disposables = new DisposableStore();
        this._menuInfo = new MenuInfo(id, hiddenStates, options.emitEventsForSubmenuChanges, commandService, keybindingService, contextKeyService);
        // Rebuild this menu whenever the menu registry reports an event for this MenuId.
        // This usually happen while code and extensions are loaded and affects the over
        // structure of the menu
        const rebuildMenuSoon = new RunOnceScheduler(() => {
            this._menuInfo.refresh();
            this._onDidChange.fire({
                menu: this,
                isStructuralChange: true,
                isEnablementChange: true,
                isToggleChange: true,
            });
        }, options.eventDebounceDelay);
        this._disposables.add(rebuildMenuSoon);
        this._disposables.add(MenuRegistry.onDidChangeMenu((e) => {
            for (const id of this._menuInfo.allMenuIds) {
                if (e.has(id)) {
                    rebuildMenuSoon.schedule();
                    break;
                }
            }
        }));
        // When context keys or storage state changes we need to check if the menu also has changed. However,
        // we only do that when someone listens on this menu because (1) these events are
        // firing often and (2) menu are often leaked
        const lazyListener = this._disposables.add(new DisposableStore());
        const merge = (events) => {
            let isStructuralChange = false;
            let isEnablementChange = false;
            let isToggleChange = false;
            for (const item of events) {
                isStructuralChange = isStructuralChange || item.isStructuralChange;
                isEnablementChange = isEnablementChange || item.isEnablementChange;
                isToggleChange = isToggleChange || item.isToggleChange;
                if (isStructuralChange && isEnablementChange && isToggleChange) {
                    // everything is TRUE, no need to continue iterating
                    break;
                }
            }
            return { menu: this, isStructuralChange, isEnablementChange, isToggleChange };
        };
        const startLazyListener = () => {
            lazyListener.add(contextKeyService.onDidChangeContext((e) => {
                const isStructuralChange = e.affectsSome(this._menuInfo.structureContextKeys);
                const isEnablementChange = e.affectsSome(this._menuInfo.preconditionContextKeys);
                const isToggleChange = e.affectsSome(this._menuInfo.toggledContextKeys);
                if (isStructuralChange || isEnablementChange || isToggleChange) {
                    this._onDidChange.fire({
                        menu: this,
                        isStructuralChange,
                        isEnablementChange,
                        isToggleChange,
                    });
                }
            }));
            lazyListener.add(hiddenStates.onDidChange((e) => {
                this._onDidChange.fire({
                    menu: this,
                    isStructuralChange: true,
                    isEnablementChange: false,
                    isToggleChange: false,
                });
            }));
        };
        this._onDidChange = new DebounceEmitter({
            // start/stop context key listener
            onWillAddFirstListener: startLazyListener,
            onDidRemoveLastListener: lazyListener.clear.bind(lazyListener),
            delay: options.eventDebounceDelay,
            merge,
        });
        this.onDidChange = this._onDidChange.event;
    }
    getActions(options) {
        return this._menuInfo.createActionGroups(options);
    }
    dispose() {
        this._disposables.dispose();
        this._onDidChange.dispose();
    }
};
MenuImpl = __decorate([
    __param(3, ICommandService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], MenuImpl);
function createMenuHide(menu, command, states) {
    const id = isISubmenuItem(command) ? command.submenu.id : command.id;
    const title = typeof command.title === 'string' ? command.title : command.title.value;
    const hide = toAction({
        id: `hide/${menu.id}/${id}`,
        label: localize('hide.label', "Hide '{0}'", title),
        run() {
            states.updateHidden(menu, id, true);
        },
    });
    const toggle = toAction({
        id: `toggle/${menu.id}/${id}`,
        label: title,
        get checked() {
            return !states.isHidden(menu, id);
        },
        run() {
            states.updateHidden(menu, id, !!this.checked);
        },
    });
    return {
        hide,
        toggle,
        get isHidden() {
            return !toggle.checked;
        },
    };
}
export function createConfigureKeybindingAction(commandService, keybindingService, commandId, when = undefined, enabled = true) {
    return toAction({
        id: `configureKeybinding/${commandId}`,
        label: localize('configure keybinding', 'Configure Keybinding'),
        enabled,
        run() {
            // Only set the when clause when there is no keybinding
            // It is possible that the action and the keybinding have different when clauses
            const hasKeybinding = !!keybindingService.lookupKeybinding(commandId); // This may only be called inside the `run()` method as it can be expensive on startup. #210529
            const whenValue = !hasKeybinding && when ? when.serialize() : undefined;
            commandService.executeCommand('workbench.action.openGlobalKeybindings', `@command:${commandId}` + (whenValue ? ` +when:${whenValue}` : ''));
        },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbnMvY29tbW9uL21lbnVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBUU4sV0FBVyxFQUNYLGNBQWMsRUFHZCxjQUFjLEVBQ2QsWUFBWSxFQUNaLGlCQUFpQixHQUNqQixNQUFNLGNBQWMsQ0FBQTtBQUVyQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUF3QixrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hHLE9BQU8sRUFBVyxTQUFTLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFbkUsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBVztJQUt2QixZQUNtQyxlQUFnQyxFQUM3QixrQkFBc0MsRUFDMUQsY0FBK0I7UUFGZCxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFv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