/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { stub } from 'sinon';
import { DeferredPromise, timeout } from '../../common/async.js';
import { CancellationToken } from '../../common/cancellation.js';
import { errorHandler, setUnexpectedErrorHandler } from '../../common/errors.js';
import { AsyncEmitter, DebounceEmitter, DynamicListEventMultiplexer, Emitter, Event, EventBufferer, EventMultiplexer, ListenerLeakError, ListenerRefusalError, MicrotaskEmitter, PauseableEmitter, Relay, createEventDeliveryQueue, } from '../../common/event.js';
import { DisposableStore, isDisposable, setDisposableTracker, DisposableTracker, } from '../../common/lifecycle.js';
import { observableValue, transaction } from '../../common/observable.js';
import { MicrotaskDelay } from '../../common/symbols.js';
import { runWithFakedTimers } from './timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { tail } from '../../common/arrays.js';
var Samples;
(function (Samples) {
    class EventCounter {
        constructor() {
            this.count = 0;
        }
        reset() {
            this.count = 0;
        }
        onEvent() {
            this.count += 1;
        }
    }
    Samples.EventCounter = EventCounter;
    class Document3 {
        constructor() {
            this._onDidChange = new Emitter();
            this.onDidChange = this._onDidChange.event;
        }
        setText(value) {
            //...
            this._onDidChange.fire(value);
        }
        dispose() {
            this._onDidChange.dispose();
        }
    }
    Samples.Document3 = Document3;
})(Samples || (Samples = {}));
suite('Event utils dispose', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let tracker = new DisposableTracker();
    function assertDisposablesCount(expected) {
        if (Array.isArray(expected)) {
            const instances = new Set(expected);
            const actualInstances = tracker.getTrackedDisposables();
            assert.strictEqual(actualInstances.length, expected.length);
            for (const item of actualInstances) {
                assert.ok(instances.has(item));
            }
        }
        else {
            assert.strictEqual(tracker.getTrackedDisposables().length, expected);
        }
    }
    setup(() => {
        tracker = new DisposableTracker();
        setDisposableTracker(tracker);
    });
    teardown(function () {
        setDisposableTracker(null);
    });
    test('no leak with snapshot-utils', function () {
        const store = new DisposableStore();
        const emitter = ds.add(new Emitter());
        const evens = Event.filter(emitter.event, (n) => n % 2 === 0, store);
        assertDisposablesCount(1); // snaphot only listen when `evens` is being listened on
        let all = 0;
        const leaked = evens((n) => (all += n));
        assert.ok(isDisposable(leaked));
        assertDisposablesCount(3);
        emitter.dispose();
        store.dispose();
        assertDisposablesCount([leaked]); // leaked is still there
    });
    test('no leak with debounce-util', function () {
        const store = new DisposableStore();
        const emitter = ds.add(new Emitter());
        const debounced = Event.debounce(emitter.event, (l) => 0, undefined, undefined, undefined, undefined, store);
        assertDisposablesCount(1); // debounce only listens when `debounce` is being listened on
        let all = 0;
        const leaked = debounced((n) => (all += n));
        assert.ok(isDisposable(leaked));
        assertDisposablesCount(3);
        emitter.dispose();
        store.dispose();
        assertDisposablesCount([leaked]); // leaked is still there
    });
});
suite('Event', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    const counter = new Samples.EventCounter();
    setup(() => counter.reset());
    test('Emitter plain', function () {
        const doc = ds.add(new Samples.Document3());
        const subscription = doc.onDidChange(counter.onEvent, counter);
        doc.setText('far');
        doc.setText('boo');
        // unhook listener
        subscription.dispose();
        doc.setText('boo');
        assert.strictEqual(counter.count, 2);
    });
    test('Emitter duplicate functions', () => {
        const calls = [];
        const a = (v) => calls.push(`a${v}`);
        const b = (v) => calls.push(`b${v}`);
        const emitter = ds.add(new Emitter());
        ds.add(emitter.event(a));
        ds.add(emitter.event(b));
        const s2 = emitter.event(a);
        emitter.fire('1');
        assert.deepStrictEqual(calls, ['a1', 'b1', 'a1']);
        s2.dispose();
        calls.length = 0;
        emitter.fire('2');
        assert.deepStrictEqual(calls, ['a2', 'b2']);
    });
    test('Emitter, dispose listener during emission', () => {
        for (let keepFirstMod = 1; keepFirstMod < 4; keepFirstMod++) {
            const emitter = ds.add(new Emitter());
            const calls = [];
            const disposables = Array.from({ length: 25 }, (_, n) => ds.add(emitter.event(() => {
                if (n % keepFirstMod === 0) {
                    disposables[n].dispose();
                }
                calls.push(n);
            })));
            emitter.fire();
            assert.deepStrictEqual(calls, Array.from({ length: 25 }, (_, n) => n));
        }
    });
    test('Emitter, dispose emitter during emission', () => {
        const emitter = ds.add(new Emitter());
        const calls = [];
        const disposables = Array.from({ length: 25 }, (_, n) => ds.add(emitter.event(() => {
            if (n === 10) {
                emitter.dispose();
            }
            calls.push(n);
        })));
        emitter.fire();
        disposables.forEach((d) => d.dispose());
        assert.deepStrictEqual(calls, Array.from({ length: 11 }, (_, n) => n));
    });
    test('Emitter, shared delivery queue', () => {
        const deliveryQueue = createEventDeliveryQueue();
        const emitter1 = ds.add(new Emitter({ deliveryQueue }));
        const emitter2 = ds.add(new Emitter({ deliveryQueue }));
        const calls = [];
        ds.add(emitter1.event((d) => {
            calls.push(`${d}a`);
            if (d === 1) {
                emitter2.fire(2);
            }
        }));
        ds.add(emitter1.event((d) => {
            calls.push(`${d}b`);
        }));
        ds.add(emitter2.event((d) => {
            calls.push(`${d}c`);
            emitter1.dispose();
        }));
        ds.add(emitter2.event((d) => {
            calls.push(`${d}d`);
        }));
        emitter1.fire(1);
        // 1. Check that 2 is not delivered before 1 finishes
        // 2. Check that 2 finishes getting delivered even if one emitter is disposed
        assert.deepStrictEqual(calls, ['1a', '1b', '2c', '2d']);
    });
    test('Emitter, handles removal during 3', () => {
        const fn1 = stub();
        const fn2 = stub();
        const emitter = ds.add(new Emitter());
        ds.add(emitter.event(fn1));
        const h = emitter.event(() => {
            h.dispose();
        });
        ds.add(emitter.event(fn2));
        emitter.fire('foo');
        assert.deepStrictEqual(fn2.args, [['foo']]);
        assert.deepStrictEqual(fn1.args, [['foo']]);
    });
    test('Emitter, handles removal during 2', () => {
        const fn1 = stub();
        const emitter = ds.add(new Emitter());
        ds.add(emitter.event(fn1));
        const h = emitter.event(() => {
            h.dispose();
        });
        emitter.fire('foo');
        assert.deepStrictEqual(fn1.args, [['foo']]);
    });
    test('Emitter, bucket', function () {
        const bucket = [];
        const doc = ds.add(new Samples.Document3());
        const subscription = doc.onDidChange(counter.onEvent, counter, bucket);
        doc.setText('far');
        doc.setText('boo');
        // unhook listener
        while (bucket.length) {
            bucket.pop().dispose();
        }
        doc.setText('boo');
        // noop
        subscription.dispose();
        doc.setText('boo');
        assert.strictEqual(counter.count, 2);
    });
    test('Emitter, store', function () {
        const bucket = ds.add(new DisposableStore());
        const doc = ds.add(new Samples.Document3());
        const subscription = doc.onDidChange(counter.onEvent, counter, bucket);
        doc.setText('far');
        doc.setText('boo');
        // unhook listener
        bucket.clear();
        doc.setText('boo');
        // noop
        subscription.dispose();
        doc.setText('boo');
        assert.strictEqual(counter.count, 2);
    });
    test('onFirstAdd|onLastRemove', () => {
        let firstCount = 0;
        let lastCount = 0;
        const a = ds.add(new Emitter({
            onWillAddFirstListener() {
                firstCount += 1;
            },
            onDidRemoveLastListener() {
                lastCount += 1;
            },
        }));
        assert.strictEqual(firstCount, 0);
        assert.strictEqual(lastCount, 0);
        let subscription1 = ds.add(a.event(function () { }));
        const subscription2 = ds.add(a.event(function () { }));
        assert.strictEqual(firstCount, 1);
        assert.strictEqual(lastCount, 0);
        subscription1.dispose();
        assert.strictEqual(firstCount, 1);
        assert.strictEqual(lastCount, 0);
        subscription2.dispose();
        assert.strictEqual(firstCount, 1);
        assert.strictEqual(lastCount, 1);
        subscription1 = ds.add(a.event(function () { }));
        assert.strictEqual(firstCount, 2);
        assert.strictEqual(lastCount, 1);
    });
    test('onDidAddListener', () => {
        let count = 0;
        const a = ds.add(new Emitter({
            onDidAddListener() {
                count += 1;
            },
        }));
        assert.strictEqual(count, 0);
        let subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 1);
        subscription.dispose();
        assert.strictEqual(count, 1);
        subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 2);
        subscription.dispose();
        assert.strictEqual(count, 2);
    });
    test('onWillRemoveListener', () => {
        let count = 0;
        const a = ds.add(new Emitter({
            onWillRemoveListener() {
                count += 1;
            },
        }));
        assert.strictEqual(count, 0);
        let subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 0);
        subscription.dispose();
        assert.strictEqual(count, 1);
        subscription = ds.add(a.event(function () { }));
        assert.strictEqual(count, 1);
    });
    test('throwingListener', () => {
        const origErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => null);
        try {
            const a = ds.add(new Emitter());
            let hit = false;
            ds.add(a.event(function () {
                // eslint-disable-next-line no-throw-literal
                throw 9;
            }));
            ds.add(a.event(function () {
                hit = true;
            }));
            a.fire(undefined);
            assert.strictEqual(hit, true);
        }
        finally {
            setUnexpectedErrorHandler(origErrorHandler);
        }
    });
    test('throwingListener (custom handler)', () => {
        const allError = [];
        const a = ds.add(new Emitter({
            onListenerError(e) {
                allError.push(e);
            },
        }));
        let hit = false;
        ds.add(a.event(function () {
            // eslint-disable-next-line no-throw-literal
            throw 9;
        }));
        ds.add(a.event(function () {
            hit = true;
        }));
        a.fire(undefined);
        assert.strictEqual(hit, true);
        assert.deepStrictEqual(allError, [9]);
    });
    test('throw ListenerLeakError', () => {
        const store = new DisposableStore();
        const allError = [];
        const a = ds.add(new Emitter({
            onListenerError(e) {
                allError.push(e);
            },
            leakWarningThreshold: 3,
        }));
        for (let i = 0; i < 11; i++) {
            a.event(() => { }, undefined, store);
        }
        assert.deepStrictEqual(allError.length, 5);
        const [start, rest] = tail(allError);
        assert.ok(rest instanceof ListenerRefusalError);
        for (const item of start) {
            assert.ok(item instanceof ListenerLeakError);
        }
        store.dispose();
    });
    test('reusing event function and context', function () {
        let counter = 0;
        function listener() {
            counter += 1;
        }
        const context = {};
        const emitter = ds.add(new Emitter());
        const reg1 = emitter.event(listener, context);
        const reg2 = emitter.event(listener, context);
        emitter.fire(undefined);
        assert.strictEqual(counter, 2);
        reg1.dispose();
        emitter.fire(undefined);
        assert.strictEqual(counter, 3);
        reg2.dispose();
        emitter.fire(undefined);
        assert.strictEqual(counter, 3);
    });
    test('DebounceEmitter', async function () {
        return runWithFakedTimers({}, async function () {
            let callCount = 0;
            let sum = 0;
            const emitter = new DebounceEmitter({
                merge: (arr) => {
                    callCount += 1;
                    return arr.reduce((p, c) => p + c);
                },
            });
            ds.add(emitter.event((e) => {
                sum = e;
            }));
            const p = Event.toPromise(emitter.event);
            emitter.fire(1);
            emitter.fire(2);
            await p;
            assert.strictEqual(callCount, 1);
            assert.strictEqual(sum, 3);
        });
    });
    test('Microtask Emitter', (done) => {
        let count = 0;
        assert.strictEqual(count, 0);
        const emitter = new MicrotaskEmitter();
        const listener = emitter.event(() => {
            count++;
        });
        emitter.fire();
        assert.strictEqual(count, 0);
        emitter.fire();
        assert.strictEqual(count, 0);
        // Should wait until the event loop ends and therefore be the last thing called
        setTimeout(() => {
            assert.strictEqual(count, 3);
            done();
        }, 0);
        queueMicrotask(() => {
            assert.strictEqual(count, 2);
            count++;
            listener.dispose();
        });
    });
    test('Emitter - In Order Delivery', function () {
        const a = ds.add(new Emitter());
        const listener2Events = [];
        ds.add(a.event(function listener1(event) {
            if (event === 'e1') {
                a.fire('e2');
                // assert that all events are delivered at this point
                assert.deepStrictEqual(listener2Events, ['e1', 'e2']);
            }
        }));
        ds.add(a.event(function listener2(event) {
            listener2Events.push(event);
        }));
        a.fire('e1');
        // assert that all events are delivered in order
        assert.deepStrictEqual(listener2Events, ['e1', 'e2']);
    });
    test('Emitter, - In Order Delivery 3x', function () {
        const a = ds.add(new Emitter());
        const listener2Events = [];
        ds.add(a.event(function listener1(event) {
            if (event === 'e2') {
                a.fire('e3');
                // assert that all events are delivered at this point
                assert.deepStrictEqual(listener2Events, ['e1', 'e2', 'e3']);
            }
        }));
        ds.add(a.event(function listener1(event) {
            if (event === 'e1') {
                a.fire('e2');
                // assert that all events are delivered at this point
                assert.deepStrictEqual(listener2Events, ['e1', 'e2', 'e3']);
            }
        }));
        ds.add(a.event(function listener2(event) {
            listener2Events.push(event);
        }));
        a.fire('e1');
        // assert that all events are delivered in order
        assert.deepStrictEqual(listener2Events, ['e1', 'e2', 'e3']);
    });
    test("Cannot read property '_actual' of undefined #142204", function () {
        const e = ds.add(new Emitter());
        const dispo = e.event(() => { });
        dispo.dispose.call(undefined); // assert that disposable can be called with this
    });
});
suite('AsyncEmitter', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('event has waitUntil-function', async function () {
        const emitter = new AsyncEmitter();
        ds.add(emitter.event((e) => {
            assert.strictEqual(e.foo, true);
            assert.strictEqual(e.bar, 1);
            assert.strictEqual(typeof e.waitUntil, 'function');
        }));
        emitter.fireAsync({ foo: true, bar: 1 }, CancellationToken.None);
        emitter.dispose();
    });
    test('sequential delivery', async function () {
        return runWithFakedTimers({}, async function () {
            let globalState = 0;
            const emitter = new AsyncEmitter();
            ds.add(emitter.event((e) => {
                e.waitUntil(timeout(10).then((_) => {
                    assert.strictEqual(globalState, 0);
                    globalState += 1;
                }));
            }));
            ds.add(emitter.event((e) => {
                e.waitUntil(timeout(1).then((_) => {
                    assert.strictEqual(globalState, 1);
                    globalState += 1;
                }));
            }));
            await emitter.fireAsync({ foo: true }, CancellationToken.None);
            assert.strictEqual(globalState, 2);
        });
    });
    test('sequential, in-order delivery', async function () {
        return runWithFakedTimers({}, async function () {
            const events = [];
            let done = false;
            const emitter = new AsyncEmitter();
            // e1
            ds.add(emitter.event((e) => {
                e.waitUntil(timeout(10).then(async (_) => {
                    if (e.foo === 1) {
                        await emitter.fireAsync({ foo: 2 }, CancellationToken.None);
                        assert.deepStrictEqual(events, [1, 2]);
                        done = true;
                    }
                }));
            }));
            // e2
            ds.add(emitter.event((e) => {
                events.push(e.foo);
                e.waitUntil(timeout(7));
            }));
            await emitter.fireAsync({ foo: 1 }, CancellationToken.None);
            assert.ok(done);
        });
    });
    test('catch errors', async function () {
        const origErrorHandler = errorHandler.getUnexpectedErrorHandler();
        setUnexpectedErrorHandler(() => null);
        let globalState = 0;
        const emitter = new AsyncEmitter();
        ds.add(emitter.event((e) => {
            globalState += 1;
            e.waitUntil(new Promise((_r, reject) => reject(new Error())));
        }));
        ds.add(emitter.event((e) => {
            globalState += 1;
            e.waitUntil(timeout(10));
            e.waitUntil(timeout(20).then(() => globalState++)); // multiple `waitUntil` are supported and awaited on
        }));
        await emitter
            .fireAsync({ foo: true }, CancellationToken.None)
            .then(() => {
            assert.strictEqual(globalState, 3);
        })
            .catch((e) => {
            console.log(e);
            assert.ok(false);
        });
        setUnexpectedErrorHandler(origErrorHandler);
    });
});
suite('PausableEmitter', function () {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('basic', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event((e) => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
    });
    test('pause/resume - no merge', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event((e) => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.pause();
        emitter.fire(3);
        emitter.fire(4);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 3, 4]);
        emitter.fire(5);
        assert.deepStrictEqual(data, [1, 2, 3, 4, 5]);
    });
    test('pause/resume - merge', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter({ merge: (a) => a.reduce((p, c) => p + c, 0) }));
        ds.add(emitter.event((e) => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.pause();
        emitter.fire(3);
        emitter.fire(4);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 7]);
        emitter.fire(5);
        assert.deepStrictEqual(data, [1, 2, 7, 5]);
    });
    test('double pause/resume', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event((e) => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.pause();
        emitter.pause();
        emitter.fire(3);
        emitter.fire(4);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 3, 4]);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 2, 3, 4]);
    });
    test('resume, no pause', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        ds.add(emitter.event((e) => data.push(e)));
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, [1, 2]);
        emitter.resume();
        emitter.fire(3);
        assert.deepStrictEqual(data, [1, 2, 3]);
    });
    test('nested pause', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter());
        let once = true;
        ds.add(emitter.event((e) => {
            data.push(e);
            if (once) {
                emitter.pause();
                once = false;
            }
        }));
        ds.add(emitter.event((e) => {
            data.push(e);
        }));
        emitter.pause();
        emitter.fire(1);
        emitter.fire(2);
        assert.deepStrictEqual(data, []);
        emitter.resume();
        assert.deepStrictEqual(data, [1, 1]); // paused after first event
        emitter.resume();
        assert.deepStrictEqual(data, [1, 1, 2, 2]); // remaing event delivered
        emitter.fire(3);
        assert.deepStrictEqual(data, [1, 1, 2, 2, 3, 3]);
    });
    test('empty pause with merge', function () {
        const data = [];
        const emitter = ds.add(new PauseableEmitter({ merge: (a) => a[0] }));
        ds.add(emitter.event((e) => data.push(1)));
        emitter.pause();
        emitter.resume();
        assert.deepStrictEqual(data, []);
    });
});
suite('Event utils - ensureNoDisposablesAreLeakedInTestSuite', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('fromObservable', function () {
        const obs = observableValue('test', 12);
        const event = Event.fromObservable(obs);
        const values = [];
        const d = event((n) => {
            values.push(n);
        });
        obs.set(3, undefined);
        obs.set(13, undefined);
        obs.set(3, undefined);
        obs.set(33, undefined);
        obs.set(1, undefined);
        transaction((tx) => {
            obs.set(334, tx);
            obs.set(99, tx);
        });
        assert.deepStrictEqual(values, [3, 13, 3, 33, 1, 99]);
        d.dispose();
    });
});
suite('Event utils', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    suite('EventBufferer', () => {
        test('should not buffer when not wrapped', () => {
            const bufferer = new EventBufferer();
            const counter = new Samples.EventCounter();
            const emitter = ds.add(new Emitter());
            const event = bufferer.wrapEvent(emitter.event);
            const listener = event(counter.onEvent, counter);
            assert.strictEqual(counter.count, 0);
            emitter.fire();
            assert.strictEqual(counter.count, 1);
            emitter.fire();
            assert.strictEqual(counter.count, 2);
            emitter.fire();
            assert.strictEqual(counter.count, 3);
            listener.dispose();
        });
        test('should buffer when wrapped', () => {
            const bufferer = new EventBufferer();
            const counter = new Samples.EventCounter();
            const emitter = ds.add(new Emitter());
            const event = bufferer.wrapEvent(emitter.event);
            const listener = event(counter.onEvent, counter);
            assert.strictEqual(counter.count, 0);
            emitter.fire();
            assert.strictEqual(counter.count, 1);
            bufferer.bufferEvents(() => {
                emitter.fire();
                assert.strictEqual(counter.count, 1);
                emitter.fire();
                assert.strictEqual(counter.count, 1);
            });
            assert.strictEqual(counter.count, 3);
            emitter.fire();
            assert.strictEqual(counter.count, 4);
            listener.dispose();
        });
        test('once', () => {
            const emitter = ds.add(new Emitter());
            let counter1 = 0, counter2 = 0, counter3 = 0;
            const listener1 = emitter.event(() => counter1++);
            const listener2 = Event.once(emitter.event)(() => counter2++);
            const listener3 = Event.once(emitter.event)(() => counter3++);
            assert.strictEqual(counter1, 0);
            assert.strictEqual(counter2, 0);
            assert.strictEqual(counter3, 0);
            listener3.dispose();
            emitter.fire();
            assert.strictEqual(counter1, 1);
            assert.strictEqual(counter2, 1);
            assert.strictEqual(counter3, 0);
            emitter.fire();
            assert.strictEqual(counter1, 2);
            assert.strictEqual(counter2, 1);
            assert.strictEqual(counter3, 0);
            listener1.dispose();
            listener2.dispose();
        });
    });
    suite('buffer', () => {
        test('should buffer events', () => {
            const result = [];
            const emitter = ds.add(new Emitter());
            const event = emitter.event;
            const bufferedEvent = Event.buffer(event);
            emitter.fire(1);
            emitter.fire(2);
            emitter.fire(3);
            assert.deepStrictEqual(result, []);
            const listener = bufferedEvent((num) => result.push(num));
            assert.deepStrictEqual(result, [1, 2, 3]);
            emitter.fire(4);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
            listener.dispose();
            emitter.fire(5);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
        });
        test('should buffer events on next tick', async () => {
            const result = [];
            const emitter = ds.add(new Emitter());
            const event = emitter.event;
            const bufferedEvent = Event.buffer(event, true);
            emitter.fire(1);
            emitter.fire(2);
            emitter.fire(3);
            assert.deepStrictEqual(result, []);
            const listener = bufferedEvent((num) => result.push(num));
            assert.deepStrictEqual(result, []);
            await timeout(10);
            emitter.fire(4);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
            listener.dispose();
            emitter.fire(5);
            assert.deepStrictEqual(result, [1, 2, 3, 4]);
        });
        test('should fire initial buffer events', () => {
            const result = [];
            const emitter = ds.add(new Emitter());
            const event = emitter.event;
            const bufferedEvent = Event.buffer(event, false, [-2, -1, 0]);
            emitter.fire(1);
            emitter.fire(2);
            emitter.fire(3);
            assert.deepStrictEqual(result, []);
            ds.add(bufferedEvent((num) => result.push(num)));
            assert.deepStrictEqual(result, [-2, -1, 0, 1, 2, 3]);
        });
    });
    suite('EventMultiplexer', () => {
        test('works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event((r) => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('multiplexer dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event((r) => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
            m.dispose();
            assert.deepStrictEqual(result, [0]);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('event dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event((r) => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
            e1.dispose();
            assert.deepStrictEqual(result, [0]);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('mutliplexer event dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event((r) => result.push(r)));
            const e1 = ds.add(new Emitter());
            const l1 = m.add(e1.event);
            assert.deepStrictEqual(result, []);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
            l1.dispose();
            assert.deepStrictEqual(result, [0]);
            e1.fire(0);
            assert.deepStrictEqual(result, [0]);
        });
        test('hot start works', () => {
            const result = [];
            const m = new EventMultiplexer();
            ds.add(m.event((r) => result.push(r)));
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            const e3 = ds.add(new Emitter());
            ds.add(m.add(e3.event));
            e1.fire(1);
            e2.fire(2);
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
        });
        test('cold start works', () => {
            const result = [];
            const m = new EventMultiplexer();
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            const e3 = ds.add(new Emitter());
            ds.add(m.add(e3.event));
            ds.add(m.event((r) => result.push(r)));
            e1.fire(1);
            e2.fire(2);
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
        });
        test('late add works', () => {
            const result = [];
            const m = new EventMultiplexer();
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            ds.add(m.event((r) => result.push(r)));
            e1.fire(1);
            e2.fire(2);
            const e3 = ds.add(new Emitter());
            ds.add(m.add(e3.event));
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
        });
        test('add dispose works', () => {
            const result = [];
            const m = new EventMultiplexer();
            const e1 = ds.add(new Emitter());
            ds.add(m.add(e1.event));
            const e2 = ds.add(new Emitter());
            ds.add(m.add(e2.event));
            ds.add(m.event((r) => result.push(r)));
            e1.fire(1);
            e2.fire(2);
            const e3 = ds.add(new Emitter());
            const l3 = m.add(e3.event);
            e3.fire(3);
            assert.deepStrictEqual(result, [1, 2, 3]);
            l3.dispose();
            e3.fire(4);
            assert.deepStrictEqual(result, [1, 2, 3]);
            e2.fire(4);
            e1.fire(5);
            assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
        });
    });
    suite('DynamicListEventMultiplexer', () => {
        let addEmitter;
        let removeEmitter;
        const recordedEvents = [];
        class TestItem {
            constructor() {
                this.onTestEventEmitter = ds.add(new Emitter());
                this.onTestEvent = this.onTestEventEmitter.event;
            }
        }
        let items;
        let m;
        setup(() => {
            addEmitter = ds.add(new Emitter());
            removeEmitter = ds.add(new Emitter());
            items = [new TestItem(), new TestItem()];
            for (const [i, item] of items.entries()) {
                ds.add(item.onTestEvent((e) => `${i}:${e}`));
            }
            m = new DynamicListEventMultiplexer(items, addEmitter.event, removeEmitter.event, (e) => e.onTestEvent);
            ds.add(m.event((e) => recordedEvents.push(e)));
            recordedEvents.length = 0;
        });
        teardown(() => m.dispose());
        test('should fire events for initial items', () => {
            items[0].onTestEventEmitter.fire(1);
            items[1].onTestEventEmitter.fire(2);
            items[0].onTestEventEmitter.fire(3);
            items[1].onTestEventEmitter.fire(4);
            assert.deepStrictEqual(recordedEvents, [1, 2, 3, 4]);
        });
        test('should fire events for added items', () => {
            const addedItem = new TestItem();
            addEmitter.fire(addedItem);
            addedItem.onTestEventEmitter.fire(1);
            items[0].onTestEventEmitter.fire(2);
            items[1].onTestEventEmitter.fire(3);
            addedItem.onTestEventEmitter.fire(4);
            assert.deepStrictEqual(recordedEvents, [1, 2, 3, 4]);
        });
        test('should not fire events for removed items', () => {
            removeEmitter.fire(items[0]);
            items[0].onTestEventEmitter.fire(1);
            items[1].onTestEventEmitter.fire(2);
            items[0].onTestEventEmitter.fire(3);
            items[1].onTestEventEmitter.fire(4);
            assert.deepStrictEqual(recordedEvents, [2, 4]);
        });
    });
    test('latch', () => {
        const emitter = ds.add(new Emitter());
        const event = Event.latch(emitter.event);
        const result = [];
        const listener = ds.add(event((num) => result.push(num)));
        assert.deepStrictEqual(result, []);
        emitter.fire(1);
        assert.deepStrictEqual(result, [1]);
        emitter.fire(2);
        assert.deepStrictEqual(result, [1, 2]);
        emitter.fire(2);
        assert.deepStrictEqual(result, [1, 2]);
        emitter.fire(1);
        assert.deepStrictEqual(result, [1, 2, 1]);
        emitter.fire(1);
        assert.deepStrictEqual(result, [1, 2, 1]);
        emitter.fire(3);
        assert.deepStrictEqual(result, [1, 2, 1, 3]);
        emitter.fire(3);
        assert.deepStrictEqual(result, [1, 2, 1, 3]);
        emitter.fire(3);
        assert.deepStrictEqual(result, [1, 2, 1, 3]);
        listener.dispose();
    });
    test('dispose is reentrant', () => {
        const emitter = ds.add(new Emitter({
            onDidRemoveLastListener: () => {
                emitter.dispose();
            },
        }));
        const listener = emitter.event(() => undefined);
        listener.dispose(); // should not crash
    });
    suite('fromPromise', () => {
        test('not yet resolved', async function () {
            return new Promise((resolve) => {
                let promise = new DeferredPromise();
                ds.add(Event.fromPromise(promise.p)((e) => {
                    assert.strictEqual(e, 1);
                    promise = new DeferredPromise();
                    ds.add(Event.fromPromise(promise.p)(() => {
                        resolve();
                    }));
                    promise.error(undefined);
                }));
                promise.complete(1);
            });
        });
        test('already resolved', async function () {
            return new Promise((resolve) => {
                let promise = new DeferredPromise();
                promise.complete(1);
                ds.add(Event.fromPromise(promise.p)((e) => {
                    assert.strictEqual(e, 1);
                    promise = new DeferredPromise();
                    promise.error(undefined);
                    ds.add(Event.fromPromise(promise.p)(() => {
                        resolve();
                    }));
                }));
            });
        });
    });
    suite('Relay', () => {
        test('should input work', () => {
            const e1 = ds.add(new Emitter());
            const e2 = ds.add(new Emitter());
            const relay = new Relay();
            const result = [];
            const listener = (num) => result.push(num);
            const subscription = relay.event(listener);
            e1.fire(1);
            assert.deepStrictEqual(result, []);
            relay.input = e1.event;
            e1.fire(2);
            assert.deepStrictEqual(result, [2]);
            relay.input = e2.event;
            e1.fire(3);
            e2.fire(4);
            assert.deepStrictEqual(result, [2, 4]);
            subscription.dispose();
            e1.fire(5);
            e2.fire(6);
            assert.deepStrictEqual(result, [2, 4]);
        });
        test('should Relay dispose work', () => {
            const e1 = ds.add(new Emitter());
            const e2 = ds.add(new Emitter());
            const relay = new Relay();
            const result = [];
            const listener = (num) => result.push(num);
            ds.add(relay.event(listener));
            e1.fire(1);
            assert.deepStrictEqual(result, []);
            relay.input = e1.event;
            e1.fire(2);
            assert.deepStrictEqual(result, [2]);
            relay.input = e2.event;
            e1.fire(3);
            e2.fire(4);
            assert.deepStrictEqual(result, [2, 4]);
            relay.dispose();
            e1.fire(5);
            e2.fire(6);
            assert.deepStrictEqual(result, [2, 4]);
        });
    });
    suite('accumulate', () => {
        test('should not fire after a listener is disposed with undefined or []', async () => {
            const eventEmitter = ds.add(new Emitter());
            const event = eventEmitter.event;
            const accumulated = Event.accumulate(event, 0);
            const calls1 = [];
            const calls2 = [];
            const listener1 = ds.add(accumulated((e) => calls1.push(e)));
            ds.add(accumulated((e) => calls2.push(e)));
            eventEmitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls1, [[1]]);
            assert.deepStrictEqual(calls2, [[1]]);
            listener1.dispose();
            await timeout(1);
            assert.deepStrictEqual(calls1, [[1]]);
            assert.deepStrictEqual(calls2, [[1]], 'should not fire after a listener is disposed with undefined or []');
        });
        test('should accumulate a single event', async () => {
            const eventEmitter = ds.add(new Emitter());
            const event = eventEmitter.event;
            const accumulated = Event.accumulate(event, 0);
            const results1 = await new Promise((r) => {
                ds.add(accumulated(r));
                eventEmitter.fire(1);
            });
            assert.deepStrictEqual(results1, [1]);
            const results2 = await new Promise((r) => {
                ds.add(accumulated(r));
                eventEmitter.fire(2);
            });
            assert.deepStrictEqual(results2, [2]);
        });
        test('should accumulate multiple events', async () => {
            const eventEmitter = ds.add(new Emitter());
            const event = eventEmitter.event;
            const accumulated = Event.accumulate(event, 0);
            const results1 = await new Promise((r) => {
                ds.add(accumulated(r));
                eventEmitter.fire(1);
                eventEmitter.fire(2);
                eventEmitter.fire(3);
            });
            assert.deepStrictEqual(results1, [1, 2, 3]);
            const results2 = await new Promise((r) => {
                ds.add(accumulated(r));
                eventEmitter.fire(4);
                eventEmitter.fire(5);
                eventEmitter.fire(6);
                eventEmitter.fire(7);
                eventEmitter.fire(8);
            });
            assert.deepStrictEqual(results2, [4, 5, 6, 7, 8]);
        });
    });
    suite('debounce', () => {
        test('simple', function (done) {
            const doc = ds.add(new Samples.Document3());
            const onDocDidChange = Event.debounce(doc.onDidChange, (prev, cur) => {
                if (!prev) {
                    prev = [cur];
                }
                else if (prev.indexOf(cur) < 0) {
                    prev.push(cur);
                }
                return prev;
            }, 10);
            let count = 0;
            ds.add(onDocDidChange((keys) => {
                count++;
                assert.ok(keys, 'was not expecting keys.');
                if (count === 1) {
                    doc.setText('4');
                    assert.deepStrictEqual(keys, ['1', '2', '3']);
                }
                else if (count === 2) {
                    assert.deepStrictEqual(keys, ['4']);
                    done();
                }
            }));
            doc.setText('1');
            doc.setText('2');
            doc.setText('3');
        });
        test('microtask', function (done) {
            const doc = ds.add(new Samples.Document3());
            const onDocDidChange = Event.debounce(doc.onDidChange, (prev, cur) => {
                if (!prev) {
                    prev = [cur];
                }
                else if (prev.indexOf(cur) < 0) {
                    prev.push(cur);
                }
                return prev;
            }, MicrotaskDelay);
            let count = 0;
            ds.add(onDocDidChange((keys) => {
                count++;
                assert.ok(keys, 'was not expecting keys.');
                if (count === 1) {
                    doc.setText('4');
                    assert.deepStrictEqual(keys, ['1', '2', '3']);
                }
                else if (count === 2) {
                    assert.deepStrictEqual(keys, ['4']);
                    done();
                }
            }));
            doc.setText('1');
            doc.setText('2');
            doc.setText('3');
        });
        test('leading', async function () {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => e, 0, /*leading=*/ true);
            let calls = 0;
            ds.add(debounced(() => {
                calls++;
            }));
            // If the source event is fired once, the debounced (on the leading edge) event should be fired only once
            emitter.fire();
            await timeout(1);
            assert.strictEqual(calls, 1);
        });
        test('leading (2)', async function () {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => e, 0, /*leading=*/ true);
            let calls = 0;
            ds.add(debounced(() => {
                calls++;
            }));
            // If the source event is fired multiple times, the debounced (on the leading edge) event should be fired twice
            emitter.fire();
            emitter.fire();
            emitter.fire();
            await timeout(1);
            assert.strictEqual(calls, 2);
        });
        test('leading reset', async function () {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => (l ? l + 1 : 1), 0, 
            /*leading=*/ true);
            const calls = [];
            ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            emitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls, [1, 1]);
        });
        test('should not flush events when a listener is disposed', async () => {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => (l ? l + 1 : 1), 0);
            const calls = [];
            const listener = ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            listener.dispose();
            emitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls, []);
        });
        test('flushOnListenerRemove - should flush events when a listener is disposed', async () => {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => (l ? l + 1 : 1), 0, undefined, true);
            const calls = [];
            const listener = ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            listener.dispose();
            emitter.fire(1);
            await timeout(1);
            assert.deepStrictEqual(calls, [1], 'should fire with the first event, not the second (after listener dispose)');
        });
        test('should flush events when the emitter is disposed', async () => {
            const emitter = ds.add(new Emitter());
            const debounced = Event.debounce(emitter.event, (l, e) => (l ? l + 1 : 1), 0);
            const calls = [];
            ds.add(debounced((e) => calls.push(e)));
            emitter.fire(1);
            emitter.dispose();
            await timeout(1);
            assert.deepStrictEqual(calls, [1]);
        });
    });
    test('issue #230401', () => {
        let count = 0;
        const emitter = ds.add(new Emitter());
        const disposables = ds.add(new DisposableStore());
        ds.add(emitter.event(() => {
            count++;
            disposables.add(emitter.event(() => {
                count++;
            }));
            disposables.add(emitter.event(() => {
                count++;
            }));
            disposables.clear();
        }));
        ds.add(emitter.event(() => {
            count++;
        }));
        emitter.fire();
        assert.deepStrictEqual(count, 2);
    });
    suite('chain2', () => {
        let em;
        let calls;
        setup(() => {
            em = ds.add(new Emitter());
            calls = [];
        });
        test('maps', () => {
            const ev = Event.chain(em.event, ($) => $.map((v) => v * 2));
            ds.add(ev((v) => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            assert.deepStrictEqual(calls, [2, 4, 6]);
        });
        test('filters', () => {
            const ev = Event.chain(em.event, ($) => $.filter((v) => v % 2 === 0));
            ds.add(ev((v) => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            em.fire(4);
            assert.deepStrictEqual(calls, [2, 4]);
        });
        test('reduces', () => {
            const ev = Event.chain(em.event, ($) => $.reduce((acc, v) => acc + v, 0));
            ds.add(ev((v) => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            em.fire(4);
            assert.deepStrictEqual(calls, [1, 3, 6, 10]);
        });
        test('latches', () => {
            const ev = Event.chain(em.event, ($) => $.latch());
            ds.add(ev((v) => calls.push(v)));
            em.fire(1);
            em.fire(1);
            em.fire(2);
            em.fire(2);
            em.fire(3);
            em.fire(3);
            em.fire(1);
            assert.deepStrictEqual(calls, [1, 2, 3, 1]);
        });
        test('does everything', () => {
            const ev = Event.chain(em.event, ($) => $.filter((v) => v % 2 === 0)
                .map((v) => v * 2)
                .reduce((acc, v) => acc + v, 0)
                .latch());
            ds.add(ev((v) => calls.push(v)));
            em.fire(1);
            em.fire(2);
            em.fire(3);
            em.fire(4);
            em.fire(0);
            assert.deepStrictEqual(calls, [4, 12]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZXZlbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE9BQU8sQ0FBQTtBQUM1QixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxZQUFZLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNoRixPQUFPLEVBQ04sWUFBWSxFQUNaLGVBQWUsRUFDZiwyQkFBMkIsRUFDM0IsT0FBTyxFQUNQLEtBQUssRUFDTCxhQUFhLEVBQ2IsZ0JBQWdCLEVBRWhCLGlCQUFpQixFQUNqQixvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixLQUFLLEVBQ0wsd0JBQXdCLEdBQ3hCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUNOLGVBQWUsRUFFZixZQUFZLEVBQ1osb0JBQW9CLEVBQ3BCLGlCQUFpQixHQUNqQixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNwRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFF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QUMsQ0FBQTtRQUVsQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5DLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV6QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFD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QyxDQUFBO1FBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtZQUN0QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtZQUN4QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtZQUN4QyxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBVSxDQUFBO1lBRWpDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQTtZQUMzQixNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsRCxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtZQUU3QixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFbEMsS0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFBO1lBQ3RCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbkMsS0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFBO1lBQ3RCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV0QyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDZixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFB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RSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVELEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3JFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6RSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDbEQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1lBQzVCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ3RDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUMxQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUM5QixLQUFLLEVBQUUsQ0FDVCxDQUFBO1lBRUQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==