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
var ModelService_1;
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import * as platform from '../../../base/common/platform.js';
import { EditOperation } from '../core/editOperation.js';
import { Range } from '../core/range.js';
import { TextModel, createTextBuffer } from '../model/textModel.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import { PLAINTEXT_LANGUAGE_ID } from '../languages/modesRegistry.js';
import { ITextResourcePropertiesService } from './textResourceConfiguration.js';
import { IConfigurationService, } from '../../../platform/configuration/common/configuration.js';
import { IUndoRedoService, } from '../../../platform/undoRedo/common/undoRedo.js';
import { StringSHA1 } from '../../../base/common/hash.js';
import { isEditStackElement } from '../model/editStack.js';
import { Schemas } from '../../../base/common/network.js';
import { equals } from '../../../base/common/objects.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
function MODEL_ID(resource) {
    return resource.toString();
}
class ModelData {
    constructor(model, onWillDispose, onDidChangeLanguage) {
        this.model = model;
        this._modelEventListeners = new DisposableStore();
        this.model = model;
        this._modelEventListeners.add(model.onWillDispose(() => onWillDispose(model)));
        this._modelEventListeners.add(model.onDidChangeLanguage((e) => onDidChangeLanguage(model, e)));
    }
    dispose() {
        this._modelEventListeners.dispose();
    }
}
const DEFAULT_EOL = platform.isLinux || platform.isMacintosh ? 1 /* DefaultEndOfLine.LF */ : 2 /* DefaultEndOfLine.CRLF */;
class DisposedModelInfo {
    constructor(uri, initialUndoRedoSnapshot, time, sharesUndoRedoStack, heapSize, sha1, versionId, alternativeVersionId) {
        this.uri = uri;
        this.initialUndoRedoSnapshot = initialUndoRedoSnapshot;
        this.time = time;
        this.sharesUndoRedoStack = sharesUndoRedoStack;
        this.heapSize = heapSize;
        this.sha1 = sha1;
        this.versionId = versionId;
        this.alternativeVersionId = alternativeVersionId;
    }
}
let ModelService = class ModelService extends Disposable {
    static { ModelService_1 = this; }
    static { this.MAX_MEMORY_FOR_CLOSED_FILES_UNDO_STACK = 20 * 1024 * 1024; }
    constructor(_configurationService, _resourcePropertiesService, _undoRedoService, _instantiationService) {
        super();
        this._configurationService = _configurationService;
        this._resourcePropertiesService = _resourcePropertiesService;
        this._undoRedoService = _undoRedoService;
        this._instantiationService = _instantiationService;
        this._onModelAdded = this._register(new Emitter());
        this.onModelAdded = this._onModelAdded.event;
        this._onModelRemoved = this._register(new Emitter());
        this.onModelRemoved = this._onModelRemoved.event;
        this._onModelModeChanged = this._register(new Emitter());
        this.onModelLanguageChanged = this._onModelModeChanged.event;
        this._modelCreationOptionsByLanguageAndResource = Object.create(null);
        this._models = {};
        this._disposedModels = new Map();
        this._disposedModelsHeapSize = 0;
        this._register(this._configurationService.onDidChangeConfiguration((e) => this._updateModelOptions(e)));
        this._updateModelOptions(undefined);
    }
    static _readModelOptions(config, isForSimpleWidget) {
        let tabSize = EDITOR_MODEL_DEFAULTS.tabSize;
        if (config.editor && typeof config.editor.tabSize !== 'undefined') {
            const parsedTabSize = parseInt(config.editor.tabSize, 10);
            if (!isNaN(parsedTabSize)) {
                tabSize = parsedTabSize;
            }
            if (tabSize < 1) {
                tabSize = 1;
            }
        }
        let indentSize = 'tabSize';
        if (config.editor &&
            typeof config.editor.indentSize !== 'undefined' &&
            config.editor.indentSize !== 'tabSize') {
            const parsedIndentSize = parseInt(config.editor.indentSize, 10);
            if (!isNaN(parsedIndentSize)) {
                indentSize = Math.max(parsedIndentSize, 1);
            }
        }
        let insertSpaces = EDITOR_MODEL_DEFAULTS.insertSpaces;
        if (config.editor && typeof config.editor.insertSpaces !== 'undefined') {
            insertSpaces =
                config.editor.insertSpaces === 'false' ? false : Boolean(config.editor.insertSpaces);
        }
        let newDefaultEOL = DEFAULT_EOL;
        const eol = config.eol;
        if (eol === '\r\n') {
            newDefaultEOL = 2 /* DefaultEndOfLine.CRLF */;
        }
        else if (eol === '\n') {
            newDefaultEOL = 1 /* DefaultEndOfLine.LF */;
        }
        let trimAutoWhitespace = EDITOR_MODEL_DEFAULTS.trimAutoWhitespace;
        if (config.editor && typeof config.editor.trimAutoWhitespace !== 'undefined') {
            trimAutoWhitespace =
                config.editor.trimAutoWhitespace === 'false'
                    ? false
                    : Boolean(config.editor.trimAutoWhitespace);
        }
        let detectIndentation = EDITOR_MODEL_DEFAULTS.detectIndentation;
        if (config.editor && typeof config.editor.detectIndentation !== 'undefined') {
            detectIndentation =
                config.editor.detectIndentation === 'false'
                    ? false
                    : Boolean(config.editor.detectIndentation);
        }
        let largeFileOptimizations = EDITOR_MODEL_DEFAULTS.largeFileOptimizations;
        if (config.editor && typeof config.editor.largeFileOptimizations !== 'undefined') {
            largeFileOptimizations =
                config.editor.largeFileOptimizations === 'false'
                    ? false
                    : Boolean(config.editor.largeFileOptimizations);
        }
        let bracketPairColorizationOptions = EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions;
        if (config.editor?.bracketPairColorization &&
            typeof config.editor.bracketPairColorization === 'object') {
            bracketPairColorizationOptions = {
                enabled: !!config.editor.bracketPairColorization.enabled,
                independentColorPoolPerBracketType: !!config.editor.bracketPairColorization.independentColorPoolPerBracketType,
            };
        }
        return {
            isForSimpleWidget: isForSimpleWidget,
            tabSize: tabSize,
            indentSize: indentSize,
            insertSpaces: insertSpaces,
            detectIndentation: detectIndentation,
            defaultEOL: newDefaultEOL,
            trimAutoWhitespace: trimAutoWhitespace,
            largeFileOptimizations: largeFileOptimizations,
            bracketPairColorizationOptions,
        };
    }
    _getEOL(resource, language) {
        if (resource) {
            return this._resourcePropertiesService.getEOL(resource, language);
        }
        const eol = this._configurationService.getValue('files.eol', { overrideIdentifier: language });
        if (eol && typeof eol === 'string' && eol !== 'auto') {
            return eol;
        }
        return platform.OS === 3 /* platform.OperatingSystem.Linux */ ||
            platform.OS === 2 /* platform.OperatingSystem.Macintosh */
            ? '\n'
            : '\r\n';
    }
    _shouldRestoreUndoStack() {
        const result = this._configurationService.getValue('files.restoreUndoStack');
        if (typeof result === 'boolean') {
            return result;
        }
        return true;
    }
    getCreationOptions(languageIdOrSelection, resource, isForSimpleWidget) {
        const language = typeof languageIdOrSelection === 'string'
            ? languageIdOrSelection
            : languageIdOrSelection.languageId;
        let creationOptions = this._modelCreationOptionsByLanguageAndResource[language + resource];
        if (!creationOptions) {
            const editor = this._configurationService.getValue('editor', {
                overrideIdentifier: language,
                resource,
            });
            const eol = this._getEOL(resource, language);
            creationOptions = ModelService_1._readModelOptions({ editor, eol }, isForSimpleWidget);
            this._modelCreationOptionsByLanguageAndResource[language + resource] = creationOptions;
        }
        return creationOptions;
    }
    _updateModelOptions(e) {
        const oldOptionsByLanguageAndResource = this._modelCreationOptionsByLanguageAndResource;
        this._modelCreationOptionsByLanguageAndResource = Object.create(null);
        // Update options on all models
        const keys = Object.keys(this._models);
        for (let i = 0, len = keys.length; i < len; i++) {
            const modelId = keys[i];
            const modelData = this._models[modelId];
            const language = modelData.model.getLanguageId();
            const uri = modelData.model.uri;
            if (e &&
                !e.affectsConfiguration('editor', { overrideIdentifier: language, resource: uri }) &&
                !e.affectsConfiguration('files.eol', { overrideIdentifier: language, resource: uri })) {
                continue; // perf: skip if this model is not affected by configuration change
            }
            const oldOptions = oldOptionsByLanguageAndResource[language + uri];
            const newOptions = this.getCreationOptions(language, uri, modelData.model.isForSimpleWidget);
            ModelService_1._setModelOptionsForModel(modelData.model, newOptions, oldOptions);
        }
    }
    static _setModelOptionsForModel(model, newOptions, currentOptions) {
        if (currentOptions &&
            currentOptions.defaultEOL !== newOptions.defaultEOL &&
            model.getLineCount() === 1) {
            model.setEOL(newOptions.defaultEOL === 1 /* DefaultEndOfLine.LF */
                ? 0 /* EndOfLineSequence.LF */
                : 1 /* EndOfLineSequence.CRLF */);
        }
        if (currentOptions &&
            currentOptions.detectIndentation === newOptions.detectIndentation &&
            currentOptions.insertSpaces === newOptions.insertSpaces &&
            currentOptions.tabSize === newOptions.tabSize &&
            currentOptions.indentSize === newOptions.indentSize &&
            currentOptions.trimAutoWhitespace === newOptions.trimAutoWhitespace &&
            equals(currentOptions.bracketPairColorizationOptions, newOptions.bracketPairColorizationOptions)) {
            // Same indent opts, no need to touch the model
            return;
        }
        if (newOptions.detectIndentation) {
            model.detectIndentation(newOptions.insertSpaces, newOptions.tabSize);
            model.updateOptions({
                trimAutoWhitespace: newOptions.trimAutoWhitespace,
                bracketColorizationOptions: newOptions.bracketPairColorizationOptions,
            });
        }
        else {
            model.updateOptions({
                insertSpaces: newOptions.insertSpaces,
                tabSize: newOptions.tabSize,
                indentSize: newOptions.indentSize,
                trimAutoWhitespace: newOptions.trimAutoWhitespace,
                bracketColorizationOptions: newOptions.bracketPairColorizationOptions,
            });
        }
    }
    // --- begin IModelService
    _insertDisposedModel(disposedModelData) {
        this._disposedModels.set(MODEL_ID(disposedModelData.uri), disposedModelData);
        this._disposedModelsHeapSize += disposedModelData.heapSize;
    }
    _removeDisposedModel(resource) {
        const disposedModelData = this._disposedModels.get(MODEL_ID(resource));
        if (disposedModelData) {
            this._disposedModelsHeapSize -= disposedModelData.heapSize;
        }
        this._disposedModels.delete(MODEL_ID(resource));
        return disposedModelData;
    }
    _ensureDisposedModelsHeapSize(maxModelsHeapSize) {
        if (this._disposedModelsHeapSize > maxModelsHeapSize) {
            // we must remove some old undo stack elements to free up some memory
            const disposedModels = [];
            this._disposedModels.forEach((entry) => {
                if (!entry.sharesUndoRedoStack) {
                    disposedModels.push(entry);
                }
            });
            disposedModels.sort((a, b) => a.time - b.time);
            while (disposedModels.length > 0 && this._disposedModelsHeapSize > maxModelsHeapSize) {
                const disposedModel = disposedModels.shift();
                this._removeDisposedModel(disposedModel.uri);
                if (disposedModel.initialUndoRedoSnapshot !== null) {
                    this._undoRedoService.restoreSnapshot(disposedModel.initialUndoRedoSnapshot);
                }
            }
        }
    }
    _createModelData(value, languageIdOrSelection, resource, isForSimpleWidget) {
        // create & save the model
        const options = this.getCreationOptions(languageIdOrSelection, resource, isForSimpleWidget);
        const model = this._instantiationService.createInstance(TextModel, value, languageIdOrSelection, options, resource);
        if (resource && this._disposedModels.has(MODEL_ID(resource))) {
            const disposedModelData = this._removeDisposedModel(resource);
            const elements = this._undoRedoService.getElements(resource);
            const sha1Computer = this._getSHA1Computer();
            const sha1IsEqual = sha1Computer.canComputeSHA1(model)
                ? sha1Computer.computeSHA1(model) === disposedModelData.sha1
                : false;
            if (sha1IsEqual || disposedModelData.sharesUndoRedoStack) {
                for (const element of elements.past) {
                    if (isEditStackElement(element) && element.matchesResource(resource)) {
                        element.setModel(model);
                    }
                }
                for (const element of elements.future) {
                    if (isEditStackElement(element) && element.matchesResource(resource)) {
                        element.setModel(model);
                    }
                }
                this._undoRedoService.setElementsValidFlag(resource, true, (element) => isEditStackElement(element) && element.matchesResource(resource));
                if (sha1IsEqual) {
                    model._overwriteVersionId(disposedModelData.versionId);
                    model._overwriteAlternativeVersionId(disposedModelData.alternativeVersionId);
                    model._overwriteInitialUndoRedoSnapshot(disposedModelData.initialUndoRedoSnapshot);
                }
            }
            else {
                if (disposedModelData.initialUndoRedoSnapshot !== null) {
                    this._undoRedoService.restoreSnapshot(disposedModelData.initialUndoRedoSnapshot);
                }
            }
        }
        const modelId = MODEL_ID(model.uri);
        if (this._models[modelId]) {
            // There already exists a model with this id => this is a programmer error
            throw new Error('ModelService: Cannot add model because it already exists!');
        }
        const modelData = new ModelData(model, (model) => this._onWillDispose(model), (model, e) => this._onDidChangeLanguage(model, e));
        this._models[modelId] = modelData;
        return modelData;
    }
    updateModel(model, value) {
        const options = this.getCreationOptions(model.getLanguageId(), model.uri, model.isForSimpleWidget);
        const { textBuffer, disposable } = createTextBuffer(value, options.defaultEOL);
        // Return early if the text is already set in that form
        if (model.equalsTextBuffer(textBuffer)) {
            disposable.dispose();
            return;
        }
        // Otherwise find a diff between the values and update model
        model.pushStackElement();
        model.pushEOL(textBuffer.getEOL() === '\r\n' ? 1 /* EndOfLineSequence.CRLF */ : 0 /* EndOfLineSequence.LF */);
        model.pushEditOperations([], ModelService_1._computeEdits(model, textBuffer), () => []);
        model.pushStackElement();
        disposable.dispose();
    }
    static _commonPrefix(a, aLen, aDelta, b, bLen, bDelta) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a.getLineContent(aDelta + i) === b.getLineContent(bDelta + i); i++) {
            result++;
        }
        return result;
    }
    static _commonSuffix(a, aLen, aDelta, b, bLen, bDelta) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a.getLineContent(aDelta + aLen - i) === b.getLineContent(bDelta + bLen - i); i++) {
            result++;
        }
        return result;
    }
    /**
     * Compute edits to bring `model` to the state of `textSource`.
     */
    static _computeEdits(model, textBuffer) {
        const modelLineCount = model.getLineCount();
        const textBufferLineCount = textBuffer.getLineCount();
        const commonPrefix = this._commonPrefix(model, modelLineCount, 1, textBuffer, textBufferLineCount, 1);
        if (modelLineCount === textBufferLineCount && commonPrefix === modelLineCount) {
            // equality case
            return [];
        }
        const commonSuffix = this._commonSuffix(model, modelLineCount - commonPrefix, commonPrefix, textBuffer, textBufferLineCount - commonPrefix, commonPrefix);
        let oldRange;
        let newRange;
        if (commonSuffix > 0) {
            oldRange = new Range(commonPrefix + 1, 1, modelLineCount - commonSuffix + 1, 1);
            newRange = new Range(commonPrefix + 1, 1, textBufferLineCount - commonSuffix + 1, 1);
        }
        else if (commonPrefix > 0) {
            oldRange = new Range(commonPrefix, model.getLineMaxColumn(commonPrefix), modelLineCount, model.getLineMaxColumn(modelLineCount));
            newRange = new Range(commonPrefix, 1 + textBuffer.getLineLength(commonPrefix), textBufferLineCount, 1 + textBuffer.getLineLength(textBufferLineCount));
        }
        else {
            oldRange = new Range(1, 1, modelLineCount, model.getLineMaxColumn(modelLineCount));
            newRange = new Range(1, 1, textBufferLineCount, 1 + textBuffer.getLineLength(textBufferLineCount));
        }
        return [
            EditOperation.replaceMove(oldRange, textBuffer.getValueInRange(newRange, 0 /* EndOfLinePreference.TextDefined */)),
        ];
    }
    createModel(value, languageSelection, resource, isForSimpleWidget = false) {
        let modelData;
        if (languageSelection) {
            modelData = this._createModelData(value, languageSelection, resource, isForSimpleWidget);
        }
        else {
            modelData = this._createModelData(value, PLAINTEXT_LANGUAGE_ID, resource, isForSimpleWidget);
        }
        this._onModelAdded.fire(modelData.model);
        return modelData.model;
    }
    destroyModel(resource) {
        // We need to support that not all models get disposed through this service (i.e. model.dispose() should work!)
        const modelData = this._models[MODEL_ID(resource)];
        if (!modelData) {
            return;
        }
        modelData.model.dispose();
    }
    getModels() {
        const ret = [];
        const keys = Object.keys(this._models);
        for (let i = 0, len = keys.length; i < len; i++) {
            const modelId = keys[i];
            ret.push(this._models[modelId].model);
        }
        return ret;
    }
    getModel(resource) {
        const modelId = MODEL_ID(resource);
        const modelData = this._models[modelId];
        if (!modelData) {
            return null;
        }
        return modelData.model;
    }
    // --- end IModelService
    _schemaShouldMaintainUndoRedoElements(resource) {
        return (resource.scheme === Schemas.file ||
            resource.scheme === Schemas.vscodeRemote ||
            resource.scheme === Schemas.vscodeUserData ||
            resource.scheme === Schemas.vscodeNotebookCell ||
            resource.scheme === 'fake-fs' // for tests
        );
    }
    _onWillDispose(model) {
        const modelId = MODEL_ID(model.uri);
        const modelData = this._models[modelId];
        const sharesUndoRedoStack = this._undoRedoService.getUriComparisonKey(model.uri) !== model.uri.toString();
        let maintainUndoRedoStack = false;
        let heapSize = 0;
        if (sharesUndoRedoStack ||
            (this._shouldRestoreUndoStack() && this._schemaShouldMaintainUndoRedoElements(model.uri))) {
            const elements = this._undoRedoService.getElements(model.uri);
            if (elements.past.length > 0 || elements.future.length > 0) {
                for (const element of elements.past) {
                    if (isEditStackElement(element) && element.matchesResource(model.uri)) {
                        maintainUndoRedoStack = true;
                        heapSize += element.heapSize(model.uri);
                        element.setModel(model.uri); // remove reference from text buffer instance
                    }
                }
                for (const element of elements.future) {
                    if (isEditStackElement(element) && element.matchesResource(model.uri)) {
                        maintainUndoRedoStack = true;
                        heapSize += element.heapSize(model.uri);
                        element.setModel(model.uri); // remove reference from text buffer instance
                    }
                }
            }
        }
        const maxMemory = ModelService_1.MAX_MEMORY_FOR_CLOSED_FILES_UNDO_STACK;
        const sha1Computer = this._getSHA1Computer();
        if (!maintainUndoRedoStack) {
            if (!sharesUndoRedoStack) {
                const initialUndoRedoSnapshot = modelData.model.getInitialUndoRedoSnapshot();
                if (initialUndoRedoSnapshot !== null) {
                    this._undoRedoService.restoreSnapshot(initialUndoRedoSnapshot);
                }
            }
        }
        else if (!sharesUndoRedoStack &&
            (heapSize > maxMemory || !sha1Computer.canComputeSHA1(model))) {
            // the undo stack for this file would never fit in the configured memory or the file is very large, so don't bother with it.
            const initialUndoRedoSnapshot = modelData.model.getInitialUndoRedoSnapshot();
            if (initialUndoRedoSnapshot !== null) {
                this._undoRedoService.restoreSnapshot(initialUndoRedoSnapshot);
            }
        }
        else {
            this._ensureDisposedModelsHeapSize(maxMemory - heapSize);
            // We only invalidate the elements, but they remain in the undo-redo service.
            this._undoRedoService.setElementsValidFlag(model.uri, false, (element) => isEditStackElement(element) && element.matchesResource(model.uri));
            this._insertDisposedModel(new DisposedModelInfo(model.uri, modelData.model.getInitialUndoRedoSnapshot(), Date.now(), sharesUndoRedoStack, heapSize, sha1Computer.computeSHA1(model), model.getVersionId(), model.getAlternativeVersionId()));
        }
        delete this._models[modelId];
        modelData.dispose();
        // clean up cache
        delete this._modelCreationOptionsByLanguageAndResource[model.getLanguageId() + model.uri];
        this._onModelRemoved.fire(model);
    }
    _onDidChangeLanguage(model, e) {
        const oldLanguageId = e.oldLanguage;
        const newLanguageId = model.getLanguageId();
        const oldOptions = this.getCreationOptions(oldLanguageId, model.uri, model.isForSimpleWidget);
        const newOptions = this.getCreationOptions(newLanguageId, model.uri, model.isForSimpleWidget);
        ModelService_1._setModelOptionsForModel(model, newOptions, oldOptions);
        this._onModelModeChanged.fire({ model, oldLanguageId: oldLanguageId });
    }
    _getSHA1Computer() {
        return new DefaultModelSHA1Computer();
    }
};
ModelService = ModelService_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITextResourcePropertiesService),
    __param(2, IUndoRedoService),
    __param(3, IInstantiationService)
], ModelService);
export { ModelService };
export class DefaultModelSHA1Computer {
    static { this.MAX_MODEL_SIZE = 10 * 1024 * 1024; } // takes 200ms to compute a sha1 on a 10MB model on a new machine
    canComputeSHA1(model) {
        return model.getValueLength() <= DefaultModelSHA1Computer.MAX_MODEL_SIZE;
    }
    computeSHA1(model) {
        // compute the sha1
        const shaComputer = new StringSHA1();
        const snapshot = model.createSnapshot();
        let text;
        while ((text = snapshot.read())) {
            shaComputer.update(text);
        }
        return shaComputer.digest();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL21vZGVsU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUYsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLDBCQUEwQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQVV4QyxPQUFPLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDL0UsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUUvRixTQUFTLFFBQVEsQ0FBQyxRQUFhO0lBQzlCLE9BQU8sUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFBO0FBQzNCLENBQUM7QUFFRCxNQUFNLFNBQVM7SUFHZCxZQUNpQixLQUFnQixFQUNoQyxhQUEwQyxFQUMxQyxtQkFBK0U7UUFGL0QsVUFBSyxHQUFMLEtBQUssQ0FBVztRQUhoQix5QkFBb0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBTzVELElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQy9GLENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3BDLENBQUM7Q0FDRDtBQWtCRCxNQUFNLFdBQVcsR0FDaEIsUUFBUSxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsNkJBQXFCLENBQUMsOEJBQXNCLENBQUE7QUFFdkYsTUFBTSxpQkFBaUI7SUFDdEIsWUFDaUIsR0FBUSxFQUNSLHVCQUF5RCxFQUN6RCxJQUFZLEVBQ1osbUJBQTRCLEVBQzVCLFFBQWdCLEVBQ2hCLElBQVksRUFDWixTQUFpQixFQUNqQixvQkFBNEI7UUFQNUIsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBa0M7UUFDekQsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBUztRQUM1QixhQUFRLEdBQVIsUUFBUSxDQUFRO1FBQ2hCLFNBQUksR0FBSixJQUFJLENBQVE7UUFDWixjQUFTLEdBQVQsU0FBUyxDQUFRO1FBQ2pCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBUTtJQUMxQyxDQUFDO0NBQ0o7QUFFTSxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFhLFNBQVEsVUFBVTs7YUFDN0IsMkNBQXNDLEdBQUcsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLEFBQW5CLENBQW1CO0lBMEJ2RSxZQUN3QixxQkFBNkQsRUFFcEYsMEJBQTJFLEVBQ3pELGdCQUFtRCxFQUM5QyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFOaUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUVuRSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQWdDO1FBQ3hDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDN0IsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQTNCcEUsa0JBQWEsR0FBd0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYyxDQUFDLENBQUE7UUFDL0UsaUJBQVksR0FBc0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUE7UUFFekQsb0JBQWUsR0FBd0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBYyxDQUFDLENBQUE7UUFDakYsbUJBQWMsR0FBc0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7UUFFN0Qsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDcEQsSUFBSSxPQUFPLEVBQWdELENBQzNELENBQUE7UUFDZSwyQkFBc0IsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBcUJ0RSxJQUFJLENBQUMsMENBQTBDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQTtRQUNqQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFBO1FBQzNELElBQUksQ0FBQyx1QkFBdUIsR0FBRyxDQUFDLENBQUE7UUFFaEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFTyxNQUFNLENBQUMsaUJBQWlCLENBQy9CLE1BQWtCLEVBQ2xCLGlCQUEwQjtRQUUxQixJQUFJLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxPQUFPLENBQUE7UUFDM0MsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbkUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxHQUFHLGFBQWEsQ0FBQTtZQUN4QixDQUFDO1lBQ0QsSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sR0FBRyxDQUFDLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksVUFBVSxHQUF1QixTQUFTLENBQUE7UUFDOUMsSUFDQyxNQUFNLENBQUMsTUFBTTtZQUNiLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssV0FBVztZQUMvQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQ3JDLENBQUM7WUFDRixNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztnQkFDOUIsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxZQUFZLENBQUE7UUFDckQsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDeEUsWUFBWTtnQkFDWCxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDdEYsQ0FBQztRQUVELElBQUksYUFBYSxHQUFHLFdBQVcsQ0FBQTtRQUMvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFBO1FBQ3RCLElBQUksR0FBRyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLGFBQWEsZ0NBQXdCLENBQUE7UUFDdEMsQ0FBQzthQUFNLElBQUksR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pCLGFBQWEsOEJBQXNCLENBQUE7UUFDcEMsQ0FBQztRQUVELElBQUksa0JBQWtCLEdBQUcscUJBQXFCLENBQUMsa0JBQWtCLENBQUE7UUFDakUsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM5RSxrQkFBa0I7Z0JBQ2pCLE1BQU0sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEtBQUssT0FBTztvQkFDM0MsQ0FBQyxDQUFDLEtBQUs7b0JBQ1AsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELElBQUksaUJBQWlCLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLENBQUE7UUFDL0QsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUM3RSxpQkFBaUI7Z0JBQ2hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLEtBQUssT0FBTztvQkFDMUMsQ0FBQyxDQUFDLEtBQUs7b0JBQ1AsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDN0MsQ0FBQztRQUVELElBQUksc0JBQXNCLEdBQUcscUJBQXFCLENBQUMsc0JBQXNCLENBQUE7UUFDekUsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNsRixzQkFBc0I7Z0JBQ3JCLE1BQU0sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEtBQUssT0FBTztvQkFDL0MsQ0FBQyxDQUFDLEtBQUs7b0JBQ1AsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUNELElBQUksOEJBQThCLEdBQUcscUJBQXFCLENBQUMsOEJBQThCLENBQUE7UUFDekYsSUFDQyxNQUFNLENBQUMsTUFBTSxFQUFFLHVCQUF1QjtZQUN0QyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEtBQUssUUFBUSxFQUN4RCxDQUFDO1lBQ0YsOEJBQThCLEdBQUc7Z0JBQ2hDLE9BQU8sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPO2dCQUN4RCxrQ0FBa0MsRUFDakMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsdUJBQXVCLENBQUMsa0NBQWtDO2FBQzNFLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTztZQUNOLGlCQUFpQixFQUFFLGlCQUFpQjtZQUNwQyxPQUFPLEVBQUUsT0FBTztZQUNoQixVQUFVLEVBQUUsVUFBVTtZQUN0QixZQUFZLEVBQUUsWUFBWTtZQUMxQixpQkFBaUIsRUFBRSxpQkFBaUI7WUFDcEMsVUFBVSxFQUFFLGFBQWE7WUFDekIsa0JBQWtCLEVBQUUsa0JBQWtCO1lBQ3RDLHNCQUFzQixFQUFFLHNCQUFzQjtZQUM5Qyw4QkFBOEI7U0FDOUIsQ0FBQTtJQUNGLENBQUM7SUFFTyxPQUFPLENBQUMsUUFBeUIsRUFBRSxRQUFnQjtRQUMxRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNsRSxDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQzlGLElBQUksR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdEQsT0FBTyxHQUFHLENBQUE7UUFDWCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsRUFBRSwyQ0FBbUM7WUFDcEQsUUFBUSxDQUFDLEVBQUUsK0NBQXVDO1lBQ2xELENBQUMsQ0FBQyxJQUFJO1lBQ04sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtJQUNWLENBQUM7SUFFTyx1QkFBdUI7UUFDOUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO1FBQzVFLElBQUksT0FBTyxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakMsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0sa0JBQWtCLENBQ3hCLHFCQUFrRCxFQUNsRCxRQUF5QixFQUN6QixpQkFBMEI7UUFFMUIsTUFBTSxRQUFRLEdBQ2IsT0FBTyxxQkFBcUIsS0FBSyxRQUFRO1lBQ3hDLENBQUMsQ0FBQyxxQkFBcUI7WUFDdkIsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQTtRQUNwQyxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsMENBQTBDLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFBO1FBQzFGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFtQixRQUFRLEVBQUU7Z0JBQzlFLGtCQUFrQixFQUFFLFFBQVE7Z0JBQzVCLFFBQVE7YUFDUixDQUFDLENBQUE7WUFDRixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM1QyxlQUFlLEdBQUcsY0FBWSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUE7WUFDcEYsSUFBSSxDQUFDLDBDQUEwQyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsR0FBRyxlQUFlLENBQUE7UUFDdkYsQ0FBQztRQUNELE9BQU8sZUFBZSxDQUFBO0lBQ3ZCLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxDQUF3QztRQUNuRSxNQUFNLCtCQUErQixHQUFHLElBQUksQ0FBQywwQ0FBMEMsQ0FBQTtRQUN2RixJQUFJLENBQUMsMENBQTBDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVyRSwrQkFBK0I7UUFDL0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDaEQsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUE7WUFFL0IsSUFDQyxDQUFDO2dCQUNELENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUM7Z0JBQ2xGLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxFQUFFLGtCQUFrQixFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFDcEYsQ0FBQztnQkFDRixTQUFRLENBQUMsbUVBQW1FO1lBQzdFLENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRywrQkFBK0IsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDbEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQzVGLGNBQVksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUMvRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyx3QkFBd0IsQ0FDdEMsS0FBaUIsRUFDakIsVUFBcUMsRUFDckMsY0FBeUM7UUFFekMsSUFDQyxjQUFjO1lBQ2QsY0FBYyxDQUFDLFVBQVUsS0FBSyxVQUFVLENBQUMsVUFBVTtZQUNuRCxLQUFLLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxFQUN6QixDQUFDO1lBQ0YsS0FBSyxDQUFDLE1BQU0sQ0FDWCxVQUFVLENBQUMsVUFBVSxnQ0FBd0I7Z0JBQzVDLENBQUM7Z0JBQ0QsQ0FBQywrQkFBdUIsQ0FDekIsQ0FBQTtRQUNGLENBQUM7UUFFRCxJQUNDLGNBQWM7WUFDZCxjQUFjLENBQUMsaUJBQWlCLEtBQUssVUFBVSxDQUFDLGlCQUFpQjtZQUNqRSxjQUFjLENBQUMsWUFBWSxLQUFLLFVBQVUsQ0FBQyxZQUFZO1lBQ3ZELGNBQWMsQ0FBQyxPQUFPLEtBQUssVUFBVSxDQUFDLE9BQU87WUFDN0MsY0FBYyxDQUFDLFVBQVUsS0FBSyxVQUFVLENBQUMsVUFBVTtZQUNuRCxjQUFjLENBQUMsa0JBQWtCLEtBQUssVUFBVSxDQUFDLGtCQUFrQjtZQUNuRSxNQUFNLENBQ0wsY0FBYyxDQUFDLDhCQUE4QixFQUM3QyxVQUFVLENBQUMsOEJBQThCLENBQ3pDLEVBQ0EsQ0FBQztZQUNGLCtDQUErQztZQUMvQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDbEMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BFLEtBQUssQ0FBQyxhQUFhLENBQUM7Z0JBQ25CLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0I7Z0JBQ2pELDBCQUEwQixFQUFFLFVBQVUsQ0FBQyw4QkFBOEI7YUFDckUsQ0FBQyxDQUFBO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsYUFBYSxDQUFDO2dCQUNuQixZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVk7Z0JBQ3JDLE9BQU8sRUFBRSxVQUFVLENBQUMsT0FBTztnQkFDM0IsVUFBVSxFQUFFLFVBQVUsQ0FBQyxVQUFVO2dCQUNqQyxrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCO2dCQUNqRCwwQkFBMEIsRUFBRSxVQUFVLENBQUMsOEJBQThCO2FBQ3JFLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRUQsMEJBQTBCO0lBRWxCLG9CQUFvQixDQUFDLGlCQUFvQztRQUNoRSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUM1RSxJQUFJLENBQUMsdUJBQXVCLElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFBO0lBQzNELENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUFhO1FBQ3pDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDdEUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyx1QkFBdUIsSUFBSSxpQkFBaUIsQ0FBQyxRQUFRLENBQUE7UUFDM0QsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE9BQU8saUJBQWlCLENBQUE7SUFDekIsQ0FBQztJQUVPLDZCQUE2QixDQUFDLGlCQUF5QjtRQUM5RCxJQUFJLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3RELHFFQUFxRTtZQUNyRSxNQUFNLGNBQWMsR0FBd0IsRUFBRSxDQUFBO1lBQzlDLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztvQkFDaEMsY0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0YsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzlDLE9BQU8sY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLHVCQUF1QixHQUFHLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3RGLE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUcsQ0FBQTtnQkFDN0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDNUMsSUFBSSxhQUFhLENBQUMsdUJBQXVCLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3BELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQzdFLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsS0FBa0MsRUFDbEMscUJBQWtELEVBQ2xELFFBQXlCLEVBQ3pCLGlCQUEwQjtRQUUxQiwwQkFBMEI7UUFDMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQzNGLE1BQU0sS0FBSyxHQUFjLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ2pFLFNBQVMsRUFDVCxLQUFLLEVBQ0wscUJBQXFCLEVBQ3JCLE9BQU8sRUFDUCxRQUFRLENBQ1IsQ0FBQTtRQUNELElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFFLENBQUE7WUFDOUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM1RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUM1QyxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztnQkFDckQsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssaUJBQWlCLENBQUMsSUFBSTtnQkFDNUQsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUNSLElBQUksV0FBVyxJQUFJLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLENBQUM7Z0JBQzFELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNyQyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzt3QkFDdEUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDeEIsQ0FBQztnQkFDRixDQUFDO2dCQUNELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN2QyxJQUFJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQzt3QkFDdEUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtvQkFDeEIsQ0FBQztnQkFDRixDQUFDO2dCQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FDekMsUUFBUSxFQUNSLElBQUksRUFDSixDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FDN0UsQ0FBQTtnQkFDRCxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixLQUFLLENBQUMsbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUE7b0JBQ3RELEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO29CQUM1RSxLQUFLLENBQUMsaUNBQWlDLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDbkYsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLGlCQUFpQixDQUFDLHVCQUF1QixLQUFLLElBQUksRUFBRSxDQUFDO29CQUN4RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQ2pGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFbkMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0IsMEVBQTBFO1lBQzFFLE1BQU0sSUFBSSxLQUFLLENBQUMsMkRBQTJELENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxTQUFTLENBQzlCLEtBQUssRUFDTCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFDckMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUNqRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxTQUFTLENBQUE7UUFFakMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVNLFdBQVcsQ0FBQyxLQUFpQixFQUFFLEtBQWtDO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEMsS0FBSyxDQUFDLGFBQWEsRUFBRSxFQUNyQixLQUFLLENBQUMsR0FBRyxFQUNULEtBQUssQ0FBQyxpQkFBaUIsQ0FDdkIsQ0FBQTtRQUNELE1BQU0sRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUU5RSx1REFBdUQ7UUFDdkQsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN4QyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFFRCw0REFBNEQ7UUFDNUQsS0FBSyxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDeEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEtBQUssTUFBTSxDQUFDLENBQUMsZ0NBQXdCLENBQUMsNkJBQXFCLENBQUMsQ0FBQTtRQUM3RixLQUFLLENBQUMsa0JBQWtCLENBQUMsRUFBRSxFQUFFLGNBQVksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3hCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU8sTUFBTSxDQUFDLGFBQWEsQ0FDM0IsQ0FBYSxFQUNiLElBQVksRUFDWixNQUFjLEVBQ2QsQ0FBYyxFQUNkLElBQVksRUFDWixNQUFjO1FBRWQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFdEMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ2QsS0FDQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQ1QsQ0FBQyxHQUFHLFNBQVMsSUFBSSxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDOUUsQ0FBQyxFQUFFLEVBQ0YsQ0FBQztZQUNGLE1BQU0sRUFBRSxDQUFBO1FBQ1QsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE1BQU0sQ0FBQyxhQUFhLENBQzNCLENBQWEsRUFDYixJQUFZLEVBQ1osTUFBYyxFQUNkLENBQWMsRUFDZCxJQUFZLEVBQ1osTUFBYztRQUVkLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXRDLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNkLEtBQ0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUNULENBQUMsR0FBRyxTQUFTLElBQUksQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsRUFDNUYsQ0FBQyxFQUFFLEVBQ0YsQ0FBQztZQUNGLE1BQU0sRUFBRSxDQUFBO1FBQ1QsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFpQixFQUFFLFVBQXVCO1FBQ3JFLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQyxNQUFNLG1CQUFtQixHQUFHLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNyRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUN0QyxLQUFLLEVBQ0wsY0FBYyxFQUNkLENBQUMsRUFDRCxVQUFVLEVBQ1YsbUJBQW1CLEVBQ25CLENBQUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxjQUFjLEtBQUssbUJBQW1CLElBQUksWUFBWSxLQUFLLGNBQWMsRUFBRSxDQUFDO1lBQy9FLGdCQUFnQjtZQUNoQixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUN0QyxLQUFLLEVBQ0wsY0FBYyxHQUFHLFlBQVksRUFDN0IsWUFBWSxFQUNaLFVBQVUsRUFDVixtQkFBbUIsR0FBRyxZQUFZLEVBQ2xDLFlBQVksQ0FDWixDQUFBO1FBRUQsSUFBSSxRQUFlLENBQUE7UUFDbkIsSUFBSSxRQUFlLENBQUE7UUFDbkIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGNBQWMsR0FBRyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9FLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxtQkFBbUIsR0FBRyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLENBQUM7YUFBTSxJQUFJLFlBQVksR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3QixRQUFRLEdBQUcsSUFBSSxLQUFLLENBQ25CLFlBQVksRUFDWixLQUFLLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQ3BDLGNBQWMsRUFDZCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQ3RDLENBQUE7WUFDRCxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQ25CLFlBQVksRUFDWixDQUFDLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsRUFDMUMsbUJBQW1CLEVBQ25CLENBQUMsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLENBQ2pELENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtZQUNsRixRQUFRLEdBQUcsSUFBSSxLQUFLLENBQ25CLENBQUMsRUFDRCxDQUFDLEVBQ0QsbUJBQW1CLEVBQ25CLENBQUMsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLENBQ2pELENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTztZQUNOLGFBQWEsQ0FBQyxXQUFXLENBQ3hCLFFBQVEsRUFDUixVQUFVLENBQUMsZUFBZSxDQUFDLFFBQVEsMENBQWtDLENBQ3JFO1NBQ0QsQ0FBQTtJQUNGLENBQUM7SUFFTSxXQUFXLENBQ2pCLEtBQWtDLEVBQ2xDLGlCQUE0QyxFQUM1QyxRQUFjLEVBQ2Qsb0JBQTZCLEtBQUs7UUFFbEMsSUFBSSxTQUFvQixDQUFBO1FBRXhCLElBQUksaUJBQWlCLEVBQUUsQ0FBQztZQUN2QixTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUN6RixDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLHFCQUFxQixFQUFFLFFBQVEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQzdGLENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFeEMsT0FBTyxTQUFTLENBQUMsS0FBSyxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxZQUFZLENBQUMsUUFBYTtRQUNoQywrR0FBK0c7UUFDL0csTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTTtRQUNQLENBQUM7UUFDRCxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUM7SUFFTSxTQUFTO1FBQ2YsTUFBTSxHQUFHLEdBQWlCLEVBQUUsQ0FBQTtRQUU1QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDakQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0QyxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBRU0sUUFBUSxDQUFDLFFBQWE7UUFDNUIsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFDLEtBQUssQ0FBQTtJQUN2QixDQUFDO0lBRUQsd0JBQXdCO0lBRWQscUNBQXFDLENBQUMsUUFBYTtRQUM1RCxPQUFPLENBQ04sUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSTtZQUNoQyxRQUFRLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZO1lBQ3hDLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGNBQWM7WUFDMUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsa0JBQWtCO1lBQzlDLFFBQVEsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLFlBQVk7U0FDMUMsQ0FBQTtJQUNGLENBQUM7SUFFTyxjQUFjLENBQUMsS0FBaUI7UUFDdkMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXZDLE1BQU0sbUJBQW1CLEdBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM5RSxJQUFJLHFCQUFxQixHQUFHLEtBQUssQ0FBQTtRQUNqQyxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDaEIsSUFDQyxtQkFBbUI7WUFDbkIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxJQUFJLENBQUMscUNBQXFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ3hGLENBQUM7WUFDRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM3RCxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUQsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3JDLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDdkUscUJBQXFCLEdBQUcsSUFBSSxDQUFBO3dCQUM1QixRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ3ZDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsNkNBQTZDO29CQUMxRSxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3ZDLElBQUksa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDdkUscUJBQXFCLEdBQUcsSUFBSSxDQUFBO3dCQUM1QixRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7d0JBQ3ZDLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsNkNBQTZDO29CQUMxRSxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLGNBQVksQ0FBQyxzQ0FBc0MsQ0FBQTtRQUNyRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUM1QyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDMUIsTUFBTSx1QkFBdUIsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUE7Z0JBQzVFLElBQUksdUJBQXVCLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3RDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtnQkFDL0QsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sSUFDTixDQUFDLG1CQUFtQjtZQUNwQixDQUFDLFFBQVEsR0FBRyxTQUFTLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzVELENBQUM7WUFDRiw0SEFBNEg7WUFDNUgsTUFBTSx1QkFBdUIsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUE7WUFDNUUsSUFBSSx1QkFBdUIsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDdEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQy9ELENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLENBQUE7WUFDeEQsNkVBQTZFO1lBQzdFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FDekMsS0FBSyxDQUFDLEdBQUcsRUFDVCxLQUFLLEVBQ0wsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUM5RSxDQUFBO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixDQUN4QixJQUFJLGlCQUFpQixDQUNwQixLQUFLLENBQUMsR0FBRyxFQUNULFNBQVMsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsRUFDNUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUNWLG1CQUFtQixFQUNuQixRQUFRLEVBQ1IsWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFDL0IsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUNwQixLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FDL0IsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM1QixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFbkIsaUJBQWlCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLDBDQUEwQyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFekYsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVPLG9CQUFvQixDQUFDLEtBQWlCLEVBQUUsQ0FBNkI7UUFDNUUsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQTtRQUNuQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDM0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzdGLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUM3RixjQUFZLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFUyxnQkFBZ0I7UUFDekIsT0FBTyxJQUFJLHdCQUF3QixFQUFFLENBQUE7SUFDdEMsQ0FBQzs7QUE5bkJXLFlBQVk7SUE0QnRCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSw4QkFBOEIsQ0FBQTtJQUU5QixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEscUJBQXFCLENBQUE7R0FoQ1gsWUFBWSxDQStuQnhCOztBQU9ELE1BQU0sT0FBTyx3QkFBd0I7YUFDdEIsbUJBQWMsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQSxHQUFDLGlFQUFpRTtJQUVqSCxjQUFjLENBQUMsS0FBaUI7UUFDL0IsT0FBTyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksd0JBQXdCLENBQUMsY0FBYyxDQUFBO0lBQ3pFLENBQUM7SUFFRCxXQUFXLENBQUMsS0FBaUI7UUFDNUIsbUJBQW1CO1FBQ25CLE1BQU0sV0FBVyxHQUFHLElBQUksVUFBVSxFQUFFLENBQUE7UUFDcEMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLElBQUksSUFBbUIsQ0FBQTtRQUN2QixPQUFPLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDakMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QixDQUFDO1FBQ0QsT0FBTyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDNUIsQ0FBQyJ9