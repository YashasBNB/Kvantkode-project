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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhbmVDb250YWluZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy92aWV3UGFuZUNvbnRhaW5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sQ0FBQyxFQUNELHFCQUFxQixFQUVyQixtQkFBbUIsRUFDbkIsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLEdBQ1YsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUd4RixPQUFPLEVBQW9CLFFBQVEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTlGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBbUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3RHLE9BQU8sRUFDTixPQUFPLEVBRVAsWUFBWSxFQUVaLE1BQU0sRUFDTixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sZ0RB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