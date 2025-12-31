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
import { generateUuid } from '../../../../base/common/uuid.js';
import { IExtensionGalleryService, IAllowedExtensionsService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementService as BaseExtensionManagementService } from '../common/extensionManagementService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IExtensionManagementServerService, IWorkbenchExtensionManagementService, } from '../common/extensionManagement.js';
import { Schemas } from '../../../../base/common/network.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDownloadService } from '../../../../platform/download/common/download.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IExtensionsScannerService } from '../../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
let ExtensionManagementService = class ExtensionManagementService extends BaseExtensionManagementService {
    constructor(environmentService, extensionManagementServerService, extensionGalleryService, userDataProfileService, userDataProfilesService, configurationService, productService, downloadService, userDataSyncEnablementService, dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService, extensionsScannerService, allowedExtensionsService, storageService, telemetryService) {
        super(extensionManagementServerService, extensionGalleryService, userDataProfileService, userDataProfilesService, configurationService, productService, downloadService, userDataSyncEnablementService, dialogService, workspaceTrustRequestService, extensionManifestPropertiesService, fileService, logService, instantiationService, extensionsScannerService, allowedExtensionsService, storageService, telemetryService);
        this.environmentService = environmentService;
    }
    async installVSIXInServer(vsix, server, options) {
        if (vsix.scheme === Schemas.vscodeRemote &&
            server === this.extensionManagementServerService.localExtensionManagementServer) {
            const downloadedLocation = joinPath(this.environmentService.tmpDir, generateUuid());
            await this.downloadService.download(vsix, downloadedLocation);
            vsix = downloadedLocation;
        }
        return super.installVSIXInServer(vsix, server, options);
    }
};
ExtensionManagementService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IExtensionManagementServerService),
    __param(2, IExtensionGalleryService),
    __param(3, IUserDataProfileService),
    __param(4, IUserDataProfilesService),
    __param(5, IConfigurationService),
    __param(6, IProductService),
    __param(7, IDownloadService),
    __param(8, IUserDataSyncEnablementService),
    __param(9, IDialogService),
    __param(10, IWorkspaceTrustRequestService),
    __param(11, IExtensionManifestPropertiesService),
    __param(12, IFileService),
    __param(13, ILogService),
    __param(14, IInstantiationService),
    __param(15, IExtensionsScannerService),
    __param(16, IAllowedExtensionsService),
    __param(17, IStorageService),
    __param(18, ITelemetryService)
], ExtensionManagementService);
export { ExtensionManagementService };
registerSingleton(IWorkbenchExtensionManagementService, ExtensionManagementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbk1hbmFnZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBRU4sd0JBQXdCLEVBRXhCLHlCQUF5QixHQUN6QixNQUFNLHdFQUF3RSxDQUFBO0FBRS9FLE9BQU8sRUFBRSwwQkFBMEIsSUFBSSw4QkFBOEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RILE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBRU4saUNBQWlDLEVBQ2pDLG9DQUFvQyxHQUNwQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsNkJBQTZC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