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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ09iamVjdFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci9leHBsb3JlclByb2plY3Rpb25zL3Rlc3RpbmdPYmplY3RUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFBMkIsbUJBQW1CLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRS9DLE1BQU0sT0FBTyxpQkFBc0MsU0FBUSxtQkFHMUQ7SUFDQTs7Ozs7T0FLRztJQUNJLHFCQUFxQixDQUMzQixtQkFBc0Q7UUFFdEQsTUFBTSxJQUFJLEdBQXFDLG1CQUFtQixJQUFJLEVBQUUsQ0FBQTtRQUV4RTs7O1dBR0c7UUFDSCxNQUFNLEtBQUssR0FBRyxDQUNiLElBQXdELEVBQ3hELE1BQXdDLEVBQzlCLEVBQUU7WUFDWixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxZQUFZLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztnQkFDcEQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDNUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUMvQyxzRkFBc0Y7WUFDdEYsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtZQUVuRixJQUFJLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFBO1lBQzFELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ25DLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUkscUJBQXFCLENBQUE7Z0JBQ3RFLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixNQUFNLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQTtnQkFDdEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNoQyxDQUFDO1lBRUQsT0FBTyxxQkFBcUIsQ0FBQTtRQUM3QixDQUFDLENBQUE7UUFFRCxJQUFJLENBQUMsUUFBUSxLQUFLLEVBQUUsQ0FBQTtRQUVwQiwwRUFBMEU7UUFDMUUseUVBQXlFO1FBQ3pFLGtDQUFrQztRQUNsQyxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLFlBQVksbUJBQW1CLEVBQUUsQ0FBQztnQkFDakQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNyRSxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNsQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7b0JBQ3JGLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ3RCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEIn0=