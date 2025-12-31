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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEVkaXRvck1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvdGV4dEVkaXRvck1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQVFoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFPOUMsT0FBTyxFQUFFLGdCQUFnQixFQUFzQixNQUFNLDhDQUE4QyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN6RixPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLG9DQUFvQyxHQUNwQyxNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUcxQzs7R0FFRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsV0FBVzs7YUFDM0Isd0NBQW1DLEdBQUcsR0FBRyxBQUFOLENBQU07SUFXakUsWUFDZ0IsWUFBcUMsRUFDbEMsZUFBMkMsRUFDbEMsd0JBQW9FLEVBQ3hFLG9CQUE0RCxFQUNuRixxQkFBMkI7UUFFM0IsS0FBSyxFQUFFLENBQUE7UUFOa0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ2pCLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMkI7UUFDdkQseUJB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