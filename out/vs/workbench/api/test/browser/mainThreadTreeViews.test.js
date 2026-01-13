/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import assert from 'assert';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { MainThreadTreeViews } from '../../browser/mainThreadTreeViews.js';
import { CustomTreeView } from '../../../browser/parts/views/treeView.js';
import { Extensions, IViewDescriptorService, TreeItemCollapsibleState, } from '../../../common/views.js';
import { ViewDescriptorService } from '../../../services/views/browser/viewDescriptorService.js';
import { TestViewsService, workbenchInstantiationService, } from '../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../test/common/workbenchTestServices.js';
suite('MainThreadHostTreeView', function () {
    const testTreeViewId = 'testTreeView';
    const customValue = 'customValue';
    const ViewsRegistry = Registry.as(Extensions.ViewsRegistry);
    class MockExtHostTreeViewsShape extends mock() {
        async $getChildren(treeViewId, treeItemHandle) {
            return [
                [
                    0,
                    {
                        handle: 'testItem1',
                        collapsibleState: TreeItemCollapsibleState.Expanded,
                        customProp: customValue,
                    },
                ],
            ];
        }
        async $hasResolve() {
            return false;
        }
        $setVisible() { }
    }
    let container;
    let mainThreadTreeViews;
    let extHostTreeViewsShape;
    teardown(() => {
        ViewsRegistry.deregisterViews(ViewsRegistry.getViews(container), container);
    });
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const viewDescriptorService = disposables.add(instantiationService.createInstance(ViewDescriptorService));
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        container = Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: 'testContainer',
            title: nls.localize2('test', 'test'),
            ctorDescriptor: new SyncDescriptor({}),
        }, 0 /* ViewContainerLocation.Sidebar */);
        const viewDescriptor = {
            id: testTreeViewId,
            ctorDescriptor: null,
            name: nls.localize2('Test View 1', 'Test View 1'),
            treeView: disposables.add(instantiationService.createInstance(CustomTreeView, 'testTree', 'Test Title', 'extension.id')),
        };
        ViewsRegistry.registerViews([viewDescriptor], container);
        const testExtensionService = new TestExtensionService();
        extHostTreeViewsShape = new MockExtHostTreeViewsShape();
        mainThreadTreeViews = disposables.add(new MainThreadTreeViews(new (class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) {
                return null;
            }
            getProxy() {
                return extHostTreeViewsShape;
            }
            drain() {
                return null;
            }
        })(), new TestViewsService(), new TestNotificationService(), testExtensionService, new NullLogService()));
        mainThreadTreeViews.$registerTreeViewDataProvider(testTreeViewId, {
            showCollapseAll: false,
            canSelectMany: false,
            dropMimeTypes: [],
            dragMimeTypes: [],
            hasHandleDrag: false,
            hasHandleDrop: false,
            manuallyManageCheckboxes: false,
        });
        await testExtensionService.whenInstalledExtensionsRegistered();
    });
    test('getChildren keeps custom properties', async () => {
        const treeView = ViewsRegistry.getView(testTreeViewId)
            .treeView;
        const children = await treeView.dataProvider?.getChildren({
            handle: 'root',
            collapsibleState: TreeItemCollapsibleState.Expanded,
        });
        assert(children.length === 1, 'Exactly one child should be returned');
        assert(children[0].customProp === customValue, 'Tree Items should keep custom properties');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkVHJlZVZpZXdzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUV6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDbEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sVUFBVSxFQUtWLHNCQUFzQixFQUV0Qix3QkFBd0IsR0FHeEIsTUFBTSwwQkFBMEIsQ0FBQTtBQUdqQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLDZCQUE2QixHQUM3QixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXBGLEtBQUssQ0FBQyx3QkFBd0IsRUFBRTtJQUMvQixNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUE7SUFDckMsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFBO0lBQ2pDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWlCLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQU0zRSxNQUFNLHlCQUEwQixTQUFRLElBQUksRUFBeUI7UUFDM0QsS0FBSyxDQUFDLFlBQVksQ0FDMUIsVUFBa0IsRUFDbEIsY0FBeUI7WUFFekIsT0FBTztnQkFDTjtvQkFDQyxDQUFDO29CQUNlO3dCQUNmLE1BQU0sRUFBRSxXQUFXO3dCQUNuQixnQkFBZ0IsRUFBRSx3QkFBd0IsQ0FBQyxRQUFRO3dCQUNuRCxVQUFVLEVBQUUsV0FBVztxQkFDdkI7aUJBQ0Q7YUFDRCxDQUFBO1FBQ0YsQ0FBQztRQUVRLEtBQUssQ0FBQyxXQUFXO1lBQ3pCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVRLFdBQVcsS0FBVSxDQUFDO0tBQy9CO0lBRUQsSUFBSSxTQUF3QixDQUFBO0lBQzVCLElBQUksbUJBQXdDLENBQUE7SUFDNUMsSUFBSSxxQkFBZ0QsQ0FBQTtJQUVwRCxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsYUFBYSxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzVFLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsTUFBTSxvQkFBb0IsR0FBNkIsNkJBQTZCLENBQ25GLFNBQVMsRUFDVCxXQUFXLENBQ1gsQ0FBQTtRQUNELE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQzFELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtRQUN4RSxTQUFTLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDdEIsVUFBVSxDQUFDLHNCQUFzQixDQUNqQyxDQUFDLHFCQUFxQixDQUN0QjtZQUNDLEVBQUUsRUFBRSxlQUFlO1lBQ25CLEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7WUFDcEMsY0FBYyxFQUFFLElBQUksY0FBYyxDQUFNLEVBQUUsQ0FBQztTQUMzQyx3Q0FFRCxDQUFBO1FBQ0QsTUFBTSxjQUFjLEdBQXdCO1lBQzNDLEVBQUUsRUFBRSxjQUFjO1lBQ2xCLGNBQWMsRUFBRSxJQUFLO1lBQ3JCLElBQUksRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUM7WUFDakQsUUFBUSxFQUFFLFdBQVcsQ0FBQyxHQUFHLENBQ3hCLG9CQUFvQixDQUFDLGNBQWMsQ0FDbEMsY0FBYyxFQUNkLFVBQVUsRUFDVixZQUFZLEVBQ1osY0FBYyxDQUNkLENBQ0Q7U0FDRCxDQUFBO1FBQ0QsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRXhELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFBO1FBQ3ZELHFCQUFxQixHQUFHLElBQUkseUJBQXlCLEVBQUUsQ0FBQTtRQUN2RCxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNwQyxJQUFJLG1CQUFtQixDQUN0QixJQUFJLENBQUM7WUFBQTtnQkFDSixvQkFBZSxHQUFHLEVBQUUsQ0FBQTtnQkFDcEIsc0JBQWlCLDBDQUFpQztZQVluRCxDQUFDO1lBWEEsT0FBTyxLQUFJLENBQUM7WUFDWixnQkFBZ0IsS0FBSSxDQUFDO1lBQ3JCLEdBQUcsQ0FBQyxDQUFNO2dCQUNULE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELFFBQVE7Z0JBQ1AsT0FBTyxxQkFBcUIsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsS0FBSztnQkFDSixPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7U0FDRCxDQUFDLEVBQUUsRUFDSixJQUFJLGdCQUFnQixFQUFFLEVBQ3RCLElBQUksdUJBQXVCLEVBQUUsRUFDN0Isb0JBQW9CLEVBQ3BCLElBQUksY0FBYyxFQUFFLENBQ3BCLENBQ0QsQ0FBQTtRQUNELG1CQUFtQixDQUFDLDZCQUE2QixDQUFDLGNBQWMsRUFBRTtZQUNqRSxlQUFlLEVBQUUsS0FBSztZQUN0QixhQUFhLEVBQUUsS0FBSztZQUNwQixhQUFhLEVBQUUsRUFBRTtZQUNqQixhQUFhLEVBQUUsRUFBRTtZQUNqQixhQUFhLEVBQUUsS0FBSztZQUNwQixhQUFhLEVBQUUsS0FBSztZQUNwQix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CLENBQUMsQ0FBQTtRQUNGLE1BQU0sb0JBQW9CLENBQUMsaUNBQWlDLEVBQUUsQ0FBQTtJQUMvRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RCxNQUFNLFFBQVEsR0FBb0MsYUFBYSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUU7YUFDdEYsUUFBUSxDQUFBO1FBQ1YsTUFBTSxRQUFRLEdBQUcsTUFBTSxRQUFRLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQztZQUN6RCxNQUFNLEVBQUUsTUFBTTtZQUNkLGdCQUFnQixFQUFFLHdCQUF3QixDQUFDLFFBQVE7U0FDbkQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFFBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUNZLFFBQVMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLEtBQUssV0FBVyxFQUN6RCwwQ0FBMEMsQ0FDMUMsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==