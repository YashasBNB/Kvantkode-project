/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IndentAction } from '../../../../common/languages/languageConfiguration.js';
import { OnEnterSupport } from '../../../../common/languages/supports/onEnter.js';
import { javascriptOnEnterRules } from './onEnterRules.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('OnEnter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('uses brackets', () => {
        const brackets = [
            ['(', ')'],
            ['begin', 'end'],
        ];
        const support = new OnEnterSupport({
            brackets: brackets,
        });
        const testIndentAction = (beforeText, afterText, expected) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, '', beforeText, afterText);
            if (expected === IndentAction.None) {
                assert.strictEqual(actual, null);
            }
            else {
                assert.strictEqual(actual.indentAction, expected);
            }
        };
        testIndentAction('a', '', IndentAction.None);
        testIndentAction('', 'b', IndentAction.None);
        testIndentAction('(', 'b', IndentAction.Indent);
        testIndentAction('a', ')', IndentAction.None);
        testIndentAction('begin', 'ending', IndentAction.Indent);
        testIndentAction('abegin', 'end', IndentAction.None);
        testIndentAction('begin', ')', IndentAction.Indent);
        testIndentAction('begin', 'end', IndentAction.IndentOutdent);
        testIndentAction('begin ', ' end', IndentAction.IndentOutdent);
        testIndentAction(' begin', 'end//as', IndentAction.IndentOutdent);
        testIndentAction('(', ')', IndentAction.IndentOutdent);
        testIndentAction('( ', ')', IndentAction.IndentOutdent);
        testIndentAction('a(', ')b', IndentAction.IndentOutdent);
        testIndentAction('(', '', IndentAction.Indent);
        testIndentAction('(', 'foo', IndentAction.Indent);
        testIndentAction('begin', 'foo', IndentAction.Indent);
        testIndentAction('begin', '', IndentAction.Indent);
    });
    test('Issue #121125: onEnterRules with global modifier', () => {
        const support = new OnEnterSupport({
            onEnterRules: [
                {
                    action: {
                        appendText: '/// ',
                        indentAction: IndentAction.Outdent,
                    },
                    beforeText: /^\s*\/{3}.*$/gm,
                },
            ],
        });
        const testIndentAction = (previousLineText, beforeText, afterText, expectedIndentAction, expectedAppendText, removeText = 0) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, previousLineText, beforeText, afterText);
            if (expectedIndentAction === null) {
                assert.strictEqual(actual, null, 'isNull:' + beforeText);
            }
            else {
                assert.strictEqual(actual !== null, true, 'isNotNull:' + beforeText);
                assert.strictEqual(actual.indentAction, expectedIndentAction, 'indentAction:' + beforeText);
                if (expectedAppendText !== null) {
                    assert.strictEqual(actual.appendText, expectedAppendText, 'appendText:' + beforeText);
                }
                if (removeText !== 0) {
                    assert.strictEqual(actual.removeText, removeText, 'removeText:' + beforeText);
                }
            }
        };
        testIndentAction('/// line', '/// line', '', IndentAction.Outdent, '/// ');
        testIndentAction('/// line', '/// line', '', IndentAction.Outdent, '/// ');
    });
    test('uses regExpRules', () => {
        const support = new OnEnterSupport({
            onEnterRules: javascriptOnEnterRules,
        });
        const testIndentAction = (previousLineText, beforeText, afterText, expectedIndentAction, expectedAppendText, removeText = 0) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, previousLineText, beforeText, afterText);
            if (expectedIndentAction === null) {
                assert.strictEqual(actual, null, 'isNull:' + beforeText);
            }
            else {
                assert.strictEqual(actual !== null, true, 'isNotNull:' + beforeText);
                assert.strictEqual(actual.indentAction, expectedIndentAction, 'indentAction:' + beforeText);
                if (expectedAppendText !== null) {
                    assert.strictEqual(actual.appendText, expectedAppendText, 'appendText:' + beforeText);
                }
                if (removeText !== 0) {
                    assert.strictEqual(actual.removeText, removeText, 'removeText:' + beforeText);
                }
            }
        };
        testIndentAction('', '\t/**', ' */', IndentAction.IndentOutdent, ' * ');
        testIndentAction('', '\t/**', '', IndentAction.None, ' * ');
        testIndentAction('', '\t/** * / * / * /', '', IndentAction.None, ' * ');
        testIndentAction('', '\t/** /*', '', IndentAction.None, ' * ');
        testIndentAction('', '/**', '', IndentAction.None, ' * ');
        testIndentAction('', '\t/**/', '', null, null);
        testIndentAction('', '\t/***/', '', null, null);
        testIndentAction('', '\t/*******/', '', null, null);
        testIndentAction('', '\t/** * * * * */', '', null, null);
        testIndentAction('', '\t/** */', '', null, null);
        testIndentAction('', '\t/** asdfg */', '', null, null);
        testIndentAction('', '\t/* asdfg */', '', null, null);
        testIndentAction('', '\t/* asdfg */', '', null, null);
        testIndentAction('', '\t/** asdfg */', '', null, null);
        testIndentAction('', '*/', '', null, null);
        testIndentAction('', '\t/*', '', null, null);
        testIndentAction('', '\t*', '', null, null);
        testIndentAction('\t/**', '\t *', '', IndentAction.None, '* ');
        testIndentAction('\t * something', '\t *', '', IndentAction.None, '* ');
        testIndentAction('\t *', '\t *', '', IndentAction.None, '* ');
        testIndentAction('', '\t */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t * */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t * * / * / * / */', '', null, null);
        testIndentAction('\t/**', '\t * ', '', IndentAction.None, '* ');
        testIndentAction('\t * something', '\t * ', '', IndentAction.None, '* ');
        testIndentAction('\t *', '\t * ', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * ', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * ', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * asdfsfagadfg * * * ', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * asdfsfagadfg * * * ', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg * * * ', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * /*', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * /*', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * /*', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * asdfsfagadfg * / * / * /', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * asdfsfagadfg * / * / * /', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg * / * / * /', '', IndentAction.None, '* ');
        testIndentAction('/**', ' * asdfsfagadfg * / * / * /*', '', IndentAction.None, '* ');
        testIndentAction(' * something', ' * asdfsfagadfg * / * / * /*', '', IndentAction.None, '* ');
        testIndentAction(' *', ' * asdfsfagadfg * / * / * /*', '', IndentAction.None, '* ');
        testIndentAction('', ' */', '', IndentAction.None, null, 1);
        testIndentAction(' */', ' * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('', '\t */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t\t */', '', IndentAction.None, null, 1);
        testIndentAction('', '   */', '', IndentAction.None, null, 1);
        testIndentAction('', '     */', '', IndentAction.None, null, 1);
        testIndentAction('', '\t     */', '', IndentAction.None, null, 1);
        testIndentAction('', ' *--------------------------------------------------------------------------------------------*/', '', IndentAction.None, null, 1);
        // issue #43469
        testIndentAction('class A {', '    * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('', '    * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('    ', '    * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('class A {', '  * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('', '  * test() {', '', IndentAction.Indent, null, 0);
        testIndentAction('  ', '  * test() {', '', IndentAction.Indent, null, 0);
    });
    test('issue #141816', () => {
        const support = new OnEnterSupport({
            onEnterRules: javascriptOnEnterRules,
        });
        const testIndentAction = (beforeText, afterText, expected) => {
            const actual = support.onEnter(3 /* EditorAutoIndentStrategy.Advanced */, '', beforeText, afterText);
            if (expected === IndentAction.None) {
                assert.strictEqual(actual, null);
            }
            else {
                assert.strictEqual(actual.indentAction, expected);
            }
        };
        testIndentAction('const r = /{/;', '', IndentAction.None);
        testIndentAction('const r = /{[0-9]/;', '', IndentAction.None);
        testIndentAction('const r = /[a-zA-Z]{/;', '', IndentAction.None);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3N1cHBvcnRzL29uRW50ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFMUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMxQixNQUFNLFFBQVEsR0FBb0I7WUFDakMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ1YsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO1NBQ2hCLENBQUE7UUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQztZQUNsQyxRQUFRLEVBQUUsUUFBUTtTQUNsQixDQUFDLENBQUE7UUFDRixNQUFNLGdCQUFnQixHQUFHLENBQUMsVUFBa0IsRUFBRSxTQUFpQixFQUFFLFFBQXNCLEVBQUUsRUFBRTtZQUMxRixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyw0Q0FBb0MsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM1RixJQUFJLFFBQVEsS0FBSyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElB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