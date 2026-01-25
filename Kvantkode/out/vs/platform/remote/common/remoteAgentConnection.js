/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createCancelablePromise, promiseWithResolvers, } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { isCancellationError, onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { RemoteAuthorities } from '../../../base/common/network.js';
import * as performance from '../../../base/common/performance.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { Client, PersistentProtocol, } from '../../../base/parts/ipc/common/ipc.net.js';
import { RemoteAuthorityResolverError } from './remoteAuthorityResolver.js';
const RECONNECT_TIMEOUT = 30 * 1000; /* 30s */
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType[ConnectionType["Management"] = 1] = "Management";
    ConnectionType[ConnectionType["ExtensionHost"] = 2] = "ExtensionHost";
    ConnectionType[ConnectionType["Tunnel"] = 3] = "Tunnel";
})(ConnectionType || (ConnectionType = {}));
function connectionTypeToString(connectionType) {
    switch (connectionType) {
        case 1 /* ConnectionType.Management */:
            return 'Management';
        case 2 /* ConnectionType.ExtensionHost */:
            return 'ExtensionHost';
        case 3 /* ConnectionType.Tunnel */:
            return 'Tunnel';
    }
}
function createTimeoutCancellation(millis) {
    const source = new CancellationTokenSource();
    setTimeout(() => source.cancel(), millis);
    return source.token;
}
function combineTimeoutCancellation(a, b) {
    if (a.isCancellationRequested || b.isCancellationRequested) {
        return CancellationToken.Cancelled;
    }
    const source = new CancellationTokenSource();
    a.onCancellationRequested(() => source.cancel());
    b.onCancellationRequested(() => source.cancel());
    return source.token;
}
class PromiseWithTimeout {
    get didTimeout() {
        return this._state === 'timedout';
    }
    constructor(timeoutCancellationToken) {
        this._state = 'pending';
        this._disposables = new DisposableStore();
        ({
            promise: this.promise,
            resolve: this._resolvePromise,
            reject: this._rejectPromise,
        } = promiseWithResolvers());
        if (timeoutCancellationToken.isCancellationRequested) {
            this._timeout();
        }
        else {
            this._disposables.add(timeoutCancellationToken.onCancellationRequested(() => this._timeout()));
        }
    }
    registerDisposable(disposable) {
        if (this._state === 'pending') {
            this._disposables.add(disposable);
        }
        else {
            disposable.dispose();
        }
    }
    _timeout() {
        if (this._state !== 'pending') {
            return;
        }
        this._disposables.dispose();
        this._state = 'timedout';
        this._rejectPromise(this._createTimeoutError());
    }
    _createTimeoutError() {
        const err = new Error('Time limit reached');
        err.code = 'ETIMEDOUT';
        err.syscall = 'connect';
        return err;
    }
    resolve(value) {
        if (this._state !== 'pending') {
            return;
        }
        this._disposables.dispose();
        this._state = 'resolved';
        this._resolvePromise(value);
    }
    reject(err) {
        if (this._state !== 'pending') {
            return;
        }
        this._disposables.dispose();
        this._state = 'rejected';
        this._rejectPromise(err);
    }
}
function readOneControlMessage(protocol, timeoutCancellationToken) {
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    result.registerDisposable(protocol.onControlMessage((raw) => {
        const msg = JSON.parse(raw.toString());
        const error = getErrorFromMessage(msg);
        if (error) {
            result.reject(error);
        }
        else {
            result.resolve(msg);
        }
    }));
    return result.promise;
}
function createSocket(logService, remoteSocketFactoryService, connectTo, path, query, debugConnectionType, debugLabel, timeoutCancellationToken) {
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    const sw = StopWatch.create(false);
    logService.info(`Creating a socket (${debugLabel})...`);
    performance.mark(`code/willCreateSocket/${debugConnectionType}`);
    remoteSocketFactoryService.connect(connectTo, path, query, debugLabel).then((socket) => {
        if (result.didTimeout) {
            performance.mark(`code/didCreateSocketError/${debugConnectionType}`);
            logService.info(`Creating a socket (${debugLabel}) finished after ${sw.elapsed()} ms, but this is too late and has timed out already.`);
            socket?.dispose();
        }
        else {
            performance.mark(`code/didCreateSocketOK/${debugConnectionType}`);
            logService.info(`Creating a socket (${debugLabel}) was successful after ${sw.elapsed()} ms.`);
            result.resolve(socket);
        }
    }, (err) => {
        performance.mark(`code/didCreateSocketError/${debugConnectionType}`);
        logService.info(`Creating a socket (${debugLabel}) returned an error after ${sw.elapsed()} ms.`);
        logService.error(err);
        result.reject(err);
    });
    return result.promise;
}
function raceWithTimeoutCancellation(promise, timeoutCancellationToken) {
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    promise.then((res) => {
        if (!result.didTimeout) {
            result.resolve(res);
        }
    }, (err) => {
        if (!result.didTimeout) {
            result.reject(err);
        }
    });
    return result.promise;
}
async function connectToRemoteExtensionHostAgent(options, connectionType, args, timeoutCancellationToken) {
    const logPrefix = connectLogPrefix(options, connectionType);
    options.logService.trace(`${logPrefix} 1/6. invoking socketFactory.connect().`);
    let socket;
    try {
        socket = await createSocket(options.logService, options.remoteSocketFactoryService, options.connectTo, RemoteAuthorities.getServerRootPath(), `reconnectionToken=${options.reconnectionToken}&reconnection=${options.reconnectionProtocol ? 'true' : 'false'}`, connectionTypeToString(connectionType), `renderer-${connectionTypeToString(connectionType)}-${options.reconnectionToken}`, timeoutCancellationToken);
    }
    catch (error) {
        options.logService.error(`${logPrefix} socketFactory.connect() failed or timed out. Error:`);
        options.logService.error(error);
        throw error;
    }
    options.logService.trace(`${logPrefix} 2/6. socketFactory.connect() was successful.`);
    let protocol;
    let ownsProtocol;
    if (options.reconnectionProtocol) {
        options.reconnectionProtocol.beginAcceptReconnection(socket, null);
        protocol = options.reconnectionProtocol;
        ownsProtocol = false;
    }
    else {
        protocol = new PersistentProtocol({ socket });
        ownsProtocol = true;
    }
    options.logService.trace(`${logPrefix} 3/6. sending AuthRequest control message.`);
    const message = await raceWithTimeoutCancellation(options.signService.createNewMessage(generateUuid()), timeoutCancellationToken);
    const authRequest = {
        type: 'auth',
        auth: options.connectionToken || '00000000000000000000',
        data: message.data,
    };
    protocol.sendControl(VSBuffer.fromString(JSON.stringify(authRequest)));
    try {
        const msg = await readOneControlMessage(protocol, combineTimeoutCancellation(timeoutCancellationToken, createTimeoutCancellation(10000)));
        if (msg.type !== 'sign' || typeof msg.data !== 'string') {
            const error = new Error('Unexpected handshake message');
            error.code = 'VSCODE_CONNECTION_ERROR';
            throw error;
        }
        options.logService.trace(`${logPrefix} 4/6. received SignRequest control message.`);
        const isValid = await raceWithTimeoutCancellation(options.signService.validate(message, msg.signedData), timeoutCancellationToken);
        if (!isValid) {
            const error = new Error('Refused to connect to unsupported server');
            error.code = 'VSCODE_CONNECTION_ERROR';
            throw error;
        }
        const signed = await raceWithTimeoutCancellation(options.signService.sign(msg.data), timeoutCancellationToken);
        const connTypeRequest = {
            type: 'connectionType',
            commit: options.commit,
            signedData: signed,
            desiredConnectionType: connectionType,
        };
        if (args) {
            connTypeRequest.args = args;
        }
        options.logService.trace(`${logPrefix} 5/6. sending ConnectionTypeRequest control message.`);
        protocol.sendControl(VSBuffer.fromString(JSON.stringify(connTypeRequest)));
        return { protocol, ownsProtocol };
    }
    catch (error) {
        if (error && error.code === 'ETIMEDOUT') {
            options.logService.error(`${logPrefix} the handshake timed out. Error:`);
            options.logService.error(error);
        }
        if (error && error.code === 'VSCODE_CONNECTION_ERROR') {
            options.logService.error(`${logPrefix} received error control message when negotiating connection. Error:`);
            options.logService.error(error);
        }
        if (ownsProtocol) {
            safeDisposeProtocolAndSocket(protocol);
        }
        throw error;
    }
}
async function connectToRemoteExtensionHostAgentAndReadOneMessage(options, connectionType, args, timeoutCancellationToken) {
    const startTime = Date.now();
    const logPrefix = connectLogPrefix(options, connectionType);
    const { protocol, ownsProtocol } = await connectToRemoteExtensionHostAgent(options, connectionType, args, timeoutCancellationToken);
    const result = new PromiseWithTimeout(timeoutCancellationToken);
    result.registerDisposable(protocol.onControlMessage((raw) => {
        const msg = JSON.parse(raw.toString());
        const error = getErrorFromMessage(msg);
        if (error) {
            options.logService.error(`${logPrefix} received error control message when negotiating connection. Error:`);
            options.logService.error(error);
            if (ownsProtocol) {
                safeDisposeProtocolAndSocket(protocol);
            }
            result.reject(error);
        }
        else {
            options.reconnectionProtocol?.endAcceptReconnection();
            options.logService.trace(`${logPrefix} 6/6. handshake finished, connection is up and running after ${logElapsed(startTime)}!`);
            result.resolve({ protocol, firstMessage: msg });
        }
    }));
    return result.promise;
}
async function doConnectRemoteAgentManagement(options, timeoutCancellationToken) {
    const { protocol } = await connectToRemoteExtensionHostAgentAndReadOneMessage(options, 1 /* ConnectionType.Management */, undefined, timeoutCancellationToken);
    return { protocol };
}
async function doConnectRemoteAgentExtensionHost(options, startArguments, timeoutCancellationToken) {
    const { protocol, firstMessage } = await connectToRemoteExtensionHostAgentAndReadOneMessage(options, 2 /* ConnectionType.ExtensionHost */, startArguments, timeoutCancellationToken);
    const debugPort = firstMessage && firstMessage.debugPort;
    return { protocol, debugPort };
}
async function doConnectRemoteAgentTunnel(options, startParams, timeoutCancellationToken) {
    const startTime = Date.now();
    const logPrefix = connectLogPrefix(options, 3 /* ConnectionType.Tunnel */);
    const { protocol } = await connectToRemoteExtensionHostAgent(options, 3 /* ConnectionType.Tunnel */, startParams, timeoutCancellationToken);
    options.logService.trace(`${logPrefix} 6/6. handshake finished, connection is up and running after ${logElapsed(startTime)}!`);
    return protocol;
}
async function resolveConnectionOptions(options, reconnectionToken, reconnectionProtocol) {
    const { connectTo, connectionToken } = await options.addressProvider.getAddress();
    return {
        commit: options.commit,
        quality: options.quality,
        connectTo,
        connectionToken: connectionToken,
        reconnectionToken: reconnectionToken,
        reconnectionProtocol: reconnectionProtocol,
        remoteSocketFactoryService: options.remoteSocketFactoryService,
        signService: options.signService,
        logService: options.logService,
    };
}
export async function connectRemoteAgentManagement(options, remoteAuthority, clientId) {
    return createInitialConnection(options, async (simpleOptions) => {
        const { protocol } = await doConnectRemoteAgentManagement(simpleOptions, CancellationToken.None);
        return new ManagementPersistentConnection(options, remoteAuthority, clientId, simpleOptions.reconnectionToken, protocol);
    });
}
export async function connectRemoteAgentExtensionHost(options, startArguments) {
    return createInitialConnection(options, async (simpleOptions) => {
        const { protocol, debugPort } = await doConnectRemoteAgentExtensionHost(simpleOptions, startArguments, CancellationToken.None);
        return new ExtensionHostPersistentConnection(options, startArguments, simpleOptions.reconnectionToken, protocol, debugPort);
    });
}
/**
 * Will attempt to connect 5 times. If it fails 5 consecutive times, it will give up.
 */
async function createInitialConnection(options, connectionFactory) {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1;; attempt++) {
        try {
            const reconnectionToken = generateUuid();
            const simpleOptions = await resolveConnectionOptions(options, reconnectionToken, null);
            const result = await connectionFactory(simpleOptions);
            return result;
        }
        catch (err) {
            if (attempt < MAX_ATTEMPTS) {
                options.logService.error(`[remote-connection][attempt ${attempt}] An error occurred in initial connection! Will retry... Error:`);
                options.logService.error(err);
            }
            else {
                options.logService.error(`[remote-connection][attempt ${attempt}]  An error occurred in initial connection! It will be treated as a permanent error. Error:`);
                options.logService.error(err);
                PersistentConnection.triggerPermanentFailure(0, 0, RemoteAuthorityResolverError.isHandled(err));
                throw err;
            }
        }
    }
}
export async function connectRemoteAgentTunnel(options, tunnelRemoteHost, tunnelRemotePort) {
    const simpleOptions = await resolveConnectionOptions(options, generateUuid(), null);
    const protocol = await doConnectRemoteAgentTunnel(simpleOptions, { host: tunnelRemoteHost, port: tunnelRemotePort }, CancellationToken.None);
    return protocol;
}
function sleep(seconds) {
    return createCancelablePromise((token) => {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, seconds * 1000);
            token.onCancellationRequested(() => {
                clearTimeout(timeout);
                resolve();
            });
        });
    });
}
export var PersistentConnectionEventType;
(function (PersistentConnectionEventType) {
    PersistentConnectionEventType[PersistentConnectionEventType["ConnectionLost"] = 0] = "ConnectionLost";
    PersistentConnectionEventType[PersistentConnectionEventType["ReconnectionWait"] = 1] = "ReconnectionWait";
    PersistentConnectionEventType[PersistentConnectionEventType["ReconnectionRunning"] = 2] = "ReconnectionRunning";
    PersistentConnectionEventType[PersistentConnectionEventType["ReconnectionPermanentFailure"] = 3] = "ReconnectionPermanentFailure";
    PersistentConnectionEventType[PersistentConnectionEventType["ConnectionGain"] = 4] = "ConnectionGain";
})(PersistentConnectionEventType || (PersistentConnectionEventType = {}));
export class ConnectionLostEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.type = 0 /* PersistentConnectionEventType.ConnectionLost */;
    }
}
export class ReconnectionWaitEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, durationSeconds, cancellableTimer) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.durationSeconds = durationSeconds;
        this.cancellableTimer = cancellableTimer;
        this.type = 1 /* PersistentConnectionEventType.ReconnectionWait */;
    }
    skipWait() {
        this.cancellableTimer.cancel();
    }
}
export class ReconnectionRunningEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, attempt) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.attempt = attempt;
        this.type = 2 /* PersistentConnectionEventType.ReconnectionRunning */;
    }
}
export class ConnectionGainEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, attempt) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.attempt = attempt;
        this.type = 4 /* PersistentConnectionEventType.ConnectionGain */;
    }
}
export class ReconnectionPermanentFailureEvent {
    constructor(reconnectionToken, millisSinceLastIncomingData, attempt, handled) {
        this.reconnectionToken = reconnectionToken;
        this.millisSinceLastIncomingData = millisSinceLastIncomingData;
        this.attempt = attempt;
        this.handled = handled;
        this.type = 3 /* PersistentConnectionEventType.ReconnectionPermanentFailure */;
    }
}
export class PersistentConnection extends Disposable {
    static triggerPermanentFailure(millisSinceLastIncomingData, attempt, handled) {
        this._permanentFailure = true;
        this._permanentFailureMillisSinceLastIncomingData = millisSinceLastIncomingData;
        this._permanentFailureAttempt = attempt;
        this._permanentFailureHandled = handled;
        this._instances.forEach((instance) => instance._gotoPermanentFailure(this._permanentFailureMillisSinceLastIncomingData, this._permanentFailureAttempt, this._permanentFailureHandled));
    }
    static debugTriggerReconnection() {
        this._instances.forEach((instance) => instance._beginReconnecting());
    }
    static debugPauseSocketWriting() {
        this._instances.forEach((instance) => instance._pauseSocketWriting());
    }
    static { this._permanentFailure = false; }
    static { this._permanentFailureMillisSinceLastIncomingData = 0; }
    static { this._permanentFailureAttempt = 0; }
    static { this._permanentFailureHandled = false; }
    static { this._instances = []; }
    get _isPermanentFailure() {
        return this._permanentFailure || PersistentConnection._permanentFailure;
    }
    constructor(_connectionType, _options, reconnectionToken, protocol, _reconnectionFailureIsFatal) {
        super();
        this._connectionType = _connectionType;
        this._options = _options;
        this.reconnectionToken = reconnectionToken;
        this.protocol = protocol;
        this._reconnectionFailureIsFatal = _reconnectionFailureIsFatal;
        this._onDidStateChange = this._register(new Emitter());
        this.onDidStateChange = this._onDidStateChange.event;
        this._permanentFailure = false;
        this._isReconnecting = false;
        this._isDisposed = false;
        this._onDidStateChange.fire(new ConnectionGainEvent(this.reconnectionToken, 0, 0));
        this._register(protocol.onSocketClose((e) => {
            const logPrefix = commonLogPrefix(this._connectionType, this.reconnectionToken, true);
            if (!e) {
                this._options.logService.info(`${logPrefix} received socket close event.`);
            }
            else if (e.type === 0 /* SocketCloseEventType.NodeSocketCloseEvent */) {
                this._options.logService.info(`${logPrefix} received socket close event (hadError: ${e.hadError}).`);
                if (e.error) {
                    this._options.logService.error(e.error);
                }
            }
            else {
                this._options.logService.info(`${logPrefix} received socket close event (wasClean: ${e.wasClean}, code: ${e.code}, reason: ${e.reason}).`);
                if (e.event) {
                    this._options.logService.error(e.event);
                }
            }
            this._beginReconnecting();
        }));
        this._register(protocol.onSocketTimeout((e) => {
            const logPrefix = commonLogPrefix(this._connectionType, this.reconnectionToken, true);
            this._options.logService.info(`${logPrefix} received socket timeout event (unacknowledgedMsgCount: ${e.unacknowledgedMsgCount}, timeSinceOldestUnacknowledgedMsg: ${e.timeSinceOldestUnacknowledgedMsg}, timeSinceLastReceivedSomeData: ${e.timeSinceLastReceivedSomeData}).`);
            this._beginReconnecting();
        }));
        PersistentConnection._instances.push(this);
        this._register(toDisposable(() => {
            const myIndex = PersistentConnection._instances.indexOf(this);
            if (myIndex >= 0) {
                PersistentConnection._instances.splice(myIndex, 1);
            }
        }));
        if (this._isPermanentFailure) {
            this._gotoPermanentFailure(PersistentConnection._permanentFailureMillisSinceLastIncomingData, PersistentConnection._permanentFailureAttempt, PersistentConnection._permanentFailureHandled);
        }
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
    async _beginReconnecting() {
        // Only have one reconnection loop active at a time.
        if (this._isReconnecting) {
            return;
        }
        try {
            this._isReconnecting = true;
            await this._runReconnectingLoop();
        }
        finally {
            this._isReconnecting = false;
        }
    }
    async _runReconnectingLoop() {
        if (this._isPermanentFailure || this._isDisposed) {
            // no more attempts!
            return;
        }
        const logPrefix = commonLogPrefix(this._connectionType, this.reconnectionToken, true);
        this._options.logService.info(`${logPrefix} starting reconnecting loop. You can get more information with the trace log level.`);
        this._onDidStateChange.fire(new ConnectionLostEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData()));
        const TIMES = [0, 5, 5, 10, 10, 10, 10, 10, 30];
        let attempt = -1;
        do {
            attempt++;
            const waitTime = attempt < TIMES.length ? TIMES[attempt] : TIMES[TIMES.length - 1];
            try {
                if (waitTime > 0) {
                    const sleepPromise = sleep(waitTime);
                    this._onDidStateChange.fire(new ReconnectionWaitEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData(), waitTime, sleepPromise));
                    this._options.logService.info(`${logPrefix} waiting for ${waitTime} seconds before reconnecting...`);
                    try {
                        await sleepPromise;
                    }
                    catch { } // User canceled timer
                }
                if (this._isPermanentFailure) {
                    this._options.logService.error(`${logPrefix} permanent failure occurred while running the reconnecting loop.`);
                    break;
                }
                // connection was lost, let's try to re-establish it
                this._onDidStateChange.fire(new ReconnectionRunningEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData(), attempt + 1));
                this._options.logService.info(`${logPrefix} resolving connection...`);
                const simpleOptions = await resolveConnectionOptions(this._options, this.reconnectionToken, this.protocol);
                this._options.logService.info(`${logPrefix} connecting to ${simpleOptions.connectTo}...`);
                await this._reconnect(simpleOptions, createTimeoutCancellation(RECONNECT_TIMEOUT));
                this._options.logService.info(`${logPrefix} reconnected!`);
                this._onDidStateChange.fire(new ConnectionGainEvent(this.reconnectionToken, this.protocol.getMillisSinceLastIncomingData(), attempt + 1));
                break;
            }
            catch (err) {
                if (err.code === 'VSCODE_CONNECTION_ERROR') {
                    this._options.logService.error(`${logPrefix} A permanent error occurred in the reconnecting loop! Will give up now! Error:`);
                    this._options.logService.error(err);
                    this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, false);
                    break;
                }
                if (attempt > 360) {
                    // ReconnectionGraceTime is 3hrs, with 30s between attempts that yields a maximum of 360 attempts
                    this._options.logService.error(`${logPrefix} An error occurred while reconnecting, but it will be treated as a permanent error because the reconnection grace time has expired! Will give up now! Error:`);
                    this._options.logService.error(err);
                    this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, false);
                    break;
                }
                if (RemoteAuthorityResolverError.isTemporarilyNotAvailable(err)) {
                    this._options.logService.info(`${logPrefix} A temporarily not available error occurred while trying to reconnect, will try again...`);
                    this._options.logService.trace(err);
                    // try again!
                    continue;
                }
                if ((err.code === 'ETIMEDOUT' ||
                    err.code === 'ENETUNREACH' ||
                    err.code === 'ECONNREFUSED' ||
                    err.code === 'ECONNRESET') &&
                    err.syscall === 'connect') {
                    this._options.logService.info(`${logPrefix} A network error occurred while trying to reconnect, will try again...`);
                    this._options.logService.trace(err);
                    // try again!
                    continue;
                }
                if (isCancellationError(err)) {
                    this._options.logService.info(`${logPrefix} A promise cancelation error occurred while trying to reconnect, will try again...`);
                    this._options.logService.trace(err);
                    // try again!
                    continue;
                }
                if (err instanceof RemoteAuthorityResolverError) {
                    this._options.logService.error(`${logPrefix} A RemoteAuthorityResolverError occurred while trying to reconnect. Will give up now! Error:`);
                    this._options.logService.error(err);
                    this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, RemoteAuthorityResolverError.isHandled(err));
                    break;
                }
                this._options.logService.error(`${logPrefix} An unknown error occurred while trying to reconnect, since this is an unknown case, it will be treated as a permanent error! Will give up now! Error:`);
                this._options.logService.error(err);
                this._onReconnectionPermanentFailure(this.protocol.getMillisSinceLastIncomingData(), attempt + 1, false);
                break;
            }
        } while (!this._isPermanentFailure && !this._isDisposed);
    }
    _onReconnectionPermanentFailure(millisSinceLastIncomingData, attempt, handled) {
        if (this._reconnectionFailureIsFatal) {
            PersistentConnection.triggerPermanentFailure(millisSinceLastIncomingData, attempt, handled);
        }
        else {
            this._gotoPermanentFailure(millisSinceLastIncomingData, attempt, handled);
        }
    }
    _gotoPermanentFailure(millisSinceLastIncomingData, attempt, handled) {
        this._onDidStateChange.fire(new ReconnectionPermanentFailureEvent(this.reconnectionToken, millisSinceLastIncomingData, attempt, handled));
        safeDisposeProtocolAndSocket(this.protocol);
    }
    _pauseSocketWriting() {
        this.protocol.pauseSocketWriting();
    }
}
export class ManagementPersistentConnection extends PersistentConnection {
    constructor(options, remoteAuthority, clientId, reconnectionToken, protocol) {
        super(1 /* ConnectionType.Management */, options, reconnectionToken, protocol, 
        /*reconnectionFailureIsFatal*/ true);
        this.client = this._register(new Client(protocol, {
            remoteAuthority: remoteAuthority,
            clientId: clientId,
        }, options.ipcLogger));
    }
    async _reconnect(options, timeoutCancellationToken) {
        await doConnectRemoteAgentManagement(options, timeoutCancellationToken);
    }
}
export class ExtensionHostPersistentConnection extends PersistentConnection {
    constructor(options, startArguments, reconnectionToken, protocol, debugPort) {
        super(2 /* ConnectionType.ExtensionHost */, options, reconnectionToken, protocol, 
        /*reconnectionFailureIsFatal*/ false);
        this._startArguments = startArguments;
        this.debugPort = debugPort;
    }
    async _reconnect(options, timeoutCancellationToken) {
        await doConnectRemoteAgentExtensionHost(options, this._startArguments, timeoutCancellationToken);
    }
}
function safeDisposeProtocolAndSocket(protocol) {
    try {
        protocol.acceptDisconnect();
        const socket = protocol.getSocket();
        protocol.dispose();
        socket.dispose();
    }
    catch (err) {
        onUnexpectedError(err);
    }
}
function getErrorFromMessage(msg) {
    if (msg && msg.type === 'error') {
        const error = new Error(`Connection error: ${msg.reason}`);
        error.code = 'VSCODE_CONNECTION_ERROR';
        return error;
    }
    return null;
}
function stringRightPad(str, len) {
    while (str.length < len) {
        str += ' ';
    }
    return str;
}
function _commonLogPrefix(connectionType, reconnectionToken) {
    return `[remote-connection][${stringRightPad(connectionTypeToString(connectionType), 13)}][${reconnectionToken.substr(0, 5)}…]`;
}
function commonLogPrefix(connectionType, reconnectionToken, isReconnect) {
    return `${_commonLogPrefix(connectionType, reconnectionToken)}[${isReconnect ? 'reconnect' : 'initial'}]`;
}
function connectLogPrefix(options, connectionType) {
    return `${commonLogPrefix(connectionType, options.reconnectionToken, !!options.reconnectionProtocol)}[${options.connectTo}]`;
}
function logElapsed(startTime) {
    return `${Date.now() - startTime} ms`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRDb25uZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL3JlbW90ZUFnZW50Q29ubmVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUNwQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbkUsT0FBTyxLQUFLLFdBQVcsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRTNELE9BQU8sRUFDTixNQUFNLEVBRU4sa0JBQWtCLEdBRWxCLE1BQU0sMkNBQTJDLENBQUE7QUFHbEQsT0FBTyxFQUFFLDRCQUE0QixFQUFvQixNQUFNLDhCQUE4QixDQUFBO0FBSTdGLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQSxDQUFDLFNBQVM7QUFFN0MsTUFBTSxDQUFOLElBQWtCLGNBSWpCO0FBSkQsV0FBa0Is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