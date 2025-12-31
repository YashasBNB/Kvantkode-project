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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L3Rlc3QvYnJvd3Nlci9maWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQiw4QkFBOEIsR0FDOUIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBRU4scUNBQXFDLEdBQ3JDLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFFTixzQkFBc0IsR0FDdEIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBRU4sdUNBQXVDLEdBQ3ZDLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxJQUFJLG9CQUEyQyxDQUFBO0lBQy9DLElBQUksUUFBNkIsQ0FBQTtJQUVqQyxJQUFJLE9BR0gsQ0FBQTtJQUVELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDNUUsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRW5FLFFBQVEsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLDhCQUE4QixFQUFFLENBQUMsQ0FBQTtRQUN6RixRQUFRLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUNwQyxPQUFPLENBQUMsWUFBWSxFQUNwQixJQUFJLDhCQUE4QixFQUFFLENBQ3BDLENBQUE7UUFFRCxPQUFPLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDeEIsSUFBSSxzQkFBc0IsQ0FDekIseUJBQXlCLEVBQ3pCLElBQUkscUNBQXFDLEVBQUUsRUFDM0MsSUFBSSx1Q0FBdUMsRUFBRSxFQUM3QyxRQUFRLENBQUMsV0FBVyxFQUNwQixRQUFRLENBQUMsZ0JBQWdCLEVBQ3pCLFFBQVEsQ0FBQyxZQUFZLEVBQ3JCLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxzQkFBc0IsRUFDL0IsUUFBUSxDQUFDLHdCQUF3QixFQUNqQyxRQUFRLENBQUMsa0JBQWtCLEVBQzNCLFFBQVEsQ0FBQyxpQkFBaUIsRUFDMUIsUUFBUSxDQUFDLHlCQUF5QixFQUNsQyxRQUFRLENBQUMsa0JBQWtCLEVBQzNCLFFBQVEsQ0FBQyxtQkFBbUIsRUFDNUIsUUFBUSxDQUFDLHdCQUF3QixFQUNqQyxRQUFRLENBQUMsYUFBYSxFQUN0QixRQUFRLENBQUMsbUJBQW1CLEVBQzVCLFFBQVEsQ0FBQyxXQUFXLEVBQ3BCLFFBQVEsQ0FBQyxrQkFBa0IsRUFDM0IsUUFBUSxDQUFDLGFBQWEsRUFDdEIsUUFBUSxDQUFDLGtCQUFrQixFQUMzQixRQUFRLENBQUMsZUFBZSxDQUN4QixDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbEQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3pCLGFBQWEsRUFBRSxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sZUFBZSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0RCxNQUFNLHVCQUF1QixHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXZELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUUxRixNQUFNLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDM0UsTUFBTSwyQkFBMkIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNsRCxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUM3RSxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLDJCQUEyQixFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUIsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLFlBQVkscUJBQXFCLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBRTNGLE1BQU0sdUJBQXVCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsdUJBQXVCLFlBQVksdUJBQXVCLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsdUJBQXVCLENBQUMsUUFBUSxFQUFFLENBQUMsRUFDdEYsdUJBQXVCLENBQ3ZCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLEVBQ3ZELHVCQUF1QixDQUN2QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFdkUsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDckIsUUFBUSxFQUFFLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRTtTQUMxRSxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVELE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUVBQW1FLEVBQUUsR0FBRyxFQUFFO1FBQzlFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUzQyxPQUFPLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtRkFBbUYsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNwRyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTNDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3BELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdFQUF3RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMzQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFM0MsT0FBTyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFO1FBQzVFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUzQyxPQUFPLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRkFBaUYsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTNDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMzQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFM0MsT0FBTyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFO1FBQzVFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUzQyxPQUFPLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpRkFBaUYsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTNDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ25ELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMzQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFM0MsT0FBTyxjQUFjLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1FBQzFFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUUzQyxPQUFPLGNBQWMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvRUFBb0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDM0MsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTNDLE9BQU8sY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ2xELENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLGNBQWMsQ0FDNUIsTUFBVyxFQUNYLE1BQVcsRUFDWCxhQUFzQixFQUN0QixhQUFzQjtRQUV0QixJQUFJLGlCQUFpQixHQUNwQixTQUFTLENBQUE7UUFDVixJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDbEUsaUJBQWlCLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUN0RCxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksaUJBQWlCLEdBQ3BCLFNBQVMsQ0FBQTtRQUNWLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsaUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUNsRSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNuRCxJQUFJLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNqRixxRUFBcUU7WUFDckUsd0VBQXdFO1lBQ3hFLHNFQUFzRTtZQUN0RSx3QkFBd0I7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxhQUFhLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNuRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxRQUFRLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDaEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7Z0JBQ25FLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksYUFBYSxFQUFFLENBQUM7WUFDbkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN4RCxDQUFDO1FBRUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3hELENBQUM7UUFFRCxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVELElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDNUQsV0FBVyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUVuRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDMUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXBELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQXdDLENBQUEsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV6RSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDL0QsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDbEMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsRUFBRSxDQUFDLENBQy9FLENBQUE7UUFDRCxXQUFXLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFBO1FBRTVFLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBRS9FLFFBQVEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLENBQUMsTUFBTSxFQUFFLEtBQXdDLENBQUEsQ0FBQyxRQUFRLEVBQzFELHlDQUF5QyxDQUN6QyxDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFekUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BFLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUM1RCxXQUFXLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUMxQyxNQUFNLHFCQUFxQixHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzRCxRQUFRLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFcEQsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtRQUVqRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLEtBQXdDLENBQUEsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUV6RSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7SUFDbEIsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=