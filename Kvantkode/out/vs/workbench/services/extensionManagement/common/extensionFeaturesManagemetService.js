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
import { Emitter } from '../../../../base/common/event.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions, IExtensionFeaturesManagementService, } from './extensionFeatures.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { isBoolean } from '../../../../base/common/types.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { localize } from '../../../../nls.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { equals } from '../../../../base/common/objects.js';
const FEATURES_STATE_KEY = 'extension.features.state';
let ExtensionFeaturesManagementService = class ExtensionFeaturesManagementService extends Disposable {
    constructor(storageService, dialogService, extensionService) {
        super();
        this.storageService = storageService;
        this.dialogService = dialogService;
        this.extensionService = extensionService;
        this._onDidChangeEnablement = this._register(new Emitter());
        this.onDidChangeEnablement = this._onDidChangeEnablement.event;
        this._onDidChangeAccessData = this._register(new Emitter());
        this.onDidChangeAccessData = this._onDidChangeAccessData.event;
        this.extensionFeaturesState = new Map();
        this.registry = Registry.as(Extensions.ExtensionFeaturesRegistry);
        this.extensionFeaturesState = this.loadState();
        this.garbageCollectOldRequests();
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, FEATURES_STATE_KEY, this._store)((e) => this.onDidStorageChange(e)));
    }
    isEnabled(extension, featureId) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            return false;
        }
        const isDisabled = this.getExtensionFeatureState(extension, featureId)?.disabled;
        if (isBoolean(isDisabled)) {
            return !isDisabled;
        }
        const defaultExtensionAccess = feature.access.extensionsList?.[extension._lower];
        if (isBoolean(defaultExtensionAccess)) {
            return defaultExtensionAccess;
        }
        return !feature.access.requireUserConsent;
    }
    setEnablement(extension, featureId, enabled) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            throw new Error(`No feature with id '${featureId}'`);
        }
        const featureState = this.getAndSetIfNotExistsExtensionFeatureState(extension, featureId);
        if (featureState.disabled !== !enabled) {
            featureState.disabled = !enabled;
            this._onDidChangeEnablement.fire({ extension, featureId, enabled });
            this.saveState();
        }
    }
    getEnablementData(featureId) {
        const result = [];
        const feature = this.registry.getExtensionFeature(featureId);
        if (feature) {
            for (const [extension, featuresStateMap] of this.extensionFeaturesState) {
                const featureState = featuresStateMap.get(featureId);
                if (featureState?.disabled !== undefined) {
                    result.push({
                        extension: new ExtensionIdentifier(extension),
                        enabled: !featureState.disabled,
                    });
                }
            }
        }
        return result;
    }
    async getAccess(extension, featureId, justification) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            return false;
        }
        const featureState = this.getAndSetIfNotExistsExtensionFeatureState(extension, featureId);
        if (featureState.disabled) {
            return false;
        }
        if (featureState.disabled === undefined) {
            let enabled = true;
            if (feature.access.requireUserConsent) {
                const extensionDescription = this.extensionService.extensions.find((e) => ExtensionIdentifier.equals(e.identifier, extension));
                const confirmationResult = await this.dialogService.confirm({
                    title: localize('accessExtensionFeature', "Access '{0}' Feature", feature.label),
                    message: localize('accessExtensionFeatureMessage', "'{0}' extension would like to access the '{1}' feature.", extensionDescription?.displayName ?? extension._lower, feature.label),
                    detail: justification ?? feature.description,
                    custom: true,
                    primaryButton: localize('allow', 'Allow'),
                    cancelButton: localize('disallow', "Don't Allow"),
                });
                enabled = confirmationResult.confirmed;
            }
            this.setEnablement(extension, featureId, enabled);
            if (!enabled) {
                return false;
            }
        }
        const accessTime = new Date();
        featureState.accessData.current = {
            accessTimes: [accessTime].concat(featureState.accessData.current?.accessTimes ?? []),
            lastAccessed: accessTime,
            status: featureState.accessData.current?.status,
        };
        featureState.accessData.accessTimes = (featureState.accessData.accessTimes ?? []).concat(accessTime);
        this.saveState();
        this._onDidChangeAccessData.fire({ extension, featureId, accessData: featureState.accessData });
        return true;
    }
    getAllAccessDataForExtension(extension) {
        const result = new Map();
        const extensionState = this.extensionFeaturesState.get(extension._lower);
        if (extensionState) {
            for (const [featureId, featureState] of extensionState) {
                result.set(featureId, featureState.accessData);
            }
        }
        return result;
    }
    getAccessData(extension, featureId) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            return;
        }
        return this.getExtensionFeatureState(extension, featureId)?.accessData;
    }
    setStatus(extension, featureId, status) {
        const feature = this.registry.getExtensionFeature(featureId);
        if (!feature) {
            throw new Error(`No feature with id '${featureId}'`);
        }
        const featureState = this.getAndSetIfNotExistsExtensionFeatureState(extension, featureId);
        featureState.accessData.current = {
            accessTimes: featureState.accessData.current?.accessTimes ?? [],
            lastAccessed: featureState.accessData.current?.lastAccessed ?? new Date(),
            status,
        };
        this._onDidChangeAccessData.fire({
            extension,
            featureId,
            accessData: this.getAccessData(extension, featureId),
        });
    }
    getExtensionFeatureState(extension, featureId) {
        return this.extensionFeaturesState.get(extension._lower)?.get(featureId);
    }
    getAndSetIfNotExistsExtensionFeatureState(extension, featureId) {
        let extensionState = this.extensionFeaturesState.get(extension._lower);
        if (!extensionState) {
            extensionState = new Map();
            this.extensionFeaturesState.set(extension._lower, extensionState);
        }
        let featureState = extensionState.get(featureId);
        if (!featureState) {
            featureState = { accessData: { accessTimes: [] } };
            extensionState.set(featureId, featureState);
        }
        return featureState;
    }
    onDidStorageChange(e) {
        if (e.external) {
            const oldState = this.extensionFeaturesState;
            this.extensionFeaturesState = this.loadState();
            for (const extensionId of distinct([
                ...oldState.keys(),
                ...this.extensionFeaturesState.keys(),
            ])) {
                const extension = new ExtensionIdentifier(extensionId);
                const oldExtensionFeaturesState = oldState.get(extensionId);
                const newExtensionFeaturesState = this.extensionFeaturesState.get(extensionId);
                for (const featureId of distinct([
                    ...(oldExtensionFeaturesState?.keys() ?? []),
                    ...(newExtensionFeaturesState?.keys() ?? []),
                ])) {
                    const isEnabled = this.isEnabled(extension, featureId);
                    const wasEnabled = !oldExtensionFeaturesState?.get(featureId)?.disabled;
                    if (isEnabled !== wasEnabled) {
                        this._onDidChangeEnablement.fire({ extension, featureId, enabled: isEnabled });
                    }
                    const newAccessData = this.getAccessData(extension, featureId);
                    const oldAccessData = oldExtensionFeaturesState?.get(featureId)?.accessData;
                    if (!equals(newAccessData, oldAccessData)) {
                        this._onDidChangeAccessData.fire({
                            extension,
                            featureId,
                            accessData: newAccessData ?? { accessTimes: [] },
                        });
                    }
                }
            }
        }
    }
    loadState() {
        let data = {};
        const raw = this.storageService.get(FEATURES_STATE_KEY, 0 /* StorageScope.PROFILE */, '{}');
        try {
            data = JSON.parse(raw);
        }
        catch (e) {
            // ignore
        }
        const result = new Map();
        for (const extensionId in data) {
            const extensionFeatureState = new Map();
            const extensionFeatures = data[extensionId];
            for (const featureId in extensionFeatures) {
                const extensionFeature = extensionFeatures[featureId];
                extensionFeatureState.set(featureId, {
                    disabled: extensionFeature.disabled,
                    accessData: {
                        accessTimes: (extensionFeature.accessTimes ?? []).map((time) => new Date(time)),
                    },
                });
            }
            result.set(extensionId.toLowerCase(), extensionFeatureState);
        }
        return result;
    }
    saveState() {
        const data = {};
        this.extensionFeaturesState.forEach((extensionState, extensionId) => {
            const extensionFeatures = {};
            extensionState.forEach((featureState, featureId) => {
                extensionFeatures[featureId] = {
                    disabled: featureState.disabled,
                    accessTimes: featureState.accessData.accessTimes.map((time) => time.getTime()),
                };
            });
            data[extensionId] = extensionFeatures;
        });
        this.storageService.store(FEATURES_STATE_KEY, JSON.stringify(data), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    garbageCollectOldRequests() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        let modified = false;
        for (const [, featuresStateMap] of this.extensionFeaturesState) {
            for (const [, featureState] of featuresStateMap) {
                const originalLength = featureState.accessData.accessTimes.length;
                featureState.accessData.accessTimes = featureState.accessData.accessTimes.filter((accessTime) => accessTime > thirtyDaysAgo);
                if (featureState.accessData.accessTimes.length !== originalLength) {
                    modified = true;
                }
            }
        }
        if (modified) {
            this.saveState();
        }
    }
};
ExtensionFeaturesManagementService = __decorate([
    __param(0, IStorageService),
    __param(1, IDialogService),
    __param(2, IExtensionService)
], ExtensionFeaturesManagementService);
registerSingleton(IExtensionFeaturesManagementService, ExtensionFeaturesManagementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXNNYW5hZ2VtZXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uRmVhdHVyZXNNYW5hZ2VtZXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUNOLFVBQVUsRUFFVixtQ0FBbUMsR0FFbkMsTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUUzRSxPQUFPLEVBQVcsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBTzNELE1BQU0sa0JBQWtCLEdBQUcsMEJBQTBCLENBQUE7QUFFckQsSUFBTSxrQ0FB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