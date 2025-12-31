/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IndexTreeModel, } from './indexTreeModel.js';
import { ObjectTreeElementCollapseState, TreeError, } from './tree.js';
import { Iterable } from '../../../common/iterator.js';
export class ObjectTreeModel {
    get size() {
        return this.nodes.size;
    }
    constructor(user, options = {}) {
        this.user = user;
        this.rootRef = null;
        this.nodes = new Map();
        this.nodesByIdentity = new Map();
        this.model = new IndexTreeModel(user, null, options);
        this.onDidSpliceModel = this.model.onDidSpliceModel;
        this.onDidSpliceRenderedNodes = this.model.onDidSpliceRenderedNodes;
        this.onDidChangeCollapseState = this.model.onDidChangeCollapseState;
        this.onDidChangeRenderNodeCount = this.model.onDidChangeRenderNodeCount;
        if (options.sorter) {
            this.sorter = {
                compare(a, b) {
                    return options.sorter.compare(a.element, b.element);
                },
            };
        }
        this.identityProvider = options.identityProvider;
    }
    setChildren(element, children = Iterable.empty(), options = {}) {
        const location = this.getElementLocation(element);
        this._setChildren(location, this.preserveCollapseState(children), options);
    }
    _setChildren(location, children = Iterable.empty(), options) {
        const insertedElements = new Set();
        const insertedElementIds = new Set();
        const onDidCreateNode = (node) => {
            if (node.element === null) {
                return;
            }
            const tnode = node;
            insertedElements.add(tnode.element);
            this.nodes.set(tnode.element, tnode);
            if (this.identityProvider) {
                const id = this.identityProvider.getId(tnode.element).toString();
                insertedElementIds.add(id);
                this.nodesByIdentity.set(id, tnode);
            }
            options.onDidCreateNode?.(tnode);
        };
        const onDidDeleteNode = (node) => {
            if (node.element === null) {
                return;
            }
            const tnode = node;
            if (!insertedElements.has(tnode.element)) {
                this.nodes.delete(tnode.element);
            }
            if (this.identityProvider) {
                const id = this.identityProvider.getId(tnode.element).toString();
                if (!insertedElementIds.has(id)) {
                    this.nodesByIdentity.delete(id);
                }
            }
            options.onDidDeleteNode?.(tnode);
        };
        this.model.splice([...location, 0], Number.MAX_VALUE, children, {
            ...options,
            onDidCreateNode,
            onDidDeleteNode,
        });
    }
    preserveCollapseState(elements = Iterable.empty()) {
        if (this.sorter) {
            elements = [...elements].sort(this.sorter.compare.bind(this.sorter));
        }
        return Iterable.map(elements, (treeElement) => {
            let node = this.nodes.get(treeElement.element);
            if (!node && this.identityProvider) {
                const id = this.identityProvider.getId(treeElement.element).toString();
                node = this.nodesByIdentity.get(id);
            }
            if (!node) {
                let collapsed;
                if (typeof treeElement.collapsed === 'undefined') {
                    collapsed = undefined;
                }
                else if (treeElement.collapsed === ObjectTreeElementCollapseState.Collapsed ||
                    treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrCollapsed) {
                    collapsed = true;
                }
                else if (treeElement.collapsed === ObjectTreeElementCollapseState.Expanded ||
                    treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrExpanded) {
                    collapsed = false;
                }
                else {
                    collapsed = Boolean(treeElement.collapsed);
                }
                return {
                    ...treeElement,
                    children: this.preserveCollapseState(treeElement.children),
                    collapsed,
                };
            }
            const collapsible = typeof treeElement.collapsible === 'boolean' ? treeElement.collapsible : node.collapsible;
            let collapsed;
            if (typeof treeElement.collapsed === 'undefined' ||
                treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrCollapsed ||
                treeElement.collapsed === ObjectTreeElementCollapseState.PreserveOrExpanded) {
                collapsed = node.collapsed;
            }
            else if (treeElement.collapsed === ObjectTreeElementCollapseState.Collapsed) {
                collapsed = true;
            }
            else if (treeElement.collapsed === ObjectTreeElementCollapseState.Expanded) {
                collapsed = false;
            }
            else {
                collapsed = Boolean(treeElement.collapsed);
            }
            return {
                ...treeElement,
                collapsible,
                collapsed,
                children: this.preserveCollapseState(treeElement.children),
            };
        });
    }
    rerender(element) {
        const location = this.getElementLocation(element);
        this.model.rerender(location);
    }
    resort(element = null, recursive = true) {
        if (!this.sorter) {
            return;
        }
        const location = this.getElementLocation(element);
        const node = this.model.getNode(location);
        this._setChildren(location, this.resortChildren(node, recursive), {});
    }
    resortChildren(node, recursive, first = true) {
        let childrenNodes = [...node.children];
        if (recursive || first) {
            childrenNodes = childrenNodes.sort(this.sorter.compare.bind(this.sorter));
        }
        return Iterable.map(childrenNodes, (node) => ({
            element: node.element,
            collapsible: node.collapsible,
            collapsed: node.collapsed,
            children: this.resortChildren(node, recursive, false),
        }));
    }
    getFirstElementChild(ref = null) {
        const location = this.getElementLocation(ref);
        return this.model.getFirstElementChild(location);
    }
    getLastElementAncestor(ref = null) {
        const location = this.getElementLocation(ref);
        return this.model.getLastElementAncestor(location);
    }
    has(element) {
        return this.nodes.has(element);
    }
    getListIndex(element) {
        const location = this.getElementLocation(element);
        return this.model.getListIndex(location);
    }
    getListRenderCount(element) {
        const location = this.getElementLocation(element);
        return this.model.getListRenderCount(location);
    }
    isCollapsible(element) {
        const location = this.getElementLocation(element);
        return this.model.isCollapsible(location);
    }
    setCollapsible(element, collapsible) {
        const location = this.getElementLocation(element);
        return this.model.setCollapsible(location, collapsible);
    }
    isCollapsed(element) {
        const location = this.getElementLocation(element);
        return this.model.isCollapsed(location);
    }
    setCollapsed(element, collapsed, recursive) {
        const location = this.getElementLocation(element);
        return this.model.setCollapsed(location, collapsed, recursive);
    }
    expandTo(element) {
        const location = this.getElementLocation(element);
        this.model.expandTo(location);
    }
    refilter() {
        this.model.refilter();
    }
    getNode(element = null) {
        if (element === null) {
            return this.model.getNode(this.model.rootRef);
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        return node;
    }
    getNodeLocation(node) {
        return node.element;
    }
    getParentNodeLocation(element) {
        if (element === null) {
            throw new TreeError(this.user, `Invalid getParentNodeLocation call`);
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        const location = this.model.getNodeLocation(node);
        const parentLocation = this.model.getParentNodeLocation(location);
        const parent = this.model.getNode(parentLocation);
        return parent.element;
    }
    getElementLocation(element) {
        if (element === null) {
            return [];
        }
        const node = this.nodes.get(element);
        if (!node) {
            throw new TreeError(this.user, `Tree element not found: ${element}`);
        }
        return this.model.getNodeLocation(node);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0VHJlZU1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RyZWUvb2JqZWN0VHJlZU1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFHTixjQUFjLEdBQ2QsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBU04sOEJBQThCLEVBQzlCLFNBQVMsR0FDVCxNQUFNLFdBQVcsQ0FBQTtBQUVsQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUF5QnRELE1BQU0sT0FBTyxlQUFlO0lBa0IzQixJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7SUFFRCxZQUNTLElBQVksRUFDcEIsVUFBbUQsRUFBRTtRQUQ3QyxTQUFJLEdBQUosSUFBSSxDQUFRO1FBbEJaLFlBQU8sR0FBRyxJQUFJLENBQUE7UUFHZixVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUE7UUFDN0Msb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBcUMsQ0FBQTtRQWlCOUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFBO1FBQ25ELElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFBO1FBQ25FLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHdCQUUxQyxDQUFBO1FBQ0QsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsMEJBRTVDLENBQUE7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