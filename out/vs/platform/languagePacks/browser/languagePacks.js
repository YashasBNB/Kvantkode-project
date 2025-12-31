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
import { URI } from '../../../base/common/uri.js';
import { IExtensionGalleryService } from '../../extensionManagement/common/extensionManagement.js';
import { IExtensionResourceLoaderService } from '../../extensionResourceLoader/common/extensionResourceLoader.js';
import { LanguagePackBaseService } from '../common/languagePacks.js';
import { ILogService } from '../../log/common/log.js';
let WebLanguagePacksService = class WebLanguagePacksService extends LanguagePackBaseService {
    constructor(extensionResourceLoaderService, extensionGalleryService, logService) {
        super(extensionGalleryService);
        this.extensionResourceLoaderService = extensionResourceLoaderService;
        this.logService = logService;
    }
    async getBuiltInExtensionTranslationsUri(id, language) {
        const queryTimeout = new CancellationTokenSource();
        setTimeout(() => queryTimeout.cancel(), 1000);
        // First get the extensions that supports the language (there should only be one but just in case let's include more results)
        let result;
        try {
            result = await this.extensionGalleryService.query({
                text: `tag:"lp-${language}"`,
                pageSize: 5,
            }, queryTimeout.token);
        }
        catch (err) {
            this.logService.error(err);
            return undefined;
        }
        const languagePackExtensions = result.firstPage.find((e) => e.properties.localizedLanguages?.length);
        if (!languagePackExtensions) {
            this.logService.trace(`No language pack found for language ${language}`);
            return undefined;
        }
        // Then get the manifest for that extension
        const manifestTimeout = new CancellationTokenSource();
        setTimeout(() => queryTimeout.cancel(), 1000);
        const manifest = await this.extensionGalleryService.getManifest(languagePackExtensions, manifestTimeout.token);
        // Find the translation from the language pack
        const localization = manifest?.contributes?.localizations?.find((l) => l.languageId === language);
        const translation = localization?.translations.find((t) => t.id === id);
        if (!translation) {
            this.logService.trace(`No translation found for id '${id}, in ${manifest?.name}`);
            return undefined;
        }
        // get the resource uri and return it
        const uri = await this.extensionResourceLoaderService.getExtensionGalleryResourceURL({
            // If translation is defined then manifest should have been defined.
            name: manifest.name,
            publisher: manifest.publisher,
            version: manifest.version,
        });
        if (!uri) {
            this.logService.trace('Gallery does not provide extension resources.');
            return undefined;
        }
        return URI.joinPath(uri, translation.path);
    }
    // Web doesn't have a concept of language packs, so we just return an empty array
    getInstalledLanguages() {
        return Promise.resolve([]);
    }
};
WebLanguagePacksService = __decorate([
    __param(0, IExtensionResourceLoaderService),
    __param(1, IExtensionGalleryService),
    __param(2, ILogService)
], WebLanguagePacksService);
export { WebLanguagePacksService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xhbmd1YWdlUGFja3MvYnJvd3Nlci9sYW5ndWFnZVBhY2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNqSCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTlDLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsdUJBQXVCO0lBQ25FLFlBRWtCLDhCQUErRCxFQUN0RCx1QkFBaUQsRUFDN0MsVUFBdUI7UUFFckQsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFKYixtQ0FBOEIsR0FBOUIsOEJBQThCLENBQWlDO1FBRWxELGVBQVUsR0FBVixVQUFVLENBQWE7SUFHdEQsQ0FBQztJQUVELEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxFQUFVLEVBQUUsUUFBZ0I7UUFDcEUsTUFBTSxZQUFZLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBQ2xELFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFN0MsNkhBQTZIO1FBQzdILElBQUksTUFBTSxDQUFBO1FBQ1YsSUFBSSxDQUFDO1lBQ0osTUFBTSxHQUFHLE1BQU0sSUFB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