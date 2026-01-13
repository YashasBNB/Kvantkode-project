/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { getNonWhitespacePrefix } from '../../browser/snippetsService.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('getNonWhitespacePrefix', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertGetNonWhitespacePrefix(line, column, expected) {
        const model = {
            getLineContent: (lineNumber) => line,
        };
        const actual = getNonWhitespacePrefix(model, new Position(1, column));
        assert.strictEqual(actual, expected);
    }
    test('empty line', () => {
        assertGetNonWhitespacePrefix('', 1, '');
    });
    test('singleWordLine', () => {
        assertGetNonWhitespacePrefix('something', 1, '');
        assertGetNonWhitespacePrefix('something', 2, 's');
        assertGetNonWhitespacePrefix('something', 3, 'so');
        assertGetNonWhitespacePrefix('something', 4, 'som');
        assertGetNonWhitespacePrefix('something', 5, 'some');
        assertGetNonWhitespacePrefix('something', 6, 'somet');
        assertGetNonWhitespacePrefix('something', 7, 'someth');
        assertGetNonWhitespacePrefix('something', 8, 'somethi');
        assertGetNonWhitespacePrefix('something', 9, 'somethin');
        assertGetNonWhitespacePrefix('something', 10, 'something');
    });
    test('two word line', () => {
        assertGetNonWhitespacePrefix('something interesting', 1, '');
        assertGetNonWhitespacePrefix('something interesting', 2, 's');
        assertGetNonWhitespacePrefix('something interesting', 3, 'so');
        assertGetNonWhitespacePrefix('something interesting', 4, 'som');
        assertGetNonWhitespacePrefix('something interesting', 5, 'some');
        assertGetNonWhitespacePrefix('something interesting', 6, 'somet');
        assertGetNonWhitespacePrefix('something interesting', 7, 'someth');
        assertGetNonWhitespacePrefix('something interesting', 8, 'somethi');
        assertGetNonWhitespacePrefix('something interesting', 9, 'somethin');
        assertGetNonWhitespacePrefix('something interesting', 10, 'something');
        assertGetNonWhitespacePrefix('something interesting', 11, '');
        assertGetNonWhitespacePrefix('something interesting', 12, 'i');
        assertGetNonWhitespacePrefix('something interesting', 13, 'in');
        assertGetNonWhitespacePrefix('something interesting', 14, 'int');
        assertGetNonWhitespacePrefix('something interesting', 15, 'inte');
        assertGetNonWhitespacePrefix('something interesting', 16, 'inter');
        assertGetNonWhitespacePrefix('something interesting', 17, 'intere');
        assertGetNonWhitespacePrefix('something interesting', 18, 'interes');
        assertGetNonWhitespacePrefix('something interesting', 19, 'interest');
        assertGetNonWhitespacePrefix('something interesting', 20, 'interesti');
        assertGetNonWhitespacePrefix('something interesting', 21, 'interestin');
        assertGetNonWhitespacePrefix('something interesting', 22, 'interesting');
    });
    test('many separators', () => {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions?redirectlocale=en-US&redirectslug=JavaScript%2FGuide%2FRegular_Expressions#special-white-space
        // \s matches a single white space character, including space, tab, form feed, line feed.
        // Equivalent to [ \f\n\r\t\v\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff].
        assertGetNonWhitespacePrefix('something interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\tinteresting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\finteresting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\vinteresting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u00a0interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u2000interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u2028interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\u3000interesting', 22, 'interesting');
        assertGetNonWhitespacePrefix('something\ufeffinteresting', 22, 'interesting');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy90ZXN0L2Jyb3dzZXIvc25pcHBldHNSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUNwQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsNEJBQTRCLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxRQUFnQjtRQUNuRixNQUFNLEtBQUssR0FBRztZQUNiLGNBQWMsRUFBRSxDQUFDLFVBQWtCLEVBQUUsRUFBRSxDQUFDLElBQUk7U0FDNUMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDdkIsNEJBQTRCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFD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