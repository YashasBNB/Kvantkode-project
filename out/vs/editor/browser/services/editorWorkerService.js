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
import { timeout } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { logOnceWebWorkerWarning, } from '../../../base/common/worker/webWorker.js';
import { createWebWorker } from '../../../base/browser/webWorkerFactory.js';
import { Range } from '../../common/core/range.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { EditorWorker } from '../../common/services/editorWebWorker.js';
import { IModelService } from '../../common/services/model.js';
import { ITextResourceConfigurationService } from '../../common/services/textResourceConfiguration.js';
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { canceled, onUnexpectedError } from '../../../base/common/errors.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import { MovedText } from '../../common/diff/linesDiffComputer.js';
import { DetailedLineRangeMapping, RangeMapping, LineRangeMapping, } from '../../common/diff/rangeMapping.js';
import { LineRange } from '../../common/core/lineRange.js';
import { mainWindow } from '../../../base/browser/window.js';
import { WindowIntervalTimer } from '../../../base/browser/dom.js';
import { WorkerTextModelSyncClient } from '../../common/services/textModelSync/textModelSync.impl.js';
import { EditorWorkerHost } from '../../common/services/editorWorkerHost.js';
/**
 * Stop the worker if it was not needed for 5 min.
 */
const STOP_WORKER_DELTA_TIME_MS = 5 * 60 * 1000;
function canSyncModel(modelService, resource) {
    const model = modelService.getModel(resource);
    if (!model) {
        return false;
    }
    if (model.isTooLargeForSyncing()) {
        return false;
    }
    return true;
}
let EditorWorkerService = class EditorWorkerService extends Disposable {
    constructor(workerDescriptor, modelService, configurationService, logService, _languageConfigurationService, languageFeaturesService) {
        super();
        this._languageConfigurationService = _languageConfigurationService;
        this._modelService = modelService;
        this._workerManager = this._register(new WorkerManager(workerDescriptor, this._modelService));
        this._logService = logService;
        // register default link-provider and default completions-provider
        this._register(languageFeaturesService.linkProvider.register({ language: '*', hasAccessToAllModels: true }, {
            provideLinks: async (model, token) => {
                if (!canSyncModel(this._modelService, model.uri)) {
                    return Promise.resolve({ links: [] }); // File too large
                }
                const worker = await this._workerWithResources([model.uri]);
                const links = await worker.$computeLinks(model.uri.toString());
                return links && { links };
            },
        }));
        this._register(languageFeaturesService.completionProvider.register('*', new WordBasedCompletionItemProvider(this._workerManager, configurationService, this._modelService, this._languageConfigurationService)));
    }
    dispose() {
        super.dispose();
    }
    canComputeUnicodeHighlights(uri) {
        return canSyncModel(this._modelService, uri);
    }
    async computedUnicodeHighlights(uri, options, range) {
        const worker = await this._workerWithResources([uri]);
        return worker.$computeUnicodeHighlights(uri.toString(), options, range);
    }
    async computeDiff(original, modified, options, algorithm) {
        const worker = await this._workerWithResources([original, modified], 
        /* forceLargeModels */ true);
        const result = await worker.$computeDiff(original.toString(), modified.toString(), options, algorithm);
        if (!result) {
            return null;
        }
        // Convert from space efficient JSON data to rich objects.
        const diff = {
            identical: result.identical,
            quitEarly: result.quitEarly,
            changes: toLineRangeMappings(result.changes),
            moves: result.moves.map((m) => new MovedText(new LineRangeMapping(new LineRange(m[0], m[1]), new LineRange(m[2], m[3])), toLineRangeMappings(m[4]))),
        };
        return diff;
        function toLineRangeMappings(changes) {
            return changes.map((c) => new DetailedLineRangeMapping(new LineRange(c[0], c[1]), new LineRange(c[2], c[3]), c[4]?.map((c) => new RangeMapping(new Range(c[0], c[1], c[2], c[3]), new Range(c[4], c[5], c[6], c[7])))));
        }
    }
    canComputeDirtyDiff(original, modified) {
        return canSyncModel(this._modelService, original) && canSyncModel(this._modelService, modified);
    }
    async computeDirtyDiff(original, modified, ignoreTrimWhitespace) {
        const worker = await this._workerWithResources([original, modified]);
        return worker.$computeDirtyDiff(original.toString(), modified.toString(), ignoreTrimWhitespace);
    }
    async computeMoreMinimalEdits(resource, edits, pretty = false) {
        if (isNonEmptyArray(edits)) {
            if (!canSyncModel(this._modelService, resource)) {
                return Promise.resolve(edits); // File too large
            }
            const sw = StopWatch.create();
            const result = this._workerWithResources([resource]).then((worker) => worker.$computeMoreMinimalEdits(resource.toString(), edits, pretty));
            result.finally(() => this._logService.trace('FORMAT#computeMoreMinimalEdits', resource.toString(true), sw.elapsed()));
            return Promise.race([result, timeout(1000).then(() => edits)]);
        }
        else {
            return Promise.resolve(undefined);
        }
    }
    computeHumanReadableDiff(resource, edits) {
        if (isNonEmptyArray(edits)) {
            if (!canSyncModel(this._modelService, resource)) {
                return Promise.resolve(edits); // File too large
            }
            const sw = StopWatch.create();
            const opts = {
                ignoreTrimWhitespace: false,
                maxComputationTimeMs: 1000,
                computeMoves: false,
            };
            const result = this._workerWithResources([resource])
                .then((worker) => worker.$computeHumanReadableDiff(resource.toString(), edits, opts))
                .catch((err) => {
                onUnexpectedError(err);
                // In case of an exception, fall back to computeMoreMinimalEdits
                return this.computeMoreMinimalEdits(resource, edits, true);
            });
            result.finally(() => this._logService.trace('FORMAT#computeHumanReadableDiff', resource.toString(true), sw.elapsed()));
            return result;
        }
        else {
            return Promise.resolve(undefined);
        }
    }
    canNavigateValueSet(resource) {
        return canSyncModel(this._modelService, resource);
    }
    async navigateValueSet(resource, range, up) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return null;
        }
        const wordDefRegExp = this._languageConfigurationService
            .getLanguageConfiguration(model.getLanguageId())
            .getWordDefinition();
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        const worker = await this._workerWithResources([resource]);
        return worker.$navigateValueSet(resource.toString(), range, up, wordDef, wordDefFlags);
    }
    canComputeWordRanges(resource) {
        return canSyncModel(this._modelService, resource);
    }
    async computeWordRanges(resource, range) {
        const model = this._modelService.getModel(resource);
        if (!model) {
            return Promise.resolve(null);
        }
        const wordDefRegExp = this._languageConfigurationService
            .getLanguageConfiguration(model.getLanguageId())
            .getWordDefinition();
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        const worker = await this._workerWithResources([resource]);
        return worker.$computeWordRanges(resource.toString(), range, wordDef, wordDefFlags);
    }
    async findSectionHeaders(uri, options) {
        const worker = await this._workerWithResources([uri]);
        return worker.$findSectionHeaders(uri.toString(), options);
    }
    async computeDefaultDocumentColors(uri) {
        const worker = await this._workerWithResources([uri]);
        return worker.$computeDefaultDocumentColors(uri.toString());
    }
    async _workerWithResources(resources, forceLargeModels = false) {
        const worker = await this._workerManager.withWorker();
        return await worker.workerWithSyncedResources(resources, forceLargeModels);
    }
};
EditorWorkerService = __decorate([
    __param(1, IModelService),
    __param(2, ITextResourceConfigurationService),
    __param(3, ILogService),
    __param(4, ILanguageConfigurationService),
    __param(5, ILanguageFeaturesService)
], EditorWorkerService);
export { EditorWorkerService };
class WordBasedCompletionItemProvider {
    constructor(workerManager, configurationService, modelService, languageConfigurationService) {
        this.languageConfigurationService = languageConfigurationService;
        this._debugDisplayName = 'wordbasedCompletions';
        this._workerManager = workerManager;
        this._configurationService = configurationService;
        this._modelService = modelService;
    }
    async provideCompletionItems(model, position) {
        const config = this._configurationService.getValue(model.uri, position, 'editor');
        if (config.wordBasedSuggestions === 'off') {
            return undefined;
        }
        const models = [];
        if (config.wordBasedSuggestions === 'currentDocument') {
            // only current file and only if not too large
            if (canSyncModel(this._modelService, model.uri)) {
                models.push(model.uri);
            }
        }
        else {
            // either all files or files of same language
            for (const candidate of this._modelService.getModels()) {
                if (!canSyncModel(this._modelService, candidate.uri)) {
                    continue;
                }
                if (candidate === model) {
                    models.unshift(candidate.uri);
                }
                else if (config.wordBasedSuggestions === 'allDocuments' ||
                    candidate.getLanguageId() === model.getLanguageId()) {
                    models.push(candidate.uri);
                }
            }
        }
        if (models.length === 0) {
            return undefined; // File too large, no other files
        }
        const wordDefRegExp = this.languageConfigurationService
            .getLanguageConfiguration(model.getLanguageId())
            .getWordDefinition();
        const word = model.getWordAtPosition(position);
        const replace = !word
            ? Range.fromPositions(position)
            : new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        const insert = replace.setEndPosition(position.lineNumber, position.column);
        const client = await this._workerManager.withWorker();
        const data = await client.textualSuggest(models, word?.word, wordDefRegExp);
        if (!data) {
            return undefined;
        }
        return {
            duration: data.duration,
            suggestions: data.words.map((word) => {
                return {
                    kind: 18 /* languages.CompletionItemKind.Text */,
                    label: word,
                    insertText: word,
                    range: { insert, replace },
                };
            }),
        };
    }
}
let WorkerManager = class WorkerManager extends Disposable {
    constructor(_workerDescriptor, modelService) {
        super();
        this._workerDescriptor = _workerDescriptor;
        this._modelService = modelService;
        this._editorWorkerClient = null;
        this._lastWorkerUsedTime = new Date().getTime();
        const stopWorkerInterval = this._register(new WindowIntervalTimer());
        stopWorkerInterval.cancelAndSet(() => this._checkStopIdleWorker(), Math.round(STOP_WORKER_DELTA_TIME_MS / 2), mainWindow);
        this._register(this._modelService.onModelRemoved((_) => this._checkStopEmptyWorker()));
    }
    dispose() {
        if (this._editorWorkerClient) {
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
        super.dispose();
    }
    /**
     * Check if the model service has no more models and stop the worker if that is the case.
     */
    _checkStopEmptyWorker() {
        if (!this._editorWorkerClient) {
            return;
        }
        const models = this._modelService.getModels();
        if (models.length === 0) {
            // There are no more models => nothing possible for me to do
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
    }
    /**
     * Check if the worker has been idle for a while and then stop it.
     */
    _checkStopIdleWorker() {
        if (!this._editorWorkerClient) {
            return;
        }
        const timeSinceLastWorkerUsedTime = new Date().getTime() - this._lastWorkerUsedTime;
        if (timeSinceLastWorkerUsedTime > STOP_WORKER_DELTA_TIME_MS) {
            this._editorWorkerClient.dispose();
            this._editorWorkerClient = null;
        }
    }
    withWorker() {
        this._lastWorkerUsedTime = new Date().getTime();
        if (!this._editorWorkerClient) {
            this._editorWorkerClient = new EditorWorkerClient(this._workerDescriptor, false, this._modelService);
        }
        return Promise.resolve(this._editorWorkerClient);
    }
};
WorkerManager = __decorate([
    __param(1, IModelService)
], WorkerManager);
class SynchronousWorkerClient {
    constructor(instance) {
        this._instance = instance;
        this.proxy = this._instance;
    }
    dispose() {
        this._instance.dispose();
    }
    setChannel(channel, handler) {
        throw new Error(`Not supported`);
    }
    getChannel(channel) {
        throw new Error(`Not supported`);
    }
}
let EditorWorkerClient = class EditorWorkerClient extends Disposable {
    constructor(_workerDescriptorOrWorker, keepIdleModels, modelService) {
        super();
        this._workerDescriptorOrWorker = _workerDescriptorOrWorker;
        this._disposed = false;
        this._modelService = modelService;
        this._keepIdleModels = keepIdleModels;
        this._worker = null;
        this._modelManager = null;
    }
    // foreign host request
    fhr(method, args) {
        throw new Error(`Not implemented!`);
    }
    _getOrCreateWorker() {
        if (!this._worker) {
            try {
                this._worker = this._register(createWebWorker(this._workerDescriptorOrWorker));
                EditorWorkerHost.setChannel(this._worker, this._createEditorWorkerHost());
            }
            catch (err) {
                logOnceWebWorkerWarning(err);
                this._worker = this._createFallbackLocalWorker();
            }
        }
        return this._worker;
    }
    async _getProxy() {
        try {
            const proxy = this._getOrCreateWorker().proxy;
            await proxy.$ping();
            return proxy;
        }
        catch (err) {
            logOnceWebWorkerWarning(err);
            this._worker = this._createFallbackLocalWorker();
            return this._worker.proxy;
        }
    }
    _createFallbackLocalWorker() {
        return new SynchronousWorkerClient(new EditorWorker(null));
    }
    _createEditorWorkerHost() {
        return {
            $fhr: (method, args) => this.fhr(method, args),
        };
    }
    _getOrCreateModelManager(proxy) {
        if (!this._modelManager) {
            this._modelManager = this._register(new WorkerTextModelSyncClient(proxy, this._modelService, this._keepIdleModels));
        }
        return this._modelManager;
    }
    async workerWithSyncedResources(resources, forceLargeModels = false) {
        if (this._disposed) {
            return Promise.reject(canceled());
        }
        const proxy = await this._getProxy();
        this._getOrCreateModelManager(proxy).ensureSyncedResources(resources, forceLargeModels);
        return proxy;
    }
    async textualSuggest(resources, leadingWord, wordDefRegExp) {
        const proxy = await this.workerWithSyncedResources(resources);
        const wordDef = wordDefRegExp.source;
        const wordDefFlags = wordDefRegExp.flags;
        return proxy.$textualSuggest(resources.map((r) => r.toString()), leadingWord, wordDef, wordDefFlags);
    }
    dispose() {
        super.dispose();
        this._disposed = true;
    }
};
EditorWorkerClient = __decorate([
    __param(2, IModelService)
], EditorWorkerClient);
export { EditorWorkerClient };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV29ya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3NlcnZpY2VzL2VkaXRvcldvcmtlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRSxPQUFPLEVBQ04sdUJBQXVCLEdBR3ZCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGVBQWUsRUFBd0IsTUFBTSwyQ0FBMkMsQ0FBQTtBQUVqRyxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFHMUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBT3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFNUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFNcEYsT0FBTyxFQUE2QixTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM3RixPQUFPLEVBQ04s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