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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcmVtb3RlL2NvbW1vbi9yZW1vdGVFeHRlbnNpb25zU2Nhbm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLGtDQUFrQyxHQUNsQyxNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFHL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEYsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFJOUcsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7SUFHbkMsWUFDdUMsa0JBQXVDLEVBQzlCLGtCQUFnRCxFQUNyRCxzQkFBK0MsRUFFeEUsNkJBQTZELEVBRTdELHlCQUFxRCxFQUVyRCwwQkFBZ0UsRUFDbkQsVUFBdUI7UUFUZix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQzlC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