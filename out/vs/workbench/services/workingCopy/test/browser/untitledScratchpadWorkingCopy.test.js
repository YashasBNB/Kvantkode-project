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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRTY3JhdGNocGFkV29ya2luZ0NvcHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvdW50aXRsZWRTY3JhdGNocGFkV29ya2luZ0NvcHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUVOLFFBQVEsRUFDUixjQUFjLEVBQ2QsY0FBYyxFQUNkLGdCQUFnQixHQUVoQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixlQUFlLEVBQ2YsYUFBYSxFQUNiLFVBQVUsRUFDVixnQkFBZ0IsR0FDaEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUVOLHVCQUF1QixHQUN2QixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsTUFBTSxPQUFPLHVDQUF1QztJQUduRCxLQUFLLENBQUMsV0FBVyxDQUNo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