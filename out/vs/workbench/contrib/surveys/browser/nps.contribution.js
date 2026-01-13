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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3VydmV5cy9icm93c2VyL25wcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsR0FDakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUV2RixPQUFPLEVBQ04sUUFBUSxFQUNSLG9CQUFvQixFQUNwQixvQkFBb0IsR0FDcEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUE7QUFDeEIsTUFBTSxpQkFBaUIsR0FBRyxrQkFBa0IsQ0FBQTtBQUM1QyxNQUFNLHFCQUFxQixHQUFHLHFCQUFxQixDQUFBO0FB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