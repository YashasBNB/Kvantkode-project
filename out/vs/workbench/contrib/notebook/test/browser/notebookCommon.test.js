/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { CellKind, CellUri, diff, MimeTypeDisplayOrder, NotebookWorkingCopyTypeIdentifier, } from '../../common/notebookCommon.js';
import { cellIndexesToRanges, cellRangesToIndexes, reduceCellRanges, } from '../../common/notebookRange.js';
import { setupInstantiationService, TestCell } from './testNotebookEditor.js';
suite('NotebookCommon', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let disposables;
    let instantiationService;
    let languageService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        languageService = instantiationService.get(ILanguageService);
    });
    test('sortMimeTypes default orders', function () {
        assert.deepStrictEqual(new MimeTypeDisplayOrder().sort([
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.latex,
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text,
        ]), [
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.latex,
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text,
        ]);
        assert.deepStrictEqual(new MimeTypeDisplayOrder().sort([
            'application/json',
            Mimes.latex,
            Mimes.markdown,
            'application/javascript',
            'text/html',
            Mimes.text,
            'image/png',
            'image/jpeg',
            'image/svg+xml',
        ]), [
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.latex,
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text,
        ]);
        assert.deepStrictEqual(new MimeTypeDisplayOrder().sort([
            Mimes.markdown,
            'application/json',
            Mimes.text,
            'image/jpeg',
            'application/javascript',
            'text/html',
            'image/png',
            'image/svg+xml',
        ]), [
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text,
        ]);
        disposables.dispose();
    });
    test('sortMimeTypes user orders', function () {
        assert.deepStrictEqual(new MimeTypeDisplayOrder([
            'image/png',
            Mimes.text,
            Mimes.markdown,
            'text/html',
            'application/json',
        ]).sort([
            'application/json',
            'application/javascript',
            'text/html',
            'image/svg+xml',
            Mimes.markdown,
            'image/png',
            'image/jpeg',
            Mimes.text,
        ]), [
            'image/png',
            Mimes.text,
            Mimes.markdown,
            'text/html',
            'application/json',
            'application/javascript',
            'image/svg+xml',
            'image/jpeg',
        ]);
        assert.deepStrictEqual(new MimeTypeDisplayOrder([
            'application/json',
            'text/html',
            'text/html',
            Mimes.markdown,
            'application/json',
        ]).sort([
            Mimes.markdown,
            'application/json',
            Mimes.text,
            'application/javascript',
            'text/html',
            'image/svg+xml',
            'image/jpeg',
            'image/png',
        ]), [
            'application/json',
            'text/html',
            Mimes.markdown,
            'application/javascript',
            'image/svg+xml',
            'image/png',
            'image/jpeg',
            Mimes.text,
        ]);
        disposables.dispose();
    });
    test('prioritizes mimetypes', () => {
        const m = new MimeTypeDisplayOrder([Mimes.markdown, 'text/html', 'application/json']);
        assert.deepStrictEqual(m.toArray(), [Mimes.markdown, 'text/html', 'application/json']);
        // no-op if already in the right order
        m.prioritize('text/html', ['application/json']);
        assert.deepStrictEqual(m.toArray(), [Mimes.markdown, 'text/html', 'application/json']);
        // sorts to highest priority
        m.prioritize('text/html', ['application/json', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), ['text/html', Mimes.markdown, 'application/json']);
        // adds in new type
        m.prioritize('text/plain', ['application/json', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), [
            'text/plain',
            'text/html',
            Mimes.markdown,
            'application/json',
        ]);
        // moves multiple, preserves order
        m.prioritize(Mimes.markdown, ['text/plain', 'application/json', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), [
            'text/html',
            Mimes.markdown,
            'text/plain',
            'application/json',
        ]);
        // deletes multiple
        m.prioritize('text/plain', ['text/plain', 'text/html', Mimes.markdown]);
        assert.deepStrictEqual(m.toArray(), [
            'text/plain',
            'text/html',
            Mimes.markdown,
            'application/json',
        ]);
        // handles multiple mimetypes, unknown mimetype
        const m2 = new MimeTypeDisplayOrder(['a', 'b']);
        m2.prioritize('b', ['a', 'b', 'a', 'q']);
        assert.deepStrictEqual(m2.toArray(), ['b', 'a']);
        disposables.dispose();
    });
    test('sortMimeTypes glob', function () {
        assert.deepStrictEqual(new MimeTypeDisplayOrder([
            'application/vnd-vega*',
            Mimes.markdown,
            'text/html',
            'application/json',
        ]).sort([
            'application/json',
            'application/javascript',
            'text/html',
            'application/vnd-plot.json',
            'application/vnd-vega.json',
        ]), [
            'application/vnd-vega.json',
            'text/html',
            'application/json',
            'application/vnd-plot.json',
            'application/javascript',
        ], 'glob *');
        disposables.dispose();
    });
    test('diff cells', function () {
        const cells = [];
        for (let i = 0; i < 5; i++) {
            cells.push(disposables.add(new TestCell('notebook', i, `var a = ${i};`, 'javascript', CellKind.Code, [], languageService)));
        }
        assert.deepStrictEqual(diff(cells, [], (cell) => {
            return cells.indexOf(cell) > -1;
        }), [
            {
                start: 0,
                deleteCount: 5,
                toInsert: [],
            },
        ]);
        assert.deepStrictEqual(diff([], cells, (cell) => {
            return false;
        }), [
            {
                start: 0,
                deleteCount: 0,
                toInsert: cells,
            },
        ]);
        const cellA = disposables.add(new TestCell('notebook', 6, 'var a = 6;', 'javascript', CellKind.Code, [], languageService));
        const cellB = disposables.add(new TestCell('notebook', 7, 'var a = 7;', 'javascript', CellKind.Code, [], languageService));
        const modifiedCells = [cells[0], cells[1], cellA, cells[3], cellB, cells[4]];
        const splices = diff(cells, modifiedCells, (cell) => {
            return cells.indexOf(cell) > -1;
        });
        assert.deepStrictEqual(splices, [
            {
                start: 2,
                deleteCount: 1,
                toInsert: [cellA],
            },
            {
                start: 4,
                deleteCount: 0,
                toInsert: [cellB],
            },
        ]);
        disposables.dispose();
    });
});
suite('CellUri', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse, generate (file-scheme)', function () {
        const nb = URI.parse('file:///bar/følder/file.nb');
        const id = 17;
        const data = CellUri.generate(nb, id);
        const actual = CellUri.parse(data);
        assert.ok(Boolean(actual));
        assert.strictEqual(actual?.handle, id);
        assert.strictEqual(actual?.notebook.toString(), nb.toString());
    });
    test('parse, generate (foo-scheme)', function () {
        const nb = URI.parse('foo:///bar/følder/file.nb');
        const id = 17;
        const data = CellUri.generate(nb, id);
        const actual = CellUri.parse(data);
        assert.ok(Boolean(actual));
        assert.strictEqual(actual?.handle, id);
        assert.strictEqual(actual?.notebook.toString(), nb.toString());
    });
    test('stable order', function () {
        const nb = URI.parse('foo:///bar/følder/file.nb');
        const handles = [1, 2, 9, 10, 88, 100, 666666, 7777777];
        const uris = handles.map((h) => CellUri.generate(nb, h)).sort();
        const strUris = uris.map(String).sort();
        const parsedUris = strUris.map((s) => URI.parse(s));
        const actual = parsedUris.map((u) => CellUri.parse(u)?.handle);
        assert.deepStrictEqual(actual, handles);
    });
});
suite('CellRange', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Cell range to index', function () {
        assert.deepStrictEqual(cellRangesToIndexes([]), []);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 0 }]), []);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 1 }]), [0]);
        assert.deepStrictEqual(cellRangesToIndexes([{ start: 0, end: 2 }]), [0, 1]);
        assert.deepStrictEqual(cellRangesToIndexes([
            { start: 0, end: 2 },
            { start: 2, end: 3 },
        ]), [0, 1, 2]);
        assert.deepStrictEqual(cellRangesToIndexes([
            { start: 0, end: 2 },
            { start: 3, end: 4 },
        ]), [0, 1, 3]);
    });
    test('Cell index to range', function () {
        assert.deepStrictEqual(cellIndexesToRanges([]), []);
        assert.deepStrictEqual(cellIndexesToRanges([0]), [{ start: 0, end: 1 }]);
        assert.deepStrictEqual(cellIndexesToRanges([0, 1]), [{ start: 0, end: 2 }]);
        assert.deepStrictEqual(cellIndexesToRanges([0, 1, 2]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(cellIndexesToRanges([0, 1, 3]), [
            { start: 0, end: 2 },
            { start: 3, end: 4 },
        ]);
        assert.deepStrictEqual(cellIndexesToRanges([1, 0]), [{ start: 0, end: 2 }]);
        assert.deepStrictEqual(cellIndexesToRanges([1, 2, 0]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(cellIndexesToRanges([3, 1, 0]), [
            { start: 0, end: 2 },
            { start: 3, end: 4 },
        ]);
        assert.deepStrictEqual(cellIndexesToRanges([9, 10]), [{ start: 9, end: 11 }]);
        assert.deepStrictEqual(cellIndexesToRanges([10, 9]), [{ start: 9, end: 11 }]);
    });
    test('Reduce ranges', function () {
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 1 },
            { start: 1, end: 2 },
        ]), [{ start: 0, end: 2 }]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 2 },
            { start: 1, end: 3 },
        ]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 1, end: 3 },
            { start: 0, end: 2 },
        ]), [{ start: 0, end: 3 }]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 2 },
            { start: 4, end: 5 },
        ]), [
            { start: 0, end: 2 },
            { start: 4, end: 5 },
        ]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 1 },
            { start: 1, end: 2 },
            { start: 4, end: 6 },
        ]), [
            { start: 0, end: 2 },
            { start: 4, end: 6 },
        ]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 1 },
            { start: 1, end: 3 },
            { start: 3, end: 4 },
        ]), [{ start: 0, end: 4 }]);
    });
    test('Reduce ranges 2, empty ranges', function () {
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 0 },
            { start: 0, end: 0 },
        ]), [{ start: 0, end: 0 }]);
        assert.deepStrictEqual(reduceCellRanges([
            { start: 0, end: 0 },
            { start: 1, end: 2 },
        ]), [{ start: 1, end: 2 }]);
        assert.deepStrictEqual(reduceCellRanges([{ start: 2, end: 2 }]), [{ start: 2, end: 2 }]);
    });
});
suite('NotebookWorkingCopyTypeIdentifier', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('supports notebook type only', function () {
        const viewType = 'testViewType';
        const type = NotebookWorkingCopyTypeIdentifier.create(viewType);
        assert.deepEqual(NotebookWorkingCopyTypeIdentifier.parse(type), {
            notebookType: viewType,
            viewType,
        });
        assert.strictEqual(NotebookWorkingCopyTypeIdentifier.parse('something'), undefined);
    });
    test('supports different viewtype', function () {
        const notebookType = { notebookType: 'testNotebookType', viewType: 'testViewType' };
        const type = NotebookWorkingCopyTypeIdentifier.create(notebookType.notebookType, notebookType.viewType);
        assert.deepEqual(NotebookWorkingCopyTypeIdentifier.parse(type), notebookType);
        assert.strictEqual(NotebookWorkingCopyTypeIdentifier.parse('something'), undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va0NvbW1vbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQ04sUUFBUSxFQUNSLE9BQU8sRUFDUCxJQUFJLEVBQ0osb0JBQW9CLEVBQ3BCLGlDQUFpQyxHQUNqQyxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLGdCQUFnQixHQUNoQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUU3RSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSxlQUFpQyxDQUFBO0lBRXJDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxvQkFBb0IsR0FBRyx5QkFB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LENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRjtZQUNDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQ0QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRjtZQUNDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQ0QsQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEIsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtCQUErQixFQUFFO1FBQ3JDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ3JCLGdCQUFnQixDQUFDO1lBQ2hCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1lBQ3BCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFO1NBQ3BCLENBQUMsRUFDRixDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLENBQUMsbUNBQW1DLEVBQUU7SUFDMUMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDbkMsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFBO1FBQy9CLE1BQU0sSUFBSSxHQUFHLGlDQUFpQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRCxNQUFNLENBQUMsU0FBUyxDQUFDLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMvRCxZQUFZLEVBQUUsUUFBUTtZQUN0QixRQUFRO1NBQ1IsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDcEYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDbkMsTUFBTSxZQUFZLEdBQUcsRUFBRSxZQUFZLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxDQUFBO1FBQ25GLE1BQU0sSUFBSSxHQUFHLGlDQUFpQyxDQUFDLE1BQU0sQ0FDcEQsWUFBWSxDQUFDLFlBQVksRUFDekIsWUFBWSxDQUFDLFFBQVEsQ0FDckIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3BGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==