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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZHZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvZ3JpZC9ncmlkdmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBRWhDLE9BQU8sRUFLTixNQUFNLEVBRU4sU0FBUyxHQUNULE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDdkUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdEQsT0FBTyxnQkFBZ0IsQ0FBQTtBQUV2QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDN0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUlsRSxNQUFNLGFBQWEsR0FBb0I7SUFDdEMsZUFBZSxFQUFFLEtBQUssQ0FBQyxXQUFXO0NBQ2xDLENBQUE7QUFpSkQsTUFBTSxVQUFVLFVBQVUsQ0FBQyxXQUF3QjtJQUNsRCxPQUFPLFdBQVcsaUNBQXlCLENBQUMsQ0FBQyxnQ0FBd0IsQ0FBQyw2QkFBcUIsQ0FBQTtBQUM1RixDQUFDO0FBdUJELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFjO0lBQzlDLE9BQU8sQ0FBQyxDQUFFLElBQVksQ0FBQyxRQUFRLENBQUE7QUFDaEMsQ0FBQztBQUVELE1BQU0sZ0JBQWdCO0lBQ3JCLFlBQW1CLGVBQXdCO1FBQXhCLG9CQUFlLEdBQWYsZUFBZSxDQUFTO0lBQUcsQ0FBQztDQUMvQztBQXdCRCxTQUFTLHdCQUF3QixDQUNoQyxNQUErQixFQUMvQixXQUF3QjtJQUV4QixJQUFJLFdBQVcsbUNBQTJCLEVBQUUsQ0FBQztRQUM1QyxPQUFPO1lBQ04sSUFBSSxFQUFFLE1BQU0sQ0FBQyxLQUFLO1lBQ2xCLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRztZQUNqQixHQUFHLEVBQUUsTUFBTSxDQUFDLGVBQWU7WUFDM0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxhQUFhO1NBQzVCLENBQUE7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU87WUFDTixHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDakIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxHQUFHO1lBQ2xCLElBQUksRUFBRSxNQUFNLENBQUMsZUFBZTtZQUM1QixLQUFLLEVBQUUsTUFBTSxDQUFDLGFBQWE7U0FDM0IsQ0FBQTtJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsU0FBUywwQkFBMEIsQ0FDbEMsTUFBdUIsRUFDdkIsV0FBd0I7SUFFeEIsSUFBSSxXQUFXLG1DQUEyQixFQUFFLENBQUM7UUFDNUMsT0FBTztZQUNOLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSTtZQUNsQixHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDakIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxHQUFHO1lBQzNCLGFBQWEsRUFBRSxNQUFNLENBQUMsTUFBTTtTQUM1QixDQUFBO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPO1lBQ04sS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHO1lBQ2pCLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTTtZQUNsQixlQUFlLEVBQUUsTUFBTSxDQUFDLElBQUk7WUFDNUIsYUFBYSxFQUFFLE1BQU0sQ0FBQyxLQUFLO1NBQzNCLENBQUE7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLEtBQWEsRUFBRSxXQUFtQjtJQUN4RCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsV0FBVyxFQUFFLENBQUM7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsT0FBTyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUNuQyxDQUFDO0FBRUQsTUFBTSxVQUFVO0lBTWYsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFHRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFHRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFHRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQTtJQUN0QyxDQUFDO0lBS0QsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFBO0lBQ3BCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQjtZQUNqRCxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWU7WUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkI7WUFDakQsQ0FBQyxDQUFDLElBQUksQ0FBQyx5QkFBeUI7WUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDeEIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUNoQyxDQUFDLENBQUMsQ0FBQztZQUNILENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUNSLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNqRSxDQUNELENBQUE7SUFDSixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUNkLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUN4RixDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxxQ0FBNEI7UUFDN0IsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDMUMsT0FBTyxDQUFDLENBQUMsUUFBUSxLQUFLLFdBQVcsQ0FBQyxDQUFDLCtCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FDdEUsQ0FBQTtRQUVELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxnQ0FBd0IsQ0FBQyxFQUFFLENBQUM7WUFDdkQsbUNBQTBCO1FBQzNCLENBQUM7YUFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsK0JBQXVCLENBQUMsRUFBRSxDQUFDO1lBQzdELGtDQUF5QjtRQUMxQixDQUFDO1FBRUQscUNBQTRCO0lBQzdCLENBQUM7SUFFRCxJQUFJLGtCQUFrQjtRQUNyQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQjtZQUNqRCxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQjtZQUM1QixDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUNwQixDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCO1lBQ2pELENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVztZQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFBO0lBQzlCLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQjtZQUNqRCxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQjtZQUM1QixDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQTtJQUNwQixDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFdBQVcsbUNBQTJCO1lBQ2pELENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVztZQUNsQixDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFBO0lBQzlCLENBQUM7SUFxQkQsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsSUFBSSxjQUFjLENBQUMsY0FBdUM7UUFDekQsSUFDQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssS0FBSyxjQUFjLENBQUMsS0FBSztZQUNuRCxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsS0FBSyxjQUFjLENBQUMsR0FBRztZQUMvQyxJQUFJLENBQUMsZUFBZSxDQUFDLGVBQWUsS0FBSyxjQUFjLENBQUMsZUFBZTtZQUN2RSxJQUFJLENBQUMsZUFBZSxDQUFDLGFBQWEsS0FBSyxjQUFjLENBQUMsYUFBYSxFQUNsRSxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQTtRQUVyQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUE7UUFDbkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFBO1FBRS9ELEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbEMsTUFBTSxLQUFLLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQTtZQUN6QixNQUFNLElBQUksR0FBRyxLQUFLLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBRS9DLEtBQUssQ0FBQyxjQUFjLEdBQUc7Z0JBQ3RCLEtBQUssRUFBRSxjQUFjLENBQUMsZUFBZTtnQkFDckMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxhQUFhO2dCQUNqQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGVBQWU7Z0JBQ3BGLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsYUFBYTthQUM3RSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFHRCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUNELElBQUksWUFBWSxDQUFDLFlBQXFCO1FBQ3JDLElBQUksSUFBSSxDQUFDLGFBQWEsS0FBSyxZQUFZLEVBQUUsQ0FBQztZQUN6QyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBRWpDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25DLElBQUksS0FBSyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxLQUFLLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtZQUNsQyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFRCxZQUNVLFdBQXdCLEVBQ3hCLGdCQUFrQyxFQUMzQyxNQUF1QixFQUNkLDJCQUFvQyxFQUM3QyxPQUFlLENBQUMsRUFDaEIsaUJBQXlCLENBQUMsRUFDMUIsZUFBd0IsS0FBSyxFQUM3QixnQkFBb0M7UUFQM0IsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUVsQyxnQ0FBMkIsR0FBM0IsMkJBQTJCLENBQVM7UUF6TXJDLGFBQVEsR0FBVyxFQUFFLENBQUE7UUFhdEIsb0JBQWUsR0FBVyxDQUFDLENBQUE7UUFLM0IsOEJBQXlCLEdBQVcsQ0FBQyxDQUFBO1FBS3JDLDJCQUFzQixHQUFXLENBQUMsQ0FBQTtRQXVHekIsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBc0IsQ0FBQTtRQUN4RCxnQkFBVyxHQUE4QixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUV4RCwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBVyxDQUFBO1FBQ3ZELDBCQUFxQixHQUFtQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBQ2pFLHVDQUFrQyxHQUFvQixJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXBGLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUNsQywwQkFBcUIsR0FBZ0IsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUNuRCxnQkFBVyxHQUFnQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUVuRCw2QkFBd0IsR0FBZ0IsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUU5QyxvQkFBZSxHQUFHLElBQUksT0FBTyxFQUFnQixDQUFBO1FBQ3JELG1CQUFjLEdBQXdCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO1FBQ2pFLGlDQUE0QixHQUFnQixVQUFVLENBQUMsSUFBSSxDQUFBO1FBQzNELGdDQUEyQixHQUFnQixVQUFVLENBQUMsSUFBSSxDQUFBO1FBRTFELG9CQUFlLEdBQTRCLEVBQUUsQ0FBQTtRQWlDN0Msa0JBQWEsR0FBRyxLQUFLLENBQUE7UUE4QjVCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBRXJDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFFNUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkIsc0VBQXNFO1lBQ3RFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDNUMsV0FBVztnQkFDWCxNQUFNO2dCQUNOLGtCQUFrQixFQUFFLDJCQUEyQjthQUMvQyxDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUU7Z0JBQzNCLGNBQWM7Z0JBQ2QsY0FBYyxFQUFFLENBQUM7Z0JBQ2pCLHdCQUF3QixFQUFFLENBQUM7Z0JBQzNCLFlBQVksRUFBRSxJQUFJO2dCQUNsQixzQkFBc0IsRUFBRSxjQUFjO2FBQ3RDLENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsOERBQThEO1lBQzlELE1BQU0sVUFBVSxHQUFHO2dCQUNsQixLQUFLLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUU7b0JBQy9DLE9BQU87d0JBQ04sSUFBSSxFQUFFLGVBQWUsQ0FBQyxJQUFJO3dCQUMxQixJQUFJLEVBQUUsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJO3dCQUMvQixPQUFPLEVBQUUsZUFBZSxDQUFDLE9BQU8sS0FBSyxLQUFLO3FCQUMxQyxDQUFBO2dCQUNGLENBQUMsQ0FBQztnQkFDRixJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWM7YUFDekIsQ0FBQTtZQUVELE1BQU0sT0FBTyxHQUFHLEVBQUUsa0JBQWtCLEVBQUUsMkJBQTJCLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxDQUFBO1lBRXhGLElBQUksQ0FBQyxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtZQUV4RSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDckMsTUFBTSxLQUFLLEdBQUcsS0FBSyxLQUFLLENBQUMsQ0FBQTtnQkFDekIsTUFBTSxJQUFJLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFBO2dCQUUzQyxJQUFJLENBQUMsY0FBYyxHQUFHO29CQUNyQixLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlO29CQUMxQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhO29CQUN0QyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztvQkFDckYsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztpQkFDNUUsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMzRSxJQUFJLENBQUMsNEJBQTRCLEdBQUcsY0FBYyxDQUNqRCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFDekIsSUFBSSxDQUFDLGVBQWUsQ0FDcEIsQ0FBQTtRQUVELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBQzVCLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBdUI7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7UUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsSUFBSSxLQUFLLFlBQVksVUFBVSxFQUFFLENBQUM7Z0JBQ2pDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVksRUFBRSxNQUFjLEVBQUUsR0FBK0I7UUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksT0FBTyxHQUFHLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsNERBQTREO1FBQzVELElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLGNBQWMsQ0FBQTtRQUMvQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQTtRQUMzQixJQUFJLENBQUMsZUFBZSxHQUFHLEdBQUcsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFBO1FBQ2xELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxHQUFHLENBQUMsd0JBQXdCLENBQUE7UUFDN0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQTtRQUV4RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFO1lBQ3pDLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGNBQWMsRUFBRSxJQUFJLENBQUMseUJBQXlCO1lBQzlDLHdCQUF3QixFQUFFLElBQUksQ0FBQyxlQUFlO1lBQzlDLFlBQVksRUFBRSxHQUFHLENBQUMsc0JBQXNCO1lBQ3hDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxZQUFZO1NBQ3hDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFRCxVQUFVLENBQUMsT0FBZ0I7UUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFVLEVBQUUsSUFBcUIsRUFBRSxLQUFhLEVBQUUsVUFBb0I7UUFDOUUsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBYSxFQUFFLE1BQWU7UUFDekMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRTFCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBRTlDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTdDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRTFCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELFNBQVMsQ0FBQyxJQUFZLEVBQUUsRUFBVTtRQUNqQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUMsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDakIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNmLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2pDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFN0QsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7SUFDM0IsQ0FBQztJQUVELFlBQVksQ0FBQyxJQUFZLEVBQUUsRUFBVTtRQUNwQyxJQUFJLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2hELEVBQUUsR0FBRyxhQUFhLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFNUMsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDakIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBR2pDO1FBQUEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxHQUFHO1lBQ3pFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYztZQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGNBQWM7U0FDaEMsQ0FHQTtRQUFBLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVwRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0lBRUQsV0FBVyxDQUFDLEtBQWEsRUFBRSxJQUFZO1FBQ3RDLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxlQUFlLENBQUMsS0FBYTtRQUM1QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxTQUFTLEdBQUcsS0FBSztRQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFFcEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLEtBQUssWUFBWSxVQUFVLEVBQUUsQ0FBQztvQkFDakMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLEtBQWE7UUFDekIsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFRCxjQUFjLENBQUMsS0FBYTtRQUMzQixLQUFLLEdBQUcsYUFBYSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWxELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELGVBQWUsQ0FBQyxLQUFhLEVBQUUsT0FBZ0I7UUFDOUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVsRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ3JELE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsS0FBSyxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFBO1FBRTdELDhFQUE4RTtRQUM5RSxvR0FBb0c7UUFDcEcsSUFBSSxDQUFDLE9BQU8sSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQzlFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxLQUFhO1FBQ3RDLEtBQUssR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFbEQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUc7Z0JBQ2pDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGVBQWU7Z0JBQzFDLEdBQUcsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWE7Z0JBQ3RDLGVBQWUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbkYsYUFBYSxFQUNaLENBQUMsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDcEYsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sbUJBQW1CO1FBQzFCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzNCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFTyxvQkFBb0I7UUFDM0IsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNwQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUNyRCxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQ2YsQ0FBQTtRQUNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRTlGLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDdkMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQzNGLENBQUE7UUFDRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDMUMsSUFBSSxDQUFDLDJCQUEyQixHQUFHLHNCQUFzQixDQUN4RCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFDekIsSUFBSSxDQUFDLGVBQWUsQ0FDcEIsQ0FBQTtRQUVELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzVCLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsRUFDeEMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUMxQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRW5GLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUN0QyxJQUFJLEtBQUssWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsQ0FDMUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ3ZDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUNyQyxDQUFDLENBQUMsQ0FDRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFNBQVMsQ0FBQyxLQUFpQjtRQUMxQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMvRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDcEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO1FBQ3ZCLENBQUM7UUFFRCxNQUFNLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUE7UUFFMUQsSUFBSSxDQUFDLENBQUMsVUFBVSxZQUFZLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUM3RSxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksQ0FBQyxDQUFDLGVBQWUsWUFBWSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN2RixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFdBQVcsaUNBQXlCLEVBQUUsQ0FBQztZQUMvQyxXQUFXLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUE7WUFDM0UsVUFBVSxDQUFDLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUE7WUFDNUUsZ0JBQWdCLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7WUFDaEYsZUFBZSxDQUFDLGVBQWUsR0FBRyxXQUFXLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUE7UUFDbEYsQ0FBQzthQUFNLENBQUM7WUFDUCxlQUFlLENBQUMsZUFBZSxHQUFHLFdBQVcsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUE7WUFDM0UsZ0JBQWdCLENBQUMsZUFBZSxHQUFHLFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxXQUFXLENBQUE7WUFDNUUsVUFBVSxDQUFDLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7WUFDaEYsV0FBVyxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUE7UUFDbEYsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1FBQzdCLFNBQVMsQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFBO1FBRTdCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWxDLE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixNQUFNLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO1lBQ3BELFVBQVUsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtZQUNwRSxXQUFXLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7WUFDdEUsZUFBZSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1lBQzlFLGdCQUFnQixDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7UUFDakYsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8scUNBQXFDO1FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMseUJBQXlCLEdBQUcsQ0FBQyxDQUFBO1FBQzlGLElBQUksQ0FBQyxTQUFTLENBQUMsa0JBQWtCO1lBQ2hDLElBQUksQ0FBQyxhQUFhO2dCQUNsQixJQUFJLENBQUMseUJBQXlCLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUE7SUFDM0UsQ0FBQztJQUVELE9BQU87UUFDTixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEIsQ0FBQztRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDM0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM5QixJQUFJLENBQUMsc0JBQXNCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFckMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2pELElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDMUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3pCLENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILFNBQVMsaUNBQWlDLENBQUMsSUFBVztJQUNyRCxNQUFNLENBQUMsMEJBQTBCLEVBQUUsZ0JBQWdCLENBQUMsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUNqRSxJQUFJLENBQUMsV0FBVyxFQUNoQixXQUFXLENBQ1gsQ0FBQTtJQUVELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FDZixnQkFBZ0IsRUFDaEIsS0FBSyxDQUFDLEdBQUcsQ0FDUixLQUFLLENBQUMsS0FBSyxDQUNWLEtBQUssQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxZQUFZO1FBQ2pCLElBQUksQ0FBQyxZQUFZO1FBQ2pCLElBQUksQ0FBQyxhQUFhO1FBQ2xCLElBQUksQ0FBQyxhQUFhO0tBQ2xCLENBQUMsRUFDRixXQUFXLENBQ1gsRUFDRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUNoQixDQUNELENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxRQUFRO0lBRWIsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFHRCxJQUFJLGNBQWM7UUFDakIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFVRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUNELElBQUksZUFBZSxDQUFDLElBQTBCO1FBQzdDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDbEYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQTtRQUM1QixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFJRCxJQUFJLGdCQUFnQjtRQUNuQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQTtJQUM5QixDQUFDO0lBQ0QsSUFBSSxnQkFBZ0IsQ0FBQyxJQUEwQjtRQUM5QyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ25GLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUE7UUFDN0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN6QyxDQUFDO0lBUUQsWUFDVSxJQUFXLEVBQ1gsV0FBd0IsRUFDeEIsZ0JBQWtDLEVBQzNDLGNBQXNCLEVBQ3RCLE9BQWUsQ0FBQztRQUpQLFNBQUksR0FBSixJQUFJLENBQU87UUFDWCxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBL0NwQyxVQUFLLEdBQVcsQ0FBQyxDQUFBO1FBVWpCLG1CQUFjLEdBQVcsQ0FBQyxDQUFBO1FBQzFCLDZCQUF3QixHQUFXLENBQUMsQ0FBQTtRQUVuQyxnQkFBVyxHQUFnQixLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3JDLG1CQUFjLEdBQXdCLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFFakQsZ0NBQTJCLEdBQUcsSUFBSSxLQUFLLEVBQXNCLENBQUE7UUFDN0QscUJBQWdCLEdBQXlCLFNBQVMsQ0FBQTtRQVVsRCxpQ0FBNEIsR0FBRyxJQUFJLEtBQUssRUFBc0IsQ0FBQTtRQUM5RCxzQkFBaUIsR0FBeUIsU0FBUyxDQUFBO1FBVTFDLHdCQUFtQixHQUFHLElBQUksT0FBTyxFQUFzQixDQUFBO1FBSXZELGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQXNHNUMsb0JBQWUsR0FBNEIsRUFBRSxDQUFBO1FBMkI3QyxnQkFBVyxHQUFXLENBQUMsQ0FBQTtRQUN2QixpQkFBWSxHQUFXLENBQUMsQ0FBQTtRQUN4QixjQUFTLEdBQVcsQ0FBQyxDQUFBO1FBQ3JCLGVBQVUsR0FBVyxDQUFDLENBQUE7UUEzSDdCLElBQUksQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFBO1FBRWpCLE1BQU0sV0FBVyxHQUFHLGlDQUFpQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUNoQyxXQUFXLEVBQ1gsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQzVFLElBQUksQ0FBQyxXQUFXLENBQ2hCLENBQUE7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzNCLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFDOUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFDdEMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FDdkMsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLEdBQUc7UUFDTixPQUFPLElBQUksQ0FBQyxXQUFXLG1DQUEyQjtZQUNqRCxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWM7WUFDckIsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQTtJQUNqQyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkI7WUFDakQsQ0FBQyxDQUFDLElBQUksQ0FBQyx3QkFBd0I7WUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDdkIsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDekIsQ0FBQztJQUVELElBQVksWUFBWTtRQUN2QixPQUFPLElBQUksQ0FBQyxlQUFlO1lBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMxRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQVksWUFBWTtRQUN2QixPQUFPLElBQUksQ0FBQyxlQUFlO1lBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUMxRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDMUIsQ0FBQztJQUVELElBQVksYUFBYTtRQUN4QixPQUFPLElBQUksQ0FBQyxnQkFBZ0I7WUFDM0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDN0UsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFZLGFBQWE7UUFDeEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCO1lBQzNCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO1lBQzdFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUM1RixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUM1RixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsSUFBSSxrQkFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQTtJQUM1QyxDQUFDO0lBRUQsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQTtJQUN0QixDQUFDO0lBRUQsSUFBSSxxQkFBcUI7UUFDeEIsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUM1RixDQUFDO0lBRUQsSUFBSSxxQkFBcUI7UUFDeEIsT0FBTyxJQUFJLENBQUMsV0FBVyxtQ0FBMkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUM1RixDQUFDO0lBR0QsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsSUFBSSxjQUFjLENBQUMsY0FBdUM7UUFDekQsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUE7UUFFckMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQVksRUFBRSxNQUFjLEVBQUUsR0FBK0I7UUFDbkUsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM1QyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksT0FBTyxHQUFHLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNqQyxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLGVBQWUsR0FBRyxHQUFHLENBQUMsY0FBYyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUE7UUFDakQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQTtRQUU1RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBT08sT0FBTyxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsR0FBVyxFQUFFLElBQVk7UUFDdkUsSUFDQyxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUs7WUFDMUIsSUFBSSxDQUFDLFlBQVksS0FBSyxNQUFNO1lBQzVCLElBQUksQ0FBQyxTQUFTLEtBQUssR0FBRztZQUN0QixJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFDdkIsQ0FBQztZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUE7UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUE7UUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFnQjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0NBQ0Q7QUFZRCxTQUFTLFFBQVEsQ0FBQyxJQUFVLEVBQUUsSUFBWSxFQUFFLGNBQXNCO0lBQ2pFLElBQUksSUFBSSxZQUFZLFVBQVUsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxDQUM1QixVQUFVLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUM1QixJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLDJCQUEyQixFQUNoQyxJQUFJLEVBQ0osY0FBYyxFQUNkLElBQUksQ0FBQyxZQUFZLENBQ2pCLENBQUE7UUFFRCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFFakIsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxZQUFZLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUVqRixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM5RSxTQUFTLElBQUksT0FBTyxDQUFBO1lBRXBCLHdEQUF3RDtZQUN4RCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDYixPQUFPLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQTtZQUM1QixDQUFDO1lBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDZCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQzFCLElBQUksQ0FBQyxJQUFJLEVBQ1QsVUFBVSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFDNUIsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixjQUFjLENBQ2QsQ0FBQTtRQUNELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNkLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztBQUNGLENBQUM7QUE0Q0Q7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLE9BQU8sUUFBUTtJQXFCcEIsSUFBWSxJQUFJO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxJQUFZLElBQUksQ0FBQyxJQUFnQjtRQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBRTFCLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ3hCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUEsQ0FBQyxPQUFPO1FBQzlFLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDM0MsQ0FBQztJQWtCRDs7T0FFRztJQUNILElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLFlBQVk7UUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksWUFBWTtRQUNmLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUE7SUFDOUIsQ0FBQztJQUNELElBQUksY0FBYztRQUNqQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQUksV0FBVyxDQUFDLFdBQXdCO1FBQ3ZDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDNUMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFBO1FBQ3JGLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUU7WUFDekIsY0FBYztZQUNkLGNBQWMsRUFBRSx3QkFBd0I7WUFDeEMsd0JBQXdCLEVBQUUsY0FBYztZQUN4QyxZQUFZLEVBQUUsSUFBSTtZQUNsQixzQkFBc0IsRUFBRSxjQUFjO1NBQ3RDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBSSxjQUFjLENBQUMsY0FBK0I7UUFDakQsSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUE7UUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEdBQUcsMEJBQTBCLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN4RixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLFlBQVksQ0FBQyxZQUFxQjtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUE7SUFDdEMsQ0FBQztJQU9EOzs7OztPQUtHO0lBQ0gsWUFBWSxVQUE0QixFQUFFO1FBaEpsQyx3QkFBbUIsR0FBRyxJQUFJLEtBQUssRUFBZ0IsQ0FBQTtRQUMvQyxpQkFBWSxHQUFHLElBQUksS0FBSyxFQUFRLENBQUE7UUFDaEMsaUJBQVksR0FBRyxJQUFJLEtBQUssRUFBeUIsQ0FBQTtRQUNqRCxvQkFBZSxHQUFvQixFQUFFLENBQUE7UUFPckMsa0JBQWEsR0FBZ0IsVUFBVSxDQUFDLElBQUksQ0FBQTtRQXFCcEQ7O1dBRUc7UUFDTSxtQkFBYyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFFeEQ7OztXQUdHO1FBQ00sZ0JBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQTtRQUU5Qzs7V0FFRztRQUNNLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7UUF3RnRDLGtCQUFhLEdBQXlCLFNBQVMsQ0FBQTtRQUV0Qyw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFBVyxDQUFBO1FBQzFELDZCQUF3QixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7UUFTdkUsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksYUFBYSxDQUFBO1FBQzdDLElBQUksQ0FBQyxrQkFBa0I7WUFDdEIsT0FBTyxPQUFPLENBQUMsa0JBQWtCLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7UUFDeEYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFVBQVUsK0JBRXpCLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsa0JBQWtCLENBQ3ZCLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQXVCO1FBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFBO1FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ0gsTUFBTSxDQUFDLEtBQWEsRUFBRSxNQUFjLEVBQUUsTUFBYyxDQUFDLEVBQUUsT0FBZSxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1FBRTVDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxHQUNyRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsbUNBQTJCO1lBQy9DLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ3pCLGNBQWM7WUFDZCxjQUFjLEVBQUUsTUFBTTtZQUN0Qix3QkFBd0IsRUFBRSxnQkFBZ0I7WUFDMUMsWUFBWSxFQUFFLElBQUk7WUFDbEIsc0JBQXNCLEVBQUUsY0FBYztTQUN0QyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsT0FBTyxDQUFDLElBQVcsRUFBRSxJQUFxQixFQUFFLFFBQXNCO1FBQ2pFLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN6QixDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM1QixJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFFcEMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRWpELElBQUksTUFBTSxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxDQUN4QixJQUFJLEVBQ0osVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFDOUIsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixNQUFNLENBQUMsY0FBYyxDQUNyQixDQUFBO1lBRUQsSUFBSSxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBQ2QsTUFBTSxHQUFHLENBQUE7WUFDVixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDMUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRWxDLElBQUksY0FBYyxHQUFvQixDQUFDLENBQUE7WUFFdkMsTUFBTSwyQkFBMkIsR0FBRyxXQUFXLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDdEYsSUFBSSxPQUFPLDJCQUEyQixLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNyRCxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1lBQy9ELENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFBO1lBQ3JELFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUVsQixNQUFNLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FDL0IsTUFBTSxDQUFDLFdBQVcsRUFDbEIsTUFBTSxDQUFDLGdCQUFnQixFQUN2QixJQUFJLENBQUMsTUFBTSxFQUNYLElBQUksQ0FBQyxrQkFBa0IsRUFDdkIsTUFBTSxDQUFDLElBQUksRUFDWCxNQUFNLENBQUMsY0FBYyxFQUNyQixXQUFXLENBQUMsWUFBWSxDQUN4QixDQUFBO1lBQ0QsV0FBVyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUV6RCxNQUFNLFVBQVUsR0FBRyxJQUFJLFFBQVEsQ0FDOUIsTUFBTSxDQUFDLElBQUksRUFDWCxXQUFXLENBQUMsV0FBVyxFQUN2QixJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQ1gsQ0FBQTtZQUNELFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVqRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUN2RCxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM1RixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdEMsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxVQUFVLENBQUMsUUFBc0IsRUFBRSxNQUFzQztRQUN4RSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDekIsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFBO1FBRXBDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVqRCxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbkMsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFZCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO1FBQ2pCLENBQUM7UUFFRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsaUJBQWlCO1lBQ2pCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEMsSUFBSSxPQUFPLFlBQVksUUFBUSxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQTtZQUNqQixDQUFDO1lBRUQsNkNBQTZDO1lBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFBO1lBQ25CLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQTtZQUN6QyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRWxDLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdFLFdBQVcsQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVoQixJQUFJLE9BQU8sWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNuQyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFFcEUsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFFbkQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakQsV0FBVyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbkYsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQzlCLE9BQU8sQ0FBQyxJQUFJLEVBQ1osVUFBVSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFDL0IsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixPQUFPLENBQUMsSUFBSSxDQUNaLENBQUE7WUFDRCxNQUFNLE1BQU0sR0FBRyxnQkFBZ0I7Z0JBQzlCLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYztnQkFDeEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzNDLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRWpCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckMsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUE7SUFDakIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFFBQVEsQ0FBQyxjQUE0QixFQUFFLElBQVksRUFBRSxFQUFVO1FBQzlELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN6QixDQUFDO1FBRUQsTUFBTSxDQUFDLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUUvQyxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTFCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxTQUFTLENBQUMsSUFBa0IsRUFBRSxFQUFnQjtRQUM3QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDekIsQ0FBQztRQUVELE1BQU0sQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFN0MsSUFBSSxDQUFDLENBQUMsVUFBVSxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7UUFFL0MsSUFBSSxDQUFDLENBQUMsUUFBUSxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxDQUFDLFFBQVEsWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsSUFBSSxVQUFVLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0IsVUFBVSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDNUMsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2pDLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFN0IsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2hELFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFVBQVUsQ0FBQyxRQUFzQixFQUFFLElBQXdCO1FBQzFELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN6QixDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRWpELElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxHQUNsQyxNQUFNLENBQUMsV0FBVyxtQ0FBMkI7WUFDNUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRTdCLElBQUksT0FBTyxlQUFlLEtBQUssUUFBUSxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEUsTUFBTSxDQUFDLEVBQUUsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUVsQyxXQUFXLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILFdBQVcsQ0FBQyxRQUF1QjtRQUNsQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzVELENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZDLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ2xELENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILHdCQUF3QixDQUFDLFFBQXNCO1FBQzlDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFckMsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxVQUFVLENBQUMsUUFBc0I7UUFDaEMsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3pCLENBQUM7UUFFRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFaEQsSUFBSSxDQUFDLENBQUMsSUFBSSxZQUFZLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGNBQWMsQ0FBQyxRQUFzQjtRQUNwQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsbURBQW1EO1lBQ25ELE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVoRCxJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFzQjtRQUNsQyxNQUFNLENBQUMsRUFBRSxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxDQUFDLGNBQWMsWUFBWSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzNDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxLQUFLLGNBQWMsRUFBRSxDQUFDO1lBQzNDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3pCLENBQUM7UUFFRCxTQUFTLGVBQWUsQ0FBQyxNQUFrQixFQUFFLE9BQWlCO1lBQzdELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUNoQyxJQUFJLEtBQUssWUFBWSxRQUFRLEVBQUUsQ0FBQztvQkFDL0IsSUFBSSxLQUFLLEtBQUssT0FBTyxFQUFFLENBQUM7d0JBQ3ZCLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO29CQUNqQyxDQUFDO2dCQUNGLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUUxQyxJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQTtRQUNuQyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFBO1FBRTlCLG9EQUFvRDtRQUNwRCxvRkFBb0Y7UUFDcEYsU0FBUyx1QkFBdUIsQ0FBQyxNQUFrQjtZQUNsRCxLQUFLLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ2xFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3BDLElBQUksS0FBSyxZQUFZLFFBQVEsRUFBRSxDQUFDO29CQUMvQixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUMvQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFbEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxLQUFLLFNBQVMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGVBQWUsQ0FBQyxRQUFzQjtRQUNyQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUNuQyxDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxtQkFBbUIsQ0FBQyxRQUF1QjtRQUMxQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDekIsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXZDLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUE7UUFDMUIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ2pCLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsYUFBYSxDQUFDLFFBQXNCO1FBQ25DLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFckMsSUFBSSxDQUFDLENBQUMsTUFBTSxZQUFZLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3pDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxjQUFjLENBQUMsUUFBc0IsRUFBRSxPQUFnQjtRQUN0RCxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXJDLElBQUksQ0FBQyxDQUFDLE1BQU0sWUFBWSxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQWVELE9BQU8sQ0FBQyxRQUF1QjtRQUM5QixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDOUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQXlCLEVBQ3pCLFlBQWtDLEVBQ2xDLFVBQTRCLEVBQUU7UUFFOUIsSUFBSSxPQUFPLElBQUksQ0FBQyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFBO1FBQzFFLENBQUM7YUFBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUE7UUFDcEUsQ0FBQzthQUFNLElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQTtRQUNyRSxDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGlFQUFpRSxDQUFDLENBQUE7UUFDbkYsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUE7UUFDcEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUUxQixNQUFNLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUE2QixFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFMUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sWUFBWSxDQUNuQixJQUEyQixFQUMzQixXQUF3QixFQUN4QixZQUFrRCxFQUNsRCxjQUFzQjtRQUV0QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxjQUFjLENBQWUsQ0FBQTtJQUNqRyxDQUFDO0lBRU8sZ0JBQWdCLENBQ3ZCLElBQXFCLEVBQ3JCLFdBQXdCLEVBQ3hCLFlBQWtELEVBQ2xELGNBQXNCO1FBRXRCLElBQUksTUFBWSxDQUFBO1FBQ2hCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM1QixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxJQUF5QixDQUFBO1lBQ3pELE1BQU0sUUFBUSxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFO2dCQUMzRCxPQUFPO29CQUNOLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQzFCLGVBQWUsRUFDZixVQUFVLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLFlBQVksRUFDWixJQUFJLENBQUMsSUFBSSxDQUNUO29CQUNELE9BQU8sRUFBRyxlQUF5QyxDQUFDLE9BQU87aUJBQ2pDLENBQUE7WUFDNUIsQ0FBQyxDQUFDLENBQUE7WUFFRixNQUFNLEdBQUcsSUFBSSxVQUFVLENBQ3RCLFdBQVcsRUFDWCxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLElBQUksQ0FBQyxNQUFNLEVBQ1gsSUFBSSxDQUFDLGtCQUFrQixFQUN2QixJQUFJLENBQUMsSUFBSSxFQUNULGNBQWMsRUFDZCxTQUFTLEVBQ1QsUUFBUSxDQUNSLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxJQUFJLFFBQVEsQ0FDcEIsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ2hDLFdBQVcsRUFDWCxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLGNBQWMsRUFDZCxJQUFJLENBQUMsSUFBSSxDQUNULENBQUE7WUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFBO2dCQUMzQixJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sU0FBUyxDQUFDLElBQVUsRUFBRSxXQUF3QixFQUFFLGlCQUEwQjtRQUNqRixNQUFNLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFdEYsSUFBSSxJQUFJLFlBQVksUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQTtRQUMzRixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFBO1FBRS9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9DLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFM0QsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFBO1FBQ2pGLENBQUM7UUFFRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxPQUFPLENBQ2QsUUFBc0IsRUFDdEIsT0FBYSxJQUFJLENBQUMsSUFBSSxFQUN0QixPQUFxQixFQUFFO1FBRXZCLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BCLENBQUM7UUFFRCxJQUFJLENBQUMsQ0FBQyxJQUFJLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUE7UUFFakMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRWYsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILFNBQVM7UUFDUixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzVCLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUVwQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUE7UUFFMUMsSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLFlBQVksVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsVUFBVSxDQUFDLEdBQTRCLEVBQUUsSUFBVztRQUNuRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQTtRQUNqQixDQUFDO1FBRUQsSUFBSSxJQUFJLFlBQVksVUFBVSxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUQsQ0FBQzthQUFNLENBQUM7WUFDUCxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDdEIsQ0FBQztDQUNEIn0=