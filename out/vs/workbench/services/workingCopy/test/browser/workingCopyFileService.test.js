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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci93b3JraW5nQ29weUZpbGVTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBR3JGLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9ELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV6RSxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO0lBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDekMsSUFBSSxvQkFBMkMsQ0FBQTtJQUMvQyxJQUFJLFFBQTZCLENBQUE7SUFFakMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUM1RSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FB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