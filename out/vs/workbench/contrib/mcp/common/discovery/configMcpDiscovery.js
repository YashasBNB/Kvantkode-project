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
import { equals as arrayEquals } from '../../../../../base/common/arrays.js';
import { Throttler } from '../../../../../base/common/async.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { autorunDelta, observableValue, } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { getMcpServerMapping } from '../mcpConfigFileUtils.js';
import { IMcpConfigPathsService } from '../mcpConfigPathsService.js';
import { mcpConfigurationSection } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { McpServerDefinition } from '../mcpTypes.js';
/**
 * Discovers MCP servers based on various config sources.
 */
let ConfigMcpDiscovery = class ConfigMcpDiscovery extends Disposable {
    constructor(_configurationService, _mcpRegistry, _textModelService, _mcpConfigPathsService) {
        super();
        this._configurationService = _configurationService;
        this._mcpRegistry = _mcpRegistry;
        this._textModelService = _textModelService;
        this._mcpConfigPathsService = _mcpConfigPathsService;
        this.configSources = [];
    }
    start() {
        const throttler = this._register(new Throttler());
        const addPath = (path) => {
            this.configSources.push({
                path,
                serverDefinitions: observableValue(this, []),
                disposable: this._register(new MutableDisposable()),
                getServerToLocationMapping: (uri) => this._getServerIdMapping(uri, path.section ? [...path.section, 'servers'] : ['servers']),
            });
        };
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(mcpConfigurationSection)) {
                throttler.queue(() => this.sync());
            }
        }));
        this._register(autorunDelta(this._mcpConfigPathsService.paths, ({ lastValue, newValue }) => {
            for (const last of lastValue || []) {
                if (!newValue.includes(last)) {
                    const idx = this.configSources.findIndex((src) => src.path.id === last.id);
                    if (idx !== -1) {
                        this.configSources[idx].disposable.dispose();
                        this.configSources.splice(idx, 1);
                    }
                }
            }
            for (const next of newValue) {
                if (!lastValue || !lastValue.includes(next)) {
                    addPath(next);
                }
            }
            this.sync();
        }));
    }
    async _getServerIdMapping(resource, pathToServers) {
        const store = new DisposableStore();
        try {
            const ref = await this._textModelService.createModelReference(resource);
            store.add(ref);
            const serverIdMapping = getMcpServerMapping({
                model: ref.object.textEditorModel,
                pathToServers,
            });
            return serverIdMapping;
        }
        catch {
            return new Map();
        }
        finally {
            store.dispose();
        }
    }
    async sync() {
        const configurationKey = this._configurationService.inspect(mcpConfigurationSection);
        const configMappings = await Promise.all(this.configSources.map((src) => {
            const uri = src.path.uri;
            return uri && src.getServerToLocationMapping(uri);
        }));
        for (const [index, src] of this.configSources.entries()) {
            const collectionId = `mcp.config.${src.path.id}`;
            // inspect() will give the first workspace folder, and must be
            // asked for explicitly for other folders.
            let value = src.path.workspaceFolder
                ? this._configurationService.inspect(mcpConfigurationSection, {
                    resource: src.path.workspaceFolder.uri,
                })[src.path.key]
                : configurationKey[src.path.key];
            // If we see there are MCP servers, migrate them automatically
            if (value?.mcpServers) {
                value = {
                    ...value,
                    servers: { ...value.servers, ...value.mcpServers },
                    mcpServers: undefined,
                };
                this._configurationService.updateValue(mcpConfigurationSection, value, {}, src.path.target, { donotNotifyError: true });
            }
            const configMapping = configMappings[index];
            const nextDefinitions = Object.entries(value?.servers || {}).map(([name, value]) => ({
                id: `${collectionId}.${name}`,
                label: name,
                launch: 'type' in value && value.type === 'sse'
                    ? {
                        type: 2 /* McpServerTransportType.SSE */,
                        uri: URI.parse(value.url),
                        headers: Object.entries(value.headers || {}),
                    }
                    : {
                        type: 1 /* McpServerTransportType.Stdio */,
                        args: value.args || [],
                        command: value.command,
                        env: value.env || {},
                        envFile: value.envFile,
                        cwd: undefined,
                    },
                roots: src.path.workspaceFolder ? [src.path.workspaceFolder.uri] : [],
                variableReplacement: {
                    folder: src.path.workspaceFolder,
                    section: mcpConfigurationSection,
                    target: src.path.target,
                },
                presentation: {
                    order: src.path.order,
                    origin: configMapping?.get(name),
                },
            }));
            if (arrayEquals(nextDefinitions, src.serverDefinitions.get(), McpServerDefinition.equals)) {
                continue;
            }
            if (!nextDefinitions.length) {
                src.disposable.clear();
                src.serverDefinitions.set(nextDefinitions, undefined);
            }
            else {
                src.serverDefinitions.set(nextDefinitions, undefined);
                src.disposable.value ??= this._mcpRegistry.registerCollection({
                    id: collectionId,
                    label: src.path.label,
                    presentation: { order: src.path.order, origin: src.path.uri },
                    remoteAuthority: src.path.remoteAuthority || null,
                    serverDefinitions: src.serverDefinitions,
                    isTrustedByDefault: true,
                    scope: src.path.scope,
                });
            }
        }
    }
};
ConfigMcpDiscovery = __decorate([
    __param(0, IConfigurationService),
    __param(1, IMcpRegistry),
    __param(2, ITextModelService),
    __param(3, IMcpConfigPathsService)
], ConfigMcpDiscovery);
export { ConfigMcpDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL2Rpc2NvdmVyeS9jb25maWdNY3BEaXNjb3ZlcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDL0QsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUNOLFlBQVksRUFFWixlQUFlLEdBQ2YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFrQixzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BGLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDckQsT0FBTyxFQUFFLG1CQUFtQixFQUEwQixNQUFNLGdCQUFnQixDQUFBO0FBVTVFOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBR2pELFlBQ3dCLHFCQUE2RCxFQUN0RSxZQUEyQyxFQUN0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