/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { range } from '../../../common/arrays.js';
import { CancellationTokenSource } from '../../../common/cancellation.js';
import { Event } from '../../../common/event.js';
import { Disposable } from '../../../common/lifecycle.js';
import './list.css';
import { List, } from './listWidget.js';
import { isActiveElement } from '../../dom.js';
class PagedRenderer {
    get templateId() {
        return this.renderer.templateId;
    }
    constructor(renderer, modelProvider) {
        this.renderer = renderer;
        this.modelProvider = modelProvider;
    }
    renderTemplate(container) {
        const data = this.renderer.renderTemplate(container);
        return { data, disposable: Disposable.None };
    }
    renderElement(index, _, data, height) {
        data.disposable?.dispose();
        if (!data.data) {
            return;
        }
        const model = this.modelProvider();
        if (model.isResolved(index)) {
            return this.renderer.renderElement(model.get(index), index, data.data, height);
        }
        const cts = new CancellationTokenSource();
        const promise = model.resolve(index, cts.token);
        data.disposable = { dispose: () => cts.cancel() };
        this.renderer.renderPlaceholder(index, data.data);
        promise.then((entry) => this.renderer.renderElement(entry, index, data.data, height));
    }
    disposeTemplate(data) {
        if (data.disposable) {
            data.disposable.dispose();
            data.disposable = undefined;
        }
        if (data.data) {
            this.renderer.disposeTemplate(data.data);
            data.data = undefined;
        }
    }
}
class PagedAccessibilityProvider {
    constructor(modelProvider, accessibilityProvider) {
        this.modelProvider = modelProvider;
        this.accessibilityProvider = accessibilityProvider;
    }
    getWidgetAriaLabel() {
        return this.accessibilityProvider.getWidgetAriaLabel();
    }
    getAriaLabel(index) {
        const model = this.modelProvider();
        if (!model.isResolved(index)) {
            return null;
        }
        return this.accessibilityProvider.getAriaLabel(model.get(index));
    }
}
function fromPagedListOptions(modelProvider, options) {
    return {
        ...options,
        accessibilityProvider: options.accessibilityProvider &&
            new PagedAccessibilityProvider(modelProvider, options.accessibilityProvider),
    };
}
export class PagedList {
    constructor(user, container, virtualDelegate, renderers, options = {}) {
        const modelProvider = () => this.model;
        const pagedRenderers = renderers.map((r) => new PagedRenderer(r, modelProvider));
        this.list = new List(user, container, virtualDelegate, pagedRenderers, fromPagedListOptions(modelProvider, options));
    }
    updateOptions(options) {
        this.list.updateOptions(options);
    }
    getHTMLElement() {
        return this.list.getHTMLElement();
    }
    isDOMFocused() {
        return isActiveElement(this.getHTMLElement());
    }
    domFocus() {
        this.list.domFocus();
    }
    get onDidFocus() {
        return this.list.onDidFocus;
    }
    get onDidBlur() {
        return this.list.onDidBlur;
    }
    get widget() {
        return this.list;
    }
    get onDidDispose() {
        return this.list.onDidDispose;
    }
    get onMouseClick() {
        return Event.map(this.list.onMouseClick, ({ element, index, browserEvent }) => ({
            element: element === undefined ? undefined : this._model.get(element),
            index,
            browserEvent,
        }));
    }
    get onMouseDblClick() {
        return Event.map(this.list.onMouseDblClick, ({ element, index, browserEvent }) => ({
            element: element === undefined ? undefined : this._model.get(element),
            index,
            browserEvent,
        }));
    }
    get onTap() {
        return Event.map(this.list.onTap, ({ element, index, browserEvent }) => ({
            element: element === undefined ? undefined : this._model.get(element),
            index,
            browserEvent,
        }));
    }
    get onPointer() {
        return Event.map(this.list.onPointer, ({ element, index, browserEvent }) => ({
            element: element === undefined ? undefined : this._model.get(element),
            index,
            browserEvent,
        }));
    }
    get onDidChangeFocus() {
        return Event.map(this.list.onDidChangeFocus, ({ elements, indexes, browserEvent }) => ({
            elements: elements.map((e) => this._model.get(e)),
            indexes,
            browserEvent,
        }));
    }
    get onDidChangeSelection() {
        return Event.map(this.list.onDidChangeSelection, ({ elements, indexes, browserEvent }) => ({
            elements: elements.map((e) => this._model.get(e)),
            indexes,
            browserEvent,
        }));
    }
    get onContextMenu() {
        return Event.map(this.list.onContextMenu, ({ element, index, anchor, browserEvent }) => typeof element === 'undefined'
            ? { element, index, anchor, browserEvent }
            : { element: this._model.get(element), index, anchor, browserEvent });
    }
    get model() {
        return this._model;
    }
    set model(model) {
        this._model = model;
        this.list.splice(0, this.list.length, range(model.length));
    }
    get length() {
        return this.list.length;
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
    setAnchor(index) {
        this.list.setAnchor(index);
    }
    getAnchor() {
        return this.list.getAnchor();
    }
    setFocus(indexes) {
        this.list.setFocus(indexes);
    }
    focusNext(n, loop) {
        this.list.focusNext(n, loop);
    }
    focusPrevious(n, loop) {
        this.list.focusPrevious(n, loop);
    }
    focusNextPage() {
        return this.list.focusNextPage();
    }
    focusPreviousPage() {
        return this.list.focusPreviousPage();
    }
    focusLast() {
        this.list.focusLast();
    }
    focusFirst() {
        this.list.focusFirst();
    }
    getFocus() {
        return this.list.getFocus();
    }
    setSelection(indexes, browserEvent) {
        this.list.setSelection(indexes, browserEvent);
    }
    getSelection() {
        return this.list.getSelection();
    }
    getSelectedElements() {
        return this.getSelection().map((i) => this.model.get(i));
    }
    layout(height, width) {
        this.list.layout(height, width);
    }
    triggerTypeNavigation() {
        this.list.triggerTypeNavigation();
    }
    reveal(index, relativeTop) {
        this.list.reveal(index, relativeTop);
    }
    style(styles) {
        this.list.style(styles);
    }
    dispose() {
        this.list.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFBhZ2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2xpc3QvbGlzdFBhZ2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUd0RSxPQUFPLFlBQVksQ0FBQTtBQVFuQixPQUFPLEVBS04sSUFBSSxHQUVKLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQVk5QyxNQUFNLGFBQWE7SUFHbEIsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsWUFDUyxRQUFpRCxFQUNqRCxhQUEwQztRQUQxQyxhQUFRLEdBQVIsUUFBUSxDQUF5QztRQUNqRCxrQkFBYSxHQUFiLGFBQWEsQ0FBNkI7SUFDaEQsQ0FBQztJQUVKLGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNwRCxPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDN0MsQ0FBQztJQUVELGFBQWEsQ0FDWixLQUFhLEVBQ2IsQ0FBUyxFQUNULElBQWtDLEVBQ2xDLE1BQTBCO1FBRTFCLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUE7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