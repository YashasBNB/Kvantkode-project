/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as async from '../../common/async.js';
import * as MicrotaskDelay from '../../common/symbols.js';
import { CancellationTokenSource } from '../../common/cancellation.js';
import { isCancellationError } from '../../common/errors.js';
import { Event } from '../../common/event.js';
import { URI } from '../../common/uri.js';
import { runWithFakedTimers } from './timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { DisposableStore } from '../../common/lifecycle.js';
suite('Async', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('cancelablePromise', function () {
        test("set token, don't wait for inner promise", function () {
            let canceled = 0;
            const promise = async.createCancelablePromise((token) => {
                store.add(token.onCancellationRequested((_) => {
                    canceled += 1;
                }));
                return new Promise((resolve) => {
                    /*never*/
                });
            });
            const result = promise.then((_) => assert.ok(false), (err) => {
                assert.strictEqual(canceled, 1);
                assert.ok(isCancellationError(err));
            });
            promise.cancel();
            promise.cancel(); // cancel only once
            return result;
        });
        test('cancel despite inner promise being resolved', function () {
            let canceled = 0;
            const promise = async.createCancelablePromise((token) => {
                store.add(token.onCancellationRequested((_) => {
                    canceled += 1;
                }));
                return Promise.resolve(1234);
            });
            const result = promise.then((_) => assert.ok(false), (err) => {
                assert.strictEqual(canceled, 1);
                assert.ok(isCancellationError(err));
            });
            promise.cancel();
            return result;
        });
        // Cancelling a sync cancelable promise will fire the cancelled token.
        // Also, every `then` callback runs in another execution frame.
        test('execution order (sync)', function () {
            const order = [];
            const cancellablePromise = async.createCancelablePromise((token) => {
                order.push('in callback');
                store.add(token.onCancellationRequested((_) => order.push('cancelled')));
                return Promise.resolve(1234);
            });
            order.push('afterCreate');
            const promise = cancellablePromise
                .then(undefined, (err) => null)
                .then(() => order.push('finally'));
            cancellablePromise.cancel();
            order.push('afterCancel');
            return promise.then(() => assert.deepStrictEqual(order, [
                'in callback',
                'afterCreate',
                'cancelled',
                'afterCancel',
                'finally',
            ]));
        });
        // Cancelling an async cancelable promise is just the same as a sync cancellable promise.
        test('execution order (async)', function () {
            const order = [];
            const cancellablePromise = async.createCancelablePromise((token) => {
                order.push('in callback');
                store.add(token.onCancellationRequested((_) => order.push('cancelled')));
                return new Promise((c) => setTimeout(c.bind(1234), 0));
            });
            order.push('afterCreate');
            const promise = cancellablePromise
                .then(undefined, (err) => null)
                .then(() => order.push('finally'));
            cancellablePromise.cancel();
            order.push('afterCancel');
            return promise.then(() => assert.deepStrictEqual(order, [
                'in callback',
                'afterCreate',
                'cancelled',
                'afterCancel',
                'finally',
            ]));
        });
        test('execution order (async with late listener)', async function () {
            const order = [];
            const cancellablePromise = async.createCancelablePromise(async (token) => {
                order.push('in callback');
                await async.timeout(0);
                store.add(token.onCancellationRequested((_) => order.push('cancelled')));
                cancellablePromise.cancel();
                order.push('afterCancel');
            });
            order.push('afterCreate');
            const promise = cancellablePromise
                .then(undefined, (err) => null)
                .then(() => order.push('finally'));
            return promise.then(() => assert.deepStrictEqual(order, [
                'in callback',
                'afterCreate',
                'cancelled',
                'afterCancel',
                'finally',
            ]));
        });
        test('get inner result', async function () {
            const promise = async.createCancelablePromise((token) => {
                return async.timeout(12).then((_) => 1234);
            });
            const result = await promise;
            assert.strictEqual(result, 1234);
        });
    });
    suite('Throttler', function () {
        test('non async', function () {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const throttler = new async.Throttler();
            return Promise.all([
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 1);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
            ]).then(() => assert.strictEqual(count, 2));
        });
        test('async', () => {
            let count = 0;
            const factory = () => async.timeout(0).then(() => ++count);
            const throttler = new async.Throttler();
            return Promise.all([
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 1);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
                throttler.queue(factory).then((result) => {
                    assert.strictEqual(result, 2);
                }),
            ]).then(() => {
                return Promise.all([
                    throttler.queue(factory).then((result) => {
                        assert.strictEqual(result, 3);
                    }),
                    throttler.queue(factory).then((result) => {
                        assert.strictEqual(result, 4);
                    }),
                    throttler.queue(factory).then((result) => {
                        assert.strictEqual(result, 4);
                    }),
                    throttler.queue(factory).then((result) => {
                        assert.strictEqual(result, 4);
                    }),
                    throttler.queue(factory).then((result) => {
                        assert.strictEqual(result, 4);
                    }),
                ]);
            });
        });
        test('last factory should be the one getting called', function () {
            const factoryFactory = (n) => () => {
                return async.timeout(0).then(() => n);
            };
            const throttler = new async.Throttler();
            const promises = [];
            promises.push(throttler.queue(factoryFactory(1)).then((n) => {
                assert.strictEqual(n, 1);
            }));
            promises.push(throttler.queue(factoryFactory(2)).then((n) => {
                assert.strictEqual(n, 3);
            }));
            promises.push(throttler.queue(factoryFactory(3)).then((n) => {
                assert.strictEqual(n, 3);
            }));
            return Promise.all(promises);
        });
        test('disposal after queueing', async () => {
            let factoryCalls = 0;
            const factory = async () => {
                factoryCalls++;
                return async.timeout(0);
            };
            const throttler = new async.Throttler();
            const promises = [];
            promises.push(throttler.queue(factory));
            promises.push(throttler.queue(factory));
            throttler.dispose();
            await Promise.all(promises);
            assert.strictEqual(factoryCalls, 1);
        });
        test('disposal before queueing', async () => {
            let factoryCalls = 0;
            const factory = async () => {
                factoryCalls++;
                return async.timeout(0);
            };
            const throttler = new async.Throttler();
            const promises = [];
            throttler.dispose();
            promises.push(throttler.queue(factory));
            try {
                await Promise.all(promises);
                assert.fail('should fail');
            }
            catch (err) {
                assert.strictEqual(factoryCalls, 0);
            }
        });
    });
    suite('Delayer', function () {
        test('simple', () => {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const delayer = new async.Delayer(0);
            const promises = [];
            assert(!delayer.isTriggered());
            promises.push(delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
            }));
            assert(delayer.isTriggered());
            promises.push(delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
            }));
            assert(delayer.isTriggered());
            promises.push(delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
            }));
            assert(delayer.isTriggered());
            return Promise.all(promises).then(() => {
                assert(!delayer.isTriggered());
            });
        });
        test('microtask delay simple', () => {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const delayer = new async.Delayer(MicrotaskDelay.MicrotaskDelay);
            const promises = [];
            assert(!delayer.isTriggered());
            promises.push(delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
            }));
            assert(delayer.isTriggered());
            promises.push(delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
            }));
            assert(delayer.isTriggered());
            promises.push(delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
            }));
            assert(delayer.isTriggered());
            return Promise.all(promises).then(() => {
                assert(!delayer.isTriggered());
            });
        });
        suite('ThrottledDelayer', () => {
            test('promise should resolve if disposed', async () => {
                const throttledDelayer = new async.ThrottledDelayer(100);
                const promise = throttledDelayer.trigger(async () => { }, 0);
                throttledDelayer.dispose();
                try {
                    await promise;
                    assert.fail('SHOULD NOT BE HERE');
                }
                catch (err) {
                    // OK
                }
            });
            test('trigger after dispose throws', async () => {
                const throttledDelayer = new async.ThrottledDelayer(100);
                throttledDelayer.dispose();
                await assert.rejects(() => throttledDelayer.trigger(async () => { }, 0));
            });
        });
        test('simple cancel', function () {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const delayer = new async.Delayer(0);
            assert(!delayer.isTriggered());
            const p = delayer.trigger(factory).then(() => {
                assert(false);
            }, () => {
                assert(true, 'yes, it was cancelled');
            });
            assert(delayer.isTriggered());
            delayer.cancel();
            assert(!delayer.isTriggered());
            return p;
        });
        test('simple cancel microtask', function () {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const delayer = new async.Delayer(MicrotaskDelay.MicrotaskDelay);
            assert(!delayer.isTriggered());
            const p = delayer.trigger(factory).then(() => {
                assert(false);
            }, () => {
                assert(true, 'yes, it was cancelled');
            });
            assert(delayer.isTriggered());
            delayer.cancel();
            assert(!delayer.isTriggered());
            return p;
        });
        test('cancel should cancel all calls to trigger', function () {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const delayer = new async.Delayer(0);
            const promises = [];
            assert(!delayer.isTriggered());
            promises.push(delayer.trigger(factory).then(undefined, () => {
                assert(true, 'yes, it was cancelled');
            }));
            assert(delayer.isTriggered());
            promises.push(delayer.trigger(factory).then(undefined, () => {
                assert(true, 'yes, it was cancelled');
            }));
            assert(delayer.isTriggered());
            promises.push(delayer.trigger(factory).then(undefined, () => {
                assert(true, 'yes, it was cancelled');
            }));
            assert(delayer.isTriggered());
            delayer.cancel();
            return Promise.all(promises).then(() => {
                assert(!delayer.isTriggered());
            });
        });
        test('trigger, cancel, then trigger again', function () {
            let count = 0;
            const factory = () => {
                return Promise.resolve(++count);
            };
            const delayer = new async.Delayer(0);
            let promises = [];
            assert(!delayer.isTriggered());
            const p = delayer.trigger(factory).then((result) => {
                assert.strictEqual(result, 1);
                assert(!delayer.isTriggered());
                promises.push(delayer.trigger(factory).then(undefined, () => {
                    assert(true, 'yes, it was cancelled');
                }));
                assert(delayer.isTriggered());
                promises.push(delayer.trigger(factory).then(undefined, () => {
                    assert(true, 'yes, it was cancelled');
                }));
                assert(delayer.isTriggered());
                delayer.cancel();
                const p = Promise.all(promises).then(() => {
                    promises = [];
                    assert(!delayer.isTriggered());
                    promises.push(delayer.trigger(factory).then(() => {
                        assert.strictEqual(result, 1);
                        assert(!delayer.isTriggered());
                    }));
                    assert(delayer.isTriggered());
                    promises.push(delayer.trigger(factory).then(() => {
                        assert.strictEqual(result, 1);
                        assert(!delayer.isTriggered());
                    }));
                    assert(delayer.isTriggered());
                    const p = Promise.all(promises).then(() => {
                        assert(!delayer.isTriggered());
                    });
                    assert(delayer.isTriggered());
                    return p;
                });
                return p;
            });
            assert(delayer.isTriggered());
            return p;
        });
        test('last task should be the one getting called', function () {
            const factoryFactory = (n) => () => {
                return Promise.resolve(n);
            };
            const delayer = new async.Delayer(0);
            const promises = [];
            assert(!delayer.isTriggered());
            promises.push(delayer.trigger(factoryFactory(1)).then((n) => {
                assert.strictEqual(n, 3);
            }));
            promises.push(delayer.trigger(factoryFactory(2)).then((n) => {
                assert.strictEqual(n, 3);
            }));
            promises.push(delayer.trigger(factoryFactory(3)).then((n) => {
                assert.strictEqual(n, 3);
            }));
            const p = Promise.all(promises).then(() => {
                assert(!delayer.isTriggered());
            });
            assert(delayer.isTriggered());
            return p;
        });
    });
    suite('sequence', () => {
        test('simple', () => {
            const factoryFactory = (n) => () => {
                return Promise.resolve(n);
            };
            return async
                .sequence([
                factoryFactory(1),
                factoryFactory(2),
                factoryFactory(3),
                factoryFactory(4),
                factoryFactory(5),
            ])
                .then((result) => {
                assert.strictEqual(5, result.length);
                assert.strictEqual(1, result[0]);
                assert.strictEqual(2, result[1]);
                assert.strictEqual(3, result[2]);
                assert.strictEqual(4, result[3]);
                assert.strictEqual(5, result[4]);
            });
        });
    });
    suite('Limiter', () => {
        test('assert degree of paralellism', function () {
            let activePromises = 0;
            const factoryFactory = (n) => () => {
                activePromises++;
                assert(activePromises < 6);
                return async.timeout(0).then(() => {
                    activePromises--;
                    return n;
                });
            };
            const limiter = new async.Limiter(5);
            const promises = [];
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n) => promises.push(limiter.queue(factoryFactory(n))));
            return Promise.all(promises).then((res) => {
                assert.strictEqual(10, res.length);
                assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], res);
            });
        });
    });
    suite('Queue', () => {
        test('simple', function () {
            const queue = new async.Queue();
            let syncPromise = false;
            const f1 = () => Promise.resolve(true).then(() => (syncPromise = true));
            let asyncPromise = false;
            const f2 = () => async.timeout(10).then(() => (asyncPromise = true));
            assert.strictEqual(queue.size, 0);
            queue.queue(f1);
            assert.strictEqual(queue.size, 1);
            const p = queue.queue(f2);
            assert.strictEqual(queue.size, 2);
            return p.then(() => {
                assert.strictEqual(queue.size, 0);
                assert.ok(syncPromise);
                assert.ok(asyncPromise);
            });
        });
        test('stop processing on dispose', async function () {
            const queue = new async.Queue();
            let workCounter = 0;
            const task = async () => {
                await async.timeout(0);
                workCounter++;
                queue.dispose(); // DISPOSE HERE
            };
            const p1 = queue.queue(task);
            queue.queue(task);
            queue.queue(task);
            assert.strictEqual(queue.size, 3);
            await p1;
            assert.strictEqual(workCounter, 1);
        });
        test('stop on clear', async function () {
            const queue = new async.Queue();
            let workCounter = 0;
            const task = async () => {
                await async.timeout(0);
                workCounter++;
                queue.clear(); // CLEAR HERE
                assert.strictEqual(queue.size, 1); // THIS task is still running
            };
            const p1 = queue.queue(task);
            queue.queue(task);
            queue.queue(task);
            assert.strictEqual(queue.size, 3);
            await p1;
            assert.strictEqual(workCounter, 1);
            assert.strictEqual(queue.size, 0); // has been cleared
            const p2 = queue.queue(task);
            await p2;
            assert.strictEqual(workCounter, 2);
        });
        test('clear and drain (1)', async function () {
            const queue = new async.Queue();
            let workCounter = 0;
            const task = async () => {
                await async.timeout(0);
                workCounter++;
                queue.clear(); // CLEAR HERE
            };
            const p0 = Event.toPromise(queue.onDrained);
            const p1 = queue.queue(task);
            await p1;
            await p0; // expect drain to fire because a task was running
            assert.strictEqual(workCounter, 1);
            queue.dispose();
        });
        test('clear and drain (2)', async function () {
            const queue = new async.Queue();
            let didFire = false;
            const d = queue.onDrained(() => {
                didFire = true;
            });
            queue.clear();
            assert.strictEqual(didFire, false); // no work, no drain!
            d.dispose();
            queue.dispose();
        });
        test('drain timing', async function () {
            const queue = new async.Queue();
            const logicClock = new (class {
                constructor() {
                    this.time = 0;
                }
                tick() {
                    return this.time++;
                }
            })();
            let didDrainTime = 0;
            let didFinishTime1 = 0;
            let didFinishTime2 = 0;
            const d = queue.onDrained(() => {
                didDrainTime = logicClock.tick();
            });
            const p1 = queue.queue(() => {
                // await async.timeout(10);
                didFinishTime1 = logicClock.tick();
                return Promise.resolve();
            });
            const p2 = queue.queue(async () => {
                await async.timeout(10);
                didFinishTime2 = logicClock.tick();
            });
            await Promise.all([p1, p2]);
            assert.strictEqual(didFinishTime1, 0);
            assert.strictEqual(didFinishTime2, 1);
            assert.strictEqual(didDrainTime, 2);
            d.dispose();
            queue.dispose();
        });
        test('drain event is send only once', async function () {
            const queue = new async.Queue();
            let drainCount = 0;
            const d = queue.onDrained(() => {
                drainCount++;
            });
            queue.queue(async () => { });
            queue.queue(async () => { });
            queue.queue(async () => { });
            queue.queue(async () => { });
            assert.strictEqual(drainCount, 0);
            assert.strictEqual(queue.size, 4);
            await queue.whenIdle();
            assert.strictEqual(drainCount, 1);
            d.dispose();
            queue.dispose();
        });
        test('order is kept', function () {
            return runWithFakedTimers({}, () => {
                const queue = new async.Queue();
                const res = [];
                const f1 = () => Promise.resolve(true).then(() => res.push(1));
                const f2 = () => async.timeout(10).then(() => res.push(2));
                const f3 = () => Promise.resolve(true).then(() => res.push(3));
                const f4 = () => async.timeout(20).then(() => res.push(4));
                const f5 = () => async.timeout(0).then(() => res.push(5));
                queue.queue(f1);
                queue.queue(f2);
                queue.queue(f3);
                queue.queue(f4);
                return queue.queue(f5).then(() => {
                    assert.strictEqual(res[0], 1);
                    assert.strictEqual(res[1], 2);
                    assert.strictEqual(res[2], 3);
                    assert.strictEqual(res[3], 4);
                    assert.strictEqual(res[4], 5);
                });
            });
        });
        test('errors bubble individually but not cause stop', function () {
            const queue = new async.Queue();
            const res = [];
            let error = false;
            const f1 = () => Promise.resolve(true).then(() => res.push(1));
            const f2 = () => async.timeout(10).then(() => res.push(2));
            const f3 = () => Promise.resolve(true).then(() => Promise.reject(new Error('error')));
            const f4 = () => async.timeout(20).then(() => res.push(4));
            const f5 = () => async.timeout(0).then(() => res.push(5));
            queue.queue(f1);
            queue.queue(f2);
            queue.queue(f3).then(undefined, () => (error = true));
            queue.queue(f4);
            return queue.queue(f5).then(() => {
                assert.strictEqual(res[0], 1);
                assert.strictEqual(res[1], 2);
                assert.ok(error);
                assert.strictEqual(res[2], 4);
                assert.strictEqual(res[3], 5);
            });
        });
        test('order is kept (chained)', function () {
            const queue = new async.Queue();
            const res = [];
            const f1 = () => Promise.resolve(true).then(() => res.push(1));
            const f2 = () => async.timeout(10).then(() => res.push(2));
            const f3 = () => Promise.resolve(true).then(() => res.push(3));
            const f4 = () => async.timeout(20).then(() => res.push(4));
            const f5 = () => async.timeout(0).then(() => res.push(5));
            return queue.queue(f1).then(() => {
                return queue.queue(f2).then(() => {
                    return queue.queue(f3).then(() => {
                        return queue.queue(f4).then(() => {
                            return queue.queue(f5).then(() => {
                                assert.strictEqual(res[0], 1);
                                assert.strictEqual(res[1], 2);
                                assert.strictEqual(res[2], 3);
                                assert.strictEqual(res[3], 4);
                                assert.strictEqual(res[4], 5);
                            });
                        });
                    });
                });
            });
        });
        test('events', async function () {
            const queue = new async.Queue();
            let drained = false;
            const onDrained = Event.toPromise(queue.onDrained).then(() => (drained = true));
            const res = [];
            const f1 = () => async.timeout(10).then(() => res.push(2));
            const f2 = () => async.timeout(20).then(() => res.push(4));
            const f3 = () => async.timeout(0).then(() => res.push(5));
            const q1 = queue.queue(f1);
            const q2 = queue.queue(f2);
            queue.queue(f3);
            q1.then(() => {
                assert.ok(!drained);
                q2.then(() => {
                    assert.ok(!drained);
                });
            });
            await onDrained;
            assert.ok(drained);
        });
    });
    suite('ResourceQueue', () => {
        test('simple', async function () {
            const queue = new async.ResourceQueue();
            await queue.whenDrained(); // returns immediately since empty
            let done1 = false;
            queue.queueFor(URI.file('/some/path'), async () => {
                done1 = true;
            });
            await queue.whenDrained(); // returns immediately since no work scheduled
            assert.strictEqual(done1, true);
            let done2 = false;
            queue.queueFor(URI.file('/some/other/path'), async () => {
                done2 = true;
            });
            await queue.whenDrained(); // returns immediately since no work scheduled
            assert.strictEqual(done2, true);
            // schedule some work
            const w1 = new async.DeferredPromise();
            queue.queueFor(URI.file('/some/path'), () => w1.p);
            let drained = false;
            queue.whenDrained().then(() => (drained = true));
            assert.strictEqual(drained, false);
            await w1.complete();
            await async.timeout(0);
            assert.strictEqual(drained, true);
            // schedule some work
            const w2 = new async.DeferredPromise();
            const w3 = new async.DeferredPromise();
            queue.queueFor(URI.file('/some/path'), () => w2.p);
            queue.queueFor(URI.file('/some/other/path'), () => w3.p);
            drained = false;
            queue.whenDrained().then(() => (drained = true));
            queue.dispose();
            await async.timeout(0);
            assert.strictEqual(drained, true);
        });
    });
    suite('retry', () => {
        test('success case', async () => {
            return runWithFakedTimers({ useFakeTimers: true }, async () => {
                let counter = 0;
                const res = await async.retry(() => {
                    counter++;
                    if (counter < 2) {
                        return Promise.reject(new Error('fail'));
                    }
                    return Promise.resolve(true);
                }, 10, 3);
                assert.strictEqual(res, true);
            });
        });
        test('error case', async () => {
            return runWithFakedTimers({ useFakeTimers: true }, async () => {
                const expectedError = new Error('fail');
                try {
                    await async.retry(() => {
                        return Promise.reject(expectedError);
                    }, 10, 3);
                }
                catch (error) {
                    assert.strictEqual(error, error);
                }
            });
        });
    });
    suite('TaskSequentializer', () => {
        test('execution basics', async function () {
            const sequentializer = new async.TaskSequentializer();
            assert.ok(!sequentializer.isRunning());
            assert.ok(!sequentializer.hasQueued());
            assert.ok(!sequentializer.isRunning(2323));
            assert.ok(!sequentializer.running);
            // pending removes itself after done
            await sequentializer.run(1, Promise.resolve());
            assert.ok(!sequentializer.isRunning());
            assert.ok(!sequentializer.isRunning(1));
            assert.ok(!sequentializer.running);
            assert.ok(!sequentializer.hasQueued());
            // pending removes itself after done (use async.timeout)
            sequentializer.run(2, async.timeout(1));
            assert.ok(sequentializer.isRunning());
            assert.ok(sequentializer.isRunning(2));
            assert.ok(!sequentializer.hasQueued());
            assert.strictEqual(sequentializer.isRunning(1), false);
            assert.ok(sequentializer.running);
            await async.timeout(2);
            assert.strictEqual(sequentializer.isRunning(), false);
            assert.strictEqual(sequentializer.isRunning(2), false);
            assert.ok(!sequentializer.running);
        });
        test('executing and queued (finishes instantly)', async function () {
            const sequentializer = new async.TaskSequentializer();
            let pendingDone = false;
            sequentializer.run(1, async.timeout(1).then(() => {
                pendingDone = true;
                return;
            }));
            // queued finishes instantly
            let queuedDone = false;
            const res = sequentializer.queue(() => Promise.resolve(null).then(() => {
                queuedDone = true;
                return;
            }));
            assert.ok(sequentializer.hasQueued());
            await res;
            assert.ok(pendingDone);
            assert.ok(queuedDone);
            assert.ok(!sequentializer.hasQueued());
        });
        test('executing and queued (finishes after timeout)', async function () {
            const sequentializer = new async.TaskSequentializer();
            let pendingDone = false;
            sequentializer.run(1, async.timeout(1).then(() => {
                pendingDone = true;
                return;
            }));
            // queued finishes after async.timeout
            let queuedDone = false;
            const res = sequentializer.queue(() => async.timeout(1).then(() => {
                queuedDone = true;
                return;
            }));
            await res;
            assert.ok(pendingDone);
            assert.ok(queuedDone);
            assert.ok(!sequentializer.hasQueued());
        });
        test('join (without executing or queued)', async function () {
            const sequentializer = new async.TaskSequentializer();
            await sequentializer.join();
            assert.ok(!sequentializer.hasQueued());
        });
        test('join (without queued)', async function () {
            const sequentializer = new async.TaskSequentializer();
            let pendingDone = false;
            sequentializer.run(1, async.timeout(1).then(() => {
                pendingDone = true;
                return;
            }));
            await sequentializer.join();
            assert.ok(pendingDone);
            assert.ok(!sequentializer.isRunning());
        });
        test('join (with executing and queued)', async function () {
            const sequentializer = new async.TaskSequentializer();
            let pendingDone = false;
            sequentializer.run(1, async.timeout(1).then(() => {
                pendingDone = true;
                return;
            }));
            // queued finishes after async.timeout
            let queuedDone = false;
            sequentializer.queue(() => async.timeout(1).then(() => {
                queuedDone = true;
                return;
            }));
            await sequentializer.join();
            assert.ok(pendingDone);
            assert.ok(queuedDone);
            assert.ok(!sequentializer.isRunning());
            assert.ok(!sequentializer.hasQueued());
        });
        test('executing and multiple queued (last one wins)', async function () {
            const sequentializer = new async.TaskSequentializer();
            let pendingDone = false;
            sequentializer.run(1, async.timeout(1).then(() => {
                pendingDone = true;
                return;
            }));
            // queued finishes after async.timeout
            let firstDone = false;
            const firstRes = sequentializer.queue(() => async.timeout(2).then(() => {
                firstDone = true;
                return;
            }));
            let secondDone = false;
            const secondRes = sequentializer.queue(() => async.timeout(3).then(() => {
                secondDone = true;
                return;
            }));
            let thirdDone = false;
            const thirdRes = sequentializer.queue(() => async.timeout(4).then(() => {
                thirdDone = true;
                return;
            }));
            await Promise.all([firstRes, secondRes, thirdRes]);
            assert.ok(pendingDone);
            assert.ok(!firstDone);
            assert.ok(!secondDone);
            assert.ok(thirdDone);
        });
        test('cancel executing', async function () {
            const sequentializer = new async.TaskSequentializer();
            const ctsTimeout = store.add(new CancellationTokenSource());
            let pendingCancelled = false;
            const timeout = async.timeout(1, ctsTimeout.token);
            sequentializer.run(1, timeout, () => (pendingCancelled = true));
            sequentializer.cancelRunning();
            assert.ok(pendingCancelled);
            ctsTimeout.cancel();
        });
    });
    suite('disposableTimeout', () => {
        test('handler only success', async () => {
            let cb = false;
            const t = async.disposableTimeout(() => (cb = true));
            await async.timeout(0);
            assert.strictEqual(cb, true);
            t.dispose();
        });
        test('handler only cancel', async () => {
            let cb = false;
            const t = async.disposableTimeout(() => (cb = true));
            t.dispose();
            await async.timeout(0);
            assert.strictEqual(cb, false);
        });
        test('store managed success', async () => {
            let cb = false;
            const s = new DisposableStore();
            async.disposableTimeout(() => (cb = true), 0, s);
            await async.timeout(0);
            assert.strictEqual(cb, true);
            s.dispose();
        });
        test('store managed cancel via disposable', async () => {
            let cb = false;
            const s = new DisposableStore();
            const t = async.disposableTimeout(() => (cb = true), 0, s);
            t.dispose();
            await async.timeout(0);
            assert.strictEqual(cb, false);
            s.dispose();
        });
        test('store managed cancel via store', async () => {
            let cb = false;
            const s = new DisposableStore();
            async.disposableTimeout(() => (cb = true), 0, s);
            s.dispose();
            await async.timeout(0);
            assert.strictEqual(cb, false);
        });
    });
    test('raceCancellation', async () => {
        const cts = store.add(new CancellationTokenSource());
        const ctsTimeout = store.add(new CancellationTokenSource());
        let triggered = false;
        const timeout = async.timeout(100, ctsTimeout.token);
        const p = async.raceCancellation(timeout.then(() => (triggered = true)), cts.token);
        cts.cancel();
        await p;
        assert.ok(!triggered);
        ctsTimeout.cancel();
    });
    test('raceTimeout', async () => {
        const cts = store.add(new CancellationTokenSource());
        // timeout wins
        let timedout = false;
        let triggered = false;
        const ctsTimeout1 = store.add(new CancellationTokenSource());
        const timeout1 = async.timeout(100, ctsTimeout1.token);
        const p1 = async.raceTimeout(timeout1.then(() => (triggered = true)), 1, () => (timedout = true));
        cts.cancel();
        await p1;
        assert.ok(!triggered);
        assert.strictEqual(timedout, true);
        ctsTimeout1.cancel();
        // promise wins
        timedout = false;
        const ctsTimeout2 = store.add(new CancellationTokenSource());
        const timeout2 = async.timeout(1, ctsTimeout2.token);
        const p2 = async.raceTimeout(timeout2.then(() => (triggered = true)), 100, () => (timedout = true));
        cts.cancel();
        await p2;
        assert.ok(triggered);
        assert.strictEqual(timedout, false);
        ctsTimeout2.cancel();
    });
    test('SequencerByKey', async () => {
        const s = new async.SequencerByKey();
        const r1 = await s.queue('key1', () => Promise.resolve('hello'));
        assert.strictEqual(r1, 'hello');
        await s
            .queue('key2', () => Promise.reject(new Error('failed')))
            .then(() => {
            throw new Error('should not be resolved');
        }, (err) => {
            // Expected error
            assert.strictEqual(err.message, 'failed');
        });
        // Still works after a queued promise is rejected
        const r3 = await s.queue('key2', () => Promise.resolve('hello'));
        assert.strictEqual(r3, 'hello');
    });
    test('IntervalCounter', async () => {
        let now = 0;
        const counter = new async.IntervalCounter(5, () => now);
        assert.strictEqual(counter.increment(), 1);
        assert.strictEqual(counter.increment(), 2);
        assert.strictEqual(counter.increment(), 3);
        now = 10;
        assert.strictEqual(counter.increment(), 1);
        assert.strictEqual(counter.increment(), 2);
        assert.strictEqual(counter.increment(), 3);
    });
    suite('firstParallel', () => {
        test('simple', async () => {
            const a = await async.firstParallel([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)], (v) => v === 2);
            assert.strictEqual(a, 2);
        });
        test('uses null default', async () => {
            assert.strictEqual(await async.firstParallel([Promise.resolve(1)], (v) => v === 2), null);
        });
        test('uses value default', async () => {
            assert.strictEqual(await async.firstParallel([Promise.resolve(1)], (v) => v === 2, 4), 4);
        });
        test('empty', async () => {
            assert.strictEqual(await async.firstParallel([], (v) => v === 2, 4), 4);
        });
        test('cancels', async () => {
            let ct1;
            const p1 = async.createCancelablePromise(async (ct) => {
                ct1 = ct;
                await async.timeout(200, ct);
                return 1;
            });
            let ct2;
            const p2 = async.createCancelablePromise(async (ct) => {
                ct2 = ct;
                await async.timeout(2, ct);
                return 2;
            });
            assert.strictEqual(await async.firstParallel([p1, p2], (v) => v === 2, 4), 2);
            assert.strictEqual(ct1.isCancellationRequested, true, 'should cancel a');
            assert.strictEqual(ct2.isCancellationRequested, true, 'should cancel b');
        });
        test('rejection handling', async () => {
            let ct1;
            const p1 = async.createCancelablePromise(async (ct) => {
                ct1 = ct;
                await async.timeout(200, ct);
                return 1;
            });
            let ct2;
            const p2 = async.createCancelablePromise(async (ct) => {
                ct2 = ct;
                await async.timeout(2, ct);
                throw new Error('oh no');
            });
            assert.strictEqual(await async.firstParallel([p1, p2], (v) => v === 2, 4).catch(() => 'ok'), 'ok');
            assert.strictEqual(ct1.isCancellationRequested, true, 'should cancel a');
            assert.strictEqual(ct2.isCancellationRequested, true, 'should cancel b');
        });
    });
    suite('DeferredPromise', () => {
        test('resolves', async () => {
            const deferred = new async.DeferredPromise();
            assert.strictEqual(deferred.isResolved, false);
            deferred.complete(42);
            assert.strictEqual(await deferred.p, 42);
            assert.strictEqual(deferred.isResolved, true);
        });
        test('rejects', async () => {
            const deferred = new async.DeferredPromise();
            assert.strictEqual(deferred.isRejected, false);
            const err = new Error('oh no!');
            deferred.error(err);
            assert.strictEqual(await deferred.p.catch((e) => e), err);
            assert.strictEqual(deferred.isRejected, true);
        });
        test('cancels', async () => {
            const deferred = new async.DeferredPromise();
            assert.strictEqual(deferred.isRejected, false);
            deferred.cancel();
            assert.strictEqual((await deferred.p.catch((e) => e)).name, 'Canceled');
            assert.strictEqual(deferred.isRejected, true);
        });
    });
    suite('Promises.settled', () => {
        test('resolves', async () => {
            const p1 = Promise.resolve(1);
            const p2 = async.timeout(1).then(() => 2);
            const p3 = async.timeout(2).then(() => 3);
            const result = await async.Promises.settled([p1, p2, p3]);
            assert.strictEqual(result.length, 3);
            assert.deepStrictEqual(result[0], 1);
            assert.deepStrictEqual(result[1], 2);
            assert.deepStrictEqual(result[2], 3);
        });
        test('resolves in order', async () => {
            const p1 = async.timeout(2).then(() => 1);
            const p2 = async.timeout(1).then(() => 2);
            const p3 = Promise.resolve(3);
            const result = await async.Promises.settled([p1, p2, p3]);
            assert.strictEqual(result.length, 3);
            assert.deepStrictEqual(result[0], 1);
            assert.deepStrictEqual(result[1], 2);
            assert.deepStrictEqual(result[2], 3);
        });
        test('rejects with first error but handles all promises (all errors)', async () => {
            const p1 = Promise.reject(1);
            let p2Handled = false;
            const p2Error = new Error('2');
            const p2 = async.timeout(1).then(() => {
                p2Handled = true;
                throw p2Error;
            });
            let p3Handled = false;
            const p3Error = new Error('3');
            const p3 = async.timeout(2).then(() => {
                p3Handled = true;
                throw p3Error;
            });
            let error = undefined;
            try {
                await async.Promises.settled([p1, p2, p3]);
            }
            catch (e) {
                error = e;
            }
            assert.ok(error);
            assert.notStrictEqual(error, p2Error);
            assert.notStrictEqual(error, p3Error);
            assert.ok(p2Handled);
            assert.ok(p3Handled);
        });
        test('rejects with first error but handles all promises (1 error)', async () => {
            const p1 = Promise.resolve(1);
            let p2Handled = false;
            const p2Error = new Error('2');
            const p2 = async.timeout(1).then(() => {
                p2Handled = true;
                throw p2Error;
            });
            let p3Handled = false;
            const p3 = async.timeout(2).then(() => {
                p3Handled = true;
                return 3;
            });
            let error = undefined;
            try {
                await async.Promises.settled([p1, p2, p3]);
            }
            catch (e) {
                error = e;
            }
            assert.strictEqual(error, p2Error);
            assert.ok(p2Handled);
            assert.ok(p3Handled);
        });
    });
    suite('Promises.withAsyncBody', () => {
        test('basics', async () => {
            const p1 = async.Promises.withAsyncBody(async (resolve, reject) => {
                resolve(1);
            });
            const p2 = async.Promises.withAsyncBody(async (resolve, reject) => {
                reject(new Error('error'));
            });
            const p3 = async.Promises.withAsyncBody(async (resolve, reject) => {
                throw new Error('error');
            });
            const r1 = await p1;
            assert.strictEqual(r1, 1);
            let e2 = undefined;
            try {
                await p2;
            }
            catch (error) {
                e2 = error;
            }
            assert.ok(e2 instanceof Error);
            let e3 = undefined;
            try {
                await p3;
            }
            catch (error) {
                e3 = error;
            }
            assert.ok(e3 instanceof Error);
        });
    });
    suite('ThrottledWorker', () => {
        function assertArrayEquals(actual, expected) {
            assert.strictEqual(actual.length, expected.length);
            for (let i = 0; i < actual.length; i++) {
                assert.strictEqual(actual[i], expected[i]);
            }
        }
        test('basics', async () => {
            let handled = [];
            let handledCallback;
            let handledPromise = new Promise((resolve) => (handledCallback = resolve));
            let handledCounterToResolve = 1;
            let currentHandledCounter = 0;
            const handler = (units) => {
                handled.push(...units);
                currentHandledCounter++;
                if (currentHandledCounter === handledCounterToResolve) {
                    handledCallback();
                    handledPromise = new Promise((resolve) => (handledCallback = resolve));
                    currentHandledCounter = 0;
                }
            };
            const worker = store.add(new async.ThrottledWorker({
                maxWorkChunkSize: 5,
                maxBufferedWork: undefined,
                throttleDelay: 1,
            }, handler));
            // Work less than chunk size
            let worked = worker.work([1, 2, 3]);
            assertArrayEquals(handled, [1, 2, 3]);
            assert.strictEqual(worker.pending, 0);
            assert.strictEqual(worked, true);
            worker.work([4, 5]);
            worked = worker.work([6]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5, 6]);
            assert.strictEqual(worker.pending, 0);
            assert.strictEqual(worked, true);
            // Work more than chunk size (variant 1)
            handled = [];
            handledCounterToResolve = 2;
            worked = worker.work([1, 2, 3, 4, 5, 6, 7]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worker.pending, 2);
            assert.strictEqual(worked, true);
            await handledPromise;
            assertArrayEquals(handled, [1, 2, 3, 4, 5, 6, 7]);
            handled = [];
            handledCounterToResolve = 4;
            worked = worker.work([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worker.pending, 14);
            assert.strictEqual(worked, true);
            await handledPromise;
            assertArrayEquals(handled, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
            // Work more than chunk size (variant 2)
            handled = [];
            handledCounterToResolve = 2;
            worked = worker.work([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worker.pending, 5);
            assert.strictEqual(worked, true);
            await handledPromise;
            assertArrayEquals(handled, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            // Work more while throttled (variant 1)
            handled = [];
            handledCounterToResolve = 3;
            worked = worker.work([1, 2, 3, 4, 5, 6, 7]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worker.pending, 2);
            assert.strictEqual(worked, true);
            worker.work([8]);
            worked = worker.work([9, 10, 11]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worker.pending, 6);
            assert.strictEqual(worked, true);
            await handledPromise;
            assertArrayEquals(handled, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
            assert.strictEqual(worker.pending, 0);
            // Work more while throttled (variant 2)
            handled = [];
            handledCounterToResolve = 2;
            worked = worker.work([1, 2, 3, 4, 5, 6, 7]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worked, true);
            worker.work([8]);
            worked = worker.work([9, 10]);
            assertArrayEquals(handled, [1, 2, 3, 4, 5]);
            assert.strictEqual(worked, true);
            await handledPromise;
            assertArrayEquals(handled, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        });
        test('do not accept too much work', async () => {
            const handled = [];
            const handler = (units) => handled.push(...units);
            const worker = store.add(new async.ThrottledWorker({
                maxWorkChunkSize: 5,
                maxBufferedWork: 5,
                throttleDelay: 1,
            }, handler));
            let worked = worker.work([1, 2, 3]);
            assert.strictEqual(worked, true);
            worked = worker.work([1, 2, 3, 4, 5, 6]);
            assert.strictEqual(worked, true);
            assert.strictEqual(worker.pending, 1);
            worked = worker.work([7]);
            assert.strictEqual(worked, true);
            assert.strictEqual(worker.pending, 2);
            worked = worker.work([8, 9, 10, 11]);
            assert.strictEqual(worked, false);
            assert.strictEqual(worker.pending, 2);
        });
        test('do not accept too much work (account for max chunk size', async () => {
            const handled = [];
            const handler = (units) => handled.push(...units);
            const worker = store.add(new async.ThrottledWorker({
                maxWorkChunkSize: 5,
                maxBufferedWork: 5,
                throttleDelay: 1,
            }, handler));
            let worked = worker.work([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
            assert.strictEqual(worked, false);
            assert.strictEqual(worker.pending, 0);
            worked = worker.work([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            assert.strictEqual(worked, true);
            assert.strictEqual(worker.pending, 5);
        });
        test('disposed', async () => {
            const handled = [];
            const handler = (units) => handled.push(...units);
            const worker = store.add(new async.ThrottledWorker({
                maxWorkChunkSize: 5,
                maxBufferedWork: undefined,
                throttleDelay: 1,
            }, handler));
            worker.dispose();
            const worked = worker.work([1, 2, 3]);
            assertArrayEquals(handled, []);
            assert.strictEqual(worker.pending, 0);
            assert.strictEqual(worked, false);
        });
        //  https://github.com/microsoft/vscode/issues/230366
        // 	test('waitThrottleDelayBetweenWorkUnits option', async () => {
        // 		const handled: number[] = [];
        // 		let handledCallback: Function;
        // 		let handledPromise = new Promise(resolve => handledCallback = resolve);
        // 		let currentTime = 0;
        // 		const handler = (units: readonly number[]) => {
        // 			handled.push(...units);
        // 			handledCallback();
        // 			handledPromise = new Promise(resolve => handledCallback = resolve);
        // 		};
        // 		const worker = store.add(new async.ThrottledWorker<number>({
        // 			maxWorkChunkSize: 5,
        // 			maxBufferedWork: undefined,
        // 			throttleDelay: 5,
        // 			waitThrottleDelayBetweenWorkUnits: true
        // 		}, handler));
        // 		// Schedule work, it should execute immediately
        // 		currentTime = Date.now();
        // 		let worked = worker.work([1, 2, 3]);
        // 		assert.strictEqual(worked, true);
        // 		assertArrayEquals(handled, [1, 2, 3]);
        // 		assert.strictEqual(Date.now() - currentTime < 5, true);
        // 		// Schedule work again, it should wait at least throttle delay before executing
        // 		currentTime = Date.now();
        // 		worked = worker.work([4, 5]);
        // 		assert.strictEqual(worked, true);
        // 		// Throttle delay hasn't reset so we still must wait
        // 		assertArrayEquals(handled, [1, 2, 3]);
        // 		await handledPromise;
        // 		assert.strictEqual(Date.now() - currentTime >= 5, true);
        // 		assertArrayEquals(handled, [1, 2, 3, 4, 5]);
        // 	});
    });
    suite('LimitedQueue', () => {
        test('basics (with long running task)', async () => {
            const limitedQueue = new async.LimitedQueue();
            let counter = 0;
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(limitedQueue.queue(async () => {
                    counter = i;
                    await async.timeout(1);
                }));
            }
            await Promise.all(promises);
            // only the last task executed
            assert.strictEqual(counter, 4);
        });
        test('basics (with sync running task)', async () => {
            const limitedQueue = new async.LimitedQueue();
            let counter = 0;
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(limitedQueue.queue(async () => {
                    counter = i;
                }));
            }
            await Promise.all(promises);
            // only the last task executed
            assert.strictEqual(counter, 4);
        });
    });
    suite('AsyncIterableObject', function () {
        test('onReturn NOT called', async function () {
            let calledOnReturn = false;
            const iter = new async.AsyncIterableObject((writer) => {
                writer.emitMany([1, 2, 3, 4, 5]);
            }, () => {
                calledOnReturn = true;
            });
            for await (const item of iter) {
                assert.strictEqual(typeof item, 'number');
            }
            assert.strictEqual(calledOnReturn, false);
        });
        test('onReturn called on break', async function () {
            let calledOnReturn = false;
            const iter = new async.AsyncIterableObject((writer) => {
                writer.emitMany([1, 2, 3, 4, 5]);
            }, () => {
                calledOnReturn = true;
            });
            for await (const item of iter) {
                assert.strictEqual(item, 1);
                break;
            }
            assert.strictEqual(calledOnReturn, true);
        });
        test('onReturn called on return', async function () {
            let calledOnReturn = false;
            const iter = new async.AsyncIterableObject((writer) => {
                writer.emitMany([1, 2, 3, 4, 5]);
            }, () => {
                calledOnReturn = true;
            });
            await (async function test() {
                for await (const item of iter) {
                    assert.strictEqual(item, 1);
                    return;
                }
            })();
            assert.strictEqual(calledOnReturn, true);
        });
        test('onReturn called on throwing', async function () {
            let calledOnReturn = false;
            const iter = new async.AsyncIterableObject((writer) => {
                writer.emitMany([1, 2, 3, 4, 5]);
            }, () => {
                calledOnReturn = true;
            });
            try {
                for await (const item of iter) {
                    assert.strictEqual(item, 1);
                    throw new Error();
                }
            }
            catch (e) { }
            assert.strictEqual(calledOnReturn, true);
        });
    });
    suite('AsyncIterableSource', function () {
        test('onReturn is wired up', async function () {
            let calledOnReturn = false;
            const source = new async.AsyncIterableSource(() => {
                calledOnReturn = true;
            });
            source.emitOne(1);
            source.emitOne(2);
            source.emitOne(3);
            source.resolve();
            for await (const item of source.asyncIterable) {
                assert.strictEqual(item, 1);
                break;
            }
            assert.strictEqual(calledOnReturn, true);
        });
        test('onReturn is wired up 2', async function () {
            let calledOnReturn = false;
            const source = new async.AsyncIterableSource(() => {
                calledOnReturn = true;
            });
            source.emitOne(1);
            source.emitOne(2);
            source.emitOne(3);
            source.resolve();
            for await (const item of source.asyncIterable) {
                assert.strictEqual(typeof item, 'number');
            }
            assert.strictEqual(calledOnReturn, false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9hc3luYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLHVCQUF1QixDQUFBO0FBQzlDLE9BQU8sS0FBSyxjQUFjLE1BQU0seUJBQXlCLENBQUE7QUFDekQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDekMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUUzRCxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELEtBQUssQ0FBQyxtQkFBbUIsRUFBRTtRQUMxQixJQUFJLENBQUMseUNBQXlDLEVBQUU7WUFDL0MsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFBO1lBQ2hCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUN2RCxLQUFLLENBQUMsR0FBRyxDQUNSLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUNu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QUVwRCxlQUFlO1FBQ2YsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFBO1FBQ3BCLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUVyQixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1FBQzVELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN0RCxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQ3ZDLENBQUMsRUFDRCxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FDdkIsQ0FBQTtRQUNELEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUVaLE1BQU0sRUFBRSxDQUFBO1FBRVIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUVwQixlQUFlO1FBQ2YsUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUVoQixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1FBQzVELE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNwRCxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUMzQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQ3ZDLEdBQUcsRUFDSCxHQUFHLEVBQUUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxJ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