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
import { WorkingCopyBackupService } from '../common/workingCopyBackupService.js';
import { URI } from '../../../../base/common/uri.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyBackupService } from '../common/workingCopyBackup.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { NativeWorkingCopyBackupTracker } from './workingCopyBackupTracker.js';
let NativeWorkingCopyBackupService = class NativeWorkingCopyBackupService extends WorkingCopyBackupService {
    constructor(environmentService, fileService, logService, lifecycleService) {
        super(environmentService.backupPath
            ? URI.file(environmentService.backupPath).with({
                scheme: environmentService.userRoamingDataHome.scheme,
            })
            : undefined, fileService, logService);
        this.lifecycleService = lifecycleService;
        this.registerListeners();
    }
    registerListeners() {
        // Lifecycle: ensure to prolong the shutdown for as long
        // as pending backup operations have not finished yet.
        // Otherwise, we risk writing partial backups to disk.
        this._register(this.lifecycleService.onWillShutdown((event) => event.join(this.joinBackups(), {
            id: 'join.workingCopyBackups',
            label: localize('join.workingCopyBackups', 'Backup working copies'),
        })));
    }
};
NativeWorkingCopyBackupService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, ILogService),
    __param(3, ILifecycleService)
], NativeWorkingCopyBackupService);
export { NativeWorkingCopyBackupService };
// Register Service
registerSingleton(IWorkingCopyBackupService, NativeWorkingCopyBackupService, 0 /* InstantiationType.Eager */);
// Register Backup Tracker
registerWorkbenchContribution2(NativeWorkingCopyBackupTracker.ID, NativeWorkingCopyBackupTracker, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvZWxlY3Ryb24tc2FuZGJveC93b3JraW5nQ29weUJhY2t1cFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RyxPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFdkUsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBK0IsU0FBUSx3QkFBd0I7SUFDM0UsWUFDcUMsa0JBQXNELEVBQzVFLFdBQXlCLEVBQzFCLFVBQXVCLEVBQ0EsZ0JBQW1DO1FBRXZFLEtBQUssQ0FDSixrQkFBa0IsQ0FBQyxVQUFVO1lBQzVCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDN0MsTUFBTSxFQUFFLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLE1BQU07YUFDckQsQ0FBQztZQUNILENBQUMsQ0FBQyxTQUFTLEVBQ1osV0FBVyxFQUNYLFVBQVUsQ0FDVixDQUFBO1FBVm1DLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFZdkUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4Qix3REFBd0Q7UUFDeEQsc0RBQXNEO1FBQ3RELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUM5QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUM5QixFQUFFLEVBQUUseUJBQXlCO1lBQzdCLEtBQUssRUFBRSxRQUFRLENBQUMseUJBQXlCLEVBQUUsdUJBQXVCLENBQUM7U0FDbkUsQ0FBQyxDQUNGLENBQ0QsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBakNZLDhCQUE4QjtJQUV4QyxXQUFBLGtDQUFrQyxDQUFBO0lBQ2xDLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLGlCQUFpQixDQUFBO0dBTFAsOEJBQThCLENBaUMxQzs7QUFFRCxtQkFBbUI7QUFDbkIsaUJBQWlCLENBQ2hCLHlCQUF5QixFQUN6Qiw4QkFBOEIsa0NBRTlCLENBQUE7QUFFRCwwQkFBMEI7QUFDMUIsOEJBQThCLENBQzdCLDhCQUE4QixDQUFDLEVBQUUsRUFDakMsOEJBQThCLHNDQUU5QixDQUFBIn0=