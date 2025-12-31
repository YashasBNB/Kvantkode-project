/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseObservable, _setDerivedOpts, } from './base.js';
import { DebugNameData } from './debugName.js';
import { BugIndicatingError, DisposableStore, assertFn, onBugIndicatingError, strictEquals, } from './commonFacade/deps.js';
import { getLogger } from './logging/logging.js';
export function derived(computeFnOrOwner, computeFn) {
    if (computeFn !== undefined) {
        return new Derived(new DebugNameData(computeFnOrOwner, undefined, computeFn), computeFn, undefined, undefined, undefined, strictEquals);
    }
    return new Derived(new DebugNameData(undefined, undefined, computeFnOrOwner), computeFnOrOwner, undefined, undefined, undefined, strictEquals);
}
export function derivedWithSetter(owner, computeFn, setter) {
    return new DerivedWithSetter(new DebugNameData(owner, undefined, computeFn), computeFn, undefined, undefined, undefined, strictEquals, setter);
}
export function derivedOpts(options, computeFn) {
    return new Derived(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn), computeFn, undefined, undefined, options.onLastObserverRemoved, options.equalsFn ?? strictEquals);
}
_setDerivedOpts(derivedOpts);
/**
 * Represents an observable that is derived from other observables.
 * The value is only recomputed when absolutely needed.
 *
 * {@link computeFn} should start with a JS Doc using `@description` to name the derived.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The compute function is given the last change summary.
 * The change summary is discarded after the compute function was called.
 *
 * @see derived
 */
export function derivedHandleChanges(options, computeFn) {
    return new Derived(new DebugNameData(options.owner, options.debugName, undefined), computeFn, options.createEmptyChangeSummary, options.handleChange, undefined, options.equalityComparer ?? strictEquals);
}
export function derivedWithStore(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    // Intentionally re-assigned in case an inactive observable is re-used later
    // eslint-disable-next-line local/code-no-potentially-unsafe-disposables
    let store = new DisposableStore();
    return new Derived(new DebugNameData(owner, undefined, computeFn), (r) => {
        if (store.isDisposed) {
            store = new DisposableStore();
        }
        else {
            store.clear();
        }
        return computeFn(r, store);
    }, undefined, undefined, () => store.dispose(), strictEquals);
}
export function derivedDisposable(computeFnOrOwner, computeFnOrUndefined) {
    let computeFn;
    let owner;
    if (computeFnOrUndefined === undefined) {
        computeFn = computeFnOrOwner;
        owner = undefined;
    }
    else {
        owner = computeFnOrOwner;
        computeFn = computeFnOrUndefined;
    }
    let store = undefined;
    return new Derived(new DebugNameData(owner, undefined, computeFn), (r) => {
        if (!store) {
            store = new DisposableStore();
        }
        else {
            store.clear();
        }
        const result = computeFn(r);
        if (result) {
            store.add(result);
        }
        return result;
    }, undefined, undefined, () => {
        if (store) {
            store.dispose();
            store = undefined;
        }
    }, strictEquals);
}
export var DerivedState;
(function (DerivedState) {
    /** Initial state, no previous value, recomputation needed */
    DerivedState[DerivedState["initial"] = 0] = "initial";
    /**
     * A dependency could have changed.
     * We need to explicitly ask them if at least one dependency changed.
     */
    DerivedState[DerivedState["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
    /**
     * A dependency changed and we need to recompute.
     * After recomputation, we need to check the previous value to see if we changed as well.
     */
    DerivedState[DerivedState["stale"] = 2] = "stale";
    /**
     * No change reported, our cached value is up to date.
     */
    DerivedState[DerivedState["upToDate"] = 3] = "upToDate";
})(DerivedState || (DerivedState = {}));
export class Derived extends BaseObservable {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _computeFn, createChangeSummary, _handleChange, _handleLastObserverRemoved = undefined, _equalityComparator) {
        super();
        this._debugNameData = _debugNameData;
        this._computeFn = _computeFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this._handleLastObserverRemoved = _handleLastObserverRemoved;
        this._equalityComparator = _equalityComparator;
        this._state = 0 /* DerivedState.initial */;
        this._value = undefined;
        this._updateCount = 0;
        this._dependencies = new Set();
        this._dependenciesToBeRemoved = new Set();
        this._changeSummary = undefined;
        this._isUpdating = false;
        this._isComputing = false;
        this._removedObserverToCallEndUpdateOn = null;
        // IReader Implementation
        this._isReaderValid = false;
        this._changeSummary = this.createChangeSummary?.();
    }
    onLastObserverRemoved() {
        /**
         * We are not tracking changes anymore, thus we have to assume
         * that our cache is invalid.
         */
        this._state = 0 /* DerivedState.initial */;
        this._value = undefined;
        getLogger()?.handleDerivedCleared(this);
        for (const d of this._dependencies) {
            d.removeObserver(this);
        }
        this._dependencies.clear();
        this._handleLastObserverRemoved?.();
    }
    get() {
        const checkEnabled = false; // TODO set to true
        if (this._isComputing && checkEnabled) {
            // investigate why this fails in the diff editor!
            throw new BugIndicatingError('Cyclic deriveds are not supported yet!');
        }
        if (this._observers.size === 0) {
            let result;
            // Without observers, we don't know when to clean up stuff.
            // Thus, we don't cache anything to prevent memory leaks.
            try {
                this._isReaderValid = true;
                result = this._computeFn(this, this.createChangeSummary?.());
            }
            finally {
                this._isReaderValid = false;
            }
            // Clear new dependencies
            this.onLastObserverRemoved();
            return result;
        }
        else {
            do {
                // We might not get a notification for a dependency that changed while it is updating,
                // thus we also have to ask all our depedencies if they changed in this case.
                if (this._state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    for (const d of this._dependencies) {
                        /** might call {@link handleChange} indirectly, which could make us stale */
                        d.reportChanges();
                        if (this._state === 2 /* DerivedState.stale */) {
                            // The other dependencies will refresh on demand, so early break
                            break;
                        }
                    }
                }
                // We called report changes of all dependencies.
                // If we are still not stale, we can assume to be up to date again.
                if (this._state === 1 /* DerivedState.dependenciesMightHaveChanged */) {
                    this._state = 3 /* DerivedState.upToDate */;
                }
                if (this._state !== 3 /* DerivedState.upToDate */) {
                    this._recompute();
                }
                // In case recomputation changed one of our dependencies, we need to recompute again.
            } while (this._state !== 3 /* DerivedState.upToDate */);
            return this._value;
        }
    }
    _recompute() {
        const emptySet = this._dependenciesToBeRemoved;
        this._dependenciesToBeRemoved = this._dependencies;
        this._dependencies = emptySet;
        const hadValue = this._state !== 0 /* DerivedState.initial */;
        const oldValue = this._value;
        this._state = 3 /* DerivedState.upToDate */;
        let didChange = false;
        this._isComputing = true;
        try {
            const changeSummary = this._changeSummary;
            this._changeSummary = this.createChangeSummary?.();
            try {
                this._isReaderValid = true;
                /** might call {@link handleChange} indirectly, which could invalidate us */
                this._value = this._computeFn(this, changeSummary);
            }
            finally {
                this._isReaderValid = false;
                // We don't want our observed observables to think that they are (not even temporarily) not being observed.
                // Thus, we only unsubscribe from observables that are definitely not read anymore.
                for (const o of this._dependenciesToBeRemoved) {
                    o.removeObserver(this);
                }
                this._dependenciesToBeRemoved.clear();
            }
            didChange = hadValue && !this._equalityComparator(oldValue, this._value);
            getLogger()?.handleObservableUpdated(this, {
                oldValue,
                newValue: this._value,
                change: undefined,
                didChange,
                hadValue,
            });
        }
        catch (e) {
            onBugIndicatingError(e);
        }
        this._isComputing = false;
        if (didChange) {
            for (const r of this._observers) {
                r.handleChange(this, undefined);
            }
        }
    }
    toString() {
        return `LazyDerived<${this.debugName}>`;
    }
    // IObserver Implementation
    beginUpdate(_observable) {
        if (this._isUpdating) {
            throw new BugIndicatingError('Cyclic deriveds are not supported yet!');
        }
        this._updateCount++;
        this._isUpdating = true;
        try {
            const propagateBeginUpdate = this._updateCount === 1;
            if (this._state === 3 /* DerivedState.upToDate */) {
                this._state = 1 /* DerivedState.dependenciesMightHaveChanged */;
                // If we propagate begin update, that will already signal a possible change.
                if (!propagateBeginUpdate) {
                    for (const r of this._observers) {
                        r.handlePossibleChange(this);
                    }
                }
            }
            if (propagateBeginUpdate) {
                for (const r of this._observers) {
                    r.beginUpdate(this); // This signals a possible change
                }
            }
        }
        finally {
            this._isUpdating = false;
        }
    }
    endUpdate(_observable) {
        this._updateCount--;
        if (this._updateCount === 0) {
            // End update could change the observer list.
            const observers = [...this._observers];
            for (const r of observers) {
                r.endUpdate(this);
            }
            if (this._removedObserverToCallEndUpdateOn) {
                const observers = [...this._removedObserverToCallEndUpdateOn];
                this._removedObserverToCallEndUpdateOn = null;
                for (const r of observers) {
                    r.endUpdate(this);
                }
            }
        }
        assertFn(() => this._updateCount >= 0);
    }
    handlePossibleChange(observable) {
        // In all other states, observers already know that we might have changed.
        if (this._state === 3 /* DerivedState.upToDate */ &&
            this._dependencies.has(observable) &&
            !this._dependenciesToBeRemoved.has(observable)) {
            this._state = 1 /* DerivedState.dependenciesMightHaveChanged */;
            for (const r of this._observers) {
                r.handlePossibleChange(this);
            }
        }
    }
    handleChange(observable, change) {
        if (this._dependencies.has(observable) && !this._dependenciesToBeRemoved.has(observable)) {
            getLogger()?.handleDerivedDependencyChanged(this, observable, change);
            let shouldReact = false;
            try {
                shouldReact = this._handleChange
                    ? this._handleChange({
                        changedObservable: observable,
                        change,
                        didChange: (o) => o === observable,
                    }, this._changeSummary)
                    : true;
            }
            catch (e) {
                onBugIndicatingError(e);
            }
            const wasUpToDate = this._state === 3 /* DerivedState.upToDate */;
            if (shouldReact &&
                (this._state === 1 /* DerivedState.dependenciesMightHaveChanged */ || wasUpToDate)) {
                this._state = 2 /* DerivedState.stale */;
                if (wasUpToDate) {
                    for (const r of this._observers) {
                        r.handlePossibleChange(this);
                    }
                }
            }
        }
    }
    readObservable(observable) {
        if (!this._isReaderValid) {
            throw new BugIndicatingError('The reader object cannot be used outside its compute function!');
        }
        // Subscribe before getting the value to enable caching
        observable.addObserver(this);
        /** This might call {@link handleChange} indirectly, which could invalidate us */
        const value = observable.get();
        // Which is why we only add the observable to the dependencies now.
        this._dependencies.add(observable);
        this._dependenciesToBeRemoved.delete(observable);
        return value;
    }
    addObserver(observer) {
        const shouldCallBeginUpdate = !this._observers.has(observer) && this._updateCount > 0;
        super.addObserver(observer);
        if (shouldCallBeginUpdate) {
            if (this._removedObserverToCallEndUpdateOn &&
                this._removedObserverToCallEndUpdateOn.has(observer)) {
                this._removedObserverToCallEndUpdateOn.delete(observer);
            }
            else {
                observer.beginUpdate(this);
            }
        }
    }
    removeObserver(observer) {
        if (this._observers.has(observer) && this._updateCount > 0) {
            if (!this._removedObserverToCallEndUpdateOn) {
                this._removedObserverToCallEndUpdateOn = new Set();
            }
            this._removedObserverToCallEndUpdateOn.add(observer);
        }
        super.removeObserver(observer);
    }
    debugGetState() {
        return {
            state: this._state,
            updateCount: this._updateCount,
            isComputing: this._isComputing,
            dependencies: this._dependencies,
            value: this._value,
        };
    }
    debugSetValue(newValue) {
        this._value = newValue;
    }
}
export class DerivedWithSetter extends Derived {
    constructor(debugNameData, computeFn, createChangeSummary, handleChange, handleLastObserverRemoved = undefined, equalityComparator, set) {
        super(debugNameData, computeFn, createChangeSummary, handleChange, handleLastObserverRemoved, equalityComparator);
        this.set = set;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVyaXZlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9kZXJpdmVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTixjQUFjLEVBUWQsZUFBZSxHQUNmLE1BQU0sV0FBVyxDQUFBO0FBQ2xCLE9BQU8sRUFBRSxhQUFhLEVBQThCLE1BQU0sZ0JBQWdCLENBQUE7QUFDMUUsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixlQUFlLEVBR2YsUUFBUSxFQUNSLG9CQUFvQixFQUNwQixZQUFZLEdBQ1osTUFBTSx3QkFBd0IsQ0FBQTtBQUMvQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFVaEQsTUFBTSxVQUFVLE9BQU8sQ0FDdEIsZ0JBQXVELEVBQ3ZELFNBQWdEO0lBRWhELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksYUFBYSxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFDekQsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFBO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsZ0JBQXVCLENBQUMsRUFDaEUsZ0JBQXVCLEVBQ3ZCLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFlBQVksQ0FDWixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsS0FBNkIsRUFDN0IsU0FBaUMsRUFDakMsTUFBaUU7SUFFakUsT0FBTyxJQUFJLGlCQUFpQixDQUMzQixJQUFJLGFBQWEsQ0FBQyxLQUFLLEVB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