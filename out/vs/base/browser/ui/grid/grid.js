/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { equals, tail } from '../../../common/arrays.js';
import { Disposable } from '../../../common/lifecycle.js';
import './gridview.css';
import { GridView, orthogonal, Sizing as GridViewSizing, } from './gridview.js';
export { LayoutPriority, Orientation, orthogonal } from './gridview.js';
export var Direction;
(function (Direction) {
    Direction[Direction["Up"] = 0] = "Up";
    Direction[Direction["Down"] = 1] = "Down";
    Direction[Direction["Left"] = 2] = "Left";
    Direction[Direction["Right"] = 3] = "Right";
})(Direction || (Direction = {}));
function oppositeDirection(direction) {
    switch (direction) {
        case 0 /* Direction.Up */:
            return 1 /* Direction.Down */;
        case 1 /* Direction.Down */:
            return 0 /* Direction.Up */;
        case 2 /* Direction.Left */:
            return 3 /* Direction.Right */;
        case 3 /* Direction.Right */:
            return 2 /* Direction.Left */;
    }
}
export function isGridBranchNode(node) {
    return !!node.children;
}
function getGridNode(node, location) {
    if (location.length === 0) {
        return node;
    }
    if (!isGridBranchNode(node)) {
        throw new Error('Invalid location');
    }
    const [index, ...rest] = location;
    return getGridNode(node.children[index], rest);
}
function intersects(one, other) {
    return !(one.start >= other.end || other.start >= one.end);
}
function getBoxBoundary(box, direction) {
    const orientation = getDirectionOrientation(direction);
    const offset = direction === 0 /* Direction.Up */
        ? box.top
        : direction === 3 /* Direction.Right */
            ? box.left + box.width
            : direction === 1 /* Direction.Down */
                ? box.top + box.height
                : box.left;
    const range = {
        start: orientation === 1 /* Orientation.HORIZONTAL */ ? box.top : box.left,
        end: orientation === 1 /* Orientation.HORIZONTAL */ ? box.top + box.height : box.left + box.width,
    };
    return { offset, range };
}
function findAdjacentBoxLeafNodes(boxNode, direction, boundary) {
    const result = [];
    function _(boxNode, direction, boundary) {
        if (isGridBranchNode(boxNode)) {
            for (const child of boxNode.children) {
                _(child, direction, boundary);
            }
        }
        else {
            const { offset, range } = getBoxBoundary(boxNode.box, direction);
            if (offset === boundary.offset && intersects(range, boundary.range)) {
                result.push(boxNode);
            }
        }
    }
    _(boxNode, direction, boundary);
    return result;
}
function getLocationOrientation(rootOrientation, location) {
    return location.length % 2 === 0 ? orthogonal(rootOrientation) : rootOrientation;
}
function getDirectionOrientation(direction) {
    return direction === 0 /* Direction.Up */ || direction === 1 /* Direction.Down */
        ? 0 /* Orientation.VERTICAL */
        : 1 /* Orientation.HORIZONTAL */;
}
export function getRelativeLocation(rootOrientation, location, direction) {
    const orientation = getLocationOrientation(rootOrientation, location);
    const directionOrientation = getDirectionOrientation(direction);
    if (orientation === directionOrientation) {
        let [rest, index] = tail(location);
        if (direction === 3 /* Direction.Right */ || direction === 1 /* Direction.Down */) {
            index += 1;
        }
        return [...rest, index];
    }
    else {
        const index = direction === 3 /* Direction.Right */ || direction === 1 /* Direction.Down */ ? 1 : 0;
        return [...location, index];
    }
}
function indexInParent(element) {
    const parentElement = element.parentElement;
    if (!parentElement) {
        throw new Error('Invalid grid element');
    }
    let el = parentElement.firstElementChild;
    let index = 0;
    while (el !== element && el !== parentElement.lastElementChild && el) {
        el = el.nextElementSibling;
        index++;
    }
    return index;
}
/**
 * Find the grid location of a specific DOM element by traversing the parent
 * chain and finding each child index on the way.
 *
 * This will break as soon as DOM structures of the Splitview or Gridview change.
 */
function getGridLocation(element) {
    const parentElement = element.parentElement;
    if (!parentElement) {
        throw new Error('Invalid grid element');
    }
    if (/\bmonaco-grid-view\b/.test(parentElement.className)) {
        return [];
    }
    const index = indexInParent(parentElement);
    const ancestor = parentElement.parentElement.parentElement.parentElement.parentElement;
    return [...getGridLocation(ancestor), index];
}
export var Sizing;
(function (Sizing) {
    Sizing.Distribute = { type: 'distribute' };
    Sizing.Split = { type: 'split' };
    Sizing.Auto = { type: 'auto' };
    function Invisible(cachedVisibleSize) {
        return { type: 'invisible', cachedVisibleSize };
    }
    Sizing.Invisible = Invisible;
})(Sizing || (Sizing = {}));
/**
 * The {@link Grid} exposes a Grid widget in a friendlier API than the underlying
 * {@link GridView} widget. Namely, all mutation operations are addressed by the
 * model elements, rather than indexes.
 *
 * It support the same features as the {@link GridView}.
 */
export class Grid extends Disposable {
    /**
     * The orientation of the grid. Matches the orientation of the root
     * {@link SplitView} in the grid's {@link GridLocation} model.
     */
    get orientation() {
        return this.gridview.orientation;
    }
    set orientation(orientation) {
        this.gridview.orientation = orientation;
    }
    /**
     * The width of the grid.
     */
    get width() {
        return this.gridview.width;
    }
    /**
     * The height of the grid.
     */
    get height() {
        return this.gridview.height;
    }
    /**
     * The minimum width of the grid.
     */
    get minimumWidth() {
        return this.gridview.minimumWidth;
    }
    /**
     * The minimum height of the grid.
     */
    get minimumHeight() {
        return this.gridview.minimumHeight;
    }
    /**
     * The maximum width of the grid.
     */
    get maximumWidth() {
        return this.gridview.maximumWidth;
    }
    /**
     * The maximum height of the grid.
     */
    get maximumHeight() {
        return this.gridview.maximumHeight;
    }
    /**
     * A collection of sashes perpendicular to each edge of the grid.
     * Corner sashes will be created for each intersection.
     */
    get boundarySashes() {
        return this.gridview.boundarySashes;
    }
    set boundarySashes(boundarySashes) {
        this.gridview.boundarySashes = boundarySashes;
    }
    /**
     * Enable/disable edge snapping across all grid views.
     */
    set edgeSnapping(edgeSnapping) {
        this.gridview.edgeSnapping = edgeSnapping;
    }
    /**
     * The DOM element for this view.
     */
    get element() {
        return this.gridview.element;
    }
    /**
     * Create a new {@link Grid}. A grid must *always* have a view
     * inside.
     *
     * @param view An initial view for this Grid.
     */
    constructor(view, options = {}) {
        super();
        this.views = new Map();
        this.didLayout = false;
        if (view instanceof GridView) {
            this.gridview = view;
            this.gridview.getViewMap(this.views);
        }
        else {
            this.gridview = new GridView(options);
        }
        this._register(this.gridview);
        this._register(this.gridview.onDidSashReset(this.onDidSashReset, this));
        if (!(view instanceof GridView)) {
            this._addView(view, 0, [0]);
        }
        this.onDidChange = this.gridview.onDidChange;
        this.onDidScroll = this.gridview.onDidScroll;
        this.onDidChangeViewMaximized = this.gridview.onDidChangeViewMaximized;
    }
    style(styles) {
        this.gridview.style(styles);
    }
    /**
     * Layout the {@link Grid}.
     *
     * Optionally provide a `top` and `left` positions, those will propagate
     * as an origin for positions passed to {@link IView.layout}.
     *
     * @param width The width of the {@link Grid}.
     * @param height The height of the {@link Grid}.
     * @param top Optional, the top location of the {@link Grid}.
     * @param left Optional, the left location of the {@link Grid}.
     */
    layout(width, height, top = 0, left = 0) {
        this.gridview.layout(width, height, top, left);
        this.didLayout = true;
    }
    /**
     * Add a {@link IView view} to this {@link Grid}, based on another reference view.
     *
     * Take this grid as an example:
     *
     * ```
     *  +-----+---------------+
     *  |  A  |      B        |
     *  +-----+---------+-----+
     *  |        C      |     |
     *  +---------------+  D  |
     *  |        E      |     |
     *  +---------------+-----+
     * ```
     *
     * Calling `addView(X, Sizing.Distribute, C, Direction.Right)` will make the following
     * changes:
     *
     * ```
     *  +-----+---------------+
     *  |  A  |      B        |
     *  +-----+-+-------+-----+
     *  |   C   |   X   |     |
     *  +-------+-------+  D  |
     *  |        E      |     |
     *  +---------------+-----+
     * ```
     *
     * Or `addView(X, Sizing.Distribute, D, Direction.Down)`:
     *
     * ```
     *  +-----+---------------+
     *  |  A  |      B        |
     *  +-----+---------+-----+
     *  |        C      |  D  |
     *  +---------------+-----+
     *  |        E      |  X  |
     *  +---------------+-----+
     * ```
     *
     * @param newView The view to add.
     * @param size Either a fixed size, or a dynamic {@link Sizing} strategy.
     * @param referenceView Another view to place this new view next to.
     * @param direction The direction the new view should be placed next to the reference view.
     */
    addView(newView, size, referenceView, direction) {
        if (this.views.has(newView)) {
            throw new Error("Can't add same view twice");
        }
        const orientation = getDirectionOrientation(direction);
        if (this.views.size === 1 && this.orientation !== orientation) {
            this.orientation = orientation;
        }
        const referenceLocation = this.getViewLocation(referenceView);
        const location = getRelativeLocation(this.gridview.orientation, referenceLocation, direction);
        let viewSize;
        if (typeof size === 'number') {
            viewSize = size;
        }
        else if (size.type === 'split') {
            const [, index] = tail(referenceLocation);
            viewSize = GridViewSizing.Split(index);
        }
        else if (size.type === 'distribute') {
            viewSize = GridViewSizing.Distribute;
        }
        else if (size.type === 'auto') {
            const [, index] = tail(referenceLocation);
            viewSize = GridViewSizing.Auto(index);
        }
        else {
            viewSize = size;
        }
        this._addView(newView, viewSize, location);
    }
    addViewAt(newView, size, location) {
        if (this.views.has(newView)) {
            throw new Error("Can't add same view twice");
        }
        let viewSize;
        if (typeof size === 'number') {
            viewSize = size;
        }
        else if (size.type === 'distribute') {
            viewSize = GridViewSizing.Distribute;
        }
        else {
            viewSize = size;
        }
        this._addView(newView, viewSize, location);
    }
    _addView(newView, size, location) {
        this.views.set(newView, newView.element);
        this.gridview.addView(newView, size, location);
    }
    /**
     * Remove a {@link IView view} from this {@link Grid}.
     *
     * @param view The {@link IView view} to remove.
     * @param sizing Whether to distribute other {@link IView view}'s sizes.
     */
    removeView(view, sizing) {
        if (this.views.size === 1) {
            throw new Error("Can't remove last view");
        }
        const location = this.getViewLocation(view);
        let gridViewSizing;
        if (sizing?.type === 'distribute') {
            gridViewSizing = GridViewSizing.Distribute;
        }
        else if (sizing?.type === 'auto') {
            const index = location[location.length - 1];
            gridViewSizing = GridViewSizing.Auto(index === 0 ? 1 : index - 1);
        }
        this.gridview.removeView(location, gridViewSizing);
        this.views.delete(view);
    }
    /**
     * Move a {@link IView view} to another location in the grid.
     *
     * @remarks See {@link Grid.addView}.
     *
     * @param view The {@link IView view} to move.
     * @param sizing Either a fixed size, or a dynamic {@link Sizing} strategy.
     * @param referenceView Another view to place the view next to.
     * @param direction The direction the view should be placed next to the reference view.
     */
    moveView(view, sizing, referenceView, direction) {
        const sourceLocation = this.getViewLocation(view);
        const [sourceParentLocation, from] = tail(sourceLocation);
        const referenceLocation = this.getViewLocation(referenceView);
        const targetLocation = getRelativeLocation(this.gridview.orientation, referenceLocation, direction);
        const [targetParentLocation, to] = tail(targetLocation);
        if (equals(sourceParentLocation, targetParentLocation)) {
            this.gridview.moveView(sourceParentLocation, from, to);
        }
        else {
            this.removeView(view, typeof sizing === 'number' ? undefined : sizing);
            this.addView(view, sizing, referenceView, direction);
        }
    }
    /**
     * Move a {@link IView view} to another location in the grid.
     *
     * @remarks Internal method, do not use without knowing what you're doing.
     * @remarks See {@link GridView.moveView}.
     *
     * @param view The {@link IView view} to move.
     * @param location The {@link GridLocation location} to insert the view on.
     */
    moveViewTo(view, location) {
        const sourceLocation = this.getViewLocation(view);
        const [sourceParentLocation, from] = tail(sourceLocation);
        const [targetParentLocation, to] = tail(location);
        if (equals(sourceParentLocation, targetParentLocation)) {
            this.gridview.moveView(sourceParentLocation, from, to);
        }
        else {
            const size = this.getViewSize(view);
            const orientation = getLocationOrientation(this.gridview.orientation, sourceLocation);
            const cachedViewSize = this.getViewCachedVisibleSize(view);
            const sizing = typeof cachedViewSize === 'undefined'
                ? orientation === 1 /* Orientation.HORIZONTAL */
                    ? size.width
                    : size.height
                : Sizing.Invisible(cachedViewSize);
            this.removeView(view);
            this.addViewAt(view, sizing, location);
        }
    }
    /**
     * Swap two {@link IView views} within the {@link Grid}.
     *
     * @param from One {@link IView view}.
     * @param to Another {@link IView view}.
     */
    swapViews(from, to) {
        const fromLocation = this.getViewLocation(from);
        const toLocation = this.getViewLocation(to);
        return this.gridview.swapViews(fromLocation, toLocation);
    }
    /**
     * Resize a {@link IView view}.
     *
     * @param view The {@link IView view} to resize.
     * @param size The size the view should be.
     */
    resizeView(view, size) {
        const location = this.getViewLocation(view);
        return this.gridview.resizeView(location, size);
    }
    /**
     * Returns whether all other {@link IView views} are at their minimum size.
     *
     * @param view The reference {@link IView view}.
     */
    isViewExpanded(view) {
        const location = this.getViewLocation(view);
        return this.gridview.isViewExpanded(location);
    }
    /**
     * Returns whether the {@link IView view} is maximized.
     *
     * @param view The reference {@link IView view}.
     */
    isViewMaximized(view) {
        const location = this.getViewLocation(view);
        return this.gridview.isViewMaximized(location);
    }
    /**
     * Returns whether the {@link IView view} is maximized.
     *
     * @param view The reference {@link IView view}.
     */
    hasMaximizedView() {
        return this.gridview.hasMaximizedView();
    }
    /**
     * Get the size of a {@link IView view}.
     *
     * @param view The {@link IView view}. Provide `undefined` to get the size
     * of the grid itself.
     */
    getViewSize(view) {
        if (!view) {
            return this.gridview.getViewSize();
        }
        const location = this.getViewLocation(view);
        return this.gridview.getViewSize(location);
    }
    /**
     * Get the cached visible size of a {@link IView view}. This was the size
     * of the view at the moment it last became hidden.
     *
     * @param view The {@link IView view}.
     */
    getViewCachedVisibleSize(view) {
        const location = this.getViewLocation(view);
        return this.gridview.getViewCachedVisibleSize(location);
    }
    /**
     * Maximizes the specified view and hides all other views.
     * @param view The view to maximize.
     */
    maximizeView(view) {
        if (this.views.size < 2) {
            throw new Error('At least two views are required to maximize a view');
        }
        const location = this.getViewLocation(view);
        this.gridview.maximizeView(location);
    }
    exitMaximizedView() {
        this.gridview.exitMaximizedView();
    }
    /**
     * Expand the size of a {@link IView view} by collapsing all other views
     * to their minimum sizes.
     *
     * @param view The {@link IView view}.
     */
    expandView(view) {
        const location = this.getViewLocation(view);
        this.gridview.expandView(location);
    }
    /**
     * Distribute the size among all {@link IView views} within the entire
     * grid or within a single {@link SplitView}.
     */
    distributeViewSizes() {
        this.gridview.distributeViewSizes();
    }
    /**
     * Returns whether a {@link IView view} is visible.
     *
     * @param view The {@link IView view}.
     */
    isViewVisible(view) {
        const location = this.getViewLocation(view);
        return this.gridview.isViewVisible(location);
    }
    /**
     * Set the visibility state of a {@link IView view}.
     *
     * @param view The {@link IView view}.
     */
    setViewVisible(view, visible) {
        const location = this.getViewLocation(view);
        this.gridview.setViewVisible(location, visible);
    }
    /**
     * Returns a descriptor for the entire grid.
     */
    getViews() {
        return this.gridview.getView();
    }
    /**
     * Utility method to return the collection all views which intersect
     * a view's edge.
     *
     * @param view The {@link IView view}.
     * @param direction Which direction edge to be considered.
     * @param wrap Whether the grid wraps around (from right to left, from bottom to top).
     */
    getNeighborViews(view, direction, wrap = false) {
        if (!this.didLayout) {
            throw new Error("Can't call getNeighborViews before first layout");
        }
        const location = this.getViewLocation(view);
        const root = this.getViews();
        const node = getGridNode(root, location);
        let boundary = getBoxBoundary(node.box, direction);
        if (wrap) {
            if (direction === 0 /* Direction.Up */ && node.box.top === 0) {
                boundary = { offset: root.box.top + root.box.height, range: boundary.range };
            }
            else if (direction === 3 /* Direction.Right */ &&
                node.box.left + node.box.width === root.box.width) {
                boundary = { offset: 0, range: boundary.range };
            }
            else if (direction === 1 /* Direction.Down */ &&
                node.box.top + node.box.height === root.box.height) {
                boundary = { offset: 0, range: boundary.range };
            }
            else if (direction === 2 /* Direction.Left */ && node.box.left === 0) {
                boundary = { offset: root.box.left + root.box.width, range: boundary.range };
            }
        }
        return findAdjacentBoxLeafNodes(root, oppositeDirection(direction), boundary).map((node) => node.view);
    }
    getViewLocation(view) {
        const element = this.views.get(view);
        if (!element) {
            throw new Error('View not found');
        }
        return getGridLocation(element);
    }
    onDidSashReset(location) {
        const resizeToPreferredSize = (location) => {
            const node = this.gridview.getView(location);
            if (isGridBranchNode(node)) {
                return false;
            }
            const direction = getLocationOrientation(this.orientation, location);
            const size = direction === 1 /* Orientation.HORIZONTAL */ ? node.view.preferredWidth : node.view.preferredHeight;
            if (typeof size !== 'number') {
                return false;
            }
            const viewSize = direction === 1 /* Orientation.HORIZONTAL */
                ? { width: Math.round(size) }
                : { height: Math.round(size) };
            this.gridview.resizeView(location, viewSize);
            return true;
        };
        if (resizeToPreferredSize(location)) {
            return;
        }
        const [parentLocation, index] = tail(location);
        if (resizeToPreferredSize([...parentLocation, index + 1])) {
            return;
        }
        this.gridview.distributeViewSizes(parentLocation);
    }
}
/**
 * A {@link Grid} which can serialize itself.
 */
export class SerializableGrid extends Grid {
    constructor() {
        super(...arguments);
        /**
         * Useful information in order to proportionally restore view sizes
         * upon the very first layout call.
         */
        this.initialLayoutContext = true;
    }
    static serializeNode(node, orientation) {
        const size = orientation === 0 /* Orientation.VERTICAL */ ? node.box.width : node.box.height;
        if (!isGridBranchNode(node)) {
            const serializedLeafNode = {
                type: 'leaf',
                data: node.view.toJSON(),
                size,
            };
            if (typeof node.cachedVisibleSize === 'number') {
                serializedLeafNode.size = node.cachedVisibleSize;
                serializedLeafNode.visible = false;
            }
            else if (node.maximized) {
                serializedLeafNode.maximized = true;
            }
            return serializedLeafNode;
        }
        const data = node.children.map((c) => SerializableGrid.serializeNode(c, orthogonal(orientation)));
        if (data.some((c) => c.visible !== false)) {
            return { type: 'branch', data: data, size };
        }
        return { type: 'branch', data: data, size, visible: false };
    }
    /**
     * Construct a new {@link SerializableGrid} from a JSON object.
     *
     * @param json The JSON object.
     * @param deserializer A deserializer which can revive each view.
     * @returns A new {@link SerializableGrid} instance.
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
        const gridview = GridView.deserialize(json, deserializer, options);
        const result = new SerializableGrid(gridview, options);
        return result;
    }
    /**
     * Construct a new {@link SerializableGrid} from a grid descriptor.
     *
     * @param gridDescriptor A grid descriptor in which leaf nodes point to actual views.
     * @returns A new {@link SerializableGrid} instance.
     */
    static from(gridDescriptor, options = {}) {
        return SerializableGrid.deserialize(createSerializedGrid(gridDescriptor), { fromJSON: (view) => view }, options);
    }
    /**
     * Serialize this grid into a JSON object.
     */
    serialize() {
        return {
            root: SerializableGrid.serializeNode(this.getViews(), this.orientation),
            orientation: this.orientation,
            width: this.width,
            height: this.height,
        };
    }
    layout(width, height, top = 0, left = 0) {
        super.layout(width, height, top, left);
        if (this.initialLayoutContext) {
            this.initialLayoutContext = false;
            this.gridview.trySet2x2();
        }
    }
}
function isGridBranchNodeDescriptor(nodeDescriptor) {
    return !!nodeDescriptor.groups;
}
export function sanitizeGridNodeDescriptor(nodeDescriptor, rootNode) {
    if (!rootNode && nodeDescriptor.groups && nodeDescriptor.groups.length <= 1) {
        ;
        nodeDescriptor.groups = undefined;
    }
    if (!isGridBranchNodeDescriptor(nodeDescriptor)) {
        return;
    }
    let totalDefinedSize = 0;
    let totalDefinedSizeCount = 0;
    for (const child of nodeDescriptor.groups) {
        sanitizeGridNodeDescriptor(child, false);
        if (child.size) {
            totalDefinedSize += child.size;
            totalDefinedSizeCount++;
        }
    }
    const totalUndefinedSize = totalDefinedSizeCount > 0 ? totalDefinedSize : 1;
    const totalUndefinedSizeCount = nodeDescriptor.groups.length - totalDefinedSizeCount;
    const eachUndefinedSize = totalUndefinedSize / totalUndefinedSizeCount;
    for (const child of nodeDescriptor.groups) {
        if (!child.size) {
            child.size = eachUndefinedSize;
        }
    }
}
function createSerializedNode(nodeDescriptor) {
    if (isGridBranchNodeDescriptor(nodeDescriptor)) {
        return {
            type: 'branch',
            data: nodeDescriptor.groups.map((c) => createSerializedNode(c)),
            size: nodeDescriptor.size,
        };
    }
    else {
        return { type: 'leaf', data: nodeDescriptor.data, size: nodeDescriptor.size };
    }
}
function getDimensions(node, orientation) {
    if (node.type === 'branch') {
        const childrenDimensions = node.data.map((c) => getDimensions(c, orthogonal(orientation)));
        if (orientation === 0 /* Orientation.VERTICAL */) {
            const width = node.size ||
                (childrenDimensions.length === 0
                    ? undefined
                    : Math.max(...childrenDimensions.map((d) => d.width || 0)));
            const height = childrenDimensions.length === 0
                ? undefined
                : childrenDimensions.reduce((r, d) => r + (d.height || 0), 0);
            return { width, height };
        }
        else {
            const width = childrenDimensions.length === 0
                ? undefined
                : childrenDimensions.reduce((r, d) => r + (d.width || 0), 0);
            const height = node.size ||
                (childrenDimensions.length === 0
                    ? undefined
                    : Math.max(...childrenDimensions.map((d) => d.height || 0)));
            return { width, height };
        }
    }
    else {
        const width = orientation === 0 /* Orientation.VERTICAL */ ? node.size : undefined;
        const height = orientation === 0 /* Orientation.VERTICAL */ ? undefined : node.size;
        return { width, height };
    }
}
/**
 * Creates a new JSON object from a {@link GridDescriptor}, which can
 * be deserialized by {@link SerializableGrid.deserialize}.
 */
export function createSerializedGrid(gridDescriptor) {
    sanitizeGridNodeDescriptor(gridDescriptor, true);
    const root = createSerializedNode(gridDescriptor);
    const { width, height } = getDimensions(root, gridDescriptor.orientation);
    return {
        root,
        orientation: gridDescriptor.orientation,
        width: width || 1,
        height: height || 1,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2dyaWQvZ3JpZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RCxPQUFPLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFFTixRQUFRLEVBS1IsVUFBVSxFQUNWLE1BQU0sSUFBSSxjQUFjLEdBRXhCLE1BQU0sZUFBZSxDQUFBO0FBSXRCLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV2RSxNQUFNLENBQU4sSUFBa0IsU0FLakI7QUFMRCxXQUFrQixTQUFTO0lBQzFCLHFDQUFFLENBQUE7SUFDRix5Q0FBSSxDQUFBO0lBQ0oseUNBQUksQ0FBQTtJQUNKLDJDQUFLLENBQUE7QUFDTixDQUFDLEVBTGlCLFNBQVMsS0FBVCxTQUFTLFFBSzFCO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxTQUFvQjtJQUM5QyxRQUFRLFNBQVMsRUFBRSxDQUFDO1FBQ25CO1lBQ0MsOEJBQXFCO1FBQ3RCO1lBQ0MsNEJBQW1CO1FBQ3BCO1lBQ0MsK0JBQXNCO1FBQ3ZCO1lBQ0MsOEJBQXFCO0lBQ3ZCLENBQUM7QUFDRixDQUFDO0FBaUNELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBa0IsSUFBaUI7SUFDbEUsT0FBTyxDQUFDLENBQUUsSUFBWSxDQUFDLFFBQVEsQ0FBQTtBQUNoQyxDQUFDO0FBRUQsU0FBUyxXQUFXLENBQWtCLElBQWlCLEVBQUUsUUFBc0I7SUFDOUUsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzNC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