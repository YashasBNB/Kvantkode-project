/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import * as types from '../../common/extHostTypes.js';
import { isWindows } from '../../../../base/common/platform.js';
import { assertType } from '../../../../base/common/types.js';
import { Mimes } from '../../../../base/common/mime.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
function assertToJSON(a, expected) {
    const raw = JSON.stringify(a);
    const actual = JSON.parse(raw);
    assert.deepStrictEqual(actual, expected);
}
suite('ExtHostTypes', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('URI, toJSON', function () {
        const uri = URI.parse('file:///path/test.file');
        assert.deepStrictEqual(uri.toJSON(), {
            $mid: 1 /* MarshalledId.Uri */,
            scheme: 'file',
            path: '/path/test.file',
        });
        assert.ok(uri.fsPath);
        assert.deepStrictEqual(uri.toJSON(), {
            $mid: 1 /* MarshalledId.Uri */,
            scheme: 'file',
            path: '/path/test.file',
            fsPath: '/path/test.file'.replace(/\//g, isWindows ? '\\' : '/'),
            _sep: isWindows ? 1 : undefined,
        });
        assert.ok(uri.toString());
        assert.deepStrictEqual(uri.toJSON(), {
            $mid: 1 /* MarshalledId.Uri */,
            scheme: 'file',
            path: '/path/test.file',
            fsPath: '/path/test.file'.replace(/\//g, isWindows ? '\\' : '/'),
            _sep: isWindows ? 1 : undefined,
            external: 'file:///path/test.file',
        });
    });
    test('Disposable', () => {
        let count = 0;
        const d = new types.Disposable(() => {
            count += 1;
            return 12;
        });
        d.dispose();
        assert.strictEqual(count, 1);
        d.dispose();
        assert.strictEqual(count, 1);
        types.Disposable.from(undefined, {
            dispose() {
                count += 1;
            },
        }).dispose();
        assert.strictEqual(count, 2);
        assert.throws(() => {
            new types.Disposable(() => {
                throw new Error();
            }).dispose();
        });
        new types.Disposable(undefined).dispose();
    });
    test('Position', () => {
        assert.throws(() => new types.Position(-1, 0));
        assert.throws(() => new types.Position(0, -1));
        const pos = new types.Position(0, 0);
        assert.throws(() => (pos.line = -1));
        assert.throws(() => (pos.character = -1));
        assert.throws(() => (pos.line = 12));
        const { line, character } = pos.toJSON();
        assert.strictEqual(line, 0);
        assert.strictEqual(character, 0);
    });
    test('Position, toJSON', function () {
        const pos = new types.Position(4, 2);
        assertToJSON(pos, { line: 4, character: 2 });
    });
    test('Position, isBefore(OrEqual)?', function () {
        const p1 = new types.Position(1, 3);
        const p2 = new types.Position(1, 2);
        const p3 = new types.Position(0, 4);
        assert.ok(p1.isBeforeOrEqual(p1));
        assert.ok(!p1.isBefore(p1));
        assert.ok(p2.isBefore(p1));
        assert.ok(p3.isBefore(p2));
    });
    test('Position, isAfter(OrEqual)?', function () {
        const p1 = new types.Position(1, 3);
        const p2 = new types.Position(1, 2);
        const p3 = new types.Position(0, 4);
        assert.ok(p1.isAfterOrEqual(p1));
        assert.ok(!p1.isAfter(p1));
        assert.ok(p1.isAfter(p2));
        assert.ok(p2.isAfter(p3));
        assert.ok(p1.isAfter(p3));
    });
    test('Position, compareTo', function () {
        const p1 = new types.Position(1, 3);
        const p2 = new types.Position(1, 2);
        const p3 = new types.Position(0, 4);
        assert.strictEqual(p1.compareTo(p1), 0);
        assert.strictEqual(p2.compareTo(p1), -1);
        assert.strictEqual(p1.compareTo(p2), 1);
        assert.strictEqual(p2.compareTo(p3), 1);
        assert.strictEqual(p1.compareTo(p3), 1);
    });
    test('Position, translate', function () {
        const p1 = new types.Position(1, 3);
        assert.ok(p1.translate() === p1);
        assert.ok(p1.translate({}) === p1);
        assert.ok(p1.translate(0, 0) === p1);
        assert.ok(p1.translate(0) === p1);
        assert.ok(p1.translate(undefined, 0) === p1);
        assert.ok(p1.translate(undefined) === p1);
        let res = p1.translate(-1);
        assert.strictEqual(res.line, 0);
        assert.strictEqual(res.character, 3);
        res = p1.translate({ lineDelta: -1 });
        assert.strictEqual(res.line, 0);
        assert.strictEqual(res.character, 3);
        res = p1.translate(undefined, -1);
        assert.strictEqual(res.line, 1);
        assert.strictEqual(res.character, 2);
        res = p1.translate({ characterDelta: -1 });
        assert.strictEqual(res.line, 1);
        assert.strictEqual(res.character, 2);
        res = p1.translate(11);
        assert.strictEqual(res.line, 12);
        assert.strictEqual(res.character, 3);
        assert.throws(() => p1.translate(null));
        assert.throws(() => p1.translate(null, null));
        assert.throws(() => p1.translate(-2));
        assert.throws(() => p1.translate({ lineDelta: -2 }));
        assert.throws(() => p1.translate(-2, null));
        assert.throws(() => p1.translate(0, -4));
    });
    test('Position, with', function () {
        const p1 = new types.Position(1, 3);
        assert.ok(p1.with() === p1);
        assert.ok(p1.with(1) === p1);
        assert.ok(p1.with(undefined, 3) === p1);
        assert.ok(p1.with(1, 3) === p1);
        assert.ok(p1.with(undefined) === p1);
        assert.ok(p1.with({ line: 1 }) === p1);
        assert.ok(p1.with({ character: 3 }) === p1);
        assert.ok(p1.with({ line: 1, character: 3 }) === p1);
        const p2 = p1.with({ line: 0, character: 11 });
        assert.strictEqual(p2.line, 0);
        assert.strictEqual(p2.character, 11);
        assert.throws(() => p1.with(null));
        assert.throws(() => p1.with(-9));
        assert.throws(() => p1.with(0, -9));
        assert.throws(() => p1.with({ line: -1 }));
        assert.throws(() => p1.with({ character: -1 }));
    });
    test('Range', () => {
        assert.throws(() => new types.Range(-1, 0, 0, 0));
        assert.throws(() => new types.Range(0, -1, 0, 0));
        assert.throws(() => new types.Range(new types.Position(0, 0), undefined));
        assert.throws(() => new types.Range(new types.Position(0, 0), null));
        assert.throws(() => new types.Range(undefined, new types.Position(0, 0)));
        assert.throws(() => new types.Range(null, new types.Position(0, 0)));
        const range = new types.Range(1, 0, 0, 0);
        assert.throws(() => {
            ;
            range.start = null;
        });
        assert.throws(() => {
            ;
            range.start = new types.Position(0, 3);
        });
    });
    test('Range, toJSON', function () {
        const range = new types.Range(1, 2, 3, 4);
        assertToJSON(range, [
            { line: 1, character: 2 },
            { line: 3, character: 4 },
        ]);
    });
    test('Range, sorting', function () {
        // sorts start/end
        let range = new types.Range(1, 0, 0, 0);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 1);
        range = new types.Range(0, 0, 1, 0);
        assert.strictEqual(range.start.line, 0);
        assert.strictEqual(range.end.line, 1);
    });
    test('Range, isEmpty|isSingleLine', function () {
        let range = new types.Range(1, 0, 0, 0);
        assert.ok(!range.isEmpty);
        assert.ok(!range.isSingleLine);
        range = new types.Range(1, 1, 1, 1);
        assert.ok(range.isEmpty);
        assert.ok(range.isSingleLine);
        range = new types.Range(0, 1, 0, 11);
        assert.ok(!range.isEmpty);
        assert.ok(range.isSingleLine);
        range = new types.Range(0, 0, 1, 1);
        assert.ok(!range.isEmpty);
        assert.ok(!range.isSingleLine);
    });
    test('Range, contains', function () {
        const range = new types.Range(1, 1, 2, 11);
        assert.ok(range.contains(range.start));
        assert.ok(range.contains(range.end));
        assert.ok(range.contains(range));
        assert.ok(!range.contains(new types.Range(1, 0, 2, 11)));
        assert.ok(!range.contains(new types.Range(0, 1, 2, 11)));
        assert.ok(!range.contains(new types.Range(1, 1, 2, 12)));
        assert.ok(!range.contains(new types.Range(1, 1, 3, 11)));
    });
    test('Range, contains (no instanceof)', function () {
        const range = new types.Range(1, 1, 2, 11);
        const startLike = { line: range.start.line, character: range.start.character };
        const endLike = { line: range.end.line, character: range.end.character };
        const rangeLike = { start: startLike, end: endLike };
        assert.ok(range.contains(startLike));
        assert.ok(range.contains(endLike));
        assert.ok(range.contains(rangeLike));
    });
    test('Range, intersection', function () {
        const range = new types.Range(1, 1, 2, 11);
        let res;
        res = range.intersection(range);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        assert.strictEqual(res.end.line, 2);
        assert.strictEqual(res.end.character, 11);
        res = range.intersection(new types.Range(2, 12, 4, 0));
        assert.strictEqual(res, undefined);
        res = range.intersection(new types.Range(0, 0, 1, 0));
        assert.strictEqual(res, undefined);
        res = range.intersection(new types.Range(0, 0, 1, 1));
        assert.ok(res.isEmpty);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        res = range.intersection(new types.Range(2, 11, 61, 1));
        assert.ok(res.isEmpty);
        assert.strictEqual(res.start.line, 2);
        assert.strictEqual(res.start.character, 11);
        assert.throws(() => range.intersection(null));
        assert.throws(() => range.intersection(undefined));
    });
    test('Range, union', function () {
        let ran1 = new types.Range(0, 0, 5, 5);
        assert.ok(ran1.union(new types.Range(0, 0, 1, 1)) === ran1);
        let res;
        res = ran1.union(new types.Range(2, 2, 9, 9));
        assert.ok(res.start === ran1.start);
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 9);
        ran1 = new types.Range(2, 1, 5, 3);
        res = ran1.union(new types.Range(1, 0, 4, 2));
        assert.ok(res.end === ran1.end);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 0);
    });
    test('Range, with', function () {
        const range = new types.Range(1, 1, 2, 11);
        assert.ok(range.with(range.start) === range);
        assert.ok(range.with(undefined, range.end) === range);
        assert.ok(range.with(range.start, range.end) === range);
        assert.ok(range.with(new types.Position(1, 1)) === range);
        assert.ok(range.with(undefined, new types.Position(2, 11)) === range);
        assert.ok(range.with() === range);
        assert.ok(range.with({ start: range.start }) === range);
        assert.ok(range.with({ start: new types.Position(1, 1) }) === range);
        assert.ok(range.with({ end: range.end }) === range);
        assert.ok(range.with({ end: new types.Position(2, 11) }) === range);
        let res = range.with(undefined, new types.Position(9, 8));
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 8);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        res = range.with({ end: new types.Position(9, 8) });
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 8);
        assert.strictEqual(res.start.line, 1);
        assert.strictEqual(res.start.character, 1);
        res = range.with({ end: new types.Position(9, 8), start: new types.Position(2, 3) });
        assert.strictEqual(res.end.line, 9);
        assert.strictEqual(res.end.character, 8);
        assert.strictEqual(res.start.line, 2);
        assert.strictEqual(res.start.character, 3);
        assert.throws(() => range.with(null));
        assert.throws(() => range.with(undefined, null));
    });
    test('TextEdit', () => {
        const range = new types.Range(1, 1, 2, 11);
        let edit = new types.TextEdit(range, undefined);
        assert.strictEqual(edit.newText, '');
        assertToJSON(edit, {
            range: [
                { line: 1, character: 1 },
                { line: 2, character: 11 },
            ],
            newText: '',
        });
        edit = new types.TextEdit(range, null);
        assert.strictEqual(edit.newText, '');
        edit = new types.TextEdit(range, '');
        assert.strictEqual(edit.newText, '');
    });
    test('WorkspaceEdit', () => {
        const a = URI.file('a.ts');
        const b = URI.file('b.ts');
        const edit = new types.WorkspaceEdit();
        assert.ok(!edit.has(a));
        edit.set(a, [types.TextEdit.insert(new types.Position(0, 0), 'fff')]);
        assert.ok(edit.has(a));
        assert.strictEqual(edit.size, 1);
        assertToJSON(edit, [
            [
                a.toJSON(),
                [
                    {
                        range: [
                            { line: 0, character: 0 },
                            { line: 0, character: 0 },
                        ],
                        newText: 'fff',
                    },
                ],
            ],
        ]);
        edit.insert(b, new types.Position(1, 1), 'fff');
        edit.delete(b, new types.Range(0, 0, 0, 0));
        assert.ok(edit.has(b));
        assert.strictEqual(edit.size, 2);
        assertToJSON(edit, [
            [
                a.toJSON(),
                [
                    {
                        range: [
                            { line: 0, character: 0 },
                            { line: 0, character: 0 },
                        ],
                        newText: 'fff',
                    },
                ],
            ],
            [
                b.toJSON(),
                [
                    {
                        range: [
                            { line: 1, character: 1 },
                            { line: 1, character: 1 },
                        ],
                        newText: 'fff',
                    },
                    {
                        range: [
                            { line: 0, character: 0 },
                            { line: 0, character: 0 },
                        ],
                        newText: '',
                    },
                ],
            ],
        ]);
        edit.set(b, undefined);
        assert.ok(!edit.has(b));
        assert.strictEqual(edit.size, 1);
        edit.set(b, [types.TextEdit.insert(new types.Position(0, 0), 'ffff')]);
        assert.strictEqual(edit.get(b).length, 1);
    });
    test('WorkspaceEdit - keep order of text and file changes', function () {
        const edit = new types.WorkspaceEdit();
        edit.replace(URI.parse('foo:a'), new types.Range(1, 1, 1, 1), 'foo');
        edit.renameFile(URI.parse('foo:a'), URI.parse('foo:b'));
        edit.replace(URI.parse('foo:a'), new types.Range(2, 1, 2, 1), 'bar');
        edit.replace(URI.parse('foo:b'), new types.Range(3, 1, 3, 1), 'bazz');
        const all = edit._allEntries();
        assert.strictEqual(all.length, 4);
        const [first, second, third, fourth] = all;
        assertType(first._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(first.uri.toString(), 'foo:a');
        assertType(second._type === 1 /* types.FileEditType.File */);
        assert.strictEqual(second.from.toString(), 'foo:a');
        assert.strictEqual(second.to.toString(), 'foo:b');
        assertType(third._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(third.uri.toString(), 'foo:a');
        assertType(fourth._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(fourth.uri.toString(), 'foo:b');
    });
    test('WorkspaceEdit - two edits for one resource', function () {
        const edit = new types.WorkspaceEdit();
        const uri = URI.parse('foo:bar');
        edit.insert(uri, new types.Position(0, 0), 'Hello');
        edit.insert(uri, new types.Position(0, 0), 'Foo');
        assert.strictEqual(edit._allEntries().length, 2);
        const [first, second] = edit._allEntries();
        assertType(first._type === 2 /* types.FileEditType.Text */);
        assertType(second._type === 2 /* types.FileEditType.Text */);
        assert.strictEqual(first.edit.newText, 'Hello');
        assert.strictEqual(second.edit.newText, 'Foo');
    });
    test('WorkspaceEdit - set with metadata accepts undefined', function () {
        const edit = new types.WorkspaceEdit();
        const uri = URI.parse('foo:bar');
        edit.set(uri, [
            [
                types.TextEdit.insert(new types.Position(0, 0), 'Hello'),
                { needsConfirmation: true, label: 'foo' },
            ],
            [types.TextEdit.insert(new types.Position(0, 0), 'Hello'), undefined],
        ]);
        const all = edit._allEntries();
        assert.strictEqual(all.length, 2);
        const [first, second] = all;
        assert.ok(first.metadata);
        assert.ok(!second.metadata);
    });
    test('DocumentLink', () => {
        assert.throws(() => new types.DocumentLink(null, null));
        assert.throws(() => new types.DocumentLink(new types.Range(1, 1, 1, 1), null));
    });
    test('toJSON & stringify', function () {
        assertToJSON(new types.Selection(3, 4, 2, 1), {
            start: { line: 2, character: 1 },
            end: { line: 3, character: 4 },
            anchor: { line: 3, character: 4 },
            active: { line: 2, character: 1 },
        });
        assertToJSON(new types.Location(URI.file('u.ts'), new types.Position(3, 4)), {
            uri: URI.parse('file:///u.ts').toJSON(),
            range: [
                { line: 3, character: 4 },
                { line: 3, character: 4 },
            ],
        });
        assertToJSON(new types.Location(URI.file('u.ts'), new types.Range(1, 2, 3, 4)), {
            uri: URI.parse('file:///u.ts').toJSON(),
            range: [
                { line: 1, character: 2 },
                { line: 3, character: 4 },
            ],
        });
        const diag = new types.Diagnostic(new types.Range(0, 1, 2, 3), 'hello');
        assertToJSON(diag, {
            severity: 'Error',
            message: 'hello',
            range: [
                { line: 0, character: 1 },
                { line: 2, character: 3 },
            ],
        });
        diag.source = 'me';
        assertToJSON(diag, {
            severity: 'Error',
            message: 'hello',
            range: [
                { line: 0, character: 1 },
                { line: 2, character: 3 },
            ],
            source: 'me',
        });
        assertToJSON(new types.DocumentHighlight(new types.Range(2, 3, 4, 5)), {
            range: [
                { line: 2, character: 3 },
                { line: 4, character: 5 },
            ],
            kind: 'Text',
        });
        assertToJSON(new types.DocumentHighlight(new types.Range(2, 3, 4, 5), types.DocumentHighlightKind.Read), {
            range: [
                { line: 2, character: 3 },
                { line: 4, character: 5 },
            ],
            kind: 'Read',
        });
        assertToJSON(new types.SymbolInformation('test', types.SymbolKind.Boolean, new types.Range(0, 1, 2, 3)), {
            name: 'test',
            kind: 'Boolean',
            location: {
                range: [
                    { line: 0, character: 1 },
                    { line: 2, character: 3 },
                ],
            },
        });
        assertToJSON(new types.CodeLens(new types.Range(7, 8, 9, 10)), {
            range: [
                { line: 7, character: 8 },
                { line: 9, character: 10 },
            ],
        });
        assertToJSON(new types.CodeLens(new types.Range(7, 8, 9, 10), { command: 'id', title: 'title' }), {
            range: [
                { line: 7, character: 8 },
                { line: 9, character: 10 },
            ],
            command: { command: 'id', title: 'title' },
        });
        assertToJSON(new types.CompletionItem('complete'), { label: 'complete' });
        const item = new types.CompletionItem('complete');
        item.kind = types.CompletionItemKind.Interface;
        assertToJSON(item, { label: 'complete', kind: 'Interface' });
    });
    test('SymbolInformation, old ctor', function () {
        const info = new types.SymbolInformation('foo', types.SymbolKind.Array, new types.Range(1, 1, 2, 3));
        assert.ok(info.location instanceof types.Location);
        assert.strictEqual(info.location.uri, undefined);
    });
    test('SnippetString, builder-methods', function () {
        let string;
        string = new types.SnippetString();
        assert.strictEqual(string.appendText('I need $ and $').value, 'I need \\$ and \\$');
        string = new types.SnippetString();
        assert.strictEqual(string.appendText('I need \\$').value, 'I need \\\\\\$');
        string = new types.SnippetString();
        string.appendPlaceholder('fo$o}');
        assert.strictEqual(string.value, '${1:fo\\$o\\}}');
        string = new types.SnippetString();
        string.appendText('foo').appendTabstop(0).appendText('bar');
        assert.strictEqual(string.value, 'foo$0bar');
        string = new types.SnippetString();
        string.appendText('foo').appendTabstop().appendText('bar');
        assert.strictEqual(string.value, 'foo$1bar');
        string = new types.SnippetString();
        string.appendText('foo').appendTabstop(42).appendText('bar');
        assert.strictEqual(string.value, 'foo$42bar');
        string = new types.SnippetString();
        string.appendText('foo').appendPlaceholder('farboo').appendText('bar');
        assert.strictEqual(string.value, 'foo${1:farboo}bar');
        string = new types.SnippetString();
        string.appendText('foo').appendPlaceholder('far$boo').appendText('bar');
        assert.strictEqual(string.value, 'foo${1:far\\$boo}bar');
        string = new types.SnippetString();
        string
            .appendText('foo')
            .appendPlaceholder((b) => b.appendText('abc').appendPlaceholder('nested'))
            .appendText('bar');
        assert.strictEqual(string.value, 'foo${1:abc${2:nested}}bar');
        string = new types.SnippetString();
        string.appendVariable('foo');
        assert.strictEqual(string.value, '${foo}');
        string = new types.SnippetString();
        string.appendText('foo').appendVariable('TM_SELECTED_TEXT').appendText('bar');
        assert.strictEqual(string.value, 'foo${TM_SELECTED_TEXT}bar');
        string = new types.SnippetString();
        string.appendVariable('BAR', (b) => b.appendPlaceholder('ops'));
        assert.strictEqual(string.value, '${BAR:${1:ops}}');
        string = new types.SnippetString();
        string.appendVariable('BAR', (b) => { });
        assert.strictEqual(string.value, '${BAR}');
        string = new types.SnippetString();
        string.appendChoice(['b', 'a', 'r']);
        assert.strictEqual(string.value, '${1|b,a,r|}');
        string = new types.SnippetString();
        string.appendChoice(['b,1', 'a,2', 'r,3']);
        assert.strictEqual(string.value, '${1|b\\,1,a\\,2,r\\,3|}');
        string = new types.SnippetString();
        string.appendChoice(['b', 'a', 'r'], 0);
        assert.strictEqual(string.value, '${0|b,a,r|}');
        string = new types.SnippetString();
        string.appendText('foo').appendChoice(['far', 'boo']).appendText('bar');
        assert.strictEqual(string.value, 'foo${1|far,boo|}bar');
        string = new types.SnippetString();
        string.appendText('foo').appendChoice(['far', '$boo']).appendText('bar');
        assert.strictEqual(string.value, 'foo${1|far,$boo|}bar');
        string = new types.SnippetString();
        string
            .appendText('foo')
            .appendPlaceholder('farboo')
            .appendChoice(['far', 'boo'])
            .appendText('bar');
        assert.strictEqual(string.value, 'foo${1:farboo}${2|far,boo|}bar');
    });
    test('Snippet choices are incorrectly escaped/applied #180132', function () {
        {
            const s = new types.SnippetString();
            s.appendChoice(['aaa$aaa']);
            s.appendText('bbb$bbb');
            assert.strictEqual(s.value, '${1|aaa$aaa|}bbb\\$bbb');
        }
        {
            const s = new types.SnippetString();
            s.appendChoice(['aaa,aaa']);
            s.appendText('bbb$bbb');
            assert.strictEqual(s.value, '${1|aaa\\,aaa|}bbb\\$bbb');
        }
        {
            const s = new types.SnippetString();
            s.appendChoice(['aaa|aaa']);
            s.appendText('bbb$bbb');
            assert.strictEqual(s.value, '${1|aaa\\|aaa|}bbb\\$bbb');
        }
        {
            const s = new types.SnippetString();
            s.appendChoice(['aaa\\aaa']);
            s.appendText('bbb$bbb');
            assert.strictEqual(s.value, '${1|aaa\\\\aaa|}bbb\\$bbb');
        }
    });
    test("instanceof doesn't work for FileSystemError #49386", function () {
        const error = types.FileSystemError.Unavailable('foo');
        assert.ok(error instanceof Error);
        assert.ok(error instanceof types.FileSystemError);
    });
    test('CancellationError', function () {
        // The CancellationError-type is used internally and exported as API. Make sure that at
        // its name and message are `Canceled`
        const err = new CancellationError();
        assert.strictEqual(err.name, 'Canceled');
        assert.strictEqual(err.message, 'Canceled');
    });
    test('CodeActionKind contains', () => {
        assert.ok(types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.RefactorExtract));
        assert.ok(types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.RefactorExtract.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Refactor));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Refactor.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Empty.append('other').append('refactor')));
        assert.ok(!types.CodeActionKind.RefactorExtract.contains(types.CodeActionKind.Empty.append('refactory')));
    });
    test('CodeActionKind intersects', () => {
        assert.ok(types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.RefactorExtract));
        assert.ok(types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Refactor));
        assert.ok(types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.RefactorExtract.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Refactor.append('other')));
        assert.ok(!types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Empty.append('other').append('refactor')));
        assert.ok(!types.CodeActionKind.RefactorExtract.intersects(types.CodeActionKind.Empty.append('refactory')));
    });
    function toArr(uint32Arr) {
        const r = [];
        for (let i = 0, len = uint32Arr.length; i < len; i++) {
            r[i] = uint32Arr[i];
        }
        return r;
    }
    test('SemanticTokensBuilder simple', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(1, 0, 5, 1, 1);
        builder.push(1, 10, 4, 2, 2);
        builder.push(2, 2, 3, 2, 2);
        assert.deepStrictEqual(toArr(builder.build().data), [1, 0, 5, 1, 1, 0, 10, 4, 2, 2, 1, 2, 3, 2, 2]);
    });
    test('SemanticTokensBuilder no modifier', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(1, 0, 5, 1);
        builder.push(1, 10, 4, 2);
        builder.push(2, 2, 3, 2);
        assert.deepStrictEqual(toArr(builder.build().data), [1, 0, 5, 1, 0, 0, 10, 4, 2, 0, 1, 2, 3, 2, 0]);
    });
    test('SemanticTokensBuilder out of order 1', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(2, 0, 5, 1, 1);
        builder.push(2, 10, 1, 2, 2);
        builder.push(2, 15, 2, 3, 3);
        builder.push(1, 0, 4, 4, 4);
        assert.deepStrictEqual(toArr(builder.build().data), [1, 0, 4, 4, 4, 1, 0, 5, 1, 1, 0, 10, 1, 2, 2, 0, 5, 2, 3, 3]);
    });
    test('SemanticTokensBuilder out of order 2', () => {
        const builder = new types.SemanticTokensBuilder();
        builder.push(2, 10, 5, 1, 1);
        builder.push(2, 2, 4, 2, 2);
        assert.deepStrictEqual(toArr(builder.build().data), [2, 2, 4, 2, 2, 0, 8, 5, 1, 1]);
    });
    test('SemanticTokensBuilder with legend', () => {
        const legend = new types.SemanticTokensLegend(['aType', 'bType', 'cType', 'dType'], ['mod0', 'mod1', 'mod2', 'mod3', 'mod4', 'mod5']);
        const builder = new types.SemanticTokensBuilder(legend);
        builder.push(new types.Range(1, 0, 1, 5), 'bType');
        builder.push(new types.Range(2, 0, 2, 4), 'cType', ['mod0', 'mod5']);
        builder.push(new types.Range(3, 0, 3, 3), 'dType', ['mod2', 'mod4']);
        assert.deepStrictEqual(toArr(builder.build().data), [
            1,
            0,
            5,
            1,
            0,
            1,
            0,
            4,
            2,
            1 | (1 << 5),
            1,
            0,
            3,
            3,
            (1 << 2) | (1 << 4),
        ]);
    });
    test('Markdown codeblock rendering is swapped #111604', function () {
        const md = new types.MarkdownString().appendCodeblock('<img src=0 onerror="alert(1)">', 'html');
        assert.deepStrictEqual(md.value, '\n```html\n<img src=0 onerror="alert(1)">\n```\n');
    });
    test('NotebookCellOutputItem - factories', function () {
        assert.throws(() => {
            // invalid mime type
            new types.NotebookCellOutputItem(new Uint8Array(), 'invalid');
        });
        // --- err
        let item = types.NotebookCellOutputItem.error(new Error());
        assert.strictEqual(item.mime, 'application/vnd.code.notebook.error');
        item = types.NotebookCellOutputItem.error({ name: 'Hello' });
        assert.strictEqual(item.mime, 'application/vnd.code.notebook.error');
        // --- JSON
        item = types.NotebookCellOutputItem.json(1);
        assert.strictEqual(item.mime, 'text/x-json');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify(1)));
        item = types.NotebookCellOutputItem.json(1, 'foo/bar');
        assert.strictEqual(item.mime, 'foo/bar');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify(1)));
        item = types.NotebookCellOutputItem.json(true);
        assert.strictEqual(item.mime, 'text/x-json');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify(true)));
        item = types.NotebookCellOutputItem.json([true, 1, 'ddd']);
        assert.strictEqual(item.mime, 'text/x-json');
        assert.deepStrictEqual(item.data, new TextEncoder().encode(JSON.stringify([true, 1, 'ddd'], undefined, '\t')));
        // --- text
        item = types.NotebookCellOutputItem.text('Hęłlö');
        assert.strictEqual(item.mime, Mimes.text);
        assert.deepStrictEqual(item.data, new TextEncoder().encode('Hęłlö'));
        item = types.NotebookCellOutputItem.text('Hęłlö', 'foo/bar');
        assert.strictEqual(item.mime, 'foo/bar');
        assert.deepStrictEqual(item.data, new TextEncoder().encode('Hęłlö'));
    });
    test('FileDecoration#validate', function () {
        assert.ok(types.FileDecoration.validate({ badge: 'u' }));
        assert.ok(types.FileDecoration.validate({ badge: 'ü' }));
        assert.ok(types.FileDecoration.validate({ badge: '1' }));
        assert.ok(types.FileDecoration.validate({ badge: 'ãã' }));
        assert.ok(types.FileDecoration.validate({ badge: '👋' }));
        assert.ok(types.FileDecoration.validate({ badge: '👋👋' }));
        assert.ok(types.FileDecoration.validate({ badge: '👩‍👩‍👧‍👧' }));
        assert.ok(types.FileDecoration.validate({ badge: 'போ' }));
        assert.throws(() => types.FileDecoration.validate({ badge: 'hel' }));
        assert.throws(() => types.FileDecoration.validate({ badge: '👋👋👋' }));
        assert.throws(() => types.FileDecoration.validate({ badge: 'புன்சிரிப்போடு' }));
        assert.throws(() => types.FileDecoration.validate({ badge: 'ããã' }));
    });
    test('No longer possible to set content on LanguageModelChatMessage', function () {
        const m = types.LanguageModelChatMessage.Assistant('');
        m.content = [
            new types.LanguageModelToolCallPart('toolCall.call.callId', 'toolCall.tool.name', 'toolCall.call.parameters'),
        ];
        assert.equal(m.content.length, 1);
        assert.equal(m.content2?.length, 1);
        m.content2 = ['foo'];
        assert.equal(m.content.length, 1);
        assert.ok(m.content[0] instanceof types.LanguageModelTextPart);
        assert.equal(m.content2?.length, 1);
        assert.ok(typeof m.content2[0] === 'string');
    });
    test('runtime stable, type-def changed', function () {
        // see https://github.com/microsoft/vscode/issues/231938
        const m = new types.LanguageModelChatMessage(types.LanguageModelChatMessageRole.User, []);
        assert.deepStrictEqual(m.content, []);
        m.content = 'Hello';
        assert.deepStrictEqual(m.content, [new types.LanguageModelTextPart('Hello')]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9leHRIb3N0VHlwZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxLQUFLLE1BQU0sOEJBQThCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsU0FBUyxZQUFZLENBQUMsQ0FBTSxFQUFFLFFBQWE7SUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzlCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBQ3pDLENBQUM7QUFFRCxLQUFLLENBQUMsY0FBYyxFQUFFO0lBQ3JCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUNuQixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUs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aEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2xDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDcEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXpDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXBDLEdBQUcsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXBDLEdBQUcsR0FBRyxFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFcEMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFcEMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDdEIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVwQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSyxFQUFFLElBQUssQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUssQ0FBQyxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDekMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0JBQWdCLEVBQUU7UUFDdEIsTUFBTSxFQUFFLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUMzQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUE7UUFDbkMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2hELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDbEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2pELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFNBQVUsQ0FBQyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVUsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFckUsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2xCLENBQUM7WUFBQyxLQUFhLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQTtRQUM3QixDQUFDLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFO1lBQ2xCLENBQUM7WUFBQyxLQUFhLENBQUMs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LENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFMUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUVoQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlDQUFpQyxFQUFFO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUxQyxNQUFNLFNBQVMsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUM5RSxNQUFNLE9BQU8sR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtRQUN4RSxNQUFNLFNBQVMsR0FBRyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBRXBELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBaUIsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQWlCLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFjLFNBQVMsQ0FBQyxDQUFDLENBQUE7SUFDbEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLElBQUksR0FBZ0IsQ0FBQTtRQUVwQixHQUFHLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUUsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRXpDLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBRSxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRWxDLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBRSxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBRWxDLEdBQUcsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBRSxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxQyxHQUFHLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUUsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0QixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFM0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUE7UUFDOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVUsQ0FBQyxDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsY0FBYyxFQUFFO1FBQ3BCLElBQUksSUFBSSxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0QyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUE7UUFFM0QsSUFBSSxHQUFnQixDQUFBO1FBQ3BCLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhDLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ25CLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUUxQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEtBQUssQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUE7UUFDcEUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFBO1FBQ25ELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQTtRQUVuRSxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUxQyxHQUFHLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25DLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTFDLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3BGLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkMsTUFBTSxD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QUUsYUFBYSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlFLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUN0RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksV0FBVyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRTlFLElBQUksR0FBRyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFakYsSUFBSSxHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLElBQUksQ0FBQyxJQUFJLEVBQ1QsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQzNFLENBQUE7UUFFRCxXQUFXO1FBRVgsSUFBSSxHQUFHLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUVwRSxJQUFJLEdBQUcsS0FBSyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ3JFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFO1FBQy9CLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3ZFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDckUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0RBQStELEVBQUU7UUFDckUsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUMsT0FBTyxHQUFHO1lBQ1gsSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQ2xDLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIsMEJBQTBCLENBQzFCO1NBQ0QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUVuQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDcEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFFOUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtRQUN4Qyx3REFBd0Q7UUFDeEQsTUFBTSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6RixNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDckMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUE7UUFDbkIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==