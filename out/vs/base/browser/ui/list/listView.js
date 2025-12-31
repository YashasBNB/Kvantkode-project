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
import { DataTransfers } from '../../dnd.js';
import { addDisposableListener, animate, getActiveElement, getContentHeight, getContentWidth, getDocument, getTopLeftOffset, getWindow, isAncestor, isHTMLElement, isSVGElement, scheduleAtNextAnimationFrame, } from '../../dom.js';
import { DomEmitter } from '../../event.js';
import { EventType as TouchEventType, Gesture } from '../../touch.js';
import { SmoothScrollableElement } from '../scrollbar/scrollableElement.js';
import { distinct, equals, splice } from '../../../common/arrays.js';
import { Delayer, disposableTimeout } from '../../../common/async.js';
import { memoize } from '../../../common/decorators.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../common/lifecycle.js';
import { Range } from '../../../common/range.js';
import { Scrollable, } from '../../../common/scrollable.js';
import { RangeMap, shift } from './rangeMap.js';
import { RowCache } from './rowCache.js';
import { BugIndicatingError } from '../../../common/errors.js';
import { clamp } from '../../../common/numbers.js';
import { applyDragImage } from '../dnd/dnd.js';
const StaticDND = {
    CurrentDragAndDropData: undefined,
};
export var ListViewTargetSector;
(function (ListViewTargetSector) {
    // drop position relative to the top of the item
    ListViewTargetSector[ListViewTargetSector["TOP"] = 0] = "TOP";
    ListViewTargetSector[ListViewTargetSector["CENTER_TOP"] = 1] = "CENTER_TOP";
    ListViewTargetSector[ListViewTargetSector["CENTER_BOTTOM"] = 2] = "CENTER_BOTTOM";
    ListViewTargetSector[ListViewTargetSector["BOTTOM"] = 3] = "BOTTOM";
})(ListViewTargetSector || (ListViewTargetSector = {}));
const DefaultOptions = {
    useShadows: true,
    verticalScrollMode: 1 /* ScrollbarVisibility.Auto */,
    setRowLineHeight: true,
    setRowHeight: true,
    supportDynamicHeights: false,
    dnd: {
        getDragElements(e) {
            return [e];
        },
        getDragURI() {
            return null;
        },
        onDragStart() { },
        onDragOver() {
            return false;
        },
        drop() { },
        dispose() { },
    },
    horizontalScrolling: false,
    transformOptimization: true,
    alwaysConsumeMouseWheel: true,
};
export class ElementsDragAndDropData {
    get context() {
        return this._context;
    }
    set context(value) {
        this._context = value;
    }
    constructor(elements) {
        this.elements = elements;
    }
    update() { }
    getData() {
        return this.elements;
    }
}
export class ExternalElementsDragAndDropData {
    constructor(elements) {
        this.elements = elements;
    }
    update() { }
    getData() {
        return this.elements;
    }
}
export class NativeDragAndDropData {
    constructor() {
        this.types = [];
        this.files = [];
    }
    update(dataTransfer) {
        if (dataTransfer.types) {
            this.types.splice(0, this.types.length, ...dataTransfer.types);
        }
        if (dataTransfer.files) {
            this.files.splice(0, this.files.length);
            for (let i = 0; i < dataTransfer.files.length; i++) {
                const file = dataTransfer.files.item(i);
                if (file && (file.size || file.type)) {
                    this.files.push(file);
                }
            }
        }
    }
    getData() {
        return {
            types: this.types,
            files: this.files,
        };
    }
}
function equalsDragFeedback(f1, f2) {
    if (Array.isArray(f1) && Array.isArray(f2)) {
        return equals(f1, f2);
    }
    return f1 === f2;
}
class ListViewAccessibilityProvider {
    constructor(accessibilityProvider) {
        if (accessibilityProvider?.getSetSize) {
            this.getSetSize = accessibilityProvider.getSetSize.bind(accessibilityProvider);
        }
        else {
            this.getSetSize = (e, i, l) => l;
        }
        if (accessibilityProvider?.getPosInSet) {
            this.getPosInSet = accessibilityProvider.getPosInSet.bind(accessibilityProvider);
        }
        else {
            this.getPosInSet = (e, i) => i + 1;
        }
        if (accessibilityProvider?.getRole) {
            this.getRole = accessibilityProvider.getRole.bind(accessibilityProvider);
        }
        else {
            this.getRole = (_) => 'listitem';
        }
        if (accessibilityProvider?.isChecked) {
            this.isChecked = accessibilityProvider.isChecked.bind(accessibilityProvider);
        }
        else {
            this.isChecked = (_) => undefined;
        }
    }
}
/**
 * The {@link ListView} is a virtual scrolling engine.
 *
 * Given that it only renders elements within its viewport, it can hold large
 * collections of elements and stay very performant. The performance bottleneck
 * usually lies within the user's rendering code for each element.
 *
 * @remarks It is a low-level widget, not meant to be used directly. Refer to the
 * List widget instead.
 */
export class ListView {
    static { this.InstanceCount = 0; }
    get contentHeight() {
        return this.rangeMap.size;
    }
    get contentWidth() {
        return this.scrollWidth ?? 0;
    }
    get onDidScroll() {
        return this.scrollableElement.onScroll;
    }
    get onWillScroll() {
        return this.scrollableElement.onWillScroll;
    }
    get containerDomNode() {
        return this.rowsContainer;
    }
    get scrollableElementDomNode() {
        return this.scrollableElement.getDomNode();
    }
    get horizontalScrolling() {
        return this._horizontalScrolling;
    }
    set horizontalScrolling(value) {
        if (value === this._horizontalScrolling) {
            return;
        }
        if (value && this.supportDynamicHeights) {
            throw new Error('Horizontal scrolling and dynamic heights not supported simultaneously');
        }
        this._horizontalScrolling = value;
        this.domNode.classList.toggle('horizontal-scrolling', this._horizontalScrolling);
        if (this._horizontalScrolling) {
            for (const item of this.items) {
                this.measureItemWidth(item);
            }
            this.updateScrollWidth();
            this.scrollableElement.setScrollDimensions({ width: getContentWidth(this.domNode) });
            this.rowsContainer.style.width = `${Math.max(this.scrollWidth || 0, this.renderWidth)}px`;
        }
        else {
            this.scrollableElementWidthDelayer.cancel();
            this.scrollableElement.setScrollDimensions({
                width: this.renderWidth,
                scrollWidth: this.renderWidth,
            });
            this.rowsContainer.style.width = '';
        }
    }
    constructor(container, virtualDelegate, renderers, options = DefaultOptions) {
        this.virtualDelegate = virtualDelegate;
        this.domId = `list_id_${++ListView.InstanceCount}`;
        this.renderers = new Map();
        this.renderWidth = 0;
        this._scrollHeight = 0;
        this.scrollableElementUpdateDisposable = null;
        this.scrollableElementWidthDelayer = new Delayer(50);
        this.splicing = false;
        this.dragOverAnimationStopDisposable = Disposable.None;
        this.dragOverMouseY = 0;
        this.canDrop = false;
        this.currentDragFeedbackDisposable = Disposable.None;
        this.onDragLeaveTimeout = Disposable.None;
        this.currentSelectionDisposable = Disposable.None;
        this.disposables = new DisposableStore();
        this._onDidChangeContentHeight = new Emitter();
        this._onDidChangeContentWidth = new Emitter();
        this.onDidChangeContentHeight = Event.latch(this._onDidChangeContentHeight.event, undefined, this.disposables);
        this.onDidChangeContentWidth = Event.latch(this._onDidChangeContentWidth.event, undefined, this.disposables);
        this._horizontalScrolling = false;
        if (options.horizontalScrolling && options.supportDynamicHeights) {
            throw new Error('Horizontal scrolling and dynamic heights not supported simultaneously');
        }
        this.items = [];
        this.itemId = 0;
        this.rangeMap = this.createRangeMap(options.paddingTop ?? 0);
        for (const renderer of renderers) {
            this.renderers.set(renderer.templateId, renderer);
        }
        this.cache = this.disposables.add(new RowCache(this.renderers));
        this.lastRenderTop = 0;
        this.lastRenderHeight = 0;
        this.domNode = document.createElement('div');
        this.domNode.className = 'monaco-list';
        this.domNode.classList.add(this.domId);
        this.domNode.tabIndex = 0;
        this.domNode.classList.toggle('mouse-support', typeof options.mouseSupport === 'boolean' ? options.mouseSupport : true);
        this._horizontalScrolling = options.horizontalScrolling ?? DefaultOptions.horizontalScrolling;
        this.domNode.classList.toggle('horizontal-scrolling', this._horizontalScrolling);
        this.paddingBottom = typeof options.paddingBottom === 'undefined' ? 0 : options.paddingBottom;
        this.accessibilityProvider = new ListViewAccessibilityProvider(options.accessibilityProvider);
        this.rowsContainer = document.createElement('div');
        this.rowsContainer.className = 'monaco-list-rows';
        const transformOptimization = options.transformOptimization ?? DefaultOptions.transformOptimization;
        if (transformOptimization) {
            this.rowsContainer.style.transform = 'translate3d(0px, 0px, 0px)';
            this.rowsContainer.style.overflow = 'hidden';
            this.rowsContainer.style.contain = 'strict';
        }
        this.disposables.add(Gesture.addTarget(this.rowsContainer));
        this.scrollable = this.disposables.add(new Scrollable({
            forceIntegerValues: true,
            smoothScrollDuration: (options.smoothScrolling ?? false) ? 125 : 0,
            scheduleAtNextAnimationFrame: (cb) => scheduleAtNextAnimationFrame(getWindow(this.domNode), cb),
        }));
        this.scrollableElement = this.disposables.add(new SmoothScrollableElement(this.rowsContainer, {
            alwaysConsumeMouseWheel: options.alwaysConsumeMouseWheel ?? DefaultOptions.alwaysConsumeMouseWheel,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            vertical: options.verticalScrollMode ?? DefaultOptions.verticalScrollMode,
            useShadows: options.useShadows ?? DefaultOptions.useShadows,
            mouseWheelScrollSensitivity: options.mouseWheelScrollSensitivity,
            fastScrollSensitivity: options.fastScrollSensitivity,
            scrollByPage: options.scrollByPage,
        }, this.scrollable));
        this.domNode.appendChild(this.scrollableElement.getDomNode());
        container.appendChild(this.domNode);
        this.scrollableElement.onScroll(this.onScroll, this, this.disposables);
        this.disposables.add(addDisposableListener(this.rowsContainer, TouchEventType.Change, (e) => this.onTouchChange(e)));
        this.disposables.add(addDisposableListener(this.scrollableElement.getDomNode(), 'scroll', (e) => {
            // Make sure the active element is scrolled into view
            const element = e.target;
            const scrollValue = element.scrollTop;
            element.scrollTop = 0;
            if (options.scrollToActiveElement) {
                this.setScrollTop(this.scrollTop + scrollValue);
            }
        }));
        this.disposables.add(addDisposableListener(this.domNode, 'dragover', (e) => this.onDragOver(this.toDragEvent(e))));
        this.disposables.add(addDisposableListener(this.domNode, 'drop', (e) => this.onDrop(this.toDragEvent(e))));
        this.disposables.add(addDisposableListener(this.domNode, 'dragleave', (e) => this.onDragLeave(this.toDragEvent(e))));
        this.disposables.add(addDisposableListener(this.domNode, 'dragend', (e) => this.onDragEnd(e)));
        if (options.userSelection) {
            if (options.dnd) {
                throw new Error('DND and user selection cannot be used simultaneously');
            }
            this.disposables.add(addDisposableListener(this.domNode, 'mousedown', (e) => this.onPotentialSelectionStart(e)));
        }
        this.setRowLineHeight = options.setRowLineHeight ?? DefaultOptions.setRowLineHeight;
        this.setRowHeight = options.setRowHeight ?? DefaultOptions.setRowHeight;
        this.supportDynamicHeights =
            options.supportDynamicHeights ?? DefaultOptions.supportDynamicHeights;
        this.dnd = options.dnd ?? this.disposables.add(DefaultOptions.dnd);
        this.layout(options.initialSize?.height, options.initialSize?.width);
        if (options.scrollToActiveElement) {
            this._setupFocusObserver(container);
        }
    }
    _setupFocusObserver(container) {
        this.disposables.add(addDisposableListener(container, 'focus', () => {
            const element = getActiveElement();
            if (this.activeElement !== element && element !== null) {
                this.activeElement = element;
                this._scrollToActiveElement(this.activeElement, container);
            }
        }, true));
    }
    _scrollToActiveElement(element, container) {
        // The scroll event on the list only fires when scrolling down.
        // If the active element is above the viewport, we need to scroll up.
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const topOffset = elementRect.top - containerRect.top;
        if (topOffset < 0) {
            // Scroll up
            this.setScrollTop(this.scrollTop + topOffset);
        }
    }
    updateOptions(options) {
        if (options.paddingBottom !== undefined) {
            this.paddingBottom = options.paddingBottom;
            this.scrollableElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
        }
        if (options.smoothScrolling !== undefined) {
            this.scrollable.setSmoothScrollDuration(options.smoothScrolling ? 125 : 0);
        }
        if (options.horizontalScrolling !== undefined) {
            this.horizontalScrolling = options.horizontalScrolling;
        }
        let scrollableOptions;
        if (options.scrollByPage !== undefined) {
            scrollableOptions = { ...(scrollableOptions ?? {}), scrollByPage: options.scrollByPage };
        }
        if (options.mouseWheelScrollSensitivity !== undefined) {
            scrollableOptions = {
                ...(scrollableOptions ?? {}),
                mouseWheelScrollSensitivity: options.mouseWheelScrollSensitivity,
            };
        }
        if (options.fastScrollSensitivity !== undefined) {
            scrollableOptions = {
                ...(scrollableOptions ?? {}),
                fastScrollSensitivity: options.fastScrollSensitivity,
            };
        }
        if (scrollableOptions) {
            this.scrollableElement.updateOptions(scrollableOptions);
        }
        if (options.paddingTop !== undefined && options.paddingTop !== this.rangeMap.paddingTop) {
            // trigger a rerender
            const lastRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
            const offset = options.paddingTop - this.rangeMap.paddingTop;
            this.rangeMap.paddingTop = options.paddingTop;
            this.render(lastRenderRange, Math.max(0, this.lastRenderTop + offset), this.lastRenderHeight, undefined, undefined, true);
            this.setScrollTop(this.lastRenderTop);
            this.eventuallyUpdateScrollDimensions();
            if (this.supportDynamicHeights) {
                this._rerender(this.lastRenderTop, this.lastRenderHeight);
            }
        }
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        this.scrollableElement.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        this.scrollableElement.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    updateElementHeight(index, size, anchorIndex) {
        if (index < 0 || index >= this.items.length) {
            return;
        }
        const originalSize = this.items[index].size;
        if (typeof size === 'undefined') {
            if (!this.supportDynamicHeights) {
                console.warn('Dynamic heights not supported', new Error().stack);
                return;
            }
            this.items[index].lastDynamicHeightWidth = undefined;
            size = originalSize + this.probeDynamicHeight(index);
        }
        if (originalSize === size) {
            return;
        }
        const lastRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        let heightDiff = 0;
        if (index < lastRenderRange.start) {
            // do not scroll the viewport if resized element is out of viewport
            heightDiff = size - originalSize;
        }
        else {
            if (anchorIndex !== null && anchorIndex > index && anchorIndex < lastRenderRange.end) {
                // anchor in viewport
                // resized element in viewport and above the anchor
                heightDiff = size - originalSize;
            }
            else {
                heightDiff = 0;
            }
        }
        this.rangeMap.splice(index, 1, [{ size: size }]);
        this.items[index].size = size;
        this.render(lastRenderRange, Math.max(0, this.lastRenderTop + heightDiff), this.lastRenderHeight, undefined, undefined, true);
        this.setScrollTop(this.lastRenderTop);
        this.eventuallyUpdateScrollDimensions();
        if (this.supportDynamicHeights) {
            this._rerender(this.lastRenderTop, this.lastRenderHeight);
        }
        else {
            this._onDidChangeContentHeight.fire(this.contentHeight); // otherwise fired in _rerender()
        }
    }
    createRangeMap(paddingTop) {
        return new RangeMap(paddingTop);
    }
    splice(start, deleteCount, elements = []) {
        if (this.splicing) {
            throw new Error("Can't run recursive splices.");
        }
        this.splicing = true;
        try {
            return this._splice(start, deleteCount, elements);
        }
        finally {
            this.splicing = false;
            this._onDidChangeContentHeight.fire(this.contentHeight);
        }
    }
    _splice(start, deleteCount, elements = []) {
        const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const deleteRange = { start, end: start + deleteCount };
        const removeRange = Range.intersect(previousRenderRange, deleteRange);
        // try to reuse rows, avoid removing them from DOM
        const rowsToDispose = new Map();
        for (let i = removeRange.end - 1; i >= removeRange.start; i--) {
            const item = this.items[i];
            item.dragStartDisposable.dispose();
            item.checkedDisposable.dispose();
            if (item.row) {
                let rows = rowsToDispose.get(item.templateId);
                if (!rows) {
                    rows = [];
                    rowsToDispose.set(item.templateId, rows);
                }
                const renderer = this.renderers.get(item.templateId);
                if (renderer && renderer.disposeElement) {
                    renderer.disposeElement(item.element, i, item.row.templateData, item.size);
                }
                rows.unshift(item.row);
            }
            item.row = null;
            item.stale = true;
        }
        const previousRestRange = { start: start + deleteCount, end: this.items.length };
        const previousRenderedRestRange = Range.intersect(previousRestRange, previousRenderRange);
        const previousUnrenderedRestRanges = Range.relativeComplement(previousRestRange, previousRenderRange);
        const inserted = elements.map((element) => ({
            id: String(this.itemId++),
            element,
            templateId: this.virtualDelegate.getTemplateId(element),
            size: this.virtualDelegate.getHeight(element),
            width: undefined,
            hasDynamicHeight: !!this.virtualDelegate.hasDynamicHeight && this.virtualDelegate.hasDynamicHeight(element),
            lastDynamicHeightWidth: undefined,
            row: null,
            uri: undefined,
            dropTarget: false,
            dragStartDisposable: Disposable.None,
            checkedDisposable: Disposable.None,
            stale: false,
        }));
        let deleted;
        // TODO@joao: improve this optimization to catch even more cases
        if (start === 0 && deleteCount >= this.items.length) {
            this.rangeMap = this.createRangeMap(this.rangeMap.paddingTop);
            this.rangeMap.splice(0, 0, inserted);
            deleted = this.items;
            this.items = inserted;
        }
        else {
            this.rangeMap.splice(start, deleteCount, inserted);
            deleted = splice(this.items, start, deleteCount, inserted);
        }
        const delta = elements.length - deleteCount;
        const renderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        const renderedRestRange = shift(previousRenderedRestRange, delta);
        const updateRange = Range.intersect(renderRange, renderedRestRange);
        for (let i = updateRange.start; i < updateRange.end; i++) {
            this.updateItemInDOM(this.items[i], i);
        }
        const removeRanges = Range.relativeComplement(renderedRestRange, renderRange);
        for (const range of removeRanges) {
            for (let i = range.start; i < range.end; i++) {
                this.removeItemFromDOM(i);
            }
        }
        const unrenderedRestRanges = previousUnrenderedRestRanges.map((r) => shift(r, delta));
        const elementsRange = { start, end: start + elements.length };
        const insertRanges = [elementsRange, ...unrenderedRestRanges]
            .map((r) => Range.intersect(renderRange, r))
            .reverse();
        for (const range of insertRanges) {
            for (let i = range.end - 1; i >= range.start; i--) {
                const item = this.items[i];
                const rows = rowsToDispose.get(item.templateId);
                const row = rows?.pop();
                this.insertItemInDOM(i, row);
            }
        }
        for (const rows of rowsToDispose.values()) {
            for (const row of rows) {
                this.cache.release(row);
            }
        }
        this.eventuallyUpdateScrollDimensions();
        if (this.supportDynamicHeights) {
            this._rerender(this.scrollTop, this.renderHeight);
        }
        return deleted.map((i) => i.element);
    }
    eventuallyUpdateScrollDimensions() {
        this._scrollHeight = this.contentHeight;
        this.rowsContainer.style.height = `${this._scrollHeight}px`;
        if (!this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable = scheduleAtNextAnimationFrame(getWindow(this.domNode), () => {
                this.scrollableElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
                this.updateScrollWidth();
                this.scrollableElementUpdateDisposable = null;
            });
        }
    }
    eventuallyUpdateScrollWidth() {
        if (!this.horizontalScrolling) {
            this.scrollableElementWidthDelayer.cancel();
            return;
        }
        this.scrollableElementWidthDelayer.trigger(() => this.updateScrollWidth());
    }
    updateScrollWidth() {
        if (!this.horizontalScrolling) {
            return;
        }
        let scrollWidth = 0;
        for (const item of this.items) {
            if (typeof item.width !== 'undefined') {
                scrollWidth = Math.max(scrollWidth, item.width);
            }
        }
        this.scrollWidth = scrollWidth;
        this.scrollableElement.setScrollDimensions({
            scrollWidth: scrollWidth === 0 ? 0 : scrollWidth + 10,
        });
        this._onDidChangeContentWidth.fire(this.scrollWidth);
    }
    updateWidth(index) {
        if (!this.horizontalScrolling || typeof this.scrollWidth === 'undefined') {
            return;
        }
        const item = this.items[index];
        this.measureItemWidth(item);
        if (typeof item.width !== 'undefined' && item.width > this.scrollWidth) {
            this.scrollWidth = item.width;
            this.scrollableElement.setScrollDimensions({ scrollWidth: this.scrollWidth + 10 });
            this._onDidChangeContentWidth.fire(this.scrollWidth);
        }
    }
    rerender() {
        if (!this.supportDynamicHeights) {
            return;
        }
        for (const item of this.items) {
            item.lastDynamicHeightWidth = undefined;
        }
        this._rerender(this.lastRenderTop, this.lastRenderHeight);
    }
    get length() {
        return this.items.length;
    }
    get renderHeight() {
        const scrollDimensions = this.scrollableElement.getScrollDimensions();
        return scrollDimensions.height;
    }
    get firstVisibleIndex() {
        const range = this.getVisibleRange(this.lastRenderTop, this.lastRenderHeight);
        return range.start;
    }
    get firstMostlyVisibleIndex() {
        const firstVisibleIndex = this.firstVisibleIndex;
        const firstElTop = this.rangeMap.positionAt(firstVisibleIndex);
        const nextElTop = this.rangeMap.positionAt(firstVisibleIndex + 1);
        if (nextElTop !== -1) {
            const firstElMidpoint = (nextElTop - firstElTop) / 2 + firstElTop;
            if (firstElMidpoint < this.scrollTop) {
                return firstVisibleIndex + 1;
            }
        }
        return firstVisibleIndex;
    }
    get lastVisibleIndex() {
        const range = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
        return range.end - 1;
    }
    element(index) {
        return this.items[index].element;
    }
    indexOf(element) {
        return this.items.findIndex((item) => item.element === element);
    }
    domElement(index) {
        const row = this.items[index].row;
        return row && row.domNode;
    }
    elementHeight(index) {
        return this.items[index].size;
    }
    elementTop(index) {
        return this.rangeMap.positionAt(index);
    }
    indexAt(position) {
        return this.rangeMap.indexAt(position);
    }
    indexAfter(position) {
        return this.rangeMap.indexAfter(position);
    }
    layout(height, width) {
        const scrollDimensions = {
            height: typeof height === 'number' ? height : getContentHeight(this.domNode),
        };
        if (this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable.dispose();
            this.scrollableElementUpdateDisposable = null;
            scrollDimensions.scrollHeight = this.scrollHeight;
        }
        this.scrollableElement.setScrollDimensions(scrollDimensions);
        if (typeof width !== 'undefined') {
            this.renderWidth = width;
            if (this.supportDynamicHeights) {
                this._rerender(this.scrollTop, this.renderHeight);
            }
        }
        if (this.horizontalScrolling) {
            this.scrollableElement.setScrollDimensions({
                width: typeof width === 'number' ? width : getContentWidth(this.domNode),
            });
        }
    }
    // Render
    render(previousRenderRange, renderTop, renderHeight, renderLeft, scrollWidth, updateItemsInDOM = false) {
        const renderRange = this.getRenderRange(renderTop, renderHeight);
        const rangesToInsert = Range.relativeComplement(renderRange, previousRenderRange).reverse();
        const rangesToRemove = Range.relativeComplement(previousRenderRange, renderRange);
        if (updateItemsInDOM) {
            const rangesToUpdate = Range.intersect(previousRenderRange, renderRange);
            for (let i = rangesToUpdate.start; i < rangesToUpdate.end; i++) {
                this.updateItemInDOM(this.items[i], i);
            }
        }
        this.cache.transact(() => {
            for (const range of rangesToRemove) {
                for (let i = range.start; i < range.end; i++) {
                    this.removeItemFromDOM(i);
                }
            }
            for (const range of rangesToInsert) {
                for (let i = range.end - 1; i >= range.start; i--) {
                    this.insertItemInDOM(i);
                }
            }
        });
        if (renderLeft !== undefined) {
            this.rowsContainer.style.left = `-${renderLeft}px`;
        }
        this.rowsContainer.style.top = `-${renderTop}px`;
        if (this.horizontalScrolling && scrollWidth !== undefined) {
            this.rowsContainer.style.width = `${Math.max(scrollWidth, this.renderWidth)}px`;
        }
        this.lastRenderTop = renderTop;
        this.lastRenderHeight = renderHeight;
    }
    // DOM operations
    insertItemInDOM(index, row) {
        const item = this.items[index];
        if (!item.row) {
            if (row) {
                item.row = row;
                item.stale = true;
            }
            else {
                const result = this.cache.alloc(item.templateId);
                item.row = result.row;
                item.stale ||= result.isReusingConnectedDomNode;
            }
        }
        const role = this.accessibilityProvider.getRole(item.element) || 'listitem';
        item.row.domNode.setAttribute('role', role);
        const checked = this.accessibilityProvider.isChecked(item.element);
        if (typeof checked === 'boolean') {
            item.row.domNode.setAttribute('aria-checked', String(!!checked));
        }
        else if (checked) {
            const update = (checked) => item.row.domNode.setAttribute('aria-checked', String(!!checked));
            update(checked.value);
            item.checkedDisposable = checked.onDidChange(() => update(checked.value));
        }
        if (item.stale || !item.row.domNode.parentElement) {
            const referenceNode = this.items.at(index + 1)?.row?.domNode ?? null;
            if (item.row.domNode.parentElement !== this.rowsContainer ||
                item.row.domNode.nextElementSibling !== referenceNode) {
                this.rowsContainer.insertBefore(item.row.domNode, referenceNode);
            }
            item.stale = false;
        }
        this.updateItemInDOM(item, index);
        const renderer = this.renderers.get(item.templateId);
        if (!renderer) {
            throw new Error(`No renderer found for template id ${item.templateId}`);
        }
        renderer?.renderElement(item.element, index, item.row.templateData, item.size);
        const uri = this.dnd.getDragURI(item.element);
        item.dragStartDisposable.dispose();
        item.row.domNode.draggable = !!uri;
        if (uri) {
            item.dragStartDisposable = addDisposableListener(item.row.domNode, 'dragstart', (event) => this.onDragStart(item.element, uri, event));
        }
        if (this.horizontalScrolling) {
            this.measureItemWidth(item);
            this.eventuallyUpdateScrollWidth();
        }
    }
    measureItemWidth(item) {
        if (!item.row || !item.row.domNode) {
            return;
        }
        item.row.domNode.style.width = 'fit-content';
        item.width = getContentWidth(item.row.domNode);
        const style = getWindow(item.row.domNode).getComputedStyle(item.row.domNode);
        if (style.paddingLeft) {
            item.width += parseFloat(style.paddingLeft);
        }
        if (style.paddingRight) {
            item.width += parseFloat(style.paddingRight);
        }
        item.row.domNode.style.width = '';
    }
    updateItemInDOM(item, index) {
        item.row.domNode.style.top = `${this.elementTop(index)}px`;
        if (this.setRowHeight) {
            item.row.domNode.style.height = `${item.size}px`;
        }
        if (this.setRowLineHeight) {
            item.row.domNode.style.lineHeight = `${item.size}px`;
        }
        item.row.domNode.setAttribute('data-index', `${index}`);
        item.row.domNode.setAttribute('data-last-element', index === this.length - 1 ? 'true' : 'false');
        item.row.domNode.setAttribute('data-parity', index % 2 === 0 ? 'even' : 'odd');
        item.row.domNode.setAttribute('aria-setsize', String(this.accessibilityProvider.getSetSize(item.element, index, this.length)));
        item.row.domNode.setAttribute('aria-posinset', String(this.accessibilityProvider.getPosInSet(item.element, index)));
        item.row.domNode.setAttribute('id', this.getElementDomId(index));
        item.row.domNode.classList.toggle('drop-target', item.dropTarget);
    }
    removeItemFromDOM(index) {
        const item = this.items[index];
        item.dragStartDisposable.dispose();
        item.checkedDisposable.dispose();
        if (item.row) {
            const renderer = this.renderers.get(item.templateId);
            if (renderer && renderer.disposeElement) {
                renderer.disposeElement(item.element, index, item.row.templateData, item.size);
            }
            this.cache.release(item.row);
            item.row = null;
        }
        if (this.horizontalScrolling) {
            this.eventuallyUpdateScrollWidth();
        }
    }
    getScrollTop() {
        const scrollPosition = this.scrollableElement.getScrollPosition();
        return scrollPosition.scrollTop;
    }
    setScrollTop(scrollTop, reuseAnimation) {
        if (this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable.dispose();
            this.scrollableElementUpdateDisposable = null;
            this.scrollableElement.setScrollDimensions({ scrollHeight: this.scrollHeight });
        }
        this.scrollableElement.setScrollPosition({ scrollTop, reuseAnimation });
    }
    getScrollLeft() {
        const scrollPosition = this.scrollableElement.getScrollPosition();
        return scrollPosition.scrollLeft;
    }
    setScrollLeft(scrollLeft) {
        if (this.scrollableElementUpdateDisposable) {
            this.scrollableElementUpdateDisposable.dispose();
            this.scrollableElementUpdateDisposable = null;
            this.scrollableElement.setScrollDimensions({ scrollWidth: this.scrollWidth });
        }
        this.scrollableElement.setScrollPosition({ scrollLeft });
    }
    get scrollTop() {
        return this.getScrollTop();
    }
    set scrollTop(scrollTop) {
        this.setScrollTop(scrollTop);
    }
    get scrollHeight() {
        return this._scrollHeight + (this.horizontalScrolling ? 10 : 0) + this.paddingBottom;
    }
    // Events
    get onMouseClick() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'click')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onMouseDblClick() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'dblclick')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onMouseMiddleClick() {
        return Event.filter(Event.map(this.disposables.add(new DomEmitter(this.domNode, 'auxclick')).event, (e) => this.toMouseEvent(e), this.disposables), (e) => e.browserEvent.button === 1, this.disposables);
    }
    get onMouseUp() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mouseup')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onMouseDown() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mousedown')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onMouseOver() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mouseover')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onMouseMove() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mousemove')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onMouseOut() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'mouseout')).event, (e) => this.toMouseEvent(e), this.disposables);
    }
    get onContextMenu() {
        return Event.any(Event.map(this.disposables.add(new DomEmitter(this.domNode, 'contextmenu')).event, (e) => this.toMouseEvent(e), this.disposables), Event.map(this.disposables.add(new DomEmitter(this.domNode, TouchEventType.Contextmenu))
            .event, (e) => this.toGestureEvent(e), this.disposables));
    }
    get onTouchStart() {
        return Event.map(this.disposables.add(new DomEmitter(this.domNode, 'touchstart')).event, (e) => this.toTouchEvent(e), this.disposables);
    }
    get onTap() {
        return Event.map(this.disposables.add(new DomEmitter(this.rowsContainer, TouchEventType.Tap)).event, (e) => this.toGestureEvent(e), this.disposables);
    }
    toMouseEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.target || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        return { browserEvent, index, element };
    }
    toTouchEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.target || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        return { browserEvent, index, element };
    }
    toGestureEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.initialTarget || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        return { browserEvent, index, element };
    }
    toDragEvent(browserEvent) {
        const index = this.getItemIndexFromEventTarget(browserEvent.target || null);
        const item = typeof index === 'undefined' ? undefined : this.items[index];
        const element = item && item.element;
        const sector = this.getTargetSector(browserEvent, index);
        return { browserEvent, index, element, sector };
    }
    onScroll(e) {
        try {
            const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
            this.render(previousRenderRange, e.scrollTop, e.height, e.scrollLeft, e.scrollWidth);
            if (this.supportDynamicHeights) {
                this._rerender(e.scrollTop, e.height, e.inSmoothScrolling);
            }
        }
        catch (err) {
            console.error('Got bad scroll event:', e);
            throw err;
        }
    }
    onTouchChange(event) {
        event.preventDefault();
        event.stopPropagation();
        this.scrollTop -= event.translationY;
    }
    // DND
    onDragStart(element, uri, event) {
        if (!event.dataTransfer) {
            return;
        }
        const elements = this.dnd.getDragElements(element);
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData(DataTransfers.TEXT, uri);
        let label;
        if (this.dnd.getDragLabel) {
            label = this.dnd.getDragLabel(elements, event);
        }
        if (typeof label === 'undefined') {
            label = String(elements.length);
        }
        applyDragImage(event, this.domNode, label, [
            this.domId /* add domId to get list specific styling */,
        ]);
        this.domNode.classList.add('dragging');
        this.currentDragData = new ElementsDragAndDropData(elements);
        StaticDND.CurrentDragAndDropData = new ExternalElementsDragAndDropData(elements);
        this.dnd.onDragStart?.(this.currentDragData, event);
    }
    onPotentialSelectionStart(e) {
        this.currentSelectionDisposable.dispose();
        const doc = getDocument(this.domNode);
        // Set up both the 'movement store' for watching the mouse, and the
        // 'selection store' which lasts as long as there's a selection, even
        // after the usr has stopped modifying it.
        const selectionStore = (this.currentSelectionDisposable = new DisposableStore());
        const movementStore = selectionStore.add(new DisposableStore());
        // The selection events we get from the DOM are fairly limited and we lack a 'selection end' event.
        // Selection events also don't tell us where the input doing the selection is. So, make a poor
        // assumption that a user is using the mouse, and base our events on that.
        movementStore.add(addDisposableListener(this.domNode, 'selectstart', () => {
            movementStore.add(addDisposableListener(doc, 'mousemove', (e) => {
                if (doc.getSelection()?.isCollapsed === false) {
                    this.setupDragAndDropScrollTopAnimation(e);
                }
            }));
            // The selection is cleared either on mouseup if there's no selection, or on next mousedown
            // when `this.currentSelectionDisposable` is reset.
            selectionStore.add(toDisposable(() => {
                const previousRenderRange = this.getRenderRange(this.lastRenderTop, this.lastRenderHeight);
                this.currentSelectionBounds = undefined;
                this.render(previousRenderRange, this.lastRenderTop, this.lastRenderHeight, undefined, undefined);
            }));
            selectionStore.add(addDisposableListener(doc, 'selectionchange', () => {
                const selection = doc.getSelection();
                // if the selection changed _after_ mouseup, it's from clearing the list or similar, so teardown
                if (!selection || selection.isCollapsed) {
                    if (movementStore.isDisposed) {
                        selectionStore.dispose();
                    }
                    return;
                }
                let start = this.getIndexOfListElement(selection.anchorNode);
                let end = this.getIndexOfListElement(selection.focusNode);
                if (start !== undefined && end !== undefined) {
                    if (end < start) {
                        ;
                        [start, end] = [end, start];
                    }
                    this.currentSelectionBounds = { start, end };
                }
            }));
        }));
        movementStore.add(addDisposableListener(doc, 'mouseup', () => {
            movementStore.dispose();
            this.teardownDragAndDropScrollTopAnimation();
            if (doc.getSelection()?.isCollapsed !== false) {
                selectionStore.dispose();
            }
        }));
    }
    getIndexOfListElement(element) {
        if (!element || !this.domNode.contains(element)) {
            return undefined;
        }
        while (element && element !== this.domNode) {
            if (element.dataset?.index) {
                return Number(element.dataset.index);
            }
            element = element.parentElement;
        }
        return undefined;
    }
    onDragOver(event) {
        event.browserEvent.preventDefault(); // needed so that the drop event fires (https://stackoverflow.com/questions/21339924/drop-event-not-firing-in-chrome)
        this.onDragLeaveTimeout.dispose();
        if (StaticDND.CurrentDragAndDropData &&
            StaticDND.CurrentDragAndDropData.getData() === 'vscode-ui') {
            return false;
        }
        this.setupDragAndDropScrollTopAnimation(event.browserEvent);
        if (!event.browserEvent.dataTransfer) {
            return false;
        }
        // Drag over from outside
        if (!this.currentDragData) {
            if (StaticDND.CurrentDragAndDropData) {
                // Drag over from another list
                this.currentDragData = StaticDND.CurrentDragAndDropData;
            }
            else {
                // Drag over from the desktop
                if (!event.browserEvent.dataTransfer.types) {
                    return false;
                }
                this.currentDragData = new NativeDragAndDropData();
            }
        }
        const result = this.dnd.onDragOver(this.currentDragData, event.element, event.index, event.sector, event.browserEvent);
        this.canDrop = typeof result === 'boolean' ? result : result.accept;
        if (!this.canDrop) {
            this.currentDragFeedback = undefined;
            this.currentDragFeedbackDisposable.dispose();
            return false;
        }
        event.browserEvent.dataTransfer.dropEffect =
            typeof result !== 'boolean' && result.effect?.type === 0 /* ListDragOverEffectType.Copy */
                ? 'copy'
                : 'move';
        let feedback;
        if (typeof result !== 'boolean' && result.feedback) {
            feedback = result.feedback;
        }
        else {
            if (typeof event.index === 'undefined') {
                feedback = [-1];
            }
            else {
                feedback = [event.index];
            }
        }
        // sanitize feedback list
        feedback = distinct(feedback)
            .filter((i) => i >= -1 && i < this.length)
            .sort((a, b) => a - b);
        feedback = feedback[0] === -1 ? [-1] : feedback;
        let dragOverEffectPosition = typeof result !== 'boolean' && result.effect && result.effect.position
            ? result.effect.position
            : "drop-target" /* ListDragOverEffectPosition.Over */;
        if (equalsDragFeedback(this.currentDragFeedback, feedback) &&
            this.currentDragFeedbackPosition === dragOverEffectPosition) {
            return true;
        }
        this.currentDragFeedback = feedback;
        this.currentDragFeedbackPosition = dragOverEffectPosition;
        this.currentDragFeedbackDisposable.dispose();
        if (feedback[0] === -1) {
            // entire list feedback
            this.domNode.classList.add(dragOverEffectPosition);
            this.rowsContainer.classList.add(dragOverEffectPosition);
            this.currentDragFeedbackDisposable = toDisposable(() => {
                this.domNode.classList.remove(dragOverEffectPosition);
                this.rowsContainer.classList.remove(dragOverEffectPosition);
            });
        }
        else {
            if (feedback.length > 1 && dragOverEffectPosition !== "drop-target" /* ListDragOverEffectPosition.Over */) {
                throw new Error("Can't use multiple feedbacks with position different than 'over'");
            }
            // Make sure there is no flicker when moving between two items
            // Always use the before feedback if possible
            if (dragOverEffectPosition === "drop-target-after" /* ListDragOverEffectPosition.After */) {
                if (feedback[0] < this.length - 1) {
                    feedback[0] += 1;
                    dragOverEffectPosition = "drop-target-before" /* ListDragOverEffectPosition.Before */;
                }
            }
            for (const index of feedback) {
                const item = this.items[index];
                item.dropTarget = true;
                item.row?.domNode.classList.add(dragOverEffectPosition);
            }
            this.currentDragFeedbackDisposable = toDisposable(() => {
                for (const index of feedback) {
                    const item = this.items[index];
                    item.dropTarget = false;
                    item.row?.domNode.classList.remove(dragOverEffectPosition);
                }
            });
        }
        return true;
    }
    onDragLeave(event) {
        this.onDragLeaveTimeout.dispose();
        this.onDragLeaveTimeout = disposableTimeout(() => this.clearDragOverFeedback(), 100, this.disposables);
        if (this.currentDragData) {
            this.dnd.onDragLeave?.(this.currentDragData, event.element, event.index, event.browserEvent);
        }
    }
    onDrop(event) {
        if (!this.canDrop) {
            return;
        }
        const dragData = this.currentDragData;
        this.teardownDragAndDropScrollTopAnimation();
        this.clearDragOverFeedback();
        this.domNode.classList.remove('dragging');
        this.currentDragData = undefined;
        StaticDND.CurrentDragAndDropData = undefined;
        if (!dragData || !event.browserEvent.dataTransfer) {
            return;
        }
        event.browserEvent.preventDefault();
        dragData.update(event.browserEvent.dataTransfer);
        this.dnd.drop(dragData, event.element, event.index, event.sector, event.browserEvent);
    }
    onDragEnd(event) {
        this.canDrop = false;
        this.teardownDragAndDropScrollTopAnimation();
        this.clearDragOverFeedback();
        this.domNode.classList.remove('dragging');
        this.currentDragData = undefined;
        StaticDND.CurrentDragAndDropData = undefined;
        this.dnd.onDragEnd?.(event);
    }
    clearDragOverFeedback() {
        this.currentDragFeedback = undefined;
        this.currentDragFeedbackPosition = undefined;
        this.currentDragFeedbackDisposable.dispose();
        this.currentDragFeedbackDisposable = Disposable.None;
    }
    // DND scroll top animation
    setupDragAndDropScrollTopAnimation(event) {
        if (!this.dragOverAnimationDisposable) {
            const viewTop = getTopLeftOffset(this.domNode).top;
            this.dragOverAnimationDisposable = animate(getWindow(this.domNode), this.animateDragAndDropScrollTop.bind(this, viewTop));
        }
        this.dragOverAnimationStopDisposable.dispose();
        this.dragOverAnimationStopDisposable = disposableTimeout(() => {
            if (this.dragOverAnimationDisposable) {
                this.dragOverAnimationDisposable.dispose();
                this.dragOverAnimationDisposable = undefined;
            }
        }, 1000, this.disposables);
        this.dragOverMouseY = event.pageY;
    }
    animateDragAndDropScrollTop(viewTop) {
        if (this.dragOverMouseY === undefined) {
            return;
        }
        const diff = this.dragOverMouseY - viewTop;
        const upperLimit = this.renderHeight - 35;
        if (diff < 35) {
            this.scrollTop += Math.max(-14, Math.floor(0.3 * (diff - 35)));
        }
        else if (diff > upperLimit) {
            this.scrollTop += Math.min(14, Math.floor(0.3 * (diff - upperLimit)));
        }
    }
    teardownDragAndDropScrollTopAnimation() {
        this.dragOverAnimationStopDisposable.dispose();
        if (this.dragOverAnimationDisposable) {
            this.dragOverAnimationDisposable.dispose();
            this.dragOverAnimationDisposable = undefined;
        }
    }
    // Util
    getTargetSector(browserEvent, targetIndex) {
        if (targetIndex === undefined) {
            return undefined;
        }
        const relativePosition = browserEvent.offsetY / this.items[targetIndex].size;
        const sector = Math.floor(relativePosition / 0.25);
        return clamp(sector, 0, 3);
    }
    getItemIndexFromEventTarget(target) {
        const scrollableElement = this.scrollableElement.getDomNode();
        let element = target;
        while ((isHTMLElement(element) || isSVGElement(element)) &&
            element !== this.rowsContainer &&
            scrollableElement.contains(element)) {
            const rawIndex = element.getAttribute('data-index');
            if (rawIndex) {
                const index = Number(rawIndex);
                if (!isNaN(index)) {
                    return index;
                }
            }
            element = element.parentElement;
        }
        return undefined;
    }
    getVisibleRange(renderTop, renderHeight) {
        return {
            start: this.rangeMap.indexAt(renderTop),
            end: this.rangeMap.indexAfter(renderTop + renderHeight - 1),
        };
    }
    getRenderRange(renderTop, renderHeight) {
        const range = this.getVisibleRange(renderTop, renderHeight);
        if (this.currentSelectionBounds) {
            const max = this.rangeMap.count;
            range.start = Math.min(range.start, this.currentSelectionBounds.start, max);
            range.end = Math.min(Math.max(range.end, this.currentSelectionBounds.end + 1), max);
        }
        return range;
    }
    /**
     * Given a stable rendered state, checks every rendered element whether it needs
     * to be probed for dynamic height. Adjusts scroll height and top if necessary.
     */
    _rerender(renderTop, renderHeight, inSmoothScrolling) {
        const previousRenderRange = this.getRenderRange(renderTop, renderHeight);
        // Let's remember the second element's position, this helps in scrolling up
        // and preserving a linear upwards scroll movement
        let anchorElementIndex;
        let anchorElementTopDelta;
        if (renderTop === this.elementTop(previousRenderRange.start)) {
            anchorElementIndex = previousRenderRange.start;
            anchorElementTopDelta = 0;
        }
        else if (previousRenderRange.end - previousRenderRange.start > 1) {
            anchorElementIndex = previousRenderRange.start + 1;
            anchorElementTopDelta = this.elementTop(anchorElementIndex) - renderTop;
        }
        let heightDiff = 0;
        while (true) {
            const renderRange = this.getRenderRange(renderTop, renderHeight);
            let didChange = false;
            for (let i = renderRange.start; i < renderRange.end; i++) {
                const diff = this.probeDynamicHeight(i);
                if (diff !== 0) {
                    this.rangeMap.splice(i, 1, [this.items[i]]);
                }
                heightDiff += diff;
                didChange = didChange || diff !== 0;
            }
            if (!didChange) {
                if (heightDiff !== 0) {
                    this.eventuallyUpdateScrollDimensions();
                }
                const unrenderRanges = Range.relativeComplement(previousRenderRange, renderRange);
                for (const range of unrenderRanges) {
                    for (let i = range.start; i < range.end; i++) {
                        if (this.items[i].row) {
                            this.removeItemFromDOM(i);
                        }
                    }
                }
                const renderRanges = Range.relativeComplement(renderRange, previousRenderRange).reverse();
                for (const range of renderRanges) {
                    for (let i = range.end - 1; i >= range.start; i--) {
                        this.insertItemInDOM(i);
                    }
                }
                for (let i = renderRange.start; i < renderRange.end; i++) {
                    if (this.items[i].row) {
                        this.updateItemInDOM(this.items[i], i);
                    }
                }
                if (typeof anchorElementIndex === 'number') {
                    // To compute a destination scroll top, we need to take into account the current smooth scrolling
                    // animation, and then reuse it with a new target (to avoid prolonging the scroll)
                    // See https://github.com/microsoft/vscode/issues/104144
                    // See https://github.com/microsoft/vscode/pull/104284
                    // See https://github.com/microsoft/vscode/issues/107704
                    const deltaScrollTop = this.scrollable.getFutureScrollPosition().scrollTop - renderTop;
                    const newScrollTop = this.elementTop(anchorElementIndex) - anchorElementTopDelta + deltaScrollTop;
                    this.setScrollTop(newScrollTop, inSmoothScrolling);
                }
                this._onDidChangeContentHeight.fire(this.contentHeight);
                return;
            }
        }
    }
    probeDynamicHeight(index) {
        const item = this.items[index];
        if (!!this.virtualDelegate.getDynamicHeight) {
            const newSize = this.virtualDelegate.getDynamicHeight(item.element);
            if (newSize !== null) {
                const size = item.size;
                item.size = newSize;
                item.lastDynamicHeightWidth = this.renderWidth;
                return newSize - size;
            }
        }
        if (!item.hasDynamicHeight || item.lastDynamicHeightWidth === this.renderWidth) {
            return 0;
        }
        if (!!this.virtualDelegate.hasDynamicHeight &&
            !this.virtualDelegate.hasDynamicHeight(item.element)) {
            return 0;
        }
        const size = item.size;
        if (item.row) {
            item.row.domNode.style.height = '';
            item.size = item.row.domNode.offsetHeight;
            if (item.size === 0 &&
                !isAncestor(item.row.domNode, getWindow(item.row.domNode).document.body)) {
                console.warn('Measuring item node that is not in DOM! Add ListView to the DOM before measuring row height!', new Error().stack);
            }
            item.lastDynamicHeightWidth = this.renderWidth;
            return item.size - size;
        }
        const { row } = this.cache.alloc(item.templateId);
        row.domNode.style.height = '';
        this.rowsContainer.appendChild(row.domNode);
        const renderer = this.renderers.get(item.templateId);
        if (!renderer) {
            throw new BugIndicatingError('Missing renderer for templateId: ' + item.templateId);
        }
        renderer.renderElement(item.element, index, row.templateData, undefined);
        item.size = row.domNode.offsetHeight;
        renderer.disposeElement?.(item.element, index, row.templateData, undefined);
        this.virtualDelegate.setDynamicHeight?.(item.element, item.size);
        item.lastDynamicHeightWidth = this.renderWidth;
        row.domNode.remove();
        this.cache.release(row);
        return item.size - size;
    }
    getElementDomId(index) {
        return `${this.domId}_${index}`;
    }
    // Dispose
    dispose() {
        for (const item of this.items) {
            item.dragStartDisposable.dispose();
            item.checkedDisposable.dispose();
            if (item.row) {
                const renderer = this.renderers.get(item.row.templateId);
                if (renderer) {
                    renderer.disposeElement?.(item.element, -1, item.row.templateData, undefined);
                    renderer.disposeTemplate(item.row.templateData);
                }
            }
        }
        this.items = [];
        this.domNode?.remove();
        this.dragOverAnimationDisposable?.dispose();
        this.disposables.dispose();
    }
}
__decorate([
    memoize
], ListView.prototype, "onMouseClick", null);
__decorate([
    memoize
], ListView.prototype, "onMouseDblClick", null);
__decorate([
    memoize
], ListView.prototype, "onMouseMiddleClick", null);
__decorate([
    memoize
], ListView.prototype, "onMouseUp", null);
__decorate([
    memoize
], ListView.prototype, "onMouseDown", null);
__decorate([
    memoize
], ListView.prototype, "onMouseOver", null);
__decorate([
    memoize
], ListView.prototype, "onMouseMove", null);
__decorate([
    memoize
], ListView.prototype, "onMouseOut", null);
__decorate([
    memoize
], ListView.prototype, "onContextMenu", null);
__decorate([
    memoize
], ListView.prototype, "onTouchStart", null);
__decorate([
    memoize
], ListView.prototype, "onTap", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdFZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvbGlzdC9saXN0Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLGNBQWMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04scUJBQXFCLEVBQ3JCLE9BQU8sRUFFUCxnQkFBZ0IsRUFDaEIsZ0JBQWdCLEVBQ2hCLGVBQWUsRUFDZixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLFNBQVMsRUFDVCxVQUFVLEVBQ1YsYUFBYSxFQUNiLFlBQVksRUFDWiw0QkFBNEIsR0FDNUIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRTNDLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE9BQU8sRUFBZ0IsTUFBTSxnQkFBZ0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUF5QixNQUFNLDBCQUEwQixDQUFBO0FBQ2hGLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sVUFBVSxHQUdWLE1BQU0s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