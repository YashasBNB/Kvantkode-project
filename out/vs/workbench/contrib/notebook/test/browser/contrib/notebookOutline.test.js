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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9jb250cmliL25vdGVib29rT3V0bGluZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUseUJBQXlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUV0RixPQUFPLEVBRU4sYUFBYSxHQUNiLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFvQyxNQUFNLG1DQUFtQyxDQUFBO0FBRTlGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUU1RSxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHNCQUFzQixHQUN0QixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBRTdHLE9BQU8sRUFBRSxp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