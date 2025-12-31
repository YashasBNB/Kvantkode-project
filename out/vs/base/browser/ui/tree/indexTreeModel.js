/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { TreeError, } from './tree.js';
import { splice, tail } from '../../../common/arrays.js';
import { Delayer } from '../../../common/async.js';
import { MicrotaskDelay } from '../../../common/symbols.js';
import { LcsDiff } from '../../../common/diff/diff.js';
import { Emitter, EventBufferer } from '../../../common/event.js';
import { Iterable } from '../../../common/iterator.js';
export function isFilterResult(obj) {
    return typeof obj === 'object' && 'visibility' in obj && 'data' in obj;
}
export function getVisibleState(visibility) {
    switch (visibility) {
        case true:
            return 1 /* TreeVisibility.Visible */;
        case false:
            return 0 /* TreeVisibility.Hidden */;
        default:
            return visibility;
    }
}
function isCollapsibleStateUpdate(update) {
    return typeof update.collapsible === 'boolean';
}
export class IndexTreeModel {
    constructor(user, rootElement, options = {}) {
        this.user = user;
        this.rootRef = [];
        this.eventBufferer = new EventBufferer();
        this._onDidSpliceModel = new Emitter();
        this.onDidSpliceModel = this._onDidSpliceModel.event;
        this._onDidSpliceRenderedNodes = new Emitter();
        this.onDidSpliceRenderedNodes = this._onDidSpliceRenderedNodes.event;
        this._onDidChangeCollapseState = new Emitter();
        this.onDidChangeCollapseState = this.eventBufferer.wrapEvent(this._onDidChangeCollapseState.event);
        this._onDidChangeRenderNodeCount = new Emitter();
        this.onDidChangeRenderNodeCount = this.eventBufferer.wrapEvent(this._onDidChangeRenderNodeCount.event);
        this.refilterDelayer = new Delayer(MicrotaskDelay);
        this.collapseByDefault =
            typeof options.collapseByDefault === 'undefined' ? false : options.collapseByDefault;
        this.allowNonCollapsibleParents = options.allowNonCollapsibleParents ?? false;
        this.filter = options.filter;
        this.autoExpandSingleChildren =
            typeof options.autoExpandSingleChildren === 'undefined'
                ? false
                : options.autoExpandSingleChildren;
        this.root = {
            parent: undefined,
            element: rootElement,
            children: [],
            depth: 0,
            visibleChildrenCount: 0,
            visibleChildIndex: -1,
            collapsible: false,
            collapsed: false,
            renderNodeCount: 0,
            visibility: 1 /* TreeVisibility.Visible */,
            visible: true,
            filterData: undefined,
        };
    }
    splice(location, deleteCount, toInsert = Iterable.empty(), options = {}) {
        if (location.length === 0) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        if (options.diffIdentityProvider) {
            this.spliceSmart(options.diffIdentityProvider, location, deleteCount, toInsert, options);
        }
        else {
            this.spliceSimple(location, deleteCount, toInsert, options);
        }
    }
    spliceSmart(identity, location, deleteCount, toInsertIterable = Iterable.empty(), options, recurseLevels = options.diffDepth ?? 0) {
        const { parentNode } = this.getParentNodeWithListIndex(location);
        if (!parentNode.lastDiffIds) {
            return this.spliceSimple(location, deleteCount, toInsertIterable, options);
        }
        const toInsert = [...toInsertIterable];
        const index = location[location.length - 1];
        const diff = new LcsDiff({ getElements: () => parentNode.lastDiffIds }, {
            getElements: () => [
                ...parentNode.children.slice(0, index),
                ...toInsert,
                ...parentNode.children.slice(index + deleteCount),
            ].map((e) => identity.getId(e.element).toString()),
        }).ComputeDiff(false);
        // if we were given a 'best effort' diff, use default behavior
        if (diff.quitEarly) {
            parentNode.lastDiffIds = undefined;
            return this.spliceSimple(location, deleteCount, toInsert, options);
        }
        const locationPrefix = location.slice(0, -1);
        const recurseSplice = (fromOriginal, fromModified, count) => {
            if (recurseLevels > 0) {
                for (let i = 0; i < count; i++) {
                    fromOriginal--;
                    fromModified--;
                    this.spliceSmart(identity, [...locationPrefix, fromOriginal, 0], Number.MAX_SAFE_INTEGER, toInsert[fromModified].children, options, recurseLevels - 1);
                }
            }
        };
        let lastStartO = Math.min(parentNode.children.length, index + deleteCount);
        let lastStartM = toInsert.length;
        for (const change of diff.changes.sort((a, b) => b.originalStart - a.originalStart)) {
            recurseSplice(lastStartO, lastStartM, lastStartO - (change.originalStart + change.originalLength));
            lastStartO = change.originalStart;
            lastStartM = change.modifiedStart - index;
            this.spliceSimple([...locationPrefix, lastStartO], change.originalLength, Iterable.slice(toInsert, lastStartM, lastStartM + change.modifiedLength), options);
        }
        // at this point, startO === startM === count since any remaining prefix should match
        recurseSplice(lastStartO, lastStartM, lastStartO);
    }
    spliceSimple(location, deleteCount, toInsert = Iterable.empty(), { onDidCreateNode, onDidDeleteNode, diffIdentityProvider, }) {
        const { parentNode, listIndex, revealed, visible } = this.getParentNodeWithListIndex(location);
        const treeListElementsToInsert = [];
        const nodesToInsertIterator = Iterable.map(toInsert, (el) => this.createTreeNode(el, parentNode, parentNode.visible ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */, revealed, treeListElementsToInsert, onDidCreateNode));
        const lastIndex = location[location.length - 1];
        // figure out what's the visible child start index right before the
        // splice point
        let visibleChildStartIndex = 0;
        for (let i = lastIndex; i >= 0 && i < parentNode.children.length; i--) {
            const child = parentNode.children[i];
            if (child.visible) {
                visibleChildStartIndex = child.visibleChildIndex;
                break;
            }
        }
        const nodesToInsert = [];
        let insertedVisibleChildrenCount = 0;
        let renderNodeCount = 0;
        for (const child of nodesToInsertIterator) {
            nodesToInsert.push(child);
            renderNodeCount += child.renderNodeCount;
            if (child.visible) {
                child.visibleChildIndex = visibleChildStartIndex + insertedVisibleChildrenCount++;
            }
        }
        const deletedNodes = splice(parentNode.children, lastIndex, deleteCount, nodesToInsert);
        if (!diffIdentityProvider) {
            parentNode.lastDiffIds = undefined;
        }
        else if (parentNode.lastDiffIds) {
            splice(parentNode.lastDiffIds, lastIndex, deleteCount, nodesToInsert.map((n) => diffIdentityProvider.getId(n.element).toString()));
        }
        else {
            parentNode.lastDiffIds = parentNode.children.map((n) => diffIdentityProvider.getId(n.element).toString());
        }
        // figure out what is the count of deleted visible children
        let deletedVisibleChildrenCount = 0;
        for (const child of deletedNodes) {
            if (child.visible) {
                deletedVisibleChildrenCount++;
            }
        }
        // and adjust for all visible children after the splice point
        if (deletedVisibleChildrenCount !== 0) {
            for (let i = lastIndex + nodesToInsert.length; i < parentNode.children.length; i++) {
                const child = parentNode.children[i];
                if (child.visible) {
                    child.visibleChildIndex -= deletedVisibleChildrenCount;
                }
            }
        }
        // update parent's visible children count
        parentNode.visibleChildrenCount += insertedVisibleChildrenCount - deletedVisibleChildrenCount;
        if (deletedNodes.length > 0 && onDidDeleteNode) {
            const visit = (node) => {
                onDidDeleteNode(node);
                node.children.forEach(visit);
            };
            deletedNodes.forEach(visit);
        }
        if (revealed && visible) {
            const visibleDeleteCount = deletedNodes.reduce((r, node) => r + (node.visible ? node.renderNodeCount : 0), 0);
            this._updateAncestorsRenderNodeCount(parentNode, renderNodeCount - visibleDeleteCount);
            this._onDidSpliceRenderedNodes.fire({
                start: listIndex,
                deleteCount: visibleDeleteCount,
                elements: treeListElementsToInsert,
            });
        }
        this._onDidSpliceModel.fire({ insertedNodes: nodesToInsert, deletedNodes });
        let node = parentNode;
        while (node) {
            if (node.visibility === 2 /* TreeVisibility.Recurse */) {
                // delayed to avoid excessive refiltering, see #135941
                this.refilterDelayer.trigger(() => this.refilter());
                break;
            }
            node = node.parent;
        }
    }
    rerender(location) {
        if (location.length === 0) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        const { node, listIndex, revealed } = this.getTreeNodeWithListIndex(location);
        if (node.visible && revealed) {
            this._onDidSpliceRenderedNodes.fire({ start: listIndex, deleteCount: 1, elements: [node] });
        }
    }
    has(location) {
        return this.hasTreeNode(location);
    }
    getListIndex(location) {
        const { listIndex, visible, revealed } = this.getTreeNodeWithListIndex(location);
        return visible && revealed ? listIndex : -1;
    }
    getListRenderCount(location) {
        return this.getTreeNode(location).renderNodeCount;
    }
    isCollapsible(location) {
        return this.getTreeNode(location).collapsible;
    }
    setCollapsible(location, collapsible) {
        const node = this.getTreeNode(location);
        if (typeof collapsible === 'undefined') {
            collapsible = !node.collapsible;
        }
        const update = { collapsible };
        return this.eventBufferer.bufferEvents(() => this._setCollapseState(location, update));
    }
    isCollapsed(location) {
        return this.getTreeNode(location).collapsed;
    }
    setCollapsed(location, collapsed, recursive) {
        const node = this.getTreeNode(location);
        if (typeof collapsed === 'undefined') {
            collapsed = !node.collapsed;
        }
        const update = { collapsed, recursive: recursive || false };
        return this.eventBufferer.bufferEvents(() => this._setCollapseState(location, update));
    }
    _setCollapseState(location, update) {
        const { node, listIndex, revealed } = this.getTreeNodeWithListIndex(location);
        const result = this._setListNodeCollapseState(node, listIndex, revealed, update);
        if (node !== this.root &&
            this.autoExpandSingleChildren &&
            result &&
            !isCollapsibleStateUpdate(update) &&
            node.collapsible &&
            !node.collapsed &&
            !update.recursive) {
            let onlyVisibleChildIndex = -1;
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child.visible) {
                    if (onlyVisibleChildIndex > -1) {
                        onlyVisibleChildIndex = -1;
                        break;
                    }
                    else {
                        onlyVisibleChildIndex = i;
                    }
                }
            }
            if (onlyVisibleChildIndex > -1) {
                this._setCollapseState([...location, onlyVisibleChildIndex], update);
            }
        }
        return result;
    }
    _setListNodeCollapseState(node, listIndex, revealed, update) {
        const result = this._setNodeCollapseState(node, update, false);
        if (!revealed || !node.visible || !result) {
            return result;
        }
        const previousRenderNodeCount = node.renderNodeCount;
        const toInsert = this.updateNodeAfterCollapseChange(node);
        const deleteCount = previousRenderNodeCount - (listIndex === -1 ? 0 : 1);
        this._onDidSpliceRenderedNodes.fire({
            start: listIndex + 1,
            deleteCount: deleteCount,
            elements: toInsert.slice(1),
        });
        return result;
    }
    _setNodeCollapseState(node, update, deep) {
        let result;
        if (node === this.root) {
            result = false;
        }
        else {
            if (isCollapsibleStateUpdate(update)) {
                result = node.collapsible !== update.collapsible;
                node.collapsible = update.collapsible;
            }
            else if (!node.collapsible) {
                result = false;
            }
            else {
                result = node.collapsed !== update.collapsed;
                node.collapsed = update.collapsed;
            }
            if (result) {
                this._onDidChangeCollapseState.fire({ node, deep });
            }
        }
        if (!isCollapsibleStateUpdate(update) && update.recursive) {
            for (const child of node.children) {
                result = this._setNodeCollapseState(child, update, true) || result;
            }
        }
        return result;
    }
    expandTo(location) {
        this.eventBufferer.bufferEvents(() => {
            let node = this.getTreeNode(location);
            while (node.parent) {
                node = node.parent;
                location = location.slice(0, location.length - 1);
                if (node.collapsed) {
                    this._setCollapseState(location, { collapsed: false, recursive: false });
                }
            }
        });
    }
    refilter() {
        const previousRenderNodeCount = this.root.renderNodeCount;
        const toInsert = this.updateNodeAfterFilterChange(this.root);
        this._onDidSpliceRenderedNodes.fire({
            start: 0,
            deleteCount: previousRenderNodeCount,
            elements: toInsert,
        });
        this.refilterDelayer.cancel();
    }
    createTreeNode(treeElement, parent, parentVisibility, revealed, treeListElements, onDidCreateNode) {
        const node = {
            parent,
            element: treeElement.element,
            children: [],
            depth: parent.depth + 1,
            visibleChildrenCount: 0,
            visibleChildIndex: -1,
            collapsible: typeof treeElement.collapsible === 'boolean'
                ? treeElement.collapsible
                : typeof treeElement.collapsed !== 'undefined',
            collapsed: typeof treeElement.collapsed === 'undefined'
                ? this.collapseByDefault
                : treeElement.collapsed,
            renderNodeCount: 1,
            visibility: 1 /* TreeVisibility.Visible */,
            visible: true,
            filterData: undefined,
        };
        const visibility = this._filterNode(node, parentVisibility);
        node.visibility = visibility;
        if (revealed) {
            treeListElements.push(node);
        }
        const childElements = treeElement.children || Iterable.empty();
        const childRevealed = revealed && visibility !== 0 /* TreeVisibility.Hidden */ && !node.collapsed;
        let visibleChildrenCount = 0;
        let renderNodeCount = 1;
        for (const el of childElements) {
            const child = this.createTreeNode(el, node, visibility, childRevealed, treeListElements, onDidCreateNode);
            node.children.push(child);
            renderNodeCount += child.renderNodeCount;
            if (child.visible) {
                child.visibleChildIndex = visibleChildrenCount++;
            }
        }
        if (!this.allowNonCollapsibleParents) {
            node.collapsible = node.collapsible || node.children.length > 0;
        }
        node.visibleChildrenCount = visibleChildrenCount;
        node.visible =
            visibility === 2 /* TreeVisibility.Recurse */
                ? visibleChildrenCount > 0
                : visibility === 1 /* TreeVisibility.Visible */;
        if (!node.visible) {
            node.renderNodeCount = 0;
            if (revealed) {
                treeListElements.pop();
            }
        }
        else if (!node.collapsed) {
            node.renderNodeCount = renderNodeCount;
        }
        onDidCreateNode?.(node);
        return node;
    }
    updateNodeAfterCollapseChange(node) {
        const previousRenderNodeCount = node.renderNodeCount;
        const result = [];
        this._updateNodeAfterCollapseChange(node, result);
        this._updateAncestorsRenderNodeCount(node.parent, result.length - previousRenderNodeCount);
        return result;
    }
    _updateNodeAfterCollapseChange(node, result) {
        if (node.visible === false) {
            return 0;
        }
        result.push(node);
        node.renderNodeCount = 1;
        if (!node.collapsed) {
            for (const child of node.children) {
                node.renderNodeCount += this._updateNodeAfterCollapseChange(child, result);
            }
        }
        this._onDidChangeRenderNodeCount.fire(node);
        return node.renderNodeCount;
    }
    updateNodeAfterFilterChange(node) {
        const previousRenderNodeCount = node.renderNodeCount;
        const result = [];
        this._updateNodeAfterFilterChange(node, node.visible ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */, result);
        this._updateAncestorsRenderNodeCount(node.parent, result.length - previousRenderNodeCount);
        return result;
    }
    _updateNodeAfterFilterChange(node, parentVisibility, result, revealed = true) {
        let visibility;
        if (node !== this.root) {
            visibility = this._filterNode(node, parentVisibility);
            if (visibility === 0 /* TreeVisibility.Hidden */) {
                node.visible = false;
                node.renderNodeCount = 0;
                return false;
            }
            if (revealed) {
                result.push(node);
            }
        }
        const resultStartLength = result.length;
        node.renderNodeCount = node === this.root ? 0 : 1;
        let hasVisibleDescendants = false;
        if (!node.collapsed || visibility !== 0 /* TreeVisibility.Hidden */) {
            let visibleChildIndex = 0;
            for (const child of node.children) {
                hasVisibleDescendants =
                    this._updateNodeAfterFilterChange(child, visibility, result, revealed && !node.collapsed) || hasVisibleDescendants;
                if (child.visible) {
                    child.visibleChildIndex = visibleChildIndex++;
                }
            }
            node.visibleChildrenCount = visibleChildIndex;
        }
        else {
            node.visibleChildrenCount = 0;
        }
        if (node !== this.root) {
            node.visible =
                visibility === 2 /* TreeVisibility.Recurse */
                    ? hasVisibleDescendants
                    : visibility === 1 /* TreeVisibility.Visible */;
            node.visibility = visibility;
        }
        if (!node.visible) {
            node.renderNodeCount = 0;
            if (revealed) {
                result.pop();
            }
        }
        else if (!node.collapsed) {
            node.renderNodeCount += result.length - resultStartLength;
        }
        this._onDidChangeRenderNodeCount.fire(node);
        return node.visible;
    }
    _updateAncestorsRenderNodeCount(node, diff) {
        if (diff === 0) {
            return;
        }
        while (node) {
            node.renderNodeCount += diff;
            this._onDidChangeRenderNodeCount.fire(node);
            node = node.parent;
        }
    }
    _filterNode(node, parentVisibility) {
        const result = this.filter
            ? this.filter.filter(node.element, parentVisibility)
            : 1 /* TreeVisibility.Visible */;
        if (typeof result === 'boolean') {
            node.filterData = undefined;
            return result ? 1 /* TreeVisibility.Visible */ : 0 /* TreeVisibility.Hidden */;
        }
        else if (isFilterResult(result)) {
            node.filterData = result.data;
            return getVisibleState(result.visibility);
        }
        else {
            node.filterData = undefined;
            return getVisibleState(result);
        }
    }
    // cheap
    hasTreeNode(location, node = this.root) {
        if (!location || location.length === 0) {
            return true;
        }
        const [index, ...rest] = location;
        if (index < 0 || index > node.children.length) {
            return false;
        }
        return this.hasTreeNode(rest, node.children[index]);
    }
    // cheap
    getTreeNode(location, node = this.root) {
        if (!location || location.length === 0) {
            return node;
        }
        const [index, ...rest] = location;
        if (index < 0 || index > node.children.length) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        return this.getTreeNode(rest, node.children[index]);
    }
    // expensive
    getTreeNodeWithListIndex(location) {
        if (location.length === 0) {
            return { node: this.root, listIndex: -1, revealed: true, visible: false };
        }
        const { parentNode, listIndex, revealed, visible } = this.getParentNodeWithListIndex(location);
        const index = location[location.length - 1];
        if (index < 0 || index > parentNode.children.length) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        const node = parentNode.children[index];
        return { node, listIndex, revealed, visible: visible && node.visible };
    }
    getParentNodeWithListIndex(location, node = this.root, listIndex = 0, revealed = true, visible = true) {
        const [index, ...rest] = location;
        if (index < 0 || index > node.children.length) {
            throw new TreeError(this.user, 'Invalid tree location');
        }
        // TODO@joao perf!
        for (let i = 0; i < index; i++) {
            listIndex += node.children[i].renderNodeCount;
        }
        revealed = revealed && !node.collapsed;
        visible = visible && node.visible;
        if (rest.length === 0) {
            return { parentNode: node, listIndex, revealed, visible };
        }
        return this.getParentNodeWithListIndex(rest, node.children[index], listIndex + 1, revealed, visible);
    }
    getNode(location = []) {
        return this.getTreeNode(location);
    }
    // TODO@joao perf!
    getNodeLocation(node) {
        const location = [];
        let indexTreeNode = node; // typing woes
        while (indexTreeNode.parent) {
            location.push(indexTreeNode.parent.children.indexOf(indexTreeNode));
            indexTreeNode = indexTreeNode.parent;
        }
        return location.reverse();
    }
    getParentNodeLocation(location) {
        if (location.length === 0) {
            return undefined;
        }
        else if (location.length === 1) {
            return [];
        }
        else {
            return tail(location)[0];
        }
    }
    getFirstElementChild(location) {
        const node = this.getTreeNode(location);
        if (node.children.length === 0) {
            return undefined;
        }
        return node.children[0].element;
    }
    getLastElementAncestor(location = []) {
        const node = this.getTreeNode(location);
        if (node.children.length === 0) {
            return undefined;
        }
        return this._getLastElementAncestor(node);
    }
    _getLastElementAncestor(node) {
        if (node.children.length === 0) {
            return node.element;
        }
        return this._getLastElementAncestor(node.children[node.children.length - 1]);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhUcmVlTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS9pbmRleFRyZWVNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBU04sU0FBUyxHQUVULE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFpQnRELE1BQU0sVUFBVSxjQUFjLENBQUksR0FBUTtJQUN6QyxPQUFPLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxZQUFZLElBQUksR0FBRyxJQUFJLE1BQU0sSUFBSSxHQUFHLENBQUE7QUFDdkUsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsVUFBb0M7SUFDbkUsUUFBUSxVQUFVLEVBQUUsQ0FBQztRQUNwQixLQUFLLElBQUk7WUFDUixzQ0FBNkI7UUFDOUIsS0FBSyxLQUFLO1lBQ1QscUNBQTRCO1FBQzdCO1lBQ0MsT0FBTyxVQUFVLENBQUE7SUFDbkIsQ0FBQztBQUNGLENBQUM7QUFnREQsU0FBUyx3QkFBd0IsQ0FBQyxNQUEyQjtJQUM1RCxPQUFPLE9BQVEsTUFBYyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUE7QUFDeEQsQ0FBQztBQUVELE1BQU0sT0FBTyxjQUFjO0lBK0IxQixZQUNTLElBQVksRUFDcEIsV0FBYyxFQUNkLFVBQWtELEVBQUU7UUFGNUMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQTdCWixZQUFPLEdBQUcsRUFBRSxDQUFBO1FBR2Isa0JBQWEsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFBO1FBRTFCLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUF5QyxDQUFBO1FBQ2hGLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFFdkMsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQXVDLENBQUE7UUFDdEYsNkJBQXdCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQTtRQUV2RCw4QkFBeUIsR0FBRyxJQUFJLE9BQU8sRUFFckQsQ0FBQTtRQUNNLDZCQUF3QixHQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFbEQsZ0NBQTJCLEdBQUcsSUFBSSxPQUFPLEVBQTZCLENBQUE7UUFDOUUsK0JBQTBCLEdBQ2xDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQU9wRCxvQkFBZSxHQUFHLElBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBTzdELElBQUksQ0FBQyxpQkFBaUI7WUFDckIsT0FBTyxPQUFPLENBQUMsaUJBQWlCLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQTtRQUNyRixJQUFJLENBQUMsMEJBQTBCLEdBQUcsT0FBTyxDQUFDLDBCQUEwQixJQUFJLEtBQUssQ0FBQTtRQUM3RSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7UUFDNUIsSUFBSSxDQUFDLHdCQUF3QjtZQUM1QixPQUFPLE9BQU8sQ0FBQyx3QkFBd0IsS0FBSyxXQUFXO2dCQUN0RCxDQUFDLENBQUMsS0FBSztnQkFDUCxDQUFDLENBQUMsT0FBTyxDQUFDLHdCQUF3QixDQUFBO1FBRXBDLElBQUksQ0FBQyxJQUFJLEdBQUc7WUFDWCxNQUFNLEVBQUUsU0FBUztZQUNqQixPQUFPLEVBQUUsV0FBVztZQUNwQixRQUFRLEVBQUUsRUFBRTtZQUNaLEtBQUssRUFBRSxDQUFDO1lBQ1Isb0JBQW9CLEVBQUUsQ0FBQztZQUN2QixpQkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDckIsV0FBVyxFQUFFLEtBQUs7WUFDbEIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsZUFBZSxFQUFFLENBQUM7WUFDbEIsVUFBVSxnQ0FBd0I7WUFDbEMsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsU0FBUztTQUNyQixDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FDTCxRQUFrQixFQUNsQixXQUFtQixFQUNuQixXQUFzQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQ3RELFVBQXdELEVBQUU7UUFFMUQsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3pGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM1RCxDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsUUFBOEIsRUFDOUIsUUFBa0IsRUFDbEIsV0FBbUIsRUFDbkIsbUJBQThDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFDOUQsT0FBcUQsRUFDckQsYUFBYSxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQztRQUV0QyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDM0UsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sSUFBSSxHQUFHLElBQUksT0FBTyxDQUN2QixFQUFFLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBWSxFQUFFLEVBQzlDO1lBQ0MsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUNqQjtnQkFDQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7Z0JBQ3RDLEdBQUcsUUFBUTtnQkFDWCxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUM7YUFDakQsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ25ELENBQ0QsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFcEIsOERBQThEO1FBQzlELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLFVBQVUsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFBO1lBQ2xDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLGFBQWEsR0FBRyxDQUFDLFlBQW9CLEVBQUUsWUFBb0IsRUFBRSxLQUFhLEVBQUUsRUFBRTtZQUNuRixJQUFJLGFBQWEsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNoQyxZQUFZLEVBQUUsQ0FBQTtvQkFDZCxZQUFZLEVBQUUsQ0FBQTtvQkFDZCxJQUFJLENBQUMsV0FBVyxDQUNmLFFBQVEsRUFDUixDQUFDLEdBQUcsY0FBYyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsRUFDcEMsTUFBTSxDQUFDLGdCQUFnQixFQUN2QixRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxFQUMvQixPQUFPLEVBQ1AsYUFBYSxHQUFHLENBQUMsQ0FDakIsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxHQUFHLFdBQVcsQ0FBQyxDQUFBO1FBQzFFLElBQUksVUFBVSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDaEMsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDckYsYUFBYSxDQUNaLFVBQVUsRUFDVixVQUFVLEVBQ1YsVUFBVSxHQUFHLENBQUMsTUFBTSxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQzNELENBQUE7WUFDRCxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQTtZQUNqQyxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUE7WUFFekMsSUFBSSxDQUFDLFlBQVksQ0FDaEIsQ0FBQyxHQUFHLGNBQWMsRUFBRSxVQUFVLENBQUMsRUFDL0IsTUFBTSxDQUFDLGNBQWMsRUFDckIsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFVBQVUsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQ3hFLE9BQU8sQ0FDUCxDQUFBO1FBQ0YsQ0FBQztRQUVELHFGQUFxRjtRQUNyRixhQUFhLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRU8sWUFBWSxDQUNuQixRQUFrQixFQUNsQixXQUFtQixFQUNuQixXQUFzQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQ3RELEVBQ0MsZUFBZSxFQUNmLGVBQWUsRUFDZixvQkFBb0IsR0FDMEI7UUFFL0MsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5RixNQUFNLHdCQUF3QixHQUFnQyxFQUFFLENBQUE7UUFDaEUsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQzNELElBQUksQ0FBQyxjQUFjLENBQ2xCLEVBQUUsRUFDRixVQUFVLEVBQ1YsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdDQUF3QixDQUFDLDhCQUFzQixFQUNuRSxRQUFRLEVBQ1Isd0JBQXdCLEVBQ3hCLGVBQWUsQ0FDZixDQUNELENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUUvQyxtRUFBbUU7UUFDbkUsZUFBZTtRQUNmLElBQUksc0JBQXNCLEdBQUcsQ0FBQyxDQUFBO1FBRTlCLEtBQUssSUFBSSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkUsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVwQyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsc0JBQXNCLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFBO2dCQUNoRCxNQUFLO1lBQ04sQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBcUMsRUFBRSxDQUFBO1FBQzFELElBQUksNEJBQTRCLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUV2QixLQUFLLE1BQU0sS0FBSyxJQUFJLHFCQUFxQixFQUFFLENBQUM7WUFDM0MsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QixlQUFlLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQTtZQUV4QyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDbkIsS0FBSyxDQUFDLGlCQUFpQixHQUFHLHNCQUFzQixHQUFHLDRCQUE0QixFQUFFLENBQUE7WUFDbEYsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRXZGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxXQUFXLEdBQUcsU0FBUyxDQUFBO1FBQ25DLENBQUM7YUFBTSxJQUFJLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQ0wsVUFBVSxDQUFDLFdBQVcsRUFDdEIsU0FBUyxFQUNULFdBQVcsRUFDWCxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQzFFLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVUsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN0RCxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUNoRCxDQUFBO1FBQ0YsQ0FBQztRQUVELDJEQUEyRDtRQUMzRCxJQUFJLDJCQUEyQixHQUFHLENBQUMsQ0FBQTtRQUVuQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xDLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNuQiwyQkFBMkIsRUFBRSxDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBRUQsNkRBQTZEO1FBQzdELElBQUksMkJBQTJCLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxTQUFTLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDcEYsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFcEMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ25CLEtBQUssQ0FBQyxpQkFBaUIsSUFBSSwyQkFBMkIsQ0FBQTtnQkFDdkQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLFVBQVUsQ0FBQyxvQkFBb0IsSUFBSSw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQTtRQUU3RixJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ2hELE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBK0IsRUFBRSxFQUFFO2dCQUNqRCxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdCLENBQUMsQ0FBQTtZQUVELFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELElBQUksUUFBUSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FDN0MsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDMUQsQ0FBQyxDQUNELENBQUE7WUFFRCxJQUFJLENBQUMsK0JBQStCLENBQUMsVUFBVSxFQUFFLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFBO1lBQ3RGLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7Z0JBQ25DLEtBQUssRUFBRSxTQUFTO2dCQUNoQixXQUFXLEVBQUUsa0JBQWtCO2dCQUMvQixRQUFRLEVBQUUsd0JBQXdCO2FBQ2xDLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFBO1FBRTNFLElBQUksSUFBSSxHQUErQyxVQUFVLENBQUE7UUFFakUsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUNiLElBQUksSUFBSSxDQUFDLFVBQVUsbUNBQTJCLEVBQUUsQ0FBQztnQkFDaEQsc0RBQXNEO2dCQUN0RCxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDbkQsTUFBSztZQUNOLENBQUM7WUFFRCxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxRQUFrQjtRQUMxQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsTUFBTSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDeEQsQ0FBQztRQUVELE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU3RSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDNUYsQ0FBQztJQUNGLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFFRCxZQUFZLENBQUMsUUFBa0I7UUFDOUIsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hGLE9BQU8sT0FBTyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBa0I7UUFDcEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsYUFBYSxDQUFDLFFBQWtCO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxXQUFXLENBQUE7SUFDOUMsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUFrQixFQUFFLFdBQXFCO1FBQ3ZELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFdkMsSUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN4QyxXQUFXLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ2hDLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBMkIsRUFBRSxXQUFXLEVBQUUsQ0FBQTtRQUN0RCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUN2RixDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWtCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUE7SUFDNUMsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFrQixFQUFFLFNBQW1CLEVBQUUsU0FBbUI7UUFDeEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV2QyxJQUFJLE9BQU8sU0FBUyxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUF5QixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFBO1FBQ2pGLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxRQUFrQixFQUFFLE1BQTJCO1FBQ3hFLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUU3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFaEYsSUFDQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUk7WUFDbEIsSUFBSSxDQUFDLHdCQUF3QjtZQUM3QixNQUFNO1lBQ04sQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUM7WUFDakMsSUFBSSxDQUFDLFdBQVc7WUFDaEIsQ0FBQyxJQUFJLENBQUMsU0FBUztZQUNmLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFDaEIsQ0FBQztZQUNGLElBQUkscUJBQXFCLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFFOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRTlCLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNuQixJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7d0JBQ2hDLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxDQUFBO3dCQUMxQixNQUFLO29CQUNOLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxxQkFBcUIsR0FBRyxDQUFDLENBQUE7b0JBQzFCLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLHFCQUFxQixHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLHFCQUFxQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDckUsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyx5QkFBeUIsQ0FDaEMsSUFBb0MsRUFDcEMsU0FBaUIsRUFDakIsUUFBaUIsRUFDakIsTUFBMkI7UUFFM0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFOUQsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMzQyxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFFRCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7UUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3pELE1BQU0sV0FBVyxHQUFHLHVCQUF1QixHQUFHLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7WUFDbkMsS0FBSyxFQUFFLFNBQVMsR0FBRyxDQUFDO1lBQ3BCLFdBQVcsRUFBRSxXQUFXO1lBQ3hCLFFBQVEsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUMzQixDQUFDLENBQUE7UUFFRixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxxQkFBcUIsQ0FDNUIsSUFBb0MsRUFDcEMsTUFBMkIsRUFDM0IsSUFBYTtRQUViLElBQUksTUFBZSxDQUFBO1FBRW5CLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4QixNQUFNLEdBQUcsS0FBSyxDQUFBO1FBQ2YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQyxXQUFXLENBQUE7Z0JBQ2hELElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQTtZQUN0QyxDQUFDO2lCQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzlCLE1BQU0sR0FBRyxLQUFLLENBQUE7WUFDZixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQTtnQkFDNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFBO1lBQ2xDLENBQUM7WUFFRCxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNaLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDM0QsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25DLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3BDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFckMsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO2dCQUNsQixRQUFRLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFFakQsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3BCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUN6RSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFFBQVE7UUFDUCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFBO1FBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUQsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQztZQUNuQyxLQUFLLEVBQUUsQ0FBQztZQUNSLFdBQVcsRUFBRSx1QkFBdUI7WUFDcEMsUUFBUSxFQUFFLFFBQVE7U0FDbEIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRU8sY0FBYyxDQUNyQixXQUE0QixFQUM1QixNQUFzQyxFQUN0QyxnQkFBZ0MsRUFDaEMsUUFBaUIsRUFDakIsZ0JBQTZDLEVBQzdDLGVBQTJEO1FBRTNELE1BQU0sSUFBSSxHQUFtQztZQUM1QyxNQUFNO1lBQ04sT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPO1lBQzVCLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQztZQUN2QixvQkFBb0IsRUFBRSxDQUFDO1lBQ3ZCLGlCQUFpQixFQUFFLENBQUMsQ0FBQztZQUNyQixXQUFXLEVBQ1YsT0FBTyxXQUFXLENBQUMsV0FBVyxLQUFLLFNBQVM7Z0JBQzNDLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVztnQkFDekIsQ0FBQyxDQUFDLE9BQU8sV0FBVyxDQUFDLFNBQVMsS0FBSyxXQUFXO1lBQ2hELFNBQVMsRUFDUixPQUFPLFdBQVcsQ0FBQyxTQUFTLEtBQUssV0FBVztnQkFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUI7Z0JBQ3hCLENBQUMsQ0FBQyxXQUFXLENBQUMsU0FBUztZQUN6QixlQUFlLEVBQUUsQ0FBQztZQUNsQixVQUFVLGdDQUF3QjtZQUNsQyxPQUFPLEVBQUUsSUFBSTtZQUNiLFVBQVUsRUFBRSxTQUFTO1NBQ3JCLENBQUE7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBRTVCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQzlELE1BQU0sYUFBYSxHQUFHLFFBQVEsSUFBSSxVQUFVLGtDQUEwQixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQTtRQUV6RixJQUFJLG9CQUFvQixHQUFHLENBQUMsQ0FBQTtRQUM1QixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7UUFFdkIsS0FBSyxNQUFNLEVBQUUsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUNoQyxFQUFFLEVBQ0YsSUFBSSxFQUNKLFVBQVUsRUFDVixhQUFhLEVBQ2IsZ0JBQWdCLEVBQ2hCLGVBQWUsQ0FDZixDQUFBO1lBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDekIsZUFBZSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUE7WUFFeEMsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxvQkFBb0IsRUFBRSxDQUFBO1lBQ2pELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDaEUsQ0FBQztRQUVELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxvQkFBb0IsQ0FBQTtRQUNoRCxJQUFJLENBQUMsT0FBTztZQUNYLFVBQVUsbUNBQTJCO2dCQUNwQyxDQUFDLENBQUMsb0JBQW9CLEdBQUcsQ0FBQztnQkFDMUIsQ0FBQyxDQUFDLFVBQVUsbUNBQTJCLENBQUE7UUFFekMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtZQUV4QixJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNkLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ3ZCLENBQUM7UUFDRixDQUFDO2FBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFdkIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU8sNkJBQTZCLENBQ3BDLElBQW9DO1FBRXBDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUNwRCxNQUFNLE1BQU0sR0FBZ0MsRUFBRSxDQUFBO1FBRTlDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDakQsSUFBSSxDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyx1QkFBdUIsQ0FBQyxDQUFBO1FBRTFGLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLDhCQUE4QixDQUNyQyxJQUFvQyxFQUNwQyxNQUFtQztRQUVuQyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqQixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtRQUV4QixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3JCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDM0UsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBRU8sMkJBQTJCLENBQ2xDLElBQW9DO1FBRXBDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUNwRCxNQUFNLE1BQU0sR0FBZ0MsRUFBRSxDQUFBO1FBRTlDLElBQUksQ0FBQyw0QkFBNEIsQ0FDaEMsSUFBSSxFQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxnQ0FBd0IsQ0FBQyw4QkFBc0IsRUFDN0QsTUFBTSxDQUNOLENBQUE7UUFDRCxJQUFJLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLHVCQUF1QixDQUFDLENBQUE7UUFFMUYsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sNEJBQTRCLENBQ25DLElBQW9DLEVBQ3BDLGdCQUFnQyxFQUNoQyxNQUFtQyxFQUNuQyxRQUFRLEdBQUcsSUFBSTtRQUVmLElBQUksVUFBMEIsQ0FBQTtRQUU5QixJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEIsVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFFckQsSUFBSSxVQUFVLGtDQUEwQixFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO2dCQUNwQixJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQTtnQkFDeEIsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRWpELElBQUkscUJBQXFCLEdBQUcsS0FBSyxDQUFBO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLFVBQVcsa0NBQTBCLEVBQUUsQ0FBQztZQUM5RCxJQUFJLGlCQUFpQixHQUFHLENBQUMsQ0FBQTtZQUV6QixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDbkMscUJBQXFCO29CQUNwQixJQUFJLENBQUMsNEJBQTRCLENBQ2hDLEtBQUssRUFDTCxVQUFXLEVBQ1gsTUFBTSxFQUNOLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQzNCLElBQUkscUJBQXFCLENBQUE7Z0JBRTNCLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNuQixLQUFLLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDOUMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsaUJBQWlCLENBQUE7UUFDOUMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLE9BQU87Z0JBQ1gsVUFBVyxtQ0FBMkI7b0JBQ3JDLENBQUMsQ0FBQyxxQkFBcUI7b0JBQ3ZCLENBQUMsQ0FBQyxVQUFXLG1DQUEyQixDQUFBO1lBQzFDLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVyxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFBO1lBRXhCLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxlQUFlLElBQUksTUFBTSxDQUFDLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVPLCtCQUErQixDQUN0QyxJQUFnRCxFQUNoRCxJQUFZO1FBRVosSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFFRCxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUE7WUFDNUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzQyxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FDbEIsSUFBb0MsRUFDcEMsZ0JBQWdDO1FBRWhDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO1lBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDO1lBQ3BELENBQUMsK0JBQXVCLENBQUE7UUFFekIsSUFBSSxPQUFPLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtZQUMzQixPQUFPLE1BQU0sQ0FBQyxDQUFDLGdDQUF3QixDQUFDLDhCQUFzQixDQUFBO1FBQy9ELENBQUM7YUFBTSxJQUFJLGNBQWMsQ0FBYyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQTtZQUM3QixPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQTtZQUMzQixPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVE7SUFDQSxXQUFXLENBQ2xCLFFBQWtCLEVBQ2xCLE9BQXVDLElBQUksQ0FBQyxJQUFJO1FBRWhELElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFBO1FBRWpDLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsUUFBUTtJQUNBLFdBQVcsQ0FDbEIsUUFBa0IsRUFDbEIsT0FBdUMsSUFBSSxDQUFDLElBQUk7UUFFaEQsSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUE7UUFFakMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9DLE1BQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsWUFBWTtJQUNKLHdCQUF3QixDQUFDLFFBQWtCO1FBTWxELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFBO1FBQzFFLENBQUM7UUFFRCxNQUFNLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlGLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRTNDLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyRCxNQUFNLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUV2QyxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdkUsQ0FBQztJQUVPLDBCQUEwQixDQUNqQyxRQUFrQixFQUNsQixPQUF1QyxJQUFJLENBQUMsSUFBSSxFQUNoRCxZQUFvQixDQUFDLEVBQ3JCLFFBQVEsR0FBRyxJQUFJLEVBQ2YsT0FBTyxHQUFHLElBQUk7UUFPZCxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFBO1FBRWpDLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQyxNQUFNLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoQyxTQUFTLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUE7UUFDOUMsQ0FBQztRQUVELFFBQVEsR0FBRyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQ3RDLE9BQU8sR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUVqQyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUMxRCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQ3JDLElBQUksRUFDSixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUNwQixTQUFTLEdBQUcsQ0FBQyxFQUNiLFFBQVEsRUFDUixPQUFPLENBQ1AsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsV0FBcUIsRUFBRTtRQUM5QixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUVELGtCQUFrQjtJQUNsQixlQUFlLENBQUMsSUFBK0I7UUFDOUMsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFBO1FBQzdCLElBQUksYUFBYSxHQUFHLElBQXNDLENBQUEsQ0FBQyxjQUFjO1FBRXpFLE9BQU8sYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzdCLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7WUFDbkUsYUFBYSxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUE7UUFDckMsQ0FBQztRQUVELE9BQU8sUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxRQUFrQjtRQUN2QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQzthQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7YUFBTSxDQUFDO1lBQ1AsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFrQjtRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXZDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7SUFDaEMsQ0FBQztJQUVELHNCQUFzQixDQUFDLFdBQXFCLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUV2QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU8sdUJBQXVCLENBQUMsSUFBK0I7UUFDOUQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDcEIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3RSxDQUFDO0NBQ0QifQ==