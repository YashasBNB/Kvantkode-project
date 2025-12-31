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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JpZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9ncmlkL2dyaWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBRU4sUUFBUSxFQUtSLFVBQVUsRUFDVixNQUFNLElBQUksY0FBYyxHQUV4QixNQUFNLGVBQWUsQ0FBQTtBQUl0QixPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFdkUsTUFBTSxDQUFOLElBQWtCLFNBS2pCO0FBTEQsV0FBa0IsU0FBUztJQUMxQixxQ0FBRSxDQUFBO0lBQ0YseUNBQUksQ0FBQTtJQUNKLHlDQUFJLENBQUE7SUFDSiwyQ0FBSyxDQUFBO0FBQ04sQ0FBQyxFQUxpQixTQUFTLEtBQVQsU0FBUyxRQUsxQjtBQUVELFNBQVMsaUJBQWlCLENBQUMsU0FBb0I7SUFDOUMsUUFBUSxTQUFTLEVBQUUsQ0FBQztRQUNuQjtZQUNDLDhCQUFxQjtRQUN0QjtZQUNDLDRCQUFtQjtRQUNwQjtZQUNDLCtCQUFzQjtRQUN2QjtZQUNDLDhCQUFxQjtJQUN2QixDQUFDO0FBQ0YsQ0FBQztBQWlDRCxNQUFNLFVBQVUsZ0JBQWdCLENBQWtCLElBQWlCO0lBQ2xFLE9BQU8sQ0FBQyxDQUFFLElBQVksQ0FBQyxRQUFRLENBQUE7QUFDaEMsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFrQixJQUFpQixFQUFFLFFBQXNCO0lBQzlFLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUMzQixPQUFP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