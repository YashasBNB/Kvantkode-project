/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../common/languages.js';
import { computeIndentLevel } from '../../../common/model/utils.js';
import { ContiguousMultilineTokensBuilder } from '../../../common/tokens/contiguousMultilineTokensBuilder.js';
import { LineTokens } from '../../../common/tokens/lineTokens.js';
import { TestLineTokenFactory } from '../core/testLineToken.js';
import { createTextModel } from '../testTextModel.js';
function assertLineTokens(__actual, _expected) {
    const tmp = TestToken.toTokens(_expected);
    LineTokens.convertToEndOffset(tmp, __actual.getLineContent().length);
    const expected = TestLineTokenFactory.inflateArr(tmp);
    const _actual = __actual.inflate();
    const actual = [];
    for (let i = 0, len = _actual.getCount(); i < len; i++) {
        actual[i] = {
            endIndex: _actual.getEndOffset(i),
            type: _actual.getClassName(i),
        };
    }
    const decode = (token) => {
        return {
            endIndex: token.endIndex,
            type: token.getType(),
        };
    };
    assert.deepStrictEqual(actual, expected.map(decode));
}
suite('ModelLine - getIndentLevel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertIndentLevel(text, expected, tabSize = 4) {
        const actual = computeIndentLevel(text, tabSize);
        assert.strictEqual(actual, expected, text);
    }
    test('getIndentLevel', () => {
        assertIndentLevel('', -1);
        assertIndentLevel(' ', -1);
        assertIndentLevel('   \t', -1);
        assertIndentLevel('Hello', 0);
        assertIndentLevel(' Hello', 1);
        assertIndentLevel('   Hello', 3);
        assertIndentLevel('\tHello', 4);
        assertIndentLevel(' \tHello', 4);
        assertIndentLevel('  \tHello', 4);
        assertIndentLevel('   \tHello', 4);
        assertIndentLevel('    \tHello', 8);
        assertIndentLevel('     \tHello', 8);
        assertIndentLevel('\t Hello', 5);
        assertIndentLevel('\t \tHello', 8);
    });
});
class TestToken {
    constructor(startOffset, color) {
        this.startOffset = startOffset;
        this.color = color;
    }
    static toTokens(tokens) {
        if (tokens === null) {
            return null;
        }
        const tokensLen = tokens.length;
        const result = new Uint32Array(tokensLen << 1);
        for (let i = 0; i < tokensLen; i++) {
            const token = tokens[i];
            result[i << 1] = token.startOffset;
            result[(i << 1) + 1] = (token.color << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0;
        }
        return result;
    }
}
class ManualTokenizationSupport {
    constructor() {
        this.tokens = new Map();
        this.stores = new Set();
    }
    setLineTokens(lineNumber, tokens) {
        const b = new ContiguousMultilineTokensBuilder();
        b.add(lineNumber, tokens);
        for (const s of this.stores) {
            s.setTokens(b.finalize());
        }
    }
    getInitialState() {
        return new LineState(1);
    }
    tokenize(line, hasEOL, state) {
        throw new Error();
    }
    tokenizeEncoded(line, hasEOL, state) {
        const s = state;
        return new EncodedTokenizationResult(this.tokens.get(s.lineNumber), new LineState(s.lineNumber + 1));
    }
    /**
     * Can be/return undefined if default background tokenization should be used.
     */
    createBackgroundTokenizer(textModel, store) {
        this.stores.add(store);
        return {
            dispose: () => {
                this.stores.delete(store);
            },
            requestTokens(startLineNumber, endLineNumberExclusive) { },
        };
    }
}
class LineState {
    constructor(lineNumber) {
        this.lineNumber = lineNumber;
    }
    clone() {
        return this;
    }
    equals(other) {
        return other.lineNumber === this.lineNumber;
    }
}
suite('ModelLinesTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testApplyEdits(initial, edits, expected) {
        const initialText = initial.map((el) => el.text).join('\n');
        const s = new ManualTokenizationSupport();
        const d = TokenizationRegistry.register('test', s);
        const model = createTextModel(initialText, 'test');
        model.onBeforeAttached();
        for (let lineIndex = 0; lineIndex < initial.length; lineIndex++) {
            const lineTokens = initial[lineIndex].tokens;
            const lineTextLength = model.getLineMaxColumn(lineIndex + 1) - 1;
            const tokens = TestToken.toTokens(lineTokens);
            LineTokens.convertToEndOffset(tokens, lineTextLength);
            s.setLineTokens(lineIndex + 1, tokens);
        }
        model.applyEdits(edits.map((ed) => ({
            identifier: null,
            range: ed.range,
            text: ed.text,
            forceMoveMarkers: false,
        })));
        for (let lineIndex = 0; lineIndex < expected.length; lineIndex++) {
            const actualLine = model.getLineContent(lineIndex + 1);
            const actualTokens = model.tokenization.getLineTokens(lineIndex + 1);
            assert.strictEqual(actualLine, expected[lineIndex].text);
            assertLineTokens(actualTokens, expected[lineIndex].tokens);
        }
        model.dispose();
        d.dispose();
    }
    test('single delete 1', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 1, 1, 2), text: '' }], [
            {
                text: 'ello world',
                tokens: [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)],
            },
        ]);
    });
    test('single delete 2', () => {
        testApplyEdits([
            {
                text: 'helloworld',
                tokens: [new TestToken(0, 1), new TestToken(5, 2)],
            },
        ], [{ range: new Range(1, 3, 1, 8), text: '' }], [
            {
                text: 'herld',
                tokens: [new TestToken(0, 1), new TestToken(2, 2)],
            },
        ]);
    });
    test('single delete 3', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 1, 1, 6), text: '' }], [
            {
                text: ' world',
                tokens: [new TestToken(0, 2), new TestToken(1, 3)],
            },
        ]);
    });
    test('single delete 4', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 2, 1, 7), text: '' }], [
            {
                text: 'hworld',
                tokens: [new TestToken(0, 1), new TestToken(1, 3)],
            },
        ]);
    });
    test('single delete 5', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 1, 1, 12), text: '' }], [
            {
                text: '',
                tokens: [new TestToken(0, 1)],
            },
        ]);
    });
    test('multi delete 6', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)],
            },
        ], [{ range: new Range(1, 6, 3, 6), text: '' }], [
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 8), new TestToken(6, 9)],
            },
        ]);
    });
    test('multi delete 7', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)],
            },
        ], [{ range: new Range(1, 12, 3, 12), text: '' }], [
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ]);
    });
    test('multi delete 8', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)],
            },
        ], [{ range: new Range(1, 1, 3, 1), text: '' }], [
            {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)],
            },
        ]);
    });
    test('multi delete 9', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 7), new TestToken(5, 8), new TestToken(6, 9)],
            },
        ], [{ range: new Range(1, 12, 3, 1), text: '' }], [
            {
                text: 'hello worldhello world',
                tokens: [
                    new TestToken(0, 1),
                    new TestToken(5, 2),
                    new TestToken(6, 3),
                    new TestToken(11, 7),
                    new TestToken(16, 8),
                    new TestToken(17, 9),
                ],
            },
        ]);
    });
    test('single insert 1', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 1, 1, 1), text: 'xx' }], [
            {
                text: 'xxhello world',
                tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)],
            },
        ]);
    });
    test('single insert 2', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 2, 1, 2), text: 'xx' }], [
            {
                text: 'hxxello world',
                tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)],
            },
        ]);
    });
    test('single insert 3', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 6, 1, 6), text: 'xx' }], [
            {
                text: 'helloxx world',
                tokens: [new TestToken(0, 1), new TestToken(7, 2), new TestToken(8, 3)],
            },
        ]);
    });
    test('single insert 4', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 7, 1, 7), text: 'xx' }], [
            {
                text: 'hello xxworld',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(8, 3)],
            },
        ]);
    });
    test('single insert 5', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 12, 1, 12), text: 'xx' }], [
            {
                text: 'hello worldxx',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ]);
    });
    test('multi insert 6', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 1, 1, 1), text: '\n' }], [
            {
                text: '',
                tokens: [new TestToken(0, 1)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1)],
            },
        ]);
    });
    test('multi insert 7', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 12, 1, 12), text: '\n' }], [
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
            {
                text: '',
                tokens: [new TestToken(0, 1)],
            },
        ]);
    });
    test('multi insert 8', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
        ], [{ range: new Range(1, 7, 1, 7), text: '\n' }], [
            {
                text: 'hello ',
                tokens: [new TestToken(0, 1), new TestToken(5, 2)],
            },
            {
                text: 'world',
                tokens: [new TestToken(0, 1)],
            },
        ]);
    });
    test('multi insert 9', () => {
        testApplyEdits([
            {
                text: 'hello world',
                tokens: [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)],
            },
        ], [{ range: new Range(1, 7, 1, 7), text: 'xx\nyy' }], [
            {
                text: 'hello xx',
                tokens: [new TestToken(0, 1), new TestToken(5, 2)],
            },
            {
                text: 'yyworld',
                tokens: [new TestToken(0, 1)],
            },
            {
                text: 'hello world',
                tokens: [new TestToken(0, 4), new TestToken(5, 5), new TestToken(6, 6)],
            },
        ]);
    });
    function testLineEditTokens(initialText, initialTokens, edits, expectedText, expectedTokens) {
        testApplyEdits([
            {
                text: initialText,
                tokens: initialTokens,
            },
        ], edits.map((ed) => ({
            range: new Range(1, ed.startColumn, 1, ed.endColumn),
            text: ed.text,
        })), [
            {
                text: expectedText,
                tokens: expectedTokens,
            },
        ]);
    }
    test('insertion on empty line', () => {
        const s = new ManualTokenizationSupport();
        const d = TokenizationRegistry.register('test', s);
        const model = createTextModel('some text', 'test');
        const tokens = TestToken.toTokens([new TestToken(0, 1)]);
        LineTokens.convertToEndOffset(tokens, model.getLineMaxColumn(1) - 1);
        s.setLineTokens(1, tokens);
        model.applyEdits([
            {
                range: new Range(1, 1, 1, 10),
                text: '',
            },
        ]);
        s.setLineTokens(1, new Uint32Array(0));
        model.applyEdits([
            {
                range: new Range(1, 1, 1, 1),
                text: 'a',
            },
        ]);
        const actualTokens = model.tokenization.getLineTokens(1);
        assertLineTokens(actualTokens, [new TestToken(0, 1)]);
        model.dispose();
        d.dispose();
    });
    test('updates tokens on insertion 1', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 1,
                endColumn: 1,
                text: 'a',
            },
        ], 'aabcd efgh', [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)]);
    });
    test('updates tokens on insertion 2', () => {
        testLineEditTokens('aabcd efgh', [new TestToken(0, 1), new TestToken(5, 2), new TestToken(6, 3)], [
            {
                startColumn: 2,
                endColumn: 2,
                text: 'x',
            },
        ], 'axabcd efgh', [new TestToken(0, 1), new TestToken(6, 2), new TestToken(7, 3)]);
    });
    test('updates tokens on insertion 3', () => {
        testLineEditTokens('axabcd efgh', [new TestToken(0, 1), new TestToken(6, 2), new TestToken(7, 3)], [
            {
                startColumn: 3,
                endColumn: 3,
                text: 'stu',
            },
        ], 'axstuabcd efgh', [new TestToken(0, 1), new TestToken(9, 2), new TestToken(10, 3)]);
    });
    test('updates tokens on insertion 4', () => {
        testLineEditTokens('axstuabcd efgh', [new TestToken(0, 1), new TestToken(9, 2), new TestToken(10, 3)], [
            {
                startColumn: 10,
                endColumn: 10,
                text: '\t',
            },
        ], 'axstuabcd\t efgh', [new TestToken(0, 1), new TestToken(10, 2), new TestToken(11, 3)]);
    });
    test('updates tokens on insertion 5', () => {
        testLineEditTokens('axstuabcd\t efgh', [new TestToken(0, 1), new TestToken(10, 2), new TestToken(11, 3)], [
            {
                startColumn: 12,
                endColumn: 12,
                text: 'dd',
            },
        ], 'axstuabcd\t ddefgh', [new TestToken(0, 1), new TestToken(10, 2), new TestToken(13, 3)]);
    });
    test('updates tokens on insertion 6', () => {
        testLineEditTokens('axstuabcd\t ddefgh', [new TestToken(0, 1), new TestToken(10, 2), new TestToken(13, 3)], [
            {
                startColumn: 18,
                endColumn: 18,
                text: 'xyz',
            },
        ], 'axstuabcd\t ddefghxyz', [new TestToken(0, 1), new TestToken(10, 2), new TestToken(13, 3)]);
    });
    test('updates tokens on insertion 7', () => {
        testLineEditTokens('axstuabcd\t ddefghxyz', [new TestToken(0, 1), new TestToken(10, 2), new TestToken(13, 3)], [
            {
                startColumn: 1,
                endColumn: 1,
                text: 'x',
            },
        ], 'xaxstuabcd\t ddefghxyz', [new TestToken(0, 1), new TestToken(11, 2), new TestToken(14, 3)]);
    });
    test('updates tokens on insertion 8', () => {
        testLineEditTokens('xaxstuabcd\t ddefghxyz', [new TestToken(0, 1), new TestToken(11, 2), new TestToken(14, 3)], [
            {
                startColumn: 22,
                endColumn: 22,
                text: 'x',
            },
        ], 'xaxstuabcd\t ddefghxyzx', [new TestToken(0, 1), new TestToken(11, 2), new TestToken(14, 3)]);
    });
    test('updates tokens on insertion 9', () => {
        testLineEditTokens('xaxstuabcd\t ddefghxyzx', [new TestToken(0, 1), new TestToken(11, 2), new TestToken(14, 3)], [
            {
                startColumn: 2,
                endColumn: 2,
                text: '',
            },
        ], 'xaxstuabcd\t ddefghxyzx', [new TestToken(0, 1), new TestToken(11, 2), new TestToken(14, 3)]);
    });
    test('updates tokens on insertion 10', () => {
        testLineEditTokens('', [], [
            {
                startColumn: 1,
                endColumn: 1,
                text: 'a',
            },
        ], 'a', [new TestToken(0, 1)]);
    });
    test('delete second token 2', () => {
        testLineEditTokens('abcdefghij', [new TestToken(0, 1), new TestToken(3, 2), new TestToken(6, 3)], [
            {
                startColumn: 4,
                endColumn: 7,
                text: '',
            },
        ], 'abcghij', [new TestToken(0, 1), new TestToken(3, 3)]);
    });
    test('insert right before second token', () => {
        testLineEditTokens('abcdefghij', [new TestToken(0, 1), new TestToken(3, 2), new TestToken(6, 3)], [
            {
                startColumn: 4,
                endColumn: 4,
                text: 'hello',
            },
        ], 'abchellodefghij', [new TestToken(0, 1), new TestToken(8, 2), new TestToken(11, 3)]);
    });
    test('delete first char', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 1,
                endColumn: 2,
                text: '',
            },
        ], 'bcd efgh', [new TestToken(0, 1), new TestToken(3, 2), new TestToken(4, 3)]);
    });
    test('delete 2nd and 3rd chars', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 2,
                endColumn: 4,
                text: '',
            },
        ], 'ad efgh', [new TestToken(0, 1), new TestToken(2, 2), new TestToken(3, 3)]);
    });
    test('delete first token', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 1,
                endColumn: 5,
                text: '',
            },
        ], ' efgh', [new TestToken(0, 2), new TestToken(1, 3)]);
    });
    test('delete second token', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 5,
                endColumn: 6,
                text: '',
            },
        ], 'abcdefgh', [new TestToken(0, 1), new TestToken(4, 3)]);
    });
    test('delete second token + a bit of the third one', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 5,
                endColumn: 7,
                text: '',
            },
        ], 'abcdfgh', [new TestToken(0, 1), new TestToken(4, 3)]);
    });
    test('delete second and third token', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 5,
                endColumn: 10,
                text: '',
            },
        ], 'abcd', [new TestToken(0, 1)]);
    });
    test('delete everything', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 1,
                endColumn: 10,
                text: '',
            },
        ], '', [new TestToken(0, 1)]);
    });
    test('noop', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 1,
                endColumn: 1,
                text: '',
            },
        ], 'abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]);
    });
    test('equivalent to deleting first two chars', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 1,
                endColumn: 3,
                text: '',
            },
        ], 'cd efgh', [new TestToken(0, 1), new TestToken(2, 2), new TestToken(3, 3)]);
    });
    test('equivalent to deleting from 5 to the end', () => {
        testLineEditTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], [
            {
                startColumn: 5,
                endColumn: 10,
                text: '',
            },
        ], 'abcd', [new TestToken(0, 1)]);
    });
    test('updates tokens on replace 1', () => {
        testLineEditTokens('Hello world, ciao', [
            new TestToken(0, 1),
            new TestToken(5, 0),
            new TestToken(6, 2),
            new TestToken(11, 0),
            new TestToken(13, 0),
        ], [
            {
                startColumn: 1,
                endColumn: 6,
                text: 'Hi',
            },
        ], 'Hi world, ciao', [new TestToken(0, 0), new TestToken(3, 2), new TestToken(8, 0), new TestToken(10, 0)]);
    });
    test('updates tokens on replace 2', () => {
        testLineEditTokens('Hello world, ciao', [
            new TestToken(0, 1),
            new TestToken(5, 0),
            new TestToken(6, 2),
            new TestToken(11, 0),
            new TestToken(13, 0),
        ], [
            {
                startColumn: 1,
                endColumn: 6,
                text: 'Hi',
            },
            {
                startColumn: 8,
                endColumn: 12,
                text: 'my friends',
            },
        ], 'Hi wmy friends, ciao', [new TestToken(0, 0), new TestToken(3, 2), new TestToken(14, 0), new TestToken(16, 0)]);
    });
    function testLineSplitTokens(initialText, initialTokens, splitColumn, expectedText1, expectedText2, expectedTokens) {
        testApplyEdits([
            {
                text: initialText,
                tokens: initialTokens,
            },
        ], [
            {
                range: new Range(1, splitColumn, 1, splitColumn),
                text: '\n',
            },
        ], [
            {
                text: expectedText1,
                tokens: expectedTokens,
            },
            {
                text: expectedText2,
                tokens: [new TestToken(0, 1)],
            },
        ]);
    }
    test('split at the beginning', () => {
        testLineSplitTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], 1, '', 'abcd efgh', [new TestToken(0, 1)]);
    });
    test('split at the end', () => {
        testLineSplitTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], 10, 'abcd efgh', '', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]);
    });
    test('split inthe middle 1', () => {
        testLineSplitTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], 5, 'abcd', ' efgh', [new TestToken(0, 1)]);
    });
    test('split inthe middle 2', () => {
        testLineSplitTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], 6, 'abcd ', 'efgh', [new TestToken(0, 1), new TestToken(4, 2)]);
    });
    function testLineAppendTokens(aText, aTokens, bText, bTokens, expectedText, expectedTokens) {
        testApplyEdits([
            {
                text: aText,
                tokens: aTokens,
            },
            {
                text: bText,
                tokens: bTokens,
            },
        ], [
            {
                range: new Range(1, aText.length + 1, 2, 1),
                text: '',
            },
        ], [
            {
                text: expectedText,
                tokens: expectedTokens,
            },
        ]);
    }
    test('append empty 1', () => {
        testLineAppendTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], '', [], 'abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]);
    });
    test('append empty 2', () => {
        testLineAppendTokens('', [], 'abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], 'abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]);
    });
    test('append 1', () => {
        testLineAppendTokens('abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)], 'abcd efgh', [new TestToken(0, 4), new TestToken(4, 5), new TestToken(5, 6)], 'abcd efghabcd efgh', [
            new TestToken(0, 1),
            new TestToken(4, 2),
            new TestToken(5, 3),
            new TestToken(9, 4),
            new TestToken(13, 5),
            new TestToken(14, 6),
        ]);
    });
    test('append 2', () => {
        testLineAppendTokens('abcd ', [new TestToken(0, 1), new TestToken(4, 2)], 'efgh', [new TestToken(0, 3)], 'abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]);
    });
    test('append 3', () => {
        testLineAppendTokens('abcd', [new TestToken(0, 1)], ' efgh', [new TestToken(0, 2), new TestToken(1, 3)], 'abcd efgh', [new TestToken(0, 1), new TestToken(4, 2), new TestToken(5, 3)]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubGluZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvbW9kZWwubGluZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUNOLHlCQUF5QixFQUt6QixvQkFBb0IsR0FFcEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFpQixvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQVFyRCxTQUFTLGdCQUFnQixDQUFDLFFBQW9CLEVBQUUsU0FBc0I7SUFDckUsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUN6QyxVQUFVLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNwRSxNQUFNLFFBQVEsR0FBRyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDckQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBS2xDLE1BQU0sTUFBTSxH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O1NBQ0QsRUFDRCxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUM5QztZQUNDO2dCQUNDLElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDbEQ7WUFDRDtnQkFDQyxJQUFJLEVBQUUsT0FBTztnQkFDYixNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDN0I7U0FDRCxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsY0FBYyxDQUNiO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1NBQ0QsRUFDRCxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxF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