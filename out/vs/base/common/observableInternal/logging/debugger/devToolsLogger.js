/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AutorunObserver } from '../../autorun.js';
import { ObservableValue, } from '../../base.js';
import { Derived } from '../../derived.js';
import { formatValue } from '../consoleObservableLogger.js';
import { registerDebugChannel } from './debuggerRpc.js';
import { deepAssign, deepAssignDeleteNulls, getFirstStackFrameOutsideOf, Throttler, } from './utils.js';
import { isDefined } from '../../../types.js';
import { FromEventObservable } from '../../utils.js';
import { BugIndicatingError, onUnexpectedError } from '../../../errors.js';
export class DevToolsLogger {
    static { this._instance = undefined; }
    static getInstance() {
        if (DevToolsLogger._instance === undefined) {
            DevToolsLogger._instance = new DevToolsLogger();
        }
        return DevToolsLogger._instance;
    }
    getTransactionState() {
        const affected = [];
        const txs = [...this._activeTransactions];
        if (txs.length === 0) {
            return undefined;
        }
        const observerQueue = txs
            .flatMap((t) => t.debugGetUpdatingObservers() ?? [])
            .map((o) => o.observer);
        const processedObservers = new Set();
        while (observerQueue.length > 0) {
            const observer = observerQueue.shift();
            if (processedObservers.has(observer)) {
                continue;
            }
            processedObservers.add(observer);
            const state = this._getInfo(observer, (d) => {
                if (!processedObservers.has(d)) {
                    observerQueue.push(d);
                }
            });
            if (state) {
                affected.push(state);
            }
        }
        return { names: txs.map((t) => t.getDebugName() ?? 'tx'), affected };
    }
    _getObservableInfo(observable) {
        const info = this._instanceInfos.get(observable);
        if (!info) {
            onUnexpectedError(new BugIndicatingError('No info found'));
            return undefined;
        }
        return info;
    }
    _getAutorunInfo(autorun) {
        const info = this._instanceInfos.get(autorun);
        if (!info) {
            onUnexpectedError(new BugIndicatingError('No info found'));
            return undefined;
        }
        return info;
    }
    _getInfo(observer, queue) {
        if (observer instanceof Derived) {
            const observersToUpdate = [...observer.debugGetObservers()];
            for (const o of observersToUpdate) {
                queue(o);
            }
            const info = this._getObservableInfo(observer);
            if (!info) {
                return;
            }
            const observerState = observer.debugGetState();
            const base = {
                name: observer.debugName,
                instanceId: info.instanceId,
                updateCount: observerState.updateCount,
            };
            const changedDependencies = [...info.changedObservables]
                .map((o) => this._instanceInfos.get(o)?.instanceId)
                .filter(isDefined);
            if (observerState.isComputing) {
                return {
                    ...base,
                    type: 'observable/derived',
                    state: 'updating',
                    changedDependencies,
                    initialComputation: false,
                };
            }
            switch (observerState.state) {
                case 0 /* DerivedState.initial */:
                    return { ...base, type: 'observable/derived', state: 'noValue' };
                case 3 /* DerivedState.upToDate */:
                    return { ...base, type: 'observable/derived', state: 'upToDate' };
                case 2 /* DerivedState.stale */:
                    return { ...base, type: 'observable/derived', state: 'stale', changedDependencies };
                case 1 /* DerivedState.dependenciesMightHaveChanged */:
                    return { ...base, type: 'observable/derived', state: 'possiblyStale' };
            }
        }
        else if (observer instanceof AutorunObserver) {
            const info = this._getAutorunInfo(observer);
            if (!info) {
                return undefined;
            }
            const base = {
                name: observer.debugName,
                instanceId: info.instanceId,
                updateCount: info.updateCount,
            };
            const changedDependencies = [...info.changedObservables].map((o) => this._instanceInfos.get(o).instanceId);
            if (observer.debugGetState().isRunning) {
                return { ...base, type: 'autorun', state: 'updating', changedDependencies };
            }
            switch (observer.debugGetState().state) {
                case 3 /* AutorunState.upToDate */:
                    return { ...base, type: 'autorun', state: 'upToDate' };
                case 2 /* AutorunState.stale */:
                    return { ...base, type: 'autorun', state: 'stale', changedDependencies };
                case 1 /* AutorunState.dependenciesMightHaveChanged */:
                    return { ...base, type: 'autorun', state: 'possiblyStale' };
            }
        }
        return undefined;
    }
    _formatObservable(obs) {
        const info = this._getObservableInfo(obs);
        if (!info) {
            return undefined;
        }
        return { name: obs.debugName, instanceId: info.instanceId };
    }
    _formatObserver(obs) {
        if (obs instanceof Derived) {
            return { name: obs.toString(), instanceId: this._getObservableInfo(obs)?.instanceId };
        }
        const autorunInfo = this._getAutorunInfo(obs);
        if (autorunInfo) {
            return { name: obs.toString(), instanceId: autorunInfo.instanceId };
        }
        return undefined;
    }
    constructor() {
        this._declarationId = 0;
        this._instanceId = 0;
        this._declarations = new Map();
        this._instanceInfos = new WeakMap();
        this._aliveInstances = new Map();
        this._activeTransactions = new Set();
        this._channel = registerDebugChannel('observableDevTools', () => {
            return {
                notifications: {
                    setDeclarationIdFilter: (declarationIds) => { },
                    logObservableValue: (observableId) => {
                        console.log('logObservableValue', observableId);
                    },
                    flushUpdates: () => {
                        this._flushUpdates();
                    },
                    resetUpdates: () => {
                        this._pendingChanges = null;
                        this._channel.api.notifications.handleChange(this._fullState, true);
                    },
                },
                requests: {
                    getDeclarations: () => {
                        const result = {};
                        for (const decl of this._declarations.values()) {
                            result[decl.id] = decl;
                        }
                        return { decls: result };
                    },
                    getSummarizedInstances: () => {
                        return null;
                    },
                    getObservableValueInfo: (instanceId) => {
                        const obs = this._aliveInstances.get(instanceId);
                        return {
                            observers: [...obs.debugGetObservers()]
                                .map((d) => this._formatObserver(d))
                                .filter(isDefined),
                        };
                    },
                    getDerivedInfo: (instanceId) => {
                        const d = this._aliveInstances.get(instanceId);
                        return {
                            dependencies: [...d.debugGetState().dependencies]
                                .map((d) => this._formatObservable(d))
                                .filter(isDefined),
                            observers: [...d.debugGetObservers()]
                                .map((d) => this._formatObserver(d))
                                .filter(isDefined),
                        };
                    },
                    getAutorunInfo: (instanceId) => {
                        const obs = this._aliveInstances.get(instanceId);
                        return {
                            dependencies: [...obs.debugGetState().dependencies]
                                .map((d) => this._formatObservable(d))
                                .filter(isDefined),
                        };
                    },
                    getTransactionState: () => {
                        return this.getTransactionState();
                    },
                    setValue: (instanceId, jsonValue) => {
                        const obs = this._aliveInstances.get(instanceId);
                        if (obs instanceof Derived) {
                            obs.debugSetValue(jsonValue);
                        }
                        else if (obs instanceof ObservableValue) {
                            obs.debugSetValue(jsonValue);
                        }
                        else if (obs instanceof FromEventObservable) {
                            obs.debugSetValue(jsonValue);
                        }
                        else {
                            throw new BugIndicatingError('Observable is not supported');
                        }
                        const observers = [...obs.debugGetObservers()];
                        for (const d of observers) {
                            d.beginUpdate(obs);
                        }
                        for (const d of observers) {
                            d.handleChange(obs, undefined);
                        }
                        for (const d of observers) {
                            d.endUpdate(obs);
                        }
                    },
                    getValue: (instanceId) => {
                        const obs = this._aliveInstances.get(instanceId);
                        if (obs instanceof Derived) {
                            return formatValue(obs.debugGetState().value, 200);
                        }
                        else if (obs instanceof ObservableValue) {
                            return formatValue(obs.debugGetState().value, 200);
                        }
                        return undefined;
                    },
                },
            };
        });
        this._pendingChanges = null;
        this._changeThrottler = new Throttler();
        this._fullState = {};
        this._flushUpdates = () => {
            if (this._pendingChanges !== null) {
                this._channel.api.notifications.handleChange(this._pendingChanges, false);
                this._pendingChanges = null;
            }
        };
    }
    _handleChange(update) {
        deepAssignDeleteNulls(this._fullState, update);
        if (this._pendingChanges === null) {
            this._pendingChanges = update;
        }
        else {
            deepAssign(this._pendingChanges, update);
        }
        this._changeThrottler.throttle(this._flushUpdates, 10);
    }
    _getDeclarationId(type) {
        let shallow = true;
        let loc;
        const Err = Error; // For the monaco editor checks, which don't have the nodejs types.
        while (true) {
            const l = Err.stackTraceLimit;
            Err.stackTraceLimit = shallow ? 6 : 20;
            const stack = new Error().stack;
            Err.stackTraceLimit = l;
            let result = getFirstStackFrameOutsideOf(stack, /[/\\]observableInternal[/\\]|\.observe|[/\\]util(s)?\./);
            if (!shallow && !result) {
                result = getFirstStackFrameOutsideOf(stack, /[/\\]observableInternal[/\\]|\.observe/);
            }
            if (result) {
                loc = result;
                break;
            }
            if (!shallow) {
                console.error('Could not find location for declaration', new Error().stack);
                loc = { fileName: 'unknown', line: 0, column: 0, id: 'unknown' };
                break;
            }
            shallow = false;
        }
        let decInfo = this._declarations.get(loc.id);
        if (decInfo === undefined) {
            decInfo = {
                id: this._declarationId++,
                type,
                url: loc.fileName,
                line: loc.line,
                column: loc.column,
            };
            this._declarations.set(loc.id, decInfo);
            this._handleChange({ decls: { [decInfo.id]: decInfo } });
        }
        return decInfo.id;
    }
    handleObservableCreated(observable) {
        const declarationId = this._getDeclarationId('observable/value');
        const info = {
            declarationId,
            instanceId: this._instanceId++,
            listenerCount: 0,
            lastValue: undefined,
            updateCount: 0,
            changedObservables: new Set(),
        };
        this._instanceInfos.set(observable, info);
    }
    handleOnListenerCountChanged(observable, newCount) {
        const info = this._getObservableInfo(observable);
        if (!info) {
            return;
        }
        if (info.listenerCount === 0 && newCount > 0) {
            const type = observable instanceof Derived ? 'observable/derived' : 'observable/value';
            this._aliveInstances.set(info.instanceId, observable);
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        instanceId: info.instanceId,
                        declarationId: info.declarationId,
                        formattedValue: info.lastValue,
                        type,
                        name: observable.debugName,
                    },
                },
            });
        }
        else if (info.listenerCount > 0 && newCount === 0) {
            this._handleChange({
                instances: { [info.instanceId]: null },
            });
            this._aliveInstances.delete(info.instanceId);
        }
        info.listenerCount = newCount;
    }
    handleObservableUpdated(observable, changeInfo) {
        if (observable instanceof Derived) {
            this._handleDerivedRecomputed(observable, changeInfo);
            return;
        }
        const info = this._getObservableInfo(observable);
        if (info) {
            if (changeInfo.didChange) {
                info.lastValue = formatValue(changeInfo.newValue, 30);
                if (info.listenerCount > 0) {
                    this._handleChange({
                        instances: { [info.instanceId]: { formattedValue: info.lastValue } },
                    });
                }
            }
        }
    }
    handleAutorunCreated(autorun) {
        const declarationId = this._getDeclarationId('autorun');
        const info = {
            declarationId,
            instanceId: this._instanceId++,
            updateCount: 0,
            changedObservables: new Set(),
        };
        this._instanceInfos.set(autorun, info);
        this._aliveInstances.set(info.instanceId, autorun);
        if (info) {
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        instanceId: info.instanceId,
                        declarationId: info.declarationId,
                        runCount: 0,
                        type: 'autorun',
                        name: autorun.debugName,
                    },
                },
            });
        }
    }
    handleAutorunDisposed(autorun) {
        const info = this._getAutorunInfo(autorun);
        if (!info) {
            return;
        }
        this._handleChange({
            instances: { [info.instanceId]: null },
        });
        this._instanceInfos.delete(autorun);
        this._aliveInstances.delete(info.instanceId);
    }
    handleAutorunDependencyChanged(autorun, observable, change) {
        const info = this._getAutorunInfo(autorun);
        if (!info) {
            return;
        }
        info.changedObservables.add(observable);
    }
    handleAutorunStarted(autorun) { }
    handleAutorunFinished(autorun) {
        const info = this._getAutorunInfo(autorun);
        if (!info) {
            return;
        }
        info.changedObservables.clear();
        info.updateCount++;
        this._handleChange({
            instances: { [info.instanceId]: { runCount: info.updateCount } },
        });
    }
    handleDerivedDependencyChanged(derived, observable, change) {
        const info = this._getObservableInfo(derived);
        if (info) {
            info.changedObservables.add(observable);
        }
    }
    _handleDerivedRecomputed(observable, changeInfo) {
        const info = this._getObservableInfo(observable);
        if (!info) {
            return;
        }
        const formattedValue = formatValue(changeInfo.newValue, 30);
        info.updateCount++;
        info.changedObservables.clear();
        info.lastValue = formattedValue;
        if (info.listenerCount > 0) {
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        formattedValue: formattedValue,
                        recomputationCount: info.updateCount,
                    },
                },
            });
        }
    }
    handleDerivedCleared(observable) {
        const info = this._getObservableInfo(observable);
        if (!info) {
            return;
        }
        info.lastValue = undefined;
        info.changedObservables.clear();
        if (info.listenerCount > 0) {
            this._handleChange({
                instances: {
                    [info.instanceId]: {
                        formattedValue: undefined,
                    },
                },
            });
        }
    }
    handleBeginTransaction(transaction) {
        this._activeTransactions.add(transaction);
    }
    handleEndTransaction(transaction) {
        this._activeTransactions.delete(transaction);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2VG9vbHNMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvbG9nZ2luZy9kZWJ1Z2dlci9kZXZUb29sc0xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLGtCQUFrQixDQUFBO0FBQ2hFLE9BQU8sRUFJTixlQUFlLEdBRWYsTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSxrQkFBa0IsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFTM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdkQsT0FBTyxFQUNOLFVBQVUsRUFDVixxQkFBcUIsRUFDckIsMkJBQTJCLEVBRTNCLFNBQVMsR0FDVCxNQUFNLFlBQVksQ0FBQTtBQUNuQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFtQjFFLE1BQU0sT0FBTyxjQUFjO2FBQ1gsY0FBUyxHQUErQixTQUFTLEFBQXhDLENBQXdDO0lBQ3pELE1BQU0sQ0FBQyxXQUFXO1FBQ3hCLElBQUksY0FBYyxDQUFDLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM1QyxjQUFjLENBQUMsU0FBUyxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDaEQsQ0FBQztRQUNELE9BQU8sY0FBYyxDQUFDLFNBQVMsQ0FBQTtJQUNoQyxDQUFDO0lBd0dPLG1CQUFtQjtRQUMxQixN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