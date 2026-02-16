/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
export class ServerTelemetryChannel extends Disposable {
    constructor(telemetryService, telemetryAppender) {
        super();
        this.telemetryService = telemetryService;
        this.telemetryAppender = telemetryAppender;
    }
    async call(_, command, arg) {
        switch (command) {
            case 'updateTelemetryLevel': {
                const { telemetryLevel } = arg;
                return this.telemetryService.updateInjectedTelemetryLevel(telemetryLevel);
            }
            case 'logTelemetry': {
                const { eventName, data } = arg;
                // Logging is done directly to the appender instead of through the telemetry service
                // as the data sent from the client has already had common properties added to it and
                // has already been sent to the telemetry output channel
                if (this.telemetryAppender) {
                    return this.telemetryAppender.log(eventName, data);
                }
                return Promise.resolve();
            }
            case 'flushTelemetry': {
                if (this.telemetryAppender) {
                    return this.telemetryAppender.flush();
                }
                return Promise.resolve();
            }
            case 'ping': {
                return;
            }
        }
        // Command we cannot handle so we throw an error
        throw new Error(`IPC Command ${command} not found`);
    }
    listen(_, event, arg) {
        throw new Error('Not supported');
    }
    /**
     * Disposing the channel also disables the telemetryService as there is
     * no longer a way to control it
     */
    dispose() {
        this.telemetryService.updateInjectedTelemetryLevel(0 /* TelemetryLevel.NONE */);
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVsZW1ldHJ5Q2hhbm5lbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi9yZW1vdGVUZWxlbWV0cnlDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQU05RCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTtJQUNyRCxZQUNrQixnQkFBeUMsRUFDekMsaUJBQTRDO1FBRTdELEtBQUssRUFBRSxDQUFBO1FBSFUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUF5QjtRQUN6QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQTJCO0lBRzlELENBQUM7SUFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQU0sRUFBRSxPQUFlLEVBQUUsR0FBUztRQUM1QyxRQUFRLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEtBQUssc0JBQXNCLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsR0FBRyxDQUFBO2dCQUM5QixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyw0QkFBNEIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUMxRSxDQUFDO1lBRUQsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQTtnQkFDL0Isb0ZBQW9GO2dCQUNwRixxRkFBcUY7Z0JBQ3JGLHdEQUF3RDtnQkFDeEQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztvQkFDNUIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDbkQsQ0FBQztnQkFFRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUN6QixDQUFDO1lBRUQsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQzVCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFBO2dCQUN0QyxDQUFDO2dCQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3pCLENBQUM7WUFFRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBQ0QsZ0RBQWdEO1FBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxPQUFPLFlBQVksQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFFRCxNQUFNLENBQUMsQ0FBTSxFQUFFLEtBQWEsRUFBRSxHQUFRO1FBQ3JDLE1BQU0sSUFBSSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakMsQ0FBQztJQUVEOzs7T0FHRztJQUNhLE9BQU87UUFDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDRCQUE0Qiw2QkFBcUIsQ0FBQTtRQUN2RSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNEIn0=