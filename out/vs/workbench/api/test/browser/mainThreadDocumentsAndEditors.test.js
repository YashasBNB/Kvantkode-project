/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadDocumentsAndEditors } from '../../browser/mainThreadDocumentsAndEditors.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../../editor/common/services/modelService.js';
import { TestCodeEditorService } from '../../../../editor/test/browser/editorTestServices.js';
import { createTestCodeEditor, } from '../../../../editor/test/browser/testCodeEditor.js';
import { mock } from '../../../../base/test/common/mock.js';
import { TestEditorService, TestEditorGroupsService, TestEnvironmentService, TestPathService, } from '../../../test/browser/workbenchTestServices.js';
import { Event } from '../../../../base/common/event.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
import { UndoRedoService } from '../../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { TestNotificationService } from '../../../../platform/notification/test/common/testNotificationService.js';
import { TestTextResourcePropertiesService, TestWorkingCopyFileService, } from '../../../test/common/workbenchTestServices.js';
import { UriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentityService.js';
import { TextModel } from '../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestLanguageConfigurationService } from '../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
suite('MainThreadDocumentsAndEditors', () => {
    let disposables;
    let modelService;
    let codeEditorService;
    let textFileService;
    const deltas = [];
    function myCreateTestCodeEditor(model) {
        return createTestCodeEditor(model, {
            hasTextFocus: false,
            serviceCollection: new ServiceCollection([ICodeEditorService, codeEditorService]),
        });
    }
    setup(() => {
        disposables = new DisposableStore();
        deltas.length = 0;
        const configService = new TestConfigurationService();
        configService.setUserConfiguration('editor', { detectIndentation: false });
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        const themeService = new TestThemeService();
        const instantiationService = new TestInstantiationService();
        instantiationService.set(ILanguageService, disposables.add(new LanguageService()));
        instantiationService.set(ILanguageConfigurationService, new TestLanguageConfigurationService());
        instantiationService.set(IUndoRedoService, undoRedoService);
        modelService = new ModelService(configService, new TestTextResourcePropertiesService(configService), undoRedoService, instantiationService);
        codeEditorService = new TestCodeEditorService(themeService);
        textFileService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.files = {
                    onDidSave: Event.None,
                    onDidRevert: Event.None,
                    onDidChangeDirty: Event.None,
                    onDidChangeEncoding: Event.None,
                };
                this.untitled = {
                    onDidChangeEncoding: Event.None,
                };
            }
            isDirty() {
                return false;
            }
            getEncoding() {
                return 'utf8';
            }
        })();
        const workbenchEditorService = disposables.add(new TestEditorService());
        const editorGroupService = new TestEditorGroupsService();
        const fileService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidRunOperation = Event.None;
                this.onDidChangeFileSystemProviderCapabilities = Event.None;
                this.onDidChangeFileSystemProviderRegistrations = Event.None;
            }
        })();
        new MainThreadDocumentsAndEditors(SingleProxyRPCProtocol({
            $acceptDocumentsAndEditorsDelta: (delta) => {
                deltas.push(delta);
            },
            $acceptEditorDiffInformation: (id, diffInformation) => { },
        }), modelService, textFileService, workbenchEditorService, codeEditorService, fileService, null, editorGroupService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidPaneCompositeOpen = Event.None;
                this.onDidPaneCompositeClose = Event.None;
            }
            getActivePaneComposite() {
                return undefined;
            }
        })(), TestEnvironmentService, new TestWorkingCopyFileService(), new UriIdentityService(fileService), new (class extends mock() {
            readText() {
                return Promise.resolve('clipboard_contents');
            }
        })(), new TestPathService(), new TestConfigurationService(), new (class extends mock() {
            createQuickDiffModelReference() {
                return undefined;
            }
        })());
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Model#add', () => {
        deltas.length = 0;
        disposables.add(modelService.createModel('farboo', null));
        assert.strictEqual(deltas.length, 1);
        const [delta] = deltas;
        assert.strictEqual(delta.addedDocuments.length, 1);
        assert.strictEqual(delta.removedDocuments, undefined);
        assert.strictEqual(delta.addedEditors, undefined);
        assert.strictEqual(delta.removedEditors, undefined);
        assert.strictEqual(delta.newActiveEditor, undefined);
    });
    test('ignore huge model', function () {
        const oldLimit = TextModel._MODEL_SYNC_LIMIT;
        try {
            const largeModelString = 'abc'.repeat(1024);
            TextModel._MODEL_SYNC_LIMIT = largeModelString.length / 2;
            const model = modelService.createModel(largeModelString, null);
            disposables.add(model);
            assert.ok(model.isTooLargeForSyncing());
            assert.strictEqual(deltas.length, 1);
            const [delta] = deltas;
            assert.strictEqual(delta.newActiveEditor, null);
            assert.strictEqual(delta.addedDocuments, undefined);
            assert.strictEqual(delta.removedDocuments, undefined);
            assert.strictEqual(delta.addedEditors, undefined);
            assert.strictEqual(delta.removedEditors, undefined);
        }
        finally {
            TextModel._MODEL_SYNC_LIMIT = oldLimit;
        }
    });
    test('ignore huge model from editor', function () {
        const oldLimit = TextModel._MODEL_SYNC_LIMIT;
        try {
            const largeModelString = 'abc'.repeat(1024);
            TextModel._MODEL_SYNC_LIMIT = largeModelString.length / 2;
            const model = modelService.createModel(largeModelString, null);
            const editor = myCreateTestCodeEditor(model);
            assert.strictEqual(deltas.length, 1);
            deltas.length = 0;
            assert.strictEqual(deltas.length, 0);
            editor.dispose();
            model.dispose();
        }
        finally {
            TextModel._MODEL_SYNC_LIMIT = oldLimit;
        }
    });
    test('ignore simple widget model', function () {
        this.timeout(1000 * 60); // increase timeout for this one test
        const model = modelService.createModel('test', null, undefined, true);
        disposables.add(model);
        assert.ok(model.isForSimpleWidget);
        assert.strictEqual(deltas.length, 1);
        const [delta] = deltas;
        assert.strictEqual(delta.newActiveEditor, null);
        assert.strictEqual(delta.addedDocuments, undefined);
        assert.strictEqual(delta.removedDocuments, undefined);
        assert.strictEqual(delta.addedEditors, undefined);
        assert.strictEqual(delta.removedEditors, undefined);
    });
    test('ignore editor w/o model', () => {
        const editor = myCreateTestCodeEditor(undefined);
        assert.strictEqual(deltas.length, 1);
        const [delta] = deltas;
        assert.strictEqual(delta.newActiveEditor, null);
        assert.strictEqual(delta.addedDocuments, undefined);
        assert.strictEqual(delta.removedDocuments, undefined);
        assert.strictEqual(delta.addedEditors, undefined);
        assert.strictEqual(delta.removedEditors, undefined);
        editor.dispose();
    });
    test('editor with model', () => {
        deltas.length = 0;
        const model = modelService.createModel('farboo', null);
        const editor = myCreateTestCodeEditor(model);
        assert.strictEqual(deltas.length, 2);
        const [first, second] = deltas;
        assert.strictEqual(first.addedDocuments.length, 1);
        assert.strictEqual(first.newActiveEditor, undefined);
        assert.strictEqual(first.removedDocuments, undefined);
        assert.strictEqual(first.addedEditors, undefined);
        assert.strictEqual(first.removedEditors, undefined);
        assert.strictEqual(second.addedEditors.length, 1);
        assert.strictEqual(second.addedDocuments, undefined);
        assert.strictEqual(second.removedDocuments, undefined);
        assert.strictEqual(second.removedEditors, undefined);
        assert.strictEqual(second.newActiveEditor, undefined);
        editor.dispose();
        model.dispose();
    });
    test('editor with dispos-ed/-ing model', () => {
        const model = modelService.createModel('farboo', null);
        const editor = myCreateTestCodeEditor(model);
        // ignore things until now
        deltas.length = 0;
        modelService.destroyModel(model.uri);
        assert.strictEqual(deltas.length, 1);
        const [first] = deltas;
        assert.strictEqual(first.newActiveEditor, undefined);
        assert.strictEqual(first.removedEditors.length, 1);
        assert.strictEqual(first.removedDocuments.length, 1);
        assert.strictEqual(first.addedDocuments, undefined);
        assert.strictEqual(first.addedEditors, undefined);
        editor.dispose();
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWREb2N1bWVudHNBbmRFZGl0b3JzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3JFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUc3RixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFDTixpQkFBaUIsRUFDakIsdUJBQXVCLEVBQ3ZCLHNCQUFzQixFQUN0QixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBQ2xILE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsMEJBQTBCLEdBQzFCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFHbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDcEgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMEVBQTBFLENBQUE7QUFDM0gsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFJbkYsS0FBSyxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtJQUMzQyxJQUFJLFdBQTRCLENBQUE7SUFFaEMsSUFBSSxZQUEwQixDQUFBO0lBQzlCLElBQUksaUJBQXdDLENBQUE7SUFDNUMsSUFBSSxlQUFpQyxDQUFBO0lBQ3JDLE1BQU0sTUFBTSxHQUFnQyxFQUFFLENBQUE7SUFFOUMsU0FBUyxzQkFBc0IsQ0FBQyxLQUE2QjtRQUM1RCxPQUFPLG9CQUFvQixDQUFDLEtBQUssRUFBRTtZQUNsQyxZQUFZLEVBQUUsS0FBSztZQUNuQixpQkFBaUIsRUFBRSxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztTQUNqRixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRW5DLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUNwRCxhQUFhLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMxRSxNQUFNLGFBQWEsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7UUFDN0MsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDekQsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLENBQUMsYUFBYSxFQUFFLG1CQUFtQixDQUFDLENBQUE7UUFDL0UsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO1FBQzNDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO1FBQzNELG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQTtRQUMvRixvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDM0QsWUFBWSxHQUFHLElBQUksWUFBWSxDQUM5QixhQUFhLEVBQ2IsSUFBSSxpQ0FBaUMsQ0FBQyxhQUFhLENBQUMsRUFDcEQsZUFBZSxFQUNmLG9CQUFvQixDQUNwQixDQUFBO1FBQ0QsaUJBQWlCLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMzRCxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSxJQUFJLEVBQW9CO1lBQXRDOztnQkFJYixVQUFLLEdBQVE7b0JBQ3JCLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDckIsV0FBVyxFQUFFLEtBQUssQ0FBQyxJQUFJO29CQUN2QixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDNUIsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLElBQUk7aUJBQy9CLENBQUE7Z0JBQ1EsYUFBUSxHQUFRO29CQUN4QixtQkFBbUIsRUFBRSxLQUFLLENBQUMsSUFBSTtpQkFDL0IsQ0FBQTtZQUlGLENBQUM7WUFmUyxPQUFPO2dCQUNmLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQVVRLFdBQVc7Z0JBQ25CLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztTQUNELENBQUMsRUFBRSxDQUFBO1FBQ0osTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBRXhELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFnQjtZQUFsQzs7Z0JBQ2Ysc0JBQWlCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtnQkFDOUIsOENBQXlDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtnQkFDdEQsK0NBQTBDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtZQUNqRSxDQUFDO1NBQUEsQ0FBQyxFQUFFLENBQUE7UUFFSixJQUFJLDZCQUE2QixDQUNoQyxzQkFBc0IsQ0FBQztZQUN0QiwrQkFBK0IsRUFBRSxDQUFDLEtBQWdDLEVBQUUsRUFBRTtnQkFDckUsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuQixDQUFDO1lBQ0QsNEJBQTRCLEVBQUUsQ0FDN0IsRUFBVSxFQUNWLGVBQXVELEVBQ3RELEVBQUUsR0FBRSxDQUFDO1NBQ1AsQ0FBQyxFQUNGLFlBQVksRUFDWixlQUFlLEVBQ2Ysc0JBQXNCLEVBQ3RCLGlCQUFpQixFQUNqQixXQUFXLEVBQ1gsSUFBSyxFQUNMLGtCQUFrQixFQUNsQixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBNkI7WUFBL0M7O2dCQUNLLDJCQUFzQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7Z0JBQ25DLDRCQUF1QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7WUFJOUMsQ0FBQztZQUhTLHNCQUFzQjtnQkFDOUIsT0FBTyxTQUFTLENBQUE7WUFDakIsQ0FBQztTQUNELENBQUMsRUFBRSxFQUNKLHNCQUFzQixFQUN0QixJQUFJLDBCQUEwQixFQUFFLEVBQ2hDLElBQUksa0JBQWtCLENBQUMsV0FBVyxDQUFDLEVBQ25DLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFxQjtZQUNsQyxRQUFRO2dCQUNoQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1NBQ0QsQ0FBQyxFQUFFLEVBQ0osSUFBSSxlQUFlLEVBQUUsRUFDckIsSUFBSSx3QkFBd0IsRUFBRSxFQUM5QixJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBMEI7WUFDdkMsNkJBQTZCO2dCQUNyQyxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1NBQ0QsQ0FBQyxFQUFFLENBQ0osQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7UUFDdEIsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFFakIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXpELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFBO1FBRXRCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDckQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUU7UUFDekIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixDQUFBO1FBQzVDLElBQUksQ0FBQztZQUNKLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzQyxTQUFTLENBQUMsaUJBQWlCLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUV6RCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlELFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFBO1lBRXZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFBO1lBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2dCQUFTLENBQUM7WUFDVixTQUFTLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFBO1FBQ3ZDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRTtRQUNyQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsaUJBQWlCLENBQUE7UUFDNUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzNDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBRXpELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUQsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1lBQ2pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDaEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxRQUFRLENBQUE7UUFDdkMsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1FBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFBLENBQUMscUNBQXFDO1FBRTdELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNwRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUE7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNqQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFFakIsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEQsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFBO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVyRCxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUU1QywwQkFBMEI7UUFDMUIsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFFakIsWUFBWSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUE7UUFFdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0JBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFakQsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=