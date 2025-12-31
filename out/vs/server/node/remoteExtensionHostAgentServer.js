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
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as net from 'net';
import { performance } from 'perf_hooks';
import * as url from 'url';
import { VSBuffer } from '../../base/common/buffer.js';
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler, } from '../../base/common/errors.js';
import { isEqualOrParent } from '../../base/common/extpath.js';
import { Disposable, DisposableStore } from '../../base/common/lifecycle.js';
import { connectionTokenQueryName, FileAccess, getServerProductSegment, Schemas, } from '../../base/common/network.js';
import { dirname, join } from '../../base/common/path.js';
import * as perf from '../../base/common/performance.js';
import * as platform from '../../base/common/platform.js';
import { createRegExp, escapeRegExpCharacters } from '../../base/common/strings.js';
import { URI } from '../../base/common/uri.js';
import { generateUuid } from '../../base/common/uuid.js';
import { getOSReleaseInfo } from '../../base/node/osReleaseInfo.js';
import { findFreePort } from '../../base/node/ports.js';
import { addUNCHostToAllowlist, disableUNCAccessRestrictions } from '../../base/node/unc.js';
import { PersistentProtocol } from '../../base/parts/ipc/common/ipc.net.js';
import { NodeSocket, WebSocketNodeSocket } from '../../base/parts/ipc/node/ipc.net.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../platform/log/common/log.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { ExtensionHostConnection } from './extensionHostConnection.js';
import { ManagementConnection } from './remoteExtensionManagement.js';
import { determineServerConnectionToken, requestHasValidConnectionToken as httpRequestHasValidConnectionToken, ServerConnectionTokenParseError, } from './serverConnectionToken.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { setupServerServices } from './serverServices.js';
import { serveError, serveFile, WebClientServer } from './webClientServer.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SHUTDOWN_TIMEOUT = 5 * 60 * 1000;
let RemoteExtensionHostAgentServer = class RemoteExtensionHostAgentServer extends Disposable {
    constructor(_socketServer, _connectionToken, _vsdaMod, hasWebClient, serverBasePath, _environmentService, _productService, _logService, _instantiationService) {
        super();
        this._socketServer = _socketServer;
        this._connectionToken = _connectionToken;
        this._vsdaMod = _vsdaMod;
        this._environmentService = _environmentService;
        this._productService = _productService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._webEndpointOriginChecker = WebEndpointOriginChecker.create(this._productService);
        if (serverBasePath !== undefined &&
            serverBasePath.charCodeAt(serverBasePath.length - 1) === 47 /* CharCode.Slash */) {
            // Remove trailing slash from base path
            serverBasePath = serverBasePath.substring(0, serverBasePath.length - 1);
        }
        this._serverBasePath = serverBasePath; // undefined or starts with a slash
        this._serverProductPath = `/${getServerProductSegment(_productService)}`; // starts with a slash
        this._extHostConnections = Object.create(null);
        this._managementConnections = Object.create(null);
        this._allReconnectionTokens = new Set();
        this._webClientServer = hasWebClient
            ? this._instantiationService.createInstance(WebClientServer, this._connectionToken, serverBasePath ?? '/', this._serverProductPath)
            : null;
        this._logService.info(`Extension host agent started.`);
        this._waitThenShutdown(true);
    }
    async handleRequest(req, res) {
        // Only serve GET requests
        if (req.method !== 'GET') {
            return serveError(req, res, 405, `Unsupported method ${req.method}`);
        }
        if (!req.url) {
            return serveError(req, res, 400, `Bad request.`);
        }
        const parsedUrl = url.parse(req.url, true);
        let pathname = parsedUrl.pathname;
        if (!pathname) {
            return serveError(req, res, 400, `Bad request.`);
        }
        // Serve from both '/' and serverBasePath
        if (this._serverBasePath !== undefined && pathname.startsWith(this._serverBasePath)) {
            pathname = pathname.substring(this._serverBasePath.length) || '/';
        }
        // for now accept all paths, with or without server product path
        if (pathname.startsWith(this._serverProductPath) &&
            pathname.charCodeAt(this._serverProductPath.length) === 47 /* CharCode.Slash */) {
            pathname = pathname.substring(this._serverProductPath.length);
        }
        // Version
        if (pathname === '/version') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            return void res.end(this._productService.commit || '');
        }
        // Delay shutdown
        if (pathname === '/delay-shutdown') {
            this._delayShutdown();
            res.writeHead(200);
            return void res.end('OK');
        }
        if (!httpRequestHasValidConnectionToken(this._connectionToken, req, parsedUrl)) {
            // invalid connection token
            return serveError(req, res, 403, `Forbidden.`);
        }
        if (pathname === '/vscode-remote-resource') {
            // Handle HTTP requests for resources rendered in the rich client (images, fonts, etc.)
            // These resources could be files shipped with extensions or even workspace files.
            const desiredPath = parsedUrl.query['path'];
            if (typeof desiredPath !== 'string') {
                return serveError(req, res, 400, `Bad request.`);
            }
            let filePath;
            try {
                filePath = URI.from({ scheme: Schemas.file, path: desiredPath }).fsPath;
            }
            catch (err) {
                return serveError(req, res, 400, `Bad request.`);
            }
            const responseHeaders = Object.create(null);
            if (this._environmentService.isBuilt) {
                if (isEqualOrParent(filePath, this._environmentService.builtinExtensionsPath, !platform.isLinux) ||
                    isEqualOrParent(filePath, this._environmentService.extensionsPath, !platform.isLinux)) {
                    responseHeaders['Cache-Control'] = 'public, max-age=31536000';
                }
            }
            // Allow cross origin requests from the web worker extension host
            responseHeaders['Vary'] = 'Origin';
            const requestOrigin = req.headers['origin'];
            if (requestOrigin && this._webEndpointOriginChecker.matches(requestOrigin)) {
                responseHeaders['Access-Control-Allow-Origin'] = requestOrigin;
            }
            return serveFile(filePath, 1 /* CacheControl.ETAG */, this._logService, req, res, responseHeaders);
        }
        // workbench web UI
        if (this._webClientServer) {
            this._webClientServer.handle(req, res, parsedUrl, pathname);
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return void res.end('Not found');
    }
    handleUpgrade(req, socket) {
        let reconnectionToken = generateUuid();
        let isReconnection = false;
        let skipWebSocketFrames = false;
        if (req.url) {
            const query = url.parse(req.url, true).query;
            if (typeof query.reconnectionToken === 'string') {
                reconnectionToken = query.reconnectionToken;
            }
            if (query.reconnection === 'true') {
                isReconnection = true;
            }
            if (query.skipWebSocketFrames === 'true') {
                skipWebSocketFrames = true;
            }
        }
        if (req.headers['upgrade'] === undefined ||
            req.headers['upgrade'].toLowerCase() !== 'websocket') {
            socket.end('HTTP/1.1 400 Bad Request');
            return;
        }
        // https://tools.ietf.org/html/rfc6455#section-4
        const requestNonce = req.headers['sec-websocket-key'];
        const hash = crypto.createHash('sha1'); // CodeQL [SM04514] SHA1 must be used here to respect the WebSocket protocol specification
        hash.update(requestNonce + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
        const responseNonce = hash.digest('base64');
        const responseHeaders = [
            `HTTP/1.1 101 Switching Protocols`,
            `Upgrade: websocket`,
            `Connection: Upgrade`,
            `Sec-WebSocket-Accept: ${responseNonce}`,
        ];
        // See https://tools.ietf.org/html/rfc7692#page-12
        let permessageDeflate = false;
        if (!skipWebSocketFrames &&
            !this._environmentService.args['disable-websocket-compression'] &&
            req.headers['sec-websocket-extensions']) {
            const websocketExtensionOptions = Array.isArray(req.headers['sec-websocket-extensions'])
                ? req.headers['sec-websocket-extensions']
                : [req.headers['sec-websocket-extensions']];
            for (const websocketExtensionOption of websocketExtensionOptions) {
                if (/\b((server_max_window_bits)|(server_no_context_takeover)|(client_no_context_takeover))\b/.test(websocketExtensionOption)) {
                    // sorry, the server does not support zlib parameter tweaks
                    continue;
                }
                if (/\b(permessage-deflate)\b/.test(websocketExtensionOption)) {
                    permessageDeflate = true;
                    responseHeaders.push(`Sec-WebSocket-Extensions: permessage-deflate`);
                    break;
                }
                if (/\b(x-webkit-deflate-frame)\b/.test(websocketExtensionOption)) {
                    permessageDeflate = true;
                    responseHeaders.push(`Sec-WebSocket-Extensions: x-webkit-deflate-frame`);
                    break;
                }
            }
        }
        socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');
        // Never timeout this socket due to inactivity!
        socket.setTimeout(0);
        // Disable Nagle's algorithm
        socket.setNoDelay(true);
        // Finally!
        if (skipWebSocketFrames) {
            this._handleWebSocketConnection(new NodeSocket(socket, `server-connection-${reconnectionToken}`), isReconnection, reconnectionToken);
        }
        else {
            this._handleWebSocketConnection(new WebSocketNodeSocket(new NodeSocket(socket, `server-connection-${reconnectionToken}`), permessageDeflate, null, true), isReconnection, reconnectionToken);
        }
    }
    handleServerError(err) {
        this._logService.error(`Error occurred in server`);
        this._logService.error(err);
    }
    // Eventually cleanup
    _getRemoteAddress(socket) {
        let _socket;
        if (socket instanceof NodeSocket) {
            _socket = socket.socket;
        }
        else {
            _socket = socket.socket.socket;
        }
        return _socket.remoteAddress || `<unknown>`;
    }
    async _rejectWebSocketConnection(logPrefix, protocol, reason) {
        const socket = protocol.getSocket();
        this._logService.error(`${logPrefix} ${reason}.`);
        const errMessage = {
            type: 'error',
            reason: reason,
        };
        protocol.sendControl(VSBuffer.fromString(JSON.stringify(errMessage)));
        protocol.dispose();
        await socket.drain();
        socket.dispose();
    }
    /**
     * NOTE: Avoid using await in this method!
     * The problem is that await introduces a process.nextTick due to the implicit Promise.then
     * This can lead to some bytes being received and interpreted and a control message being emitted before the next listener has a chance to be registered.
     */
    _handleWebSocketConnection(socket, isReconnection, reconnectionToken) {
        const remoteAddress = this._getRemoteAddress(socket);
        const logPrefix = `[${remoteAddress}][${reconnectionToken.substr(0, 8)}]`;
        const protocol = new PersistentProtocol({ socket });
        const validator = this._vsdaMod ? new this._vsdaMod.validator() : null;
        const signer = this._vsdaMod ? new this._vsdaMod.signer() : null;
        let State;
        (function (State) {
            State[State["WaitingForAuth"] = 0] = "WaitingForAuth";
            State[State["WaitingForConnectionType"] = 1] = "WaitingForConnectionType";
            State[State["Done"] = 2] = "Done";
            State[State["Error"] = 3] = "Error";
        })(State || (State = {}));
        let state = 0 /* State.WaitingForAuth */;
        const rejectWebSocketConnection = (msg) => {
            state = 3 /* State.Error */;
            listener.dispose();
            this._rejectWebSocketConnection(logPrefix, protocol, msg);
        };
        const listener = protocol.onControlMessage((raw) => {
            if (state === 0 /* State.WaitingForAuth */) {
                let msg1;
                try {
                    msg1 = JSON.parse(raw.toString());
                }
                catch (err) {
                    return rejectWebSocketConnection(`Malformed first message`);
                }
                if (msg1.type !== 'auth') {
                    return rejectWebSocketConnection(`Invalid first message`);
                }
                if (this._connectionToken.type === 2 /* ServerConnectionTokenType.Mandatory */ &&
                    !this._connectionToken.validate(msg1.auth)) {
                    return rejectWebSocketConnection(`Unauthorized client refused: auth mismatch`);
                }
                // Send `sign` request
                let signedData = generateUuid();
                if (signer) {
                    try {
                        signedData = signer.sign(msg1.data);
                    }
                    catch (e) { }
                }
                let someText = generateUuid();
                if (validator) {
                    try {
                        someText = validator.createNewMessage(someText);
                    }
                    catch (e) { }
                }
                const signRequest = {
                    type: 'sign',
                    data: someText,
                    signedData: signedData,
                };
                protocol.sendControl(VSBuffer.fromString(JSON.stringify(signRequest)));
                state = 1 /* State.WaitingForConnectionType */;
            }
            else if (state === 1 /* State.WaitingForConnectionType */) {
                let msg2;
                try {
                    msg2 = JSON.parse(raw.toString());
                }
                catch (err) {
                    return rejectWebSocketConnection(`Malformed second message`);
                }
                if (msg2.type !== 'connectionType') {
                    return rejectWebSocketConnection(`Invalid second message`);
                }
                if (typeof msg2.signedData !== 'string') {
                    return rejectWebSocketConnection(`Invalid second message field type`);
                }
                const rendererCommit = msg2.commit;
                const myCommit = this._productService.commit;
                if (rendererCommit && myCommit) {
                    // Running in the built version where commits are defined
                    if (rendererCommit !== myCommit) {
                        return rejectWebSocketConnection(`Client refused: version mismatch`);
                    }
                }
                let valid = false;
                if (!validator) {
                    valid = true;
                }
                else if (this._connectionToken.validate(msg2.signedData)) {
                    // web client
                    valid = true;
                }
                else {
                    try {
                        valid = validator.validate(msg2.signedData) === 'ok';
                    }
                    catch (e) { }
                }
                if (!valid) {
                    if (this._environmentService.isBuilt) {
                        return rejectWebSocketConnection(`Unauthorized client refused`);
                    }
                    else {
                        this._logService.error(`${logPrefix} Unauthorized client handshake failed but we proceed because of dev mode.`);
                    }
                }
                // We have received a new connection.
                // This indicates that the server owner has connectivity.
                // Therefore we will shorten the reconnection grace period for disconnected connections!
                for (const key in this._managementConnections) {
                    const managementConnection = this._managementConnections[key];
                    managementConnection.shortenReconnectionGraceTimeIfNecessary();
                }
                for (const key in this._extHostConnections) {
                    const extHostConnection = this._extHostConnections[key];
                    extHostConnection.shortenReconnectionGraceTimeIfNecessary();
                }
                state = 2 /* State.Done */;
                listener.dispose();
                this._handleConnectionType(remoteAddress, logPrefix, protocol, socket, isReconnection, reconnectionToken, msg2);
            }
        });
    }
    async _handleConnectionType(remoteAddress, _logPrefix, protocol, socket, isReconnection, reconnectionToken, msg) {
        const logPrefix = msg.desiredConnectionType === 1 /* ConnectionType.Management */
            ? `${_logPrefix}[ManagementConnection]`
            : msg.desiredConnectionType === 2 /* ConnectionType.ExtensionHost */
                ? `${_logPrefix}[ExtensionHostConnection]`
                : _logPrefix;
        if (msg.desiredConnectionType === 1 /* ConnectionType.Management */) {
            // This should become a management connection
            if (isReconnection) {
                // This is a reconnection
                if (!this._managementConnections[reconnectionToken]) {
                    if (!this._allReconnectionTokens.has(reconnectionToken)) {
                        // This is an unknown reconnection token
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (never seen)`);
                    }
                    else {
                        // This is a connection that was seen in the past, but is no longer valid
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (seen before)`);
                    }
                }
                protocol.sendControl(VSBuffer.fromString(JSON.stringify({ type: 'ok' })));
                const dataChunk = protocol.readEntireBuffer();
                protocol.dispose();
                this._managementConnections[reconnectionToken].acceptReconnection(remoteAddress, socket, dataChunk);
            }
            else {
                // This is a fresh connection
                if (this._managementConnections[reconnectionToken]) {
                    // Cannot have two concurrent connections using the same reconnection token
                    return this._rejectWebSocketConnection(logPrefix, protocol, `Duplicate reconnection token`);
                }
                protocol.sendControl(VSBuffer.fromString(JSON.stringify({ type: 'ok' })));
                const con = new ManagementConnection(this._logService, reconnectionToken, remoteAddress, protocol);
                this._socketServer.acceptConnection(con.protocol, con.onClose);
                this._managementConnections[reconnectionToken] = con;
                this._allReconnectionTokens.add(reconnectionToken);
                con.onClose(() => {
                    delete this._managementConnections[reconnectionToken];
                });
            }
        }
        else if (msg.desiredConnectionType === 2 /* ConnectionType.ExtensionHost */) {
            // This should become an extension host connection
            const startParams0 = msg.args || { language: 'en' };
            const startParams = await this._updateWithFreeDebugPort(startParams0);
            if (startParams.port) {
                this._logService.trace(`${logPrefix} - startParams debug port ${startParams.port}`);
            }
            this._logService.trace(`${logPrefix} - startParams language: ${startParams.language}`);
            this._logService.trace(`${logPrefix} - startParams env: ${JSON.stringify(startParams.env)}`);
            if (isReconnection) {
                // This is a reconnection
                if (!this._extHostConnections[reconnectionToken]) {
                    if (!this._allReconnectionTokens.has(reconnectionToken)) {
                        // This is an unknown reconnection token
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (never seen)`);
                    }
                    else {
                        // This is a connection that was seen in the past, but is no longer valid
                        return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown reconnection token (seen before)`);
                    }
                }
                protocol.sendPause();
                protocol.sendControl(VSBuffer.fromString(JSON.stringify(startParams.port ? { debugPort: startParams.port } : {})));
                const dataChunk = protocol.readEntireBuffer();
                protocol.dispose();
                this._extHostConnections[reconnectionToken].acceptReconnection(remoteAddress, socket, dataChunk);
            }
            else {
                // This is a fresh connection
                if (this._extHostConnections[reconnectionToken]) {
                    // Cannot have two concurrent connections using the same reconnection token
                    return this._rejectWebSocketConnection(logPrefix, protocol, `Duplicate reconnection token`);
                }
                protocol.sendPause();
                protocol.sendControl(VSBuffer.fromString(JSON.stringify(startParams.port ? { debugPort: startParams.port } : {})));
                const dataChunk = protocol.readEntireBuffer();
                protocol.dispose();
                const con = this._instantiationService.createInstance(ExtensionHostConnection, reconnectionToken, remoteAddress, socket, dataChunk);
                this._extHostConnections[reconnectionToken] = con;
                this._allReconnectionTokens.add(reconnectionToken);
                con.onClose(() => {
                    con.dispose();
                    delete this._extHostConnections[reconnectionToken];
                    this._onDidCloseExtHostConnection();
                });
                con.start(startParams);
            }
        }
        else if (msg.desiredConnectionType === 3 /* ConnectionType.Tunnel */) {
            const tunnelStartParams = msg.args;
            this._createTunnel(protocol, tunnelStartParams);
        }
        else {
            return this._rejectWebSocketConnection(logPrefix, protocol, `Unknown initial data received`);
        }
    }
    async _createTunnel(protocol, tunnelStartParams) {
        const remoteSocket = protocol.getSocket().socket;
        const dataChunk = protocol.readEntireBuffer();
        protocol.dispose();
        remoteSocket.pause();
        const localSocket = await this._connectTunnelSocket(tunnelStartParams.host, tunnelStartParams.port);
        if (dataChunk.byteLength > 0) {
            localSocket.write(dataChunk.buffer);
        }
        localSocket.on('end', () => remoteSocket.end());
        localSocket.on('close', () => remoteSocket.end());
        localSocket.on('error', () => remoteSocket.destroy());
        remoteSocket.on('end', () => localSocket.end());
        remoteSocket.on('close', () => localSocket.end());
        remoteSocket.on('error', () => localSocket.destroy());
        localSocket.pipe(remoteSocket);
        remoteSocket.pipe(localSocket);
    }
    _connectTunnelSocket(host, port) {
        return new Promise((c, e) => {
            const socket = net.createConnection({
                host: host,
                port: port,
                autoSelectFamily: true,
            }, () => {
                socket.removeListener('error', e);
                socket.pause();
                c(socket);
            });
            socket.once('error', e);
        });
    }
    _updateWithFreeDebugPort(startParams) {
        if (typeof startParams.port === 'number') {
            return findFreePort(startParams.port, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */).then((freePort) => {
                startParams.port = freePort;
                return startParams;
            });
        }
        // No port clear debug configuration.
        startParams.debugId = undefined;
        startParams.port = undefined;
        startParams.break = undefined;
        return Promise.resolve(startParams);
    }
    async _onDidCloseExtHostConnection() {
        if (!this._environmentService.args['enable-remote-auto-shutdown']) {
            return;
        }
        this._cancelShutdown();
        const hasActiveExtHosts = !!Object.keys(this._extHostConnections).length;
        if (!hasActiveExtHosts) {
            console.log('Last EH closed, waiting before shutting down');
            this._logService.info('Last EH closed, waiting before shutting down');
            this._waitThenShutdown();
        }
    }
    _waitThenShutdown(initial = false) {
        if (!this._environmentService.args['enable-remote-auto-shutdown']) {
            return;
        }
        if (this._environmentService.args['remote-auto-shutdown-without-delay'] && !initial) {
            this._shutdown();
        }
        else {
            this.shutdownTimer = setTimeout(() => {
                this.shutdownTimer = undefined;
                this._shutdown();
            }, SHUTDOWN_TIMEOUT);
        }
    }
    _shutdown() {
        const hasActiveExtHosts = !!Object.keys(this._extHostConnections).length;
        if (hasActiveExtHosts) {
            console.log('New EH opened, aborting shutdown');
            this._logService.info('New EH opened, aborting shutdown');
            return;
        }
        else {
            console.log('Last EH closed, shutting down');
            this._logService.info('Last EH closed, shutting down');
            this.dispose();
            process.exit(0);
        }
    }
    /**
     * If the server is in a shutdown timeout, cancel it and start over
     */
    _delayShutdown() {
        if (this.shutdownTimer) {
            console.log('Got delay-shutdown request while in shutdown timeout, delaying');
            this._logService.info('Got delay-shutdown request while in shutdown timeout, delaying');
            this._cancelShutdown();
            this._waitThenShutdown();
        }
    }
    _cancelShutdown() {
        if (this.shutdownTimer) {
            console.log('Cancelling previous shutdown timeout');
            this._logService.info('Cancelling previous shutdown timeout');
            clearTimeout(this.shutdownTimer);
            this.shutdownTimer = undefined;
        }
    }
};
RemoteExtensionHostAgentServer = __decorate([
    __param(5, IServerEnvironmentService),
    __param(6, IProductService),
    __param(7, ILogService),
    __param(8, IInstantiationService)
], RemoteExtensionHostAgentServer);
export async function createServer(address, args, REMOTE_DATA_FOLDER) {
    const connectionToken = await determineServerConnectionToken(args);
    if (connectionToken instanceof ServerConnectionTokenParseError) {
        console.warn(connectionToken.message);
        process.exit(1);
    }
    // setting up error handlers, first with console.error, then, once available, using the log service
    function initUnexpectedErrorHandler(handler) {
        setUnexpectedErrorHandler((err) => {
            // See https://github.com/microsoft/vscode-remote-release/issues/6481
            // In some circumstances, console.error will throw an asynchronous error. This asynchronous error
            // will end up here, and then it will be logged again, thus creating an endless asynchronous loop.
            // Here we try to break the loop by ignoring EPIPE errors that include our own unexpected error handler in the stack.
            if (isSigPipeError(err) && err.stack && /unexpectedErrorHandler/.test(err.stack)) {
                return;
            }
            handler(err);
        });
    }
    const unloggedErrors = [];
    initUnexpectedErrorHandler((error) => {
        unloggedErrors.push(error);
        console.error(error);
    });
    let didLogAboutSIGPIPE = false;
    process.on('SIGPIPE', () => {
        // See https://github.com/microsoft/vscode-remote-release/issues/6543
        // We would normally install a SIGPIPE listener in bootstrap-node.js
        // But in certain situations, the console itself can be in a broken pipe state
        // so logging SIGPIPE to the console will cause an infinite async loop
        if (!didLogAboutSIGPIPE) {
            didLogAboutSIGPIPE = true;
            onUnexpectedError(new Error(`Unexpected SIGPIPE`));
        }
    });
    const disposables = new DisposableStore();
    const { socketServer, instantiationService } = await setupServerServices(connectionToken, args, REMOTE_DATA_FOLDER, disposables);
    // Set the unexpected error handler after the services have been initialized, to avoid having
    // the telemetry service overwrite our handler
    instantiationService.invokeFunction((accessor) => {
        const logService = accessor.get(ILogService);
        unloggedErrors.forEach((error) => logService.error(error));
        unloggedErrors.length = 0;
        initUnexpectedErrorHandler((error) => logService.error(error));
    });
    // On Windows, configure the UNC allow list based on settings
    instantiationService.invokeFunction((accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        if (platform.isWindows) {
            if (configurationService.getValue('security.restrictUNCAccess') === false) {
                disableUNCAccessRestrictions();
            }
            else {
                addUNCHostToAllowlist(configurationService.getValue('security.allowedUNCHosts'));
            }
        }
    });
    //
    // On Windows, exit early with warning message to users about potential security issue
    // if there is node_modules folder under home drive or Users folder.
    //
    instantiationService.invokeFunction((accessor) => {
        const logService = accessor.get(ILogService);
        if (platform.isWindows && process.env.HOMEDRIVE && process.env.HOMEPATH) {
            const homeDirModulesPath = join(process.env.HOMEDRIVE, 'node_modules');
            const userDir = dirname(join(process.env.HOMEDRIVE, process.env.HOMEPATH));
            const userDirModulesPath = join(userDir, 'node_modules');
            if (fs.existsSync(homeDirModulesPath) || fs.existsSync(userDirModulesPath)) {
                const message = `

*
* !!!! Server terminated due to presence of CVE-2020-1416 !!!!
*
* Please remove the following directories and re-try
* ${homeDirModulesPath}
* ${userDirModulesPath}
*
* For more information on the vulnerability https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-1416
*

`;
                logService.warn(message);
                console.warn(message);
                process.exit(0);
            }
        }
    });
    const vsdaMod = instantiationService.invokeFunction((accessor) => {
        const logService = accessor.get(ILogService);
        const hasVSDA = fs.existsSync(join(FileAccess.asFileUri('').fsPath, '../node_modules/vsda'));
        if (hasVSDA) {
            try {
                return require('vsda');
            }
            catch (err) {
                logService.error(err);
            }
        }
        return null;
    });
    let serverBasePath = args['server-base-path'];
    if (serverBasePath && !serverBasePath.startsWith('/')) {
        serverBasePath = `/${serverBasePath}`;
    }
    const hasWebClient = fs.existsSync(FileAccess.asFileUri(`vs/code/browser/workbench/workbench.html`).fsPath);
    if (hasWebClient && address && typeof address !== 'string') {
        // ships the web ui!
        const queryPart = connectionToken.type !== 0 /* ServerConnectionTokenType.None */
            ? `?${connectionTokenQueryName}=${connectionToken.value}`
            : '';
        console.log(`Web UI available at http://localhost${address.port === 80 ? '' : `:${address.port}`}${serverBasePath ?? ''}${queryPart}`);
    }
    const remoteExtensionHostAgentServer = instantiationService.createInstance(RemoteExtensionHostAgentServer, socketServer, connectionToken, vsdaMod, hasWebClient, serverBasePath);
    perf.mark('code/server/ready');
    const currentTime = performance.now();
    const vscodeServerStartTime = global.vscodeServerStartTime;
    const vscodeServerListenTime = global.vscodeServerListenTime;
    const vscodeServerCodeLoadedTime = global.vscodeServerCodeLoadedTime;
    instantiationService.invokeFunction(async (accessor) => {
        const telemetryService = accessor.get(ITelemetryService);
        telemetryService.publicLog2('serverStart', {
            startTime: vscodeServerStartTime,
            startedTime: vscodeServerListenTime,
            codeLoadedTime: vscodeServerCodeLoadedTime,
            readyTime: currentTime,
        });
        if (platform.isLinux) {
            const logService = accessor.get(ILogService);
            const releaseInfo = await getOSReleaseInfo(logService.error.bind(logService));
            if (releaseInfo) {
                telemetryService.publicLog2('serverPlatformInfo', {
                    platformId: releaseInfo.id,
                    platformVersionId: releaseInfo.version_id,
                    platformIdLike: releaseInfo.id_like,
                });
            }
        }
    });
    if (args['print-startup-performance']) {
        let output = '';
        output += `Start-up time: ${vscodeServerListenTime - vscodeServerStartTime}\n`;
        output += `Code loading time: ${vscodeServerCodeLoadedTime - vscodeServerStartTime}\n`;
        output += `Initialized time: ${currentTime - vscodeServerStartTime}\n`;
        output += `\n`;
        console.log(output);
    }
    return remoteExtensionHostAgentServer;
}
class WebEndpointOriginChecker {
    static create(productService) {
        const webEndpointUrlTemplate = productService.webEndpointUrlTemplate;
        const commit = productService.commit;
        const quality = productService.quality;
        if (!webEndpointUrlTemplate || !commit || !quality) {
            return new WebEndpointOriginChecker(null);
        }
        const uuid = generateUuid();
        const exampleUrl = new URL(webEndpointUrlTemplate
            .replace('{{uuid}}', uuid)
            .replace('{{commit}}', commit)
            .replace('{{quality}}', quality));
        const exampleOrigin = exampleUrl.origin;
        const originRegExpSource = escapeRegExpCharacters(exampleOrigin).replace(uuid, '[a-zA-Z0-9\\-]+');
        try {
            const originRegExp = createRegExp(`^${originRegExpSource}$`, true, { matchCase: false });
            return new WebEndpointOriginChecker(originRegExp);
        }
        catch (err) {
            return new WebEndpointOriginChecker(null);
        }
    }
    constructor(_originRegExp) {
        this._originRegExp = _originRegExp;
    }
    matches(origin) {
        if (!this._originRegExp) {
            return false;
        }
        return this._originRegExp.test(origin);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvcmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50U2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBRXhCLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFBO0FBQzFCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDeEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXRELE9BQU8sRUFDTixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLHlCQUF5QixHQUN6QixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsVUFBVSxFQUNWLHVCQUF1QixFQUN2QixPQUFPLEdBQ1AsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3pELE9BQU8sS0FBSyxJQUFJLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxLQUFLLFFBQVEsTUFBTSwrQkFBK0IsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkYsT0FBTyxFQUFFLEdB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