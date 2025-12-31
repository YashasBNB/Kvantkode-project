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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQWdlbnRDb25uZWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVtb3RlL2NvbW1vbi9yZW1vdGVBZ2VudENvbm5lY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLHVCQUF1QixFQUN2QixvQkFBb0IsR0FDcEIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxXQUFXLE1BQU0scUNBQXFDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxPQUFPLEVBQ04sTUFBTSxFQUVOLGtCQUFrQixHQUVsQixNQUFNLDJDQUEyQyxDQUFBO0FBR2xELE9BQU8sRUFBRSw0QkFBNEIsRUFBb0IsTUFBTSw4QkFBOEIsQ0FBQTtBQUk3RixNQUFNLGlCQUFpQixHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUEsQ0FBQyxTQUFTO0FBRTdDLE1BQU0sQ0FBTixJQUFrQixjQUlqQjtBQUpELFdBQWtCLGNBQWM7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