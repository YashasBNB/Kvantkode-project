/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IUserDataSyncResourceProviderService, IUserDataSyncService, IUserDataSyncStoreManagementService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerSharedProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { UserDataSyncServiceChannelClient } from '../../../../platform/userDataSync/common/userDataSyncServiceIpc.js';
import { IUserDataSyncMachinesService } from '../../../../platform/userDataSync/common/userDataSyncMachines.js';
import { UserDataSyncAccountServiceChannelClient, UserDataSyncStoreManagementServiceChannelClient, } from '../../../../platform/userDataSync/common/userDataSyncIpc.js';
import { IUserDataSyncAccountService } from '../../../../platform/userDataSync/common/userDataSyncAccount.js';
registerSharedProcessRemoteService(IUserDataSyncService, 'userDataSync', {
    channelClientCtor: UserDataSyncServiceChannelClient,
});
registerSharedProcessRemoteService(IUserDataSyncResourceProviderService, 'IUserDataSyncResourceProviderService');
registerSharedProcessRemoteService(IUserDataSyncMachinesService, 'userDataSyncMachines');
registerSharedProcessRemoteService(IUserDataSyncAccountService, 'userDataSyncAccount', {
    channelClientCtor: UserDataSyncAccountServiceChannelClient,
});
registerSharedProcessRemoteService(IUserDataSyncStoreManagementService, 'userDataSyncStoreManagement', { channelClientCtor: UserDataSyncStoreManagementServiceChannelClient });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3VzZXJEYXRhU3luYy9lbGVjdHJvbi1zYW5kYm94L3VzZXJEYXRhU3luY1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLG9DQUFvQyxFQUNwQyxvQkFBb0IsRUFDcEIsbUNBQW1DLEdBQ25DLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDMUcsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDckgsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDL0csT0FBTyxFQUNOLHVDQUF1QyxFQUN2QywrQ0FBK0MsR0FDL0MsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUU3RyxrQ0FBa0MsQ0FBQyxvQkFBb0IsRUFBRSxjQUFjLEVBQUU7SUFDeEUsaUJBQWlCLEVBQUUsZ0NBQWdDO0NBQ25ELENBQUMsQ0FBQTtBQUNGLGtDQUFrQyxDQUNqQyxvQ0FBb0MsRUFDcEMsc0NBQXNDLENBQ3RDLENBQUE7QUFDRCxrQ0FBa0MsQ0FBQyw0QkFBNEIsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO0FBQ3hGLGtDQUFrQyxDQUFDLDJCQUEyQixFQUFFLHFCQUFxQixFQUFFO0lBQ3RGLGlCQUFpQixFQUFFLHVDQUF1QztDQUMxRCxDQUFDLENBQUE7QUFDRixrQ0FBa0MsQ0FDakMsbUNBQW1DLEVBQ25DLDZCQUE2QixFQUM3QixFQUFFLGlCQUFpQixFQUFFLCtDQUErQyxFQUFFLENBQ3RFLENBQUEifQ==