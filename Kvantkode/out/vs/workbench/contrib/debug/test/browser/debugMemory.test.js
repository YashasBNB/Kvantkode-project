/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { decodeBase64, encodeBase64, VSBuffer } from '../../../../../base/common/buffer.js';
import { Emitter } from '../../../../../base/common/event.js';
import { mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MemoryRegion } from '../../common/debugModel.js';
suite('Debug - Memory', () => {
    const dapResponseCommon = {
        command: 'someCommand',
        type: 'response',
        seq: 1,
        request_seq: 1,
        success: true,
    };
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('MemoryRegion', () => {
        let memory;
        let unreadable;
        let invalidateMemoryEmitter;
        let session;
        let region;
        setup(() => {
            const memoryBuf = new Uint8Array(1024);
            for (let i = 0; i < memoryBuf.length; i++) {
                memoryBuf[i] = i; // will be 0-255
            }
            memory = VSBuffer.wrap(memoryBuf);
            invalidateMemoryEmitter = new Emitter();
            unreadable = 0;
            session = mockObject()({
                onDidInvalidateMemory: invalidateMemoryEmitter.event,
            });
            session.readMemory.callsFake((ref, fromOffset, count) => {
                const res = {
                    ...dapResponseCommon,
                    body: {
                        address: '0',
                        data: encodeBase64(memory.slice(fromOffset, fromOffset + Math.max(0, count - unreadable))),
                        unreadableBytes: unreadable,
                    },
                };
                unreadable = 0;
                return Promise.resolve(res);
            });
            session.writeMemory.callsFake((ref, fromOffset, data) => {
                const decoded = decodeBase64(data);
                for (let i = 0; i < decoded.byteLength; i++) {
                    memory.buffer[fromOffset + i] = decoded.buffer[i];
                }
                return {
                    ...dapResponseCommon,
                    body: {
                        bytesWritten: decoded.byteLength,
                        offset: fromOffset,
                    },
                };
            });
            region = new MemoryRegion('ref', session);
        });
        teardown(() => {
            region.dispose();
        });
        test('reads a simple range', async () => {
            assert.deepStrictEqual(await region.read(10, 14), [
                {
                    type: 0 /* MemoryRangeType.Valid */,
                    offset: 10,
                    length: 4,
                    data: VSBuffer.wrap(new Uint8Array([10, 11, 12, 13])),
                },
            ]);
        });
        test('reads a non-contiguous range', async () => {
            unreadable = 3;
            assert.deepStrictEqual(await region.read(10, 14), [
                {
                    type: 0 /* MemoryRangeType.Valid */,
                    offset: 10,
                    length: 1,
                    data: VSBuffer.wrap(new Uint8Array([10])),
                },
                { type: 1 /* MemoryRangeType.Unreadable */, offset: 11, length: 3 },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNZW1vcnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnTWVtb3J5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFjLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBR3pELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsTUFBTSxpQkFBaUIsR0FBRztRQUN6QixPQUFPLEVBQUUsYUFBYTtRQUN0QixJQUFJLEVBQUUsVUFBVTtRQUNoQixHQUFHLEVBQUUsQ0FBQztRQUNOLFdBQVcsRUFBRSxDQUFDO1FBQ2QsT0FBTyxFQUFFLElBQUk7S0FDYixDQUFBO0lBRUQsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUMxQixJQUFJLE1BQWdCLENBQUE7UUFDcEIsSUFBSSxVQUFrQixDQUFBO1FBQ3RCLElBQUksdUJBQTJELENBQUE7UUFDL0QsSUFBSSxPQUF5RCxDQUFBO1FBQzdELElBQUksTUFBb0IsQ0FBQTtRQUV4QixLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1YsTUFBTSxTQUFTLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFD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