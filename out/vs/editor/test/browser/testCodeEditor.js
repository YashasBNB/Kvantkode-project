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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvZGVFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3Rlc3RDb2RlRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRWhGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxxREFBcUQsQ0FBQTtBQUc1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV2RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLDhCQUE4QixHQUM5QixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRTNGLE9BQU8sRUFBRSxp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