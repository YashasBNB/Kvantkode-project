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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0VHJlZU1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS9vYmplY3RUcmVlTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUdOLGNBQWMsR0FDZCxNQUFNLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFTTiw4QkFBOEIsRUFDOUIsU0FBUyxHQUNULE1BQU0sV0FBVyxDQUFBO0FBRWxCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQXlCdEQsTUFBTSxPQUFPLGVBQWU7SUFrQjNCLElBQUksSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFDdkIsQ0FBQztJQUVELFlBQ1MsSUFBWSxFQUNwQixVQUFtRCxFQUFFO1FBRDdDLFNBQUksR0FBSixJQUFJLENBQVE7UUFsQlosWUFBTyxHQUFHLElBQUksQ0FBQTtRQUdmLFVBQUssR0FBRyxJQUFJLEdBQUcsRUFBdUMsQ0FBQTtRQUM3QyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO1FBaUI5RSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksY0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUE7UUFDbkQsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUE7UUFDbkUsSUFBSSxDQUFDLHdCQUF3QixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBRTFDLENBQUE7UUFDRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQywwQkFFNUMs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