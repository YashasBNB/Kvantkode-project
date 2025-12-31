/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WorkbenchObjectTree } from '../../../../../platform/list/browser/listService.js';
import { TestItemTreeElement } from './index.js';
import { TestId } from '../../common/testId.js';
export class TestingObjectTree extends WorkbenchObjectTree {
    /**
     * Gets a serialized view state for the tree, optimized for storage.
     *
     * @param updatePreviousState Optional previous state to mutate and update
     * instead of creating a new one.
     */
    getOptimizedViewState(updatePreviousState) {
        const root = updatePreviousState || {};
        /**
         * Recursive builder function. Returns whether the subtree has any non-default
         * value. Adds itself to the parent children if it does.
         */
        const build = (node, parent) => {
            if (!(node.element instanceof TestItemTreeElement)) {
                return false;
            }
            const localId = TestId.localId(node.element.test.item.extId);
            const inTree = parent.children?.[localId] || {};
            // only saved collapsed state if it's not the default (not collapsed, or a root depth)
            inTree.collapsed = node.depth === 0 || !node.collapsed ? node.collapsed : undefined;
            let hasAnyNonDefaultValue = inTree.collapsed !== undefined;
            if (node.children.length) {
                for (const child of node.children) {
                    hasAnyNonDefaultValue = build(child, inTree) || hasAnyNonDefaultValue;
                }
            }
            if (hasAnyNonDefaultValue) {
                parent.children ??= {};
                parent.children[localId] = inTree;
            }
            else if (parent.children?.hasOwnProperty(localId)) {
                delete parent.children[localId];
            }
            return hasAnyNonDefaultValue;
        };
        root.children ??= {};
        // Controller IDs are hidden if there's only a single test controller, but
        // make sure they're added when the tree is built if this is the case, so
        // that the later ID lookup works.
        for (const node of this.getNode().children) {
            if (node.element instanceof TestItemTreeElement) {
                if (node.element.test.controllerId === node.element.test.item.extId) {
                    build(node, root);
                }
                else {
                    const ctrlNode = (root.children[node.element.test.controllerId] ??= { children: {} });
                    build(node, ctrlNode);
                }
            }
        }
        return root;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ09iamVjdFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvZXhwbG9yZXJQcm9qZWN0aW9ucy90ZXN0aW5nT2JqZWN0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQTJCLG1CQUFtQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXpFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUvQyxNQUFNLE9BQU8saUJBQXNDLFNBQVEsbUJBRzFEO0lBQ0E7Ozs7O09BS0c7SUFDSSxxQkFBcUIsQ0FDM0IsbUJBQXNEO1FBRXRELE1BQU0sSUFBSSxHQUFxQyxtQkFBbUIsSUFBSSxFQUFFLENBQUE7UUFFeEU7OztXQUdHO1FBQ0gsTUFBTSxLQUFLLEdBQUcsQ0FDYixJQUF3RCxFQUN4RCxNQUF3QyxFQUM5QixFQUFFO1lBQ1osSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sWUFBWSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzVELE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDL0Msc0ZBQXNGO1lBQ3RGLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFFbkYsSUFBSSxxQkFBcUIsR0FBRyxNQUFNLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQTtZQUMxRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzFCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUNuQyxxQkFBcUIsR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLHFCQUFxQixDQUFBO2dCQUN0RSxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUkscUJBQXFCLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUE7Z0JBQ3RCLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFBO1lBQ2xDLENBQUM7aUJBQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNyRCxPQUFPLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDaEMsQ0FBQztZQUVELE9BQU8scUJBQXFCLENBQUE7UUFDN0IsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLFFBQVEsS0FBSyxFQUFFLENBQUE7UUFFcEIsMEVBQTBFO1FBQzFFLHlFQUF5RTtRQUN6RSxrQ0FBa0M7UUFDbEMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDNUMsSUFBSSxJQUFJLENBQUMsT0FBTyxZQUFZLG1CQUFtQixFQUFFLENBQUM7Z0JBQ2pELElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDckUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDbEIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUNyRixLQUFLLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCJ9