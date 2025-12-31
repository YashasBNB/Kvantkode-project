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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRyZWVWaWV3cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZFRyZWVWaWV3cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDekUsT0FBTyxFQUNOLFVBQVUsRUFLVixzQkFBc0IsRUFFdEIsd0JBQXdCLEdBR3hCLE1BQU0sMEJBQTBCLENBQUE7QUFHakMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDaEcsT0FBTyxFQUNOLGdCQUFnQixFQUNoQiw2QkFBNkIsR0FDN0IsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUVwRixLQUFLLENBQUMsd0JBQXdCLEVBQUU7SUFDL0IsTUFBTSxjQUFj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