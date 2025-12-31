/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { StringBuffer, createLineStarts, createLineStartsFast } from './pieceTreeBase.js';
import { PieceTreeTextBuffer } from './pieceTreeTextBuffer.js';
class PieceTreeTextBufferFactory {
    constructor(_chunks, _bom, _cr, _lf, _crlf, _containsRTL, _containsUnusualLineTerminators, _isBasicASCII, _normalizeEOL) {
        this._chunks = _chunks;
        this._bom = _bom;
        this._cr = _cr;
        this._lf = _lf;
        this._crlf = _crlf;
        this._containsRTL = _containsRTL;
        this._containsUnusualLineTerminators = _containsUnusualLineTerminators;
        this._isBasicASCII = _isBasicASCII;
        this._normalizeEOL = _normalizeEOL;
    }
    _getEOL(defaultEOL) {
        const totalEOLCount = this._cr + this._lf + this._crlf;
        const totalCRCount = this._cr + this._crlf;
        if (totalEOLCount === 0) {
            // This is an empty file or a file with precisely one line
            return defaultEOL === 1 /* DefaultEndOfLine.LF */ ? '\n' : '\r\n';
        }
        if (totalCRCount > totalEOLCount / 2) {
            // More than half of the file contains \r\n ending lines
            return '\r\n';
        }
        // At least one line more ends in \n
        return '\n';
    }
    create(defaultEOL) {
        const eol = this._getEOL(defaultEOL);
        const chunks = this._chunks;
        if (this._normalizeEOL &&
            ((eol === '\r\n' && (this._cr > 0 || this._lf > 0)) ||
                (eol === '\n' && (this._cr > 0 || this._crlf > 0)))) {
            // Normalize pieces
            for (let i = 0, len = chunks.length; i < len; i++) {
                const str = chunks[i].buffer.replace(/\r\n|\r|\n/g, eol);
                const newLineStart = createLineStartsFast(str);
                chunks[i] = new StringBuffer(str, newLineStart);
            }
        }
        const textBuffer = new PieceTreeTextBuffer(chunks, this._bom, eol, this._containsRTL, this._containsUnusualLineTerminators, this._isBasicASCII, this._normalizeEOL);
        return { textBuffer: textBuffer, disposable: textBuffer };
    }
    getFirstLineText(lengthLimit) {
        return this._chunks[0].buffer.substr(0, lengthLimit).split(/\r\n|\r|\n/)[0];
    }
}
export class PieceTreeTextBufferBuilder {
    constructor() {
        this.chunks = [];
        this.BOM = '';
        this._hasPreviousChar = false;
        this._previousChar = 0;
        this._tmpLineStarts = [];
        this.cr = 0;
        this.lf = 0;
        this.crlf = 0;
        this.containsRTL = false;
        this.containsUnusualLineTerminators = false;
        this.isBasicASCII = true;
    }
    acceptChunk(chunk) {
        if (chunk.length === 0) {
            return;
        }
        if (this.chunks.length === 0) {
            if (strings.startsWithUTF8BOM(chunk)) {
                this.BOM = strings.UTF8_BOM_CHARACTER;
                chunk = chunk.substr(1);
            }
        }
        const lastChar = chunk.charCodeAt(chunk.length - 1);
        if (lastChar === 13 /* CharCode.CarriageReturn */ || (lastChar >= 0xd800 && lastChar <= 0xdbff)) {
            // last character is \r or a high surrogate => keep it back
            this._acceptChunk1(chunk.substr(0, chunk.length - 1), false);
            this._hasPreviousChar = true;
            this._previousChar = lastChar;
        }
        else {
            this._acceptChunk1(chunk, false);
            this._hasPreviousChar = false;
            this._previousChar = lastChar;
        }
    }
    _acceptChunk1(chunk, allowEmptyStrings) {
        if (!allowEmptyStrings && chunk.length === 0) {
            // Nothing to do
            return;
        }
        if (this._hasPreviousChar) {
            this._acceptChunk2(String.fromCharCode(this._previousChar) + chunk);
        }
        else {
            this._acceptChunk2(chunk);
        }
    }
    _acceptChunk2(chunk) {
        const lineStarts = createLineStarts(this._tmpLineStarts, chunk);
        this.chunks.push(new StringBuffer(chunk, lineStarts.lineStarts));
        this.cr += lineStarts.cr;
        this.lf += lineStarts.lf;
        this.crlf += lineStarts.crlf;
        if (!lineStarts.isBasicASCII) {
            // this chunk contains non basic ASCII characters
            this.isBasicASCII = false;
            if (!this.containsRTL) {
                this.containsRTL = strings.containsRTL(chunk);
            }
            if (!this.containsUnusualLineTerminators) {
                this.containsUnusualLineTerminators = strings.containsUnusualLineTerminators(chunk);
            }
        }
    }
    finish(normalizeEOL = true) {
        this._finish();
        return new PieceTreeTextBufferFactory(this.chunks, this.BOM, this.cr, this.lf, this.crlf, this.containsRTL, this.containsUnusualLineTerminators, this.isBasicASCII, normalizeEOL);
    }
    _finish() {
        if (this.chunks.length === 0) {
            this._acceptChunk1('', true);
        }
        if (this._hasPreviousChar) {
            this._hasPreviousChar = false;
            // recreate last chunk
            const lastChunk = this.chunks[this.chunks.length - 1];
            lastChunk.buffer += String.fromCharCode(this._previousChar);
            const newLineStarts = createLineStartsFast(lastChunk.buffer);
            lastChunk.lineStarts = newLineStarts;
            if (this._previousChar === 13 /* CharCode.CarriageReturn */) {
                this.cr++;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlVGV4dEJ1ZmZlckJ1aWxkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3BpZWNlVHJlZVRleHRCdWZmZXIvcGllY2VUcmVlVGV4dEJ1ZmZlckJ1aWxkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQU83RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFOUQsTUFBTSwwQkFBMEI7SUFDL0IsWUFDa0IsT0FBdUIsRUFDdkIsSUFBWSxFQUNaLEdBQVcsRUFDWCxHQUFXLEVBQ1gsS0FBYSxFQUNiLFlBQXFCLEVBQ3JCLCtCQUF3QyxFQUN4QyxhQUFzQixFQUN0QixhQUFzQjtRQVJ0QixZQUFPLEdBQVAsT0FBTyxDQUFnQjtRQUN2QixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsaUJBQVksR0FBWixZQUFZLENBQVM7UUFDckIsb0NBQStCLEdBQS9CLCtCQUErQixDQUFTO1FBQ3hDLGtCQUFhLEdBQWIsYUFBYSxDQUFTO1FBQ3RCLGtCQUFhLEdBQWIsYUFBYSxDQUFTO0lBQ3JDLENBQUM7SUFFSSxPQUFPLENBQUMsVUFBNEI7UUFDM0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUE7UUFDdEQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcs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