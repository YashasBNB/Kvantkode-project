/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import './media/notebook.css';
import './media/notebookCellChat.css';
import './media/notebookCellEditorHint.css';
import './media/notebookCellInsertToolbar.css';
import './media/notebookCellStatusBar.css';
import './media/notebookCellTitleToolbar.css';
import './media/notebookFocusIndicator.css';
import './media/notebookToolbar.css';
import './media/notebookDnd.css';
import './media/notebookFolding.css';
import './media/notebookCellOutput.css';
import './media/notebookEditorStickyScroll.css';
import './media/notebookKernelActionViewItem.css';
import './media/notebookOutline.css';
import './media/notebookChatEditController.css';
import './media/notebookChatEditorOverlay.css';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { DeferredPromise, SequencerByKey } from '../../../../base/common/async.js';
import { Color, RGBA } from '../../../../base/common/color.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { FontMeasurements } from '../../../../editor/browser/config/fontMeasurements.js';
import { BareFontInfo } from '../../../../editor/common/config/fontInfo.js';
import { Range } from '../../../../editor/common/core/range.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import * as nls from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { registerZIndex, ZIndex } from '../../../../platform/layout/browser/zIndexRegistry.js';
import { IEditorProgressService, } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { contrastBorder, errorForeground, focusBorder, foreground, listInactiveSelectionBackground, registerColor, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground, transparent, } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_PANE_BACKGROUND, PANEL_BORDER, SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { debugIconStartForeground } from '../../debug/browser/debugColors.js';
import { CellEditState, CellFocusMode, CellRevealRangeType, ScrollToRevealBehavior, } from './notebookBrowser.js';
import { NotebookEditorExtensionsRegistry } from './notebookEditorExtensions.js';
import { INotebookEditorService } from './services/notebookEditorService.js';
import { notebookDebug } from './notebookLogger.js';
import { NotebookLayoutChangedEvent, } from './notebookViewEvents.js';
import { CellContextKeyManager } from './view/cellParts/cellContextKeys.js';
import { CellDragAndDropController } from './view/cellParts/cellDnd.js';
import { ListViewInfoAccessor, NotebookCellList, NOTEBOOK_WEBVIEW_BOUNDARY, } from './view/notebookCellList.js';
import { BackLayerWebView } from './view/renderers/backLayerWebView.js';
import { CodeCellRenderer, MarkupCellRenderer, NotebookCellListDelegate, } from './view/renderers/cellRenderer.js';
import { CodeCellViewModel, outputDisplayLimit } from './viewModel/codeCellViewModel.js';
import { NotebookEventDispatcher } from './viewModel/eventDispatcher.js';
import { MarkupCellViewModel } from './viewModel/markupCellViewModel.js';
import { NotebookViewModel } from './viewModel/notebookViewModelImpl.js';
import { ViewContext } from './viewModel/viewContext.js';
import { NotebookEditorWorkbenchToolbar } from './viewParts/notebookEditorToolbar.js';
import { NotebookEditorContextKeys } from './viewParts/notebookEditorWidgetContextKeys.js';
import { NotebookOverviewRuler } from './viewParts/notebookOverviewRuler.js';
import { ListTopCellToolbar } from './viewParts/notebookTopCellToolbar.js';
import { CellKind, NotebookFindScopeType, RENDERER_NOT_AVAILABLE, SelectionStateType, } from '../common/notebookCommon.js';
import { NOTEBOOK_CURSOR_NAVIGATION_MODE, NOTEBOOK_EDITOR_EDITABLE, NOTEBOOK_EDITOR_FOCUSED, NOTEBOOK_OUTPUT_FOCUSED, NOTEBOOK_OUTPUT_INPUT_FOCUSED, } from '../common/notebookContextKeys.js';
import { INotebookExecutionService } from '../common/notebookExecutionService.js';
import { INotebookKernelService } from '../common/notebookKernelService.js';
import { NotebookOptions, OutputInnerContainerTopPadding } from './notebookOptions.js';
import { cellRangesToIndexes } from '../common/notebookRange.js';
import { INotebookRendererMessagingService } from '../common/notebookRendererMessagingService.js';
import { INotebookService } from '../common/notebookService.js';
import { EditorExtensionsRegistry } from '../../../../editor/browser/editorExtensions.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { BaseCellEditorOptions } from './viewModel/cellEditorOptions.js';
import { FloatingEditorClickMenu } from '../../../browser/codeeditor.js';
import { CellFindMatchModel } from './contrib/find/findModel.js';
import { INotebookLoggingService } from '../common/notebookLoggingService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { NotebookStickyScroll } from './viewParts/notebookEditorStickyScroll.js';
import { PixelRatio } from '../../../../base/browser/pixelRatio.js';
import { PreventDefaultContextMenuItemsContextKeyName } from '../../webview/browser/webview.contribution.js';
import { NotebookAccessibilityProvider } from './notebookAccessibilityProvider.js';
import { NotebookHorizontalTracker } from './viewParts/notebookHorizontalTracker.js';
import { NotebookCellEditorPool } from './view/notebookCellEditorPool.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
const $ = DOM.$;
export function getDefaultNotebookCreationOptions() {
    // We inlined the id to avoid loading comment contrib in tests
    const skipContributions = [
        'editor.contrib.review',
        FloatingEditorClickMenu.ID,
        'editor.contrib.dirtydiff',
        'editor.contrib.testingOutputPeek',
        'editor.contrib.testingDecorations',
        'store.contrib.stickyScrollController',
        'editor.contrib.findController',
        'editor.contrib.emptyTextEditorHint',
    ];
    const contributions = EditorExtensionsRegistry.getEditorContributions().filter((c) => skipContributions.indexOf(c.id) === -1);
    return {
        menuIds: {
            notebookToolbar: MenuId.NotebookToolbar,
            cellTitleToolbar: MenuId.NotebookCellTitle,
            cellDeleteToolbar: MenuId.NotebookCellDelete,
            cellInsertToolbar: MenuId.NotebookCellBetween,
            cellTopInsertToolbar: MenuId.NotebookCellListTop,
            cellExecuteToolbar: MenuId.NotebookCellExecute,
            cellExecutePrimary: MenuId.NotebookCellExecutePrimary,
        },
        cellEditorContributions: contributions,
    };
}
let NotebookEditorWidget = class NotebookEditorWidget extends Disposable {
    get isVisible() {
        return this._isVisible;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    set viewModel(newModel) {
        this._onWillChangeModel.fire(this._notebookViewModel?.notebookDocument);
        this._notebookViewModel = newModel;
        this._onDidChangeModel.fire(newModel?.notebookDocument);
    }
    get viewModel() {
        return this._notebookViewModel;
    }
    get textModel() {
        return this._notebookViewModel?.notebookDocument;
    }
    get isReadOnly() {
        return this._notebookViewModel?.options.isReadOnly ?? false;
    }
    get activeCodeEditor() {
        if (this._isDisposed) {
            return;
        }
        const [focused] = this._list.getFocusedElements();
        return this._renderedEditors.get(focused);
    }
    get activeCellAndCodeEditor() {
        if (this._isDisposed) {
            return;
        }
        const [focused] = this._list.getFocusedElements();
        const editor = this._renderedEditors.get(focused);
        if (!editor) {
            return;
        }
        return [focused, editor];
    }
    get codeEditors() {
        return [...this._renderedEditors];
    }
    get visibleRanges() {
        return this._list ? this._list.visibleRanges || [] : [];
    }
    get notebookOptions() {
        return this._notebookOptions;
    }
    constructor(creationOptions, dimension, instantiationService, editorGroupsService, notebookRendererMessaging, notebookEditorService, notebookKernelService, _notebookService, configurationService, contextKeyService, layoutService, contextMenuService, telemetryService, notebookExecutionService, editorProgressService, logService) {
        super();
        this.creationOptions = creationOptions;
        this.notebookRendererMessaging = notebookRendererMessaging;
        this.notebookEditorService = notebookEditorService;
        this.notebookKernelService = notebookKernelService;
        this._notebookService = _notebookService;
        this.configurationService = configurationService;
        this.layoutService = layoutService;
        this.contextMenuService = contextMenuService;
        this.telemetryService = telemetryService;
        this.notebookExecutionService = notebookExecutionService;
        this.editorProgressService = editorProgressService;
        this.logService = logService;
        //#region Eventing
        this._onDidChangeCellState = this._register(new Emitter());
        this.onDidChangeCellState = this._onDidChangeCellState.event;
        this._onDidChangeViewCells = this._register(new Emitter());
        this.onDidChangeViewCells = this._onDidChangeViewCells.event;
        this._onWillChangeModel = this._register(new Emitter());
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter());
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidAttachViewModel = this._register(new Emitter());
        this.onDidAttachViewModel = this._onDidAttachViewModel.event;
        this._onDidChangeOptions = this._register(new Emitter());
        this.onDidChangeOptions = this._onDidChangeOptions.event;
        this._onDidChangeDecorations = this._register(new Emitter());
        this.onDidChangeDecorations = this._onDidChangeDecorations.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._onDidChangeActiveCell = this._register(new Emitter());
        this.onDidChangeActiveCell = this._onDidChangeActiveCell.event;
        this._onDidChangeFocus = this._register(new Emitter());
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._onDidChangeVisibleRanges = this._register(new Emitter());
        this.onDidChangeVisibleRanges = this._onDidChangeVisibleRanges.event;
        this._onDidFocusEmitter = this._register(new Emitter());
        this.onDidFocusWidget = this._onDidFocusEmitter.event;
        this._onDidBlurEmitter = this._register(new Emitter());
        this.onDidBlurWidget = this._onDidBlurEmitter.event;
        this._onDidChangeActiveEditor = this._register(new Emitter());
        this.onDidChangeActiveEditor = this._onDidChangeActiveEditor.event;
        this._onDidChangeActiveKernel = this._register(new Emitter());
        this.onDidChangeActiveKernel = this._onDidChangeActiveKernel.event;
        this._onMouseUp = this._register(new Emitter());
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new Emitter());
        this.onMouseDown = this._onMouseDown.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._onDidRenderOutput = this._register(new Emitter());
        this.onDidRenderOutput = this._onDidRenderOutput.event;
        this._onDidRemoveOutput = this._register(new Emitter());
        this.onDidRemoveOutput = this._onDidRemoveOutput.event;
        this._onDidResizeOutputEmitter = this._register(new Emitter());
        this.onDidResizeOutput = this._onDidResizeOutputEmitter.event;
        this._webview = null;
        this._webviewResolvePromise = null;
        this._webviewTransparentCover = null;
        this._listDelegate = null;
        this._dndController = null;
        this._listTopCellToolbar = null;
        this._renderedEditors = new Map();
        this._localStore = this._register(new DisposableStore());
        this._localCellStateListeners = [];
        this._shadowElementViewInfo = null;
        this._contributions = new Map();
        this._insetModifyQueueByOutputId = new SequencerByKey();
        this._cellContextKeyManager = null;
        this._uuid = generateUuid();
        this._webviewFocused = false;
        this._isVisible = false;
        this._isDisposed = false;
        this._baseCellEditorOptions = new Map();
        this._debugFlag = false;
        this._backgroundMarkdownRenderRunning = false;
        this._lastCellWithEditorFocus = null;
        //#endregion
        //#region Cell operations/layout API
        this._pendingLayouts = new WeakMap();
        this._layoutDisposables = new Set();
        this._pendingOutputHeightAcks = new Map();
        this._dimension = dimension;
        this.isReplHistory = creationOptions.isReplHistory ?? false;
        this._readOnly = creationOptions.isReadOnly ?? false;
        this._overlayContainer = document.createElement('div');
        this.scopedContextKeyService = this._register(contextKeyService.createScoped(this._overlayContainer));
        this.instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this._notebookOptions =
            creationOptions.options ??
                this.instantiationService.createInstance(NotebookOptions, this.creationOptions?.codeWindow ?? mainWindow, this._readOnly, undefined);
        this._register(this._notebookOptions);
        const eventDispatcher = this._register(new NotebookEventDispatcher());
        this._viewContext = new ViewContext(this._notebookOptions, eventDispatcher, (language) => this.getBaseCellEditorOptions(language));
        this._register(this._viewContext.eventDispatcher.onDidChangeLayout(() => {
            this._onDidChangeLayout.fire();
        }));
        this._register(this._viewContext.eventDispatcher.onDidChangeCellState((e) => {
            this._onDidChangeCellState.fire(e);
        }));
        this._register(_notebookService.onDidChangeOutputRenderers(() => {
            this._updateOutputRenderers();
        }));
        this._register(this.instantiationService.createInstance(NotebookEditorContextKeys, this));
        this._register(notebookKernelService.onDidChangeSelectedNotebooks((e) => {
            if (isEqual(e.notebook, this.viewModel?.uri)) {
                this._loadKernelPreloads();
                this._onDidChangeActiveKernel.fire();
            }
        }));
        this._scrollBeyondLastLine = this.configurationService.getValue('editor.scrollBeyondLastLine');
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.scrollBeyondLastLine')) {
                this._scrollBeyondLastLine = this.configurationService.getValue('editor.scrollBeyondLastLine');
                if (this._dimension && this._isVisible) {
                    this.layout(this._dimension);
                }
            }
        }));
        this._register(this._notebookOptions.onDidChangeOptions((e) => {
            if (e.cellStatusBarVisibility || e.cellToolbarLocation || e.cellToolbarInteraction) {
                this._updateForNotebookConfiguration();
            }
            if (e.fontFamily) {
                this._generateFontInfo();
            }
            if (e.compactView ||
                e.focusIndicator ||
                e.insertToolbarPosition ||
                e.cellToolbarLocation ||
                e.dragAndDropEnabled ||
                e.fontSize ||
                e.markupFontSize ||
                e.markdownLineHeight ||
                e.fontFamily ||
                e.insertToolbarAlignment ||
                e.outputFontSize ||
                e.outputLineHeight ||
                e.outputFontFamily ||
                e.outputWordWrap ||
                e.outputScrolling ||
                e.outputLinkifyFilePaths ||
                e.minimalError) {
                this._styleElement?.remove();
                this._createLayoutStyles();
                this._webview?.updateOptions({
                    ...this.notebookOptions.computeWebviewOptions(),
                    fontFamily: this._generateFontFamily(),
                });
            }
            if (this._dimension && this._isVisible) {
                this.layout(this._dimension);
            }
        }));
        const container = creationOptions.codeWindow
            ? this.layoutService.getContainer(creationOptions.codeWindow)
            : this.layoutService.mainContainer;
        this._register(editorGroupsService.getPart(container).onDidScroll((e) => {
            if (!this._shadowElement || !this._isVisible) {
                return;
            }
            this.updateShadowElement(this._shadowElement, this._dimension);
            this.layoutContainerOverShadowElement(this._dimension, this._position);
        }));
        this.notebookEditorService.addNotebookEditor(this);
        const id = generateUuid();
        this._overlayContainer.id = `notebook-${id}`;
        this._overlayContainer.className = 'notebookOverlay';
        this._overlayContainer.classList.add('notebook-editor');
        this._overlayContainer.inert = true;
        this._overlayContainer.style.visibility = 'hidden';
        container.appendChild(this._overlayContainer);
        this._createBody(this._overlayContainer);
        this._generateFontInfo();
        this._isVisible = true;
        this._editorFocus = NOTEBOOK_EDITOR_FOCUSED.bindTo(this.scopedContextKeyService);
        this._outputFocus = NOTEBOOK_OUTPUT_FOCUSED.bindTo(this.scopedContextKeyService);
        this._outputInputFocus = NOTEBOOK_OUTPUT_INPUT_FOCUSED.bindTo(this.scopedContextKeyService);
        this._editorEditable = NOTEBOOK_EDITOR_EDITABLE.bindTo(this.scopedContextKeyService);
        this._cursorNavMode = NOTEBOOK_CURSOR_NAVIGATION_MODE.bindTo(this.scopedContextKeyService);
        // Never display the native cut/copy context menu items in notebooks
        new RawContextKey(PreventDefaultContextMenuItemsContextKeyName, false)
            .bindTo(this.scopedContextKeyService)
            .set(true);
        this._editorEditable.set(!creationOptions.isReadOnly);
        let contributions;
        if (Array.isArray(this.creationOptions.contributions)) {
            contributions = this.creationOptions.contributions;
        }
        else {
            contributions = NotebookEditorExtensionsRegistry.getEditorContributions();
        }
        for (const desc of contributions) {
            let contribution;
            try {
                contribution = this.instantiationService.createInstance(desc.ctor, this);
            }
            catch (err) {
                onUnexpectedError(err);
            }
            if (contribution) {
                if (!this._contributions.has(desc.id)) {
                    this._contributions.set(desc.id, contribution);
                }
                else {
                    contribution.dispose();
                    throw new Error(`DUPLICATE notebook editor contribution: '${desc.id}'`);
                }
            }
        }
        this._updateForNotebookConfiguration();
    }
    _debug(...args) {
        if (!this._debugFlag) {
            return;
        }
        notebookDebug(...args);
    }
    /**
     * EditorId
     */
    getId() {
        return this._uuid;
    }
    getViewModel() {
        return this.viewModel;
    }
    getLength() {
        return this.viewModel?.length ?? 0;
    }
    getSelections() {
        return this.viewModel?.getSelections() ?? [];
    }
    setSelections(selections) {
        if (!this.viewModel) {
            return;
        }
        const focus = this.viewModel.getFocus();
        this.viewModel.updateSelectionsState({
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections,
        });
    }
    getFocus() {
        return this.viewModel?.getFocus() ?? { start: 0, end: 0 };
    }
    setFocus(focus) {
        if (!this.viewModel) {
            return;
        }
        const selections = this.viewModel.getSelections();
        this.viewModel.updateSelectionsState({
            kind: SelectionStateType.Index,
            focus: focus,
            selections: selections,
        });
    }
    getSelectionViewModels() {
        if (!this.viewModel) {
            return [];
        }
        const cellsSet = new Set();
        return this.viewModel
            .getSelections()
            .map((range) => this.viewModel.viewCells.slice(range.start, range.end))
            .reduce((a, b) => {
            b.forEach((cell) => {
                if (!cellsSet.has(cell.handle)) {
                    cellsSet.add(cell.handle);
                    a.push(cell);
                }
            });
            return a;
        }, []);
    }
    hasModel() {
        return !!this._notebookViewModel;
    }
    showProgress() {
        this._currentProgress = this.editorProgressService.show(true);
    }
    hideProgress() {
        if (this._currentProgress) {
            this._currentProgress.done();
            this._currentProgress = undefined;
        }
    }
    //#region Editor Core
    getBaseCellEditorOptions(language) {
        const existingOptions = this._baseCellEditorOptions.get(language);
        if (existingOptions) {
            return existingOptions;
        }
        else {
            const options = new BaseCellEditorOptions(this, this.notebookOptions, this.configurationService, language);
            this._baseCellEditorOptions.set(language, options);
            return options;
        }
    }
    _updateForNotebookConfiguration() {
        if (!this._overlayContainer) {
            return;
        }
        this._overlayContainer.classList.remove('cell-title-toolbar-left');
        this._overlayContainer.classList.remove('cell-title-toolbar-right');
        this._overlayContainer.classList.remove('cell-title-toolbar-hidden');
        const cellToolbarLocation = this._notebookOptions.computeCellToolbarLocation(this.viewModel?.viewType);
        this._overlayContainer.classList.add(`cell-title-toolbar-${cellToolbarLocation}`);
        const cellToolbarInteraction = this._notebookOptions.getDisplayOptions().cellToolbarInteraction;
        let cellToolbarInteractionState = 'hover';
        this._overlayContainer.classList.remove('cell-toolbar-hover');
        this._overlayContainer.classList.remove('cell-toolbar-click');
        if (cellToolbarInteraction === 'hover' || cellToolbarInteraction === 'click') {
            cellToolbarInteractionState = cellToolbarInteraction;
        }
        this._overlayContainer.classList.add(`cell-toolbar-${cellToolbarInteractionState}`);
    }
    _generateFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        const targetWindow = DOM.getWindow(this.getDomNode());
        this._fontInfo = FontMeasurements.readFontInfo(targetWindow, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(targetWindow).value));
    }
    _createBody(parent) {
        this._notebookTopToolbarContainer = document.createElement('div');
        this._notebookTopToolbarContainer.classList.add('notebook-toolbar-container');
        this._notebookTopToolbarContainer.style.display = 'none';
        DOM.append(parent, this._notebookTopToolbarContainer);
        this._notebookStickyScrollContainer = document.createElement('div');
        this._notebookStickyScrollContainer.classList.add('notebook-sticky-scroll-container');
        DOM.append(parent, this._notebookStickyScrollContainer);
        this._body = document.createElement('div');
        DOM.append(parent, this._body);
        this._body.classList.add('cell-list-container');
        this._createLayoutStyles();
        this._createCellList();
        this._notebookOverviewRulerContainer = document.createElement('div');
        this._notebookOverviewRulerContainer.classList.add('notebook-overview-ruler-container');
        this._list.scrollableElement.appendChild(this._notebookOverviewRulerContainer);
        this._registerNotebookOverviewRuler();
        this._register(this.instantiationService.createInstance(NotebookHorizontalTracker, this, this._list.scrollableElement));
        this._overflowContainer = document.createElement('div');
        this._overflowContainer.classList.add('notebook-overflow-widget-container', 'monaco-editor');
        DOM.append(parent, this._overflowContainer);
    }
    _generateFontFamily() {
        return (this._fontInfo?.fontFamily ??
            `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`);
    }
    _createLayoutStyles() {
        this._styleElement = domStylesheets.createStyleSheet(this._body);
        const { cellRightMargin, cellTopMargin, cellRunGutter, cellBottomMargin, codeCellLeftMargin, markdownCellGutter, markdownCellLeftMargin, markdownCellBottomMargin, markdownCellTopMargin, collapsedIndicatorHeight, focusIndicator, insertToolbarPosition, outputFontSize, focusIndicatorLeftMargin, focusIndicatorGap, } = this._notebookOptions.getLayoutConfiguration();
        const { insertToolbarAlignment, compactView, fontSize } = this._notebookOptions.getDisplayOptions();
        const getCellEditorContainerLeftMargin = this._notebookOptions.getCellEditorContainerLeftMargin();
        const { bottomToolbarGap, bottomToolbarHeight } = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
        const styleSheets = [];
        if (!this._fontInfo) {
            this._generateFontInfo();
        }
        const fontFamily = this._generateFontFamily();
        styleSheets.push(`
		.notebook-editor {
			--notebook-cell-output-font-size: ${outputFontSize}px;
			--notebook-cell-input-preview-font-size: ${fontSize}px;
			--notebook-cell-input-preview-font-family: ${fontFamily};
		}
		`);
        if (compactView) {
            styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row div.cell.code { margin-left: ${getCellEditorContainerLeftMargin}px; }`);
        }
        else {
            styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row div.cell.code { margin-left: ${codeCellLeftMargin}px; }`);
        }
        // focus indicator
        if (focusIndicator === 'border') {
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-top:before,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-bottom:before,
			.monaco-workbench .notebookOverlay .monaco-list .markdown-cell-row .cell-inner-container:before,
			.monaco-workbench .notebookOverlay .monaco-list .markdown-cell-row .cell-inner-container:after {
				content: "";
				position: absolute;
				width: 100%;
				height: 1px;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left:before,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-right:before {
				content: "";
				position: absolute;
				width: 1px;
				height: 100%;
				z-index: 10;
			}

			/* top border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-top:before {
				border-top: 1px solid transparent;
			}

			/* left border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left:before {
				border-left: 1px solid transparent;
			}

			/* bottom border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-bottom:before {
				border-bottom: 1px solid transparent;
			}

			/* right border */
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-right:before {
				border-right: 1px solid transparent;
			}
			`);
            // left and right border margins
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.code-cell-row.focused .cell-focus-indicator-left:before,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.code-cell-row.focused .cell-focus-indicator-right:before,
			.monaco-workbench .notebookOverlay .monaco-list.selection-multiple .monaco-list-row.code-cell-row.selected .cell-focus-indicator-left:before,
			.monaco-workbench .notebookOverlay .monaco-list.selection-multiple .monaco-list-row.code-cell-row.selected .cell-focus-indicator-right:before {
				top: -${cellTopMargin}px; height: calc(100% + ${cellTopMargin + cellBottomMargin}px)
			}`);
        }
        else {
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left .codeOutput-focus-indicator {
				border-left: 3px solid transparent;
				border-radius: 4px;
				width: 0px;
				margin-left: ${focusIndicatorLeftMargin}px;
				border-color: var(--vscode-notebook-inactiveFocusedCellBorder) !important;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.focused .cell-focus-indicator-left .codeOutput-focus-indicator-container,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-output-hover .cell-focus-indicator-left .codeOutput-focus-indicator-container,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .markdown-cell-hover .cell-focus-indicator-left .codeOutput-focus-indicator-container,
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row:hover .cell-focus-indicator-left .codeOutput-focus-indicator-container {
				display: block;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-left .codeOutput-focus-indicator-container:hover .codeOutput-focus-indicator {
				border-left: 5px solid transparent;
				margin-left: ${focusIndicatorLeftMargin - 1}px;
			}
			`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row.focused .cell-inner-container.cell-output-focus .cell-focus-indicator-left .codeOutput-focus-indicator,
			.monaco-workbench .notebookOverlay .monaco-list:focus-within .monaco-list-row.focused .cell-inner-container .cell-focus-indicator-left .codeOutput-focus-indicator {
				border-color: var(--vscode-notebook-focusedCellBorder) !important;
			}

			.monaco-workbench .notebookOverlay .monaco-list .monaco-list-row .cell-inner-container .cell-focus-indicator-left .output-focus-indicator {
				margin-top: ${focusIndicatorGap}px;
			}
			`);
        }
        // between cell insert toolbar
        if (insertToolbarPosition === 'betweenCells' || insertToolbarPosition === 'both') {
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container { display: flex; }`);
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .cell-list-top-cell-toolbar-container { display: flex; }`);
        }
        else {
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container { display: none; }`);
            styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .cell-list-top-cell-toolbar-container { display: none; }`);
        }
        if (insertToolbarAlignment === 'left') {
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .action-item:first-child,
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .action-item:first-child, .monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container .action-item:first-child {
				margin-right: 0px !important;
			}`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .monaco-toolbar .action-label,
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container .monaco-toolbar .action-label, .monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container .monaco-toolbar .action-label {
				padding: 0px !important;
				justify-content: center;
				border-radius: 4px;
			}`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container,
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container, .monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container {
				align-items: flex-start;
				justify-content: left;
				margin: 0 16px 0 ${8 + codeCellLeftMargin}px;
			}`);
            styleSheets.push(`
			.monaco-workbench .notebookOverlay .cell-list-top-cell-toolbar-container,
			.notebookOverlay .cell-bottom-toolbar-container .action-item {
				border: 0px;
			}`);
        }
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .code-cell-row div.cell.code { margin-left: ${getCellEditorContainerLeftMargin}px; }`);
        // Chat Edit, deleted Cell Overlay
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .code-cell-row div.cell.code { margin-left: ${getCellEditorContainerLeftMargin}px; }`);
        // Chat Edit, deleted Cell Overlay
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .code-cell-row div.cell { margin-right: ${cellRightMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row div.cell { margin-right: ${cellRightMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row > .cell-inner-container { padding-top: ${cellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row > .cell-inner-container { padding-bottom: ${markdownCellBottomMargin}px; padding-top: ${markdownCellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row > .cell-inner-container.webview-backed-markdown-cell { padding: 0; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .markdown-cell-row > .webview-backed-markdown-cell.markdown-cell-edit-mode .cell.code { padding-bottom: ${markdownCellBottomMargin}px; padding-top: ${markdownCellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .output { margin: 0px ${cellRightMargin}px 0px ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .output { width: calc(100% - ${getCellEditorContainerLeftMargin + cellRightMargin}px); }`);
        // comment
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-comment-container { left: ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-comment-container { width: calc(100% - ${getCellEditorContainerLeftMargin + cellRightMargin}px); }`);
        // output collapse button
        styleSheets.push(`.monaco-workbench .notebookOverlay .output .output-collapse-container .expandButton { left: -${cellRunGutter}px; }`);
        styleSheets.push(`.monaco-workbench .notebookOverlay .output .output-collapse-container .expandButton {
			position: absolute;
			width: ${cellRunGutter}px;
			padding: 6px 0px;
		}`);
        // show more container
        styleSheets.push(`.notebookOverlay .output-show-more-container { margin: 0px ${cellRightMargin}px 0px ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .output-show-more-container { width: calc(100% - ${getCellEditorContainerLeftMargin + cellRightMargin}px); }`);
        styleSheets.push(`.notebookOverlay .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row div.cell.markdown { padding-left: ${cellRunGutter}px; }`);
        styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container .notebook-folding-indicator { left: ${(markdownCellGutter - 20) / 2 + markdownCellLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay > .cell-list-container .notebook-folded-hint { left: ${markdownCellGutter + markdownCellLeftMargin + 8}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row :not(.webview-backed-markdown-cell) .cell-focus-indicator-top { height: ${cellTopMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-side { bottom: ${bottomToolbarGap}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row.code-cell-row .cell-focus-indicator-left { width: ${getCellEditorContainerLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row.markdown-cell-row .cell-focus-indicator-left { width: ${codeCellLeftMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator.cell-focus-indicator-right { width: ${cellRightMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-focus-indicator-bottom { height: ${cellBottomMargin}px; }`);
        styleSheets.push(`.notebookOverlay .monaco-list .monaco-list-row .cell-shadow-container-bottom { top: ${cellBottomMargin}px; }`);
        styleSheets.push(`
			.notebookOverlay .monaco-list.selection-multiple .monaco-list-row:has(+ .monaco-list-row.selected) .cell-focus-indicator-bottom {
				height: ${bottomToolbarGap + cellBottomMargin}px;
			}
		`);
        styleSheets.push(`
			.notebookOverlay .monaco-list .monaco-list-row.code-cell-row.nb-multiCellHighlight:has(+ .monaco-list-row.nb-multiCellHighlight) .cell-focus-indicator-bottom {
				height: ${bottomToolbarGap + cellBottomMargin}px;
				background-color: var(--vscode-notebook-symbolHighlightBackground) !important;
			}

			.notebookOverlay .monaco-list .monaco-list-row.markdown-cell-row.nb-multiCellHighlight:has(+ .monaco-list-row.nb-multiCellHighlight) .cell-focus-indicator-bottom {
				height: ${bottomToolbarGap + cellBottomMargin - 6}px;
				background-color: var(--vscode-notebook-symbolHighlightBackground) !important;
			}
		`);
        styleSheets.push(`
			.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .input-collapse-container .cell-collapse-preview {
				line-height: ${collapsedIndicatorHeight}px;
			}

			.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .input-collapse-container .cell-collapse-preview .monaco-tokenized-source {
				max-height: ${collapsedIndicatorHeight}px;
			}
		`);
        styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-bottom-toolbar-container .monaco-toolbar { height: ${bottomToolbarHeight}px }`);
        styleSheets.push(`.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .view-zones .cell-list-top-cell-toolbar-container .monaco-toolbar { height: ${bottomToolbarHeight}px }`);
        // cell toolbar
        styleSheets.push(`.monaco-workbench .notebookOverlay.cell-title-toolbar-right > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-title-toolbar {
			right: ${cellRightMargin + 26}px;
		}
		.monaco-workbench .notebookOverlay.cell-title-toolbar-left > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-title-toolbar {
			left: ${getCellEditorContainerLeftMargin + 16}px;
		}
		.monaco-workbench .notebookOverlay.cell-title-toolbar-hidden > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .cell-title-toolbar {
			display: none;
		}`);
        // cell output innert container
        styleSheets.push(`
		.monaco-workbench .notebookOverlay .output > div.foreground.output-inner-container {
			padding: ${OutputInnerContainerTopPadding}px 8px;
		}
		.monaco-workbench .notebookOverlay > .cell-list-container > .monaco-list > .monaco-scrollable-element > .monaco-list-rows > .monaco-list-row .output-collapse-container {
			padding: ${OutputInnerContainerTopPadding}px 8px;
		}
		`);
        // chat
        styleSheets.push(`
		.monaco-workbench .notebookOverlay .cell-chat-part {
			margin: 0 ${cellRightMargin}px 6px 4px;
		}
		`);
        this._styleElement.textContent = styleSheets.join('\n');
    }
    _createCellList() {
        this._body.classList.add('cell-list-container');
        this._dndController = this._register(new CellDragAndDropController(this, this._body));
        const getScopedContextKeyService = (container) => this._list.contextKeyService.createScoped(container);
        this._editorPool = this._register(this.instantiationService.createInstance(NotebookCellEditorPool, this, getScopedContextKeyService));
        const renderers = [
            this.instantiationService.createInstance(CodeCellRenderer, this, this._renderedEditors, this._editorPool, this._dndController, getScopedContextKeyService),
            this.instantiationService.createInstance(MarkupCellRenderer, this, this._dndController, this._renderedEditors, getScopedContextKeyService),
        ];
        renderers.forEach((renderer) => {
            this._register(renderer);
        });
        this._listDelegate = this.instantiationService.createInstance(NotebookCellListDelegate, DOM.getWindow(this.getDomNode()));
        this._register(this._listDelegate);
        const accessibilityProvider = this.instantiationService.createInstance(NotebookAccessibilityProvider, () => this.viewModel, this.isReplHistory);
        this._register(accessibilityProvider);
        this._list = this.instantiationService.createInstance(NotebookCellList, 'NotebookCellList', this._body, this._viewContext.notebookOptions, this._listDelegate, renderers, this.scopedContextKeyService, {
            setRowLineHeight: false,
            setRowHeight: false,
            supportDynamicHeights: true,
            horizontalScrolling: false,
            keyboardSupport: false,
            mouseSupport: true,
            multipleSelectionSupport: true,
            selectionNavigation: true,
            typeNavigationEnabled: true,
            paddingTop: 0,
            paddingBottom: 0,
            transformOptimization: false, //(isMacintosh && isNative) || getTitleBarStyle(this.configurationService, this.environmentService) === 'native',
            initialSize: this._dimension,
            styleController: (_suffix) => {
                return this._list;
            },
            overrideStyles: {
                listBackground: notebookEditorBackground,
                listActiveSelectionBackground: notebookEditorBackground,
                listActiveSelectionForeground: foreground,
                listFocusAndSelectionBackground: notebookEditorBackground,
                listFocusAndSelectionForeground: foreground,
                listFocusBackground: notebookEditorBackground,
                listFocusForeground: foreground,
                listHoverForeground: foreground,
                listHoverBackground: notebookEditorBackground,
                listHoverOutline: focusBorder,
                listFocusOutline: focusBorder,
                listInactiveSelectionBackground: notebookEditorBackground,
                listInactiveSelectionForeground: foreground,
                listInactiveFocusBackground: notebookEditorBackground,
                listInactiveFocusOutline: notebookEditorBackground,
            },
            accessibilityProvider,
        });
        this._dndController.setList(this._list);
        // create Webview
        this._register(this._list);
        this._listViewInfoAccessor = new ListViewInfoAccessor(this._list);
        this._register(this._listViewInfoAccessor);
        this._register(combinedDisposable(...renderers));
        // top cell toolbar
        this._listTopCellToolbar = this._register(this.instantiationService.createInstance(ListTopCellToolbar, this, this.notebookOptions));
        // transparent cover
        this._webviewTransparentCover = DOM.append(this._list.rowsContainer, $('.webview-cover'));
        this._webviewTransparentCover.style.display = 'none';
        this._register(DOM.addStandardDisposableGenericMouseDownListener(this._overlayContainer, (e) => {
            if (e.target.classList.contains('slider') && this._webviewTransparentCover) {
                this._webviewTransparentCover.style.display = 'block';
            }
        }));
        this._register(DOM.addStandardDisposableGenericMouseUpListener(this._overlayContainer, () => {
            if (this._webviewTransparentCover) {
                // no matter when
                this._webviewTransparentCover.style.display = 'none';
            }
        }));
        this._register(this._list.onMouseDown((e) => {
            if (e.element) {
                this._onMouseDown.fire({ event: e.browserEvent, target: e.element });
            }
        }));
        this._register(this._list.onMouseUp((e) => {
            if (e.element) {
                this._onMouseUp.fire({ event: e.browserEvent, target: e.element });
            }
        }));
        this._register(this._list.onDidChangeFocus((_e) => {
            this._onDidChangeActiveEditor.fire(this);
            this._onDidChangeActiveCell.fire();
            this._onDidChangeFocus.fire();
            this._cursorNavMode.set(false);
        }));
        this._register(this._list.onContextMenu((e) => {
            this.showListContextMenu(e);
        }));
        this._register(this._list.onDidChangeVisibleRanges(() => {
            this._onDidChangeVisibleRanges.fire();
        }));
        this._register(this._list.onDidScroll((e) => {
            if (e.scrollTop !== e.oldScrollTop) {
                this._onDidScroll.fire();
                this.clearActiveCellWidgets();
            }
            if (e.scrollTop === e.oldScrollTop && e.scrollHeightChanged) {
                this._onDidChangeLayout.fire();
            }
        }));
        this._focusTracker = this._register(DOM.trackFocus(this.getDomNode()));
        this._register(this._focusTracker.onDidBlur(() => {
            this._editorFocus.set(false);
            this.viewModel?.setEditorFocus(false);
            this._onDidBlurEmitter.fire();
        }));
        this._register(this._focusTracker.onDidFocus(() => {
            this._editorFocus.set(true);
            this.viewModel?.setEditorFocus(true);
            this._onDidFocusEmitter.fire();
        }));
        this._registerNotebookActionsToolbar();
        this._registerNotebookStickyScroll();
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(accessibilityProvider.verbositySettingId)) {
                this._list.ariaLabel = accessibilityProvider?.getWidgetAriaLabel();
            }
        }));
    }
    showListContextMenu(e) {
        this.contextMenuService.showContextMenu({
            menuId: MenuId.NotebookCellTitle,
            menuActionOptions: {
                shouldForwardArgs: true,
            },
            contextKeyService: this.scopedContextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => {
                return {
                    from: 'cellContainer',
                };
            },
        });
    }
    _registerNotebookOverviewRuler() {
        this._notebookOverviewRuler = this._register(this.instantiationService.createInstance(NotebookOverviewRuler, this, this._notebookOverviewRulerContainer));
    }
    _registerNotebookActionsToolbar() {
        this._notebookTopToolbar = this._register(this.instantiationService.createInstance(NotebookEditorWorkbenchToolbar, this, this.scopedContextKeyService, this._notebookOptions, this._notebookTopToolbarContainer));
        this._register(this._notebookTopToolbar.onDidChangeVisibility(() => {
            if (this._dimension && this._isVisible) {
                this.layout(this._dimension);
            }
        }));
    }
    _registerNotebookStickyScroll() {
        this._notebookStickyScroll = this._register(this.instantiationService.createInstance(NotebookStickyScroll, this._notebookStickyScrollContainer, this, this._list, (sizeDelta) => {
            if (this.isDisposed) {
                return;
            }
            if (this._dimension && this._isVisible) {
                if (sizeDelta > 0) {
                    // delta > 0 ==> sticky is growing, cell list shrinking
                    this.layout(this._dimension);
                    this.setScrollTop(this.scrollTop + sizeDelta);
                }
                else if (sizeDelta < 0) {
                    // delta < 0 ==> sticky is shrinking, cell list growing
                    this.setScrollTop(this.scrollTop + sizeDelta);
                    this.layout(this._dimension);
                }
            }
            this._onDidScroll.fire();
        }));
    }
    _updateOutputRenderers() {
        if (!this.viewModel || !this._webview) {
            return;
        }
        this._webview.updateOutputRenderers();
        this.viewModel.viewCells.forEach((cell) => {
            cell.outputsViewModels.forEach((output) => {
                if (output.pickedMimeType?.rendererId === RENDERER_NOT_AVAILABLE) {
                    output.resetRenderer();
                }
            });
        });
    }
    getDomNode() {
        return this._overlayContainer;
    }
    getOverflowContainerDomNode() {
        return this._overflowContainer;
    }
    getInnerWebview() {
        return this._webview?.webview;
    }
    setEditorProgressService(editorProgressService) {
        this.editorProgressService = editorProgressService;
    }
    setParentContextKeyService(parentContextKeyService) {
        this.scopedContextKeyService.updateParent(parentContextKeyService);
    }
    async setModel(textModel, viewState, perf, viewType) {
        if (this.viewModel === undefined || !this.viewModel.equal(textModel)) {
            const oldBottomToolbarDimensions = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
            this._detachModel();
            await this._attachModel(textModel, viewType ?? textModel.viewType, viewState, perf);
            const newBottomToolbarDimensions = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
            if (oldBottomToolbarDimensions.bottomToolbarGap !==
                newBottomToolbarDimensions.bottomToolbarGap ||
                oldBottomToolbarDimensions.bottomToolbarHeight !==
                    newBottomToolbarDimensions.bottomToolbarHeight) {
                this._styleElement?.remove();
                this._createLayoutStyles();
                this._webview?.updateOptions({
                    ...this.notebookOptions.computeWebviewOptions(),
                    fontFamily: this._generateFontFamily(),
                });
            }
            this.telemetryService.publicLog2('notebook/editorOpened', {
                scheme: textModel.uri.scheme,
                ext: extname(textModel.uri),
                viewType: textModel.viewType,
                isRepl: this.isReplHistory,
            });
        }
        else {
            this.restoreListViewState(viewState);
        }
        this._restoreSelectedKernel(viewState);
        // load preloads for matching kernel
        this._loadKernelPreloads();
        // clear state
        this._dndController?.clearGlobalDragState();
        this._localStore.add(this._list.onDidChangeFocus(() => {
            this.updateContextKeysOnFocusChange();
        }));
        this.updateContextKeysOnFocusChange();
        // render markdown top down on idle
        this._backgroundMarkdownRendering();
    }
    _backgroundMarkdownRendering() {
        if (this._backgroundMarkdownRenderRunning) {
            return;
        }
        this._backgroundMarkdownRenderRunning = true;
        DOM.runWhenWindowIdle(DOM.getWindow(this.getDomNode()), (deadline) => {
            this._backgroundMarkdownRenderingWithDeadline(deadline);
        });
    }
    _backgroundMarkdownRenderingWithDeadline(deadline) {
        const endTime = Date.now() + deadline.timeRemaining();
        const execute = () => {
            try {
                this._backgroundMarkdownRenderRunning = true;
                if (this._isDisposed) {
                    return;
                }
                if (!this.viewModel) {
                    return;
                }
                const firstMarkupCell = this.viewModel.viewCells.find((cell) => cell.cellKind === CellKind.Markup &&
                    !this._webview?.markupPreviewMapping.has(cell.id) &&
                    !this.cellIsHidden(cell));
                if (!firstMarkupCell) {
                    return;
                }
                this.createMarkupPreview(firstMarkupCell);
            }
            finally {
                this._backgroundMarkdownRenderRunning = false;
            }
            if (Date.now() < endTime) {
                setTimeout0(execute);
            }
            else {
                this._backgroundMarkdownRendering();
            }
        };
        execute();
    }
    updateContextKeysOnFocusChange() {
        if (!this.viewModel) {
            return;
        }
        const focused = this._list.getFocusedElements()[0];
        if (focused) {
            if (!this._cellContextKeyManager) {
                this._cellContextKeyManager = this._localStore.add(this.instantiationService.createInstance(CellContextKeyManager, this, focused));
            }
            this._cellContextKeyManager.updateForElement(focused);
        }
    }
    async setOptions(options) {
        if (options?.isReadOnly !== undefined) {
            this._readOnly = options?.isReadOnly;
        }
        if (!this.viewModel) {
            return;
        }
        this.viewModel.updateOptions({ isReadOnly: this._readOnly });
        this.notebookOptions.updateOptions(this._readOnly);
        // reveal cell if editor options tell to do so
        const cellOptions = options?.cellOptions ?? this._parseIndexedCellOptions(options);
        if (cellOptions) {
            const cell = this.viewModel.viewCells.find((cell) => cell.uri.toString() === cellOptions.resource.toString());
            if (cell) {
                this.focusElement(cell);
                const selection = cellOptions.options?.selection;
                if (selection) {
                    cell.updateEditState(CellEditState.Editing, 'setOptions');
                    cell.focusMode = CellFocusMode.Editor;
                    await this.revealRangeInCenterIfOutsideViewportAsync(cell, new Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber || selection.startLineNumber, selection.endColumn || selection.startColumn));
                }
                else {
                    this._list.revealCell(cell, options?.cellRevealType ?? 4 /* CellRevealType.CenterIfOutsideViewport */);
                }
                const editor = this._renderedEditors.get(cell);
                if (editor) {
                    if (cellOptions.options?.selection) {
                        const { selection } = cellOptions.options;
                        const editorSelection = new Range(selection.startLineNumber, selection.startColumn, selection.endLineNumber || selection.startLineNumber, selection.endColumn || selection.startColumn);
                        editor.setSelection(editorSelection);
                        editor.revealPositionInCenterIfOutsideViewport({
                            lineNumber: selection.startLineNumber,
                            column: selection.startColumn,
                        });
                        await this.revealRangeInCenterIfOutsideViewportAsync(cell, editorSelection);
                    }
                    if (!cellOptions.options?.preserveFocus) {
                        editor.focus();
                    }
                }
            }
        }
        // select cells if options tell to do so
        // todo@rebornix https://github.com/microsoft/vscode/issues/118108 support selections not just focus
        // todo@rebornix support multipe selections
        if (options?.cellSelections) {
            const focusCellIndex = options.cellSelections[0].start;
            const focusedCell = this.viewModel.cellAt(focusCellIndex);
            if (focusedCell) {
                this.viewModel.updateSelectionsState({
                    kind: SelectionStateType.Index,
                    focus: { start: focusCellIndex, end: focusCellIndex + 1 },
                    selections: options.cellSelections,
                });
                this.revealInCenterIfOutsideViewport(focusedCell);
            }
        }
        this._updateForOptions();
        this._onDidChangeOptions.fire();
    }
    _parseIndexedCellOptions(options) {
        if (options?.indexedCellOptions) {
            // convert index based selections
            const cell = this.cellAt(options.indexedCellOptions.index);
            if (cell) {
                return {
                    resource: cell.uri,
                    options: {
                        selection: options.indexedCellOptions.selection,
                        preserveFocus: false,
                    },
                };
            }
        }
        return undefined;
    }
    _detachModel() {
        this._localStore.clear();
        dispose(this._localCellStateListeners);
        this._list.detachViewModel();
        this.viewModel?.dispose();
        // avoid event
        this.viewModel = undefined;
        this._webview?.dispose();
        this._webview?.element.remove();
        this._webview = null;
        this._list.clear();
    }
    _updateForOptions() {
        if (!this.viewModel) {
            return;
        }
        this._editorEditable.set(!this.viewModel.options.isReadOnly);
        this._overflowContainer.classList.toggle('notebook-editor-editable', !this.viewModel.options.isReadOnly);
        this.getDomNode().classList.toggle('notebook-editor-editable', !this.viewModel.options.isReadOnly);
    }
    async _resolveWebview() {
        if (!this.textModel) {
            return null;
        }
        if (this._webviewResolvePromise) {
            return this._webviewResolvePromise;
        }
        if (!this._webview) {
            this._ensureWebview(this.getId(), this.textModel.viewType, this.textModel.uri);
        }
        this._webviewResolvePromise = (async () => {
            if (!this._webview) {
                throw new Error('Notebook output webview object is not created successfully.');
            }
            await this._webview.createWebview(this.creationOptions.codeWindow ?? mainWindow);
            if (!this._webview.webview) {
                throw new Error('Notebook output webview element was not created successfully.');
            }
            this._localStore.add(this._webview.webview.onDidBlur(() => {
                this._outputFocus.set(false);
                this._webviewFocused = false;
                this.updateEditorFocus();
                this.updateCellFocusMode();
            }));
            this._localStore.add(this._webview.webview.onDidFocus(() => {
                this._outputFocus.set(true);
                this.updateEditorFocus();
                this._webviewFocused = true;
            }));
            this._localStore.add(this._webview.onMessage((e) => {
                this._onDidReceiveMessage.fire(e);
            }));
            return this._webview;
        })();
        return this._webviewResolvePromise;
    }
    _ensureWebview(id, viewType, resource) {
        if (this._webview) {
            return;
        }
        const that = this;
        this._webview = this.instantiationService.createInstance(BackLayerWebView, {
            get creationOptions() {
                return that.creationOptions;
            },
            setScrollTop(scrollTop) {
                that._list.scrollTop = scrollTop;
            },
            triggerScroll(event) {
                that._list.triggerScrollFromMouseWheelEvent(event);
            },
            getCellByInfo: that.getCellByInfo.bind(that),
            getCellById: that._getCellById.bind(that),
            toggleNotebookCellSelection: that._toggleNotebookCellSelection.bind(that),
            focusNotebookCell: that.focusNotebookCell.bind(that),
            focusNextNotebookCell: that.focusNextNotebookCell.bind(that),
            updateOutputHeight: that._updateOutputHeight.bind(that),
            scheduleOutputHeightAck: that._scheduleOutputHeightAck.bind(that),
            updateMarkupCellHeight: that._updateMarkupCellHeight.bind(that),
            setMarkupCellEditState: that._setMarkupCellEditState.bind(that),
            didStartDragMarkupCell: that._didStartDragMarkupCell.bind(that),
            didDragMarkupCell: that._didDragMarkupCell.bind(that),
            didDropMarkupCell: that._didDropMarkupCell.bind(that),
            didEndDragMarkupCell: that._didEndDragMarkupCell.bind(that),
            didResizeOutput: that._didResizeOutput.bind(that),
            updatePerformanceMetadata: that._updatePerformanceMetadata.bind(that),
            didFocusOutputInputChange: that._didFocusOutputInputChange.bind(that),
        }, id, viewType, resource, {
            ...this._notebookOptions.computeWebviewOptions(),
            fontFamily: this._generateFontFamily(),
        }, this.notebookRendererMessaging.getScoped(this._uuid));
        this._webview.element.style.width = '100%';
        // attach the webview container to the DOM tree first
        this._list.attachWebview(this._webview.element);
    }
    async _attachModel(textModel, viewType, viewState, perf) {
        this._ensureWebview(this.getId(), textModel.viewType, textModel.uri);
        this.viewModel = this.instantiationService.createInstance(NotebookViewModel, viewType, textModel, this._viewContext, this.getLayoutInfo(), { isReadOnly: this._readOnly });
        this._viewContext.eventDispatcher.emit([
            new NotebookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo()),
        ]);
        this.notebookOptions.updateOptions(this._readOnly);
        this._updateForOptions();
        this._updateForNotebookConfiguration();
        // restore view states, including contributions
        {
            // restore view state
            this.viewModel.restoreEditorViewState(viewState);
            // contribution state restore
            const contributionsState = viewState?.contributionsState || {};
            for (const [id, contribution] of this._contributions) {
                if (typeof contribution.restoreViewState === 'function') {
                    contribution.restoreViewState(contributionsState[id]);
                }
            }
        }
        this._localStore.add(this.viewModel.onDidChangeViewCells((e) => {
            this._onDidChangeViewCells.fire(e);
        }));
        this._localStore.add(this.viewModel.onDidChangeSelection(() => {
            this._onDidChangeSelection.fire();
            this.updateSelectedMarkdownPreviews();
        }));
        this._localStore.add(this._list.onWillScroll((e) => {
            if (this._webview?.isResolved()) {
                this._webviewTransparentCover.style.transform = `translateY(${e.scrollTop})`;
            }
        }));
        let hasPendingChangeContentHeight = false;
        this._localStore.add(this._list.onDidChangeContentHeight(() => {
            if (hasPendingChangeContentHeight) {
                return;
            }
            hasPendingChangeContentHeight = true;
            this._localStore.add(DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), () => {
                hasPendingChangeContentHeight = false;
                this._updateScrollHeight();
            }, 100));
        }));
        this._localStore.add(this._list.onDidRemoveOutputs((outputs) => {
            outputs.forEach((output) => this.removeInset(output));
        }));
        this._localStore.add(this._list.onDidHideOutputs((outputs) => {
            outputs.forEach((output) => this.hideInset(output));
        }));
        this._localStore.add(this._list.onDidRemoveCellsFromView((cells) => {
            const hiddenCells = [];
            const deletedCells = [];
            for (const cell of cells) {
                if (cell.cellKind === CellKind.Markup) {
                    const mdCell = cell;
                    if (this.viewModel?.viewCells.find((cell) => cell.handle === mdCell.handle)) {
                        // Cell has been folded but is still in model
                        hiddenCells.push(mdCell);
                    }
                    else {
                        // Cell was deleted
                        deletedCells.push(mdCell);
                    }
                }
            }
            this.hideMarkupPreviews(hiddenCells);
            this.deleteMarkupPreviews(deletedCells);
        }));
        // init rendering
        await this._warmupWithMarkdownRenderer(this.viewModel, viewState, perf);
        perf?.mark('customMarkdownLoaded');
        // model attached
        this._localCellStateListeners = this.viewModel.viewCells.map((cell) => this._bindCellListener(cell));
        this._lastCellWithEditorFocus =
            this.viewModel.viewCells.find((viewCell) => this.getActiveCell() === viewCell && viewCell.focusMode === CellFocusMode.Editor) ?? null;
        this._localStore.add(this.viewModel.onDidChangeViewCells((e) => {
            if (this._isDisposed) {
                return;
            }
            // update cell listener
            ;
            [...e.splices].reverse().forEach((splice) => {
                const [start, deleted, newCells] = splice;
                const deletedCells = this._localCellStateListeners.splice(start, deleted, ...newCells.map((cell) => this._bindCellListener(cell)));
                dispose(deletedCells);
            });
            if (e.splices.some((s) => s[2].some((cell) => cell.cellKind === CellKind.Markup))) {
                this._backgroundMarkdownRendering();
            }
        }));
        if (this._dimension) {
            this._list.layout(this.getBodyHeight(this._dimension.height), this._dimension.width);
        }
        else {
            this._list.layout();
        }
        this._dndController?.clearGlobalDragState();
        // restore list state at last, it must be after list layout
        this.restoreListViewState(viewState);
    }
    _bindCellListener(cell) {
        const store = new DisposableStore();
        store.add(cell.onDidChangeLayout((e) => {
            // e.totalHeight will be false it's not changed
            if (e.totalHeight || e.outerWidth) {
                this.layoutNotebookCell(cell, cell.layoutInfo.totalHeight, e.context);
            }
        }));
        if (cell.cellKind === CellKind.Code) {
            store.add(cell.onDidRemoveOutputs((outputs) => {
                outputs.forEach((output) => this.removeInset(output));
            }));
        }
        store.add(cell.onDidChangeState((e) => {
            if (e.inputCollapsedChanged && cell.isInputCollapsed && cell.cellKind === CellKind.Markup) {
                this.hideMarkupPreviews([cell]);
            }
            if (e.outputCollapsedChanged && cell.isOutputCollapsed && cell.cellKind === CellKind.Code) {
                cell.outputsViewModels.forEach((output) => this.hideInset(output));
            }
            if (e.focusModeChanged) {
                this._validateCellFocusMode(cell);
            }
        }));
        store.add(cell.onCellDecorationsChanged((e) => {
            e.added.forEach((options) => {
                if (options.className) {
                    this.deltaCellContainerClassNames(cell.id, [options.className], [], cell.cellKind);
                }
                if (options.outputClassName) {
                    this.deltaCellContainerClassNames(cell.id, [options.outputClassName], [], cell.cellKind);
                }
            });
            e.removed.forEach((options) => {
                if (options.className) {
                    this.deltaCellContainerClassNames(cell.id, [], [options.className], cell.cellKind);
                }
                if (options.outputClassName) {
                    this.deltaCellContainerClassNames(cell.id, [], [options.outputClassName], cell.cellKind);
                }
            });
        }));
        return store;
    }
    _validateCellFocusMode(cell) {
        if (cell.focusMode !== CellFocusMode.Editor) {
            return;
        }
        if (this._lastCellWithEditorFocus && this._lastCellWithEditorFocus !== cell) {
            this._lastCellWithEditorFocus.focusMode = CellFocusMode.Container;
        }
        this._lastCellWithEditorFocus = cell;
    }
    async _warmupWithMarkdownRenderer(viewModel, viewState, perf) {
        this.logService.debug('NotebookEditorWidget', 'warmup ' + this.viewModel?.uri.toString());
        await this._resolveWebview();
        perf?.mark('webviewCommLoaded');
        this.logService.debug('NotebookEditorWidget', 'warmup - webview resolved');
        // make sure that the webview is not visible otherwise users will see pre-rendered markdown cells in wrong position as the list view doesn't have a correct `top` offset yet
        this._webview.element.style.visibility = 'hidden';
        // warm up can take around 200ms to load markdown libraries, etc.
        await this._warmupViewportMarkdownCells(viewModel, viewState);
        this.logService.debug('NotebookEditorWidget', 'warmup - viewport warmed up');
        // todo@rebornix @mjbvz, is this too complicated?
        /* now the webview is ready, and requests to render markdown are fast enough
         * we can start rendering the list view
         * render
         *   - markdown cell -> request to webview to (10ms, basically just latency between UI and iframe)
         *   - code cell -> render in place
         */
        this._list.layout(0, 0);
        this._list.attachViewModel(viewModel);
        // now the list widget has a correct contentHeight/scrollHeight
        // setting scrollTop will work properly
        // after setting scroll top, the list view will update `top` of the scrollable element, e.g. `top: -584px`
        this._list.scrollTop = viewState?.scrollPosition?.top ?? 0;
        this._debug('finish initial viewport warmup and view state restore.');
        this._webview.element.style.visibility = 'visible';
        this.logService.debug('NotebookEditorWidget', 'warmup - list view model attached, set to visible');
        this._onDidAttachViewModel.fire();
    }
    async _warmupViewportMarkdownCells(viewModel, viewState) {
        if (viewState && viewState.cellTotalHeights) {
            const totalHeightCache = viewState.cellTotalHeights;
            const scrollTop = viewState.scrollPosition?.top ?? 0;
            const scrollBottom = scrollTop + Math.max(this._dimension?.height ?? 0, 1080);
            let offset = 0;
            const requests = [];
            for (let i = 0; i < viewModel.length; i++) {
                const cell = viewModel.cellAt(i);
                const cellHeight = totalHeightCache[i] ?? 0;
                if (offset + cellHeight < scrollTop) {
                    offset += cellHeight;
                    continue;
                }
                if (cell.cellKind === CellKind.Markup) {
                    requests.push([cell, offset]);
                }
                offset += cellHeight;
                if (offset > scrollBottom) {
                    break;
                }
            }
            await this._webview.initializeMarkup(requests.map(([model, offset]) => this.createMarkupCellInitialization(model, offset)));
        }
        else {
            const initRequests = viewModel.viewCells
                .filter((cell) => cell.cellKind === CellKind.Markup)
                .slice(0, 5)
                .map((cell) => this.createMarkupCellInitialization(cell, -10000));
            await this._webview.initializeMarkup(initRequests);
            // no cached view state so we are rendering the first viewport
            // after above async call, we already get init height for markdown cells, we can update their offset
            let offset = 0;
            const offsetUpdateRequests = [];
            const scrollBottom = Math.max(this._dimension?.height ?? 0, 1080);
            for (const cell of viewModel.viewCells) {
                if (cell.cellKind === CellKind.Markup) {
                    offsetUpdateRequests.push({ id: cell.id, top: offset });
                }
                offset += cell.getHeight(this.getLayoutInfo().fontInfo.lineHeight);
                if (offset > scrollBottom) {
                    break;
                }
            }
            this._webview?.updateScrollTops([], offsetUpdateRequests);
        }
    }
    createMarkupCellInitialization(model, offset) {
        return {
            mime: model.mime,
            cellId: model.id,
            cellHandle: model.handle,
            content: model.getText(),
            offset: offset,
            visible: false,
            metadata: model.metadata,
        };
    }
    restoreListViewState(viewState) {
        if (!this.viewModel) {
            return;
        }
        if (viewState?.scrollPosition !== undefined) {
            this._list.scrollTop = viewState.scrollPosition.top;
            this._list.scrollLeft = viewState.scrollPosition.left;
        }
        else {
            this._list.scrollTop = 0;
            this._list.scrollLeft = 0;
        }
        const focusIdx = typeof viewState?.focus === 'number' ? viewState.focus : 0;
        if (focusIdx < this.viewModel.length) {
            const element = this.viewModel.cellAt(focusIdx);
            if (element) {
                this.viewModel?.updateSelectionsState({
                    kind: SelectionStateType.Handle,
                    primary: element.handle,
                    selections: [element.handle],
                });
            }
        }
        else if (this._list.length > 0) {
            this.viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }],
            });
        }
        if (viewState?.editorFocused) {
            const cell = this.viewModel.cellAt(focusIdx);
            if (cell) {
                cell.focusMode = CellFocusMode.Editor;
            }
        }
    }
    _restoreSelectedKernel(viewState) {
        if (viewState?.selectedKernelId && this.textModel) {
            const matching = this.notebookKernelService.getMatchingKernel(this.textModel);
            const kernel = matching.all.find((k) => k.id === viewState.selectedKernelId);
            // Selected kernel may have already been picked prior to the view state loading
            // If so, don't overwrite it with the saved kernel.
            if (kernel && !matching.selected) {
                this.notebookKernelService.selectKernelForNotebook(kernel, this.textModel);
            }
        }
    }
    getEditorViewState() {
        const state = this.viewModel?.getEditorViewState();
        if (!state) {
            return {
                editingCells: {},
                cellLineNumberStates: {},
                editorViewStates: {},
                collapsedInputCells: {},
                collapsedOutputCells: {},
            };
        }
        if (this._list) {
            state.scrollPosition = { left: this._list.scrollLeft, top: this._list.scrollTop };
            const cellHeights = {};
            for (let i = 0; i < this.viewModel.length; i++) {
                const elm = this.viewModel.cellAt(i);
                cellHeights[i] = elm.layoutInfo.totalHeight;
            }
            state.cellTotalHeights = cellHeights;
            if (this.viewModel) {
                const focusRange = this.viewModel.getFocus();
                const element = this.viewModel.cellAt(focusRange.start);
                if (element) {
                    const itemDOM = this._list.domElementOfElement(element);
                    const editorFocused = element.getEditState() === CellEditState.Editing &&
                        !!(itemDOM &&
                            itemDOM.ownerDocument.activeElement &&
                            itemDOM.contains(itemDOM.ownerDocument.activeElement));
                    state.editorFocused = editorFocused;
                    state.focus = focusRange.start;
                }
            }
        }
        // Save contribution view states
        const contributionsState = {};
        for (const [id, contribution] of this._contributions) {
            if (typeof contribution.saveViewState === 'function') {
                contributionsState[id] = contribution.saveViewState();
            }
        }
        state.contributionsState = contributionsState;
        if (this.textModel?.uri.scheme === Schemas.untitled) {
            state.selectedKernelId = this.activeKernel?.id;
        }
        return state;
    }
    _allowScrollBeyondLastLine() {
        return this._scrollBeyondLastLine && !this.isReplHistory;
    }
    getBodyHeight(dimensionHeight) {
        return Math.max(dimensionHeight - (this._notebookTopToolbar?.useGlobalToolbar ? /** Toolbar height */ 26 : 0), 0);
    }
    layout(dimension, shadowElement, position) {
        if (!shadowElement && this._shadowElementViewInfo === null) {
            this._dimension = dimension;
            this._position = position;
            return;
        }
        if (dimension.width <= 0 || dimension.height <= 0) {
            this.onWillHide();
            return;
        }
        const whenContainerStylesLoaded = this.layoutService.whenContainerStylesLoaded(DOM.getWindow(this.getDomNode()));
        if (whenContainerStylesLoaded) {
            // In floating windows, we need to ensure that the
            // container is ready for us to compute certain
            // layout related properties.
            whenContainerStylesLoaded.then(() => this.layoutNotebook(dimension, shadowElement, position));
        }
        else {
            this.layoutNotebook(dimension, shadowElement, position);
        }
    }
    layoutNotebook(dimension, shadowElement, position) {
        if (shadowElement) {
            this.updateShadowElement(shadowElement, dimension, position);
        }
        if (this._shadowElementViewInfo &&
            this._shadowElementViewInfo.width <= 0 &&
            this._shadowElementViewInfo.height <= 0) {
            this.onWillHide();
            return;
        }
        this._dimension = dimension;
        this._position = position;
        const newBodyHeight = this.getBodyHeight(dimension.height) - this.getLayoutInfo().stickyHeight;
        DOM.size(this._body, dimension.width, newBodyHeight);
        const newCellListHeight = newBodyHeight;
        if (this._list.getRenderHeight() < newCellListHeight) {
            // the new dimension is larger than the list viewport, update its additional height first, otherwise the list view will move down a bit (as the `scrollBottom` will move down)
            this._list.updateOptions({
                paddingBottom: this._allowScrollBeyondLastLine() ? Math.max(0, newCellListHeight - 50) : 0,
                paddingTop: 0,
            });
            this._list.layout(newCellListHeight, dimension.width);
        }
        else {
            // the new dimension is smaller than the list viewport, if we update the additional height, the `scrollBottom` will move up, which moves the whole list view upwards a bit. So we run a layout first.
            this._list.layout(newCellListHeight, dimension.width);
            this._list.updateOptions({
                paddingBottom: this._allowScrollBeyondLastLine() ? Math.max(0, newCellListHeight - 50) : 0,
                paddingTop: 0,
            });
        }
        this._overlayContainer.inert = false;
        this._overlayContainer.style.visibility = 'visible';
        this._overlayContainer.style.display = 'block';
        this._overlayContainer.style.position = 'absolute';
        this._overlayContainer.style.overflow = 'hidden';
        this.layoutContainerOverShadowElement(dimension, position);
        if (this._webviewTransparentCover) {
            this._webviewTransparentCover.style.height = `${dimension.height}px`;
            this._webviewTransparentCover.style.width = `${dimension.width}px`;
        }
        this._notebookTopToolbar.layout(this._dimension);
        this._notebookOverviewRuler.layout();
        this._viewContext?.eventDispatcher.emit([
            new NotebookLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo()),
        ]);
    }
    updateShadowElement(shadowElement, dimension, position) {
        this._shadowElement = shadowElement;
        if (dimension && position) {
            this._shadowElementViewInfo = {
                height: dimension.height,
                width: dimension.width,
                top: position.top,
                left: position.left,
            };
        }
        else {
            // We have to recompute position and size ourselves (which is slow)
            const containerRect = shadowElement.getBoundingClientRect();
            this._shadowElementViewInfo = {
                height: containerRect.height,
                width: containerRect.width,
                top: containerRect.top,
                left: containerRect.left,
            };
        }
    }
    layoutContainerOverShadowElement(dimension, position) {
        if (dimension && position) {
            this._overlayContainer.style.top = `${position.top}px`;
            this._overlayContainer.style.left = `${position.left}px`;
            this._overlayContainer.style.width = `${dimension.width}px`;
            this._overlayContainer.style.height = `${dimension.height}px`;
            return;
        }
        if (!this._shadowElementViewInfo) {
            return;
        }
        const elementContainerRect = this._overlayContainer.parentElement?.getBoundingClientRect();
        this._overlayContainer.style.top = `${this._shadowElementViewInfo.top - (elementContainerRect?.top || 0)}px`;
        this._overlayContainer.style.left = `${this._shadowElementViewInfo.left - (elementContainerRect?.left || 0)}px`;
        this._overlayContainer.style.width = `${dimension ? dimension.width : this._shadowElementViewInfo.width}px`;
        this._overlayContainer.style.height = `${dimension ? dimension.height : this._shadowElementViewInfo.height}px`;
    }
    //#endregion
    //#region Focus tracker
    focus() {
        this._isVisible = true;
        this._editorFocus.set(true);
        if (this._webviewFocused) {
            this._webview?.focusWebview();
        }
        else {
            if (this.viewModel) {
                const focusRange = this.viewModel.getFocus();
                const element = this.viewModel.cellAt(focusRange.start);
                // The notebook editor doesn't have focus yet
                if (!this.hasEditorFocus()) {
                    this.focusContainer();
                    // trigger editor to update as FocusTracker might not emit focus change event
                    this.updateEditorFocus();
                }
                if (element && element.focusMode === CellFocusMode.Editor) {
                    element.updateEditState(CellEditState.Editing, 'editorWidget.focus');
                    element.focusMode = CellFocusMode.Editor;
                    this.focusEditor(element);
                    return;
                }
            }
            this._list.domFocus();
        }
        if (this._currentProgress) {
            // The editor forces progress to hide when switching editors. So if progress should be visible, force it to show when the editor is focused.
            this.showProgress();
        }
    }
    onShow() {
        this._isVisible = true;
    }
    focusEditor(activeElement) {
        for (const [element, editor] of this._renderedEditors.entries()) {
            if (element === activeElement) {
                editor.focus();
                return;
            }
        }
    }
    focusContainer(clearSelection = false) {
        if (this._webviewFocused) {
            this._webview?.focusWebview();
        }
        else {
            this._list.focusContainer(clearSelection);
        }
    }
    selectOutputContent(cell) {
        this._webview?.selectOutputContents(cell);
    }
    selectInputContents(cell) {
        this._webview?.selectInputContents(cell);
    }
    onWillHide() {
        this._isVisible = false;
        this._editorFocus.set(false);
        this._overlayContainer.inert = true;
        this._overlayContainer.style.visibility = 'hidden';
        this._overlayContainer.style.left = '-50000px';
        this._notebookTopToolbarContainer.style.display = 'none';
        this.clearActiveCellWidgets();
    }
    clearActiveCellWidgets() {
        this._renderedEditors.forEach((editor, cell) => {
            if (this.getActiveCell() === cell && editor) {
                SuggestController.get(editor)?.cancelSuggestWidget();
                DropIntoEditorController.get(editor)?.clearWidgets();
                CopyPasteController.get(editor)?.clearWidgets();
            }
        });
        this._renderedEditors.forEach((editor, cell) => {
            const controller = InlineCompletionsController.get(editor);
            if (controller?.model.get()?.inlineEditState.get()) {
                editor.render(true);
            }
        });
    }
    editorHasDomFocus() {
        return DOM.isAncestorOfActiveElement(this.getDomNode());
    }
    updateEditorFocus() {
        // Note - focus going to the webview will fire 'blur', but the webview element will be
        // a descendent of the notebook editor root.
        this._focusTracker.refreshState();
        const focused = this.editorHasDomFocus();
        this._editorFocus.set(focused);
        this.viewModel?.setEditorFocus(focused);
    }
    updateCellFocusMode() {
        const activeCell = this.getActiveCell();
        if (activeCell?.focusMode === CellFocusMode.Output && !this._webviewFocused) {
            // output previously has focus, but now it's blurred.
            activeCell.focusMode = CellFocusMode.Container;
        }
    }
    hasEditorFocus() {
        // _editorFocus is driven by the FocusTracker, which is only guaranteed to _eventually_ fire blur.
        // If we need to know whether we have focus at this instant, we need to check the DOM manually.
        this.updateEditorFocus();
        return this.editorHasDomFocus();
    }
    hasWebviewFocus() {
        return this._webviewFocused;
    }
    hasOutputTextSelection() {
        if (!this.hasEditorFocus()) {
            return false;
        }
        const windowSelection = DOM.getWindow(this.getDomNode()).getSelection();
        if (windowSelection?.rangeCount !== 1) {
            return false;
        }
        const activeSelection = windowSelection.getRangeAt(0);
        if (activeSelection.startContainer === activeSelection.endContainer &&
            activeSelection.endOffset - activeSelection.startOffset === 0) {
            return false;
        }
        let container = activeSelection.commonAncestorContainer;
        if (!this._body.contains(container)) {
            return false;
        }
        while (container && container !== this._body) {
            if (container.classList &&
                container.classList.contains('output')) {
                return true;
            }
            container = container.parentNode;
        }
        return false;
    }
    _didFocusOutputInputChange(hasFocus) {
        this._outputInputFocus.set(hasFocus);
    }
    //#endregion
    //#region Editor Features
    focusElement(cell) {
        this.viewModel?.updateSelectionsState({
            kind: SelectionStateType.Handle,
            primary: cell.handle,
            selections: [cell.handle],
        });
    }
    get scrollTop() {
        return this._list.scrollTop;
    }
    get scrollBottom() {
        return this._list.scrollTop + this._list.getRenderHeight();
    }
    getAbsoluteTopOfElement(cell) {
        return this._list.getCellViewScrollTop(cell);
    }
    getHeightOfElement(cell) {
        return this._list.elementHeight(cell);
    }
    scrollToBottom() {
        this._list.scrollToBottom();
    }
    setScrollTop(scrollTop) {
        this._list.scrollTop = scrollTop;
    }
    revealCellRangeInView(range) {
        return this._list.revealCells(range);
    }
    revealInView(cell) {
        return this._list.revealCell(cell, 1 /* CellRevealType.Default */);
    }
    revealInViewAtTop(cell) {
        this._list.revealCell(cell, 2 /* CellRevealType.Top */);
    }
    revealInCenter(cell) {
        this._list.revealCell(cell, 3 /* CellRevealType.Center */);
    }
    async revealInCenterIfOutsideViewport(cell) {
        await this._list.revealCell(cell, 4 /* CellRevealType.CenterIfOutsideViewport */);
    }
    async revealFirstLineIfOutsideViewport(cell) {
        await this._list.revealCell(cell, 6 /* CellRevealType.FirstLineIfOutsideViewport */);
    }
    async revealLineInViewAsync(cell, line) {
        return this._list.revealRangeInCell(cell, new Range(line, 1, line, 1), CellRevealRangeType.Default);
    }
    async revealLineInCenterAsync(cell, line) {
        return this._list.revealRangeInCell(cell, new Range(line, 1, line, 1), CellRevealRangeType.Center);
    }
    async revealLineInCenterIfOutsideViewportAsync(cell, line) {
        return this._list.revealRangeInCell(cell, new Range(line, 1, line, 1), CellRevealRangeType.CenterIfOutsideViewport);
    }
    async revealRangeInViewAsync(cell, range) {
        return this._list.revealRangeInCell(cell, range, CellRevealRangeType.Default);
    }
    async revealRangeInCenterAsync(cell, range) {
        return this._list.revealRangeInCell(cell, range, CellRevealRangeType.Center);
    }
    async revealRangeInCenterIfOutsideViewportAsync(cell, range) {
        return this._list.revealRangeInCell(cell, range, CellRevealRangeType.CenterIfOutsideViewport);
    }
    revealCellOffsetInCenter(cell, offset) {
        return this._list.revealCellOffsetInCenter(cell, offset);
    }
    revealOffsetInCenterIfOutsideViewport(offset) {
        return this._list.revealOffsetInCenterIfOutsideViewport(offset);
    }
    getViewIndexByModelIndex(index) {
        if (!this._listViewInfoAccessor) {
            return -1;
        }
        const cell = this.viewModel?.viewCells[index];
        if (!cell) {
            return -1;
        }
        return this._listViewInfoAccessor.getViewIndex(cell);
    }
    getViewHeight(cell) {
        if (!this._listViewInfoAccessor) {
            return -1;
        }
        return this._listViewInfoAccessor.getViewHeight(cell);
    }
    getCellRangeFromViewRange(startIndex, endIndex) {
        return this._listViewInfoAccessor.getCellRangeFromViewRange(startIndex, endIndex);
    }
    getCellsInRange(range) {
        return this._listViewInfoAccessor.getCellsInRange(range);
    }
    setCellEditorSelection(cell, range) {
        this._list.setCellEditorSelection(cell, range);
    }
    setHiddenAreas(_ranges) {
        return this._list.setHiddenAreas(_ranges, true);
    }
    getVisibleRangesPlusViewportAboveAndBelow() {
        return this._listViewInfoAccessor.getVisibleRangesPlusViewportAboveAndBelow();
    }
    //#endregion
    //#region Decorations
    deltaCellDecorations(oldDecorations, newDecorations) {
        const ret = this.viewModel?.deltaCellDecorations(oldDecorations, newDecorations) || [];
        this._onDidChangeDecorations.fire();
        return ret;
    }
    deltaCellContainerClassNames(cellId, added, removed, cellkind) {
        if (cellkind === CellKind.Markup) {
            this._webview?.deltaMarkupPreviewClassNames(cellId, added, removed);
        }
        else {
            this._webview?.deltaCellOutputContainerClassNames(cellId, added, removed);
        }
    }
    changeModelDecorations(callback) {
        return this.viewModel?.changeModelDecorations(callback) || null;
    }
    //#endregion
    //#region View Zones
    changeViewZones(callback) {
        this._list.changeViewZones(callback);
        this._onDidChangeLayout.fire();
    }
    getViewZoneLayoutInfo(id) {
        return this._list.getViewZoneLayoutInfo(id);
    }
    //#endregion
    //#region Overlay
    changeCellOverlays(callback) {
        this._list.changeCellOverlays(callback);
    }
    //#endregion
    //#region Kernel/Execution
    async _loadKernelPreloads() {
        if (!this.hasModel()) {
            return;
        }
        const { selected } = this.notebookKernelService.getMatchingKernel(this.textModel);
        if (!this._webview?.isResolved()) {
            await this._resolveWebview();
        }
        this._webview?.updateKernelPreloads(selected);
    }
    get activeKernel() {
        return this.textModel && this.notebookKernelService.getSelectedOrSuggestedKernel(this.textModel);
    }
    async cancelNotebookCells(cells) {
        if (!this.viewModel || !this.hasModel()) {
            return;
        }
        if (!cells) {
            cells = this.viewModel.viewCells;
        }
        return this.notebookExecutionService.cancelNotebookCellHandles(this.textModel, Array.from(cells).map((cell) => cell.handle));
    }
    async executeNotebookCells(cells) {
        if (!this.viewModel || !this.hasModel()) {
            this.logService.info('notebookEditorWidget', 'No NotebookViewModel, cannot execute cells');
            return;
        }
        if (!cells) {
            cells = this.viewModel.viewCells;
        }
        return this.notebookExecutionService.executeNotebookCells(this.textModel, Array.from(cells).map((c) => c.model), this.scopedContextKeyService);
    }
    async layoutNotebookCell(cell, height, context) {
        this._debug('layout cell', cell.handle, height);
        const viewIndex = this._list.getViewIndex(cell);
        if (viewIndex === undefined) {
            // the cell is hidden
            return;
        }
        if (this._pendingLayouts?.has(cell)) {
            this._pendingLayouts?.get(cell).dispose();
        }
        const deferred = new DeferredPromise();
        const doLayout = () => {
            if (this._isDisposed) {
                return;
            }
            if (!this.viewModel?.hasCell(cell)) {
                // Cell removed in the meantime?
                return;
            }
            if (this._list.getViewIndex(cell) === undefined) {
                // Cell can be hidden
                return;
            }
            if (this._list.elementHeight(cell) === height) {
                return;
            }
            const pendingLayout = this._pendingLayouts?.get(cell);
            this._pendingLayouts?.delete(cell);
            if (!this.hasEditorFocus()) {
                // Do not scroll inactive notebook
                // https://github.com/microsoft/vscode/issues/145340
                const cellIndex = this.viewModel?.getCellIndex(cell);
                const visibleRanges = this.visibleRanges;
                if (cellIndex !== undefined &&
                    visibleRanges &&
                    visibleRanges.length &&
                    visibleRanges[0].start === cellIndex &&
                    // cell is partially visible
                    this._list.scrollTop > this.getAbsoluteTopOfElement(cell)) {
                    return this._list.updateElementHeight2(cell, height, Math.min(cellIndex + 1, this.getLength() - 1));
                }
            }
            this._list.updateElementHeight2(cell, height);
            deferred.complete(undefined);
            if (pendingLayout) {
                pendingLayout.dispose();
                this._layoutDisposables.delete(pendingLayout);
            }
        };
        if (this._list.inRenderingTransaction) {
            const layoutDisposable = DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), doLayout);
            const disposable = toDisposable(() => {
                layoutDisposable.dispose();
                deferred.complete(undefined);
            });
            this._pendingLayouts?.set(cell, disposable);
            this._layoutDisposables.add(disposable);
        }
        else {
            doLayout();
        }
        return deferred.p;
    }
    getActiveCell() {
        const elements = this._list.getFocusedElements();
        if (elements && elements.length) {
            return elements[0];
        }
        return undefined;
    }
    _toggleNotebookCellSelection(selectedCell, selectFromPrevious) {
        const currentSelections = this._list.getSelectedElements();
        const isSelected = currentSelections.includes(selectedCell);
        const previousSelection = selectFromPrevious
            ? (currentSelections[currentSelections.length - 1] ?? selectedCell)
            : selectedCell;
        const selectedIndex = this._list.getViewIndex(selectedCell);
        const previousIndex = this._list.getViewIndex(previousSelection);
        const cellsInSelectionRange = this.getCellsInViewRange(selectedIndex, previousIndex);
        if (isSelected) {
            // Deselect
            this._list.selectElements(currentSelections.filter((current) => !cellsInSelectionRange.includes(current)));
        }
        else {
            // Add to selection
            this.focusElement(selectedCell);
            this._list.selectElements([
                ...currentSelections.filter((current) => !cellsInSelectionRange.includes(current)),
                ...cellsInSelectionRange,
            ]);
        }
    }
    getCellsInViewRange(fromInclusive, toInclusive) {
        const selectedCellsInRange = [];
        for (let index = 0; index < this._list.length; ++index) {
            const cell = this._list.element(index);
            if (cell) {
                if ((index >= fromInclusive && index <= toInclusive) ||
                    (index >= toInclusive && index <= fromInclusive)) {
                    selectedCellsInRange.push(cell);
                }
            }
        }
        return selectedCellsInRange;
    }
    async focusNotebookCell(cell, focusItem, options) {
        if (this._isDisposed) {
            return;
        }
        cell.focusedOutputId = undefined;
        if (focusItem === 'editor') {
            cell.isInputCollapsed = false;
            this.focusElement(cell);
            this._list.focusView();
            cell.updateEditState(CellEditState.Editing, 'focusNotebookCell');
            cell.focusMode = CellFocusMode.Editor;
            if (!options?.skipReveal) {
                if (typeof options?.focusEditorLine === 'number') {
                    this._cursorNavMode.set(true);
                    await this.revealLineInViewAsync(cell, options.focusEditorLine);
                    const editor = this._renderedEditors.get(cell);
                    const focusEditorLine = options.focusEditorLine;
                    editor?.setSelection({
                        startLineNumber: focusEditorLine,
                        startColumn: 1,
                        endLineNumber: focusEditorLine,
                        endColumn: 1,
                    });
                }
                else {
                    const selectionsStartPosition = cell.getSelectionsStartPosition();
                    if (selectionsStartPosition?.length) {
                        const firstSelectionPosition = selectionsStartPosition[0];
                        await this.revealRangeInViewAsync(cell, Range.fromPositions(firstSelectionPosition, firstSelectionPosition));
                    }
                    else {
                        await this.revealInView(cell);
                    }
                }
            }
        }
        else if (focusItem === 'output') {
            this.focusElement(cell);
            if (!this.hasEditorFocus()) {
                this._list.focusView();
            }
            if (!this._webview) {
                return;
            }
            const firstOutputId = cell.outputsViewModels.find((o) => o.model.alternativeOutputId)?.model
                .alternativeOutputId;
            const focusElementId = options?.outputId ?? firstOutputId ?? cell.id;
            this._webview.focusOutput(focusElementId, options?.altOutputId, options?.outputWebviewFocused || this._webviewFocused);
            cell.updateEditState(CellEditState.Preview, 'focusNotebookCell');
            cell.focusMode = CellFocusMode.Output;
            cell.focusedOutputId = options?.outputId;
            this._outputFocus.set(true);
            if (!options?.skipReveal) {
                this.revealInCenterIfOutsideViewport(cell);
            }
        }
        else {
            // focus container
            const itemDOM = this._list.domElementOfElement(cell);
            if (itemDOM &&
                itemDOM.ownerDocument.activeElement &&
                itemDOM.contains(itemDOM.ownerDocument.activeElement)) {
                ;
                itemDOM.ownerDocument.activeElement.blur();
            }
            this._webview?.blurOutput();
            cell.updateEditState(CellEditState.Preview, 'focusNotebookCell');
            cell.focusMode = CellFocusMode.Container;
            this.focusElement(cell);
            if (!options?.skipReveal) {
                if (typeof options?.focusEditorLine === 'number') {
                    this._cursorNavMode.set(true);
                    await this.revealInView(cell);
                }
                else if (options?.revealBehavior === ScrollToRevealBehavior.firstLine) {
                    await this.revealFirstLineIfOutsideViewport(cell);
                }
                else if (options?.revealBehavior === ScrollToRevealBehavior.fullCell) {
                    await this.revealInView(cell);
                }
                else {
                    await this.revealInCenterIfOutsideViewport(cell);
                }
            }
            this._list.focusView();
            this.updateEditorFocus();
        }
    }
    async focusNextNotebookCell(cell, focusItem) {
        const idx = this.viewModel?.getCellIndex(cell);
        if (typeof idx !== 'number') {
            return;
        }
        const newCell = this.viewModel?.cellAt(idx + 1);
        if (!newCell) {
            return;
        }
        await this.focusNotebookCell(newCell, focusItem);
    }
    //#endregion
    //#region Find
    async _warmupCell(viewCell) {
        if (viewCell.isOutputCollapsed) {
            return;
        }
        const outputs = viewCell.outputsViewModels;
        for (const output of outputs.slice(0, outputDisplayLimit)) {
            const [mimeTypes, pick] = output.resolveMimeTypes(this.textModel, undefined);
            if (!mimeTypes.find((mimeType) => mimeType.isTrusted) || mimeTypes.length === 0) {
                continue;
            }
            const pickedMimeTypeRenderer = mimeTypes[pick];
            if (!pickedMimeTypeRenderer) {
                return;
            }
            const renderer = this._notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
            if (!renderer) {
                return;
            }
            const result = {
                type: 1 /* RenderOutputType.Extension */,
                renderer,
                source: output,
                mimeType: pickedMimeTypeRenderer.mimeType,
            };
            const inset = this._webview?.insetMapping.get(result.source);
            if (!inset || !inset.initialized) {
                const p = new Promise((resolve) => {
                    this._register(Event.any(this.onDidRenderOutput, this.onDidRemoveOutput)((e) => {
                        if (e.model === result.source.model) {
                            resolve();
                        }
                    }));
                });
                this.createOutput(viewCell, result, 0, false);
                await p;
            }
            else {
                // request to update its visibility
                this.createOutput(viewCell, result, 0, false);
            }
            return;
        }
    }
    async _warmupAll(includeOutput) {
        if (!this.hasModel() || !this.viewModel) {
            return;
        }
        const cells = this.viewModel.viewCells;
        const requests = [];
        for (let i = 0; i < cells.length; i++) {
            if (cells[i].cellKind === CellKind.Markup &&
                !this._webview.markupPreviewMapping.has(cells[i].id)) {
                requests.push(this.createMarkupPreview(cells[i]));
            }
        }
        if (includeOutput && this._list) {
            for (let i = 0; i < this._list.length; i++) {
                const cell = this._list.element(i);
                if (cell?.cellKind === CellKind.Code) {
                    requests.push(this._warmupCell(cell));
                }
            }
        }
        return Promise.all(requests);
    }
    async _warmupSelection(includeOutput, selectedCellRanges) {
        if (!this.hasModel() || !this.viewModel) {
            return;
        }
        const cells = this.viewModel.viewCells;
        const requests = [];
        for (const range of selectedCellRanges) {
            for (let i = range.start; i < range.end; i++) {
                if (cells[i].cellKind === CellKind.Markup &&
                    !this._webview.markupPreviewMapping.has(cells[i].id)) {
                    requests.push(this.createMarkupPreview(cells[i]));
                }
            }
        }
        if (includeOutput && this._list) {
            for (const range of selectedCellRanges) {
                for (let i = range.start; i < range.end; i++) {
                    const cell = this._list.element(i);
                    if (cell?.cellKind === CellKind.Code) {
                        requests.push(this._warmupCell(cell));
                    }
                }
            }
        }
        return Promise.all(requests);
    }
    async find(query, options, token, skipWarmup = false, shouldGetSearchPreviewInfo = false, ownerID) {
        if (!this._notebookViewModel) {
            return [];
        }
        if (!ownerID) {
            ownerID = this.getId();
        }
        const findMatches = this._notebookViewModel
            .find(query, options)
            .filter((match) => match.length > 0);
        if ((!options.includeMarkupPreview && !options.includeOutput) ||
            options.findScope?.findScopeType === NotebookFindScopeType.Text) {
            this._webview?.findStop(ownerID);
            return findMatches;
        }
        // search in webview enabled
        const matchMap = {};
        findMatches.forEach((match) => {
            matchMap[match.cell.id] = match;
        });
        if (this._webview) {
            // request all or some outputs to be rendered
            // measure perf
            const start = Date.now();
            if (options.findScope &&
                options.findScope.findScopeType === NotebookFindScopeType.Cells &&
                options.findScope.selectedCellRanges) {
                await this._warmupSelection(!!options.includeOutput, options.findScope.selectedCellRanges);
            }
            else {
                await this._warmupAll(!!options.includeOutput);
            }
            const end = Date.now();
            this.logService.debug('Find', `Warmup time: ${end - start}ms`);
            if (token.isCancellationRequested) {
                return [];
            }
            let findIds = [];
            if (options.findScope &&
                options.findScope.findScopeType === NotebookFindScopeType.Cells &&
                options.findScope.selectedCellRanges) {
                const selectedIndexes = cellRangesToIndexes(options.findScope.selectedCellRanges);
                findIds = selectedIndexes.map((index) => this._notebookViewModel?.viewCells[index].id ?? '');
            }
            const webviewMatches = await this._webview.find(query, {
                caseSensitive: options.caseSensitive,
                wholeWord: options.wholeWord,
                includeMarkup: !!options.includeMarkupPreview,
                includeOutput: !!options.includeOutput,
                shouldGetSearchPreviewInfo,
                ownerID,
                findIds: findIds,
            });
            if (token.isCancellationRequested) {
                return [];
            }
            // attach webview matches to model find matches
            webviewMatches.forEach((match) => {
                const cell = this._notebookViewModel.viewCells.find((cell) => cell.id === match.cellId);
                if (!cell) {
                    return;
                }
                if (match.type === 'preview') {
                    // markup preview
                    if (cell.getEditState() === CellEditState.Preview && !options.includeMarkupPreview) {
                        return;
                    }
                    if (cell.getEditState() === CellEditState.Editing && options.includeMarkupInput) {
                        return;
                    }
                }
                else {
                    if (!options.includeOutput) {
                        // skip outputs if not included
                        return;
                    }
                }
                const exisitingMatch = matchMap[match.cellId];
                if (exisitingMatch) {
                    exisitingMatch.webviewMatches.push(match);
                }
                else {
                    matchMap[match.cellId] = new CellFindMatchModel(this._notebookViewModel.viewCells.find((cell) => cell.id === match.cellId), this._notebookViewModel.viewCells.findIndex((cell) => cell.id === match.cellId), [], [match]);
                }
            });
        }
        const ret = [];
        this._notebookViewModel.viewCells.forEach((cell, index) => {
            if (matchMap[cell.id]) {
                ret.push(new CellFindMatchModel(cell, index, matchMap[cell.id].contentMatches, matchMap[cell.id].webviewMatches));
            }
        });
        return ret;
    }
    async findHighlightCurrent(matchIndex, ownerID) {
        if (!this._webview) {
            return 0;
        }
        return this._webview?.findHighlightCurrent(matchIndex, ownerID ?? this.getId());
    }
    async findUnHighlightCurrent(matchIndex, ownerID) {
        if (!this._webview) {
            return;
        }
        return this._webview?.findUnHighlightCurrent(matchIndex, ownerID ?? this.getId());
    }
    findStop(ownerID) {
        this._webview?.findStop(ownerID ?? this.getId());
    }
    //#endregion
    //#region MISC
    getLayoutInfo() {
        if (!this._list) {
            throw new Error('Editor is not initalized successfully');
        }
        if (!this._fontInfo) {
            this._generateFontInfo();
        }
        return {
            width: this._dimension?.width ?? 0,
            height: this._dimension?.height ?? 0,
            scrollHeight: this._list?.getScrollHeight() ?? 0,
            fontInfo: this._fontInfo,
            stickyHeight: this._notebookStickyScroll?.getCurrentStickyHeight() ?? 0,
        };
    }
    async createMarkupPreview(cell) {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        if (!this._webview || !this._list.webviewElement) {
            return;
        }
        if (!this.viewModel || !this._list.viewModel) {
            return;
        }
        if (this.viewModel.getCellIndex(cell) === -1) {
            return;
        }
        if (this.cellIsHidden(cell)) {
            return;
        }
        const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
        const top = !!webviewTop ? 0 - webviewTop : 0;
        const cellTop = this._list.getCellViewScrollTop(cell);
        await this._webview.showMarkupPreview({
            mime: cell.mime,
            cellHandle: cell.handle,
            cellId: cell.id,
            content: cell.getText(),
            offset: cellTop + top,
            visible: true,
            metadata: cell.metadata,
        });
    }
    cellIsHidden(cell) {
        const modelIndex = this.viewModel.getCellIndex(cell);
        const foldedRanges = this.viewModel.getHiddenRanges();
        return foldedRanges.some((range) => modelIndex >= range.start && modelIndex <= range.end);
    }
    async unhideMarkupPreviews(cells) {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        await this._webview?.unhideMarkupPreviews(cells.map((cell) => cell.id));
    }
    async hideMarkupPreviews(cells) {
        if (!this._webview || !cells.length) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        await this._webview?.hideMarkupPreviews(cells.map((cell) => cell.id));
    }
    async deleteMarkupPreviews(cells) {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        await this._webview?.deleteMarkupPreviews(cells.map((cell) => cell.id));
    }
    async updateSelectedMarkdownPreviews() {
        if (!this._webview) {
            return;
        }
        if (!this._webview.isResolved()) {
            await this._resolveWebview();
        }
        const selectedCells = this.getSelectionViewModels().map((cell) => cell.id);
        // Only show selection when there is more than 1 cell selected
        await this._webview?.updateMarkupPreviewSelections(selectedCells.length > 1 ? selectedCells : []);
    }
    async createOutput(cell, output, offset, createWhenIdle) {
        this._insetModifyQueueByOutputId.queue(output.source.model.outputId, async () => {
            if (this._isDisposed || !this._webview) {
                return;
            }
            if (!this._webview.isResolved()) {
                await this._resolveWebview();
            }
            if (!this._webview) {
                return;
            }
            if (!this._list.webviewElement) {
                return;
            }
            if (output.type === 1 /* RenderOutputType.Extension */) {
                this.notebookRendererMessaging.prepare(output.renderer.id);
            }
            const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
            const top = !!webviewTop ? 0 - webviewTop : 0;
            const cellTop = this._list.getCellViewScrollTop(cell) + top;
            const existingOutput = this._webview.insetMapping.get(output.source);
            if (!existingOutput ||
                (!existingOutput.renderer && output.type === 1 /* RenderOutputType.Extension */)) {
                if (createWhenIdle) {
                    this._webview.requestCreateOutputWhenWebviewIdle({
                        cellId: cell.id,
                        cellHandle: cell.handle,
                        cellUri: cell.uri,
                        executionId: cell.internalMetadata.executionId,
                    }, output, cellTop, offset);
                }
                else {
                    this._webview.createOutput({
                        cellId: cell.id,
                        cellHandle: cell.handle,
                        cellUri: cell.uri,
                        executionId: cell.internalMetadata.executionId,
                    }, output, cellTop, offset);
                }
            }
            else if (existingOutput.renderer &&
                output.type === 1 /* RenderOutputType.Extension */ &&
                existingOutput.renderer.id !== output.renderer.id) {
                // switch mimetype
                this._webview.removeInsets([output.source]);
                this._webview.createOutput({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri }, output, cellTop, offset);
            }
            else if (existingOutput.versionId !== output.source.model.versionId) {
                this._webview.updateOutput({
                    cellId: cell.id,
                    cellHandle: cell.handle,
                    cellUri: cell.uri,
                    executionId: cell.internalMetadata.executionId,
                }, output, cellTop, offset);
            }
            else {
                const outputIndex = cell.outputsViewModels.indexOf(output.source);
                const outputOffset = cell.getOutputOffset(outputIndex);
                this._webview.updateScrollTops([
                    {
                        cell,
                        output: output.source,
                        cellTop,
                        outputOffset,
                        forceDisplay: !cell.isOutputCollapsed,
                    },
                ], []);
            }
        });
    }
    async updateOutput(cell, output, offset) {
        this._insetModifyQueueByOutputId.queue(output.source.model.outputId, async () => {
            if (this._isDisposed || !this._webview || cell.isOutputCollapsed) {
                return;
            }
            if (!this._webview.isResolved()) {
                await this._resolveWebview();
            }
            if (!this._webview || !this._list.webviewElement) {
                return;
            }
            if (!this._webview.insetMapping.has(output.source)) {
                return this.createOutput(cell, output, offset, false);
            }
            if (output.type === 1 /* RenderOutputType.Extension */) {
                this.notebookRendererMessaging.prepare(output.renderer.id);
            }
            const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
            const top = !!webviewTop ? 0 - webviewTop : 0;
            const cellTop = this._list.getCellViewScrollTop(cell) + top;
            this._webview.updateOutput({ cellId: cell.id, cellHandle: cell.handle, cellUri: cell.uri }, output, cellTop, offset);
        });
    }
    async copyOutputImage(cellOutput) {
        this._webview?.copyImage(cellOutput);
    }
    removeInset(output) {
        this._insetModifyQueueByOutputId.queue(output.model.outputId, async () => {
            if (this._isDisposed || !this._webview) {
                return;
            }
            if (this._webview?.isResolved()) {
                this._webview.removeInsets([output]);
            }
            this._onDidRemoveOutput.fire(output);
        });
    }
    hideInset(output) {
        this._insetModifyQueueByOutputId.queue(output.model.outputId, async () => {
            if (this._isDisposed || !this._webview) {
                return;
            }
            if (this._webview?.isResolved()) {
                this._webview.hideInset(output);
            }
        });
    }
    //#region --- webview IPC ----
    postMessage(message) {
        if (this._webview?.isResolved()) {
            this._webview.postKernelMessage(message);
        }
    }
    //#endregion
    addClassName(className) {
        this._overlayContainer.classList.add(className);
    }
    removeClassName(className) {
        this._overlayContainer.classList.remove(className);
    }
    cellAt(index) {
        return this.viewModel?.cellAt(index);
    }
    getCellByInfo(cellInfo) {
        const { cellHandle } = cellInfo;
        return this.viewModel?.viewCells.find((vc) => vc.handle === cellHandle);
    }
    getCellByHandle(handle) {
        return this.viewModel?.getCellByHandle(handle);
    }
    getCellIndex(cell) {
        return this.viewModel?.getCellIndexByHandle(cell.handle);
    }
    getNextVisibleCellIndex(index) {
        return this.viewModel?.getNextVisibleCellIndex(index);
    }
    getPreviousVisibleCellIndex(index) {
        return this.viewModel?.getPreviousVisibleCellIndex(index);
    }
    _updateScrollHeight() {
        if (this._isDisposed || !this._webview?.isResolved()) {
            return;
        }
        if (!this._list.webviewElement) {
            return;
        }
        const scrollHeight = this._list.scrollHeight;
        this._webview.element.style.height = `${scrollHeight + NOTEBOOK_WEBVIEW_BOUNDARY * 2}px`;
        const webviewTop = parseInt(this._list.webviewElement.domNode.style.top, 10);
        const top = !!webviewTop ? 0 - webviewTop : 0;
        const updateItems = [];
        const removedItems = [];
        this._webview?.insetMapping.forEach((value, key) => {
            const cell = this.viewModel?.getCellByHandle(value.cellInfo.cellHandle);
            if (!cell || !(cell instanceof CodeCellViewModel)) {
                return;
            }
            this.viewModel?.viewCells.find((cell) => cell.handle === value.cellInfo.cellHandle);
            const viewIndex = this._list.getViewIndex(cell);
            if (viewIndex === undefined) {
                return;
            }
            if (cell.outputsViewModels.indexOf(key) < 0) {
                // output is already gone
                removedItems.push(key);
            }
            const cellTop = this._list.getCellViewScrollTop(cell);
            const outputIndex = cell.outputsViewModels.indexOf(key);
            const outputOffset = cell.getOutputOffset(outputIndex);
            updateItems.push({
                cell,
                output: key,
                cellTop: cellTop + top,
                outputOffset,
                forceDisplay: false,
            });
        });
        this._webview.removeInsets(removedItems);
        const markdownUpdateItems = [];
        for (const cellId of this._webview.markupPreviewMapping.keys()) {
            const cell = this.viewModel?.viewCells.find((cell) => cell.id === cellId);
            if (cell) {
                const cellTop = this._list.getCellViewScrollTop(cell);
                // markdownUpdateItems.push({ id: cellId, top: cellTop });
                markdownUpdateItems.push({ id: cellId, top: cellTop + top });
            }
        }
        if (markdownUpdateItems.length || updateItems.length) {
            this._debug('_list.onDidChangeContentHeight/markdown', markdownUpdateItems);
            this._webview?.updateScrollTops(updateItems, markdownUpdateItems);
        }
    }
    //#endregion
    //#region BacklayerWebview delegate
    _updateOutputHeight(cellInfo, output, outputHeight, isInit, source) {
        const cell = this.viewModel?.viewCells.find((vc) => vc.handle === cellInfo.cellHandle);
        if (cell && cell instanceof CodeCellViewModel) {
            const outputIndex = cell.outputsViewModels.indexOf(output);
            if (outputIndex > -1) {
                this._debug('update cell output', cell.handle, outputHeight);
                cell.updateOutputHeight(outputIndex, outputHeight, source);
                this.layoutNotebookCell(cell, cell.layoutInfo.totalHeight);
                if (isInit) {
                    this._onDidRenderOutput.fire(output);
                }
            }
            else {
                this._debug('tried to update cell output that does not exist');
            }
        }
    }
    _scheduleOutputHeightAck(cellInfo, outputId, height) {
        const wasEmpty = this._pendingOutputHeightAcks.size === 0;
        this._pendingOutputHeightAcks.set(outputId, { cellId: cellInfo.cellId, outputId, height });
        if (wasEmpty) {
            DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), () => {
                this._debug('ack height');
                this._updateScrollHeight();
                this._webview?.ackHeight([...this._pendingOutputHeightAcks.values()]);
                this._pendingOutputHeightAcks.clear();
            }, -1); // -1 priority because this depends on calls to layoutNotebookCell, and that may be called multiple times before this runs
        }
    }
    _getCellById(cellId) {
        return this.viewModel?.viewCells.find((vc) => vc.id === cellId);
    }
    _updateMarkupCellHeight(cellId, height, isInit) {
        const cell = this._getCellById(cellId);
        if (cell && cell instanceof MarkupCellViewModel) {
            const { bottomToolbarGap } = this._notebookOptions.computeBottomToolbarDimensions(this.viewModel?.viewType);
            this._debug('updateMarkdownCellHeight', cell.handle, height + bottomToolbarGap, isInit);
            cell.renderedMarkdownHeight = height;
        }
    }
    _setMarkupCellEditState(cellId, editState) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            this.revealInView(cell);
            cell.updateEditState(editState, 'setMarkdownCellEditState');
        }
    }
    _didStartDragMarkupCell(cellId, event) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            const webviewOffset = this._list.webviewElement
                ? -parseInt(this._list.webviewElement.domNode.style.top, 10)
                : 0;
            this._dndController?.startExplicitDrag(cell, event.dragOffsetY - webviewOffset);
        }
    }
    _didDragMarkupCell(cellId, event) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            const webviewOffset = this._list.webviewElement
                ? -parseInt(this._list.webviewElement.domNode.style.top, 10)
                : 0;
            this._dndController?.explicitDrag(cell, event.dragOffsetY - webviewOffset);
        }
    }
    _didDropMarkupCell(cellId, event) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            const webviewOffset = this._list.webviewElement
                ? -parseInt(this._list.webviewElement.domNode.style.top, 10)
                : 0;
            event.dragOffsetY -= webviewOffset;
            this._dndController?.explicitDrop(cell, event);
        }
    }
    _didEndDragMarkupCell(cellId) {
        const cell = this._getCellById(cellId);
        if (cell instanceof MarkupCellViewModel) {
            this._dndController?.endExplicitDrag(cell);
        }
    }
    _didResizeOutput(cellId) {
        const cell = this._getCellById(cellId);
        if (cell) {
            this._onDidResizeOutputEmitter.fire(cell);
        }
    }
    _updatePerformanceMetadata(cellId, executionId, duration, rendererId) {
        if (!this.hasModel()) {
            return;
        }
        const cell = this._getCellById(cellId);
        const cellIndex = !cell ? undefined : this.getCellIndex(cell);
        if (cell?.internalMetadata.executionId === executionId && cellIndex !== undefined) {
            const renderDurationMap = cell.internalMetadata.renderDuration || {};
            renderDurationMap[rendererId] = (renderDurationMap[rendererId] ?? 0) + duration;
            this.textModel.applyEdits([
                {
                    editType: 9 /* CellEditType.PartialInternalMetadata */,
                    index: cellIndex,
                    internalMetadata: {
                        executionId: executionId,
                        renderDuration: renderDurationMap,
                    },
                },
            ], true, undefined, () => undefined, undefined, false);
        }
    }
    //#endregion
    //#region Editor Contributions
    getContribution(id) {
        return (this._contributions.get(id) || null);
    }
    //#endregion
    dispose() {
        this._isDisposed = true;
        // dispose webview first
        this._webview?.dispose();
        this._webview = null;
        this._layoutDisposables.forEach((d) => d.dispose());
        this.notebookEditorService.removeNotebookEditor(this);
        dispose(this._contributions.values());
        this._contributions.clear();
        this._localStore.clear();
        dispose(this._localCellStateListeners);
        this._list.dispose();
        this._listTopCellToolbar?.dispose();
        this._overlayContainer.remove();
        this.viewModel?.dispose();
        this._renderedEditors.clear();
        this._baseCellEditorOptions.forEach((v) => v.dispose());
        this._baseCellEditorOptions.clear();
        this._notebookOverviewRulerContainer.remove();
        super.dispose();
        // unref
        this._webview = null;
        this._webviewResolvePromise = null;
        this._webviewTransparentCover = null;
        this._dndController = null;
        this._listTopCellToolbar = null;
        this._notebookViewModel = undefined;
        this._cellContextKeyManager = null;
        this._notebookTopToolbar = null;
        this._list = null;
        this._listViewInfoAccessor = null;
        this._pendingLayouts = null;
        this._listDelegate = null;
    }
    toJSON() {
        return {
            notebookUri: this.viewModel?.uri,
        };
    }
};
NotebookEditorWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, IEditorGroupsService),
    __param(4, INotebookRendererMessagingService),
    __param(5, INotebookEditorService),
    __param(6, INotebookKernelService),
    __param(7, INotebookService),
    __param(8, IConfigurationService),
    __param(9, IContextKeyService),
    __param(10, ILayoutService),
    __param(11, IContextMenuService),
    __param(12, ITelemetryService),
    __param(13, INotebookExecutionService),
    __param(14, IEditorProgressService),
    __param(15, INotebookLoggingService)
], NotebookEditorWidget);
export { NotebookEditorWidget };
registerZIndex(ZIndex.Base, 5, 'notebook-progress-bar');
registerZIndex(ZIndex.Base, 10, 'notebook-list-insertion-indicator');
registerZIndex(ZIndex.Base, 20, 'notebook-cell-editor-outline');
registerZIndex(ZIndex.Base, 25, 'notebook-scrollbar');
registerZIndex(ZIndex.Base, 26, 'notebook-cell-status');
registerZIndex(ZIndex.Base, 26, 'notebook-folding-indicator');
registerZIndex(ZIndex.Base, 27, 'notebook-output');
registerZIndex(ZIndex.Base, 28, 'notebook-cell-bottom-toolbar-container');
registerZIndex(ZIndex.Base, 29, 'notebook-run-button-container');
registerZIndex(ZIndex.Base, 29, 'notebook-input-collapse-condicon');
registerZIndex(ZIndex.Base, 30, 'notebook-cell-output-toolbar');
registerZIndex(ZIndex.Sash, 1, 'notebook-cell-expand-part-button');
registerZIndex(ZIndex.Sash, 2, 'notebook-cell-toolbar');
registerZIndex(ZIndex.Sash, 3, 'notebook-cell-toolbar-dropdown-active');
export const notebookCellBorder = registerColor('notebook.cellBorderColor', {
    dark: transparent(listInactiveSelectionBackground, 1),
    light: transparent(listInactiveSelectionBackground, 1),
    hcDark: PANEL_BORDER,
    hcLight: PANEL_BORDER,
}, nls.localize('notebook.cellBorderColor', 'The border color for notebook cells.'));
export const focusedEditorBorderColor = registerColor('notebook.focusedEditorBorder', focusBorder, nls.localize('notebook.focusedEditorBorder', 'The color of the notebook cell editor border.'));
export const cellStatusIconSuccess = registerColor('notebookStatusSuccessIcon.foreground', debugIconStartForeground, nls.localize('notebookStatusSuccessIcon.foreground', 'The error icon color of notebook cells in the cell status bar.'));
export const runningCellRulerDecorationColor = registerColor('notebookEditorOverviewRuler.runningCellForeground', debugIconStartForeground, nls.localize('notebookEditorOverviewRuler.runningCellForeground', 'The color of the running cell decoration in the notebook editor overview ruler.'));
export const cellStatusIconError = registerColor('notebookStatusErrorIcon.foreground', errorForeground, nls.localize('notebookStatusErrorIcon.foreground', 'The error icon color of notebook cells in the cell status bar.'));
export const cellStatusIconRunning = registerColor('notebookStatusRunningIcon.foreground', foreground, nls.localize('notebookStatusRunningIcon.foreground', 'The running icon color of notebook cells in the cell status bar.'));
export const notebookOutputContainerBorderColor = registerColor('notebook.outputContainerBorderColor', null, nls.localize('notebook.outputContainerBorderColor', 'The border color of the notebook output container.'));
export const notebookOutputContainerColor = registerColor('notebook.outputContainerBackgroundColor', null, nls.localize('notebook.outputContainerBackgroundColor', 'The color of the notebook output container background.'));
// TODO@rebornix currently also used for toolbar border, if we keep all of this, pick a generic name
export const CELL_TOOLBAR_SEPERATOR = registerColor('notebook.cellToolbarSeparator', {
    dark: Color.fromHex('#808080').transparent(0.35),
    light: Color.fromHex('#808080').transparent(0.35),
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('notebook.cellToolbarSeparator', 'The color of the separator in the cell bottom toolbar'));
export const focusedCellBackground = registerColor('notebook.focusedCellBackground', null, nls.localize('focusedCellBackground', 'The background color of a cell when the cell is focused.'));
export const selectedCellBackground = registerColor('notebook.selectedCellBackground', {
    dark: listInactiveSelectionBackground,
    light: listInactiveSelectionBackground,
    hcDark: null,
    hcLight: null,
}, nls.localize('selectedCellBackground', 'The background color of a cell when the cell is selected.'));
export const cellHoverBackground = registerColor('notebook.cellHoverBackground', {
    dark: transparent(focusedCellBackground, 0.5),
    light: transparent(focusedCellBackground, 0.7),
    hcDark: null,
    hcLight: null,
}, nls.localize('notebook.cellHoverBackground', 'The background color of a cell when the cell is hovered.'));
export const selectedCellBorder = registerColor('notebook.selectedCellBorder', {
    dark: notebookCellBorder,
    light: notebookCellBorder,
    hcDark: contrastBorder,
    hcLight: contrastBorder,
}, nls.localize('notebook.selectedCellBorder', "The color of the cell's top and bottom border when the cell is selected but not focused."));
export const inactiveSelectedCellBorder = registerColor('notebook.inactiveSelectedCellBorder', {
    dark: null,
    light: null,
    hcDark: focusBorder,
    hcLight: focusBorder,
}, nls.localize('notebook.inactiveSelectedCellBorder', "The color of the cell's borders when multiple cells are selected."));
export const focusedCellBorder = registerColor('notebook.focusedCellBorder', focusBorder, nls.localize('notebook.focusedCellBorder', "The color of the cell's focus indicator borders when the cell is focused."));
export const inactiveFocusedCellBorder = registerColor('notebook.inactiveFocusedCellBorder', notebookCellBorder, nls.localize('notebook.inactiveFocusedCellBorder', "The color of the cell's top and bottom border when a cell is focused while the primary focus is outside of the editor."));
export const cellStatusBarItemHover = registerColor('notebook.cellStatusBarItemHoverBackground', {
    light: new Color(new RGBA(0, 0, 0, 0.08)),
    dark: new Color(new RGBA(255, 255, 255, 0.15)),
    hcDark: new Color(new RGBA(255, 255, 255, 0.15)),
    hcLight: new Color(new RGBA(0, 0, 0, 0.08)),
}, nls.localize('notebook.cellStatusBarItemHoverBackground', 'The background color of notebook cell status bar items.'));
export const cellInsertionIndicator = registerColor('notebook.cellInsertionIndicator', focusBorder, nls.localize('notebook.cellInsertionIndicator', 'The color of the notebook cell insertion indicator.'));
export const listScrollbarSliderBackground = registerColor('notebookScrollbarSlider.background', scrollbarSliderBackground, nls.localize('notebookScrollbarSliderBackground', 'Notebook scrollbar slider background color.'));
export const listScrollbarSliderHoverBackground = registerColor('notebookScrollbarSlider.hoverBackground', scrollbarSliderHoverBackground, nls.localize('notebookScrollbarSliderHoverBackground', 'Notebook scrollbar slider background color when hovering.'));
export const listScrollbarSliderActiveBackground = registerColor('notebookScrollbarSlider.activeBackground', scrollbarSliderActiveBackground, nls.localize('notebookScrollbarSliderActiveBackground', 'Notebook scrollbar slider background color when clicked on.'));
export const cellSymbolHighlight = registerColor('notebook.symbolHighlightBackground', {
    dark: Color.fromHex('#ffffff0b'),
    light: Color.fromHex('#fdff0033'),
    hcDark: null,
    hcLight: null,
}, nls.localize('notebook.symbolHighlightBackground', 'Background color of highlighted cell'));
export const cellEditorBackground = registerColor('notebook.cellEditorBackground', {
    light: SIDE_BAR_BACKGROUND,
    dark: SIDE_BAR_BACKGROUND,
    hcDark: null,
    hcLight: null,
}, nls.localize('notebook.cellEditorBackground', 'Cell editor background color.'));
const notebookEditorBackground = registerColor('notebook.editorBackground', {
    light: EDITOR_PANE_BACKGROUND,
    dark: EDITOR_PANE_BACKGROUND,
    hcDark: null,
    hcLight: null,
}, nls.localize('notebook.editorBackground', 'Notebook background color.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvbm90ZWJvb2tFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sd0NBQXdDLENBQUE7QUFDL0MsT0FBTywwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUE7QUFHNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtB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