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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE5vdGVib29rRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL3Rlc3ROb3RlYm9va0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFDdkgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDcEYsT0FBTyxFQUFFLGlCQUFp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