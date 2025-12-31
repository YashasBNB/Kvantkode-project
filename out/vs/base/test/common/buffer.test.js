/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../common/async.js';
import { bufferedStreamToBuffer, bufferToReadable, bufferToStream, decodeBase64, encodeBase64, newWriteableBufferStream, readableToBuffer, streamToBuffer, VSBuffer, } from '../../common/buffer.js';
import { peekStream } from '../../common/stream.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('Buffer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #71993 - VSBuffer#toString returns numbers', () => {
        const data = new Uint8Array([1, 2, 3, 'h'.charCodeAt(0), 'i'.charCodeAt(0), 4, 5]).buffer;
        const buffer = VSBuffer.wrap(new Uint8Array(data, 3, 2));
        assert.deepStrictEqual(buffer.toString(), 'hi');
    });
    test('bufferToReadable / readableToBuffer', () => {
        const content = 'Hello World';
        const readable = bufferToReadable(VSBuffer.fromString(content));
        assert.strictEqual(readableToBuffer(readable).toString(), content);
    });
    test('bufferToStream / streamToBuffer', async () => {
        const content = 'Hello World';
        const stream = bufferToStream(VSBuffer.fromString(content));
        assert.strictEqual((await streamToBuffer(stream)).toString(), content);
    });
    test('bufferedStreamToBuffer', async () => {
        const content = 'Hello World';
        const stream = await peekStream(bufferToStream(VSBuffer.fromString(content)), 1);
        assert.strictEqual((await bufferedStreamToBuffer(stream)).toString(), content);
    });
    test('bufferWriteableStream - basics (no error)', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        assert.strictEqual(chunks.length, 2);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(chunks[1].toString(), 'World');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 0);
    });
    test('bufferWriteableStream - basics (error)', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.error(new Error());
        stream.end();
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 1);
    });
    test('bufferWriteableStream - buffers data when no listener', async () => {
        const stream = newWriteableBufferStream();
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'HelloWorld');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 0);
    });
    test('bufferWriteableStream - buffers errors when no listener', async () => {
        const stream = newWriteableBufferStream();
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.error(new Error());
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        stream.end();
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 1);
    });
    test('bufferWriteableStream - buffers end when no listener', async () => {
        const stream = newWriteableBufferStream();
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'HelloWorld');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 0);
    });
    test('bufferWriteableStream - nothing happens after end()', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        let dataCalledAfterEnd = false;
        stream.on('data', (data) => {
            dataCalledAfterEnd = true;
        });
        let errorCalledAfterEnd = false;
        stream.on('error', (error) => {
            errorCalledAfterEnd = true;
        });
        let endCalledAfterEnd = false;
        stream.on('end', () => {
            endCalledAfterEnd = true;
        });
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.error(new Error());
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        assert.strictEqual(dataCalledAfterEnd, false);
        assert.strictEqual(errorCalledAfterEnd, false);
        assert.strictEqual(endCalledAfterEnd, false);
        assert.strictEqual(chunks.length, 2);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(chunks[1].toString(), 'World');
    });
    test('bufferWriteableStream - pause/resume (simple)', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        stream.pause();
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        assert.strictEqual(chunks.length, 0);
        assert.strictEqual(errors.length, 0);
        assert.strictEqual(ended, false);
        stream.resume();
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'HelloWorld');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 0);
    });
    test('bufferWriteableStream - pause/resume (pause after first write)', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        stream.pause();
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(errors.length, 0);
        assert.strictEqual(ended, false);
        stream.resume();
        assert.strictEqual(chunks.length, 2);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(chunks[1].toString(), 'World');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 0);
    });
    test('bufferWriteableStream - pause/resume (error)', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        stream.pause();
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.error(new Error());
        stream.end();
        assert.strictEqual(chunks.length, 0);
        assert.strictEqual(ended, false);
        assert.strictEqual(errors.length, 0);
        stream.resume();
        assert.strictEqual(chunks.length, 1);
        assert.strictEqual(chunks[0].toString(), 'Hello');
        assert.strictEqual(ended, true);
        assert.strictEqual(errors.length, 1);
    });
    test('bufferWriteableStream - destroy', async () => {
        const stream = newWriteableBufferStream();
        const chunks = [];
        stream.on('data', (data) => {
            chunks.push(data);
        });
        let ended = false;
        stream.on('end', () => {
            ended = true;
        });
        const errors = [];
        stream.on('error', (error) => {
            errors.push(error);
        });
        stream.destroy();
        await timeout(0);
        stream.write(VSBuffer.fromString('Hello'));
        await timeout(0);
        stream.end(VSBuffer.fromString('World'));
        assert.strictEqual(chunks.length, 0);
        assert.strictEqual(ended, false);
        assert.strictEqual(errors.length, 0);
    });
    test('Performance issue with VSBuffer#slice #76076', function () {
        // TODO@alexdima this test seems to fail in web (https://github.com/microsoft/vscode/issues/114042)
        // Buffer#slice creates a view
        if (typeof Buffer !== 'undefined') {
            const buff = Buffer.from([10, 20, 30, 40]);
            const b2 = buff.slice(1, 3);
            assert.strictEqual(buff[1], 20);
            assert.strictEqual(b2[0], 20);
            buff[1] = 17; // modify buff AND b2
            assert.strictEqual(buff[1], 17);
            assert.strictEqual(b2[0], 17);
        }
        // TypedArray#slice creates a copy
        {
            const unit = new Uint8Array([10, 20, 30, 40]);
            const u2 = unit.slice(1, 3);
            assert.strictEqual(unit[1], 20);
            assert.strictEqual(u2[0], 20);
            unit[1] = 17; // modify unit, NOT b2
            assert.strictEqual(unit[1], 17);
            assert.strictEqual(u2[0], 20);
        }
        // TypedArray#subarray creates a view
        {
            const unit = new Uint8Array([10, 20, 30, 40]);
            const u2 = unit.subarray(1, 3);
            assert.strictEqual(unit[1], 20);
            assert.strictEqual(u2[0], 20);
            unit[1] = 17; // modify unit AND b2
            assert.strictEqual(unit[1], 17);
            assert.strictEqual(u2[0], 17);
        }
    });
    test('indexOf', () => {
        const haystack = VSBuffer.fromString('abcaabbccaaabbbccc');
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('')), 0);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('a'.repeat(100))), -1);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('a')), 0);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('c')), 2);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('abcaa')), 0);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('caaab')), 8);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('ccc')), 15);
        assert.strictEqual(haystack.indexOf(VSBuffer.fromString('cccb')), -1);
    });
    test('wrap', () => {
        const actual = new Uint8Array([1, 2, 3]);
        const wrapped = VSBuffer.wrap(actual);
        assert.strictEqual(wrapped.byteLength, 3);
        assert.deepStrictEqual(Array.from(wrapped.buffer), [1, 2, 3]);
    });
    test('fromString', () => {
        const value = 'Hello World';
        const buff = VSBuffer.fromString(value);
        assert.strictEqual(buff.toString(), value);
    });
    test('fromByteArray', () => {
        const array = [1, 2, 3, 4, 5];
        const buff = VSBuffer.fromByteArray(array);
        assert.strictEqual(buff.byteLength, array.length);
        assert.deepStrictEqual(Array.from(buff.buffer), array);
    });
    test('concat', () => {
        const chunks = [
            VSBuffer.fromString('abc'),
            VSBuffer.fromString('def'),
            VSBuffer.fromString('ghi'),
        ];
        // Test without total length
        const result1 = VSBuffer.concat(chunks);
        assert.strictEqual(result1.toString(), 'abcdefghi');
        // Test with total length
        const result2 = VSBuffer.concat(chunks, 9);
        assert.strictEqual(result2.toString(), 'abcdefghi');
    });
    test('clone', () => {
        const original = VSBuffer.fromString('test');
        const clone = original.clone();
        assert.notStrictEqual(original.buffer, clone.buffer);
        assert.deepStrictEqual(Array.from(original.buffer), Array.from(clone.buffer));
    });
    test('slice', () => {
        const buff = VSBuffer.fromString('Hello World');
        const slice1 = buff.slice(0, 5);
        assert.strictEqual(slice1.toString(), 'Hello');
        const slice2 = buff.slice(6);
        assert.strictEqual(slice2.toString(), 'World');
    });
    test('set', () => {
        const buff = VSBuffer.alloc(5);
        // Test setting from VSBuffer
        buff.set(VSBuffer.fromString('ab'), 0);
        assert.strictEqual(buff.toString().substring(0, 2), 'ab');
        // Test setting from Uint8Array
        buff.set(new Uint8Array([99, 100]), 2); // 'cd'
        assert.strictEqual(buff.toString().substring(2, 4), 'cd');
        // Test invalid input
        assert.throws(() => {
            buff.set({});
        });
    });
    test('equals', () => {
        const buff1 = VSBuffer.fromString('test');
        const buff2 = VSBuffer.fromString('test');
        const buff3 = VSBuffer.fromString('different');
        const buff4 = VSBuffer.fromString('tes1');
        assert.strictEqual(buff1.equals(buff1), true);
        assert.strictEqual(buff1.equals(buff2), true);
        assert.strictEqual(buff1.equals(buff3), false);
        assert.strictEqual(buff1.equals(buff4), false);
    });
    test('read/write methods', () => {
        const buff = VSBuffer.alloc(8);
        // Test UInt32BE
        buff.writeUInt32BE(0x12345678, 0);
        assert.strictEqual(buff.readUInt32BE(0), 0x12345678);
        // Test UInt32LE
        buff.writeUInt32LE(0x12345678, 4);
        assert.strictEqual(buff.readUInt32LE(4), 0x12345678);
        // Test UInt8
        const buff2 = VSBuffer.alloc(1);
        buff2.writeUInt8(123, 0);
        assert.strictEqual(buff2.readUInt8(0), 123);
    });
    suite('base64', () => {
        /*
        Generated with:

        const crypto = require('crypto');

        for (let i = 0; i < 16; i++) {
            const buf =  crypto.randomBytes(i);
            console.log(`[new Uint8Array([${Array.from(buf).join(', ')}]), '${buf.toString('base64')}'],`)
        }

        */
        const testCases = [
            [new Uint8Array([]), ''],
            [new Uint8Array([56]), 'OA=='],
            [new Uint8Array([209, 4]), '0QQ='],
            [new Uint8Array([19, 57, 119]), 'Ezl3'],
            [new Uint8Array([199, 237, 207, 112]), 'x+3PcA=='],
            [new Uint8Array([59, 193, 173, 26, 242]), 'O8GtGvI='],
            [new Uint8Array([81, 226, 95, 231, 116, 126]), 'UeJf53R+'],
            [new Uint8Array([11, 164, 253, 85, 8, 6, 56]), 'C6T9VQgGOA=='],
            [new Uint8Array([164, 16, 88, 88, 224, 173, 144, 114]), 'pBBYWOCtkHI='],
            [new Uint8Array([0, 196, 99, 12, 21, 229, 78, 101, 13]), 'AMRjDBXlTmUN'],
            [new Uint8Array([167, 114, 225, 116, 226, 83, 51, 48, 88, 114]), 'p3LhdOJTMzBYcg=='],
            [new Uint8Array([75, 33, 118, 10, 77, 5, 168, 194, 59, 47, 59]), 'SyF2Ck0FqMI7Lzs='],
            [
                new Uint8Array([203, 182, 165, 51, 208, 27, 123, 223, 112, 198, 127, 147]),
                'y7alM9Abe99wxn+T',
            ],
            [
                new Uint8Array([154, 93, 222, 41, 117, 234, 250, 85, 95, 144, 16, 94, 18]),
                'ml3eKXXq+lVfkBBeEg==',
            ],
            [
                new Uint8Array([246, 186, 88, 105, 192, 57, 25, 168, 183, 164, 103, 162, 243, 56]),
                '9rpYacA5Gai3pGei8zg=',
            ],
            [
                new Uint8Array([149, 240, 155, 96, 30, 55, 162, 172, 191, 187, 33, 124, 169, 183, 254]),
                'lfCbYB43oqy/uyF8qbf+',
            ],
        ];
        test('encodes', () => {
            for (const [bytes, expected] of testCases) {
                assert.strictEqual(encodeBase64(VSBuffer.wrap(bytes)), expected);
            }
        });
        test('decodes', () => {
            for (const [expected, encoded] of testCases) {
                assert.deepStrictEqual(new Uint8Array(decodeBase64(encoded).buffer), expected);
            }
        });
        test('throws error on invalid encoding', () => {
            assert.throws(() => decodeBase64('invalid!'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2J1ZmZlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDL0MsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLFlBQVksRUFDWixZQUFZLEVBQ1osd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixjQUFjLEVBQ2QsUUFBUSxHQUNSLE1BQU0sd0JBQXdCLENBQUE7QUFDL0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ25ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUNwQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDN0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQ3pGLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxF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QUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxDQUFDO1lBQ0EsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBRTdCLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUEsQ0FBQyxzQkFBc0I7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELHFDQUFxQztRQUNyQyxDQUFDO1lBQ0EsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzdDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lB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R0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUEsQ0FBQyxPQUFPO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFekQscUJBQXFCO1FBQ3JCLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBUyxDQUFDLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1FBQ25CLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekMsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN6QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQy9DLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlCLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFcEQsZ0JBQWdCO1FBQ2hCLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUVwRCxhQUFhO1FBQ2IsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvQixLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNwQjs7Ozs7Ozs7OztVQVVFO1FBRUYsTUFBTSxTQUFTLEdBQTJCO1lBQ3pDLENBQUMsSUFBSSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztZQUM5QixDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO1lBQ2xDLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO1lBQ3ZDLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQztZQUNsRCxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDO1lBQ3JELENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDO1lBQzFELENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQztZQUM5RCxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDO1lBQ3ZFLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDO1lBQ3hFLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixDQUFDO1lBQ3BGLENBQUMsSUFBSSxVQUFVLENB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