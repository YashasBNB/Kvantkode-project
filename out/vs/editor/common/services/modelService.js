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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9tb2RlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVGLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFVeEMsT0FBTyxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXBFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR3JFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQy9FLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHFCQUFx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