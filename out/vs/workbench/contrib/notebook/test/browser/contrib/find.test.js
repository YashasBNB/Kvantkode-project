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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NvbnRyaWIvZmluZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckUsT0FBTyxFQUNOLFNBQVMsRUFFVCwyQkFBMkIsR0FDM0IsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM3RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFFM0gsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBTzFGLE9BQU8sRUFBZ0IsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3JFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXJHLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO0lBQzNCLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsTUFBTSxrQkFBa0IsR0FBNkI7UUFDcEQsS0FBSyxFQUFFLHFCQUFxQjtLQUM1QixDQUFBO0lB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QUFDO3FCQUNOO2lCQUNEO2FBQ0QsQ0FDRCxDQUFBO1lBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JDLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNsRSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25FLENBQUMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9