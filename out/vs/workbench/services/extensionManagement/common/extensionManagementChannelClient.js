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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudENoYW5uZWxDbGllbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTWFuYWdlbWVudENoYW5uZWxDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFtQmhHLE9BQU8sRUFDTixtQkFBbUIsR0FHbkIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0NBQWdDLElBQUksb0NBQW9DLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQU1wSyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQVE1RCxNQUFNLE9BQWdCLDRDQUNyQixTQUFRLG9DQUFvQztJQVc1QyxJQUFJLGtDQUFrQztRQUNyQyxPQUFPLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxLQUFLLENBQUE7SUFDdEQsQ0FBQztJQUtELElBQUksbUNBQW1DO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLG9DQUFvQyxDQUFDLEtBQUssQ0FBQTtJQUN2RCxDQUFDO0lBS0QsSUFBSSx3Q0FBd0M7UUFDM0MsT0FBTyxJQUFJLENBQUMseUNBQXlDLENBQUMsS0FBSyxDQUFBO0lBQzVELENBQUM7SUFFRCxZQUNDLE9BQWlCLEVBQ2pCLGNBQStCLEVBQy9CLHdCQUFtRCxFQUNoQyxzQkFBK0MsRUFDL0Msa0JBQXVDO1FBRTFELEtBQUssQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixDQUFDLENBQUE7UUFIckMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMvQyx1QkFB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