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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { log } from '../../../../platform/log/common/log.js';
import { McpServerRequestHandler } from './mcpServerRequestHandler.js';
import { McpConnectionState, } from './mcpTypes.js';
let McpServerConnection = class McpServerConnection extends Disposable {
    constructor(_collection, definition, _delegate, launchDefinition, _logger, _instantiationService) {
        super();
        this._collection = _collection;
        this.definition = definition;
        this._delegate = _delegate;
        this.launchDefinition = launchDefinition;
        this._logger = _logger;
        this._instantiationService = _instantiationService;
        this._launch = this._register(new MutableDisposable());
        this._state = observableValue('mcpServerState', {
            state: 0 /* McpConnectionState.Kind.Stopped */,
        });
        this._requestHandler = observableValue('mcpServerRequestHandler', undefined);
        this.state = this._state;
        this.handler = this._requestHandler;
    }
    /** @inheritdoc */
    async start() {
        const currentState = this._state.get();
        if (!McpConnectionState.canBeStarted(currentState.state)) {
            return this._waitForState(2 /* McpConnectionState.Kind.Running */, 3 /* McpConnectionState.Kind.Error */);
        }
        this._launch.value = undefined;
        this._state.set({ state: 1 /* McpConnectionState.Kind.Starting */ }, undefined);
        this._logger.info(localize('mcpServer.starting', 'Starting server {0}', this.definition.label));
        try {
            const launch = this._delegate.start(this._collection, this.definition, this.launchDefinition);
            this._launch.value = this.adoptLaunch(launch);
            return this._waitForState(2 /* McpConnectionState.Kind.Running */, 3 /* McpConnectionState.Kind.Error */);
        }
        catch (e) {
            const errorState = {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: e instanceof Error ? e.message : String(e),
            };
            this._state.set(errorState, undefined);
            return errorState;
        }
    }
    adoptLaunch(launch) {
        const store = new DisposableStore();
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        store.add(launch);
        store.add(launch.onDidLog(({ level, message }) => {
            log(this._logger, level, message);
        }));
        let didStart = false;
        store.add(autorun((reader) => {
            const state = launch.state.read(reader);
            this._state.set(state, undefined);
            this._logger.info(localize('mcpServer.state', 'Connection state: {0}', McpConnectionState.toString(state)));
            if (state.state === 2 /* McpConnectionState.Kind.Running */ && !didStart) {
                didStart = true;
                McpServerRequestHandler.create(this._instantiationService, launch, this._logger, cts.token).then((handler) => {
                    if (!store.isDisposed) {
                        this._requestHandler.set(handler, undefined);
                    }
                    else {
                        handler.dispose();
                    }
                }, (err) => {
                    store.dispose();
                    if (!store.isDisposed) {
                        this._logger.error(err);
                        this._state.set({
                            state: 3 /* McpConnectionState.Kind.Error */,
                            message: `Could not initialize MCP server: ${err.message}`,
                        }, undefined);
                    }
                });
            }
        }));
        return { dispose: () => store.dispose(), object: launch };
    }
    async stop() {
        this._logger.info(localize('mcpServer.stopping', 'Stopping server {0}', this.definition.label));
        this._launch.value?.object.stop();
        await this._waitForState(0 /* McpConnectionState.Kind.Stopped */, 3 /* McpConnectionState.Kind.Error */);
    }
    dispose() {
        this._requestHandler.get()?.dispose();
        super.dispose();
        this._state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    _waitForState(...kinds) {
        const current = this._state.get();
        if (kinds.includes(current.state)) {
            return Promise.resolve(current);
        }
        return new Promise((resolve) => {
            const disposable = autorun((reader) => {
                const state = this._state.read(reader);
                if (kinds.includes(state.state)) {
                    disposable.dispose();
                    resolve(state);
                }
            });
        });
    }
};
McpServerConnection = __decorate([
    __param(5, IInstantiationService)
], McpServerConnection);
export { McpServerConnection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmVyQ29ubmVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFXLEdBQUcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXJFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFHTixrQkFBa0IsR0FHbEIsTUFBTSxlQUFlLENBQUE7QUFFZixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFlbEQsWUFDa0IsV0FBb0MsRUFDckMsVUFBK0IsRUFDOUIsU0FBMkIsRUFDNUIsZ0JBQWlDLEVBQ2hDLE9BQWdCLEVBQ1YscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBUFUsZ0JBQVcsR0FBWCxXQUFXLENBQXlCO1FBQ3JDLGVBQVUsR0FBVixVQUFVLENBQXFCO1FBQzlCLGNBQVMsR0FBVCxTQUFTLENBQWtCO1FBQzVCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBaUI7UUFDaEMsWUFBTyxHQUFQLE9BQU8sQ0FBUztR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