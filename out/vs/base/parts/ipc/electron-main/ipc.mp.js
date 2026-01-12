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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9lbGVjdHJvbi1tYWluL2lwYy5tcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDL0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRWhELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxJQUFJLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFakU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sTUFBTyxTQUFRLGlCQUFpQjtJQUM1Qzs7OztPQUlHO0lBQ0gsWUFBWSxJQUFxQixFQUFFLFFBQWdCO1FBQ2xELEtBQUssQ0FDSjtZQUNDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1lBQ3RFLG1CQUFtQixFQUFFLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDO1lBQzVFLFdBQVcsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUM7WUFDbkQsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDekIsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7U0FDekIsRUFDRCxRQUFRLENBQ1IsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVEOzs7O0dBSUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLE9BQU8sQ0FBQyxNQUFxQjtJQUNsRCxtQ0FBbUM7SUFDbkMsSUFBSSxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDO1FBQzlELE1BQU0sSUFBSSxLQUFLLENBQUMseUVBQXlFLENBQUMsQ0FBQTtJQUMzRixDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELGlEQUFpRDtJQUNqRCxNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQTtJQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUU3RCx1REFBdUQ7SUFDdkQsdURBQXVEO0lBQ3ZELHlCQUF5QjtJQUN6QixNQUFNLHNCQUFzQixHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FHdEQsZ0JBQWdCLEVBQUUsbUNBQW1DLEVBQUUsQ0FBQyxDQUFlLEVBQUUsS0FBYSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlGLEtBQUs7UUFDTCxJQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDaEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUNyQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FDMUUsQ0FBQTtJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9