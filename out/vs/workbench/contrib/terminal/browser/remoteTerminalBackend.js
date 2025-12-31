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
import { DeferredPromise } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { revive } from '../../../../base/common/marshalling.js';
import { mark } from '../../../../base/common/performance.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITerminalLogService, TerminalExtensions, } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { BaseTerminalBackend } from './baseTerminalBackend.js';
import { RemotePty } from './remotePty.js';
import { ITerminalInstanceService } from './terminal.js';
import { RemoteTerminalChannelClient, REMOTE_TERMINAL_CHANNEL_NAME, } from '../common/remote/remoteTerminalChannel.js';
import { TERMINAL_CONFIG_SECTION, } from '../common/terminal.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
let RemoteTerminalBackendContribution = class RemoteTerminalBackendContribution {
    static { this.ID = 'remoteTerminalBackend'; }
    constructor(instantiationService, remoteAgentService, terminalInstanceService) {
        const connection = remoteAgentService.getConnection();
        if (connection?.remoteAuthority) {
            const channel = instantiationService.createInstance(RemoteTerminalChannelClient, connection.remoteAuthority, connection.getChannel(REMOTE_TERMINAL_CHANNEL_NAME));
            const backend = instantiationService.createInstance(RemoteTerminalBackend, connection.remoteAuthority, channel);
            Registry.as(TerminalExtensions.Backend).registerTerminalBackend(backend);
            terminalInstanceService.didRegisterBackend(backend);
        }
    }
};
RemoteTerminalBackendContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IRemoteAgentService),
    __param(2, ITerminalInstanceService)
], RemoteTerminalBackendContribution);
export { RemoteTerminalBackendContribution };
let RemoteTerminalBackend = class RemoteTerminalBackend extends BaseTerminalBackend {
    get whenReady() {
        return this._whenConnected.p;
    }
    setReady() {
        this._whenConnected.complete();
    }
    constructor(remoteAuthority, _remoteTerminalChannel, _remoteAgentService, _instantiationService, logService, _commandService, _storageService, _remoteAuthorityResolverService, workspaceContextService, configurationResolverService, _historyService, _configurationService, statusBarService) {
        super(_remoteTerminalChannel, logService, _historyService, configurationResolverService, statusBarService, workspaceContextService);
        this.remoteAuthority = remoteAuthority;
        this._remoteTerminalChannel = _remoteTerminalChannel;
        this._remoteAgentService = _remoteAgentService;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._storageService = _storageService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._historyService = _historyService;
        this._configurationService = _configurationService;
        this._ptys = new Map();
        this._whenConnected = new DeferredPromise();
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._onDidRequestDetach.event;
        this._onRestoreCommands = this._register(new Emitter());
        this.onRestoreCommands = this._onRestoreCommands.event;
        this._remoteTerminalChannel.onProcessData((e) => this._ptys.get(e.id)?.handleData(e.event));
        this._remoteTerminalChannel.onProcessReplay((e) => {
            this._ptys.get(e.id)?.handleReplay(e.event);
            if (e.event.commands.commands.length > 0) {
                this._onRestoreCommands.fire({ id: e.id, commands: e.event.commands.commands });
            }
        });
        this._remoteTerminalChannel.onProcessOrphanQuestion((e) => this._ptys.get(e.id)?.handleOrphanQuestion());
        this._remoteTerminalChannel.onDidRequestDetach((e) => this._onDidRequestDetach.fire(e));
        this._remoteTerminalChannel.onProcessReady((e) => this._ptys.get(e.id)?.handleReady(e.event));
        this._remoteTerminalChannel.onDidChangeProperty((e) => this._ptys.get(e.id)?.handleDidChangeProperty(e.property));
        this._remoteTerminalChannel.onProcessExit((e) => {
            const pty = this._ptys.get(e.id);
            if (pty) {
                pty.handleExit(e.event);
                this._ptys.delete(e.id);
            }
        });
        const allowedCommands = [
            '_remoteCLI.openExternal',
            '_remoteCLI.windowOpen',
            '_remoteCLI.getSystemStatus',
            '_remoteCLI.manageExtensions',
        ];
        this._remoteTerminalChannel.onExecuteCommand(async (e) => {
            // Ensure this request for for this window
            const pty = this._ptys.get(e.persistentProcessId);
            if (!pty) {
                return;
            }
            const reqId = e.reqId;
            const commandId = e.commandId;
            if (!allowedCommands.includes(commandId)) {
                this._remoteTerminalChannel.sendCommandResult(reqId, true, 'Invalid remote cli command: ' + commandId);
                return;
            }
            const commandArgs = e.commandArgs.map((arg) => revive(arg));
            try {
                const result = await this._commandService.executeCommand(e.commandId, ...commandArgs);
                this._remoteTerminalChannel.sendCommandResult(reqId, false, result);
            }
            catch (err) {
                this._remoteTerminalChannel.sendCommandResult(reqId, true, err);
            }
        });
        this._onPtyHostConnected.fire();
    }
    async requestDetachInstance(workspaceId, instanceId) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot request detach instance when there is no remote!`);
        }
        return this._remoteTerminalChannel.requestDetachInstance(workspaceId, instanceId);
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot accept detached instance when there is no remote!`);
        }
        else if (!persistentProcessId) {
            this._logService.warn('Cannot attach to feature terminals, custom pty terminals, or those without a persistentProcessId');
            return;
        }
        return this._remoteTerminalChannel.acceptDetachInstanceReply(requestId, persistentProcessId);
    }
    async persistTerminalState() {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot persist terminal state when there is no remote!`);
        }
        const ids = Array.from(this._ptys.keys());
        const serialized = await this._remoteTerminalChannel.serializeTerminalState(ids);
        this._storageService.store("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async createProcess(shellLaunchConfig, cwd, // TODO: This is ignored
    cols, rows, unicodeVersion, env, // TODO: This is ignored
    options, shouldPersist) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot create remote terminal when there is no remote!`);
        }
        // Fetch the environment to check shell permissions
        const remoteEnv = await this._remoteAgentService.getEnvironment();
        if (!remoteEnv) {
            // Extension host processes are only allowed in remote extension hosts currently
            throw new Error('Could not fetch remote environment');
        }
        const terminalConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION);
        const configuration = {
            'terminal.integrated.env.windows': this._configurationService.getValue("terminal.integrated.env.windows" /* TerminalSettingId.EnvWindows */),
            'terminal.integrated.env.osx': this._configurationService.getValue("terminal.integrated.env.osx" /* TerminalSettingId.EnvMacOs */),
            'terminal.integrated.env.linux': this._configurationService.getValue("terminal.integrated.env.linux" /* TerminalSettingId.EnvLinux */),
            'terminal.integrated.cwd': this._configurationService.getValue("terminal.integrated.cwd" /* TerminalSettingId.Cwd */),
            'terminal.integrated.detectLocale': terminalConfig.detectLocale,
        };
        const shellLaunchConfigDto = {
            name: shellLaunchConfig.name,
            executable: shellLaunchConfig.executable,
            args: shellLaunchConfig.args,
            cwd: shellLaunchConfig.cwd,
            env: shellLaunchConfig.env,
            useShellEnvironment: shellLaunchConfig.useShellEnvironment,
            reconnectionProperties: shellLaunchConfig.reconnectionProperties,
            type: shellLaunchConfig.type,
            isFeatureTerminal: shellLaunchConfig.isFeatureTerminal,
            tabActions: shellLaunchConfig.tabActions,
            shellIntegrationEnvironmentReporting: shellLaunchConfig.shellIntegrationEnvironmentReporting,
        };
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
        const result = await this._remoteTerminalChannel.createProcess(shellLaunchConfigDto, configuration, activeWorkspaceRootUri, options, shouldPersist, cols, rows, unicodeVersion);
        const pty = this._instantiationService.createInstance(RemotePty, result.persistentTerminalId, shouldPersist, this._remoteTerminalChannel);
        this._ptys.set(result.persistentTerminalId, pty);
        return pty;
    }
    async attachToProcess(id) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot create remote terminal when there is no remote!`);
        }
        try {
            await this._remoteTerminalChannel.attachToProcess(id);
            const pty = this._instantiationService.createInstance(RemotePty, id, true, this._remoteTerminalChannel);
            this._ptys.set(id, pty);
            return pty;
        }
        catch (e) {
            this._logService.trace(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async attachToRevivedProcess(id) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot create remote terminal when there is no remote!`);
        }
        try {
            const newId = (await this._remoteTerminalChannel.getRevivedPtyNewId(id)) ?? id;
            return await this.attachToProcess(newId);
        }
        catch (e) {
            this._logService.trace(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async listProcesses() {
        return this._remoteTerminalChannel.listProcesses();
    }
    async getLatency() {
        const sw = new StopWatch();
        const results = await this._remoteTerminalChannel.getLatency();
        sw.stop();
        return [
            {
                label: 'window<->ptyhostservice<->ptyhost',
                latency: sw.elapsed(),
            },
            ...results,
        ];
    }
    async updateProperty(id, property, value) {
        await this._remoteTerminalChannel.updateProperty(id, property, value);
    }
    async updateTitle(id, title, titleSource) {
        await this._remoteTerminalChannel.updateTitle(id, title, titleSource);
    }
    async updateIcon(id, userInitiated, icon, color) {
        await this._remoteTerminalChannel.updateIcon(id, userInitiated, icon, color);
    }
    async getDefaultSystemShell(osOverride) {
        return this._remoteTerminalChannel.getDefaultSystemShell(osOverride) || '';
    }
    async getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return (this._remoteTerminalChannel.getProfiles(profiles, defaultProfile, includeDetectedProfiles) ||
            []);
    }
    async getEnvironment() {
        return this._remoteTerminalChannel.getEnvironment() || {};
    }
    async getShellEnvironment() {
        const connection = this._remoteAgentService.getConnection();
        if (!connection) {
            return undefined;
        }
        const resolverResult = await this._remoteAuthorityResolverService.resolveAuthority(connection.remoteAuthority);
        return resolverResult.options?.extensionHostEnv;
    }
    async getWslPath(original, direction) {
        const env = await this._remoteAgentService.getEnvironment();
        if (env?.os !== 1 /* OperatingSystem.Windows */) {
            return original;
        }
        return this._remoteTerminalChannel.getWslPath(original, direction) || original;
    }
    async setTerminalLayoutInfo(layout) {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot call setActiveInstanceId when there is no remote`);
        }
        return this._remoteTerminalChannel.setTerminalLayoutInfo(layout);
    }
    async reduceConnectionGraceTime() {
        if (!this._remoteTerminalChannel) {
            throw new Error('Cannot reduce grace time when there is no remote');
        }
        return this._remoteTerminalChannel.reduceConnectionGraceTime();
    }
    async getTerminalLayoutInfo() {
        if (!this._remoteTerminalChannel) {
            throw new Error(`Cannot call getActiveInstanceId when there is no remote`);
        }
        const workspaceId = this._getWorkspaceId();
        // Revive processes if needed
        const serializedState = this._storageService.get("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
        const reviveBufferState = this._deserializeTerminalState(serializedState);
        if (reviveBufferState && reviveBufferState.length > 0) {
            try {
                // Note that remote terminals do not get their environment re-resolved unlike in local terminals
                mark('code/terminal/willReviveTerminalProcessesRemote');
                await this._remoteTerminalChannel.reviveTerminalProcesses(workspaceId, reviveBufferState, Intl.DateTimeFormat().resolvedOptions().locale);
                mark('code/terminal/didReviveTerminalProcessesRemote');
                this._storageService.remove("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
                // If reviving processes, send the terminal layout info back to the pty host as it
                // will not have been persisted on application exit
                const layoutInfo = this._storageService.get("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                if (layoutInfo) {
                    mark('code/terminal/willSetTerminalLayoutInfoRemote');
                    await this._remoteTerminalChannel.setTerminalLayoutInfo(JSON.parse(layoutInfo));
                    mark('code/terminal/didSetTerminalLayoutInfoRemote');
                    this._storageService.remove("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                }
            }
            catch (e) {
                this._logService.warn('RemoteTerminalBackend#getTerminalLayoutInfo Error', e && typeof e === 'object' && 'message' in e ? e.message : e);
            }
        }
        return this._remoteTerminalChannel.getTerminalLayoutInfo();
    }
    async getPerformanceMarks() {
        return this._remoteTerminalChannel.getPerformanceMarks();
    }
    installAutoReply(match, reply) {
        return this._remoteTerminalChannel.installAutoReply(match, reply);
    }
    uninstallAllAutoReplies() {
        return this._remoteTerminalChannel.uninstallAllAutoReplies();
    }
};
RemoteTerminalBackend = __decorate([
    __param(2, IRemoteAgentService),
    __param(3, IInstantiationService),
    __param(4, ITerminalLogService),
    __param(5, ICommandService),
    __param(6, IStorageService),
    __param(7, IRemoteAuthorityResolverService),
    __param(8, IWorkspaceContextService),
    __param(9, IConfigurationResolverService),
    __param(10, IHistoryService),
    __param(11, IConfigurationService),
    __param(12, IStatusbarService)
], RemoteTerminalBackend);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlVGVybWluYWxCYWNrZW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci9yZW1vdGVUZXJtaW5hbEJhY2tlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0QsT0FBTyxFQUFtQixJQUFJLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMvRyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQVFOLG1CQUFtQixFQU1uQixrQkFBa0IsR0FJbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENB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