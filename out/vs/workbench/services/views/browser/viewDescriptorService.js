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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0Rlc2NyaXB0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdmlld3MvYnJvd3Nlci92aWV3RGVzY3JpcHRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixzQkFBc0IsRUFLdEIsVUFBVSxJQUFJLGNBQWMsRUFDNUIsbUJBQW1CLEVBQ25CLGVBQWUsRUFDZiw2QkFBNkIsRUFDN0IsWUFBWSxFQUNaLGNBQWMsR0FDZCxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFFTixhQUFhLEVBQ2Isa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFlBQVksRUFDWixlQUFlLEVBQ2YsVUFBVSxFQUVWLGFBQWEsR0FDYixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUJBQXVCLEVBQ3ZCLFlBQVksR0FDWixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FB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