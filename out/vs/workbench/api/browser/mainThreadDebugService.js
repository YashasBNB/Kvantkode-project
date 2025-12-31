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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkRGVidWdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixhQUFhLEVBQ2IsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxHQUFHLElBQUksR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ3ZFLE9BQU8sRUFDTixhQUFhLEVBY2IsbUJBQW1CLEdBRW5CLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUNOLGNBQWMsRUFJZCxXQUFXLEdBV1gsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDdkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFekYsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixnQkFBZ0IsRUFDaEIsZUFBZSxHQUNmLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdsRCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQVds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