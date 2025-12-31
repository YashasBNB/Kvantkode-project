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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZXdyaXRlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy90ZXN0L2Jyb3dzZXIvc25pcHBldHNSZXdyaXRlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFpQixNQUFNLCtCQUErQixDQUFBO0FBRXRFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtJQUN2Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsYUFBYSxDQUFDLEtBQWEsRUFBRSxRQUEwQjtRQUMvRCxNQUFNLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FDekIsS0FBSyxFQUNMLENBQUMsS0FBSyxDQUFDLEVBQ1AsS0FBSyxFQUNMLEtBQUssRUFDTCxLQUFLLEVBQ0wsS0FBSyxFQUNMLEtBQUssOEJBRUwsWUFBWSxFQUFFLENBQ2QsQ0FBQTtRQUNELElBQUksT0FBTyxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQy9CLGFBQWEsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0IsYUFBYSxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRXhDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUN2RCxhQUFhLENBQUMsNEJBQTRCLEVBQUUsa0NBQWtDLENBQUMsQ0FBQTtRQUUvRSxhQUFhLENBQ1o7WUFDQyxrRUFBa0U7WUFDbEUsd0NBQXdDO1lBQ3hDLE1BQU07WUFDTixHQUFHO1NBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ1o7WUFDQywwRUFBMEU7WUFDMUUsOENBQThDO1lBQzlDLE1BQU07WUFDTixLQUFLO1NBQ0wsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ1osQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBEQUEwRCxFQUFFO1FBQ2hFLGFBQWEsQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN4RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRTtRQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FDMUIsS0FBSyxFQUNMLENBQUMsU0FBUyxDQUFDLEVBQ1gsS0FBSyxFQUNMLFFBQVEsRUFDUixNQUFNLEVBQ04sMENBQTBDLEVBQzFDLFFBQVEsbUNBRVIsWUFBWSxFQUFFLENBQ2QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSwwQ0FBMEMsQ0FBQyxDQUFBO1FBQzVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFBO1FBQ3ZGLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMzQyxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=