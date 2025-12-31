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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZXJ2aWNlSW1wbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rU2VydmljZUltcGwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFJeEgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDcEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDdEcsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpHLEtBQUssQ0FBQywyQkFBMkIsRUFBRTtJQUNsQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBa0MsQ0FBQTtJQUU3RixJQUFJLENBQUMsK0NBQStDLEVBQUU7UUFDckQsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxD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