/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getVisibleState, isFilterResult } from './indexTreeModel.js';
import { ObjectTreeModel, } from './objectTreeModel.js';
import { TreeError, WeakMapper, } from './tree.js';
import { equals } from '../../../common/arrays.js';
import { Event } from '../../../common/event.js';
import { Iterable } from '../../../common/iterator.js';
function noCompress(element) {
    const elements = [element.element];
    const incompressible = element.incompressible || false;
    return {
        element: { elements, incompressible },
        children: Iterable.map(Iterable.from(element.children), noCompress),
        collapsible: element.collapsible,
        collapsed: element.collapsed,
    };
}
// Exported only for test reasons, do not use directly
export function compress(element) {
    const elements = [element.element];
    const incompressible = element.incompressible || false;
    let childrenIterator;
    let children;
    while (true) {
        ;
        [children, childrenIterator] = Iterable.consume(Iterable.from(element.children), 2);
        if (children.length !== 1) {
            break;
        }
        if (children[0].incompressible) {
            break;
        }
        element = children[0];
        elements.push(element.element);
    }
    return {
        element: { elements, incompressible },
        children: Iterable.map(Iterable.concat(children, childrenIterator), compress),
        collapsible: element.collapsible,
        collapsed: element.collapsed,
    };
}
function _decompress(element, index = 0) {
    let children;
    if (index < element.element.elements.length - 1) {
        children = [_decompress(element, index + 1)];
    }
    else {
        children = Iterable.map(Iterable.from(element.children), (el) => _decompress(el, 0));
    }
    if (index === 0 && element.element.incompressible) {
        return {
            element: element.element.elements[index],
            children,
            incompressible: true,
            collapsible: element.collapsible,
            collapsed: element.collapsed,
        };
    }
    return {
        element: element.element.elements[index],
        children,
        collapsible: element.collapsible,
        collapsed: element.collapsed,
    };
}
// Exported only for test reasons, do not use directly
export function decompress(element) {
    return _decompress(element, 0);
}
function splice(treeElement, element, children) {
    if (treeElement.element === element) {
        return { ...treeElement, children };
    }
    return {
        ...treeElement,
        children: Iterable.map(Iterable.from(treeElement.children), (e) => splice(e, element, children)),
    };
}
const wrapIdentityProvider = (base) => ({
    getId(node) {
        return node.elements.map((e) => base.getId(e).toString()).join('\0');
    },
});
// Exported only for test reasons, do not use directly
export class CompressedObjectTreeModel {
    get onDidSpliceRenderedNodes() {
        return this.model.onDidSpliceRenderedNodes;
    }
    get onDidSpliceModel() {
        return this.model.onDidSpliceModel;
    }
    get onDidChangeCollapseState() {
        return this.model.onDidChangeCollapseState;
    }
    get onDidChangeRenderNodeCount() {
        return this.model.onDidChangeRenderNodeCount;
    }
    get size() {
        return this.nodes.size;
    }
    constructor(user, options = {}) {
        this.user = user;
        this.rootRef = null;
        this.nodes = new Map();
        this.model = new ObjectTreeModel(user, options);
        this.enabled =
            typeof options.compressionEnabled === 'undefined' ? true : options.compressionEnabled;
        this.identityProvider = options.identityProvider;
    }
    setChildren(element, children = Iterable.empty(), options) {
        // Diffs must be deep, since the compression can affect nested elements.
        // @see https://github.com/microsoft/vscode/pull/114237#issuecomment-759425034
        const diffIdentityProvider = options.diffIdentityProvider && wrapIdentityProvider(options.diffIdentityProvider);
        if (element === null) {
            const compressedChildren = Iterable.map(children, this.enabled ? compress : noCompress);
            this._setChildren(null, compressedChildren, { diffIdentityProvider, diffDepth: Infinity });
            return;
        }
        const compressedNode = this.nodes.get(element);
        if (!compressedNode) {
            throw new TreeError(this.user, 'Unknown compressed tree node');
        }
        const node = this.model.getNode(compressedNode);
        const compressedParentNode = this.model.getParentNodeLocation(compressedNode);
        const parent = this.model.getNode(compressedParentNode);
        const decompressedElement = decompress(node);
        const splicedElement = splice(decompressedElement, element, children);
        const recompressedElement = (this.enabled ? compress : noCompress)(splicedElement);
        // If the recompressed node is identical to the original, just set its children.
        // Saves work and churn diffing the parent element.
        const elementComparator = options.diffIdentityProvider
            ? (a, b) => options.diffIdentityProvider.getId(a) === options.diffIdentityProvider.getId(b)
            : undefined;
        if (equals(recompressedElement.element.elements, node.element.elements, elementComparator)) {
            this._setChildren(compressedNode, recompressedElement.children || Iterable.empty(), {
                diffIdentityProvider,
                diffDepth: 1,
            });
            return;
        }
        const parentChildren = parent.children.map((child) => child === node ? recompressedElement : child);
        this._setChildren(parent.element, parentChildren, {
            diffIdentityProvider,
            diffDepth: node.depth - parent.depth,
        });
    }
    isCompressionEnabled() {
        return this.enabled;
    }
    setCompressionEnabled(enabled) {
        if (enabled === this.enabled) {
            return;
        }
        this.enabled = enabled;
        const root = this.model.getNode();
        const rootChildren = root.children;
        const decompressedRootChildren = Iterable.map(rootChildren, decompress);
        const recompressedRootChildren = Iterable.map(decompressedRootChildren, enabled ? compress : noCompress);
        // it should be safe to always use deep diff mode here if an identity
        // provider is available, since we know the raw nodes are unchanged.
        this._setChildren(null, recompressedRootChildren, {
            diffIdentityProvider: this.identityProvider,
            diffDepth: Infinity,
        });
    }
    _setChildren(node, children, options) {
        const insertedElements = new Set();
        const onDidCreateNode = (node) => {
            for (const element of node.element.elements) {
                insertedElements.add(element);
                this.nodes.set(element, node.element);
            }
        };
        const onDidDeleteNode = (node) => {
            for (const element of node.element.elements) {
                if (!insertedElements.has(element)) {
                    this.nodes.delete(element);
                }
            }
        };
        this.model.setChildren(node, children, { ...options, onDidCreateNode, onDidDeleteNode });
    }
    has(element) {
        return this.nodes.has(element);
    }
    getListIndex(location) {
        const node = this.getCompressedNode(location);
        return this.model.getListIndex(node);
    }
    getListRenderCount(location) {
        const node = this.getCompressedNode(location);
        return this.model.getListRenderCount(node);
    }
    getNode(location) {
        if (typeof location === 'undefined') {
            return this.model.getNode();
        }
        const node = this.getCompressedNode(location);
        return this.model.getNode(node);
    }
    // TODO: review this
    getNodeLocation(node) {
        const compressedNode = this.model.getNodeLocation(node);
        if (compressedNode === null) {
            return null;
        }
        return compressedNode.elements[compressedNode.elements.length - 1];
    }
    // TODO: review this
    getParentNodeLocation(location) {
        const compressedNode = this.getCompressedNode(location);
        const parentNode = this.model.getParentNodeLocation(compressedNode);
        if (parentNode === null) {
            return null;
        }
        return parentNode.elements[parentNode.elements.length - 1];
    }
    getFirstElementChild(location) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.getFirstElementChild(compressedNode);
    }
    getLastElementAncestor(location) {
        const compressedNode = typeof location === 'undefined' ? undefined : this.getCompressedNode(location);
        return this.model.getLastElementAncestor(compressedNode);
    }
    isCollapsible(location) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.isCollapsible(compressedNode);
    }
    setCollapsible(location, collapsible) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.setCollapsible(compressedNode, collapsible);
    }
    isCollapsed(location) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.isCollapsed(compressedNode);
    }
    setCollapsed(location, collapsed, recursive) {
        const compressedNode = this.getCompressedNode(location);
        return this.model.setCollapsed(compressedNode, collapsed, recursive);
    }
    expandTo(location) {
        const compressedNode = this.getCompressedNode(location);
        this.model.expandTo(compressedNode);
    }
    rerender(location) {
        const compressedNode = this.getCompressedNode(location);
        this.model.rerender(compressedNode);
    }
    refilter() {
        this.model.refilter();
    }
    resort(location = null, recursive = true) {
        const compressedNode = this.getCompressedNode(location);
        this.model.resort(compressedNode, recursive);
    }
    getCompressedNode(element) {
        if (element === null) {
            return null;
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        return node;
    }
}
export const DefaultElementMapper = (elements) => elements[elements.length - 1];
class CompressedTreeNodeWrapper {
    get element() {
        return this.node.element === null ? null : this.unwrapper(this.node.element);
    }
    get children() {
        return this.node.children.map((node) => new CompressedTreeNodeWrapper(this.unwrapper, node));
    }
    get depth() {
        return this.node.depth;
    }
    get visibleChildrenCount() {
        return this.node.visibleChildrenCount;
    }
    get visibleChildIndex() {
        return this.node.visibleChildIndex;
    }
    get collapsible() {
        return this.node.collapsible;
    }
    get collapsed() {
        return this.node.collapsed;
    }
    get visible() {
        return this.node.visible;
    }
    get filterData() {
        return this.node.filterData;
    }
    constructor(unwrapper, node) {
        this.unwrapper = unwrapper;
        this.node = node;
    }
}
function mapOptions(compressedNodeUnwrapper, options) {
    return {
        ...options,
        identityProvider: options.identityProvider && {
            getId(node) {
                return options.identityProvider.getId(compressedNodeUnwrapper(node));
            },
        },
        sorter: options.sorter && {
            compare(node, otherNode) {
                return options.sorter.compare(node.elements[0], otherNode.elements[0]);
            },
        },
        filter: options.filter && {
            filter(node, parentVisibility) {
                const elements = node.elements;
                for (let i = 0; i < elements.length - 1; i++) {
                    const result = options.filter.filter(elements[i], parentVisibility);
                    parentVisibility = getVisibleState(isFilterResult(result) ? result.visibility : result);
                }
                return options.filter.filter(elements[elements.length - 1], parentVisibility);
            },
        },
    };
}
export class CompressibleObjectTreeModel {
    get onDidSpliceModel() {
        return Event.map(this.model.onDidSpliceModel, ({ insertedNodes, deletedNodes }) => ({
            insertedNodes: insertedNodes.map((node) => this.nodeMapper.map(node)),
            deletedNodes: deletedNodes.map((node) => this.nodeMapper.map(node)),
        }));
    }
    get onDidSpliceRenderedNodes() {
        return Event.map(this.model.onDidSpliceRenderedNodes, ({ start, deleteCount, elements }) => ({
            start,
            deleteCount,
            elements: elements.map((node) => this.nodeMapper.map(node)),
        }));
    }
    get onDidChangeCollapseState() {
        return Event.map(this.model.onDidChangeCollapseState, ({ node, deep }) => ({
            node: this.nodeMapper.map(node),
            deep,
        }));
    }
    get onDidChangeRenderNodeCount() {
        return Event.map(this.model.onDidChangeRenderNodeCount, (node) => this.nodeMapper.map(node));
    }
    constructor(user, options = {}) {
        this.rootRef = null;
        this.elementMapper = options.elementMapper || DefaultElementMapper;
        const compressedNodeUnwrapper = (node) => this.elementMapper(node.elements);
        this.nodeMapper = new WeakMapper((node) => new CompressedTreeNodeWrapper(compressedNodeUnwrapper, node));
        this.model = new CompressedObjectTreeModel(user, mapOptions(compressedNodeUnwrapper, options));
    }
    setChildren(element, children = Iterable.empty(), options = {}) {
        this.model.setChildren(element, children, options);
    }
    isCompressionEnabled() {
        return this.model.isCompressionEnabled();
    }
    setCompressionEnabled(enabled) {
        this.model.setCompressionEnabled(enabled);
    }
    has(location) {
        return this.model.has(location);
    }
    getListIndex(location) {
        return this.model.getListIndex(location);
    }
    getListRenderCount(location) {
        return this.model.getListRenderCount(location);
    }
    getNode(location) {
        return this.nodeMapper.map(this.model.getNode(location));
    }
    getNodeLocation(node) {
        return node.element;
    }
    getParentNodeLocation(location) {
        return this.model.getParentNodeLocation(location);
    }
    getFirstElementChild(location) {
        const result = this.model.getFirstElementChild(location);
        if (result === null || typeof result === 'undefined') {
            return result;
        }
        return this.elementMapper(result.elements);
    }
    getLastElementAncestor(location) {
        const result = this.model.getLastElementAncestor(location);
        if (result === null || typeof result === 'undefined') {
            return result;
        }
        return this.elementMapper(result.elements);
    }
    isCollapsible(location) {
        return this.model.isCollapsible(location);
    }
    setCollapsible(location, collapsed) {
        return this.model.setCollapsible(location, collapsed);
    }
    isCollapsed(location) {
        return this.model.isCollapsed(location);
    }
    setCollapsed(location, collapsed, recursive) {
        return this.model.setCollapsed(location, collapsed, recursive);
    }
    expandTo(location) {
        return this.model.expandTo(location);
    }
    rerender(location) {
        return this.model.rerender(location);
    }
    refilter() {
        return this.model.refilter();
    }
    resort(element = null, recursive = true) {
        return this.model.resort(element, recursive);
    }
    getCompressedTreeNode(location = null) {
        return this.model.getNode(location);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHJlc3NlZE9iamVjdFRyZWVNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL2NvbXByZXNzZWRPYmplY3RUcmVlTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBZ0MsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDbkcsT0FBTyxFQUlOLGVBQWUsR0FDZixNQUFNLHNCQUFzQixDQUFBO0FBQzdCLE9BQU8sRUFPTixTQUFTLEVBR1QsVUFBVSxHQUNWLE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBY3RELFNBQVMsVUFBVSxDQUNsQixPQUFrQztJQUVsQyxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNsQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQTtJQUV0RCxPQUFPO1FBQ04sT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRTtRQUNyQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUM7UUFDbkUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1FBQ2hDLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztLQUM1QixDQUFBO0FBQ0YsQ0FBQztBQUVELHNEQUFzRDtBQUN0RCxNQUFNLFVBQVUsUUFBUSxDQUN2QixPQUFrQztJQUVsQyxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNsQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLEtBQUssQ0FBQTtJQUV0RCxJQUFJLGdCQUFxRCxDQUFBO0lBQ3pELElBQUksUUFBcUMsQ0FBQTtJQUV6QyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUFBLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVwRixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsTUFBSztRQUNOLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNoQyxNQUFLO1FBQ04sQ0FBQztRQUVELE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckIsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFO1FBQ3JDLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsUUFBUSxDQUFDO1FBQzdFLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztRQUNoQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7S0FDNUIsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLFdBQVcsQ0FDbkIsT0FBdUQsRUFDdkQsS0FBSyxHQUFHLENBQUM7SUFFVCxJQUFJLFFBQTZDLENBQUE7SUFFakQsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2pELFFBQVEsR0FBRyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDN0MsQ0FBQztTQUFNLENBQUM7UUFDUCxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNuRCxPQUFPO1lBQ04sT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUN4QyxRQUFRO1lBQ1IsY0FBYyxFQUFFLElBQUk7WUFDcEIsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQ2hDLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztTQUM1QixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQ3hDLFFBQVE7UUFDUixXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7UUFDaEMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO0tBQzVCLENBQUE7QUFDRixDQUFDO0FBRUQsc0RBQXNEO0FBQ3RELE1BQU0sVUFBVSxVQUFVLENBQ3pCLE9BQXVEO0lBRXZELE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUMvQixDQUFDO0FBRUQsU0FBUyxNQUFNLENBQ2QsV0FBc0MsRUFDdEMsT0FBVSxFQUNWLFFBQTZDO0lBRTdDLElBQUksV0FBVyxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNyQyxPQUFPLEVBQUUsR0FBRyxXQUFXLEVBQUUsUUFBUSxFQUFFLENBQUE7SUFDcEMsQ0FBQztJQUVELE9BQU87UUFDTixHQUFHLFdBQVc7UUFDZCxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ2pFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUM1QjtLQUNELENBQUE7QUFDRixDQUFDO0FBT0QsTUFBTSxvQkFBb0IsR0FBRyxDQUM1QixJQUEwQixFQUNrQixFQUFFLENBQUMsQ0FBQztJQUNoRCxLQUFLLENBQUMsSUFBSTtRQUNULE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDckUsQ0FBQztDQUNELENBQUMsQ0FBQTtBQUVGLHNEQUFzRDtBQUN0RCxNQUFNLE9BQU8seUJBQXlCO0lBT3JDLElBQUksd0JBQXdCO1FBRzNCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFBO0lBQ25DLENBQUM7SUFDRCxJQUFJLHdCQUF3QjtRQUczQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUE7SUFDM0MsQ0FBQztJQUNELElBQUksMEJBQTBCO1FBQzdCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQTtJQUM3QyxDQUFDO0lBT0QsSUFBSSxJQUFJO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0lBRUQsWUFDUyxJQUFZLEVBQ3BCLFVBQTZELEVBQUU7UUFEdkQsU0FBSSxHQUFKLElBQUksQ0FBUTtRQTdCWixZQUFPLEdBQUcsSUFBSSxDQUFBO1FBb0JmLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBb0MsQ0FBQTtRQVkxRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsT0FBTztZQUNYLE9BQU8sT0FBTyxDQUFDLGtCQUFrQixLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUE7UUFDdEYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsV0FBVyxDQUNWLE9BQWlCLEVBQ2pCLFdBQWdELFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFDaEUsT0FBMkQ7UUFFM0Qsd0VBQXdFO1FBQ3hFLDhFQUE4RTtRQUU5RSxNQUFNLG9CQUFvQixHQUN6QixPQUFPLENBQUMsb0JBQW9CLElBQUksb0JBQW9CLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDbkYsSUFBSSxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDdEIsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3ZGLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDMUYsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUU5QyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLDhCQUE4QixDQUFDLENBQUE7UUFDL0QsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FHN0MsQ0FBQTtRQUNELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUM3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FHckQsQ0FBQTtRQUVELE1BQU0sbUJBQW1CLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDckUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFbEYsZ0ZBQWdGO1FBQ2hGLG1EQUFtRDtRQUNuRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0I7WUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBSSxFQUFFLENBQUksRUFBRSxFQUFFLENBQ2YsT0FBTyxDQUFDLG9CQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsb0JBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNuRixDQUFDLENBQUMsU0FBUyxDQUFBO1FBQ1osSUFBSSxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDNUYsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDbkYsb0JBQW9CO2dCQUNwQixTQUFTLEVBQUUsQ0FBQzthQUNaLENBQUMsQ0FBQTtZQUNGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNwRCxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUM1QyxDQUFBO1FBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRTtZQUNqRCxvQkFBb0I7WUFDcEIsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUs7U0FDcEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELHFCQUFxQixDQUFDLE9BQWdCO1FBQ3JDLElBQUksT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM5QixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFBO1FBRXRCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDakMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQStDLENBQUE7UUFDekUsTUFBTSx3QkFBd0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUN2RSxNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQzVDLHdCQUF3QixFQUN4QixPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUMvQixDQUFBO1FBRUQscUVBQXFFO1FBQ3JFLG9FQUFvRTtRQUNwRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRCxvQkFBb0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1lBQzNDLFNBQVMsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxZQUFZLENBQ25CLElBQW1DLEVBQ25DLFFBQThELEVBQzlELE9BQTBFO1FBRTFFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQVksQ0FBQTtRQUM1QyxNQUFNLGVBQWUsR0FBRyxDQUFDLElBQW9ELEVBQUUsRUFBRTtZQUNoRixLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzdDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN0QyxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxJQUFvRCxFQUFFLEVBQUU7WUFDaEYsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRUQsR0FBRyxDQUFDLE9BQWlCO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFrQjtRQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDN0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsa0JBQWtCLENBQUMsUUFBa0I7UUFDcEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzdDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQStCO1FBQ3RDLElBQUksT0FBTyxRQUFRLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDckMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDN0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsb0JBQW9CO0lBQ3BCLGVBQWUsQ0FBQyxJQUFvRDtRQUNuRSxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUV2RCxJQUFJLGNBQWMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkUsQ0FBQztJQUVELG9CQUFvQjtJQUNwQixxQkFBcUIsQ0FBQyxRQUFrQjtRQUN2QyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUVuRSxJQUFJLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQztJQUVELG9CQUFvQixDQUFDLFFBQWtCO1FBQ3RDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2RCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVELHNCQUFzQixDQUNyQixRQUErQjtRQUUvQixNQUFNLGNBQWMsR0FDbkIsT0FBTyxRQUFRLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELGFBQWEsQ0FBQyxRQUFrQjtRQUMvQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNoRCxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWtCLEVBQUUsV0FBcUI7UUFDdkQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQzlELENBQUM7SUFFRCxXQUFXLENBQUMsUUFBa0I7UUFDN0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVELFlBQVksQ0FDWCxRQUFrQixFQUNsQixTQUErQixFQUMvQixTQUErQjtRQUUvQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxRQUFRO1FBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN0QixDQUFDO0lBRUQsTUFBTSxDQUFDLFdBQXFCLElBQUksRUFBRSxTQUFTLEdBQUcsSUFBSTtRQUNqRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxPQUFpQjtRQUNsQyxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVwQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWCxNQUFNLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDckUsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEO0FBS0QsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQXVCLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtBQVFuRyxNQUFNLHlCQUF5QjtJQUM5QixJQUFJLE9BQU87UUFDVixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDN0UsQ0FBQztJQUNELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBQ0QsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUN2QixDQUFDO0lBQ0QsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFBO0lBQ3RDLENBQUM7SUFDRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUE7SUFDbkMsQ0FBQztJQUNELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDN0IsQ0FBQztJQUNELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDM0IsQ0FBQztJQUNELElBQUksT0FBTztRQUNWLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDekIsQ0FBQztJQUNELElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDNUIsQ0FBQztJQUVELFlBQ1MsU0FBcUMsRUFDckMsSUFBMkQ7UUFEM0QsY0FBUyxHQUFULFNBQVMsQ0FBNEI7UUFDckMsU0FBSSxHQUFKLElBQUksQ0FBdUQ7SUFDakUsQ0FBQztDQUNKO0FBRUQsU0FBUyxVQUFVLENBQ2xCLHVCQUFtRCxFQUNuRCxPQUE0RDtJQUU1RCxPQUFPO1FBQ04sR0FBRyxPQUFPO1FBQ1YsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixJQUFJO1lBQzdDLEtBQUssQ0FBQyxJQUE0QjtnQkFDakMsT0FBTyxPQUFPLENBQUMsZ0JBQWlCLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDdEUsQ0FBQztTQUNEO1FBQ0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLElBQUk7WUFDekIsT0FBTyxDQUFDLElBQTRCLEVBQUUsU0FBaUM7Z0JBQ3RFLE9BQU8sT0FBTyxDQUFDLE1BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEUsQ0FBQztTQUNEO1FBQ0QsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLElBQUk7WUFDekIsTUFBTSxDQUNMLElBQTRCLEVBQzVCLGdCQUFnQztnQkFFaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQTtnQkFDOUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzlDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO29CQUNwRSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDeEYsQ0FBQztnQkFDRCxPQUFPLE9BQU8sQ0FBQyxNQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDL0UsQ0FBQztTQUNEO0tBQ0QsQ0FBQTtBQUNGLENBQUM7QUFRRCxNQUFNLE9BQU8sMkJBQTJCO0lBT3ZDLElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUMsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbkYsYUFBYSxFQUFFLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JFLFlBQVksRUFBRSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUM1RixLQUFLO1lBQ0wsV0FBVztZQUNYLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMzRCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzFFLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDL0IsSUFBSTtTQUNKLENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztJQUVELElBQUksMEJBQTBCO1FBQzdCLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFNRCxZQUFZLElBQVksRUFBRSxVQUErRCxFQUFFO1FBaENsRixZQUFPLEdBQUcsSUFBSSxDQUFBO1FBaUN0QixJQUFJLENBQUMsYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLElBQUksb0JBQW9CLENBQUE7UUFDbEUsTUFBTSx1QkFBdUIsR0FBK0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksVUFBVSxDQUMvQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsQ0FDdEUsQ0FBQTtRQUVELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVELFdBQVcsQ0FDVixPQUFpQixFQUNqQixXQUFnRCxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQ2hFLFVBQThELEVBQUU7UUFFaEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNuRCxDQUFDO0lBRUQsb0JBQW9CO1FBQ25CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBQ3pDLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxPQUFnQjtRQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxHQUFHLENBQUMsUUFBa0I7UUFDckIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsWUFBWSxDQUFDLFFBQWtCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELGtCQUFrQixDQUFDLFFBQWtCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQStCO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsZUFBZSxDQUFDLElBQThCO1FBQzdDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRUQscUJBQXFCLENBQUMsUUFBa0I7UUFDdkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFrQjtRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRXhELElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN0RCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxRQUErQjtRQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTFELElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUN0RCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxhQUFhLENBQUMsUUFBa0I7UUFDL0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQWtCLEVBQUUsU0FBbUI7UUFDckQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDdEQsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUFrQjtRQUM3QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3hDLENBQUM7SUFFRCxZQUFZLENBQ1gsUUFBa0IsRUFDbEIsU0FBK0IsRUFDL0IsU0FBK0I7UUFFL0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQy9ELENBQUM7SUFFRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsUUFBUSxDQUFDLFFBQWtCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUE7SUFDN0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxVQUFvQixJQUFJLEVBQUUsU0FBUyxHQUFHLElBQUk7UUFDaEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUVELHFCQUFxQixDQUNwQixXQUFxQixJQUFJO1FBRXpCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDcEMsQ0FBQztDQUNEIn0=