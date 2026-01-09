/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer, streamToBuffer, bufferToStream, readableToBuffer, } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename } from '../../../../../base/common/resources.js';
import { consumeReadable, consumeStream, isReadable, isReadableStream, } from '../../../../../base/common/stream.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { UntitledFileWorkingCopy, } from '../../common/untitledFileWorkingCopy.js';
import { TestUntitledFileWorkingCopyModel } from './untitledFileWorkingCopy.test.js';
import { TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
export class TestUntitledFileWorkingCopyModelFactory {
    async createModel(resource, contents, token) {
        return new TestUntitledFileWorkingCopyModel(resource, (await streamToBuffer(contents)).toString());
    }
}
suite('UntitledScratchpadWorkingCopy', () => {
    const factory = new TestUntitledFileWorkingCopyModelFactory();
    const disposables = new DisposableStore();
    const resource = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
    let instantiationService;
    let accessor;
    let workingCopy;
    function createWorkingCopy(uri = resource, hasAssociatedFilePath = false, initialValue = '') {
        return disposables.add(new UntitledFileWorkingCopy('testUntitledWorkingCopyType', uri, basename(uri), hasAssociatedFilePath, true, initialValue.length > 0
            ? { value: bufferToStream(VSBuffer.fromString(initialValue)) }
            : undefined, factory, async (workingCopy) => {
            await workingCopy.revert();
            return true;
        }, accessor.workingCopyService, accessor.workingCopyBackupService, accessor.logService));
    }
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        workingCopy = disposables.add(createWorkingCopy());
    });
    teardown(() => {
        disposables.clear();
    });
    test('registers with working copy service', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 1);
        workingCopy.dispose();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
    });
    test('modified - not dirty', async () => {
        assert.strictEqual(workingCopy.isDirty(), false);
        let changeDirtyCounter = 0;
        disposables.add(workingCopy.onDidChangeDirty(() => {
            changeDirtyCounter++;
        }));
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        // Modified from: Model content change
        workingCopy.model?.updateContents('hello modified');
        assert.strictEqual(contentChangeCounter, 1);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(changeDirtyCounter, 0);
        await workingCopy.save();
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(changeDirtyCounter, 0);
    });
    test('modified - cleared when content event signals isEmpty', async () => {
        assert.strictEqual(workingCopy.isModified(), false);
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello modified');
        assert.strictEqual(workingCopy.isModified(), true);
        workingCopy.model?.fireContentChangeEvent({ isInitial: true });
        assert.strictEqual(workingCopy.isModified(), false);
    });
    test('modified - not cleared when content event signals isEmpty when associated resource', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, true);
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello modified');
        assert.strictEqual(workingCopy.isModified(), true);
        workingCopy.model?.fireContentChangeEvent({ isInitial: true });
        assert.strictEqual(workingCopy.isModified(), true);
    });
    test('revert', async () => {
        let revertCounter = 0;
        disposables.add(workingCopy.onDidRevert(() => {
            revertCounter++;
        }));
        let disposeCounter = 0;
        disposables.add(workingCopy.onWillDispose(() => {
            disposeCounter++;
        }));
        await workingCopy.resolve();
        workingCopy.model?.updateContents('hello modified');
        assert.strictEqual(workingCopy.isModified(), true);
        await workingCopy.revert();
        assert.strictEqual(revertCounter, 1);
        assert.strictEqual(disposeCounter, 1);
        assert.strictEqual(workingCopy.isModified(), false);
    });
    test('dispose', async () => {
        let disposeCounter = 0;
        disposables.add(workingCopy.onWillDispose(() => {
            disposeCounter++;
        }));
        await workingCopy.resolve();
        workingCopy.dispose();
        assert.strictEqual(disposeCounter, 1);
    });
    test('backup', async () => {
        assert.strictEqual((await workingCopy.backup(CancellationToken.None)).content, undefined);
        await workingCopy.resolve();
        workingCopy.model?.updateContents('Hello Backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        let backupContents = undefined;
        if (isReadableStream(backup.content)) {
            backupContents = (await consumeStream(backup.content, (chunks) => VSBuffer.concat(chunks))).toString();
        }
        else if (backup.content) {
            backupContents = consumeReadable(backup.content, (chunks) => VSBuffer.concat(chunks)).toString();
        }
        assert.strictEqual(backupContents, 'Hello Backup');
    });
    test('resolve - without contents', async () => {
        assert.strictEqual(workingCopy.isResolved(), false);
        assert.strictEqual(workingCopy.hasAssociatedFilePath, false);
        assert.strictEqual(workingCopy.model, undefined);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isResolved(), true);
        assert.ok(workingCopy.model);
    });
    test('resolve - with initial contents', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, false, 'Hello Initial');
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        assert.strictEqual(workingCopy.isModified(), true);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Initial');
        assert.strictEqual(contentChangeCounter, 1);
        workingCopy.model.updateContents('Changed contents');
        await workingCopy.resolve(); // second resolve should be ignored
        assert.strictEqual(workingCopy.model?.contents, 'Changed contents');
    });
    test('backup - with initial contents uses those even if unresolved', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, false, 'Hello Initial');
        assert.strictEqual(workingCopy.isModified(), true);
        const backup = (await workingCopy.backup(CancellationToken.None)).content;
        if (isReadableStream(backup)) {
            const value = await streamToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello Initial');
        }
        else if (isReadable(backup)) {
            const value = readableToBuffer(backup);
            assert.strictEqual(value.toString(), 'Hello Initial');
        }
        else {
            assert.fail('Missing untitled backup');
        }
    });
    test('resolve - with associated resource', async () => {
        workingCopy.dispose();
        workingCopy = createWorkingCopy(resource, true);
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.hasAssociatedFilePath, true);
    });
    test('resolve - with backup', async () => {
        await workingCopy.resolve();
        workingCopy.model?.updateContents('Hello Backup');
        const backup = await workingCopy.backup(CancellationToken.None);
        await accessor.workingCopyBackupService.backup(workingCopy, backup.content, undefined, backup.meta);
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(workingCopy), true);
        workingCopy.dispose();
        workingCopy = createWorkingCopy();
        let contentChangeCounter = 0;
        disposables.add(workingCopy.onDidChangeContent(() => {
            contentChangeCounter++;
        }));
        await workingCopy.resolve();
        assert.strictEqual(workingCopy.isModified(), true);
        assert.strictEqual(workingCopy.model?.contents, 'Hello Backup');
        assert.strictEqual(contentChangeCounter, 1);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRTY3JhdGNocGFkV29ya2luZ0NvcHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci91bnRpdGxlZFNjcmF0Y2hwYWRXb3JraW5nQ29weS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBRU4sUUFBUSxFQUNSLGNBQWMsRUFDZCxjQUFjLEVBQ2QsZ0JBQWdCLEdBRWhCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUNOLGVBQWUsRUFDZixhQUFhLEVBQ2IsVUFBVSxFQUNWLGdCQUFnQixHQUNoQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxNQUFNLE9BQU8sdUNBQXVDO0lB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