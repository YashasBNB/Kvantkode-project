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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi92aWV3TW9kZWwvbW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0seUNBQXlDLENBQUE7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU3RyxTQUFTLGtCQUFrQixDQUFDLGFBQXFCO0lBQ2hELElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUNiLElBQUksZ0JBQWdCLEdBQUcsQ0FBQyxDQUFBO0lBQ3hCLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtJQUM1QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUQsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ3JDLGdCQUFnQixFQUFFLENBQUE7UUFDbkIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZ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