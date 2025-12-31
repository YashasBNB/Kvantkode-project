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
import { coalesce } from '../../../base/common/arrays.js';
import { asPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable as DisposableCls, toDisposable } from '../../../base/common/lifecycle.js';
import { ThemeIcon as ThemeIconUtils } from '../../../base/common/themables.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { AbstractDebugAdapter } from '../../contrib/debug/common/abstractDebugAdapter.js';
import { convertToDAPaths, convertToVSCPaths, isDebuggerMainContribution, } from '../../contrib/debug/common/debugUtils.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostCommands } from './extHostCommands.js';
import { IExtHostConfiguration } from './extHostConfiguration.js';
import { IExtHostEditorTabs } from './extHostEditorTabs.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostTesting } from './extHostTesting.js';
import * as Convert from './extHostTypeConverters.js';
import { DataBreakpoint, DebugAdapterExecutable, DebugAdapterInlineImplementation, DebugAdapterNamedPipeServer, DebugAdapterServer, DebugConsoleMode, DebugStackFrame, DebugThread, Disposable, FunctionBreakpoint, Location, Position, setBreakpointId, SourceBreakpoint, ThemeIcon, } from './extHostTypes.js';
import { IExtHostVariableResolverProvider } from './extHostVariableResolverService.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
export const IExtHostDebugService = createDecorator('IExtHostDebugService');
let ExtHostDebugServiceBase = class ExtHostDebugServiceBase extends DisposableCls {
    get onDidStartDebugSession() {
        return this._onDidStartDebugSession.event;
    }
    get onDidTerminateDebugSession() {
        return this._onDidTerminateDebugSession.event;
    }
    get onDidChangeActiveDebugSession() {
        return this._onDidChangeActiveDebugSession.event;
    }
    get activeDebugSession() {
        return this._activeDebugSession?.api;
    }
    get onDidReceiveDebugSessionCustomEvent() {
        return this._onDidReceiveDebugSessionCustomEvent.event;
    }
    get activeDebugConsole() {
        return this._activeDebugConsole.value;
    }
    constructor(extHostRpcService, _workspaceService, _extensionService, _configurationService, _editorTabs, _variableResolver, _commands, _testing) {
        super();
        this._workspaceService = _workspaceService;
        this._extensionService = _extensionService;
        this._configurationService = _configurationService;
        this._editorTabs = _editorTabs;
        this._variableResolver = _variableResolver;
        this._commands = _commands;
        this._testing = _testing;
        this._debugSessions = new Map();
        this._debugVisualizationTreeItemIdsCounter = 0;
        this._debugVisualizationProviders = new Map();
        this._debugVisualizationTrees = new Map();
        this._debugVisualizationTreeItemIds = new WeakMap();
        this._debugVisualizationElements = new Map();
        this._visualizers = new Map();
        this._visualizerIdCounter = 0;
        this._configProviderHandleCounter = 0;
        this._configProviders = [];
        this._adapterFactoryHandleCounter = 0;
        this._adapterFactories = [];
        this._trackerFactoryHandleCounter = 0;
        this._trackerFactories = [];
        this._debugAdapters = new Map();
        this._debugAdaptersTrackers = new Map();
        this._onDidStartDebugSession = this._register(new Emitter());
        this._onDidTerminateDebugSession = this._register(new Emitter());
        this._onDidChangeActiveDebugSession = this._register(new Emitter());
        this._onDidReceiveDebugSessionCustomEvent = this._register(new Emitter());
        this._debugServiceProxy = extHostRpcService.getProxy(MainContext.MainThreadDebugService);
        this._onDidChangeBreakpoints = this._register(new Emitter());
        this._onDidChangeActiveStackItem = this._register(new Emitter());
        this._activeDebugConsole = new ExtHostDebugConsole(this._debugServiceProxy);
        this._breakpoints = new Map();
        this._extensionService
            .getExtensionRegistry()
            .then((extensionRegistry) => {
            this._register(extensionRegistry.onDidChange((_) => {
                this.registerAllDebugTypes(extensionRegistry);
            }));
            this.registerAllDebugTypes(extensionRegistry);
        });
        this._telemetryProxy = extHostRpcService.getProxy(MainContext.MainThreadTelemetry);
    }
    async $getVisualizerTreeItem(treeId, element) {
        const context = this.hydrateVisualizationContext(element);
        if (!context) {
            return undefined;
        }
        const item = await this._debugVisualizationTrees.get(treeId)?.getTreeItem?.(context);
        return item ? this.convertVisualizerTreeItem(treeId, item) : undefined;
    }
    registerDebugVisualizationTree(manifest, id, provider) {
        const extensionId = ExtensionIdentifier.toKey(manifest.identifier);
        const key = this.extensionVisKey(extensionId, id);
        if (this._debugVisualizationProviders.has(key)) {
            throw new Error(`A debug visualization provider with id '${id}' is already registered`);
        }
        this._debugVisualizationTrees.set(key, provider);
        this._debugServiceProxy.$registerDebugVisualizerTree(key, !!provider.editItem);
        return toDisposable(() => {
            this._debugServiceProxy.$unregisterDebugVisualizerTree(key);
            this._debugVisualizationTrees.delete(id);
        });
    }
    async $getVisualizerTreeItemChildren(treeId, element) {
        const item = this._debugVisualizationElements.get(element)?.item;
        if (!item) {
            return [];
        }
        const children = await this._debugVisualizationTrees.get(treeId)?.getChildren?.(item);
        return children?.map((i) => this.convertVisualizerTreeItem(treeId, i)) || [];
    }
    async $editVisualizerTreeItem(element, value) {
        const e = this._debugVisualizationElements.get(element);
        if (!e) {
            return undefined;
        }
        const r = await this._debugVisualizationTrees.get(e.provider)?.editItem?.(e.item, value);
        return this.convertVisualizerTreeItem(e.provider, r || e.item);
    }
    $disposeVisualizedTree(element) {
        const root = this._debugVisualizationElements.get(element);
        if (!root) {
            return;
        }
        const queue = [root.children];
        for (const children of queue) {
            if (children) {
                for (const child of children) {
                    queue.push(this._debugVisualizationElements.get(child)?.children);
                    this._debugVisualizationElements.delete(child);
                }
            }
        }
    }
    convertVisualizerTreeItem(treeId, item) {
        let id = this._debugVisualizationTreeItemIds.get(item);
        if (!id) {
            id = this._debugVisualizationTreeItemIdsCounter++;
            this._debugVisualizationTreeItemIds.set(item, id);
            this._debugVisualizationElements.set(id, { provider: treeId, item });
        }
        return Convert.DebugTreeItem.from(item, id);
    }
    asDebugSourceUri(src, session) {
        const source = src;
        if (typeof source.sourceReference === 'number' && source.sourceReference > 0) {
            // src can be retrieved via DAP's "source" request
            let debug = `debug:${encodeURIComponent(source.path || '')}`;
            let sep = '?';
            if (session) {
                debug += `${sep}session=${encodeURIComponent(session.id)}`;
                sep = '&';
            }
            debug += `${sep}ref=${source.sourceReference}`;
            return URI.parse(debug);
        }
        else if (source.path) {
            // src is just a local file path
            return URI.file(source.path);
        }
        else {
            throw new Error(`cannot create uri from DAP 'source' object; properties 'path' and 'sourceReference' are both missing.`);
        }
    }
    registerAllDebugTypes(extensionRegistry) {
        const debugTypes = [];
        for (const ed of extensionRegistry.getAllExtensionDescriptions()) {
            if (ed.contributes) {
                const debuggers = ed.contributes['debuggers'];
                if (debuggers && debuggers.length > 0) {
                    for (const dbg of debuggers) {
                        if (isDebuggerMainContribution(dbg)) {
                            debugTypes.push(dbg.type);
                        }
                    }
                }
            }
        }
        this._debugServiceProxy.$registerDebugTypes(debugTypes);
    }
    // extension debug API
    get activeStackItem() {
        return this._activeStackItem;
    }
    get onDidChangeActiveStackItem() {
        return this._onDidChangeActiveStackItem.event;
    }
    get onDidChangeBreakpoints() {
        return this._onDidChangeBreakpoints.event;
    }
    get breakpoints() {
        const result = [];
        this._breakpoints.forEach((bp) => result.push(bp));
        return result;
    }
    async $resolveDebugVisualizer(id, token) {
        const visualizer = this._visualizers.get(id);
        if (!visualizer) {
            throw new Error(`No debug visualizer found with id '${id}'`);
        }
        let { v, provider, extensionId } = visualizer;
        if (!v.visualization) {
            v = (await provider.resolveDebugVisualization?.(v, token)) || v;
            visualizer.v = v;
        }
        if (!v.visualization) {
            throw new Error(`No visualization returned from resolveDebugVisualization in '${provider}'`);
        }
        return this.serializeVisualization(extensionId, v.visualization);
    }
    async $executeDebugVisualizerCommand(id) {
        const visualizer = this._visualizers.get(id);
        if (!visualizer) {
            throw new Error(`No debug visualizer found with id '${id}'`);
        }
        const command = visualizer.v.visualization;
        if (command && 'command' in command) {
            this._commands.executeCommand(command.command, ...(command.arguments || []));
        }
    }
    hydrateVisualizationContext(context) {
        const session = this._debugSessions.get(context.sessionId);
        return (session && {
            session: session.api,
            variable: context.variable,
            containerId: context.containerId,
            frameId: context.frameId,
            threadId: context.threadId,
        });
    }
    async $provideDebugVisualizers(extensionId, id, context, token) {
        const contextHydrated = this.hydrateVisualizationContext(context);
        const key = this.extensionVisKey(extensionId, id);
        const provider = this._debugVisualizationProviders.get(key);
        if (!contextHydrated || !provider) {
            return []; // probably ended in the meantime
        }
        const visualizations = await provider.provideDebugVisualization(contextHydrated, token);
        if (!visualizations) {
            return [];
        }
        return visualizations.map((v) => {
            const id = ++this._visualizerIdCounter;
            this._visualizers.set(id, { v, provider, extensionId });
            const icon = v.iconPath ? this.getIconPathOrClass(v.iconPath) : undefined;
            return {
                id,
                name: v.name,
                iconClass: icon?.iconClass,
                iconPath: icon?.iconPath,
                visualization: this.serializeVisualization(extensionId, v.visualization),
            };
        });
    }
    $disposeDebugVisualizers(ids) {
        for (const id of ids) {
            this._visualizers.delete(id);
        }
    }
    registerDebugVisualizationProvider(manifest, id, provider) {
        if (!manifest.contributes?.debugVisualizers?.some((r) => r.id === id)) {
            throw new Error(`Extensions may only call registerDebugVisualizationProvider() for renderers they contribute (got ${id})`);
        }
        const extensionId = ExtensionIdentifier.toKey(manifest.identifier);
        const key = this.extensionVisKey(extensionId, id);
        if (this._debugVisualizationProviders.has(key)) {
            throw new Error(`A debug visualization provider with id '${id}' is already registered`);
        }
        this._debugVisualizationProviders.set(key, provider);
        this._debugServiceProxy.$registerDebugVisualizer(extensionId, id);
        return toDisposable(() => {
            this._debugServiceProxy.$unregisterDebugVisualizer(extensionId, id);
            this._debugVisualizationProviders.delete(id);
        });
    }
    addBreakpoints(breakpoints0) {
        // filter only new breakpoints
        const breakpoints = breakpoints0.filter((bp) => {
            const id = bp.id;
            if (!this._breakpoints.has(id)) {
                this._breakpoints.set(id, bp);
                return true;
            }
            return false;
        });
        // send notification for added breakpoints
        this.fireBreakpointChanges(breakpoints, [], []);
        // convert added breakpoints to DTOs
        const dtos = [];
        const map = new Map();
        for (const bp of breakpoints) {
            if (bp instanceof SourceBreakpoint) {
                let dto = map.get(bp.location.uri.toString());
                if (!dto) {
                    dto = {
                        type: 'sourceMulti',
                        uri: bp.location.uri,
                        lines: [],
                    };
                    map.set(bp.location.uri.toString(), dto);
                    dtos.push(dto);
                }
                dto.lines.push({
                    id: bp.id,
                    enabled: bp.enabled,
                    condition: bp.condition,
                    hitCondition: bp.hitCondition,
                    logMessage: bp.logMessage,
                    line: bp.location.range.start.line,
                    character: bp.location.range.start.character,
                    mode: bp.mode,
                });
            }
            else if (bp instanceof FunctionBreakpoint) {
                dtos.push({
                    type: 'function',
                    id: bp.id,
                    enabled: bp.enabled,
                    hitCondition: bp.hitCondition,
                    logMessage: bp.logMessage,
                    condition: bp.condition,
                    functionName: bp.functionName,
                    mode: bp.mode,
                });
            }
        }
        // send DTOs to VS Code
        return this._debugServiceProxy.$registerBreakpoints(dtos);
    }
    removeBreakpoints(breakpoints0) {
        // remove from array
        const breakpoints = breakpoints0.filter((b) => this._breakpoints.delete(b.id));
        // send notification
        this.fireBreakpointChanges([], breakpoints, []);
        // unregister with VS Code
        const ids = breakpoints.filter((bp) => bp instanceof SourceBreakpoint).map((bp) => bp.id);
        const fids = breakpoints.filter((bp) => bp instanceof FunctionBreakpoint).map((bp) => bp.id);
        const dids = breakpoints.filter((bp) => bp instanceof DataBreakpoint).map((bp) => bp.id);
        return this._debugServiceProxy.$unregisterBreakpoints(ids, fids, dids);
    }
    startDebugging(folder, nameOrConfig, options) {
        const testRunMeta = options.testRun && this._testing.getMetadataForRun(options.testRun);
        return this._debugServiceProxy.$startDebugging(folder ? folder.uri : undefined, nameOrConfig, {
            parentSessionID: options.parentSession ? options.parentSession.id : undefined,
            lifecycleManagedByParent: options.lifecycleManagedByParent,
            repl: options.consoleMode === DebugConsoleMode.MergeWithParent ? 'mergeWithParent' : 'separate',
            noDebug: options.noDebug,
            compact: options.compact,
            suppressSaveBeforeStart: options.suppressSaveBeforeStart,
            testRun: testRunMeta && {
                runId: testRunMeta.runId,
                taskId: testRunMeta.taskId,
            },
            // Check debugUI for back-compat, #147264
            suppressDebugStatusbar: options.suppressDebugStatusbar ?? options.debugUI?.simple,
            suppressDebugToolbar: options.suppressDebugToolbar ?? options.debugUI?.simple,
            suppressDebugView: options.suppressDebugView ?? options.debugUI?.simple,
        });
    }
    stopDebugging(session) {
        return this._debugServiceProxy.$stopDebugging(session ? session.id : undefined);
    }
    registerDebugConfigurationProvider(type, provider, trigger) {
        if (!provider) {
            return new Disposable(() => { });
        }
        const handle = this._configProviderHandleCounter++;
        this._configProviders.push({ type, handle, provider });
        this._debugServiceProxy.$registerDebugConfigurationProvider(type, trigger, !!provider.provideDebugConfigurations, !!provider.resolveDebugConfiguration, !!provider.resolveDebugConfigurationWithSubstitutedVariables, handle);
        return new Disposable(() => {
            this._configProviders = this._configProviders.filter((p) => p.provider !== provider); // remove
            this._debugServiceProxy.$unregisterDebugConfigurationProvider(handle);
        });
    }
    registerDebugAdapterDescriptorFactory(extension, type, factory) {
        if (!factory) {
            return new Disposable(() => { });
        }
        // a DebugAdapterDescriptorFactory can only be registered in the extension that contributes the debugger
        if (!this.definesDebugType(extension, type)) {
            throw new Error(`a DebugAdapterDescriptorFactory can only be registered from the extension that defines the '${type}' debugger.`);
        }
        // make sure that only one factory for this type is registered
        if (this.getAdapterDescriptorFactoryByType(type)) {
            throw new Error(`a DebugAdapterDescriptorFactory can only be registered once per a type.`);
        }
        const handle = this._adapterFactoryHandleCounter++;
        this._adapterFactories.push({ type, handle, factory });
        this._debugServiceProxy.$registerDebugAdapterDescriptorFactory(type, handle);
        return new Disposable(() => {
            this._adapterFactories = this._adapterFactories.filter((p) => p.factory !== factory); // remove
            this._debugServiceProxy.$unregisterDebugAdapterDescriptorFactory(handle);
        });
    }
    registerDebugAdapterTrackerFactory(type, factory) {
        if (!factory) {
            return new Disposable(() => { });
        }
        const handle = this._trackerFactoryHandleCounter++;
        this._trackerFactories.push({ type, handle, factory });
        return new Disposable(() => {
            this._trackerFactories = this._trackerFactories.filter((p) => p.factory !== factory); // remove
        });
    }
    // RPC methods (ExtHostDebugServiceShape)
    async $runInTerminal(args, sessionId) {
        return Promise.resolve(undefined);
    }
    async $substituteVariables(folderUri, config) {
        let ws;
        const folder = await this.getFolder(folderUri);
        if (folder) {
            ws = {
                uri: folder.uri,
                name: folder.name,
                index: folder.index,
                toResource: () => {
                    throw new Error('Not implemented');
                },
            };
        }
        const variableResolver = await this._variableResolver.getResolver();
        return variableResolver.resolveAsync(ws, config);
    }
    createDebugAdapter(adapter, session) {
        if (adapter instanceof DebugAdapterInlineImplementation) {
            return new DirectDebugAdapter(adapter.implementation);
        }
        return undefined;
    }
    createSignService() {
        return undefined;
    }
    async $startDASession(debugAdapterHandle, sessionDto) {
        const mythis = this;
        const session = await this.getSession(sessionDto);
        return this.getAdapterDescriptor(this.getAdapterDescriptorFactoryByType(session.type), session).then((daDescriptor) => {
            if (!daDescriptor) {
                throw new Error(`Couldn't find a debug adapter descriptor for debug type '${session.type}' (extension might have failed to activate)`);
            }
            const da = this.createDebugAdapter(daDescriptor, session);
            if (!da) {
                throw new Error(`Couldn't create a debug adapter for type '${session.type}'.`);
            }
            const debugAdapter = da;
            this._debugAdapters.set(debugAdapterHandle, debugAdapter);
            return this.getDebugAdapterTrackers(session).then((tracker) => {
                if (tracker) {
                    this._debugAdaptersTrackers.set(debugAdapterHandle, tracker);
                }
                debugAdapter.onMessage(async (message) => {
                    if (message.type === 'request' &&
                        message.command === 'handshake') {
                        const request = message;
                        const response = {
                            type: 'response',
                            seq: 0,
                            command: request.command,
                            request_seq: request.seq,
                            success: true,
                        };
                        if (!this._signService) {
                            this._signService = this.createSignService();
                        }
                        try {
                            if (this._signService) {
                                const signature = await this._signService.sign(request.arguments.value);
                                response.body = {
                                    signature: signature,
                                };
                                debugAdapter.sendResponse(response);
                            }
                            else {
                                throw new Error('no signer');
                            }
                        }
                        catch (e) {
                            response.success = false;
                            response.message = e.message;
                            debugAdapter.sendResponse(response);
                        }
                    }
                    else {
                        if (tracker && tracker.onDidSendMessage) {
                            tracker.onDidSendMessage(message);
                        }
                        // DA -> VS Code
                        try {
                            // Try to catch details for #233167
                            message = convertToVSCPaths(message, true);
                        }
                        catch (e) {
                            const type = message.type + '_' + (message.command ?? message.event ?? '');
                            this._telemetryProxy.$publicLog2('debugProtocolMessageError', { type, from: session.type });
                            throw e;
                        }
                        mythis._debugServiceProxy.$acceptDAMessage(debugAdapterHandle, message);
                    }
                });
                debugAdapter.onError((err) => {
                    if (tracker && tracker.onError) {
                        tracker.onError(err);
                    }
                    this._debugServiceProxy.$acceptDAError(debugAdapterHandle, err.name, err.message, err.stack);
                });
                debugAdapter.onExit((code) => {
                    if (tracker && tracker.onExit) {
                        tracker.onExit(code ?? undefined, undefined);
                    }
                    this._debugServiceProxy.$acceptDAExit(debugAdapterHandle, code ?? undefined, undefined);
                });
                if (tracker && tracker.onWillStartSession) {
                    tracker.onWillStartSession();
                }
                return debugAdapter.startSession();
            });
        });
    }
    $sendDAMessage(debugAdapterHandle, message) {
        // VS Code -> DA
        message = convertToDAPaths(message, false);
        const tracker = this._debugAdaptersTrackers.get(debugAdapterHandle); // TODO@AW: same handle?
        if (tracker && tracker.onWillReceiveMessage) {
            tracker.onWillReceiveMessage(message);
        }
        const da = this._debugAdapters.get(debugAdapterHandle);
        da?.sendMessage(message);
    }
    $stopDASession(debugAdapterHandle) {
        const tracker = this._debugAdaptersTrackers.get(debugAdapterHandle);
        this._debugAdaptersTrackers.delete(debugAdapterHandle);
        if (tracker && tracker.onWillStopSession) {
            tracker.onWillStopSession();
        }
        const da = this._debugAdapters.get(debugAdapterHandle);
        this._debugAdapters.delete(debugAdapterHandle);
        if (da) {
            return da.stopSession();
        }
        else {
            return Promise.resolve(void 0);
        }
    }
    $acceptBreakpointsDelta(delta) {
        const a = [];
        const r = [];
        const c = [];
        if (delta.added) {
            for (const bpd of delta.added) {
                const id = bpd.id;
                if (id && !this._breakpoints.has(id)) {
                    let bp;
                    if (bpd.type === 'function') {
                        bp = new FunctionBreakpoint(bpd.functionName, bpd.enabled, bpd.condition, bpd.hitCondition, bpd.logMessage, bpd.mode);
                    }
                    else if (bpd.type === 'data') {
                        bp = new DataBreakpoint(bpd.label, bpd.dataId, bpd.canPersist, bpd.enabled, bpd.hitCondition, bpd.condition, bpd.logMessage, bpd.mode);
                    }
                    else {
                        const uri = URI.revive(bpd.uri);
                        bp = new SourceBreakpoint(new Location(uri, new Position(bpd.line, bpd.character)), bpd.enabled, bpd.condition, bpd.hitCondition, bpd.logMessage, bpd.mode);
                    }
                    setBreakpointId(bp, id);
                    this._breakpoints.set(id, bp);
                    a.push(bp);
                }
            }
        }
        if (delta.removed) {
            for (const id of delta.removed) {
                const bp = this._breakpoints.get(id);
                if (bp) {
                    this._breakpoints.delete(id);
                    r.push(bp);
                }
            }
        }
        if (delta.changed) {
            for (const bpd of delta.changed) {
                if (bpd.id) {
                    const bp = this._breakpoints.get(bpd.id);
                    if (bp) {
                        if (bp instanceof FunctionBreakpoint && bpd.type === 'function') {
                            const fbp = bp;
                            fbp.enabled = bpd.enabled;
                            fbp.condition = bpd.condition;
                            fbp.hitCondition = bpd.hitCondition;
                            fbp.logMessage = bpd.logMessage;
                            fbp.functionName = bpd.functionName;
                        }
                        else if (bp instanceof SourceBreakpoint && bpd.type === 'source') {
                            const sbp = bp;
                            sbp.enabled = bpd.enabled;
                            sbp.condition = bpd.condition;
                            sbp.hitCondition = bpd.hitCondition;
                            sbp.logMessage = bpd.logMessage;
                            sbp.location = new Location(URI.revive(bpd.uri), new Position(bpd.line, bpd.character));
                        }
                        c.push(bp);
                    }
                }
            }
        }
        this.fireBreakpointChanges(a, r, c);
    }
    async $acceptStackFrameFocus(focusDto) {
        let focus;
        if (focusDto) {
            const session = await this.getSession(focusDto.sessionId);
            if (focusDto.kind === 'thread') {
                focus = new DebugThread(session.api, focusDto.threadId);
            }
            else {
                focus = new DebugStackFrame(session.api, focusDto.threadId, focusDto.frameId);
            }
        }
        this._activeStackItem = focus;
        this._onDidChangeActiveStackItem.fire(this._activeStackItem);
    }
    $provideDebugConfigurations(configProviderHandle, folderUri, token) {
        return asPromise(async () => {
            const provider = this.getConfigProviderByHandle(configProviderHandle);
            if (!provider) {
                throw new Error('no DebugConfigurationProvider found');
            }
            if (!provider.provideDebugConfigurations) {
                throw new Error('DebugConfigurationProvider has no method provideDebugConfigurations');
            }
            const folder = await this.getFolder(folderUri);
            return provider.provideDebugConfigurations(folder, token);
        }).then((debugConfigurations) => {
            if (!debugConfigurations) {
                throw new Error('nothing returned from DebugConfigurationProvider.provideDebugConfigurations');
            }
            return debugConfigurations;
        });
    }
    $resolveDebugConfiguration(configProviderHandle, folderUri, debugConfiguration, token) {
        return asPromise(async () => {
            const provider = this.getConfigProviderByHandle(configProviderHandle);
            if (!provider) {
                throw new Error('no DebugConfigurationProvider found');
            }
            if (!provider.resolveDebugConfiguration) {
                throw new Error('DebugConfigurationProvider has no method resolveDebugConfiguration');
            }
            const folder = await this.getFolder(folderUri);
            return provider.resolveDebugConfiguration(folder, debugConfiguration, token);
        });
    }
    $resolveDebugConfigurationWithSubstitutedVariables(configProviderHandle, folderUri, debugConfiguration, token) {
        return asPromise(async () => {
            const provider = this.getConfigProviderByHandle(configProviderHandle);
            if (!provider) {
                throw new Error('no DebugConfigurationProvider found');
            }
            if (!provider.resolveDebugConfigurationWithSubstitutedVariables) {
                throw new Error('DebugConfigurationProvider has no method resolveDebugConfigurationWithSubstitutedVariables');
            }
            const folder = await this.getFolder(folderUri);
            return provider.resolveDebugConfigurationWithSubstitutedVariables(folder, debugConfiguration, token);
        });
    }
    async $provideDebugAdapter(adapterFactoryHandle, sessionDto) {
        const adapterDescriptorFactory = this.getAdapterDescriptorFactoryByHandle(adapterFactoryHandle);
        if (!adapterDescriptorFactory) {
            return Promise.reject(new Error('no adapter descriptor factory found for handle'));
        }
        const session = await this.getSession(sessionDto);
        return this.getAdapterDescriptor(adapterDescriptorFactory, session).then((adapterDescriptor) => {
            if (!adapterDescriptor) {
                throw new Error(`Couldn't find a debug adapter descriptor for debug type '${session.type}'`);
            }
            return this.convertToDto(adapterDescriptor);
        });
    }
    async $acceptDebugSessionStarted(sessionDto) {
        const session = await this.getSession(sessionDto);
        this._onDidStartDebugSession.fire(session.api);
    }
    async $acceptDebugSessionTerminated(sessionDto) {
        const session = await this.getSession(sessionDto);
        if (session) {
            this._onDidTerminateDebugSession.fire(session.api);
            this._debugSessions.delete(session.id);
        }
    }
    async $acceptDebugSessionActiveChanged(sessionDto) {
        this._activeDebugSession = sessionDto ? await this.getSession(sessionDto) : undefined;
        this._onDidChangeActiveDebugSession.fire(this._activeDebugSession?.api);
    }
    async $acceptDebugSessionNameChanged(sessionDto, name) {
        const session = await this.getSession(sessionDto);
        session?._acceptNameChanged(name);
    }
    async $acceptDebugSessionCustomEvent(sessionDto, event) {
        const session = await this.getSession(sessionDto);
        const ee = {
            session: session.api,
            event: event.event,
            body: event.body,
        };
        this._onDidReceiveDebugSessionCustomEvent.fire(ee);
    }
    // private & dto helpers
    convertToDto(x) {
        if (x instanceof DebugAdapterExecutable) {
            return this.convertExecutableToDto(x);
        }
        else if (x instanceof DebugAdapterServer) {
            return this.convertServerToDto(x);
        }
        else if (x instanceof DebugAdapterNamedPipeServer) {
            return this.convertPipeServerToDto(x);
        }
        else if (x instanceof DebugAdapterInlineImplementation) {
            return this.convertImplementationToDto(x);
        }
        else {
            throw new Error('convertToDto unexpected type');
        }
    }
    convertExecutableToDto(x) {
        return {
            type: 'executable',
            command: x.command,
            args: x.args,
            options: x.options,
        };
    }
    convertServerToDto(x) {
        return {
            type: 'server',
            port: x.port,
            host: x.host,
        };
    }
    convertPipeServerToDto(x) {
        return {
            type: 'pipeServer',
            path: x.path,
        };
    }
    convertImplementationToDto(x) {
        return {
            type: 'implementation',
        };
    }
    getAdapterDescriptorFactoryByType(type) {
        const results = this._adapterFactories.filter((p) => p.type === type);
        if (results.length > 0) {
            return results[0].factory;
        }
        return undefined;
    }
    getAdapterDescriptorFactoryByHandle(handle) {
        const results = this._adapterFactories.filter((p) => p.handle === handle);
        if (results.length > 0) {
            return results[0].factory;
        }
        return undefined;
    }
    getConfigProviderByHandle(handle) {
        const results = this._configProviders.filter((p) => p.handle === handle);
        if (results.length > 0) {
            return results[0].provider;
        }
        return undefined;
    }
    definesDebugType(ed, type) {
        if (ed.contributes) {
            const debuggers = ed.contributes['debuggers'];
            if (debuggers && debuggers.length > 0) {
                for (const dbg of debuggers) {
                    // only debugger contributions with a "label" are considered a "defining" debugger contribution
                    if (dbg.label && dbg.type) {
                        if (dbg.type === type) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    getDebugAdapterTrackers(session) {
        const config = session.configuration;
        const type = config.type;
        const promises = this._trackerFactories
            .filter((tuple) => tuple.type === type || tuple.type === '*')
            .map((tuple) => asPromise(() => tuple.factory.createDebugAdapterTracker(session.api)).then((p) => p, (err) => null));
        return Promise.race([
            Promise.all(promises).then((result) => {
                const trackers = coalesce(result); // filter null
                if (trackers.length > 0) {
                    return new MultiTracker(trackers);
                }
                return undefined;
            }),
            new Promise((resolve) => setTimeout(() => resolve(undefined), 1000)),
        ]).catch((err) => {
            // ignore errors
            return undefined;
        });
    }
    async getAdapterDescriptor(adapterDescriptorFactory, session) {
        // a "debugServer" attribute in the launch config takes precedence
        const serverPort = session.configuration.debugServer;
        if (typeof serverPort === 'number') {
            return Promise.resolve(new DebugAdapterServer(serverPort));
        }
        if (adapterDescriptorFactory) {
            const extensionRegistry = await this._extensionService.getExtensionRegistry();
            return asPromise(() => adapterDescriptorFactory.createDebugAdapterDescriptor(session.api, this.daExecutableFromPackage(session, extensionRegistry))).then((daDescriptor) => {
                if (daDescriptor) {
                    return daDescriptor;
                }
                return undefined;
            });
        }
        // fallback: use executable information from package.json
        const extensionRegistry = await this._extensionService.getExtensionRegistry();
        return Promise.resolve(this.daExecutableFromPackage(session, extensionRegistry));
    }
    daExecutableFromPackage(session, extensionRegistry) {
        return undefined;
    }
    fireBreakpointChanges(added, removed, changed) {
        if (added.length > 0 || removed.length > 0 || changed.length > 0) {
            this._onDidChangeBreakpoints.fire(Object.freeze({
                added,
                removed,
                changed,
            }));
        }
    }
    async getSession(dto) {
        if (dto) {
            if (typeof dto === 'string') {
                const ds = this._debugSessions.get(dto);
                if (ds) {
                    return ds;
                }
            }
            else {
                let ds = this._debugSessions.get(dto.id);
                if (!ds) {
                    const folder = await this.getFolder(dto.folderUri);
                    const parent = dto.parent ? this._debugSessions.get(dto.parent) : undefined;
                    ds = new ExtHostDebugSession(this._debugServiceProxy, dto.id, dto.type, dto.name, folder, dto.configuration, parent?.api);
                    this._debugSessions.set(ds.id, ds);
                    this._debugServiceProxy.$sessionCached(ds.id);
                }
                return ds;
            }
        }
        throw new Error('cannot find session');
    }
    getFolder(_folderUri) {
        if (_folderUri) {
            const folderURI = URI.revive(_folderUri);
            return this._workspaceService.resolveWorkspaceFolder(folderURI);
        }
        return Promise.resolve(undefined);
    }
    extensionVisKey(extensionId, id) {
        return `${extensionId}\0${id}`;
    }
    serializeVisualization(extensionId, viz) {
        if (!viz) {
            return undefined;
        }
        if ('title' in viz && 'command' in viz) {
            return { type: 0 /* DebugVisualizationType.Command */ };
        }
        if ('treeId' in viz) {
            return { type: 1 /* DebugVisualizationType.Tree */, id: `${extensionId}\0${viz.treeId}` };
        }
        throw new Error('Unsupported debug visualization type');
    }
    getIconPathOrClass(icon) {
        const iconPathOrIconClass = this.getIconUris(icon);
        let iconPath;
        let iconClass;
        if ('id' in iconPathOrIconClass) {
            iconClass = ThemeIconUtils.asClassName(iconPathOrIconClass);
        }
        else {
            iconPath = iconPathOrIconClass;
        }
        return {
            iconPath,
            iconClass,
        };
    }
    getIconUris(iconPath) {
        if (iconPath instanceof ThemeIcon) {
            return { id: iconPath.id };
        }
        const dark = typeof iconPath === 'object' && 'dark' in iconPath ? iconPath.dark : iconPath;
        const light = typeof iconPath === 'object' && 'light' in iconPath ? iconPath.light : iconPath;
        return {
            dark: (typeof dark === 'string' ? URI.file(dark) : dark),
            light: (typeof light === 'string' ? URI.file(light) : light),
        };
    }
};
ExtHostDebugServiceBase = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostWorkspace),
    __param(2, IExtHostExtensionService),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostEditorTabs),
    __param(5, IExtHostVariableResolverProvider),
    __param(6, IExtHostCommands),
    __param(7, IExtHostTesting)
], ExtHostDebugServiceBase);
export { ExtHostDebugServiceBase };
export class ExtHostDebugSession {
    constructor(_debugServiceProxy, _id, _type, _name, _workspaceFolder, _configuration, _parentSession) {
        this._debugServiceProxy = _debugServiceProxy;
        this._id = _id;
        this._type = _type;
        this._name = _name;
        this._workspaceFolder = _workspaceFolder;
        this._configuration = _configuration;
        this._parentSession = _parentSession;
    }
    get api() {
        const that = this;
        return (this.apiSession ??= Object.freeze({
            id: that._id,
            type: that._type,
            get name() {
                return that._name;
            },
            set name(name) {
                that._name = name;
                that._debugServiceProxy.$setDebugSessionName(that._id, name);
            },
            parentSession: that._parentSession,
            workspaceFolder: that._workspaceFolder,
            configuration: that._configuration,
            customRequest(command, args) {
                return that._debugServiceProxy.$customDebugAdapterRequest(that._id, command, args);
            },
            getDebugProtocolBreakpoint(breakpoint) {
                return that._debugServiceProxy.$getDebugProtocolBreakpoint(that._id, breakpoint.id);
            },
        }));
    }
    get id() {
        return this._id;
    }
    get type() {
        return this._type;
    }
    _acceptNameChanged(name) {
        this._name = name;
    }
    get configuration() {
        return this._configuration;
    }
}
export class ExtHostDebugConsole {
    constructor(proxy) {
        this.value = Object.freeze({
            append(value) {
                proxy.$appendDebugConsole(value);
            },
            appendLine(value) {
                this.append(value + '\n');
            },
        });
    }
}
class MultiTracker {
    constructor(trackers) {
        this.trackers = trackers;
    }
    onWillStartSession() {
        this.trackers.forEach((t) => (t.onWillStartSession ? t.onWillStartSession() : undefined));
    }
    onWillReceiveMessage(message) {
        this.trackers.forEach((t) => t.onWillReceiveMessage ? t.onWillReceiveMessage(message) : undefined);
    }
    onDidSendMessage(message) {
        this.trackers.forEach((t) => (t.onDidSendMessage ? t.onDidSendMessage(message) : undefined));
    }
    onWillStopSession() {
        this.trackers.forEach((t) => (t.onWillStopSession ? t.onWillStopSession() : undefined));
    }
    onError(error) {
        this.trackers.forEach((t) => (t.onError ? t.onError(error) : undefined));
    }
    onExit(code, signal) {
        this.trackers.forEach((t) => (t.onExit ? t.onExit(code, signal) : undefined));
    }
}
/*
 * Call directly into a debug adapter implementation
 */
class DirectDebugAdapter extends AbstractDebugAdapter {
    constructor(implementation) {
        super();
        this.implementation = implementation;
        implementation.onDidSendMessage((message) => {
            this.acceptMessage(message);
        });
    }
    startSession() {
        return Promise.resolve(undefined);
    }
    sendMessage(message) {
        this.implementation.handleMessage(message);
    }
    stopSession() {
        this.implementation.dispose();
        return Promise.resolve(undefined);
    }
}
let WorkerExtHostDebugService = class WorkerExtHostDebugService extends ExtHostDebugServiceBase {
    constructor(extHostRpcService, workspaceService, extensionService, configurationService, editorTabs, variableResolver, commands, testing) {
        super(extHostRpcService, workspaceService, extensionService, configurationService, editorTabs, variableResolver, commands, testing);
    }
};
WorkerExtHostDebugService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostWorkspace),
    __param(2, IExtHostExtensionService),
    __param(3, IExtHostConfiguration),
    __param(4, IExtHostEditorTabs),
    __param(5, IExtHostVariableResolverProvider),
    __param(6, IExtHostCommands),
    __param(7, IExtHostTesting)
], WorkerExtHostDebugService);
export { WorkerExtHostDebugService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERlYnVnU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REZWJ1Z1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsSUFBSSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFHekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFnQnpGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLDBCQUEwQixHQUMxQixNQUFNLDBDQUEwQyxDQUFBO0FBR2pELE9BQU8sRUFTTixXQUFXLEdBR1gsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVB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