/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFirefox } from '../../browser.js';
import { DataTransfers } from '../../dnd.js';
import { $, addDisposableListener, append, clearNode, EventHelper, EventType, getWindow, isHTMLElement, trackFocus, } from '../../dom.js';
import { DomEmitter } from '../../event.js';
import { StandardKeyboardEvent } from '../../keyboardEvent.js';
import { Gesture, EventType as TouchEventType } from '../../touch.js';
import { Color, RGBA } from '../../../common/color.js';
import { Emitter, Event } from '../../../common/event.js';
import { Disposable, DisposableStore } from '../../../common/lifecycle.js';
import './paneview.css';
import { localize } from '../../../../nls.js';
import { Sizing, SplitView } from './splitview.js';
import { applyDragImage } from '../dnd/dnd.js';
/**
 * A Pane is a structured SplitView view.
 *
 * WARNING: You must call `render()` after you construct it.
 * It can't be done automatically at the end of the ctor
 * because of the order of property initialization in TypeScript.
 * Subclasses wouldn't be able to set own properties
 * before the `render()` call, thus forbidding their use.
 */
export class Pane extends Disposable {
    static { this.HEADER_SIZE = 22; }
    get ariaHeaderLabel() {
        return this._ariaHeaderLabel;
    }
    set ariaHeaderLabel(newLabel) {
        this._ariaHeaderLabel = newLabel;
        this.header?.setAttribute('aria-label', this.ariaHeaderLabel);
    }
    get draggableElement() {
        return this.header;
    }
    get dropTargetElement() {
        return this.element;
    }
    get dropBackground() {
        return this.styles.dropBackground;
    }
    get minimumBodySize() {
        return this._minimumBodySize;
    }
    set minimumBodySize(size) {
        this._minimumBodySize = size;
        this._onDidChange.fire(undefined);
    }
    get maximumBodySize() {
        return this._maximumBodySize;
    }
    set maximumBodySize(size) {
        this._maximumBodySize = size;
        this._onDidChange.fire(undefined);
    }
    get headerSize() {
        return this.headerVisible ? Pane.HEADER_SIZE : 0;
    }
    get minimumSize() {
        const headerSize = this.headerSize;
        const expanded = !this.headerVisible || this.isExpanded();
        const minimumBodySize = expanded ? this.minimumBodySize : 0;
        return headerSize + minimumBodySize;
    }
    get maximumSize() {
        const headerSize = this.headerSize;
        const expanded = !this.headerVisible || this.isExpanded();
        const maximumBodySize = expanded ? this.maximumBodySize : 0;
        return headerSize + maximumBodySize;
    }
    getAriaHeaderLabel(title) {
        return localize('viewSection', '{0} Section', title);
    }
    constructor(options) {
        super();
        this.expandedSize = undefined;
        this._headerVisible = true;
        this._collapsible = true;
        this._bodyRendered = false;
        this.styles = {
            dropBackground: undefined,
            headerBackground: undefined,
            headerBorder: undefined,
            headerForeground: undefined,
            leftBorder: undefined,
        };
        this.animationTimer = undefined;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._onDidChangeExpansionState = this._register(new Emitter());
        this.onDidChangeExpansionState = this._onDidChangeExpansionState.event;
        this.orthogonalSize = 0;
        this._expanded = typeof options.expanded === 'undefined' ? true : !!options.expanded;
        this._orientation =
            typeof options.orientation === 'undefined' ? 0 /* Orientation.VERTICAL */ : options.orientation;
        this._ariaHeaderLabel = this.getAriaHeaderLabel(options.title);
        this._minimumBodySize =
            typeof options.minimumBodySize === 'number'
                ? options.minimumBodySize
                : this._orientation === 1 /* Orientation.HORIZONTAL */
                    ? 200
                    : 120;
        this._maximumBodySize =
            typeof options.maximumBodySize === 'number'
                ? options.maximumBodySize
                : Number.POSITIVE_INFINITY;
        this.element = $('.pane');
    }
    isExpanded() {
        return this._expanded;
    }
    setExpanded(expanded) {
        if (!expanded && !this.collapsible) {
            return false;
        }
        if (this._expanded === !!expanded) {
            return false;
        }
        this.element?.classList.toggle('expanded', expanded);
        this._expanded = !!expanded;
        this.updateHeader();
        if (expanded) {
            if (!this._bodyRendered) {
                this.renderBody(this.body);
                this._bodyRendered = true;
            }
            if (typeof this.animationTimer === 'number') {
                getWindow(this.element).clearTimeout(this.animationTimer);
            }
            append(this.element, this.body);
        }
        else {
            this.animationTimer = getWindow(this.element).setTimeout(() => {
                this.body.remove();
            }, 200);
        }
        this._onDidChangeExpansionState.fire(expanded);
        this._onDidChange.fire(expanded ? this.expandedSize : undefined);
        return true;
    }
    get headerVisible() {
        return this._headerVisible;
    }
    set headerVisible(visible) {
        if (this._headerVisible === !!visible) {
            return;
        }
        this._headerVisible = !!visible;
        this.updateHeader();
        this._onDidChange.fire(undefined);
    }
    get collapsible() {
        return this._collapsible;
    }
    set collapsible(collapsible) {
        if (this._collapsible === !!collapsible) {
            return;
        }
        this._collapsible = !!collapsible;
        this.updateHeader();
    }
    get orientation() {
        return this._orientation;
    }
    set orientation(orientation) {
        if (this._orientation === orientation) {
            return;
        }
        this._orientation = orientation;
        if (this.element) {
            this.element.classList.toggle('horizontal', this.orientation === 1 /* Orientation.HORIZONTAL */);
            this.element.classList.toggle('vertical', this.orientation === 0 /* Orientation.VERTICAL */);
        }
        if (this.header) {
            this.updateHeader();
        }
    }
    render() {
        this.element.classList.toggle('expanded', this.isExpanded());
        this.element.classList.toggle('horizontal', this.orientation === 1 /* Orientation.HORIZONTAL */);
        this.element.classList.toggle('vertical', this.orientation === 0 /* Orientation.VERTICAL */);
        this.header = $('.pane-header');
        append(this.element, this.header);
        this.header.setAttribute('tabindex', '0');
        // Use role button so the aria-expanded state gets read https://github.com/microsoft/vscode/issues/95996
        this.header.setAttribute('role', 'button');
        this.header.setAttribute('aria-label', this.ariaHeaderLabel);
        this.renderHeader(this.header);
        const focusTracker = trackFocus(this.header);
        this._register(focusTracker);
        this._register(focusTracker.onDidFocus(() => this.header?.classList.add('focused'), null));
        this._register(focusTracker.onDidBlur(() => this.header?.classList.remove('focused'), null));
        this.updateHeader();
        const eventDisposables = this._register(new DisposableStore());
        const onKeyDown = this._register(new DomEmitter(this.header, 'keydown'));
        const onHeaderKeyDown = Event.map(onKeyDown.event, (e) => new StandardKeyboardEvent(e), eventDisposables);
        this._register(Event.filter(onHeaderKeyDown, (e) => e.keyCode === 3 /* KeyCode.Enter */ || e.keyCode === 10 /* KeyCode.Space */, eventDisposables)(() => this.setExpanded(!this.isExpanded()), null));
        this._register(Event.filter(onHeaderKeyDown, (e) => e.keyCode === 15 /* KeyCode.LeftArrow */, eventDisposables)(() => this.setExpanded(false), null));
        this._register(Event.filter(onHeaderKeyDown, (e) => e.keyCode === 17 /* KeyCode.RightArrow */, eventDisposables)(() => this.setExpanded(true), null));
        this._register(Gesture.addTarget(this.header));
        const header = this.header;
        [EventType.CLICK, TouchEventType.Tap].forEach((eventType) => {
            this._register(addDisposableListener(header, eventType, (e) => {
                if (!e.defaultPrevented) {
                    this.setExpanded(!this.isExpanded());
                }
            }));
        });
        this.body = append(this.element, $('.pane-body'));
        // Only render the body if it will be visible
        // Otherwise, render it when the pane is expanded
        if (!this._bodyRendered && this.isExpanded()) {
            this.renderBody(this.body);
            this._bodyRendered = true;
        }
        if (!this.isExpanded()) {
            this.body.remove();
        }
    }
    layout(size) {
        const headerSize = this.headerVisible ? Pane.HEADER_SIZE : 0;
        const width = this._orientation === 0 /* Orientation.VERTICAL */ ? this.orthogonalSize : size;
        const height = this._orientation === 0 /* Orientation.VERTICAL */
            ? size - headerSize
            : this.orthogonalSize - headerSize;
        if (this.isExpanded()) {
            this.body.classList.toggle('wide', width >= 600);
            this.layoutBody(height, width);
            this.expandedSize = size;
        }
    }
    style(styles) {
        this.styles = styles;
        if (!this.header) {
            return;
        }
        this.updateHeader();
    }
    updateHeader() {
        if (!this.header) {
            return;
        }
        const expanded = !this.headerVisible || this.isExpanded();
        if (this.collapsible) {
            this.header.setAttribute('tabindex', '0');
            this.header.setAttribute('role', 'button');
        }
        else {
            this.header.removeAttribute('tabindex');
            this.header.removeAttribute('role');
        }
        this.header.style.lineHeight = `${this.headerSize}px`;
        this.header.classList.toggle('hidden', !this.headerVisible);
        this.header.classList.toggle('expanded', expanded);
        this.header.classList.toggle('not-collapsible', !this.collapsible);
        this.header.setAttribute('aria-expanded', String(expanded));
        this.header.style.color = this.collapsible ? (this.styles.headerForeground ?? '') : '';
        this.header.style.backgroundColor =
            (this.collapsible ? this.styles.headerBackground : 'transparent') ?? '';
        this.header.style.borderTop =
            this.styles.headerBorder && this.orientation === 0 /* Orientation.VERTICAL */
                ? `1px solid ${this.styles.headerBorder}`
                : '';
        this.element.style.borderLeft =
            this.styles.leftBorder && this.orientation === 1 /* Orientation.HORIZONTAL */
                ? `1px solid ${this.styles.leftBorder}`
                : '';
    }
}
class PaneDraggable extends Disposable {
    static { this.DefaultDragOverBackgroundColor = new Color(new RGBA(128, 128, 128, 0.5)); }
    constructor(pane, dnd, context) {
        super();
        this.pane = pane;
        this.dnd = dnd;
        this.context = context;
        this.dragOverCounter = 0; // see https://github.com/microsoft/vscode/issues/14470
        this._onDidDrop = this._register(new Emitter());
        this.onDidDrop = this._onDidDrop.event;
        pane.draggableElement.draggable = true;
        this._register(addDisposableListener(pane.draggableElement, 'dragstart', (e) => this.onDragStart(e)));
        this._register(addDisposableListener(pane.dropTargetElement, 'dragenter', (e) => this.onDragEnter(e)));
        this._register(addDisposableListener(pane.dropTargetElement, 'dragleave', (e) => this.onDragLeave(e)));
        this._register(addDisposableListener(pane.dropTargetElement, 'dragend', (e) => this.onDragEnd(e)));
        this._register(addDisposableListener(pane.dropTargetElement, 'drop', (e) => this.onDrop(e)));
    }
    onDragStart(e) {
        if (!this.dnd.canDrag(this.pane) || !e.dataTransfer) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        const label = this.pane.draggableElement?.textContent || '';
        e.dataTransfer.effectAllowed = 'move';
        if (isFirefox) {
            // Firefox: requires to set a text data transfer to get going
            e.dataTransfer?.setData(DataTransfers.TEXT, label);
        }
        applyDragImage(e, this.pane.element, label);
        this.context.draggable = this;
    }
    onDragEnter(e) {
        if (!this.context.draggable || this.context.draggable === this) {
            return;
        }
        if (!this.dnd.canDrop(this.context.draggable.pane, this.pane)) {
            return;
        }
        this.dragOverCounter++;
        this.render();
    }
    onDragLeave(e) {
        if (!this.context.draggable || this.context.draggable === this) {
            return;
        }
        if (!this.dnd.canDrop(this.context.draggable.pane, this.pane)) {
            return;
        }
        this.dragOverCounter--;
        if (this.dragOverCounter === 0) {
            this.render();
        }
    }
    onDragEnd(e) {
        if (!this.context.draggable) {
            return;
        }
        this.dragOverCounter = 0;
        this.render();
        this.context.draggable = null;
    }
    onDrop(e) {
        if (!this.context.draggable) {
            return;
        }
        EventHelper.stop(e);
        this.dragOverCounter = 0;
        this.render();
        if (this.dnd.canDrop(this.context.draggable.pane, this.pane) &&
            this.context.draggable !== this) {
            this._onDidDrop.fire({ from: this.context.draggable.pane, to: this.pane });
        }
        this.context.draggable = null;
    }
    render() {
        let backgroundColor = null;
        if (this.dragOverCounter > 0) {
            backgroundColor =
                this.pane.dropBackground ?? PaneDraggable.DefaultDragOverBackgroundColor.toString();
        }
        this.pane.dropTargetElement.style.backgroundColor = backgroundColor || '';
    }
}
export class DefaultPaneDndController {
    canDrag(pane) {
        return true;
    }
    canDrop(pane, overPane) {
        return true;
    }
}
export class PaneView extends Disposable {
    constructor(container, options = {}) {
        super();
        this.dndContext = { draggable: null };
        this.paneItems = [];
        this.orthogonalSize = 0;
        this.size = 0;
        this.animationTimer = undefined;
        this._onDidDrop = this._register(new Emitter());
        this.onDidDrop = this._onDidDrop.event;
        this.dnd = options.dnd;
        this.orientation = options.orientation ?? 0 /* Orientation.VERTICAL */;
        this.element = append(container, $('.monaco-pane-view'));
        this.splitview = this._register(new SplitView(this.element, { orientation: this.orientation }));
        this.onDidSashReset = this.splitview.onDidSashReset;
        this.onDidSashChange = this.splitview.onDidSashChange;
        this.onDidScroll = this.splitview.onDidScroll;
        const eventDisposables = this._register(new DisposableStore());
        const onKeyDown = this._register(new DomEmitter(this.element, 'keydown'));
        const onHeaderKeyDown = Event.map(Event.filter(onKeyDown.event, (e) => isHTMLElement(e.target) && e.target.classList.contains('pane-header'), eventDisposables), (e) => new StandardKeyboardEvent(e), eventDisposables);
        this._register(Event.filter(onHeaderKeyDown, (e) => e.keyCode === 16 /* KeyCode.UpArrow */, eventDisposables)(() => this.focusPrevious()));
        this._register(Event.filter(onHeaderKeyDown, (e) => e.keyCode === 18 /* KeyCode.DownArrow */, eventDisposables)(() => this.focusNext()));
    }
    addPane(pane, size, index = this.splitview.length) {
        const disposables = new DisposableStore();
        pane.onDidChangeExpansionState(this.setupAnimation, this, disposables);
        const paneItem = { pane: pane, disposable: disposables };
        this.paneItems.splice(index, 0, paneItem);
        pane.orientation = this.orientation;
        pane.orthogonalSize = this.orthogonalSize;
        this.splitview.addView(pane, size, index);
        if (this.dnd) {
            const draggable = new PaneDraggable(pane, this.dnd, this.dndContext);
            disposables.add(draggable);
            disposables.add(draggable.onDidDrop(this._onDidDrop.fire, this._onDidDrop));
        }
    }
    removePane(pane) {
        const index = this.paneItems.findIndex((item) => item.pane === pane);
        if (index === -1) {
            return;
        }
        this.splitview.removeView(index, pane.isExpanded() ? Sizing.Distribute : undefined);
        const paneItem = this.paneItems.splice(index, 1)[0];
        paneItem.disposable.dispose();
    }
    movePane(from, to) {
        const fromIndex = this.paneItems.findIndex((item) => item.pane === from);
        const toIndex = this.paneItems.findIndex((item) => item.pane === to);
        if (fromIndex === -1 || toIndex === -1) {
            return;
        }
        const [paneItem] = this.paneItems.splice(fromIndex, 1);
        this.paneItems.splice(toIndex, 0, paneItem);
        this.splitview.moveView(fromIndex, toIndex);
    }
    resizePane(pane, size) {
        const index = this.paneItems.findIndex((item) => item.pane === pane);
        if (index === -1) {
            return;
        }
        this.splitview.resizeView(index, size);
    }
    getPaneSize(pane) {
        const index = this.paneItems.findIndex((item) => item.pane === pane);
        if (index === -1) {
            return -1;
        }
        return this.splitview.getViewSize(index);
    }
    layout(height, width) {
        this.orthogonalSize = this.orientation === 0 /* Orientation.VERTICAL */ ? width : height;
        this.size = this.orientation === 1 /* Orientation.HORIZONTAL */ ? width : height;
        for (const paneItem of this.paneItems) {
            paneItem.pane.orthogonalSize = this.orthogonalSize;
        }
        this.splitview.layout(this.size);
    }
    setBoundarySashes(sashes) {
        this.boundarySashes = sashes;
        this.updateSplitviewOrthogonalSashes(sashes);
    }
    updateSplitviewOrthogonalSashes(sashes) {
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            this.splitview.orthogonalStartSash = sashes?.left;
            this.splitview.orthogonalEndSash = sashes?.right;
        }
        else {
            this.splitview.orthogonalEndSash = sashes?.bottom;
        }
    }
    flipOrientation(height, width) {
        this.orientation =
            this.orientation === 0 /* Orientation.VERTICAL */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
        const paneSizes = this.paneItems.map((pane) => this.getPaneSize(pane.pane));
        this.splitview.dispose();
        clearNode(this.element);
        this.splitview = this._register(new SplitView(this.element, { orientation: this.orientation }));
        this.updateSplitviewOrthogonalSashes(this.boundarySashes);
        const newOrthogonalSize = this.orientation === 0 /* Orientation.VERTICAL */ ? width : height;
        const newSize = this.orientation === 1 /* Orientation.HORIZONTAL */ ? width : height;
        this.paneItems.forEach((pane, index) => {
            pane.pane.orthogonalSize = newOrthogonalSize;
            pane.pane.orientation = this.orientation;
            const viewSize = this.size === 0 ? 0 : (newSize * paneSizes[index]) / this.size;
            this.splitview.addView(pane.pane, viewSize, index);
        });
        this.size = newSize;
        this.orthogonalSize = newOrthogonalSize;
        this.splitview.layout(this.size);
    }
    setupAnimation() {
        if (typeof this.animationTimer === 'number') {
            getWindow(this.element).clearTimeout(this.animationTimer);
        }
        this.element.classList.add('animated');
        this.animationTimer = getWindow(this.element).setTimeout(() => {
            this.animationTimer = undefined;
            this.element.classList.remove('animated');
        }, 200);
    }
    getPaneHeaderElements() {
        return [...this.element.querySelectorAll('.pane-header')];
    }
    focusPrevious() {
        const headers = this.getPaneHeaderElements();
        const index = headers.indexOf(this.element.ownerDocument.activeElement);
        if (index === -1) {
            return;
        }
        headers[Math.max(index - 1, 0)].focus();
    }
    focusNext() {
        const headers = this.getPaneHeaderElements();
        const index = headers.indexOf(this.element.ownerDocument.activeElement);
        if (index === -1) {
            return;
        }
        headers[Math.min(index + 1, headers.length - 1)].focus();
    }
    dispose() {
        super.dispose();
        this.paneItems.forEach((i) => i.disposable.dispose());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZXZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc3BsaXR2aWV3L3BhbmV2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzVDLE9BQU8sRUFDTixDQUFDLEVBQ0QscUJBQXFCLEVBQ3JCLE1BQU0sRUFDTixTQUFTLEVBQ1QsV0FBVyxFQUNYLFNBQVMsRUFDVCxTQUFTLEVBQ1QsYUFBYSxFQUNiLFVBQVUsR0FDVixNQUFNLGNBQWMsQ0FBQTtBQUNyQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFDM0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLElBQUksY0FBYyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFckUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXpELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sOEJBQThCLENBQUE7QUFFdkYsT0FBTyxnQkFBZ0IsQ0FBQTtBQUN2QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFTLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBbUI5Qzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBZ0Is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