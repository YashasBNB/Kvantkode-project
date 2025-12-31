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
import { IAllowedExtensionsService, IExtensionGalleryService, } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { AbstractExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IWorkbenchAssignmentService } from '../../assignment/common/assignmentService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
let WorkbenchExtensionGalleryService = class WorkbenchExtensionGalleryService extends AbstractExtensionGalleryService {
    constructor(storageService, assignmentService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService) {
        super(storageService, assignmentService, requestService, logService, environmentService, telemetryService, fileService, productService, configurationService, allowedExtensionsService, extensionGalleryManifestService);
    }
};
WorkbenchExtensionGalleryService = __decorate([
    __param(0, IStorageService),
    __param(1, IWorkbenchAssignmentService),
    __param(2, IRequestService),
    __param(3, ILogService),
    __param(4, IEnvironmentService),
    __param(5, ITelemetryService),
    __param(6, IFileService),
    __param(7, IProductService),
    __param(8, IConfigurationService),
    __param(9, IAllowedExtensionsService),
    __param(10, IExtensionGalleryManifestService)
], WorkbenchExtensionGalleryService);
export { WorkbenchExtensionGalleryService };
registerSingleton(IExtensionGalleryService, WorkbenchExtensionGalleryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uR2FsbGVyeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHlCQUF5QixFQUN6Qix3QkFBd0IsR0FDeEIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQzVILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQTtBQUV2SCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLCtCQUErQjtJQUNwRixZQUNrQixjQUErQixFQUNuQixpQkFBOEMsRUFDMUQsY0FBK0IsRUFDbkMsVUFBdUIsRUFDZixrQkFBdUMsRUFDekMsZ0JBQW1DLEVBQ3hDLFdBQXlCLEVBQ3RCLGNBQStCLEVBQ3pCLG9CQUEyQyxFQUN2Qyx3QkFBbUQsRUFFOUUsK0JBQWlFO1FBRWpFLEtBQUssQ0FDSixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLGNBQWMsRUFDZCxVQUFVLEVBQ1Ysa0JBQWtCLEVBQ2xCLGdCQUFnQixFQUNoQixXQUFXLEVBQ1gsY0FBYyxFQUNkLG9CQUFvQixFQUNwQix3QkFBd0IsRUFDeEIsK0JBQStCLENBQy9CLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTdCWSxnQ0FBZ0M7SUFFMUMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixZQUFBLGdDQUFnQyxDQUFBO0dBWnRCLGdDQUFnQyxDQTZCNUM7O0FBRUQsaUJBQWlCLENBQ2hCLHdCQUF3QixFQUN4QixnQ0FBZ0Msb0NBRWhDLENBQUEifQ==