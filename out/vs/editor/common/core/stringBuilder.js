/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import * as platform from '../../../base/common/platform.js';
import * as buffer from '../../../base/common/buffer.js';
let _utf16LE_TextDecoder;
function getUTF16LE_TextDecoder() {
    if (!_utf16LE_TextDecoder) {
        _utf16LE_TextDecoder = new TextDecoder('UTF-16LE');
    }
    return _utf16LE_TextDecoder;
}
let _utf16BE_TextDecoder;
function getUTF16BE_TextDecoder() {
    if (!_utf16BE_TextDecoder) {
        _utf16BE_TextDecoder = new TextDecoder('UTF-16BE');
    }
    return _utf16BE_TextDecoder;
}
let _platformTextDecoder;
export function getPlatformTextDecoder() {
    if (!_platformTextDecoder) {
        _platformTextDecoder = platform.isLittleEndian()
            ? getUTF16LE_TextDecoder()
            : getUTF16BE_TextDecoder();
    }
    return _platformTextDecoder;
}
export function decodeUTF16LE(source, offset, len) {
    const view = new Uint16Array(source.buffer, offset, len);
    if (len > 0 && (view[0] === 0xfeff || view[0] === 0xfffe)) {
        // UTF16 sometimes starts with a BOM https://de.wikipedia.org/wiki/Byte_Order_Mark
        // It looks like TextDecoder.decode will eat up a leading BOM (0xFEFF or 0xFFFE)
        // We don't want that behavior because we know the string is UTF16LE and the BOM should be maintained
        // So we use the manual decoder
        return compatDecodeUTF16LE(source, offset, len);
    }
    return getUTF16LE_TextDecoder().decode(view);
}
function compatDecodeUTF16LE(source, offset, len) {
    const result = [];
    let resultLen = 0;
    for (let i = 0; i < len; i++) {
        const charCode = buffer.readUInt16LE(source, offset);
        offset += 2;
        result[resultLen++] = String.fromCharCode(charCode);
    }
    return result.join('');
}
export class StringBuilder {
    constructor(capacity) {
        this._capacity = capacity | 0;
        this._buffer = new Uint16Array(this._capacity);
        this._completedStrings = null;
        this._bufferLength = 0;
    }
    reset() {
        this._completedStrings = null;
        this._bufferLength = 0;
    }
    build() {
        if (this._completedStrings !== null) {
            this._flushBuffer();
            return this._completedStrings.join('');
        }
        return this._buildBuffer();
    }
    _buildBuffer() {
        if (this._bufferLength === 0) {
            return '';
        }
        const view = new Uint16Array(this._buffer.buffer, 0, this._bufferLength);
        return getPlatformTextDecoder().decode(view);
    }
    _flushBuffer() {
        const bufferString = this._buildBuffer();
        this._bufferLength = 0;
        if (this._completedStrings === null) {
            this._completedStrings = [bufferString];
        }
        else {
            this._completedStrings[this._completedStrings.length] = bufferString;
        }
    }
    /**
     * Append a char code (<2^16)
     */
    appendCharCode(charCode) {
        const remainingSpace = this._capacity - this._bufferLength;
        if (remainingSpace <= 1) {
            if (remainingSpace === 0 || strings.isHighSurrogate(charCode)) {
                this._flushBuffer();
            }
        }
        this._buffer[this._bufferLength++] = charCode;
    }
    /**
     * Append an ASCII char code (<2^8)
     */
    appendASCIICharCode(charCode) {
        if (this._bufferLength === this._capacity) {
            // buffer is full
            this._flushBuffer();
        }
        this._buffer[this._bufferLength++] = charCode;
    }
    appendString(str) {
        const strLen = str.length;
        if (this._bufferLength + strLen >= this._capacity) {
            // This string does not fit in the remaining buffer space
            this._flushBuffer();
            this._completedStrings[this._completedStrings.length] = str;
            return;
        }
        for (let i = 0; i < strLen; i++) {
            this._buffer[this._bufferLength++] = str.charCodeAt(i);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nQnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29yZS9zdHJpbmdCdWlsZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM1RCxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELElBQUksb0JBQXdDLENBQUE7QUFDNUMsU0FBUyxzQkFBc0I7SUFDOUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDM0Isb0JBQW9CLEdBQUcsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUNELE9BQU8sb0JBQW9CLENBQUE7QUFDNUIsQ0FBQztBQUVELElBQUksb0JBQXdDLENBQUE7QUFDNUMsU0FBUyxzQkFBc0I7SUFDOUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDM0Isb0JBQW9CLEdBQUcsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDbkQsQ0FBQztJQUNELE9BQU8sb0JBQW9CLENBQUE7QUFDNUIsQ0FBQztBQUVELElBQUksb0JBQXdDLENBQUE7QUFDNUMsTUFBTSxVQUFVLHNCQUFzQjtJQUNyQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUMzQixvQkFBb0IsR0FBRyxRQUFRLENBQUMsY0FBYyxFQUFFO1lBQy9DLENBQUMsQ0FBQyxzQkFBc0IsRUFBRTtZQUMxQixDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtJQUM1QixDQUFDO0lBQ0QsT0FBTyxvQkFBb0IsQ0FBQTtBQUM1QixDQUFDO0FBRUQsTUFBTSxVQUFVLGFBQWEsQ0FBQyxNQUFrQixFQUFFLE1BQWMsRUFB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