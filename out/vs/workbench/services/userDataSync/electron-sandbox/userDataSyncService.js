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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91c2VyRGF0YVN5bmMvZWxlY3Ryb24tc2FuZGJveC91c2VyRGF0YVN5bmNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixvQ0FBb0MsRUFDcEMsb0JBQW9CLEVBQ3BCLG1DQUFtQyxHQUNuQyxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3JILE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQy9HLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsK0NBQStDLEdBQy9DLE1BQU0sNkRBQTZELENBQUE7QUFDcEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFFN0csa0NBQWtDLENBQUMsb0JBQW9CLEVBQUUsY0FBYyxFQUFFO0lBQ3hFLGlCQUFpQixFQUFFLGdDQUFnQztDQUNuRCxDQUFDLENBQUE7QUFDRixrQ0FBa0MsQ0FDakMsb0NBQW9DLEVBQ3BDLHNDQUFzQyxDQUN0QyxDQUFBO0FBQ0Qsa0NBQWtDLENBQUMsNEJBQTRCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtBQUN4RixrQ0FBa0MsQ0FBQywyQkFBMkIsRUFBRSxxQkFBcUIsRUFBRTtJQUN0RixpQkFBaUIsRUFBRSx1Q0FBdUM7Q0FDMUQsQ0FBQyxDQUFBO0FBQ0Ysa0NBQWtDLENBQ2pDLG1DQUFtQyxFQUNuQyw2QkFBNkIsRUFDN0IsRUFBRSxpQkFBaUIsRUFBRSwrQ0FBK0MsRUFBRSxDQUN0RSxDQUFBIn0=