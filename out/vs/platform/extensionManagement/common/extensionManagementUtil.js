/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareIgnoreCase } from '../../../base/common/strings.js';
import { getTargetPlatform, } from './extensionManagement.js';
import { ExtensionIdentifier, UNDEFINED_PUBLISHER, } from '../../extensions/common/extensions.js';
import { isLinux, platform } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { arch } from '../../../base/common/process.js';
import { TelemetryTrustedValue } from '../../telemetry/common/telemetryUtils.js';
import { isString } from '../../../base/common/types.js';
export function areSameExtensions(a, b) {
    if (a.uuid && b.uuid) {
        return a.uuid === b.uuid;
    }
    if (a.id === b.id) {
        return true;
    }
    return compareIgnoreCase(a.id, b.id) === 0;
}
const ExtensionKeyRegex = /^([^.]+\..+)-(\d+\.\d+\.\d+)(-(.+))?$/;
export class ExtensionKey {
    static create(extension) {
        const version = extension.manifest
            ? extension.manifest.version
            : extension.version;
        const targetPlatform = extension.manifest
            ? extension.targetPlatform
            : extension.properties.targetPlatform;
        return new ExtensionKey(extension.identifier, version, targetPlatform);
    }
    static parse(key) {
        const matches = ExtensionKeyRegex.exec(key);
        return matches && matches[1] && matches[2]
            ? new ExtensionKey({ id: matches[1] }, matches[2], matches[4] || undefined)
            : null;
    }
    constructor(identifier, version, targetPlatform = "undefined" /* TargetPlatform.UNDEFINED */) {
        this.identifier = identifier;
        this.version = version;
        this.targetPlatform = targetPlatform;
        this.id = identifier.id;
    }
    toString() {
        return `${this.id}-${this.version}${this.targetPlatform !== "undefined" /* TargetPlatform.UNDEFINED */ ? `-${this.targetPlatform}` : ''}`;
    }
    equals(o) {
        if (!(o instanceof ExtensionKey)) {
            return false;
        }
        return (areSameExtensions(this, o) &&
            this.version === o.version &&
            this.targetPlatform === o.targetPlatform);
    }
}
const EXTENSION_IDENTIFIER_WITH_VERSION_REGEX = /^([^.]+\..+)@((prerelease)|(\d+\.\d+\.\d+(-.*)?))$/;
export function getIdAndVersion(id) {
    const matches = EXTENSION_IDENTIFIER_WITH_VERSION_REGEX.exec(id);
    if (matches && matches[1]) {
        return [adoptToGalleryExtensionId(matches[1]), matches[2]];
    }
    return [adoptToGalleryExtensionId(id), undefined];
}
export function getExtensionId(publisher, name) {
    return `${publisher}.${name}`;
}
export function adoptToGalleryExtensionId(id) {
    return id.toLowerCase();
}
export function getGalleryExtensionId(publisher, name) {
    return adoptToGalleryExtensionId(getExtensionId(publisher ?? UNDEFINED_PUBLISHER, name));
}
export function groupByExtension(extensions, getExtensionIdentifier) {
    const byExtension = [];
    const findGroup = (extension) => {
        for (const group of byExtension) {
            if (group.some((e) => areSameExtensions(getExtensionIdentifier(e), getExtensionIdentifier(extension)))) {
                return group;
            }
        }
        return null;
    };
    for (const extension of extensions) {
        const group = findGroup(extension);
        if (group) {
            group.push(extension);
        }
        else {
            byExtension.push([extension]);
        }
    }
    return byExtension;
}
export function getLocalExtensionTelemetryData(extension) {
    return {
        id: extension.identifier.id,
        name: extension.manifest.name,
        galleryId: null,
        publisherId: extension.publisherId,
        publisherName: extension.manifest.publisher,
        publisherDisplayName: extension.publisherDisplayName,
        dependencies: extension.manifest.extensionDependencies &&
            extension.manifest.extensionDependencies.length > 0,
    };
}
/* __GDPR__FRAGMENT__
    "GalleryExtensionTelemetryData" : {
        "id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "name": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "extensionVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "galleryId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "publisherId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "publisherName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "publisherDisplayName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "isPreReleaseVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "dependencies": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
        "isSigned": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
        "${include}": [
            "${GalleryExtensionTelemetryData2}"
        ]
    }
*/
export function getGalleryExtensionTelemetryData(extension) {
    return {
        id: new TelemetryTrustedValue(extension.identifier.id),
        name: new TelemetryTrustedValue(extension.name),
        extensionVersion: extension.version,
        galleryId: extension.identifier.uuid,
        publisherId: extension.publisherId,
        publisherName: extension.publisher,
        publisherDisplayName: extension.publisherDisplayName,
        isPreReleaseVersion: extension.properties.isPreReleaseVersion,
        dependencies: !!(extension.properties.dependencies && extension.properties.dependencies.length > 0),
        isSigned: extension.isSigned,
        ...extension.telemetryData,
    };
}
export const BetterMergeId = new ExtensionIdentifier('pprice.better-merge');
export function getExtensionDependencies(installedExtensions, extension) {
    const dependencies = [];
    const extensions = extension.manifest.extensionDependencies?.slice(0) ?? [];
    while (extensions.length) {
        const id = extensions.shift();
        if (id && dependencies.every((e) => !areSameExtensions(e.identifier, { id }))) {
            const ext = installedExtensions.filter((e) => areSameExtensions(e.identifier, { id }));
            if (ext.length === 1) {
                dependencies.push(ext[0]);
                extensions.push(...(ext[0].manifest.extensionDependencies?.slice(0) ?? []));
            }
        }
    }
    return dependencies;
}
async function isAlpineLinux(fileService, logService) {
    if (!isLinux) {
        return false;
    }
    let content;
    try {
        const fileContent = await fileService.readFile(URI.file('/etc/os-release'));
        content = fileContent.value.toString();
    }
    catch (error) {
        try {
            const fileContent = await fileService.readFile(URI.file('/usr/lib/os-release'));
            content = fileContent.value.toString();
        }
        catch (error) {
            /* Ignore */
            logService.debug(`Error while getting the os-release file.`, getErrorMessage(error));
        }
    }
    return !!content && (content.match(/^ID=([^\u001b\r\n]*)/m) || [])[1] === 'alpine';
}
export async function computeTargetPlatform(fileService, logService) {
    const alpineLinux = await isAlpineLinux(fileService, logService);
    const targetPlatform = getTargetPlatform(alpineLinux ? 'alpine' : platform, arch);
    logService.debug('ComputeTargetPlatform:', targetPlatform);
    return targetPlatform;
}
export function isMalicious(identifier, malicious) {
    return malicious.some((publisherOrIdentifier) => {
        if (isString(publisherOrIdentifier)) {
            return compareIgnoreCase(identifier.id.split('.')[0], publisherOrIdentifier) === 0;
        }
        return areSameExtensions(identifier, publisherOrIdentifier);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50VXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNuRSxPQUFPLEVBSU4saUJBQWlCLEdBQ2pCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLG1CQUFtQixFQUduQixtQkFBbUIsR0FDbkIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV4RCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsQ0FBdUIsRUFBRSxDQUF1QjtJQUNqRixJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3RCLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFBO0lBQ3pCLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ25CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNE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