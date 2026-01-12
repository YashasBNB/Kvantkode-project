/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validatedIpcMain } from './ipcMain.js';
import { VSBuffer } from '../../../common/buffer.js';
import { Emitter, Event } from '../../../common/event.js';
import { toDisposable } from '../../../common/lifecycle.js';
import { IPCServer } from '../common/ipc.js';
import { Protocol as ElectronProtocol } from '../common/ipc.electron.js';
function createScopedOnMessageEvent(senderId, eventName) {
    const onMessage = Event.fromNodeEventEmitter(validatedIpcMain, eventName, (event, message) => ({ event, message }));
    const onMessageFromSender = Event.filter(onMessage, ({ event }) => event.sender.id === senderId);
    return Event.map(onMessageFromSender, ({ message }) => message ? VSBuffer.wrap(message) : message);
}
/**
 * An implementation of `IPCServer` on top of Electron `ipcMain` API.
 */
export class Server extends IPCServer {
    static { this.Clients = new Map(); }
    static getOnDidClientConnect() {
        const onHello = Event.fromNodeEventEmitter(validatedIpcMain, 'vscode:hello', ({ sender }) => sender);
        return Event.map(onHello, (webContents) => {
            const id = webContents.id;
            const client = Server.Clients.get(id);
            client?.dispose();
            const onDidClientReconnect = new Emitter();
            Server.Clients.set(id, toDisposable(() => onDidClientReconnect.fire()));
            const onMessage = createScopedOnMessageEvent(id, 'vscode:message');
            const onDidClientDisconnect = Event.any(Event.signal(createScopedOnMessageEvent(id, 'vscode:disconnect')), onDidClientReconnect.event);
            const protocol = new ElectronProtocol(webContents, onMessage);
            return { protocol, onDidClientDisconnect };
        });
    }
    constructor() {
        super(Server.getOnDidClientConnect());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9lbGVjdHJvbi1tYWluL2lwYy5lbGVjdHJvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDL0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hFLE9BQU8sRUFBeUIsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBT3hFLFNBQVMsMEJBQTBCLENBQUMsUUFBZ0IsRUFBRSxTQUFpQjtJQUN0RSxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQzNDLGdCQUFnQixFQUNoQixTQUFTLEVBQ1QsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQ3hDLENBQUE7SUFDRCxNQUFNLG1CQUFtQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUE7SUFFaEcsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQ3JELE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUMxQyxDQUFBO0FBQ0YsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxTQUFTO2FBQ1osWUFBTyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFBO0lBRXhELE1BQU0sQ0FBQyxxQkFBcUI7UUFDbkMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUN6QyxnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUN0QixDQUFBO1FBRUQsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ3pDLE1BQU0sRUFBRSxHQUFHLFdBQVcsQ0FBQyxFQUFFLENBQUE7WUFDekIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7WUFFckMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBRWpCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtZQUNoRCxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDakIsRUFBRSxFQUNGLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUMvQyxDQUFBO1lBRUQsTUFBTSxTQUFTLEdBQUcsMEJBQTBCLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFvQixDQUFBO1lBQ3JGLE1BQU0scUJBQXFCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDdEMsS0FBSyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxFQUNqRSxvQkFBb0IsQ0FBQyxLQUFLLENBQzFCLENBQUE7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUU3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLENBQUE7UUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQ7UUFDQyxLQUFLLENBQUMsTUFBTSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtJQUN0QyxDQUFDIn0=