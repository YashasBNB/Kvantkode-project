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
import { IAllowedExtensionsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { joinPath } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ProfileAwareExtensionManagementChannelClient } from '../common/extensionManagementChannelClient.js';
import { ExtensionIdentifier, isResolverExtension, } from '../../../../platform/extensions/common/extensions.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
let NativeExtensionManagementService = class NativeExtensionManagementService extends ProfileAwareExtensionManagementChannelClient {
    constructor(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService, fileService, downloadService, nativeEnvironmentService, logService) {
        super(channel, productService, allowedExtensionsService, userDataProfileService, uriIdentityService);
        this.fileService = fileService;
        this.downloadService = downloadService;
        this.nativeEnvironmentService = nativeEnvironmentService;
        this.logService = logService;
    }
    filterEvent(profileLocation, isApplicationScoped) {
        return (isApplicationScoped ||
            this.uriIdentityService.extUri.isEqual(this.userDataProfileService.currentProfile.extensionsResource, profileLocation));
    }
    async install(vsix, options) {
        const { location, cleanup } = await this.downloadVsix(vsix);
        try {
            return await super.install(location, options);
        }
        finally {
            await cleanup();
        }
    }
    async downloadVsix(vsix) {
        if (vsix.scheme === Schemas.file) {
            return { location: vsix, async cleanup() { } };
        }
        this.logService.trace('Downloading extension from', vsix.toString());
        const location = joinPath(this.nativeEnvironmentService.extensionsDownloadLocation, generateUuid());
        await this.downloadService.download(vsix, location);
        this.logService.info('Downloaded extension to', location.toString());
        const cleanup = async () => {
            try {
                await this.fileService.del(location);
            }
            catch (error) {
                this.logService.error(error);
            }
        };
        return { location, cleanup };
    }
    async switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions) {
        if (this.nativeEnvironmentService.remoteAuthority) {
            const previousInstalledExtensions = await this.getInstalled(1 /* ExtensionType.User */, previousProfileLocation);
            const resolverExtension = previousInstalledExtensions.find((e) => isResolverExtension(e.manifest, this.nativeEnvironmentService.remoteAuthority));
            if (resolverExtension) {
                if (!preserveExtensions) {
                    preserveExtensions = [];
                }
                preserveExtensions.push(new ExtensionIdentifier(resolverExtension.identifier.id));
            }
        }
        return super.switchExtensionsProfile(previousProfileLocation, currentProfileLocation, preserveExtensions);
    }
};
NativeExtensionManagementService = __decorate([
    __param(1, IProductService),
    __param(2, IAllowedExtensionsService),
    __param(3, IUserDataProfileService),
    __param(4, IUriIdentityService),
    __param(5, IFileService),
    __param(6, IDownloadService),
    __param(7, INativeWorkbenchEnvironmentService),
    __param(8, ILogService)
], NativeExtensionManagementService);
export { NativeExtensionManagementService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZUV4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBUWhHLE9BQU8sRUFDTix5QkFBeUIsR0FHekIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSw0Q0FBNEMsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVHLE9BQU8sRUFDTixtQkFBbUIsRUFFbkIsbUJBQW1CLEdBQ25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRWhGLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQ1osU0FB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