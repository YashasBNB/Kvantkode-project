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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoTm90ZWJvb2tIZWxwZXJzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2Jyb3dzZXIvc2VhcmNoTm90ZWJvb2tIZWxwZXJzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUF1QixNQUFNLHVDQUF1QyxDQUFBO0FBUXRGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNyRSxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLGlDQUFpQyxHQUNqQyxNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixnQkFBZ0IsRUFDaEIseUJBQXlCLEdBQ3pCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixTQUFTLEVBQ1QsMkJBQTJCLEVBQzNCLGtD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