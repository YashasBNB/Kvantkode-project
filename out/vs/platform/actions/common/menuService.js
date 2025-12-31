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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2NvbW1vbi9tZW51U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQVFOLFdBQVcsRUFDWCxjQUFjLEVBR2QsY0FBYyxFQUNkLFlBQVksRUFDWixpQkFBaUIsR0FDakIsTUFBTSxjQUFjLENBQUE7QUFFckIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBd0Isa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRyxPQUFPLEVBQVcsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0saUNBQWlDLENBQUE7QUFDOUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRW5FLElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVc7SUFLdkIsWUFDbUMsZUFBZ0MsRUFDN0Isa0JBQXNDLEVBQzFELGNBQStCO1FBRmQsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQzdCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFHM0UsSUFBSSxDQUFDLGFBQWEs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