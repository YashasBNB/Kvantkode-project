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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2VG9vbHNMb2dnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9sb2dnaW5nL2RlYnVnZ2VyL2RldlRvb2xzTG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWdCLE1BQU0sa0JBQWtCLENBQUE7QUFDaEUsT0FBTyxFQUlOLGVBQWUsR0FFZixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQUUsT0FBTyxFQUFnQixNQUFNLGtCQUFrQixDQUFBO0FBRXhELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQVMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sVUFBVSxFQUNWLHFCQUFxQixFQUNyQiwyQkFBMkIsRUFFM0IsU0FBUyxHQUNULE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQW1CMUUsTUFBTSxPQUFPLGNBQWM7YUFDWCxjQUFTLEdBQStCLFNBQVMsQUFBeEMsQ0FBd0M7SUFDekQsTUFBTSxDQUFDLFdBQVc7UUFDeEIsSUFBSSxjQUFjLENBQUMsU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzVDLGNBQWMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUNoRCxDQUFDO1FBQ0QsT0FBTyxjQUFjLENBQUMsU0FBUyxDQUFBO0lBQ2hDLENBQUM7SUF3R08sbUJBQW1CO1FB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