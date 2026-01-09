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
import { IRemoteAgentService } from './remoteAgentService.js';
import { IRemoteExtensionsScannerService, RemoteExtensionsScannerChannelName, } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IActiveLanguagePackService } from '../../localization/common/locale.js';
import { IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
let RemoteExtensionsScannerService = class RemoteExtensionsScannerService {
    constructor(remoteAgentService, environmentService, userDataProfileService, remoteUserDataProfilesService, activeLanguagePackService, extensionManagementService, logService) {
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.userDataProfileService = userDataProfileService;
        this.remoteUserDataProfilesService = remoteUserDataProfilesService;
        this.activeLanguagePackService = activeLanguagePackService;
        this.extensionManagementService = extensionManagementService;
        this.logService = logService;
    }
    whenExtensionsReady() {
        return this.withChannel((channel) => channel.call('whenExtensionsReady'), { failed: [] });
    }
    async scanExtensions() {
        try {
            const languagePack = await this.activeLanguagePackService.getExtensionIdProvidingCurrentLocale();
            return await this.withChannel(async (channel) => {
                const profileLocation = this.userDataProfileService.currentProfile.isDefault
                    ? undefined
                    : (await this.remoteUserDataProfilesService.getRemoteProfile(this.userDataProfileService.currentProfile)).extensionsResource;
                const scannedExtensions = await channel.call('scanExtensions', [
                    platform.language,
                    profileLocation,
                    this.extensionManagementService.getInstalledWorkspaceExtensionLocations(),
                    this.environmentService.extensionDevelopmentLocationURI,
                    languagePack,
                ]);
                scannedExtensions.forEach((extension) => {
                    extension.extensionLocation = URI.revive(extension.extensionLocation);
                });
                return scannedExtensions;
            }, []);
        }
        catch (error) {
            this.logService.error(error);
            return [];
        }
    }
    withChannel(callback, fallback) {
        const connection = this.remoteAgentService.getConnection();
        if (!connection) {
            return Promise.resolve(fallback);
        }
        return connection.withChannel(RemoteExtensionsScannerChannelName, (channel) => callback(channel));
    }
};
RemoteExtensionsScannerService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IUserDataProfileService),
    __param(3, IRemoteUserDataProfilesService),
    __param(4, IActiveLanguagePackService),
    __param(5, IWorkbenchExtensionManagementService),
    __param(6, ILogService)
], RemoteExtensionsScannerService);
registerSingleton(IRemoteExtensionsScannerService, RemoteExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZW1vdGUvY29tbW9uL3JlbW90ZUV4dGVuc2lvbnNTY2FubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzdELE9BQU8sRUFDTiwrQkFBK0IsRUFDL0Isa0NBQWtDLEdBQ2xDLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDekYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUk5RyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4QjtJQUduQyxZQUN1QyxrQkFBdUMsRUFDOUIsa0JBQWdELEVBQ3JELHNCQUErQyxFQUV4RSw2QkFBNkQsRUFFN0QseUJBQXFELEVBRXJELDBCQUFnRSxFQUNuRCxVQUF1QjtRQVRmLHVCQUFrQixH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