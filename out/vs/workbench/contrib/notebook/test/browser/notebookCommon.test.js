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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDb21tb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rQ29tbW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXJGLE9BQU8sRUFDTixRQUFRLEVBQ1IsT0FBTyxFQUNQLElBQUksRUFDSixvQkFBb0IsRUFDcEIsaUNBQWlDLEdBQ2pDLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixtQkFBbUIsRUFDbkIsZ0JBQWdCLEdBQ2hCLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTdFLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7SUFDNUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLGVBQWlDLENBQUE7SUFFckMsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFB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LENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMzRSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0RCxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtZQUNwQixFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRTtTQUNwQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM5RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDckIsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN0QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN0QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN0QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGO1lBQ0MsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FDRCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGO1lBQ0MsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FDRCxDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN0QixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0JBQStCLEVBQUU7UUFDckMsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN0QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDckIsZ0JBQWdCLENBQUM7WUFDaEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7WUFDcEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUU7U0FDcEIsQ0FBQyxFQUNGLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUN0QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDekYsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRTtJQUMxQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtRQUNuQyxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUE7UUFDL0IsTUFBTSxJQUFJLEdBQUcsaUNBQWlDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQy9ELFlBQVksRUFBRSxRQUFRO1lBQ3RCLFFBQVE7U0FDUixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNwRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtRQUNuQyxNQUFNLFlBQVksR0FBRyxFQUFFLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLENBQUE7UUFDbkYsTUFBTSxJQUFJLEdBQUcsaUNBQWlDLENBQUMsTUFBTSxDQUNwRCxZQUFZLENBQUMsWUFBWSxFQUN6QixZQUFZLENBQUMsUUFBUSxDQUNyQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDN0UsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDcEYsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9