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
import { disposableTimeout } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { autorun, observableValue, } from '../../../base/common/observable.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { LogLevel } from '../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../platform/observable/common/platformObservableUtils.js';
import { mcpEnabledSection } from '../../contrib/mcp/common/mcpConfiguration.js';
import { IMcpRegistry } from '../../contrib/mcp/common/mcpRegistryTypes.js';
import { McpConnectionState, McpServerDefinition, } from '../../contrib/mcp/common/mcpTypes.js';
import { extensionHostKindToString, } from '../../services/extensions/common/extensionHostKind.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadMcp = class MainThreadMcp extends Disposable {
    constructor(_extHostContext, _mcpRegistry, configurationService) {
        super();
        this._extHostContext = _extHostContext;
        this._mcpRegistry = _mcpRegistry;
        this._serverIdCounter = 0;
        this._servers = new Map();
        this._collectionDefinitions = this._register(new DisposableMap());
        const proxy = _extHostContext.getProxy(ExtHostContext.ExtHostMcp);
        this._mcpEnabled = observableConfigValue(mcpEnabledSection, true, configurationService);
        this._register(this._mcpRegistry.registerDelegate({
            // Prefer Node.js extension hosts when they're available. No CORS issues etc.
            priority: _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */ ? 0 : 1,
            waitForInitialProviderPromises() {
                return proxy.$waitForInitialCollectionProviders();
            },
            canStart(collection, serverDefinition) {
                // todo: SSE MPC servers without a remote authority could be served from the renderer
                if (collection.remoteAuthority !== _extHostContext.remoteAuthority) {
                    return false;
                }
                if (serverDefinition.launch.type === 1 /* McpServerTransportType.Stdio */ &&
                    _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
                    return false;
                }
                return true;
            },
            start: (collection, _serverDefiniton, resolveLaunch) => {
                const id = ++this._serverIdCounter;
                const launch = new ExtHostMcpServerLaunch(_extHostContext.extensionHostKind, () => proxy.$stopMcp(id), (msg) => proxy.$sendMessage(id, JSON.stringify(msg)));
                this._servers.set(id, launch);
                proxy.$startMcp(id, resolveLaunch);
                return launch;
            },
        }));
    }
    $upsertMcpCollection(collection, serversDto) {
        const servers = serversDto.map(McpServerDefinition.fromSerialized);
        const existing = this._collectionDefinitions.get(collection.id);
        if (existing) {
            existing.servers.set(servers, undefined);
        }
        else {
            const serverDefinitions = observableValue('mcpServers', servers);
            const store = new DisposableStore();
            const handle = store.add(new MutableDisposable());
            store.add(autorun((reader) => {
                if (this._mcpEnabled.read(reader)) {
                    handle.value = this._mcpRegistry.registerCollection({
                        ...collection,
                        remoteAuthority: this._extHostContext.remoteAuthority,
                        serverDefinitions,
                    });
                }
                else {
                    handle.clear();
                }
            }));
            this._collectionDefinitions.set(collection.id, {
                fromExtHost: collection,
                servers: serverDefinitions,
                dispose: () => store.dispose(),
            });
        }
    }
    $deleteMcpCollection(collectionId) {
        this._collectionDefinitions.deleteAndDispose(collectionId);
    }
    $onDidChangeState(id, update) {
        const server = this._servers.get(id);
        if (!server) {
            return;
        }
        server.state.set(update, undefined);
        if (!McpConnectionState.isRunning(update)) {
            server.dispose();
            this._servers.delete(id);
        }
    }
    $onDidPublishLog(id, level, log) {
        if (typeof level === 'string') {
            level = LogLevel.Info;
            log = level;
        }
        this._servers.get(id)?.pushLog(level, log);
    }
    $onDidReceiveMessage(id, message) {
        this._servers.get(id)?.pushMessage(message);
    }
    dispose() {
        for (const server of this._servers.values()) {
            server.extHostDispose();
        }
        this._servers.clear();
        super.dispose();
    }
};
MainThreadMcp = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMcp),
    __param(1, IMcpRegistry),
    __param(2, IConfigurationService)
], MainThreadMcp);
export { MainThreadMcp };
class ExtHostMcpServerLaunch extends Disposable {
    pushLog(level, message) {
        this._onDidLog.fire({ message, level });
    }
    pushMessage(message) {
        let parsed;
        try {
            parsed = JSON.parse(message);
        }
        catch (e) {
            this.pushLog(LogLevel.Warning, `Failed to parse message: ${JSON.stringify(message)}`);
        }
        if (parsed) {
            this._onDidReceiveMessage.fire(parsed);
        }
    }
    constructor(extHostKind, stop, send) {
        super();
        this.stop = stop;
        this.send = send;
        this.state = observableValue('mcpServerState', {
            state: 1 /* McpConnectionState.Kind.Starting */,
        });
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._register(disposableTimeout(() => {
            this.pushLog(LogLevel.Info, `Starting server from ${extensionHostKindToString(extHostKind)} extension host`);
        }));
    }
    extHostDispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.pushLog(LogLevel.Warning, 'Extension host shut down, server will stop.');
            this.state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
        }
        this.dispose();
    }
    dispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.stop();
        }
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTWNwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBQ2YsaUJBQWlCLEdBQ2pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUNOLE9BQU8sRUFHUCxlQUFlLEdBQ2YsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDaEYsT0FBTyxFQUF3QixZQUFZLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRyxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLG1CQUFtQixHQUVuQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQXNCLE1BQU0sK0JBQStCLENBQUE7QUFHeEYsSUFBTSxhQUFhLEdBQW5CLE1BQU0sYUFBYyxTQUFRLFVBQVU7SUFnQjVDLFlBQ2tC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