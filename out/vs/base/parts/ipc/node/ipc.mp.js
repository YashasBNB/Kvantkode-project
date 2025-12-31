/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isUtilityProcess, } from '../../sandbox/node/electronTypes.js';
import { VSBuffer } from '../../../common/buffer.js';
import { IPCServer } from '../common/ipc.js';
import { Emitter, Event } from '../../../common/event.js';
import { assertType } from '../../../common/types.js';
/**
 * The MessagePort `Protocol` leverages MessagePortMain style IPC communication
 * for the implementation of the `IMessagePassingProtocol`.
 */
class Protocol {
    constructor(port) {
        this.port = port;
        this.onMessage = Event.fromNodeEventEmitter(this.port, 'message', (e) => {
            if (e.data) {
                return VSBuffer.wrap(e.data);
            }
            return VSBuffer.alloc(0);
        });
        // we must call start() to ensure messages are flowing
        port.start();
    }
    send(message) {
        this.port.postMessage(message.buffer);
    }
    disconnect() {
        this.port.close();
    }
}
/**
 * An implementation of a `IPCServer` on top of MessagePort style IPC communication.
 * The clients register themselves via Electron Utility Process IPC transfer.
 */
export class Server extends IPCServer {
    static getOnDidClientConnect(filter) {
        assertType(isUtilityProcess(process), 'Electron Utility Process');
        const onCreateMessageChannel = new Emitter();
        process.parentPort.on('message', (e) => {
            if (filter?.handledClientConnection(e)) {
                return;
            }
            const port = e.ports.at(0);
            if (port) {
                onCreateMessageChannel.fire(port);
            }
        });
        return Event.map(onCreateMessageChannel.event, (port) => {
            const protocol = new Protocol(port);
            const result = {
                protocol,
                // Not part of the standard spec, but in Electron we get a `close` event
                // when the other side closes. We can use this to detect disconnects
                // (https://github.com/electron/electron/blob/11-x-y/docs/api/message-port-main.md#event-close)
                onDidClientDisconnect: Event.fromNodeEventEmitter(port, 'close'),
            };
            return result;
        });
    }
    constructor(filter) {
        super(Server.getOnDidClientConnect(filter));
    }
}
export function once(port, message, callback) {
    const listener = (e) => {
        if (e.data === message) {
            port.removeListener('message', listener);
            callback();
        }
    };
    port.on('message', listener);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvbm9kZS9pcGMubXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLGdCQUFnQixHQUVoQixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQWtELFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXJEOzs7R0FHRztBQUNILE1BQU0sUUFBUTtJQUdiLFlBQW9CLElBQXFCO1FBQXJCLFNBQUksR0FBSixJQUFJLENBQWlCO1FBQ3hDLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUMxQyxJQUFJLENBQUMsSUFBSSxFQUNULFNBQVMsRUFDVCxDQUFDLENBQWUsRUFBRSxFQUFFO1lBQ25CLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNaLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztZQUNELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6QixDQUFDLENBQ0QsQ0FBQTtRQUNELHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDLE9BQWlCO1FBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsVUFBVTtRQUNULElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDbEIsQ0FBQztDQUNEO0FBY0Q7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLE1BQU8sU0FBUSxTQUFTO0lBQzVCLE1BQU0sQ0FBQyxxQkFBcUIsQ0FDbkMsTUFBZ0M7UUFFaEMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFFakUsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBbUIsQ0FBQTtRQUU3RCxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFlLEVBQUUsRUFBRTtZQUNwRCxJQUFJLE1BQU0sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1Ysc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN2RCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUVuQyxNQUFNLE1BQU0sR0FBMEI7Z0JBQ3JDLFFBQVE7Z0JBQ1Isd0VBQXdFO2dCQUN4RSxvRUFBb0U7Z0JBQ3BFLCtGQUErRjtnQkFDL0YscUJBQXFCLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7YUFDaEUsQ0FBQTtZQUVELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsWUFBWSxNQUFnQztRQUMzQyxLQUFLLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNEO0FBT0QsTUFBTSxVQUFVLElBQUksQ0FBQyxJQUE4QixFQUFFLE9BQWdCLEVBQUUsUUFBb0I7SUFDMUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFlLEVBQUUsRUFBRTtRQUNwQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDeEMsUUFBUSxFQUFFLENBQUE7UUFDWCxDQUFDO0lBQ0YsQ0FBQyxDQUFBO0lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFDN0IsQ0FBQyJ9