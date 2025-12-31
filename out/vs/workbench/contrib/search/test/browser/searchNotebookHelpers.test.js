/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../editor/common/core/range.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { CellKind } from '../../../notebook/common/notebookCommon.js';
import { contentMatchesToTextSearchMatches, webviewMatchesToTextSearchMatches, } from '../../browser/notebookSearch/searchNotebookHelpers.js';
import { CellFindMatchModel } from '../../../notebook/browser/contrib/find/findModel.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { URI } from '../../../../../base/common/uri.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { createFileUriFromPathFromRoot, stubModelService, stubNotebookEditorService, } from './searchTestCommon.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellMatch, NotebookCompatibleFileMatch, textSearchMatchesToNotebookMatches, } from '../../browser/notebookSearch/notebookSearchModel.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
suite('searchNotebookHelpers', () => {
    let instantiationService;
    let mdCellFindMatch;
    let codeCellFindMatch;
    let mdInputCell;
    let codeCell;
    let markdownContentResults;
    let codeContentResults;
    let codeWebviewResults;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let counter = 0;
    setup(() => {
        instantiationService = new TestInstantiationService();
        store.add(instantiationService);
        const modelService = stubModelService(instantiationService, (e) => store.add(e));
        const notebookEditorService = stubNotebookEditorService(instantiationService, (e) => store.add(e));
        instantiationService.stub(IModelService, modelService);
        instantiationService.stub(INotebookEditorService, notebookEditorService);
        mdInputCell = {
            id: 'mdCell',
            cellKind: CellKind.Markup,
            textBuffer: {
                getLineContent(lineNumber) {
                    if (lineNumber === 1) {
                        return '# Hello World Test';
                    }
                    else {
                        return '';
                    }
                },
            },
        };
        const findMatchMds = [new FindMatch(new Range(1, 15, 1, 19), ['Test'])];
        codeCell = {
            id: 'codeCell',
            cellKind: CellKind.Code,
            textBuffer: {
                getLineContent(lineNumber) {
                    if (lineNumber === 1) {
                        return 'print("test! testing!!")';
                    }
                    else if (lineNumber === 2) {
                        return 'print("this is a Test")';
                    }
                    else {
                        return '';
                    }
                },
            },
        };
        const findMatchCodeCells = [
            new FindMatch(new Range(1, 8, 1, 12), ['test']),
            new FindMatch(new Range(1, 14, 1, 18), ['test']),
            new FindMatch(new Range(2, 18, 2, 22), ['Test']),
        ];
        const webviewMatches = [
            {
                index: 0,
                searchPreviewInfo: {
                    line: 'test! testing!!',
                    range: {
                        start: 1,
                        end: 5,
                    },
                },
            },
            {
                index: 1,
                searchPreviewInfo: {
                    line: 'test! testing!!',
                    range: {
                        start: 7,
                        end: 11,
                    },
                },
            },
            {
                index: 3,
                searchPreviewInfo: {
                    line: 'this is a Test',
                    range: {
                        start: 11,
                        end: 15,
                    },
                },
            },
        ];
        mdCellFindMatch = new CellFindMatchModel(mdInputCell, 0, findMatchMds, []);
        codeCellFindMatch = new CellFindMatchModel(codeCell, 5, findMatchCodeCells, webviewMatches);
    });
    teardown(() => {
        instantiationService.dispose();
    });
    suite('notebookEditorMatchesToTextSearchResults', () => {
        function assertRangesEqual(actual, expected) {
            if (!Array.isArray(actual)) {
                actual = [actual];
            }
            assert.strictEqual(actual.length, expected.length);
            actual.forEach((r, i) => {
                const expectedRange = expected[i];
                assert.deepStrictEqual({
                    startLineNumber: r.startLineNumber,
                    startColumn: r.startColumn,
                    endLineNumber: r.endLineNumber,
                    endColumn: r.endColumn,
                }, {
                    startLineNumber: expectedRange.startLineNumber,
                    startColumn: expectedRange.startColumn,
                    endLineNumber: expectedRange.endLineNumber,
                    endColumn: expectedRange.endColumn,
                });
            });
        }
        test('convert CellFindMatchModel to ITextSearchMatch and check results', () => {
            markdownContentResults = contentMatchesToTextSearchMatches(mdCellFindMatch.contentMatches, mdInputCell);
            codeContentResults = contentMatchesToTextSearchMatches(codeCellFindMatch.contentMatches, codeCell);
            codeWebviewResults = webviewMatchesToTextSearchMatches(codeCellFindMatch.webviewMatches);
            assert.strictEqual(markdownContentResults.length, 1);
            assert.strictEqual(markdownContentResults[0].previewText, '# Hello World Test\n');
            assertRangesEqual(markdownContentResults[0].rangeLocations.map((e) => e.preview), [new Range(0, 14, 0, 18)]);
            assertRangesEqual(markdownContentResults[0].rangeLocations.map((e) => e.source), [new Range(0, 14, 0, 18)]);
            assert.strictEqual(codeContentResults.length, 2);
            assert.strictEqual(codeContentResults[0].previewText, 'print("test! testing!!")\n');
            assert.strictEqual(codeContentResults[1].previewText, 'print("this is a Test")\n');
            assertRangesEqual(codeContentResults[0].rangeLocations.map((e) => e.preview), [new Range(0, 7, 0, 11), new Range(0, 13, 0, 17)]);
            assertRangesEqual(codeContentResults[0].rangeLocations.map((e) => e.source), [new Range(0, 7, 0, 11), new Range(0, 13, 0, 17)]);
            assert.strictEqual(codeWebviewResults.length, 3);
            assert.strictEqual(codeWebviewResults[0].previewText, 'test! testing!!');
            assert.strictEqual(codeWebviewResults[1].previewText, 'test! testing!!');
            assert.strictEqual(codeWebviewResults[2].previewText, 'this is a Test');
            assertRangesEqual(codeWebviewResults[0].rangeLocations.map((e) => e.preview), [new Range(0, 1, 0, 5)]);
            assertRangesEqual(codeWebviewResults[1].rangeLocations.map((e) => e.preview), [new Range(0, 7, 0, 11)]);
            assertRangesEqual(codeWebviewResults[2].rangeLocations.map((e) => e.preview), [new Range(0, 11, 0, 15)]);
            assertRangesEqual(codeWebviewResults[0].rangeLocations.map((e) => e.source), [new Range(0, 1, 0, 5)]);
            assertRangesEqual(codeWebviewResults[1].rangeLocations.map((e) => e.source), [new Range(0, 7, 0, 11)]);
            assertRangesEqual(codeWebviewResults[2].rangeLocations.map((e) => e.source), [new Range(0, 11, 0, 15)]);
        });
        test('convert ITextSearchMatch to MatchInNotebook', () => {
            const mdCellMatch = new CellMatch(aFileMatch(), mdInputCell, 0);
            const markdownCellContentMatchObjs = textSearchMatchesToNotebookMatches(markdownContentResults, mdCellMatch);
            const codeCellMatch = new CellMatch(aFileMatch(), codeCell, 0);
            const codeCellContentMatchObjs = textSearchMatchesToNotebookMatches(codeContentResults, codeCellMatch);
            const codeWebviewContentMatchObjs = textSearchMatchesToNotebookMatches(codeWebviewResults, codeCellMatch);
            assert.strictEqual(markdownCellContentMatchObjs[0].cell?.id, mdCellMatch.id);
            assertRangesEqual(markdownCellContentMatchObjs[0].range(), [new Range(1, 15, 1, 19)]);
            assert.strictEqual(codeCellContentMatchObjs[0].cell?.id, codeCellMatch.id);
            assert.strictEqual(codeCellContentMatchObjs[1].cell?.id, codeCellMatch.id);
            assertRangesEqual(codeCellContentMatchObjs[0].range(), [new Range(1, 8, 1, 12)]);
            assertRangesEqual(codeCellContentMatchObjs[1].range(), [new Range(1, 14, 1, 18)]);
            assertRangesEqual(codeCellContentMatchObjs[2].range(), [new Range(2, 18, 2, 22)]);
            assert.strictEqual(codeWebviewContentMatchObjs[0].cell?.id, codeCellMatch.id);
            assert.strictEqual(codeWebviewContentMatchObjs[1].cell?.id, codeCellMatch.id);
            assert.strictEqual(codeWebviewContentMatchObjs[2].cell?.id, codeCellMatch.id);
            assertRangesEqual(codeWebviewContentMatchObjs[0].range(), [new Range(1, 2, 1, 6)]);
            assertRangesEqual(codeWebviewContentMatchObjs[1].range(), [new Range(1, 8, 1, 12)]);
            assertRangesEqual(codeWebviewContentMatchObjs[2].range(), [new Range(1, 12, 1, 16)]);
        });
        function aFileMatch() {
            const rawMatch = {
                resource: URI.file('somepath' + ++counter),
                results: [],
            };
            const searchModel = instantiationService.createInstance(SearchModelImpl);
            store.add(searchModel);
            const folderMatch = instantiationService.createInstance(FolderMatchImpl, URI.file('somepath'), '', 0, {
                type: 2 /* QueryType.Text */,
                folderQueries: [{ folder: createFileUriFromPathFromRoot() }],
                contentPattern: {
                    pattern: '',
                },
            }, searchModel.searchResult.plainTextSearchResult, searchModel.searchResult, null);
            const fileMatch = instantiationService.createInstance(NotebookCompatibleFileMatch, {
                pattern: '',
            }, undefined, undefined, folderMatch, rawMatch, null, '');
            fileMatch.createMatches();
            store.add(folderMatch);
            store.add(fileMatch);
            return fileMatch;
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9icm93c2VyL3NlYXJjaE5vdGVib29rSGVscGVycy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBdUIsTUFBTSx1Q0FBdUMsQ0FBQTtBQVF0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxpQ0FBaUMsR0FDakMsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsZ0JBQWdCLEVBQ2hCLHlCQUF5QixHQUN6QixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sU0FBUyxFQUNULDJCQUEyQixFQUMzQixrQ0FBa0MsR0FDbEMsTUFBTSxxREFBcUQs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