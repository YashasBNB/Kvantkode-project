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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQ04sY0FBYyxFQUNkLHFCQUFxQixHQUNyQixNQUFNLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3RILE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEVBQ3RCLHNCQUFzQixHQU10QixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQVU1RixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUF3QjtJQUM1RSxVQUFVLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQywwQkFBMEIsQ0FBQztJQUMvRCxJQUFJLEVBQUUsNEJBQTRCO0lBQ2xDLE9BQU8sRUFBRSxPQUFPO0lBQ2hCLFNBQVMsRUFBRSxRQUFRO0lBQ25CLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7SUFDdkIsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7SUFDN0MsU0FBUyxFQUFFLEtBQUs7SUFDaEIsY0FBYyw0Q0FBMEI7SUFDeEMsYUFBYSxFQUFFLEtBQUs7SUFDcEIsa0JBQWtCLEVBQUUsS0FBSztJQUN6QixVQUFVLEVBQUUsS0FBSztDQUNqQixDQUFDLENBQUE7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