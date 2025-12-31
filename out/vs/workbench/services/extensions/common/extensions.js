/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { getExtensionId, getGalleryExtensionId, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ImplicitActivationEvents } from '../../../../platform/extensionManagement/common/implicitActivationEvents.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet, } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const nullExtensionDescription = Object.freeze({
    identifier: new ExtensionIdentifier('nullExtensionDescription'),
    name: 'Null Extension Description',
    version: '0.0.0',
    publisher: 'vscode',
    engines: { vscode: '' },
    extensionLocation: URI.parse('void:location'),
    isBuiltin: false,
    targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
    isUserBuiltin: false,
    isUnderDevelopment: false,
    preRelease: false,
});
export const webWorkerExtHostConfig = 'extensions.webWorker';
export const IExtensionService = createDecorator('extensionService');
export class MissingExtensionDependency {
    constructor(dependency) {
        this.dependency = dependency;
    }
}
export var ExtensionHostStartup;
(function (ExtensionHostStartup) {
    /**
     * The extension host should be launched immediately and doesn't require a `$startExtensionHost` call.
     */
    ExtensionHostStartup[ExtensionHostStartup["EagerAutoStart"] = 1] = "EagerAutoStart";
    /**
     * The extension host should be launched immediately and needs a `$startExtensionHost` call.
     */
    ExtensionHostStartup[ExtensionHostStartup["EagerManualStart"] = 2] = "EagerManualStart";
    /**
     * The extension host should be launched lazily and only when it has extensions it needs to host. It needs a `$startExtensionHost` call.
     */
    ExtensionHostStartup[ExtensionHostStartup["Lazy"] = 3] = "Lazy";
})(ExtensionHostStartup || (ExtensionHostStartup = {}));
export class ExtensionHostExtensions {
    get versionId() {
        return this._versionId;
    }
    get allExtensions() {
        return this._allExtensions;
    }
    get myExtensions() {
        return this._myExtensions;
    }
    constructor(versionId, allExtensions, myExtensions) {
        this._versionId = versionId;
        this._allExtensions = allExtensions.slice(0);
        this._myExtensions = myExtensions.slice(0);
        this._myActivationEvents = null;
    }
    toSnapshot() {
        return {
            versionId: this._versionId,
            allExtensions: this._allExtensions,
            myExtensions: this._myExtensions,
            activationEvents: ImplicitActivationEvents.createActivationEventsMap(this._allExtensions),
        };
    }
    set(versionId, allExtensions, myExtensions) {
        if (this._versionId > versionId) {
            throw new Error(`ExtensionHostExtensions: invalid versionId ${versionId} (current: ${this._versionId})`);
        }
        const toRemove = [];
        const toAdd = [];
        const myToRemove = [];
        const myToAdd = [];
        const oldExtensionsMap = extensionDescriptionArrayToMap(this._allExtensions);
        const newExtensionsMap = extensionDescriptionArrayToMap(allExtensions);
        const extensionsAreTheSame = (a, b) => {
            return (a.extensionLocation.toString() === b.extensionLocation.toString() ||
                a.isBuiltin === b.isBuiltin ||
                a.isUserBuiltin === b.isUserBuiltin ||
                a.isUnderDevelopment === b.isUnderDevelopment);
        };
        for (const oldExtension of this._allExtensions) {
            const newExtension = newExtensionsMap.get(oldExtension.identifier);
            if (!newExtension) {
                toRemove.push(oldExtension.identifier);
                oldExtensionsMap.delete(oldExtension.identifier);
                continue;
            }
            if (!extensionsAreTheSame(oldExtension, newExtension)) {
                // The new extension is different than the old one
                // (e.g. maybe it executes in a different location)
                toRemove.push(oldExtension.identifier);
                oldExtensionsMap.delete(oldExtension.identifier);
                continue;
            }
        }
        for (const newExtension of allExtensions) {
            const oldExtension = oldExtensionsMap.get(newExtension.identifier);
            if (!oldExtension) {
                toAdd.push(newExtension);
                continue;
            }
            if (!extensionsAreTheSame(oldExtension, newExtension)) {
                // The new extension is different than the old one
                // (e.g. maybe it executes in a different location)
                toRemove.push(oldExtension.identifier);
                oldExtensionsMap.delete(oldExtension.identifier);
                continue;
            }
        }
        const myOldExtensionsSet = new ExtensionIdentifierSet(this._myExtensions);
        const myNewExtensionsSet = new ExtensionIdentifierSet(myExtensions);
        for (const oldExtensionId of this._myExtensions) {
            if (!myNewExtensionsSet.has(oldExtensionId)) {
                myToRemove.push(oldExtensionId);
            }
        }
        for (const newExtensionId of myExtensions) {
            if (!myOldExtensionsSet.has(newExtensionId)) {
                myToAdd.push(newExtensionId);
            }
        }
        const addActivationEvents = ImplicitActivationEvents.createActivationEventsMap(toAdd);
        const delta = { versionId, toRemove, toAdd, addActivationEvents, myToRemove, myToAdd };
        this.delta(delta);
        return delta;
    }
    delta(extensionsDelta) {
        if (this._versionId >= extensionsDelta.versionId) {
            // ignore older deltas
            return null;
        }
        const { toRemove, toAdd, myToRemove, myToAdd } = extensionsDelta;
        // First handle removals
        const toRemoveSet = new ExtensionIdentifierSet(toRemove);
        const myToRemoveSet = new ExtensionIdentifierSet(myToRemove);
        for (let i = 0; i < this._allExtensions.length; i++) {
            if (toRemoveSet.has(this._allExtensions[i].identifier)) {
                this._allExtensions.splice(i, 1);
                i--;
            }
        }
        for (let i = 0; i < this._myExtensions.length; i++) {
            if (myToRemoveSet.has(this._myExtensions[i])) {
                this._myExtensions.splice(i, 1);
                i--;
            }
        }
        // Then handle additions
        for (const extension of toAdd) {
            this._allExtensions.push(extension);
        }
        for (const extensionId of myToAdd) {
            this._myExtensions.push(extensionId);
        }
        // clear cached activation events
        this._myActivationEvents = null;
        return extensionsDelta;
    }
    containsExtension(extensionId) {
        for (const myExtensionId of this._myExtensions) {
            if (ExtensionIdentifier.equals(myExtensionId, extensionId)) {
                return true;
            }
        }
        return false;
    }
    containsActivationEvent(activationEvent) {
        if (!this._myActivationEvents) {
            this._myActivationEvents = this._readMyActivationEvents();
        }
        return this._myActivationEvents.has(activationEvent);
    }
    _readMyActivationEvents() {
        const result = new Set();
        for (const extensionDescription of this._allExtensions) {
            if (!this.containsExtension(extensionDescription.identifier)) {
                continue;
            }
            const activationEvents = ImplicitActivationEvents.readActivationEvents(extensionDescription);
            for (const activationEvent of activationEvents) {
                result.add(activationEvent);
            }
        }
        return result;
    }
}
function extensionDescriptionArrayToMap(extensions) {
    const result = new ExtensionIdentifierMap();
    for (const extension of extensions) {
        result.set(extension.identifier, extension);
    }
    return result;
}
export function isProposedApiEnabled(extension, proposal) {
    if (!extension.enabledApiProposals) {
        return false;
    }
    return extension.enabledApiProposals.includes(proposal);
}
export function checkProposedApiEnabled(extension, proposal) {
    if (!isProposedApiEnabled(extension, proposal)) {
        throw new Error(`Extension '${extension.identifier.value}' CANNOT use API proposal: ${proposal}.\nIts package.json#enabledApiProposals-property declares: ${extension.enabledApiProposals?.join(', ') ?? '[]'} but NOT ${proposal}.\n The missing proposal MUST be added and you must start in extension development mode or use the following command line switch: --enable-proposed-api ${extension.identifier.value}`);
    }
}
export class ActivationTimes {
    constructor(codeLoadingTime, activateCallTime, activateResolvedTime, activationReason) {
        this.codeLoadingTime = codeLoadingTime;
        this.activateCallTime = activateCallTime;
        this.activateResolvedTime = activateResolvedTime;
        this.activationReason = activationReason;
    }
}
export class ExtensionPointContribution {
    constructor(description, value) {
        this.description = description;
        this.value = value;
    }
}
export var ActivationKind;
(function (ActivationKind) {
    ActivationKind[ActivationKind["Normal"] = 0] = "Normal";
    ActivationKind[ActivationKind["Immediate"] = 1] = "Immediate";
})(ActivationKind || (ActivationKind = {}));
export function toExtension(extensionDescription) {
    return {
        type: extensionDescription.isBuiltin ? 0 /* ExtensionType.System */ : 1 /* ExtensionType.User */,
        isBuiltin: extensionDescription.isBuiltin || extensionDescription.isUserBuiltin,
        identifier: {
            id: getGalleryExtensionId(extensionDescription.publisher, extensionDescription.name),
            uuid: extensionDescription.uuid,
        },
        manifest: extensionDescription,
        location: extensionDescription.extensionLocation,
        targetPlatform: extensionDescription.targetPlatform,
        validations: [],
        isValid: true,
        preRelease: extensionDescription.preRelease,
        publisherDisplayName: extensionDescription.publisherDisplayName,
    };
}
export function toExtensionDescription(extension, isUnderDevelopment) {
    const id = getExtensionId(extension.manifest.publisher, extension.manifest.name);
    return {
        id,
        identifier: new ExtensionIdentifier(id),
        isBuiltin: extension.type === 0 /* ExtensionType.System */,
        isUserBuiltin: extension.type === 1 /* ExtensionType.User */ && extension.isBuiltin,
        isUnderDevelopment: !!isUnderDevelopment,
        extensionLocation: extension.location,
        uuid: extension.identifier.uuid,
        targetPlatform: extension.targetPlatform,
        publisherDisplayName: extension.publisherDisplayName,
        preRelease: extension.preRelease,
        ...extension.manifest,
    };
}
export class NullExtensionService {
    constructor() {
        this.onDidRegisterExtensions = Event.None;
        this.onDidChangeExtensionsStatus = Event.None;
        this.onDidChangeExtensions = Event.None;
        this.onWillActivateByEvent = Event.None;
        this.onDidChangeResponsiveChange = Event.None;
        this.onWillStop = Event.None;
        this.extensions = [];
    }
    activateByEvent(_activationEvent) {
        return Promise.resolve(undefined);
    }
    activateById(extensionId, reason) {
        return Promise.resolve(undefined);
    }
    activationEventIsDone(_activationEvent) {
        return false;
    }
    whenInstalledExtensionsRegistered() {
        return Promise.resolve(true);
    }
    getExtension() {
        return Promise.resolve(undefined);
    }
    readExtensionPointContributions(_extPoint) {
        return Promise.resolve(Object.create(null));
    }
    getExtensionsStatus() {
        return Object.create(null);
    }
    getInspectPorts(_extensionHostKind, _tryEnableInspector) {
        return Promise.resolve([]);
    }
    async stopExtensionHosts() {
        return true;
    }
    async startExtensionHosts() { }
    async setRemoteEnvironment(_env) { }
    canAddExtension() {
        return false;
    }
    canRemoveExtension() {
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUNOLGNBQWMsRUFDZCxxQkFBcUIsR0FDckIsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUN0SCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixzQkFBc0IsR0FNdEIsTUFBTSxzREFBc0QsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFVNUYsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBd0I7SUFDNUUsVUFBVSxFQUFFLElBQUksbUJBQW1CLENBQUMsMEJBQTBCLENBQUM7SUFDL0QsSUFBSSxFQUFFLDRCQUE0QjtJQUNsQyxPQUFPLEVBQUUsT0FBTztJQUNoQixTQUFTLEVBQUUsUUFBUTtJQUNuQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO0lBQ3ZCLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDO0lBQzdDLFNBQVMsRUFBRSxLQUFLO0lBQ2hCLGNBQWMsNENBQTBCO0lBQ3hDLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsVUFBVSxFQUFFLEtBQUs7Q0FDakIsQ0FBQyxDQUFBO0FBR0YsTUFBTSxDQUFDLE1BQU0sc0JB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