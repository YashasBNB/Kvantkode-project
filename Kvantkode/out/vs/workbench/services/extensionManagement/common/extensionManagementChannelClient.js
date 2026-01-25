/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { ExtensionManagementChannelClient as BaseExtensionManagementChannelClient } from '../../../../platform/extensionManagement/common/extensionManagementIpc.js';
import { Emitter } from '../../../../base/common/event.js';
import { delta } from '../../../../base/common/arrays.js';
import { compare } from '../../../../base/common/strings.js';
export class ProfileAwareExtensionManagementChannelClient extends BaseExtensionManagementChannelClient {
    get onProfileAwareDidInstallExtensions() {
        return this._onDidProfileAwareInstallExtensions.event;
    }
    get onProfileAwareDidUninstallExtension() {
        return this._onDidProfileAwareUninstallExtension.event;
    }
    get onProfileAwareDidUpdateExtensionMetadata() {
        return this._onDidProfileAwareUpdateExtensionMetadata.event;
    }
    constructor(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService) {
        super(channel, productService, allowedExtensionsService);
        this.userDataProfileService = userDataProfileService;
        this.uriIdentityService = uriIdentityService;
        this._onDidChangeProfile = this._register(new Emitter());
        this.onDidChangeProfile = this._onDidChangeProfile.event;
        this._onDidProfileAwareInstallExtensions = this._register(new Emitter());
        this._onDidProfileAwareUninstallExtension = this._register(new Emitter());
        this._onDidProfileAwareUpdateExtensionMetadata = this._register(new Emitter());
        this._register(userDataProfileService.onDidChangeCurrentProfile((e) => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.extensionsResource, e.profile.extensionsResource)) {
                e.join(this.whenProfileChanged(e));
            }
        }));
    }
    async onInstallExtensionEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.applicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onInstallExtension.fire(data);
        }
    }
    async onDidInstallExtensionsEvent(results) {
        const filtered = [];
        for (const e of results) {
            const result = this.filterEvent(e.profileLocation, e.applicationScoped ?? e.local?.isApplicationScoped ?? false);
            if (result instanceof Promise ? await result : result) {
                filtered.push(e);
            }
        }
        if (filtered.length) {
            this._onDidInstallExtensions.fire(filtered);
        }
        this._onDidProfileAwareInstallExtensions.fire(results);
    }
    async onUninstallExtensionEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.applicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onUninstallExtension.fire(data);
        }
    }
    async onDidUninstallExtensionEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.applicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onDidUninstallExtension.fire(data);
        }
        this._onDidProfileAwareUninstallExtension.fire(data);
    }
    async onDidUpdateExtensionMetadataEvent(data) {
        const result = this.filterEvent(data.profileLocation, data.local?.isApplicationScoped ?? false);
        if (result instanceof Promise ? await result : result) {
            this._onDidUpdateExtensionMetadata.fire(data);
        }
        this._onDidProfileAwareUpdateExtensionMetadata.fire(data);
    }
    async install(vsix, installOptions) {
        installOptions = {
            ...installOptions,
            profileLocation: await this.getProfileLocation(installOptions?.profileLocation),
        };
        return super.install(vsix, installOptions);
    }
    async installFromLocation(location, profileLocation) {
        return super.installFromLocation(location, await this.getProfileLocation(profileLocation));
    }
    async installFromGallery(extension, installOptions) {
        installOptions = {
            ...installOptions,
            profileLocation: await this.getProfileLocation(installOptions?.profileLocation),
        };
        return super.installFromGallery(extension, installOptions);
    }
    async installGalleryExtensions(extensions) {
        const infos = [];
        for (const extension of extensions) {
            infos.push({
                ...extension,
                options: {
                    ...extension.options,
                    profileLocation: await this.getProfileLocation(extension.options?.profileLocation),
                },
            });
        }
        return super.installGalleryExtensions(infos);
    }
    async uninstall(extension, options) {
        options = {
            ...options,
            profileLocation: await this.getProfileLocation(options?.profileLocation),
        };
        return super.uninstall(extension, options);
    }
    async uninstallExtensions(extensions) {
        const infos = [];
        for (const { extension, options } of extensions) {
            infos.push({
                extension,
                options: {
                    ...options,
                    profileLocation: await this.getProfileLocation(options?.profileLocation),
                },
            });
        }
        return super.uninstallExtensions(infos);
    }
    async getInstalled(type = null, extensionsProfileResource, productVersion) {
        return super.getInstalled(type, await this.getProfileLocation(extensionsProfileResource), productVersion);
    }
    async updateMetadata(local, metadata, extensionsProfileResource) {
        return super.updateMetadata(local, metadata, await this.getProfileLocation(extensionsProfileResource));
    }
    async toggleAppliationScope(local, fromProfileLocation) {
        return super.toggleAppliationScope(local, await this.getProfileLocation(fromProfileLocation));
    }
    async copyExtensions(fromProfileLocation, toProfileLocation) {
        return super.copyExtensions(await this.getProfileLocation(fromProfileLocation), await this.getProfileLocation(toProfileLocation));
    }
    async whenProfileChanged(e) {
        const previousProfileLocation = await this.getProfileLocation(e.previous.extensionsResource);
        const currentProfileLocation = await this.getProfileLocation(e.profile.extensionsResource);
        if (this.uriIdentityService.extUri.isEqual(previousProfileLocation, currentProfileLocation)) {
            return;
        }
        const eventData = await this.switchExtensionsProfile(previousProfileLocation, currentProfileLocation);
        this._onDidChangeProfile.fire(eventData);
    }
    async switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions) {
        const oldExtensions = await this.getInstalled(1 /* ExtensionType.User */, previousProfileLocation);
        const newExtensions = await this.getInstalled(1 /* ExtensionType.User */, currentProfileLocation);
        if (preserveExtensions?.length) {
            const extensionsToInstall = [];
            for (const extension of oldExtensions) {
                if (preserveExtensions.some((id) => ExtensionIdentifier.equals(extension.identifier.id, id)) &&
                    !newExtensions.some((e) => ExtensionIdentifier.equals(e.identifier.id, extension.identifier.id))) {
                    extensionsToInstall.push(extension.identifier);
                }
            }
            if (extensionsToInstall.length) {
                await this.installExtensionsFromProfile(extensionsToInstall, previousProfileLocation, currentProfileLocation);
            }
        }
        return delta(oldExtensions, newExtensions, (a, b) => compare(`${ExtensionIdentifier.toKey(a.identifier.id)}@${a.manifest.version}`, `${ExtensionIdentifier.toKey(b.identifier.id)}@${b.manifest.version}`));
    }
    async getProfileLocation(profileLocation) {
        return profileLocation ?? this.userDataProfileService.currentProfile.extensionsResource;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENoYW5uZWxDbGllbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50Q2hhbm5lbENsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQW1CaEcsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQ0FBZ0MsSUFBSSxvQ0FBb0MsRUFBRSxNQUFNLDJFQUEyRSxDQUFBO0FBTXBLLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBUTVELE1BQU0sT0FBZ0IsNENBQ3JCLFNBQVEsb0NBQW9DO0lBVzVDLElBQUksa0NBQWtDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLG1DQUFtQyxDQUFDLEtBQUssQ0FBQTtJQUN0RCxDQUFDO0lBS0QsSUFBSSxtQ0FBbUM7UUFDdEMsT0FBTyxJQUFJLENBQUMsb0NBQW9DLENBQUMsS0FBSyxDQUFBO0lBQ3ZELENBQUM7SUFLRCxJQUFJLHdDQUF3QztRQUMzQyxPQUFPLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxLQUFLLENBQUE7SUFDNUQsQ0FBQztJQUVELFlBQ0MsT0FBaUIsRUFDakIsY0FBK0IsRUFDL0Isd0JBQW1ELEVBQ2hDLHNCQUErQyxFQUMvQyxrQkFBdUM7UUFFMUQsS0FBSyxDQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtRQUhyQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQy9D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