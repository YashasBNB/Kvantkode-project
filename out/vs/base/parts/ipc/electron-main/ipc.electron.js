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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvZWxlY3Ryb24tbWFpbi9pcGMuZWxlY3Ryb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3pELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RSxPQUFPLEVBQXlCLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLElBQUksZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQU94RSxTQUFTLDBCQUEwQixDQUFDLFFBQWdCLEVBQUUsU0FBaUI7SUFDdEUsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUMzQyxnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUN4QyxDQUFBO0lBQ0QsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxDQUFBO0lBRWhHLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUNyRCxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDMUMsQ0FBQTtBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxNQUFPLFNBQVEsU0FBUzthQUNaLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQTtJQUV4RCxNQUFNLENBQUMscUJBQXFCO1FBQ25DLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxvQkFBb0IsQ0FDekMsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FDdEIsQ0FBQTtRQUVELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN6QyxNQUFNLEVBQUUsR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFBO1lBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBRXJDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUVqQixNQUFNLG9CQUFvQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUE7WUFDaEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQ2pCLEVBQUUsRUFDRixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FDL0MsQ0FBQTtZQUVELE1BQU0sU0FBUyxHQUFHLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBb0IsQ0FBQTtZQUNyRixNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQ3RDLEtBQUssQ0FBQyxNQUFNLENBQUMsMEJBQTBCLENBQUMsRUFBRSxFQUFFLG1CQUFtQixDQUFDLENBQUMsRUFDakUsb0JBQW9CLENBQUMsS0FBSyxDQUMxQixDQUFBO1lBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFFN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxDQUFBO1FBQzNDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVEO1FBQ0MsS0FBSyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDLENBQUE7SUFDdEMsQ0FBQyJ9