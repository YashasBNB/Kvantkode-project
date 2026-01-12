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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE1jcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUV6RixPQUFPLEVBQ04sMkJBQTJCLEVBSTNCLGVBQWUsR0FHZixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBbUIsV0FBVyxFQUFzQixNQUFNLHVCQUF1QixDQUFBO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG9CQUFvQixDQUFDLENBQUE7QUFVcEYsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBU2hELFlBQWdDLFVBQThCO1FBQzdELEtBQUssRUFBRSxDQUFBO1FBUlMsNkJBQXdCLEdBQUcs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