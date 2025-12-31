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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXNNYW5hZ2VtZXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbkZlYXR1cmVzTWFuYWdlbWV0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFDTixVQUFVLEVBRVYsbUNBQW1DLEdBRW5DLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFM0UsT0FBTyxFQUFXLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQU8zRCxNQUFNLGtCQUFrQixHQUFHLDBCQUEwQixDQUFBO0FBRXJELElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQ0wsU0FBUSxVQUFVO0lBc0JsQixZQUNrQixjQUFnRCxFQUNqRCxhQUE4QyxFQUMzQyxnQkFBb0Q7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFKMkIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ2hDLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMxQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBcEJ2RCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUN2RCxJQUFJLE9BQU8sRUFBMkUsQ0FDdEYsQ0FBQTtRQUNRLDBCQUFxQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUE7UUFFakQsMkJBQXNCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDdkQsSUFBSSxPQUFPLEVBSVAsQ0FDSixDQUFBO1FBQ1EsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtRQUcxRCwyQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBK0MsQ0FBQTtRQVF0RixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTZCLFVBQVUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQzdGLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixjQUFjLENBQUMsZ0JBQWdCLCtCQUU5QixrQkFBa0IsRUFDbEIsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDcEMsQ0FBQTtJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsU0FBOEIsRUFBRSxTQUFpQjtRQUMxRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQUUsUUFBUSxDQUFBO1FBQ2hGLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTyxDQUFDLFVBQVUsQ0FBQTtRQUNuQixDQUFDO1FBQ0QsTUFBTSxzQkFBc0IsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoRixJQUFJLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7WUFDdkMsT0FBTyxzQkFBc0IsQ0FBQTtRQUM5QixDQUFDO1FBQ0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUE7SUFDMUMsQ0FBQztJQUVELGFBQWEsQ0FBQyxTQUE4QixFQUFFLFNBQWlCLEVBQUUsT0FBZ0I7UUFDaEYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM1RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ3JELENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMseUNBQXlDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pGLElBQUksWUFBWSxDQUFDLFFBQVEsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hDLFlBQVksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxPQUFPLENBQUE7WUFDaEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUNuRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFRCxpQkFBaUIsQ0FDaEIsU0FBaUI7UUFFakIsTUFBTSxNQUFNLEdBQTZFLEVBQUUsQ0FBQTtRQUMzRixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixLQUFLLE1BQU0sQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztnQkFDekUsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNwRCxJQUFJLFlBQVksRUFBRSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQzFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsU0FBUyxFQUFFLElBQUksbUJBQW1CLENBQUMsU0FBUyxDQUFDO3dCQUM3QyxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUTtxQkFDL0IsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQ2QsU0FBOEIsRUFDOUIsU0FBaUIsRUFDakIsYUFBc0I7UUFFdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM1RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMseUNBQXlDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3pGLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUVELElBQUksWUFBWSxDQUFDLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDbEIsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3ZDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN4RSxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FDbkQsQ0FBQTtnQkFDRCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUM7b0JBQzNELEtBQUssRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQztvQkFDaEYsT0FBTyxFQUFFLFFBQVEsQ0FDaEIsK0JBQStCLEVBQy9CLHlEQUF5RCxFQUN6RCxvQkFBb0IsRUFBRSxXQUFXLElBQUksU0FBUyxDQUFDLE1BQU0sRUFDckQsT0FBTyxDQUFDLEtBQUssQ0FDYjtvQkFDRCxNQUFNLEVBQUUsYUFBYSxJQUFJLE9BQU8sQ0FBQyxXQUFXO29CQUM1QyxNQUFNLEVBQUUsSUFBSTtvQkFDWixhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7b0JBQ3pDLFlBQVksRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQztpQkFDakQsQ0FBQyxDQUFBO2dCQUNGLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUE7WUFDdkMsQ0FBQztZQUNELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNqRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7UUFDN0IsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUc7WUFDakMsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsSUFBSSxFQUFFLENBQUM7WUFDcEYsWUFBWSxFQUFFLFVBQVU7WUFDeEIsTUFBTSxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE1BQU07U0FDL0MsQ0FBQTtRQUNELFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUN2RixVQUFVLENBQ1YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUNoQixJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDL0YsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsNEJBQTRCLENBQzNCLFNBQThCO1FBRTlCLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFBO1FBQzdELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3hFLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEIsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUN4RCxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0MsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxhQUFhLENBQ1osU0FBOEIsRUFDOUIsU0FBaUI7UUFFakIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUM1RCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFNO1FBQ1AsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxVQUFVLENBQUE7SUFDdkUsQ0FBQztJQUVELFNBQVMsQ0FDUixTQUE4QixFQUM5QixTQUFpQixFQUNqQixNQUE2RTtRQUU3RSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDckQsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDekYsWUFBWSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUc7WUFDakMsV0FBVyxFQUFFLFlBQVksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFdBQVcsSUFBSSxFQUFFO1lBQy9ELFlBQVksRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxZQUFZLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDekUsTUFBTTtTQUNOLENBQUE7UUFDRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDO1lBQ2hDLFNBQVM7WUFDVCxTQUFTO1lBQ1QsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBRTtTQUNyRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sd0JBQXdCLENBQy9CLFNBQThCLEVBQzlCLFNBQWlCO1FBRWpCLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFTyx5Q0FBeUMsQ0FDaEQsU0FBOEIsRUFDOUIsU0FBaUI7UUFFakIsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JCLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQTtZQUMxRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUNELElBQUksWUFBWSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLFlBQVksR0FBRyxFQUFFLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFBO1lBQ2xELGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzVDLENBQUM7UUFDRCxPQUFPLFlBQVksQ0FBQTtJQUNwQixDQUFDO0lBRU8sa0JBQWtCLENBQUMsQ0FBc0I7UUFDaEQsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDaEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFBO1lBQzVDLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDOUMsS0FBSyxNQUFNLFdBQVcsSUFBSSxRQUFRLENBQUM7Z0JBQ2xDLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRTtnQkFDbEIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFO2FBQ3JDLENBQUMsRUFBRSxDQUFDO2dCQUNKLE1BQU0sU0FBUyxHQUFHLElBQUksbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7Z0JBQ3RELE1BQU0seUJBQXlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtnQkFDM0QsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFBO2dCQUM5RSxLQUFLLE1BQU0sU0FBUyxJQUFJLFFBQVEsQ0FBQztvQkFDaEMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztvQkFDNUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztpQkFDNUMsQ0FBQyxFQUFFLENBQUM7b0JBQ0osTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7b0JBQ3RELE1BQU0sVUFBVSxHQUFHLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQTtvQkFDdkUsSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLENBQUM7d0JBQzlCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO29CQUMvRSxDQUFDO29CQUNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO29CQUM5RCxNQUFNLGFBQWEsR0FBRyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFBO29CQUMzRSxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsRUFBRSxDQUFDO3dCQUMzQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDOzRCQUNoQyxTQUFTOzRCQUNULFNBQVM7NEJBQ1QsVUFBVSxFQUFFLGFBQWEsSUFBSSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUU7eUJBQ2hELENBQUMsQ0FBQTtvQkFDSCxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxTQUFTO1FBQ2hCLElBQUksSUFBSSxHQUNQLEVBQUUsQ0FBQTtRQUNILE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLGtCQUFrQixnQ0FBd0IsSUFBSSxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDO1lBQ0osSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDdkIsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWixTQUFTO1FBQ1YsQ0FBQztRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFBO1FBQ3JFLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxFQUFFLENBQUM7WUFDaEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQTtZQUN2RSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUMzQyxLQUFLLE1BQU0sU0FBUyxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQzNDLE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQ3JELHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUU7b0JBQ3BDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRO29CQUNuQyxVQUFVLEVBQUU7d0JBQ1gsV0FBVyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQy9FO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUM7WUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1FBQzdELENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxTQUFTO1FBQ2hCLE1BQU0sSUFBSSxHQUVOLEVBQUUsQ0FBQTtRQUNOLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDbkUsTUFBTSxpQkFBaUIsR0FBcUUsRUFBRSxDQUFBO1lBQzlGLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxFQUFFLEVBQUU7Z0JBQ2xELGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHO29CQUM5QixRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7b0JBQy9CLFdBQVcsRUFBRSxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDOUUsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLGlCQUFpQixDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQ3hCLGtCQUFrQixFQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQywyREFHcEIsQ0FBQTtJQUNGLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQTtRQUN0QixNQUFNLGFBQWEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9ELElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUVwQixLQUFLLE1BQU0sQ0FBQyxFQUFFLGdCQUFnQixDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDaEUsS0FBSyxNQUFNLENBQUMsRUFBRSxZQUFZLENBQUMsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUNqRCxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUE7Z0JBQ2pFLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FDL0UsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsR0FBRyxhQUFhLENBQzFDLENBQUE7Z0JBQ0QsSUFBSSxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEtBQUssY0FBYyxFQUFFLENBQUM7b0JBQ25FLFFBQVEsR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBOVRLLGtDQUFrQztJQXdCckMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsaUJBQWlCLENBQUE7R0ExQmQsa0NBQWtDLENBOFR2QztBQUVELGlCQUFpQixDQUNoQixtQ0FBbUMsRUFDbkMsa0NBQWtDLG9DQUVsQyxDQUFBIn0=