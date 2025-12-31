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
import * as nls from '../../../../nls.js';
import { language } from '../../../../base/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Severity, INotificationService, NotificationPriority, } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { platform } from '../../../../base/common/process.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
const PROBABILITY = 0.15;
const SESSION_COUNT_KEY = 'nps/sessionCount';
const LAST_SESSION_DATE_KEY = 'nps/lastSessionDate';
const SKIP_VERSION_KEY = 'nps/skipVersion';
const IS_CANDIDATE_KEY = 'nps/isCandidate';
let NPSContribution = class NPSContribution {
    constructor(storageService, notificationService, telemetryService, openerService, productService, configurationService) {
        if (!productService.npsSurveyUrl ||
            !configurationService.getValue('telemetry.feedback.enabled')) {
            return;
        }
        const skipVersion = storageService.get(SKIP_VERSION_KEY, -1 /* StorageScope.APPLICATION */, '');
        if (skipVersion) {
            return;
        }
        const date = new Date().toDateString();
        const lastSessionDate = storageService.get(LAST_SESSION_DATE_KEY, -1 /* StorageScope.APPLICATION */, new Date(0).toDateString());
        if (date === lastSessionDate) {
            return;
        }
        const sessionCount = (storageService.getNumber(SESSION_COUNT_KEY, -1 /* StorageScope.APPLICATION */, 0) || 0) + 1;
        storageService.store(LAST_SESSION_DATE_KEY, date, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        storageService.store(SESSION_COUNT_KEY, sessionCount, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (sessionCount < 9) {
            return;
        }
        const isCandidate = storageService.getBoolean(IS_CANDIDATE_KEY, -1 /* StorageScope.APPLICATION */, false) ||
            Math.random() < PROBABILITY;
        storageService.store(IS_CANDIDATE_KEY, isCandidate, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        if (!isCandidate) {
            storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
            return;
        }
        notificationService.prompt(Severity.Info, nls.localize('surveyQuestion', 'Do you mind taking a quick feedback survey?'), [
            {
                label: nls.localize('takeSurvey', 'Take Survey'),
                run: () => {
                    openerService.open(URI.parse(`${productService.npsSurveyUrl}?o=${encodeURIComponent(platform)}&v=${encodeURIComponent(productService.version)}&m=${encodeURIComponent(telemetryService.machineId)}`));
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                },
            },
            {
                label: nls.localize('remindLater', 'Remind Me Later'),
                run: () => storageService.store(SESSION_COUNT_KEY, sessionCount - 3, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */),
            },
            {
                label: nls.localize('neverAgain', "Don't Show Again"),
                run: () => {
                    storageService.store(IS_CANDIDATE_KEY, false, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                    storageService.store(SKIP_VERSION_KEY, productService.version, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                },
            },
        ], { sticky: true, priority: NotificationPriority.URGENT });
    }
};
NPSContribution = __decorate([
    __param(0, IStorageService),
    __param(1, INotificationService),
    __param(2, ITelemetryService),
    __param(3, IOpenerService),
    __param(4, IProductService),
    __param(5, IConfigurationService)
], NPSContribution);
if (language === 'en') {
    const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
    workbenchRegistry.registerWorkbenchContribution(NPSContribution, 3 /* LifecyclePhase.Restored */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3N1cnZleXMvYnJvd3Nlci9ucHMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFdkYsT0FBTyxFQUNOLFFBQVEsRUFDUixvQkFBb0IsRUFDcEIsb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFBO0FBQ3hCLE1BQU0saUJBQWlCLEdBQUcsa0JBQWtCLENBQUE7QUFDNUMsTUFBTSxxQkFBcUIsR0FBRyxxQkFBcUIsQ0FBQTtBQUNuRCxNQUFNLGdCQUFnQixHQUFHLGlC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