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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVNoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFhM0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUN4QywyREFBMkQsQ0FBQTtBQUM1RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO0FBQ2xGLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFBO0FBQ2xELE1BQU0sQ0FBQyxNQUFNLDBDQUEwQyxHQUFHLGlCQUFpQixDQUFBO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLDhDQUE4QyxHQUFHLG9CQUFvQixDQUFBO0FBQ2xGLE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLHdCQUF3QixDQUFBO0FBQ3hFLE1BQU0sQ0FBQyxNQUFNLGtDQUFrQyxHQUFHLGlDQUFpQyxDQUFBO0FBQ25GLE1BQU0sQ0FBQyxNQUFNLGdEQUFnRCxHQUFHLHNCQUFzQixDQUFBO0FBRXRGLE1BQU0sQ0FBTixJQUFrQixzQkFHakI7QUFIRCxXQUFrQixzQkFBc0I7SUFDdkMsNkNBQW1CLENBQUE7SUFDbkIsd0RBQThCLENBQUE7QUFDL0IsQ0FBQyxFQUhpQixzQkFBc0IsS0FBdEIsc0JBQXNCLFFBR3ZDO0FBT0QsTUFBTSxVQUFVLHNCQUFzQixDQUFDLGNBQThCO0lBQ3BFLFFBQVEsY0FBYyxFQUFFLENBQUM7UUFDeEI7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