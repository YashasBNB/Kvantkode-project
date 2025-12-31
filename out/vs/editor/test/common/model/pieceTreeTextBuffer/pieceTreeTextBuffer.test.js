/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { WordCharacterClassifier } from '../../../../common/core/wordCharacterClassifier.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SearchData } from '../../../../common/model.js';
import { PieceTreeTextBufferBuilder } from '../../../../common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder.js';
import { SENTINEL, } from '../../../../common/model/pieceTreeTextBuffer/rbTreeBase.js';
import { createTextModel } from '../../testTextModel.js';
import { splitLines } from '../../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\r\n';
function randomChar() {
    return alphabet[randomInt(alphabet.length)];
}
function randomInt(bound) {
    return Math.floor(Math.random() * bound);
}
function randomStr(len) {
    if (len === null) {
        len = 10;
    }
    return (function () {
        let j, ref;
        const results = [];
        for (j = 1, ref = len; 1 <= ref ? j < ref : j > ref; 1 <= ref ? j++ : j--) {
            results.push(randomChar());
        }
        return results;
    })().join('');
}
function trimLineFeed(text) {
    if (text.length === 0) {
        return text;
    }
    if (text.length === 1) {
        if (text.charCodeAt(text.length - 1) === 10 || text.charCodeAt(text.length - 1) === 13) {
            return '';
        }
        return text;
    }
    if (text.charCodeAt(text.length - 1) === 10) {
        if (text.charCodeAt(text.length - 2) === 13) {
            return text.slice(0, -2);
        }
        return text.slice(0, -1);
    }
    if (text.charCodeAt(text.length - 1) === 13) {
        return text.slice(0, -1);
    }
    return text;
}
//#region Assertion
function testLinesContent(str, pieceTable) {
    const lines = splitLines(str);
    assert.strictEqual(pieceTable.getLineCount(), lines.length);
    assert.strictEqual(pieceTable.getLinesRawContent(), str);
    for (let i = 0; i < lines.length; i++) {
        assert.strictEqual(pieceTable.getLineContent(i + 1), lines[i]);
        assert.strictEqual(trimLineFeed(pieceTable.getValueInRange(new Range(i + 1, 1, i + 1, lines[i].length + (i === lines.length - 1 ? 1 : 2)))), lines[i]);
    }
}
function testLineStarts(str, pieceTable) {
    const lineStarts = [0];
    // Reset regex to search from the beginning
    const _regex = new RegExp(/\r\n|\r|\n/g);
    _regex.lastIndex = 0;
    let prevMatchStartIndex = -1;
    let prevMatchLength = 0;
    let m;
    do {
        if (prevMatchStartIndex + prevMatchLength === str.length) {
            // Reached the end of the line
            break;
        }
        m = _regex.exec(str);
        if (!m) {
            break;
        }
        const matchStartIndex = m.index;
        const matchLength = m[0].length;
        if (matchStartIndex === prevMatchStartIndex && matchLength === prevMatchLength) {
            // Exit early if the regex matches the same range twice
            break;
        }
        prevMatchStartIndex = matchStartIndex;
        prevMatchLength = matchLength;
        lineStarts.push(matchStartIndex + matchLength);
    } while (m);
    for (let i = 0; i < lineStarts.length; i++) {
        assert.deepStrictEqual(pieceTable.getPositionAt(lineStarts[i]), new Position(i + 1, 1));
        assert.strictEqual(pieceTable.getOffsetAt(i + 1, 1), lineStarts[i]);
    }
    for (let i = 1; i < lineStarts.length; i++) {
        const pos = pieceTable.getPositionAt(lineStarts[i] - 1);
        assert.strictEqual(pieceTable.getOffsetAt(pos.lineNumber, pos.column), lineStarts[i] - 1);
    }
}
function createTextBuffer(val, normalizeEOL = true) {
    const bufferBuilder = new PieceTreeTextBufferBuilder();
    for (const chunk of val) {
        bufferBuilder.acceptChunk(chunk);
    }
    const factory = bufferBuilder.finish(normalizeEOL);
    return factory.create(1 /* DefaultEndOfLine.LF */).textBuffer;
}
function assertTreeInvariants(T) {
    assert(SENTINEL.color === 0 /* NodeColor.Black */);
    assert(SENTINEL.parent === SENTINEL);
    assert(SENTINEL.left === SENTINEL);
    assert(SENTINEL.right === SENTINEL);
    assert(SENTINEL.size_left === 0);
    assert(SENTINEL.lf_left === 0);
    assertValidTree(T);
}
function depth(n) {
    if (n === SENTINEL) {
        // The leafs are black
        return 1;
    }
    assert(depth(n.left) === depth(n.right));
    return (n.color === 0 /* NodeColor.Black */ ? 1 : 0) + depth(n.left);
}
function assertValidNode(n) {
    if (n === SENTINEL) {
        return { size: 0, lf_cnt: 0 };
    }
    const l = n.left;
    const r = n.right;
    if (n.color === 1 /* NodeColor.Red */) {
        assert(l.color === 0 /* NodeColor.Black */);
        assert(r.color === 0 /* NodeColor.Black */);
    }
    const actualLeft = assertValidNode(l);
    assert(actualLeft.lf_cnt === n.lf_left);
    assert(actualLeft.size === n.size_left);
    const actualRight = assertValidNode(r);
    return {
        size: n.size_left + n.piece.length + actualRight.size,
        lf_cnt: n.lf_left + n.piece.lineFeedCnt + actualRight.lf_cnt,
    };
}
function assertValidTree(T) {
    if (T.root === SENTINEL) {
        return;
    }
    assert(T.root.color === 0 /* NodeColor.Black */);
    assert(depth(T.root.left) === depth(T.root.right));
    assertValidNode(T.root);
}
//#endregion
suite('inserts and deletes', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('basic insert/delete', () => {
        const pieceTree = createTextBuffer(['This is a document with some text.']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(34, 'This is some more text to insert at offset 34.');
        assert.strictEqual(pieceTable.getLinesRawContent(), 'This is a document with some text.This is some more text to insert at offset 34.');
        pieceTable.delete(42, 5);
        assert.strictEqual(pieceTable.getLinesRawContent(), 'This is a document with some text.This is more text to insert at offset 34.');
        assertTreeInvariants(pieceTable);
    });
    test('more inserts', () => {
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pt = pieceTree.getPieceTree();
        pt.insert(0, 'AAA');
        assert.strictEqual(pt.getLinesRawContent(), 'AAA');
        pt.insert(0, 'BBB');
        assert.strictEqual(pt.getLinesRawContent(), 'BBBAAA');
        pt.insert(6, 'CCC');
        assert.strictEqual(pt.getLinesRawContent(), 'BBBAAACCC');
        pt.insert(5, 'DDD');
        assert.strictEqual(pt.getLinesRawContent(), 'BBBAADDDACCC');
        assertTreeInvariants(pt);
    });
    test('more deletes', () => {
        const pieceTree = createTextBuffer(['012345678']);
        ds.add(pieceTree);
        const pt = pieceTree.getPieceTree();
        pt.delete(8, 1);
        assert.strictEqual(pt.getLinesRawContent(), '01234567');
        pt.delete(0, 1);
        assert.strictEqual(pt.getLinesRawContent(), '1234567');
        pt.delete(5, 1);
        assert.strictEqual(pt.getLinesRawContent(), '123457');
        pt.delete(5, 1);
        assert.strictEqual(pt.getLinesRawContent(), '12345');
        pt.delete(0, 5);
        assert.strictEqual(pt.getLinesRawContent(), '');
        assertTreeInvariants(pt);
    });
    test('random test 1', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'ceLPHmFzvCtFeHkCBej ');
        str = str.substring(0, 0) + 'ceLPHmFzvCtFeHkCBej ' + str.substring(0);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.insert(8, 'gDCEfNYiBUNkSwtvB K ');
        str = str.substring(0, 8) + 'gDCEfNYiBUNkSwtvB K ' + str.substring(8);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.insert(38, 'cyNcHxjNPPoehBJldLS ');
        str = str.substring(0, 38) + 'cyNcHxjNPPoehBJldLS ' + str.substring(38);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.insert(59, 'ejMx\nOTgWlbpeDExjOk ');
        str = str.substring(0, 59) + 'ejMx\nOTgWlbpeDExjOk ' + str.substring(59);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random test 2', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'VgPG ');
        str = str.substring(0, 0) + 'VgPG ' + str.substring(0);
        pieceTable.insert(2, 'DdWF ');
        str = str.substring(0, 2) + 'DdWF ' + str.substring(2);
        pieceTable.insert(0, 'hUJc ');
        str = str.substring(0, 0) + 'hUJc ' + str.substring(0);
        pieceTable.insert(8, 'lQEq ');
        str = str.substring(0, 8) + 'lQEq ' + str.substring(8);
        pieceTable.insert(10, 'Gbtp ');
        str = str.substring(0, 10) + 'Gbtp ' + str.substring(10);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random test 3', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'gYSz');
        str = str.substring(0, 0) + 'gYSz' + str.substring(0);
        pieceTable.insert(1, 'mDQe');
        str = str.substring(0, 1) + 'mDQe' + str.substring(1);
        pieceTable.insert(1, 'DTMQ');
        str = str.substring(0, 1) + 'DTMQ' + str.substring(1);
        pieceTable.insert(2, 'GGZB');
        str = str.substring(0, 2) + 'GGZB' + str.substring(2);
        pieceTable.insert(12, 'wXpq');
        str = str.substring(0, 12) + 'wXpq' + str.substring(12);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
    });
    test('random delete 1', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'vfb');
        str = str.substring(0, 0) + 'vfb' + str.substring(0);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.insert(0, 'zRq');
        str = str.substring(0, 0) + 'zRq' + str.substring(0);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.delete(5, 1);
        str = str.substring(0, 5) + str.substring(5 + 1);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.insert(1, 'UNw');
        str = str.substring(0, 1) + 'UNw' + str.substring(1);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.delete(4, 3);
        str = str.substring(0, 4) + str.substring(4 + 3);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.delete(1, 4);
        str = str.substring(0, 1) + str.substring(1 + 4);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.delete(0, 1);
        str = str.substring(0, 0) + str.substring(0 + 1);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random delete 2', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'IDT');
        str = str.substring(0, 0) + 'IDT' + str.substring(0);
        pieceTable.insert(3, 'wwA');
        str = str.substring(0, 3) + 'wwA' + str.substring(3);
        pieceTable.insert(3, 'Gnr');
        str = str.substring(0, 3) + 'Gnr' + str.substring(3);
        pieceTable.delete(6, 3);
        str = str.substring(0, 6) + str.substring(6 + 3);
        pieceTable.insert(4, 'eHp');
        str = str.substring(0, 4) + 'eHp' + str.substring(4);
        pieceTable.insert(1, 'UAi');
        str = str.substring(0, 1) + 'UAi' + str.substring(1);
        pieceTable.insert(2, 'FrR');
        str = str.substring(0, 2) + 'FrR' + str.substring(2);
        pieceTable.delete(6, 7);
        str = str.substring(0, 6) + str.substring(6 + 7);
        pieceTable.delete(3, 5);
        str = str.substring(0, 3) + str.substring(3 + 5);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random delete 3', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'PqM');
        str = str.substring(0, 0) + 'PqM' + str.substring(0);
        pieceTable.delete(1, 2);
        str = str.substring(0, 1) + str.substring(1 + 2);
        pieceTable.insert(1, 'zLc');
        str = str.substring(0, 1) + 'zLc' + str.substring(1);
        pieceTable.insert(0, 'MEX');
        str = str.substring(0, 0) + 'MEX' + str.substring(0);
        pieceTable.insert(0, 'jZh');
        str = str.substring(0, 0) + 'jZh' + str.substring(0);
        pieceTable.insert(8, 'GwQ');
        str = str.substring(0, 8) + 'GwQ' + str.substring(8);
        pieceTable.delete(5, 6);
        str = str.substring(0, 5) + str.substring(5 + 6);
        pieceTable.insert(4, 'ktw');
        str = str.substring(0, 4) + 'ktw' + str.substring(4);
        pieceTable.insert(5, 'GVu');
        str = str.substring(0, 5) + 'GVu' + str.substring(5);
        pieceTable.insert(9, 'jdm');
        str = str.substring(0, 9) + 'jdm' + str.substring(9);
        pieceTable.insert(15, 'na\n');
        str = str.substring(0, 15) + 'na\n' + str.substring(15);
        pieceTable.delete(5, 8);
        str = str.substring(0, 5) + str.substring(5 + 8);
        pieceTable.delete(3, 4);
        str = str.substring(0, 3) + str.substring(3 + 4);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random insert/delete \\r bug 1', () => {
        let str = 'a';
        const pieceTree = createTextBuffer(['a']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(0, 1);
        str = str.substring(0, 0) + str.substring(0 + 1);
        pieceTable.insert(0, '\r\r\n\n');
        str = str.substring(0, 0) + '\r\r\n\n' + str.substring(0);
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.insert(2, '\n\n\ra');
        str = str.substring(0, 2) + '\n\n\ra' + str.substring(2);
        pieceTable.delete(4, 3);
        str = str.substring(0, 4) + str.substring(4 + 3);
        pieceTable.insert(2, '\na\r\r');
        str = str.substring(0, 2) + '\na\r\r' + str.substring(2);
        pieceTable.insert(6, '\ra\n\n');
        str = str.substring(0, 6) + '\ra\n\n' + str.substring(6);
        pieceTable.insert(0, 'aa\n\n');
        str = str.substring(0, 0) + 'aa\n\n' + str.substring(0);
        pieceTable.insert(5, '\n\na\r');
        str = str.substring(0, 5) + '\n\na\r' + str.substring(5);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random insert/delete \\r bug 2', () => {
        let str = 'a';
        const pieceTree = createTextBuffer(['a']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(1, '\naa\r');
        str = str.substring(0, 1) + '\naa\r' + str.substring(1);
        pieceTable.delete(0, 4);
        str = str.substring(0, 0) + str.substring(0 + 4);
        pieceTable.insert(1, '\r\r\na');
        str = str.substring(0, 1) + '\r\r\na' + str.substring(1);
        pieceTable.insert(2, '\n\r\ra');
        str = str.substring(0, 2) + '\n\r\ra' + str.substring(2);
        pieceTable.delete(4, 1);
        str = str.substring(0, 4) + str.substring(4 + 1);
        pieceTable.insert(8, '\r\n\r\r');
        str = str.substring(0, 8) + '\r\n\r\r' + str.substring(8);
        pieceTable.insert(7, '\n\n\na');
        str = str.substring(0, 7) + '\n\n\na' + str.substring(7);
        pieceTable.insert(13, 'a\n\na');
        str = str.substring(0, 13) + 'a\n\na' + str.substring(13);
        pieceTable.delete(17, 3);
        str = str.substring(0, 17) + str.substring(17 + 3);
        pieceTable.insert(2, 'a\ra\n');
        str = str.substring(0, 2) + 'a\ra\n' + str.substring(2);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random insert/delete \\r bug 3', () => {
        let str = 'a';
        const pieceTree = createTextBuffer(['a']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\r\na\r');
        str = str.substring(0, 0) + '\r\na\r' + str.substring(0);
        pieceTable.delete(2, 3);
        str = str.substring(0, 2) + str.substring(2 + 3);
        pieceTable.insert(2, 'a\r\n\r');
        str = str.substring(0, 2) + 'a\r\n\r' + str.substring(2);
        pieceTable.delete(4, 2);
        str = str.substring(0, 4) + str.substring(4 + 2);
        pieceTable.insert(4, 'a\n\r\n');
        str = str.substring(0, 4) + 'a\n\r\n' + str.substring(4);
        pieceTable.insert(1, 'aa\n\r');
        str = str.substring(0, 1) + 'aa\n\r' + str.substring(1);
        pieceTable.insert(7, '\na\r\n');
        str = str.substring(0, 7) + '\na\r\n' + str.substring(7);
        pieceTable.insert(5, '\n\na\r');
        str = str.substring(0, 5) + '\n\na\r' + str.substring(5);
        pieceTable.insert(10, '\r\r\n\r');
        str = str.substring(0, 10) + '\r\r\n\r' + str.substring(10);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        pieceTable.delete(21, 3);
        str = str.substring(0, 21) + str.substring(21 + 3);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random insert/delete \\r bug 4s', () => {
        let str = 'a';
        const pieceTree = createTextBuffer(['a']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(0, 1);
        str = str.substring(0, 0) + str.substring(0 + 1);
        pieceTable.insert(0, '\naaa');
        str = str.substring(0, 0) + '\naaa' + str.substring(0);
        pieceTable.insert(2, '\n\naa');
        str = str.substring(0, 2) + '\n\naa' + str.substring(2);
        pieceTable.delete(1, 4);
        str = str.substring(0, 1) + str.substring(1 + 4);
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.delete(1, 2);
        str = str.substring(0, 1) + str.substring(1 + 2);
        pieceTable.delete(0, 1);
        str = str.substring(0, 0) + str.substring(0 + 1);
        pieceTable.insert(0, 'a\n\n\r');
        str = str.substring(0, 0) + 'a\n\n\r' + str.substring(0);
        pieceTable.insert(2, 'aa\r\n');
        str = str.substring(0, 2) + 'aa\r\n' + str.substring(2);
        pieceTable.insert(3, 'a\naa');
        str = str.substring(0, 3) + 'a\naa' + str.substring(3);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
    test('random insert/delete \\r bug 5', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\n\n\r');
        str = str.substring(0, 0) + '\n\n\n\r' + str.substring(0);
        pieceTable.insert(1, '\n\n\n\r');
        str = str.substring(0, 1) + '\n\n\n\r' + str.substring(1);
        pieceTable.insert(2, '\n\r\r\r');
        str = str.substring(0, 2) + '\n\r\r\r' + str.substring(2);
        pieceTable.insert(8, '\n\r\n\r');
        str = str.substring(0, 8) + '\n\r\n\r' + str.substring(8);
        pieceTable.delete(5, 2);
        str = str.substring(0, 5) + str.substring(5 + 2);
        pieceTable.insert(4, '\n\r\r\r');
        str = str.substring(0, 4) + '\n\r\r\r' + str.substring(4);
        pieceTable.insert(8, '\n\n\n\r');
        str = str.substring(0, 8) + '\n\n\n\r' + str.substring(8);
        pieceTable.delete(0, 7);
        str = str.substring(0, 0) + str.substring(0 + 7);
        pieceTable.insert(1, '\r\n\r\r');
        str = str.substring(0, 1) + '\r\n\r\r' + str.substring(1);
        pieceTable.insert(15, '\n\r\r\r');
        str = str.substring(0, 15) + '\n\r\r\r' + str.substring(15);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        assertTreeInvariants(pieceTable);
    });
});
suite('prefix sum for line feed', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('basic', () => {
        const pieceTree = createTextBuffer(['1\n2\n3\n4']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        assert.strictEqual(pieceTable.getLineCount(), 4);
        assert.deepStrictEqual(pieceTable.getPositionAt(0), new Position(1, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(1), new Position(1, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(2), new Position(2, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(3), new Position(2, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(4), new Position(3, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(5), new Position(3, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(6), new Position(4, 1));
        assert.strictEqual(pieceTable.getOffsetAt(1, 1), 0);
        assert.strictEqual(pieceTable.getOffsetAt(1, 2), 1);
        assert.strictEqual(pieceTable.getOffsetAt(2, 1), 2);
        assert.strictEqual(pieceTable.getOffsetAt(2, 2), 3);
        assert.strictEqual(pieceTable.getOffsetAt(3, 1), 4);
        assert.strictEqual(pieceTable.getOffsetAt(3, 2), 5);
        assert.strictEqual(pieceTable.getOffsetAt(4, 1), 6);
        assertTreeInvariants(pieceTable);
    });
    test('append', () => {
        const pieceTree = createTextBuffer(['a\nb\nc\nde']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(8, 'fh\ni\njk');
        assert.strictEqual(pieceTable.getLineCount(), 6);
        assert.deepStrictEqual(pieceTable.getPositionAt(9), new Position(4, 4));
        assert.strictEqual(pieceTable.getOffsetAt(1, 1), 0);
        assertTreeInvariants(pieceTable);
    });
    test('insert', () => {
        const pieceTree = createTextBuffer(['a\nb\nc\nde']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(7, 'fh\ni\njk');
        assert.strictEqual(pieceTable.getLineCount(), 6);
        assert.deepStrictEqual(pieceTable.getPositionAt(6), new Position(4, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(7), new Position(4, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(8), new Position(4, 3));
        assert.deepStrictEqual(pieceTable.getPositionAt(9), new Position(4, 4));
        assert.deepStrictEqual(pieceTable.getPositionAt(12), new Position(6, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(13), new Position(6, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(14), new Position(6, 3));
        assert.strictEqual(pieceTable.getOffsetAt(4, 1), 6);
        assert.strictEqual(pieceTable.getOffsetAt(4, 2), 7);
        assert.strictEqual(pieceTable.getOffsetAt(4, 3), 8);
        assert.strictEqual(pieceTable.getOffsetAt(4, 4), 9);
        assert.strictEqual(pieceTable.getOffsetAt(6, 1), 12);
        assert.strictEqual(pieceTable.getOffsetAt(6, 2), 13);
        assert.strictEqual(pieceTable.getOffsetAt(6, 3), 14);
        assertTreeInvariants(pieceTable);
    });
    test('delete', () => {
        const pieceTree = createTextBuffer(['a\nb\nc\ndefh\ni\njk']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(7, 2);
        assert.strictEqual(pieceTable.getLinesRawContent(), 'a\nb\nc\ndh\ni\njk');
        assert.strictEqual(pieceTable.getLineCount(), 6);
        assert.deepStrictEqual(pieceTable.getPositionAt(6), new Position(4, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(7), new Position(4, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(8), new Position(4, 3));
        assert.deepStrictEqual(pieceTable.getPositionAt(9), new Position(5, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(11), new Position(6, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(12), new Position(6, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(13), new Position(6, 3));
        assert.strictEqual(pieceTable.getOffsetAt(4, 1), 6);
        assert.strictEqual(pieceTable.getOffsetAt(4, 2), 7);
        assert.strictEqual(pieceTable.getOffsetAt(4, 3), 8);
        assert.strictEqual(pieceTable.getOffsetAt(5, 1), 9);
        assert.strictEqual(pieceTable.getOffsetAt(6, 1), 11);
        assert.strictEqual(pieceTable.getOffsetAt(6, 2), 12);
        assert.strictEqual(pieceTable.getOffsetAt(6, 3), 13);
        assertTreeInvariants(pieceTable);
    });
    test('add+delete 1', () => {
        const pieceTree = createTextBuffer(['a\nb\nc\nde']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(8, 'fh\ni\njk');
        pieceTable.delete(7, 2);
        assert.strictEqual(pieceTable.getLinesRawContent(), 'a\nb\nc\ndh\ni\njk');
        assert.strictEqual(pieceTable.getLineCount(), 6);
        assert.deepStrictEqual(pieceTable.getPositionAt(6), new Position(4, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(7), new Position(4, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(8), new Position(4, 3));
        assert.deepStrictEqual(pieceTable.getPositionAt(9), new Position(5, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(11), new Position(6, 1));
        assert.deepStrictEqual(pieceTable.getPositionAt(12), new Position(6, 2));
        assert.deepStrictEqual(pieceTable.getPositionAt(13), new Position(6, 3));
        assert.strictEqual(pieceTable.getOffsetAt(4, 1), 6);
        assert.strictEqual(pieceTable.getOffsetAt(4, 2), 7);
        assert.strictEqual(pieceTable.getOffsetAt(4, 3), 8);
        assert.strictEqual(pieceTable.getOffsetAt(5, 1), 9);
        assert.strictEqual(pieceTable.getOffsetAt(6, 1), 11);
        assert.strictEqual(pieceTable.getOffsetAt(6, 2), 12);
        assert.strictEqual(pieceTable.getOffsetAt(6, 3), 13);
        assertTreeInvariants(pieceTable);
    });
    test('insert random bug 1: prefixSumComputer.removeValues(start, cnt) cnt is 1 based.', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, ' ZX \n Z\nZ\n YZ\nY\nZXX ');
        str = str.substring(0, 0) + ' ZX \n Z\nZ\n YZ\nY\nZXX ' + str.substring(0);
        pieceTable.insert(14, 'X ZZ\nYZZYZXXY Y XY\n ');
        str = str.substring(0, 14) + 'X ZZ\nYZZYZXXY Y XY\n ' + str.substring(14);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('insert random bug 2: prefixSumComputer initialize does not do deep copy of UInt32Array.', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'ZYZ\nYY XY\nX \nZ Y \nZ ');
        str = str.substring(0, 0) + 'ZYZ\nYY XY\nX \nZ Y \nZ ' + str.substring(0);
        pieceTable.insert(3, 'XXY \n\nY Y YYY  ZYXY ');
        str = str.substring(0, 3) + 'XXY \n\nY Y YYY  ZYXY ' + str.substring(3);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('delete random bug 1: I forgot to update the lineFeedCnt when deletion is on one single piece.', () => {
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'ba\na\nca\nba\ncbab\ncaa ');
        pieceTable.insert(13, 'cca\naabb\ncac\nccc\nab ');
        pieceTable.delete(5, 8);
        pieceTable.delete(30, 2);
        pieceTable.insert(24, 'cbbacccbac\nbaaab\n\nc ');
        pieceTable.delete(29, 3);
        pieceTable.delete(23, 9);
        pieceTable.delete(21, 5);
        pieceTable.delete(30, 3);
        pieceTable.insert(3, 'cb\nac\nc\n\nacc\nbb\nb\nc ');
        pieceTable.delete(19, 5);
        pieceTable.insert(18, '\nbb\n\nacbc\ncbb\nc\nbb\n ');
        pieceTable.insert(65, 'cbccbac\nbc\n\nccabba\n ');
        pieceTable.insert(77, 'a\ncacb\n\nac\n\n\n\n\nabab ');
        pieceTable.delete(30, 9);
        pieceTable.insert(45, 'b\n\nc\nba\n\nbbbba\n\naa\n ');
        pieceTable.insert(82, 'ab\nbb\ncabacab\ncbc\na ');
        pieceTable.delete(123, 9);
        pieceTable.delete(71, 2);
        pieceTable.insert(33, 'acaa\nacb\n\naa\n\nc\n\n\n\n ');
        const str = pieceTable.getLinesRawContent();
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('delete random bug rb tree 1', () => {
        let str = '';
        const pieceTree = createTextBuffer([str]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'YXXZ\n\nYY\n');
        str = str.substring(0, 0) + 'YXXZ\n\nYY\n' + str.substring(0);
        pieceTable.delete(0, 5);
        str = str.substring(0, 0) + str.substring(0 + 5);
        pieceTable.insert(0, 'ZXYY\nX\nZ\n');
        str = str.substring(0, 0) + 'ZXYY\nX\nZ\n' + str.substring(0);
        pieceTable.insert(10, '\nXY\nYXYXY');
        str = str.substring(0, 10) + '\nXY\nYXYXY' + str.substring(10);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('delete random bug rb tree 2', () => {
        let str = '';
        const pieceTree = createTextBuffer([str]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'YXXZ\n\nYY\n');
        str = str.substring(0, 0) + 'YXXZ\n\nYY\n' + str.substring(0);
        pieceTable.insert(0, 'ZXYY\nX\nZ\n');
        str = str.substring(0, 0) + 'ZXYY\nX\nZ\n' + str.substring(0);
        pieceTable.insert(10, '\nXY\nYXYXY');
        str = str.substring(0, 10) + '\nXY\nYXYXY' + str.substring(10);
        pieceTable.insert(8, 'YZXY\nZ\nYX');
        str = str.substring(0, 8) + 'YZXY\nZ\nYX' + str.substring(8);
        pieceTable.insert(12, 'XX\nXXYXYZ');
        str = str.substring(0, 12) + 'XX\nXXYXYZ' + str.substring(12);
        pieceTable.delete(0, 4);
        str = str.substring(0, 0) + str.substring(0 + 4);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('delete random bug rb tree 3', () => {
        let str = '';
        const pieceTree = createTextBuffer([str]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'YXXZ\n\nYY\n');
        str = str.substring(0, 0) + 'YXXZ\n\nYY\n' + str.substring(0);
        pieceTable.delete(7, 2);
        str = str.substring(0, 7) + str.substring(7 + 2);
        pieceTable.delete(6, 1);
        str = str.substring(0, 6) + str.substring(6 + 1);
        pieceTable.delete(0, 5);
        str = str.substring(0, 0) + str.substring(0 + 5);
        pieceTable.insert(0, 'ZXYY\nX\nZ\n');
        str = str.substring(0, 0) + 'ZXYY\nX\nZ\n' + str.substring(0);
        pieceTable.insert(10, '\nXY\nYXYXY');
        str = str.substring(0, 10) + '\nXY\nYXYXY' + str.substring(10);
        pieceTable.insert(8, 'YZXY\nZ\nYX');
        str = str.substring(0, 8) + 'YZXY\nZ\nYX' + str.substring(8);
        pieceTable.insert(12, 'XX\nXXYXYZ');
        str = str.substring(0, 12) + 'XX\nXXYXYZ' + str.substring(12);
        pieceTable.delete(0, 4);
        str = str.substring(0, 0) + str.substring(0 + 4);
        pieceTable.delete(30, 3);
        str = str.substring(0, 30) + str.substring(30 + 3);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
suite('offset 2 position', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('random tests bug 1', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'huuyYzUfKOENwGgZLqn ');
        str = str.substring(0, 0) + 'huuyYzUfKOENwGgZLqn ' + str.substring(0);
        pieceTable.delete(18, 2);
        str = str.substring(0, 18) + str.substring(18 + 2);
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.delete(12, 4);
        str = str.substring(0, 12) + str.substring(12 + 4);
        pieceTable.insert(3, 'hMbnVEdTSdhLlPevXKF ');
        str = str.substring(0, 3) + 'hMbnVEdTSdhLlPevXKF ' + str.substring(3);
        pieceTable.delete(22, 8);
        str = str.substring(0, 22) + str.substring(22 + 8);
        pieceTable.insert(4, 'S umSnYrqOmOAV\nEbZJ ');
        str = str.substring(0, 4) + 'S umSnYrqOmOAV\nEbZJ ' + str.substring(4);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
suite('get text in range', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('getContentInRange', () => {
        const pieceTree = createTextBuffer(['a\nb\nc\nde']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(8, 'fh\ni\njk');
        pieceTable.delete(7, 2);
        // 'a\nb\nc\ndh\ni\njk'
        assert.strictEqual(pieceTable.getValueInRange(new Range(1, 1, 1, 3)), 'a\n');
        assert.strictEqual(pieceTable.getValueInRange(new Range(2, 1, 2, 3)), 'b\n');
        assert.strictEqual(pieceTable.getValueInRange(new Range(3, 1, 3, 3)), 'c\n');
        assert.strictEqual(pieceTable.getValueInRange(new Range(4, 1, 4, 4)), 'dh\n');
        assert.strictEqual(pieceTable.getValueInRange(new Range(5, 1, 5, 3)), 'i\n');
        assert.strictEqual(pieceTable.getValueInRange(new Range(6, 1, 6, 3)), 'jk');
        assertTreeInvariants(pieceTable);
    });
    test('random test value in range', () => {
        let str = '';
        const pieceTree = createTextBuffer([str]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'ZXXY');
        str = str.substring(0, 0) + 'ZXXY' + str.substring(0);
        pieceTable.insert(1, 'XZZY');
        str = str.substring(0, 1) + 'XZZY' + str.substring(1);
        pieceTable.insert(5, '\nX\n\n');
        str = str.substring(0, 5) + '\nX\n\n' + str.substring(5);
        pieceTable.insert(3, '\nXX\n');
        str = str.substring(0, 3) + '\nXX\n' + str.substring(3);
        pieceTable.insert(12, 'YYYX');
        str = str.substring(0, 12) + 'YYYX' + str.substring(12);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random test value in range exception', () => {
        let str = '';
        const pieceTree = createTextBuffer([str]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'XZ\nZ');
        str = str.substring(0, 0) + 'XZ\nZ' + str.substring(0);
        pieceTable.delete(0, 3);
        str = str.substring(0, 0) + str.substring(0 + 3);
        pieceTable.delete(0, 1);
        str = str.substring(0, 0) + str.substring(0 + 1);
        pieceTable.insert(0, 'ZYX\n');
        str = str.substring(0, 0) + 'ZYX\n' + str.substring(0);
        pieceTable.delete(0, 4);
        str = str.substring(0, 0) + str.substring(0 + 4);
        pieceTable.getValueInRange(new Range(1, 1, 1, 1));
        assertTreeInvariants(pieceTable);
    });
    test('random tests bug 1', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'huuyYzUfKOENwGgZLqn ');
        str = str.substring(0, 0) + 'huuyYzUfKOENwGgZLqn ' + str.substring(0);
        pieceTable.delete(18, 2);
        str = str.substring(0, 18) + str.substring(18 + 2);
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.delete(12, 4);
        str = str.substring(0, 12) + str.substring(12 + 4);
        pieceTable.insert(3, 'hMbnVEdTSdhLlPevXKF ');
        str = str.substring(0, 3) + 'hMbnVEdTSdhLlPevXKF ' + str.substring(3);
        pieceTable.delete(22, 8);
        str = str.substring(0, 22) + str.substring(22 + 8);
        pieceTable.insert(4, 'S umSnYrqOmOAV\nEbZJ ');
        str = str.substring(0, 4) + 'S umSnYrqOmOAV\nEbZJ ' + str.substring(4);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random tests bug 2', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'xfouRDZwdAHjVXJAMV\n ');
        str = str.substring(0, 0) + 'xfouRDZwdAHjVXJAMV\n ' + str.substring(0);
        pieceTable.insert(16, 'dBGndxpFZBEAIKykYYx ');
        str = str.substring(0, 16) + 'dBGndxpFZBEAIKykYYx ' + str.substring(16);
        pieceTable.delete(7, 6);
        str = str.substring(0, 7) + str.substring(7 + 6);
        pieceTable.delete(9, 7);
        str = str.substring(0, 9) + str.substring(9 + 7);
        pieceTable.delete(17, 6);
        str = str.substring(0, 17) + str.substring(17 + 6);
        pieceTable.delete(0, 4);
        str = str.substring(0, 0) + str.substring(0 + 4);
        pieceTable.insert(9, 'qvEFXCNvVkWgvykahYt ');
        str = str.substring(0, 9) + 'qvEFXCNvVkWgvykahYt ' + str.substring(9);
        pieceTable.delete(4, 6);
        str = str.substring(0, 4) + str.substring(4 + 6);
        pieceTable.insert(11, 'OcSChUYT\nzPEBOpsGmR ');
        str = str.substring(0, 11) + 'OcSChUYT\nzPEBOpsGmR ' + str.substring(11);
        pieceTable.insert(15, 'KJCozaXTvkE\nxnqAeTz ');
        str = str.substring(0, 15) + 'KJCozaXTvkE\nxnqAeTz ' + str.substring(15);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('get line content', () => {
        const pieceTree = createTextBuffer(['1']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        assert.strictEqual(pieceTable.getLineRawContent(1), '1');
        pieceTable.insert(1, '2');
        assert.strictEqual(pieceTable.getLineRawContent(1), '12');
        assertTreeInvariants(pieceTable);
    });
    test('get line content basic', () => {
        const pieceTree = createTextBuffer(['1\n2\n3\n4']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        assert.strictEqual(pieceTable.getLineRawContent(1), '1\n');
        assert.strictEqual(pieceTable.getLineRawContent(2), '2\n');
        assert.strictEqual(pieceTable.getLineRawContent(3), '3\n');
        assert.strictEqual(pieceTable.getLineRawContent(4), '4');
        assertTreeInvariants(pieceTable);
    });
    test('get line content after inserts/deletes', () => {
        const pieceTree = createTextBuffer(['a\nb\nc\nde']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(8, 'fh\ni\njk');
        pieceTable.delete(7, 2);
        // 'a\nb\nc\ndh\ni\njk'
        assert.strictEqual(pieceTable.getLineRawContent(1), 'a\n');
        assert.strictEqual(pieceTable.getLineRawContent(2), 'b\n');
        assert.strictEqual(pieceTable.getLineRawContent(3), 'c\n');
        assert.strictEqual(pieceTable.getLineRawContent(4), 'dh\n');
        assert.strictEqual(pieceTable.getLineRawContent(5), 'i\n');
        assert.strictEqual(pieceTable.getLineRawContent(6), 'jk');
        assertTreeInvariants(pieceTable);
    });
    test('random 1', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'J eNnDzQpnlWyjmUu\ny ');
        str = str.substring(0, 0) + 'J eNnDzQpnlWyjmUu\ny ' + str.substring(0);
        pieceTable.insert(0, 'QPEeRAQmRwlJqtZSWhQ ');
        str = str.substring(0, 0) + 'QPEeRAQmRwlJqtZSWhQ ' + str.substring(0);
        pieceTable.delete(5, 1);
        str = str.substring(0, 5) + str.substring(5 + 1);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random 2', () => {
        let str = '';
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'DZoQ tglPCRHMltejRI ');
        str = str.substring(0, 0) + 'DZoQ tglPCRHMltejRI ' + str.substring(0);
        pieceTable.insert(10, 'JRXiyYqJ qqdcmbfkKX ');
        str = str.substring(0, 10) + 'JRXiyYqJ qqdcmbfkKX ' + str.substring(10);
        pieceTable.delete(16, 3);
        str = str.substring(0, 16) + str.substring(16 + 3);
        pieceTable.delete(25, 1);
        str = str.substring(0, 25) + str.substring(25 + 1);
        pieceTable.insert(18, 'vH\nNlvfqQJPm\nSFkhMc ');
        str = str.substring(0, 18) + 'vH\nNlvfqQJPm\nSFkhMc ' + str.substring(18);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
suite('CRLF', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('delete CR in CRLF 1', () => {
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'a\r\nb');
        pieceTable.delete(0, 2);
        assert.strictEqual(pieceTable.getLineCount(), 2);
        assertTreeInvariants(pieceTable);
    });
    test('delete CR in CRLF 2', () => {
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'a\r\nb');
        pieceTable.delete(2, 2);
        assert.strictEqual(pieceTable.getLineCount(), 2);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 1', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\n\r\r');
        str = str.substring(0, 0) + '\n\n\r\r' + str.substring(0);
        pieceTable.insert(1, '\r\n\r\n');
        str = str.substring(0, 1) + '\r\n\r\n' + str.substring(1);
        pieceTable.delete(5, 3);
        str = str.substring(0, 5) + str.substring(5 + 3);
        pieceTable.delete(2, 3);
        str = str.substring(0, 2) + str.substring(2 + 3);
        const lines = splitLines(str);
        assert.strictEqual(pieceTable.getLineCount(), lines.length);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 2', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\r\n\r');
        str = str.substring(0, 0) + '\n\r\n\r' + str.substring(0);
        pieceTable.insert(2, '\n\r\r\r');
        str = str.substring(0, 2) + '\n\r\r\r' + str.substring(2);
        pieceTable.delete(4, 1);
        str = str.substring(0, 4) + str.substring(4 + 1);
        const lines = splitLines(str);
        assert.strictEqual(pieceTable.getLineCount(), lines.length);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 3', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\n\n\r');
        str = str.substring(0, 0) + '\n\n\n\r' + str.substring(0);
        pieceTable.delete(2, 2);
        str = str.substring(0, 2) + str.substring(2 + 2);
        pieceTable.delete(0, 2);
        str = str.substring(0, 0) + str.substring(0 + 2);
        pieceTable.insert(0, '\r\r\r\r');
        str = str.substring(0, 0) + '\r\r\r\r' + str.substring(0);
        pieceTable.insert(2, '\r\n\r\r');
        str = str.substring(0, 2) + '\r\n\r\r' + str.substring(2);
        pieceTable.insert(3, '\r\r\r\n');
        str = str.substring(0, 3) + '\r\r\r\n' + str.substring(3);
        const lines = splitLines(str);
        assert.strictEqual(pieceTable.getLineCount(), lines.length);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 4', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\n\n\n');
        str = str.substring(0, 0) + '\n\n\n\n' + str.substring(0);
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.insert(1, '\r\r\r\r');
        str = str.substring(0, 1) + '\r\r\r\r' + str.substring(1);
        pieceTable.insert(6, '\r\n\n\r');
        str = str.substring(0, 6) + '\r\n\n\r' + str.substring(6);
        pieceTable.delete(5, 3);
        str = str.substring(0, 5) + str.substring(5 + 3);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 5', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\n\n\n');
        str = str.substring(0, 0) + '\n\n\n\n' + str.substring(0);
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.insert(0, '\n\r\r\n');
        str = str.substring(0, 0) + '\n\r\r\n' + str.substring(0);
        pieceTable.insert(4, '\n\r\r\n');
        str = str.substring(0, 4) + '\n\r\r\n' + str.substring(4);
        pieceTable.delete(4, 3);
        str = str.substring(0, 4) + str.substring(4 + 3);
        pieceTable.insert(5, '\r\r\n\r');
        str = str.substring(0, 5) + '\r\r\n\r' + str.substring(5);
        pieceTable.insert(12, '\n\n\n\r');
        str = str.substring(0, 12) + '\n\n\n\r' + str.substring(12);
        pieceTable.insert(5, '\r\r\r\n');
        str = str.substring(0, 5) + '\r\r\r\n' + str.substring(5);
        pieceTable.insert(20, '\n\n\r\n');
        str = str.substring(0, 20) + '\n\n\r\n' + str.substring(20);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 6', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\r\r\n');
        str = str.substring(0, 0) + '\n\r\r\n' + str.substring(0);
        pieceTable.insert(4, '\r\n\n\r');
        str = str.substring(0, 4) + '\r\n\n\r' + str.substring(4);
        pieceTable.insert(3, '\r\n\n\n');
        str = str.substring(0, 3) + '\r\n\n\n' + str.substring(3);
        pieceTable.delete(4, 8);
        str = str.substring(0, 4) + str.substring(4 + 8);
        pieceTable.insert(4, '\r\n\n\r');
        str = str.substring(0, 4) + '\r\n\n\r' + str.substring(4);
        pieceTable.insert(0, '\r\n\n\r');
        str = str.substring(0, 0) + '\r\n\n\r' + str.substring(0);
        pieceTable.delete(4, 0);
        str = str.substring(0, 4) + str.substring(4 + 0);
        pieceTable.delete(8, 4);
        str = str.substring(0, 8) + str.substring(8 + 4);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 8', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\r\n\n\r');
        str = str.substring(0, 0) + '\r\n\n\r' + str.substring(0);
        pieceTable.delete(1, 0);
        str = str.substring(0, 1) + str.substring(1 + 0);
        pieceTable.insert(3, '\n\n\n\r');
        str = str.substring(0, 3) + '\n\n\n\r' + str.substring(3);
        pieceTable.insert(7, '\n\n\r\n');
        str = str.substring(0, 7) + '\n\n\r\n' + str.substring(7);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 7', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\r\r\n\n');
        str = str.substring(0, 0) + '\r\r\n\n' + str.substring(0);
        pieceTable.insert(4, '\r\n\n\r');
        str = str.substring(0, 4) + '\r\n\n\r' + str.substring(4);
        pieceTable.insert(7, '\n\r\r\r');
        str = str.substring(0, 7) + '\n\r\r\r' + str.substring(7);
        pieceTable.insert(11, '\n\n\r\n');
        str = str.substring(0, 11) + '\n\n\r\n' + str.substring(11);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 10', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'qneW');
        str = str.substring(0, 0) + 'qneW' + str.substring(0);
        pieceTable.insert(0, 'YhIl');
        str = str.substring(0, 0) + 'YhIl' + str.substring(0);
        pieceTable.insert(0, 'qdsm');
        str = str.substring(0, 0) + 'qdsm' + str.substring(0);
        pieceTable.delete(7, 0);
        str = str.substring(0, 7) + str.substring(7 + 0);
        pieceTable.insert(12, 'iiPv');
        str = str.substring(0, 12) + 'iiPv' + str.substring(12);
        pieceTable.insert(9, 'V\rSA');
        str = str.substring(0, 9) + 'V\rSA' + str.substring(9);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 9', () => {
        let str = '';
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, '\n\n\n\n');
        str = str.substring(0, 0) + '\n\n\n\n' + str.substring(0);
        pieceTable.insert(3, '\n\r\n\r');
        str = str.substring(0, 3) + '\n\r\n\r' + str.substring(3);
        pieceTable.insert(2, '\n\r\n\n');
        str = str.substring(0, 2) + '\n\r\n\n' + str.substring(2);
        pieceTable.insert(0, '\n\n\r\r');
        str = str.substring(0, 0) + '\n\n\r\r' + str.substring(0);
        pieceTable.insert(3, '\r\r\r\r');
        str = str.substring(0, 3) + '\r\r\r\r' + str.substring(3);
        pieceTable.insert(3, '\n\n\r\r');
        str = str.substring(0, 3) + '\n\n\r\r' + str.substring(3);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
suite('centralized lineStarts with CRLF', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('delete CR in CRLF 1', () => {
        const pieceTree = createTextBuffer(['a\r\nb'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(2, 2);
        assert.strictEqual(pieceTable.getLineCount(), 2);
        assertTreeInvariants(pieceTable);
    });
    test('delete CR in CRLF 2', () => {
        const pieceTree = createTextBuffer(['a\r\nb']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(0, 2);
        assert.strictEqual(pieceTable.getLineCount(), 2);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 1', () => {
        let str = '\n\n\r\r';
        const pieceTree = createTextBuffer(['\n\n\r\r'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(1, '\r\n\r\n');
        str = str.substring(0, 1) + '\r\n\r\n' + str.substring(1);
        pieceTable.delete(5, 3);
        str = str.substring(0, 5) + str.substring(5 + 3);
        pieceTable.delete(2, 3);
        str = str.substring(0, 2) + str.substring(2 + 3);
        const lines = splitLines(str);
        assert.strictEqual(pieceTable.getLineCount(), lines.length);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 2', () => {
        let str = '\n\r\n\r';
        const pieceTree = createTextBuffer(['\n\r\n\r'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(2, '\n\r\r\r');
        str = str.substring(0, 2) + '\n\r\r\r' + str.substring(2);
        pieceTable.delete(4, 1);
        str = str.substring(0, 4) + str.substring(4 + 1);
        const lines = splitLines(str);
        assert.strictEqual(pieceTable.getLineCount(), lines.length);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 3', () => {
        let str = '\n\n\n\r';
        const pieceTree = createTextBuffer(['\n\n\n\r'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(2, 2);
        str = str.substring(0, 2) + str.substring(2 + 2);
        pieceTable.delete(0, 2);
        str = str.substring(0, 0) + str.substring(0 + 2);
        pieceTable.insert(0, '\r\r\r\r');
        str = str.substring(0, 0) + '\r\r\r\r' + str.substring(0);
        pieceTable.insert(2, '\r\n\r\r');
        str = str.substring(0, 2) + '\r\n\r\r' + str.substring(2);
        pieceTable.insert(3, '\r\r\r\n');
        str = str.substring(0, 3) + '\r\r\r\n' + str.substring(3);
        const lines = splitLines(str);
        assert.strictEqual(pieceTable.getLineCount(), lines.length);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 4', () => {
        let str = '\n\n\n\n';
        const pieceTree = createTextBuffer(['\n\n\n\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.insert(1, '\r\r\r\r');
        str = str.substring(0, 1) + '\r\r\r\r' + str.substring(1);
        pieceTable.insert(6, '\r\n\n\r');
        str = str.substring(0, 6) + '\r\n\n\r' + str.substring(6);
        pieceTable.delete(5, 3);
        str = str.substring(0, 5) + str.substring(5 + 3);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 5', () => {
        let str = '\n\n\n\n';
        const pieceTree = createTextBuffer(['\n\n\n\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(3, 1);
        str = str.substring(0, 3) + str.substring(3 + 1);
        pieceTable.insert(0, '\n\r\r\n');
        str = str.substring(0, 0) + '\n\r\r\n' + str.substring(0);
        pieceTable.insert(4, '\n\r\r\n');
        str = str.substring(0, 4) + '\n\r\r\n' + str.substring(4);
        pieceTable.delete(4, 3);
        str = str.substring(0, 4) + str.substring(4 + 3);
        pieceTable.insert(5, '\r\r\n\r');
        str = str.substring(0, 5) + '\r\r\n\r' + str.substring(5);
        pieceTable.insert(12, '\n\n\n\r');
        str = str.substring(0, 12) + '\n\n\n\r' + str.substring(12);
        pieceTable.insert(5, '\r\r\r\n');
        str = str.substring(0, 5) + '\r\r\r\n' + str.substring(5);
        pieceTable.insert(20, '\n\n\r\n');
        str = str.substring(0, 20) + '\n\n\r\n' + str.substring(20);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 6', () => {
        let str = '\n\r\r\n';
        const pieceTree = createTextBuffer(['\n\r\r\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(4, '\r\n\n\r');
        str = str.substring(0, 4) + '\r\n\n\r' + str.substring(4);
        pieceTable.insert(3, '\r\n\n\n');
        str = str.substring(0, 3) + '\r\n\n\n' + str.substring(3);
        pieceTable.delete(4, 8);
        str = str.substring(0, 4) + str.substring(4 + 8);
        pieceTable.insert(4, '\r\n\n\r');
        str = str.substring(0, 4) + '\r\n\n\r' + str.substring(4);
        pieceTable.insert(0, '\r\n\n\r');
        str = str.substring(0, 0) + '\r\n\n\r' + str.substring(0);
        pieceTable.delete(4, 0);
        str = str.substring(0, 4) + str.substring(4 + 0);
        pieceTable.delete(8, 4);
        str = str.substring(0, 8) + str.substring(8 + 4);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 7', () => {
        let str = '\r\n\n\r';
        const pieceTree = createTextBuffer(['\r\n\n\r'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(1, 0);
        str = str.substring(0, 1) + str.substring(1 + 0);
        pieceTable.insert(3, '\n\n\n\r');
        str = str.substring(0, 3) + '\n\n\n\r' + str.substring(3);
        pieceTable.insert(7, '\n\n\r\n');
        str = str.substring(0, 7) + '\n\n\r\n' + str.substring(7);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 8', () => {
        let str = '\r\r\n\n';
        const pieceTree = createTextBuffer(['\r\r\n\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(4, '\r\n\n\r');
        str = str.substring(0, 4) + '\r\n\n\r' + str.substring(4);
        pieceTable.insert(7, '\n\r\r\r');
        str = str.substring(0, 7) + '\n\r\r\r' + str.substring(7);
        pieceTable.insert(11, '\n\n\r\n');
        str = str.substring(0, 11) + '\n\n\r\n' + str.substring(11);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 9', () => {
        let str = 'qneW';
        const pieceTree = createTextBuffer(['qneW'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(0, 'YhIl');
        str = str.substring(0, 0) + 'YhIl' + str.substring(0);
        pieceTable.insert(0, 'qdsm');
        str = str.substring(0, 0) + 'qdsm' + str.substring(0);
        pieceTable.delete(7, 0);
        str = str.substring(0, 7) + str.substring(7 + 0);
        pieceTable.insert(12, 'iiPv');
        str = str.substring(0, 12) + 'iiPv' + str.substring(12);
        pieceTable.insert(9, 'V\rSA');
        str = str.substring(0, 9) + 'V\rSA' + str.substring(9);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random bug 10', () => {
        let str = '\n\n\n\n';
        const pieceTree = createTextBuffer(['\n\n\n\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.insert(3, '\n\r\n\r');
        str = str.substring(0, 3) + '\n\r\n\r' + str.substring(3);
        pieceTable.insert(2, '\n\r\n\n');
        str = str.substring(0, 2) + '\n\r\n\n' + str.substring(2);
        pieceTable.insert(0, '\n\n\r\r');
        str = str.substring(0, 0) + '\n\n\r\r' + str.substring(0);
        pieceTable.insert(3, '\r\r\r\r');
        str = str.substring(0, 3) + '\r\r\r\r' + str.substring(3);
        pieceTable.insert(3, '\n\n\r\r');
        str = str.substring(0, 3) + '\n\n\r\r' + str.substring(3);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random chunk bug 1', () => {
        const pieceTree = createTextBuffer(['\n\r\r\n\n\n\r\n\r'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = '\n\r\r\n\n\n\r\n\r';
        pieceTable.delete(0, 2);
        str = str.substring(0, 0) + str.substring(0 + 2);
        pieceTable.insert(1, '\r\r\n\n');
        str = str.substring(0, 1) + '\r\r\n\n' + str.substring(1);
        pieceTable.insert(7, '\r\r\r\r');
        str = str.substring(0, 7) + '\r\r\r\r' + str.substring(7);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random chunk bug 2', () => {
        const pieceTree = createTextBuffer(['\n\r\n\n\n\r\n\r\n\r\r\n\n\n\r\r\n\r\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = '\n\r\n\n\n\r\n\r\n\r\r\n\n\n\r\r\n\r\n';
        pieceTable.insert(16, '\r\n\r\r');
        str = str.substring(0, 16) + '\r\n\r\r' + str.substring(16);
        pieceTable.insert(13, '\n\n\r\r');
        str = str.substring(0, 13) + '\n\n\r\r' + str.substring(13);
        pieceTable.insert(19, '\n\n\r\n');
        str = str.substring(0, 19) + '\n\n\r\n' + str.substring(19);
        pieceTable.delete(5, 0);
        str = str.substring(0, 5) + str.substring(5 + 0);
        pieceTable.delete(11, 2);
        str = str.substring(0, 11) + str.substring(11 + 2);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random chunk bug 3', () => {
        const pieceTree = createTextBuffer(['\r\n\n\n\n\n\n\r\n'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = '\r\n\n\n\n\n\n\r\n';
        pieceTable.insert(4, '\n\n\r\n\r\r\n\n\r');
        str = str.substring(0, 4) + '\n\n\r\n\r\r\n\n\r' + str.substring(4);
        pieceTable.delete(4, 4);
        str = str.substring(0, 4) + str.substring(4 + 4);
        pieceTable.insert(11, '\r\n\r\n\n\r\r\n\n');
        str = str.substring(0, 11) + '\r\n\r\n\n\r\r\n\n' + str.substring(11);
        pieceTable.delete(1, 2);
        str = str.substring(0, 1) + str.substring(1 + 2);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random chunk bug 4', () => {
        const pieceTree = createTextBuffer(['\n\r\n\r'], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = '\n\r\n\r';
        pieceTable.insert(4, '\n\n\r\n');
        str = str.substring(0, 4) + '\n\n\r\n' + str.substring(4);
        pieceTable.insert(3, '\r\n\n\n');
        str = str.substring(0, 3) + '\r\n\n\n' + str.substring(3);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
suite('random is unsupervised', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('splitting large change buffer', function () {
        const pieceTree = createTextBuffer([''], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = '';
        pieceTable.insert(0, 'WUZ\nXVZY\n');
        str = str.substring(0, 0) + 'WUZ\nXVZY\n' + str.substring(0);
        pieceTable.insert(8, '\r\r\nZXUWVW');
        str = str.substring(0, 8) + '\r\r\nZXUWVW' + str.substring(8);
        pieceTable.delete(10, 7);
        str = str.substring(0, 10) + str.substring(10 + 7);
        pieceTable.delete(10, 1);
        str = str.substring(0, 10) + str.substring(10 + 1);
        pieceTable.insert(4, 'VX\r\r\nWZVZ');
        str = str.substring(0, 4) + 'VX\r\r\nWZVZ' + str.substring(4);
        pieceTable.delete(11, 3);
        str = str.substring(0, 11) + str.substring(11 + 3);
        pieceTable.delete(12, 4);
        str = str.substring(0, 12) + str.substring(12 + 4);
        pieceTable.delete(8, 0);
        str = str.substring(0, 8) + str.substring(8 + 0);
        pieceTable.delete(10, 2);
        str = str.substring(0, 10) + str.substring(10 + 2);
        pieceTable.insert(0, 'VZXXZYZX\r');
        str = str.substring(0, 0) + 'VZXXZYZX\r' + str.substring(0);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random insert delete', function () {
        this.timeout(500000);
        let str = '';
        const pieceTree = createTextBuffer([str], false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        // let output = '';
        for (let i = 0; i < 1000; i++) {
            if (Math.random() < 0.6) {
                // insert
                const text = randomStr(100);
                const pos = randomInt(str.length + 1);
                pieceTable.insert(pos, text);
                str = str.substring(0, pos) + text + str.substring(pos);
                // output += `pieceTable.insert(${pos}, '${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}');\n`;
                // output += `str = str.substring(0, ${pos}) + '${text.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}' + str.substring(${pos});\n`;
            }
            else {
                // delete
                const pos = randomInt(str.length);
                const length = Math.min(str.length - pos, Math.floor(Math.random() * 10));
                pieceTable.delete(pos, length);
                str = str.substring(0, pos) + str.substring(pos + length);
                // output += `pieceTable.delete(${pos}, ${length});\n`;
                // output += `str = str.substring(0, ${pos}) + str.substring(${pos} + ${length});\n`
            }
        }
        // console.log(output);
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random chunks', function () {
        this.timeout(500000);
        const chunks = [];
        for (let i = 0; i < 5; i++) {
            chunks.push(randomStr(1000));
        }
        const pieceTree = createTextBuffer(chunks, false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = chunks.join('');
        for (let i = 0; i < 1000; i++) {
            if (Math.random() < 0.6) {
                // insert
                const text = randomStr(100);
                const pos = randomInt(str.length + 1);
                pieceTable.insert(pos, text);
                str = str.substring(0, pos) + text + str.substring(pos);
            }
            else {
                // delete
                const pos = randomInt(str.length);
                const length = Math.min(str.length - pos, Math.floor(Math.random() * 10));
                pieceTable.delete(pos, length);
                str = str.substring(0, pos) + str.substring(pos + length);
            }
        }
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('random chunks 2', function () {
        this.timeout(500000);
        const chunks = [];
        chunks.push(randomStr(1000));
        const pieceTree = createTextBuffer(chunks, false);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = chunks.join('');
        for (let i = 0; i < 50; i++) {
            if (Math.random() < 0.6) {
                // insert
                const text = randomStr(30);
                const pos = randomInt(str.length + 1);
                pieceTable.insert(pos, text);
                str = str.substring(0, pos) + text + str.substring(pos);
            }
            else {
                // delete
                const pos = randomInt(str.length);
                const length = Math.min(str.length - pos, Math.floor(Math.random() * 10));
                pieceTable.delete(pos, length);
                str = str.substring(0, pos) + str.substring(pos + length);
            }
            testLinesContent(str, pieceTable);
        }
        assert.strictEqual(pieceTable.getLinesRawContent(), str);
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
suite('buffer api', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('equal', () => {
        const a = createTextBuffer(['abc']);
        const b = createTextBuffer(['ab', 'c']);
        const c = createTextBuffer(['abd']);
        const d = createTextBuffer(['abcd']);
        ds.add(a);
        ds.add(b);
        ds.add(c);
        ds.add(d);
        assert(a.getPieceTree().equal(b.getPieceTree()));
        assert(!a.getPieceTree().equal(c.getPieceTree()));
        assert(!a.getPieceTree().equal(d.getPieceTree()));
    });
    test('equal with more chunks', () => {
        const a = createTextBuffer(['ab', 'cd', 'e']);
        const b = createTextBuffer(['ab', 'c', 'de']);
        ds.add(a);
        ds.add(b);
        assert(a.getPieceTree().equal(b.getPieceTree()));
    });
    test('equal 2, empty buffer', () => {
        const a = createTextBuffer(['']);
        const b = createTextBuffer(['']);
        ds.add(a);
        ds.add(b);
        assert(a.getPieceTree().equal(b.getPieceTree()));
    });
    test('equal 3, empty buffer', () => {
        const a = createTextBuffer(['a']);
        const b = createTextBuffer(['']);
        ds.add(a);
        ds.add(b);
        assert(!a.getPieceTree().equal(b.getPieceTree()));
    });
    test('getLineCharCode - issue #45735', () => {
        const pieceTree = createTextBuffer(['LINE1\nline2']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        assert.strictEqual(pieceTable.getLineCharCode(1, 0), 'L'.charCodeAt(0), 'L');
        assert.strictEqual(pieceTable.getLineCharCode(1, 1), 'I'.charCodeAt(0), 'I');
        assert.strictEqual(pieceTable.getLineCharCode(1, 2), 'N'.charCodeAt(0), 'N');
        assert.strictEqual(pieceTable.getLineCharCode(1, 3), 'E'.charCodeAt(0), 'E');
        assert.strictEqual(pieceTable.getLineCharCode(1, 4), '1'.charCodeAt(0), '1');
        assert.strictEqual(pieceTable.getLineCharCode(1, 5), '\n'.charCodeAt(0), '\\n');
        assert.strictEqual(pieceTable.getLineCharCode(2, 0), 'l'.charCodeAt(0), 'l');
        assert.strictEqual(pieceTable.getLineCharCode(2, 1), 'i'.charCodeAt(0), 'i');
        assert.strictEqual(pieceTable.getLineCharCode(2, 2), 'n'.charCodeAt(0), 'n');
        assert.strictEqual(pieceTable.getLineCharCode(2, 3), 'e'.charCodeAt(0), 'e');
        assert.strictEqual(pieceTable.getLineCharCode(2, 4), '2'.charCodeAt(0), '2');
    });
    test('getLineCharCode - issue #47733', () => {
        const pieceTree = createTextBuffer(['', 'LINE1\n', 'line2']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        assert.strictEqual(pieceTable.getLineCharCode(1, 0), 'L'.charCodeAt(0), 'L');
        assert.strictEqual(pieceTable.getLineCharCode(1, 1), 'I'.charCodeAt(0), 'I');
        assert.strictEqual(pieceTable.getLineCharCode(1, 2), 'N'.charCodeAt(0), 'N');
        assert.strictEqual(pieceTable.getLineCharCode(1, 3), 'E'.charCodeAt(0), 'E');
        assert.strictEqual(pieceTable.getLineCharCode(1, 4), '1'.charCodeAt(0), '1');
        assert.strictEqual(pieceTable.getLineCharCode(1, 5), '\n'.charCodeAt(0), '\\n');
        assert.strictEqual(pieceTable.getLineCharCode(2, 0), 'l'.charCodeAt(0), 'l');
        assert.strictEqual(pieceTable.getLineCharCode(2, 1), 'i'.charCodeAt(0), 'i');
        assert.strictEqual(pieceTable.getLineCharCode(2, 2), 'n'.charCodeAt(0), 'n');
        assert.strictEqual(pieceTable.getLineCharCode(2, 3), 'e'.charCodeAt(0), 'e');
        assert.strictEqual(pieceTable.getLineCharCode(2, 4), '2'.charCodeAt(0), '2');
    });
    test('getNearestChunk', () => {
        const pieceTree = createTextBuffer(['012345678']);
        ds.add(pieceTree);
        const pt = pieceTree.getPieceTree();
        pt.insert(3, 'ABC');
        assert.equal(pt.getLineContent(1), '012ABC345678');
        assert.equal(pt.getNearestChunk(3), 'ABC');
        assert.equal(pt.getNearestChunk(6), '345678');
        pt.delete(9, 1);
        assert.equal(pt.getLineContent(1), '012ABC34578');
        assert.equal(pt.getNearestChunk(6), '345');
        assert.equal(pt.getNearestChunk(9), '78');
    });
});
suite('search offset cache', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('render white space exception', () => {
        const pieceTree = createTextBuffer(['class Name{\n\t\n\t\t\tget() {\n\n\t\t\t}\n\t\t}']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = 'class Name{\n\t\n\t\t\tget() {\n\n\t\t\t}\n\t\t}';
        pieceTable.insert(12, 's');
        str = str.substring(0, 12) + 's' + str.substring(12);
        pieceTable.insert(13, 'e');
        str = str.substring(0, 13) + 'e' + str.substring(13);
        pieceTable.insert(14, 't');
        str = str.substring(0, 14) + 't' + str.substring(14);
        pieceTable.insert(15, '()');
        str = str.substring(0, 15) + '()' + str.substring(15);
        pieceTable.delete(16, 1);
        str = str.substring(0, 16) + str.substring(16 + 1);
        pieceTable.insert(17, '()');
        str = str.substring(0, 17) + '()' + str.substring(17);
        pieceTable.delete(18, 1);
        str = str.substring(0, 18) + str.substring(18 + 1);
        pieceTable.insert(18, '}');
        str = str.substring(0, 18) + '}' + str.substring(18);
        pieceTable.insert(12, '\n');
        str = str.substring(0, 12) + '\n' + str.substring(12);
        pieceTable.delete(12, 1);
        str = str.substring(0, 12) + str.substring(12 + 1);
        pieceTable.delete(18, 1);
        str = str.substring(0, 18) + str.substring(18 + 1);
        pieceTable.insert(18, '}');
        str = str.substring(0, 18) + '}' + str.substring(18);
        pieceTable.delete(17, 2);
        str = str.substring(0, 17) + str.substring(17 + 2);
        pieceTable.delete(16, 1);
        str = str.substring(0, 16) + str.substring(16 + 1);
        pieceTable.insert(16, ')');
        str = str.substring(0, 16) + ')' + str.substring(16);
        pieceTable.delete(15, 2);
        str = str.substring(0, 15) + str.substring(15 + 2);
        const content = pieceTable.getLinesRawContent();
        assert(content === str);
    });
    test('Line breaks replacement is not necessary when EOL is normalized', () => {
        const pieceTree = createTextBuffer(['abc']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = 'abc';
        pieceTable.insert(3, 'def\nabc');
        str = str + 'def\nabc';
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('Line breaks replacement is not necessary when EOL is normalized 2', () => {
        const pieceTree = createTextBuffer(['abc\n']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = 'abc\n';
        pieceTable.insert(4, 'def\nabc');
        str = str + 'def\nabc';
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('Line breaks replacement is not necessary when EOL is normalized 3', () => {
        const pieceTree = createTextBuffer(['abc\n']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = 'abc\n';
        pieceTable.insert(2, 'def\nabc');
        str = str.substring(0, 2) + 'def\nabc' + str.substring(2);
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
    test('Line breaks replacement is not necessary when EOL is normalized 4', () => {
        const pieceTree = createTextBuffer(['abc\n']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        let str = 'abc\n';
        pieceTable.insert(3, 'def\nabc');
        str = str.substring(0, 3) + 'def\nabc' + str.substring(3);
        testLineStarts(str, pieceTable);
        testLinesContent(str, pieceTable);
        assertTreeInvariants(pieceTable);
    });
});
function getValueInSnapshot(snapshot) {
    let ret = '';
    let tmp = snapshot.read();
    while (tmp !== null) {
        ret += tmp;
        tmp = snapshot.read();
    }
    return ret;
}
suite('snapshot', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bug #45564, piece tree pieces should be immutable', () => {
        const model = createTextModel('\n');
        model.applyEdits([
            {
                range: new Range(2, 1, 2, 1),
                text: '!',
            },
        ]);
        const snapshot = model.createSnapshot();
        const snapshot1 = model.createSnapshot();
        assert.strictEqual(model.getLinesContent().join('\n'), getValueInSnapshot(snapshot));
        model.applyEdits([
            {
                range: new Range(2, 1, 2, 2),
                text: '',
            },
        ]);
        model.applyEdits([
            {
                range: new Range(2, 1, 2, 1),
                text: '!',
            },
        ]);
        assert.strictEqual(model.getLinesContent().join('\n'), getValueInSnapshot(snapshot1));
        model.dispose();
    });
    test('immutable snapshot 1', () => {
        const model = createTextModel('abc\ndef');
        const snapshot = model.createSnapshot();
        model.applyEdits([
            {
                range: new Range(2, 1, 2, 4),
                text: '',
            },
        ]);
        model.applyEdits([
            {
                range: new Range(1, 1, 2, 1),
                text: 'abc\ndef',
            },
        ]);
        assert.strictEqual(model.getLinesContent().join('\n'), getValueInSnapshot(snapshot));
        model.dispose();
    });
    test('immutable snapshot 2', () => {
        const model = createTextModel('abc\ndef');
        const snapshot = model.createSnapshot();
        model.applyEdits([
            {
                range: new Range(2, 1, 2, 1),
                text: '!',
            },
        ]);
        model.applyEdits([
            {
                range: new Range(2, 1, 2, 2),
                text: '',
            },
        ]);
        assert.strictEqual(model.getLinesContent().join('\n'), getValueInSnapshot(snapshot));
        model.dispose();
    });
    test('immutable snapshot 3', () => {
        const model = createTextModel('abc\ndef');
        model.applyEdits([
            {
                range: new Range(2, 4, 2, 4),
                text: '!',
            },
        ]);
        const snapshot = model.createSnapshot();
        model.applyEdits([
            {
                range: new Range(2, 5, 2, 5),
                text: '!',
            },
        ]);
        assert.notStrictEqual(model.getLinesContent().join('\n'), getValueInSnapshot(snapshot));
        model.dispose();
    });
});
suite('chunk based search', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    test('#45892. For some cases, the buffer is empty but we still try to search', () => {
        const pieceTree = createTextBuffer(['']);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(0, 1);
        const ret = pieceTree.findMatchesLineByLine(new Range(1, 1, 1, 1), new SearchData(/abc/, new WordCharacterClassifier(',./', []), 'abc'), true, 1000);
        assert.strictEqual(ret.length, 0);
    });
    test('#45770. FindInNode should not cross node boundary.', () => {
        const pieceTree = createTextBuffer([
            [
                'balabalababalabalababalabalaba',
                'balabalababalabalababalabalaba',
                '',
                '* [ ] task1',
                '* [x] task2 balabalaba',
                '* [ ] task 3',
            ].join('\n'),
        ]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(0, 62);
        pieceTable.delete(16, 1);
        pieceTable.insert(16, ' ');
        const ret = pieceTable.findMatchesLineByLine(new Range(1, 1, 4, 13), new SearchData(/\[/gi, new WordCharacterClassifier(',./', []), '['), true, 1000);
        assert.strictEqual(ret.length, 3);
        assert.deepStrictEqual(ret[0].range, new Range(2, 3, 2, 4));
        assert.deepStrictEqual(ret[1].range, new Range(3, 3, 3, 4));
        assert.deepStrictEqual(ret[2].range, new Range(4, 3, 4, 4));
    });
    test('search searching from the middle', () => {
        const pieceTree = createTextBuffer([['def', 'dbcabc'].join('\n')]);
        ds.add(pieceTree);
        const pieceTable = pieceTree.getPieceTree();
        pieceTable.delete(4, 1);
        let ret = pieceTable.findMatchesLineByLine(new Range(2, 3, 2, 6), new SearchData(/a/gi, null, 'a'), true, 1000);
        assert.strictEqual(ret.length, 1);
        assert.deepStrictEqual(ret[0].range, new Range(2, 3, 2, 4));
        pieceTable.delete(4, 1);
        ret = pieceTable.findMatchesLineByLine(new Range(2, 2, 2, 5), new SearchData(/a/gi, null, 'a'), true, 1000);
        assert.strictEqual(ret.length, 1);
        assert.deepStrictEqual(ret[0].range, new Range(2, 2, 2, 3));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGllY2VUcmVlVGV4dEJ1ZmZlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL3BpZWNlVHJlZVRleHRCdWZmZXIvcGllY2VUcmVlVGV4dEJ1ZmZlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBbUMsVUFBVSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHekYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFDdkgsT0FBTyxFQUVOLFFBQVEsR0FFUixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsTUFBTSxRQUFRLEdBQUcsMERBQTBELENBQUE7QUFFM0UsU0FBUyxVQUFVO0lBQ2xCLE9BQU8sUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtBQUM1QyxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsS0FBYTtJQUMvQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFRCxTQUFT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LENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUM3QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsT0FBTyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDOUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLE9BQU8sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FB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Q3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDeEQsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNaLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUUzQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hELG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM1QixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDWixNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFL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RyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDOUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFFBQVEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFD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QUFDLENBQUE7UUFDL0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxRQUFRLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMvQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDL0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2pDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hELG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUE7UUFDYixNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDekMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9CLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDN0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDeEQsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1FBQzNDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNaLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNqQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN4RCxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0QyxNQUFNLEVBQUUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXBELElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUUzQyxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RSxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFD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Q0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNwQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsY0FBYyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0QsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDcEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLGFBQWEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQ25DLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxhQUFhLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNuQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsWUFBWSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDN0QsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsRCxjQUFjLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQy9CLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFcEQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDWixNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUM1QyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBQzVDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQzdDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRFLGNBQWMsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDL0Isb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUNuRCxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUMzQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUNqQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2Qix1QkFBdUI7UUFFdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0Usb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNaLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN6QyxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUUzQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM1QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDNUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQy9CLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUM5QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsUUFBUSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDN0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXZELGdCQUFnQixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNqQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDakQsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFBO1FBQ1osTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRTNDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFaEQsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtRQUMvQixJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDWixNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUM1QyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBQzVDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxzQkFBc0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQzdDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyx1QkFBdUIsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNqQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFBO1FBQ1osTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzNDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLHVCQUF1QixDQUFDLENBQUE7UUFDN0MsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUM3QyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN2RSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtRQUM1QyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsc0JBQXNCLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxVQUFVLENBQUMsTUFBTSxDQUFD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L0MsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMs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TSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2pDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUMzRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDakMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTNELGdCQUFnQixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNqQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNaLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0MsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxD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QyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENB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RyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV6RCxNQUFNLEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsWUFBWSxFQUFFLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNELG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsSUFBSSxHQUFHLEdBQUcsVUFBVSxDQUFBO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBRWhELGdCQUFnQixDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNqQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLElBQUksR0FBRyxHQUFHLFVBQVUsQ0FBQTtRQUNwQixNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3ZELEVBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFBO1FBRTNDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNoRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNoQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDakMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNqQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFM0QsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2pDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7UUFDekIsSUFBSSxHQUFHLEdBQUcsVUFBVSxDQUFBO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFM0MsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6RCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDaEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDaEMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pELFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQ2hDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxD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QUFFLENBQUMsQ0FBQyxHQUFHLGNBQWMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDbEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2hELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNsRCxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUNsQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsWUFBWSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLEVBQUUsRUFB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QyxFQUFFLEdBQUcsRUFBRTtRQUMzQyxNQUFNLFNBQVMsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDcEQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUM3RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDNUQsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM1RSxNQUFNLENBQUMs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LENBQUE7UUFDMUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXBELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUVyRCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFbEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsRCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUMxQixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFcEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXJELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsRCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFFbEQsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDMUIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRXBELFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUVsRCxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QixHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxD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VUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDMUIsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLHFCQUFxQixDQUMzQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDdEIsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLElBQUksdUJBQXVCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUNuRSxJQUFJLEVBQ0osSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDNUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzdDLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRSxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pCLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUUzQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2QixJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMscUJBQXFCLENBQ3pDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNyQixJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUNoQyxJQUFJLEVBQ0osSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0QsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdkIsR0FBRyxHQUFHLFVBQVUsQ0FBQyxxQkFBcUIsQ0FDckMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JCLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQ2hDLElBQUksRUFDSixJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1RCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=