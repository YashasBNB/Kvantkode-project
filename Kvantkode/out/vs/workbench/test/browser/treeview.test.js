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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZXZpZXcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci90cmVldmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFMUUsT0FBTyxFQUFhLHNCQUFzQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDbkcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFN0YsS0FBSyxDQUFDLFVBQVUsRUFBRTtJQUNqQixJQUFJLFFBQWtCLENBQUE7SUFDdEIsSUFBSSxnQkFBZ0IsR0FBVyxDQUFDLENBQUE7SUFFaEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBO1FBQ3BCLE1BQU0sb0JBQW9CLEdBQTZCLDZCQUE2QixDQUNuRixTQUFTLEVBQ1QsV0FBVyxDQUNYLENBQUE7UUFDRCxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUMxRCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixDQUFDLENBQUE7UUFDeEUsUUFBUSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3pCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUN2RSxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLEVBQUUsT0FBbUIsRUFBb0MsRUFBRTtZQUN6RixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLFlBQVksR0FBZ0IsRUFBRSxDQUFBO2dCQUNwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzlCLFlBQVksQ0FBQyxJQUFJLENBQUM7d0JBQ2pCLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFBRTt3QkFDbkIsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUMsUUFBUTtxQkFDbkQsQ0FBQyxDQUFBO2dCQUNILENBQUM7Z0JBQ0QsT0FBTyxZQUFZLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELFFBQVEsQ0FBQyxZQUFZLEdBQUc7WUFDdkIsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsUUFBc0IsRUFBc0MsRUFBRTtnQkFDdEYsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO29CQUNwRCxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFBO2dCQUNuQyxDQUFDO2dCQUNELElBQUksUUFBUSxFQUFFLENBQUM7b0JBQ2QsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDdkMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sQ0FBQyxDQUFDLE1BQU0saUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO2dCQUMzQyxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsTUFBTSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=