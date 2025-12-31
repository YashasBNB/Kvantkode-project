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
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { IExtensionGalleryService, IAllowedExtensionsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { areSameExtensions, getGalleryExtensionId, } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IWebExtensionsScannerService, } from './extensionManagement.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractExtensionManagementService, AbstractExtensionTask, toExtensionManagementError, } from '../../../../platform/extensionManagement/common/abstractExtensionManagementService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { isBoolean, isUndefined } from '../../../../base/common/types.js';
import { IUserDataProfileService, } from '../../userDataProfile/common/userDataProfile.js';
import { delta } from '../../../../base/common/arrays.js';
import { compare } from '../../../../base/common/strings.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
let WebExtensionManagementService = class WebExtensionManagementService extends AbstractExtensionManagementService {
    get onProfileAwareInstallExtension() {
        return super.onInstallExtension;
    }
    get onInstallExtension() {
        return Event.filter(this.onProfileAwareInstallExtension, (e) => this.filterEvent(e), this.disposables);
    }
    get onProfileAwareDidInstallExtensions() {
        return super.onDidInstallExtensions;
    }
    get onDidInstallExtensions() {
        return Event.filter(Event.map(this.onProfileAwareDidInstallExtensions, (results) => results.filter((e) => this.filterEvent(e)), this.disposables), (results) => results.length > 0, this.disposables);
    }
    get onProfileAwareUninstallExtension() {
        return super.onUninstallExtension;
    }
    get onUninstallExtension() {
        return Event.filter(this.onProfileAwareUninstallExtension, (e) => this.filterEvent(e), this.disposables);
    }
    get onProfileAwareDidUninstallExtension() {
        return super.onDidUninstallExtension;
    }
    get onDidUninstallExtension() {
        return Event.filter(this.onProfileAwareDidUninstallExtension, (e) => this.filterEvent(e), this.disposables);
    }
    get onProfileAwareDidUpdateExtensionMetadata() {
        return super.onDidUpdateExtensionMetadata;
    }
    constructor(extensionGalleryService, telemetryService, logService, webExtensionsScannerService, extensionManifestPropertiesService, userDataProfileService, productService, allowedExtensionsService, userDataProfilesService, uriIdentityService) {
        super(extensionGalleryService, telemetryService, uriIdentityService, logService, productService, allowedExtensionsService, userDataProfilesService);
        this.webExtensionsScannerService = webExtensionsScannerService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.userDataProfileService = userDataProfileService;
        this.disposables = this._register(new DisposableStore());
        this._onDidChangeProfile = this._register(new Emitter());
        this.onDidChangeProfile = this._onDidChangeProfile.event;
        this._register(userDataProfileService.onDidChangeCurrentProfile((e) => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.extensionsResource, e.profile.extensionsResource)) {
                e.join(this.whenProfileChanged(e));
            }
        }));
    }
    filterEvent({ profileLocation, applicationScoped, }) {
        profileLocation =
            profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource;
        return (applicationScoped ||
            this.uriIdentityService.extUri.isEqual(this.userDataProfileService.currentProfile.extensionsResource, profileLocation));
    }
    async getTargetPlatform() {
        return "web" /* TargetPlatform.WEB */;
    }
    async isExtensionPlatformCompatible(extension) {
        if (this.isConfiguredToExecuteOnWeb(extension)) {
            return true;
        }
        return super.isExtensionPlatformCompatible(extension);
    }
    async getInstalled(type, profileLocation) {
        const extensions = [];
        if (type === undefined || type === 0 /* ExtensionType.System */) {
            const systemExtensions = await this.webExtensionsScannerService.scanSystemExtensions();
            extensions.push(...systemExtensions);
        }
        if (type === undefined || type === 1 /* ExtensionType.User */) {
            const userExtensions = await this.webExtensionsScannerService.scanUserExtensions(profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource);
            extensions.push(...userExtensions);
        }
        return extensions.map((e) => toLocalExtension(e));
    }
    async install(location, options = {}) {
        this.logService.trace('ExtensionManagementService#install', location.toString());
        const manifest = await this.webExtensionsScannerService.scanExtensionManifest(location);
        if (!manifest || !manifest.name || !manifest.version) {
            throw new Error(`Cannot find a valid extension from the location ${location.toString()}`);
        }
        const result = await this.installExtensions([{ manifest, extension: location, options }]);
        if (result[0]?.local) {
            return result[0]?.local;
        }
        if (result[0]?.error) {
            throw result[0].error;
        }
        throw toExtensionManagementError(new Error(`Unknown error while installing extension ${getGalleryExtensionId(manifest.publisher, manifest.name)}`));
    }
    installFromLocation(location, profileLocation) {
        return this.install(location, { profileLocation });
    }
    async removeExtension(extension) {
        // do nothing
    }
    async copyExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        const target = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, toProfileLocation);
        const source = await this.webExtensionsScannerService.scanExistingExtension(extension.location, extension.type, fromProfileLocation);
        metadata = { ...source?.metadata, ...metadata };
        let scanned;
        if (target) {
            scanned = await this.webExtensionsScannerService.updateMetadata(extension, { ...target.metadata, ...metadata }, toProfileLocation);
        }
        else {
            scanned = await this.webExtensionsScannerService.addExtension(extension.location, metadata, toProfileLocation);
        }
        return toLocalExtension(scanned);
    }
    async installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) {
        const result = [];
        const extensionsToInstall = (await this.webExtensionsScannerService.scanUserExtensions(fromProfileLocation)).filter((e) => extensions.some((id) => areSameExtensions(id, e.identifier)));
        if (extensionsToInstall.length) {
            await Promise.allSettled(extensionsToInstall.map(async (e) => {
                let local = await this.installFromLocation(e.location, toProfileLocation);
                if (e.metadata) {
                    local = await this.updateMetadata(local, e.metadata, fromProfileLocation);
                }
                result.push(local);
            }));
        }
        return result;
    }
    async updateMetadata(local, metadata, profileLocation) {
        // unset if false
        if (metadata.isMachineScoped === false) {
            metadata.isMachineScoped = undefined;
        }
        if (metadata.isBuiltin === false) {
            metadata.isBuiltin = undefined;
        }
        if (metadata.pinned === false) {
            metadata.pinned = undefined;
        }
        const updatedExtension = await this.webExtensionsScannerService.updateMetadata(local, metadata, profileLocation);
        const updatedLocalExtension = toLocalExtension(updatedExtension);
        this._onDidUpdateExtensionMetadata.fire({ local: updatedLocalExtension, profileLocation });
        return updatedLocalExtension;
    }
    async copyExtensions(fromProfileLocation, toProfileLocation) {
        await this.webExtensionsScannerService.copyExtensions(fromProfileLocation, toProfileLocation, (e) => !e.metadata?.isApplicationScoped);
    }
    async getCompatibleVersion(extension, sameVersion, includePreRelease, productVersion) {
        const compatibleExtension = await super.getCompatibleVersion(extension, sameVersion, includePreRelease, productVersion);
        if (compatibleExtension) {
            return compatibleExtension;
        }
        if (this.isConfiguredToExecuteOnWeb(extension)) {
            return extension;
        }
        return null;
    }
    isConfiguredToExecuteOnWeb(gallery) {
        const configuredExtensionKind = this.extensionManifestPropertiesService.getUserConfiguredExtensionKind(gallery.identifier);
        return !!configuredExtensionKind && configuredExtensionKind.includes('web');
    }
    getCurrentExtensionsManifestLocation() {
        return this.userDataProfileService.currentProfile.extensionsResource;
    }
    createInstallExtensionTask(manifest, extension, options) {
        return new InstallExtensionTask(manifest, extension, options, this.webExtensionsScannerService, this.userDataProfilesService);
    }
    createUninstallExtensionTask(extension, options) {
        return new UninstallExtensionTask(extension, options, this.webExtensionsScannerService);
    }
    zip(extension) {
        throw new Error('unsupported');
    }
    getManifest(vsix) {
        throw new Error('unsupported');
    }
    download() {
        throw new Error('unsupported');
    }
    async cleanUp() { }
    async whenProfileChanged(e) {
        const previousProfileLocation = e.previous.extensionsResource;
        const currentProfileLocation = e.profile.extensionsResource;
        if (!previousProfileLocation || !currentProfileLocation) {
            throw new Error('This should not happen');
        }
        const oldExtensions = await this.webExtensionsScannerService.scanUserExtensions(previousProfileLocation);
        const newExtensions = await this.webExtensionsScannerService.scanUserExtensions(currentProfileLocation);
        const { added, removed } = delta(oldExtensions, newExtensions, (a, b) => compare(`${ExtensionIdentifier.toKey(a.identifier.id)}@${a.manifest.version}`, `${ExtensionIdentifier.toKey(b.identifier.id)}@${b.manifest.version}`));
        this._onDidChangeProfile.fire({
            added: added.map((e) => toLocalExtension(e)),
            removed: removed.map((e) => toLocalExtension(e)),
        });
    }
};
WebExtensionManagementService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ITelemetryService),
    __param(2, ILogService),
    __param(3, IWebExtensionsScannerService),
    __param(4, IExtensionManifestPropertiesService),
    __param(5, IUserDataProfileService),
    __param(6, IProductService),
    __param(7, IAllowedExtensionsService),
    __param(8, IUserDataProfilesService),
    __param(9, IUriIdentityService)
], WebExtensionManagementService);
export { WebExtensionManagementService };
function toLocalExtension(extension) {
    const metadata = getMetadata(undefined, extension);
    return {
        ...extension,
        identifier: { id: extension.identifier.id, uuid: metadata.id ?? extension.identifier.uuid },
        isMachineScoped: !!metadata.isMachineScoped,
        isApplicationScoped: !!metadata.isApplicationScoped,
        publisherId: metadata.publisherId || null,
        publisherDisplayName: metadata.publisherDisplayName,
        installedTimestamp: metadata.installedTimestamp,
        isPreReleaseVersion: !!metadata.isPreReleaseVersion,
        hasPreReleaseVersion: !!metadata.hasPreReleaseVersion,
        preRelease: extension.preRelease,
        targetPlatform: "web" /* TargetPlatform.WEB */,
        updated: !!metadata.updated,
        pinned: !!metadata?.pinned,
        private: !!metadata.private,
        isWorkspaceScoped: false,
        source: metadata?.source ?? (extension.identifier.uuid ? 'gallery' : 'resource'),
        size: metadata.size ?? 0,
    };
}
function getMetadata(options, existingExtension) {
    const metadata = { ...(existingExtension?.metadata || {}) };
    metadata.isMachineScoped = options?.isMachineScoped || metadata.isMachineScoped;
    return metadata;
}
class InstallExtensionTask extends AbstractExtensionTask {
    get profileLocation() {
        return this._profileLocation;
    }
    get operation() {
        return isUndefined(this.options.operation) ? this._operation : this.options.operation;
    }
    constructor(manifest, extension, options, webExtensionsScannerService, userDataProfilesService) {
        super();
        this.manifest = manifest;
        this.extension = extension;
        this.options = options;
        this.webExtensionsScannerService = webExtensionsScannerService;
        this.userDataProfilesService = userDataProfilesService;
        this._profileLocation = this.options.profileLocation;
        this._operation = 2 /* InstallOperation.Install */;
        this.identifier = URI.isUri(extension)
            ? { id: getGalleryExtensionId(manifest.publisher, manifest.name) }
            : extension.identifier;
        this.source = extension;
    }
    async doRun(token) {
        const userExtensions = await this.webExtensionsScannerService.scanUserExtensions(this.options.profileLocation);
        const existingExtension = userExtensions.find((e) => areSameExtensions(e.identifier, this.identifier));
        if (existingExtension) {
            this._operation = 3 /* InstallOperation.Update */;
        }
        const metadata = getMetadata(this.options, existingExtension);
        if (!URI.isUri(this.extension)) {
            metadata.id = this.extension.identifier.uuid;
            metadata.publisherDisplayName = this.extension.publisherDisplayName;
            metadata.publisherId = this.extension.publisherId;
            metadata.installedTimestamp = Date.now();
            metadata.isPreReleaseVersion = this.extension.properties.isPreReleaseVersion;
            metadata.hasPreReleaseVersion =
                metadata.hasPreReleaseVersion || this.extension.properties.isPreReleaseVersion;
            metadata.isBuiltin = this.options.isBuiltin || existingExtension?.isBuiltin;
            metadata.isSystem = existingExtension?.type === 0 /* ExtensionType.System */ ? true : undefined;
            metadata.updated = !!existingExtension;
            metadata.isApplicationScoped =
                this.options.isApplicationScoped || metadata.isApplicationScoped;
            metadata.private = this.extension.private;
            metadata.preRelease = isBoolean(this.options.preRelease)
                ? this.options.preRelease
                : this.options.installPreReleaseVersion ||
                    this.extension.properties.isPreReleaseVersion ||
                    metadata.preRelease;
            metadata.source = URI.isUri(this.extension) ? 'resource' : 'gallery';
        }
        metadata.pinned = this.options.installGivenVersion
            ? true
            : (this.options.pinned ?? metadata.pinned);
        this._profileLocation = metadata.isApplicationScoped
            ? this.userDataProfilesService.defaultProfile.extensionsResource
            : this.options.profileLocation;
        const scannedExtension = URI.isUri(this.extension)
            ? await this.webExtensionsScannerService.addExtension(this.extension, metadata, this.profileLocation)
            : await this.webExtensionsScannerService.addExtensionFromGallery(this.extension, metadata, this.profileLocation);
        return toLocalExtension(scannedExtension);
    }
}
class UninstallExtensionTask extends AbstractExtensionTask {
    constructor(extension, options, webExtensionsScannerService) {
        super();
        this.extension = extension;
        this.options = options;
        this.webExtensionsScannerService = webExtensionsScannerService;
    }
    doRun(token) {
        return this.webExtensionsScannerService.removeExtension(this.extension, this.options.profileLocation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vd2ViRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLG1CQUFtQixHQU1uQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFJTix3QkFBd0IsRUFJeEIseUJBQXlCLEdBQ3pCLE1BQU0sd0VBQXdFLENBQUE7QUFDL0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixxQkFBcUIsR0FDckIsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBR04sNEJBQTRCLEdBQzVCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFDTixrQ0FBa0MsRUFDbEMscUJBQXFCLEVBSXJCLDBCQUEwQixHQUUxQixNQUFNLHVGQUF1RixDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pFLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSxp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