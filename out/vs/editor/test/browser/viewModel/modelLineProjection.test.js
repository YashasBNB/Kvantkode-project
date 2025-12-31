/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import * as languages from '../../../common/languages.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { ModelLineProjectionData } from '../../../common/modelLineProjectionData.js';
import { createModelLineProjection, } from '../../../common/viewModel/modelLineProjection.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModelLinesFromProjectedModel } from '../../../common/viewModel/viewModelLines.js';
import { TestConfiguration } from '../config/testConfiguration.js';
import { createTextModel } from '../../common/testTextModel.js';
suite('Editor ViewModel - SplitLinesCollection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('SplitLine', () => {
        let model1 = createModel('My First LineMy Second LineAnd another one');
        let line1 = createSplitLine([13, 14, 15], [13, 13 + 14, 13 + 14 + 15], 0);
        assert.strictEqual(line1.getViewLineCount(), 3);
        assert.strictEqual(line1.getViewLineContent(model1, 1, 0), 'My First Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 1), 'My Second Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 2), 'And another one');
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 0), 14);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 1), 15);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 2), 16);
        for (let col = 1; col <= 14; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(0, col), col, 'getInputColumnOfOutputPosition(0, ' + col + ')');
        }
        for (let col = 1; col <= 15; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(1, col), 13 + col, 'getInputColumnOfOutputPosition(1, ' + col + ')');
        }
        for (let col = 1; col <= 16; col++) {
            assert.strictEqual(line1.getModelColumnOfViewPosition(2, col), 13 + 14 + col, 'getInputColumnOfOutputPosition(2, ' + col + ')');
        }
        for (let col = 1; col <= 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(0, col), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13; col <= 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(1, col - 13), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13 + 14; col <= 15 + 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(2, col - 13 - 14), 'getOutputPositionOfInputPosition(' + col + ')');
        }
        model1 = createModel('My First LineMy Second LineAnd another one');
        line1 = createSplitLine([13, 14, 15], [13, 13 + 14, 13 + 14 + 15], 4);
        assert.strictEqual(line1.getViewLineCount(), 3);
        assert.strictEqual(line1.getViewLineContent(model1, 1, 0), 'My First Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 1), '    My Second Line');
        assert.strictEqual(line1.getViewLineContent(model1, 1, 2), '    And another one');
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 0), 14);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 1), 19);
        assert.strictEqual(line1.getViewLineMaxColumn(model1, 1, 2), 20);
        const actualViewColumnMapping = [];
        for (let lineIndex = 0; lineIndex < line1.getViewLineCount(); lineIndex++) {
            const actualLineViewColumnMapping = [];
            for (let col = 1; col <= line1.getViewLineMaxColumn(model1, 1, lineIndex); col++) {
                actualLineViewColumnMapping.push(line1.getModelColumnOfViewPosition(lineIndex, col));
            }
            actualViewColumnMapping.push(actualLineViewColumnMapping);
        }
        assert.deepStrictEqual(actualViewColumnMapping, [
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            [14, 14, 14, 14, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
            [28, 28, 28, 28, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43],
        ]);
        for (let col = 1; col <= 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(0, col), '6.getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13; col <= 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(1, 4 + col - 13), '7.getOutputPositionOfInputPosition(' + col + ')');
        }
        for (let col = 1 + 13 + 14; col <= 15 + 14 + 13; col++) {
            assert.deepStrictEqual(line1.getViewPositionOfModelPosition(0, col), pos(2, 4 + col - 13 - 14), '8.getOutputPositionOfInputPosition(' + col + ')');
        }
    });
    function withSplitLinesCollection(text, callback) {
        const config = new TestConfiguration({});
        const wrappingInfo = config.options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = config.options.get(52 /* EditorOption.fontInfo */);
        const wordWrapBreakAfterCharacters = config.options.get(138 /* EditorOption.wordWrapBreakAfterCharacters */);
        const wordWrapBreakBeforeCharacters = config.options.get(139 /* EditorOption.wordWrapBreakBeforeCharacters */);
        const wrappingIndent = config.options.get(143 /* EditorOption.wrappingIndent */);
        const wordBreak = config.options.get(134 /* EditorOption.wordBreak */);
        const lineBreaksComputerFactory = new MonospaceLineBreaksComputerFactory(wordWrapBreakBeforeCharacters, wordWrapBreakAfterCharacters);
        const model = createTextModel([
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n'));
        const linesCollection = new ViewModelLinesFromProjectedModel(1, model, lineBreaksComputerFactory, lineBreaksComputerFactory, fontInfo, model.getOptions().tabSize, 'simple', wrappingInfo.wrappingColumn, wrappingIndent, wordBreak);
        callback(model, linesCollection);
        linesCollection.dispose();
        model.dispose();
        config.dispose();
    }
    test('Invalid line numbers', () => {
        const text = [
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n');
        withSplitLinesCollection(text, (model, linesCollection) => {
            assert.strictEqual(linesCollection.getViewLineCount(), 6);
            // getOutputIndentGuide
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(-1, -1), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(0, 0), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(1, 1), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(2, 2), [1]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(3, 3), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(4, 4), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(5, 5), [1]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(6, 6), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(7, 7), [0]);
            assert.deepStrictEqual(linesCollection.getViewLinesIndentGuides(0, 7), [0, 1, 0, 0, 1, 0]);
            // getOutputLineContent
            assert.strictEqual(linesCollection.getViewLineContent(-1), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(0), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(1), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(2), '\tprintf("Hello world!");');
            assert.strictEqual(linesCollection.getViewLineContent(3), '}');
            assert.strictEqual(linesCollection.getViewLineContent(4), 'int main() {');
            assert.strictEqual(linesCollection.getViewLineContent(5), '\tprintf("Hello world!");');
            assert.strictEqual(linesCollection.getViewLineContent(6), '}');
            assert.strictEqual(linesCollection.getViewLineContent(7), '}');
            // getOutputLineMinColumn
            assert.strictEqual(linesCollection.getViewLineMinColumn(-1), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(0), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(1), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(2), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(3), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(4), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(5), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(6), 1);
            assert.strictEqual(linesCollection.getViewLineMinColumn(7), 1);
            // getOutputLineMaxColumn
            assert.strictEqual(linesCollection.getViewLineMaxColumn(-1), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(0), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(1), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(2), 25);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(3), 2);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(4), 13);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(5), 25);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(6), 2);
            assert.strictEqual(linesCollection.getViewLineMaxColumn(7), 2);
            // convertOutputPositionToInputPosition
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(-1, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(0, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(1, 1), new Position(1, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(2, 1), new Position(2, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(3, 1), new Position(3, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(4, 1), new Position(4, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(5, 1), new Position(5, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(6, 1), new Position(6, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(7, 1), new Position(6, 1));
            assert.deepStrictEqual(linesCollection.convertViewPositionToModelPosition(8, 1), new Position(6, 1));
        });
    });
    test('issue #3662', () => {
        const text = [
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
            'int main() {',
            '\tprintf("Hello world!");',
            '}',
        ].join('\n');
        withSplitLinesCollection(text, (model, linesCollection) => {
            linesCollection.setHiddenAreas([new Range(1, 1, 3, 1), new Range(5, 1, 6, 1)]);
            const viewLineCount = linesCollection.getViewLineCount();
            assert.strictEqual(viewLineCount, 1, 'getOutputLineCount()');
            const modelLineCount = model.getLineCount();
            for (let lineNumber = 0; lineNumber <= modelLineCount + 1; lineNumber++) {
                const lineMinColumn = lineNumber >= 1 && lineNumber <= modelLineCount ? model.getLineMinColumn(lineNumber) : 1;
                const lineMaxColumn = lineNumber >= 1 && lineNumber <= modelLineCount ? model.getLineMaxColumn(lineNumber) : 1;
                for (let column = lineMinColumn - 1; column <= lineMaxColumn + 1; column++) {
                    const viewPosition = linesCollection.convertModelPositionToViewPosition(lineNumber, column);
                    // validate view position
                    let viewLineNumber = viewPosition.lineNumber;
                    let viewColumn = viewPosition.column;
                    if (viewLineNumber < 1) {
                        viewLineNumber = 1;
                    }
                    const lineCount = linesCollection.getViewLineCount();
                    if (viewLineNumber > lineCount) {
                        viewLineNumber = lineCount;
                    }
                    const viewMinColumn = linesCollection.getViewLineMinColumn(viewLineNumber);
                    const viewMaxColumn = linesCollection.getViewLineMaxColumn(viewLineNumber);
                    if (viewColumn < viewMinColumn) {
                        viewColumn = viewMinColumn;
                    }
                    if (viewColumn > viewMaxColumn) {
                        viewColumn = viewMaxColumn;
                    }
                    const validViewPosition = new Position(viewLineNumber, viewColumn);
                    assert.strictEqual(viewPosition.toString(), validViewPosition.toString(), 'model->view for ' + lineNumber + ', ' + column);
                }
            }
            for (let lineNumber = 0; lineNumber <= viewLineCount + 1; lineNumber++) {
                const lineMinColumn = linesCollection.getViewLineMinColumn(lineNumber);
                const lineMaxColumn = linesCollection.getViewLineMaxColumn(lineNumber);
                for (let column = lineMinColumn - 1; column <= lineMaxColumn + 1; column++) {
                    const modelPosition = linesCollection.convertViewPositionToModelPosition(lineNumber, column);
                    const validModelPosition = model.validatePosition(modelPosition);
                    assert.strictEqual(modelPosition.toString(), validModelPosition.toString(), 'view->model for ' + lineNumber + ', ' + column);
                }
            }
        });
    });
});
suite('SplitLinesCollection', () => {
    const _text = [
        'class Nice {',
        '	function hi() {',
        '		console.log("Hello world");',
        '	}',
        '	function hello() {',
        '		console.log("Hello world, this is a somewhat longer line");',
        '	}',
        '}',
    ];
    const _tokens = [
        [
            { startIndex: 0, value: 1 },
            { startIndex: 5, value: 2 },
            { startIndex: 6, value: 3 },
            { startIndex: 10, value: 4 },
        ],
        [
            { startIndex: 0, value: 5 },
            { startIndex: 1, value: 6 },
            { startIndex: 9, value: 7 },
            { startIndex: 10, value: 8 },
            { startIndex: 12, value: 9 },
        ],
        [
            { startIndex: 0, value: 10 },
            { startIndex: 2, value: 11 },
            { startIndex: 9, value: 12 },
            { startIndex: 10, value: 13 },
            { startIndex: 13, value: 14 },
            { startIndex: 14, value: 15 },
            { startIndex: 27, value: 16 },
        ],
        [{ startIndex: 0, value: 17 }],
        [
            { startIndex: 0, value: 18 },
            { startIndex: 1, value: 19 },
            { startIndex: 9, value: 20 },
            { startIndex: 10, value: 21 },
            { startIndex: 15, value: 22 },
        ],
        [
            { startIndex: 0, value: 23 },
            { startIndex: 2, value: 24 },
            { startIndex: 9, value: 25 },
            { startIndex: 10, value: 26 },
            { startIndex: 13, value: 27 },
            { startIndex: 14, value: 28 },
            { startIndex: 59, value: 29 },
        ],
        [{ startIndex: 0, value: 30 }],
        [{ startIndex: 0, value: 31 }],
    ];
    let model;
    let languageRegistration;
    setup(() => {
        let _lineIndex = 0;
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokens = _tokens[_lineIndex++];
                const result = new Uint32Array(2 * tokens.length);
                for (let i = 0; i < tokens.length; i++) {
                    result[2 * i] = tokens[i].startIndex;
                    result[2 * i + 1] = tokens[i].value << 15 /* MetadataConsts.FOREGROUND_OFFSET */;
                }
                return new languages.EncodedTokenizationResult(result, state);
            },
        };
        const LANGUAGE_ID = 'modelModeTest1';
        languageRegistration = languages.TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        model = createTextModel(_text.join('\n'), LANGUAGE_ID);
        // force tokenization
        model.tokenization.forceTokenization(model.getLineCount());
    });
    teardown(() => {
        model.dispose();
        languageRegistration.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertViewLineTokens(_actual, expected) {
        const actual = [];
        for (let i = 0, len = _actual.getCount(); i < len; i++) {
            actual[i] = {
                endIndex: _actual.getEndOffset(i),
                value: _actual.getForeground(i),
            };
        }
        assert.deepStrictEqual(actual, expected);
    }
    function assertMinimapLineRenderingData(actual, expected) {
        if (actual === null && expected === null) {
            assert.ok(true);
            return;
        }
        if (expected === null) {
            assert.ok(false);
        }
        assert.strictEqual(actual.content, expected.content);
        assert.strictEqual(actual.minColumn, expected.minColumn);
        assert.strictEqual(actual.maxColumn, expected.maxColumn);
        assertViewLineTokens(actual.tokens, expected.tokens);
    }
    function assertMinimapLinesRenderingData(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        for (let i = 0; i < expected.length; i++) {
            assertMinimapLineRenderingData(actual[i], expected[i]);
        }
    }
    function assertAllMinimapLinesRenderingData(splitLinesCollection, all) {
        const lineCount = all.length;
        for (let line = 1; line <= lineCount; line++) {
            assert.strictEqual(splitLinesCollection.getViewLineData(line).content, splitLinesCollection.getViewLineContent(line));
        }
        for (let start = 1; start <= lineCount; start++) {
            for (let end = start; end <= lineCount; end++) {
                const count = end - start + 1;
                for (let desired = Math.pow(2, count) - 1; desired >= 0; desired--) {
                    const needed = [];
                    const expected = [];
                    for (let i = 0; i < count; i++) {
                        needed[i] = desired & (1 << i) ? true : false;
                        expected[i] = needed[i] ? all[start - 1 + i] : null;
                    }
                    const actual = splitLinesCollection.getViewLinesData(start, end, needed);
                    assertMinimapLinesRenderingData(actual, expected);
                    // Comment out next line to test all possible combinations
                    break;
                }
            }
        }
    }
    test('getViewLinesData - no wrapping', () => {
        withSplitLinesCollection(model, 'off', 0, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 8);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            const _expected = [
                {
                    content: 'class Nice {',
                    minColumn: 1,
                    maxColumn: 13,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 10, value: 3 },
                        { endIndex: 12, value: 4 },
                    ],
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ],
                },
                {
                    content: '		console.log("Hello world");',
                    minColumn: 1,
                    maxColumn: 30,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 27, value: 15 },
                        { endIndex: 29, value: 16 },
                    ],
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [{ endIndex: 2, value: 17 }],
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ],
                },
                {
                    content: '		console.log("Hello world, this is a somewhat longer line");',
                    minColumn: 1,
                    maxColumn: 62,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 59, value: 28 },
                        { endIndex: 61, value: 29 },
                    ],
                },
                {
                    minColumn: 1,
                    maxColumn: 3,
                    content: '	}',
                    tokens: [{ endIndex: 2, value: 30 }],
                },
                {
                    minColumn: 1,
                    maxColumn: 2,
                    content: '}',
                    tokens: [{ endIndex: 1, value: 31 }],
                },
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
            ]);
            splitLinesCollection.setHiddenAreas([new Range(2, 1, 4, 1)]);
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 5);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
            ]);
        });
    });
    test('getViewLinesData - with wrapping', () => {
        withSplitLinesCollection(model, 'wordWrapColumn', 30, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 12);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            const _expected = [
                {
                    content: 'class Nice {',
                    minColumn: 1,
                    maxColumn: 13,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 10, value: 3 },
                        { endIndex: 12, value: 4 },
                    ],
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ],
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 21, value: 15 },
                    ],
                },
                {
                    content: '            world");',
                    minColumn: 13,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 18, value: 15 },
                        { endIndex: 20, value: 16 },
                    ],
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [{ endIndex: 2, value: 17 }],
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ],
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 21, value: 28 },
                    ],
                },
                {
                    content: '            world, this is a ',
                    minColumn: 13,
                    maxColumn: 30,
                    tokens: [{ endIndex: 29, value: 28 }],
                },
                {
                    content: '            somewhat longer ',
                    minColumn: 13,
                    maxColumn: 29,
                    tokens: [{ endIndex: 28, value: 28 }],
                },
                {
                    content: '            line");',
                    minColumn: 13,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 17, value: 28 },
                        { endIndex: 19, value: 29 },
                    ],
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [{ endIndex: 2, value: 30 }],
                },
                {
                    content: '}',
                    minColumn: 1,
                    maxColumn: 2,
                    tokens: [{ endIndex: 1, value: 31 }],
                },
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
            splitLinesCollection.setHiddenAreas([new Range(2, 1, 4, 1)]);
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 8);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(1, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(2, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(3, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(4, 1), false);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(5, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(6, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(7, 1), true);
            assert.strictEqual(splitLinesCollection.modelPositionIsVisible(8, 1), true);
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
        });
    });
    test('getViewLinesData - with wrapping and injected text', () => {
        model.deltaDecorations([], [
            {
                range: new Range(1, 9, 1, 9),
                options: {
                    description: 'example',
                    after: {
                        content: 'very very long injected text that causes a line break',
                        inlineClassName: 'myClassName',
                    },
                    showIfCollapsed: true,
                },
            },
        ]);
        withSplitLinesCollection(model, 'wordWrapColumn', 30, (splitLinesCollection) => {
            assert.strictEqual(splitLinesCollection.getViewLineCount(), 14);
            assert.strictEqual(splitLinesCollection.getViewLineMaxColumn(1), 24);
            const _expected = [
                {
                    content: 'class Nivery very long ',
                    minColumn: 1,
                    maxColumn: 24,
                    tokens: [
                        { endIndex: 5, value: 1 },
                        { endIndex: 6, value: 2 },
                        { endIndex: 8, value: 3 },
                        { endIndex: 23, value: 1 },
                    ],
                },
                {
                    content: '    injected text that causes ',
                    minColumn: 5,
                    maxColumn: 31,
                    tokens: [{ endIndex: 30, value: 1 }],
                },
                {
                    content: '    a line breakce {',
                    minColumn: 5,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 16, value: 1 },
                        { endIndex: 18, value: 3 },
                        { endIndex: 20, value: 4 },
                    ],
                },
                {
                    content: '	function hi() {',
                    minColumn: 1,
                    maxColumn: 17,
                    tokens: [
                        { endIndex: 1, value: 5 },
                        { endIndex: 9, value: 6 },
                        { endIndex: 10, value: 7 },
                        { endIndex: 12, value: 8 },
                        { endIndex: 16, value: 9 },
                    ],
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 10 },
                        { endIndex: 9, value: 11 },
                        { endIndex: 10, value: 12 },
                        { endIndex: 13, value: 13 },
                        { endIndex: 14, value: 14 },
                        { endIndex: 21, value: 15 },
                    ],
                },
                {
                    content: '            world");',
                    minColumn: 13,
                    maxColumn: 21,
                    tokens: [
                        { endIndex: 18, value: 15 },
                        { endIndex: 20, value: 16 },
                    ],
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [{ endIndex: 2, value: 17 }],
                },
                {
                    content: '	function hello() {',
                    minColumn: 1,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 1, value: 18 },
                        { endIndex: 9, value: 19 },
                        { endIndex: 10, value: 20 },
                        { endIndex: 15, value: 21 },
                        { endIndex: 19, value: 22 },
                    ],
                },
                {
                    content: '		console.log("Hello ',
                    minColumn: 1,
                    maxColumn: 22,
                    tokens: [
                        { endIndex: 2, value: 23 },
                        { endIndex: 9, value: 24 },
                        { endIndex: 10, value: 25 },
                        { endIndex: 13, value: 26 },
                        { endIndex: 14, value: 27 },
                        { endIndex: 21, value: 28 },
                    ],
                },
                {
                    content: '            world, this is a ',
                    minColumn: 13,
                    maxColumn: 30,
                    tokens: [{ endIndex: 29, value: 28 }],
                },
                {
                    content: '            somewhat longer ',
                    minColumn: 13,
                    maxColumn: 29,
                    tokens: [{ endIndex: 28, value: 28 }],
                },
                {
                    content: '            line");',
                    minColumn: 13,
                    maxColumn: 20,
                    tokens: [
                        { endIndex: 17, value: 28 },
                        { endIndex: 19, value: 29 },
                    ],
                },
                {
                    content: '	}',
                    minColumn: 1,
                    maxColumn: 3,
                    tokens: [{ endIndex: 2, value: 30 }],
                },
                {
                    content: '}',
                    minColumn: 1,
                    maxColumn: 2,
                    tokens: [{ endIndex: 1, value: 31 }],
                },
            ];
            assertAllMinimapLinesRenderingData(splitLinesCollection, [
                _expected[0],
                _expected[1],
                _expected[2],
                _expected[3],
                _expected[4],
                _expected[5],
                _expected[6],
                _expected[7],
                _expected[8],
                _expected[9],
                _expected[10],
                _expected[11],
            ]);
            const data = splitLinesCollection.getViewLinesData(1, 14, new Array(14).fill(true));
            assert.deepStrictEqual(data.map((d) => ({
                inlineDecorations: d.inlineDecorations?.map((d) => ({
                    startOffset: d.startOffset,
                    endOffset: d.endOffset,
                })),
            })), [
                { inlineDecorations: [{ startOffset: 8, endOffset: 23 }] },
                { inlineDecorations: [{ startOffset: 4, endOffset: 30 }] },
                { inlineDecorations: [{ startOffset: 4, endOffset: 16 }] },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
                { inlineDecorations: undefined },
            ]);
        });
    });
    function withSplitLinesCollection(model, wordWrap, wordWrapColumn, callback) {
        const configuration = new TestConfiguration({
            wordWrap: wordWrap,
            wordWrapColumn: wordWrapColumn,
            wrappingIndent: 'indent',
        });
        const wrappingInfo = configuration.options.get(152 /* EditorOption.wrappingInfo */);
        const fontInfo = configuration.options.get(52 /* EditorOption.fontInfo */);
        const wordWrapBreakAfterCharacters = configuration.options.get(138 /* EditorOption.wordWrapBreakAfterCharacters */);
        const wordWrapBreakBeforeCharacters = configuration.options.get(139 /* EditorOption.wordWrapBreakBeforeCharacters */);
        const wrappingIndent = configuration.options.get(143 /* EditorOption.wrappingIndent */);
        const wordBreak = configuration.options.get(134 /* EditorOption.wordBreak */);
        const lineBreaksComputerFactory = new MonospaceLineBreaksComputerFactory(wordWrapBreakBeforeCharacters, wordWrapBreakAfterCharacters);
        const linesCollection = new ViewModelLinesFromProjectedModel(1, model, lineBreaksComputerFactory, lineBreaksComputerFactory, fontInfo, model.getOptions().tabSize, 'simple', wrappingInfo.wrappingColumn, wrappingIndent, wordBreak);
        callback(linesCollection);
        configuration.dispose();
    }
});
function pos(lineNumber, column) {
    return new Position(lineNumber, column);
}
function createSplitLine(splitLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth, isVisible = true) {
    return createModelLineProjection(createLineBreakData(splitLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth), isVisible);
}
function createLineBreakData(breakingLengths, breakingOffsetsVisibleColumn, wrappedTextIndentWidth) {
    const sums = [];
    for (let i = 0; i < breakingLengths.length; i++) {
        sums[i] = (i > 0 ? sums[i - 1] : 0) + breakingLengths[i];
    }
    return new ModelLineProjectionData(null, null, sums, breakingOffsetsVisibleColumn, wrappedTextIndentWidth);
}
function createModel(text) {
    return {
        tokenization: {
            getLineTokens: (lineNumber) => {
                return null;
            },
        },
        getLineContent: (lineNumber) => {
            return text;
        },
        getLineLength: (lineNumber) => {
            return text.length;
        },
        getLineMinColumn: (lineNumber) => {
            return 1;
        },
        getLineMaxColumn: (lineNumber) => {
            return text.length + 1;
        },
        getValueInRange: (range, eol) => {
            return text.substring(range.startColumn - 1, range.endColumn - 1);
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci92aWV3TW9kZWwvbW9kZWxMaW5lUHJvamVjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTdELE9BQU8sS0FBSyxTQUFTLE1BQU0sOEJBQThCLENBQUE7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBR3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR3BGLE9BQU8sRUFHTix5QkFBeUIsR0FDekIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFL0QsS0FBSyxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtJQUNyRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO1FBQ3RCLElBQUksTUFBTSxHQUFHLFdBQVcsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFBO1FBQ3RFLElBQUksS0FBSyxHQUFH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LENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNFLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFM0UsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTFGLHVCQUF1QjtZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQ3pFLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLDJCQUEyQixDQUFDLENBQUE7WUFDdEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDOUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDekUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQTtZQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUU5RCx5QkFBeUI7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU5RCx5QkFBeUI7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNoRSxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU5RCx1Q0FBdUM7WUFDdkMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZUFBZSxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xCLENBQUE7WUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xCLENBQUE7WUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN4RCxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xCLENBQUE7WUFDRCxNQUFNLENBQUMsZUFBZSxDQUNyQixlQUFlLENBQUMsa0NBQWtDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxF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QUUsQ0FBQyxFQUFFO1lBQzNCLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFO1NBQzVCO1FBQ0Q7WUFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUMzQixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUMzQixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUMzQixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUM1QixFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtTQUM1QjtRQUNEO1lBQ0MsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDNUIsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDNUIsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDNUIsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDN0IsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDN0IsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDN0IsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUU7U0FDN0I7UUFDRCxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDOUI7WUFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtZQUM1QixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUs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QW9CLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUUzRSxNQUFNLFNBQVMsR0FBb0M7Z0JBQ2xEO29CQUNDLE9BQU8sRUFBRSxjQUFjO29CQUN2QixTQUFTLEVBQUUsQ0FBQztvQkFDWixTQUFTLEVBQUUsRUFBRTtvQkFDYixNQUFNLEVBQUU7d0JBQ1AsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFF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