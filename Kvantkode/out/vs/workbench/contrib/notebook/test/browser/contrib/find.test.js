/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../editor/common/core/range.js';
import { FindMatch, ValidAnnotatedEditOperation, } from '../../../../../../editor/common/model.js';
import { USUAL_WORD_SEPARATORS } from '../../../../../../editor/common/core/wordHelper.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { FindReplaceState } from '../../../../../../editor/contrib/find/browser/findState.js';
import { IConfigurationService, } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CellFindMatchModel, FindModel } from '../../../browser/contrib/find/findModel.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { TestCell, withTestNotebook } from '../testNotebookEditor.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('Notebook Find', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationValue = {
        value: USUAL_WORD_SEPARATORS,
    };
    const configurationService = new (class extends TestConfigurationService {
        inspect() {
            return configurationValue;
        }
    })();
    const setupEditorForTest = (editor, viewModel) => {
        editor.changeModelDecorations = (callback) => {
            return callback({
                deltaDecorations: (oldDecorations, newDecorations) => {
                    const ret = [];
                    newDecorations.forEach((dec) => {
                        const cell = viewModel.viewCells.find((cell) => cell.handle === dec.ownerId);
                        const decorations = cell?.deltaModelDecorations([], dec.decorations) ?? [];
                        if (decorations.length > 0) {
                            ret.push({ ownerId: dec.ownerId, decorations: decorations });
                        }
                    });
                    return ret;
                },
            });
        };
    };
    test('Update find matches basics', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            assert.strictEqual(model.findMatches.length, 2);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            assert.strictEqual(editor.textModel.length, 3);
            const found2 = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 3,
                    count: 0,
                    cells: [
                        disposables.add(new TestCell(viewModel.viewType, 3, '# next paragraph 1', 'markdown', CellKind.Code, [], accessor.get(ILanguageService))),
                    ],
                },
            ], true, undefined, () => undefined, undefined, true);
            await found2;
            assert.strictEqual(editor.textModel.length, 4);
            assert.strictEqual(model.findMatches.length, 3);
            assert.strictEqual(model.currentMatch, 1);
        });
    });
    test('Update find matches basics 2', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.3', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            setupEditorForTest(editor, viewModel);
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            // find matches is not necessarily find results
            assert.strictEqual(model.findMatches.length, 4);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 2);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 3);
            const found2 = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 2,
                    count: 1,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            await found2;
            assert.strictEqual(model.findMatches.length, 3);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 3);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 2);
        });
    });
    test('Update find matches basics 3', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.3', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            setupEditorForTest(editor, viewModel);
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            // find matches is not necessarily find results
            assert.strictEqual(model.findMatches.length, 4);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 4);
            const found2 = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            editor.textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: 2,
                    count: 1,
                    cells: [],
                },
            ], true, undefined, () => undefined, undefined, true);
            await found2;
            assert.strictEqual(model.findMatches.length, 3);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 3);
            model.find({ previous: true });
            assert.strictEqual(model.currentMatch, 2);
        });
    });
    test('Update find matches, #112748', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.2', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1.3', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            setupEditorForTest(editor, viewModel);
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            // find matches is not necessarily find results
            assert.strictEqual(model.findMatches.length, 4);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            model.find({ previous: false });
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 3);
            const found2 = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            viewModel.viewCells[1].textBuffer.applyEdits([new ValidAnnotatedEditOperation(null, new Range(1, 1, 1, 14), '', false, false, false)], false, true);
            // cell content updates, recompute
            model.research();
            await found2;
            assert.strictEqual(model.currentMatch, 1);
        });
    });
    test('Reset when match not found, #127198', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 1', 'markdown', CellKind.Markup, [], {}],
            ['paragraph 2', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            accessor.stub(IConfigurationService, configurationService);
            const state = disposables.add(new FindReplaceState());
            const model = disposables.add(new FindModel(editor, state, accessor.get(IConfigurationService)));
            const found = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ isRevealed: true }, true);
            state.change({ searchString: '1' }, true);
            await found;
            assert.strictEqual(model.findMatches.length, 2);
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 0);
            model.find({ previous: false });
            assert.strictEqual(model.currentMatch, 1);
            assert.strictEqual(editor.textModel.length, 3);
            const found2 = new Promise((resolve) => disposables.add(state.onFindReplaceStateChange((e) => {
                if (e.matchesCount) {
                    resolve(true);
                }
            })));
            state.change({ searchString: '3' }, true);
            await found2;
            assert.strictEqual(model.currentMatch, -1);
            assert.strictEqual(model.findMatches.length, 0);
        });
    });
    test('CellFindMatchModel', async function () {
        await withTestNotebook([
            ['# header 1', 'markdown', CellKind.Markup, [], {}],
            ['print(1)', 'typescript', CellKind.Code, [], {}],
        ], async (editor) => {
            const mdCell = editor.cellAt(0);
            const mdModel = new CellFindMatchModel(mdCell, 0, [], []);
            assert.strictEqual(mdModel.length, 0);
            mdModel.contentMatches.push(new FindMatch(new Range(1, 1, 1, 2), []));
            assert.strictEqual(mdModel.length, 1);
            mdModel.webviewMatches.push({
                index: 0,
                searchPreviewInfo: {
                    line: '',
                    range: {
                        start: 0,
                        end: 0,
                    },
                },
            }, {
                index: 1,
                searchPreviewInfo: {
                    line: '',
                    range: {
                        start: 0,
                        end: 0,
                    },
                },
            });
            assert.strictEqual(mdModel.length, 3);
            assert.strictEqual(mdModel.getMatch(0), mdModel.contentMatches[0]);
            assert.strictEqual(mdModel.getMatch(1), mdModel.webviewMatches[0]);
            assert.strictEqual(mdModel.getMatch(2), mdModel.webviewMatches[1]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9maW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sU0FBUyxFQUVULDJCQUEyQixHQUMzQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzdGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUUzSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFPMUYsT0FBTyxFQUFnQixRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFckcsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7SUFDM0IsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxNQUFNLGtCQUFrQixHQUE2QjtRQUNwRCxLQUFLLEVBQUUscUJBQXFCO0tBQzVCLENBQUE7SUFDRCxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsd0JBQXdCO1FBQzlELE9BQU87WUFDZixPQUFPLGtCQUFrQixDQUFBO1FBQzFCLENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUVKLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxNQUE2QixFQUFFLFNBQTRCLEVBQUUsRUFBRTtRQUMxRixNQUFNLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM1QyxPQUFPLFFBQVEsQ0FBQztnQkFDZixnQkFBZ0IsRUFBRSxDQUNqQixjQUF1QyxFQUN2QyxjQUE0QyxFQUMzQyxFQUFFO29CQUNILE1BQU0sR0FBRyxHQUE0QixFQUFFLENBQUE7b0JBQ3ZDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTt3QkFDOUIsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO3dCQUM1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLEVBQUUscUJBQXFCLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7d0JBRTFFLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO3dCQUM3RCxDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFBO29CQUVGLE9BQU8sR0FBRyxDQUFBO2dCQUNYLENBQUM7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUE7SUFDRixDQUFDLENBQUE7SUFFRCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSztRQUN2QyxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNwRCxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3BELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLFFBQVEsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtZQUMxRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQXVCLENBQUMsQ0FBQTtZQUMxRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUNqRSxDQUFBO1lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUM5QyxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7WUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3hDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekMsTUFBTSxLQUFLLENBQUE7WUFDWCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDL0MsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO1lBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQzFCO2dCQUNDO29CQUNDLFFBQVEsOEJBQXNCO29CQUM5QixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUUsQ0FBQztvQkFDUixLQUFLLEVBQUU7d0JBQ04sV0FBVyxDQUFDLEdBQUcsQ0FDZCxJQUFJLFFBQVEsQ0FDWCxTQUFTLENBQUMsUUFBUSxFQUNsQixDQUFDLEVBQ0Qsb0JBQW9CLEVBQ3BCLFVBQVUsRUFDVixRQUFRLENBQUMsSUFBSSxFQUNiLEVBQUUsRUFDRixRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQzlCLENBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxFQUNELElBQUksRUFDSixTQUFTLEVBQ1QsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUNmLFNBQVMsRUFDVCxJQUFJLENBQ0osQ0FBQTtZQUNELE1BQU0sTUFBTSxDQUFBO1lBQ1osTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUs7UUFDekMsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDcEQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDMUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3JDLFFBQVEsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtZQUMxRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQXVCLENBQUMsQ0FBQTtZQUMxRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUNqRSxDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUM5QyxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7WUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3hDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekMsTUFBTSxLQUFLLENBQUE7WUFDWCwrQ0FBK0M7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUMvQyxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7WUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FDMUI7Z0JBQ0M7b0JBQ0MsUUFBUSw4QkFBc0I7b0JBQzlCLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLE1BQU0sQ0FBQTtZQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDMUMsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxLQUFLO1FBQ3pDLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3BELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLGtCQUFrQixDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNyQyxRQUFRLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUE7WUFDMUQsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixFQUF1QixDQUFDLENBQUE7WUFDMUUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDNUIsSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FDakUsQ0FBQTtZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDOUMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO1lBQ0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN4QyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3pDLE1BQU0sS0FBSyxDQUFBO1lBQ1gsK0NBQStDO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUMvQyxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7WUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FDMUI7Z0JBQ0M7b0JBQ0MsUUFBUSw4QkFBc0I7b0JBQzlCLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxDQUFDO29CQUNSLEtBQUssRUFBRSxFQUFFO2lCQUNUO2FBQ0QsRUFDRCxJQUFJLEVBQ0osU0FBUyxFQUNULEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsSUFBSSxDQUNKLENBQUE7WUFDRCxNQUFNLE1BQU0sQ0FBQTtZQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM5QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxQyxDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhCQUE4QixFQUFFLEtBQUs7UUFDekMsTUFBTSxnQkFBZ0IsQ0FDckI7WUFDQyxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ25ELENBQUMsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxlQUFlLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN0RCxDQUFDLGVBQWUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1lBQ3RELENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDcEQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDMUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ3JDLFFBQVEsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtZQUMxRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQXVCLENBQUMsQ0FBQTtZQUMxRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUNqRSxDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUM5QyxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7WUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3hDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekMsTUFBTSxLQUFLLENBQUE7WUFDWCwrQ0FBK0M7WUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUMvQixLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDL0MsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUNBO1lBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUEwQixDQUFDLFVBQVUsQ0FDN0QsQ0FBQyxJQUFJLDJCQUEyQixDQUFDLElBQUksRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUN4RixLQUFLLEVBQ0wsSUFBSSxDQUNKLENBQUE7WUFDRCxrQ0FBa0M7WUFDbEMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQ2hCLE1BQU0sTUFBTSxDQUFBO1lBQ1osTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzFDLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUNBQXFDLEVBQUUsS0FBSztRQUNoRCxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDbkQsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNwRCxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3BELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQzFDLFFBQVEsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtZQUMxRCxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZ0JBQWdCLEVBQXVCLENBQUMsQ0FBQTtZQUMxRSxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUM1QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUNqRSxDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUM5QyxXQUFXLENBQUMsR0FBRyxDQUNkLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDcEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNkLENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUNELENBQUE7WUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3hDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekMsTUFBTSxLQUFLLENBQUE7WUFDWCxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDL0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUMvQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQy9CLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUV6QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTlDLE1BQU0sTUFBTSxHQUFHLElBQUksT0FBTyxDQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDL0MsV0FBVyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDcEMsSUFBSSxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDZCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FDRCxDQUFBO1lBQ0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN6QyxNQUFNLE1BQU0sQ0FBQTtZQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEQsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLO1FBQy9CLE1BQU0sZ0JBQWdCLENBQ3JCO1lBQ0MsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNuRCxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ2pELEVBQ0QsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ2hCLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFckMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQzFCO2dCQUNDLEtBQUssRUFBRSxDQUFDO2dCQUNSLGlCQUFpQixFQUFFO29CQUNsQixJQUFJLEVBQUUsRUFBRTtvQkFDUixLQUFLLEVBQUU7d0JBQ04sS0FBSyxFQUFFLENBQUM7d0JBQ1IsR0FBRyxFQUFFLENBQUM7cUJBQ047aUJBQ0Q7YUFDRCxFQUNEO2dCQUNDLEtBQUssRUFBRSxDQUFDO2dCQUNSLGlCQUFpQixFQUFFO29CQUNsQixJQUFJLEVBQUUsRUFBRTtvQkFDUixLQUFLLEVBQUU7d0JBQ04sS0FBSyxFQUFFLENBQUM7d0JBQ1IsR0FBRyxFQUFFLENBQUM7cUJBQ047aUJBQ0Q7YUFDRCxDQUNELENBQUE7WUFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkUsQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=