/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { setUnexpectedErrorHandler } from '../../common/errors.js';
import { Emitter, Event } from '../../common/event.js';
import { DisposableStore } from '../../common/lifecycle.js';
import { autorun, autorunHandleChanges, derived, derivedDisposable, keepObserved, observableFromEvent, observableSignal, observableValue, transaction, waitForState, } from '../../common/observable.js';
import { BaseObservable } from '../../common/observableInternal/base.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('observables', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Reads these tests to understand how to use observables.
     */
    suite('tutorial', () => {
        test('observable + autorun', () => {
            const log = new Log();
            // This creates a variable that stores a value and whose value changes can be observed.
            // The name is only used for debugging purposes.
            // The second arg is the initial value.
            const myObservable = observableValue('myObservable', 0);
            // This creates an autorun: It runs immediately and then again whenever any of the
            // dependencies change. Dependencies are tracked by reading observables with the `reader` parameter.
            //
            // The @description is only used for debugging purposes.
            // The autorun has to be disposed! This is very important.
            ds.add(autorun((reader) => {
                /** @description myAutorun */
                // This code is run immediately.
                // Use the `reader` to read observable values and track the dependency to them.
                // If you use `observable.get()` instead of `observable.read(reader)`, you will just
                // get the value and not subscribe to it.
                log.log(`myAutorun.run(myObservable: ${myObservable.read(reader)})`);
                // Now that all dependencies are tracked, the autorun is re-run whenever any of the
                // dependencies change.
            }));
            // The autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
            // We set the observable.
            myObservable.set(1, undefined);
            // -> The autorun runs again when any read observable changed
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 1)']);
            // We set the observable again.
            myObservable.set(1, undefined);
            // -> The autorun does not run again, because the observable didn't change.
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            // Transactions batch autorun runs
            transaction((tx) => {
                myObservable.set(2, tx);
                // No auto-run ran yet, even though the value changed!
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(3, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // Only at the end of the transaction the autorun re-runs
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 3)']);
            // Note that the autorun did not see the intermediate value `2`!
        });
        test('derived + autorun', () => {
            const log = new Log();
            const observable1 = observableValue('myObservable1', 0);
            const observable2 = observableValue('myObservable2', 0);
            // A derived value is an observable that is derived from other observables.
            const myDerived = derived((reader) => {
                /** @description myDerived */
                const value1 = observable1.read(reader); // Use the reader to track dependencies.
                const value2 = observable2.read(reader);
                const sum = value1 + value2;
                log.log(`myDerived.recompute: ${value1} + ${value2} = ${sum}`);
                return sum;
            });
            // We create an autorun that reacts on changes to our derived value.
            ds.add(autorun((reader) => {
                /** @description myAutorun */
                // Autoruns work with observable values and deriveds - in short, they work with any observable.
                log.log(`myAutorun(myDerived: ${myDerived.read(reader)})`);
            }));
            // autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.recompute: 0 + 0 = 0',
                'myAutorun(myDerived: 0)',
            ]);
            observable1.set(1, undefined);
            // and on changes...
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.recompute: 1 + 0 = 1',
                'myAutorun(myDerived: 1)',
            ]);
            observable2.set(1, undefined);
            // ... of any dependency.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.recompute: 1 + 1 = 2',
                'myAutorun(myDerived: 2)',
            ]);
            // Now we change multiple observables in a transaction to batch process the effects.
            transaction((tx) => {
                observable1.set(5, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                observable2.set(5, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // When changing multiple observables in a transaction,
            // deriveds are only recomputed on demand.
            // (Note that you cannot see the intermediate value when `obs1 == 5` and `obs2 == 1`)
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.recompute: 5 + 5 = 10',
                'myAutorun(myDerived: 10)',
            ]);
            transaction((tx) => {
                observable1.set(6, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                observable2.set(4, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // Now the autorun didn't run again, because its dependency changed from 10 to 10 (= no change).
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived.recompute: 6 + 4 = 10']);
        });
        test('read during transaction', () => {
            const log = new Log();
            const observable1 = observableValue('myObservable1', 0);
            const observable2 = observableValue('myObservable2', 0);
            const myDerived = derived((reader) => {
                /** @description myDerived */
                const value1 = observable1.read(reader);
                const value2 = observable2.read(reader);
                const sum = value1 + value2;
                log.log(`myDerived.recompute: ${value1} + ${value2} = ${sum}`);
                return sum;
            });
            ds.add(autorun((reader) => {
                /** @description myAutorun */
                log.log(`myAutorun(myDerived: ${myDerived.read(reader)})`);
            }));
            // autorun runs immediately
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.recompute: 0 + 0 = 0',
                'myAutorun(myDerived: 0)',
            ]);
            transaction((tx) => {
                observable1.set(-10, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myDerived.get(); // This forces a (sync) recomputation of the current value!
                assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived.recompute: -10 + 0 = -10']);
                // This means, that even in transactions you can assume that all values you can read with `get` and `read` are up-to-date.
                // Read these values just might cause additional (potentially unneeded) recomputations.
                observable2.set(10, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            // This autorun runs again, because its dependency changed from 0 to -10 and then back to 0.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.recompute: -10 + 10 = 0',
                'myAutorun(myDerived: 0)',
            ]);
        });
        test('get without observers', () => {
            const log = new Log();
            const observable1 = observableValue('myObservableValue1', 0);
            // We set up some computeds.
            const computed1 = derived((reader) => {
                /** @description computed */
                const value1 = observable1.read(reader);
                const result = value1 % 3;
                log.log(`recompute1: ${value1} % 3 = ${result}`);
                return result;
            });
            const computed2 = derived((reader) => {
                /** @description computed */
                const value1 = computed1.read(reader);
                const result = value1 * 2;
                log.log(`recompute2: ${value1} * 2 = ${result}`);
                return result;
            });
            const computed3 = derived((reader) => {
                /** @description computed */
                const value1 = computed1.read(reader);
                const result = value1 * 3;
                log.log(`recompute3: ${value1} * 3 = ${result}`);
                return result;
            });
            const computedSum = derived((reader) => {
                /** @description computed */
                const value1 = computed2.read(reader);
                const value2 = computed3.read(reader);
                const result = value1 + value2;
                log.log(`recompute4: ${value1} + ${value2} = ${result}`);
                return result;
            });
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            observable1.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            // And now read the computed that dependens on all the others.
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            log.log(`value: ${computedSum.get()}`);
            // Because there are no observers, the derived values are not cached (!), but computed from scratch.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            const disposable = keepObserved(computedSum); // Use keepObserved to keep the cache.
            // You can also use `computedSum.keepObserved(store)` for an inline experience.
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 1 % 3 = 1',
                'recompute2: 1 * 2 = 2',
                'recompute3: 1 * 3 = 3',
                'recompute4: 2 + 3 = 5',
                'value: 5',
            ]);
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), ['value: 5']);
            // Tada, no recomputations!
            observable1.set(2, undefined);
            // The keepObserved does not force deriveds to be recomputed! They are still lazy.
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            log.log(`value: ${computedSum.get()}`);
            // Those deriveds are recomputed on demand, i.e. when someone reads them.
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 2 % 3 = 2',
                'recompute2: 2 * 2 = 4',
                'recompute3: 2 * 3 = 6',
                'recompute4: 4 + 6 = 10',
                'value: 10',
            ]);
            log.log(`value: ${computedSum.get()}`);
            // ... and then cached again
            assert.deepStrictEqual(log.getAndClearEntries(), ['value: 10']);
            disposable.dispose(); // Don't forget to dispose the keepAlive to prevent memory leaks!
            log.log(`value: ${computedSum.get()}`);
            // Which disables the cache again
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 2 % 3 = 2',
                'recompute2: 2 * 2 = 4',
                'recompute3: 2 * 3 = 6',
                'recompute4: 4 + 6 = 10',
                'value: 10',
            ]);
            log.log(`value: ${computedSum.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'recompute1: 2 % 3 = 2',
                'recompute2: 2 * 2 = 4',
                'recompute3: 2 * 3 = 6',
                'recompute4: 4 + 6 = 10',
                'value: 10',
            ]);
            // Why don't we just always keep the cache alive?
            // This is because in order to keep the cache alive, we have to keep our subscriptions to our dependencies alive,
            // which could cause memory-leaks.
            // So instead, when the last observer of a derived is disposed, we dispose our subscriptions to our dependencies.
            // `keepObserved` just prevents this from happening.
        });
        test('autorun that receives deltas of signals', () => {
            const log = new Log();
            // A signal is an observable without a value.
            // However, it can ship change information when it is triggered.
            // Readers can process/aggregate this change information.
            const signal = observableSignal('signal');
            const disposable = autorunHandleChanges({
                // The change summary is used to collect the changes
                createEmptyChangeSummary: () => ({ msgs: [] }),
                handleChange(context, changeSummary) {
                    if (context.didChange(signal)) {
                        // We just push the changes into an array
                        changeSummary.msgs.push(context.change.msg);
                    }
                    return true; // We want to handle the change
                },
            }, (reader, changeSummary) => {
                // When handling the change, make sure to read the signal!
                signal.read(reader);
                log.log('msgs: ' + changeSummary.msgs.join(', '));
            });
            signal.trigger(undefined, { msg: 'foobar' });
            transaction((tx) => {
                // You can batch triggering signals.
                // No delta information is lost!
                signal.trigger(tx, { msg: 'hello' });
                signal.trigger(tx, { msg: 'world' });
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'msgs: ',
                'msgs: foobar',
                'msgs: hello, world',
            ]);
            disposable.dispose();
        });
        // That is the end of the tutorial.
        // There are lots of utilities you can explore now, like `observableFromEvent`, `Event.fromObservableLight`,
        // autorunWithStore, observableWithStore and so on.
    });
    test('topological order', () => {
        const log = new Log();
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const myComputed1 = derived((reader) => {
            /** @description myComputed1 */
            const value1 = myObservable1.read(reader);
            const value2 = myObservable2.read(reader);
            const sum = value1 + value2;
            log.log(`myComputed1.recompute(myObservable1: ${value1} + myObservable2: ${value2} = ${sum})`);
            return sum;
        });
        const myComputed2 = derived((reader) => {
            /** @description myComputed2 */
            const value1 = myComputed1.read(reader);
            const value2 = myObservable1.read(reader);
            const value3 = myObservable2.read(reader);
            const sum = value1 + value2 + value3;
            log.log(`myComputed2.recompute(myComputed1: ${value1} + myObservable1: ${value2} + myObservable2: ${value3} = ${sum})`);
            return sum;
        });
        const myComputed3 = derived((reader) => {
            /** @description myComputed3 */
            const value1 = myComputed2.read(reader);
            const value2 = myObservable1.read(reader);
            const value3 = myObservable2.read(reader);
            const sum = value1 + value2 + value3;
            log.log(`myComputed3.recompute(myComputed2: ${value1} + myObservable1: ${value2} + myObservable2: ${value3} = ${sum})`);
            return sum;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            log.log(`myAutorun.run(myComputed3: ${myComputed3.read(reader)})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myComputed1.recompute(myObservable1: 0 + myObservable2: 0 = 0)',
            'myComputed2.recompute(myComputed1: 0 + myObservable1: 0 + myObservable2: 0 = 0)',
            'myComputed3.recompute(myComputed2: 0 + myObservable1: 0 + myObservable2: 0 = 0)',
            'myAutorun.run(myComputed3: 0)',
        ]);
        myObservable1.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myComputed1.recompute(myObservable1: 1 + myObservable2: 0 = 1)',
            'myComputed2.recompute(myComputed1: 1 + myObservable1: 1 + myObservable2: 0 = 2)',
            'myComputed3.recompute(myComputed2: 2 + myObservable1: 1 + myObservable2: 0 = 3)',
            'myAutorun.run(myComputed3: 3)',
        ]);
        transaction((tx) => {
            myObservable1.set(2, tx);
            myComputed2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myComputed1.recompute(myObservable1: 2 + myObservable2: 0 = 2)',
                'myComputed2.recompute(myComputed1: 2 + myObservable1: 2 + myObservable2: 0 = 4)',
            ]);
            myObservable1.set(3, tx);
            myComputed2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myComputed1.recompute(myObservable1: 3 + myObservable2: 0 = 3)',
                'myComputed2.recompute(myComputed1: 3 + myObservable1: 3 + myObservable2: 0 = 6)',
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myComputed3.recompute(myComputed2: 6 + myObservable1: 3 + myObservable2: 0 = 9)',
            'myAutorun.run(myComputed3: 9)',
        ]);
    });
    suite('from event', () => {
        function init() {
            const log = new Log();
            let value = 0;
            const eventEmitter = new Emitter();
            let id = 0;
            const observable = observableFromEvent((handler) => {
                const curId = id++;
                log.log(`subscribed handler ${curId}`);
                const disposable = eventEmitter.event(handler);
                return {
                    dispose: () => {
                        log.log(`unsubscribed handler ${curId}`);
                        disposable.dispose();
                    },
                };
            }, () => {
                log.log(`compute value ${value}`);
                return value;
            });
            return {
                log,
                setValue: (newValue) => {
                    value = newValue;
                    eventEmitter.fire();
                },
                observable,
            };
        }
        test('Handle undefined', () => {
            const { log, setValue, observable } = init();
            setValue(undefined);
            const autorunDisposable = autorun((reader) => {
                /** @description MyAutorun */
                observable.read(reader);
                log.log(`autorun, value: ${observable.read(reader)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 0',
                'compute value undefined',
                'autorun, value: undefined',
            ]);
            setValue(1);
            assert.deepStrictEqual(log.getAndClearEntries(), ['compute value 1', 'autorun, value: 1']);
            autorunDisposable.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ['unsubscribed handler 0']);
        });
        test('basic', () => {
            const { log, setValue, observable } = init();
            const shouldReadObservable = observableValue('shouldReadObservable', true);
            const autorunDisposable = autorun((reader) => {
                /** @description MyAutorun */
                if (shouldReadObservable.read(reader)) {
                    observable.read(reader);
                    log.log(`autorun, should read: true, value: ${observable.read(reader)}`);
                }
                else {
                    log.log(`autorun, should read: false`);
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 0',
                'compute value 0',
                'autorun, should read: true, value: 0',
            ]);
            // Cached get
            log.log(`get value: ${observable.get()}`);
            assert.deepStrictEqual(log.getAndClearEntries(), ['get value: 0']);
            setValue(1);
            // Trigger autorun, no unsub/sub
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'compute value 1',
                'autorun, should read: true, value: 1',
            ]);
            // Unsubscribe when not read
            shouldReadObservable.set(false, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'autorun, should read: false',
                'unsubscribed handler 0',
            ]);
            shouldReadObservable.set(true, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'subscribed handler 1',
                'compute value 1',
                'autorun, should read: true, value: 1',
            ]);
            autorunDisposable.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ['unsubscribed handler 1']);
        });
        test('get without observers', () => {
            const { log, observable } = init();
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            log.log(`get value: ${observable.get()}`);
            // Not cached or subscribed
            assert.deepStrictEqual(log.getAndClearEntries(), ['compute value 0', 'get value: 0']);
            log.log(`get value: ${observable.get()}`);
            // Still not cached or subscribed
            assert.deepStrictEqual(log.getAndClearEntries(), ['compute value 0', 'get value: 0']);
        });
    });
    test('reading derived in transaction unsubscribes unnecessary observables', () => {
        const log = new Log();
        const shouldReadObservable = observableValue('shouldReadMyObs1', true);
        const myObs1 = new LoggingObservableValue('myObs1', 0, log);
        const myComputed = derived((reader) => {
            /** @description myComputed */
            log.log('myComputed.recompute');
            if (shouldReadObservable.read(reader)) {
                return myObs1.read(reader);
            }
            return 1;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const value = myComputed.read(reader);
            log.log(`myAutorun: ${value}`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myComputed.recompute',
            'myObs1.firstObserverAdded',
            'myObs1.get',
            'myAutorun: 0',
        ]);
        transaction((tx) => {
            myObs1.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObs1.set (value 1)']);
            shouldReadObservable.set(false, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            myComputed.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myComputed.recompute',
                'myObs1.lastObserverRemoved',
            ]);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun: 1']);
    });
    test('avoid recomputation of deriveds that are no longer read', () => {
        const log = new Log();
        const myObsShouldRead = new LoggingObservableValue('myObsShouldRead', true, log);
        const myObs1 = new LoggingObservableValue('myObs1', 0, log);
        const myComputed1 = derived((reader) => {
            /** @description myComputed1 */
            const myObs1Val = myObs1.read(reader);
            const result = myObs1Val % 10;
            log.log(`myComputed1(myObs1: ${myObs1Val}): Computed ${result}`);
            return myObs1Val;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const shouldRead = myObsShouldRead.read(reader);
            if (shouldRead) {
                const v = myComputed1.read(reader);
                log.log(`myAutorun(shouldRead: true, myComputed1: ${v}): run`);
            }
            else {
                log.log(`myAutorun(shouldRead: false): run`);
            }
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObsShouldRead.firstObserverAdded',
            'myObsShouldRead.get',
            'myObs1.firstObserverAdded',
            'myObs1.get',
            'myComputed1(myObs1: 0): Computed 0',
            'myAutorun(shouldRead: true, myComputed1: 0): run',
        ]);
        transaction((tx) => {
            myObsShouldRead.set(false, tx);
            myObs1.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObsShouldRead.set (value false)',
                'myObs1.set (value 1)',
            ]);
        });
        // myComputed1 should not be recomputed here, even though its dependency myObs1 changed!
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObsShouldRead.get',
            'myAutorun(shouldRead: false): run',
            'myObs1.lastObserverRemoved',
        ]);
        transaction((tx) => {
            myObsShouldRead.set(true, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObsShouldRead.set (value true)']);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObsShouldRead.get',
            'myObs1.firstObserverAdded',
            'myObs1.get',
            'myComputed1(myObs1: 1): Computed 1',
            'myAutorun(shouldRead: true, myComputed1: 1): run',
        ]);
    });
    suite('autorun rerun on neutral change', () => {
        test('autorun reruns on neutral observable double change', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            ds.add(autorun((reader) => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myObservable: ${myObservable.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ['myAutorun.run(myObservable: 0)']);
        });
        test('autorun does not rerun on indirect neutral observable double change', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            const myDerived = derived((reader) => {
                /** @description myDerived */
                const val = myObservable.read(reader);
                log.log(`myDerived.read(myObservable: ${val})`);
                return val;
            });
            ds.add(autorun((reader) => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myDerived: ${myDerived.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.read(myObservable: 0)',
                'myAutorun.run(myDerived: 0)',
            ]);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived.read(myObservable: 0)']);
        });
        test('autorun reruns on indirect neutral observable double change when changes propagate', () => {
            const log = new Log();
            const myObservable = observableValue('myObservable', 0);
            const myDerived = derived((reader) => {
                /** @description myDerived */
                const val = myObservable.read(reader);
                log.log(`myDerived.read(myObservable: ${val})`);
                return val;
            });
            ds.add(autorun((reader) => {
                /** @description myAutorun */
                log.log(`myAutorun.run(myDerived: ${myDerived.read(reader)})`);
            }));
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.read(myObservable: 0)',
                'myAutorun.run(myDerived: 0)',
            ]);
            transaction((tx) => {
                myObservable.set(2, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
                myDerived.get(); // This marks the auto-run as changed
                assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived.read(myObservable: 2)']);
                myObservable.set(0, tx);
                assert.deepStrictEqual(log.getAndClearEntries(), []);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myDerived.read(myObservable: 0)',
                'myAutorun.run(myDerived: 0)',
            ]);
        });
    });
    test('self-disposing autorun', () => {
        const log = new Log();
        const observable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myObservable3 = new LoggingObservableValue('myObservable3', 0, log);
        const d = autorun((reader) => {
            /** @description autorun */
            if (observable1.read(reader) >= 2) {
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    'myObservable1.set (value 2)',
                    'myObservable1.get',
                ]);
                myObservable2.read(reader);
                // First time this observable is read
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    'myObservable2.firstObserverAdded',
                    'myObservable2.get',
                ]);
                d.dispose();
                // Disposing removes all observers
                assert.deepStrictEqual(log.getAndClearEntries(), [
                    'myObservable1.lastObserverRemoved',
                    'myObservable2.lastObserverRemoved',
                ]);
                myObservable3.read(reader);
                // This does not subscribe the observable, because the autorun is disposed
                assert.deepStrictEqual(log.getAndClearEntries(), ['myObservable3.get']);
            }
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.firstObserverAdded',
            'myObservable1.get',
        ]);
        observable1.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.set (value 1)',
            'myObservable1.get',
        ]);
        observable1.set(2, undefined);
        // See asserts in the autorun
        assert.deepStrictEqual(log.getAndClearEntries(), []);
    });
    test('changing observables in endUpdate', () => {
        const log = new Log();
        const myObservable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myDerived1 = derived((reader) => {
            /** @description myDerived1 */
            const val = myObservable1.read(reader);
            log.log(`myDerived1.read(myObservable: ${val})`);
            return val;
        });
        const myDerived2 = derived((reader) => {
            /** @description myDerived2 */
            const val = myObservable2.read(reader);
            if (val === 1) {
                myDerived1.read(reader);
            }
            log.log(`myDerived2.read(myObservable: ${val})`);
            return val;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const myDerived1Val = myDerived1.read(reader);
            const myDerived2Val = myDerived2.read(reader);
            log.log(`myAutorun.run(myDerived1: ${myDerived1Val}, myDerived2: ${myDerived2Val})`);
        }));
        transaction((tx) => {
            myObservable2.set(1, tx);
            // end update of this observable will trigger endUpdate of myDerived1 and
            // the autorun and the autorun will add myDerived2 as observer to myDerived1
            myObservable1.set(1, tx);
        });
    });
    test('set dependency in derived', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myComputed = derived((reader) => {
            /** @description myComputed */
            let value = myObservable.read(reader);
            const origValue = value;
            log.log(`myComputed(myObservable: ${origValue}): start computing`);
            if (value % 3 !== 0) {
                value++;
                myObservable.set(value, undefined);
            }
            log.log(`myComputed(myObservable: ${origValue}): finished computing`);
            return value;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const value = myComputed.read(reader);
            log.log(`myAutorun(myComputed: ${value})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myComputed(myObservable: 0): start computing',
            'myComputed(myObservable: 0): finished computing',
            'myAutorun(myComputed: 0)',
        ]);
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.set (value 1)',
            'myObservable.get',
            'myComputed(myObservable: 1): start computing',
            'myObservable.set (value 2)',
            'myComputed(myObservable: 1): finished computing',
            'myObservable.get',
            'myComputed(myObservable: 2): start computing',
            'myObservable.set (value 3)',
            'myComputed(myObservable: 2): finished computing',
            'myObservable.get',
            'myComputed(myObservable: 3): start computing',
            'myComputed(myObservable: 3): finished computing',
            'myAutorun(myComputed: 3)',
        ]);
    });
    test('set dependency in autorun', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const value = myObservable.read(reader);
            log.log(`myAutorun(myObservable: ${value}): start`);
            if (value !== 0 && value < 4) {
                myObservable.set(value + 1, undefined);
            }
            log.log(`myAutorun(myObservable: ${value}): end`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myAutorun(myObservable: 0): start',
            'myAutorun(myObservable: 0): end',
        ]);
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.set (value 1)',
            'myObservable.get',
            'myAutorun(myObservable: 1): start',
            'myObservable.set (value 2)',
            'myAutorun(myObservable: 1): end',
            'myObservable.get',
            'myAutorun(myObservable: 2): start',
            'myObservable.set (value 3)',
            'myAutorun(myObservable: 2): end',
            'myObservable.get',
            'myAutorun(myObservable: 3): start',
            'myObservable.set (value 4)',
            'myAutorun(myObservable: 3): end',
            'myObservable.get',
            'myAutorun(myObservable: 4): start',
            'myAutorun(myObservable: 4): end',
        ]);
    });
    test('get in transaction between sets', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myDerived1 = derived((reader) => {
            /** @description myDerived1 */
            const value = myObservable.read(reader);
            log.log(`myDerived1(myObservable: ${value}): start computing`);
            return value;
        });
        const myDerived2 = derived((reader) => {
            /** @description myDerived2 */
            const value = myDerived1.read(reader);
            log.log(`myDerived2(myDerived1: ${value}): start computing`);
            return value;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const value = myDerived2.read(reader);
            log.log(`myAutorun(myDerived2: ${value})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myDerived1(myObservable: 0): start computing',
            'myDerived2(myDerived1: 0): start computing',
            'myAutorun(myDerived2: 0)',
        ]);
        transaction((tx) => {
            myObservable.set(1, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObservable.set (value 1)']);
            myDerived2.get();
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.get',
                'myDerived1(myObservable: 1): start computing',
                'myDerived2(myDerived1: 1): start computing',
            ]);
            myObservable.set(2, tx);
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObservable.set (value 2)']);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.get',
            'myDerived1(myObservable: 2): start computing',
            'myDerived2(myDerived1: 2): start computing',
            'myAutorun(myDerived2: 2)',
        ]);
    });
    test('bug: Dont reset states', () => {
        const log = new Log();
        const myObservable1 = new LoggingObservableValue('myObservable1', 0, log);
        const myObservable2 = new LoggingObservableValue('myObservable2', 0, log);
        const myDerived2 = derived((reader) => {
            /** @description myDerived2 */
            const val = myObservable2.read(reader);
            log.log(`myDerived2.computed(myObservable2: ${val})`);
            return val % 10;
        });
        const myDerived3 = derived((reader) => {
            /** @description myDerived3 */
            const val1 = myObservable1.read(reader);
            const val2 = myDerived2.read(reader);
            log.log(`myDerived3.computed(myDerived1: ${val1}, myDerived2: ${val2})`);
            return `${val1} + ${val2}`;
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun */
            const val = myDerived3.read(reader);
            log.log(`myAutorun(myDerived3: ${val})`);
        }));
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.firstObserverAdded',
            'myObservable1.get',
            'myObservable2.firstObserverAdded',
            'myObservable2.get',
            'myDerived2.computed(myObservable2: 0)',
            'myDerived3.computed(myDerived1: 0, myDerived2: 0)',
            'myAutorun(myDerived3: 0 + 0)',
        ]);
        transaction((tx) => {
            myObservable1.set(1, tx); // Mark myDerived 3 as stale
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObservable1.set (value 1)']);
            myObservable2.set(10, tx); // This is a non-change. myDerived3 should not be marked as possibly-depedency-changed!
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObservable2.set (value 10)']);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable1.get',
            'myObservable2.get',
            'myDerived2.computed(myObservable2: 10)',
            'myDerived3.computed(myDerived1: 1, myDerived2: 0)',
            'myAutorun(myDerived3: 1 + 0)',
        ]);
    });
    test('bug: Add observable in endUpdate', () => {
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const myDerived1 = derived((reader) => {
            /** @description myDerived1 */
            return myObservable1.read(reader);
        });
        const myDerived2 = derived((reader) => {
            /** @description myDerived2 */
            return myObservable2.read(reader);
        });
        const myDerivedA1 = derived((reader) => /** @description myDerivedA1 */ {
            const d1 = myDerived1.read(reader);
            if (d1 === 1) {
                // This adds an observer while myDerived is still in update mode.
                // When myDerived exits update mode, the observer shouldn't receive
                // more endUpdate than beginUpdate calls.
                myDerived2.read(reader);
            }
        });
        ds.add(autorun((reader) => {
            /** @description myAutorun1 */
            myDerivedA1.read(reader);
        }));
        ds.add(autorun((reader) => {
            /** @description myAutorun2 */
            myDerived2.read(reader);
        }));
        transaction((tx) => {
            myObservable1.set(1, tx);
            myObservable2.set(1, tx);
        });
    });
    test('bug: fromObservableLight doesnt subscribe', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const myDerived = derived((reader) => /** @description myDerived */ {
            const val = myObservable.read(reader);
            log.log(`myDerived.computed(myObservable2: ${val})`);
            return val % 10;
        });
        const e = Event.fromObservableLight(myDerived);
        log.log('event created');
        e(() => {
            log.log('event fired');
        });
        myObservable.set(1, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'event created',
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myDerived.computed(myObservable2: 0)',
            'myObservable.set (value 1)',
            'myObservable.get',
            'myDerived.computed(myObservable2: 1)',
            'event fired',
        ]);
    });
    test('bug: Event.fromObservable always should get events', () => {
        const emitter = new Emitter();
        const log = new Log();
        let i = 0;
        const obs = observableFromEvent(emitter.event, () => i);
        i++;
        emitter.fire(1);
        const evt2 = Event.fromObservable(obs);
        const d = evt2((e) => {
            log.log(`event fired ${e}`);
        });
        i++;
        emitter.fire(2);
        assert.deepStrictEqual(log.getAndClearEntries(), ['event fired 2']);
        i++;
        emitter.fire(3);
        assert.deepStrictEqual(log.getAndClearEntries(), ['event fired 3']);
        d.dispose();
    });
    test('dont run autorun after dispose', () => {
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        const d = autorun((reader) => {
            /** @description update */
            const v = myObservable.read(reader);
            log.log('autorun, myObservable:' + v);
        });
        transaction((tx) => {
            myObservable.set(1, tx);
            d.dispose();
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'autorun, myObservable:0',
            'myObservable.set (value 1)',
            'myObservable.lastObserverRemoved',
        ]);
    });
    suite('waitForState', () => {
        test('resolve', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'initializing' }, log);
            const p = waitForState(myObservable, (p) => p.state === 'ready', (p) => p.state === 'error').then((r) => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set({ state: 'ready' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), ['resolved {\"state\":\"ready\"}']);
        });
        test('resolveImmediate', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'ready' }, log);
            const p = waitForState(myObservable, (p) => p.state === 'ready', (p) => p.state === 'error').then((r) => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            myObservable.set({ state: 'error' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), ['myObservable.set (value [object Object])']);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), ['resolved {\"state\":\"ready\"}']);
        });
        test('reject', async () => {
            const log = new Log();
            const myObservable = new LoggingObservableValue('myObservable', { state: 'initializing' }, log);
            const p = waitForState(myObservable, (p) => p.state === 'ready', (p) => p.state === 'error').then((r) => {
                log.log(`resolved ${JSON.stringify(r)}`);
            }, (err) => {
                log.log(`rejected ${JSON.stringify(err)}`);
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set({ state: 'error' }, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value [object Object])',
                'myObservable.get',
                'myObservable.lastObserverRemoved',
            ]);
            await p;
            assert.deepStrictEqual(log.getAndClearEntries(), ['rejected {\"state\":\"error\"}']);
        });
        test('derived as lazy', () => {
            const store = new DisposableStore();
            const log = new Log();
            let i = 0;
            const d = derivedDisposable(() => {
                const id = i++;
                log.log('myDerived ' + id);
                return {
                    dispose: () => log.log(`disposed ${id}`),
                };
            });
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 0', 'disposed 0']);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 1', 'disposed 1']);
            d.keepObserved(store);
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), ['myDerived 2']);
            d.get();
            assert.deepStrictEqual(log.getAndClearEntries(), []);
            store.dispose();
            assert.deepStrictEqual(log.getAndClearEntries(), ['disposed 2']);
        });
    });
    test('observableValue', () => {
        const log = new Log();
        const myObservable1 = observableValue('myObservable1', 0);
        const myObservable2 = observableValue('myObservable2', 0);
        const d = autorun((reader) => {
            /** @description update */
            const v1 = myObservable1.read(reader);
            const v2 = myObservable2.read(reader);
            log.log('autorun, myObservable1:' + v1 + ', myObservable2:' + v2);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), ['autorun, myObservable1:0, myObservable2:0']);
        // Doesn't trigger the autorun, because no delta was provided and the value did not change
        myObservable1.set(0, undefined);
        assert.deepStrictEqual(log.getAndClearEntries(), []);
        // Triggers the autorun. The value did not change, but a delta value was provided
        myObservable2.set(0, undefined, { message: 'change1' });
        assert.deepStrictEqual(log.getAndClearEntries(), ['autorun, myObservable1:0, myObservable2:0']);
        d.dispose();
    });
    suite('autorun error handling', () => {
        test('immediate throw', () => {
            const log = new Log();
            setUnexpectedErrorHandler((e) => {
                log.log(`error: ${e.message}`);
            });
            const myObservable = new LoggingObservableValue('myObservable', 0, log);
            const d = autorun((reader) => {
                myObservable.read(reader);
                throw new Error('foobar');
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
                'error: foobar',
            ]);
            myObservable.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value 1)',
                'myObservable.get',
                'error: foobar',
            ]);
            d.dispose();
        });
        test('late throw', () => {
            const log = new Log();
            setUnexpectedErrorHandler((e) => {
                log.log(`error: ${e.message}`);
            });
            const myObservable = new LoggingObservableValue('myObservable', 0, log);
            const d = autorun((reader) => {
                const value = myObservable.read(reader);
                if (value >= 1) {
                    throw new Error('foobar');
                }
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.firstObserverAdded',
                'myObservable.get',
            ]);
            myObservable.set(1, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value 1)',
                'myObservable.get',
                'error: foobar',
            ]);
            myObservable.set(2, undefined);
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'myObservable.set (value 2)',
                'myObservable.get',
                'error: foobar',
            ]);
            d.dispose();
        });
    });
    test('recomputeInitiallyAndOnChange should work when a dependency sets an observable', () => {
        const store = new DisposableStore();
        const log = new Log();
        const myObservable = new LoggingObservableValue('myObservable', 0, log);
        let shouldUpdate = true;
        const myDerived = derived((reader) => {
            /** @description myDerived */
            log.log('myDerived.computed start');
            const val = myObservable.read(reader);
            if (shouldUpdate) {
                shouldUpdate = false;
                myObservable.set(1, undefined);
            }
            log.log('myDerived.computed end');
            return val;
        });
        assert.deepStrictEqual(log.getAndClearEntries(), []);
        myDerived.recomputeInitiallyAndOnChange(store, (val) => {
            log.log(`recomputeInitiallyAndOnChange, myDerived: ${val}`);
        });
        assert.deepStrictEqual(log.getAndClearEntries(), [
            'myDerived.computed start',
            'myObservable.firstObserverAdded',
            'myObservable.get',
            'myObservable.set (value 1)',
            'myDerived.computed end',
            'myDerived.computed start',
            'myObservable.get',
            'myDerived.computed end',
            'recomputeInitiallyAndOnChange, myDerived: 1',
        ]);
        myDerived.get();
        assert.deepStrictEqual(log.getAndClearEntries(), []);
        store.dispose();
    });
    suite('prevent invalid usage', () => {
        suite('reading outside of compute function', () => {
            test('derived', () => {
                let fn = () => { };
                const obs = observableValue('obs', 0);
                const d = derived((reader) => {
                    fn = () => {
                        obs.read(reader);
                    };
                    return obs.read(reader);
                });
                const disp = autorun((reader) => {
                    d.read(reader);
                });
                assert.throws(() => {
                    fn();
                });
                disp.dispose();
            });
            test('autorun', () => {
                let fn = () => { };
                const obs = observableValue('obs', 0);
                const disp = autorun((reader) => {
                    fn = () => {
                        obs.read(reader);
                    };
                    obs.read(reader);
                });
                assert.throws(() => {
                    fn();
                });
                disp.dispose();
            });
        });
        test.skip('catches cyclic dependencies', () => {
            const log = new Log();
            setUnexpectedErrorHandler((e) => {
                log.log(e.toString());
            });
            const obs = observableValue('obs', 0);
            const d1 = derived((reader) => {
                log.log('d1.computed start');
                const x = obs.read(reader) + d2.read(reader);
                log.log('d1.computed end');
                return x;
            });
            const d2 = derived((reader) => {
                log.log('d2.computed start');
                d1.read(reader);
                log.log('d2.computed end');
                return 0;
            });
            const disp = autorun((reader) => {
                log.log('autorun start');
                d1.read(reader);
                log.log('autorun end');
                return 0;
            });
            assert.deepStrictEqual(log.getAndClearEntries(), [
                'autorun start',
                'd1.computed start',
                'd2.computed start',
                'Error: Cyclic deriveds are not supported yet!',
                'd1.computed end',
                'autorun end',
            ]);
            disp.dispose();
        });
    });
});
export class LoggingObserver {
    constructor(debugName, log) {
        this.debugName = debugName;
        this.log = log;
        this.count = 0;
    }
    beginUpdate(observable) {
        this.count++;
        this.log.log(`${this.debugName}.beginUpdate (count ${this.count})`);
    }
    endUpdate(observable) {
        this.log.log(`${this.debugName}.endUpdate (count ${this.count})`);
        this.count--;
    }
    handleChange(observable, change) {
        this.log.log(`${this.debugName}.handleChange (count ${this.count})`);
    }
    handlePossibleChange(observable) {
        this.log.log(`${this.debugName}.handlePossibleChange`);
    }
}
export class LoggingObservableValue extends BaseObservable {
    constructor(debugName, initialValue, logger) {
        super();
        this.debugName = debugName;
        this.logger = logger;
        this.value = initialValue;
    }
    onFirstObserverAdded() {
        this.logger.log(`${this.debugName}.firstObserverAdded`);
    }
    onLastObserverRemoved() {
        this.logger.log(`${this.debugName}.lastObserverRemoved`);
    }
    get() {
        this.logger.log(`${this.debugName}.get`);
        return this.value;
    }
    set(value, tx, change) {
        if (this.value === value) {
            return;
        }
        if (!tx) {
            transaction((tx) => {
                this.set(value, tx, change);
            }, () => `Setting ${this.debugName}`);
            return;
        }
        this.logger.log(`${this.debugName}.set (value ${value})`);
        this.value = value;
        for (const observer of this._observers) {
            tx.updateObserver(observer, this);
            observer.handleChange(this, change);
        }
    }
    toString() {
        return `${this.debugName}: ${this.value}`;
    }
}
class Log {
    constructor() {
        this.entries = [];
    }
    log(message) {
        this.entries.push(message);
    }
    getAndClearEntries() {
        const entries = [...this.entries];
        this.entries.length = 0;
        return entries;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9vYnNlcnZhYmxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzNELE9BQU8sRUFDTixPQUFPLEVBQ1Asb0JBQW9CLEVBQ3BCLE9BQU8sRUFDUCxpQkFBaUIsRUFLakIsWUFBWSxFQUNaLG1CQUFtQixFQUNuQixnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsY0FBYyxFQUF5QixNQUFNLHlDQUF5QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6QixNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXBEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7UUFDdEIsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtZQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO1lBQ3JCLHVGQUF1RjtZQUN2RixnREFBZ0Q7WUFDaEQsdUNBQXVDO1lBQ3ZDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdkQsa0ZB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