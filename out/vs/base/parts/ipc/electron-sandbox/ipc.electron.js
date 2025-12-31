/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../common/buffer.js';
import { Event } from '../../../common/event.js';
import { IPCClient } from '../common/ipc.js';
import { Protocol as ElectronProtocol } from '../common/ipc.electron.js';
import { ipcRenderer } from '../../sandbox/electron-sandbox/globals.js';
/**
 * An implementation of `IPCClient` on top of Electron `ipcRenderer` IPC communication
 * provided from sandbox globals (via preload script).
 */
export class Client extends IPCClient {
    static createProtocol() {
        const onMessage = Event.fromNodeEventEmitter(ipcRenderer, 'vscode:message', (_, message) => VSBuffer.wrap(message));
        ipcRenderer.send('vscode:hello');
        return new ElectronProtocol(ipcRenderer, onMessage);
    }
    constructor(id) {
        const protocol = Client.createProtocol();
        super(protocol, id);
        this.protocol = protocol;
    }
    dispose() {
        this.protocol.disconnect();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvZWxlY3Ryb24tc2FuZGJveC9pcGMuZWxlY3Ryb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDNUMsT0FBTyxFQUFFLFFBQVEsSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV2RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sTUFBTyxTQUFRLFNBQVM7SUFHNUIsTUFBTSxDQUFDLGNBQWM7UUFDNUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUMzQyxXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FDdEMsQ0FBQTtRQUNELFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7UUFFaEMsT0FBTyxJQUFJLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsWUFBWSxFQUFVO1FBQ3JCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQTtRQUN4QyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRW5CLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO0lBQ3pCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUMxQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEIn0=