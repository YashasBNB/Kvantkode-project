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
import { Language, LANGUAGE_DEFAULT } from '../../../../base/common/platform.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { IActiveLanguagePackService, ILocaleService } from '../common/locale.js';
import { ILanguagePackService, } from '../../../../platform/languagePacks/common/languagePacks.js';
import { IPaneCompositePartService } from '../../panecomposite/browser/panecomposite.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { localize } from '../../../../nls.js';
import { toAction } from '../../../../base/common/actions.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { parse } from '../../../../base/common/jsonc.js';
import { IEditorService } from '../../editor/common/editorService.js';
import { IHostService } from '../../host/browser/host.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
// duplicate of VIEWLET_ID in contrib/extensions
const EXTENSIONS_VIEWLET_ID = 'workbench.view.extensions';
let NativeLocaleService = class NativeLocaleService {
    constructor(jsonEditingService, environmentService, notificationService, languagePackService, paneCompositePartService, extensionManagementService, progressService, textFileService, editorService, dialogService, hostService, productService) {
        this.jsonEditingService = jsonEditingService;
        this.environmentService = environmentService;
        this.notificationService = notificationService;
        this.languagePackService = languagePackService;
        this.paneCompositePartService = paneCompositePartService;
        this.extensionManagementService = extensionManagementService;
        this.progressService = progressService;
        this.textFileService = textFileService;
        this.editorService = editorService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.productService = productService;
    }
    async validateLocaleFile() {
        try {
            const content = await this.textFileService.read(this.environmentService.argvResource, {
                encoding: 'utf8',
            });
            // This is the same logic that we do where argv.json is parsed so mirror that:
            // https://github.com/microsoft/vscode/blob/32d40cf44e893e87ac33ac4f08de1e5f7fe077fc/src/main.js#L238-L246
            parse(content.value);
        }
        catch (error) {
            this.notificationService.notify({
                severity: Severity.Error,
                message: localize('argvInvalid', 'Unable to write display language. Please open the runtime settings, correct errors/warnings in it and try again.'),
                actions: {
                    primary: [
                        toAction({
                            id: 'openArgv',
                            label: localize('openArgv', 'Open Runtime Settings'),
                            run: () => this.editorService.openEditor({ resource: this.environmentService.argvResource }),
                        }),
                    ],
                },
            });
            return false;
        }
        return true;
    }
    async writeLocaleValue(locale) {
        if (!(await this.validateLocaleFile())) {
            return false;
        }
        await this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['locale'], value: locale }], true);
        return true;
    }
    async setLocale(languagePackItem, skipDialog = false) {
        const locale = languagePackItem.id;
        if (locale === Language.value() || (!locale && Language.isDefaultVariant())) {
            return;
        }
        const installedLanguages = await this.languagePackService.getInstalledLanguages();
        try {
            // Only Desktop has the concept of installing language packs so we only do this for Desktop
            // and only if the language pack is not installed
            if (!installedLanguages.some((installedLanguage) => installedLanguage.id === languagePackItem.id)) {
                // Only actually install a language pack from Microsoft
                if (languagePackItem.galleryExtension?.publisher.toLowerCase() !== 'ms-ceintl') {
                    // Show the view so the user can see the language pack that they should install
                    // as of now, there are no 3rd party language packs available on the Marketplace.
                    const viewlet = await this.paneCompositePartService.openPaneComposite(EXTENSIONS_VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */);
                    (viewlet?.getViewPaneContainer()).search(`@id:${languagePackItem.extensionId}`);
                    return;
                }
                await this.progressService.withProgress({
                    location: 15 /* ProgressLocation.Notification */,
                    title: localize('installing', 'Installing {0} language support...', languagePackItem.label),
                }, (progress) => this.extensionManagementService.installFromGallery(languagePackItem.galleryExtension, {
                    // Setting this to false is how you get the extension to be synced with Settings Sync (if enabled).
                    isMachineScoped: false,
                }));
            }
            if (!skipDialog && !(await this.showRestartDialog(languagePackItem.label))) {
                return;
            }
            await this.writeLocaleValue(locale);
            await this.hostService.restart();
        }
        catch (err) {
            this.notificationService.error(err);
        }
    }
    async clearLocalePreference() {
        try {
            await this.writeLocaleValue(undefined);
            if (!Language.isDefaultVariant()) {
                await this.showRestartDialog('English');
            }
        }
        catch (err) {
            this.notificationService.error(err);
        }
    }
    async showRestartDialog(languageName) {
        const { confirmed } = await this.dialogService.confirm({
            message: localize('restartDisplayLanguageMessage1', 'Restart {0} to switch to {1}?', this.productService.nameLong, languageName),
            detail: localize('restartDisplayLanguageDetail1', 'To change the display language to {0}, {1} needs to restart.', languageName, this.productService.nameLong),
            primaryButton: localize({ key: 'restart', comment: ['&& denotes a mnemonic character'] }, '&&Restart'),
        });
        return confirmed;
    }
};
NativeLocaleService = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IEnvironmentService),
    __param(2, INotificationService),
    __param(3, ILanguagePackService),
    __param(4, IPaneCompositePartService),
    __param(5, IExtensionManagementService),
    __param(6, IProgressService),
    __param(7, ITextFileService),
    __param(8, IEditorService),
    __param(9, IDialogService),
    __param(10, IHostService),
    __param(11, IProductService)
], NativeLocaleService);
// This is its own service because the localeService depends on IJSONEditingService which causes a circular dependency
// Once that's ironed out, we can fold this into the localeService.
let NativeActiveLanguagePackService = class NativeActiveLanguagePackService {
    constructor(languagePackService) {
        this.languagePackService = languagePackService;
    }
    async getExtensionIdProvidingCurrentLocale() {
        const language = Language.value();
        if (language === LANGUAGE_DEFAULT) {
            return undefined;
        }
        const languages = await this.languagePackService.getInstalledLanguages();
        const languagePack = languages.find((l) => l.id === language);
        return languagePack?.extensionId;
    }
};
NativeActiveLanguagePackService = __decorate([
    __param(0, ILanguagePackService)
], NativeActiveLanguagePackService);
registerSingleton(ILocaleService, NativeLocaleService, 1 /* InstantiationType.Delayed */);
registerSingleton(IActiveLanguagePackService, NativeActiveLanguagePackService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sb2NhbGl6YXRpb24vZWxlY3Ryb24tc2FuZGJveC9sb2NhbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNoRixPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFeEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFDcEgsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUs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