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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uSG9zdEFnZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9yZW1vdGVFeHRlbnNpb25Ib3N0QWdlbnRTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFFeEIsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUN4QyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUMxQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFdEQsT0FBTyxFQUNOLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIseUJBQXlCLEdBQ3pCLE1BQU0sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUUsT0FBTyxFQUNOLHdCQUF3QixFQUN4QixVQUFVLEVBQ1YsdUJBQXVCLEVBQ3ZCLE9BQU8sR0FDUCxNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDekQsT0FBTyxLQUFLLElBQUksTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEtBQUssUUFBUSxNQUFNLCtCQUErQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIs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