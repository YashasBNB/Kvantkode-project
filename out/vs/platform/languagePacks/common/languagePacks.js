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
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { language } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { IExtensionGalleryService, } from '../../extensionManagement/common/extensionManagement.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export function getLocale(extension) {
    return extension.tags.find((t) => t.startsWith('lp-'))?.split('lp-')[1];
}
export const ILanguagePackService = createDecorator('languagePackService');
let LanguagePackBaseService = class LanguagePackBaseService extends Disposable {
    constructor(extensionGalleryService) {
        super();
        this.extensionGalleryService = extensionGalleryService;
    }
    async getAvailableLanguages() {
        const timeout = new CancellationTokenSource();
        setTimeout(() => timeout.cancel(), 1000);
        let result;
        try {
            result = await this.extensionGalleryService.query({
                text: 'category:"language packs"',
                pageSize: 20,
            }, timeout.token);
        }
        catch (_) {
            // This method is best effort. So, we ignore any errors.
            return [];
        }
        const languagePackExtensions = result.firstPage.filter((e) => e.properties.localizedLanguages?.length && e.tags.some((t) => t.startsWith('lp-')));
        const allFromMarketplace = languagePackExtensions.map((lp) => {
            const languageName = lp.properties.localizedLanguages?.[0];
            const locale = getLocale(lp);
            const baseQuickPick = this.createQuickPickItem(locale, languageName, lp);
            return {
                ...baseQuickPick,
                extensionId: lp.identifier.id,
                galleryExtension: lp,
            };
        });
        allFromMarketplace.push(this.createQuickPickItem('en', 'English'));
        return allFromMarketplace;
    }
    createQuickPickItem(locale, languageName, languagePack) {
        const label = languageName ?? locale;
        let description;
        if (label !== locale) {
            description = `(${locale})`;
        }
        if (locale.toLowerCase() === language.toLowerCase()) {
            description ??= '';
            description += localize('currentDisplayLanguage', ' (Current)');
        }
        if (languagePack?.installCount) {
            description ??= '';
            const count = languagePack.installCount;
            let countLabel;
            if (count > 1000000) {
                countLabel = `${Math.floor(count / 100000) / 10}M`;
            }
            else if (count > 1000) {
                countLabel = `${Math.floor(count / 1000)}K`;
            }
            else {
                countLabel = String(count);
            }
            description += ` $(cloud-download) ${countLabel}`;
        }
        return {
            id: locale,
            label,
            description,
        };
    }
};
LanguagePackBaseService = __decorate([
    __param(0, IExtensionGalleryService)
], LanguagePackBaseService);
export { LanguagePackBaseService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGFuZ3VhZ2VQYWNrcy9jb21tb24vbGFuZ3VhZ2VQYWNrcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sVUFBVSxTQUFTLENBQUMsU0FBNEI7SUFDckQsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUN4RSxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUF1QixxQkFBcUIsQ0FBQyxDQUFBO0FBY3pGLElBQWUsdUJBQXVCLEdBQXRDLE1BQWUsdUJBQXdCLFNBQVEsVUFBVTtJQUcvRCxZQUM4Qyx1QkFBaUQ7UUFFOUYsS0FBSyxFQUFFLENBQUE7UUFGc0MsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUEwQjtJQUcvRixDQUFDO0lBU0QsS0FBSyxDQUFDLHFCQUFxQjtRQUMxQixNQUFNLE9BQU8sR0FBRyxJ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