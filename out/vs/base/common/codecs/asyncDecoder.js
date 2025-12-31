/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../lifecycle.js';
/**
 * Asynchronous interator wrapper for a decoder.
 */
export class AsyncDecoder extends Disposable {
    /**
     * @param decoder The decoder instance to wrap.
     *
     * Note! Assumes ownership of the `decoder` object, hence will `dipose`
     * 		 it when the decoder stream is ended.
     */
    constructor(decoder) {
        super();
        this.decoder = decoder;
        // Buffer of messages that have been decoded but not yet consumed.
        this.messages = [];
        this._register(decoder);
    }
    /**
     * Async iterator implementation.
     */
    async *[Symbol.asyncIterator]() {
        // callback is called when `data` or `end` event is received
        const callback = (data) => {
            if (data !== undefined) {
                this.messages.push(data);
            }
            else {
                this.decoder.removeListener('data', callback);
                this.decoder.removeListener('end', callback);
            }
            // is the promise resolve callback is present,
            // then call it and remove the reference
            if (this.resolveOnNewEvent) {
                this.resolveOnNewEvent();
                delete this.resolveOnNewEvent;
            }
        };
        this.decoder.on('data', callback);
        this.decoder.on('end', callback);
        // start flowing the decoder stream
        this.decoder.start();
        while (true) {
            const maybeMessage = this.messages.shift();
            if (maybeMessage !== undefined) {
                yield maybeMessage;
                continue;
            }
            // if no data available and stream ended, we're done
            if (this.decoder.ended) {
                this.dispose();
                return null;
            }
            // stream isn't ended so wait for the new
            // `data` or `end` event to be received
            await new Promise((resolve) => {
                this.resolveOnNewEvent = resolve;
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vY29kZWNzL2FzeW5jRGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHNUM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFHWCxTQUFRLFVBQVU7SUFZbkI7Ozs7O09BS0c7SUFDSCxZQUE2QixPQUEwQjtRQUN0RCxLQUFLLEVBQUUsQ0FBQTtRQURxQixZQUFPLEdBQVAsT0FBTyxDQUFtQjtRQWpCdkQsa0VBQWtFO1FBQ2pELGFBQVEsR0FBUSxFQUFFLENBQUE7UUFtQmxDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDeEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1FBQzVCLDREQUE0RDtRQUM1RCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVEsRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN6QixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUM3QyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDN0MsQ0FBQztZQUVELDhDQUE4QztZQUM5Qyx3Q0FBd0M7WUFDeEMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFBO1lBQzlCLENBQUM7UUFDRixDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRWhDLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRXBCLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDYixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQzFDLElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLFlBQVksQ0FBQTtnQkFDbEIsU0FBUTtZQUNULENBQUM7WUFFRCxvREFBb0Q7WUFDcEQsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7Z0JBRWQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQseUNBQXlDO1lBQ3pDLHVDQUF1QztZQUN2QyxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUE7WUFDakMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztDQUNEIn0=