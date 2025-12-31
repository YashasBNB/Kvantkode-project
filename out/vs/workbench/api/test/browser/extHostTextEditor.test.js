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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRleHRFZGl0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUZXh0RWRpdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFNdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWhGLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsSUFBSSxNQUF5QixDQUFBO0lBQzdCLE1BQU0sR0FBRyxHQUFHLElBQUksbUJBQW1CLENBQ2xDLFNBQVUsRUFDVixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUNaLENBQUMsb0JBQW9CLENBQUMsRUFDdEIsSUFBSSxFQUNKLENBQUMsRUFDRCxNQUFNLEVBQ04sS0FBSyxFQUNMLE1BQU0sQ0FDTixDQUFBO0lBRUQsS0FBSyxD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