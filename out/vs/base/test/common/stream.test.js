/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { bufferToReadable, VSBuffer } from '../../common/buffer.js';
import { CancellationTokenSource } from '../../common/cancellation.js';
import { consumeReadable, consumeStream, isReadable, isReadableBufferedStream, isReadableStream, listenStream, newWriteableStream, peekReadable, peekStream, prefixedReadable, prefixedStream, toReadable, toStream, transform, } from '../../common/stream.js';
suite('Stream', () => {
    test('isReadable', () => {
        assert.ok(!isReadable(undefined));
        assert.ok(!isReadable(Object.create(null)));
        assert.ok(isReadable(bufferToReadable(VSBuffer.fromString(''))));
    });
    test('isReadableStream', () => {
        assert.ok(!isReadableStream(undefined));
        assert.ok(!isReadableStream(Object.create(null)));
        assert.ok(isReadableStream(newWriteableStream((d) => d)));
    });
    test('isReadableBufferedStream', async () => {
        assert.ok(!isReadableBufferedStream(Object.create(null)));
        const stream = newWriteableStream((d) => d);
        stream.end();
        const bufferedStream = await peekStream(stream, 1);
        assert.ok(isReadableBufferedStream(bufferedStream));
    });
    test('WriteableStream - basics', () => {
        const stream = newWriteableStream((strings) => strings.join());
        let error = false;
        stream.on('error', (e) => {
            error = true;
        });
        let end = false;
        stream.on('end', () => {
            end = true;
        });
        stream.write('Hello');
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        assert.strictEqual(chunks[0], 'Hello');
        stream.write('World');
        assert.strictEqual(chunks[1], 'World');
        assert.strictEqual(error, false);
        assert.strictEqual(end, false);
        stream.pause();
        stream.write('1');
        stream.write('2');
        stream.write('3');
        assert.strictEqual(chunks.length, 2);
        stream.resume();
        assert.strictEqual(chunks.length, 3);
        assert.strictEqual(chunks[2], '1,2,3');
        stream.error(new Error());
        assert.strictEqual(error, true);
        error = false;
        stream.error(new Error());
        assert.strictEqual(error, true);
        stream.end('Final Bit');
        assert.strictEqual(chunks.length, 4);
        assert.strictEqual(chunks[3], 'Final Bit');
        assert.strictEqual(end, true);
        stream.destroy();
        stream.write('Unexpected');
        assert.strictEqual(chunks.length, 4);
    });
    test('stream with non-reducible messages', () => {
        /**
         * A complex object that cannot be reduced to a single object.
         */
        class TestMessage {
            constructor(value) {
                this.value = value;
            }
        }
        const stream = newWriteableStream(null);
        let error = false;
        stream.on('error', (e) => {
            error = true;
        });
        let end = false;
        stream.on('end', () => {
            end = true;
        });
        stream.write(new TestMessage('Hello'));
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        assert(chunks[0] instanceof TestMessage, 'Message `0` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[0].value, 'Hello');
        stream.write(new TestMessage('World'));
        assert(chunks[1] instanceof TestMessage, 'Message `1` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[1].value, 'World');
        assert.strictEqual(error, false);
        assert.strictEqual(end, false);
        stream.pause();
        stream.write(new TestMessage('1'));
        stream.write(new TestMessage('2'));
        stream.write(new TestMessage('3'));
        assert.strictEqual(chunks.length, 2);
        stream.resume();
        assert.strictEqual(chunks.length, 5);
        assert(chunks[2] instanceof TestMessage, 'Message `2` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[2].value, '1');
        assert(chunks[3] instanceof TestMessage, 'Message `3` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[3].value, '2');
        assert(chunks[4] instanceof TestMessage, 'Message `4` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[4].value, '3');
        stream.error(new Error());
        assert.strictEqual(error, true);
        error = false;
        stream.error(new Error());
        assert.strictEqual(error, true);
        stream.end(new TestMessage('Final Bit'));
        assert.strictEqual(chunks.length, 6);
        assert(chunks[5] instanceof TestMessage, 'Message `5` must be an instance of `TestMessage`.');
        assert.strictEqual(chunks[5].value, 'Final Bit');
        assert.strictEqual(end, true);
        stream.destroy();
        stream.write(new TestMessage('Unexpected'));
        assert.strictEqual(chunks.length, 6);
    });
    test('WriteableStream - end with empty string works', async () => {
        const reducer = (strings) => (strings.length > 0 ? strings.join() : 'error');
        const stream = newWriteableStream(reducer);
        stream.end('');
        const result = await consumeStream(stream, reducer);
        assert.strictEqual(result, '');
    });
    test('WriteableStream - end with error works', async () => {
        const reducer = (errors) => errors[0];
        const stream = newWriteableStream(reducer);
        stream.end(new Error('error'));
        const result = await consumeStream(stream, reducer);
        assert.ok(result instanceof Error);
    });
    test('WriteableStream - removeListener', () => {
        const stream = newWriteableStream((strings) => strings.join());
        let error = false;
        const errorListener = (e) => {
            error = true;
        };
        stream.on('error', errorListener);
        let data = false;
        const dataListener = () => {
            data = true;
        };
        stream.on('data', dataListener);
        stream.write('Hello');
        assert.strictEqual(data, true);
        data = false;
        stream.removeListener('data', dataListener);
        stream.write('World');
        assert.strictEqual(data, false);
        stream.error(new Error());
        assert.strictEqual(error, true);
        error = false;
        stream.removeListener('error', errorListener);
        // always leave at least one error listener to streams to avoid unexpected errors during test running
        stream.on('error', () => { });
        stream.error(new Error());
        assert.strictEqual(error, false);
    });
    test('WriteableStream - highWaterMark', async () => {
        const stream = newWriteableStream((strings) => strings.join(), { highWaterMark: 3 });
        let res = stream.write('1');
        assert.ok(!res);
        res = stream.write('2');
        assert.ok(!res);
        res = stream.write('3');
        assert.ok(!res);
        const promise1 = stream.write('4');
        assert.ok(promise1 instanceof Promise);
        const promise2 = stream.write('5');
        assert.ok(promise2 instanceof Promise);
        let drained1 = false;
        (async () => {
            await promise1;
            drained1 = true;
        })();
        let drained2 = false;
        (async () => {
            await promise2;
            drained2 = true;
        })();
        let data = undefined;
        stream.on('data', (chunk) => {
            data = chunk;
        });
        assert.ok(data);
        await timeout(0);
        assert.strictEqual(drained1, true);
        assert.strictEqual(drained2, true);
    });
    test('consumeReadable', () => {
        const readable = arrayToReadable(['1', '2', '3', '4', '5']);
        const consumed = consumeReadable(readable, (strings) => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('peekReadable', () => {
        for (let i = 0; i < 5; i++) {
            const readable = arrayToReadable(['1', '2', '3', '4', '5']);
            const consumedOrReadable = peekReadable(readable, (strings) => strings.join(), i);
            if (typeof consumedOrReadable === 'string') {
                assert.fail('Unexpected result');
            }
            else {
                const consumed = consumeReadable(consumedOrReadable, (strings) => strings.join());
                assert.strictEqual(consumed, '1,2,3,4,5');
            }
        }
        let readable = arrayToReadable(['1', '2', '3', '4', '5']);
        let consumedOrReadable = peekReadable(readable, (strings) => strings.join(), 5);
        assert.strictEqual(consumedOrReadable, '1,2,3,4,5');
        readable = arrayToReadable(['1', '2', '3', '4', '5']);
        consumedOrReadable = peekReadable(readable, (strings) => strings.join(), 6);
        assert.strictEqual(consumedOrReadable, '1,2,3,4,5');
    });
    test('peekReadable - error handling', async () => {
        // 0 Chunks
        let stream = newWriteableStream((data) => data);
        let error = undefined;
        let promise = (async () => {
            try {
                await peekStream(stream, 1);
            }
            catch (err) {
                error = err;
            }
        })();
        stream.error(new Error());
        await promise;
        assert.ok(error);
        // 1 Chunk
        stream = newWriteableStream((data) => data);
        error = undefined;
        promise = (async () => {
            try {
                await peekStream(stream, 1);
            }
            catch (err) {
                error = err;
            }
        })();
        stream.write('foo');
        stream.error(new Error());
        await promise;
        assert.ok(error);
        // 2 Chunks
        stream = newWriteableStream((data) => data);
        error = undefined;
        promise = (async () => {
            try {
                await peekStream(stream, 1);
            }
            catch (err) {
                error = err;
            }
        })();
        stream.write('foo');
        stream.write('bar');
        stream.error(new Error());
        await promise;
        assert.ok(!error);
        stream.on('error', (err) => (error = err));
        stream.on('data', (chunk) => { });
        assert.ok(error);
    });
    function arrayToReadable(array) {
        return {
            read: () => array.shift() || null,
        };
    }
    function readableToStream(readable) {
        const stream = newWriteableStream((strings) => strings.join());
        // Simulate async behavior
        setTimeout(() => {
            let chunk = null;
            while ((chunk = readable.read()) !== null) {
                stream.write(chunk);
            }
            stream.end();
        }, 0);
        return stream;
    }
    test('consumeStream', async () => {
        const stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        const consumed = await consumeStream(stream, (strings) => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('consumeStream - without reducer', async () => {
        const stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        const consumed = await consumeStream(stream);
        assert.strictEqual(consumed, undefined);
    });
    test('consumeStream - without reducer and error', async () => {
        const stream = newWriteableStream((strings) => strings.join());
        stream.error(new Error());
        const consumed = await consumeStream(stream);
        assert.strictEqual(consumed, undefined);
    });
    test('listenStream', () => {
        const stream = newWriteableStream((strings) => strings.join());
        let error = false;
        let end = false;
        let data = '';
        listenStream(stream, {
            onData: (d) => {
                data = d;
            },
            onError: (e) => {
                error = true;
            },
            onEnd: () => {
                end = true;
            },
        });
        stream.write('Hello');
        assert.strictEqual(data, 'Hello');
        stream.write('World');
        assert.strictEqual(data, 'World');
        assert.strictEqual(error, false);
        assert.strictEqual(end, false);
        stream.error(new Error());
        assert.strictEqual(error, true);
        stream.end('Final Bit');
        assert.strictEqual(end, true);
    });
    test('listenStream - cancellation', () => {
        const stream = newWriteableStream((strings) => strings.join());
        let error = false;
        let end = false;
        let data = '';
        const cts = new CancellationTokenSource();
        listenStream(stream, {
            onData: (d) => {
                data = d;
            },
            onError: (e) => {
                error = true;
            },
            onEnd: () => {
                end = true;
            },
        }, cts.token);
        cts.cancel();
        stream.write('Hello');
        assert.strictEqual(data, '');
        stream.write('World');
        assert.strictEqual(data, '');
        stream.error(new Error());
        assert.strictEqual(error, false);
        stream.end('Final Bit');
        assert.strictEqual(end, false);
    });
    test('peekStream', async () => {
        for (let i = 0; i < 5; i++) {
            const stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
            const result = await peekStream(stream, i);
            assert.strictEqual(stream, result.stream);
            if (result.ended) {
                assert.fail('Unexpected result, stream should not have ended yet');
            }
            else {
                assert.strictEqual(result.buffer.length, i + 1, `maxChunks: ${i}`);
                const additionalResult = [];
                await consumeStream(stream, (strings) => {
                    additionalResult.push(...strings);
                    return strings.join();
                });
                assert.strictEqual([...result.buffer, ...additionalResult].join(), '1,2,3,4,5');
            }
        }
        let stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        let result = await peekStream(stream, 5);
        assert.strictEqual(stream, result.stream);
        assert.strictEqual(result.buffer.join(), '1,2,3,4,5');
        assert.strictEqual(result.ended, true);
        stream = readableToStream(arrayToReadable(['1', '2', '3', '4', '5']));
        result = await peekStream(stream, 6);
        assert.strictEqual(stream, result.stream);
        assert.strictEqual(result.buffer.join(), '1,2,3,4,5');
        assert.strictEqual(result.ended, true);
    });
    test('toStream', async () => {
        const stream = toStream('1,2,3,4,5', (strings) => strings.join());
        const consumed = await consumeStream(stream, (strings) => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('toReadable', async () => {
        const readable = toReadable('1,2,3,4,5');
        const consumed = consumeReadable(readable, (strings) => strings.join());
        assert.strictEqual(consumed, '1,2,3,4,5');
    });
    test('transform', async () => {
        const source = newWriteableStream((strings) => strings.join());
        const result = transform(source, { data: (string) => string + string }, (strings) => strings.join());
        // Simulate async behavior
        setTimeout(() => {
            source.write('1');
            source.write('2');
            source.write('3');
            source.write('4');
            source.end('5');
        }, 0);
        const consumed = await consumeStream(result, (strings) => strings.join());
        assert.strictEqual(consumed, '11,22,33,44,55');
    });
    test('events are delivered even if a listener is removed during delivery', () => {
        const stream = newWriteableStream((strings) => strings.join());
        let listener1Called = false;
        let listener2Called = false;
        const listener1 = () => {
            stream.removeListener('end', listener1);
            listener1Called = true;
        };
        const listener2 = () => {
            listener2Called = true;
        };
        stream.on('end', listener1);
        stream.on('end', listener2);
        stream.on('data', () => { });
        stream.end('');
        assert.strictEqual(listener1Called, true);
        assert.strictEqual(listener2Called, true);
    });
    test('prefixedReadable', () => {
        // Basic
        let readable = prefixedReadable('1,2', arrayToReadable(['3', '4', '5']), (val) => val.join(','));
        assert.strictEqual(consumeReadable(readable, (val) => val.join(',')), '1,2,3,4,5');
        // Empty
        readable = prefixedReadable('empty', arrayToReadable([]), (val) => val.join(','));
        assert.strictEqual(consumeReadable(readable, (val) => val.join(',')), 'empty');
    });
    test('prefixedStream', async () => {
        // Basic
        let stream = newWriteableStream((strings) => strings.join());
        stream.write('3');
        stream.write('4');
        stream.write('5');
        stream.end();
        let prefixStream = prefixedStream('1,2', stream, (val) => val.join(','));
        assert.strictEqual(await consumeStream(prefixStream, (val) => val.join(',')), '1,2,3,4,5');
        // Empty
        stream = newWriteableStream((strings) => strings.join());
        stream.end();
        prefixStream = prefixedStream('1,2', stream, (val) => val.join(','));
        assert.strictEqual(await consumeStream(prefixStream, (val) => val.join(',')), '1,2');
        // Error
        stream = newWriteableStream((strings) => strings.join());
        stream.error(new Error('fail'));
        prefixStream = prefixedStream('error', stream, (val) => val.join(','));
        let error;
        try {
            await consumeStream(prefixStream, (val) => val.join(','));
        }
        catch (e) {
            error = e;
        }
        assert.ok(error);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL3N0cmVhbS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0MsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sZUFBZSxFQUNmLGFBQWEsRUFDYixVQUFVLEVBQ1Ysd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLFlBQVksRUFDWixVQUFVLEVBQ1YsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFHZCxVQUFVLEVBQ1YsUUFBUSxFQUNSLFNBQVMsR0FDVCxNQUFNLHdCQUF3QixDQUFBO0FBRS9CLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO0lBQ3BCLElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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