/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../assert.js';
import { Emitter } from '../event.js';
import { DeferredPromise } from '../async.js';
import { AsyncDecoder } from './asyncDecoder.js';
import { ObservableDisposable } from '../observableDisposable.js';
/**
 * Base decoder class that can be used to convert stream messages data type
 * from one type to another. For instance, a stream of binary data can be
 * "decoded" into a stream of well defined objects.
 * Intended to be a part of "codec" implementation rather than used directly.
 */
export class BaseDecoder extends ObservableDisposable {
    /**
     * @param stream The input stream to decode.
     */
    constructor(stream) {
        super();
        this.stream = stream;
        /**
         * Private attribute to track if the stream has ended.
         */
        this._ended = false;
        this._onData = this._register(new Emitter());
        this._onEnd = this._register(new Emitter());
        this._onError = this._register(new Emitter());
        /**
         * A store of currently registered event listeners.
         */
        this._listeners = new Map();
        /**
         * Private attribute to track if the stream has started.
         */
        this.started = false;
        /**
         * Promise that resolves when the stream has ended, either by
         * receiving the `end` event or by a disposal, but not when
         * the `error` event is received alone.
         */
        this.settledPromise = new DeferredPromise();
        this.tryOnStreamData = this.tryOnStreamData.bind(this);
        this.onStreamError = this.onStreamError.bind(this);
        this.onStreamEnd = this.onStreamEnd.bind(this);
    }
    /**
     * Promise that resolves when the stream has ended, either by
     * receiving the `end` event or by a disposal, but not when
     * the `error` event is received alone.
     *
     * @throws If the stream was not yet started to prevent this
     * 		   promise to block the consumer calls indefinitely.
     */
    get settled() {
        // if the stream has not started yet, the promise might
        // block the consumer calls indefinitely if they forget
        // to call the `start()` method, or if the call happens
        // after await on the `settled` promise; to forbid this
        // confusion, we require the stream to be started first
        assert(this.started, [
            'Cannot get `settled` promise of a stream that has not been started.',
            'Please call `start()` first.',
        ].join(' '));
        return this.settledPromise.p;
    }
    /**
     * Start receiving data from the stream.
     * @throws if the decoder stream has already ended.
     */
    start() {
        assert(!this._ended, 'Cannot start stream that has already ended.');
        assert(!this.disposed, 'Cannot start stream that has already disposed.');
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        this.stream.on('data', this.tryOnStreamData);
        this.stream.on('error', this.onStreamError);
        this.stream.on('end', this.onStreamEnd);
        // this allows to compose decoders together, - if a decoder
        // instance is passed as a readable stream to this decoder,
        // then we need to call `start` on it too
        if (this.stream instanceof BaseDecoder) {
            this.stream.start();
        }
        return this;
    }
    /**
     * Check if the decoder has been ended hence has
     * no more data to produce.
     */
    get ended() {
        return this._ended;
    }
    /**
     * Automatically catch and dispatch errors thrown inside `onStreamData`.
     */
    tryOnStreamData(data) {
        try {
            this.onStreamData(data);
        }
        catch (error) {
            this.onStreamError(error);
        }
    }
    on(event, callback) {
        if (event === 'data') {
            return this.onData(callback);
        }
        if (event === 'error') {
            return this.onError(callback);
        }
        if (event === 'end') {
            return this.onEnd(callback);
        }
        throw new Error(`Invalid event name: ${event}`);
    }
    /**
     * Add listener for the `data` event.
     * @throws if the decoder stream has already ended.
     */
    onData(callback) {
        assert(!this.ended, 'Cannot subscribe to the `data` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('data');
        if (!currentListeners) {
            currentListeners = new Map();
            this._listeners.set('data', currentListeners);
        }
        currentListeners.set(callback, this._onData.event(callback));
    }
    /**
     * Add listener for the `error` event.
     * @throws if the decoder stream has already ended.
     */
    onError(callback) {
        assert(!this.ended, 'Cannot subscribe to the `error` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('error');
        if (!currentListeners) {
            currentListeners = new Map();
            this._listeners.set('error', currentListeners);
        }
        currentListeners.set(callback, this._onError.event(callback));
    }
    /**
     * Add listener for the `end` event.
     * @throws if the decoder stream has already ended.
     */
    onEnd(callback) {
        assert(!this.ended, 'Cannot subscribe to the `end` event because the decoder stream has already ended.');
        let currentListeners = this._listeners.get('end');
        if (!currentListeners) {
            currentListeners = new Map();
            this._listeners.set('end', currentListeners);
        }
        currentListeners.set(callback, this._onEnd.event(callback));
    }
    /**
     * Remove all existing event listeners.
     */
    removeAllListeners() {
        // remove listeners set up by this class
        this.stream.removeListener('data', this.tryOnStreamData);
        this.stream.removeListener('error', this.onStreamError);
        this.stream.removeListener('end', this.onStreamEnd);
        // remove listeners set up by external consumers
        for (const [name, listeners] of this._listeners.entries()) {
            this._listeners.delete(name);
            for (const [listener, disposable] of listeners) {
                disposable.dispose();
                listeners.delete(listener);
            }
        }
    }
    /**
     * Pauses the stream.
     */
    pause() {
        this.stream.pause();
    }
    /**
     * Resumes the stream if it has been paused.
     * @throws if the decoder stream has already ended.
     */
    resume() {
        assert(!this.ended, 'Cannot resume the stream because it has already ended.');
        this.stream.resume();
    }
    /**
     * Destroys(disposes) the stream.
     */
    destroy() {
        this.dispose();
    }
    /**
     * Removes a priorly-registered event listener for a specified event.
     *
     * Note!
     *  - the callback function must be the same as the one that was used when
     * 	  registering the event listener as it is used as an identifier to
     *    remove the listener
     *  - this method is idempotent and results in no-op if the listener is
     *    not found, therefore passing incorrect `callback` function may
     *    result in silent unexpected behaviour
     */
    removeListener(event, callback) {
        for (const [nameName, listeners] of this._listeners.entries()) {
            if (nameName !== event) {
                continue;
            }
            for (const [listener, disposable] of listeners) {
                if (listener !== callback) {
                    continue;
                }
                disposable.dispose();
                listeners.delete(listener);
            }
        }
    }
    /**
     * This method is called when the input stream ends.
     */
    onStreamEnd() {
        if (this._ended) {
            return;
        }
        this._ended = true;
        this._onEnd.fire();
        this.settledPromise.complete();
    }
    /**
     * This method is called when the input stream emits an error.
     * We re-emit the error here by default, but subclasses can
     * override this method to handle the error differently.
     */
    onStreamError(error) {
        this._onError.fire(error);
    }
    /**
     * Consume all messages from the stream, blocking until the stream finishes.
     * @throws if the decoder stream has already ended.
     */
    async consumeAll() {
        assert(!this._ended, 'Cannot consume all messages of the stream that has already ended.');
        const messages = [];
        for await (const maybeMessage of this) {
            if (maybeMessage === null) {
                break;
            }
            messages.push(maybeMessage);
        }
        return messages;
    }
    /**
     * Async iterator interface for the decoder.
     * @throws if the decoder stream has already ended.
     */
    [Symbol.asyncIterator]() {
        assert(!this._ended, 'Cannot iterate on messages of the stream that has already ended.');
        const asyncDecoder = this._register(new AsyncDecoder(this));
        return asyncDecoder[Symbol.asyncIterator]();
    }
    dispose() {
        if (this.disposed) {
            return;
        }
        this.onStreamEnd();
        this.stream.destroy();
        this.removeAllListeners();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9jb2RlY3MvYmFzZURlY29kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBR3JDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDN0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBT2pFOzs7OztHQUtHO0FBQ0gsTUFBTSxPQUFnQixXQUlyQixTQUFRLG9CQUFvQjtJQXVCNUI7O09BRUc7SUFDSCxZQUErQixNQUF5QjtRQUN2RCxLQUFLLEVBQUUsQ0FBQTtRQUR1QixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQXZCeEQ7O1dBRUc7UUFDSyxXQUFNLEdBQUcsS0FBSyxDQUFBO1FBRUgsWUFBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQUssQ0FBQyxDQUFBO1FBQzVDLFdBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUM1QyxhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUyxDQUFDLENBQUE7UUFFaEU7O1dBRUc7UUFDYyxlQUFVLEdBQTBELElBQUksR0FBRyxFQUFFLENBQUE7UUFtQjlGOztXQUVHO1FBQ0ssWUFBTyxHQUFHLEtBQUssQ0FBQTtRQUV2Qjs7OztXQUlHO1FBQ0ssbUJBQWMsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFBO1FBZm5ELElBQUksQ0FBQyxlQUFl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