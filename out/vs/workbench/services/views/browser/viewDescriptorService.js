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
var ViewDescriptorService_1;
import { IViewDescriptorService, Extensions as ViewExtensions, ViewVisibilityState, defaultViewIcon, ViewContainerLocationToString, VIEWS_LOG_ID, VIEWS_LOG_NAME, } from '../../../common/views.js';
import { RawContextKey, IContextKeyService, ContextKeyExpr, } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { toDisposable, DisposableStore, Disposable, DisposableMap, } from '../../../../base/common/lifecycle.js';
import { ViewPaneContainer, ViewPaneContainerAction, ViewsSubMenu, } from '../../../browser/parts/views/viewPaneContainer.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { getViewsStateStorageId, ViewContainerModel } from '../common/viewContainerModel.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IViewsService } from '../common/viewsService.js';
import { windowLogGroup } from '../../log/common/logConstants.js';
function getViewContainerStorageId(viewContainerId) {
    return `${viewContainerId}.state`;
}
let ViewDescriptorService = class ViewDescriptorService extends Disposable {
    static { ViewDescriptorService_1 = this; }
    static { this.VIEWS_CUSTOMIZATIONS = 'views.customizations'; }
    static { this.COMMON_CONTAINER_ID_PREFIX = 'workbench.views.service'; }
    get viewContainers() {
        return this.viewContainersRegistry.all;
    }
    constructor(instantiationService, contextKeyService, storageService, extensionService, telemetryService, loggerService) {
        super();
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.telemetryService = telemetryService;
        this._onDidChangeContainer = this._register(new Emitter());
        this.onDidChangeContainer = this._onDidChangeContainer.event;
        this._onDidChangeLocation = this._register(new Emitter());
        this.onDidChangeLocation = this._onDidChangeLocation.event;
        this._onDidChangeContainerLocation = this._register(new Emitter());
        this.onDidChangeContainerLocation = this._onDidChangeContainerLocation.event;
        this.viewContainerModels = this._register(new DisposableMap());
        this.viewsVisibilityActionDisposables = this._register(new DisposableMap());
        this.canRegisterViewsVisibilityActions = false;
        this._onDidChangeViewContainers = this._register(new Emitter());
        this.onDidChangeViewContainers = this._onDidChangeViewContainers.event;
        this.logger = new Lazy(() => loggerService.createLogger(VIEWS_LOG_ID, { name: VIEWS_LOG_NAME, group: windowLogGroup }));
        this.activeViewContextKeys = new Map();
        this.movableViewContextKeys = new Map();
        this.defaultViewLocationContextKeys = new Map();
        this.defaultViewContainerLocationContextKeys = new Map();
        this.viewContainersRegistry = Registry.as(ViewExtensions.ViewContainersRegistry);
        this.viewsRegistry = Registry.as(ViewExtensions.ViewsRegistry);
        this.migrateToViewsCustomizationsStorage();
        this.viewContainersCustomLocations = new Map(Object.entries(this.viewCustomizations.viewContainerLocations));
        this.viewDescriptorsCustomLocations = new Map(Object.entries(this.viewCustomizations.viewLocations));
        this.viewContainerBadgeEnablementStates = new Map(Object.entries(this.viewCustomizations.viewContainerBadgeEnablementStates));
        // Register all containers that were registered before this ctor
        this.viewContainers.forEach((viewContainer) => this.onDidRegisterViewContainer(viewContainer));
        this._register(this.viewsRegistry.onViewsRegistered((views) => this.onDidRegisterViews(views)));
        this._register(this.viewsRegistry.onViewsDeregistered(({ views, viewContainer }) => this.onDidDeregisterViews(views, viewContainer)));
        this._register(this.viewsRegistry.onDidChangeContainer(({ views, from, to }) => this.onDidChangeDefaultContainer(views, from, to)));
        this._register(this.viewContainersRegistry.onDidRegister(({ viewContainer }) => {
            this.onDidRegisterViewContainer(viewContainer);
            this._onDidChangeViewContainers.fire({
                added: [
                    { container: viewContainer, location: this.getViewContainerLocation(viewContainer) },
                ],
                removed: [],
            });
        }));
        this._register(this.viewContainersRegistry.onDidDeregister(({ viewContainer, viewContainerLocation }) => {
            this.onDidDeregisterViewContainer(viewContainer);
            this._onDidChangeViewContainers.fire({
                removed: [{ container: viewContainer, location: viewContainerLocation }],
                added: [],
            });
        }));
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, this._store)(() => this.onDidStorageChange()));
        this.extensionService
            .whenInstalledExtensionsRegistered()
            .then(() => this.whenExtensionsRegistered());
    }
    migrateToViewsCustomizationsStorage() {
        if (this.storageService.get(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, 0 /* StorageScope.PROFILE */)) {
            return;
        }
        const viewContainerLocationsValue = this.storageService.get('views.cachedViewContainerLocations', 0 /* StorageScope.PROFILE */);
        const viewDescriptorLocationsValue = this.storageService.get('views.cachedViewPositions', 0 /* StorageScope.PROFILE */);
        if (!viewContainerLocationsValue && !viewDescriptorLocationsValue) {
            return;
        }
        const viewContainerLocations = viewContainerLocationsValue
            ? JSON.parse(viewContainerLocationsValue)
            : [];
        const viewDescriptorLocations = viewDescriptorLocationsValue ? JSON.parse(viewDescriptorLocationsValue) : [];
        const viewsCustomizations = {
            viewContainerLocations: viewContainerLocations.reduce((result, [id, location]) => {
                result[id] = location;
                return result;
            }, {}),
            viewLocations: viewDescriptorLocations.reduce((result, [id, { containerId }]) => {
                result[id] = containerId;
                return result;
            }, {}),
            viewContainerBadgeEnablementStates: {},
        };
        this.storageService.store(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, JSON.stringify(viewsCustomizations), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.storageService.remove('views.cachedViewContainerLocations', 0 /* StorageScope.PROFILE */);
        this.storageService.remove('views.cachedViewPositions', 0 /* StorageScope.PROFILE */);
    }
    registerGroupedViews(groupedViews) {
        for (const [containerId, views] of groupedViews.entries()) {
            const viewContainer = this.viewContainersRegistry.get(containerId);
            // The container has not been registered yet
            if (!viewContainer || !this.viewContainerModels.has(viewContainer)) {
                // Register if the container is a genarated container
                if (this.isGeneratedContainerId(containerId)) {
                    const viewContainerLocation = this.viewContainersCustomLocations.get(containerId);
                    if (viewContainerLocation !== undefined) {
                        this.registerGeneratedViewContainer(viewContainerLocation, containerId);
                    }
                }
                // Registration of the container handles registration of its views
                continue;
            }
            // Filter out views that have already been added to the view container model
            // This is needed when statically-registered views are moved to
            // other statically registered containers as they will both try to add on startup
            const viewsToAdd = views.filter((view) => this.getViewContainerModel(viewContainer).allViewDescriptors.filter((vd) => vd.id === view.id).length === 0);
            this.addViews(viewContainer, viewsToAdd);
        }
    }
    deregisterGroupedViews(groupedViews) {
        for (const [viewContainerId, views] of groupedViews.entries()) {
            const viewContainer = this.viewContainersRegistry.get(viewContainerId);
            // The container has not been registered yet
            if (!viewContainer || !this.viewContainerModels.has(viewContainer)) {
                continue;
            }
            this.removeViews(viewContainer, views);
        }
    }
    moveOrphanViewsToDefaultLocation() {
        for (const [viewId, containerId] of this.viewDescriptorsCustomLocations.entries()) {
            // check if the view container exists
            if (this.viewContainersRegistry.get(containerId)) {
                continue;
            }
            // check if view has been registered to default location
            const viewContainer = this.viewsRegistry.getViewContainer(viewId);
            const viewDescriptor = this.getViewDescriptorById(viewId);
            if (viewContainer && viewDescriptor) {
                this.addViews(viewContainer, [viewDescriptor]);
            }
        }
    }
    whenExtensionsRegistered() {
        // Handle those views whose custom parent view container does not exist anymore
        // May be the extension contributing this view container is no longer installed
        // Or the parent view container is generated and no longer available.
        this.moveOrphanViewsToDefaultLocation();
        // Clean up empty generated view containers
        for (const viewContainerId of [...this.viewContainersCustomLocations.keys()]) {
            this.cleanUpGeneratedViewContainer(viewContainerId);
        }
        // Save updated view customizations after cleanup
        this.saveViewCustomizations();
        // Register visibility actions for all views
        for (const [key, value] of this.viewContainerModels) {
            this.registerViewsVisibilityActions(key, value);
        }
        this.canRegisterViewsVisibilityActions = true;
    }
    onDidRegisterViews(views) {
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach(({ views, viewContainer }) => {
                // When views are registered, we need to regroup them based on the customizations
                const regroupedViews = this.regroupViews(viewContainer.id, views);
                // Once they are grouped, try registering them which occurs
                // if the container has already been registered within this service
                // or we can generate the container from the source view id
                this.registerGroupedViews(regroupedViews);
                views.forEach((viewDescriptor) => this.getOrCreateMovableViewContextKey(viewDescriptor).set(!!viewDescriptor.canMoveView));
            });
        });
    }
    isGeneratedContainerId(id) {
        return id.startsWith(ViewDescriptorService_1.COMMON_CONTAINER_ID_PREFIX);
    }
    onDidDeregisterViews(views, viewContainer) {
        // When views are registered, we need to regroup them based on the customizations
        const regroupedViews = this.regroupViews(viewContainer.id, views);
        this.deregisterGroupedViews(regroupedViews);
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach((viewDescriptor) => this.getOrCreateMovableViewContextKey(viewDescriptor).set(false));
        });
    }
    regroupViews(containerId, views) {
        const viewsByContainer = new Map();
        for (const viewDescriptor of views) {
            const correctContainerId = this.viewDescriptorsCustomLocations.get(viewDescriptor.id) ?? containerId;
            let containerViews = viewsByContainer.get(correctContainerId);
            if (!containerViews) {
                viewsByContainer.set(correctContainerId, (containerViews = []));
            }
            containerViews.push(viewDescriptor);
        }
        return viewsByContainer;
    }
    getViewDescriptorById(viewId) {
        return this.viewsRegistry.getView(viewId);
    }
    getViewLocationById(viewId) {
        const container = this.getViewContainerByViewId(viewId);
        if (container === null) {
            return null;
        }
        return this.getViewContainerLocation(container);
    }
    getViewContainerByViewId(viewId) {
        const containerId = this.viewDescriptorsCustomLocations.get(viewId);
        return containerId
            ? (this.viewContainersRegistry.get(containerId) ?? null)
            : this.getDefaultContainerById(viewId);
    }
    getViewContainerLocation(viewContainer) {
        return (this.viewContainersCustomLocations.get(viewContainer.id) ??
            this.getDefaultViewContainerLocation(viewContainer));
    }
    getDefaultViewContainerLocation(viewContainer) {
        return this.viewContainersRegistry.getViewContainerLocation(viewContainer);
    }
    getDefaultContainerById(viewId) {
        return this.viewsRegistry.getViewContainer(viewId) ?? null;
    }
    getViewContainerModel(container) {
        return this.getOrRegisterViewContainerModel(container);
    }
    getViewContainerById(id) {
        return this.viewContainersRegistry.get(id) || null;
    }
    getViewContainersByLocation(location) {
        return this.viewContainers.filter((v) => this.getViewContainerLocation(v) === location);
    }
    getDefaultViewContainer(location) {
        return this.viewContainersRegistry.getDefaultViewContainer(location);
    }
    moveViewContainerToLocation(viewContainer, location, requestedIndex, reason) {
        this.logger.value.info(`moveViewContainerToLocation: viewContainer:${viewContainer.id} location:${location} reason:${reason}`);
        this.moveViewContainerToLocationWithoutSaving(viewContainer, location, requestedIndex);
        this.saveViewCustomizations();
    }
    getViewContainerBadgeEnablementState(id) {
        return this.viewContainerBadgeEnablementStates.get(id) ?? true;
    }
    setViewContainerBadgeEnablementState(id, badgesEnabled) {
        this.viewContainerBadgeEnablementStates.set(id, badgesEnabled);
        this.saveViewCustomizations();
    }
    moveViewToLocation(view, location, reason) {
        this.logger.value.info(`moveViewToLocation: view:${view.id} location:${location} reason:${reason}`);
        const container = this.registerGeneratedViewContainer(location);
        this.moveViewsToContainer([view], container);
    }
    moveViewsToContainer(views, viewContainer, visibilityState, reason) {
        if (!views.length) {
            return;
        }
        this.logger.value.info(`moveViewsToContainer: views:${views.map((view) => view.id).join(',')} viewContainer:${viewContainer.id} reason:${reason}`);
        const from = this.getViewContainerByViewId(views[0].id);
        const to = viewContainer;
        if (from && to && from !== to) {
            // Move views
            this.moveViewsWithoutSaving(views, from, to, visibilityState);
            this.cleanUpGeneratedViewContainer(from.id);
            // Save new locations
            this.saveViewCustomizations();
            // Log to telemetry
            this.reportMovedViews(views, from, to);
        }
    }
    reset() {
        for (const viewContainer of this.viewContainers) {
            const viewContainerModel = this.getViewContainerModel(viewContainer);
            for (const viewDescriptor of viewContainerModel.allViewDescriptors) {
                const defaultContainer = this.getDefaultContainerById(viewDescriptor.id);
                const currentContainer = this.getViewContainerByViewId(viewDescriptor.id);
                if (currentContainer && defaultContainer && currentContainer !== defaultContainer) {
                    this.moveViewsWithoutSaving([viewDescriptor], currentContainer, defaultContainer);
                }
            }
            const defaultContainerLocation = this.getDefaultViewContainerLocation(viewContainer);
            const currentContainerLocation = this.getViewContainerLocation(viewContainer);
            if (defaultContainerLocation !== null &&
                currentContainerLocation !== defaultContainerLocation) {
                this.moveViewContainerToLocationWithoutSaving(viewContainer, defaultContainerLocation);
            }
            this.cleanUpGeneratedViewContainer(viewContainer.id);
        }
        this.viewContainersCustomLocations.clear();
        this.viewDescriptorsCustomLocations.clear();
        this.saveViewCustomizations();
    }
    isViewContainerRemovedPermanently(viewContainerId) {
        return (this.isGeneratedContainerId(viewContainerId) &&
            !this.viewContainersCustomLocations.has(viewContainerId));
    }
    onDidChangeDefaultContainer(views, from, to) {
        const viewsToMove = views.filter((view) => !this.viewDescriptorsCustomLocations.has(view.id) || // Move views which are not already moved
            (!this.viewContainers.includes(from) &&
                this.viewDescriptorsCustomLocations.get(view.id) === from.id));
        if (viewsToMove.length) {
            this.moveViewsWithoutSaving(viewsToMove, from, to);
        }
    }
    reportMovedViews(views, from, to) {
        const containerToString = (container) => {
            if (container.id.startsWith(ViewDescriptorService_1.COMMON_CONTAINER_ID_PREFIX)) {
                return 'custom';
            }
            if (!container.extensionId) {
                return container.id;
            }
            return 'extension';
        };
        const oldLocation = this.getViewContainerLocation(from);
        const newLocation = this.getViewContainerLocation(to);
        const viewCount = views.length;
        const fromContainer = containerToString(from);
        const toContainer = containerToString(to);
        const fromLocation = oldLocation === 1 /* ViewContainerLocation.Panel */ ? 'panel' : 'sidebar';
        const toLocation = newLocation === 1 /* ViewContainerLocation.Panel */ ? 'panel' : 'sidebar';
        this.telemetryService.publicLog2('viewDescriptorService.moveViews', {
            viewCount,
            fromContainer,
            toContainer,
            fromLocation,
            toLocation,
        });
    }
    moveViewsWithoutSaving(views, from, to, visibilityState = ViewVisibilityState.Expand) {
        this.removeViews(from, views);
        this.addViews(to, views, visibilityState);
        const oldLocation = this.getViewContainerLocation(from);
        const newLocation = this.getViewContainerLocation(to);
        if (oldLocation !== newLocation) {
            this._onDidChangeLocation.fire({ views, from: oldLocation, to: newLocation });
        }
        this._onDidChangeContainer.fire({ views, from, to });
    }
    moveViewContainerToLocationWithoutSaving(viewContainer, location, requestedIndex) {
        const from = this.getViewContainerLocation(viewContainer);
        const to = location;
        if (from !== to) {
            const isGeneratedViewContainer = this.isGeneratedContainerId(viewContainer.id);
            const isDefaultViewContainerLocation = to === this.getDefaultViewContainerLocation(viewContainer);
            if (isGeneratedViewContainer || !isDefaultViewContainerLocation) {
                this.viewContainersCustomLocations.set(viewContainer.id, to);
            }
            else {
                this.viewContainersCustomLocations.delete(viewContainer.id);
            }
            this.getOrCreateDefaultViewContainerLocationContextKey(viewContainer).set(isGeneratedViewContainer || isDefaultViewContainerLocation);
            viewContainer.requestedIndex = requestedIndex;
            this._onDidChangeContainerLocation.fire({ viewContainer, from, to });
            const views = this.getViewsByContainer(viewContainer);
            this._onDidChangeLocation.fire({ views, from, to });
        }
    }
    cleanUpGeneratedViewContainer(viewContainerId) {
        // Skip if container is not generated
        if (!this.isGeneratedContainerId(viewContainerId)) {
            return;
        }
        // Skip if container has views registered
        const viewContainer = this.getViewContainerById(viewContainerId);
        if (viewContainer && this.getViewContainerModel(viewContainer)?.allViewDescriptors.length) {
            return;
        }
        // Skip if container has moved views
        if ([...this.viewDescriptorsCustomLocations.values()].includes(viewContainerId)) {
            return;
        }
        // Deregister the container
        if (viewContainer) {
            this.viewContainersRegistry.deregisterViewContainer(viewContainer);
        }
        this.viewContainersCustomLocations.delete(viewContainerId);
        this.viewContainerBadgeEnablementStates.delete(viewContainerId);
        // Clean up caches of container
        this.storageService.remove(getViewsStateStorageId(viewContainer?.storageId || getViewContainerStorageId(viewContainerId)), 0 /* StorageScope.PROFILE */);
    }
    registerGeneratedViewContainer(location, existingId) {
        const id = existingId || this.generateContainerId(location);
        const container = this.viewContainersRegistry.registerViewContainer({
            id,
            ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
                id,
                { mergeViewWithContainerWhenSingleView: true },
            ]),
            title: { value: localize('user', 'User View Container'), original: 'User View Container' }, // having a placeholder title - this should not be shown anywhere
            icon: location === 0 /* ViewContainerLocation.Sidebar */ ? defaultViewIcon : undefined,
            storageId: getViewContainerStorageId(id),
            hideIfEmpty: true,
        }, location, { doNotRegisterOpenCommand: true });
        if (this.viewContainersCustomLocations.get(container.id) !== location) {
            this.viewContainersCustomLocations.set(container.id, location);
        }
        this.getOrCreateDefaultViewContainerLocationContextKey(container).set(true);
        return container;
    }
    onDidStorageChange() {
        if (JSON.stringify(this.viewCustomizations) !==
            this.getStoredViewCustomizationsValue() /* This checks if current window changed the value or not */) {
            this.onDidViewCustomizationsStorageChange();
        }
    }
    onDidViewCustomizationsStorageChange() {
        this._viewCustomizations = undefined;
        const newViewContainerCustomizations = new Map(Object.entries(this.viewCustomizations.viewContainerLocations));
        const newViewDescriptorCustomizations = new Map(Object.entries(this.viewCustomizations.viewLocations));
        const viewContainersToMove = [];
        const viewsToMove = [];
        for (const [containerId, location] of newViewContainerCustomizations.entries()) {
            const container = this.getViewContainerById(containerId);
            if (container) {
                if (location !== this.getViewContainerLocation(container)) {
                    viewContainersToMove.push([container, location]);
                }
            }
            // If the container is generated and not registered, we register it now
            else if (this.isGeneratedContainerId(containerId)) {
                this.registerGeneratedViewContainer(location, containerId);
            }
        }
        for (const viewContainer of this.viewContainers) {
            if (!newViewContainerCustomizations.has(viewContainer.id)) {
                const currentLocation = this.getViewContainerLocation(viewContainer);
                const defaultLocation = this.getDefaultViewContainerLocation(viewContainer);
                if (currentLocation !== defaultLocation) {
                    viewContainersToMove.push([viewContainer, defaultLocation]);
                }
            }
        }
        for (const [viewId, viewContainerId] of newViewDescriptorCustomizations.entries()) {
            const viewDescriptor = this.getViewDescriptorById(viewId);
            if (viewDescriptor) {
                const prevViewContainer = this.getViewContainerByViewId(viewId);
                const newViewContainer = this.viewContainersRegistry.get(viewContainerId);
                if (prevViewContainer && newViewContainer && newViewContainer !== prevViewContainer) {
                    viewsToMove.push({
                        views: [viewDescriptor],
                        from: prevViewContainer,
                        to: newViewContainer,
                    });
                }
            }
        }
        // If a value is not present in the cache, it must be reset to default
        for (const viewContainer of this.viewContainers) {
            const viewContainerModel = this.getViewContainerModel(viewContainer);
            for (const viewDescriptor of viewContainerModel.allViewDescriptors) {
                if (!newViewDescriptorCustomizations.has(viewDescriptor.id)) {
                    const currentContainer = this.getViewContainerByViewId(viewDescriptor.id);
                    const defaultContainer = this.getDefaultContainerById(viewDescriptor.id);
                    if (currentContainer && defaultContainer && currentContainer !== defaultContainer) {
                        viewsToMove.push({
                            views: [viewDescriptor],
                            from: currentContainer,
                            to: defaultContainer,
                        });
                    }
                }
            }
        }
        // Execute View Container Movements
        for (const [container, location] of viewContainersToMove) {
            this.moveViewContainerToLocationWithoutSaving(container, location);
        }
        // Execute View Movements
        for (const { views, from, to } of viewsToMove) {
            this.moveViewsWithoutSaving(views, from, to, ViewVisibilityState.Default);
        }
        this.viewContainersCustomLocations = newViewContainerCustomizations;
        this.viewDescriptorsCustomLocations = newViewDescriptorCustomizations;
    }
    // Generated Container Id Format
    // {Common Prefix}.{Location}.{Uniqueness Id}
    // Old Format (deprecated)
    // {Common Prefix}.{Uniqueness Id}.{Source View Id}
    generateContainerId(location) {
        return `${ViewDescriptorService_1.COMMON_CONTAINER_ID_PREFIX}.${ViewContainerLocationToString(location)}.${generateUuid()}`;
    }
    saveViewCustomizations() {
        const viewCustomizations = {
            viewContainerLocations: {},
            viewLocations: {},
            viewContainerBadgeEnablementStates: {},
        };
        for (const [containerId, location] of this.viewContainersCustomLocations) {
            const container = this.getViewContainerById(containerId);
            // Skip if the view container is not a generated container and in default location
            if (container &&
                !this.isGeneratedContainerId(containerId) &&
                location === this.getDefaultViewContainerLocation(container)) {
                continue;
            }
            viewCustomizations.viewContainerLocations[containerId] = location;
        }
        for (const [viewId, viewContainerId] of this.viewDescriptorsCustomLocations) {
            const viewContainer = this.getViewContainerById(viewContainerId);
            if (viewContainer) {
                const defaultContainer = this.getDefaultContainerById(viewId);
                // Skip if the view is at default location
                // https://github.com/microsoft/vscode/issues/90414
                if (defaultContainer?.id === viewContainer.id) {
                    continue;
                }
            }
            viewCustomizations.viewLocations[viewId] = viewContainerId;
        }
        // Loop through viewContainerBadgeEnablementStates and save only the ones that are disabled
        for (const [viewContainerId, badgeEnablementState] of this.viewContainerBadgeEnablementStates) {
            if (badgeEnablementState === false) {
                viewCustomizations.viewContainerBadgeEnablementStates[viewContainerId] =
                    badgeEnablementState;
            }
        }
        this.viewCustomizations = viewCustomizations;
    }
    get viewCustomizations() {
        if (!this._viewCustomizations) {
            this._viewCustomizations = JSON.parse(this.getStoredViewCustomizationsValue());
            this._viewCustomizations.viewContainerLocations =
                this._viewCustomizations.viewContainerLocations ?? {};
            this._viewCustomizations.viewLocations = this._viewCustomizations.viewLocations ?? {};
            this._viewCustomizations.viewContainerBadgeEnablementStates =
                this._viewCustomizations.viewContainerBadgeEnablementStates ?? {};
        }
        return this._viewCustomizations;
    }
    set viewCustomizations(viewCustomizations) {
        const value = JSON.stringify(viewCustomizations);
        if (JSON.stringify(this.viewCustomizations) !== value) {
            this._viewCustomizations = viewCustomizations;
            this.setStoredViewCustomizationsValue(value);
        }
    }
    getStoredViewCustomizationsValue() {
        return this.storageService.get(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, 0 /* StorageScope.PROFILE */, '{}');
    }
    setStoredViewCustomizationsValue(value) {
        this.storageService.store(ViewDescriptorService_1.VIEWS_CUSTOMIZATIONS, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    getViewsByContainer(viewContainer) {
        const result = this.viewsRegistry.getViews(viewContainer).filter((viewDescriptor) => {
            const viewDescriptorViewContainerId = this.viewDescriptorsCustomLocations.get(viewDescriptor.id) ?? viewContainer.id;
            return viewDescriptorViewContainerId === viewContainer.id;
        });
        for (const [viewId, viewContainerId] of this.viewDescriptorsCustomLocations.entries()) {
            if (viewContainerId !== viewContainer.id) {
                continue;
            }
            if (this.viewsRegistry.getViewContainer(viewId) === viewContainer) {
                continue;
            }
            const viewDescriptor = this.getViewDescriptorById(viewId);
            if (viewDescriptor) {
                result.push(viewDescriptor);
            }
        }
        return result;
    }
    onDidRegisterViewContainer(viewContainer) {
        const defaultLocation = this.isGeneratedContainerId(viewContainer.id)
            ? true
            : this.getViewContainerLocation(viewContainer) ===
                this.getDefaultViewContainerLocation(viewContainer);
        this.getOrCreateDefaultViewContainerLocationContextKey(viewContainer).set(defaultLocation);
        this.getOrRegisterViewContainerModel(viewContainer);
    }
    getOrRegisterViewContainerModel(viewContainer) {
        let viewContainerModel = this.viewContainerModels.get(viewContainer)?.viewContainerModel;
        if (!viewContainerModel) {
            const disposables = new DisposableStore();
            viewContainerModel = disposables.add(this.instantiationService.createInstance(ViewContainerModel, viewContainer));
            this.onDidChangeActiveViews({ added: viewContainerModel.activeViewDescriptors, removed: [] });
            viewContainerModel.onDidChangeActiveViewDescriptors((changed) => this.onDidChangeActiveViews(changed), this, disposables);
            this.onDidChangeVisibleViews({
                added: [...viewContainerModel.visibleViewDescriptors],
                removed: [],
            });
            viewContainerModel.onDidAddVisibleViewDescriptors((added) => this.onDidChangeVisibleViews({
                added: added.map(({ viewDescriptor }) => viewDescriptor),
                removed: [],
            }), this, disposables);
            viewContainerModel.onDidRemoveVisibleViewDescriptors((removed) => this.onDidChangeVisibleViews({
                added: [],
                removed: removed.map(({ viewDescriptor }) => viewDescriptor),
            }), this, disposables);
            disposables.add(toDisposable(() => this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer)));
            disposables.add(this.registerResetViewContainerAction(viewContainer));
            const value = {
                viewContainerModel: viewContainerModel,
                disposables,
                dispose: () => disposables.dispose(),
            };
            this.viewContainerModels.set(viewContainer, value);
            // Register all views that were statically registered to this container
            // Potentially, this is registering something that was handled by another container
            // addViews() handles this by filtering views that are already registered
            this.onDidRegisterViews([
                { views: this.viewsRegistry.getViews(viewContainer), viewContainer },
            ]);
            // Add views that were registered prior to this view container
            const viewsToRegister = this.getViewsByContainer(viewContainer).filter((view) => this.getDefaultContainerById(view.id) !== viewContainer);
            if (viewsToRegister.length) {
                this.addViews(viewContainer, viewsToRegister);
                this.contextKeyService.bufferChangeEvents(() => {
                    viewsToRegister.forEach((viewDescriptor) => this.getOrCreateMovableViewContextKey(viewDescriptor).set(!!viewDescriptor.canMoveView));
                });
            }
            if (this.canRegisterViewsVisibilityActions) {
                this.registerViewsVisibilityActions(viewContainer, value);
            }
        }
        return viewContainerModel;
    }
    onDidDeregisterViewContainer(viewContainer) {
        this.viewContainerModels.deleteAndDispose(viewContainer);
        this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer);
    }
    onDidChangeActiveViews({ added, removed, }) {
        this.contextKeyService.bufferChangeEvents(() => {
            added.forEach((viewDescriptor) => this.getOrCreateActiveViewContextKey(viewDescriptor).set(true));
            removed.forEach((viewDescriptor) => this.getOrCreateActiveViewContextKey(viewDescriptor).set(false));
        });
    }
    onDidChangeVisibleViews({ added, removed, }) {
        this.contextKeyService.bufferChangeEvents(() => {
            added.forEach((viewDescriptor) => this.getOrCreateVisibleViewContextKey(viewDescriptor).set(true));
            removed.forEach((viewDescriptor) => this.getOrCreateVisibleViewContextKey(viewDescriptor).set(false));
        });
    }
    registerViewsVisibilityActions(viewContainer, { viewContainerModel, disposables, }) {
        this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer);
        this.viewsVisibilityActionDisposables.set(viewContainer, this.registerViewsVisibilityActionsForContainer(viewContainerModel));
        disposables.add(Event.any(viewContainerModel.onDidChangeActiveViewDescriptors, viewContainerModel.onDidAddVisibleViewDescriptors, viewContainerModel.onDidRemoveVisibleViewDescriptors, viewContainerModel.onDidMoveVisibleViewDescriptors)((e) => {
            this.viewsVisibilityActionDisposables.deleteAndDispose(viewContainer);
            this.viewsVisibilityActionDisposables.set(viewContainer, this.registerViewsVisibilityActionsForContainer(viewContainerModel));
        }));
    }
    registerViewsVisibilityActionsForContainer(viewContainerModel) {
        const disposables = new DisposableStore();
        viewContainerModel.activeViewDescriptors.forEach((viewDescriptor, index) => {
            if (!viewDescriptor.remoteAuthority) {
                disposables.add(registerAction2(class extends ViewPaneContainerAction {
                    constructor() {
                        super({
                            id: `${viewDescriptor.id}.toggleVisibility`,
                            viewPaneContainerId: viewContainerModel.viewContainer.id,
                            precondition: viewDescriptor.canToggleVisibility &&
                                (!viewContainerModel.isVisible(viewDescriptor.id) ||
                                    viewContainerModel.visibleViewDescriptors.length > 1)
                                ? ContextKeyExpr.true()
                                : ContextKeyExpr.false(),
                            toggled: ContextKeyExpr.has(`${viewDescriptor.id}.visible`),
                            title: viewDescriptor.name,
                            metadata: {
                                description: localize2('toggleVisibilityDescription', 'Toggles the visibility of the {0} view if the view container it is located in is visible', viewDescriptor.name.value),
                            },
                            menu: [
                                {
                                    id: ViewsSubMenu,
                                    when: ContextKeyExpr.equals('viewContainer', viewContainerModel.viewContainer.id),
                                    order: index,
                                },
                                {
                                    id: MenuId.ViewContainerTitleContext,
                                    when: ContextKeyExpr.equals('viewContainer', viewContainerModel.viewContainer.id),
                                    order: index,
                                    group: '1_toggleVisibility',
                                },
                                {
                                    id: MenuId.ViewTitleContext,
                                    when: ContextKeyExpr.or(...viewContainerModel.visibleViewDescriptors.map((v) => ContextKeyExpr.equals('view', v.id))),
                                    order: index,
                                    group: '2_toggleVisibility',
                                },
                            ],
                        });
                    }
                    async runInViewPaneContainer(serviceAccessor, viewPaneContainer) {
                        viewPaneContainer.toggleViewVisibility(viewDescriptor.id);
                    }
                }));
                disposables.add(registerAction2(class extends ViewPaneContainerAction {
                    constructor() {
                        super({
                            id: `${viewDescriptor.id}.removeView`,
                            viewPaneContainerId: viewContainerModel.viewContainer.id,
                            title: localize('hideView', "Hide '{0}'", viewDescriptor.name.value),
                            metadata: {
                                description: localize2('hideViewDescription', 'Hides the {0} view if it is visible and the view container it is located in is visible', viewDescriptor.name.value),
                            },
                            precondition: viewDescriptor.canToggleVisibility &&
                                (!viewContainerModel.isVisible(viewDescriptor.id) ||
                                    viewContainerModel.visibleViewDescriptors.length > 1)
                                ? ContextKeyExpr.true()
                                : ContextKeyExpr.false(),
                            menu: [
                                {
                                    id: MenuId.ViewTitleContext,
                                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', viewDescriptor.id), ContextKeyExpr.has(`${viewDescriptor.id}.visible`)),
                                    group: '1_hide',
                                    order: 1,
                                },
                            ],
                        });
                    }
                    async runInViewPaneContainer(serviceAccessor, viewPaneContainer) {
                        if (viewPaneContainer.getView(viewDescriptor.id)?.isVisible()) {
                            viewPaneContainer.toggleViewVisibility(viewDescriptor.id);
                        }
                    }
                }));
            }
        });
        return disposables;
    }
    registerResetViewContainerAction(viewContainer) {
        const that = this;
        return registerAction2(class ResetViewLocationAction extends Action2 {
            constructor() {
                super({
                    id: `${viewContainer.id}.resetViewContainerLocation`,
                    title: localize2('resetViewLocation', 'Reset Location'),
                    menu: [
                        {
                            id: MenuId.ViewContainerTitleContext,
                            group: '1_viewActions',
                            when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('viewContainer', viewContainer.id), ContextKeyExpr.equals(`${viewContainer.id}.defaultViewContainerLocation`, false))),
                        },
                    ],
                });
            }
            run(accessor) {
                that.moveViewContainerToLocation(viewContainer, that.getDefaultViewContainerLocation(viewContainer), undefined, this.desc.id);
                accessor.get(IViewsService).openViewContainer(viewContainer.id, true);
            }
        });
    }
    addViews(container, views, visibilityState = ViewVisibilityState.Default) {
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach((view) => {
                const isDefaultContainer = this.getDefaultContainerById(view.id) === container;
                this.getOrCreateDefaultViewLocationContextKey(view).set(isDefaultContainer);
                if (isDefaultContainer) {
                    this.viewDescriptorsCustomLocations.delete(view.id);
                }
                else {
                    this.viewDescriptorsCustomLocations.set(view.id, container.id);
                }
            });
        });
        this.getViewContainerModel(container).add(views.map((view) => {
            return {
                viewDescriptor: view,
                collapsed: visibilityState === ViewVisibilityState.Default ? undefined : false,
                visible: visibilityState === ViewVisibilityState.Default ? undefined : true,
            };
        }));
    }
    removeViews(container, views) {
        // Set view default location keys to false
        this.contextKeyService.bufferChangeEvents(() => {
            views.forEach((view) => {
                if (this.viewDescriptorsCustomLocations.get(view.id) === container.id) {
                    this.viewDescriptorsCustomLocations.delete(view.id);
                }
                this.getOrCreateDefaultViewLocationContextKey(view).set(false);
            });
        });
        // Remove the views
        this.getViewContainerModel(container).remove(views);
    }
    getOrCreateActiveViewContextKey(viewDescriptor) {
        const activeContextKeyId = `${viewDescriptor.id}.active`;
        let contextKey = this.activeViewContextKeys.get(activeContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(activeContextKeyId, false).bindTo(this.contextKeyService);
            this.activeViewContextKeys.set(activeContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateVisibleViewContextKey(viewDescriptor) {
        const activeContextKeyId = `${viewDescriptor.id}.visible`;
        let contextKey = this.activeViewContextKeys.get(activeContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(activeContextKeyId, false).bindTo(this.contextKeyService);
            this.activeViewContextKeys.set(activeContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateMovableViewContextKey(viewDescriptor) {
        const movableViewContextKeyId = `${viewDescriptor.id}.canMove`;
        let contextKey = this.movableViewContextKeys.get(movableViewContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(movableViewContextKeyId, false).bindTo(this.contextKeyService);
            this.movableViewContextKeys.set(movableViewContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateDefaultViewLocationContextKey(viewDescriptor) {
        const defaultViewLocationContextKeyId = `${viewDescriptor.id}.defaultViewLocation`;
        let contextKey = this.defaultViewLocationContextKeys.get(defaultViewLocationContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(defaultViewLocationContextKeyId, false).bindTo(this.contextKeyService);
            this.defaultViewLocationContextKeys.set(defaultViewLocationContextKeyId, contextKey);
        }
        return contextKey;
    }
    getOrCreateDefaultViewContainerLocationContextKey(viewContainer) {
        const defaultViewContainerLocationContextKeyId = `${viewContainer.id}.defaultViewContainerLocation`;
        let contextKey = this.defaultViewContainerLocationContextKeys.get(defaultViewContainerLocationContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(defaultViewContainerLocationContextKeyId, false).bindTo(this.contextKeyService);
            this.defaultViewContainerLocationContextKeys.set(defaultViewContainerLocationContextKeyId, contextKey);
        }
        return contextKey;
    }
};
ViewDescriptorService = ViewDescriptorService_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, IExtensionService),
    __param(4, ITelemetryService),
    __param(5, ILoggerService)
], ViewDescriptorService);
export { ViewDescriptorService };
registerSingleton(IViewDescriptorService, ViewDescriptorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0Rlc2NyaXB0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ZpZXdzL2Jyb3dzZXIvdmlld0Rlc2NyaXB0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sc0JBQXNCLEVBS3RCLFVBQVUsSUFBSSxjQUFjLEVBQzVCLG1CQUFtQixFQUNuQixlQUFlLEVBQ2YsNkJBQTZCLEVBQzdCLFlBQVksRUFDWixjQUFjLEdBQ2QsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBRU4sYUFBYSxFQUNiLGtCQUFrQixFQUNsQixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixZQUFZLEVBQ1osZUFBZSxFQUNmLFVBQVUsRUFFVixhQUFhLEdBQ2IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHVCQUF1QixFQUN2QixZQUFZLEdBQ1osTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDekYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLFlBQVks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