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
var ViewContainerActivityAction_1;
import { localize } from '../../../nls.js';
import { IActivityService } from '../../services/activity/common/activity.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { DisposableStore, Disposable, DisposableMap, } from '../../../base/common/lifecycle.js';
import { CompositeBar, CompositeDragAndDrop } from './compositeBar.js';
import { Dimension, isMouseEvent } from '../../../base/browser/dom.js';
import { createCSSRule } from '../../../base/browser/domStylesheets.js';
import { asCSSUrl } from '../../../base/browser/cssValue.js';
import { IStorageService, } from '../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { URI } from '../../../base/common/uri.js';
import { ToggleCompositePinnedAction, ToggleCompositeBadgeAction, CompositeBarAction, } from './compositeBarActions.js';
import { IViewDescriptorService, } from '../../common/views.js';
import { IContextKeyService, ContextKeyExpr, } from '../../../platform/contextkey/common/contextkey.js';
import { isString } from '../../../base/common/types.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { isNative } from '../../../base/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Separator, SubmenuAction, toAction } from '../../../base/common/actions.js';
import { StringSHA1 } from '../../../base/common/hash.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
let PaneCompositeBar = class PaneCompositeBar extends Disposable {
    constructor(options, part, paneCompositePart, instantiationService, storageService, extensionService, viewDescriptorService, viewService, contextKeyService, environmentService, layoutService) {
        super();
        this.options = options;
        this.part = part;
        this.paneCompositePart = paneCompositePart;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.viewDescriptorService = viewDescriptorService;
        this.viewService = viewService;
        this.contextKeyService = contextKeyService;
        this.environmentService = environmentService;
        this.layoutService = layoutService;
        this.viewContainerDisposables = this._register(new DisposableMap());
        this.compositeActions = new Map();
        this.hasExtensionsRegistered = false;
        this._cachedViewContainers = undefined;
        this.location =
            paneCompositePart.partId === "workbench.parts.panel" /* Parts.PANEL_PART */
                ? 1 /* ViewContainerLocation.Panel */
                : paneCompositePart.partId === "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */
                    ? 2 /* ViewContainerLocation.AuxiliaryBar */
                    : 0 /* ViewContainerLocation.Sidebar */;
        this.dndHandler = new CompositeDragAndDrop(this.viewDescriptorService, this.location, this.options.orientation, async (id, focus) => {
            return (await this.paneCompositePart.openPaneComposite(id, focus)) ?? null;
        }, (from, to, before) => this.compositeBar.move(from, to, this.options.orientation === 1 /* ActionsOrientation.VERTICAL */
            ? before?.verticallyBefore
            : before?.horizontallyBefore), () => this.compositeBar.getCompositeBarItems());
        const cachedItems = this.cachedViewContainers.map((container) => ({
            id: container.id,
            name: container.name,
            visible: !this.shouldBeHidden(container.id, container),
            order: container.order,
            pinned: container.pinned,
        }));
        this.compositeBar = this.createCompositeBar(cachedItems);
        this.onDidRegisterViewContainers(this.getViewContainers());
        this.registerListeners();
    }
    createCompositeBar(cachedItems) {
        return this._register(this.instantiationService.createInstance(CompositeBar, cachedItems, {
            icon: this.options.icon,
            compact: this.options.compact,
            orientation: this.options.orientation,
            activityHoverOptions: this.options.activityHoverOptions,
            preventLoopNavigation: this.options.preventLoopNavigation,
            openComposite: async (compositeId, preserveFocus) => {
                return ((await this.paneCompositePart.openPaneComposite(compositeId, !preserveFocus)) ?? null);
            },
            getActivityAction: (compositeId) => this.getCompositeActions(compositeId).activityAction,
            getCompositePinnedAction: (compositeId) => this.getCompositeActions(compositeId).pinnedAction,
            getCompositeBadgeAction: (compositeId) => this.getCompositeActions(compositeId).badgeAction,
            getOnCompositeClickAction: (compositeId) => this.getCompositeActions(compositeId).activityAction,
            fillExtraContextMenuActions: (actions, e) => this.options.fillExtraContextMenuActions(actions, e),
            getContextMenuActionsForComposite: (compositeId) => this.getContextMenuActionsForComposite(compositeId),
            getDefaultCompositeId: () => this.viewDescriptorService.getDefaultViewContainer(this.location)?.id,
            dndHandler: this.dndHandler,
            compositeSize: this.options.compositeSize,
            overflowActionSize: this.options.overflowActionSize,
            colors: (theme) => this.options.colors(theme),
        }));
    }
    getContextMenuActionsForComposite(compositeId) {
        const actions = [new Separator()];
        const viewContainer = this.viewDescriptorService.getViewContainerById(compositeId);
        const defaultLocation = this.viewDescriptorService.getDefaultViewContainerLocation(viewContainer);
        const currentLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
        // Move View Container
        const moveActions = [];
        for (const location of [
            0 /* ViewContainerLocation.Sidebar */,
            2 /* ViewContainerLocation.AuxiliaryBar */,
            1 /* ViewContainerLocation.Panel */,
        ]) {
            if (currentLocation !== location) {
                moveActions.push(this.createMoveAction(viewContainer, location, defaultLocation));
            }
        }
        actions.push(new SubmenuAction('moveToMenu', localize('moveToMenu', 'Move To'), moveActions));
        // Reset Location
        if (defaultLocation !== currentLocation) {
            actions.push(toAction({
                id: 'resetLocationAction',
                label: localize('resetLocation', 'Reset Location'),
                run: () => {
                    this.viewDescriptorService.moveViewContainerToLocation(viewContainer, defaultLocation, undefined, 'resetLocationAction');
                    this.viewService.openViewContainer(viewContainer.id, true);
                },
            }));
        }
        else {
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            if (viewContainerModel.allViewDescriptors.length === 1) {
                const viewToReset = viewContainerModel.allViewDescriptors[0];
                const defaultContainer = this.viewDescriptorService.getDefaultContainerById(viewToReset.id);
                if (defaultContainer !== viewContainer) {
                    actions.push(toAction({
                        id: 'resetLocationAction',
                        label: localize('resetLocation', 'Reset Location'),
                        run: () => {
                            this.viewDescriptorService.moveViewsToContainer([viewToReset], defaultContainer, undefined, 'resetLocationAction');
                            this.viewService.openViewContainer(viewContainer.id, true);
                        },
                    }));
                }
            }
        }
        return actions;
    }
    createMoveAction(viewContainer, newLocation, defaultLocation) {
        return toAction({
            id: `moveViewContainerTo${newLocation}`,
            label: newLocation === 1 /* ViewContainerLocation.Panel */
                ? localize('panel', 'Panel')
                : newLocation === 0 /* ViewContainerLocation.Sidebar */
                    ? localize('sidebar', 'Primary Side Bar')
                    : localize('auxiliarybar', 'KvantKode Side Bar'),
            run: () => {
                let index;
                if (newLocation !== defaultLocation) {
                    index = this.viewDescriptorService.getViewContainersByLocation(newLocation).length; // move to the end of the location
                }
                else {
                    index = undefined; // restore default location
                }
                this.viewDescriptorService.moveViewContainerToLocation(viewContainer, newLocation, index);
                this.viewService.openViewContainer(viewContainer.id, true);
            },
        });
    }
    registerListeners() {
        // View Container Changes
        this._register(this.viewDescriptorService.onDidChangeViewContainers(({ added, removed }) => this.onDidChangeViewContainers(added, removed)));
        this._register(this.viewDescriptorService.onDidChangeContainerLocation(({ viewContainer, from, to }) => this.onDidChangeViewContainerLocation(viewContainer, from, to)));
        // View Container Visibility Changes
        this._register(this.paneCompositePart.onDidPaneCompositeOpen((e) => this.onDidChangeViewContainerVisibility(e.getId(), true)));
        this._register(this.paneCompositePart.onDidPaneCompositeClose((e) => this.onDidChangeViewContainerVisibility(e.getId(), false)));
        // Extension registration
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            if (this._store.isDisposed) {
                return;
            }
            this.onDidRegisterExtensions();
            this._register(this.compositeBar.onDidChange(() => {
                this.updateCompositeBarItemsFromStorage(true);
                this.saveCachedViewContainers();
            }));
            this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, this.options.pinnedViewContainersKey, this._store)(() => this.updateCompositeBarItemsFromStorage(false)));
        });
    }
    onDidChangeViewContainers(added, removed) {
        removed
            .filter(({ location }) => location === this.location)
            .forEach(({ container }) => this.onDidDeregisterViewContainer(container));
        this.onDidRegisterViewContainers(added.filter(({ location }) => location === this.location).map(({ container }) => container));
    }
    onDidChangeViewContainerLocation(container, from, to) {
        if (from === this.location) {
            this.onDidDeregisterViewContainer(container);
        }
        if (to === this.location) {
            this.onDidRegisterViewContainers([container]);
        }
    }
    onDidChangeViewContainerVisibility(id, visible) {
        if (visible) {
            // Activate view container action on opening of a view container
            this.onDidViewContainerVisible(id);
        }
        else {
            // Deactivate view container action on close
            this.compositeBar.deactivateComposite(id);
        }
    }
    onDidRegisterExtensions() {
        this.hasExtensionsRegistered = true;
        // show/hide/remove composites
        for (const { id } of this.cachedViewContainers) {
            const viewContainer = this.getViewContainer(id);
            if (viewContainer) {
                this.showOrHideViewContainer(viewContainer);
            }
            else {
                if (this.viewDescriptorService.isViewContainerRemovedPermanently(id)) {
                    this.removeComposite(id);
                }
                else {
                    this.hideComposite(id);
                }
            }
        }
        this.saveCachedViewContainers();
    }
    onDidViewContainerVisible(id) {
        const viewContainer = this.getViewContainer(id);
        if (viewContainer) {
            // Update the composite bar by adding
            this.addComposite(viewContainer);
            this.compositeBar.activateComposite(viewContainer.id);
            if (this.shouldBeHidden(viewContainer)) {
                const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
                if (viewContainerModel.activeViewDescriptors.length === 0) {
                    // Update the composite bar by hiding
                    this.hideComposite(viewContainer.id);
                }
            }
        }
    }
    create(parent) {
        return this.compositeBar.create(parent);
    }
    getCompositeActions(compositeId) {
        let compositeActions = this.compositeActions.get(compositeId);
        if (!compositeActions) {
            const viewContainer = this.getViewContainer(compositeId);
            if (viewContainer) {
                const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
                compositeActions = {
                    activityAction: this._register(this.instantiationService.createInstance(ViewContainerActivityAction, this.toCompositeBarActionItemFrom(viewContainerModel), this.part, this.paneCompositePart)),
                    pinnedAction: this._register(new ToggleCompositePinnedAction(this.toCompositeBarActionItemFrom(viewContainerModel), this.compositeBar)),
                    badgeAction: this._register(new ToggleCompositeBadgeAction(this.toCompositeBarActionItemFrom(viewContainerModel), this.compositeBar)),
                };
            }
            else {
                const cachedComposite = this.cachedViewContainers.filter((c) => c.id === compositeId)[0];
                compositeActions = {
                    activityAction: this._register(this.instantiationService.createInstance(PlaceHolderViewContainerActivityAction, this.toCompositeBarActionItem(compositeId, cachedComposite?.name ?? compositeId, cachedComposite?.icon, undefined), this.part, this.paneCompositePart)),
                    pinnedAction: this._register(new PlaceHolderToggleCompositePinnedAction(compositeId, this.compositeBar)),
                    badgeAction: this._register(new PlaceHolderToggleCompositeBadgeAction(compositeId, this.compositeBar)),
                };
            }
            this.compositeActions.set(compositeId, compositeActions);
        }
        return compositeActions;
    }
    onDidRegisterViewContainers(viewContainers) {
        for (const viewContainer of viewContainers) {
            this.addComposite(viewContainer);
            // Pin it by default if it is new
            const cachedViewContainer = this.cachedViewContainers.filter(({ id }) => id === viewContainer.id)[0];
            if (!cachedViewContainer) {
                this.compositeBar.pin(viewContainer.id);
            }
            // Active
            const visibleViewContainer = this.paneCompositePart.getActivePaneComposite();
            if (visibleViewContainer?.getId() === viewContainer.id) {
                this.compositeBar.activateComposite(viewContainer.id);
            }
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            this.updateCompositeBarActionItem(viewContainer, viewContainerModel);
            this.showOrHideViewContainer(viewContainer);
            const disposables = new DisposableStore();
            disposables.add(viewContainerModel.onDidChangeContainerInfo(() => this.updateCompositeBarActionItem(viewContainer, viewContainerModel)));
            disposables.add(viewContainerModel.onDidChangeActiveViewDescriptors(() => this.showOrHideViewContainer(viewContainer)));
            this.viewContainerDisposables.set(viewContainer.id, disposables);
        }
    }
    onDidDeregisterViewContainer(viewContainer) {
        this.viewContainerDisposables.deleteAndDispose(viewContainer.id);
        this.removeComposite(viewContainer.id);
    }
    updateCompositeBarActionItem(viewContainer, viewContainerModel) {
        const compositeBarActionItem = this.toCompositeBarActionItemFrom(viewContainerModel);
        const { activityAction, pinnedAction } = this.getCompositeActions(viewContainer.id);
        activityAction.updateCompositeBarActionItem(compositeBarActionItem);
        if (pinnedAction instanceof PlaceHolderToggleCompositePinnedAction) {
            pinnedAction.setActivity(compositeBarActionItem);
        }
        if (this.options.recomputeSizes) {
            this.compositeBar.recomputeSizes();
        }
        this.saveCachedViewContainers();
    }
    toCompositeBarActionItemFrom(viewContainerModel) {
        return this.toCompositeBarActionItem(viewContainerModel.viewContainer.id, viewContainerModel.title, viewContainerModel.icon, viewContainerModel.keybindingId);
    }
    toCompositeBarActionItem(id, name, icon, keybindingId) {
        let classNames = undefined;
        let iconUrl = undefined;
        if (this.options.icon) {
            if (URI.isUri(icon)) {
                iconUrl = icon;
                const cssUrl = asCSSUrl(icon);
                const hash = new StringSHA1();
                hash.update(cssUrl);
                const iconId = `activity-${id.replace(/\./g, '-')}-${hash.digest()}`;
                const iconClass = `.monaco-workbench .${this.options.partContainerClass} .monaco-action-bar .action-label.${iconId}`;
                classNames = [iconId, 'uri-icon'];
                createCSSRule(iconClass, `
				mask: ${cssUrl} no-repeat 50% 50%;
				mask-size: ${this.options.iconSize}px;
				-webkit-mask: ${cssUrl} no-repeat 50% 50%;
				-webkit-mask-size: ${this.options.iconSize}px;
				mask-origin: padding;
				-webkit-mask-origin: padding;
			`);
            }
            else if (ThemeIcon.isThemeIcon(icon)) {
                classNames = ThemeIcon.asClassNameArray(icon);
            }
        }
        return { id, name, classNames, iconUrl, keybindingId };
    }
    showOrHideViewContainer(viewContainer) {
        if (this.shouldBeHidden(viewContainer)) {
            this.hideComposite(viewContainer.id);
        }
        else {
            this.addComposite(viewContainer);
            // Activate if this is the active pane composite
            const activePaneComposite = this.paneCompositePart.getActivePaneComposite();
            if (activePaneComposite?.getId() === viewContainer.id) {
                this.compositeBar.activateComposite(viewContainer.id);
            }
        }
    }
    shouldBeHidden(viewContainerOrId, cachedViewContainer) {
        const viewContainer = isString(viewContainerOrId)
            ? this.getViewContainer(viewContainerOrId)
            : viewContainerOrId;
        const viewContainerId = isString(viewContainerOrId) ? viewContainerOrId : viewContainerOrId.id;
        if (viewContainer) {
            if (viewContainer.hideIfEmpty) {
                if (this.viewService.isViewContainerActive(viewContainerId)) {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        // Check cache only if extensions are not yet registered and current window is not native (desktop) remote connection window
        if (!this.hasExtensionsRegistered &&
            !(this.part === "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */ && this.environmentService.remoteAuthority && isNative)) {
            cachedViewContainer =
                cachedViewContainer || this.cachedViewContainers.find(({ id }) => id === viewContainerId);
            // Show builtin ViewContainer if not registered yet
            if (!viewContainer && cachedViewContainer?.isBuiltin && cachedViewContainer?.visible) {
                return false;
            }
            if (cachedViewContainer?.views?.length) {
                return cachedViewContainer.views.every(({ when }) => !!when && !this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(when)));
            }
        }
        return true;
    }
    addComposite(viewContainer) {
        this.compositeBar.addComposite({
            id: viewContainer.id,
            name: typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value,
            order: viewContainer.order,
            requestedIndex: viewContainer.requestedIndex,
        });
    }
    hideComposite(compositeId) {
        this.compositeBar.hideComposite(compositeId);
        const compositeActions = this.compositeActions.get(compositeId);
        if (compositeActions) {
            compositeActions.activityAction.dispose();
            compositeActions.pinnedAction.dispose();
            this.compositeActions.delete(compositeId);
        }
    }
    removeComposite(compositeId) {
        this.compositeBar.removeComposite(compositeId);
        const compositeActions = this.compositeActions.get(compositeId);
        if (compositeActions) {
            compositeActions.activityAction.dispose();
            compositeActions.pinnedAction.dispose();
            this.compositeActions.delete(compositeId);
        }
    }
    getPinnedPaneCompositeIds() {
        const pinnedCompositeIds = this.compositeBar.getPinnedComposites().map((v) => v.id);
        return this.getViewContainers()
            .filter((v) => this.compositeBar.isPinned(v.id))
            .sort((v1, v2) => pinnedCompositeIds.indexOf(v1.id) - pinnedCompositeIds.indexOf(v2.id))
            .map((v) => v.id);
    }
    getVisiblePaneCompositeIds() {
        return this.compositeBar
            .getVisibleComposites()
            .filter((v) => this.paneCompositePart.getActivePaneComposite()?.getId() === v.id ||
            this.compositeBar.isPinned(v.id))
            .map((v) => v.id);
    }
    getPaneCompositeIds() {
        return this.compositeBar.getVisibleComposites().map((v) => v.id);
    }
    getContextMenuActions() {
        return this.compositeBar.getContextMenuActions();
    }
    focus(index) {
        this.compositeBar.focus(index);
    }
    layout(width, height) {
        this.compositeBar.layout(new Dimension(width, height));
    }
    getViewContainer(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        return viewContainer &&
            this.viewDescriptorService.getViewContainerLocation(viewContainer) === this.location
            ? viewContainer
            : undefined;
    }
    getViewContainers() {
        return this.viewDescriptorService.getViewContainersByLocation(this.location);
    }
    updateCompositeBarItemsFromStorage(retainExisting) {
        if (this.pinnedViewContainersValue === this.getStoredPinnedViewContainersValue()) {
            return;
        }
        this._placeholderViewContainersValue = undefined;
        this._pinnedViewContainersValue = undefined;
        this._cachedViewContainers = undefined;
        const newCompositeItems = [];
        const compositeItems = this.compositeBar.getCompositeBarItems();
        for (const cachedViewContainer of this.cachedViewContainers) {
            newCompositeItems.push({
                id: cachedViewContainer.id,
                name: cachedViewContainer.name,
                order: cachedViewContainer.order,
                pinned: cachedViewContainer.pinned,
                visible: cachedViewContainer.visible && !!this.getViewContainer(cachedViewContainer.id),
            });
        }
        for (const viewContainer of this.getViewContainers()) {
            // Add missing view containers
            if (!newCompositeItems.some(({ id }) => id === viewContainer.id)) {
                const index = compositeItems.findIndex(({ id }) => id === viewContainer.id);
                if (index !== -1) {
                    const compositeItem = compositeItems[index];
                    newCompositeItems.splice(index, 0, {
                        id: viewContainer.id,
                        name: typeof viewContainer.title === 'string'
                            ? viewContainer.title
                            : viewContainer.title.value,
                        order: compositeItem.order,
                        pinned: compositeItem.pinned,
                        visible: compositeItem.visible,
                    });
                }
                else {
                    newCompositeItems.push({
                        id: viewContainer.id,
                        name: typeof viewContainer.title === 'string'
                            ? viewContainer.title
                            : viewContainer.title.value,
                        order: viewContainer.order,
                        pinned: true,
                        visible: !this.shouldBeHidden(viewContainer),
                    });
                }
            }
        }
        if (retainExisting) {
            for (const compositeItem of compositeItems) {
                const newCompositeItem = newCompositeItems.find(({ id }) => id === compositeItem.id);
                if (!newCompositeItem) {
                    newCompositeItems.push(compositeItem);
                }
            }
        }
        this.compositeBar.setCompositeBarItems(newCompositeItems);
    }
    saveCachedViewContainers() {
        const state = [];
        const compositeItems = this.compositeBar.getCompositeBarItems();
        for (const compositeItem of compositeItems) {
            const viewContainer = this.getViewContainer(compositeItem.id);
            if (viewContainer) {
                const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
                const views = [];
                for (const { when } of viewContainerModel.allViewDescriptors) {
                    views.push({ when: when ? when.serialize() : undefined });
                }
                state.push({
                    id: compositeItem.id,
                    name: viewContainerModel.title,
                    icon: URI.isUri(viewContainerModel.icon) && this.environmentService.remoteAuthority
                        ? undefined
                        : viewContainerModel.icon, // Do not cache uri icons with remote connection
                    views,
                    pinned: compositeItem.pinned,
                    order: compositeItem.order,
                    visible: compositeItem.visible,
                    isBuiltin: !viewContainer.extensionId,
                });
            }
            else {
                state.push({
                    id: compositeItem.id,
                    name: compositeItem.name,
                    pinned: compositeItem.pinned,
                    order: compositeItem.order,
                    visible: false,
                    isBuiltin: false,
                });
            }
        }
        this.storeCachedViewContainersState(state);
    }
    get cachedViewContainers() {
        if (this._cachedViewContainers === undefined) {
            this._cachedViewContainers = this.getPinnedViewContainers();
            for (const placeholderViewContainer of this.getPlaceholderViewContainers()) {
                const cachedViewContainer = this._cachedViewContainers.find((cached) => cached.id === placeholderViewContainer.id);
                if (cachedViewContainer) {
                    cachedViewContainer.visible =
                        placeholderViewContainer.visible ?? cachedViewContainer.visible;
                    cachedViewContainer.name = placeholderViewContainer.name;
                    cachedViewContainer.icon = placeholderViewContainer.themeIcon
                        ? placeholderViewContainer.themeIcon
                        : placeholderViewContainer.iconUrl
                            ? URI.revive(placeholderViewContainer.iconUrl)
                            : undefined;
                    if (URI.isUri(cachedViewContainer.icon) && this.environmentService.remoteAuthority) {
                        cachedViewContainer.icon = undefined; // Do not cache uri icons with remote connection
                    }
                    cachedViewContainer.views = placeholderViewContainer.views;
                    cachedViewContainer.isBuiltin = placeholderViewContainer.isBuiltin;
                }
            }
            for (const viewContainerWorkspaceState of this.getViewContainersWorkspaceState()) {
                const cachedViewContainer = this._cachedViewContainers.find((cached) => cached.id === viewContainerWorkspaceState.id);
                if (cachedViewContainer) {
                    cachedViewContainer.visible =
                        viewContainerWorkspaceState.visible ?? cachedViewContainer.visible;
                }
            }
        }
        return this._cachedViewContainers;
    }
    storeCachedViewContainersState(cachedViewContainers) {
        const pinnedViewContainers = this.getPinnedViewContainers();
        this.setPinnedViewContainers(cachedViewContainers.map(({ id, pinned, order }) => ({
            id,
            pinned,
            visible: Boolean(pinnedViewContainers.find(({ id: pinnedId }) => pinnedId === id)?.visible),
            order,
        })));
        this.setPlaceholderViewContainers(cachedViewContainers.map(({ id, icon, name, views, isBuiltin }) => ({
            id,
            iconUrl: URI.isUri(icon) ? icon : undefined,
            themeIcon: ThemeIcon.isThemeIcon(icon) ? icon : undefined,
            name,
            isBuiltin,
            views,
        })));
        this.setViewContainersWorkspaceState(cachedViewContainers.map(({ id, visible }) => ({
            id,
            visible,
        })));
    }
    getPinnedViewContainers() {
        return JSON.parse(this.pinnedViewContainersValue);
    }
    setPinnedViewContainers(pinnedViewContainers) {
        this.pinnedViewContainersValue = JSON.stringify(pinnedViewContainers);
    }
    get pinnedViewContainersValue() {
        if (!this._pinnedViewContainersValue) {
            this._pinnedViewContainersValue = this.getStoredPinnedViewContainersValue();
        }
        return this._pinnedViewContainersValue;
    }
    set pinnedViewContainersValue(pinnedViewContainersValue) {
        if (this.pinnedViewContainersValue !== pinnedViewContainersValue) {
            this._pinnedViewContainersValue = pinnedViewContainersValue;
            this.setStoredPinnedViewContainersValue(pinnedViewContainersValue);
        }
    }
    getStoredPinnedViewContainersValue() {
        return this.storageService.get(this.options.pinnedViewContainersKey, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredPinnedViewContainersValue(value) {
        this.storageService.store(this.options.pinnedViewContainersKey, value, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    getPlaceholderViewContainers() {
        return JSON.parse(this.placeholderViewContainersValue);
    }
    setPlaceholderViewContainers(placeholderViewContainers) {
        this.placeholderViewContainersValue = JSON.stringify(placeholderViewContainers);
    }
    get placeholderViewContainersValue() {
        if (!this._placeholderViewContainersValue) {
            this._placeholderViewContainersValue = this.getStoredPlaceholderViewContainersValue();
        }
        return this._placeholderViewContainersValue;
    }
    set placeholderViewContainersValue(placeholderViewContainesValue) {
        if (this.placeholderViewContainersValue !== placeholderViewContainesValue) {
            this._placeholderViewContainersValue = placeholderViewContainesValue;
            this.setStoredPlaceholderViewContainersValue(placeholderViewContainesValue);
        }
    }
    getStoredPlaceholderViewContainersValue() {
        return this.storageService.get(this.options.placeholderViewContainersKey, 0 /* StorageScope.PROFILE */, '[]');
    }
    setStoredPlaceholderViewContainersValue(value) {
        this.storageService.store(this.options.placeholderViewContainersKey, value, 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    getViewContainersWorkspaceState() {
        return JSON.parse(this.viewContainersWorkspaceStateValue);
    }
    setViewContainersWorkspaceState(viewContainersWorkspaceState) {
        this.viewContainersWorkspaceStateValue = JSON.stringify(viewContainersWorkspaceState);
    }
    get viewContainersWorkspaceStateValue() {
        if (!this._viewContainersWorkspaceStateValue) {
            this._viewContainersWorkspaceStateValue = this.getStoredViewContainersWorkspaceStateValue();
        }
        return this._viewContainersWorkspaceStateValue;
    }
    set viewContainersWorkspaceStateValue(viewContainersWorkspaceStateValue) {
        if (this.viewContainersWorkspaceStateValue !== viewContainersWorkspaceStateValue) {
            this._viewContainersWorkspaceStateValue = viewContainersWorkspaceStateValue;
            this.setStoredViewContainersWorkspaceStateValue(viewContainersWorkspaceStateValue);
        }
    }
    getStoredViewContainersWorkspaceStateValue() {
        return this.storageService.get(this.options.viewContainersWorkspaceStateKey, 1 /* StorageScope.WORKSPACE */, '[]');
    }
    setStoredViewContainersWorkspaceStateValue(value) {
        this.storageService.store(this.options.viewContainersWorkspaceStateKey, value, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
};
PaneCompositeBar = __decorate([
    __param(3, IInstantiationService),
    __param(4, IStorageService),
    __param(5, IExtensionService),
    __param(6, IViewDescriptorService),
    __param(7, IViewsService),
    __param(8, IContextKeyService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IWorkbenchLayoutService)
], PaneCompositeBar);
export { PaneCompositeBar };
let ViewContainerActivityAction = class ViewContainerActivityAction extends CompositeBarAction {
    static { ViewContainerActivityAction_1 = this; }
    static { this.preventDoubleClickDelay = 300; }
    constructor(compositeBarActionItem, part, paneCompositePart, layoutService, configurationService, activityService) {
        super(compositeBarActionItem);
        this.part = part;
        this.paneCompositePart = paneCompositePart;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.activityService = activityService;
        this.lastRun = 0;
        this.updateActivity();
        this._register(this.activityService.onDidChangeActivity((viewContainerOrAction) => {
            if (!isString(viewContainerOrAction) &&
                viewContainerOrAction.id === this.compositeBarActionItem.id) {
                this.updateActivity();
            }
        }));
    }
    updateCompositeBarActionItem(compositeBarActionItem) {
        this.compositeBarActionItem = compositeBarActionItem;
    }
    updateActivity() {
        this.activities = this.activityService.getViewContainerActivities(this.compositeBarActionItem.id);
    }
    async run(event) {
        if (isMouseEvent(event) && event.button === 2) {
            return; // do not run on right click
        }
        // prevent accident trigger on a doubleclick (to help nervous people)
        const now = Date.now();
        if (now > this.lastRun /* https://github.com/microsoft/vscode/issues/25830 */ &&
            now - this.lastRun < ViewContainerActivityAction_1.preventDoubleClickDelay) {
            return;
        }
        this.lastRun = now;
        const focus = event && 'preserveFocus' in event ? !event.preserveFocus : true;
        if (this.part === "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */) {
            const sideBarVisible = this.layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
            const activeViewlet = this.paneCompositePart.getActivePaneComposite();
            const focusBehavior = this.configurationService.getValue('workbench.activityBar.iconClickBehavior');
            if (sideBarVisible && activeViewlet?.getId() === this.compositeBarActionItem.id) {
                switch (focusBehavior) {
                    case 'focus':
                        this.paneCompositePart.openPaneComposite(this.compositeBarActionItem.id, focus);
                        break;
                    case 'toggle':
                    default:
                        // Hide sidebar if selected viewlet already visible
                        this.layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
                        break;
                }
                return;
            }
        }
        await this.paneCompositePart.openPaneComposite(this.compositeBarActionItem.id, focus);
        return this.activate();
    }
};
ViewContainerActivityAction = ViewContainerActivityAction_1 = __decorate([
    __param(3, IWorkbenchLayoutService),
    __param(4, IConfigurationService),
    __param(5, IActivityService)
], ViewContainerActivityAction);
class PlaceHolderViewContainerActivityAction extends ViewContainerActivityAction {
}
class PlaceHolderToggleCompositePinnedAction extends ToggleCompositePinnedAction {
    constructor(id, compositeBar) {
        super({ id, name: id, classNames: undefined }, compositeBar);
    }
    setActivity(activity) {
        this.label = activity.name;
    }
}
class PlaceHolderToggleCompositeBadgeAction extends ToggleCompositeBadgeAction {
    constructor(id, compositeBar) {
        super({ id, name: id, classNames: undefined }, compositeBar);
    }
    setCompositeBarActionItem(actionItem) {
        this.label = actionItem.name;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZUJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3BhbmVDb21wb3NpdGVCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsdUJBQXVCLEVBQVMsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBRU4sZUFBZSxFQUNmLFVBQVUsRUFDVixhQUFhLEdBQ2IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsWUFBWSxFQUFxQixvQkFBb0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sMkJBQTJCLEVBRzNCLDBCQUEwQixFQUMxQixrQkFBa0IsR0FHbEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sc0JBQXNCLEdBSXRCLE1BQU0sdUJBQXVCLENBQUE7QUFD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