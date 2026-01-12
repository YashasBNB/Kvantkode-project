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
import { Emitter } from '../../../../base/common/event.js';
import { isMacintosh, isWindows, } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ILocalPtyService, ITerminalLogService, TerminalExtensions, TerminalIpcChannels, } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalInstanceService } from '../browser/terminal.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { LocalPty } from './localPty.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IShellEnvironmentService } from '../../../services/environment/electron-sandbox/shellEnvironmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import * as terminalEnvironment from '../common/terminalEnvironment.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IEnvironmentVariableService } from '../common/environmentVariable.js';
import { BaseTerminalBackend } from '../browser/baseTerminalBackend.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-sandbox/ipc.mp.js';
import { getDelayedChannel, ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { mark } from '../../../../base/common/performance.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { memoize } from '../../../../base/common/decorators.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { shouldUseEnvironmentVariableCollection } from '../../../../platform/terminal/common/terminalEnvironment.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
let LocalTerminalBackendContribution = class LocalTerminalBackendContribution {
    static { this.ID = 'workbench.contrib.localTerminalBackend'; }
    constructor(instantiationService, terminalInstanceService) {
        const backend = instantiationService.createInstance(LocalTerminalBackend);
        Registry.as(TerminalExtensions.Backend).registerTerminalBackend(backend);
        terminalInstanceService.didRegisterBackend(backend);
    }
};
LocalTerminalBackendContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITerminalInstanceService)
], LocalTerminalBackendContribution);
export { LocalTerminalBackendContribution };
let LocalTerminalBackend = class LocalTerminalBackend extends BaseTerminalBackend {
    /**
     * Communicate to the direct proxy (renderer<->ptyhost) if it's available, otherwise use the
     * indirect proxy (renderer<->main<->ptyhost). The latter may not need to actually launch the
     * pty host, for example when detecting profiles.
     */
    get _proxy() {
        return this._directProxy || this._localPtyService;
    }
    get whenReady() {
        return this._whenReady.p;
    }
    setReady() {
        this._whenReady.complete();
    }
    constructor(workspaceContextService, _lifecycleService, logService, _localPtyService, _labelService, _shellEnvironmentService, _storageService, _configurationResolverService, _configurationService, _productService, _historyService, _terminalProfileResolverService, _environmentVariableService, historyService, _nativeHostService, statusBarService, _remoteAgentService) {
        super(_localPtyService, logService, historyService, _configurationResolverService, statusBarService, workspaceContextService);
        this._lifecycleService = _lifecycleService;
        this._localPtyService = _localPtyService;
        this._labelService = _labelService;
        this._shellEnvironmentService = _shellEnvironmentService;
        this._storageService = _storageService;
        this._configurationResolverService = _configurationResolverService;
        this._configurationService = _configurationService;
        this._productService = _productService;
        this._historyService = _historyService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._environmentVariableService = _environmentVariableService;
        this._nativeHostService = _nativeHostService;
        this._remoteAgentService = _remoteAgentService;
        this.remoteAuthority = undefined;
        this._ptys = new Map();
        this._directProxyDisposables = this._register(new MutableDisposable());
        this._whenReady = new DeferredPromise();
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._onDidRequestDetach.event;
        this._register(this.onPtyHostRestart(() => {
            this._directProxy = undefined;
            this._directProxyClientEventually = undefined;
            this._connectToDirectProxy();
        }));
    }
    /**
     * Request a direct connection to the pty host, this will launch the pty host process if necessary.
     */
    async _connectToDirectProxy() {
        // Check if connecting is in progress
        if (this._directProxyClientEventually) {
            await this._directProxyClientEventually.p;
            return;
        }
        this._logService.debug('Starting pty host');
        const directProxyClientEventually = new DeferredPromise();
        this._directProxyClientEventually = directProxyClientEventually;
        const directProxy = ProxyChannel.toService(getDelayedChannel(this._directProxyClientEventually.p.then((client) => client.getChannel(TerminalIpcChannels.PtyHostWindow))));
        this._directProxy = directProxy;
        this._directProxyDisposables.clear();
        // The pty host should not get launched until at least the window restored phase
        // if remote auth exists, don't await
        if (!this._remoteAgentService.getConnection()?.remoteAuthority) {
            await this._lifecycleService.when(3 /* LifecyclePhase.Restored */);
        }
        mark('code/terminal/willConnectPtyHost');
        this._logService.trace('Renderer->PtyHost#connect: before acquirePort');
        acquirePort('vscode:createPtyHostMessageChannel', 'vscode:createPtyHostMessageChannelResult').then((port) => {
            mark('code/terminal/didConnectPtyHost');
            this._logService.trace('Renderer->PtyHost#connect: connection established');
            const store = new DisposableStore();
            this._directProxyDisposables.value = store;
            // There are two connections to the pty host; one to the regular shared process
            // _localPtyService, and one directly via message port _ptyHostDirectProxy. The former is
            // used for pty host management messages, it would make sense in the future to use a
            // separate interface/service for this one.
            const client = store.add(new MessagePortClient(port, `window:${this._nativeHostService.windowId}`));
            directProxyClientEventually.complete(client);
            this._onPtyHostConnected.fire();
            // Attach process listeners
            store.add(directProxy.onProcessData((e) => this._ptys.get(e.id)?.handleData(e.event)));
            store.add(directProxy.onDidChangeProperty((e) => this._ptys.get(e.id)?.handleDidChangeProperty(e.property)));
            store.add(directProxy.onProcessExit((e) => {
                const pty = this._ptys.get(e.id);
                if (pty) {
                    pty.handleExit(e.event);
                    this._ptys.delete(e.id);
                }
            }));
            store.add(directProxy.onProcessReady((e) => this._ptys.get(e.id)?.handleReady(e.event)));
            store.add(directProxy.onProcessReplay((e) => this._ptys.get(e.id)?.handleReplay(e.event)));
            store.add(directProxy.onProcessOrphanQuestion((e) => this._ptys.get(e.id)?.handleOrphanQuestion()));
            store.add(directProxy.onDidRequestDetach((e) => this._onDidRequestDetach.fire(e)));
            // Eagerly fetch the backend's environment for memoization
            this.getEnvironment();
        });
    }
    async requestDetachInstance(workspaceId, instanceId) {
        return this._proxy.requestDetachInstance(workspaceId, instanceId);
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        if (!persistentProcessId) {
            this._logService.warn('Cannot attach to feature terminals, custom pty terminals, or those without a persistentProcessId');
            return;
        }
        return this._proxy.acceptDetachInstanceReply(requestId, persistentProcessId);
    }
    async persistTerminalState() {
        const ids = Array.from(this._ptys.keys());
        const serialized = await this._proxy.serializeTerminalState(ids);
        this._storageService.store("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async updateTitle(id, title, titleSource) {
        await this._proxy.updateTitle(id, title, titleSource);
    }
    async updateIcon(id, userInitiated, icon, color) {
        await this._proxy.updateIcon(id, userInitiated, icon, color);
    }
    async updateProperty(id, property, value) {
        return this._proxy.updateProperty(id, property, value);
    }
    async createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, options, shouldPersist) {
        await this._connectToDirectProxy();
        const executableEnv = await this._shellEnvironmentService.getShellEnv();
        const id = await this._proxy.createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, executableEnv, options, shouldPersist, this._getWorkspaceId(), this._getWorkspaceName());
        const pty = new LocalPty(id, shouldPersist, this._proxy);
        this._ptys.set(id, pty);
        return pty;
    }
    async attachToProcess(id) {
        await this._connectToDirectProxy();
        try {
            await this._proxy.attachToProcess(id);
            const pty = new LocalPty(id, true, this._proxy);
            this._ptys.set(id, pty);
            return pty;
        }
        catch (e) {
            this._logService.warn(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async attachToRevivedProcess(id) {
        await this._connectToDirectProxy();
        try {
            const newId = (await this._proxy.getRevivedPtyNewId(this._getWorkspaceId(), id)) ?? id;
            return await this.attachToProcess(newId);
        }
        catch (e) {
            this._logService.warn(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async listProcesses() {
        await this._connectToDirectProxy();
        return this._proxy.listProcesses();
    }
    async getLatency() {
        const measurements = [];
        const sw = new StopWatch();
        if (this._directProxy) {
            await this._directProxy.getLatency();
            sw.stop();
            measurements.push({
                label: 'window<->ptyhost (message port)',
                latency: sw.elapsed(),
            });
            sw.reset();
        }
        const results = await this._localPtyService.getLatency();
        sw.stop();
        measurements.push({
            label: 'window<->ptyhostservice<->ptyhost',
            latency: sw.elapsed(),
        });
        return [...measurements, ...results];
    }
    async getPerformanceMarks() {
        return this._proxy.getPerformanceMarks();
    }
    async reduceConnectionGraceTime() {
        this._proxy.reduceConnectionGraceTime();
    }
    async getDefaultSystemShell(osOverride) {
        return this._proxy.getDefaultSystemShell(osOverride);
    }
    async getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return (this._localPtyService.getProfiles(this._workspaceContextService.getWorkspace().id, profiles, defaultProfile, includeDetectedProfiles) || []);
    }
    async getEnvironment() {
        return this._proxy.getEnvironment();
    }
    async getShellEnvironment() {
        return this._shellEnvironmentService.getShellEnv();
    }
    async getWslPath(original, direction) {
        return this._proxy.getWslPath(original, direction);
    }
    async setTerminalLayoutInfo(layoutInfo) {
        const args = {
            workspaceId: this._getWorkspaceId(),
            tabs: layoutInfo ? layoutInfo.tabs : [],
        };
        await this._proxy.setTerminalLayoutInfo(args);
        // Store in the storage service as well to be used when reviving processes as normally this
        // is stored in memory on the pty host
        this._storageService.store("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, JSON.stringify(args), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async getTerminalLayoutInfo() {
        const workspaceId = this._getWorkspaceId();
        const layoutArgs = { workspaceId };
        // Revive processes if needed
        const serializedState = this._storageService.get("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
        const reviveBufferState = this._deserializeTerminalState(serializedState);
        if (reviveBufferState && reviveBufferState.length > 0) {
            try {
                // Create variable resolver
                const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
                const lastActiveWorkspace = activeWorkspaceRootUri
                    ? (this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
                    : undefined;
                const variableResolver = terminalEnvironment.createVariableResolver(lastActiveWorkspace, await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority), this._configurationResolverService);
                // Re-resolve the environments and replace it on the state so local terminals use a fresh
                // environment
                mark('code/terminal/willGetReviveEnvironments');
                await Promise.all(reviveBufferState.map((state) => new Promise((r) => {
                    this._resolveEnvironmentForRevive(variableResolver, state.shellLaunchConfig).then((freshEnv) => {
                        state.processLaunchConfig.env = freshEnv;
                        r();
                    });
                })));
                mark('code/terminal/didGetReviveEnvironments');
                mark('code/terminal/willReviveTerminalProcesses');
                await this._proxy.reviveTerminalProcesses(workspaceId, reviveBufferState, Intl.DateTimeFormat().resolvedOptions().locale);
                mark('code/terminal/didReviveTerminalProcesses');
                this._storageService.remove("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
                // If reviving processes, send the terminal layout info back to the pty host as it
                // will not have been persisted on application exit
                const layoutInfo = this._storageService.get("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                if (layoutInfo) {
                    mark('code/terminal/willSetTerminalLayoutInfo');
                    await this._proxy.setTerminalLayoutInfo(JSON.parse(layoutInfo));
                    mark('code/terminal/didSetTerminalLayoutInfo');
                    this._storageService.remove("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                }
            }
            catch (e) {
                this._logService.warn('LocalTerminalBackend#getTerminalLayoutInfo Error', e && typeof e === 'object' && 'message' in e ? e.message : e);
            }
        }
        return this._proxy.getTerminalLayoutInfo(layoutArgs);
    }
    async _resolveEnvironmentForRevive(variableResolver, shellLaunchConfig) {
        const platformKey = isWindows ? 'windows' : isMacintosh ? 'osx' : 'linux';
        const envFromConfigValue = this._configurationService.getValue(`terminal.integrated.env.${platformKey}`);
        const baseEnv = await (shellLaunchConfig.useShellEnvironment
            ? this.getShellEnvironment()
            : this.getEnvironment());
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfigValue, variableResolver, this._productService.version, this._configurationService.getValue("terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */), baseEnv);
        if (shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            const workspaceFolder = terminalEnvironment.getWorkspaceForTerminal(shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
            await this._environmentVariableService.mergedCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
        }
        return env;
    }
    _getWorkspaceName() {
        return this._labelService.getWorkspaceLabel(this._workspaceContextService.getWorkspace());
    }
    // #region Pty service contribution RPC calls
    installAutoReply(match, reply) {
        return this._proxy.installAutoReply(match, reply);
    }
    uninstallAllAutoReplies() {
        return this._proxy.uninstallAllAutoReplies();
    }
};
__decorate([
    memoize
], LocalTerminalBackend.prototype, "getEnvironment", null);
__decorate([
    memoize
], LocalTerminalBackend.prototype, "getShellEnvironment", null);
LocalTerminalBackend = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, ILifecycleService),
    __param(2, ITerminalLogService),
    __param(3, ILocalPtyService),
    __param(4, ILabelService),
    __param(5, IShellEnvironmentService),
    __param(6, IStorageService),
    __param(7, IConfigurationResolverService),
    __param(8, IConfigurationService),
    __param(9, IProductService),
    __param(10, IHistoryService),
    __param(11, ITerminalProfileResolverService),
    __param(12, IEnvironmentVariableService),
    __param(13, IHistoryService),
    __param(14, INativeHostService),
    __param(15, IStatusbarService),
    __param(16, IRemoteAgentService)
], LocalTerminalBackend);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxUZXJtaW5hbEJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvbG9jYWxUZXJtaW5hbEJhY2tlbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFFTixXQUFXLEVBQ1gsU0FBUyxHQUVULE1BQU0scUNBQXFDLENBQUE7QUFFNUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGdCQUFnQixFQVNoQixtQkFBbUIsRUFLbkIsa0JBQWtCLEVBQ2xCLG1CQUFtQixHQUduQixNQUFNLGtEQUFrRCxDQUFBO0FBTXpELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRXZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDdkgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkVB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