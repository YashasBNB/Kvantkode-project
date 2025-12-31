/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { DiffEditorWidget } from '../../../../../editor/browser/widget/diffEditor/diffEditorWidget.js';
import { getEditorPadding } from './diffCellEditorOptions.js';
import { DiffNestedCellViewModel } from './diffNestedCellViewModel.js';
import { NotebookDiffViewEventType } from './eventDispatcher.js';
import { DIFF_CELL_MARGIN, DiffSide, } from './notebookDiffEditorBrowser.js';
import { CellLayoutState } from '../notebookBrowser.js';
import { getFormattedMetadataJSON, } from '../../common/model/notebookCellTextModel.js';
import { CellUri, } from '../../common/notebookCommon.js';
import { Schemas } from '../../../../../base/common/network.js';
import { NotebookDocumentMetadataTextModel } from '../../common/model/notebookMetadataTextModel.js';
const PropertyHeaderHeight = 25;
// From `.monaco-editor .diff-hidden-lines .center` in src/vs/editor/browser/widget/diffEditor/style.css
export const HeightOfHiddenLinesRegionInDiffEditor = 24;
export const DefaultLineHeight = 17;
export var PropertyFoldingState;
(function (PropertyFoldingState) {
    PropertyFoldingState[PropertyFoldingState["Expanded"] = 0] = "Expanded";
    PropertyFoldingState[PropertyFoldingState["Collapsed"] = 1] = "Collapsed";
})(PropertyFoldingState || (PropertyFoldingState = {}));
export const OUTPUT_EDITOR_HEIGHT_MAGIC = 1440;
export class DiffElementViewModelBase extends Disposable {
    constructor(mainDocumentTextModel, editorEventDispatcher, initData) {
        super();
        this.mainDocumentTextModel = mainDocumentTextModel;
        this.editorEventDispatcher = editorEventDispatcher;
        this.initData = initData;
        this._layoutInfoEmitter = this._register(new Emitter());
        this.onDidLayoutChange = this._layoutInfoEmitter.event;
        this._register(this.editorEventDispatcher.onDidChangeLayout((e) => this._layoutInfoEmitter.fire({ outerWidth: true })));
    }
}
export class DiffElementPlaceholderViewModel extends DiffElementViewModelBase {
    constructor(mainDocumentTextModel, editorEventDispatcher, initData) {
        super(mainDocumentTextModel, editorEventDispatcher, initData);
        this.type = 'placeholder';
        this.hiddenCells = [];
        this._unfoldHiddenCells = this._register(new Emitter());
        this.onUnfoldHiddenCells = this._unfoldHiddenCells.event;
        this.renderOutput = false;
    }
    get totalHeight() {
        return 24 + 2 * DIFF_CELL_MARGIN;
    }
    getHeight(_) {
        return this.totalHeight;
    }
    layoutChange() {
        //
    }
    showHiddenCells() {
        this._unfoldHiddenCells.fire();
    }
}
export class NotebookDocumentMetadataViewModel extends DiffElementViewModelBase {
    set editorHeight(height) {
        this._layout({ editorHeight: height });
    }
    get editorHeight() {
        throw new Error('Use Cell.layoutInfo.editorHeight');
    }
    set editorMargin(margin) {
        this._layout({ editorMargin: margin });
    }
    get editorMargin() {
        throw new Error('Use Cell.layoutInfo.editorMargin');
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get totalHeight() {
        return this.layoutInfo.totalHeight;
    }
    constructor(originalDocumentTextModel, modifiedDocumentTextModel, type, editorEventDispatcher, initData, notebookService, editorHeightCalculator) {
        super(originalDocumentTextModel, editorEventDispatcher, initData);
        this.originalDocumentTextModel = originalDocumentTextModel;
        this.modifiedDocumentTextModel = modifiedDocumentTextModel;
        this.type = type;
        this.editorHeightCalculator = editorHeightCalculator;
        this.renderOutput = false;
        this._sourceEditorViewState = null;
        const cellStatusHeight = PropertyHeaderHeight;
        this._layoutInfo = {
            width: 0,
            editorHeight: 0,
            editorMargin: 0,
            metadataHeight: 0,
            cellStatusHeight,
            metadataStatusHeight: 0,
            rawOutputHeight: 0,
            outputTotalHeight: 0,
            outputStatusHeight: 0,
            outputMetadataHeight: 0,
            bodyMargin: 32,
            totalHeight: 82 + cellStatusHeight + 0,
            layoutState: CellLayoutState.Uninitialized,
        };
        this.cellFoldingState =
            type === 'modifiedMetadata' ? PropertyFoldingState.Expanded : PropertyFoldingState.Collapsed;
        this.originalMetadata = this._register(new NotebookDocumentMetadataTextModel(originalDocumentTextModel));
        this.modifiedMetadata = this._register(new NotebookDocumentMetadataTextModel(modifiedDocumentTextModel));
    }
    async computeHeights() {
        if (this.type === 'unchangedMetadata') {
            this.editorHeight = this.editorHeightCalculator.computeHeightFromLines(this.originalMetadata.textBuffer.getLineCount());
        }
        else {
            const original = this.originalMetadata.uri;
            const modified = this.modifiedMetadata.uri;
            this.editorHeight = await this.editorHeightCalculator.diffAndComputeHeight(original, modified);
        }
    }
    layoutChange() {
        this._layout({ recomputeOutput: true });
    }
    _layout(delta) {
        const width = delta.width !== undefined ? delta.width : this._layoutInfo.width;
        const editorHeight = delta.editorHeight !== undefined ? delta.editorHeight : this._layoutInfo.editorHeight;
        const editorMargin = delta.editorMargin !== undefined ? delta.editorMargin : this._layoutInfo.editorMargin;
        const cellStatusHeight = delta.cellStatusHeight !== undefined
            ? delta.cellStatusHeight
            : this._layoutInfo.cellStatusHeight;
        const bodyMargin = delta.bodyMargin !== undefined ? delta.bodyMargin : this._layoutInfo.bodyMargin;
        const totalHeight = editorHeight + editorMargin + cellStatusHeight + bodyMargin;
        const newLayout = {
            width: width,
            editorHeight: editorHeight,
            editorMargin: editorMargin,
            metadataHeight: 0,
            cellStatusHeight,
            metadataStatusHeight: 0,
            outputTotalHeight: 0,
            outputStatusHeight: 0,
            bodyMargin: bodyMargin,
            rawOutputHeight: 0,
            outputMetadataHeight: 0,
            totalHeight: totalHeight,
            layoutState: CellLayoutState.Measured,
        };
        let somethingChanged = false;
        const changeEvent = {};
        if (newLayout.width !== this._layoutInfo.width) {
            changeEvent.width = true;
            somethingChanged = true;
        }
        if (newLayout.editorHeight !== this._layoutInfo.editorHeight) {
            changeEvent.editorHeight = true;
            somethingChanged = true;
        }
        if (newLayout.editorMargin !== this._layoutInfo.editorMargin) {
            changeEvent.editorMargin = true;
            somethingChanged = true;
        }
        if (newLayout.cellStatusHeight !== this._layoutInfo.cellStatusHeight) {
            changeEvent.cellStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.bodyMargin !== this._layoutInfo.bodyMargin) {
            changeEvent.bodyMargin = true;
            somethingChanged = true;
        }
        if (newLayout.totalHeight !== this._layoutInfo.totalHeight) {
            changeEvent.totalHeight = true;
            somethingChanged = true;
        }
        if (somethingChanged) {
            this._layoutInfo = newLayout;
            this._fireLayoutChangeEvent(changeEvent);
        }
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            const editorHeight = this.cellFoldingState === PropertyFoldingState.Collapsed
                ? 0
                : this.computeInputEditorHeight(lineHeight);
            return this._computeTotalHeight(editorHeight);
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    _computeTotalHeight(editorHeight) {
        const totalHeight = editorHeight +
            this._layoutInfo.editorMargin +
            this._layoutInfo.metadataHeight +
            this._layoutInfo.cellStatusHeight +
            this._layoutInfo.metadataStatusHeight +
            this._layoutInfo.outputTotalHeight +
            this._layoutInfo.outputStatusHeight +
            this._layoutInfo.outputMetadataHeight +
            this._layoutInfo.bodyMargin;
        return totalHeight;
    }
    computeInputEditorHeight(_lineHeight) {
        return this.editorHeightCalculator.computeHeightFromLines(Math.max(this.originalMetadata.textBuffer.getLineCount(), this.modifiedMetadata.textBuffer.getLineCount()));
    }
    _fireLayoutChangeEvent(state) {
        this._layoutInfoEmitter.fire(state);
        this.editorEventDispatcher.emit([
            { type: NotebookDiffViewEventType.CellLayoutChanged, source: this._layoutInfo },
        ]);
    }
    getComputedCellContainerWidth(layoutInfo, diffEditor, fullWidth) {
        if (fullWidth) {
            return (layoutInfo.width -
                2 * DIFF_CELL_MARGIN +
                (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0) -
                2);
        }
        return ((layoutInfo.width -
            2 * DIFF_CELL_MARGIN +
            (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0)) /
            2 -
            18 -
            2);
    }
    getSourceEditorViewState() {
        return this._sourceEditorViewState;
    }
    saveSpirceEditorViewState(viewState) {
        this._sourceEditorViewState = viewState;
    }
}
export class DiffElementCellViewModelBase extends DiffElementViewModelBase {
    hideUnchangedCells() {
        this._hideUnchangedCells.fire();
    }
    set rawOutputHeight(height) {
        this._layout({ rawOutputHeight: Math.min(OUTPUT_EDITOR_HEIGHT_MAGIC, height) });
    }
    get rawOutputHeight() {
        throw new Error('Use Cell.layoutInfo.rawOutputHeight');
    }
    set outputStatusHeight(height) {
        this._layout({ outputStatusHeight: height });
    }
    get outputStatusHeight() {
        throw new Error('Use Cell.layoutInfo.outputStatusHeight');
    }
    set outputMetadataHeight(height) {
        this._layout({ outputMetadataHeight: height });
    }
    get outputMetadataHeight() {
        throw new Error('Use Cell.layoutInfo.outputStatusHeight');
    }
    set editorHeight(height) {
        this._layout({ editorHeight: height });
    }
    get editorHeight() {
        throw new Error('Use Cell.layoutInfo.editorHeight');
    }
    set editorMargin(margin) {
        this._layout({ editorMargin: margin });
    }
    get editorMargin() {
        throw new Error('Use Cell.layoutInfo.editorMargin');
    }
    set metadataStatusHeight(height) {
        this._layout({ metadataStatusHeight: height });
    }
    get metadataStatusHeight() {
        throw new Error('Use Cell.layoutInfo.outputStatusHeight');
    }
    set metadataHeight(height) {
        this._layout({ metadataHeight: height });
    }
    get metadataHeight() {
        throw new Error('Use Cell.layoutInfo.metadataHeight');
    }
    set renderOutput(value) {
        this._renderOutput = value;
        this._layout({ recomputeOutput: true });
        this._stateChangeEmitter.fire({ renderOutput: this._renderOutput });
    }
    get renderOutput() {
        return this._renderOutput;
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get totalHeight() {
        return this.layoutInfo.totalHeight;
    }
    get ignoreOutputs() {
        return (this.configurationService.getValue('notebook.diff.ignoreOutputs') ||
            !!this.mainDocumentTextModel?.transientOptions.transientOutputs);
    }
    get ignoreMetadata() {
        return this.configurationService.getValue('notebook.diff.ignoreMetadata');
    }
    constructor(mainDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, index, configurationService, diffEditorHeightCalculator) {
        super(mainDocumentTextModel, editorEventDispatcher, initData);
        this.type = type;
        this.index = index;
        this.configurationService = configurationService;
        this.diffEditorHeightCalculator = diffEditorHeightCalculator;
        this._stateChangeEmitter = this._register(new Emitter());
        this.onDidStateChange = this._stateChangeEmitter.event;
        this._hideUnchangedCells = this._register(new Emitter());
        this.onHideUnchangedCells = this._hideUnchangedCells.event;
        this._renderOutput = true;
        this._sourceEditorViewState = null;
        this._outputEditorViewState = null;
        this._metadataEditorViewState = null;
        this.original = original
            ? this._register(new DiffNestedCellViewModel(original, notebookService))
            : undefined;
        this.modified = modified
            ? this._register(new DiffNestedCellViewModel(modified, notebookService))
            : undefined;
        const editorHeight = this._estimateEditorHeight(initData.fontInfo);
        const cellStatusHeight = PropertyHeaderHeight;
        this._layoutInfo = {
            width: 0,
            editorHeight: editorHeight,
            editorMargin: 0,
            metadataHeight: 0,
            cellStatusHeight,
            metadataStatusHeight: this.ignoreMetadata ? 0 : PropertyHeaderHeight,
            rawOutputHeight: 0,
            outputTotalHeight: 0,
            outputStatusHeight: this.ignoreOutputs ? 0 : PropertyHeaderHeight,
            outputMetadataHeight: 0,
            bodyMargin: 32,
            totalHeight: 82 + cellStatusHeight + editorHeight,
            layoutState: CellLayoutState.Uninitialized,
        };
        this.cellFoldingState =
            modified?.getTextBufferHash() !== original?.getTextBufferHash()
                ? PropertyFoldingState.Expanded
                : PropertyFoldingState.Collapsed;
        this.metadataFoldingState = PropertyFoldingState.Collapsed;
        this.outputFoldingState = PropertyFoldingState.Collapsed;
    }
    layoutChange() {
        this._layout({ recomputeOutput: true });
    }
    _estimateEditorHeight(fontInfo) {
        const lineHeight = fontInfo?.lineHeight ?? 17;
        switch (this.type) {
            case 'unchanged':
            case 'insert': {
                const lineCount = this.modified.textModel.textBuffer.getLineCount();
                const editorHeight = lineCount * lineHeight +
                    getEditorPadding(lineCount).top +
                    getEditorPadding(lineCount).bottom;
                return editorHeight;
            }
            case 'delete':
            case 'modified': {
                const lineCount = this.original.textModel.textBuffer.getLineCount();
                const editorHeight = lineCount * lineHeight +
                    getEditorPadding(lineCount).top +
                    getEditorPadding(lineCount).bottom;
                return editorHeight;
            }
        }
    }
    _layout(delta) {
        const width = delta.width !== undefined ? delta.width : this._layoutInfo.width;
        const editorHeight = delta.editorHeight !== undefined ? delta.editorHeight : this._layoutInfo.editorHeight;
        const editorMargin = delta.editorMargin !== undefined ? delta.editorMargin : this._layoutInfo.editorMargin;
        const metadataHeight = delta.metadataHeight !== undefined ? delta.metadataHeight : this._layoutInfo.metadataHeight;
        const cellStatusHeight = delta.cellStatusHeight !== undefined
            ? delta.cellStatusHeight
            : this._layoutInfo.cellStatusHeight;
        const metadataStatusHeight = delta.metadataStatusHeight !== undefined
            ? delta.metadataStatusHeight
            : this._layoutInfo.metadataStatusHeight;
        const rawOutputHeight = delta.rawOutputHeight !== undefined ? delta.rawOutputHeight : this._layoutInfo.rawOutputHeight;
        const outputStatusHeight = delta.outputStatusHeight !== undefined
            ? delta.outputStatusHeight
            : this._layoutInfo.outputStatusHeight;
        const bodyMargin = delta.bodyMargin !== undefined ? delta.bodyMargin : this._layoutInfo.bodyMargin;
        const outputMetadataHeight = delta.outputMetadataHeight !== undefined
            ? delta.outputMetadataHeight
            : this._layoutInfo.outputMetadataHeight;
        const outputHeight = this.ignoreOutputs
            ? 0
            : delta.recomputeOutput ||
                delta.rawOutputHeight !== undefined ||
                delta.outputMetadataHeight !== undefined
                ? this._getOutputTotalHeight(rawOutputHeight, outputMetadataHeight)
                : this._layoutInfo.outputTotalHeight;
        const totalHeight = editorHeight +
            editorMargin +
            cellStatusHeight +
            metadataHeight +
            metadataStatusHeight +
            outputHeight +
            outputStatusHeight +
            bodyMargin;
        const newLayout = {
            width: width,
            editorHeight: editorHeight,
            editorMargin: editorMargin,
            metadataHeight: metadataHeight,
            cellStatusHeight,
            metadataStatusHeight: metadataStatusHeight,
            outputTotalHeight: outputHeight,
            outputStatusHeight: outputStatusHeight,
            bodyMargin: bodyMargin,
            rawOutputHeight: rawOutputHeight,
            outputMetadataHeight: outputMetadataHeight,
            totalHeight: totalHeight,
            layoutState: CellLayoutState.Measured,
        };
        let somethingChanged = false;
        const changeEvent = {};
        if (newLayout.width !== this._layoutInfo.width) {
            changeEvent.width = true;
            somethingChanged = true;
        }
        if (newLayout.editorHeight !== this._layoutInfo.editorHeight) {
            changeEvent.editorHeight = true;
            somethingChanged = true;
        }
        if (newLayout.editorMargin !== this._layoutInfo.editorMargin) {
            changeEvent.editorMargin = true;
            somethingChanged = true;
        }
        if (newLayout.metadataHeight !== this._layoutInfo.metadataHeight) {
            changeEvent.metadataHeight = true;
            somethingChanged = true;
        }
        if (newLayout.cellStatusHeight !== this._layoutInfo.cellStatusHeight) {
            changeEvent.cellStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.metadataStatusHeight !== this._layoutInfo.metadataStatusHeight) {
            changeEvent.metadataStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.outputTotalHeight !== this._layoutInfo.outputTotalHeight) {
            changeEvent.outputTotalHeight = true;
            somethingChanged = true;
        }
        if (newLayout.outputStatusHeight !== this._layoutInfo.outputStatusHeight) {
            changeEvent.outputStatusHeight = true;
            somethingChanged = true;
        }
        if (newLayout.bodyMargin !== this._layoutInfo.bodyMargin) {
            changeEvent.bodyMargin = true;
            somethingChanged = true;
        }
        if (newLayout.outputMetadataHeight !== this._layoutInfo.outputMetadataHeight) {
            changeEvent.outputMetadataHeight = true;
            somethingChanged = true;
        }
        if (newLayout.totalHeight !== this._layoutInfo.totalHeight) {
            changeEvent.totalHeight = true;
            somethingChanged = true;
        }
        if (somethingChanged) {
            this._layoutInfo = newLayout;
            this._fireLayoutChangeEvent(changeEvent);
        }
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            const editorHeight = this.cellFoldingState === PropertyFoldingState.Collapsed
                ? 0
                : this.computeInputEditorHeight(lineHeight);
            return this._computeTotalHeight(editorHeight);
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    _computeTotalHeight(editorHeight) {
        const totalHeight = editorHeight +
            this._layoutInfo.editorMargin +
            this._layoutInfo.metadataHeight +
            this._layoutInfo.cellStatusHeight +
            this._layoutInfo.metadataStatusHeight +
            this._layoutInfo.outputTotalHeight +
            this._layoutInfo.outputStatusHeight +
            this._layoutInfo.outputMetadataHeight +
            this._layoutInfo.bodyMargin;
        return totalHeight;
    }
    computeInputEditorHeight(lineHeight) {
        const lineCount = Math.max(this.original?.textModel.textBuffer.getLineCount() ?? 1, this.modified?.textModel.textBuffer.getLineCount() ?? 1);
        return this.diffEditorHeightCalculator.computeHeightFromLines(lineCount);
    }
    _getOutputTotalHeight(rawOutputHeight, metadataHeight) {
        if (this.outputFoldingState === PropertyFoldingState.Collapsed) {
            return 0;
        }
        if (this.renderOutput) {
            if (this.isOutputEmpty()) {
                // single line;
                return 24;
            }
            return this.getRichOutputTotalHeight() + metadataHeight;
        }
        else {
            return rawOutputHeight;
        }
    }
    _fireLayoutChangeEvent(state) {
        this._layoutInfoEmitter.fire(state);
        this.editorEventDispatcher.emit([
            { type: NotebookDiffViewEventType.CellLayoutChanged, source: this._layoutInfo },
        ]);
    }
    getComputedCellContainerWidth(layoutInfo, diffEditor, fullWidth) {
        if (fullWidth) {
            return (layoutInfo.width -
                2 * DIFF_CELL_MARGIN +
                (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0) -
                2);
        }
        return ((layoutInfo.width -
            2 * DIFF_CELL_MARGIN +
            (diffEditor ? DiffEditorWidget.ENTIRE_DIFF_OVERVIEW_WIDTH : 0)) /
            2 -
            18 -
            2);
    }
    getOutputEditorViewState() {
        return this._outputEditorViewState;
    }
    saveOutputEditorViewState(viewState) {
        this._outputEditorViewState = viewState;
    }
    getMetadataEditorViewState() {
        return this._metadataEditorViewState;
    }
    saveMetadataEditorViewState(viewState) {
        this._metadataEditorViewState = viewState;
    }
    getSourceEditorViewState() {
        return this._sourceEditorViewState;
    }
    saveSpirceEditorViewState(viewState) {
        this._sourceEditorViewState = viewState;
    }
}
export class SideBySideDiffElementViewModel extends DiffElementCellViewModelBase {
    get originalDocument() {
        return this.otherDocumentTextModel;
    }
    get modifiedDocument() {
        return this.mainDocumentTextModel;
    }
    constructor(mainDocumentTextModel, otherDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, configurationService, index, diffEditorHeightCalculator) {
        super(mainDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, index, configurationService, diffEditorHeightCalculator);
        this.otherDocumentTextModel = otherDocumentTextModel;
        this.type = type;
        this.cellFoldingState =
            this.modified.textModel.getValue() !== this.original.textModel.getValue()
                ? PropertyFoldingState.Expanded
                : PropertyFoldingState.Collapsed;
        this.metadataFoldingState = PropertyFoldingState.Collapsed;
        this.outputFoldingState = PropertyFoldingState.Collapsed;
        if (this.checkMetadataIfModified()) {
            this.metadataFoldingState = PropertyFoldingState.Expanded;
        }
        if (this.checkIfOutputsModified()) {
            this.outputFoldingState = PropertyFoldingState.Expanded;
        }
        this._register(this.original.onDidChangeOutputLayout(() => {
            this._layout({ recomputeOutput: true });
        }));
        this._register(this.modified.onDidChangeOutputLayout(() => {
            this._layout({ recomputeOutput: true });
        }));
        this._register(this.modified.textModel.onDidChangeContent(() => {
            if (mainDocumentTextModel.transientOptions.cellContentMetadata) {
                const cellMetadataKeys = [
                    ...Object.keys(mainDocumentTextModel.transientOptions.cellContentMetadata),
                ];
                const modifiedMedataRaw = Object.assign({}, this.modified.metadata);
                const originalCellMetadata = this.original.metadata;
                for (const key of cellMetadataKeys) {
                    if (key in originalCellMetadata) {
                        modifiedMedataRaw[key] = originalCellMetadata[key];
                    }
                }
                this.modified.textModel.metadata = modifiedMedataRaw;
            }
        }));
    }
    checkIfInputModified() {
        if (this.original.textModel.getTextBufferHash() === this.modified.textModel.getTextBufferHash()) {
            return false;
        }
        return {
            reason: 'Cell content has changed',
        };
    }
    checkIfOutputsModified() {
        if (this.mainDocumentTextModel.transientOptions.transientOutputs || this.ignoreOutputs) {
            return false;
        }
        const ret = outputsEqual(this.original?.outputs ?? [], this.modified?.outputs ?? []);
        if (ret === 0 /* OutputComparison.Unchanged */) {
            return false;
        }
        return {
            reason: ret === 1 /* OutputComparison.Metadata */ ? 'Output metadata has changed' : undefined,
            kind: ret,
        };
    }
    checkMetadataIfModified() {
        if (this.ignoreMetadata) {
            return false;
        }
        const modified = hash(getFormattedMetadataJSON(this.mainDocumentTextModel.transientOptions.transientCellMetadata, this.original?.metadata || {}, this.original?.language)) !==
            hash(getFormattedMetadataJSON(this.mainDocumentTextModel.transientOptions.transientCellMetadata, this.modified?.metadata ?? {}, this.modified?.language));
        if (modified) {
            return { reason: undefined };
        }
        else {
            return false;
        }
    }
    updateOutputHeight(diffSide, index, height) {
        if (diffSide === DiffSide.Original) {
            this.original.updateOutputHeight(index, height);
        }
        else {
            this.modified.updateOutputHeight(index, height);
        }
    }
    getOutputOffsetInContainer(diffSide, index) {
        if (diffSide === DiffSide.Original) {
            return this.original.getOutputOffset(index);
        }
        else {
            return this.modified.getOutputOffset(index);
        }
    }
    getOutputOffsetInCell(diffSide, index) {
        const offsetInOutputsContainer = this.getOutputOffsetInContainer(diffSide, index);
        return (this._layoutInfo.editorHeight +
            this._layoutInfo.editorMargin +
            this._layoutInfo.metadataHeight +
            this._layoutInfo.cellStatusHeight +
            this._layoutInfo.metadataStatusHeight +
            this._layoutInfo.outputStatusHeight +
            this._layoutInfo.bodyMargin / 2 +
            offsetInOutputsContainer);
    }
    isOutputEmpty() {
        if (this.mainDocumentTextModel.transientOptions.transientOutputs) {
            return true;
        }
        if (this.checkIfOutputsModified()) {
            return false;
        }
        // outputs are not changed
        return (this.original?.outputs || []).length === 0;
    }
    getRichOutputTotalHeight() {
        return Math.max(this.original.getOutputTotalHeight(), this.modified.getOutputTotalHeight());
    }
    getNestedCellViewModel(diffSide) {
        return diffSide === DiffSide.Original ? this.original : this.modified;
    }
    getCellByUri(cellUri) {
        if (cellUri.toString() === this.original.uri.toString()) {
            return this.original;
        }
        else {
            return this.modified;
        }
    }
    computeInputEditorHeight(lineHeight) {
        if (this.type === 'modified' &&
            typeof this.editorHeightWithUnchangedLinesCollapsed === 'number' &&
            this.checkIfInputModified()) {
            return this.editorHeightWithUnchangedLinesCollapsed;
        }
        return super.computeInputEditorHeight(lineHeight);
    }
    async computeModifiedInputEditorHeight() {
        if (this.checkIfInputModified()) {
            this.editorHeightWithUnchangedLinesCollapsed = this._layoutInfo.editorHeight =
                await this.diffEditorHeightCalculator.diffAndComputeHeight(this.original.uri, this.modified.uri);
        }
    }
    async computeModifiedMetadataEditorHeight() {
        if (this.checkMetadataIfModified()) {
            const originalMetadataUri = CellUri.generateCellPropertyUri(this.originalDocument.uri, this.original.handle, Schemas.vscodeNotebookCellMetadata);
            const modifiedMetadataUri = CellUri.generateCellPropertyUri(this.modifiedDocument.uri, this.modified.handle, Schemas.vscodeNotebookCellMetadata);
            this._layoutInfo.metadataHeight = await this.diffEditorHeightCalculator.diffAndComputeHeight(originalMetadataUri, modifiedMetadataUri);
        }
    }
    async computeEditorHeights() {
        if (this.type === 'unchanged') {
            return;
        }
        await Promise.all([
            this.computeModifiedInputEditorHeight(),
            this.computeModifiedMetadataEditorHeight(),
        ]);
    }
}
export class SingleSideDiffElementViewModel extends DiffElementCellViewModelBase {
    get cellViewModel() {
        return this.type === 'insert' ? this.modified : this.original;
    }
    get originalDocument() {
        if (this.type === 'insert') {
            return this.otherDocumentTextModel;
        }
        else {
            return this.mainDocumentTextModel;
        }
    }
    get modifiedDocument() {
        if (this.type === 'insert') {
            return this.mainDocumentTextModel;
        }
        else {
            return this.otherDocumentTextModel;
        }
    }
    constructor(mainDocumentTextModel, otherDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, configurationService, diffEditorHeightCalculator, index) {
        super(mainDocumentTextModel, original, modified, type, editorEventDispatcher, initData, notebookService, index, configurationService, diffEditorHeightCalculator);
        this.otherDocumentTextModel = otherDocumentTextModel;
        this.type = type;
        this._register(this.cellViewModel.onDidChangeOutputLayout(() => {
            this._layout({ recomputeOutput: true });
        }));
    }
    checkIfInputModified() {
        return {
            reason: 'Cell content has changed',
        };
    }
    getNestedCellViewModel(diffSide) {
        return this.type === 'insert' ? this.modified : this.original;
    }
    checkIfOutputsModified() {
        return false;
    }
    checkMetadataIfModified() {
        return false;
    }
    updateOutputHeight(diffSide, index, height) {
        this.cellViewModel?.updateOutputHeight(index, height);
    }
    getOutputOffsetInContainer(diffSide, index) {
        return this.cellViewModel.getOutputOffset(index);
    }
    getOutputOffsetInCell(diffSide, index) {
        const offsetInOutputsContainer = this.cellViewModel.getOutputOffset(index);
        return (this._layoutInfo.editorHeight +
            this._layoutInfo.editorMargin +
            this._layoutInfo.metadataHeight +
            this._layoutInfo.cellStatusHeight +
            this._layoutInfo.metadataStatusHeight +
            this._layoutInfo.outputStatusHeight +
            this._layoutInfo.bodyMargin / 2 +
            offsetInOutputsContainer);
    }
    isOutputEmpty() {
        if (this.mainDocumentTextModel.transientOptions.transientOutputs) {
            return true;
        }
        // outputs are not changed
        return (this.original?.outputs || this.modified?.outputs || []).length === 0;
    }
    getRichOutputTotalHeight() {
        return this.cellViewModel?.getOutputTotalHeight() ?? 0;
    }
    getCellByUri(cellUri) {
        return this.cellViewModel;
    }
}
export var OutputComparison;
(function (OutputComparison) {
    OutputComparison[OutputComparison["Unchanged"] = 0] = "Unchanged";
    OutputComparison[OutputComparison["Metadata"] = 1] = "Metadata";
    OutputComparison[OutputComparison["Other"] = 2] = "Other";
})(OutputComparison || (OutputComparison = {}));
export function outputEqual(a, b) {
    if (hash(a.metadata) === hash(b.metadata)) {
        return 2 /* OutputComparison.Other */;
    }
    // metadata not equal
    for (let j = 0; j < a.outputs.length; j++) {
        const aOutputItem = a.outputs[j];
        const bOutputItem = b.outputs[j];
        if (aOutputItem.mime !== bOutputItem.mime) {
            return 2 /* OutputComparison.Other */;
        }
        if (aOutputItem.data.buffer.length !== bOutputItem.data.buffer.length) {
            return 2 /* OutputComparison.Other */;
        }
        for (let k = 0; k < aOutputItem.data.buffer.length; k++) {
            if (aOutputItem.data.buffer[k] !== bOutputItem.data.buffer[k]) {
                return 2 /* OutputComparison.Other */;
            }
        }
    }
    return 1 /* OutputComparison.Metadata */;
}
function outputsEqual(original, modified) {
    if (original.length !== modified.length) {
        return 2 /* OutputComparison.Other */;
    }
    const len = original.length;
    for (let i = 0; i < len; i++) {
        const a = original[i];
        const b = modified[i];
        if (hash(a.metadata) !== hash(b.metadata)) {
            return 1 /* OutputComparison.Metadata */;
        }
        if (a.outputs.length !== b.outputs.length) {
            return 2 /* OutputComparison.Other */;
        }
        for (let j = 0; j < a.outputs.length; j++) {
            const aOutputItem = a.outputs[j];
            const bOutputItem = b.outputs[j];
            if (aOutputItem.mime !== bOutputItem.mime) {
                return 2 /* OutputComparison.Other */;
            }
            if (aOutputItem.data.buffer.length !== bOutputItem.data.buffer.length) {
                return 2 /* OutputComparison.Other */;
            }
            for (let k = 0; k < aOutputItem.data.buffer.length; k++) {
                if (aOutputItem.data.buffer[k] !== bOutputItem.data.buffer[k]) {
                    return 2 /* OutputComparison.Other */;
                }
            }
        }
    }
    return 0 /* OutputComparison.Unchanged */;
}
export function getStreamOutputData(outputs) {
    if (!outputs.length) {
        return null;
    }
    const first = outputs[0];
    const mime = first.mime;
    const sameStream = !outputs.find((op) => op.mime !== mime);
    if (sameStream) {
        return outputs.map((opit) => opit.data.toString()).join('');
    }
    else {
        return null;
    }
}
export function getFormattedOutputJSON(outputs) {
    if (outputs.length === 1) {
        const streamOutputData = getStreamOutputData(outputs[0].outputs);
        if (streamOutputData) {
            return streamOutputData;
        }
    }
    return JSON.stringify(outputs.map((output) => {
        return {
            metadata: output.metadata,
            outputItems: output.outputs.map((opit) => ({
                mimeType: opit.mime,
                data: opit.data.toString(),
            })),
        };
    }), undefined, '\t');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVsZW1lbnRWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvZGlmZkVsZW1lbnRWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFHdEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFxQyx5QkFBeUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ25HLE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsUUFBUSxHQUVSLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGVBQWUsRUFBeUIsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5RSxPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sNkNBQTZDLENBQUE7QUFFcEQsT0FBTyxFQUNOLE9BQU8sR0FLUCxNQUFNLGdDQUFnQyxDQUFBO0FBR3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVuRyxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQTtBQUUvQix3R0FBd0c7QUFDeEcsTUFBTSxDQUFDLE1BQU0scUNBQXFDLEdBQUcsRUFBRSxDQUFB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