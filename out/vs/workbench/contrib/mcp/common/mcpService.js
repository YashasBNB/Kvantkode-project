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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { equals } from '../../../../base/common/objects.js';
import { autorun, observableValue, transaction, } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ILanguageModelToolsService, } from '../../chat/common/languageModelToolsService.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpServer, McpServerMetadataCache } from './mcpServer.js';
import { McpServerDefinition, } from './mcpTypes.js';
let McpService = class McpService extends Disposable {
    get lazyCollectionState() {
        return this._mcpRegistry.lazyCollectionState;
    }
    constructor(_instantiationService, _mcpRegistry, _toolsService, _logService) {
        super();
        this._instantiationService = _instantiationService;
        this._mcpRegistry = _mcpRegistry;
        this._toolsService = _toolsService;
        this._logService = _logService;
        this._servers = observableValue(this, []);
        this.servers = this._servers.map((servers) => servers.map((s) => s.object));
        this.userCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 0 /* StorageScope.PROFILE */));
        this.workspaceCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 1 /* StorageScope.WORKSPACE */));
        const updateThrottle = this._store.add(new RunOnceScheduler(() => this._updateCollectedServers(), 500));
        // Throttle changes so that if a collection is changed, or a server is
        // unregistered/registered, we don't stop servers unnecessarily.
        this._register(autorun((reader) => {
            for (const collection of this._mcpRegistry.collections.read(reader)) {
                collection.serverDefinitions.read(reader);
            }
            updateThrottle.schedule(500);
        }));
    }
    resetCaches() {
        this.userCache.reset();
        this.workspaceCache.reset();
    }
    async activateCollections() {
        const collections = await this._mcpRegistry.discoverCollections();
        const collectionIds = new Set(collections.map((c) => c.id));
        this._updateCollectedServers();
        // Discover any newly-collected servers with unknown tools
        const todo = [];
        for (const { object: server } of this._servers.get()) {
            if (collectionIds.has(server.collection.id)) {
                const state = server.toolsState.get();
                if (state === 0 /* McpServerToolsState.Unknown */) {
                    todo.push(server.start());
                }
            }
        }
        await Promise.all(todo);
    }
    _syncTools(server, store) {
        const tools = new Map();
        store.add(autorun((reader) => {
            const toDelete = new Set(tools.keys());
            for (const tool of server.tools.read(reader)) {
                const existing = tools.get(tool.id);
                const collection = this._mcpRegistry.collections
                    .get()
                    .find((c) => c.id === server.collection.id);
                const toolData = {
                    id: tool.id,
                    source: {
                        type: 'mcp',
                        collectionId: server.collection.id,
                        definitionId: server.definition.id,
                    },
                    icon: Codicon.tools,
                    displayName: tool.definition.name,
                    toolReferenceName: tool.definition.name,
                    modelDescription: tool.definition.description ?? '',
                    userDescription: tool.definition.description ?? '',
                    inputSchema: tool.definition.inputSchema,
                    canBeReferencedInPrompt: true,
                    supportsToolPicker: true,
                    runsInWorkspace: collection?.scope === 1 /* StorageScope.WORKSPACE */ || !!collection?.remoteAuthority,
                    tags: ['mcp'],
                };
                if (existing) {
                    if (!equals(existing.toolData, toolData)) {
                        existing.toolData = toolData;
                        existing.toolDispose.dispose();
                        existing.toolDispose = this._toolsService.registerToolData(toolData);
                    }
                    toDelete.delete(tool.id);
                }
                else {
                    tools.set(tool.id, {
                        toolData,
                        toolDispose: this._toolsService.registerToolData(toolData),
                        implDispose: this._toolsService.registerToolImplementation(tool.id, this._instantiationService.createInstance(McpToolImplementation, tool, server)),
                    });
                }
            }
            for (const id of toDelete) {
                const tool = tools.get(id);
                if (tool) {
                    tool.toolDispose.dispose();
                    tool.implDispose.dispose();
                    tools.delete(id);
                }
            }
        }));
        store.add(toDisposable(() => {
            for (const tool of tools.values()) {
                tool.toolDispose.dispose();
                tool.implDispose.dispose();
            }
        }));
    }
    _updateCollectedServers() {
        const definitions = this._mcpRegistry.collections.get().flatMap((collectionDefinition) => collectionDefinition.serverDefinitions.get().map((serverDefinition) => ({
            serverDefinition,
            collectionDefinition,
        })));
        const nextDefinitions = new Set(definitions);
        const currentServers = this._servers.get();
        const nextServers = [];
        const pushMatch = (match, rec) => {
            nextDefinitions.delete(match);
            nextServers.push(rec);
            const connection = rec.object.connection.get();
            // if the definition was modified, stop the server; it'll be restarted again on-demand
            if (connection &&
                !McpServerDefinition.equals(connection.definition, match.serverDefinition)) {
                rec.object.stop();
                this._logService.debug(`MCP server ${rec.object.definition.id} stopped because the definition changed`);
            }
        };
        // Transfer over any servers that are still valid.
        for (const server of currentServers) {
            const match = definitions.find((d) => defsEqual(server.object, d));
            if (match) {
                pushMatch(match, server);
            }
            else {
                server.dispose();
            }
        }
        // Create any new servers that are needed.
        for (const def of nextDefinitions) {
            const store = new DisposableStore();
            const object = this._instantiationService.createInstance(McpServer, def.collectionDefinition, def.serverDefinition, def.serverDefinition.roots, !!def.collectionDefinition.lazy, def.collectionDefinition.scope === 1 /* StorageScope.WORKSPACE */
                ? this.workspaceCache
                : this.userCache);
            store.add(object);
            this._syncTools(object, store);
            nextServers.push({ object, dispose: () => store.dispose() });
        }
        transaction((tx) => {
            this._servers.set(nextServers, tx);
        });
    }
    dispose() {
        this._servers.get().forEach((s) => s.dispose());
        super.dispose();
    }
};
McpService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMcpRegistry),
    __param(2, ILanguageModelToolsService),
    __param(3, ILogService)
], McpService);
export { McpService };
function defsEqual(server, def) {
    return (server.collection.id === def.collectionDefinition.id &&
        server.definition.id === def.serverDefinition.id);
}
let McpToolImplementation = class McpToolImplementation {
    constructor(_tool, _server, _productService) {
        this._tool = _tool;
        this._server = _server;
        this._productService = _productService;
    }
    async prepareToolInvocation(parameters) {
        const tool = this._tool;
        const server = this._server;
        const mcpToolWarning = localize('mcp.tool.warning', "{0} This tool is from \'{1}\' (MCP Server). Note that MCP servers or malicious conversation content may attempt to misuse '{2}' through tools. Please carefully review any requested actions.", '$(info)', server.definition.label, this._productService.nameShort);
        return {
            confirmationMessages: {
                title: localize('msg.title', 'Run `{0}`', tool.definition.name, server.definition.label),
                message: new MarkdownString(localize('msg.msg', '{0}\n\n {1}', tool.definition.description, mcpToolWarning), { supportThemeIcons: true }),
                allowAutoConfirm: true,
            },
            invocationMessage: new MarkdownString(localize('msg.run', 'Running `{0}`', tool.definition.name, server.definition.label)),
            pastTenseMessage: new MarkdownString(localize('msg.ran', 'Ran `{0}` ', tool.definition.name, server.definition.label)),
            toolSpecificData: {
                kind: 'input',
                rawInput: parameters,
            },
        };
    }
    async invoke(invocation, _countTokens, token) {
        const result = {
            content: [],
        };
        const outputParts = [];
        const callResult = await this._tool.call(invocation.parameters, token);
        for (const item of callResult.content) {
            if (item.type === 'text') {
                result.content.push({
                    kind: 'text',
                    value: item.text,
                });
                outputParts.push(item.text);
            }
            else {
                // TODO@jrieken handle different item types
            }
        }
        result.toolResultDetails = {
            input: JSON.stringify(invocation.parameters, undefined, 2),
            output: outputParts.join('\n'),
        };
        return result;
    }
};
McpToolImplementation = __decorate([
    __param(2, IProductService)
], McpToolImplementation);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUdmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sT0FBTyxFQUVQLGVBQWUsRUFDZixXQUFXLEdBQ1gsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUV2RixPQUFPLEVBRU4sMEJBQTBCLEdBTTFCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNsRSxPQUFPLEVBS04sbUJBQW1CLEdBRW5CLE1BQU0sZUFBZSxDQUFBO0FBVWYsSUFBTSxVQUFVLEdBQWhCLE1BQU0sVUFBVyxTQUFR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