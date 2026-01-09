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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi93ZWJFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sbUJBQW1CLEdBTW5CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUlOLHdCQUF3QixFQUl4Qix5QkFBeUIsR0FDekIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLHFCQUFxQixHQUNyQixNQUFNLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sRUFHTiw0QkFBNEIsR0FDNUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFcEUsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxxQkFBcUIsRUFJckIsMEJBQTBCLEdBRTFCLE1BQU0sdUZBQXVGLENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekUsT0FBTyxF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