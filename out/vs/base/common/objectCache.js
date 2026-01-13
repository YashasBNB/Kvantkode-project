/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableMap } from './lifecycle.js';
import { assertNotDisposed } from './observableDisposable.js';
/**
 * Generic cache for object instances. Guarantees to return only non-disposed
 * objects from the {@linkcode get} method. If a requested object is not yet
 * in the cache or is disposed already, the {@linkcode factory} callback is
 * called to create a new object.
 *
 * @throws if {@linkcode factory} callback returns a disposed object.
 *
 * ## Examples
 *
 * ```typescript
 * // a class that will be used as a cache key; the key can be of any
 * // non-nullable type, including primitives like `string` or `number`,
 * // but in this case we use an object pointer as a key
 * class KeyObject {}
 *
 * // a class for testing purposes
 * class TestObject extends ObservableDisposable {
 *   constructor(
 *     public readonly id: KeyObject,
 *   ) {}
 * };
 *
 * // create an object cache instance providing it a factory function that
 * // is responsible for creating new objects based on the provided key if
 * // the cache does not contain the requested object yet or an existing
 * // object is already disposed
 * const cache = new ObjectCache<TestObject, KeyObject>((key) => {
 *   // create a new test object based on the provided key
 *   return new TestObject(key);
 * });
 *
 * // create two keys
 * const key1 = new KeyObject();
 * const key2 = new KeyObject();
 *
 * // get an object from the cache by its key
 * const object1 = cache.get(key1); // returns a new test object
 *
 * // validate that the new object has the correct key
 * assert(
 *   object1.id === key1,
 *   'Object 1 must have correct ID.',
 * );
 *
 * // returns the same cached test object
 * const object2 = cache.get(key1);
 *
 * // validate that the same exact object is returned from the cache
 * assert(
 *   object1 === object2,
 *   'Object 2 the same cached object as object 1.',
 * );
 *
 * // returns a new test object
 * const object3 = cache.get(key2);
 *
 * // validate that the new object has the correct key
 * assert(
 *   object3.id === key2,
 *   'Object 3 must have correct ID.',
 * );
 *
 * assert(
 *   object3 !== object1,
 *   'Object 3 must be a new object.',
 * );
 * ```
 */
export class ObjectCache extends Disposable {
    constructor(factory) {
        super();
        this.factory = factory;
        this.cache = this._register(new DisposableMap());
    }
    /**
     * Get an existing object from the cache. If a requested object is not yet
     * in the cache or is disposed already, the {@linkcode factory} callback is
     * called to create a new object.
     *
     * @throws if {@linkcode factory} callback returns a disposed object.
     * @param key - ID of the object in the cache
     */
    get(key) {
        let object = this.cache.get(key);
        // if object is already disposed, remove it from the cache
        if (object?.disposed) {
            this.cache.deleteAndLeak(key);
            object = undefined;
        }
        // if object exists and is not disposed, return it
        if (object) {
            // must always hold true due to the check above
            assertNotDisposed(object, 'Object must not be disposed.');
            return object;
        }
        // create a new object by calling the factory
        object = this.factory(key);
        // newly created object must not be disposed
        assertNotDisposed(object, 'Newly created object must not be disposed.');
        // remove it from the cache automatically on dispose
        object.onDispose(() => {
            this.cache.deleteAndLeak(key);
        });
        this.cache.set(key, object);
        return object;
    }
    /**
     * Remove an object from the cache by its key.
     *
     * @param key ID of the object to remove.
     * @param dispose Whether the removed object must be disposed.
     */
    remove(key, dispose) {
        if (dispose) {
            this.cache.deleteAndDispose(key);
            return this;
        }
        this.cache.deleteAndLeak(key);
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29iamVjdENhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDMUQsT0FBTyxFQUF3QixpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRW5GOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9FRztBQUNILE1BQU0sT0FBTyxXQUdYLFNBQVEsVUFBVTtJQUduQixZQUE2QixPQUFvRDtRQUNoRixLQUFLLEVBQUUsQ0FBQTtRQURxQixZQUFPLEdBQVAsT0FBTyxDQUE2QztRQUZoRSxVQUFLLEdBQWdDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFBO0lBSXpGLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0ksR0FBRyxDQUFDLEdBQVM7UUFDbkIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFaEMsMERBQTBEO1FBQzFELElBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdCLE1BQU0sR0FBRyxTQUFTLENBQUE7UUFDbkIsQ0FBQztRQUVELGtEQUFrRDtRQUNsRCxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osK0NBQStDO1lBQy9DLGlCQUFpQixDQUFDLE1BQU0sRUFBRSw4QkFBOEIsQ0FBQyxDQUFBO1lBRXpELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELDZDQUE2QztRQUM3QyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUUxQiw0Q0FBNEM7UUFDNUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLDRDQUE0QyxDQUFDLENBQUE7UUFFdkUsb0RBQW9EO1FBQ3BELE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBRTNCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksTUFBTSxDQUFDLEdBQVMsRUFBRSxPQUFnQjtRQUN4QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7Q0FDRCJ9