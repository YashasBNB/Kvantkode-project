/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../workbenchTestServices.js';
import { snapshotToString } from '../../../../services/textfile/common/textfiles.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('TextResourceEditorInput', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined));
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(snapshotToString(model.createSnapshot()), 'function test() {}');
    });
    test('preferred language (via ctor)', async () => {
        const registration = accessor.languageService.registerLanguage({
            id: 'resource-input-test',
        });
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', 'resource-input-test', undefined));
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getLanguageId(), 'resource-input-test');
        input.setLanguageId('text');
        assert.strictEqual(model.textEditorModel?.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
        disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
        registration.dispose();
    });
    test('preferred language (via setPreferredLanguageId)', async () => {
        const registration = accessor.languageService.registerLanguage({
            id: 'resource-input-test',
        });
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined));
        input.setPreferredLanguageId('resource-input-test');
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getLanguageId(), 'resource-input-test');
        registration.dispose();
    });
    test('preferred contents (via ctor)', async () => {
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, 'My Resource Input Contents'));
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getValue(), 'My Resource Input Contents');
        model.textEditorModel.setValue('Some other contents');
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents');
        disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents'); // preferred contents only used once
    });
    test('preferred contents (via setPreferredContents)', async () => {
        const resource = URI.from({ scheme: 'inmemory', authority: null, path: 'thePath' });
        accessor.modelService.createModel('function test() {}', accessor.languageService.createById(PLAINTEXT_LANGUAGE_ID), resource);
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined));
        input.setPreferredContents('My Resource Input Contents');
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(model.textEditorModel?.getValue(), 'My Resource Input Contents');
        model.textEditorModel.setValue('Some other contents');
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents');
        disposables.add(await input.resolve());
        assert.strictEqual(model.textEditorModel?.getValue(), 'Some other contents'); // preferred contents only used once
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9ySW5wdXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL3RleHRSZXNvdXJjZUVkaXRvcklucHV0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUc5RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtJQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLElBQUksb0JBQTJDLENBQUE7SUFDL0MsSUFBSSxRQUE2QixDQUFBO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDNUUsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNi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