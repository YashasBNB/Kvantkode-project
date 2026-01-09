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
