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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ZpZXdzL2Jyb3dzZXIvdmlld3NTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixVQUFVLEVBRVYsWUFBWSxFQUNaLGVBQWUsRUFDZixhQUFhLEdBQ2IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sc0JBQXNCLEdBTXRCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sTUFBTSxFQUNOLGVBQWUsRUFDZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUV4RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FB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