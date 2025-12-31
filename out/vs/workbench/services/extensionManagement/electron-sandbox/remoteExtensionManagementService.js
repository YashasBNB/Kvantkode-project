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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9lbGVjdHJvbi1zYW5kYm94L3JlbW90ZUV4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFHTix3QkFBd0IsRUFHeEIsd0JBQXdCLEVBRXhCLGdEQUFnRCxFQUNoRCx5QkFBeUIsR0FDekIsTUFBTSx3RUFBd0UsQ0FBQTtBQU0vRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUM5RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEcsT0FBTyxFQUFF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