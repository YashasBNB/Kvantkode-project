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
var BaseTextEditorModel_1;
import { EditorModel } from './editorModel.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { MutableDisposable } from '../../../base/common/lifecycle.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../editor/common/languages/modesRegistry.js';
import { ILanguageDetectionService, LanguageDetectionLanguageEventSource, } from '../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ThrottledDelayer } from '../../../base/common/async.js';
import { IAccessibilityService } from '../../../platform/accessibility/common/accessibility.js';
import { localize } from '../../../nls.js';
/**
 * The base text editor model leverages the code editor model. This class is only intended to be subclassed and not instantiated.
 */
let BaseTextEditorModel = class BaseTextEditorModel extends EditorModel {
    static { BaseTextEditorModel_1 = this; }
    static { this.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY = 600; }
    constructor(modelService, languageService, languageDetectionService, accessibilityService, textEditorModelHandle) {
        super();
        this.modelService = modelService;
        this.languageService = languageService;
        this.languageDetectionService = languageDetectionService;
        this.accessibilityService = accessibilityService;
        this.textEditorModelHandle = undefined;
        this.modelDisposeListener = this._register(new MutableDisposable());
        this.autoDetectLanguageThrottler = this._register(new ThrottledDelayer(BaseTextEditorModel_1.AUTO_DETECT_LANGUAGE_THROTTLE_DELAY));
        this._blockLanguageChangeListener = false;
        this._languageChangeSource = undefined;
        if (textEditorModelHandle) {
            this.handleExistingModel(textEditorModelHandle);
        }
    }
    handleExistingModel(textEditorModelHandle) {
        // We need the resource to point to an existing model
        const model = this.modelService.getModel(textEditorModelHandle);
        if (!model) {
            throw new Error(`Document with resource ${textEditorModelHandle.toString(true)} does not exist`);
        }
        this.textEditorModelHandle = textEditorModelHandle;
        // Make sure we clean up when this model gets disposed
        this.registerModelDisposeListener(model);
    }
    registerModelDisposeListener(model) {
        this.modelDisposeListener.value = model.onWillDispose(() => {
            this.textEditorModelHandle = undefined; // make sure we do not dispose code editor model again
            this.dispose();
        });
    }
    get textEditorModel() {
        return this.textEditorModelHandle
            ? this.modelService.getModel(this.textEditorModelHandle)
            : null;
    }
    isReadonly() {
        return true;
    }
    get languageChangeSource() {
        return this._languageChangeSource;
    }
    get hasLanguageSetExplicitly() {
        // This is technically not 100% correct, because 'api' can also be
        // set as source if a model is resolved as text first and then
        // transitions into the resolved language. But to preserve the current
        // behaviour, we do not change this property. Rather, `languageChangeSource`
        // can be used to get more fine grained information.
        return typeof this._languageChangeSource === 'string';
    }
    setLanguageId(languageId, source) {
        // Remember that an explicit language was set
        this._languageChangeSource = 'user';
        this.setLanguageIdInternal(languageId, source);
    }
    setLanguageIdInternal(languageId, source) {
        if (!this.isResolved()) {
            return;
        }
        if (!languageId || languageId === this.textEditorModel.getLanguageId()) {
            return;
        }
        this._blockLanguageChangeListener = true;
        try {
            this.textEditorModel.setLanguage(this.languageService.createById(languageId), source);
        }
        finally {
            this._blockLanguageChangeListener = false;
        }
    }
    installModelListeners(model) {
        // Setup listener for lower level language changes
        const disposable = this._register(model.onDidChangeLanguage((e) => {
            if (e.source === LanguageDetectionLanguageEventSource ||
                this._blockLanguageChangeListener) {
                return;
            }
            this._languageChangeSource = 'api';
            disposable.dispose();
        }));
    }
    getLanguageId() {
        return this.textEditorModel?.getLanguageId();
    }
    autoDetectLanguage() {
        return this.autoDetectLanguageThrottler.trigger(() => this.doAutoDetectLanguage());
    }
    async doAutoDetectLanguage() {
        if (this.hasLanguageSetExplicitly || // skip detection when the user has made an explicit choice on the language
            !this.textEditorModelHandle || // require a URI to run the detection for
            !this.languageDetectionService.isEnabledForLanguage(this.getLanguageId() ?? PLAINTEXT_LANGUAGE_ID) // require a valid language that is enlisted for detection
        ) {
            return;
        }
        const lang = await this.languageDetectionService.detectLanguage(this.textEditorModelHandle);
        const prevLang = this.getLanguageId();
        if (lang && lang !== prevLang && !this.isDisposed()) {
            this.setLanguageIdInternal(lang, LanguageDetectionLanguageEventSource);
            const languageName = this.languageService.getLanguageName(lang);
            this.accessibilityService.alert(localize('languageAutoDetected', 'Language {0} was automatically detected and set as the language mode.', languageName ?? lang));
        }
    }
    /**
     * Creates the text editor model with the provided value, optional preferred language
     * (can be comma separated for multiple values) and optional resource URL.
     */
    createTextEditorModel(value, resource, preferredLanguageId) {
        const firstLineText = this.getFirstLineText(value);
        const languageSelection = this.getOrCreateLanguage(resource, this.languageService, preferredLanguageId, firstLineText);
        return this.doCreateTextEditorModel(value, languageSelection, resource);
    }
    doCreateTextEditorModel(value, languageSelection, resource) {
        let model = resource && this.modelService.getModel(resource);
        if (!model) {
            model = this.modelService.createModel(value, languageSelection, resource);
            this.createdEditorModel = true;
            // Make sure we clean up when this model gets disposed
            this.registerModelDisposeListener(model);
        }
        else {
            this.updateTextEditorModel(value, languageSelection.languageId);
        }
        this.textEditorModelHandle = model.uri;
        return model;
    }
    getFirstLineText(value) {
        // text buffer factory
        const textBufferFactory = value;
        if (typeof textBufferFactory.getFirstLineText === 'function') {
            return textBufferFactory.getFirstLineText(1000 /* ModelConstants.FIRST_LINE_DETECTION_LENGTH_LIMIT */);
        }
        // text model
        const textSnapshot = value;
        return textSnapshot
            .getLineContent(1)
            .substr(0, 1000 /* ModelConstants.FIRST_LINE_DETECTION_LENGTH_LIMIT */);
    }
    /**
     * Gets the language for the given identifier. Subclasses can override to provide their own implementation of this lookup.
     *
     * @param firstLineText optional first line of the text buffer to set the language on. This can be used to guess a language from content.
     */
    getOrCreateLanguage(resource, languageService, preferredLanguage, firstLineText) {
        // lookup language via resource path if the provided language is unspecific
        if (!preferredLanguage || preferredLanguage === PLAINTEXT_LANGUAGE_ID) {
            return languageService.createByFilepathOrFirstLine(resource ?? null, firstLineText);
        }
        // otherwise take the preferred language for granted
        return languageService.createById(preferredLanguage);
    }
    /**
     * Updates the text editor model with the provided value. If the value is the same as the model has, this is a no-op.
     */
    updateTextEditorModel(newValue, preferredLanguageId) {
        if (!this.isResolved()) {
            return;
        }
        // contents
        if (newValue) {
            this.modelService.updateModel(this.textEditorModel, newValue);
        }
        // language (only if specific and changed)
        if (preferredLanguageId &&
            preferredLanguageId !== PLAINTEXT_LANGUAGE_ID &&
            this.textEditorModel.getLanguageId() !== preferredLanguageId) {
            this.textEditorModel.setLanguage(this.languageService.createById(preferredLanguageId));
        }
    }
    createSnapshot() {
        if (!this.textEditorModel) {
            return null;
        }
        return this.textEditorModel.createSnapshot(true /* preserve BOM */);
    }
    isResolved() {
        return !!this.textEditorModelHandle;
    }
    dispose() {
        this.modelDisposeListener.dispose(); // dispose this first because it will trigger another dispose() otherwise
        if (this.textEditorModelHandle && this.createdEditorModel) {
            this.modelService.destroyModel(this.textEditorModelHandle);
        }
        this.textEditorModelHandle = undefined;
        this.createdEditorModel = false;
        super.dispose();
    }
};
BaseTextEditorModel = BaseTextEditorModel_1 = __decorate([
    __param(0, IModelService),
    __param(1, ILanguageService),
    __param(2, ILanguageDetectionService),
    __param(3, IAccessibilityService)
], BaseTextEditorModel);
export { BaseTextEditorModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci90ZXh0RWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBUWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQU85QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQXNCLE1BQU0sOENBQThDLENBQUE7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsb0NBQW9DLEdBQ3BDLE1BQU0sMkVBQTJFLENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRzFDOztHQUVHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxXQUFXOzthQUMzQix3Q0FBbUMsR0FBRyxHQUFHLEFBQU4sQ0FBTTtJQVdqRSxZQUNnQixZQUFxQyxFQUNsQyxlQUEyQyxFQUNsQyx3QkFBb0UsRUFDeEUsb0JBQTRELEVBQ25GLHFCQUEyQjtRQUUzQixLQUFLLEVBQUUsQ0FBQTtRQU5rQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUN4QixvQkFBZSxHQUFmLGVBQWUsQ0FBa0I7UUFDakIsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUN2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