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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xvY2FsaXphdGlvbi9icm93c2VyL2xvY2FsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFL0UsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ2pILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsTUFBTSxhQUFhO2FBQ3JCLDZCQUF3QixHQUFHLG1CQUFtQixDQUFBO2FBQzlDLG1DQUE4QixHQUFHLG9DQUFvQyxDQUFBO0lBRTdGLFNBQVMsQ0FBQyxNQUFjO1FBQ3ZCLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3BFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxN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