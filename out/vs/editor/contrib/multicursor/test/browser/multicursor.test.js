/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { CommonFindController } from '../../../find/browser/findController.js';
import { AddSelectionToNextFindMatchAction, InsertCursorAbove, InsertCursorBelow, MultiCursorSelectionController, SelectHighlightsAction, } from '../../browser/multicursor.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IStorageService, InMemoryStorageService, } from '../../../../../platform/storage/common/storage.js';
suite('Multicursor', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('issue #26393: Multiple cursors + Word wrap', () => {
        withTestCodeEditor(['a'.repeat(20), 'a'.repeat(20)], { wordWrap: 'wordWrapColumn', wordWrapColumn: 10 }, (editor, viewModel) => {
            const addCursorDownAction = new InsertCursorBelow();
            addCursorDownAction.run(null, editor, {});
            assert.strictEqual(viewModel.getCursorStates().length, 2);
            assert.strictEqual(viewModel.getCursorStates()[0].viewState.position.lineNumber, 1);
            assert.strictEqual(viewModel.getCursorStates()[1].viewState.position.lineNumber, 3);
            editor.setPosition({ lineNumber: 4, column: 1 });
            const addCursorUpAction = new InsertCursorAbove();
            addCursorUpAction.run(null, editor, {});
            assert.strictEqual(viewModel.getCursorStates().length, 2);
            assert.strictEqual(viewModel.getCursorStates()[0].viewState.position.lineNumber, 4);
            assert.strictEqual(viewModel.getCursorStates()[1].viewState.position.lineNumber, 2);
        });
    });
    test('issue #2205: Multi-cursor pastes in reverse order', () => {
        withTestCodeEditor(['abc', 'def'], {}, (editor, viewModel) => {
            const addCursorUpAction = new InsertCursorAbove();
            editor.setSelection(new Selection(2, 1, 2, 1));
            addCursorUpAction.run(null, editor, {});
            assert.strictEqual(viewModel.getSelections().length, 2);
            editor.trigger('test', "paste" /* Handler.Paste */, {
                text: '1\n2',
                multicursorText: ['1', '2'],
            });
            assert.strictEqual(editor.getModel().getLineContent(1), '1abc');
            assert.strictEqual(editor.getModel().getLineContent(2), '2def');
        });
    });
    test('issue #1336: Insert cursor below on last line adds a cursor to the end of the current line', () => {
        withTestCodeEditor(['abc'], {}, (editor, viewModel) => {
            const addCursorDownAction = new InsertCursorBelow();
            addCursorDownAction.run(null, editor, {});
            assert.strictEqual(viewModel.getSelections().length, 1);
        });
    });
});
function fromRange(rng) {
    return [rng.startLineNumber, rng.startColumn, rng.endLineNumber, rng.endColumn];
}
suite('Multicursor selection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const serviceCollection = new ServiceCollection();
    serviceCollection.set(IStorageService, new InMemoryStorageService());
    test('issue #8817: Cursor position changes when you cancel multicursor', () => {
        withTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3 * 5)'], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const selectHighlightsAction = new SelectHighlightsAction();
            editor.setSelection(new Selection(2, 9, 2, 16));
            selectHighlightsAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [2, 9, 2, 16],
                [1, 9, 1, 16],
                [3, 9, 3, 16],
            ]);
            editor.trigger('test', 'removeSecondaryCursors', null);
            assert.deepStrictEqual(fromRange(editor.getSelection()), [2, 9, 2, 16]);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('issue #5400: "Select All Occurrences of Find Match" does not select all if find uses regex', () => {
        withTestCodeEditor(['something', 'someething', 'someeething', 'nothing'], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const selectHighlightsAction = new SelectHighlightsAction();
            editor.setSelection(new Selection(1, 1, 1, 1));
            findController
                .getState()
                .change({ searchString: 'some+thing', isRegex: true, isRevealed: true }, false);
            selectHighlightsAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 1, 1, 10],
                [2, 1, 2, 11],
                [3, 1, 3, 12],
            ]);
            assert.strictEqual(findController.getState().searchString, 'some+thing');
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('AddSelectionToNextFindMatchAction can work with multiline', () => {
        withTestCodeEditor(['', 'qwe', 'rty', '', 'qwe', '', 'rty', 'qwe', 'rty'], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const addSelectionToNextFindMatch = new AddSelectionToNextFindMatchAction();
            editor.setSelection(new Selection(2, 1, 3, 4));
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [2, 1, 3, 4],
                [8, 1, 9, 4],
            ]);
            editor.trigger('test', 'removeSecondaryCursors', null);
            assert.deepStrictEqual(fromRange(editor.getSelection()), [2, 1, 3, 4]);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('issue #6661: AddSelectionToNextFindMatchAction can work with touching ranges', () => {
        withTestCodeEditor(['abcabc', 'abc', 'abcabc'], { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const addSelectionToNextFindMatch = new AddSelectionToNextFindMatchAction();
            editor.setSelection(new Selection(1, 1, 1, 4));
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 1, 1, 4],
                [1, 4, 1, 7],
            ]);
            addSelectionToNextFindMatch.run(null, editor);
            addSelectionToNextFindMatch.run(null, editor);
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 1, 1, 4],
                [1, 4, 1, 7],
                [2, 1, 2, 4],
                [3, 1, 3, 4],
                [3, 4, 3, 7],
            ]);
            editor.trigger('test', "type" /* Handler.Type */, { text: 'z' });
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [1, 2, 1, 2],
                [1, 3, 1, 3],
                [2, 2, 2, 2],
                [3, 2, 3, 2],
                [3, 3, 3, 3],
            ]);
            assert.strictEqual(editor.getValue(), ['zz', 'z', 'zz'].join('\n'));
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    test('issue #23541: Multiline Ctrl+D does not work in CRLF files', () => {
        withTestCodeEditor(['', 'qwe', 'rty', '', 'qwe', '', 'rty', 'qwe', 'rty'], { serviceCollection: serviceCollection }, (editor) => {
            editor.getModel().setEOL(1 /* EndOfLineSequence.CRLF */);
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            const addSelectionToNextFindMatch = new AddSelectionToNextFindMatchAction();
            editor.setSelection(new Selection(2, 1, 3, 4));
            addSelectionToNextFindMatch.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromRange), [
                [2, 1, 3, 4],
                [8, 1, 9, 4],
            ]);
            editor.trigger('test', 'removeSecondaryCursors', null);
            assert.deepStrictEqual(fromRange(editor.getSelection()), [2, 1, 3, 4]);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    });
    function testMulticursor(text, callback) {
        withTestCodeEditor(text, { serviceCollection: serviceCollection }, (editor) => {
            const findController = editor.registerAndInstantiateContribution(CommonFindController.ID, CommonFindController);
            const multiCursorSelectController = editor.registerAndInstantiateContribution(MultiCursorSelectionController.ID, MultiCursorSelectionController);
            callback(editor, findController);
            multiCursorSelectController.dispose();
            findController.dispose();
        });
    }
    function testAddSelectionToNextFindMatchAction(text, callback) {
        testMulticursor(text, (editor, findController) => {
            const action = new AddSelectionToNextFindMatchAction();
            callback(editor, action, findController);
        });
    }
    test('AddSelectionToNextFindMatchAction starting with single collapsed selection', () => {
        const text = ['abc pizza', 'abc house', 'abc bar'];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([new Selection(1, 2, 1, 2)]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 4)]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with two selections, one being collapsed 1)', () => {
        const text = ['abc pizza', 'abc house', 'abc bar'];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([new Selection(1, 1, 1, 4), new Selection(2, 2, 2, 2)]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with two selections, one being collapsed 2)', () => {
        const text = ['abc pizza', 'abc house', 'abc bar'];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([new Selection(1, 2, 1, 2), new Selection(2, 1, 2, 4)]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with all collapsed selections', () => {
        const text = ['abc pizza', 'abc house', 'abc bar'];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 2, 1, 2),
                new Selection(2, 2, 2, 2),
                new Selection(3, 1, 3, 1),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 4),
                new Selection(2, 1, 2, 4),
                new Selection(3, 1, 3, 4),
            ]);
        });
    });
    test('AddSelectionToNextFindMatchAction starting with all collapsed selections on different words', () => {
        const text = ['abc pizza', 'abc house', 'abc bar'];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([
                new Selection(1, 6, 1, 6),
                new Selection(2, 6, 2, 6),
                new Selection(3, 6, 3, 6),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 5, 1, 10),
                new Selection(2, 5, 2, 10),
                new Selection(3, 5, 3, 8),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 5, 1, 10),
                new Selection(2, 5, 2, 10),
                new Selection(3, 5, 3, 8),
            ]);
        });
    });
    test('issue #20651: AddSelectionToNextFindMatchAction case insensitive', () => {
        const text = ['test', 'testte', 'Test', 'testte', 'test'];
        testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
            editor.setSelections([new Selection(1, 1, 1, 5)]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
                new Selection(5, 1, 5, 5),
            ]);
            action.run(null, editor);
            assert.deepStrictEqual(editor.getSelections(), [
                new Selection(1, 1, 1, 5),
                new Selection(2, 1, 2, 5),
                new Selection(3, 1, 3, 5),
                new Selection(4, 1, 4, 5),
                new Selection(5, 1, 5, 5),
            ]);
        });
    });
    suite('Find state disassociation', () => {
        const text = ['app', 'apples', 'whatsapp', 'app', 'App', ' app'];
        test('enters mode', () => {
            testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
                editor.setSelections([new Selection(1, 2, 1, 2)]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 4)]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                    new Selection(6, 2, 6, 5),
                ]);
            });
        });
        test('leaves mode when selection changes', () => {
            testAddSelectionToNextFindMatchAction(text, (editor, action, findController) => {
                editor.setSelections([new Selection(1, 2, 1, 2)]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 1, 1, 4)]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                ]);
                // change selection
                editor.setSelections([new Selection(1, 1, 1, 4)]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(2, 1, 2, 4),
                ]);
            });
        });
        test('Select Highlights respects mode ', () => {
            testMulticursor(text, (editor, findController) => {
                const action = new SelectHighlightsAction();
                editor.setSelections([new Selection(1, 2, 1, 2)]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                    new Selection(6, 2, 6, 5),
                ]);
                action.run(null, editor);
                assert.deepStrictEqual(editor.getSelections(), [
                    new Selection(1, 1, 1, 4),
                    new Selection(4, 1, 4, 4),
                    new Selection(6, 2, 6, 5),
                ]);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGljdXJzb3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL211bHRpY3Vyc29yL3Rlc3QvYnJvd3Nlci9tdWx0aWN1cnNvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUUsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxpQkFBaUIsRUFDakIsaUJBQWlCLEVBQ2pCLDhCQUE4QixFQUM5QixzQkFBc0IsR0FDdEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQW1CLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUNOLGVBQWUsRUFDZixzQkFBc0IsR0FDdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7UUFDdkQsa0JBQWtCLENBQ2pCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ2hDLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsRUFDbEQsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFF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