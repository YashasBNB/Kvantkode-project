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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBVU4sb0JBQW9CLEdBT3BCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFDTixhQUFhLEVBQ2IsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFBa0MsY0FBYyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFaEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQW1DLE1BQU0sMEJBQTBCLENBQUE7QUFDL0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sZUFBZSxHQUlmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxF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