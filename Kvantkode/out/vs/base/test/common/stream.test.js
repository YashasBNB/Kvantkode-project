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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vc3RyZWFtLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFDTixlQUFlLEVBQ2YsYUFBYSxFQUNiLFVBQVUsRUFDVix3QkFBd0IsRUFDeEIsZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixrQkFBa0IsRUFDbEIsWUFBWSxFQUNaLFVBQVUsRUFDVixnQkFBZ0IsRUFDaEIsY0FBYyxFQUdkLFVBQVUsRUFDVixRQUFRLEVBQ1IsU0FBUyxHQUNULE1BQU0sd0JBQXdCLENBQUE7QUFFL0IsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFF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QUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRTlCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRWxDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVwQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFZixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLEVBQUUsbURBQW1ELENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLEVBQUUsbURBQW1ELENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxXQUFXLEVBQUUsbURBQW1ELENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FB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