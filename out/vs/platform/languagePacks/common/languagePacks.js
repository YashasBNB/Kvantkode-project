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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xhbmd1YWdlUGFja3MvY29tbW9uL2xhbmd1YWdlUGFja3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUczRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLHdCQUF3QixHQUV4QixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxNQUFNLFVBQVUsU0FBUyxDQUFDLFNBQTRCO0lBQ3JELE9BQU8sU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDeEUsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIscUJBQXFCLENBQUMsQ0FBQTtBQWN6RixJQUFlLHVCQUF1QixHQUF0QyxNQUFlLHVCQUF3QixTQUFRLFVBQVU7SUFHL0QsWUFDOEMsdUJBQWlEO1FBRTlGLEtBQUssRUFBRSxDQUFBO1FBRnNDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7SUFHL0YsQ0FBQztJQVNELEtBQUssQ0FBQyxxQkFBcUI7UUFDMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSx1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