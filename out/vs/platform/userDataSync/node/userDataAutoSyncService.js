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
//
import { Event } from '../../../base/common/event.js';
import { INativeHostService } from '../../native/common/native.js';
import { IProductService } from '../../product/common/productService.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { UserDataAutoSyncService as BaseUserDataAutoSyncService } from '../common/userDataAutoSyncService.js';
import { IUserDataSyncEnablementService, IUserDataSyncLogService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, } from '../common/userDataSync.js';
import { IUserDataSyncAccountService } from '../common/userDataSyncAccount.js';
import { IUserDataSyncMachinesService } from '../common/userDataSyncMachines.js';
let UserDataAutoSyncService = class UserDataAutoSyncService extends BaseUserDataAutoSyncService {
    constructor(productService, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncEnablementService, userDataSyncService, nativeHostService, logService, authTokenService, telemetryService, userDataSyncMachinesService, storageService) {
        super(productService, userDataSyncStoreManagementService, userDataSyncStoreService, userDataSyncEnablementService, userDataSyncService, logService, authTokenService, telemetryService, userDataSyncMachinesService, storageService);
        this._register(Event.debounce(Event.any(Event.map(nativeHostService.onDidFocusMainWindow, () => 'windowFocus'), Event.map(nativeHostService.onDidOpenMainWindow, () => 'windowOpen')), (last, source) => (last ? [...last, source] : [source]), 1000)((sources) => this.triggerSync(sources, { skipIfSyncedRecently: true })));
    }
};
UserDataAutoSyncService = __decorate([
    __param(0, IProductService),
    __param(1, IUserDataSyncStoreManagementService),
    __param(2, IUserDataSyncStoreService),
    __param(3, IUserDataSyncEnablementService),
    __param(4, IUserDataSyncService),
    __param(5, INativeHostService),
    __param(6, IUserDataSyncLogService),
    __param(7, IUserDataSyncAccountService),
    __param(8, ITelemetryService),
    __param(9, IUserDataSyncMachinesService),
    __param(10, IStorageService)
], UserDataAutoSyncService);
export { UserDataAutoSyncService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFBdXRvU3luY1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvbm9kZS91c2VyRGF0YUF1dG9TeW5jU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxFQUFFO0FBQ0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHVCQUF1QixJQUFJLDJCQUEyQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0csT0FBTyxFQUNOLDhCQUE4QixFQUM5Qix1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLG1DQUFtQyxFQUNuQyx5QkFBeUIsR0FDekIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV6RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLDJCQUEyQjtJQUN2RSxZQUNrQixjQUErQixFQUVoRCxrQ0FBdUUsRUFDNUMsd0JBQW1ELEVBQzlDLDZCQUE2RCxFQUN2RSxtQkFBeUMsRUFDM0MsaUJBQXFDLEVBQ2hDLFVBQW1DLEVBQy9CLGdCQUE2QyxFQUN2RCxnQkFBbUMsRUFDeEIsMkJBQXlELEVBQ3RFLGNBQStCO1FBRWhELEtBQUssQ0FDSixjQUFjLEVBQ2Qsa0NBQWtDLEVBQ2xDLHdCQUF3QixFQUN4Qiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLDJCQUEyQixFQUMzQixjQUFjLENBQ2QsQ0FBQTtRQUVELElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLFFBQVEsQ0FDYixLQUFLLENBQUMsR0FBRyxDQUNSLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQ3RFLEtBQUssQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQ3BFLEVBQ0QsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUN2RCxJQUFJLENBQ0osQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQ3pFLENBQUE7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXZDWSx1QkFBdUI7SUFFakMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLG1DQUFtQyxDQUFBO0lBRW5DLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSw0QkFBNEIsQ0FBQTtJQUM1QixZQUFBLGVBQWUsQ0FBQTtHQWJMLHVCQUF1QixDQXVDbkMifQ==