/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IExtensionHostDebugService } from '../../../../platform/debug/common/extensionHostDebug.js';
import { registerMainProcessRemoteService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { ExtensionHostDebugChannelClient, ExtensionHostDebugBroadcastChannel, } from '../../../../platform/debug/common/extensionHostDebugIpc.js';
registerMainProcessRemoteService(IExtensionHostDebugService, ExtensionHostDebugBroadcastChannel.ChannelName, { channelClientCtor: ExtensionHostDebugChannelClient });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uSG9zdERlYnVnU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RyxPQUFPLEVBQ04sK0JBQStCLEVBQy9CLGtDQUFrQyxHQUNsQyxNQUFNLDREQUE0RCxDQUFBO0FBRW5FLGdDQUFnQyxDQUMvQiwwQkFBMEIsRUFDMUIsa0NBQWtDLENBQUMsV0FBVyxFQUM5QyxFQUFFLGlCQUFpQixFQUFFLCtCQUErQixFQUFFLENBQ3RELENBQUEifQ==