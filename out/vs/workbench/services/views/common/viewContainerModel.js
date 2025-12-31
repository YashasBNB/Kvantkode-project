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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRhaW5lck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ZpZXdzL2NvbW1vbi92aWV3Q29udGFpbmVyTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUlOLFVBQVUsSUFBSSxjQUFjLEVBSzVCLGVBQWUsRUFDZixZQUFZLEVBQ1osY0FBYyxHQUNkLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFB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