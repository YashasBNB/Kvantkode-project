/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { isMessageOfType, createMessageOfType, } from '../../services/extensions/common/extensionHostProtocol.js';
import { ExtensionHostMain } from '../common/extensionHostMain.js';
import { NestedWorker } from '../../services/extensions/worker/polyfillNestedWorker.js';
import * as path from '../../../base/common/path.js';
import * as performance from '../../../base/common/performance.js';
import '../common/extHost.common.services.js';
import './extHost.worker.services.js';
import { FileAccess } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
const nativeClose = self.close.bind(self);
self.close = () => console.trace(`'close' has been blocked`);
const nativePostMessage = postMessage.bind(self);
self.postMessage = () => console.trace(`'postMessage' has been blocked`);
function shouldTransformUri(uri) {
    // In principle, we could convert any URI, but we have concerns
    // that parsing https URIs might end up decoding escape characters
    // and result in an unintended transformation
    return /^(file|vscode-remote):/i.test(uri);
}
const nativeFetch = fetch.bind(self);
function patchFetching(asBrowserUri) {
    self.fetch = async function (input, init) {
        if (input instanceof Request) {
            // Request object - massage not supported
            return nativeFetch(input, init);
        }
        if (shouldTransformUri(String(input))) {
            input = (await asBrowserUri(URI.parse(String(input)))).toString(true);
        }
        return nativeFetch(input, init);
    };
    self.XMLHttpRequest = class extends XMLHttpRequest {
        open(method, url, async, username, password) {
            ;
            (async () => {
                if (shouldTransformUri(url.toString())) {
                    url = (await asBrowserUri(URI.parse(url.toString()))).toString(true);
                }
                super.open(method, url, async ?? true, username, password);
            })();
        }
    };
}
self.importScripts = () => {
    throw new Error(`'importScripts' has been blocked`);
};
// const nativeAddEventListener = addEventListener.bind(self);
self.addEventListener = () => console.trace(`'addEventListener' has been blocked`);
self['AMDLoader'] = undefined;
self['NLSLoaderPlugin'] = undefined;
self['define'] = undefined;
self['require'] = undefined;
self['webkitRequestFileSystem'] = undefined;
self['webkitRequestFileSystemSync'] = undefined;
self['webkitResolveLocalFileSystemSyncURL'] = undefined;
self['webkitResolveLocalFileSystemURL'] = undefined;
if (self.Worker) {
    // make sure new Worker(...) always uses blob: (to maintain current origin)
    const _Worker = self.Worker;
    Worker = function (stringUrl, options) {
        if (/^file:/i.test(stringUrl.toString())) {
            stringUrl = FileAccess.uriToBrowserUri(URI.parse(stringUrl.toString())).toString(true);
        }
        else if (/^vscode-remote:/i.test(stringUrl.toString())) {
            // Supporting transformation of vscode-remote URIs requires an async call to the main thread,
            // but we cannot do this call from within the embedded Worker, and the only way out would be
            // to use templating instead of a function in the web api (`resourceUriProvider`)
            throw new Error(`Creating workers from remote extensions is currently not supported.`);
        }
        // IMPORTANT: bootstrapFn is stringified and injected as worker blob-url. Because of that it CANNOT
        // have dependencies on other functions or variables. Only constant values are supported. Due to
        // that logic of FileAccess.asBrowserUri had to be copied, see `asWorkerBrowserUrl` (below).
        const bootstrapFnSource = function bootstrapFn(workerUrl) {
            function asWorkerBrowserUrl(url) {
                if (typeof url === 'string' || url instanceof URL) {
                    return String(url).replace(/^file:\/\//i, 'vscode-file://vscode-app');
                }
                return url;
            }
            const nativeFetch = fetch.bind(self);
            self.fetch = function (input, init) {
                if (input instanceof Request) {
                    // Request object - massage not supported
                    return nativeFetch(input, init);
                }
                return nativeFetch(asWorkerBrowserUrl(input), init);
            };
            self.XMLHttpRequest = class extends XMLHttpRequest {
                open(method, url, async, username, password) {
                    return super.open(method, asWorkerBrowserUrl(url), async ?? true, username, password);
                }
            };
            const nativeImportScripts = importScripts.bind(self);
            self.importScripts = (...urls) => {
                nativeImportScripts(...urls.map(asWorkerBrowserUrl));
            };
            nativeImportScripts(workerUrl);
        }.toString();
        const js = `(${bootstrapFnSource}('${stringUrl}'))`;
        options = options || {};
        options.name = `${name} -> ${options.name || path.basename(stringUrl.toString())}`;
        const blob = new Blob([js], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        return new _Worker(blobUrl, options);
    };
}
else {
    ;
    self.Worker = class extends NestedWorker {
        constructor(stringOrUrl, options) {
            super(nativePostMessage, stringOrUrl, {
                name: path.basename(stringOrUrl.toString()),
                ...options,
            });
        }
    };
}
//#endregion ---
const hostUtil = new (class {
    constructor() {
        this.pid = undefined;
    }
    exit(_code) {
        nativeClose();
    }
})();
class ExtensionWorker {
    constructor() {
        const channel = new MessageChannel();
        const emitter = new Emitter();
        let terminating = false;
        // send over port2, keep port1
        nativePostMessage(channel.port2, [channel.port2]);
        channel.port1.onmessage = (event) => {
            const { data } = event;
            if (!(data instanceof ArrayBuffer)) {
                console.warn('UNKNOWN data received', data);
                return;
            }
            const msg = VSBuffer.wrap(new Uint8Array(data, 0, data.byteLength));
            if (isMessageOfType(msg, 2 /* MessageType.Terminate */)) {
                // handle terminate-message right here
                terminating = true;
                onTerminate('received terminate message from renderer');
                return;
            }
            // emit non-terminate messages to the outside
            emitter.fire(msg);
        };
        this.protocol = {
            onMessage: emitter.event,
            send: (vsbuf) => {
                if (!terminating) {
                    const data = vsbuf.buffer.buffer.slice(vsbuf.buffer.byteOffset, vsbuf.buffer.byteOffset + vsbuf.buffer.byteLength);
                    channel.port1.postMessage(data, [data]);
                }
            },
        };
    }
}
function connectToRenderer(protocol) {
    return new Promise((resolve) => {
        const once = protocol.onMessage((raw) => {
            once.dispose();
            const initData = JSON.parse(raw.toString());
            protocol.send(createMessageOfType(0 /* MessageType.Initialized */));
            resolve({ protocol, initData });
        });
        protocol.send(createMessageOfType(1 /* MessageType.Ready */));
    });
}
let onTerminate = (reason) => nativeClose();
function isInitMessage(a) {
    return !!a && typeof a === 'object' && a.type === 'vscode.init' && a.data instanceof Map;
}
export function create() {
    performance.mark(`code/extHost/willConnectToRenderer`);
    const res = new ExtensionWorker();
    return {
        onmessage(message) {
            if (!isInitMessage(message)) {
                return; // silently ignore foreign messages
            }
            connectToRenderer(res.protocol).then((data) => {
                performance.mark(`code/extHost/didWaitForInitData`);
                const extHostMain = new ExtensionHostMain(data.protocol, data.initData, hostUtil, null, message.data);
                patchFetching((uri) => extHostMain.asBrowserUri(uri));
                onTerminate = (reason) => extHostMain.terminate(reason);
            });
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS93b3JrZXIvZXh0ZW5zaW9uSG9zdFdvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFDTixlQUFlLEVBRWYsbUJBQW1CLEdBRW5CLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3ZGLE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVsRSxPQUFPLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQXFCakQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7QUFDekMsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUE7QUFFNUQsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ2hELElBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFD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