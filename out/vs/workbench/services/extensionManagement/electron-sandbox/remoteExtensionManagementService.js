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
import { IExtensionGalleryService, ExtensionManagementError, EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT, IAllowedExtensionsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { localize } from '../../../../nls.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Promises } from '../../../../base/common/async.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { RemoteExtensionManagementService } from '../common/remoteExtensionManagementService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { areApiProposalsCompatible } from '../../../../platform/extensions/common/extensionValidator.js';
import { isBoolean, isUndefined } from '../../../../base/common/types.js';
let NativeRemoteExtensionManagementService = class NativeRemoteExtensionManagementService extends RemoteExtensionManagementService {
    constructor(channel, localExtensionManagementServer, productService, userDataProfileService, userDataProfilesService, remoteUserDataProfilesService, uriIdentityService, logService, galleryService, configurationService, allowedExtensionsService, fileService, extensionManifestPropertiesService) {
        super(channel, productService, allowedExtensionsService, userDataProfileService, userDataProfilesService, remoteUserDataProfilesService, uriIdentityService);
        this.localExtensionManagementServer = localExtensionManagementServer;
        this.logService = logService;
        this.galleryService = galleryService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
    }
    async install(vsix, options) {
        const local = await super.install(vsix, options);
        await this.installUIDependenciesAndPackedExtensions(local);
        return local;
    }
    async installFromGallery(extension, installOptions = {}) {
        if (isUndefined(installOptions.donotVerifySignature)) {
            const value = this.configurationService.getValue('extensions.verifySignature');
            installOptions.donotVerifySignature = isBoolean(value) ? !value : undefined;
        }
        const local = await this.doInstallFromGallery(extension, installOptions);
        await this.installUIDependenciesAndPackedExtensions(local);
        return local;
    }
    async doInstallFromGallery(extension, installOptions) {
        if (installOptions.downloadExtensionsLocally ||
            this.configurationService.getValue('remote.downloadExtensionsLocally')) {
            return this.downloadAndInstall(extension, installOptions);
        }
        try {
            const clientTargetPlatform = await this.localExtensionManagementServer.extensionManagementService.getTargetPlatform();
            return await super.installFromGallery(extension, {
                ...installOptions,
                context: {
                    ...installOptions?.context,
                    [EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT]: clientTargetPlatform,
                },
            });
        }
        catch (error) {
            switch (error.name) {
                case "Download" /* ExtensionManagementErrorCode.Download */:
                case "DownloadSignature" /* ExtensionManagementErrorCode.DownloadSignature */:
                case "Gallery" /* ExtensionManagementErrorCode.Gallery */:
                case "Internal" /* ExtensionManagementErrorCode.Internal */:
                case "Unknown" /* ExtensionManagementErrorCode.Unknown */:
                    try {
                        this.logService.error(`Error while installing '${extension.identifier.id}' extension in the remote server.`, toErrorMessage(error));
                        return await this.downloadAndInstall(extension, installOptions);
                    }
                    catch (e) {
                        this.logService.error(e);
                        throw e;
                    }
                default:
                    this.logService.debug('Remote Install Error Name', error.name);
                    throw error;
            }
        }
    }
    async downloadAndInstall(extension, installOptions) {
        this.logService.info(`Downloading the '${extension.identifier.id}' extension locally and install`);
        const compatible = await this.checkAndGetCompatible(extension, !!installOptions.installPreReleaseVersion);
        installOptions = { ...installOptions, donotIncludePackAndDependencies: true };
        const installed = await this.getInstalled(1 /* ExtensionType.User */, undefined, installOptions.productVersion);
        const workspaceExtensions = await this.getAllWorkspaceDependenciesAndPackedExtensions(compatible, CancellationToken.None);
        if (workspaceExtensions.length) {
            this.logService.info(`Downloading the workspace dependencies and packed extensions of '${compatible.identifier.id}' locally and install`);
            for (const workspaceExtension of workspaceExtensions) {
                await this.downloadCompatibleAndInstall(workspaceExtension, installed, installOptions);
            }
        }
        return await this.downloadCompatibleAndInstall(compatible, installed, installOptions);
    }
    async downloadCompatibleAndInstall(extension, installed, installOptions) {
        const compatible = await this.checkAndGetCompatible(extension, !!installOptions.installPreReleaseVersion);
        this.logService.trace('Downloading extension:', compatible.identifier.id);
        const location = await this.localExtensionManagementServer.extensionManagementService.download(compatible, installed.filter((i) => areSameExtensions(i.identifier, compatible.identifier))[0]
            ? 3 /* InstallOperation.Update */
            : 2 /* InstallOperation.Install */, !!installOptions.donotVerifySignature);
        this.logService.info('Downloaded extension:', compatible.identifier.id, location.path);
        try {
            const local = await super.install(location, { ...installOptions, keepExisting: true });
            this.logService.info(`Successfully installed '${compatible.identifier.id}' extension`);
            return local;
        }
        finally {
            try {
                await this.fileService.del(location);
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async checkAndGetCompatible(extension, includePreRelease) {
        const targetPlatform = await this.getTargetPlatform();
        let compatibleExtension = null;
        if (extension.hasPreReleaseVersion &&
            extension.properties.isPreReleaseVersion !== includePreRelease) {
            compatibleExtension =
                (await this.galleryService.getExtensions([{ ...extension.identifier, preRelease: includePreRelease }], { targetPlatform, compatible: true }, CancellationToken.None))[0] || null;
        }
        if (!compatibleExtension &&
            (await this.galleryService.isExtensionCompatible(extension, includePreRelease, targetPlatform))) {
            compatibleExtension = extension;
        }
        if (!compatibleExtension) {
            compatibleExtension = await this.galleryService.getCompatibleExtension(extension, includePreRelease, targetPlatform);
        }
        if (!compatibleExtension) {
            const incompatibleApiProposalsMessages = [];
            if (!areApiProposalsCompatible(extension.properties.enabledApiProposals ?? [], incompatibleApiProposalsMessages)) {
                throw new ExtensionManagementError(localize('incompatibleAPI', "Can't install '{0}' extension. {1}", extension.displayName ?? extension.identifier.id, incompatibleApiProposalsMessages[0]), "IncompatibleApi" /* ExtensionManagementErrorCode.IncompatibleApi */);
            }
            /** If no compatible release version is found, check if the extension has a release version or not and throw relevant error */
            if (!includePreRelease &&
                extension.properties.isPreReleaseVersion &&
                (await this.galleryService.getExtensions([extension.identifier], CancellationToken.None))[0]) {
                throw new ExtensionManagementError(localize('notFoundReleaseExtension', "Can't install release version of '{0}' extension because it has no release version.", extension.identifier.id), "ReleaseVersionNotFound" /* ExtensionManagementErrorCode.ReleaseVersionNotFound */);
            }
            throw new ExtensionManagementError(localize('notFoundCompatibleDependency', "Can't install '{0}' extension because it is not compatible with the current version of {1} (version {2}).", extension.identifier.id, this.productService.nameLong, this.productService.version), "Incompatible" /* ExtensionManagementErrorCode.Incompatible */);
        }
        return compatibleExtension;
    }
    async installUIDependenciesAndPackedExtensions(local) {
        const uiExtensions = await this.getAllUIDependenciesAndPackedExtensions(local.manifest, CancellationToken.None);
        const installed = await this.localExtensionManagementServer.extensionManagementService.getInstalled();
        const toInstall = uiExtensions.filter((e) => installed.every((i) => !areSameExtensions(i.identifier, e.identifier)));
        if (toInstall.length) {
            this.logService.info(`Installing UI dependencies and packed extensions of '${local.identifier.id}' locally`);
            await Promises.settled(toInstall.map((d) => this.localExtensionManagementServer.extensionManagementService.installFromGallery(d)));
        }
    }
    async getAllUIDependenciesAndPackedExtensions(manifest, token) {
        const result = new Map();
        const extensions = [
            ...(manifest.extensionPack || []),
            ...(manifest.extensionDependencies || []),
        ];
        await this.getDependenciesAndPackedExtensionsRecursively(extensions, result, true, token);
        return [...result.values()];
    }
    async getAllWorkspaceDependenciesAndPackedExtensions(extension, token) {
        const result = new Map();
        result.set(extension.identifier.id.toLowerCase(), extension);
        const manifest = await this.galleryService.getManifest(extension, token);
        if (manifest) {
            const extensions = [
                ...(manifest.extensionPack || []),
                ...(manifest.extensionDependencies || []),
            ];
            await this.getDependenciesAndPackedExtensionsRecursively(extensions, result, false, token);
        }
        result.delete(extension.identifier.id);
        return [...result.values()];
    }
    async getDependenciesAndPackedExtensionsRecursively(toGet, result, uiExtension, token) {
        if (toGet.length === 0) {
            return Promise.resolve();
        }
        const extensions = await this.galleryService.getExtensions(toGet.map((id) => ({ id })), token);
        const manifests = await Promise.all(extensions.map((e) => this.galleryService.getManifest(e, token)));
        const extensionsManifests = [];
        for (let idx = 0; idx < extensions.length; idx++) {
            const extension = extensions[idx];
            const manifest = manifests[idx];
            if (manifest &&
                this.extensionManifestPropertiesService.prefersExecuteOnUI(manifest) === uiExtension) {
                result.set(extension.identifier.id.toLowerCase(), extension);
                extensionsManifests.push(manifest);
            }
        }
        toGet = [];
        for (const extensionManifest of extensionsManifests) {
            if (isNonEmptyArray(extensionManifest.extensionDependencies)) {
                for (const id of extensionManifest.extensionDependencies) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
            if (isNonEmptyArray(extensionManifest.extensionPack)) {
                for (const id of extensionManifest.extensionPack) {
                    if (!result.has(id.toLowerCase())) {
                        toGet.push(id);
                    }
                }
            }
        }
        return this.getDependenciesAndPackedExtensionsRecursively(toGet, result, uiExtension, token);
    }
};
NativeRemoteExtensionManagementService = __decorate([
    __param(2, IProductService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteUserDataProfilesService),
    __param(6, IUriIdentityService),
    __param(7, ILogService),
    __param(8, IExtensionGalleryService),
    __param(9, IConfigurationService),
    __param(10, IAllowedExtensionsService),
    __param(11, IFileService),
    __param(12, IExtensionManifestPropertiesService)
], NativeRemoteExtensionManagementService);
export { NativeRemoteExtensionManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2VsZWN0cm9uLXNhbmRib3gvcmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUdOLHdCQUF3QixFQUd4Qix3QkFBd0IsRUFFeEIsZ0RBQWdELEVBQ2hELHlCQUF5QixHQUN6QixNQUFNLHdFQUF3RSxDQUFBO0FBTS9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzlHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25ILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwrQ0FB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