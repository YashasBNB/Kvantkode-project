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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3Rlc3RUZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBUWhGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbkcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDbEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTlGLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUVBQXVFLENBQUE7QUFDL0csT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFB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