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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcldpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yV2lkZ2V0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFL0UsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsU0FBUyxTQUFTLENBQUMsT0FBMEI7WUFDNUMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsTUFBTSxDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZGLENBQUM7UUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFNBQVMsQ0FDUixlQUFlLENBQUMsU0FBUyxDQUN4QixDQUFDLElBQUksd0JBQXdCLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUM5RSxFQUFFLEVBQ0YsRUFBRSxFQUNGLENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FDRCxFQUNELEVBQUUsQ0FDRixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1lBQzVCLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQzlFLGlCQUFpQjthQUNqQixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDakMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsU0FBUyxDQUNSLGVBQWUsQ0FBQyxTQUFTLENBQ3hCLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ2hGLEdBQUcsRUFDSCxHQUFHLEVBQ0gsQ0FBQyxFQUNELENBQUMsQ0FDRCxDQUNELEVBQ0QsQ0FBQyxpQkFBaUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUMxQyxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1lBQzlCLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLFNBQVMsQ0FDUixlQUFlLENBQUMsU0FBUyxDQUN4QixDQUFDLElBQUksd0JBQXdCLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNuRixHQUFHLEVBQ0gsR0FBRyxFQUNILENBQUMsRUFDRCxDQUFDLENBQ0QsQ0FDRCxFQUNELENBQUMsaUJBQWlCLENBQUMsQ0FDbkIsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9