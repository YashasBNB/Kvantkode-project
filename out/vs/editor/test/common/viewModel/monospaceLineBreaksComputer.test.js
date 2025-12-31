/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditorOptions } from '../../../common/config/editorOptions.js';
import { FontInfo } from '../../../common/config/fontInfo.js';
import { ModelLineProjectionData, } from '../../../common/modelLineProjectionData.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
function parseAnnotatedText(annotatedText) {
    let text = '';
    let currentLineIndex = 0;
    const indices = [];
    for (let i = 0, len = annotatedText.length; i < len; i++) {
        if (annotatedText.charAt(i) === '|') {
            currentLineIndex++;
        }
        else {
            text += annotatedText.charAt(i);
            indices[text.length - 1] = currentLineIndex;
        }
    }
    return { text: text, indices: indices };
}
function toAnnotatedText(text, lineBreakData) {
    // Insert line break markers again, according to algorithm
    let actualAnnotatedText = '';
    if (lineBreakData) {
        let previousLineIndex = 0;
        for (let i = 0, len = text.length; i < len; i++) {
            const r = lineBreakData.translateToOutputPosition(i);
            if (previousLineIndex !== r.outputLineIndex) {
                previousLineIndex = r.outputLineIndex;
                actualAnnotatedText += '|';
            }
            actualAnnotatedText += text.charAt(i);
        }
    }
    else {
        // No wrapping
        actualAnnotatedText = text;
    }
    return actualAnnotatedText;
}
function getLineBreakData(factory, tabSize, breakAfter, columnsForFullWidthChar, wrappingIndent, wordBreak, text, previousLineBreakData) {
    const fontInfo = new FontInfo({
        pixelRatio: 1,
        fontFamily: 'testFontFamily',
        fontWeight: 'normal',
        fontSize: 14,
        fontFeatureSettings: '',
        fontVariationSettings: '',
        lineHeight: 19,
        letterSpacing: 0,
        isMonospace: true,
        typicalHalfwidthCharacterWidth: 7,
        typicalFullwidthCharacterWidth: 7 * columnsForFullWidthChar,
        canUseHalfwidthRightwardsArrow: true,
        spaceWidth: 7,
        middotWidth: 7,
        wsmiddotWidth: 7,
        maxDigitWidth: 7,
    }, false);
    const lineBreaksComputer = factory.createLineBreaksComputer(fontInfo, tabSize, breakAfter, wrappingIndent, wordBreak);
    const previousLineBreakDataClone = previousLineBreakData
        ? new ModelLineProjectionData(null, null, previousLineBreakData.breakOffsets.slice(0), previousLineBreakData.breakOffsetsVisibleColumn.slice(0), previousLineBreakData.wrappedTextIndentLength)
        : null;
    lineBreaksComputer.addRequest(text, null, previousLineBreakDataClone);
    return lineBreaksComputer.finalize()[0];
}
function assertLineBreaks(factory, tabSize, breakAfter, annotatedText, wrappingIndent = 0 /* WrappingIndent.None */, wordBreak = 'normal') {
    // Create version of `annotatedText` with line break markers removed
    const text = parseAnnotatedText(annotatedText).text;
    const lineBreakData = getLineBreakData(factory, tabSize, breakAfter, 2, wrappingIndent, wordBreak, text, null);
    const actualAnnotatedText = toAnnotatedText(text, lineBreakData);
    assert.strictEqual(actualAnnotatedText, annotatedText);
    return lineBreakData;
}
suite('Editor ViewModel - MonospaceLineBreaksComputer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('MonospaceLineBreaksComputer', () => {
        const factory = new MonospaceLineBreaksComputerFactory('(', '\t).');
        // Empty string
        assertLineBreaks(factory, 4, 5, '');
        // No wrapping if not necessary
        assertLineBreaks(factory, 4, 5, 'aaa');
        assertLineBreaks(factory, 4, 5, 'aaaaa');
        assertLineBreaks(factory, 4, -1, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        // Acts like hard wrapping if no char found
        assertLineBreaks(factory, 4, 5, 'aaaaa|a');
        // Honors wrapping character
        assertLineBreaks(factory, 4, 5, 'aaaaa|.');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a.|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a..|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a...|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a....|aaa.|aa');
        // Honors tabs when computing wrapping position
        assertLineBreaks(factory, 4, 5, '\t');
        assertLineBreaks(factory, 4, 5, '\t|aaa');
        assertLineBreaks(factory, 4, 5, '\t|a\t|aa');
        assertLineBreaks(factory, 4, 5, 'aa\ta');
        assertLineBreaks(factory, 4, 5, 'aa\t|aa');
        // Honors wrapping before characters (& gives it priority)
        assertLineBreaks(factory, 4, 5, 'aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaa(.|aa');
        // Honors wrapping after characters (& gives it priority)
        assertLineBreaks(factory, 4, 5, 'aaa))|).aaa');
        assertLineBreaks(factory, 4, 5, 'aaa))|).|aaaa');
        assertLineBreaks(factory, 4, 5, 'aaa)|().|aaa');
        assertLineBreaks(factory, 4, 5, 'aaa|(().|aaa');
        assertLineBreaks(factory, 4, 5, 'aa.|(().|aaa');
        assertLineBreaks(factory, 4, 5, 'aa.|(.).|aaa');
    });
    function assertLineBreakDataEqual(a, b) {
        if (!a || !b) {
            assert.deepStrictEqual(a, b);
            return;
        }
        assert.deepStrictEqual(a.breakOffsets, b.breakOffsets);
        assert.deepStrictEqual(a.wrappedTextIndentLength, b.wrappedTextIndentLength);
        for (let i = 0; i < a.breakOffsetsVisibleColumn.length; i++) {
            const diff = a.breakOffsetsVisibleColumn[i] - b.breakOffsetsVisibleColumn[i];
            assert.ok(diff < 0.001);
        }
    }
    function assertIncrementalLineBreaks(factory, text, tabSize, breakAfter1, annotatedText1, breakAfter2, annotatedText2, wrappingIndent = 0 /* WrappingIndent.None */, columnsForFullWidthChar = 2) {
        // sanity check the test
        assert.strictEqual(text, parseAnnotatedText(annotatedText1).text);
        assert.strictEqual(text, parseAnnotatedText(annotatedText2).text);
        // check that the direct mapping is ok for 1
        const directLineBreakData1 = getLineBreakData(factory, tabSize, breakAfter1, columnsForFullWidthChar, wrappingIndent, 'normal', text, null);
        assert.strictEqual(toAnnotatedText(text, directLineBreakData1), annotatedText1);
        // check that the direct mapping is ok for 2
        const directLineBreakData2 = getLineBreakData(factory, tabSize, breakAfter2, columnsForFullWidthChar, wrappingIndent, 'normal', text, null);
        assert.strictEqual(toAnnotatedText(text, directLineBreakData2), annotatedText2);
        // check that going from 1 to 2 is ok
        const lineBreakData2from1 = getLineBreakData(factory, tabSize, breakAfter2, columnsForFullWidthChar, wrappingIndent, 'normal', text, directLineBreakData1);
        assert.strictEqual(toAnnotatedText(text, lineBreakData2from1), annotatedText2);
        assertLineBreakDataEqual(lineBreakData2from1, directLineBreakData2);
        // check that going from 2 to 1 is ok
        const lineBreakData1from2 = getLineBreakData(factory, tabSize, breakAfter1, columnsForFullWidthChar, wrappingIndent, 'normal', text, directLineBreakData2);
        assert.strictEqual(toAnnotatedText(text, lineBreakData1from2), annotatedText1);
        assertLineBreakDataEqual(lineBreakData1from2, directLineBreakData1);
    }
    test('MonospaceLineBreaksComputer incremental 1', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, 'just some text and more', 4, 10, 'just some |text and |more', 15, 'just some text |and more');
        assertIncrementalLineBreaks(factory, 'Cu scripserit suscipiantur eos, in affert pericula contentiones sed, cetero sanctus et pro. Ius vidit magna regione te, sit ei elaboraret liberavisse. Mundi verear eu mea, eam vero scriptorem in, vix in menandri assueverit. Natum definiebas cu vim. Vim doming vocibus efficiantur id. In indoctum deseruisse voluptatum vim, ad debitis verterem sed.', 4, 47, 'Cu scripserit suscipiantur eos, in affert |pericula contentiones sed, cetero sanctus et |pro. Ius vidit magna regione te, sit ei |elaboraret liberavisse. Mundi verear eu mea, |eam vero scriptorem in, vix in menandri |assueverit. Natum definiebas cu vim. Vim |doming vocibus efficiantur id. In indoctum |deseruisse voluptatum vim, ad debitis verterem |sed.', 142, 'Cu scripserit suscipiantur eos, in affert pericula contentiones sed, cetero sanctus et pro. Ius vidit magna regione te, sit ei elaboraret |liberavisse. Mundi verear eu mea, eam vero scriptorem in, vix in menandri assueverit. Natum definiebas cu vim. Vim doming vocibus efficiantur |id. In indoctum deseruisse voluptatum vim, ad debitis verterem sed.');
        assertIncrementalLineBreaks(factory, 'An his legere persecuti, oblique delicata efficiantur ex vix, vel at graecis officiis maluisset. Et per impedit voluptua, usu discere maiorum at. Ut assum ornatus temporibus vis, an sea melius pericula. Ea dicunt oblique phaedrum nam, eu duo movet nobis. His melius facilis eu, vim malorum temporibus ne. Nec no sale regione, meliore civibus placerat id eam. Mea alii fabulas definitionem te, agam volutpat ad vis, et per bonorum nonumes repudiandae.', 4, 57, 'An his legere persecuti, oblique delicata efficiantur ex |vix, vel at graecis officiis maluisset. Et per impedit |voluptua, usu discere maiorum at. Ut assum ornatus |temporibus vis, an sea melius pericula. Ea dicunt |oblique phaedrum nam, eu duo movet nobis. His melius |facilis eu, vim malorum temporibus ne. Nec no sale |regione, meliore civibus placerat id eam. Mea alii |fabulas definitionem te, agam volutpat ad vis, et per |bonorum nonumes repudiandae.', 58, 'An his legere persecuti, oblique delicata efficiantur ex |vix, vel at graecis officiis maluisset. Et per impedit |voluptua, usu discere maiorum at. Ut assum ornatus |temporibus vis, an sea melius pericula. Ea dicunt oblique |phaedrum nam, eu duo movet nobis. His melius facilis eu, |vim malorum temporibus ne. Nec no sale regione, meliore |civibus placerat id eam. Mea alii fabulas definitionem |te, agam volutpat ad vis, et per bonorum nonumes |repudiandae.');
        assertIncrementalLineBreaks(factory, '\t\t"owner": "vscode",', 4, 14, '\t\t"owner|": |"vscod|e",', 16, '\t\t"owner":| |"vscode"|,', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇&👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 4, 51, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇&|👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 50, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇|&|👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '🐇👬&🌞🌖', 4, 5, '🐇👬&|🌞🌖', 4, '🐇👬|&|🌞🌖', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, "\t\tfunc('🌞🏇🍼🌞🏇🍼🐇&👬🌖🌞👬🌖🌞🏇🍼🐇👬', WrappingIndent.Same);", 4, 26, "\t\tfunc|('🌞🏇🍼🌞🏇🍼🐇&|👬🌖🌞👬🌖🌞🏇🍼🐇|👬', |WrappingIndent.|Same);", 27, "\t\tfunc|('🌞🏇🍼🌞🏇🍼🐇&|👬🌖🌞👬🌖🌞🏇🍼🐇|👬', |WrappingIndent.|Same);", 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, 'factory, "xtxtfunc(x"🌞🏇🍼🌞🏇🍼🐇&👬🌖🌞👬🌖🌞🏇🍼🐇👬x"', 4, 16, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼|🐇&|👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 17, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼🐇|&👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 1 /* WrappingIndent.Same */);
    });
    test('issue #95686: CRITICAL: loop forever on the monospaceLineBreaksComputer', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, '						<tr dmx-class:table-danger="(alt <= 50)" dmx-class:table-warning="(alt <= 200)" dmx-class:table-primary="(alt <= 400)" dmx-class:table-info="(alt <= 800)" dmx-class:table-success="(alt >= 400)">', 4, 179, '						<tr dmx-class:table-danger="(alt <= 50)" dmx-class:table-warning="(alt <= 200)" dmx-class:table-primary="(alt <= 400)" dmx-class:table-info="(alt <= 800)" |dmx-class:table-success="(alt >= 400)">', 1, '	|	|	|	|	|	|<|t|r| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|d|a|n|g|e|r|=|"|(|a|l|t| |<|=| |5|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|w|a|r|n|i|n|g|=|"|(|a|l|t| |<|=| |2|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|p|r|i|m|a|r|y|=|"|(|a|l|t| |<|=| |4|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|i|n|f|o|=|"|(|a|l|t| |<|=| |8|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|s|u|c|c|e|s|s|=|"|(|a|l|t| |>|=| |4|0|0|)|"|>', 1 /* WrappingIndent.Same */);
    });
    test('issue #110392: Occasional crash when resize with panel on the right', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, '你好 **hello** **hello** **hello-world** hey there!', 4, 15, '你好 **hello** |**hello** |**hello-world**| hey there!', 1, '你|好| |*|*|h|e|l|l|o|*|*| |*|*|h|e|l|l|o|*|*| |*|*|h|e|l|l|o|-|w|o|r|l|d|*|*| |h|e|y| |t|h|e|r|e|!', 1 /* WrappingIndent.Same */, 1.6605405405405405);
    });
    test('MonospaceLineBreaksComputer - CJK and Kinsoku Shori', () => {
        const factory = new MonospaceLineBreaksComputerFactory('(', '\t)');
        assertLineBreaks(factory, 4, 5, 'aa \u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, '\u3042 \u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, '\u3042\u3042|\u5b89\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa |\u5b89)\u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa \u3042|\u5b89\u3042)|\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa |(\u5b89aa|\u5b89');
    });
    test('MonospaceLineBreaksComputer - WrappingIndent.Same', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        assertLineBreaks(factory, 4, 38, ' *123456789012345678901234567890123456|7890', 1 /* WrappingIndent.Same */);
    });
    test('issue #16332: Scroll bar overlaying on top of text', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        assertLineBreaks(factory, 4, 24, 'a/ very/long/line/of/tex|t/that/expands/beyon|d/your/typical/line/|of/code/', 2 /* WrappingIndent.Indent */);
    });
    test('issue #35162: wrappingIndent not consistently working', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        const mapper = assertLineBreaks(factory, 4, 24, '                t h i s |i s |a l |o n |g l |i n |e', 2 /* WrappingIndent.Indent */);
        assert.strictEqual(mapper.wrappedTextIndentLength, '                    '.length);
    });
    test('issue #75494: surrogate pairs', () => {
        const factory = new MonospaceLineBreaksComputerFactory('\t', ' ');
        assertLineBreaks(factory, 4, 49, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼|🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼|🐇👬', 1 /* WrappingIndent.Same */);
    });
    test('issue #75494: surrogate pairs overrun 1', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 4, '🐇👬|&|🌞🌖', 1 /* WrappingIndent.Same */);
    });
    test('issue #75494: surrogate pairs overrun 2', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 17, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼🐇|&👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 1 /* WrappingIndent.Same */);
    });
    test('MonospaceLineBreaksComputer - WrappingIndent.DeepIndent', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        const mapper = assertLineBreaks(factory, 4, 26, '        W e A r e T e s t |i n g D e |e p I n d |e n t a t |i o n', 3 /* WrappingIndent.DeepIndent */);
        assert.strictEqual(mapper.wrappedTextIndentLength, '                '.length);
    });
    test('issue #33366: Word wrap algorithm behaves differently around punctuation', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 23, 'this is a line of |text, text that sits |on a line', 1 /* WrappingIndent.Same */);
    });
    test('issue #152773: Word wrap algorithm behaves differently with bracket followed by comma', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 24, 'this is a line of |(text), text that sits |on a line', 1 /* WrappingIndent.Same */);
    });
    test("issue #112382: Word wrap doesn't work well with control characters", () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 6, '\x06\x06\x06|\x06\x06\x06', 1 /* WrappingIndent.Same */);
    });
    test('Word break work well with Chinese/Japanese/Korean (CJK) text when setting normal', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 5, '你好|1111', 1 /* WrappingIndent.Same */, 'normal');
    });
    test('Word break work well with Chinese/Japanese/Korean (CJK) text when setting keepAll', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 8, '你好1111', 1 /* WrappingIndent.Same */, 'keepAll');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vdmlld01vZGVsL21vbm9zcGFjZUxpbmVCcmVha3NDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFN0csU0FBUyxrQkFBa0IsQ0FBQyxhQUFxQjtJQUNoRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUE7SUFDYixJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQTtJQUN4QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7SUFDNUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ25CLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0IsT0FBTyxDQUFDLElBQUksQ0FB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