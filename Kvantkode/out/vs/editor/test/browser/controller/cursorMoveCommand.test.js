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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yTW92ZUNvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9jb250cm9sbGVyL2N1cnNvck1vdmVDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXpFLE9BQU8sRUFBbUIsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUUxRSxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsTUFBTSxJQUFJLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUM1RixJQUFJLENBQ0osQ0FBQTtJQUVELFNBQVMsV0FBVyxDQUFDLFFBQWlFO1FBQ3JGLGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbEQsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUM1QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxJQUFJLENBQUMseUNBQXlD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LEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdEIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUIsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN0QixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1QixNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1FBQ2xGLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxTQUFTLENBQUMsNkJBQTZCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdEUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRXBCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0ZBQWdGLEVBQUUsR0FBRyxFQUFFO1FBQzNGLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxTQUFTLENBQUMsNkJBQTZCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdEUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBRXBCLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdCLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1FBQzdELFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxTQUFTLENBQUMsNkJBQTZCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdEUsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkIsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV2QixXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdGQUF3RixFQUFFLEdBQUcsRUFBRTtRQUNuRyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDakMsU0FBUyxDQUFDLDZCQUE2QixHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXJFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDOUQsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyRSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3RUFBd0UsRUFBRSxHQUFHLEVBQUU7UUFDbkYsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyRSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QixZQUFZLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFdkIsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtRkFBbUYsRUFBRSxHQUFHLEVBQUU7UUFDOUYsV0FBVyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2pDLFNBQVMsQ0FBQyw2QkFBNkIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyRSxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxD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