/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import minimist from 'minimist';
import * as net from 'net';
import { ProcessTimeRunOnceScheduler } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { isCancellationError, isSigPipeError, onUnexpectedError, } from '../../../base/common/errors.js';
import * as performance from '../../../base/common/performance.js';
import { realpath } from '../../../base/node/extpath.js';
import { Promises } from '../../../base/node/pfs.js';
import { BufferedEmitter, PersistentProtocol, } from '../../../base/parts/ipc/common/ipc.net.js';
import { NodeSocket, WebSocketNodeSocket } from '../../../base/parts/ipc/node/ipc.net.js';
import { boolean } from '../../../editor/common/config/editorOptions.js';
import product from '../../../platform/product/common/product.js';
import { ExtensionHostMain } from '../common/extensionHostMain.js';
import { createURITransformer } from './uriTransformer.js';
import { readExtHostConnection, } from '../../services/extensions/common/extensionHostEnv.js';
import { createMessageOfType, isMessageOfType, } from '../../services/extensions/common/extensionHostProtocol.js';
import '../common/extHost.common.services.js';
import './extHost.node.services.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// workaround for https://github.com/microsoft/vscode/issues/85490
// remove --inspect-port=0 after start so that it doesn't trigger LSP debugging
;
(function removeInspectPort() {
    for (let i = 0; i < process.execArgv.length; i++) {
        if (process.execArgv[i] === '--inspect-port=0') {
            process.execArgv.splice(i, 1);
            i--;
        }
    }
})();
const args = minimist(process.argv.slice(2), {
    boolean: ['transformURIs', 'skipWorkspaceStorageLock'],
    string: [
        'useHostProxy', // 'true' | 'false' | undefined
    ],
});
(function () {
    const Module = require('module');
    const originalLoad = Module._load;
    Module._load = function (request) {
        if (request === 'natives') {
            throw new Error('Either the extension or an NPM dependency is using the [unsupported "natives" node module](https://go.microsoft.com/fwlink/?linkid=871887).');
        }
        return originalLoad.apply(this, arguments);
    };
})();
// custom process.exit logic...
const nativeExit = process.exit.bind(process);
const nativeOn = process.on.bind(process);
function patchProcess(allowExit) {
    process.exit = function (code) {
        if (allowExit) {
            nativeExit(code);
        }
        else {
            const err = new Error('An extension called process.exit() and this was prevented.');
            console.warn(err.stack);
        }
    };
    // override Electron's process.crash() method
    process.crash = function () {
        const err = new Error('An extension called process.crash() and this was prevented.');
        console.warn(err.stack);
    };
    // Set ELECTRON_RUN_AS_NODE environment variable for extensions that use
    // child_process.spawn with process.execPath and expect to run as node process
    // on the desktop.
    // Refs https://github.com/microsoft/vscode/issues/151012#issuecomment-1156593228
    process.env['ELECTRON_RUN_AS_NODE'] = '1';
    process.on = function (event, listener) {
        if (event === 'uncaughtException') {
            const actualListener = listener;
            listener = function (...args) {
                try {
                    return actualListener.apply(undefined, args);
                }
                catch {
                    // DO NOT HANDLE NOR PRINT the error here because this can and will lead to
                    // more errors which will cause error handling to be reentrant and eventually
                    // overflowing the stack. Do not be sad, we do handle and annotate uncaught
                    // errors properly in 'extensionHostMain'
                }
            };
        }
        nativeOn(event, listener);
    };
}
// This calls exit directly in case the initialization is not finished and we need to exit
// Otherwise, if initialization completed we go to extensionHostMain.terminate()
let onTerminate = function (reason) {
    nativeExit();
};
function _createExtHostProtocol() {
    const extHostConnection = readExtHostConnection(process.env);
    if (extHostConnection.type === 3 /* ExtHostConnectionType.MessagePort */) {
        return new Promise((resolve, reject) => {
            const withPorts = (ports) => {
                const port = ports[0];
                const onMessage = new BufferedEmitter();
                port.on('message', (e) => onMessage.fire(VSBuffer.wrap(e.data)));
                port.on('close', () => {
                    onTerminate('renderer closed the MessagePort');
                });
                port.start();
                resolve({
                    onMessage: onMessage.event,
                    send: (message) => port.postMessage(message.buffer),
                });
            };
            process.parentPort.on('message', (e) => withPorts(e.ports));
        });
    }
    else if (extHostConnection.type === 2 /* ExtHostConnectionType.Socket */) {
        return new Promise((resolve, reject) => {
            let protocol = null;
            const timer = setTimeout(() => {
                onTerminate('VSCODE_EXTHOST_IPC_SOCKET timeout');
            }, 60000);
            const reconnectionGraceTime = 10800000 /* ProtocolConstants.ReconnectionGraceTime */;
            const reconnectionShortGraceTime = 300000 /* ProtocolConstants.ReconnectionShortGraceTime */;
            const disconnectRunner1 = new ProcessTimeRunOnceScheduler(() => onTerminate('renderer disconnected for too long (1)'), reconnectionGraceTime);
            const disconnectRunner2 = new ProcessTimeRunOnceScheduler(() => onTerminate('renderer disconnected for too long (2)'), reconnectionShortGraceTime);
            process.on('message', (msg, handle) => {
                if (msg && msg.type === 'VSCODE_EXTHOST_IPC_SOCKET') {
                    // Disable Nagle's algorithm. We also do this on the server process,
                    // but nodejs doesn't document if this option is transferred with the socket
                    handle.setNoDelay(true);
                    const initialDataChunk = VSBuffer.wrap(Buffer.from(msg.initialDataChunk, 'base64'));
                    let socket;
                    if (msg.skipWebSocketFrames) {
                        socket = new NodeSocket(handle, 'extHost-socket');
                    }
                    else {
                        const inflateBytes = VSBuffer.wrap(Buffer.from(msg.inflateBytes, 'base64'));
                        socket = new WebSocketNodeSocket(new NodeSocket(handle, 'extHost-socket'), msg.permessageDeflate, inflateBytes, false);
                    }
                    if (protocol) {
                        // reconnection case
                        disconnectRunner1.cancel();
                        disconnectRunner2.cancel();
                        protocol.beginAcceptReconnection(socket, initialDataChunk);
                        protocol.endAcceptReconnection();
                        protocol.sendResume();
                    }
                    else {
                        clearTimeout(timer);
                        protocol = new PersistentProtocol({ socket, initialChunk: initialDataChunk });
                        protocol.sendResume();
                        protocol.onDidDispose(() => onTerminate('renderer disconnected'));
                        resolve(protocol);
                        // Wait for rich client to reconnect
                        protocol.onSocketClose(() => {
                            // The socket has closed, let's give the renderer a certain amount of time to reconnect
                            disconnectRunner1.schedule();
                        });
                    }
                }
                if (msg && msg.type === 'VSCODE_EXTHOST_IPC_REDUCE_GRACE_TIME') {
                    if (disconnectRunner2.isScheduled()) {
                        // we are disconnected and already running the short reconnection timer
                        return;
                    }
                    if (disconnectRunner1.isScheduled()) {
                        // we are disconnected and running the long reconnection timer
                        disconnectRunner2.schedule();
                    }
                }
            });
            // Now that we have managed to install a message listener, ask the other side to send us the socket
            const req = { type: 'VSCODE_EXTHOST_IPC_READY' };
            process.send?.(req);
        });
    }
    else {
        const pipeName = extHostConnection.pipeName;
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(pipeName, () => {
                socket.removeListener('error', reject);
                const protocol = new PersistentProtocol({
                    socket: new NodeSocket(socket, 'extHost-renderer'),
                });
                protocol.sendResume();
                resolve(protocol);
            });
            socket.once('error', reject);
            socket.on('close', () => {
                onTerminate('renderer closed the socket');
            });
        });
    }
}
async function createExtHostProtocol() {
    const protocol = await _createExtHostProtocol();
    return new (class {
        constructor() {
            this._onMessage = new BufferedEmitter();
            this.onMessage = this._onMessage.event;
            this._terminating = false;
            this._protocolListener = protocol.onMessage((msg) => {
                if (isMessageOfType(msg, 2 /* MessageType.Terminate */)) {
                    this._terminating = true;
                    this._protocolListener.dispose();
                    onTerminate('received terminate message from renderer');
                }
                else {
                    this._onMessage.fire(msg);
                }
            });
        }
        send(msg) {
            if (!this._terminating) {
                protocol.send(msg);
            }
        }
        async drain() {
            if (protocol.drain) {
                return protocol.drain();
            }
        }
    })();
}
function connectToRenderer(protocol) {
    return new Promise((c) => {
        // Listen init data message
        const first = protocol.onMessage((raw) => {
            first.dispose();
            const initData = JSON.parse(raw.toString());
            const rendererCommit = initData.commit;
            const myCommit = product.commit;
            if (rendererCommit && myCommit) {
                // Running in the built version where commits are defined
                if (rendererCommit !== myCommit) {
                    nativeExit(55 /* ExtensionHostExitCode.VersionMismatch */);
                }
            }
            if (initData.parentPid) {
                // Kill oneself if one's parent dies. Much drama.
                let epermErrors = 0;
                setInterval(function () {
                    try {
                        process.kill(initData.parentPid, 0); // throws an exception if the main process doesn't exist anymore.
                        epermErrors = 0;
                    }
                    catch (e) {
                        if (e && e.code === 'EPERM') {
                            // Even if the parent process is still alive,
                            // some antivirus software can lead to an EPERM error to be thrown here.
                            // Let's terminate only if we get 3 consecutive EPERM errors.
                            epermErrors++;
                            if (epermErrors >= 3) {
                                onTerminate(`parent process ${initData.parentPid} does not exist anymore (3 x EPERM): ${e.message} (code: ${e.code}) (errno: ${e.errno})`);
                            }
                        }
                        else {
                            onTerminate(`parent process ${initData.parentPid} does not exist anymore: ${e.message} (code: ${e.code}) (errno: ${e.errno})`);
                        }
                    }
                }, 1000);
                // In certain cases, the event loop can become busy and never yield
                // e.g. while-true or process.nextTick endless loops
                // So also use the native node module to do it from a separate thread
                let watchdog;
                try {
                    watchdog = require('native-watchdog');
                    watchdog.start(initData.parentPid);
                }
                catch (err) {
                    // no problem...
                    onUnexpectedError(err);
                }
            }
            // Tell the outside that we are initialized
            protocol.send(createMessageOfType(0 /* MessageType.Initialized */));
            c({ protocol, initData });
        });
        // Tell the outside that we are ready to receive messages
        protocol.send(createMessageOfType(1 /* MessageType.Ready */));
    });
}
async function startExtensionHostProcess() {
    // Print a console message when rejection isn't handled within N seconds. For details:
    // see https://nodejs.org/api/process.html#process_event_unhandledrejection
    // and https://nodejs.org/api/process.html#process_event_rejectionhandled
    const unhandledPromises = [];
    process.on('unhandledRejection', (reason, promise) => {
        unhandledPromises.push(promise);
        setTimeout(() => {
            const idx = unhandledPromises.indexOf(promise);
            if (idx >= 0) {
                promise.catch((e) => {
                    unhandledPromises.splice(idx, 1);
                    if (!isCancellationError(e)) {
                        console.warn(`rejected promise not handled within 1 second: ${e}`);
                        if (e && e.stack) {
                            console.warn(`stack trace: ${e.stack}`);
                        }
                        if (reason) {
                            onUnexpectedError(reason);
                        }
                    }
                });
            }
        }, 1000);
    });
    process.on('rejectionHandled', (promise) => {
        const idx = unhandledPromises.indexOf(promise);
        if (idx >= 0) {
            unhandledPromises.splice(idx, 1);
        }
    });
    // Print a console message when an exception isn't handled.
    process.on('uncaughtException', function (err) {
        if (!isSigPipeError(err)) {
            onUnexpectedError(err);
        }
    });
    performance.mark(`code/extHost/willConnectToRenderer`);
    const protocol = await createExtHostProtocol();
    performance.mark(`code/extHost/didConnectToRenderer`);
    const renderer = await connectToRenderer(protocol);
    performance.mark(`code/extHost/didWaitForInitData`);
    const { initData } = renderer;
    // setup things
    patchProcess(!!initData.environment.extensionTestsLocationURI); // to support other test frameworks like Jasmin that use process.exit (https://github.com/microsoft/vscode/issues/37708)
    initData.environment.useHostProxy =
        args.useHostProxy !== undefined ? args.useHostProxy !== 'false' : undefined;
    initData.environment.skipWorkspaceStorageLock = boolean(args.skipWorkspaceStorageLock, false);
    // host abstraction
    const hostUtils = new (class NodeHost {
        constructor() {
            this.pid = process.pid;
        }
        exit(code) {
            nativeExit(code);
        }
        fsExists(path) {
            return Promises.exists(path);
        }
        fsRealpath(path) {
            return realpath(path);
        }
    })();
    // Attempt to load uri transformer
    let uriTransformer = null;
    if (initData.remote.authority && args.transformURIs) {
        uriTransformer = createURITransformer(initData.remote.authority);
    }
    const extensionHostMain = new ExtensionHostMain(renderer.protocol, initData, hostUtils, uriTransformer);
    // rewrite onTerminate-function to be a proper shutdown
    onTerminate = (reason) => extensionHostMain.terminate(reason);
}
startExtensionHostProcess().catch((err) => console.log(err));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0ZW5zaW9uSG9zdFByb2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFBO0FBRS9CLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFBO0FBQzFCLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGNBQWMsRUFDZCxpQkFBaUIsR0FDakIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2QyxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFcEQsT0FBTyxFQUNOLGVBQWUsRUFDZixrQkFBa0IsR0FFbEIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hFLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBVyxNQUFNLGdDQUFnQyxDQUFBO0FBRTNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzFELE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBT04sbUJBQW1CLEVB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