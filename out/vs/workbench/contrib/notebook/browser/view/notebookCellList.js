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
import * as DOM from '../../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../../base/browser/domStylesheets.js';
import { ListError, } from '../../../../../base/browser/ui/list/list.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { PrefixSumComputer } from '../../../../../editor/common/model/prefixSumComputer.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IListService, WorkbenchList, } from '../../../../../platform/list/browser/listService.js';
import { CursorAtBoundary, CellEditState, CellRevealRangeType, CursorAtLineBoundary, } from '../notebookBrowser.js';
import { diff, NOTEBOOK_EDITOR_CURSOR_BOUNDARY, CellKind, SelectionStateType, NOTEBOOK_EDITOR_CURSOR_LINE_BOUNDARY, } from '../../common/notebookCommon.js';
import { cellRangesToIndexes, reduceCellRanges, cellRangesEqual, } from '../../common/notebookRange.js';
import { NOTEBOOK_CELL_LIST_FOCUSED } from '../../common/notebookContextKeys.js';
import { clamp } from '../../../../../base/common/numbers.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { MarkupCellViewModel } from '../viewModel/markupCellViewModel.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookCellListView } from './notebookCellListView.js';
import { INotebookExecutionStateService } from '../../common/notebookExecutionStateService.js';
import { NotebookCellAnchor } from './notebookCellAnchor.js';
import { NotebookViewZones } from '../viewParts/notebookViewZones.js';
import { NotebookCellOverlays } from '../viewParts/notebookCellOverlays.js';
var CellRevealPosition;
(function (CellRevealPosition) {
    CellRevealPosition[CellRevealPosition["Top"] = 0] = "Top";
    CellRevealPosition[CellRevealPosition["Center"] = 1] = "Center";
    CellRevealPosition[CellRevealPosition["Bottom"] = 2] = "Bottom";
    CellRevealPosition[CellRevealPosition["NearTop"] = 3] = "NearTop";
})(CellRevealPosition || (CellRevealPosition = {}));
function getVisibleCells(cells, hiddenRanges) {
    if (!hiddenRanges.length) {
        return cells;
    }
    let start = 0;
    let hiddenRangeIndex = 0;
    const result = [];
    while (start < cells.length && hiddenRangeIndex < hiddenRanges.length) {
        if (start < hiddenRanges[hiddenRangeIndex].start) {
            result.push(...cells.slice(start, hiddenRanges[hiddenRangeIndex].start));
        }
        start = hiddenRanges[hiddenRangeIndex].end + 1;
        hiddenRangeIndex++;
    }
    if (start < cells.length) {
        result.push(...cells.slice(start));
    }
    return result;
}
export const NOTEBOOK_WEBVIEW_BOUNDARY = 5000;
function validateWebviewBoundary(element) {
    const webviewTop = 0 - (parseInt(element.style.top, 10) || 0);
    return webviewTop >= 0 && webviewTop <= NOTEBOOK_WEBVIEW_BOUNDARY * 2;
}
let NotebookCellList = class NotebookCellList extends WorkbenchList {
    get onWillScroll() {
        return this.view.onWillScroll;
    }
    get rowsContainer() {
        return this.view.containerDomNode;
    }
    get scrollableElement() {
        return this.view.scrollableElementDomNode;
    }
    get viewModel() {
        return this._viewModel;
    }
    get visibleRanges() {
        return this._visibleRanges;
    }
    set visibleRanges(ranges) {
        if (cellRangesEqual(this._visibleRanges, ranges)) {
            return;
        }
        this._visibleRanges = ranges;
        this._onDidChangeVisibleRanges.fire();
    }
    get isDisposed() {
        return this._isDisposed;
    }
    get webviewElement() {
        return this._webviewElement;
    }
    get inRenderingTransaction() {
        return this.view.inRenderingTransaction;
    }
    constructor(listUser, container, notebookOptions, delegate, renderers, contextKeyService, options, listService, configurationService, instantiationService, notebookExecutionStateService) {
        super(listUser, container, delegate, renderers, options, contextKeyService, listService, configurationService, instantiationService);
        this.listUser = listUser;
        this.notebookOptions = notebookOptions;
        this._previousFocusedElements = [];
        this._localDisposableStore = new DisposableStore();
        this._viewModelStore = new DisposableStore();
        this._onDidRemoveOutputs = this._localDisposableStore.add(new Emitter());
        this.onDidRemoveOutputs = this._onDidRemoveOutputs.event;
        this._onDidHideOutputs = this._localDisposableStore.add(new Emitter());
        this.onDidHideOutputs = this._onDidHideOutputs.event;
        this._onDidRemoveCellsFromView = this._localDisposableStore.add(new Emitter());
        this.onDidRemoveCellsFromView = this._onDidRemoveCellsFromView.event;
        this._viewModel = null;
        this._hiddenRangeIds = [];
        this.hiddenRangesPrefixSum = null;
        this._onDidChangeVisibleRanges = this._localDisposableStore.add(new Emitter());
        this.onDidChangeVisibleRanges = this._onDidChangeVisibleRanges.event;
        this._visibleRanges = [];
        this._isDisposed = false;
        this._isInLayout = false;
        this._webviewElement = null;
        NOTEBOOK_CELL_LIST_FOCUSED.bindTo(this.contextKeyService).set(true);
        this._previousFocusedElements = this.getFocusedElements();
        this._localDisposableStore.add(this.onDidChangeFocus((e) => {
            this._previousFocusedElements.forEach((element) => {
                if (e.elements.indexOf(element) < 0) {
                    element.onDeselect();
                }
            });
            this._previousFocusedElements = e.elements;
        }));
        const notebookEditorCursorAtBoundaryContext = NOTEBOOK_EDITOR_CURSOR_BOUNDARY.bindTo(contextKeyService);
        notebookEditorCursorAtBoundaryContext.set('none');
        const notebookEditorCursorAtLineBoundaryContext = NOTEBOOK_EDITOR_CURSOR_LINE_BOUNDARY.bindTo(contextKeyService);
        notebookEditorCursorAtLineBoundaryContext.set('none');
        const cursorSelectionListener = this._localDisposableStore.add(new MutableDisposable());
        const textEditorAttachListener = this._localDisposableStore.add(new MutableDisposable());
        this._notebookCellAnchor = new NotebookCellAnchor(notebookExecutionStateService, configurationService, this.onDidScroll);
        const recomputeContext = (element) => {
            switch (element.cursorAtBoundary()) {
                case CursorAtBoundary.Both:
                    notebookEditorCursorAtBoundaryContext.set('both');
                    break;
                case CursorAtBoundary.Top:
                    notebookEditorCursorAtBoundaryContext.set('top');
                    break;
                case CursorAtBoundary.Bottom:
                    notebookEditorCursorAtBoundaryContext.set('bottom');
                    break;
                default:
                    notebookEditorCursorAtBoundaryContext.set('none');
                    break;
            }
            switch (element.cursorAtLineBoundary()) {
                case CursorAtLineBoundary.Both:
                    notebookEditorCursorAtLineBoundaryContext.set('both');
                    break;
                case CursorAtLineBoundary.Start:
                    notebookEditorCursorAtLineBoundaryContext.set('start');
                    break;
                case CursorAtLineBoundary.End:
                    notebookEditorCursorAtLineBoundaryContext.set('end');
                    break;
                default:
                    notebookEditorCursorAtLineBoundaryContext.set('none');
                    break;
            }
            return;
        };
        // Cursor Boundary context
        this._localDisposableStore.add(this.onDidChangeFocus((e) => {
            if (e.elements.length) {
                // we only validate the first focused element
                const focusedElement = e.elements[0];
                cursorSelectionListener.value = focusedElement.onDidChangeState((e) => {
                    if (e.selectionChanged) {
                        recomputeContext(focusedElement);
                    }
                });
                textEditorAttachListener.value = focusedElement.onDidChangeEditorAttachState(() => {
                    if (focusedElement.editorAttached) {
                        recomputeContext(focusedElement);
                    }
                });
                recomputeContext(focusedElement);
                return;
            }
            // reset context
            notebookEditorCursorAtBoundaryContext.set('none');
        }));
        // update visibleRanges
        const updateVisibleRanges = () => {
            if (!this.view.length) {
                return;
            }
            const top = this.getViewScrollTop();
            const bottom = this.getViewScrollBottom();
            if (top >= bottom) {
                return;
            }
            const topViewIndex = clamp(this.view.indexAt(top), 0, this.view.length - 1);
            const topElement = this.view.element(topViewIndex);
            const topModelIndex = this._viewModel.getCellIndex(topElement);
            const bottomViewIndex = clamp(this.view.indexAt(bottom), 0, this.view.length - 1);
            const bottomElement = this.view.element(bottomViewIndex);
            const bottomModelIndex = this._viewModel.getCellIndex(bottomElement);
            if (bottomModelIndex - topModelIndex === bottomViewIndex - topViewIndex) {
                this.visibleRanges = [{ start: topModelIndex, end: bottomModelIndex + 1 }];
            }
            else {
                this.visibleRanges = this._getVisibleRangesFromIndex(topViewIndex, topModelIndex, bottomViewIndex, bottomModelIndex);
            }
        };
        this._localDisposableStore.add(this.view.onDidChangeContentHeight(() => {
            if (this._isInLayout) {
                DOM.scheduleAtNextAnimationFrame(DOM.getWindow(container), () => {
                    updateVisibleRanges();
                });
            }
            updateVisibleRanges();
        }));
        this._localDisposableStore.add(this.view.onDidScroll(() => {
            if (this._isInLayout) {
                DOM.scheduleAtNextAnimationFrame(DOM.getWindow(container), () => {
                    updateVisibleRanges();
                });
            }
            updateVisibleRanges();
        }));
    }
    createListView(container, virtualDelegate, renderers, viewOptions) {
        const listView = new NotebookCellListView(container, virtualDelegate, renderers, viewOptions);
        this.viewZones = new NotebookViewZones(listView, this);
        this.cellOverlays = new NotebookCellOverlays(listView);
        return listView;
    }
    /**
     * Test Only
     */
    _getView() {
        return this.view;
    }
    attachWebview(element) {
        element.style.top = `-${NOTEBOOK_WEBVIEW_BOUNDARY}px`;
        this.rowsContainer.insertAdjacentElement('afterbegin', element);
        this._webviewElement = new FastDomNode(element);
    }
    elementAt(position) {
        if (!this.view.length) {
            return undefined;
        }
        const idx = this.view.indexAt(position);
        const clamped = clamp(idx, 0, this.view.length - 1);
        return this.element(clamped);
    }
    elementHeight(element) {
        const index = this._getViewIndexUpperBound(element);
        if (index === undefined || index < 0 || index >= this.length) {
            this._getViewIndexUpperBound(element);
            throw new ListError(this.listUser, `Invalid index ${index}`);
        }
        return this.view.elementHeight(index);
    }
    detachViewModel() {
        this._viewModelStore.clear();
        this._viewModel = null;
        this.hiddenRangesPrefixSum = null;
    }
    attachViewModel(model) {
        this._viewModel = model;
        this._viewModelStore.add(model.onDidChangeViewCells((e) => {
            if (this._isDisposed) {
                return;
            }
            // update whitespaces which are anchored to the model indexes
            this.viewZones.onCellsChanged(e);
            this.cellOverlays.onCellsChanged(e);
            const currentRanges = this._hiddenRangeIds
                .map((id) => this._viewModel.getTrackedRange(id))
                .filter((range) => range !== null);
            const newVisibleViewCells = getVisibleCells(this._viewModel.viewCells, currentRanges);
            const oldVisibleViewCells = [];
            const oldViewCellMapping = new Set();
            for (let i = 0; i < this.length; i++) {
                oldVisibleViewCells.push(this.element(i));
                oldViewCellMapping.add(this.element(i).uri.toString());
            }
            const viewDiffs = diff(oldVisibleViewCells, newVisibleViewCells, (a) => {
                return oldViewCellMapping.has(a.uri.toString());
            });
            if (e.synchronous) {
                this._updateElementsInWebview(viewDiffs);
            }
            else {
                this._viewModelStore.add(DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.rowsContainer), () => {
                    if (this._isDisposed) {
                        return;
                    }
                    this._updateElementsInWebview(viewDiffs);
                }));
            }
        }));
        this._viewModelStore.add(model.onDidChangeSelection((e) => {
            if (e === 'view') {
                return;
            }
            // convert model selections to view selections
            const viewSelections = cellRangesToIndexes(model.getSelections())
                .map((index) => model.cellAt(index))
                .filter((cell) => !!cell)
                .map((cell) => this._getViewIndexUpperBound(cell));
            this.setSelection(viewSelections, undefined, true);
            const primary = cellRangesToIndexes([model.getFocus()])
                .map((index) => model.cellAt(index))
                .filter((cell) => !!cell)
                .map((cell) => this._getViewIndexUpperBound(cell));
            if (primary.length) {
                this.setFocus(primary, undefined, true);
            }
        }));
        const hiddenRanges = model.getHiddenRanges();
        this.setHiddenAreas(hiddenRanges, false);
        const newRanges = reduceCellRanges(hiddenRanges);
        const viewCells = model.viewCells.slice(0);
        newRanges.reverse().forEach((range) => {
            const removedCells = viewCells.splice(range.start, range.end - range.start + 1);
            this._onDidRemoveCellsFromView.fire(removedCells);
        });
        this.splice2(0, 0, viewCells);
    }
    _updateElementsInWebview(viewDiffs) {
        viewDiffs.reverse().forEach((diff) => {
            const hiddenOutputs = [];
            const deletedOutputs = [];
            const removedMarkdownCells = [];
            for (let i = diff.start; i < diff.start + diff.deleteCount; i++) {
                const cell = this.element(i);
                if (cell.cellKind === CellKind.Code) {
                    if (this._viewModel.hasCell(cell)) {
                        hiddenOutputs.push(...cell?.outputsViewModels);
                    }
                    else {
                        deletedOutputs.push(...cell?.outputsViewModels);
                    }
                }
                else {
                    removedMarkdownCells.push(cell);
                }
            }
            this.splice2(diff.start, diff.deleteCount, diff.toInsert);
            this._onDidHideOutputs.fire(hiddenOutputs);
            this._onDidRemoveOutputs.fire(deletedOutputs);
            this._onDidRemoveCellsFromView.fire(removedMarkdownCells);
        });
    }
    clear() {
        super.splice(0, this.length);
    }
    setHiddenAreas(_ranges, triggerViewUpdate) {
        if (!this._viewModel) {
            return false;
        }
        const newRanges = reduceCellRanges(_ranges);
        // delete old tracking ranges
        const oldRanges = this._hiddenRangeIds
            .map((id) => this._viewModel.getTrackedRange(id))
            .filter((range) => range !== null);
        if (newRanges.length === oldRanges.length) {
            let hasDifference = false;
            for (let i = 0; i < newRanges.length; i++) {
                if (!(newRanges[i].start === oldRanges[i].start && newRanges[i].end === oldRanges[i].end)) {
                    hasDifference = true;
                    break;
                }
            }
            if (!hasDifference) {
                // they call 'setHiddenAreas' for a reason, even if the ranges are still the same, it's possible that the hiddenRangeSum is not update to date
                this._updateHiddenRangePrefixSum(newRanges);
                this.viewZones.onHiddenRangesChange();
                this.viewZones.layout();
                this.cellOverlays.onHiddenRangesChange();
                this.cellOverlays.layout();
                return false;
            }
        }
        this._hiddenRangeIds.forEach((id) => this._viewModel.setTrackedRange(id, null, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */));
        const hiddenAreaIds = newRanges
            .map((range) => this._viewModel.setTrackedRange(null, range, 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */))
            .filter((id) => id !== null);
        this._hiddenRangeIds = hiddenAreaIds;
        // set hidden ranges prefix sum
        this._updateHiddenRangePrefixSum(newRanges);
        // Update view zone positions after hidden ranges change
        this.viewZones.onHiddenRangesChange();
        this.cellOverlays.onHiddenRangesChange();
        if (triggerViewUpdate) {
            this.updateHiddenAreasInView(oldRanges, newRanges);
        }
        this.viewZones.layout();
        this.cellOverlays.layout();
        return true;
    }
    _updateHiddenRangePrefixSum(newRanges) {
        let start = 0;
        let index = 0;
        const ret = [];
        while (index < newRanges.length) {
            for (let j = start; j < newRanges[index].start - 1; j++) {
                ret.push(1);
            }
            ret.push(newRanges[index].end - newRanges[index].start + 1 + 1);
            start = newRanges[index].end + 1;
            index++;
        }
        for (let i = start; i < this._viewModel.length; i++) {
            ret.push(1);
        }
        const values = new Uint32Array(ret.length);
        for (let i = 0; i < ret.length; i++) {
            values[i] = ret[i];
        }
        this.hiddenRangesPrefixSum = new PrefixSumComputer(values);
    }
    /**
     * oldRanges and newRanges are all reduced and sorted.
     */
    updateHiddenAreasInView(oldRanges, newRanges) {
        const oldViewCellEntries = getVisibleCells(this._viewModel.viewCells, oldRanges);
        const oldViewCellMapping = new Set();
        oldViewCellEntries.forEach((cell) => {
            oldViewCellMapping.add(cell.uri.toString());
        });
        const newViewCellEntries = getVisibleCells(this._viewModel.viewCells, newRanges);
        const viewDiffs = diff(oldViewCellEntries, newViewCellEntries, (a) => {
            return oldViewCellMapping.has(a.uri.toString());
        });
        this._updateElementsInWebview(viewDiffs);
    }
    splice2(start, deleteCount, elements = []) {
        // we need to convert start and delete count based on hidden ranges
        if (start < 0 || start > this.view.length) {
            return;
        }
        const focusInside = DOM.isAncestorOfActiveElement(this.rowsContainer);
        super.splice(start, deleteCount, elements);
        if (focusInside) {
            this.domFocus();
        }
        const selectionsLeft = [];
        this.getSelectedElements().forEach((el) => {
            if (this._viewModel.hasCell(el)) {
                selectionsLeft.push(el.handle);
            }
        });
        if (!selectionsLeft.length && this._viewModel.viewCells.length) {
            // after splice, the selected cells are deleted
            this._viewModel.updateSelectionsState({
                kind: SelectionStateType.Index,
                focus: { start: 0, end: 1 },
                selections: [{ start: 0, end: 1 }],
            });
        }
        this.viewZones.layout();
        this.cellOverlays.layout();
    }
    getModelIndex(cell) {
        const viewIndex = this.indexOf(cell);
        return this.getModelIndex2(viewIndex);
    }
    getModelIndex2(viewIndex) {
        if (!this.hiddenRangesPrefixSum) {
            return viewIndex;
        }
        const modelIndex = this.hiddenRangesPrefixSum.getPrefixSum(viewIndex - 1);
        return modelIndex;
    }
    getViewIndex(cell) {
        const modelIndex = this._viewModel.getCellIndex(cell);
        return this.getViewIndex2(modelIndex);
    }
    getViewIndex2(modelIndex) {
        if (!this.hiddenRangesPrefixSum) {
            return modelIndex;
        }
        const viewIndexInfo = this.hiddenRangesPrefixSum.getIndexOf(modelIndex);
        if (viewIndexInfo.remainder !== 0) {
            if (modelIndex >= this.hiddenRangesPrefixSum.getTotalSum()) {
                // it's already after the last hidden range
                return (modelIndex -
                    (this.hiddenRangesPrefixSum.getTotalSum() - this.hiddenRangesPrefixSum.getCount()));
            }
            return undefined;
        }
        else {
            return viewIndexInfo.index;
        }
    }
    convertModelIndexToViewIndex(modelIndex) {
        if (!this.hiddenRangesPrefixSum) {
            return modelIndex;
        }
        if (modelIndex >= this.hiddenRangesPrefixSum.getTotalSum()) {
            // it's already after the last hidden range
            return Math.min(this.length, this.hiddenRangesPrefixSum.getTotalSum());
        }
        return this.hiddenRangesPrefixSum.getIndexOf(modelIndex).index;
    }
    modelIndexIsVisible(modelIndex) {
        if (!this.hiddenRangesPrefixSum) {
            return true;
        }
        const viewIndexInfo = this.hiddenRangesPrefixSum.getIndexOf(modelIndex);
        if (viewIndexInfo.remainder !== 0) {
            if (modelIndex >= this.hiddenRangesPrefixSum.getTotalSum()) {
                // it's already after the last hidden range
                return true;
            }
            return false;
        }
        else {
            return true;
        }
    }
    _getVisibleRangesFromIndex(topViewIndex, topModelIndex, bottomViewIndex, bottomModelIndex) {
        const stack = [];
        const ranges = [];
        // there are hidden ranges
        let index = topViewIndex;
        let modelIndex = topModelIndex;
        while (index <= bottomViewIndex) {
            const accu = this.hiddenRangesPrefixSum.getPrefixSum(index);
            if (accu === modelIndex + 1) {
                // no hidden area after it
                if (stack.length) {
                    if (stack[stack.length - 1] === modelIndex - 1) {
                        ranges.push({ start: stack[stack.length - 1], end: modelIndex + 1 });
                    }
                    else {
                        ranges.push({ start: stack[stack.length - 1], end: stack[stack.length - 1] + 1 });
                    }
                }
                stack.push(modelIndex);
                index++;
                modelIndex++;
            }
            else {
                // there are hidden ranges after it
                if (stack.length) {
                    if (stack[stack.length - 1] === modelIndex - 1) {
                        ranges.push({ start: stack[stack.length - 1], end: modelIndex + 1 });
                    }
                    else {
                        ranges.push({ start: stack[stack.length - 1], end: stack[stack.length - 1] + 1 });
                    }
                }
                stack.push(modelIndex);
                index++;
                modelIndex = accu;
            }
        }
        if (stack.length) {
            ranges.push({ start: stack[stack.length - 1], end: stack[stack.length - 1] + 1 });
        }
        return reduceCellRanges(ranges);
    }
    getVisibleRangesPlusViewportAboveAndBelow() {
        if (this.view.length <= 0) {
            return [];
        }
        const top = Math.max(this.getViewScrollTop() - this.renderHeight, 0);
        const topViewIndex = this.view.indexAt(top);
        const topElement = this.view.element(topViewIndex);
        const topModelIndex = this._viewModel.getCellIndex(topElement);
        const bottom = clamp(this.getViewScrollBottom() + this.renderHeight, 0, this.scrollHeight);
        const bottomViewIndex = clamp(this.view.indexAt(bottom), 0, this.view.length - 1);
        const bottomElement = this.view.element(bottomViewIndex);
        const bottomModelIndex = this._viewModel.getCellIndex(bottomElement);
        if (bottomModelIndex - topModelIndex === bottomViewIndex - topViewIndex) {
            return [{ start: topModelIndex, end: bottomModelIndex }];
        }
        else {
            return this._getVisibleRangesFromIndex(topViewIndex, topModelIndex, bottomViewIndex, bottomModelIndex);
        }
    }
    _getViewIndexUpperBound(cell) {
        if (!this._viewModel) {
            return -1;
        }
        const modelIndex = this._viewModel.getCellIndex(cell);
        if (modelIndex === -1) {
            return -1;
        }
        if (!this.hiddenRangesPrefixSum) {
            return modelIndex;
        }
        const viewIndexInfo = this.hiddenRangesPrefixSum.getIndexOf(modelIndex);
        if (viewIndexInfo.remainder !== 0) {
            if (modelIndex >= this.hiddenRangesPrefixSum.getTotalSum()) {
                return (modelIndex -
                    (this.hiddenRangesPrefixSum.getTotalSum() - this.hiddenRangesPrefixSum.getCount()));
            }
        }
        return viewIndexInfo.index;
    }
    _getViewIndexUpperBound2(modelIndex) {
        if (!this.hiddenRangesPrefixSum) {
            return modelIndex;
        }
        const viewIndexInfo = this.hiddenRangesPrefixSum.getIndexOf(modelIndex);
        if (viewIndexInfo.remainder !== 0) {
            if (modelIndex >= this.hiddenRangesPrefixSum.getTotalSum()) {
                return (modelIndex -
                    (this.hiddenRangesPrefixSum.getTotalSum() - this.hiddenRangesPrefixSum.getCount()));
            }
        }
        return viewIndexInfo.index;
    }
    focusElement(cell) {
        const index = this._getViewIndexUpperBound(cell);
        if (index >= 0 && this._viewModel) {
            // update view model first, which will update both `focus` and `selection` in a single transaction
            const focusedElementHandle = this.element(index).handle;
            this._viewModel.updateSelectionsState({
                kind: SelectionStateType.Handle,
                primary: focusedElementHandle,
                selections: [focusedElementHandle],
            }, 'view');
            // update the view as previous model update will not trigger event
            this.setFocus([index], undefined, false);
        }
    }
    selectElements(elements) {
        const indices = elements
            .map((cell) => this._getViewIndexUpperBound(cell))
            .filter((index) => index >= 0);
        this.setSelection(indices);
    }
    getCellViewScrollTop(cell) {
        const index = this._getViewIndexUpperBound(cell);
        if (index === undefined || index < 0 || index >= this.length) {
            throw new ListError(this.listUser, `Invalid index ${index}`);
        }
        return this.view.elementTop(index);
    }
    getCellViewScrollBottom(cell) {
        const index = this._getViewIndexUpperBound(cell);
        if (index === undefined || index < 0 || index >= this.length) {
            throw new ListError(this.listUser, `Invalid index ${index}`);
        }
        const top = this.view.elementTop(index);
        const height = this.view.elementHeight(index);
        return top + height;
    }
    setFocus(indexes, browserEvent, ignoreTextModelUpdate) {
        if (ignoreTextModelUpdate) {
            super.setFocus(indexes, browserEvent);
            return;
        }
        if (!indexes.length) {
            if (this._viewModel) {
                if (this.length) {
                    // Don't allow clearing focus, #121129
                    return;
                }
                this._viewModel.updateSelectionsState({
                    kind: SelectionStateType.Handle,
                    primary: null,
                    selections: [],
                }, 'view');
            }
        }
        else {
            if (this._viewModel) {
                const focusedElementHandle = this.element(indexes[0]).handle;
                this._viewModel.updateSelectionsState({
                    kind: SelectionStateType.Handle,
                    primary: focusedElementHandle,
                    selections: this.getSelection().map((selection) => this.element(selection).handle),
                }, 'view');
            }
        }
        super.setFocus(indexes, browserEvent);
    }
    setSelection(indexes, browserEvent, ignoreTextModelUpdate) {
        if (ignoreTextModelUpdate) {
            super.setSelection(indexes, browserEvent);
            return;
        }
        if (!indexes.length) {
            if (this._viewModel) {
                this._viewModel.updateSelectionsState({
                    kind: SelectionStateType.Handle,
                    primary: this.getFocusedElements()[0]?.handle ?? null,
                    selections: [],
                }, 'view');
            }
        }
        else {
            if (this._viewModel) {
                this._viewModel.updateSelectionsState({
                    kind: SelectionStateType.Handle,
                    primary: this.getFocusedElements()[0]?.handle ?? null,
                    selections: indexes.map((index) => this.element(index)).map((cell) => cell.handle),
                }, 'view');
            }
        }
        super.setSelection(indexes, browserEvent);
    }
    /**
     * The range will be revealed with as little scrolling as possible.
     */
    revealCells(range) {
        const startIndex = this._getViewIndexUpperBound2(range.start);
        if (startIndex < 0) {
            return;
        }
        const endIndex = this._getViewIndexUpperBound2(range.end - 1);
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        const elementTop = this.view.elementTop(startIndex);
        if (elementTop >= scrollTop && elementTop < wrapperBottom) {
            // start element is visible
            // check end
            const endElementTop = this.view.elementTop(endIndex);
            const endElementHeight = this.view.elementHeight(endIndex);
            if (endElementTop + endElementHeight <= wrapperBottom) {
                // fully visible
                return;
            }
            if (endElementTop >= wrapperBottom) {
                return this._revealInternal(endIndex, false, 2 /* CellRevealPosition.Bottom */);
            }
            if (endElementTop < wrapperBottom) {
                // end element partially visible
                if (endElementTop + endElementHeight - wrapperBottom < elementTop - scrollTop) {
                    // there is enough space to just scroll up a little bit to make the end element visible
                    return this.view.setScrollTop(scrollTop + endElementTop + endElementHeight - wrapperBottom);
                }
                else {
                    // don't even try it
                    return this._revealInternal(startIndex, false, 0 /* CellRevealPosition.Top */);
                }
            }
        }
        this._revealInViewWithMinimalScrolling(startIndex);
    }
    _revealInViewWithMinimalScrolling(viewIndex, firstLine) {
        const firstIndex = this.view.firstMostlyVisibleIndex;
        const elementHeight = this.view.elementHeight(viewIndex);
        if (viewIndex <= firstIndex || (!firstLine && elementHeight >= this.view.renderHeight)) {
            this._revealInternal(viewIndex, true, 0 /* CellRevealPosition.Top */);
        }
        else {
            this._revealInternal(viewIndex, true, 2 /* CellRevealPosition.Bottom */, firstLine);
        }
    }
    scrollToBottom() {
        const scrollHeight = this.view.scrollHeight;
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        this.view.setScrollTop(scrollHeight - (wrapperBottom - scrollTop));
    }
    /**
     * Reveals the given cell in the notebook cell list. The cell will come into view syncronously
     * but the cell's editor will be attached asyncronously if it was previously out of view.
     * @returns The promise to await for the cell editor to be attached
     */
    async revealCell(cell, revealType) {
        const index = this._getViewIndexUpperBound(cell);
        if (index < 0) {
            return;
        }
        switch (revealType) {
            case 2 /* CellRevealType.Top */:
                this._revealInternal(index, false, 0 /* CellRevealPosition.Top */);
                break;
            case 3 /* CellRevealType.Center */:
                this._revealInternal(index, false, 1 /* CellRevealPosition.Center */);
                break;
            case 4 /* CellRevealType.CenterIfOutsideViewport */:
                this._revealInternal(index, true, 1 /* CellRevealPosition.Center */);
                break;
            case 5 /* CellRevealType.NearTopIfOutsideViewport */:
                this._revealInternal(index, true, 3 /* CellRevealPosition.NearTop */);
                break;
            case 6 /* CellRevealType.FirstLineIfOutsideViewport */:
                this._revealInViewWithMinimalScrolling(index, true);
                break;
            case 1 /* CellRevealType.Default */:
                this._revealInViewWithMinimalScrolling(index);
                break;
        }
        if (
        // wait for the editor to be created if the cell is in editing mode
        (cell.getEditState() === CellEditState.Editing ||
            // wait for the editor to be created if we are revealing the first line of the cell
            (revealType === 6 /* CellRevealType.FirstLineIfOutsideViewport */ &&
                cell.cellKind === CellKind.Code)) &&
            !cell.editorAttached) {
            return getEditorAttachedPromise(cell);
        }
        return;
    }
    _revealInternal(viewIndex, ignoreIfInsideViewport, revealPosition, firstLine) {
        if (viewIndex >= this.view.length) {
            return;
        }
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        const elementTop = this.view.elementTop(viewIndex);
        const elementBottom = this.view.elementHeight(viewIndex) + elementTop;
        if (ignoreIfInsideViewport) {
            if (elementTop >= scrollTop && elementBottom < wrapperBottom) {
                // element is already fully visible
                return;
            }
        }
        switch (revealPosition) {
            case 0 /* CellRevealPosition.Top */:
                this.view.setScrollTop(elementTop);
                this.view.setScrollTop(this.view.elementTop(viewIndex));
                break;
            case 1 /* CellRevealPosition.Center */:
            case 3 /* CellRevealPosition.NearTop */:
                {
                    // reveal the cell top in the viewport center initially
                    this.view.setScrollTop(elementTop - this.view.renderHeight / 2);
                    // cell rendered already, we now have a more accurate cell height
                    const newElementTop = this.view.elementTop(viewIndex);
                    const newElementHeight = this.view.elementHeight(viewIndex);
                    const renderHeight = this.getViewScrollBottom() - this.getViewScrollTop();
                    if (newElementHeight >= renderHeight) {
                        // cell is larger than viewport, reveal top
                        this.view.setScrollTop(newElementTop);
                    }
                    else if (revealPosition === 1 /* CellRevealPosition.Center */) {
                        this.view.setScrollTop(newElementTop + newElementHeight / 2 - renderHeight / 2);
                    }
                    else if (revealPosition === 3 /* CellRevealPosition.NearTop */) {
                        this.view.setScrollTop(newElementTop - renderHeight / 5);
                    }
                }
                break;
            case 2 /* CellRevealPosition.Bottom */:
                if (firstLine) {
                    const lineHeight = this.viewModel?.layoutInfo?.fontInfo.lineHeight ?? 15;
                    const padding = this.notebookOptions.getLayoutConfiguration().cellTopMargin +
                        this.notebookOptions.getLayoutConfiguration().editorTopPadding;
                    const firstLineLocation = elementTop + lineHeight + padding;
                    if (firstLineLocation < wrapperBottom) {
                        // first line is already visible
                        return;
                    }
                    this.view.setScrollTop(this.scrollTop + (firstLineLocation - wrapperBottom));
                    break;
                }
                this.view.setScrollTop(this.scrollTop + (elementBottom - wrapperBottom));
                this.view.setScrollTop(this.scrollTop +
                    (this.view.elementTop(viewIndex) +
                        this.view.elementHeight(viewIndex) -
                        this.getViewScrollBottom()));
                break;
            default:
                break;
        }
    }
    //#region Reveal Cell Editor Range asynchronously
    async revealRangeInCell(cell, range, revealType) {
        const index = this._getViewIndexUpperBound(cell);
        if (index < 0) {
            return;
        }
        switch (revealType) {
            case CellRevealRangeType.Default:
                return this._revealRangeInternalAsync(index, range);
            case CellRevealRangeType.Center:
                return this._revealRangeInCenterInternalAsync(index, range);
            case CellRevealRangeType.CenterIfOutsideViewport:
                return this._revealRangeInCenterIfOutsideViewportInternalAsync(index, range);
        }
    }
    // List items have real dynamic heights, which means after we set `scrollTop` based on the `elementTop(index)`, the element at `index` might still be removed from the view once all relayouting tasks are done.
    // For example, we scroll item 10 into the view upwards, in the first round, items 7, 8, 9, 10 are all in the viewport. Then item 7 and 8 resize themselves to be larger and finally item 10 is removed from the view.
    // To ensure that item 10 is always there, we need to scroll item 10 to the top edge of the viewport.
    async _revealRangeInternalAsync(viewIndex, range) {
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        const elementTop = this.view.elementTop(viewIndex);
        const element = this.view.element(viewIndex);
        if (element.editorAttached) {
            this._revealRangeCommon(viewIndex, range);
        }
        else {
            const elementHeight = this.view.elementHeight(viewIndex);
            let alignHint = undefined;
            if (elementTop + elementHeight <= scrollTop) {
                // scroll up
                this.view.setScrollTop(elementTop);
                alignHint = 'top';
            }
            else if (elementTop >= wrapperBottom) {
                // scroll down
                this.view.setScrollTop(elementTop - this.view.renderHeight / 2);
                alignHint = 'bottom';
            }
            const editorAttachedPromise = new Promise((resolve, reject) => {
                Event.once(element.onDidChangeEditorAttachState)(() => {
                    element.editorAttached ? resolve() : reject();
                });
            });
            return editorAttachedPromise.then(() => {
                this._revealRangeCommon(viewIndex, range, alignHint);
            });
        }
    }
    async _revealRangeInCenterInternalAsync(viewIndex, range) {
        const reveal = (viewIndex, range) => {
            const element = this.view.element(viewIndex);
            const positionOffset = element.getPositionScrollTopOffset(range);
            const positionOffsetInView = this.view.elementTop(viewIndex) + positionOffset;
            this.view.setScrollTop(positionOffsetInView - this.view.renderHeight / 2);
            element.revealRangeInCenter(range);
        };
        const elementTop = this.view.elementTop(viewIndex);
        const viewItemOffset = elementTop;
        this.view.setScrollTop(viewItemOffset - this.view.renderHeight / 2);
        const element = this.view.element(viewIndex);
        if (!element.editorAttached) {
            return getEditorAttachedPromise(element).then(() => reveal(viewIndex, range));
        }
        else {
            reveal(viewIndex, range);
        }
    }
    async _revealRangeInCenterIfOutsideViewportInternalAsync(viewIndex, range) {
        const reveal = (viewIndex, range) => {
            const element = this.view.element(viewIndex);
            const positionOffset = element.getPositionScrollTopOffset(range);
            const positionOffsetInView = this.view.elementTop(viewIndex) + positionOffset;
            this.view.setScrollTop(positionOffsetInView - this.view.renderHeight / 2);
            element.revealRangeInCenter(range);
        };
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        const elementTop = this.view.elementTop(viewIndex);
        const viewItemOffset = elementTop;
        const element = this.view.element(viewIndex);
        const positionOffset = viewItemOffset + element.getPositionScrollTopOffset(range);
        if (positionOffset < scrollTop || positionOffset > wrapperBottom) {
            // let it render
            this.view.setScrollTop(positionOffset - this.view.renderHeight / 2);
            // after rendering, it might be pushed down due to markdown cell dynamic height
            const newPositionOffset = this.view.elementTop(viewIndex) + element.getPositionScrollTopOffset(range);
            this.view.setScrollTop(newPositionOffset - this.view.renderHeight / 2);
            // reveal editor
            if (!element.editorAttached) {
                return getEditorAttachedPromise(element).then(() => reveal(viewIndex, range));
            }
            else {
                // for example markdown
            }
        }
        else {
            if (element.editorAttached) {
                element.revealRangeInCenter(range);
            }
            else {
                // for example, markdown cell in preview mode
                return getEditorAttachedPromise(element).then(() => reveal(viewIndex, range));
            }
        }
    }
    _revealRangeCommon(viewIndex, range, alignHint) {
        const element = this.view.element(viewIndex);
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        const positionOffset = element.getPositionScrollTopOffset(range);
        const elementOriginalHeight = this.view.elementHeight(viewIndex);
        if (positionOffset >= elementOriginalHeight) {
            // we are revealing a range that is beyond current element height
            // if we don't update the element height now, and directly `setTop` to reveal the range
            // the element might be scrolled out of view
            // next frame, when we update the element height, the element will never be scrolled back into view
            const newTotalHeight = element.layoutInfo.totalHeight;
            this.updateElementHeight(viewIndex, newTotalHeight);
        }
        const elementTop = this.view.elementTop(viewIndex);
        const positionTop = elementTop + positionOffset;
        // TODO@rebornix 30 ---> line height * 1.5
        if (positionTop < scrollTop) {
            this.view.setScrollTop(positionTop - 30);
        }
        else if (positionTop > wrapperBottom) {
            this.view.setScrollTop(scrollTop + positionTop - wrapperBottom + 30);
        }
        else if (alignHint === 'bottom') {
            // Scrolled into view from below
            this.view.setScrollTop(scrollTop + positionTop - wrapperBottom + 30);
        }
        else if (alignHint === 'top') {
            // Scrolled into view from above
            this.view.setScrollTop(positionTop - 30);
        }
    }
    //#endregion
    /**
     * Reveals the specified offset of the given cell in the center of the viewport.
     * This enables revealing locations in the output as well as the input.
     */
    revealCellOffsetInCenter(cell, offset) {
        const viewIndex = this._getViewIndexUpperBound(cell);
        if (viewIndex >= 0) {
            const element = this.view.element(viewIndex);
            const elementTop = this.view.elementTop(viewIndex);
            if (element instanceof MarkupCellViewModel) {
                return this._revealInCenterIfOutsideViewport(viewIndex);
            }
            else {
                const rangeOffset = element.layoutInfo.outputContainerOffset +
                    Math.min(offset, element.layoutInfo.outputTotalHeight);
                this.view.setScrollTop(elementTop - this.view.renderHeight / 2);
                this.view.setScrollTop(elementTop + rangeOffset - this.view.renderHeight / 2);
            }
        }
    }
    revealOffsetInCenterIfOutsideViewport(offset) {
        const scrollTop = this.getViewScrollTop();
        const wrapperBottom = this.getViewScrollBottom();
        if (offset < scrollTop || offset > wrapperBottom) {
            const newTop = Math.max(0, offset - this.view.renderHeight / 2);
            this.view.setScrollTop(newTop);
        }
    }
    _revealInCenterIfOutsideViewport(viewIndex) {
        this._revealInternal(viewIndex, true, 1 /* CellRevealPosition.Center */);
    }
    domElementOfElement(element) {
        const index = this._getViewIndexUpperBound(element);
        if (index >= 0 && index < this.length) {
            return this.view.domElement(index);
        }
        return null;
    }
    focusView() {
        this.view.domNode.focus();
    }
    triggerScrollFromMouseWheelEvent(browserEvent) {
        this.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    isElementAboveViewport(index) {
        const elementTop = this.view.elementTop(index);
        const elementBottom = elementTop + this.view.elementHeight(index);
        return elementBottom < this.scrollTop;
    }
    updateElementHeight2(element, size, anchorElementIndex = null) {
        const index = this._getViewIndexUpperBound(element);
        if (index === undefined || index < 0 || index >= this.length) {
            return;
        }
        if (this.isElementAboveViewport(index)) {
            // update element above viewport
            const oldHeight = this.elementHeight(element);
            const delta = oldHeight - size;
            if (this._webviewElement) {
                Event.once(this.view.onWillScroll)(() => {
                    const webviewTop = parseInt(this._webviewElement.domNode.style.top, 10);
                    if (validateWebviewBoundary(this._webviewElement.domNode)) {
                        this._webviewElement.setTop(webviewTop - delta);
                    }
                    else {
                        // When the webview top boundary is below the list view scrollable element top boundary, then we can't insert a markdown cell at the top
                        // or when its bottom boundary is above the list view bottom boundary, then we can't insert a markdown cell at the end
                        // thus we have to revert the webview element position to initial state `-NOTEBOOK_WEBVIEW_BOUNDARY`.
                        // this will trigger one visual flicker (as we need to update element offsets in the webview)
                        // but as long as NOTEBOOK_WEBVIEW_BOUNDARY is large enough, it will happen less often
                        this._webviewElement.setTop(-NOTEBOOK_WEBVIEW_BOUNDARY);
                    }
                });
            }
            this.view.updateElementHeight(index, size, anchorElementIndex);
            this.viewZones.layout();
            this.cellOverlays.layout();
            return;
        }
        if (anchorElementIndex !== null) {
            this.view.updateElementHeight(index, size, anchorElementIndex);
            this.viewZones.layout();
            this.cellOverlays.layout();
            return;
        }
        const focused = this.getFocus();
        const focus = focused.length ? focused[0] : null;
        if (focus) {
            // If the cell is growing, we should favor anchoring to the focused cell
            const heightDelta = size - this.view.elementHeight(index);
            if (this._notebookCellAnchor.shouldAnchor(this.view, focus, heightDelta, this.element(index))) {
                this.view.updateElementHeight(index, size, focus);
                this.viewZones.layout();
                this.cellOverlays.layout();
                return;
            }
        }
        this.view.updateElementHeight(index, size, null);
        this.viewZones.layout();
        this.cellOverlays.layout();
        return;
    }
    changeViewZones(callback) {
        if (this.viewZones.changeViewZones(callback)) {
            this.viewZones.layout();
        }
    }
    changeCellOverlays(callback) {
        if (this.cellOverlays.changeCellOverlays(callback)) {
            this.cellOverlays.layout();
        }
    }
    getViewZoneLayoutInfo(viewZoneId) {
        return this.viewZones.getViewZoneLayoutInfo(viewZoneId);
    }
    // override
    domFocus() {
        const focused = this.getFocusedElements()[0];
        const focusedDomElement = focused && this.domElementOfElement(focused);
        if (this.view.domNode.ownerDocument.activeElement &&
            focusedDomElement &&
            focusedDomElement.contains(this.view.domNode.ownerDocument.activeElement)) {
            // for example, when focus goes into monaco editor, if we refocus the list view, the editor will lose focus.
            return;
        }
        if (!isMacintosh &&
            this.view.domNode.ownerDocument.activeElement &&
            !!DOM.findParentWithClass(this.view.domNode.ownerDocument.activeElement, 'context-view')) {
            return;
        }
        super.domFocus();
    }
    focusContainer(clearSelection) {
        if (clearSelection) {
            // allow focus to be between cells
            this._viewModel?.updateSelectionsState({
                kind: SelectionStateType.Handle,
                primary: null,
                selections: [],
            }, 'view');
            this.setFocus([], undefined, true);
            this.setSelection([], undefined, true);
        }
        super.domFocus();
    }
    getViewScrollTop() {
        return this.view.getScrollTop();
    }
    getViewScrollBottom() {
        return this.getViewScrollTop() + this.view.renderHeight;
    }
    setCellEditorSelection(cell, range) {
        const element = cell;
        if (element.editorAttached) {
            element.setSelection(range);
        }
        else {
            getEditorAttachedPromise(element).then(() => {
                element.setSelection(range);
            });
        }
    }
    style(styles) {
        const selectorSuffix = this.view.domId;
        if (!this.styleElement) {
            this.styleElement = domStylesheetsJs.createStyleSheet(this.view.domNode);
        }
        const suffix = selectorSuffix && `.${selectorSuffix}`;
        const content = [];
        if (styles.listBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows { background: ${styles.listBackground}; }`);
        }
        if (styles.listFocusBackground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { background-color: ${styles.listFocusBackground}; }`);
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused:hover { background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listFocusForeground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
        }
        if (styles.listActiveSelectionBackground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { background-color: ${styles.listActiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected:hover { background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listActiveSelectionForeground) {
            content.push(`.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
        }
        if (styles.listFocusAndSelectionBackground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected.focused { background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
        }
        if (styles.listFocusAndSelectionForeground) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
        }
        if (styles.listInactiveFocusBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { background-color:  ${styles.listInactiveFocusBackground}; }`);
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused:hover { background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionBackground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { background-color:  ${styles.listInactiveSelectionBackground}; }`);
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected:hover { background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
        }
        if (styles.listInactiveSelectionForeground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
        }
        if (styles.listHoverBackground) {
            content.push(`.monaco-list${suffix}:not(.drop-target) > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { background-color:  ${styles.listHoverBackground}; }`);
        }
        if (styles.listHoverForeground) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
        }
        if (styles.listSelectionOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
        }
        if (styles.listFocusOutline) {
            content.push(`
				.monaco-drag-image${suffix},
				.monaco-list${suffix}:focus > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
        }
        if (styles.listInactiveFocusOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
        }
        if (styles.listHoverOutline) {
            content.push(`.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows > .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
        }
        if (styles.listDropOverBackground) {
            content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-rows.drop-target,
				.monaco-list${suffix} > div.monaco-scrollable-element > .monaco-list-row.drop-target { background-color: ${styles.listDropOverBackground} !important; color: inherit !important; }
			`);
        }
        const newStyles = content.join('\n');
        if (newStyles !== this.styleElement.textContent) {
            this.styleElement.textContent = newStyles;
        }
    }
    getRenderHeight() {
        return this.view.renderHeight;
    }
    getScrollHeight() {
        return this.view.scrollHeight;
    }
    layout(height, width) {
        this._isInLayout = true;
        super.layout(height, width);
        if (this.renderHeight === 0) {
            this.view.domNode.style.visibility = 'hidden';
        }
        else {
            this.view.domNode.style.visibility = 'initial';
        }
        this._isInLayout = false;
    }
    dispose() {
        this._isDisposed = true;
        this._viewModelStore.dispose();
        this._localDisposableStore.dispose();
        this._notebookCellAnchor.dispose();
        this.viewZones.dispose();
        this.cellOverlays.dispose();
        super.dispose();
        // un-ref
        this._previousFocusedElements = [];
        this._viewModel = null;
        this._hiddenRangeIds = [];
        this.hiddenRangesPrefixSum = null;
        this._visibleRanges = [];
    }
};
NotebookCellList = __decorate([
    __param(7, IListService),
    __param(8, IConfigurationService),
    __param(9, IInstantiationService),
    __param(10, INotebookExecutionStateService)
], NotebookCellList);
export { NotebookCellList };
export class ListViewInfoAccessor extends Disposable {
    constructor(list) {
        super();
        this.list = list;
    }
    getViewIndex(cell) {
        return this.list.getViewIndex(cell) ?? -1;
    }
    getViewHeight(cell) {
        if (!this.list.viewModel) {
            return -1;
        }
        return this.list.elementHeight(cell);
    }
    getCellRangeFromViewRange(startIndex, endIndex) {
        if (!this.list.viewModel) {
            return undefined;
        }
        const modelIndex = this.list.getModelIndex2(startIndex);
        if (modelIndex === undefined) {
            throw new Error(`startIndex ${startIndex} out of boundary`);
        }
        if (endIndex >= this.list.length) {
            // it's the end
            const endModelIndex = this.list.viewModel.length;
            return { start: modelIndex, end: endModelIndex };
        }
        else {
            const endModelIndex = this.list.getModelIndex2(endIndex);
            if (endModelIndex === undefined) {
                throw new Error(`endIndex ${endIndex} out of boundary`);
            }
            return { start: modelIndex, end: endModelIndex };
        }
    }
    getCellsFromViewRange(startIndex, endIndex) {
        if (!this.list.viewModel) {
            return [];
        }
        const range = this.getCellRangeFromViewRange(startIndex, endIndex);
        if (!range) {
            return [];
        }
        return this.list.viewModel.getCellsInRange(range);
    }
    getCellsInRange(range) {
        return this.list.viewModel?.getCellsInRange(range) ?? [];
    }
    getVisibleRangesPlusViewportAboveAndBelow() {
        return this.list?.getVisibleRangesPlusViewportAboveAndBelow() ?? [];
    }
}
function getEditorAttachedPromise(element) {
    return new Promise((resolve, reject) => {
        Event.once(element.onDidChangeEditorAttachState)(() => element.editorAttached ? resolve() : reject());
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L25vdGVib29rQ2VsbExpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sK0NBQStDLENBQUE7QUFFakYsT0FBTyxFQUdOLFNBQVMsR0FDVCxNQUFNLDZDQUE2QyxDQUFBO0FBRXBELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsaUJBQWlCLEdBQ2pCLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBS3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFDTixZQUFZLEVBRVosYUFBYSxHQUNiLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUNOLGdCQUFnQixFQUVoQixhQUFhLEVBR2IsbUJBQW1CLEVBQ25CLG9CQUFvQixHQUdwQixNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFDTixJQUFJLEVBQ0osK0JBQStCLEVBQy9CLFFBQVEsRUFDUixrQkFBa0IsRUFDbEIsb0NBQW9DLEdBQ3BDLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUVOLG1CQUFtQixFQUNuQixnQkFBZ0IsRUFDaEIsZUFBZSxHQUNmLE1BQU0sK0JBQStCLENBQUE7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