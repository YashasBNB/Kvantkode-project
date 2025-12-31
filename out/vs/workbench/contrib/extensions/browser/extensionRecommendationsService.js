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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService, IExtensionGalleryService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionIgnoredRecommendationsService, } from '../../../services/extensionRecommendations/common/extensionRecommendations.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { shuffle } from '../../../../base/common/arrays.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ExeBasedRecommendations } from './exeBasedRecommendations.js';
import { WorkspaceRecommendations } from './workspaceRecommendations.js';
import { FileBasedRecommendations } from './fileBasedRecommendations.js';
import { KeymapRecommendations } from './keymapRecommendations.js';
import { LanguageRecommendations } from './languageRecommendations.js';
import { ConfigBasedRecommendations } from './configBasedRecommendations.js';
import { IExtensionRecommendationNotificationService } from '../../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { timeout } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { WebRecommendations } from './webRecommendations.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RemoteRecommendations } from './remoteRecommendations.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { IUserDataInitializationService } from '../../../services/userData/browser/userDataInit.js';
import { isString } from '../../../../base/common/types.js';
let ExtensionRecommendationsService = class ExtensionRecommendationsService extends Disposable {
    constructor(instantiationService, lifecycleService, galleryService, telemetryService, environmentService, extensionManagementService, extensionRecommendationsManagementService, extensionRecommendationNotificationService, extensionsWorkbenchService, remoteExtensionsScannerService, userDataInitializationService) {
        super();
        this.lifecycleService = lifecycleService;
        this.galleryService = galleryService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.extensionManagementService = extensionManagementService;
        this.extensionRecommendationsManagementService = extensionRecommendationsManagementService;
        this.extensionRecommendationNotificationService = extensionRecommendationNotificationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.remoteExtensionsScannerService = remoteExtensionsScannerService;
        this.userDataInitializationService = userDataInitializationService;
        this._onDidChangeRecommendations = this._register(new Emitter());
        this.onDidChangeRecommendations = this._onDidChangeRecommendations.event;
        this.workspaceRecommendations = this._register(instantiationService.createInstance(WorkspaceRecommendations));
        this.fileBasedRecommendations = this._register(instantiationService.createInstance(FileBasedRecommendations));
        this.configBasedRecommendations = this._register(instantiationService.createInstance(ConfigBasedRecommendations));
        this.exeBasedRecommendations = this._register(instantiationService.createInstance(ExeBasedRecommendations));
        this.keymapRecommendations = this._register(instantiationService.createInstance(KeymapRecommendations));
        this.webRecommendations = this._register(instantiationService.createInstance(WebRecommendations));
        this.languageRecommendations = this._register(instantiationService.createInstance(LanguageRecommendations));
        this.remoteRecommendations = this._register(instantiationService.createInstance(RemoteRecommendations));
        if (!this.isEnabled()) {
            this.sessionSeed = 0;
            this.activationPromise = Promise.resolve();
            return;
        }
        this.sessionSeed = +new Date();
        // Activation
        this.activationPromise = this.activate();
        this._register(this.extensionManagementService.onDidInstallExtensions((e) => this.onDidInstallExtensions(e)));
    }
    async activate() {
        try {
            await Promise.allSettled([
                this.remoteExtensionsScannerService.whenExtensionsReady(),
                this.userDataInitializationService.whenInitializationFinished(),
                this.lifecycleService.when(3 /* LifecyclePhase.Restored */),
            ]);
        }
        catch (error) {
            /* ignore */
        }
        // activate all recommendations
        await Promise.all([
            this.workspaceRecommendations.activate(),
            this.configBasedRecommendations.activate(),
            this.fileBasedRecommendations.activate(),
            this.keymapRecommendations.activate(),
            this.languageRecommendations.activate(),
            this.webRecommendations.activate(),
            this.remoteRecommendations.activate(),
        ]);
        this._register(Event.any(this.workspaceRecommendations.onDidChangeRecommendations, this.configBasedRecommendations.onDidChangeRecommendations, this.extensionRecommendationsManagementService.onDidChangeIgnoredRecommendations)(() => this._onDidChangeRecommendations.fire()));
        this.promptWorkspaceRecommendations();
    }
    isEnabled() {
        return this.galleryService.isEnabled() && !this.environmentService.isExtensionDevelopment;
    }
    async activateProactiveRecommendations() {
        await Promise.all([
            this.exeBasedRecommendations.activate(),
            this.configBasedRecommendations.activate(),
        ]);
    }
    getAllRecommendationsWithReason() {
        /* Activate proactive recommendations */
        this.activateProactiveRecommendations();
        const output = Object.create(null);
        const allRecommendations = [
            ...this.configBasedRecommendations.recommendations,
            ...this.exeBasedRecommendations.recommendations,
            ...this.fileBasedRecommendations.recommendations,
            ...this.workspaceRecommendations.recommendations,
            ...this.keymapRecommendations.recommendations,
            ...this.languageRecommendations.recommendations,
            ...this.webRecommendations.recommendations,
        ];
        for (const { extension, reason } of allRecommendations) {
            if (isString(extension) && this.isExtensionAllowedToBeRecommended(extension)) {
                output[extension.toLowerCase()] = reason;
            }
        }
        return output;
    }
    async getConfigBasedRecommendations() {
        await this.configBasedRecommendations.activate();
        return {
            important: this.toExtensionIds(this.configBasedRecommendations.importantRecommendations),
            others: this.toExtensionIds(this.configBasedRecommendations.otherRecommendations),
        };
    }
    async getOtherRecommendations() {
        await this.activationPromise;
        await this.activateProactiveRecommendations();
        const recommendations = [
            ...this.configBasedRecommendations.otherRecommendations,
            ...this.exeBasedRecommendations.otherRecommendations,
            ...this.webRecommendations.recommendations,
        ];
        const extensionIds = this.toExtensionIds(recommendations);
        shuffle(extensionIds, this.sessionSeed);
        return extensionIds;
    }
    async getImportantRecommendations() {
        await this.activateProactiveRecommendations();
        const recommendations = [
            ...this.fileBasedRecommendations.importantRecommendations,
            ...this.configBasedRecommendations.importantRecommendations,
            ...this.exeBasedRecommendations.importantRecommendations,
        ];
        const extensionIds = this.toExtensionIds(recommendations);
        shuffle(extensionIds, this.sessionSeed);
        return extensionIds;
    }
    getKeymapRecommendations() {
        return this.toExtensionIds(this.keymapRecommendations.recommendations);
    }
    getLanguageRecommendations() {
        return this.toExtensionIds(this.languageRecommendations.recommendations);
    }
    getRemoteRecommendations() {
        return this.toExtensionIds(this.remoteRecommendations.recommendations);
    }
    async getWorkspaceRecommendations() {
        if (!this.isEnabled()) {
            return [];
        }
        await this.workspaceRecommendations.activate();
        const result = [];
        for (const { extension } of this.workspaceRecommendations.recommendations) {
            if (isString(extension)) {
                if (!result.includes(extension.toLowerCase()) &&
                    this.isExtensionAllowedToBeRecommended(extension)) {
                    result.push(extension.toLowerCase());
                }
            }
            else {
                result.push(extension);
            }
        }
        return result;
    }
    async getExeBasedRecommendations(exe) {
        await this.exeBasedRecommendations.activate();
        const { important, others } = exe
            ? this.exeBasedRecommendations.getRecommendations(exe)
            : {
                important: this.exeBasedRecommendations.importantRecommendations,
                others: this.exeBasedRecommendations.otherRecommendations,
            };
        return { important: this.toExtensionIds(important), others: this.toExtensionIds(others) };
    }
    getFileBasedRecommendations() {
        return this.toExtensionIds(this.fileBasedRecommendations.recommendations);
    }
    onDidInstallExtensions(results) {
        for (const e of results) {
            if (e.source && !URI.isUri(e.source) && e.operation === 2 /* InstallOperation.Install */) {
                const extRecommendations = this.getAllRecommendationsWithReason() || {};
                const recommendationReason = extRecommendations[e.source.identifier.id.toLowerCase()];
                if (recommendationReason) {
                    /* __GDPR__
                        "extensionGallery:install:recommendations" : {
                            "owner": "sandy081",
                            "recommendationReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
                            "${include}": [
                                "${GalleryExtensionTelemetryData}"
                            ]
                        }
                    */
                    this.telemetryService.publicLog('extensionGallery:install:recommendations', {
                        ...e.source.telemetryData,
                        recommendationReason: recommendationReason.reasonId,
                    });
                }
            }
        }
    }
    toExtensionIds(recommendations) {
        const extensionIds = [];
        for (const { extension } of recommendations) {
            if (isString(extension) &&
                this.isExtensionAllowedToBeRecommended(extension) &&
                !extensionIds.includes(extension.toLowerCase())) {
                extensionIds.push(extension.toLowerCase());
            }
        }
        return extensionIds;
    }
    isExtensionAllowedToBeRecommended(extensionId) {
        return !this.extensionRecommendationsManagementService.ignoredRecommendations.includes(extensionId.toLowerCase());
    }
    async promptWorkspaceRecommendations() {
        const installed = await this.extensionsWorkbenchService.queryLocal();
        const allowedRecommendations = [
            ...this.workspaceRecommendations.recommendations,
            ...this.configBasedRecommendations.importantRecommendations.filter((recommendation) => !recommendation.whenNotInstalled ||
                recommendation.whenNotInstalled.every((id) => installed.every((local) => !areSameExtensions(local.identifier, { id })))),
        ]
            .map(({ extension }) => extension)
            .filter((extension) => !isString(extension) || this.isExtensionAllowedToBeRecommended(extension));
        if (allowedRecommendations.length) {
            await this._registerP(timeout(5000));
            await this.extensionRecommendationNotificationService.promptWorkspaceRecommendations(allowedRecommendations);
        }
    }
    _registerP(o) {
        this._register(toDisposable(() => o.cancel()));
        return o;
    }
};
ExtensionRecommendationsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILifecycleService),
    __param(2, IExtensionGalleryService),
    __param(3, ITelemetryService),
    __param(4, IEnvironmentService),
    __param(5, IExtensionManagementService),
    __param(6, IExtensionIgnoredRecommendationsService),
    __param(7, IExtensionRecommendationNotificationService),
    __param(8, IExtensionsWorkbenchService),
    __param(9, IRemoteExtensionsScannerService),
    __param(10, IUserDataInitializationService)
], ExtensionRecommendationsService);
export { ExtensionRecommendationsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25SZWNvbW1lbmRhdGlvbnNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0UsT0FBTyxFQUNOLDJCQUEyQixFQUMzQix3QkFBd0IsR0FHeEIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBR04sdUNBQXVDLEdBQ3ZDLE1BQU0sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFrQixpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFN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