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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rRWRpdG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sNkJBQTZCLENBQUE7QUFDcEMsT0FBTyxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sMENBQTBDLENBQUE7QUFDakQsT0FBTyw2QkFBNkIsQ0FBQTtBQUNwQyxPQUFPLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sdUNBQXVDLENBQUE7QUFDOUMsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFBO0FBRzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWxGLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVB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