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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5pY29kZVRleHRNb2RlbEhpZ2hsaWdodGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy91bmljb2RlVGV4dE1vZGVsSGlnaGxpZ2h0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFFTiwyQkFBMkIsR0FDM0IsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsQ0FBQyxDQUFDLElBQVksRUFBRSxPQUFrQztRQUMxRCxNQUFNLENBQUMsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLEdBQUcsMkJBQTJCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVYLE9BQU87WUFDTixHQUFHLENBQUM7WUFDSixNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDckQsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLENBQUMsQ0FDQTs7Q0FFSCxFQUNHO1lBQ0MsaUJBQWlCLEVBQUUsRUFBRTtZQUNyQixjQUFjLEVBQUUsRUFBRTtZQUNsQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLEtBQUs7WUFDdEIsY0FBYyxFQUFFLEtBQUs7WUFDckIsYUFBYSxFQUFFLEtBQUs7U0FDcEIsQ0FDRCxFQUNEO1lBQ0MsdUJBQXVCLEVBQUUsQ0FBQztZQUMxQixPQUFPLEVBQUUsS0FBSztZQUNkLHVCQUF1QixFQUFFLENBQUM7WUFDMUIsMkJBQTJCLEVBQUUsQ0FBQztZQUM5QixNQUFNLEVBQUUsQ0FBQyxjQUFjLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDO1NBQzVFLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==