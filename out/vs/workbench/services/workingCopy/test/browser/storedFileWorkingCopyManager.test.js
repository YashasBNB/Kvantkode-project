/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor, TestWillShutdownEvent, } from '../../../../test/browser/workbenchTestServices.js';
import { StoredFileWorkingCopyManager, } from '../../common/storedFileWorkingCopyManager.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { FileChangesEvent, FileOperationError, } from '../../../../../platform/files/common/files.js';
import { timeout } from '../../../../../base/common/async.js';
import { TestStoredFileWorkingCopyModelFactory, } from './storedFileWorkingCopy.test.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('StoredFileWorkingCopyManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let manager;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        manager = disposables.add(new StoredFileWorkingCopyManager('testStoredFileWorkingCopyType', new TestStoredFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService));
    });
    teardown(() => {
        for (const workingCopy of manager.workingCopies) {
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('resolve', async () => {
        const resource = URI.file('/test.html');
        const events = [];
        const listener = manager.onDidCreate((workingCopy) => {
            events.push(workingCopy);
        });
        const resolvePromise = manager.resolve(resource);
        assert.ok(manager.get(resource)); // working copy known even before resolved()
        assert.strictEqual(manager.workingCopies.length, 1);
        const workingCopy1 = await resolvePromise;
        assert.ok(workingCopy1);
        assert.ok(workingCopy1.model);
        assert.strictEqual(workingCopy1.typeId, 'testStoredFileWorkingCopyType');
        assert.strictEqual(workingCopy1.resource.toString(), resource.toString());
        assert.strictEqual(manager.get(resource), workingCopy1);
        const workingCopy2 = await manager.resolve(resource);
        assert.strictEqual(workingCopy2, workingCopy1);
        assert.strictEqual(manager.workingCopies.length, 1);
        workingCopy1.dispose();
        const workingCopy3 = await manager.resolve(resource);
        assert.notStrictEqual(workingCopy3, workingCopy2);
        assert.strictEqual(manager.workingCopies.length, 1);
        assert.strictEqual(manager.get(resource), workingCopy3);
        workingCopy3.dispose();
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(events.length, 2);
        assert.strictEqual(events[0].resource.toString(), workingCopy1.resource.toString());
        assert.strictEqual(events[1].resource.toString(), workingCopy2.resource.toString());
        listener.dispose();
        workingCopy1.dispose();
        workingCopy2.dispose();
        workingCopy3.dispose();
    });
    test('resolve (async)', async () => {
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        let onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        const resolve = manager.resolve(resource, { reload: { async: true } });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
        didResolve = false;
        onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        manager.resolve(resource, { reload: { async: true, force: true } });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
        disposables.add(await resolve);
    });
    test('resolve (sync)', async () => {
        const resource = URI.file('/path/index.txt');
        await manager.resolve(resource);
        let didResolve = false;
        disposables.add(manager.onDidResolve(({ model }) => {
            if (model?.resource.toString() === resource.toString()) {
                didResolve = true;
            }
        }));
        disposables.add(await manager.resolve(resource, { reload: { async: false } }));
        assert.strictEqual(didResolve, true);
        didResolve = false;
        disposables.add(await manager.resolve(resource, { reload: { async: false, force: true } }));
        assert.strictEqual(didResolve, true);
    });
    test('resolve (sync) - model disposed when error and first call to resolve', async () => {
        const resource = URI.file('/path/index.txt');
        accessor.fileService.readShouldThrowError = new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */);
        try {
            let error = undefined;
            try {
                await manager.resolve(resource);
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(manager.workingCopies.length, 0);
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
    });
    test('resolve (sync) - model not disposed when error and model existed before', async () => {
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        accessor.fileService.readShouldThrowError = new FileOperationError('fail', 10 /* FileOperationResult.FILE_OTHER_ERROR */);
        try {
            let error = undefined;
            try {
                await manager.resolve(resource, { reload: { async: false } });
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.strictEqual(manager.workingCopies.length, 1);
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
    });
    test('resolve with initial contents', async () => {
        const resource = URI.file('/test.html');
        const workingCopy = await manager.resolve(resource, {
            contents: bufferToStream(VSBuffer.fromString('Hello World')),
        });
        assert.strictEqual(workingCopy.model?.contents, 'Hello World');
        assert.strictEqual(workingCopy.isDirty(), true);
        await manager.resolve(resource, {
            contents: bufferToStream(VSBuffer.fromString('More Changes')),
        });
        assert.strictEqual(workingCopy.model?.contents, 'More Changes');
        assert.strictEqual(workingCopy.isDirty(), true);
        workingCopy.dispose();
    });
    test('multiple resolves execute in sequence (same resources)', async () => {
        const resource = URI.file('/test.html');
        const firstPromise = manager.resolve(resource);
        const secondPromise = manager.resolve(resource, {
            contents: bufferToStream(VSBuffer.fromString('Hello World')),
        });
        const thirdPromise = manager.resolve(resource, {
            contents: bufferToStream(VSBuffer.fromString('More Changes')),
        });
        await firstPromise;
        await secondPromise;
        const workingCopy = await thirdPromise;
        assert.strictEqual(workingCopy.model?.contents, 'More Changes');
        assert.strictEqual(workingCopy.isDirty(), true);
        workingCopy.dispose();
    });
    test('multiple resolves execute in parallel (different resources)', async () => {
        const resource1 = URI.file('/test1.html');
        const resource2 = URI.file('/test2.html');
        const resource3 = URI.file('/test3.html');
        const firstPromise = manager.resolve(resource1);
        const secondPromise = manager.resolve(resource2);
        const thirdPromise = manager.resolve(resource3);
        const [workingCopy1, workingCopy2, workingCopy3] = await Promise.all([
            firstPromise,
            secondPromise,
            thirdPromise,
        ]);
        assert.strictEqual(manager.workingCopies.length, 3);
        assert.strictEqual(workingCopy1.resource.toString(), resource1.toString());
        assert.strictEqual(workingCopy2.resource.toString(), resource2.toString());
        assert.strictEqual(workingCopy3.resource.toString(), resource3.toString());
        workingCopy1.dispose();
        workingCopy2.dispose();
        workingCopy3.dispose();
    });
    test('removed from cache when working copy or model gets disposed', async () => {
        const resource = URI.file('/test.html');
        let workingCopy = await manager.resolve(resource, {
            contents: bufferToStream(VSBuffer.fromString('Hello World')),
        });
        assert.strictEqual(manager.get(URI.file('/test.html')), workingCopy);
        workingCopy.dispose();
        assert(!manager.get(URI.file('/test.html')));
        workingCopy = await manager.resolve(resource, {
            contents: bufferToStream(VSBuffer.fromString('Hello World')),
        });
        assert.strictEqual(manager.get(URI.file('/test.html')), workingCopy);
        workingCopy.model?.dispose();
        assert(!manager.get(URI.file('/test.html')));
    });
    test('events', async () => {
        const resource1 = URI.file('/path/index.txt');
        const resource2 = URI.file('/path/other.txt');
        let createdCounter = 0;
        let resolvedCounter = 0;
        let removedCounter = 0;
        let gotDirtyCounter = 0;
        let gotNonDirtyCounter = 0;
        let revertedCounter = 0;
        let savedCounter = 0;
        let saveErrorCounter = 0;
        disposables.add(manager.onDidCreate(() => {
            createdCounter++;
        }));
        disposables.add(manager.onDidRemove((resource) => {
            if (resource.toString() === resource1.toString() ||
                resource.toString() === resource2.toString()) {
                removedCounter++;
            }
        }));
        disposables.add(manager.onDidResolve((workingCopy) => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                resolvedCounter++;
            }
        }));
        disposables.add(manager.onDidChangeDirty((workingCopy) => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                if (workingCopy.isDirty()) {
                    gotDirtyCounter++;
                }
                else {
                    gotNonDirtyCounter++;
                }
            }
        }));
        disposables.add(manager.onDidRevert((workingCopy) => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                revertedCounter++;
            }
        }));
        let lastSaveEvent = undefined;
        disposables.add(manager.onDidSave((e) => {
            if (e.workingCopy.resource.toString() === resource1.toString()) {
                lastSaveEvent = e;
                savedCounter++;
            }
        }));
        disposables.add(manager.onDidSaveError((workingCopy) => {
            if (workingCopy.resource.toString() === resource1.toString()) {
                saveErrorCounter++;
            }
        }));
        const workingCopy1 = disposables.add(await manager.resolve(resource1));
        assert.strictEqual(resolvedCounter, 1);
        assert.strictEqual(createdCounter, 1);
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 2 /* FileChangeType.DELETED */ }], false));
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource: resource1, type: 1 /* FileChangeType.ADDED */ }], false));
        const workingCopy2 = disposables.add(await manager.resolve(resource2));
        assert.strictEqual(resolvedCounter, 2);
        assert.strictEqual(createdCounter, 2);
        workingCopy1.model?.updateContents('changed');
        await workingCopy1.revert();
        workingCopy1.model?.updateContents('changed again');
        await workingCopy1.save();
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy1.save({ force: true });
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        workingCopy1.dispose();
        workingCopy2.dispose();
        await workingCopy1.revert();
        assert.strictEqual(removedCounter, 2);
        assert.strictEqual(gotDirtyCounter, 3);
        assert.strictEqual(gotNonDirtyCounter, 2);
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(lastSaveEvent.workingCopy, workingCopy1);
        assert.ok(lastSaveEvent.stat);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(createdCounter, 2);
        workingCopy1.dispose();
        workingCopy2.dispose();
    });
    test('resolve registers as working copy and dispose clears', async () => {
        const resource1 = URI.file('/test1.html');
        const resource2 = URI.file('/test2.html');
        const resource3 = URI.file('/test3.html');
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        const firstPromise = manager.resolve(resource1);
        const secondPromise = manager.resolve(resource2);
        const thirdPromise = manager.resolve(resource3);
        await Promise.all([firstPromise, secondPromise, thirdPromise]);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        assert.strictEqual(manager.workingCopies.length, 3);
        manager.dispose();
        assert.strictEqual(manager.workingCopies.length, 0);
        // dispose does not remove from working copy service, only `destroy` should
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        disposables.add(await firstPromise);
        disposables.add(await secondPromise);
        disposables.add(await thirdPromise);
    });
    test('destroy', async () => {
        const resource1 = URI.file('/test1.html');
        const resource2 = URI.file('/test2.html');
        const resource3 = URI.file('/test3.html');
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        const firstPromise = manager.resolve(resource1);
        const secondPromise = manager.resolve(resource2);
        const thirdPromise = manager.resolve(resource3);
        await Promise.all([firstPromise, secondPromise, thirdPromise]);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        assert.strictEqual(manager.workingCopies.length, 3);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.workingCopies.length, 0);
    });
    test('destroy saves dirty working copies', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        let saved = false;
        disposables.add(workingCopy.onDidSave(() => {
            saved = true;
        }));
        workingCopy.model?.updateContents('hello create');
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        assert.strictEqual(manager.workingCopies.length, 1);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(saved, true);
    });
    test('destroy falls back to using backup when save fails', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.setThrowOnSnapshot();
        let unexpectedSave = false;
        disposables.add(workingCopy.onDidSave(() => {
            unexpectedSave = true;
        }));
        workingCopy.model?.updateContents('hello create');
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        assert.strictEqual(manager.workingCopies.length, 1);
        assert.strictEqual(accessor.workingCopyBackupService.resolved.has(workingCopy), true);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(unexpectedSave, false);
    });
    test('file change event triggers working copy resolve', async () => {
        const resource = URI.file('/path/index.txt');
        await manager.resolve(resource);
        let didResolve = false;
        const onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('file change event triggers working copy resolve (when working copy is pending to resolve)', async () => {
        const resource = URI.file('/path/index.txt');
        manager.resolve(resource);
        let didResolve = false;
        let resolvedCounter = 0;
        const onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
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
    test('file system provider change triggers working copy resolve', async () => {
        const resource = URI.file('/path/index.txt');
        disposables.add(await manager.resolve(resource));
        let didResolve = false;
        const onDidResolve = new Promise((resolve) => {
            disposables.add(manager.onDidResolve(({ model }) => {
                if (model?.resource.toString() === resource.toString()) {
                    didResolve = true;
                    resolve();
                }
            }));
        });
        accessor.fileService.fireFileSystemProviderCapabilitiesChangeEvent({
            provider: disposables.add(new InMemoryFileSystemProvider()),
            scheme: resource.scheme,
        });
        await onDidResolve;
        assert.strictEqual(didResolve, true);
    });
    test('working copy file event handling: create', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.updateContents('hello create');
        assert.strictEqual(workingCopy.isDirty(), true);
        await accessor.workingCopyFileService.create([{ resource }], CancellationToken.None);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('working copy file event handling: move', () => {
        return testMoveCopyFileWorkingCopy(true);
    });
    test('working copy file event handling: copy', () => {
        return testMoveCopyFileWorkingCopy(false);
    });
    async function testMoveCopyFileWorkingCopy(move) {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/other.txt');
        const sourceWorkingCopy = await manager.resolve(source);
        sourceWorkingCopy.model?.updateContents('hello move or copy');
        assert.strictEqual(sourceWorkingCopy.isDirty(), true);
        if (move) {
            await accessor.workingCopyFileService.move([{ file: { source, target } }], CancellationToken.None);
        }
        else {
            await accessor.workingCopyFileService.copy([{ file: { source, target } }], CancellationToken.None);
        }
        const targetWorkingCopy = await manager.resolve(target);
        assert.strictEqual(targetWorkingCopy.isDirty(), true);
        assert.strictEqual(targetWorkingCopy.model?.contents, 'hello move or copy');
    }
    test('working copy file event handling: delete', async () => {
        const resource = URI.file('/path/source.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.updateContents('hello delete');
        assert.strictEqual(workingCopy.isDirty(), true);
        await accessor.workingCopyFileService.delete([{ resource }], CancellationToken.None);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('working copy file event handling: move to same resource', async () => {
        const source = URI.file('/path/source.txt');
        const sourceWorkingCopy = await manager.resolve(source);
        sourceWorkingCopy.model?.updateContents('hello move');
        assert.strictEqual(sourceWorkingCopy.isDirty(), true);
        await accessor.workingCopyFileService.move([{ file: { source, target: source } }], CancellationToken.None);
        assert.strictEqual(sourceWorkingCopy.isDirty(), true);
        assert.strictEqual(sourceWorkingCopy.model?.contents, 'hello move');
    });
    test('canDispose with dirty working copy', async () => {
        const resource = URI.file('/path/index_something.txt');
        const workingCopy = await manager.resolve(resource);
        workingCopy.model?.updateContents('make dirty');
        const canDisposePromise = manager.canDispose(workingCopy);
        assert.ok(canDisposePromise instanceof Promise);
        let canDispose = false;
        (async () => {
            canDispose = await canDisposePromise;
        })();
        assert.strictEqual(canDispose, false);
        workingCopy.revert({ soft: true });
        await timeout(0);
        assert.strictEqual(canDispose, true);
        const canDispose2 = manager.canDispose(workingCopy);
        assert.strictEqual(canDispose2, true);
    });
    (isWeb ? test.skip : test)('pending saves join on shutdown', async () => {
        const resource1 = URI.file('/path/index_something1.txt');
        const resource2 = URI.file('/path/index_something2.txt');
        const workingCopy1 = disposables.add(await manager.resolve(resource1));
        workingCopy1.model?.updateContents('make dirty');
        const workingCopy2 = disposables.add(await manager.resolve(resource2));
        workingCopy2.model?.updateContents('make dirty');
        let saved1 = false;
        workingCopy1.save().then(() => {
            saved1 = true;
        });
        let saved2 = false;
        workingCopy2.save().then(() => {
            saved2 = true;
        });
        const event = new TestWillShutdownEvent();
        accessor.lifecycleService.fireWillShutdown(event);
        assert.ok(event.value.length > 0);
        await Promise.all(event.value);
        assert.strictEqual(saved1, true);
        assert.strictEqual(saved2, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci9zdG9yZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQixxQkFBcUIsR0FDckIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sNEJBQTRCLEdBRzVCLE1BQU0sOENBQThDLENBQUE7QUFLckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sZ0JBQWdCLEVBRWhCLGtCQUFrQixHQUVsQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBRU4scUNBQXFDLEdBQ3JDLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsOEJBQThCLEVBQUUsR0FB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