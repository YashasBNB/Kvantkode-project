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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdXJ2ZXlzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3N1cnZleXMvYnJvd3Nlci9sYW5ndWFnZVN1cnZleXMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUd2RixPQUFPLEVBQ04sUUFBUSxFQUNSLG9CQUFvQixHQUNwQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUs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