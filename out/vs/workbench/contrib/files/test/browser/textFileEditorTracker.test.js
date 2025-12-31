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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEZpbGVFZGl0b3JUcmFja2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9maWxlcy90ZXN0L2Jyb3dzZXIvdGV4dEZpbGVFZGl0b3JUcmFja2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sdUNBQXVDLEVBQ3ZDLFVBQVUsR0FDVixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQiw2QkFBNkIsRUFDN0Isc0JBQXNCLEVBQ3RCLDBCQUEwQixFQUMxQixnQkFBZ0IsRUFDaEIsc0JBQXNCLEVBQ3RCLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsb0NBQW9DLEdBQ3BDLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUVOLGdCQUFnQixHQUVoQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsa0JBQWtCLEdBRWxCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEYsT0FB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