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
import { computeLevenshteinDistance } from '../../../../base/common/diff/diff.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { markdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { findNodeAtLocation, parseTree } from '../../../../base/common/json.js';
import { Disposable, DisposableStore, dispose, MutableDisposable, } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../nls.js';
import { IMarkerService, MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression, } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IMcpConfigPathsService } from '../common/mcpConfigPathsService.js';
import { mcpConfigurationSection } from '../common/mcpConfiguration.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpService } from '../common/mcpTypes.js';
import { EditStoredInput, RemoveStoredInput, RestartServer, ShowOutput, StartServer, StopServer, } from './mcpCommands.js';
const diagnosticOwner = 'vscode.mcp';
let McpLanguageFeatures = class McpLanguageFeatures extends Disposable {
    constructor(languageFeaturesService, _mcpRegistry, _mcpConfigPathsService, _mcpService, _markerService, _configurationResolverService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._mcpConfigPathsService = _mcpConfigPathsService;
        this._mcpService = _mcpService;
        this._markerService = _markerService;
        this._configurationResolverService = _configurationResolverService;
        this._cachedMcpSection = this._register(new MutableDisposable());
        const patterns = [
            { pattern: '**/.vscode/mcp.json' },
            { pattern: '**/settings.json' },
            { pattern: '**/workspace.json' },
        ];
        const onDidChangeCodeLens = this._register(new Emitter());
        const codeLensProvider = {
            onDidChange: onDidChangeCodeLens.event,
            provideCodeLenses: (model, range) => this._provideCodeLenses(model, () => onDidChangeCodeLens.fire(codeLensProvider)),
        };
        this._register(languageFeaturesService.codeLensProvider.register(patterns, codeLensProvider));
        this._register(languageFeaturesService.inlayHintsProvider.register(patterns, {
            onDidChangeInlayHints: _mcpRegistry.onDidChangeInputs,
            provideInlayHints: (model, range) => this._provideInlayHints(model, range),
        }));
    }
    /** Simple mechanism to avoid extra json parsing for hints+lenses */
    _parseModel(model) {
        if (this._cachedMcpSection.value?.model === model) {
            return this._cachedMcpSection.value;
        }
        const uri = model.uri;
        const inConfig = this._mcpConfigPathsService.paths.get().find((u) => isEqual(u.uri, uri));
        if (!inConfig) {
            return undefined;
        }
        const value = model.getValue();
        const tree = parseTree(value);
        const listeners = [
            model.onDidChangeContent(() => this._cachedMcpSection.clear()),
            model.onWillDispose(() => this._cachedMcpSection.clear()),
        ];
        this._addDiagnostics(model, value, tree, inConfig);
        return (this._cachedMcpSection.value = {
            model,
            tree,
            inConfig,
            dispose: () => {
                this._markerService.remove(diagnosticOwner, [uri]);
                dispose(listeners);
            },
        });
    }
    _addDiagnostics(tm, value, tree, inConfig) {
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return;
        }
        const getClosestMatchingVariable = (name) => {
            let bestValue = '';
            let bestDistance = Infinity;
            for (const variable of this._configurationResolverService.resolvableVariables) {
                const distance = computeLevenshteinDistance(name, variable);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestValue = variable;
                }
            }
            return bestValue;
        };
        const diagnostics = [];
        forEachPropertyWithReplacement(serversNode, (node) => {
            const expr = ConfigurationResolverExpression.parse(node.value);
            for (const { id, name, arg } of expr.unresolved()) {
                if (!this._configurationResolverService.resolvableVariables.has(name)) {
                    const position = value.indexOf(id, node.offset);
                    if (position === -1) {
                        continue;
                    } // unreachable?
                    const start = tm.getPositionAt(position);
                    const end = tm.getPositionAt(position + id.length);
                    diagnostics.push({
                        severity: MarkerSeverity.Warning,
                        message: localize('mcp.variableNotFound', 'Variable `{0}` not found, did you mean ${{1}}?', name, getClosestMatchingVariable(name) + (arg ? `:${arg}` : '')),
                        startLineNumber: start.lineNumber,
                        startColumn: start.column,
                        endLineNumber: end.lineNumber,
                        endColumn: end.column,
                        modelVersionId: tm.getVersionId(),
                    });
                }
            }
        });
        if (diagnostics.length) {
            this._markerService.changeOne(diagnosticOwner, tm.uri, diagnostics);
        }
        else {
            this._markerService.remove(diagnosticOwner, [tm.uri]);
        }
    }
    _provideCodeLenses(model, onDidChangeCodeLens) {
        const parsed = this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const serversNode = findNodeAtLocation(tree, inConfig.section ? [...inConfig.section, 'servers'] : ['servers']);
        if (!serversNode) {
            return undefined;
        }
        const store = new DisposableStore();
        const lenses = { lenses: [], dispose: () => store.dispose() };
        const read = (observable) => {
            store.add(Event.fromObservableLight(observable)(onDidChangeCodeLens));
            return observable.get();
        };
        const collection = read(this._mcpRegistry.collections).find((c) => isEqual(c.presentation?.origin, model.uri));
        if (!collection) {
            return lenses;
        }
        const mcpServers = read(this._mcpService.servers).filter((s) => s.collection.id === collection.id);
        for (const node of serversNode.children || []) {
            if (node.type !== 'property' || node.children?.[0]?.type !== 'string') {
                continue;
            }
            const name = node.children[0].value;
            const server = mcpServers.find((s) => s.definition.label === name);
            if (!server) {
                continue;
            }
            const range = Range.fromPositions(model.getPositionAt(node.children[0].offset));
            switch (read(server.connectionState).state) {
                case 3 /* McpConnectionState.Kind.Error */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: ShowOutput.ID,
                            title: '$(error) ' + localize('server.error', 'Error'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: RestartServer.ID,
                            title: localize('mcp.restart', 'Restart'),
                            arguments: [server.definition.id],
                        },
                    });
                    break;
                case 1 /* McpConnectionState.Kind.Starting */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: ShowOutput.ID,
                            title: '$(loading~spin) ' + localize('server.starting', 'Starting'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: StopServer.ID,
                            title: localize('cancel', 'Cancel'),
                            arguments: [server.definition.id],
                        },
                    });
                    break;
                case 2 /* McpConnectionState.Kind.Running */:
                    lenses.lenses.push({
                        range,
                        command: {
                            id: ShowOutput.ID,
                            title: '$(check) ' + localize('server.running', 'Running'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: StopServer.ID,
                            title: localize('mcp.stop', 'Stop'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: RestartServer.ID,
                            title: localize('mcp.restart', 'Restart'),
                            arguments: [server.definition.id],
                        },
                    }, {
                        range,
                        command: {
                            id: '',
                            title: localize('server.toolCount', '{0} tools', read(server.tools).length),
                        },
                    });
                    break;
                case 0 /* McpConnectionState.Kind.Stopped */: {
                    lenses.lenses.push({
                        range,
                        command: {
                            id: StartServer.ID,
                            title: '$(debug-start) ' + localize('mcp.start', 'Start'),
                            arguments: [server.definition.id],
                        },
                    });
                    const toolCount = read(server.tools).length;
                    if (toolCount) {
                        lenses.lenses.push({
                            range,
                            command: {
                                id: '',
                                title: localize('server.toolCountCached', '{0} cached tools', toolCount),
                            },
                        });
                    }
                }
            }
        }
        return lenses;
    }
    async _provideInlayHints(model, range) {
        const parsed = this._parseModel(model);
        if (!parsed) {
            return undefined;
        }
        const { tree, inConfig } = parsed;
        const mcpSection = inConfig.section ? findNodeAtLocation(tree, [...inConfig.section]) : tree;
        if (!mcpSection) {
            return undefined;
        }
        const inputsNode = findNodeAtLocation(mcpSection, ['inputs']);
        if (!inputsNode) {
            return undefined;
        }
        const inputs = await this._mcpRegistry.getSavedInputs(inConfig.scope);
        const hints = [];
        const serversNode = findNodeAtLocation(mcpSection, ['servers']);
        if (serversNode) {
            annotateServers(serversNode);
        }
        annotateInputs(inputsNode);
        return { hints, dispose: () => { } };
        function annotateServers(servers) {
            forEachPropertyWithReplacement(servers, (node) => {
                const expr = ConfigurationResolverExpression.parse(node.value);
                for (const { id } of expr.unresolved()) {
                    const saved = inputs[id];
                    if (saved) {
                        pushAnnotation(id, node.offset + node.value.indexOf(id) + id.length, saved);
                    }
                }
            });
        }
        function annotateInputs(node) {
            if (node.type !== 'array' || !node.children) {
                return;
            }
            for (const input of node.children) {
                if (input.type !== 'object' || !input.children) {
                    continue;
                }
                const idProp = input.children.find((c) => c.type === 'property' && c.children?.[0].value === 'id');
                if (!idProp) {
                    continue;
                }
                const id = idProp.children[1];
                if (!id || id.type !== 'string' || !id.value) {
                    continue;
                }
                const savedId = '${input:' + id.value + '}';
                const saved = inputs[savedId];
                if (saved) {
                    pushAnnotation(savedId, id.offset + 1 + id.length, saved);
                }
            }
        }
        function pushAnnotation(savedId, offset, saved) {
            const tooltip = new MarkdownString([
                markdownCommandLink({
                    id: EditStoredInput.ID,
                    title: localize('edit', 'Edit'),
                    arguments: [savedId, model.uri, mcpConfigurationSection, inConfig.target],
                }),
                markdownCommandLink({
                    id: RemoveStoredInput.ID,
                    title: localize('clear', 'Clear'),
                    arguments: [inConfig.scope, savedId],
                }),
                markdownCommandLink({
                    id: RemoveStoredInput.ID,
                    title: localize('clearAll', 'Clear All'),
                    arguments: [inConfig.scope],
                }),
            ].join(' | '), { isTrusted: true });
            const hint = {
                label: '= ' +
                    (saved.input?.type === 'promptString' && saved.input.password
                        ? '*'.repeat(10)
                        : saved.value || ''),
                position: model.getPositionAt(offset),
                tooltip,
                paddingLeft: true,
            };
            hints.push(hint);
            return hint;
        }
    }
};
McpLanguageFeatures = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IMcpRegistry),
    __param(2, IMcpConfigPathsService),
    __param(3, IMcpService),
    __param(4, IMarkerService),
    __param(5, IConfigurationResolverService)
], McpLanguageFeatures);
export { McpLanguageFeatures };
function forEachPropertyWithReplacement(node, callback) {
    if (node.type === 'string' &&
        typeof node.value === 'string' &&
        node.value.includes(ConfigurationResolverExpression.VARIABLE_LHS)) {
        callback(node);
    }
    else if (node.type === 'property') {
        // skip the property name
        node.children?.slice(1).forEach((n) => forEachPropertyWithReplacement(n, callback));
    }
    else {
        node.children?.forEach((n) => forEachPropertyWithReplacement(n, callback));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTGFuZ3VhZ2VGZWF0dXJlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcExhbmd1YWdlRmVhdHVyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFRLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3JGLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sRUFFUCxpQkFBaUIsR0FDakIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBUS9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4sY0FBYyxFQUNkLGNBQWMsR0FDZCxNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ3ZILE9BQU8sRUFDTiwrQkFBK0IsR0FFL0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUMxRixPQUFPLEVBQWtCLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1B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QUFRO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLCtCQUErQixDQUFDLFlBQVksQ0FBQyxFQUNoRSxDQUFDO1FBQ0YsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2YsQ0FBQztTQUFNLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUNyQyx5QkFBeUI7UUFDekIsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUNwRixDQUFDO1NBQU0sQ0FBQztRQUNQLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0FBQ0YsQ0FBQyJ9