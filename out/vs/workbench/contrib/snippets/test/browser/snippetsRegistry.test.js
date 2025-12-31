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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25pcHBldHNSZWdpc3RyeS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc25pcHBldHMvdGVzdC9icm93c2VyL3NuaXBwZXRzUmVnaXN0cnkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDcEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLDRCQUE0QixDQUFDLElBQVksRUFBRSxNQUFjLEVBQUUsUUFBZ0I7UUFDbkYsTUFBTSxLQUFLLEdBQUc7WUFDYixjQUFjLEVBQUUsQ0FBQyxVQUFrQixFQUFFLEVBQUUsQ0FBQyxJQUFJO1NBQzVDLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBQ3ZCLDRCQUE0QixDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzNCLDRCQUE0QixDQUFDLFdBQVcsRUFB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