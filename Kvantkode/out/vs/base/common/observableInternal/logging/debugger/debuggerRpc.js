/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleTypedRpcConnection, } from './rpc.js';
export function registerDebugChannel(channelId, createClient) {
    const g = globalThis;
    let queuedNotifications = [];
    let curHost = undefined;
    const { channel, handler } = createChannelFactoryFromDebugChannel({
        sendNotification: (data) => {
            if (curHost) {
                curHost.sendNotification(data);
            }
            else {
                queuedNotifications.push(data);
            }
        },
    });
    let curClient = undefined;
    (g.$$debugValueEditor_debugChannels ?? (g.$$debugValueEditor_debugChannels = {}))[channelId] = (host) => {
        curClient = createClient();
        curHost = host;
        for (const n of queuedNotifications) {
            host.sendNotification(n);
        }
        queuedNotifications = [];
        return handler;
    };
    return SimpleTypedRpcConnection.createClient(channel, () => {
        if (!curClient) {
            throw new Error('Not supported');
        }
        return curClient;
    });
}
function createChannelFactoryFromDebugChannel(host) {
    let h;
    const channel = (handler) => {
        h = handler;
        return {
            sendNotification: (data) => {
                host.sendNotification(data);
            },
            sendRequest: (data) => {
                throw new Error('not supported');
            },
        };
    };
    return {
        channel: channel,
        handler: {
            handleRequest: (data) => {
                if (data.type === 'notification') {
                    return h?.handleNotification(data.data);
                }
                else {
                    return h?.handleRequest(data.data);
                }
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXJScGMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9sb2dnaW5nL2RlYnVnZ2VyL2RlYnVnZ2VyUnBjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFJTix3QkFBd0IsR0FFeEIsTUFBTSxVQUFVLENBQUE7QUFFakIsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxTQUF5QixFQUN6QixZQUErQjtJQUUvQixNQUFNLENBQUMsR0FBRyxVQUE4QixDQUFBO0lBRXhDLElBQUksbUJBQW1CLEdBQWMsRUFBRSxDQUFBO0lBQ3ZDLElBQUksT0FBTyxHQUFzQixTQUFTLENBQUE7SUFFMUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxvQ0FBb0MsQ0FBQztRQUNqRSxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzFCLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9CLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7S0FDRCxDQUFDLENBQUE7SUFFRixJQUFJLFNBQVMsR0FBNEIsU0FBUyxDQUVqRDtJQUFBLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdDQUFnQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FDL0YsSUFBSSxFQUNILEVBQUU7UUFDSCxTQUFTLEdBQUcsWUFBWSxFQUFFLENBQUE7UUFDMUIsT0FBTyxHQUFHLElBQUksQ0FBQTtRQUNkLEtBQUssTUFBTSxDQUFDLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekIsQ0FBQztRQUNELG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtRQUN4QixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUMsQ0FBQTtJQUVELE9BQU8sd0JBQXdCLENBQUMsWUFBWSxDQUFJLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDN0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQWFELFNBQVMsb0NBQW9DLENBQUMsSUFBVztJQUl4RCxJQUFJLENBQThCLENBQUE7SUFDbEMsTUFBTSxPQUFPLEdBQW1CLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDM0MsQ0FBQyxHQUFHLE9BQU8sQ0FBQTtRQUNYLE9BQU87WUFDTixnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUNELFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFBO0lBQ0QsT0FBTztRQUNOLE9BQU8sRUFBRSxPQUFPO1FBQ2hCLE9BQU8sRUFBRTtZQUNSLGFBQWEsRUFBRSxDQUFDLElBQVMsRUFBRSxFQUFFO2dCQUM1QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFLENBQUM7b0JBQ2xDLE9BQU8sQ0FBQyxFQUFFLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sQ0FBQyxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ25DLENBQUM7WUFDRixDQUFDO1NBQ0Q7S0FDRCxDQUFBO0FBQ0YsQ0FBQyJ9