/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { UnicodeTextModelHighlighter, } from '../../../common/services/unicodeTextModelHighlighter.js';
import { createTextModel } from '../testTextModel.js';
suite('UnicodeTextModelHighlighter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function t(text, options) {
        const m = createTextModel(text);
        const r = UnicodeTextModelHighlighter.computeUnicodeHighlights(m, options);
        m.dispose();
        return {
            ...r,
            ranges: r.ranges.map((r) => Range.lift(r).toString()),
        };
    }
    test('computeUnicodeHighlights (#168068)', () => {
        assert.deepStrictEqual(t(`
	For å gi et eksempel
`, {
            allowedCodePoints: [],
            allowedLocales: [],
            ambiguousCharacters: true,
            invisibleCharacters: true,
            includeComments: false,
            includeStrings: false,
            nonBasicASCII: false,
        }), {
            ambiguousCharacterCount: 0,
            hasMore: false,
            invisibleCharacterCount: 4,
            nonBasicAsciiCharacterCount: 0,
            ranges: ['[2,5 -> 2,6]', '[2,7 -> 2,8]', '[2,10 -> 2,11]', '[2,13 -> 2,14]'],
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvdW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBRU4sMkJBQTJCLEdBQzNCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLENBQUMsQ0FBQyxJQUFZLEVBQUUsT0FBa0M7UUFDMUQsTUFBTSxDQUFDLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxHQUFHLDJCQUEyQixDQUFDLHdCQUF3QixDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMxRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFWCxPQUFPO1lBQ04sR0FBRyxDQUFDO1lBQ0osTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1NBQ3JELENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUNyQixDQUFDLENBQ0E7O0NBRUgsRUFDRztZQUNDLGlCQUFpQixFQUFFLEVBQUU7WUFDckIsY0FBYyxFQUFFLEVBQUU7WUFDbEIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGVBQWUsRUFBRSxLQUFLO1lBQ3RCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLGFBQWEsRUFBRSxLQUFLO1NBQ3BCLENBQ0QsRUFDRDtZQUNDLHVCQUF1QixFQUFFLENBQUM7WUFDMUIsT0FBTyxFQUFFLEtBQUs7WUFDZCx1QkFBdUIsRUFBRSxDQUFDO1lBQzFCLDJCQUEyQixFQUFFLENBQUM7WUFDOUIsTUFBTSxFQUFFLENBQUMsY0FBYyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQztTQUM1RSxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=