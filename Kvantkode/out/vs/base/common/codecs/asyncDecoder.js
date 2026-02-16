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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb2RlY3MvYXN5bmNEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUc1Qzs7R0FFRztBQUNILE1BQU0sT0FBTyxZQUdYLFNBQVEsVUFBVTtJQVluQjs7Ozs7T0FLRztJQUNILFlBQTZCLE9BQTBCO1FBQ3RELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQW1CO1FBakJ2RCxrRUFBa0U7UUFDakQsYUFBUSxHQUFRLEVBQUUsQ0FBQTtRQW1CbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUM7UUFDNUIsNERBQTREO1FBQzVELE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBUSxFQUFFLEVBQUU7WUFDN0IsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3pCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM3QyxDQUFDO1lBRUQsOENBQThDO1lBQzlDLHdDQUF3QztZQUN4QyxJQUFJLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO2dCQUM1QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDeEIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUE7WUFDOUIsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFFaEMsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFcEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUNiLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDMUMsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sWUFBWSxDQUFBO2dCQUNsQixTQUFRO1lBQ1QsQ0FBQztZQUVELG9EQUFvRDtZQUNwRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFFZCxPQUFPLElBQUksQ0FBQTtZQUNaLENBQUM7WUFFRCx5Q0FBeUM7WUFDekMsdUNBQXVDO1lBQ3ZDLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQTtZQUNqQyxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0NBQ0QifQ==