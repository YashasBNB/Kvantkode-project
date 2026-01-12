/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../dom.js';
import * as domStylesheetsJs from '../../domStylesheets.js';
import { DomScrollableElement } from '../scrollbar/scrollableElement.js';
import { commonPrefixLength } from '../../../common/arrays.js';
import { ThemeIcon } from '../../../common/themables.js';
import { Emitter } from '../../../common/event.js';
import { DisposableStore, dispose } from '../../../common/lifecycle.js';
import './breadcrumbsWidget.css';
export class BreadcrumbsItem {
}
export class BreadcrumbsWidget {
    constructor(container, horizontalScrollbarSize, separatorIcon, styles) {
        this._disposables = new DisposableStore();
        this._onDidSelectItem = new Emitter();
        this._onDidFocusItem = new Emitter();
        this._onDidChangeFocus = new Emitter();
        this.onDidSelectItem = this._onDidSelectItem.event;
        this.onDidFocusItem = this._onDidFocusItem.event;
        this.onDidChangeFocus = this._onDidChangeFocus.event;
        this._items = new Array();
        this._nodes = new Array();
        this._freeNodes = new Array();
        this._enabled = true;
        this._focusedItemIdx = -1;
        this._selectedItemIdx = -1;
        this._domNode = document.createElement('div');
        this._domNode.className = 'monaco-breadcrumbs';
        this._domNode.tabIndex = 0;
        this._domNode.setAttribute('role', 'list');
        this._scrollable = new DomScrollableElement(this._domNode, {
            vertical: 2 /* ScrollbarVisibility.Hidden */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            horizontalScrollbarSize,
            useShadows: false,
            scrollYToX: true,
        });
        this._separatorIcon = separatorIcon;
        this._disposables.add(this._scrollable);
        this._disposables.add(dom.addStandardDisposableListener(this._domNode, 'click', (e) => this._onClick(e)));
        container.appendChild(this._scrollable.getDomNode());
        const styleElement = domStylesheetsJs.createStyleSheet(this._domNode);
        this._style(styleElement, styles);
        const focusTracker = dom.trackFocus(this._domNode);
        this._disposables.add(focusTracker);
        this._disposables.add(focusTracker.onDidBlur((_) => this._onDidChangeFocus.fire(false)));
        this._disposables.add(focusTracker.onDidFocus((_) => this._onDidChangeFocus.fire(true)));
    }
    setHorizontalScrollbarSize(size) {
        this._scrollable.updateOptions({
            horizontalScrollbarSize: size,
        });
    }
    dispose() {
        this._disposables.dispose();
        this._pendingLayout?.dispose();
        this._pendingDimLayout?.dispose();
        this._onDidSelectItem.dispose();
        this._onDidFocusItem.dispose();
        this._onDidChangeFocus.dispose();
        this._domNode.remove();
        this._nodes.length = 0;
        this._freeNodes.length = 0;
    }
    layout(dim) {
        if (dim && dom.Dimension.equals(dim, this._dimension)) {
            return;
        }
        if (dim) {
            // only measure
            this._pendingDimLayout?.dispose();
            this._pendingDimLayout = this._updateDimensions(dim);
        }
        else {
            this._pendingLayout?.dispose();
            this._pendingLayout = this._updateScrollbar();
        }
    }
    _updateDimensions(dim) {
        const disposables = new DisposableStore();
        disposables.add(dom.modify(dom.getWindow(this._domNode), () => {
            this._dimension = dim;
            this._domNode.style.width = `${dim.width}px`;
            this._domNode.style.height = `${dim.height}px`;
            disposables.add(this._updateScrollbar());
        }));
        return disposables;
    }
    _updateScrollbar() {
        return dom.measure(dom.getWindow(this._domNode), () => {
            dom.measure(dom.getWindow(this._domNode), () => {
                // double RAF
                this._scrollable.setRevealOnScroll(false);
                this._scrollable.scanDomNode();
                this._scrollable.setRevealOnScroll(true);
            });
        });
    }
    _style(styleElement, style) {
        let content = '';
        if (style.breadcrumbsBackground) {
            content += `.monaco-breadcrumbs { background-color: ${style.breadcrumbsBackground}}`;
        }
        if (style.breadcrumbsForeground) {
            content += `.monaco-breadcrumbs .monaco-breadcrumb-item { color: ${style.breadcrumbsForeground}}\n`;
        }
        if (style.breadcrumbsFocusForeground) {
            content += `.monaco-breadcrumbs .monaco-breadcrumb-item.focused { color: ${style.breadcrumbsFocusForeground}}\n`;
        }
        if (style.breadcrumbsFocusAndSelectionForeground) {
            content += `.monaco-breadcrumbs .monaco-breadcrumb-item.focused.selected { color: ${style.breadcrumbsFocusAndSelectionForeground}}\n`;
        }
        if (style.breadcrumbsHoverForeground) {
            content += `.monaco-breadcrumbs:not(.disabled	) .monaco-breadcrumb-item:hover:not(.focused):not(.selected) { color: ${style.breadcrumbsHoverForeground}}\n`;
        }
        styleElement.innerText = content;
    }
    setEnabled(value) {
        this._enabled = value;
        this._domNode.classList.toggle('disabled', !this._enabled);
    }
    domFocus() {
        const idx = this._focusedItemIdx >= 0 ? this._focusedItemIdx : this._items.length - 1;
        if (idx >= 0 && idx < this._items.length) {
            this._focus(idx, undefined);
        }
        else {
            this._domNode.focus();
        }
    }
    isDOMFocused() {
        return dom.isAncestorOfActiveElement(this._domNode);
    }
    getFocused() {
        return this._items[this._focusedItemIdx];
    }
    setFocused(item, payload) {
        this._focus(this._items.indexOf(item), payload);
    }
    focusPrev(payload) {
        if (this._focusedItemIdx > 0) {
            this._focus(this._focusedItemIdx - 1, payload);
        }
    }
    focusNext(payload) {
        if (this._focusedItemIdx + 1 < this._nodes.length) {
            this._focus(this._focusedItemIdx + 1, payload);
        }
    }
    _focus(nth, payload) {
        this._focusedItemIdx = -1;
        for (let i = 0; i < this._nodes.length; i++) {
            const node = this._nodes[i];
            if (i !== nth) {
                node.classList.remove('focused');
            }
            else {
                this._focusedItemIdx = i;
                node.classList.add('focused');
                node.focus();
            }
        }
        this._reveal(this._focusedItemIdx, true);
        this._onDidFocusItem.fire({
            type: 'focus',
            item: this._items[this._focusedItemIdx],
            node: this._nodes[this._focusedItemIdx],
            payload,
        });
    }
    reveal(item) {
        const idx = this._items.indexOf(item);
        if (idx >= 0) {
            this._reveal(idx, false);
        }
    }
    revealLast() {
        this._reveal(this._items.length - 1, false);
    }
    _reveal(nth, minimal) {
        if (nth < 0 || nth >= this._nodes.length) {
            return;
        }
        const node = this._nodes[nth];
        if (!node) {
            return;
        }
        const { width } = this._scrollable.getScrollDimensions();
        const { scrollLeft } = this._scrollable.getScrollPosition();
        if (!minimal || node.offsetLeft > scrollLeft + width || node.offsetLeft < scrollLeft) {
            this._scrollable.setRevealOnScroll(false);
            this._scrollable.setScrollPosition({ scrollLeft: node.offsetLeft });
            this._scrollable.setRevealOnScroll(true);
        }
    }
    getSelection() {
        return this._items[this._selectedItemIdx];
    }
    setSelection(item, payload) {
        this._select(this._items.indexOf(item), payload);
    }
    _select(nth, payload) {
        this._selectedItemIdx = -1;
        for (let i = 0; i < this._nodes.length; i++) {
            const node = this._nodes[i];
            if (i !== nth) {
                node.classList.remove('selected');
            }
            else {
                this._selectedItemIdx = i;
                node.classList.add('selected');
            }
        }
        this._onDidSelectItem.fire({
            type: 'select',
            item: this._items[this._selectedItemIdx],
            node: this._nodes[this._selectedItemIdx],
            payload,
        });
    }
    getItems() {
        return this._items;
    }
    setItems(items) {
        let prefix;
        let removed = [];
        try {
            prefix = commonPrefixLength(this._items, items, (a, b) => a.equals(b));
            removed = this._items.splice(prefix, this._items.length - prefix, ...items.slice(prefix));
            this._render(prefix);
            dispose(removed);
            dispose(items.slice(0, prefix));
            this._focus(-1, undefined);
        }
        catch (e) {
            const newError = new Error(`BreadcrumbsItem#setItems: newItems: ${items.length}, prefix: ${prefix}, removed: ${removed.length}`);
            newError.name = e.name;
            newError.stack = e.stack;
            throw newError;
        }
    }
    _render(start) {
        let didChange = false;
        for (; start < this._items.length && start < this._nodes.length; start++) {
            const item = this._items[start];
            const node = this._nodes[start];
            this._renderItem(item, node);
            didChange = true;
        }
        // case a: more nodes -> remove them
        while (start < this._nodes.length) {
            const free = this._nodes.pop();
            if (free) {
                this._freeNodes.push(free);
                free.remove();
                didChange = true;
            }
        }
        // case b: more items -> render them
        for (; start < this._items.length; start++) {
            const item = this._items[start];
            const node = this._freeNodes.length > 0 ? this._freeNodes.pop() : document.createElement('div');
            if (node) {
                this._renderItem(item, node);
                this._domNode.appendChild(node);
                this._nodes.push(node);
                didChange = true;
            }
        }
        if (didChange) {
            this.layout(undefined);
        }
    }
    _renderItem(item, container) {
        dom.clearNode(container);
        container.className = '';
        try {
            item.render(container);
        }
        catch (err) {
            container.innerText = '<<RENDER ERROR>>';
            console.error(err);
        }
        container.tabIndex = -1;
        container.setAttribute('role', 'listitem');
        container.classList.add('monaco-breadcrumb-item');
        const iconContainer = dom.$(ThemeIcon.asCSSSelector(this._separatorIcon));
        container.appendChild(iconContainer);
    }
    _onClick(event) {
        if (!this._enabled) {
            return;
        }
        for (let el = event.target; el; el = el.parentElement) {
            const idx = this._nodes.indexOf(el);
            if (idx >= 0) {
                this._focus(idx, event);
                this._select(idx, event);
                break;
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9icmVhZGNydW1icy9icmVhZGNydW1ic1dpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQTtBQUNuQyxPQUFPLEtBQUssZ0JBQWdCLE1BQU0seUJBQXlCLENBQUE7QUFFM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLDhCQUE4QixDQUFBO0FBRXBGLE9BQU8seUJBQXlCLENBQUE7QUFFaEMsTUFBTSxPQUFnQixlQUFlO0NBSXBDO0FBaUJELE1BQU0sT0FBTyxpQkFBaUI7SUEwQjdCLFlBQ0MsU0FBc0IsRUFDdEIsdUJBQStCLEVBQy9CLGFBQXdCLEVBQ3hCLE1BQWdDO1FBN0JoQixpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFJcEMscUJBQWdCLEdBQUcsSUFBSSxPQUFPLEVBQXlCLENBQUE7UUFDdkQsb0JBQWUsR0FBRyxJQUFJLE9BQU8sRUFBeUIsQ0FBQTtRQUN0RCxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBVyxDQUFBO1FBRWxELG9CQUFlLEdBQWlDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUE7UUFDM0UsbUJBQWMsR0FBaUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUE7UUFD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