/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { CamelCaseAction, PascalCaseAction, DeleteAllLeftAction, DeleteAllRightAction, DeleteDuplicateLinesAction, DeleteLinesAction, IndentLinesAction, InsertLineAfterAction, InsertLineBeforeAction, JoinLinesAction, KebabCaseAction, LowerCaseAction, SnakeCaseAction, SortLinesAscendingAction, SortLinesDescendingAction, TitleCaseAction, TransposeAction, UpperCaseAction, } from '../../browser/linesOperations.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
function assertSelection(editor, expected) {
    if (!Array.isArray(expected)) {
        expected = [expected];
    }
    assert.deepStrictEqual(editor.getSelections(), expected);
}
function executeAction(action, editor) {
    action.run(null, editor, undefined);
}
suite('Editor Contrib - Line Operations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('SortLinesAscendingAction', () => {
        test('should sort selected lines in ascending order', function () {
            withTestCodeEditor(['omicron', 'beta', 'alpha'], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesAscendingAction = new SortLinesAscendingAction();
                editor.setSelection(new Selection(1, 1, 3, 5));
                executeAction(sortLinesAscendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['alpha', 'beta', 'omicron']);
                assertSelection(editor, new Selection(1, 1, 3, 7));
            });
        });
        test('should sort lines in ascending order', function () {
            withTestCodeEditor(['omicron', 'beta', 'alpha'], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesAscendingAction = new SortLinesAscendingAction();
                executeAction(sortLinesAscendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['alpha', 'beta', 'omicron']);
            });
        });
        test('should sort multiple selections in ascending order', function () {
            withTestCodeEditor(['omicron', 'beta', 'alpha', '', 'omicron', 'beta', 'alpha'], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesAscendingAction = new SortLinesAscendingAction();
                editor.setSelections([new Selection(1, 1, 3, 5), new Selection(5, 1, 7, 5)]);
                executeAction(sortLinesAscendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron',
                    '',
                    'alpha',
                    'beta',
                    'omicron',
                ]);
                const expectedSelections = [new Selection(1, 1, 3, 7), new Selection(5, 1, 7, 7)];
                editor.getSelections().forEach((actualSelection, index) => {
                    assert.deepStrictEqual(actualSelection.toString(), expectedSelections[index].toString());
                });
            });
        });
    });
    suite('SortLinesDescendingAction', () => {
        test('should sort selected lines in descending order', function () {
            withTestCodeEditor(['alpha', 'beta', 'omicron'], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesDescendingAction = new SortLinesDescendingAction();
                editor.setSelection(new Selection(1, 1, 3, 7));
                executeAction(sortLinesDescendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['omicron', 'beta', 'alpha']);
                assertSelection(editor, new Selection(1, 1, 3, 5));
            });
        });
        test('should sort multiple selections in descending order', function () {
            withTestCodeEditor(['alpha', 'beta', 'omicron', '', 'alpha', 'beta', 'omicron'], {}, (editor) => {
                const model = editor.getModel();
                const sortLinesDescendingAction = new SortLinesDescendingAction();
                editor.setSelections([new Selection(1, 1, 3, 7), new Selection(5, 1, 7, 7)]);
                executeAction(sortLinesDescendingAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'omicron',
                    'beta',
                    'alpha',
                    '',
                    'omicron',
                    'beta',
                    'alpha',
                ]);
                const expectedSelections = [new Selection(1, 1, 3, 5), new Selection(5, 1, 7, 5)];
                editor.getSelections().forEach((actualSelection, index) => {
                    assert.deepStrictEqual(actualSelection.toString(), expectedSelections[index].toString());
                });
            });
        });
    });
    suite('DeleteDuplicateLinesAction', () => {
        test('should remove duplicate lines within selection', function () {
            withTestCodeEditor(['alpha', 'beta', 'beta', 'beta', 'alpha', 'omicron'], {}, (editor) => {
                const model = editor.getModel();
                const deleteDuplicateLinesAction = new DeleteDuplicateLinesAction();
                editor.setSelection(new Selection(1, 3, 6, 4));
                executeAction(deleteDuplicateLinesAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['alpha', 'beta', 'omicron']);
                assertSelection(editor, new Selection(1, 1, 3, 7));
            });
        });
        test('should remove duplicate lines', function () {
            withTestCodeEditor(['alpha', 'beta', 'beta', 'beta', 'alpha', 'omicron'], {}, (editor) => {
                const model = editor.getModel();
                const deleteDuplicateLinesAction = new DeleteDuplicateLinesAction();
                executeAction(deleteDuplicateLinesAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['alpha', 'beta', 'omicron']);
                assert.ok(editor.getSelection().isEmpty());
            });
        });
        test('should remove duplicate lines in multiple selections', function () {
            withTestCodeEditor(['alpha', 'beta', 'beta', 'omicron', '', 'alpha', 'alpha', 'beta'], {}, (editor) => {
                const model = editor.getModel();
                const deleteDuplicateLinesAction = new DeleteDuplicateLinesAction();
                editor.setSelections([new Selection(1, 2, 4, 3), new Selection(6, 2, 8, 3)]);
                executeAction(deleteDuplicateLinesAction, editor);
                assert.deepStrictEqual(model.getLinesContent(), [
                    'alpha',
                    'beta',
                    'omicron',
                    '',
                    'alpha',
                    'beta',
                ]);
                const expectedSelections = [new Selection(1, 1, 3, 7), new Selection(5, 1, 6, 4)];
                editor.getSelections().forEach((actualSelection, index) => {
                    assert.deepStrictEqual(actualSelection.toString(), expectedSelections[index].toString());
                });
            });
        });
    });
    suite('DeleteAllLeftAction', () => {
        test('should delete to the left of the cursor', function () {
            withTestCodeEditor(['one', 'two', 'three'], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelection(new Selection(1, 2, 1, 2));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'ne');
                editor.setSelections([new Selection(2, 2, 2, 2), new Selection(3, 2, 3, 2)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(2), 'wo');
                assert.strictEqual(model.getLineContent(3), 'hree');
            });
        });
        test('should jump to the previous line when on first column', function () {
            withTestCodeEditor(['one', 'two', 'three'], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelection(new Selection(2, 1, 2, 1));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'onetwo');
                editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLinesContent()[0], 'onetwothree');
                assert.strictEqual(model.getLinesContent().length, 1);
                editor.setSelection(new Selection(1, 1, 1, 1));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLinesContent()[0], 'onetwothree');
            });
        });
        test('should keep deleting lines in multi cursor mode', function () {
            withTestCodeEditor([
                'hi my name is Carlos Matos',
                'BCC',
                'waso waso waso',
                'my wife doesnt believe in me',
                'nonononono',
                'bitconneeeect',
            ], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                const beforeSecondWasoSelection = new Selection(3, 5, 3, 5);
                const endOfBCCSelection = new Selection(2, 4, 2, 4);
                const endOfNonono = new Selection(5, 11, 5, 11);
                editor.setSelections([beforeSecondWasoSelection, endOfBCCSelection, endOfNonono]);
                executeAction(deleteAllLeftAction, editor);
                let selections = editor.getSelections();
                assert.strictEqual(model.getLineContent(2), '');
                assert.strictEqual(model.getLineContent(3), ' waso waso');
                assert.strictEqual(model.getLineContent(5), '');
                assert.deepStrictEqual([
                    selections[0].startLineNumber,
                    selections[0].startColumn,
                    selections[0].endLineNumber,
                    selections[0].endColumn,
                ], [3, 1, 3, 1]);
                assert.deepStrictEqual([
                    selections[1].startLineNumber,
                    selections[1].startColumn,
                    selections[1].endLineNumber,
                    selections[1].endColumn,
                ], [2, 1, 2, 1]);
                assert.deepStrictEqual([
                    selections[2].startLineNumber,
                    selections[2].startColumn,
                    selections[2].endLineNumber,
                    selections[2].endColumn,
                ], [5, 1, 5, 1]);
                executeAction(deleteAllLeftAction, editor);
                selections = editor.getSelections();
                assert.strictEqual(model.getLineContent(1), 'hi my name is Carlos Matos waso waso');
                assert.strictEqual(selections.length, 2);
                assert.deepStrictEqual([
                    selections[0].startLineNumber,
                    selections[0].startColumn,
                    selections[0].endLineNumber,
                    selections[0].endColumn,
                ], [1, 27, 1, 27]);
                assert.deepStrictEqual([
                    selections[1].startLineNumber,
                    selections[1].startColumn,
                    selections[1].endLineNumber,
                    selections[1].endColumn,
                ], [2, 29, 2, 29]);
            });
        });
        test('should work in multi cursor mode', function () {
            withTestCodeEditor(['hello', 'world', 'hello world', 'hello', 'bonjour', 'hola', 'world', 'hello world'], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelections([new Selection(1, 2, 1, 2), new Selection(1, 4, 1, 4)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'lo');
                editor.setSelections([new Selection(2, 2, 2, 2), new Selection(2, 4, 2, 5)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(2), 'd');
                editor.setSelections([new Selection(3, 2, 3, 5), new Selection(3, 7, 3, 7)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(3), 'world');
                editor.setSelections([new Selection(4, 3, 4, 3), new Selection(4, 5, 5, 4)]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(4), 'jour');
                editor.setSelections([
                    new Selection(5, 3, 6, 3),
                    new Selection(6, 5, 7, 5),
                    new Selection(7, 7, 7, 7),
                ]);
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(5), 'world');
            });
        });
        test('issue #36234: should push undo stop', () => {
            withTestCodeEditor(['one', 'two', 'three'], {}, (editor) => {
                const model = editor.getModel();
                const deleteAllLeftAction = new DeleteAllLeftAction();
                editor.setSelection(new Selection(1, 1, 1, 1));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'Typing some text here on line ' });
                assert.strictEqual(model.getLineContent(1), 'Typing some text here on line one');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 31, 1, 31));
                executeAction(deleteAllLeftAction, editor);
                assert.strictEqual(model.getLineContent(1), 'one');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 1, 1));
                CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                assert.strictEqual(model.getLineContent(1), 'Typing some text here on line one');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 31, 1, 31));
            });
        });
    });
    suite('JoinLinesAction', () => {
        test('should join lines and insert space if necessary', function () {
            withTestCodeEditor([
                'hello',
                'world',
                'hello ',
                'world',
                'hello		',
                '	world',
                'hello   ',
                '	world',
                '',
                '',
                'hello world',
            ], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelection(new Selection(1, 2, 1, 2));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(1), 'hello world');
                assertSelection(editor, new Selection(1, 6, 1, 6));
                editor.setSelection(new Selection(2, 2, 2, 2));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(2), 'hello world');
                assertSelection(editor, new Selection(2, 7, 2, 7));
                editor.setSelection(new Selection(3, 2, 3, 2));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(3), 'hello world');
                assertSelection(editor, new Selection(3, 7, 3, 7));
                editor.setSelection(new Selection(4, 2, 5, 3));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(4), 'hello world');
                assertSelection(editor, new Selection(4, 2, 4, 8));
                editor.setSelection(new Selection(5, 1, 7, 3));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(5), 'hello world');
                assertSelection(editor, new Selection(5, 1, 5, 3));
            });
        });
        test('#50471 Join lines at the end of document', function () {
            withTestCodeEditor(['hello', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelection(new Selection(2, 1, 2, 1));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(1), 'hello');
                assert.strictEqual(model.getLineContent(2), 'world');
                assertSelection(editor, new Selection(2, 6, 2, 6));
            });
        });
        test('should work in multi cursor mode', function () {
            withTestCodeEditor([
                'hello',
                'world',
                'hello ',
                'world',
                'hello		',
                '	world',
                'hello   ',
                '	world',
                '',
                '',
                'hello world',
            ], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelections([
                    /** primary cursor */
                    new Selection(5, 2, 5, 2),
                    new Selection(1, 2, 1, 2),
                    new Selection(3, 2, 4, 2),
                    new Selection(5, 4, 6, 3),
                    new Selection(7, 5, 8, 4),
                    new Selection(10, 1, 10, 1),
                ]);
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLinesContent().join('\n'), 'hello world\nhello world\nhello world\nhello world\n\nhello world');
                assertSelection(editor, [
                    /** primary cursor */
                    new Selection(3, 4, 3, 8),
                    new Selection(1, 6, 1, 6),
                    new Selection(2, 2, 2, 8),
                    new Selection(4, 5, 4, 9),
                    new Selection(6, 1, 6, 1),
                ]);
            });
        });
        test('should push undo stop', function () {
            withTestCodeEditor(['hello', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const joinLinesAction = new JoinLinesAction();
                editor.setSelection(new Selection(1, 6, 1, 6));
                editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' my dear' });
                assert.strictEqual(model.getLineContent(1), 'hello my dear');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 14));
                executeAction(joinLinesAction, editor);
                assert.strictEqual(model.getLineContent(1), 'hello my dear world');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 14));
                CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                assert.strictEqual(model.getLineContent(1), 'hello my dear');
                assert.deepStrictEqual(editor.getSelection(), new Selection(1, 14, 1, 14));
            });
        });
    });
    test('transpose', () => {
        withTestCodeEditor(['hello world', '', '', '   '], {}, (editor) => {
            const model = editor.getModel();
            const transposeAction = new TransposeAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 2, 1, 2));
            editor.setSelection(new Selection(1, 6, 1, 6));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hell oworld');
            assertSelection(editor, new Selection(1, 7, 1, 7));
            editor.setSelection(new Selection(1, 12, 1, 12));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hell oworl');
            assertSelection(editor, new Selection(2, 2, 2, 2));
            editor.setSelection(new Selection(3, 1, 3, 1));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(3), '');
            assertSelection(editor, new Selection(4, 1, 4, 1));
            editor.setSelection(new Selection(4, 2, 4, 2));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(4), '   ');
            assertSelection(editor, new Selection(4, 3, 4, 3));
        });
        // fix #16633
        withTestCodeEditor(['', '', 'hello', 'world', '', 'hello world', '', 'hello world'], {}, (editor) => {
            const model = editor.getModel();
            const transposeAction = new TransposeAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(2), '');
            assertSelection(editor, new Selection(2, 1, 2, 1));
            editor.setSelection(new Selection(3, 6, 3, 6));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(4), 'oworld');
            assertSelection(editor, new Selection(4, 2, 4, 2));
            editor.setSelection(new Selection(6, 12, 6, 12));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(7), 'd');
            assertSelection(editor, new Selection(7, 2, 7, 2));
            editor.setSelection(new Selection(8, 12, 8, 12));
            executeAction(transposeAction, editor);
            assert.strictEqual(model.getLineContent(8), 'hello world');
            assertSelection(editor, new Selection(8, 12, 8, 12));
        });
    });
    test('toggle case', function () {
        withTestCodeEditor([
            'hello world',
            'öçşğü',
            'parseHTMLString',
            'getElementById',
            'insertHTML',
            'PascalCase',
            'CSSSelectorsList',
            'iD',
            'tEST',
            'öçşÖÇŞğüĞÜ',
            'audioConverter.convertM4AToMP3();',
            'snake_case',
            'Capital_Snake_Case',
            `function helloWorld() {
				return someGlobalObject.printHelloWorld("en", "utf-8");
				}
				helloWorld();`.replace(/^\s+/gm, ''),
            `'JavaScript'`,
            'parseHTML4String',
            '_accessor: ServicesAccessor',
        ], {}, (editor) => {
            const model = editor.getModel();
            const uppercaseAction = new UpperCaseAction();
            const lowercaseAction = new LowerCaseAction();
            const titlecaseAction = new TitleCaseAction();
            const snakecaseAction = new SnakeCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'HELLO WORLD');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(1, 3, 1, 3));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'HELLO world');
            assertSelection(editor, new Selection(1, 3, 1, 3));
            editor.setSelection(new Selection(1, 4, 1, 4));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 4, 1, 4));
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'Hello World');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'ÖÇŞĞÜ');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'Öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(3, 1, 3, 16));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'parse_html_string');
            assertSelection(editor, new Selection(3, 1, 3, 18));
            editor.setSelection(new Selection(4, 1, 4, 15));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'get_element_by_id');
            assertSelection(editor, new Selection(4, 1, 4, 18));
            editor.setSelection(new Selection(5, 1, 5, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'insert_html');
            assertSelection(editor, new Selection(5, 1, 5, 12));
            editor.setSelection(new Selection(6, 1, 6, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'pascal_case');
            assertSelection(editor, new Selection(6, 1, 6, 12));
            editor.setSelection(new Selection(7, 1, 7, 17));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'css_selectors_list');
            assertSelection(editor, new Selection(7, 1, 7, 19));
            editor.setSelection(new Selection(8, 1, 8, 3));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(8), 'i_d');
            assertSelection(editor, new Selection(8, 1, 8, 4));
            editor.setSelection(new Selection(9, 1, 9, 5));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(9), 't_est');
            assertSelection(editor, new Selection(9, 1, 9, 6));
            editor.setSelection(new Selection(10, 1, 10, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(10), 'öçş_öç_şğü_ğü');
            assertSelection(editor, new Selection(10, 1, 10, 14));
            editor.setSelection(new Selection(11, 1, 11, 34));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(11), 'audio_converter.convert_m4a_to_mp3();');
            assertSelection(editor, new Selection(11, 1, 11, 38));
            editor.setSelection(new Selection(12, 1, 12, 11));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(12), 'snake_case');
            assertSelection(editor, new Selection(12, 1, 12, 11));
            editor.setSelection(new Selection(13, 1, 13, 19));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(13), 'capital_snake_case');
            assertSelection(editor, new Selection(13, 1, 13, 19));
            editor.setSelection(new Selection(14, 1, 17, 14));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getValueInRange(new Selection(14, 1, 17, 15)), `function hello_world() {
					return some_global_object.print_hello_world("en", "utf-8");
				}
				hello_world();`.replace(/^\s+/gm, ''));
            assertSelection(editor, new Selection(14, 1, 17, 15));
            editor.setSelection(new Selection(18, 1, 18, 13));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(18), `'java_script'`);
            assertSelection(editor, new Selection(18, 1, 18, 14));
            editor.setSelection(new Selection(19, 1, 19, 17));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(19), 'parse_html4_string');
            assertSelection(editor, new Selection(19, 1, 19, 19));
            editor.setSelection(new Selection(20, 1, 20, 28));
            executeAction(snakecaseAction, editor);
            assert.strictEqual(model.getLineContent(20), '_accessor: services_accessor');
            assertSelection(editor, new Selection(20, 1, 20, 29));
        });
        withTestCodeEditor([
            'foO baR BaZ',
            "foO'baR'BaZ",
            'foO[baR]BaZ',
            'foO`baR~BaZ',
            'foO^baR%BaZ',
            'foO$baR!BaZ',
            "'physician's assistant'",
        ], {}, (editor) => {
            const model = editor.getModel();
            const titlecaseAction = new TitleCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'Foo Bar Baz');
            editor.setSelection(new Selection(2, 1, 2, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(2), "Foo'bar'baz");
            editor.setSelection(new Selection(3, 1, 3, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'Foo[Bar]Baz');
            editor.setSelection(new Selection(4, 1, 4, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'Foo`Bar~Baz');
            editor.setSelection(new Selection(5, 1, 5, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'Foo^Bar%Baz');
            editor.setSelection(new Selection(6, 1, 6, 12));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'Foo$Bar!Baz');
            editor.setSelection(new Selection(7, 1, 7, 23));
            executeAction(titlecaseAction, editor);
            assert.strictEqual(model.getLineContent(7), "'Physician's Assistant'");
        });
        withTestCodeEditor([
            'camel from words',
            'from_snake_case',
            'from-kebab-case',
            'alreadyCamel',
            'ReTain_any_CAPitalization',
            'my_var.test_function()',
            'öçş_öç_şğü_ğü',
        ], {}, (editor) => {
            const model = editor.getModel();
            const camelcaseAction = new CamelCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 18));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'camelFromWords');
            editor.setSelection(new Selection(2, 1, 2, 15));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'fromSnakeCase');
            editor.setSelection(new Selection(3, 1, 3, 15));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'fromKebabCase');
            editor.setSelection(new Selection(4, 1, 4, 12));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'alreadyCamel');
            editor.setSelection(new Selection(5, 1, 5, 26));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'ReTainAnyCAPitalization');
            editor.setSelection(new Selection(6, 1, 6, 23));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'myVar.testFunction()');
            editor.setSelection(new Selection(7, 1, 7, 14));
            executeAction(camelcaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'öçşÖçŞğüĞü');
        });
        withTestCodeEditor(['', '   '], {}, (editor) => {
            const model = editor.getModel();
            const uppercaseAction = new UpperCaseAction();
            const lowercaseAction = new LowerCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), '');
            assertSelection(editor, new Selection(1, 1, 1, 1));
            editor.setSelection(new Selection(1, 1, 1, 1));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(1), '');
            assertSelection(editor, new Selection(1, 1, 1, 1));
            editor.setSelection(new Selection(2, 2, 2, 2));
            executeAction(uppercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), '   ');
            assertSelection(editor, new Selection(2, 2, 2, 2));
            editor.setSelection(new Selection(2, 2, 2, 2));
            executeAction(lowercaseAction, editor);
            assert.strictEqual(model.getLineContent(2), '   ');
            assertSelection(editor, new Selection(2, 2, 2, 2));
        });
        withTestCodeEditor([
            'hello world',
            'öçşğü',
            'parseHTMLString',
            'getElementById',
            'PascalCase',
            'öçşÖÇŞğüĞÜ',
            'audioConverter.convertM4AToMP3();',
            'Capital_Snake_Case',
            'parseHTML4String',
            '_accessor: ServicesAccessor',
            'Kebab-Case',
        ], {}, (editor) => {
            const model = editor.getModel();
            const kebabCaseAction = new KebabCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'hello world');
            assertSelection(editor, new Selection(1, 1, 1, 12));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(3, 1, 3, 16));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'parse-html-string');
            assertSelection(editor, new Selection(3, 1, 3, 18));
            editor.setSelection(new Selection(4, 1, 4, 15));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'get-element-by-id');
            assertSelection(editor, new Selection(4, 1, 4, 18));
            editor.setSelection(new Selection(5, 1, 5, 11));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'pascal-case');
            assertSelection(editor, new Selection(5, 1, 5, 12));
            editor.setSelection(new Selection(6, 1, 6, 11));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'öçş-öç-şğü-ğü');
            assertSelection(editor, new Selection(6, 1, 6, 14));
            editor.setSelection(new Selection(7, 1, 7, 34));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'audio-converter.convert-m4a-to-mp3();');
            assertSelection(editor, new Selection(7, 1, 7, 38));
            editor.setSelection(new Selection(8, 1, 8, 19));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(8), 'capital-snake-case');
            assertSelection(editor, new Selection(8, 1, 8, 19));
            editor.setSelection(new Selection(9, 1, 9, 17));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(9), 'parse-html4-string');
            assertSelection(editor, new Selection(9, 1, 9, 19));
            editor.setSelection(new Selection(10, 1, 10, 28));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(10), '_accessor: services-accessor');
            assertSelection(editor, new Selection(10, 1, 10, 29));
            editor.setSelection(new Selection(11, 1, 11, 11));
            executeAction(kebabCaseAction, editor);
            assert.strictEqual(model.getLineContent(11), 'kebab-case');
            assertSelection(editor, new Selection(11, 1, 11, 11));
        });
        withTestCodeEditor([
            'hello world',
            'öçşğü',
            'parseHTMLString',
            'getElementById',
            'PascalCase',
            'öçşÖÇŞğüĞÜ',
            'audioConverter.convertM4AToMP3();',
            'Capital_Snake_Case',
            'parseHTML4String',
            'Kebab-Case',
        ], {}, (editor) => {
            const model = editor.getModel();
            const pascalCaseAction = new PascalCaseAction();
            editor.setSelection(new Selection(1, 1, 1, 12));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(1), 'HelloWorld');
            assertSelection(editor, new Selection(1, 1, 1, 11));
            editor.setSelection(new Selection(2, 1, 2, 6));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(2), 'Öçşğü');
            assertSelection(editor, new Selection(2, 1, 2, 6));
            editor.setSelection(new Selection(3, 1, 3, 16));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(3), 'ParseHTMLString');
            assertSelection(editor, new Selection(3, 1, 3, 16));
            editor.setSelection(new Selection(4, 1, 4, 15));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(4), 'GetElementById');
            assertSelection(editor, new Selection(4, 1, 4, 15));
            editor.setSelection(new Selection(5, 1, 5, 11));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(5), 'PascalCase');
            assertSelection(editor, new Selection(5, 1, 5, 11));
            editor.setSelection(new Selection(6, 1, 6, 11));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(6), 'ÖçşÖÇŞğüĞÜ');
            assertSelection(editor, new Selection(6, 1, 6, 11));
            editor.setSelection(new Selection(7, 1, 7, 34));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(7), 'AudioConverter.ConvertM4AToMP3();');
            assertSelection(editor, new Selection(7, 1, 7, 34));
            editor.setSelection(new Selection(8, 1, 8, 19));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(8), 'CapitalSnakeCase');
            assertSelection(editor, new Selection(8, 1, 8, 17));
            editor.setSelection(new Selection(9, 1, 9, 17));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(9), 'ParseHTML4String');
            assertSelection(editor, new Selection(9, 1, 9, 17));
            editor.setSelection(new Selection(10, 1, 10, 11));
            executeAction(pascalCaseAction, editor);
            assert.strictEqual(model.getLineContent(10), 'KebabCase');
            assertSelection(editor, new Selection(10, 1, 10, 10));
        });
    });
    suite('DeleteAllRightAction', () => {
        test('should be noop on empty', () => {
            withTestCodeEditor([''], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
                editor.setSelection(new Selection(1, 1, 1, 1));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
                editor.setSelections([
                    new Selection(1, 1, 1, 1),
                    new Selection(1, 1, 1, 1),
                    new Selection(1, 1, 1, 1),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
            });
        });
        test('should delete selected range', () => {
            withTestCodeEditor(['hello', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelection(new Selection(1, 2, 1, 5));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['ho', 'world']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 2, 1, 2)]);
                editor.setSelection(new Selection(1, 1, 2, 4));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['ld']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
                editor.setSelection(new Selection(1, 1, 1, 3));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
            });
        });
        test('should delete to the right of the cursor', () => {
            withTestCodeEditor(['hello', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelection(new Selection(1, 3, 1, 3));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he', 'world']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 3, 1, 3)]);
                editor.setSelection(new Selection(2, 1, 2, 1));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he', '']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(2, 1, 2, 1)]);
            });
        });
        test('should join two lines, if at the end of the line', () => {
            withTestCodeEditor(['hello', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelection(new Selection(1, 6, 1, 6));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['helloworld']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
                editor.setSelection(new Selection(1, 6, 1, 6));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hello']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
                editor.setSelection(new Selection(1, 6, 1, 6));
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hello']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
            });
        });
        test('should work with multiple cursors', () => {
            withTestCodeEditor(['hello', 'there', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelections([
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                    new Selection(3, 4, 3, 4),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hethere', 'wor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he', 'wor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hewor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 3, 1, 3)]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['he']);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 3, 1, 3)]);
            });
        });
        test('should work with undo/redo', () => {
            withTestCodeEditor(['hello', 'there', 'world'], {}, (editor) => {
                const model = editor.getModel();
                const action = new DeleteAllRightAction();
                editor.setSelections([
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                    new Selection(3, 4, 3, 4),
                ]);
                executeAction(action, editor);
                assert.deepStrictEqual(model.getLinesContent(), ['hethere', 'wor']);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4),
                ]);
                CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(1, 6, 1, 6),
                    new Selection(3, 4, 3, 4),
                ]);
                CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 3, 1, 3),
                    new Selection(2, 4, 2, 4),
                ]);
            });
        });
    });
    test('InsertLineBeforeAction', () => {
        function testInsertLineBefore(lineNumber, column, callback) {
            const TEXT = ['First line', 'Second line', 'Third line'];
            withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
                editor.setPosition(new Position(lineNumber, column));
                const insertLineBeforeAction = new InsertLineBeforeAction();
                executeAction(insertLineBeforeAction, editor);
                callback(editor.getModel(), viewModel);
            });
        }
        testInsertLineBefore(1, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(1, 1, 1, 1));
            assert.strictEqual(model.getLineContent(1), '');
            assert.strictEqual(model.getLineContent(2), 'First line');
            assert.strictEqual(model.getLineContent(3), 'Second line');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineBefore(2, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(2, 1, 2, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), 'Second line');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineBefore(3, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(3, 1, 3, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
    });
    test('InsertLineAfterAction', () => {
        function testInsertLineAfter(lineNumber, column, callback) {
            const TEXT = ['First line', 'Second line', 'Third line'];
            withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
                editor.setPosition(new Position(lineNumber, column));
                const insertLineAfterAction = new InsertLineAfterAction();
                executeAction(insertLineAfterAction, editor);
                callback(editor.getModel(), viewModel);
            });
        }
        testInsertLineAfter(1, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(2, 1, 2, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), '');
            assert.strictEqual(model.getLineContent(3), 'Second line');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineAfter(2, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(3, 1, 3, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assert.strictEqual(model.getLineContent(3), '');
            assert.strictEqual(model.getLineContent(4), 'Third line');
        });
        testInsertLineAfter(3, 3, (model, viewModel) => {
            assert.deepStrictEqual(viewModel.getSelection(), new Selection(4, 1, 4, 1));
            assert.strictEqual(model.getLineContent(1), 'First line');
            assert.strictEqual(model.getLineContent(2), 'Second line');
            assert.strictEqual(model.getLineContent(3), 'Third line');
            assert.strictEqual(model.getLineContent(4), '');
        });
    });
    test('Bug 18276:[editor] Indentation broken when selection is empty', () => {
        const model = createTextModel(['function baz() {'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor) => {
            const indentLinesAction = new IndentLinesAction();
            editor.setPosition(new Position(1, 2));
            executeAction(indentLinesAction, editor);
            assert.strictEqual(model.getLineContent(1), '\tfunction baz() {');
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 3, 1, 3));
            CoreEditingCommands.Tab.runEditorCommand(null, editor, null);
            assert.strictEqual(model.getLineContent(1), '\tf\tunction baz() {');
        });
        model.dispose();
    });
    test('issue #80736: Indenting while the cursor is at the start of a line of text causes the added spaces or tab to be selected', () => {
        const model = createTextModel(['Some text'].join('\n'), undefined, {
            insertSpaces: false,
        });
        withTestCodeEditor(model, {}, (editor) => {
            const indentLinesAction = new IndentLinesAction();
            editor.setPosition(new Position(1, 1));
            executeAction(indentLinesAction, editor);
            assert.strictEqual(model.getLineContent(1), '\tSome text');
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 2, 1, 2));
        });
        model.dispose();
    });
    test('Indenting on empty line should move cursor', () => {
        const model = createTextModel([''].join('\n'));
        withTestCodeEditor(model, { useTabStops: false }, (editor) => {
            const indentLinesAction = new IndentLinesAction();
            editor.setPosition(new Position(1, 1));
            executeAction(indentLinesAction, editor);
            assert.strictEqual(model.getLineContent(1), '    ');
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 5, 1, 5));
        });
        model.dispose();
    });
    test('issue #62112: Delete line does not work properly when multiple cursors are on line', () => {
        const TEXT = ['a', 'foo boo', 'too', 'c'];
        withTestCodeEditor(TEXT, {}, (editor) => {
            editor.setSelections([
                new Selection(2, 4, 2, 4),
                new Selection(2, 8, 2, 8),
                new Selection(3, 4, 3, 4),
            ]);
            const deleteLinesAction = new DeleteLinesAction();
            executeAction(deleteLinesAction, editor);
            assert.strictEqual(editor.getValue(), 'a\nc');
        });
    });
    function testDeleteLinesCommand(initialText, _initialSelections, resultingText, _resultingSelections) {
        const initialSelections = Array.isArray(_initialSelections)
            ? _initialSelections
            : [_initialSelections];
        const resultingSelections = Array.isArray(_resultingSelections)
            ? _resultingSelections
            : [_resultingSelections];
        withTestCodeEditor(initialText, {}, (editor) => {
            editor.setSelections(initialSelections);
            const deleteLinesAction = new DeleteLinesAction();
            executeAction(deleteLinesAction, editor);
            assert.strictEqual(editor.getValue(), resultingText.join('\n'));
            assert.deepStrictEqual(editor.getSelections(), resultingSelections);
        });
    }
    test('empty selection in middle of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(2, 3, 2, 3), ['first', 'third line', 'fourth line', 'fifth'], new Selection(2, 3, 2, 3));
    });
    test('empty selection at top of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5), ['second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
    });
    test('empty selection at end of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 2, 5, 2), ['first', 'second line', 'third line', 'fourth line'], new Selection(4, 2, 4, 2));
    });
    test('with selection in middle of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(3, 3, 2, 2), ['first', 'fourth line', 'fifth'], new Selection(2, 2, 2, 2));
    });
    test('with selection at top of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 4, 1, 5), ['second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
    });
    test('with selection at end of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(5, 1, 5, 2), ['first', 'second line', 'third line', 'fourth line'], new Selection(4, 2, 4, 2));
    });
    test('with full line selection in middle of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(4, 1, 2, 1), ['first', 'fourth line', 'fifth'], new Selection(2, 1, 2, 1));
    });
    test('with full line selection at top of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(2, 1, 1, 5), ['second line', 'third line', 'fourth line', 'fifth'], new Selection(1, 5, 1, 5));
    });
    test('with full line selection at end of lines', function () {
        testDeleteLinesCommand(['first', 'second line', 'third line', 'fourth line', 'fifth'], new Selection(4, 1, 5, 2), ['first', 'second line', 'third line'], new Selection(3, 2, 3, 2));
    });
    test('multicursor 1', function () {
        testDeleteLinesCommand([
            'class P {',
            '',
            '    getA() {',
            '        if (true) {',
            '            return "a";',
            '        }',
            '    }',
            '',
            '    getB() {',
            '        if (true) {',
            '            return "b";',
            '        }',
            '    }',
            '',
            '    getC() {',
            '        if (true) {',
            '            return "c";',
            '        }',
            '    }',
            '}',
        ], [new Selection(4, 1, 5, 1), new Selection(10, 1, 11, 1), new Selection(16, 1, 17, 1)], [
            'class P {',
            '',
            '    getA() {',
            '            return "a";',
            '        }',
            '    }',
            '',
            '    getB() {',
            '            return "b";',
            '        }',
            '    }',
            '',
            '    getC() {',
            '            return "c";',
            '        }',
            '    }',
            '}',
        ], [new Selection(4, 1, 4, 1), new Selection(9, 1, 9, 1), new Selection(14, 1, 14, 1)]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNPcGVyYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5lc09wZXJhdGlvbnMvdGVzdC9icm93c2VyL2xpbmVzT3BlcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUd6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSWhFLE9BQU8sRUFDTixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLG1CQUFtQixFQUNuQixvQkFBb0IsRUFDcEIsMEJBQTBCLEVBQzFCLGlCQUFpQixFQUNqQixpQkFBaUIsRUFDakIscUJBQXFCLEVBQ3JCLHNCQUFzQixFQUN0QixlQUFlLEVBQ2YsZUFBZSxFQUNmLGVBQWUsRUFDZixlQUFlLEVBQ2Ysd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixlQUFlLEVBQ2YsZUFBZSxFQUNmLGVBQWUsR0FDZixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUxRSxTQUFTLGVBQWUsQ0FBQyxNQUFtQixFQUFFLFFBQWlDO0lBQzlFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDOUIsUUFBUSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7SUFD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RyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7Z0JBQ2hDLE1BQU0sZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7Z0JBRTdDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDOUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUMxRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRWxELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDOUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUMxRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRWxELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDOUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUMxRCxlQUFlLENB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LENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3pELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNsRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENB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QUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUMxRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzFELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDMUQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMs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QUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDakQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDN0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXJELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1lBQ2xFLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVyRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDakQsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtZQUM1RSxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUNELENBQUE7UUFFRCxrQkFBa0IsQ0FDakI7WUFDQyxhQUFhO1lBQ2IsYUFBYTtZQUNiLGFBQWE7WUFDYixhQUFhO1lBQ2IsYUFBYTtZQUNiLGFBQWE7WUFDYix5QkFBeUI7U0FDekIsRUFDRCxFQUFFLEVBQ0YsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBRTdDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUUxRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFFMUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBRTFELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUUxRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFFMUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBRTFELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3ZFLENBQUMsQ0FDRCxDQUFBO1FBRUQsa0JBQWtCLENBQ2pCO1lBQ0Msa0JBQWtCO1lBQ2xCLGlCQUFpQjtZQUNqQixpQkFBaUI7WUFDakIsY0FBYztZQUNkLDJCQUEyQjtZQUMzQix3QkFBd0I7WUFDeEIsZUFBZTtTQUNmLEVBQ0QsRUFBRSxFQUNGLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDVixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUU3QyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtZQUU3RCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFFNUQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1lBRTVELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUUzRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtZQUV0RSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtZQUVuRSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDMUQsQ0FBQyxDQUNELENBQUE7UUFFRCxrQkFBa0IsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM5QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUM3QyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBRTdDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQy9DLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVsRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUMsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbEQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNsRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7UUFFRixrQkFBa0IsQ0FDakI7WUFDQyxhQUFhO1lBQ2IsT0FBTztZQUNQLGlCQUFpQjtZQUNqQixnQkFBZ0I7WUFDaEIsWUFBWTtZQUNaLFlBQVk7WUFDWixtQ0FBbUM7WUFDbkMsb0JBQW9CO1lBQ3BCLGtCQUFrQjtZQUNsQiw2QkFBNkI7WUFDN0IsWUFBWTtTQUNaLEVBQ0QsRUFBRSxFQUNGLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDVixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUU3QyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDMUQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUNwRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFbEQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixDQUFDLENBQUE7WUFDaEUsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQ2hFLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLENBQUE7WUFDMUQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUM1RCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLHVDQUF1QyxDQUFDLENBQUE7WUFDcEYsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1lBQ2pFLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtZQUNqRSxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pELGFBQWEsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxFQUFFLDhCQUE4QixDQUFDLENBQUE7WUFDNUUsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRXJELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqRCxhQUFhLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUMxRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUNELENBQUE7UUFFRCxrQkFBa0IsQ0FDakI7WUFDQyxhQUFhO1lBQ2IsT0FBTztZQUNQLGlCQUFpQjtZQUNqQixnQkFBZ0I7WUFDaEIsWUFBWTtZQUNaLFlBQVk7WUFDWixtQ0FBbUM7WUFDbkMsb0JBQW9CO1lBQ3BCLGtCQUFrQjtZQUNsQixZQUFZO1NBQ1osRUFDRCxFQUFFLEVBQ0YsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLGdCQUFnQixHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtZQUUvQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUN6RCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDcEQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRWxELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUE7WUFDOUQsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDN0QsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRW5ELE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3pELGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUVuRCxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsYUFBYSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUN6RCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUNBQW1DLENBQUMsQ0FBQTtZQUNoRixlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtZQUMvRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtZQUMvRCxlQUFlLENBQUMsTUFBTSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFbkQsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2pELGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDekQsZUFBZSxDQUFDLE1B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Q0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUUzRSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQzlDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtnQkFDdkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBRTNFLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDOUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNyRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RSxDQUFDLENBQUMsQ0FBQTtR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LEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNFLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQTtRQUMxRCxDQUFDLENBQUMsQ0FBQTtRQUVGLG1CQUFtQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLEVBQUUsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzRSxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsV0FBVyxD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