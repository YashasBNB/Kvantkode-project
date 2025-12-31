/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Lazy } from './lazy.js';
import * as streams from './stream.js';
const hasBuffer = typeof Buffer !== 'undefined';
const indexOfTable = new Lazy(() => new Uint8Array(256));
let textEncoder;
let textDecoder;
export class VSBuffer {
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static alloc(byteLength) {
        if (hasBuffer) {
            return new VSBuffer(Buffer.allocUnsafe(byteLength));
        }
        else {
            return new VSBuffer(new Uint8Array(byteLength));
        }
    }
    /**
     * When running in a nodejs context, if `actual` is not a nodejs Buffer, the backing store for
     * the returned `VSBuffer` instance might use a nodejs Buffer allocated from node's Buffer pool,
     * which is not transferrable.
     */
    static wrap(actual) {
        if (hasBuffer && !Buffer.isBuffer(actual)) {
            // https://nodejs.org/dist/latest-v10.x/docs/api/buffer.html#buffer_class_method_buffer_from_arraybuffer_byteoffset_length
            // Create a zero-copy Buffer wrapper around the ArrayBuffer pointed to by the Uint8Array
            actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
        }
        return new VSBuffer(actual);
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static fromString(source, options) {
        const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
        if (!dontUseNodeBuffer && hasBuffer) {
            return new VSBuffer(Buffer.from(source));
        }
        else {
            if (!textEncoder) {
                textEncoder = new TextEncoder();
            }
            return new VSBuffer(textEncoder.encode(source));
        }
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static fromByteArray(source) {
        const result = VSBuffer.alloc(source.length);
        for (let i = 0, len = source.length; i < len; i++) {
            result.buffer[i] = source[i];
        }
        return result;
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    static concat(buffers, totalLength) {
        if (typeof totalLength === 'undefined') {
            totalLength = 0;
            for (let i = 0, len = buffers.length; i < len; i++) {
                totalLength += buffers[i].byteLength;
            }
        }
        const ret = VSBuffer.alloc(totalLength);
        let offset = 0;
        for (let i = 0, len = buffers.length; i < len; i++) {
            const element = buffers[i];
            ret.set(element, offset);
            offset += element.byteLength;
        }
        return ret;
    }
    constructor(buffer) {
        this.buffer = buffer;
        this.byteLength = this.buffer.byteLength;
    }
    /**
     * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
     * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
     */
    clone() {
        const result = VSBuffer.alloc(this.byteLength);
        result.set(this);
        return result;
    }
    toString() {
        if (hasBuffer) {
            return this.buffer.toString();
        }
        else {
            if (!textDecoder) {
                textDecoder = new TextDecoder();
            }
            return textDecoder.decode(this.buffer);
        }
    }
    slice(start, end) {
        // IMPORTANT: use subarray instead of slice because TypedArray#slice
        // creates shallow copy and NodeBuffer#slice doesn't. The use of subarray
        // ensures the same, performance, behaviour.
        return new VSBuffer(this.buffer.subarray(start, end));
    }
    set(array, offset) {
        if (array instanceof VSBuffer) {
            this.buffer.set(array.buffer, offset);
        }
        else if (array instanceof Uint8Array) {
            this.buffer.set(array, offset);
        }
        else if (array instanceof ArrayBuffer) {
            this.buffer.set(new Uint8Array(array), offset);
        }
        else if (ArrayBuffer.isView(array)) {
            this.buffer.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset);
        }
        else {
            throw new Error(`Unknown argument 'array'`);
        }
    }
    readUInt32BE(offset) {
        return readUInt32BE(this.buffer, offset);
    }
    writeUInt32BE(value, offset) {
        writeUInt32BE(this.buffer, value, offset);
    }
    readUInt32LE(offset) {
        return readUInt32LE(this.buffer, offset);
    }
    writeUInt32LE(value, offset) {
        writeUInt32LE(this.buffer, value, offset);
    }
    readUInt8(offset) {
        return readUInt8(this.buffer, offset);
    }
    writeUInt8(value, offset) {
        writeUInt8(this.buffer, value, offset);
    }
    indexOf(subarray, offset = 0) {
        return binaryIndexOf(this.buffer, subarray instanceof VSBuffer ? subarray.buffer : subarray, offset);
    }
    equals(other) {
        if (this === other) {
            return true;
        }
        if (this.byteLength !== other.byteLength) {
            return false;
        }
        return this.buffer.every((value, index) => value === other.buffer[index]);
    }
}
/**
 * Like String.indexOf, but works on Uint8Arrays.
 * Uses the boyer-moore-horspool algorithm to be reasonably speedy.
 */
export function binaryIndexOf(haystack, needle, offset = 0) {
    const needleLen = needle.byteLength;
    const haystackLen = haystack.byteLength;
    if (needleLen === 0) {
        return 0;
    }
    if (needleLen === 1) {
        return haystack.indexOf(needle[0]);
    }
    if (needleLen > haystackLen - offset) {
        return -1;
    }
    // find index of the subarray using boyer-moore-horspool algorithm
    const table = indexOfTable.value;
    table.fill(needle.length);
    for (let i = 0; i < needle.length; i++) {
        table[needle[i]] = needle.length - i - 1;
    }
    let i = offset + needle.length - 1;
    let j = i;
    let result = -1;
    while (i < haystackLen) {
        if (haystack[i] === needle[j]) {
            if (j === 0) {
                result = i;
                break;
            }
            i--;
            j--;
        }
        else {
            i += Math.max(needle.length - j, table[haystack[i]]);
            j = needle.length - 1;
        }
    }
    return result;
}
export function readUInt16LE(source, offset) {
    return ((source[offset + 0] << 0) >>> 0) | ((source[offset + 1] << 8) >>> 0);
}
export function writeUInt16LE(destination, value, offset) {
    destination[offset + 0] = value & 0b11111111;
    value = value >>> 8;
    destination[offset + 1] = value & 0b11111111;
}
export function readUInt32BE(source, offset) {
    return (source[offset] * 2 ** 24 +
        source[offset + 1] * 2 ** 16 +
        source[offset + 2] * 2 ** 8 +
        source[offset + 3]);
}
export function writeUInt32BE(destination, value, offset) {
    destination[offset + 3] = value;
    value = value >>> 8;
    destination[offset + 2] = value;
    value = value >>> 8;
    destination[offset + 1] = value;
    value = value >>> 8;
    destination[offset] = value;
}
export function readUInt32LE(source, offset) {
    return (((source[offset + 0] << 0) >>> 0) |
        ((source[offset + 1] << 8) >>> 0) |
        ((source[offset + 2] << 16) >>> 0) |
        ((source[offset + 3] << 24) >>> 0));
}
export function writeUInt32LE(destination, value, offset) {
    destination[offset + 0] = value & 0b11111111;
    value = value >>> 8;
    destination[offset + 1] = value & 0b11111111;
    value = value >>> 8;
    destination[offset + 2] = value & 0b11111111;
    value = value >>> 8;
    destination[offset + 3] = value & 0b11111111;
}
export function readUInt8(source, offset) {
    return source[offset];
}
export function writeUInt8(destination, value, offset) {
    destination[offset] = value;
}
export function readableToBuffer(readable) {
    return streams.consumeReadable(readable, (chunks) => VSBuffer.concat(chunks));
}
export function bufferToReadable(buffer) {
    return streams.toReadable(buffer);
}
export function streamToBuffer(stream) {
    return streams.consumeStream(stream, (chunks) => VSBuffer.concat(chunks));
}
export async function bufferedStreamToBuffer(bufferedStream) {
    if (bufferedStream.ended) {
        return VSBuffer.concat(bufferedStream.buffer);
    }
    return VSBuffer.concat([
        // Include already read chunks...
        ...bufferedStream.buffer,
        // ...and all additional chunks
        await streamToBuffer(bufferedStream.stream),
    ]);
}
export function bufferToStream(buffer) {
    return streams.toStream(buffer, (chunks) => VSBuffer.concat(chunks));
}
export function streamToBufferReadableStream(stream) {
    return streams.transform(stream, {
        data: (data) => (typeof data === 'string' ? VSBuffer.fromString(data) : VSBuffer.wrap(data)),
    }, (chunks) => VSBuffer.concat(chunks));
}
export function newWriteableBufferStream(options) {
    return streams.newWriteableStream((chunks) => VSBuffer.concat(chunks), options);
}
export function prefixedBufferReadable(prefix, readable) {
    return streams.prefixedReadable(prefix, readable, (chunks) => VSBuffer.concat(chunks));
}
export function prefixedBufferStream(prefix, stream) {
    return streams.prefixedStream(prefix, stream, (chunks) => VSBuffer.concat(chunks));
}
/** Decodes base64 to a uint8 array. URL-encoded and unpadded base64 is allowed. */
export function decodeBase64(encoded) {
    let building = 0;
    let remainder = 0;
    let bufi = 0;
    // The simpler way to do this is `Uint8Array.from(atob(str), c => c.charCodeAt(0))`,
    // but that's about 10-20x slower than this function in current Chromium versions.
    const buffer = new Uint8Array(Math.floor((encoded.length / 4) * 3));
    const append = (value) => {
        switch (remainder) {
            case 3:
                buffer[bufi++] = building | value;
                remainder = 0;
                break;
            case 2:
                buffer[bufi++] = building | (value >>> 2);
                building = value << 6;
                remainder = 3;
                break;
            case 1:
                buffer[bufi++] = building | (value >>> 4);
                building = value << 4;
                remainder = 2;
                break;
            default:
                building = value << 2;
                remainder = 1;
        }
    };
    for (let i = 0; i < encoded.length; i++) {
        const code = encoded.charCodeAt(i);
        // See https://datatracker.ietf.org/doc/html/rfc4648#section-4
        // This branchy code is about 3x faster than an indexOf on a base64 char string.
        if (code >= 65 && code <= 90) {
            append(code - 65); // A-Z starts ranges from char code 65 to 90
        }
        else if (code >= 97 && code <= 122) {
            append(code - 97 + 26); // a-z starts ranges from char code 97 to 122, starting at byte 26
        }
        else if (code >= 48 && code <= 57) {
            append(code - 48 + 52); // 0-9 starts ranges from char code 48 to 58, starting at byte 52
        }
        else if (code === 43 || code === 45) {
            append(62); // "+" or "-" for URLS
        }
        else if (code === 47 || code === 95) {
            append(63); // "/" or "_" for URLS
        }
        else if (code === 61) {
            break; // "="
        }
        else {
            throw new SyntaxError(`Unexpected base64 character ${encoded[i]}`);
        }
    }
    const unpadded = bufi;
    while (remainder > 0) {
        append(0);
    }
    // slice is needed to account for overestimation due to padding
    return VSBuffer.wrap(buffer).slice(0, unpadded);
}
const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64UrlSafeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** Encodes a buffer to a base64 string. */
export function encodeBase64({ buffer }, padded = true, urlSafe = false) {
    const dictionary = urlSafe ? base64UrlSafeAlphabet : base64Alphabet;
    let output = '';
    const remainder = buffer.byteLength % 3;
    let i = 0;
    for (; i < buffer.byteLength - remainder; i += 3) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        const c = buffer[i + 2];
        output += dictionary[a >>> 2];
        output += dictionary[((a << 4) | (b >>> 4)) & 0b111111];
        output += dictionary[((b << 2) | (c >>> 6)) & 0b111111];
        output += dictionary[c & 0b111111];
    }
    if (remainder === 1) {
        const a = buffer[i + 0];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4) & 0b111111];
        if (padded) {
            output += '==';
        }
    }
    else if (remainder === 2) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        output += dictionary[a >>> 2];
        output += dictionary[((a << 4) | (b >>> 4)) & 0b111111];
        output += dictionary[(b << 2) & 0b111111];
        if (padded) {
            output += '=';
        }
    }
    return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vYnVmZmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDaEMsT0FBTyxLQUFLLE9BQU8sTUFBTSxhQUFhLENBQUE7QUFJdEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxNQUFNLEtBQUssV0FBVyxDQUFBO0FBQy9DLE1BQU0sWUFBWSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFeEQsSUFBSSxXQUErQixDQUFBO0FBQ25DLElBQUksV0FBK0IsQ0FBQTtBQUVuQyxNQUFNLE9BQU8sUUFBUTtJQUNwQjs7O09BR0c7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQWtCO1FBQzlCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQWtCO1FBQzdCLElBQUksU0FBUyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzNDLDBIQUEwSDtZQUMxSCx3RkFBd0Y7WUFDeEYsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FB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