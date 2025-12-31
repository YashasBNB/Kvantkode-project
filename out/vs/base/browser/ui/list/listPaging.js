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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFBhZ2luZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9saXN0L2xpc3RQYWdpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ2pELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFHdEUsT0FBTyxZQUFZLENBQUE7QUFRbkIsT0FBTyxFQUtOLElBQUksR0FFSixNQUFNLGlCQUFpQixDQUFBO0FBQ3hCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFZOUMsTUFBTSxhQUFhO0lBR2xCLElBQUksVUFBVTtRQUNiLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBQ1MsUUFBaUQsRUFDakQsYUFBMEM7UUFEMUMsYUFBUSxHQUFSLFFBQVEsQ0FBeUM7UUFDakQsa0JBQWEsR0FBYixhQUFhLENBQTZCO0lBQ2hELENBQUM7SUFFSixjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDcEQsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzdDLENBQUM7SUFFRCxhQUFhLENBQ1osS0FBYSxFQUNiLENBQVMsRUFDVCxJQUFrQyxFQUNsQyxNQUEwQjtRQUUxQixJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxDQUFBO1FBRTFC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