/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../base/browser/dom.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { NotImplementedError } from '../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { Mimes } from '../../../../../base/common/mime.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ILanguageConfigurationService } from '../../../../../editor/common/languages/languageConfigurationRegistry.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TestLanguageConfigurationService } from '../../../../../editor/test/common/modes/testLanguageConfigurationService.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { TestClipboardService } from '../../../../../platform/clipboard/test/common/testClipboardService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../../platform/contextkey/browser/contextKeyService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MockKeybindingService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILayoutService } from '../../../../../platform/layout/browser/layoutService.js';
import { IListService, ListService } from '../../../../../platform/list/browser/listService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { UndoRedoService } from '../../../../../platform/undoRedo/common/undoRedoService.js';
import { IWorkspaceTrustRequestService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { CellFocusMode, } from '../../browser/notebookBrowser.js';
import { NotebookCellStatusBarService } from '../../browser/services/notebookCellStatusBarServiceImpl.js';
import { ListViewInfoAccessor, NotebookCellList } from '../../browser/view/notebookCellList.js';
import { NotebookEventDispatcher } from '../../browser/viewModel/eventDispatcher.js';
import { NotebookViewModel } from '../../browser/viewModel/notebookViewModelImpl.js';
import { ViewContext } from '../../browser/viewModel/viewContext.js';
import { NotebookCellTextModel } from '../../common/model/notebookCellTextModel.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { INotebookCellStatusBarService } from '../../common/notebookCellStatusBarService.js';
import { CellUri, NotebookCellExecutionState, SelectionStateType, } from '../../common/notebookCommon.js';
import { INotebookExecutionStateService, } from '../../common/notebookExecutionStateService.js';
import { NotebookOptions } from '../../browser/notebookOptions.js';
import { TextModelResolverService } from '../../../../services/textmodelResolver/common/textModelResolverService.js';
import { TestLayoutService } from '../../../../test/browser/workbenchTestServices.js';
import { TestStorageService, TestWorkspaceTrustRequestService, } from '../../../../test/common/workbenchTestServices.js';
import { FontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { EditorFontLigatures, EditorFontVariations, } from '../../../../../editor/common/config/editorOptions.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { TestCodeEditorService } from '../../../../../editor/test/browser/editorTestServices.js';
import { INotebookCellOutlineDataSourceFactory, NotebookCellOutlineDataSourceFactory, } from '../../browser/viewModel/notebookOutlineDataSourceFactory.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory, } from '../../browser/viewModel/notebookOutlineEntryFactory.js';
import { IOutlineService } from '../../../../services/outline/browser/outline.js';
export class TestCell extends NotebookCellTextModel {
    constructor(viewType, handle, source, language, cellKind, outputs, languageService) {
        super(CellUri.generate(URI.parse('test:///fake/notebook'), handle), handle, source, language, Mimes.text, cellKind, outputs, undefined, undefined, undefined, {
            transientCellMetadata: {},
            transientDocumentMetadata: {},
            transientOutputs: false,
            cellContentMetadata: {},
        }, languageService);
        this.viewType = viewType;
        this.source = source;
    }
}
export class NotebookEditorTestModel extends EditorModel {
    get viewType() {
        return this._notebook.viewType;
    }
    get resource() {
        return this._notebook.uri;
    }
    get notebook() {
        return this._notebook;
    }
    constructor(_notebook) {
        super();
        this._notebook = _notebook;
        this._dirty = false;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this.onDidChangeOrphaned = Event.None;
        this.onDidChangeReadonly = Event.None;
        this.onDidRevertUntitled = Event.None;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        if (_notebook && _notebook.onDidChangeContent) {
            this._register(_notebook.onDidChangeContent(() => {
                this._dirty = true;
                this._onDidChangeDirty.fire();
                this._onDidChangeContent.fire();
            }));
        }
    }
    isReadonly() {
        return false;
    }
    isOrphaned() {
        return false;
    }
    hasAssociatedFilePath() {
        return false;
    }
    isDirty() {
        return this._dirty;
    }
    get hasErrorState() {
        return false;
    }
    isModified() {
        return this._dirty;
    }
    getNotebook() {
        return this._notebook;
    }
    async load() {
        return this;
    }
    async save() {
        if (this._notebook) {
            this._dirty = false;
            this._onDidChangeDirty.fire();
            this._onDidSave.fire({});
            // todo, flush all states
            return true;
        }
        return false;
    }
    saveAs() {
        throw new NotImplementedError();
    }
    revert() {
        throw new NotImplementedError();
    }
}
export function setupInstantiationService(disposables) {
    const instantiationService = disposables.add(new TestInstantiationService());
    const testThemeService = new TestThemeService();
    instantiationService.stub(ILanguageService, disposables.add(new LanguageService()));
    instantiationService.stub(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
    instantiationService.stub(IConfigurationService, new TestConfigurationService());
    instantiationService.stub(IThemeService, testThemeService);
    instantiationService.stub(ILanguageConfigurationService, disposables.add(new TestLanguageConfigurationService()));
    instantiationService.stub(IModelService, disposables.add(instantiationService.createInstance(ModelService)));
    instantiationService.stub(ITextModelService, (disposables.add(instantiationService.createInstance(TextModelResolverService))));
    instantiationService.stub(IContextKeyService, disposables.add(instantiationService.createInstance(ContextKeyService)));
    instantiationService.stub(IListService, disposables.add(instantiationService.createInstance(ListService)));
    instantiationService.stub(ILayoutService, new TestLayoutService());
    instantiationService.stub(ILogService, new NullLogService());
    instantiationService.stub(IClipboardService, TestClipboardService);
    instantiationService.stub(IStorageService, disposables.add(new TestStorageService()));
    instantiationService.stub(IWorkspaceTrustRequestService, disposables.add(new TestWorkspaceTrustRequestService(true)));
    instantiationService.stub(INotebookExecutionStateService, new TestNotebookExecutionStateService());
    instantiationService.stub(IKeybindingService, new MockKeybindingService());
    instantiationService.stub(INotebookCellStatusBarService, disposables.add(new NotebookCellStatusBarService()));
    instantiationService.stub(ICodeEditorService, disposables.add(new TestCodeEditorService(testThemeService)));
    instantiationService.stub(IOutlineService, new (class extends mock() {
        registerOutlineCreator() {
            return { dispose() { } };
        }
    })());
    instantiationService.stub(INotebookCellOutlineDataSourceFactory, instantiationService.createInstance(NotebookCellOutlineDataSourceFactory));
    instantiationService.stub(INotebookOutlineEntryFactory, instantiationService.createInstance(NotebookOutlineEntryFactory));
    instantiationService.stub(ILanguageDetectionService, new (class MockLanguageDetectionService {
        isEnabledForLanguage(languageId) {
            return false;
        }
        async detectLanguage(resource, supportedLangs) {
            return undefined;
        }
    })());
    return instantiationService;
}
function _createTestNotebookEditor(instantiationService, disposables, cells) {
    const viewType = 'notebook';
    const notebook = disposables.add(instantiationService.createInstance(NotebookTextModel, viewType, URI.parse('test://test'), cells.map((cell) => {
        return {
            source: cell[0],
            mime: undefined,
            language: cell[1],
            cellKind: cell[2],
            outputs: cell[3] ?? [],
            metadata: cell[4],
        };
    }), {}, {
        transientCellMetadata: {},
        transientDocumentMetadata: {},
        cellContentMetadata: {},
        transientOutputs: false,
    }));
    const model = disposables.add(new NotebookEditorTestModel(notebook));
    const notebookOptions = disposables.add(new NotebookOptions(mainWindow, false, undefined, instantiationService.get(IConfigurationService), instantiationService.get(INotebookExecutionStateService), instantiationService.get(ICodeEditorService)));
    const baseCellEditorOptions = new (class extends mock() {
    })();
    const viewContext = new ViewContext(notebookOptions, disposables.add(new NotebookEventDispatcher()), () => baseCellEditorOptions);
    const viewModel = disposables.add(instantiationService.createInstance(NotebookViewModel, viewType, model.notebook, viewContext, null, { isReadOnly: false }));
    const cellList = disposables.add(createNotebookCellList(instantiationService, disposables, viewContext));
    cellList.attachViewModel(viewModel);
    const listViewInfoAccessor = disposables.add(new ListViewInfoAccessor(cellList));
    let visibleRanges = [{ start: 0, end: 100 }];
    const id = Date.now().toString();
    const notebookEditor = new (class extends mock() {
        constructor() {
            super(...arguments);
            this.notebookOptions = notebookOptions;
            this.onDidChangeModel = new Emitter().event;
            this.onDidChangeCellState = new Emitter().event;
            this.textModel = viewModel.notebookDocument;
            this.onDidChangeVisibleRanges = Event.None;
        }
        // eslint-disable-next-line local/code-must-use-super-dispose
        dispose() {
            viewModel.dispose();
        }
        getViewModel() {
            return viewModel;
        }
        hasModel() {
            return !!viewModel;
        }
        getLength() {
            return viewModel.length;
        }
        getFocus() {
            return viewModel.getFocus();
        }
        getSelections() {
            return viewModel.getSelections();
        }
        setFocus(focus) {
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: focus,
                selections: viewModel.getSelections(),
            });
        }
        setSelections(selections) {
            viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: viewModel.getFocus(),
                selections: selections,
            });
        }
        getViewIndexByModelIndex(index) {
            return listViewInfoAccessor.getViewIndex(viewModel.viewCells[index]);
        }
        getCellRangeFromViewRange(startIndex, endIndex) {
            return listViewInfoAccessor.getCellRangeFromViewRange(startIndex, endIndex);
        }
        revealCellRangeInView() { }
        setHiddenAreas(_ranges) {
            return cellList.setHiddenAreas(_ranges, true);
        }
        getActiveCell() {
            const elements = cellList.getFocusedElements();
            if (elements && elements.length) {
                return elements[0];
            }
            return undefined;
        }
        hasOutputTextSelection() {
            return false;
        }
        changeModelDecorations() {
            return null;
        }
        focusElement() { }
        setCellEditorSelection() { }
        async revealRangeInCenterIfOutsideViewportAsync() { }
        async layoutNotebookCell() { }
        async createOutput() { }
        async removeInset() { }
        async focusNotebookCell(cell, focusItem) {
            cell.focusMode =
                focusItem === 'editor'
                    ? CellFocusMode.Editor
                    : focusItem === 'output'
                        ? CellFocusMode.Output
                        : CellFocusMode.Container;
        }
        cellAt(index) {
            return viewModel.cellAt(index);
        }
        getCellIndex(cell) {
            return viewModel.getCellIndex(cell);
        }
        getCellsInRange(range) {
            return viewModel.getCellsInRange(range);
        }
        getCellByHandle(handle) {
            return viewModel.getCellByHandle(handle);
        }
        getNextVisibleCellIndex(index) {
            return viewModel.getNextVisibleCellIndex(index);
        }
        getControl() {
            return this;
        }
        get onDidChangeSelection() {
            return viewModel.onDidChangeSelection;
        }
        get onDidChangeOptions() {
            return viewModel.onDidChangeOptions;
        }
        get onDidChangeViewCells() {
            return viewModel.onDidChangeViewCells;
        }
        async find(query, options) {
            const findMatches = viewModel.find(query, options).filter((match) => match.length > 0);
            return findMatches;
        }
        deltaCellDecorations() {
            return [];
        }
        get visibleRanges() {
            return visibleRanges;
        }
        set visibleRanges(_ranges) {
            visibleRanges = _ranges;
        }
        getId() {
            return id;
        }
        setScrollTop(scrollTop) {
            cellList.scrollTop = scrollTop;
        }
        get scrollTop() {
            return cellList.scrollTop;
        }
        getLayoutInfo() {
            return {
                width: 0,
                height: 0,
                scrollHeight: cellList.getScrollHeight(),
                fontInfo: new FontInfo({
                    pixelRatio: 1,
                    fontFamily: 'mockFont',
                    fontWeight: 'normal',
                    fontSize: 14,
                    fontFeatureSettings: EditorFontLigatures.OFF,
                    fontVariationSettings: EditorFontVariations.OFF,
                    lineHeight: 19,
                    letterSpacing: 1.5,
                    isMonospace: true,
                    typicalHalfwidthCharacterWidth: 10,
                    typicalFullwidthCharacterWidth: 20,
                    canUseHalfwidthRightwardsArrow: true,
                    spaceWidth: 10,
                    middotWidth: 10,
                    wsmiddotWidth: 10,
                    maxDigitWidth: 10,
                }, true),
                stickyHeight: 0,
            };
        }
    })();
    return { editor: notebookEditor, viewModel };
}
export function createTestNotebookEditor(instantiationService, disposables, cells) {
    return _createTestNotebookEditor(instantiationService, disposables, cells);
}
export async function withTestNotebookDiffModel(originalCells, modifiedCells, callback) {
    const disposables = new DisposableStore();
    const instantiationService = setupInstantiationService(disposables);
    const originalNotebook = createTestNotebookEditor(instantiationService, disposables, originalCells);
    const modifiedNotebook = createTestNotebookEditor(instantiationService, disposables, modifiedCells);
    const originalResource = new (class extends mock() {
        get notebook() {
            return originalNotebook.viewModel.notebookDocument;
        }
        get resource() {
            return originalNotebook.viewModel.notebookDocument.uri;
        }
    })();
    const modifiedResource = new (class extends mock() {
        get notebook() {
            return modifiedNotebook.viewModel.notebookDocument;
        }
        get resource() {
            return modifiedNotebook.viewModel.notebookDocument.uri;
        }
    })();
    const model = new (class extends mock() {
        get original() {
            return originalResource;
        }
        get modified() {
            return modifiedResource;
        }
    })();
    const res = await callback(model, disposables, instantiationService);
    if (res instanceof Promise) {
        res.finally(() => {
            originalNotebook.editor.dispose();
            originalNotebook.viewModel.notebookDocument.dispose();
            originalNotebook.viewModel.dispose();
            modifiedNotebook.editor.dispose();
            modifiedNotebook.viewModel.notebookDocument.dispose();
            modifiedNotebook.viewModel.dispose();
            disposables.dispose();
        });
    }
    else {
        originalNotebook.editor.dispose();
        originalNotebook.viewModel.notebookDocument.dispose();
        originalNotebook.viewModel.dispose();
        modifiedNotebook.editor.dispose();
        modifiedNotebook.viewModel.notebookDocument.dispose();
        modifiedNotebook.viewModel.dispose();
        disposables.dispose();
    }
    return res;
}
export async function withTestNotebook(cells, callback, accessor) {
    const disposables = new DisposableStore();
    const instantiationService = accessor ?? setupInstantiationService(disposables);
    const notebookEditor = _createTestNotebookEditor(instantiationService, disposables, cells);
    return runWithFakedTimers({ useFakeTimers: true }, async () => {
        const res = await callback(notebookEditor.editor, notebookEditor.viewModel, disposables, instantiationService);
        if (res instanceof Promise) {
            res.finally(() => {
                notebookEditor.editor.dispose();
                notebookEditor.viewModel.dispose();
                notebookEditor.editor.textModel.dispose();
                disposables.dispose();
            });
        }
        else {
            notebookEditor.editor.dispose();
            notebookEditor.viewModel.dispose();
            notebookEditor.editor.textModel.dispose();
            disposables.dispose();
        }
        return res;
    });
}
export function createNotebookCellList(instantiationService, disposables, viewContext) {
    const delegate = {
        getHeight(element) {
            return element.getHeight(17);
        },
        getTemplateId() {
            return 'template';
        },
    };
    const baseCellRenderTemplate = new (class extends mock() {
    })();
    const renderer = {
        templateId: 'template',
        renderTemplate() {
            return baseCellRenderTemplate;
        },
        renderElement() { },
        disposeTemplate() { },
    };
    const notebookOptions = !!viewContext
        ? viewContext.notebookOptions
        : disposables.add(new NotebookOptions(mainWindow, false, undefined, instantiationService.get(IConfigurationService), instantiationService.get(INotebookExecutionStateService), instantiationService.get(ICodeEditorService)));
    const cellList = disposables.add(instantiationService.createInstance(NotebookCellList, 'NotebookCellList', DOM.$('container'), notebookOptions, delegate, [renderer], instantiationService.get(IContextKeyService), {
        supportDynamicHeights: true,
        multipleSelectionSupport: true,
    }));
    return cellList;
}
export function valueBytesFromString(value) {
    return VSBuffer.fromString(value);
}
class TestCellExecution {
    constructor(notebook, cellHandle, onComplete) {
        this.notebook = notebook;
        this.cellHandle = cellHandle;
        this.onComplete = onComplete;
        this.state = NotebookCellExecutionState.Unconfirmed;
        this.didPause = false;
        this.isPaused = false;
    }
    confirm() { }
    update(updates) { }
    complete(complete) {
        this.onComplete();
    }
}
export class TestNotebookExecutionStateService {
    constructor() {
        this._executions = new ResourceMap();
        this.onDidChangeExecution = new Emitter().event;
        this.onDidChangeLastRunFailState = new Emitter().event;
    }
    forceCancelNotebookExecutions(notebookUri) { }
    getCellExecutionsForNotebook(notebook) {
        return [];
    }
    getCellExecution(cellUri) {
        return this._executions.get(cellUri);
    }
    createCellExecution(notebook, cellHandle) {
        const onComplete = () => this._executions.delete(CellUri.generate(notebook, cellHandle));
        const exe = new TestCellExecution(notebook, cellHandle, onComplete);
        this._executions.set(CellUri.generate(notebook, cellHandle), exe);
        return exe;
    }
    getCellExecutionsByHandleForNotebook(notebook) {
        return;
    }
    getLastFailedCellForNotebook(notebook) {
        return;
    }
    getLastCompletedCellForNotebook(notebook) {
        return;
    }
    getExecution(notebook) {
        return;
    }
    createExecution(notebook) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGVib29rRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvdGVzdE5vdGVib29rRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUs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