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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL25vdGVib29rRGlmZkVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUNOLGFBQWEsRUFDYiwwQkFBMEIsR0FDMUIsTUFBTSxzREFBc0QsQ0FBQTtBQVc3RCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUc5RSxPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLDJCQUEyQixDQUFBO0FBQ2xDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFDTiwyQkFBMkIsRUFDM0IsMEJBQTBCLEVBQzFCLDBCQUEwQixFQUMxQixnQ0FBZ0MsRUFDaEMsb0NBQW9DLEVBQ3BDLG9CQUFvQixHQUNwQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLFdBQVcsRUFDWCxVQUFVLEdBQ1YsTUFBTSx1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