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
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { determineExtensionHostKinds, } from './extensionHostKind.js';
import { IExtensionManifestPropertiesService } from './extensionManifestPropertiesService.js';
import { LocalProcessRunningLocation, LocalWebWorkerRunningLocation, RemoteRunningLocation, } from './extensionRunningLocation.js';
let ExtensionRunningLocationTracker = class ExtensionRunningLocationTracker {
    get maxLocalProcessAffinity() {
        return this._maxLocalProcessAffinity;
    }
    get maxLocalWebWorkerAffinity() {
        return this._maxLocalWebWorkerAffinity;
    }
    constructor(_registry, _extensionHostKindPicker, _environmentService, _configurationService, _logService, _extensionManifestPropertiesService) {
        this._registry = _registry;
        this._extensionHostKindPicker = _extensionHostKindPicker;
        this._environmentService = _environmentService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._extensionManifestPropertiesService = _extensionManifestPropertiesService;
        this._runningLocation = new ExtensionIdentifierMap();
        this._maxLocalProcessAffinity = 0;
        this._maxLocalWebWorkerAffinity = 0;
    }
    set(extensionId, runningLocation) {
        this._runningLocation.set(extensionId, runningLocation);
    }
    readExtensionKinds(extensionDescription) {
        if (extensionDescription.isUnderDevelopment &&
            this._environmentService.extensionDevelopmentKind) {
            return this._environmentService.extensionDevelopmentKind;
        }
        return this._extensionManifestPropertiesService.getExtensionKind(extensionDescription);
    }
    getRunningLocation(extensionId) {
        return this._runningLocation.get(extensionId) || null;
    }
    filterByRunningLocation(extensions, desiredRunningLocation) {
        return filterExtensionDescriptions(extensions, this._runningLocation, (extRunningLocation) => desiredRunningLocation.equals(extRunningLocation));
    }
    filterByExtensionHostKind(extensions, desiredExtensionHostKind) {
        return filterExtensionDescriptions(extensions, this._runningLocation, (extRunningLocation) => extRunningLocation.kind === desiredExtensionHostKind);
    }
    filterByExtensionHostManager(extensions, extensionHostManager) {
        return filterExtensionDescriptions(extensions, this._runningLocation, (extRunningLocation) => extensionHostManager.representsRunningLocation(extRunningLocation));
    }
    _computeAffinity(inputExtensions, extensionHostKind, isInitialAllocation) {
        // Only analyze extensions that can execute
        const extensions = new ExtensionIdentifierMap();
        for (const extension of inputExtensions) {
            if (extension.main || extension.browser) {
                extensions.set(extension.identifier, extension);
            }
        }
        // Also add existing extensions of the same kind that can execute
        for (const extension of this._registry.getAllExtensionDescriptions()) {
            if (extension.main || extension.browser) {
                const runningLocation = this._runningLocation.get(extension.identifier);
                if (runningLocation && runningLocation.kind === extensionHostKind) {
                    extensions.set(extension.identifier, extension);
                }
            }
        }
        // Initially, each extension belongs to its own group
        const groups = new ExtensionIdentifierMap();
        let groupNumber = 0;
        for (const [_, extension] of extensions) {
            groups.set(extension.identifier, ++groupNumber);
        }
        const changeGroup = (from, to) => {
            for (const [key, group] of groups) {
                if (group === from) {
                    groups.set(key, to);
                }
            }
        };
        // We will group things together when there are dependencies
        for (const [_, extension] of extensions) {
            if (!extension.extensionDependencies) {
                continue;
            }
            const myGroup = groups.get(extension.identifier);
            for (const depId of extension.extensionDependencies) {
                const depGroup = groups.get(depId);
                if (!depGroup) {
                    // probably can't execute, so it has no impact
                    continue;
                }
                if (depGroup === myGroup) {
                    // already in the same group
                    continue;
                }
                changeGroup(depGroup, myGroup);
            }
        }
        // Initialize with existing affinities
        const resultingAffinities = new Map();
        let lastAffinity = 0;
        for (const [_, extension] of extensions) {
            const runningLocation = this._runningLocation.get(extension.identifier);
            if (runningLocation) {
                const group = groups.get(extension.identifier);
                resultingAffinities.set(group, runningLocation.affinity);
                lastAffinity = Math.max(lastAffinity, runningLocation.affinity);
            }
        }
        // When doing extension host debugging, we will ignore the configured affinity
        // because we can currently debug a single extension host
        if (!this._environmentService.isExtensionDevelopment) {
            // Go through each configured affinity and try to accomodate it
            const configuredAffinities = this._configurationService.getValue('extensions.experimental.affinity') || {};
            const configuredExtensionIds = Object.keys(configuredAffinities);
            const configuredAffinityToResultingAffinity = new Map();
            for (const extensionId of configuredExtensionIds) {
                const configuredAffinity = configuredAffinities[extensionId];
                if (typeof configuredAffinity !== 'number' ||
                    configuredAffinity <= 0 ||
                    Math.floor(configuredAffinity) !== configuredAffinity) {
                    this._logService.info(`Ignoring configured affinity for '${extensionId}' because the value is not a positive integer.`);
                    continue;
                }
                const group = groups.get(extensionId);
                if (!group) {
                    // The extension is not known or cannot execute for this extension host kind
                    continue;
                }
                const affinity1 = resultingAffinities.get(group);
                if (affinity1) {
                    // Affinity for this group is already established
                    configuredAffinityToResultingAffinity.set(configuredAffinity, affinity1);
                    continue;
                }
                const affinity2 = configuredAffinityToResultingAffinity.get(configuredAffinity);
                if (affinity2) {
                    // Affinity for this configuration is already established
                    resultingAffinities.set(group, affinity2);
                    continue;
                }
                if (!isInitialAllocation) {
                    this._logService.info(`Ignoring configured affinity for '${extensionId}' because extension host(s) are already running. Reload window.`);
                    continue;
                }
                const affinity3 = ++lastAffinity;
                configuredAffinityToResultingAffinity.set(configuredAffinity, affinity3);
                resultingAffinities.set(group, affinity3);
            }
        }
        const result = new ExtensionIdentifierMap();
        for (const extension of inputExtensions) {
            const group = groups.get(extension.identifier) || 0;
            const affinity = resultingAffinities.get(group) || 0;
            result.set(extension.identifier, affinity);
        }
        if (lastAffinity > 0 && isInitialAllocation) {
            for (let affinity = 1; affinity <= lastAffinity; affinity++) {
                const extensionIds = [];
                for (const extension of inputExtensions) {
                    if (result.get(extension.identifier) === affinity) {
                        extensionIds.push(extension.identifier);
                    }
                }
                this._logService.info(`Placing extension(s) ${extensionIds.map((e) => e.value).join(', ')} on a separate extension host.`);
            }
        }
        return { affinities: result, maxAffinity: lastAffinity };
    }
    computeRunningLocation(localExtensions, remoteExtensions, isInitialAllocation) {
        return this._doComputeRunningLocation(this._runningLocation, localExtensions, remoteExtensions, isInitialAllocation).runningLocation;
    }
    _doComputeRunningLocation(existingRunningLocation, localExtensions, remoteExtensions, isInitialAllocation) {
        // Skip extensions that have an existing running location
        localExtensions = localExtensions.filter((extension) => !existingRunningLocation.has(extension.identifier));
        remoteExtensions = remoteExtensions.filter((extension) => !existingRunningLocation.has(extension.identifier));
        const extensionHostKinds = determineExtensionHostKinds(localExtensions, remoteExtensions, (extension) => this.readExtensionKinds(extension), (extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) => this._extensionHostKindPicker.pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference));
        const extensions = new ExtensionIdentifierMap();
        for (const extension of localExtensions) {
            extensions.set(extension.identifier, extension);
        }
        for (const extension of remoteExtensions) {
            extensions.set(extension.identifier, extension);
        }
        const result = new ExtensionIdentifierMap();
        const localProcessExtensions = [];
        const localWebWorkerExtensions = [];
        for (const [extensionIdKey, extensionHostKind] of extensionHostKinds) {
            let runningLocation = null;
            if (extensionHostKind === 1 /* ExtensionHostKind.LocalProcess */) {
                const extensionDescription = extensions.get(extensionIdKey);
                if (extensionDescription) {
                    localProcessExtensions.push(extensionDescription);
                }
            }
            else if (extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
                const extensionDescription = extensions.get(extensionIdKey);
                if (extensionDescription) {
                    localWebWorkerExtensions.push(extensionDescription);
                }
            }
            else if (extensionHostKind === 3 /* ExtensionHostKind.Remote */) {
                runningLocation = new RemoteRunningLocation();
            }
            result.set(extensionIdKey, runningLocation);
        }
        const { affinities, maxAffinity } = this._computeAffinity(localProcessExtensions, 1 /* ExtensionHostKind.LocalProcess */, isInitialAllocation);
        for (const extension of localProcessExtensions) {
            const affinity = affinities.get(extension.identifier) || 0;
            result.set(extension.identifier, new LocalProcessRunningLocation(affinity));
        }
        const { affinities: localWebWorkerAffinities, maxAffinity: maxLocalWebWorkerAffinity } = this._computeAffinity(localWebWorkerExtensions, 2 /* ExtensionHostKind.LocalWebWorker */, isInitialAllocation);
        for (const extension of localWebWorkerExtensions) {
            const affinity = localWebWorkerAffinities.get(extension.identifier) || 0;
            result.set(extension.identifier, new LocalWebWorkerRunningLocation(affinity));
        }
        // Add extensions that already have an existing running location
        for (const [extensionIdKey, runningLocation] of existingRunningLocation) {
            if (runningLocation) {
                result.set(extensionIdKey, runningLocation);
            }
        }
        return {
            runningLocation: result,
            maxLocalProcessAffinity: maxAffinity,
            maxLocalWebWorkerAffinity: maxLocalWebWorkerAffinity,
        };
    }
    initializeRunningLocation(localExtensions, remoteExtensions) {
        const { runningLocation, maxLocalProcessAffinity, maxLocalWebWorkerAffinity } = this._doComputeRunningLocation(this._runningLocation, localExtensions, remoteExtensions, true);
        this._runningLocation = runningLocation;
        this._maxLocalProcessAffinity = maxLocalProcessAffinity;
        this._maxLocalWebWorkerAffinity = maxLocalWebWorkerAffinity;
    }
    /**
     * Returns the running locations for the removed extensions.
     */
    deltaExtensions(toAdd, toRemove) {
        // Remove old running location
        const removedRunningLocation = new ExtensionIdentifierMap();
        for (const extensionId of toRemove) {
            const extensionKey = extensionId;
            removedRunningLocation.set(extensionKey, this._runningLocation.get(extensionKey) || null);
            this._runningLocation.delete(extensionKey);
        }
        // Determine new running location
        this._updateRunningLocationForAddedExtensions(toAdd);
        return removedRunningLocation;
    }
    /**
     * Update `this._runningLocation` with running locations for newly enabled/installed extensions.
     */
    _updateRunningLocationForAddedExtensions(toAdd) {
        // Determine new running location
        const localProcessExtensions = [];
        const localWebWorkerExtensions = [];
        for (const extension of toAdd) {
            const extensionKind = this.readExtensionKinds(extension);
            const isRemote = extension.extensionLocation.scheme === Schemas.vscodeRemote;
            const extensionHostKind = this._extensionHostKindPicker.pickExtensionHostKind(extension.identifier, extensionKind, !isRemote, isRemote, 0 /* ExtensionRunningPreference.None */);
            let runningLocation = null;
            if (extensionHostKind === 1 /* ExtensionHostKind.LocalProcess */) {
                localProcessExtensions.push(extension);
            }
            else if (extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
                localWebWorkerExtensions.push(extension);
            }
            else if (extensionHostKind === 3 /* ExtensionHostKind.Remote */) {
                runningLocation = new RemoteRunningLocation();
            }
            this._runningLocation.set(extension.identifier, runningLocation);
        }
        const { affinities } = this._computeAffinity(localProcessExtensions, 1 /* ExtensionHostKind.LocalProcess */, false);
        for (const extension of localProcessExtensions) {
            const affinity = affinities.get(extension.identifier) || 0;
            this._runningLocation.set(extension.identifier, new LocalProcessRunningLocation(affinity));
        }
        const { affinities: webWorkerExtensionsAffinities } = this._computeAffinity(localWebWorkerExtensions, 2 /* ExtensionHostKind.LocalWebWorker */, false);
        for (const extension of localWebWorkerExtensions) {
            const affinity = webWorkerExtensionsAffinities.get(extension.identifier) || 0;
            this._runningLocation.set(extension.identifier, new LocalWebWorkerRunningLocation(affinity));
        }
    }
};
ExtensionRunningLocationTracker = __decorate([
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IConfigurationService),
    __param(4, ILogService),
    __param(5, IExtensionManifestPropertiesService)
], ExtensionRunningLocationTracker);
export { ExtensionRunningLocationTracker };
export function filterExtensionDescriptions(extensions, runningLocation, predicate) {
    return extensions.filter((ext) => {
        const extRunningLocation = runningLocation.get(ext.identifier);
        return extRunningLocation && predicate(extRunningLocation);
    });
}
export function filterExtensionIdentifiers(extensions, runningLocation, predicate) {
    return extensions.filter((ext) => {
        const extRunningLocation = runningLocation.get(ext);
        return extRunningLocation && predicate(extRunningLocation);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUnVubmluZ0xvY2F0aW9uVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25SdW5uaW5nTG9jYXRpb25UcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUVsRyxPQUFPLEVBRU4sc0JBQXNCLEdBRXRCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTdGLE9BQU8sRUFJTiwyQkFBMkIsR0FDM0IsTUFBTSx3QkFBd0IsQ0FBQTtBQUUvQixPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RixPQUFPLEVBRU4sMkJBQTJCLEVBQzNCLDZCQUE2QixFQUM3QixxQkFBcUIsR0FDckIsTUFBTSwrQkFBK0IsQ0FBQTtBQUUvQixJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUErQjtJQUszQyxJQUFXLHVCQUF1QjtRQUNqQyxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBVyx5QkFBeUI7UUFDbkMsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUE7SUFDdkMsQ0FBQztJQUVELFlBQ2tCLFNBQWdELEVBQ2hELHdCQUFrRCxFQUVuRSxtQkFBa0UsRUFDM0MscUJBQTZELEVBQ3ZFLFdBQXlDLEVBRXRELG1DQUF5RjtRQVB4RSxjQUFTLEdBQVQsU0FBUyxD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