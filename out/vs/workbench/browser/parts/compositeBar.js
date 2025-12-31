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
import { localize } from '../../../nls.js';
import { toAction } from '../../../base/common/actions.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ActionBar } from '../../../base/browser/ui/actionbar/actionbar.js';
import { CompositeActionViewItem, CompositeOverflowActivityAction, CompositeOverflowActivityActionViewItem, } from './compositeBarActions.js';
import { $, addDisposableListener, EventType, EventHelper, isAncestor, getWindow, } from '../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../base/browser/mouseEvent.js';
import { IContextMenuService } from '../../../platform/contextview/browser/contextView.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { isUndefinedOrNull } from '../../../base/common/types.js';
import { Emitter } from '../../../base/common/event.js';
import { IViewDescriptorService } from '../../common/views.js';
import { CompositeDragAndDropObserver, toggleDropEffect, } from '../dnd.js';
import { Gesture, EventType as TouchEventType } from '../../../base/browser/touch.js';
export class CompositeDragAndDrop {
    constructor(viewDescriptorService, targetContainerLocation, orientation, openComposite, moveComposite, getItems) {
        this.viewDescriptorService = viewDescriptorService;
        this.targetContainerLocation = targetContainerLocation;
        this.orientation = orientation;
        this.openComposite = openComposite;
        this.moveComposite = moveComposite;
        this.getItems = getItems;
    }
    drop(data, targetCompositeId, originalEvent, before) {
        const dragData = data.getData();
        if (dragData.type === 'composite') {
            const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id);
            const currentLocation = this.viewDescriptorService.getViewContainerLocation(currentContainer);
            let moved = false;
            // ... on the same composite bar
            if (currentLocation === this.targetContainerLocation) {
                if (targetCompositeId) {
                    this.moveComposite(dragData.id, targetCompositeId, before);
                    moved = true;
                }
            }
            // ... on a different composite bar
            else {
                this.viewDescriptorService.moveViewContainerToLocation(currentContainer, this.targetContainerLocation, this.getTargetIndex(targetCompositeId, before), 'dnd');
                moved = true;
            }
            if (moved) {
                this.openComposite(currentContainer.id, true);
            }
        }
        if (dragData.type === 'view') {
            const viewToMove = this.viewDescriptorService.getViewDescriptorById(dragData.id);
            if (viewToMove && viewToMove.canMoveView) {
                this.viewDescriptorService.moveViewToLocation(viewToMove, this.targetContainerLocation, 'dnd');
                const newContainer = this.viewDescriptorService.getViewContainerByViewId(viewToMove.id);
                if (targetCompositeId) {
                    this.moveComposite(newContainer.id, targetCompositeId, before);
                }
                this.openComposite(newContainer.id, true).then((composite) => {
                    composite?.openView(viewToMove.id, true);
                });
            }
        }
    }
    onDragEnter(data, targetCompositeId, originalEvent) {
        return this.canDrop(data, targetCompositeId);
    }
    onDragOver(data, targetCompositeId, originalEvent) {
        return this.canDrop(data, targetCompositeId);
    }
    getTargetIndex(targetId, before2d) {
        if (!targetId) {
            return undefined;
        }
        const items = this.getItems();
        const before = this.orientation === 0 /* ActionsOrientation.HORIZONTAL */
            ? before2d?.horizontallyBefore
            : before2d?.verticallyBefore;
        return (items.filter((item) => item.visible).findIndex((item) => item.id === targetId) +
            (before ? 0 : 1));
    }
    canDrop(data, targetCompositeId) {
        const dragData = data.getData();
        if (dragData.type === 'composite') {
            // Dragging a composite
            const currentContainer = this.viewDescriptorService.getViewContainerById(dragData.id);
            const currentLocation = this.viewDescriptorService.getViewContainerLocation(currentContainer);
            // ... to the same composite location
            if (currentLocation === this.targetContainerLocation) {
                return dragData.id !== targetCompositeId;
            }
            return true;
        }
        else {
            // Dragging an individual view
            const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dragData.id);
            // ... that cannot move
            if (!viewDescriptor || !viewDescriptor.canMoveView) {
                return false;
            }
            // ... to create a view container
            return true;
        }
    }
}
class CompositeBarDndCallbacks {
    constructor(compositeBarContainer, actionBarContainer, compositeBarModel, dndHandler, orientation) {
        this.compositeBarContainer = compositeBarContainer;
        this.actionBarContainer = actionBarContainer;
        this.compositeBarModel = compositeBarModel;
        this.dndHandler = dndHandler;
        this.orientation = orientation;
        this.insertDropBefore = undefined;
    }
    onDragOver(e) {
        // don't add feedback if this is over the composite bar actions or there are no actions
        const visibleItems = this.compositeBarModel.visibleItems;
        if (!visibleItems.length ||
            (e.eventData.target && isAncestor(e.eventData.target, this.actionBarContainer))) {
            this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, true);
            return;
        }
        const insertAtFront = this.insertAtFront(this.actionBarContainer, e.eventData);
        const target = insertAtFront ? visibleItems[0] : visibleItems[visibleItems.length - 1];
        const validDropTarget = this.dndHandler.onDragOver(e.dragAndDropData, target.id, e.eventData);
        toggleDropEffect(e.eventData.dataTransfer, 'move', validDropTarget);
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, validDropTarget, insertAtFront, true);
    }
    onDragLeave(e) {
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, false);
    }
    onDragEnd(e) {
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, false);
    }
    onDrop(e) {
        const visibleItems = this.compositeBarModel.visibleItems;
        let targetId = undefined;
        if (visibleItems.length) {
            targetId = this.insertAtFront(this.actionBarContainer, e.eventData)
                ? visibleItems[0].id
                : visibleItems[visibleItems.length - 1].id;
        }
        this.dndHandler.drop(e.dragAndDropData, targetId, e.eventData, this.insertDropBefore);
        this.insertDropBefore = this.updateFromDragging(this.compositeBarContainer, false, false, false);
    }
    insertAtFront(element, event) {
        const rect = element.getBoundingClientRect();
        const posX = event.clientX;
        const posY = event.clientY;
        switch (this.orientation) {
            case 0 /* ActionsOrientation.HORIZONTAL */:
                return posX < rect.left;
            case 1 /* ActionsOrientation.VERTICAL */:
                return posY < rect.top;
        }
    }
    updateFromDragging(element, showFeedback, front, isDragging) {
        element.classList.toggle('dragged-over', isDragging);
        element.classList.toggle('dragged-over-head', showFeedback && front);
        element.classList.toggle('dragged-over-tail', showFeedback && !front);
        if (!showFeedback) {
            return undefined;
        }
        return { verticallyBefore: front, horizontallyBefore: front };
    }
}
let CompositeBar = class CompositeBar extends Widget {
    constructor(items, options, instantiationService, contextMenuService, viewDescriptorService) {
        super();
        this.options = options;
        this.instantiationService = instantiationService;
        this.contextMenuService = contextMenuService;
        this.viewDescriptorService = viewDescriptorService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.model = new CompositeBarModel(items, options);
        this.visibleComposites = [];
        this.compositeSizeInBar = new Map();
        this.computeSizes(this.model.visibleItems);
    }
    getCompositeBarItems() {
        return [...this.model.items];
    }
    setCompositeBarItems(items) {
        this.model.setItems(items);
        this.updateCompositeSwitcher(true);
    }
    getPinnedComposites() {
        return this.model.pinnedItems;
    }
    getPinnedCompositeIds() {
        return this.getPinnedComposites().map((c) => c.id);
    }
    getVisibleComposites() {
        return this.model.visibleItems;
    }
    create(parent) {
        const actionBarDiv = parent.appendChild($('.composite-bar'));
        this.compositeSwitcherBar = this._register(new ActionBar(actionBarDiv, {
            actionViewItemProvider: (action, options) => {
                if (action instanceof CompositeOverflowActivityAction) {
                    return this.compositeOverflowActionViewItem;
                }
                const item = this.model.findItem(action.id);
                return (item &&
                    this.instantiationService.createInstance(CompositeActionViewItem, {
                        ...options,
                        draggable: true,
                        colors: this.options.colors,
                        icon: this.options.icon,
                        hoverOptions: this.options.activityHoverOptions,
                        compact: this.options.compact,
                    }, action, item.pinnedAction, item.toggleBadgeAction, (compositeId) => this.options.getContextMenuActionsForComposite(compositeId), () => this.getContextMenuActions(), this.options.dndHandler, this));
            },
            orientation: this.options.orientation,
            ariaLabel: localize('activityBarAriaLabel', 'Active View Switcher'),
            ariaRole: 'tablist',
            preventLoopNavigation: this.options.preventLoopNavigation,
            triggerKeys: { keyDown: true },
        }));
        // Contextmenu for composites
        this._register(addDisposableListener(parent, EventType.CONTEXT_MENU, (e) => this.showContextMenu(getWindow(parent), e)));
        this._register(Gesture.addTarget(parent));
        this._register(addDisposableListener(parent, TouchEventType.Contextmenu, (e) => this.showContextMenu(getWindow(parent), e)));
        // Register a drop target on the whole bar to prevent forbidden feedback
        const dndCallback = new CompositeBarDndCallbacks(parent, actionBarDiv, this.model, this.options.dndHandler, this.options.orientation);
        this._register(CompositeDragAndDropObserver.INSTANCE.registerTarget(parent, dndCallback));
        return actionBarDiv;
    }
    focus(index) {
        this.compositeSwitcherBar?.focus(index);
    }
    recomputeSizes() {
        this.computeSizes(this.model.visibleItems);
        this.updateCompositeSwitcher();
    }
    layout(dimension) {
        this.dimension = dimension;
        if (dimension.height === 0 || dimension.width === 0) {
            // Do not layout if not visible. Otherwise the size measurment would be computed wrongly
            return;
        }
        if (this.compositeSizeInBar.size === 0) {
            // Compute size of each composite by getting the size from the css renderer
            // Size is later used for overflow computation
            this.computeSizes(this.model.visibleItems);
        }
        this.updateCompositeSwitcher();
    }
    addComposite({ id, name, order, requestedIndex, }) {
        if (this.model.add(id, name, order, requestedIndex)) {
            this.computeSizes([this.model.findItem(id)]);
            this.updateCompositeSwitcher();
        }
    }
    removeComposite(id) {
        // If it pinned, unpin it first
        if (this.isPinned(id)) {
            this.unpin(id);
        }
        // Remove from the model
        if (this.model.remove(id)) {
            this.updateCompositeSwitcher();
        }
    }
    hideComposite(id) {
        if (this.model.hide(id)) {
            this.resetActiveComposite(id);
            this.updateCompositeSwitcher();
        }
    }
    activateComposite(id) {
        const previousActiveItem = this.model.activeItem;
        if (this.model.activate(id)) {
            // Update if current composite is neither visible nor pinned
            // or previous active composite is not pinned
            if (this.visibleComposites.indexOf(id) === -1 ||
                (!!this.model.activeItem && !this.model.activeItem.pinned) ||
                (previousActiveItem && !previousActiveItem.pinned)) {
                this.updateCompositeSwitcher();
            }
        }
    }
    deactivateComposite(id) {
        const previousActiveItem = this.model.activeItem;
        if (this.model.deactivate()) {
            if (previousActiveItem && !previousActiveItem.pinned) {
                this.updateCompositeSwitcher();
            }
        }
    }
    async pin(compositeId, open) {
        if (this.model.setPinned(compositeId, true)) {
            this.updateCompositeSwitcher();
            if (open) {
                await this.options.openComposite(compositeId);
                this.activateComposite(compositeId); // Activate after opening
            }
        }
    }
    unpin(compositeId) {
        if (this.model.setPinned(compositeId, false)) {
            this.updateCompositeSwitcher();
            this.resetActiveComposite(compositeId);
        }
    }
    areBadgesEnabled(compositeId) {
        return this.viewDescriptorService.getViewContainerBadgeEnablementState(compositeId);
    }
    toggleBadgeEnablement(compositeId) {
        this.viewDescriptorService.setViewContainerBadgeEnablementState(compositeId, !this.areBadgesEnabled(compositeId));
        this.updateCompositeSwitcher();
        const item = this.model.findItem(compositeId);
        if (item) {
            // TODO @lramos15 how do we tell the activity to re-render the badge? This triggers an onDidChange but isn't the right way to do it.
            // I could add another specific function like `activity.updateBadgeEnablement` would then the activity store the sate?
            item.activityAction.activities = item.activityAction.activities;
        }
    }
    resetActiveComposite(compositeId) {
        const defaultCompositeId = this.options.getDefaultCompositeId();
        // Case: composite is not the active one or the active one is a different one
        // Solv: we do nothing
        if (!this.model.activeItem || this.model.activeItem.id !== compositeId) {
            return;
        }
        // Deactivate itself
        this.deactivateComposite(compositeId);
        // Case: composite is not the default composite and default composite is still showing
        // Solv: we open the default composite
        if (defaultCompositeId &&
            defaultCompositeId !== compositeId &&
            this.isPinned(defaultCompositeId)) {
            this.options.openComposite(defaultCompositeId, true);
        }
        // Case: we closed the default composite
        // Solv: we open the next visible composite from top
        else {
            const visibleComposite = this.visibleComposites.find((cid) => cid !== compositeId);
            if (visibleComposite) {
                this.options.openComposite(visibleComposite);
            }
        }
    }
    isPinned(compositeId) {
        const item = this.model.findItem(compositeId);
        return item?.pinned;
    }
    move(compositeId, toCompositeId, before) {
        if (before !== undefined) {
            const fromIndex = this.model.items.findIndex((c) => c.id === compositeId);
            let toIndex = this.model.items.findIndex((c) => c.id === toCompositeId);
            if (fromIndex >= 0 && toIndex >= 0) {
                if (!before && fromIndex > toIndex) {
                    toIndex++;
                }
                if (before && fromIndex < toIndex) {
                    toIndex--;
                }
                if (toIndex < this.model.items.length && toIndex >= 0 && toIndex !== fromIndex) {
                    if (this.model.move(this.model.items[fromIndex].id, this.model.items[toIndex].id)) {
                        // timeout helps to prevent artifacts from showing up
                        setTimeout(() => this.updateCompositeSwitcher(), 0);
                    }
                }
            }
        }
        else {
            if (this.model.move(compositeId, toCompositeId)) {
                // timeout helps to prevent artifacts from showing up
                setTimeout(() => this.updateCompositeSwitcher(), 0);
            }
        }
    }
    getAction(compositeId) {
        const item = this.model.findItem(compositeId);
        return item?.activityAction;
    }
    computeSizes(items) {
        const size = this.options.compositeSize;
        if (size) {
            items.forEach((composite) => this.compositeSizeInBar.set(composite.id, size));
        }
        else {
            const compositeSwitcherBar = this.compositeSwitcherBar;
            if (compositeSwitcherBar &&
                this.dimension &&
                this.dimension.height !== 0 &&
                this.dimension.width !== 0) {
                // Compute sizes only if visible. Otherwise the size measurment would be computed wrongly.
                const currentItemsLength = compositeSwitcherBar.viewItems.length;
                compositeSwitcherBar.push(items.map((composite) => composite.activityAction));
                items.map((composite, index) => this.compositeSizeInBar.set(composite.id, this.options.orientation === 1 /* ActionsOrientation.VERTICAL */
                    ? compositeSwitcherBar.getHeight(currentItemsLength + index)
                    : compositeSwitcherBar.getWidth(currentItemsLength + index)));
                items.forEach(() => compositeSwitcherBar.pull(compositeSwitcherBar.viewItems.length - 1));
            }
        }
    }
    updateCompositeSwitcher(donotTrigger) {
        const compositeSwitcherBar = this.compositeSwitcherBar;
        if (!compositeSwitcherBar || !this.dimension) {
            return; // We have not been rendered yet so there is nothing to update.
        }
        let compositesToShow = this.model.visibleItems
            .filter((item) => item.pinned ||
            (this.model.activeItem &&
                this.model.activeItem.id ===
                    item.id) /* Show the active composite even if it is not pinned */)
            .map((item) => item.id);
        // Ensure we are not showing more composites than we have height for
        let maxVisible = compositesToShow.length;
        const totalComposites = compositesToShow.length;
        let size = 0;
        const limit = this.options.orientation === 1 /* ActionsOrientation.VERTICAL */
            ? this.dimension.height
            : this.dimension.width;
        // Add composites while they fit
        for (let i = 0; i < compositesToShow.length; i++) {
            const compositeSize = this.compositeSizeInBar.get(compositesToShow[i]);
            // Adding this composite will overflow available size, so don't
            if (size + compositeSize > limit) {
                maxVisible = i;
                break;
            }
            size += compositeSize;
        }
        // Remove the tail of composites that did not fit
        if (totalComposites > maxVisible) {
            compositesToShow = compositesToShow.slice(0, maxVisible);
        }
        // We always try show the active composite, so re-add it if it was sliced out
        if (this.model.activeItem &&
            compositesToShow.every((compositeId) => !!this.model.activeItem && compositeId !== this.model.activeItem.id)) {
            size += this.compositeSizeInBar.get(this.model.activeItem.id);
            compositesToShow.push(this.model.activeItem.id);
        }
        // The active composite might have pushed us over the limit
        // Keep popping the composite before the active one until it fits
        // If even the active one doesn't fit, we will resort to overflow
        while (size > limit && compositesToShow.length) {
            const removedComposite = compositesToShow.length > 1
                ? compositesToShow.splice(compositesToShow.length - 2, 1)[0]
                : compositesToShow.pop();
            size -= this.compositeSizeInBar.get(removedComposite);
        }
        // We are overflowing, add the overflow size
        if (totalComposites > compositesToShow.length) {
            size += this.options.overflowActionSize;
        }
        // Check if we need to make extra room for the overflow action
        while (size > limit && compositesToShow.length) {
            const removedComposite = compositesToShow.length > 1 &&
                compositesToShow[compositesToShow.length - 1] === this.model.activeItem?.id
                ? compositesToShow.splice(compositesToShow.length - 2, 1)[0]
                : compositesToShow.pop();
            size -= this.compositeSizeInBar.get(removedComposite);
        }
        // Remove the overflow action if there are no overflows
        if (totalComposites === compositesToShow.length && this.compositeOverflowAction) {
            compositeSwitcherBar.pull(compositeSwitcherBar.length() - 1);
            this.compositeOverflowAction.dispose();
            this.compositeOverflowAction = undefined;
            this.compositeOverflowActionViewItem?.dispose();
            this.compositeOverflowActionViewItem = undefined;
        }
        // Pull out composites that overflow or got hidden
        const compositesToRemove = [];
        this.visibleComposites.forEach((compositeId, index) => {
            if (!compositesToShow.includes(compositeId)) {
                compositesToRemove.push(index);
            }
        });
        compositesToRemove.reverse().forEach((index) => {
            compositeSwitcherBar.pull(index);
            this.visibleComposites.splice(index, 1);
        });
        // Update the positions of the composites
        compositesToShow.forEach((compositeId, newIndex) => {
            const currentIndex = this.visibleComposites.indexOf(compositeId);
            if (newIndex !== currentIndex) {
                if (currentIndex !== -1) {
                    compositeSwitcherBar.pull(currentIndex);
                    this.visibleComposites.splice(currentIndex, 1);
                }
                compositeSwitcherBar.push(this.model.findItem(compositeId).activityAction, {
                    label: true,
                    icon: this.options.icon,
                    index: newIndex,
                });
                this.visibleComposites.splice(newIndex, 0, compositeId);
            }
        });
        // Add overflow action as needed
        if (totalComposites > compositesToShow.length && !this.compositeOverflowAction) {
            this.compositeOverflowAction = this._register(this.instantiationService.createInstance(CompositeOverflowActivityAction, () => {
                this.compositeOverflowActionViewItem?.showMenu();
            }));
            this.compositeOverflowActionViewItem = this._register(this.instantiationService.createInstance(CompositeOverflowActivityActionViewItem, this.compositeOverflowAction, () => this.getOverflowingComposites(), () => (this.model.activeItem ? this.model.activeItem.id : undefined), (compositeId) => {
                const item = this.model.findItem(compositeId);
                return item?.activity[0]?.badge;
            }, this.options.getOnCompositeClickAction, this.options.colors, this.options.activityHoverOptions));
            compositeSwitcherBar.push(this.compositeOverflowAction, { label: false, icon: true });
        }
        if (!donotTrigger) {
            this._onDidChange.fire();
        }
    }
    getOverflowingComposites() {
        let overflowingIds = this.model.visibleItems
            .filter((item) => item.pinned)
            .map((item) => item.id);
        // Show the active composite even if it is not pinned
        if (this.model.activeItem && !this.model.activeItem.pinned) {
            overflowingIds.push(this.model.activeItem.id);
        }
        overflowingIds = overflowingIds.filter((compositeId) => !this.visibleComposites.includes(compositeId));
        return this.model.visibleItems
            .filter((c) => overflowingIds.includes(c.id))
            .map((item) => {
            return { id: item.id, name: this.getAction(item.id)?.label || item.name };
        });
    }
    showContextMenu(targetWindow, e) {
        EventHelper.stop(e, true);
        const event = new StandardMouseEvent(targetWindow, e);
        this.contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => this.getContextMenuActions(e),
        });
    }
    getContextMenuActions(e) {
        const actions = this.model.visibleItems.map(({ id, name, activityAction }) => {
            const isPinned = this.isPinned(id);
            return toAction({
                id,
                label: this.getAction(id).label || name || id,
                checked: isPinned,
                enabled: activityAction.enabled && (!isPinned || this.getPinnedCompositeIds().length > 1),
                run: () => {
                    if (this.isPinned(id)) {
                        this.unpin(id);
                    }
                    else {
                        this.pin(id, true);
                    }
                },
            });
        });
        this.options.fillExtraContextMenuActions(actions, e);
        return actions;
    }
};
CompositeBar = __decorate([
    __param(2, IInstantiationService),
    __param(3, IContextMenuService),
    __param(4, IViewDescriptorService)
], CompositeBar);
export { CompositeBar };
class CompositeBarModel {
    get items() {
        return this._items;
    }
    constructor(items, options) {
        this._items = [];
        this.options = options;
        this.setItems(items);
    }
    setItems(items) {
        this._items = [];
        this._items = items.map((i) => this.createCompositeBarItem(i.id, i.name, i.order, i.pinned, i.visible));
    }
    get visibleItems() {
        return this.items.filter((item) => item.visible);
    }
    get pinnedItems() {
        return this.items.filter((item) => item.visible && item.pinned);
    }
    createCompositeBarItem(id, name, order, pinned, visible) {
        const options = this.options;
        return {
            id,
            name,
            pinned,
            order,
            visible,
            activity: [],
            get activityAction() {
                return options.getActivityAction(id);
            },
            get pinnedAction() {
                return options.getCompositePinnedAction(id);
            },
            get toggleBadgeAction() {
                return options.getCompositeBadgeAction(id);
            },
        };
    }
    add(id, name, order, requestedIndex) {
        const item = this.findItem(id);
        if (item) {
            let changed = false;
            item.name = name;
            if (!isUndefinedOrNull(order)) {
                changed = item.order !== order;
                item.order = order;
            }
            if (!item.visible) {
                item.visible = true;
                changed = true;
            }
            return changed;
        }
        else {
            const item = this.createCompositeBarItem(id, name, order, true, true);
            if (!isUndefinedOrNull(requestedIndex)) {
                let index = 0;
                let rIndex = requestedIndex;
                while (rIndex > 0 && index < this.items.length) {
                    if (this.items[index++].visible) {
                        rIndex--;
                    }
                }
                this.items.splice(index, 0, item);
            }
            else if (isUndefinedOrNull(order)) {
                this.items.push(item);
            }
            else {
                let index = 0;
                while (index < this.items.length &&
                    typeof this.items[index].order === 'number' &&
                    this.items[index].order < order) {
                    index++;
                }
                this.items.splice(index, 0, item);
            }
            return true;
        }
    }
    remove(id) {
        for (let index = 0; index < this.items.length; index++) {
            if (this.items[index].id === id) {
                this.items.splice(index, 1);
                return true;
            }
        }
        return false;
    }
    hide(id) {
        for (const item of this.items) {
            if (item.id === id) {
                if (item.visible) {
                    item.visible = false;
                    return true;
                }
                return false;
            }
        }
        return false;
    }
    move(compositeId, toCompositeId) {
        const fromIndex = this.findIndex(compositeId);
        const toIndex = this.findIndex(toCompositeId);
        // Make sure both items are known to the model
        if (fromIndex === -1 || toIndex === -1) {
            return false;
        }
        const sourceItem = this.items.splice(fromIndex, 1)[0];
        this.items.splice(toIndex, 0, sourceItem);
        // Make sure a moved composite gets pinned
        sourceItem.pinned = true;
        return true;
    }
    setPinned(id, pinned) {
        for (const item of this.items) {
            if (item.id === id) {
                if (item.pinned !== pinned) {
                    item.pinned = pinned;
                    return true;
                }
                return false;
            }
        }
        return false;
    }
    activate(id) {
        if (!this.activeItem || this.activeItem.id !== id) {
            if (this.activeItem) {
                this.deactivate();
            }
            for (const item of this.items) {
                if (item.id === id) {
                    this.activeItem = item;
                    this.activeItem.activityAction.activate();
                    return true;
                }
            }
        }
        return false;
    }
    deactivate() {
        if (this.activeItem) {
            this.activeItem.activityAction.deactivate();
            this.activeItem = undefined;
            return true;
        }
        return false;
    }
    findItem(id) {
        return this.items.filter((item) => item.id === id)[0];
    }
    findIndex(id) {
        for (let index = 0; index < this.items.length; index++) {
            if (this.items[index].id === id) {
                return index;
            }
        }
        return -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlQmFyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvY29tcG9zaXRlQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLCtCQUErQixFQUMvQix1Q0FBdUMsR0FLdkMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBRU4sQ0FBQyxFQUNELHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsV0FBVyxFQUNYLFVBQVUsRUFDVixTQUFTLEdBQ1QsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBeUIsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdyRixPQUFPLEVBRU4sNEJBQTRCLEVBSTVCLGdCQUFnQixHQUVoQixNQUFNLFdBQVcsQ0FBQTtBQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMs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