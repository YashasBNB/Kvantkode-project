/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { MoveCaretCommand } from '../../browser/moveCaretCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
function testMoveCaretLeftCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new MoveCaretCommand(sel, true), expectedLines, expectedSelection);
}
function testMoveCaretRightCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new MoveCaretCommand(sel, false), expectedLines, expectedSelection);
}
suite('Editor Contrib - Move Caret Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('move selection to left', function () {
        testMoveCaretLeftCommand(['012345'], new Selection(1, 3, 1, 5), ['023145'], new Selection(1, 2, 1, 4));
    });
    test('move selection to right', function () {
        testMoveCaretRightCommand(['012345'], new Selection(1, 3, 1, 5), ['014235'], new Selection(1, 4, 1, 6));
    });
    test('move selection to left - from first column - no change', function () {
        testMoveCaretLeftCommand(['012345'], new Selection(1, 1, 1, 1), ['012345'], new Selection(1, 1, 1, 1));
    });
    test('move selection to right - from last column - no change', function () {
        testMoveCaretRightCommand(['012345'], new Selection(1, 5, 1, 7), ['012345'], new Selection(1, 5, 1, 7));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUNhcnJldENvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NhcmV0T3BlcmF0aW9ucy90ZXN0L2Jyb3dzZXIvbW92ZUNhcnJldENvbW1hbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXJFLFNBQVMsd0JBQXdCLENBQ2hDLEtBQWUsRUFDZixTQUFvQixFQUNwQixhQUF1QixFQUN2QixpQkFBNEI7SUFFNUIsV0FBVyxDQUNWLEtBQUssRUFDTCxJQUFJLEVBQ0osU0FBUyxFQUNULENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQ2xELGFBQWEsRUFDYixpQkFBaUIsQ0FDakIsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUNqQyxLQUFlLEVBQ2YsU0FBb0IsRUFDcEIsYUFBdUIsRUFDdkIsaUJBQTRCO0lBRTVCLFdBQVcsQ0FDVixLQUFLLEVBQ0wsSUFBSSxFQUNKLFNBQVMsRUFDVCxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUNuRCxhQUFhLEVBQ2IsaUJBQWlCLENBQ2pCLENBQUE7QUFDRixDQUFDO0FBRUQsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtRQUM5Qix3QkFBd0IsQ0FDdkIsQ0FBQyxRQUFRLENBQUMsRUFDVixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxRQUFRLENBQUMsRUFDVixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQy9CLHlCQUF5QixDQUN4QixDQUFDLFFBQVEsQ0FBQyxFQUNWLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFFBQVEsQ0FBQyxFQUNWLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsd0RBQXdELEVBQUU7UUFDOUQsd0JBQXdCLENBQ3ZCLENBQUMsUUFBUSxDQUFDLEVBQ1YsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsUUFBUSxDQUFDLEVBQ1YsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyx3REFBd0QsRUFBRTtRQUM5RCx5QkFBeUIsQ0FDeEIsQ0FBQyxRQUFRLENBQUMsRUFDVixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxRQUFRLENBQUMsRUFDVixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==