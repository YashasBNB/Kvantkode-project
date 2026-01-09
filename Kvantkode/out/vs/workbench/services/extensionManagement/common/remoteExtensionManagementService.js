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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9yZW1vdGVFeHRlbnNpb25NYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQVFoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsNENBQTRDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUV6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFFM0csSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FDWixTQUFRLDRDQUE0QztJQUdwRCxZQUNDLE9BQWlCLEVBQ0EsY0FBK0IsRUFDckIsd0JBQW1ELEVBQ3JELHNCQUErQyxFQUM3Qix1QkFBaUQsRUFFM0UsNkJBQTZELEVBQ3pELGtCQUF1QztRQUU1RCxLQUFLLENBQ0osT0FBTyxFQUNQLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsc0JBQXNCLEVBQ3RCLGtCQUFrQixDQUNsQixDQUFBO1FBWDBDLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFFM0Usa0NBQTZCLEdBQTdCLDZCQUE2QixDQUFnQztJQVUvRSxDQUFDO0lBRVMs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