/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../browser/coreCommands.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { IndentAction } from '../../../common/languages/languageConfiguration.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { TextModel } from '../../../common/model/textModel.js';
import { createCodeEditorServices, instantiateTestCodeEditor, withTestCodeEditor, } from '../testCodeEditor.js';
import { createTextModel, instantiateTextModel, } from '../../common/testTextModel.js';
import { InputMode } from '../../../common/inputMode.js';
// --------- utils
function moveTo(editor, viewModel, lineNumber, column, inSelectionMode = false) {
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
function moveLeft(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorLeftSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorLeft.runCoreEditorCommand(viewModel, {});
    }
}
function moveRight(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorRightSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorRight.runCoreEditorCommand(viewModel, {});
    }
}
function moveDown(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorDownSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorDown.runCoreEditorCommand(viewModel, {});
    }
}
function moveUp(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorUpSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorUp.runCoreEditorCommand(viewModel, {});
    }
}
function moveToBeginningOfLine(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorHomeSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorHome.runCoreEditorCommand(viewModel, {});
    }
}
function moveToEndOfLine(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorEndSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorEnd.runCoreEditorCommand(viewModel, {});
    }
}
function moveToBeginningOfBuffer(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorTopSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorTop.runCoreEditorCommand(viewModel, {});
    }
}
function moveToEndOfBuffer(editor, viewModel, inSelectionMode = false) {
    if (inSelectionMode) {
        CoreNavigationCommands.CursorBottomSelect.runCoreEditorCommand(viewModel, {});
    }
    else {
        CoreNavigationCommands.CursorBottom.runCoreEditorCommand(viewModel, {});
    }
}
function assertCursor(viewModel, what) {
    let selections;
    if (what instanceof Position) {
        selections = [new Selection(what.lineNumber, what.column, what.lineNumber, what.column)];
    }
    else if (what instanceof Selection) {
        selections = [what];
    }
    else {
        selections = what;
    }
    const actual = viewModel.getSelections().map((s) => s.toString());
    const expected = selections.map((s) => s.toString());
    assert.deepStrictEqual(actual, expected);
}
suite('Editor Controller - Cursor', () => {
    const LINE1 = '    \tMy First Line\t ';
    const LINE2 = '\tMy Second Line';
    const LINE3 = '    Third Line🐶';
    const LINE4 = '';
    const LINE5 = '1';
    const TEXT = LINE1 + '\r\n' + LINE2 + '\n' + LINE3 + '\n' + LINE4 + '\r\n' + LINE5;
    function runTest(callback) {
        withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
            callback(editor, viewModel);
        });
    }
    ensureNoDisposablesAreLeakedInTestSuite();
    test('cursor initialized', () => {
        runTest((editor, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    // --------- absolute move
    test('no move', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2);
            assertCursor(viewModel, new Position(1, 2));
        });
    });
    test('move in selection mode', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2, true);
            assertCursor(viewModel, new Selection(1, 1, 1, 2));
        });
    });
    test('move beyond line end', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 25);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move empty line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 4, 20);
            assertCursor(viewModel, new Position(4, 1));
        });
    });
    test('move one char line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 20);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    test('selection down', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1, true);
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
        });
    });
    test('move and then select', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 3);
            assertCursor(viewModel, new Position(2, 3));
            moveTo(editor, viewModel, 2, 15, true);
            assertCursor(viewModel, new Selection(2, 3, 2, 15));
            moveTo(editor, viewModel, 1, 2, true);
            assertCursor(viewModel, new Selection(2, 3, 1, 2));
        });
    });
    // --------- move left
    test('move left on top left position', () => {
        runTest((editor, viewModel) => {
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move left', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            assertCursor(viewModel, new Position(1, 3));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(1, 2));
        });
    });
    test('move left with surrogate pair', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 17);
            assertCursor(viewModel, new Position(3, 17));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(3, 15));
        });
    });
    test('move left goes to previous row', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            assertCursor(viewModel, new Position(2, 1));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(1, 21));
        });
    });
    test('move left selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            assertCursor(viewModel, new Position(2, 1));
            moveLeft(editor, viewModel, true);
            assertCursor(viewModel, new Selection(2, 1, 1, 21));
        });
    });
    // --------- move right
    test('move right on bottom right position', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 2);
            assertCursor(viewModel, new Position(5, 2));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    test('move right', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            assertCursor(viewModel, new Position(1, 3));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(1, 4));
        });
    });
    test('move right with surrogate pair', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 15);
            assertCursor(viewModel, new Position(3, 15));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(3, 17));
        });
    });
    test('move right goes to next row', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 21);
            assertCursor(viewModel, new Position(1, 21));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
        });
    });
    test('move right selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 21);
            assertCursor(viewModel, new Position(1, 21));
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 21, 2, 1));
        });
    });
    // --------- move down
    test('move down', () => {
        runTest((editor, viewModel) => {
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    test('move down with selection', () => {
        runTest((editor, viewModel) => {
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 3, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 4, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 5, 1));
            moveDown(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 1, 5, 2));
        });
    });
    test('move down with tabs', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            assertCursor(viewModel, new Position(1, 5));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, 5));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
        });
    });
    // --------- move up
    test('move up', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 5);
            assertCursor(viewModel, new Position(3, 5));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 5));
        });
    });
    test('move up with selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 5);
            assertCursor(viewModel, new Position(3, 5));
            moveUp(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 5, 2, 2));
            moveUp(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 5, 1, 5));
        });
    });
    test('move up and down with tabs', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            assertCursor(viewModel, new Position(1, 5));
            moveDown(editor, viewModel);
            moveDown(editor, viewModel);
            moveDown(editor, viewModel);
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(3, 5));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 5));
        });
    });
    test('move up and down with end of lines starting from a long one', () => {
        runTest((editor, viewModel) => {
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, LINE2.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, LINE3.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(4, LINE4.length + 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
            moveUp(editor, viewModel);
            moveUp(editor, viewModel);
            moveUp(editor, viewModel);
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('issue #44465: cursor position not correct when move', () => {
        runTest((editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            // going once up on the first line remembers the offset visual columns
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 2));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 5));
            // going twice up on the first line discards the offset visual columns
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
        });
    });
    test('issue #144041: Cursor up/down works', () => {
        const model = createTextModel(['Word1 Word2 Word3 Word4', 'Word5 Word6 Word7 Word8'].join('\n'));
        withTestCodeEditor(model, { wrappingIndent: 'indent', wordWrap: 'wordWrapColumn', wordWrapColumn: 20 }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            const cursorPositions = [];
            function reportCursorPosition() {
                cursorPositions.push(viewModel.getCursorStates()[0].viewState.position.toString());
            }
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            assert.deepStrictEqual(cursorPositions, [
                '(1,1)',
                '(2,5)',
                '(3,1)',
                '(4,5)',
                '(4,10)',
                '(3,1)',
                '(2,5)',
                '(1,1)',
                '(1,1)',
            ]);
        });
        model.dispose();
    });
    test('issue #140195: Cursor up/down makes progress', () => {
        const model = createTextModel(['Word1 Word2 Word3 Word4', 'Word5 Word6 Word7 Word8'].join('\n'));
        withTestCodeEditor(model, { wrappingIndent: 'indent', wordWrap: 'wordWrapColumn', wordWrapColumn: 20 }, (editor, viewModel) => {
            editor.changeDecorations((changeAccessor) => {
                changeAccessor.deltaDecorations([], [
                    {
                        range: new Range(1, 22, 1, 22),
                        options: {
                            showIfCollapsed: true,
                            description: 'test',
                            after: {
                                content: 'some very very very very very very very very long text',
                            },
                        },
                    },
                ]);
            });
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            const cursorPositions = [];
            function reportCursorPosition() {
                cursorPositions.push(viewModel.getCursorStates()[0].viewState.position.toString());
            }
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorDown.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            CoreNavigationCommands.CursorUp.runEditorCommand(null, editor, null);
            reportCursorPosition();
            assert.deepStrictEqual(cursorPositions, [
                '(1,1)',
                '(2,5)',
                '(5,19)',
                '(6,1)',
                '(7,5)',
                '(6,1)',
                '(2,8)',
                '(1,1)',
                '(1,1)',
            ]);
        });
        model.dispose();
    });
    // --------- move to beginning of line
    test('move to beginning of line', () => {
        runTest((editor, viewModel) => {
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 6));
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of line from within line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 6));
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of line from whitespace at beginning of line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2);
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 6));
            moveToBeginningOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of line from within line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveToBeginningOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 8, 1, 6));
            moveToBeginningOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 8, 1, 1));
        });
    });
    test('move to beginning of line with selection multiline forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('move to beginning of line with selection multiline backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 1, 8, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
        });
    });
    test('move to beginning of line with selection single line forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 2);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('move to beginning of line with selection single line backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 3, 2, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test('issue #15401: "End" key is behaving weird when text is selected part 1', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 5, 3, 5));
        });
    });
    test("issue #17011: Shift+home/end now go to the end of the selection start's line, not the selection's end", () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 8);
            moveTo(editor, viewModel, 3, 9, true);
            moveToBeginningOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 8, 3, 5));
        });
    });
    // --------- move to end of line
    test('move to end of line', () => {
        runTest((editor, viewModel) => {
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move to end of line from within line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 6);
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move to end of line from whitespace at end of line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 20);
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel);
            assertCursor(viewModel, new Position(1, LINE1.length + 1));
        });
    });
    test('move to end of line from within line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 6);
            moveToEndOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 6, 1, LINE1.length + 1));
            moveToEndOfLine(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 6, 1, LINE1.length + 1));
        });
    });
    test('move to end of line with selection multiline forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1);
            moveTo(editor, viewModel, 3, 9, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    test('move to end of line with selection multiline backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 1, 1, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(1, 21, 1, 21));
        });
    });
    test('move to end of line with selection single line forward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 1);
            moveTo(editor, viewModel, 3, 9, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    test('move to end of line with selection single line backward', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 9);
            moveTo(editor, viewModel, 3, 1, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    test('issue #15401: "End" key is behaving weird when text is selected part 2', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1);
            moveTo(editor, viewModel, 3, 9, true);
            moveToEndOfLine(editor, viewModel, false);
            assertCursor(viewModel, new Selection(3, 17, 3, 17));
        });
    });
    // --------- move to beginning of buffer
    test('move to beginning of buffer', () => {
        runTest((editor, viewModel) => {
            moveToBeginningOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of buffer from within first line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            moveToBeginningOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of buffer from within another line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToBeginningOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('move to beginning of buffer from within first line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 1, 3);
            moveToBeginningOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(1, 3, 1, 1));
        });
    });
    test('move to beginning of buffer from within another line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToBeginningOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 3, 1, 1));
        });
    });
    // --------- move to end of buffer
    test('move to end of buffer', () => {
        runTest((editor, viewModel) => {
            moveToEndOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within last line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 1);
            moveToEndOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within another line', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToEndOfBuffer(editor, viewModel);
            assertCursor(viewModel, new Position(5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within last line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 5, 1);
            moveToEndOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(5, 1, 5, LINE5.length + 1));
        });
    });
    test('move to end of buffer from within another line selection', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            moveToEndOfBuffer(editor, viewModel, true);
            assertCursor(viewModel, new Selection(3, 3, 5, LINE5.length + 1));
        });
    });
    // --------- misc
    test('select all', () => {
        runTest((editor, viewModel) => {
            CoreNavigationCommands.SelectAll.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, new Selection(1, 1, 5, LINE5.length + 1));
        });
    });
    // --------- eventing
    test("no move doesn't trigger event", () => {
        runTest((editor, viewModel) => {
            const disposable = viewModel.onEvent((e) => {
                assert.ok(false, 'was not expecting event');
            });
            moveTo(editor, viewModel, 1, 1);
            disposable.dispose();
        });
    });
    test('move eventing', () => {
        runTest((editor, viewModel) => {
            let events = 0;
            const disposable = viewModel.onEvent((e) => {
                if (e.kind === 7 /* OutgoingViewModelEventKind.CursorStateChanged */) {
                    events++;
                    assert.deepStrictEqual(e.selections, [new Selection(1, 2, 1, 2)]);
                }
            });
            moveTo(editor, viewModel, 1, 2);
            assert.strictEqual(events, 1, 'receives 1 event');
            disposable.dispose();
        });
    });
    test('move in selection mode eventing', () => {
        runTest((editor, viewModel) => {
            let events = 0;
            const disposable = viewModel.onEvent((e) => {
                if (e.kind === 7 /* OutgoingViewModelEventKind.CursorStateChanged */) {
                    events++;
                    assert.deepStrictEqual(e.selections, [new Selection(1, 1, 1, 2)]);
                }
            });
            moveTo(editor, viewModel, 1, 2, true);
            assert.strictEqual(events, 1, 'receives 1 event');
            disposable.dispose();
        });
    });
    // --------- state save & restore
    test('saveState & restoreState', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 1, true);
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
            const savedState = JSON.stringify(viewModel.saveCursorState());
            moveTo(editor, viewModel, 1, 1, false);
            assertCursor(viewModel, new Position(1, 1));
            viewModel.restoreCursorState(JSON.parse(savedState));
            assertCursor(viewModel, new Selection(1, 1, 2, 1));
        });
    });
    // --------- updating cursor
    test('Independent model edit 1', () => {
        runTest((editor, viewModel) => {
            moveTo(editor, viewModel, 2, 16, true);
            editor.getModel().applyEdits([EditOperation.delete(new Range(2, 1, 2, 2))]);
            assertCursor(viewModel, new Selection(1, 1, 2, 15));
        });
    });
    test('column select 1', () => {
        withTestCodeEditor([
            '\tprivate compute(a:number): boolean {',
            '\t\tif (a + 3 === 0 || a + 5 === 0) {',
            '\t\t\treturn false;',
            '\t\t}',
            '\t}',
        ], {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Position(1, 7));
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(4, 4),
                viewPosition: new Position(4, 4),
                mouseColumn: 15,
                doColumnSelect: true,
            });
            const expectedSelections = [
                new Selection(1, 7, 1, 12),
                new Selection(2, 4, 2, 9),
                new Selection(3, 3, 3, 6),
                new Selection(4, 4, 4, 4),
            ];
            assertCursor(viewModel, expectedSelections);
        });
    });
    test('grapheme breaking', () => {
        withTestCodeEditor(['abcabc', 'ãããããã', '辻󠄀辻󠄀辻󠄀', 'பு'], {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 1, 2, 1)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(2, 3));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(2, 1));
            viewModel.setSelections('test', [new Selection(3, 1, 3, 1)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(3, 4));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(3, 1));
            viewModel.setSelections('test', [new Selection(4, 1, 4, 1)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Position(4, 3));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Position(4, 1));
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(2, 5));
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Position(3, 4));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(2, 5));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Position(1, 3));
        });
    });
    test('issue #4905 - column select is biased to the right', () => {
        withTestCodeEditor([
            'var gulp = require("gulp");',
            'var path = require("path");',
            'var rimraf = require("rimraf");',
            'var isarray = require("isarray");',
            'var merge = require("merge-stream");',
            'var concat = require("gulp-concat");',
            'var newer = require("gulp-newer");',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 4, false);
            assertCursor(viewModel, new Position(1, 4));
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(4, 1),
                viewPosition: new Position(4, 1),
                mouseColumn: 1,
                doColumnSelect: true,
            });
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 1),
                new Selection(2, 4, 2, 1),
                new Selection(3, 4, 3, 1),
                new Selection(4, 4, 4, 1),
            ]);
        });
    });
    test('issue #20087: column select with mouse', () => {
        withTestCodeEditor([
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" Key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SoMEKEy" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" valuE="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="00X"/>',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 10, 10, false);
            assertCursor(viewModel, new Position(10, 10));
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(1, 1),
                viewPosition: new Position(1, 1),
                mouseColumn: 1,
                doColumnSelect: true,
            });
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 1),
                new Selection(9, 10, 9, 1),
                new Selection(8, 10, 8, 1),
                new Selection(7, 10, 7, 1),
                new Selection(6, 10, 6, 1),
                new Selection(5, 10, 5, 1),
                new Selection(4, 10, 4, 1),
                new Selection(3, 10, 3, 1),
                new Selection(2, 10, 2, 1),
                new Selection(1, 10, 1, 1),
            ]);
            CoreNavigationCommands.ColumnSelect.runCoreEditorCommand(viewModel, {
                position: new Position(1, 1),
                viewPosition: new Position(1, 1),
                mouseColumn: 1,
                doColumnSelect: true,
            });
            assertCursor(viewModel, [
                new Selection(10, 10, 10, 1),
                new Selection(9, 10, 9, 1),
                new Selection(8, 10, 8, 1),
                new Selection(7, 10, 7, 1),
                new Selection(6, 10, 6, 1),
                new Selection(5, 10, 5, 1),
                new Selection(4, 10, 4, 1),
                new Selection(3, 10, 3, 1),
                new Selection(2, 10, 2, 1),
                new Selection(1, 10, 1, 1),
            ]);
        });
    });
    test('issue #20087: column select with keyboard', () => {
        withTestCodeEditor([
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" Key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SoMEKEy" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" valuE="000"/>',
            '<property id="SomeThing" key="SomeKey" value="000"/>',
            '<property id="SomeThing" key="SomeKey" value="00X"/>',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 10, 10, false);
            assertCursor(viewModel, new Position(10, 10));
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(10, 10, 10, 9)]);
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(10, 10, 10, 8)]);
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(10, 10, 10, 9)]);
            CoreNavigationCommands.CursorColumnSelectUp.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(10, 10, 10, 9), new Selection(9, 10, 9, 9)]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(10, 10, 10, 9)]);
        });
    });
    test('issue #118062: Column selection cannot select first position of a line', () => {
        withTestCodeEditor(['hello world'].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 2, false);
            assertCursor(viewModel, new Position(1, 2));
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(1, 2, 1, 1)]);
        });
    });
    test('column select with keyboard', () => {
        withTestCodeEditor([
            'var gulp = require("gulp");',
            'var path = require("path");',
            'var rimraf = require("rimraf");',
            'var isarray = require("isarray");',
            'var merge = require("merge-stream");',
            'var concat = require("gulp-concat");',
            'var newer = require("gulp-newer");',
        ].join('\n'), {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 4, false);
            assertCursor(viewModel, new Position(1, 4));
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(1, 4, 1, 5)]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [new Selection(1, 4, 1, 5), new Selection(2, 4, 2, 5)]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 5),
                new Selection(2, 4, 2, 5),
                new Selection(3, 4, 3, 5),
            ]);
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectDown.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 5),
                new Selection(2, 4, 2, 5),
                new Selection(3, 4, 3, 5),
                new Selection(4, 4, 4, 5),
                new Selection(5, 4, 5, 5),
                new Selection(6, 4, 6, 5),
                new Selection(7, 4, 7, 5),
            ]);
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 6),
                new Selection(2, 4, 2, 6),
                new Selection(3, 4, 3, 6),
                new Selection(4, 4, 4, 6),
                new Selection(5, 4, 5, 6),
                new Selection(6, 4, 6, 6),
                new Selection(7, 4, 7, 6),
            ]);
            // 10 times
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 16),
                new Selection(2, 4, 2, 16),
                new Selection(3, 4, 3, 16),
                new Selection(4, 4, 4, 16),
                new Selection(5, 4, 5, 16),
                new Selection(6, 4, 6, 16),
                new Selection(7, 4, 7, 16),
            ]);
            // 10 times
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 26),
                new Selection(2, 4, 2, 26),
                new Selection(3, 4, 3, 26),
                new Selection(4, 4, 4, 26),
                new Selection(5, 4, 5, 26),
                new Selection(6, 4, 6, 26),
                new Selection(7, 4, 7, 26),
            ]);
            // 2 times => reaching the ending of lines 1 and 2
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 28),
                new Selection(4, 4, 4, 28),
                new Selection(5, 4, 5, 28),
                new Selection(6, 4, 6, 28),
                new Selection(7, 4, 7, 28),
            ]);
            // 4 times => reaching the ending of line 3
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 32),
                new Selection(5, 4, 5, 32),
                new Selection(6, 4, 6, 32),
                new Selection(7, 4, 7, 32),
            ]);
            // 2 times => reaching the ending of line 4
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 34),
                new Selection(6, 4, 6, 34),
                new Selection(7, 4, 7, 34),
            ]);
            // 1 time => reaching the ending of line 7
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 35),
                new Selection(6, 4, 6, 35),
                new Selection(7, 4, 7, 35),
            ]);
            // 3 times => reaching the ending of lines 5 & 6
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 37),
                new Selection(6, 4, 6, 37),
                new Selection(7, 4, 7, 35),
            ]);
            // cannot go anywhere anymore
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 37),
                new Selection(6, 4, 6, 37),
                new Selection(7, 4, 7, 35),
            ]);
            // cannot go anywhere anymore even if we insist
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            CoreNavigationCommands.CursorColumnSelectRight.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 37),
                new Selection(6, 4, 6, 37),
                new Selection(7, 4, 7, 35),
            ]);
            // can easily go back
            CoreNavigationCommands.CursorColumnSelectLeft.runCoreEditorCommand(viewModel, {});
            assertCursor(viewModel, [
                new Selection(1, 4, 1, 28),
                new Selection(2, 4, 2, 28),
                new Selection(3, 4, 3, 32),
                new Selection(4, 4, 4, 34),
                new Selection(5, 4, 5, 36),
                new Selection(6, 4, 6, 36),
                new Selection(7, 4, 7, 35),
            ]);
        });
    });
    test('setSelection / setPosition with source', () => {
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                return new EncodedTokenizationResult(new Uint32Array(0), state);
            },
        };
        const LANGUAGE_ID = 'modelModeTest1';
        const languageRegistration = TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        const model = createTextModel('Just text', LANGUAGE_ID);
        withTestCodeEditor(model, {}, (editor1, cursor1) => {
            let event = undefined;
            const disposable = editor1.onDidChangeCursorPosition((e) => {
                event = e;
            });
            editor1.setSelection(new Range(1, 2, 1, 3), 'navigation');
            assert.strictEqual(event.source, 'navigation');
            event = undefined;
            editor1.setPosition(new Position(1, 2), 'navigation');
            assert.strictEqual(event.source, 'navigation');
            disposable.dispose();
        });
        languageRegistration.dispose();
        model.dispose();
    });
});
suite('Editor Controller', () => {
    const surroundingLanguageId = 'surroundingLanguage';
    const indentRulesLanguageId = 'indentRulesLanguage';
    const electricCharLanguageId = 'electricCharLanguage';
    const autoClosingLanguageId = 'autoClosingLanguage';
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: surroundingLanguageId }));
        disposables.add(languageConfigurationService.register(surroundingLanguageId, {
            autoClosingPairs: [{ open: '(', close: ')' }],
        }));
        setupIndentRulesLanguage(indentRulesLanguageId, {
            decreaseIndentPattern: /^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
            increaseIndentPattern: /^((?!\/\/).)*(\{[^}"'`]*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$/,
            indentNextLinePattern: /^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$)/,
            unIndentedLinePattern: /^(?!.*([;{}]|\S:)\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!.*(\{[^}"']*|\([^)"']*|\[[^\]"']*|^\s*(\{\}|\(\)|\[\]|(case\b.*|default):))\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*((?!\S.*\/[*]).*[*]\/\s*)?[})\]]|^\s*(case\b.*|default):\s*(\/\/.*|\/[*].*[*]\/\s*)?$)(?!^\s*(for|while|if|else)\b(?!.*[;{}]\s*(\/\/.*|\/[*].*[*]\/\s*)?$))/,
        });
        disposables.add(languageService.registerLanguage({ id: electricCharLanguageId }));
        disposables.add(languageConfigurationService.register(electricCharLanguageId, {
            __electricCharacterSupport: {
                docComment: { open: '/**', close: ' */' },
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        setupAutoClosingLanguage();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function setupOnEnterLanguage(indentAction) {
        const onEnterLanguageId = 'onEnterMode';
        disposables.add(languageService.registerLanguage({ id: onEnterLanguageId }));
        disposables.add(languageConfigurationService.register(onEnterLanguageId, {
            onEnterRules: [
                {
                    beforeText: /.*/,
                    action: {
                        indentAction: indentAction,
                    },
                },
            ],
        }));
        return onEnterLanguageId;
    }
    function setupIndentRulesLanguage(languageId, indentationRules) {
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            indentationRules: indentationRules,
        }));
        return languageId;
    }
    function setupAutoClosingLanguage() {
        disposables.add(languageService.registerLanguage({ id: autoClosingLanguageId }));
        disposables.add(languageConfigurationService.register(autoClosingLanguageId, {
            comments: {
                blockComment: ['/*', '*/'],
            },
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: "'", close: "'", notIn: ['string', 'comment'] },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
                { open: '/**', close: ' */', notIn: ['string'] },
                { open: 'begin', close: 'end', notIn: ['string'] },
            ],
            __electricCharacterSupport: {
                docComment: { open: '/**', close: ' */' },
            },
        }));
    }
    function setupAutoClosingLanguageTokenization() {
        class BaseState {
            constructor(parent = null) {
                this.parent = parent;
            }
            clone() {
                return this;
            }
            equals(other) {
                if (!(other instanceof BaseState)) {
                    return false;
                }
                if (!this.parent && !other.parent) {
                    return true;
                }
                if (!this.parent || !other.parent) {
                    return false;
                }
                return this.parent.equals(other.parent);
            }
        }
        class StringState {
            constructor(char, parentState) {
                this.char = char;
                this.parentState = parentState;
            }
            clone() {
                return this;
            }
            equals(other) {
                return (other instanceof StringState &&
                    this.char === other.char &&
                    this.parentState.equals(other.parentState));
            }
        }
        class BlockCommentState {
            constructor(parentState) {
                this.parentState = parentState;
            }
            clone() {
                return this;
            }
            equals(other) {
                return other instanceof StringState && this.parentState.equals(other.parentState);
            }
        }
        const encodedLanguageId = languageService.languageIdCodec.encodeLanguageId(autoClosingLanguageId);
        disposables.add(TokenizationRegistry.register(autoClosingLanguageId, {
            getInitialState: () => new BaseState(),
            tokenize: undefined,
            tokenizeEncoded: function (line, hasEOL, _state) {
                let state = _state;
                const tokens = [];
                const generateToken = (length, type, newState) => {
                    if (tokens.length > 0 && tokens[tokens.length - 1].type === type) {
                        // grow last tokens
                        tokens[tokens.length - 1].length += length;
                    }
                    else {
                        tokens.push({ length, type });
                    }
                    line = line.substring(length);
                    if (newState) {
                        state = newState;
                    }
                };
                while (line.length > 0) {
                    advance();
                }
                const result = new Uint32Array(tokens.length * 2);
                let startIndex = 0;
                for (let i = 0; i < tokens.length; i++) {
                    result[2 * i] = startIndex;
                    result[2 * i + 1] =
                        (encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */) |
                            (tokens[i].type << 8 /* MetadataConsts.TOKEN_TYPE_OFFSET */);
                    startIndex += tokens[i].length;
                }
                return new EncodedTokenizationResult(result, state);
                function advance() {
                    if (state instanceof BaseState) {
                        const m1 = line.match(/^[^'"`{}/]+/g);
                        if (m1) {
                            return generateToken(m1[0].length, 0 /* StandardTokenType.Other */);
                        }
                        if (/^['"`]/.test(line)) {
                            return generateToken(1, 2 /* StandardTokenType.String */, new StringState(line.charAt(0), state));
                        }
                        if (/^{/.test(line)) {
                            return generateToken(1, 0 /* StandardTokenType.Other */, new BaseState(state));
                        }
                        if (/^}/.test(line)) {
                            return generateToken(1, 0 /* StandardTokenType.Other */, state.parent || new BaseState());
                        }
                        if (/^\/\//.test(line)) {
                            return generateToken(line.length, 1 /* StandardTokenType.Comment */, state);
                        }
                        if (/^\/\*/.test(line)) {
                            return generateToken(2, 1 /* StandardTokenType.Comment */, new BlockCommentState(state));
                        }
                        return generateToken(1, 0 /* StandardTokenType.Other */, state);
                    }
                    else if (state instanceof StringState) {
                        const m1 = line.match(/^[^\\'"`\$]+/g);
                        if (m1) {
                            return generateToken(m1[0].length, 2 /* StandardTokenType.String */);
                        }
                        if (/^\\/.test(line)) {
                            return generateToken(2, 2 /* StandardTokenType.String */);
                        }
                        if (line.charAt(0) === state.char) {
                            return generateToken(1, 2 /* StandardTokenType.String */, state.parentState);
                        }
                        if (/^\$\{/.test(line)) {
                            return generateToken(2, 0 /* StandardTokenType.Other */, new BaseState(state));
                        }
                        return generateToken(1, 0 /* StandardTokenType.Other */, state);
                    }
                    else if (state instanceof BlockCommentState) {
                        const m1 = line.match(/^[^*]+/g);
                        if (m1) {
                            return generateToken(m1[0].length, 2 /* StandardTokenType.String */);
                        }
                        if (/^\*\//.test(line)) {
                            return generateToken(2, 1 /* StandardTokenType.Comment */, state.parentState);
                        }
                        return generateToken(1, 0 /* StandardTokenType.Other */, state);
                    }
                    else {
                        throw new Error(`unknown state`);
                    }
                }
            },
        }));
    }
    function setAutoClosingLanguageEnabledSet(chars) {
        disposables.add(languageConfigurationService.register(autoClosingLanguageId, {
            autoCloseBefore: chars,
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: "'", close: "'", notIn: ['string', 'comment'] },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
                { open: '/**', close: ' */', notIn: ['string'] },
            ],
        }));
    }
    function createTextModel(text, languageId = null, options = TextModel.DEFAULT_CREATION_OPTIONS, uri = null) {
        return disposables.add(instantiateTextModel(instantiationService, text, languageId, options, uri));
    }
    function withTestCodeEditor(text, options, callback) {
        let model;
        if (typeof text === 'string') {
            model = createTextModel(text);
        }
        else if (Array.isArray(text)) {
            model = createTextModel(text.join('\n'));
        }
        else {
            model = text;
        }
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, options));
        const viewModel = editor.getViewModel();
        viewModel.setHasFocus(true);
        callback(editor, viewModel);
    }
    function usingCursor(opts, callback) {
        const model = createTextModel(opts.text.join('\n'), opts.languageId, opts.modelOpts);
        const editorOptions = opts.editorOpts || {};
        withTestCodeEditor(model, editorOptions, (editor, viewModel) => {
            callback(editor, model, viewModel);
        });
    }
    let AutoClosingColumnType;
    (function (AutoClosingColumnType) {
        AutoClosingColumnType[AutoClosingColumnType["Normal"] = 0] = "Normal";
        AutoClosingColumnType[AutoClosingColumnType["Special1"] = 1] = "Special1";
        AutoClosingColumnType[AutoClosingColumnType["Special2"] = 2] = "Special2";
    })(AutoClosingColumnType || (AutoClosingColumnType = {}));
    function extractAutoClosingSpecialColumns(maxColumn, annotatedLine) {
        const result = [];
        for (let j = 1; j <= maxColumn; j++) {
            result[j] = 0 /* AutoClosingColumnType.Normal */;
        }
        let column = 1;
        for (let j = 0; j < annotatedLine.length; j++) {
            if (annotatedLine.charAt(j) === '|') {
                result[column] = 1 /* AutoClosingColumnType.Special1 */;
            }
            else if (annotatedLine.charAt(j) === '!') {
                result[column] = 2 /* AutoClosingColumnType.Special2 */;
            }
            else {
                column++;
            }
        }
        return result;
    }
    function assertType(editor, model, viewModel, lineNumber, column, chr, expectedInsert, message) {
        const lineContent = model.getLineContent(lineNumber);
        const expected = lineContent.substr(0, column - 1) + expectedInsert + lineContent.substr(column - 1);
        moveTo(editor, viewModel, lineNumber, column);
        viewModel.type(chr, 'keyboard');
        assert.deepStrictEqual(model.getLineContent(lineNumber), expected, message);
        model.undo();
    }
    test('issue microsoft/monaco-editor#443: Indentation of a single row deletes selected text in some cases', () => {
        const model = createTextModel(['Hello world!', 'another line'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 13)]);
            // Check that indenting maintains the selection start at column 1
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 1, 1, 14));
        });
    });
    test('Bug 9121: Auto indent + undo + redo is funky', () => {
        const model = createTextModel([''].join('\n'), undefined, {
            insertSpaces: false,
            trimAutoWhitespace: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n', 'assert1');
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t', 'assert2');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\t', 'assert3');
            viewModel.type('x');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\tx', 'assert4');
            CoreNavigationCommands.CursorLeft.runCoreEditorCommand(viewModel, {});
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\tx', 'assert5');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\nx', 'assert6');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\tx', 'assert7');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert8');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert9');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert10');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\nx', 'assert11');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\n\tx', 'assert12');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t\nx', 'assert13');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert14');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert15');
        });
    });
    test("issue #23539: Setting model EOL isn't undoable", () => {
        withTestCodeEditor(['Hello', 'world'], {}, (editor, viewModel) => {
            const model = editor.getModel();
            assertCursor(viewModel, new Position(1, 1));
            model.setEOL(0 /* EndOfLineSequence.LF */);
            assert.strictEqual(model.getValue(), 'Hello\nworld');
            model.pushEOL(1 /* EndOfLineSequence.CRLF */);
            assert.strictEqual(model.getValue(), 'Hello\r\nworld');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'Hello\nworld');
        });
    });
    test('issue #47733: Undo mangles unicode characters', () => {
        const languageId = 'myMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            surroundingPairs: [{ open: '%', close: '%' }],
        }));
        const model = createTextModel("'👁'", languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelection(new Selection(1, 1, 1, 2));
            viewModel.type('%', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), "%'%👁'", 'assert1');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), "'👁'", 'assert2');
        });
    });
    test('issue #46208: Allow empty selections in the undo/redo stack', () => {
        const model = createTextModel('');
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('Hello', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type('world', 'keyboard');
            viewModel.type(' ', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'Hello world ');
            assertCursor(viewModel, new Position(1, 13));
            moveLeft(editor, viewModel);
            moveRight(editor, viewModel);
            model.pushEditOperations([], [EditOperation.replaceMove(new Range(1, 12, 1, 13), '')], () => []);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world ');
            assertCursor(viewModel, new Selection(1, 13, 1, 13));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello');
            assertCursor(viewModel, new Position(1, 6));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '');
            assertCursor(viewModel, new Position(1, 1));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello');
            assertCursor(viewModel, new Position(1, 6));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world ');
            assertCursor(viewModel, new Position(1, 13));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'Hello world');
            assertCursor(viewModel, new Position(1, 12));
        });
    });
    test("bug #16815:Shift+Tab doesn't go back to tabstop", () => {
        const languageId = setupOnEnterLanguage(IndentAction.IndentOutdent);
        const model = createTextModel(['     function baz() {'].join('\n'), languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 6, false);
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
            CoreEditingCommands.Outdent.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    function baz() {');
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
        });
    });
    test("Bug #18293:[regression][editor] Can't outdent whitespace line", () => {
        const model = createTextModel(['      '].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            CoreEditingCommands.Outdent.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    ');
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
        });
    });
    test('issue #95591: Unindenting moves cursor to beginning of line', () => {
        const model = createTextModel(['        '].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 9, false);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            CoreEditingCommands.Outdent.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    ');
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
        });
    });
    test('Bug #16657: [editor] Tab on empty line of zero indentation moves cursor to position (1,1)', () => {
        const model = createTextModel(['function baz() {', '\tfunction hello() { // something here', '\t', '', '\t}', '}', ''].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 7, 1, false);
            assertCursor(viewModel, new Selection(7, 1, 7, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(7), '\t');
            assertCursor(viewModel, new Selection(7, 2, 7, 2));
        });
    });
    test("bug #16740: [editor] Cut line doesn't quite cut the last line", () => {
        // Part 1 => there is text on the last line
        withTestCodeEditor(['asdasd', 'qwerty'], {}, (editor, viewModel) => {
            const model = editor.getModel();
            moveTo(editor, viewModel, 2, 1, false);
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), 'asdasd');
        });
        // Part 2 => there is no text on the last line
        withTestCodeEditor(['asdasd', ''], {}, (editor, viewModel) => {
            const model = editor.getModel();
            moveTo(editor, viewModel, 2, 1, false);
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), 'asdasd');
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), '');
        });
    });
    test('issue #128602: When cutting multiple lines (ctrl x), the last line will not be erased', () => {
        withTestCodeEditor(['a1', 'a2', 'a3'], {}, (editor, viewModel) => {
            const model = editor.getModel();
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 1),
                new Selection(2, 1, 2, 1),
                new Selection(3, 1, 3, 1),
            ]);
            viewModel.cut('keyboard');
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), '');
        });
    });
    test('Bug #11476: Double bracket surrounding + undo is broken', () => {
        usingCursor({
            text: ['hello'],
            languageId: surroundingLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 3, false);
            moveTo(editor, viewModel, 1, 5, true);
            assertCursor(viewModel, new Selection(1, 3, 1, 5));
            viewModel.type('(', 'keyboard');
            assertCursor(viewModel, new Selection(1, 4, 1, 6));
            viewModel.type('(', 'keyboard');
            assertCursor(viewModel, new Selection(1, 5, 1, 7));
        });
    });
    test('issue #1140: Backspace stops prematurely', () => {
        const model = createTextModel(['function baz() {', '  return 1;', '};'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            moveTo(editor, viewModel, 1, 14, true);
            assertCursor(viewModel, new Selection(3, 2, 1, 14));
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assertCursor(viewModel, new Selection(1, 14, 1, 14));
            assert.strictEqual(model.getLineCount(), 1);
            assert.strictEqual(model.getLineContent(1), 'function baz(;');
        });
    });
    test('issue #10212: Pasting entire line does not replace selection', () => {
        usingCursor({
            text: ['line1', 'line2'],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1, false);
            moveTo(editor, viewModel, 2, 6, true);
            viewModel.paste('line1\n', true);
            assert.strictEqual(model.getLineContent(1), 'line1');
            assert.strictEqual(model.getLineContent(2), 'line1');
            assert.strictEqual(model.getLineContent(3), '');
        });
    });
    test('issue #74722: Pasting whole line does not replace selection', () => {
        usingCursor({
            text: ['line1', 'line sel 2', 'line3'],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 6, 2, 9)]);
            viewModel.paste('line1\n', true);
            assert.strictEqual(model.getLineContent(1), 'line1');
            assert.strictEqual(model.getLineContent(2), 'line line1');
            assert.strictEqual(model.getLineContent(3), ' 2');
            assert.strictEqual(model.getLineContent(4), 'line3');
        });
    });
    test('issue #4996: Multiple cursor paste pastes contents of all cursors', () => {
        usingCursor({
            text: ['line1', 'line2', 'line3'],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
            viewModel.paste('a\nb\nc\nd', false, ['a\nb', 'c\nd']);
            assert.strictEqual(model.getValue(), ['a', 'bline1', 'c', 'dline2', 'line3'].join('\n'));
        });
    });
    test('issue #16155: Paste into multiple cursors has edge case when number of lines equals number of cursors - 1', () => {
        usingCursor({
            text: ['test', 'test', 'test', 'test'],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
            ]);
            viewModel.paste('aaa\nbbb\nccc\n', false, null);
            assert.strictEqual(model.getValue(), [
                'aaa',
                'bbb',
                'ccc',
                '',
                'aaa',
                'bbb',
                'ccc',
                '',
                'aaa',
                'bbb',
                'ccc',
                '',
                'aaa',
                'bbb',
                'ccc',
                '',
            ].join('\n'));
        });
    });
    test("issue #43722: Multiline paste doesn't work anymore", () => {
        usingCursor({
            text: ['test', 'test', 'test', 'test'],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
            ]);
            viewModel.paste('aaa\r\nbbb\r\nccc\r\nddd\r\n', false, null);
            assert.strictEqual(model.getValue(), ['aaa', 'bbb', 'ccc', 'ddd'].join('\n'));
        });
    });
    test('issue #46440: (1) Pasting a multi-line selection pastes entire selection into every insertion point', () => {
        usingCursor({
            text: ['line1', 'line2', 'line3'],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 1),
                new Selection(2, 1, 2, 1),
                new Selection(3, 1, 3, 1),
            ]);
            viewModel.paste('a\nb\nc', false, null);
            assert.strictEqual(model.getValue(), ['aline1', 'bline2', 'cline3'].join('\n'));
        });
    });
    test('issue #46440: (2) Pasting a multi-line selection pastes entire selection into every insertion point', () => {
        usingCursor({
            text: ['line1', 'line2', 'line3'],
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 1),
                new Selection(2, 1, 2, 1),
                new Selection(3, 1, 3, 1),
            ]);
            viewModel.paste('a\nb\nc\n', false, null);
            assert.strictEqual(model.getValue(), ['aline1', 'bline2', 'cline3'].join('\n'));
        });
    });
    test('issue #3071: Investigate why undo stack gets corrupted', () => {
        const model = createTextModel(['some lines', 'and more lines', 'just some text'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 1, false);
            moveTo(editor, viewModel, 3, 4, true);
            let isFirst = true;
            const disposable = model.onDidChangeContent(() => {
                if (isFirst) {
                    isFirst = false;
                    viewModel.type('\t', 'keyboard');
                }
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), ['\t just some text'].join('\n'), '001');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), ['    some lines', '    and more lines', '    just some text'].join('\n'), '002');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), ['some lines', 'and more lines', 'just some text'].join('\n'), '003');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), ['some lines', 'and more lines', 'just some text'].join('\n'), '004');
            disposable.dispose();
        });
    });
    test('issue #12950: Cannot Double Click To Insert Emoji Using OSX Emoji Panel', () => {
        usingCursor({
            text: ['some lines', 'and more lines', 'just some text'],
            languageId: null,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 1, false);
            viewModel.type('😍', 'keyboard');
            assert.strictEqual(model.getValue(), ['some lines', 'and more lines', '😍just some text'].join('\n'));
        });
    });
    test('issue #3463: pressing tab adds spaces, but not as many as for a tab', () => {
        const model = createTextModel(['function a() {', '\tvar a = {', '\t\tx: 3', '\t};', '}'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(3), '\t    \tx: 3');
        });
    });
    test('issue #4312: trying to type a tab character over a sequence of spaces results in unexpected behaviour', () => {
        const model = createTextModel(['var foo = 123;       // this is a comment', 'var bar = 4;       // another comment'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 15, false);
            moveTo(editor, viewModel, 1, 22, true);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'var foo = 123;\t// this is a comment');
        });
    });
    test('issue #832: word right', () => {
        usingCursor({
            text: ['   /* Just some   more   text a+= 3 +5-3 + 7 */  '],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 1, false);
            function assertWordRight(col, expectedCol) {
                const args = {
                    position: {
                        lineNumber: 1,
                        column: col,
                    },
                };
                if (col === 1) {
                    CoreNavigationCommands.WordSelect.runCoreEditorCommand(viewModel, args);
                }
                else {
                    CoreNavigationCommands.WordSelectDrag.runCoreEditorCommand(viewModel, args);
                }
                assert.strictEqual(viewModel.getSelection().startColumn, 1, 'TEST FOR ' + col);
                assert.strictEqual(viewModel.getSelection().endColumn, expectedCol, 'TEST FOR ' + col);
            }
            assertWordRight(1, '   '.length + 1);
            assertWordRight(2, '   '.length + 1);
            assertWordRight(3, '   '.length + 1);
            assertWordRight(4, '   '.length + 1);
            assertWordRight(5, '   /'.length + 1);
            assertWordRight(6, '   /*'.length + 1);
            assertWordRight(7, '   /* '.length + 1);
            assertWordRight(8, '   /* Just'.length + 1);
            assertWordRight(9, '   /* Just'.length + 1);
            assertWordRight(10, '   /* Just'.length + 1);
            assertWordRight(11, '   /* Just'.length + 1);
            assertWordRight(12, '   /* Just '.length + 1);
            assertWordRight(13, '   /* Just some'.length + 1);
            assertWordRight(14, '   /* Just some'.length + 1);
            assertWordRight(15, '   /* Just some'.length + 1);
            assertWordRight(16, '   /* Just some'.length + 1);
            assertWordRight(17, '   /* Just some '.length + 1);
            assertWordRight(18, '   /* Just some  '.length + 1);
            assertWordRight(19, '   /* Just some   '.length + 1);
            assertWordRight(20, '   /* Just some   more'.length + 1);
            assertWordRight(21, '   /* Just some   more'.length + 1);
            assertWordRight(22, '   /* Just some   more'.length + 1);
            assertWordRight(23, '   /* Just some   more'.length + 1);
            assertWordRight(24, '   /* Just some   more '.length + 1);
            assertWordRight(25, '   /* Just some   more  '.length + 1);
            assertWordRight(26, '   /* Just some   more   '.length + 1);
            assertWordRight(27, '   /* Just some   more   text'.length + 1);
            assertWordRight(28, '   /* Just some   more   text'.length + 1);
            assertWordRight(29, '   /* Just some   more   text'.length + 1);
            assertWordRight(30, '   /* Just some   more   text'.length + 1);
            assertWordRight(31, '   /* Just some   more   text '.length + 1);
            assertWordRight(32, '   /* Just some   more   text a'.length + 1);
            assertWordRight(33, '   /* Just some   more   text a+'.length + 1);
            assertWordRight(34, '   /* Just some   more   text a+='.length + 1);
            assertWordRight(35, '   /* Just some   more   text a+= '.length + 1);
            assertWordRight(36, '   /* Just some   more   text a+= 3'.length + 1);
            assertWordRight(37, '   /* Just some   more   text a+= 3 '.length + 1);
            assertWordRight(38, '   /* Just some   more   text a+= 3 +'.length + 1);
            assertWordRight(39, '   /* Just some   more   text a+= 3 +5'.length + 1);
            assertWordRight(40, '   /* Just some   more   text a+= 3 +5-'.length + 1);
            assertWordRight(41, '   /* Just some   more   text a+= 3 +5-3'.length + 1);
            assertWordRight(42, '   /* Just some   more   text a+= 3 +5-3 '.length + 1);
            assertWordRight(43, '   /* Just some   more   text a+= 3 +5-3 +'.length + 1);
            assertWordRight(44, '   /* Just some   more   text a+= 3 +5-3 + '.length + 1);
            assertWordRight(45, '   /* Just some   more   text a+= 3 +5-3 + 7'.length + 1);
            assertWordRight(46, '   /* Just some   more   text a+= 3 +5-3 + 7 '.length + 1);
            assertWordRight(47, '   /* Just some   more   text a+= 3 +5-3 + 7 *'.length + 1);
            assertWordRight(48, '   /* Just some   more   text a+= 3 +5-3 + 7 */'.length + 1);
            assertWordRight(49, '   /* Just some   more   text a+= 3 +5-3 + 7 */ '.length + 1);
            assertWordRight(50, '   /* Just some   more   text a+= 3 +5-3 + 7 */  '.length + 1);
        });
    });
    test('issue #33788: Wrong cursor position when double click to select a word', () => {
        const model = createTextModel(['Just some text'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runCoreEditorCommand(viewModel, {
                position: new Position(1, 8),
            });
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 6, 1, 10));
            CoreNavigationCommands.WordSelectDrag.runCoreEditorCommand(viewModel, {
                position: new Position(1, 8),
            });
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 6, 1, 10));
        });
    });
    test('issue #12887: Double-click highlighting separating white space', () => {
        const model = createTextModel(['abc def'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runCoreEditorCommand(viewModel, {
                position: new Position(1, 5),
            });
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 5, 1, 8));
        });
    });
    test('issue #9675: Undo/Redo adds a stop in between CHN Characters', () => {
        withTestCodeEditor([], {}, (editor, viewModel) => {
            const model = editor.getModel();
            assertCursor(viewModel, new Position(1, 1));
            // Typing sennsei in Japanese - Hiragana
            viewModel.type('ｓ', 'keyboard');
            viewModel.compositionType('せ', 1, 0, 0);
            viewModel.compositionType('せｎ', 1, 0, 0);
            viewModel.compositionType('せん', 2, 0, 0);
            viewModel.compositionType('せんｓ', 2, 0, 0);
            viewModel.compositionType('せんせ', 3, 0, 0);
            viewModel.compositionType('せんせ', 3, 0, 0);
            viewModel.compositionType('せんせい', 3, 0, 0);
            viewModel.compositionType('せんせい', 4, 0, 0);
            viewModel.compositionType('せんせい', 4, 0, 0);
            viewModel.compositionType('せんせい', 4, 0, 0);
            assert.strictEqual(model.getLineContent(1), 'せんせい');
            assertCursor(viewModel, new Position(1, 5));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '');
            assertCursor(viewModel, new Position(1, 1));
        });
    });
    test('issue #23983: Calling model.setEOL does not reset cursor position', () => {
        usingCursor({
            text: ['first line', 'second line'],
        }, (editor, model, viewModel) => {
            model.setEOL(1 /* EndOfLineSequence.CRLF */);
            viewModel.setSelections('test', [new Selection(2, 2, 2, 2)]);
            model.setEOL(0 /* EndOfLineSequence.LF */);
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
        });
    });
    test('issue #23983: Calling model.setValue() resets cursor position', () => {
        usingCursor({
            text: ['first line', 'second line'],
        }, (editor, model, viewModel) => {
            model.setEOL(1 /* EndOfLineSequence.CRLF */);
            viewModel.setSelections('test', [new Selection(2, 2, 2, 2)]);
            model.setValue(['different first line', 'different second line', 'new third line'].join('\n'));
            assertCursor(viewModel, new Selection(1, 1, 1, 1));
        });
    });
    test('issue #36740: wordwrap creates an extra step / character at the wrapping point', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([['Lorem ipsum ', 'dolor sit amet ', 'consectetur ', 'adipiscing elit'].join('')], { wordWrap: 'wordWrapColumn', wordWrapColumn: 16 }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 7, 1, 7)]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 10, 1, 10));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 11, 1, 11));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 13, 1, 13));
            // moving to view line 2
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 14, 1, 14));
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 13, 1, 13));
            // moving back to view line 1
            moveLeft(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
        });
    });
    test('issue #110376: multiple selections with wordwrap behave differently', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([['just a sentence. just a ', 'sentence. just a sentence.'].join('')], { wordWrap: 'wordWrapColumn', wordWrapColumn: 25 }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 16),
                new Selection(1, 18, 1, 33),
                new Selection(1, 35, 1, 50),
            ]);
            moveLeft(editor, viewModel);
            assertCursor(viewModel, [
                new Selection(1, 1, 1, 1),
                new Selection(1, 18, 1, 18),
                new Selection(1, 35, 1, 35),
            ]);
            viewModel.setSelections('test', [
                new Selection(1, 1, 1, 16),
                new Selection(1, 18, 1, 33),
                new Selection(1, 35, 1, 50),
            ]);
            moveRight(editor, viewModel);
            assertCursor(viewModel, [
                new Selection(1, 16, 1, 16),
                new Selection(1, 33, 1, 33),
                new Selection(1, 50, 1, 50),
            ]);
        });
    });
    test('issue #98320: Multi-Cursor, Wrap lines and cursorSelectRight ==> cursors out of sync', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([
            [
                'lorem_ipsum-1993x11x13',
                'dolor_sit_amet-1998x04x27',
                'consectetur-2007x10x08',
                'adipiscing-2012x07x27',
                'elit-2015x02x27',
            ].join('\n'),
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 16 }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 13, 1, 13),
                new Selection(2, 16, 2, 16),
                new Selection(3, 13, 3, 13),
                new Selection(4, 12, 4, 12),
                new Selection(5, 6, 5, 6),
            ]);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 13),
                new Selection(2, 16, 2, 16),
                new Selection(3, 13, 3, 13),
                new Selection(4, 12, 4, 12),
                new Selection(5, 6, 5, 6),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 14),
                new Selection(2, 16, 2, 17),
                new Selection(3, 13, 3, 14),
                new Selection(4, 12, 4, 13),
                new Selection(5, 6, 5, 7),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 15),
                new Selection(2, 16, 2, 18),
                new Selection(3, 13, 3, 15),
                new Selection(4, 12, 4, 14),
                new Selection(5, 6, 5, 8),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 16),
                new Selection(2, 16, 2, 19),
                new Selection(3, 13, 3, 16),
                new Selection(4, 12, 4, 15),
                new Selection(5, 6, 5, 9),
            ]);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 13, 1, 17),
                new Selection(2, 16, 2, 20),
                new Selection(3, 13, 3, 17),
                new Selection(4, 12, 4, 16),
                new Selection(5, 6, 5, 10),
            ]);
        });
    });
    test('issue #41573 - delete across multiple lines does not shrink the selection when word wraps', () => {
        withTestCodeEditor([
            "Authorization: 'Bearer pHKRfCTFSnGxs6akKlb9ddIXcca0sIUSZJutPHYqz7vEeHdMTMh0SGN0IGU3a0n59DXjTLRsj5EJ2u33qLNIFi9fk5XF8pK39PndLYUZhPt4QvHGLScgSkK0L4gwzkzMloTQPpKhqiikiIOvyNNSpd2o8j29NnOmdTUOKi9DVt74PD2ohKxyOrWZ6oZprTkb3eKajcpnS0LABKfaw2rmv4',",
        ].join('\n'), { wordWrap: 'wordWrapColumn', wordWrapColumn: 100 }, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 43, false);
            moveTo(editor, viewModel, 1, 147, true);
            assertCursor(viewModel, new Selection(1, 43, 1, 147));
            editor.getModel().applyEdits([
                {
                    range: new Range(1, 1, 1, 43),
                    text: '',
                },
            ]);
            assertCursor(viewModel, new Selection(1, 1, 1, 105));
        });
    });
    test('issue #22717: Moving text cursor cause an incorrect position in Chinese', () => {
        // a single model line => 4 view lines
        withTestCodeEditor([['一二三四五六七八九十', '12345678901234567890'].join('\n')], {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            moveDown(editor, viewModel);
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(2, 10, 2, 10));
            moveRight(editor, viewModel);
            assertCursor(viewModel, new Selection(2, 11, 2, 11));
            moveUp(editor, viewModel);
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
        });
    });
    test('issue #112301: new stickyTabStops feature interferes with word wrap', () => {
        withTestCodeEditor([
            ['function hello() {', '        console.log(`this is a long console message`)', '}'].join('\n'),
        ], { wordWrap: 'wordWrapColumn', wordWrapColumn: 32, stickyTabStops: true }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 31, 2, 31)]);
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 32));
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 33));
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 34));
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 33));
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 32));
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, new Position(2, 31));
        });
    });
    test('issue #44805: Should not be able to undo in readonly editor', () => {
        const model = createTextModel([''].join('\n'));
        withTestCodeEditor(model, { readOnly: true }, (editor, viewModel) => {
            model.pushEditOperations([new Selection(1, 1, 1, 1)], [
                {
                    range: new Range(1, 1, 1, 1),
                    text: 'Hello world!',
                },
            ], () => [new Selection(1, 1, 1, 1)]);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'Hello world!');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'Hello world!');
        });
    });
    test('issue #46314: ViewModel is out of sync with Model!', () => {
        const tokenizationSupport = {
            getInitialState: () => NullState,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                return new EncodedTokenizationResult(new Uint32Array(0), state);
            },
        };
        const LANGUAGE_ID = 'modelModeTest1';
        const languageRegistration = TokenizationRegistry.register(LANGUAGE_ID, tokenizationSupport);
        const model = createTextModel('Just text', LANGUAGE_ID);
        withTestCodeEditor(model, {}, (editor1, cursor1) => {
            withTestCodeEditor(model, {}, (editor2, cursor2) => {
                const disposable = editor1.onDidChangeCursorPosition(() => {
                    model.tokenization.tokenizeIfCheap(1);
                });
                model.applyEdits([{ range: new Range(1, 1, 1, 1), text: '-' }]);
                disposable.dispose();
            });
        });
        languageRegistration.dispose();
        model.dispose();
    });
    test('issue #37967: problem replacing consecutive characters', () => {
        const model = createTextModel(['const a = "foo";', 'const b = ""'].join('\n'));
        withTestCodeEditor(model, { multiCursorMergeOverlapping: false }, (editor, viewModel) => {
            editor.setSelections([
                new Selection(1, 12, 1, 12),
                new Selection(1, 16, 1, 16),
                new Selection(2, 12, 2, 12),
                new Selection(2, 13, 2, 13),
            ]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [
                new Selection(1, 11, 1, 11),
                new Selection(1, 14, 1, 14),
                new Selection(2, 11, 2, 11),
                new Selection(2, 11, 2, 11),
            ]);
            viewModel.type("'", 'keyboard');
            assert.strictEqual(model.getLineContent(1), "const a = 'foo';");
            assert.strictEqual(model.getLineContent(2), "const b = ''");
        });
    });
    test("issue #15761: Cursor doesn't move in a redo operation", () => {
        const model = createTextModel(['hello'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(1, 4, 1, 4)]);
            editor.executeEdits('test', [
                {
                    range: new Range(1, 1, 1, 1),
                    text: '*',
                    forceMoveMarkers: true,
                },
            ]);
            assertCursor(viewModel, [new Selection(1, 5, 1, 5)]);
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [new Selection(1, 4, 1, 4)]);
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [new Selection(1, 5, 1, 5)]);
        });
    });
    test('issue #42783: API Calls with Undo Leave Cursor in Wrong Position', () => {
        const model = createTextModel(['ab'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(1, 1, 1, 1)]);
            editor.executeEdits('test', [
                {
                    range: new Range(1, 1, 1, 3),
                    text: '',
                },
            ]);
            assertCursor(viewModel, [new Selection(1, 1, 1, 1)]);
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assertCursor(viewModel, [new Selection(1, 1, 1, 1)]);
            editor.executeEdits('test', [
                {
                    range: new Range(1, 1, 1, 2),
                    text: '',
                },
            ]);
            assertCursor(viewModel, [new Selection(1, 1, 1, 1)]);
        });
    });
    test('issue #85712: Paste line moves cursor to start of current line rather than start of next line', () => {
        const model = createTextModel(['abc123', ''].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(2, 1, 2, 1)]);
            viewModel.paste('something\n', true);
            assert.strictEqual(model.getValue(), ['abc123', 'something', ''].join('\n'));
            assertCursor(viewModel, new Position(3, 1));
        });
    });
    test('issue #84897: Left delete behavior in some languages is changed', () => {
        const model = createTextModel(['สวัสดี'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(1, 7, 1, 7)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัสด');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวั');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สว');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #122914: Left delete behavior in some languages is changed (useTabStops: false)', () => {
        const model = createTextModel(['สวัสดี'].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            editor.setSelections([new Selection(1, 7, 1, 7)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัสด');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวัส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สวั');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'สว');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ส');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #99629: Emoji modifiers in text treated separately when using backspace', () => {
        const model = createTextModel(['👶🏾'].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            const len = model.getValueLength();
            editor.setSelections([new Selection(1, 1 + len, 1, 1 + len)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #99629: Emoji modifiers in text treated separately when using backspace (ZWJ sequence)', () => {
        const model = createTextModel(['👨‍👩🏽‍👧‍👦'].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            const len = model.getValueLength();
            editor.setSelections([new Selection(1, 1 + len, 1, 1 + len)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '👨‍👩🏽‍👧');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '👨‍👩🏽');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '👨');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '');
        });
    });
    test('issue #105730: move left behaves differently for multiple cursors', () => {
        const model = createTextModel('asdfghjkl, asdfghjkl, asdfghjkl, ');
        withTestCodeEditor(model, {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 24,
        }, (editor, viewModel) => {
            viewModel.setSelections('test', [
                new Selection(1, 10, 1, 12),
                new Selection(1, 21, 1, 23),
                new Selection(1, 32, 1, 34),
            ]);
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, [
                new Selection(1, 10, 1, 10),
                new Selection(1, 21, 1, 21),
                new Selection(1, 32, 1, 32),
            ]);
            viewModel.setSelections('test', [
                new Selection(1, 10, 1, 12),
                new Selection(1, 21, 1, 23),
                new Selection(1, 32, 1, 34),
            ]);
            moveLeft(editor, viewModel, true);
            assertCursor(viewModel, [
                new Selection(1, 10, 1, 11),
                new Selection(1, 21, 1, 22),
                new Selection(1, 32, 1, 33),
            ]);
        });
    });
    test('issue #105730: move right should always skip wrap point', () => {
        const model = createTextModel('asdfghjkl, asdfghjkl, asdfghjkl, \nasdfghjkl,');
        withTestCodeEditor(model, {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 24,
        }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 22, 1, 22)]);
            moveRight(editor, viewModel, false);
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, [new Selection(1, 24, 1, 24)]);
            viewModel.setSelections('test', [new Selection(1, 22, 1, 22)]);
            moveRight(editor, viewModel, true);
            moveRight(editor, viewModel, true);
            assertCursor(viewModel, [new Selection(1, 22, 1, 24)]);
        });
    });
    test('issue #123178: sticky tab in consecutive wrapped lines', () => {
        const model = createTextModel('    aaaa        aaaa', undefined, { tabSize: 4 });
        withTestCodeEditor(model, {
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: 8,
            stickyTabStops: true,
        }, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 9, 1, 9)]);
            moveRight(editor, viewModel, false);
            assertCursor(viewModel, [new Selection(1, 10, 1, 10)]);
            moveLeft(editor, viewModel, false);
            assertCursor(viewModel, [new Selection(1, 9, 1, 9)]);
        });
    });
    test('Cursor honors insertSpaces configuration on new line', () => {
        usingCursor({
            text: ['    \tMy First Line\t ', '\tMy Second Line', '    Third Line', '', '1'],
        }, (editor, model, viewModel) => {
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(1, 21),
                source: 'keyboard',
            });
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    \tMy First Line\t ');
            assert.strictEqual(model.getLineContent(2), '        ');
        });
    });
    test('Cursor honors insertSpaces configuration on tab', () => {
        const model = createTextModel(['    \tMy First Line\t ', 'My Second Line123', '    Third Line', '', '1'].join('\n'), undefined, {
            tabSize: 13,
            indentSize: 13,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            // Tab on column 1
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 1),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '             My Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 2
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 2),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'M            y Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 3
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 3),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My            Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 4
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 4),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My           Second Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 5
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 5),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My S         econd Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 5
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 5),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My S         econd Line123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 13
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 13),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My Second Li ne123');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            // Tab on column 14
            assert.strictEqual(model.getLineContent(2), 'My Second Line123');
            CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
                position: new Position(2, 14),
            });
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'My Second Lin             e123');
        });
    });
    test('Enter auto-indents with insertSpaces setting 1', () => {
        const languageId = setupOnEnterLanguage(IndentAction.Indent);
        usingCursor({
            text: ['\thello'],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(2 /* EndOfLinePreference.CRLF */), '\thello\r\n        ');
        });
    });
    test('Enter auto-indents with insertSpaces setting 2', () => {
        const languageId = setupOnEnterLanguage(IndentAction.None);
        usingCursor({
            text: ['\thello'],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(2 /* EndOfLinePreference.CRLF */), '\thello\r\n    ');
        });
    });
    test('Enter auto-indents with insertSpaces setting 3', () => {
        const languageId = setupOnEnterLanguage(IndentAction.IndentOutdent);
        usingCursor({
            text: ['\thell()'],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 7, false);
            assertCursor(viewModel, new Selection(1, 7, 1, 7));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(2 /* EndOfLinePreference.CRLF */), '\thell(\r\n        \r\n    )');
        });
    });
    test('issue #148256: Pressing Enter creates line with bad indent with insertSpaces: true', () => {
        usingCursor({
            text: ['  \t'],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 4, false);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), '  \t\n    ');
        });
    });
    test('issue #148256: Pressing Enter creates line with bad indent with insertSpaces: false', () => {
        usingCursor({
            text: ['  \t'],
        }, (editor, model, viewModel) => {
            model.updateOptions({
                insertSpaces: false,
            });
            moveTo(editor, viewModel, 1, 4, false);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), '  \t\n\t');
        });
    });
    test('removeAutoWhitespace off', () => {
        usingCursor({
            text: ['    some  line abc  '],
            modelOpts: {
                trimAutoWhitespace: false,
            },
        }, (editor, model, viewModel) => {
            // Move cursor to the end, verify that we do not trim whitespaces if line has values
            moveTo(editor, viewModel, 1, model.getLineContent(1).length + 1);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '    ');
            // Try to enter again, we should trimmed previous line
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '    ');
        });
    });
    test('removeAutoWhitespace on: removes only whitespace the cursor added 1', () => {
        usingCursor({
            text: ['    '],
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, model.getLineContent(1).length + 1);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '    ');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '    ');
        });
    });
    test('issue #115033: indent and appendText', () => {
        const languageId = 'onEnterMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            onEnterRules: [
                {
                    beforeText: /.*/,
                    action: {
                        indentAction: IndentAction.Indent,
                        appendText: 'x',
                    },
                },
            ],
        }));
        usingCursor({
            text: ['text'],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'text');
            assert.strictEqual(model.getLineContent(2), '    x');
            assertCursor(viewModel, new Position(2, 6));
        });
    });
    test('issue #6862: Editor removes auto inserted indentation when formatting on type', () => {
        const languageId = setupOnEnterLanguage(IndentAction.IndentOutdent);
        usingCursor({
            text: ['function foo (params: string) {}'],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 32);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'function foo (params: string) {');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '}');
            class TestCommand {
                constructor() {
                    this._selectionId = null;
                }
                getEditOperations(model, builder) {
                    builder.addEditOperation(new Range(1, 13, 1, 14), '');
                    this._selectionId = builder.trackSelection(viewModel.getSelection());
                }
                computeCursorState(model, helper) {
                    return helper.getTrackedSelection(this._selectionId);
                }
            }
            viewModel.executeCommand(new TestCommand(), 'autoFormat');
            assert.strictEqual(model.getLineContent(1), 'function foo(params: string) {');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '}');
        });
    });
    test('removeAutoWhitespace on: removes only whitespace the cursor added 2', () => {
        const languageId = 'testLang';
        const registration = languageService.registerLanguage({ id: languageId });
        const model = createTextModel(['    if (a) {', '        ', '', '', '    }'].join('\n'), languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 1);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '    ');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '    }');
            moveTo(editor, viewModel, 4, 1);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '    ');
            assert.strictEqual(model.getLineContent(5), '    }');
            moveTo(editor, viewModel, 5, model.getLineMaxColumn(5));
            viewModel.type('something', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '    }something');
        });
        registration.dispose();
    });
    test('removeAutoWhitespace on: test 1', () => {
        const model = createTextModel(['    some  line abc  '].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            // Move cursor to the end, verify that we do not trim whitespaces if line has values
            moveTo(editor, viewModel, 1, model.getLineContent(1).length + 1);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '    ');
            // Try to enter again, we should trimmed previous line
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '    ');
            // More whitespaces
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '        ');
            // Enter and verify that trimmed again
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '        ');
            // Trimmed if we will keep only text
            moveTo(editor, viewModel, 1, 5);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '    some  line abc  ');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '');
            // Trimmed if we will keep only text by selection
            moveTo(editor, viewModel, 2, 5);
            moveTo(editor, viewModel, 3, 1, true);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.strictEqual(model.getLineContent(2), '    ');
            assert.strictEqual(model.getLineContent(3), '    ');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '');
        });
    });
    test('issue #15118: remove auto whitespace when pasting entire line', () => {
        const model = createTextModel([
            '    function f() {',
            "        // I'm gonna copy this line",
            '        return 3;',
            '    }',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, model.getLineMaxColumn(3));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), [
                '    function f() {',
                "        // I'm gonna copy this line",
                '        return 3;',
                '        ',
                '    }',
            ].join('\n'));
            assertCursor(viewModel, new Position(4, model.getLineMaxColumn(4)));
            viewModel.paste("        // I'm gonna copy this line\n", true);
            assert.strictEqual(model.getValue(), [
                '    function f() {',
                "        // I'm gonna copy this line",
                '        return 3;',
                "        // I'm gonna copy this line",
                '',
                '    }',
            ].join('\n'));
            assertCursor(viewModel, new Position(5, 1));
        });
    });
    test('issue #40695: maintain cursor position when copying lines using ctrl+c, ctrl+v', () => {
        const model = createTextModel([
            '    function f() {',
            "        // I'm gonna copy this line",
            '        // Another line',
            '        return 3;',
            '    }',
        ].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(4, 10, 4, 10)]);
            viewModel.paste("        // I'm gonna copy this line\n", true);
            assert.strictEqual(model.getValue(), [
                '    function f() {',
                "        // I'm gonna copy this line",
                '        // Another line',
                "        // I'm gonna copy this line",
                '        return 3;',
                '    }',
            ].join('\n'));
            assertCursor(viewModel, new Position(5, 10));
        });
    });
    test('UseTabStops is off', () => {
        const model = createTextModel(['    x', '        a    ', '    '].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor, viewModel) => {
            // DeleteLeft removes just one whitespace
            moveTo(editor, viewModel, 2, 9);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '       a    ');
        });
    });
    test('Backspace removes whitespaces with tab size', () => {
        const model = createTextModel([' \t \t     x', '        a    ', '    '].join('\n'));
        withTestCodeEditor(model, { useTabStops: true }, (editor, viewModel) => {
            // DeleteLeft does not remove tab size, because some text exists before
            moveTo(editor, viewModel, 2, model.getLineContent(2).length + 1);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '        a   ');
            // DeleteLeft removes tab size = 4
            moveTo(editor, viewModel, 2, 9);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '    a   ');
            // DeleteLeft removes tab size = 4
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'a   ');
            // Undo DeleteLeft - get us back to original indentation
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '        a   ');
            // Nothing is broken when cursor is in (1,1)
            moveTo(editor, viewModel, 1, 1);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \t \t     x');
            // DeleteLeft stops at tab stops even in mixed whitespace case
            moveTo(editor, viewModel, 1, 10);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \t \t    x');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \t \tx');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), ' \tx');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'x');
            // DeleteLeft on last line
            moveTo(editor, viewModel, 3, model.getLineContent(3).length + 1);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(3), '');
            // DeleteLeft with removing new line symbol
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x\n        a   ');
            // In case of selection DeleteLeft only deletes selected text
            moveTo(editor, viewModel, 2, 3);
            moveTo(editor, viewModel, 2, 4, true);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '       a   ');
        });
    });
    test('PR #5423: Auto indent + undo + redo is funky', () => {
        const model = createTextModel([''].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n', 'assert1');
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\t', 'assert2');
            viewModel.type('y', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty', 'assert2');
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\t', 'assert3');
            viewModel.type('x');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\tx', 'assert4');
            CoreNavigationCommands.CursorLeft.runCoreEditorCommand(viewModel, {});
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\tx', 'assert5');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\nx', 'assert6');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\tyx', 'assert7');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\tx', 'assert8');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert9');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert10');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert11');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\nx', 'assert12');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\n\tx', 'assert13');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\n\ty\nx', 'assert14');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '\nx', 'assert15');
            CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'x', 'assert16');
        });
    });
    test('issue #90973: Undo brings back model alternative version', () => {
        const model = createTextModel([''].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            const beforeVersion = model.getVersionId();
            const beforeAltVersion = model.getAlternativeVersionId();
            viewModel.type('Hello', 'keyboard');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            const afterVersion = model.getVersionId();
            const afterAltVersion = model.getAlternativeVersionId();
            assert.notStrictEqual(beforeVersion, afterVersion);
            assert.strictEqual(beforeAltVersion, afterAltVersion);
        });
    });
    test('Enter honors increaseIndentPattern', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            moveTo(editor, viewModel, 3, 13, false);
            assertCursor(viewModel, new Selection(3, 13, 3, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
        });
    });
    test('Type honors decreaseIndentPattern', () => {
        usingCursor({
            text: ['if (true) {', '\t'],
            languageId: indentRulesLanguageId,
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 2, false);
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            viewModel.type('}', 'keyboard');
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            assert.strictEqual(model.getLineContent(2), '}', '001');
        });
    });
    test('Enter honors unIndentedLinePattern', () => {
        usingCursor({
            text: ['if (true) {', '\t\t\treturn true'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 15, false);
            assertCursor(viewModel, new Selection(2, 15, 2, 15));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
        });
    });
    test('Enter honors indentNextLinePattern', () => {
        usingCursor({
            text: ['if (true)', '\treturn true;', 'if (true)', '\t\t\t\treturn true'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 14, false);
            assertCursor(viewModel, new Selection(2, 14, 2, 14));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(3, 1, 3, 1));
            moveTo(editor, viewModel, 5, 16, false);
            assertCursor(viewModel, new Selection(5, 16, 5, 16));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(6, 2, 6, 2));
        });
    });
    test('Enter honors indentNextLinePattern 2', () => {
        const model = createTextModel(['if (true)', '\tif (true)'].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 2, 11, false);
            assertCursor(viewModel, new Selection(2, 11, 2, 11));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('console.log();', 'keyboard');
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
        });
    });
    test('Enter honors intential indent', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {', 'return true;', '}}'],
            languageId: indentRulesLanguageId,
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 13, false);
            assertCursor(viewModel, new Selection(3, 13, 3, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            assert.strictEqual(model.getLineContent(3), 'return true;', '001');
        });
    });
    test('Enter supports selection 1', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {', '\t\treturn true;', '\t}a}'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 4, 3, false);
            moveTo(editor, viewModel, 4, 4, true);
            assertCursor(viewModel, new Selection(4, 3, 4, 4));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 1, 5, 1));
            assert.strictEqual(model.getLineContent(4), '\t}', '001');
        });
    });
    test('Enter supports selection 2', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 12, false);
            moveTo(editor, viewModel, 2, 13, true);
            assertCursor(viewModel, new Selection(2, 12, 2, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
        });
    });
    test('Enter honors tabSize and insertSpaces 1', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {'],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(2, 5, 2, 5));
            model.tokenization.forceTokenization(model.getLineCount());
            moveTo(editor, viewModel, 3, 13, false);
            assertCursor(viewModel, new Selection(3, 13, 3, 13));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 9, 4, 9));
        });
    });
    test('Enter honors tabSize and insertSpaces 2', () => {
        usingCursor({
            text: ['if (true) {', '    if (true) {'],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 5, 2, 5));
            moveTo(editor, viewModel, 3, 16, false);
            assertCursor(viewModel, new Selection(3, 16, 3, 16));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '    if (true) {');
            assertCursor(viewModel, new Selection(4, 9, 4, 9));
        });
    });
    test('Enter honors tabSize and insertSpaces 3', () => {
        usingCursor({
            text: ['if (true) {', '    if (true) {'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 12, false);
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            moveTo(editor, viewModel, 3, 16, false);
            assertCursor(viewModel, new Selection(3, 16, 3, 16));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '    if (true) {');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
        });
    });
    test('Enter supports intentional indentation', () => {
        usingCursor({
            text: [
                '\tif (true) {',
                '\t\tswitch(true) {',
                '\t\t\tcase true:',
                '\t\t\t\tbreak;',
                '\t\t}',
                '\t}',
            ],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 5, 4, false);
            assertCursor(viewModel, new Selection(5, 4, 5, 4));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(5), '\t\t}');
            assertCursor(viewModel, new Selection(6, 3, 6, 3));
        });
    });
    test('Enter should not adjust cursor position when press enter in the middle of a line 1', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {', '\t\treturn true;', '\t}a}'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 9, false);
            assertCursor(viewModel, new Selection(3, 9, 3, 9));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '\t\t true;', '001');
        });
    });
    test('Enter should not adjust cursor position when press enter in the middle of a line 2', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {', '\t\treturn true;', '\t}a}'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3, false);
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '\t\treturn true;', '001');
        });
    });
    test('Enter should not adjust cursor position when press enter in the middle of a line 3', () => {
        usingCursor({
            text: ['if (true) {', '  if (true) {', '    return true;', '  }a}'],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 11, false);
            assertCursor(viewModel, new Selection(3, 11, 3, 11));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 5, 4, 5));
            assert.strictEqual(model.getLineContent(4), '     true;', '001');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 1', () => {
        usingCursor({
            text: ['if (true) {', '\tif (true) {', '\t\treturn true;', '\t}a}'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            assert.strictEqual(model.getLineContent(4), '\t\treturn true;', '001');
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 1, 5, 1));
            assert.strictEqual(model.getLineContent(5), '\t\treturn true;', '002');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 2', () => {
        usingCursor({
            text: ['\tif (true) {', '\t\tif (true) {', '\t    \treturn true;', '\t\t}a}'],
            languageId: indentRulesLanguageId,
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 4, false);
            assertCursor(viewModel, new Selection(3, 4, 3, 4));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '\t\t\treturn true;', '001');
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 1, 5, 1));
            assert.strictEqual(model.getLineContent(5), '\t\t\treturn true;', '002');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 3', () => {
        usingCursor({
            text: ['if (true) {', '  if (true) {', '    return true;', '}a}'],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            assert.strictEqual(model.getLineContent(4), '    return true;', '001');
            moveTo(editor, viewModel, 4, 3, false);
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(5, 3, 5, 3));
            assert.strictEqual(model.getLineContent(5), '    return true;', '002');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 4', () => {
        usingCursor({
            text: [
                'if (true) {',
                '  if (true) {',
                '\t  return true;',
                '}a}',
                '',
                'if (true) {',
                '  if (true) {',
                '\t  return true;',
                '}a}',
            ],
            languageId: indentRulesLanguageId,
            modelOpts: {
                tabSize: 2,
                indentSize: 2,
            },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3, false);
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 4, 4, 4));
            assert.strictEqual(model.getLineContent(4), '    return true;', '001');
            moveTo(editor, viewModel, 9, 4, false);
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(10, 5, 10, 5));
            assert.strictEqual(model.getLineContent(10), '    return true;', '001');
        });
    });
    test('Enter should adjust cursor position when press enter in the middle of leading whitespaces 5', () => {
        usingCursor({
            text: ['if (true) {', '  if (true) {', '    return true;', '    return true;', ''],
            languageId: indentRulesLanguageId,
            modelOpts: { tabSize: 2 },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 5, false);
            moveTo(editor, viewModel, 4, 3, true);
            assertCursor(viewModel, new Selection(3, 5, 4, 3));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            assert.strictEqual(model.getLineContent(4), '    return true;', '001');
        });
    });
    test('issue microsoft/monaco-editor#108 part 1/2: Auto indentation on Enter with selection is half broken', () => {
        usingCursor({
            text: ['function baz() {', '\tvar x = 1;', '\t\t\t\t\t\t\treturn x;', '}'],
            modelOpts: {
                insertSpaces: false,
            },
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 8, false);
            moveTo(editor, viewModel, 2, 12, true);
            assertCursor(viewModel, new Selection(3, 8, 2, 12));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '\treturn x;');
            assertCursor(viewModel, new Position(3, 2));
        });
    });
    test('issue microsoft/monaco-editor#108 part 2/2: Auto indentation on Enter with selection is half broken', () => {
        usingCursor({
            text: ['function baz() {', '\tvar x = 1;', '\t\t\t\t\t\t\treturn x;', '}'],
            modelOpts: {
                insertSpaces: false,
            },
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 12, false);
            moveTo(editor, viewModel, 3, 8, true);
            assertCursor(viewModel, new Selection(2, 12, 3, 8));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(3), '\treturn x;');
            assertCursor(viewModel, new Position(3, 2));
        });
    });
    test('onEnter works if there are no indentation rules', () => {
        usingCursor({
            text: ['<?', '\tif (true) {', '\t\techo $hi;', '\t\techo $bye;', '\t}', '?>'],
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 5, 3, false);
            assertCursor(viewModel, new Selection(5, 3, 5, 3));
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getLineContent(6), '\t');
            assertCursor(viewModel, new Selection(6, 2, 6, 2));
            assert.strictEqual(model.getLineContent(5), '\t}');
        });
    });
    test('onEnter works if there are no indentation rules 2', () => {
        usingCursor({
            text: ['	if (5)', '		return 5;', '	'],
            modelOpts: { insertSpaces: false },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 2, false);
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            viewModel.type('\n', 'keyboard');
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            assert.strictEqual(model.getLineContent(4), '\t');
        });
    });
    test('bug #16543: Tab should indent to correct indentation spot immediately', () => {
        const model = createTextModel(['function baz() {', '\tfunction hello() { // something here', '\t', '', '\t}', '}'].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t');
        });
    });
    test('bug #2938 (1): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '\t',
            '\t\t}',
            '\t}',
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 2, false);
            assertCursor(viewModel, new Selection(4, 2, 4, 2));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t');
        });
    });
    test('bug #2938 (2): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '    ',
            '\t\t}',
            '\t}',
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 1, false);
            assertCursor(viewModel, new Selection(4, 1, 4, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t');
        });
    });
    test('bug #2938 (3): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '\t\t\t',
            '\t\t}',
            '\t}',
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 3, false);
            assertCursor(viewModel, new Selection(4, 3, 4, 3));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t\t');
        });
    });
    test('bug #2938 (4): When pressing Tab on white-space only lines, indent straight to the right spot (similar to empty lines)', () => {
        const model = createTextModel([
            '\tfunction baz() {',
            '\t\tfunction hello() { // something here',
            '\t\t',
            '\t\t\t\t',
            '\t\t}',
            '\t}',
        ].join('\n'), indentRulesLanguageId, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 4, false);
            assertCursor(viewModel, new Selection(4, 4, 4, 4));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(4), '\t\t\t\t\t');
        });
    });
    test('bug #31015: When pressing Tab on lines and Enter rules are avail, indent straight to the right spotTab', () => {
        const onEnterLanguageId = setupOnEnterLanguage(IndentAction.Indent);
        const model = createTextModel(['    if (a) {', '        ', '', '', '    }'].join('\n'), onEnterLanguageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 1);
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '    if (a) {');
            assert.strictEqual(model.getLineContent(2), '        ');
            assert.strictEqual(model.getLineContent(3), '        ');
            assert.strictEqual(model.getLineContent(4), '');
            assert.strictEqual(model.getLineContent(5), '    }');
        });
    });
    test('type honors indentation rules: ruby keywords', () => {
        const rubyLanguageId = setupIndentRulesLanguage('ruby', {
            increaseIndentPattern: /^\s*((begin|class|def|else|elsif|ensure|for|if|module|rescue|unless|until|when|while)|(.*\sdo\b))\b[^\{;]*$/,
            decreaseIndentPattern: /^\s*([}\]]([,)]?\s*(#|$)|\.[a-zA-Z_]\w*\b)|(end|rescue|ensure|else|elsif|when)\b)/,
        });
        const model = createTextModel(['class Greeter', '  def initialize(name)', '    @name = name', '    en'].join('\n'), rubyLanguageId);
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 4, 7, false);
            assertCursor(viewModel, new Selection(4, 7, 4, 7));
            viewModel.type('d', 'keyboard');
            assert.strictEqual(model.getLineContent(4), '  end');
        });
    });
    test('Auto indent on type: increaseIndentPattern has higher priority than decreaseIndent when inheriting', () => {
        usingCursor({
            text: ['\tif (true) {', '\t\tconsole.log();', '\t} else if {', '\t\tconsole.log()', '\t}'],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 5, 3, false);
            assertCursor(viewModel, new Selection(5, 3, 5, 3));
            viewModel.type('e', 'keyboard');
            assertCursor(viewModel, new Selection(5, 4, 5, 4));
            assert.strictEqual(model.getLineContent(5), '\t}e', 'This line should not decrease indent');
        });
    });
    test('type honors users indentation adjustment', () => {
        usingCursor({
            text: ['\tif (true ||', '\t ) {', '\t}', 'if (true ||', ') {', '}'],
            languageId: indentRulesLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 3, false);
            assertCursor(viewModel, new Selection(2, 3, 2, 3));
            viewModel.type(' ', 'keyboard');
            assertCursor(viewModel, new Selection(2, 4, 2, 4));
            assert.strictEqual(model.getLineContent(2), '\t  ) {', 'This line should not decrease indent');
        });
    });
    test('bug 29972: if a line is line comment, open bracket should not indent next line', () => {
        usingCursor({
            text: ['if (true) {', '\t// {', '\t\t'],
            languageId: indentRulesLanguageId,
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3, false);
            assertCursor(viewModel, new Selection(3, 3, 3, 3));
            viewModel.type('}', 'keyboard');
            assertCursor(viewModel, new Selection(3, 2, 3, 2));
            assert.strictEqual(model.getLineContent(3), '}');
        });
    });
    test('issue #38261: TAB key results in bizarre indentation in C++ mode ', () => {
        const languageId = 'indentRulesMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
            indentationRules: {
                increaseIndentPattern: new RegExp('(^.*\\{[^}]*$)'),
                decreaseIndentPattern: new RegExp('^\\s*\\}'),
            },
        }));
        const model = createTextModel([
            'int main() {',
            '  return 0;',
            '}',
            '',
            'bool Foo::bar(const string &a,',
            '              const string &b) {',
            '  foo();',
            '',
            ')',
        ].join('\n'), languageId, {
            tabSize: 2,
            indentSize: 2,
        });
        withTestCodeEditor(model, { autoIndent: 'advanced' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 8, 1, false);
            assertCursor(viewModel, new Selection(8, 1, 8, 1));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), [
                'int main() {',
                '  return 0;',
                '}',
                '',
                'bool Foo::bar(const string &a,',
                '              const string &b) {',
                '  foo();',
                '  ',
                ')',
            ].join('\n'));
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(8, 3, 8, 3));
        });
    });
    test('issue #57197: indent rules regex should be stateless', () => {
        const languageId = setupIndentRulesLanguage('lang', {
            decreaseIndentPattern: /^\s*}$/gm,
            increaseIndentPattern: /^(?![^\S\n]*(?!--|––|——)(?:[-❍❑■⬜□☐▪▫–—≡→›✘xX✔✓☑+]|\[[ xX+-]?\])\s[^\n]*)[^\S\n]*(.+:)[^\S\n]*(?:(?=@[^\s*~(]+(?::\/\/[^\s*~(:]+)?(?:\([^)]*\))?)|$)/gm,
        });
        usingCursor({
            text: ['Project:'],
            languageId: languageId,
            modelOpts: { insertSpaces: false },
            editorOpts: { autoIndent: 'full' },
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 9, false);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
            moveTo(editor, viewModel, 1, 9, false);
            assertCursor(viewModel, new Selection(1, 9, 1, 9));
            viewModel.type('\n', 'keyboard');
            model.tokenization.forceTokenization(model.getLineCount());
            assertCursor(viewModel, new Selection(2, 2, 2, 2));
        });
    });
    test('typing in json', () => {
        const languageId = 'indentRulesMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
            indentationRules: {
                increaseIndentPattern: new RegExp('({+(?=([^"]*"[^"]*")*[^"}]*$))|(\\[+(?=([^"]*"[^"]*")*[^"\\]]*$))'),
                decreaseIndentPattern: new RegExp('^\\s*[}\\]],?\\s*$'),
            },
        }));
        const model = createTextModel([
            '{',
            '  "scripts: {"',
            '    "watch": "a {"',
            '    "build{": "b"',
            '    "tasks": []',
            '    "tasks": ["a"]',
            '  "}"',
            '"}"',
        ].join('\n'), languageId, {
            tabSize: 2,
            indentSize: 2,
        });
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 3, 19, false);
            assertCursor(viewModel, new Selection(3, 19, 3, 19));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(4), '    ');
            moveTo(editor, viewModel, 5, 18, false);
            assertCursor(viewModel, new Selection(5, 18, 5, 18));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(6), '    ');
            moveTo(editor, viewModel, 7, 15, false);
            assertCursor(viewModel, new Selection(7, 15, 7, 15));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(8), '      ');
            assert.deepStrictEqual(model.getLineContent(9), '    ]');
            moveTo(editor, viewModel, 10, 18, false);
            assertCursor(viewModel, new Selection(10, 18, 10, 18));
            viewModel.type('\n', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(11), '    ]');
        });
    });
    test('issue #111128: Multicursor `Enter` issue with indentation', () => {
        const model = createTextModel('    let a, b, c;', indentRulesLanguageId, {
            detectIndentation: false,
            insertSpaces: false,
            tabSize: 4,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(1, 11, 1, 11), new Selection(1, 14, 1, 14)]);
            viewModel.type('\n', 'keyboard');
            assert.strictEqual(model.getValue(), '    let a,\n\t b,\n\t c;');
        });
    });
    test('issue #122714: tabSize=1 prevent typing a string matching decreaseIndentPattern in an empty file', () => {
        const latextLanguageId = setupIndentRulesLanguage('latex', {
            increaseIndentPattern: new RegExp('\\\\begin{(?!document)([^}]*)}(?!.*\\\\end{\\1})'),
            decreaseIndentPattern: new RegExp('^\\s*\\\\end{(?!document)'),
        });
        const model = createTextModel('\\end', latextLanguageId, { tabSize: 1 });
        withTestCodeEditor(model, { autoIndent: 'full' }, (editor, viewModel) => {
            moveTo(editor, viewModel, 1, 5, false);
            assertCursor(viewModel, new Selection(1, 5, 1, 5));
            viewModel.type('{', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '\\end{}');
        });
    });
    test('ElectricCharacter - does nothing if no electric char', () => {
        usingCursor({
            text: ['  if (a) {', ''],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '*');
        });
    });
    test('ElectricCharacter - indents in order to match bracket', () => {
        usingCursor({
            text: ['  if (a) {', ''],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }');
        });
    });
    test('ElectricCharacter - unindents in order to match bracket', () => {
        usingCursor({
            text: ['  if (a) {', '    '],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 5);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }');
        });
    });
    test('ElectricCharacter - matches with correct bracket', () => {
        usingCursor({
            text: ['  if (a) {', '    if (b) {', '    }', '    '],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 4, 1);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(4), '  }    ');
        });
    });
    test('ElectricCharacter - does nothing if bracket does not match', () => {
        usingCursor({
            text: ['  if (a) {', '    if (b) {', '    }', '  }  '],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 4, 6);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(4), '  }  }');
        });
    });
    test('ElectricCharacter - matches bracket even in line with content', () => {
        usingCursor({
            text: ['  if (a) {', '// hello'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 1);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }// hello');
        });
    });
    test('ElectricCharacter - is no-op if bracket is lined up', () => {
        usingCursor({
            text: ['  if (a) {', '  '],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 3);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  }');
        });
    });
    test('ElectricCharacter - is no-op if there is non-whitespace text before', () => {
        usingCursor({
            text: ['  if (a) {', 'a'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 2);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), 'a}');
        });
    });
    test('ElectricCharacter - is no-op if pairs are all matched before', () => {
        usingCursor({
            text: ['foo(() => {', '  ( 1 + 2 ) ', '})'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 13);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  ( 1 + 2 ) *');
        });
    });
    test('ElectricCharacter - is no-op if matching bracket is on the same line', () => {
        usingCursor({
            text: ['(div'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 1, 5);
            let changeText = null;
            const disposable = model.onDidChangeContent((e) => {
                changeText = e.changes[0].text;
            });
            viewModel.type(')', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(1), '(div)');
            assert.deepStrictEqual(changeText, ')');
            disposable.dispose();
        });
    });
    test('ElectricCharacter - is no-op if the line has other content', () => {
        usingCursor({
            text: ['Math.max(', '\t2', '\t3'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 3, 3);
            viewModel.type(')', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(3), '\t3)');
        });
    });
    test('ElectricCharacter - appends text', () => {
        usingCursor({
            text: ['  if (a) {', '/*'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 3);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '/** */');
        });
    });
    test('ElectricCharacter - appends text 2', () => {
        usingCursor({
            text: ['  if (a) {', '  /*'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 5);
            viewModel.type('*', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '  /** */');
        });
    });
    test('ElectricCharacter - issue #23711: Replacing selected text with )]} fails to delete old text with backwards-dragged selection', () => {
        usingCursor({
            text: ['{', 'word'],
            languageId: electricCharLanguageId,
        }, (editor, model, viewModel) => {
            moveTo(editor, viewModel, 2, 5);
            moveTo(editor, viewModel, 2, 1, true);
            viewModel.type('}', 'keyboard');
            assert.deepStrictEqual(model.getLineContent(2), '}');
        });
    });
    test('issue #61070: backtick (`) should auto-close after a word character', () => {
        usingCursor({
            text: ['const markup = highlight'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            model.tokenization.forceTokenization(1);
            assertType(editor, model, viewModel, 1, 25, '`', '``', `auto closes \` @ (1, 25)`);
        });
    });
    test('issue #132912: quotes should not auto-close if they are closing a string', () => {
        setupAutoClosingLanguageTokenization();
        const model = createTextModel('const t2 = `something ${t1}', autoClosingLanguageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            const model = viewModel.model;
            model.tokenization.forceTokenization(1);
            assertType(editor, model, viewModel, 1, 28, '`', '`', `does not auto close \` @ (1, 28)`);
        });
    });
    test('autoClosingPairs - open parens: default', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                "var c = 'asd';",
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                "var h = { a: 'value' };",
            ],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var| a| |=| [|]|;|',
                'var| b| |=| |`asd|`|;|',
                "var| c| |=| |'asd|'|;|",
                'var| d| |=| |"asd|"|;|',
                'var| e| |=| /*3*/|	3|;|',
                'var| f| |=| /**| 3| */3|;|',
                'var| g| |=| (3+5|)|;|',
                "var| h| |=| {| a|:| |'value|'| |}|;|",
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - open parens: whitespace', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                "var c = 'asd';",
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                "var h = { a: 'value' };",
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'beforeWhitespace',
            },
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var| a| =| [|];|',
                'var| b| =| `asd`;|',
                "var| c| =| 'asd';|",
                'var| d| =| "asd";|',
                'var| e| =| /*3*/|	3;|',
                'var| f| =| /**| 3| */3;|',
                'var| g| =| (3+5|);|',
                "var| h| =| {| a:| 'value'| |};|",
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - open parens disabled/enabled open quotes enabled/disabled', () => {
        usingCursor({
            text: ['var a = [];'],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'beforeWhitespace',
                autoClosingQuotes: 'never',
            },
        }, (editor, model, viewModel) => {
            const autoClosePositions = ['var| a| =| [|];|'];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                    assertType(editor, model, viewModel, lineNumber, column, "'", "'", `does not auto close @ (${lineNumber}, ${column})`);
                }
            }
        });
        usingCursor({
            text: ['var b = [];'],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'never',
                autoClosingQuotes: 'beforeWhitespace',
            },
        }, (editor, model, viewModel) => {
            const autoClosePositions = ['var b =| [|];|'];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, "'", "''", `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, "'", "'", `does not auto close @ (${lineNumber}, ${column})`);
                    }
                    assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                }
            }
        });
    });
    test('autoClosingPairs - configurable open parens', () => {
        setAutoClosingLanguageEnabledSet('abc');
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                "var c = 'asd';",
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                "var h = { a: 'value' };",
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'languageDefined',
            },
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'v|ar |a = [|];|',
                'v|ar |b = `|asd`;|',
                "v|ar |c = '|asd';|",
                'v|ar d = "|asd";|',
                'v|ar e = /*3*/	3;|',
                'v|ar f = /** 3| */3;|',
                'v|ar g = (3+5|);|',
                "v|ar h = { |a: 'v|alue' |};|",
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - auto-pairing can be disabled', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                "var c = 'asd';",
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                "var h = { a: 'value' };",
            ],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingBrackets: 'never',
                autoClosingQuotes: 'never',
            },
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var a = [];',
                'var b = `asd`;',
                "var c = 'asd';",
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                "var h = { a: 'value' };",
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '()', `auto closes @ (${lineNumber}, ${column})`);
                        assertType(editor, model, viewModel, lineNumber, column, '"', '""', `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, '(', '(', `does not auto close @ (${lineNumber}, ${column})`);
                        assertType(editor, model, viewModel, lineNumber, column, '"', '"', `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - auto wrapping is configurable', () => {
        usingCursor({
            text: ['var a = asd'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 4), new Selection(1, 9, 1, 12)]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '`var` a = `asd`');
            // type a (
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '`(var)` a = `(asd)`');
        });
        usingCursor({
            text: ['var a = asd'],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoSurround: 'never',
            },
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 4)]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '` a = asd');
        });
        usingCursor({
            text: ['var a = asd'],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoSurround: 'quotes',
            },
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 4)]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '`var` a = asd');
            // type a (
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '`(` a = asd');
        });
        usingCursor({
            text: ['var a = asd'],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoSurround: 'brackets',
            },
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 4)]);
            // type a (
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '(var) a = asd');
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), '(`) a = asd');
        });
    });
    test('autoClosingPairs - quote', () => {
        usingCursor({
            text: [
                'var a = [];',
                'var b = `asd`;',
                "var c = 'asd';",
                'var d = "asd";',
                'var e = /*3*/	3;',
                'var f = /** 3 */3;',
                'var g = (3+5);',
                "var h = { a: 'value' };",
            ],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            const autoClosePositions = [
                'var a |=| [|]|;|',
                'var b |=| `asd`|;|',
                "var c |=| 'asd'|;|",
                'var d |=| "asd"|;|',
                'var e |=| /*3*/|	3;|',
                'var f |=| /**| 3 */3;|',
                'var g |=| (3+5)|;|',
                "var h |=| {| a:| 'value'| |}|;|",
            ];
            for (let i = 0, len = autoClosePositions.length; i < len; i++) {
                const lineNumber = i + 1;
                const autoCloseColumns = extractAutoClosingSpecialColumns(model.getLineMaxColumn(lineNumber), autoClosePositions[i]);
                for (let column = 1; column < autoCloseColumns.length; column++) {
                    model.tokenization.forceTokenization(lineNumber);
                    if (autoCloseColumns[column] === 1 /* AutoClosingColumnType.Special1 */) {
                        assertType(editor, model, viewModel, lineNumber, column, "'", "''", `auto closes @ (${lineNumber}, ${column})`);
                    }
                    else if (autoCloseColumns[column] === 2 /* AutoClosingColumnType.Special2 */) {
                        assertType(editor, model, viewModel, lineNumber, column, "'", '', `over types @ (${lineNumber}, ${column})`);
                    }
                    else {
                        assertType(editor, model, viewModel, lineNumber, column, "'", "'", `does not auto close @ (${lineNumber}, ${column})`);
                    }
                }
            }
        });
    });
    test('autoClosingPairs - multi-character autoclose', () => {
        usingCursor({
            text: [''],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            model.setValue('begi');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.type('n', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'beginend');
            model.setValue('/*');
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '/** */');
        });
    });
    test('autoClosingPairs - doc comments can be turned off', () => {
        usingCursor({
            text: [''],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingComments: 'never',
            },
        }, (editor, model, viewModel) => {
            model.setValue('/*');
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '/**');
        });
    });
    test('issue #72177: multi-character autoclose with conflicting patterns', () => {
        const languageId = 'autoClosingModeMultiChar';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '(', close: ')' },
                { open: '(*', close: '*)' },
                { open: '<@', close: '@>' },
                { open: '<@@', close: '@@>' },
            ],
        }));
        usingCursor({
            text: [''],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '()');
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '(**)', `doesn't add entire close when already closed substring is there`);
            model.setValue('(');
            viewModel.setSelections('test', [new Selection(1, 2, 1, 2)]);
            viewModel.type('*', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '(**)', `does add entire close if not already there`);
            model.setValue('');
            viewModel.type('<@', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<@@>');
            viewModel.type('@', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<@@@@>', `autocloses when before multi-character closing brace`);
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<@@()@@>', `autocloses when before multi-character closing brace`);
        });
    });
    test('issue #55314: Do not auto-close when ending with open', () => {
        const languageId = 'myElectricMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: "'", close: "'", notIn: ['string', 'comment'] },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: 'B\"', close: '\"', notIn: ['string', 'comment'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] },
                { open: '/**', close: ' */', notIn: ['string'] },
            ],
        }));
        usingCursor({
            text: ['little goat', 'little LAMB', 'little sheep', 'Big LAMB'],
            languageId: languageId,
        }, (editor, model, viewModel) => {
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 1, 4, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 2, 4, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 3, 4, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 4, 2, '"', '"', `does not double quote when ending with open`);
            model.tokenization.forceTokenization(model.getLineCount());
            assertType(editor, model, viewModel, 4, 3, '"', '"', `does not double quote when ending with open`);
        });
    });
    test('issue #27937: Trying to add an item to the front of a list is cumbersome', () => {
        usingCursor({
            text: ['var arr = ["b", "c"];'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertType(editor, model, viewModel, 1, 12, '"', '"', `does not over type and will not auto close`);
        });
    });
    test('issue #25658 - Do not auto-close single/double quotes after word characters', () => {
        usingCursor({
            text: [''],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            function typeCharacters(viewModel, chars) {
                for (let i = 0, len = chars.length; i < len; i++) {
                    viewModel.type(chars[i], 'keyboard');
                }
            }
            // First gif
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, "teste1 = teste' ok");
            assert.strictEqual(model.getLineContent(1), "teste1 = teste' ok");
            viewModel.setSelections('test', [new Selection(1, 1000, 1, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, "teste2 = teste 'ok");
            assert.strictEqual(model.getLineContent(2), "teste2 = teste 'ok'");
            viewModel.setSelections('test', [new Selection(2, 1000, 2, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste3 = teste" ok');
            assert.strictEqual(model.getLineContent(3), 'teste3 = teste" ok');
            viewModel.setSelections('test', [new Selection(3, 1000, 3, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste4 = teste "ok');
            assert.strictEqual(model.getLineContent(4), 'teste4 = teste "ok"');
            // Second gif
            viewModel.setSelections('test', [new Selection(4, 1000, 4, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, "teste '");
            assert.strictEqual(model.getLineContent(5), "teste ''");
            viewModel.setSelections('test', [new Selection(5, 1000, 5, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste "');
            assert.strictEqual(model.getLineContent(6), 'teste ""');
            viewModel.setSelections('test', [new Selection(6, 1000, 6, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, "teste'");
            assert.strictEqual(model.getLineContent(7), "teste'");
            viewModel.setSelections('test', [new Selection(7, 1000, 7, 1000)]);
            typeCharacters(viewModel, '\n');
            model.tokenization.forceTokenization(model.getLineCount());
            typeCharacters(viewModel, 'teste"');
            assert.strictEqual(model.getLineContent(8), 'teste"');
        });
    });
    test('issue #37315 - overtypes only those characters that it inserted', () => {
        usingCursor({
            text: ['', 'y=();'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type('asd', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(asd)');
            // overtype!
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(asd)');
            // do not overtype!
            viewModel.setSelections('test', [new Selection(2, 4, 2, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'y=());');
        });
    });
    test('issue #37315 - stops overtyping once cursor leaves area', () => {
        usingCursor({
            text: ['', 'y=();'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=())');
        });
    });
    test('issue #37315 - it overtypes only once', () => {
        usingCursor({
            text: ['', 'y=();'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=())');
        });
    });
    test('issue #37315 - it can remember multiple auto-closed instances', () => {
        usingCursor({
            text: ['', 'y=();'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(())');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(())');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(())');
        });
    });
    test('issue #118270 - auto closing deletes only those characters that it inserted', () => {
        usingCursor({
            text: ['', 'y=();'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type('asd', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=(asd)');
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'x=()');
            // delete closing char!
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'x=');
            // do not delete closing char!
            viewModel.setSelections('test', [new Selection(2, 4, 2, 4)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'y=);');
        });
    });
    test('issue #78527 - does not close quote on odd count', () => {
        usingCursor({
            text: ["std::cout << '\"' << entryMap"],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 29, 1, 29)]);
            viewModel.type('[', 'keyboard');
            assert.strictEqual(model.getLineContent(1), "std::cout << '\"' << entryMap[]");
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap[""]');
            viewModel.type('a', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap["a"]');
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap["a"]');
            viewModel.type(']', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'std::cout << \'"\' << entryMap["a"]');
        });
    });
    test('issue #85983 - editor.autoClosingBrackets: beforeWhitespace is incorrect for Python', () => {
        const languageId = 'pythonMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '\"', close: '\"', notIn: ['string'] },
                { open: 'r\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'R\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'u\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'U\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'f\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'F\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'b\"', close: '\"', notIn: ['string', 'comment'] },
                { open: 'B\"', close: '\"', notIn: ['string', 'comment'] },
                { open: "'", close: "'", notIn: ['string', 'comment'] },
                { open: "r'", close: "'", notIn: ['string', 'comment'] },
                { open: "R'", close: "'", notIn: ['string', 'comment'] },
                { open: "u'", close: "'", notIn: ['string', 'comment'] },
                { open: "U'", close: "'", notIn: ['string', 'comment'] },
                { open: "f'", close: "'", notIn: ['string', 'comment'] },
                { open: "F'", close: "'", notIn: ['string', 'comment'] },
                { open: "b'", close: "'", notIn: ['string', 'comment'] },
                { open: "B'", close: "'", notIn: ['string', 'comment'] },
                { open: '`', close: '`', notIn: ['string'] },
            ],
        }));
        usingCursor({
            text: ["foo'hello'"],
            editorOpts: {
                autoClosingBrackets: 'beforeWhitespace',
            },
            languageId: languageId,
        }, (editor, model, viewModel) => {
            assertType(editor, model, viewModel, 1, 4, '(', '(', `does not auto close @ (1, 4)`);
        });
    });
    test('issue #78975 - Parentheses swallowing does not work when parentheses are inserted by autocomplete', () => {
        usingCursor({
            text: ['<div id'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 8, 1, 8)]);
            viewModel.executeEdits('snippet', [{ range: new Range(1, 6, 1, 8), text: 'id=""' }], () => [
                new Selection(1, 10, 1, 10),
            ]);
            assert.strictEqual(model.getLineContent(1), '<div id=""');
            viewModel.type('a', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<div id="a"');
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getLineContent(1), '<div id="a"');
        });
    });
    test('issue #78833 - Add config to use old brackets/quotes overtyping', () => {
        usingCursor({
            text: ['', 'y=();'],
            languageId: autoClosingLanguageId,
            editorOpts: {
                autoClosingOvertype: 'always',
            },
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            viewModel.type('x=(', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'x=()');
            viewModel.setSelections('test', [new Selection(2, 4, 2, 4)]);
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'y=();');
        });
    });
    test('issue #15825: accents on mac US intl keyboard', () => {
        usingCursor({
            text: [],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // Typing ` + e on the mac US intl kb layout
            viewModel.startComposition();
            viewModel.type('`', 'keyboard');
            viewModel.compositionType('è', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), 'è');
        });
    });
    test('issue #90016: allow accents on mac US intl keyboard to surround selection', () => {
        usingCursor({
            text: ['test'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 5)]);
            // Typing ` + e on the mac US intl kb layout
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), "'test'");
        });
    });
    test('issue #53357: Over typing ignores characters after backslash', () => {
        usingCursor({
            text: ['console.log();'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 13, 1, 13)]);
            viewModel.type("'", 'keyboard');
            assert.strictEqual(model.getValue(), "console.log('');");
            viewModel.type('it', 'keyboard');
            assert.strictEqual(model.getValue(), "console.log('it');");
            viewModel.type('\\', 'keyboard');
            assert.strictEqual(model.getValue(), "console.log('it\\');");
            viewModel.type("'", 'keyboard');
            assert.strictEqual(model.getValue(), "console.log('it\\'');");
        });
    });
    test("issue #84998: Overtyping Brackets doesn't work after backslash", () => {
        usingCursor({
            text: [''],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            viewModel.type('\\', 'keyboard');
            assert.strictEqual(model.getValue(), '\\');
            viewModel.type('(', 'keyboard');
            assert.strictEqual(model.getValue(), '\\()');
            viewModel.type('abc', 'keyboard');
            assert.strictEqual(model.getValue(), '\\(abc)');
            viewModel.type('\\', 'keyboard');
            assert.strictEqual(model.getValue(), '\\(abc\\)');
            viewModel.type(')', 'keyboard');
            assert.strictEqual(model.getValue(), '\\(abc\\)');
        });
    });
    test('issue #2773: Accents (´`¨^, others?) are inserted in the wrong position (Mac)', () => {
        usingCursor({
            text: ['hello', 'world'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // Typing ` and pressing shift+down on the mac US intl kb layout
            // Here we're just replaying what the cursor gets
            viewModel.startComposition();
            viewModel.type('`', 'keyboard');
            moveDown(editor, viewModel, true);
            viewModel.compositionType('`', 1, 0, 0, 'keyboard');
            viewModel.compositionType('`', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '`hello\nworld');
            assertCursor(viewModel, new Selection(1, 2, 2, 2));
        });
    });
    test('issue #26820: auto close quotes when not used as accents', () => {
        usingCursor({
            text: [''],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // on the mac US intl kb layout
            // Typing ' + space
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), "''");
            // Typing one more ' + space
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), "''");
            // Typing ' as a closing tag
            model.setValue("'abc");
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), "'abc'");
            // quotes before the newly added character are all paired.
            model.setValue("'abc'def ");
            viewModel.setSelections('test', [new Selection(1, 10, 1, 10)]);
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), "'abc'def ''");
            // No auto closing if there is non-whitespace character after the cursor
            model.setValue('abc');
            viewModel.setSelections('test', [new Selection(1, 1, 1, 1)]);
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            // No auto closing if it's after a word.
            model.setValue('abc');
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4)]);
            viewModel.startComposition();
            viewModel.type("'", 'keyboard');
            viewModel.compositionType("'", 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), "abc'");
        });
    });
    test('issue #144690: Quotes do not overtype when using US Intl PC keyboard layout', () => {
        usingCursor({
            text: [''],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            assertCursor(viewModel, new Position(1, 1));
            // Pressing ' + ' + ;
            viewModel.startComposition();
            viewModel.type(`'`, 'keyboard');
            viewModel.compositionType(`'`, 1, 0, 0, 'keyboard');
            viewModel.compositionType(`'`, 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            viewModel.startComposition();
            viewModel.type(`'`, 'keyboard');
            viewModel.compositionType(`';`, 1, 0, 0, 'keyboard');
            viewModel.compositionType(`';`, 2, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), `'';`);
        });
    });
    test('issue #144693: Typing a quote using US Intl PC keyboard layout always surrounds words', () => {
        usingCursor({
            text: ['const hello = 3;'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 7, 1, 12)]);
            // Pressing ' + e
            viewModel.startComposition();
            viewModel.type(`'`, 'keyboard');
            viewModel.compositionType(`é`, 1, 0, 0, 'keyboard');
            viewModel.compositionType(`é`, 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), `const é = 3;`);
        });
    });
    test('issue #82701: auto close does not execute when IME is canceled via backspace', () => {
        usingCursor({
            text: ['{}'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 2, 1, 2)]);
            // Typing a + backspace
            viewModel.startComposition();
            viewModel.type('a', 'keyboard');
            viewModel.compositionType('', 1, 0, 0, 'keyboard');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(), '{}');
        });
    });
    test('issue #20891: All cursors should do the same thing', () => {
        usingCursor({
            text: ['var a = asd'],
            languageId: autoClosingLanguageId,
        }, (editor, model, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 9, 1, 9), new Selection(1, 12, 1, 12)]);
            // type a `
            viewModel.type('`', 'keyboard');
            assert.strictEqual(model.getValue(), 'var a = `asd`');
        });
    });
    test('issue #41825: Special handling of quotes in surrounding pairs', () => {
        const languageId = 'myMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            surroundingPairs: [
                { open: '"', close: '"' },
                { open: "'", close: "'" },
            ],
        }));
        const model = createTextModel("var x = 'hi';", languageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            editor.setSelections([new Selection(1, 9, 1, 10), new Selection(1, 12, 1, 13)]);
            viewModel.type('"', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'var x = "hi";', 'assert1');
            editor.setSelections([new Selection(1, 9, 1, 10), new Selection(1, 12, 1, 13)]);
            viewModel.type("'", 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), "var x = 'hi';", 'assert2');
        });
    });
    test('All cursors should do the same thing when deleting left', () => {
        const model = createTextModel(['var a = ()'].join('\n'), autoClosingLanguageId);
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 4, 1, 4), new Selection(1, 10, 1, 10)]);
            // delete left
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'va a = )');
        });
    });
    test('issue #7100: Mouse word selection is strange when non-word character is at the end of line', () => {
        const model = createTextModel(['before.a', 'before', 'hello:', 'there:', 'this is strange:', 'here', 'it', 'is'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runEditorCommand(null, editor, {
                position: new Position(3, 7),
            });
            assertCursor(viewModel, new Selection(3, 7, 3, 7));
            CoreNavigationCommands.WordSelectDrag.runEditorCommand(null, editor, {
                position: new Position(4, 7),
            });
            assertCursor(viewModel, new Selection(3, 7, 4, 7));
        });
    });
    test('issue #112039: shift-continuing a double/triple-click and drag selection does not remember its starting mode', () => {
        const model = createTextModel(['just some text', 'and another line', 'and another one'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.WordSelect.runEditorCommand(null, editor, {
                position: new Position(2, 6),
            });
            CoreNavigationCommands.MoveToSelect.runEditorCommand(null, editor, {
                position: new Position(1, 8),
            });
            assertCursor(viewModel, new Selection(2, 12, 1, 6));
        });
    });
    test('issue #158236: Shift click selection does not work on line number indicator', () => {
        const model = createTextModel(['just some text', 'and another line', 'and another one'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            CoreNavigationCommands.MoveTo.runEditorCommand(null, editor, {
                position: new Position(3, 5),
            });
            CoreNavigationCommands.LineSelectDrag.runEditorCommand(null, editor, {
                position: new Position(2, 1),
            });
            assertCursor(viewModel, new Selection(3, 5, 2, 1));
        });
    });
    test('issue #111513: Text gets automatically selected when typing at the same location in another editor', () => {
        const model = createTextModel(['just', '', 'some text'].join('\n'));
        withTestCodeEditor(model, {}, (editor1, viewModel1) => {
            editor1.setSelections([new Selection(2, 1, 2, 1)]);
            withTestCodeEditor(model, {}, (editor2, viewModel2) => {
                editor2.setSelections([new Selection(2, 1, 2, 1)]);
                viewModel2.type('e', 'keyboard');
                assertCursor(viewModel2, new Position(2, 2));
                assertCursor(viewModel1, new Position(2, 2));
            });
        });
    });
});
suite('Undo stops', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('there is an undo stop between typing and deleting left', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A fir line');
            assertCursor(viewModel, new Selection(1, 6, 1, 6));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A  line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('there is an undo stop between typing and deleting right', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A firstine');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A  line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting left and typing', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 8, 2, 8)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            viewModel.type('Second', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assertCursor(viewModel, new Selection(2, 7, 2, 7));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 8, 2, 8));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting left and deleting right', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 8, 2, 8)]);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), '');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), ' line');
            assertCursor(viewModel, new Selection(2, 1, 2, 1));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 8, 2, 8));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting right and typing', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 9, 2, 9)]);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            viewModel.type('text', 'keyboard');
            assert.strictEqual(model.getLineContent(2), 'Another text');
            assertCursor(viewModel, new Selection(2, 13, 2, 13));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
        });
        model.dispose();
    });
    test('there is an undo stop between deleting right and deleting left', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 9, 2, 9)]);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'An');
            assertCursor(viewModel, new Selection(2, 3, 2, 3));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another ');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(2), 'Another line');
            assertCursor(viewModel, new Selection(2, 9, 2, 9));
        });
        model.dispose();
    });
    test('inserts undo stop when typing space', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first and interesting', 'keyboard');
            assert.strictEqual(model.getLineContent(1), 'A first and interesting line');
            assertCursor(viewModel, new Selection(1, 24, 1, 24));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first and line');
            assertCursor(viewModel, new Selection(1, 12, 1, 12));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A first line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), 'A  line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('can undo typing and EOL change in one undo stop', () => {
        const model = createTextModel(['A  line', 'Another line'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('first', 'keyboard');
            assert.strictEqual(model.getValue(), 'A first line\nAnother line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            model.pushEOL(1 /* EndOfLineSequence.CRLF */);
            assert.strictEqual(model.getValue(), 'A first line\r\nAnother line');
            assertCursor(viewModel, new Selection(1, 8, 1, 8));
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'A  line\nAnother line');
            assertCursor(viewModel, new Selection(1, 3, 1, 3));
        });
        model.dispose();
    });
    test('issue #93585: Undo multi cursor edit corrupts document', () => {
        const model = createTextModel(['hello world', 'hello world'].join('\n'));
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(2, 7, 2, 12), new Selection(1, 7, 1, 12)]);
            viewModel.type('no', 'keyboard');
            assert.strictEqual(model.getValue(), 'hello no\nhello no');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(), 'hello world\nhello world');
        });
        model.dispose();
    });
    test('there is a single undo stop for consecutive whitespaces', () => {
        const model = createTextModel([''].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('a', 'keyboard');
            viewModel.type('b', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type('c', 'keyboard');
            viewModel.type('d', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab  cd', 'assert1');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab  ', 'assert2');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab', 'assert3');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '', 'assert4');
        });
        model.dispose();
    });
    test('there is no undo stop after a single whitespace', () => {
        const model = createTextModel([''].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.type('a', 'keyboard');
            viewModel.type('b', 'keyboard');
            viewModel.type(' ', 'keyboard');
            viewModel.type('c', 'keyboard');
            viewModel.type('d', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab cd', 'assert1');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), 'ab', 'assert3');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), '', 'assert4');
        });
        model.dispose();
    });
});
suite('Overtype Mode', () => {
    setup(() => {
        InputMode.setInputMode('overtype');
    });
    teardown(() => {
        InputMode.setInputMode('insert');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('simple type', () => {
        const model = createTextModel(['123456789', '123456789'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 3, 1, 3)]);
            viewModel.type('a', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['12a456789', '123456789'].join('\n'), 'assert1');
            viewModel.setSelections('test', [new Selection(1, 9, 1, 9)]);
            viewModel.type('bbb', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['12a45678bbb', '123456789'].join('\n'), 'assert2');
        });
        model.dispose();
    });
    test('multi-line selection type', () => {
        const model = createTextModel(['123456789', '123456789'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 2, 3)]);
            viewModel.type('cc', 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234cc456789'].join('\n'), 'assert1');
        });
        model.dispose();
    });
    test('simple paste', () => {
        const model = createTextModel(['123456789', '123456789'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.paste('cc', false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234cc789', '123456789'].join('\n'), 'assert1');
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.paste('dddddddd', false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234dddddddd', '123456789'].join('\n'), 'assert2');
        });
        model.dispose();
    });
    test('multi-line selection paste', () => {
        const model = createTextModel(['123456789', '123456789'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 2, 3)]);
            viewModel.paste('cc', false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234cc456789'].join('\n'), 'assert1');
        });
        model.dispose();
    });
    test('paste multi-line text', () => {
        const model = createTextModel(['123456789', '123456789'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.paste(['aaaaaaa', 'bbbbbbb'].join('\n'), false);
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234aaaaaaa', 'bbbbbbb', '123456789'].join('\n'), 'assert1');
        });
        model.dispose();
    });
    test('composition type', () => {
        const model = createTextModel(['123456789', '123456789'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor, viewModel) => {
            viewModel.setSelections('test', [new Selection(1, 5, 1, 5)]);
            viewModel.startComposition();
            viewModel.compositionType('セ', 0, 0, 0, 'keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234セ56789', '123456789'].join('\n'), 'assert1');
            viewModel.endComposition('keyboard');
            assert.strictEqual(model.getValue(1 /* EndOfLinePreference.LF */), ['1234セ6789', '123456789'].join('\n'), 'assert1');
        });
        model.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvY29udHJvbGxlci9jdXJzb3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVE3RCxPQUFPLEVBQ04seUJBQXlCLEVBR3pCLG9CQUFvQixHQUNwQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQW1CLE1BQU0sb0RBQW9ELENBQUE7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUc5RCxPQUFPLEVBR04sd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixrQkFBa0IsR0FDbEIsTUFBTSxzQkFBc0IsQ0FB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QUE7UUFDcEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLHNCQUFzQjtJQUV0QixJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtRQUN0QixPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM1QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUNyQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDakMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNsRCxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNqQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEQsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDakMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtRQUNoQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDN0IsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9CLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzVDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixvQkFBb0I7SUFFcEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDcEIsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTNDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUzQyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDbkMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTNDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQy9CLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMvQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDdkMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQixRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN6QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2REFBNkQsRUFBRSxHQUFHLEVBQUU7UUFDeEUsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN6QixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDekIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNELENBQUMsQ0FBQyxDQUFBO0lB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QUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9CLGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFELGVBQWUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1FBQy9ELE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM3QixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDaEMsZUFBZSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUQsZUFBZSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0QsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7UUFDM0QsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFB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LEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVELFNBQVMsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDNUIsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFM0MsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDM0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUUzQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxRQUFRLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0MsUUFBUSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUMzQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMs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QyxFQUNaLEVBQUUsRUFDRixDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNyQixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3hDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxRQUFRLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFN0Msc0JBQXNCLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2pGLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdkQsc0JBQXNCLENBQUMsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2pGLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdkQsc0JBQXNCLENBQUMsdUJBQXVCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdkQsc0JBQXNCLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9FLFlBQVksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFD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QUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUUxRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUU3RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVqRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVuRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVqRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUU3RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJ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LEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXBELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUMxRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTNDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTNDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTNDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUMxRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUMzRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUMxRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUMxRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQzVELE1BQU0sVUFBVSxHQUFHLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNuRSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUUvRSxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1lBQ25FLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtEQUErRCxFQUFFLEdBQUcsRUFBRTtRQUMxRSxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVwRCxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2REFBNkQsRUFBRSxHQUFHLEVBQUU7UUFDeEUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFdEQsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ3ZFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2hFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyRkFBMkYsRUFBRSxHQUFHLEVBQUU7UUFDdEcsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUM1QixDQUFDLGtCQUFrQixFQUFFLHdDQUF3QyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQzVGLElBQUksQ0FDSixFQUNELFNBQVMsRUFDVDtZQUNDLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQ0QsQ0FBQTtRQUVELGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0QyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtEQUErRCxFQUFFLEdBQUcsRUFBRTtRQUMxRSwyQ0FBMkM7UUFDM0Msa0JBQWtCLENBQUMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2xFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUVoQyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxTQUFTLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUMsQ0FBQTtRQUVGLDhDQUE4QztRQUM5QyxrQkFBa0IsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBRWhDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEMsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1lBRXJELFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdUZBQXVGLEVBQUUsR0FBRyxFQUFFO1FBQ2xHLGtCQUFrQixDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDaEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBRWhDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUMvQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pCLENBQUMsQ0FBQTtZQUVGLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDM0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseURBQXlELEVBQUUsR0FBRyxFQUFFO1FBQ3BFLFdBQVcsQ0FDVjtZQUNDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUNmLFVBQVUsRUFBRSxxQkFBcUI7U0FDakMsRUFDRCxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3JDLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUMvQixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVuRixrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0QyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzNDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQzlELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO1FBQ3pFLFdBQVcsQ0FDVjtZQUNDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUM7U0FDeEIsRUFDRCxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRXJDLFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRWhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkRBQTZELEVBQUUsR0FBRyxFQUFFO1FBQ3hFLFdBQVcsQ0FDVjtZQUNDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDO1NBQ3RDLEVBQ0QsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzVCLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRTVELFNBQVMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRWhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2pELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNyRCxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1FQUFtRSxFQUFFLEdBQUcsRUFBRTtRQUM5RSxXQUFXLENBQ1Y7WUFDQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQztTQUNqQyxFQUNELENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM1QixTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV2RixTQUFTLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUV0RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUN6RixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJHQUEyRyxFQUFFLEdBQUcsRUFBRTtRQUN0SCxXQUFXLENBQ1Y7WUFDQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUM7U0FDdEMsRUFDRCxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7Z0JBQy9CLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUE7WUFFRixTQUFTLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUUvQyxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxFQUFFLEVBQ2hCO2dCQUNDLEtBQUs7Z0JBQ0wsS0FBSztnQkFDTCxLQUFLO2dCQUNMLEVBQUU7Z0JBQ0YsS0FBSztnQkFDTCxLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsRUFBRTtnQkFDRixLQUFLO2dCQUNMLEtBQUs7Z0JBQ0wsS0FBSztnQkFDTCxFQUFFO2dCQUNGLEtBQUs7Z0JBQ0wsS0FBSztnQkFDTCxLQUFLO2dCQUNMLEVBQUU7YUFDRixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDWixDQUFBO1FBQ0YsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFDL0QsV0FBVyxDQUNWO1lBQ0MsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDO1NBQ3RDLEVBQ0QsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzVCLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUMvQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDekIsQ0FBQyxDQUFBO1lBRUYsU0FBUyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM5RSxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFHQUFxRyxFQUFFLEdBQUcsRUFBRTtRQUNoSCxXQUFXLENBQ1Y7WUFDQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQztTQUNqQyxFQUNELENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM1QixTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtnQkFDL0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUE7WUFFRixTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2hGLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUdBQXFHLEVBQUUsR0FBRyxFQUFFO1FBQ2hILFdBQVcsQ0FDVjtZQUNDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDO1NBQ2pDLEVBQ0QsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzVCLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUMvQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3pCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekIsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3pCLENBQUMsQ0FBQTtZQUVGLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUV6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDaEYsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7UUFDbkUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFNUYsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNuRCxNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFckMsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFBO1lBQ2xCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2hELElBQUksT0FBTyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxHQUFHLEtBQUssQ0FBQTtvQkFDZixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFDakMsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFBO1lBRUYsbUJBQW1CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUU3RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxFQUFFLEVBQ2hCLENBQUMsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3pFLEtBQUssQ0FDTCxDQUFBO1lBRUQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUNoQixDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDN0QsS0FBSyxDQUNMLENBQUE7WUFFRCxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxFQUFFLEVBQ2hCLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUM3RCxLQUFLLENBQ0wsQ0FBQTtZQUVELFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlFQUF5RSxFQUFFLEdBQUcsRUFBRTtRQUNwRixXQUFXLENBQ1Y7WUFDQyxJQUFJLEVBQUUsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUM7WUFDeEQsVUFBVSxFQUFFLElBQUk7U0FDaEIsRUFDRCxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUIsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUV0QyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVoQyxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxFQUFFLEVBQ2hCLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLGtCQUFrQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUMvRCxDQUFBO1FBQ0YsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxRUFBcUUsRUFBRSxHQUFHLEVBQUU7UUFDaEYsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUM1QixDQUFDLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDckUsQ0FBQTtRQUVELGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0QyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDNUQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1R0FBdUcsRUFBRSxHQUFHLEVBQUU7UUFDbEgsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUM1QixDQUFDLDJDQUEyQyxFQUFFLHVDQUF1QyxDQUFDLENBQUMsSUFBSSxDQUMxRixJQUFJLENBQ0osRUFDRCxTQUFTLEVBQ1Q7WUFDQyxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUNELENBQUE7UUFFRCxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN0QyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsc0NBQXNDLENBQUMsQ0FBQTtRQUNwRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxXQUFXLENBQ1Y7WUFDQyxJQUFJLEVBQUUsQ0FBQyxtREFBbUQsQ0FBQztTQUMzRCxFQUNELENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM1QixNQUFNLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRXRDLFNBQVMsZUFBZSxDQUFDLEdBQVcsRUFBRSxXQUFtQjtnQkFDeEQsTUFBTSxJQUFJLEdBQUc7b0JBQ1osUUFBUSxFQUFFO3dCQUNULFVBQVUsRUFBRSxDQUFDO3dCQUNiLE1BQU0sRUFBRSxHQUFHO3FCQUNYO2lCQUNELENBQUE7Z0JBQ0QsSUFBSSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2Ysc0JBQXNCLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDeEUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQzVFLENBQUM7Z0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxXQUFXLEdBQUcsR0FBRyxDQUFDLENBQUE7Z0JBQzlFLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsV0FBVyxHQUFHLEdBQUcsQ0FBQyxDQUFBO1lBQ3ZGLENBQUM7WUFFRCxlQUFlLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNwQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDcEMsZUFBZSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3JDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxlQUFlLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdkMsZUFBZSxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzNDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMzQyxlQUFlLENBQUMsRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDNUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQzVDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUM3QyxlQUFlLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxlQUFlLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxlQUFlLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxlQUFlLENBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxlQUFlLENBQUMsRUFBRSxFQUFFLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNsRCxlQUFlLENBQUMsRUFBRSxFQUFFLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNuRCxlQUFlLENBQUMsRUFBRSxFQUFFLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNwRCxlQUFlLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RCxlQUFlLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RCxlQUFlLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RCxlQUFlLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RCxlQUFlLENBQUMsRUFBRSxFQUFFLHlCQUF5QixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN6RCxlQUFlLENBQUMsRUFBRSxFQUFFLDBCQUEwQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMxRCxlQUFlLENBQUMsRUFBRSxFQUFFLDJCQUEyQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUMzRCxlQUFlLENBQUMsRUFB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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUU1RCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVwRCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVwRCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVwRCxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzVCLFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVwRCx3QkFBd0I7WUFDeEIsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM1QixZQUFZLENBQUMsU0FBUyxFQUFFLElBQUks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Q0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ1osRUFDRCxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLEVBQ2xELENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ3JCLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUMvQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUE7WUFDRixZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUE7WUFFRixTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUE7WUFFRixTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN6QixDQUFDLENBQUE7WUFFRixTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNsQyxZQUFZLENBQUMsU0FBUyxFQUFFO2dCQUN2QixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMs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bUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUU1RSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUUzRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUU3RSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVsRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUVwRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUFFLFVBQVUsRUFBRSxVQUFVLENB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QTtZQUN0QyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDaEMsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtZQUMxRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN0QyxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDaEMsS0FBSyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQTtZQUMxRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDM0IsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUE7UUFFcEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLFdBQVcsQ0FBQyxHQUFHLENBQ2Qs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QUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQzFELEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDMUQsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUMxRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQ3ZELEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsRUFBRTtnQkFDeEQsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxFQUFFO2dCQUN4RCxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQUU7Z0JBQ3hELEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLFFB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VSxDQUFDLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtZQUU1RCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQzlELENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO1FBQzNFLFdBQVcsQ0FDVjtZQUNDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNWLFVBQVUsRUFBRSxxQkFBcUI7U0FDakMsRUFDRCxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUIsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFNUQsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFMUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFFNUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFFL0MsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxD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UUFDbkUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3BELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNwQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDMUQsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxHQUFHLEVBQUU7UUFDM0UsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsbUJBQW1CLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDbkUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3BELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwRSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwRSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwRSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwRSxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ3ZELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFDM0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXBELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUN2RCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnRUFBZ0UsRUFBRSxHQUFHLEVBQUU7UUFDM0UsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsbUJBQW1CLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDcEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ3ZELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUNuRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDakQsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUN2RCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzNELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDaEQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtZQUMzRSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFcEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFDL0QsWUFBWSxDQUFDLFNBQVMsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXBELG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUMzRCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3RELFlBQVksQ0FBQyxTQUFTLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxHQUFHLEVBQUU7UUFDNUQsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXJFLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsNEJBQTRCLENBQUMsQ0FBQTtZQUNsRSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsS0FBSyxDQUFDLE9BQU8sZ0NBQXdCLENBQUE7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtZQUNwRSxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtZQUM3RCxZQUFZLENBQUMsU0FBUyxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7UUFFRixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsd0RBQXdELEVBQUUsR0FBRyxFQUFFO1FBQ25FLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUV4RSxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pGLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLG9CQUFvQixDQUFDLENBQUE7WUFFMUQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsMEJBQTBCLENBQUMsQ0FBQTtRQUNqRSxDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5REFBeUQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRTtZQUN6RCxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUE7UUFFRixrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBRS9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBRS9FLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBRTdFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBRTNFLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzdELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFFLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtRQUM1RCxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFO1lBQ3pELFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQTtRQUVGLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFFL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFFOUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFFM0UsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDMUUsQ0FBQyxDQUFDLENBQUE7UUFFRixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixTQUFTLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQ25DLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFNBQVMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDakMsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQ3hCLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFO1lBQy9FLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQTtRQUVGLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQ3RDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDckMsU0FBUyxDQUNULENBQUE7WUFFRCxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNqQyxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFDdEMsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN2QyxTQUFTLENBQ1QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRTtZQUMvRSxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUE7UUFFRixrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVELFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUN0QyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDM0IsU0FBUyxDQUNULENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFO1lBQy9FLFlBQVksRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQTtRQUVGLGtCQUFrQixDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDbkQsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDNUQsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQ3RDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDckMsU0FBUyxDQUNULENBQUE7WUFFRCxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNsQyxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFDdEMsQ0FBQyxjQUFjLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN4QyxTQUFTLENBQ1QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtRQUN2QyxNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRTtZQUMvRSxZQUFZLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUE7UUFFRixrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ25ELFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzVELFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzVCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxRQUFRLGdDQUF3QixFQUN0QyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDM0IsU0FBUyxDQUNULENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbEMsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUU7WUFDL0UsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFBO1FBRUYsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNuRCxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUN6RCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFDdEMsQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDbEQsU0FBUyxDQUNULENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDN0IsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUU7WUFDL0UsWUFBWSxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFBO1FBRUYsa0JBQWtCLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNuRCxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUM1QixTQUFTLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNuRCxNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsUUFBUSxnQ0FBd0IsRUFDdEMsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUN0QyxTQUFTLENBQ1QsQ0FBQTtZQUVELFNBQVMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDcEMsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFFBQVEsZ0NBQXdCLEVBQ3RDLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFDckMsU0FBUyxDQUNULENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=