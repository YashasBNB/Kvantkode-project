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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHR5SG9zdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvcHR5SG9zdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVFLE9BQU8sRUFFTixFQUFFLEVBRUYsU0FBUyxHQUNULE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQy9FLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWxFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sa0JBQWtCLEVBa0JsQixtQkFBbUIsR0FHbkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQU9sRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELElBQUss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