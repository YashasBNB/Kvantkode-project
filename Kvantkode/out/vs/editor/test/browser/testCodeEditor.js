/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { mock } from '../../../base/test/common/mock.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { CodeEditorWidget, } from '../../browser/widget/codeEditor/codeEditorWidget.js';
import { ILanguageService } from '../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { IEditorWorkerService } from '../../common/services/editorWorker.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService, } from '../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../common/services/languageFeaturesService.js';
import { LanguageService } from '../../common/services/languageService.js';
import { IModelService } from '../../common/services/model.js';
import { ModelService } from '../../common/services/modelService.js';
import { ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { ITreeSitterParserService } from '../../common/services/treeSitterParserService.js';
import { TestConfiguration } from './config/testConfiguration.js';
import { TestCodeEditorService, TestCommandService } from './editorTestServices.js';
import { TestTreeSitterParserService } from '../common/services/testTreeSitterService.js';
import { TestLanguageConfigurationService } from '../common/modes/testLanguageConfigurationService.js';
import { TestEditorWorkerService } from '../common/services/testEditorWorkerService.js';
import { TestTextResourcePropertiesService } from '../common/services/testTextResourcePropertiesService.js';
import { instantiateTextModel } from '../common/testTextModel.js';
import { IAccessibilityService, } from '../../../platform/accessibility/common/accessibility.js';
import { TestAccessibilityService } from '../../../platform/accessibility/test/common/testAccessibilityService.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { TestClipboardService } from '../../../platform/clipboard/test/common/testClipboardService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService, } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { MockContextKeyService, MockKeybindingService, } from '../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { NullOpenerService } from '../../../platform/opener/test/common/nullOpenerService.js';
import { ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryServiceShape } from '../../../platform/telemetry/common/telemetryUtils.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
export class TestCodeEditor extends CodeEditorWidget {
    constructor() {
        super(...arguments);
        this._hasTextFocus = false;
    }
    //#region testing overrides
    _createConfiguration(isSimpleWidget, contextMenuId, options) {
        return new TestConfiguration(options);
    }
    _createView(viewModel) {
        // Never create a view
        return [null, false];
    }
    setHasTextFocus(hasTextFocus) {
        this._hasTextFocus = hasTextFocus;
    }
    hasTextFocus() {
        return this._hasTextFocus;
    }
    //#endregion
    //#region Testing utils
    getViewModel() {
        return this._modelData ? this._modelData.viewModel : undefined;
    }
    registerAndInstantiateContribution(id, ctor) {
        const r = this._instantiationService.createInstance(ctor, this);
        this._contributions.set(id, r);
        return r;
    }
    registerDisposable(disposable) {
        this._register(disposable);
    }
}
class TestEditorDomElement {
    constructor() {
        this.parentElement = null;
        this.ownerDocument = document;
        this.document = document;
    }
    setAttribute(attr, value) { }
    removeAttribute(attr) { }
    hasAttribute(attr) {
        return false;
    }
    getAttribute(attr) {
        return undefined;
    }
    addEventListener(event) { }
    removeEventListener(event) { }
}
export function withTestCodeEditor(text, options, callback) {
    return _withTestCodeEditor(text, options, callback);
}
export async function withAsyncTestCodeEditor(text, options, callback) {
    return _withTestCodeEditor(text, options, callback);
}
function isTextModel(arg) {
    return Boolean(arg && arg.uri);
}
function _withTestCodeEditor(arg, options, callback) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables, options.serviceCollection);
    delete options.serviceCollection;
    // create a model if necessary
    let model;
    if (isTextModel(arg)) {
        model = arg;
    }
    else {
        model = disposables.add(instantiateTextModel(instantiationService, Array.isArray(arg) ? arg.join('\n') : arg));
    }
    const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, options));
    const viewModel = editor.getViewModel();
    viewModel.setHasFocus(true);
    const result = callback(editor, editor.getViewModel(), instantiationService);
    if (result) {
        return result.then(() => disposables.dispose());
    }
    disposables.dispose();
}
export function createCodeEditorServices(disposables, services = new ServiceCollection()) {
    const serviceIdentifiers = [];
    const define = (id, ctor) => {
        if (!services.has(id)) {
            services.set(id, new SyncDescriptor(ctor));
        }
        serviceIdentifiers.push(id);
    };
    const defineInstance = (id, instance) => {
        if (!services.has(id)) {
            services.set(id, instance);
        }
        serviceIdentifiers.push(id);
    };
    define(IAccessibilityService, TestAccessibilityService);
    define(IKeybindingService, MockKeybindingService);
    define(IClipboardService, TestClipboardService);
    define(IEditorWorkerService, TestEditorWorkerService);
    defineInstance(IOpenerService, NullOpenerService);
    define(INotificationService, TestNotificationService);
    define(IDialogService, TestDialogService);
    define(IUndoRedoService, UndoRedoService);
    define(ILanguageService, LanguageService);
    define(ILanguageConfigurationService, TestLanguageConfigurationService);
    define(IConfigurationService, TestConfigurationService);
    define(ITextResourcePropertiesService, TestTextResourcePropertiesService);
    define(IThemeService, TestThemeService);
    define(ILogService, NullLogService);
    define(IModelService, ModelService);
    define(ICodeEditorService, TestCodeEditorService);
    define(IContextKeyService, MockContextKeyService);
    define(ICommandService, TestCommandService);
    define(ITelemetryService, NullTelemetryServiceShape);
    define(IEnvironmentService, class extends mock() {
        constructor() {
            super(...arguments);
            this.isBuilt = true;
            this.isExtensionDevelopment = false;
        }
    });
    define(ILanguageFeatureDebounceService, LanguageFeatureDebounceService);
    define(ILanguageFeaturesService, LanguageFeaturesService);
    define(ITreeSitterParserService, TestTreeSitterParserService);
    const instantiationService = disposables.add(new TestInstantiationService(services, true));
    disposables.add(toDisposable(() => {
        for (const id of serviceIdentifiers) {
            const instanceOrDescriptor = services.get(id);
            if (typeof instanceOrDescriptor.dispose === 'function') {
                instanceOrDescriptor.dispose();
            }
        }
    }));
    return instantiationService;
}
export function createTestCodeEditor(model, options = {}) {
    const disposables = new DisposableStore();
    const instantiationService = createCodeEditorServices(disposables, options.serviceCollection);
    delete options.serviceCollection;
    const editor = instantiateTestCodeEditor(instantiationService, model || null, options);
    editor.registerDisposable(disposables);
    return editor;
}
export function instantiateTestCodeEditor(instantiationService, model, options = {}) {
    const codeEditorWidgetOptions = {
        contributions: [],
    };
    const editor = instantiationService.createInstance(TestCodeEditor, new TestEditorDomElement(), options, codeEditorWidgetOptions);
    if (typeof options.hasTextFocus === 'undefined') {
        options.hasTextFocus = true;
    }
    editor.setHasTextFocus(options.hasTextFocus);
    editor.setModel(model);
    const viewModel = editor.getViewModel();
    viewModel?.setHasFocus(options.hasTextFocus);
    return editor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvdGVzdENvZGVFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFaEYsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLHFEQUFxRCxDQUFBO0FBRzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRXZHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzVFLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsOEJBQThCLEdBQzlCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0YsT0FBTyxF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