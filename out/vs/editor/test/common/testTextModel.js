/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { TextModel } from '../../common/model/textModel.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ILanguageService } from '../../common/languages/language.js';
import { LanguageService } from '../../common/services/languageService.js';
import { ITextResourcePropertiesService } from '../../common/services/textResourceConfiguration.js';
import { TestLanguageConfigurationService } from './modes/testLanguageConfigurationService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { TestDialogService } from '../../../platform/dialogs/test/common/testDialogService.js';
import { ILogService, NullLogService } from '../../../platform/log/common/log.js';
import { INotificationService } from '../../../platform/notification/common/notification.js';
import { TestNotificationService } from '../../../platform/notification/test/common/testNotificationService.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../platform/undoRedo/common/undoRedoService.js';
import { TestTextResourcePropertiesService } from './services/testTextResourcePropertiesService.js';
import { IModelService } from '../../common/services/model.js';
import { ModelService } from '../../common/services/modelService.js';
import { createServices, } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../common/languages/modesRegistry.js';
import { ILanguageFeatureDebounceService, LanguageFeatureDebounceService, } from '../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../common/services/languageFeaturesService.js';
import { IEnvironmentService } from '../../../platform/environment/common/environment.js';
import { mock } from '../../../base/test/common/mock.js';
import { ITreeSitterParserService } from '../../common/services/treeSitterParserService.js';
import { TestTreeSitterParserService } from './services/testTreeSitterService.js';
class TestTextModel extends TextModel {
    registerDisposable(disposable) {
        this._register(disposable);
    }
}
export function withEditorModel(text, callback) {
    const model = createTextModel(text.join('\n'));
    callback(model);
    model.dispose();
}
function resolveOptions(_options) {
    const defaultOptions = TextModel.DEFAULT_CREATION_OPTIONS;
    return {
        tabSize: typeof _options.tabSize === 'undefined' ? defaultOptions.tabSize : _options.tabSize,
        indentSize: typeof _options.indentSize === 'undefined' ? defaultOptions.indentSize : _options.indentSize,
        insertSpaces: typeof _options.insertSpaces === 'undefined'
            ? defaultOptions.insertSpaces
            : _options.insertSpaces,
        detectIndentation: typeof _options.detectIndentation === 'undefined'
            ? defaultOptions.detectIndentation
            : _options.detectIndentation,
        trimAutoWhitespace: typeof _options.trimAutoWhitespace === 'undefined'
            ? defaultOptions.trimAutoWhitespace
            : _options.trimAutoWhitespace,
        defaultEOL: typeof _options.defaultEOL === 'undefined' ? defaultOptions.defaultEOL : _options.defaultEOL,
        isForSimpleWidget: typeof _options.isForSimpleWidget === 'undefined'
            ? defaultOptions.isForSimpleWidget
            : _options.isForSimpleWidget,
        largeFileOptimizations: typeof _options.largeFileOptimizations === 'undefined'
            ? defaultOptions.largeFileOptimizations
            : _options.largeFileOptimizations,
        bracketPairColorizationOptions: typeof _options.bracketColorizationOptions === 'undefined'
            ? defaultOptions.bracketPairColorizationOptions
            : _options.bracketColorizationOptions,
    };
}
export function createTextModel(text, languageId = null, options = TextModel.DEFAULT_CREATION_OPTIONS, uri = null) {
    const disposables = new DisposableStore();
    const instantiationService = createModelServices(disposables);
    const model = instantiateTextModel(instantiationService, text, languageId, options, uri);
    model.registerDisposable(disposables);
    return model;
}
export function instantiateTextModel(instantiationService, text, languageId = null, _options = TextModel.DEFAULT_CREATION_OPTIONS, uri = null) {
    const options = resolveOptions(_options);
    return instantiationService.createInstance(TestTextModel, text, languageId || PLAINTEXT_LANGUAGE_ID, options, uri);
}
export function createModelServices(disposables, services = []) {
    return createServices(disposables, services.concat([
        [INotificationService, TestNotificationService],
        [IDialogService, TestDialogService],
        [IUndoRedoService, UndoRedoService],
        [ILanguageService, LanguageService],
        [ILanguageConfigurationService, TestLanguageConfigurationService],
        [IConfigurationService, TestConfigurationService],
        [ITextResourcePropertiesService, TestTextResourcePropertiesService],
        [IThemeService, TestThemeService],
        [ILogService, NullLogService],
        [
            IEnvironmentService,
            new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.isBuilt = true;
                    this.isExtensionDevelopment = false;
                }
            })(),
        ],
        [ILanguageFeatureDebounceService, LanguageFeatureDebounceService],
        [ILanguageFeaturesService, LanguageFeaturesService],
        [IModelService, ModelService],
        [ITreeSitterParserService, TestTreeSitterParserService],
    ]));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi90ZXN0VGV4dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVFoRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDM0QsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU5RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVFQUF1RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5REFB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