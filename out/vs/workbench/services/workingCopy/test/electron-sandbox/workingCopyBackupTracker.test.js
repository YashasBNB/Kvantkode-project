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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS90ZXN0L2VsZWN0cm9uLXNhbmRib3gvd29ya2luZ0NvcHlCYWNrdXBUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxVQUFVLEdBQ1YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxv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