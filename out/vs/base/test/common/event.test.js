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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9ldmVudC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBQzVCLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hGLE9BQU8sRUFDTixZQUFZLEVBQ1osZUFBZSxFQUNmLDJCQUEyQixFQUMzQixPQUFPLEVBQ1AsS0FBSyxFQUNMLGFBQWEsRUFDYixnQkFBZ0IsRUFFaEIsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLEtBQUssRUFDTCx3QkFBd0IsR0FDeEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQ04sZUFBZSxFQUVmLFlBQVksRUFDWixvQkFBb0IsRUFDcEIsaUJBQWlCLEdBQ2pCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx3QkFBd0IsQ0FB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QUUsQ0FBQyxDQUFBO1FBRWxDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV6QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFNUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxlQUFl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LE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0QyxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQTtZQUNsRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFBO1lBQ2hDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTlDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDbEQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQixDQUFDLENBQUMsQ0FBQTtZQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTNDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQVcsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDbEQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDdEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEIsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEIsWUFBWSxDQUFDLElB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RSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDcEIsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDcEIsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pFLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDcEIsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUNsRCxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7WUFDNUIsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDdEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQzFCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDakIsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQzlCLEtBQUssRUFBRSxDQUNULENBQUE7WUFFRCxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDVixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9