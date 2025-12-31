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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXJScGMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9kZWJ1Z2dlci9kZWJ1Z2dlclJwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBSU4sd0JBQXdCLEdBRXhCLE1BQU0sVUFBVSxDQUFBO0FBRWpCLE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsU0FBeUIsRUFDekIsWUFBK0I7SUFFL0IsTUFBTSxDQUFDLEdBQUcsVUFBOEIsQ0FBQTtJQUV4QyxJQUFJLG1CQUFtQixHQUFjLEVBQUUsQ0FBQTtJQUN2QyxJQUFJLE9BQU8sR0FBc0IsU0FBUyxDQUFBO0lBRTFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsb0NBQW9DLENBQUM7UUFDakUsZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQixJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMvQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBRUYsSUFBSSxTQUFTLEdBQTRCLFNBQVMsQ0FFakQ7SUFBQSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQy9GLElBQUksRUFDSCxFQUFFO1FBQ0gsU0FBUyxHQUFHLFlBQVksRUFBRSxDQUFBO1FBQzFCLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDZCxLQUFLLE1BQU0sQ0FBQyxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLENBQUM7UUFDRCxtQkFBbUIsR0FBRyxFQUFFLENBQUE7UUFDeEIsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDLENBQUE7SUFFRCxPQUFPLHdCQUF3QixDQUFDLFlBQVksQ0FBSSxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQzdELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ2pDLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFhRCxTQUFTLG9DQUFvQyxDQUFDLElBQVc7SUFJeEQsSUFBSSxDQUE4QixDQUFBO0lBQ2xDLE1BQU0sT0FBTyxHQUFtQixDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzNDLENBQUMsR0FBRyxPQUFPLENBQUE7UUFDWCxPQUFPO1lBQ04sZ0JBQWdCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDMUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzVCLENBQUM7WUFDRCxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNqQyxDQUFDO1NBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQTtJQUNELE9BQU87UUFDTixPQUFPLEVBQUUsT0FBTztRQUNoQixPQUFPLEVBQUU7WUFDUixhQUFhLEVBQUUsQ0FBQyxJQUFTLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRSxDQUFDO29CQUNsQyxPQUFPLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ3hDLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxPQUFPLENBQUMsRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztTQUNEO0tBQ0QsQ0FBQTtBQUNGLENBQUMifQ==