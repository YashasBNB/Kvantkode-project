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
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { MainContext, ExtHostContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { Range } from '../../../editor/common/core/range.js';
import { ITextModelService } from '../../../editor/common/services/resolverService.js';
import { ILanguageStatusService, } from '../../services/languageStatus/common/languageStatusService.js';
import { DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
let MainThreadLanguages = class MainThreadLanguages {
    constructor(_extHostContext, _languageService, _modelService, _resolverService, _languageStatusService) {
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._resolverService = _resolverService;
        this._languageStatusService = _languageStatusService;
        this._disposables = new DisposableStore();
        this._status = new DisposableMap();
        this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostLanguages);
        this._proxy.$acceptLanguageIds(_languageService.getRegisteredLanguageIds());
        this._disposables.add(_languageService.onDidChange((_) => {
            this._proxy.$acceptLanguageIds(_languageService.getRegisteredLanguageIds());
        }));
    }
    dispose() {
        this._disposables.dispose();
        this._status.dispose();
    }
    async $changeLanguage(resource, languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return Promise.reject(new Error(`Unknown language id: ${languageId}`));
        }
        const uri = URI.revive(resource);
        const ref = await this._resolverService.createModelReference(uri);
        try {
            ref.object.textEditorModel.setLanguage(this._languageService.createById(languageId));
        }
        finally {
            ref.dispose();
        }
    }
    async $tokensAtPosition(resource, position) {
        const uri = URI.revive(resource);
        const model = this._modelService.getModel(uri);
        if (!model) {
            return undefined;
        }
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const tokens = model.tokenization.getLineTokens(position.lineNumber);
        const idx = tokens.findTokenIndexAtOffset(position.column - 1);
        return {
            type: tokens.getStandardTokenType(idx),
            range: new Range(position.lineNumber, 1 + tokens.getStartOffset(idx), position.lineNumber, 1 + tokens.getEndOffset(idx)),
        };
    }
    // --- language status
    $setLanguageStatus(handle, status) {
        this._status.get(handle)?.dispose();
        this._status.set(handle, this._languageStatusService.addStatus(status));
    }
    $removeLanguageStatus(handle) {
        this._status.get(handle)?.dispose();
    }
};
MainThreadLanguages = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguages),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITextModelService),
    __param(4, ILanguageStatusService)
], MainThreadLanguages);
export { MainThreadLanguages };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTGFuZ3VhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixXQUFXLEVBQ1gsY0FBYyxHQUVkLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUczRSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQU0vQixZQUNDLGVBQWdDLEVBQ2QsZ0JBQW1ELEVBQ3RELGFBQTZDLEVBQ3pDLGdCQUEyQyxFQUN0QyxzQkFBK0Q7UUFIcEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUNyQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUNqQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3JCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7UUFWdkUsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBR3BD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