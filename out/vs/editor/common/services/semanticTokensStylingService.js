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
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILanguageService } from '../languages/language.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { SemanticTokensProviderStyling } from './semanticTokensProviderStyling.js';
import { ISemanticTokensStylingService } from './semanticTokensStyling.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
let SemanticTokensStylingService = class SemanticTokensStylingService extends Disposable {
    constructor(_themeService, _logService, _languageService) {
        super();
        this._themeService = _themeService;
        this._logService = _logService;
        this._languageService = _languageService;
        this._caches = new WeakMap();
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._caches = new WeakMap();
        }));
    }
    getStyling(provider) {
        if (!this._caches.has(provider)) {
            this._caches.set(provider, new SemanticTokensProviderStyling(provider.getLegend(), this._themeService, this._languageService, this._logService));
        }
        return this._caches.get(provider);
    }
};
SemanticTokensStylingService = __decorate([
    __param(0, IThemeService),
    __param(1, ILogService),
    __param(2, ILanguageService)
], SemanticTokensStylingService);
export { SemanticTokensStylingService };
registerSingleton(ISemanticTokensStylingService, SemanticTokensStylingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNTdHlsaW5nU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvc2VtYW50aWNUb2tlbnNTdHlsaW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMxRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFFdEQsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFDWixTQUFRLFVBQVU7SUFPbEIsWUFDaUMsYUFBNEIsRUFDOUIsV0FBd0IsRUFDbkIsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFBO1FBSnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQzlCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ25CLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFHckUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLE9BQU8sRUFBeUQsQ0FBQTtRQUNuRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFO1lBQzdDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQXlELENBQUE7UUFDcEYsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxVQUFVLENBQUMsUUFBZ0M7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQ2YsUUFBUSxFQUNSLElBQUksNkJBQTZCLENBQ2hDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsRUFDcEIsSUFBSSxDQUFDLGFBQWEsRUFDbEIsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMsV0FBVyxDQUNoQixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUUsQ0FBQTtJQUNuQyxDQUFDO0NBQ0QsQ0FBQTtBQXBDWSw0QkFBNEI7SUFTdEMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsZ0JBQWdCLENBQUE7R0FYTiw0QkFBNEIsQ0FvQ3hDOztBQUVELGlCQUFpQixDQUNoQiw2QkFBNkIsRUFDN0IsNEJBQTRCLG9DQUU1QixDQUFBIn0=