/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isFirefox } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Selection } from '../../../../common/core/selection.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { CursorWordAccessibilityLeft, CursorWordAccessibilityLeftSelect, CursorWordAccessibilityRight, CursorWordAccessibilityRightSelect, CursorWordEndLeft, CursorWordEndLeftSelect, CursorWordEndRight, CursorWordEndRightSelect, CursorWordLeft, CursorWordLeftSelect, CursorWordRight, CursorWordRightSelect, CursorWordStartLeft, CursorWordStartLeftSelect, CursorWordStartRight, CursorWordStartRightSelect, DeleteInsideWord, DeleteWordEndLeft, DeleteWordEndRight, DeleteWordLeft, DeleteWordRight, DeleteWordStartLeft, DeleteWordStartRight, } from '../../browser/wordOperations.js';
import { deserializePipePositions, serializePipePositions, testRepeatedActionAndExtractPositions, } from './wordTestUtils.js';
import { createCodeEditorServices, instantiateTestCodeEditor, withTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
suite('WordOperations', () => {
    const _cursorWordStartLeft = new CursorWordStartLeft();
    const _cursorWordEndLeft = new CursorWordEndLeft();
    const _cursorWordLeft = new CursorWordLeft();
    const _cursorWordStartLeftSelect = new CursorWordStartLeftSelect();
    const _cursorWordEndLeftSelect = new CursorWordEndLeftSelect();
    const _cursorWordLeftSelect = new CursorWordLeftSelect();
    const _cursorWordStartRight = new CursorWordStartRight();
    const _cursorWordEndRight = new CursorWordEndRight();
    const _cursorWordRight = new CursorWordRight();
    const _cursorWordStartRightSelect = new CursorWordStartRightSelect();
    const _cursorWordEndRightSelect = new CursorWordEndRightSelect();
    const _cursorWordRightSelect = new CursorWordRightSelect();
    const _cursorWordAccessibilityLeft = new CursorWordAccessibilityLeft();
    const _cursorWordAccessibilityLeftSelect = new CursorWordAccessibilityLeftSelect();
    const _cursorWordAccessibilityRight = new CursorWordAccessibilityRight();
    const _cursorWordAccessibilityRightSelect = new CursorWordAccessibilityRightSelect();
    const _deleteWordLeft = new DeleteWordLeft();
    const _deleteWordStartLeft = new DeleteWordStartLeft();
    const _deleteWordEndLeft = new DeleteWordEndLeft();
    const _deleteWordRight = new DeleteWordRight();
    const _deleteWordStartRight = new DeleteWordStartRight();
    const _deleteWordEndRight = new DeleteWordEndRight();
    const _deleteInsideWord = new DeleteInsideWord();
    let disposables;
    let instantiationService;
    let languageConfigurationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        languageService = instantiationService.get(ILanguageService);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function runEditorCommand(editor, command) {
        instantiationService.invokeFunction((accessor) => {
            command.runEditorCommand(accessor, editor, null);
        });
    }
    function cursorWordLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordLeftSelect : _cursorWordLeft);
    }
    function cursorWordAccessibilityLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordAccessibilityLeft : _cursorWordAccessibilityLeftSelect);
    }
    function cursorWordAccessibilityRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordAccessibilityRightSelect : _cursorWordAccessibilityRight);
    }
    function cursorWordStartLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordStartLeftSelect : _cursorWordStartLeft);
    }
    function cursorWordEndLeft(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordEndLeftSelect : _cursorWordEndLeft);
    }
    function cursorWordRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordRightSelect : _cursorWordRight);
    }
    function moveWordEndRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordEndRightSelect : _cursorWordEndRight);
    }
    function moveWordStartRight(editor, inSelectionMode = false) {
        runEditorCommand(editor, inSelectionMode ? _cursorWordStartRightSelect : _cursorWordStartRight);
    }
    function deleteWordLeft(editor) {
        runEditorCommand(editor, _deleteWordLeft);
    }
    function deleteWordStartLeft(editor) {
        runEditorCommand(editor, _deleteWordStartLeft);
    }
    function deleteWordEndLeft(editor) {
        runEditorCommand(editor, _deleteWordEndLeft);
    }
    function deleteWordRight(editor) {
        runEditorCommand(editor, _deleteWordRight);
    }
    function deleteWordStartRight(editor) {
        runEditorCommand(editor, _deleteWordStartRight);
    }
    function deleteWordEndRight(editor) {
        runEditorCommand(editor, _deleteWordEndRight);
    }
    function deleteInsideWord(editor) {
        _deleteInsideWord.run(null, editor, null);
    }
    test('cursorWordLeft - simple', () => {
        const EXPECTED = [
            '|    \t|My |First |Line\t ',
            '|\t|My |Second |Line',
            '|    |Third |Line🐶',
            '|',
            '|1',
        ].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - with selection', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor) => {
            editor.setPosition(new Position(5, 2));
            cursorWordLeft(editor, true);
            assert.deepStrictEqual(editor.getSelection(), new Selection(5, 2, 5, 1));
        });
    });
    test('cursorWordLeft - issue #832', () => {
        const EXPECTED = ['|   |/* |Just |some   |more   |text |a|+= |3 |+|5-|3 |+ |7 |*/  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test("cursorWordLeft - issue #48046: Word selection doesn't work as usual", () => {
        const EXPECTED = ['|deep.|object.|property'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 21), (ed) => cursorWordLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - Recognize words', function () {
        if (isFirefox) {
            // https://github.com/microsoft/vscode/issues/219843
            return this.skip();
        }
        const EXPECTED = ['|/* |これ|は|テスト|です |/*'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordLeft(ed, true), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)), {
            wordSegmenterLocales: 'ja',
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - Does not recognize words', () => {
        const EXPECTED = ['|/* |これはテストです |/*'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordLeft(ed, true), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)), {
            wordSegmenterLocales: '',
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordLeft - issue #169904: cursors out of sync', () => {
        const text = [
            '.grid1 {',
            '  display: grid;',
            '  grid-template-columns:',
            '    [full-start] minmax(1em, 1fr)',
            '    [main-start] minmax(0, 40em) [main-end]',
            '    minmax(1em, 1fr) [full-end];',
            '}',
            '.grid2 {',
            '  display: grid;',
            '  grid-template-columns:',
            '    [full-start] minmax(1em, 1fr)',
            '    [main-start] minmax(0, 40em) [main-end] minmax(1em, 1fr) [full-end];',
            '}',
        ];
        withTestCodeEditor(text, {}, (editor) => {
            editor.setSelections([
                new Selection(5, 44, 5, 44),
                new Selection(6, 32, 6, 32),
                new Selection(12, 44, 12, 44),
                new Selection(12, 72, 12, 72),
            ]);
            cursorWordLeft(editor, false);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(5, 43, 5, 43),
                new Selection(6, 31, 6, 31),
                new Selection(12, 43, 12, 43),
                new Selection(12, 71, 12, 71),
            ]);
        });
    });
    test('cursorWordLeftSelect - issue #74369: cursorWordLeft and cursorWordLeftSelect do not behave consistently', () => {
        const EXPECTED = ['|this.|is.|a.|test'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 15), (ed) => cursorWordLeft(ed, true), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordStartLeft', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['|   |/* |Just |some   |more   |text |a|+= |3 |+|5|-|3 |+ |7 |*/  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordStartLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordStartLeft - issue #51119: regression makes VS compatibility impossible', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['|this|.|is|.|a|.|test'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordStartLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #51275 - cursorWordStartLeft does not push undo/redo stack element', () => {
        function type(viewModel, text) {
            for (let i = 0; i < text.length; i++) {
                viewModel.type(text.charAt(i), 'keyboard');
            }
        }
        withTestCodeEditor('', {}, (editor, viewModel) => {
            type(viewModel, 'foo bar baz');
            assert.strictEqual(editor.getValue(), 'foo bar baz');
            cursorWordStartLeft(editor);
            cursorWordStartLeft(editor);
            type(viewModel, 'q');
            assert.strictEqual(editor.getValue(), 'foo qbar baz');
            CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
            assert.strictEqual(editor.getValue(), 'foo bar baz');
        });
    });
    test('cursorWordEndLeft', () => {
        const EXPECTED = ['|   /*| Just| some|   more|   text| a|+=| 3| +|5|-|3| +| 7| */|  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordEndLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - simple', () => {
        const EXPECTED = [
            '    \tMy| First| Line|\t |',
            '\tMy| Second| Line|',
            '    Third| Line🐶|',
            '|',
            '1|',
        ].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => cursorWordRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(5, 2)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - selection', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            editor.setPosition(new Position(1, 1));
            cursorWordRight(editor, true);
            assert.deepStrictEqual(editor.getSelection(), new Selection(1, 1, 1, 8));
        });
    });
    test('cursorWordRight - issue #832', () => {
        const EXPECTED = ['   /*| Just| some|   more|   text| a|+=| 3| +5|-3| +| 7| */|  |'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => cursorWordRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - issue #41199', () => {
        const EXPECTED = ['console|.log|(err|)|'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => cursorWordRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 17)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - Recognize words', function () {
        if (isFirefox) {
            // https://github.com/microsoft/vscode/issues/219843
            return this.skip();
        }
        const EXPECTED = ['/*| これ|は|テスト|です|/*|'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => cursorWordRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 14)), {
            wordSegmenterLocales: 'ja',
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordRight - Does not recognize words', () => {
        const EXPECTED = ['/*| これはテストです|/*|'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => cursorWordRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 14)), {
            wordSegmenterLocales: '',
        });
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('moveWordEndRight', () => {
        const EXPECTED = ['   /*| Just| some|   more|   text| a|+=| 3| +5|-3| +| 7| */|  |'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => moveWordEndRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('moveWordStartRight', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['   |/* |Just |some   |more   |text |a|+= |3 |+|5|-|3 |+ |7 |*/  |'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => moveWordStartRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #51119: cursorWordStartRight regression makes VS compatibility impossible', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['this|.|is|.|a|.|test|'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => moveWordStartRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 15)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('issue #64810: cursorWordStartRight skips first word after newline', () => {
        // This is the behaviour observed in Visual Studio, please do not touch test
        const EXPECTED = ['Hello |World|', '|Hei |mailman|'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => moveWordStartRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(2, 12)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordAccessibilityLeft', () => {
        const EXPECTED = ['|   /* |Just |some   |more   |text |a+= |3 +|5-|3 + |7 */  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 1000), (ed) => cursorWordAccessibilityLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 1)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('cursorWordAccessibilityRight', () => {
        const EXPECTED = ['   /* |Just |some   |more   |text |a+= |3 +|5-|3 + |7 */  |'].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => cursorWordAccessibilityRight(ed), (ed) => ed.getPosition(), (ed) => ed.getPosition().equals(new Position(1, 50)));
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordLeft for non-empty selection', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setSelection(new Selection(3, 7, 3, 9));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(3), '    Thd Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 7));
        });
    });
    test('deleteWordLeft for cursor at beginning of document', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 1));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), '    \tMy First Line\t ');
            assert.deepStrictEqual(editor.getPosition(), new Position(1, 1));
        });
    });
    test('deleteWordLeft for cursor at end of whitespace', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(3, 11));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(3), '    Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 5));
        });
    });
    test('deleteWordLeft for cursor just behind a word', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 11));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(2), '\tMy  Line');
            assert.deepStrictEqual(editor.getPosition(), new Position(2, 5));
        });
    });
    test('deleteWordLeft for cursor inside of a word', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 12));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), '    \tMy st Line\t ');
            assert.deepStrictEqual(editor.getPosition(), new Position(1, 9));
        });
    });
    test('deleteWordRight for non-empty selection', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setSelection(new Selection(3, 7, 3, 9));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(3), '    Thd Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 7));
        });
    });
    test('deleteWordRight for cursor at end of document', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(5, 3));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(5), '1');
            assert.deepStrictEqual(editor.getPosition(), new Position(5, 2));
        });
    });
    test('deleteWordRight for cursor at beggining of whitespace', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(3, 1));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(3), 'Third Line🐶');
            assert.deepStrictEqual(editor.getPosition(), new Position(3, 1));
        });
    });
    test('deleteWordRight for cursor just before a word', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 5));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(2), '\tMy  Line');
            assert.deepStrictEqual(editor.getPosition(), new Position(2, 5));
        });
    });
    test('deleteWordRight for cursor inside of a word', () => {
        withTestCodeEditor(['    \tMy First Line\t ', '\tMy Second Line', '    Third Line🐶', '', '1'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 11));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(1), '    \tMy Fi Line\t ');
            assert.deepStrictEqual(editor.getPosition(), new Position(1, 11));
        });
    });
    test('deleteWordLeft - issue #832', () => {
        const EXPECTED = ['|   |/* |Just |some |text |a|+= |3 |+|5 |*/|  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 10000), (ed) => deleteWordLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordStartLeft', () => {
        const EXPECTED = ['|   |/* |Just |some |text |a|+= |3 |+|5 |*/  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 10000), (ed) => deleteWordStartLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordEndLeft', () => {
        const EXPECTED = ['|   /*| Just| some| text| a|+=| 3| +|5| */|  '].join('\n');
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1000, 10000), (ed) => deleteWordEndLeft(ed), (ed) => ed.getPosition(), (ed) => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordLeft - issue #24947', () => {
        withTestCodeEditor(['{', '}'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), '{}');
        });
        withTestCodeEditor(['{', '}'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordStartLeft(editor);
            assert.strictEqual(model.getLineContent(1), '{}');
        });
        withTestCodeEditor(['{', '}'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordEndLeft(editor);
            assert.strictEqual(model.getLineContent(1), '{}');
        });
    });
    test('deleteWordRight - issue #832', () => {
        const EXPECTED = '   |/*| Just| some| text| a|+=| 3| +|5|-|3| */|  |';
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => deleteWordRight(ed), (ed) => new Position(1, text.length - ed.getValue().length + 1), (ed) => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordRight - issue #3882', () => {
        withTestCodeEditor(['public void Add( int x,', '                 int y )'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 24));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(1), 'public void Add( int x,int y )', '001');
        });
    });
    test('deleteWordStartRight - issue #3882', () => {
        withTestCodeEditor(['public void Add( int x,', '                 int y )'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 24));
            deleteWordStartRight(editor);
            assert.strictEqual(model.getLineContent(1), 'public void Add( int x,int y )', '001');
        });
    });
    test('deleteWordEndRight - issue #3882', () => {
        withTestCodeEditor(['public void Add( int x,', '                 int y )'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 24));
            deleteWordEndRight(editor);
            assert.strictEqual(model.getLineContent(1), 'public void Add( int x,int y )', '001');
        });
    });
    test('deleteWordStartRight', () => {
        const EXPECTED = '   |/* |Just |some |text |a|+= |3 |+|5|-|3 |*/  |';
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => deleteWordStartRight(ed), (ed) => new Position(1, text.length - ed.getValue().length + 1), (ed) => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordEndRight', () => {
        const EXPECTED = '   /*| Just| some| text| a|+=| 3| +|5|-|3| */|  |';
        const [text] = deserializePipePositions(EXPECTED);
        const actualStops = testRepeatedActionAndExtractPositions(text, new Position(1, 1), (ed) => deleteWordEndRight(ed), (ed) => new Position(1, text.length - ed.getValue().length + 1), (ed) => ed.getValue().length === 0);
        const actual = serializePipePositions(text, actualStops);
        assert.deepStrictEqual(actual, EXPECTED);
    });
    test('deleteWordRight - issue #3882 (1): Ctrl+Delete removing entire line when used at the end of line', () => {
        withTestCodeEditor(['A line with text.', '   And another one'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 18));
            deleteWordRight(editor);
            assert.strictEqual(model.getLineContent(1), 'A line with text.And another one', '001');
        });
    });
    test('deleteWordLeft - issue #3882 (2): Ctrl+Delete removing entire line when used at the end of line', () => {
        withTestCodeEditor(['A line with text.', '   And another one'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteWordLeft(editor);
            assert.strictEqual(model.getLineContent(1), 'A line with text.   And another one', '001');
        });
    });
    test("deleteWordLeft - issue #91855: Matching (quote, bracket, paren) doesn't get deleted when hitting Ctrl+Backspace", () => {
        const languageId = 'myTestMode';
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            autoClosingPairs: [{ open: '\"', close: '\"' }],
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, 'a ""', languageId));
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model, { autoClosingDelete: 'always' }));
        editor.setPosition(new Position(1, 4));
        deleteWordLeft(editor);
        assert.strictEqual(model.getLineContent(1), 'a ');
    });
    test('deleteInsideWord - empty line', () => {
        withTestCodeEditor(['Line1', '', 'Line2'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(2, 1));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Line1\nLine2');
        });
    });
    test('deleteInsideWord - in whitespace 1', () => {
        withTestCodeEditor(['Just  some text.'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 6));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Justsome text.');
        });
    });
    test('deleteInsideWord - in whitespace 2', () => {
        withTestCodeEditor(['Just     some text.'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 6));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Justsome text.');
        });
    });
    test('deleteInsideWord - in whitespace 3', () => {
        withTestCodeEditor(['Just     "some text.'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 6));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'Just"some text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '"some text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'some text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'text.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '.');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
    test('deleteInsideWord - in non-words', () => {
        withTestCodeEditor(['x=3+4+5+6'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 7));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=3+45+6');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=3++6');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=36');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x=');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'x');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
    test('deleteInsideWord - in words 1', () => {
        withTestCodeEditor(['This is interesting'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 7));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This interesting');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
    test('deleteInsideWord - in words 2', () => {
        withTestCodeEditor(['This  is  interesting'], {}, (editor, _) => {
            const model = editor.getModel();
            editor.setPosition(new Position(1, 7));
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This  interesting');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), 'This');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
            deleteInsideWord(editor);
            assert.strictEqual(model.getValue(), '');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZE9wZXJhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3dvcmRPcGVyYXRpb25zL3Rlc3QvYnJvd3Nlci93b3JkT3BlcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBR3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFN0csT0FBTyxFQUNOLDJCQUEyQixFQUMzQixpQ0FBaUMsRUFDakMsNEJBQTRCLEVBQzVCLGtDQUFrQyxFQUNsQyxpQkFBaUIsRUFDakIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQix3QkFBd0IsRUFDeEIsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixlQUFlLEVBQ2YscUJBQXFCLEVBQ3JCLG1CQUFtQixFQUNuQix5QkFBeUIsRUFDekIsb0JBQW9CLEVBQ3BCLDBCQUEwQixFQUMxQixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixjQUFjLEVBQ2QsZUFBZSxFQUNmLG1CQUFtQixFQUNuQixvQkFBb0IsR0FDcEIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHNCQUFzQixFQUN0QixxQ0FBcUMsR0FDckMsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHlCQUF5QixFQUN6QixrQkFBa0IsR0FDbEIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUcvRSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO0lBQ3RELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFBO0lBQ2xELE1BQU0sZUFBZSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7SUFDNUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLHlCQUF5QixFQUFFLENBQUE7SUFDbEUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7SUFDOUQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUE7SUFDeEQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUE7SUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUE7SUFDcEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQzlDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFBO0lBQ3BFLE1BQU0seUJBQXlCLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO0lBQ2hFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFBO0lBQzFELE1BQU0sNEJBQTRCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFBO0lBQ3RFLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSxpQ0FBaUMsRUFBRSxDQUFBO0lBQ2xGLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSw0QkFBNEIsRUFBRSxDQUFBO0lBQ3hFLE1BQU0sbUNBQW1DLEdBQUcsSUFBSSxrQ0FBa0MsRUFBRSxDQUFBO0lBQ3BGLE1BQU0sZUFBZSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7SUFDNUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUE7SUFDdEQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQzlDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFBO0lBQ3hELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFBO0lBQ3BELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO0lBRWhELElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksNEJBQTJELENBQUE7SUFDL0QsSUFBSSxlQUFpQyxDQUFBO0lBRXJDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM1RCw0QkFBNEIsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUN0RixlQUFlLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDN0QsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLGdCQUFnQixDQUFDLE1BQW1CLEVBQUUsT0FBc0I7UUFDcEUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDaEQsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDakQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBQ0QsU0FBUyxjQUFjLENBQUMsTUFBbUIsRUFBRSxrQkFBMkIsS0FBSztRQUM1RSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDcEYsQ0FBQztJQUNELFNBQVMsMkJBQTJCLENBQ25DLE1BQW1CLEVBQ25CLGtCQUEyQixLQUFLO1FBRWhDLGdCQUFnQixDQUNmLE1BQU0sRUFDTixlQUFlLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FDbkYsQ0FBQTtJQUNGLENBQUM7SUFDRCxTQUFTLDRCQUE0QixDQUNwQyxNQUFtQixFQUNuQixrQkFBMkIsS0FBSztRQUVoQyxnQkFBZ0IsQ0FDZixNQUFNLEVBQ04sZUFBZSxDQUFDLENBQUMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQ3JGLENBQUE7SUFDRixDQUFDO0lBQ0QsU0FBUyxtQkFBbUIsQ0FBQyxNQUFtQixFQUFFLGtCQUEyQixLQUFLO1FBQ2pGLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0lBQzlGLENBQUM7SUFDRCxTQUFTLGlCQUFpQixDQUFDLE1BQW1CLEVBQUUsa0JBQTJCLEtBQUs7UUFDL0UsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDMUYsQ0FBQztJQUNELFNBQVMsZUFBZSxDQUFDLE1BQW1CLEVBQUUsa0JBQTJCLEtBQUs7UUFDN0UsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDdEYsQ0FBQztJQUNELFNBQVMsZ0JBQWdCLENBQUMsTUFBbUIsRUFBRSxrQkFBMkIsS0FBSztRQUM5RSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUM1RixDQUFDO0lBQ0QsU0FBUyxrQkFBa0IsQ0FBQyxNQUFtQixFQUFFLGtCQUEyQixLQUFLO1FBQ2hGLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hHLENBQUM7SUFDRCxTQUFTLGNBQWMsQ0FBQyxNQUFtQjtRQUMxQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUNELFNBQVMsbUJBQW1CLENBQUMsTUFBbUI7UUFDL0MsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUNELFNBQVMsaUJBQWlCLENBQUMsTUFBbUI7UUFDN0MsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDLENBQUE7SUFDN0MsQ0FBQztJQUNELFNBQVMsZUFBZSxDQUFDLE1BQW1CO1FBQzNDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFDRCxTQUFTLG9CQUFvQixDQUFDLE1BQW1CO1FBQ2hELGdCQUFnQixDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hELENBQUM7SUFDRCxTQUFTLGtCQUFrQixDQUFDLE1BQW1CO1FBQzlDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0lBQzlDLENBQUM7SUFDRCxTQUFTLGdCQUFnQixDQUFDLE1BQW1CO1FBQzVDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLDRCQUE0QjtZQUM1QixzQkFBc0I7WUFDdEIscUJBQXFCO1lBQ3JCLEdBQUc7WUFDSCxJQUFJO1NBQ0osQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDWixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQzFCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxrQkFBa0IsQ0FDakIsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQzNFLEVBQUUsRUFDRixDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzVCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQzFCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEdBQUcsRUFBRTtRQUNoRixNQUFNLFFBQVEsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDbkIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsRUFDMUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ3BELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0NBQWtDLEVBQUU7UUFDeEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLG9EQUFvRDtZQUNwRCxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUNuQixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUNoQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDcEQ7WUFDQyxvQkFBb0IsRUFBRSxJQUFJO1NBQzFCLENBQ0QsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUNoQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDcEQ7WUFDQyxvQkFBb0IsRUFBRSxFQUFFO1NBQ3hCLENBQ0QsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7UUFDaEUsTUFBTSxJQUFJLEdBQUc7WUFDWixVQUFVO1lBQ1Ysa0JBQWtCO1lBQ2xCLDBCQUEwQjtZQUMxQixtQ0FBbUM7WUFDbkMsNkNBQTZDO1lBQzdDLGtDQUFrQztZQUNsQyxHQUFHO1lBQ0gsVUFBVTtZQUNWLGtCQUFrQjtZQUNsQiwwQkFBMEI7WUFDMUIsbUNBQW1DO1lBQ25DLDBFQUEwRTtZQUMxRSxHQUFHO1NBQ0gsQ0FBQTtRQUNELGtCQUFrQixDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUN2QyxNQUFNLENBQUMsYUFBYSxDQUFDO2dCQUNwQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2dCQUM3QixJQUFJLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7YUFDN0IsQ0FBQyxDQUFBO1lBQ0YsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDOUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNCLElBQUksU0FBUyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2FBQzdCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUdBQXlHLEVBQUUsR0FBRyxFQUFFO1FBQ3BILE1BQU0sUUFBUSxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUNuQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFDaEMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ3BELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ2hDLDRFQUE0RTtRQUM1RSxNQUFNLFFBQVEsR0FBRyxDQUFDLG1FQUFtRSxDQUFDLENBQUMsSUFBSSxDQUMxRixJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFDeEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxFQUMvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDcEQsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrRkFBa0YsRUFBRSxHQUFHLEVBQUU7UUFDN0YsNEVBQTRFO1FBQzVFLE1BQU0sUUFBUSxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUN4QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLEVBQy9CLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtRQUNyRixTQUFTLElBQUksQ0FBQyxTQUFvQixFQUFFLElBQVk7WUFDL0MsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQzNDLENBQUM7UUFDRixDQUFDO1FBRUQsa0JBQWtCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNoRCxJQUFJLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBRXBELG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFFcEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUE7WUFFckQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUE7UUFDckQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxtRUFBbUUsQ0FBQyxDQUFDLElBQUksQ0FDMUYsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ3hCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsRUFDN0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQ3BELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sUUFBUSxHQUFHO1lBQ2hCLDRCQUE0QjtZQUM1QixxQkFBcUI7WUFDckIsb0JBQW9CO1lBQ3BCLEdBQUc7WUFDSCxJQUFJO1NBQ0osQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDWixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQzNCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxrQkFBa0IsQ0FDakIsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQzNFLEVBQUUsRUFDRixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNiLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsZUFBZSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pFLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLENBQUMsaUVBQWlFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUMzQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDckQsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsTUFBTSxRQUFRLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQzNCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNyRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQ3pDLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixvREFBb0Q7WUFDcEQsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbkIsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUMzQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDckQ7WUFDQyxvQkFBb0IsRUFBRSxJQUFJO1NBQzFCLENBQ0QsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQzNCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUNyRDtZQUNDLG9CQUFvQixFQUFFLEVBQUU7U0FDeEIsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtRQUM3QixNQUFNLFFBQVEsR0FBRyxDQUFDLGlFQUFpRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9GLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxFQUM1QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDckQsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFDL0IsNEVBQTRFO1FBQzVFLE1BQU0sUUFBUSxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQyxJQUFJLENBQzFGLElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLEVBQzlCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNyRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlGQUFpRixFQUFFLEdBQUcsRUFBRTtRQUM1Riw0RUFBNEU7UUFDNUUsTUFBTSxRQUFRLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsRUFDOUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ3JELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUVBQW1FLEVBQUUsR0FBRyxFQUFFO1FBQzlFLDRFQUE0RTtRQUM1RSxNQUFNLFFBQVEsR0FBRyxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2xCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsRUFDOUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ3JELENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLENBQUMsNkRBQTZELENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDM0YsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUN4QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLEVBQ3ZDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUNwRCxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUN6QyxNQUFNLFFBQVEsR0FBRyxDQUFDLDZEQUE2RCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzNGLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxFQUN4QyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDckQsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7UUFDbkQsa0JBQWtCLENBQ2pCLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUMzRSxFQUFFLEVBQ0YsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDYixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtRQUMvRCxrQkFBa0IsQ0FDakIsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQzNFLEVBQUUsRUFDRixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNiLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtZQUNyRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtRQUMzRCxrQkFBa0IsQ0FDakIsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQzNFLEVBQUUsRUFDRixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNiLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDekQsa0JBQWtCLENBQ2pCLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUMzRSxFQUFFLEVBQ0YsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDYixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3pELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELGtCQUFrQixDQUNqQixDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFDM0UsRUFBRSxFQUNGLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELGtCQUFrQixDQUNqQixDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFDM0UsRUFBRSxFQUNGLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7UUFDMUQsa0JBQWtCLENBQ2pCLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUMzRSxFQUFFLEVBQ0YsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDYixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pFLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsdURBQXVELEVBQUUsR0FBRyxFQUFFO1FBQ2xFLGtCQUFrQixDQUNqQixDQUFDLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsRUFDM0UsRUFBRSxFQUNGLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2IsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQTtZQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtRQUMxRCxrQkFBa0IsQ0FDakIsQ0FBQyx3QkFBd0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQzNFLEVBQUUsRUFDRixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNiLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDekQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsa0JBQWtCLENBQ2pCLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUMzRSxFQUFFLEVBQ0YsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDYixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLHFCQUFxQixDQUFDLENBQUE7WUFDbEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM5RSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDLEVBQzFCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFHLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FDbEMsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxRQUFRLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDakQsTUFBTSxXQUFXLEdBQUcscUNBQXFDLENBQ3hELElBQUksRUFDSixJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQ3pCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsRUFDL0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUcsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNsQyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUM5QixNQUFNLFFBQVEsR0FBRyxDQUFDLCtDQUErQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFDekIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxFQUM3QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRyxFQUN6QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQ2xDLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLGtCQUFrQixDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xELENBQUMsQ0FBQyxDQUFBO1FBRUYsa0JBQWtCLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2hELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNsRCxDQUFDLENBQUMsQ0FBQTtRQUVGLGtCQUFrQixDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxRQUFRLEdBQUcsb0RBQW9ELENBQUE7UUFDckUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUMzQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDL0QsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNsQyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxrQkFBa0IsQ0FBQyxDQUFDLHlCQUF5QixFQUFFLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdGLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckYsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0Msa0JBQWtCLENBQUMsQ0FBQyx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3RixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckYsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7UUFDN0Msa0JBQWtCLENBQUMsQ0FBQyx5QkFBeUIsRUFBRSwwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3RixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2QyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckYsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7UUFDakMsTUFBTSxRQUFRLEdBQUcsbURBQW1ELENBQUE7UUFDcEUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUN4RCxJQUFJLEVBQ0osSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNsQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLEVBQ2hDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUMvRCxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQ2xDLENBQUE7UUFDRCxNQUFNLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQy9CLE1BQU0sUUFBUSxHQUFHLG1EQUFtRCxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNqRCxNQUFNLFdBQVcsR0FBRyxxQ0FBcUMsQ0FDeEQsSUFBSSxFQUNKLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDbEIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxFQUM5QixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDL0QsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNsQyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtHQUFrRyxFQUFFLEdBQUcsRUFBRTtRQUM3RyxrQkFBa0IsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2pGLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkYsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpR0FBaUcsRUFBRSxHQUFHLEVBQUU7UUFDNUcsa0JBQWtCLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNqRixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLHFDQUFxQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUhBQWlILEVBQUUsR0FBRyxFQUFFO1FBQzVILE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQTtRQUUvQixXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckUsV0FBVyxDQUFDLEdBQUcsQ0FDZCw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFO1lBQ2pELGdCQUFnQixFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQztTQUMvQyxDQUFDLENBQ0YsQ0FBQTtRQUVELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFDN0YsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDN0IseUJBQXlCLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FDdkYsQ0FBQTtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNsRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM1RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUNyRCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtRQUMvQyxrQkFBa0IsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzFELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUE7UUFDdkQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDL0Msa0JBQWtCLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM3RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3ZELENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO1FBQy9DLGtCQUFrQixDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDOUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRyxDQUFBO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtZQUN2RCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQTtZQUNuRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtZQUNsRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUM3QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUN6QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM1QyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNuRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNoRCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUM5QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUM1QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUMxQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtZQUN6QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFLEdBQUcsRUFBRTtRQUMxQyxrQkFBa0IsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzdELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQTtZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLGtCQUFrQixDQUFDLENBQUE7WUFDeEQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDNUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDeEMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDeEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDekMsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsa0JBQWtCLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUMvRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFHLENBQUE7WUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN0QyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO1lBQ3pELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzVDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3hDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9