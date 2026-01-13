/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObjectTreeElementCollapseState, } from '../../../../../base/browser/ui/tree/tree.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { isCollapsedInSerializedTestTree, } from './testingViewState.js';
import { InternalTestItem, } from '../../common/testTypes.js';
let idCounter = 0;
const getId = () => String(idCounter++);
export class TestItemTreeElement {
    constructor(test, 
    /**
     * Parent tree item. May not actually be the test item who owns this one
     * in a 'flat' projection.
     */
    parent = null) {
        this.test = test;
        this.parent = parent;
        this.changeEmitter = new Emitter();
        /**
         * Fired whenever the element or test properties change.
         */
        this.onChange = this.changeEmitter.event;
        /**
         * Tree children of this item.
         */
        this.children = new Set();
        /**
         * Unique ID of the element in the tree.
         */
        this.treeId = getId();
        /**
         * Depth of the element in the tree.
         */
        this.depth = this.parent ? this.parent.depth + 1 : 0;
        /**
         * Whether the node's test result is 'retired' -- from an outdated test run.
         */
        this.retired = false;
        /**
         * State to show on the item. This is generally the item's computed state
         * from its children.
         */
        this.state = 0 /* TestResultState.Unset */;
    }
    toJSON() {
        if (this.depth === 0) {
            return { controllerId: this.test.controllerId };
        }
        const context = {
            $mid: 16 /* MarshalledId.TestItemContext */,
            tests: [InternalTestItem.serialize(this.test)],
        };
        for (let p = this.parent; p && p.depth > 0; p = p.parent) {
            context.tests.unshift(InternalTestItem.serialize(p.test));
        }
        return context;
    }
}
export class TestTreeErrorMessage {
    get description() {
        return typeof this.message === 'string' ? this.message : this.message.value;
    }
    constructor(message, parent) {
        this.message = message;
        this.parent = parent;
        this.treeId = getId();
        this.children = new Set();
    }
}
export const testIdentityProvider = {
    getId(element) {
        // For "not expandable" elements, whether they have children is part of the
        // ID so they're rerendered if that changes (#204805)
        const expandComponent = element instanceof TestTreeErrorMessage
            ? 'error'
            : element.test.expand === 0 /* TestItemExpandState.NotExpandable */
                ? !!element.children.size
                : element.test.expand;
        return element.treeId + '\0' + expandComponent;
    },
};
export const getChildrenForParent = (serialized, rootsWithChildren, node) => {
    let it;
    if (node === null) {
        // roots
        const rootsWithChildrenArr = [...rootsWithChildren];
        if (rootsWithChildrenArr.length === 1) {
            return getChildrenForParent(serialized, rootsWithChildrenArr, rootsWithChildrenArr[0]);
        }
        it = rootsWithChildrenArr;
    }
    else {
        it = node.children;
    }
    return Iterable.map(it, (element) => element instanceof TestTreeErrorMessage
        ? { element }
        : {
            element,
            collapsible: element.test.expand !== 0 /* TestItemExpandState.NotExpandable */,
            collapsed: element.test.item.error
                ? ObjectTreeElementCollapseState.PreserveOrExpanded
                : (isCollapsedInSerializedTestTree(serialized, element.test.item.extId) ??
                    element.depth > 0)
                    ? ObjectTreeElementCollapseState.PreserveOrCollapsed
                    : ObjectTreeElementCollapseState.PreserveOrExpanded,
            children: getChildrenForParent(serialized, rootsWithChildren, element),
        });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFHcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR2pFLE9BQU8sRUFFTiwrQkFBK0IsR0FDL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBRU4sZ0JBQWdCLEdBR2hCLE1BQU0sMkJBQTJCLENBQUE7QUFvQ2xDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtBQUVqQixNQUFNLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtBQUV2QyxNQUFNLE9BQWdCLG1CQUFtQjtJQTRDeEMsWUFDaUIsSUFBc0I7SUFDdEM7OztPQUdHO0lBQ2EsU0FBcUMsSUFBSTtRQUx6QyxTQUFJLEdBQUosSUFBSSxDQUFrQjtRQUt0QixXQUFNLEdBQU4sTUFBTSxDQUFtQztRQWpEdkMsa0JBQWEsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBRXREOztXQUVHO1FBQ2EsYUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFBO1FBRW5EOztXQUVHO1FBQ2EsYUFBUSxHQUFHLElBQUksR0FBRyxFQUEyQixDQUFBO1FBRTdEOztXQUVHO1FBQ2EsV0FBTSxHQUFHLEtBQUssRUFBRSxDQUFBO1FBRWhDOztXQUVHO1FBQ0ksVUFBSyxHQUFXLElBQUksQ0FB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