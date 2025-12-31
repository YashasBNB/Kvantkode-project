/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IUpdateService } from '../../../../platform/update/common/update.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { UpdateChannelClient } from '../../../../platform/update/common/updateIpc.js';
registerMainProcessRemoteService(IUpdateService, 'update', {
    channelClientCtor: UpdateChannelClient,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91cGRhdGUvZWxlY3Ryb24tc2FuZGJveC91cGRhdGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVyRixnQ0FBZ0MsQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFO0lBQzFELGlCQUFpQixFQUFFLG1CQUFtQjtDQUN0QyxDQUFDLENBQUEifQ==