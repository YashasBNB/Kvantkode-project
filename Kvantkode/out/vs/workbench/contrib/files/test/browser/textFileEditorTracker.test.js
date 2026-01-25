/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { TextFileEditorTracker } from '../../browser/editors/textFileEditorTracker.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { workbenchInstantiationService, TestServiceAccessor, TestFilesConfigurationService, registerTestFileEditor, registerTestResourceEditor, createEditorPart, TestEnvironmentService, TestFileService, workbenchTeardown, TestTextResourceConfigurationService, } from '../../../../test/browser/workbenchTestServices.js';
import { snapshotToString, } from '../../../../services/textfile/common/textfiles.js';
import { FileChangesEvent, FileOperationError, } from '../../../../../platform/files/common/files.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { FILE_EDITOR_INPUT_ID } from '../../common/files.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestContextService, TestMarkerService, } from '../../../../test/common/workbenchTestServices.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
suite('Files - TextFileEditorTracker', () => {
    const disposables = new DisposableStore();
    class TestTextFileEditorTracker extends TextFileEditorTracker {
        getDirtyTextFileTrackerDelay() {
            return 5; // encapsulated in a method for tests to override
        }
    }
    setup(() => {
        disposables.add(registerTestFileEditor());
        disposables.add(registerTestResourceEditor());
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
        const fileService = disposables.add(new TestFileService());
        instantiationService.stub(IFilesConfigurationService, disposables.add(new TestFilesConfigurationService(instantiationService.createInstance(MockContextKeyService), configurationService, new TestContextService(TestWorkspace), TestEnvironmentService, disposables.add(new UriIdentityService(fileService)), fileService, new TestMarkerService(), new TestTextResourceConfigurationService(configurationService))));
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        disposables.add(editorService);
        instantiationService.stub(IEditorService, editorService);
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.textFileService.files);
        disposables.add(instantiationService.createInstance(TestTextFileEditorTracker));
        const cleanup = async () => {
            await workbenchTeardown(instantiationService);
            part.dispose();
        };
        return { accessor, cleanup };
    }
    test('file change event updates model', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        const model = (await accessor.textFileService.files.resolve(resource));
        disposables.add(model);
        model.textEditorModel.setValue('Super Good');
        assert.strictEqual(snapshotToString(model.createSnapshot()), 'Super Good');
        await model.save();
        // change event (watcher)
        accessor.fileService.fireFileChanges(new FileChangesEvent([{ resource, type: 0 /* FileChangeType.UPDATED */ }], false));
        await timeout(0); // due to event updating model async
        assert.strictEqual(snapshotToString(model.createSnapshot()), 'Hello Html');
        await cleanup();
    });
    test('dirty text file model opens as editor', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, false, false);
    });
    test('dirty text file model does not open as editor if autosave is ON', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, true, false);
    });
    test('dirty text file model opens as editor when save fails', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, false, true);
    });
    test('dirty text file model opens as editor when save fails if autosave is ON', async function () {
        const resource = toResource.call(this, '/path/index.txt');
        await testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, true, true);
    });
    async function testDirtyTextFileModelOpensEditorDependingOnAutoSaveSetting(resource, autoSave, error) {
        const { accessor, cleanup } = await createTracker(autoSave);
        assert.ok(!accessor.editorService.isOpened({
            resource,
            typeId: FILE_EDITOR_INPUT_ID,
            editorId: DEFAULT_EDITOR_ASSOCIATION.id,
        }));
        if (error) {
            accessor.textFileService.setWriteErrorOnce(new FileOperationError('fail to write', 10 /* FileOperationResult.FILE_OTHER_ERROR */));
        }
        const model = (await accessor.textFileService.files.resolve(resource));
        disposables.add(model);
        model.textEditorModel.setValue('Super Good');
        if (autoSave) {
            await model.save();
            await timeout(10);
            if (error) {
                assert.ok(accessor.editorService.isOpened({
                    resource,
                    typeId: FILE_EDITOR_INPUT_ID,
                    editorId: DEFAULT_EDITOR_ASSOCIATION.id,
                }));
            }
            else {
                assert.ok(!accessor.editorService.isOpened({
                    resource,
                    typeId: FILE_EDITOR_INPUT_ID,
                    editorId: DEFAULT_EDITOR_ASSOCIATION.id,
                }));
            }
        }
        else {
            await awaitEditorOpening(accessor.editorService);
            assert.ok(accessor.editorService.isOpened({
                resource,
                typeId: FILE_EDITOR_INPUT_ID,
                editorId: DEFAULT_EDITOR_ASSOCIATION.id,
            }));
        }
        await cleanup();
    }
    test('dirty untitled text file model opens as editor', function () {
        return testUntitledEditor(false);
    });
    test('dirty untitled text file model opens as editor - autosave ON', function () {
        return testUntitledEditor(true);
    });
    async function testUntitledEditor(autoSaveEnabled) {
        const { accessor, cleanup } = await createTracker(autoSaveEnabled);
        const untitledTextEditor = (await accessor.textEditorService.resolveTextEditor({
            resource: undefined,
            forceUntitled: true,
        }));
        const model = disposables.add(await untitledTextEditor.resolve());
        assert.ok(!accessor.editorService.isOpened(untitledTextEditor));
        model.textEditorModel?.setValue('Super Good');
        await awaitEditorOpening(accessor.editorService);
        assert.ok(accessor.editorService.isOpened(untitledTextEditor));
        await cleanup();
    }
    function awaitEditorOpening(editorService) {
        return Event.toPromise(Event.once(editorService.onDidActiveEditorChange));
    }
    test('non-dirty files reload on window focus', async function () {
        const { accessor, cleanup } = await createTracker();
        const resource = toResource.call(this, '/path/index.txt');
        await accessor.editorService.openEditor(await accessor.textEditorService.resolveTextEditor({
            resource,
            options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
        }));
        accessor.hostService.setFocus(false);
        accessor.hostService.setFocus(true);
        await awaitModelResolveEvent(accessor.textFileService, resource);
        await cleanup();
    });
    function awaitModelResolveEvent(textFileService, resource) {
        return new Promise((resolve) => {
            const listener = textFileService.files.onDidResolve((e) => {
                if (isEqual(e.model.resource, resource)) {
                    listener.dispose();
                    resolve();
                }
            });
        });
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL3Rlc3QvYnJvd3Nlci90ZXh0RmlsZUVkaXRvclRyYWNrZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLDZCQUE2QixFQUM3QixzQkFBc0IsRUFDdEIsMEJBQTBCLEVBQzFCLGdCQUFnQixFQUNoQixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLGlCQUFpQixFQUNqQixvQ0FBb0MsR0FDcEMsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBRU4sZ0JBQWdCLEdBRWhCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixrQkFBa0IsR0FFbEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVw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