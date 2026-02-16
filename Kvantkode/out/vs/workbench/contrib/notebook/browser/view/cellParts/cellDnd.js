/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../../../base/browser/dom.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Disposable, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import * as platform from '../../../../../../base/common/platform.js';
import { expandCellRangesWithHiddenCells, } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
import { cloneNotebookCellTextModel } from '../../../common/model/notebookCellTextModel.js';
import { SelectionStateType } from '../../../common/notebookCommon.js';
import { cellRangesToIndexes } from '../../../common/notebookRange.js';
const $ = DOM.$;
const DRAGGING_CLASS = 'cell-dragging';
const GLOBAL_DRAG_CLASS = 'global-drag-active';
export class CellDragAndDropPart extends CellContentPart {
    constructor(container) {
        super();
        this.container = container;
    }
    didRenderCell(element) {
        this.update(element);
    }
    updateState(element, e) {
        if (e.dragStateChanged) {
            this.update(element);
        }
    }
    update(element) {
        this.container.classList.toggle(DRAGGING_CLASS, element.dragging);
    }
}
export class CellDragAndDropController extends Disposable {
    constructor(notebookEditor, notebookListContainer) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookListContainer = notebookListContainer;
        this.draggedCells = [];
        this.isScrolling = false;
        this.listOnWillScrollListener = this._register(new MutableDisposable());
        this.listInsertionIndicator = DOM.append(notebookListContainer, $('.cell-list-insertion-indicator'));
        this._register(DOM.addDisposableListener(notebookListContainer.ownerDocument.body, DOM.EventType.DRAG_START, this.onGlobalDragStart.bind(this), true));
        this._register(DOM.addDisposableListener(notebookListContainer.ownerDocument.body, DOM.EventType.DRAG_END, this.onGlobalDragEnd.bind(this), true));
        const addCellDragListener = (eventType, handler, useCapture = false) => {
            this._register(DOM.addDisposableListener(notebookEditor.getDomNode(), eventType, (e) => {
                const cellDragEvent = this.toCellDragEvent(e);
                if (cellDragEvent) {
                    handler(cellDragEvent);
                }
            }, useCapture));
        };
        addCellDragListener(DOM.EventType.DRAG_OVER, (event) => {
            if (!this.currentDraggedCell) {
                return;
            }
            event.browserEvent.preventDefault();
            this.onCellDragover(event);
        }, true);
        addCellDragListener(DOM.EventType.DROP, (event) => {
            if (!this.currentDraggedCell) {
                return;
            }
            event.browserEvent.preventDefault();
            this.onCellDrop(event);
        });
        addCellDragListener(DOM.EventType.DRAG_LEAVE, (event) => {
            event.browserEvent.preventDefault();
            this.onCellDragLeave(event);
        });
        this.scrollingDelayer = this._register(new Delayer(200));
    }
    setList(value) {
        this.list = value;
        this.listOnWillScrollListener.value = this.list.onWillScroll((e) => {
            if (!e.scrollTopChanged) {
                return;
            }
            this.setInsertIndicatorVisibility(false);
            this.isScrolling = true;
            this.scrollingDelayer.trigger(() => {
                this.isScrolling = false;
            });
        });
    }
    setInsertIndicatorVisibility(visible) {
        this.listInsertionIndicator.style.opacity = visible ? '1' : '0';
    }
    toCellDragEvent(event) {
        const targetTop = this.notebookListContainer.getBoundingClientRect().top;
        const dragOffset = this.list.scrollTop + event.clientY - targetTop;
        const draggedOverCell = this.list.elementAt(dragOffset);
        if (!draggedOverCell) {
            return undefined;
        }
        const cellTop = this.list.getCellViewScrollTop(draggedOverCell);
        const cellHeight = this.list.elementHeight(draggedOverCell);
        const dragPosInElement = dragOffset - cellTop;
        const dragPosRatio = dragPosInElement / cellHeight;
        return {
            browserEvent: event,
            draggedOverCell,
            cellTop,
            cellHeight,
            dragPosRatio,
        };
    }
    clearGlobalDragState() {
        this.notebookEditor.getDomNode().classList.remove(GLOBAL_DRAG_CLASS);
    }
    onGlobalDragStart() {
        this.notebookEditor.getDomNode().classList.add(GLOBAL_DRAG_CLASS);
    }
    onGlobalDragEnd() {
        this.notebookEditor.getDomNode().classList.remove(GLOBAL_DRAG_CLASS);
    }
    onCellDragover(event) {
        if (!event.browserEvent.dataTransfer) {
            return;
        }
        if (!this.currentDraggedCell) {
            event.browserEvent.dataTransfer.dropEffect = 'none';
            return;
        }
        if (this.isScrolling || this.currentDraggedCell === event.draggedOverCell) {
            this.setInsertIndicatorVisibility(false);
            return;
        }
        const dropDirection = this.getDropInsertDirection(event.dragPosRatio);
        const insertionIndicatorAbsolutePos = dropDirection === 'above' ? event.cellTop : event.cellTop + event.cellHeight;
        this.updateInsertIndicator(dropDirection, insertionIndicatorAbsolutePos);
    }
    updateInsertIndicator(dropDirection, insertionIndicatorAbsolutePos) {
        const { bottomToolbarGap } = this.notebookEditor.notebookOptions.computeBottomToolbarDimensions(this.notebookEditor.textModel?.viewType);
        const insertionIndicatorTop = insertionIndicatorAbsolutePos - this.list.scrollTop + bottomToolbarGap / 2;
        if (insertionIndicatorTop >= 0) {
            this.listInsertionIndicator.style.top = `${insertionIndicatorTop}px`;
            this.setInsertIndicatorVisibility(true);
        }
        else {
            this.setInsertIndicatorVisibility(false);
        }
    }
    getDropInsertDirection(dragPosRatio) {
        return dragPosRatio < 0.5 ? 'above' : 'below';
    }
    onCellDrop(event) {
        const draggedCell = this.currentDraggedCell;
        if (this.isScrolling || this.currentDraggedCell === event.draggedOverCell) {
            return;
        }
        this.dragCleanup();
        const dropDirection = this.getDropInsertDirection(event.dragPosRatio);
        this._dropImpl(draggedCell, dropDirection, event.browserEvent, event.draggedOverCell);
    }
    getCellRangeAroundDragTarget(draggedCellIndex) {
        const selections = this.notebookEditor.getSelections();
        const modelRanges = expandCellRangesWithHiddenCells(this.notebookEditor, selections);
        const nearestRange = modelRanges.find((range) => range.start <= draggedCellIndex && draggedCellIndex < range.end);
        if (nearestRange) {
            return nearestRange;
        }
        else {
            return { start: draggedCellIndex, end: draggedCellIndex + 1 };
        }
    }
    _dropImpl(draggedCell, dropDirection, ctx, draggedOverCell) {
        const cellTop = this.list.getCellViewScrollTop(draggedOverCell);
        const cellHeight = this.list.elementHeight(draggedOverCell);
        const insertionIndicatorAbsolutePos = dropDirection === 'above' ? cellTop : cellTop + cellHeight;
        const { bottomToolbarGap } = this.notebookEditor.notebookOptions.computeBottomToolbarDimensions(this.notebookEditor.textModel?.viewType);
        const insertionIndicatorTop = insertionIndicatorAbsolutePos - this.list.scrollTop + bottomToolbarGap / 2;
        const editorHeight = this.notebookEditor.getDomNode().getBoundingClientRect().height;
        if (insertionIndicatorTop < 0 || insertionIndicatorTop > editorHeight) {
            // Ignore drop, insertion point is off-screen
            return;
        }
        const isCopy = (ctx.ctrlKey && !platform.isMacintosh) || (ctx.altKey && platform.isMacintosh);
        if (!this.notebookEditor.hasModel()) {
            return;
        }
        const textModel = this.notebookEditor.textModel;
        if (isCopy) {
            const draggedCellIndex = this.notebookEditor.getCellIndex(draggedCell);
            const range = this.getCellRangeAroundDragTarget(draggedCellIndex);
            let originalToIdx = this.notebookEditor.getCellIndex(draggedOverCell);
            if (dropDirection === 'below') {
                const relativeToIndex = this.notebookEditor.getCellIndex(draggedOverCell);
                const newIdx = this.notebookEditor.getNextVisibleCellIndex(relativeToIndex);
                originalToIdx = newIdx;
            }
            let finalSelection;
            let finalFocus;
            if (originalToIdx <= range.start) {
                finalSelection = { start: originalToIdx, end: originalToIdx + range.end - range.start };
                finalFocus = {
                    start: originalToIdx + draggedCellIndex - range.start,
                    end: originalToIdx + draggedCellIndex - range.start + 1,
                };
            }
            else {
                const delta = originalToIdx - range.start;
                finalSelection = { start: range.start + delta, end: range.end + delta };
                finalFocus = { start: draggedCellIndex + delta, end: draggedCellIndex + delta + 1 };
            }
            textModel.applyEdits([
                {
                    editType: 1 /* CellEditType.Replace */,
                    index: originalToIdx,
                    count: 0,
                    cells: cellRangesToIndexes([range]).map((index) => cloneNotebookCellTextModel(this.notebookEditor.cellAt(index).model)),
                },
            ], true, {
                kind: SelectionStateType.Index,
                focus: this.notebookEditor.getFocus(),
                selections: this.notebookEditor.getSelections(),
            }, () => ({ kind: SelectionStateType.Index, focus: finalFocus, selections: [finalSelection] }), undefined, true);
            this.notebookEditor.revealCellRangeInView(finalSelection);
        }
        else {
            performCellDropEdits(this.notebookEditor, draggedCell, dropDirection, draggedOverCell);
        }
    }
    onCellDragLeave(event) {
        if (!event.browserEvent.relatedTarget ||
            !DOM.isAncestor(event.browserEvent.relatedTarget, this.notebookEditor.getDomNode())) {
            this.setInsertIndicatorVisibility(false);
        }
    }
    dragCleanup() {
        if (this.currentDraggedCell) {
            this.draggedCells.forEach((cell) => (cell.dragging = false));
            this.currentDraggedCell = undefined;
            this.draggedCells = [];
        }
        this.setInsertIndicatorVisibility(false);
    }
    registerDragHandle(templateData, cellRoot, dragHandles, dragImageProvider) {
        const container = templateData.container;
        for (const dragHandle of dragHandles) {
            dragHandle.setAttribute('draggable', 'true');
        }
        const onDragEnd = () => {
            if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled ||
                !!this.notebookEditor.isReadOnly) {
                return;
            }
            // Note, templateData may have a different element rendered into it by now
            container.classList.remove(DRAGGING_CLASS);
            this.dragCleanup();
        };
        for (const dragHandle of dragHandles) {
            templateData.templateDisposables.add(DOM.addDisposableListener(dragHandle, DOM.EventType.DRAG_END, onDragEnd));
        }
        const onDragStart = (event) => {
            if (!event.dataTransfer) {
                return;
            }
            if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled ||
                !!this.notebookEditor.isReadOnly) {
                return;
            }
            this.currentDraggedCell = templateData.currentRenderedCell;
            this.draggedCells = this.notebookEditor
                .getSelections()
                .map((range) => this.notebookEditor.getCellsInRange(range))
                .flat();
            this.draggedCells.forEach((cell) => (cell.dragging = true));
            const dragImage = dragImageProvider();
            cellRoot.parentElement.appendChild(dragImage);
            event.dataTransfer.setDragImage(dragImage, 0, 0);
            setTimeout(() => dragImage.remove(), 0); // Comment this out to debug drag image layout
        };
        for (const dragHandle of dragHandles) {
            templateData.templateDisposables.add(DOM.addDisposableListener(dragHandle, DOM.EventType.DRAG_START, onDragStart));
        }
    }
    startExplicitDrag(cell, _dragOffsetY) {
        if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled ||
            !!this.notebookEditor.isReadOnly) {
            return;
        }
        this.currentDraggedCell = cell;
        this.setInsertIndicatorVisibility(true);
    }
    explicitDrag(cell, dragOffsetY) {
        if (!this.notebookEditor.notebookOptions.getDisplayOptions().dragAndDropEnabled ||
            !!this.notebookEditor.isReadOnly) {
            return;
        }
        const target = this.list.elementAt(dragOffsetY);
        if (target && target !== cell) {
            const cellTop = this.list.getCellViewScrollTop(target);
            const cellHeight = this.list.elementHeight(target);
            const dropDirection = this.getExplicitDragDropDirection(dragOffsetY, cellTop, cellHeight);
            const insertionIndicatorAbsolutePos = dropDirection === 'above' ? cellTop : cellTop + cellHeight;
            this.updateInsertIndicator(dropDirection, insertionIndicatorAbsolutePos);
        }
        // Try scrolling list if needed
        if (this.currentDraggedCell !== cell) {
            return;
        }
        const notebookViewRect = this.notebookEditor.getDomNode().getBoundingClientRect();
        const eventPositionInView = dragOffsetY - this.list.scrollTop;
        // Percentage from the top/bottom of the screen where we start scrolling while dragging
        const notebookViewScrollMargins = 0.2;
        const maxScrollDeltaPerFrame = 20;
        const eventPositionRatio = eventPositionInView / notebookViewRect.height;
        if (eventPositionRatio < notebookViewScrollMargins) {
            this.list.scrollTop -=
                maxScrollDeltaPerFrame * (1 - eventPositionRatio / notebookViewScrollMargins);
        }
        else if (eventPositionRatio > 1 - notebookViewScrollMargins) {
            this.list.scrollTop +=
                maxScrollDeltaPerFrame * (1 - (1 - eventPositionRatio) / notebookViewScrollMargins);
        }
    }
    endExplicitDrag(_cell) {
        this.setInsertIndicatorVisibility(false);
    }
    explicitDrop(cell, ctx) {
        this.currentDraggedCell = undefined;
        this.setInsertIndicatorVisibility(false);
        const target = this.list.elementAt(ctx.dragOffsetY);
        if (!target || target === cell) {
            return;
        }
        const cellTop = this.list.getCellViewScrollTop(target);
        const cellHeight = this.list.elementHeight(target);
        const dropDirection = this.getExplicitDragDropDirection(ctx.dragOffsetY, cellTop, cellHeight);
        this._dropImpl(cell, dropDirection, ctx, target);
    }
    getExplicitDragDropDirection(clientY, cellTop, cellHeight) {
        const dragPosInElement = clientY - cellTop;
        const dragPosRatio = dragPosInElement / cellHeight;
        return this.getDropInsertDirection(dragPosRatio);
    }
    dispose() {
        this.notebookEditor = null;
        super.dispose();
    }
}
export function performCellDropEdits(editor, draggedCell, dropDirection, draggedOverCell) {
    const draggedCellIndex = editor.getCellIndex(draggedCell);
    let originalToIdx = editor.getCellIndex(draggedOverCell);
    if (typeof draggedCellIndex !== 'number' || typeof originalToIdx !== 'number') {
        return;
    }
    // If dropped on a folded markdown range, insert after the folding range
    if (dropDirection === 'below') {
        const newIdx = editor.getNextVisibleCellIndex(originalToIdx) ?? originalToIdx;
        originalToIdx = newIdx;
    }
    let selections = editor.getSelections();
    if (!selections.length) {
        selections = [editor.getFocus()];
    }
    let originalFocusIdx = editor.getFocus().start;
    // If the dragged cell is not focused/selected, ignore the current focus/selection and use the dragged idx
    if (!selections.some((s) => s.start <= draggedCellIndex && s.end > draggedCellIndex)) {
        selections = [{ start: draggedCellIndex, end: draggedCellIndex + 1 }];
        originalFocusIdx = draggedCellIndex;
    }
    const droppedInSelection = selections.find((range) => range.start <= originalToIdx && range.end > originalToIdx);
    if (droppedInSelection) {
        originalToIdx = droppedInSelection.start;
    }
    let numCells = 0;
    let focusNewIdx = originalToIdx;
    let newInsertionIdx = originalToIdx;
    // Compute a set of edits which will be applied in reverse order by the notebook text model.
    // `index`: the starting index of the range, after previous edits have been applied
    // `newIdx`: the destination index, after this edit's range has been removed
    selections.sort((a, b) => b.start - a.start);
    const edits = selections.map((range) => {
        const length = range.end - range.start;
        // If this range is before the insertion point, subtract the cells in this range from the "to" index
        let toIndexDelta = 0;
        if (range.end <= newInsertionIdx) {
            toIndexDelta = -length;
        }
        const newIdx = newInsertionIdx + toIndexDelta;
        // If this range contains the focused cell, set the new focus index to the new index of the cell
        if (originalFocusIdx >= range.start && originalFocusIdx <= range.end) {
            const offset = originalFocusIdx - range.start;
            focusNewIdx = newIdx + offset;
        }
        // If below the insertion point, the original index will have been shifted down
        const fromIndexDelta = range.start >= originalToIdx ? numCells : 0;
        const edit = {
            editType: 6 /* CellEditType.Move */,
            index: range.start + fromIndexDelta,
            length,
            newIdx,
        };
        numCells += length;
        // If a range was moved down, the insertion index needs to be adjusted
        if (range.end < newInsertionIdx) {
            newInsertionIdx -= length;
        }
        return edit;
    });
    const lastEdit = edits[edits.length - 1];
    const finalSelection = { start: lastEdit.newIdx, end: lastEdit.newIdx + numCells };
    const finalFocus = { start: focusNewIdx, end: focusNewIdx + 1 };
    editor.textModel.applyEdits(edits, true, {
        kind: SelectionStateType.Index,
        focus: editor.getFocus(),
        selections: editor.getSelections(),
    }, () => ({ kind: SelectionStateType.Index, focus: finalFocus, selections: [finalSelection] }), undefined, true);
    editor.revealCellRangeInView(finalSelection);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3L2NlbGxQYXJ0cy9jZWxsRG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRixPQUFPLEtBQUssUUFBUSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3JFLE9BQU8sRUFDTiwrQkFBK0IsR0FHL0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUVqQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFaEQsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDM0YsT0FBTyxFQUErQixrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBYyxNQUFNLGtDQUFrQyxDQUFBO0FBRWxGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFZixNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUE7QUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxvQkFBb0IsQ0FBQTtBQVk5QyxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsZUFBZTtJQUN2RCxZQUE2QixTQUFzQjtRQUNsRCxLQUFLLEVBQUUsQ0FBQTtRQURxQixjQUFTLEdBQVQsU0FBUyxDQUFhO0lBRW5ELENBQUM7SUFFUSxhQUFhLENBQUMsT0FBdUI7UUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENB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