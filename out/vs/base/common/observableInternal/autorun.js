/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DebugNameData } from './debugName.js';
import { assertFn, BugIndicatingError, DisposableStore, markAsDisposed, onBugIndicatingError, toDisposable, trackDisposable, } from './commonFacade/deps.js';
import { getLogger } from './logging/logging.js';
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorun(fn) {
    return new AutorunObserver(new DebugNameData(undefined, undefined, fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export function autorunOpts(options, fn) {
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, undefined, undefined);
}
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `createEmptyChangeSummary` to create a "change summary" that can collect the changes.
 * Use `handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
export function autorunHandleChanges(options, fn) {
    return new AutorunObserver(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? fn), fn, options.createEmptyChangeSummary, options.handleChange);
}
/**
 * @see autorunHandleChanges (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStoreHandleChanges(options, fn) {
    const store = new DisposableStore();
    const disposable = autorunHandleChanges({
        owner: options.owner,
        debugName: options.debugName,
        debugReferenceFn: options.debugReferenceFn ?? fn,
        createEmptyChangeSummary: options.createEmptyChangeSummary,
        handleChange: options.handleChange,
    }, (reader, changeSummary) => {
        store.clear();
        fn(reader, changeSummary, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 */
export function autorunWithStore(fn) {
    const store = new DisposableStore();
    const disposable = autorunOpts({
        owner: undefined,
        debugName: undefined,
        debugReferenceFn: fn,
    }, (reader) => {
        store.clear();
        fn(reader, store);
    });
    return toDisposable(() => {
        disposable.dispose();
        store.dispose();
    });
}
export function autorunDelta(observable, handler) {
    let _lastValue;
    return autorunOpts({ debugReferenceFn: handler }, (reader) => {
        const newValue = observable.read(reader);
        const lastValue = _lastValue;
        _lastValue = newValue;
        handler({ lastValue, newValue });
    });
}
export function autorunIterableDelta(getValue, handler, getUniqueIdentifier = (v) => v) {
    const lastValues = new Map();
    return autorunOpts({ debugReferenceFn: getValue }, (reader) => {
        const newValues = new Map();
        const removedValues = new Map(lastValues);
        for (const value of getValue(reader)) {
            const id = getUniqueIdentifier(value);
            if (lastValues.has(id)) {
                removedValues.delete(id);
            }
            else {
                newValues.set(id, value);
                lastValues.set(id, value);
            }
        }
        for (const id of removedValues.keys()) {
            lastValues.delete(id);
        }
        if (newValues.size || removedValues.size) {
            handler({ addedValues: [...newValues.values()], removedValues: [...removedValues.values()] });
        }
    });
}
export var AutorunState;
(function (AutorunState) {
    /**
     * A dependency could have changed.
     * We need to explicitly ask them if at least one dependency changed.
     */
    AutorunState[AutorunState["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
    /**
     * A dependency changed and we need to recompute.
     */
    AutorunState[AutorunState["stale"] = 2] = "stale";
    AutorunState[AutorunState["upToDate"] = 3] = "upToDate";
})(AutorunState || (AutorunState = {}));
export class AutorunObserver {
    get debugName() {
        return this._debugNameData.getDebugName(this) ?? '(anonymous)';
    }
    constructor(_debugNameData, _runFn, createChangeSummary, _handleChange) {
        this._debugNameData = _debugNameData;
        this._runFn = _runFn;
        this.createChangeSummary = createChangeSummary;
        this._handleChange = _handleChange;
        this._state = 2 /* AutorunState.stale */;
        this._updateCount = 0;
        this._disposed = false;
        this._dependencies = new Set();
        this._dependenciesToBeRemoved = new Set();
        this._isRunning = false;
        this._changeSummary = this.createChangeSummary?.();
        getLogger()?.handleAutorunCreated(this);
        this._run();
        trackDisposable(this);
    }
    dispose() {
        this._disposed = true;
        for (const o of this._dependencies) {
            o.removeObserver(this); // Warning: external call!
        }
        this._dependencies.clear();
        getLogger()?.handleAutorunDisposed(this);
        markAsDisposed(this);
    }
    _run() {
        const emptySet = this._dependenciesToBeRemoved;
        this._dependenciesToBeRemoved = this._dependencies;
        this._dependencies = emptySet;
        this._state = 3 /* AutorunState.upToDate */;
        try {
            if (!this._disposed) {
                getLogger()?.handleAutorunStarted(this);
                const changeSummary = this._changeSummary;
                try {
                    this._changeSummary = this.createChangeSummary?.(); // Warning: external call!
                    this._isRunning = true;
                    this._runFn(this, changeSummary); // Warning: external call!
                }
                catch (e) {
                    onBugIndicatingError(e);
                }
                finally {
                    this._isRunning = false;
                }
            }
        }
        finally {
            if (!this._disposed) {
                getLogger()?.handleAutorunFinished(this);
            }
            // We don't want our observed observables to think that they are (not even temporarily) not being observed.
            // Thus, we only unsubscribe from observables that are definitely not read anymore.
            for (const o of this._dependenciesToBeRemoved) {
                o.removeObserver(this); // Warning: external call!
            }
            this._dependenciesToBeRemoved.clear();
        }
    }
    toString() {
        return `Autorun<${this.debugName}>`;
    }
    // IObserver implementation
    beginUpdate(_observable) {
        if (this._state === 3 /* AutorunState.upToDate */) {
            this._state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
        this._updateCount++;
    }
    endUpdate(_observable) {
        try {
            if (this._updateCount === 1) {
                do {
                    if (this._state === 1 /* AutorunState.dependenciesMightHaveChanged */) {
                        this._state = 3 /* AutorunState.upToDate */;
                        for (const d of this._dependencies) {
                            d.reportChanges(); // Warning: external call!
                            if (this._state === 2 /* AutorunState.stale */) {
                                // The other dependencies will refresh on demand
                                break;
                            }
                        }
                    }
                    if (this._state !== 3 /* AutorunState.upToDate */) {
                        this._run(); // Warning: indirect external call!
                    }
                } while (this._state !== 3 /* AutorunState.upToDate */);
            }
        }
        finally {
            this._updateCount--;
        }
        assertFn(() => this._updateCount >= 0);
    }
    handlePossibleChange(observable) {
        if (this._state === 3 /* AutorunState.upToDate */ && this._isDependency(observable)) {
            this._state = 1 /* AutorunState.dependenciesMightHaveChanged */;
        }
    }
    handleChange(observable, change) {
        if (this._isDependency(observable)) {
            getLogger()?.handleAutorunDependencyChanged(this, observable, change);
            try {
                // Warning: external call!
                const shouldReact = this._handleChange
                    ? this._handleChange({
                        changedObservable: observable,
                        change,
                        didChange: (o) => o === observable,
                    }, this._changeSummary)
                    : true;
                if (shouldReact) {
                    this._state = 2 /* AutorunState.stale */;
                }
            }
            catch (e) {
                onBugIndicatingError(e);
            }
        }
    }
    _isDependency(observable) {
        return this._dependencies.has(observable) && !this._dependenciesToBeRemoved.has(observable);
    }
    // IReader implementation
    readObservable(observable) {
        if (!this._isRunning) {
            throw new BugIndicatingError('The reader object cannot be used outside its compute function!');
        }
        // In case the run action disposes the autorun
        if (this._disposed) {
            return observable.get(); // warning: external call!
        }
        observable.addObserver(this); // warning: external call!
        const value = observable.get(); // warning: external call!
        this._dependencies.add(observable);
        this._dependenciesToBeRemoved.delete(observable);
        return value;
    }
    debugGetState() {
        return {
            isRunning: this._isRunning,
            updateCount: this._updateCount,
            dependencies: this._dependencies,
            state: this._state,
        };
    }
    debugRerun() {
        if (!this._isRunning) {
            this._run();
        }
        else {
            this._state = 2 /* AutorunState.stale */;
        }
    }
}
(function (autorun) {
    autorun.Observer = AutorunObserver;
})(autorun || (autorun = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b3J1bi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9hdXRvcnVuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sZ0JBQWdCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFFBQVEsRUFDUixrQkFBa0IsRUFDbEIsZUFBZSxFQUVmLGNBQWMsRUFDZCxvQkFBb0IsRUFDcEIsWUFBWSxFQUNaLGVBQWUsR0FDZixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVoRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsT0FBTyxDQUFDLEVBQTZCO0lBQ3BELE9BQU8sSUFBSSxlQUFlLENBQUMsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0FBQ2xHLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUMxQixPQUE0QixFQUM1QixFQUE2QjtJQUU3QixPQUFPLElBQUksZUFBZSxDQUN6QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQyxFQUNuRixFQUFFLEVBQ0YsU0FBUyxFQUNULFNBQVMsQ0FDVCxDQUFBO0FBQ0YsQ0FBQztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLFVBQVUsb0JBQW9CLENBQ25DLE9BR0MsRUFDRCxFQUE0RDtJQUU1RCxPQUFPLElBQUksZUFBZSxDQUN6QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9B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