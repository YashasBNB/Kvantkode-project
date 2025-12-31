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
import { isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { join } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { hash } from '../../../../../base/common/hash.js';
import { NativeWorkingCopyBackupTracker } from '../../electron-sandbox/workingCopyBackupTracker.js';
import { IEditorService } from '../../../editor/common/editorService.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
import { EditorService } from '../../../editor/browser/editorService.js';
import { IWorkingCopyBackupService } from '../../common/workingCopyBackup.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { IFilesConfigurationService } from '../../../filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../common/workingCopyService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { HotExitConfiguration } from '../../../../../platform/files/common/files.js';
import { ILifecycleService } from '../../../lifecycle/common/lifecycle.js';
import { IFileDialogService, IDialogService, } from '../../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { INativeHostService } from '../../../../../platform/native/common/native.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { createEditorPart, registerTestFileEditor, TestBeforeShutdownEvent, TestEnvironmentService, TestFilesConfigurationService, TestFileService, TestTextResourceConfigurationService, workbenchTeardown, } from '../../../../test/browser/workbenchTestServices.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { TestWorkspace, Workspace, } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IWorkingCopyEditorService } from '../../common/workingCopyEditorService.js';
import { TestContextService, TestMarkerService, TestWorkingCopy, } from '../../../../test/common/workbenchTestServices.js';
import { Event, Emitter } from '../../../../../base/common/event.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { Schemas } from '../../../../../base/common/network.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
suite('WorkingCopyBackupTracker (native)', function () {
    let TestWorkingCopyBackupTracker = class TestWorkingCopyBackupTracker extends NativeWorkingCopyBackupTracker {
        constructor(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, fileDialogService, dialogService, contextService, nativeHostService, logService, editorService, environmentService, progressService, workingCopyEditorService, editorGroupService) {
            super(workingCopyBackupService, filesConfigurationService, workingCopyService, lifecycleService, fileDialogService, dialogService, contextService, nativeHostService, logService, environmentService, progressService, workingCopyEditorService, editorService, editorGroupService);
            this._onDidResume = this._register(new Emitter());
            this.onDidResume = this._onDidResume.event;
            this._onDidSuspend = this._register(new Emitter());
            this.onDidSuspend = this._onDidSuspend.event;
        }
        getBackupScheduleDelay() {
            return 10; // Reduce timeout for tests
        }
        waitForReady() {
            return this.whenReady;
        }
        get pendingBackupOperationCount() {
            return this.pendingBackupOperations.size;
        }
        dispose() {
            super.dispose();
            for (const [_, pending] of this.pendingBackupOperations) {
                pending.cancel();
                pending.disposable.dispose();
            }
        }
        suspendBackupOperations() {
            const { resume } = super.suspendBackupOperations();
            this._onDidSuspend.fire();
            return {
                resume: () => {
                    resume();
                    this._onDidResume.fire();
                },
            };
        }
    };
    TestWorkingCopyBackupTracker = __decorate([
        __param(0, IWorkingCopyBackupService),
        __param(1, IFilesConfigurationService),
        __param(2, IWorkingCopyService),
        __param(3, ILifecycleService),
        __param(4, IFileDialogService),
        __param(5, IDialogService),
        __param(6, IWorkspaceContextService),
        __param(7, INativeHostService),
        __param(8, ILogService),
        __param(9, IEditorService),
        __param(10, IEnvironmentService),
        __param(11, IProgressService),
        __param(12, IWorkingCopyEditorService),
        __param(13, IEditorGroupsService)
    ], TestWorkingCopyBackupTracker);
    let testDir;
    let backupHome;
    let workspaceBackupPath;
    let accessor;
    const disposables = new DisposableStore();
    setup(async () => {
        testDir = URI.file(join(generateUuid(), 'vsctests', 'workingcopybackuptracker')).with({
            scheme: Schemas.inMemory,
        });
        backupHome = joinPath(testDir, 'Backups');
        const workspacesJsonPath = joinPath(backupHome, 'workspaces.json');
        const workspaceResource = URI.file(isWindows ? 'c:\\workspace' : '/workspace').with({
            scheme: Schemas.inMemory,
        });
        workspaceBackupPath = joinPath(backupHome, hash(workspaceResource.toString()).toString(16));
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
        disposables.add(registerTestFileEditor());
        await accessor.fileService.createFolder(backupHome);
        await accessor.fileService.createFolder(workspaceBackupPath);
        return accessor.fileService.writeFile(workspacesJsonPath, VSBuffer.fromString(''));
    });
    teardown(() => {
        disposables.clear();
    });
    async function createTracker(autoSaveEnabled = false) {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const configurationService = new TestConfigurationService();
        if (autoSaveEnabled) {
            configurationService.setUserConfiguration('files', {
                autoSave: 'afterDelay',
                autoSaveDelay: 1,
            });
        }
        else {
            configurationService.setUserConfiguration('files', { autoSave: 'off', autoSaveDelay: 1 });
        }
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFilesConfigurationService, disposables.add(new TestFilesConfigurationService(instantiationService.createInstance(MockContextKeyService), configurationService, new TestContextService(TestWorkspace), TestEnvironmentService, disposables.add(new UriIdentityService(disposables.add(new TestFileService()))), disposables.add(new TestFileService()), new TestMarkerService(), new TestTextResourceConfigurationService(configurationService))));
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        const tracker = instantiationService.createInstance(TestWorkingCopyBackupTracker);
        const cleanup = async () => {
            await accessor.workingCopyBackupService.waitForAllBackups(); // File changes could also schedule some backup operations so we need to wait for them before finishing the test
            await workbenchTeardown(instantiationService);
            part.dispose();
            tracker.dispose();
        };
        return { accessor, part, tracker, instantiationService, cleanup };
    }
    test('Track backups (file, auto save off)', function () {
        return trackBackupsTest(toResource.call(this, '/path/index.txt'), false);
    });
    test('Track backups (file, auto save on)', function () {
        return trackBackupsTest(toResource.call(this, '/path/index.txt'), true);
    });
    async function trackBackupsTest(resource, autoSave) {
        const { accessor, cleanup } = await createTracker(autoSave);
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const fileModel = accessor.textFileService.files.get(resource);
        assert.ok(fileModel);
        fileModel.textEditorModel?.setValue('Super Good');
        await accessor.workingCopyBackupService.joinBackupResource();
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(fileModel), true);
        fileModel.dispose();
        await accessor.workingCopyBackupService.joinDiscardBackup();
        assert.strictEqual(accessor.workingCopyBackupService.hasBackupSync(fileModel), false);
        await cleanup();
    }
    test('onWillShutdown - no veto if no dirty files', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        await cleanup();
    });
    test('onWillShutdown - veto if user cancels (hot.exit: off)', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
        accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: 'off' } });
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(veto);
        await cleanup();
    });
    test('onWillShutdown - no veto if auto save is on', async function () {
        const { accessor, cleanup } = await createTracker(true /* auto save enabled */);
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 0);
        await cleanup();
    });
    test('onWillShutdown - no veto and backups cleaned up if user does not want to save (hot.exit: off)', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        accessor.fileDialogService.setConfirmResult(1 /* ConfirmResult.DONT_SAVE */);
        accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: 'off' } });
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(accessor.workingCopyBackupService.discardedBackups.length > 0);
        await cleanup();
    });
    test('onWillShutdown - no backups discarded when shutdown without dirty but tracker not ready', async function () {
        const { accessor, cleanup } = await createTracker();
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(!accessor.workingCopyBackupService.discardedAllBackups);
        await cleanup();
    });
    test('onWillShutdown - backups discarded when shutdown without dirty', async function () {
        const { accessor, tracker, cleanup } = await createTracker();
        await tracker.waitForReady();
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(accessor.workingCopyBackupService.discardedAllBackups);
        await cleanup();
    });
    test('onWillShutdown - save (hot.exit: off)', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        accessor.fileDialogService.setConfirmResult(0 /* ConfirmResult.SAVE */);
        accessor.filesConfigurationService.testOnFilesConfigurationChange({ files: { hotExit: 'off' } });
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        const event = new TestBeforeShutdownEvent();
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(!veto);
        assert.ok(!model?.isDirty());
        await cleanup();
    });
    test('onWillShutdown - veto if backup fails', async function () {
        const { accessor, cleanup } = await createTracker();
        class TestBackupWorkingCopy extends TestWorkingCopy {
            constructor(resource) {
                super(resource);
                this._register(accessor.workingCopyService.registerWorkingCopy(this));
            }
            async backup(token) {
                throw new Error('unable to backup');
            }
        }
        const resource = toResource.call(this, '/path/custom.txt');
        const customWorkingCopy = disposables.add(new TestBackupWorkingCopy(resource));
        customWorkingCopy.setDirty(true);
        const event = new TestBeforeShutdownEvent();
        event.reason = 2 /* ShutdownReason.QUIT */;
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(veto);
        const finalVeto = await event.finalValue?.();
        assert.ok(finalVeto); // assert the tracker uses the internal finalVeto API
        await cleanup();
    });
    test('onWillShutdown - scratchpads - veto if backup fails', async function () {
        const { accessor, cleanup } = await createTracker();
        class TestBackupWorkingCopy extends TestWorkingCopy {
            constructor(resource) {
                super(resource);
                this.capabilities = 2 /* WorkingCopyCapabilities.Untitled */ | 4 /* WorkingCopyCapabilities.Scratchpad */;
                this._register(accessor.workingCopyService.registerWorkingCopy(this));
            }
            async backup(token) {
                throw new Error('unable to backup');
            }
            isDirty() {
                return false;
            }
            isModified() {
                return true;
            }
        }
        const resource = toResource.call(this, '/path/custom.txt');
        disposables.add(new TestBackupWorkingCopy(resource));
        const event = new TestBeforeShutdownEvent();
        event.reason = 2 /* ShutdownReason.QUIT */;
        accessor.lifecycleService.fireBeforeShutdown(event);
        const veto = await event.value;
        assert.ok(veto);
        const finalVeto = await event.finalValue?.();
        assert.ok(finalVeto); // assert the tracker uses the internal finalVeto API
        await cleanup();
    });
    test('onWillShutdown - pending backup operations canceled and tracker suspended/resumsed', async function () {
        const { accessor, tracker, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor({ resource, options: { pinned: true } });
        const model = accessor.textFileService.files.get(resource);
        await model?.resolve();
        model?.textEditorModel?.setValue('foo');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        const onSuspend = Event.toPromise(tracker.onDidSuspend);
        const event = new TestBeforeShutdownEvent();
        event.reason = 2 /* ShutdownReason.QUIT */;
        accessor.lifecycleService.fireBeforeShutdown(event);
        await onSuspend;
        assert.strictEqual(tracker.pendingBackupOperationCount, 0);
        // Ops are suspended during shutdown!
        model?.textEditorModel?.setValue('bar');
        assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
        assert.strictEqual(tracker.pendingBackupOperationCount, 0);
        const onResume = Event.toPromise(tracker.onDidResume);
        await event.value;
        // Ops are resumed after shutdown!
        model?.textEditorModel?.setValue('foo');
        await onResume;
        assert.strictEqual(tracker.pendingBackupOperationCount, 1);
        await cleanup();
    });
    suite('Hot Exit', () => {
        suite('"onExit" setting', () => {
            test('should hot exit on non-Mac (reason: CLOSE, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, true, !!isMacintosh);
            });
            test('should hot exit on non-Mac (reason: CLOSE, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, true, true);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, true, true);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, true, true);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        suite('"onExitAndWindowClose" setting', () => {
            test('should hot exit (reason: CLOSE, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, true, false);
            });
            test('should hot exit (reason: CLOSE, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, true, false);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should hot exit (reason: LOAD, windows: single, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return hotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        suite('"onExit" setting - scratchpad', () => {
            test('should hot exit (reason: CLOSE, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, true, false);
            });
            test('should hot exit (reason: CLOSE, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, true, false);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should hot exit (reason: LOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        suite('"onExitAndWindowClose" setting - scratchpad', () => {
            test('should hot exit (reason: CLOSE, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, true, false);
            });
            test('should hot exit (reason: CLOSE, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, false, false, !!isMacintosh);
            });
            test('should hot exit (reason: CLOSE, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, true, false);
            });
            test('should NOT hot exit (reason: CLOSE, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 1 /* ShutdownReason.CLOSE */, true, false, true);
            });
            test('should hot exit (reason: QUIT, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, true, false);
            });
            test('should hot exit (reason: QUIT, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, false, false, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, true, false);
            });
            test('should hot exit (reason: QUIT, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 2 /* ShutdownReason.QUIT */, true, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, false, false, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, true, false);
            });
            test('should hot exit (reason: RELOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 3 /* ShutdownReason.RELOAD */, true, false, false);
            });
            test('should hot exit (reason: LOAD, windows: single, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: single, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, false, false, true);
            });
            test('should hot exit (reason: LOAD, windows: multiple, workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, true, false);
            });
            test('should NOT hot exit (reason: LOAD, windows: multiple, empty workspace)', function () {
                return scratchpadHotExitTest.call(this, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE, 4 /* ShutdownReason.LOAD */, true, false, true);
            });
        });
        async function hotExitTest(setting, shutdownReason, multipleWindows, workspace, shouldVeto) {
            const { accessor, cleanup } = await createTracker();
            const resource = toResource.call(this, '/path/index.txt');
            await accessor.editorService.openEditor({ resource, options: { pinned: true } });
            const model = accessor.textFileService.files.get(resource);
            // Set hot exit config
            accessor.filesConfigurationService.testOnFilesConfigurationChange({
                files: { hotExit: setting },
            });
            // Set empty workspace if required
            if (!workspace) {
                accessor.contextService.setWorkspace(new Workspace('empty:1508317022751'));
            }
            // Set multiple windows if required
            if (multipleWindows) {
                accessor.nativeHostService.windowCount = Promise.resolve(2);
            }
            // Set cancel to force a veto if hot exit does not trigger
            accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
            await model?.resolve();
            model?.textEditorModel?.setValue('foo');
            assert.strictEqual(accessor.workingCopyService.dirtyCount, 1);
            const event = new TestBeforeShutdownEvent();
            event.reason = shutdownReason;
            accessor.lifecycleService.fireBeforeShutdown(event);
            const veto = await event.value;
            assert.ok(typeof event.finalValue === 'function'); // assert the tracker uses the internal finalVeto API
            assert.strictEqual(accessor.workingCopyBackupService.discardedBackups.length, 0); // When hot exit is set, backups should never be cleaned since the confirm result is cancel
            assert.strictEqual(veto, shouldVeto);
            await cleanup();
        }
        async function scratchpadHotExitTest(setting, shutdownReason, multipleWindows, workspace, shouldVeto) {
            const { accessor, cleanup } = await createTracker();
            class TestBackupWorkingCopy extends TestWorkingCopy {
                constructor(resource) {
                    super(resource);
                    this.capabilities = 2 /* WorkingCopyCapabilities.Untitled */ | 4 /* WorkingCopyCapabilities.Scratchpad */;
                    this._register(accessor.workingCopyService.registerWorkingCopy(this));
                }
                isDirty() {
                    return false;
                }
                isModified() {
                    return true;
                }
            }
            // Set hot exit config
            accessor.filesConfigurationService.testOnFilesConfigurationChange({
                files: { hotExit: setting },
            });
            // Set empty workspace if required
            if (!workspace) {
                accessor.contextService.setWorkspace(new Workspace('empty:1508317022751'));
            }
            // Set multiple windows if required
            if (multipleWindows) {
                accessor.nativeHostService.windowCount = Promise.resolve(2);
            }
            // Set cancel to force a veto if hot exit does not trigger
            accessor.fileDialogService.setConfirmResult(2 /* ConfirmResult.CANCEL */);
            const resource = toResource.call(this, '/path/custom.txt');
            disposables.add(new TestBackupWorkingCopy(resource));
            const event = new TestBeforeShutdownEvent();
            event.reason = shutdownReason;
            accessor.lifecycleService.fireBeforeShutdown(event);
            const veto = await event.value;
            assert.ok(typeof event.finalValue === 'function'); // assert the tracker uses the internal finalVeto API
            assert.strictEqual(accessor.workingCopyBackupService.discardedBackups.length, 0); // When hot exit is set, backups should never be cleaned since the confirm result is cancel
            assert.strictEqual(veto, shouldVeto);
            await cleanup();
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvdGVzdC9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5QmFja3VwVHJhY2tlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRW5HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDNUcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxF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