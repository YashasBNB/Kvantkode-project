/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { BaseTextEditorModel } from '../../../../common/editor/textEditorModel.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { createTextBufferFactory } from '../../../../../editor/common/model/textModel.js';
import { ITextResourcePropertiesService } from '../../../../../editor/common/services/textResourceConfiguration.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { TestStorageService, TestTextResourcePropertiesService, } from '../../../common/workbenchTestServices.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { LanguageDetectionService } from '../../../../services/languageDetection/browser/languageDetectionWorkerServiceImpl.js';
import { IWorkbenchEnvironmentService } from '../../../../services/environment/common/environmentService.js';
import { TestEditorService, TestEnvironmentService } from '../../workbenchTestServices.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { TestAccessibilityService } from '../../../../../platform/accessibility/test/common/testAccessibilityService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('EditorModel', () => {
    class MyEditorModel extends EditorModel {
    }
    class MyTextEditorModel extends BaseTextEditorModel {
        testCreateTextEditorModel(value, resource, preferredLanguageId) {
            return super.createTextEditorModel(value, resource, preferredLanguageId);
        }
        isReadonly() {
            return false;
        }
    }
    function stubModelService(instantiationService) {
        const dialogService = new TestDialogService();
        const notificationService = new TestNotificationService();
        const undoRedoService = new UndoRedoService(dialogService, notificationService);
        instantiationService.stub(IWorkbenchEnvironmentService, TestEnvironmentService);
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(instantiationService.get(IConfigurationService)));
        instantiationService.stub(IDialogService, dialogService);
        instantiationService.stub(INotificationService, notificationService);
        instantiationService.stub(IUndoRedoService, undoRedoService);
        instantiationService.stub(IEditorService, disposables.add(new TestEditorService()));
        instantiationService.stub(IThemeService, new TestThemeService());
        instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
        instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
        return disposables.add(instantiationService.createInstance(ModelService));
    }
    let instantiationService;
    let languageService;
    const disposables = new DisposableStore();
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        languageService = instantiationService.stub(ILanguageService, LanguageService);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        let counter = 0;
        const model = disposables.add(new MyEditorModel());
        disposables.add(model.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        await model.resolve();
        assert.strictEqual(model.isDisposed(), false);
        assert.strictEqual(model.isResolved(), true);
        model.dispose();
        assert.strictEqual(counter, 1);
        assert.strictEqual(model.isDisposed(), true);
    });
    test('BaseTextEditorModel', async () => {
        const modelService = stubModelService(instantiationService);
        const model = disposables.add(new MyTextEditorModel(modelService, languageService, disposables.add(instantiationService.createInstance(LanguageDetectionService)), instantiationService.createInstance(TestAccessibilityService)));
        await model.resolve();
        disposables.add(model.testCreateTextEditorModel(createTextBufferFactory('foo'), null, Mimes.text));
        assert.strictEqual(model.isResolved(), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvck1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWxGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFHcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDbkgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2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