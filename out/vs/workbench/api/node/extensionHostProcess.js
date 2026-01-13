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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRlbnNpb25Ib3N0UHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFFL0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsY0FBYyxFQUNkLGlCQUFpQixHQUNqQixNQUFNLGdDQUFnQyxDQUFBO0FBRXZDLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFFbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVwRCxPQUFPLEVBQ04sZUFBZSxFQUNmLGtCQUFrQixHQUVsQixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEUsT0FBTyxPQUFPLE1BQU0sNkNBQTZDLENBQUE7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFXLE1BQU0sZ0NBQWdDLENBQUE7QUFFM0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDMUQsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLHNEQUFzRCxDQUFBO0FB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