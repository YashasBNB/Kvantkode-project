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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY2VsbERuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUYsT0FBTyxLQUFLLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sK0JBQStCLEdBRy9CLE1BQU0sMEJBQTBCLENBQUE7QUFFakMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRWhELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzNGLE9BQU8sRUFBK0Isa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQWMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRixNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBRWYsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFBO0FBQ3RDLE1BQU0saUJBQWlCLEdBQUcsb0JBQW9CLENBQUE7QUFZOUMsTUFBTSxPQUFPLG1CQUFvQixTQUFRLGVBQWU7SUFDdkQsWUFBNkIsU0FBc0I7UUFDbEQsS0FBSyxFQUFFLENBQUE7UUFEcUIsY0FBUyxHQUFULFNBQVMsQ0FBYTtJQUVuRCxDQUFDO0lBRVEsYUFBYSxDQUFDLE9BQXVCO1FBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDckIsQ0FBQztJQUVR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