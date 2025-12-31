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
import { localize } from '../../../../nls.js';
import { Language, LANGUAGE_DEFAULT } from '../../../../base/common/platform.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IActiveLanguagePackService, ILocaleService } from '../common/locale.js';
import { IHostService } from '../../host/browser/host.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ILogService } from '../../../../platform/log/common/log.js';
const localeStorage = new (class LocaleStorage {
    static { this.LOCAL_STORAGE_LOCALE_KEY = 'vscode.nls.locale'; }
    static { this.LOCAL_STORAGE_EXTENSION_ID_KEY = 'vscode.nls.languagePackExtensionId'; }
    setLocale(locale) {
        localStorage.setItem(LocaleStorage.LOCAL_STORAGE_LOCALE_KEY, locale);
        this.doSetLocaleToCookie(locale);
    }
    doSetLocaleToCookie(locale) {
        document.cookie = `${LocaleStorage.LOCAL_STORAGE_LOCALE_KEY}=${locale};path=/;max-age=3153600000`;
    }
    clearLocale() {
        localStorage.removeItem(LocaleStorage.LOCAL_STORAGE_LOCALE_KEY);
        this.doClearLocaleToCookie();
    }
    doClearLocaleToCookie() {
        document.cookie = `${LocaleStorage.LOCAL_STORAGE_LOCALE_KEY}=;path=/;max-age=0`;
    }
    setExtensionId(extensionId) {
        localStorage.setItem(LocaleStorage.LOCAL_STORAGE_EXTENSION_ID_KEY, extensionId);
    }
    getExtensionId() {
        return localStorage.getItem(LocaleStorage.LOCAL_STORAGE_EXTENSION_ID_KEY);
    }
    clearExtensionId() {
        localStorage.removeItem(LocaleStorage.LOCAL_STORAGE_EXTENSION_ID_KEY);
    }
})();
let WebLocaleService = class WebLocaleService {
    constructor(dialogService, hostService, productService) {
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.productService = productService;
    }
    async setLocale(languagePackItem, _skipDialog = false) {
        const locale = languagePackItem.id;
        if (locale === Language.value() ||
            (!locale && Language.value() === navigator.language.toLowerCase())) {
            return;
        }
        if (locale) {
            localeStorage.setLocale(locale);
            if (languagePackItem.extensionId) {
                localeStorage.setExtensionId(languagePackItem.extensionId);
            }
        }
        else {
            localeStorage.clearLocale();
            localeStorage.clearExtensionId();
        }
        const restartDialog = await this.dialogService.confirm({
            type: 'info',
            message: localize('relaunchDisplayLanguageMessage', 'To change the display language, {0} needs to reload', this.productService.nameLong),
            detail: localize('relaunchDisplayLanguageDetail', 'Press the reload button to refresh the page and set the display language to {0}.', languagePackItem.label),
            primaryButton: localize({ key: 'reload', comment: ['&& denotes a mnemonic character'] }, '&&Reload'),
        });
        if (restartDialog.confirmed) {
            this.hostService.restart();
        }
    }
    async clearLocalePreference() {
        localeStorage.clearLocale();
        localeStorage.clearExtensionId();
        if (Language.value() === navigator.language.toLowerCase()) {
            return;
        }
        const restartDialog = await this.dialogService.confirm({
            type: 'info',
            message: localize('clearDisplayLanguageMessage', 'To change the display language, {0} needs to reload', this.productService.nameLong),
            detail: localize('clearDisplayLanguageDetail', "Press the reload button to refresh the page and use your browser's language."),
            primaryButton: localize({ key: 'reload', comment: ['&& denotes a mnemonic character'] }, '&&Reload'),
        });
        if (restartDialog.confirmed) {
            this.hostService.restart();
        }
    }
};
WebLocaleService = __decorate([
    __param(0, IDialogService),
    __param(1, IHostService),
    __param(2, IProductService)
], WebLocaleService);
export { WebLocaleService };
let WebActiveLanguagePackService = class WebActiveLanguagePackService {
    constructor(galleryService, logService) {
        this.galleryService = galleryService;
        this.logService = logService;
    }
    async getExtensionIdProvidingCurrentLocale() {
        const language = Language.value();
        if (language === LANGUAGE_DEFAULT) {
            return undefined;
        }
        const extensionId = localeStorage.getExtensionId();
        if (extensionId) {
            return extensionId;
        }
        if (!this.galleryService.isEnabled()) {
            return undefined;
        }
        try {
            const tagResult = await this.galleryService.query({ text: `tag:lp-${language}` }, CancellationToken.None);
            // Only install extensions that are published by Microsoft and start with vscode-language-pack for extra certainty
            const extensionToInstall = tagResult.firstPage.find((e) => e.publisher === 'MS-CEINTL' && e.name.startsWith('vscode-language-pack'));
            if (extensionToInstall) {
                localeStorage.setExtensionId(extensionToInstall.identifier.id);
                return extensionToInstall.identifier.id;
            }
            // TODO: If a non-Microsoft language pack is installed, we should prompt the user asking if they want to install that.
            // Since no such language packs exist yet, we can wait until that happens to implement this.
        }
        catch (e) {
            // Best effort
            this.logService.error(e);
        }
        return undefined;
    }
};
WebActiveLanguagePackService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ILogService)
], WebActiveLanguagePackService);
registerSingleton(ILocaleService, WebLocaleService, 1 /* InstantiationType.Delayed */);
registerSingleton(IActiveLanguagePackService, WebActiveLanguagePackService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sb2NhbGl6YXRpb24vYnJvd3Nlci9sb2NhbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFcEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLE1BQU0sYUFBYTthQUNyQiw2QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQTthQUM5QyxtQ0FBOEIsR0FBRyxvQ0FBb0MsQ0FBQTtJQUU3RixTQUFTLENBQUMsTUFBYztRQUN2QixZQUFZLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxD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