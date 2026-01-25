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
import { DisposableStore, Disposable, MutableDisposable, combinedDisposable, } from '../../../base/common/lifecycle.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { TerminalExitReason, TerminalLocation, } from '../../../platform/terminal/common/terminal.js';
import { TerminalDataBufferer } from '../../../platform/terminal/common/terminalDataBuffering.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService, } from '../../contrib/terminal/browser/terminal.js';
import { TerminalProcessExtHostProxy } from '../../contrib/terminal/browser/terminalProcessExtHostProxy.js';
import { IEnvironmentVariableService } from '../../contrib/terminal/common/environmentVariable.js';
import { deserializeEnvironmentDescriptionMap, deserializeEnvironmentVariableCollection, serializeEnvironmentVariableCollection, } from '../../../platform/terminal/common/environmentVariableShared.js';
import { ITerminalProfileResolverService, ITerminalProfileService, } from '../../contrib/terminal/common/terminal.js';
import { IRemoteAgentService } from '../../services/remote/common/remoteAgentService.js';
import { OS } from '../../../base/common/platform.js';
import { Promises } from '../../../base/common/async.js';
import { ITerminalLinkProviderService } from '../../contrib/terminalContrib/links/browser/links.js';
import { ITerminalQuickFixService, TerminalQuickFixType, } from '../../contrib/terminalContrib/quickFix/browser/quickFix.js';
import { ITerminalCompletionService } from '../../contrib/terminalContrib/suggest/browser/terminalCompletionService.js';
let MainThreadTerminalService = class MainThreadTerminalService {
    constructor(_extHostContext, _terminalService, _terminalLinkProviderService, _terminalQuickFixService, _instantiationService, _environmentVariableService, _logService, _terminalProfileResolverService, remoteAgentService, _terminalGroupService, _terminalEditorService, _terminalProfileService, _terminalCompletionService) {
        this._extHostContext = _extHostContext;
        this._terminalService = _terminalService;
        this._terminalLinkProviderService = _terminalLinkProviderService;
        this._terminalQuickFixService = _terminalQuickFixService;
        this._instantiationService = _instantiationService;
        this._environmentVariableService = _environmentVariableService;
        this._logService = _logService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalProfileService = _terminalProfileService;
        this._terminalCompletionService = _terminalCompletionService;
        this._store = new DisposableStore();
        /**
         * Stores a map from a temporary terminal id (a UUID generated on the extension host side)
         * to a numeric terminal id (an id generated on the renderer side)
         * This comes in play only when dealing with terminals created on the extension host side
         */
        this._extHostTerminals = new Map();
        this._terminalProcessProxies = new Map();
        this._profileProviders = new Map();
        this._completionProviders = new Map();
        this._quickFixProviders = new Map();
        this._dataEventTracker = new MutableDisposable();
        this._sendCommandEventListener = new MutableDisposable();
        /**
         * A single shared terminal link provider for the exthost. When an ext registers a link
         * provider, this is registered with the terminal on the renderer side and all links are
         * provided through this, even from multiple ext link providers. Xterm should remove lower
         * priority intersecting links itself.
         */
        this._linkProvider = this._store.add(new MutableDisposable());
        this._os = OS;
        this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostTerminalService);
        // ITerminalService listeners
        this._store.add(_terminalService.onDidCreateInstance((instance) => {
            this._onTerminalOpened(instance);
            this._onInstanceDimensionsChanged(instance);
        }));
        this._store.add(_terminalService.onDidDisposeInstance((instance) => this._onTerminalDisposed(instance)));
        this._store.add(_terminalService.onAnyInstanceProcessIdReady((instance) => this._onTerminalProcessIdReady(instance)));
        this._store.add(_terminalService.onDidChangeInstanceDimensions((instance) => this._onInstanceDimensionsChanged(instance)));
        this._store.add(_terminalService.onAnyInstanceMaximumDimensionsChange((instance) => this._onInstanceMaximumDimensionsChanged(instance)));
        this._store.add(_terminalService.onDidRequestStartExtensionTerminal((e) => this._onRequestStartExtensionTerminal(e)));
        this._store.add(_terminalService.onDidChangeActiveInstance((instance) => this._onActiveTerminalChanged(instance ? instance.instanceId : null)));
        this._store.add(_terminalService.onAnyInstanceTitleChange((instance) => instance && this._onTitleChanged(instance.instanceId, instance.title)));
        this._store.add(_terminalService.onAnyInstanceDataInput((instance) => this._proxy.$acceptTerminalInteraction(instance.instanceId)));
        this._store.add(_terminalService.onAnyInstanceSelectionChange((instance) => this._proxy.$acceptTerminalSelection(instance.instanceId, instance.selection)));
        this._store.add(_terminalService.onAnyInstanceShellTypeChanged((instance) => this._onShellTypeChanged(instance.instanceId)));
        // Set initial ext host state
        for (const instance of this._terminalService.instances) {
            this._onTerminalOpened(instance);
            instance.processReady.then(() => this._onTerminalProcessIdReady(instance));
            if (instance.shellType) {
                this._proxy.$acceptTerminalShellType(instance.instanceId, instance.shellType);
            }
        }
        const activeInstance = this._terminalService.activeInstance;
        if (activeInstance) {
            this._proxy.$acceptActiveTerminalChanged(activeInstance.instanceId);
        }
        if (this._environmentVariableService.collections.size > 0) {
            const collectionAsArray = [...this._environmentVariableService.collections.entries()];
            const serializedCollections = collectionAsArray.map((e) => {
                return [e[0], serializeEnvironmentVariableCollection(e[1].map)];
            });
            this._proxy.$initEnvironmentVariableCollections(serializedCollections);
        }
        remoteAgentService.getEnvironment().then(async (env) => {
            this._os = env?.os || OS;
            this._updateDefaultProfile();
        });
        this._store.add(this._terminalProfileService.onDidChangeAvailableProfiles(() => this._updateDefaultProfile()));
    }
    dispose() {
        this._store.dispose();
        for (const provider of this._profileProviders.values()) {
            provider.dispose();
        }
        for (const provider of this._quickFixProviders.values()) {
            provider.dispose();
        }
    }
    async _updateDefaultProfile() {
        const remoteAuthority = this._extHostContext.remoteAuthority ?? undefined;
        const defaultProfile = this._terminalProfileResolverService.getDefaultProfile({
            remoteAuthority,
            os: this._os,
        });
        const defaultAutomationProfile = this._terminalProfileResolverService.getDefaultProfile({
            remoteAuthority,
            os: this._os,
            allowAutomationShell: true,
        });
        this._proxy.$acceptDefaultProfile(...(await Promise.all([defaultProfile, defaultAutomationProfile])));
    }
    async _getTerminalInstance(id) {
        if (typeof id === 'string') {
            return this._extHostTerminals.get(id);
        }
        return this._terminalService.getInstanceFromId(id);
    }
    async $createTerminal(extHostTerminalId, launchConfig) {
        const shellLaunchConfig = {
            name: launchConfig.name,
            executable: launchConfig.shellPath,
            args: launchConfig.shellArgs,
            cwd: typeof launchConfig.cwd === 'string' ? launchConfig.cwd : URI.revive(launchConfig.cwd),
            icon: launchConfig.icon,
            color: launchConfig.color,
            initialText: launchConfig.initialText,
            waitOnExit: launchConfig.waitOnExit,
            ignoreConfigurationCwd: true,
            env: launchConfig.env,
            strictEnv: launchConfig.strictEnv,
            hideFromUser: launchConfig.hideFromUser,
            customPtyImplementation: launchConfig.isExtensionCustomPtyTerminal
                ? (id, cols, rows) => new TerminalProcessExtHostProxy(id, cols, rows, this._terminalService)
                : undefined,
            extHostTerminalId,
            forceShellIntegration: launchConfig.forceShellIntegration,
            isFeatureTerminal: launchConfig.isFeatureTerminal,
            isExtensionOwnedTerminal: launchConfig.isExtensionOwnedTerminal,
            useShellEnvironment: launchConfig.useShellEnvironment,
            isTransient: launchConfig.isTransient,
        };
        const terminal = Promises.withAsyncBody(async (r) => {
            const terminal = await this._terminalService.createTerminal({
                config: shellLaunchConfig,
                location: await this._deserializeParentTerminal(launchConfig.location),
            });
            r(terminal);
        });
        this._extHostTerminals.set(extHostTerminalId, terminal);
        const terminalInstance = await terminal;
        this._store.add(terminalInstance.onDisposed(() => {
            this._extHostTerminals.delete(extHostTerminalId);
        }));
    }
    async _deserializeParentTerminal(location) {
        if (typeof location === 'object' && 'parentTerminal' in location) {
            const parentTerminal = await this._extHostTerminals.get(location.parentTerminal.toString());
            return parentTerminal ? { parentTerminal } : undefined;
        }
        return location;
    }
    async $show(id, preserveFocus) {
        const terminalInstance = await this._getTerminalInstance(id);
        if (terminalInstance) {
            this._terminalService.setActiveInstance(terminalInstance);
            if (terminalInstance.target === TerminalLocation.Editor) {
                await this._terminalEditorService.revealActiveEditor(preserveFocus);
            }
            else {
                await this._terminalGroupService.showPanel(!preserveFocus);
            }
        }
    }
    async $hide(id) {
        const instanceToHide = await this._getTerminalInstance(id);
        const activeInstance = this._terminalService.activeInstance;
        if (activeInstance &&
            activeInstance.instanceId === instanceToHide?.instanceId &&
            activeInstance.target !== TerminalLocation.Editor) {
            this._terminalGroupService.hidePanel();
        }
    }
    async $dispose(id) {
        ;
        (await this._getTerminalInstance(id))?.dispose(TerminalExitReason.Extension);
    }
    async $sendText(id, text, shouldExecute) {
        const instance = await this._getTerminalInstance(id);
        await instance?.sendText(text, shouldExecute);
    }
    $sendProcessExit(terminalId, exitCode) {
        this._terminalProcessProxies.get(terminalId)?.emitExit(exitCode);
    }
    $startSendingDataEvents() {
        if (!this._dataEventTracker.value) {
            this._dataEventTracker.value = this._instantiationService.createInstance(TerminalDataEventTracker, (id, data) => {
                this._onTerminalData(id, data);
            });
            // Send initial events if they exist
            for (const instance of this._terminalService.instances) {
                for (const data of instance.initialDataEvents || []) {
                    this._onTerminalData(instance.instanceId, data);
                }
            }
        }
    }
    $stopSendingDataEvents() {
        this._dataEventTracker.clear();
    }
    $startSendingCommandEvents() {
        if (this._sendCommandEventListener.value) {
            return;
        }
        const multiplexer = this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, (capability) => capability.onCommandFinished);
        const sub = multiplexer.event((e) => {
            this._onDidExecuteCommand(e.instance.instanceId, {
                commandLine: e.data.command,
                // TODO: Convert to URI if possible
                cwd: e.data.cwd,
                exitCode: e.data.exitCode,
                output: e.data.getOutput(),
            });
        });
        this._sendCommandEventListener.value = combinedDisposable(multiplexer, sub);
    }
    $stopSendingCommandEvents() {
        this._sendCommandEventListener.clear();
    }
    $startLinkProvider() {
        this._linkProvider.value = this._terminalLinkProviderService.registerLinkProvider(new ExtensionTerminalLinkProvider(this._proxy));
    }
    $stopLinkProvider() {
        this._linkProvider.clear();
    }
    $registerProcessSupport(isSupported) {
        this._terminalService.registerProcessSupport(isSupported);
    }
    $registerCompletionProvider(id, extensionIdentifier, ...triggerCharacters) {
        this._completionProviders.set(id, this._terminalCompletionService.registerTerminalCompletionProvider(extensionIdentifier, id, {
            id,
            provideCompletions: async (commandLine, cursorPosition, allowFallbackCompletions, token) => {
                const completions = await this._proxy.$provideTerminalCompletions(id, { commandLine, cursorPosition, allowFallbackCompletions }, token);
                return {
                    items: completions?.items.map((c) => ({ ...c, provider: id })),
                    resourceRequestConfig: completions?.resourceRequestConfig,
                };
            },
        }, ...triggerCharacters));
    }
    $unregisterCompletionProvider(id) {
        this._completionProviders.get(id)?.dispose();
        this._completionProviders.delete(id);
    }
    $registerProfileProvider(id, extensionIdentifier) {
        // Proxy profile provider requests through the extension host
        this._profileProviders.set(id, this._terminalProfileService.registerTerminalProfileProvider(extensionIdentifier, id, {
            createContributedTerminalProfile: async (options) => {
                return this._proxy.$createContributedProfileTerminal(id, options);
            },
        }));
    }
    $unregisterProfileProvider(id) {
        this._profileProviders.get(id)?.dispose();
        this._profileProviders.delete(id);
    }
    async $registerQuickFixProvider(id, extensionId) {
        this._quickFixProviders.set(id, this._terminalQuickFixService.registerQuickFixProvider(id, {
            provideTerminalQuickFixes: async (terminalCommand, lines, options, token) => {
                if (token.isCancellationRequested) {
                    return;
                }
                if (options.outputMatcher?.length && options.outputMatcher.length > 40) {
                    options.outputMatcher.length = 40;
                    this._logService.warn('Cannot exceed output matcher length of 40');
                }
                const commandLineMatch = terminalCommand.command.match(options.commandLineMatcher);
                if (!commandLineMatch || !lines) {
                    return;
                }
                const outputMatcher = options.outputMatcher;
                let outputMatch;
                if (outputMatcher) {
                    outputMatch = getOutputMatchForLines(lines, outputMatcher);
                }
                if (!outputMatch) {
                    return;
                }
                const matchResult = {
                    commandLineMatch,
                    outputMatch,
                    commandLine: terminalCommand.command,
                };
                if (matchResult) {
                    const result = await this._proxy.$provideTerminalQuickFixes(id, matchResult, token);
                    if (result && Array.isArray(result)) {
                        return result.map((r) => parseQuickFix(id, extensionId, r));
                    }
                    else if (result) {
                        return parseQuickFix(id, extensionId, result);
                    }
                }
                return;
            },
        }));
    }
    $unregisterQuickFixProvider(id) {
        this._quickFixProviders.get(id)?.dispose();
        this._quickFixProviders.delete(id);
    }
    _onActiveTerminalChanged(terminalId) {
        this._proxy.$acceptActiveTerminalChanged(terminalId);
    }
    _onTerminalData(terminalId, data) {
        this._proxy.$acceptTerminalProcessData(terminalId, data);
    }
    _onDidExecuteCommand(terminalId, command) {
        this._proxy.$acceptDidExecuteCommand(terminalId, command);
    }
    _onTitleChanged(terminalId, name) {
        this._proxy.$acceptTerminalTitleChange(terminalId, name);
    }
    _onShellTypeChanged(terminalId) {
        const terminalInstance = this._terminalService.getInstanceFromId(terminalId);
        if (terminalInstance) {
            this._proxy.$acceptTerminalShellType(terminalId, terminalInstance.shellType);
        }
    }
    _onTerminalDisposed(terminalInstance) {
        this._proxy.$acceptTerminalClosed(terminalInstance.instanceId, terminalInstance.exitCode, terminalInstance.exitReason ?? TerminalExitReason.Unknown);
    }
    _onTerminalOpened(terminalInstance) {
        const extHostTerminalId = terminalInstance.shellLaunchConfig.extHostTerminalId;
        const shellLaunchConfigDto = {
            name: terminalInstance.shellLaunchConfig.name,
            executable: terminalInstance.shellLaunchConfig.executable,
            args: terminalInstance.shellLaunchConfig.args,
            cwd: terminalInstance.shellLaunchConfig.cwd,
            env: terminalInstance.shellLaunchConfig.env,
            hideFromUser: terminalInstance.shellLaunchConfig.hideFromUser,
            tabActions: terminalInstance.shellLaunchConfig.tabActions,
        };
        this._proxy.$acceptTerminalOpened(terminalInstance.instanceId, extHostTerminalId, terminalInstance.title, shellLaunchConfigDto);
    }
    _onTerminalProcessIdReady(terminalInstance) {
        if (terminalInstance.processId === undefined) {
            return;
        }
        this._proxy.$acceptTerminalProcessId(terminalInstance.instanceId, terminalInstance.processId);
    }
    _onInstanceDimensionsChanged(instance) {
        this._proxy.$acceptTerminalDimensions(instance.instanceId, instance.cols, instance.rows);
    }
    _onInstanceMaximumDimensionsChanged(instance) {
        this._proxy.$acceptTerminalMaximumDimensions(instance.instanceId, instance.maxCols, instance.maxRows);
    }
    _onRequestStartExtensionTerminal(request) {
        const proxy = request.proxy;
        this._terminalProcessProxies.set(proxy.instanceId, proxy);
        // Note that onResize is not being listened to here as it needs to fire when max dimensions
        // change, excluding the dimension override
        const initialDimensions = request.cols && request.rows
            ? {
                columns: request.cols,
                rows: request.rows,
            }
            : undefined;
        this._proxy.$startExtensionTerminal(proxy.instanceId, initialDimensions).then(request.callback);
        proxy.onInput((data) => this._proxy.$acceptProcessInput(proxy.instanceId, data));
        proxy.onShutdown((immediate) => this._proxy.$acceptProcessShutdown(proxy.instanceId, immediate));
        proxy.onRequestCwd(() => this._proxy.$acceptProcessRequestCwd(proxy.instanceId));
        proxy.onRequestInitialCwd(() => this._proxy.$acceptProcessRequestInitialCwd(proxy.instanceId));
    }
    $sendProcessData(terminalId, data) {
        this._terminalProcessProxies.get(terminalId)?.emitData(data);
    }
    $sendProcessReady(terminalId, pid, cwd, windowsPty) {
        this._terminalProcessProxies.get(terminalId)?.emitReady(pid, cwd, windowsPty);
    }
    $sendProcessProperty(terminalId, property) {
        if (property.type === "title" /* ProcessPropertyType.Title */) {
            const instance = this._terminalService.getInstanceFromId(terminalId);
            instance?.rename(property.value);
        }
        this._terminalProcessProxies.get(terminalId)?.emitProcessProperty(property);
    }
    $setEnvironmentVariableCollection(extensionIdentifier, persistent, collection, descriptionMap) {
        if (collection) {
            const translatedCollection = {
                persistent,
                map: deserializeEnvironmentVariableCollection(collection),
                descriptionMap: deserializeEnvironmentDescriptionMap(descriptionMap),
            };
            this._environmentVariableService.set(extensionIdentifier, translatedCollection);
        }
        else {
            this._environmentVariableService.delete(extensionIdentifier);
        }
    }
};
MainThreadTerminalService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadTerminalService),
    __param(1, ITerminalService),
    __param(2, ITerminalLinkProviderService),
    __param(3, ITerminalQuickFixService),
    __param(4, IInstantiationService),
    __param(5, IEnvironmentVariableService),
    __param(6, ILogService),
    __param(7, ITerminalProfileResolverService),
    __param(8, IRemoteAgentService),
    __param(9, ITerminalGroupService),
    __param(10, ITerminalEditorService),
    __param(11, ITerminalProfileService),
    __param(12, ITerminalCompletionService)
], MainThreadTerminalService);
export { MainThreadTerminalService };
/**
 * Encapsulates temporary tracking of data events from terminal instances, once disposed all
 * listeners are removed.
 */
let TerminalDataEventTracker = class TerminalDataEventTracker extends Disposable {
    constructor(_callback, _terminalService) {
        super();
        this._callback = _callback;
        this._terminalService = _terminalService;
        this._register((this._bufferer = new TerminalDataBufferer(this._callback)));
        for (const instance of this._terminalService.instances) {
            this._registerInstance(instance);
        }
        this._register(this._terminalService.onDidCreateInstance((instance) => this._registerInstance(instance)));
        this._register(this._terminalService.onDidDisposeInstance((instance) => this._bufferer.stopBuffering(instance.instanceId)));
    }
    _registerInstance(instance) {
        // Buffer data events to reduce the amount of messages going to the extension host
        this._register(this._bufferer.startBuffering(instance.instanceId, instance.onData));
    }
};
TerminalDataEventTracker = __decorate([
    __param(1, ITerminalService)
], TerminalDataEventTracker);
class ExtensionTerminalLinkProvider {
    constructor(_proxy) {
        this._proxy = _proxy;
    }
    async provideLinks(instance, line) {
        const proxy = this._proxy;
        const extHostLinks = await proxy.$provideLinks(instance.instanceId, line);
        return extHostLinks.map((dto) => ({
            id: dto.id,
            startIndex: dto.startIndex,
            length: dto.length,
            label: dto.label,
            activate: () => proxy.$activateLink(instance.instanceId, dto.id),
        }));
    }
}
export function getOutputMatchForLines(lines, outputMatcher) {
    const match = lines
        .join('\n')
        .match(outputMatcher.lineMatcher);
    return match ? { regexMatch: match, outputLines: lines } : undefined;
}
function parseQuickFix(id, source, fix) {
    let type = TerminalQuickFixType.TerminalCommand;
    if ('uri' in fix) {
        fix.uri = URI.revive(fix.uri);
        type = TerminalQuickFixType.Opener;
    }
    else if ('id' in fix) {
        type = TerminalQuickFixType.VscodeCommand;
    }
    return { id, type, source, ...fix };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRUZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGVBQWUsRUFDZixVQUFVLEVBRVYsaUJBQWlCLEVBQ2pCLGtCQUFrQixHQUNsQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFDTixjQUFjLEVBR2QsV0FBVyxHQU1YLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQVFOLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FDaEIsTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLHFCQUFxQixFQUdyQixnQkFBZ0IsR0FDaEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sb0NBQW9DLEVBQ3BDLHdDQUF3QyxFQUN4QyxzQ0FBc0MsR0FDdEMsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBR04sK0JBQStC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