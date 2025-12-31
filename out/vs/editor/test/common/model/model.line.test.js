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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwubGluZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL21vZGVsLmxpbmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFDTix5QkFBeUIsRUFLekIsb0JBQW9CLEdBRXBCLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDN0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBaUIsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFRckQsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFvQixFQUFFLFNBQXNCO0lBQ3JFLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDekMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDcEUsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3JELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUtsQyxNQUFNLE1BQU0sR0FBaUIs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Q0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLGNBQWMsQ0FDYjtZQUNDO2dCQUNDLElBQUksRUFBRSxhQUFhO2dCQUNuQixNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN2RTtTQUNELEVBQ0QsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFDNUM7WUFDQztnQkFDQyxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO1NBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLGNBQWMsQ0FDYjtZQUNDO2dCQUNDLElBQUksRUFBRSxhQUFhO2dCQUNuQixNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUN2RTtTQUNELEVBQ0QsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFDN0M7WUFDQztnQkFDQyxJQUFJLEVB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QUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDdkU7U0FDRCxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsY0FBYyxDQUNiO1lBQ0M7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3ZFO1NBQ0QsRUFDRCxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUM3QztZQUNDO2dCQUNDLElBQUksRUFBRSx3QkFBd0I7Z0JBQzlCLE1BQU0sRUFBRTtvQkFDUCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FB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