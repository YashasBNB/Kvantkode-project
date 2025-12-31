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
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { WorkingCopyBackupService } from '../common/workingCopyBackupService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { BrowserWorkingCopyBackupTracker } from './workingCopyBackupTracker.js';
let BrowserWorkingCopyBackupService = class BrowserWorkingCopyBackupService extends WorkingCopyBackupService {
    constructor(contextService, environmentService, fileService, logService) {
        super(joinPath(environmentService.userRoamingDataHome, 'Backups', contextService.getWorkspace().id), fileService, logService);
    }
};
BrowserWorkingCopyBackupService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IFileService),
    __param(3, ILogService)
], BrowserWorkingCopyBackupService);
export { BrowserWorkingCopyBackupService };
// Register Service
registerSingleton(IWorkingCopyBackupService, BrowserWorkingCopyBackupService, 0 /* InstantiationType.Eager */);
// Register Backup Tracker
registerWorkbenchContribution2(BrowserWorkingCopyBackupTracker.ID, BrowserWorkingCopyBackupTracker, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2Jyb3dzZXIvd29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFeEUsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSx3QkFBd0I7SUFDNUUsWUFDMkIsY0FBd0MsRUFDcEMsa0JBQWdELEVBQ2hFLFdBQXlCLEVBQzFCLFVBQXVCO1FBRXBDLEtBQUssQ0FDSixRQUFRLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFDN0YsV0FBVyxFQUNYLFVBQVUsQ0FDVixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFiWSwrQkFBK0I7SUFFekMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLDRCQUE0QixDQUFBO0lBQzVCLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7R0FMRCwrQkFBK0IsQ0FhM0M7O0FBRUQsbUJBQW1CO0FBQ25CLGlCQUFpQixDQUNoQix5QkFBeUIsRUFDekIsK0JBQStCLGtDQUUvQixDQUFBO0FBRUQsMEJBQTBCO0FBQzFCLDhCQUE4QixDQUM3QiwrQkFBK0IsQ0FBQyxFQUFFLEVBQ2xDLCtCQUErQixzQ0FFL0IsQ0FBQSJ9