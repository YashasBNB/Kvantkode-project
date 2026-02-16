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
import { Extensions as ViewExtensions, defaultViewIcon, VIEWS_LOG_ID, VIEWS_LOG_NAME, } from '../../../common/views.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { URI } from '../../../../base/common/uri.js';
import { coalesce, move } from '../../../../base/common/arrays.js';
import { isUndefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { CounterSet } from '../../../../base/common/map.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
export function getViewsStateStorageId(viewContainerStorageId) {
    return `${viewContainerStorageId}.hidden`;
}
let ViewDescriptorsState = class ViewDescriptorsState extends Disposable {
    constructor(viewContainerStorageId, viewContainerName, storageService, loggerService) {
        super();
        this.viewContainerName = viewContainerName;
        this.storageService = storageService;
        this._onDidChangeStoredState = this._register(new Emitter());
        this.onDidChangeStoredState = this._onDidChangeStoredState.event;
        this.logger = new Lazy(() => loggerService.createLogger(VIEWS_LOG_ID, { name: VIEWS_LOG_NAME, group: windowLogGroup }));
        this.globalViewsStateStorageId = getViewsStateStorageId(viewContainerStorageId);
        this.workspaceViewsStateStorageId = viewContainerStorageId;
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, this.globalViewsStateStorageId, this._store)(() => this.onDidStorageChange()));
        this.state = this.initialize();
    }
    set(id, state) {
        this.state.set(id, state);
    }
    get(id) {
        return this.state.get(id);
    }
    updateState(viewDescriptors) {
        this.updateWorkspaceState(viewDescriptors);
        this.updateGlobalState(viewDescriptors);
    }
    updateWorkspaceState(viewDescriptors) {
        const storedViewsStates = this.getStoredWorkspaceState();
        for (const viewDescriptor of viewDescriptors) {
            const viewState = this.get(viewDescriptor.id);
            if (viewState) {
                storedViewsStates[viewDescriptor.id] = {
                    collapsed: !!viewState.collapsed,
                    isHidden: !viewState.visibleWorkspace,
                    size: viewState.size,
                    order: viewDescriptor.workspace && viewState ? viewState.order : undefined,
                };
            }
        }
        if (Object.keys(storedViewsStates).length > 0) {
            this.storageService.store(this.workspaceViewsStateStorageId, JSON.stringify(storedViewsStates), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(this.workspaceViewsStateStorageId, 1 /* StorageScope.WORKSPACE */);
        }
    }
    updateGlobalState(viewDescriptors) {
        const storedGlobalState = this.getStoredGlobalState();
        for (const viewDescriptor of viewDescriptors) {
            const state = this.get(viewDescriptor.id);
            storedGlobalState.set(viewDescriptor.id, {
                id: viewDescriptor.id,
                isHidden: state && viewDescriptor.canToggleVisibility ? !state.visibleGlobal : false,
                order: !viewDescriptor.workspace && state ? state.order : undefined,
            });
        }
        this.setStoredGlobalState(storedGlobalState);
    }
    onDidStorageChange() {
        if (this.globalViewsStatesValue !==
            this.getStoredGlobalViewsStatesValue() /* This checks if current window changed the value or not */) {
            this._globalViewsStatesValue = undefined;
            const storedViewsVisibilityStates = this.getStoredGlobalState();
            const storedWorkspaceViewsStates = this.getStoredWorkspaceState();
            const changedStates = [];
            for (const [id, storedState] of storedViewsVisibilityStates) {
                const state = this.get(id);
                if (state) {
                    if (state.visibleGlobal !== !storedState.isHidden) {
                        if (!storedState.isHidden) {
                            this.logger.value.info(`View visibility state changed: ${id} is now visible`, this.viewContainerName);
                        }
                        changedStates.push({ id, visible: !storedState.isHidden });
                    }
                }
                else {
                    const workspaceViewState = storedWorkspaceViewsStates[id];
                    this.set(id, {
                        active: false,
                        visibleGlobal: !storedState.isHidden,
                        visibleWorkspace: isUndefined(workspaceViewState?.isHidden)
                            ? undefined
                            : !workspaceViewState?.isHidden,
                        collapsed: workspaceViewState?.collapsed,
                        order: workspaceViewState?.order,
                        size: workspaceViewState?.size,
                    });
                }
            }
            if (changedStates.length) {
                this._onDidChangeStoredState.fire(changedStates);
                // Update the in memory state after firing the event
                // so that the views can update their state accordingly
                for (const changedState of changedStates) {
                    const state = this.get(changedState.id);
                    if (state) {
                        state.visibleGlobal = changedState.visible;
                    }
                }
            }
        }
    }
    initialize() {
        const viewStates = new Map();
        const workspaceViewsStates = this.getStoredWorkspaceState();
        for (const id of Object.keys(workspaceViewsStates)) {
            const workspaceViewState = workspaceViewsStates[id];
            viewStates.set(id, {
                active: false,
                visibleGlobal: undefined,
                visibleWorkspace: isUndefined(workspaceViewState.isHidden)
                    ? undefined
                    : !workspaceViewState.isHidden,
                collapsed: workspaceViewState.collapsed,
                order: workspaceViewState.order,
                size: workspaceViewState.size,
            });
        }
        // Migrate to `viewletStateStorageId`
        const value = this.storageService.get(this.globalViewsStateStorageId, 1 /* StorageScope.WORKSPACE */, '[]');
        const { state: workspaceVisibilityStates } = this.parseStoredGlobalState(value);
        if (workspaceVisibilityStates.size > 0) {
            for (const { id, isHidden } of workspaceVisibilityStates.values()) {
                const viewState = viewStates.get(id);
                // Not migrated to `viewletStateStorageId`
                if (viewState) {
                    if (isUndefined(viewState.visibleWorkspace)) {
                        viewState.visibleWorkspace = !isHidden;
                    }
                }
                else {
                    viewStates.set(id, {
                        active: false,
                        collapsed: undefined,
                        visibleGlobal: undefined,
                        visibleWorkspace: !isHidden,
                    });
                }
            }
            this.storageService.remove(this.globalViewsStateStorageId, 1 /* StorageScope.WORKSPACE */);
        }
        const { state, hasDuplicates } = this.parseStoredGlobalState(this.globalViewsStatesValue);
        if (hasDuplicates) {
            this.setStoredGlobalState(state);
        }
        for (const { id, isHidden, order } of state.values()) {
            const viewState = viewStates.get(id);
            if (viewState) {
                viewState.visibleGlobal = !isHidden;
                if (!isUndefined(order)) {
                    viewState.order = order;
                }
            }
            else {
                viewStates.set(id, {
                    active: false,
                    visibleGlobal: !isHidden,
                    order,
                    collapsed: undefined,
                    visibleWorkspace: undefined,
                });
            }
        }
        return viewStates;
    }
    getStoredWorkspaceState() {
        return JSON.parse(this.storageService.get(this.workspaceViewsStateStorageId, 1 /* StorageScope.WORKSPACE */, '{}'));
    }
    getStoredGlobalState() {
        return this.parseStoredGlobalState(this.globalViewsStatesValue).state;
    }
    setStoredGlobalState(storedGlobalState) {
        this.globalViewsStatesValue = JSON.stringify([...storedGlobalState.values()]);
    }
    parseStoredGlobalState(value) {
        const storedValue = JSON.parse(value);
        let hasDuplicates = false;
        const state = storedValue.reduce((result, storedState) => {
            if (typeof storedState === 'string' /* migration */) {
                hasDuplicates = hasDuplicates || result.has(storedState);
                result.set(storedState, { id: storedState, isHidden: true });
            }
            else {
                hasDuplicates = hasDuplicates || result.has(storedState.id);
                result.set(storedState.id, storedState);
            }
            return result;
        }, new Map());
        return { state, hasDuplicates };
    }
    get globalViewsStatesValue() {
        if (!this._globalViewsStatesValue) {
            this._globalViewsStatesValue = this.getStoredGlobalViewsStatesValue();
        }
        return this._globalViewsStatesValue;
    }
    set globalViewsStatesValue(globalViewsStatesValue) {
        if (this.globalViewsStatesValue !== globalViewsStatesValue) {
            this._globalViewsStatesValue = globalViewsStatesValue;
            this.setStoredGlobalViewsStatesValue(globalViewsStatesValue);
        }
    }
    getStoredGlobalViewsStatesValue() {
        return this.storageService.get(this.globalViewsStateStorageId, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredGlobalViewsStatesValue(value) {
        this.storageService.store(this.globalViewsStateStorageId, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
};
ViewDescriptorsState = __decorate([
    __param(2, IStorageService),
    __param(3, ILoggerService)
], ViewDescriptorsState);
let ViewContainerModel = class ViewContainerModel extends Disposable {
    get title() {
        return this._title;
    }
    get icon() {
        return this._icon;
    }
    get keybindingId() {
        return this._keybindingId;
    }
    // All View Descriptors
    get allViewDescriptors() {
        return this.viewDescriptorItems.map((item) => item.viewDescriptor);
    }
    // Active View Descriptors
    get activeViewDescriptors() {
        return this.viewDescriptorItems
            .filter((item) => item.state.active)
            .map((item) => item.viewDescriptor);
    }
    // Visible View Descriptors
    get visibleViewDescriptors() {
        return this.viewDescriptorItems
            .filter((item) => this.isViewDescriptorVisible(item))
            .map((item) => item.viewDescriptor);
    }
    constructor(viewContainer, instantiationService, contextKeyService, loggerService) {
        super();
        this.viewContainer = viewContainer;
        this.contextKeyService = contextKeyService;
        this.contextKeys = new CounterSet();
        this.viewDescriptorItems = [];
        this._onDidChangeContainerInfo = this._register(new Emitter());
        this.onDidChangeContainerInfo = this._onDidChangeContainerInfo.event;
        this._onDidChangeAllViewDescriptors = this._register(new Emitter());
        this.onDidChangeAllViewDescriptors = this._onDidChangeAllViewDescriptors.event;
        this._onDidChangeActiveViewDescriptors = this._register(new Emitter());
        this.onDidChangeActiveViewDescriptors = this._onDidChangeActiveViewDescriptors.event;
        this._onDidAddVisibleViewDescriptors = this._register(new Emitter());
        this.onDidAddVisibleViewDescriptors = this._onDidAddVisibleViewDescriptors.event;
        this._onDidRemoveVisibleViewDescriptors = this._register(new Emitter());
        this.onDidRemoveVisibleViewDescriptors = this._onDidRemoveVisibleViewDescriptors.event;
        this._onDidMoveVisibleViewDescriptors = this._register(new Emitter());
        this.onDidMoveVisibleViewDescriptors = this._onDidMoveVisibleViewDescriptors.event;
        this.logger = new Lazy(() => loggerService.createLogger(VIEWS_LOG_ID, { name: VIEWS_LOG_NAME, group: windowLogGroup }));
        this._register(Event.filter(contextKeyService.onDidChangeContext, (e) => e.affectsSome(this.contextKeys))(() => this.onDidChangeContext()));
        this.viewDescriptorsState = this._register(instantiationService.createInstance(ViewDescriptorsState, viewContainer.storageId || `${viewContainer.id}.state`, typeof viewContainer.title === 'string'
            ? viewContainer.title
            : viewContainer.title.original));
        this._register(this.viewDescriptorsState.onDidChangeStoredState((items) => this.updateVisibility(items)));
        this.updateContainerInfo();
    }
    updateContainerInfo() {
        /* Use default container info if one of the visible view descriptors belongs to the current container by default */
        const useDefaultContainerInfo = this.viewContainer.alwaysUseContainerInfo ||
            this.visibleViewDescriptors.length === 0 ||
            this.visibleViewDescriptors.some((v) => Registry.as(ViewExtensions.ViewsRegistry).getViewContainer(v.id) ===
                this.viewContainer);
        const title = useDefaultContainerInfo
            ? typeof this.viewContainer.title === 'string'
                ? this.viewContainer.title
                : this.viewContainer.title.value
            : this.visibleViewDescriptors[0]?.containerTitle ||
                this.visibleViewDescriptors[0]?.name?.value ||
                '';
        let titleChanged = false;
        if (this._title !== title) {
            this._title = title;
            titleChanged = true;
        }
        const icon = useDefaultContainerInfo
            ? this.viewContainer.icon
            : this.visibleViewDescriptors[0]?.containerIcon || defaultViewIcon;
        let iconChanged = false;
        if (!this.isEqualIcon(icon)) {
            this._icon = icon;
            iconChanged = true;
        }
        const keybindingId = this.viewContainer.openCommandActionDescriptor?.id ??
            this.activeViewDescriptors.find((v) => v.openCommandActionDescriptor)
                ?.openCommandActionDescriptor?.id;
        let keybindingIdChanged = false;
        if (this._keybindingId !== keybindingId) {
            this._keybindingId = keybindingId;
            keybindingIdChanged = true;
        }
        if (titleChanged || iconChanged || keybindingIdChanged) {
            this._onDidChangeContainerInfo.fire({
                title: titleChanged,
                icon: iconChanged,
                keybindingId: keybindingIdChanged,
            });
        }
    }
    isEqualIcon(icon) {
        if (URI.isUri(icon)) {
            return URI.isUri(this._icon) && isEqual(icon, this._icon);
        }
        else if (ThemeIcon.isThemeIcon(icon)) {
            return ThemeIcon.isThemeIcon(this._icon) && ThemeIcon.isEqual(icon, this._icon);
        }
        return icon === this._icon;
    }
    isVisible(id) {
        const viewDescriptorItem = this.viewDescriptorItems.find((v) => v.viewDescriptor.id === id);
        if (!viewDescriptorItem) {
            throw new Error(`Unknown view ${id}`);
        }
        return this.isViewDescriptorVisible(viewDescriptorItem);
    }
    setVisible(id, visible) {
        this.updateVisibility([{ id, visible }]);
    }
    updateVisibility(viewDescriptors) {
        // First: Update and remove the view descriptors which are asked to be hidden
        const viewDescriptorItemsToHide = coalesce(viewDescriptors
            .filter(({ visible }) => !visible)
            .map(({ id }) => this.findAndIgnoreIfNotFound(id)));
        const removed = [];
        for (const { viewDescriptorItem, visibleIndex } of viewDescriptorItemsToHide) {
            if (this.updateViewDescriptorItemVisibility(viewDescriptorItem, false)) {
                removed.push({ viewDescriptor: viewDescriptorItem.viewDescriptor, index: visibleIndex });
            }
        }
        if (removed.length) {
            this.broadCastRemovedVisibleViewDescriptors(removed);
        }
        // Second: Update and add the view descriptors which are asked to be shown
        const added = [];
        for (const { id, visible } of viewDescriptors) {
            if (!visible) {
                continue;
            }
            const foundViewDescriptor = this.findAndIgnoreIfNotFound(id);
            if (!foundViewDescriptor) {
                continue;
            }
            const { viewDescriptorItem, visibleIndex } = foundViewDescriptor;
            if (this.updateViewDescriptorItemVisibility(viewDescriptorItem, true)) {
                added.push({
                    index: visibleIndex,
                    viewDescriptor: viewDescriptorItem.viewDescriptor,
                    size: viewDescriptorItem.state.size,
                    collapsed: !!viewDescriptorItem.state.collapsed,
                });
            }
        }
        if (added.length) {
            this.broadCastAddedVisibleViewDescriptors(added);
        }
    }
    updateViewDescriptorItemVisibility(viewDescriptorItem, visible) {
        if (!viewDescriptorItem.viewDescriptor.canToggleVisibility) {
            return false;
        }
        if (this.isViewDescriptorVisibleWhenActive(viewDescriptorItem) === visible) {
            return false;
        }
        // update visibility
        if (viewDescriptorItem.viewDescriptor.workspace) {
            viewDescriptorItem.state.visibleWorkspace = visible;
        }
        else {
            viewDescriptorItem.state.visibleGlobal = visible;
            if (visible) {
                this.logger.value.info(`Showing view ${viewDescriptorItem.viewDescriptor.id} in the container ${this.viewContainer.id}`);
            }
        }
        // return `true` only if visibility is changed
        return this.isViewDescriptorVisible(viewDescriptorItem) === visible;
    }
    isCollapsed(id) {
        return !!this.find(id).viewDescriptorItem.state.collapsed;
    }
    setCollapsed(id, collapsed) {
        const { viewDescriptorItem } = this.find(id);
        if (viewDescriptorItem.state.collapsed !== collapsed) {
            viewDescriptorItem.state.collapsed = collapsed;
        }
        this.viewDescriptorsState.updateState(this.allViewDescriptors);
    }
    getSize(id) {
        return this.find(id).viewDescriptorItem.state.size;
    }
    setSizes(newSizes) {
        for (const { id, size } of newSizes) {
            const { viewDescriptorItem } = this.find(id);
            if (viewDescriptorItem.state.size !== size) {
                viewDescriptorItem.state.size = size;
            }
        }
        this.viewDescriptorsState.updateState(this.allViewDescriptors);
    }
    move(from, to) {
        const fromIndex = this.viewDescriptorItems.findIndex((v) => v.viewDescriptor.id === from);
        const toIndex = this.viewDescriptorItems.findIndex((v) => v.viewDescriptor.id === to);
        const fromViewDescriptor = this.viewDescriptorItems[fromIndex];
        const toViewDescriptor = this.viewDescriptorItems[toIndex];
        move(this.viewDescriptorItems, fromIndex, toIndex);
        for (let index = 0; index < this.viewDescriptorItems.length; index++) {
            this.viewDescriptorItems[index].state.order = index;
        }
        this.broadCastMovedViewDescriptors({ index: fromIndex, viewDescriptor: fromViewDescriptor.viewDescriptor }, { index: toIndex, viewDescriptor: toViewDescriptor.viewDescriptor });
    }
    add(addedViewDescriptorStates) {
        const addedItems = [];
        for (const addedViewDescriptorState of addedViewDescriptorStates) {
            const viewDescriptor = addedViewDescriptorState.viewDescriptor;
            if (viewDescriptor.when) {
                for (const key of viewDescriptor.when.keys()) {
                    this.contextKeys.add(key);
                }
            }
            let state = this.viewDescriptorsState.get(viewDescriptor.id);
            if (state) {
                // set defaults if not set
                if (viewDescriptor.workspace) {
                    state.visibleWorkspace = isUndefinedOrNull(addedViewDescriptorState.visible)
                        ? isUndefinedOrNull(state.visibleWorkspace)
                            ? !viewDescriptor.hideByDefault
                            : state.visibleWorkspace
                        : addedViewDescriptorState.visible;
                }
                else {
                    const isVisible = state.visibleGlobal;
                    state.visibleGlobal = isUndefinedOrNull(addedViewDescriptorState.visible)
                        ? isUndefinedOrNull(state.visibleGlobal)
                            ? !viewDescriptor.hideByDefault
                            : state.visibleGlobal
                        : addedViewDescriptorState.visible;
                    if (state.visibleGlobal && !isVisible) {
                        this.logger.value.info(`Added view ${viewDescriptor.id} in the container ${this.viewContainer.id} and showing it.`, `${isVisible}`, `${viewDescriptor.hideByDefault}`, `${addedViewDescriptorState.visible}`);
                    }
                }
                state.collapsed = isUndefinedOrNull(addedViewDescriptorState.collapsed)
                    ? isUndefinedOrNull(state.collapsed)
                        ? !!viewDescriptor.collapsed
                        : state.collapsed
                    : addedViewDescriptorState.collapsed;
            }
            else {
                state = {
                    active: false,
                    visibleGlobal: isUndefinedOrNull(addedViewDescriptorState.visible)
                        ? !viewDescriptor.hideByDefault
                        : addedViewDescriptorState.visible,
                    visibleWorkspace: isUndefinedOrNull(addedViewDescriptorState.visible)
                        ? !viewDescriptor.hideByDefault
                        : addedViewDescriptorState.visible,
                    collapsed: isUndefinedOrNull(addedViewDescriptorState.collapsed)
                        ? !!viewDescriptor.collapsed
                        : addedViewDescriptorState.collapsed,
                };
            }
            this.viewDescriptorsState.set(viewDescriptor.id, state);
            state.active = this.contextKeyService.contextMatchesRules(viewDescriptor.when);
            addedItems.push({ viewDescriptor, state });
        }
        this.viewDescriptorItems.push(...addedItems);
        this.viewDescriptorItems.sort(this.compareViewDescriptors.bind(this));
        this._onDidChangeAllViewDescriptors.fire({
            added: addedItems.map(({ viewDescriptor }) => viewDescriptor),
            removed: [],
        });
        const addedActiveItems = [];
        for (const viewDescriptorItem of addedItems) {
            if (viewDescriptorItem.state.active) {
                addedActiveItems.push({
                    viewDescriptorItem,
                    visible: this.isViewDescriptorVisible(viewDescriptorItem),
                });
            }
        }
        if (addedActiveItems.length) {
            this._onDidChangeActiveViewDescriptors.fire({
                added: addedActiveItems.map(({ viewDescriptorItem }) => viewDescriptorItem.viewDescriptor),
                removed: [],
            });
        }
        const addedVisibleDescriptors = [];
        for (const { viewDescriptorItem, visible } of addedActiveItems) {
            if (visible && this.isViewDescriptorVisible(viewDescriptorItem)) {
                const { visibleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
                addedVisibleDescriptors.push({
                    index: visibleIndex,
                    viewDescriptor: viewDescriptorItem.viewDescriptor,
                    size: viewDescriptorItem.state.size,
                    collapsed: !!viewDescriptorItem.state.collapsed,
                });
            }
        }
        this.broadCastAddedVisibleViewDescriptors(addedVisibleDescriptors);
    }
    remove(viewDescriptors) {
        const removed = [];
        const removedItems = [];
        const removedActiveDescriptors = [];
        const removedVisibleDescriptors = [];
        for (const viewDescriptor of viewDescriptors) {
            if (viewDescriptor.when) {
                for (const key of viewDescriptor.when.keys()) {
                    this.contextKeys.delete(key);
                }
            }
            const index = this.viewDescriptorItems.findIndex((i) => i.viewDescriptor.id === viewDescriptor.id);
            if (index !== -1) {
                removed.push(viewDescriptor);
                const viewDescriptorItem = this.viewDescriptorItems[index];
                if (viewDescriptorItem.state.active) {
                    removedActiveDescriptors.push(viewDescriptorItem.viewDescriptor);
                }
                if (this.isViewDescriptorVisible(viewDescriptorItem)) {
                    const { visibleIndex } = this.find(viewDescriptorItem.viewDescriptor.id);
                    removedVisibleDescriptors.push({
                        index: visibleIndex,
                        viewDescriptor: viewDescriptorItem.viewDescriptor,
                    });
                }
                removedItems.push(viewDescriptorItem);
            }
        }
        // update state
        removedItems.forEach((item) => this.viewDescriptorItems.splice(this.viewDescriptorItems.indexOf(item), 1));
        this.broadCastRemovedVisibleViewDescriptors(removedVisibleDescriptors);
        if (removedActiveDescriptors.length) {
            this._onDidChangeActiveViewDescriptors.fire({ added: [], removed: removedActiveDescriptors });
        }
        if (removed.length) {
            this._onDidChangeAllViewDescriptors.fire({ added: [], removed });
        }
    }
    onDidChangeContext() {
        const addedActiveItems = [];
        const removedActiveItems = [];
        for (const item of this.viewDescriptorItems) {
            const wasActive = item.state.active;
            const isActive = this.contextKeyService.contextMatchesRules(item.viewDescriptor.when);
            if (wasActive !== isActive) {
                if (isActive) {
                    addedActiveItems.push({
                        item,
                        visibleWhenActive: this.isViewDescriptorVisibleWhenActive(item),
                    });
                }
                else {
                    removedActiveItems.push(item);
                }
            }
        }
        const removedVisibleDescriptors = [];
        for (const item of removedActiveItems) {
            if (this.isViewDescriptorVisible(item)) {
                const { visibleIndex } = this.find(item.viewDescriptor.id);
                removedVisibleDescriptors.push({ index: visibleIndex, viewDescriptor: item.viewDescriptor });
            }
        }
        // Update the State
        removedActiveItems.forEach((item) => (item.state.active = false));
        addedActiveItems.forEach(({ item }) => (item.state.active = true));
        this.broadCastRemovedVisibleViewDescriptors(removedVisibleDescriptors);
        if (addedActiveItems.length || removedActiveItems.length) {
            this._onDidChangeActiveViewDescriptors.fire({
                added: addedActiveItems.map(({ item }) => item.viewDescriptor),
                removed: removedActiveItems.map((item) => item.viewDescriptor),
            });
        }
        const addedVisibleDescriptors = [];
        for (const { item, visibleWhenActive } of addedActiveItems) {
            if (visibleWhenActive && this.isViewDescriptorVisible(item)) {
                const { visibleIndex } = this.find(item.viewDescriptor.id);
                addedVisibleDescriptors.push({
                    index: visibleIndex,
                    viewDescriptor: item.viewDescriptor,
                    size: item.state.size,
                    collapsed: !!item.state.collapsed,
                });
            }
        }
        this.broadCastAddedVisibleViewDescriptors(addedVisibleDescriptors);
    }
    broadCastAddedVisibleViewDescriptors(added) {
        if (added.length) {
            this._onDidAddVisibleViewDescriptors.fire(added.sort((a, b) => a.index - b.index));
            this.updateState(`Added views:${added.map((v) => v.viewDescriptor.id).join(',')} in ${this.viewContainer.id}`);
        }
    }
    broadCastRemovedVisibleViewDescriptors(removed) {
        if (removed.length) {
            this._onDidRemoveVisibleViewDescriptors.fire(removed.sort((a, b) => b.index - a.index));
            this.updateState(`Removed views:${removed.map((v) => v.viewDescriptor.id).join(',')} from ${this.viewContainer.id}`);
        }
    }
    broadCastMovedViewDescriptors(from, to) {
        this._onDidMoveVisibleViewDescriptors.fire({ from, to });
        this.updateState(`Moved view ${from.viewDescriptor.id} to ${to.viewDescriptor.id} in ${this.viewContainer.id}`);
    }
    updateState(reason) {
        this.logger.value.info(reason);
        this.viewDescriptorsState.updateState(this.allViewDescriptors);
        this.updateContainerInfo();
    }
    isViewDescriptorVisible(viewDescriptorItem) {
        if (!viewDescriptorItem.state.active) {
            return false;
        }
        return this.isViewDescriptorVisibleWhenActive(viewDescriptorItem);
    }
    isViewDescriptorVisibleWhenActive(viewDescriptorItem) {
        if (viewDescriptorItem.viewDescriptor.workspace) {
            return !!viewDescriptorItem.state.visibleWorkspace;
        }
        return !!viewDescriptorItem.state.visibleGlobal;
    }
    find(id) {
        const result = this.findAndIgnoreIfNotFound(id);
        if (result) {
            return result;
        }
        throw new Error(`view descriptor ${id} not found`);
    }
    findAndIgnoreIfNotFound(id) {
        for (let i = 0, visibleIndex = 0; i < this.viewDescriptorItems.length; i++) {
            const viewDescriptorItem = this.viewDescriptorItems[i];
            if (viewDescriptorItem.viewDescriptor.id === id) {
                return { index: i, visibleIndex, viewDescriptorItem: viewDescriptorItem };
            }
            if (this.isViewDescriptorVisible(viewDescriptorItem)) {
                visibleIndex++;
            }
        }
        return undefined;
    }
    compareViewDescriptors(a, b) {
        if (a.viewDescriptor.id === b.viewDescriptor.id) {
            return 0;
        }
        return (this.getViewOrder(a) - this.getViewOrder(b) ||
            this.getGroupOrderResult(a.viewDescriptor, b.viewDescriptor));
    }
    getViewOrder(viewDescriptorItem) {
        const viewOrder = typeof viewDescriptorItem.state.order === 'number'
            ? viewDescriptorItem.state.order
            : viewDescriptorItem.viewDescriptor.order;
        return typeof viewOrder === 'number' ? viewOrder : Number.MAX_VALUE;
    }
    getGroupOrderResult(a, b) {
        if (!a.group || !b.group) {
            return 0;
        }
        if (a.group === b.group) {
            return 0;
        }
        return a.group < b.group ? -1 : 1;
    }
};
ViewContainerModel = __decorate([
    __param(1, IInstantiationService),
    __param(2, IContextKeyService),
    __param(3, ILoggerService)
], ViewContainerModel);
export { ViewContainerModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRhaW5lck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdmlld3MvY29tbW9uL3ZpZXdDb250YWluZXJNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBSU4sVUFBVSxJQUFJLGNBQWMsRUFLNUIsZUFBZSxFQUNmLFlBQVksRUFDWixjQUFjLEdBQ2QsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBVyxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFB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