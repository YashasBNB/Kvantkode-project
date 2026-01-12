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
import { $, addDisposableListener, DragAndDropObserver, EventType, getWindow, isAncestor, } from '../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { EventType as TouchEventType, Gesture } from '../../../../base/browser/touch.js';
import { PaneView } from '../../../../base/browser/ui/splitview/paneview.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { combinedDisposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import './media/paneviewlet.css';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, MenuRegistry, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { activeContrastBorder, asCssVariable, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { CompositeMenuActions } from '../../actions.js';
import { CompositeDragAndDropObserver, toggleDropEffect } from '../../dnd.js';
import { Component } from '../../../common/component.js';
import { PANEL_SECTION_BORDER, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_SECTION_HEADER_BACKGROUND, PANEL_SECTION_HEADER_BORDER, PANEL_SECTION_HEADER_FOREGROUND, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_SECTION_HEADER_BACKGROUND, SIDE_BAR_SECTION_HEADER_BORDER, SIDE_BAR_SECTION_HEADER_FOREGROUND, } from '../../../common/theme.js';
import { IViewDescriptorService, ViewContainerLocationToString, ViewVisibilityState, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { FocusedViewContext } from '../../../common/contextkeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { isHorizontal, IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const ViewsSubMenu = new MenuId('Views');
MenuRegistry.appendMenuItem(MenuId.ViewContainerTitle, {
    submenu: ViewsSubMenu,
    title: nls.localize('views', 'Views'),
    order: 1,
});
var DropDirection;
(function (DropDirection) {
    DropDirection[DropDirection["UP"] = 0] = "UP";
    DropDirection[DropDirection["DOWN"] = 1] = "DOWN";
    DropDirection[DropDirection["LEFT"] = 2] = "LEFT";
    DropDirection[DropDirection["RIGHT"] = 3] = "RIGHT";
})(DropDirection || (DropDirection = {}));
class ViewPaneDropOverlay extends Themable {
    static { this.OVERLAY_ID = 'monaco-pane-drop-overlay'; }
    get currentDropOperation() {
        return this._currentDropOperation;
    }
    constructor(paneElement, orientation, bounds, location, themeService) {
        super(themeService);
        this.paneElement = paneElement;
        this.orientation = orientation;
        this.bounds = bounds;
        this.location = location;
        this.cleanupOverlayScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));
        this.create();
    }
    get disposed() {
        return !!this._disposed;
    }
    create() {
        // Container
        this.container = $('div', { id: ViewPaneDropOverlay.OVERLAY_ID });
        this.container.style.top = '0px';
        // Parent
        this.paneElement.appendChild(this.container);
        this.paneElement.classList.add('dragged-over');
        this._register(toDisposable(() => {
            this.container.remove();
            this.paneElement.classList.remove('dragged-over');
        }));
        // Overlay
        this.overlay = $('.pane-overlay-indicator');
        this.container.appendChild(this.overlay);
        // Overlay Event Handling
        this.registerListeners();
        // Styles
        this.updateStyles();
    }
    updateStyles() {
        // Overlay drop background
        this.overlay.style.backgroundColor =
            this.getColor(this.location === 1 /* ViewContainerLocation.Panel */
                ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND
                : SIDE_BAR_DRAG_AND_DROP_BACKGROUND) || '';
        // Overlay contrast border (if any)
        const activeContrastBorderColor = this.getColor(activeContrastBorder);
        this.overlay.style.outlineColor = activeContrastBorderColor || '';
        this.overlay.style.outlineOffset = activeContrastBorderColor ? '-2px' : '';
        this.overlay.style.outlineStyle = activeContrastBorderColor ? 'dashed' : '';
        this.overlay.style.outlineWidth = activeContrastBorderColor ? '2px' : '';
        this.overlay.style.borderColor = activeContrastBorderColor || '';
        this.overlay.style.borderStyle = 'solid';
        this.overlay.style.borderWidth = '0px';
    }
    registerListeners() {
        this._register(new DragAndDropObserver(this.container, {
            onDragOver: (e) => {
                // Position overlay
                this.positionOverlay(e.offsetX, e.offsetY);
                // Make sure to stop any running cleanup scheduler to remove the overlay
                if (this.cleanupOverlayScheduler.isScheduled()) {
                    this.cleanupOverlayScheduler.cancel();
                }
            },
            onDragLeave: (e) => this.dispose(),
            onDragEnd: (e) => this.dispose(),
            onDrop: (e) => {
                // Dispose overlay
                this.dispose();
            },
        }));
        this._register(addDisposableListener(this.container, EventType.MOUSE_OVER, () => {
            // Under some circumstances we have seen reports where the drop overlay is not being
            // cleaned up and as such the editor area remains under the overlay so that you cannot
            // type into the editor anymore. This seems related to using VMs and DND via host and
            // guest OS, though some users also saw it without VMs.
            // To protect against this issue we always destroy the overlay as soon as we detect a
            // mouse event over it. The delay is used to guarantee we are not interfering with the
            // actual DROP event that can also trigger a mouse over event.
            if (!this.cleanupOverlayScheduler.isScheduled()) {
                this.cleanupOverlayScheduler.schedule();
            }
        }));
    }
    positionOverlay(mousePosX, mousePosY) {
        const paneWidth = this.paneElement.clientWidth;
        const paneHeight = this.paneElement.clientHeight;
        const splitWidthThreshold = paneWidth / 2;
        const splitHeightThreshold = paneHeight / 2;
        let dropDirection;
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            if (mousePosY < splitHeightThreshold) {
                dropDirection = 0 /* DropDirection.UP */;
            }
            else if (mousePosY >= splitHeightThreshold) {
                dropDirection = 1 /* DropDirection.DOWN */;
            }
        }
        else if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            if (mousePosX < splitWidthThreshold) {
                dropDirection = 2 /* DropDirection.LEFT */;
            }
            else if (mousePosX >= splitWidthThreshold) {
                dropDirection = 3 /* DropDirection.RIGHT */;
            }
        }
        // Draw overlay based on split direction
        switch (dropDirection) {
            case 0 /* DropDirection.UP */:
                this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '50%' });
                break;
            case 1 /* DropDirection.DOWN */:
                this.doPositionOverlay({ bottom: '0', left: '0', width: '100%', height: '50%' });
                break;
            case 2 /* DropDirection.LEFT */:
                this.doPositionOverlay({ top: '0', left: '0', width: '50%', height: '100%' });
                break;
            case 3 /* DropDirection.RIGHT */:
                this.doPositionOverlay({ top: '0', right: '0', width: '50%', height: '100%' });
                break;
            default: {
                // const top = this.bounds?.top || 0;
                // const left = this.bounds?.bottom || 0;
                let top = '0';
                let left = '0';
                let width = '100%';
                let height = '100%';
                if (this.bounds) {
                    const boundingRect = this.container.getBoundingClientRect();
                    top = `${this.bounds.top - boundingRect.top}px`;
                    left = `${this.bounds.left - boundingRect.left}px`;
                    height = `${this.bounds.bottom - this.bounds.top}px`;
                    width = `${this.bounds.right - this.bounds.left}px`;
                }
                this.doPositionOverlay({ top, left, width, height });
            }
        }
        if ((this.orientation === 0 /* Orientation.VERTICAL */ && paneHeight <= 25) ||
            (this.orientation === 1 /* Orientation.HORIZONTAL */ && paneWidth <= 25)) {
            this.doUpdateOverlayBorder(dropDirection);
        }
        else {
            this.doUpdateOverlayBorder(undefined);
        }
        // Make sure the overlay is visible now
        this.overlay.style.opacity = '1';
        // Enable transition after a timeout to prevent initial animation
        setTimeout(() => this.overlay.classList.add('overlay-move-transition'), 0);
        // Remember as current split direction
        this._currentDropOperation = dropDirection;
    }
    doUpdateOverlayBorder(direction) {
        this.overlay.style.borderTopWidth = direction === 0 /* DropDirection.UP */ ? '2px' : '0px';
        this.overlay.style.borderLeftWidth = direction === 2 /* DropDirection.LEFT */ ? '2px' : '0px';
        this.overlay.style.borderBottomWidth = direction === 1 /* DropDirection.DOWN */ ? '2px' : '0px';
        this.overlay.style.borderRightWidth = direction === 3 /* DropDirection.RIGHT */ ? '2px' : '0px';
    }
    doPositionOverlay(options) {
        // Container
        this.container.style.height = '100%';
        // Overlay
        this.overlay.style.top = options.top || '';
        this.overlay.style.left = options.left || '';
        this.overlay.style.bottom = options.bottom || '';
        this.overlay.style.right = options.right || '';
        this.overlay.style.width = options.width;
        this.overlay.style.height = options.height;
    }
    contains(element) {
        return element === this.container || element === this.overlay;
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
}
let ViewContainerMenuActions = class ViewContainerMenuActions extends CompositeMenuActions {
    constructor(element, viewContainer, viewDescriptorService, contextKeyService, menuService) {
        const scopedContextKeyService = contextKeyService.createScoped(element);
        scopedContextKeyService.createKey('viewContainer', viewContainer.id);
        const viewContainerLocationKey = scopedContextKeyService.createKey('viewContainerLocation', ViewContainerLocationToString(viewDescriptorService.getViewContainerLocation(viewContainer)));
        super(MenuId.ViewContainerTitle, MenuId.ViewContainerTitleContext, { shouldForwardArgs: true, renderShortTitle: true }, scopedContextKeyService, menuService);
        this._register(scopedContextKeyService);
        this._register(Event.filter(viewDescriptorService.onDidChangeContainerLocation, (e) => e.viewContainer === viewContainer)(() => viewContainerLocationKey.set(ViewContainerLocationToString(viewDescriptorService.getViewContainerLocation(viewContainer)))));
    }
};
ViewContainerMenuActions = __decorate([
    __param(2, IViewDescriptorService),
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], ViewContainerMenuActions);
let ViewPaneContainer = class ViewPaneContainer extends Component {
    get onDidSashChange() {
        return assertIsDefined(this.paneview).onDidSashChange;
    }
    get panes() {
        return this.paneItems.map((i) => i.pane);
    }
    get views() {
        return this.panes;
    }
    get length() {
        return this.paneItems.length;
    }
    get menuActions() {
        return this._menuActions;
    }
    constructor(id, options, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService) {
        super(id, themeService, storageService);
        this.options = options;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.layoutService = layoutService;
        this.contextMenuService = contextMenuService;
        this.telemetryService = telemetryService;
        this.extensionService = extensionService;
        this.storageService = storageService;
        this.contextService = contextService;
        this.viewDescriptorService = viewDescriptorService;
        this.logService = logService;
        this.paneItems = [];
        this.visible = false;
        this.areExtensionsReady = false;
        this.didLayout = false;
        this._onTitleAreaUpdate = this._register(new Emitter());
        this.onTitleAreaUpdate = this._onTitleAreaUpdate.event;
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDidAddViews = this._register(new Emitter());
        this.onDidAddViews = this._onDidAddViews.event;
        this._onDidRemoveViews = this._register(new Emitter());
        this.onDidRemoveViews = this._onDidRemoveViews.event;
        this._onDidChangeViewVisibility = this._register(new Emitter());
        this.onDidChangeViewVisibility = this._onDidChangeViewVisibility.event;
        this._onDidFocusView = this._register(new Emitter());
        this.onDidFocusView = this._onDidFocusView.event;
        this._onDidBlurView = this._register(new Emitter());
        this.onDidBlurView = this._onDidBlurView.event;
        const container = this.viewDescriptorService.getViewContainerById(id);
        if (!container) {
            throw new Error('Could not find container');
        }
        this.viewContainer = container;
        this.visibleViewsStorageId = `${id}.numberOfVisibleViews`;
        this.visibleViewsCountFromCache = this.storageService.getNumber(this.visibleViewsStorageId, 1 /* StorageScope.WORKSPACE */, undefined);
        this.viewContainerModel = this.viewDescriptorService.getViewContainerModel(container);
    }
    create(parent) {
        const options = this.options;
        options.orientation = this.orientation;
        this.paneview = this._register(new PaneView(parent, this.options));
        if (this._boundarySashes) {
            this.paneview.setBoundarySashes(this._boundarySashes);
        }
        this._register(this.paneview.onDidDrop(({ from, to }) => this.movePane(from, to)));
        this._register(this.paneview.onDidScroll((_) => this.onDidScrollPane()));
        this._register(this.paneview.onDidSashReset((index) => this.onDidSashReset(index)));
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, (e) => this.showContextMenu(new StandardMouseEvent(getWindow(parent), e))));
        this._register(Gesture.addTarget(parent));
        this._register(addDisposableListener(parent, TouchEventType.Contextmenu, (e) => this.showContextMenu(new StandardMouseEvent(getWindow(parent), e))));
        this._menuActions = this._register(this.instantiationService.createInstance(ViewContainerMenuActions, this.paneview.element, this.viewContainer));
        this._register(this._menuActions.onDidChange(() => this.updateTitleArea()));
        let overlay;
        const getOverlayBounds = () => {
            const fullSize = parent.getBoundingClientRect();
            const lastPane = this.panes[this.panes.length - 1].element.getBoundingClientRect();
            const top = this.orientation === 0 /* Orientation.VERTICAL */ ? lastPane.bottom : fullSize.top;
            const left = this.orientation === 1 /* Orientation.HORIZONTAL */ ? lastPane.right : fullSize.left;
            return {
                top,
                bottom: fullSize.bottom,
                left,
                right: fullSize.right,
            };
        };
        const inBounds = (bounds, pos) => {
            return (pos.x >= bounds.left &&
                pos.x <= bounds.right &&
                pos.y >= bounds.top &&
                pos.y <= bounds.bottom);
        };
        let bounds;
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(parent, {
            onDragEnter: (e) => {
                bounds = getOverlayBounds();
                if (overlay && overlay.disposed) {
                    overlay = undefined;
                }
                if (!overlay && inBounds(bounds, e.eventData)) {
                    const dropData = e.dragAndDropData.getData();
                    if (dropData.type === 'view') {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer &&
                            (!viewDescriptor ||
                                !viewDescriptor.canMoveView ||
                                this.viewContainer.rejectAddedViews)) {
                            return;
                        }
                        overlay = new ViewPaneDropOverlay(parent, undefined, bounds, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                    }
                    if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const viewsToMove = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (!viewsToMove.some((v) => !v.canMoveView) && viewsToMove.length > 0) {
                            overlay = new ViewPaneDropOverlay(parent, undefined, bounds, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                        }
                    }
                }
            },
            onDragOver: (e) => {
                if (overlay && overlay.disposed) {
                    overlay = undefined;
                }
                if (overlay && !inBounds(bounds, e.eventData)) {
                    overlay.dispose();
                    overlay = undefined;
                }
                if (inBounds(bounds, e.eventData)) {
                    toggleDropEffect(e.eventData.dataTransfer, 'move', overlay !== undefined);
                }
            },
            onDragLeave: (e) => {
                overlay?.dispose();
                overlay = undefined;
            },
            onDrop: (e) => {
                if (overlay) {
                    const dropData = e.dragAndDropData.getData();
                    const viewsToMove = [];
                    if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const allViews = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (!allViews.some((v) => !v.canMoveView)) {
                            viewsToMove.push(...allViews);
                        }
                    }
                    else if (dropData.type === 'view') {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer &&
                            viewDescriptor &&
                            viewDescriptor.canMoveView) {
                            this.viewDescriptorService.moveViewsToContainer([viewDescriptor], this.viewContainer, undefined, 'dnd');
                        }
                    }
                    const paneCount = this.panes.length;
                    if (viewsToMove.length > 0) {
                        this.viewDescriptorService.moveViewsToContainer(viewsToMove, this.viewContainer, undefined, 'dnd');
                    }
                    if (paneCount > 0) {
                        for (const view of viewsToMove) {
                            const paneToMove = this.panes.find((p) => p.id === view.id);
                            if (paneToMove) {
                                this.movePane(paneToMove, this.panes[this.panes.length - 1]);
                            }
                        }
                    }
                }
                overlay?.dispose();
                overlay = undefined;
            },
        }));
        this._register(this.onDidSashChange(() => this.saveViewSizes()));
        this._register(this.viewContainerModel.onDidAddVisibleViewDescriptors((added) => this.onDidAddViewDescriptors(added)));
        this._register(this.viewContainerModel.onDidRemoveVisibleViewDescriptors((removed) => this.onDidRemoveViewDescriptors(removed)));
        const addedViews = this.viewContainerModel.visibleViewDescriptors.map((viewDescriptor, index) => {
            const size = this.viewContainerModel.getSize(viewDescriptor.id);
            const collapsed = this.viewContainerModel.isCollapsed(viewDescriptor.id);
            return { viewDescriptor, index, size, collapsed };
        });
        if (addedViews.length) {
            this.onDidAddViewDescriptors(addedViews);
        }
        // Update headers after and title contributed views after available, since we read from cache in the beginning to know if the viewlet has single view or not. Ref #29609
        this.extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.areExtensionsReady = true;
            if (this.panes.length) {
                this.updateTitleArea();
                this.updateViewHeaders();
            }
            this._register(this.configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration("workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */)) {
                    this.updateViewHeaders();
                }
            }));
        });
        this._register(this.viewContainerModel.onDidChangeActiveViewDescriptors(() => this._onTitleAreaUpdate.fire()));
    }
    getTitle() {
        const containerTitle = this.viewContainerModel.title;
        if (this.isViewMergedWithContainer()) {
            const singleViewPaneContainerTitle = this.paneItems[0].pane.singleViewPaneContainerTitle;
            if (singleViewPaneContainerTitle) {
                return singleViewPaneContainerTitle;
            }
            const paneItemTitle = this.paneItems[0].pane.title;
            if (containerTitle === paneItemTitle) {
                return paneItemTitle;
            }
            return paneItemTitle ? `${containerTitle}: ${paneItemTitle}` : containerTitle;
        }
        return containerTitle;
    }
    showContextMenu(event) {
        for (const paneItem of this.paneItems) {
            // Do not show context menu if target is coming from inside pane views
            if (isAncestor(event.target, paneItem.pane.element)) {
                return;
            }
        }
        event.stopPropagation();
        event.preventDefault();
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => this.menuActions?.getContextMenuActions() ?? [],
        });
    }
    getActionsContext() {
        if (this.isViewMergedWithContainer()) {
            return this.panes[0].getActionsContext();
        }
        return undefined;
    }
    getActionViewItem(action, options) {
        if (this.isViewMergedWithContainer()) {
            return this.paneItems[0].pane.createActionViewItem(action, options);
        }
        return createActionViewItem(this.instantiationService, action, options);
    }
    focus() {
        let paneToFocus = undefined;
        if (this.lastFocusedPane) {
            paneToFocus = this.lastFocusedPane;
        }
        else if (this.paneItems.length > 0) {
            for (const { pane } of this.paneItems) {
                if (pane.isExpanded()) {
                    paneToFocus = pane;
                    break;
                }
            }
        }
        if (paneToFocus) {
            paneToFocus.focus();
        }
    }
    get orientation() {
        switch (this.viewDescriptorService.getViewContainerLocation(this.viewContainer)) {
            case 0 /* ViewContainerLocation.Sidebar */:
            case 2 /* ViewContainerLocation.AuxiliaryBar */:
                return 0 /* Orientation.VERTICAL */;
            case 1 /* ViewContainerLocation.Panel */: {
                return isHorizontal(this.layoutService.getPanelPosition())
                    ? 1 /* Orientation.HORIZONTAL */
                    : 0 /* Orientation.VERTICAL */;
            }
        }
        return 0 /* Orientation.VERTICAL */;
    }
    layout(dimension) {
        if (this.paneview) {
            if (this.paneview.orientation !== this.orientation) {
                this.paneview.flipOrientation(dimension.height, dimension.width);
            }
            this.paneview.layout(dimension.height, dimension.width);
        }
        this.dimension = dimension;
        if (this.didLayout) {
            this.saveViewSizes();
        }
        else {
            this.didLayout = true;
            this.restoreViewSizes();
        }
    }
    setBoundarySashes(sashes) {
        this._boundarySashes = sashes;
        this.paneview?.setBoundarySashes(sashes);
    }
    getOptimalWidth() {
        const additionalMargin = 16;
        const optimalWidth = Math.max(...this.panes.map((view) => view.getOptimalWidth() || 0));
        return optimalWidth + additionalMargin;
    }
    addPanes(panes) {
        const wasMerged = this.isViewMergedWithContainer();
        for (const { pane, size, index, disposable } of panes) {
            this.addPane(pane, size, disposable, index);
        }
        this.updateViewHeaders();
        if (this.isViewMergedWithContainer() !== wasMerged) {
            this.updateTitleArea();
        }
        this._onDidAddViews.fire(panes.map(({ pane }) => pane));
    }
    setVisible(visible) {
        if (this.visible !== !!visible) {
            this.visible = visible;
            this._onDidChangeVisibility.fire(visible);
        }
        this.panes
            .filter((view) => view.isVisible() !== visible)
            .map((view) => view.setVisible(visible));
    }
    isVisible() {
        return this.visible;
    }
    updateTitleArea() {
        this._onTitleAreaUpdate.fire();
    }
    createView(viewDescriptor, options) {
        return this.instantiationService.createInstance(viewDescriptor.ctorDescriptor.ctor, ...(viewDescriptor.ctorDescriptor.staticArguments || []), options);
    }
    getView(id) {
        return this.panes.filter((view) => view.id === id)[0];
    }
    saveViewSizes() {
        // Save size only when the layout has happened
        if (this.didLayout) {
            this.viewContainerModel.setSizes(this.panes.map((view) => ({ id: view.id, size: this.getPaneSize(view) })));
        }
    }
    restoreViewSizes() {
        // Restore sizes only when the layout has happened
        if (this.didLayout) {
            let initialSizes;
            for (let i = 0; i < this.viewContainerModel.visibleViewDescriptors.length; i++) {
                const pane = this.panes[i];
                const viewDescriptor = this.viewContainerModel.visibleViewDescriptors[i];
                const size = this.viewContainerModel.getSize(viewDescriptor.id);
                if (typeof size === 'number') {
                    this.resizePane(pane, size);
                }
                else {
                    initialSizes = initialSizes ? initialSizes : this.computeInitialSizes();
                    this.resizePane(pane, initialSizes.get(pane.id) || 200);
                }
            }
        }
    }
    computeInitialSizes() {
        const sizes = new Map();
        if (this.dimension) {
            const totalWeight = this.viewContainerModel.visibleViewDescriptors.reduce((totalWeight, { weight }) => totalWeight + (weight || 20), 0);
            for (const viewDescriptor of this.viewContainerModel.visibleViewDescriptors) {
                if (this.orientation === 0 /* Orientation.VERTICAL */) {
                    sizes.set(viewDescriptor.id, (this.dimension.height * (viewDescriptor.weight || 20)) / totalWeight);
                }
                else {
                    sizes.set(viewDescriptor.id, (this.dimension.width * (viewDescriptor.weight || 20)) / totalWeight);
                }
            }
        }
        return sizes;
    }
    saveState() {
        this.panes.forEach((view) => view.saveState());
        this.storageService.store(this.visibleViewsStorageId, this.length, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    onContextMenu(event, viewPane) {
        event.stopPropagation();
        event.preventDefault();
        const actions = viewPane.menuActions.getContextMenuActions();
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => actions,
        });
    }
    openView(id, focus) {
        let view = this.getView(id);
        if (!view) {
            this.toggleViewVisibility(id);
        }
        view = this.getView(id);
        if (view) {
            view.setExpanded(true);
            if (focus) {
                view.focus();
            }
        }
        return view;
    }
    onDidAddViewDescriptors(added) {
        const panesToAdd = [];
        for (const { viewDescriptor, collapsed, index, size } of added) {
            const pane = this.createView(viewDescriptor, {
                id: viewDescriptor.id,
                title: viewDescriptor.name.value,
                fromExtensionId: viewDescriptor.extensionId,
                expanded: !collapsed,
                singleViewPaneContainerTitle: viewDescriptor.singleViewPaneContainerTitle,
            });
            try {
                pane.render();
            }
            catch (error) {
                this.logService.error(`Fail to render view ${viewDescriptor.id}`, error);
                continue;
            }
            if (pane.draggableElement) {
                const contextMenuDisposable = addDisposableListener(pane.draggableElement, 'contextmenu', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.onContextMenu(new StandardMouseEvent(getWindow(pane.draggableElement), e), pane);
                });
                const collapseDisposable = Event.latch(Event.map(pane.onDidChange, () => !pane.isExpanded()))((collapsed) => {
                    this.viewContainerModel.setCollapsed(viewDescriptor.id, collapsed);
                });
                panesToAdd.push({
                    pane,
                    size: size || pane.minimumSize,
                    index,
                    disposable: combinedDisposable(contextMenuDisposable, collapseDisposable),
                });
            }
        }
        this.addPanes(panesToAdd);
        this.restoreViewSizes();
        const panes = [];
        for (const { pane } of panesToAdd) {
            pane.setVisible(this.isVisible());
            panes.push(pane);
        }
        return panes;
    }
    onDidRemoveViewDescriptors(removed) {
        removed = removed.sort((a, b) => b.index - a.index);
        const panesToRemove = [];
        for (const { index } of removed) {
            const paneItem = this.paneItems[index];
            if (paneItem) {
                panesToRemove.push(this.paneItems[index].pane);
            }
        }
        if (panesToRemove.length) {
            this.removePanes(panesToRemove);
            for (const pane of panesToRemove) {
                pane.setVisible(false);
            }
        }
    }
    toggleViewVisibility(viewId) {
        // Check if view is active
        if (this.viewContainerModel.activeViewDescriptors.some((viewDescriptor) => viewDescriptor.id === viewId)) {
            const visible = !this.viewContainerModel.isVisible(viewId);
            this.viewContainerModel.setVisible(viewId, visible);
        }
    }
    addPane(pane, size, disposable, index = this.paneItems.length - 1) {
        const onDidFocus = pane.onDidFocus(() => {
            this._onDidFocusView.fire(pane);
            this.lastFocusedPane = pane;
        });
        const onDidBlur = pane.onDidBlur(() => this._onDidBlurView.fire(pane));
        const onDidChangeTitleArea = pane.onDidChangeTitleArea(() => {
            if (this.isViewMergedWithContainer()) {
                this.updateTitleArea();
            }
        });
        const onDidChangeVisibility = pane.onDidChangeBodyVisibility(() => this._onDidChangeViewVisibility.fire(pane));
        const onDidChange = pane.onDidChange(() => {
            if (pane === this.lastFocusedPane && !pane.isExpanded()) {
                this.lastFocusedPane = undefined;
            }
        });
        const isPanel = this.viewDescriptorService.getViewContainerLocation(this.viewContainer) ===
            1 /* ViewContainerLocation.Panel */;
        pane.style({
            headerForeground: asCssVariable(isPanel ? PANEL_SECTION_HEADER_FOREGROUND : SIDE_BAR_SECTION_HEADER_FOREGROUND),
            headerBackground: asCssVariable(isPanel ? PANEL_SECTION_HEADER_BACKGROUND : SIDE_BAR_SECTION_HEADER_BACKGROUND),
            headerBorder: asCssVariable(isPanel ? PANEL_SECTION_HEADER_BORDER : SIDE_BAR_SECTION_HEADER_BORDER),
            dropBackground: asCssVariable(isPanel ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND),
            leftBorder: isPanel ? asCssVariable(PANEL_SECTION_BORDER) : undefined,
        });
        const store = new DisposableStore();
        store.add(disposable);
        store.add(combinedDisposable(pane, onDidFocus, onDidBlur, onDidChangeTitleArea, onDidChange, onDidChangeVisibility));
        const paneItem = { pane, disposable: store };
        this.paneItems.splice(index, 0, paneItem);
        assertIsDefined(this.paneview).addPane(pane, size, index);
        let overlay;
        if (pane.draggableElement) {
            store.add(CompositeDragAndDropObserver.INSTANCE.registerDraggable(pane.draggableElement, () => {
                return { type: 'view', id: pane.id };
            }, {}));
        }
        store.add(CompositeDragAndDropObserver.INSTANCE.registerTarget(pane.dropTargetElement, {
            onDragEnter: (e) => {
                if (!overlay) {
                    const dropData = e.dragAndDropData.getData();
                    if (dropData.type === 'view' && dropData.id !== pane.id) {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer &&
                            (!viewDescriptor ||
                                !viewDescriptor.canMoveView ||
                                this.viewContainer.rejectAddedViews)) {
                            return;
                        }
                        overlay = new ViewPaneDropOverlay(pane.dropTargetElement, this.orientation ?? 0 /* Orientation.VERTICAL */, undefined, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                    }
                    if (dropData.type === 'composite' &&
                        dropData.id !== this.viewContainer.id &&
                        !this.viewContainer.rejectAddedViews) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const viewsToMove = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (!viewsToMove.some((v) => !v.canMoveView) && viewsToMove.length > 0) {
                            overlay = new ViewPaneDropOverlay(pane.dropTargetElement, this.orientation ?? 0 /* Orientation.VERTICAL */, undefined, this.viewDescriptorService.getViewContainerLocation(this.viewContainer), this.themeService);
                        }
                    }
                }
            },
            onDragOver: (e) => {
                toggleDropEffect(e.eventData.dataTransfer, 'move', overlay !== undefined);
            },
            onDragLeave: (e) => {
                overlay?.dispose();
                overlay = undefined;
            },
            onDrop: (e) => {
                if (overlay) {
                    const dropData = e.dragAndDropData.getData();
                    const viewsToMove = [];
                    let anchorView;
                    if (dropData.type === 'composite' &&
                        dropData.id !== this.viewContainer.id &&
                        !this.viewContainer.rejectAddedViews) {
                        const container = this.viewDescriptorService.getViewContainerById(dropData.id);
                        const allViews = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
                        if (allViews.length > 0 && !allViews.some((v) => !v.canMoveView)) {
                            viewsToMove.push(...allViews);
                            anchorView = allViews[0];
                        }
                    }
                    else if (dropData.type === 'view') {
                        const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
                        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
                        if (oldViewContainer !== this.viewContainer &&
                            viewDescriptor &&
                            viewDescriptor.canMoveView &&
                            !this.viewContainer.rejectAddedViews) {
                            viewsToMove.push(viewDescriptor);
                        }
                        if (viewDescriptor) {
                            anchorView = viewDescriptor;
                        }
                    }
                    if (viewsToMove) {
                        this.viewDescriptorService.moveViewsToContainer(viewsToMove, this.viewContainer, undefined, 'dnd');
                    }
                    if (anchorView) {
                        if (overlay.currentDropOperation === 1 /* DropDirection.DOWN */ ||
                            overlay.currentDropOperation === 3 /* DropDirection.RIGHT */) {
                            const fromIndex = this.panes.findIndex((p) => p.id === anchorView.id);
                            let toIndex = this.panes.findIndex((p) => p.id === pane.id);
                            if (fromIndex >= 0 && toIndex >= 0) {
                                if (fromIndex > toIndex) {
                                    toIndex++;
                                }
                                if (toIndex < this.panes.length && toIndex !== fromIndex) {
                                    this.movePane(this.panes[fromIndex], this.panes[toIndex]);
                                }
                            }
                        }
                        if (overlay.currentDropOperation === 0 /* DropDirection.UP */ ||
                            overlay.currentDropOperation === 2 /* DropDirection.LEFT */) {
                            const fromIndex = this.panes.findIndex((p) => p.id === anchorView.id);
                            let toIndex = this.panes.findIndex((p) => p.id === pane.id);
                            if (fromIndex >= 0 && toIndex >= 0) {
                                if (fromIndex < toIndex) {
                                    toIndex--;
                                }
                                if (toIndex >= 0 && toIndex !== fromIndex) {
                                    this.movePane(this.panes[fromIndex], this.panes[toIndex]);
                                }
                            }
                        }
                        if (viewsToMove.length > 1) {
                            viewsToMove.slice(1).forEach((view) => {
                                let toIndex = this.panes.findIndex((p) => p.id === anchorView.id);
                                const fromIndex = this.panes.findIndex((p) => p.id === view.id);
                                if (fromIndex >= 0 && toIndex >= 0) {
                                    if (fromIndex > toIndex) {
                                        toIndex++;
                                    }
                                    if (toIndex < this.panes.length && toIndex !== fromIndex) {
                                        this.movePane(this.panes[fromIndex], this.panes[toIndex]);
                                        anchorView = view;
                                    }
                                }
                            });
                        }
                    }
                }
                overlay?.dispose();
                overlay = undefined;
            },
        }));
    }
    removePanes(panes) {
        const wasMerged = this.isViewMergedWithContainer();
        panes.forEach((pane) => this.removePane(pane));
        this.updateViewHeaders();
        if (wasMerged !== this.isViewMergedWithContainer()) {
            this.updateTitleArea();
        }
        this._onDidRemoveViews.fire(panes);
    }
    removePane(pane) {
        const index = this.paneItems.findIndex((i) => i.pane === pane);
        if (index === -1) {
            return;
        }
        if (this.lastFocusedPane === pane) {
            this.lastFocusedPane = undefined;
        }
        assertIsDefined(this.paneview).removePane(pane);
        const [paneItem] = this.paneItems.splice(index, 1);
        paneItem.disposable.dispose();
    }
    movePane(from, to) {
        const fromIndex = this.paneItems.findIndex((item) => item.pane === from);
        const toIndex = this.paneItems.findIndex((item) => item.pane === to);
        const fromViewDescriptor = this.viewContainerModel.visibleViewDescriptors[fromIndex];
        const toViewDescriptor = this.viewContainerModel.visibleViewDescriptors[toIndex];
        if (fromIndex < 0 || fromIndex >= this.paneItems.length) {
            return;
        }
        if (toIndex < 0 || toIndex >= this.paneItems.length) {
            return;
        }
        const [paneItem] = this.paneItems.splice(fromIndex, 1);
        this.paneItems.splice(toIndex, 0, paneItem);
        assertIsDefined(this.paneview).movePane(from, to);
        this.viewContainerModel.move(fromViewDescriptor.id, toViewDescriptor.id);
        this.updateTitleArea();
    }
    resizePane(pane, size) {
        assertIsDefined(this.paneview).resizePane(pane, size);
    }
    getPaneSize(pane) {
        return assertIsDefined(this.paneview).getPaneSize(pane);
    }
    updateViewHeaders() {
        if (this.isViewMergedWithContainer()) {
            if (this.paneItems[0].pane.isExpanded()) {
                this.lastMergedCollapsedPane = undefined;
            }
            else {
                this.lastMergedCollapsedPane = this.paneItems[0].pane;
                this.paneItems[0].pane.setExpanded(true);
            }
            this.paneItems[0].pane.headerVisible = false;
            this.paneItems[0].pane.collapsible = true;
        }
        else {
            if (this.paneItems.length === 1) {
                this.paneItems[0].pane.headerVisible = true;
                if (this.paneItems[0].pane === this.lastMergedCollapsedPane) {
                    this.paneItems[0].pane.setExpanded(false);
                }
                this.paneItems[0].pane.collapsible = false;
            }
            else {
                this.paneItems.forEach((i) => {
                    i.pane.headerVisible = true;
                    i.pane.collapsible = true;
                    if (i.pane === this.lastMergedCollapsedPane) {
                        i.pane.setExpanded(false);
                    }
                });
            }
            this.lastMergedCollapsedPane = undefined;
        }
    }
    isViewMergedWithContainer() {
        if (!(this.options.mergeViewWithContainerWhenSingleView && this.paneItems.length === 1)) {
            return false;
        }
        if (!this.areExtensionsReady) {
            if (this.visibleViewsCountFromCache === undefined) {
                return this.paneItems[0].pane.isExpanded();
            }
            // Check in cache so that view do not jump. See #29609
            return this.visibleViewsCountFromCache === 1;
        }
        return true;
    }
    onDidScrollPane() {
        for (const pane of this.panes) {
            pane.onDidScrollRoot();
        }
    }
    onDidSashReset(index) {
        let firstPane = undefined;
        let secondPane = undefined;
        // Deal with collapsed views: to be clever, we split the space taken by the nearest uncollapsed views
        for (let i = index; i >= 0; i--) {
            if (this.paneItems[i].pane?.isVisible() && this.paneItems[i]?.pane.isExpanded()) {
                firstPane = this.paneItems[i].pane;
                break;
            }
        }
        for (let i = index + 1; i < this.paneItems.length; i++) {
            if (this.paneItems[i].pane?.isVisible() && this.paneItems[i]?.pane.isExpanded()) {
                secondPane = this.paneItems[i].pane;
                break;
            }
        }
        if (firstPane && secondPane) {
            const firstPaneSize = this.getPaneSize(firstPane);
            const secondPaneSize = this.getPaneSize(secondPane);
            // Avoid rounding errors and be consistent when resizing
            // The first pane always get half rounded up and the second is half rounded down
            const newFirstPaneSize = Math.ceil((firstPaneSize + secondPaneSize) / 2);
            const newSecondPaneSize = Math.floor((firstPaneSize + secondPaneSize) / 2);
            // Shrink the larger pane first, then grow the smaller pane
            // This prevents interfering with other view sizes
            if (firstPaneSize > secondPaneSize) {
                this.resizePane(firstPane, newFirstPaneSize);
                this.resizePane(secondPane, newSecondPaneSize);
            }
            else {
                this.resizePane(secondPane, newSecondPaneSize);
                this.resizePane(firstPane, newFirstPaneSize);
            }
        }
    }
    dispose() {
        super.dispose();
        this.paneItems.forEach((i) => i.disposable.dispose());
        if (this.paneview) {
            this.paneview.dispose();
        }
    }
};
ViewPaneContainer = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IContextMenuService),
    __param(6, ITelemetryService),
    __param(7, IExtensionService),
    __param(8, IThemeService),
    __param(9, IStorageService),
    __param(10, IWorkspaceContextService),
    __param(11, IViewDescriptorService),
    __param(12, ILogService)
], ViewPaneContainer);
export { ViewPaneContainer };
export class ViewPaneContainerAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.desc = desc;
    }
    run(accessor, ...args) {
        const viewPaneContainer = accessor
            .get(IViewsService)
            .getActiveViewPaneContainerWithId(this.desc.viewPaneContainerId);
        if (viewPaneContainer) {
            return this.runInViewPaneContainer(accessor, viewPaneContainer, ...args);
        }
        return undefined;
    }
}
class MoveViewPosition extends Action2 {
    constructor(desc, offset) {
        super(desc);
        this.offset = offset;
    }
    async run(accessor) {
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const contextKeyService = accessor.get(IContextKeyService);
        const viewId = FocusedViewContext.getValue(contextKeyService);
        if (viewId === undefined) {
            return;
        }
        const viewContainer = viewDescriptorService.getViewContainerByViewId(viewId);
        const model = viewDescriptorService.getViewContainerModel(viewContainer);
        const viewDescriptor = model.visibleViewDescriptors.find((vd) => vd.id === viewId);
        const currentIndex = model.visibleViewDescriptors.indexOf(viewDescriptor);
        if (currentIndex + this.offset < 0 ||
            currentIndex + this.offset >= model.visibleViewDescriptors.length) {
            return;
        }
        const newPosition = model.visibleViewDescriptors[currentIndex + this.offset];
        model.move(viewDescriptor.id, newPosition.id);
    }
}
registerAction2(class MoveViewUp extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewUp',
            title: nls.localize('viewMoveUp', 'Move View Up'),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 16 /* KeyCode.UpArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo(''),
            },
        }, -1);
    }
});
registerAction2(class MoveViewLeft extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewLeft',
            title: nls.localize('viewMoveLeft', 'Move View Left'),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 15 /* KeyCode.LeftArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo(''),
            },
        }, -1);
    }
});
registerAction2(class MoveViewDown extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewDown',
            title: nls.localize('viewMoveDown', 'Move View Down'),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 18 /* KeyCode.DownArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo(''),
            },
        }, 1);
    }
});
registerAction2(class MoveViewRight extends MoveViewPosition {
    constructor() {
        super({
            id: 'views.moveViewRight',
            title: nls.localize('viewMoveRight', 'Move View Right'),
            keybinding: {
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ + 41 /* KeyCode.KeyK */, 17 /* KeyCode.RightArrow */),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                when: FocusedViewContext.notEqualsTo(''),
            },
        }, 1);
    }
});
registerAction2(class MoveViews extends Action2 {
    constructor() {
        super({
            id: 'vscode.moveViews',
            title: nls.localize('viewsMove', 'Move Views'),
        });
    }
    async run(accessor, options) {
        if (!Array.isArray(options?.viewIds) || typeof options?.destinationId !== 'string') {
            return Promise.reject('Invalid arguments');
        }
        const viewDescriptorService = accessor.get(IViewDescriptorService);
        const destination = viewDescriptorService.getViewContainerById(options.destinationId);
        if (!destination) {
            return;
        }
        // FYI, don't use `moveViewsToContainer` in 1 shot, because it expects all views to have the same current location
        for (const viewId of options.viewIds) {
            const viewDescriptor = viewDescriptorService.getViewDescriptorById(viewId);
            if (viewDescriptor?.canMoveView) {
                viewDescriptorService.moveViewsToContainer([viewDescriptor], destination, ViewVisibilityState.Default, this.desc.id);
            }
        }
        await accessor.get(IViewsService).openViewContainer(destination.id, true);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhbmVDb250YWluZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3ZpZXdzL3ZpZXdQYW5lQ29udGFpbmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBRXJCLG1CQUFtQixFQUNuQixTQUFTLEVBQ1QsU0FBUyxFQUNULFVBQVUsR0FDVixNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR3hGLE9BQU8sRUFBb0IsUUFBUSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFBO0FBQy9FLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDdEcsT0FBTyxFQUNOLE9BQU8sRUFFUCxZQUFZLEVBRVosTUFBTSxFQUNOLFlBQVksRUFDWixlQUFlLEdBQ2YsTUFB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