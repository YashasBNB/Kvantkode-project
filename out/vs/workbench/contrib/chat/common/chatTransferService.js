var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { isChatTransferredWorkspace, areWorkspaceFoldersEmpty, } from '../../../services/workspaces/common/workspaceUtils.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatTransferService = createDecorator('chatTransferService');
let ChatTransferService = class ChatTransferService {
    constructor(workspaceService, storageService, fileService, workspaceTrustManagementService) {
        this.workspaceService = workspaceService;
        this.storageService = storageService;
        this.fileService = fileService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
    }
    async checkAndSetWorkspaceTrust() {
        const workspace = this.workspaceService.getWorkspace();
        if (isChatTransferredWorkspace(workspace, this.storageService) &&
            (await areWorkspaceFoldersEmpty(workspace, this.fileService))) {
            await this.workspaceTrustManagementService.setWorkspaceTrust(true);
        }
    }
};
ChatTransferService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IStorageService),
    __param(2, IFileService),
    __param(3, IWorkspaceTrustManagementService)
], ChatTransferService);
export { ChatTransferService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRyYW5zZmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRUcmFuc2ZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMxRyxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLHdCQUF3QixHQUN4QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUE7QUFRekYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFHL0IsWUFDNEMsZ0JBQTBDLEVBQ25ELGNBQStCLEVBQ2xDLFdBQXlCLEVBRXZDLCtCQUFpRTtRQUp2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBQ25ELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUNsQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUV2QyxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO0lBQ2hGLENBQUM7SUFFSixLQUFLLENBQUMseUJBQXlCO1FBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUN0RCxJQUNDLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDO1lBQzFELENBQUMsTUFBTSx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQzVELENBQUM7WUFDRixNQUFNLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuRSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFwQlksbUJBQW1CO0lBSTdCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsZ0NBQWdDLENBQUE7R0FQdEIsbUJBQW1CLENBb0IvQiJ9