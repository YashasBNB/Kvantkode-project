/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { bufferToStream, VSBuffer } from '../../../../../base/common/buffer.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileWorkingCopyManager, } from '../../common/fileWorkingCopyManager.js';
import { NO_TYPE_ID } from '../../common/workingCopy.js';
import { TestStoredFileWorkingCopyModelFactory, } from './storedFileWorkingCopy.test.js';
import { TestUntitledFileWorkingCopyModelFactory, } from './untitledFileWorkingCopy.test.js';
import { TestInMemoryFileSystemProvider, TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
suite('UntitledFileWorkingCopyManager', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    let manager;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.fileService.registerProvider(Schemas.file, disposables.add(new TestInMemoryFileSystemProvider())));
        disposables.add(accessor.fileService.registerProvider(Schemas.vscodeRemote, disposables.add(new TestInMemoryFileSystemProvider())));
        manager = disposables.add(new FileWorkingCopyManager('testUntitledFileWorkingCopyType', new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
    });
    teardown(() => {
        for (const workingCopy of [
            ...manager.untitled.workingCopies,
            ...manager.stored.workingCopies,
        ]) {
            workingCopy.dispose();
        }
        disposables.clear();
    });
    test('basics', async () => {
        let createCounter = 0;
        disposables.add(manager.untitled.onDidCreate((e) => {
            createCounter++;
        }));
        let disposeCounter = 0;
        disposables.add(manager.untitled.onWillDispose((e) => {
            disposeCounter++;
        }));
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty((e) => {
            dirtyCounter++;
        }));
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.get(URI.file('/some/invalidPath')), undefined);
        assert.strictEqual(manager.untitled.get(URI.file('/some/invalidPath').with({ scheme: Schemas.untitled })), undefined);
        const workingCopy1 = await manager.untitled.resolve();
        const workingCopy2 = await manager.untitled.resolve();
        assert.strictEqual(workingCopy1.typeId, 'testUntitledFileWorkingCopyType');
        assert.strictEqual(workingCopy1.resource.scheme, Schemas.untitled);
        assert.strictEqual(createCounter, 2);
        assert.strictEqual(manager.untitled.get(workingCopy1.resource), workingCopy1);
        assert.strictEqual(manager.untitled.get(workingCopy2.resource), workingCopy2);
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 2);
        assert.strictEqual(manager.untitled.workingCopies.length, 2);
        assert.notStrictEqual(workingCopy1.resource.toString(), workingCopy2.resource.toString());
        for (const workingCopy of [workingCopy1, workingCopy2]) {
            assert.strictEqual(workingCopy.capabilities, 2 /* WorkingCopyCapabilities.Untitled */);
            assert.strictEqual(workingCopy.isDirty(), false);
            assert.strictEqual(workingCopy.isModified(), false);
            assert.ok(workingCopy.model);
        }
        workingCopy1.model?.updateContents('Hello World');
        assert.strictEqual(workingCopy1.isDirty(), true);
        assert.strictEqual(workingCopy1.isModified(), true);
        assert.strictEqual(dirtyCounter, 1);
        workingCopy1.model?.updateContents(''); // change to empty clears dirty/modified flags
        assert.strictEqual(workingCopy1.isDirty(), false);
        assert.strictEqual(workingCopy1.isModified(), false);
        assert.strictEqual(dirtyCounter, 2);
        workingCopy2.model?.fireContentChangeEvent({ isInitial: false });
        assert.strictEqual(workingCopy2.isDirty(), true);
        assert.strictEqual(workingCopy2.isModified(), true);
        assert.strictEqual(dirtyCounter, 3);
        workingCopy1.dispose();
        assert.strictEqual(manager.untitled.workingCopies.length, 1);
        assert.strictEqual(manager.untitled.get(workingCopy1.resource), undefined);
        workingCopy2.dispose();
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.get(workingCopy2.resource), undefined);
        assert.strictEqual(disposeCounter, 2);
    });
    test('dirty - scratchpads are never dirty', async () => {
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty((e) => {
            dirtyCounter++;
        }));
        const workingCopy1 = await manager.resolve({
            untitledResource: URI.from({ scheme: Schemas.untitled, path: `/myscratchpad` }),
            isScratchpad: true,
        });
        assert.strictEqual(workingCopy1.resource.scheme, Schemas.untitled);
        assert.strictEqual(manager.untitled.workingCopies.length, 1);
        workingCopy1.model?.updateContents('contents');
        assert.strictEqual(workingCopy1.isDirty(), false);
        assert.strictEqual(workingCopy1.isModified(), true);
        workingCopy1.model?.fireContentChangeEvent({ isInitial: true });
        assert.strictEqual(workingCopy1.isDirty(), false);
        assert.strictEqual(workingCopy1.isModified(), false);
        assert.strictEqual(dirtyCounter, 0);
        workingCopy1.dispose();
    });
    test('resolve - with initial value', async () => {
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty((e) => {
            dirtyCounter++;
        }));
        const workingCopy1 = await manager.untitled.resolve({
            contents: { value: bufferToStream(VSBuffer.fromString('Hello World')) },
        });
        assert.strictEqual(workingCopy1.isModified(), true);
        assert.strictEqual(workingCopy1.isDirty(), true);
        assert.strictEqual(dirtyCounter, 1);
        assert.strictEqual(workingCopy1.model?.contents, 'Hello World');
        workingCopy1.dispose();
        const workingCopy2 = await manager.untitled.resolve({
            contents: { value: bufferToStream(VSBuffer.fromString('Hello World')), markModified: true },
        });
        assert.strictEqual(workingCopy2.isModified(), true);
        assert.strictEqual(workingCopy2.isDirty(), true);
        assert.strictEqual(dirtyCounter, 2);
        assert.strictEqual(workingCopy2.model?.contents, 'Hello World');
        workingCopy2.dispose();
    });
    test('resolve - with initial value but markDirty: false', async () => {
        let dirtyCounter = 0;
        disposables.add(manager.untitled.onDidChangeDirty((e) => {
            dirtyCounter++;
        }));
        const workingCopy = await manager.untitled.resolve({
            contents: { value: bufferToStream(VSBuffer.fromString('Hello World')), markModified: false },
        });
        assert.strictEqual(workingCopy.isModified(), false);
        assert.strictEqual(workingCopy.isDirty(), false);
        assert.strictEqual(dirtyCounter, 0);
        assert.strictEqual(workingCopy.model?.contents, 'Hello World');
        workingCopy.dispose();
    });
    test('resolve begins counter from 1 for disposed untitled', async () => {
        const untitled1 = await manager.untitled.resolve();
        untitled1.dispose();
        const untitled1Again = disposables.add(await manager.untitled.resolve());
        assert.strictEqual(untitled1.resource.toString(), untitled1Again.resource.toString());
    });
    test('resolve - existing', async () => {
        let createCounter = 0;
        disposables.add(manager.untitled.onDidCreate((e) => {
            createCounter++;
        }));
        const workingCopy1 = await manager.untitled.resolve();
        assert.strictEqual(createCounter, 1);
        const workingCopy2 = await manager.untitled.resolve({ untitledResource: workingCopy1.resource });
        assert.strictEqual(workingCopy1, workingCopy2);
        assert.strictEqual(createCounter, 1);
        const workingCopy3 = await manager.untitled.resolve({
            untitledResource: URI.file('/invalid/untitled'),
        });
        assert.strictEqual(workingCopy3.resource.scheme, Schemas.untitled);
        workingCopy1.dispose();
        workingCopy2.dispose();
        workingCopy3.dispose();
    });
    test('resolve - untitled resource used for new working copy', async () => {
        const invalidUntitledResource = URI.file('my/untitled.txt');
        const validUntitledResource = invalidUntitledResource.with({ scheme: Schemas.untitled });
        const workingCopy1 = await manager.untitled.resolve({
            untitledResource: invalidUntitledResource,
        });
        assert.notStrictEqual(workingCopy1.resource.toString(), invalidUntitledResource.toString());
        const workingCopy2 = await manager.untitled.resolve({ untitledResource: validUntitledResource });
        assert.strictEqual(workingCopy2.resource.toString(), validUntitledResource.toString());
        workingCopy1.dispose();
        workingCopy2.dispose();
    });
    test('resolve - with associated resource', async () => {
        const workingCopy = await manager.untitled.resolve({
            associatedResource: { path: '/some/associated.txt' },
        });
        assert.strictEqual(workingCopy.hasAssociatedFilePath, true);
        assert.strictEqual(workingCopy.resource.path, '/some/associated.txt');
        workingCopy.dispose();
    });
    test('save - without associated resource', async () => {
        let savedEvent = undefined;
        disposables.add(manager.untitled.onDidSave((e) => {
            savedEvent = e;
        }));
        const workingCopy = await manager.untitled.resolve();
        workingCopy.model?.updateContents('Simple Save');
        accessor.fileDialogService.setPickFileToSave(URI.file('simple/file.txt'));
        const result = await workingCopy.save();
        assert.ok(result);
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        assert.strictEqual(savedEvent.source.toString(), workingCopy.resource.toString());
        assert.strictEqual(savedEvent.target.toString(), URI.file('simple/file.txt').toString());
        workingCopy.dispose();
    });
    test('save - with associated resource', async () => {
        let savedEvent = undefined;
        disposables.add(manager.untitled.onDidSave((e) => {
            savedEvent = e;
        }));
        const workingCopy = await manager.untitled.resolve({
            associatedResource: { path: '/some/associated.txt' },
        });
        workingCopy.model?.updateContents('Simple Save with associated resource');
        accessor.fileService.notExistsSet.set(URI.from({ scheme: Schemas.file, path: '/some/associated.txt' }), true);
        const result = await workingCopy.save();
        assert.ok(result);
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        assert.strictEqual(savedEvent.source.toString(), workingCopy.resource.toString());
        assert.strictEqual(savedEvent.target.toString(), URI.file('/some/associated.txt').toString());
        workingCopy.dispose();
    });
    test('save - with associated resource (asks to overwrite)', async () => {
        const workingCopy = await manager.untitled.resolve({
            associatedResource: { path: '/some/associated.txt' },
        });
        workingCopy.model?.updateContents('Simple Save with associated resource');
        let result = await workingCopy.save();
        assert.ok(!result); // not confirmed
        assert.strictEqual(manager.untitled.get(workingCopy.resource), workingCopy);
        accessor.dialogService.setConfirmResult({ confirmed: true });
        result = await workingCopy.save();
        assert.ok(result); // confirmed
        assert.strictEqual(manager.untitled.get(workingCopy.resource), undefined);
        workingCopy.dispose();
    });
    test('destroy', async () => {
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        await manager.untitled.resolve();
        await manager.untitled.resolve();
        await manager.untitled.resolve();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 3);
        assert.strictEqual(manager.untitled.workingCopies.length, 3);
        await manager.untitled.destroy();
        assert.strictEqual(accessor.workingCopyService.workingCopies.length, 0);
        assert.strictEqual(manager.untitled.workingCopies.length, 0);
    });
    test('manager with different types produce different URIs', async () => {
        try {
            manager = disposables.add(new FileWorkingCopyManager('someOtherUntitledTypeId', new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
            const untitled1OriginalType = disposables.add(await manager.untitled.resolve());
            const untitled1OtherType = disposables.add(await manager.untitled.resolve());
            assert.notStrictEqual(untitled1OriginalType.resource.toString(), untitled1OtherType.resource.toString());
        }
        finally {
            manager.destroy();
        }
    });
    test('manager without typeId produces backwards compatible URIs', async () => {
        try {
            manager = disposables.add(new FileWorkingCopyManager(NO_TYPE_ID, new TestStoredFileWorkingCopyModelFactory(), new TestUntitledFileWorkingCopyModelFactory(), accessor.fileService, accessor.lifecycleService, accessor.labelService, accessor.logService, accessor.workingCopyFileService, accessor.workingCopyBackupService, accessor.uriIdentityService, accessor.fileDialogService, accessor.filesConfigurationService, accessor.workingCopyService, accessor.notificationService, accessor.workingCopyEditorService, accessor.editorService, accessor.elevatedFileService, accessor.pathService, accessor.environmentService, accessor.dialogService, accessor.decorationsService, accessor.progressService));
            const result = disposables.add(await manager.untitled.resolve());
            assert.strictEqual(result.resource.scheme, Schemas.untitled);
            assert.ok(result.resource.path.length > 0);
            assert.strictEqual(result.resource.query, '');
            assert.strictEqual(result.resource.authority, '');
            assert.strictEqual(result.resource.fragment, '');
        }
        finally {
            manager.destroy();
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRGaWxlV29ya2luZ0NvcHlNYW5hZ2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3VudGl0bGVkRmlsZVdvcmtpbmdDb3B5TWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUEyQixNQUFNLDZCQUE2QixDQUFBO0FBQ2pGLE9BQU8sRUFFTixxQ0FBcUMsR0FDckMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBRU4sdUNBQXVDLEdBQ3ZDLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixtQkFBbUIsRUFDbkIsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtJQUM1QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksb0JBQTJDLENBQUE7SUFDL0MsSUFBSSxRQUE2QixDQUFBO0lBRWpD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QUE7UUFDdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUNqQixPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQ3RGLFNBQVMsQ0FDVCxDQUFBO1FBRUQsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3JELE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVyRCxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsaUNBQWlDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVsRSxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVwQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUU3RSxNQUFNLENBQUMsV0FBVyxDQUFD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