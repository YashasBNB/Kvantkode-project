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
import { language } from '../../../../base/common/platform.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Severity, INotificationService, } from '../../../../platform/notification/common/notification.js';
import { ITextFileService, } from '../../../services/textfile/common/textfiles.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { platform } from '../../../../base/common/process.js';
import { RunOnceWorker } from '../../../../base/common/async.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
class LanguageSurvey extends Disposable {
    constructor(data, storageService, notificationService, telemetryService, languageService, textFileService, openerService, productService) {
        super();
        const SESSION_COUNT_KEY = `${data.surveyId}.sessionCount`;
        const LAST_SESSION_DATE_KEY = `${data.surveyId}.lastSessionDate`;
        const SKIP_VERSION_KEY = `${data.surveyId}.skipVersion`;
        const IS_CANDIDATE_KEY = `${data.surveyId}.isCandidate`;
        const EDITED_LANGUAGE_COUNT_KEY = `${data.surveyId}.editedCount`;
        const EDITED_LANGUAGE_DATE_KEY = `${data.surveyId}.editedDate`;
        const skipVersion = storageService.get(SKIP_VERSION_KEY, -1 /* StorageScope.APPLICATION */, '');
        if (skipVersion) {
            return;
        }
        const date = new Date().toDateString();
        if (storageService.getNumber(EDITED_LANGUAGE_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) <
            data.editCount) {
            // Process model-save event every 250ms to reduce load
            const onModelsSavedWorker = this._register(new RunOnceWorker((models) => {
                models.forEach((m) => {
                    if (m.getLanguageId() === data.languageId &&
                        date !== storageService.get(EDITED_LANGUAGE_DATE_KEY, -1 /* StorageScope.APPLICATION */)) {
                        const editedCount = storageService.getNumber(EDITED_LANGUAGE_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) + 1;
                        storageService.store(EDITED_LANGUAGE_COUNT_KEY, editedCount, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                        storageService.store(EDITED_LANGUAGE_DATE_KEY, date, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    }
                });
            }, 250));
            this._register(textFileService.files.onDidSave((e) => onModelsSavedWorker.work(e.model)));
        }
        const lastSessionDate = storageService.get(LAST_SESSION_DATE_KEY, -1 /* StorageScope.APPLICATION */, new Date(0).toDateString());
        if (date === lastSessionDate) {
            return;
        }
        const sessionCount = storageService.getNumber(SESSION_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) + 1;
        storageService.store(LAST_SESSION_DATE_KEY, date, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        storageService.store(SESSION_COUNT_KEY, sessionCount, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (sessionCount < 9) {
            return;
        }
        if (storageService.getNumber(EDITED_LANGUAGE_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) <
            data.editCount) {
            return;
        }
        const isCandidate = storageService.getBoolean(IS_CANDIDATE_KEY, -1 /* StorageScope.APPLICATION */, false) ||
            Math.random() < data.userProbability;
        storageService.store(IS_CANDIDATE_KEY, isCandidate, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (!isCandidate) {
            storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            return;
        }
        notificationService.prompt(Severity.Info, localize('helpUs', 'Help us improve our support for {0}', languageService.getLanguageName(data.languageId) ?? data.languageId), [
            {
                label: localize('takeShortSurvey', 'Take Short Survey'),
                run: () => {
                    telemetryService.publicLog(`${data.surveyId}.survey/takeShortSurvey`);
                    openerService.open(URI.parse(`${data.surveyUrl}?o=${encodeURIComponent(platform)}&v=${encodeURIComponent(productService.version)}&m=${encodeURIComponent(telemetryService.machineId)}`));
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                },
            },
            {
                label: localize('remindLater', 'Remind Me Later'),
                run: () => {
                    telemetryService.publicLog(`${data.surveyId}.survey/remindMeLater`);
                    storageService.store(SESSION_COUNT_KEY, sessionCount - 3, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                },
            },
            {
                label: localize('neverAgain', "Don't Show Again"),
                isSecondary: true,
                run: () => {
                    telemetryService.publicLog(`${data.surveyId}.survey/dontShowAgain`);
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                },
            },
        ], { sticky: true });
    }
}
let LanguageSurveysContribution = class LanguageSurveysContribution {
    constructor(storageService, notificationService, telemetryService, textFileService, openerService, productService, languageService, extensionService) {
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.textFileService = textFileService;
        this.openerService = openerService;
        this.productService = productService;
        this.languageService = languageService;
        this.extensionService = extensionService;
        this.handleSurveys();
    }
    async handleSurveys() {
        if (!this.productService.surveys) {
            return;
        }
        // Make sure to wait for installed extensions
        // being registered to show notifications
        // properly (https://github.com/microsoft/vscode/issues/121216)
        await this.extensionService.whenInstalledExtensionsRegistered();
        // Handle surveys
        this.productService.surveys
            .filter((surveyData) => surveyData.surveyId &&
            surveyData.editCount &&
            surveyData.languageId &&
            surveyData.surveyUrl &&
            surveyData.userProbability)
            .map((surveyData) => new LanguageSurvey(surveyData, this.storageService, this.notificationService, this.telemetryService, this.languageService, this.textFileService, this.openerService, this.productService));
    }
};
LanguageSurveysContribution = __decorate([
    __param(0, IStorageService),
    __param(1, INotificationService),
    __param(2, ITelemetryService),
    __param(3, ITextFileService),
    __param(4, IOpenerService),
    __param(5, IProductService),
    __param(6, ILanguageService),
    __param(7, IExtensionService)
], LanguageSurveysContribution);
if (language === 'en') {
    const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
    workbenchRegistry.registerWorkbenchContribution(LanguageSurveysContribution, 3 /* LifecyclePhase.Restored */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdXJ2ZXlzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3VydmV5cy9icm93c2VyL2xhbmd1YWdlU3VydmV5cy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBR04sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBR3ZGLE9BQU8sRUFDTixRQUFRLEVBQ1Isb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUs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