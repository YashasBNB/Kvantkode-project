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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbGFuZ3VhZ2VQYWNrcy9icm93c2VyL2xhbmd1YWdlUGFja3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ2pILE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFOUMsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx1QkFBdUI7SUFDbkUsWUFFa0IsOEJBQStELEVBQ3RELHVCQUFpRCxFQUM3QyxVQUF1QjtRQUVyRCxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUpiLG1DQUE4QixHQUE5Qiw4QkFBOEIsQ0FBaUM7UUFFbEQsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUd0RCxDQUFDO0lBRUQsS0FBSyxDQUFDLGtDQUFrQyxDQUFDLEVBQVUsRUFBRSxRQUFnQjtRQUNwRSxNQUFNLFlBQVksR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDbEQsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUU3Qyw2SEFBNkg7UUFDN0gsSUFBSSxNQUFNLENBQUE7UUFDVixJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsTUFB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