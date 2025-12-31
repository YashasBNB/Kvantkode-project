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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwQ2VsbFZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL21hcmt1cENlbGxWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFFMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUNOLGFBQWEsRUFHYixpQkFBaUIsRUFDakIsZUFBZSxHQU1mLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFMUQsT0FBTyxFQUFFLFFBQVEsRUFBd0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUV0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsNkJBQTZCLEVBQXNCLE1BQU0sMEJBQTBCLENBQUE7QUFDNUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFNUYsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxpQkFBaUI7SUFPekQsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBQ0QsSUFBVyxZQUFZLENBQUMsS0FBeUI7UUFDaEQsSUFBSSxJQUFJLENBQUMsYUFB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