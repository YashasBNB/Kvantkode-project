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
var NotebookTextDiffEditor_1;
import * as nls from '../../../../../nls.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { findLastIdx } from '../../../../../base/common/arraysFind.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService, registerThemingParticipant, } from '../../../../../platform/theme/common/themeService.js';
import { getDefaultNotebookCreationOptions } from '../notebookEditorWidget.js';
import { CancellationTokenSource, } from '../../../../../base/common/cancellation.js';
import { SideBySideDiffElementViewModel, } from './diffElementViewModel.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CellDiffPlaceholderRenderer, CellDiffSideBySideRenderer, CellDiffSingleSideRenderer, NotebookCellTextDiffListDelegate, NotebookDocumentMetadataDiffRenderer, NotebookTextDiffList, } from './notebookDiffList.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { diffDiagonalFill, editorBackground, focusBorder, foreground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { INotebookEditorWorkerService } from '../../common/services/notebookWorkerService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { DiffSide, DIFF_CELL_MARGIN, } from './notebookDiffEditorBrowser.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { CellUri, NOTEBOOK_DIFF_EDITOR_ID, NotebookSetting, } from '../../common/notebookCommon.js';
import { SequencerByKey } from '../../../../../base/common/async.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { BackLayerWebView, } from '../view/renderers/backLayerWebView.js';
import { NotebookDiffEditorEventDispatcher, NotebookDiffLayoutChangedEvent, } from './eventDispatcher.js';
import { FontMeasurements } from '../../../../../editor/browser/config/fontMeasurements.js';
import { NotebookOptions } from '../notebookOptions.js';
import { cellIndexesToRanges, cellRangesToIndexes } from '../../common/notebookRange.js';
import { NotebookDiffOverviewRuler } from './notebookDiffOverviewRuler.js';
import { registerZIndex, ZIndex } from '../../../../../platform/layout/browser/zIndexRegistry.js';
import { NotebookDiffViewModel } from './notebookDiffViewModel.js';
import { INotebookService } from '../../common/notebookService.js';
import { DiffEditorHeightCalculatorService, } from './editorHeightCalculator.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { NotebookInlineDiffWidget } from './inlineDiff/notebookInlineDiffWidget.js';
import { observableValue } from '../../../../../base/common/observable.js';
const $ = DOM.$;
class NotebookDiffEditorSelection {
    constructor(selections) {
        this.selections = selections;
    }
    compare(other) {
        if (!(other instanceof NotebookDiffEditorSelection)) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        if (this.selections.length !== other.selections.length) {
            return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
        }
        for (let i = 0; i < this.selections.length; i++) {
            if (this.selections[i] !== other.selections[i]) {
                return 3 /* EditorPaneSelectionCompareResult.DIFFERENT */;
            }
        }
        return 1 /* EditorPaneSelectionCompareResult.IDENTICAL */;
    }
    restore(options) {
        const notebookOptions = {
            cellSelections: cellIndexesToRanges(this.selections),
        };
        Object.assign(notebookOptions, options);
        return notebookOptions;
    }
}
let NotebookTextDiffEditor = class NotebookTextDiffEditor extends EditorPane {
    static { NotebookTextDiffEditor_1 = this; }
    static { this.ENTIRE_DIFF_OVERVIEW_WIDTH = 30; }
    static { this.ID = NOTEBOOK_DIFF_EDITOR_ID; }
    get textModel() {
        return this._model?.modified.notebook;
    }
    get inlineNotebookEditor() {
        if (this._inlineView) {
            return this.inlineDiffWidget?.editorWidget;
        }
        return undefined;
    }
    get notebookOptions() {
        return this._notebookOptions;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    constructor(group, instantiationService, themeService, contextKeyService, notebookEditorWorkerService, configurationService, telemetryService, storageService, notebookService, editorService) {
        super(NotebookTextDiffEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.configurationService = configurationService;
        this.notebookService = notebookService;
        this.editorService = editorService;
        this.creationOptions = getDefaultNotebookCreationOptions();
        this._dimension = undefined;
        this._modifiedWebview = null;
        this._originalWebview = null;
        this._webviewTransparentCover = null;
        this._inlineView = false;
        this._onMouseUp = this._register(new Emitter());
        this.onMouseUp = this._onMouseUp.event;
        this._onDidScroll = this._register(new Emitter());
        this.onDidScroll = this._onDidScroll.event;
        this.onDidChangeScroll = this._onDidScroll.event;
        this._model = null;
        this._modifiedResourceDisposableStore = this._register(new DisposableStore());
        this._insetModifyQueueByOutputId = new SequencerByKey();
        this._onDidDynamicOutputRendered = this._register(new Emitter());
        this.onDidDynamicOutputRendered = this._onDidDynamicOutputRendered.event;
        this._localStore = this._register(new DisposableStore());
        this._onDidChangeSelection = this._register(new Emitter());
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this._isDisposed = false;
        this._currentChangedIndex = observableValue(this, -1);
        this.currentChangedIndex = this._currentChangedIndex;
        this.pendingLayouts = new WeakMap();
        this.diffEditorCalcuator = this.instantiationService.createInstance(DiffEditorHeightCalculatorService, this.fontInfo.lineHeight);
        this._notebookOptions = instantiationService.createInstance(NotebookOptions, this.window, false, undefined);
        this._register(this._notebookOptions);
        this._revealFirst = true;
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
        }
        return this._fontInfo;
    }
    createFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        return FontMeasurements.readFontInfo(this.window, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.window).value));
    }
    isOverviewRulerEnabled() {
        return this.configurationService.getValue(NotebookSetting.diffOverviewRuler) ?? false;
    }
    getSelection() {
        const selections = this._list.getFocus();
        return new NotebookDiffEditorSelection(selections);
    }
    toggleNotebookCellSelection(cell) {
        // throw new Error('Method not implemented.');
    }
    updatePerformanceMetadata(cellId, executionId, duration, rendererId) {
        // throw new Error('Method not implemented.');
    }
    async focusNotebookCell(cell, focus) {
        // throw new Error('Method not implemented.');
    }
    async focusNextNotebookCell(cell, focus) {
        // throw new Error('Method not implemented.');
    }
    didFocusOutputInputChange(inputFocused) {
        // noop
    }
    getScrollTop() {
        return this._list?.scrollTop ?? 0;
    }
    getScrollHeight() {
        return this._list?.scrollHeight ?? 0;
    }
    getScrollPosition() {
        return {
            scrollTop: this.getScrollTop(),
            scrollLeft: this._list?.scrollLeft ?? 0,
        };
    }
    setScrollPosition(scrollPosition) {
        if (!this._list) {
            return;
        }
        this._list.scrollTop = scrollPosition.scrollTop;
        if (scrollPosition.scrollLeft !== undefined) {
            this._list.scrollLeft = scrollPosition.scrollLeft;
        }
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this._list?.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    updateOutputHeight(cellInfo, output, outputHeight, isInit) {
        const diffElement = cellInfo.diffElement;
        const cell = this.getCellByInfo(cellInfo);
        const outputIndex = cell.outputsViewModels.indexOf(output);
        if (diffElement instanceof SideBySideDiffElementViewModel) {
            const info = CellUri.parse(cellInfo.cellUri);
            if (!info) {
                return;
            }
            diffElement.updateOutputHeight(info.notebook.toString() === this._model?.original.resource.toString()
                ? DiffSide.Original
                : DiffSide.Modified, outputIndex, outputHeight);
        }
        else {
            diffElement.updateOutputHeight(diffElement.type === 'insert' ? DiffSide.Modified : DiffSide.Original, outputIndex, outputHeight);
        }
        if (isInit) {
            this._onDidDynamicOutputRendered.fire({ cell, output });
        }
    }
    setMarkupCellEditState(cellId, editState) {
        // throw new Error('Method not implemented.');
    }
    didStartDragMarkupCell(cellId, event) {
        // throw new Error('Method not implemented.');
    }
    didDragMarkupCell(cellId, event) {
        // throw new Error('Method not implemented.');
    }
    didEndDragMarkupCell(cellId) {
        // throw new Error('Method not implemented.');
    }
    didDropMarkupCell(cellId) {
        // throw new Error('Method not implemented.');
    }
    didResizeOutput(cellId) {
        // throw new Error('Method not implemented.');
    }
    async toggleInlineView() {
        this._layoutCancellationTokenSource?.dispose();
        this._inlineView = !this._inlineView;
        if (!this._lastLayoutProperties) {
            return;
        }
        if (this._inlineView) {
            this.layout(this._lastLayoutProperties?.dimension, this._lastLayoutProperties?.position);
            this.inlineDiffWidget?.show(this.input, this._model?.modified.notebook, this._model?.original.notebook, this._options);
        }
        else {
            this.layout(this._lastLayoutProperties?.dimension, this._lastLayoutProperties?.position);
            this.inlineDiffWidget?.hide();
        }
        this._layoutCancellationTokenSource = new CancellationTokenSource();
        this.updateLayout(this._layoutCancellationTokenSource.token);
    }
    createEditor(parent) {
        this._rootElement = DOM.append(parent, DOM.$('.notebook-text-diff-editor'));
        this._overflowContainer = document.createElement('div');
        this._overflowContainer.classList.add('notebook-overflow-widget-container', 'monaco-editor');
        DOM.append(parent, this._overflowContainer);
        const renderers = [
            this.instantiationService.createInstance(CellDiffSingleSideRenderer, this),
            this.instantiationService.createInstance(CellDiffSideBySideRenderer, this),
            this.instantiationService.createInstance(CellDiffPlaceholderRenderer, this),
            this.instantiationService.createInstance(NotebookDocumentMetadataDiffRenderer, this),
        ];
        this._listViewContainer = DOM.append(this._rootElement, DOM.$('.notebook-diff-list-view'));
        this._list = this.instantiationService.createInstance(NotebookTextDiffList, 'NotebookTextDiff', this._listViewContainer, this.instantiationService.createInstance(NotebookCellTextDiffListDelegate, this.window), renderers, this.contextKeyService, {
            setRowLineHeight: false,
            setRowHeight: false,
            supportDynamicHeights: true,
            horizontalScrolling: false,
            keyboardSupport: false,
            mouseSupport: true,
            multipleSelectionSupport: false,
            typeNavigationEnabled: true,
            paddingBottom: 0,
            // transformOptimization: (isMacintosh && isNative) || getTitleBarStyle(this.configurationService, this.environmentService) === 'native',
            styleController: (_suffix) => {
                return this._list;
            },
            overrideStyles: {
                listBackground: editorBackground,
                listActiveSelectionBackground: editorBackground,
                listActiveSelectionForeground: foreground,
                listFocusAndSelectionBackground: editorBackground,
                listFocusAndSelectionForeground: foreground,
                listFocusBackground: editorBackground,
                listFocusForeground: foreground,
                listHoverForeground: foreground,
                listHoverBackground: editorBackground,
                listHoverOutline: focusBorder,
                listFocusOutline: focusBorder,
                listInactiveSelectionBackground: editorBackground,
                listInactiveSelectionForeground: foreground,
                listInactiveFocusBackground: editorBackground,
                listInactiveFocusOutline: editorBackground,
            },
            accessibilityProvider: {
                getAriaLabel() {
                    return null;
                },
                getWidgetAriaLabel() {
                    return nls.localize('notebookTreeAriaLabel', 'Notebook Text Diff');
                },
            },
            // focusNextPreviousDelegate: {
            // 	onFocusNext: (applyFocusNext: () => void) => this._updateForCursorNavigationMode(applyFocusNext),
            // 	onFocusPrevious: (applyFocusPrevious: () => void) => this._updateForCursorNavigationMode(applyFocusPrevious),
            // }
        });
        this.inlineDiffWidget = this._register(this.instantiationService.createInstance(NotebookInlineDiffWidget, this._rootElement, this.group.id, this.window, this.notebookOptions, this._dimension));
        this._register(this._list);
        this._register(this._list.onMouseUp((e) => {
            if (e.element) {
                if (typeof e.index === 'number') {
                    this._list.setFocus([e.index]);
                }
                this._onMouseUp.fire({ event: e.browserEvent, target: e.element });
            }
        }));
        this._register(this._list.onDidScroll(() => {
            this._onDidScroll.fire();
        }));
        this._register(this._list.onDidChangeFocus(() => this._onDidChangeSelection.fire({ reason: 2 /* EditorPaneSelectionChangeReason.USER */ })));
        this._overviewRulerContainer = document.createElement('div');
        this._overviewRulerContainer.classList.add('notebook-overview-ruler-container');
        this._rootElement.appendChild(this._overviewRulerContainer);
        this._registerOverviewRuler();
        // transparent cover
        this._webviewTransparentCover = DOM.append(this._list.rowsContainer, $('.webview-cover'));
        this._webviewTransparentCover.style.display = 'none';
        this._register(DOM.addStandardDisposableGenericMouseDownListener(this._overflowContainer, (e) => {
            if (e.target.classList.contains('slider') && this._webviewTransparentCover) {
                this._webviewTransparentCover.style.display = 'block';
            }
        }));
        this._register(DOM.addStandardDisposableGenericMouseUpListener(this._overflowContainer, () => {
            if (this._webviewTransparentCover) {
                // no matter when
                this._webviewTransparentCover.style.display = 'none';
            }
        }));
        this._register(this._list.onDidScroll((e) => {
            this._webviewTransparentCover.style.top = `${e.scrollTop}px`;
        }));
    }
    _registerOverviewRuler() {
        this._overviewRuler = this._register(this.instantiationService.createInstance(NotebookDiffOverviewRuler, this, NotebookTextDiffEditor_1.ENTIRE_DIFF_OVERVIEW_WIDTH, this._overviewRulerContainer));
    }
    _updateOutputsOffsetsInWebview(scrollTop, scrollHeight, activeWebview, getActiveNestedCell, diffSide) {
        activeWebview.element.style.height = `${scrollHeight}px`;
        if (activeWebview.insetMapping) {
            const updateItems = [];
            const removedItems = [];
            activeWebview.insetMapping.forEach((value, key) => {
                const cell = getActiveNestedCell(value.cellInfo.diffElement);
                if (!cell) {
                    return;
                }
                const viewIndex = this._list.indexOf(value.cellInfo.diffElement);
                if (viewIndex === undefined) {
                    return;
                }
                if (cell.outputsViewModels.indexOf(key) < 0) {
                    // output is already gone
                    removedItems.push(key);
                }
                else {
                    const cellTop = this._list.getCellViewScrollTop(value.cellInfo.diffElement);
                    const outputIndex = cell.outputsViewModels.indexOf(key);
                    const outputOffset = value.cellInfo.diffElement.getOutputOffsetInCell(diffSide, outputIndex);
                    updateItems.push({
                        cell,
                        output: key,
                        cellTop: cellTop,
                        outputOffset: outputOffset,
                        forceDisplay: false,
                    });
                }
            });
            activeWebview.removeInsets(removedItems);
            if (updateItems.length) {
                activeWebview.updateScrollTops(updateItems, []);
            }
        }
    }
    async setInput(input, options, context, token) {
        this.inlineDiffWidget?.hide();
        await super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (this._model !== model) {
            this._detachModel();
            this._attachModel(model);
        }
        this._model = model;
        if (this._model === null) {
            return;
        }
        if (this._inlineView) {
            this._listViewContainer.style.display = 'none';
            this.inlineDiffWidget?.show(input, model.modified.notebook, model.original.notebook, options);
        }
        else {
            this._listViewContainer.style.display = 'block';
            this.inlineDiffWidget?.hide();
        }
        this._revealFirst = true;
        this._modifiedResourceDisposableStore.clear();
        this._layoutCancellationTokenSource = new CancellationTokenSource();
        this._modifiedResourceDisposableStore.add(Event.any(this._model.original.notebook.onDidChangeContent, this._model.modified.notebook.onDidChangeContent)((e) => {
            // If the user has made changes to the notebook whilst in the diff editor,
            // then do not re-compute the diff of the notebook,
            // As change will result in re-computing diff and re-building entire diff view.
            if (this._model !== null && this.editorService.activeEditor !== input) {
                this._layoutCancellationTokenSource?.dispose();
                this._layoutCancellationTokenSource = new CancellationTokenSource();
                this.updateLayout(this._layoutCancellationTokenSource.token);
            }
        }));
        await this._createOriginalWebview(generateUuid(), this._model.original.viewType, this._model.original.resource);
        if (this._originalWebview) {
            this._modifiedResourceDisposableStore.add(this._originalWebview);
        }
        await this._createModifiedWebview(generateUuid(), this._model.modified.viewType, this._model.modified.resource);
        if (this._modifiedWebview) {
            this._modifiedResourceDisposableStore.add(this._modifiedWebview);
        }
        await this.updateLayout(this._layoutCancellationTokenSource.token, options?.cellSelections ? cellRangesToIndexes(options.cellSelections) : undefined);
    }
    setVisible(visible) {
        super.setVisible(visible);
        if (!visible) {
            this.inlineDiffWidget?.hide();
        }
    }
    _detachModel() {
        this._localStore.clear();
        this._originalWebview?.dispose();
        this._originalWebview?.element.remove();
        this._originalWebview = null;
        this._modifiedWebview?.dispose();
        this._modifiedWebview?.element.remove();
        this._modifiedWebview = null;
        this.notebookDiffViewModel?.dispose();
        this.notebookDiffViewModel = undefined;
        this._modifiedResourceDisposableStore.clear();
        this._list.clear();
    }
    _attachModel(model) {
        this._model = model;
        this._eventDispatcher = new NotebookDiffEditorEventDispatcher();
        const updateInsets = () => {
            DOM.scheduleAtNextAnimationFrame(this.window, () => {
                if (this._isDisposed) {
                    return;
                }
                if (this._modifiedWebview) {
                    this._updateOutputsOffsetsInWebview(this._list.scrollTop, this._list.scrollHeight, this._modifiedWebview, (diffElement) => {
                        return diffElement.modified;
                    }, DiffSide.Modified);
                }
                if (this._originalWebview) {
                    this._updateOutputsOffsetsInWebview(this._list.scrollTop, this._list.scrollHeight, this._originalWebview, (diffElement) => {
                        return diffElement.original;
                    }, DiffSide.Original);
                }
            });
        };
        this._localStore.add(this._list.onDidChangeContentHeight(() => {
            updateInsets();
        }));
        this._localStore.add(this._list.onDidChangeFocus((e) => {
            if (e.indexes.length &&
                this.notebookDiffViewModel &&
                e.indexes[0] < this.notebookDiffViewModel.items.length) {
                const selectedItem = this.notebookDiffViewModel.items[e.indexes[0]];
                const changedItems = this.notebookDiffViewModel.items.filter((item) => item.type !== 'unchanged' &&
                    item.type !== 'unchangedMetadata' &&
                    item.type !== 'placeholder');
                if (selectedItem &&
                    selectedItem?.type !== 'placeholder' &&
                    selectedItem?.type !== 'unchanged' &&
                    selectedItem?.type !== 'unchangedMetadata') {
                    return this._currentChangedIndex.set(changedItems.indexOf(selectedItem), undefined);
                }
            }
            return this._currentChangedIndex.set(-1, undefined);
        }));
        this._localStore.add(this._eventDispatcher.onDidChangeCellLayout(() => {
            updateInsets();
        }));
        const vm = (this.notebookDiffViewModel = this._register(new NotebookDiffViewModel(this._model, this.notebookEditorWorkerService, this.configurationService, this._eventDispatcher, this.notebookService, this.diffEditorCalcuator, this.fontInfo, undefined)));
        this._localStore.add(this.notebookDiffViewModel.onDidChangeItems((e) => {
            this._originalWebview?.removeInsets([...this._originalWebview?.insetMapping.keys()]);
            this._modifiedWebview?.removeInsets([...this._modifiedWebview?.insetMapping.keys()]);
            if (this._revealFirst &&
                typeof e.firstChangeIndex === 'number' &&
                e.firstChangeIndex > -1 &&
                e.firstChangeIndex < this._list.length) {
                this._revealFirst = false;
                this._list.setFocus([e.firstChangeIndex]);
                this._list.reveal(e.firstChangeIndex, 0.3);
            }
            this._list.splice(e.start, e.deleteCount, e.elements);
            if (this.isOverviewRulerEnabled()) {
                this._overviewRuler.updateViewModels(vm.items, this._eventDispatcher);
            }
        }));
    }
    async _createModifiedWebview(id, viewType, resource) {
        this._modifiedWebview?.dispose();
        this._modifiedWebview = this.instantiationService.createInstance(BackLayerWebView, this, id, viewType, resource, {
            ...this._notebookOptions.computeDiffWebviewOptions(),
            fontFamily: this._generateFontFamily(),
        }, undefined);
        // attach the webview container to the DOM tree first
        this._list.rowsContainer.insertAdjacentElement('afterbegin', this._modifiedWebview.element);
        this._modifiedWebview.createWebview(this.window);
        this._modifiedWebview.element.style.width = `calc(50% - 16px)`;
        this._modifiedWebview.element.style.left = `calc(50%)`;
    }
    _generateFontFamily() {
        return (this.fontInfo.fontFamily ??
            `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`);
    }
    async _createOriginalWebview(id, viewType, resource) {
        this._originalWebview?.dispose();
        this._originalWebview = this.instantiationService.createInstance(BackLayerWebView, this, id, viewType, resource, {
            ...this._notebookOptions.computeDiffWebviewOptions(),
            fontFamily: this._generateFontFamily(),
        }, undefined);
        // attach the webview container to the DOM tree first
        this._list.rowsContainer.insertAdjacentElement('afterbegin', this._originalWebview.element);
        this._originalWebview.createWebview(this.window);
        this._originalWebview.element.style.width = `calc(50% - 16px)`;
        this._originalWebview.element.style.left = `16px`;
    }
    setOptions(options) {
        const selections = options?.cellSelections
            ? cellRangesToIndexes(options.cellSelections)
            : undefined;
        if (selections) {
            this._list.setFocus(selections);
        }
    }
    async updateLayout(token, selections) {
        if (!this._model || !this.notebookDiffViewModel) {
            return;
        }
        await this.notebookDiffViewModel.computeDiff(token);
        if (token.isCancellationRequested) {
            // after await the editor might be disposed.
            return;
        }
        if (selections) {
            this._list.setFocus(selections);
        }
    }
    scheduleOutputHeightAck(cellInfo, outputId, height) {
        const diffElement = cellInfo.diffElement;
        // const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
        let diffSide = DiffSide.Original;
        if (diffElement instanceof SideBySideDiffElementViewModel) {
            const info = CellUri.parse(cellInfo.cellUri);
            if (!info) {
                return;
            }
            diffSide =
                info.notebook.toString() === this._model?.original.resource.toString()
                    ? DiffSide.Original
                    : DiffSide.Modified;
        }
        else {
            diffSide = diffElement.type === 'insert' ? DiffSide.Modified : DiffSide.Original;
        }
        const webview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
        DOM.scheduleAtNextAnimationFrame(this.window, () => {
            webview?.ackHeight([{ cellId: cellInfo.cellId, outputId, height }]);
        }, 10);
    }
    layoutNotebookCell(cell, height) {
        const relayout = (cell, height) => {
            this._list.updateElementHeight2(cell, height);
        };
        let disposable = this.pendingLayouts.get(cell);
        if (disposable) {
            this._localStore.delete(disposable);
        }
        let r;
        const layoutDisposable = DOM.scheduleAtNextAnimationFrame(this.window, () => {
            this.pendingLayouts.delete(cell);
            relayout(cell, height);
            r();
        });
        disposable = toDisposable(() => {
            layoutDisposable.dispose();
            r();
        });
        this._localStore.add(disposable);
        this.pendingLayouts.set(cell, disposable);
        return new Promise((resolve) => {
            r = resolve;
        });
    }
    setScrollTop(scrollTop) {
        this._list.scrollTop = scrollTop;
    }
    triggerScroll(event) {
        this._list.triggerScrollFromMouseWheelEvent(event);
    }
    firstChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        // go to the first one
        const currentViewModels = this.notebookDiffViewModel.items;
        const index = currentViewModels.findIndex((vm) => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
        if (index >= 0) {
            this._list.setFocus([index]);
            this._list.reveal(index);
        }
    }
    lastChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        // go to the first one
        const currentViewModels = this.notebookDiffViewModel.items;
        const item = currentViewModels
            .slice()
            .reverse()
            .find((vm) => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
        const index = item ? currentViewModels.indexOf(item) : -1;
        if (index >= 0) {
            this._list.setFocus([index]);
            this._list.reveal(index);
        }
    }
    previousChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        let currFocus = this._list.getFocus()[0];
        if (isNaN(currFocus) || currFocus < 0) {
            currFocus = 0;
        }
        // find the index of previous change
        let prevChangeIndex = currFocus - 1;
        const currentViewModels = this.notebookDiffViewModel.items;
        while (prevChangeIndex >= 0) {
            const vm = currentViewModels[prevChangeIndex];
            if (vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder') {
                break;
            }
            prevChangeIndex--;
        }
        if (prevChangeIndex >= 0) {
            this._list.setFocus([prevChangeIndex]);
            this._list.reveal(prevChangeIndex);
        }
        else {
            // go to the last one
            const index = findLastIdx(currentViewModels, (vm) => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
            if (index >= 0) {
                this._list.setFocus([index]);
                this._list.reveal(index);
            }
        }
    }
    nextChange() {
        if (!this.notebookDiffViewModel) {
            return;
        }
        let currFocus = this._list.getFocus()[0];
        if (isNaN(currFocus) || currFocus < 0) {
            currFocus = 0;
        }
        // find the index of next change
        let nextChangeIndex = currFocus + 1;
        const currentViewModels = this.notebookDiffViewModel.items;
        while (nextChangeIndex < currentViewModels.length) {
            const vm = currentViewModels[nextChangeIndex];
            if (vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder') {
                break;
            }
            nextChangeIndex++;
        }
        if (nextChangeIndex < currentViewModels.length) {
            this._list.setFocus([nextChangeIndex]);
            this._list.reveal(nextChangeIndex);
        }
        else {
            // go to the first one
            const index = currentViewModels.findIndex((vm) => vm.type !== 'unchanged' && vm.type !== 'unchangedMetadata' && vm.type !== 'placeholder');
            if (index >= 0) {
                this._list.setFocus([index]);
                this._list.reveal(index);
            }
        }
    }
    createOutput(cellDiffViewModel, cellViewModel, output, getOffset, diffSide) {
        this._insetModifyQueueByOutputId.queue(output.source.model.outputId + (diffSide === DiffSide.Modified ? '-right' : 'left'), async () => {
            const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
            if (!activeWebview) {
                return;
            }
            if (!activeWebview.insetMapping.has(output.source)) {
                const cellTop = this._list.getCellViewScrollTop(cellDiffViewModel);
                await activeWebview.createOutput({
                    diffElement: cellDiffViewModel,
                    cellHandle: cellViewModel.handle,
                    cellId: cellViewModel.id,
                    cellUri: cellViewModel.uri,
                }, output, cellTop, getOffset());
            }
            else {
                const cellTop = this._list.getCellViewScrollTop(cellDiffViewModel);
                const outputIndex = cellViewModel.outputsViewModels.indexOf(output.source);
                const outputOffset = cellDiffViewModel.getOutputOffsetInCell(diffSide, outputIndex);
                activeWebview.updateScrollTops([
                    {
                        cell: cellViewModel,
                        output: output.source,
                        cellTop,
                        outputOffset,
                        forceDisplay: true,
                    },
                ], []);
            }
        });
    }
    updateMarkupCellHeight() {
        // TODO
    }
    getCellByInfo(cellInfo) {
        return cellInfo.diffElement.getCellByUri(cellInfo.cellUri);
    }
    getCellById(cellId) {
        throw new Error('Not implemented');
    }
    removeInset(cellDiffViewModel, cellViewModel, displayOutput, diffSide) {
        this._insetModifyQueueByOutputId.queue(displayOutput.model.outputId + (diffSide === DiffSide.Modified ? '-right' : 'left'), async () => {
            const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
            if (!activeWebview) {
                return;
            }
            if (!activeWebview.insetMapping.has(displayOutput)) {
                return;
            }
            activeWebview.removeInsets([displayOutput]);
        });
    }
    showInset(cellDiffViewModel, cellViewModel, displayOutput, diffSide) {
        this._insetModifyQueueByOutputId.queue(displayOutput.model.outputId + (diffSide === DiffSide.Modified ? '-right' : 'left'), async () => {
            const activeWebview = diffSide === DiffSide.Modified ? this._modifiedWebview : this._originalWebview;
            if (!activeWebview) {
                return;
            }
            if (!activeWebview.insetMapping.has(displayOutput)) {
                return;
            }
            const cellTop = this._list.getCellViewScrollTop(cellDiffViewModel);
            const outputIndex = cellViewModel.outputsViewModels.indexOf(displayOutput);
            const outputOffset = cellDiffViewModel.getOutputOffsetInCell(diffSide, outputIndex);
            activeWebview.updateScrollTops([
                {
                    cell: cellViewModel,
                    output: displayOutput,
                    cellTop,
                    outputOffset,
                    forceDisplay: true,
                },
            ], []);
        });
    }
    hideInset(cellDiffViewModel, cellViewModel, output) {
        this._modifiedWebview?.hideInset(output);
        this._originalWebview?.hideInset(output);
    }
    // private async _resolveWebview(rightEditor: boolean): Promise<BackLayerWebView | null> {
    // 	if (rightEditor) {
    // 	}
    // }
    getDomNode() {
        return this._rootElement;
    }
    getOverflowContainerDomNode() {
        return this._overflowContainer;
    }
    getControl() {
        return this;
    }
    clearInput() {
        this.inlineDiffWidget?.hide();
        super.clearInput();
        this._modifiedResourceDisposableStore.clear();
        this._list?.splice(0, this._list?.length || 0);
        this._model = null;
        this.notebookDiffViewModel?.dispose();
        this.notebookDiffViewModel = undefined;
    }
    deltaCellOutputContainerClassNames(diffSide, cellId, added, removed) {
        if (diffSide === DiffSide.Original) {
            this._originalWebview?.deltaCellOutputContainerClassNames(cellId, added, removed);
        }
        else {
            this._modifiedWebview?.deltaCellOutputContainerClassNames(cellId, added, removed);
        }
    }
    getLayoutInfo() {
        if (!this._list) {
            throw new Error('Editor is not initalized successfully');
        }
        return {
            width: this._dimension.width,
            height: this._dimension.height,
            fontInfo: this.fontInfo,
            scrollHeight: this._list?.getScrollHeight() ?? 0,
            stickyHeight: 0,
        };
    }
    layout(dimension, position) {
        this._rootElement.classList.toggle('mid-width', dimension.width < 1000 && dimension.width >= 600);
        this._rootElement.classList.toggle('narrow-width', dimension.width < 600);
        const overviewRulerEnabled = this.isOverviewRulerEnabled();
        this._dimension = dimension.with(dimension.width -
            (overviewRulerEnabled ? NotebookTextDiffEditor_1.ENTIRE_DIFF_OVERVIEW_WIDTH : 0));
        this._listViewContainer.style.height = `${dimension.height}px`;
        this._listViewContainer.style.width = `${this._dimension.width}px`;
        if (this._inlineView) {
            this._listViewContainer.style.display = 'none';
            this.inlineDiffWidget?.setLayout(dimension, position);
        }
        else {
            this.inlineDiffWidget?.hide();
            this._listViewContainer.style.display = 'block';
            this._list?.layout(this._dimension.height, this._dimension.width);
            if (this._modifiedWebview) {
                this._modifiedWebview.element.style.width = `calc(50% - 16px)`;
                this._modifiedWebview.element.style.left = `calc(50%)`;
            }
            if (this._originalWebview) {
                this._originalWebview.element.style.width = `calc(50% - 16px)`;
                this._originalWebview.element.style.left = `16px`;
            }
            if (this._webviewTransparentCover) {
                this._webviewTransparentCover.style.height = `${this._dimension.height}px`;
                this._webviewTransparentCover.style.width = `${this._dimension.width}px`;
            }
            if (overviewRulerEnabled) {
                this._overviewRuler.layout();
            }
        }
        this._lastLayoutProperties = { dimension, position };
        this._eventDispatcher?.emit([
            new NotebookDiffLayoutChangedEvent({ width: true, fontInfo: true }, this.getLayoutInfo()),
        ]);
    }
    dispose() {
        this._isDisposed = true;
        this._layoutCancellationTokenSource?.dispose();
        this._detachModel();
        super.dispose();
    }
};
NotebookTextDiffEditor = NotebookTextDiffEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, INotebookEditorWorkerService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, IStorageService),
    __param(8, INotebookService),
    __param(9, IEditorService)
], NotebookTextDiffEditor);
export { NotebookTextDiffEditor };
registerZIndex(ZIndex.Base, 10, 'notebook-diff-view-viewport-slider');
registerThemingParticipant((theme, collector) => {
    const diffDiagonalFillColor = theme.getColor(diffDiagonalFill);
    collector.addRule(`
	.notebook-text-diff-editor .diagonal-fill {
		background-image: linear-gradient(
			-45deg,
			${diffDiagonalFillColor} 12.5%,
			#0000 12.5%, #0000 50%,
			${diffDiagonalFillColor} 50%, ${diffDiagonalFillColor} 62.5%,
			#0000 62.5%, #0000 100%
		);
		background-size: 8px 8px;
	}
	`);
    collector.addRule(`.notebook-text-diff-editor .cell-body { margin: ${DIFF_CELL_MARGIN}px; }`);
    // We do not want a left margin, as we add an overlay for expanind the collapsed/hidden cells.
    collector.addRule(`.notebook-text-diff-editor .cell-placeholder-body { margin: ${DIFF_CELL_MARGIN}px 0; }`);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQ04sYUFBYSxFQUNiLDBCQUEwQixHQUMxQixNQUFNLHNEQUFzRCxDQUFBO0FBVzdELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRzlFLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLDJCQUEyQixFQUMzQiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLGdDQUFnQyxFQUNoQyxvQ0FBb0MsRUFDcEMsb0JBQW9CLEdBQ3BCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsV0FB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