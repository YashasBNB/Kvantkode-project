/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from './errors.js';
import { DisposableStore, toDisposable } from './lifecycle.js';
export function isReadable(obj) {
    const candidate = obj;
    if (!candidate) {
        return false;
    }
    return typeof candidate.read === 'function';
}
export function isReadableStream(obj) {
    const candidate = obj;
    if (!candidate) {
        return false;
    }
    return [candidate.on, candidate.pause, candidate.resume, candidate.destroy].every((fn) => typeof fn === 'function');
}
export function isReadableBufferedStream(obj) {
    const candidate = obj;
    if (!candidate) {
        return false;
    }
    return (isReadableStream(candidate.stream) &&
        Array.isArray(candidate.buffer) &&
        typeof candidate.ended === 'boolean');
}
export function newWriteableStream(reducer, options) {
    return new WriteableStreamImpl(reducer, options);
}
class WriteableStreamImpl {
    /**
     * @param reducer a function that reduces the buffered data into a single object;
     * 				  because some objects can be complex and non-reducible, we also
     * 				  allow passing the explicit `null` value to skip the reduce step
     * @param options stream options
     */
    constructor(reducer, options) {
        this.reducer = reducer;
        this.options = options;
        this.state = {
            flowing: false,
            ended: false,
            destroyed: false,
        };
        this.buffer = {
            data: [],
            error: [],
        };
        this.listeners = {
            data: [],
            error: [],
            end: [],
        };
        this.pendingWritePromises = [];
    }
    pause() {
        if (this.state.destroyed) {
            return;
        }
        this.state.flowing = false;
    }
    resume() {
        if (this.state.destroyed) {
            return;
        }
        if (!this.state.flowing) {
            this.state.flowing = true;
            // emit buffered events
            this.flowData();
            this.flowErrors();
            this.flowEnd();
        }
    }
    write(data) {
        if (this.state.destroyed) {
            return;
        }
        // flowing: directly send the data to listeners
        if (this.state.flowing) {
            this.emitData(data);
        }
        // not yet flowing: buffer data until flowing
        else {
            this.buffer.data.push(data);
            // highWaterMark: if configured, signal back when buffer reached limits
            if (typeof this.options?.highWaterMark === 'number' &&
                this.buffer.data.length > this.options.highWaterMark) {
                return new Promise((resolve) => this.pendingWritePromises.push(resolve));
            }
        }
    }
    error(error) {
        if (this.state.destroyed) {
            return;
        }
        // flowing: directly send the error to listeners
        if (this.state.flowing) {
            this.emitError(error);
        }
        // not yet flowing: buffer errors until flowing
        else {
            this.buffer.error.push(error);
        }
    }
    end(result) {
        if (this.state.destroyed) {
            return;
        }
        // end with data if provided
        if (typeof result !== 'undefined') {
            this.write(result);
        }
        // flowing: send end event to listeners
        if (this.state.flowing) {
            this.emitEnd();
            this.destroy();
        }
        // not yet flowing: remember state
        else {
            this.state.ended = true;
        }
    }
    emitData(data) {
        this.listeners.data.slice(0).forEach((listener) => listener(data)); // slice to avoid listener mutation from delivering event
    }
    emitError(error) {
        if (this.listeners.error.length === 0) {
            onUnexpectedError(error); // nobody listened to this error so we log it as unexpected
        }
        else {
            this.listeners.error.slice(0).forEach((listener) => listener(error)); // slice to avoid listener mutation from delivering event
        }
    }
    emitEnd() {
        this.listeners.end.slice(0).forEach((listener) => listener()); // slice to avoid listener mutation from delivering event
    }
    on(event, callback) {
        if (this.state.destroyed) {
            return;
        }
        switch (event) {
            case 'data':
                this.listeners.data.push(callback);
                // switch into flowing mode as soon as the first 'data'
                // listener is added and we are not yet in flowing mode
                this.resume();
                break;
            case 'end':
                this.listeners.end.push(callback);
                // emit 'end' event directly if we are flowing
                // and the end has already been reached
                //
                // finish() when it went through
                if (this.state.flowing && this.flowEnd()) {
                    this.destroy();
                }
                break;
            case 'error':
                this.listeners.error.push(callback);
                // emit buffered 'error' events unless done already
                // now that we know that we have at least one listener
                if (this.state.flowing) {
                    this.flowErrors();
                }
                break;
        }
    }
    removeListener(event, callback) {
        if (this.state.destroyed) {
            return;
        }
        let listeners = undefined;
        switch (event) {
            case 'data':
                listeners = this.listeners.data;
                break;
            case 'end':
                listeners = this.listeners.end;
                break;
            case 'error':
                listeners = this.listeners.error;
                break;
        }
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }
    flowData() {
        // if buffer is empty, nothing to do
        if (this.buffer.data.length === 0) {
            return;
        }
        // if buffer data can be reduced into a single object,
        // emit the reduced data
        if (typeof this.reducer === 'function') {
            const fullDataBuffer = this.reducer(this.buffer.data);
            this.emitData(fullDataBuffer);
        }
        else {
            // otherwise emit each buffered data instance individually
            for (const data of this.buffer.data) {
                this.emitData(data);
            }
        }
        this.buffer.data.length = 0;
        // when the buffer is empty, resolve all pending writers
        const pendingWritePromises = [...this.pendingWritePromises];
        this.pendingWritePromises.length = 0;
        pendingWritePromises.forEach((pendingWritePromise) => pendingWritePromise());
    }
    flowErrors() {
        if (this.listeners.error.length > 0) {
            for (const error of this.buffer.error) {
                this.emitError(error);
            }
            this.buffer.error.length = 0;
        }
    }
    flowEnd() {
        if (this.state.ended) {
            this.emitEnd();
            return this.listeners.end.length > 0;
        }
        return false;
    }
    destroy() {
        if (!this.state.destroyed) {
            this.state.destroyed = true;
            this.state.ended = true;
            this.buffer.data.length = 0;
            this.buffer.error.length = 0;
            this.listeners.data.length = 0;
            this.listeners.error.length = 0;
            this.listeners.end.length = 0;
            this.pendingWritePromises.length = 0;
        }
    }
}
/**
 * Helper to fully read a T readable into a T.
 */
export function consumeReadable(readable, reducer) {
    const chunks = [];
    let chunk;
    while ((chunk = readable.read()) !== null) {
        chunks.push(chunk);
    }
    return reducer(chunks);
}
/**
 * Helper to read a T readable up to a maximum of chunks. If the limit is
 * reached, will return a readable instead to ensure all data can still
 * be read.
 */
export function peekReadable(readable, reducer, maxChunks) {
    const chunks = [];
    let chunk = undefined;
    while ((chunk = readable.read()) !== null && chunks.length < maxChunks) {
        chunks.push(chunk);
    }
    // If the last chunk is null, it means we reached the end of
    // the readable and return all the data at once
    if (chunk === null && chunks.length > 0) {
        return reducer(chunks);
    }
    // Otherwise, we still have a chunk, it means we reached the maxChunks
    // value and as such we return a new Readable that first returns
    // the existing read chunks and then continues with reading from
    // the underlying readable.
    return {
        read: () => {
            // First consume chunks from our array
            if (chunks.length > 0) {
                return chunks.shift();
            }
            // Then ensure to return our last read chunk
            if (typeof chunk !== 'undefined') {
                const lastReadChunk = chunk;
                // explicitly use undefined here to indicate that we consumed
                // the chunk, which could have either been null or valued.
                chunk = undefined;
                return lastReadChunk;
            }
            // Finally delegate back to the Readable
            return readable.read();
        },
    };
}
export function consumeStream(stream, reducer) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        listenStream(stream, {
            onData: (chunk) => {
                if (reducer) {
                    chunks.push(chunk);
                }
            },
            onError: (error) => {
                if (reducer) {
                    reject(error);
                }
                else {
                    resolve(undefined);
                }
            },
            onEnd: () => {
                if (reducer) {
                    resolve(reducer(chunks));
                }
                else {
                    resolve(undefined);
                }
            },
        });
    });
}
/**
 * Helper to listen to all events of a T stream in proper order.
 */
export function listenStream(stream, listener, token) {
    stream.on('error', (error) => {
        if (!token?.isCancellationRequested) {
            listener.onError(error);
        }
    });
    stream.on('end', () => {
        if (!token?.isCancellationRequested) {
            listener.onEnd();
        }
    });
    // Adding the `data` listener will turn the stream
    // into flowing mode. As such it is important to
    // add this listener last (DO NOT CHANGE!)
    stream.on('data', (data) => {
        if (!token?.isCancellationRequested) {
            listener.onData(data);
        }
    });
}
/**
 * Helper to peek up to `maxChunks` into a stream. The return type signals if
 * the stream has ended or not. If not, caller needs to add a `data` listener
 * to continue reading.
 */
export function peekStream(stream, maxChunks) {
    return new Promise((resolve, reject) => {
        const streamListeners = new DisposableStore();
        const buffer = [];
        // Data Listener
        const dataListener = (chunk) => {
            // Add to buffer
            buffer.push(chunk);
            // We reached maxChunks and thus need to return
            if (buffer.length > maxChunks) {
                // Dispose any listeners and ensure to pause the
                // stream so that it can be consumed again by caller
                streamListeners.dispose();
                stream.pause();
                return resolve({ stream, buffer, ended: false });
            }
        };
        // Error Listener
        const errorListener = (error) => {
            streamListeners.dispose();
            return reject(error);
        };
        // End Listener
        const endListener = () => {
            streamListeners.dispose();
            return resolve({ stream, buffer, ended: true });
        };
        streamListeners.add(toDisposable(() => stream.removeListener('error', errorListener)));
        stream.on('error', errorListener);
        streamListeners.add(toDisposable(() => stream.removeListener('end', endListener)));
        stream.on('end', endListener);
        // Important: leave the `data` listener last because
        // this can turn the stream into flowing mode and we
        // want `error` events to be received as well.
        streamListeners.add(toDisposable(() => stream.removeListener('data', dataListener)));
        stream.on('data', dataListener);
    });
}
/**
 * Helper to create a readable stream from an existing T.
 */
export function toStream(t, reducer) {
    const stream = newWriteableStream(reducer);
    stream.end(t);
    return stream;
}
/**
 * Helper to create an empty stream
 */
export function emptyStream() {
    const stream = newWriteableStream(() => {
        throw new Error('not supported');
    });
    stream.end();
    return stream;
}
/**
 * Helper to convert a T into a Readable<T>.
 */
export function toReadable(t) {
    let consumed = false;
    return {
        read: () => {
            if (consumed) {
                return null;
            }
            consumed = true;
            return t;
        },
    };
}
/**
 * Helper to transform a readable stream into another stream.
 */
export function transform(stream, transformer, reducer) {
    const target = newWriteableStream(reducer);
    listenStream(stream, {
        onData: (data) => target.write(transformer.data(data)),
        onError: (error) => target.error(transformer.error ? transformer.error(error) : error),
        onEnd: () => target.end(),
    });
    return target;
}
/**
 * Helper to take an existing readable that will
 * have a prefix injected to the beginning.
 */
export function prefixedReadable(prefix, readable, reducer) {
    let prefixHandled = false;
    return {
        read: () => {
            const chunk = readable.read();
            // Handle prefix only once
            if (!prefixHandled) {
                prefixHandled = true;
                // If we have also a read-result, make
                // sure to reduce it to a single result
                if (chunk !== null) {
                    return reducer([prefix, chunk]);
                }
                // Otherwise, just return prefix directly
                return prefix;
            }
            return chunk;
        },
    };
}
/**
 * Helper to take an existing stream that will
 * have a prefix injected to the beginning.
 */
export function prefixedStream(prefix, stream, reducer) {
    let prefixHandled = false;
    const target = newWriteableStream(reducer);
    listenStream(stream, {
        onData: (data) => {
            // Handle prefix only once
            if (!prefixHandled) {
                prefixHandled = true;
                return target.write(reducer([prefix, data]));
            }
            return target.write(data);
        },
        onError: (error) => target.error(error),
        onEnd: () => {
            // Handle prefix only once
            if (!prefixHandled) {
                prefixHandled = true;
                target.write(prefix);
            }
            target.end();
        },
    });
    return target;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vc3RyZWFtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBd0U5RCxNQUFNLFVBQVUsVUFBVSxDQUFJLEdBQVk7SUFDekMsTUFBTSxTQUFTLEdBQUcsR0FBOEIsQ0FBQTtJQUNoRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxPQUFPLFNBQVMsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFBO0FBQzVDLENBQUM7QUE4REQsTUFBTSxVQUFVLGdCQUFnQixDQUFJLEdBQVk7SUFDL0MsTUFBTSxTQUFTLEdBQUcsR0FBb0MsQ0FBQTtJQUN0RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQ2hGLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxVQUFVLENBQ2hDLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLHdCQUF3QixDQUFJLEdBQVk7SUFDdkQsTUFBTSxTQUFTLEdBQUcsR0FBNEMsQ0FBQTtJQUM5RCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxDQUNOLGdCQUFnQixD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