/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractTree } from './abstractTree.js';
import { ObjectTreeModel } from './objectTreeModel.js';
import { TreeError, } from './tree.js';
import { Iterable } from '../../../common/iterator.js';
export class DataTree extends AbstractTree {
    constructor(user, container, delegate, renderers, dataSource, options = {}) {
        super(user, container, delegate, renderers, options);
        this.user = user;
        this.dataSource = dataSource;
        this.nodesByIdentity = new Map();
        this.identityProvider = options.identityProvider;
    }
    // Model
    getInput() {
        return this.input;
    }
    setInput(input, viewState) {
        if (viewState && !this.identityProvider) {
            throw new TreeError(this.user, "Can't restore tree view state without an identity provider");
        }
        this.input = input;
        if (!input) {
            this.nodesByIdentity.clear();
            this.model.setChildren(null, Iterable.empty());
            return;
        }
        if (!viewState) {
            this._refresh(input);
            return;
        }
        const focus = [];
        const selection = [];
        const isCollapsed = (element) => {
            const id = this.identityProvider.getId(element).toString();
            return !viewState.expanded[id];
        };
        const onDidCreateNode = (node) => {
            const id = this.identityProvider.getId(node.element).toString();
            if (viewState.focus.has(id)) {
                focus.push(node.element);
            }
            if (viewState.selection.has(id)) {
                selection.push(node.element);
            }
        };
        this._refresh(input, isCollapsed, onDidCreateNode);
        this.setFocus(focus);
        this.setSelection(selection);
        if (viewState && typeof viewState.scrollTop === 'number') {
            this.scrollTop = viewState.scrollTop;
        }
    }
    updateChildren(element = this.input) {
        if (typeof this.input === 'undefined') {
            throw new TreeError(this.user, 'Tree input not set');
        }
        let isCollapsed;
        if (this.identityProvider) {
            isCollapsed = (element) => {
                const id = this.identityProvider.getId(element).toString();
                const node = this.nodesByIdentity.get(id);
                if (!node) {
                    return undefined;
                }
                return node.collapsed;
            };
        }
        this._refresh(element, isCollapsed);
    }
    resort(element = this.input, recursive = true) {
        this.model.resort((element === this.input ? null : element), recursive);
    }
    // View
    refresh(element) {
        if (element === undefined) {
            this.view.rerender();
            return;
        }
        this.model.rerender(element);
    }
    // Implementation
    _refresh(element, isCollapsed, onDidCreateNode) {
        let onDidDeleteNode;
        if (this.identityProvider) {
            const insertedElements = new Set();
            const outerOnDidCreateNode = onDidCreateNode;
            onDidCreateNode = (node) => {
                const id = this.identityProvider.getId(node.element).toString();
                insertedElements.add(id);
                this.nodesByIdentity.set(id, node);
                outerOnDidCreateNode?.(node);
            };
            onDidDeleteNode = (node) => {
                const id = this.identityProvider.getId(node.element).toString();
                if (!insertedElements.has(id)) {
                    this.nodesByIdentity.delete(id);
                }
            };
        }
        this.model.setChildren((element === this.input ? null : element), this.iterate(element, isCollapsed).elements, { onDidCreateNode, onDidDeleteNode });
    }
    iterate(element, isCollapsed) {
        const children = [...this.dataSource.getChildren(element)];
        const elements = Iterable.map(children, (element) => {
            const { elements: children, size } = this.iterate(element, isCollapsed);
            const collapsible = this.dataSource.hasChildren
                ? this.dataSource.hasChildren(element)
                : undefined;
            const collapsed = size === 0 ? undefined : isCollapsed && isCollapsed(element);
            return { element, children, collapsible, collapsed };
        });
        return { elements, size: children.length };
    }
    createModel(user, options) {
        return new ObjectTreeModel(user, options);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS90cmVlL2RhdGFUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQStDLE1BQU0sbUJBQW1CLENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFPTixTQUFTLEdBQ1QsTUFBTSxXQUFXLENBQUE7QUFDbEIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBT3RELE1BQU0sT0FBTyxRQUF3QyxTQUFRLFlBSTVEO0lBT0EsWUFDUyxJQUFZLEVBQ3BCLFNBQXNCLEVBQ3RCLFFBQWlDLEVBQ2pDLFNBQStDLEVBQ3ZDLFVBQWtDLEVBQzFDLFVBQTRDLEVBQUU7UUFFOUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFrRCxDQUFDLENBQUE7UUFQdkYsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUlaLGVBQVUsR0FBVixVQUFVLENBQXdCO1FBUG5DLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQXFDLENBQUE7UUFXckUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsUUFBUTtJQUVSLFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDbEIsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUF5QixFQUFFLFNBQWlDO1FBQ3BFLElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxF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