/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const _bootstrapFnSource = function _bootstrapFn(workerUrl) {
    const listener = (event) => {
        // uninstall handler
        globalThis.removeEventListener('message', listener);
        // get data
        const port = event.data;
        // postMessage
        // onmessage
        Object.defineProperties(globalThis, {
            postMessage: {
                value(data, transferOrOptions) {
                    port.postMessage(data, transferOrOptions);
                },
            },
            onmessage: {
                get() {
                    return port.onmessage;
                },
                set(value) {
                    port.onmessage = value;
                },
            },
            // todo onerror
        });
        port.addEventListener('message', (msg) => {
            globalThis.dispatchEvent(new MessageEvent('message', {
                data: msg.data,
                ports: msg.ports ? [...msg.ports] : undefined,
            }));
        });
        port.start();
        // fake recursively nested worker
        globalThis.Worker = class {
            constructor() {
                throw new TypeError('Nested workers from within nested worker are NOT supported.');
            }
        };
        // load module
        importScripts(workerUrl);
    };
    globalThis.addEventListener('message', listener);
}.toString();
export class NestedWorker extends EventTarget {
    constructor(nativePostMessage, stringOrUrl, options) {
        super();
        this.onmessage = null;
        this.onmessageerror = null;
        this.onerror = null;
        // create bootstrap script
        const bootstrap = `((${_bootstrapFnSource})('${stringOrUrl}'))`;
        const blob = new Blob([bootstrap], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const channel = new MessageChannel();
        const id = blobUrl; // works because blob url is unique, needs ID pool otherwise
        const msg = {
            type: '_newWorker',
            id,
            port: channel.port2,
            url: blobUrl,
            options,
        };
        nativePostMessage(msg, [channel.port2]);
        // worker-impl: functions
        this.postMessage = channel.port1.postMessage.bind(channel.port1);
        this.terminate = () => {
            const msg = {
                type: '_terminateWorker',
                id,
            };
            nativePostMessage(msg);
            URL.revokeObjectURL(blobUrl);
            channel.port1.close();
            channel.port2.close();
        };
        // worker-impl: events
        Object.defineProperties(this, {
            onmessage: {
                get() {
                    return channel.port1.onmessage;
                },
                set(value) {
                    channel.port1.onmessage = value;
                },
            },
            onmessageerror: {
                get() {
                    return channel.port1.onmessageerror;
                },
                set(value) {
                    channel.port1.onmessageerror = value;
                },
            },
            // todo onerror
        });
        channel.port1.addEventListener('messageerror', (evt) => {
            const msgEvent = new MessageEvent('messageerror', { data: evt.data });
            this.dispatchEvent(msgEvent);
        });
        channel.port1.addEventListener('message', (evt) => {
            const msgEvent = new MessageEvent('message', { data: evt.data });
            this.dispatchEvent(msgEvent);
        });
        channel.port1.start();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGxOZXN0ZWRXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy93b3JrZXIvcG9seWZpbGxOZXN0ZWRXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFXaEcsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLFlBQVksQ0FBQyxTQUFpQjtJQUNqRSxNQUFNLFFBQVEsR0FBa0IsQ0FBQyxLQUFZLEVBQVEsRUFBRTtRQUN0RCxvQkFBb0I7UUFDcEIsVUFBVSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUVuRCxXQUFXO1FBQ1gsTUFBTSxJQUFJLEdBQStCLEtBQU0sQ0FBQyxJQUFJLENBQUE7UUFFcEQsY0FBYztRQUNkLFlBQVk7UUFDWixNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFO1lBQ25DLFdBQVcsRUFBRTtnQkFDWixLQUFLLENBQUMsSUFBUyxFQUFFLGlCQUF1QjtvQkFDdkMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtnQkFDMUMsQ0FBQzthQUNEO1lBQ0QsU0FBUyxFQUFFO2dCQUNWLEdBQUc7b0JBQ0YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO2dCQUN0QixDQUFDO2dCQUNELEdBQUcsQ0FBQyxLQUEwQjtvQkFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUE7Z0JBQ3ZCLENBQUM7YUFDRDtZQUNELGVBQWU7U0FDZixDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDeEMsVUFBVSxDQUFDLGFBQWEsQ0FDdkIsSUFBSSxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUMzQixJQUFJLEVBQUUs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