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
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { ProfileAwareExtensionManagementChannelClient } from './extensionManagementChannelClient.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
let RemoteExtensionManagementService = class RemoteExtensionManagementService extends ProfileAwareExtensionManagementChannelClient {
    constructor(channel, productService, allowedExtensionsService, userDataProfileService, userDataProfilesService, remoteUserDataProfilesService, uriIdentityService) {
        super(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService);
        this.userDataProfilesService = userDataProfilesService;
        this.remoteUserDataProfilesService = remoteUserDataProfilesService;
    }
    async filterEvent(profileLocation, applicationScoped) {
        if (applicationScoped) {
            return true;
        }
        if (!profileLocation && this.userDataProfileService.currentProfile.isDefault) {
            return true;
        }
        const currentRemoteProfile = await this.remoteUserDataProfilesService.getRemoteProfile(this.userDataProfileService.currentProfile);
        if (this.uriIdentityService.extUri.isEqual(currentRemoteProfile.extensionsResource, profileLocation)) {
            return true;
        }
        return false;
    }
    async getProfileLocation(profileLocation) {
        if (!profileLocation && this.userDataProfileService.currentProfile.isDefault) {
            return undefined;
        }
        profileLocation = await super.getProfileLocation(profileLocation);
        let profile = this.userDataProfilesService.profiles.find((p) => this.uriIdentityService.extUri.isEqual(p.extensionsResource, profileLocation));
        if (profile) {
            profile = await this.remoteUserDataProfilesService.getRemoteProfile(profile);
        }
        else {
            profile = (await this.remoteUserDataProfilesService.getRemoteProfiles()).find((p) => this.uriIdentityService.extUri.isEqual(p.extensionsResource, profileLocation));
        }
        return profile?.extensionsResource;
    }
    async switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions) {
        const remoteProfiles = await this.remoteUserDataProfilesService.getRemoteProfiles();
        const previousProfile = remoteProfiles.find((p) => this.uriIdentityService.extUri.isEqual(p.extensionsResource, previousProfileLocation));
        const currentProfile = remoteProfiles.find((p) => this.uriIdentityService.extUri.isEqual(p.extensionsResource, currentProfileLocation));
        if (previousProfile?.id === currentProfile?.id) {
            return { added: [], removed: [] };
        }
        return super.switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions);
    }
};
RemoteExtensionManagementService = __decorate([
    __param(1, IProductService),
    __param(2, IAllowedExtensionsService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IRemoteUserDataProfilesService),
    __param(6, IUriIdentityService)
], RemoteExtensionManagementService);
export { RemoteExtensionManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vcmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFRaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkcsT0FBTyxFQUFFLDRDQUE0QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDcEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFekcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBRTNHLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FBUSw0Q0FBNEM7SUFHcEQsWUFDQyxPQUFpQixFQUNBLGNBQStCLEVBQ3JCLHdCQUFtRCxFQUNyRCxzQkFBK0MsRUFDN0IsdUJBQWlELEVBRTNFLDZCQUE2RCxFQUN6RCxrQkFBdUM7UUFFNUQsS0FBSyxDQUNKLE9BQU8sRUFDUCxjQUFjLEVBQ2Qsd0JBQXdCLEVBQ3hCLHNCQUFzQixFQUN0QixrQkFBa0IsQ0FDbEIsQ0FBQTtRQVgwQyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBRTNFLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7SUFVL0UsQ0FBQztJQUVTLEtBQUssQ0FBQyxXQUFXLENBQUMsZUFB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