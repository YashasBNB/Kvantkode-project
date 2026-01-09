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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUNhcnJldENvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY2FyZXRPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci9tb3ZlQ2FycmV0Q29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFckUsU0FBUyx3QkFBd0IsQ0FDaEMsS0FBZSxFQUNmLFNBQW9CLEVBQ3BCLGFBQXVCLEVBQ3ZCLGlCQUE0QjtJQUU1QixXQUFXLENBQ1YsS0FBSyxFQUNMLElBQUksRUFDSixTQUFTLEVBQ1QsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFDbEQsYUFBYSxFQUNiLGlCQUFpQixDQUNqQixDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMseUJBQXlCLENBQ2pDLEtBQWUsRUFDZixTQUFvQixFQUNwQixhQUF1QixFQUN2QixpQkFBNEI7SUFFNUIsV0FBVyxDQUNWLEtBQUssRUFDTCxJQUFJLEVBQ0osU0FBUyxFQUNULENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQ25ELGFBQWEsRUFDYixpQkFBaUIsQ0FDakIsQ0FBQTtBQUNGLENBQUM7QUFFRCxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1FBQzlCLHdCQUF3QixDQUN2QixDQUFDLFFBQVEsQ0FBQyxFQUNWLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFFBQVEsQ0FBQyxFQUNWLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFDL0IseUJBQXlCLENBQ3hCLENBQUMsUUFBUSxDQUFDLEVBQ1YsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCLENBQUMsUUFBUSxDQUFDLEVBQ1YsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyx3REFBd0QsRUFBRTtRQUM5RCx3QkFBd0IsQ0FDdkIsQ0FBQyxRQUFRLENBQUMsRUFDVixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekIsQ0FBQyxRQUFRLENBQUMsRUFDVixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLHdEQUF3RCxFQUFFO1FBQzlELHlCQUF5QixDQUN4QixDQUFDLFFBQVEsQ0FBQyxFQUNWLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QixDQUFDLFFBQVEsQ0FBQyxFQUNWLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9