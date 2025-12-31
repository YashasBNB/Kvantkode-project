/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
export var ExtensionHostKind;
(function (ExtensionHostKind) {
    ExtensionHostKind[ExtensionHostKind["LocalProcess"] = 1] = "LocalProcess";
    ExtensionHostKind[ExtensionHostKind["LocalWebWorker"] = 2] = "LocalWebWorker";
    ExtensionHostKind[ExtensionHostKind["Remote"] = 3] = "Remote";
})(ExtensionHostKind || (ExtensionHostKind = {}));
export function extensionHostKindToString(kind) {
    if (kind === null) {
        return 'None';
    }
    switch (kind) {
        case 1 /* ExtensionHostKind.LocalProcess */:
            return 'LocalProcess';
        case 2 /* ExtensionHostKind.LocalWebWorker */:
            return 'LocalWebWorker';
        case 3 /* ExtensionHostKind.Remote */:
            return 'Remote';
    }
}
export var ExtensionRunningPreference;
(function (ExtensionRunningPreference) {
    ExtensionRunningPreference[ExtensionRunningPreference["None"] = 0] = "None";
    ExtensionRunningPreference[ExtensionRunningPreference["Local"] = 1] = "Local";
    ExtensionRunningPreference[ExtensionRunningPreference["Remote"] = 2] = "Remote";
})(ExtensionRunningPreference || (ExtensionRunningPreference = {}));
export function extensionRunningPreferenceToString(preference) {
    switch (preference) {
        case 0 /* ExtensionRunningPreference.None */:
            return 'None';
        case 1 /* ExtensionRunningPreference.Local */:
            return 'Local';
        case 2 /* ExtensionRunningPreference.Remote */:
            return 'Remote';
    }
}
export function determineExtensionHostKinds(_localExtensions, _remoteExtensions, getExtensionKind, pickExtensionHostKind) {
    const localExtensions = toExtensionWithKind(_localExtensions, getExtensionKind);
    const remoteExtensions = toExtensionWithKind(_remoteExtensions, getExtensionKind);
    const allExtensions = new Map();
    const collectExtension = (ext) => {
        if (allExtensions.has(ext.key)) {
            return;
        }
        const local = localExtensions.get(ext.key) || null;
        const remote = remoteExtensions.get(ext.key) || null;
        const info = new ExtensionInfo(local, remote);
        allExtensions.set(info.key, info);
    };
    localExtensions.forEach((ext) => collectExtension(ext));
    remoteExtensions.forEach((ext) => collectExtension(ext));
    const extensionHostKinds = new Map();
    allExtensions.forEach((ext) => {
        const isInstalledLocally = Boolean(ext.local);
        const isInstalledRemotely = Boolean(ext.remote);
        const isLocallyUnderDevelopment = Boolean(ext.local && ext.local.isUnderDevelopment);
        const isRemotelyUnderDevelopment = Boolean(ext.remote && ext.remote.isUnderDevelopment);
        let preference = 0 /* ExtensionRunningPreference.None */;
        if (isLocallyUnderDevelopment && !isRemotelyUnderDevelopment) {
            preference = 1 /* ExtensionRunningPreference.Local */;
        }
        else if (isRemotelyUnderDevelopment && !isLocallyUnderDevelopment) {
            preference = 2 /* ExtensionRunningPreference.Remote */;
        }
        extensionHostKinds.set(ext.key, pickExtensionHostKind(ext.identifier, ext.kind, isInstalledLocally, isInstalledRemotely, preference));
    });
    return extensionHostKinds;
}
function toExtensionWithKind(extensions, getExtensionKind) {
    const result = new Map();
    extensions.forEach((desc) => {
        const ext = new ExtensionWithKind(desc, getExtensionKind(desc));
        result.set(ext.key, ext);
    });
    return result;
}
class ExtensionWithKind {
    constructor(desc, kind) {
        this.desc = desc;
        this.kind = kind;
    }
    get key() {
        return ExtensionIdentifier.toKey(this.desc.identifier);
    }
    get isUnderDevelopment() {
        return this.desc.isUnderDevelopment;
    }
}
class ExtensionInfo {
    constructor(local, remote) {
        this.local = local;
        this.remote = remote;
    }
    get key() {
        if (this.local) {
            return this.local.key;
        }
        return this.remote.key;
    }
    get identifier() {
        if (this.local) {
            return this.local.desc.identifier;
        }
        return this.remote.desc.identifier;
    }
    get kind() {
        // in case of disagreements between extension kinds, it is always
        // better to pick the local extension because it has a much higher
        // chance of being up-to-date
        if (this.local) {
            return this.local.kind;
        }
        return this.remote.kind;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdEtpbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uSG9zdEtpbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE1BQU0sQ0FBTixJQUFrQixpQkFJakI7QUFKRCxXQUFrQixpQkFBaUI7SUFDbEMseUVBQWdCLENBQUE7SUFDaEIsNkVBQWtCLENBQUE7SUFDbEIsNkRBQVUsQ0FBQTtBQUNYLENBQUMsRUFKaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUlsQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxJQUE4QjtJQUN2RSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUNuQixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFDRCxRQUFRLElBQUksRUFBRSxDQUFDO1FBQ2Q7WUFDQyxPQUFPLGNBQWMsQ0FBQTtRQUN0QjtZQUNDLE9BQU8sZ0JBQWdCLENBQUE7UUFDeEI7WUFDQyxPQUFPLFFBQVEsQ0FBQTtJQUNqQixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFrQiwwQkFJakI7QUFKRCxXQUFrQiwwQkFBMEI7SUFDM0MsMkVBQUksQ0FBQTtJQUNKLDZFQUFLLENBQUE7SUFDTCwrRUFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUppQiwwQkFBMEIsS0FBMUIsMEJBQTBCLFFBSTNDO0FBRUQsTUFBTSxVQUFVLGtDQUFrQyxDQUFDLFVBQXNDO0lBQ3hGLFFBQVEsVUFBVSxFQUFFLENBQUM7UUFDcEI7WUFDQyxPQUFPLE1BQU0sQ0FBQTtRQUNkO1lBQ0MsT0FBTyxPQUFPLENBQUE7UUFDZjtZQUNDLE9BQU8sUUFBUSxDQUFB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