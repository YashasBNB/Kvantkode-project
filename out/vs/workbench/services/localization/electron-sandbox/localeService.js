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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xvY2FsaXphdGlvbi9lbGVjdHJvbi1zYW5kYm94L2xvY2FsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2hGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV4RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNwSCxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JFLE9BQU8s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