/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands, CoreNavigationCommands } from '../../../../browser/coreCommands.js';
import { Selection } from '../../../../common/core/selection.js';
import { CursorUndo, CursorUndoRedoController } from '../../browser/cursorUndo.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
suite('FindController', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const cursorUndoAction = new CursorUndo();
    test('issue #82535: Edge case with cursorUndo', () => {
        withTestCodeEditor('', {}, (editor) => {
            editor.registerAndInstantiateContribution(CursorUndoRedoController.ID, CursorUndoRedoController);
            // type hello
            editor.trigger('test', "type" /* Handler.Type */, { text: 'hello' });
            // press left
            CoreNavigationCommands.CursorLeft.runEditorCommand(null, editor, {});
            // press Delete
            CoreEditingCommands.DeleteRight.runEditorCommand(null, editor, {});
            assert.deepStrictEqual(editor.getValue(), 'hell');
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 5, 1, 5)]);
            // press left
            CoreNavigationCommands.CursorLeft.runEditorCommand(null, editor, {});
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 4, 1, 4)]);
            // press Ctrl+U
            cursorUndoAction.run(null, editor, {});
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 5, 1, 5)]);
        });
    });
    test('issue #82535: Edge case with cursorUndo (reverse)', () => {
        withTestCodeEditor('', {}, (editor) => {
            editor.registerAndInstantiateContribution(CursorUndoRedoController.ID, CursorUndoRedoController);
            // type hello
            editor.trigger('test', "type" /* Handler.Type */, { text: 'hell' });
            editor.trigger('test', "type" /* Handler.Type */, { text: 'o' });
            assert.deepStrictEqual(editor.getValue(), 'hello');
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
            // press Ctrl+U
            cursorUndoAction.run(null, editor, {});
            assert.deepStrictEqual(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVW5kby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jdXJzb3JVbmRvL3Rlc3QvYnJvd3Nlci9jdXJzb3JVbmRvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFL0UsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtJQUM1Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxVQUFVLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNyQyxNQUFNLENBQUMsa0NBQWtDLENBQ3hDLHdCQUF3QixDQUFDLEVBQUUsRUFDM0Isd0JBQXdCLENBQ3hCLENBQUE7WUFFRCxhQUFhO1lBQ2IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLDZCQUFnQixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFBO1lBRXZELGFBQWE7WUFDYixzQkFBc0IsQ0FBQyxVQUFVLENB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