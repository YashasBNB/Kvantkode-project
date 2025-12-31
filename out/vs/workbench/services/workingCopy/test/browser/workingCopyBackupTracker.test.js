/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { IEditorService } from '../../../editor/common/editorService.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { IWorkingCopyBackupService } from '../../common/workingCopyBackup.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { IFilesConfigurationService } from '../../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../common/workingCopyService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { UntitledTextEditorInput } from '../../../untitled/common/untitledTextEditorInput.js';
import { createEditorPart, InMemoryTestWorkingCopyBackupService, registerTestResourceEditor, TestServiceAccessor, toTypedWorkingCopyId, toUntypedWorkingCopyId, workbenchInstantiationService, workbenchTeardown, } from '../../../../test/browser/workbenchTestServices.js';
import { TestWorkingCopy } from '../../../../test/common/workbenchTestServices.js';
import { timeout } from '../../../../../base/common/async.js';
import { BrowserWorkingCopyBackupTracker } from '../../browser/workingCopyBackupTracker.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IWorkingCopyEditorService, } from '../../common/workingCopyEditorService.js';
import { bufferToReadable, VSBuffer } from '../../../../../base/common/buffer.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { Schemas } from '../../../../../base/common/network.js';
suite('WorkingCopyBackupTracker (browser)', function () {
    let accessor;
    const disposables = new DisposableStore();
    setup(() => {
        disposables.add(registerTestResourceEditor());
    });
    teardown(async () => {
        await workbenchTeardown(accessor.instantiationService);
        disposables.clear();
    });
    let TestWorkingCopyBackupTracker = class TestWorkingCopyBackupTracker extends BrowserWorkingCopyBackupTracker {
        constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, logService, workingCopyEditorService, editorService, editorGroupService) {
            super(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, logService, workingCopyEditorService, editorService, editorGroupService);
        }
        getBackupScheduleDelay() {
            return 10; // Reduce timeout for tests
        }
        get pendingBackupOperationCount() {
            return this.pendingBackupOperations.size;
        }
        getUnrestoredBackups() {
            return this.unrestoredBackups;
        }
        async testRestoreBackups(handler) {
            return super.restoreBackups(handler);
        }
    };
    TestWorkingCopyBackupTracker = __decorate([
        __param(0, IWorkingCopyBackupService),
        __param(1, IFilesConfigurationService),
        __param(2, IWorkingCopyService),
        __param(3, ILifecycleService),
        __param(4, ILogService),
        __param(5, IWorkingCopyEditorService),
        __param(6, IEditorService),
        __param(7, IEditorGroupsService)
    ], TestWorkingCopyBackupTracker);
    class TestUntitledTextEditorInput extends UntitledTextEditorInput {
        constructor() {
            super(...arguments);
            this.resolved = false;
        }
        resolve() {
            this.resolved = true;
            return super.resolve();
        }
    }
    async function createTracker() {
        const workingCopyBackupService = disposables.add(new InMemoryTestWorkingCopyBackupService());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IWorkingCopyBackupService, workingCopyBackupService);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        disposables.add(registerTestResourceEditor());
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const tracker = disposables.add(instantiationService.createInstance(TestWorkingCopyBackupTracker));
        return {
            accessor,
            part,
            tracker,
            workingCopyBackupService: workingCopyBackupService,
            instantiationService,
        };
    }
    async function untitledBackupTest(untitled = { resource: undefined }) {
        const { accessor, workingCopyBackupService } = await createTracker();
        const untitledTextEditor = disposables.add((await accessor.editorService.openEditor(untitled))?.input);
        const untitledTextModel = disposables.add(await untitledTextEditor.resolve());
        if (!untitled?.contents) {
            untitledTextModel.textEditorModel?.setValue('Super Good');
        }
        await workingCopyBackupService.joinBackupResource();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(untitledTextModel), true);
        untitledTextModel.dispose();
        await workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(untitledTextModel), false);
    }
    test('Track backups (untitled)', function () {
        return untitledBackupTest();
    });
    test('Track backups (untitled with initial contents)', function () {
        return untitledBackupTest({ resource: undefined, contents: 'Foo Bar' });
    });
    test('Track backups (custom)', async function () {
        const { accessor, tracker, workingCopyBackupService } = await createTracker();
        class TestBackupWorkingCopy extends TestWorkingCopy {
            constructor(resource) {
                super(resource);
                this.backupDelay = 10;
                disposables.add(accessor.workingCopyService.registerWorkingCopy(this));
            }
            async backup(token) {
                await timeout(0);
                return {};
            }
        }
        const resource = toResource.call(this, '/path/custom.txt');
        const customWorkingCopy = disposables.add(new TestBackupWorkingCopy(resource));
        // Normal
        customWorkingCopy.setDirty(true);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinBackupResource();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), true);
        customWorkingCopy.setDirty(false);
        customWorkingCopy.setDirty(true);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinBackupResource();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), true);
        customWorkingCopy.setDirty(false);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), false);
        // Cancellation
        customWorkingCopy.setDirty(true);
        await timeout(0);
        customWorkingCopy.setDirty(false);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(workingCopyBackupService.hasBackupSync(customWorkingCopy), false);
    });
    async function restoreBackupsInit() {
        const fooFile = URI.file(isWindows ? 'c:\\Foo' : '/Foo');
        const barFile = URI.file(isWindows ? 'c:\\Bar' : '/Bar');
        const untitledFile1 = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
        const untitledFile2 = URI.from({ scheme: Schemas.untitled, path: 'Untitled-2' });
        const workingCopyBackupService = disposables.add(new InMemoryTestWorkingCopyBackupService());
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        instantiationService.stub(IWorkingCopyBackupService, workingCopyBackupService);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        // Backup 2 normal files and 2 untitled files
        const untitledFile1WorkingCopyId = toUntypedWorkingCopyId(untitledFile1);
        const untitledFile2WorkingCopyId = toTypedWorkingCopyId(untitledFile2);
        await workingCopyBackupService.backup(untitledFile1WorkingCopyId, bufferToReadable(VSBuffer.fromString('untitled-1')));
        await workingCopyBackupService.backup(untitledFile2WorkingCopyId, bufferToReadable(VSBuffer.fromString('untitled-2')));
        const fooFileWorkingCopyId = toUntypedWorkingCopyId(fooFile);
        const barFileWorkingCopyId = toTypedWorkingCopyId(barFile);
        await workingCopyBackupService.backup(fooFileWorkingCopyId, bufferToReadable(VSBuffer.fromString('fooFile')));
        await workingCopyBackupService.backup(barFileWorkingCopyId, bufferToReadable(VSBuffer.fromString('barFile')));
        const tracker = disposables.add(instantiationService.createInstance(TestWorkingCopyBackupTracker));
        accessor.lifecycleService.phase = 3 /* LifecyclePhase.Restored */;
        return [tracker, accessor];
    }
    test('Restore backups (basics, some handled)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        assert.strictEqual(tracker.getUnrestoredBackups().size, 0);
        let handlesCounter = 0;
        let isOpenCounter = 0;
        let createEditorCounter = 0;
        await tracker.testRestoreBackups({
            handles: (workingCopy) => {
                handlesCounter++;
                return workingCopy.typeId === 'testBackupTypeId';
            },
            isOpen: (workingCopy, editor) => {
                isOpenCounter++;
                return false;
            },
            createEditor: (workingCopy) => {
                createEditorCounter++;
                return disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
            },
        });
        assert.strictEqual(handlesCounter, 4);
        assert.strictEqual(isOpenCounter, 0);
        assert.strictEqual(createEditorCounter, 2);
        assert.strictEqual(accessor.editorService.count, 2);
        assert.ok(accessor.editorService.editors.every((editor) => editor.isDirty()));
        assert.strictEqual(tracker.getUnrestoredBackups().size, 2);
        for (const editor of accessor.editorService.editors) {
            assert.ok(editor instanceof TestUntitledTextEditorInput);
            assert.strictEqual(editor.resolved, true);
        }
    });
    test('Restore backups (basics, none handled)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        await tracker.testRestoreBackups({
            handles: (workingCopy) => false,
            isOpen: (workingCopy, editor) => {
                throw new Error('unexpected');
            },
            createEditor: (workingCopy) => {
                throw new Error('unexpected');
            },
        });
        assert.strictEqual(accessor.editorService.count, 0);
        assert.strictEqual(tracker.getUnrestoredBackups().size, 4);
    });
    test('Restore backups (basics, error case)', async function () {
        const [tracker] = await restoreBackupsInit();
        try {
            await tracker.testRestoreBackups({
                handles: (workingCopy) => true,
                isOpen: (workingCopy, editor) => {
                    throw new Error('unexpected');
                },
                createEditor: (workingCopy) => {
                    throw new Error('unexpected');
                },
            });
        }
        catch (error) {
            // ignore
        }
        assert.strictEqual(tracker.getUnrestoredBackups().size, 4);
    });
    test('Restore backups (multiple handlers)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        const firstHandler = tracker.testRestoreBackups({
            handles: (workingCopy) => {
                return workingCopy.typeId === 'testBackupTypeId';
            },
            isOpen: (workingCopy, editor) => {
                return false;
            },
            createEditor: (workingCopy) => {
                return disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
            },
        });
        const secondHandler = tracker.testRestoreBackups({
            handles: (workingCopy) => {
                return workingCopy.typeId.length === 0;
            },
            isOpen: (workingCopy, editor) => {
                return false;
            },
            createEditor: (workingCopy) => {
                return disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
            },
        });
        await Promise.all([firstHandler, secondHandler]);
        assert.strictEqual(accessor.editorService.count, 4);
        assert.ok(accessor.editorService.editors.every((editor) => editor.isDirty()));
        assert.strictEqual(tracker.getUnrestoredBackups().size, 0);
        for (const editor of accessor.editorService.editors) {
            assert.ok(editor instanceof TestUntitledTextEditorInput);
            assert.strictEqual(editor.resolved, true);
        }
    });
    test('Restore backups (editors already opened)', async function () {
        const [tracker, accessor] = await restoreBackupsInit();
        assert.strictEqual(tracker.getUnrestoredBackups().size, 0);
        let handlesCounter = 0;
        let isOpenCounter = 0;
        const editor1 = disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
        const editor2 = disposables.add(accessor.instantiationService.createInstance(TestUntitledTextEditorInput, accessor.untitledTextEditorService.create({ initialValue: 'foo' })));
        await accessor.editorService.openEditors([{ editor: editor1 }, { editor: editor2 }]);
        editor1.resolved = false;
        editor2.resolved = false;
        await tracker.testRestoreBackups({
            handles: (workingCopy) => {
                handlesCounter++;
                return workingCopy.typeId === 'testBackupTypeId';
            },
            isOpen: (workingCopy, editor) => {
                isOpenCounter++;
                return true;
            },
            createEditor: (workingCopy) => {
                throw new Error('unexpected');
            },
        });
        assert.strictEqual(handlesCounter, 4);
        assert.strictEqual(isOpenCounter, 4);
        assert.strictEqual(accessor.editorService.count, 2);
        assert.strictEqual(tracker.getUnrestoredBackups().size, 2);
        for (const editor of accessor.editorService.editors) {
            assert.ok(editor instanceof TestUntitledTextEditorInput);
            // assert that we only call `resolve` on inactive editors
            if (accessor.editorService.isVisible(editor)) {
                assert.strictEqual(editor.resolved, false);
            }
            else {
                assert.strictEqual(editor.resolved, true);
            }
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9icm93c2VyL3dvcmtpbmdDb3B5QmFja3VwVHJhY2tlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzVHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0sd0NBQXdDLENBQUE7QUFFMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDN0YsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixvQ0FBb0MsRUFDcEMsMEJBQTBCLEVBQzFCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsc0JBQXNCLEVBQ3RCLDZCQUE2QixFQUM3QixpQkFBaUIs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