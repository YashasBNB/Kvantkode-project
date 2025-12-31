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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVW5kby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY3Vyc29yVW5kby90ZXN0L2Jyb3dzZXIvY3Vyc29yVW5kby50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRS9FLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLGdCQUFnQixHQUFHLElBQUksVUFBVSxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHlDQUF5QyxFQUFFLEdBQUcsRUFBRTtRQUNwRCxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckMsTUFBTSxDQUFDLGtDQUFrQyxDQUN4Qyx3QkFBd0IsQ0FBQyxFQUFFLEVBQzNCLHdCQUF3QixDQUN4QixDQUFBO1lBRUQsYUFBYTtZQUNiLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSw2QkFBZ0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtZQUV2RCxhQUFhO1lBQ2Isc0JBQXNCLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFB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