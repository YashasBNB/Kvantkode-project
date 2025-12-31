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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YVRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdHJlZS9kYXRhVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUErQyxNQUFNLG1CQUFtQixDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN0RCxPQUFPLEVBT04sU0FBUyxHQUNULE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQU90RCxNQUFNLE9BQU8sUUFBd0MsU0FBUSxZQUk1RDtJQU9BLFlBQ1MsSUFBWSxFQUNwQixTQUFzQixFQUN0QixRQUFpQyxFQUNqQyxTQUErQyxFQUN2QyxVQUFrQyxFQUMxQyxVQUE0QyxFQUFFO1FBRTlDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBa0QsQ0FBQyxDQUFBO1FBUHZGLFNBQUksR0FBSixJQUFJLENBQVE7UUFJWixlQUFVLEdBQVYsVUFBVSxDQUF3QjtRQVBuQyxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO1FBV3JFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUE7SUFDakQsQ0FBQztJQUVELFFBQVE7SUFFUixRQUFRO1FBQ1AsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lBQ2xCLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBeUIsRUFBRSxTQUFpQztRQUNwRSxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSw0REFBNEQsQ0FBQyxDQUFBO1FB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