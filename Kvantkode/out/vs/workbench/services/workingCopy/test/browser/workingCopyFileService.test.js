/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextFileEditorModel } from '../../../textfile/common/textFileEditorModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { TestWorkingCopy } from '../../../../test/common/workbenchTestServices.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
suite('WorkingCopyFileService', () => {
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
    test('create - dirty file', async function () {
        await testCreate(toResource.call(this, '/path/file.txt'), VSBuffer.fromString('Hello World'));
    });
    test('delete - dirty file', async function () {
        await testDelete([toResource.call(this, '/path/file.txt')]);
    });
    test('delete multiple - dirty files', async function () {
        await testDelete([
            toResource.call(this, '/path/file1.txt'),
            toResource.call(this, '/path/file2.txt'),
            toResource.call(this, '/path/file3.txt'),
            toResource.call(this, '/path/file4.txt'),
        ]);
    });
    test('move - dirty file', async function () {
        await testMoveOrCopy([
            {
                source: toResource.call(this, '/path/file.txt'),
                target: toResource.call(this, '/path/file_target.txt'),
            },
        ], true);
    });
    test('move - source identical to target', async function () {
        const sourceModel = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel.resource, sourceModel);
        const eventCounter = await testEventsMoveOrCopy([{ file: { source: sourceModel.resource, target: sourceModel.resource }, overwrite: true }], true);
        sourceModel.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('move - one source == target and another source != target', async function () {
        const sourceModel1 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file1.txt'), 'utf8', undefined);
        const sourceModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file2.txt'), 'utf8', undefined);
        const targetModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_target2.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel1.resource, sourceModel1);
        accessor.textFileService.files.add(sourceModel2.resource, sourceModel2);
        accessor.textFileService.files.add(targetModel2.resource, targetModel2);
        const eventCounter = await testEventsMoveOrCopy([
            { file: { source: sourceModel1.resource, target: sourceModel1.resource }, overwrite: true },
            { file: { source: sourceModel2.resource, target: targetModel2.resource }, overwrite: true },
        ], true);
        sourceModel1.dispose();
        sourceModel2.dispose();
        targetModel2.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('move multiple - dirty file', async function () {
        await testMoveOrCopy([
            {
                source: toResource.call(this, '/path/file1.txt'),
                target: toResource.call(this, '/path/file1_target.txt'),
            },
            {
                source: toResource.call(this, '/path/file2.txt'),
                target: toResource.call(this, '/path/file2_target.txt'),
            },
        ], true);
    });
    test('move - dirty file (target exists and is dirty)', async function () {
        await testMoveOrCopy([
            {
                source: toResource.call(this, '/path/file.txt'),
                target: toResource.call(this, '/path/file_target.txt'),
            },
        ], true, true);
    });
    test('copy - dirty file', async function () {
        await testMoveOrCopy([
            {
                source: toResource.call(this, '/path/file.txt'),
                target: toResource.call(this, '/path/file_target.txt'),
            },
        ], false);
    });
    test('copy - source identical to target', async function () {
        const sourceModel = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel.resource, sourceModel);
        const eventCounter = await testEventsMoveOrCopy([
            { file: { source: sourceModel.resource, target: sourceModel.resource }, overwrite: true },
        ]);
        sourceModel.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('copy - one source == target and another source != target', async function () {
        const sourceModel1 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file1.txt'), 'utf8', undefined);
        const sourceModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file2.txt'), 'utf8', undefined);
        const targetModel2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file_target2.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(sourceModel1.resource, sourceModel1);
        accessor.textFileService.files.add(sourceModel2.resource, sourceModel2);
        accessor.textFileService.files.add(targetModel2.resource, targetModel2);
        const eventCounter = await testEventsMoveOrCopy([
            { file: { source: sourceModel1.resource, target: sourceModel1.resource }, overwrite: true },
            { file: { source: sourceModel2.resource, target: targetModel2.resource }, overwrite: true },
        ]);
        sourceModel1.dispose();
        sourceModel2.dispose();
        targetModel2.dispose();
        assert.strictEqual(eventCounter, 3);
    });
    test('copy multiple - dirty file', async function () {
        await testMoveOrCopy([
            {
                source: toResource.call(this, '/path/file1.txt'),
                target: toResource.call(this, '/path/file_target1.txt'),
            },
            {
                source: toResource.call(this, '/path/file2.txt'),
                target: toResource.call(this, '/path/file_target2.txt'),
            },
            {
                source: toResource.call(this, '/path/file3.txt'),
                target: toResource.call(this, '/path/file_target3.txt'),
            },
        ], false);
    });
    test('copy - dirty file (target exists and is dirty)', async function () {
        await testMoveOrCopy([
            {
                source: toResource.call(this, '/path/file.txt'),
                target: toResource.call(this, '/path/file_target.txt'),
            },
        ], false, true);
    });
    test('getDirty', async function () {
        const model1 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file-1.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(model1.resource, model1);
        const model2 = instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file-2.txt'), 'utf8', undefined);
        accessor.textFileService.files.add(model2.resource, model2);
        let dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 0);
        await model1.resolve();
        model1.textEditorModel.setValue('foo');
        dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 1);
        assert.strictEqual(dirty[0], model1);
        dirty = accessor.workingCopyFileService.getDirty(toResource.call(this, '/path'));
        assert.strictEqual(dirty.length, 1);
        assert.strictEqual(dirty[0], model1);
        await model2.resolve();
        model2.textEditorModel.setValue('bar');
        dirty = accessor.workingCopyFileService.getDirty(toResource.call(this, '/path'));
        assert.strictEqual(dirty.length, 2);
        model1.dispose();
        model2.dispose();
    });
    test('registerWorkingCopyProvider', async function () {
        const model1 = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/file-1.txt'), 'utf8', undefined));
        accessor.textFileService.files.add(model1.resource, model1);
        await model1.resolve();
        model1.textEditorModel.setValue('foo');
        const testWorkingCopy = disposables.add(new TestWorkingCopy(toResource.call(this, '/path/file-2.txt'), true));
        const registration = accessor.workingCopyFileService.registerWorkingCopyProvider(() => {
            return [model1, testWorkingCopy];
        });
        let dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 2, 'Should return default working copy + working copy from provider');
        assert.strictEqual(dirty[0], model1);
        assert.strictEqual(dirty[1], testWorkingCopy);
        registration.dispose();
        dirty = accessor.workingCopyFileService.getDirty(model1.resource);
        assert.strictEqual(dirty.length, 1, 'Should have unregistered our provider');
        assert.strictEqual(dirty[0], model1);
    });
    test('createFolder', async function () {
        let eventCounter = 0;
        let correlationId = undefined;
        const resource = toResource.call(this, '/path/folder');
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                assert.strictEqual(files.length, 1);
                const file = files[0];
                assert.strictEqual(file.target.toString(), resource.toString());
                assert.strictEqual(operation, 0 /* FileOperation.CREATE */);
                eventCounter++;
            },
        }));
        disposables.add(accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            correlationId = e.correlationId;
            eventCounter++;
        }));
        disposables.add(accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            assert.strictEqual(e.correlationId, correlationId);
            eventCounter++;
        }));
        await accessor.workingCopyFileService.createFolder([{ resource }], CancellationToken.None);
        assert.strictEqual(eventCounter, 3);
    });
    test('cancellation of participants', async function () {
        const resource = toResource.call(this, '/path/folder');
        let canceled = false;
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation, info, t, token) => {
                await timeout(0);
                canceled = token.isCancellationRequested;
            },
        }));
        // Create
        let cts = new CancellationTokenSource();
        let promise = accessor.workingCopyFileService.create([{ resource }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Create Folder
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.createFolder([{ resource }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Move
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.move([{ file: { source: resource, target: resource } }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Copy
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.copy([{ file: { source: resource, target: resource } }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
        // Delete
        cts = new CancellationTokenSource();
        promise = accessor.workingCopyFileService.delete([{ resource }], cts.token);
        cts.cancel();
        await promise;
        assert.strictEqual(canceled, true);
        canceled = false;
    });
    async function testEventsMoveOrCopy(files, move) {
        let eventCounter = 0;
        const participant = accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files) => {
                eventCounter++;
            },
        });
        const listener1 = accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => {
            eventCounter++;
        });
        const listener2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            eventCounter++;
        });
        if (move) {
            await accessor.workingCopyFileService.move(files, CancellationToken.None);
        }
        else {
            await accessor.workingCopyFileService.copy(files, CancellationToken.None);
        }
        participant.dispose();
        listener1.dispose();
        listener2.dispose();
        return eventCounter;
    }
    async function testMoveOrCopy(files, move, targetDirty) {
        let eventCounter = 0;
        const models = await Promise.all(files.map(async ({ source, target }, i) => {
            const sourceModel = instantiationService.createInstance(TextFileEditorModel, source, 'utf8', undefined);
            const targetModel = instantiationService.createInstance(TextFileEditorModel, target, 'utf8', undefined);
            accessor.textFileService.files.add(sourceModel.resource, sourceModel);
            accessor.textFileService.files.add(targetModel.resource, targetModel);
            await sourceModel.resolve();
            sourceModel.textEditorModel.setValue('foo' + i);
            assert.ok(accessor.textFileService.isDirty(sourceModel.resource));
            if (targetDirty) {
                await targetModel.resolve();
                targetModel.textEditorModel.setValue('bar' + i);
                assert.ok(accessor.textFileService.isDirty(targetModel.resource));
            }
            return { sourceModel, targetModel };
        }));
        const participant = accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                for (let i = 0; i < files.length; i++) {
                    const { target, source } = files[i];
                    const { targetModel, sourceModel } = models[i];
                    assert.strictEqual(target.toString(), targetModel.resource.toString());
                    assert.strictEqual(source?.toString(), sourceModel.resource.toString());
                }
                eventCounter++;
                assert.strictEqual(operation, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */);
            },
        });
        let correlationId;
        const listener1 = accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => {
            for (let i = 0; i < e.files.length; i++) {
                const { target, source } = files[i];
                const { targetModel, sourceModel } = models[i];
                assert.strictEqual(target.toString(), targetModel.resource.toString());
                assert.strictEqual(source?.toString(), sourceModel.resource.toString());
            }
            eventCounter++;
            correlationId = e.correlationId;
            assert.strictEqual(e.operation, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */);
        });
        const listener2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            for (let i = 0; i < e.files.length; i++) {
                const { target, source } = files[i];
                const { targetModel, sourceModel } = models[i];
                assert.strictEqual(target.toString(), targetModel.resource.toString());
                assert.strictEqual(source?.toString(), sourceModel.resource.toString());
            }
            eventCounter++;
            assert.strictEqual(e.operation, move ? 2 /* FileOperation.MOVE */ : 3 /* FileOperation.COPY */);
            assert.strictEqual(e.correlationId, correlationId);
        });
        if (move) {
            await accessor.workingCopyFileService.move(models.map((model) => ({
                file: { source: model.sourceModel.resource, target: model.targetModel.resource },
                options: { overwrite: true },
            })), CancellationToken.None);
        }
        else {
            await accessor.workingCopyFileService.copy(models.map((model) => ({
                file: { source: model.sourceModel.resource, target: model.targetModel.resource },
                options: { overwrite: true },
            })), CancellationToken.None);
        }
        for (let i = 0; i < models.length; i++) {
            const { sourceModel, targetModel } = models[i];
            assert.strictEqual(targetModel.textEditorModel.getValue(), 'foo' + i);
            if (move) {
                assert.ok(!accessor.textFileService.isDirty(sourceModel.resource));
            }
            else {
                assert.ok(accessor.textFileService.isDirty(sourceModel.resource));
            }
            assert.ok(accessor.textFileService.isDirty(targetModel.resource));
            sourceModel.dispose();
            targetModel.dispose();
        }
        assert.strictEqual(eventCounter, 3);
        participant.dispose();
        listener1.dispose();
        listener2.dispose();
    }
    async function testDelete(resources) {
        const models = await Promise.all(resources.map(async (resource) => {
            const model = instantiationService.createInstance(TextFileEditorModel, resource, 'utf8', undefined);
            accessor.textFileService.files.add(model.resource, model);
            await model.resolve();
            model.textEditorModel.setValue('foo');
            assert.ok(accessor.workingCopyService.isDirty(model.resource));
            return model;
        }));
        let eventCounter = 0;
        let correlationId = undefined;
        const participant = accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                for (let i = 0; i < models.length; i++) {
                    const model = models[i];
                    const file = files[i];
                    assert.strictEqual(file.target.toString(), model.resource.toString());
                }
                assert.strictEqual(operation, 1 /* FileOperation.DELETE */);
                eventCounter++;
            },
        });
        const listener1 = accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => {
            for (let i = 0; i < models.length; i++) {
                const model = models[i];
                const file = e.files[i];
                assert.strictEqual(file.target.toString(), model.resource.toString());
            }
            assert.strictEqual(e.operation, 1 /* FileOperation.DELETE */);
            correlationId = e.correlationId;
            eventCounter++;
        });
        const listener2 = accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            for (let i = 0; i < models.length; i++) {
                const model = models[i];
                const file = e.files[i];
                assert.strictEqual(file.target.toString(), model.resource.toString());
            }
            assert.strictEqual(e.operation, 1 /* FileOperation.DELETE */);
            assert.strictEqual(e.correlationId, correlationId);
            eventCounter++;
        });
        await accessor.workingCopyFileService.delete(models.map((model) => ({ resource: model.resource })), CancellationToken.None);
        for (const model of models) {
            assert.ok(!accessor.workingCopyService.isDirty(model.resource));
            model.dispose();
        }
        assert.strictEqual(eventCounter, 3);
        participant.dispose();
        listener1.dispose();
        listener2.dispose();
    }
    async function testCreate(resource, contents) {
        const model = instantiationService.createInstance(TextFileEditorModel, resource, 'utf8', undefined);
        accessor.textFileService.files.add(model.resource, model);
        await model.resolve();
        model.textEditorModel.setValue('foo');
        assert.ok(accessor.workingCopyService.isDirty(model.resource));
        let eventCounter = 0;
        let correlationId = undefined;
        disposables.add(accessor.workingCopyFileService.addFileOperationParticipant({
            participate: async (files, operation) => {
                assert.strictEqual(files.length, 1);
                const file = files[0];
                assert.strictEqual(file.target.toString(), model.resource.toString());
                assert.strictEqual(operation, 0 /* FileOperation.CREATE */);
                eventCounter++;
            },
        }));
        disposables.add(accessor.workingCopyFileService.onWillRunWorkingCopyFileOperation((e) => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), model.resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            correlationId = e.correlationId;
            eventCounter++;
        }));
        disposables.add(accessor.workingCopyFileService.onDidRunWorkingCopyFileOperation((e) => {
            assert.strictEqual(e.files.length, 1);
            const file = e.files[0];
            assert.strictEqual(file.target.toString(), model.resource.toString());
            assert.strictEqual(e.operation, 0 /* FileOperation.CREATE */);
            assert.strictEqual(e.correlationId, correlationId);
            eventCounter++;
        }));
        await accessor.workingCopyFileService.create([{ resource, contents }], CancellationToken.None);
        assert.ok(!accessor.workingCopyService.isDirty(model.resource));
        model.dispose();
        assert.strictEqual(eventCounter, 3);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3dvcmtpbmdDb3B5RmlsZVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFHckYsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxVQUFVLEdBQ1YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixHQUVuQixNQUFNLG1EQUFtRCxDQUFBO0FBRzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0QsT0FBTyxFQUNOLGlCQUFpQixFQUNqQix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLG9CQUEyQyxDQUFBO0lBQy9DLElBQUksUUFBNkIsQ0FBQTtJQUVqQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVFLFFBQVEsR0FBRyxvQkFBb0IsQ0FB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