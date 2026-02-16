/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { encodeSemanticTokensDto, decodeSemanticTokensDto, } from '../../../common/services/semanticTokensDto.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('SemanticTokensDto', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function toArr(arr) {
        const result = [];
        for (let i = 0, len = arr.length; i < len; i++) {
            result[i] = arr[i];
        }
        return result;
    }
    function assertEqualFull(actual, expected) {
        const convert = (dto) => {
            return {
                id: dto.id,
                type: dto.type,
                data: toArr(dto.data),
            };
        };
        assert.deepStrictEqual(convert(actual), convert(expected));
    }
    function assertEqualDelta(actual, expected) {
        const convertOne = (delta) => {
            if (!delta.data) {
                return delta;
            }
            return {
                start: delta.start,
                deleteCount: delta.deleteCount,
                data: toArr(delta.data),
            };
        };
        const convert = (dto) => {
            return {
                id: dto.id,
                type: dto.type,
                deltas: dto.deltas.map(convertOne),
            };
        };
        assert.deepStrictEqual(convert(actual), convert(expected));
    }
    function testRoundTrip(value) {
        const decoded = decodeSemanticTokensDto(encodeSemanticTokensDto(value));
        if (value.type === 'full' && decoded.type === 'full') {
            assertEqualFull(decoded, value);
        }
        else if (value.type === 'delta' && decoded.type === 'delta') {
            assertEqualDelta(decoded, value);
        }
        else {
            assert.fail('wrong type');
        }
    }
    test('full encoding', () => {
        testRoundTrip({
            id: 12,
            type: 'full',
            data: new Uint32Array([(1 << 24) + (2 << 16) + (3 << 8) + 4]),
        });
    });
    test('delta encoding', () => {
        testRoundTrip({
            id: 12,
            type: 'delta',
            deltas: [
                {
                    start: 0,
                    deleteCount: 4,
                    data: undefined,
                },
                {
                    start: 15,
                    deleteCount: 0,
                    data: new Uint32Array([(1 << 24) + (2 << 16) + (3 << 8) + 4]),
                },
                {
                    start: 27,
                    deleteCount: 5,
                    data: new Uint32Array([(1 << 24) + (2 << 16) + (3 << 8) + 4, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
                },
            ],
        });
    });
    test('partial array buffer', () => {
        const sharedArr = new Uint32Array([
            (1 << 24) + (2 << 16) + (3 << 8) + 4,
            1,
            2,
            3,
            4,
            5,
            (1 << 24) + (2 << 16) + (3 << 8) + 4,
        ]);
        testRoundTrip({
            id: 12,
            type: 'delta',
            deltas: [
                {
                    start: 0,
                    deleteCount: 4,
                    data: sharedArr.subarray(0, 1),
                },
                {
                    start: 15,
                    deleteCount: 0,
                    data: sharedArr.subarray(1, sharedArr.length),
                },
            ],
        });
    });
    test('issue #94521: unusual backing array buffer', () => {
        function wrapAndSliceUint8Arry(buff, prefixLength, suffixLength) {
            const wrapped = new Uint8Array(prefixLength + buff.byteLength + suffixLength);
            wrapped.set(buff, prefixLength);
            return wrapped.subarray(prefixLength, prefixLength + buff.byteLength);
        }
        function wrapAndSlice(buff, prefixLength, suffixLength) {
            return VSBuffer.wrap(wrapAndSliceUint8Arry(buff.buffer, prefixLength, suffixLength));
        }
        const dto = {
            id: 5,
            type: 'full',
            data: new Uint32Array([1, 2, 3, 4, 5]),
        };
        const encoded = encodeSemanticTokensDto(dto);
        // with misaligned prefix and misaligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 1, 1)), dto);
        // with misaligned prefix and aligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 1, 4)), dto);
        // with aligned prefix and misaligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 4, 1)), dto);
        // with aligned prefix and aligned suffix
        assertEqualFull(decodeSemanticTokensDto(wrapAndSlice(encoded, 4, 4)), dto);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNEdG8udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL3NlbWFudGljVG9rZW5zRHRvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFHTix1QkFBdUIsRUFFdkIsdUJBQXVCLEdBQ3ZCLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLEtBQUssQ0FBQyxHQUFnQjtRQUM5QixNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELFNBQVMsZUFBZSxDQUFDLE1BQThCLEVBQUUsUUFBZ0M7UUFDeEYsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUEyQixFQUFFLEVBQUU7WUFDL0MsT0FBTztnQkFDTixFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2dCQUNkLElB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