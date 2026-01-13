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
import { Emitter } from '../../../../../base/common/event.js';
import * as UUID from '../../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { CellEditState, CellLayoutContext, CellLayoutState, } from '../notebookBrowser.js';
import { BaseCellViewModel } from './baseCellViewModel.js';
import { CellKind } from '../../common/notebookCommon.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { NotebookCellStateChangedEvent } from '../notebookViewEvents.js';
import { IInlineChatSessionService } from '../../../inlineChat/browser/inlineChatSessionService.js';
let MarkupCellViewModel = class MarkupCellViewModel extends BaseCellViewModel {
    get renderedHtml() {
        return this._renderedHtml;
    }
    set renderedHtml(value) {
        if (this._renderedHtml !== value) {
            this._renderedHtml = value;
            this._onDidChangeState.fire({ contentChanged: true });
        }
    }
    get layoutInfo() {
        return this._layoutInfo;
    }
    set renderedMarkdownHeight(newHeight) {
        this._previewHeight = newHeight;
        this._updateTotalHeight(this._computeTotalHeight());
    }
    set chatHeight(newHeight) {
        this._chatHeight = newHeight;
        this._updateTotalHeight(this._computeTotalHeight());
    }
    get chatHeight() {
        return this._chatHeight;
    }
    set editorHeight(newHeight) {
        this._editorHeight = newHeight;
        this._statusBarHeight = this.viewContext.notebookOptions.computeStatusBarHeight();
        this._updateTotalHeight(this._computeTotalHeight());
    }
    get editorHeight() {
        throw new Error('MarkdownCellViewModel.editorHeight is write only');
    }
    get foldingState() {
        return this.foldingDelegate.getFoldingState(this.foldingDelegate.getCellIndex(this));
    }
    get outputIsHovered() {
        return this._hoveringOutput;
    }
    set outputIsHovered(v) {
        this._hoveringOutput = v;
    }
    get outputIsFocused() {
        return this._focusOnOutput;
    }
    set outputIsFocused(v) {
        this._focusOnOutput = v;
    }
    get inputInOutputIsFocused() {
        return false;
    }
    set inputInOutputIsFocused(_) {
        //
    }
    get cellIsHovered() {
        return this._hoveringCell;
    }
    set cellIsHovered(v) {
        this._hoveringCell = v;
        this._onDidChangeState.fire({ cellIsHoveredChanged: true });
    }
    constructor(viewType, model, initialNotebookLayoutInfo, foldingDelegate, viewContext, configurationService, textModelService, undoRedoService, codeEditorService, inlineChatSessionService) {
        super(viewType, model, UUID.generateUuid(), viewContext, configurationService, textModelService, undoRedoService, codeEditorService, inlineChatSessionService);
        this.foldingDelegate = foldingDelegate;
        this.viewContext = viewContext;
        this.cellKind = CellKind.Markup;
        this._previewHeight = 0;
        this._chatHeight = 0;
        this._editorHeight = 0;
        this._statusBarHeight = 0;
        this._onDidChangeLayout = this._register(new Emitter());
        this.onDidChangeLayout = this._onDidChangeLayout.event;
        this._hoveringOutput = false;
        this._focusOnOutput = false;
        this._hoveringCell = false;
        /**
         * we put outputs stuff here to make compiler happy
         */
        this.outputsViewModels = [];
        this._hasFindResult = this._register(new Emitter());
        this.hasFindResult = this._hasFindResult.event;
        const { bottomToolbarGap } = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        this._layoutInfo = {
            chatHeight: 0,
            editorHeight: 0,
            previewHeight: 0,
            fontInfo: initialNotebookLayoutInfo?.fontInfo || null,
            editorWidth: initialNotebookLayoutInfo?.width
                ? this.viewContext.notebookOptions.computeMarkdownCellEditorWidth(initialNotebookLayoutInfo.width)
                : 0,
            commentOffset: 0,
            commentHeight: 0,
            bottomToolbarOffset: bottomToolbarGap,
            totalHeight: 100,
            layoutState: CellLayoutState.Uninitialized,
            foldHintHeight: 0,
            statusBarHeight: 0,
        };
        this._register(this.onDidChangeState((e) => {
            this.viewContext.eventDispatcher.emit([new NotebookCellStateChangedEvent(e, this.model)]);
            if (e.foldingStateChanged) {
                this._updateTotalHeight(this._computeTotalHeight(), CellLayoutContext.Fold);
            }
        }));
    }
    _computeTotalHeight() {
        const layoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
        const { bottomToolbarGap } = this.viewContext.notebookOptions.computeBottomToolbarDimensions(this.viewType);
        const foldHintHeight = this._computeFoldHintHeight();
        if (this.getEditState() === CellEditState.Editing) {
            return (this._editorHeight +
                layoutConfiguration.markdownCellTopMargin +
                layoutConfiguration.markdownCellBottomMargin +
                bottomToolbarGap +
                this._statusBarHeight +
                this._commentHeight);
        }
        else {
            // @rebornix
            // On file open, the previewHeight + bottomToolbarGap for a cell out of viewport can be 0
            // When it's 0, the list view will never try to render it anymore even if we scroll the cell into view.
            // Thus we make sure it's greater than 0
            return Math.max(1, this._previewHeight + bottomToolbarGap + foldHintHeight + this._commentHeight);
        }
    }
    _computeFoldHintHeight() {
        return this.getEditState() === CellEditState.Editing ||
            this.foldingState !== 2 /* CellFoldingState.Collapsed */
            ? 0
            : this.viewContext.notebookOptions.getLayoutConfiguration().markdownFoldHintHeight;
    }
    updateOptions(e) {
        super.updateOptions(e);
        if (e.cellStatusBarVisibility || e.insertToolbarPosition || e.cellToolbarLocation) {
            this._updateTotalHeight(this._computeTotalHeight());
        }
    }
    getOutputOffset(index) {
        // throw new Error('Method not implemented.');
        return -1;
    }
    updateOutputHeight(index, height) {
        // throw new Error('Method not implemented.');
    }
    triggerFoldingStateChange() {
        this._onDidChangeState.fire({ foldingStateChanged: true });
    }
    _updateTotalHeight(newHeight, context) {
        if (newHeight !== this.layoutInfo.totalHeight) {
            this.layoutChange({ totalHeight: newHeight, context });
        }
    }
    layoutChange(state) {
        let totalHeight;
        let foldHintHeight;
        if (!this.isInputCollapsed) {
            totalHeight =
                state.totalHeight === undefined
                    ? this._layoutInfo.layoutState === CellLayoutState.Uninitialized
                        ? 100
                        : this._layoutInfo.totalHeight
                    : state.totalHeight;
            // recompute
            foldHintHeight = this._computeFoldHintHeight();
        }
        else {
            totalHeight = this.viewContext.notebookOptions.computeCollapsedMarkdownCellHeight(this.viewType);
            state.totalHeight = totalHeight;
            foldHintHeight = 0;
        }
        let commentOffset;
        if (this.getEditState() === CellEditState.Editing) {
            const notebookLayoutConfiguration = this.viewContext.notebookOptions.getLayoutConfiguration();
            commentOffset =
                notebookLayoutConfiguration.editorToolbarHeight +
                    notebookLayoutConfiguration.cellTopMargin + // CELL_TOP_MARGIN
                    this._chatHeight +
                    this._editorHeight +
                    this._statusBarHeight;
        }
        else {
            commentOffset = this._previewHeight;
        }
        this._layoutInfo = {
            fontInfo: state.font || this._layoutInfo.fontInfo,
            editorWidth: state.outerWidth !== undefined
                ? this.viewContext.notebookOptions.computeMarkdownCellEditorWidth(state.outerWidth)
                : this._layoutInfo.editorWidth,
            chatHeight: this._chatHeight,
            editorHeight: this._editorHeight,
            statusBarHeight: this._statusBarHeight,
            previewHeight: this._previewHeight,
            bottomToolbarOffset: this.viewContext.notebookOptions.computeBottomToolbarOffset(totalHeight, this.viewType),
            totalHeight,
            layoutState: CellLayoutState.Measured,
            foldHintHeight,
            commentOffset,
            commentHeight: state.commentHeight ? this._commentHeight : this._layoutInfo.commentHeight,
        };
        this._onDidChangeLayout.fire(state);
    }
    restoreEditorViewState(editorViewStates, totalHeight) {
        super.restoreEditorViewState(editorViewStates);
        // we might already warmup the viewport so the cell has a total height computed
        if (totalHeight !== undefined &&
            this.layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            this._layoutInfo = {
                ...this.layoutInfo,
                totalHeight: totalHeight,
                chatHeight: this._chatHeight,
                editorHeight: this._editorHeight,
                statusBarHeight: this._statusBarHeight,
                layoutState: CellLayoutState.FromCache,
            };
            this.layoutChange({});
        }
    }
    getDynamicHeight() {
        return null;
    }
    getHeight(lineHeight) {
        if (this._layoutInfo.layoutState === CellLayoutState.Uninitialized) {
            return 100;
        }
        else {
            return this._layoutInfo.totalHeight;
        }
    }
    onDidChangeTextModelContent() {
        this._onDidChangeState.fire({ contentChanged: true });
    }
    onDeselect() { }
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
        this.foldingDelegate = null;
    }
};
MarkupCellViewModel = __decorate([
    __param(5, IConfigurationService),
    __param(6, ITextModelService),
    __param(7, IUndoRedoService),
    __param(8, ICodeEditorService),
    __param(9, IInlineChatSessionService)
], MarkupCellViewModel);
export { MarkupCellViewModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwQ2VsbFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvbWFya3VwQ2VsbFZpZXdNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQ04sYUFBYSxFQUdiLGlCQUFpQixFQUNqQixlQUFlLEdBTWYsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsUUFBUSxFQUF3QixNQUFNLGdDQUFnQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSw2QkFBNkIsRUFBc0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUM1RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLGlCQUFpQjtJQU96RCxJQUFXLFlBQVk7UUFDdEIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFDRCxJQUFXLFlBQVksQ0FBQyxLQUF5QjtR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