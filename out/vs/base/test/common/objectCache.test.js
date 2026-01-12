/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { ObjectCache } from '../../common/objectCache.js';
import { wait } from './testUtils.js';
import { ObservableDisposable } from '../../common/observableDisposable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
/**
 * Test object class.
 */
class TestObject extends ObservableDisposable {
    constructor(ID) {
        super();
        this.ID = ID;
    }
    /**
     * Check if this object is equal to another one.
     */
    equal(other) {
        return this.ID === other.ID;
    }
}
suite('ObjectCache', function () {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('get', () => {
        /**
         * Common test funtion to test core logic of the cache
         * with provider test ID keys of some specific type.
         *
         * @param key1 Test key1.
         * @param key2 Test key2.
         */
        const testCoreLogic = async (key1, key2) => {
            const factory = spy((key) => {
                const result = new TestObject(key);
                result.assertNotDisposed('Object must not be disposed.');
                return result;
            });
            const cache = disposables.add(new ObjectCache(factory));
            /**
             * Test the core logic of the cache using 2 objects.
             */
            const obj1 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj1] Must be called once with the correct arguments.');
            assert(obj1.ID === key1, '[obj1] Returned object must have the correct ID.');
            const obj2 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj2] Must be called once with the correct arguments.');
            assert(obj2.ID === key1, '[obj2] Returned object must have the correct ID.');
            assert(obj1 === obj2 && obj1.equal(obj2), '[obj2] Returned object must be the same instance.');
            factory.resetHistory();
            const obj3 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj3] Must be called once with the correct arguments.');
            assert(obj3.ID === key2, '[obj3] Returned object must have the correct ID.');
            factory.resetHistory();
            const obj4 = cache.get(key1);
            assert(factory.notCalled, '[obj4] Factory must not be called.');
            assert(obj4.ID === key1, '[obj4] Returned object must have the correct ID.');
            assert(obj1 === obj4 && obj1.equal(obj4), '[obj4] Returned object must be the same instance.');
            factory.resetHistory();
            /**
             * Now test that the object is removed automatically from
             * the cache when it is disposed.
             */
            obj3.dispose();
            // the object is removed from the cache asynchronously
            // so add a small delay to ensure the object is removed
            await wait(5);
            const obj5 = cache.get(key1);
            assert(factory.notCalled, '[obj5] Factory must not be called.');
            assert(obj5.ID === key1, '[obj5] Returned object must have the correct ID.');
            assert(obj1 === obj5 && obj1.equal(obj5), '[obj5] Returned object must be the same instance.');
            factory.resetHistory();
            /**
             * Test that the previously disposed object is recreated
             * on the new retrieval call.
             */
            const obj6 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj6] Must be called once with the correct arguments.');
            assert(obj6.ID === key2, '[obj6] Returned object must have the correct ID.');
        };
        test('strings as keys', async function () {
            await testCoreLogic('key1', 'key2');
        });
        test('numbers as keys', async function () {
            await testCoreLogic(10, 17065);
        });
        test('objects as keys', async function () {
            await testCoreLogic(disposables.add(new TestObject({})), disposables.add(new TestObject({})));
        });
    });
    suite('remove', () => {
        /**
         * Common test funtion to test remove logic of the cache
         * with provider test ID keys of some specific type.
         *
         * @param key1 Test key1.
         * @param key2 Test key2.
         */
        const testRemoveLogic = async (key1, key2, disposeOnRemove) => {
            const factory = spy((key) => {
                const result = new TestObject(key);
                result.assertNotDisposed('Object must not be disposed.');
                return result;
            });
            // ObjectCache<TestObject<TKey>, TKey>
            const cache = disposables.add(new ObjectCache(factory));
            /**
             * Test the core logic of the cache.
             */
            const obj1 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj1] Must be called once with the correct arguments.');
            assert(obj1.ID === key1, '[obj1] Returned object must have the correct ID.');
            factory.resetHistory();
            const obj2 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj2] Must be called once with the correct arguments.');
            assert(obj2.ID === key2, '[obj2] Returned object must have the correct ID.');
            cache.remove(key2, disposeOnRemove);
            const object2Disposed = obj2.disposed;
            // ensure we don't leak undisposed object in the tests
            if (!obj2.disposed) {
                obj2.dispose();
            }
            assert(object2Disposed === disposeOnRemove, `[obj2] Removed object must be disposed: ${disposeOnRemove}.`);
            factory.resetHistory();
            /**
             * Validate that another object is not disposed.
             */
            assert(!obj1.disposed, '[obj1] Object must not be disposed.');
            const obj3 = cache.get(key1);
            assert(factory.notCalled, '[obj3] Factory must not be called.');
            assert(obj3.ID === key1, '[obj3] Returned object must have the correct ID.');
            assert(obj1 === obj3 && obj1.equal(obj3), '[obj3] Returned object must be the same instance.');
            factory.resetHistory();
        };
        test('strings as keys', async function () {
            await testRemoveLogic('key1', 'key2', false);
            await testRemoveLogic('some-key', 'another-key', true);
        });
        test('numbers as keys', async function () {
            await testRemoveLogic(7, 2400700, false);
            await testRemoveLogic(1090, 2654, true);
        });
        test('objects as keys', async function () {
            await testRemoveLogic(disposables.add(new TestObject(1)), disposables.add(new TestObject(1)), false);
            await testRemoveLogic(disposables.add(new TestObject(2)), disposables.add(new TestObject(2)), true);
        });
    });
    test('throws if factory returns a disposed object', async function () {
        const factory = (key) => {
            const result = new TestObject(key);
            if (key === 'key2') {
                result.dispose();
            }
            // caution! explicit type casting below!
            return result;
        };
        // ObjectCache<TestObject>
        const cache = disposables.add(new ObjectCache(factory));
        assert.doesNotThrow(() => {
            cache.get('key1');
        });
        assert.throws(() => {
            cache.get('key2');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q2FjaGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi9vYmplY3RDYWNoZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDckMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRXBFOztHQUVHO0FBQ0gsTUFBTSxVQUF1RCxTQUFRLG9CQUFvQjtJQUN4RixZQUE0QixFQUFRO1FBQ25DLEtBQUssRUFBRSxDQUFBO1FBRG9CLE9BQUUsR0FBRixFQUFFLENBQU07SUFFcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLEtBQXVDO1FBQ25ELE9BQU8sSUFBSSxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUU7SUFDcEIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUNqQjs7Ozs7O1dBTUc7UUFDSCxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQXFDLElBQVUsRUFBRSxJQUFVLEVBQUUsRUFBRTtZQUN6RixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFTLEVBQUUsRUFBRTtnQkFDakMsTUFBTSxNQUFNLEdB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