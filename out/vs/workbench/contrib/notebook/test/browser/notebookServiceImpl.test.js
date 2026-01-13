/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NotebookProviderInfoStore } from '../../browser/services/notebookServiceImpl.js';
import { NotebookProviderInfo } from '../../common/notebookProvider.js';
import { EditorResolverService } from '../../../../services/editor/browser/editorResolverService.js';
import { RegisteredEditorPriority } from '../../../../services/editor/common/editorResolverService.js';
import { nullExtensionDescription, } from '../../../../services/extensions/common/extensions.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('NotebookProviderInfoStore', function () {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test("Can't open untitled notebooks in test #119363", function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const store = new NotebookProviderInfoStore(new (class extends mock() {
            get() {
                return '';
            }
            store() { }
            getObject() {
                return {};
            }
        })(), new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRegisterExtensions = Event.None;
            }
        })(), disposables.add(instantiationService.createInstance(EditorResolverService)), new TestConfigurationService(), new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidChangeScreenReaderOptimized = Event.None;
            }
        })(), instantiationService, new (class extends mock() {
            hasProvider() {
                return true;
            }
        })(), new (class extends mock() {
        })(), new (class extends mock() {
        })());
        disposables.add(store);
        const fooInfo = new NotebookProviderInfo({
            extension: nullExtensionDescription.identifier,
            id: 'foo',
            displayName: 'foo',
            selectors: [{ filenamePattern: '*.foo' }],
            priority: RegisteredEditorPriority.default,
            providerDisplayName: 'foo',
        });
        const barInfo = new NotebookProviderInfo({
            extension: nullExtensionDescription.identifier,
            id: 'bar',
            displayName: 'bar',
            selectors: [{ filenamePattern: '*.bar' }],
            priority: RegisteredEditorPriority.default,
            providerDisplayName: 'bar',
        });
        store.add(fooInfo);
        store.add(barInfo);
        assert.ok(store.get('foo'));
        assert.ok(store.get('bar'));
        assert.ok(!store.get('barfoo'));
        let providers = store.getContributedNotebook(URI.parse('file:///test/nb.foo'));
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0] === fooInfo, true);
        providers = store.getContributedNotebook(URI.parse('file:///test/nb.bar'));
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0] === barInfo, true);
        providers = store.getContributedNotebook(URI.parse('untitled:///Untitled-1'));
        assert.strictEqual(providers.length, 2);
        assert.strictEqual(providers[0] === fooInfo, true);
        assert.strictEqual(providers[1] === barInfo, true);
        providers = store.getContributedNotebook(URI.parse('untitled:///test/nb.bar'));
        assert.strictEqual(providers.length, 1);
        assert.strictEqual(providers[0] === barInfo, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZXJ2aWNlSW1wbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tTZXJ2aWNlSW1wbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUl4SCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUN0RyxPQUFPLEVBRU4sd0JBQXdCLEdBQ3hCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakcsS0FBSyxDQUFDLDJCQUEyQixFQUFFO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFrQyxDQUFBO0lBRTdGLElBQUksQ0FBQywrQ0FBK0MsRUFBRTtRQUNyRCxNQUFNLG9CQUFvQixHQUFHLDZCQUE2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QUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbEQsU0FBUyxHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVsRCxTQUFTLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9