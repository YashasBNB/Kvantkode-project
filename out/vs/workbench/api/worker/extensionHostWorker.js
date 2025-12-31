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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFdvcmtlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvd29ya2VyL2V4dGVuc2lvbkhvc3RXb3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sZUFBZSxFQUVmLG1CQUFtQixHQUVuQixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN2RixPQUFPLEtBQUssSUFBSSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFFbEUsT0FBTyxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFxQmpELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3pDLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFBO0FBRTVELE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtBQUNoRCxJQUFJLENBQUMsV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFL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