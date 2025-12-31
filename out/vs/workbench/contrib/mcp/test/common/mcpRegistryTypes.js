/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { MCP } from '../../common/modelContextProtocol.js';
/**
 * Implementation of IMcpMessageTransport for testing purposes.
 * Allows tests to easily send/receive messages and control the connection state.
 */
export class TestMcpMessageTransport extends Disposable {
    constructor() {
        super();
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._stateValue = observableValue('testTransportState', {
            state: 1 /* McpConnectionState.Kind.Starting */,
        });
        this.state = this._stateValue;
        this._sentMessages = [];
    }
    /**
     * Send a message through the transport.
     */
    send(message) {
        this._sentMessages.push(message);
    }
    /**
     * Stop the transport.
     */
    stop() {
        this._stateValue.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    // Test Helper Methods
    /**
     * Simulate receiving a message from the server.
     */
    simulateReceiveMessage(message) {
        this._onDidReceiveMessage.fire(message);
    }
    /**
     * Simulates a reply to an 'initialized' request.
     */
    simulateInitialized() {
        if (!this._sentMessages.length) {
            throw new Error('initialize was not called yet');
        }
        this.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: this.getSentMessages()[0].id,
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                capabilities: {
                    tools: {},
                },
                serverInfo: {
                    name: 'Test Server',
                    version: '1.0.0',
                },
            },
        });
    }
    /**
     * Simulate a log event.
     */
    simulateLog(message) {
        this._onDidLog.fire({ level: LogLevel.Info, message });
    }
    /**
     * Set the connection state.
     */
    setConnectionState(state) {
        this._stateValue.set(state, undefined);
    }
    /**
     * Get all messages that have been sent.
     */
    getSentMessages() {
        return [...this._sentMessages];
    }
    /**
     * Clear the sent messages history.
     */
    clearSentMessages() {
        this._sentMessages.length = 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnlUeXBlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZWdpc3RyeVR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFMUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFjdEQ7UUFDQyxLQUFLLEVBQUUsQ0FBQTtRQWRTLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QyxDQUFDLENBQUE7UUFDaEYsYUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFBO1FBRTlCLHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENBQUMsQ0FBQTtRQUN6RSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBRXBELGdCQUFXLEdBQUcsZUFBZSxDQUFxQixvQkFBb0IsRUFBRTtZQUN4RixLQUFLLDBDQUFrQztTQUN2QyxDQUFDLENBQUE7UUFDYyxVQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQTtRQUV2QixrQkFBYSxHQUF5QixFQUFFLENBQUE7SUFJekQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksSUFBSSxDQUFDLE9BQTJCO1FBQ3RDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNJLElBQUk7UUFDVixJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUsseUNBQWlDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsc0JBQXNCO0lBRXRCOztPQUVHO0lBQ0ksc0JBQXNCLENBQUMsT0FBMkI7UUFDeEQsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxtQkFBbUI7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFFRCxJQUFJLENBQUMsc0JBQXNCLENBQUM7WUFDM0IsT0FBTyxFQUFFLEdBQUcsQ0FBQyxlQUFlO1lBQzVCLEVBQUUsRUFBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUF3QixDQUFDLEVBQUU7WUFDeEQsTUFBTSxFQUFFO2dCQUNQLGVBQWUsRUFBRSxHQUFHLENBQUMsdUJBQXVCO2dCQUM1QyxZQUFZLEVBQUU7b0JBQ2IsS0FBSyxFQUFFLEVBQUU7aUJBQ1Q7Z0JBQ0QsVUFBVSxFQUFFO29CQUNYLElBQUksRUFBRSxhQUFhO29CQUNuQixPQUFPLEVBQUUsT0FBTztpQkFDaEI7YUFDOEI7U0FDaEMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ksV0FBVyxDQUFDLE9BQWU7UUFDakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRDs7T0FFRztJQUNJLGtCQUFrQixDQUFDLEtBQXlCO1FBQ2xELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxlQUFlO1FBQ3JCLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDSSxpQkFBaUI7UUFDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLENBQUM7Q0FDRCJ9