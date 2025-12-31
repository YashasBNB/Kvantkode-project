/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { UTF8_BOM_CHARACTER } from '../../../../base/common/strings.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../common/languages/modesRegistry.js';
import { TextModel, createTextBuffer } from '../../../common/model/textModel.js';
import { createModelServices, createTextModel } from '../testTextModel.js';
function testGuessIndentation(defaultInsertSpaces, defaultTabSize, expectedInsertSpaces, expectedTabSize, text, msg) {
    const m = createTextModel(text.join('\n'), undefined, {
        tabSize: defaultTabSize,
        insertSpaces: defaultInsertSpaces,
        detectIndentation: true,
    });
    const r = m.getOptions();
    m.dispose();
    assert.strictEqual(r.insertSpaces, expectedInsertSpaces, msg);
    assert.strictEqual(r.tabSize, expectedTabSize, msg);
}
function assertGuess(expectedInsertSpaces, expectedTabSize, text, msg) {
    if (typeof expectedInsertSpaces === 'undefined') {
        // cannot guess insertSpaces
        if (typeof expectedTabSize === 'undefined') {
            // cannot guess tabSize
            testGuessIndentation(true, 13370, true, 13370, text, msg);
            testGuessIndentation(false, 13371, false, 13371, text, msg);
        }
        else if (typeof expectedTabSize === 'number') {
            // can guess tabSize
            testGuessIndentation(true, 13370, true, expectedTabSize, text, msg);
            testGuessIndentation(false, 13371, false, expectedTabSize, text, msg);
        }
        else {
            // can only guess tabSize when insertSpaces is true
            testGuessIndentation(true, 13370, true, expectedTabSize[0], text, msg);
            testGuessIndentation(false, 13371, false, 13371, text, msg);
        }
    }
    else {
        // can guess insertSpaces
        if (typeof expectedTabSize === 'undefined') {
            // cannot guess tabSize
            testGuessIndentation(true, 13370, expectedInsertSpaces, 13370, text, msg);
            testGuessIndentation(false, 13371, expectedInsertSpaces, 13371, text, msg);
        }
        else if (typeof expectedTabSize === 'number') {
            // can guess tabSize
            testGuessIndentation(true, 13370, expectedInsertSpaces, expectedTabSize, text, msg);
            testGuessIndentation(false, 13371, expectedInsertSpaces, expectedTabSize, text, msg);
        }
        else {
            // can only guess tabSize when insertSpaces is true
            if (expectedInsertSpaces === true) {
                testGuessIndentation(true, 13370, expectedInsertSpaces, expectedTabSize[0], text, msg);
                testGuessIndentation(false, 13371, expectedInsertSpaces, expectedTabSize[0], text, msg);
            }
            else {
                testGuessIndentation(true, 13370, expectedInsertSpaces, 13370, text, msg);
                testGuessIndentation(false, 13371, expectedInsertSpaces, 13371, text, msg);
            }
        }
    }
}
suite('TextModelData.fromString', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function testTextModelDataFromString(text, expected) {
        const { textBuffer, disposable } = createTextBuffer(text, TextModel.DEFAULT_CREATION_OPTIONS.defaultEOL);
        const actual = {
            EOL: textBuffer.getEOL(),
            lines: textBuffer.getLinesContent(),
            containsRTL: textBuffer.mightContainRTL(),
            isBasicASCII: !textBuffer.mightContainNonBasicASCII(),
        };
        assert.deepStrictEqual(actual, expected);
        disposable.dispose();
    }
    test('one line text', () => {
        testTextModelDataFromString('Hello world!', {
            EOL: '\n',
            lines: ['Hello world!'],
            containsRTL: false,
            isBasicASCII: true,
        });
    });
    test('multiline text', () => {
        testTextModelDataFromString('Hello,\r\ndear friend\nHow\rare\r\nyou?', {
            EOL: '\r\n',
            lines: ['Hello,', 'dear friend', 'How', 'are', 'you?'],
            containsRTL: false,
            isBasicASCII: true,
        });
    });
    test('Non Basic ASCII 1', () => {
        testTextModelDataFromString('Hello,\nZürich', {
            EOL: '\n',
            lines: ['Hello,', 'Zürich'],
            containsRTL: false,
            isBasicASCII: false,
        });
    });
    test('containsRTL 1', () => {
        testTextModelDataFromString('Hello,\nזוהי עובדה מבוססת שדעתו', {
            EOL: '\n',
            lines: ['Hello,', 'זוהי עובדה מבוססת שדעתו'],
            containsRTL: true,
            isBasicASCII: false,
        });
    });
    test('containsRTL 2', () => {
        testTextModelDataFromString('Hello,\nهناك حقيقة مثبتة منذ زمن طويل', {
            EOL: '\n',
            lines: ['Hello,', 'هناك حقيقة مثبتة منذ زمن طويل'],
            containsRTL: true,
            isBasicASCII: false,
        });
    });
});
suite('Editor Model - TextModel', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('TextModel does not use events internally', () => {
        // Make sure that all model parts receive text model events explicitly
        // to avoid that by any chance an outside listener receives events before
        // the parts and thus are able to access the text model in an inconsistent state.
        //
        // We simply check that there are no listeners attached to text model
        // after instantiation
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const textModel = disposables.add(instantiationService.createInstance(TextModel, '', PLAINTEXT_LANGUAGE_ID, TextModel.DEFAULT_CREATION_OPTIONS, null));
        assert.strictEqual(textModel._hasListeners(), false);
        disposables.dispose();
    });
    test('getValueLengthInRange', () => {
        let m = createTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 1)), ''.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 2)), 'M'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 1, 3)), 'y'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 14)), 'My First Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1)), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1)), 'y First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 2)), 'y First Line\r\nM'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1000)), 'y First Line\r\nMy Second Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1)), 'y First Line\r\nMy Second Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1000)), 'y First Line\r\nMy Second Line\r\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000)), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        m.dispose();
        m = createTextModel('My First Line\nMy Second Line\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 1)), ''.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 2)), 'M'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 1, 3)), 'y'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1, 14)), 'My First Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1)), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1)), 'y First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 2)), 'y First Line\nM'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 2, 1000)), 'y First Line\nMy Second Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1)), 'y First Line\nMy Second Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 2, 3, 1000)), 'y First Line\nMy Second Line\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000)), 'My First Line\nMy Second Line\nMy Third Line'.length);
        m.dispose();
    });
    test('getValueLengthInRange different EOL', () => {
        let m = createTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 1 /* EndOfLinePreference.LF */), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 1 /* EndOfLinePreference.LF */), 'My First Line\nMy Second Line\nMy Third Line'.length);
        m.dispose();
        m = createTextModel('My First Line\nMy Second Line\nMy Third Line');
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 1 /* EndOfLinePreference.LF */), 'My First Line\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 2, 1), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\n'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 0 /* EndOfLinePreference.TextDefined */), 'My First Line\nMy Second Line\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 1 /* EndOfLinePreference.LF */), 'My First Line\nMy Second Line\nMy Third Line'.length);
        assert.strictEqual(m.getValueLengthInRange(new Range(1, 1, 1000, 1000), 2 /* EndOfLinePreference.CRLF */), 'My First Line\r\nMy Second Line\r\nMy Third Line'.length);
        m.dispose();
    });
    test('guess indentation 1', () => {
        assertGuess(undefined, undefined, ['x', 'x', 'x', 'x', 'x', 'x', 'x'], 'no clues');
        assertGuess(false, undefined, ['\tx', 'x', 'x', 'x', 'x', 'x', 'x'], 'no spaces, 1xTAB');
        assertGuess(true, 2, ['  x', 'x', 'x', 'x', 'x', 'x', 'x'], '1x2');
        assertGuess(false, undefined, ['\tx', '\tx', '\tx', '\tx', '\tx', '\tx', '\tx'], '7xTAB');
        assertGuess(undefined, [2], ['\tx', '  x', '\tx', '  x', '\tx', '  x', '\tx', '  x'], '4x2, 4xTAB');
        assertGuess(false, undefined, ['\tx', ' x', '\tx', ' x', '\tx', ' x', '\tx', ' x'], '4x1, 4xTAB');
        assertGuess(false, undefined, ['\tx', '\tx', '  x', '\tx', '  x', '\tx', '  x', '\tx', '  x'], '4x2, 5xTAB');
        assertGuess(false, undefined, ['\tx', '\tx', 'x', '\tx', 'x', '\tx', 'x', '\tx', '  x'], '1x2, 5xTAB');
        assertGuess(false, undefined, ['\tx', '\tx', 'x', '\tx', 'x', '\tx', 'x', '\tx', '    x'], '1x4, 5xTAB');
        assertGuess(false, undefined, ['\tx', '\tx', 'x', '\tx', 'x', '\tx', '  x', '\tx', '    x'], '1x2, 1x4, 5xTAB');
        assertGuess(undefined, undefined, ['x', ' x', ' x', ' x', ' x', ' x', ' x', ' x'], '7x1 - 1 space is never guessed as an indentation');
        assertGuess(true, undefined, ['x', '          x', ' x', ' x', ' x', ' x', ' x', ' x'], '1x10, 6x1');
        assertGuess(undefined, undefined, ['', '  ', '    ', '      ', '        ', '          ', '            ', '              '], "whitespace lines don't count");
        assertGuess(true, 3, ['x', '   x', '   x', '    x', 'x', '   x', '   x', '    x', 'x', '   x', '   x', '    x'], '6x3, 3x4');
        assertGuess(true, 5, [
            'x',
            '     x',
            '     x',
            '    x',
            'x',
            '     x',
            '     x',
            '    x',
            'x',
            '     x',
            '     x',
            '    x',
        ], '6x5, 3x4');
        assertGuess(true, 7, [
            'x',
            '       x',
            '       x',
            '     x',
            'x',
            '       x',
            '       x',
            '    x',
            'x',
            '       x',
            '       x',
            '    x',
        ], '6x7, 1x5, 2x4');
        assertGuess(true, 2, ['x', '  x', '  x', '  x', '  x', 'x', '  x', '  x', '  x', '  x'], '8x2');
        assertGuess(true, 2, ['x', '  x', '  x', 'x', '  x', '  x', 'x', '  x', '  x', 'x', '  x', '  x'], '8x2');
        assertGuess(true, 2, ['x', '  x', '    x', 'x', '  x', '    x', 'x', '  x', '    x', 'x', '  x', '    x'], '4x2, 4x4');
        assertGuess(true, 2, ['x', '  x', '  x', '    x', 'x', '  x', '  x', '    x', 'x', '  x', '  x', '    x'], '6x2, 3x4');
        assertGuess(true, 2, ['x', '  x', '  x', '    x', '    x', 'x', '  x', '  x', '    x', '    x'], '4x2, 4x4');
        assertGuess(true, 2, ['x', '  x', '    x', '    x', 'x', '  x', '    x', '    x'], '2x2, 4x4');
        assertGuess(true, 4, ['x', '    x', '    x', 'x', '    x', '    x', 'x', '    x', '    x', 'x', '    x', '    x'], '8x4');
        assertGuess(true, 2, ['x', '  x', '    x', '    x', '      x', 'x', '  x', '    x', '    x', '      x'], '2x2, 4x4, 2x6');
        assertGuess(true, 2, ['x', '  x', '    x', '    x', '      x', '      x', '        x'], '1x2, 2x4, 2x6, 1x8');
        assertGuess(true, 4, [
            'x',
            '    x',
            '    x',
            '    x',
            '     x',
            '        x',
            'x',
            '    x',
            '    x',
            '    x',
            '     x',
            '        x',
        ], '6x4, 2x5, 2x8');
        assertGuess(true, 4, ['x', '    x', '    x', '    x', '     x', '        x', '        x'], '3x4, 1x5, 2x8');
        assertGuess(true, 4, [
            'x',
            'x',
            '    x',
            '    x',
            '     x',
            '        x',
            '        x',
            'x',
            'x',
            '    x',
            '    x',
            '     x',
            '        x',
            '        x',
        ], '6x4, 2x5, 4x8');
        assertGuess(true, 3, ['x', ' x', ' x', ' x', ' x', ' x', 'x', '   x', '    x', '    x'], '5x1, 2x0, 1x3, 2x4');
        assertGuess(false, undefined, ['\t x', ' \t x', '\tx'], 'mixed whitespace 1');
        assertGuess(false, undefined, ['\tx', '\t    x'], 'mixed whitespace 2');
    });
    test('issue #44991: Wrong indentation size auto-detection', () => {
        assertGuess(true, 4, [
            'a = 10             # 0 space indent',
            'b = 5              # 0 space indent',
            'if a > 10:         # 0 space indent',
            '    a += 1         # 4 space indent      delta 4 spaces',
            '    if b > 5:      # 4 space indent',
            '        b += 1     # 8 space indent      delta 4 spaces',
            '        b += 1     # 8 space indent',
            '        b += 1     # 8 space indent',
            '# comment line 1   # 0 space indent      delta 8 spaces',
            '# comment line 2   # 0 space indent',
            '# comment line 3   # 0 space indent',
            '        b += 1     # 8 space indent      delta 8 spaces',
            '        b += 1     # 8 space indent',
            '        b += 1     # 8 space indent',
        ]);
    });
    test('issue #55818: Broken indentation detection', () => {
        assertGuess(true, 2, [
            '',
            '/* REQUIRE */',
            '',
            "const foo = require ( 'foo' ),",
            "      bar = require ( 'bar' );",
            '',
            '/* MY FN */',
            '',
            'function myFn () {',
            '',
            '  const asd = 1,',
            '        dsa = 2;',
            '',
            '  return bar ( foo ( asd ) );',
            '',
            '}',
            '',
            '/* EXPORT */',
            '',
            'module.exports = myFn;',
            '',
        ]);
    });
    test('issue #70832: Broken indentation detection', () => {
        assertGuess(false, undefined, [
            'x',
            'x',
            'x',
            'x',
            '	x',
            '		x',
            '    x',
            '		x',
            '	x',
            '		x',
            '	x',
            '	x',
            '	x',
            '	x',
            'x',
        ]);
    });
    test('issue #62143: Broken indentation detection', () => {
        // works before the fix
        assertGuess(true, 2, ['x', 'x', '  x', '  x']);
        // works before the fix
        assertGuess(true, 2, ['x', '  - item2', '  - item3']);
        // works before the fix
        testGuessIndentation(true, 2, true, 2, ['x x', '  x', '  x']);
        // fails before the fix
        // empty space inline breaks the indentation guess
        testGuessIndentation(true, 2, true, 2, ['x x', '  x', '  x', '    x']);
        testGuessIndentation(true, 2, true, 2, [
            '<!--test1.md -->',
            '- item1',
            '  - item2',
            '    - item3',
        ]);
    });
    test('issue #84217: Broken indentation detection', () => {
        assertGuess(true, 4, ['def main():', "    print('hello')"]);
        assertGuess(true, 4, ['def main():', "    with open('foo') as fp:", '        print(fp.read())']);
    });
    test('validatePosition', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validatePosition(new Position(0, 0)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(0, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 2)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 30)), new Position(1, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 0)), new Position(2, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 1)), new Position(2, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 2)), new Position(2, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 30)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(3, 0)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(3, 1)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(3, 30)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(30, 30)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(-123.123, -0.5)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MIN_VALUE, Number.MIN_VALUE)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MAX_VALUE, Number.MAX_VALUE)), new Position(2, 9));
        assert.deepStrictEqual(m.validatePosition(new Position(123.23, 47.5)), new Position(2, 9));
        m.dispose();
    });
    test('validatePosition around high-low surrogate pairs 1', () => {
        const m = createTextModel('a📚b');
        assert.deepStrictEqual(m.validatePosition(new Position(0, 0)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(0, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(0, 7)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 2)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 3)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 4)), new Position(1, 4));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 5)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 30)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 0)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 1)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 2)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(2, 30)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(-123.123, -0.5)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MIN_VALUE, Number.MIN_VALUE)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(Number.MAX_VALUE, Number.MAX_VALUE)), new Position(1, 5));
        assert.deepStrictEqual(m.validatePosition(new Position(123.23, 47.5)), new Position(1, 5));
        m.dispose();
    });
    test('validatePosition around high-low surrogate pairs 2', () => {
        const m = createTextModel('a📚📚b');
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 2)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 3)), new Position(1, 2));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 4)), new Position(1, 4));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 5)), new Position(1, 4));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 6)), new Position(1, 6));
        assert.deepStrictEqual(m.validatePosition(new Position(1, 7)), new Position(1, 7));
        m.dispose();
    });
    test('validatePosition handle NaN.', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validatePosition(new Position(NaN, 1)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(1, NaN)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(NaN, NaN)), new Position(1, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(2, NaN)), new Position(2, 1));
        assert.deepStrictEqual(m.validatePosition(new Position(NaN, 3)), new Position(1, 3));
        m.dispose();
    });
    test('issue #71480: validatePosition handle floats', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validatePosition(new Position(0.2, 1)), new Position(1, 1), 'a');
        assert.deepStrictEqual(m.validatePosition(new Position(1.2, 1)), new Position(1, 1), 'b');
        assert.deepStrictEqual(m.validatePosition(new Position(1.5, 2)), new Position(1, 2), 'c');
        assert.deepStrictEqual(m.validatePosition(new Position(1.8, 3)), new Position(1, 3), 'd');
        assert.deepStrictEqual(m.validatePosition(new Position(1, 0.3)), new Position(1, 1), 'e');
        assert.deepStrictEqual(m.validatePosition(new Position(2, 0.8)), new Position(2, 1), 'f');
        assert.deepStrictEqual(m.validatePosition(new Position(1, 1.2)), new Position(1, 1), 'g');
        assert.deepStrictEqual(m.validatePosition(new Position(2, 1.5)), new Position(2, 1), 'h');
        m.dispose();
    });
    test('issue #71480: validateRange handle floats', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.validateRange(new Range(0.2, 1.5, 0.8, 2.5)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1.2, 1.7, 1.8, 2.2)), new Range(1, 1, 1, 2));
        m.dispose();
    });
    test('validateRange around high-low surrogate pairs 1', () => {
        const m = createTextModel('a📚b');
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 7)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 2)), new Range(1, 1, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 3)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 4)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 5)), new Range(1, 1, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 2)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 3)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 5)), new Range(1, 2, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 3)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 5)), new Range(1, 2, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 4)), new Range(1, 4, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 5)), new Range(1, 4, 1, 5));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 5)), new Range(1, 5, 1, 5));
        m.dispose();
    });
    test('validateRange around high-low surrogate pairs 2', () => {
        const m = createTextModel('a📚📚b');
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(0, 0, 0, 7)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 1)), new Range(1, 1, 1, 1));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 2)), new Range(1, 1, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 3)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 4)), new Range(1, 1, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 5)), new Range(1, 1, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 6)), new Range(1, 1, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 1, 1, 7)), new Range(1, 1, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 2)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 3)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 5)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 6)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 2, 1, 7)), new Range(1, 2, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 3)), new Range(1, 2, 1, 2));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 4)), new Range(1, 2, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 5)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 6)), new Range(1, 2, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 3, 1, 7)), new Range(1, 2, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 4)), new Range(1, 4, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 5)), new Range(1, 4, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 6)), new Range(1, 4, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 4, 1, 7)), new Range(1, 4, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 5)), new Range(1, 4, 1, 4));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 6)), new Range(1, 4, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 5, 1, 7)), new Range(1, 4, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 6, 1, 6)), new Range(1, 6, 1, 6));
        assert.deepStrictEqual(m.validateRange(new Range(1, 6, 1, 7)), new Range(1, 6, 1, 7));
        assert.deepStrictEqual(m.validateRange(new Range(1, 7, 1, 7)), new Range(1, 7, 1, 7));
        m.dispose();
    });
    test('modifyPosition', () => {
        const m = createTextModel('line one\nline two');
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 0), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(0, 0), 0), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(30, 1), 0), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 17), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 1), new Position(1, 2));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 1), 3), new Position(1, 4));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 10), new Position(2, 3));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 5), 13), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 16), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -17), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), -1), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 4), -3), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 3), -10), new Position(1, 2));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -13), new Position(1, 5));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -16), new Position(1, 2));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 17), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), 100), new Position(2, 9));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), -2), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(1, 2), -100), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 2), -100), new Position(1, 1));
        assert.deepStrictEqual(m.modifyPosition(new Position(2, 9), -18), new Position(1, 1));
        m.dispose();
    });
    test('normalizeIndentation 1', () => {
        const model = createTextModel('', undefined, {
            insertSpaces: false,
        });
        assert.strictEqual(model.normalizeIndentation('\t'), '\t');
        assert.strictEqual(model.normalizeIndentation('    '), '\t');
        assert.strictEqual(model.normalizeIndentation('   '), '   ');
        assert.strictEqual(model.normalizeIndentation('  '), '  ');
        assert.strictEqual(model.normalizeIndentation(' '), ' ');
        assert.strictEqual(model.normalizeIndentation(''), '');
        assert.strictEqual(model.normalizeIndentation(' \t    '), '\t\t');
        assert.strictEqual(model.normalizeIndentation(' \t   '), '\t   ');
        assert.strictEqual(model.normalizeIndentation(' \t  '), '\t  ');
        assert.strictEqual(model.normalizeIndentation(' \t '), '\t ');
        assert.strictEqual(model.normalizeIndentation(' \t'), '\t');
        assert.strictEqual(model.normalizeIndentation('\ta'), '\ta');
        assert.strictEqual(model.normalizeIndentation('    a'), '\ta');
        assert.strictEqual(model.normalizeIndentation('   a'), '   a');
        assert.strictEqual(model.normalizeIndentation('  a'), '  a');
        assert.strictEqual(model.normalizeIndentation(' a'), ' a');
        assert.strictEqual(model.normalizeIndentation('a'), 'a');
        assert.strictEqual(model.normalizeIndentation(' \t    a'), '\t\ta');
        assert.strictEqual(model.normalizeIndentation(' \t   a'), '\t   a');
        assert.strictEqual(model.normalizeIndentation(' \t  a'), '\t  a');
        assert.strictEqual(model.normalizeIndentation(' \t a'), '\t a');
        assert.strictEqual(model.normalizeIndentation(' \ta'), '\ta');
        model.dispose();
    });
    test('normalizeIndentation 2', () => {
        const model = createTextModel('');
        assert.strictEqual(model.normalizeIndentation('\ta'), '    a');
        assert.strictEqual(model.normalizeIndentation('    a'), '    a');
        assert.strictEqual(model.normalizeIndentation('   a'), '   a');
        assert.strictEqual(model.normalizeIndentation('  a'), '  a');
        assert.strictEqual(model.normalizeIndentation(' a'), ' a');
        assert.strictEqual(model.normalizeIndentation('a'), 'a');
        assert.strictEqual(model.normalizeIndentation(' \t    a'), '        a');
        assert.strictEqual(model.normalizeIndentation(' \t   a'), '       a');
        assert.strictEqual(model.normalizeIndentation(' \t  a'), '      a');
        assert.strictEqual(model.normalizeIndentation(' \t a'), '     a');
        assert.strictEqual(model.normalizeIndentation(' \ta'), '    a');
        model.dispose();
    });
    test('getLineFirstNonWhitespaceColumn', () => {
        const model = createTextModel(['asd', ' asd', '\tasd', '  asd', '\t\tasd', ' ', '  ', '\t', '\t\t', '  \tasd', '', ''].join('\n'));
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(1), 1, '1');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(2), 2, '2');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(3), 2, '3');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(4), 3, '4');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(5), 3, '5');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(6), 0, '6');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(7), 0, '7');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(8), 0, '8');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(9), 0, '9');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(10), 4, '10');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(11), 0, '11');
        assert.strictEqual(model.getLineFirstNonWhitespaceColumn(12), 0, '12');
        model.dispose();
    });
    test('getLineLastNonWhitespaceColumn', () => {
        const model = createTextModel(['asd', 'asd ', 'asd\t', 'asd  ', 'asd\t\t', ' ', '  ', '\t', '\t\t', 'asd  \t', '', ''].join('\n'));
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(1), 4, '1');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(2), 4, '2');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(3), 4, '3');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(4), 4, '4');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(5), 4, '5');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(6), 0, '6');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(7), 0, '7');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(8), 0, '8');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(9), 0, '9');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(10), 4, '10');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(11), 0, '11');
        assert.strictEqual(model.getLineLastNonWhitespaceColumn(12), 0, '12');
        model.dispose();
    });
    test('#50471. getValueInRange with invalid range', () => {
        const m = createTextModel('My First Line\r\nMy Second Line\r\nMy Third Line');
        assert.strictEqual(m.getValueInRange(new Range(1, NaN, 1, 3)), 'My');
        assert.strictEqual(m.getValueInRange(new Range(NaN, NaN, NaN, NaN)), '');
        m.dispose();
    });
    test('issue #168836: updating tabSize should also update indentSize when indentSize is set to "tabSize"', () => {
        const m = createTextModel('some text', null, {
            tabSize: 2,
            indentSize: 'tabSize',
        });
        assert.strictEqual(m.getOptions().tabSize, 2);
        assert.strictEqual(m.getOptions().indentSize, 2);
        assert.strictEqual(m.getOptions().originalIndentSize, 'tabSize');
        m.updateOptions({
            tabSize: 4,
        });
        assert.strictEqual(m.getOptions().tabSize, 4);
        assert.strictEqual(m.getOptions().indentSize, 4);
        assert.strictEqual(m.getOptions().originalIndentSize, 'tabSize');
        m.dispose();
    });
});
suite('TextModel.mightContainRTL', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('nope', () => {
        const model = createTextModel('hello world!');
        assert.strictEqual(model.mightContainRTL(), false);
        model.dispose();
    });
    test('yes', () => {
        const model = createTextModel('Hello,\nזוהי עובדה מבוססת שדעתו');
        assert.strictEqual(model.mightContainRTL(), true);
        model.dispose();
    });
    test('setValue resets 1', () => {
        const model = createTextModel('hello world!');
        assert.strictEqual(model.mightContainRTL(), false);
        model.setValue('Hello,\nזוהי עובדה מבוססת שדעתו');
        assert.strictEqual(model.mightContainRTL(), true);
        model.dispose();
    });
    test('setValue resets 2', () => {
        const model = createTextModel('Hello,\nهناك حقيقة مثبتة منذ زمن طويل');
        assert.strictEqual(model.mightContainRTL(), true);
        model.setValue('hello world!');
        assert.strictEqual(model.mightContainRTL(), false);
        model.dispose();
    });
});
suite('TextModel.createSnapshot', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty file', () => {
        const model = createTextModel('');
        const snapshot = model.createSnapshot();
        assert.strictEqual(snapshot.read(), null);
        model.dispose();
    });
    test('file with BOM', () => {
        const model = createTextModel(UTF8_BOM_CHARACTER + 'Hello');
        assert.strictEqual(model.getLineContent(1), 'Hello');
        const snapshot = model.createSnapshot(true);
        assert.strictEqual(snapshot.read(), UTF8_BOM_CHARACTER + 'Hello');
        assert.strictEqual(snapshot.read(), null);
        model.dispose();
    });
    test('regular file', () => {
        const model = createTextModel('My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
        const snapshot = model.createSnapshot();
        assert.strictEqual(snapshot.read(), 'My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
        assert.strictEqual(snapshot.read(), null);
        model.dispose();
    });
    test('large file', () => {
        const lines = [];
        for (let i = 0; i < 1000; i++) {
            lines[i] = 'Just some text that is a bit long such that it can consume some memory';
        }
        const text = lines.join('\n');
        const model = createTextModel(text);
        const snapshot = model.createSnapshot();
        let actual = '';
        // 70999 length => at most 2 read calls are necessary
        const tmp1 = snapshot.read();
        assert.ok(tmp1);
        actual += tmp1;
        const tmp2 = snapshot.read();
        if (tmp2 === null) {
            // all good
        }
        else {
            actual += tmp2;
            assert.strictEqual(snapshot.read(), null);
        }
        assert.strictEqual(actual, text);
        model.dispose();
    });
    test('issue #119632: invalid range', () => {
        const model = createTextModel('hello world!');
        const actual = model._validateRangeRelaxedNoAllocations(new Range(undefined, 0, undefined, 1));
        assert.deepStrictEqual(actual, new Range(1, 1, 1, 1));
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZWwvdGV4dE1vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWxGLE9BQU8sRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFHMUUsU0FBUyxvQkFBb0IsQ0FDNUIsbUJBQTRCLEVBQzVCLGNBQXNCLEVBQ3RCLG9CQUE2QixFQUM3QixlQUF1QixFQUN2QixJQUFjLEVBQ2QsR0FBWTtJQUVaLE1BQU0sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRTtRQUNyRCxPQUFPLEVBQUUsY0FBYztRQUN2QixZQUFZLEVBQUUsbUJBQW1CO1FBQ2pDLGlCQUFpQixFQUFFLElBQUk7S0FDdkIsQ0FBQyxDQUFBO0lBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ3hC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QUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXBGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1RixNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFDcEUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNsQixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQ3BFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDbEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTFGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNaLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUMvRCxNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFakMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVGLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUNwRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ2xCLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFDcEUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNsQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFMUYsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ1osQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBQy9ELE1BQU0sQ0FBQyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUVuQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVsRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDWixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFFL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxRQUFRLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFB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SyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUU3RixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDWixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDNUQsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWpDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDWixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDNUQsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRW5DLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNaLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVyRixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFckYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXJGLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNaLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRTtZQUM1QyxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUzRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFH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QUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsK0JBQStC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