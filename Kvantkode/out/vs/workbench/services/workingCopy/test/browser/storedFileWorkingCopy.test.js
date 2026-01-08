/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { StoredFileWorkingCopy, isStoredFileWorkingCopySaveEvent, } from '../../common/storedFileWorkingCopy.js';
import { bufferToStream, newWriteableBufferStream, streamToBuffer, VSBuffer, } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { getLastResolvedFileStat, TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import { basename } from '../../../../../base/common/resources.js';
import { FileChangesEvent, FileOperationError, NotModifiedSinceFileOperationError, } from '../../../../../platform/files/common/files.js';
import { SaveSourceRegistry } from '../../../../common/editor.js';
import { Promises, timeout } from '../../../../../base/common/async.js';
import { consumeReadable, consumeStream, isReadableStream, } from '../../../../../base/common/stream.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { assertIsDefined } from '../../../../../base/common/types.js';
export class TestStoredFileWorkingCopyModel extends Disposable {
    constructor(resource, contents) {
        super();
        this.resource = resource;
        this.contents = contents;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.throwOnSnapshot = false;
        this.versionId = 0;
        this.pushedStackElement = false;
    }
    fireContentChangeEvent(event) {
        this._onDidChangeContent.fire(event);
    }
    updateContents(newContents) {
        this.doUpdate(newContents);
    }
    setThrowOnSnapshot() {
        this.throwOnSnapshot = true;
    }
    async snapshot(context, token) {
        if (this.throwOnSnapshot) {
            throw new Error('Fail');
        }
        const stream = newWriteableBufferStream();
        stream.end(VSBuffer.fromString(this.contents));
        return stream;
    }
    async update(contents, token) {
        this.doUpdate((await streamToBuffer(contents)).toString());
    }
    doUpdate(newContents) {
        this.contents = newContents;
        this.versionId++;
        this._onDidChangeContent.fire({ isRedoing: false, isUndoing: false });
    }
    pushStackElement() {
        this.pushedStackElement = true;
    }
    dispose() {
        this._onWillDispose.fire();
        super.dispose();
    }
}
export class TestStoredFileWorkingCopyModelWithCustomSave extends TestStoredFileWorkingCopyModel {
    constructor() {
        super(...arguments);
        this.saveCounter = 0;
        this.throwOnSave = false;
        this.saveOperation = undefined;
    }
    async save(options, token) {
        if (this.throwOnSave) {
            throw new Error('Fail');
        }
        if (this.saveOperation) {
            await this.saveOperation;
        }
        if (token.isCancellationRequested) {
            throw new Error('Canceled');
        }
        this.saveCounter++;
        return {
            resource: this.resource,
            ctime: 0,
            etag: '',
            isDirectory: false,
            isFile: true,
            mtime: 0,
            name: 'resource2',
            size: 0,
            isSymbolicLink: false,
            readonly: false,
            locked: false,
            children: undefined,
        };
    }
}
export class TestStoredFileWorkingCopyModelFactory {
    async createModel(resource, contents, token) {
        return new TestStoredFileWorkingCopyModel(resource, (await streamToBuffer(contents)).toString());
    }
}
export class TestStoredFileWorkingCopyModelWithCustomSaveFactory {
    async createModel(resource, contents, token) {
        return new TestStoredFileWorkingCopyModelWithCustomSave(resource, (await streamToBuffer(contents)).toString());
    }
}
suite('StoredFileWorkingCopy (with custom save)', function () {
    const factory = new TestStoredFileWorkingCopyModelWithCustomSaveFactory();
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let workingCopy;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const resource = URI.file('test/resource');
        workingCopy = disposables.add(new StoredFileWorkingCopy('testStoredFileWorkingCopyType', resource, basename(resource), factory, (options) => workingCopy.resolve(options), accessor.fileService, accessor.logService, accessor.workingCopyFileService, accessor.filesConfigurationService, accessor.workingCopyBackupService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService));
    });
    teardown(() => {
        disposables.clear();
    });
    test('save (custom implemented)', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // unresolved
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        // simple
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await workingCopy.save();
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
        assert.strictEqual(workingCopy.model.saveCounter, 1);
        // error
        workingCopy.model?.updateContents('hello save error');
        workingCopy.model.throwOnSave = true;
        await workingCopy.save();
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
    });
    test('save cancelled (custom implemented)', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        await workingCopy.resolve();
        let resolve;
        workingCopy.model.saveOperation =
            new Promise((r) => (resolve = r));
        workingCopy.model?.updateContents('first');
        const firstSave = workingCopy.save();
        // cancel the first save by requesting a second while it is still mid operation
        workingCopy.model?.updateContents('second');
        const secondSave = workingCopy.save();
        resolve();
        await firstSave;
        await secondSave;
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
        assert.strictEqual(workingCopy.model.saveCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('StoredFileWorkingCopy', function () {
    const factory = new TestStoredFileWorkingCopyModelFactory();
    const disposables = new DisposableStore();
    const resource = URI.file('test/resource');
    let instantiationService;
    let accessor;
    let workingCopy;
    function createWorkingCopy(uri = resource) {
        const workingCopy = new StoredFileWorkingCopy('testStoredFileWorkingCopyType', uri, basename(uri), factory, (options) => workingCopy.resolve(options), accessor.fileService, accessor.logService, accessor.workingCopyFileService, accessor.filesConfigurationService, accessor.workingCopyBackupService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.progressService);
        return workingCopy;
    }
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        workingCopy = disposables.add(createWorkingCopy());
    });
    teardown(() => {
        workingCopy.dispose();
        for (const workingCopy of accessor.workingCopyService.workingCopies) {
            ;
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('registers with working copy service', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        workingCopy.dispose();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
    });
    test('orphaned tracking', async () => {
        return runWithFakedTimers({}, async () => {
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
            let onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            onDidChangeOrphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.delete(resource);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 1 /* FileChangeType.ADDED */ }], false));
            await onDidChangeOrphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
        });
    });
    test('dirty / modified', async () => {
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        let changeDirtyCounter = 0;
        disposables.add(workingCopy.onDidChangeDirty(() => {
            changeDirtyCounter++;
        }));
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave(() => {
            savedCounter++;
        }));
        // Dirty from: Model content change
        workingCopy.model?.updateContents('hello dirty');
        assert.strictEqual(contentChangeCounter, 1);
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 1);
        await workingCopy.save();
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 2);
        assert.strictEqual(savedCounter, 1);
        // Dirty from: Initial contents
        await workingCopy.resolve({
            contents: bufferToStream(VSBuffer.fromString('hello dirty stream')),
        });
        assert.strictEqual(contentChangeCounter, 2); // content of model did not change
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 3);
        await workingCopy.revert({ soft: true });
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 4);
        // Modified from: API
        workingCopy.markModified();
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(changeDirtyCounter, 5);
        await workingCopy.revert();
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(changeDirtyCounter, 6);
    });
    test('dirty - working copy marks non-dirty when undo reaches saved version ID', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello saved state');
        await workingCopy.save();
        assert.strictEqual(workingCopy.isDirty(), false);
        workingCopy.model?.updateContents('changing content once');
        assert.strictEqual(workingCopy.isDirty(), true);
        // Simulate an undo that goes back to the last (saved) version ID
        workingCopy.model.versionId--;
        workingCopy.model?.fireContentChangeEvent({ isRedoing: false, isUndoing: true });
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('resolve (without backup)', async () => {
        let onDidResolveCounter = 0;
        disposables.add(workingCopy.onDidResolve(() => {
            onDidResolveCounter++;
        }));
        // resolve from file
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.strictEqual(onDidResolveCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
        // dirty resolve returns early
        workingCopy.model?.updateContents('hello resolve');
        assert.strictEqual(workingCopy.isDirty(), true);
        await workingCopy.resolve();
        assert.strictEqual(onDidResolveCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'hello resolve');
        // dirty resolve with contents updates contents
        await workingCopy.resolve({
            contents: bufferToStream(VSBuffer.fromString('hello initial contents')),
        });
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'hello initial contents');
        assert.strictEqual(onDidResolveCounter, 2);
        // resolve with pending save returns directly
        const pendingSave = workingCopy.save();
        await workingCopy.resolve();
        await pendingSave;
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello initial contents');
        assert.strictEqual(onDidResolveCounter, 2);
        // disposed resolve is not throwing an error
        workingCopy.dispose();
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(onDidResolveCounter, 2);
    });
    test('resolve (with backup)', async () => {
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello backup')) });
        const backup = await workingCopy.backup(CancellationToken.None);
        await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
        workingCopy.dispose();
        // first resolve loads from backup
        workingCopy = createWorkingCopy();
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello backup');
        workingCopy.model.updateContents('hello updated');
        await workingCopy.save();
        // subsequent resolve ignores any backups
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
    });
    test('resolve (with backup, preserves metadata and orphaned state)', async () => {
        return runWithFakedTimers({}, async () => {
            await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello backup')) });
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            const backup = await workingCopy.backup(CancellationToken.None);
            await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
            assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
            workingCopy.dispose();
            workingCopy = createWorkingCopy();
            await workingCopy.resolve();
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            const backup2 = await workingCopy.backup(CancellationToken.None);
            assert.deepStrictEqual(backup.meta, backup2.meta);
        });
    });
    test('resolve (updates orphaned state accordingly)', async () => {
        return runWithFakedTimers({}, async () => {
            await workingCopy.resolve();
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            // resolving clears orphaned state when successful
            accessor.fileService.notExistsSet.delete(resource);
            await workingCopy.resolve({ forceReadFromFile: true });
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
            // resolving adds orphaned state when fail to read
            try {
                accessor.fileService.readShouldThrowError = new FileOperationError('file not found', 1 /* FileOperationResult.FILE_NOT_FOUND */);
                await workingCopy.resolve();
                assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            }
            finally {
                accessor.fileService.readShouldThrowError = undefined;
            }
        });
    });
    test('stat.readonly and stat.locked can change when decreased mtime is ignored', async function () {
        await workingCopy.resolve();
        const stat = assertIsDefined(getLastResolvedFileStat(workingCopy));
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('error', {
                ...stat,
                mtime: stat.mtime - 1,
                readonly: !stat.readonly,
                locked: !stat.locked,
            });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(getLastResolvedFileStat(workingCopy)?.mtime, stat.mtime, 'mtime should not decrease');
        assert.notStrictEqual(getLastResolvedFileStat(workingCopy)?.readonly, stat.readonly, 'readonly should have changed despite simultaneous attempt to decrease mtime');
        assert.notStrictEqual(getLastResolvedFileStat(workingCopy)?.locked, stat.locked, 'locked should have changed despite simultaneous attempt to decrease mtime');
    });
    test('resolve (FILE_NOT_MODIFIED_SINCE can be handled for resolved working copies)', async () => {
        await workingCopy.resolve();
        try {
            accessor.fileService.readShouldThrowError = new FileOperationError('file not modified since', 2 /* FileOperationResult.FILE_NOT_MODIFIED_SINCE */);
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
    });
    test('resolve (FILE_NOT_MODIFIED_SINCE still updates readonly state)', async () => {
        let readonlyChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeReadonly(() => readonlyChangeCounter++));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isReadonly(), false);
        const stat = await accessor.fileService.resolve(workingCopy.resource, { resolveMetadata: true });
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: true });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(!!workingCopy.isReadonly(), true);
        assert.strictEqual(readonlyChangeCounter, 1);
        try {
            accessor.fileService.readShouldThrowError = new NotModifiedSinceFileOperationError('file not modified since', { ...stat, readonly: false });
            await workingCopy.resolve();
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(readonlyChangeCounter, 2);
    });
    test('resolve does not alter content when model content changed in parallel', async () => {
        await workingCopy.resolve();
        const resolvePromise = workingCopy.resolve();
        workingCopy.model?.updateContents('changed content');
        await resolvePromise;
        assert.strictEqual(workingCopy.isDirty(), true);
        assert.strictEqual(workingCopy.model?.contents, 'changed content');
    });
    test('backup', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        assert.ok(backup.meta);
        let backupContents = undefined;
        if (backup.content instanceof VSBuffer) {
            backupContents = backup.content.toString();
        }
        else if (isReadableStream(backup.content)) {
            backupContents = (await consumeStream(backup.content, (chunks) => VSBuffer.concat(chunks))).toString();
        }
        else if (backup.content) {
            backupContents = consumeReadable(backup.content, (chunks) => VSBuffer.concat(chunks)).toString();
        }
        assert.strictEqual(backupContents, 'hello backup');
    });
    test('save (no errors) - simple', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // unresolved
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        // simple
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await workingCopy.save();
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 1 /* SaveReason.EXPLICIT */);
        assert.ok(lastSaveEvent.stat);
        assert.ok(isStoredFileWorkingCopySaveEvent(lastSaveEvent));
        assert.strictEqual(workingCopy.model?.pushedStackElement, true);
    });
    test('save (no errors) - save reason', async () => {
        let savedCounter = 0;
        let lastSaveEvent = undefined;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
            lastSaveEvent = e;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // save reason
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        const source = SaveSourceRegistry.registerSource('testSource', 'Hello Save');
        await workingCopy.save({ reason: 2 /* SaveReason.AUTO */, source });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(lastSaveEvent.reason, 2 /* SaveReason.AUTO */);
        assert.strictEqual(lastSaveEvent.source, source);
    });
    test('save (no errors) - multiple', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // multiple saves in parallel are fine and result
        // in a single save when content does not change
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        await Promises.settled([
            workingCopy.save({ reason: 2 /* SaveReason.AUTO */ }),
            workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ }),
            workingCopy.save({ reason: 4 /* SaveReason.WINDOW_CHANGE */ }),
        ]);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - multiple, cancellation', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // multiple saves in parallel are fine and result
        // in just one save operation (the second one
        // cancels the first)
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello save');
        const firstSave = workingCopy.save();
        workingCopy.model?.updateContents('hello save more');
        const secondSave = workingCopy.save();
        await Promises.settled([firstSave, secondSave]);
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - not forced but not dirty', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // no save when not forced and not dirty
        await workingCopy.resolve();
        await workingCopy.save();
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - forced but not dirty', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave((e) => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        // save when forced even when not dirty
        await workingCopy.resolve();
        await workingCopy.save({ force: true });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 0);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (no errors) - save clears orphaned', async () => {
        return runWithFakedTimers({}, async () => {
            let savedCounter = 0;
            disposables.add(workingCopy.onDidSave((e) => {
                savedCounter++;
            }));
            let saveErrorCounter = 0;
            disposables.add(workingCopy.onDidSaveError(() => {
                saveErrorCounter++;
            }));
            await workingCopy.resolve();
            // save clears orphaned
            const orphanedPromise = Event.toPromise(workingCopy.onDidChangeOrphaned);
            accessor.fileService.notExistsSet.set(resource, true);
            accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 2 /* FileChangeType.DELETED */ }], false));
            await orphanedPromise;
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), true);
            await workingCopy.save({ force: true });
            assert.strictEqual(savedCounter, 1);
            assert.strictEqual(saveErrorCounter, 0);
            assert.strictEqual(workingCopy.isDirty(), false);
            assert.strictEqual(workingCopy.hasState(4 /* StoredFileWorkingCopyState.ORPHAN */), false);
        });
    });
    test('save (errors)', async () => {
        let savedCounter = 0;
        disposables.add(workingCopy.onDidSave((reason) => {
            savedCounter++;
        }));
        let saveErrorCounter = 0;
        disposables.add(workingCopy.onDidSaveError(() => {
            saveErrorCounter++;
        }));
        await workingCopy.resolve();
        // save error: any error marks working copy dirty
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.save({ force: true });
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save is a no-op unless forced when in error case
        await workingCopy.save({ reason: 2 /* SaveReason.AUTO */ });
        assert.strictEqual(savedCounter, 0);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save clears error flags when successful
        await workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 1);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        // save error: conflict
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error conflict', 3 /* FileOperationResult.FILE_MODIFIED_SINCE */);
            await workingCopy.save({ force: true });
        }
        catch (error) {
            // error is expected
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.strictEqual(savedCounter, 1);
        assert.strictEqual(saveErrorCounter, 2);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), true);
        assert.strictEqual(workingCopy.isDirty(), true);
        // save clears error flags when successful
        await workingCopy.save({ reason: 1 /* SaveReason.EXPLICIT */ });
        assert.strictEqual(savedCounter, 2);
        assert.strictEqual(saveErrorCounter, 2);
        assert.strictEqual(workingCopy.hasState(5 /* StoredFileWorkingCopyState.ERROR */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
        assert.strictEqual(workingCopy.hasState(3 /* StoredFileWorkingCopyState.CONFLICT */), false);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('save (errors, bubbles up with `ignoreErrorHandler`)', async () => {
        await workingCopy.resolve();
        let error = undefined;
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.save({ force: true, ignoreErrorHandler: true });
        }
        catch (e) {
            error = e;
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        assert.ok(error);
    });
    test('save - returns false when save fails', async function () {
        await workingCopy.resolve();
        try {
            accessor.fileService.writeShouldThrowError = new FileOperationError('write error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            const res = await workingCopy.save({ force: true });
            assert.strictEqual(res, false);
        }
        finally {
            accessor.fileService.writeShouldThrowError = undefined;
        }
        const res = await workingCopy.save({ force: true });
        assert.strictEqual(res, true);
    });
    test('save participant', async () => {
        await workingCopy.resolve();
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        let participationCounter = 0;
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc) => {
                if (workingCopy === wc) {
                    participationCounter++;
                }
            },
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true });
        assert.strictEqual(participationCounter, 1);
        await workingCopy.save({ force: true, skipSaveParticipants: true });
        assert.strictEqual(participationCounter, 1);
        disposable.dispose();
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        await workingCopy.save({ force: true });
        assert.strictEqual(participationCounter, 1);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (sync save)', async function () {
        await workingCopy.resolve();
        await testSaveFromSaveParticipant(workingCopy, false);
    });
    test('Save Participant, calling save from within is unsupported but does not explode (async save)', async function () {
        await workingCopy.resolve();
        await testSaveFromSaveParticipant(workingCopy, true);
    });
    async function testSaveFromSaveParticipant(workingCopy, async) {
        const from = URI.file('testFrom');
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc, context) => {
                if (async) {
                    await timeout(10);
                }
                await workingCopy.save({ force: true });
            },
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true, from });
        disposable.dispose();
    }
    test('Save Participant carries context', async function () {
        await workingCopy.resolve();
        const from = URI.file('testFrom');
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, false);
        let e = undefined;
        const disposable = accessor.workingCopyFileService.addSaveParticipant({
            participate: async (wc, context) => {
                try {
                    assert.strictEqual(context.reason, 1 /* SaveReason.EXPLICIT */);
                    assert.strictEqual(context.savedFrom?.toString(), from.toString());
                }
                catch (error) {
                    e = error;
                }
            },
        });
        assert.strictEqual(accessor.workingCopyFileService.hasSaveParticipants, true);
        await workingCopy.save({ force: true, from });
        if (e) {
            throw e;
        }
        disposable.dispose();
    });
    test('revert', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello revert');
        let revertedCounter = 0;
        disposables.add(workingCopy.onDidRevert(() => {
            revertedCounter++;
        }));
        // revert: soft
        await workingCopy.revert({ soft: true });
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.model?.contents, 'hello revert');
        // revert: not forced
        await workingCopy.revert();
        assert.strictEqual(revertedCounter, 1);
        assert.strictEqual(workingCopy.model?.contents, 'hello revert');
        // revert: forced
        await workingCopy.revert({ force: true });
        assert.strictEqual(revertedCounter, 2);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Html');
        // revert: forced, error
        try {
            workingCopy.model?.updateContents('hello revert');
            accessor.fileService.readShouldThrowError = new FileOperationError('error', 6 /* FileOperationResult.FILE_PERMISSION_DENIED */);
            await workingCopy.revert({ force: true });
        }
        catch (error) {
            // expected (our error)
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(revertedCounter, 2);
        assert.strictEqual(workingCopy.isDirty(), true);
        // revert: forced, file not found error is ignored
        try {
            workingCopy.model?.updateContents('hello revert');
            accessor.fileService.readShouldThrowError = new FileOperationError('error', 1 /* FileOperationResult.FILE_NOT_FOUND */);
            await workingCopy.revert({ force: true });
        }
        catch (error) {
            // expected (our error)
        }
        finally {
            accessor.fileService.readShouldThrowError = undefined;
        }
        assert.strictEqual(revertedCounter, 3);
        assert.strictEqual(workingCopy.isDirty(), false);
    });
    test('state', async () => {
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello state')) });
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        const savePromise = workingCopy.save();
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), true);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), false);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), true);
        await savePromise;
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
    });
    test('joinState', async () => {
        await workingCopy.resolve({ contents: bufferToStream(VSBuffer.fromString('hello state')) });
        workingCopy.save();
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), true);
        await workingCopy.joinState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */);
        assert.strictEqual(workingCopy.hasState(1 /* StoredFileWorkingCopyState.DIRTY */), false);
        assert.strictEqual(workingCopy.hasState(0 /* StoredFileWorkingCopyState.SAVED */), true);
        assert.strictEqual(workingCopy.hasState(2 /* StoredFileWorkingCopyState.PENDING_SAVE */), false);
    });
    test('isReadonly, isResolved, dispose, isDisposed', async () => {
        assert.strictEqual(workingCopy.isResolved(), false);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.isDisposed(), false);
        await workingCopy.resolve();
        assert.ok(workingCopy.model);
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(workingCopy.isDisposed(), false);
        let disposedEvent = false;
        disposables.add(workingCopy.onWillDispose(() => {
            disposedEvent = true;
        }));
        let disposedModelEvent = false;
        disposables.add(workingCopy.model.onWillDispose(() => {
            disposedModelEvent = true;
        }));
        workingCopy.dispose();
        assert.strictEqual(workingCopy.isDisposed(), true);
        assert.strictEqual(disposedEvent, true);
        assert.strictEqual(disposedModelEvent, true);
    });
    test('readonly change event', async () => {
        accessor.fileService.readonly = true;
        await workingCopy.resolve();
        assert.strictEqual(!!workingCopy.isReadonly(), true);
        accessor.fileService.readonly = false;
        let readonlyEvent = false;
        disposables.add(workingCopy.onDidChangeReadonly(() => {
            readonlyEvent = true;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isReadonly(), false);
        assert.strictEqual(readonlyEvent, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmVkRmlsZVdvcmtpbmdDb3B5LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvc3RvcmVkRmlsZVdvcmtpbmdDb3B5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFDTixxQkFBcUIsRUFLckIsZ0NBQWdDLEdBRWhDLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUNOLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsY0FBYyxFQUNkLFFBQVEsR0FFUixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixtQkFBbUIsRUFDbkIsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsa0JBQWtCLEVBSWxCLGtDQUFrQyxHQUNsQyxNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBYyxrQkFBa0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FB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