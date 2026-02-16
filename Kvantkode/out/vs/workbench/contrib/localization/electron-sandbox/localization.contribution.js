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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbG9jYWxpemF0aW9uL2VsZWN0cm9uLXNhbmRib3gvbG9jYWxpemF0aW9uLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUVqQyxNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUNOLDJCQUEyQixFQUMzQix3QkFBd0IsR0FLeEIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxN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