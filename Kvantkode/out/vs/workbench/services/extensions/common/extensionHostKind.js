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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdEtpbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25Ib3N0S2luZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsTUFBTSxDQUFOLElBQWtCLGlCQUlqQjtBQUpELFdBQWtCLGlCQUFpQjtJQUNsQyx5RUFBZ0IsQ0FBQTtJQUNoQiw2RUFBa0IsQ0FBQTtJQUNsQiw2REFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUppQixpQkFBaUIsS0FBakIsaUJBQWlCLFFBSWxDO0FBRUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLElBQThCO0lBQ3ZFLElBQUksSUFBSSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ25CLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUNELFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZDtZQUNDLE9BQU8sY0FBYyxDQUFBO1FBQ3RCO1lBQ0MsT0FBTyxnQkFBZ0IsQ0FBQTtRQUN4QjtZQUNDLE9BQU8sUUFBUSxDQUFBO0lBQ2pCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLDBCQUlqQjtBQUpELFdBQWtCLDBCQUEwQjtJQUMzQywyRUFBSSxDQUFBO0lBQ0osNkVBQUssQ0FBQTtJQUNMLCtFQUFNLENBQUE7QUFDUCxDQUFDLEVBSmlCLDBCQUEwQixLQUExQiwwQkFBMEIsUUFJM0M7QUFFRCxNQUFNLFVBQVUsa0NBQWtDLENBQUMsVUFBc0M7SUFDeEYsUUFBUSxVQUFVLEVBQUUsQ0FBQztRQUNwQjtZQUNDLE9BQU8sTUFBTSxDQUFBO1FBQ2Q7WUFDQyxPQUFPLE9BQU8sQ0FBQTtR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