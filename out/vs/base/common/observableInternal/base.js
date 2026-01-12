/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData, getFunctionName } from './debugName.js';
import { strictEquals, } from './commonFacade/deps.js';
import { getLogger, logObservable } from './logging/logging.js';
import { onUnexpectedError } from '../errors.js';
let _recomputeInitiallyAndOnChange;
export function _setRecomputeInitiallyAndOnChange(recomputeInitiallyAndOnChange) {
    _recomputeInitiallyAndOnChange = recomputeInitiallyAndOnChange;
}
let _keepObserved;
export function _setKeepObserved(keepObserved) {
    _keepObserved = keepObserved;
}
let _derived;
/**
 * @internal
 * This is to allow splitting files.
 */
export function _setDerivedOpts(derived) {
    _derived = derived;
}
export class ConvenientObservable {
    get TChange() {
        return null;
    }
    reportChanges() {
        this.get();
    }
    /** @sealed */
    read(reader) {
        if (reader) {
            return reader.readObservable(this);
        }
        else {
            return this.get();
        }
    }
    map(fnOrOwner, fnOrUndefined) {
        const owner = fnOrUndefined === undefined ? undefined : fnOrOwner;
        const fn = fnOrUndefined === undefined
            ? fnOrOwner
            : fnOrUndefined;
        return _derived({
            owner,
            debugName: () => {
                const name = getFunctionName(fn);
                if (name !== undefined) {
                    return name;
                }
                // regexp to match `x => x.y` or `x => x?.y` where x and y can be arbitrary identifiers (uses backref):
                const regexp = /^\s*\(?\s*([a-zA-Z_$][a-zA-Z_$0-9]*)\s*\)?\s*=>\s*\1(?:\??)\.([a-zA-Z_$][a-zA-Z_$0-9]*)\s*$/;
                const match = regexp.exec(fn.toString());
                if (match) {
                    return `${this.debugName}.${match[2]}`;
                }
                if (!owner) {
                    return `${this.debugName} (mapped)`;
                }
                return undefined;
            },
            debugReferenceFn: fn,
        }, (reader) => fn(this.read(reader), reader));
    }
    /**
     * @sealed
     * Converts an observable of an observable value into a direct observable of the value.
     */
    flatten() {
        return _derived({
            owner: undefined,
            debugName: () => `${this.debugName} (flattened)`,
        }, (reader) => this.read(reader).read(reader));
    }
    recomputeInitiallyAndOnChange(store, handleValue) {
        store.add(_recomputeInitiallyAndOnChange(this, handleValue));
        return this;
    }
    /**
     * Ensures that this observable is observed. This keeps the cache alive.
     * However, in case of deriveds, it does not force eager evaluation (only when the value is read/get).
     * Use `recomputeInitiallyAndOnChange` for eager evaluation.
     */
    keepObserved(store) {
        store.add(_keepObserved(this));
        return this;
    }
    get debugValue() {
        return this.get();
    }
}
export class BaseObservable extends ConvenientObservable {
    constructor() {
        super();
        this._observers = new Set();
        getLogger()?.handleObservableCreated(this);
    }
    addObserver(observer) {
        const len = this._observers.size;
        this._observers.add(observer);
        if (len === 0) {
            this.onFirstObserverAdded();
        }
        if (len !== this._observers.size) {
            getLogger()?.handleOnListenerCountChanged(this, this._observers.size);
        }
    }
    removeObserver(observer) {
        const deleted = this._observers.delete(observer);
        if (deleted && this._observers.size === 0) {
            this.onLastObserverRemoved();
        }
        if (deleted) {
            getLogger()?.handleOnListenerCountChanged(this, this._observers.size);
        }
    }
    onFirstObserverAdded() { }
    onLastObserverRemoved() { }
    log() {
        const hadLogger = !!getLogger();
        logObservable(this);
        if (!hadLogger) {
            getLogger()?.handleObservableCreated(this);
        }
        return this;
    }
    debugGetObservers() {
        return this._observers;
    }
}
/**
 * Starts a transaction in which many observables can be changed at once.
 * {@link fn} should start with a JS Doc using `@description` to give the transaction a debug name.
 * Reaction run on demand or when the transaction ends.
 */
export function transaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        fn(tx);
    }
    finally {
        tx.finish();
    }
}
let _globalTransaction = undefined;
export function globalTransaction(fn) {
    if (_globalTransaction) {
        fn(_globalTransaction);
    }
    else {
        const tx = new TransactionImpl(fn, undefined);
        _globalTransaction = tx;
        try {
            fn(tx);
        }
        finally {
            tx.finish(); // During finish, more actions might be added to the transaction.
            // Which is why we only clear the global transaction after finish.
            _globalTransaction = undefined;
        }
    }
}
export async function asyncTransaction(fn, getDebugName) {
    const tx = new TransactionImpl(fn, getDebugName);
    try {
        await fn(tx);
    }
    finally {
        tx.finish();
    }
}
/**
 * Allows to chain transactions.
 */
export function subtransaction(tx, fn, getDebugName) {
    if (!tx) {
        transaction(fn, getDebugName);
    }
    else {
        fn(tx);
    }
}
export class TransactionImpl {
    constructor(_fn, _getDebugName) {
        this._fn = _fn;
        this._getDebugName = _getDebugName;
        this._updatingObservers = [];
        getLogger()?.handleBeginTransaction(this);
    }
    getDebugName() {
        if (this._getDebugName) {
            return this._getDebugName();
        }
        return getFunctionName(this._fn);
    }
    updateObserver(observer, observable) {
        if (!this._updatingObservers) {
            // This happens when a transaction is used in a callback or async function.
            // If an async transaction is used, make sure the promise awaits all users of the transaction (e.g. no race).
            handleBugIndicatingErrorRecovery('Transaction already finished!');
            // Error recovery
            transaction((tx) => {
                tx.updateObserver(observer, observable);
            });
            return;
        }
        // When this gets called while finish is active, they will still get considered
        this._updatingObservers.push({ observer, observable });
        observer.beginUpdate(observable);
    }
    finish() {
        const updatingObservers = this._updatingObservers;
        if (!updatingObservers) {
            handleBugIndicatingErrorRecovery('transaction.finish() has already been called!');
            return;
        }
        for (let i = 0; i < updatingObservers.length; i++) {
            const { observer, observable } = updatingObservers[i];
            observer.endUpdate(observable);
        }
        // Prevent anyone from updating observers from now on.
        this._updatingObservers = null;
        getLogger()?.handleEndTransaction(this);
    }
    debugGetUpdatingObservers() {
        return this._updatingObservers;
    }
}
/**
 * This function is used to indicate that the caller recovered from an error that indicates a bug.
 */
function handleBugIndicatingErrorRecovery(message) {
    const err = new Error('BugIndicatingErrorRecovery: ' + message);
    onUnexpectedError(err);
    console.error('recovered from an error that indicates a bug', err);
}
export function observableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new ObservableValue(debugNameData, initialValue, strictEquals);
}
export class ObservableValue extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? 'ObservableValue';
    }
    constructor(_debugNameData, initialValue, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._equalityComparator = _equalityComparator;
        this._value = initialValue;
        getLogger()?.handleObservableUpdated(this, {
            hadValue: false,
            newValue: initialValue,
            change: undefined,
            didChange: true,
            oldValue: undefined,
        });
    }
    get() {
        return this._value;
    }
    set(value, tx, change) {
        if (change === undefined && this._equalityComparator(this._value, value)) {
            return;
        }
        let _tx;
        if (!tx) {
            tx = _tx = new TransactionImpl(() => { }, () => `Setting ${this.debugName}`);
        }
        try {
            const oldValue = this._value;
            this._setValue(value);
            getLogger()?.handleObservableUpdated(this, {
                oldValue,
                newValue: value,
                change,
                didChange: true,
                hadValue: true,
            });
            for (const observer of this._observers) {
                tx.updateObserver(observer, this);
                observer.handleChange(this, change);
            }
        }
        finally {
            if (_tx) {
                _tx.finish();
            }
        }
    }
    toString() {
        return `${this.debugName}: ${this._value}`;
    }
    _setValue(newValue) {
        this._value = newValue;
    }
    debugGetState() {
        return {
            value: this._value,
        };
    }
    debugSetValue(value) {
        this._value = value;
    }
}
/**
 * A disposable observable. When disposed, its value is also disposed.
 * When a new value is set, the previous value is disposed.
 */
export function disposableObservableValue(nameOrOwner, initialValue) {
    let debugNameData;
    if (typeof nameOrOwner === 'string') {
        debugNameData = new DebugNameData(undefined, nameOrOwner, undefined);
    }
    else {
        debugNameData = new DebugNameData(nameOrOwner, undefined, undefined);
    }
    return new DisposableObservableValue(debugNameData, initialValue, strictEquals);
}
export class DisposableObservableValue extends ObservableValue {
    _setValue(newValue) {
        if (this._value === newValue) {
            return;
        }
        if (this._value) {
            this._value.dispose();
        }
        this._value = newValue;
    }
    dispose() {
        this._value?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2Jhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBYyxlQUFlLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMzRSxPQUFPLEVBSU4sWUFBWSxHQUNaLE1BQU0sd0JBQXdCLENBQUE7QUFFL0IsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxjQUFjLENBQUE7QUE4S2hELElBQUksOEJBQW9FLENBQUE7QUFDeEUsTUFBTSxVQUFVLGlDQUFpQyxDQUNoRCw2QkFBb0U7SUFFcEUsOEJBQThCLEdBQUcsNkJBQTZCLENBQUE7QUFDL0QsQ0FBQztBQUVELElBQUksYUFBa0MsQ0FBQTtBQUN0QyxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsWUFBa0M7SUFDbEUsYUFBYSxHQUFHLFlBQVksQ0FBQTtBQUM3QixDQUFDO0FBRUQsSUFBSSxRQUE0QixDQUFBO0FBQ2hDOzs7R0FHRztBQUNILE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBd0I7SUFDdkQsUUFBUSxHQUFHLE9BQU8sQ0FBQTtBQUNuQixDQUFDO0FBRUQsTUFBTSxPQUFnQixvQkFBb0I7SUFHekMsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFLLENBQUE7SUFDYixDQUFDO0lBSU0sYUFBYTtRQUNuQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDWCxDQUFDO0lBS0QsY0FBYztJQUNQLElBQUksQ0FBQyxNQUEyQjtRQUN0QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FB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