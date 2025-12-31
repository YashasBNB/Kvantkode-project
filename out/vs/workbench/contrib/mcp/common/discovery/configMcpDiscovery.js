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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWNwRGlzY292ZXJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9kaXNjb3ZlcnkvY29uZmlnTWNwRGlzY292ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFDTixZQUFZLEVBRVosZUFBZSxHQUNmLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBa0Isc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxtQkFBbUIsRUFBMEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQVU1RTs7R0FFRztBQUNJLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUdqRCxZQUN3QixxQkFBNkQsRUFDdEUsWUFBMkMsRUFDdEMsaUJBQXFELEVBQ2hELHNCQUErRDtRQUV2RixLQUFLLEVBQUUsQ0FBQTtRQUxpQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQ3JELGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQ3JCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDL0IsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtRQU5oRixrQkFBYSxHQUFtQixFQUFFLENBQUE7SUFTMUMsQ0FBQztJQUVNLEtBQUs7UUFDWCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUVqRCxNQUFNLE9BQU8sR0FBRyxDQUFDLElBQW9CLEVBQUUsRUFBRTtZQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztnQkFDdkIsSUFBSTtnQkFDSixpQkFBaUIsRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDNUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUNuRCwwQkFBMEIsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQ25DLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDekYsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN6RCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtZQUMzRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDMUUsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDaEIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7d0JBQzVDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtvQkFDbEMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUVELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzdDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQztZQUVELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNaLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUNoQyxRQUFhLEVBQ2IsYUFBdUI7UUFFdkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN2RSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ2QsTUFBTSxlQUFlLEdBQUcsbUJBQW1CLENBQUM7Z0JBQzNDLEtBQUssRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWU7Z0JBQ2pDLGFBQWE7YUFDYixDQUFDLENBQUE7WUFDRixPQUFPLGVBQWUsQ0FBQTtRQUN2QixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsT0FBTyxJQUFJLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLENBQUM7Z0JBQVMsQ0FBQztZQUNWLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLE1BQU0sZ0JBQWdCLEdBQ3JCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQW9CLHVCQUF1QixDQUFDLENBQUE7UUFDL0UsTUFBTSxjQUFjLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzlCLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFBO1lBQ3hCLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNsRCxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxNQUFNLFlBQVksR0FBRyxjQUFjLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUE7WUFDaEQsOERBQThEO1lBQzlELDBDQUEwQztZQUMxQyxJQUFJLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWU7Z0JBQ25DLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFvQix1QkFBdUIsRUFBRTtvQkFDL0UsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUc7aUJBQ3RDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztnQkFDakIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFakMsOERBQThEO1lBQzlELElBQUksS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDO2dCQUN2QixLQUFLLEdBQUc7b0JBQ1AsR0FBRyxLQUFLO29CQUNSLE9BQU8sRUFBRSxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUU7b0JBQ2xELFVBQVUsRUFBRSxTQUFTO2lCQUNyQixDQUFBO2dCQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQ3JDLHVCQUF1QixFQUN2QixLQUFLLEVBQ0wsRUFBRSxFQUNGLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUNmLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLENBQzFCLENBQUE7WUFDRixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzNDLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQy9ELENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQXVCLEVBQUUsQ0FBQyxDQUFDO2dCQUN4QyxFQUFFLEVBQUUsR0FBRyxZQUFZLElBQUksSUFBSSxFQUFFO2dCQUM3QixLQUFLLEVBQUUsSUFBSTtnQkFDWCxNQUFNLEVBQ0wsTUFBTSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLEtBQUs7b0JBQ3RDLENBQUMsQ0FBQzt3QkFDQSxJQUFJLG9DQUE0Qjt3QkFDaEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQzt3QkFDekIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7cUJBQzVDO29CQUNGLENBQUMsQ0FBQzt3QkFDQSxJQUFJLHNDQUE4Qjt3QkFDbEMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksRUFBRTt3QkFDdEIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO3dCQUN0QixHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsSUFBSSxFQUFFO3dCQUNwQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87d0JBQ3RCLEdBQUcsRUFBRSxTQUFTO3FCQUNkO2dCQUNKLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDckUsbUJBQW1CLEVBQUU7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWU7b0JBQ2hDLE9BQU8sRUFBRSx1QkFBdUI7b0JBQ2hDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU07aUJBQ3ZCO2dCQUNELFlBQVksRUFBRTtvQkFDYixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLO29CQUNyQixNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUM7aUJBQ2hDO2FBQ0QsQ0FBQyxDQUNGLENBQUE7WUFFRCxJQUFJLFdBQVcsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxFQUFFLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQzNGLFNBQVE7WUFDVCxDQUFDO1lBRUQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDN0IsR0FBRyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtnQkFDdEIsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDdEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUNyRCxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDO29CQUM3RCxFQUFFLEVBQUUsWUFBWTtvQkFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztvQkFDckIsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDN0QsZUFBZSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUk7b0JBQ2pELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxpQkFBaUI7b0JBQ3hDLGtCQUFrQixFQUFFLElBQUk7b0JBQ3hCLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUs7aUJBQ3JCLENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF0S1ksa0JBQWtCO0lBSTVCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsc0JBQXNCLENBQUE7R0FQWixrQkFBa0IsQ0FzSzlCIn0=