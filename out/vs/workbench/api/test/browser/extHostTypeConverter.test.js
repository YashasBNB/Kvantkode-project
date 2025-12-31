/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as extHostTypes from '../../common/extHostTypes.js';
import { MarkdownString, NotebookCellOutputItem, NotebookData, LanguageSelector, WorkspaceEdit, } from '../../common/extHostTypeConverters.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostTypeConverter', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    function size(from) {
        let count = 0;
        for (const key in from) {
            if (Object.prototype.hasOwnProperty.call(from, key)) {
                count += 1;
            }
        }
        return count;
    }
    test('MarkdownConvert - uris', function () {
        let data = MarkdownString.from('Hello');
        assert.strictEqual(isEmptyObject(data.uris), true);
        assert.strictEqual(data.value, 'Hello');
        data = MarkdownString.from('Hello [link](foo)');
        assert.strictEqual(data.value, 'Hello [link](foo)');
        assert.strictEqual(isEmptyObject(data.uris), true); // no scheme, no uri
        data = MarkdownString.from('Hello [link](www.noscheme.bad)');
        assert.strictEqual(data.value, 'Hello [link](www.noscheme.bad)');
        assert.strictEqual(isEmptyObject(data.uris), true); // no scheme, no uri
        data = MarkdownString.from('Hello [link](foo:path)');
        assert.strictEqual(data.value, 'Hello [link](foo:path)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['foo:path']);
        data = MarkdownString.from('hello@foo.bar');
        assert.strictEqual(data.value, 'hello@foo.bar');
        assert.strictEqual(size(data.uris), 1);
        // assert.ok(!!data.uris!['mailto:hello@foo.bar']);
        data = MarkdownString.from('*hello* [click](command:me)');
        assert.strictEqual(data.value, '*hello* [click](command:me)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['command:me']);
        data = MarkdownString.from('*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(data.value, '*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['file:///somepath/here']);
        data = MarkdownString.from('*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(data.value, '*hello* [click](file:///somepath/here). [click](file:///somepath/here)');
        assert.strictEqual(size(data.uris), 1);
        assert.ok(!!data.uris['file:///somepath/here']);
        data = MarkdownString.from('*hello* [click](file:///somepath/here). [click](file:///somepath/here2)');
        assert.strictEqual(data.value, '*hello* [click](file:///somepath/here). [click](file:///somepath/here2)');
        assert.strictEqual(size(data.uris), 2);
        assert.ok(!!data.uris['file:///somepath/here']);
        assert.ok(!!data.uris['file:///somepath/here2']);
    });
    test('NPM script explorer running a script from the hover does not work #65561', function () {
        const data = MarkdownString.from('*hello* [click](command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2Ffoo%2Fbaz.ex%22%2C%22path%22%3A%22%2Fc%3A%2Ffoo%2Fbaz.ex%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22dev%22%7D)');
        // assert that both uri get extracted but that the latter is only decoded once...
        assert.strictEqual(size(data.uris), 2);
        for (const value of Object.values(data.uris)) {
            if (value.scheme === 'file') {
                assert.ok(URI.revive(value).toString().indexOf('file:///c%3A') === 0);
            }
            else {
                assert.strictEqual(value.scheme, 'command');
            }
        }
    });
    test('Notebook metadata is ignored when using Notebook Serializer #125716', function () {
        const d = new extHostTypes.NotebookData([]);
        d.cells.push(new extHostTypes.NotebookCellData(extHostTypes.NotebookCellKind.Code, 'hello', 'fooLang'));
        d.metadata = { foo: 'bar', bar: 123 };
        const dto = NotebookData.from(d);
        assert.strictEqual(dto.cells.length, 1);
        assert.strictEqual(dto.cells[0].language, 'fooLang');
        assert.strictEqual(dto.cells[0].source, 'hello');
        assert.deepStrictEqual(dto.metadata, d.metadata);
    });
    test('NotebookCellOutputItem', function () {
        const item = extHostTypes.NotebookCellOutputItem.text('Hello', 'foo/bar');
        const dto = NotebookCellOutputItem.from(item);
        assert.strictEqual(dto.mime, 'foo/bar');
        assert.deepStrictEqual(Array.from(dto.valueBytes.buffer), Array.from(new TextEncoder().encode('Hello')));
        const item2 = NotebookCellOutputItem.to(dto);
        assert.strictEqual(item2.mime, item.mime);
        assert.deepStrictEqual(Array.from(item2.data), Array.from(item.data));
    });
    test('LanguageSelector', function () {
        const out = LanguageSelector.from({ language: 'bat', notebookType: 'xxx' });
        assert.ok(typeof out === 'object');
        assert.deepStrictEqual(out, {
            language: 'bat',
            notebookType: 'xxx',
            scheme: undefined,
            pattern: undefined,
            exclusive: undefined,
        });
    });
    test('JS/TS Surround With Code Actions provide bad Workspace Edits when obtained by VSCode Command API #178654', function () {
        const uri = URI.parse('file:///foo/bar');
        const ws = new extHostTypes.WorkspaceEdit();
        ws.set(uri, [
            extHostTypes.SnippetTextEdit.insert(new extHostTypes.Position(1, 1), new extHostTypes.SnippetString('foo$0bar')),
        ]);
        const dto = WorkspaceEdit.from(ws);
        const first = dto.edits[0];
        assert.strictEqual(first.textEdit.insertAsSnippet, true);
        const ws2 = WorkspaceEdit.to(dto);
        const dto2 = WorkspaceEdit.from(ws2);
        const first2 = dto2.edits[0];
        assert.strictEqual(first2.textEdit.insertAsSnippet, true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RUeXBlQ29udmVydGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxZQUFZLE1BQU0sOEJBQThCLENBQUE7QUFDNUQsT0FBTyxFQUNOLGNBQWMsRUFDZCxzQkFBc0IsRUFDdEIsWUFBWSxFQUNaLGdCQUFnQixFQUNoQixhQUFhLEdBQ2IsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxzQkFBc0IsRUFBRTtJQUM3Qix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsSUFBSSxDQUFJLElBQXNCO1FBQ3RDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUNiLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEIsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JELEtBQUssSUFBSSxDQUFDLENBQUE7WUFDWCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQyx3QkFBd0IsRUFBRTtRQUM5QixJQUFJLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFB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