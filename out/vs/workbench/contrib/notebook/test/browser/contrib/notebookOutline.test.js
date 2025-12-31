/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { setupInstantiationService, withTestNotebook } from '../testNotebookEditor.js';
import { IThemeService, } from '../../../../../../platform/theme/common/themeService.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { Event } from '../../../../../../base/common/event.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../../../../platform/markers/common/markerService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { NotebookCellOutline, NotebookOutlineCreator, } from '../../../browser/contrib/outline/notebookOutline.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../../../editor/common/services/languageFeaturesService.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory, } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
suite('Notebook Outline', function () {
    let disposables;
    let instantiationService;
    let symbolsCached;
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        symbolsCached = false;
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.set(IEditorService, new (class extends mock() {
        })());
        instantiationService.set(ILanguageFeaturesService, new LanguageFeaturesService());
        instantiationService.set(IMarkerService, disposables.add(new MarkerService()));
        instantiationService.set(IThemeService, new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFileIconThemeChange = Event.None;
            }
            getFileIconTheme() {
                return { hasFileIcons: true, hasFolderIcons: true, hidesExplorerArrows: false };
            }
        })());
    });
    async function withNotebookOutline(cells, target, callback) {
        return withTestNotebook(cells, async (editor) => {
            if (!editor.hasModel()) {
                assert.ok(false, 'MUST have active text editor');
            }
            const notebookEditorPane = new (class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeModel = Event.None;
                    this.onDidChangeSelection = Event.None;
                }
                getControl() {
                    return editor;
                }
            })();
            const testOutlineEntryFactory = instantiationService.createInstance(NotebookOutlineEntryFactory);
            testOutlineEntryFactory.cacheSymbols = async () => {
                symbolsCached = true;
            };
            instantiationService.stub(INotebookOutlineEntryFactory, testOutlineEntryFactory);
            const outline = await instantiationService
                .createInstance(NotebookOutlineCreator)
                .createOutline(notebookEditorPane, target, CancellationToken.None);
            disposables.add(outline);
            return callback(outline, editor);
        });
    }
    test('basic', async function () {
        await withNotebookOutline([], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements(), []);
        });
    });
    test('special characters in heading', async function () {
        await withNotebookOutline([['# Hellö & Hällo', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'Hellö & Hällo');
        });
        await withNotebookOutline([['# bo<i>ld</i>', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'bold');
        });
    });
    test('Notebook falsely detects "empty cells"', async function () {
        await withNotebookOutline([['  的时代   ', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '的时代');
        });
        await withNotebookOutline([['   ', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'empty cell');
        });
        await withNotebookOutline([['+++++[]{}--)(0  ', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '+++++[]{}--)(0');
        });
        await withNotebookOutline([['+++++[]{}--)(0 Hello **&^ ', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '+++++[]{}--)(0 Hello **&^');
        });
        await withNotebookOutline([['!@#$\n Überschrïft', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '!@#$');
        });
    });
    test('Heading text defines entry label', async function () {
        return await withNotebookOutline([['foo\n # h1', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h1');
        });
    });
    test('Notebook outline ignores markdown headings #115200', async function () {
        await withNotebookOutline([['## h2 \n# h1', 'md', CellKind.Markup]], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 2);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h2');
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[1].label, 'h1');
        });
        await withNotebookOutline([
            ['## h2', 'md', CellKind.Markup],
            ['# h1', 'md', CellKind.Markup],
        ], 1 /* OutlineTarget.OutlinePane */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 2);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h2');
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[1].label, 'h1');
        });
    });
    test('Symbols for goto quickpick are pre-cached', async function () {
        await withNotebookOutline([['a = 1\nb = 2', 'python', CellKind.Code]], 4 /* OutlineTarget.QuickPick */, (outline) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.strictEqual(symbolsCached, true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvY29udHJpYi9ub3RlYm9va091dGxpbmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdEYsT0FBTyxFQUVOLGFBQWEsR0FDYixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBb0MsTUFBTSxtQ0FBbUMsQ0FBQTtBQUU5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFNUUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixzQkFBc0IsR0FDdEIsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUU3RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0Ms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