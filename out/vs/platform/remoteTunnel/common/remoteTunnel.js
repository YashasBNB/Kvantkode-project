/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { localize } from '../../../nls.js';
export const IRemoteTunnelService = createDecorator('IRemoteTunnelService');
export const INACTIVE_TUNNEL_MODE = { active: false };
export var TunnelStates;
(function (TunnelStates) {
    TunnelStates.disconnected = (onTokenFailed) => ({
        type: 'disconnected',
        onTokenFailed,
    });
    TunnelStates.connected = (info, serviceInstallFailed) => ({
        type: 'connected',
        info,
        serviceInstallFailed,
    });
    TunnelStates.connecting = (progress) => ({ type: 'connecting', progress });
    TunnelStates.uninitialized = { type: 'uninitialized' };
})(TunnelStates || (TunnelStates = {}));
export const CONFIGURATION_KEY_PREFIX = 'remote.tunnels.access';
export const CONFIGURATION_KEY_HOST_NAME = CONFIGURATION_KEY_PREFIX + '.hostNameOverride';
export const CONFIGURATION_KEY_PREVENT_SLEEP = CONFIGURATION_KEY_PREFIX + '.preventSleep';
export const LOG_ID = 'remoteTunnelService';
export const LOGGER_NAME = localize('remoteTunnelLog', 'Remote Tunnel Service');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlVHVubmVsL2NvbW1vbi9yZW1vdGVUdW5uZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQVMxQyxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHNCQUFzQixDQUFDLENBQUE7QUE0QmpHLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUF1QixFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQTtBQVd6RSxNQUFNLEtBQVcsWUFBWSxDQTRCNUI7QUE1QkQsV0FBaUIsWUFBWTtJQWlCZix5QkFBWSxHQUFHLENBQUMsYUFBb0MsRUFBZ0IsRUFBRSxDQUFDLENBQUM7UUFDcEYsSUFBSSxFQUFFLGNBQWM7UUFDcEIsYUFBYTtLQUNiLENBQUMsQ0FBQTtJQUNXLHNCQUFTLEdBQUcsQ0FBQyxJQUFvQixFQUFFLG9CQUE2QixFQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQzdGLElBQUksRUFBRSxXQUFXO1FBQ2pCLElBQUk7UUFDSixvQkFBb0I7S0FDcEIsQ0FBQyxDQUFBO0lBQ1csdUJBQVUsR0FBRyxDQUFDLFFBQWlCLEVBQWMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7SUFDbEYsMEJBQWEsR0FBa0IsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLENBQUE7QUFDdEUsQ0FBQyxFQTVCZ0IsWUFBWSxLQUFaLFlBQVksUUE0QjVCO0FBU0QsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsdUJBQXVCLENBQUE7QUFDL0QsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsd0JBQXdCLEdBQUcsbUJBQW1CLENBQUE7QUFDekYsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsd0JBQXdCLEdBQUcsZUFBZSxDQUFBO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxxQkFBcUIsQ0FBQTtBQUMzQyxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHVCQUF1QixDQUFDLENBQUEifQ==