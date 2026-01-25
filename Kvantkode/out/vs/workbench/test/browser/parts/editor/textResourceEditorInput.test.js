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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlRWRpdG9ySW5wdXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvdGV4dFJlc291cmNlRWRpdG9ySW5wdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRzlGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsSUFBSSxvQkFBMkMsQ0FBQTtJQUMvQyxJQUFJLFFBQTZCLENBQUE7SUFFakMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM1RSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUE7SUFDcEUsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFF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