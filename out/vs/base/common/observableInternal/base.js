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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9iYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQWMsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0UsT0FBTyxFQUlOLFlBQVksR0FDWixNQUFNLHdCQUF3QixDQUFBO0FBRS9CLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBOEtoRCxJQUFJLDhCQUFvRSxDQUFBO0FBQ3hFLE1BQU0sVUFBVSxpQ0FBaUMsQ0FDaEQsNkJBQW9FO0lBRXBFLDhCQUE4QixHQUFHLDZCQUE2QixDQUFBO0FBQy9ELENBQUM7QUFFRCxJQUFJLGFBQWtDLENBQUE7QUFDdEMsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFlBQWtDO0lBQ2xFLGFBQWEsR0FBRyxZQUFZLENBQUE7QUFDN0IsQ0FBQztBQUVELElBQUksUUFBNEIsQ0FBQTtBQUNoQzs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUFDLE9BQXdCO0lBQ3ZELFFBQVEsR0FBRyxPQUFPLENBQUE7QUFDbkIsQ0FBQztBQUVELE1BQU0sT0FBZ0Isb0JBQW9CO0lBR3pDLElBQUksT0FBTztRQUNWLE9BQU8sSUFBSyxDQUFBO0lBQ2IsQ0FBQztJQUlNLGFBQWE7UUFDbkIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ1gsQ0FBQztJQUtELGNBQWM7SUFDUCxJQUFJLENBQUMsTUFBMkI7UUFDdEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDO0lBS00sR0FBRyxDQUNULFNBQTZELEVBQzdELGFBQW1EO1FBRW5ELE1BQU0sS0FBSyxHQUFHLGFBQWEsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUUsU0FBd0IsQ0FBQTtRQUNqRixNQUFNLEVBQUUsR0FDUCxhQUFhLEtBQUssU0FBUztZQUMxQixDQUFDLENBQUUsU0FBaUQ7WUFDcEQsQ0FBQyxDQUFDLGFBQWEsQ0FBQTtRQUVqQixPQUFPLFFBQVEsQ0FDZDtZQUNDLEtBQUs7WUFDTCxTQUFTLEVBQUUsR0FBRyxFQUFFO2dCQUNmLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDaEMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7b0JBQ3hCLE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUM7Z0JBRUQsdUdBQXVHO2dCQUN2RyxNQUFNLE1BQU0sR0FDWCw2RkFBNkYsQ0FBQTtnQkFDOUYsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtnQkFDeEMsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtnQkFDdkMsQ0FBQztnQkFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ1osT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLFdBQVcsQ0FBQTtnQkFDcEMsQ0FBQztnQkFDRCxPQUFPLFNBQVMsQ0FBQTtZQUNqQixDQUFDO1lBQ0QsZ0JBQWdCLEVBQUUsRUFBRTtTQUNwQixFQUNELENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FDekMsQ0FBQTtJQUNGLENBQUM7SUFJRDs7O09BR0c7SUFDSSxPQUFPO1FBQ2IsT0FBTyxRQUFRLENBQ2Q7WUFDQyxLQUFLLEVBQUUsU0FBUztZQUNoQixTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxjQUFjO1NBQ2hELEVBQ0QsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUMxQyxDQUFBO0lBQ0YsQ0FBQztJQUVNLDZCQUE2QixDQUNuQyxLQUFzQixFQUN0QixXQUFnQztRQUVoQyxLQUFLLENBQUMsR0FBRyxDQUFDLDhCQUErQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQzdELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVEOzs7O09BSUc7SUFDSSxZQUFZLENBQUMsS0FBc0I7UUFDekMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxhQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMvQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFJRCxJQUFjLFVBQVU7UUFDdkIsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDbEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFnQixjQUFrQyxTQUFRLG9CQUFnQztJQUcvRjtRQUNDLEtBQUssRUFBRSxDQUFBO1FBSFcsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFhLENBQUE7UUFJbkQsU0FBUyxFQUFFLEVBQUUsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVNLFdBQVcsQ0FBQyxRQUFtQjtRQUNyQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQTtRQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3QixJQUFJLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBQzVCLENBQUM7UUFDRCxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2xDLFNBQVMsRUFBRSxFQUFFLDRCQUE0QixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RFLENBQUM7SUFDRixDQUFDO0lBRU0sY0FBYyxDQUFDLFFBQW1CO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hELElBQUksT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1FBQzdCLENBQUM7UUFDRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsU0FBUyxFQUFFLEVBQUUsNEJBQTRCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEUsQ0FBQztJQUNGLENBQUM7SUFFUyxvQkFBb0IsS0FBVSxDQUFDO0lBQy9CLHFCQUFxQixLQUFVLENBQUM7SUFFMUIsR0FBRztRQUNsQixNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUE7UUFDL0IsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25CLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixTQUFTLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMzQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRU0saUJBQWlCO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0NBQ0Q7QUFFRDs7OztHQUlHO0FBRUgsTUFBTSxVQUFVLFdBQVcsQ0FBQyxFQUE4QixFQUFFLFlBQTJCO0lBQ3RGLE1BQU0sRUFBRSxHQUFHLElBQUksZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUNoRCxJQUFJLENBQUM7UUFDSixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDUCxDQUFDO1lBQVMsQ0FBQztRQUNWLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUNaLENBQUM7QUFDRixDQUFDO0FBRUQsSUFBSSxrQkFBa0IsR0FBNkIsU0FBUyxDQUFBO0FBRTVELE1BQU0sVUFBVSxpQkFBaUIsQ0FBQyxFQUE4QjtJQUMvRCxJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDeEIsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDdkIsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLEVBQUUsR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDN0Msa0JBQWtCLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQztZQUNKLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNQLENBQUM7Z0JBQVMsQ0FBQztZQUNWLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQSxDQUFDLGlFQUFpRTtZQUM3RSxrRUFBa0U7WUFDbEUsa0JBQWtCLEdBQUcsU0FBUyxDQUFBO1FBQy9CLENBQUM7SUFDRixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsZ0JBQWdCLENBQ3JDLEVBQXVDLEVBQ3ZDLFlBQTJCO0lBRTNCLE1BQU0sRUFBRSxHQUFHLElBQUksZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUNoRCxJQUFJLENBQUM7UUFDSixNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNiLENBQUM7WUFBUyxDQUFDO1FBQ1YsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQ1osQ0FBQztBQUNGLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQzdCLEVBQTRCLEVBQzVCLEVBQThCLEVBQzlCLFlBQTJCO0lBRTNCLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNULFdBQVcsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDOUIsQ0FBQztTQUFNLENBQUM7UUFDUCxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDUCxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sT0FBTyxlQUFlO0lBRzNCLFlBQ2lCLEdBQWEsRUFDWixhQUE0QjtRQUQ3QixRQUFHLEdBQUgsR0FBRyxDQUFVO1FBQ1osa0JBQWEsR0FBYixhQUFhLENBQWU7UUFKdEMsdUJBQWtCLEdBQW1FLEVBQUUsQ0FBQTtRQU05RixTQUFTLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRU0sWUFBWTtRQUNsQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUM1QixDQUFDO1FBQ0QsT0FBTyxlQUFlLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFTSxjQUFjLENBQUMsUUFBbUIsRUFBRSxVQUE0QjtRQUN0RSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDOUIsMkVBQTJFO1lBQzNFLDZHQUE2RztZQUM3RyxnQ0FBZ0MsQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO1lBQ2pFLGlCQUFpQjtZQUNqQixXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtnQkFDbEIsRUFBRSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDeEMsQ0FBQyxDQUFDLENBQUE7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELCtFQUErRTtRQUMvRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDdEQsUUFBUSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU0sTUFBTTtRQUNaLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFBO1FBQ2pELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3hCLGdDQUFnQyxDQUFDLCtDQUErQyxDQUFDLENBQUE7WUFDakYsT0FBTTtRQUNQLENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbkQsTUFBTSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyRCxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQy9CLENBQUM7UUFDRCxzREFBc0Q7UUFDdEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUM5QixTQUFTLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0lBRU0seUJBQXlCO1FBQy9CLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFBO0lBQy9CLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsU0FBUyxnQ0FBZ0MsQ0FBQyxPQUFlO0lBQ3hELE1BQU0sR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLDhCQUE4QixHQUFHLE9BQU8sQ0FBQyxDQUFBO0lBQy9ELGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3RCLE9BQU8sQ0FBQyxLQUFLLENBQUMsOENBQThDLEVBQUUsR0FBRyxDQUFDLENBQUE7QUFDbkUsQ0FBQztBQXVCRCxNQUFNLFVBQVUsZUFBZSxDQUM5QixXQUE0QixFQUM1QixZQUFlO0lBRWYsSUFBSSxhQUE0QixDQUFBO0lBQ2hDLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDckMsYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDckUsQ0FBQztTQUFNLENBQUM7UUFDUCxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBQ0QsT0FBTyxJQUFJLGVBQWUsQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO0FBQ3RFLENBQUM7QUFFRCxNQUFNLE9BQU8sZUFDWixTQUFRLGNBQTBCO0lBS2xDLElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksaUJBQWlCLENBQUE7SUFDbkUsQ0FBQztJQUVELFlBQ2tCLGNBQTZCLEVBQzlDLFlBQWUsRUFDRSxtQkFBd0M7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFKVSxtQkFBYyxHQUFkLGNBQWMsQ0FBZTtRQUU3Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBR3pELElBQUksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFBO1FBRTFCLFNBQVMsRUFBRSxFQUFFLHVCQUF1QixDQUFDLElBQUksRUFBRTtZQUMxQyxRQUFRLEVBQUUsS0FBSztZQUNmLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsUUFBUSxFQUFFLFNBQVM7U0FDbkIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUNlLEdBQUc7UUFDbEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFTSxHQUFHLENBQUMsS0FBUSxFQUFFLEVBQTRCLEVBQUUsTUFBZTtRQUNqRSxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxRSxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksR0FBZ0MsQ0FBQTtRQUNwQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDVCxFQUFFLEdBQUcsR0FBRyxHQUFHLElBQUksZUFBZSxDQUM3QixHQUFHLEVBQUUsR0FBRSxDQUFDLEVBQ1IsR0FBRyxFQUFFLENBQUMsV0FBVyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQ2pDLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtZQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3JCLFNBQVMsRUFBRSxFQUFFLHVCQUF1QixDQUFDLElBQUksRUFBRTtnQkFDMUMsUUFBUTtnQkFDUixRQUFRLEVBQUUsS0FBSztnQkFDZixNQUFNO2dCQUNOLFNBQVMsRUFBRSxJQUFJO2dCQUNmLFFBQVEsRUFBRSxJQUFJO2FBQ2QsQ0FBQyxDQUFBO1lBRUYsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ3hDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNqQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUE7WUFDYixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFUSxRQUFRO1FBQ2hCLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0lBRVMsU0FBUyxDQUFDLFFBQVc7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUE7SUFDdkIsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTztZQUNOLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtTQUNsQixDQUFBO0lBQ0YsQ0FBQztJQUVNLGFBQWEsQ0FBQyxLQUFjO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBVSxDQUFBO0lBQ3pCLENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSx5QkFBeUIsQ0FDeEMsV0FBNEIsRUFDNUIsWUFBZTtJQUVmLElBQUksYUFBNEIsQ0FBQTtJQUNoQyxJQUFJLE9BQU8sV0FBVyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JDLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7U0FBTSxDQUFDO1FBQ1AsYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUNELE9BQU8sSUFBSSx5QkFBeUIsQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO0FBQ2hGLENBQUM7QUFFRCxNQUFNLE9BQU8seUJBQ1osU0FBUSxlQUEyQjtJQUdoQixTQUFTLENBQUMsUUFBVztRQUN2QyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDOUIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3RCLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQTtJQUN2QixDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7SUFDdkIsQ0FBQztDQUNEIn0=