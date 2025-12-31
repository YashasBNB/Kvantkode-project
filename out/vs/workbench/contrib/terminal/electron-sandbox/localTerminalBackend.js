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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxUZXJtaW5hbEJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L2xvY2FsVGVybWluYWxCYWNrZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBRU4sV0FBVyxFQUNYLFNBQVMsR0FFVCxNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLGVBQWUsR0FHZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixnQkFBZ0IsRUFTaEIsbUJBQW1CLEVBS25CLGtCQUFrQixFQUNsQixtQkFBbUIsR0FHbkIsTUFBTSxrREFBa0QsQ0FBQTtBQU16RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ3ZILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJFQUEyRSxD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