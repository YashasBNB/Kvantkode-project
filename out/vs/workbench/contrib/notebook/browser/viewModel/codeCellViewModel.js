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
import { Emitter, PauseableEmitter } from '../../../../../base/common/event.js';
import { dispose } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import * as UUID from '../../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { PrefixSumComputer } from '../../../../../editor/common/model/prefixSumComputer.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { CellEditState, CellLayoutState, } from '../notebookBrowser.js';
import { CellOutputViewModel } from './cellOutputViewModel.js';
import { CellKind, } from '../../common/notebookCommon.js';
import { INotebookService } from '../../common/notebookService.js';
import { BaseCellViewModel } from './baseCellViewModel.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
export const outputDisplayLimit = 500;
let CodeCellViewModel = class CodeCellViewModel extends BaseCellViewModel {
    set editorHeight(height) {
        if (this._editorHeight === height) {
            return;
        }
        this._editorHeight = height;
        this.layoutChange({ editorHeight: true }, 'CodeCellViewModel#editorHeight');
    }
    get editorHeight() {
        throw new Error('editorHeight is write-only');
    }
    set chatHeight(height) {
        if (this._chatHeight === height) {
            return;
        }
        this._chatHeight = height;
        this.layoutChange({ chatHeight: true }, 'CodeCellViewModel#chatHeight');
    }
    get chatHeight() {
        return this._chatHeight;
    }
    get outputIsHovered() {
        return this._hoveringOutput;
    }
    set outputIsHovered(v) {
        this._hoveringOutput = v;
        this._onDidChangeState.fire({ outputIsHoveredChanged: true });
    }
    get outputIsFocused() {
        return this._focusOnOutput;
    }
    set outputIsFocused(v) {
        this._focusOnOutput = v;
        this._onDidChangeState.fire({ outputIsFocusedChanged: true });
    }
    get inputInOutputIsFocused() {
        return this._focusInputInOutput;
    }
    set inputInOutputIsFocused(v) {
        this._focusInputInOutput = v;
    }
    get outputMinHeight() {
        return this._outputMinHeight;
    }
    /**
     * The minimum height of the output region. It's only set to non-zero temporarily when replacing an output with a new one.
     * It's reset to 0 when the new output is rendered, or in one second.
     */
    set outputMinHeight(newMin) {
        this._outputMinHeight = newMin;
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    get outputsViewModels() {
        return this._outputViewModels;
    }
    constructor(viewType, model, initialNotebookLayoutInfo, viewContext, configurationService, _notebookService, modelService, undoRedoService, codeEditorService, inlineChatSessionService) {
        super(viewType, model, UUID.generateUuid(), viewContext, configurationService, modelService, undoRedoService, codeEditorService, inlineChatSessionService);
        this.viewContext = viewContext;
        this._notebookService = _notebookService;
        this.cellKind = CellKind.Code;
        this._onLayoutInfoRead = this._register(new Emitter());
        this.onLayoutInfoRead = this._onLayoutInfoRead.event;
        this._onDidStartExecution = this._register(new Emitter());
        this.onDidStartExecution = this._onDidStartExecution.event;
        this._onDidStopExecution = this._register(new Emitter());
        this.onDidStopExecution = this._onDidStopExecution.event;
        this._onDidChangeOutputs = this._register(new Emitter());
        this.onDidChangeOutputs = this._onDidChangeOutputs.event;
        this._onDidRemoveOutputs = this._register(new Emitter());
        this.onDidRemoveOutputs = this._onDidRemoveOutputs.event;
        this._outputCollection = [];
        this._outputsTop = null;
        this._pauseableEmitter = this._register(new PauseableEmitter());
        this.onDidChangeLayout = this._pauseableEmitter.event;
        this._editorHeight = 0;
        this._chatHeight = 0;
        this._hoveringOutput = false;
        this._focusOnOutput = false;
        this._focusInputInOutput = false;
        this._outputMinHeight = 0;
        this.executionErrorDiagnostic = observableValue('excecutionError', undefined);
        this._hasFindResult = this._register(new Emitter());
        this.hasFindResult = this._hasFindResult.event;
        this._outputViewModels = this.model.outputs.map((output) => new CellOutputViewModel(this, output, this._notebookService));
        this._register(this.model.onDidChangeOutputs((splice) => {
            const removedOutputs = [];
            let outputLayoutChange = false;
            for (let i = splice.start; i < splice.start + splice.deleteCount; i++) {
                if (this._outputCollection[i] !== undefined && this._outputCollection[i] !== 0) {
                    outputLayoutChange = true;
                }
            }
            this._outputCollection.splice(splice.start, splice.deleteCount, ...splice.newOutputs.map(() => 0));
            removedOutputs.push(...this._outputViewModels.splice(splice.start, splice.deleteCount, ...splice.newOutputs.map((output) => new CellOutputViewModel(this, output, this._notebookService))));
            this._outputsTop = null;
            this._onDidChangeOutputs.fire(splice);
            this._onDidRemoveOutputs.fire(removedOutputs);
            if (outputLayoutChange) {
                this.layoutChange({ outputHeight: true }, 'CodeCellViewModel#model.onDidChangeOutputs');
            }
            if (!this._outputCollection.length) {
                this.executionErrorDiagnostic.set(undefined, undefined);
            }
            dispose(removedOutputs);
        }));
        this._outputCollection = new Array(this.model.outputs.length);
        this._layoutInfo = {
            fontInfo: initialNotebookLayoutInfo?.fontInfo || null,
            editorHeight: 0,
            editorWidth: initialNotebookLayoutInfo
                ? this.viewContext.notebookOptions.computeCodeCellEditorWidth(initialNotebookLayoutInfo.width)
                : 0,
            chatHeight: 0,
            statusBarHeight: 0,
            commentOffset: 0,
            commentHeight: 0,
            outputContainerOffset: 0,
            outputTotalHeight: 0,
            outputShowMoreContainerHeight: 0,
            outputShowMoreContainerOffset: 0,
            totalHeight: this.computeTotalHeight(17, 0, 0, 0),
            codeIndicatorHeight: 0,
            outputIndicatorHeight: 0,
            bottomToolbarOffset: 0,
            layoutState: CellLayoutState.Uninitialized,
            estimatedHasHorizontalScrolling: false,
        };
    }
    updateExecutionState(e) {
        if (e.changed) {
            this.executionErrorDiagnostic.set(undefined, undefined);
            this._onDidStartExecution.fire(e);
        }
        else {
            this._onDidStopExecution.fire(e);
        }
    }
    updateOptions(e) {
        super.updateOptions(e);
        if (e.cellStatusBarVisibility || e.insertToolbarPosition || e.cellToolbarLocation) {
            this.layoutChange({});
        }
    }
    pauseLayout() {
        this._pauseableEmitter.pause();
    }
    resumeLayout() {
        this._pauseableEmitter.resume();
    }
    layoutChange(state, source) {
        // recompute
        this._ensureOutputsTop();
        const notebookLayoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
        const bottomToolbarDimensions = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        const outputShowMoreContainerHeight = state.outputShowMoreContainerHeight
            ? state.outputShowMoreContainerHeight
            : this._layoutInfo.outputShowMoreContainerHeight;
        const outputTotalHeight = Math.max(this._outputMinHeight, this.isOutputCollapsed
            ? notebookLayoutConfiguration.collapsedIndicatorHeight
            : this._outputsTop.getTotalSum());
        const commentHeight = state.commentHeight ? this._commentHeight : this._layoutInfo.commentHeight;
        const originalLayout = this.layoutInfo;
        if (!this.isInputCollapsed) {
            let newState;
            let editorHeight;
            let totalHeight;
            let hasHorizontalScrolling = false;
            const chatHeight = state.chatHeight ? this._chatHeight : this._layoutInfo.chatHeight;
            if (!state.editorHeight &&
                this._layoutInfo.layoutState === CellLayoutState.FromCache &&
                !state.outputHeight) {
                // No new editorHeight info - keep cached totalHeight and estimate editorHeight
                const estimate = this.estimateEditorHeight(state.font?.lineHeight ?? this._layoutInfo.fontInfo?.lineHeight);
                editorHeight = estimate.editorHeight;
                hasHorizontalScrolling = estimate.hasHorizontalScrolling;
                totalHeight = this._layoutInfo.totalHeight;
                newState = CellLayoutState.FromCache;
            }
            else if (state.editorHeight || this._layoutInfo.layoutState === CellLayoutState.Measured) {
                // Editor has been measured
                editorHeight = this._editorHeight;
                totalHeight = this.computeTotalHeight(this._editorHeight, outputTotalHeight, outputShowMoreContainerHeight, chatHeight);
                newState = CellLayoutState.Measured;
                hasHorizontalScrolling = this._layoutInfo.estimatedHasHorizontalScrolling;
            }
            else {
                const estimate = this.estimateEditorHeight(state.font?.lineHeight ?? this._layoutInfo.fontInfo?.lineHeight);
                editorHeight = estimate.editorHeight;
                hasHorizontalScrolling = estimate.hasHorizontalScrolling;
                totalHeight = this.computeTotalHeight(editorHeight, outputTotalHeight, outputShowMoreContainerHeight, chatHeight);
                newState = CellLayoutState.Estimated;
            }
            const statusBarHeight = this.viewContext.notebookOptions.computeEditorStatusbarHeight(this.internalMetadata, this.uri);
            const codeIndicatorHeight = editorHeight + statusBarHeight;
            const outputIndicatorHeight = outputTotalHeight + outputShowMoreContainerHeight;
            const outputContainerOffset = notebookLayoutConfiguration.editorToolbarHeight +
                notebookLayoutConfiguration.cellTopMargin + // CELL_TOP_MARGIN
                chatHeight +
                editorHeight +
                statusBarHeight;
            const outputShowMoreContainerOffset = totalHeight -
                bottomToolbarDimensions.bottomToolbarGap -
                bottomToolbarDimensions.bottomToolbarHeight / 2 -
                outputShowMoreContainerHeight;
            const bottomToolbarOffset = this.viewContext.notebookOptions.computeBottomToolbarOffset(totalHeight, this.viewType);
            const editorWidth = state.outerWidth !== undefined
                ? this.viewContext.notebookOptions.computeCodeCellEditorWidth(state.outerWidth)
                : this._layoutInfo?.editorWidth;
            this._layoutInfo = {
                fontInfo: state.font ?? this._layoutInfo.fontInfo ?? null,
                chatHeight,
                editorHeight,
                editorWidth,
                statusBarHeight,
                outputContainerOffset,
                outputTotalHeight,
                outputShowMoreContainerHeight,
                outputShowMoreContainerOffset,
                commentOffset: outputContainerOffset + outputTotalHeight,
                commentHeight,
                totalHeight,
                codeIndicatorHeight,
                outputIndicatorHeight,
                bottomToolbarOffset,
                layoutState: newState,
                estimatedHasHorizontalScrolling: hasHorizontalScrolling,
            };
        }
        else {
            const codeIndicatorHeight = notebookLayoutConfiguration.collapsedIndicatorHeight;
            const outputIndicatorHeight = outputTotalHeight + outputShowMoreContainerHeight;
            const chatHeight = state.chatHeight ? this._chatHeight : this._layoutInfo.chatHeight;
            const outputContainerOffset = notebookLayoutConfiguration.cellTopMargin +
                notebookLayoutConfiguration.collapsedIndicatorHeight;
            const totalHeight = notebookLayoutConfiguration.cellTopMargin +
                notebookLayoutConfiguration.collapsedIndicatorHeight +
                notebookLayoutConfiguration.cellBottomMargin + //CELL_BOTTOM_MARGIN
                bottomToolbarDimensions.bottomToolbarGap + //BOTTOM_CELL_TOOLBAR_GAP
                chatHeight +
                commentHeight +
                outputTotalHeight +
                outputShowMoreContainerHeight;
            const outputShowMoreContainerOffset = totalHeight -
                bottomToolbarDimensions.bottomToolbarGap -
                bottomToolbarDimensions.bottomToolbarHeight / 2 -
                outputShowMoreContainerHeight;
            const bottomToolbarOffset = this.viewContext.notebookOptions.computeBottomToolbarOffset(totalHeight, this.viewType);
            const editorWidth = state.outerWidth !== undefined
                ? this.viewContext.notebookOptions.computeCodeCellEditorWidth(state.outerWidth)
                : this._layoutInfo?.editorWidth;
            this._layoutInfo = {
                fontInfo: state.font ?? this._layoutInfo.fontInfo ?? null,
                editorHeight: this._layoutInfo.editorHeight,
                editorWidth,
                chatHeight: chatHeight,
                statusBarHeight: 0,
                outputContainerOffset,
                outputTotalHeight,
                outputShowMoreContainerHeight,
                outputShowMoreContainerOffset,
                commentOffset: outputContainerOffset + outputTotalHeight,
                commentHeight,
                totalHeight,
                codeIndicatorHeight,
                outputIndicatorHeight,
                bottomToolbarOffset,
                layoutState: this._layoutInfo.layoutState,
                estimatedHasHorizontalScrolling: false,
            };
        }
        this._fireOnDidChangeLayout({
            ...state,
            totalHeight: this.layoutInfo.totalHeight !== originalLayout.totalHeight,
            source,
        });
    }
    _fireOnDidChangeLayout(state) {
        this._pauseableEmitter.fire(state);
    }
    restoreEditorViewState(editorViewStates, totalHeight) {
        super.restoreEditorViewState(editorViewStates);
        if (totalHeight !== undefined && this._layoutInfo.layoutState !== CellLayoutState.Measured) {
            this._layoutInfo = {
                ...this._layoutInfo,
                totalHeight: totalHeight,
                layoutState: CellLayoutState.FromCache,
            };
        }
    }
    getDynamicHeight() {
        this._onLayoutInfoRead.fire();
        return this._layoutInfo.totalHeight;
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            const estimate = this.estimateEditorHeight(lineHeight);
            return this.computeTotalHeight(estimate.editorHeight, 0, 0, 0);
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    estimateEditorHeight(lineHeight = 20) {
        let hasHorizontalScrolling = false;
        const cellEditorOptions = this.viewContext.getBaseCellEditorOptions(this.language);
        if (this.layoutInfo.fontInfo && cellEditorOptions.value.wordWrap === 'off') {
            for (let i = 0; i < this.lineCount; i++) {
                const max = this.textBuffer.getLineLastNonWhitespaceColumn(i + 1);
                const estimatedWidth = max *
                    (this.layoutInfo.fontInfo.typicalHalfwidthCharacterWidth +
                        this.layoutInfo.fontInfo.letterSpacing);
                if (estimatedWidth > this.layoutInfo.editorWidth) {
                    hasHorizontalScrolling = true;
                    break;
                }
            }
        }
        const verticalScrollbarHeight = hasHorizontalScrolling ? 12 : 0; // take zoom level into account
        const editorPadding = this.viewContext.notebookOptions.computeEditorPadding(this.internalMetadata, this.uri);
        const editorHeight = this.lineCount * lineHeight +
            editorPadding.top +
            editorPadding.bottom + // EDITOR_BOTTOM_PADDING
            verticalScrollbarHeight;
        return {
            editorHeight,
            hasHorizontalScrolling,
        };
    }
    computeTotalHeight(editorHeight, outputsTotalHeight, outputShowMoreContainerHeight, chatHeight) {
        const layoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
        const { bottomToolbarGap } = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        return (layoutConfiguration.editorToolbarHeight +
            layoutConfiguration.cellTopMargin +
            chatHeight +
            editorHeight +
            this.viewContext.notebookOptions.computeEditorStatusbarHeight(this.internalMetadata, this.uri) +
            this._commentHeight +
            outputsTotalHeight +
            outputShowMoreContainerHeight +
            bottomToolbarGap +
            layoutConfiguration.cellBottomMargin);
    }
    onDidChangeTextModelContent() {
        if (this.getEditState() !== CellEditState.Editing) {
            this.updateEditState(CellEditState.Editing, 'onDidChangeTextModelContent');
            this._onDidChangeState.fire({ contentChanged: true });
        }
    }
    onDeselect() {
        this.updateEditState(CellEditState.Preview, 'onDeselect');
    }
    updateOutputShowMoreContainerHeight(height) {
        this.layoutChange({ outputShowMoreContainerHeight: height }, 'CodeCellViewModel#updateOutputShowMoreContainerHeight');
    }
    updateOutputMinHeight(height) {
        this.outputMinHeight = height;
    }
    unlockOutputHeight() {
        this.outputMinHeight = 0;
        this.layoutChange({ outputHeight: true });
    }
    updateOutputHeight(index, height, source) {
        if (index >= this._outputCollection.length) {
            throw new Error('Output index out of range!');
        }
        this._ensureOutputsTop();
        try {
            if (index === 0 || height > 0) {
                this._outputViewModels[index].setVisible(true);
            }
            else if (height === 0) {
                this._outputViewModels[index].setVisible(false);
            }
        }
        catch (e) {
            const errorMessage = `Failed to update output height for cell ${this.handle}, output ${index}. ` +
                `this.outputCollection.length: ${this._outputCollection.length}, this._outputViewModels.length: ${this._outputViewModels.length}`;
            throw new Error(`${errorMessage}.\n Error: ${e.message}`);
        }
        if (this._outputViewModels[index].visible.get() && height < 28) {
            height = 28;
        }
        this._outputCollection[index] = height;
        if (this._outputsTop.setValue(index, height)) {
            this.layoutChange({ outputHeight: true }, source);
        }
    }
    getOutputOffsetInContainer(index) {
        this._ensureOutputsTop();
        if (index >= this._outputCollection.length) {
            throw new Error('Output index out of range!');
        }
        return this._outputsTop.getPrefixSum(index - 1);
    }
    getOutputOffset(index) {
        return this.layoutInfo.outputContainerOffset + this.getOutputOffsetInContainer(index);
    }
    spliceOutputHeights(start, deleteCnt, heights) {
        this._ensureOutputsTop();
        this._outputsTop.removeValues(start, deleteCnt);
        if (heights.length) {
            const values = new Uint32Array(heights.length);
            for (let i = 0; i < heights.length; i++) {
                values[i] = heights[i];
            }
            this._outputsTop.insertValues(start, values);
        }
        this.layoutChange({ outputHeight: true }, 'CodeCellViewModel#spliceOutputs');
    }
    _ensureOutputsTop() {
        if (!this._outputsTop) {
            const values = new Uint32Array(this._outputCollection.length);
            for (let i = 0; i < this._outputCollection.length; i++) {
                values[i] = this._outputCollection[i];
            }
            this._outputsTop = new PrefixSumComputer(values);
        }
    }
    startFind(value, options) {
        const matches = super.cellStartFind(value, options);
        if (matches === null) {
            return null;
        }
        return {
            cell: this,
            contentMatches: matches,
        };
    }
    dispose() {
        super.dispose();
        this._outputCollection = [];
        this._outputsTop = null;
        dispose(this._outputViewModels);
    }
};
CodeCellViewModel = __decorate([
    __param(4, IConfigurationService),
    __param(5, INotebookService),
    __param(6, ITextModelService),
    __param(7, IUndoRedoService),
    __param(8, ICodeEditorService),
    __param(9, IInlineChatSessionService)
], CodeCellViewModel);
export { CodeCellViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNlbGxWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdNb2RlbC9jb2RlQ2VsbFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixhQUFhLEVBRWIsZUFBZSxHQUtmLE1BQU0sdUJBQXVCLENBQUE7QUFHOUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFHOUQsT0FBTyxFQUNOLFFBQVEsR0FHUixNQUFNLGdDQUFnQyxDQUFBO0FBS3ZDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzFELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFN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