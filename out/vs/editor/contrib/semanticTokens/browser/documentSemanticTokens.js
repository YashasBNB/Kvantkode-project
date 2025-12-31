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
var ModelSemanticColoring_1;
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as errors from '../../../../base/common/errors.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IModelService } from '../../../common/services/model.js';
import { toMultilineTokens2, } from '../../../common/services/semanticTokensProviderStyling.js';
import { ISemanticTokensStylingService } from '../../../common/services/semanticTokensStyling.js';
import { getDocumentSemanticTokens, hasDocumentSemanticTokensProvider, isSemanticTokens, isSemanticTokensEdits, } from '../common/getSemanticTokens.js';
import { SEMANTIC_HIGHLIGHTING_SETTING_ID, isSemanticColoringEnabled, } from '../common/semanticTokensConfig.js';
let DocumentSemanticTokensFeature = class DocumentSemanticTokensFeature extends Disposable {
    constructor(semanticTokensStylingService, modelService, themeService, configurationService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this._watchers = new ResourceMap();
        const register = (model) => {
            this._watchers.get(model.uri)?.dispose();
            this._watchers.set(model.uri, new ModelSemanticColoring(model, semanticTokensStylingService, themeService, languageFeatureDebounceService, languageFeaturesService));
        };
        const deregister = (model, modelSemanticColoring) => {
            modelSemanticColoring.dispose();
            this._watchers.delete(model.uri);
        };
        const handleSettingOrThemeChange = () => {
            for (const model of modelService.getModels()) {
                const curr = this._watchers.get(model.uri);
                if (isSemanticColoringEnabled(model, themeService, configurationService)) {
                    if (!curr) {
                        register(model);
                    }
                }
                else {
                    if (curr) {
                        deregister(model, curr);
                    }
                }
            }
        };
        modelService.getModels().forEach((model) => {
            if (isSemanticColoringEnabled(model, themeService, configurationService)) {
                register(model);
            }
        });
        this._register(modelService.onModelAdded((model) => {
            if (isSemanticColoringEnabled(model, themeService, configurationService)) {
                register(model);
            }
        }));
        this._register(modelService.onModelRemoved((model) => {
            const curr = this._watchers.get(model.uri);
            if (curr) {
                deregister(model, curr);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(SEMANTIC_HIGHLIGHTING_SETTING_ID)) {
                handleSettingOrThemeChange();
            }
        }));
        this._register(themeService.onDidColorThemeChange(handleSettingOrThemeChange));
    }
    dispose() {
        dispose(this._watchers.values());
        this._watchers.clear();
        super.dispose();
    }
};
DocumentSemanticTokensFeature = __decorate([
    __param(0, ISemanticTokensStylingService),
    __param(1, IModelService),
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeatureDebounceService),
    __param(5, ILanguageFeaturesService)
], DocumentSemanticTokensFeature);
export { DocumentSemanticTokensFeature };
let ModelSemanticColoring = class ModelSemanticColoring extends Disposable {
    static { ModelSemanticColoring_1 = this; }
    static { this.REQUEST_MIN_DELAY = 300; }
    static { this.REQUEST_MAX_DELAY = 2000; }
    constructor(model, _semanticTokensStylingService, themeService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this._semanticTokensStylingService = _semanticTokensStylingService;
        this._isDisposed = false;
        this._model = model;
        this._provider = languageFeaturesService.documentSemanticTokensProvider;
        this._debounceInformation = languageFeatureDebounceService.for(this._provider, 'DocumentSemanticTokens', {
            min: ModelSemanticColoring_1.REQUEST_MIN_DELAY,
            max: ModelSemanticColoring_1.REQUEST_MAX_DELAY,
        });
        this._fetchDocumentSemanticTokens = this._register(new RunOnceScheduler(() => this._fetchDocumentSemanticTokensNow(), ModelSemanticColoring_1.REQUEST_MIN_DELAY));
        this._currentDocumentResponse = null;
        this._currentDocumentRequestCancellationTokenSource = null;
        this._documentProvidersChangeListeners = [];
        this._providersChangedDuringRequest = false;
        this._register(this._model.onDidChangeContent(() => {
            if (!this._fetchDocumentSemanticTokens.isScheduled()) {
                this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
            }
        }));
        this._register(this._model.onDidChangeAttached(() => {
            if (!this._fetchDocumentSemanticTokens.isScheduled()) {
                this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
            }
        }));
        this._register(this._model.onDidChangeLanguage(() => {
            // clear any outstanding state
            if (this._currentDocumentResponse) {
                this._currentDocumentResponse.dispose();
                this._currentDocumentResponse = null;
            }
            if (this._currentDocumentRequestCancellationTokenSource) {
                this._currentDocumentRequestCancellationTokenSource.cancel();
                this._currentDocumentRequestCancellationTokenSource = null;
            }
            this._setDocumentSemanticTokens(null, null, null, []);
            this._fetchDocumentSemanticTokens.schedule(0);
        }));
        const bindDocumentChangeListeners = () => {
            dispose(this._documentProvidersChangeListeners);
            this._documentProvidersChangeListeners = [];
            for (const provider of this._provider.all(model)) {
                if (typeof provider.onDidChange === 'function') {
                    this._documentProvidersChangeListeners.push(provider.onDidChange(() => {
                        if (this._currentDocumentRequestCancellationTokenSource) {
                            // there is already a request running,
                            this._providersChangedDuringRequest = true;
                            return;
                        }
                        this._fetchDocumentSemanticTokens.schedule(0);
                    }));
                }
            }
        };
        bindDocumentChangeListeners();
        this._register(this._provider.onDidChange(() => {
            bindDocumentChangeListeners();
            this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
        }));
        this._register(themeService.onDidColorThemeChange((_) => {
            // clear out existing tokens
            this._setDocumentSemanticTokens(null, null, null, []);
            this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
        }));
        this._fetchDocumentSemanticTokens.schedule(0);
    }
    dispose() {
        if (this._currentDocumentResponse) {
            this._currentDocumentResponse.dispose();
            this._currentDocumentResponse = null;
        }
        if (this._currentDocumentRequestCancellationTokenSource) {
            this._currentDocumentRequestCancellationTokenSource.cancel();
            this._currentDocumentRequestCancellationTokenSource = null;
        }
        dispose(this._documentProvidersChangeListeners);
        this._documentProvidersChangeListeners = [];
        this._setDocumentSemanticTokens(null, null, null, []);
        this._isDisposed = true;
        super.dispose();
    }
    _fetchDocumentSemanticTokensNow() {
        if (this._currentDocumentRequestCancellationTokenSource) {
            // there is already a request running, let it finish...
            return;
        }
        if (!hasDocumentSemanticTokensProvider(this._provider, this._model)) {
            // there is no provider
            if (this._currentDocumentResponse) {
                // there are semantic tokens set
                this._model.tokenization.setSemanticTokens(null, false);
            }
            return;
        }
        if (!this._model.isAttachedToEditor()) {
            // this document is not visible, there is no need to fetch semantic tokens for it
            return;
        }
        const cancellationTokenSource = new CancellationTokenSource();
        const lastProvider = this._currentDocumentResponse
            ? this._currentDocumentResponse.provider
            : null;
        const lastResultId = this._currentDocumentResponse
            ? this._currentDocumentResponse.resultId || null
            : null;
        const request = getDocumentSemanticTokens(this._provider, this._model, lastProvider, lastResultId, cancellationTokenSource.token);
        this._currentDocumentRequestCancellationTokenSource = cancellationTokenSource;
        this._providersChangedDuringRequest = false;
        const pendingChanges = [];
        const contentChangeListener = this._model.onDidChangeContent((e) => {
            pendingChanges.push(e);
        });
        const sw = new StopWatch(false);
        request.then((res) => {
            this._debounceInformation.update(this._model, sw.elapsed());
            this._currentDocumentRequestCancellationTokenSource = null;
            contentChangeListener.dispose();
            if (!res) {
                this._setDocumentSemanticTokens(null, null, null, pendingChanges);
            }
            else {
                const { provider, tokens } = res;
                const styling = this._semanticTokensStylingService.getStyling(provider);
                this._setDocumentSemanticTokens(provider, tokens || null, styling, pendingChanges);
            }
        }, (err) => {
            const isExpectedError = err &&
                (errors.isCancellationError(err) ||
                    (typeof err.message === 'string' && err.message.indexOf('busy') !== -1));
            if (!isExpectedError) {
                errors.onUnexpectedError(err);
            }
            // Semantic tokens eats up all errors and considers errors to mean that the result is temporarily not available
            // The API does not have a special error kind to express this...
            this._currentDocumentRequestCancellationTokenSource = null;
            contentChangeListener.dispose();
            if (pendingChanges.length > 0 || this._providersChangedDuringRequest) {
                // More changes occurred while the request was running
                if (!this._fetchDocumentSemanticTokens.isScheduled()) {
                    this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
                }
            }
        });
    }
    static _copy(src, srcOffset, dest, destOffset, length) {
        // protect against overflows
        length = Math.min(length, dest.length - destOffset, src.length - srcOffset);
        for (let i = 0; i < length; i++) {
            dest[destOffset + i] = src[srcOffset + i];
        }
    }
    _setDocumentSemanticTokens(provider, tokens, styling, pendingChanges) {
        const currentResponse = this._currentDocumentResponse;
        const rescheduleIfNeeded = () => {
            if ((pendingChanges.length > 0 || this._providersChangedDuringRequest) &&
                !this._fetchDocumentSemanticTokens.isScheduled()) {
                this._fetchDocumentSemanticTokens.schedule(this._debounceInformation.get(this._model));
            }
        };
        if (this._currentDocumentResponse) {
            this._currentDocumentResponse.dispose();
            this._currentDocumentResponse = null;
        }
        if (this._isDisposed) {
            // disposed!
            if (provider && tokens) {
                provider.releaseDocumentSemanticTokens(tokens.resultId);
            }
            return;
        }
        if (!provider || !styling) {
            this._model.tokenization.setSemanticTokens(null, false);
            return;
        }
        if (!tokens) {
            this._model.tokenization.setSemanticTokens(null, true);
            rescheduleIfNeeded();
            return;
        }
        if (isSemanticTokensEdits(tokens)) {
            if (!currentResponse) {
                // not possible!
                this._model.tokenization.setSemanticTokens(null, true);
                return;
            }
            if (tokens.edits.length === 0) {
                // nothing to do!
                tokens = {
                    resultId: tokens.resultId,
                    data: currentResponse.data,
                };
            }
            else {
                let deltaLength = 0;
                for (const edit of tokens.edits) {
                    deltaLength += (edit.data ? edit.data.length : 0) - edit.deleteCount;
                }
                const srcData = currentResponse.data;
                const destData = new Uint32Array(srcData.length + deltaLength);
                let srcLastStart = srcData.length;
                let destLastStart = destData.length;
                for (let i = tokens.edits.length - 1; i >= 0; i--) {
                    const edit = tokens.edits[i];
                    if (edit.start > srcData.length) {
                        styling.warnInvalidEditStart(currentResponse.resultId, tokens.resultId, i, edit.start, srcData.length);
                        // The edits are invalid and there's no way to recover
                        this._model.tokenization.setSemanticTokens(null, true);
                        return;
                    }
                    const copyCount = srcLastStart - (edit.start + edit.deleteCount);
                    if (copyCount > 0) {
                        ModelSemanticColoring_1._copy(srcData, srcLastStart - copyCount, destData, destLastStart - copyCount, copyCount);
                        destLastStart -= copyCount;
                    }
                    if (edit.data) {
                        ModelSemanticColoring_1._copy(edit.data, 0, destData, destLastStart - edit.data.length, edit.data.length);
                        destLastStart -= edit.data.length;
                    }
                    srcLastStart = edit.start;
                }
                if (srcLastStart > 0) {
                    ModelSemanticColoring_1._copy(srcData, 0, destData, 0, srcLastStart);
                }
                tokens = {
                    resultId: tokens.resultId,
                    data: destData,
                };
            }
        }
        if (isSemanticTokens(tokens)) {
            this._currentDocumentResponse = new SemanticTokensResponse(provider, tokens.resultId, tokens.data);
            const result = toMultilineTokens2(tokens, styling, this._model.getLanguageId());
            // Adjust incoming semantic tokens
            if (pendingChanges.length > 0) {
                // More changes occurred while the request was running
                // We need to:
                // 1. Adjust incoming semantic tokens
                // 2. Request them again
                for (const change of pendingChanges) {
                    for (const area of result) {
                        for (const singleChange of change.changes) {
                            area.applyEdit(singleChange.range, singleChange.text);
                        }
                    }
                }
            }
            this._model.tokenization.setSemanticTokens(result, true);
        }
        else {
            this._model.tokenization.setSemanticTokens(null, true);
        }
        rescheduleIfNeeded();
    }
};
ModelSemanticColoring = ModelSemanticColoring_1 = __decorate([
    __param(1, ISemanticTokensStylingService),
    __param(2, IThemeService),
    __param(3, ILanguageFeatureDebounceService),
    __param(4, ILanguageFeaturesService)
], ModelSemanticColoring);
class SemanticTokensResponse {
    constructor(provider, resultId, data) {
        this.provider = provider;
        this.resultId = resultId;
        this.data = data;
    }
    dispose() {
        this.provider.releaseDocumentSemanticTokens(this.resultId);
    }
}
registerEditorFeature(DocumentSemanticTokensFeature);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NlbWFudGljVG9rZW5zL2Jyb3dzZXIvZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUXpFLE9BQU8sRUFFTiwrQkFBK0IsR0FDL0IsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpHLE9BQU8sRUFDTix5QkFBeUIsRUFDekIsaUNBQWlDLEVB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