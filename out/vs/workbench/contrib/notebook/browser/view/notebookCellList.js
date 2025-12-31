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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9ub3RlYm9va0NlbGxMaXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxLQUFLLGdCQUFnQixNQUFNLCtDQUErQyxDQUFBO0FBRWpGLE9BQU8sRUFHTixTQUFTLEdBQ1QsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUtwRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQ04sWUFBWSxFQUVaLGFBQWEsR0FDYixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFDTixnQkFBZ0IsRUFFaEIsYUFBYSxFQUdiLG1CQUFtQixFQUNuQixvQkFBb0IsR0FHcEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixPQUFPLEVBQ04sSUFBSSxFQUNKLCtCQUErQixFQUMvQixRQUFRLEVBQ1Isa0JBQWtCLEVBQ2xCLG9DQUFvQyxHQUNwQyxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFFTixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLGVBQWUsR0FDZixNQUFNLCtCQUErQixDQUFBO0FBQ3RD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