/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../../core/position.js';
import { Range } from '../../core/range.js';
import { FindMatch } from '../../model.js';
import { SENTINEL, TreeNode, fixInsert, leftest, rbDelete, righttest, updateTreeMetadata, } from './rbTreeBase.js';
import { Searcher, createFindMatch, isValidMatch } from '../textModelSearch.js';
// const lfRegex = new RegExp(/\r\n|\r|\n/g);
const AverageBufferSize = 65535;
function createUintArray(arr) {
    let r;
    if (arr[arr.length - 1] < 65536) {
        r = new Uint16Array(arr.length);
    }
    else {
        r = new Uint32Array(arr.length);
    }
    r.set(arr, 0);
    return r;
}
class LineStarts {
    constructor(lineStarts, cr, lf, crlf, isBasicASCII) {
        this.lineStarts = lineStarts;
        this.cr = cr;
        this.lf = lf;
        this.crlf = crlf;
        this.isBasicASCII = isBasicASCII;
    }
}
export function createLineStartsFast(str, readonly = true) {
    const r = [0];
    let rLength = 1;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (i + 1 < len && str.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                r[rLength++] = i + 2;
                i++; // skip \n
            }
            else {
                // \r... case
                r[rLength++] = i + 1;
            }
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            r[rLength++] = i + 1;
        }
    }
    if (readonly) {
        return createUintArray(r);
    }
    else {
        return r;
    }
}
export function createLineStarts(r, str) {
    r.length = 0;
    r[0] = 0;
    let rLength = 1;
    let cr = 0, lf = 0, crlf = 0;
    let isBasicASCII = true;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        if (chr === 13 /* CharCode.CarriageReturn */) {
            if (i + 1 < len && str.charCodeAt(i + 1) === 10 /* CharCode.LineFeed */) {
                // \r\n... case
                crlf++;
                r[rLength++] = i + 2;
                i++; // skip \n
            }
            else {
                cr++;
                // \r... case
                r[rLength++] = i + 1;
            }
        }
        else if (chr === 10 /* CharCode.LineFeed */) {
            lf++;
            r[rLength++] = i + 1;
        }
        else {
            if (isBasicASCII) {
                if (chr !== 9 /* CharCode.Tab */ && (chr < 32 || chr > 126)) {
                    isBasicASCII = false;
                }
            }
        }
    }
    const result = new LineStarts(createUintArray(r), cr, lf, crlf, isBasicASCII);
    r.length = 0;
    return result;
}
export class Piece {
    constructor(bufferIndex, start, end, lineFeedCnt, length) {
        this.bufferIndex = bufferIndex;
        this.start = start;
        this.end = end;
        this.lineFeedCnt = lineFeedCnt;
        this.length = length;
    }
}
export class StringBuffer {
    constructor(buffer, lineStarts) {
        this.buffer = buffer;
        this.lineStarts = lineStarts;
    }
}
/**
 * Readonly snapshot for piece tree.
 * In a real multiple thread environment, to make snapshot reading always work correctly, we need to
 * 1. Make TreeNode.piece immutable, then reading and writing can run in parallel.
 * 2. TreeNode/Buffers normalization should not happen during snapshot reading.
 */
class PieceTreeSnapshot {
    constructor(tree, BOM) {
        this._pieces = [];
        this._tree = tree;
        this._BOM = BOM;
        this._index = 0;
        if (tree.root !== SENTINEL) {
            tree.iterate(tree.root, (node) => {
                if (node !== SENTINEL) {
                    this._pieces.push(node.piece);
                }
                return true;
            });
        }
    }
    read() {
        if (this._pieces.length === 0) {
            if (this._index === 0) {
                this._index++;
                return this._BOM;
            }
            else {
                return null;
            }
        }
        if (this._index > this._pieces.length - 1) {
            return null;
        }
        if (this._index === 0) {
            return this._BOM + this._tree.getPieceContent(this._pieces[this._index++]);
        }
        return this._tree.getPieceContent(this._pieces[this._index++]);
    }
}
class PieceTreeSearchCache {
    constructor(limit) {
        this._limit = limit;
        this._cache = [];
    }
    get(offset) {
        for (let i = this._cache.length - 1; i >= 0; i--) {
            const nodePos = this._cache[i];
            if (nodePos.nodeStartOffset <= offset &&
                nodePos.nodeStartOffset + nodePos.node.piece.length >= offset) {
                return nodePos;
            }
        }
        return null;
    }
    get2(lineNumber) {
        for (let i = this._cache.length - 1; i >= 0; i--) {
            const nodePos = this._cache[i];
            if (nodePos.nodeStartLineNumber &&
                nodePos.nodeStartLineNumber < lineNumber &&
                nodePos.nodeStartLineNumber + nodePos.node.piece.lineFeedCnt >= lineNumber) {
                return nodePos;
            }
        }
        return null;
    }
    set(nodePosition) {
        if (this._cache.length >= this._limit) {
            this._cache.shift();
        }
        this._cache.push(nodePosition);
    }
    validate(offset) {
        let hasInvalidVal = false;
        const tmp = this._cache;
        for (let i = 0; i < tmp.length; i++) {
            const nodePos = tmp[i];
            if (nodePos.node.parent === null || nodePos.nodeStartOffset >= offset) {
                tmp[i] = null;
                hasInvalidVal = true;
                continue;
            }
        }
        if (hasInvalidVal) {
            const newArr = [];
            for (const entry of tmp) {
                if (entry !== null) {
                    newArr.push(entry);
                }
            }
            this._cache = newArr;
        }
    }
}
export class PieceTreeBase {
    constructor(chunks, eol, eolNormalized) {
        this.create(chunks, eol, eolNormalized);
    }
    create(chunks, eol, eolNormalized) {
        this._buffers = [new StringBuffer('', [0])];
        this._lastChangeBufferPos = { line: 0, column: 0 };
        this.root = SENTINEL;
        this._lineCnt = 1;
        this._length = 0;
        this._EOL = eol;
        this._EOLLength = eol.length;
        this._EOLNormalized = eolNormalized;
        let lastNode = null;
        for (let i = 0, len = chunks.length; i < len; i++) {
            if (chunks[i].buffer.length > 0) {
                if (!chunks[i].lineStarts) {
                    chunks[i].lineStarts = createLineStartsFast(chunks[i].buffer);
                }
                const piece = new Piece(i + 1, { line: 0, column: 0 }, {
                    line: chunks[i].lineStarts.length - 1,
                    column: chunks[i].buffer.length - chunks[i].lineStarts[chunks[i].lineStarts.length - 1],
                }, chunks[i].lineStarts.length - 1, chunks[i].buffer.length);
                this._buffers.push(chunks[i]);
                lastNode = this.rbInsertRight(lastNode, piece);
            }
        }
        this._searchCache = new PieceTreeSearchCache(1);
        this._lastVisitedLine = { lineNumber: 0, value: '' };
        this.computeBufferMetadata();
    }
    normalizeEOL(eol) {
        const averageBufferSize = AverageBufferSize;
        const min = averageBufferSize - Math.floor(averageBufferSize / 3);
        const max = min * 2;
        let tempChunk = '';
        let tempChunkLen = 0;
        const chunks = [];
        this.iterate(this.root, (node) => {
            const str = this.getNodeContent(node);
            const len = str.length;
            if (tempChunkLen <= min || tempChunkLen + len < max) {
                tempChunk += str;
                tempChunkLen += len;
                return true;
            }
            // flush anyways
            const text = tempChunk.replace(/\r\n|\r|\n/g, eol);
            chunks.push(new StringBuffer(text, createLineStartsFast(text)));
            tempChunk = str;
            tempChunkLen = len;
            return true;
        });
        if (tempChunkLen > 0) {
            const text = tempChunk.replace(/\r\n|\r|\n/g, eol);
            chunks.push(new StringBuffer(text, createLineStartsFast(text)));
        }
        this.create(chunks, eol, true);
    }
    // #region Buffer API
    getEOL() {
        return this._EOL;
    }
    setEOL(newEOL) {
        this._EOL = newEOL;
        this._EOLLength = this._EOL.length;
        this.normalizeEOL(newEOL);
    }
    createSnapshot(BOM) {
        return new PieceTreeSnapshot(this, BOM);
    }
    equal(other) {
        if (this.getLength() !== other.getLength()) {
            return false;
        }
        if (this.getLineCount() !== other.getLineCount()) {
            return false;
        }
        let offset = 0;
        const ret = this.iterate(this.root, (node) => {
            if (node === SENTINEL) {
                return true;
            }
            const str = this.getNodeContent(node);
            const len = str.length;
            const startPosition = other.nodeAt(offset);
            const endPosition = other.nodeAt(offset + len);
            const val = other.getValueInRange2(startPosition, endPosition);
            offset += len;
            return str === val;
        });
        return ret;
    }
    getOffsetAt(lineNumber, column) {
        let leftLen = 0; // inorder
        let x = this.root;
        while (x !== SENTINEL) {
            if (x.left !== SENTINEL && x.lf_left + 1 >= lineNumber) {
                x = x.left;
            }
            else if (x.lf_left + x.piece.lineFeedCnt + 1 >= lineNumber) {
                leftLen += x.size_left;
                // lineNumber >= 2
                const accumualtedValInCurrentIndex = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                return (leftLen += accumualtedValInCurrentIndex + column - 1);
            }
            else {
                lineNumber -= x.lf_left + x.piece.lineFeedCnt;
                leftLen += x.size_left + x.piece.length;
                x = x.right;
            }
        }
        return leftLen;
    }
    getPositionAt(offset) {
        offset = Math.floor(offset);
        offset = Math.max(0, offset);
        let x = this.root;
        let lfCnt = 0;
        const originalOffset = offset;
        while (x !== SENTINEL) {
            if (x.size_left !== 0 && x.size_left >= offset) {
                x = x.left;
            }
            else if (x.size_left + x.piece.length >= offset) {
                const out = this.getIndexOf(x, offset - x.size_left);
                lfCnt += x.lf_left + out.index;
                if (out.index === 0) {
                    const lineStartOffset = this.getOffsetAt(lfCnt + 1, 1);
                    const column = originalOffset - lineStartOffset;
                    return new Position(lfCnt + 1, column + 1);
                }
                return new Position(lfCnt + 1, out.remainder + 1);
            }
            else {
                offset -= x.size_left + x.piece.length;
                lfCnt += x.lf_left + x.piece.lineFeedCnt;
                if (x.right === SENTINEL) {
                    // last node
                    const lineStartOffset = this.getOffsetAt(lfCnt + 1, 1);
                    const column = originalOffset - offset - lineStartOffset;
                    return new Position(lfCnt + 1, column + 1);
                }
                else {
                    x = x.right;
                }
            }
        }
        return new Position(1, 1);
    }
    getValueInRange(range, eol) {
        if (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn) {
            return '';
        }
        const startPosition = this.nodeAt2(range.startLineNumber, range.startColumn);
        const endPosition = this.nodeAt2(range.endLineNumber, range.endColumn);
        const value = this.getValueInRange2(startPosition, endPosition);
        if (eol) {
            if (eol !== this._EOL || !this._EOLNormalized) {
                return value.replace(/\r\n|\r|\n/g, eol);
            }
            if (eol === this.getEOL() && this._EOLNormalized) {
                if (eol === '\r\n') {
                }
                return value;
            }
            return value.replace(/\r\n|\r|\n/g, eol);
        }
        return value;
    }
    getValueInRange2(startPosition, endPosition) {
        if (startPosition.node === endPosition.node) {
            const node = startPosition.node;
            const buffer = this._buffers[node.piece.bufferIndex].buffer;
            const startOffset = this.offsetInBuffer(node.piece.bufferIndex, node.piece.start);
            return buffer.substring(startOffset + startPosition.remainder, startOffset + endPosition.remainder);
        }
        let x = startPosition.node;
        const buffer = this._buffers[x.piece.bufferIndex].buffer;
        const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
        let ret = buffer.substring(startOffset + startPosition.remainder, startOffset + x.piece.length);
        x = x.next();
        while (x !== SENTINEL) {
            const buffer = this._buffers[x.piece.bufferIndex].buffer;
            const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
            if (x === endPosition.node) {
                ret += buffer.substring(startOffset, startOffset + endPosition.remainder);
                break;
            }
            else {
                ret += buffer.substr(startOffset, x.piece.length);
            }
            x = x.next();
        }
        return ret;
    }
    getLinesContent() {
        const lines = [];
        let linesLength = 0;
        let currentLine = '';
        let danglingCR = false;
        this.iterate(this.root, (node) => {
            if (node === SENTINEL) {
                return true;
            }
            const piece = node.piece;
            let pieceLength = piece.length;
            if (pieceLength === 0) {
                return true;
            }
            const buffer = this._buffers[piece.bufferIndex].buffer;
            const lineStarts = this._buffers[piece.bufferIndex].lineStarts;
            const pieceStartLine = piece.start.line;
            const pieceEndLine = piece.end.line;
            let pieceStartOffset = lineStarts[pieceStartLine] + piece.start.column;
            if (danglingCR) {
                if (buffer.charCodeAt(pieceStartOffset) === 10 /* CharCode.LineFeed */) {
                    // pretend the \n was in the previous piece..
                    pieceStartOffset++;
                    pieceLength--;
                }
                lines[linesLength++] = currentLine;
                currentLine = '';
                danglingCR = false;
                if (pieceLength === 0) {
                    return true;
                }
            }
            if (pieceStartLine === pieceEndLine) {
                // this piece has no new lines
                if (!this._EOLNormalized &&
                    buffer.charCodeAt(pieceStartOffset + pieceLength - 1) === 13 /* CharCode.CarriageReturn */) {
                    danglingCR = true;
                    currentLine += buffer.substr(pieceStartOffset, pieceLength - 1);
                }
                else {
                    currentLine += buffer.substr(pieceStartOffset, pieceLength);
                }
                return true;
            }
            // add the text before the first line start in this piece
            currentLine += this._EOLNormalized
                ? buffer.substring(pieceStartOffset, Math.max(pieceStartOffset, lineStarts[pieceStartLine + 1] - this._EOLLength))
                : buffer
                    .substring(pieceStartOffset, lineStarts[pieceStartLine + 1])
                    .replace(/(\r\n|\r|\n)$/, '');
            lines[linesLength++] = currentLine;
            for (let line = pieceStartLine + 1; line < pieceEndLine; line++) {
                currentLine = this._EOLNormalized
                    ? buffer.substring(lineStarts[line], lineStarts[line + 1] - this._EOLLength)
                    : buffer.substring(lineStarts[line], lineStarts[line + 1]).replace(/(\r\n|\r|\n)$/, '');
                lines[linesLength++] = currentLine;
            }
            if (!this._EOLNormalized &&
                buffer.charCodeAt(lineStarts[pieceEndLine] + piece.end.column - 1) ===
                    13 /* CharCode.CarriageReturn */) {
                danglingCR = true;
                if (piece.end.column === 0) {
                    // The last line ended with a \r, let's undo the push, it will be pushed by next iteration
                    linesLength--;
                }
                else {
                    currentLine = buffer.substr(lineStarts[pieceEndLine], piece.end.column - 1);
                }
            }
            else {
                currentLine = buffer.substr(lineStarts[pieceEndLine], piece.end.column);
            }
            return true;
        });
        if (danglingCR) {
            lines[linesLength++] = currentLine;
            currentLine = '';
        }
        lines[linesLength++] = currentLine;
        return lines;
    }
    getLength() {
        return this._length;
    }
    getLineCount() {
        return this._lineCnt;
    }
    getLineContent(lineNumber) {
        if (this._lastVisitedLine.lineNumber === lineNumber) {
            return this._lastVisitedLine.value;
        }
        this._lastVisitedLine.lineNumber = lineNumber;
        if (lineNumber === this._lineCnt) {
            this._lastVisitedLine.value = this.getLineRawContent(lineNumber);
        }
        else if (this._EOLNormalized) {
            this._lastVisitedLine.value = this.getLineRawContent(lineNumber, this._EOLLength);
        }
        else {
            this._lastVisitedLine.value = this.getLineRawContent(lineNumber).replace(/(\r\n|\r|\n)$/, '');
        }
        return this._lastVisitedLine.value;
    }
    _getCharCode(nodePos) {
        if (nodePos.remainder === nodePos.node.piece.length) {
            // the char we want to fetch is at the head of next node.
            const matchingNode = nodePos.node.next();
            if (!matchingNode) {
                return 0;
            }
            const buffer = this._buffers[matchingNode.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(matchingNode.piece.bufferIndex, matchingNode.piece.start);
            return buffer.buffer.charCodeAt(startOffset);
        }
        else {
            const buffer = this._buffers[nodePos.node.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(nodePos.node.piece.bufferIndex, nodePos.node.piece.start);
            const targetOffset = startOffset + nodePos.remainder;
            return buffer.buffer.charCodeAt(targetOffset);
        }
    }
    getLineCharCode(lineNumber, index) {
        const nodePos = this.nodeAt2(lineNumber, index + 1);
        return this._getCharCode(nodePos);
    }
    getLineLength(lineNumber) {
        if (lineNumber === this.getLineCount()) {
            const startOffset = this.getOffsetAt(lineNumber, 1);
            return this.getLength() - startOffset;
        }
        return this.getOffsetAt(lineNumber + 1, 1) - this.getOffsetAt(lineNumber, 1) - this._EOLLength;
    }
    getCharCode(offset) {
        const nodePos = this.nodeAt(offset);
        return this._getCharCode(nodePos);
    }
    getNearestChunk(offset) {
        const nodePos = this.nodeAt(offset);
        if (nodePos.remainder === nodePos.node.piece.length) {
            // the offset is at the head of next node.
            const matchingNode = nodePos.node.next();
            if (!matchingNode || matchingNode === SENTINEL) {
                return '';
            }
            const buffer = this._buffers[matchingNode.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(matchingNode.piece.bufferIndex, matchingNode.piece.start);
            return buffer.buffer.substring(startOffset, startOffset + matchingNode.piece.length);
        }
        else {
            const buffer = this._buffers[nodePos.node.piece.bufferIndex];
            const startOffset = this.offsetInBuffer(nodePos.node.piece.bufferIndex, nodePos.node.piece.start);
            const targetOffset = startOffset + nodePos.remainder;
            const targetEnd = startOffset + nodePos.node.piece.length;
            return buffer.buffer.substring(targetOffset, targetEnd);
        }
    }
    findMatchesInNode(node, searcher, startLineNumber, startColumn, startCursor, endCursor, searchData, captureMatches, limitResultCount, resultLen, result) {
        const buffer = this._buffers[node.piece.bufferIndex];
        const startOffsetInBuffer = this.offsetInBuffer(node.piece.bufferIndex, node.piece.start);
        const start = this.offsetInBuffer(node.piece.bufferIndex, startCursor);
        const end = this.offsetInBuffer(node.piece.bufferIndex, endCursor);
        let m;
        // Reset regex to search from the beginning
        const ret = { line: 0, column: 0 };
        let searchText;
        let offsetInBuffer;
        if (searcher._wordSeparators) {
            searchText = buffer.buffer.substring(start, end);
            offsetInBuffer = (offset) => offset + start;
            searcher.reset(0);
        }
        else {
            searchText = buffer.buffer;
            offsetInBuffer = (offset) => offset;
            searcher.reset(start);
        }
        do {
            m = searcher.next(searchText);
            if (m) {
                if (offsetInBuffer(m.index) >= end) {
                    return resultLen;
                }
                this.positionInBuffer(node, offsetInBuffer(m.index) - startOffsetInBuffer, ret);
                const lineFeedCnt = this.getLineFeedCnt(node.piece.bufferIndex, startCursor, ret);
                const retStartColumn = ret.line === startCursor.line
                    ? ret.column - startCursor.column + startColumn
                    : ret.column + 1;
                const retEndColumn = retStartColumn + m[0].length;
                result[resultLen++] = createFindMatch(new Range(startLineNumber + lineFeedCnt, retStartColumn, startLineNumber + lineFeedCnt, retEndColumn), m, captureMatches);
                if (offsetInBuffer(m.index) + m[0].length >= end) {
                    return resultLen;
                }
                if (resultLen >= limitResultCount) {
                    return resultLen;
                }
            }
        } while (m);
        return resultLen;
    }
    findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount) {
        const result = [];
        let resultLen = 0;
        const searcher = new Searcher(searchData.wordSeparators, searchData.regex);
        let startPosition = this.nodeAt2(searchRange.startLineNumber, searchRange.startColumn);
        if (startPosition === null) {
            return [];
        }
        const endPosition = this.nodeAt2(searchRange.endLineNumber, searchRange.endColumn);
        if (endPosition === null) {
            return [];
        }
        let start = this.positionInBuffer(startPosition.node, startPosition.remainder);
        const end = this.positionInBuffer(endPosition.node, endPosition.remainder);
        if (startPosition.node === endPosition.node) {
            this.findMatchesInNode(startPosition.node, searcher, searchRange.startLineNumber, searchRange.startColumn, start, end, searchData, captureMatches, limitResultCount, resultLen, result);
            return result;
        }
        let startLineNumber = searchRange.startLineNumber;
        let currentNode = startPosition.node;
        while (currentNode !== endPosition.node) {
            const lineBreakCnt = this.getLineFeedCnt(currentNode.piece.bufferIndex, start, currentNode.piece.end);
            if (lineBreakCnt >= 1) {
                // last line break position
                const lineStarts = this._buffers[currentNode.piece.bufferIndex].lineStarts;
                const startOffsetInBuffer = this.offsetInBuffer(currentNode.piece.bufferIndex, currentNode.piece.start);
                const nextLineStartOffset = lineStarts[start.line + lineBreakCnt];
                const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn : 1;
                resultLen = this.findMatchesInNode(currentNode, searcher, startLineNumber, startColumn, start, this.positionInBuffer(currentNode, nextLineStartOffset - startOffsetInBuffer), searchData, captureMatches, limitResultCount, resultLen, result);
                if (resultLen >= limitResultCount) {
                    return result;
                }
                startLineNumber += lineBreakCnt;
            }
            const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn - 1 : 0;
            // search for the remaining content
            if (startLineNumber === searchRange.endLineNumber) {
                const text = this.getLineContent(startLineNumber).substring(startColumn, searchRange.endColumn - 1);
                resultLen = this._findMatchesInLine(searchData, searcher, text, searchRange.endLineNumber, startColumn, resultLen, result, captureMatches, limitResultCount);
                return result;
            }
            resultLen = this._findMatchesInLine(searchData, searcher, this.getLineContent(startLineNumber).substr(startColumn), startLineNumber, startColumn, resultLen, result, captureMatches, limitResultCount);
            if (resultLen >= limitResultCount) {
                return result;
            }
            startLineNumber++;
            startPosition = this.nodeAt2(startLineNumber, 1);
            currentNode = startPosition.node;
            start = this.positionInBuffer(startPosition.node, startPosition.remainder);
        }
        if (startLineNumber === searchRange.endLineNumber) {
            const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn - 1 : 0;
            const text = this.getLineContent(startLineNumber).substring(startColumn, searchRange.endColumn - 1);
            resultLen = this._findMatchesInLine(searchData, searcher, text, searchRange.endLineNumber, startColumn, resultLen, result, captureMatches, limitResultCount);
            return result;
        }
        const startColumn = startLineNumber === searchRange.startLineNumber ? searchRange.startColumn : 1;
        resultLen = this.findMatchesInNode(endPosition.node, searcher, startLineNumber, startColumn, start, end, searchData, captureMatches, limitResultCount, resultLen, result);
        return result;
    }
    _findMatchesInLine(searchData, searcher, text, lineNumber, deltaOffset, resultLen, result, captureMatches, limitResultCount) {
        const wordSeparators = searchData.wordSeparators;
        if (!captureMatches && searchData.simpleSearch) {
            const searchString = searchData.simpleSearch;
            const searchStringLen = searchString.length;
            const textLength = text.length;
            let lastMatchIndex = -searchStringLen;
            while ((lastMatchIndex = text.indexOf(searchString, lastMatchIndex + searchStringLen)) !== -1) {
                if (!wordSeparators ||
                    isValidMatch(wordSeparators, text, textLength, lastMatchIndex, searchStringLen)) {
                    result[resultLen++] = new FindMatch(new Range(lineNumber, lastMatchIndex + 1 + deltaOffset, lineNumber, lastMatchIndex + 1 + searchStringLen + deltaOffset), null);
                    if (resultLen >= limitResultCount) {
                        return resultLen;
                    }
                }
            }
            return resultLen;
        }
        let m;
        // Reset regex to search from the beginning
        searcher.reset(0);
        do {
            m = searcher.next(text);
            if (m) {
                result[resultLen++] = createFindMatch(new Range(lineNumber, m.index + 1 + deltaOffset, lineNumber, m.index + 1 + m[0].length + deltaOffset), m, captureMatches);
                if (resultLen >= limitResultCount) {
                    return resultLen;
                }
            }
        } while (m);
        return resultLen;
    }
    // #endregion
    // #region Piece Table
    insert(offset, value, eolNormalized = false) {
        this._EOLNormalized = this._EOLNormalized && eolNormalized;
        this._lastVisitedLine.lineNumber = 0;
        this._lastVisitedLine.value = '';
        if (this.root !== SENTINEL) {
            const { node, remainder, nodeStartOffset } = this.nodeAt(offset);
            const piece = node.piece;
            const bufferIndex = piece.bufferIndex;
            const insertPosInBuffer = this.positionInBuffer(node, remainder);
            if (node.piece.bufferIndex === 0 &&
                piece.end.line === this._lastChangeBufferPos.line &&
                piece.end.column === this._lastChangeBufferPos.column &&
                nodeStartOffset + piece.length === offset &&
                value.length < AverageBufferSize) {
                // changed buffer
                this.appendToNode(node, value);
                this.computeBufferMetadata();
                return;
            }
            if (nodeStartOffset === offset) {
                this.insertContentToNodeLeft(value, node);
                this._searchCache.validate(offset);
            }
            else if (nodeStartOffset + node.piece.length > offset) {
                // we are inserting into the middle of a node.
                const nodesToDel = [];
                let newRightPiece = new Piece(piece.bufferIndex, insertPosInBuffer, piece.end, this.getLineFeedCnt(piece.bufferIndex, insertPosInBuffer, piece.end), this.offsetInBuffer(bufferIndex, piece.end) -
                    this.offsetInBuffer(bufferIndex, insertPosInBuffer));
                if (this.shouldCheckCRLF() && this.endWithCR(value)) {
                    const headOfRight = this.nodeCharCodeAt(node, remainder);
                    if (headOfRight === 10 /** \n */) {
                        const newStart = { line: newRightPiece.start.line + 1, column: 0 };
                        newRightPiece = new Piece(newRightPiece.bufferIndex, newStart, newRightPiece.end, this.getLineFeedCnt(newRightPiece.bufferIndex, newStart, newRightPiece.end), newRightPiece.length - 1);
                        value += '\n';
                    }
                }
                // reuse node for content before insertion point.
                if (this.shouldCheckCRLF() && this.startWithLF(value)) {
                    const tailOfLeft = this.nodeCharCodeAt(node, remainder - 1);
                    if (tailOfLeft === 13 /** \r */) {
                        const previousPos = this.positionInBuffer(node, remainder - 1);
                        this.deleteNodeTail(node, previousPos);
                        value = '\r' + value;
                        if (node.piece.length === 0) {
                            nodesToDel.push(node);
                        }
                    }
                    else {
                        this.deleteNodeTail(node, insertPosInBuffer);
                    }
                }
                else {
                    this.deleteNodeTail(node, insertPosInBuffer);
                }
                const newPieces = this.createNewPieces(value);
                if (newRightPiece.length > 0) {
                    this.rbInsertRight(node, newRightPiece);
                }
                let tmpNode = node;
                for (let k = 0; k < newPieces.length; k++) {
                    tmpNode = this.rbInsertRight(tmpNode, newPieces[k]);
                }
                this.deleteNodes(nodesToDel);
            }
            else {
                this.insertContentToNodeRight(value, node);
            }
        }
        else {
            // insert new node
            const pieces = this.createNewPieces(value);
            let node = this.rbInsertLeft(null, pieces[0]);
            for (let k = 1; k < pieces.length; k++) {
                node = this.rbInsertRight(node, pieces[k]);
            }
        }
        // todo, this is too brutal. Total line feed count should be updated the same way as lf_left.
        this.computeBufferMetadata();
    }
    delete(offset, cnt) {
        this._lastVisitedLine.lineNumber = 0;
        this._lastVisitedLine.value = '';
        if (cnt <= 0 || this.root === SENTINEL) {
            return;
        }
        const startPosition = this.nodeAt(offset);
        const endPosition = this.nodeAt(offset + cnt);
        const startNode = startPosition.node;
        const endNode = endPosition.node;
        if (startNode === endNode) {
            const startSplitPosInBuffer = this.positionInBuffer(startNode, startPosition.remainder);
            const endSplitPosInBuffer = this.positionInBuffer(startNode, endPosition.remainder);
            if (startPosition.nodeStartOffset === offset) {
                if (cnt === startNode.piece.length) {
                    // delete node
                    const next = startNode.next();
                    rbDelete(this, startNode);
                    this.validateCRLFWithPrevNode(next);
                    this.computeBufferMetadata();
                    return;
                }
                this.deleteNodeHead(startNode, endSplitPosInBuffer);
                this._searchCache.validate(offset);
                this.validateCRLFWithPrevNode(startNode);
                this.computeBufferMetadata();
                return;
            }
            if (startPosition.nodeStartOffset + startNode.piece.length === offset + cnt) {
                this.deleteNodeTail(startNode, startSplitPosInBuffer);
                this.validateCRLFWithNextNode(startNode);
                this.computeBufferMetadata();
                return;
            }
            // delete content in the middle, this node will be splitted to nodes
            this.shrinkNode(startNode, startSplitPosInBuffer, endSplitPosInBuffer);
            this.computeBufferMetadata();
            return;
        }
        const nodesToDel = [];
        const startSplitPosInBuffer = this.positionInBuffer(startNode, startPosition.remainder);
        this.deleteNodeTail(startNode, startSplitPosInBuffer);
        this._searchCache.validate(offset);
        if (startNode.piece.length === 0) {
            nodesToDel.push(startNode);
        }
        // update last touched node
        const endSplitPosInBuffer = this.positionInBuffer(endNode, endPosition.remainder);
        this.deleteNodeHead(endNode, endSplitPosInBuffer);
        if (endNode.piece.length === 0) {
            nodesToDel.push(endNode);
        }
        // delete nodes in between
        const secondNode = startNode.next();
        for (let node = secondNode; node !== SENTINEL && node !== endNode; node = node.next()) {
            nodesToDel.push(node);
        }
        const prev = startNode.piece.length === 0 ? startNode.prev() : startNode;
        this.deleteNodes(nodesToDel);
        this.validateCRLFWithNextNode(prev);
        this.computeBufferMetadata();
    }
    insertContentToNodeLeft(value, node) {
        // we are inserting content to the beginning of node
        const nodesToDel = [];
        if (this.shouldCheckCRLF() && this.endWithCR(value) && this.startWithLF(node)) {
            // move `\n` to new node.
            const piece = node.piece;
            const newStart = { line: piece.start.line + 1, column: 0 };
            const nPiece = new Piece(piece.bufferIndex, newStart, piece.end, this.getLineFeedCnt(piece.bufferIndex, newStart, piece.end), piece.length - 1);
            node.piece = nPiece;
            value += '\n';
            updateTreeMetadata(this, node, -1, -1);
            if (node.piece.length === 0) {
                nodesToDel.push(node);
            }
        }
        const newPieces = this.createNewPieces(value);
        let newNode = this.rbInsertLeft(node, newPieces[newPieces.length - 1]);
        for (let k = newPieces.length - 2; k >= 0; k--) {
            newNode = this.rbInsertLeft(newNode, newPieces[k]);
        }
        this.validateCRLFWithPrevNode(newNode);
        this.deleteNodes(nodesToDel);
    }
    insertContentToNodeRight(value, node) {
        // we are inserting to the right of this node.
        if (this.adjustCarriageReturnFromNext(value, node)) {
            // move \n to the new node.
            value += '\n';
        }
        const newPieces = this.createNewPieces(value);
        const newNode = this.rbInsertRight(node, newPieces[0]);
        let tmpNode = newNode;
        for (let k = 1; k < newPieces.length; k++) {
            tmpNode = this.rbInsertRight(tmpNode, newPieces[k]);
        }
        this.validateCRLFWithPrevNode(newNode);
    }
    positionInBuffer(node, remainder, ret) {
        const piece = node.piece;
        const bufferIndex = node.piece.bufferIndex;
        const lineStarts = this._buffers[bufferIndex].lineStarts;
        const startOffset = lineStarts[piece.start.line] + piece.start.column;
        const offset = startOffset + remainder;
        // binary search offset between startOffset and endOffset
        let low = piece.start.line;
        let high = piece.end.line;
        let mid = 0;
        let midStop = 0;
        let midStart = 0;
        while (low <= high) {
            mid = (low + (high - low) / 2) | 0;
            midStart = lineStarts[mid];
            if (mid === high) {
                break;
            }
            midStop = lineStarts[mid + 1];
            if (offset < midStart) {
                high = mid - 1;
            }
            else if (offset >= midStop) {
                low = mid + 1;
            }
            else {
                break;
            }
        }
        if (ret) {
            ret.line = mid;
            ret.column = offset - midStart;
            return null;
        }
        return {
            line: mid,
            column: offset - midStart,
        };
    }
    getLineFeedCnt(bufferIndex, start, end) {
        // we don't need to worry about start: abc\r|\n, or abc|\r, or abc|\n, or abc|\r\n doesn't change the fact that, there is one line break after start.
        // now let's take care of end: abc\r|\n, if end is in between \r and \n, we need to add line feed count by 1
        if (end.column === 0) {
            return end.line - start.line;
        }
        const lineStarts = this._buffers[bufferIndex].lineStarts;
        if (end.line === lineStarts.length - 1) {
            // it means, there is no \n after end, otherwise, there will be one more lineStart.
            return end.line - start.line;
        }
        const nextLineStartOffset = lineStarts[end.line + 1];
        const endOffset = lineStarts[end.line] + end.column;
        if (nextLineStartOffset > endOffset + 1) {
            // there are more than 1 character after end, which means it can't be \n
            return end.line - start.line;
        }
        // endOffset + 1 === nextLineStartOffset
        // character at endOffset is \n, so we check the character before first
        // if character at endOffset is \r, end.column is 0 and we can't get here.
        const previousCharOffset = endOffset - 1; // end.column > 0 so it's okay.
        const buffer = this._buffers[bufferIndex].buffer;
        if (buffer.charCodeAt(previousCharOffset) === 13) {
            return end.line - start.line + 1;
        }
        else {
            return end.line - start.line;
        }
    }
    offsetInBuffer(bufferIndex, cursor) {
        const lineStarts = this._buffers[bufferIndex].lineStarts;
        return lineStarts[cursor.line] + cursor.column;
    }
    deleteNodes(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            rbDelete(this, nodes[i]);
        }
    }
    createNewPieces(text) {
        if (text.length > AverageBufferSize) {
            // the content is large, operations like substring, charCode becomes slow
            // so here we split it into smaller chunks, just like what we did for CR/LF normalization
            const newPieces = [];
            while (text.length > AverageBufferSize) {
                const lastChar = text.charCodeAt(AverageBufferSize - 1);
                let splitText;
                if (lastChar === 13 /* CharCode.CarriageReturn */ || (lastChar >= 0xd800 && lastChar <= 0xdbff)) {
                    // last character is \r or a high surrogate => keep it back
                    splitText = text.substring(0, AverageBufferSize - 1);
                    text = text.substring(AverageBufferSize - 1);
                }
                else {
                    splitText = text.substring(0, AverageBufferSize);
                    text = text.substring(AverageBufferSize);
                }
                const lineStarts = createLineStartsFast(splitText);
                newPieces.push(new Piece(this._buffers.length /* buffer index */, { line: 0, column: 0 }, {
                    line: lineStarts.length - 1,
                    column: splitText.length - lineStarts[lineStarts.length - 1],
                }, lineStarts.length - 1, splitText.length));
                this._buffers.push(new StringBuffer(splitText, lineStarts));
            }
            const lineStarts = createLineStartsFast(text);
            newPieces.push(new Piece(this._buffers.length /* buffer index */, { line: 0, column: 0 }, { line: lineStarts.length - 1, column: text.length - lineStarts[lineStarts.length - 1] }, lineStarts.length - 1, text.length));
            this._buffers.push(new StringBuffer(text, lineStarts));
            return newPieces;
        }
        let startOffset = this._buffers[0].buffer.length;
        const lineStarts = createLineStartsFast(text, false);
        let start = this._lastChangeBufferPos;
        if (this._buffers[0].lineStarts[this._buffers[0].lineStarts.length - 1] === startOffset &&
            startOffset !== 0 &&
            this.startWithLF(text) &&
            this.endWithCR(this._buffers[0].buffer) // todo, we can check this._lastChangeBufferPos's column as it's the last one
        ) {
            this._lastChangeBufferPos = {
                line: this._lastChangeBufferPos.line,
                column: this._lastChangeBufferPos.column + 1,
            };
            start = this._lastChangeBufferPos;
            for (let i = 0; i < lineStarts.length; i++) {
                lineStarts[i] += startOffset + 1;
            }
            this._buffers[0].lineStarts = this._buffers[0].lineStarts.concat(lineStarts.slice(1));
            this._buffers[0].buffer += '_' + text;
            startOffset += 1;
        }
        else {
            if (startOffset !== 0) {
                for (let i = 0; i < lineStarts.length; i++) {
                    lineStarts[i] += startOffset;
                }
            }
            this._buffers[0].lineStarts = this._buffers[0].lineStarts.concat(lineStarts.slice(1));
            this._buffers[0].buffer += text;
        }
        const endOffset = this._buffers[0].buffer.length;
        const endIndex = this._buffers[0].lineStarts.length - 1;
        const endColumn = endOffset - this._buffers[0].lineStarts[endIndex];
        const endPos = { line: endIndex, column: endColumn };
        const newPiece = new Piece(0 /** todo@peng */, start, endPos, this.getLineFeedCnt(0, start, endPos), endOffset - startOffset);
        this._lastChangeBufferPos = endPos;
        return [newPiece];
    }
    getLinesRawContent() {
        return this.getContentOfSubTree(this.root);
    }
    getLineRawContent(lineNumber, endOffset = 0) {
        let x = this.root;
        let ret = '';
        const cache = this._searchCache.get2(lineNumber);
        if (cache) {
            x = cache.node;
            const prevAccumulatedValue = this.getAccumulatedValue(x, lineNumber - cache.nodeStartLineNumber - 1);
            const buffer = this._buffers[x.piece.bufferIndex].buffer;
            const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
            if (cache.nodeStartLineNumber + x.piece.lineFeedCnt === lineNumber) {
                ret = buffer.substring(startOffset + prevAccumulatedValue, startOffset + x.piece.length);
            }
            else {
                const accumulatedValue = this.getAccumulatedValue(x, lineNumber - cache.nodeStartLineNumber);
                return buffer.substring(startOffset + prevAccumulatedValue, startOffset + accumulatedValue - endOffset);
            }
        }
        else {
            let nodeStartOffset = 0;
            const originalLineNumber = lineNumber;
            while (x !== SENTINEL) {
                if (x.left !== SENTINEL && x.lf_left >= lineNumber - 1) {
                    x = x.left;
                }
                else if (x.lf_left + x.piece.lineFeedCnt > lineNumber - 1) {
                    const prevAccumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                    const accumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 1);
                    const buffer = this._buffers[x.piece.bufferIndex].buffer;
                    const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                    nodeStartOffset += x.size_left;
                    this._searchCache.set({
                        node: x,
                        nodeStartOffset,
                        nodeStartLineNumber: originalLineNumber - (lineNumber - 1 - x.lf_left),
                    });
                    return buffer.substring(startOffset + prevAccumulatedValue, startOffset + accumulatedValue - endOffset);
                }
                else if (x.lf_left + x.piece.lineFeedCnt === lineNumber - 1) {
                    const prevAccumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                    const buffer = this._buffers[x.piece.bufferIndex].buffer;
                    const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                    ret = buffer.substring(startOffset + prevAccumulatedValue, startOffset + x.piece.length);
                    break;
                }
                else {
                    lineNumber -= x.lf_left + x.piece.lineFeedCnt;
                    nodeStartOffset += x.size_left + x.piece.length;
                    x = x.right;
                }
            }
        }
        // search in order, to find the node contains end column
        x = x.next();
        while (x !== SENTINEL) {
            const buffer = this._buffers[x.piece.bufferIndex].buffer;
            if (x.piece.lineFeedCnt > 0) {
                const accumulatedValue = this.getAccumulatedValue(x, 0);
                const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                ret += buffer.substring(startOffset, startOffset + accumulatedValue - endOffset);
                return ret;
            }
            else {
                const startOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.start);
                ret += buffer.substr(startOffset, x.piece.length);
            }
            x = x.next();
        }
        return ret;
    }
    computeBufferMetadata() {
        let x = this.root;
        let lfCnt = 1;
        let len = 0;
        while (x !== SENTINEL) {
            lfCnt += x.lf_left + x.piece.lineFeedCnt;
            len += x.size_left + x.piece.length;
            x = x.right;
        }
        this._lineCnt = lfCnt;
        this._length = len;
        this._searchCache.validate(this._length);
    }
    // #region node operations
    getIndexOf(node, accumulatedValue) {
        const piece = node.piece;
        const pos = this.positionInBuffer(node, accumulatedValue);
        const lineCnt = pos.line - piece.start.line;
        if (this.offsetInBuffer(piece.bufferIndex, piece.end) -
            this.offsetInBuffer(piece.bufferIndex, piece.start) ===
            accumulatedValue) {
            // we are checking the end of this node, so a CRLF check is necessary.
            const realLineCnt = this.getLineFeedCnt(node.piece.bufferIndex, piece.start, pos);
            if (realLineCnt !== lineCnt) {
                // aha yes, CRLF
                return { index: realLineCnt, remainder: 0 };
            }
        }
        return { index: lineCnt, remainder: pos.column };
    }
    getAccumulatedValue(node, index) {
        if (index < 0) {
            return 0;
        }
        const piece = node.piece;
        const lineStarts = this._buffers[piece.bufferIndex].lineStarts;
        const expectedLineStartIndex = piece.start.line + index + 1;
        if (expectedLineStartIndex > piece.end.line) {
            return (lineStarts[piece.end.line] +
                piece.end.column -
                lineStarts[piece.start.line] -
                piece.start.column);
        }
        else {
            return lineStarts[expectedLineStartIndex] - lineStarts[piece.start.line] - piece.start.column;
        }
    }
    deleteNodeTail(node, pos) {
        const piece = node.piece;
        const originalLFCnt = piece.lineFeedCnt;
        const originalEndOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
        const newEnd = pos;
        const newEndOffset = this.offsetInBuffer(piece.bufferIndex, newEnd);
        const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, piece.start, newEnd);
        const lf_delta = newLineFeedCnt - originalLFCnt;
        const size_delta = newEndOffset - originalEndOffset;
        const newLength = piece.length + size_delta;
        node.piece = new Piece(piece.bufferIndex, piece.start, newEnd, newLineFeedCnt, newLength);
        updateTreeMetadata(this, node, size_delta, lf_delta);
    }
    deleteNodeHead(node, pos) {
        const piece = node.piece;
        const originalLFCnt = piece.lineFeedCnt;
        const originalStartOffset = this.offsetInBuffer(piece.bufferIndex, piece.start);
        const newStart = pos;
        const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, newStart, piece.end);
        const newStartOffset = this.offsetInBuffer(piece.bufferIndex, newStart);
        const lf_delta = newLineFeedCnt - originalLFCnt;
        const size_delta = originalStartOffset - newStartOffset;
        const newLength = piece.length + size_delta;
        node.piece = new Piece(piece.bufferIndex, newStart, piece.end, newLineFeedCnt, newLength);
        updateTreeMetadata(this, node, size_delta, lf_delta);
    }
    shrinkNode(node, start, end) {
        const piece = node.piece;
        const originalStartPos = piece.start;
        const originalEndPos = piece.end;
        // old piece, originalStartPos, start
        const oldLength = piece.length;
        const oldLFCnt = piece.lineFeedCnt;
        const newEnd = start;
        const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, piece.start, newEnd);
        const newLength = this.offsetInBuffer(piece.bufferIndex, start) -
            this.offsetInBuffer(piece.bufferIndex, originalStartPos);
        node.piece = new Piece(piece.bufferIndex, piece.start, newEnd, newLineFeedCnt, newLength);
        updateTreeMetadata(this, node, newLength - oldLength, newLineFeedCnt - oldLFCnt);
        // new right piece, end, originalEndPos
        const newPiece = new Piece(piece.bufferIndex, end, originalEndPos, this.getLineFeedCnt(piece.bufferIndex, end, originalEndPos), this.offsetInBuffer(piece.bufferIndex, originalEndPos) -
            this.offsetInBuffer(piece.bufferIndex, end));
        const newNode = this.rbInsertRight(node, newPiece);
        this.validateCRLFWithPrevNode(newNode);
    }
    appendToNode(node, value) {
        if (this.adjustCarriageReturnFromNext(value, node)) {
            value += '\n';
        }
        const hitCRLF = this.shouldCheckCRLF() && this.startWithLF(value) && this.endWithCR(node);
        const startOffset = this._buffers[0].buffer.length;
        this._buffers[0].buffer += value;
        const lineStarts = createLineStartsFast(value, false);
        for (let i = 0; i < lineStarts.length; i++) {
            lineStarts[i] += startOffset;
        }
        if (hitCRLF) {
            const prevStartOffset = this._buffers[0].lineStarts[this._buffers[0].lineStarts.length - 2];
            this._buffers[0].lineStarts.pop();
            // _lastChangeBufferPos is already wrong
            this._lastChangeBufferPos = {
                line: this._lastChangeBufferPos.line - 1,
                column: startOffset - prevStartOffset,
            };
        }
        this._buffers[0].lineStarts = this._buffers[0].lineStarts.concat(lineStarts.slice(1));
        const endIndex = this._buffers[0].lineStarts.length - 1;
        const endColumn = this._buffers[0].buffer.length - this._buffers[0].lineStarts[endIndex];
        const newEnd = { line: endIndex, column: endColumn };
        const newLength = node.piece.length + value.length;
        const oldLineFeedCnt = node.piece.lineFeedCnt;
        const newLineFeedCnt = this.getLineFeedCnt(0, node.piece.start, newEnd);
        const lf_delta = newLineFeedCnt - oldLineFeedCnt;
        node.piece = new Piece(node.piece.bufferIndex, node.piece.start, newEnd, newLineFeedCnt, newLength);
        this._lastChangeBufferPos = newEnd;
        updateTreeMetadata(this, node, value.length, lf_delta);
    }
    nodeAt(offset) {
        let x = this.root;
        const cache = this._searchCache.get(offset);
        if (cache) {
            return {
                node: cache.node,
                nodeStartOffset: cache.nodeStartOffset,
                remainder: offset - cache.nodeStartOffset,
            };
        }
        let nodeStartOffset = 0;
        while (x !== SENTINEL) {
            if (x.size_left > offset) {
                x = x.left;
            }
            else if (x.size_left + x.piece.length >= offset) {
                nodeStartOffset += x.size_left;
                const ret = {
                    node: x,
                    remainder: offset - x.size_left,
                    nodeStartOffset,
                };
                this._searchCache.set(ret);
                return ret;
            }
            else {
                offset -= x.size_left + x.piece.length;
                nodeStartOffset += x.size_left + x.piece.length;
                x = x.right;
            }
        }
        return null;
    }
    nodeAt2(lineNumber, column) {
        let x = this.root;
        let nodeStartOffset = 0;
        while (x !== SENTINEL) {
            if (x.left !== SENTINEL && x.lf_left >= lineNumber - 1) {
                x = x.left;
            }
            else if (x.lf_left + x.piece.lineFeedCnt > lineNumber - 1) {
                const prevAccumualtedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                const accumulatedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 1);
                nodeStartOffset += x.size_left;
                return {
                    node: x,
                    remainder: Math.min(prevAccumualtedValue + column - 1, accumulatedValue),
                    nodeStartOffset,
                };
            }
            else if (x.lf_left + x.piece.lineFeedCnt === lineNumber - 1) {
                const prevAccumualtedValue = this.getAccumulatedValue(x, lineNumber - x.lf_left - 2);
                if (prevAccumualtedValue + column - 1 <= x.piece.length) {
                    return {
                        node: x,
                        remainder: prevAccumualtedValue + column - 1,
                        nodeStartOffset,
                    };
                }
                else {
                    column -= x.piece.length - prevAccumualtedValue;
                    break;
                }
            }
            else {
                lineNumber -= x.lf_left + x.piece.lineFeedCnt;
                nodeStartOffset += x.size_left + x.piece.length;
                x = x.right;
            }
        }
        // search in order, to find the node contains position.column
        x = x.next();
        while (x !== SENTINEL) {
            if (x.piece.lineFeedCnt > 0) {
                const accumulatedValue = this.getAccumulatedValue(x, 0);
                const nodeStartOffset = this.offsetOfNode(x);
                return {
                    node: x,
                    remainder: Math.min(column - 1, accumulatedValue),
                    nodeStartOffset,
                };
            }
            else {
                if (x.piece.length >= column - 1) {
                    const nodeStartOffset = this.offsetOfNode(x);
                    return {
                        node: x,
                        remainder: column - 1,
                        nodeStartOffset,
                    };
                }
                else {
                    column -= x.piece.length;
                }
            }
            x = x.next();
        }
        return null;
    }
    nodeCharCodeAt(node, offset) {
        if (node.piece.lineFeedCnt < 1) {
            return -1;
        }
        const buffer = this._buffers[node.piece.bufferIndex];
        const newOffset = this.offsetInBuffer(node.piece.bufferIndex, node.piece.start) + offset;
        return buffer.buffer.charCodeAt(newOffset);
    }
    offsetOfNode(node) {
        if (!node) {
            return 0;
        }
        let pos = node.size_left;
        while (node !== this.root) {
            if (node.parent.right === node) {
                pos += node.parent.size_left + node.parent.piece.length;
            }
            node = node.parent;
        }
        return pos;
    }
    // #endregion
    // #region CRLF
    shouldCheckCRLF() {
        return !(this._EOLNormalized && this._EOL === '\n');
    }
    startWithLF(val) {
        if (typeof val === 'string') {
            return val.charCodeAt(0) === 10;
        }
        if (val === SENTINEL || val.piece.lineFeedCnt === 0) {
            return false;
        }
        const piece = val.piece;
        const lineStarts = this._buffers[piece.bufferIndex].lineStarts;
        const line = piece.start.line;
        const startOffset = lineStarts[line] + piece.start.column;
        if (line === lineStarts.length - 1) {
            // last line, so there is no line feed at the end of this line
            return false;
        }
        const nextLineOffset = lineStarts[line + 1];
        if (nextLineOffset > startOffset + 1) {
            return false;
        }
        return this._buffers[piece.bufferIndex].buffer.charCodeAt(startOffset) === 10;
    }
    endWithCR(val) {
        if (typeof val === 'string') {
            return val.charCodeAt(val.length - 1) === 13;
        }
        if (val === SENTINEL || val.piece.lineFeedCnt === 0) {
            return false;
        }
        return this.nodeCharCodeAt(val, val.piece.length - 1) === 13;
    }
    validateCRLFWithPrevNode(nextNode) {
        if (this.shouldCheckCRLF() && this.startWithLF(nextNode)) {
            const node = nextNode.prev();
            if (this.endWithCR(node)) {
                this.fixCRLF(node, nextNode);
            }
        }
    }
    validateCRLFWithNextNode(node) {
        if (this.shouldCheckCRLF() && this.endWithCR(node)) {
            const nextNode = node.next();
            if (this.startWithLF(nextNode)) {
                this.fixCRLF(node, nextNode);
            }
        }
    }
    fixCRLF(prev, next) {
        const nodesToDel = [];
        // update node
        const lineStarts = this._buffers[prev.piece.bufferIndex].lineStarts;
        let newEnd;
        if (prev.piece.end.column === 0) {
            // it means, last line ends with \r, not \r\n
            newEnd = {
                line: prev.piece.end.line - 1,
                column: lineStarts[prev.piece.end.line] - lineStarts[prev.piece.end.line - 1] - 1,
            };
        }
        else {
            // \r\n
            newEnd = { line: prev.piece.end.line, column: prev.piece.end.column - 1 };
        }
        const prevNewLength = prev.piece.length - 1;
        const prevNewLFCnt = prev.piece.lineFeedCnt - 1;
        prev.piece = new Piece(prev.piece.bufferIndex, prev.piece.start, newEnd, prevNewLFCnt, prevNewLength);
        updateTreeMetadata(this, prev, -1, -1);
        if (prev.piece.length === 0) {
            nodesToDel.push(prev);
        }
        // update nextNode
        const newStart = { line: next.piece.start.line + 1, column: 0 };
        const newLength = next.piece.length - 1;
        const newLineFeedCnt = this.getLineFeedCnt(next.piece.bufferIndex, newStart, next.piece.end);
        next.piece = new Piece(next.piece.bufferIndex, newStart, next.piece.end, newLineFeedCnt, newLength);
        updateTreeMetadata(this, next, -1, -1);
        if (next.piece.length === 0) {
            nodesToDel.push(next);
        }
        // create new piece which contains \r\n
        const pieces = this.createNewPieces('\r\n');
        this.rbInsertRight(prev, pieces[0]);
        // delete empty nodes
        for (let i = 0; i < nodesToDel.length; i++) {
            rbDelete(this, nodesToDel[i]);
        }
    }
    adjustCarriageReturnFromNext(value, node) {
        if (this.shouldCheckCRLF() && this.endWithCR(value)) {
            const nextNode = node.next();
            if (this.startWithLF(nextNode)) {
                // move `\n` forward
                value += '\n';
                if (nextNode.piece.length === 1) {
                    rbDelete(this, nextNode);
                }
                else {
                    const piece = nextNode.piece;
                    const newStart = { line: piece.start.line + 1, column: 0 };
                    const newLength = piece.length - 1;
                    const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, newStart, piece.end);
                    nextNode.piece = new Piece(piece.bufferIndex, newStart, piece.end, newLineFeedCnt, newLength);
                    updateTreeMetadata(this, nextNode, -1, -1);
                }
                return true;
            }
        }
        return false;
    }
    // #endregion
    // #endregion
    // #region Tree operations
    iterate(node, callback) {
        if (node === SENTINEL) {
            return callback(SENTINEL);
        }
        const leftRet = this.iterate(node.left, callback);
        if (!leftRet) {
            return leftRet;
        }
        return callback(node) && this.iterate(node.right, callback);
    }
    getNodeContent(node) {
        if (node === SENTINEL) {
            return '';
        }
        const buffer = this._buffers[node.piece.bufferIndex];
        const piece = node.piece;
        const startOffset = this.offsetInBuffer(piece.bufferIndex, piece.start);
        const endOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
        const currentContent = buffer.buffer.substring(startOffset, endOffset);
        return currentContent;
    }
    getPieceContent(piece) {
        const buffer = this._buffers[piece.bufferIndex];
        const startOffset = this.offsetInBuffer(piece.bufferIndex, piece.start);
        const endOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
        const currentContent = buffer.buffer.substring(startOffset, endOffset);
        return currentContent;
    }
    /**
     *      node              node
     *     /  \              /  \
     *    a   b    <----   a    b
     *                         /
     *                        z
     */
    rbInsertRight(node, p) {
        const z = new TreeNode(p, 1 /* NodeColor.Red */);
        z.left = SENTINEL;
        z.right = SENTINEL;
        z.parent = SENTINEL;
        z.size_left = 0;
        z.lf_left = 0;
        const x = this.root;
        if (x === SENTINEL) {
            this.root = z;
            z.color = 0 /* NodeColor.Black */;
        }
        else if (node.right === SENTINEL) {
            node.right = z;
            z.parent = node;
        }
        else {
            const nextNode = leftest(node.right);
            nextNode.left = z;
            z.parent = nextNode;
        }
        fixInsert(this, z);
        return z;
    }
    /**
     *      node              node
     *     /  \              /  \
     *    a   b     ---->   a    b
     *                       \
     *                        z
     */
    rbInsertLeft(node, p) {
        const z = new TreeNode(p, 1 /* NodeColor.Red */);
        z.left = SENTINEL;
        z.right = SENTINEL;
        z.parent = SENTINEL;
        z.size_left = 0;
        z.lf_left = 0;
        if (this.root === SENTINEL) {
            this.root = z;
            z.color = 0 /* NodeColor.Black */;
        }
        else if (node.left === SENTINEL) {
            node.left = z;
            z.parent = node;
        }
        else {
            const prevNode = righttest(node.left); // a
            prevNode.right = z;
            z.parent = prevNode;
        }
        fixInsert(this, z);
        return z;
    }
    getContentOfSubTree(node) {
        let str = '';
        this.iterate(node, (node) => {
            str += this.getNodeContent(node);
            return true;
        });
        return str;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWwvcGllY2VUcmVlVGV4dEJ1ZmZlci9waWVjZVRyZWVCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDM0MsT0FBTyxFQUFFLFNBQVMsRUFBNkIsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNyRSxPQUFPLEVBRU4sUUFBUSxFQUNSLFFBQVEsRUFDUixTQUFTLEVBQ1QsT0FBTyxFQUNQLFFBQVEsRUFDUixTQUFTLEVBQ1Qsa0JBQWtCLEdBQ2xCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFL0UsNkNBQTZDO0FBQzdDLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxDQUFBO0FBRS9CLFNBQVMsZUFBZSxDQUFDLEdBQWE7SUFDckMsSUFBSSxDQUFDLENBQUE7SUFDTCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssRUFBRSxDQUFDO1FBQ2pDLENBQUMsR0FBRyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDaEMsQ0FBQztTQUFNLENBQUM7UUFDUCxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFDRCxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNiLE9BQU8sQ0FBQyxDQUFBO0FBQ1QsQ0FBQztBQUVE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