/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { SortLinesCommand } from '../../browser/sortLinesCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
function testSortLinesAscendingCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new SortLinesCommand(sel, false), expectedLines, expectedSelection);
}
function testSortLinesDescendingCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new SortLinesCommand(sel, true), expectedLines, expectedSelection);
}
suite('Editor Contrib - Sort Lines Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('no op unless at least two lines selected 1', function () {
        testSortLinesAscendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 1, 1), ['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 1, 1));
    });
    test('no op unless at least two lines selected 2', function () {
        testSortLinesAscendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 2, 1), ['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 3, 2, 1));
    });
    test('sorting two lines ascending', function () {
        testSortLinesAscendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(3, 3, 4, 2), ['first', 'second line', 'fourth line', 'third line', 'fifth'], new Selection(3, 3, 4, 1));
    });
    test('sorting first 4 lines ascending', function () {
        testSortLinesAscendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 5, 1), ['first', 'fourth line', 'second line', 'third line', 'fifth'], new Selection(1, 1, 5, 1));
    });
    test('sorting all lines ascending', function () {
        testSortLinesAscendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 5, 6), ['fifth', 'first', 'fourth line', 'second line', 'third line'], new Selection(1, 1, 5, 11));
    });
    test('sorting first 4 lines descending', function () {
        testSortLinesDescendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 5, 1), ['third line', 'second line', 'fourth line', 'first', 'fifth'], new Selection(1, 1, 5, 1));
    });
    test('sorting all lines descending', function () {
        testSortLinesDescendingCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 1, 5, 6), ['third line', 'second line', 'fourth line', 'first', 'fifth'], new Selection(1, 1, 5, 6));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ydExpbmVzQ29tbWFuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGluZXNPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci9zb3J0TGluZXNDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVyRSxTQUFTLDZCQUE2QixDQUNyQyxLQUFlLEVBQ2YsU0FBb0IsRUFDcEIsYUFBdUIsRUFDdkIsaUJBQTRCO0lBRTVCLFdBQVcsQ0FDVixLQUFLLEVBQ0wsSUFBSSxFQUNKLFNBQVMsRUFDVCxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUNuRCxhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyw4QkFBOEIsQ0FDdEMsS0FBZSxFQUNmLFNBQW9CLEVBQ3BCLGFBQXVCLEVBQ3ZCLGlCQUE0QjtJQUU1QixXQUFXLENBQ1YsS0FBSyxFQUNMLElBQUksRUFDSixTQUFTLEVBQ1QsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFDbEQsYUFBYSxFQUNiLGlCQUFpQixDQUNqQixDQUFBO0FBQ0YsQ0FBQztBQUVELEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFD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