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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2NvZGVjcy9iYXNlRGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3JDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHckMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDaEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFPakU7Ozs7O0dBS0c7QUFDSCxNQUFNLE9BQWdCLFdBSXJCLFNBQVEsb0JBQW9CO0lBdUI1Qjs7T0FFRztJQUNILFlBQStCLE1BQXlCO1FBQ3ZELEtBQUssRUFBRSxDQUFBO1FBRHVCLFdBQU0sR0FBTixNQUFNLENBQW1CO1FBdkJ4RDs7V0FFRztRQUNLLFdBQU0sR0FBRyxLQUFLLENBQUE7UUFFSCxZQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBSyxDQUFDLENBQUE7UUFDNUMsV0FBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBQzVDLGFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFTLENBQUMsQ0FBQTtRQUVoRTs7V0FFRztRQUNjLGVBQVUsR0FBMEQsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQW1COUY7O1dBRUc7UUFDSyxZQUFPLEdBQUcsS0FBSyxDQUFBO1FBRXZCOzs7O1dBSUc7UUFDSyxtQkFBYyxHQUFHLElBQUksZUFBZSxFQUFRLENBQUE7UUFmbkQsSUFBSSxDQUFD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