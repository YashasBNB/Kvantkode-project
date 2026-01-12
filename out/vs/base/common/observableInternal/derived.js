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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVyaXZlZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vb2JzZXJ2YWJsZUludGVybmFsL2Rlcml2ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGNBQWMsRUFRZCxlQUFlLEdBQ2YsTUFBTSxXQUFXLENBQUE7QUFDbEIsT0FBTyxFQUFFLGFBQWEsRUFBOEIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLGVBQWUsRUFHZixRQUFRLEVBQ1Isb0JBQW9CLEVBQ3BCLFlBQVksR0FDWixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQVVoRCxNQUFNLFVBQVUsT0FBTyxDQUN0QixnQkFBdUQsRUFDdkQsU0FBZ0Q7SUFFaEQsSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FDakIsSUFBSSxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUN6RCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLE9BQU8sQ0FDakIsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxnQkFBdUIsQ0FBQyxFQUNoRSxnQkFBdUIsRUFDdkIsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsWUFBWSxDQUNaLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxLQUE2QixFQUM3QixTQUFpQyxFQUNqQyxNQUFpRTtJQUVqRSxPQUFPLElBQUksaUJBQWlCLENBQzNCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlDLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxZQUFZLEVBQ1osTUFBTSxDQUNOLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsT0FHQyxFQUNELFNBQWlDO0lBRWpDLE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFDN0UsU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsT0FBTyxDQUFDLHFCQUFxQixFQUM3QixPQUFPLENBQUMsUUFBUSxJQUFJLFlBQVksQ0FDaEMsQ0FBQTtBQUNGLENBQUM7QUFFRCxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUE7QUFFNUI7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxPQUlDLEVBQ0QsU0FBZ0U7SUFFaEUsT0FBTyxJQUFJLE9BQU8sQ0FDakIsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUM5RCxTQUFTLEVBQ1QsT0FBTyxDQUFDLHdCQUF3QixFQUNoQyxPQUFPLENBQUMsWUFBWSxFQUNwQixTQUFTLEVBQ1QsT0FBTyxDQUFDLGdCQUFnQixJQUFJLFlBQVksQ0FDeEMsQ0FBQTtBQUNGLENBQUM7QUFTRCxNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLGdCQUErRSxFQUMvRSxvQkFBcUU7SUFFckUsSUFBSSxTQUF5RCxDQUFBO0lBQzdELElBQUksS0FBaUIsQ0FBQTtJQUNyQixJQUFJLG9CQUFvQixLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLFNBQVMsR0FBRyxnQkFBdUIsQ0FBQTtRQUNuQyxLQUFLLEdBQUcsU0FBUyxDQUFBO0lBQ2xCLENBQUM7U0FBTSxDQUFDO1FBQ1AsS0FBSyxHQUFHLGdCQUFnQixDQUFBO1FBQ3hCLFNBQVMsR0FBRyxvQkFBMkIsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsNEVBQTRFO0lBQzVFLHdFQUF3RTtJQUN4RSxJQUFJLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRWpDLE9BQU8sSUFBSSxPQUFPLENBQ2pCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLEVBQzlDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDTCxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUM5QixDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNkLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDM0IsQ0FBQyxFQUNELFNBQVMsRUFDVCxTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxFQUNyQixZQUFZLENBQ1osQ0FBQTtBQUNGLENBQUM7QUFTRCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLGdCQUF1RCxFQUN2RCxvQkFBNkM7SUFFN0MsSUFBSSxTQUFpQyxDQUFBO0lBQ3JDLElBQUksS0FBaUIsQ0FBQTtJQUNyQixJQUFJLG9CQUFvQixLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3hDLFNBQVMsR0FBRyxnQkFBdUIsQ0FBQTtRQUNuQyxLQUFLLEdBQUcsU0FBUyxDQUFBO0lBQ2xCLENBQUM7U0FBTSxDQUFDO1FBQ1AsS0FBSyxHQUFHLGdCQUFnQixDQUFBO1FBQ3hCLFNBQVMsR0FBRyxvQkFBMkIsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsSUFBSSxLQUFLLEdBQWdDLFNBQVMsQ0FBQTtJQUNsRCxPQUFPLElBQUksT0FBTyxDQUNqQixJQUFJLGFBQWEsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxFQUM5QyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ0wsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDZCxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNCLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ2xCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUMsRUFDRCxTQUFTLEVBQ1QsU0FBUyxFQUNULEdBQUcsRUFBRTtRQUNKLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixLQUFLLEdBQUcsU0FBUyxDQUFBO1FBQ2xCLENBQUM7SUFDRixDQUFDLEVBQ0QsWUFBWSxDQUNaLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxDQUFOLElBQWtCLFlBb0JqQjtBQXBCRCxXQUFrQixZQUFZO0lBQzdCLDZEQUE2RDtJQUM3RCxxREFBVyxDQUFBO0lBRVg7OztPQUdHO0lBQ0gsK0ZBQWdDLENBQUE7SUFFaEM7OztPQUdHO0lBQ0gsaURBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsdURBQVksQ0FBQTtBQUNiLENBQUMsRUFwQmlCLFlBQVksS0FBWixZQUFZLFFBb0I3QjtBQUVELE1BQU0sT0FBTyxPQUNaLFNBQVEsY0FBdUI7SUFZL0IsSUFBb0IsU0FBUztRQUM1QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsWUFDaUIsY0FBNkIsRUFDN0IsVUFBaUUsRUFDaEUsbUJBQXVELEVBQ3ZELGFBRUwsRUFDSyw2QkFBdUQsU0FBUyxFQUNoRSxtQkFBd0M7UUFFekQsS0FBSyxFQUFFLENBQUE7UUFUUyxtQkFBYyxHQUFkLGNBQWMsQ0FBZTtRQUM3QixlQUFVLEdBQVYsVUFBVSxDQUF1RDtRQUNoRSx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQW9DO1FBQ3ZELGtCQUFhLEdBQWIsYUFBYSxDQUVsQjtRQUNLLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0M7UUFDaEUsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQXJCbEQsV0FBTSxnQ0FBdUI7UUFDN0IsV0FBTSxHQUFrQixTQUFTLENBQUE7UUFDakMsaUJBQVksR0FBRyxDQUFDLENBQUE7UUFDaEIsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtRQUMzQyw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBb0IsQ0FBQTtRQUN0RCxtQkFBYyxHQUErQixTQUFTLENBQUE7UUFDdEQsZ0JBQVcsR0FBRyxLQUFLLENBQUE7UUFDbkIsaUJBQVksR0FBRyxLQUFLLENBQUE7UUE2S3BCLHNDQUFpQyxHQUEwQixJQUFJLENBQUE7UUF5RXZFLHlCQUF5QjtRQUNqQixtQkFBYyxHQUFHLEtBQUssQ0FBQTtRQXRPN0IsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFBO0lBQ25ELENBQUM7SUFFa0IscUJBQXFCO1FBQ3ZDOzs7V0FHRztRQUNILElBQUksQ0FBQyxNQUFNLCtCQUF1QixDQUFBO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFBO1FBQ3ZCLFNBQVMsRUFBRSxFQUFFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdkIsQ0FBQztRQUNELElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFMUIsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQTtJQUNwQyxDQUFDO0lBRWUsR0FBRztRQUNsQixNQUFNLFlBQVksR0FBRyxLQUFLLENBQUEsQ0FBQyxtQkFBbUI7UUFDOUMsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3ZDLGlEQUFpRDtZQUNqRCxNQUFNLElBQUksa0JBQWtCLENBQUMsd0NBQXdDLENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxJQUFJLE1BQU0sQ0FBQTtZQUNWLDJEQUEyRDtZQUMzRCx5REFBeUQ7WUFDekQsSUFBSSxDQUFDO2dCQUNKLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFBO2dCQUMxQixNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUcsQ0FBQyxDQUFBO1lBQzlELENBQUM7b0JBQVMsQ0FBQztnQkFDVixJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQTtZQUM1QixDQUFDO1lBQ0QseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQzVCLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQzthQUFNLENBQUM7WUFDUCxHQUFHLENBQUM7Z0JBQ0gsc0ZBQXNGO2dCQUN0Riw2RUFBNkU7Z0JBQzdFLElBQUksSUFBSSxDQUFDLE1BQU0sc0RBQThDLEVBQUUsQ0FBQztvQkFDL0QsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQ3BDLDRFQUE0RTt3QkFDNUUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFBO3dCQUVqQixJQUFLLElBQUksQ0FBQyxNQUF1QiwrQkFBdUIsRUFBRSxDQUFDOzRCQUMxRCxnRUFBZ0U7NEJBQ2hFLE1BQUs7d0JBQ04sQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBRUQsZ0RBQWdEO2dCQUNoRCxtRUFBbUU7Z0JBQ25FLElBQUksSUFBSSxDQUFDLE1BQU0sc0RBQThDLEVBQUUsQ0FBQztvQkFDL0QsSUFBSSxDQUFDLE1BQU0sZ0NBQXdCLENBQUE7Z0JBQ3BDLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxrQ0FBMEIsRUFBRSxDQUFDO29CQUMzQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7Z0JBQ2xCLENBQUM7Z0JBQ0QscUZBQXFGO1lBQ3RGLENBQUMsUUFBUSxJQUFJLENBQUMsTUFBTSxrQ0FBMEIsRUFBQztZQUMvQyxPQUFPLElBQUksQ0FBQyxNQUFPLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFTyxVQUFVO1FBQ2pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQTtRQUM5QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQTtRQUNsRCxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQTtRQUU3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxpQ0FBeUIsQ0FBQTtRQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzVCLElBQUksQ0FBQyxNQUFNLGdDQUF3QixDQUFBO1FBRW5DLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUVyQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtRQUV4QixJQUFJLENBQUM7WUFDSixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsY0FBZSxDQUFBO1lBQzFDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUUsQ0FBQTtZQUNsRCxJQUFJLENBQUM7Z0JBQ0osSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUE7Z0JBQzFCLDRFQUE0RTtnQkFDNUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNuRCxDQUFDO29CQUFTLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUE7Z0JBQzNCLDJHQUEyRztnQkFDM0csbUZBQW1GO2dCQUNuRixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO29CQUMvQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN2QixDQUFDO2dCQUNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN0QyxDQUFDO1lBRUQsU0FBUyxHQUFHLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRXpFLFNBQVMsRUFBRSxFQUFFLHVCQUF1QixDQUFDLElBQUksRUFBRTtnQkFDMUMsUUFBUTtnQkFDUixRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ3JCLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixTQUFTO2dCQUNULFFBQVE7YUFDUixDQUFDLENBQUE7UUFDSCxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQTtRQUV6QixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVlLFFBQVE7UUFDdkIsT0FBTyxlQUFlLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQTtJQUN4QyxDQUFDO0lBRUQsMkJBQTJCO0lBRXBCLFdBQVcsQ0FBSSxXQUEyQjtRQUNoRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QixNQUFNLElBQUksa0JBQWtCLENBQUMsd0NBQXdDLENBQUMsQ0FBQTtRQUN2RSxDQUFDO1FBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQ3ZCLElBQUksQ0FBQztZQUNKLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUE7WUFDcEQsSUFBSSxJQUFJLENBQUMsTUFBTSxrQ0FBMEIsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsTUFBTSxvREFBNEMsQ0FBQTtnQkFDdkQsNEVBQTRFO2dCQUM1RSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDM0IsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ2pDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDN0IsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksb0JBQW9CLEVBQUUsQ0FBQztnQkFDMUIsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUEsQ0FBQyxpQ0FBaUM7Z0JBQ3RELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUE7UUFDekIsQ0FBQztJQUNGLENBQUM7SUFJTSxTQUFTLENBQUksV0FBMkI7UUFDOUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQ25CLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3Qiw2Q0FBNkM7WUFDN0MsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUN0QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUMzQixDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xCLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUE7Z0JBQzdELElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxJQUFJLENBQUE7Z0JBQzdDLEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFLENBQUM7b0JBQzNCLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2xCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTSxvQkFBb0IsQ0FBSSxVQUEwQjtRQUN4RCwwRUFBMEU7UUFDMUUsSUFDQyxJQUFJLENBQUMsTUFBTSxrQ0FBMEI7WUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1lBQ2xDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFDN0MsQ0FBQztZQUNGLElBQUksQ0FBQyxNQUFNLG9EQUE0QyxDQUFBO1lBQ3ZELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU0sWUFBWSxDQUNsQixVQUE2QyxFQUM3QyxNQUFlO1FBRWYsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMxRixTQUFTLEVBQUUsRUFBRSw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBRXJFLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQTtZQUN2QixJQUFJLENBQUM7Z0JBQ0osV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhO29CQUMvQixDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FDbEI7d0JBQ0MsaUJBQWlCLEVBQUUsVUFBVTt3QkFDN0IsTUFBTTt3QkFDTixTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQWUsRUFBRSxDQUFDLENBQUMsS0FBTSxVQUFrQjtxQkFDeEQsRUFDRCxJQUFJLENBQUMsY0FBZSxDQUNwQjtvQkFDRixDQUFDLENBQUMsSUFBSSxDQUFBO1lBQ1IsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1osb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDeEIsQ0FBQztZQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLGtDQUEwQixDQUFBO1lBQ3pELElBQ0MsV0FBVztnQkFDWCxDQUFDLElBQUksQ0FBQyxNQUFNLHNEQUE4QyxJQUFJLFdBQVcsQ0FBQyxFQUN6RSxDQUFDO2dCQUNGLElBQUksQ0FBQyxNQUFNLDZCQUFxQixDQUFBO2dCQUNoQyxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDakMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFBO29CQUM3QixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFLTSxjQUFjLENBQUksVUFBMEI7UUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMxQixNQUFNLElBQUksa0JBQWtCLENBQUMsZ0VBQWdFLENBQUMsQ0FBQTtRQUMvRixDQUFDO1FBRUQsdURBQXVEO1FBQ3ZELFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsaUZBQWlGO1FBQ2pGLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUM5QixtRUFBbUU7UUFDbkUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUNoRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFZSxXQUFXLENBQUMsUUFBbUI7UUFDOUMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFBO1FBQ3JGLEtBQUssQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFM0IsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLElBQ0MsSUFBSSxDQUFDLGlDQUFpQztnQkFDdEMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFDbkQsQ0FBQztnQkFDRixJQUFJLENBQUMsaUNBQWlDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzNCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVlLGNBQWMsQ0FBQyxRQUFtQjtRQUNqRCxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsaUNBQWlDLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQTtZQUNuRCxDQUFDO1lBQ0QsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRCxDQUFDO1FBQ0QsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRU0sYUFBYTtRQUNuQixPQUFPO1lBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ2xCLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWTtZQUM5QixXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDOUIsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2hDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtTQUNsQixDQUFBO0lBQ0YsQ0FBQztJQUVNLGFBQWEsQ0FBQyxRQUFpQjtRQUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQWUsQ0FBQTtJQUM5QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8saUJBQ1osU0FBUSxPQUEwQjtJQUdsQyxZQUNDLGFBQTRCLEVBQzVCLFNBQWdFLEVBQ2hFLG1CQUF1RCxFQUN2RCxZQUF5RixFQUN6Riw0QkFBc0QsU0FBUyxFQUMvRCxrQkFBdUMsRUFDdkIsR0FBcUQ7UUFFckUsS0FBSyxDQUNKLGFBQWEsRUFDYixTQUFTLEVBQ1QsbUJBQW1CLEVBQ25CLFlBQVksRUFDWix5QkFBeUIsRUFDekIsa0JBQWtCLENBQ2xCLENBQUE7UUFUZSxRQUFHLEdBQUgsR0FBRyxDQUFrRDtJQVV0RSxDQUFDO0NBQ0QifQ==