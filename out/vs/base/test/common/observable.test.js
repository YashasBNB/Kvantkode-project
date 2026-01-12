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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL29ic2VydmFibGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDM0QsT0FBTyxFQUNOLE9BQU8sRUFDUCxvQkFBb0IsRUFDcEIsT0FBTyxFQUNQLGlCQUFpQixFQUtqQixZQUFZLEVBQ1osbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQixlQUFlLEVBQ2YsV0FBVyxFQUNYLFlBQVksR0FDWixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxjQUFjLEVBQXlCLE1BQU0seUNBQXlDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFLEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFcEQ7O09BRUc7SUFDSCxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUN0QixJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1lBQ2pDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7WUFDckIsdUZBQXVGO1lBQ3ZGLGdEQUFnRDtZQUNoRCx1Q0FBdUM7WUFDdkMsTUFBTSxZQUFZLEdBQUcsZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV2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