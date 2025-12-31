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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNEdG8udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy9zZW1hbnRpY1Rva2Vuc0R0by50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBR04sdUJBQXVCLEVBRXZCLHVCQUF1QixHQUN2QixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxLQUFLLENBQUMsR0FBZ0I7UUFDOUIsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNoRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25CLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxTQUFTLGVBQWUsQ0FBQyxNQUE4QixFQUFFLFFBQWdDO1FBQ3hGLE1BQU0sT0FBTyxHQUFHLENBQUMsR0FBMkIsRUFBRSxFQUFFO1lBQy9DLE9BQU87Z0JBQ04sRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNWLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtnQkFDZCxJQUFJLEVBQUUsS0FBSyxDQUFDLEdBQUcs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