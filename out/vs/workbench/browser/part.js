/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/part.css';
import { Component } from '../common/component.js';
import { Dimension, size, getActiveDocument, prepend, } from '../../base/browser/dom.js';
import { Emitter } from '../../base/common/event.js';
import { assertIsDefined } from '../../base/common/types.js';
import { toDisposable } from '../../base/common/lifecycle.js';
/**
 * Parts are layed out in the workbench and have their own layout that
 * arranges an optional title and mandatory content area to show content.
 */
export class Part extends Component {
    get dimension() {
        return this._dimension;
    }
    get contentPosition() {
        return this._contentPosition;
    }
    constructor(id, options, themeService, storageService, layoutService) {
        super(id, themeService, storageService);
        this.options = options;
        this.layoutService = layoutService;
        this._onDidVisibilityChange = this._register(new Emitter());
        this.onDidVisibilityChange = this._onDidVisibilityChange.event;
        //#region ISerializableView
        this._onDidChange = this._register(new Emitter());
        this._register(layoutService.registerPart(this));
    }
    onThemeChange(theme) {
        // only call if our create() method has been called
        if (this.parent) {
            super.onThemeChange(theme);
        }
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Called to create title and content area of the part.
     */
    create(parent, options) {
        this.parent = parent;
        this.titleArea = this.createTitleArea(parent, options);
        this.contentArea = this.createContentArea(parent, options);
        this.partLayout = new PartLayout(this.options, this.contentArea);
        this.updateStyles();
    }
    /**
     * Returns the overall part container.
     */
    getContainer() {
        return this.parent;
    }
    /**
     * Subclasses override to provide a title area implementation.
     */
    createTitleArea(parent, options) {
        return undefined;
    }
    /**
     * Returns the title area container.
     */
    getTitleArea() {
        return this.titleArea;
    }
    /**
     * Subclasses override to provide a content area implementation.
     */
    createContentArea(parent, options) {
        return undefined;
    }
    /**
     * Returns the content area container.
     */
    getContentArea() {
        return this.contentArea;
    }
    /**
     * Sets the header area
     */
    setHeaderArea(headerContainer) {
        if (this.headerArea) {
            throw new Error('Header already exists');
        }
        if (!this.parent || !this.titleArea) {
            return;
        }
        prepend(this.parent, headerContainer);
        headerContainer.classList.add('header-or-footer');
        headerContainer.classList.add('header');
        this.headerArea = headerContainer;
        this.partLayout?.setHeaderVisibility(true);
        this.relayout();
    }
    /**
     * Sets the footer area
     */
    setFooterArea(footerContainer) {
        if (this.footerArea) {
            throw new Error('Footer already exists');
        }
        if (!this.parent || !this.titleArea) {
            return;
        }
        this.parent.appendChild(footerContainer);
        footerContainer.classList.add('header-or-footer');
        footerContainer.classList.add('footer');
        this.footerArea = footerContainer;
        this.partLayout?.setFooterVisibility(true);
        this.relayout();
    }
    /**
     * removes the header area
     */
    removeHeaderArea() {
        if (this.headerArea) {
            this.headerArea.remove();
            this.headerArea = undefined;
            this.partLayout?.setHeaderVisibility(false);
            this.relayout();
        }
    }
    /**
     * removes the footer area
     */
    removeFooterArea() {
        if (this.footerArea) {
            this.footerArea.remove();
            this.footerArea = undefined;
            this.partLayout?.setFooterVisibility(false);
            this.relayout();
        }
    }
    relayout() {
        if (this.dimension && this.contentPosition) {
            this.layout(this.dimension.width, this.dimension.height, this.contentPosition.top, this.contentPosition.left);
        }
    }
    /**
     * Layout title and content area in the given dimension.
     */
    layoutContents(width, height) {
        const partLayout = assertIsDefined(this.partLayout);
        return partLayout.layout(width, height);
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    layout(width, height, top, left) {
        this._dimension = new Dimension(width, height);
        this._contentPosition = { top, left };
    }
    setVisible(visible) {
        this._onDidVisibilityChange.fire(visible);
    }
}
class PartLayout {
    static { this.HEADER_HEIGHT = 35; }
    static { this.TITLE_HEIGHT = 35; }
    static { this.Footer_HEIGHT = 35; }
    constructor(options, contentArea) {
        this.options = options;
        this.contentArea = contentArea;
        this.headerVisible = false;
        this.footerVisible = false;
    }
    layout(width, height) {
        // Title Size: Width (Fill), Height (Variable)
        let titleSize;
        if (this.options.hasTitle) {
            titleSize = new Dimension(width, Math.min(height, PartLayout.TITLE_HEIGHT));
        }
        else {
            titleSize = Dimension.None;
        }
        // Header Size: Width (Fill), Height (Variable)
        let headerSize;
        if (this.headerVisible) {
            headerSize = new Dimension(width, Math.min(height, PartLayout.HEADER_HEIGHT));
        }
        else {
            headerSize = Dimension.None;
        }
        // Footer Size: Width (Fill), Height (Variable)
        let footerSize;
        if (this.footerVisible) {
            footerSize = new Dimension(width, Math.min(height, PartLayout.Footer_HEIGHT));
        }
        else {
            footerSize = Dimension.None;
        }
        let contentWidth = width;
        if (this.options && typeof this.options.borderWidth === 'function') {
            contentWidth -= this.options.borderWidth(); // adjust for border size
        }
        // Content Size: Width (Fill), Height (Variable)
        const contentSize = new Dimension(contentWidth, height - titleSize.height - headerSize.height - footerSize.height);
        // Content
        if (this.contentArea) {
            size(this.contentArea, contentSize.width, contentSize.height);
        }
        return { headerSize, titleSize, contentSize, footerSize };
    }
    setFooterVisibility(visible) {
        this.footerVisible = visible;
    }
    setHeaderVisibility(visible) {
        this.headerVisible = visible;
    }
}
export class MultiWindowParts extends Component {
    constructor() {
        super(...arguments);
        this._parts = new Set();
    }
    get parts() {
        return Array.from(this._parts);
    }
    registerPart(part) {
        this._parts.add(part);
        return toDisposable(() => this.unregisterPart(part));
    }
    unregisterPart(part) {
        this._parts.delete(part);
    }
    getPart(container) {
        return this.getPartByDocument(container.ownerDocument);
    }
    getPartByDocument(document) {
        if (this._parts.size > 1) {
            for (const part of this._parts) {
                if (part.element?.ownerDocument === document) {
                    return part;
                }
            }
        }
        return this.mainPart;
    }
    get activePart() {
        return this.getPartByDocument(getActiveDocument());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrQkFBa0IsQ0FBQTtBQUN6QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFbEQsT0FBTyxFQUNOLFNBQVMsRUFDVCxJQUFJLEVBRUosaUJBQWlCLEVBQ2pCLE9BQU8sR0FFUCxNQUFNLDJCQUEyQixDQUFBO0FBR2xDLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDNUQsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBYzFFOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsSUFBSyxTQUFRLFNBQVM7SUFFM0MsSUFBSSxTQUFTO1FBQ1osT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFHRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQVlELFlBQ0MsRUFBVSxFQUNGLE9BQXFCLEVBQzdCLFlBQTJCLEVBQzNCLGNBQStCLEVBQ1osYUFBc0M7UUFFekQsS0FBSyxDQUFDLEVBQUUsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFML0IsWUFBTyxHQUFQLE9BQU8sQ0FBYztRQUdWLGtCQUFhLEdBQWIsYUFBYSxDQUF5QjtRQWZoRCwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFXLENBQUMsQ0FBQTtRQUNoRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFBO1FBb0tsRSwyQkFBMkI7UUFFakIs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