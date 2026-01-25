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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm1wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9ub2RlL2lwYy5tcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sZ0JBQWdCLEdBRWhCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFBa0QsU0FBUyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFckQ7OztHQUdHO0FBQ0gsTUFBTSxRQUFRO0lBR2IsWUFBb0IsSUFBcUI7UUFBckIsU0FBSSxHQUFKLElBQUksQ0FBaUI7UUFDeEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsb0JBQW9CLENBQzFDLElBQUksQ0FBQyxJQUFJLEVBQ1QsU0FBUyxFQUNULENBQUMsQ0FBZSxFQUFFLEVBQUU7WUFDbkIsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1lBQ0QsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLENBQUMsQ0FDRCxDQUFBO1FBQ0Qsc0RBQXNEO1FBQ3RELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBaUI7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNsQixDQUFDO0NBQ0Q7QUFjRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sTUFBTyxTQUFRLFNBQVM7SUFDNUIsTUFBTSxDQUFDLHFCQUFxQixDQUNuQyxNQUFnQztRQUVoQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUVqRSxNQUFNLHNCQUFzQixHQUFHLElBQUksT0FBTyxFQUFtQixDQUFBO1FBRTdELE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQWUsRUFBRSxFQUFFO1lBQ3BELElBQUksTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUIsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixzQkFBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3ZELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRW5DLE1BQU0sTUFBTSxHQUEwQjtnQkFDckMsUUFBUTtnQkFDUix3RUFBd0U7Z0JBQ3hFLG9FQUFvRTtnQkFDcEUsK0ZBQStGO2dCQUMvRixxQkFBcUIsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQzthQUNoRSxDQUFBO1lBRUQsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxZQUFZLE1BQWdDO1FBQzNDLEtBQUssQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0Q7QUFPRCxNQUFNLFVBQVUsSUFBSSxDQUFDLElBQThCLEVBQUUsT0FBZ0IsRUFBRSxRQUFvQjtJQUMxRixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQWUsRUFBRSxFQUFFO1FBQ3BDLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUN4QyxRQUFRLEVBQUUsQ0FBQTtRQUNYLENBQUM7SUFDRixDQUFDLENBQUE7SUFFRCxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUM3QixDQUFDIn0=