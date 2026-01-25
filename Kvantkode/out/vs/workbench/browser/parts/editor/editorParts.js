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
var EditorParts_1;
import { localize } from '../../../../nls.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableMap, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { MainEditorPart } from './editorPart.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { distinct } from '../../../../base/common/arrays.js';
import { AuxiliaryEditorPart } from './auxiliaryEditorPart.js';
import { MultiWindowParts } from '../../part.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IAuxiliaryWindowService, } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { isHTMLElement } from '../../../../base/browser/dom.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let EditorParts = class EditorParts extends MultiWindowParts {
    static { EditorParts_1 = this; }
    constructor(instantiationService, storageService, themeService, auxiliaryWindowService, contextKeyService) {
        super('workbench.editorParts', themeService, storageService);
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.contextKeyService = contextKeyService;
        //#region Scoped Instantiation Services
        this.mapPartToInstantiationService = new Map();
        //#endregion
        //#region Auxiliary Editor Parts
        this._onDidCreateAuxiliaryEditorPart = this._register(new Emitter());
        this.onDidCreateAuxiliaryEditorPart = this._onDidCreateAuxiliaryEditorPart.event;
        this.workspaceMemento = this.getMemento(1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
        this._isReady = false;
        this.whenReadyPromise = new DeferredPromise();
        this.whenReady = this.whenReadyPromise.p;
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this.editorWorkingSets = (() => {
            const workingSetsRaw = this.storageService.get(EditorParts_1.EDITOR_WORKING_SETS_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (workingSetsRaw) {
                return JSON.parse(workingSetsRaw);
            }
            return [];
        })();
        //#endregion
        //#region Events
        this._onDidActiveGroupChange = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidActiveGroupChange.event;
        this._onDidAddGroup = this._register(new Emitter());
        this.onDidAddGroup = this._onDidAddGroup.event;
        this._onDidRemoveGroup = this._register(new Emitter());
        this.onDidRemoveGroup = this._onDidRemoveGroup.event;
        this._onDidMoveGroup = this._register(new Emitter());
        this.onDidMoveGroup = this._onDidMoveGroup.event;
        this._onDidActivateGroup = this._register(new Emitter());
        this.onDidActivateGroup = this._onDidActivateGroup.event;
        this._onDidChangeGroupIndex = this._register(new Emitter());
        this.onDidChangeGroupIndex = this._onDidChangeGroupIndex.event;
        this._onDidChangeGroupLocked = this._register(new Emitter());
        this.onDidChangeGroupLocked = this._onDidChangeGroupLocked.event;
        this._onDidChangeGroupMaximized = this._register(new Emitter());
        this.onDidChangeGroupMaximized = this._onDidChangeGroupMaximized.event;
        //#endregion
        //#region Editor Group Context Key Handling
        this.globalContextKeys = new Map();
        this.scopedContextKeys = new Map();
        this.contextKeyProviders = new Map();
        this.registeredContextKeys = new Map();
        this.contextKeyProviderDisposables = this._register(new DisposableMap());
        this.mainPart = this._register(this.createMainEditorPart());
        this._register(this.registerPart(this.mainPart));
        this.mostRecentActiveParts = [this.mainPart];
        this.restoreParts();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.onDidChangeMementoValue(1 /* StorageScope.WORKSPACE */, this._store)((e) => this.onDidChangeMementoState(e)));
        this.whenReady.then(() => this.registerGroupsContextKeyListeners());
    }
    createMainEditorPart() {
        return this.instantiationService.createInstance(MainEditorPart, this);
    }
    getScopedInstantiationService(part) {
        if (part === this.mainPart) {
            if (!this.mapPartToInstantiationService.has(part.windowId)) {
                this.instantiationService.invokeFunction((accessor) => {
                    const editorService = accessor.get(IEditorService); // using `invokeFunction` to get hold of `IEditorService` lazily
                    this.mapPartToInstantiationService.set(part.windowId, this._register(this.instantiationService.createChild(new ServiceCollection([
                        IEditorService,
                        editorService.createScoped('main', this._store),
                    ]))));
                });
            }
        }
        return this.mapPartToInstantiationService.get(part.windowId) ?? this.instantiationService;
    }
    async createAuxiliaryEditorPart(options) {
        const { part, instantiationService, disposables } = await this.instantiationService
            .createInstance(AuxiliaryEditorPart, this)
            .create(this.getGroupsLabel(this._parts.size), options);
        // Keep instantiation service
        this.mapPartToInstantiationService.set(part.windowId, instantiationService);
        disposables.add(toDisposable(() => this.mapPartToInstantiationService.delete(part.windowId)));
        // Events
        this._onDidAddGroup.fire(part.activeGroup);
        this._onDidCreateAuxiliaryEditorPart.fire(part);
        return part;
    }
    //#endregion
    //#region Registration
    registerPart(part) {
        const disposables = this._register(new DisposableStore());
        disposables.add(super.registerPart(part));
        this.registerEditorPartListeners(part, disposables);
        return disposables;
    }
    unregisterPart(part) {
        super.unregisterPart(part);
        // Notify all parts about a groups label change
        // given it is computed based on the index
        this.parts.forEach((part, index) => {
            if (part === this.mainPart) {
                return;
            }
            part.notifyGroupsLabelChange(this.getGroupsLabel(index));
        });
    }
    registerEditorPartListeners(part, disposables) {
        disposables.add(part.onDidFocus(() => {
            this.doUpdateMostRecentActive(part, true);
            if (this._parts.size > 1) {
                this._onDidActiveGroupChange.fire(this.activeGroup); // this can only happen when we have more than 1 editor part
            }
        }));
        disposables.add(toDisposable(() => this.doUpdateMostRecentActive(part)));
        disposables.add(part.onDidChangeActiveGroup((group) => this._onDidActiveGroupChange.fire(group)));
        disposables.add(part.onDidAddGroup((group) => this._onDidAddGroup.fire(group)));
        disposables.add(part.onDidRemoveGroup((group) => this._onDidRemoveGroup.fire(group)));
        disposables.add(part.onDidMoveGroup((group) => this._onDidMoveGroup.fire(group)));
        disposables.add(part.onDidActivateGroup((group) => this._onDidActivateGroup.fire(group)));
        disposables.add(part.onDidChangeGroupMaximized((maximized) => this._onDidChangeGroupMaximized.fire(maximized)));
        disposables.add(part.onDidChangeGroupIndex((group) => this._onDidChangeGroupIndex.fire(group)));
        disposables.add(part.onDidChangeGroupLocked((group) => this._onDidChangeGroupLocked.fire(group)));
    }
    doUpdateMostRecentActive(part, makeMostRecentlyActive) {
        const index = this.mostRecentActiveParts.indexOf(part);
        // Remove from MRU list
        if (index !== -1) {
            this.mostRecentActiveParts.splice(index, 1);
        }
        // Add to front as needed
        if (makeMostRecentlyActive) {
            this.mostRecentActiveParts.unshift(part);
        }
    }
    getGroupsLabel(index) {
        return localize('groupLabel', 'Window {0}', index + 1);
    }
    getPart(groupOrElement) {
        if (this._parts.size > 1) {
            if (isHTMLElement(groupOrElement)) {
                const element = groupOrElement;
                return this.getPartByDocument(element.ownerDocument);
            }
            else {
                const group = groupOrElement;
                let id;
                if (typeof group === 'number') {
                    id = group;
                }
                else {
                    id = group.id;
                }
                for (const part of this._parts) {
                    if (part.hasGroup(id)) {
                        return part;
                    }
                }
            }
        }
        return this.mainPart;
    }
    //#endregion
    //#region Lifecycle / State
    static { this.EDITOR_PARTS_UI_STATE_STORAGE_KEY = 'editorparts.state'; }
    get isReady() {
        return this._isReady;
    }
    async restoreParts() {
        // Join on the main part being ready to pick
        // the right moment to begin restoring.
        // The main part is automatically being created
        // as part of the overall startup process.
        await this.mainPart.whenReady;
        // Only attempt to restore auxiliary editor parts
        // when the main part did restore. It is possible
        // that restoring was not attempted because specific
        // editors were opened.
        if (this.mainPart.willRestoreState) {
            const state = this.loadState();
            if (state) {
                await this.restoreState(state);
            }
        }
        const mostRecentActivePart = this.mostRecentActiveParts.at(0);
        mostRecentActivePart?.activeGroup.focus();
        this._isReady = true;
        this.whenReadyPromise.complete();
        // Await restored
        await Promise.allSettled(this.parts.map((part) => part.whenRestored));
        this.whenRestoredPromise.complete();
    }
    loadState() {
        return this.workspaceMemento[EditorParts_1.EDITOR_PARTS_UI_STATE_STORAGE_KEY];
    }
    saveState() {
        const state = this.createState();
        if (state.auxiliary.length === 0) {
            delete this.workspaceMemento[EditorParts_1.EDITOR_PARTS_UI_STATE_STORAGE_KEY];
        }
        else {
            this.workspaceMemento[EditorParts_1.EDITOR_PARTS_UI_STATE_STORAGE_KEY] = state;
        }
    }
    createState() {
        return {
            auxiliary: this.parts
                .filter((part) => part !== this.mainPart)
                .map((part) => {
                const auxiliaryWindow = this.auxiliaryWindowService.getWindow(part.windowId);
                return {
                    state: part.createState(),
                    ...auxiliaryWindow?.createState(),
                };
            }),
            mru: this.mostRecentActiveParts.map((part) => this.parts.indexOf(part)),
        };
    }
    async restoreState(state) {
        if (state.auxiliary.length) {
            const auxiliaryEditorPartPromises = [];
            // Create auxiliary editor parts
            for (const auxiliaryEditorPartState of state.auxiliary) {
                auxiliaryEditorPartPromises.push(this.createAuxiliaryEditorPart(auxiliaryEditorPartState));
            }
            // Await creation
            await Promise.allSettled(auxiliaryEditorPartPromises);
            // Update MRU list
            if (state.mru.length === this.parts.length) {
                this.mostRecentActiveParts = state.mru.map((index) => this.parts[index]);
            }
            else {
                this.mostRecentActiveParts = [...this.parts];
            }
            // Await ready
            await Promise.allSettled(this.parts.map((part) => part.whenReady));
        }
    }
    get hasRestorableState() {
        return this.parts.some((part) => part.hasRestorableState);
    }
    onDidChangeMementoState(e) {
        if (e.external && e.scope === 1 /* StorageScope.WORKSPACE */) {
            this.reloadMemento(e.scope);
            const state = this.loadState();
            if (state) {
                this.applyState(state);
            }
        }
    }
    async applyState(state) {
        // Before closing windows, try to close as many editors as
        // possible, but skip over those that would trigger a dialog
        // (for example when being dirty). This is to be able to have
        // them merge into the main part.
        for (const part of this.parts) {
            if (part === this.mainPart) {
                continue; // main part takes care on its own
            }
            for (const group of part.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                await group.closeAllEditors({ excludeConfirming: true });
            }
            const closed = part.close(); // will move remaining editors to main part
            if (!closed) {
                return false; // this indicates that closing was vetoed
            }
        }
        // Restore auxiliary state unless we are in an empty state
        if (state !== 'empty') {
            await this.restoreState(state);
        }
        return true;
    }
    //#endregion
    //#region Working Sets
    static { this.EDITOR_WORKING_SETS_STORAGE_KEY = 'editor.workingSets'; }
    saveWorkingSet(name) {
        const workingSet = {
            id: generateUuid(),
            name,
            main: this.mainPart.createState(),
            auxiliary: this.createState(),
        };
        this.editorWorkingSets.push(workingSet);
        this.saveWorkingSets();
        return {
            id: workingSet.id,
            name: workingSet.name,
        };
    }
    getWorkingSets() {
        return this.editorWorkingSets.map((workingSet) => ({
            id: workingSet.id,
            name: workingSet.name,
        }));
    }
    deleteWorkingSet(workingSet) {
        const index = this.indexOfWorkingSet(workingSet);
        if (typeof index === 'number') {
            this.editorWorkingSets.splice(index, 1);
            this.saveWorkingSets();
        }
    }
    async applyWorkingSet(workingSet, options) {
        let workingSetState;
        if (workingSet === 'empty') {
            workingSetState = 'empty';
        }
        else {
            workingSetState = this.editorWorkingSets[this.indexOfWorkingSet(workingSet) ?? -1];
        }
        if (!workingSetState) {
            return false;
        }
        // Apply state: begin with auxiliary windows first because it helps to keep
        // editors around that need confirmation by moving them into the main part.
        // Also, in rare cases, the auxiliary part may not be able to apply the state
        // for certain editors that cannot move to the main part.
        const applied = await this.applyState(workingSetState === 'empty' ? workingSetState : workingSetState.auxiliary);
        if (!applied) {
            return false;
        }
        await this.mainPart.applyState(workingSetState === 'empty' ? workingSetState : workingSetState.main, options);
        // Restore Focus unless instructed otherwise
        if (!options?.preserveFocus) {
            const mostRecentActivePart = this.mostRecentActiveParts.at(0);
            if (mostRecentActivePart) {
                await mostRecentActivePart.whenReady;
                mostRecentActivePart.activeGroup.focus();
            }
        }
        return true;
    }
    indexOfWorkingSet(workingSet) {
        for (let i = 0; i < this.editorWorkingSets.length; i++) {
            if (this.editorWorkingSets[i].id === workingSet.id) {
                return i;
            }
        }
        return undefined;
    }
    saveWorkingSets() {
        this.storageService.store(EditorParts_1.EDITOR_WORKING_SETS_STORAGE_KEY, JSON.stringify(this.editorWorkingSets), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    //#endregion
    //#region Group Management
    get activeGroup() {
        return this.activePart.activeGroup;
    }
    get sideGroup() {
        return this.activePart.sideGroup;
    }
    get groups() {
        return this.getGroups();
    }
    get count() {
        return this.groups.length;
    }
    getGroups(order = 0 /* GroupsOrder.CREATION_TIME */) {
        if (this._parts.size > 1) {
            let parts;
            switch (order) {
                case 2 /* GroupsOrder.GRID_APPEARANCE */: // we currently do not have a way to compute by appearance over multiple windows
                case 0 /* GroupsOrder.CREATION_TIME */:
                    parts = this.parts;
                    break;
                case 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */:
                    parts = distinct([...this.mostRecentActiveParts, ...this.parts]); // always ensure all parts are included
                    break;
            }
            return parts.map((part) => part.getGroups(order)).flat();
        }
        return this.mainPart.getGroups(order);
    }
    getGroup(identifier) {
        if (this._parts.size > 1) {
            for (const part of this._parts) {
                const group = part.getGroup(identifier);
                if (group) {
                    return group;
                }
            }
        }
        return this.mainPart.getGroup(identifier);
    }
    assertGroupView(group) {
        let groupView;
        if (typeof group === 'number') {
            groupView = this.getGroup(group);
        }
        else {
            groupView = group;
        }
        if (!groupView) {
            throw new Error('Invalid editor group provided!');
        }
        return groupView;
    }
    activateGroup(group) {
        return this.getPart(group).activateGroup(group);
    }
    getSize(group) {
        return this.getPart(group).getSize(group);
    }
    setSize(group, size) {
        this.getPart(group).setSize(group, size);
    }
    arrangeGroups(arrangement, group = this.activePart.activeGroup) {
        this.getPart(group).arrangeGroups(arrangement, group);
    }
    toggleMaximizeGroup(group = this.activePart.activeGroup) {
        this.getPart(group).toggleMaximizeGroup(group);
    }
    toggleExpandGroup(group = this.activePart.activeGroup) {
        this.getPart(group).toggleExpandGroup(group);
    }
    restoreGroup(group) {
        return this.getPart(group).restoreGroup(group);
    }
    applyLayout(layout) {
        this.activePart.applyLayout(layout);
    }
    getLayout() {
        return this.activePart.getLayout();
    }
    get orientation() {
        return this.activePart.orientation;
    }
    setGroupOrientation(orientation) {
        this.activePart.setGroupOrientation(orientation);
    }
    findGroup(scope, source = this.activeGroup, wrap) {
        const sourcePart = this.getPart(source);
        if (this._parts.size > 1) {
            const groups = this.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */);
            // Ensure that FIRST/LAST dispatches globally over all parts
            if (scope.location === 0 /* GroupLocation.FIRST */ || scope.location === 1 /* GroupLocation.LAST */) {
                return scope.location === 0 /* GroupLocation.FIRST */ ? groups[0] : groups[groups.length - 1];
            }
            // Try to find in target part first without wrapping
            const group = sourcePart.findGroup(scope, source, false);
            if (group) {
                return group;
            }
            // Ensure that NEXT/PREVIOUS dispatches globally over all parts
            if (scope.location === 2 /* GroupLocation.NEXT */ || scope.location === 3 /* GroupLocation.PREVIOUS */) {
                const sourceGroup = this.assertGroupView(source);
                const index = groups.indexOf(sourceGroup);
                if (scope.location === 2 /* GroupLocation.NEXT */) {
                    let nextGroup = groups[index + 1];
                    if (!nextGroup && wrap) {
                        nextGroup = groups[0];
                    }
                    return nextGroup;
                }
                else {
                    let previousGroup = groups[index - 1];
                    if (!previousGroup && wrap) {
                        previousGroup = groups[groups.length - 1];
                    }
                    return previousGroup;
                }
            }
        }
        return sourcePart.findGroup(scope, source, wrap);
    }
    addGroup(location, direction) {
        return this.getPart(location).addGroup(location, direction);
    }
    removeGroup(group) {
        this.getPart(group).removeGroup(group);
    }
    moveGroup(group, location, direction) {
        return this.getPart(group).moveGroup(group, location, direction);
    }
    mergeGroup(group, target, options) {
        return this.getPart(group).mergeGroup(group, target, options);
    }
    mergeAllGroups(target, options) {
        return this.activePart.mergeAllGroups(target, options);
    }
    copyGroup(group, location, direction) {
        return this.getPart(group).copyGroup(group, location, direction);
    }
    createEditorDropTarget(container, delegate) {
        return this.getPart(container).createEditorDropTarget(container, delegate);
    }
    registerGroupsContextKeyListeners() {
        this._register(this.onDidChangeActiveGroup(() => this.updateGlobalContextKeys()));
        this.groups.forEach((group) => this.registerGroupContextKeyProvidersListeners(group));
        this._register(this.onDidAddGroup((group) => this.registerGroupContextKeyProvidersListeners(group)));
        this._register(this.onDidRemoveGroup((group) => {
            this.scopedContextKeys.delete(group.id);
            this.registeredContextKeys.delete(group.id);
            this.contextKeyProviderDisposables.deleteAndDispose(group.id);
        }));
    }
    updateGlobalContextKeys() {
        const activeGroupScopedContextKeys = this.scopedContextKeys.get(this.activeGroup.id);
        if (!activeGroupScopedContextKeys) {
            return;
        }
        for (const [key, globalContextKey] of this.globalContextKeys) {
            const scopedContextKey = activeGroupScopedContextKeys.get(key);
            if (scopedContextKey) {
                globalContextKey.set(scopedContextKey.get());
            }
            else {
                globalContextKey.reset();
            }
        }
    }
    bind(contextKey, group) {
        // Ensure we only bind to the same context key once globaly
        let globalContextKey = this.globalContextKeys.get(contextKey.key);
        if (!globalContextKey) {
            globalContextKey = contextKey.bindTo(this.contextKeyService);
            this.globalContextKeys.set(contextKey.key, globalContextKey);
        }
        // Ensure we only bind to the same context key once per group
        let groupScopedContextKeys = this.scopedContextKeys.get(group.id);
        if (!groupScopedContextKeys) {
            groupScopedContextKeys = new Map();
            this.scopedContextKeys.set(group.id, groupScopedContextKeys);
        }
        let scopedContextKey = groupScopedContextKeys.get(contextKey.key);
        if (!scopedContextKey) {
            scopedContextKey = contextKey.bindTo(group.scopedContextKeyService);
            groupScopedContextKeys.set(contextKey.key, scopedContextKey);
        }
        const that = this;
        return {
            get() {
                return scopedContextKey.get();
            },
            set(value) {
                if (that.activeGroup === group) {
                    globalContextKey.set(value);
                }
                scopedContextKey.set(value);
            },
            reset() {
                if (that.activeGroup === group) {
                    globalContextKey.reset();
                }
                scopedContextKey.reset();
            },
        };
    }
    registerContextKeyProvider(provider) {
        if (this.contextKeyProviders.has(provider.contextKey.key) ||
            this.globalContextKeys.has(provider.contextKey.key)) {
            throw new Error(`A context key provider for key ${provider.contextKey.key} already exists.`);
        }
        this.contextKeyProviders.set(provider.contextKey.key, provider);
        const setContextKeyForGroups = () => {
            for (const group of this.groups) {
                this.updateRegisteredContextKey(group, provider);
            }
        };
        // Run initially and on change
        setContextKeyForGroups();
        const onDidChange = provider.onDidChange?.(() => setContextKeyForGroups());
        return toDisposable(() => {
            onDidChange?.dispose();
            this.globalContextKeys.delete(provider.contextKey.key);
            this.scopedContextKeys.forEach((scopedContextKeys) => scopedContextKeys.delete(provider.contextKey.key));
            this.contextKeyProviders.delete(provider.contextKey.key);
            this.registeredContextKeys.forEach((registeredContextKeys) => registeredContextKeys.delete(provider.contextKey.key));
        });
    }
    registerGroupContextKeyProvidersListeners(group) {
        // Update context keys from providers for the group when its active editor changes
        const disposable = group.onDidActiveEditorChange(() => {
            for (const contextKeyProvider of this.contextKeyProviders.values()) {
                this.updateRegisteredContextKey(group, contextKeyProvider);
            }
        });
        this.contextKeyProviderDisposables.set(group.id, disposable);
    }
    updateRegisteredContextKey(group, provider) {
        // Get the group scoped context keys for the provider
        // If the providers context key has not yet been bound
        // to the group, do so now.
        let groupRegisteredContextKeys = this.registeredContextKeys.get(group.id);
        if (!groupRegisteredContextKeys) {
            groupRegisteredContextKeys = new Map();
            this.registeredContextKeys.set(group.id, groupRegisteredContextKeys);
        }
        let scopedRegisteredContextKey = groupRegisteredContextKeys.get(provider.contextKey.key);
        if (!scopedRegisteredContextKey) {
            scopedRegisteredContextKey = this.bind(provider.contextKey, group);
            groupRegisteredContextKeys.set(provider.contextKey.key, scopedRegisteredContextKey);
        }
        // Set the context key value for the group context
        scopedRegisteredContextKey.set(provider.getGroupContextKeyValue(group));
    }
    //#endregion
    //#region Main Editor Part Only
    get partOptions() {
        return this.mainPart.partOptions;
    }
    get onDidChangeEditorPartOptions() {
        return this.mainPart.onDidChangeEditorPartOptions;
    }
};
EditorParts = EditorParts_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IStorageService),
    __param(2, IThemeService),
    __param(3, IAuxiliaryWindowService),
    __param(4, IContextKeyService)
], EditorParts);
export { EditorParts };
registerSingleton(IEditorGroupsService, EditorParts, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JQYXJ0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFVTixvQkFBb0IsR0FPcEIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLGFBQWEsRUFDYixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsT0FBTyxFQUFrQyxjQUFjLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUVoRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBbUMsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixlQUFlLEdBSWYsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxP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