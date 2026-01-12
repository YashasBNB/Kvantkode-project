/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TokenizationRegistry, EncodedTokenizationResult, } from '../../../common/languages.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { TestLineToken } from '../core/testLineToken.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../testTextModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function createTextModelWithBrackets(disposables, text, brackets) {
    const languageId = 'bracketMode2';
    const instantiationService = createModelServices(disposables);
    const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
    const languageService = instantiationService.get(ILanguageService);
    disposables.add(languageService.registerLanguage({ id: languageId }));
    disposables.add(languageConfigurationService.register(languageId, { brackets }));
    return disposables.add(instantiateTextModel(instantiationService, text, languageId));
}
suite('TextModelWithTokens', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testBrackets(contents, brackets) {
        const languageId = 'testMode';
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: brackets,
        }));
        function toRelaxedFoundBracket(a) {
            if (!a) {
                return null;
            }
            return {
                range: a.range.toString(),
                info: a.bracketInfo,
            };
        }
        const charIsBracket = {};
        const charIsOpenBracket = {};
        const openForChar = {};
        const closeForChar = {};
        brackets.forEach((b) => {
            charIsBracket[b[0]] = true;
            charIsBracket[b[1]] = true;
            charIsOpenBracket[b[0]] = true;
            charIsOpenBracket[b[1]] = false;
            openForChar[b[0]] = b[0];
            closeForChar[b[0]] = b[1];
            openForChar[b[1]] = b[0];
            closeForChar[b[1]] = b[1];
        });
        const expectedBrackets = [];
        for (let lineIndex = 0; lineIndex < contents.length; lineIndex++) {
            const lineText = contents[lineIndex];
            for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
                const ch = lineText.charAt(charIndex);
                if (charIsBracket[ch]) {
                    expectedBrackets.push({
                        bracketInfo: languageConfigurationService
                            .getLanguageConfiguration(languageId)
                            .bracketsNew.getBracketInfo(ch),
                        range: new Range(lineIndex + 1, charIndex + 1, lineIndex + 1, charIndex + 2),
                    });
                }
            }
        }
        const model = disposables.add(instantiateTextModel(instantiationService, contents.join('\n'), languageId));
        // findPrevBracket
        {
            let expectedBracketIndex = expectedBrackets.length - 1;
            let currentExpectedBracket = expectedBracketIndex >= 0 ? expectedBrackets[expectedBracketIndex] : null;
            for (let lineNumber = contents.length; lineNumber >= 1; lineNumber--) {
                const lineText = contents[lineNumber - 1];
                for (let column = lineText.length + 1; column >= 1; column--) {
                    if (currentExpectedBracket) {
                        if (lineNumber === currentExpectedBracket.range.startLineNumber &&
                            column < currentExpectedBracket.range.endColumn) {
                            expectedBracketIndex--;
                            currentExpectedBracket =
                                expectedBracketIndex >= 0 ? expectedBrackets[expectedBracketIndex] : null;
                        }
                    }
                    const actual = model.bracketPairs.findPrevBracket({
                        lineNumber: lineNumber,
                        column: column,
                    });
                    assert.deepStrictEqual(toRelaxedFoundBracket(actual), toRelaxedFoundBracket(currentExpectedBracket), 'findPrevBracket of ' + lineNumber + ', ' + column);
                }
            }
        }
        // findNextBracket
        {
            let expectedBracketIndex = 0;
            let currentExpectedBracket = expectedBracketIndex < expectedBrackets.length
                ? expectedBrackets[expectedBracketIndex]
                : null;
            for (let lineNumber = 1; lineNumber <= contents.length; lineNumber++) {
                const lineText = contents[lineNumber - 1];
                for (let column = 1; column <= lineText.length + 1; column++) {
                    if (currentExpectedBracket) {
                        if (lineNumber === currentExpectedBracket.range.startLineNumber &&
                            column > currentExpectedBracket.range.startColumn) {
                            expectedBracketIndex++;
                            currentExpectedBracket =
                                expectedBracketIndex < expectedBrackets.length
                                    ? expectedBrackets[expectedBracketIndex]
                                    : null;
                        }
                    }
                    const actual = model.bracketPairs.findNextBracket({
                        lineNumber: lineNumber,
                        column: column,
                    });
                    assert.deepStrictEqual(toRelaxedFoundBracket(actual), toRelaxedFoundBracket(currentExpectedBracket), 'findNextBracket of ' + lineNumber + ', ' + column);
                }
            }
        }
        disposables.dispose();
    }
    test('brackets1', () => {
        testBrackets(['if (a == 3) { return (7 * (a + 5)); }'], [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ]);
    });
});
function assertIsNotBracket(model, lineNumber, column) {
    const match = model.bracketPairs.matchBracket(new Position(lineNumber, column));
    assert.strictEqual(match, null, 'is not matching brackets at ' + lineNumber + ', ' + column);
}
function assertIsBracket(model, testPosition, expected) {
    expected.sort(Range.compareRangesUsingStarts);
    const actual = model.bracketPairs.matchBracket(testPosition);
    actual?.sort(Range.compareRangesUsingStarts);
    assert.deepStrictEqual(actual, expected, 'matches brackets at ' + testPosition);
}
suite('TextModelWithTokens - bracket matching', () => {
    const languageId = 'bracketMode1';
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bracket matching 1', () => {
        const text = ')]}{[(' + '\n' + ')]}{[(';
        const model = disposables.add(instantiateTextModel(instantiationService, text, languageId));
        assertIsNotBracket(model, 1, 1);
        assertIsNotBracket(model, 1, 2);
        assertIsNotBracket(model, 1, 3);
        assertIsBracket(model, new Position(1, 4), [new Range(1, 4, 1, 5), new Range(2, 3, 2, 4)]);
        assertIsBracket(model, new Position(1, 5), [new Range(1, 5, 1, 6), new Range(2, 2, 2, 3)]);
        assertIsBracket(model, new Position(1, 6), [new Range(1, 6, 1, 7), new Range(2, 1, 2, 2)]);
        assertIsBracket(model, new Position(1, 7), [new Range(1, 6, 1, 7), new Range(2, 1, 2, 2)]);
        assertIsBracket(model, new Position(2, 1), [new Range(2, 1, 2, 2), new Range(1, 6, 1, 7)]);
        assertIsBracket(model, new Position(2, 2), [new Range(2, 2, 2, 3), new Range(1, 5, 1, 6)]);
        assertIsBracket(model, new Position(2, 3), [new Range(2, 3, 2, 4), new Range(1, 4, 1, 5)]);
        assertIsBracket(model, new Position(2, 4), [new Range(2, 3, 2, 4), new Range(1, 4, 1, 5)]);
        assertIsNotBracket(model, 2, 5);
        assertIsNotBracket(model, 2, 6);
        assertIsNotBracket(model, 2, 7);
    });
    test('bracket matching 2', () => {
        const text = 'var bar = {' + '\n' + 'foo: {' + '\n' + '}, bar: {hallo: [{' + '\n' + '}, {' + '\n' + '}]}}';
        const model = disposables.add(instantiateTextModel(instantiationService, text, languageId));
        const brackets = [
            [new Position(1, 11), new Range(1, 11, 1, 12), new Range(5, 4, 5, 5)],
            [new Position(1, 12), new Range(1, 11, 1, 12), new Range(5, 4, 5, 5)],
            [new Position(2, 6), new Range(2, 6, 2, 7), new Range(3, 1, 3, 2)],
            [new Position(2, 7), new Range(2, 6, 2, 7), new Range(3, 1, 3, 2)],
            [new Position(3, 1), new Range(3, 1, 3, 2), new Range(2, 6, 2, 7)],
            [new Position(3, 2), new Range(3, 1, 3, 2), new Range(2, 6, 2, 7)],
            [new Position(3, 9), new Range(3, 9, 3, 10), new Range(5, 3, 5, 4)],
            [new Position(3, 10), new Range(3, 9, 3, 10), new Range(5, 3, 5, 4)],
            [new Position(3, 17), new Range(3, 17, 3, 18), new Range(5, 2, 5, 3)],
            [new Position(3, 18), new Range(3, 18, 3, 19), new Range(4, 1, 4, 2)],
            [new Position(3, 19), new Range(3, 18, 3, 19), new Range(4, 1, 4, 2)],
            [new Position(4, 1), new Range(4, 1, 4, 2), new Range(3, 18, 3, 19)],
            [new Position(4, 2), new Range(4, 1, 4, 2), new Range(3, 18, 3, 19)],
            [new Position(4, 4), new Range(4, 4, 4, 5), new Range(5, 1, 5, 2)],
            [new Position(4, 5), new Range(4, 4, 4, 5), new Range(5, 1, 5, 2)],
            [new Position(5, 1), new Range(5, 1, 5, 2), new Range(4, 4, 4, 5)],
            [new Position(5, 2), new Range(5, 2, 5, 3), new Range(3, 17, 3, 18)],
            [new Position(5, 3), new Range(5, 3, 5, 4), new Range(3, 9, 3, 10)],
            [new Position(5, 4), new Range(5, 4, 5, 5), new Range(1, 11, 1, 12)],
            [new Position(5, 5), new Range(5, 4, 5, 5), new Range(1, 11, 1, 12)],
        ];
        const isABracket = {
            1: {},
            2: {},
            3: {},
            4: {},
            5: {},
        };
        for (let i = 0, len = brackets.length; i < len; i++) {
            const [testPos, b1, b2] = brackets[i];
            assertIsBracket(model, testPos, [b1, b2]);
            isABracket[testPos.lineNumber][testPos.column] = true;
        }
        for (let i = 1, len = model.getLineCount(); i <= len; i++) {
            const line = model.getLineContent(i);
            for (let j = 1, lenJ = line.length + 1; j <= lenJ; j++) {
                if (!isABracket[i].hasOwnProperty(j)) {
                    assertIsNotBracket(model, i, j);
                }
            }
        }
    });
});
suite('TextModelWithTokens 2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('bracket matching 3', () => {
        const text = [
            'begin',
            '    loop',
            '        if then',
            '        end if;',
            '    end loop;',
            'end;',
            '',
            'begin',
            '    loop',
            '        if then',
            '        end ifa;',
            '    end loop;',
            'end;',
        ].join('\n');
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, text, [
            ['if', 'end if'],
            ['loop', 'end loop'],
            ['begin', 'end'],
        ]);
        // <if> ... <end ifa> is not matched
        assertIsNotBracket(model, 10, 9);
        // <if> ... <end if> is matched
        assertIsBracket(model, new Position(3, 9), [new Range(3, 9, 3, 11), new Range(4, 9, 4, 15)]);
        assertIsBracket(model, new Position(4, 9), [new Range(4, 9, 4, 15), new Range(3, 9, 3, 11)]);
        // <loop> ... <end loop> is matched
        assertIsBracket(model, new Position(2, 5), [new Range(2, 5, 2, 9), new Range(5, 5, 5, 13)]);
        assertIsBracket(model, new Position(5, 5), [new Range(5, 5, 5, 13), new Range(2, 5, 2, 9)]);
        // <begin> ... <end> is matched
        assertIsBracket(model, new Position(1, 1), [new Range(1, 1, 1, 6), new Range(6, 1, 6, 4)]);
        assertIsBracket(model, new Position(6, 1), [new Range(6, 1, 6, 4), new Range(1, 1, 1, 6)]);
        disposables.dispose();
    });
    test('bracket matching 4', () => {
        const text = ['recordbegin', '  simplerecordbegin', '  endrecord', 'endrecord'].join('\n');
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, text, [
            ['recordbegin', 'endrecord'],
            ['simplerecordbegin', 'endrecord'],
        ]);
        // <recordbegin> ... <endrecord> is matched
        assertIsBracket(model, new Position(1, 1), [new Range(1, 1, 1, 12), new Range(4, 1, 4, 10)]);
        assertIsBracket(model, new Position(4, 1), [new Range(4, 1, 4, 10), new Range(1, 1, 1, 12)]);
        // <simplerecordbegin> ... <endrecord> is matched
        assertIsBracket(model, new Position(2, 3), [new Range(2, 3, 2, 20), new Range(3, 3, 3, 12)]);
        assertIsBracket(model, new Position(3, 3), [new Range(3, 3, 3, 12), new Range(2, 3, 2, 20)]);
        disposables.dispose();
    });
    test('issue #95843: Highlighting of closing braces is indicating wrong brace when cursor is behind opening brace', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        const mode1 = 'testMode1';
        const mode2 = 'testMode2';
        const languageIdCodec = languageService.languageIdCodec;
        disposables.add(languageService.registerLanguage({ id: mode1 }));
        disposables.add(languageService.registerLanguage({ id: mode2 }));
        const encodedMode1 = languageIdCodec.encodeLanguageId(mode1);
        const encodedMode2 = languageIdCodec.encodeLanguageId(mode2);
        const otherMetadata1 = ((encodedMode1 << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) |
            1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) >>>
            0;
        const otherMetadata2 = ((encodedMode2 << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */) |
            1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */) >>>
            0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                switch (line) {
                    case 'function f() {': {
                        const tokens = new Uint32Array([
                            0,
                            otherMetadata1,
                            8,
                            otherMetadata1,
                            9,
                            otherMetadata1,
                            10,
                            otherMetadata1,
                            11,
                            otherMetadata1,
                            12,
                            otherMetadata1,
                            13,
                            otherMetadata1,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '  return <p>{true}</p>;': {
                        const tokens = new Uint32Array([
                            0,
                            otherMetadata1,
                            2,
                            otherMetadata1,
                            8,
                            otherMetadata1,
                            9,
                            otherMetadata2,
                            10,
                            otherMetadata2,
                            11,
                            otherMetadata2,
                            12,
                            otherMetadata2,
                            13,
                            otherMetadata1,
                            17,
                            otherMetadata2,
                            18,
                            otherMetadata2,
                            20,
                            otherMetadata2,
                            21,
                            otherMetadata2,
                            22,
                            otherMetadata2,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '}': {
                        const tokens = new Uint32Array([0, otherMetadata1]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                }
                throw new Error(`Unexpected`);
            },
        };
        disposables.add(TokenizationRegistry.register(mode1, tokenizationSupport));
        disposables.add(languageConfigurationService.register(mode1, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        disposables.add(languageConfigurationService.register(mode2, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, ['function f() {', '  return <p>{true}</p>;', '}'].join('\n'), mode1));
        model.tokenization.forceTokenization(1);
        model.tokenization.forceTokenization(2);
        model.tokenization.forceTokenization(3);
        assert.deepStrictEqual(model.bracketPairs.matchBracket(new Position(2, 14)), [
            new Range(2, 13, 2, 14),
            new Range(2, 18, 2, 19),
        ]);
        disposables.dispose();
    });
    test('issue #88075: TypeScript brace matching is incorrect in `${}` strings', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const mode = 'testMode';
        const languageIdCodec = instantiationService.get(ILanguageService).languageIdCodec;
        const encodedMode = languageIdCodec.encodeLanguageId(mode);
        const otherMetadata = ((encodedMode << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (0 /* StandardTokenType.Other */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>>
            0;
        const stringMetadata = ((encodedMode << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
            (2 /* StandardTokenType.String */ << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */)) >>>
            0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                switch (line) {
                    case 'function hello() {': {
                        const tokens = new Uint32Array([0, otherMetadata]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '    console.log(`${100}`);': {
                        const tokens = new Uint32Array([
                            0,
                            otherMetadata,
                            16,
                            stringMetadata,
                            19,
                            otherMetadata,
                            22,
                            stringMetadata,
                            24,
                            otherMetadata,
                        ]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                    case '}': {
                        const tokens = new Uint32Array([0, otherMetadata]);
                        return new EncodedTokenizationResult(tokens, state);
                    }
                }
                throw new Error(`Unexpected`);
            },
        };
        disposables.add(TokenizationRegistry.register(mode, tokenizationSupport));
        disposables.add(languageConfigurationService.register(mode, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, ['function hello() {', '    console.log(`${100}`);', '}'].join('\n'), mode));
        model.tokenization.forceTokenization(1);
        model.tokenization.forceTokenization(2);
        model.tokenization.forceTokenization(3);
        assert.deepStrictEqual(model.bracketPairs.matchBracket(new Position(2, 23)), null);
        assert.deepStrictEqual(model.bracketPairs.matchBracket(new Position(2, 20)), null);
        disposables.dispose();
    });
});
suite('TextModelWithTokens regression tests', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test("microsoft/monaco-editor#122: Unhandled Exception: TypeError: Unable to get property 'replace' of undefined or null reference", () => {
        function assertViewLineTokens(model, lineNumber, forceTokenization, expected) {
            if (forceTokenization) {
                model.tokenization.forceTokenization(lineNumber);
            }
            const _actual = model.tokenization.getLineTokens(lineNumber).inflate();
            const actual = [];
            for (let i = 0, len = _actual.getCount(); i < len; i++) {
                actual[i] = {
                    endIndex: _actual.getEndOffset(i),
                    foreground: _actual.getForeground(i),
                };
            }
            const decode = (token) => {
                return {
                    endIndex: token.endIndex,
                    foreground: token.getForeground(),
                };
            };
            assert.deepStrictEqual(actual, expected.map(decode));
        }
        let _tokenId = 10;
        const LANG_ID1 = 'indicisiveMode1';
        const LANG_ID2 = 'indicisiveMode2';
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const myId = ++_tokenId;
                const tokens = new Uint32Array(2);
                tokens[0] = 0;
                tokens[1] = (myId << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0;
                return new EncodedTokenizationResult(tokens, state);
            },
        };
        const registration1 = TokenizationRegistry.register(LANG_ID1, tokenizationSupport);
        const registration2 = TokenizationRegistry.register(LANG_ID2, tokenizationSupport);
        const model = createTextModel('A model with\ntwo lines');
        assertViewLineTokens(model, 1, true, [createViewLineToken(12, 1)]);
        assertViewLineTokens(model, 2, true, [createViewLineToken(9, 1)]);
        model.setLanguage(LANG_ID1);
        assertViewLineTokens(model, 1, true, [createViewLineToken(12, 11)]);
        assertViewLineTokens(model, 2, true, [createViewLineToken(9, 12)]);
        model.setLanguage(LANG_ID2);
        assertViewLineTokens(model, 1, false, [createViewLineToken(12, 1)]);
        assertViewLineTokens(model, 2, false, [createViewLineToken(9, 1)]);
        model.dispose();
        registration1.dispose();
        registration2.dispose();
        function createViewLineToken(endIndex, foreground) {
            const metadata = (foreground << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0;
            return new TestLineToken(endIndex, metadata);
        }
    });
    test("microsoft/monaco-editor#133: Error: Cannot read property 'modeId' of undefined", () => {
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, [
            'Imports System',
            'Imports System.Collections.Generic',
            '',
            'Module m1',
            '',
            '\tSub Main()',
            '\tEnd Sub',
            '',
            'End Module',
        ].join('\n'), [
            ['module', 'end module'],
            ['sub', 'end sub'],
        ]);
        const actual = model.bracketPairs.matchBracket(new Position(4, 1));
        assert.deepStrictEqual(actual, [new Range(4, 1, 4, 7), new Range(9, 1, 9, 11)]);
        disposables.dispose();
    });
    test('issue #11856: Bracket matching does not work as expected if the opening brace symbol is contained in the closing brace symbol', () => {
        const disposables = new DisposableStore();
        const model = createTextModelWithBrackets(disposables, ['sequence "outer"', '     sequence "inner"', '     endsequence', 'endsequence'].join('\n'), [
            ['sequence', 'endsequence'],
            ['feature', 'endfeature'],
        ]);
        const actual = model.bracketPairs.matchBracket(new Position(3, 9));
        assert.deepStrictEqual(actual, [new Range(2, 6, 2, 14), new Range(3, 6, 3, 17)]);
        disposables.dispose();
    });
    test('issue #63822: Wrong embedded language detected for empty lines', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageService = instantiationService.get(ILanguageService);
        const outerMode = 'outerMode';
        const innerMode = 'innerMode';
        disposables.add(languageService.registerLanguage({ id: outerMode }));
        disposables.add(languageService.registerLanguage({ id: innerMode }));
        const languageIdCodec = instantiationService.get(ILanguageService).languageIdCodec;
        const encodedInnerMode = languageIdCodec.encodeLanguageId(innerMode);
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokens = new Uint32Array(2);
                tokens[0] = 0;
                tokens[1] = (encodedInnerMode << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) >>> 0;
                return new EncodedTokenizationResult(tokens, state);
            },
        };
        disposables.add(TokenizationRegistry.register(outerMode, tokenizationSupport));
        const model = disposables.add(instantiateTextModel(instantiationService, 'A model with one line', outerMode));
        model.tokenization.forceTokenization(1);
        assert.strictEqual(model.getLanguageIdAtPosition(1, 1), innerMode);
        disposables.dispose();
    });
});
suite('TextModel.getLineIndentGuide', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertIndentGuides(lines, indentSize) {
        const languageId = 'testLang';
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        const text = lines.map((l) => l[4]).join('\n');
        const model = disposables.add(instantiateTextModel(instantiationService, text, languageId));
        model.updateOptions({ indentSize: indentSize });
        const actualIndents = model.guides.getLinesIndentGuides(1, model.getLineCount());
        const actual = [];
        for (let line = 1; line <= model.getLineCount(); line++) {
            const activeIndentGuide = model.guides.getActiveIndentGuide(line, 1, model.getLineCount());
            actual[line - 1] = [
                actualIndents[line - 1],
                activeIndentGuide.startLineNumber,
                activeIndentGuide.endLineNumber,
                activeIndentGuide.indent,
                model.getLineContent(line),
            ];
        }
        assert.deepStrictEqual(actual, lines);
        disposables.dispose();
    }
    test('getLineIndentGuide one level 2', () => {
        assertIndentGuides([
            [0, 2, 4, 1, 'A'],
            [1, 2, 4, 1, '  A'],
            [1, 2, 4, 1, '  A'],
            [1, 2, 4, 1, '  A'],
        ], 2);
    });
    test('getLineIndentGuide two levels', () => {
        assertIndentGuides([
            [0, 2, 5, 1, 'A'],
            [1, 2, 5, 1, '  A'],
            [1, 4, 5, 2, '  A'],
            [2, 4, 5, 2, '    A'],
            [2, 4, 5, 2, '    A'],
        ], 2);
    });
    test('getLineIndentGuide three levels', () => {
        assertIndentGuides([
            [0, 2, 4, 1, 'A'],
            [1, 3, 4, 2, '  A'],
            [2, 4, 4, 3, '    A'],
            [3, 4, 4, 3, '      A'],
            [0, 5, 5, 0, 'A'],
        ], 2);
    });
    test('getLineIndentGuide decreasing indent', () => {
        assertIndentGuides([
            [2, 1, 1, 2, '    A'],
            [1, 1, 1, 2, '  A'],
            [0, 1, 2, 1, 'A'],
        ], 2);
    });
    test('getLineIndentGuide Java', () => {
        assertIndentGuides([
            /* 1*/ [0, 2, 9, 1, 'class A {'],
            /* 2*/ [1, 3, 4, 2, '  void foo() {'],
            /* 3*/ [2, 3, 4, 2, '    console.log(1);'],
            /* 4*/ [2, 3, 4, 2, '    console.log(2);'],
            /* 5*/ [1, 3, 4, 2, '  }'],
            /* 6*/ [1, 2, 9, 1, ''],
            /* 7*/ [1, 8, 8, 2, '  void bar() {'],
            /* 8*/ [2, 8, 8, 2, '    console.log(3);'],
            /* 9*/ [1, 8, 8, 2, '  }'],
            /*10*/ [0, 2, 9, 1, '}'],
            /*11*/ [0, 12, 12, 1, 'interface B {'],
            /*12*/ [1, 12, 12, 1, '  void bar();'],
            /*13*/ [0, 12, 12, 1, '}'],
        ], 2);
    });
    test('getLineIndentGuide Javadoc', () => {
        assertIndentGuides([
            [0, 2, 3, 1, '/**'],
            [1, 2, 3, 1, ' * Comment'],
            [1, 2, 3, 1, ' */'],
            [0, 5, 6, 1, 'class A {'],
            [1, 5, 6, 1, '  void foo() {'],
            [1, 5, 6, 1, '  }'],
            [0, 5, 6, 1, '}'],
        ], 2);
    });
    test('getLineIndentGuide Whitespace', () => {
        assertIndentGuides([
            [0, 2, 7, 1, 'class A {'],
            [1, 2, 7, 1, ''],
            [1, 4, 5, 2, '  void foo() {'],
            [2, 4, 5, 2, '    '],
            [2, 4, 5, 2, '    return 1;'],
            [1, 4, 5, 2, '  }'],
            [1, 2, 7, 1, '      '],
            [0, 2, 7, 1, '}'],
        ], 2);
    });
    test('getLineIndentGuide Tabs', () => {
        assertIndentGuides([
            [0, 2, 7, 1, 'class A {'],
            [1, 2, 7, 1, '\t\t'],
            [1, 4, 5, 2, '\tvoid foo() {'],
            [2, 4, 5, 2, '\t \t//hello'],
            [2, 4, 5, 2, '\t    return 2;'],
            [1, 4, 5, 2, '  \t}'],
            [1, 2, 7, 1, '      '],
            [0, 2, 7, 1, '}'],
        ], 4);
    });
    test('getLineIndentGuide checker.ts', () => {
        assertIndentGuides([
            /* 1*/ [0, 1, 1, 0, '/// <reference path="binder.ts"/>'],
            /* 2*/ [0, 2, 2, 0, ''],
            /* 3*/ [0, 3, 3, 0, '/* @internal */'],
            /* 4*/ [0, 5, 16, 1, 'namespace ts {'],
            /* 5*/ [1, 5, 16, 1, '    let nextSymbolId = 1;'],
            /* 6*/ [1, 5, 16, 1, '    let nextNodeId = 1;'],
            /* 7*/ [1, 5, 16, 1, '    let nextMergeId = 1;'],
            /* 8*/ [1, 5, 16, 1, '    let nextFlowId = 1;'],
            /* 9*/ [1, 5, 16, 1, ''],
            /*10*/ [1, 11, 15, 2, '    export function getNodeId(node: Node): number {'],
            /*11*/ [2, 12, 13, 3, '        if (!node.id) {'],
            /*12*/ [3, 12, 13, 3, '            node.id = nextNodeId;'],
            /*13*/ [3, 12, 13, 3, '            nextNodeId++;'],
            /*14*/ [2, 12, 13, 3, '        }'],
            /*15*/ [2, 11, 15, 2, '        return node.id;'],
            /*16*/ [1, 11, 15, 2, '    }'],
            /*17*/ [0, 5, 16, 1, '}'],
        ], 4);
    });
    test('issue #8425 - Missing indentation lines for first level indentation', () => {
        assertIndentGuides([
            [1, 2, 3, 2, '\tindent1'],
            [2, 2, 3, 2, '\t\tindent2'],
            [2, 2, 3, 2, '\t\tindent2'],
            [1, 2, 3, 2, '\tindent1'],
        ], 4);
    });
    test('issue #8952 - Indentation guide lines going through text on .yml file', () => {
        assertIndentGuides([
            [0, 2, 5, 1, 'properties:'],
            [1, 3, 5, 2, '    emailAddress:'],
            [2, 3, 5, 2, '        - bla'],
            [2, 5, 5, 3, '        - length:'],
            [3, 5, 5, 3, '            max: 255'],
            [0, 6, 6, 0, 'getters:'],
        ], 4);
    });
    test('issue #11892 - Indent guides look funny', () => {
        assertIndentGuides([
            [0, 2, 7, 1, 'function test(base) {'],
            [1, 3, 6, 2, '\tswitch (base) {'],
            [2, 4, 4, 3, '\t\tcase 1:'],
            [3, 4, 4, 3, '\t\t\treturn 1;'],
            [2, 6, 6, 3, '\t\tcase 2:'],
            [3, 6, 6, 3, '\t\t\treturn 2;'],
            [1, 2, 7, 1, '\t}'],
            [0, 2, 7, 1, '}'],
        ], 4);
    });
    test('issue #12398 - Problem in indent guidelines', () => {
        assertIndentGuides([
            [2, 2, 2, 3, '\t\t.bla'],
            [3, 2, 2, 3, '\t\t\tlabel(for)'],
            [0, 3, 3, 0, 'include script'],
        ], 4);
    });
    test('issue #49173', () => {
        const model = createTextModel([
            'class A {',
            '	public m1(): void {',
            '	}',
            '	public m2(): void {',
            '	}',
            '	public m3(): void {',
            '	}',
            '	public m4(): void {',
            '	}',
            '	public m5(): void {',
            '	}',
            '}',
        ].join('\n'));
        const actual = model.guides.getActiveIndentGuide(2, 4, 9);
        assert.deepStrictEqual(actual, { startLineNumber: 2, endLineNumber: 9, indent: 1 });
        model.dispose();
    });
    test('tweaks - no active', () => {
        assertIndentGuides([
            [0, 1, 1, 0, 'A'],
            [0, 2, 2, 0, 'A'],
        ], 2);
    });
    test('tweaks - inside scope', () => {
        assertIndentGuides([
            [0, 2, 2, 1, 'A'],
            [1, 2, 2, 1, '  A'],
        ], 2);
    });
    test('tweaks - scope start', () => {
        assertIndentGuides([
            [0, 2, 2, 1, 'A'],
            [1, 2, 2, 1, '  A'],
            [0, 2, 2, 1, 'A'],
        ], 2);
    });
    test('tweaks - empty line', () => {
        assertIndentGuides([
            [0, 2, 4, 1, 'A'],
            [1, 2, 4, 1, '  A'],
            [1, 2, 4, 1, ''],
            [1, 2, 4, 1, '  A'],
            [0, 2, 4, 1, 'A'],
        ], 2);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsV2l0aFRva2Vucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvdGV4dE1vZGVsV2l0aFRva2Vucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBRU4sb0JBQW9CLEVBQ3BCLHlCQUF5QixHQUN6QixNQUFNLDhCQUE4QixDQUFBO0FBR3JDLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRWhHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLFNBQVMsMkJBQTJCLENBQ25DLFdBQTRCLEVBQzVCLElBQVksRUFDWixRQUF5QjtJQUV6QixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUE7SUFDakMsTUFBTSxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM3RCxNQUFNLDRCQUE0QixHQUFHLG9CQUFvQixDQUFDLEdB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SyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQixrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9CLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0IsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUYsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQixrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9CLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sSUFBSSxHQUNULGFBQWEsR0FBRyxJQUFJLEdBQUcsUUFBUSxHQUFHLElBQUksR0FBRyxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsTUFBTSxHQUFHLElBQUksR0FBRyxNQUFNLENBQUE7UUFDOUYsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUUzRixNQUFNLFFBQVEsR0FBK0I7WUFDNUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFckUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDckUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFckUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbkUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDcEUsQ0FBQTtRQUVELE1BQU0sVUFBVSxHQUF5RDtZQUN4RSxDQUFDLEVBQUUsRUFBRTtZQUNMLENBQUMsRUFBRSxFQUFFO1lBQ0wsQ0FBQyxFQUFFLEVBQUU7WUFDTCxDQUFDLEVBQUUsRUFBRTtZQUNMLENBQUMsRUFBRSxFQUFFO1NBQ0wsQ0FBQTtRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNyRCxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDckMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUE7UUFDdEQsQ0FBQztRQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzNELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDM0Msa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sSUFBSSxHQUFHO1lBQ1osT0FBTztZQUNQLFVBQVU7WUFDVixpQkFBaUI7WUFDakIsaUJBQWlCO1lBQ2pCLGVBQWU7WUFDZixNQUFNO1lBQ04sRUFBRTtZQUNGLE9BQU87WUFDUCxVQUFVO1lBQ1YsaUJBQWlCO1lBQ2pCLGtCQUFrQjtZQUNsQixlQUFlO1lBQ2YsTUFBTTtTQUNOLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRVosTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLEtBQUssR0FBRywyQkFBMkIsQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQzVELENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQztZQUNoQixDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUM7WUFDcEIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO1NBQ2hCLENBQUMsQ0FBQTtRQUVGLG9DQUFvQztRQUNwQyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRWhDLCtCQUErQjtRQUMvQixlQUFlLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RixlQUFlLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU1RixtQ0FBbUM7UUFDbkMsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0YsZUFBZSxDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFM0YsK0JBQStCO1FBQy9CLGVBQWUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FB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