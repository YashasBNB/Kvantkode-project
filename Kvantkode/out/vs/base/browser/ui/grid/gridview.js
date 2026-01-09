/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../dom.js';
import { Sizing, SplitView, } from '../splitview/splitview.js';
import { equals as arrayEquals, tail } from '../../../common/arrays.js';
import { Color } from '../../../common/color.js';
import { Emitter, Event, Relay } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../common/lifecycle.js';
import { rot } from '../../../common/numbers.js';
import { isUndefined } from '../../../common/types.js';
import './gridview.css';
export { Orientation } from '../sash/sash.js';
export { LayoutPriority, Sizing } from '../splitview/splitview.js';
const defaultStyles = {
    separatorBorder: Color.transparent,
};
export function orthogonal(orientation) {
    return orientation === 0 /* Orientation.VERTICAL */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
}
export function isGridBranchNode(node) {
    return !!node.children;
}
class LayoutController {
    constructor(isLayoutEnabled) {
        this.isLayoutEnabled = isLayoutEnabled;
    }
}
function toAbsoluteBoundarySashes(sashes, orientation) {
    if (orientation === 1 /* Orientation.HORIZONTAL */) {
        return {
            left: sashes.start,
            right: sashes.end,
            top: sashes.orthogonalStart,
            bottom: sashes.orthogonalEnd,
        };
    }
    else {
        return {
            top: sashes.start,
            bottom: sashes.end,
            left: sashes.orthogonalStart,
            right: sashes.orthogonalEnd,
        };
    }
}
function fromAbsoluteBoundarySashes(sashes, orientation) {
    if (orientation === 1 /* Orientation.HORIZONTAL */) {
        return {
            start: sashes.left,
            end: sashes.right,
            orthogonalStart: sashes.top,
            orthogonalEnd: sashes.bottom,
        };
    }
    else {
        return {
            start: sashes.top,
            end: sashes.bottom,
            orthogonalStart: sashes.left,
            orthogonalEnd: sashes.right,
        };
    }
}
function validateIndex(index, numChildren) {
    if (Math.abs(index) > numChildren) {
        throw new Error('Invalid index');
    }
    return rot(index, numChildren + 1);
}
class BranchNode {
    get size() {
        return this._size;
    }
    get orthogonalSize() {
        return this._orthogonalSize;
    }
    get absoluteOffset() {
        return this._absoluteOffset;
    }
    get absoluteOrthogonalOffset() {
        return this._absoluteOrthogonalOffset;
    }
    get styles() {
        return this._styles;
    }
    get width() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.size : this.orthogonalSize;
    }
    get height() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.orthogonalSize : this.size;
    }
    get top() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this._absoluteOffset
            : this._absoluteOrthogonalOffset;
    }
    get left() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this._absoluteOrthogonalOffset
            : this._absoluteOffset;
    }
    get minimumSize() {
        return this.children.length === 0
            ? 0
            : Math.max(...this.children.map((c, index) => this.splitview.isViewVisible(index) ? c.minimumOrthogonalSize : 0));
    }
    get maximumSize() {
        return Math.min(...this.children.map((c, index) => this.splitview.isViewVisible(index) ? c.maximumOrthogonalSize : Number.POSITIVE_INFINITY));
    }
    get priority() {
        if (this.children.length === 0) {
            return 0 /* LayoutPriority.Normal */;
        }
        const priorities = this.children.map((c) => typeof c.priority === 'undefined' ? 0 /* LayoutPriority.Normal */ : c.priority);
        if (priorities.some((p) => p === 2 /* LayoutPriority.High */)) {
            return 2 /* LayoutPriority.High */;
        }
        else if (priorities.some((p) => p === 1 /* LayoutPriority.Low */)) {
            return 1 /* LayoutPriority.Low */;
        }
        return 0 /* LayoutPriority.Normal */;
    }
    get proportionalLayout() {
        if (this.children.length === 0) {
            return true;
        }
        return this.children.every((c) => c.proportionalLayout);
    }
    get minimumOrthogonalSize() {
        return this.splitview.minimumSize;
    }
    get maximumOrthogonalSize() {
        return this.splitview.maximumSize;
    }
    get minimumWidth() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this.minimumOrthogonalSize
            : this.minimumSize;
    }
    get minimumHeight() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this.minimumSize
            : this.minimumOrthogonalSize;
    }
    get maximumWidth() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this.maximumOrthogonalSize
            : this.maximumSize;
    }
    get maximumHeight() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this.maximumSize
            : this.maximumOrthogonalSize;
    }
    get boundarySashes() {
        return this._boundarySashes;
    }
    set boundarySashes(boundarySashes) {
        if (this._boundarySashes.start === boundarySashes.start &&
            this._boundarySashes.end === boundarySashes.end &&
            this._boundarySashes.orthogonalStart === boundarySashes.orthogonalStart &&
            this._boundarySashes.orthogonalEnd === boundarySashes.orthogonalEnd) {
            return;
        }
        this._boundarySashes = boundarySashes;
        this.splitview.orthogonalStartSash = boundarySashes.orthogonalStart;
        this.splitview.orthogonalEndSash = boundarySashes.orthogonalEnd;
        for (let index = 0; index < this.children.length; index++) {
            const child = this.children[index];
            const first = index === 0;
            const last = index === this.children.length - 1;
            child.boundarySashes = {
                start: boundarySashes.orthogonalStart,
                end: boundarySashes.orthogonalEnd,
                orthogonalStart: first ? boundarySashes.start : child.boundarySashes.orthogonalStart,
                orthogonalEnd: last ? boundarySashes.end : child.boundarySashes.orthogonalEnd,
            };
        }
    }
    get edgeSnapping() {
        return this._edgeSnapping;
    }
    set edgeSnapping(edgeSnapping) {
        if (this._edgeSnapping === edgeSnapping) {
            return;
        }
        this._edgeSnapping = edgeSnapping;
        for (const child of this.children) {
            if (child instanceof BranchNode) {
                child.edgeSnapping = edgeSnapping;
            }
        }
        this.updateSplitviewEdgeSnappingEnablement();
    }
    constructor(orientation, layoutController, styles, splitviewProportionalLayout, size = 0, orthogonalSize = 0, edgeSnapping = false, childDescriptors) {
        this.orientation = orientation;
        this.layoutController = layoutController;
        this.splitviewProportionalLayout = splitviewProportionalLayout;
        this.children = [];
        this._absoluteOffset = 0;
        this._absoluteOrthogonalOffset = 0;
        this.absoluteOrthogonalSize = 0;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._onDidVisibilityChange = new Emitter();
        this.onDidVisibilityChange = this._onDidVisibilityChange.event;
        this.childrenVisibilityChangeDisposable = new DisposableStore();
        this._onDidScroll = new Emitter();
        this.onDidScrollDisposable = Disposable.None;
        this.onDidScroll = this._onDidScroll.event;
        this.childrenChangeDisposable = Disposable.None;
        this._onDidSashReset = new Emitter();
        this.onDidSashReset = this._onDidSashReset.event;
        this.splitviewSashResetDisposable = Disposable.None;
        this.childrenSashResetDisposable = Disposable.None;
        this._boundarySashes = {};
        this._edgeSnapping = false;
        this._styles = styles;
        this._size = size;
        this._orthogonalSize = orthogonalSize;
        this.element = $('.monaco-grid-branch-node');
        if (!childDescriptors) {
            // Normal behavior, we have no children yet, just set up the splitview
            this.splitview = new SplitView(this.element, {
                orientation,
                styles,
                proportionalLayout: splitviewProportionalLayout,
            });
            this.splitview.layout(size, {
                orthogonalSize,
                absoluteOffset: 0,
                absoluteOrthogonalOffset: 0,
                absoluteSize: size,
                absoluteOrthogonalSize: orthogonalSize,
            });
        }
        else {
            // Reconstruction behavior, we want to reconstruct a splitview
            const descriptor = {
                views: childDescriptors.map((childDescriptor) => {
                    return {
                        view: childDescriptor.node,
                        size: childDescriptor.node.size,
                        visible: childDescriptor.visible !== false,
                    };
                }),
                size: this.orthogonalSize,
            };
            const options = { proportionalLayout: splitviewProportionalLayout, orientation, styles };
            this.children = childDescriptors.map((c) => c.node);
            this.splitview = new SplitView(this.element, { ...options, descriptor });
            this.children.forEach((node, index) => {
                const first = index === 0;
                const last = index === this.children.length;
                node.boundarySashes = {
                    start: this.boundarySashes.orthogonalStart,
                    end: this.boundarySashes.orthogonalEnd,
                    orthogonalStart: first ? this.boundarySashes.start : this.splitview.sashes[index - 1],
                    orthogonalEnd: last ? this.boundarySashes.end : this.splitview.sashes[index],
                };
            });
        }
        const onDidSashReset = Event.map(this.splitview.onDidSashReset, (i) => [i]);
        this.splitviewSashResetDisposable = onDidSashReset(this._onDidSashReset.fire, this._onDidSashReset);
        this.updateChildrenEvents();
    }
    style(styles) {
        this._styles = styles;
        this.splitview.style(styles);
        for (const child of this.children) {
            if (child instanceof BranchNode) {
                child.style(styles);
            }
        }
    }
    layout(size, offset, ctx) {
        if (!this.layoutController.isLayoutEnabled) {
            return;
        }
        if (typeof ctx === 'undefined') {
            throw new Error('Invalid state');
        }
        // branch nodes should flip the normal/orthogonal directions
        this._size = ctx.orthogonalSize;
        this._orthogonalSize = size;
        this._absoluteOffset = ctx.absoluteOffset + offset;
        this._absoluteOrthogonalOffset = ctx.absoluteOrthogonalOffset;
        this.absoluteOrthogonalSize = ctx.absoluteOrthogonalSize;
        this.splitview.layout(ctx.orthogonalSize, {
            orthogonalSize: size,
            absoluteOffset: this._absoluteOrthogonalOffset,
            absoluteOrthogonalOffset: this._absoluteOffset,
            absoluteSize: ctx.absoluteOrthogonalSize,
            absoluteOrthogonalSize: ctx.absoluteSize,
        });
        this.updateSplitviewEdgeSnappingEnablement();
    }
    setVisible(visible) {
        for (const child of this.children) {
            child.setVisible(visible);
        }
    }
    addChild(node, size, index, skipLayout) {
        index = validateIndex(index, this.children.length);
        this.splitview.addView(node, size, index, skipLayout);
        this.children.splice(index, 0, node);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
    }
    removeChild(index, sizing) {
        index = validateIndex(index, this.children.length);
        const result = this.splitview.removeView(index, sizing);
        this.children.splice(index, 1);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
        return result;
    }
    removeAllChildren() {
        const result = this.splitview.removeAllViews();
        this.children.splice(0, this.children.length);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
        return result;
    }
    moveChild(from, to) {
        from = validateIndex(from, this.children.length);
        to = validateIndex(to, this.children.length);
        if (from === to) {
            return;
        }
        if (from < to) {
            to -= 1;
        }
        this.splitview.moveView(from, to);
        this.children.splice(to, 0, this.children.splice(from, 1)[0]);
        this.updateBoundarySashes();
        this.onDidChildrenChange();
    }
    swapChildren(from, to) {
        from = validateIndex(from, this.children.length);
        to = validateIndex(to, this.children.length);
        if (from === to) {
            return;
        }
        this.splitview.swapViews(from, to);
        [this.children[from].boundarySashes, this.children[to].boundarySashes] = [
            this.children[from].boundarySashes,
            this.children[to].boundarySashes,
        ];
        [this.children[from], this.children[to]] = [this.children[to], this.children[from]];
        this.onDidChildrenChange();
    }
    resizeChild(index, size) {
        index = validateIndex(index, this.children.length);
        this.splitview.resizeView(index, size);
    }
    isChildExpanded(index) {
        return this.splitview.isViewExpanded(index);
    }
    distributeViewSizes(recursive = false) {
        this.splitview.distributeViewSizes();
        if (recursive) {
            for (const child of this.children) {
                if (child instanceof BranchNode) {
                    child.distributeViewSizes(true);
                }
            }
        }
    }
    getChildSize(index) {
        index = validateIndex(index, this.children.length);
        return this.splitview.getViewSize(index);
    }
    isChildVisible(index) {
        index = validateIndex(index, this.children.length);
        return this.splitview.isViewVisible(index);
    }
    setChildVisible(index, visible) {
        index = validateIndex(index, this.children.length);
        if (this.splitview.isViewVisible(index) === visible) {
            return;
        }
        const wereAllChildrenHidden = this.splitview.contentSize === 0;
        this.splitview.setViewVisible(index, visible);
        const areAllChildrenHidden = this.splitview.contentSize === 0;
        // If all children are hidden then the parent should hide the entire splitview
        // If the entire splitview is hidden then the parent should show the splitview when a child is shown
        if ((visible && wereAllChildrenHidden) || (!visible && areAllChildrenHidden)) {
            this._onDidVisibilityChange.fire(visible);
        }
    }
    getChildCachedVisibleSize(index) {
        index = validateIndex(index, this.children.length);
        return this.splitview.getViewCachedVisibleSize(index);
    }
    updateBoundarySashes() {
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].boundarySashes = {
                start: this.boundarySashes.orthogonalStart,
                end: this.boundarySashes.orthogonalEnd,
                orthogonalStart: i === 0 ? this.boundarySashes.start : this.splitview.sashes[i - 1],
                orthogonalEnd: i === this.children.length - 1 ? this.boundarySashes.end : this.splitview.sashes[i],
            };
        }
    }
    onDidChildrenChange() {
        this.updateChildrenEvents();
        this._onDidChange.fire(undefined);
    }
    updateChildrenEvents() {
        const onDidChildrenChange = Event.map(Event.any(...this.children.map((c) => c.onDidChange)), () => undefined);
        this.childrenChangeDisposable.dispose();
        this.childrenChangeDisposable = onDidChildrenChange(this._onDidChange.fire, this._onDidChange);
        const onDidChildrenSashReset = Event.any(...this.children.map((c, i) => Event.map(c.onDidSashReset, (location) => [i, ...location])));
        this.childrenSashResetDisposable.dispose();
        this.childrenSashResetDisposable = onDidChildrenSashReset(this._onDidSashReset.fire, this._onDidSashReset);
        const onDidScroll = Event.any(Event.signal(this.splitview.onDidScroll), ...this.children.map((c) => c.onDidScroll));
        this.onDidScrollDisposable.dispose();
        this.onDidScrollDisposable = onDidScroll(this._onDidScroll.fire, this._onDidScroll);
        this.childrenVisibilityChangeDisposable.clear();
        this.children.forEach((child, index) => {
            if (child instanceof BranchNode) {
                this.childrenVisibilityChangeDisposable.add(child.onDidVisibilityChange((visible) => {
                    this.setChildVisible(index, visible);
                }));
            }
        });
    }
    trySet2x2(other) {
        if (this.children.length !== 2 || other.children.length !== 2) {
            return Disposable.None;
        }
        if (this.getChildSize(0) !== other.getChildSize(0)) {
            return Disposable.None;
        }
        const [firstChild, secondChild] = this.children;
        const [otherFirstChild, otherSecondChild] = other.children;
        if (!(firstChild instanceof LeafNode) || !(secondChild instanceof LeafNode)) {
            return Disposable.None;
        }
        if (!(otherFirstChild instanceof LeafNode) || !(otherSecondChild instanceof LeafNode)) {
            return Disposable.None;
        }
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            secondChild.linkedWidthNode = otherFirstChild.linkedHeightNode = firstChild;
            firstChild.linkedWidthNode = otherSecondChild.linkedHeightNode = secondChild;
            otherSecondChild.linkedWidthNode = firstChild.linkedHeightNode = otherFirstChild;
            otherFirstChild.linkedWidthNode = secondChild.linkedHeightNode = otherSecondChild;
        }
        else {
            otherFirstChild.linkedWidthNode = secondChild.linkedHeightNode = firstChild;
            otherSecondChild.linkedWidthNode = firstChild.linkedHeightNode = secondChild;
            firstChild.linkedWidthNode = otherSecondChild.linkedHeightNode = otherFirstChild;
            secondChild.linkedWidthNode = otherFirstChild.linkedHeightNode = otherSecondChild;
        }
        const mySash = this.splitview.sashes[0];
        const otherSash = other.splitview.sashes[0];
        mySash.linkedSash = otherSash;
        otherSash.linkedSash = mySash;
        this._onDidChange.fire(undefined);
        other._onDidChange.fire(undefined);
        return toDisposable(() => {
            mySash.linkedSash = otherSash.linkedSash = undefined;
            firstChild.linkedHeightNode = firstChild.linkedWidthNode = undefined;
            secondChild.linkedHeightNode = secondChild.linkedWidthNode = undefined;
            otherFirstChild.linkedHeightNode = otherFirstChild.linkedWidthNode = undefined;
            otherSecondChild.linkedHeightNode = otherSecondChild.linkedWidthNode = undefined;
        });
    }
    updateSplitviewEdgeSnappingEnablement() {
        this.splitview.startSnappingEnabled = this._edgeSnapping || this._absoluteOrthogonalOffset > 0;
        this.splitview.endSnappingEnabled =
            this._edgeSnapping ||
                this._absoluteOrthogonalOffset + this._size < this.absoluteOrthogonalSize;
    }
    dispose() {
        for (const child of this.children) {
            child.dispose();
        }
        this._onDidChange.dispose();
        this._onDidSashReset.dispose();
        this._onDidVisibilityChange.dispose();
        this.childrenVisibilityChangeDisposable.dispose();
        this.splitviewSashResetDisposable.dispose();
        this.childrenSashResetDisposable.dispose();
        this.childrenChangeDisposable.dispose();
        this.onDidScrollDisposable.dispose();
        this.splitview.dispose();
    }
}
/**
 * Creates a latched event that avoids being fired when the view
 * constraints do not change at all.
 */
function createLatchedOnDidChangeViewEvent(view) {
    const [onDidChangeViewConstraints, onDidSetViewSize] = Event.split(view.onDidChange, isUndefined);
    return Event.any(onDidSetViewSize, Event.map(Event.latch(Event.map(onDidChangeViewConstraints, (_) => [
        view.minimumWidth,
        view.maximumWidth,
        view.minimumHeight,
        view.maximumHeight,
    ]), arrayEquals), (_) => undefined));
}
class LeafNode {
    get size() {
        return this._size;
    }
    get orthogonalSize() {
        return this._orthogonalSize;
    }
    get linkedWidthNode() {
        return this._linkedWidthNode;
    }
    set linkedWidthNode(node) {
        this._onDidLinkedWidthNodeChange.input = node ? node._onDidViewChange : Event.None;
        this._linkedWidthNode = node;
        this._onDidSetLinkedNode.fire(undefined);
    }
    get linkedHeightNode() {
        return this._linkedHeightNode;
    }
    set linkedHeightNode(node) {
        this._onDidLinkedHeightNodeChange.input = node ? node._onDidViewChange : Event.None;
        this._linkedHeightNode = node;
        this._onDidSetLinkedNode.fire(undefined);
    }
    constructor(view, orientation, layoutController, orthogonalSize, size = 0) {
        this.view = view;
        this.orientation = orientation;
        this.layoutController = layoutController;
        this._size = 0;
        this.absoluteOffset = 0;
        this.absoluteOrthogonalOffset = 0;
        this.onDidScroll = Event.None;
        this.onDidSashReset = Event.None;
        this._onDidLinkedWidthNodeChange = new Relay();
        this._linkedWidthNode = undefined;
        this._onDidLinkedHeightNodeChange = new Relay();
        this._linkedHeightNode = undefined;
        this._onDidSetLinkedNode = new Emitter();
        this.disposables = new DisposableStore();
        this._boundarySashes = {};
        this.cachedWidth = 0;
        this.cachedHeight = 0;
        this.cachedTop = 0;
        this.cachedLeft = 0;
        this._orthogonalSize = orthogonalSize;
        this._size = size;
        const onDidChange = createLatchedOnDidChangeViewEvent(view);
        this._onDidViewChange = Event.map(onDidChange, (e) => e && (this.orientation === 0 /* Orientation.VERTICAL */ ? e.width : e.height), this.disposables);
        this.onDidChange = Event.any(this._onDidViewChange, this._onDidSetLinkedNode.event, this._onDidLinkedWidthNodeChange.event, this._onDidLinkedHeightNodeChange.event);
    }
    get width() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.orthogonalSize : this.size;
    }
    get height() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.size : this.orthogonalSize;
    }
    get top() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this.absoluteOffset
            : this.absoluteOrthogonalOffset;
    }
    get left() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */
            ? this.absoluteOrthogonalOffset
            : this.absoluteOffset;
    }
    get element() {
        return this.view.element;
    }
    get minimumWidth() {
        return this.linkedWidthNode
            ? Math.max(this.linkedWidthNode.view.minimumWidth, this.view.minimumWidth)
            : this.view.minimumWidth;
    }
    get maximumWidth() {
        return this.linkedWidthNode
            ? Math.min(this.linkedWidthNode.view.maximumWidth, this.view.maximumWidth)
            : this.view.maximumWidth;
    }
    get minimumHeight() {
        return this.linkedHeightNode
            ? Math.max(this.linkedHeightNode.view.minimumHeight, this.view.minimumHeight)
            : this.view.minimumHeight;
    }
    get maximumHeight() {
        return this.linkedHeightNode
            ? Math.min(this.linkedHeightNode.view.maximumHeight, this.view.maximumHeight)
            : this.view.maximumHeight;
    }
    get minimumSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.minimumHeight : this.minimumWidth;
    }
    get maximumSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.maximumHeight : this.maximumWidth;
    }
    get priority() {
        return this.view.priority;
    }
    get proportionalLayout() {
        return this.view.proportionalLayout ?? true;
    }
    get snap() {
        return this.view.snap;
    }
    get minimumOrthogonalSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.minimumWidth : this.minimumHeight;
    }
    get maximumOrthogonalSize() {
        return this.orientation === 1 /* Orientation.HORIZONTAL */ ? this.maximumWidth : this.maximumHeight;
    }
    get boundarySashes() {
        return this._boundarySashes;
    }
    set boundarySashes(boundarySashes) {
        this._boundarySashes = boundarySashes;
        this.view.setBoundarySashes?.(toAbsoluteBoundarySashes(boundarySashes, this.orientation));
    }
    layout(size, offset, ctx) {
        if (!this.layoutController.isLayoutEnabled) {
            return;
        }
        if (typeof ctx === 'undefined') {
            throw new Error('Invalid state');
        }
        this._size = size;
        this._orthogonalSize = ctx.orthogonalSize;
        this.absoluteOffset = ctx.absoluteOffset + offset;
        this.absoluteOrthogonalOffset = ctx.absoluteOrthogonalOffset;
        this._layout(this.width, this.height, this.top, this.left);
    }
    _layout(width, height, top, left) {
        if (this.cachedWidth === width &&
            this.cachedHeight === height &&
            this.cachedTop === top &&
            this.cachedLeft === left) {
            return;
        }
        this.cachedWidth = width;
        this.cachedHeight = height;
        this.cachedTop = top;
        this.cachedLeft = left;
        this.view.layout(width, height, top, left);
    }
    setVisible(visible) {
        this.view.setVisible?.(visible);
    }
    dispose() {
        this.disposables.dispose();
    }
}
function flipNode(node, size, orthogonalSize) {
    if (node instanceof BranchNode) {
        const result = new BranchNode(orthogonal(node.orientation), node.layoutController, node.styles, node.splitviewProportionalLayout, size, orthogonalSize, node.edgeSnapping);
        let totalSize = 0;
        for (let i = node.children.length - 1; i >= 0; i--) {
            const child = node.children[i];
            const childSize = child instanceof BranchNode ? child.orthogonalSize : child.size;
            let newSize = node.size === 0 ? 0 : Math.round((size * childSize) / node.size);
            totalSize += newSize;
            // The last view to add should adjust to rounding errors
            if (i === 0) {
                newSize += size - totalSize;
            }
            result.addChild(flipNode(child, orthogonalSize, newSize), newSize, 0, true);
        }
        node.dispose();
        return result;
    }
    else {
        const result = new LeafNode(node.view, orthogonal(node.orientation), node.layoutController, orthogonalSize);
        node.dispose();
        return result;
    }
}
/**
 * The {@link GridView} is the UI component which implements a two dimensional
 * flex-like layout algorithm for a collection of {@link IView} instances, which
 * are mostly HTMLElement instances with size constraints. A {@link GridView} is a
 * tree composition of multiple {@link SplitView} instances, orthogonal between
 * one another. It will respect view's size contraints, just like the SplitView.
 *
 * It has a low-level index based API, allowing for fine grain performant operations.
 * Look into the {@link Grid} widget for a higher-level API.
 *
 * Features:
 * - flex-like layout algorithm
 * - snap support
 * - corner sash support
 * - Alt key modifier behavior, macOS style
 * - layout (de)serialization
 */
export class GridView {
    get root() {
        return this._root;
    }
    set root(root) {
        const oldRoot = this._root;
        if (oldRoot) {
            oldRoot.element.remove();
            oldRoot.dispose();
        }
        this._root = root;
        this.element.appendChild(root.element);
        this.onDidSashResetRelay.input = root.onDidSashReset;
        this._onDidChange.input = Event.map(root.onDidChange, () => undefined); // TODO
        this._onDidScroll.input = root.onDidScroll;
    }
    /**
     * The width of the grid.
     */
    get width() {
        return this.root.width;
    }
    /**
     * The height of the grid.
     */
    get height() {
        return this.root.height;
    }
    /**
     * The minimum width of the grid.
     */
    get minimumWidth() {
        return this.root.minimumWidth;
    }
    /**
     * The minimum height of the grid.
     */
    get minimumHeight() {
        return this.root.minimumHeight;
    }
    /**
     * The maximum width of the grid.
     */
    get maximumWidth() {
        return this.root.maximumHeight;
    }
    /**
     * The maximum height of the grid.
     */
    get maximumHeight() {
        return this.root.maximumHeight;
    }
    get orientation() {
        return this._root.orientation;
    }
    get boundarySashes() {
        return this._boundarySashes;
    }
    /**
     * The orientation of the grid. Matches the orientation of the root
     * {@link SplitView} in the grid's tree model.
     */
    set orientation(orientation) {
        if (this._root.orientation === orientation) {
            return;
        }
        const { size, orthogonalSize, absoluteOffset, absoluteOrthogonalOffset } = this._root;
        this.root = flipNode(this._root, orthogonalSize, size);
        this.root.layout(size, 0, {
            orthogonalSize,
            absoluteOffset: absoluteOrthogonalOffset,
            absoluteOrthogonalOffset: absoluteOffset,
            absoluteSize: size,
            absoluteOrthogonalSize: orthogonalSize,
        });
        this.boundarySashes = this.boundarySashes;
    }
    /**
     * A collection of sashes perpendicular to each edge of the grid.
     * Corner sashes will be created for each intersection.
     */
    set boundarySashes(boundarySashes) {
        this._boundarySashes = boundarySashes;
        this.root.boundarySashes = fromAbsoluteBoundarySashes(boundarySashes, this.orientation);
    }
    /**
     * Enable/disable edge snapping across all grid views.
     */
    set edgeSnapping(edgeSnapping) {
        this.root.edgeSnapping = edgeSnapping;
    }
    /**
     * Create a new {@link GridView} instance.
     *
     * @remarks It's the caller's responsibility to append the
     * {@link GridView.element} to the page's DOM.
     */
    constructor(options = {}) {
        this.onDidSashResetRelay = new Relay();
        this._onDidScroll = new Relay();
        this._onDidChange = new Relay();
        this._boundarySashes = {};
        this.disposable2x2 = Disposable.None;
        /**
         * Fires whenever the user double clicks a {@link Sash sash}.
         */
        this.onDidSashReset = this.onDidSashResetRelay.event;
        /**
         * Fires whenever the user scrolls a {@link SplitView} within
         * the grid.
         */
        this.onDidScroll = this._onDidScroll.event;
        /**
         * Fires whenever a view within the grid changes its size constraints.
         */
        this.onDidChange = this._onDidChange.event;
        this.maximizedNode = undefined;
        this._onDidChangeViewMaximized = new Emitter();
        this.onDidChangeViewMaximized = this._onDidChangeViewMaximized.event;
        this.element = $('.monaco-grid-view');
        this.styles = options.styles || defaultStyles;
        this.proportionalLayout =
            typeof options.proportionalLayout !== 'undefined' ? !!options.proportionalLayout : true;
        this.layoutController = new LayoutController(false);
        this.root = new BranchNode(0 /* Orientation.VERTICAL */, this.layoutController, this.styles, this.proportionalLayout);
    }
    style(styles) {
        this.styles = styles;
        this.root.style(styles);
    }
    /**
     * Layout the {@link GridView}.
     *
     * Optionally provide a `top` and `left` positions, those will propagate
     * as an origin for positions passed to {@link IView.layout}.
     *
     * @param width The width of the {@link GridView}.
     * @param height The height of the {@link GridView}.
     * @param top Optional, the top location of the {@link GridView}.
     * @param left Optional, the left location of the {@link GridView}.
     */
    layout(width, height, top = 0, left = 0) {
        this.layoutController.isLayoutEnabled = true;
        const [size, orthogonalSize, offset, orthogonalOffset] = this.root.orientation === 1 /* Orientation.HORIZONTAL */
            ? [height, width, top, left]
            : [width, height, left, top];
        this.root.layout(size, 0, {
            orthogonalSize,
            absoluteOffset: offset,
            absoluteOrthogonalOffset: orthogonalOffset,
            absoluteSize: size,
            absoluteOrthogonalSize: orthogonalSize,
        });
    }
    /**
     * Add a {@link IView view} to this {@link GridView}.
     *
     * @param view The view to add.
     * @param size Either a fixed size, or a dynamic {@link Sizing} strategy.
     * @param location The {@link GridLocation location} to insert the view on.
     */
    addView(view, size, location) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        this.disposable2x2.dispose();
        this.disposable2x2 = Disposable.None;
        const [rest, index] = tail(location);
        const [pathToParent, parent] = this.getNode(rest);
        if (parent instanceof BranchNode) {
            const node = new LeafNode(view, orthogonal(parent.orientation), this.layoutController, parent.orthogonalSize);
            try {
                parent.addChild(node, size, index);
            }
            catch (err) {
                node.dispose();
                throw err;
            }
        }
        else {
            const [, grandParent] = tail(pathToParent);
            const [, parentIndex] = tail(rest);
            let newSiblingSize = 0;
            const newSiblingCachedVisibleSize = grandParent.getChildCachedVisibleSize(parentIndex);
            if (typeof newSiblingCachedVisibleSize === 'number') {
                newSiblingSize = Sizing.Invisible(newSiblingCachedVisibleSize);
            }
            const oldChild = grandParent.removeChild(parentIndex);
            oldChild.dispose();
            const newParent = new BranchNode(parent.orientation, parent.layoutController, this.styles, this.proportionalLayout, parent.size, parent.orthogonalSize, grandParent.edgeSnapping);
            grandParent.addChild(newParent, parent.size, parentIndex);
            const newSibling = new LeafNode(parent.view, grandParent.orientation, this.layoutController, parent.size);
            newParent.addChild(newSibling, newSiblingSize, 0);
            if (typeof size !== 'number' && size.type === 'split') {
                size = Sizing.Split(0);
            }
            const node = new LeafNode(view, grandParent.orientation, this.layoutController, parent.size);
            newParent.addChild(node, size, index);
        }
        this.trySet2x2();
    }
    /**
     * Remove a {@link IView view} from this {@link GridView}.
     *
     * @param location The {@link GridLocation location} of the {@link IView view}.
     * @param sizing Whether to distribute other {@link IView view}'s sizes.
     */
    removeView(location, sizing) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        this.disposable2x2.dispose();
        this.disposable2x2 = Disposable.None;
        const [rest, index] = tail(location);
        const [pathToParent, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        const node = parent.children[index];
        if (!(node instanceof LeafNode)) {
            throw new Error('Invalid location');
        }
        parent.removeChild(index, sizing);
        node.dispose();
        if (parent.children.length === 0) {
            throw new Error('Invalid grid state');
        }
        if (parent.children.length > 1) {
            this.trySet2x2();
            return node.view;
        }
        if (pathToParent.length === 0) {
            // parent is root
            const sibling = parent.children[0];
            if (sibling instanceof LeafNode) {
                return node.view;
            }
            // we must promote sibling to be the new root
            parent.removeChild(0);
            parent.dispose();
            this.root = sibling;
            this.boundarySashes = this.boundarySashes;
            this.trySet2x2();
            return node.view;
        }
        const [, grandParent] = tail(pathToParent);
        const [, parentIndex] = tail(rest);
        const isSiblingVisible = parent.isChildVisible(0);
        const sibling = parent.removeChild(0);
        const sizes = grandParent.children.map((_, i) => grandParent.getChildSize(i));
        grandParent.removeChild(parentIndex, sizing);
        parent.dispose();
        if (sibling instanceof BranchNode) {
            sizes.splice(parentIndex, 1, ...sibling.children.map((c) => c.size));
            const siblingChildren = sibling.removeAllChildren();
            for (let i = 0; i < siblingChildren.length; i++) {
                grandParent.addChild(siblingChildren[i], siblingChildren[i].size, parentIndex + i);
            }
        }
        else {
            const newSibling = new LeafNode(sibling.view, orthogonal(sibling.orientation), this.layoutController, sibling.size);
            const sizing = isSiblingVisible
                ? sibling.orthogonalSize
                : Sizing.Invisible(sibling.orthogonalSize);
            grandParent.addChild(newSibling, sizing, parentIndex);
        }
        sibling.dispose();
        for (let i = 0; i < sizes.length; i++) {
            grandParent.resizeChild(i, sizes[i]);
        }
        this.trySet2x2();
        return node.view;
    }
    /**
     * Move a {@link IView view} within its parent.
     *
     * @param parentLocation The {@link GridLocation location} of the {@link IView view}'s parent.
     * @param from The index of the {@link IView view} to move.
     * @param to The index where the {@link IView view} should move to.
     */
    moveView(parentLocation, from, to) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [, parent] = this.getNode(parentLocation);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        parent.moveChild(from, to);
        this.trySet2x2();
    }
    /**
     * Swap two {@link IView views} within the {@link GridView}.
     *
     * @param from The {@link GridLocation location} of one view.
     * @param to The {@link GridLocation location} of another view.
     */
    swapViews(from, to) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [fromRest, fromIndex] = tail(from);
        const [, fromParent] = this.getNode(fromRest);
        if (!(fromParent instanceof BranchNode)) {
            throw new Error('Invalid from location');
        }
        const fromSize = fromParent.getChildSize(fromIndex);
        const fromNode = fromParent.children[fromIndex];
        if (!(fromNode instanceof LeafNode)) {
            throw new Error('Invalid from location');
        }
        const [toRest, toIndex] = tail(to);
        const [, toParent] = this.getNode(toRest);
        if (!(toParent instanceof BranchNode)) {
            throw new Error('Invalid to location');
        }
        const toSize = toParent.getChildSize(toIndex);
        const toNode = toParent.children[toIndex];
        if (!(toNode instanceof LeafNode)) {
            throw new Error('Invalid to location');
        }
        if (fromParent === toParent) {
            fromParent.swapChildren(fromIndex, toIndex);
        }
        else {
            fromParent.removeChild(fromIndex);
            toParent.removeChild(toIndex);
            fromParent.addChild(toNode, fromSize, fromIndex);
            toParent.addChild(fromNode, toSize, toIndex);
        }
        this.trySet2x2();
    }
    /**
     * Resize a {@link IView view}.
     *
     * @param location The {@link GridLocation location} of the view.
     * @param size The size the view should be. Optionally provide a single dimension.
     */
    resizeView(location, size) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [rest, index] = tail(location);
        const [pathToParent, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        if (!size.width && !size.height) {
            return;
        }
        const [parentSize, grandParentSize] = parent.orientation === 1 /* Orientation.HORIZONTAL */
            ? [size.width, size.height]
            : [size.height, size.width];
        if (typeof grandParentSize === 'number' && pathToParent.length > 0) {
            const [, grandParent] = tail(pathToParent);
            const [, parentIndex] = tail(rest);
            grandParent.resizeChild(parentIndex, grandParentSize);
        }
        if (typeof parentSize === 'number') {
            parent.resizeChild(index, parentSize);
        }
        this.trySet2x2();
    }
    /**
     * Get the size of a {@link IView view}.
     *
     * @param location The {@link GridLocation location} of the view. Provide `undefined` to get
     * the size of the grid itself.
     */
    getViewSize(location) {
        if (!location) {
            return { width: this.root.width, height: this.root.height };
        }
        const [, node] = this.getNode(location);
        return { width: node.width, height: node.height };
    }
    /**
     * Get the cached visible size of a {@link IView view}. This was the size
     * of the view at the moment it last became hidden.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    getViewCachedVisibleSize(location) {
        const [rest, index] = tail(location);
        const [, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        return parent.getChildCachedVisibleSize(index);
    }
    /**
     * Maximize the size of a {@link IView view} by collapsing all other views
     * to their minimum sizes.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    expandView(location) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        const [ancestors, node] = this.getNode(location);
        if (!(node instanceof LeafNode)) {
            throw new Error('Invalid location');
        }
        for (let i = 0; i < ancestors.length; i++) {
            ancestors[i].resizeChild(location[i], Number.POSITIVE_INFINITY);
        }
    }
    /**
     * Returns whether all other {@link IView views} are at their minimum size.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    isViewExpanded(location) {
        if (this.hasMaximizedView()) {
            // No view can be expanded when a view is maximized
            return false;
        }
        const [ancestors, node] = this.getNode(location);
        if (!(node instanceof LeafNode)) {
            throw new Error('Invalid location');
        }
        for (let i = 0; i < ancestors.length; i++) {
            if (!ancestors[i].isChildExpanded(location[i])) {
                return false;
            }
        }
        return true;
    }
    maximizeView(location) {
        const [, nodeToMaximize] = this.getNode(location);
        if (!(nodeToMaximize instanceof LeafNode)) {
            throw new Error('Location is not a LeafNode');
        }
        if (this.maximizedNode === nodeToMaximize) {
            return;
        }
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        function hideAllViewsBut(parent, exclude) {
            for (let i = 0; i < parent.children.length; i++) {
                const child = parent.children[i];
                if (child instanceof LeafNode) {
                    if (child !== exclude) {
                        parent.setChildVisible(i, false);
                    }
                }
                else {
                    hideAllViewsBut(child, exclude);
                }
            }
        }
        hideAllViewsBut(this.root, nodeToMaximize);
        this.maximizedNode = nodeToMaximize;
        this._onDidChangeViewMaximized.fire(true);
    }
    exitMaximizedView() {
        if (!this.maximizedNode) {
            return;
        }
        this.maximizedNode = undefined;
        // When hiding a view, it's previous size is cached.
        // To restore the sizes of all views, they need to be made visible in reverse order.
        function showViewsInReverseOrder(parent) {
            for (let index = parent.children.length - 1; index >= 0; index--) {
                const child = parent.children[index];
                if (child instanceof LeafNode) {
                    parent.setChildVisible(index, true);
                }
                else {
                    showViewsInReverseOrder(child);
                }
            }
        }
        showViewsInReverseOrder(this.root);
        this._onDidChangeViewMaximized.fire(false);
    }
    hasMaximizedView() {
        return this.maximizedNode !== undefined;
    }
    /**
     * Returns whether the {@link IView view} is maximized.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    isViewMaximized(location) {
        const [, node] = this.getNode(location);
        if (!(node instanceof LeafNode)) {
            throw new Error('Location is not a LeafNode');
        }
        return node === this.maximizedNode;
    }
    /**
     * Distribute the size among all {@link IView views} within the entire
     * grid or within a single {@link SplitView}.
     *
     * @param location The {@link GridLocation location} of a view containing
     * children views, which will have their sizes distributed within the parent
     * view's size. Provide `undefined` to recursively distribute all views' sizes
     * in the entire grid.
     */
    distributeViewSizes(location) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
        }
        if (!location) {
            this.root.distributeViewSizes(true);
            return;
        }
        const [, node] = this.getNode(location);
        if (!(node instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        node.distributeViewSizes();
        this.trySet2x2();
    }
    /**
     * Returns whether a {@link IView view} is visible.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    isViewVisible(location) {
        const [rest, index] = tail(location);
        const [, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid from location');
        }
        return parent.isChildVisible(index);
    }
    /**
     * Set the visibility state of a {@link IView view}.
     *
     * @param location The {@link GridLocation location} of the view.
     */
    setViewVisible(location, visible) {
        if (this.hasMaximizedView()) {
            this.exitMaximizedView();
            return;
        }
        const [rest, index] = tail(location);
        const [, parent] = this.getNode(rest);
        if (!(parent instanceof BranchNode)) {
            throw new Error('Invalid from location');
        }
        parent.setChildVisible(index, visible);
    }
    getView(location) {
        const node = location ? this.getNode(location)[1] : this._root;
        return this._getViews(node, this.orientation);
    }
    /**
     * Construct a new {@link GridView} from a JSON object.
     *
     * @param json The JSON object.
     * @param deserializer A deserializer which can revive each view.
     * @returns A new {@link GridView} instance.
     */
    static deserialize(json, deserializer, options = {}) {
        if (typeof json.orientation !== 'number') {
            throw new Error("Invalid JSON: 'orientation' property must be a number.");
        }
        else if (typeof json.width !== 'number') {
            throw new Error("Invalid JSON: 'width' property must be a number.");
        }
        else if (typeof json.height !== 'number') {
            throw new Error("Invalid JSON: 'height' property must be a number.");
        }
        else if (json.root?.type !== 'branch') {
            throw new Error("Invalid JSON: 'root' property must have 'type' value of branch.");
        }
        const orientation = json.orientation;
        const height = json.height;
        const result = new GridView(options);
        result._deserialize(json.root, orientation, deserializer, height);
        return result;
    }
    _deserialize(root, orientation, deserializer, orthogonalSize) {
        this.root = this._deserializeNode(root, orientation, deserializer, orthogonalSize);
    }
    _deserializeNode(node, orientation, deserializer, orthogonalSize) {
        let result;
        if (node.type === 'branch') {
            const serializedChildren = node.data;
            const children = serializedChildren.map((serializedChild) => {
                return {
                    node: this._deserializeNode(serializedChild, orthogonal(orientation), deserializer, node.size),
                    visible: serializedChild.visible,
                };
            });
            result = new BranchNode(orientation, this.layoutController, this.styles, this.proportionalLayout, node.size, orthogonalSize, undefined, children);
        }
        else {
            result = new LeafNode(deserializer.fromJSON(node.data), orientation, this.layoutController, orthogonalSize, node.size);
            if (node.maximized && !this.maximizedNode) {
                this.maximizedNode = result;
                this._onDidChangeViewMaximized.fire(true);
            }
        }
        return result;
    }
    _getViews(node, orientation, cachedVisibleSize) {
        const box = { top: node.top, left: node.left, width: node.width, height: node.height };
        if (node instanceof LeafNode) {
            return { view: node.view, box, cachedVisibleSize, maximized: this.maximizedNode === node };
        }
        const children = [];
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            const cachedVisibleSize = node.getChildCachedVisibleSize(i);
            children.push(this._getViews(child, orthogonal(orientation), cachedVisibleSize));
        }
        return { children, box };
    }
    getNode(location, node = this.root, path = []) {
        if (location.length === 0) {
            return [path, node];
        }
        if (!(node instanceof BranchNode)) {
            throw new Error('Invalid location');
        }
        const [index, ...rest] = location;
        if (index < 0 || index >= node.children.length) {
            throw new Error('Invalid location');
        }
        const child = node.children[index];
        path.push(node);
        return this.getNode(rest, child, path);
    }
    /**
     * Attempt to lock the {@link Sash sashes} in this {@link GridView} so
     * the grid behaves as a 2x2 matrix, with a corner sash in the middle.
     *
     * In case the grid isn't a 2x2 grid _and_ all sashes are not aligned,
     * this method is a no-op.
     */
    trySet2x2() {
        this.disposable2x2.dispose();
        this.disposable2x2 = Disposable.None;
        if (this.root.children.length !== 2) {
            return;
        }
        const [first, second] = this.root.children;
        if (!(first instanceof BranchNode) || !(second instanceof BranchNode)) {
            return;
        }
        this.disposable2x2 = first.trySet2x2(second);
    }
    /**
     * Populate a map with views to DOM nodes.
     * @remarks To be used internally only.
     */
    getViewMap(map, node) {
        if (!node) {
            node = this.root;
        }
        if (node instanceof BranchNode) {
            node.children.forEach((child) => this.getViewMap(map, child));
        }
        else {
            map.set(node.view, node.element);
        }
    }
    dispose() {
        this.onDidSashResetRelay.dispose();
        this.root.dispose();
        this.element.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ncmlkL2dyaWR2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFaEMsT0FBTyxFQUtOLE1BQU0sRUFFTixTQUFTLEdBQ1QsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RCxPQUFPLGdCQUFnQixDQUFBO0FBRXZCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBSWxFLE1BQU0sYUFBYSxHQUFvQjtJQUN0QyxlQUFlLEVBQUUsS0FBSyxDQUFDLFdBQVc7Q0FDbEMsQ0FBQTtBQWlKRCxNQUFNLFVBQVUsVUFBVSxDQUFDLFdBQXdCO0lBQ2xELE9BQU8sV0FBVyxpQ0FBeUIsQ0FBQyxDQUFDLGdDQUF3QixDQUFDLDZCQUFxQixDQUFBO0FBQzVGLENBQUM7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