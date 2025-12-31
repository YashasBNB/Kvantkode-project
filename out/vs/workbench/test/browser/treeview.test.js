/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TreeView } from '../../browser/parts/views/treeView.js';
import { workbenchInstantiationService } from './workbenchTestServices.js';
import { IViewDescriptorService, TreeItemCollapsibleState } from '../../common/views.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { ViewDescriptorService } from '../../services/views/browser/viewDescriptorService.js';
suite('TreeView', function () {
    let treeView;
    let largestBatchSize = 0;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        largestBatchSize = 0;
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const viewDescriptorService = disposables.add(instantiationService.createInstance(ViewDescriptorService));
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        treeView = disposables.add(instantiationService.createInstance(TreeView, 'testTree', 'Test Title'));
        const getChildrenOfItem = async (element) => {
            if (element) {
                return undefined;
            }
            else {
                const rootChildren = [];
                for (let i = 0; i < 100; i++) {
                    rootChildren.push({
                        handle: `item_${i}`,
                        collapsibleState: TreeItemCollapsibleState.Expanded,
                    });
                }
                return rootChildren;
            }
        };
        treeView.dataProvider = {
            getChildren: getChildrenOfItem,
            getChildrenBatch: async (elements) => {
                if (elements && elements.length > largestBatchSize) {
                    largestBatchSize = elements.length;
                }
                if (elements) {
                    return Array(elements.length).fill([]);
                }
                else {
                    return [(await getChildrenOfItem()) ?? []];
                }
            },
        };
    });
    test('children are batched', async () => {
        assert.strictEqual(largestBatchSize, 0);
        treeView.setVisibility(true);
        await treeView.refresh();
        assert.strictEqual(largestBatchSize, 100);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZXZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvdHJlZXZpZXcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRTFFLE9BQU8sRUFBYSxzQkFBc0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ25HLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRTdGLEtBQUssQ0FBQyxVQUFVLEVBQUU7SUFDakIsSUFBSSxRQUFrQixDQUFBO0lBQ3RCLElBQUksZ0JBQWdCLEdBQVcsQ0FBQyxDQUFBO0lBRWhDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLGdCQUFnQixHQUFHLENBQUMsQ0FBQTtRQUNwQixNQUFNLG9CQUFvQixHQUE2Qiw2QkFBNkIsQ0FDbkYsU0FBUyxFQUNULFdBQVcsQ0FDWCxDQUFBO1FBQ0QsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FDMUQsQ0FBQTtRQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQ3hFLFFBQVEsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN6QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FDdkUsQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLE9BQW1CLEVBQW9DLEVBQUU7WUFDekYsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxZQUFZLEdBQWdCLEVBQUUsQ0FBQTtnQkFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM5QixZQUFZLENBQUMsSUFBSSxDQUFDO3dCQUNqQixNQUFNLEVBQUUsUUFBUSxDQUFDLEVBQUU7d0JBQ25CLGdCQUFnQixFQUFFLHdCQUF3QixDQUFDLFFBQVE7cUJBQ25ELENBQUMsQ0FBQTtnQkFDSCxDQUFDO2dCQUNELE9BQU8sWUFBWSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxRQUFRLENBQUMsWUFBWSxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLFFBQXNCLEVBQXNDLEVBQUU7Z0JBQ3RGLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztvQkFDcEQsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQTtnQkFDbkMsQ0FBQztnQkFDRCxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3ZDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsQ0FBQyxNQUFNLGlCQUFpQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDM0MsQ0FBQztZQUNGLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVCLE1BQU0sUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9