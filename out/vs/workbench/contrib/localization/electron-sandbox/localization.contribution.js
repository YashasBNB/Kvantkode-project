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
var NativeLocalizationWorkbenchContribution_1;
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import * as platform from '../../../../base/common/platform.js';
import { IExtensionManagementService, IExtensionGalleryService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { INotificationService, NeverShowAgainScope, } from '../../../../platform/notification/common/notification.js';
import Severity from '../../../../base/common/severity.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { minimumTranslatedStrings } from './minimalTranslations.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ILocaleService } from '../../../services/localization/common/locale.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { BaseLocalizationWorkbenchContribution } from '../common/localization.contribution.js';
let NativeLocalizationWorkbenchContribution = class NativeLocalizationWorkbenchContribution extends BaseLocalizationWorkbenchContribution {
    static { NativeLocalizationWorkbenchContribution_1 = this; }
    static { this.LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY = 'extensionsAssistant/languagePackSuggestionIgnore'; }
    constructor(notificationService, localeService, productService, storageService, extensionManagementService, galleryService, extensionsWorkbenchService, telemetryService) {
        super();
        this.notificationService = notificationService;
        this.localeService = localeService;
        this.productService = productService;
        this.storageService = storageService;
        this.extensionManagementService = extensionManagementService;
        this.galleryService = galleryService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.telemetryService = telemetryService;
        this.checkAndInstall();
        this._register(this.extensionManagementService.onDidInstallExtensions((e) => this.onDidInstallExtensions(e)));
        this._register(this.extensionManagementService.onDidUninstallExtension((e) => this.onDidUninstallExtension(e)));
    }
    async onDidInstallExtensions(results) {
        for (const result of results) {
            if (result.operation === 2 /* InstallOperation.Install */ && result.local) {
                await this.onDidInstallExtension(result.local, !!result.context?.extensionsSync);
            }
        }
    }
    async onDidInstallExtension(localExtension, fromSettingsSync) {
        const localization = localExtension.manifest.contributes?.localizations?.[0];
        if (!localization || platform.language === localization.languageId) {
            return;
        }
        const { languageId, languageName } = localization;
        this.notificationService.prompt(Severity.Info, localize('updateLocale', "Would you like to change {0}'s display language to {1} and restart?", this.productService.nameLong, languageName || languageId), [
            {
                label: localize('changeAndRestart', 'Change Language and Restart'),
                run: async () => {
                    await this.localeService.setLocale({
                        id: languageId,
                        label: languageName ?? languageId,
                        extensionId: localExtension.identifier.id,
                        // If settings sync installs the language pack, then we would have just shown the notification so no
                        // need to show the dialog.
                    }, true);
                },
            },
        ], {
            sticky: true,
            neverShowAgain: {
                id: 'langugage.update.donotask',
                isSecondary: true,
                scope: NeverShowAgainScope.APPLICATION,
            },
        });
    }
    async onDidUninstallExtension(_event) {
        if (!(await this.isLocaleInstalled(platform.language))) {
            this.localeService.setLocale({
                id: 'en',
                label: 'English',
            });
        }
    }
    async checkAndInstall() {
        const language = platform.language;
        let locale = platform.locale ?? '';
        const languagePackSuggestionIgnoreList = JSON.parse(this.storageService.get(NativeLocalizationWorkbenchContribution_1.LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, -1 /* StorageScope.APPLICATION */, '[]'));
        if (!this.galleryService.isEnabled()) {
            return;
        }
        if (!language || !locale || platform.Language.isDefaultVariant()) {
            return;
        }
        if (locale.startsWith(language) || languagePackSuggestionIgnoreList.includes(locale)) {
            return;
        }
        const installed = await this.isLocaleInstalled(locale);
        if (installed) {
            return;
        }
        const fullLocale = locale;
        let tagResult = await this.galleryService.query({ text: `tag:lp-${locale}` }, CancellationToken.None);
        if (tagResult.total === 0) {
            // Trim the locale and try again.
            locale = locale.split('-')[0];
            tagResult = await this.galleryService.query({ text: `tag:lp-${locale}` }, CancellationToken.None);
            if (tagResult.total === 0) {
                return;
            }
        }
        const extensionToInstall = tagResult.total === 1
            ? tagResult.firstPage[0]
            : tagResult.firstPage.find((e) => e.publisher === 'MS-CEINTL' && e.name.startsWith('vscode-language-pack'));
        const extensionToFetchTranslationsFrom = extensionToInstall ?? tagResult.firstPage[0];
        if (!extensionToFetchTranslationsFrom.assets.manifest) {
            return;
        }
        const [manifest, translation] = await Promise.all([
            this.galleryService.getManifest(extensionToFetchTranslationsFrom, CancellationToken.None),
            this.galleryService.getCoreTranslation(extensionToFetchTranslationsFrom, locale),
        ]);
        const loc = manifest?.contributes?.localizations?.find((x) => locale.startsWith(x.languageId.toLowerCase()));
        const languageName = loc ? loc.languageName || locale : locale;
        const languageDisplayName = loc
            ? loc.localizedLanguageName || loc.languageName || locale
            : locale;
        const translationsFromPack = translation?.contents?.['vs/workbench/contrib/localization/electron-sandbox/minimalTranslations'] ?? {};
        const promptMessageKey = extensionToInstall
            ? 'installAndRestartMessage'
            : 'showLanguagePackExtensions';
        const useEnglish = !translationsFromPack[promptMessageKey];
        const translations = {};
        Object.keys(minimumTranslatedStrings).forEach((key) => {
            if (!translationsFromPack[key] || useEnglish) {
                translations[key] = minimumTranslatedStrings[key].replace('{0}', () => languageName);
            }
            else {
                translations[key] =
                    `${translationsFromPack[key].replace('{0}', () => languageDisplayName)} (${minimumTranslatedStrings[key].replace('{0}', () => languageName)})`;
            }
        });
        const logUserReaction = (userReaction) => {
            /* __GDPR__
                "languagePackSuggestion:popup" : {
                    "owner": "TylerLeonhardt",
                    "userReaction" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                    "language": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetryService.publicLog('languagePackSuggestion:popup', {
                userReaction,
                language: locale,
            });
        };
        const searchAction = {
            label: translations['searchMarketplace'],
            run: async () => {
                logUserReaction('search');
                await this.extensionsWorkbenchService.openSearch(`tag:lp-${locale}`);
            },
        };
        const installAndRestartAction = {
            label: translations['installAndRestart'],
            run: async () => {
                logUserReaction('installAndRestart');
                await this.localeService.setLocale({
                    id: locale,
                    label: languageName,
                    extensionId: extensionToInstall?.identifier.id,
                    galleryExtension: extensionToInstall,
                    // The user will be prompted if they want to install the language pack before this.
                }, true);
            },
        };
        const promptMessage = translations[promptMessageKey];
        this.notificationService.prompt(Severity.Info, promptMessage, [
            extensionToInstall ? installAndRestartAction : searchAction,
            {
                label: localize('neverAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    languagePackSuggestionIgnoreList.push(fullLocale);
                    this.storageService.store(NativeLocalizationWorkbenchContribution_1.LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, JSON.stringify(languagePackSuggestionIgnoreList), -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    logUserReaction('neverShowAgain');
                },
            },
        ], {
            onCancel: () => {
                logUserReaction('cancelled');
            },
        });
    }
    async isLocaleInstalled(locale) {
        const installed = await this.extensionManagementService.getInstalled();
        return installed.some((i) => !!i.manifest.contributes?.localizations?.length &&
            i.manifest.contributes.localizations.some((l) => locale.startsWith(l.languageId.toLowerCase())));
    }
};
NativeLocalizationWorkbenchContribution = NativeLocalizationWorkbenchContribution_1 = __decorate([
    __param(0, INotificationService),
    __param(1, ILocaleService),
    __param(2, IProductService),
    __param(3, IStorageService),
    __param(4, IExtensionManagementService),
    __param(5, IExtensionGalleryService),
    __param(6, IExtensionsWorkbenchService),
    __param(7, ITelemetryService)
], NativeLocalizationWorkbenchContribution);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(NativeLocalizationWorkbenchContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2xvY2FsaXphdGlvbi9lbGVjdHJvbi1zYW5kYm94L2xvY2FsaXphdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFDTiwyQkFBMkIsRUFDM0Isd0JBQXdCLEdBS3hCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixtQkFBbUIsR0FDbkIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixP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