/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../common/event.js';
import { DisposableStore, dispose, markAsSingleton, ReferenceCollection, SafeDisposable, thenIfNotDisposed, toDisposable, } from '../../common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite, throwIfDisposablesAreLeaked } from './utils.js';
class Disposable {
    constructor() {
        this.isDisposed = false;
    }
    dispose() {
        this.isDisposed = true;
    }
}
// Leaks are allowed here since we test lifecycle stuff:
// eslint-disable-next-line local/code-ensure-no-disposables-leak-in-test
suite('Lifecycle', () => {
    test('dispose single disposable', () => {
        const disposable = new Disposable();
        assert(!disposable.isDisposed);
        dispose(disposable);
        assert(disposable.isDisposed);
    });
    test('dispose disposable array', () => {
        const disposable = new Disposable();
        const disposable2 = new Disposable();
        assert(!disposable.isDisposed);
        assert(!disposable2.isDisposed);
        dispose([disposable, disposable2]);
        assert(disposable.isDisposed);
        assert(disposable2.isDisposed);
    });
    test('dispose disposables', () => {
        const disposable = new Disposable();
        const disposable2 = new Disposable();
        assert(!disposable.isDisposed);
        assert(!disposable2.isDisposed);
        dispose(disposable);
        dispose(disposable2);
        assert(disposable.isDisposed);
        assert(disposable2.isDisposed);
    });
    test('dispose array should dispose all if a child throws on dispose', () => {
        const disposedValues = new Set();
        let thrownError;
        try {
            dispose([
                toDisposable(() => {
                    disposedValues.add(1);
                }),
                toDisposable(() => {
                    throw new Error('I am error');
                }),
                toDisposable(() => {
                    disposedValues.add(3);
                }),
            ]);
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(3));
        assert.strictEqual(thrownError.message, 'I am error');
    });
    test('dispose array should rethrow composite error if multiple entries throw on dispose', () => {
        const disposedValues = new Set();
        let thrownError;
        try {
            dispose([
                toDisposable(() => {
                    disposedValues.add(1);
                }),
                toDisposable(() => {
                    throw new Error('I am error 1');
                }),
                toDisposable(() => {
                    throw new Error('I am error 2');
                }),
                toDisposable(() => {
                    disposedValues.add(4);
                }),
            ]);
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(4));
        assert.ok(thrownError instanceof AggregateError);
        assert.strictEqual(thrownError.errors.length, 2);
        assert.strictEqual(thrownError.errors[0].message, 'I am error 1');
        assert.strictEqual(thrownError.errors[1].message, 'I am error 2');
    });
    test('Action bar has broken accessibility #100273', function () {
        const array = [{ dispose() { } }, { dispose() { } }];
        const array2 = dispose(array);
        assert.strictEqual(array.length, 2);
        assert.strictEqual(array2.length, 0);
        assert.ok(array !== array2);
        const set = new Set([{ dispose() { } }, { dispose() { } }]);
        const setValues = set.values();
        const setValues2 = dispose(setValues);
        assert.ok(setValues === setValues2);
    });
    test('SafeDisposable, dispose', function () {
        let disposed = 0;
        const actual = () => (disposed += 1);
        const d = new SafeDisposable();
        d.set(actual);
        d.dispose();
        assert.strictEqual(disposed, 1);
    });
    test('SafeDisposable, unset', function () {
        let disposed = 0;
        const actual = () => (disposed += 1);
        const d = new SafeDisposable();
        d.set(actual);
        d.unset();
        d.dispose();
        assert.strictEqual(disposed, 0);
    });
});
suite('DisposableStore', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('dispose should call all child disposes even if a child throws on dispose', () => {
        const disposedValues = new Set();
        const store = new DisposableStore();
        store.add(toDisposable(() => {
            disposedValues.add(1);
        }));
        store.add(toDisposable(() => {
            throw new Error('I am error');
        }));
        store.add(toDisposable(() => {
            disposedValues.add(3);
        }));
        let thrownError;
        try {
            store.dispose();
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(3));
        assert.strictEqual(thrownError.message, 'I am error');
    });
    test('dispose should throw composite error if multiple children throw on dispose', () => {
        const disposedValues = new Set();
        const store = new DisposableStore();
        store.add(toDisposable(() => {
            disposedValues.add(1);
        }));
        store.add(toDisposable(() => {
            throw new Error('I am error 1');
        }));
        store.add(toDisposable(() => {
            throw new Error('I am error 2');
        }));
        store.add(toDisposable(() => {
            disposedValues.add(4);
        }));
        let thrownError;
        try {
            store.dispose();
        }
        catch (e) {
            thrownError = e;
        }
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(4));
        assert.ok(thrownError instanceof AggregateError);
        assert.strictEqual(thrownError.errors.length, 2);
        assert.strictEqual(thrownError.errors[0].message, 'I am error 1');
        assert.strictEqual(thrownError.errors[1].message, 'I am error 2');
    });
    test('delete should evict and dispose of the disposables', () => {
        const disposedValues = new Set();
        const disposables = [
            toDisposable(() => {
                disposedValues.add(1);
            }),
            toDisposable(() => {
                disposedValues.add(2);
            }),
        ];
        const store = new DisposableStore();
        store.add(disposables[0]);
        store.add(disposables[1]);
        store.delete(disposables[0]);
        assert.ok(disposedValues.has(1));
        assert.ok(!disposedValues.has(2));
        store.dispose();
        assert.ok(disposedValues.has(1));
        assert.ok(disposedValues.has(2));
    });
    test('deleteAndLeak should evict and not dispose of the disposables', () => {
        const disposedValues = new Set();
        const disposables = [
            toDisposable(() => {
                disposedValues.add(1);
            }),
            toDisposable(() => {
                disposedValues.add(2);
            }),
        ];
        const store = new DisposableStore();
        store.add(disposables[0]);
        store.add(disposables[1]);
        store.deleteAndLeak(disposables[0]);
        assert.ok(!disposedValues.has(1));
        assert.ok(!disposedValues.has(2));
        store.dispose();
        assert.ok(!disposedValues.has(1));
        assert.ok(disposedValues.has(2));
        disposables[0].dispose();
    });
});
suite('Reference Collection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class Collection extends ReferenceCollection {
        constructor() {
            super(...arguments);
            this._count = 0;
        }
        get count() {
            return this._count;
        }
        createReferencedObject(key) {
            this._count++;
            return key.length;
        }
        destroyReferencedObject(key, object) {
            this._count--;
        }
    }
    test('simple', () => {
        const collection = new Collection();
        const ref1 = collection.acquire('test');
        assert(ref1);
        assert.strictEqual(ref1.object, 4);
        assert.strictEqual(collection.count, 1);
        ref1.dispose();
        assert.strictEqual(collection.count, 0);
        const ref2 = collection.acquire('test');
        const ref3 = collection.acquire('test');
        assert.strictEqual(ref2.object, ref3.object);
        assert.strictEqual(collection.count, 1);
        const ref4 = collection.acquire('monkey');
        assert.strictEqual(ref4.object, 6);
        assert.strictEqual(collection.count, 2);
        ref2.dispose();
        assert.strictEqual(collection.count, 2);
        ref3.dispose();
        assert.strictEqual(collection.count, 1);
        ref4.dispose();
        assert.strictEqual(collection.count, 0);
    });
});
function assertThrows(fn, test) {
    try {
        fn();
        assert.fail('Expected function to throw, but it did not.');
    }
    catch (e) {
        assert.ok(test(e));
    }
}
suite('No Leakage Utilities', () => {
    suite('throwIfDisposablesAreLeaked', () => {
        test('throws if an event subscription is not cleaned up', () => {
            const eventEmitter = new Emitter();
            assertThrows(() => {
                throwIfDisposablesAreLeaked(() => {
                    eventEmitter.event(() => {
                        // noop
                    });
                }, false);
            }, (e) => e.message.indexOf('undisposed disposables') !== -1);
        });
        test('throws if a disposable is not disposed', () => {
            assertThrows(() => {
                throwIfDisposablesAreLeaked(() => {
                    new DisposableStore();
                }, false);
            }, (e) => e.message.indexOf('undisposed disposables') !== -1);
        });
        test('does not throw if all event subscriptions are cleaned up', () => {
            const eventEmitter = new Emitter();
            throwIfDisposablesAreLeaked(() => {
                eventEmitter
                    .event(() => {
                    // noop
                })
                    .dispose();
            });
        });
        test('does not throw if all disposables are disposed', () => {
            // This disposable is reported before the test and not tracked.
            toDisposable(() => { });
            throwIfDisposablesAreLeaked(() => {
                // This disposable is marked as singleton
                markAsSingleton(toDisposable(() => { }));
                // These disposables are also marked as singleton
                const disposableStore = new DisposableStore();
                disposableStore.add(toDisposable(() => { }));
                markAsSingleton(disposableStore);
                toDisposable(() => { }).dispose();
            });
        });
    });
    suite('ensureNoDisposablesAreLeakedInTest', () => {
        ensureNoDisposablesAreLeakedInTestSuite();
        test('Basic Test', () => {
            toDisposable(() => { }).dispose();
        });
    });
    suite('thenIfNotDisposed', () => {
        const store = ensureNoDisposablesAreLeakedInTestSuite();
        test('normal case', async () => {
            let called = false;
            store.add(thenIfNotDisposed(Promise.resolve(123), (result) => {
                assert.strictEqual(result, 123);
                called = true;
            }));
            await new Promise((resolve) => setTimeout(resolve, 0));
            assert.strictEqual(called, true);
        });
        test('disposed before promise resolves', async () => {
            let called = false;
            const disposable = thenIfNotDisposed(Promise.resolve(123), () => {
                called = true;
            });
            disposable.dispose();
            await new Promise((resolve) => setTimeout(resolve, 0));
            assert.strictEqual(called, false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2xpZmVjeWNsZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0MsT0FBTyxFQUNOLGVBQWUsRUFDZixPQUFPLEVBRVAsZUFBZSxFQUNmLG1CQUFtQixFQUNuQixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLFlBQVksR0FDWixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVqRyxNQUFNLFVBQVU7SUFBaEI7UUFDQyxlQUFVLEdBQUcsS0FBSyxDQUFBO0lBSW5CLENBQUM7SUFIQSxPQUFPO1FBQ04sSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUE7SUFDdkIsQ0FBQztDQUNEO0FBRUQsd0RBQXdEO0FBQ3hELHlFQUF5RTtBQUN6RSxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2QixJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxFQUFFLENBQUE7UUFFbkMsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTlCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUVuQixNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzlCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsRUFBRSxD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