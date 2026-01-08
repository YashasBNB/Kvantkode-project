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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vbGlmZWN5Y2xlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvQyxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFFUCxlQUFlLEVBQ2YsbUJBQW1CLEVBQ25CLGNBQWMsRUFDZCxpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRWpHLE1BQU0sVUFBVTtJQUFoQjtRQUNDLGVBQVUsR0FBRyxLQUFLLENBQUE7SUFJbkIsQ0FBQztJQUhBLE9BQU87UUFDTixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtJQUN2QixDQUFDO0NBQ0Q7QUFFRCx3REFBd0Q7QUFDeEQseUVBQXlFO0FBQ3pFLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQTtRQUVuQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFOUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRW5CLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxF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