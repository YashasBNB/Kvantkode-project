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
import { DisposableMap, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { URI as uri } from '../../../base/common/uri.js';
import { IDebugService, IDebugVisualization, } from '../../contrib/debug/common/debug.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import severity from '../../../base/common/severity.js';
import { AbstractDebugAdapter } from '../../contrib/debug/common/abstractDebugAdapter.js';
import { convertToVSCPaths, convertToDAPaths, isSessionAttach, } from '../../contrib/debug/common/debugUtils.js';
import { ErrorNoTelemetry } from '../../../base/common/errors.js';
import { IDebugVisualizerService } from '../../contrib/debug/common/debugVisualizers.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { Event } from '../../../base/common/event.js';
import { isDefined } from '../../../base/common/types.js';
let MainThreadDebugService = class MainThreadDebugService {
    constructor(extHostContext, debugService, visualizerService) {
        this.debugService = debugService;
        this.visualizerService = visualizerService;
        this._toDispose = new DisposableStore();
        this._debugAdaptersHandleCounter = 1;
        this._visualizerHandles = new Map();
        this._visualizerTreeHandles = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDebugService);
        const sessionListeners = new DisposableMap();
        this._toDispose.add(sessionListeners);
        this._toDispose.add(debugService.onDidNewSession((session) => {
            this._proxy.$acceptDebugSessionStarted(this.getSessionDto(session));
            const store = sessionListeners.get(session);
            store?.add(session.onDidChangeName((name) => {
                this._proxy.$acceptDebugSessionNameChanged(this.getSessionDto(session), name);
            }));
        }));
        // Need to start listening early to new session events because a custom event can come while a session is initialising
        this._toDispose.add(debugService.onWillNewSession((session) => {
            let store = sessionListeners.get(session);
            if (!store) {
                store = new DisposableStore();
                sessionListeners.set(session, store);
            }
            store.add(session.onDidCustomEvent((event) => this._proxy.$acceptDebugSessionCustomEvent(this.getSessionDto(session), event)));
        }));
        this._toDispose.add(debugService.onDidEndSession(({ session, restart }) => {
            this._proxy.$acceptDebugSessionTerminated(this.getSessionDto(session));
            this._extHostKnownSessions.delete(session.getId());
            // keep the session listeners around since we still will get events after they restart
            if (!restart) {
                sessionListeners.deleteAndDispose(session);
            }
            // any restarted session will create a new DA, so always throw the old one away.
            for (const [handle, value] of this._debugAdapters) {
                if (value.session === session) {
                    this._debugAdapters.delete(handle);
                    // break;
                }
            }
        }));
        this._toDispose.add(debugService.getViewModel().onDidFocusSession((session) => {
            this._proxy.$acceptDebugSessionActiveChanged(this.getSessionDto(session));
        }));
        this._toDispose.add(toDisposable(() => {
            for (const [handle, da] of this._debugAdapters) {
                da.fireError(handle, new Error('Extension host shut down'));
            }
        }));
        this._debugAdapters = new Map();
        this._debugConfigurationProviders = new Map();
        this._debugAdapterDescriptorFactories = new Map();
        this._extHostKnownSessions = new Set();
        const viewModel = this.debugService.getViewModel();
        this._toDispose.add(Event.any(viewModel.onDidFocusStackFrame, viewModel.onDidFocusThread)(() => {
            const stackFrame = viewModel.focusedStackFrame;
            const thread = viewModel.focusedThread;
            if (stackFrame) {
                this._proxy.$acceptStackFrameFocus({
                    kind: 'stackFrame',
                    threadId: stackFrame.thread.threadId,
                    frameId: stackFrame.frameId,
                    sessionId: stackFrame.thread.session.getId(),
                });
            }
            else if (thread) {
                this._proxy.$acceptStackFrameFocus({
                    kind: 'thread',
                    threadId: thread.threadId,
                    sessionId: thread.session.getId(),
                });
            }
            else {
                this._proxy.$acceptStackFrameFocus(undefined);
            }
        }));
        this.sendBreakpointsAndListen();
    }
    $registerDebugVisualizerTree(treeId, canEdit) {
        this._visualizerTreeHandles.set(treeId, this.visualizerService.registerTree(treeId, {
            disposeItem: (id) => this._proxy.$disposeVisualizedTree(id),
            getChildren: (e) => this._proxy.$getVisualizerTreeItemChildren(treeId, e),
            getTreeItem: (e) => this._proxy.$getVisualizerTreeItem(treeId, e),
            editItem: canEdit ? (e, v) => this._proxy.$editVisualizerTreeItem(e, v) : undefined,
        }));
    }
    $unregisterDebugVisualizerTree(treeId) {
        this._visualizerTreeHandles.get(treeId)?.dispose();
        this._visualizerTreeHandles.delete(treeId);
    }
    $registerDebugVisualizer(extensionId, id) {
        const handle = this.visualizerService.register({
            extensionId: new ExtensionIdentifier(extensionId),
            id,
            disposeDebugVisualizers: (ids) => this._proxy.$disposeDebugVisualizers(ids),
            executeDebugVisualizerCommand: (id) => this._proxy.$executeDebugVisualizerCommand(id),
            provideDebugVisualizers: (context, token) => this._proxy
                .$provideDebugVisualizers(extensionId, id, context, token)
                .then((r) => r.map(IDebugVisualization.deserialize)),
            resolveDebugVisualizer: (viz, token) => this._proxy.$resolveDebugVisualizer(viz.id, token),
        });
        this._visualizerHandles.set(`${extensionId}/${id}`, handle);
    }
    $unregisterDebugVisualizer(extensionId, id) {
        const key = `${extensionId}/${id}`;
        this._visualizerHandles.get(key)?.dispose();
        this._visualizerHandles.delete(key);
    }
    sendBreakpointsAndListen() {
        // set up a handler to send more
        this._toDispose.add(this.debugService.getModel().onDidChangeBreakpoints((e) => {
            // Ignore session only breakpoint events since they should only reflect in the UI
            if (e && !e.sessionOnly) {
                const delta = {};
                if (e.added) {
                    delta.added = this.convertToDto(e.added);
                }
                if (e.removed) {
                    delta.removed = e.removed.map((x) => x.getId());
                }
                if (e.changed) {
                    delta.changed = this.convertToDto(e.changed);
                }
                if (delta.added || delta.removed || delta.changed) {
                    this._proxy.$acceptBreakpointsDelta(delta);
                }
            }
        }));
        // send all breakpoints
        const bps = this.debugService.getModel().getBreakpoints();
        const fbps = this.debugService.getModel().getFunctionBreakpoints();
        const dbps = this.debugService.getModel().getDataBreakpoints();
        if (bps.length > 0 || fbps.length > 0) {
            this._proxy.$acceptBreakpointsDelta({
                added: this.convertToDto(bps)
                    .concat(this.convertToDto(fbps))
                    .concat(this.convertToDto(dbps)),
            });
        }
    }
    dispose() {
        this._toDispose.dispose();
    }
    // interface IDebugAdapterProvider
    createDebugAdapter(session) {
        const handle = this._debugAdaptersHandleCounter++;
        const da = new ExtensionHostDebugAdapter(this, handle, this._proxy, session);
        this._debugAdapters.set(handle, da);
        return da;
    }
    substituteVariables(folder, config) {
        return Promise.resolve(this._proxy.$substituteVariables(folder ? folder.uri : undefined, config));
    }
    runInTerminal(args, sessionId) {
        return this._proxy.$runInTerminal(args, sessionId);
    }
    // RPC methods (MainThreadDebugServiceShape)
    $registerDebugTypes(debugTypes) {
        this._toDispose.add(this.debugService.getAdapterManager().registerDebugAdapterFactory(debugTypes, this));
    }
    $registerBreakpoints(DTOs) {
        for (const dto of DTOs) {
            if (dto.type === 'sourceMulti') {
                const rawbps = dto.lines.map((l) => ({
                    id: l.id,
                    enabled: l.enabled,
                    lineNumber: l.line + 1,
                    column: l.character > 0 ? l.character + 1 : undefined, // a column value of 0 results in an omitted column attribute; see #46784
                    condition: l.condition,
                    hitCondition: l.hitCondition,
                    logMessage: l.logMessage,
                    mode: l.mode,
                }));
                this.debugService.addBreakpoints(uri.revive(dto.uri), rawbps);
            }
            else if (dto.type === 'function') {
                this.debugService.addFunctionBreakpoint({
                    name: dto.functionName,
                    mode: dto.mode,
                    condition: dto.condition,
                    hitCondition: dto.hitCondition,
                    enabled: dto.enabled,
                    logMessage: dto.logMessage,
                }, dto.id);
            }
            else if (dto.type === 'data') {
                this.debugService.addDataBreakpoint({
                    description: dto.label,
                    src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dto.dataId },
                    canPersist: dto.canPersist,
                    accessTypes: dto.accessTypes,
                    accessType: dto.accessType,
                    mode: dto.mode,
                });
            }
        }
        return Promise.resolve();
    }
    $unregisterBreakpoints(breakpointIds, functionBreakpointIds, dataBreakpointIds) {
        breakpointIds.forEach((id) => this.debugService.removeBreakpoints(id));
        functionBreakpointIds.forEach((id) => this.debugService.removeFunctionBreakpoints(id));
        dataBreakpointIds.forEach((id) => this.debugService.removeDataBreakpoints(id));
        return Promise.resolve();
    }
    $registerDebugConfigurationProvider(debugType, providerTriggerKind, hasProvide, hasResolve, hasResolve2, handle) {
        const provider = {
            type: debugType,
            triggerKind: providerTriggerKind,
        };
        if (hasProvide) {
            provider.provideDebugConfigurations = (folder, token) => {
                return this._proxy.$provideDebugConfigurations(handle, folder, token);
            };
        }
        if (hasResolve) {
            provider.resolveDebugConfiguration = (folder, config, token) => {
                return this._proxy.$resolveDebugConfiguration(handle, folder, config, token);
            };
        }
        if (hasResolve2) {
            provider.resolveDebugConfigurationWithSubstitutedVariables = (folder, config, token) => {
                return this._proxy.$resolveDebugConfigurationWithSubstitutedVariables(handle, folder, config, token);
            };
        }
        this._debugConfigurationProviders.set(handle, provider);
        this._toDispose.add(this.debugService.getConfigurationManager().registerDebugConfigurationProvider(provider));
        return Promise.resolve(undefined);
    }
    $unregisterDebugConfigurationProvider(handle) {
        const provider = this._debugConfigurationProviders.get(handle);
        if (provider) {
            this._debugConfigurationProviders.delete(handle);
            this.debugService.getConfigurationManager().unregisterDebugConfigurationProvider(provider);
        }
    }
    $registerDebugAdapterDescriptorFactory(debugType, handle) {
        const provider = {
            type: debugType,
            createDebugAdapterDescriptor: (session) => {
                return Promise.resolve(this._proxy.$provideDebugAdapter(handle, this.getSessionDto(session)));
            },
        };
        this._debugAdapterDescriptorFactories.set(handle, provider);
        this._toDispose.add(this.debugService.getAdapterManager().registerDebugAdapterDescriptorFactory(provider));
        return Promise.resolve(undefined);
    }
    $unregisterDebugAdapterDescriptorFactory(handle) {
        const provider = this._debugAdapterDescriptorFactories.get(handle);
        if (provider) {
            this._debugAdapterDescriptorFactories.delete(handle);
            this.debugService.getAdapterManager().unregisterDebugAdapterDescriptorFactory(provider);
        }
    }
    getSession(sessionId) {
        if (sessionId) {
            return this.debugService.getModel().getSession(sessionId, true);
        }
        return undefined;
    }
    async $startDebugging(folder, nameOrConfig, options) {
        const folderUri = folder ? uri.revive(folder) : undefined;
        const launch = this.debugService.getConfigurationManager().getLaunch(folderUri);
        const parentSession = this.getSession(options.parentSessionID);
        const saveBeforeStart = typeof options.suppressSaveBeforeStart === 'boolean'
            ? !options.suppressSaveBeforeStart
            : undefined;
        const debugOptions = {
            noDebug: options.noDebug,
            parentSession,
            lifecycleManagedByParent: options.lifecycleManagedByParent,
            repl: options.repl,
            compact: options.compact,
            compoundRoot: parentSession?.compoundRoot,
            saveBeforeRestart: saveBeforeStart,
            testRun: options.testRun,
            suppressDebugStatusbar: options.suppressDebugStatusbar,
            suppressDebugToolbar: options.suppressDebugToolbar,
            suppressDebugView: options.suppressDebugView,
        };
        try {
            return this.debugService.startDebugging(launch, nameOrConfig, debugOptions, saveBeforeStart);
        }
        catch (err) {
            throw new ErrorNoTelemetry(err && err.message ? err.message : 'cannot start debugging');
        }
    }
    $setDebugSessionName(sessionId, name) {
        const session = this.debugService.getModel().getSession(sessionId);
        session?.setName(name);
    }
    $customDebugAdapterRequest(sessionId, request, args) {
        const session = this.debugService.getModel().getSession(sessionId, true);
        if (session) {
            return session.customRequest(request, args).then((response) => {
                if (response && response.success) {
                    return response.body;
                }
                else {
                    return Promise.reject(new ErrorNoTelemetry(response ? response.message : 'custom request failed'));
                }
            });
        }
        return Promise.reject(new ErrorNoTelemetry('debug session not found'));
    }
    $getDebugProtocolBreakpoint(sessionId, breakpoinId) {
        const session = this.debugService.getModel().getSession(sessionId, true);
        if (session) {
            return Promise.resolve(session.getDebugProtocolBreakpoint(breakpoinId));
        }
        return Promise.reject(new ErrorNoTelemetry('debug session not found'));
    }
    $stopDebugging(sessionId) {
        if (sessionId) {
            const session = this.debugService.getModel().getSession(sessionId, true);
            if (session) {
                return this.debugService.stopSession(session, isSessionAttach(session));
            }
        }
        else {
            // stop all
            return this.debugService.stopSession(undefined);
        }
        return Promise.reject(new ErrorNoTelemetry('debug session not found'));
    }
    $appendDebugConsole(value) {
        // Use warning as severity to get the orange color for messages coming from the debug extension
        const session = this.debugService.getViewModel().focusedSession;
        session?.appendToRepl({ output: value, sev: severity.Warning });
    }
    $acceptDAMessage(handle, message) {
        this.getDebugAdapter(handle).acceptMessage(convertToVSCPaths(message, false));
    }
    $acceptDAError(handle, name, message, stack) {
        // don't use getDebugAdapter since an error can be expected on a post-close
        this._debugAdapters.get(handle)?.fireError(handle, new Error(`${name}: ${message}\n${stack}`));
    }
    $acceptDAExit(handle, code, signal) {
        // don't use getDebugAdapter since an error can be expected on a post-close
        this._debugAdapters.get(handle)?.fireExit(handle, code, signal);
    }
    getDebugAdapter(handle) {
        const adapter = this._debugAdapters.get(handle);
        if (!adapter) {
            throw new Error('Invalid debug adapter');
        }
        return adapter;
    }
    // dto helpers
    $sessionCached(sessionID) {
        // remember that the EH has cached the session and we do not have to send it again
        this._extHostKnownSessions.add(sessionID);
    }
    getSessionDto(session) {
        if (session) {
            const sessionID = session.getId();
            if (this._extHostKnownSessions.has(sessionID)) {
                return sessionID;
            }
            else {
                // this._sessions.add(sessionID); 	// #69534: see $sessionCached above
                return {
                    id: sessionID,
                    type: session.configuration.type,
                    name: session.name,
                    folderUri: session.root ? session.root.uri : undefined,
                    configuration: session.configuration,
                    parent: session.parentSession?.getId(),
                };
            }
        }
        return undefined;
    }
    convertToDto(bps) {
        return bps
            .map((bp) => {
            if ('name' in bp) {
                const fbp = bp;
                return {
                    type: 'function',
                    id: fbp.getId(),
                    enabled: fbp.enabled,
                    condition: fbp.condition,
                    hitCondition: fbp.hitCondition,
                    logMessage: fbp.logMessage,
                    functionName: fbp.name,
                };
            }
            else if ('src' in bp) {
                const dbp = bp;
                return {
                    type: 'data',
                    id: dbp.getId(),
                    dataId: dbp.src.type === 0 /* DataBreakpointSetType.Variable */ ? dbp.src.dataId : dbp.src.address,
                    enabled: dbp.enabled,
                    condition: dbp.condition,
                    hitCondition: dbp.hitCondition,
                    logMessage: dbp.logMessage,
                    accessType: dbp.accessType,
                    label: dbp.description,
                    canPersist: dbp.canPersist,
                };
            }
            else if ('uri' in bp) {
                const sbp = bp;
                return {
                    type: 'source',
                    id: sbp.getId(),
                    enabled: sbp.enabled,
                    condition: sbp.condition,
                    hitCondition: sbp.hitCondition,
                    logMessage: sbp.logMessage,
                    uri: sbp.uri,
                    line: sbp.lineNumber > 0 ? sbp.lineNumber - 1 : 0,
                    character: typeof sbp.column === 'number' && sbp.column > 0 ? sbp.column - 1 : 0,
                };
            }
            else {
                return undefined;
            }
        })
            .filter(isDefined);
    }
};
MainThreadDebugService = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDebugService),
    __param(1, IDebugService),
    __param(2, IDebugVisualizerService)
], MainThreadDebugService);
export { MainThreadDebugService };
/**
 * DebugAdapter that communicates via extension protocol with another debug adapter.
 */
class ExtensionHostDebugAdapter extends AbstractDebugAdapter {
    constructor(_ds, _handle, _proxy, session) {
        super();
        this._ds = _ds;
        this._handle = _handle;
        this._proxy = _proxy;
        this.session = session;
    }
    fireError(handle, err) {
        this._onError.fire(err);
    }
    fireExit(handle, code, signal) {
        this._onExit.fire(code);
    }
    startSession() {
        return Promise.resolve(this._proxy.$startDASession(this._handle, this._ds.getSessionDto(this.session)));
    }
    sendMessage(message) {
        this._proxy.$sendDAMessage(this._handle, convertToDAPaths(message, true));
    }
    async stopSession() {
        await this.cancelPendingRequests();
        return Promise.resolve(this._proxy.$stopDASession(this._handle));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWREZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGFBQWEsRUFDYixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDdkUsT0FBTyxFQUNOLGFBQWEsRUFjYixtQkFBbUIsR0FFbkIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQ04sY0FBYyxFQUlkLFdBQVcsR0FXWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUV6RixPQUFPLEVBQ04saUJBQWlCLEVBQ2pCLGdCQUFnQixFQUNoQixlQUFlLEdBQ2YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR2xELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNC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