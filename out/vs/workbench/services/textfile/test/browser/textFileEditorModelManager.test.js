/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { FileChangesEvent, FileOperationError, } from '../../../../../platform/files/common/files.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../../editor/common/languages/modesRegistry.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
suite('Files - TextFileEditorModelManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(toDisposable(() => accessor.textFileService.files));
    });
    teardown(() => {
        disposables.clear();
    });
    test('add, remove, clear, get, getAll', function () {
        const manager = accessor.textFileService.files;
        const model1 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random1.txt'), 'utf8', undefined));
        const model2 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random2.txt'), 'utf8', undefined));
        const model3 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random3.txt'), 'utf8', undefined));
        manager.add(URI.file('/test.html'), model1);
        manager.add(URI.file('/some/other.html'), model2);
        manager.add(URI.file('/some/this.txt'), model3);
        const fileUpper = URI.file('/TEST.html');
        assert(!manager.get(URI.file('foo')));
        assert.strictEqual(manager.get(URI.file('/test.html')), model1);
        assert.ok(!manager.get(fileUpper));
        let results = manager.models;
        assert.strictEqual(3, results.length);
        let result = manager.get(URI.file('/yes'));
        assert.ok(!result);
        result = manager.get(URI.file('/some/other.txt'));
        assert.ok(!result);
        result = manager.get(URI.file('/some/other.html'));
        assert.ok(result);
        result = manager.get(fileUpper);
        assert.ok(!result);
        manager.remove(URI.file(''));
        results = manager.models;
        assert.strictEqual(3, results.length);
        manager.remove(URI.file('/some/other.html'));
        results = manager.models;
        assert.strictEqual(2, results.length);
        manager.remove(fileUpper);
        results = manager.models;
        assert.strictEqual(2, results.length);
        manager.dispose();
        results = manager.models;
        assert.strictEqual(0, results.length);
    });
    test('resolve', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/test.html');
        const encoding = 'utf8';
        const events = [];
        disposables.add(manager.onDidCreate((model) => {
            events.push(model);
        }));
        const modelPromise = manager.resolve(resource, { encoding });
        assert.ok(manager.get(resource)); // model known even before resolved()
        const model1 = await modelPromise;
        assert.ok(model1);
        assert.strictEqual(model1.getEncoding(), encoding);
        assert.strictEqual(manager.get(resource), model1);
        const model2 = await manager.resolve(resource, { encoding });
        assert.strictEqual(model2, model1);
        model1.dispose();
        const model3 = await manager.resolve(resource, { encoding });
        assert.notStrictEqual(model3, model2);
        assert.strictEqual(manager.get(resource), model3);
        model3.dispose();
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[0].resource.toString(), model1.resource.toString());
        assert.strictEqual(events[1].resource.toString(), model2.resource.toString());
    });
    test('resolve (async)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        const onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        manager.resolve(resource, { reload: { async: true } });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('resolve (sync)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        disposables.add(manager.onDidResolve(({ model }) => {
            if (model.resource.toString() === resource.toString()) {
                didResolve = true;
            }
        }));
        await manager.resolve(resource, { reload: { async: false } });
        assert.strictEqual(didResolve, true);
    });
    test('resolve (sync) - model disposed when error and first call to resolve', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */));
        let error = undefined;
        try {
            disposables.add(await manager.resolve(resource));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        assert.strictEqual(manager.models.length, 0);
    });
    test('resolve (sync) - model not disposed when error and model existed before', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        accessor.textFileService.setReadStreamErrorOnce(new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */));
        let error = undefined;
        try {
            disposables.add(await manager.resolve(resource, { reload: { async: false } }));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
        assert.strictEqual(manager.models.length, 1);
    });
    test('resolve with initial contents', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/test.html');
        const model = disposables.add(await manager.resolve(resource, { contents: createTextBufferFactory('Hello World') }));
        assert.strictEqual(model.textEditorModel?.getValue(), 'Hello World');
        assert.strictEqual(model.isDirty(), true);
        disposables.add(await manager.resolve(resource, { contents: createTextBufferFactory('More Changes') }));
        assert.strictEqual(model.textEditorModel?.getValue(), 'More Changes');
        assert.strictEqual(model.isDirty(), true);
    });
    test('multiple resolves execute in sequence', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/test.html');
        let resolvedModel;
        const contents = [];
        disposables.add(manager.onDidResolve((e) => {
            if (e.model.resource.toString() === resource.toString()) {
                resolvedModel = disposables.add(e.model);
                contents.push(e.model.textEditorModel.getValue());
            }
        }));
        await Promise.all([
            manager.resolve(resource),
            manager.resolve(resource, { contents: createTextBufferFactory('Hello World') }),
            manager.resolve(resource, { reload: { async: false } }),
            manager.resolve(resource, { contents: createTextBufferFactory('More Changes') }),
        ]);
        assert.ok(resolvedModel instanceof TextFileEditorModel);
        assert.strictEqual(resolvedModel.textEditorModel?.getValue(), 'More Changes');
        assert.strictEqual(resolvedModel.isDirty(), true);
        assert.strictEqual(contents[0], 'Hello Html');
        assert.strictEqual(contents[1], 'Hello World');
        assert.strictEqual(contents[2], 'More Changes');
    });
    test('removed from cache when model disposed', function () {
        const manager = accessor.textFileService.files;
        const model1 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random1.txt'), 'utf8', undefined));
        const model2 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random2.txt'), 'utf8', undefined));
        const model3 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/random3.txt'), 'utf8', undefined));
        manager.add(URI.file('/test.html'), model1);
        manager.add(URI.file('/some/other.html'), model2);
        manager.add(URI.file('/some/this.txt'), model3);
        assert.strictEqual(manager.get(URI.file('/test.html')), model1);
        model1.dispose();
        assert(!manager.get(URI.file('/test.html')));
    });
    test('events', async function () {
        const manager = accessor.textFileService.files;
        const resource1 = toResource.call(this, '/path/index.txt');
        const resource2 = toResource.call(this, '/path/other.txt');
        let resolvedCounter = 0;
        let removedCounter = 0;
        let gotDirtyCounter = 0;
        let gotNonDirtyCounter = 0;
        let revertedCounter = 0;
        let savedCounter = 0;
        let encodingCounter = 0;
        disposables.add(manager.onDidResolve(({ model }) => {
            if (model.resource.toString() === resource1.toString()) {
                resolvedCounter++;
            }
        }));
        disposables.add(manager.onDidRemove((resource) => {
            if (resource.toString() === resource1.toString() ||
                resource.toString() === resource2.toString()) {
                removedCounter++;
            }
        }));
        disposables.add(manager.onDidChangeDirty((model) => {
            if (model.resource.toString() === resource1.toString()) {
                if (model.isDirty()) {
                    gotDirtyCounter++;
                }
                else {
                    gotNonDirtyCounter++;
                }
            }
        }));
        disposables.add(manager.onDidRevert((model) => {
            if (model.resource.toString() === resource1.toString()) {
                revertedCounter++;
            }
        }));
        disposables.add(manager.onDidSave(({ model }) => {
            if (model.resource.toString() === resource1.toString()) {
                savedCounter++;
            }
        }));
        disposables.add(manager.onDidChangeEncoding((model) => {
            if (model.resource.toString() === resource1.toString()) {
                encodingCounter++;
            }
        }));
        const model1 = await manager.resolve(resource1, { encoding: 'utf8' });
        assert.strictEqual(resolvedCounter, 1);
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 2 /* FileChangeType.DELETED */ }], false));
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 1 /* FileChangeType.ADDED */ }], false));
        const model2 = await manager.resolve(resource2, { encoding: 'utf8' });
        assert.strictEqual(resolvedCounter, 2);
        model1.updateTextEditorModel(createTextBufferFactory('changed'));
        model1.updatePreferredEncoding('utf16');
        await model1.revert();
        model1.updateTextEditorModel(createTextBufferFactory('changed again'));
        await model1.save();
        model1.dispose();
        model2.dispose();
        await model1.revert();
        assert.strictEqual(removedCounter, 2);
        assert.strictEqual(gotDirtyCounter, 2);
        assert.strictEqual(gotNonDirtyCounter, 2);
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(encodingCounter, 2);
        model1.dispose();
        model2.dispose();
        assert.ok(!accessor.modelService.getModel(resource1));
        assert.ok(!accessor.modelService.getModel(resource2));
    });
    test('disposing model takes it out of the manager', async function () {
        const manager = accessor.textFileService.files;
        const resource = toResource.call(this, '/path/index_something.txt');
        const model = await manager.resolve(resource, { encoding: 'utf8' });
        model.dispose();
        assert.ok(!manager.get(resource));
        assert.ok(!accessor.modelService.getModel(model.resource));
    });
    test('canDispose with dirty model', async function () {
        const manager = accessor.textFileService.files;
        const resource = toResource.call(this, '/path/index_something.txt');
        const model = disposables.add(await manager.resolve(resource, { encoding: 'utf8' }));
        model.updateTextEditorModel(createTextBufferFactory('make dirty'));
        const canDisposePromise = manager.canDispose(model);
        assert.ok(canDisposePromise instanceof Promise);
        let canDispose = false;
        (async () => {
            canDispose = await canDisposePromise;
        })();
        assert.strictEqual(canDispose, false);
        model.revert({ soft: true });
        await timeout(0);
        assert.strictEqual(canDispose, true);
        const canDispose2 = manager.canDispose(model);
        assert.strictEqual(canDispose2, true);
    });
    test('language', async function () {
        const languageId = 'text-file-model-manager-test';
        disposables.add(accessor.languageService.registerLanguage({
            id: languageId,
        }));
        const manager = accessor.textFileService.files;
        const resource = toResource.call(this, '/path/index_something.txt');
        let model = disposables.add(await manager.resolve(resource, { languageId: languageId }));
        assert.strictEqual(model.textEditorModel.getLanguageId(), languageId);
        model = await manager.resolve(resource, { languageId: 'text' });
        assert.strictEqual(model.textEditorModel.getLanguageId(), PLAINTEXT_LANGUAGE_ID);
    });
    test('file change events trigger reload (on a resolved model)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        const onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('file change events trigger reload (after a model is resolved: https://github.com/microsoft/vscode/issues/132765)', async () => {
        const manager = accessor.textFileService.files;
        const resource = URI.file('/path/index.txt');
        manager.resolve(resource);
        let didResolve = false;
        let resolvedCounter = 0;
        const onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                disposables.add(model);
                if (model.resource.toString() === resource.toString()) {
                    resolvedCounter++;
                    if (resolvedCounter === 2) {
                        didResolve = true;
                        resolve();
                    }
                }
            }));
        });
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JNb2RlbE1hbmFnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L2Jyb3dzZXIvdGV4dEZpbGVFZGl0b3JNb2RlbE1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEdBRW5CLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixrQkFBa0IsR0FFbEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRS9GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXZGLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLG9CQUEyQyxDQUFBO0lBQy9DLElBQUksUUFBNkIsQ0FBQTtJQUVqQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZC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