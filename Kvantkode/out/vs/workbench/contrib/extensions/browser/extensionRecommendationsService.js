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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUmVjb21tZW5kYXRpb25zU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvblJlY29tbWVuZGF0aW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLHdCQUF3QixHQUd4QixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFHTix1Q0FBdUMsR0FDdkMsTUFBTSwrRUFBK0UsQ0FBQTtBQUN0RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQWtCLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDbEUsT0FB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