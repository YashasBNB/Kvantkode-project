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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2Jyb3dzZXIvd29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRXhFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDNUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG9DQUFvQyxFQUNwQywwQkFBMEIsRUFDMUIsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixzQkFBc0IsRUFDdEIsNkJBQTZCLEVBQzdCLGlCQUFpQixHQUNqQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxLQUFLLENBQUMsb0NBQW9DLEVBQUU7SUFDM0MsSUFBSSxRQUE2QixDQUFBO0lBQ2pDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFBO0lBQzlDLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ25CLE1BQU0saUJBQWlCLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFdEQsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSwrQkFBK0I7UUFDekUsWUFDNEIsd0JBQW1ELEVBQ2xELHlCQUFxRCxFQUM1RCxrQkFBdUMsRUFDekMsZ0JBQW1DLEVBQ3pDLFVBQXVCLEVBQ1Qsd0JBQW1ELEVBQzlELGFBQTZCLEVBQ3ZCLGtCQUF3QztZQUU5RCxLQUFLLENBQ0osd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLFVBQVUsRUFDVix3QkFBd0IsRUFDeEIsYUFBYSxFQUNiLGtCQUFrQixDQUNsQixDQUFBO1FBQ0YsQ0FBQztRQUVrQixzQkFBc0I7WUFDeEMsT0FBTyxFQUFFLENBQUEsQ0FBQywyQkFBMkI7UUFDdEMsQ0FBQztRQUVELElBQUksMkJBQTJCO1lBQzlCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQTtRQUN6QyxDQUFDO1FBRUQsb0JBQW9CO1lBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1FBQzlCLENBQUM7UUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBa0M7WUFDMUQsT0FBTyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JDLENBQUM7S0FDRCxDQUFBO0lBdENLLDRCQUE0QjtRQUUvQixXQUFBLHlCQUF5QixDQUFBO1FBQ3pCLFdBQUEsMEJBQTBCLENBQUE7UUFDMUIsV0FBQSxtQkFBbUIsQ0FBQTtRQUNuQixXQUFBLGlCQUFpQixDQUFBO1FBQ2pCLFdBQUEsV0FBVyxDQUFBO1FBQ1gsV0FBQSx5QkFBeUIsQ0FBQTtRQUN6QixXQUFBLGNBQWMsQ0FBQTtRQUNkLFdBQUEsb0JBQW9CLENBQUE7T0FUakIsNEJBQTRCLENBc0NqQztJQUVELE1BQU0sMkJBQTRCLFNBQVEsdUJBQXVCO1FBQWpFOztZQUNDLGFBQVEsR0FBRyxLQUFLLENBQUE7UUFPakIsQ0FBQztRQUxTLE9BQU87WUFDZixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQTtZQUVwQixPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2QixDQUFDO0tBQ0Q7SUFFRCxLQUFLLFVBQVUsYUFBYTtRQU8zQixNQUFNLHdCQUF3QixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxvQ0FBb0MsRUFBRSxDQUFDLENBQUE7UUFDNUYsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDbEYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFFOUUsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN0RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFckQsV0FBVyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFFN0MsTUFBTSxhQUFhLEdBQWtCLFdBQVcsQ0FBQyxHQUFHLENBQ25ELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQzdELENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBRXhELFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUVuRSxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FDakUsQ0FBQTtRQUVELE9BQU87WUFDTixRQUFRO1lBQ1IsSUFBSTtZQUNKLE9BQU87WUFDUCx3QkFBd0IsRUFBRSx3QkFBd0I7WUFDbEQsb0JBQW9CO1NBQ3BCLENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxVQUFVLGtCQUFrQixDQUNoQyxXQUE2QyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUU7UUFFcEUsTUFBTSxFQUFFLFFBQVEsRUFBRSx3QkFBd0IsRUFBRSxHQUFHLE1BQU0sYUFBYSxFQUFFLENBQUE7UUFFcEUsTUFBTSxrQkFBa0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN6QyxDQUFDLE1BQU0sUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFnQyxDQUNyRixDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUU3RSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3pCLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDMUQsQ0FBQztRQUVELE1BQU0sd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUVuRCxNQUFNLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRW5GLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRTNCLE1BQU0sd0JBQXdCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFRCxJQUFJLENBQUMsMEJBQTBCLEVBQUU7UUFDaEMsT0FBTyxrQkFBa0IsRUFBRSxDQUFBO0lBQzVCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdEQUFnRCxFQUFFO1FBQ3RELE9BQU8sa0JBQWtCLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBQ3hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUs7UUFDbkMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsR0FBRyxNQUFNLGFBQWEsRUFBRSxDQUFBO1FBRTdFLE1BQU0scUJBQXNCLFNBQVEsZUFBZTtZQUNsRCxZQUFZLFFBQWE7Z0JBQ3hCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFLUCxnQkFBVyxHQUFHLEVBQUUsQ0FBQTtnQkFIeEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUN2RSxDQUFDO1lBSVEsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUF3QjtnQkFDN0MsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRWhCLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztTQUNEO1FBRUQsTUFBTSxRQUFRLEdBQVEsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUMvRCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRTlFLFNBQVM7UUFDVCxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbkYsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUVuRixpQkFBaUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSx3QkFBd0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFcEYsZUFBZTtRQUNmLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoQyxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQixpQkFBaUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSx3QkFBd0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDckYsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsa0JBQWtCO1FBR2hDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQTtRQUNoRixNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUE7UUFFaEYsTUFBTSx3QkFBd0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksb0NBQW9DLEVBQUUsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ2xGLG9CQUFvQixDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO1FBRTlFLE1BQU0sSUFBSSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDdEUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXJELE1BQU0sYUFBYSxHQUFrQixXQUFXLENBQUMsR0FBRyxDQUNuRCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUM3RCxDQUFBO1FBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUV4RCxRQUFRLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFFbkUsNkNBQTZDO1FBQzdDLE1BQU0sMEJBQTBCLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDeEUsTUFBTSwwQkFBMEIsR0FBRyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUN0RSxNQUFNLHdCQUF3QixDQUFDLE1BQU0sQ0FDcEMsMEJBQTBCLEVBQzFCLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FDbkQsQ0FBQTtRQUNELE1BQU0sd0JBQXdCLENBQUMsTUFBTSxDQUNwQywwQkFBMEIsRUFDMUIsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUNuRCxDQUFBO1FBRUQsTUFBTSxvQkFBb0IsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1RCxNQUFNLG9CQUFvQixHQUFHLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzFELE1BQU0sd0JBQXdCLENBQUMsTUFBTSxDQUNwQyxvQkFBb0IsRUFDcEIsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUNoRCxDQUFBO1FBQ0QsTUFBTSx3QkFBd0IsQ0FBQyxNQUFNLENBQ3BDLG9CQUFvQixFQUNwQixnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQ2hELENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsQ0FDakUsQ0FBQTtRQUVELFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLGtDQUEwQixDQUFBO1FBRXpELE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLO1FBQ25ELE1BQU0sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxrQkFBa0IsRUFBRSxDQUFBO1FBRXRELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFELElBQUksY0FBYyxHQUFHLENBQUMsQ0FBQTtRQUN0QixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUE7UUFDckIsSUFBSSxtQkFBbUIsR0FBRyxDQUFDLENBQUE7UUFFM0IsTUFBTSxPQUFPLENBQUMsa0JBQWtCLENBQUM7WUFDaEMsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQ3hCLGNBQWMsRUFBRSxDQUFBO2dCQUVoQixPQUFPLFdBQVcsQ0FBQyxNQUFNLEtBQUssa0JBQWtCLENBQUE7WUFDakQsQ0FBQztZQUNELE1BQU0sRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDL0IsYUFBYSxFQUFFLENBQUE7Z0JBRWYsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1lBQ0QsWUFBWSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQzdCLG1CQUFtQixFQUFFLENBQUE7Z0JBRXJCLE9BQU8sV0FBVyxDQUFDLEdBQUcsQ0FDckIsUUFBUSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDM0MsMkJBQTJCLEVBQzNCLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDbEUsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLFlBQVksMkJBQTJCLENBQUMsQ0FBQTtZQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUs7UUFDbkQsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLGtCQUFrQixFQUFFLENBQUE7UUFFdEQsTUFBTSxPQUFPLENBQUMsa0JBQWtCLENBQUM7WUFDaEMsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxLQUFLO1lBQy9CLE1BQU0sRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUM5QixDQUFDO1lBQ0QsWUFBWSxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDOUIsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSztRQUNqRCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxrQkFBa0IsRUFBRSxDQUFBO1FBRTVDLElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxDQUFDLGtCQUFrQixDQUFDO2dCQUNoQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLElBQUk7Z0JBQzlCLE1BQU0sRUFBRSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsRUFBRTtvQkFDL0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDOUIsQ0FBQztnQkFDRCxZQUFZLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtvQkFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtnQkFDOUIsQ0FBQzthQUNELENBQUMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLFNBQVM7UUFDVixDQUFDO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0QsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSztRQUNoRCxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLEVBQUUsQ0FBQTtRQUV0RCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUM7WUFDL0MsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQ3hCLE9BQU8sV0FBVyxDQUFDLE1BQU0sS0FBSyxrQkFBa0IsQ0FBQTtZQUNqRCxDQUFDO1lBQ0QsTUFBTSxFQUFFLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUMvQixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxZQUFZLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDN0IsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUNyQixRQUFRLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMzQywyQkFBMkIsRUFDM0IsUUFBUSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNsRSxDQUNELENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ2hELE9BQU8sRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUN4QixPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1lBQ0QsTUFBTSxFQUFFLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUMvQixPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFDRCxZQUFZLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDN0IsT0FBTyxXQUFXLENBQUMsR0FBRyxDQUNyQixRQUFRLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMzQywyQkFBMkIsRUFDM0IsUUFBUSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNsRSxDQUNELENBQUE7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxRCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDckQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLFlBQVksMkJBQTJCLENBQUMsQ0FBQTtZQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDMUMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUs7UUFDckQsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLGtCQUFrQixFQUFFLENBQUE7UUFFdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFMUQsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1FBQ3RCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQTtRQUVyQixNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QixRQUFRLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMzQywyQkFBMkIsRUFDM0IsUUFBUSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNsRSxDQUNELENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM5QixRQUFRLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUMzQywyQkFBMkIsRUFDM0IsUUFBUSxDQUFDLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNsRSxDQUNELENBQUE7UUFFRCxNQUFNLFFBQVEsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXBGLE9BQU8sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3hCLE9BQU8sQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBRXhCLE1BQU0sT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ2hDLE9BQU8sRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUN4QixjQUFjLEVBQUUsQ0FBQTtnQkFFaEIsT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLGtCQUFrQixDQUFBO1lBQ2pELENBQUM7WUFDRCxNQUFNLEVBQUUsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQy9CLGFBQWEsRUFBRSxDQUFBO2dCQUVmLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELFlBQVksRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzlCLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVwQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFELEtBQUssTUFBTSxNQUFNLElBQUksUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNyRCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sWUFBWSwyQkFBMkIsQ0FBQyxDQUFBO1lBRXhELHlEQUF5RDtZQUN6RCxJQUFJLFFBQVEsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMzQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=