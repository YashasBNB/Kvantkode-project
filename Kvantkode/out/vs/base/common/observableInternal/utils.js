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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNsRixPQUFPLEVBQ04sY0FBYyxFQUNkLG9CQUFvQixFQU1wQixnQkFBZ0IsRUFDaEIsaUNBQWlDLEVBQ2pDLGVBQWUsRUFDZixjQUFjLEVBQ2QsV0FBVyxHQUNYLE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBRSxhQUFhLEVBQThCLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ3hGLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsZUFBZSxFQUVmLEtBQUssRUFHTCxZQUFZLEVBQ1osWUFBWSxHQUNaLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDbkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRWhEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWUsQ0FBSSxLQUFRO0lBQzFDLE9BQU8sSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDbEMsQ0FBQztBQUVELE1BQU0sZUFBbUIsU0FBUSxvQkFBNkI7SUFDN0QsWUFBNkIsS0FBUTtRQUNwQyxLQUFLLEVBQUUsQ0FBQTtRQURxQixVQUFLLEdBQUwsS0FBSyxDQUFHO0lBRXJDLENBQUM7SUFFRCxJQUFvQixTQUFTO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3ZCLENBQUM7SUFFTSxHQUFHO1FBQ1QsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFBO0lB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