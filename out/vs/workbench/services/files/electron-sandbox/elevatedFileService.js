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
import { localize } from '../../../../nls.js';
import { randomPath } from '../../../../base/common/extpath.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IElevatedFileService } from '../common/elevatedFileService.js';
import { isWindows } from '../../../../base/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
let NativeElevatedFileService = class NativeElevatedFileService {
    constructor(nativeHostService, fileService, environmentService, workspaceTrustRequestService, labelService) {
        this.nativeHostService = nativeHostService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.labelService = labelService;
    }
    isSupported(resource) {
        // Saving elevated is currently only supported for local
        // files for as long as we have no generic support from
        // the file service
        // (https://github.com/microsoft/vscode/issues/48659)
        return resource.scheme === Schemas.file;
    }
    async writeFileElevated(resource, value, options) {
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: isWindows
                ? localize('fileNotTrustedMessageWindows', "You are about to save '{0}' as admin.", this.labelService.getUriLabel(resource))
                : localize('fileNotTrustedMessagePosix', "You are about to save '{0}' as super user.", this.labelService.getUriLabel(resource)),
        });
        if (!trusted) {
            throw new Error(localize('fileNotTrusted', 'Workspace is not trusted.'));
        }
        const source = URI.file(randomPath(this.environmentService.userDataPath, 'code-elevated'));
        try {
            // write into a tmp file first
            await this.fileService.writeFile(source, value, options);
            // then sudo prompt copy
            await this.nativeHostService.writeElevated(source, resource, options);
        }
        finally {
            // clean up
            await this.fileService.del(source);
        }
        return this.fileService.resolve(resource, { resolveMetadata: true });
    }
};
NativeElevatedFileService = __decorate([
    __param(0, INativeHostService),
    __param(1, IFileService),
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IWorkspaceTrustRequestService),
    __param(4, ILabelService)
], NativeElevatedFileService);
export { NativeElevatedFileService };
registerSingleton(IElevatedFileService, NativeElevatedFileService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxldmF0ZWRGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9maWxlcy9lbGVjdHJvbi1zYW5kYm94L2VsZXZhdGVkRmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBTTdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixZQUFZLEdBR1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdkcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5QjtJQUdyQyxZQUNzQyxpQkFBcUMsRUFDM0MsV0FBeUIsRUFFdkMsa0JBQXNELEVBRXRELDRCQUEyRCxFQUM1QyxZQUEyQjtRQU50QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzNDLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBRXZDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0M7UUFFdEQsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUM1QyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQUN6RCxDQUFDO0lBRUosV0FBVyxDQUFDLFFBQWE7UUFDeEIsd0RBQXdEO1FBQ3hELHVEQUF1RDtRQUN2RCxtQkFBbUI7UUFDbkIscURBQXFEO1FBQ3JELE9BQU8sUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFBO0lBQ3hDLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQ3RCLFFBQWEsRUFDYixLQUEyRCxFQUMzRCxPQUEyQjtRQUUzQixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxxQkFBcUIsQ0FBQztZQUM3RSxPQUFPLEVBQUUsU0FBUztnQkFDakIsQ0FBQyxDQUFDLFFBQVEsQ0FDUiw4QkFBOEIsRUFDOUIsdUNBQXVDLEVBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUN2QztnQkFDRixDQUFDLENBQUMsUUFBUSxDQUNSLDRCQUE0QixFQUM1Qiw0Q0FBNEMsRUFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQ3ZDO1NBQ0gsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDMUYsSUFBSSxDQUFDO1lBQ0osOEJBQThCO1lBQzlCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUV4RCx3QkFBd0I7WUFDeEIsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEUsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsV0FBVztZQUNYLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDckUsQ0FBQztDQUNELENBQUE7QUF6RFkseUJBQXlCO0lBSW5DLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGtDQUFrQyxDQUFBO0lBRWxDLFdBQUEsNkJBQTZCLENBQUE7SUFFN0IsV0FBQSxhQUFhLENBQUE7R0FWSCx5QkFBeUIsQ0F5RHJDOztBQUVELGlCQUFpQixDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixvQ0FBNEIsQ0FBQSJ9