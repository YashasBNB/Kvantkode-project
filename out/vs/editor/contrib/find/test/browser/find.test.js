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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC90ZXN0L2Jyb3dzZXIvZmluZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRS9FLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO0lBQ2xCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN0QyxrQkFBa0IsQ0FBQyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMxRCwrREFBK0Q7WUFDL0QsTUFBTSxpQkFBaUIsR0FBRyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMxRCxNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRTVDLGdDQUFnQztZQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sb0JBQW9CLEdBQUcsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxv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