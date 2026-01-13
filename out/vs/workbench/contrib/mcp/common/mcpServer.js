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
import { raceCancellationError, Sequencer } from '../../../../base/common/async.js';
import * as json from '../../../../base/common/json.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { autorun, autorunWithStore, derived, disposableObservableValue, observableFromEvent, ObservablePromise, observableValue, transaction, } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { mcpActivationEvent } from './mcpConfiguration.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { extensionMcpCollectionPrefix, McpConnectionFailedError, McpConnectionState, } from './mcpTypes.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
const toolInvalidCharRe = /[^a-z0-9_-]/gi;
let McpServerMetadataCache = class McpServerMetadataCache extends Disposable {
    constructor(scope, storageService) {
        super();
        this.didChange = false;
        this.cache = new LRUCache(128);
        this.extensionServers = new Map();
        const storageKey = 'mcpToolCache';
        this._register(storageService.onWillSaveState(() => {
            if (this.didChange) {
                storageService.store(storageKey, {
                    extensionServers: [...this.extensionServers],
                    serverTools: this.cache.toJSON(),
                }, scope, 1 /* StorageTarget.MACHINE */);
                this.didChange = false;
            }
        }));
        try {
            const cached = storageService.getObject(storageKey, scope);
            this.extensionServers = new Map(cached?.extensionServers ?? []);
            cached?.serverTools?.forEach(([k, v]) => this.cache.set(k, v));
        }
        catch {
            // ignored
        }
    }
    /** Resets the cache for tools and extension servers */
    reset() {
        this.cache.clear();
        this.extensionServers.clear();
        this.didChange = true;
    }
    /** Gets cached tools for a server (used before a server is running) */
    getTools(definitionId) {
        return this.cache.get(definitionId)?.tools;
    }
    /** Sets cached tools for a server */
    storeTools(definitionId, tools) {
        this.cache.set(definitionId, { ...this.cache.get(definitionId), tools });
        this.didChange = true;
    }
    /** Gets cached servers for a collection (used for extensions, before the extension activates) */
    getServers(collectionId) {
        return this.extensionServers.get(collectionId);
    }
    /** Sets cached servers for a collection */
    storeServers(collectionId, entry) {
        if (entry) {
            this.extensionServers.set(collectionId, entry);
        }
        else {
            this.extensionServers.delete(collectionId);
        }
        this.didChange = true;
    }
};
McpServerMetadataCache = __decorate([
    __param(1, IStorageService)
], McpServerMetadataCache);
export { McpServerMetadataCache };
let McpServer = class McpServer extends Disposable {
    get toolsFromCache() {
        return this._toolCache.getTools(this.definition.id);
    }
    get trusted() {
        return this._mcpRegistry.getTrust(this.collection);
    }
    constructor(collection, definition, explicitRoots, _requiresExtensionActivation, _toolCache, _mcpRegistry, workspacesService, _extensionService, _loggerService, _outputService, _telemetryService, _commandService, _instantiationService) {
        super();
        this.collection = collection;
        this.definition = definition;
        this._requiresExtensionActivation = _requiresExtensionActivation;
        this._toolCache = _toolCache;
        this._mcpRegistry = _mcpRegistry;
        this._extensionService = _extensionService;
        this._loggerService = _loggerService;
        this._outputService = _outputService;
        this._telemetryService = _telemetryService;
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._connectionSequencer = new Sequencer();
        this._connection = this._register(disposableObservableValue(this, undefined));
        this.connection = this._connection;
        this.connectionState = derived((reader) => this._connection.read(reader)?.state.read(reader) ?? {
            state: 0 /* McpConnectionState.Kind.Stopped */,
        });
        this.toolsFromServerPromise = observableValue(this, undefined);
        this.toolsFromServer = derived((reader) => this.toolsFromServerPromise.read(reader)?.promiseResult.read(reader)?.data);
        this.toolsState = derived((reader) => {
            const fromServer = this.toolsFromServerPromise.read(reader);
            const connectionState = this.connectionState.read(reader);
            const isIdle = McpConnectionState.canBeStarted(connectionState.state) && !fromServer;
            if (isIdle) {
                return this.toolsFromCache ? 1 /* McpServerToolsState.Cached */ : 0 /* McpServerToolsState.Unknown */;
            }
            const fromServerResult = fromServer?.promiseResult.read(reader);
            if (!fromServerResult) {
                return this.toolsFromCache
                    ? 3 /* McpServerToolsState.RefreshingFromCached */
                    : 2 /* McpServerToolsState.RefreshingFromUnknown */;
            }
            return fromServerResult.error
                ? this.toolsFromCache
                    ? 1 /* McpServerToolsState.Cached */
                    : 0 /* McpServerToolsState.Unknown */
                : 4 /* McpServerToolsState.Live */;
        });
        this._loggerId = `mcpServer.${definition.id}`;
        this._logger = this._register(_loggerService.createLogger(this._loggerId, {
            hidden: true,
            name: `MCP: ${definition.label}`,
        }));
        // If the logger is disposed but not deregistered, then the disposed instance
        // is reused and no-ops. todo@sandy081 this seems like a bug.
        this._register(toDisposable(() => _loggerService.deregisterLogger(this._loggerId)));
        // 1. Reflect workspaces into the MCP roots
        const workspaces = explicitRoots
            ? observableValue(this, explicitRoots.map((uri) => ({ uri, name: basename(uri) })))
            : observableFromEvent(this, workspacesService.onDidChangeWorkspaceFolders, () => workspacesService.getWorkspace().folders);
        this._register(autorunWithStore((reader) => {
            const cnx = this._connection.read(reader)?.handler.read(reader);
            if (!cnx) {
                return;
            }
            cnx.roots = workspaces.read(reader).map((wf) => ({
                uri: wf.uri.toString(),
                name: wf.name,
            }));
        }));
        // 2. Populate this.tools when we connect to a server.
        this._register(autorunWithStore((reader, store) => {
            const cnx = this._connection.read(reader)?.handler.read(reader);
            if (cnx) {
                this.populateLiveData(cnx, store);
            }
            else {
                this.resetLiveData();
            }
        }));
        // 3. Update the cache when tools update
        this._register(autorun((reader) => {
            const tools = this.toolsFromServer.read(reader);
            if (tools) {
                this._toolCache.storeTools(definition.id, tools);
            }
        }));
        // 4. Publish tools
        const toolPrefix = this._mcpRegistry.collectionToolPrefix(this.collection);
        this.tools = derived((reader) => {
            const serverTools = this.toolsFromServer.read(reader);
            const definitions = serverTools ?? this.toolsFromCache ?? [];
            const prefix = toolPrefix.read(reader);
            return definitions.map((def) => new McpTool(this, prefix, def));
        });
    }
    showOutput() {
        this._loggerService.setVisibility(this._loggerId, true);
        this._outputService.showChannel(this._loggerId);
    }
    start(isFromInteraction) {
        return this._connectionSequencer.queue(async () => {
            const activationEvent = mcpActivationEvent(this.collection.id.slice(extensionMcpCollectionPrefix.length));
            if (this._requiresExtensionActivation &&
                !this._extensionService.activationEventIsDone(activationEvent)) {
                await this._extensionService.activateByEvent(activationEvent);
                await Promise.all(this._mcpRegistry.delegates.map((r) => r.waitForInitialProviderPromises()));
                // This can happen if the server was created from a cached MCP server seen
                // from an extension, but then it wasn't registered when the extension activated.
                if (this._store.isDisposed) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
            }
            let connection = this._connection.get();
            if (connection && McpConnectionState.canBeStarted(connection.state.get().state)) {
                connection.dispose();
                connection = undefined;
                this._connection.set(connection, undefined);
            }
            if (!connection) {
                connection = await this._mcpRegistry.resolveConnection({
                    logger: this._logger,
                    collectionRef: this.collection,
                    definitionRef: this.definition,
                    forceTrust: isFromInteraction,
                });
                if (!connection) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                if (this._store.isDisposed) {
                    connection.dispose();
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                this._connection.set(connection, undefined);
            }
            const start = Date.now();
            const state = await connection.start();
            this._telemetryService.publicLog2('mcp/serverBootState', {
                state: McpConnectionState.toKindString(state.state),
                time: Date.now() - start,
            });
            return state;
        });
    }
    stop() {
        return this._connection.get()?.stop() || Promise.resolve();
    }
    resetLiveData() {
        transaction((tx) => {
            this.toolsFromServerPromise.set(undefined, tx);
        });
    }
    async _normalizeTool(originalTool) {
        const tool = { ...originalTool, serverToolName: originalTool.name };
        if (!tool.description) {
            // Ensure a description is provided for each tool, #243919
            this._logger.warn(`Tool ${tool.name} does not have a description. Tools must be accurately described to be called`);
            tool.description = '<empty>';
        }
        if (toolInvalidCharRe.test(tool.name)) {
            this._logger.warn(`Tool ${JSON.stringify(tool.name)} is invalid. Tools names may only contain [a-z0-9_-]`);
            tool.name = tool.name.replace(toolInvalidCharRe, '_');
        }
        let diagnostics = [];
        const toolJson = JSON.stringify(tool.inputSchema);
        try {
            const schemaUri = URI.parse('https://json-schema.org/draft-07/schema');
            diagnostics =
                (await this._commandService.executeCommand('json.validate', schemaUri, toolJson)) || [];
        }
        catch (e) {
            // ignored (error in json extension?);
        }
        if (!diagnostics.length) {
            return tool;
        }
        // because it's all one line from JSON.stringify, we can treat characters as offsets.
        const tree = json.parseTree(toolJson);
        const messages = diagnostics.map((d) => {
            const node = json.findNodeAtOffset(tree, d.range[0].character);
            const path = node && `/${json.getNodePath(node).join('/')}`;
            return d.message + (path ? ` (at ${path})` : '');
        });
        return { error: messages };
    }
    async _getValidatedTools(handler, tools) {
        let error = '';
        const validations = await Promise.all(tools.map((t) => this._normalizeTool(t)));
        const validated = [];
        for (const [i, result] of validations.entries()) {
            if ('error' in result) {
                error +=
                    localize('mcpBadSchema.tool', 'Tool `{0}` has invalid JSON parameters:', tools[i].name) +
                        '\n';
                for (const message of result.error) {
                    error += `\t- ${message}\n`;
                }
                error += `\t- Schema: ${JSON.stringify(tools[i].inputSchema)}\n\n`;
            }
            else {
                validated.push(result);
            }
        }
        if (error) {
            handler.logger.warn(`${tools.length - validated.length} tools have invalid JSON schemas and will be omitted`);
            warnInvalidTools(this._instantiationService, this.definition.label, error);
        }
        return validated;
    }
    populateLiveData(handler, store) {
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        // todo: add more than just tools here
        const updateTools = (tx) => {
            const toolPromise = handler.capabilities.tools
                ? handler.listTools({}, cts.token)
                : Promise.resolve([]);
            const toolPromiseSafe = toolPromise.then(async (tools) => {
                handler.logger.info(`Discovered ${tools.length} tools`);
                return this._getValidatedTools(handler, tools);
            });
            this.toolsFromServerPromise.set(new ObservablePromise(toolPromiseSafe), tx);
            return [toolPromise];
        };
        store.add(handler.onDidChangeToolList(() => {
            handler.logger.info('Tool list changed, refreshing tools...');
            updateTools(undefined);
        }));
        let promises;
        transaction((tx) => {
            promises = updateTools(tx);
        });
        Promise.all(promises).then(([tools]) => {
            this._telemetryService.publicLog2('mcp/serverBoot', {
                supportsLogging: !!handler.capabilities.logging,
                supportsPrompts: !!handler.capabilities.prompts,
                supportsResources: !!handler.capabilities.resources,
                toolCount: tools.length,
            });
        });
    }
    /**
     * Helper function to call the function on the handler once it's online. The
     * connection started if it is not already.
     */
    async callOn(fn, token = CancellationToken.None) {
        await this.start(); // idempotent
        let ranOnce = false;
        let d;
        const callPromise = new Promise((resolve, reject) => {
            d = autorun((reader) => {
                const connection = this._connection.read(reader);
                if (!connection || ranOnce) {
                    return;
                }
                const handler = connection.handler.read(reader);
                if (!handler) {
                    const state = connection.state.read(reader);
                    if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                        reject(new McpConnectionFailedError(`MCP server could not be started: ${state.message}`));
                        return;
                    }
                    else if (state.state === 0 /* McpConnectionState.Kind.Stopped */) {
                        reject(new McpConnectionFailedError('MCP server has stopped'));
                        return;
                    }
                    else {
                        // keep waiting for handler
                        return;
                    }
                }
                resolve(fn(handler));
                ranOnce = true; // aggressive prevent multiple racey calls, don't dispose because autorun is sync
            });
        });
        return raceCancellationError(callPromise, token).finally(() => d.dispose());
    }
};
McpServer = __decorate([
    __param(5, IMcpRegistry),
    __param(6, IWorkspaceContextService),
    __param(7, IExtensionService),
    __param(8, ILoggerService),
    __param(9, IOutputService),
    __param(10, ITelemetryService),
    __param(11, ICommandService),
    __param(12, IInstantiationService)
], McpServer);
export { McpServer };
export class McpTool {
    get definition() {
        return this._definition;
    }
    constructor(_server, idPrefix, _definition) {
        this._server = _server;
        this._definition = _definition;
        this.id = (idPrefix + _definition.name).replaceAll('.', '_');
    }
    call(params, token) {
        // serverToolName is always set now, but older cache entries (from 1.99-Insiders) may not have it.
        const name = this._definition.serverToolName ?? this._definition.name;
        return this._server.callOn((h) => h.callTool({ name, arguments: params }), token);
    }
}
function warnInvalidTools(instaService, serverName, errorText) {
    instaService.invokeFunction((accessor) => {
        const notificationService = accessor.get(INotificationService);
        const editorService = accessor.get(IEditorService);
        notificationService.notify({
            severity: Severity.Warning,
            message: localize('mcpBadSchema', 'MCP server `{0}` has tools with invalid parameters which will be omitted.', serverName),
            actions: {
                primary: [
                    {
                        class: undefined,
                        enabled: true,
                        id: 'mcpBadSchema.show',
                        tooltip: '',
                        label: localize('mcpBadSchema.show', 'Show'),
                        run: () => {
                            editorService.openEditor({
                                resource: undefined,
                                contents: errorText,
                            });
                        },
                    },
                ],
            },
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkYsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sVUFBVSxFQUdWLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sT0FBTyxFQUNQLGdCQUFnQixFQUNoQixPQUFPLEVBQ1AseUJBQXlCLEVBR3pCLG1CQUFtQixFQUNuQixpQkFBaUIsRUFDakIsZUFBZSxFQUNmLFdBQVcsR0FDWCxNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBVyxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7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