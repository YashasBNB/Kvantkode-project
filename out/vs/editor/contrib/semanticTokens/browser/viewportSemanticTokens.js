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
var ViewportSemanticTokensContribution_1;
import { createCancelablePromise, RunOnceScheduler, } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { getDocumentRangeSemanticTokens, hasDocumentRangeSemanticTokensProvider, } from '../common/getSemanticTokens.js';
import { isSemanticColoringEnabled, SEMANTIC_HIGHLIGHTING_SETTING_ID, } from '../common/semanticTokensConfig.js';
import { toMultilineTokens2 } from '../../../common/services/semanticTokensProviderStyling.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ILanguageFeatureDebounceService, } from '../../../common/services/languageFeatureDebounce.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ISemanticTokensStylingService } from '../../../common/services/semanticTokensStyling.js';
let ViewportSemanticTokensContribution = class ViewportSemanticTokensContribution extends Disposable {
    static { ViewportSemanticTokensContribution_1 = this; }
    static { this.ID = 'editor.contrib.viewportSemanticTokens'; }
    static get(editor) {
        return editor.getContribution(ViewportSemanticTokensContribution_1.ID);
    }
    constructor(editor, _semanticTokensStylingService, _themeService, _configurationService, languageFeatureDebounceService, languageFeaturesService) {
        super();
        this._semanticTokensStylingService = _semanticTokensStylingService;
        this._themeService = _themeService;
        this._configurationService = _configurationService;
        this._editor = editor;
        this._provider = languageFeaturesService.documentRangeSemanticTokensProvider;
        this._debounceInformation = languageFeatureDebounceService.for(this._provider, 'DocumentRangeSemanticTokens', { min: 100, max: 500 });
        this._tokenizeViewport = this._register(new RunOnceScheduler(() => this._tokenizeViewportNow(), 100));
        this._outstandingRequests = [];
        const scheduleTokenizeViewport = () => {
            if (this._editor.hasModel()) {
                this._tokenizeViewport.schedule(this._debounceInformation.get(this._editor.getModel()));
            }
        };
        this._register(this._editor.onDidScrollChange(() => {
            scheduleTokenizeViewport();
        }));
        this._register(this._editor.onDidChangeModel(() => {
            this._cancelAll();
            scheduleTokenizeViewport();
        }));
        this._register(this._editor.onDidChangeModelContent((e) => {
            this._cancelAll();
            scheduleTokenizeViewport();
        }));
        this._register(this._provider.onDidChange(() => {
            this._cancelAll();
            scheduleTokenizeViewport();
        }));
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(SEMANTIC_HIGHLIGHTING_SETTING_ID)) {
                this._cancelAll();
                scheduleTokenizeViewport();
            }
        }));
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._cancelAll();
            scheduleTokenizeViewport();
        }));
        scheduleTokenizeViewport();
    }
    _cancelAll() {
        for (const request of this._outstandingRequests) {
            request.cancel();
        }
        this._outstandingRequests = [];
    }
    _removeOutstandingRequest(req) {
        for (let i = 0, len = this._outstandingRequests.length; i < len; i++) {
            if (this._outstandingRequests[i] === req) {
                this._outstandingRequests.splice(i, 1);
                return;
            }
        }
    }
    _tokenizeViewportNow() {
        if (!this._editor.hasModel()) {
            return;
        }
        const model = this._editor.getModel();
        if (model.tokenization.hasCompleteSemanticTokens()) {
            return;
        }
        if (!isSemanticColoringEnabled(model, this._themeService, this._configurationService)) {
            if (model.tokenization.hasSomeSemanticTokens()) {
                model.tokenization.setSemanticTokens(null, false);
            }
            return;
        }
        if (!hasDocumentRangeSemanticTokensProvider(this._provider, model)) {
            if (model.tokenization.hasSomeSemanticTokens()) {
                model.tokenization.setSemanticTokens(null, false);
            }
            return;
        }
        const visibleRanges = this._editor.getVisibleRangesPlusViewportAboveBelow();
        this._outstandingRequests = this._outstandingRequests.concat(visibleRanges.map((range) => this._requestRange(model, range)));
    }
    _requestRange(model, range) {
        const requestVersionId = model.getVersionId();
        const request = createCancelablePromise((token) => Promise.resolve(getDocumentRangeSemanticTokens(this._provider, model, range, token)));
        const sw = new StopWatch(false);
        request
            .then((r) => {
            this._debounceInformation.update(model, sw.elapsed());
            if (!r || !r.tokens || model.isDisposed() || model.getVersionId() !== requestVersionId) {
                return;
            }
            const { provider, tokens: result } = r;
            const styling = this._semanticTokensStylingService.getStyling(provider);
            model.tokenization.setPartialSemanticTokens(range, toMultilineTokens2(result, styling, model.getLanguageId()));
        })
            .then(() => this._removeOutstandingRequest(request), () => this._removeOutstandingRequest(request));
        return request;
    }
};
ViewportSemanticTokensContribution = ViewportSemanticTokensContribution_1 = __decorate([
    __param(1, ISemanticTokensStylingService),
    __param(2, IThemeService),
    __param(3, IConfigurationService),
    __param(4, ILanguageFeatureDebounceService),
    __param(5, ILanguageFeaturesService)
], ViewportSemanticTokensContribution);
export { ViewportSemanticTokensContribution };
registerEditorContribution(ViewportSemanticTokensContribution.ID, ViewportSemanticTokensContribution, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3BvcnRTZW1hbnRpY1Rva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NlbWFudGljVG9rZW5zL2Jyb3dzZXIvdmlld3BvcnRTZW1hbnRpY1Rva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixnQkFBZ0IsR0FDaEIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBSTdDLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsc0NBQXNDLEdBQ3RDLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixnQ0FBZ0MsR0FDaEMsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUVOLCtCQUErQixHQUMvQixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRixJQUFNLGtDQUFrQyxHQUF4QyxNQUFNLGtDQUFtQyxTQUFRLFVBQVU7O2FBQzFDLE9BQUUsR0FBRyx1Q0FBdUMsQUFBMUMsQ0FBMEM7SUFF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