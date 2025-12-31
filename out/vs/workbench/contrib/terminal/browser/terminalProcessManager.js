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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { isMacintosh, isWindows, OS, } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { formatMessageForTerminal } from '../../../../platform/terminal/common/terminalStrings.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { getRemoteAuthority } from '../../../../platform/remote/common/remoteHosts.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { NaiveCwdDetectionCapability } from '../../../../platform/terminal/common/capabilities/naiveCwdDetectionCapability.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ITerminalLogService, } from '../../../../platform/terminal/common/terminal.js';
import { TerminalRecorder } from '../../../../platform/terminal/common/terminalRecorder.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { EnvironmentVariableInfoChangesActive, EnvironmentVariableInfoStale, } from './environmentVariableInfo.js';
import { ITerminalConfigurationService, ITerminalInstanceService } from './terminal.js';
import { IEnvironmentVariableService, } from '../common/environmentVariable.js';
import { MergedEnvironmentVariableCollection } from '../../../../platform/terminal/common/environmentVariableCollection.js';
import { serializeEnvironmentVariableCollections } from '../../../../platform/terminal/common/environmentVariableShared.js';
import { ITerminalProfileResolverService, } from '../common/terminal.js';
import * as terminalEnvironment from '../common/terminalEnvironment.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import Severity from '../../../../base/common/severity.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { getActiveWindow, runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { shouldUseEnvironmentVariableCollection } from '../../../../platform/terminal/common/terminalEnvironment.js';
var ProcessConstants;
(function (ProcessConstants) {
    /**
     * The amount of time to consider terminal errors to be related to the launch.
     */
    ProcessConstants[ProcessConstants["ErrorLaunchThresholdDuration"] = 500] = "ErrorLaunchThresholdDuration";
    /**
     * The minimum amount of time between latency requests.
     */
    ProcessConstants[ProcessConstants["LatencyMeasuringInterval"] = 1000] = "LatencyMeasuringInterval";
})(ProcessConstants || (ProcessConstants = {}));
var ProcessType;
(function (ProcessType) {
    ProcessType[ProcessType["Process"] = 0] = "Process";
    ProcessType[ProcessType["PsuedoTerminal"] = 1] = "PsuedoTerminal";
})(ProcessType || (ProcessType = {}));
/**
 * Holds all state related to the creation and management of terminal processes.
 *
 * Internal definitions:
 * - Process: The process launched with the terminalProcess.ts file, or the pty as a whole
 * - Pty Process: The pseudoterminal parent process (or the conpty/winpty agent process)
 * - Shell Process: The pseudoterminal child process (ie. the shell)
 */
let TerminalProcessManager = class TerminalProcessManager extends Disposable {
    get persistentProcessId() {
        return this._process?.id;
    }
    get shouldPersist() {
        return !!this.reconnectionProperties || (this._process ? this._process.shouldPersist : false);
    }
    get hasWrittenData() {
        return this._hasWrittenData;
    }
    get hasChildProcesses() {
        return this._hasChildProcesses;
    }
    get reconnectionProperties() {
        return (this._shellLaunchConfig?.attachPersistentProcess?.reconnectionProperties ||
            this._shellLaunchConfig?.reconnectionProperties ||
            undefined);
    }
    get extEnvironmentVariableCollection() {
        return this._extEnvironmentVariableCollection;
    }
    get processTraits() {
        return this._processTraits;
    }
    constructor(_instanceId, cwd, environmentVariableCollections, shellIntegrationNonce, _historyService, _instantiationService, _logService, _workspaceContextService, _configurationResolverService, _workbenchEnvironmentService, _productService, _remoteAgentService, _pathService, _environmentVariableService, _terminalConfigurationService, _terminalProfileResolverService, _configurationService, _terminalInstanceService, _telemetryService, _notificationService) {
        super();
        this._instanceId = _instanceId;
        this._historyService = _historyService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
        this._configurationResolverService = _configurationResolverService;
        this._workbenchEnvironmentService = _workbenchEnvironmentService;
        this._productService = _productService;
        this._remoteAgentService = _remoteAgentService;
        this._pathService = _pathService;
        this._environmentVariableService = _environmentVariableService;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._configurationService = _configurationService;
        this._terminalInstanceService = _terminalInstanceService;
        this._telemetryService = _telemetryService;
        this._notificationService = _notificationService;
        this.processState = 1 /* ProcessState.Uninitialized */;
        this.capabilities = this._register(new TerminalCapabilityStore());
        this._isDisposed = false;
        this._process = null;
        this._processType = 0 /* ProcessType.Process */;
        this._preLaunchInputQueue = [];
        this._hasWrittenData = false;
        this._hasChildProcesses = false;
        this._ptyListenersAttached = false;
        this._isDisconnected = false;
        this._dimensions = { cols: 0, rows: 0 };
        this._onPtyDisconnect = this._register(new Emitter());
        this.onPtyDisconnect = this._onPtyDisconnect.event;
        this._onPtyReconnect = this._register(new Emitter());
        this.onPtyReconnect = this._onPtyReconnect.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onProcessStateChange = this._register(new Emitter());
        this.onProcessStateChange = this._onProcessStateChange.event;
        this._onBeforeProcessData = this._register(new Emitter());
        this.onBeforeProcessData = this._onBeforeProcessData.event;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReplayComplete = this._register(new Emitter());
        this.onProcessReplayComplete = this._onProcessReplayComplete.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onEnvironmentVariableInfoChange = this._register(new Emitter());
        this.onEnvironmentVariableInfoChanged = this._onEnvironmentVariableInfoChange.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._onRestoreCommands = this._register(new Emitter());
        this.onRestoreCommands = this._onRestoreCommands.event;
        this._cwdWorkspaceFolder = terminalEnvironment.getWorkspaceForTerminal(cwd, this._workspaceContextService, this._historyService);
        this.ptyProcessReady = this._createPtyProcessReadyPromise();
        this._ackDataBufferer = new AckDataBufferer((e) => this._process?.acknowledgeDataEvent(e));
        this._dataFilter = this._register(this._instantiationService.createInstance(SeamlessRelaunchDataFilter));
        this._register(this._dataFilter.onProcessData((ev) => {
            const data = typeof ev === 'string' ? ev : ev.data;
            const beforeProcessDataEvent = { data };
            this._onBeforeProcessData.fire(beforeProcessDataEvent);
            if (beforeProcessDataEvent.data && beforeProcessDataEvent.data.length > 0) {
                // This event is used by the caller so the object must be reused
                if (typeof ev !== 'string') {
                    ev.data = beforeProcessDataEvent.data;
                }
                this._onProcessData.fire(typeof ev !== 'string' ? ev : { data: beforeProcessDataEvent.data, trackCommit: false });
            }
        }));
        if (cwd && typeof cwd === 'object') {
            this.remoteAuthority = getRemoteAuthority(cwd);
        }
        else {
            this.remoteAuthority = this._workbenchEnvironmentService.remoteAuthority;
        }
        if (environmentVariableCollections) {
            this._extEnvironmentVariableCollection = new MergedEnvironmentVariableCollection(environmentVariableCollections);
            this._register(this._environmentVariableService.onDidChangeCollections((newCollection) => this._onEnvironmentVariableCollectionChange(newCollection)));
            this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoChangesActive, this._extEnvironmentVariableCollection);
            this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
        }
        this.shellIntegrationNonce = shellIntegrationNonce ?? generateUuid();
    }
    async freePortKillProcess(port) {
        try {
            if (this._process?.freePortKillProcess) {
                await this._process?.freePortKillProcess(port);
            }
        }
        catch (e) {
            this._notificationService.notify({
                message: localize('killportfailure', 'Could not kill process listening on port {0}, command exited with error {1}', port, e),
                severity: Severity.Warning,
            });
        }
    }
    dispose(immediate = false) {
        this._isDisposed = true;
        if (this._process) {
            // If the process was still connected this dispose came from
            // within VS Code, not the process, so mark the process as
            // killed by the user.
            this._setProcessState(5 /* ProcessState.KilledByUser */);
            this._process.shutdown(immediate);
            this._process = null;
        }
        super.dispose();
    }
    _createPtyProcessReadyPromise() {
        return new Promise((c) => {
            const listener = Event.once(this.onProcessReady)(() => {
                this._logService.debug(`Terminal process ready (shellProcessId: ${this.shellProcessId})`);
                this._store.delete(listener);
                c(undefined);
            });
            this._store.add(listener);
        });
    }
    async detachFromProcess(forcePersist) {
        await this._process?.detach?.(forcePersist);
        this._process = null;
    }
    async createProcess(shellLaunchConfig, cols, rows, reset = true) {
        this._shellLaunchConfig = shellLaunchConfig;
        this._dimensions.cols = cols;
        this._dimensions.rows = rows;
        let newProcess;
        if (shellLaunchConfig.customPtyImplementation) {
            this._processType = 1 /* ProcessType.PsuedoTerminal */;
            newProcess = shellLaunchConfig.customPtyImplementation(this._instanceId, cols, rows);
        }
        else {
            const backend = await this._terminalInstanceService.getBackend(this.remoteAuthority);
            if (!backend) {
                throw new Error(`No terminal backend registered for remote authority '${this.remoteAuthority}'`);
            }
            this.backend = backend;
            // Create variable resolver
            const variableResolver = terminalEnvironment.createVariableResolver(this._cwdWorkspaceFolder, await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority), this._configurationResolverService);
            // resolvedUserHome is needed here as remote resolvers can launch local terminals before
            // they're connected to the remote.
            this.userHome = this._pathService.resolvedUserHome?.fsPath;
            this.os = OS;
            if (!!this.remoteAuthority) {
                const userHomeUri = await this._pathService.userHome();
                this.userHome = userHomeUri.path;
                const remoteEnv = await this._remoteAgentService.getEnvironment();
                if (!remoteEnv) {
                    throw new Error(`Failed to get remote environment for remote authority "${this.remoteAuthority}"`);
                }
                this.userHome = remoteEnv.userHome.path;
                this.os = remoteEnv.os;
                // this is a copy of what the merged environment collection is on the remote side
                const env = await this._resolveEnvironment(backend, variableResolver, shellLaunchConfig);
                const shouldPersist = ((this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) &&
                    shellLaunchConfig.reconnectionProperties) ||
                    !shellLaunchConfig.isFeatureTerminal) &&
                    this._terminalConfigurationService.config.enablePersistentSessions &&
                    !shellLaunchConfig.isTransient;
                if (shellLaunchConfig.attachPersistentProcess) {
                    const result = await backend.attachToProcess(shellLaunchConfig.attachPersistentProcess.id);
                    if (result) {
                        newProcess = result;
                    }
                    else {
                        // Warn and just create a new terminal if attach failed for some reason
                        this._logService.warn(`Attach to process failed for terminal`, shellLaunchConfig.attachPersistentProcess);
                        shellLaunchConfig.attachPersistentProcess = undefined;
                    }
                }
                if (!newProcess) {
                    await this._terminalProfileResolverService.resolveShellLaunchConfig(shellLaunchConfig, {
                        remoteAuthority: this.remoteAuthority,
                        os: this.os,
                    });
                    const options = {
                        shellIntegration: {
                            enabled: this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */),
                            suggestEnabled: this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */),
                            nonce: this.shellIntegrationNonce,
                        },
                        windowsEnableConpty: this._terminalConfigurationService.config.windowsEnableConpty,
                        windowsUseConptyDll: this._terminalConfigurationService.config.windowsUseConptyDll ?? false,
                        environmentVariableCollections: this._extEnvironmentVariableCollection?.collections
                            ? serializeEnvironmentVariableCollections(this._extEnvironmentVariableCollection.collections)
                            : undefined,
                        workspaceFolder: this._cwdWorkspaceFolder,
                    };
                    try {
                        newProcess = await backend.createProcess(shellLaunchConfig, '', // TODO: Fix cwd
                        cols, rows, this._terminalConfigurationService.config.unicodeVersion, env, // TODO:
                        options, shouldPersist);
                    }
                    catch (e) {
                        if (e?.message === 'Could not fetch remote environment') {
                            this._logService.trace(`Could not fetch remote environment, silently failing`);
                            return undefined;
                        }
                        throw e;
                    }
                }
                if (!this._isDisposed) {
                    this._setupPtyHostListeners(backend);
                }
            }
            else {
                if (shellLaunchConfig.attachPersistentProcess) {
                    const result = shellLaunchConfig.attachPersistentProcess.findRevivedId
                        ? await backend.attachToRevivedProcess(shellLaunchConfig.attachPersistentProcess.id)
                        : await backend.attachToProcess(shellLaunchConfig.attachPersistentProcess.id);
                    if (result) {
                        newProcess = result;
                    }
                    else {
                        // Warn and just create a new terminal if attach failed for some reason
                        this._logService.warn(`Attach to process failed for terminal`, shellLaunchConfig.attachPersistentProcess);
                        shellLaunchConfig.attachPersistentProcess = undefined;
                    }
                }
                if (!newProcess) {
                    newProcess = await this._launchLocalProcess(backend, shellLaunchConfig, cols, rows, this.userHome, variableResolver);
                }
                if (!this._isDisposed) {
                    this._setupPtyHostListeners(backend);
                }
            }
        }
        // If the process was disposed during its creation, shut it down and return failure
        if (this._isDisposed) {
            newProcess.shutdown(false);
            return undefined;
        }
        this._process = newProcess;
        this._setProcessState(2 /* ProcessState.Launching */);
        // Add any capabilities inherent to the backend
        if (this.os === 3 /* OperatingSystem.Linux */ || this.os === 2 /* OperatingSystem.Macintosh */) {
            this.capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, new NaiveCwdDetectionCapability(this._process));
        }
        this._dataFilter.newProcess(this._process, reset);
        if (this._processListeners) {
            dispose(this._processListeners);
        }
        this._processListeners = [
            newProcess.onProcessReady((e) => {
                this._processTraits = e;
                this.shellProcessId = e.pid;
                this._initialCwd = e.cwd;
                this._onDidChangeProperty.fire({
                    type: "initialCwd" /* ProcessPropertyType.InitialCwd */,
                    value: this._initialCwd,
                });
                this._onProcessReady.fire(e);
                if (this._preLaunchInputQueue.length > 0 && this._process) {
                    // Send any queued data that's waiting
                    newProcess.input(this._preLaunchInputQueue.join(''));
                    this._preLaunchInputQueue.length = 0;
                }
            }),
            newProcess.onProcessExit((exitCode) => this._onExit(exitCode)),
            newProcess.onDidChangeProperty(({ type, value }) => {
                switch (type) {
                    case "hasChildProcesses" /* ProcessPropertyType.HasChildProcesses */:
                        this._hasChildProcesses = value;
                        break;
                    case "failedShellIntegrationActivation" /* ProcessPropertyType.FailedShellIntegrationActivation */:
                        this._telemetryService?.publicLog2('terminal/shellIntegrationActivationFailureCustomArgs');
                        break;
                }
                this._onDidChangeProperty.fire({ type, value });
            }),
        ];
        if (newProcess.onProcessReplayComplete) {
            this._processListeners.push(newProcess.onProcessReplayComplete(() => this._onProcessReplayComplete.fire()));
        }
        if (newProcess.onRestoreCommands) {
            this._processListeners.push(newProcess.onRestoreCommands((e) => this._onRestoreCommands.fire(e)));
        }
        setTimeout(() => {
            if (this.processState === 2 /* ProcessState.Launching */) {
                this._setProcessState(3 /* ProcessState.Running */);
            }
        }, 500 /* ProcessConstants.ErrorLaunchThresholdDuration */);
        const result = await newProcess.start();
        if (result) {
            // Error
            return result;
        }
        // Report the latency to the pty host when idle
        runWhenWindowIdle(getActiveWindow(), () => {
            this.backend?.getLatency().then((measurements) => {
                this._logService.info(`Latency measurements for ${this.remoteAuthority ?? 'local'} backend\n${measurements.map((e) => `${e.label}: ${e.latency.toFixed(2)}ms`).join('\n')}`);
            });
        });
        return undefined;
    }
    async relaunch(shellLaunchConfig, cols, rows, reset) {
        this.ptyProcessReady = this._createPtyProcessReadyPromise();
        this._logService.trace(`Relaunching terminal instance ${this._instanceId}`);
        // Fire reconnect if needed to ensure the terminal is usable again
        if (this._isDisconnected) {
            this._isDisconnected = false;
            this._onPtyReconnect.fire();
        }
        // Clear data written flag to re-enable seamless relaunch if this relaunch was manually
        // triggered
        this._hasWrittenData = false;
        return this.createProcess(shellLaunchConfig, cols, rows, reset);
    }
    // Fetch any extension environment additions and apply them
    async _resolveEnvironment(backend, variableResolver, shellLaunchConfig) {
        const workspaceFolder = terminalEnvironment.getWorkspaceForTerminal(shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
        const platformKey = isWindows ? 'windows' : isMacintosh ? 'osx' : 'linux';
        const envFromConfigValue = this._configurationService.getValue(`terminal.integrated.env.${platformKey}`);
        let baseEnv;
        if (shellLaunchConfig.useShellEnvironment) {
            // TODO: Avoid as any?
            baseEnv = (await backend.getShellEnvironment());
        }
        else {
            baseEnv = await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority);
        }
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfigValue, variableResolver, this._productService.version, this._terminalConfigurationService.config.detectLocale, baseEnv);
        if (!this._isDisposed && shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            this._extEnvironmentVariableCollection = this._environmentVariableService.mergedCollection;
            this._register(this._environmentVariableService.onDidChangeCollections((newCollection) => this._onEnvironmentVariableCollectionChange(newCollection)));
            // For remote terminals, this is a copy of the mergedEnvironmentCollection created on
            // the remote side. Since the environment collection is synced between the remote and
            // local sides immediately this is a fairly safe way of enabling the env var diffing and
            // info widget. While technically these could differ due to the slight change of a race
            // condition, the chance is minimal plus the impact on the user is also not that great
            // if it happens - it's not worth adding plumbing to sync back the resolved collection.
            await this._extEnvironmentVariableCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
            if (this._extEnvironmentVariableCollection.getVariableMap({ workspaceFolder }).size) {
                this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoChangesActive, this._extEnvironmentVariableCollection);
                this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
            }
        }
        return env;
    }
    async _launchLocalProcess(backend, shellLaunchConfig, cols, rows, userHome, variableResolver) {
        await this._terminalProfileResolverService.resolveShellLaunchConfig(shellLaunchConfig, {
            remoteAuthority: undefined,
            os: OS,
        });
        const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot(Schemas.file);
        const initialCwd = await terminalEnvironment.getCwd(shellLaunchConfig, userHome, variableResolver, activeWorkspaceRootUri, this._terminalConfigurationService.config.cwd, this._logService);
        const env = await this._resolveEnvironment(backend, variableResolver, shellLaunchConfig);
        const options = {
            shellIntegration: {
                enabled: this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */),
                suggestEnabled: this._configurationService.getValue("terminal.integrated.suggest.enabled" /* TerminalContribSettingId.SuggestEnabled */),
                nonce: this.shellIntegrationNonce,
            },
            windowsEnableConpty: this._terminalConfigurationService.config.windowsEnableConpty,
            windowsUseConptyDll: this._terminalConfigurationService.config.windowsUseConptyDll ?? false,
            environmentVariableCollections: this._extEnvironmentVariableCollection
                ? serializeEnvironmentVariableCollections(this._extEnvironmentVariableCollection.collections)
                : undefined,
            workspaceFolder: this._cwdWorkspaceFolder,
        };
        const shouldPersist = ((this._configurationService.getValue("task.reconnection" /* TaskSettingId.Reconnection */) &&
            shellLaunchConfig.reconnectionProperties) ||
            !shellLaunchConfig.isFeatureTerminal) &&
            this._terminalConfigurationService.config.enablePersistentSessions &&
            !shellLaunchConfig.isTransient;
        return await backend.createProcess(shellLaunchConfig, initialCwd, cols, rows, this._terminalConfigurationService.config.unicodeVersion, env, options, shouldPersist);
    }
    _setupPtyHostListeners(backend) {
        if (this._ptyListenersAttached) {
            return;
        }
        this._ptyListenersAttached = true;
        // Mark the process as disconnected is the pty host is unresponsive, the responsive event
        // will fire only when the pty host was already unresponsive
        this._register(backend.onPtyHostUnresponsive(() => {
            this._isDisconnected = true;
            this._onPtyDisconnect.fire();
        }));
        this._ptyResponsiveListener = backend.onPtyHostResponsive(() => {
            this._isDisconnected = false;
            this._onPtyReconnect.fire();
        });
        this._register(toDisposable(() => this._ptyResponsiveListener?.dispose()));
        // When the pty host restarts, reconnect is no longer possible so dispose the responsive
        // listener
        this._register(backend.onPtyHostRestart(async () => {
            // When the pty host restarts, reconnect is no longer possible
            if (!this._isDisconnected) {
                this._isDisconnected = true;
                this._onPtyDisconnect.fire();
            }
            this._ptyResponsiveListener?.dispose();
            this._ptyResponsiveListener = undefined;
            if (this._shellLaunchConfig) {
                if (this._shellLaunchConfig.isFeatureTerminal && !this.reconnectionProperties) {
                    // Indicate the process is exited (and gone forever) only for feature terminals
                    // so they can react to the exit, this is particularly important for tasks so
                    // that it knows that the process is not still active. Note that this is not
                    // done for regular terminals because otherwise the terminal instance would be
                    // disposed.
                    this._onExit(-1);
                }
                else {
                    // For normal terminals write a message indicating what happened and relaunch
                    // using the previous shellLaunchConfig
                    const message = localize('ptyHostRelaunch', 'Restarting the terminal because the connection to the shell process was lost...');
                    this._onProcessData.fire({
                        data: formatMessageForTerminal(message, { loudFormatting: true }),
                        trackCommit: false,
                    });
                    await this.relaunch(this._shellLaunchConfig, this._dimensions.cols, this._dimensions.rows, false);
                }
            }
        }));
    }
    async getBackendOS() {
        let os = OS;
        if (!!this.remoteAuthority) {
            const remoteEnv = await this._remoteAgentService.getEnvironment();
            if (!remoteEnv) {
                throw new Error(`Failed to get remote environment for remote authority "${this.remoteAuthority}"`);
            }
            os = remoteEnv.os;
        }
        return os;
    }
    setDimensions(cols, rows, sync) {
        if (sync) {
            this._resize(cols, rows);
            return;
        }
        return this.ptyProcessReady.then(() => this._resize(cols, rows));
    }
    async setUnicodeVersion(version) {
        return this._process?.setUnicodeVersion(version);
    }
    _resize(cols, rows) {
        if (!this._process) {
            return;
        }
        // The child process could already be terminated
        try {
            this._process.resize(cols, rows);
        }
        catch (error) {
            // We tried to write to a closed pipe / channel.
            if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
                throw error;
            }
        }
        this._dimensions.cols = cols;
        this._dimensions.rows = rows;
    }
    async write(data) {
        await this.ptyProcessReady;
        this._dataFilter.disableSeamlessRelaunch();
        this._hasWrittenData = true;
        if (this.shellProcessId || this._processType === 1 /* ProcessType.PsuedoTerminal */) {
            if (this._process) {
                // Send data if the pty is ready
                this._process.input(data);
            }
        }
        else {
            // If the pty is not ready, queue the data received to send later
            this._preLaunchInputQueue.push(data);
        }
    }
    async processBinary(data) {
        await this.ptyProcessReady;
        this._dataFilter.disableSeamlessRelaunch();
        this._hasWrittenData = true;
        this._process?.processBinary(data);
    }
    get initialCwd() {
        return this._initialCwd ?? '';
    }
    async refreshProperty(type) {
        if (!this._process) {
            throw new Error('Cannot refresh property when process is not set');
        }
        return this._process.refreshProperty(type);
    }
    async updateProperty(type, value) {
        return this._process?.updateProperty(type, value);
    }
    acknowledgeDataEvent(charCount) {
        this._ackDataBufferer.ack(charCount);
    }
    _onExit(exitCode) {
        this._process = null;
        // If the process is marked as launching then mark the process as killed
        // during launch. This typically means that there is a problem with the
        // shell and args.
        if (this.processState === 2 /* ProcessState.Launching */) {
            this._setProcessState(4 /* ProcessState.KilledDuringLaunch */);
        }
        // If TerminalInstance did not know about the process exit then it was
        // triggered by the process, not on VS Code's side.
        if (this.processState === 3 /* ProcessState.Running */) {
            this._setProcessState(6 /* ProcessState.KilledByProcess */);
        }
        this._onProcessExit.fire(exitCode);
    }
    _setProcessState(state) {
        this.processState = state;
        this._onProcessStateChange.fire();
    }
    _onEnvironmentVariableCollectionChange(newCollection) {
        const diff = this._extEnvironmentVariableCollection.diff(newCollection, {
            workspaceFolder: this._cwdWorkspaceFolder,
        });
        if (diff === undefined) {
            // If there are no longer differences, remove the stale info indicator
            if (this.environmentVariableInfo instanceof EnvironmentVariableInfoStale) {
                this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoChangesActive, this._extEnvironmentVariableCollection);
                this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
            }
            return;
        }
        this.environmentVariableInfo = this._instantiationService.createInstance(EnvironmentVariableInfoStale, diff, this._instanceId, newCollection);
        this._onEnvironmentVariableInfoChange.fire(this.environmentVariableInfo);
    }
    async clearBuffer() {
        this._process?.clearBuffer?.();
    }
};
TerminalProcessManager = __decorate([
    __param(4, IHistoryService),
    __param(5, IInstantiationService),
    __param(6, ITerminalLogService),
    __param(7, IWorkspaceContextService),
    __param(8, IConfigurationResolverService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IProductService),
    __param(11, IRemoteAgentService),
    __param(12, IPathService),
    __param(13, IEnvironmentVariableService),
    __param(14, ITerminalConfigurationService),
    __param(15, ITerminalProfileResolverService),
    __param(16, IConfigurationService),
    __param(17, ITerminalInstanceService),
    __param(18, ITelemetryService),
    __param(19, INotificationService)
], TerminalProcessManager);
export { TerminalProcessManager };
class AckDataBufferer {
    constructor(_callback) {
        this._callback = _callback;
        this._unsentCharCount = 0;
    }
    ack(charCount) {
        this._unsentCharCount += charCount;
        while (this._unsentCharCount > 5000 /* FlowControlConstants.CharCountAckSize */) {
            this._unsentCharCount -= 5000 /* FlowControlConstants.CharCountAckSize */;
            this._callback(5000 /* FlowControlConstants.CharCountAckSize */);
        }
    }
}
var SeamlessRelaunchConstants;
(function (SeamlessRelaunchConstants) {
    /**
     * How long to record data events for new terminals.
     */
    SeamlessRelaunchConstants[SeamlessRelaunchConstants["RecordTerminalDuration"] = 10000] = "RecordTerminalDuration";
    /**
     * The maximum duration after a relaunch occurs to trigger a swap.
     */
    SeamlessRelaunchConstants[SeamlessRelaunchConstants["SwapWaitMaximumDuration"] = 3000] = "SwapWaitMaximumDuration";
})(SeamlessRelaunchConstants || (SeamlessRelaunchConstants = {}));
/**
 * Filters data events from the process and supports seamlessly restarting swapping out the process
 * with another, delaying the swap in output in order to minimize flickering/clearing of the
 * terminal.
 */
let SeamlessRelaunchDataFilter = class SeamlessRelaunchDataFilter extends Disposable {
    get onProcessData() {
        return this._onProcessData.event;
    }
    constructor(_logService) {
        super();
        this._logService = _logService;
        this._disableSeamlessRelaunch = false;
        this._onProcessData = this._register(new Emitter());
    }
    newProcess(process, reset) {
        // Stop listening to the old process and trigger delayed shutdown (for hang issue #71966)
        this._dataListener?.dispose();
        this._activeProcess?.shutdown(false);
        this._activeProcess = process;
        // Start firing events immediately if:
        // - there's no recorder, which means it's a new terminal
        // - this is not a reset, so seamless relaunch isn't necessary
        // - seamless relaunch is disabled because the terminal has accepted input
        if (!this._firstRecorder || !reset || this._disableSeamlessRelaunch) {
            this._firstDisposable?.dispose();
            [this._firstRecorder, this._firstDisposable] = this._createRecorder(process);
            if (this._disableSeamlessRelaunch && reset) {
                this._onProcessData.fire('\x1bc');
            }
            this._dataListener = process.onProcessData((e) => this._onProcessData.fire(e));
            this._disableSeamlessRelaunch = false;
            return;
        }
        // Trigger a swap if there was a recent relaunch
        if (this._secondRecorder) {
            this.triggerSwap();
        }
        this._swapTimeout = mainWindow.setTimeout(() => this.triggerSwap(), 3000 /* SeamlessRelaunchConstants.SwapWaitMaximumDuration */);
        // Pause all outgoing data events
        this._dataListener?.dispose();
        this._firstDisposable?.dispose();
        const recorder = this._createRecorder(process);
        [this._secondRecorder, this._secondDisposable] = recorder;
    }
    /**
     * Disables seamless relaunch for the active process
     */
    disableSeamlessRelaunch() {
        this._disableSeamlessRelaunch = true;
        this._stopRecording();
        this.triggerSwap();
    }
    /**
     * Trigger the swap of the processes if needed (eg. timeout, input)
     */
    triggerSwap() {
        // Clear the swap timeout if it exists
        if (this._swapTimeout) {
            mainWindow.clearTimeout(this._swapTimeout);
            this._swapTimeout = undefined;
        }
        // Do nothing if there's nothing being recorder
        if (!this._firstRecorder) {
            return;
        }
        // Clear the first recorder if no second process was attached before the swap trigger
        if (!this._secondRecorder) {
            this._firstRecorder = undefined;
            this._firstDisposable?.dispose();
            return;
        }
        // Generate data for each recorder
        const firstData = this._getDataFromRecorder(this._firstRecorder);
        const secondData = this._getDataFromRecorder(this._secondRecorder);
        // Re-write the terminal if the data differs
        if (firstData === secondData) {
            this._logService.trace(`Seamless terminal relaunch - identical content`);
        }
        else {
            this._logService.trace(`Seamless terminal relaunch - resetting content`);
            // Fire full reset (RIS) followed by the new data so the update happens in the same frame
            this._onProcessData.fire({ data: `\x1bc${secondData}`, trackCommit: false });
        }
        // Set up the new data listener
        this._dataListener?.dispose();
        this._dataListener = this._activeProcess.onProcessData((e) => this._onProcessData.fire(e));
        // Replace first recorder with second
        this._firstRecorder = this._secondRecorder;
        this._firstDisposable?.dispose();
        this._firstDisposable = this._secondDisposable;
        this._secondRecorder = undefined;
    }
    _stopRecording() {
        // Continue recording if a swap is coming
        if (this._swapTimeout) {
            return;
        }
        // Stop recording
        this._firstRecorder = undefined;
        this._firstDisposable?.dispose();
        this._secondRecorder = undefined;
        this._secondDisposable?.dispose();
    }
    _createRecorder(process) {
        const recorder = new TerminalRecorder(0, 0);
        const disposable = process.onProcessData((e) => recorder.handleData(typeof e === 'string' ? e : e.data));
        return [recorder, disposable];
    }
    _getDataFromRecorder(recorder) {
        return recorder
            .generateReplayEventSync()
            .events.filter((e) => !!e.data)
            .map((e) => e.data)
            .join('');
    }
};
SeamlessRelaunchDataFilter = __decorate([
    __param(0, ITerminalLogService)
], SeamlessRelaunchDataFilter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzTWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxQcm9jZXNzTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsT0FBTyxFQUVQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBRU4sV0FBVyxFQUNYLFNBQVMsRUFFVCxFQUFFLEdBQ0YsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBS3RGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzlILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBQ3RILE9BQU8sRUFhTixtQkFBbUIsR0FJbkIsTUFBTSxrREFBa0QsQ0FB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