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
import { importAMDNodeModule } from '../../../amdX.js';
import { DeferredPromise, Sequencer } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Lazy } from '../../../base/common/lazy.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { ExtensionIdentifier, } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { extensionPrefixedIdentifier, McpServerLaunch, } from '../../contrib/mcp/common/mcpTypes.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { LogLevel } from '../../../platform/log/common/log.js';
export const IExtHostMpcService = createDecorator('IExtHostMpcService');
let ExtHostMcpService = class ExtHostMcpService extends Disposable {
    constructor(extHostRpc) {
        super();
        this._initialProviderPromises = new Set();
        this._sseEventSources = this._register(new DisposableMap());
        this._eventSource = new Lazy(async () => {
            const es = await importAMDNodeModule('@c4312/eventsource-umd', 'dist/index.umd.js');
            return es.EventSource;
        });
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadMcp);
    }
    $startMcp(id, launch) {
        this._startMcp(id, McpServerLaunch.fromSerialized(launch));
    }
    _startMcp(id, launch) {
        if (launch.type === 2 /* McpServerTransportType.SSE */) {
            this._sseEventSources.set(id, new McpSSEHandle(this._eventSource.value, id, launch, this._proxy));
            return;
        }
        throw new Error('not implemented');
    }
    $stopMcp(id) {
        if (this._sseEventSources.has(id)) {
            this._sseEventSources.deleteAndDispose(id);
            this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
        }
    }
    $sendMessage(id, message) {
        this._sseEventSources.get(id)?.send(message);
    }
    async $waitForInitialCollectionProviders() {
        await Promise.all(this._initialProviderPromises);
    }
    /** {@link vscode.lm.registerMcpConfigurationProvider} */
    registerMcpConfigurationProvider(extension, id, provider) {
        const store = new DisposableStore();
        const metadata = extension.contributes?.modelContextServerCollections?.find((m) => m.id === id);
        if (!metadata) {
            throw new Error(`MCP configuration providers must be registered in the contributes.modelContextServerCollections array within your package.json, but "${id}" was not`);
        }
        const mcp = {
            id: extensionPrefixedIdentifier(extension.identifier, id),
            isTrustedByDefault: true,
            label: metadata?.label ?? extension.displayName ?? extension.name,
            scope: 1 /* StorageScope.WORKSPACE */,
        };
        const update = async () => {
            const list = await provider.provideMcpServerDefinitions(CancellationToken.None);
            function isSSEConfig(candidate) {
                return !!candidate.uri;
            }
            const servers = [];
            for (const item of list ?? []) {
                servers.push({
                    id: ExtensionIdentifier.toKey(extension.identifier),
                    label: item.label,
                    launch: isSSEConfig(item)
                        ? {
                            type: 2 /* McpServerTransportType.SSE */,
                            uri: item.uri,
                            headers: item.headers,
                        }
                        : {
                            type: 1 /* McpServerTransportType.Stdio */,
                            cwd: item.cwd,
                            args: item.args,
                            command: item.command,
                            env: item.env,
                            envFile: undefined,
                        },
                });
            }
            this._proxy.$upsertMcpCollection(mcp, servers);
        };
        store.add(toDisposable(() => {
            this._proxy.$deleteMcpCollection(mcp.id);
        }));
        if (provider.onDidChange) {
            store.add(provider.onDidChange(update));
        }
        const promise = new Promise((resolve) => {
            setTimeout(() => update().finally(() => {
                this._initialProviderPromises.delete(promise);
                resolve();
            }), 0);
        });
        this._initialProviderPromises.add(promise);
        return store;
    }
};
ExtHostMcpService = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostMcpService);
export { ExtHostMcpService };
class McpSSEHandle extends Disposable {
    constructor(eventSourceCtor, _id, launch, _proxy) {
        super();
        this._id = _id;
        this._proxy = _proxy;
        this._requestSequencer = new Sequencer();
        this._postEndpoint = new DeferredPromise();
        eventSourceCtor.then((EventSourceCtor) => this._attach(EventSourceCtor, launch));
    }
    _attach(EventSourceCtor, launch) {
        if (this._store.isDisposed) {
            return;
        }
        const eventSource = new EventSourceCtor(launch.uri.toString(), {
            // recommended way to do things https://github.com/EventSource/eventsource?tab=readme-ov-file#setting-http-request-headers
            fetch: (input, init) => fetch(input, {
                ...init,
                headers: {
                    ...Object.fromEntries(launch.headers),
                    ...init?.headers,
                },
            }).then(async (res) => {
                // we get more details on failure at this point, so handle it explicitly:
                if (res.status >= 300) {
                    this._proxy.$onDidChangeState(this._id, {
                        state: 3 /* McpConnectionState.Kind.Error */,
                        message: `${res.status} status connecting to ${launch.uri}: ${await this._getErrText(res)}`,
                    });
                    eventSource.close();
                }
                return res;
            }, (err) => {
                this._proxy.$onDidChangeState(this._id, {
                    state: 3 /* McpConnectionState.Kind.Error */,
                    message: `Error connecting to ${launch.uri}: ${String(err)}`,
                });
                eventSource.close();
                return Promise.reject(err);
            }),
        });
        this._register(toDisposable(() => eventSource.close()));
        // https://github.com/modelcontextprotocol/typescript-sdk/blob/0fa2397174eba309b54575294d56754c52b13a65/src/server/sse.ts#L52
        eventSource.addEventListener('endpoint', (e) => {
            this._postEndpoint.complete(new URL(e.data, launch.uri.toString()).toString());
        });
        // https://github.com/modelcontextprotocol/typescript-sdk/blob/0fa2397174eba309b54575294d56754c52b13a65/src/server/sse.ts#L133
        eventSource.addEventListener('message', (e) => {
            this._proxy.$onDidReceiveMessage(this._id, e.data);
        });
        eventSource.addEventListener('open', () => {
            this._proxy.$onDidChangeState(this._id, { state: 2 /* McpConnectionState.Kind.Running */ });
        });
        eventSource.addEventListener('error', (err) => {
            this._postEndpoint.cancel();
            this._proxy.$onDidChangeState(this._id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `Error connecting to ${launch.uri}: ${err.code || 0} ${err.message || JSON.stringify(err)}`,
            });
            eventSource.close();
        });
    }
    async send(message) {
        // only the sending of the request needs to be sequenced
        try {
            const res = await this._requestSequencer.queue(async () => {
                const endpoint = await this._postEndpoint.p;
                const asBytes = new TextEncoder().encode(message);
                return fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': String(asBytes.length),
                    },
                    body: asBytes,
                });
            });
            if (res.status >= 300) {
                this._proxy.$onDidPublishLog(this._id, LogLevel.Warning, `${res.status} status sending message to ${this._postEndpoint}: ${await this._getErrText(res)}`);
            }
        }
        catch (err) {
            // ignored
        }
    }
    async _getErrText(res) {
        try {
            return await res.text();
        }
        catch {
            return res.statusText;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RNY3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFFekYsT0FBTyxFQUNOLDJCQUEyQixFQUkzQixlQUFlLEdBR2YsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQW1CLFdBQVcsRUFBc0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFxQixvQkFBb0IsQ0FBQyxDQUFBO0FBVXBGLElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQVNoRCxZQUFnQyxVQUE4QjtRQUM3RCxLQUFLLEVBQUUsQ0FBQTtRQVJTLDZCQUF3QixHQUFHLElBQUks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