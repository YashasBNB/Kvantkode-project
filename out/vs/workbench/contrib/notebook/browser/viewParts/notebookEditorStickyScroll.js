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
var NotebookStickyScroll_1;
import * as DOM from '../../../../../base/browser/dom.js';
import { EventType as TouchEventType } from '../../../../../base/browser/touch.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, } from '../../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { CellKind } from '../../common/notebookCommon.js';
import { Delayer } from '../../../../../base/common/async.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { foldingCollapsedIcon, foldingExpandedIcon, } from '../../../../../editor/contrib/folding/browser/foldingDecorations.js';
import { FoldingController } from '../controller/foldingController.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotebookCellOutlineDataSourceFactory } from '../viewModel/notebookOutlineDataSourceFactory.js';
export class NotebookStickyLine extends Disposable {
    constructor(element, foldingIcon, header, entry, notebookEditor) {
        super();
        this.element = element;
        this.foldingIcon = foldingIcon;
        this.header = header;
        this.entry = entry;
        this.notebookEditor = notebookEditor;
        // click the header to focus the cell
        this._register(DOM.addDisposableListener(this.header, DOM.EventType.CLICK || TouchEventType.Tap, () => {
            this.focusCell();
        }));
        // click the folding icon to fold the range covered by the header
        this._register(DOM.addDisposableListener(this.foldingIcon.domNode, DOM.EventType.CLICK || TouchEventType.Tap, () => {
            if (this.entry.cell.cellKind === CellKind.Markup) {
                const currentFoldingState = this.entry.cell.foldingState;
                this.toggleFoldRange(currentFoldingState);
            }
        }));
    }
    toggleFoldRange(currentState) {
        const foldingController = this.notebookEditor.getContribution(FoldingController.id);
        const index = this.entry.index;
        const headerLevel = this.entry.level;
        const newFoldingState = currentState === 2 /* CellFoldingState.Collapsed */
            ? 1 /* CellFoldingState.Expanded */
            : 2 /* CellFoldingState.Collapsed */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
        this.focusCell();
    }
    focusCell() {
        this.notebookEditor.focusNotebookCell(this.entry.cell, 'container');
        const cellScrollTop = this.notebookEditor.getAbsoluteTopOfElement(this.entry.cell);
        const parentCount = NotebookStickyLine.getParentCount(this.entry);
        // 1.1 addresses visible cell padding, to make sure we don't focus md cell and also render its sticky line
        this.notebookEditor.setScrollTop(cellScrollTop - (parentCount + 1.1) * 22);
    }
    static getParentCount(entry) {
        let count = 0;
        while (entry.parent) {
            count++;
            entry = entry.parent;
        }
        return count;
    }
}
class StickyFoldingIcon {
    constructor(isCollapsed, dimension) {
        this.isCollapsed = isCollapsed;
        this.dimension = dimension;
        this.domNode = document.createElement('div');
        this.domNode.style.width = `${dimension}px`;
        this.domNode.style.height = `${dimension}px`;
        this.domNode.className = ThemeIcon.asClassName(isCollapsed ? foldingCollapsedIcon : foldingExpandedIcon);
    }
    setVisible(visible) {
        this.domNode.style.cursor = visible ? 'pointer' : 'default';
        this.domNode.style.opacity = visible ? '1' : '0';
    }
}
let NotebookStickyScroll = NotebookStickyScroll_1 = class NotebookStickyScroll extends Disposable {
    getDomNode() {
        return this.domNode;
    }
    getCurrentStickyHeight() {
        let height = 0;
        this.currentStickyLines.forEach((value) => {
            if (value.rendered) {
                height += 22;
            }
        });
        return height;
    }
    setCurrentStickyLines(newStickyLines) {
        this.currentStickyLines = newStickyLines;
    }
    compareStickyLineMaps(mapA, mapB) {
        if (mapA.size !== mapB.size) {
            return false;
        }
        for (const [key, value] of mapA) {
            const otherValue = mapB.get(key);
            if (!otherValue || value.rendered !== otherValue.rendered) {
                return false;
            }
        }
        return true;
    }
    constructor(domNode, notebookEditor, notebookCellList, layoutFn, _contextMenuService, instantiationService) {
        super();
        this.domNode = domNode;
        this.notebookEditor = notebookEditor;
        this.notebookCellList = notebookCellList;
        this.layoutFn = layoutFn;
        this._contextMenuService = _contextMenuService;
        this.instantiationService = instantiationService;
        this._disposables = new DisposableStore();
        this.currentStickyLines = new Map();
        this._onDidChangeNotebookStickyScroll = this._register(new Emitter());
        this.onDidChangeNotebookStickyScroll = this._onDidChangeNotebookStickyScroll.event;
        this._layoutDisposableStore = this._register(new DisposableStore());
        if (this.notebookEditor.notebookOptions.getDisplayOptions().stickyScrollEnabled) {
            this.init().catch(console.error);
        }
        this._register(this.notebookEditor.notebookOptions.onDidChangeOptions((e) => {
            if (e.stickyScrollEnabled || e.stickyScrollMode) {
                this.updateConfig(e);
            }
        }));
        this._register(DOM.addDisposableListener(this.domNode, DOM.EventType.CONTEXT_MENU, async (event) => {
            this.onContextMenu(event);
        }));
    }
    onContextMenu(e) {
        const event = new StandardMouseEvent(DOM.getWindow(this.domNode), e);
        const selectedElement = event.target.parentElement;
        const selectedOutlineEntry = Array.from(this.currentStickyLines.values()).find((entry) => entry.line.element.contains(selectedElement))?.line.entry;
        if (!selectedOutlineEntry) {
            return;
        }
        const args = {
            outlineEntry: selectedOutlineEntry,
            notebookEditor: this.notebookEditor,
        };
        this._contextMenuService.showContextMenu({
            menuId: MenuId.NotebookStickyScrollContext,
            getAnchor: () => event,
            menuActionOptions: { shouldForwardArgs: true, arg: args },
        });
    }
    updateConfig(e) {
        if (e.stickyScrollEnabled) {
            if (this.notebookEditor.notebookOptions.getDisplayOptions().stickyScrollEnabled) {
                this.init().catch(console.error);
            }
            else {
                this._disposables.clear();
                this.notebookCellOutlineReference?.dispose();
                this.disposeCurrentStickyLines();
                DOM.clearNode(this.domNode);
                this.updateDisplay();
            }
        }
        else if (e.stickyScrollMode &&
            this.notebookEditor.notebookOptions.getDisplayOptions().stickyScrollEnabled &&
            this.notebookCellOutlineReference?.object) {
            this.updateContent(computeContent(this.notebookEditor, this.notebookCellList, this.notebookCellOutlineReference?.object?.entries, this.getCurrentStickyHeight()));
        }
    }
    async init() {
        const { object: notebookCellOutline } = (this.notebookCellOutlineReference =
            this.instantiationService.invokeFunction((accessor) => accessor.get(INotebookCellOutlineDataSourceFactory).getOrCreate(this.notebookEditor)));
        this._register(this.notebookCellOutlineReference);
        // Ensure symbols are computed first
        await notebookCellOutline.computeFullSymbols(CancellationToken.None);
        // Initial content update
        const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
        this.updateContent(computed);
        // Set up outline change listener
        this._disposables.add(notebookCellOutline.onDidChange(() => {
            const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
            if (!this.compareStickyLineMaps(computed, this.currentStickyLines)) {
                this.updateContent(computed);
            }
            else {
                // if we don't end up updating the content, we need to avoid leaking the map
                this.disposeStickyLineMap(computed);
            }
        }));
        // Handle view model changes
        this._disposables.add(this.notebookEditor.onDidAttachViewModel(async () => {
            // ensure recompute symbols when view model changes -- could be missed if outline is closed
            await notebookCellOutline.computeFullSymbols(CancellationToken.None);
            const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
            this.updateContent(computed);
        }));
        this._disposables.add(this.notebookEditor.onDidScroll(() => {
            const d = new Delayer(100);
            d.trigger(() => {
                d.dispose();
                const computed = computeContent(this.notebookEditor, this.notebookCellList, notebookCellOutline.entries, this.getCurrentStickyHeight());
                if (!this.compareStickyLineMaps(computed, this.currentStickyLines)) {
                    this.updateContent(computed);
                }
                else {
                    // if we don't end up updating the content, we need to avoid leaking the map
                    this.disposeStickyLineMap(computed);
                }
            });
        }));
    }
    // Add helper method to dispose a map of sticky lines
    disposeStickyLineMap(map) {
        map.forEach((value) => {
            if (value.line) {
                value.line.dispose();
            }
        });
    }
    // take in an cell index, and get the corresponding outline entry
    static getVisibleOutlineEntry(visibleIndex, notebookOutlineEntries) {
        let left = 0;
        let right = notebookOutlineEntries.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (notebookOutlineEntries[mid].index === visibleIndex) {
                // Exact match found
                const rootEntry = notebookOutlineEntries[mid];
                const flatList = [];
                rootEntry.asFlatList(flatList);
                return flatList.find((entry) => entry.index === visibleIndex);
            }
            else if (notebookOutlineEntries[mid].index < visibleIndex) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        // No exact match found - get the closest smaller entry
        if (right >= 0) {
            const rootEntry = notebookOutlineEntries[right];
            const flatList = [];
            rootEntry.asFlatList(flatList);
            return flatList.find((entry) => entry.index === visibleIndex);
        }
        return undefined;
    }
    updateContent(newMap) {
        DOM.clearNode(this.domNode);
        this.disposeCurrentStickyLines();
        this.renderStickyLines(newMap, this.domNode);
        const oldStickyHeight = this.getCurrentStickyHeight();
        this.setCurrentStickyLines(newMap);
        // (+) = sticky height increased
        // (-) = sticky height decreased
        const sizeDelta = this.getCurrentStickyHeight() - oldStickyHeight;
        if (sizeDelta !== 0) {
            this._onDidChangeNotebookStickyScroll.fire(sizeDelta);
            const d = this._layoutDisposableStore.add(DOM.scheduleAtNextAnimationFrame(DOM.getWindow(this.getDomNode()), () => {
                this.layoutFn(sizeDelta);
                this.updateDisplay();
                this._layoutDisposableStore.delete(d);
            }));
        }
        else {
            this.updateDisplay();
        }
    }
    updateDisplay() {
        const hasSticky = this.getCurrentStickyHeight() > 0;
        if (!hasSticky) {
            this.domNode.style.display = 'none';
        }
        else {
            this.domNode.style.display = 'block';
        }
    }
    static computeStickyHeight(entry) {
        let height = 0;
        if (entry.cell.cellKind === CellKind.Markup && entry.level < 7) {
            height += 22;
        }
        while (entry.parent) {
            height += 22;
            entry = entry.parent;
        }
        return height;
    }
    static checkCollapsedStickyLines(entry, numLinesToRender, notebookEditor) {
        let currentEntry = entry;
        const newMap = new Map();
        const elementsToRender = [];
        while (currentEntry) {
            if (currentEntry.level >= 7) {
                // level 7+ represents a non-header entry, which we don't want to render
                currentEntry = currentEntry.parent;
                continue;
            }
            const lineToRender = NotebookStickyScroll_1.createStickyElement(currentEntry, notebookEditor);
            newMap.set(currentEntry, { line: lineToRender, rendered: false });
            elementsToRender.unshift(lineToRender);
            currentEntry = currentEntry.parent;
        }
        // iterate over elements to render, and append to container
        // break when we reach numLinesToRender
        for (let i = 0; i < elementsToRender.length; i++) {
            if (i >= numLinesToRender) {
                break;
            }
            newMap.set(elementsToRender[i].entry, { line: elementsToRender[i], rendered: true });
        }
        return newMap;
    }
    renderStickyLines(stickyMap, containerElement) {
        const reversedEntries = Array.from(stickyMap.entries()).reverse();
        for (const [, value] of reversedEntries) {
            if (!value.rendered) {
                continue;
            }
            containerElement.append(value.line.element);
        }
    }
    static createStickyElement(entry, notebookEditor) {
        const stickyElement = document.createElement('div');
        stickyElement.classList.add('notebook-sticky-scroll-element');
        const indentMode = notebookEditor.notebookOptions.getLayoutConfiguration().stickyScrollMode;
        if (indentMode === 'indented') {
            stickyElement.style.paddingLeft = NotebookStickyLine.getParentCount(entry) * 10 + 'px';
        }
        let isCollapsed = false;
        if (entry.cell.cellKind === CellKind.Markup) {
            isCollapsed = entry.cell.foldingState === 2 /* CellFoldingState.Collapsed */;
        }
        const stickyFoldingIcon = new StickyFoldingIcon(isCollapsed, 16);
        stickyFoldingIcon.domNode.classList.add('notebook-sticky-scroll-folding-icon');
        stickyFoldingIcon.setVisible(true);
        const stickyHeader = document.createElement('div');
        stickyHeader.classList.add('notebook-sticky-scroll-header');
        stickyHeader.innerText = entry.label;
        stickyElement.append(stickyFoldingIcon.domNode, stickyHeader);
        return new NotebookStickyLine(stickyElement, stickyFoldingIcon, stickyHeader, entry, notebookEditor);
    }
    disposeCurrentStickyLines() {
        this.currentStickyLines.forEach((value) => {
            value.line.dispose();
        });
    }
    dispose() {
        this._disposables.dispose();
        this.disposeCurrentStickyLines();
        this.notebookCellOutlineReference?.dispose();
        super.dispose();
    }
};
NotebookStickyScroll = NotebookStickyScroll_1 = __decorate([
    __param(4, IContextMenuService),
    __param(5, IInstantiationService)
], NotebookStickyScroll);
export { NotebookStickyScroll };
export function computeContent(notebookEditor, notebookCellList, notebookOutlineEntries, renderedStickyHeight) {
    // get data about the cell list within viewport ----------------------------------------------------------------------------------------
    const editorScrollTop = notebookEditor.scrollTop - renderedStickyHeight;
    const visibleRange = notebookEditor.visibleRanges[0];
    if (!visibleRange) {
        return new Map();
    }
    // edge case for cell 0 in the notebook is a header ------------------------------------------------------------------------------------
    if (visibleRange.start === 0) {
        const firstCell = notebookEditor.cellAt(0);
        const firstCellEntry = NotebookStickyScroll.getVisibleOutlineEntry(0, notebookOutlineEntries);
        if (firstCell &&
            firstCellEntry &&
            firstCell.cellKind === CellKind.Markup &&
            firstCellEntry.level < 7) {
            if (notebookEditor.scrollTop > 22) {
                const newMap = NotebookStickyScroll.checkCollapsedStickyLines(firstCellEntry, 100, notebookEditor);
                return newMap;
            }
        }
    }
    // iterate over cells in viewport ------------------------------------------------------------------------------------------------------
    let cell;
    let cellEntry;
    const startIndex = visibleRange.start - 1; // -1 to account for cells hidden "under" sticky lines.
    for (let currentIndex = startIndex; currentIndex < visibleRange.end; currentIndex++) {
        // store data for current cell, and next cell
        cell = notebookEditor.cellAt(currentIndex);
        if (!cell) {
            return new Map();
        }
        cellEntry = NotebookStickyScroll.getVisibleOutlineEntry(currentIndex, notebookOutlineEntries);
        if (!cellEntry) {
            continue;
        }
        const nextCell = notebookEditor.cellAt(currentIndex + 1);
        if (!nextCell) {
            const sectionBottom = notebookEditor.getLayoutInfo().scrollHeight;
            const linesToRender = Math.floor(sectionBottom / 22);
            const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
            return newMap;
        }
        const nextCellEntry = NotebookStickyScroll.getVisibleOutlineEntry(currentIndex + 1, notebookOutlineEntries);
        if (!nextCellEntry) {
            continue;
        }
        // check next cell, if markdown with non level 7 entry, that means this is the end of the section (new header) ---------------------
        if (nextCell.cellKind === CellKind.Markup && nextCellEntry.level < 7) {
            const sectionBottom = notebookCellList.getCellViewScrollTop(nextCell);
            const currentSectionStickyHeight = NotebookStickyScroll.computeStickyHeight(cellEntry);
            const nextSectionStickyHeight = NotebookStickyScroll.computeStickyHeight(nextCellEntry);
            // case: we can render the all sticky lines for the current section ------------------------------------------------------------
            if (editorScrollTop + currentSectionStickyHeight < sectionBottom) {
                const linesToRender = Math.floor((sectionBottom - editorScrollTop) / 22);
                const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
                return newMap;
            }
            // case: next section is the same size or bigger, render next entry -----------------------------------------------------------
            else if (nextSectionStickyHeight >= currentSectionStickyHeight) {
                const newMap = NotebookStickyScroll.checkCollapsedStickyLines(nextCellEntry, 100, notebookEditor);
                return newMap;
            }
            // case: next section is the smaller, shrink until next section height is greater than the available space ---------------------
            else if (nextSectionStickyHeight < currentSectionStickyHeight) {
                const availableSpace = sectionBottom - editorScrollTop;
                if (availableSpace >= nextSectionStickyHeight) {
                    const linesToRender = Math.floor(availableSpace / 22);
                    const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
                    return newMap;
                }
                else {
                    const newMap = NotebookStickyScroll.checkCollapsedStickyLines(nextCellEntry, 100, notebookEditor);
                    return newMap;
                }
            }
        }
    } // visible range loop close
    // case: all visible cells were non-header cells, so render any headers relevant to their section --------------------------------------
    const sectionBottom = notebookEditor.getLayoutInfo().scrollHeight;
    const linesToRender = Math.floor((sectionBottom - editorScrollTop) / 22);
    const newMap = NotebookStickyScroll.checkCollapsedStickyLines(cellEntry, linesToRender, notebookEditor);
    return newMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JTdGlja3lTY3JvbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0VkaXRvclN0aWNreVNjcm9sbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsU0FBUyxJQUFJLGNBQWMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsR0FFZixNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUtoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixHQUNuQixNQUFNLHFFQUFxRSxDQUFBO0FBRTVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBR3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JH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