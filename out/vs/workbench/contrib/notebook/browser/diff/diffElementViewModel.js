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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVsZW1lbnRWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9kaWZmRWxlbWVudFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUd0RyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQXFDLHlCQUF5QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDbkcsT0FBTyxFQUVOLGdCQUFnQixFQUNoQixRQUFRLEdBRVIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsZUFBZSxFQUF5QixNQUFNLHVCQUF1QixDQUFBO0FBRTlFLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQ04sT0FBTyxHQUtQLE1BQU0sZ0NBQWdDLENBQUE7QUFHdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRW5HLE1BQU0sb0JBQW9CLEdBQUcsRUFBRSxDQUFBO0FBRS9CLHdHQUF3RztBQUN4RyxNQUFNLENBQUMsTUFB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