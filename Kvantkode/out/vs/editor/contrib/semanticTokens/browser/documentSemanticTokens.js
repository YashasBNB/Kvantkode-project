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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRTZW1hbnRpY1Rva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc2VtYW50aWNUb2tlbnMvYnJvd3Nlci9kb2N1bWVudFNlbWFudGljVG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEtBQUssTUFBTSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFRekUsT0FBTyxFQUVOLCtCQUErQixHQUMvQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakcsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixpQ0FB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