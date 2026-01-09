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
