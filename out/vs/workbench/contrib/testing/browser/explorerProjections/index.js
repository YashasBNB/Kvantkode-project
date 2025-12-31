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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvZXhwbG9yZXJQcm9qZWN0aW9ucy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBRU4sOEJBQThCLEdBQzlCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBR3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUdqRSxPQUFPLEVBRU4sK0JBQStCLEdBQy9CLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUVOLGdCQUFnQixHQUdoQixNQUFNLDJCQUEyQixDQUFBO0FBb0NsQyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7QUFFakIsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7QUFFdkMsTUFBTSxPQUFnQixtQkFBbUI7SUE0Q3hDLFlBQ2lCLElBQXNCO0lBQ3RDOzs7T0FHRztJQUNhLFNBQXFDLElBQUk7UUFMekMsU0FBSSxHQUFKLElBQUksQ0FBa0I7UUFLdEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUM7UUFqRHZDLGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUV0RDs7V0FFRztRQUNhLGFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQTtRQUVuRDs7V0FFRztRQUNhLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMkIsQ0FBQTtRQUU3RDs7V0FFRztRQUNhLFdBQU0sR0FBRyxLQUFLLEVBQUUsQ0FBQTtRQUVoQzs7V0FFRztRQUNJLFVBQUssR0FBVyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJ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