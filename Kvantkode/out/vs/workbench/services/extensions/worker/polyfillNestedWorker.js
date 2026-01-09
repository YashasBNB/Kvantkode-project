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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9seWZpbGxOZXN0ZWRXb3JrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL3dvcmtlci9wb2x5ZmlsbE5lc3RlZFdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRyxNQUFNLGtCQUFrQixHQUFHLFNBQVMsWUFBWSxDQUFDLFNBQWlCO0lBQ2pFLE1BQU0sUUFBUSxHQUFrQixDQUFDLEtBQVksRUFBUSxFQUFFO1FBQ3RELG9CQUFvQjtRQUNwQixVQUFVLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRW5ELFdBQVc7UUFDWCxNQUFNLElBQUksR0FBK0IsS0FBTSxDQUFDLElBQUksQ0FBQTtRQUVwRCxjQUFjO1FBQ2QsWUFBWTtRQUNaLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUU7WUFDbkMsV0FBVyxFQUFFO2dCQUNaLEtBQUssQ0FBQyxJQUFTLEVBQUUsaUJBQXVCO29CQUN2QyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO2dCQUMxQyxDQUFDO2FBQ0Q7WUFDRCxTQUFTLEVBQUU7Z0JBQ1YsR0FBRztvQkFDRixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7Z0JBQ3RCLENBQUM7Z0JBQ0QsR0FBRyxDQUFDLEtBQTBCO29CQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtnQkFDdkIsQ0FBQzthQUNEO1lBQ0QsZUFBZTtTQUNmLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUN4QyxVQUFVLENBQUMsYUFBYSxDQUN2QixJQUFJLFlBQVksQ0FBQyxTQUFT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