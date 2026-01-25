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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25FbnRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvc3VwcG9ydHMvb25FbnRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzFCLE1BQU0sUUFBUSxHQUFvQjtZQUNqQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7WUFDVixDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7U0FDaEIsQ0FBQTtRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDO1lBQ2xDLFFBQVEsRUFBRSxRQUFRO1NBQ2xCLENBQUMsQ0FBQTtRQUNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxVQUFrQixFQUFFLFNBQWlCLEVBQUUsUUFBc0IsRUFBRSxFQUFFO1lBQzFGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLDRDQUFvQyxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVGLElBQUksUUFBUSxLQUFLLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDakMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTyxDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDL0MsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDN0MsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEQsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDcEQsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkQsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDNUQsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDOUQsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDakUsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdEQsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDdkQsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFeEQsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDakQsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckQsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1FBQzdELE1BQU0sT0FBTyxHQUFHLElBQUksY0FBYyxDQUFDO1lBQ2xDLFlBQVksRUFBRTtnQkFDYjtvQkFDQyxNQUFNLEVBQUU7d0JBQ1AsVUFBVSxFQUFFLE1BQU07d0JBQ2xCLFlBQVksRUFBRSxZQUFZLENBQUMsT0FBTztxQkFDbEM7b0JBQ0QsVUFBVSxFQUFFLGdCQUFnQjtpQkFDNUI7YUFDRDtTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDeEIsZ0JBQXdCLEVBQ3hCLFVBQWtCLEVBQ2xCLFNBQWlCLEVBQ2pCLG9CQUF5QyxFQUN6QyxrQkFBaUMsRUFDakMsYUFBcUIsQ0FBQyxFQUNyQixFQUFFO1lBQ0gsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sNENBRTdCLGdCQUFnQixFQUNoQixVQUFVLEVBQ1YsU0FBUyxDQUNULENBQUE7WUFDRCxJQUFJLG9CQUFvQixLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFBO1lBQ3pELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUUsSUFBSSxFQUFFLFlBQVksR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsWUFBWSxFQUFFLG9CQUFvQixFQUFFLGVBQWUsR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDNUYsSUFBSSxrQkFBa0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDdkYsQ0FBQztnQkFDRCxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxhQUFhLEdBQUcsVUFBVSxDQUFDLENBQUE7Z0JBQy9FLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxRSxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzNFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FBQztZQUNsQyxZQUFZLEVBQUUsc0JBQXNCO1NBQ3BDLENBQUMsQ0FBQTtRQUNGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDeEIsZ0JBQXdCLEVBQ3hCLFVBQWtCLEVBQ2xCLFNBQWlCLEVBQ2pCLG9CQUF5QyxFQUN6QyxrQkFBaUMsRUFDakMsYUFBcUIsQ0FBQyxFQUNyQixFQUFFO1lBQ0gsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sNENBRTdCLGdCQUFnQixFQUNoQixVQUFVLEVBQ1YsU0FBUyxDQUNULENBQUE7WUFDRCxJQUFJLG9CQUFvQixLQUFLLElBQUksRUFBRSxDQUFDO2dCQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFBO1lBQ3pELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUUsSUFBSSxFQUFFLFlBQVksR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsWUFBWSxFQUFFLG9CQUFvQixFQUFFLGVBQWUsR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDNUYsSUFBSSxrQkFBa0IsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLGFBQWEsR0FBRyxVQUFVLENBQUMsQ0FBQTtnQkFDdkYsQ0FBQztnQkFDRCxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxhQUFhLEdBQUcsVUFBVSxDQUFDLENBQUE7Z0JBQy9FLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RSxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzNELGdCQUFnQixDQUFDLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN2RSxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlELGdCQUFnQixDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2hELGdCQUFnQixDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RELGdCQUFnQixDQUFDLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDckQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdEQsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1QyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0MsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5RCxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUU3RCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRCxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUUzRCxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9ELGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTlELGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDM0QsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNwRSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFdEUsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLHdCQUF3QixFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlFLGdCQUFnQixDQUFDLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RixnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFN0UsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RCxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3RFLGdCQUFnQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFNUQsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLDZCQUE2QixFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25GLGdCQUFnQixDQUFDLGNBQWMsRUFBRSw2QkFBNkIsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RixnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbEYsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLDhCQUE4QixFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3BGLGdCQUFnQixDQUFDLGNBQWMsRUFBRSw4QkFBOEIsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RixnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFbkYsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDM0QsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEUsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0QsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0QsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0QsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakUsZ0JBQWdCLENBQ2YsRUFBRSxFQUNGLGtHQUFrRyxFQUNsRyxFQUFFLEVBQ0YsWUFBWSxDQUFDLElBQUksRUFDakIsSUFBSSxFQUNKLENBQUMsQ0FDRCxDQUFBO1FBRUQsZUFBZTtRQUNmLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakYsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4RSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVFLGdCQUFnQixDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9FLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLGdCQUFnQixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDMUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxjQUFjLENBQUM7WUFDbEMsWUFBWSxFQUFFLHNCQUFzQjtTQUNwQyxDQUFDLENBQUE7UUFDRixNQUFNLGdCQUFnQixHQUFHLENBQUMsVUFBa0IsRUFBRSxTQUFpQixFQUFFLFFBQXNCLEVBQUUsRUFBRTtZQUMxRixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyw0Q0FBb0MsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM1RixJQUFJLFFBQVEsS0FBSyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU8sQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDbkQsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekQsZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5RCxnQkFBZ0IsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==