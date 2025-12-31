/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const EXTENSION_IDENTIFIER_PATTERN = '^([a-z0-9A-Z][a-z0-9-A-Z]*)\\.([a-z0-9A-Z][a-z0-9-A-Z]*)$';
export const EXTENSION_IDENTIFIER_REGEX = new RegExp(EXTENSION_IDENTIFIER_PATTERN);
export const WEB_EXTENSION_TAG = '__web_extension';
export const EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT = 'skipWalkthrough';
export const EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT = 'skipPublisherTrust';
export const EXTENSION_INSTALL_SOURCE_CONTEXT = 'extensionInstallSource';
export const EXTENSION_INSTALL_DEP_PACK_CONTEXT = 'dependecyOrPackExtensionInstall';
export const EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT = 'clientTargetPlatform';
export var ExtensionInstallSource;
(function (ExtensionInstallSource) {
    ExtensionInstallSource["COMMAND"] = "command";
    ExtensionInstallSource["SETTINGS_SYNC"] = "settingsSync";
})(ExtensionInstallSource || (ExtensionInstallSource = {}));
export function TargetPlatformToString(targetPlatform) {
    switch (targetPlatform) {
        case "win32-x64" /* TargetPlatform.WIN32_X64 */:
            return 'Windows 64 bit';
        case "win32-arm64" /* TargetPlatform.WIN32_ARM64 */:
            return 'Windows ARM';
        case "linux-x64" /* TargetPlatform.LINUX_X64 */:
            return 'Linux 64 bit';
        case "linux-arm64" /* TargetPlatform.LINUX_ARM64 */:
            return 'Linux ARM 64';
        case "linux-armhf" /* TargetPlatform.LINUX_ARMHF */:
            return 'Linux ARM';
        case "alpine-x64" /* TargetPlatform.ALPINE_X64 */:
            return 'Alpine Linux 64 bit';
        case "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */:
            return 'Alpine ARM 64';
        case "darwin-x64" /* TargetPlatform.DARWIN_X64 */:
            return 'Mac';
        case "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */:
            return 'Mac Silicon';
        case "web" /* TargetPlatform.WEB */:
            return 'Web';
        case "universal" /* TargetPlatform.UNIVERSAL */:
            return "universal" /* TargetPlatform.UNIVERSAL */;
        case "unknown" /* TargetPlatform.UNKNOWN */:
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case "undefined" /* TargetPlatform.UNDEFINED */:
            return "undefined" /* TargetPlatform.UNDEFINED */;
    }
}
export function toTargetPlatform(targetPlatform) {
    switch (targetPlatform) {
        case "win32-x64" /* TargetPlatform.WIN32_X64 */:
            return "win32-x64" /* TargetPlatform.WIN32_X64 */;
        case "win32-arm64" /* TargetPlatform.WIN32_ARM64 */:
            return "win32-arm64" /* TargetPlatform.WIN32_ARM64 */;
        case "linux-x64" /* TargetPlatform.LINUX_X64 */:
            return "linux-x64" /* TargetPlatform.LINUX_X64 */;
        case "linux-arm64" /* TargetPlatform.LINUX_ARM64 */:
            return "linux-arm64" /* TargetPlatform.LINUX_ARM64 */;
        case "linux-armhf" /* TargetPlatform.LINUX_ARMHF */:
            return "linux-armhf" /* TargetPlatform.LINUX_ARMHF */;
        case "alpine-x64" /* TargetPlatform.ALPINE_X64 */:
            return "alpine-x64" /* TargetPlatform.ALPINE_X64 */;
        case "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */:
            return "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */;
        case "darwin-x64" /* TargetPlatform.DARWIN_X64 */:
            return "darwin-x64" /* TargetPlatform.DARWIN_X64 */;
        case "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */:
            return "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */;
        case "web" /* TargetPlatform.WEB */:
            return "web" /* TargetPlatform.WEB */;
        case "universal" /* TargetPlatform.UNIVERSAL */:
            return "universal" /* TargetPlatform.UNIVERSAL */;
        default:
            return "unknown" /* TargetPlatform.UNKNOWN */;
    }
}
export function getTargetPlatform(platform, arch) {
    switch (platform) {
        case 3 /* Platform.Windows */:
            if (arch === 'x64') {
                return "win32-x64" /* TargetPlatform.WIN32_X64 */;
            }
            if (arch === 'arm64') {
                return "win32-arm64" /* TargetPlatform.WIN32_ARM64 */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 2 /* Platform.Linux */:
            if (arch === 'x64') {
                return "linux-x64" /* TargetPlatform.LINUX_X64 */;
            }
            if (arch === 'arm64') {
                return "linux-arm64" /* TargetPlatform.LINUX_ARM64 */;
            }
            if (arch === 'arm') {
                return "linux-armhf" /* TargetPlatform.LINUX_ARMHF */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 'alpine':
            if (arch === 'x64') {
                return "alpine-x64" /* TargetPlatform.ALPINE_X64 */;
            }
            if (arch === 'arm64') {
                return "alpine-arm64" /* TargetPlatform.ALPINE_ARM64 */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 1 /* Platform.Mac */:
            if (arch === 'x64') {
                return "darwin-x64" /* TargetPlatform.DARWIN_X64 */;
            }
            if (arch === 'arm64') {
                return "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */;
            }
            return "unknown" /* TargetPlatform.UNKNOWN */;
        case 0 /* Platform.Web */:
            return "web" /* TargetPlatform.WEB */;
    }
}
export function isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, productTargetPlatform) {
    // Not a web extension in web target platform
    return (productTargetPlatform === "web" /* TargetPlatform.WEB */ && !allTargetPlatforms.includes("web" /* TargetPlatform.WEB */));
}
export function isTargetPlatformCompatible(extensionTargetPlatform, allTargetPlatforms, productTargetPlatform) {
    // Not compatible when extension is not a web extension in web target platform
    if (isNotWebExtensionInWebTargetPlatform(allTargetPlatforms, productTargetPlatform)) {
        return false;
    }
    // Compatible when extension target platform is not defined
    if (extensionTargetPlatform === "undefined" /* TargetPlatform.UNDEFINED */) {
        return true;
    }
    // Compatible when extension target platform is universal
    if (extensionTargetPlatform === "universal" /* TargetPlatform.UNIVERSAL */) {
        return true;
    }
    // Not compatible when extension target platform is unknown
    if (extensionTargetPlatform === "unknown" /* TargetPlatform.UNKNOWN */) {
        return false;
    }
    // Compatible when extension and product target platforms matches
    if (extensionTargetPlatform === productTargetPlatform) {
        return true;
    }
    return false;
}
export function isIExtensionIdentifier(thing) {
    return (thing &&
        typeof thing === 'object' &&
        typeof thing.id === 'string' &&
        (!thing.uuid || typeof thing.uuid === 'string'));
}
export var SortBy;
(function (SortBy) {
    SortBy["NoneOrRelevance"] = "NoneOrRelevance";
    SortBy["LastUpdatedDate"] = "LastUpdatedDate";
    SortBy["Title"] = "Title";
    SortBy["PublisherName"] = "PublisherName";
    SortBy["InstallCount"] = "InstallCount";
    SortBy["PublishedDate"] = "PublishedDate";
    SortBy["AverageRating"] = "AverageRating";
    SortBy["WeightedRating"] = "WeightedRating";
})(SortBy || (SortBy = {}));
export var SortOrder;
(function (SortOrder) {
    SortOrder[SortOrder["Default"] = 0] = "Default";
    SortOrder[SortOrder["Ascending"] = 1] = "Ascending";
    SortOrder[SortOrder["Descending"] = 2] = "Descending";
})(SortOrder || (SortOrder = {}));
export var FilterType;
(function (FilterType) {
    FilterType["Category"] = "Category";
    FilterType["ExtensionId"] = "ExtensionId";
    FilterType["ExtensionName"] = "ExtensionName";
    FilterType["ExcludeWithFlags"] = "ExcludeWithFlags";
    FilterType["Featured"] = "Featured";
    FilterType["SearchText"] = "SearchText";
    FilterType["Tag"] = "Tag";
    FilterType["Target"] = "Target";
})(FilterType || (FilterType = {}));
export var StatisticType;
(function (StatisticType) {
    StatisticType["Install"] = "install";
    StatisticType["Uninstall"] = "uninstall";
})(StatisticType || (StatisticType = {}));
export var InstallOperation;
(function (InstallOperation) {
    InstallOperation[InstallOperation["None"] = 1] = "None";
    InstallOperation[InstallOperation["Install"] = 2] = "Install";
    InstallOperation[InstallOperation["Update"] = 3] = "Update";
    InstallOperation[InstallOperation["Migrate"] = 4] = "Migrate";
})(InstallOperation || (InstallOperation = {}));
export const IExtensionGalleryService = createDecorator('extensionGalleryService');
export var ExtensionGalleryErrorCode;
(function (ExtensionGalleryErrorCode) {
    ExtensionGalleryErrorCode["Timeout"] = "Timeout";
    ExtensionGalleryErrorCode["Cancelled"] = "Cancelled";
    ExtensionGalleryErrorCode["Failed"] = "Failed";
    ExtensionGalleryErrorCode["DownloadFailedWriting"] = "DownloadFailedWriting";
    ExtensionGalleryErrorCode["Offline"] = "Offline";
})(ExtensionGalleryErrorCode || (ExtensionGalleryErrorCode = {}));
export class ExtensionGalleryError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = code;
    }
}
export var ExtensionManagementErrorCode;
(function (ExtensionManagementErrorCode) {
    ExtensionManagementErrorCode["NotFound"] = "NotFound";
    ExtensionManagementErrorCode["Unsupported"] = "Unsupported";
    ExtensionManagementErrorCode["Deprecated"] = "Deprecated";
    ExtensionManagementErrorCode["Malicious"] = "Malicious";
    ExtensionManagementErrorCode["Incompatible"] = "Incompatible";
    ExtensionManagementErrorCode["IncompatibleApi"] = "IncompatibleApi";
    ExtensionManagementErrorCode["IncompatibleTargetPlatform"] = "IncompatibleTargetPlatform";
    ExtensionManagementErrorCode["ReleaseVersionNotFound"] = "ReleaseVersionNotFound";
    ExtensionManagementErrorCode["Invalid"] = "Invalid";
    ExtensionManagementErrorCode["Download"] = "Download";
    ExtensionManagementErrorCode["DownloadSignature"] = "DownloadSignature";
    ExtensionManagementErrorCode["DownloadFailedWriting"] = "DownloadFailedWriting";
    ExtensionManagementErrorCode["UpdateMetadata"] = "UpdateMetadata";
    ExtensionManagementErrorCode["Extract"] = "Extract";
    ExtensionManagementErrorCode["Scanning"] = "Scanning";
    ExtensionManagementErrorCode["ScanningExtension"] = "ScanningExtension";
    ExtensionManagementErrorCode["ReadRemoved"] = "ReadRemoved";
    ExtensionManagementErrorCode["UnsetRemoved"] = "UnsetRemoved";
    ExtensionManagementErrorCode["Delete"] = "Delete";
    ExtensionManagementErrorCode["Rename"] = "Rename";
    ExtensionManagementErrorCode["IntializeDefaultProfile"] = "IntializeDefaultProfile";
    ExtensionManagementErrorCode["AddToProfile"] = "AddToProfile";
    ExtensionManagementErrorCode["InstalledExtensionNotFound"] = "InstalledExtensionNotFound";
    ExtensionManagementErrorCode["PostInstall"] = "PostInstall";
    ExtensionManagementErrorCode["CorruptZip"] = "CorruptZip";
    ExtensionManagementErrorCode["IncompleteZip"] = "IncompleteZip";
    ExtensionManagementErrorCode["PackageNotSigned"] = "PackageNotSigned";
    ExtensionManagementErrorCode["SignatureVerificationInternal"] = "SignatureVerificationInternal";
    ExtensionManagementErrorCode["SignatureVerificationFailed"] = "SignatureVerificationFailed";
    ExtensionManagementErrorCode["NotAllowed"] = "NotAllowed";
    ExtensionManagementErrorCode["Gallery"] = "Gallery";
    ExtensionManagementErrorCode["Cancelled"] = "Cancelled";
    ExtensionManagementErrorCode["Unknown"] = "Unknown";
    ExtensionManagementErrorCode["Internal"] = "Internal";
})(ExtensionManagementErrorCode || (ExtensionManagementErrorCode = {}));
export var ExtensionSignatureVerificationCode;
(function (ExtensionSignatureVerificationCode) {
    ExtensionSignatureVerificationCode["NotSigned"] = "NotSigned";
    ExtensionSignatureVerificationCode["Success"] = "Success";
    ExtensionSignatureVerificationCode["RequiredArgumentMissing"] = "RequiredArgumentMissing";
    ExtensionSignatureVerificationCode["InvalidArgument"] = "InvalidArgument";
    ExtensionSignatureVerificationCode["PackageIsUnreadable"] = "PackageIsUnreadable";
    ExtensionSignatureVerificationCode["UnhandledException"] = "UnhandledException";
    ExtensionSignatureVerificationCode["SignatureManifestIsMissing"] = "SignatureManifestIsMissing";
    ExtensionSignatureVerificationCode["SignatureManifestIsUnreadable"] = "SignatureManifestIsUnreadable";
    ExtensionSignatureVerificationCode["SignatureIsMissing"] = "SignatureIsMissing";
    ExtensionSignatureVerificationCode["SignatureIsUnreadable"] = "SignatureIsUnreadable";
    ExtensionSignatureVerificationCode["CertificateIsUnreadable"] = "CertificateIsUnreadable";
    ExtensionSignatureVerificationCode["SignatureArchiveIsUnreadable"] = "SignatureArchiveIsUnreadable";
    ExtensionSignatureVerificationCode["FileAlreadyExists"] = "FileAlreadyExists";
    ExtensionSignatureVerificationCode["SignatureArchiveIsInvalidZip"] = "SignatureArchiveIsInvalidZip";
    ExtensionSignatureVerificationCode["SignatureArchiveHasSameSignatureFile"] = "SignatureArchiveHasSameSignatureFile";
    ExtensionSignatureVerificationCode["PackageIntegrityCheckFailed"] = "PackageIntegrityCheckFailed";
    ExtensionSignatureVerificationCode["SignatureIsInvalid"] = "SignatureIsInvalid";
    ExtensionSignatureVerificationCode["SignatureManifestIsInvalid"] = "SignatureManifestIsInvalid";
    ExtensionSignatureVerificationCode["SignatureIntegrityCheckFailed"] = "SignatureIntegrityCheckFailed";
    ExtensionSignatureVerificationCode["EntryIsMissing"] = "EntryIsMissing";
    ExtensionSignatureVerificationCode["EntryIsTampered"] = "EntryIsTampered";
    ExtensionSignatureVerificationCode["Untrusted"] = "Untrusted";
    ExtensionSignatureVerificationCode["CertificateRevoked"] = "CertificateRevoked";
    ExtensionSignatureVerificationCode["SignatureIsNotValid"] = "SignatureIsNotValid";
    ExtensionSignatureVerificationCode["UnknownError"] = "UnknownError";
    ExtensionSignatureVerificationCode["PackageIsInvalidZip"] = "PackageIsInvalidZip";
    ExtensionSignatureVerificationCode["SignatureArchiveHasTooManyEntries"] = "SignatureArchiveHasTooManyEntries";
})(ExtensionSignatureVerificationCode || (ExtensionSignatureVerificationCode = {}));
export class ExtensionManagementError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = code;
    }
}
export const IExtensionManagementService = createDecorator('extensionManagementService');
export const DISABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/disabled';
export const ENABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/enabled';
export const IGlobalExtensionEnablementService = createDecorator('IGlobalExtensionEnablementService');
export const IExtensionTipsService = createDecorator('IExtensionTipsService');
export const IAllowedExtensionsService = createDecorator('IAllowedExtensionsService');
export async function computeSize(location, fileService) {
    let stat;
    try {
        stat = await fileService.resolve(location);
    }
    catch (e) {
        if (e.fileOperationResult === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
            return 0;
        }
        throw e;
    }
    if (stat.children) {
        const sizes = await Promise.all(stat.children.map((c) => computeSize(c.resource, fileService)));
        return sizes.reduce((r, s) => r + s, 0);
    }
    return stat.size ?? 0;
}
export const ExtensionsLocalizedLabel = localize2('extensions', 'Extensions');
export const PreferencesLocalizedLabel = localize2('preferences', 'Preferences');
export const UseUnpkgResourceApiConfigKey = 'extensions.gallery.useUnpkgResourceApi';
export const AllowedExtensionsConfigKey = 'extensions.allowed';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvY29tbW9uL2V4dGVuc2lvbk1hbmFnZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBYTNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FDeEMsMkRBQTJELENBQUE7QUFDNUQsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxNQUFNLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtBQUNsRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQTtBQUNsRCxNQUFNLENBQUMsTUFBTSwwQ0FBMEMsR0FBRyxpQkFBaUIsQ0FBQTtBQUMzRSxNQUFNLENBQUMsTUFBTSw4Q0FBOEMsR0FBRyxvQkFBb0IsQ0FBQTtBQUNsRixNQUFNLENBQUMsTUFBTSxnQ0FBZ0MsR0FBRyx3QkFBd0IsQ0FBQTtBQUN4RSxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxpQ0FBaUMsQ0FBQTtBQUNuRixNQUFNLENBQUMsTUFBTSxnREFBZ0QsR0FBRyxzQkFBc0IsQ0FBQTtBQUV0RixNQUFNLENBQU4sSUFBa0Isc0JBR2pCO0FBSEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLDZDQUFtQixDQUFBO0lBQ25CLHdEQUE4QixDQUFBO0FBQy9CLENBQUMsRUFIaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUd2QztBQU9ELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxjQUE4QjtJQUNwRSxRQUFRLGNBQWMsRUFBRSxDQUFDO1FBQ3hCO1lBQ0MsT0FBTyxnQkFBZ0IsQ0FBQTtR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