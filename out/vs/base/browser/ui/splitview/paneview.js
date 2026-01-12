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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFuZXZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci91aS9zcGxpdHZpZXcvcGFuZXZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzVDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDNUMsT0FBTyxFQUNOLENBQUMsRUFDRCxxQkFBcUIsRUFDckIsTUFBTSxFQUNOLFNBQVMsRUFDVCxXQUFXLEVBQ1gsU0FBUyxFQUNULFNBQVMsRUFDVCxhQUFhLEVBQ2IsVUFBVSxHQUNWLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUMzQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsSUFBSSxjQUFjLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV2RixPQUFPLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQVMsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFtQjlDOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxP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U0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuRixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRUQsUUFBUSxDQUFDLElBQVUsRUFBRSxFQUFRO1FBQzVCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBRXBFLElBQUksU0FBUyxLQUFLLENBQUMsQ0FBQyxJQUFJLE9BQU8sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRTNDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVUsRUFBRSxJQUFZO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFD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