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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUnVubmluZ0xvY2F0aW9uVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvblJ1bm5pbmdMb2NhdGlvblRyYWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFFTixzQkFBc0IsR0FFdEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFN0YsT0FBTyxFQUlOLDJCQUEyQixHQUMzQixNQUFNLHdCQUF3QixDQUFBO0FBRS9CLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdGLE9BQU8sRUFFTiwyQkFBMkIsRUFDM0IsNkJBQTZCLEVBQzdCLHFCQUFxQixHQUNyQixNQUFNLCtCQUErQixDQUFBO0FBRS9CLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQStCO0lBSzNDLElBQVcsdUJBQXVCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFBO0lBQ3JDLENBQUM7SUFFRCxJQUFXLHlCQUF5QjtRQUNuQyxPQUFPLElBQUksQ0FBQywwQkFBMEIsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsWUFDa0IsU0FBZ0QsRUFDaEQsd0JBQWtELEVBRW5FLG1CQUFrRSxFQUMzQyxxQkFBNkQsRUFDdkUsV0FBeUMsRUFFdEQsbUNBQXlGO1FBUHhFLGNBQVMsR0FBVCxT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