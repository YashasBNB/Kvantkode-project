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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9hc3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzNDLE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUdiLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsTUFBTSxJQUFJLGFBQWEsRUFBVyxNQUFNLGdCQUFnQixDQUFBO0FBRWpFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDM0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRWhDLE1BQU0sVUFBVSxVQUFVLENBQUksR0FBWTtJQUN6QyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksT0FBUSxHQUE2QixDQUFDLElBQUksS0FBSyxVQUFVLENBQUE7QUFDMUUsQ0FBQztBQU1ELE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsUUFBa0Q7SUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO0lBRTVDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDbEQsTUFBTSxZQUFZLEdBQUcs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