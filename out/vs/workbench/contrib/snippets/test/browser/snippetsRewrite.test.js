/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Snippet } from '../../browser/snippetsFile.js';
suite('SnippetRewrite', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertRewrite(input, expected) {
        const actual = new Snippet(false, ['foo'], 'foo', 'foo', 'foo', input, 'foo', 1 /* SnippetSource.User */, generateUuid());
        if (typeof expected === 'boolean') {
            assert.strictEqual(actual.codeSnippet, input);
        }
        else {
            assert.strictEqual(actual.codeSnippet, expected);
        }
    }
    test('bogous variable rewrite', function () {
        assertRewrite('foo', false);
        assertRewrite('hello $1 world$0', false);
        assertRewrite('$foo and $foo', '${1:foo} and ${1:foo}');
        assertRewrite('$1 and $SELECTION and $foo', '$1 and ${SELECTION} and ${2:foo}');
        assertRewrite([
            'for (var ${index} = 0; ${index} < ${array}.length; ${index}++) {',
            '\tvar ${element} = ${array}[${index}];',
            '\t$0',
            '}',
        ].join('\n'), [
            'for (var ${1:index} = 0; ${1:index} < ${2:array}.length; ${1:index}++) {',
            '\tvar ${3:element} = ${2:array}[${1:index}];',
            '\t$0',
            '\\}',
        ].join('\n'));
    });
    test('Snippet choices: unable to escape comma and pipe, #31521', function () {
        assertRewrite('console.log(${1|not\\, not, five, 5, 1   23|});', false);
    });
    test('lazy bogous variable rewrite', function () {
        const snippet = new Snippet(false, ['fooLang'], 'foo', 'prefix', 'desc', 'This is ${bogous} because it is a ${var}', 'source', 3 /* SnippetSource.Extension */, generateUuid());
        assert.strictEqual(snippet.body, 'This is ${bogous} because it is a ${var}');
        assert.strictEqual(snippet.codeSnippet, 'This is ${1:bogous} because it is a ${2:var}');
        assert.strictEqual(snippet.isBogous, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZXdyaXRlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NuaXBwZXRzL3Rlc3QvYnJvd3Nlci9zbmlwcGV0c1Jld3JpdGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQWlCLE1BQU0sK0JBQStCLENBQUE7QUFFdEUsS0FBSyxDQUFDLGdCQUFnQixFQUFFO0lBQ3ZCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsU0FBUyxhQUFhLENBQUMsS0FBYSxFQUFFLFFBQTBCO1FBQy9ELE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUN6QixLQUFLLEVBQ0wsQ0FBQyxLQUFLLENBQUMsRUFDUCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEtBQUssRUFDTCxLQUFLLEVBQ0wsS0FBSyw4QkFFTCxZQUFZLEVBQUUsQ0FDZCxDQUFBO1FBQ0QsSUFBSSxPQUFPLFFBQVEsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFDL0IsYUFBYSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQixhQUFhLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFFeEMsYUFBYSxDQUFDLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3ZELGFBQWEsQ0FBQyw0QkFBNEIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFBO1FBRS9FLGFBQWEsQ0FDWjtZQUNDLGtFQUFrRTtZQUNsRSx3Q0FBd0M7WUFDeEMsTUFBTTtZQUNOLEdBQUc7U0FDSCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDWjtZQUNDLDBFQUEwRTtZQUMxRSw4Q0FBOEM7WUFDOUMsTUFBTTtZQUNOLEtBQUs7U0FDTCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDWixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMERBQTBELEVBQUU7UUFDaEUsYUFBYSxDQUFDLGlEQUFpRCxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3hFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhCQUE4QixFQUFFO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUMxQixLQUFLLEVBQ0wsQ0FBQyxTQUFTLENBQUMsRUFDWCxLQUFLLEVBQ0wsUUFBUSxFQUNSLE1BQU0sRUFDTiwwQ0FBMEMsRUFDMUMsUUFBUSxtQ0FFUixZQUFZLEVBQUUsQ0FDZCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLDBDQUEwQyxDQUFDLENBQUE7UUFDNUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLDhDQUE4QyxDQUFDLENBQUE7UUFDdkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzNDLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==