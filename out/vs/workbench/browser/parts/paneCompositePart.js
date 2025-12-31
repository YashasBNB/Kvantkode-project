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
var AbstractPaneCompositePart_1;
import './media/paneCompositePart.css';
import { Event } from '../../../base/common/event.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { Extensions, } from '../panecomposite.js';
import { IViewDescriptorService } from '../../common/views.js';
import { DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { IWorkbenchLayoutService } from '../../services/layout/browser/layoutService.js';
import { CompositePart } from './compositePart.js';
import { PaneCompositeBar } from './paneCompositeBar.js';
import { Dimension, EventHelper, trackFocus, $, addDisposableListener, EventType, prepend, getWindow, } from '../../../base/browser/dom.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { localize } from '../../../nls.js';
import { CompositeDragAndDropObserver, toggleDropEffect } from '../dnd.js';
import { EDITOR_DRAG_AND_DROP_BACKGROUND } from '../../common/theme.js';
import { CompositeMenuActions } from '../actions.js';
import { IMenuService, MenuId } from '../../../platform/actions/common/actions.js';
import { prepareActions } from '../../../base/browser/ui/actionbar/actionbar.js';
import { Gesture, EventType as GestureEventType } from '../../../base/browser/touch.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { SubmenuAction } from '../../../base/common/actions.js';
import { ViewsSubMenu } from './views/viewPaneContainer.js';
import { getActionBarActions } from '../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IHoverService } from '../../../platform/hover/browser/hover.js';
import { WorkbenchToolBar } from '../../../platform/actions/browser/toolbar.js';
export var CompositeBarPosition;
(function (CompositeBarPosition) {
    CompositeBarPosition[CompositeBarPosition["TOP"] = 0] = "TOP";
    CompositeBarPosition[CompositeBarPosition["TITLE"] = 1] = "TITLE";
    CompositeBarPosition[CompositeBarPosition["BOTTOM"] = 2] = "BOTTOM";
})(CompositeBarPosition || (CompositeBarPosition = {}));
let AbstractPaneCompositePart = class AbstractPaneCompositePart extends CompositePart {
    static { AbstractPaneCompositePart_1 = this; }
    static { this.MIN_COMPOSITE_BAR_WIDTH = 50; }
    get snap() {
        // Always allow snapping closed
        // Only allow dragging open if the panel contains view containers
        return (this.layoutService.isVisible(this.partId) ||
            !!this.paneCompositeBar.value?.getVisiblePaneCompositeIds().length);
    }
    get onDidPaneCompositeOpen() {
        return Event.map(this.onDidCompositeOpen.event, (compositeEvent) => compositeEvent.composite);
    }
    constructor(partId, partOptions, activePaneCompositeSettingsKey, activePaneContextKey, paneFocusContextKey, nameForTelemetry, compositeCSSClass, titleForegroundColor, titleBorderColor, notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, viewDescriptorService, contextKeyService, extensionService, menuService) {
        let location = 0 /* ViewContainerLocation.Sidebar */;
        let registryId = Extensions.Viewlets;
        let globalActionsMenuId = MenuId.SidebarTitle;
        if (partId === "workbench.parts.panel" /* Parts.PANEL_PART */) {
            location = 1 /* ViewContainerLocation.Panel */;
            registryId = Extensions.Panels;
            globalActionsMenuId = MenuId.PanelTitle;
        }
        else if (partId === "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */) {
            location = 2 /* ViewContainerLocation.AuxiliaryBar */;
            registryId = Extensions.Auxiliary;
            globalActionsMenuId = MenuId.AuxiliaryBarTitle;
        }
        super(notificationService, storageService, contextMenuService, layoutService, keybindingService, hoverService, instantiationService, themeService, Registry.as(registryId), activePaneCompositeSettingsKey, viewDescriptorService.getDefaultViewContainer(location)?.id || '', nameForTelemetry, compositeCSSClass, titleForegroundColor, titleBorderColor, partId, partOptions);
        this.partId = partId;
        this.activePaneContextKey = activePaneContextKey;
        this.paneFocusContextKey = paneFocusContextKey;
        this.viewDescriptorService = viewDescriptorService;
        this.contextKeyService = contextKeyService;
        this.extensionService = extensionService;
        this.menuService = menuService;
        this.onDidPaneCompositeClose = this.onDidCompositeClose.event;
        this.headerFooterCompositeBarDispoables = this._register(new DisposableStore());
        this.paneCompositeBar = this._register(new MutableDisposable());
        this.compositeBarPosition = undefined;
        this.blockOpening = false;
        this.location = location;
        this.globalActions = this._register(this.instantiationService.createInstance(CompositeMenuActions, globalActionsMenuId, undefined, undefined));
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.onDidPaneCompositeOpen((composite) => this.onDidOpen(composite)));
        this._register(this.onDidPaneCompositeClose(this.onDidClose, this));
        this._register(this.globalActions.onDidChange(() => this.updateGlobalToolbarActions()));
        this._register(this.registry.onDidDeregister((viewletDescriptor) => {
            const activeContainers = this.viewDescriptorService
                .getViewContainersByLocation(this.location)
                .filter((container) => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors
                .length > 0);
            if (activeContainers.length) {
                if (this.getActiveComposite()?.getId() === viewletDescriptor.id) {
                    const defaultViewletId = this.viewDescriptorService.getDefaultViewContainer(this.location)?.id;
                    const containerToOpen = activeContainers.filter((c) => c.id === defaultViewletId)[0] || activeContainers[0];
                    this.doOpenPaneComposite(containerToOpen.id);
                }
            }
            else {
                this.layoutService.setPartHidden(true, this.partId);
            }
            this.removeComposite(viewletDescriptor.id);
        }));
        this._register(this.extensionService.onDidRegisterExtensions(() => {
            this.layoutCompositeBar();
        }));
    }
    onDidOpen(composite) {
        this.activePaneContextKey.set(composite.getId());
    }
    onDidClose(composite) {
        const id = composite.getId();
        if (this.activePaneContextKey.get() === id) {
            this.activePaneContextKey.reset();
        }
    }
    showComposite(composite) {
        super.showComposite(composite);
        this.layoutCompositeBar();
        this.layoutEmptyMessage();
    }
    hideActiveComposite() {
        const composite = super.hideActiveComposite();
        this.layoutCompositeBar();
        this.layoutEmptyMessage();
        return composite;
    }
    create(parent) {
        this.element = parent;
        this.element.classList.add('pane-composite-part');
        super.create(parent);
        const contentArea = this.getContentArea();
        if (contentArea) {
            this.createEmptyPaneMessage(contentArea);
        }
        this.updateCompositeBar();
        const focusTracker = this._register(trackFocus(parent));
        this._register(focusTracker.onDidFocus(() => this.paneFocusContextKey.set(true)));
        this._register(focusTracker.onDidBlur(() => this.paneFocusContextKey.set(false)));
    }
    createEmptyPaneMessage(parent) {
        this.emptyPaneMessageElement = $('.empty-pane-message-area');
        const messageElement = $('.empty-pane-message');
        messageElement.innerText = localize('pane.emptyMessage', 'Drag a view here to display.');
        this.emptyPaneMessageElement.appendChild(messageElement);
        parent.appendChild(this.emptyPaneMessageElement);
        const setDropBackgroundFeedback = (visible) => {
            const updateActivityBarBackground = !this.getActiveComposite() || !visible;
            const backgroundColor = visible
                ? this.theme.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND)?.toString() || ''
                : '';
            if (this.titleContainer && updateActivityBarBackground) {
                this.titleContainer.style.backgroundColor = backgroundColor;
            }
            if (this.headerFooterCompositeBarContainer && updateActivityBarBackground) {
                this.headerFooterCompositeBarContainer.style.backgroundColor = backgroundColor;
            }
            this.emptyPaneMessageElement.style.backgroundColor = backgroundColor;
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(this.element, {
            onDragOver: (e) => {
                EventHelper.stop(e.eventData, true);
                if (this.paneCompositeBar.value) {
                    const validDropTarget = this.paneCompositeBar.value.dndHandler.onDragEnter(e.dragAndDropData, undefined, e.eventData);
                    toggleDropEffect(e.eventData.dataTransfer, 'move', validDropTarget);
                }
            },
            onDragEnter: (e) => {
                EventHelper.stop(e.eventData, true);
                if (this.paneCompositeBar.value) {
                    const validDropTarget = this.paneCompositeBar.value.dndHandler.onDragEnter(e.dragAndDropData, undefined, e.eventData);
                    setDropBackgroundFeedback(validDropTarget);
                }
            },
            onDragLeave: (e) => {
                EventHelper.stop(e.eventData, true);
                setDropBackgroundFeedback(false);
            },
            onDragEnd: (e) => {
                EventHelper.stop(e.eventData, true);
                setDropBackgroundFeedback(false);
            },
            onDrop: (e) => {
                EventHelper.stop(e.eventData, true);
                setDropBackgroundFeedback(false);
                if (this.paneCompositeBar.value) {
                    this.paneCompositeBar.value.dndHandler.drop(e.dragAndDropData, undefined, e.eventData);
                }
                else {
                    // Allow opening views/composites if the composite bar is hidden
                    const dragData = e.dragAndDropData.getData();
                    if (dragData.type === 'composite') {
                        const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id);
                        this.viewDescriptorService.moveViewContainerToLocation(currentContainer, this.location, undefined, 'dnd');
                        this.openPaneComposite(currentContainer.id, true);
                    }
                    else if (dragData.type === 'view') {
                        const viewToMove = this.viewDescriptorService.getViewDescriptorById(dragData.id);
                        if (viewToMove && viewToMove.canMoveView) {
                            this.viewDescriptorService.moveViewToLocation(viewToMove, this.location, 'dnd');
                            const newContainer = this.viewDescriptorService.getViewContainerByViewId(viewToMove.id);
                            this.openPaneComposite(newContainer.id, true).then((composite) => {
                                composite?.openView(viewToMove.id, true);
                            });
                        }
                    }
                }
            },
        }));
    }
    createTitleArea(parent) {
        const titleArea = super.createTitleArea(parent);
        this._register(addDisposableListener(titleArea, EventType.CONTEXT_MENU, (e) => {
            this.onTitleAreaContextMenu(new StandardMouseEvent(getWindow(titleArea), e));
        }));
        this._register(Gesture.addTarget(titleArea));
        this._register(addDisposableListener(titleArea, GestureEventType.Contextmenu, (e) => {
            this.onTitleAreaContextMenu(new StandardMouseEvent(getWindow(titleArea), e));
        }));
        const globalTitleActionsContainer = titleArea.appendChild($('.global-actions'));
        // Global Actions Toolbar
        this.globalToolBar = this._register(this.instantiationService.createInstance(WorkbenchToolBar, globalTitleActionsContainer, {
            actionViewItemProvider: (action, options) => this.actionViewItemProvider(action, options),
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            getKeyBinding: (action) => this.keybindingService.lookupKeybinding(action.id),
            anchorAlignmentProvider: () => this.getTitleAreaDropDownAnchorAlignment(),
            toggleMenuTitle: localize('moreActions', 'More Actions...'),
            hoverDelegate: this.toolbarHoverDelegate,
            hiddenItemStrategy: -1 /* HiddenItemStrategy.NoHide */,
        }));
        this.updateGlobalToolbarActions();
        return titleArea;
    }
    createTitleLabel(parent) {
        this.titleContainer = parent;
        const titleLabel = super.createTitleLabel(parent);
        this.titleLabelElement.draggable = true;
        const draggedItemProvider = () => {
            const activeViewlet = this.getActivePaneComposite();
            return { type: 'composite', id: activeViewlet.getId() };
        };
        this._register(CompositeDragAndDropObserver.INSTANCE.registerDraggable(this.titleLabelElement, draggedItemProvider, {}));
        return titleLabel;
    }
    updateCompositeBar(updateCompositeBarOption = false) {
        const wasCompositeBarVisible = this.compositeBarPosition !== undefined;
        const isCompositeBarVisible = this.shouldShowCompositeBar();
        const previousPosition = this.compositeBarPosition;
        const newPosition = isCompositeBarVisible ? this.getCompositeBarPosition() : undefined;
        // Only update if the visibility or position has changed or if the composite bar options should be updated
        if (!updateCompositeBarOption && previousPosition === newPosition) {
            return;
        }
        // Remove old composite bar
        if (wasCompositeBarVisible) {
            const previousCompositeBarContainer = previousPosition === CompositeBarPosition.TITLE
                ? this.titleContainer
                : this.headerFooterCompositeBarContainer;
            if (!this.paneCompositeBarContainer ||
                !this.paneCompositeBar.value ||
                !previousCompositeBarContainer) {
                throw new Error('Composite bar containers should exist when removing the previous composite bar');
            }
            this.paneCompositeBarContainer.remove();
            this.paneCompositeBarContainer = undefined;
            this.paneCompositeBar.value = undefined;
            previousCompositeBarContainer.classList.remove('has-composite-bar');
            if (previousPosition === CompositeBarPosition.TOP) {
                this.removeFooterHeaderArea(true);
            }
            else if (previousPosition === CompositeBarPosition.BOTTOM) {
                this.removeFooterHeaderArea(false);
            }
        }
        // Create new composite bar
        let newCompositeBarContainer;
        switch (newPosition) {
            case CompositeBarPosition.TOP:
                newCompositeBarContainer = this.createHeaderArea();
                break;
            case CompositeBarPosition.TITLE:
                newCompositeBarContainer = this.titleContainer;
                break;
            case CompositeBarPosition.BOTTOM:
                newCompositeBarContainer = this.createFooterArea();
                break;
        }
        if (isCompositeBarVisible) {
            if (this.paneCompositeBarContainer ||
                this.paneCompositeBar.value ||
                !newCompositeBarContainer) {
                throw new Error('Invalid composite bar state when creating the new composite bar');
            }
            newCompositeBarContainer.classList.add('has-composite-bar');
            this.paneCompositeBarContainer = prepend(newCompositeBarContainer, $('.composite-bar-container'));
            this.paneCompositeBar.value = this.createCompositeBar();
            this.paneCompositeBar.value.create(this.paneCompositeBarContainer);
            if (newPosition === CompositeBarPosition.TOP) {
                this.setHeaderArea(newCompositeBarContainer);
            }
            else if (newPosition === CompositeBarPosition.BOTTOM) {
                this.setFooterArea(newCompositeBarContainer);
            }
        }
        this.compositeBarPosition = newPosition;
        if (updateCompositeBarOption) {
            this.layoutCompositeBar();
        }
    }
    createHeaderArea() {
        const headerArea = super.createHeaderArea();
        return this.createHeaderFooterCompositeBarArea(headerArea);
    }
    createFooterArea() {
        const footerArea = super.createFooterArea();
        return this.createHeaderFooterCompositeBarArea(footerArea);
    }
    createHeaderFooterCompositeBarArea(area) {
        if (this.headerFooterCompositeBarContainer) {
            // A pane composite part has either a header or a footer, but not both
            throw new Error('Header or Footer composite bar already exists');
        }
        this.headerFooterCompositeBarContainer = area;
        this.headerFooterCompositeBarDispoables.add(addDisposableListener(area, EventType.CONTEXT_MENU, (e) => {
            this.onCompositeBarAreaContextMenu(new StandardMouseEvent(getWindow(area), e));
        }));
        this.headerFooterCompositeBarDispoables.add(Gesture.addTarget(area));
        this.headerFooterCompositeBarDispoables.add(addDisposableListener(area, GestureEventType.Contextmenu, (e) => {
            this.onCompositeBarAreaContextMenu(new StandardMouseEvent(getWindow(area), e));
        }));
        return area;
    }
    removeFooterHeaderArea(header) {
        this.headerFooterCompositeBarContainer = undefined;
        this.headerFooterCompositeBarDispoables.clear();
        if (header) {
            this.removeHeaderArea();
        }
        else {
            this.removeFooterArea();
        }
    }
    createCompositeBar() {
        return this.instantiationService.createInstance(PaneCompositeBar, this.getCompositeBarOptions(), this.partId, this);
    }
    onTitleAreaUpdate(compositeId) {
        super.onTitleAreaUpdate(compositeId);
        // If title actions change, relayout the composite bar
        this.layoutCompositeBar();
    }
    async openPaneComposite(id, focus) {
        if (typeof id === 'string' && this.getPaneComposite(id)) {
            return this.doOpenPaneComposite(id, focus);
        }
        await this.extensionService.whenInstalledExtensionsRegistered();
        if (typeof id === 'string' && this.getPaneComposite(id)) {
            return this.doOpenPaneComposite(id, focus);
        }
        return undefined;
    }
    doOpenPaneComposite(id, focus) {
        if (this.blockOpening) {
            return undefined; // Workaround against a potential race condition
        }
        if (!this.layoutService.isVisible(this.partId)) {
            try {
                this.blockOpening = true;
                this.layoutService.setPartHidden(false, this.partId);
            }
            finally {
                this.blockOpening = false;
            }
        }
        return this.openComposite(id, focus);
    }
    getPaneComposite(id) {
        return this.registry.getPaneComposite(id);
    }
    getPaneComposites() {
        return this.registry.getPaneComposites().sort((v1, v2) => {
            if (typeof v1.order !== 'number') {
                return 1;
            }
            if (typeof v2.order !== 'number') {
                return -1;
            }
            return v1.order - v2.order;
        });
    }
    getPinnedPaneCompositeIds() {
        return this.paneCompositeBar.value?.getPinnedPaneCompositeIds() ?? [];
    }
    getVisiblePaneCompositeIds() {
        return this.paneCompositeBar.value?.getVisiblePaneCompositeIds() ?? [];
    }
    getPaneCompositeIds() {
        return this.paneCompositeBar.value?.getPaneCompositeIds() ?? [];
    }
    getActivePaneComposite() {
        return this.getActiveComposite();
    }
    getLastActivePaneCompositeId() {
        return this.getLastActiveCompositeId();
    }
    hideActivePaneComposite() {
        if (this.layoutService.isVisible(this.partId)) {
            this.layoutService.setPartHidden(true, this.partId);
        }
        this.hideActiveComposite();
    }
    focusCompositeBar() {
        this.paneCompositeBar.value?.focus();
    }
    layout(width, height, top, left) {
        if (!this.layoutService.isVisible(this.partId)) {
            return;
        }
        this.contentDimension = new Dimension(width, height);
        // Layout contents
        super.layout(this.contentDimension.width, this.contentDimension.height, top, left);
        // Layout composite bar
        this.layoutCompositeBar();
        // Add empty pane message
        this.layoutEmptyMessage();
    }
    layoutCompositeBar() {
        if (this.contentDimension && this.dimension && this.paneCompositeBar.value) {
            const padding = this.compositeBarPosition === CompositeBarPosition.TITLE ? 16 : 8;
            const borderWidth = this.partId === "workbench.parts.panel" /* Parts.PANEL_PART */ ? 0 : 1;
            let availableWidth = this.contentDimension.width - padding - borderWidth;
            availableWidth = Math.max(AbstractPaneCompositePart_1.MIN_COMPOSITE_BAR_WIDTH, availableWidth - this.getToolbarWidth());
            this.paneCompositeBar.value.layout(availableWidth, this.dimension.height);
        }
    }
    layoutEmptyMessage() {
        const visible = !this.getActiveComposite();
        this.element.classList.toggle('empty', visible);
        if (visible) {
            this.titleLabel?.updateTitle('', '');
        }
    }
    updateGlobalToolbarActions() {
        const primaryActions = this.globalActions.getPrimaryActions();
        const secondaryActions = this.globalActions.getSecondaryActions();
        this.globalToolBar?.setActions(prepareActions(primaryActions), prepareActions(secondaryActions));
    }
    getToolbarWidth() {
        if (!this.toolBar || this.compositeBarPosition !== CompositeBarPosition.TITLE) {
            return 0;
        }
        const activePane = this.getActivePaneComposite();
        if (!activePane) {
            return 0;
        }
        // Each toolbar item has 4px margin
        const toolBarWidth = this.toolBar.getItemsWidth() + this.toolBar.getItemsLength() * 4;
        const globalToolBarWidth = this.globalToolBar
            ? this.globalToolBar.getItemsWidth() + this.globalToolBar.getItemsLength() * 4
            : 0;
        return toolBarWidth + globalToolBarWidth + 5; // 5px padding left
    }
    onTitleAreaContextMenu(event) {
        if (this.shouldShowCompositeBar() &&
            this.getCompositeBarPosition() === CompositeBarPosition.TITLE) {
            return this.onCompositeBarContextMenu(event);
        }
        else {
            const activePaneComposite = this.getActivePaneComposite();
            const activePaneCompositeActions = activePaneComposite
                ? activePaneComposite.getContextMenuActions()
                : [];
            if (activePaneCompositeActions.length) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => activePaneCompositeActions,
                    getActionViewItem: (action, options) => this.actionViewItemProvider(action, options),
                    actionRunner: activePaneComposite.getActionRunner(),
                    skipTelemetry: true,
                });
            }
        }
    }
    onCompositeBarAreaContextMenu(event) {
        return this.onCompositeBarContextMenu(event);
    }
    onCompositeBarContextMenu(event) {
        if (this.paneCompositeBar.value) {
            const actions = [...this.paneCompositeBar.value.getContextMenuActions()];
            if (actions.length) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => event,
                    getActions: () => actions,
                    skipTelemetry: true,
                });
            }
        }
    }
    getViewsSubmenuAction() {
        const viewPaneContainer = this.getActivePaneComposite()?.getViewPaneContainer();
        if (viewPaneContainer) {
            const disposables = new DisposableStore();
            const scopedContextKeyService = disposables.add(this.contextKeyService.createScoped(this.element));
            scopedContextKeyService.createKey('viewContainer', viewPaneContainer.viewContainer.id);
            const menu = this.menuService.getMenuActions(ViewsSubMenu, scopedContextKeyService, {
                shouldForwardArgs: true,
                renderShortTitle: true,
            });
            const viewsActions = getActionBarActions(menu, () => true).primary;
            disposables.dispose();
            return viewsActions.length > 1 && viewsActions.some((a) => a.enabled)
                ? new SubmenuAction('views', localize('views', 'Views'), viewsActions)
                : undefined;
        }
        return undefined;
    }
};
AbstractPaneCompositePart = AbstractPaneCompositePart_1 = __decorate([
    __param(9, INotificationService),
    __param(10, IStorageService),
    __param(11, IContextMenuService),
    __param(12, IWorkbenchLayoutService),
    __param(13, IKeybindingService),
    __param(14, IHoverService),
    __param(15, IInstantiationService),
    __param(16, IThemeService),
    __param(17, IViewDescriptorService),
    __param(18, IContextKeyService),
    __param(19, IExtensionService),
    __param(20, IMenuService)
], AbstractPaneCompositePart);
export { AbstractPaneCompositePart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZUNvbXBvc2l0ZVBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9wYW5lQ29tcG9zaXRlUGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFL0YsT0FBTyxFQUNOLFVBQVUsR0FJVixNQUFNLHFCQUFxQixDQUFBO0FBRTVCLE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSx1QkFBdUIsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFTLE1BQU0sZ0RBQWdELENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RSxPQUFPLEVBQTRCLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDbEYsT0FBTyxFQUNOLFNBQVMsRUFDVCxXQUFXLEVBQ1gsVUFBVSxFQUNWLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsU0FBUyxFQUNULE9BQU8sRUFDUCxTQUFTLEdBQ1QsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFG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