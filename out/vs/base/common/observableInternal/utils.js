/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { autorun, autorunOpts, autorunWithStoreHandleChanges } from './autorun.js';
import { BaseObservable, ConvenientObservable, _setKeepObserved, _setRecomputeInitiallyAndOnChange, observableValue, subtransaction, transaction, } from './base.js';
import { DebugNameData, getDebugName } from './debugName.js';
import { BugIndicatingError, DisposableStore, Event, strictEquals, toDisposable, } from './commonFacade/deps.js';
import { derived, derivedOpts } from './derived.js';
import { getLogger } from './logging/logging.js';
/**
 * Represents an efficient observable whose value never changes.
 */
export function constObservable(value) {
    return new ConstObservable(value);
}
class ConstObservable extends ConvenientObservable {
    constructor(value) {
        super();
        this.value = value;
    }
    get debugName() {
        return this.toString();
    }
    get() {
        return this.value;
    }
    addObserver(observer) {
        // NO OP
    }
    removeObserver(observer) {
        // NO OP
    }
    log() {
        return this;
    }
    toString() {
        return `Const: ${this.value}`;
    }
}
export function observableFromPromise(promise) {
    const observable = observableValue('promiseValue', {});
    promise.then((value) => {
        observable.set({ value }, undefined);
    });
    return observable;
}
export function observableFromEvent(...args) {
    let owner;
    let event;
    let getValue;
    if (args.length === 3) {
        ;
        [owner, event, getValue] = args;
    }
    else {
        ;
        [event, getValue] = args;
    }
    return new FromEventObservable(new DebugNameData(owner, undefined, getValue), event, getValue, () => FromEventObservable.globalTransaction, strictEquals);
}
export function observableFromEventOpts(options, event, getValue) {
    return new FromEventObservable(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? getValue), event, getValue, () => FromEventObservable.globalTransaction, options.equalsFn ?? strictEquals);
}
export class FromEventObservable extends BaseObservable {
    constructor(_debugNameData, event, _getValue, _getTransaction, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this.event = event;
        this._getValue = _getValue;
        this._getTransaction = _getTransaction;
        this._equalityComparator = _equalityComparator;
        this._hasValue = false;
        this.handleEvent = (args) => {
            const newValue = this._getValue(args);
            const oldValue = this._value;
            const didChange = !this._hasValue || !this._equalityComparator(oldValue, newValue);
            let didRunTransaction = false;
            if (didChange) {
                this._value = newValue;
                if (this._hasValue) {
                    didRunTransaction = true;
                    subtransaction(this._getTransaction(), (tx) => {
                        getLogger()?.handleObservableUpdated(this, {
                            oldValue,
                            newValue,
                            change: undefined,
                            didChange,
                            hadValue: this._hasValue,
                        });
                        for (const o of this._observers) {
                            tx.updateObserver(o, this);
                            o.handleChange(this, undefined);
                        }
                    }, () => {
                        const name = this.getDebugName();
                        return 'Event fired' + (name ? `: ${name}` : '');
                    });
                }
                this._hasValue = true;
            }
            if (!didRunTransaction) {
                getLogger()?.handleObservableUpdated(this, {
                    oldValue,
                    newValue,
                    change: undefined,
                    didChange,
                    hadValue: this._hasValue,
                });
            }
        };
    }
    getDebugName() {
        return this._debugNameData.getDebugName(this);
    }
    get debugName() {
        const name = this.getDebugName();
        return 'From Event' + (name ? `: ${name}` : '');
    }
    onFirstObserverAdded() {
        this._subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this._subscription.dispose();
        this._subscription = undefined;
        this._hasValue = false;
        this._value = undefined;
    }
    get() {
        if (this._subscription) {
            if (!this._hasValue) {
                this.handleEvent(undefined);
            }
            return this._value;
        }
        else {
            // no cache, as there are no subscribers to keep it updated
            const value = this._getValue(undefined);
            return value;
        }
    }
    debugSetValue(value) {
        this._value = value;
    }
}
(function (observableFromEvent) {
    observableFromEvent.Observer = FromEventObservable;
    function batchEventsGlobally(tx, fn) {
        let didSet = false;
        if (FromEventObservable.globalTransaction === undefined) {
            FromEventObservable.globalTransaction = tx;
            didSet = true;
        }
        try {
            fn();
        }
        finally {
            if (didSet) {
                FromEventObservable.globalTransaction = undefined;
            }
        }
    }
    observableFromEvent.batchEventsGlobally = batchEventsGlobally;
})(observableFromEvent || (observableFromEvent = {}));
export function observableSignalFromEvent(owner, event) {
    return new FromEventObservableSignal(typeof owner === 'string' ? owner : new DebugNameData(owner, undefined, undefined), event);
}
class FromEventObservableSignal extends BaseObservable {
    constructor(debugNameDataOrName, event) {
        super();
        this.event = event;
        this.handleEvent = () => {
            transaction((tx) => {
                for (const o of this._observers) {
                    tx.updateObserver(o, this);
                    o.handleChange(this, undefined);
                }
            }, () => this.debugName);
        };
        this.debugName =
            typeof debugNameDataOrName === 'string'
                ? debugNameDataOrName
                : (debugNameDataOrName.getDebugName(this) ?? 'Observable Signal From Event');
    }
    onFirstObserverAdded() {
        this.subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this.subscription.dispose();
        this.subscription = undefined;
    }
    get() {
        // NO OP
    }
}
export function observableSignal(debugNameOrOwner) {
    if (typeof debugNameOrOwner === 'string') {
        return new ObservableSignal(debugNameOrOwner);
    }
    else {
        return new ObservableSignal(undefined, debugNameOrOwner);
    }
}
class ObservableSignal extends BaseObservable {
    get debugName() {
        return (new DebugNameData(this._owner, this._debugName, undefined).getDebugName(this) ??
            'Observable Signal');
    }
    toString() {
        return this.debugName;
    }
    constructor(_debugName, _owner) {
        super();
        this._debugName = _debugName;
        this._owner = _owner;
    }
    trigger(tx, change) {
        if (!tx) {
            transaction((tx) => {
                this.trigger(tx, change);
            }, () => `Trigger signal ${this.debugName}`);
            return;
        }
        for (const o of this._observers) {
            tx.updateObserver(o, this);
            o.handleChange(this, change);
        }
    }
    get() {
        // NO OP
    }
}
export function signalFromObservable(owner, observable) {
    return derivedOpts({
        owner,
        equalsFn: () => false,
    }, (reader) => {
        observable.read(reader);
    });
}
/**
 * @deprecated Use `debouncedObservable` instead.
 */
export function debouncedObservableDeprecated(observable, debounceMs, disposableStore) {
    const debouncedObservable = observableValue('debounced', undefined);
    let timeout = undefined;
    disposableStore.add(autorun((reader) => {
        /** @description debounce */
        const value = observable.read(reader);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            transaction((tx) => {
                debouncedObservable.set(value, tx);
            });
        }, debounceMs);
    }));
    return debouncedObservable;
}
/**
 * Creates an observable that debounces the input observable.
 */
export function debouncedObservable(observable, debounceMs) {
    let hasValue = false;
    let lastValue;
    let timeout = undefined;
    return observableFromEvent((cb) => {
        const d = autorun((reader) => {
            const value = observable.read(reader);
            if (!hasValue) {
                hasValue = true;
                lastValue = value;
            }
            else {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(() => {
                    lastValue = value;
                    cb();
                }, debounceMs);
            }
        });
        return {
            dispose() {
                d.dispose();
                hasValue = false;
                lastValue = undefined;
            },
        };
    }, () => {
        if (hasValue) {
            return lastValue;
        }
        else {
            return observable.get();
        }
    });
}
export function wasEventTriggeredRecently(event, timeoutMs, disposableStore) {
    const observable = observableValue('triggeredRecently', false);
    let timeout = undefined;
    disposableStore.add(event(() => {
        observable.set(true, undefined);
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            observable.set(false, undefined);
        }, timeoutMs);
    }));
    return observable;
}
/**
 * This makes sure the observable is being observed and keeps its cache alive.
 */
export function keepObserved(observable) {
    const o = new KeepAliveObserver(false, undefined);
    observable.addObserver(o);
    return toDisposable(() => {
        observable.removeObserver(o);
    });
}
_setKeepObserved(keepObserved);
/**
 * This converts the given observable into an autorun.
 */
export function recomputeInitiallyAndOnChange(observable, handleValue) {
    const o = new KeepAliveObserver(true, handleValue);
    observable.addObserver(o);
    try {
        o.beginUpdate(observable);
    }
    finally {
        o.endUpdate(observable);
    }
    return toDisposable(() => {
        observable.removeObserver(o);
    });
}
_setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange);
export class KeepAliveObserver {
    constructor(_forceRecompute, _handleValue) {
        this._forceRecompute = _forceRecompute;
        this._handleValue = _handleValue;
        this._counter = 0;
    }
    beginUpdate(observable) {
        this._counter++;
    }
    endUpdate(observable) {
        if (this._counter === 1 && this._forceRecompute) {
            if (this._handleValue) {
                this._handleValue(observable.get());
            }
            else {
                observable.reportChanges();
            }
        }
        this._counter--;
    }
    handlePossibleChange(observable) {
        // NO OP
    }
    handleChange(observable, change) {
        // NO OP
    }
}
export function derivedObservableWithCache(owner, computeFn) {
    let lastValue = undefined;
    const observable = derivedOpts({ owner, debugReferenceFn: computeFn }, (reader) => {
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return observable;
}
export function derivedObservableWithWritableCache(owner, computeFn) {
    let lastValue = undefined;
    const onChange = observableSignal('derivedObservableWithWritableCache');
    const observable = derived(owner, (reader) => {
        onChange.read(reader);
        lastValue = computeFn(reader, lastValue);
        return lastValue;
    });
    return Object.assign(observable, {
        clearCache: (tx) => {
            lastValue = undefined;
            onChange.trigger(tx);
        },
        setCache: (newValue, tx) => {
            lastValue = newValue;
            onChange.trigger(tx);
        },
    });
}
/**
 * When the items array changes, referential equal items are not mapped again.
 */
export function mapObservableArrayCached(owner, items, map, keySelector) {
    let m = new ArrayMap(map, keySelector);
    const self = derivedOpts({
        debugReferenceFn: map,
        owner,
        onLastObserverRemoved: () => {
            m.dispose();
            m = new ArrayMap(map);
        },
    }, (reader) => {
        m.setItems(items.read(reader));
        return m.getItems();
    });
    return self;
}
class ArrayMap {
    constructor(_map, _keySelector) {
        this._map = _map;
        this._keySelector = _keySelector;
        this._cache = new Map();
        this._items = [];
    }
    dispose() {
        this._cache.forEach((entry) => entry.store.dispose());
        this._cache.clear();
    }
    setItems(items) {
        const newItems = [];
        const itemsToRemove = new Set(this._cache.keys());
        for (const item of items) {
            const key = this._keySelector ? this._keySelector(item) : item;
            let entry = this._cache.get(key);
            if (!entry) {
                const store = new DisposableStore();
                const out = this._map(item, store);
                entry = { out, store };
                this._cache.set(key, entry);
            }
            else {
                itemsToRemove.delete(key);
            }
            newItems.push(entry.out);
        }
        for (const item of itemsToRemove) {
            const entry = this._cache.get(item);
            entry.store.dispose();
            this._cache.delete(item);
        }
        this._items = newItems;
    }
    getItems() {
        return this._items;
    }
}
export class ValueWithChangeEventFromObservable {
    constructor(observable) {
        this.observable = observable;
    }
    get onDidChange() {
        return Event.fromObservableLight(this.observable);
    }
    get value() {
        return this.observable.get();
    }
}
export function observableFromValueWithChangeEvent(owner, value) {
    if (value instanceof ValueWithChangeEventFromObservable) {
        return value.observable;
    }
    return observableFromEvent(owner, value.onDidChange, () => value.value);
}
/**
 * Creates an observable that has the latest changed value of the given observables.
 * Initially (and when not observed), it has the value of the last observable.
 * When observed and any of the observables change, it has the value of the last changed observable.
 * If multiple observables change in the same transaction, the last observable wins.
 */
export function latestChangedValue(owner, observables) {
    if (observables.length === 0) {
        throw new BugIndicatingError();
    }
    let hasLastChangedValue = false;
    let lastChangedValue = undefined;
    const result = observableFromEvent(owner, (cb) => {
        const store = new DisposableStore();
        for (const o of observables) {
            store.add(autorunOpts({
                debugName: () => getDebugName(result, new DebugNameData(owner, undefined, undefined)) +
                    '.updateLastChangedValue',
            }, (reader) => {
                hasLastChangedValue = true;
                lastChangedValue = o.read(reader);
                cb();
            }));
        }
        store.add({
            dispose() {
                hasLastChangedValue = false;
                lastChangedValue = undefined;
            },
        });
        return store;
    }, () => {
        if (hasLastChangedValue) {
            return lastChangedValue;
        }
        else {
            return observables[observables.length - 1].get();
        }
    });
    return result;
}
/**
 * Works like a derived.
 * However, if the value is not undefined, it is cached and will not be recomputed anymore.
 * In that case, the derived will unsubscribe from its dependencies.
 */
export function derivedConstOnceDefined(owner, fn) {
    return derivedObservableWithCache(owner, (reader, lastValue) => lastValue ?? fn(reader));
}
export function runOnChange(observable, cb) {
    let _previousValue;
    return autorunWithStoreHandleChanges({
        createEmptyChangeSummary: () => ({
            deltas: [],
            didChange: false,
        }),
        handleChange: (context, changeSummary) => {
            if (context.didChange(observable)) {
                const e = context.change;
                if (e !== undefined) {
                    changeSummary.deltas.push(e);
                }
                changeSummary.didChange = true;
            }
            return true;
        },
    }, (reader, changeSummary) => {
        const value = observable.read(reader);
        const previousValue = _previousValue;
        if (changeSummary.didChange) {
            _previousValue = value;
            cb(value, previousValue, changeSummary.deltas);
        }
    });
}
export function runOnChangeWithStore(observable, cb) {
    const store = new DisposableStore();
    const disposable = runOnChange(observable, (value, previousValue, deltas) => {
        store.clear();
        cb(value, previousValue, deltas, store);
    });
    return {
        dispose() {
            disposable.dispose();
            store.dispose();
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlSW50ZXJuYWwvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDbEYsT0FBTyxFQUNOLGNBQWMsRUFDZCxvQkFBb0IsRUFNcEIsZ0JBQWdCLEVBQ2hCLGlDQUFpQyxFQUNqQyxlQUFlLEVBQ2YsY0FBYyxFQUNkLFdBQVcsR0FDWCxNQUFNLFdBQVcsQ0FBQTtBQUNsQixPQUFPLEVBQUUsYUFBYSxFQUE4QixZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN4RixPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFFZixLQUFLLEVBR0wsWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVoRDs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUksS0FBUTtJQUMxQyxPQUFPLElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ2xDLENBQUM7QUFFRCxNQUFNLGVBQW1CLFNBQVEsb0JBQTZCO0lBQzdELFlBQTZCLEtBQVE7UUFDcEMsS0FBSyxFQUFFLENBQUE7UUFEcUIsVUFBSyxHQUFMLEtBQUssQ0FBRztJQUVyQyxDQUFDO0lBRUQsSUFBb0IsU0FBUztRQUM1QixPQUFPLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRU0sR0FBRztRQUNULE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQTtJQUNsQixD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