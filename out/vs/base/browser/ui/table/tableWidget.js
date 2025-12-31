/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, append, clearNode, getContentHeight, getContentWidth } from '../../dom.js';
import { createStyleSheet } from '../../domStylesheets.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { List, unthemedListStyles, } from '../list/listWidget.js';
import { SplitView } from '../splitview/splitview.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import './table.css';
class TableListRenderer {
    static { this.TemplateId = 'row'; }
    constructor(columns, renderers, getColumnSize) {
        this.columns = columns;
        this.getColumnSize = getColumnSize;
        this.templateId = TableListRenderer.TemplateId;
        this.renderedTemplates = new Set();
        const rendererMap = new Map(renderers.map((r) => [r.templateId, r]));
        this.renderers = [];
        for (const column of columns) {
            const renderer = rendererMap.get(column.templateId);
            if (!renderer) {
                throw new Error(`Table cell renderer for template id ${column.templateId} not found.`);
            }
            this.renderers.push(renderer);
        }
    }
    renderTemplate(container) {
        const rowContainer = append(container, $('.monaco-table-tr'));
        const cellContainers = [];
        const cellTemplateData = [];
        for (let i = 0; i < this.columns.length; i++) {
            const renderer = this.renderers[i];
            const cellContainer = append(rowContainer, $('.monaco-table-td', { 'data-col-index': i }));
            cellContainer.style.width = `${this.getColumnSize(i)}px`;
            cellContainers.push(cellContainer);
            cellTemplateData.push(renderer.renderTemplate(cellContainer));
        }
        const result = { container, cellContainers, cellTemplateData };
        this.renderedTemplates.add(result);
        return result;
    }
    renderElement(element, index, templateData, height) {
        for (let i = 0; i < this.columns.length; i++) {
            const column = this.columns[i];
            const cell = column.project(element);
            const renderer = this.renderers[i];
            renderer.renderElement(cell, index, templateData.cellTemplateData[i], height);
        }
    }
    disposeElement(element, index, templateData, height) {
        for (let i = 0; i < this.columns.length; i++) {
            const renderer = this.renderers[i];
            if (renderer.disposeElement) {
                const column = this.columns[i];
                const cell = column.project(element);
                renderer.disposeElement(cell, index, templateData.cellTemplateData[i], height);
            }
        }
    }
    disposeTemplate(templateData) {
        for (let i = 0; i < this.columns.length; i++) {
            const renderer = this.renderers[i];
            renderer.disposeTemplate(templateData.cellTemplateData[i]);
        }
        clearNode(templateData.container);
        this.renderedTemplates.delete(templateData);
    }
    layoutColumn(index, size) {
        for (const { cellContainers } of this.renderedTemplates) {
            cellContainers[index].style.width = `${size}px`;
        }
    }
}
function asListVirtualDelegate(delegate) {
    return {
        getHeight(row) {
            return delegate.getHeight(row);
        },
        getTemplateId() {
            return TableListRenderer.TemplateId;
        },
    };
}
class ColumnHeader extends Disposable {
    get minimumSize() {
        return this.column.minimumWidth ?? 120;
    }
    get maximumSize() {
        return this.column.maximumWidth ?? Number.POSITIVE_INFINITY;
    }
    get onDidChange() {
        return this.column.onDidChangeWidthConstraints ?? Event.None;
    }
    constructor(column, index) {
        super();
        this.column = column;
        this.index = index;
        this._onDidLayout = new Emitter();
        this.onDidLayout = this._onDidLayout.event;
        this.element = $('.monaco-table-th', { 'data-col-index': index }, column.label);
        if (column.tooltip) {
            this._register(getBaseLayerHoverDelegate().setupManagedHover(getDefaultHoverDelegate('mouse'), this.element, column.tooltip));
        }
    }
    layout(size) {
        this._onDidLayout.fire([this.index, size]);
    }
}
export class Table {
    static { this.InstanceCount = 0; }
    get onDidChangeFocus() {
        return this.list.onDidChangeFocus;
    }
    get onDidChangeSelection() {
        return this.list.onDidChangeSelection;
    }
    get onDidScroll() {
        return this.list.onDidScroll;
    }
    get onMouseClick() {
        return this.list.onMouseClick;
    }
    get onMouseDblClick() {
        return this.list.onMouseDblClick;
    }
    get onMouseMiddleClick() {
        return this.list.onMouseMiddleClick;
    }
    get onPointer() {
        return this.list.onPointer;
    }
    get onMouseUp() {
        return this.list.onMouseUp;
    }
    get onMouseDown() {
        return this.list.onMouseDown;
    }
    get onMouseOver() {
        return this.list.onMouseOver;
    }
    get onMouseMove() {
        return this.list.onMouseMove;
    }
    get onMouseOut() {
        return this.list.onMouseOut;
    }
    get onTouchStart() {
        return this.list.onTouchStart;
    }
    get onTap() {
        return this.list.onTap;
    }
    get onContextMenu() {
        return this.list.onContextMenu;
    }
    get onDidFocus() {
        return this.list.onDidFocus;
    }
    get onDidBlur() {
        return this.list.onDidBlur;
    }
    get scrollTop() {
        return this.list.scrollTop;
    }
    set scrollTop(scrollTop) {
        this.list.scrollTop = scrollTop;
    }
    get scrollLeft() {
        return this.list.scrollLeft;
    }
    set scrollLeft(scrollLeft) {
        this.list.scrollLeft = scrollLeft;
    }
    get scrollHeight() {
        return this.list.scrollHeight;
    }
    get renderHeight() {
        return this.list.renderHeight;
    }
    get onDidDispose() {
        return this.list.onDidDispose;
    }
    constructor(user, container, virtualDelegate, columns, renderers, _options) {
        this.virtualDelegate = virtualDelegate;
        this.columns = columns;
        this.domId = `table_id_${++Table.InstanceCount}`;
        this.disposables = new DisposableStore();
        this.cachedWidth = 0;
        this.cachedHeight = 0;
        this.domNode = append(container, $(`.monaco-table.${this.domId}`));
        const headers = columns.map((c, i) => this.disposables.add(new ColumnHeader(c, i)));
        const descriptor = {
            size: headers.reduce((a, b) => a + b.column.weight, 0),
            views: headers.map((view) => ({ size: view.column.weight, view })),
        };
        this.splitview = this.disposables.add(new SplitView(this.domNode, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            scrollbarVisibility: 2 /* ScrollbarVisibility.Hidden */,
            getSashOrthogonalSize: () => this.cachedHeight,
            descriptor,
        }));
        this.splitview.el.style.height = `${virtualDelegate.headerRowHeight}px`;
        this.splitview.el.style.lineHeight = `${virtualDelegate.headerRowHeight}px`;
        const renderer = new TableListRenderer(columns, renderers, (i) => this.splitview.getViewSize(i));
        this.list = this.disposables.add(new List(user, this.domNode, asListVirtualDelegate(virtualDelegate), [renderer], _options));
        Event.any(...headers.map((h) => h.onDidLayout))(([index, size]) => renderer.layoutColumn(index, size), null, this.disposables);
        this.splitview.onDidSashReset((index) => {
            const totalWeight = columns.reduce((r, c) => r + c.weight, 0);
            const size = (columns[index].weight / totalWeight) * this.cachedWidth;
            this.splitview.resizeView(index, size);
        }, null, this.disposables);
        this.styleElement = createStyleSheet(this.domNode);
        this.style(unthemedListStyles);
    }
    getColumnLabels() {
        return this.columns.map((c) => c.label);
    }
    resizeColumn(index, percentage) {
        const size = Math.round((percentage / 100.0) * this.cachedWidth);
        this.splitview.resizeView(index, size);
    }
    updateOptions(options) {
        this.list.updateOptions(options);
    }
    splice(start, deleteCount, elements = []) {
        this.list.splice(start, deleteCount, elements);
    }
    rerender() {
        this.list.rerender();
    }
    row(index) {
        return this.list.element(index);
    }
    indexOf(element) {
        return this.list.indexOf(element);
    }
    get length() {
        return this.list.length;
    }
    getHTMLElement() {
        return this.domNode;
    }
    layout(height, width) {
        height = height ?? getContentHeight(this.domNode);
        width = width ?? getContentWidth(this.domNode);
        this.cachedWidth = width;
        this.cachedHeight = height;
        this.splitview.layout(width);
        const listHeight = height - this.virtualDelegate.headerRowHeight;
        this.list.getHTMLElement().style.height = `${listHeight}px`;
        this.list.layout(listHeight, width);
    }
    triggerTypeNavigation() {
        this.list.triggerTypeNavigation();
    }
    style(styles) {
        const content = [];
        content.push(`.monaco-table.${this.domId} > .monaco-split-view2 .monaco-sash.vertical::before {
			top: ${this.virtualDelegate.headerRowHeight + 1}px;
			height: calc(100% - ${this.virtualDelegate.headerRowHeight}px);
		}`);
        this.styleElement.textContent = content.join('\n');
        this.list.style(styles);
    }
    domFocus() {
        this.list.domFocus();
    }
    setAnchor(index) {
        this.list.setAnchor(index);
    }
    getAnchor() {
        return this.list.getAnchor();
    }
    getSelectedElements() {
        return this.list.getSelectedElements();
    }
    setSelection(indexes, browserEvent) {
        this.list.setSelection(indexes, browserEvent);
    }
    getSelection() {
        return this.list.getSelection();
    }
    setFocus(indexes, browserEvent) {
        this.list.setFocus(indexes, browserEvent);
    }
    focusNext(n = 1, loop = false, browserEvent) {
        this.list.focusNext(n, loop, browserEvent);
    }
    focusPrevious(n = 1, loop = false, browserEvent) {
        this.list.focusPrevious(n, loop, browserEvent);
    }
    focusNextPage(browserEvent) {
        return this.list.focusNextPage(browserEvent);
    }
    focusPreviousPage(browserEvent) {
        return this.list.focusPreviousPage(browserEvent);
    }
    focusFirst(browserEvent) {
        this.list.focusFirst(browserEvent);
    }
    focusLast(browserEvent) {
        this.list.focusLast(browserEvent);
    }
    getFocus() {
        return this.list.getFocus();
    }
    getFocusedElements() {
        return this.list.getFocusedElements();
    }
    getRelativeTop(index) {
        return this.list.getRelativeTop(index);
    }
    reveal(index, relativeTop) {
        this.list.reveal(index, relativeTop);
    }
    dispose() {
        this.disposables.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvdGFibGUvdGFibGVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRSxPQUFPLEVBSU4sSUFBSSxFQUNKLGtCQUFrQixHQUNsQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBNEMsU0FBUyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFXL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLDhCQUE4QixDQUFBO0FBR3ZGLE9BQU8sYUFBYSxDQUFBO0FBV3BCLE1BQU0saUJBQWlCO2FBQ2YsZUFBVSxHQUFHLEtBQUssQUFBUixDQUFRO0lBS3pCLFlBQ1MsT0FBb0MsRUFDNUMsU0FBMkMsRUFDbkMsYUFBd0M7UUFGeEMsWUFBTyxHQUFQLE9BQU8sQ0FBNkI7UUFFcEMsa0JBQWEsR0FBYixhQUFhLENBQTJCO1FBUHhDLGVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLENBQUE7UUFFMUMsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQW1CLENBQUE7UUFPckQsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFD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