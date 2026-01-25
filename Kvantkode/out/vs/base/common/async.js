/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from './cancellation.js';
import { BugIndicatingError, CancellationError } from './errors.js';
import { Emitter, Event } from './event.js';
import { Disposable, DisposableMap, MutableDisposable, toDisposable, } from './lifecycle.js';
import { extUri as defaultExtUri } from './resources.js';
import { setTimeout0 } from './platform.js';
import { MicrotaskDelay } from './symbols.js';
import { Lazy } from './lazy.js';
export function isThenable(obj) {
    return !!obj && typeof obj.then === 'function';
}
export function createCancelablePromise(callback) {
    const source = new CancellationTokenSource();
    const thenable = callback(source.token);
    const promise = new Promise((resolve, reject) => {
        const subscription = source.token.onCancellationRequested(() => {
            subscription.dispose();
            reject(new CancellationError());
        });
        Promise.resolve(thenable).then((value) => {
            subscription.dispose();
            source.dispose();
            resolve(value);
        }, (err) => {
            subscription.dispose();
            source.dispose();
            reject(err);
        });
    });
    return new (class {
        cancel() {
            source.cancel();
            source.dispose();
        }
        then(resolve, reject) {
            return promise.then(resolve, reject);
        }
        catch(reject) {
            return this.then(undefined, reject);
        }
        finally(onfinally) {
            return promise.finally(onfinally);
        }
    })();
}
export function raceCancellation(promise, token, defaultValue) {
    return new Promise((resolve, reject) => {
        const ref = token.onCancellationRequested(() => {
            ref.dispose();
            resolve(defaultValue);
        });
        promise.then(resolve, reject).finally(() => ref.dispose());
    });
}
/**
 * Returns a promise that rejects with an {@CancellationError} as soon as the passed token is cancelled.
 * @see {@link raceCancellation}
 */
export function raceCancellationError(promise, token) {
    return new Promise((resolve, reject) => {
        const ref = token.onCancellationRequested(() => {
            ref.dispose();
            reject(new CancellationError());
        });
        promise.then(resolve, reject).finally(() => ref.dispose());
    });
}
/**
 * Returns as soon as one of the promises resolves or rejects and cancels remaining promises
 */
export async function raceCancellablePromises(cancellablePromises) {
    let resolvedPromiseIndex = -1;
    const promises = cancellablePromises.map((promise, index) => promise.then((result) => {
        resolvedPromiseIndex = index;
        return result;
    }));
    try {
        const result = await Promise.race(promises);
        return result;
    }
    finally {
        cancellablePromises.forEach((cancellablePromise, index) => {
            if (index !== resolvedPromiseIndex) {
                cancellablePromise.cancel();
            }
        });
    }
}
export function raceTimeout(promise, timeout, onTimeout) {
    let promiseResolve = undefined;
    const timer = setTimeout(() => {
        promiseResolve?.(undefined);
        onTimeout?.();
    }, timeout);
    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        new Promise((resolve) => (promiseResolve = resolve)),
    ]);
}
export function raceFilter(promises, filter) {
    return new Promise((resolve, reject) => {
        if (promises.length === 0) {
            resolve(undefined);
            return;
        }
        let resolved = false;
        let unresolvedCount = promises.length;
        for (const promise of promises) {
            promise
                .then((result) => {
                unresolvedCount--;
                if (!resolved) {
                    if (filter(result)) {
                        resolved = true;
                        resolve(result);
                    }
                    else if (unresolvedCount === 0) {
                        // Last one has to resolve the promise
                        resolve(undefined);
                    }
                }
            })
                .catch(reject);
        }
    });
}
export function asPromise(callback) {
    return new Promise((resolve, reject) => {
        const item = callback();
        if (isThenable(item)) {
            item.then(resolve, reject);
        }
        else {
            resolve(item);
        }
    });
}
/**
 * Creates and returns a new promise, plus its `resolve` and `reject` callbacks.
 *
 * Replace with standardized [`Promise.withResolvers`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers) once it is supported
 */
export function promiseWithResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve: resolve, reject: reject };
}
/**
 * A helper to prevent accumulation of sequential async tasks.
 *
 * Imagine a mail man with the sole task of delivering letters. As soon as
 * a letter submitted for delivery, he drives to the destination, delivers it
 * and returns to his base. Imagine that during the trip, N more letters were submitted.
 * When the mail man returns, he picks those N letters and delivers them all in a
 * single trip. Even though N+1 submissions occurred, only 2 deliveries were made.
 *
 * The throttler implements this via the queue() method, by providing it a task
 * factory. Following the example:
 *
 * 		const throttler = new Throttler();
 * 		const letters = [];
 *
 * 		function deliver() {
 * 			const lettersToDeliver = letters;
 * 			letters = [];
 * 			return makeTheTrip(lettersToDeliver);
 * 		}
 *
 * 		function onLetterReceived(l) {
 * 			letters.push(l);
 * 			throttler.queue(deliver);
 * 		}
 */
export class Throttler {
    constructor() {
        this.isDisposed = false;
        this.activePromise = null;
        this.queuedPromise = null;
        this.queuedPromiseFactory = null;
    }
    queue(promiseFactory) {
        if (this.isDisposed) {
            return Promise.reject(new Error('Throttler is disposed'));
        }
        if (this.activePromise) {
            this.queuedPromiseFactory = promiseFactory;
            if (!this.queuedPromise) {
                const onComplete = () => {
                    this.queuedPromise = null;
                    if (this.isDisposed) {
                        return;
                    }
                    const result = this.queue(this.queuedPromiseFactory);
                    this.queuedPromiseFactory = null;
                    return result;
                };
                this.queuedPromise = new Promise((resolve) => {
                    this.activePromise.then(onComplete, onComplete).then(resolve);
                });
            }
            return new Promise((resolve, reject) => {
                this.queuedPromise.then(resolve, reject);
            });
        }
        this.activePromise = promiseFactory();
        return new Promise((resolve, reject) => {
            this.activePromise.then((result) => {
                this.activePromise = null;
                resolve(result);
            }, (err) => {
                this.activePromise = null;
                reject(err);
            });
        });
    }
    dispose() {
        this.isDisposed = true;
    }
}
export class Sequencer {
    constructor() {
        this.current = Promise.resolve(null);
    }
    queue(promiseTask) {
        return (this.current = this.current.then(() => promiseTask(), () => promiseTask()));
    }
}
export class SequencerByKey {
    constructor() {
        this.promiseMap = new Map();
    }
    queue(key, promiseTask) {
        const runningPromise = this.promiseMap.get(key) ?? Promise.resolve();
        const newPromise = runningPromise
            .catch(() => { })
            .then(promiseTask)
            .finally(() => {
            if (this.promiseMap.get(key) === newPromise) {
                this.promiseMap.delete(key);
            }
        });
        this.promiseMap.set(key, newPromise);
        return newPromise;
    }
    keys() {
        return this.promiseMap.keys();
    }
}
const timeoutDeferred = (timeout, fn) => {
    let scheduled = true;
    const handle = setTimeout(() => {
        scheduled = false;
        fn();
    }, timeout);
    return {
        isTriggered: () => scheduled,
        dispose: () => {
            clearTimeout(handle);
            scheduled = false;
        },
    };
};
const microtaskDeferred = (fn) => {
    let scheduled = true;
    queueMicrotask(() => {
        if (scheduled) {
            scheduled = false;
            fn();
        }
    });
    return {
        isTriggered: () => scheduled,
        dispose: () => {
            scheduled = false;
        },
    };
};
/**
 * A helper to delay (debounce) execution of a task that is being requested often.
 *
 * Following the throttler, now imagine the mail man wants to optimize the number of
 * trips proactively. The trip itself can be long, so he decides not to make the trip
 * as soon as a letter is submitted. Instead he waits a while, in case more
 * letters are submitted. After said waiting period, if no letters were submitted, he
 * decides to make the trip. Imagine that N more letters were submitted after the first
 * one, all within a short period of time between each other. Even though N+1
 * submissions occurred, only 1 delivery was made.
 *
 * The delayer offers this behavior via the trigger() method, into which both the task
 * to be executed and the waiting period (delay) must be passed in as arguments. Following
 * the example:
 *
 * 		const delayer = new Delayer(WAITING_PERIOD);
 * 		const letters = [];
 *
 * 		function letterReceived(l) {
 * 			letters.push(l);
 * 			delayer.trigger(() => { return makeTheTrip(); });
 * 		}
 */
export class Delayer {
    constructor(defaultDelay) {
        this.defaultDelay = defaultDelay;
        this.deferred = null;
        this.completionPromise = null;
        this.doResolve = null;
        this.doReject = null;
        this.task = null;
    }
    trigger(task, delay = this.defaultDelay) {
        this.task = task;
        this.cancelTimeout();
        if (!this.completionPromise) {
            this.completionPromise = new Promise((resolve, reject) => {
                this.doResolve = resolve;
                this.doReject = reject;
            }).then(() => {
                this.completionPromise = null;
                this.doResolve = null;
                if (this.task) {
                    const task = this.task;
                    this.task = null;
                    return task();
                }
                return undefined;
            });
        }
        const fn = () => {
            this.deferred = null;
            this.doResolve?.(null);
        };
        this.deferred = delay === MicrotaskDelay ? microtaskDeferred(fn) : timeoutDeferred(delay, fn);
        return this.completionPromise;
    }
    isTriggered() {
        return !!this.deferred?.isTriggered();
    }
    cancel() {
        this.cancelTimeout();
        if (this.completionPromise) {
            this.doReject?.(new CancellationError());
            this.completionPromise = null;
        }
    }
    cancelTimeout() {
        this.deferred?.dispose();
        this.deferred = null;
    }
    dispose() {
        this.cancel();
    }
}
/**
 * A helper to delay execution of a task that is being requested often, while
 * preventing accumulation of consecutive executions, while the task runs.
 *
 * The mail man is clever and waits for a certain amount of time, before going
 * out to deliver letters. While the mail man is going out, more letters arrive
 * and can only be delivered once he is back. Once he is back the mail man will
 * do one more trip to deliver the letters that have accumulated while he was out.
 */
export class ThrottledDelayer {
    constructor(defaultDelay) {
        this.delayer = new Delayer(defaultDelay);
        this.throttler = new Throttler();
    }
    trigger(promiseFactory, delay) {
        return this.delayer.trigger(() => this.throttler.queue(promiseFactory), delay);
    }
    isTriggered() {
        return this.delayer.isTriggered();
    }
    cancel() {
        this.delayer.cancel();
    }
    dispose() {
        this.delayer.dispose();
        this.throttler.dispose();
    }
}
/**
 * A barrier that is initially closed and then becomes opened permanently.
 */
export class Barrier {
    constructor() {
        this._isOpen = false;
        this._promise = new Promise((c, e) => {
            this._completePromise = c;
        });
    }
    isOpen() {
        return this._isOpen;
    }
    open() {
        this._isOpen = true;
        this._completePromise(true);
    }
    wait() {
        return this._promise;
    }
}
/**
 * A barrier that is initially closed and then becomes opened permanently after a certain period of
 * time or when open is called explicitly
 */
export class AutoOpenBarrier extends Barrier {
    constructor(autoOpenTimeMs) {
        super();
        this._timeout = setTimeout(() => this.open(), autoOpenTimeMs);
    }
    open() {
        clearTimeout(this._timeout);
        super.open();
    }
}
export function timeout(millis, token) {
    if (!token) {
        return createCancelablePromise((token) => timeout(millis, token));
    }
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            disposable.dispose();
            resolve();
        }, millis);
        const disposable = token.onCancellationRequested(() => {
            clearTimeout(handle);
            disposable.dispose();
            reject(new CancellationError());
        });
    });
}
/**
 * Creates a timeout that can be disposed using its returned value.
 * @param handler The timeout handler.
 * @param timeout An optional timeout in milliseconds.
 * @param store An optional {@link DisposableStore} that will have the timeout disposable managed automatically.
 *
 * @example
 * const store = new DisposableStore;
 * // Call the timeout after 1000ms at which point it will be automatically
 * // evicted from the store.
 * const timeoutDisposable = disposableTimeout(() => {}, 1000, store);
 *
 * if (foo) {
 *   // Cancel the timeout and evict it from store.
 *   timeoutDisposable.dispose();
 * }
 */
export function disposableTimeout(handler, timeout = 0, store) {
    const timer = setTimeout(() => {
        handler();
        if (store) {
            disposable.dispose();
        }
    }, timeout);
    const disposable = toDisposable(() => {
        clearTimeout(timer);
        store?.delete(disposable);
    });
    store?.add(disposable);
    return disposable;
}
/**
 * Runs the provided list of promise factories in sequential order. The returned
 * promise will complete to an array of results from each promise.
 */
export function sequence(promiseFactories) {
    const results = [];
    let index = 0;
    const len = promiseFactories.length;
    function next() {
        return index < len ? promiseFactories[index++]() : null;
    }
    function thenHandler(result) {
        if (result !== undefined && result !== null) {
            results.push(result);
        }
        const n = next();
        if (n) {
            return n.then(thenHandler);
        }
        return Promise.resolve(results);
    }
    return Promise.resolve(null).then(thenHandler);
}
export function first(promiseFactories, shouldStop = (t) => !!t, defaultValue = null) {
    let index = 0;
    const len = promiseFactories.length;
    const loop = () => {
        if (index >= len) {
            return Promise.resolve(defaultValue);
        }
        const factory = promiseFactories[index++];
        const promise = Promise.resolve(factory());
        return promise.then((result) => {
            if (shouldStop(result)) {
                return Promise.resolve(result);
            }
            return loop();
        });
    };
    return loop();
}
export function firstParallel(promiseList, shouldStop = (t) => !!t, defaultValue = null) {
    if (promiseList.length === 0) {
        return Promise.resolve(defaultValue);
    }
    let todo = promiseList.length;
    const finish = () => {
        todo = -1;
        for (const promise of promiseList) {
            ;
            promise.cancel?.();
        }
    };
    return new Promise((resolve, reject) => {
        for (const promise of promiseList) {
            promise
                .then((result) => {
                if (--todo >= 0 && shouldStop(result)) {
                    finish();
                    resolve(result);
                }
                else if (todo === 0) {
                    resolve(defaultValue);
                }
            })
                .catch((err) => {
                if (--todo >= 0) {
                    finish();
                    reject(err);
                }
            });
        }
    });
}
/**
 * A helper to queue N promises and run them all with a max degree of parallelism. The helper
 * ensures that at any time no more than M promises are running at the same time.
 */
export class Limiter {
    constructor(maxDegreeOfParalellism) {
        this._size = 0;
        this._isDisposed = false;
        this.maxDegreeOfParalellism = maxDegreeOfParalellism;
        this.outstandingPromises = [];
        this.runningPromises = 0;
        this._onDrained = new Emitter();
    }
    /**
     *
     * @returns A promise that resolved when all work is done (onDrained) or when
     * there is nothing to do
     */
    whenIdle() {
        return this.size > 0 ? Event.toPromise(this.onDrained) : Promise.resolve();
    }
    get onDrained() {
        return this._onDrained.event;
    }
    get size() {
        return this._size;
    }
    queue(factory) {
        if (this._isDisposed) {
            throw new Error('Object has been disposed');
        }
        this._size++;
        return new Promise((c, e) => {
            this.outstandingPromises.push({ factory, c, e });
            this.consume();
        });
    }
    consume() {
        while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
            const iLimitedTask = this.outstandingPromises.shift();
            this.runningPromises++;
            const promise = iLimitedTask.factory();
            promise.then(iLimitedTask.c, iLimitedTask.e);
            promise.then(() => this.consumed(), () => this.consumed());
        }
    }
    consumed() {
        if (this._isDisposed) {
            return;
        }
        this.runningPromises--;
        if (--this._size === 0) {
            this._onDrained.fire();
        }
        if (this.outstandingPromises.length > 0) {
            this.consume();
        }
    }
    clear() {
        if (this._isDisposed) {
            throw new Error('Object has been disposed');
        }
        this.outstandingPromises.length = 0;
        this._size = this.runningPromises;
    }
    dispose() {
        this._isDisposed = true;
        this.outstandingPromises.length = 0; // stop further processing
        this._size = 0;
        this._onDrained.dispose();
    }
}
/**
 * A queue is handles one promise at a time and guarantees that at any time only one promise is executing.
 */
export class Queue extends Limiter {
    constructor() {
        super(1);
    }
}
/**
 * Same as `Queue`, ensures that only 1 task is executed at the same time. The difference to `Queue` is that
 * there is only 1 task about to be scheduled next. As such, calling `queue` while a task is executing will
 * replace the currently queued task until it executes.
 *
 * As such, the returned promise may not be from the factory that is passed in but from the next factory that
 * is running after having called `queue`.
 */
export class LimitedQueue {
    constructor() {
        this.sequentializer = new TaskSequentializer();
        this.tasks = 0;
    }
    queue(factory) {
        if (!this.sequentializer.isRunning()) {
            return this.sequentializer.run(this.tasks++, factory());
        }
        return this.sequentializer.queue(() => {
            return this.sequentializer.run(this.tasks++, factory());
        });
    }
}
/**
 * A helper to organize queues per resource. The ResourceQueue makes sure to manage queues per resource
 * by disposing them once the queue is empty.
 */
export class ResourceQueue {
    constructor() {
        this.queues = new Map();
        this.drainers = new Set();
        this.drainListeners = undefined;
        this.drainListenerCount = 0;
    }
    async whenDrained() {
        if (this.isDrained()) {
            return;
        }
        const promise = new DeferredPromise();
        this.drainers.add(promise);
        return promise.p;
    }
    isDrained() {
        for (const [, queue] of this.queues) {
            if (queue.size > 0) {
                return false;
            }
        }
        return true;
    }
    queueSize(resource, extUri = defaultExtUri) {
        const key = extUri.getComparisonKey(resource);
        return this.queues.get(key)?.size ?? 0;
    }
    queueFor(resource, factory, extUri = defaultExtUri) {
        const key = extUri.getComparisonKey(resource);
        let queue = this.queues.get(key);
        if (!queue) {
            queue = new Queue();
            const drainListenerId = this.drainListenerCount++;
            const drainListener = Event.once(queue.onDrained)(() => {
                queue?.dispose();
                this.queues.delete(key);
                this.onDidQueueDrain();
                this.drainListeners?.deleteAndDispose(drainListenerId);
                if (this.drainListeners?.size === 0) {
                    this.drainListeners.dispose();
                    this.drainListeners = undefined;
                }
            });
            if (!this.drainListeners) {
                this.drainListeners = new DisposableMap();
            }
            this.drainListeners.set(drainListenerId, drainListener);
            this.queues.set(key, queue);
        }
        return queue.queue(factory);
    }
    onDidQueueDrain() {
        if (!this.isDrained()) {
            return; // not done yet
        }
        this.releaseDrainers();
    }
    releaseDrainers() {
        for (const drainer of this.drainers) {
            drainer.complete();
        }
        this.drainers.clear();
    }
    dispose() {
        for (const [, queue] of this.queues) {
            queue.dispose();
        }
        this.queues.clear();
        // Even though we might still have pending
        // tasks queued, after the queues have been
        // disposed, we can no longer track them, so
        // we release drainers to prevent hanging
        // promises when the resource queue is being
        // disposed.
        this.releaseDrainers();
        this.drainListeners?.dispose();
    }
}
export class TimeoutTimer {
    constructor(runner, timeout) {
        this._isDisposed = false;
        this._token = -1;
        if (typeof runner === 'function' && typeof timeout === 'number') {
            this.setIfNotSet(runner, timeout);
        }
    }
    dispose() {
        this.cancel();
        this._isDisposed = true;
    }
    cancel() {
        if (this._token !== -1) {
            clearTimeout(this._token);
            this._token = -1;
        }
    }
    cancelAndSet(runner, timeout) {
        if (this._isDisposed) {
            throw new BugIndicatingError(`Calling 'cancelAndSet' on a disposed TimeoutTimer`);
        }
        this.cancel();
        this._token = setTimeout(() => {
            this._token = -1;
            runner();
        }, timeout);
    }
    setIfNotSet(runner, timeout) {
        if (this._isDisposed) {
            throw new BugIndicatingError(`Calling 'setIfNotSet' on a disposed TimeoutTimer`);
        }
        if (this._token !== -1) {
            // timer is already set
            return;
        }
        this._token = setTimeout(() => {
            this._token = -1;
            runner();
        }, timeout);
    }
}
export class IntervalTimer {
    constructor() {
        this.disposable = undefined;
        this.isDisposed = false;
    }
    cancel() {
        this.disposable?.dispose();
        this.disposable = undefined;
    }
    cancelAndSet(runner, interval, context = globalThis) {
        if (this.isDisposed) {
            throw new BugIndicatingError(`Calling 'cancelAndSet' on a disposed IntervalTimer`);
        }
        this.cancel();
        const handle = context.setInterval(() => {
            runner();
        }, interval);
        this.disposable = toDisposable(() => {
            context.clearInterval(handle);
            this.disposable = undefined;
        });
    }
    dispose() {
        this.cancel();
        this.isDisposed = true;
    }
}
export class RunOnceScheduler {
    constructor(runner, delay) {
        this.timeoutToken = -1;
        this.runner = runner;
        this.timeout = delay;
        this.timeoutHandler = this.onTimeout.bind(this);
    }
    /**
     * Dispose RunOnceScheduler
     */
    dispose() {
        this.cancel();
        this.runner = null;
    }
    /**
     * Cancel current scheduled runner (if any).
     */
    cancel() {
        if (this.isScheduled()) {
            clearTimeout(this.timeoutToken);
            this.timeoutToken = -1;
        }
    }
    /**
     * Cancel previous runner (if any) & schedule a new runner.
     */
    schedule(delay = this.timeout) {
        this.cancel();
        this.timeoutToken = setTimeout(this.timeoutHandler, delay);
    }
    get delay() {
        return this.timeout;
    }
    set delay(value) {
        this.timeout = value;
    }
    /**
     * Returns true if scheduled.
     */
    isScheduled() {
        return this.timeoutToken !== -1;
    }
    flush() {
        if (this.isScheduled()) {
            this.cancel();
            this.doRun();
        }
    }
    onTimeout() {
        this.timeoutToken = -1;
        if (this.runner) {
            this.doRun();
        }
    }
    doRun() {
        this.runner?.();
    }
}
/**
 * Same as `RunOnceScheduler`, but doesn't count the time spent in sleep mode.
 * > **NOTE**: Only offers 1s resolution.
 *
 * When calling `setTimeout` with 3hrs, and putting the computer immediately to sleep
 * for 8hrs, `setTimeout` will fire **as soon as the computer wakes from sleep**. But
 * this scheduler will execute 3hrs **after waking the computer from sleep**.
 */
export class ProcessTimeRunOnceScheduler {
    constructor(runner, delay) {
        if (delay % 1000 !== 0) {
            console.warn(`ProcessTimeRunOnceScheduler resolution is 1s, ${delay}ms is not a multiple of 1000ms.`);
        }
        this.runner = runner;
        this.timeout = delay;
        this.counter = 0;
        this.intervalToken = -1;
        this.intervalHandler = this.onInterval.bind(this);
    }
    dispose() {
        this.cancel();
        this.runner = null;
    }
    cancel() {
        if (this.isScheduled()) {
            clearInterval(this.intervalToken);
            this.intervalToken = -1;
        }
    }
    /**
     * Cancel previous runner (if any) & schedule a new runner.
     */
    schedule(delay = this.timeout) {
        if (delay % 1000 !== 0) {
            console.warn(`ProcessTimeRunOnceScheduler resolution is 1s, ${delay}ms is not a multiple of 1000ms.`);
        }
        this.cancel();
        this.counter = Math.ceil(delay / 1000);
        this.intervalToken = setInterval(this.intervalHandler, 1000);
    }
    /**
     * Returns true if scheduled.
     */
    isScheduled() {
        return this.intervalToken !== -1;
    }
    onInterval() {
        this.counter--;
        if (this.counter > 0) {
            // still need to wait
            return;
        }
        // time elapsed
        clearInterval(this.intervalToken);
        this.intervalToken = -1;
        this.runner?.();
    }
}
export class RunOnceWorker extends RunOnceScheduler {
    constructor(runner, timeout) {
        super(runner, timeout);
        this.units = [];
    }
    work(unit) {
        this.units.push(unit);
        if (!this.isScheduled()) {
            this.schedule();
        }
    }
    doRun() {
        const units = this.units;
        this.units = [];
        this.runner?.(units);
    }
    dispose() {
        this.units = [];
        super.dispose();
    }
}
/**
 * The `ThrottledWorker` will accept units of work `T`
 * to handle. The contract is:
 * * there is a maximum of units the worker can handle at once (via `maxWorkChunkSize`)
 * * there is a maximum of units the worker will keep in memory for processing (via `maxBufferedWork`)
 * * after having handled `maxWorkChunkSize` units, the worker needs to rest (via `throttleDelay`)
 */
export class ThrottledWorker extends Disposable {
    constructor(options, handler) {
        super();
        this.options = options;
        this.handler = handler;
        this.pendingWork = [];
        this.throttler = this._register(new MutableDisposable());
        this.disposed = false;
        this.lastExecutionTime = 0;
    }
    /**
     * The number of work units that are pending to be processed.
     */
    get pending() {
        return this.pendingWork.length;
    }
    /**
     * Add units to be worked on. Use `pending` to figure out
     * how many units are not yet processed after this method
     * was called.
     *
     * @returns whether the work was accepted or not. If the
     * worker is disposed, it will not accept any more work.
     * If the number of pending units would become larger
     * than `maxPendingWork`, more work will also not be accepted.
     */
    work(units) {
        if (this.disposed) {
            return false; // work not accepted: disposed
        }
        // Check for reaching maximum of pending work
        if (typeof this.options.maxBufferedWork === 'number') {
            // Throttled: simple check if pending + units exceeds max pending
            if (this.throttler.value) {
                if (this.pending + units.length > this.options.maxBufferedWork) {
                    return false; // work not accepted: too much pending work
                }
            }
            // Unthrottled: same as throttled, but account for max chunk getting
            // worked on directly without being pending
            else {
                if (this.pending + units.length - this.options.maxWorkChunkSize >
                    this.options.maxBufferedWork) {
                    return false; // work not accepted: too much pending work
                }
            }
        }
        // Add to pending units first
        for (const unit of units) {
            this.pendingWork.push(unit);
        }
        const timeSinceLastExecution = Date.now() - this.lastExecutionTime;
        if (!this.throttler.value &&
            (!this.options.waitThrottleDelayBetweenWorkUnits ||
                timeSinceLastExecution >= this.options.throttleDelay)) {
            // Work directly if we are not throttling and we are not
            // enforced to throttle between `work()` calls.
            this.doWork();
        }
        else if (!this.throttler.value && this.options.waitThrottleDelayBetweenWorkUnits) {
            // Otherwise, schedule the throttler to work.
            this.scheduleThrottler(Math.max(this.options.throttleDelay - timeSinceLastExecution, 0));
        }
        else {
            // Otherwise, our work will be picked up by the running throttler
        }
        return true; // work accepted
    }
    doWork() {
        this.lastExecutionTime = Date.now();
        // Extract chunk to handle and handle it
        this.handler(this.pendingWork.splice(0, this.options.maxWorkChunkSize));
        // If we have remaining work, schedule it after a delay
        if (this.pendingWork.length > 0) {
            this.scheduleThrottler();
        }
    }
    scheduleThrottler(delay = this.options.throttleDelay) {
        this.throttler.value = new RunOnceScheduler(() => {
            this.throttler.clear();
            this.doWork();
        }, delay);
        this.throttler.value.schedule();
    }
    dispose() {
        super.dispose();
        this.disposed = true;
    }
}
/**
 * Execute the callback the next time the browser is idle, returning an
 * {@link IDisposable} that will cancel the callback when disposed. This wraps
 * [requestIdleCallback] so it will fallback to [setTimeout] if the environment
 * doesn't support it.
 *
 * @param callback The callback to run when idle, this includes an
 * [IdleDeadline] that provides the time alloted for the idle callback by the
 * browser. Not respecting this deadline will result in a degraded user
 * experience.
 * @param timeout A timeout at which point to queue no longer wait for an idle
 * callback but queue it on the regular event loop (like setTimeout). Typically
 * this should not be used.
 *
 * [IdleDeadline]: https://developer.mozilla.org/en-US/docs/Web/API/IdleDeadline
 * [requestIdleCallback]: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 * [setTimeout]: https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 *
 * **Note** that there is `dom.ts#runWhenWindowIdle` which is better suited when running inside a browser
 * context
 */
export let runWhenGlobalIdle;
export let _runWhenIdle;
(function () {
    if (typeof globalThis.requestIdleCallback !== 'function' ||
        typeof globalThis.cancelIdleCallback !== 'function') {
        _runWhenIdle = (_targetWindow, runner, timeout) => {
            setTimeout0(() => {
                if (disposed) {
                    return;
                }
                const end = Date.now() + 15; // one frame at 64fps
                const deadline = {
                    didTimeout: true,
                    timeRemaining() {
                        return Math.max(0, end - Date.now());
                    },
                };
                runner(Object.freeze(deadline));
            });
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                },
            };
        };
    }
    else {
        _runWhenIdle = (targetWindow, runner, timeout) => {
            const handle = targetWindow.requestIdleCallback(runner, typeof timeout === 'number' ? { timeout } : undefined);
            let disposed = false;
            return {
                dispose() {
                    if (disposed) {
                        return;
                    }
                    disposed = true;
                    targetWindow.cancelIdleCallback(handle);
                },
            };
        };
    }
    runWhenGlobalIdle = (runner, timeout) => _runWhenIdle(globalThis, runner, timeout);
})();
export class AbstractIdleValue {
    constructor(targetWindow, executor) {
        this._didRun = false;
        this._executor = () => {
            try {
                this._value = executor();
            }
            catch (err) {
                this._error = err;
            }
            finally {
                this._didRun = true;
            }
        };
        this._handle = _runWhenIdle(targetWindow, () => this._executor());
    }
    dispose() {
        this._handle.dispose();
    }
    get value() {
        if (!this._didRun) {
            this._handle.dispose();
            this._executor();
        }
        if (this._error) {
            throw this._error;
        }
        return this._value;
    }
    get isInitialized() {
        return this._didRun;
    }
}
/**
 * An `IdleValue` that always uses the current window (which might be throttled or inactive)
 *
 * **Note** that there is `dom.ts#WindowIdleValue` which is better suited when running inside a browser
 * context
 */
export class GlobalIdleValue extends AbstractIdleValue {
    constructor(executor) {
        super(globalThis, executor);
    }
}
//#endregion
export async function retry(task, delay, retries) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await task();
        }
        catch (error) {
            lastError = error;
            await timeout(delay);
        }
    }
    throw lastError;
}
/**
 * @deprecated use `LimitedQueue` instead for an easier to use API
 */
export class TaskSequentializer {
    isRunning(taskId) {
        if (typeof taskId === 'number') {
            return this._running?.taskId === taskId;
        }
        return !!this._running;
    }
    get running() {
        return this._running?.promise;
    }
    cancelRunning() {
        this._running?.cancel();
    }
    run(taskId, promise, onCancel) {
        this._running = { taskId, cancel: () => onCancel?.(), promise };
        promise.then(() => this.doneRunning(taskId), () => this.doneRunning(taskId));
        return promise;
    }
    doneRunning(taskId) {
        if (this._running && taskId === this._running.taskId) {
            // only set running to done if the promise finished that is associated with that taskId
            this._running = undefined;
            // schedule the queued task now that we are free if we have any
            this.runQueued();
        }
    }
    runQueued() {
        if (this._queued) {
            const queued = this._queued;
            this._queued = undefined;
            // Run queued task and complete on the associated promise
            queued.run().then(queued.promiseResolve, queued.promiseReject);
        }
    }
    /**
     * Note: the promise to schedule as next run MUST itself call `run`.
     *       Otherwise, this sequentializer will report `false` for `isRunning`
     *       even when this task is running. Missing this detail means that
     *       suddenly multiple tasks will run in parallel.
     */
    queue(run) {
        // this is our first queued task, so we create associated promise with it
        // so that we can return a promise that completes when the task has
        // completed.
        if (!this._queued) {
            const { promise, resolve: promiseResolve, reject: promiseReject, } = promiseWithResolvers();
            this._queued = {
                run,
                promise,
                promiseResolve: promiseResolve,
                promiseReject: promiseReject,
            };
        }
        // we have a previous queued task, just overwrite it
        else {
            this._queued.run = run;
        }
        return this._queued.promise;
    }
    hasQueued() {
        return !!this._queued;
    }
    async join() {
        return this._queued?.promise ?? this._running?.promise;
    }
}
//#endregion
//#region
/**
 * The `IntervalCounter` allows to count the number
 * of calls to `increment()` over a duration of
 * `interval`. This utility can be used to conditionally
 * throttle a frequent task when a certain threshold
 * is reached.
 */
export class IntervalCounter {
    constructor(interval, nowFn = () => Date.now()) {
        this.interval = interval;
        this.nowFn = nowFn;
        this.lastIncrementTime = 0;
        this.value = 0;
    }
    increment() {
        const now = this.nowFn();
        // We are outside of the range of `interval` and as such
        // start counting from 0 and remember the time
        if (now - this.lastIncrementTime > this.interval) {
            this.lastIncrementTime = now;
            this.value = 0;
        }
        this.value++;
        return this.value;
    }
}
var DeferredOutcome;
(function (DeferredOutcome) {
    DeferredOutcome[DeferredOutcome["Resolved"] = 0] = "Resolved";
    DeferredOutcome[DeferredOutcome["Rejected"] = 1] = "Rejected";
})(DeferredOutcome || (DeferredOutcome = {}));
/**
 * Creates a promise whose resolution or rejection can be controlled imperatively.
 */
export class DeferredPromise {
    get isRejected() {
        return this.outcome?.outcome === 1 /* DeferredOutcome.Rejected */;
    }
    get isResolved() {
        return this.outcome?.outcome === 0 /* DeferredOutcome.Resolved */;
    }
    get isSettled() {
        return !!this.outcome;
    }
    get value() {
        return this.outcome?.outcome === 0 /* DeferredOutcome.Resolved */ ? this.outcome?.value : undefined;
    }
    constructor() {
        this.p = new Promise((c, e) => {
            this.completeCallback = c;
            this.errorCallback = e;
        });
    }
    complete(value) {
        return new Promise((resolve) => {
            this.completeCallback(value);
            this.outcome = { outcome: 0 /* DeferredOutcome.Resolved */, value };
            resolve();
        });
    }
    error(err) {
        return new Promise((resolve) => {
            this.errorCallback(err);
            this.outcome = { outcome: 1 /* DeferredOutcome.Rejected */, value: err };
            resolve();
        });
    }
    cancel() {
        return this.error(new CancellationError());
    }
}
//#endregion
//#region Promises
export var Promises;
(function (Promises) {
    /**
     * A drop-in replacement for `Promise.all` with the only difference
     * that the method awaits every promise to either fulfill or reject.
     *
     * Similar to `Promise.all`, only the first error will be returned
     * if any.
     */
    async function settled(promises) {
        let firstError = undefined;
        const result = await Promise.all(promises.map((promise) => promise.then((value) => value, (error) => {
            if (!firstError) {
                firstError = error;
            }
            return undefined; // do not rethrow so that other promises can settle
        })));
        if (typeof firstError !== 'undefined') {
            throw firstError;
        }
        return result; // cast is needed and protected by the `throw` above
    }
    Promises.settled = settled;
    /**
     * A helper to create a new `Promise<T>` with a body that is a promise
     * itself. By default, an error that raises from the async body will
     * end up as a unhandled rejection, so this utility properly awaits the
     * body and rejects the promise as a normal promise does without async
     * body.
     *
     * This method should only be used in rare cases where otherwise `async`
     * cannot be used (e.g. when callbacks are involved that require this).
     */
    function withAsyncBody(bodyFn) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            try {
                await bodyFn(resolve, reject);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    Promises.withAsyncBody = withAsyncBody;
})(Promises || (Promises = {}));
export class StatefulPromise {
    get value() {
        return this._value;
    }
    get error() {
        return this._error;
    }
    get isResolved() {
        return this._isResolved;
    }
    constructor(promise) {
        this._value = undefined;
        this._error = undefined;
        this._isResolved = false;
        this.promise = promise.then((value) => {
            this._value = value;
            this._isResolved = true;
            return value;
        }, (error) => {
            this._error = error;
            this._isResolved = true;
            throw error;
        });
    }
    /**
     * Returns the resolved value.
     * Throws if the promise is not resolved yet.
     */
    requireValue() {
        if (!this._isResolved) {
            throw new BugIndicatingError('Promise is not resolved yet');
        }
        if (this._error) {
            throw this._error;
        }
        return this._value;
    }
}
export class LazyStatefulPromise {
    constructor(_compute) {
        this._compute = _compute;
        this._promise = new Lazy(() => new StatefulPromise(this._compute()));
    }
    /**
     * Returns the resolved value.
     * Throws if the promise is not resolved yet.
     */
    requireValue() {
        return this._promise.value.requireValue();
    }
    /**
     * Returns the promise (and triggers a computation of the promise if not yet done so).
     */
    getPromise() {
        return this._promise.value.promise;
    }
    /**
     * Reads the current value without triggering a computation of the promise.
     */
    get currentValue() {
        return this._promise.rawValue?.value;
    }
}
//#endregion
//#region
var AsyncIterableSourceState;
(function (AsyncIterableSourceState) {
    AsyncIterableSourceState[AsyncIterableSourceState["Initial"] = 0] = "Initial";
    AsyncIterableSourceState[AsyncIterableSourceState["DoneOK"] = 1] = "DoneOK";
    AsyncIterableSourceState[AsyncIterableSourceState["DoneError"] = 2] = "DoneError";
})(AsyncIterableSourceState || (AsyncIterableSourceState = {}));
/**
 * A rich implementation for an `AsyncIterable<T>`.
 */
export class AsyncIterableObject {
    static fromArray(items) {
        return new AsyncIterableObject((writer) => {
            writer.emitMany(items);
        });
    }
    static fromPromise(promise) {
        return new AsyncIterableObject(async (emitter) => {
            emitter.emitMany(await promise);
        });
    }
    static fromPromisesResolveOrder(promises) {
        return new AsyncIterableObject(async (emitter) => {
            await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
        });
    }
    static merge(iterables) {
        return new AsyncIterableObject(async (emitter) => {
            await Promise.all(iterables.map(async (iterable) => {
                for await (const item of iterable) {
                    emitter.emitOne(item);
                }
            }));
        });
    }
    static { this.EMPTY = AsyncIterableObject.fromArray([]); }
    constructor(executor, onReturn) {
        this._state = 0 /* AsyncIterableSourceState.Initial */;
        this._results = [];
        this._error = null;
        this._onReturn = onReturn;
        this._onStateChanged = new Emitter();
        queueMicrotask(async () => {
            const writer = {
                emitOne: (item) => this.emitOne(item),
                emitMany: (items) => this.emitMany(items),
                reject: (error) => this.reject(error),
            };
            try {
                await Promise.resolve(executor(writer));
                this.resolve();
            }
            catch (err) {
                this.reject(err);
            }
            finally {
                writer.emitOne = undefined;
                writer.emitMany = undefined;
                writer.reject = undefined;
            }
        });
    }
    [Symbol.asyncIterator]() {
        let i = 0;
        return {
            next: async () => {
                do {
                    if (this._state === 2 /* AsyncIterableSourceState.DoneError */) {
                        throw this._error;
                    }
                    if (i < this._results.length) {
                        return { done: false, value: this._results[i++] };
                    }
                    if (this._state === 1 /* AsyncIterableSourceState.DoneOK */) {
                        return { done: true, value: undefined };
                    }
                    await Event.toPromise(this._onStateChanged.event);
                } while (true);
            },
            return: async () => {
                this._onReturn?.();
                return { done: true, value: undefined };
            },
        };
    }
    static map(iterable, mapFn) {
        return new AsyncIterableObject(async (emitter) => {
            for await (const item of iterable) {
                emitter.emitOne(mapFn(item));
            }
        });
    }
    map(mapFn) {
        return AsyncIterableObject.map(this, mapFn);
    }
    static filter(iterable, filterFn) {
        return new AsyncIterableObject(async (emitter) => {
            for await (const item of iterable) {
                if (filterFn(item)) {
                    emitter.emitOne(item);
                }
            }
        });
    }
    filter(filterFn) {
        return AsyncIterableObject.filter(this, filterFn);
    }
    static coalesce(iterable) {
        return AsyncIterableObject.filter(iterable, (item) => !!item);
    }
    coalesce() {
        return AsyncIterableObject.coalesce(this);
    }
    static async toPromise(iterable) {
        const result = [];
        for await (const item of iterable) {
            result.push(item);
        }
        return result;
    }
    toPromise() {
        return AsyncIterableObject.toPromise(this);
    }
    /**
     * The value will be appended at the end.
     *
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    emitOne(value) {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        // it is important to add new values at the end,
        // as we may have iterators already running on the array
        this._results.push(value);
        this._onStateChanged.fire();
    }
    /**
     * The values will be appended at the end.
     *
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    emitMany(values) {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        // it is important to add new values at the end,
        // as we may have iterators already running on the array
        this._results = this._results.concat(values);
        this._onStateChanged.fire();
    }
    /**
     * Calling `resolve()` will mark the result array as complete.
     *
     * **NOTE** `resolve()` must be called, otherwise all consumers of this iterable will hang indefinitely, similar to a non-resolved promise.
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    resolve() {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        this._state = 1 /* AsyncIterableSourceState.DoneOK */;
        this._onStateChanged.fire();
    }
    /**
     * Writing an error will permanently invalidate this iterable.
     * The current users will receive an error thrown, as will all future users.
     *
     * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
     */
    reject(error) {
        if (this._state !== 0 /* AsyncIterableSourceState.Initial */) {
            return;
        }
        this._state = 2 /* AsyncIterableSourceState.DoneError */;
        this._error = error;
        this._onStateChanged.fire();
    }
}
export class CancelableAsyncIterableObject extends AsyncIterableObject {
    constructor(_source, executor) {
        super(executor);
        this._source = _source;
    }
    cancel() {
        this._source.cancel();
    }
}
export function createCancelableAsyncIterable(callback) {
    const source = new CancellationTokenSource();
    const innerIterable = callback(source.token);
    return new CancelableAsyncIterableObject(source, async (emitter) => {
        const subscription = source.token.onCancellationRequested(() => {
            subscription.dispose();
            source.dispose();
            emitter.reject(new CancellationError());
        });
        try {
            for await (const item of innerIterable) {
                if (source.token.isCancellationRequested) {
                    // canceled in the meantime
                    return;
                }
                emitter.emitOne(item);
            }
            subscription.dispose();
            source.dispose();
        }
        catch (err) {
            subscription.dispose();
            source.dispose();
            emitter.reject(err);
        }
    });
}
export class AsyncIterableSource {
    /**
     *
     * @param onReturn A function that will be called when consuming the async iterable
     * has finished by the consumer, e.g the for-await-loop has be existed (break, return) early.
     * This is NOT called when resolving this source by its owner.
     */
    constructor(onReturn) {
        this._deferred = new DeferredPromise();
        this._asyncIterable = new AsyncIterableObject((emitter) => {
            if (earlyError) {
                emitter.reject(earlyError);
                return;
            }
            if (earlyItems) {
                emitter.emitMany(earlyItems);
            }
            this._errorFn = (error) => emitter.reject(error);
            this._emitFn = (item) => emitter.emitOne(item);
            return this._deferred.p;
        }, onReturn);
        let earlyError;
        let earlyItems;
        this._emitFn = (item) => {
            if (!earlyItems) {
                earlyItems = [];
            }
            earlyItems.push(item);
        };
        this._errorFn = (error) => {
            if (!earlyError) {
                earlyError = error;
            }
        };
    }
    get asyncIterable() {
        return this._asyncIterable;
    }
    resolve() {
        this._deferred.complete();
    }
    reject(error) {
        this._errorFn(error);
        this._deferred.complete();
    }
    emitOne(item) {
        this._emitFn(item);
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2FzeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDM0MsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBR2IsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxNQUFNLElBQUksYUFBYSxFQUFXLE1BQU0sZ0JBQWdCLENBQUE7QUFFakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFFaEMsTUFBTSxVQUFVLFVBQVUsQ0FBSSxHQUFZO0lBQ3pDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsSUFBSSxPQUFRLEdBQTZCLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQTtBQUMxRSxDQUFDO0FBTUQsTUFBTSxVQUFVLHVCQUF1QixDQUN0QyxRQUFrRDtJQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7SUFFNUMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN2QyxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNsRCxNQUFNLFlBQVks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