/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validatedIpcMain } from './ipcMain.js';
import { Event } from '../../../common/event.js';
import { generateUuid } from '../../../common/uuid.js';
import { Client as MessagePortClient } from '../common/ipc.mp.js';
/**
 * An implementation of a `IPCClient` on top of Electron `MessagePortMain`.
 */
export class Client extends MessagePortClient {
    /**
     * @param clientId a way to uniquely identify this client among
     * other clients. this is important for routing because every
     * client can also be a server
     */
    constructor(port, clientId) {
        super({
            addEventListener: (type, listener) => port.addListener(type, listener),
            removeEventListener: (type, listener) => port.removeListener(type, listener),
            postMessage: (message) => port.postMessage(message),
            start: () => port.start(),
            close: () => port.close(),
        }, clientId);
    }
}
/**
 * This method opens a message channel connection
 * in the target window. The target window needs
 * to use the `Server` from `electron-sandbox/ipc.mp`.
 */
export async function connect(window) {
    // Assert healthy window to talk to
    if (window.isDestroyed() || window.webContents.isDestroyed()) {
        throw new Error('ipc.mp#connect: Cannot talk to window because it is closed or destroyed');
    }
    // Ask to create message channel inside the window
    // and send over a UUID to correlate the response
    const nonce = generateUuid();
    window.webContents.send('vscode:createMessageChannel', nonce);
    // Wait until the window has returned the `MessagePort`
    // We need to filter by the `nonce` to ensure we listen
    // to the right response.
    const onMessageChannelResult = Event.fromNodeEventEmitter(validatedIpcMain, 'vscode:createMessageChannelResult', (e, nonce) => ({
        nonce,
        port: e.ports[0],
    }));
    const { port } = await Event.toPromise(Event.once(Event.filter(onMessageChannelResult, (e) => e.nonce === nonce)));
    return port;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvZWxlY3Ryb24tbWFpbi9pcGMubXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDdEQsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRWpFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxpQkFBaUI7SUFDNUM7Ozs7T0FJRztJQUNILFlBQVksSUFBcUIsRUFBRSxRQUFnQjtRQUNsRCxLQUFLLENBQ0o7WUFDQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUN0RSxtQkFBbUIsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUM1RSxXQUFXLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDO1lBQ25ELEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ3pCLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO1NBQ3pCLEVBQ0QsUUFBUSxDQUNSLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSxPQUFPLENBQUMsTUFBcUI7SUFDbEQsbUNBQW1DO0lBQ25DLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztRQUM5RCxNQUFNLElBQUksS0FBSyxDQUFDLHlFQUF5RSxDQUFDLENBQUE7SUFDM0YsQ0FBQztJQUVELGtEQUFrRDtJQUNsRCxpREFBaUQ7SUFDakQsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUE7SUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFFN0QsdURBQXVEO0lBQ3ZELHVEQUF1RDtJQUN2RCx5QkFBeUI7SUFDekIsTUFBTSxzQkFBc0IsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBR3RELGdCQUFnQixFQUFFLG1DQUFtQyxFQUFFLENBQUMsQ0FBZSxFQUFFLEtBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUM5RixLQUFLO1FBQ0wsSUFBSSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0tBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLFNBQVMsQ0FDckMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQzFFLENBQUE7SUFFRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==