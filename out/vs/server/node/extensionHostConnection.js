/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as cp from 'child_process';
import * as net from 'net';
import { VSBuffer } from '../../base/common/buffer.js';
import { Emitter, Event } from '../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../base/common/lifecycle.js';
import { FileAccess } from '../../base/common/network.js';
import { delimiter, join } from '../../base/common/path.js';
import { isWindows } from '../../base/common/platform.js';
import { removeDangerousEnvVariables } from '../../base/common/processes.js';
import { createRandomIPCHandle, NodeSocket, } from '../../base/parts/ipc/node/ipc.net.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ILogService } from '../../platform/log/common/log.js';
import { getResolvedShellEnv } from '../../platform/shell/node/shellEnv.js';
import { IExtensionHostStatusService } from './extensionHostStatusService.js';
import { getNLSConfiguration } from './remoteLanguagePacks.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { IPCExtHostConnection, SocketExtHostConnection, writeExtHostConnection, } from '../../workbench/services/extensions/common/extensionHostEnv.js';
export async function buildUserEnvironment(startParamsEnv = {}, withUserShellEnvironment, language, environmentService, logService, configurationService) {
    const nlsConfig = await getNLSConfiguration(language, environmentService.userDataPath);
    let userShellEnv = {};
    if (withUserShellEnvironment) {
        try {
            userShellEnv = await getResolvedShellEnv(configurationService, logService, environmentService.args, process.env);
        }
        catch (error) {
            logService.error('ExtensionHostConnection#buildUserEnvironment resolving shell environment failed', error);
        }
    }
    const processEnv = process.env;
    const env = {
        ...processEnv,
        ...userShellEnv,
        ...{
            VSCODE_ESM_ENTRYPOINT: 'vs/workbench/api/node/extensionHostProcess',
            VSCODE_HANDLES_UNCAUGHT_ERRORS: 'true',
            VSCODE_NLS_CONFIG: JSON.stringify(nlsConfig),
        },
        ...startParamsEnv,
    };
    const binFolder = environmentService.isBuilt
        ? join(environmentService.appRoot, 'bin')
        : join(environmentService.appRoot, 'resources', 'server', 'bin-dev');
    const remoteCliBinFolder = join(binFolder, 'remote-cli'); // contains the `code` command that can talk to the remote server
    let PATH = readCaseInsensitive(env, 'PATH');
    if (PATH) {
        PATH = remoteCliBinFolder + delimiter + PATH;
    }
    else {
        PATH = remoteCliBinFolder;
    }
    setCaseInsensitive(env, 'PATH', PATH);
    if (!environmentService.args['without-browser-env-var']) {
        env.BROWSER = join(binFolder, 'helpers', isWindows ? 'browser.cmd' : 'browser.sh'); // a command that opens a browser on the local machine
    }
    removeNulls(env);
    return env;
}
class ConnectionData {
    constructor(socket, initialDataChunk) {
        this.socket = socket;
        this.initialDataChunk = initialDataChunk;
    }
    socketDrain() {
        return this.socket.drain();
    }
    toIExtHostSocketMessage() {
        let skipWebSocketFrames;
        let permessageDeflate;
        let inflateBytes;
        if (this.socket instanceof NodeSocket) {
            skipWebSocketFrames = true;
            permessageDeflate = false;
            inflateBytes = VSBuffer.alloc(0);
        }
        else {
            skipWebSocketFrames = false;
            permessageDeflate = this.socket.permessageDeflate;
            inflateBytes = this.socket.recordedInflateBytes;
        }
        return {
            type: 'VSCODE_EXTHOST_IPC_SOCKET',
            initialDataChunk: this.initialDataChunk.buffer.toString('base64'),
            skipWebSocketFrames: skipWebSocketFrames,
            permessageDeflate: permessageDeflate,
            inflateBytes: inflateBytes.buffer.toString('base64'),
        };
    }
}
let ExtensionHostConnection = class ExtensionHostConnection extends Disposable {
    constructor(_reconnectionToken, remoteAddress, socket, initialDataChunk, _environmentService, _logService, _extensionHostStatusService, _configurationService) {
        super();
        this._reconnectionToken = _reconnectionToken;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._extensionHostStatusService = _extensionHostStatusService;
        this._configurationService = _configurationService;
        this._onClose = new Emitter();
        this.onClose = this._onClose.event;
        this._canSendSocket = !isWindows || !this._environmentService.args['socket-path'];
        this._disposed = false;
        this._remoteAddress = remoteAddress;
        this._extensionHostProcess = null;
        this._connectionData = new ConnectionData(socket, initialDataChunk);
        this._log(`New connection established.`);
    }
    dispose() {
        this._cleanResources();
        super.dispose();
    }
    get _logPrefix() {
        return `[${this._remoteAddress}][${this._reconnectionToken.substr(0, 8)}][ExtensionHostConnection] `;
    }
    _log(_str) {
        this._logService.info(`${this._logPrefix}${_str}`);
    }
    _logError(_str) {
        this._logService.error(`${this._logPrefix}${_str}`);
    }
    async _pipeSockets(extHostSocket, connectionData) {
        const disposables = new DisposableStore();
        disposables.add(connectionData.socket);
        disposables.add(toDisposable(() => {
            extHostSocket.destroy();
        }));
        const stopAndCleanup = () => {
            disposables.dispose();
        };
        disposables.add(connectionData.socket.onEnd(stopAndCleanup));
        disposables.add(connectionData.socket.onClose(stopAndCleanup));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'end')(stopAndCleanup));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'close')(stopAndCleanup));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'error')(stopAndCleanup));
        disposables.add(connectionData.socket.onData((e) => extHostSocket.write(e.buffer)));
        disposables.add(Event.fromNodeEventEmitter(extHostSocket, 'data')((e) => {
            connectionData.socket.write(VSBuffer.wrap(e));
        }));
        if (connectionData.initialDataChunk.byteLength > 0) {
            extHostSocket.write(connectionData.initialDataChunk.buffer);
        }
    }
    async _sendSocketToExtensionHost(extensionHostProcess, connectionData) {
        // Make sure all outstanding writes have been drained before sending the socket
        await connectionData.socketDrain();
        const msg = connectionData.toIExtHostSocketMessage();
        let socket;
        if (connectionData.socket instanceof NodeSocket) {
            socket = connectionData.socket.socket;
        }
        else {
            socket = connectionData.socket.socket.socket;
        }
        extensionHostProcess.send(msg, socket);
    }
    shortenReconnectionGraceTimeIfNecessary() {
        if (!this._extensionHostProcess) {
            return;
        }
        const msg = {
            type: 'VSCODE_EXTHOST_IPC_REDUCE_GRACE_TIME',
        };
        this._extensionHostProcess.send(msg);
    }
    acceptReconnection(remoteAddress, _socket, initialDataChunk) {
        this._remoteAddress = remoteAddress;
        this._log(`The client has reconnected.`);
        const connectionData = new ConnectionData(_socket, initialDataChunk);
        if (!this._extensionHostProcess) {
            // The extension host didn't even start up yet
            this._connectionData = connectionData;
            return;
        }
        this._sendSocketToExtensionHost(this._extensionHostProcess, connectionData);
    }
    _cleanResources() {
        if (this._disposed) {
            // already called
            return;
        }
        this._disposed = true;
        if (this._connectionData) {
            this._connectionData.socket.end();
            this._connectionData = null;
        }
        if (this._extensionHostProcess) {
            this._extensionHostProcess.kill();
            this._extensionHostProcess = null;
        }
        this._onClose.fire(undefined);
    }
    async start(startParams) {
        try {
            let execArgv = process.execArgv
                ? process.execArgv.filter((a) => !/^--inspect(-brk)?=/.test(a))
                : [];
            if (startParams.port && !process.pkg) {
                execArgv = [`--inspect${startParams.break ? '-brk' : ''}=${startParams.port}`];
            }
            const env = await buildUserEnvironment(startParams.env, true, startParams.language, this._environmentService, this._logService, this._configurationService);
            removeDangerousEnvVariables(env);
            let extHostNamedPipeServer;
            if (this._canSendSocket) {
                writeExtHostConnection(new SocketExtHostConnection(), env);
                extHostNamedPipeServer = null;
            }
            else {
                const { namedPipeServer, pipeName } = await this._listenOnPipe();
                writeExtHostConnection(new IPCExtHostConnection(pipeName), env);
                extHostNamedPipeServer = namedPipeServer;
            }
            const opts = {
                env,
                execArgv,
                silent: true,
            };
            // Refs https://github.com/microsoft/vscode/issues/189805
            opts.execArgv.unshift('--dns-result-order=ipv4first');
            // Run Extension Host as fork of current process
            const args = ['--type=extensionHost', `--transformURIs`];
            const useHostProxy = this._environmentService.args['use-host-proxy'];
            args.push(`--useHostProxy=${useHostProxy ? 'true' : 'false'}`);
            this._extensionHostProcess = cp.fork(FileAccess.asFileUri('bootstrap-fork').fsPath, args, opts);
            const pid = this._extensionHostProcess.pid;
            this._log(`<${pid}> Launched Extension Host Process.`);
            // Catch all output coming from the extension host process
            this._extensionHostProcess.stdout.setEncoding('utf8');
            this._extensionHostProcess.stderr.setEncoding('utf8');
            const onStdout = Event.fromNodeEventEmitter(this._extensionHostProcess.stdout, 'data');
            const onStderr = Event.fromNodeEventEmitter(this._extensionHostProcess.stderr, 'data');
            this._register(onStdout((e) => this._log(`<${pid}> ${e}`)));
            this._register(onStderr((e) => this._log(`<${pid}><stderr> ${e}`)));
            // Lifecycle
            this._extensionHostProcess.on('error', (err) => {
                this._logError(`<${pid}> Extension Host Process had an error`);
                this._logService.error(err);
                this._cleanResources();
            });
            this._extensionHostProcess.on('exit', (code, signal) => {
                this._extensionHostStatusService.setExitInfo(this._reconnectionToken, { code, signal });
                this._log(`<${pid}> Extension Host Process exited with code: ${code}, signal: ${signal}.`);
                this._cleanResources();
            });
            if (extHostNamedPipeServer) {
                extHostNamedPipeServer.on('connection', (socket) => {
                    extHostNamedPipeServer.close();
                    this._pipeSockets(socket, this._connectionData);
                });
            }
            else {
                const messageListener = (msg) => {
                    if (msg.type === 'VSCODE_EXTHOST_IPC_READY') {
                        this._extensionHostProcess.removeListener('message', messageListener);
                        this._sendSocketToExtensionHost(this._extensionHostProcess, this._connectionData);
                        this._connectionData = null;
                    }
                };
                this._extensionHostProcess.on('message', messageListener);
            }
        }
        catch (error) {
            console.error('ExtensionHostConnection errored');
            if (error) {
                console.error(error);
            }
        }
    }
    _listenOnPipe() {
        return new Promise((resolve, reject) => {
            const pipeName = createRandomIPCHandle();
            const namedPipeServer = net.createServer();
            namedPipeServer.on('error', reject);
            namedPipeServer.listen(pipeName, () => {
                namedPipeServer?.removeListener('error', reject);
                resolve({ pipeName, namedPipeServer });
            });
        });
    }
};
ExtensionHostConnection = __decorate([
    __param(4, IServerEnvironmentService),
    __param(5, ILogService),
    __param(6, IExtensionHostStatusService),
    __param(7, IConfigurationService)
], ExtensionHostConnection);
export { ExtensionHostConnection };
function readCaseInsensitive(env, key) {
    const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === key.toLowerCase());
    const pathKey = pathKeys.length > 0 ? pathKeys[0] : key;
    return env[pathKey];
}
function setCaseInsensitive(env, key, value) {
    const pathKeys = Object.keys(env).filter((k) => k.toLowerCase() === key.toLowerCase());
    const pathKey = pathKeys.length > 0 ? pathKeys[0] : key;
    env[pathKey] = value;
}
function removeNulls(env) {
    // Don't delete while iterating the object itself
    for (const key of Object.keys(env)) {
        if (env[key] === null) {
            delete env[key];
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdENvbm5lY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9leHRlbnNpb25Ib3N0Q29ubmVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUMxQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMzRCxPQUFPLEVBQXVCLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsVUFBVSxHQUVWLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEw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