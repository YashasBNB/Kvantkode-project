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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsUmVzb2x2ZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dG1vZGVsUmVzb2x2ZXIvdGVzdC9icm93c2VyL3RleHRNb2RlbFJlc29sdmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHOUYsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7SUFDbEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLG9CQUEyQyxDQUFBO0lB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