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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZERvY3VtZW50c0FuZEVkaXRvcnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDckUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDckgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRzdGLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUNOLGlCQUFpQixFQUNqQix1QkFBdUIsRUFDdkIsc0JBQXNCLEVBQ3RCLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FB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