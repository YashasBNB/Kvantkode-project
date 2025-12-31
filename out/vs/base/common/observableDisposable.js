/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from './event.js';
import { Disposable } from './lifecycle.js';
/**
 * Disposable object that tracks its {@linkcode disposed} state
 * as a public attribute and provides the {@linkcode onDispose}
 * event to subscribe to.
 */
export class ObservableDisposable extends Disposable {
    constructor() {
        super(...arguments);
        /**
         * Private emitter for the `onDispose` event.
         */
        this._onDispose = this._register(new Emitter());
        /**
         * Tracks disposed state of this object.
         */
        this._disposed = false;
    }
    /**
     * The event is fired when this object is disposed.
     * Note! Executes the callback immediately if already disposed.
     *
     * @param callback The callback function to be called on updates.
     */
    onDispose(callback) {
        // if already disposed, execute the callback immediately
        if (this.disposed) {
            callback();
            return this;
        }
        // otherwise subscribe to the event
        this._register(this._onDispose.event(callback));
        return this;
    }
    /**
     * Check if the current object was already disposed.
     */
    get disposed() {
        return this._disposed;
    }
    /**
     * Dispose current object if not already disposed.
     * @returns
     */
    dispose() {
        if (this.disposed) {
            return;
        }
        this._disposed = true;
        this._onDispose.fire();
        super.dispose();
    }
    /**
     * Assert that the current object was not yet disposed.
     *
     * @throws If the current object was already disposed.
     * @param error Error message or error object to throw if assertion fails.
     */
    assertNotDisposed(error) {
        assertNotDisposed(this, error);
    }
}
/**
 * Asserts that a provided `object` is not `disposed` yet,
 * e.g., its `disposed` property is `false`.
 *
 * @throws if the provided `object.disposed` equal to `false`.
 * @param error Error message or error object to throw if assertion fails.
 */
export function assertNotDisposed(object, error) {
    if (!object.disposed) {
        return;
    }
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    throw errorToThrow;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYnNlcnZhYmxlRGlzcG9zYWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUUzQzs7OztHQUlHO0FBQ0gsTUFBTSxPQUFnQixvQkFBcUIsU0FBUSxVQUFVO0lBQTdEOztRQUNDOztXQUVHO1FBQ2MsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBcUJqRTs7V0FFRztRQUNLLGNBQVMsR0FBRyxLQUFLLENBQUE7SUFnQzFCLENBQUM7SUF0REE7Ozs7O09BS0c7SUFDSSxTQUFTLENBQUMsUUFBb0I7UUFDcEMsd0RBQXdEO1FBQ3hELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLFFBQVEsRUFBRSxDQUFBO1lBRVYsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFPRDs7T0FFRztJQUNILElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIsQ0FBQztJQUVEOzs7T0FHRztJQUNhLE9BQU87UUFDdEIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQTtRQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3RCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxpQkFBaUIsQ0FBQyxLQUFxQjtRQUM3QyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDL0IsQ0FBQztDQUNEO0FBT0Q7Ozs7OztHQU1HO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUNoQyxNQUFlLEVBQ2YsS0FBcUI7SUFFckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN0QixPQUFNO0lBQ1AsQ0FBQztJQUVELE1BQU0sWUFBWSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtJQUV6RSxNQUFNLFlBQVksQ0FBQTtBQUNuQixDQUFDIn0=