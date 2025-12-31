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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vYXN5bmMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QyxPQUFPLEtBQUssY0FBYyxNQUFNLHlCQUF5QixDQUFBO0FBQ3pELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDN0MsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFM0QsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFDbkIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxLQUFLLENBQUMsbUJBQW1CLEVBQUU7UUFDMUIsSUFBSSxDQUFDLHlDQUF5QyxFQUFFO1lBQy9DLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQTtZQUNoQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDdkQsS0FBSyxDQUFDLEdBQUcsQ0FDUixLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtvQkFDbkMsUUFB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ZUFBZTtRQUNmLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUNwQixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUE7UUFFckIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdEQsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUN2QyxDQUFDLEVBQ0QsR0FBRyxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQ3ZCLENBQUE7UUFDRCxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFWixNQUFNLEVBQUUsQ0FBQTtRQUVSLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyQixNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFcEIsZUFBZTtRQUNmLFFBQVEsR0FBRyxLQUFLLENBQUE7UUFFaEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtRQUM1RCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEQsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FDM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUN2QyxHQUFHLEVBQ0gsR0FBRyxFQUFFLENBQUMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxD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