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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFV0aWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnRVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sRUFJTixpQkFBaUIsR0FDakIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQ04sbUJBQW1CLEVBR25CLG1CQUFtQixHQUNuQixNQUFNLHVDQUF1QyxDQUFBO0FBRTlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXhELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxDQUF1QixFQUFFLENBQXVCO0lBQ2pGLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEIsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUE7SUFDekIsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFD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