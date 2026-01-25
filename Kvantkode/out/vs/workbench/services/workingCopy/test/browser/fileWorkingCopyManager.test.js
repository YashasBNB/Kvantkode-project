/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor, TestInMemoryFileSystemProvider, } from '../../../../test/browser/workbenchTestServices.js';
import { StoredFileWorkingCopy, } from '../../common/storedFileWorkingCopy.js';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { TestStoredFileWorkingCopyModelFactory, } from './storedFileWorkingCopy.test.js';
import { Schemas } from '../../../../../base/common/network.js';
import { FileWorkingCopyManager, } from '../../common/fileWorkingCopyManager.js';
import { TestUntitledFileWorkingCopyModelFactory, } from './untitledFileWorkingCopy.test.js';
import { UntitledFileWorkingCopy } from '../../common/untitledFileWorkingCopy.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('FileWorkingCopyManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let manager;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.fileService.registerProvider(Schemas.file, new TestInMemoryFileSystemProvider());
        accessor.fileService.registerProvider(Schemas.vscodeRemote, new TestInMemoryFileSystemProvider());
        manager = disposables.add(new FileWorkingCopyManager('testFileWorkingCopyType', new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
    });
    teardown(() => {
        disposables.clear();
    });
    test('onDidCreate, get, workingCopies', async () => {
        let createCounter = 0;
        disposables.add(manager.onDidCreate((e) => {
            createCounter++;
        }));
        const fileUri = URI.file('/test.html');
        assert.strictEqual(manager.workingCopies.length, 0);
        assert.strictEqual(manager.get(fileUri), undefined);
        const fileWorkingCopy = await manager.resolve(fileUri);
        const untitledFileWorkingCopy = await manager.resolve();
        assert.strictEqual(manager.workingCopies.length, 2);
        assert.strictEqual(createCounter, 2);
        assert.strictEqual(manager.get(fileWorkingCopy.resource), fileWorkingCopy);
        assert.strictEqual(manager.get(untitledFileWorkingCopy.resource), untitledFileWorkingCopy);
        const sameFileWorkingCopy = disposables.add(await manager.resolve(fileUri));
        const sameUntitledFileWorkingCopy = disposables.add(await manager.resolve({ untitledResource: untitledFileWorkingCopy.resource }));
        assert.strictEqual(sameFileWorkingCopy, fileWorkingCopy);
        assert.strictEqual(sameUntitledFileWorkingCopy, untitledFileWorkingCopy);
        assert.strictEqual(manager.workingCopies.length, 2);
        assert.strictEqual(createCounter, 2);
    });
    test('resolve', async () => {
        const fileWorkingCopy = disposables.add(await manager.resolve(URI.file('/test.html')));
        assert.ok(fileWorkingCopy instanceof StoredFileWorkingCopy);
        assert.strictEqual(await manager.stored.resolve(fileWorkingCopy.resource), fileWorkingCopy);
        const untitledFileWorkingCopy = disposables.add(await manager.resolve());
        assert.ok(untitledFileWorkingCopy instanceof UntitledFileWorkingCopy);
        assert.strictEqual(await manager.untitled.resolve({ untitledResource: untitledFileWorkingCopy.resource }), untitledFileWorkingCopy);
        assert.strictEqual(await manager.resolve(untitledFileWorkingCopy.resource), untitledFileWorkingCopy);
    });
    test('destroy', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        await manager.resolve(URI.file('/test.html'));
        await manager.resolve({
            contents: { value: bufferToStream(VSBuffer.fromString('Hello Untitled')) },
        });
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 2);
        assert.strictEqual(manager.stored.workingCopies.length, 1);
        assert.strictEqual(manager.untitled.workingCopies.length, 1);
        await manager.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.stored.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
    });
    test('saveAs - file (same target, unresolved source, unresolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, false, false);
    });
    test('saveAs - file (same target, different case, unresolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/SOURCE.txt');
        return testSaveAsFile(source, target, false, false);
    });
    test('saveAs - file (different target, unresolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, false, false);
    });
    test('saveAs - file (same target, resolved source, unresolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, true, false);
    });
    test('saveAs - file (same target, different case, resolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/SOURCE.txt');
        return testSaveAsFile(source, target, true, false);
    });
    test('saveAs - file (different target, resolved source, unresolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, true, false);
    });
    test('saveAs - file (same target, unresolved source, resolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, false, true);
    });
    test('saveAs - file (same target, different case, unresolved source, resolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/SOURCE.txt');
        return testSaveAsFile(source, target, false, true);
    });
    test('saveAs - file (different target, unresolved source, resolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, false, true);
    });
    test('saveAs - file (same target, resolved source, resolved target)', () => {
        const source = URI.file('/path/source.txt');
        return testSaveAsFile(source, source, true, true);
    });
    test('saveAs - file (different target, resolved source, resolved target)', async () => {
        const source = URI.file('/path/source.txt');
        const target = URI.file('/path/target.txt');
        return testSaveAsFile(source, target, true, true);
    });
    async function testSaveAsFile(source, target, resolveSource, resolveTarget) {
        let sourceWorkingCopy = undefined;
        if (resolveSource) {
            sourceWorkingCopy = disposables.add(await manager.resolve(source));
            sourceWorkingCopy.model?.updateContents('hello world');
            assert.ok(sourceWorkingCopy.isDirty());
        }
        let targetWorkingCopy = undefined;
        if (resolveTarget) {
            targetWorkingCopy = disposables.add(await manager.resolve(target));
            targetWorkingCopy.model?.updateContents('hello world');
            assert.ok(targetWorkingCopy.isDirty());
        }
        const result = await manager.saveAs(source, target);
        if (accessor.uriIdentityService.extUri.isEqual(source, target) && resolveSource) {
            // if the uris are considered equal (different case on macOS/Windows)
            // and the source is to be resolved, the resulting working copy resource
            // will be the source resource because we consider file working copies
            // the same in that case
            assert.strictEqual(source.toString(), result?.resource.toString());
        }
        else {
            if (resolveSource || resolveTarget) {
                assert.strictEqual(target.toString(), result?.resource.toString());
            }
            else {
                if (accessor.uriIdentityService.extUri.isEqual(source, target)) {
                    assert.strictEqual(undefined, result);
                }
                else {
                    assert.strictEqual(target.toString(), result?.resource.toString());
                }
            }
        }
        if (resolveSource) {
            assert.strictEqual(sourceWorkingCopy?.isDirty(), false);
        }
        if (resolveTarget) {
            assert.strictEqual(targetWorkingCopy?.isDirty(), false);
        }
        result?.dispose();
    }
    test('saveAs - untitled (without associated resource)', async () => {
        const workingCopy = disposables.add(await manager.resolve());
        workingCopy.model?.updateContents('Simple Save As');
        const target = URI.file('simple/file.txt');
        accessor.fileDialogService.setPickFileToSave(target);
        const result = await manager.saveAs(workingCopy.resource, undefined);
        assert.strictEqual(result?.resource.toString(), target.toString());
        assert.strictEqual((result?.model).contents, 'Simple Save As');
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        result?.dispose();
    });
    test('saveAs - untitled (with associated resource)', async () => {
        const workingCopy = disposables.add(await manager.resolve({ associatedResource: { path: '/some/associated.txt' } }));
        workingCopy.model?.updateContents('Simple Save As with associated resource');
        const target = URI.from({ scheme: Schemas.file, path: '/some/associated.txt' });
        accessor.fileService.notExistsSet.set(target, true);
        const result = await manager.saveAs(workingCopy.resource, undefined);
        assert.strictEqual(result?.resource.toString(), target.toString());
        assert.strictEqual((result?.model).contents, 'Simple Save As with associated resource');
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        result?.dispose();
    });
    test('saveAs - untitled (target exists and is resolved)', async () => {
        const workingCopy = disposables.add(await manager.resolve());
        workingCopy.model?.updateContents('Simple Save As');
        const target = URI.file('simple/file.txt');
        const targetFileWorkingCopy = await manager.resolve(target);
        accessor.fileDialogService.setPickFileToSave(target);
        const result = await manager.saveAs(workingCopy.resource, undefined);
        assert.strictEqual(result, targetFileWorkingCopy);
        assert.strictEqual((result?.model).contents, 'Simple Save As');
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        result?.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL2ZpbGVXb3JraW5nQ29weU1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLDhCQUE4QixHQUM5QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFFTixxQ0FBcUMsR0FDckMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFFTix1Q0FBdUMsR0FDdkMsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksb0JB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