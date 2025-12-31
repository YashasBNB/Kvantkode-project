/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, addDisposableListener, append, getWindow, scheduleAtNextAnimationFrame, } from '../../dom.js';
import { DomEmitter } from '../../event.js';
import { Sash } from '../sash/sash.js';
import { SmoothScrollableElement } from '../scrollbar/scrollableElement.js';
import { pushToEnd, pushToStart, range } from '../../../common/arrays.js';
import { Color } from '../../../common/color.js';
import { Emitter, Event } from '../../../common/event.js';
import { combinedDisposable, Disposable, dispose, toDisposable, } from '../../../common/lifecycle.js';
import { clamp } from '../../../common/numbers.js';
import { Scrollable } from '../../../common/scrollable.js';
import * as types from '../../../common/types.js';
import './splitview.css';
export { Orientation } from '../sash/sash.js';
const defaultStyles = {
    separatorBorder: Color.transparent,
};
export var LayoutPriority;
(function (LayoutPriority) {
    LayoutPriority[LayoutPriority["Normal"] = 0] = "Normal";
    LayoutPriority[LayoutPriority["Low"] = 1] = "Low";
    LayoutPriority[LayoutPriority["High"] = 2] = "High";
})(LayoutPriority || (LayoutPriority = {}));
class ViewItem {
    set size(size) {
        this._size = size;
    }
    get size() {
        return this._size;
    }
    get cachedVisibleSize() {
        return this._cachedVisibleSize;
    }
    get visible() {
        return typeof this._cachedVisibleSize === 'undefined';
    }
    setVisible(visible, size) {
        if (visible === this.visible) {
            return;
        }
        if (visible) {
            this.size = clamp(this._cachedVisibleSize, this.viewMinimumSize, this.viewMaximumSize);
            this._cachedVisibleSize = undefined;
        }
        else {
            this._cachedVisibleSize = typeof size === 'number' ? size : this.size;
            this.size = 0;
        }
        this.container.classList.toggle('visible', visible);
        try {
            this.view.setVisible?.(visible);
        }
        catch (e) {
            console.error('Splitview: Failed to set visible view');
            console.error(e);
        }
    }
    get minimumSize() {
        return this.visible ? this.view.minimumSize : 0;
    }
    get viewMinimumSize() {
        return this.view.minimumSize;
    }
    get maximumSize() {
        return this.visible ? this.view.maximumSize : 0;
    }
    get viewMaximumSize() {
        return this.view.maximumSize;
    }
    get priority() {
        return this.view.priority;
    }
    get proportionalLayout() {
        return this.view.proportionalLayout ?? true;
    }
    get snap() {
        return !!this.view.snap;
    }
    set enabled(enabled) {
        this.container.style.pointerEvents = enabled ? '' : 'none';
    }
    constructor(container, view, size, disposable) {
        this.container = container;
        this.view = view;
        this.disposable = disposable;
        this._cachedVisibleSize = undefined;
        if (typeof size === 'number') {
            this._size = size;
            this._cachedVisibleSize = undefined;
            container.classList.add('visible');
        }
        else {
            this._size = 0;
            this._cachedVisibleSize = size.cachedVisibleSize;
        }
    }
    layout(offset, layoutContext) {
        this.layoutContainer(offset);
        try {
            this.view.layout(this.size, offset, layoutContext);
        }
        catch (e) {
            console.error('Splitview: Failed to layout view');
            console.error(e);
        }
    }
    dispose() {
        this.disposable.dispose();
    }
}
class VerticalViewItem extends ViewItem {
    layoutContainer(offset) {
        this.container.style.top = `${offset}px`;
        this.container.style.height = `${this.size}px`;
    }
}
class HorizontalViewItem extends ViewItem {
    layoutContainer(offset) {
        this.container.style.left = `${offset}px`;
        this.container.style.width = `${this.size}px`;
    }
}
var State;
(function (State) {
    State[State["Idle"] = 0] = "Idle";
    State[State["Busy"] = 1] = "Busy";
})(State || (State = {}));
export var Sizing;
(function (Sizing) {
    /**
     * When adding or removing views, distribute the delta space among
     * all other views.
     */
    Sizing.Distribute = { type: 'distribute' };
    /**
     * When adding or removing views, split the delta space with another
     * specific view, indexed by the provided `index`.
     */
    function Split(index) {
        return { type: 'split', index };
    }
    Sizing.Split = Split;
    /**
     * When adding a view, use DistributeSizing when all pre-existing views are
     * distributed evenly, otherwise use SplitSizing.
     */
    function Auto(index) {
        return { type: 'auto', index };
    }
    Sizing.Auto = Auto;
    /**
     * When adding or removing views, assume the view is invisible.
     */
    function Invisible(cachedVisibleSize) {
        return { type: 'invisible', cachedVisibleSize };
    }
    Sizing.Invisible = Invisible;
})(Sizing || (Sizing = {}));
/**
 * The {@link SplitView} is the UI component which implements a one dimensional
 * flex-like layout algorithm for a collection of {@link IView} instances, which
 * are essentially HTMLElement instances with the following size constraints:
 *
 * - {@link IView.minimumSize}
 * - {@link IView.maximumSize}
 * - {@link IView.priority}
 * - {@link IView.snap}
 *
 * In case the SplitView doesn't have enough size to fit all views, it will overflow
 * its content with a scrollbar.
 *
 * In between each pair of views there will be a {@link Sash} allowing the user
 * to resize the views, making sure the constraints are respected.
 *
 * An optional {@link TLayoutContext layout context type} may be used in order to
 * pass along layout contextual data from the {@link SplitView.layout} method down
 * to each view's {@link IView.layout} calls.
 *
 * Features:
 * - Flex-like layout algorithm
 * - Snap support
 * - Orthogonal sash support, for corner sashes
 * - View hide/show support
 * - View swap/move support
 * - Alt key modifier behavior, macOS style
 */
export class SplitView extends Disposable {
    /**
     * The sum of all views' sizes.
     */
    get contentSize() {
        return this._contentSize;
    }
    /**
     * The amount of views in this {@link SplitView}.
     */
    get length() {
        return this.viewItems.length;
    }
    /**
     * The minimum size of this {@link SplitView}.
     */
    get minimumSize() {
        return this.viewItems.reduce((r, item) => r + item.minimumSize, 0);
    }
    /**
     * The maximum size of this {@link SplitView}.
     */
    get maximumSize() {
        return this.length === 0
            ? Number.POSITIVE_INFINITY
            : this.viewItems.reduce((r, item) => r + item.maximumSize, 0);
    }
    get orthogonalStartSash() {
        return this._orthogonalStartSash;
    }
    get orthogonalEndSash() {
        return this._orthogonalEndSash;
    }
    get startSnappingEnabled() {
        return this._startSnappingEnabled;
    }
    get endSnappingEnabled() {
        return this._endSnappingEnabled;
    }
    /**
     * A reference to a sash, perpendicular to all sashes in this {@link SplitView},
     * located at the left- or top-most side of the SplitView.
     * Corner sashes will be created automatically at the intersections.
     */
    set orthogonalStartSash(sash) {
        for (const sashItem of this.sashItems) {
            sashItem.sash.orthogonalStartSash = sash;
        }
        this._orthogonalStartSash = sash;
    }
    /**
     * A reference to a sash, perpendicular to all sashes in this {@link SplitView},
     * located at the right- or bottom-most side of the SplitView.
     * Corner sashes will be created automatically at the intersections.
     */
    set orthogonalEndSash(sash) {
        for (const sashItem of this.sashItems) {
            sashItem.sash.orthogonalEndSash = sash;
        }
        this._orthogonalEndSash = sash;
    }
    /**
     * The internal sashes within this {@link SplitView}.
     */
    get sashes() {
        return this.sashItems.map((s) => s.sash);
    }
    /**
     * Enable/disable snapping at the beginning of this {@link SplitView}.
     */
    set startSnappingEnabled(startSnappingEnabled) {
        if (this._startSnappingEnabled === startSnappingEnabled) {
            return;
        }
        this._startSnappingEnabled = startSnappingEnabled;
        this.updateSashEnablement();
    }
    /**
     * Enable/disable snapping at the end of this {@link SplitView}.
     */
    set endSnappingEnabled(endSnappingEnabled) {
        if (this._endSnappingEnabled === endSnappingEnabled) {
            return;
        }
        this._endSnappingEnabled = endSnappingEnabled;
        this.updateSashEnablement();
    }
    /**
     * Create a new {@link SplitView} instance.
     */
    constructor(container, options = {}) {
        super();
        this.size = 0;
        this._contentSize = 0;
        this.proportions = undefined;
        this.viewItems = [];
        this.sashItems = []; // used in tests
        this.state = State.Idle;
        this._onDidSashChange = this._register(new Emitter());
        this._onDidSashReset = this._register(new Emitter());
        this._startSnappingEnabled = true;
        this._endSnappingEnabled = true;
        /**
         * Fires whenever the user resizes a {@link Sash sash}.
         */
        this.onDidSashChange = this._onDidSashChange.event;
        /**
         * Fires whenever the user double clicks a {@link Sash sash}.
         */
        this.onDidSashReset = this._onDidSashReset.event;
        this.orientation = options.orientation ?? 0 /* Orientation.VERTICAL */;
        this.inverseAltBehavior = options.inverseAltBehavior ?? false;
        this.proportionalLayout = options.proportionalLayout ?? true;
        this.getSashOrthogonalSize = options.getSashOrthogonalSize;
        this.el = document.createElement('div');
        this.el.classList.add('monaco-split-view2');
        this.el.classList.add(this.orientation === 0 /* Orientation.VERTICAL */ ? 'vertical' : 'horizontal');
        container.appendChild(this.el);
        this.sashContainer = append(this.el, $('.sash-container'));
        this.viewContainer = $('.split-view-container');
        this.scrollable = this._register(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: 125,
            scheduleAtNextAnimationFrame: (callback) => scheduleAtNextAnimationFrame(getWindow(this.el), callback),
        }));
        this.scrollableElement = this._register(new SmoothScrollableElement(this.viewContainer, {
            vertical: this.orientation === 0 /* Orientation.VERTICAL */
                ? (options.scrollbarVisibility ?? 1 /* ScrollbarVisibility.Auto */)
                : 2 /* ScrollbarVisibility.Hidden */,
            horizontal: this.orientation === 1 /* Orientation.HORIZONTAL */
                ? (options.scrollbarVisibility ?? 1 /* ScrollbarVisibility.Auto */)
                : 2 /* ScrollbarVisibility.Hidden */,
        }, this.scrollable));
        // https://github.com/microsoft/vscode/issues/157737
        const onDidScrollViewContainer = this._register(new DomEmitter(this.viewContainer, 'scroll')).event;
        this._register(onDidScrollViewContainer((_) => {
            const position = this.scrollableElement.getScrollPosition();
            const scrollLeft = Math.abs(this.viewContainer.scrollLeft - position.scrollLeft) <= 1
                ? undefined
                : this.viewContainer.scrollLeft;
            const scrollTop = Math.abs(this.viewContainer.scrollTop - position.scrollTop) <= 1
                ? undefined
                : this.viewContainer.scrollTop;
            if (scrollLeft !== undefined || scrollTop !== undefined) {
                this.scrollableElement.setScrollPosition({ scrollLeft, scrollTop });
            }
        }));
        this.onDidScroll = this.scrollableElement.onScroll;
        this._register(this.onDidScroll((e) => {
            if (e.scrollTopChanged) {
                this.viewContainer.scrollTop = e.scrollTop;
            }
            if (e.scrollLeftChanged) {
                this.viewContainer.scrollLeft = e.scrollLeft;
            }
        }));
        append(this.el, this.scrollableElement.getDomNode());
        this.style(options.styles || defaultStyles);
        // We have an existing set of view, add them now
        if (options.descriptor) {
            this.size = options.descriptor.size;
            options.descriptor.views.forEach((viewDescriptor, index) => {
                const sizing = types.isUndefined(viewDescriptor.visible) || viewDescriptor.visible
                    ? viewDescriptor.size
                    : {
                        type: 'invisible',
                        cachedVisibleSize: viewDescriptor.size,
                    };
                const view = viewDescriptor.view;
                this.doAddView(view, sizing, index, true);
            });
            // Initialize content size and proportions for first layout
            this._contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
            this.saveProportions();
        }
    }
    style(styles) {
        if (styles.separatorBorder.isTransparent()) {
            this.el.classList.remove('separator-border');
            this.el.style.removeProperty('--separator-border');
        }
        else {
            this.el.classList.add('separator-border');
            this.el.style.setProperty('--separator-border', styles.separatorBorder.toString());
        }
    }
    /**
     * Add a {@link IView view} to this {@link SplitView}.
     *
     * @param view The view to add.
     * @param size Either a fixed size, or a dynamic {@link Sizing} strategy.
     * @param index The index to insert the view on.
     * @param skipLayout Whether layout should be skipped.
     */
    addView(view, size, index = this.viewItems.length, skipLayout) {
        this.doAddView(view, size, index, skipLayout);
    }
    /**
     * Remove a {@link IView view} from this {@link SplitView}.
     *
     * @param index The index where the {@link IView view} is located.
     * @param sizing Whether to distribute other {@link IView view}'s sizes.
     */
    removeView(index, sizing) {
        if (index < 0 || index >= this.viewItems.length) {
            throw new Error('Index out of bounds');
        }
        if (this.state !== State.Idle) {
            throw new Error('Cant modify splitview');
        }
        this.state = State.Busy;
        try {
            if (sizing?.type === 'auto') {
                if (this.areViewsDistributed()) {
                    sizing = { type: 'distribute' };
                }
                else {
                    sizing = { type: 'split', index: sizing.index };
                }
            }
            // Save referene view, in case of `split` sizing
            const referenceViewItem = sizing?.type === 'split' ? this.viewItems[sizing.index] : undefined;
            // Remove view
            const viewItemToRemove = this.viewItems.splice(index, 1)[0];
            // Resize reference view, in case of `split` sizing
            if (referenceViewItem) {
                referenceViewItem.size += viewItemToRemove.size;
            }
            // Remove sash
            if (this.viewItems.length >= 1) {
                const sashIndex = Math.max(index - 1, 0);
                const sashItem = this.sashItems.splice(sashIndex, 1)[0];
                sashItem.disposable.dispose();
            }
            this.relayout();
            if (sizing?.type === 'distribute') {
                this.distributeViewSizes();
            }
            const result = viewItemToRemove.view;
            viewItemToRemove.dispose();
            return result;
        }
        finally {
            this.state = State.Idle;
        }
    }
    removeAllViews() {
        if (this.state !== State.Idle) {
            throw new Error('Cant modify splitview');
        }
        this.state = State.Busy;
        try {
            const viewItems = this.viewItems.splice(0, this.viewItems.length);
            for (const viewItem of viewItems) {
                viewItem.dispose();
            }
            const sashItems = this.sashItems.splice(0, this.sashItems.length);
            for (const sashItem of sashItems) {
                sashItem.disposable.dispose();
            }
            this.relayout();
            return viewItems.map((i) => i.view);
        }
        finally {
            this.state = State.Idle;
        }
    }
    /**
     * Move a {@link IView view} to a different index.
     *
     * @param from The source index.
     * @param to The target index.
     */
    moveView(from, to) {
        if (this.state !== State.Idle) {
            throw new Error('Cant modify splitview');
        }
        const cachedVisibleSize = this.getViewCachedVisibleSize(from);
        const sizing = typeof cachedVisibleSize === 'undefined'
            ? this.getViewSize(from)
            : Sizing.Invisible(cachedVisibleSize);
        const view = this.removeView(from);
        this.addView(view, sizing, to);
    }
    /**
     * Swap two {@link IView views}.
     *
     * @param from The source index.
     * @param to The target index.
     */
    swapViews(from, to) {
        if (this.state !== State.Idle) {
            throw new Error('Cant modify splitview');
        }
        if (from > to) {
            return this.swapViews(to, from);
        }
        const fromSize = this.getViewSize(from);
        const toSize = this.getViewSize(to);
        const toView = this.removeView(to);
        const fromView = this.removeView(from);
        this.addView(toView, fromSize, from);
        this.addView(fromView, toSize, to);
    }
    /**
     * Returns whether the {@link IView view} is visible.
     *
     * @param index The {@link IView view} index.
     */
    isViewVisible(index) {
        if (index < 0 || index >= this.viewItems.length) {
            throw new Error('Index out of bounds');
        }
        const viewItem = this.viewItems[index];
        return viewItem.visible;
    }
    /**
     * Set a {@link IView view}'s visibility.
     *
     * @param index The {@link IView view} index.
     * @param visible Whether the {@link IView view} should be visible.
     */
    setViewVisible(index, visible) {
        if (index < 0 || index >= this.viewItems.length) {
            throw new Error('Index out of bounds');
        }
        const viewItem = this.viewItems[index];
        viewItem.setVisible(visible);
        this.distributeEmptySpace(index);
        this.layoutViews();
        this.saveProportions();
    }
    /**
     * Returns the {@link IView view}'s size previously to being hidden.
     *
     * @param index The {@link IView view} index.
     */
    getViewCachedVisibleSize(index) {
        if (index < 0 || index >= this.viewItems.length) {
            throw new Error('Index out of bounds');
        }
        const viewItem = this.viewItems[index];
        return viewItem.cachedVisibleSize;
    }
    /**
     * Layout the {@link SplitView}.
     *
     * @param size The entire size of the {@link SplitView}.
     * @param layoutContext An optional layout context to pass along to {@link IView views}.
     */
    layout(size, layoutContext) {
        const previousSize = Math.max(this.size, this._contentSize);
        this.size = size;
        this.layoutContext = layoutContext;
        if (!this.proportions) {
            const indexes = range(this.viewItems.length);
            const lowPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 1 /* LayoutPriority.Low */);
            const highPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 2 /* LayoutPriority.High */);
            this.resize(this.viewItems.length - 1, size - previousSize, undefined, lowPriorityIndexes, highPriorityIndexes);
        }
        else {
            let total = 0;
            for (let i = 0; i < this.viewItems.length; i++) {
                const item = this.viewItems[i];
                const proportion = this.proportions[i];
                if (typeof proportion === 'number') {
                    total += proportion;
                }
                else {
                    size -= item.size;
                }
            }
            for (let i = 0; i < this.viewItems.length; i++) {
                const item = this.viewItems[i];
                const proportion = this.proportions[i];
                if (typeof proportion === 'number' && total > 0) {
                    item.size = clamp(Math.round((proportion * size) / total), item.minimumSize, item.maximumSize);
                }
            }
        }
        this.distributeEmptySpace();
        this.layoutViews();
    }
    saveProportions() {
        if (this.proportionalLayout && this._contentSize > 0) {
            this.proportions = this.viewItems.map((v) => v.proportionalLayout && v.visible ? v.size / this._contentSize : undefined);
        }
    }
    onSashStart({ sash, start, alt }) {
        for (const item of this.viewItems) {
            item.enabled = false;
        }
        const index = this.sashItems.findIndex((item) => item.sash === sash);
        // This way, we can press Alt while we resize a sash, macOS style!
        const disposable = combinedDisposable(addDisposableListener(this.el.ownerDocument.body, 'keydown', (e) => resetSashDragState(this.sashDragState.current, e.altKey)), addDisposableListener(this.el.ownerDocument.body, 'keyup', () => resetSashDragState(this.sashDragState.current, false)));
        const resetSashDragState = (start, alt) => {
            const sizes = this.viewItems.map((i) => i.size);
            let minDelta = Number.NEGATIVE_INFINITY;
            let maxDelta = Number.POSITIVE_INFINITY;
            if (this.inverseAltBehavior) {
                alt = !alt;
            }
            if (alt) {
                // When we're using the last sash with Alt, we're resizing
                // the view to the left/up, instead of right/down as usual
                // Thus, we must do the inverse of the usual
                const isLastSash = index === this.sashItems.length - 1;
                if (isLastSash) {
                    const viewItem = this.viewItems[index];
                    minDelta = (viewItem.minimumSize - viewItem.size) / 2;
                    maxDelta = (viewItem.maximumSize - viewItem.size) / 2;
                }
                else {
                    const viewItem = this.viewItems[index + 1];
                    minDelta = (viewItem.size - viewItem.maximumSize) / 2;
                    maxDelta = (viewItem.size - viewItem.minimumSize) / 2;
                }
            }
            let snapBefore;
            let snapAfter;
            if (!alt) {
                const upIndexes = range(index, -1);
                const downIndexes = range(index + 1, this.viewItems.length);
                const minDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].minimumSize - sizes[i]), 0);
                const maxDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].viewMaximumSize - sizes[i]), 0);
                const maxDeltaDown = downIndexes.length === 0
                    ? Number.POSITIVE_INFINITY
                    : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].minimumSize), 0);
                const minDeltaDown = downIndexes.length === 0
                    ? Number.NEGATIVE_INFINITY
                    : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].viewMaximumSize), 0);
                const minDelta = Math.max(minDeltaUp, minDeltaDown);
                const maxDelta = Math.min(maxDeltaDown, maxDeltaUp);
                const snapBeforeIndex = this.findFirstSnapIndex(upIndexes);
                const snapAfterIndex = this.findFirstSnapIndex(downIndexes);
                if (typeof snapBeforeIndex === 'number') {
                    const viewItem = this.viewItems[snapBeforeIndex];
                    const halfSize = Math.floor(viewItem.viewMinimumSize / 2);
                    snapBefore = {
                        index: snapBeforeIndex,
                        limitDelta: viewItem.visible ? minDelta - halfSize : minDelta + halfSize,
                        size: viewItem.size,
                    };
                }
                if (typeof snapAfterIndex === 'number') {
                    const viewItem = this.viewItems[snapAfterIndex];
                    const halfSize = Math.floor(viewItem.viewMinimumSize / 2);
                    snapAfter = {
                        index: snapAfterIndex,
                        limitDelta: viewItem.visible ? maxDelta + halfSize : maxDelta - halfSize,
                        size: viewItem.size,
                    };
                }
            }
            this.sashDragState = {
                start,
                current: start,
                index,
                sizes,
                minDelta,
                maxDelta,
                alt,
                snapBefore,
                snapAfter,
                disposable,
            };
        };
        resetSashDragState(start, alt);
    }
    onSashChange({ current }) {
        const { index, start, sizes, alt, minDelta, maxDelta, snapBefore, snapAfter } = this.sashDragState;
        this.sashDragState.current = current;
        const delta = current - start;
        const newDelta = this.resize(index, delta, sizes, undefined, undefined, minDelta, maxDelta, snapBefore, snapAfter);
        if (alt) {
            const isLastSash = index === this.sashItems.length - 1;
            const newSizes = this.viewItems.map((i) => i.size);
            const viewItemIndex = isLastSash ? index : index + 1;
            const viewItem = this.viewItems[viewItemIndex];
            const newMinDelta = viewItem.size - viewItem.maximumSize;
            const newMaxDelta = viewItem.size - viewItem.minimumSize;
            const resizeIndex = isLastSash ? index - 1 : index + 1;
            this.resize(resizeIndex, -newDelta, newSizes, undefined, undefined, newMinDelta, newMaxDelta);
        }
        this.distributeEmptySpace();
        this.layoutViews();
    }
    onSashEnd(index) {
        this._onDidSashChange.fire(index);
        this.sashDragState.disposable.dispose();
        this.saveProportions();
        for (const item of this.viewItems) {
            item.enabled = true;
        }
    }
    onViewChange(item, size) {
        const index = this.viewItems.indexOf(item);
        if (index < 0 || index >= this.viewItems.length) {
            return;
        }
        size = typeof size === 'number' ? size : item.size;
        size = clamp(size, item.minimumSize, item.maximumSize);
        if (this.inverseAltBehavior && index > 0) {
            // In this case, we want the view to grow or shrink both sides equally
            // so we just resize the "left" side by half and let `resize` do the clamping magic
            this.resize(index - 1, Math.floor((item.size - size) / 2));
            this.distributeEmptySpace();
            this.layoutViews();
        }
        else {
            item.size = size;
            this.relayout([index], undefined);
        }
    }
    /**
     * Resize a {@link IView view} within the {@link SplitView}.
     *
     * @param index The {@link IView view} index.
     * @param size The {@link IView view} size.
     */
    resizeView(index, size) {
        if (index < 0 || index >= this.viewItems.length) {
            return;
        }
        if (this.state !== State.Idle) {
            throw new Error('Cant modify splitview');
        }
        this.state = State.Busy;
        try {
            const indexes = range(this.viewItems.length).filter((i) => i !== index);
            const lowPriorityIndexes = [
                ...indexes.filter((i) => this.viewItems[i].priority === 1 /* LayoutPriority.Low */),
                index,
            ];
            const highPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 2 /* LayoutPriority.High */);
            const item = this.viewItems[index];
            size = Math.round(size);
            size = clamp(size, item.minimumSize, Math.min(item.maximumSize, this.size));
            item.size = size;
            this.relayout(lowPriorityIndexes, highPriorityIndexes);
        }
        finally {
            this.state = State.Idle;
        }
    }
    /**
     * Returns whether all other {@link IView views} are at their minimum size.
     */
    isViewExpanded(index) {
        if (index < 0 || index >= this.viewItems.length) {
            return false;
        }
        for (const item of this.viewItems) {
            if (item !== this.viewItems[index] && item.size > item.minimumSize) {
                return false;
            }
        }
        return true;
    }
    /**
     * Distribute the entire {@link SplitView} size among all {@link IView views}.
     */
    distributeViewSizes() {
        const flexibleViewItems = [];
        let flexibleSize = 0;
        for (const item of this.viewItems) {
            if (item.maximumSize - item.minimumSize > 0) {
                flexibleViewItems.push(item);
                flexibleSize += item.size;
            }
        }
        const size = Math.floor(flexibleSize / flexibleViewItems.length);
        for (const item of flexibleViewItems) {
            item.size = clamp(size, item.minimumSize, item.maximumSize);
        }
        const indexes = range(this.viewItems.length);
        const lowPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 1 /* LayoutPriority.Low */);
        const highPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 2 /* LayoutPriority.High */);
        this.relayout(lowPriorityIndexes, highPriorityIndexes);
    }
    /**
     * Returns the size of a {@link IView view}.
     */
    getViewSize(index) {
        if (index < 0 || index >= this.viewItems.length) {
            return -1;
        }
        return this.viewItems[index].size;
    }
    doAddView(view, size, index = this.viewItems.length, skipLayout) {
        if (this.state !== State.Idle) {
            throw new Error('Cant modify splitview');
        }
        this.state = State.Busy;
        try {
            // Add view
            const container = $('.split-view-view');
            if (index === this.viewItems.length) {
                this.viewContainer.appendChild(container);
            }
            else {
                this.viewContainer.insertBefore(container, this.viewContainer.children.item(index));
            }
            const onChangeDisposable = view.onDidChange((size) => this.onViewChange(item, size));
            const containerDisposable = toDisposable(() => container.remove());
            const disposable = combinedDisposable(onChangeDisposable, containerDisposable);
            let viewSize;
            if (typeof size === 'number') {
                viewSize = size;
            }
            else {
                if (size.type === 'auto') {
                    if (this.areViewsDistributed()) {
                        size = { type: 'distribute' };
                    }
                    else {
                        size = { type: 'split', index: size.index };
                    }
                }
                if (size.type === 'split') {
                    viewSize = this.getViewSize(size.index) / 2;
                }
                else if (size.type === 'invisible') {
                    viewSize = { cachedVisibleSize: size.cachedVisibleSize };
                }
                else {
                    viewSize = view.minimumSize;
                }
            }
            const item = this.orientation === 0 /* Orientation.VERTICAL */
                ? new VerticalViewItem(container, view, viewSize, disposable)
                : new HorizontalViewItem(container, view, viewSize, disposable);
            this.viewItems.splice(index, 0, item);
            // Add sash
            if (this.viewItems.length > 1) {
                const opts = {
                    orthogonalStartSash: this.orthogonalStartSash,
                    orthogonalEndSash: this.orthogonalEndSash,
                };
                const sash = this.orientation === 0 /* Orientation.VERTICAL */
                    ? new Sash(this.sashContainer, {
                        getHorizontalSashTop: (s) => this.getSashPosition(s),
                        getHorizontalSashWidth: this.getSashOrthogonalSize,
                    }, { ...opts, orientation: 1 /* Orientation.HORIZONTAL */ })
                    : new Sash(this.sashContainer, {
                        getVerticalSashLeft: (s) => this.getSashPosition(s),
                        getVerticalSashHeight: this.getSashOrthogonalSize,
                    }, { ...opts, orientation: 0 /* Orientation.VERTICAL */ });
                const sashEventMapper = this.orientation === 0 /* Orientation.VERTICAL */
                    ? (e) => ({ sash, start: e.startY, current: e.currentY, alt: e.altKey })
                    : (e) => ({ sash, start: e.startX, current: e.currentX, alt: e.altKey });
                const onStart = Event.map(sash.onDidStart, sashEventMapper);
                const onStartDisposable = onStart(this.onSashStart, this);
                const onChange = Event.map(sash.onDidChange, sashEventMapper);
                const onChangeDisposable = onChange(this.onSashChange, this);
                const onEnd = Event.map(sash.onDidEnd, () => this.sashItems.findIndex((item) => item.sash === sash));
                const onEndDisposable = onEnd(this.onSashEnd, this);
                const onDidResetDisposable = sash.onDidReset(() => {
                    const index = this.sashItems.findIndex((item) => item.sash === sash);
                    const upIndexes = range(index, -1);
                    const downIndexes = range(index + 1, this.viewItems.length);
                    const snapBeforeIndex = this.findFirstSnapIndex(upIndexes);
                    const snapAfterIndex = this.findFirstSnapIndex(downIndexes);
                    if (typeof snapBeforeIndex === 'number' && !this.viewItems[snapBeforeIndex].visible) {
                        return;
                    }
                    if (typeof snapAfterIndex === 'number' && !this.viewItems[snapAfterIndex].visible) {
                        return;
                    }
                    this._onDidSashReset.fire(index);
                });
                const disposable = combinedDisposable(onStartDisposable, onChangeDisposable, onEndDisposable, onDidResetDisposable, sash);
                const sashItem = { sash, disposable };
                this.sashItems.splice(index - 1, 0, sashItem);
            }
            container.appendChild(view.element);
            let highPriorityIndexes;
            if (typeof size !== 'number' && size.type === 'split') {
                highPriorityIndexes = [size.index];
            }
            if (!skipLayout) {
                this.relayout([index], highPriorityIndexes);
            }
            if (!skipLayout && typeof size !== 'number' && size.type === 'distribute') {
                this.distributeViewSizes();
            }
        }
        finally {
            this.state = State.Idle;
        }
    }
    relayout(lowPriorityIndexes, highPriorityIndexes) {
        const contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
        this.resize(this.viewItems.length - 1, this.size - contentSize, undefined, lowPriorityIndexes, highPriorityIndexes);
        this.distributeEmptySpace();
        this.layoutViews();
        this.saveProportions();
    }
    resize(index, delta, sizes = this.viewItems.map((i) => i.size), lowPriorityIndexes, highPriorityIndexes, overloadMinDelta = Number.NEGATIVE_INFINITY, overloadMaxDelta = Number.POSITIVE_INFINITY, snapBefore, snapAfter) {
        if (index < 0 || index >= this.viewItems.length) {
            return 0;
        }
        const upIndexes = range(index, -1);
        const downIndexes = range(index + 1, this.viewItems.length);
        if (highPriorityIndexes) {
            for (const index of highPriorityIndexes) {
                pushToStart(upIndexes, index);
                pushToStart(downIndexes, index);
            }
        }
        if (lowPriorityIndexes) {
            for (const index of lowPriorityIndexes) {
                pushToEnd(upIndexes, index);
                pushToEnd(downIndexes, index);
            }
        }
        const upItems = upIndexes.map((i) => this.viewItems[i]);
        const upSizes = upIndexes.map((i) => sizes[i]);
        const downItems = downIndexes.map((i) => this.viewItems[i]);
        const downSizes = downIndexes.map((i) => sizes[i]);
        const minDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].minimumSize - sizes[i]), 0);
        const maxDeltaUp = upIndexes.reduce((r, i) => r + (this.viewItems[i].maximumSize - sizes[i]), 0);
        const maxDeltaDown = downIndexes.length === 0
            ? Number.POSITIVE_INFINITY
            : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].minimumSize), 0);
        const minDeltaDown = downIndexes.length === 0
            ? Number.NEGATIVE_INFINITY
            : downIndexes.reduce((r, i) => r + (sizes[i] - this.viewItems[i].maximumSize), 0);
        const minDelta = Math.max(minDeltaUp, minDeltaDown, overloadMinDelta);
        const maxDelta = Math.min(maxDeltaDown, maxDeltaUp, overloadMaxDelta);
        let snapped = false;
        if (snapBefore) {
            const snapView = this.viewItems[snapBefore.index];
            const visible = delta >= snapBefore.limitDelta;
            snapped = visible !== snapView.visible;
            snapView.setVisible(visible, snapBefore.size);
        }
        if (!snapped && snapAfter) {
            const snapView = this.viewItems[snapAfter.index];
            const visible = delta < snapAfter.limitDelta;
            snapped = visible !== snapView.visible;
            snapView.setVisible(visible, snapAfter.size);
        }
        if (snapped) {
            return this.resize(index, delta, sizes, lowPriorityIndexes, highPriorityIndexes, overloadMinDelta, overloadMaxDelta);
        }
        delta = clamp(delta, minDelta, maxDelta);
        for (let i = 0, deltaUp = delta; i < upItems.length; i++) {
            const item = upItems[i];
            const size = clamp(upSizes[i] + deltaUp, item.minimumSize, item.maximumSize);
            const viewDelta = size - upSizes[i];
            deltaUp -= viewDelta;
            item.size = size;
        }
        for (let i = 0, deltaDown = delta; i < downItems.length; i++) {
            const item = downItems[i];
            const size = clamp(downSizes[i] - deltaDown, item.minimumSize, item.maximumSize);
            const viewDelta = size - downSizes[i];
            deltaDown += viewDelta;
            item.size = size;
        }
        return delta;
    }
    distributeEmptySpace(lowPriorityIndex) {
        const contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
        let emptyDelta = this.size - contentSize;
        const indexes = range(this.viewItems.length - 1, -1);
        const lowPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 1 /* LayoutPriority.Low */);
        const highPriorityIndexes = indexes.filter((i) => this.viewItems[i].priority === 2 /* LayoutPriority.High */);
        for (const index of highPriorityIndexes) {
            pushToStart(indexes, index);
        }
        for (const index of lowPriorityIndexes) {
            pushToEnd(indexes, index);
        }
        if (typeof lowPriorityIndex === 'number') {
            pushToEnd(indexes, lowPriorityIndex);
        }
        for (let i = 0; emptyDelta !== 0 && i < indexes.length; i++) {
            const item = this.viewItems[indexes[i]];
            const size = clamp(item.size + emptyDelta, item.minimumSize, item.maximumSize);
            const viewDelta = size - item.size;
            emptyDelta -= viewDelta;
            item.size = size;
        }
    }
    layoutViews() {
        // Save new content size
        this._contentSize = this.viewItems.reduce((r, i) => r + i.size, 0);
        // Layout views
        let offset = 0;
        for (const viewItem of this.viewItems) {
            viewItem.layout(offset, this.layoutContext);
            offset += viewItem.size;
        }
        // Layout sashes
        this.sashItems.forEach((item) => item.sash.layout());
        this.updateSashEnablement();
        this.updateScrollableElement();
    }
    updateScrollableElement() {
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            this.scrollableElement.setScrollDimensions({
                height: this.size,
                scrollHeight: this._contentSize,
            });
        }
        else {
            this.scrollableElement.setScrollDimensions({
                width: this.size,
                scrollWidth: this._contentSize,
            });
        }
    }
    updateSashEnablement() {
        let previous = false;
        const collapsesDown = this.viewItems.map((i) => (previous = i.size - i.minimumSize > 0 || previous));
        previous = false;
        const expandsDown = this.viewItems.map((i) => (previous = i.maximumSize - i.size > 0 || previous));
        const reverseViews = [...this.viewItems].reverse();
        previous = false;
        const collapsesUp = reverseViews
            .map((i) => (previous = i.size - i.minimumSize > 0 || previous))
            .reverse();
        previous = false;
        const expandsUp = reverseViews
            .map((i) => (previous = i.maximumSize - i.size > 0 || previous))
            .reverse();
        let position = 0;
        for (let index = 0; index < this.sashItems.length; index++) {
            const { sash } = this.sashItems[index];
            const viewItem = this.viewItems[index];
            position += viewItem.size;
            const min = !(collapsesDown[index] && expandsUp[index + 1]);
            const max = !(expandsDown[index] && collapsesUp[index + 1]);
            if (min && max) {
                const upIndexes = range(index, -1);
                const downIndexes = range(index + 1, this.viewItems.length);
                const snapBeforeIndex = this.findFirstSnapIndex(upIndexes);
                const snapAfterIndex = this.findFirstSnapIndex(downIndexes);
                const snappedBefore = typeof snapBeforeIndex === 'number' && !this.viewItems[snapBeforeIndex].visible;
                const snappedAfter = typeof snapAfterIndex === 'number' && !this.viewItems[snapAfterIndex].visible;
                if (snappedBefore && collapsesUp[index] && (position > 0 || this.startSnappingEnabled)) {
                    sash.state = 1 /* SashState.AtMinimum */;
                }
                else if (snappedAfter &&
                    collapsesDown[index] &&
                    (position < this._contentSize || this.endSnappingEnabled)) {
                    sash.state = 2 /* SashState.AtMaximum */;
                }
                else {
                    sash.state = 0 /* SashState.Disabled */;
                }
            }
            else if (min && !max) {
                sash.state = 1 /* SashState.AtMinimum */;
            }
            else if (!min && max) {
                sash.state = 2 /* SashState.AtMaximum */;
            }
            else {
                sash.state = 3 /* SashState.Enabled */;
            }
        }
    }
    getSashPosition(sash) {
        let position = 0;
        for (let i = 0; i < this.sashItems.length; i++) {
            position += this.viewItems[i].size;
            if (this.sashItems[i].sash === sash) {
                return position;
            }
        }
        return 0;
    }
    findFirstSnapIndex(indexes) {
        // visible views first
        for (const index of indexes) {
            const viewItem = this.viewItems[index];
            if (!viewItem.visible) {
                continue;
            }
            if (viewItem.snap) {
                return index;
            }
        }
        // then, hidden views
        for (const index of indexes) {
            const viewItem = this.viewItems[index];
            if (viewItem.visible && viewItem.maximumSize - viewItem.minimumSize > 0) {
                return undefined;
            }
            if (!viewItem.visible && viewItem.snap) {
                return index;
            }
        }
        return undefined;
    }
    areViewsDistributed() {
        let min = undefined, max = undefined;
        for (const view of this.viewItems) {
            min = min === undefined ? view.size : Math.min(min, view.size);
            max = max === undefined ? view.size : Math.max(max, view.size);
            if (max - min > 2) {
                return false;
            }
        }
        return true;
    }
    dispose() {
        this.sashDragState?.disposable.dispose();
        dispose(this.viewItems);
        this.viewItems = [];
        this.sashItems.forEach((i) => i.disposable.dispose());
        this.sashItems = [];
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXR2aWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3NwbGl0dmlldy9zcGxpdHZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCw0QkFBNEIsR0FDNUIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzNDLE9BQU8sRUFBNkMsSUFBSSxFQUFhLE1BQU0saUJBQWlCLENBQUE7QUFDNUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixVQUFVLEVBQ1YsT0FBTyxFQUVQLFlBQVksR0FDWixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFvQyxNQUFNLCtCQUErQixDQUFBO0FBQzVGLE9BQU8sS0FBSyxLQUFLLE1BQU0sMEJBQTBCLENBQUE7QUFDakQsT0FBTyxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFNN0MsTUFBTSxhQUFhLEdBQXFCO0lBQ3ZDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVztDQUNsQyxDQUFBO0FB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