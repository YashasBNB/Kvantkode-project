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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkVGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixlQUFlLEVBQ2YsVUFBVSxFQUVWLGlCQUFpQixFQUNqQixrQkFBa0IsR0FDbEIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sY0FBYyxFQUdkLFdBQVcsR0FNWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDL0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFRTixrQkFBa0IsRUFDbEIsZ0JBQWdCLEdBQ2hCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUNOLHNCQUFzQixFQUV0QixxQkFBcUIsRUFHckIsZ0JBQWdCLEdBQ2hCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDM0csT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDbEcsT0FBTyxFQUNOLG9DQUFvQyxFQUNwQyx3Q0FBd0MsRUFDeEMsc0NBQXNDLEdBQ3RDLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUdOLCtCQUErQixFQUMv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