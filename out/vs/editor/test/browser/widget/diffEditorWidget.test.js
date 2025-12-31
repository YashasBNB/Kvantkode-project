/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { UnchangedRegion } from '../../../browser/widget/diffEditor/diffEditorViewModel.js';
import { LineRange } from '../../../common/core/lineRange.js';
import { DetailedLineRangeMapping } from '../../../common/diff/rangeMapping.js';
suite('DiffEditorWidget2', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('UnchangedRegion', () => {
        function serialize(regions) {
            return regions.map((r) => `${r.originalUnchangedRange} - ${r.modifiedUnchangedRange}`);
        }
        test('Everything changed', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([new DetailedLineRangeMapping(new LineRange(1, 10), new LineRange(1, 10), [])], 10, 10, 3, 3)), []);
        });
        test('Nothing changed', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([], 10, 10, 3, 3)), [
                '[1,11) - [1,11)',
            ]);
        });
        test('Change in the middle', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([new DetailedLineRangeMapping(new LineRange(50, 60), new LineRange(50, 60), [])], 100, 100, 3, 3)), ['[1,47) - [1,47)', '[63,101) - [63,101)']);
        });
        test('Change at the end', () => {
            assert.deepStrictEqual(serialize(UnchangedRegion.fromDiffs([new DetailedLineRangeMapping(new LineRange(99, 100), new LineRange(100, 100), [])], 100, 100, 3, 3)), ['[1,96) - [1,96)']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcldpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvcldpZGdldC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDM0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9FLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQzdCLFNBQVMsU0FBUyxDQUFDLE9BQTBCO1lBQzVDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsc0JBQXNCLE1BQU0sQ0FBQyxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQTtRQUN2RixDQUFDO1FBRUQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtZQUMvQixNQUFNLENBQUMsZUFBZSxDQUNyQixTQUFTLENBQ1IsZUFBZSxDQUFDLFNBQVMsQ0FDeEIsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDOUUsRUFBRSxFQUNGLEVBQUUsRUFDRixDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQ0QsRUFDRCxFQUFFLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtZQUM1QixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUM5RSxpQkFBaUI7YUFDakIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFNBQVMsQ0FDUixlQUFlLENBQUMsU0FBUyxDQUN4QixDQUFDLElBQUksd0JBQXdCLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNoRixHQUFHLEVBQ0gsR0FBRyxFQUNILENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FDRCxFQUNELENBQUMsaUJBQWlCLEVBQUUscUJBQXFCLENBQUMsQ0FDMUMsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtZQUM5QixNQUFNLENBQUMsZUFBZSxDQUNyQixTQUFTLENBQ1IsZUFBZSxDQUFDLFNBQVMsQ0FDeEIsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDbkYsR0FBRyxFQUNILEdBQUcsRUFDSCxDQUFDLEVBQ0QsQ0FBQyxDQUNELENBQ0QsRUFDRCxDQUFDLGlCQUFpQixDQUFDLENBQ25CLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==