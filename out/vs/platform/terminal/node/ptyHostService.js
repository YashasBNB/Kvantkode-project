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
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { OS, isWindows, } from '../../../base/common/platform.js';
import { ProxyChannel } from '../../../base/parts/ipc/common/ipc.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { ILogService, ILoggerService, LogLevel } from '../../log/common/log.js';
import { RemoteLoggerChannelClient } from '../../log/common/logIpc.js';
import { getResolvedShellEnv } from '../../shell/node/shellEnv.js';
import { RequestStore } from '../common/requestStore.js';
import { HeartbeatConstants, TerminalIpcChannels, } from '../common/terminal.js';
import { registerTerminalPlatformConfiguration } from '../common/terminalPlatformConfiguration.js';
import { detectAvailableProfiles } from './terminalProfiles.js';
import { getSystemShell } from '../../../base/node/shell.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
var Constants;
(function (Constants) {
    Constants[Constants["MaxRestarts"] = 5] = "MaxRestarts";
})(Constants || (Constants = {}));
/**
 * This service implements IPtyService by launching a pty host process, forwarding messages to and
 * from the pty host process and manages the connection.
 */
let PtyHostService = class PtyHostService extends Disposable {
    get _connection() {
        this._ensurePtyHost();
        return this.__connection;
    }
    get _proxy() {
        this._ensurePtyHost();
        return this.__proxy;
    }
    /**
     * Get the proxy if it exists, otherwise undefined. This is used when calls are not needed to be
     * passed through to the pty host if it has not yet been spawned.
     */
    get _optionalProxy() {
        return this.__proxy;
    }
    _ensurePtyHost() {
        if (!this.__connection) {
            this._startPtyHost();
        }
    }
    constructor(_ptyHostStarter, _configurationService, _logService, _loggerService) {
        super();
        this._ptyHostStarter = _ptyHostStarter;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._loggerService = _loggerService;
        this._wasQuitRequested = false;
        this._restartCount = 0;
        this._isResponsive = true;
        this._onPtyHostExit = this._register(new Emitter());
        this.onPtyHostExit = this._onPtyHostExit.event;
        this._onPtyHostStart = this._register(new Emitter());
        this.onPtyHostStart = this._onPtyHostStart.event;
        this._onPtyHostUnresponsive = this._register(new Emitter());
        this.onPtyHostUnresponsive = this._onPtyHostUnresponsive.event;
        this._onPtyHostResponsive = this._register(new Emitter());
        this.onPtyHostResponsive = this._onPtyHostResponsive.event;
        this._onPtyHostRequestResolveVariables = this._register(new Emitter());
        this.onPtyHostRequestResolveVariables = this._onPtyHostRequestResolveVariables.event;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onProcessReplay = this._register(new Emitter());
        this.onProcessReplay = this._onProcessReplay.event;
        this._onProcessOrphanQuestion = this._register(new Emitter());
        this.onProcessOrphanQuestion = this._onProcessOrphanQuestion.event;
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._onDidRequestDetach.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        // Platform configuration is required on the process running the pty host (shared process or
        // remote server).
        registerTerminalPlatformConfiguration();
        this._register(this._ptyHostStarter);
        this._register(toDisposable(() => this._disposePtyHost()));
        this._resolveVariablesRequestStore = this._register(new RequestStore(undefined, this._logService));
        this._register(this._resolveVariablesRequestStore.onCreateRequest(this._onPtyHostRequestResolveVariables.fire, this._onPtyHostRequestResolveVariables));
        // Start the pty host when a window requests a connection, if the starter has that capability.
        if (this._ptyHostStarter.onRequestConnection) {
            this._register(Event.once(this._ptyHostStarter.onRequestConnection)(() => this._ensurePtyHost()));
        }
        if (this._ptyHostStarter.onWillShutdown) {
            this._register(this._ptyHostStarter.onWillShutdown(() => (this._wasQuitRequested = true)));
        }
    }
    get _ignoreProcessNames() {
        return this._configurationService.getValue("terminal.integrated.ignoreProcessNames" /* TerminalSettingId.IgnoreProcessNames */);
    }
    async _refreshIgnoreProcessNames() {
        return this._optionalProxy?.refreshIgnoreProcessNames?.(this._ignoreProcessNames);
    }
    async _resolveShellEnv() {
        if (isWindows) {
            return process.env;
        }
        try {
            return await getResolvedShellEnv(this._configurationService, this._logService, { _: [] }, process.env);
        }
        catch (error) {
            this._logService.error('ptyHost was unable to resolve shell environment', error);
            return {};
        }
    }
    _startPtyHost() {
        const connection = this._ptyHostStarter.start();
        const client = connection.client;
        // Log a full stack trace which will tell the exact reason the pty host is starting up
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('PtyHostService#_startPtyHost', new Error().stack?.replace(/^Error/, ''));
        }
        // Setup heartbeat service and trigger a heartbeat immediately to reset the timeouts
        const heartbeatService = ProxyChannel.toService(client.getChannel(TerminalIpcChannels.Heartbeat));
        heartbeatService.onBeat(() => this._handleHeartbeat());
        this._handleHeartbeat(true);
        // Handle exit
        this._register(connection.onDidProcessExit((e) => {
            this._onPtyHostExit.fire(e.code);
            if (!this._wasQuitRequested && !this._store.isDisposed) {
                if (this._restartCount <= Constants.MaxRestarts) {
                    this._logService.error(`ptyHost terminated unexpectedly with code ${e.code}`);
                    this._restartCount++;
                    this.restartPtyHost();
                }
                else {
                    this._logService.error(`ptyHost terminated unexpectedly with code ${e.code}, giving up`);
                }
            }
        }));
        // Create proxy and forward events
        const proxy = ProxyChannel.toService(client.getChannel(TerminalIpcChannels.PtyHost));
        this._register(proxy.onProcessData((e) => this._onProcessData.fire(e)));
        this._register(proxy.onProcessReady((e) => this._onProcessReady.fire(e)));
        this._register(proxy.onProcessExit((e) => this._onProcessExit.fire(e)));
        this._register(proxy.onDidChangeProperty((e) => this._onDidChangeProperty.fire(e)));
        this._register(proxy.onProcessReplay((e) => this._onProcessReplay.fire(e)));
        this._register(proxy.onProcessOrphanQuestion((e) => this._onProcessOrphanQuestion.fire(e)));
        this._register(proxy.onDidRequestDetach((e) => this._onDidRequestDetach.fire(e)));
        this._register(new RemoteLoggerChannelClient(this._loggerService, client.getChannel(TerminalIpcChannels.Logger)));
        this.__connection = connection;
        this.__proxy = proxy;
        this._onPtyHostStart.fire();
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.ignoreProcessNames" /* TerminalSettingId.IgnoreProcessNames */)) {
                await this._refreshIgnoreProcessNames();
            }
        }));
        this._refreshIgnoreProcessNames();
        return [connection, proxy];
    }
    async createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, executableEnv, options, shouldPersist, workspaceId, workspaceName) {
        const timeout = setTimeout(() => this._handleUnresponsiveCreateProcess(), HeartbeatConstants.CreateProcessTimeout);
        const id = await this._proxy.createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, executableEnv, options, shouldPersist, workspaceId, workspaceName);
        clearTimeout(timeout);
        return id;
    }
    updateTitle(id, title, titleSource) {
        return this._proxy.updateTitle(id, title, titleSource);
    }
    updateIcon(id, userInitiated, icon, color) {
        return this._proxy.updateIcon(id, userInitiated, icon, color);
    }
    attachToProcess(id) {
        return this._proxy.attachToProcess(id);
    }
    detachFromProcess(id, forcePersist) {
        return this._proxy.detachFromProcess(id, forcePersist);
    }
    shutdownAll() {
        return this._proxy.shutdownAll();
    }
    listProcesses() {
        return this._proxy.listProcesses();
    }
    async getPerformanceMarks() {
        return this._optionalProxy?.getPerformanceMarks() ?? [];
    }
    async reduceConnectionGraceTime() {
        return this._optionalProxy?.reduceConnectionGraceTime();
    }
    start(id) {
        return this._proxy.start(id);
    }
    shutdown(id, immediate) {
        return this._proxy.shutdown(id, immediate);
    }
    input(id, data) {
        return this._proxy.input(id, data);
    }
    processBinary(id, data) {
        return this._proxy.processBinary(id, data);
    }
    resize(id, cols, rows) {
        return this._proxy.resize(id, cols, rows);
    }
    clearBuffer(id) {
        return this._proxy.clearBuffer(id);
    }
    acknowledgeDataEvent(id, charCount) {
        return this._proxy.acknowledgeDataEvent(id, charCount);
    }
    setUnicodeVersion(id, version) {
        return this._proxy.setUnicodeVersion(id, version);
    }
    getInitialCwd(id) {
        return this._proxy.getInitialCwd(id);
    }
    getCwd(id) {
        return this._proxy.getCwd(id);
    }
    async getLatency() {
        const sw = new StopWatch();
        const results = await this._proxy.getLatency();
        sw.stop();
        return [
            {
                label: 'ptyhostservice<->ptyhost',
                latency: sw.elapsed(),
            },
            ...results,
        ];
    }
    orphanQuestionReply(id) {
        return this._proxy.orphanQuestionReply(id);
    }
    installAutoReply(match, reply) {
        return this._proxy.installAutoReply(match, reply);
    }
    uninstallAllAutoReplies() {
        return this._proxy.uninstallAllAutoReplies();
    }
    getDefaultSystemShell(osOverride) {
        return (this._optionalProxy?.getDefaultSystemShell(osOverride) ??
            getSystemShell(osOverride ?? OS, process.env));
    }
    async getProfiles(workspaceId, profiles, defaultProfile, includeDetectedProfiles = false) {
        const shellEnv = await this._resolveShellEnv();
        return detectAvailableProfiles(profiles, defaultProfile, includeDetectedProfiles, this._configurationService, shellEnv, undefined, this._logService, this._resolveVariables.bind(this, workspaceId));
    }
    async getEnvironment() {
        // If the pty host is yet to be launched, just return the environment of this process as it
        // is essentially the same when used to evaluate terminal profiles.
        if (!this.__proxy) {
            return { ...process.env };
        }
        return this._proxy.getEnvironment();
    }
    getWslPath(original, direction) {
        return this._proxy.getWslPath(original, direction);
    }
    getRevivedPtyNewId(workspaceId, id) {
        return this._proxy.getRevivedPtyNewId(workspaceId, id);
    }
    setTerminalLayoutInfo(args) {
        return this._proxy.setTerminalLayoutInfo(args);
    }
    async getTerminalLayoutInfo(args) {
        // This is optional as we want reconnect requests to go through only if the pty host exists.
        // Revive is handled specially as reviveTerminalProcesses is guaranteed to be called before
        // the request for layout info.
        return this._optionalProxy?.getTerminalLayoutInfo(args);
    }
    async requestDetachInstance(workspaceId, instanceId) {
        return this._proxy.requestDetachInstance(workspaceId, instanceId);
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        return this._proxy.acceptDetachInstanceReply(requestId, persistentProcessId);
    }
    async freePortKillProcess(port) {
        if (!this._proxy.freePortKillProcess) {
            throw new Error('freePortKillProcess does not exist on the pty proxy');
        }
        return this._proxy.freePortKillProcess(port);
    }
    async serializeTerminalState(ids) {
        return this._proxy.serializeTerminalState(ids);
    }
    async reviveTerminalProcesses(workspaceId, state, dateTimeFormatLocate) {
        return this._proxy.reviveTerminalProcesses(workspaceId, state, dateTimeFormatLocate);
    }
    async refreshProperty(id, property) {
        return this._proxy.refreshProperty(id, property);
    }
    async updateProperty(id, property, value) {
        return this._proxy.updateProperty(id, property, value);
    }
    async restartPtyHost() {
        this._disposePtyHost();
        this._isResponsive = true;
        this._startPtyHost();
    }
    _disposePtyHost() {
        this._proxy.shutdownAll();
        this._connection.store.dispose();
    }
    _handleHeartbeat(isConnecting) {
        this._clearHeartbeatTimeouts();
        this._heartbeatFirstTimeout = setTimeout(() => this._handleHeartbeatFirstTimeout(), isConnecting
            ? HeartbeatConstants.ConnectingBeatInterval
            : HeartbeatConstants.BeatInterval * HeartbeatConstants.FirstWaitMultiplier);
        if (!this._isResponsive) {
            this._isResponsive = true;
            this._onPtyHostResponsive.fire();
        }
    }
    _handleHeartbeatFirstTimeout() {
        this._logService.warn(`No ptyHost heartbeat after ${(HeartbeatConstants.BeatInterval * HeartbeatConstants.FirstWaitMultiplier) / 1000} seconds`);
        this._heartbeatFirstTimeout = undefined;
        this._heartbeatSecondTimeout = setTimeout(() => this._handleHeartbeatSecondTimeout(), HeartbeatConstants.BeatInterval * HeartbeatConstants.SecondWaitMultiplier);
    }
    _handleHeartbeatSecondTimeout() {
        this._logService.error(`No ptyHost heartbeat after ${(HeartbeatConstants.BeatInterval * HeartbeatConstants.FirstWaitMultiplier + HeartbeatConstants.BeatInterval * HeartbeatConstants.FirstWaitMultiplier) / 1000} seconds`);
        this._heartbeatSecondTimeout = undefined;
        if (this._isResponsive) {
            this._isResponsive = false;
            this._onPtyHostUnresponsive.fire();
        }
    }
    _handleUnresponsiveCreateProcess() {
        this._clearHeartbeatTimeouts();
        this._logService.error(`No ptyHost response to createProcess after ${HeartbeatConstants.CreateProcessTimeout / 1000} seconds`);
        if (this._isResponsive) {
            this._isResponsive = false;
            this._onPtyHostUnresponsive.fire();
        }
    }
    _clearHeartbeatTimeouts() {
        if (this._heartbeatFirstTimeout) {
            clearTimeout(this._heartbeatFirstTimeout);
            this._heartbeatFirstTimeout = undefined;
        }
        if (this._heartbeatSecondTimeout) {
            clearTimeout(this._heartbeatSecondTimeout);
            this._heartbeatSecondTimeout = undefined;
        }
    }
    _resolveVariables(workspaceId, text) {
        return this._resolveVariablesRequestStore.createRequest({ workspaceId, originalText: text });
    }
    async acceptPtyHostResolvedVariables(requestId, resolved) {
        this._resolveVariablesRequestStore.acceptReply(requestId, resolved);
    }
};
PtyHostService = __decorate([
    __param(1, IConfigurationService),
    __param(2, ILogService),
    __param(3, ILoggerService)
], PtyHostService);
export { PtyHostService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5SG9zdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL3B0eUhvc3RTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBRU4sRUFBRSxFQUVGLFNBQVMsR0FDVCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMvRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDeEQsT0FBTyxFQUNOLGtCQUFrQixFQWtCbEIsbUJBQW1CLEdBR25CLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFPbEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFL0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU3RCxJQUFLLFNBRUo7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