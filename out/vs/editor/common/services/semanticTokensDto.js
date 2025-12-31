/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../base/common/buffer.js';
import * as platform from '../../../base/common/platform.js';
var EncodedSemanticTokensType;
(function (EncodedSemanticTokensType) {
    EncodedSemanticTokensType[EncodedSemanticTokensType["Full"] = 1] = "Full";
    EncodedSemanticTokensType[EncodedSemanticTokensType["Delta"] = 2] = "Delta";
})(EncodedSemanticTokensType || (EncodedSemanticTokensType = {}));
function reverseEndianness(arr) {
    for (let i = 0, len = arr.length; i < len; i += 4) {
        // flip bytes 0<->3 and 1<->2
        const b0 = arr[i + 0];
        const b1 = arr[i + 1];
        const b2 = arr[i + 2];
        const b3 = arr[i + 3];
        arr[i + 0] = b3;
        arr[i + 1] = b2;
        arr[i + 2] = b1;
        arr[i + 3] = b0;
    }
}
function toLittleEndianBuffer(arr) {
    const uint8Arr = new Uint8Array(arr.buffer, arr.byteOffset, arr.length * 4);
    if (!platform.isLittleEndian()) {
        // the byte order must be changed
        reverseEndianness(uint8Arr);
    }
    return VSBuffer.wrap(uint8Arr);
}
function fromLittleEndianBuffer(buff) {
    const uint8Arr = buff.buffer;
    if (!platform.isLittleEndian()) {
        // the byte order must be changed
        reverseEndianness(uint8Arr);
    }
    if (uint8Arr.byteOffset % 4 === 0) {
        return new Uint32Array(uint8Arr.buffer, uint8Arr.byteOffset, uint8Arr.length / 4);
    }
    else {
        // unaligned memory access doesn't work on all platforms
        const data = new Uint8Array(uint8Arr.byteLength);
        data.set(uint8Arr);
        return new Uint32Array(data.buffer, data.byteOffset, data.length / 4);
    }
}
export function encodeSemanticTokensDto(semanticTokens) {
    const dest = new Uint32Array(encodeSemanticTokensDtoSize(semanticTokens));
    let offset = 0;
    dest[offset++] = semanticTokens.id;
    if (semanticTokens.type === 'full') {
        dest[offset++] = 1 /* EncodedSemanticTokensType.Full */;
        dest[offset++] = semanticTokens.data.length;
        dest.set(semanticTokens.data, offset);
        offset += semanticTokens.data.length;
    }
    else {
        dest[offset++] = 2 /* EncodedSemanticTokensType.Delta */;
        dest[offset++] = semanticTokens.deltas.length;
        for (const delta of semanticTokens.deltas) {
            dest[offset++] = delta.start;
            dest[offset++] = delta.deleteCount;
            if (delta.data) {
                dest[offset++] = delta.data.length;
                dest.set(delta.data, offset);
                offset += delta.data.length;
            }
            else {
                dest[offset++] = 0;
            }
        }
    }
    return toLittleEndianBuffer(dest);
}
function encodeSemanticTokensDtoSize(semanticTokens) {
    let result = 0;
    result +=
        +1 + // id
            1; // type
    if (semanticTokens.type === 'full') {
        result +=
            +1 + // data length
                semanticTokens.data.length;
    }
    else {
        result += +1; // delta count
        result +=
            (+1 + // start
                1 + // deleteCount
                1) * // data length
                semanticTokens.deltas.length;
        for (const delta of semanticTokens.deltas) {
            if (delta.data) {
                result += delta.data.length;
            }
        }
    }
    return result;
}
export function decodeSemanticTokensDto(_buff) {
    const src = fromLittleEndianBuffer(_buff);
    let offset = 0;
    const id = src[offset++];
    const type = src[offset++];
    if (type === 1 /* EncodedSemanticTokensType.Full */) {
        const length = src[offset++];
        const data = src.subarray(offset, offset + length);
        offset += length;
        return {
            id: id,
            type: 'full',
            data: data,
        };
    }
    const deltaCount = src[offset++];
    const deltas = [];
    for (let i = 0; i < deltaCount; i++) {
        const start = src[offset++];
        const deleteCount = src[offset++];
        const length = src[offset++];
        let data;
        if (length > 0) {
            data = src.subarray(offset, offset + length);
            offset += length;
        }
        deltas[i] = { start, deleteCount, data };
    }
    return {
        id: id,
        type: 'delta',
        deltas: deltas,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VtYW50aWNUb2tlbnNEdG8uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL3NlbWFudGljVG9rZW5zRHRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBZ0I1RCxJQUFXLHlCQUdWO0FBSEQsV0FBVyx5QkFBeUI7SUFDbkMseUVBQVEsQ0FBQTtJQUNSLDJFQUFTLENBQUE7QUFDVixDQUFDLEVBSFUseUJBQXlCLEtBQXpCLHlCQUF5QixRQUduQztBQUVELFNBQVMsaUJBQWlCLENBQUMsR0FBZTtJQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuRCw2QkFBNkI7UUFDN0IsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNyQixNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDckIsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNyQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUNmLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ2YsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENB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