/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { TextFileEditorModel } from '../../../textfile/common/textFileEditorModel.js';
import { snapshotToString } from '../../../textfile/common/textfiles.js';
import { Event } from '../../../../../base/common/event.js';
import { timeout } from '../../../../../base/common/async.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('Workbench - TextModelResolverService', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('resolve resource', async () => {
        disposables.add(accessor.textModelResolverService.registerTextModelContentProvider('test', {
            provideTextContent: async function (resource) {
                if (resource.scheme === 'test') {
                    const modelContent = 'Hello Test';
                    const languageSelection = accessor.languageService.createById('json');
                    return accessor.modelService.createModel(modelContent, languageSelection, resource);
                }
                return null;
            },
        }));
        const resource = URI.from({ scheme: 'test', authority: null, path: 'thePath' });
        const input = instantiationService.createInstance(TextResourceEditorInput, resource, 'The Name', 'The Description', undefined, undefined);
        const model = disposables.add(await input.resolve());
        assert.ok(model);
        assert.strictEqual(snapshotToString(model.createSnapshot()), 'Hello Test');
        let disposed = false;
        const disposedPromise = new Promise((resolve) => {
            Event.once(model.onWillDispose)(() => {
                disposed = true;
                resolve();
            });
        });
        input.dispose();
        await disposedPromise;
        assert.strictEqual(disposed, true);
    });
    test('resolve file', async function () {
        const textModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_resolver.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(textModel.resource, textModel);
        await textModel.resolve();
        const ref = await accessor.textModelResolverService.createModelReference(textModel.resource);
        const model = ref.object;
        const editorModel = model.textEditorModel;
        assert.ok(editorModel);
        assert.strictEqual(editorModel.getValue(), 'Hello Html');
        let disposed = false;
        Event.once(model.onWillDispose)(() => {
            disposed = true;
        });
        ref.dispose();
        await timeout(0); // due to the reference resolving the model first which is async
        assert.strictEqual(disposed, true);
    });
    test('resolved dirty file eventually disposes', async function () {
        const textModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_resolver.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(textModel.resource, textModel);
        await textModel.resolve();
        textModel.updateTextEditorModel(createTextBufferFactory('make dirty'));
        const ref = await accessor.textModelResolverService.createModelReference(textModel.resource);
        let disposed = false;
        Event.once(textModel.onWillDispose)(() => {
            disposed = true;
        });
        ref.dispose();
        await timeout(0);
        assert.strictEqual(disposed, false); // not disposed because model still dirty
        textModel.revert();
        await timeout(0);
        assert.strictEqual(disposed, true); // now disposed because model got reverted
    });
    test('resolved dirty file does not dispose when new reference created', async function () {
        const textModel = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_resolver.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(textModel.resource, textModel);
        await textModel.resolve();
        textModel.updateTextEditorModel(createTextBufferFactory('make dirty'));
        const ref1 = await accessor.textModelResolverService.createModelReference(textModel.resource);
        let disposed = false;
        Event.once(textModel.onWillDispose)(() => {
            disposed = true;
        });
        ref1.dispose();
        await timeout(0);
        assert.strictEqual(disposed, false); // not disposed because model still dirty
        const ref2 = await accessor.textModelResolverService.createModelReference(textModel.resource);
        textModel.revert();
        await timeout(0);
        assert.strictEqual(disposed, false); // not disposed because we got another ref meanwhile
        ref2.dispose();
        await timeout(0);
        assert.strictEqual(disposed, true); // now disposed because last ref got disposed
    });
    test('resolve untitled', async () => {
        const service = accessor.untitledTextEditorService;
        const untitledModel = disposables.add(service.create());
        const input = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, untitledModel));
        await input.resolve();
        const ref = await accessor.textModelResolverService.createModelReference(input.resource);
        const model = ref.object;
        assert.strictEqual(untitledModel, model);
        const editorModel = model.textEditorModel;
        assert.ok(editorModel);
        ref.dispose();
        input.dispose();
        model.dispose();
    });
    test('even loading documents should be refcounted', async () => {
        let resolveModel;
        const waitForIt = new Promise((resolve) => (resolveModel = resolve));
        disposables.add(accessor.textModelResolverService.registerTextModelContentProvider('test', {
            provideTextContent: async (resource) => {
                await waitForIt;
                const modelContent = 'Hello Test';
                const languageSelection = accessor.languageService.createById('json');
                return disposables.add(accessor.modelService.createModel(modelContent, languageSelection, resource));
            },
        }));
        const uri = URI.from({ scheme: 'test', authority: null, path: 'thePath' });
        const modelRefPromise1 = accessor.textModelResolverService.createModelReference(uri);
        const modelRefPromise2 = accessor.textModelResolverService.createModelReference(uri);
        resolveModel();
        const modelRef1 = await modelRefPromise1;
        const model1 = modelRef1.object;
        const modelRef2 = await modelRefPromise2;
        const model2 = modelRef2.object;
        const textModel = model1.textEditorModel;
        assert.strictEqual(model1, model2, 'they are the same model');
        assert(!textModel.isDisposed(), 'the text model should not be disposed');
        modelRef1.dispose();
        assert(!textModel.isDisposed(), 'the text model should still not be disposed');
        const p1 = new Promise((resolve) => disposables.add(textModel.onWillDispose(resolve)));
        modelRef2.dispose();
        await p1;
        assert(textModel.isDisposed(), 'the text model should finally be disposed');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0bW9kZWxSZXNvbHZlci90ZXN0L2Jyb3dzZXIvdGV4dE1vZGVsUmVzb2x2ZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUc5RixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixHQUVuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUNsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksb0JBQTJDLENB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