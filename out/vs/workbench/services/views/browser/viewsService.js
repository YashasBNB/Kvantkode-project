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
import { Disposable, toDisposable, DisposableStore, DisposableMap, } from '../../../../base/common/lifecycle.js';
import { IViewDescriptorService, } from '../../../common/views.js';
import { FocusedViewContext, getVisbileViewContextKey } from '../../../common/contextkeys.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { isString } from '../../../../base/common/types.js';
import { MenuId, registerAction2, Action2, MenuRegistry, } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { PaneCompositeDescriptor, Extensions as PaneCompositeExtensions, PaneComposite, } from '../../../browser/panecomposite.js';
import { IWorkbenchLayoutService } from '../../layout/browser/layoutService.js';
import { URI } from '../../../../base/common/uri.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IEditorGroupsService } from '../../editor/common/editorGroupsService.js';
import { FilterViewPaneContainer } from '../../../browser/parts/views/viewsViewlet.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IViewsService } from '../common/viewsService.js';
let ViewsService = class ViewsService extends Disposable {
    constructor(viewDescriptorService, paneCompositeService, contextKeyService, layoutService, editorService) {
        super();
        this.viewDescriptorService = viewDescriptorService;
        this.paneCompositeService = paneCompositeService;
        this.contextKeyService = contextKeyService;
        this.layoutService = layoutService;
        this.editorService = editorService;
        this._onDidChangeViewVisibility = this._register(new Emitter());
        this.onDidChangeViewVisibility = this._onDidChangeViewVisibility.event;
        this._onDidChangeViewContainerVisibility = this._register(new Emitter());
        this.onDidChangeViewContainerVisibility = this._onDidChangeViewContainerVisibility.event;
        this._onDidChangeFocusedView = this._register(new Emitter());
        this.onDidChangeFocusedView = this._onDidChangeFocusedView.event;
        this.viewContainerDisposables = this._register(new DisposableMap());
        this.viewDisposable = new Map();
        this.enabledViewContainersContextKeys = new Map();
        this.visibleViewContextKeys = new Map();
        this.viewPaneContainers = new Map();
        this._register(toDisposable(() => {
            this.viewDisposable.forEach((disposable) => disposable.dispose());
            this.viewDisposable.clear();
        }));
        this.viewDescriptorService.viewContainers.forEach((viewContainer) => this.onDidRegisterViewContainer(viewContainer, this.viewDescriptorService.getViewContainerLocation(viewContainer)));
        this._register(this.viewDescriptorService.onDidChangeViewContainers(({ added, removed }) => this.onDidChangeContainers(added, removed)));
        this._register(this.viewDescriptorService.onDidChangeContainerLocation(({ viewContainer, from, to }) => this.onDidChangeContainerLocation(viewContainer, from, to)));
        // View Container Visibility
        this._register(this.paneCompositeService.onDidPaneCompositeOpen((e) => this._onDidChangeViewContainerVisibility.fire({
            id: e.composite.getId(),
            visible: true,
            location: e.viewContainerLocation,
        })));
        this._register(this.paneCompositeService.onDidPaneCompositeClose((e) => this._onDidChangeViewContainerVisibility.fire({
            id: e.composite.getId(),
            visible: false,
            location: e.viewContainerLocation,
        })));
        this.focusedViewContextKey = FocusedViewContext.bindTo(contextKeyService);
    }
    onViewsAdded(added) {
        for (const view of added) {
            this.onViewsVisibilityChanged(view, view.isBodyVisible());
        }
    }
    onViewsVisibilityChanged(view, visible) {
        this.getOrCreateActiveViewContextKey(view).set(visible);
        this._onDidChangeViewVisibility.fire({ id: view.id, visible: visible });
    }
    onViewsRemoved(removed) {
        for (const view of removed) {
            this.onViewsVisibilityChanged(view, false);
        }
    }
    getOrCreateActiveViewContextKey(view) {
        const visibleContextKeyId = getVisbileViewContextKey(view.id);
        let contextKey = this.visibleViewContextKeys.get(visibleContextKeyId);
        if (!contextKey) {
            contextKey = new RawContextKey(visibleContextKeyId, false).bindTo(this.contextKeyService);
            this.visibleViewContextKeys.set(visibleContextKeyId, contextKey);
        }
        return contextKey;
    }
    onDidChangeContainers(added, removed) {
        for (const { container, location } of removed) {
            this.onDidDeregisterViewContainer(container, location);
        }
        for (const { container, location } of added) {
            this.onDidRegisterViewContainer(container, location);
        }
    }
    onDidRegisterViewContainer(viewContainer, viewContainerLocation) {
        this.registerPaneComposite(viewContainer, viewContainerLocation);
        const disposables = new DisposableStore();
        const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
        this.onViewDescriptorsAdded(viewContainerModel.allViewDescriptors, viewContainer);
        disposables.add(viewContainerModel.onDidChangeAllViewDescriptors(({ added, removed }) => {
            this.onViewDescriptorsAdded(added, viewContainer);
            this.onViewDescriptorsRemoved(removed);
        }));
        this.updateViewContainerEnablementContextKey(viewContainer);
        disposables.add(viewContainerModel.onDidChangeActiveViewDescriptors(() => this.updateViewContainerEnablementContextKey(viewContainer)));
        disposables.add(this.registerOpenViewContainerAction(viewContainer));
        this.viewContainerDisposables.set(viewContainer.id, disposables);
    }
    onDidDeregisterViewContainer(viewContainer, viewContainerLocation) {
        this.deregisterPaneComposite(viewContainer, viewContainerLocation);
        this.viewContainerDisposables.deleteAndDispose(viewContainer.id);
    }
    onDidChangeContainerLocation(viewContainer, from, to) {
        this.deregisterPaneComposite(viewContainer, from);
        this.registerPaneComposite(viewContainer, to);
        // Open view container if part is visible and there is only one view container in location
        if (this.layoutService.isVisible(getPartByLocation(to)) &&
            this.viewDescriptorService
                .getViewContainersByLocation(to)
                .filter((vc) => this.isViewContainerActive(vc.id)).length === 1) {
            this.openViewContainer(viewContainer.id);
        }
    }
    onViewDescriptorsAdded(views, container) {
        const location = this.viewDescriptorService.getViewContainerLocation(container);
        if (location === null) {
            return;
        }
        for (const viewDescriptor of views) {
            const disposables = new DisposableStore();
            disposables.add(this.registerOpenViewAction(viewDescriptor));
            disposables.add(this.registerFocusViewAction(viewDescriptor, container.title));
            disposables.add(this.registerResetViewLocationAction(viewDescriptor));
            this.viewDisposable.set(viewDescriptor, disposables);
        }
    }
    onViewDescriptorsRemoved(views) {
        for (const view of views) {
            const disposable = this.viewDisposable.get(view);
            if (disposable) {
                disposable.dispose();
                this.viewDisposable.delete(view);
            }
        }
    }
    updateViewContainerEnablementContextKey(viewContainer) {
        let contextKey = this.enabledViewContainersContextKeys.get(viewContainer.id);
        if (!contextKey) {
            contextKey = this.contextKeyService.createKey(getEnabledViewContainerContextKey(viewContainer.id), false);
            this.enabledViewContainersContextKeys.set(viewContainer.id, contextKey);
        }
        contextKey.set(!(viewContainer.hideIfEmpty &&
            this.viewDescriptorService.getViewContainerModel(viewContainer).activeViewDescriptors
                .length === 0));
    }
    async openComposite(compositeId, location, focus) {
        return this.paneCompositeService.openPaneComposite(compositeId, location, focus);
    }
    getComposite(compositeId, location) {
        return this.paneCompositeService.getPaneComposite(compositeId, location);
    }
    // One view container can be visible at a time in a location
    isViewContainerVisible(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (!viewContainer) {
            return false;
        }
        const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
        if (viewContainerLocation === null) {
            return false;
        }
        return this.paneCompositeService.getActivePaneComposite(viewContainerLocation)?.getId() === id;
    }
    // Multiple view containers can be active/inactive at a time in a location
    isViewContainerActive(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (!viewContainer) {
            return false;
        }
        if (!viewContainer.hideIfEmpty) {
            return true;
        }
        return (this.viewDescriptorService.getViewContainerModel(viewContainer).activeViewDescriptors.length >
            0);
    }
    getVisibleViewContainer(location) {
        const viewContainerId = this.paneCompositeService.getActivePaneComposite(location)?.getId();
        return viewContainerId ? this.viewDescriptorService.getViewContainerById(viewContainerId) : null;
    }
    getActiveViewPaneContainerWithId(viewContainerId) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
        return viewContainer ? this.getActiveViewPaneContainer(viewContainer) : null;
    }
    async openViewContainer(id, focus) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (viewContainer) {
            const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
            if (viewContainerLocation !== null) {
                const paneComposite = await this.paneCompositeService.openPaneComposite(id, viewContainerLocation, focus);
                return paneComposite || null;
            }
        }
        return null;
    }
    async closeViewContainer(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(id);
        if (viewContainer) {
            const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
            const isActive = viewContainerLocation !== null &&
                this.paneCompositeService.getActivePaneComposite(viewContainerLocation);
            if (viewContainerLocation !== null) {
                return isActive
                    ? this.layoutService.setPartHidden(true, getPartByLocation(viewContainerLocation))
                    : undefined;
            }
        }
    }
    isViewVisible(id) {
        const activeView = this.getActiveViewWithId(id);
        return activeView?.isBodyVisible() || false;
    }
    getActiveViewWithId(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
        if (viewContainer) {
            const activeViewPaneContainer = this.getActiveViewPaneContainer(viewContainer);
            if (activeViewPaneContainer) {
                return activeViewPaneContainer.getView(id);
            }
        }
        return null;
    }
    getViewWithId(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
        if (viewContainer) {
            const viewPaneContainer = this.viewPaneContainers.get(viewContainer.id);
            if (viewPaneContainer) {
                return viewPaneContainer.getView(id);
            }
        }
        return null;
    }
    getFocusedView() {
        const viewId = this.contextKeyService.getContextKeyValue(FocusedViewContext.key) ?? '';
        return this.viewDescriptorService.getViewDescriptorById(viewId.toString());
    }
    getFocusedViewName() {
        const textEditorFocused = this.editorService.activeTextEditorControl?.hasTextFocus()
            ? localize('editor', 'Text Editor')
            : undefined;
        return this.getFocusedView()?.name?.value ?? textEditorFocused ?? '';
    }
    async openView(id, focus) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
        if (!viewContainer) {
            return null;
        }
        if (!this.viewDescriptorService
            .getViewContainerModel(viewContainer)
            .activeViewDescriptors.some((viewDescriptor) => viewDescriptor.id === id)) {
            return null;
        }
        const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);
        const compositeDescriptor = this.getComposite(viewContainer.id, location);
        if (compositeDescriptor) {
            const paneComposite = (await this.openComposite(compositeDescriptor.id, location));
            if (paneComposite && paneComposite.openView) {
                return paneComposite.openView(id, focus) || null;
            }
            else if (focus) {
                paneComposite?.focus();
            }
        }
        return null;
    }
    closeView(id) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
        if (viewContainer) {
            const activeViewPaneContainer = this.getActiveViewPaneContainer(viewContainer);
            if (activeViewPaneContainer) {
                const view = activeViewPaneContainer.getView(id);
                if (view) {
                    if (activeViewPaneContainer.views.length === 1) {
                        const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);
                        if (location === 0 /* ViewContainerLocation.Sidebar */) {
                            this.layoutService.setPartHidden(true, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */);
                        }
                        else if (location === 1 /* ViewContainerLocation.Panel */ ||
                            location === 2 /* ViewContainerLocation.AuxiliaryBar */) {
                            this.paneCompositeService.hideActivePaneComposite(location);
                        }
                        // The blur event doesn't fire on WebKit when the focused element is hidden,
                        // so the context key needs to be forced here too otherwise a view may still
                        // think it's showing, breaking toggle commands.
                        if (this.focusedViewContextKey.get() === id) {
                            this.focusedViewContextKey.reset();
                        }
                    }
                    else {
                        view.setExpanded(false);
                    }
                }
            }
        }
    }
    getActiveViewPaneContainer(viewContainer) {
        const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);
        if (location === null) {
            return null;
        }
        const activePaneComposite = this.paneCompositeService.getActivePaneComposite(location);
        if (activePaneComposite?.getId() === viewContainer.id) {
            return activePaneComposite.getViewPaneContainer() || null;
        }
        return null;
    }
    getViewProgressIndicator(viewId) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(viewId);
        if (!viewContainer) {
            return undefined;
        }
        const viewPaneContainer = this.viewPaneContainers.get(viewContainer.id);
        if (!viewPaneContainer) {
            return undefined;
        }
        const view = viewPaneContainer.getView(viewId);
        if (!view) {
            return undefined;
        }
        if (viewPaneContainer.isViewMergedWithContainer()) {
            return this.getViewContainerProgressIndicator(viewContainer);
        }
        return view.getProgressIndicator();
    }
    getViewContainerProgressIndicator(viewContainer) {
        const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
        if (viewContainerLocation === null) {
            return undefined;
        }
        return this.paneCompositeService.getProgressIndicator(viewContainer.id, viewContainerLocation);
    }
    registerOpenViewContainerAction(viewContainer) {
        const disposables = new DisposableStore();
        if (viewContainer.openCommandActionDescriptor) {
            const { id, mnemonicTitle, keybindings, order } = viewContainer.openCommandActionDescriptor ?? { id: viewContainer.id };
            const title = viewContainer.openCommandActionDescriptor.title ?? viewContainer.title;
            const that = this;
            disposables.add(registerAction2(class OpenViewContainerAction extends Action2 {
                constructor() {
                    super({
                        id,
                        get title() {
                            const viewContainerLocation = that.viewDescriptorService.getViewContainerLocation(viewContainer);
                            const localizedTitle = typeof title === 'string' ? title : title.value;
                            const originalTitle = typeof title === 'string' ? title : title.original;
                            if (viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
                                return {
                                    value: localize('show view', 'Show {0}', localizedTitle),
                                    original: `Show ${originalTitle}`,
                                };
                            }
                            else {
                                return {
                                    value: localize('toggle view', 'Toggle {0}', localizedTitle),
                                    original: `Toggle ${originalTitle}`,
                                };
                            }
                        },
                        category: Categories.View,
                        precondition: ContextKeyExpr.has(getEnabledViewContainerContextKey(viewContainer.id)),
                        keybinding: keybindings
                            ? { ...keybindings, weight: 200 /* KeybindingWeight.WorkbenchContrib */ }
                            : undefined,
                        f1: true,
                    });
                }
                async run(serviceAccessor) {
                    const editorGroupService = serviceAccessor.get(IEditorGroupsService);
                    const viewDescriptorService = serviceAccessor.get(IViewDescriptorService);
                    const layoutService = serviceAccessor.get(IWorkbenchLayoutService);
                    const viewsService = serviceAccessor.get(IViewsService);
                    const viewContainerLocation = viewDescriptorService.getViewContainerLocation(viewContainer);
                    switch (viewContainerLocation) {
                        case 2 /* ViewContainerLocation.AuxiliaryBar */:
                        case 0 /* ViewContainerLocation.Sidebar */: {
                            const part = viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */
                                ? "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */
                                : "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                            if (!viewsService.isViewContainerVisible(viewContainer.id) ||
                                !layoutService.hasFocus(part)) {
                                await viewsService.openViewContainer(viewContainer.id, true);
                            }
                            else {
                                editorGroupService.activeGroup.focus();
                            }
                            break;
                        }
                        case 1 /* ViewContainerLocation.Panel */:
                            if (!viewsService.isViewContainerVisible(viewContainer.id) ||
                                !layoutService.hasFocus("workbench.parts.panel" /* Parts.PANEL_PART */)) {
                                await viewsService.openViewContainer(viewContainer.id, true);
                            }
                            else {
                                viewsService.closeViewContainer(viewContainer.id);
                            }
                            break;
                    }
                }
            }));
            if (mnemonicTitle) {
                const defaultLocation = this.viewDescriptorService.getDefaultViewContainerLocation(viewContainer);
                disposables.add(MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
                    command: {
                        id,
                        title: mnemonicTitle,
                    },
                    group: defaultLocation === 0 /* ViewContainerLocation.Sidebar */
                        ? '3_sidebar'
                        : defaultLocation === 2 /* ViewContainerLocation.AuxiliaryBar */
                            ? '4_auxbar'
                            : '5_panel',
                    when: ContextKeyExpr.has(getEnabledViewContainerContextKey(viewContainer.id)),
                    order: order ?? Number.MAX_VALUE,
                }));
            }
        }
        return disposables;
    }
    registerOpenViewAction(viewDescriptor) {
        const disposables = new DisposableStore();
        if (viewDescriptor.openCommandActionDescriptor) {
            const title = viewDescriptor.openCommandActionDescriptor.title ?? viewDescriptor.name;
            const commandId = viewDescriptor.openCommandActionDescriptor.id;
            const that = this;
            disposables.add(registerAction2(class OpenViewAction extends Action2 {
                constructor() {
                    super({
                        id: commandId,
                        get title() {
                            const viewContainerLocation = that.viewDescriptorService.getViewLocationById(viewDescriptor.id);
                            const localizedTitle = typeof title === 'string' ? title : title.value;
                            const originalTitle = typeof title === 'string' ? title : title.original;
                            if (viewContainerLocation === 0 /* ViewContainerLocation.Sidebar */) {
                                return {
                                    value: localize('show view', 'Show {0}', localizedTitle),
                                    original: `Show ${originalTitle}`,
                                };
                            }
                            else {
                                return {
                                    value: localize('toggle view', 'Toggle {0}', localizedTitle),
                                    original: `Toggle ${originalTitle}`,
                                };
                            }
                        },
                        category: Categories.View,
                        precondition: ContextKeyExpr.has(`${viewDescriptor.id}.active`),
                        keybinding: viewDescriptor.openCommandActionDescriptor.keybindings
                            ? {
                                ...viewDescriptor.openCommandActionDescriptor.keybindings,
                                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                            }
                            : undefined,
                        f1: true,
                    });
                }
                async run(serviceAccessor) {
                    const editorGroupService = serviceAccessor.get(IEditorGroupsService);
                    const viewDescriptorService = serviceAccessor.get(IViewDescriptorService);
                    const layoutService = serviceAccessor.get(IWorkbenchLayoutService);
                    const viewsService = serviceAccessor.get(IViewsService);
                    const contextKeyService = serviceAccessor.get(IContextKeyService);
                    const focusedViewId = FocusedViewContext.getValue(contextKeyService);
                    if (focusedViewId === viewDescriptor.id) {
                        const viewLocation = viewDescriptorService.getViewLocationById(viewDescriptor.id);
                        if (viewDescriptorService.getViewLocationById(viewDescriptor.id) ===
                            0 /* ViewContainerLocation.Sidebar */) {
                            // focus the editor if the view is focused and in the side bar
                            editorGroupService.activeGroup.focus();
                        }
                        else if (viewLocation !== null) {
                            // otherwise hide the part where the view lives if focused
                            layoutService.setPartHidden(true, getPartByLocation(viewLocation));
                        }
                    }
                    else {
                        viewsService.openView(viewDescriptor.id, true);
                    }
                }
            }));
            if (viewDescriptor.openCommandActionDescriptor.mnemonicTitle) {
                const defaultViewContainer = this.viewDescriptorService.getDefaultContainerById(viewDescriptor.id);
                if (defaultViewContainer) {
                    const defaultLocation = this.viewDescriptorService.getDefaultViewContainerLocation(defaultViewContainer);
                    disposables.add(MenuRegistry.appendMenuItem(MenuId.MenubarViewMenu, {
                        command: {
                            id: commandId,
                            title: viewDescriptor.openCommandActionDescriptor.mnemonicTitle,
                        },
                        group: defaultLocation === 0 /* ViewContainerLocation.Sidebar */
                            ? '3_sidebar'
                            : defaultLocation === 2 /* ViewContainerLocation.AuxiliaryBar */
                                ? '4_auxbar'
                                : '5_panel',
                        when: ContextKeyExpr.has(`${viewDescriptor.id}.active`),
                        order: viewDescriptor.openCommandActionDescriptor.order ?? Number.MAX_VALUE,
                    }));
                }
            }
        }
        return disposables;
    }
    registerFocusViewAction(viewDescriptor, category) {
        return registerAction2(class FocusViewAction extends Action2 {
            constructor() {
                const title = localize2({ key: 'focus view', comment: ['{0} indicates the name of the view to be focused.'] }, 'Focus on {0} View', viewDescriptor.name.value);
                super({
                    id: viewDescriptor.focusCommand
                        ? viewDescriptor.focusCommand.id
                        : `${viewDescriptor.id}.focus`,
                    title,
                    category,
                    menu: [
                        {
                            id: MenuId.CommandPalette,
                            when: viewDescriptor.when,
                        },
                    ],
                    keybinding: {
                        when: ContextKeyExpr.has(`${viewDescriptor.id}.active`),
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        primary: viewDescriptor.focusCommand?.keybindings?.primary,
                        secondary: viewDescriptor.focusCommand?.keybindings?.secondary,
                        linux: viewDescriptor.focusCommand?.keybindings?.linux,
                        mac: viewDescriptor.focusCommand?.keybindings?.mac,
                        win: viewDescriptor.focusCommand?.keybindings?.win,
                    },
                    metadata: {
                        description: title.value,
                        args: [
                            {
                                name: 'focusOptions',
                                description: 'Focus Options',
                                schema: {
                                    type: 'object',
                                    properties: {
                                        preserveFocus: {
                                            type: 'boolean',
                                            default: false,
                                        },
                                    },
                                },
                            },
                        ],
                    },
                });
            }
            run(accessor, options) {
                accessor.get(IViewsService).openView(viewDescriptor.id, !options?.preserveFocus);
            }
        });
    }
    registerResetViewLocationAction(viewDescriptor) {
        return registerAction2(class ResetViewLocationAction extends Action2 {
            constructor() {
                super({
                    id: `${viewDescriptor.id}.resetViewLocation`,
                    title: localize2('resetViewLocation', 'Reset Location'),
                    menu: [
                        {
                            id: MenuId.ViewTitleContext,
                            when: ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('view', viewDescriptor.id), ContextKeyExpr.equals(`${viewDescriptor.id}.defaultViewLocation`, false))),
                            group: '1_hide',
                            order: 2,
                        },
                    ],
                });
            }
            run(accessor) {
                const viewDescriptorService = accessor.get(IViewDescriptorService);
                const defaultContainer = viewDescriptorService.getDefaultContainerById(viewDescriptor.id);
                const containerModel = viewDescriptorService.getViewContainerModel(defaultContainer);
                // The default container is hidden so we should try to reset its location first
                if (defaultContainer.hideIfEmpty && containerModel.visibleViewDescriptors.length === 0) {
                    const defaultLocation = viewDescriptorService.getDefaultViewContainerLocation(defaultContainer);
                    viewDescriptorService.moveViewContainerToLocation(defaultContainer, defaultLocation, undefined, this.desc.id);
                }
                viewDescriptorService.moveViewsToContainer([viewDescriptor], defaultContainer, undefined, this.desc.id);
                accessor.get(IViewsService).openView(viewDescriptor.id, true);
            }
        });
    }
    registerPaneComposite(viewContainer, viewContainerLocation) {
        const that = this;
        let PaneContainer = class PaneContainer extends PaneComposite {
            constructor(telemetryService, contextService, storageService, instantiationService, themeService, contextMenuService, extensionService) {
                super(viewContainer.id, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService);
            }
            createViewPaneContainer(element) {
                const viewPaneContainerDisposables = this._register(new DisposableStore());
                // Use composite's instantiation service to get the editor progress service for any editors instantiated within the composite
                const viewPaneContainer = that.createViewPaneContainer(element, viewContainer, viewContainerLocation, viewPaneContainerDisposables, this.instantiationService);
                // Only updateTitleArea for non-filter views: microsoft/vscode-remote-release#3676
                if (!(viewPaneContainer instanceof FilterViewPaneContainer)) {
                    viewPaneContainerDisposables.add(Event.any(viewPaneContainer.onDidAddViews, viewPaneContainer.onDidRemoveViews, viewPaneContainer.onTitleAreaUpdate)(() => {
                        // Update title area since there is no better way to update secondary actions
                        this.updateTitleArea();
                    }));
                }
                return viewPaneContainer;
            }
        };
        PaneContainer = __decorate([
            __param(0, ITelemetryService),
            __param(1, IWorkspaceContextService),
            __param(2, IStorageService),
            __param(3, IInstantiationService),
            __param(4, IThemeService),
            __param(5, IContextMenuService),
            __param(6, IExtensionService)
        ], PaneContainer);
        Registry.as(getPaneCompositeExtension(viewContainerLocation)).registerPaneComposite(PaneCompositeDescriptor.create(PaneContainer, viewContainer.id, typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value, isString(viewContainer.icon) ? viewContainer.icon : undefined, viewContainer.order, viewContainer.requestedIndex, viewContainer.icon instanceof URI ? viewContainer.icon : undefined));
    }
    deregisterPaneComposite(viewContainer, viewContainerLocation) {
        Registry.as(getPaneCompositeExtension(viewContainerLocation)).deregisterPaneComposite(viewContainer.id);
    }
    createViewPaneContainer(element, viewContainer, viewContainerLocation, disposables, instantiationService) {
        const viewPaneContainer = instantiationService.createInstance(viewContainer.ctorDescriptor.ctor, ...(viewContainer.ctorDescriptor.staticArguments || []));
        this.viewPaneContainers.set(viewPaneContainer.getId(), viewPaneContainer);
        disposables.add(toDisposable(() => this.viewPaneContainers.delete(viewPaneContainer.getId())));
        disposables.add(viewPaneContainer.onDidAddViews((views) => this.onViewsAdded(views)));
        disposables.add(viewPaneContainer.onDidChangeViewVisibility((view) => this.onViewsVisibilityChanged(view, view.isBodyVisible())));
        disposables.add(viewPaneContainer.onDidRemoveViews((views) => this.onViewsRemoved(views)));
        disposables.add(viewPaneContainer.onDidFocusView((view) => {
            if (this.focusedViewContextKey.get() !== view.id) {
                this.focusedViewContextKey.set(view.id);
                this._onDidChangeFocusedView.fire();
            }
        }));
        disposables.add(viewPaneContainer.onDidBlurView((view) => {
            if (this.focusedViewContextKey.get() === view.id) {
                this.focusedViewContextKey.reset();
                this._onDidChangeFocusedView.fire();
            }
        }));
        return viewPaneContainer;
    }
};
ViewsService = __decorate([
    __param(0, IViewDescriptorService),
    __param(1, IPaneCompositePartService),
    __param(2, IContextKeyService),
    __param(3, IWorkbenchLayoutService),
    __param(4, IEditorService)
], ViewsService);
export { ViewsService };
function getEnabledViewContainerContextKey(viewContainerId) {
    return `viewContainer.${viewContainerId}.enabled`;
}
function getPaneCompositeExtension(viewContainerLocation) {
    switch (viewContainerLocation) {
        case 2 /* ViewContainerLocation.AuxiliaryBar */:
            return PaneCompositeExtensions.Auxiliary;
        case 1 /* ViewContainerLocation.Panel */:
            return PaneCompositeExtensions.Panels;
        case 0 /* ViewContainerLocation.Sidebar */:
        default:
            return PaneCompositeExtensions.Viewlets;
    }
}
export function getPartByLocation(viewContainerLocation) {
    switch (viewContainerLocation) {
        case 2 /* ViewContainerLocation.AuxiliaryBar */:
            return "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
        case 1 /* ViewContainerLocation.Panel */:
            return "workbench.parts.panel" /* Parts.PANEL_PART */;
        case 0 /* ViewContainerLocation.Sidebar */:
        default:
            return "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
    }
}
registerSingleton(IViewsService, ViewsService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdmlld3MvYnJvd3Nlci92aWV3c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLFVBQVUsRUFFVixZQUFZLEVBQ1osZUFBZSxFQUNmLGFBQWEsR0FDYixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixzQkFBc0IsR0FNdEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFDTixNQUFNLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFDUCxZQUFZLEdBQ1osTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENB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