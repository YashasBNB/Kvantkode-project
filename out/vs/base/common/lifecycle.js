/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, numberComparator } from './arrays.js';
import { groupBy } from './collections.js';
import { SetMap } from './map.js';
import { createSingleCallFunction } from './functional.js';
import { Iterable } from './iterator.js';
// #region Disposable Tracking
/**
 * Enables logging of potentially leaked disposables.
 *
 * A disposable is considered leaked if it is not disposed or not registered as the child of
 * another disposable. This tracking is very simple an only works for classes that either
 * extend Disposable or use a DisposableStore. This means there are a lot of false positives.
 */
const TRACK_DISPOSABLES = false;
let disposableTracker = null;
export class GCBasedDisposableTracker {
    constructor() {
        this._registry = new FinalizationRegistry((heldValue) => {
            console.warn(`[LEAKED DISPOSABLE] ${heldValue}`);
        });
    }
    trackDisposable(disposable) {
        const stack = new Error('CREATED via:').stack;
        this._registry.register(disposable, stack, disposable);
    }
    setParent(child, parent) {
        if (parent) {
            this._registry.unregister(child);
        }
        else {
            this.trackDisposable(child);
        }
    }
    markAsDisposed(disposable) {
        this._registry.unregister(disposable);
    }
    markAsSingleton(disposable) {
        this._registry.unregister(disposable);
    }
}
export class DisposableTracker {
    constructor() {
        this.livingDisposables = new Map();
    }
    static { this.idx = 0; }
    getDisposableData(d) {
        let val = this.livingDisposables.get(d);
        if (!val) {
            val = {
                parent: null,
                source: null,
                isSingleton: false,
                value: d,
                idx: DisposableTracker.idx++,
            };
            this.livingDisposables.set(d, val);
        }
        return val;
    }
    trackDisposable(d) {
        const data = this.getDisposableData(d);
        if (!data.source) {
            data.source = new Error().stack;
        }
    }
    setParent(child, parent) {
        const data = this.getDisposableData(child);
        data.parent = parent;
    }
    markAsDisposed(x) {
        this.livingDisposables.delete(x);
    }
    markAsSingleton(disposable) {
        this.getDisposableData(disposable).isSingleton = true;
    }
    getRootParent(data, cache) {
        const cacheValue = cache.get(data);
        if (cacheValue) {
            return cacheValue;
        }
        const result = data.parent
            ? this.getRootParent(this.getDisposableData(data.parent), cache)
            : data;
        cache.set(data, result);
        return result;
    }
    getTrackedDisposables() {
        const rootParentCache = new Map();
        const leaking = [...this.livingDisposables.entries()]
            .filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton)
            .flatMap(([k]) => k);
        return leaking;
    }
    computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
        let uncoveredLeakingObjs;
        if (preComputedLeaks) {
            uncoveredLeakingObjs = preComputedLeaks;
        }
        else {
            const rootParentCache = new Map();
            const leakingObjects = [...this.livingDisposables.values()].filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);
            if (leakingObjects.length === 0) {
                return;
            }
            const leakingObjsSet = new Set(leakingObjects.map((o) => o.value));
            // Remove all objects that are a child of other leaking objects. Assumes there are no cycles.
            uncoveredLeakingObjs = leakingObjects.filter((l) => {
                return !(l.parent && leakingObjsSet.has(l.parent));
            });
            if (uncoveredLeakingObjs.length === 0) {
                throw new Error('There are cyclic diposable chains!');
            }
        }
        if (!uncoveredLeakingObjs) {
            return undefined;
        }
        function getStackTracePath(leaking) {
            function removePrefix(array, linesToRemove) {
                while (array.length > 0 &&
                    linesToRemove.some((regexp) => typeof regexp === 'string' ? regexp === array[0] : array[0].match(regexp))) {
                    array.shift();
                }
            }
            const lines = leaking
                .source.split('\n')
                .map((p) => p.trim().replace('at ', ''))
                .filter((l) => l !== '');
            removePrefix(lines, [
                'Error',
                /^trackDisposable \(.*\)$/,
                /^DisposableTracker.trackDisposable \(.*\)$/,
            ]);
            return lines.reverse();
        }
        const stackTraceStarts = new SetMap();
        for (const leaking of uncoveredLeakingObjs) {
            const stackTracePath = getStackTracePath(leaking);
            for (let i = 0; i <= stackTracePath.length; i++) {
                stackTraceStarts.add(stackTracePath.slice(0, i).join('\n'), leaking);
            }
        }
        // Put earlier leaks first
        uncoveredLeakingObjs.sort(compareBy((l) => l.idx, numberComparator));
        let message = '';
        let i = 0;
        for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
            i++;
            const stackTracePath = getStackTracePath(leaking);
            const stackTraceFormattedLines = [];
            for (let i = 0; i < stackTracePath.length; i++) {
                let line = stackTracePath[i];
                const starts = stackTraceStarts.get(stackTracePath.slice(0, i + 1).join('\n'));
                line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
                const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i).join('\n'));
                const continuations = groupBy([...prevStarts].map((d) => getStackTracePath(d)[i]), (v) => v);
                delete continuations[stackTracePath[i]];
                for (const [cont, set] of Object.entries(continuations)) {
                    stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
                }
                stackTraceFormattedLines.unshift(line);
            }
            message += `\n\n\n==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================\n${stackTraceFormattedLines.join('\n')}\n============================================================\n\n`;
        }
        if (uncoveredLeakingObjs.length > maxReported) {
            message += `\n\n\n... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables\n\n`;
        }
        return { leaks: uncoveredLeakingObjs, details: message };
    }
}
export function setDisposableTracker(tracker) {
    disposableTracker = tracker;
}
if (TRACK_DISPOSABLES) {
    const __is_disposable_tracked__ = '__is_disposable_tracked__';
    setDisposableTracker(new (class {
        trackDisposable(x) {
            const stack = new Error('Potentially leaked disposable').stack;
            setTimeout(() => {
                if (!x[__is_disposable_tracked__]) {
                    console.log(stack);
                }
            }, 3000);
        }
        setParent(child, parent) {
            if (child && child !== Disposable.None) {
                try {
                    ;
                    child[__is_disposable_tracked__] = true;
                }
                catch {
                    // noop
                }
            }
        }
        markAsDisposed(disposable) {
            if (disposable && disposable !== Disposable.None) {
                try {
                    ;
                    disposable[__is_disposable_tracked__] = true;
                }
                catch {
                    // noop
                }
            }
        }
        markAsSingleton(disposable) { }
    })());
}
export function trackDisposable(x) {
    disposableTracker?.trackDisposable(x);
    return x;
}
export function markAsDisposed(disposable) {
    disposableTracker?.markAsDisposed(disposable);
}
function setParentOfDisposable(child, parent) {
    disposableTracker?.setParent(child, parent);
}
function setParentOfDisposables(children, parent) {
    if (!disposableTracker) {
        return;
    }
    for (const child of children) {
        disposableTracker.setParent(child, parent);
    }
}
/**
 * Indicates that the given object is a singleton which does not need to be disposed.
 */
export function markAsSingleton(singleton) {
    disposableTracker?.markAsSingleton(singleton);
    return singleton;
}
/**
 * Check if `thing` is {@link IDisposable disposable}.
 */
export function isDisposable(thing) {
    return (typeof thing === 'object' &&
        thing !== null &&
        typeof thing.dispose === 'function' &&
        thing.dispose.length === 0);
}
export function dispose(arg) {
    if (Iterable.is(arg)) {
        const errors = [];
        for (const d of arg) {
            if (d) {
                try {
                    d.dispose();
                }
                catch (e) {
                    errors.push(e);
                }
            }
        }
        if (errors.length === 1) {
            throw errors[0];
        }
        else if (errors.length > 1) {
            throw new AggregateError(errors, 'Encountered errors while disposing of store');
        }
        return Array.isArray(arg) ? [] : arg;
    }
    else if (arg) {
        arg.dispose();
        return arg;
    }
}
export function disposeIfDisposable(disposables) {
    for (const d of disposables) {
        if (isDisposable(d)) {
            d.dispose();
        }
    }
    return [];
}
/**
 * Combine multiple disposable values into a single {@link IDisposable}.
 */
export function combinedDisposable(...disposables) {
    const parent = toDisposable(() => dispose(disposables));
    setParentOfDisposables(disposables, parent);
    return parent;
}
/**
 * Turn a function that implements dispose into an {@link IDisposable}.
 *
 * @param fn Clean up function, guaranteed to be called only **once**.
 */
export function toDisposable(fn) {
    const self = trackDisposable({
        dispose: createSingleCallFunction(() => {
            markAsDisposed(self);
            fn();
        }),
    });
    return self;
}
/**
 * Manages a collection of disposable values.
 *
 * This is the preferred way to manage multiple disposables. A `DisposableStore` is safer to work with than an
 * `IDisposable[]` as it considers edge cases, such as registering the same value multiple times or adding an item to a
 * store that has already been disposed of.
 */
export class DisposableStore {
    static { this.DISABLE_DISPOSED_WARNING = false; }
    constructor() {
        this._toDispose = new Set();
        this._isDisposed = false;
        trackDisposable(this);
    }
    /**
     * Dispose of all registered disposables and mark this object as disposed.
     *
     * Any future disposables added to this object will be disposed of on `add`.
     */
    dispose() {
        if (this._isDisposed) {
            return;
        }
        markAsDisposed(this);
        this._isDisposed = true;
        this.clear();
    }
    /**
     * @return `true` if this object has been disposed of.
     */
    get isDisposed() {
        return this._isDisposed;
    }
    /**
     * Dispose of all registered disposables but do not mark this object as disposed.
     */
    clear() {
        if (this._toDispose.size === 0) {
            return;
        }
        try {
            dispose(this._toDispose);
        }
        finally {
            this._toDispose.clear();
        }
    }
    /**
     * Add a new {@link IDisposable disposable} to the collection.
     */
    add(o) {
        if (!o) {
            return o;
        }
        if (o === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        setParentOfDisposable(o, this);
        if (this._isDisposed) {
            if (!DisposableStore.DISABLE_DISPOSED_WARNING) {
                console.warn(new Error('Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!').stack);
            }
        }
        else {
            this._toDispose.add(o);
        }
        return o;
    }
    /**
     * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
     * disposable even when the disposable is not part in the store.
     */
    delete(o) {
        if (!o) {
            return;
        }
        if (o === this) {
            throw new Error('Cannot dispose a disposable on itself!');
        }
        this._toDispose.delete(o);
        o.dispose();
    }
    /**
     * Deletes the value from the store, but does not dispose it.
     */
    deleteAndLeak(o) {
        if (!o) {
            return;
        }
        if (this._toDispose.has(o)) {
            this._toDispose.delete(o);
            setParentOfDisposable(o, null);
        }
    }
}
/**
 * Abstract base class for a {@link IDisposable disposable} object.
 *
 * Subclasses can {@linkcode _register} disposables that will be automatically cleaned up when this object is disposed of.
 */
export class Disposable {
    /**
     * A disposable that does nothing when it is disposed of.
     *
     * TODO: This should not be a static property.
     */
    static { this.None = Object.freeze({ dispose() { } }); }
    constructor() {
        this._store = new DisposableStore();
        trackDisposable(this);
        setParentOfDisposable(this._store, this);
    }
    dispose() {
        markAsDisposed(this);
        this._store.dispose();
    }
    /**
     * Adds `o` to the collection of disposables managed by this object.
     */
    _register(o) {
        if (o === this) {
            throw new Error('Cannot register a disposable on itself!');
        }
        return this._store.add(o);
    }
}
/**
 * Manages the lifecycle of a disposable value that may be changed.
 *
 * This ensures that when the disposable value is changed, the previously held disposable is disposed of. You can
 * also register a `MutableDisposable` on a `Disposable` to ensure it is automatically cleaned up.
 */
export class MutableDisposable {
    constructor() {
        this._isDisposed = false;
        trackDisposable(this);
    }
    get value() {
        return this._isDisposed ? undefined : this._value;
    }
    set value(value) {
        if (this._isDisposed || value === this._value) {
            return;
        }
        this._value?.dispose();
        if (value) {
            setParentOfDisposable(value, this);
        }
        this._value = value;
    }
    /**
     * Resets the stored value and disposed of the previously stored value.
     */
    clear() {
        this.value = undefined;
    }
    dispose() {
        this._isDisposed = true;
        markAsDisposed(this);
        this._value?.dispose();
        this._value = undefined;
    }
    /**
     * Clears the value, but does not dispose it.
     * The old value is returned.
     */
    clearAndLeak() {
        const oldValue = this._value;
        this._value = undefined;
        if (oldValue) {
            setParentOfDisposable(oldValue, null);
        }
        return oldValue;
    }
}
/**
 * Manages the lifecycle of a disposable value that may be changed like {@link MutableDisposable}, but the value must
 * exist and cannot be undefined.
 */
export class MandatoryMutableDisposable {
    constructor(initialValue) {
        this._disposable = new MutableDisposable();
        this._isDisposed = false;
        this._disposable.value = initialValue;
    }
    get value() {
        return this._disposable.value;
    }
    set value(value) {
        if (this._isDisposed || value === this._disposable.value) {
            return;
        }
        this._disposable.value = value;
    }
    dispose() {
        this._isDisposed = true;
        this._disposable.dispose();
    }
}
export class RefCountedDisposable {
    constructor(_disposable) {
        this._disposable = _disposable;
        this._counter = 1;
    }
    acquire() {
        this._counter++;
        return this;
    }
    release() {
        if (--this._counter === 0) {
            this._disposable.dispose();
        }
        return this;
    }
}
/**
 * A safe disposable can be `unset` so that a leaked reference (listener)
 * can be cut-off.
 */
export class SafeDisposable {
    constructor() {
        this.dispose = () => { };
        this.unset = () => { };
        this.isset = () => false;
        trackDisposable(this);
    }
    set(fn) {
        let callback = fn;
        this.unset = () => (callback = undefined);
        this.isset = () => callback !== undefined;
        this.dispose = () => {
            if (callback) {
                callback();
                callback = undefined;
                markAsDisposed(this);
            }
        };
        return this;
    }
}
export class ReferenceCollection {
    constructor() {
        this.references = new Map();
    }
    acquire(key, ...args) {
        let reference = this.references.get(key);
        if (!reference) {
            reference = { counter: 0, object: this.createReferencedObject(key, ...args) };
            this.references.set(key, reference);
        }
        const { object } = reference;
        const dispose = createSingleCallFunction(() => {
            if (--reference.counter === 0) {
                this.destroyReferencedObject(key, reference.object);
                this.references.delete(key);
            }
        });
        reference.counter++;
        return { object, dispose };
    }
}
/**
 * Unwraps a reference collection of promised values. Makes sure
 * references are disposed whenever promises get rejected.
 */
export class AsyncReferenceCollection {
    constructor(referenceCollection) {
        this.referenceCollection = referenceCollection;
    }
    async acquire(key, ...args) {
        const ref = this.referenceCollection.acquire(key, ...args);
        try {
            const object = await ref.object;
            return {
                object,
                dispose: () => ref.dispose(),
            };
        }
        catch (error) {
            ref.dispose();
            throw error;
        }
    }
}
export class ImmortalReference {
    constructor(object) {
        this.object = object;
    }
    dispose() {
        /* noop */
    }
}
export function disposeOnReturn(fn) {
    const store = new DisposableStore();
    try {
        fn(store);
    }
    finally {
        store.dispose();
    }
}
/**
 * A map the manages the lifecycle of the values that it stores.
 */
export class DisposableMap {
    constructor() {
        this._store = new Map();
        this._isDisposed = false;
        trackDisposable(this);
    }
    /**
     * Disposes of all stored values and mark this object as disposed.
     *
     * Trying to use this object after it has been disposed of is an error.
     */
    dispose() {
        markAsDisposed(this);
        this._isDisposed = true;
        this.clearAndDisposeAll();
    }
    /**
     * Disposes of all stored values and clear the map, but DO NOT mark this object as disposed.
     */
    clearAndDisposeAll() {
        if (!this._store.size) {
            return;
        }
        try {
            dispose(this._store.values());
        }
        finally {
            this._store.clear();
        }
    }
    has(key) {
        return this._store.has(key);
    }
    get size() {
        return this._store.size;
    }
    get(key) {
        return this._store.get(key);
    }
    set(key, value, skipDisposeOnOverwrite = false) {
        if (this._isDisposed) {
            console.warn(new Error('Trying to add a disposable to a DisposableMap that has already been disposed of. The added object will be leaked!').stack);
        }
        if (!skipDisposeOnOverwrite) {
            this._store.get(key)?.dispose();
        }
        this._store.set(key, value);
    }
    /**
     * Delete the value stored for `key` from this map and also dispose of it.
     */
    deleteAndDispose(key) {
        this._store.get(key)?.dispose();
        this._store.delete(key);
    }
    /**
     * Delete the value stored for `key` from this map but return it. The caller is
     * responsible for disposing of the value.
     */
    deleteAndLeak(key) {
        const value = this._store.get(key);
        this._store.delete(key);
        return value;
    }
    keys() {
        return this._store.keys();
    }
    values() {
        return this._store.values();
    }
    [Symbol.iterator]() {
        return this._store[Symbol.iterator]();
    }
}
/**
 * Call `then` on a Promise, unless the returned disposable is disposed.
 */
export function thenIfNotDisposed(promise, then) {
    let disposed = false;
    promise.then((result) => {
        if (disposed) {
            return;
        }
        then(result);
    });
    return toDisposable(() => {
        disposed = true;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbGlmZWN5Y2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDakMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUV4Qyw4QkFBOEI7QUFFOUI7Ozs7OztHQU1HO0FBQ0gsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUE7QUFDL0IsSUFBSSxpQkFBaUIsR0FBOEIsSUFBSSxDQUFBO0FBeUJ2RCxNQUFNLE9BQU8sd0JBQXdCO0lBQXJDO1FBQ2tCLGNBQVMsR0FBRyxJQUFJLG9CQUFvQixDQUFTLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDM0UsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsU0FBUyxFQUFFLENBQUMsQ0FBQTtRQUNqRCxDQUFDLENBQUMsQ0FBQTtJQXNCSCxDQUFDO0lBcEJBLGVBQWUsQ0FBQyxVQUF1QjtRQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFNLENBQUE7UUFDOUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRUQsU0FBUyxDQUFDLEtBQWtCLEVBQUUsTUFBMEI7UUFDdkQsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxT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