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
var LanguageDetectionService_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageDetectionService, LanguageDetectionStatsId, } from '../common/languageDetectionWorkerService.js';
import { FileAccess, nodeModulesAsarPath, nodeModulesPath, Schemas, } from '../../../../base/common/network.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { URI } from '../../../../base/common/uri.js';
import { isWeb } from '../../../../base/common/platform.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IDiagnosticsService } from '../../../../platform/diagnostics/common/diagnostics.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { LRUCache } from '../../../../base/common/map.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { canASAR } from '../../../../amdX.js';
import { createWebWorker } from '../../../../base/browser/webWorkerFactory.js';
import { WorkerTextModelSyncClient } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
import { LanguageDetectionWorkerHost, } from './languageDetectionWorker.protocol.js';
const TOP_LANG_COUNTS = 12;
const regexpModuleLocation = `${nodeModulesPath}/vscode-regexp-languagedetection`;
const regexpModuleLocationAsar = `${nodeModulesAsarPath}/vscode-regexp-languagedetection`;
const moduleLocation = `${nodeModulesPath}/@vscode/vscode-languagedetection`;
const moduleLocationAsar = `${nodeModulesAsarPath}/@vscode/vscode-languagedetection`;
let LanguageDetectionService = class LanguageDetectionService extends Disposable {
    static { LanguageDetectionService_1 = this; }
    static { this.enablementSettingKey = 'workbench.editor.languageDetection'; }
    static { this.historyBasedEnablementConfig = 'workbench.editor.historyBasedLanguageDetection'; }
    static { this.preferHistoryConfig = 'workbench.editor.preferHistoryBasedLanguageDetection'; }
    static { this.workspaceOpenedLanguagesStorageKey = 'workbench.editor.languageDetectionOpenedLanguages.workspace'; }
    static { this.globalOpenedLanguagesStorageKey = 'workbench.editor.languageDetectionOpenedLanguages.global'; }
    constructor(_environmentService, languageService, _configurationService, _diagnosticsService, _workspaceContextService, modelService, _editorService, telemetryService, storageService, _logService) {
        super();
        this._environmentService = _environmentService;
        this._configurationService = _configurationService;
        this._diagnosticsService = _diagnosticsService;
        this._workspaceContextService = _workspaceContextService;
        this._editorService = _editorService;
        this._logService = _logService;
        this.hasResolvedWorkspaceLanguageIds = false;
        this.workspaceLanguageIds = new Set();
        this.sessionOpenedLanguageIds = new Set();
        this.historicalGlobalOpenedLanguageIds = new LRUCache(TOP_LANG_COUNTS);
        this.historicalWorkspaceOpenedLanguageIds = new LRUCache(TOP_LANG_COUNTS);
        this.dirtyBiases = true;
        this.langBiases = {};
        const useAsar = canASAR && this._environmentService.isBuilt && !isWeb;
        this._languageDetectionWorkerClient = this._register(new LanguageDetectionWorkerClient(modelService, languageService, telemetryService, 
        // TODO See if it's possible to bundle vscode-languagedetection
        useAsar
            ? FileAccess.asBrowserUri(`${moduleLocationAsar}/dist/lib/index.js`).toString(true)
            : FileAccess.asBrowserUri(`${moduleLocation}/dist/lib/index.js`).toString(true), useAsar
            ? FileAccess.asBrowserUri(`${moduleLocationAsar}/model/model.json`).toString(true)
            : FileAccess.asBrowserUri(`${moduleLocation}/model/model.json`).toString(true), useAsar
            ? FileAccess.asBrowserUri(`${moduleLocationAsar}/model/group1-shard1of1.bin`).toString(true)
            : FileAccess.asBrowserUri(`${moduleLocation}/model/group1-shard1of1.bin`).toString(true), useAsar
            ? FileAccess.asBrowserUri(`${regexpModuleLocationAsar}/dist/index.js`).toString(true)
            : FileAccess.asBrowserUri(`${regexpModuleLocation}/dist/index.js`).toString(true)));
        this.initEditorOpenedListeners(storageService);
    }
    async resolveWorkspaceLanguageIds() {
        if (this.hasResolvedWorkspaceLanguageIds) {
            return;
        }
        this.hasResolvedWorkspaceLanguageIds = true;
        const fileExtensions = await this._diagnosticsService.getWorkspaceFileExtensions(this._workspaceContextService.getWorkspace());
        let count = 0;
        for (const ext of fileExtensions.extensions) {
            const langId = this._languageDetectionWorkerClient.getLanguageId(ext);
            if (langId && count < TOP_LANG_COUNTS) {
                this.workspaceLanguageIds.add(langId);
                count++;
                if (count > TOP_LANG_COUNTS) {
                    break;
                }
            }
        }
        this.dirtyBiases = true;
    }
    isEnabledForLanguage(languageId) {
        return (!!languageId &&
            this._configurationService.getValue(LanguageDetectionService_1.enablementSettingKey, {
                overrideIdentifier: languageId,
            }));
    }
    getLanguageBiases() {
        if (!this.dirtyBiases) {
            return this.langBiases;
        }
        const biases = {};
        // Give different weight to the biases depending on relevance of source
        this.sessionOpenedLanguageIds.forEach((lang) => (biases[lang] = (biases[lang] ?? 0) + 7));
        this.workspaceLanguageIds.forEach((lang) => (biases[lang] = (biases[lang] ?? 0) + 5));
        [...this.historicalWorkspaceOpenedLanguageIds.keys()].forEach((lang) => (biases[lang] = (biases[lang] ?? 0) + 3));
        [...this.historicalGlobalOpenedLanguageIds.keys()].forEach((lang) => (biases[lang] = (biases[lang] ?? 0) + 1));
        this._logService.trace('Session Languages:', JSON.stringify([...this.sessionOpenedLanguageIds]));
        this._logService.trace('Workspace Languages:', JSON.stringify([...this.workspaceLanguageIds]));
        this._logService.trace('Historical Workspace Opened Languages:', JSON.stringify([...this.historicalWorkspaceOpenedLanguageIds.keys()]));
        this._logService.trace('Historical Globally Opened Languages:', JSON.stringify([...this.historicalGlobalOpenedLanguageIds.keys()]));
        this._logService.trace('Computed Language Detection Biases:', JSON.stringify(biases));
        this.dirtyBiases = false;
        this.langBiases = biases;
        return biases;
    }
    async detectLanguage(resource, supportedLangs) {
        const useHistory = this._configurationService.getValue(LanguageDetectionService_1.historyBasedEnablementConfig);
        const preferHistory = this._configurationService.getValue(LanguageDetectionService_1.preferHistoryConfig);
        if (useHistory) {
            await this.resolveWorkspaceLanguageIds();
        }
        const biases = useHistory ? this.getLanguageBiases() : undefined;
        return this._languageDetectionWorkerClient.detectLanguage(resource, biases, preferHistory, supportedLangs);
    }
    // TODO: explore using the history service or something similar to provide this list of opened editors
    // so this service can support delayed instantiation. This may be tricky since it seems the IHistoryService
    // only gives history for a workspace... where this takes advantage of history at a global level as well.
    initEditorOpenedListeners(storageService) {
        try {
            const globalLangHistoryData = JSON.parse(storageService.get(LanguageDetectionService_1.globalOpenedLanguagesStorageKey, 0 /* StorageScope.PROFILE */, '[]'));
            this.historicalGlobalOpenedLanguageIds.fromJSON(globalLangHistoryData);
        }
        catch (e) {
            console.error(e);
        }
        try {
            const workspaceLangHistoryData = JSON.parse(storageService.get(LanguageDetectionService_1.workspaceOpenedLanguagesStorageKey, 1 /* StorageScope.WORKSPACE */, '[]'));
            this.historicalWorkspaceOpenedLanguageIds.fromJSON(workspaceLangHistoryData);
        }
        catch (e) {
            console.error(e);
        }
        this._register(this._editorService.onDidActiveEditorChange(() => {
            const activeLanguage = this._editorService.activeTextEditorLanguageId;
            if (activeLanguage &&
                this._editorService.activeEditor?.resource?.scheme !== Schemas.untitled) {
                this.sessionOpenedLanguageIds.add(activeLanguage);
                this.historicalGlobalOpenedLanguageIds.set(activeLanguage, true);
                this.historicalWorkspaceOpenedLanguageIds.set(activeLanguage, true);
                storageService.store(LanguageDetectionService_1.globalOpenedLanguagesStorageKey, JSON.stringify(this.historicalGlobalOpenedLanguageIds.toJSON()), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
                storageService.store(LanguageDetectionService_1.workspaceOpenedLanguagesStorageKey, JSON.stringify(this.historicalWorkspaceOpenedLanguageIds.toJSON()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                this.dirtyBiases = true;
            }
        }));
    }
};
LanguageDetectionService = LanguageDetectionService_1 = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, ILanguageService),
    __param(2, IConfigurationService),
    __param(3, IDiagnosticsService),
    __param(4, IWorkspaceContextService),
    __param(5, IModelService),
    __param(6, IEditorService),
    __param(7, ITelemetryService),
    __param(8, IStorageService),
    __param(9, ILogService)
], LanguageDetectionService);
export { LanguageDetectionService };
export class LanguageDetectionWorkerClient extends Disposable {
    constructor(_modelService, _languageService, _telemetryService, _indexJsUri, _modelJsonUri, _weightsUri, _regexpModelUri) {
        super();
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._telemetryService = _telemetryService;
        this._indexJsUri = _indexJsUri;
        this._modelJsonUri = _modelJsonUri;
        this._weightsUri = _weightsUri;
        this._regexpModelUri = _regexpModelUri;
    }
    _getOrCreateLanguageDetectionWorker() {
        if (!this.worker) {
            const workerClient = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/services/languageDetection/browser/languageDetectionWebWorkerMain.js'), 'LanguageDetectionWorker'));
            LanguageDetectionWorkerHost.setChannel(workerClient, {
                $getIndexJsUri: async () => this.getIndexJsUri(),
                $getLanguageId: async (languageIdOrExt) => this.getLanguageId(languageIdOrExt),
                $sendTelemetryEvent: async (languages, confidences, timeSpent) => this.sendTelemetryEvent(languages, confidences, timeSpent),
                $getRegexpModelUri: async () => this.getRegexpModelUri(),
                $getModelJsonUri: async () => this.getModelJsonUri(),
                $getWeightsUri: async () => this.getWeightsUri(),
            });
            const workerTextModelSyncClient = WorkerTextModelSyncClient.create(workerClient, this._modelService);
            this.worker = { workerClient, workerTextModelSyncClient };
        }
        return this.worker;
    }
    _guessLanguageIdByUri(uri) {
        const guess = this._languageService.guessLanguageIdByFilepathOrFirstLine(uri);
        if (guess && guess !== 'unknown') {
            return guess;
        }
        return undefined;
    }
    async getIndexJsUri() {
        return this._indexJsUri;
    }
    getLanguageId(languageIdOrExt) {
        if (!languageIdOrExt) {
            return undefined;
        }
        if (this._languageService.isRegisteredLanguageId(languageIdOrExt)) {
            return languageIdOrExt;
        }
        const guessed = this._guessLanguageIdByUri(URI.file(`file.${languageIdOrExt}`));
        if (!guessed || guessed === 'unknown') {
            return undefined;
        }
        return guessed;
    }
    async getModelJsonUri() {
        return this._modelJsonUri;
    }
    async getWeightsUri() {
        return this._weightsUri;
    }
    async getRegexpModelUri() {
        return this._regexpModelUri;
    }
    async sendTelemetryEvent(languages, confidences, timeSpent) {
        this._telemetryService.publicLog2(LanguageDetectionStatsId, {
            languages: languages.join(','),
            confidences: confidences.join(','),
            timeSpent,
        });
    }
    async detectLanguage(resource, langBiases, preferHistory, supportedLangs) {
        const startTime = Date.now();
        const quickGuess = this._guessLanguageIdByUri(resource);
        if (quickGuess) {
            return quickGuess;
        }
        const { workerClient, workerTextModelSyncClient } = this._getOrCreateLanguageDetectionWorker();
        await workerTextModelSyncClient.ensureSyncedResources([resource]);
        const modelId = await workerClient.proxy.$detectLanguage(resource.toString(), langBiases, preferHistory, supportedLangs);
        const languageId = this.getLanguageId(modelId);
        const LanguageDetectionStatsId = 'automaticlanguagedetection.perf';
        this._telemetryService.publicLog2(LanguageDetectionStatsId, {
            timeSpent: Date.now() - startTime,
            detection: languageId || 'unknown',
        });
        return languageId;
    }
}
// For now we use Eager until we handle keeping track of history better.
registerSingleton(ILanguageDetectionService, LanguageDetectionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VEZXRlY3Rpb25Xb3JrZXJTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYW5ndWFnZURldGVjdGlvbi9icm93c2VyL2xhbmd1YWdlRGV0ZWN0aW9uV29ya2VyU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04seUJBQXlCLEVBR3pCLHdCQUF3QixHQUN4QixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFFTixVQUFVLEVBQ1YsbUJBQW1CLEVBQ25CLGVBQWUsRUFDZixPQUFPLEdBQ1AsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FB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