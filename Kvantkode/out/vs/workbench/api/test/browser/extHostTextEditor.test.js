/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Lazy } from '../../../../base/common/lazy.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TextEditorCursorStyle, } from '../../../../editor/common/config/editorOptions.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { ExtHostDocumentData } from '../../common/extHostDocumentData.js';
import { ExtHostTextEditor, ExtHostTextEditorOptions } from '../../common/extHostTextEditor.js';
import { Range, TextEditorLineNumbersStyle } from '../../common/extHostTypes.js';
suite('ExtHostTextEditor', () => {
    let editor;
    const doc = new ExtHostDocumentData(undefined, URI.file(''), ['aaaa bbbb+cccc abc'], '\n', 1, 'text', false, 'utf8');
    setup(() => {
        editor = new ExtHostTextEditor('fake', null, new NullLogService(), new Lazy(() => doc.document), [], {
            cursorStyle: TextEditorCursorStyle.Line,
            insertSpaces: true,
            lineNumbers: 1,
            tabSize: 4,
            indentSize: 4,
            originalIndentSize: 'tabSize',
        }, [], 1);
    });
    test('disposed editor', () => {
        assert.ok(editor.value.document);
        editor._acceptViewColumn(3);
        assert.strictEqual(3, editor.value.viewColumn);
        editor.dispose();
        assert.throws(() => editor._acceptViewColumn(2));
        assert.strictEqual(3, editor.value.viewColumn);
        assert.ok(editor.value.document);
        assert.throws(() => editor._acceptOptions(null));
        assert.throws(() => editor._acceptSelections([]));
    });
    test('API [bug]: registerTextEditorCommand clears redo stack even if no edits are made #55163', async function () {
        let applyCount = 0;
        const editor = new ExtHostTextEditor('edt1', new (class extends mock() {
            $tryApplyEdits() {
                applyCount += 1;
                return Promise.resolve(true);
            }
        })(), new NullLogService(), new Lazy(() => doc.document), [], {
            cursorStyle: TextEditorCursorStyle.Line,
            insertSpaces: true,
            lineNumbers: 1,
            tabSize: 4,
            indentSize: 4,
            originalIndentSize: 'tabSize',
        }, [], 1);
        await editor.value.edit((edit) => { });
        assert.strictEqual(applyCount, 0);
        await editor.value.edit((edit) => {
            edit.setEndOfLine(1);
        });
        assert.strictEqual(applyCount, 1);
        await editor.value.edit((edit) => {
            edit.delete(new Range(0, 0, 1, 1));
        });
        assert.strictEqual(applyCount, 2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('ExtHostTextEditorOptions', () => {
    let opts;
    let calls = [];
    setup(() => {
        calls = [];
        const mockProxy = {
            dispose: undefined,
            $trySetOptions: (id, options) => {
                assert.strictEqual(id, '1');
                calls.push(options);
                return Promise.resolve(undefined);
            },
            $tryShowTextDocument: undefined,
            $registerTextEditorDecorationType: undefined,
            $removeTextEditorDecorationType: undefined,
            $tryShowEditor: undefined,
            $tryHideEditor: undefined,
            $trySetDecorations: undefined,
            $trySetDecorationsFast: undefined,
            $tryRevealRange: undefined,
            $trySetSelections: undefined,
            $tryApplyEdits: undefined,
            $tryInsertSnippet: undefined,
            $getDiffInformation: undefined,
        };
        opts = new ExtHostTextEditorOptions(mockProxy, '1', {
            tabSize: 4,
            indentSize: 4,
            originalIndentSize: 'tabSize',
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        }, new NullLogService());
    });
    teardown(() => {
        opts = null;
        calls = null;
    });
    function assertState(opts, expected) {
        const actual = {
            tabSize: opts.value.tabSize,
            indentSize: opts.value.indentSize,
            insertSpaces: opts.value.insertSpaces,
            cursorStyle: opts.value.cursorStyle,
            lineNumbers: opts.value.lineNumbers,
        };
        assert.deepStrictEqual(actual, expected);
    }
    test('can set tabSize to the same value', () => {
        opts.value.tabSize = 4;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can change tabSize to positive integer', () => {
        opts.value.tabSize = 1;
        assertState(opts, {
            tabSize: 1,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ tabSize: 1 }]);
    });
    test('can change tabSize to positive float', () => {
        opts.value.tabSize = 2.3;
        assertState(opts, {
            tabSize: 2,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ tabSize: 2 }]);
    });
    test('can change tabSize to a string number', () => {
        opts.value.tabSize = '2';
        assertState(opts, {
            tabSize: 2,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ tabSize: 2 }]);
    });
    test('tabSize can request indentation detection', () => {
        opts.value.tabSize = 'auto';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ tabSize: 'auto' }]);
    });
    test('ignores invalid tabSize 1', () => {
        opts.value.tabSize = null;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid tabSize 2', () => {
        opts.value.tabSize = -5;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid tabSize 3', () => {
        opts.value.tabSize = 'hello';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid tabSize 4', () => {
        opts.value.tabSize = '-17';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set indentSize to the same value', () => {
        opts.value.indentSize = 4;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ indentSize: 4 }]);
    });
    test('can change indentSize to positive integer', () => {
        opts.value.indentSize = 1;
        assertState(opts, {
            tabSize: 4,
            indentSize: 1,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ indentSize: 1 }]);
    });
    test('can change indentSize to positive float', () => {
        opts.value.indentSize = 2.3;
        assertState(opts, {
            tabSize: 4,
            indentSize: 2,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ indentSize: 2 }]);
    });
    test('can change indentSize to a string number', () => {
        opts.value.indentSize = '2';
        assertState(opts, {
            tabSize: 4,
            indentSize: 2,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ indentSize: 2 }]);
    });
    test('indentSize can request to use tabSize', () => {
        opts.value.indentSize = 'tabSize';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ indentSize: 'tabSize' }]);
    });
    test('indentSize cannot request indentation detection', () => {
        opts.value.indentSize = 'auto';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 1', () => {
        opts.value.indentSize = null;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 2', () => {
        opts.value.indentSize = -5;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 3', () => {
        opts.value.indentSize = 'hello';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('ignores invalid indentSize 4', () => {
        opts.value.indentSize = '-17';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set insertSpaces to the same value', () => {
        opts.value.insertSpaces = false;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set insertSpaces to boolean', () => {
        opts.value.insertSpaces = true;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ insertSpaces: true }]);
    });
    test('can set insertSpaces to false string', () => {
        opts.value.insertSpaces = 'false';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can set insertSpaces to truey', () => {
        opts.value.insertSpaces = 'hello';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ insertSpaces: true }]);
    });
    test('insertSpaces can request indentation detection', () => {
        opts.value.insertSpaces = 'auto';
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ insertSpaces: 'auto' }]);
    });
    test('can set cursorStyle to same value', () => {
        opts.value.cursorStyle = TextEditorCursorStyle.Line;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can change cursorStyle', () => {
        opts.value.cursorStyle = TextEditorCursorStyle.Block;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Block,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ cursorStyle: TextEditorCursorStyle.Block }]);
    });
    test('can set lineNumbers to same value', () => {
        opts.value.lineNumbers = TextEditorLineNumbersStyle.On;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, []);
    });
    test('can change lineNumbers', () => {
        opts.value.lineNumbers = TextEditorLineNumbersStyle.Off;
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 0 /* RenderLineNumbersType.Off */,
        });
        assert.deepStrictEqual(calls, [{ lineNumbers: 0 /* RenderLineNumbersType.Off */ }]);
    });
    test('can do bulk updates 0', () => {
        opts.assign({
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: TextEditorLineNumbersStyle.On,
        });
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ indentSize: 4 }]);
    });
    test('can do bulk updates 1', () => {
        opts.assign({
            tabSize: 'auto',
            insertSpaces: true,
        });
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: true,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ tabSize: 'auto', insertSpaces: true }]);
    });
    test('can do bulk updates 2', () => {
        opts.assign({
            tabSize: 3,
            insertSpaces: 'auto',
        });
        assertState(opts, {
            tabSize: 3,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Line,
            lineNumbers: 1 /* RenderLineNumbersType.On */,
        });
        assert.deepStrictEqual(calls, [{ tabSize: 3, insertSpaces: 'auto' }]);
    });
    test('can do bulk updates 3', () => {
        opts.assign({
            cursorStyle: TextEditorCursorStyle.Block,
            lineNumbers: TextEditorLineNumbersStyle.Relative,
        });
        assertState(opts, {
            tabSize: 4,
            indentSize: 4,
            insertSpaces: false,
            cursorStyle: TextEditorCursorStyle.Block,
            lineNumbers: 2 /* RenderLineNumbersType.Relative */,
        });
        assert.deepStrictEqual(calls, [
            { cursorStyle: TextEditorCursorStyle.Block, lineNumbers: 2 /* RenderLineNumbersType.Relative */ },
        ]);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdFRleHRFZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQU12RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFaEYsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixJQUFJLE1BQXlCLENBQUE7SUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxtQkFBbUIsQ0FDbEMsU0FBVSxFQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQ1osQ0FBQyxvQkFBb0IsQ0FBQyxFQUN0QixJQUFJLEVBQ0osQ0FBQyxFQUNELE1BQU0sRUFDTixLQUFLLEVBQ0wsTUFBTSxDQUNOLENBQUE7SUFFRCxL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