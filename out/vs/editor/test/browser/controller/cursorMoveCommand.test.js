/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CoreNavigationCommands } from '../../../browser/coreCommands.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { CursorMove } from '../../../common/cursor/cursorMoveCommands.js';
import { withTestCodeEditor } from '../testCodeEditor.js';
suite('Cursor move command test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const TEXT = ['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'].join('\n');
    function executeTest(callback) {
        withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
            callback(editor, viewModel);
        });
    }
    test('move left should move to left character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveLeft(viewModel);
            cursorEqual(viewModel, 1, 7);
        });
    });
    test('move left should move to left by n characters', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveLeft(viewModel, 3);
            cursorEqual(viewModel, 1, 5);
        });
    });
    test('move left should move to left by half line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveLeft(viewModel, 1, CursorMove.RawUnit.HalfLine);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move left moves to previous line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 2, 3);
            moveLeft(viewModel, 10);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move right should move to right character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 5);
            moveRight(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move right should move to right by n characters', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 2);
            moveRight(viewModel, 6);
            cursorEqual(viewModel, 1, 8);
        });
    });
    test('move right should move to right by half line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 4);
            moveRight(viewModel, 1, CursorMove.RawUnit.HalfLine);
            cursorEqual(viewModel, 1, 14);
        });
    });
    test('move right moves to next line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveRight(viewModel, 100);
            cursorEqual(viewModel, 2, 1);
        });
    });
    test('move to first character of line from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineStart(viewModel);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move to first character of line from first non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 6);
            moveToLineStart(viewModel);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move to first character of line from first character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 1);
            moveToLineStart(viewModel);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move to first non white space character of line from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineFirstNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to first non white space character of line from first non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 6);
            moveToLineFirstNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to first non white space character of line from first character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 1);
            moveToLineFirstNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to end of line from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineEnd(viewModel);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to end of line from last non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 19);
            moveToLineEnd(viewModel);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to end of line from line end', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 21);
            moveToLineEnd(viewModel);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to last non white space character from middle', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineLastNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 19);
        });
    });
    test('move to last non white space character from last non white space character', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 19);
            moveToLineLastNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 19);
        });
    });
    test('move to last non white space character from line end', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 21);
            moveToLineLastNonWhitespaceCharacter(viewModel);
            cursorEqual(viewModel, 1, 19);
        });
    });
    test('move to center of line not from center', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 8);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move to center of line from center', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 11);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move to center of line from start', () => {
        executeTest((editor, viewModel) => {
            moveToLineStart(viewModel);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move to center of line from end', () => {
        executeTest((editor, viewModel) => {
            moveToLineEnd(viewModel);
            moveToLineCenter(viewModel);
            cursorEqual(viewModel, 1, 11);
        });
    });
    test('move up by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveUp(viewModel, 2);
            cursorEqual(viewModel, 1, 5);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move up by model line cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveUpByModelLine(viewModel, 2);
            cursorEqual(viewModel, 1, 5);
            moveUpByModelLine(viewModel, 1);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move down by model line cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveDownByModelLine(viewModel, 2);
            cursorEqual(viewModel, 5, 2);
            moveDownByModelLine(viewModel, 1);
            cursorEqual(viewModel, 5, 2);
        });
    });
    test('move up with selection by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 3, 5);
            cursorEqual(viewModel, 3, 5);
            moveUp(viewModel, 1, true);
            cursorEqual(viewModel, 2, 2, 3, 5);
            moveUp(viewModel, 1, true);
            cursorEqual(viewModel, 1, 5, 3, 5);
        });
    });
    test('move up and down with tabs by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 1, 5);
            cursorEqual(viewModel, 1, 5);
            moveDown(viewModel, 4);
            cursorEqual(viewModel, 5, 2);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 4, 1);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 3, 5);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 2, 2);
            moveUp(viewModel, 1);
            cursorEqual(viewModel, 1, 5);
        });
    });
    test('move up and down with end of lines starting from a long one by cursor move command', () => {
        executeTest((editor, viewModel) => {
            moveToEndOfLine(viewModel);
            cursorEqual(viewModel, 1, 21);
            moveToEndOfLine(viewModel);
            cursorEqual(viewModel, 1, 21);
            moveDown(viewModel, 2);
            cursorEqual(viewModel, 3, 17);
            moveDown(viewModel, 1);
            cursorEqual(viewModel, 4, 1);
            moveDown(viewModel, 1);
            cursorEqual(viewModel, 5, 2);
            moveUp(viewModel, 4);
            cursorEqual(viewModel, 1, 21);
        });
    });
    test('move to view top line moves to first visible line if it is first line', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 10, 1);
            moveTo(viewModel, 2, 2);
            moveToTop(viewModel);
            cursorEqual(viewModel, 1, 6);
        });
    });
    test('move to view top line moves to top visible line when first line is not visible', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(2, 1, 10, 1);
            moveTo(viewModel, 4, 1);
            moveToTop(viewModel);
            cursorEqual(viewModel, 2, 2);
        });
    });
    test('move to view top line moves to nth line from top', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 10, 1);
            moveTo(viewModel, 4, 1);
            moveToTop(viewModel, 3);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view top line moves to last line if n is greater than last visible line number', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 3, 1);
            moveTo(viewModel, 2, 2);
            moveToTop(viewModel, 4);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view center line moves to the center line', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(3, 1, 3, 1);
            moveTo(viewModel, 2, 2);
            moveToCenter(viewModel);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view bottom line moves to last visible line if it is last line', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 5, 1);
            moveTo(viewModel, 2, 2);
            moveToBottom(viewModel);
            cursorEqual(viewModel, 5, 1);
        });
    });
    test('move to view bottom line moves to last visible line when last line is not visible', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(2, 1, 3, 1);
            moveTo(viewModel, 2, 2);
            moveToBottom(viewModel);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view bottom line moves to nth line from bottom', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(1, 1, 5, 1);
            moveTo(viewModel, 4, 1);
            moveToBottom(viewModel, 3);
            cursorEqual(viewModel, 3, 5);
        });
    });
    test('move to view bottom line moves to first line if n is lesser than first visible line number', () => {
        executeTest((editor, viewModel) => {
            viewModel.getCompletelyVisibleViewRange = () => new Range(2, 1, 5, 1);
            moveTo(viewModel, 4, 1);
            moveToBottom(viewModel, 5);
            cursorEqual(viewModel, 2, 2);
        });
    });
});
suite('Cursor move by blankline test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const TEXT = [
        '    \tMy First Line\t ',
        '\tMy Second Line',
        '    Third Line🐶',
        '',
        '1',
        '2',
        '3',
        '',
        '         ',
        'a',
        'b',
    ].join('\n');
    function executeTest(callback) {
        withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
            callback(editor, viewModel);
        });
    }
    test('move down should move to start of next blank line', () => {
        executeTest((editor, viewModel) => {
            moveDownByBlankLine(viewModel, false);
            cursorEqual(viewModel, 4, 1);
        });
    });
    test('move up should move to start of previous blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 7, 1);
            moveUpByBlankLine(viewModel, false);
            cursorEqual(viewModel, 4, 1);
        });
    });
    test('move down should skip over whitespace if already on blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 8, 1);
            moveDownByBlankLine(viewModel, false);
            cursorEqual(viewModel, 11, 1);
        });
    });
    test('move up should skip over whitespace if already on blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 9, 1);
            moveUpByBlankLine(viewModel, false);
            cursorEqual(viewModel, 4, 1);
        });
    });
    test('move up should go to first column of first line if not empty', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 2, 1);
            moveUpByBlankLine(viewModel, false);
            cursorEqual(viewModel, 1, 1);
        });
    });
    test('move down should go to first column of last line if not empty', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 10, 1);
            moveDownByBlankLine(viewModel, false);
            cursorEqual(viewModel, 11, 1);
        });
    });
    test('select down should select to start of next blank line', () => {
        executeTest((editor, viewModel) => {
            moveDownByBlankLine(viewModel, true);
            selectionEqual(viewModel.getSelection(), 4, 1, 1, 1);
        });
    });
    test('select up should select to start of previous blank line', () => {
        executeTest((editor, viewModel) => {
            moveTo(viewModel, 7, 1);
            moveUpByBlankLine(viewModel, true);
            selectionEqual(viewModel.getSelection(), 4, 1, 7, 1);
        });
    });
});
// Move command
function move(viewModel, args) {
    CoreNavigationCommands.CursorMove.runCoreEditorCommand(viewModel, args);
}
function moveToLineStart(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineStart });
}
function moveToLineFirstNonWhitespaceCharacter(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineFirstNonWhitespaceCharacter });
}
function moveToLineCenter(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineColumnCenter });
}
function moveToLineEnd(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineEnd });
}
function moveToLineLastNonWhitespaceCharacter(viewModel) {
    move(viewModel, { to: CursorMove.RawDirection.WrappedLineLastNonWhitespaceCharacter });
}
function moveLeft(viewModel, value, by, select) {
    move(viewModel, { to: CursorMove.RawDirection.Left, by: by, value: value, select: select });
}
function moveRight(viewModel, value, by, select) {
    move(viewModel, { to: CursorMove.RawDirection.Right, by: by, value: value, select: select });
}
function moveUp(viewModel, noOfLines = 1, select) {
    move(viewModel, {
        to: CursorMove.RawDirection.Up,
        by: CursorMove.RawUnit.WrappedLine,
        value: noOfLines,
        select: select,
    });
}
function moveUpByBlankLine(viewModel, select) {
    move(viewModel, {
        to: CursorMove.RawDirection.PrevBlankLine,
        by: CursorMove.RawUnit.WrappedLine,
        select: select,
    });
}
function moveUpByModelLine(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.Up, value: noOfLines, select: select });
}
function moveDown(viewModel, noOfLines = 1, select) {
    move(viewModel, {
        to: CursorMove.RawDirection.Down,
        by: CursorMove.RawUnit.WrappedLine,
        value: noOfLines,
        select: select,
    });
}
function moveDownByBlankLine(viewModel, select) {
    move(viewModel, {
        to: CursorMove.RawDirection.NextBlankLine,
        by: CursorMove.RawUnit.WrappedLine,
        select: select,
    });
}
function moveDownByModelLine(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.Down, value: noOfLines, select: select });
}
function moveToTop(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.ViewPortTop, value: noOfLines, select: select });
}
function moveToCenter(viewModel, select) {
    move(viewModel, { to: CursorMove.RawDirection.ViewPortCenter, select: select });
}
function moveToBottom(viewModel, noOfLines = 1, select) {
    move(viewModel, { to: CursorMove.RawDirection.ViewPortBottom, value: noOfLines, select: select });
}
function cursorEqual(viewModel, posLineNumber, posColumn, selLineNumber = posLineNumber, selColumn = posColumn) {
    positionEqual(viewModel.getPosition(), posLineNumber, posColumn);
    selectionEqual(viewModel.getSelection(), posLineNumber, posColumn, selLineNumber, selColumn);
}
function positionEqual(position, lineNumber, column) {
    assert.deepStrictEqual(position, new Position(lineNumber, column), 'position equal');
}
function selectionEqual(selection, posLineNumber, posColumn, selLineNumber, selColumn) {
    assert.deepStrictEqual({
        selectionStartLineNumber: selection.selectionStartLineNumber,
        selectionStartColumn: selection.selectionStartColumn,
        positionLineNumber: selection.positionLineNumber,
        positionColumn: selection.positionColumn,
    }, {
        selectionStartLineNumber: selLineNumber,
        selectionStartColumn: selColumn,
        positionLineNumber: posLineNumber,
        positionColumn: posColumn,
    }, 'selection equal');
}
function moveTo(viewModel, lineNumber, column, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.MoveToSelect.runCoreEditorCommand(viewModel, {
            position: new Position(lineNumber, column),
        });
    }
    else {
        CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
            position: new Position(lineNumber, column),
        });
    }
}
function moveToEndOfLine(viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorEndSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorEnd.runCoreEditorCommand(viewModel, {});
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29udHJvbGxlci9jdXJzb3JNb3ZlQ29tbWFuZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV6RSxPQUFPLEVBQW1CLGtCQUFrQixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFMUUsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sSUFBSSxHQUFHLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FDNUYsSUFBSSxDQUNKLENBQUE7SUFFRCxTQUFTLFdBQVcsQ0FBQyxRQUFpRTtRQUNyRixrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2xELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ25CLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1FBQzFELFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ25ELFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsR0FBRyxFQUFFO1FBQzdDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixRQUFRLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO1FBQ3RELFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixTQUFTLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDcEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDNUQsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDekQsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDekIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEdBQUcsRUFBRTtRQUNqRixXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0RBQXNELEVBQUUsR0FBRyxFQUFFO1FBQ2pFLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDMUIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2REFBNkQsRUFBRSxHQUFHLEVBQUU7UUFDeEUsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLHFDQUFxQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hELFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0ZBQXNGLEVBQUUsR0FBRyxFQUFFO1FBQ2pHLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixxQ0FBcUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNoRCxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNFQUFzRSxFQUFFLEdBQUcsRUFBRTtRQUNqRixXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIscUNBQXFDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDaEQsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN4QixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEdBQUcsRUFBRTtRQUNwRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDeEIsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3hCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4QixhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDeEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFDL0QsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLG9DQUFvQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQy9DLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEVBQTRFLEVBQUUsR0FBRyxFQUFFO1FBQ3ZGLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4QixvQ0FBb0MsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMvQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNEQUFzRCxFQUFFLEdBQUcsRUFBRTtRQUNqRSxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDeEIsb0NBQW9DLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDL0MsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDbkQsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4QixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMzQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUM5QyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzFCLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzVDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDeEIsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDM0IsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDOUIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsaUJBQWlCLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9CLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVCLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtRQUN4RCxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsbUJBQW1CLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVCLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtRQUMxRCxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDMUIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVsQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzlELFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1QixRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1QixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVCLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvRkFBb0YsRUFBRSxHQUFHLEVBQUU7UUFDL0YsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMxQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUU3QixlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDMUIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFFN0IsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN0QixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUU3QixRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3RCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVCLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEdBQUcsRUFBRTtRQUNsRixXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsU0FBUyxDQUFDLDZCQUE2QixHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXRFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUVwQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdGQUFnRixFQUFFLEdBQUcsRUFBRTtRQUMzRixXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsU0FBUyxDQUFDLDZCQUE2QixHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXRFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUVwQixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEdBQUcsRUFBRTtRQUM3RCxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsU0FBUyxDQUFDLDZCQUE2QixHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXRFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3RkFBd0YsRUFBRSxHQUFHLEVBQUU7UUFDbkcsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyRSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXZCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbURBQW1ELEVBQUUsR0FBRyxFQUFFO1FBQzlELFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxTQUFTLENBQUMsNkJBQTZCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFckUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRXZCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0VBQXdFLEVBQUUsR0FBRyxFQUFFO1FBQ25GLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxTQUFTLENBQUMsNkJBQTZCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFckUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRXZCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUZBQW1GLEVBQUUsR0FBRyxFQUFFO1FBQzlGLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxTQUFTLENBQUMsNkJBQTZCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFckUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsWUFB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