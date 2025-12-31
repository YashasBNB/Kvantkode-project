/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { diffSets } from './collections.js';
import { onUnexpectedError } from './errors.js';
import { createSingleCallFunction } from './functional.js';
import { combinedDisposable, Disposable, DisposableMap, DisposableStore, toDisposable, } from './lifecycle.js';
import { LinkedList } from './linkedList.js';
import { StopWatch } from './stopwatch.js';
// -----------------------------------------------------------------------------------------------------------------------
// Uncomment the next line to print warnings whenever an emitter with listeners is disposed. That is a sign of code smell.
// -----------------------------------------------------------------------------------------------------------------------
const _enableDisposeWithListenerWarning = false;
// || Boolean("TRUE") // causes a linter warning so that it cannot be pushed
// -----------------------------------------------------------------------------------------------------------------------
// Uncomment the next line to print warnings whenever a snapshotted event is used repeatedly without cleanup.
// See https://github.com/microsoft/vscode/issues/142851
// -----------------------------------------------------------------------------------------------------------------------
const _enableSnapshotPotentialLeakWarning = false;
export var Event;
(function (Event) {
    Event.None = () => Disposable.None;
    function _addLeakageTraceLogic(options) {
        if (_enableSnapshotPotentialLeakWarning) {
            const { onDidAddListener: origListenerDidAdd } = options;
            const stack = Stacktrace.create();
            let count = 0;
            options.onDidAddListener = () => {
                if (++count === 2) {
                    console.warn('snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here');
                    stack.print();
                }
                origListenerDidAdd?.();
            };
        }
    }
    /**
     * Given an event, returns another event which debounces calls and defers the listeners to a later task via a shared
     * `setTimeout`. The event is converted into a signal (`Event<void>`) to avoid additional object creation as a
     * result of merging events and to try prevent race conditions that could arise when using related deferred and
     * non-deferred events.
     *
     * This is useful for deferring non-critical work (eg. general UI updates) to ensure it does not block critical work
     * (eg. latency of keypress to text rendered).
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function defer(event, disposable) {
        return debounce(event, () => void 0, 0, undefined, true, undefined, disposable);
    }
    Event.defer = defer;
    /**
     * Given an event, returns another event which only fires once.
     *
     * @param event The event source for the new event.
     */
    function once(event) {
        return (listener, thisArgs = null, disposables) => {
            // we need this, in case the event fires during the listener call
            let didFire = false;
            let result = undefined;
            result = event((e) => {
                if (didFire) {
                    return;
                }
                else if (result) {
                    result.dispose();
                }
                else {
                    didFire = true;
                }
                return listener.call(thisArgs, e);
            }, null, disposables);
            if (didFire) {
                result.dispose();
            }
            return result;
        };
    }
    Event.once = once;
    /**
     * Given an event, returns another event which only fires once, and only when the condition is met.
     *
     * @param event The event source for the new event.
     */
    function onceIf(event, condition) {
        return Event.once(Event.filter(event, condition));
    }
    Event.onceIf = onceIf;
    /**
     * Maps an event of one type into an event of another type using a mapping function, similar to how
     * `Array.prototype.map` works.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param map The mapping function.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function map(event, map, disposable) {
        return snapshot((listener, thisArgs = null, disposables) => event((i) => listener.call(thisArgs, map(i)), null, disposables), disposable);
    }
    Event.map = map;
    /**
     * Wraps an event in another event that performs some function on the event object before firing.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param each The function to perform on the event object.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function forEach(event, each, disposable) {
        return snapshot((listener, thisArgs = null, disposables) => event((i) => {
            each(i);
            listener.call(thisArgs, i);
        }, null, disposables), disposable);
    }
    Event.forEach = forEach;
    function filter(event, filter, disposable) {
        return snapshot((listener, thisArgs = null, disposables) => event((e) => filter(e) && listener.call(thisArgs, e), null, disposables), disposable);
    }
    Event.filter = filter;
    /**
     * Given an event, returns the same event but typed as `Event<void>`.
     */
    function signal(event) {
        return event;
    }
    Event.signal = signal;
    function any(...events) {
        return (listener, thisArgs = null, disposables) => {
            const disposable = combinedDisposable(...events.map((event) => event((e) => listener.call(thisArgs, e))));
            return addAndReturnDisposable(disposable, disposables);
        };
    }
    Event.any = any;
    /**
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     */
    function reduce(event, merge, initial, disposable) {
        let output = initial;
        return map(event, (e) => {
            output = merge(output, e);
            return output;
        }, disposable);
    }
    Event.reduce = reduce;
    function snapshot(event, disposable) {
        let listener;
        const options = {
            onWillAddFirstListener() {
                listener = event(emitter.fire, emitter);
            },
            onDidRemoveLastListener() {
                listener?.dispose();
            },
        };
        if (!disposable) {
            _addLeakageTraceLogic(options);
        }
        const emitter = new Emitter(options);
        disposable?.add(emitter);
        return emitter.event;
    }
    /**
     * Adds the IDisposable to the store if it's set, and returns it. Useful to
     * Event function implementation.
     */
    function addAndReturnDisposable(d, store) {
        if (store instanceof Array) {
            store.push(d);
        }
        else if (store) {
            store.add(d);
        }
        return d;
    }
    function debounce(event, merge, delay = 100, leading = false, flushOnListenerRemove = false, leakWarningThreshold, disposable) {
        let subscription;
        let output = undefined;
        let handle = undefined;
        let numDebouncedCalls = 0;
        let doFire;
        const options = {
            leakWarningThreshold,
            onWillAddFirstListener() {
                subscription = event((cur) => {
                    numDebouncedCalls++;
                    output = merge(output, cur);
                    if (leading && !handle) {
                        emitter.fire(output);
                        output = undefined;
                    }
                    doFire = () => {
                        const _output = output;
                        output = undefined;
                        handle = undefined;
                        if (!leading || numDebouncedCalls > 1) {
                            emitter.fire(_output);
                        }
                        numDebouncedCalls = 0;
                    };
                    if (typeof delay === 'number') {
                        clearTimeout(handle);
                        handle = setTimeout(doFire, delay);
                    }
                    else {
                        if (handle === undefined) {
                            handle = 0;
                            queueMicrotask(doFire);
                        }
                    }
                });
            },
            onWillRemoveListener() {
                if (flushOnListenerRemove && numDebouncedCalls > 0) {
                    doFire?.();
                }
            },
            onDidRemoveLastListener() {
                doFire = undefined;
                subscription.dispose();
            },
        };
        if (!disposable) {
            _addLeakageTraceLogic(options);
        }
        const emitter = new Emitter(options);
        disposable?.add(emitter);
        return emitter.event;
    }
    Event.debounce = debounce;
    /**
     * Debounces an event, firing after some delay (default=0) with an array of all event original objects.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     */
    function accumulate(event, delay = 0, disposable) {
        return Event.debounce(event, (last, e) => {
            if (!last) {
                return [e];
            }
            last.push(e);
            return last;
        }, delay, undefined, true, undefined, disposable);
    }
    Event.accumulate = accumulate;
    /**
     * Filters an event such that some condition is _not_ met more than once in a row, effectively ensuring duplicate
     * event objects from different sources do not fire the same event object.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param equals The equality condition.
     * @param disposable A disposable store to add the new EventEmitter to.
     *
     * @example
     * ```
     * // Fire only one time when a single window is opened or focused
     * Event.latch(Event.any(onDidOpenWindow, onDidFocusWindow))
     * ```
     */
    function latch(event, equals = (a, b) => a === b, disposable) {
        let firstCall = true;
        let cache;
        return filter(event, (value) => {
            const shouldEmit = firstCall || !equals(value, cache);
            firstCall = false;
            cache = value;
            return shouldEmit;
        }, disposable);
    }
    Event.latch = latch;
    /**
     * Splits an event whose parameter is a union type into 2 separate events for each type in the union.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @example
     * ```
     * const event = new EventEmitter<number | undefined>().event;
     * const [numberEvent, undefinedEvent] = Event.split(event, isUndefined);
     * ```
     *
     * @param event The event source for the new event.
     * @param isT A function that determines what event is of the first type.
     * @param disposable A disposable store to add the new EventEmitter to.
     */
    function split(event, isT, disposable) {
        return [
            Event.filter(event, isT, disposable),
            Event.filter(event, (e) => !isT(e), disposable),
        ];
    }
    Event.split = split;
    /**
     * Buffers an event until it has a listener attached.
     *
     * *NOTE* that this function returns an `Event` and it MUST be called with a `DisposableStore` whenever the returned
     * event is accessible to "third parties", e.g the event is a public property. Otherwise a leaked listener on the
     * returned event causes this utility to leak a listener on the original event.
     *
     * @param event The event source for the new event.
     * @param flushAfterTimeout Determines whether to flush the buffer after a timeout immediately or after a
     * `setTimeout` when the first event listener is added.
     * @param _buffer Internal: A source event array used for tests.
     *
     * @example
     * ```
     * // Start accumulating events, when the first listener is attached, flush
     * // the event after a timeout such that multiple listeners attached before
     * // the timeout would receive the event
     * this.onInstallExtension = Event.buffer(service.onInstallExtension, true);
     * ```
     */
    function buffer(event, flushAfterTimeout = false, _buffer = [], disposable) {
        let buffer = _buffer.slice();
        let listener = event((e) => {
            if (buffer) {
                buffer.push(e);
            }
            else {
                emitter.fire(e);
            }
        });
        if (disposable) {
            disposable.add(listener);
        }
        const flush = () => {
            buffer?.forEach((e) => emitter.fire(e));
            buffer = null;
        };
        const emitter = new Emitter({
            onWillAddFirstListener() {
                if (!listener) {
                    listener = event((e) => emitter.fire(e));
                    if (disposable) {
                        disposable.add(listener);
                    }
                }
            },
            onDidAddFirstListener() {
                if (buffer) {
                    if (flushAfterTimeout) {
                        setTimeout(flush);
                    }
                    else {
                        flush();
                    }
                }
            },
            onDidRemoveLastListener() {
                if (listener) {
                    listener.dispose();
                }
                listener = null;
            },
        });
        if (disposable) {
            disposable.add(emitter);
        }
        return emitter.event;
    }
    Event.buffer = buffer;
    /**
     * Wraps the event in an {@link IChainableEvent}, allowing a more functional programming style.
     *
     * @example
     * ```
     * // Normal
     * const onEnterPressNormal = Event.filter(
     *   Event.map(onKeyPress.event, e => new StandardKeyboardEvent(e)),
     *   e.keyCode === KeyCode.Enter
     * ).event;
     *
     * // Using chain
     * const onEnterPressChain = Event.chain(onKeyPress.event, $ => $
     *   .map(e => new StandardKeyboardEvent(e))
     *   .filter(e => e.keyCode === KeyCode.Enter)
     * );
     * ```
     */
    function chain(event, sythensize) {
        const fn = (listener, thisArgs, disposables) => {
            const cs = sythensize(new ChainableSynthesis());
            return event(function (value) {
                const result = cs.evaluate(value);
                if (result !== HaltChainable) {
                    listener.call(thisArgs, result);
                }
            }, undefined, disposables);
        };
        return fn;
    }
    Event.chain = chain;
    const HaltChainable = Symbol('HaltChainable');
    class ChainableSynthesis {
        constructor() {
            this.steps = [];
        }
        map(fn) {
            this.steps.push(fn);
            return this;
        }
        forEach(fn) {
            this.steps.push((v) => {
                fn(v);
                return v;
            });
            return this;
        }
        filter(fn) {
            this.steps.push((v) => (fn(v) ? v : HaltChainable));
            return this;
        }
        reduce(merge, initial) {
            let last = initial;
            this.steps.push((v) => {
                last = merge(last, v);
                return last;
            });
            return this;
        }
        latch(equals = (a, b) => a === b) {
            let firstCall = true;
            let cache;
            this.steps.push((value) => {
                const shouldEmit = firstCall || !equals(value, cache);
                firstCall = false;
                cache = value;
                return shouldEmit ? value : HaltChainable;
            });
            return this;
        }
        evaluate(value) {
            for (const step of this.steps) {
                value = step(value);
                if (value === HaltChainable) {
                    break;
                }
            }
            return value;
        }
    }
    /**
     * Creates an {@link Event} from a node event emitter.
     */
    function fromNodeEventEmitter(emitter, eventName, map = (id) => id) {
        const fn = (...args) => result.fire(map(...args));
        const onFirstListenerAdd = () => emitter.on(eventName, fn);
        const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
        const result = new Emitter({
            onWillAddFirstListener: onFirstListenerAdd,
            onDidRemoveLastListener: onLastListenerRemove,
        });
        return result.event;
    }
    Event.fromNodeEventEmitter = fromNodeEventEmitter;
    /**
     * Creates an {@link Event} from a DOM event emitter.
     */
    function fromDOMEventEmitter(emitter, eventName, map = (id) => id) {
        const fn = (...args) => result.fire(map(...args));
        const onFirstListenerAdd = () => emitter.addEventListener(eventName, fn);
        const onLastListenerRemove = () => emitter.removeEventListener(eventName, fn);
        const result = new Emitter({
            onWillAddFirstListener: onFirstListenerAdd,
            onDidRemoveLastListener: onLastListenerRemove,
        });
        return result.event;
    }
    Event.fromDOMEventEmitter = fromDOMEventEmitter;
    /**
     * Creates a promise out of an event, using the {@link Event.once} helper.
     */
    function toPromise(event, disposables) {
        return new Promise((resolve) => once(event)(resolve, null, disposables));
    }
    Event.toPromise = toPromise;
    /**
     * Creates an event out of a promise that fires once when the promise is
     * resolved with the result of the promise or `undefined`.
     */
    function fromPromise(promise) {
        const result = new Emitter();
        promise
            .then((res) => {
            result.fire(res);
        }, () => {
            result.fire(undefined);
        })
            .finally(() => {
            result.dispose();
        });
        return result.event;
    }
    Event.fromPromise = fromPromise;
    /**
     * A convenience function for forwarding an event to another emitter which
     * improves readability.
     *
     * This is similar to {@link Relay} but allows instantiating and forwarding
     * on a single line and also allows for multiple source events.
     * @param from The event to forward.
     * @param to The emitter to forward the event to.
     * @example
     * Event.forward(event, emitter);
     * // equivalent to
     * event(e => emitter.fire(e));
     * // equivalent to
     * event(emitter.fire, emitter);
     */
    function forward(from, to) {
        return from((e) => to.fire(e));
    }
    Event.forward = forward;
    function runAndSubscribe(event, handler, initial) {
        handler(initial);
        return event((e) => handler(e));
    }
    Event.runAndSubscribe = runAndSubscribe;
    class EmitterObserver {
        constructor(_observable, store) {
            this._observable = _observable;
            this._counter = 0;
            this._hasChanged = false;
            const options = {
                onWillAddFirstListener: () => {
                    _observable.addObserver(this);
                    // Communicate to the observable that we received its current value and would like to be notified about future changes.
                    this._observable.reportChanges();
                },
                onDidRemoveLastListener: () => {
                    _observable.removeObserver(this);
                },
            };
            if (!store) {
                _addLeakageTraceLogic(options);
            }
            this.emitter = new Emitter(options);
            if (store) {
                store.add(this.emitter);
            }
        }
        beginUpdate(_observable) {
            // assert(_observable === this.obs);
            this._counter++;
        }
        handlePossibleChange(_observable) {
            // assert(_observable === this.obs);
        }
        handleChange(_observable, _change) {
            // assert(_observable === this.obs);
            this._hasChanged = true;
        }
        endUpdate(_observable) {
            // assert(_observable === this.obs);
            this._counter--;
            if (this._counter === 0) {
                this._observable.reportChanges();
                if (this._hasChanged) {
                    this._hasChanged = false;
                    this.emitter.fire(this._observable.get());
                }
            }
        }
    }
    /**
     * Creates an event emitter that is fired when the observable changes.
     * Each listeners subscribes to the emitter.
     */
    function fromObservable(obs, store) {
        const observer = new EmitterObserver(obs, store);
        return observer.emitter.event;
    }
    Event.fromObservable = fromObservable;
    /**
     * Each listener is attached to the observable directly.
     */
    function fromObservableLight(observable) {
        return (listener, thisArgs, disposables) => {
            let count = 0;
            let didChange = false;
            const observer = {
                beginUpdate() {
                    count++;
                },
                endUpdate() {
                    count--;
                    if (count === 0) {
                        observable.reportChanges();
                        if (didChange) {
                            didChange = false;
                            listener.call(thisArgs);
                        }
                    }
                },
                handlePossibleChange() {
                    // noop
                },
                handleChange() {
                    didChange = true;
                },
            };
            observable.addObserver(observer);
            observable.reportChanges();
            const disposable = {
                dispose() {
                    observable.removeObserver(observer);
                },
            };
            if (disposables instanceof DisposableStore) {
                disposables.add(disposable);
            }
            else if (Array.isArray(disposables)) {
                disposables.push(disposable);
            }
            return disposable;
        };
    }
    Event.fromObservableLight = fromObservableLight;
})(Event || (Event = {}));
export class EventProfiling {
    static { this.all = new Set(); }
    static { this._idPool = 0; }
    constructor(name) {
        this.listenerCount = 0;
        this.invocationCount = 0;
        this.elapsedOverall = 0;
        this.durations = [];
        this.name = `${name}_${EventProfiling._idPool++}`;
        EventProfiling.all.add(this);
    }
    start(listenerCount) {
        this._stopWatch = new StopWatch();
        this.listenerCount = listenerCount;
    }
    stop() {
        if (this._stopWatch) {
            const elapsed = this._stopWatch.elapsed();
            this.durations.push(elapsed);
            this.elapsedOverall += elapsed;
            this.invocationCount += 1;
            this._stopWatch = undefined;
        }
    }
}
let _globalLeakWarningThreshold = -1;
export function setGlobalLeakWarningThreshold(n) {
    const oldValue = _globalLeakWarningThreshold;
    _globalLeakWarningThreshold = n;
    return {
        dispose() {
            _globalLeakWarningThreshold = oldValue;
        },
    };
}
class LeakageMonitor {
    static { this._idPool = 1; }
    constructor(_errorHandler, threshold, name = (LeakageMonitor._idPool++).toString(16).padStart(3, '0')) {
        this._errorHandler = _errorHandler;
        this.threshold = threshold;
        this.name = name;
        this._warnCountdown = 0;
    }
    dispose() {
        this._stacks?.clear();
    }
    check(stack, listenerCount) {
        const threshold = this.threshold;
        if (threshold <= 0 || listenerCount < threshold) {
            return undefined;
        }
        if (!this._stacks) {
            this._stacks = new Map();
        }
        const count = this._stacks.get(stack.value) || 0;
        this._stacks.set(stack.value, count + 1);
        this._warnCountdown -= 1;
        if (this._warnCountdown <= 0) {
            // only warn on first exceed and then every time the limit
            // is exceeded by 50% again
            this._warnCountdown = threshold * 0.5;
            const [topStack, topCount] = this.getMostFrequentStack();
            const message = `[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`;
            console.warn(message);
            console.warn(topStack);
            const error = new ListenerLeakError(message, topStack);
            this._errorHandler(error);
        }
        return () => {
            const count = this._stacks.get(stack.value) || 0;
            this._stacks.set(stack.value, count - 1);
        };
    }
    getMostFrequentStack() {
        if (!this._stacks) {
            return undefined;
        }
        let topStack;
        let topCount = 0;
        for (const [stack, count] of this._stacks) {
            if (!topStack || topCount < count) {
                topStack = [stack, count];
                topCount = count;
            }
        }
        return topStack;
    }
}
class Stacktrace {
    static create() {
        const err = new Error();
        return new Stacktrace(err.stack ?? '');
    }
    constructor(value) {
        this.value = value;
    }
    print() {
        console.warn(this.value.split('\n').slice(2).join('\n'));
    }
}
// error that is logged when going over the configured listener threshold
export class ListenerLeakError extends Error {
    constructor(message, stack) {
        super(message);
        this.name = 'ListenerLeakError';
        this.stack = stack;
    }
}
// SEVERE error that is logged when having gone way over the configured listener
// threshold so that the emitter refuses to accept more listeners
export class ListenerRefusalError extends Error {
    constructor(message, stack) {
        super(message);
        this.name = 'ListenerRefusalError';
        this.stack = stack;
    }
}
let id = 0;
class UniqueContainer {
    constructor(value) {
        this.value = value;
        this.id = id++;
    }
}
const compactionThreshold = 2;
const forEachListener = (listeners, fn) => {
    if (listeners instanceof UniqueContainer) {
        fn(listeners);
    }
    else {
        for (let i = 0; i < listeners.length; i++) {
            const l = listeners[i];
            if (l) {
                fn(l);
            }
        }
    }
};
/**
 * The Emitter can be used to expose an Event to the public
 * to fire it from the insides.
 * Sample:
    class Document {

        private readonly _onDidChange = new Emitter<(value:string)=>any>();

        public onDidChange = this._onDidChange.event;

        // getter-style
        // get onDidChange(): Event<(value:string)=>any> {
        // 	return this._onDidChange.event;
        // }

        private _doIt() {
            //...
            this._onDidChange.fire(value);
        }
    }
 */
export class Emitter {
    constructor(options) {
        this._size = 0;
        this._options = options;
        this._leakageMon =
            _globalLeakWarningThreshold > 0 || this._options?.leakWarningThreshold
                ? new LeakageMonitor(options?.onListenerError ?? onUnexpectedError, this._options?.leakWarningThreshold ?? _globalLeakWarningThreshold)
                : undefined;
        this._perfMon = this._options?._profName
            ? new EventProfiling(this._options._profName)
            : undefined;
        this._deliveryQueue = this._options?.deliveryQueue;
    }
    dispose() {
        if (!this._disposed) {
            this._disposed = true;
            // It is bad to have listeners at the time of disposing an emitter, it is worst to have listeners keep the emitter
            // alive via the reference that's embedded in their disposables. Therefore we loop over all remaining listeners and
            // unset their subscriptions/disposables. Looping and blaming remaining listeners is done on next tick because the
            // the following programming pattern is very popular:
            //
            // const someModel = this._disposables.add(new ModelObject()); // (1) create and register model
            // this._disposables.add(someModel.onDidChange(() => { ... }); // (2) subscribe and register model-event listener
            // ...later...
            // this._disposables.dispose(); disposes (1) then (2): don't warn after (1) but after the "overall dispose" is done
            if (this._deliveryQueue?.current === this) {
                this._deliveryQueue.reset();
            }
            if (this._listeners) {
                if (_enableDisposeWithListenerWarning) {
                    const listeners = this._listeners;
                    queueMicrotask(() => {
                        forEachListener(listeners, (l) => l.stack?.print());
                    });
                }
                this._listeners = undefined;
                this._size = 0;
            }
            this._options?.onDidRemoveLastListener?.();
            this._leakageMon?.dispose();
        }
    }
    /**
     * For the public to allow to subscribe
     * to events from this Emitter
     */
    get event() {
        this._event ??= (callback, thisArgs, disposables) => {
            if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
                const message = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
                console.warn(message);
                const tuple = this._leakageMon.getMostFrequentStack() ?? ['UNKNOWN stack', -1];
                const error = new ListenerRefusalError(`${message}. HINT: Stack shows most frequent listener (${tuple[1]}-times)`, tuple[0]);
                const errorHandler = this._options?.onListenerError || onUnexpectedError;
                errorHandler(error);
                return Disposable.None;
            }
            if (this._disposed) {
                // todo: should we warn if a listener is added to a disposed emitter? This happens often
                return Disposable.None;
            }
            if (thisArgs) {
                callback = callback.bind(thisArgs);
            }
            const contained = new UniqueContainer(callback);
            let removeMonitor;
            let stack;
            if (this._leakageMon && this._size >= Math.ceil(this._leakageMon.threshold * 0.2)) {
                // check and record this emitter for potential leakage
                contained.stack = Stacktrace.create();
                removeMonitor = this._leakageMon.check(contained.stack, this._size + 1);
            }
            if (_enableDisposeWithListenerWarning) {
                contained.stack = stack ?? Stacktrace.create();
            }
            if (!this._listeners) {
                this._options?.onWillAddFirstListener?.(this);
                this._listeners = contained;
                this._options?.onDidAddFirstListener?.(this);
            }
            else if (this._listeners instanceof UniqueContainer) {
                this._deliveryQueue ??= new EventDeliveryQueuePrivate();
                this._listeners = [this._listeners, contained];
            }
            else {
                this._listeners.push(contained);
            }
            this._options?.onDidAddListener?.(this);
            this._size++;
            const result = toDisposable(() => {
                removeMonitor?.();
                this._removeListener(contained);
            });
            if (disposables instanceof DisposableStore) {
                disposables.add(result);
            }
            else if (Array.isArray(disposables)) {
                disposables.push(result);
            }
            return result;
        };
        return this._event;
    }
    _removeListener(listener) {
        this._options?.onWillRemoveListener?.(this);
        if (!this._listeners) {
            return; // expected if a listener gets disposed
        }
        if (this._size === 1) {
            this._listeners = undefined;
            this._options?.onDidRemoveLastListener?.(this);
            this._size = 0;
            return;
        }
        // size > 1 which requires that listeners be a list:
        const listeners = this._listeners;
        const index = listeners.indexOf(listener);
        if (index === -1) {
            console.log('disposed?', this._disposed);
            console.log('size?', this._size);
            console.log('arr?', JSON.stringify(this._listeners));
            throw new Error('Attempted to dispose unknown listener');
        }
        this._size--;
        listeners[index] = undefined;
        const adjustDeliveryQueue = this._deliveryQueue.current === this;
        if (this._size * compactionThreshold <= listeners.length) {
            let n = 0;
            for (let i = 0; i < listeners.length; i++) {
                if (listeners[i]) {
                    listeners[n++] = listeners[i];
                }
                else if (adjustDeliveryQueue && n < this._deliveryQueue.end) {
                    this._deliveryQueue.end--;
                    if (n < this._deliveryQueue.i) {
                        this._deliveryQueue.i--;
                    }
                }
            }
            listeners.length = n;
        }
    }
    _deliver(listener, value) {
        if (!listener) {
            return;
        }
        const errorHandler = this._options?.onListenerError || onUnexpectedError;
        if (!errorHandler) {
            listener.value(value);
            return;
        }
        try {
            listener.value(value);
        }
        catch (e) {
            errorHandler(e);
        }
    }
    /** Delivers items in the queue. Assumes the queue is ready to go. */
    _deliverQueue(dq) {
        const listeners = dq.current._listeners;
        while (dq.i < dq.end) {
            // important: dq.i is incremented before calling deliver() because it might reenter deliverQueue()
            this._deliver(listeners[dq.i++], dq.value);
        }
        dq.reset();
    }
    /**
     * To be kept private to fire an event to
     * subscribers
     */
    fire(event) {
        if (this._deliveryQueue?.current) {
            this._deliverQueue(this._deliveryQueue);
            this._perfMon?.stop(); // last fire() will have starting perfmon, stop it before starting the next dispatch
        }
        this._perfMon?.start(this._size);
        if (!this._listeners) {
            // no-op
        }
        else if (this._listeners instanceof UniqueContainer) {
            this._deliver(this._listeners, event);
        }
        else {
            const dq = this._deliveryQueue;
            dq.enqueue(this, event, this._listeners.length);
            this._deliverQueue(dq);
        }
        this._perfMon?.stop();
    }
    hasListeners() {
        return this._size > 0;
    }
}
export const createEventDeliveryQueue = () => new EventDeliveryQueuePrivate();
class EventDeliveryQueuePrivate {
    constructor() {
        /**
         * Index in current's listener list.
         */
        this.i = -1;
        /**
         * The last index in the listener's list to deliver.
         */
        this.end = 0;
    }
    enqueue(emitter, value, end) {
        this.i = 0;
        this.end = end;
        this.current = emitter;
        this.value = value;
    }
    reset() {
        this.i = this.end; // force any current emission loop to stop, mainly for during dispose
        this.current = undefined;
        this.value = undefined;
    }
}
export class AsyncEmitter extends Emitter {
    async fireAsync(data, token, promiseJoin) {
        if (!this._listeners) {
            return;
        }
        if (!this._asyncDeliveryQueue) {
            this._asyncDeliveryQueue = new LinkedList();
        }
        forEachListener(this._listeners, (listener) => this._asyncDeliveryQueue.push([listener.value, data]));
        while (this._asyncDeliveryQueue.size > 0 && !token.isCancellationRequested) {
            const [listener, data] = this._asyncDeliveryQueue.shift();
            const thenables = [];
            // eslint-disable-next-line local/code-no-dangerous-type-assertions
            const event = {
                ...data,
                token,
                waitUntil: (p) => {
                    if (Object.isFrozen(thenables)) {
                        throw new Error('waitUntil can NOT be called asynchronous');
                    }
                    if (promiseJoin) {
                        p = promiseJoin(p, listener);
                    }
                    thenables.push(p);
                },
            };
            try {
                listener(event);
            }
            catch (e) {
                onUnexpectedError(e);
                continue;
            }
            // freeze thenables-collection to enforce sync-calls to
            // wait until and then wait for all thenables to resolve
            Object.freeze(thenables);
            await Promise.allSettled(thenables).then((values) => {
                for (const value of values) {
                    if (value.status === 'rejected') {
                        onUnexpectedError(value.reason);
                    }
                }
            });
        }
    }
}
export class PauseableEmitter extends Emitter {
    get isPaused() {
        return this._isPaused !== 0;
    }
    constructor(options) {
        super(options);
        this._isPaused = 0;
        this._eventQueue = new LinkedList();
        this._mergeFn = options?.merge;
    }
    pause() {
        this._isPaused++;
    }
    resume() {
        if (this._isPaused !== 0 && --this._isPaused === 0) {
            if (this._mergeFn) {
                // use the merge function to create a single composite
                // event. make a copy in case firing pauses this emitter
                if (this._eventQueue.size > 0) {
                    const events = Array.from(this._eventQueue);
                    this._eventQueue.clear();
                    super.fire(this._mergeFn(events));
                }
            }
            else {
                // no merging, fire each event individually and test
                // that this emitter isn't paused halfway through
                while (!this._isPaused && this._eventQueue.size !== 0) {
                    super.fire(this._eventQueue.shift());
                }
            }
        }
    }
    fire(event) {
        if (this._size) {
            if (this._isPaused !== 0) {
                this._eventQueue.push(event);
            }
            else {
                super.fire(event);
            }
        }
    }
}
export class DebounceEmitter extends PauseableEmitter {
    constructor(options) {
        super(options);
        this._delay = options.delay ?? 100;
    }
    fire(event) {
        if (!this._handle) {
            this.pause();
            this._handle = setTimeout(() => {
                this._handle = undefined;
                this.resume();
            }, this._delay);
        }
        super.fire(event);
    }
}
/**
 * An emitter which queue all events and then process them at the
 * end of the event loop.
 */
export class MicrotaskEmitter extends Emitter {
    constructor(options) {
        super(options);
        this._queuedEvents = [];
        this._mergeFn = options?.merge;
    }
    fire(event) {
        if (!this.hasListeners()) {
            return;
        }
        this._queuedEvents.push(event);
        if (this._queuedEvents.length === 1) {
            queueMicrotask(() => {
                if (this._mergeFn) {
                    super.fire(this._mergeFn(this._queuedEvents));
                }
                else {
                    this._queuedEvents.forEach((e) => super.fire(e));
                }
                this._queuedEvents = [];
            });
        }
    }
}
/**
 * An event emitter that multiplexes many events into a single event.
 *
 * @example Listen to the `onData` event of all `Thing`s, dynamically adding and removing `Thing`s
 * to the multiplexer as needed.
 *
 * ```typescript
 * const anythingDataMultiplexer = new EventMultiplexer<{ data: string }>();
 *
 * const thingListeners = DisposableMap<Thing, IDisposable>();
 *
 * thingService.onDidAddThing(thing => {
 *   thingListeners.set(thing, anythingDataMultiplexer.add(thing.onData);
 * });
 * thingService.onDidRemoveThing(thing => {
 *   thingListeners.deleteAndDispose(thing);
 * });
 *
 * anythingDataMultiplexer.event(e => {
 *   console.log('Something fired data ' + e.data)
 * });
 * ```
 */
export class EventMultiplexer {
    constructor() {
        this.hasListeners = false;
        this.events = [];
        this.emitter = new Emitter({
            onWillAddFirstListener: () => this.onFirstListenerAdd(),
            onDidRemoveLastListener: () => this.onLastListenerRemove(),
        });
    }
    get event() {
        return this.emitter.event;
    }
    add(event) {
        const e = { event: event, listener: null };
        this.events.push(e);
        if (this.hasListeners) {
            this.hook(e);
        }
        const dispose = () => {
            if (this.hasListeners) {
                this.unhook(e);
            }
            const idx = this.events.indexOf(e);
            this.events.splice(idx, 1);
        };
        return toDisposable(createSingleCallFunction(dispose));
    }
    onFirstListenerAdd() {
        this.hasListeners = true;
        this.events.forEach((e) => this.hook(e));
    }
    onLastListenerRemove() {
        this.hasListeners = false;
        this.events.forEach((e) => this.unhook(e));
    }
    hook(e) {
        e.listener = e.event((r) => this.emitter.fire(r));
    }
    unhook(e) {
        e.listener?.dispose();
        e.listener = null;
    }
    dispose() {
        this.emitter.dispose();
        for (const e of this.events) {
            e.listener?.dispose();
        }
        this.events = [];
    }
}
export class DynamicListEventMultiplexer {
    constructor(items, onAddItem, onRemoveItem, getEvent) {
        this._store = new DisposableStore();
        const multiplexer = this._store.add(new EventMultiplexer());
        const itemListeners = this._store.add(new DisposableMap());
        function addItem(instance) {
            itemListeners.set(instance, multiplexer.add(getEvent(instance)));
        }
        // Existing items
        for (const instance of items) {
            addItem(instance);
        }
        // Added items
        this._store.add(onAddItem((instance) => {
            addItem(instance);
        }));
        // Removed items
        this._store.add(onRemoveItem((instance) => {
            itemListeners.deleteAndDispose(instance);
        }));
        this.event = multiplexer.event;
    }
    dispose() {
        this._store.dispose();
    }
}
/**
 * The EventBufferer is useful in situations in which you want
 * to delay firing your events during some code.
 * You can wrap that code and be sure that the event will not
 * be fired during that wrap.
 *
 * ```
 * const emitter: Emitter;
 * const delayer = new EventDelayer();
 * const delayedEvent = delayer.wrapEvent(emitter.event);
 *
 * delayedEvent(console.log);
 *
 * delayer.bufferEvents(() => {
 *   emitter.fire(); // event will not be fired yet
 * });
 *
 * // event will only be fired at this point
 * ```
 */
export class EventBufferer {
    constructor() {
        this.data = [];
    }
    wrapEvent(event, reduce, initial) {
        return (listener, thisArgs, disposables) => {
            return event((i) => {
                const data = this.data[this.data.length - 1];
                // Non-reduce scenario
                if (!reduce) {
                    // Buffering case
                    if (data) {
                        data.buffers.push(() => listener.call(thisArgs, i));
                    }
                    else {
                        // Not buffering case
                        listener.call(thisArgs, i);
                    }
                    return;
                }
                // Reduce scenario
                const reduceData = data;
                // Not buffering case
                if (!reduceData) {
                    // TODO: Is there a way to cache this reduce call for all listeners?
                    listener.call(thisArgs, reduce(initial, i));
                    return;
                }
                // Buffering case
                reduceData.items ??= [];
                reduceData.items.push(i);
                if (reduceData.buffers.length === 0) {
                    // Include a single buffered function that will reduce all events when we're done buffering events
                    data.buffers.push(() => {
                        // cache the reduced result so that the value can be shared across all listeners
                        reduceData.reducedResult ??= initial
                            ? reduceData.items.reduce(reduce, initial)
                            : reduceData.items.reduce(reduce);
                        listener.call(thisArgs, reduceData.reducedResult);
                    });
                }
            }, undefined, disposables);
        };
    }
    bufferEvents(fn) {
        const data = { buffers: new Array() };
        this.data.push(data);
        const r = fn();
        this.data.pop();
        data.buffers.forEach((flush) => flush());
        return r;
    }
}
/**
 * A Relay is an event forwarder which functions as a replugabble event pipe.
 * Once created, you can connect an input event to it and it will simply forward
 * events from that input event through its own `event` property. The `input`
 * can be changed at any point in time.
 */
export class Relay {
    constructor() {
        this.listening = false;
        this.inputEvent = Event.None;
        this.inputEventListener = Disposable.None;
        this.emitter = new Emitter({
            onDidAddFirstListener: () => {
                this.listening = true;
                this.inputEventListener = this.inputEvent(this.emitter.fire, this.emitter);
            },
            onDidRemoveLastListener: () => {
                this.listening = false;
                this.inputEventListener.dispose();
            },
        });
        this.event = this.emitter.event;
    }
    set input(event) {
        this.inputEvent = event;
        if (this.listening) {
            this.inputEventListener.dispose();
            this.inputEventListener = event(this.emitter.fire, this.emitter);
        }
    }
    dispose() {
        this.inputEventListener.dispose();
        this.emitter.dispose();
    }
}
export class ValueWithChangeEvent {
    static const(value) {
        return new ConstValueWithChangeEvent(value);
    }
    constructor(_value) {
        this._value = _value;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        if (value !== this._value) {
            this._value = value;
            this._onDidChange.fire(undefined);
        }
    }
}
class ConstValueWithChangeEvent {
    constructor(value) {
        this.value = value;
        this.onDidChange = Event.None;
    }
}
/**
 * @param handleItem Is called for each item in the set (but only the first time the item is seen in the set).
 * 	The returned disposable is disposed if the item is no longer in the set.
 */
export function trackSetChanges(getData, onDidChangeData, handleItem) {
    const map = new DisposableMap();
    let oldData = new Set(getData());
    for (const d of oldData) {
        map.set(d, handleItem(d));
    }
    const store = new DisposableStore();
    store.add(onDidChangeData(() => {
        const newData = getData();
        const diff = diffSets(oldData, newData);
        for (const r of diff.removed) {
            map.deleteAndDispose(r);
        }
        for (const a of diff.added) {
            map.set(a, handleItem(a));
        }
        oldData = new Set(newData);
    }));
    store.add(map);
    return store;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9ldmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDM0MsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQy9DLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sZ0JBQWdCLENBQUE7QUFDdkIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRTVDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUcxQywwSEFBMEg7QUFDMUgsMEhBQTBIO0FBQzFILDBIQUEwSDtBQUMxSCxNQUFNLGlDQUFpQyxHQUFHLEtBQUssQ0FBQTtBQUMvQyw0RUFBNEU7QUFDNUUsMEhBQTBIO0FBQzFILDZHQUE2RztBQUM3Ryx3REFBd0Q7QUFDeEQsMEhBQTBIO0FBQzFILE1BQU0sbUNBQW1DLEdBQUcsS0FBSyxDQUFBO0FBYWpELE1BQU0sS0FBVyxLQUFLLENBczNCckI7QUF0M0JELFdBQWlCLEtBQUs7SUFDUixVQUFJLEdBQWUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQTtJQUVyRCxTQUFTLHFCQUFxQixDQUFDLE9BQXVCO1FBQ3JELElBQUksbUNBQW1DLEVBQUUsQ0FBQztZQUN6QyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxPQUFPLENBQUE7WUFDeEQsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQ2pD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