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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvYnJlYWRjcnVtYnMvYnJlYWRjcnVtYnNXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUE7QUFDbkMsT0FBTyxLQUFLLGdCQUFnQixNQUFNLHlCQUF5QixDQUFBO0FBRTNELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVwRixPQUFPLHlCQUF5QixDQUFBO0FBRWhDLE1BQU0sT0FBZ0IsZUFBZTtDQUlwQztBQWlCRCxNQUFNLE9BQU8saUJBQWlCO0lBMEI3QixZQUNDLFNBQXNCLEVBQ3RCLHVCQUErQixFQUMvQixhQUF3QixFQUN4QixNQUFnQztRQTdCaEIsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBSXBDLHFCQUFnQixHQUFHLElBQUksT0FBTyxFQUF5QixDQUFBO1FBQ3ZELG9CQUFlLEdBQUcsSUFBSSxPQUFPLEVBQXlCLENBQUE7UUFDdEQsc0JBQWlCLEdBQUcsSUFBSSxPQUFPLEVBQVcsQ0FBQTtRQUVsRCxvQkFBZSxHQUFpQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO1FBQzNFLG1CQUFjLEdBQWlDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO1FBQ3pFLHFCQUFnQixHQUFtQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBRXZELFdBQU0sR0FBRyxJQUFJLEtBQUssRUFBbUIsQ0FBQTtRQUNyQyxXQUFNLEdBQUcsSUFBSSxLQUFLLEVBQWtCLENBQUE7UUFDcEMsZUFBVSxHQUFHLElBQUksS0FBSyxFQUFrQixDQUFBO1FBR2pELGFBQVEsR0FBWSxJQUFJLENBQUE7UUFDeEIsb0JBQWUsR0FBVyxDQUFDLENBQUMsQ0FBQTtRQUM1QixxQkFBZ0IsR0FBVyxDQUFDLENBQUMsQ0FBQTtRQVlwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUE7UUFDOUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFBO1FBQzFCLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUMxRCxRQUFRLG9DQUE0QjtZQUNwQyxVQUFVLGtDQUEwQjtZQUNwQyx1QkFBdUI7WUFDdkIsVUFBVSxFQUFFLEtBQUs7WUFDakIsVUFBVSxFQUFFLElBQUk7U0FDaEIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUE7UUFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixHQUFHLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbEYsQ0FBQTtRQUNELFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNyRSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUVqQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNsRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN4RixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6RixDQUFDO0lBRUQsMEJBQTBCLENBQUMsSUFBWTtRQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQztZQUM5Qix1QkFBdUIsRUFBRSxJQUFJO1NBQzdCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUMzQixJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBQzlCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDL0IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM5QixJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQzNCLENBQUM7SUFFRCxNQUFNLENBQUMsR0FBOEI7UUFDcEMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULGVBQWU7WUFDZixJQUFJLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDakMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUM5QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLEdBQWtCO1FBQzNDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRTtZQUM3QyxJQUFJLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQTtZQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxJQUFJLENBQUE7WUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFBO1lBQzlDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtRQUN6QyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLGdCQUFnQjtRQUN2QixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFO1lBQ3JELEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFO2dCQUM5QyxhQUFhO2dCQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3pDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUE7Z0JBQzlCLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDekMsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxNQUFNLENBQUMsWUFBOEIsRUFBRSxLQUErQjtRQUM3RSxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUE7UUFDaEIsSUFBSSxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNqQyxPQUFPLElBQUksMkNBQTJDLEtBQUssQ0FBQyxxQkFBcUIsR0FBRyxDQUFBO1FBQ3JGLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sSUFBSSx3REFBd0QsS0FBSyxDQUFDLHFCQUFxQixLQUFLLENBQUE7UUFDcEcsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUM7WUFDdEMsT0FBTyxJQUFJLGdFQUFnRSxLQUFLLENBQUMsMEJBQTBCLEtBQUssQ0FBQTtRQUNqSCxDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsc0NBQXNDLEVBQUUsQ0FBQztZQUNsRCxPQUFPLElBQUkseUVBQXlFLEtBQUssQ0FBQyxzQ0FBc0MsS0FBSyxDQUFBO1FBQ3RJLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3RDLE9BQU8sSUFBSSwyR0FBMkcsS0FBSyxDQUFDLDBCQUEwQixLQUFLLENBQUE7UUFDNUosQ0FBQztRQUNELFlBQVksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFBO0lBQ2pDLENBQUM7SUFFRCxVQUFVLENBQUMsS0FBYztRQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQTtRQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCxRQUFRO1FBQ1AsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNyRixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3RCLENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sR0FBRyxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDekMsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFpQyxFQUFFLE9BQWE7UUFDMUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFLLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsU0FBUyxDQUFDLE9BQWE7UUFDdEIsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDL0MsQ0FBQztJQUNGLENBQUM7SUFFRCxTQUFTLENBQUMsT0FBYTtRQUN0QixJQUFJLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLE1BQU0sQ0FBQyxHQUFXLEVBQUUsT0FBWTtRQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDakMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFBO2dCQUN4QixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDN0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDeEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDekIsSUFBSSxFQUFFLE9BQU87WUFDYixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1lBQ3ZDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDdkMsT0FBTztTQUNQLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxNQUFNLENBQUMsSUFBcUI7UUFDM0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDckMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVELFVBQVU7UUFDVCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRU8sT0FBTyxDQUFDLEdBQVcsRUFBRSxPQUFnQjtRQUM1QyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUN4RCxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQzNELElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxFQUFFLENBQUM7WUFDdEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBQ25FLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO1FBQ1gsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFRCxZQUFZLENBQUMsSUFBaUMsRUFBRSxPQUFhO1FBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVPLE9BQU8sQ0FBQyxHQUFXLEVBQUUsT0FBWTtRQUN4QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDMUIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0MsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNsQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLGdCQUFnQixHQUFHLENBQUMsQ0FBQTtnQkFDekIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1lBQzFCLElBQUksRUFBRSxRQUFRO1lBQ2QsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1lBQ3hDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztZQUN4QyxPQUFPO1NBQ1AsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUF3QjtRQUNoQyxJQUFJLE1BQTBCLENBQUE7UUFDOUIsSUFBSSxPQUFPLEdBQXNCLEVBQUUsQ0FBQTtRQUNuQyxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEUsT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDekYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNwQixPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMzQixDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNaLE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxDQUN6Qix1Q0FBdUMsS0FBSyxDQUFDLE1BQU0sYUFBYSxNQUFNLGNBQWMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUNwRyxDQUFBO1lBQ0QsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO1lBQ3RCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUN4QixNQUFNLFFBQVEsQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO0lBRU8sT0FBTyxDQUFDLEtBQWE7UUFDNUIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFBO1FBQ3JCLE9BQU8sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzFFLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDL0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM1QixTQUFTLEdBQUcsSUFBSSxDQUFBO1FBQ2pCLENBQUM7UUFDRCxvQ0FBb0M7UUFDcEMsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQzlCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzFCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDYixTQUFTLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE9BQU8sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQixNQUFNLElBQUksR0FDVCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDbkYsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN0QixTQUFTLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkIsQ0FBQztJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsSUFBcUIsRUFBRSxTQUF5QjtRQUNuRSxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3hCLFNBQVMsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdkIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxTQUFTLENBQUMsU0FBUyxHQUFHLGtCQUFrQixDQUFBO1lBQ3hDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkIsQ0FBQztRQUNELFNBQVMsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDdkIsU0FBUyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDMUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUNqRCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDekUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRU8sUUFBUSxDQUFDLEtBQWtCO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsT0FBTTtRQUNQLENBQUM7UUFDRCxLQUFLLElBQUksRUFBRSxHQUF1QixLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzNFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQW9CLENBQUMsQ0FBQTtZQUNyRCxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDdkIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ3hCLE1BQUs7WUFDTixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9