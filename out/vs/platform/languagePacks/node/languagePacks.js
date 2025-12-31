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
import * as fs from 'fs';
import { createHash } from 'crypto';
import { equals } from '../../../base/common/arrays.js';
import { Queue } from '../../../base/common/async.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { join } from '../../../base/common/path.js';
import { Promises } from '../../../base/node/pfs.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { IExtensionGalleryService, IExtensionManagementService, } from '../../extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../extensionManagement/common/extensionManagementUtil.js';
import { ILogService } from '../../log/common/log.js';
import { LanguagePackBaseService } from '../common/languagePacks.js';
import { URI } from '../../../base/common/uri.js';
let NativeLanguagePackService = class NativeLanguagePackService extends LanguagePackBaseService {
    constructor(extensionManagementService, environmentService, extensionGalleryService, logService) {
        super(extensionGalleryService);
        this.extensionManagementService = extensionManagementService;
        this.logService = logService;
        this.cache = this._register(new LanguagePacksCache(environmentService, logService));
        this.extensionManagementService.registerParticipant({
            postInstall: async (extension) => {
                return this.postInstallExtension(extension);
            },
            postUninstall: async (extension) => {
                return this.postUninstallExtension(extension);
            },
        });
    }
    async getBuiltInExtensionTranslationsUri(id, language) {
        const packs = await this.cache.getLanguagePacks();
        const pack = packs[language];
        if (!pack) {
            this.logService.warn(`No language pack found for ${language}`);
            return undefined;
        }
        const translation = pack.translations[id];
        return translation ? URI.file(translation) : undefined;
    }
    async getInstalledLanguages() {
        const languagePacks = await this.cache.getLanguagePacks();
        const languages = Object.keys(languagePacks).map((locale) => {
            const languagePack = languagePacks[locale];
            const baseQuickPick = this.createQuickPickItem(locale, languagePack.label);
            return {
                ...baseQuickPick,
                extensionId: languagePack.extensions[0].extensionIdentifier.id,
            };
        });
        languages.push(this.createQuickPickItem('en', 'English'));
        languages.sort((a, b) => a.label.localeCompare(b.label));
        return languages;
    }
    async postInstallExtension(extension) {
        if (extension &&
            extension.manifest &&
            extension.manifest.contributes &&
            extension.manifest.contributes.localizations &&
            extension.manifest.contributes.localizations.length) {
            this.logService.info('Adding language packs from the extension', extension.identifier.id);
            await this.update();
        }
    }
    async postUninstallExtension(extension) {
        const languagePacks = await this.cache.getLanguagePacks();
        if (Object.keys(languagePacks).some((language) => languagePacks[language] &&
            languagePacks[language].extensions.some((e) => areSameExtensions(e.extensionIdentifier, extension.identifier)))) {
            this.logService.info('Removing language packs from the extension', extension.identifier.id);
            await this.update();
        }
    }
    async update() {
        const [current, installed] = await Promise.all([
            this.cache.getLanguagePacks(),
            this.extensionManagementService.getInstalled(),
        ]);
        const updated = await this.cache.update(installed);
        return !equals(Object.keys(current), Object.keys(updated));
    }
};
NativeLanguagePackService = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, INativeEnvironmentService),
    __param(2, IExtensionGalleryService),
    __param(3, ILogService)
], NativeLanguagePackService);
export { NativeLanguagePackService };
let LanguagePacksCache = class LanguagePacksCache extends Disposable {
    constructor(environmentService, logService) {
        super();
        this.logService = logService;
        this.languagePacks = {};
        this.languagePacksFilePath = join(environmentService.userDataPath, 'languagepacks.json');
        this.languagePacksFileLimiter = new Queue();
    }
    getLanguagePacks() {
        // if queue is not empty, fetch from disk
        if (this.languagePacksFileLimiter.size || !this.initializedCache) {
            return this.withLanguagePacks().then(() => this.languagePacks);
        }
        return Promise.resolve(this.languagePacks);
    }
    update(extensions) {
        return this.withLanguagePacks((languagePacks) => {
            Object.keys(languagePacks).forEach((language) => delete languagePacks[language]);
            this.createLanguagePacksFromExtensions(languagePacks, ...extensions);
        }).then(() => this.languagePacks);
    }
    createLanguagePacksFromExtensions(languagePacks, ...extensions) {
        for (const extension of extensions) {
            if (extension &&
                extension.manifest &&
                extension.manifest.contributes &&
                extension.manifest.contributes.localizations &&
                extension.manifest.contributes.localizations.length) {
                this.createLanguagePacksFromExtension(languagePacks, extension);
            }
        }
        Object.keys(languagePacks).forEach((languageId) => this.updateHash(languagePacks[languageId]));
    }
    createLanguagePacksFromExtension(languagePacks, extension) {
        const extensionIdentifier = extension.identifier;
        const localizations = extension.manifest.contributes && extension.manifest.contributes.localizations
            ? extension.manifest.contributes.localizations
            : [];
        for (const localizationContribution of localizations) {
            if (extension.location.scheme === Schemas.file &&
                isValidLocalization(localizationContribution)) {
                let languagePack = languagePacks[localizationContribution.languageId];
                if (!languagePack) {
                    languagePack = {
                        hash: '',
                        extensions: [],
                        translations: {},
                        label: localizationContribution.localizedLanguageName ??
                            localizationContribution.languageName,
                    };
                    languagePacks[localizationContribution.languageId] = languagePack;
                }
                const extensionInLanguagePack = languagePack.extensions.filter((e) => areSameExtensions(e.extensionIdentifier, extensionIdentifier))[0];
                if (extensionInLanguagePack) {
                    extensionInLanguagePack.version = extension.manifest.version;
                }
                else {
                    languagePack.extensions.push({ extensionIdentifier, version: extension.manifest.version });
                }
                for (const translation of localizationContribution.translations) {
                    languagePack.translations[translation.id] = join(extension.location.fsPath, translation.path);
                }
            }
        }
    }
    updateHash(languagePack) {
        if (languagePack) {
            const md5 = createHash('md5'); // CodeQL [SM04514] Used to create an hash for language pack extension version, which is not a security issue
            for (const extension of languagePack.extensions) {
                md5
                    .update(extension.extensionIdentifier.uuid || extension.extensionIdentifier.id)
                    .update(extension.version); // CodeQL [SM01510] The extension UUID is not sensitive info and is not manually created by a user
            }
            languagePack.hash = md5.digest('hex');
        }
    }
    withLanguagePacks(fn = () => null) {
        return this.languagePacksFileLimiter.queue(() => {
            let result = null;
            return fs.promises
                .readFile(this.languagePacksFilePath, 'utf8')
                .then(undefined, (err) => err.code === 'ENOENT' ? Promise.resolve('{}') : Promise.reject(err))
                .then((raw) => {
                try {
                    return JSON.parse(raw);
                }
                catch (e) {
                    return {};
                }
            })
                .then((languagePacks) => {
                result = fn(languagePacks);
                return languagePacks;
            })
                .then((languagePacks) => {
                for (const language of Object.keys(languagePacks)) {
                    if (!languagePacks[language]) {
                        delete languagePacks[language];
                    }
                }
                this.languagePacks = languagePacks;
                this.initializedCache = true;
                const raw = JSON.stringify(this.languagePacks);
                this.logService.debug('Writing language packs', raw);
                return Promises.writeFile(this.languagePacksFilePath, raw);
            })
                .then(() => result, (error) => this.logService.error(error));
        });
    }
};
LanguagePacksCache = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, ILogService)
], LanguagePacksCache);
function isValidLocalization(localization) {
    if (typeof localization.languageId !== 'string') {
        return false;
    }
    if (!Array.isArray(localization.translations) || localization.translations.length === 0) {
        return false;
    }
    for (const translation of localization.translations) {
        if (typeof translation.id !== 'string') {
            return false;
        }
        if (typeof translation.path !== 'string') {
            return false;
        }
    }
    if (localization.languageName && typeof localization.languageName !== 'string') {
        return false;
    }
    if (localization.localizedLanguageName &&
        typeof localization.localizedLanguageName !== 'string') {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VQYWNrcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2xhbmd1YWdlUGFja3Mvbm9kZS9sYW5ndWFnZVBhY2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDbkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUNOLHdCQUF3QixFQUV4QiwyQkFBMkIsR0FFM0IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFckQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQVkxQyxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLHVCQUF1QjtJQUdyRSxZQUVrQiwwQkFBdUQsRUFDN0Msa0JB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