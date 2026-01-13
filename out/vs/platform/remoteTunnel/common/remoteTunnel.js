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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVHVubmVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGVUdW5uZWwvY29tbW9uL3JlbW90ZVR1bm5lbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBUzFDLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGVBQWUsQ0FBdUIsc0JBQXNCLENBQUMsQ0FBQTtBQTRCakcsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQXVCLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFBO0FBV3pFLE1BQU0sS0FBVyxZQUFZLENBNEI1QjtBQTVCRCxXQUFpQixZQUFZO0lBaUJmLHlCQUFZLEdBQUcsQ0FBQyxhQUFvQyxFQUFnQixFQUFFLENBQUMsQ0FBQztRQUNwRixJQUFJLEVBQUUsY0FBYztRQUNwQixhQUFhO0tBQ2IsQ0FBQyxDQUFBO0lBQ1csc0JBQVMsR0FBRyxDQUFDLElBQW9CLEVBQUUsb0JBQTZCLEVBQWEsRUFBRSxDQUFDLENBQUM7UUFDN0YsSUFBSSxFQUFFLFdBQVc7UUFDakIsSUFBSTtRQUNKLG9CQUFvQjtLQUNwQixDQUFDLENBQUE7SUFDVyx1QkFBVSxHQUFHLENBQUMsUUFBaUIsRUFBYyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUNsRiwwQkFBYSxHQUFrQixFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsQ0FBQTtBQUN0RSxDQUFDLEVBNUJnQixZQUFZLEtBQVosWUFBWSxRQTRCNUI7QUFTRCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyx1QkFBdUIsQ0FBQTtBQUMvRCxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRyx3QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQTtBQUN6RixNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyx3QkFBd0IsR0FBRyxlQUFlLENBQUE7QUFFekYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLHFCQUFxQixDQUFBO0FBQzNDLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQSJ9