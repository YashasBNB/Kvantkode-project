/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { getSelectionSearchString } from '../../browser/findController.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
suite('Find', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('search string at position', () => {
        withTestCodeEditor(['ABC DEF', '0123 456'], {}, (editor) => {
            // The cursor is at the very top, of the file, at the first ABC
            const searchStringAtTop = getSelectionSearchString(editor);
            assert.strictEqual(searchStringAtTop, 'ABC');
            // Move cursor to the end of ABC
            editor.setPosition(new Position(1, 3));
            const searchStringAfterABC = getSelectionSearchString(editor);
            assert.strictEqual(searchStringAfterABC, 'ABC');
            // Move cursor to DEF
            editor.setPosition(new Position(1, 5));
            const searchStringInsideDEF = getSelectionSearchString(editor);
            assert.strictEqual(searchStringInsideDEF, 'DEF');
        });
    });
    test('search string with selection', () => {
        withTestCodeEditor(['ABC DEF', '0123 456'], {}, (editor) => {
            // Select A of ABC
            editor.setSelection(new Range(1, 1, 1, 2));
            const searchStringSelectionA = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionA, 'A');
            // Select BC of ABC
            editor.setSelection(new Range(1, 2, 1, 4));
            const searchStringSelectionBC = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionBC, 'BC');
            // Select BC DE
            editor.setSelection(new Range(1, 2, 1, 7));
            const searchStringSelectionBCDE = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionBCDE, 'BC DE');
        });
    });
    test('search string with multiline selection', () => {
        withTestCodeEditor(['ABC DEF', '0123 456'], {}, (editor) => {
            // Select first line and newline
            editor.setSelection(new Range(1, 1, 2, 1));
            const searchStringSelectionWholeLine = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionWholeLine, null);
            // Select first line and chunk of second
            editor.setSelection(new Range(1, 1, 2, 4));
            const searchStringSelectionTwoLines = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionTwoLines, null);
            // Select end of first line newline and chunk of second
            editor.setSelection(new Range(1, 7, 2, 4));
            const searchStringSelectionSpanLines = getSelectionSearchString(editor);
            assert.strictEqual(searchStringSelectionSpanLines, null);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL3Rlc3QvYnJvd3Nlci9maW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFL0UsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7SUFDbEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLGtCQUFrQixDQUFDLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzFELCtEQUErRDtZQUMvRCxNQUFNLGlCQUFpQixHQUFHLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFNUMsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsTUFBTSxvQkFBb0IsR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM3RCxNQUFNLENBQUMsV0FBVyxD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